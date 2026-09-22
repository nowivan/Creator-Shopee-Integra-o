import { AGENTE_DE_COPY_BRAIN } from './brain';
import { AgenteDeCopyInput, AgentCopyVariation, AgenteDeCopyDiagnostics, AgenteDeCopyValidationResult, SingleAttemptDiagnostic, ResponseIntegrityCheckpoints, CheckpointADiagnostic, CheckpointBDiagnostic, CheckpointCDiagnostic } from './types';
import { parseAgenteDeCopyOutput, validateAgenteDeCopyContract, detectCorruptionPattern, computeTextFingerprint } from './parser';
import { postToWorker } from '../../services/workerClient';
import { GEMINI_MODEL, API_TIMEOUT_MS } from '../../utils';

export class AgenteDeCopyExecutionError extends Error {
    diagnostics?: AgenteDeCopyDiagnostics;
    constructor(message: string, diagnostics?: AgenteDeCopyDiagnostics) {
        super(message);
        this.name = 'AgenteDeCopyExecutionError';
        this.diagnostics = diagnostics;
    }
}

export interface ExecuteAgenteDeCopyResult {
    rawText: string;
    variations: AgentCopyVariation[];
    diagnostics: AgenteDeCopyDiagnostics;
    validation: AgenteDeCopyValidationResult;
}

/**
 * Builds diagnostic checkpoints A, B, and C to trace text corruption across the pipeline.
 */
export function buildIntegrityCheckpoints(
    transportResponse: any,
    extractedRawText: string,
    checkpointCFromParser?: Omit<CheckpointCDiagnostic, 'bEqualsC'>
): ResponseIntegrityCheckpoints {
    // CHECKPOINT A: Transport Response (immediately after postToWorker resolves, before extraction)
    const aType = typeof transportResponse;
    const aKeys = transportResponse && typeof transportResponse === 'object' ? Object.keys(transportResponse) : [];
    const aRawTextPresent = Boolean(
        transportResponse &&
        typeof transportResponse === 'object' &&
        'raw_text' in transportResponse &&
        transportResponse.raw_text !== undefined &&
        transportResponse.raw_text !== null
    );
    const aRawTextLength = typeof transportResponse?.raw_text === 'string' ? transportResponse.raw_text.length : 0;
    
    // Direct candidate from response object
    const aCandidateText: string = (
        transportResponse?.raw_text ||
        transportResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (typeof transportResponse?.data === 'string' ? transportResponse.data : null) ||
        (typeof transportResponse === 'string' ? transportResponse : '')
    ) || '';

    const aSample100 = aCandidateText.slice(0, 100);
    const aCorruption = detectCorruptionPattern(aCandidateText);

    const checkpointA: CheckpointADiagnostic = {
        type: aType,
        keys: aKeys,
        rawTextPresent: aRawTextPresent,
        rawTextLength: aRawTextLength,
        textCandidateLength: aCandidateText.length,
        sample100: aSample100,
        hasIndexPattern: aCorruption.hasIndexPattern
    };

    // CHECKPOINT B: Extracted Text
    const bLength = extractedRawText.length;
    const bSample100 = extractedRawText.slice(0, 100);
    const bSampleLast100 = extractedRawText.slice(-100);
    const bCorruption = detectCorruptionPattern(extractedRawText);
    const bFingerprint = computeTextFingerprint(extractedRawText);

    const checkpointB: CheckpointBDiagnostic = {
        textLength: bLength,
        sample100: bSample100,
        sampleLast100: bSampleLast100,
        hasIndexPattern: bCorruption.hasIndexPattern,
        fingerprint: bFingerprint
    };

    // CHECKPOINT C: Text sent to parser
    const cLength = checkpointCFromParser ? checkpointCFromParser.textLength : extractedRawText.length;
    const cSample100 = checkpointCFromParser ? checkpointCFromParser.sample100 : extractedRawText.slice(0, 100);
    const cFingerprint = checkpointCFromParser ? checkpointCFromParser.fingerprint : computeTextFingerprint(extractedRawText);
    const cHasIndexPattern = checkpointCFromParser ? checkpointCFromParser.hasIndexPattern : detectCorruptionPattern(extractedRawText).hasIndexPattern;
    const bEqualsC = (bFingerprint === cFingerprint && bLength === cLength);

    const checkpointC: CheckpointCDiagnostic = {
        textLength: cLength,
        sample100: cSample100,
        hasIndexPattern: cHasIndexPattern,
        fingerprint: cFingerprint,
        bEqualsC
    };

    // Corruption alerts & pattern matches
    const allMatches = Array.from(new Set([
        ...aCorruption.matches,
        ...bCorruption.matches,
        ...(checkpointCFromParser ? detectCorruptionPattern(extractedRawText).matches : [])
    ]));

    let firstCorruptedCheckpoint: 'A' | 'B' | 'C' | null = null;
    if (checkpointA.hasIndexPattern) {
        firstCorruptedCheckpoint = 'A';
    } else if (checkpointB.hasIndexPattern) {
        firstCorruptedCheckpoint = 'B';
    } else if (checkpointC.hasIndexPattern) {
        firstCorruptedCheckpoint = 'C';
    }

    return {
        checkpointA,
        checkpointB,
        checkpointC,
        corruptionDetected: firstCorruptedCheckpoint !== null,
        firstCorruptedCheckpoint,
        corruptionPatternMatches: allMatches
    };
}

