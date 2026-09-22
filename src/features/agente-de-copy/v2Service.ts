import { AGENTE_DE_COPY_BRAIN } from './brain';
import {
    AgenteDeCopyInput,
    AgenteDeCopyV2Result,
    AgenteDeCopyV2StructuralValidity,
    AgenteDeCopyV2CharacterCompliance
} from './types';
import { parseAgenteDeCopyOutput, validateAgenteDeCopyContract } from './parser';
import { detectViolations } from './abTestService';
import { postToWorker } from '../../services/workerClient';
import { GEMINI_MODEL, API_TIMEOUT_MS } from '../../utils';

/**
 * Extracts the image inline data (mimeType + base64) from the product image.
 * Uses the exact original bytes without summarization.
 */
function extractImageInlineData(productImage: AgenteDeCopyInput['productImage']): { mimeType: string; data: string } | null {
    if (!productImage?.dataUrl || !productImage.dataUrl.startsWith('data:image/')) {
        return null;
    }

    const matches = productImage.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
        return null;
    }

    return {
        mimeType: matches[1],
        data: matches[2]
    };
}

/**
 * Builds the strictly minimal, factual user execution context.
 * No copywriting hype, no secondary prompts, no marketing directives.
 */
export function buildMinimalUserContext(productTitle?: string, productInfo?: string): string {
    const parts: string[] = [];
    if (productTitle && productTitle.trim()) {
        parts.push(`Título do produto: ${productTitle.trim()}`);
    }
    if (productInfo && productInfo.trim()) {
        parts.push(`Informações adicionais: ${productInfo.trim()}`);
    }

    if (parts.length > 0) {
        return `Observe o produto da imagem anexada e execute exatamente as instruções acima para este produto:\n\n${parts.join('\n')}`;
    }

    return `Observe o produto da imagem anexada e execute exatamente as instruções acima.`;
}

/**
 * Executes Agente de Copy V2 (Experimental):
 * - Fixed Brain (AGENTE_DE_COPY_BRAIN from brain.ts)
 * - Minimal User Context
 * - Original Product Image
 * - All delivered through contents (NO systemInstruction)
 * - Single generation only (NO automatic repair)
 * - Controlled generationConfig
 */
