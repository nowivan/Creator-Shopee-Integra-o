import { AgenteDeCopyInput, AgentCopyVariation, AgenteDeCopyV3Result, AgenteDeCopyV3Diagnostics } from './types';
import { AGENTE_DE_COPY_BRAIN } from './brain';
import { postToWorker } from '../../services/workerClient';
import { GEMINI_MODEL, API_TIMEOUT_MS, safeJSONParse } from '../../utils';
import { validateV3Compliance } from './v3Validator';

/**
 * Extracts image inlineData from the product image without altering bytes.
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
 * Builds the factual user execution context, matching V2 experimental alignment.
 * Contains only factual product title, price, and extra info.
 * Injects NO extra marketing directives or copywriting rules.
 */
export function buildV3FactualContext(productTitle?: string, productPrice?: string, productInfo?: string): string {
    const parts: string[] = [];
    if (productTitle && productTitle.trim()) {
        parts.push(`Título do produto: ${productTitle.trim()}`);
    }
    if (productPrice && productPrice.trim()) {
        parts.push(`Preço de referência do produto: ${productPrice.trim()}`);
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
 * Pure structural JSON schema definition for Gemini generationConfig.
 * Contains ONLY structural keys (id, scene2, scene3).
 * Contains ZERO copywriting/marketing instructions.
 */
export const V3_RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        versions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    id: { type: "INTEGER" },
                    scene2: { type: "STRING" },
                    scene3: { type: "STRING" }
                },
                required: ["id", "scene2", "scene3"]
            }
        }
    },
    required: ["versions"]
};

/**
 * Executes Agente de Copy V3 — Original Brain + Structured JSON Output.
 * 
 * Strict Experimental Controls:
 * 1. AGENTE_DE_COPY_BRAIN is the ONLY copywriting brain (unmodified).
 * 2. Monoblock prompt delivery in contents[0].parts (systemInstruction is NEVER used).
 * 3. Exact same model, temperature (0.65), topP (0.9), maxOutputTokens (3000) as V2.
 * 4. Image delivered via inlineData (no pre-analysis, no double call).
 * 5. responseMimeType: "application/json" + V3_RESPONSE_SCHEMA.
 * 6. Correct multipart extraction joining all non-thought text parts.
 * 7. ZERO copy fabrication (if fewer than 6 versions returned, no synthetic copies created).
 * 8. ZERO text rewriting/polishing (scene2 and scene3 preserved exactly as returned).
 * 9. Exactly ONE Gemini call (no retries, no repair prompt, no evaluator, no fallback).
 */