const REPAIR_PROMPT_INSTRUCTION = `Your previous output did not satisfy the required output contract.

Generate the complete result again.

Required:
- exactly 6 versions
- every version must contain CENA 2 and CENA 3
- every CENA 2 must contain 160–175 characters
- every CENA 3 must contain 160–175 characters
- no CENA 1
- return only the 6 complete versions

Do not explain the correction.`;

/**
 * Builds the multimodal payload for Agente de Copy.
 * System instruction contains AGENTE_DE_COPY_BRAIN strictly once.
 * Contents contain user text prompt and the original product image.
 */
function buildPayload(
    userTextPrompt: string,
    productImage: AgenteDeCopyInput['productImage']
) {
    const parts: Array<{
        text?: string;
        inlineData?: {
            mimeType: string;
            data: string;
        };
    }> = [];

    // User text prompt only (System brain is passed via systemInstruction)
    parts.push({ text: userTextPrompt });

    // Attach raw original image base64
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

    return {
        model: GEMINI_MODEL,
        contents: [
            {
                role: 'user',
                parts
            }
        ],
        systemInstruction: {
            parts: [{ text: AGENTE_DE_COPY_BRAIN }]
        },
        generationConfig: {
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 3000
        }
    };
}

/**
 * Executes Agente de Copy with:
 * 1. Initial generation request
 * 2. Strict Contract & Character Validation (6 versions, all 12 scenes 160-175 chars)
 * 3. Max ONE controlled model repair request if validation fails
 * 4. Diagnostic capture for development panel
 * 5. Strict rejection if invalid after repair
 */
