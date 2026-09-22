import { AGENTE_DE_COPY_BRAIN } from './brain';
import {
    AgenteDeCopyInput,
    SingleABTestResult,
    ABDiagnosticResult,
    SingleABViolations
} from './types';
import { parseAgenteDeCopyOutput, validateAgenteDeCopyContract } from './parser';
import { buildIntegrityCheckpoints } from './service';
import { postToWorker } from '../../services/workerClient';
import { GEMINI_MODEL, API_TIMEOUT_MS } from '../../utils';

/**
 * Detects structural, policy, and contract violations in the raw text without modifying it.
 */
export function detectViolations(rawText: string): SingleABViolations {
    const priceRegex = /(?:R\$\s*\d+(?:[.,]\d+)?|\b\d+\s*reais\b|\bpreço(?:\s+é|\s+de|\s+por)?\s*R?\$?\s*\d+)/gi;
    const discountRegex = /(?:\b\d+%\s*de\s*desconto\b|\bdesconto\s+de\s+\d+%?|\bdesconto\s+exclusivo\b|\bcom\s+\d+%\s*off\b|\bpor\s+metade\s+do\s+preço\b|\bdescontão\b)/gi;
    const couponRegex = /(?:\bcupom\b|\bcódigo\s+promocional\b|\bcupom\s+de\s+desconto\b|\buse\s+o\s+cupom\b)/gi;
    const installmentRegex = /(?:\b\d+x\s+sem\s+juros\b|\bparcelad[oa]\b|\bparcelas?\s+de\s+R\$|\bno\s+cartão\s+em\s+\d+x\b|\bpagamento\s+único\b|\bmensalidade\b|\bvitalíci[oa]\b)/gi;
    const scene1Regex = /(?:\bCENA\s*1\b|\bCENA\s*01\b|\bSCENE\s*1\b|\bSCENE\s*01\b)/gi;
    const preambleRegex = /(?:^(?:[\s\S]*?(?:aqui\s+estão|com\s+certeza|olá|como\s+solicitado|segue\s+abaixo|claro|analisando\s+a\s+imagem|com\s+base\s+na\s+imagem)[\s\S]*?)(?:---|VERSÃO))/i;
    const strategicHeadingsRegex = /(?:Ângulo|Estratégia|Opção\s+\d+|Versão\s+\d+\s*[-–:]\s*[A-Za-zÀ-ÿ]+|Foco\s+em|Abordagem|Gancho\s+\d+|Hook\s+\d+)/gi;
    const carrinhoLaranjaRegex = /(?:carrinho\s*laranja|link\s+do\s+produto|ícone\s+do\s+carrinho|carrinho)/i;

    const priceMatches = rawText.match(priceRegex) || [];
    const discountMatches = rawText.match(discountRegex) || [];
    const couponMatches = rawText.match(couponRegex) || [];
    const installmentMatches = rawText.match(installmentRegex) || [];
    const scene1Matches = rawText.match(scene1Regex) || [];
    const preambleMatches = rawText.match(preambleRegex) || [];
    const strategicHeadingsMatches = rawText.match(strategicHeadingsRegex) || [];
    const carrinhoLaranjaPresent = carrinhoLaranjaRegex.test(rawText);

    return {
        priceDetected: priceMatches.length > 0,
        priceMatches: Array.from(new Set(priceMatches.map(m => m.trim()))),
        discountDetected: discountMatches.length > 0,
        discountMatches: Array.from(new Set(discountMatches.map(m => m.trim()))),
        couponDetected: couponMatches.length > 0,
        couponMatches: Array.from(new Set(couponMatches.map(m => m.trim()))),
        installmentDetected: installmentMatches.length > 0,
        installmentMatches: Array.from(new Set(installmentMatches.map(m => m.trim()))),
        scene1Detected: scene1Matches.length > 0,
        scene1Matches: Array.from(new Set(scene1Matches.map(m => m.trim()))),
        preambleDetected: preambleMatches.length > 0,
        preambleMatches: Array.from(new Set(preambleMatches.map(m => m.trim().slice(0, 80)))),
        strategicHeadingsDetected: strategicHeadingsMatches.length > 0,
        strategicHeadingsMatches: Array.from(new Set(strategicHeadingsMatches.map(m => m.trim()))),
        carrinhoLaranjaPresent
    };
}

/**
 * Extracts and prepares the multimodal image part from the uploaded file dataUrl.
 */
function extractImageParts(productImage: AgenteDeCopyInput['productImage']) {
    const parts: Array<{
        inlineData: {
            mimeType: string;
            data: string;
        };
    }> = [];

    if (productImage?.dataUrl && productImage.dataUrl.startsWith('data:image/')) {
        const matches = productImage.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
            parts.push({
                inlineData: {
                    mimeType: matches[1],
                    data: matches[2]
                }
            });
        }
    }

    return parts;
}

/**
 * Executes a single branch (Test A or Test B) of the A/B diagnostic.
 * STRICTLY NO REPAIR REQUEST.
 * NO EVALUATOR DECISION.
 */