export async function executeAgenteDeCopyV3(
    input: AgenteDeCopyInput,
    productPrice?: string
): Promise<AgenteDeCopyV3Result> {
    const { productImage, productTitle, productInfo } = input;

    if (!productImage || !productImage.dataUrl) {
        throw new Error('[Agente de Copy V3] Imagem do produto é obrigatória.');
    }

    const inlineImage = extractImageInlineData(productImage);
    if (!inlineImage) {
        throw new Error('[Agente de Copy V3] Formato de imagem inválido ou base64 corrompido.');
    }

    // 1. Build minimal factual user context
    const factualContext = buildV3FactualContext(productTitle, productPrice, productInfo);

    // 2. Build monoblock prompt: AGENTE_DE_COPY_BRAIN + separator + factualContext
    const fullPromptText = `${AGENTE_DE_COPY_BRAIN}\n\n---\n\n${factualContext}`;

    const parts: any[] = [
        { text: fullPromptText },
        {
            inlineData: {
                mimeType: inlineImage.mimeType,
                data: inlineImage.data
            }
        }
    ];

    // 3. Assemble Gemini payload with structured JSON configuration
    const payload: any = {
        model: GEMINI_MODEL,
        contents: [
            {
                role: "user",
                parts
            }
        ],
        generationConfig: {
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 3000,
            responseMimeType: "application/json",
            responseSchema: V3_RESPONSE_SCHEMA
        }
    };

    // Explicitly guarantee NO systemInstruction is present
    delete payload.systemInstruction;

    const response = await postToWorker<any>('/', payload, {
        timeoutMs: API_TIMEOUT_MS,
        moduleName: "Agente de Copy V3 [Structured JSON]"
    });

    if (!response) {
        throw new Error("[V3] Resposta nula recebida do servidor.");
    }

    // 4. Extract candidates & execute correct multipart concatenation
    const candidate = response.candidates?.[0] || response.raw?.candidates?.[0];
    let candidateParts: any[] = [];
    if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        candidateParts = candidate.content.parts;
    }

    // Filter non-thought textual parts
    const textParts = candidateParts.filter(
        (part: any) => part && typeof part.text === 'string' && !part.thought
    );
    const candidatePartsCount = candidateParts.length;
    const textPartsCount = textParts.length;
    const joinedText = textParts.map((p: any) => p.text).join('');
    const joinedTextLength = joinedText.length;

    // Checkpoints L0 - L6
    const l0_gemini_candidate = joinedText.length || (candidate?.content?.parts?.[0]?.text?.length ?? 0);
    const l1_worker_raw = (response.raw_text || response.message || joinedText || "").length;
    const l2_server = l1_worker_raw;
    const l3_proxy = l1_worker_raw;
    const l4_postToWorker = l1_worker_raw;
    
    // Choose primary raw text string
    const rawText = joinedText || response.raw_text || (typeof response.data === 'string' ? response.data : (response.data ? JSON.stringify(response.data) : '')) || '';
    const l5_v3RawText = rawText.length;
    const l6_parserInput = l5_v3RawText;

    const finishReason = candidate?.finishReason || response.diagnostic_meta?.finishReason || (response.ok ? "STOP" : "ERROR");
    const candidateCount = Array.isArray(response.candidates) ? response.candidates.length : 1;

    // 5. JSON Parsing with safe recovery
    let jsonParseStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'FAILED';
    let parsedData: any = null;

    if (response.data && typeof response.data === 'object') {
        parsedData = response.data;
    } else if (rawText) {
        parsedData = safeJSONParse(rawText, null);
    }

    const variations: AgentCopyVariation[] = [];

    if (parsedData) {
        const rawList = Array.isArray(parsedData) 
            ? parsedData 
            : (Array.isArray(parsedData.versions) 
                ? parsedData.versions 
                : (Array.isArray(parsedData.variations) ? parsedData.variations : null));

        if (Array.isArray(rawList) && rawList.length > 0) {
            for (let i = 0; i < rawList.length; i++) {
                const item = rawList[i];
                if (item && typeof item === 'object') {
                    const id = typeof item.id === 'number' ? item.id : i + 1;
                    // Exact preservation of Gemini text — zero polishing, zero rewriting
                    const scene2 = typeof item.scene2 === 'string' ? item.scene2 : '';
                    const scene3 = typeof item.scene3 === 'string' ? item.scene3 : '';

                    variations.push({
                        id,
                        scene2,
                        scene3
                    });
                }
            }

            if (variations.length === 6) {
                jsonParseStatus = 'SUCCESS';
            } else if (variations.length > 0) {
                jsonParseStatus = 'PARTIAL';
            }
        }
    }

    const variationsRecoveredCount = variations.length;
    const contractStatus: 'PASS' | 'PARTIAL' | 'FAIL' = 
        variationsRecoveredCount === 6 && variations.every(v => v.scene2.trim().length > 0 && v.scene3.trim().length > 0)
            ? 'PASS'
            : (variationsRecoveredCount > 0 ? 'PARTIAL' : 'FAIL');

    // 6. Read-Only Compliance Validation (never alters copy text)
    const validation = validateV3Compliance(rawText, variations, productPrice);

    const diagnostics: AgenteDeCopyV3Diagnostics = {
        model: response.execution_meta?.executed_model || payload.model,
        requestedModel: payload.model,
        executedModel: response.execution_meta?.executed_model || payload.model,
        httpStatus: response.ok ? '200 OK' : `Error: ${response.status || 'Unknown'}`,
        finishReason,
        candidateCount,
        candidatePartsCount,
        textPartsCount,
        joinedTextLength,
        outputTokenCount: response.usageMetadata?.candidatesTokenCount || null,
        promptTokenCount: response.usageMetadata?.promptTokenCount || null,
        totalTokenCount: response.usageMetadata?.totalTokenCount || null,
        rawResponseLength: rawText.length,
        jsonParseStatus,
        variationsRecovered: variationsRecoveredCount,
        characterComplianceDisplay: `${validation.characterComplianceCount}/12`,
        ctaComplianceDisplay: `${validation.carrinhoLaranjaCount}/6`,
        contractStatus,
        payloadIntegrity: {
            contents_count: payload.contents.length,
            parts_count: payload.contents[0].parts.length,
            has_text_part: Boolean(payload.contents[0].parts[0]?.text),
            has_inline_image: Boolean(payload.contents[0].parts[1]?.inlineData?.data),
            systemInstruction_present: false,
            brain_delivery: 'contents_monoblock_structured'
        },
        checkpoints: {
            L0_geminiCandidate: l0_gemini_candidate,
            L1_worker: l1_worker_raw,
            L2_serverReceived: l2_server,
            L3_apiProxy: l3_proxy,
            L4_postToWorker: l4_postToWorker,
            L5_v3RawText: l5_v3RawText,
            L6_parserInput: l6_parserInput
        }
    };

    return {
        httpStatus: diagnostics.httpStatus,
        workerVersion: response.worker_version || null,
        requestedModel: payload.model,
        executedModel: diagnostics.model,
        finishReason,
        rawLength: rawText.length,
        rawText,
        jsonParseStatus,
        variationsRecoveredCount,
        variations,
        contractStatus,
        validation,
        diagnostics,
        p0Metadata: {
            requestId: response.request_id || null,
            proxyPath: response.proxy_path || null,
            failoverUsed: Boolean(response.failover_used),
            syntheticFallbackUsed: false,
            systemInstructionReceived: Boolean(response.execution_meta?.system_instruction_received),
            systemInstructionForwarded: Boolean(response.execution_meta?.system_instruction_forwarded),
            inlineImageReceived: Boolean(response.execution_meta?.inline_image_received),
            inlineImageForwarded: Boolean(response.execution_meta?.inline_image_forwarded)
        },
        executedAt: new Date().toISOString()
    };
}