export async function executeAgenteDeCopy(input: AgenteDeCopyInput): Promise<ExecuteAgenteDeCopyResult> {
    const { productImage, productTitle, productInfo } = input;

    if (!productImage || !productImage.dataUrl) {
        throw new Error('[Agente de Copy] Imagem do produto é obrigatória para análise visual da IA.');
    }

    const history: SingleAttemptDiagnostic[] = [];

    // 1. Build user context prompt
    const contextParts: string[] = [];
    if (productTitle && productTitle.trim()) {
        contextParts.push(`Título do Produto: ${productTitle.trim()}`);
    }
    if (productInfo && productInfo.trim()) {
        contextParts.push(`Informações adicionais do Produto: ${productInfo.trim()}`);
    }

    const initialUserPrompt = contextParts.length > 0
        ? `Analise o produto na imagem anexa e as informações abaixo para criar as 6 versões de CENA 2 e CENA 3 conforme suas regras:\n\n${contextParts.join('\n')}`
        : `Analise visualmente o produto na imagem anexa e crie as 6 versões com apenas CENA 2 e CENA 3 conforme as suas regras.`;

    // -------------------------------------------------------------
    // ATTEMPT 1: Initial Request
    // -------------------------------------------------------------
    let initialRawText = '';
    let finishReason1 = 'N/A';
    let apiStatus1 = 'Iniciando requisição...';
    let initialResponse: any = null;

    try {
        const initialPayload = buildPayload(initialUserPrompt, productImage);

        initialResponse = await postToWorker<any>('/', initialPayload, {
            timeoutMs: API_TIMEOUT_MS,
            moduleName: 'Agente de Copy'
        });

        apiStatus1 = '200 OK (Resposta recebida com sucesso)';
        initialRawText = (
            initialResponse?.raw_text ||
            initialResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
            (typeof initialResponse?.data === 'string' ? initialResponse.data : null) ||
            ''
        ).trim();

        finishReason1 = initialResponse?.candidates?.[0]?.finishReason || 'STOP';
    } catch (err: any) {
        apiStatus1 = `Erro na API/Worker: ${err?.message || 'Falha de comunicação'}`;
        const failDiag1: SingleAttemptDiagnostic = {
            attemptNumber: 1,
            requestType: 'Initial Request (Tentativa 1)',
            apiStatus: apiStatus1,
            modelUsed: GEMINI_MODEL,
            finishReason: 'ERROR',
            rawResponseLength: 0,
            completeRawText: '',
            versionBlocksDetected: 0,
            scene2BlocksDetected: 0,
            scene3BlocksDetected: 0,
            parsedVariationCount: 0,
            exactParserError: err?.message || 'Falha de conexão com a API',
            characterCounts: [],
            isValid: false,
            isStrictRangeMet: false,
            issues: [err?.message || 'Falha na requisição da API']
        };
        throw new AgenteDeCopyExecutionError(err?.message || 'Erro na requisição da API', {
            currentAttempt: failDiag1,
            history: [failDiag1]
        });
    }

    const parsed1 = parseAgenteDeCopyOutput(initialRawText);
    const validation1 = validateAgenteDeCopyContract(parsed1.variations);
    const meta1 = initialResponse?.execution_meta;
    const integrityCheckpoints1 = buildIntegrityCheckpoints(initialResponse, initialRawText, parsed1.checkpointC);

    const diag1: SingleAttemptDiagnostic = {
        attemptNumber: 1,
        requestType: 'Initial Request (Tentativa 1)',
        apiStatus: apiStatus1,
        modelUsed: initialResponse?.executed_model || meta1?.executed_model || GEMINI_MODEL,
        finishReason: finishReason1,
        rawResponseLength: initialRawText.length,
        completeRawText: initialRawText,
        versionBlocksDetected: parsed1.versionBlocksDetected,
        scene2BlocksDetected: parsed1.scene2BlocksDetected,
        scene3BlocksDetected: parsed1.scene3BlocksDetected,
        parsedVariationCount: parsed1.variations.length,
        exactParserError: parsed1.exactParserError,
        characterCounts: validation1.characterCounts,
        isValid: validation1.valid,
        isStrictRangeMet: validation1.isStrictRangeMet,
        issues: validation1.issues,
        requestId: initialResponse?.request_id || null,
        workerVersion: initialResponse?.worker_version || meta1?.worker_version || null,
        proxyPath: initialResponse?.proxy_path || null,
        requestedModel: initialResponse?.requested_model || meta1?.requested_model || GEMINI_MODEL,
        executedModel: initialResponse?.executed_model || meta1?.executed_model || null,
        systemInstructionReceived: meta1 ? Boolean(meta1.system_instruction_received) : null,
        systemInstructionForwarded: meta1 ? Boolean(meta1.system_instruction_forwarded) : null,
        inlineImageReceived: meta1 ? Boolean(meta1.inline_image_received) : null,
        inlineImageForwarded: meta1 ? Boolean(meta1.inline_image_forwarded) : null,
        failoverUsed: initialResponse?.failover_used ?? false,
        syntheticFallbackUsed: initialResponse?.synthetic_fallback_used ?? false,
        integrityCheckpoints: integrityCheckpoints1,
    };

    history.push(diag1);

    console.log('[Agente de Copy Diagnostics - Tentativa 1]', {
        rawLength: diag1.rawResponseLength,
        blocksFound: diag1.versionBlocksDetected,
        parsedCount: diag1.parsedVariationCount,
        finishReason: diag1.finishReason,
        isValid: diag1.isValid,
        issues: diag1.issues,
        sceneCounts: diag1.characterCounts.map(c => `V${c.id}: C2=${c.scene2Length} (${c.scene2Valid ? 'OK' : 'ERR'}), C3=${c.scene3Length} (${c.scene3Valid ? 'OK' : 'ERR'})`)
    });

    // If initial output is 100% compliant with strict character range (160-175) and 6-version contract, return immediately
    if (validation1.valid) {
        return {
            rawText: initialRawText,
            variations: parsed1.variations,
            diagnostics: { currentAttempt: diag1, history },
            validation: validation1
        };
    }

    // -------------------------------------------------------------
    // ATTEMPT 2: Controlled Repair Request (Max 1 retry)
    // -------------------------------------------------------------
    console.warn('[Agente de Copy] Saída inicial fora do padrão do contrato. Iniciando reparo controlado com o modelo...', validation1.issues);

    let repairRawText = '';
    let finishReason2 = 'N/A';
    let apiStatus2 = 'Iniciando reparo...';
    let repairResponse: any = null;

    try {
        const repairUserPrompt = `${contextParts.length > 0 ? contextParts.join('\n') + '\n\n' : ''}${REPAIR_PROMPT_INSTRUCTION}`;
        const repairPayload = buildPayload(repairUserPrompt, productImage);

        repairResponse = await postToWorker<any>('/', repairPayload, {
            timeoutMs: API_TIMEOUT_MS,
            moduleName: 'Agente de Copy (Repair)'
        });

        apiStatus2 = '200 OK (Resposta de reparo recebida)';
        repairRawText = (
            repairResponse?.raw_text ||
            repairResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
            (typeof repairResponse?.data === 'string' ? repairResponse.data : null) ||
            ''
        ).trim();

        finishReason2 = repairResponse?.candidates?.[0]?.finishReason || 'STOP';
    } catch (err: any) {
        apiStatus2 = `Erro no reparo: ${err?.message || 'Falha de comunicação'}`;
    }

    const parsed2 = parseAgenteDeCopyOutput(repairRawText);
    const validation2 = validateAgenteDeCopyContract(parsed2.variations);
    const meta2 = repairResponse?.execution_meta;
    const integrityCheckpoints2 = buildIntegrityCheckpoints(repairResponse, repairRawText, parsed2.checkpointC);

    const diag2: SingleAttemptDiagnostic = {
        attemptNumber: 2,
        requestType: 'Repair Request (Tentativa 2)',
        apiStatus: apiStatus2,
        modelUsed: repairResponse?.executed_model || meta2?.executed_model || GEMINI_MODEL,
        finishReason: finishReason2,
        rawResponseLength: repairRawText.length,
        completeRawText: repairRawText,
        versionBlocksDetected: parsed2.versionBlocksDetected,
        scene2BlocksDetected: parsed2.scene2BlocksDetected,
        scene3BlocksDetected: parsed2.scene3BlocksDetected,
        parsedVariationCount: parsed2.variations.length,
        exactParserError: parsed2.exactParserError,
        characterCounts: validation2.characterCounts,
        isValid: validation2.valid,
        isStrictRangeMet: validation2.isStrictRangeMet,
        issues: validation2.issues,
        requestId: repairResponse?.request_id || null,
        workerVersion: repairResponse?.worker_version || meta2?.worker_version || null,
        proxyPath: repairResponse?.proxy_path || null,
        requestedModel: repairResponse?.requested_model || meta2?.requested_model || GEMINI_MODEL,
        executedModel: repairResponse?.executed_model || meta2?.executed_model || null,
        systemInstructionReceived: meta2 ? Boolean(meta2.system_instruction_received) : null,
        systemInstructionForwarded: meta2 ? Boolean(meta2.system_instruction_forwarded) : null,
        inlineImageReceived: meta2 ? Boolean(meta2.inline_image_received) : null,
        inlineImageForwarded: meta2 ? Boolean(meta2.inline_image_forwarded) : null,
        failoverUsed: repairResponse?.failover_used ?? false,
        syntheticFallbackUsed: repairResponse?.synthetic_fallback_used ?? false,
        integrityCheckpoints: integrityCheckpoints2,
    };

    history.push(diag2);

    console.log('[Agente de Copy Diagnostics - Tentativa 2 (Reparo)]', {
        rawLength: diag2.rawResponseLength,
        blocksFound: diag2.versionBlocksDetected,
        parsedCount: diag2.parsedVariationCount,
        finishReason: diag2.finishReason,
        isValid: diag2.isValid,
        issues: diag2.issues,
        sceneCounts: diag2.characterCounts.map(c => `V${c.id}: C2=${c.scene2Length} (${c.scene2Valid ? 'OK' : 'ERR'}), C3=${c.scene3Length} (${c.scene3Valid ? 'OK' : 'ERR'})`)
    });

    // If Attempt 2 produced valid 6 versions within 160-175 characters, use it
    if (validation2.valid) {
        return {
            rawText: repairRawText,
            variations: parsed2.variations,
            diagnostics: { currentAttempt: diag2, history },
            validation: validation2
        };
    }

    // -------------------------------------------------------------
    // FINAL FAILURE: Repair request still failed validation
    // -------------------------------------------------------------
    throw new AgenteDeCopyExecutionError(
        'Não foi possível gerar as 6 versões dentro do padrão do Agente de Copy. Tente gerar novamente.',
        { currentAttempt: diag2, history }
    );
}