export async function executeAgenteDeCopyV2(input: AgenteDeCopyInput): Promise<AgenteDeCopyV2Result> {
    const { productImage, productTitle, productInfo } = input;

    if (!productImage || !productImage.dataUrl) {
        throw new Error('[Agente de Copy V2] Imagem do produto é obrigatória.');
    }

    const imageInline = extractImageInlineData(productImage);
    if (!imageInline) {
        throw new Error('[Agente de Copy V2] Formato de imagem inválido ou base64 corrompido.');
    }

    // 1. Build minimal factual user context
    const userContext = buildMinimalUserContext(productTitle, productInfo);

    // 2. Build monoblock text: AGENTE_DE_COPY_BRAIN + separator + userContext
    const fullPromptText = `${AGENTE_DE_COPY_BRAIN}\n\n---\n\n${userContext}`;

    // 3. Assemble payload: contents only, NO systemInstruction
    const payload = {
        model: GEMINI_MODEL,
        contents: [
            {
                role: 'user',
                parts: [
                    { text: fullPromptText },
                    {
                        inlineData: {
                            mimeType: imageInline.mimeType,
                            data: imageInline.data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 3000
        }
    };

    // Capture outbound generation config before transport
    const outboundGenConfig = {
        requested_model: payload.model,
        temperature: payload.generationConfig.temperature,
        topP: payload.generationConfig.topP,
        maxOutputTokens: payload.generationConfig.maxOutputTokens,
        hasMaxTokensField: 'maxTokens' in payload || 'maxTokens' in payload.generationConfig,
        hasMax_tokensField: 'max_tokens' in payload || 'max_tokens' in payload.generationConfig,
        hasMaxLengthField: 'maxLength' in payload || 'maxLength' in payload.generationConfig,
        hasMax_lengthField: 'max_length' in payload || 'max_length' in payload.generationConfig,
        hasOutputLengthField: 'outputLength' in payload || 'outputLength' in payload.generationConfig,
        hasResponseLengthField: 'responseLength' in payload || 'responseLength' in payload.generationConfig
    };

    // Capture payload integrity before transport
    const payloadIntegrity = {
        contents_count: payload.contents.length,
        parts_count: payload.contents[0].parts.length,
        has_text_part: Boolean(payload.contents[0].parts[0]?.text),
        has_inline_image: Boolean(payload.contents[0].parts[1]?.inlineData?.data),
        systemInstruction_present: Boolean((payload as any).systemInstruction),
        brain_delivery: 'contents_monoblock' as const
    };

    let rawText = '';
    let httpStatus = '200 OK';
    let finishReason = 'STOP';
    let response: any = null;

    try {
        response = await postToWorker<any>('/', payload, {
            timeoutMs: API_TIMEOUT_MS,
            moduleName: 'Agente de Copy V2 [Experimental]'
        });

        httpStatus = '200 OK';
        rawText = (
            response?.raw_text ||
            response?.candidates?.[0]?.content?.parts?.[0]?.text ||
            (typeof response?.data === 'string' ? response.data : null) ||
            ''
        ).trim();

        finishReason = response?.diagnostic_meta?.finishReason || response?.candidates?.[0]?.finishReason || 'STOP';
    } catch (err: any) {
        httpStatus = `Erro: ${err?.message || 'Falha de comunicação'}`;
        rawText = '';
        finishReason = 'ERROR';
        throw err;
    }

    // 4. Parse using unmodified parser
    const parsed = parseAgenteDeCopyOutput(rawText);

    // 5. Validate using unmodified validator
    const validation = validateAgenteDeCopyContract(parsed.variations);

    // 6. Detect violations on raw text
    const violations = detectViolations(rawText);

    // 7. Calculate structural validity
    const structure: AgenteDeCopyV2StructuralValidity = {
        versionsDetected: parsed.versionBlocksDetected,
        scene2Detected: parsed.scene2BlocksDetected,
        scene3Detected: parsed.scene3BlocksDetected,
        scene1Detected: violations.scene1Detected,
        isStructurallyComplete:
            parsed.versionBlocksDetected === 6 &&
            parsed.scene2BlocksDetected === 6 &&
            parsed.scene3BlocksDetected === 6 &&
            !violations.scene1Detected &&
            parsed.variations.length === 6
    };

    // 8. Calculate character compliance (160–175 characters per scene)
    let compliantCount = 0;
    for (const c of validation.characterCounts) {
        if (c.scene2Valid) compliantCount++;
        if (c.scene3Valid) compliantCount++;
    }

    const characterCompliance: AgenteDeCopyV2CharacterCompliance = {
        compliantCount,
        totalScenes: 12,
        isStrictRangeMet: validation.isStrictRangeMet,
        counts: validation.characterCounts
    };

    const meta = response?.meta || null;
    const diagMeta = response?.diagnostic_meta || null;

    // Checkpoints L0 -> L1 -> L2 -> L3 -> L4 -> L5 -> L6
    const L0 = diagMeta?.L0 ?? (response?.candidates?.[0]?.content?.parts ? response.candidates[0].content.parts.filter((p: any) => p?.text && !p?.thought).map((p: any) => p.text).join('').length : (response?.raw_text || '').length);
    const L1 = diagMeta?.L1 ?? (response?.raw_text || '').length;
    const L2 = diagMeta?.L2 ?? (response?.raw_text || '').length;
    const L3 = diagMeta?.L3 ?? (response?.raw_text || '').length;
    const L4 = diagMeta?.L4 ?? (response?.raw_text || '').length;
    const L5 = rawText.length;
    const L6 = rawText.length;

    let truncationLocation = 'INDETERMINADO';
    if (L0 === L1 && L1 === L2 && L2 === L3 && L3 === L4 && L4 === L5 && L5 === L6) {
        if (finishReason === 'STOP') {
            truncationLocation = 'GEMINI MODEL (Parada natural com finishReason=STOP retornado diretamente pela API do Gemini)';
        } else if (finishReason === 'MAX_TOKENS') {
            truncationLocation = 'GEMINI API (maxOutputTokens esgotado pelo modelo)';
        } else if (finishReason === 'SAFETY') {
            truncationLocation = 'GEMINI API (Filtro de segurança SAFETY acionado)';
        } else {
            truncationLocation = `GEMINI API (finishReason: ${finishReason})`;
        }
    } else if (L0 > L1) {
        truncationLocation = 'Cloudflare Worker (Divergência entre parts do candidato e raw_text do worker)';
    } else if (L1 > L2) {
        truncationLocation = 'Trânsito Worker -> Server';
    } else if (L2 > L3) {
        truncationLocation = 'server.ts /api/proxy';
    } else if (L3 > L4) {
        truncationLocation = 'workerClient postToWorker / Fetch';
    } else if (L4 > L5) {
        truncationLocation = 'V2 rawText extraction';
    } else if (L5 > L6) {
        truncationLocation = 'Parser Input';
    }

    const truncationDiag = {
        model: diagMeta?.worker_request_model || GEMINI_MODEL,
        maxOutputTokensRequested: outboundGenConfig.maxOutputTokens,
        maxOutputTokensAtWorker: diagMeta?.worker_generation_config?.maxOutputTokens ?? null,
        geminiHttpStatus: diagMeta?.gemini_http_status ?? 200,
        geminiFinishReason: diagMeta?.finishReason || finishReason,
        finishMessage: diagMeta?.finishMessage || null,
        candidateCount: diagMeta?.candidate_count ?? (response?.candidates?.length || 0),
        candidatePartsCount: diagMeta?.candidate_parts_count ?? (response?.candidates?.[0]?.content?.parts?.length || 0),
        candidatePartsMeta: diagMeta?.parts_meta || [],
        outputTokenCount: diagMeta?.candidatesTokenCount ?? null,
        promptTokenCount: diagMeta?.promptTokenCount ?? null,
        totalTokenCount: diagMeta?.totalTokenCount ?? null,
        outboundGenerationConfig: outboundGenConfig,
        payloadIntegrity,
        checkpoints: {
            L0_geminiCandidate: L0,
            L1_worker: L1,
            L2_serverReceived: L2,
            L3_apiProxy: L3,
            L4_postToWorker: L4,
            L5_v2RawText: L5,
            L6_parserInput: L6
        },
        truncationLocation
    };

    return {
        httpStatus,
        workerVersion: response?.worker_version || meta?.worker_version || null,
        requestedModel: response?.requested_model || meta?.requested_model || GEMINI_MODEL,
        executedModel: response?.executed_model || meta?.executed_model || null,
        finishReason,
        rawLength: rawText.length,
        rawText,
        structure,
        characterCompliance,
        violations,
        variations: parsed.variations,
        validation,
        p0Metadata: {
            requestId: response?.request_id || null,
            proxyPath: response?.proxy_path || null,
            failoverUsed: response?.failover_used ?? false,
            syntheticFallbackUsed: response?.synthetic_fallback_used ?? false,
            systemInstructionReceived: meta ? Boolean(meta.system_instruction_received) : null,
            systemInstructionForwarded: meta ? Boolean(meta.system_instruction_forwarded) : null,
            inlineImageReceived: meta ? Boolean(meta.inline_image_received) : null,
            inlineImageForwarded: meta ? Boolean(meta.inline_image_forwarded) : null
        },
        truncationDiag,
        executedAt: new Date().toISOString()
    };
}