async function executeSingleBranch(
    branch: 'A_SYSTEM_INSTRUCTION' | 'B_MONOBLOCK_CONTENTS',
    userTextPrompt: string,
    imageParts: Array<{ inlineData: { mimeType: string; data: string } }>
): Promise<SingleABTestResult> {
    const isTestA = branch === 'A_SYSTEM_INSTRUCTION';
    const name = isTestA ? 'A — SYSTEM INSTRUCTION' : 'B — MONOBLOCK CONTENTS';
    const description = isTestA
        ? 'Cérebro transmitido exclusivamente via systemInstruction nativo da Gemini API'
        : 'Cérebro transmitido concatenado no texto do usuário em contents (sem systemInstruction)';

    let rawText = '';
    let httpStatus = 'Iniciando requisição...';
    let finishReason = 'N/A';
    let response: any = null;

    // Shared generation configuration - STRICT CONTROL
    const generationConfig = {
        temperature: 0.65,
        topP: 0.9,
        maxOutputTokens: 3000
    };

    // Payload construction
    let payload: any;

    if (isTestA) {
        // TEST A: Native systemInstruction ONLY. Brain NOT present in contents.
        payload = {
            model: GEMINI_MODEL,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: userTextPrompt },
                        ...imageParts
                    ]
                }
            ],
            systemInstruction: {
                parts: [{ text: AGENTE_DE_COPY_BRAIN }]
            },
            generationConfig
        };
    } else {
        // TEST B: Monoblock user prompt containing AGENTE_DE_COPY_BRAIN. Strictly NO systemInstruction.
        const monoblockUserText = `${AGENTE_DE_COPY_BRAIN}\n\n---\n\n${userTextPrompt}`;
        payload = {
            model: GEMINI_MODEL,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: monoblockUserText },
                        ...imageParts
                    ]
                }
            ],
            generationConfig
        };
    }

    try {
        response = await postToWorker<any>('/', payload, {
            timeoutMs: API_TIMEOUT_MS,
            moduleName: `Agente de Copy [Diagnóstico A/B - ${branch}]`
        });

        httpStatus = '200 OK';
        rawText = (
            response?.raw_text ||
            response?.candidates?.[0]?.content?.parts?.[0]?.text ||
            (typeof response?.data === 'string' ? response.data : null) ||
            ''
        ).trim();

        finishReason = response?.candidates?.[0]?.finishReason || 'STOP';
    } catch (err: any) {
        httpStatus = `Erro: ${err?.message || 'Falha de comunicação'}`;
        rawText = '';
        finishReason = 'ERROR';
    }

    // Run existing parser without modification
    const parsed = parseAgenteDeCopyOutput(rawText);

    // Run existing validation without modification
    const validation = validateAgenteDeCopyContract(parsed.variations);

    // Count scenes strictly within range 160-175
    let scenesWithinRangeCount = 0;
    for (const c of validation.characterCounts) {
        if (c.scene2Valid) scenesWithinRangeCount++;
        if (c.scene3Valid) scenesWithinRangeCount++;
    }

    // Detect structural and semantic violations
    const violations = detectViolations(rawText);

    // Integrity checkpoints
    const integrityCheckpoints = buildIntegrityCheckpoints(response, rawText, parsed.checkpointC);

    const meta = response?.meta || null;

    return {
        label: branch,
        name,
        description,
        httpStatus,
        workerVersion: response?.worker_version || meta?.worker_version || null,
        requestedModel: response?.requested_model || meta?.requested_model || GEMINI_MODEL,
        executedModel: response?.executed_model || meta?.executed_model || null,
        finishReason,
        rawLength: rawText.length,
        rawText,
        versionBlocksDetected: parsed.versionBlocksDetected,
        scene2BlocksDetected: parsed.scene2BlocksDetected,
        scene3BlocksDetected: parsed.scene3BlocksDetected,
        parsedVariationCount: parsed.variations.length,
        variations: parsed.variations,
        validation,
        scenesWithinRangeCount,
        hasExactly6Versions: parsed.variations.length === 6,
        hasScene1Detected: violations.scene1Detected,
        violations,
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
        integrityCheckpoints
    };
}

/**
 * Orchestrates the controlled A/B Diagnostic Test.
 * Guarantees identical input snapshot for both Test A and Test B.
 * Executes A then B sequentially using the exact same variables.
 */
export async function executeAgenteDeCopyABTest(
    input: AgenteDeCopyInput,
    onProgress?: (step: 'executing_a' | 'executing_b' | 'analyzing') => void
): Promise<ABDiagnosticResult> {
    const { productImage, productTitle, productInfo } = input;

    if (!productImage || !productImage.dataUrl) {
        throw new Error('[Diagnóstico A/B] Imagem do produto é obrigatória para o teste.');
    }

    // 1. Freeze user context prompt from identical input snapshot
    const contextParts: string[] = [];
    if (productTitle && productTitle.trim()) {
        contextParts.push(`Título do Produto: ${productTitle.trim()}`);
    }
    if (productInfo && productInfo.trim()) {
        contextParts.push(`Informações adicionais do Produto: ${productInfo.trim()}`);
    }

    const userTextPrompt = contextParts.length > 0
        ? `Analise o produto na imagem anexa e as informações abaixo para criar as 6 versões de CENA 2 e CENA 3 conforme suas regras:\n\n${contextParts.join('\n')}`
        : `Analise visualmente o produto na imagem anexa e crie as 6 versões com apenas CENA 2 e CENA 3 conforme as suas regras.`;

    // 2. Extract image bytes once (identical snapshot)
    const imageParts = extractImageParts(productImage);

    // 3. Execute Test A (Native systemInstruction)
    if (onProgress) onProgress('executing_a');
    const testA = await executeSingleBranch('A_SYSTEM_INSTRUCTION', userTextPrompt, imageParts);

    // 4. Execute Test B (Monoblock contents)
    if (onProgress) onProgress('executing_b');
    const testB = await executeSingleBranch('B_MONOBLOCK_CONTENTS', userTextPrompt, imageParts);

    if (onProgress) onProgress('analyzing');

    return {
        testA,
        testB,
        executedAt: new Date().toISOString(),
        inputSnapshot: {
            hasImage: true,
            imageName: productImage.name || 'product_image',
            imageSize: productImage.size || 0,
            productTitle: productTitle || '',
            productInfo: productInfo || '',
            userTextPrompt,
            model: GEMINI_MODEL,
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 3000
        }
    };
}
