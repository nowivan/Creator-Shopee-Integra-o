import { 
    AGENTE_DE_COPY_CLEAN_A_BRAIN, 
    AGENTE_DE_COPY_CLEAN_B_BRAIN, 
    AGENTE_DE_COPY_CLEAN_C_BRAIN,
    AGENTE_DE_COPY_CLEAN_D_BRAIN,
    AGENTE_DE_COPY_CLEAN_D_CORE_SHORT,
    CLEAN_D_CORE_SHORT_USER_TASK,
    CLEAN_D_REVISOR_INSTRUCTION,
    CLEAN_D_SENIOR_COPY_CONTRACT_TEXT,
    buildCleanDInitialPrompt,
    buildCleanDComplementPrompt,
    buildCleanDReviewerPrompt,
    buildCleanDManualRepairPrompt
} from './brain';
import { buildCleanProductBrief } from './brief';
import { GEMINI_MODEL } from '../../utils';
import { postToWorker } from '../../services/workerClient';
import { 
    validateCleanCopyResult, 
    validateScene, 
    extractCommercialEvidence,
    microRepairSceneText,
    CLEAN_D_MIN_CHARS, 
    CLEAN_D_MAX_CHARS 
} from './validator';
import { 
    AcceptanceReason,
    AgenteDeCopyCleanResult, 
    CleanCopyVariation, 
    CleanVariantType,
    CleanDBrainVariant,
    CleanDReviewerGroundingMode,
    CleanDExecutionTrace,
    CommercialEvidence,
    DEFAULT_COMMERCIAL_EVIDENCE,
    InitialGenerationMetrics,
    RevisionItemInput,
    RevisionRoundDiagnostics,
    SceneMergeDiagnostic,
    SceneValidation,
    VariationMergeDiagnostic,
    SingleSceneRepairDiagnostic,
    SingleSceneRepairInput,
    SingleSceneRepairResult,
    CLEAN_D_SENIOR_COPY_CONTRACT_V1
} from './types';

/**
 * Pure structural response schema for Gemini Structured Output.
 * Contains only structural keys (id, scene2, scene3) with zero marketing rules.
 */
export const AGENTE_DE_COPY_CLEAN_SCHEMA = {
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
 * Structural response schema for Clean D Selective Revision.
 */
export const AGENTE_DE_COPY_CLEAN_REVISION_SCHEMA = {
    type: "OBJECT",
    properties: {
        revisions: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    versionId: { type: "INTEGER" },
                    scene: { type: "STRING" },
                    text: { type: "STRING" }
                },
                required: ["versionId", "scene", "text"]
            }
        }
    },
    required: ["revisions"]
};

/**
 * Computes isolated initial generation metrics before any revision rounds.
 */
export function computeInitialGenerationMetrics(sceneValidations: SceneValidation[]): InitialGenerationMetrics {
    const scene2 = sceneValidations.filter(s => s.scene === 'scene2');
    const scene3 = sceneValidations.filter(s => s.scene === 'scene3');
    
    const countViolation = (type: string) => 
        sceneValidations.reduce((acc, s) => acc + (s.violations.includes(type) ? 1 : 0), 0);

    return {
        initialValidScenes: sceneValidations.filter(s => s.valid).length,
        scene2Valid: scene2.filter(s => s.valid).length,
        scene3Valid: scene3.filter(s => s.valid).length,
        charsValid: sceneValidations.filter(s => s.charactersValid).length,
        orangeCartValid: scene3.filter(s => !s.missingOrangeCartCTA).length,
        violations: {
            PRICE: countViolation('PRICE'),
            INSTALLMENT: countViolation('INSTALLMENT'),
            DISCOUNT: countViolation('DISCOUNT'),
            STOCK: countViolation('STOCK'),
            VISUAL_DESCRIPTION_DETECTED: countViolation('VISUAL_DESCRIPTION_DETECTED'),
            CHARACTERS_BELOW_MIN: countViolation('CHARACTERS_BELOW_MIN'),
            CHARACTERS_ABOVE_MAX: countViolation('CHARACTERS_ABOVE_MAX'),
            MISSING_ORANGE_CART_CTA: countViolation('MISSING_ORANGE_CART_CTA')
        }
    };
}

/**
 * Maps variant type ('A' | 'B' | 'C' | 'D') to its respective immutable brain.
 */
export function getCleanBrainByVariant(variant: CleanVariantType, brainVariant: CleanDBrainVariant = 'CURRENT'): string {
    switch (variant) {
        case 'A':
            return AGENTE_DE_COPY_CLEAN_A_BRAIN;
        case 'B':
            return AGENTE_DE_COPY_CLEAN_B_BRAIN;
        case 'C':
            return AGENTE_DE_COPY_CLEAN_C_BRAIN;
        case 'D':
        default:
            return brainVariant === 'CORE_SHORT' 
                ? AGENTE_DE_COPY_CLEAN_D_CORE_SHORT 
                : AGENTE_DE_COPY_CLEAN_D_BRAIN;
    }
}

/**
 * Strips outer markdown fences if present (e.g. ```json ... ``` or ``` ... ```).
 */
export function sanitizeJsonString(text: string): string {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    return cleaned;
}

/**
 * Parses raw JSON string with conservative structural recovery if needed.
 */
export function parseJsonSafely(rawText: string): { data: any; status: 'SUCCESS' | 'REPAIRED' | 'FAILED' } {
    const cleaned = sanitizeJsonString(rawText);
    if (!cleaned) {
        return { data: null, status: 'FAILED' };
    }
    try {
        const parsed = JSON.parse(cleaned);
        return { data: parsed, status: 'SUCCESS' };
    } catch (_) {
        try {
            let repaired = cleaned;
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/\]/g) || []).length;
            const openBraces = (repaired.match(/\{/g) || []).length;
            const closeBraces = (repaired.match(/\}/g) || []).length;

            for (let i = 0; i < (openBraces - closeBraces); i++) repaired += '}';
            for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += ']';
            if (!repaired.endsWith('}')) repaired += '}';

            const parsed = JSON.parse(repaired);
            return { data: parsed, status: 'REPAIRED' };
        } catch (_) {
            return { data: null, status: 'FAILED' };
        }
    }
}

/**
 * Multi-layer resilient parser for Clean D variations.
 * Extracts variations from raw objects, arrays, versions/variations keys,
 * and recovers truncated or malformed JSON payloads using regex extraction.
 * Guarantees strict 6-ID domain mapping (1..6).
 */
export function parseCleanVariationsSafely(rawInput: any): {
    variations: CleanCopyVariation[];
    rawParsed: any;
    status: 'SUCCESS' | 'REPAIRED' | 'FAILED';
} {
    if (!rawInput) {
        return { variations: [], rawParsed: null, status: 'FAILED' };
    }

    let parsedObj: any = null;
    let parseStatus: 'SUCCESS' | 'REPAIRED' | 'FAILED' = 'FAILED';

    if (typeof rawInput === 'object' && rawInput !== null) {
        parsedObj = rawInput;
        parseStatus = 'SUCCESS';
    } else if (typeof rawInput === 'string') {
        const { data, status } = parseJsonSafely(rawInput);
        parsedObj = data;
        parseStatus = status;
    }

    const variationsMap = new Map<number, CleanCopyVariation>();

    // Layer 1: Structured Object / Array extraction
    const candidateList = Array.isArray(parsedObj)
        ? parsedObj
        : (Array.isArray(parsedObj?.versions)
            ? parsedObj.versions
            : (Array.isArray(parsedObj?.variations)
                ? parsedObj.variations
                : (Array.isArray(parsedObj?.data?.versions)
                    ? parsedObj.data.versions
                    : (Array.isArray(parsedObj?.data?.variations)
                        ? parsedObj.data.variations
                        : []))));

    if (Array.isArray(candidateList) && candidateList.length > 0) {
        for (let i = 0; i < candidateList.length; i++) {
            const item = candidateList[i];
            if (item && typeof item === 'object') {
                const id = typeof item.id === 'number'
                    ? item.id
                    : (typeof item.versionId === 'number' ? item.versionId : (i + 1));
                const rawScene2 = typeof item.scene2 === 'string'
                    ? item.scene2.trim()
                    : (typeof item.cena2 === 'string' ? item.cena2.trim() : '');
                const rawScene3 = typeof item.scene3 === 'string'
                    ? item.scene3.trim()
                    : (typeof item.cena3 === 'string' ? item.cena3.trim() : '');

                const scene2 = rawScene2 ? microRepairSceneText('scene2', rawScene2).repairedText : rawScene2;
                const scene3 = rawScene3 ? microRepairSceneText('scene3', rawScene3).repairedText : rawScene3;

                if ((scene2 || scene3) && id >= 1 && id <= 6 && !variationsMap.has(id)) {
                    variationsMap.set(id, { id, scene2, scene3 });
                }
            }
        }
    }

    // Layer 2: Regex extraction for truncated or partial JSON strings
    if (variationsMap.size === 0 && typeof rawInput === 'string') {
        const itemRegex = /\{\s*"id"\s*:\s*(\d+)[\s\S]*?"scene2"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?"scene3"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/gi;
        let match: RegExpExecArray | null;
        while ((match = itemRegex.exec(rawInput)) !== null) {
            const id = parseInt(match[1], 10);
            const rawScene2 = match[2].replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '\\').trim();
            const rawScene3 = match[3].replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '\\').trim();
            const scene2 = rawScene2 ? microRepairSceneText('scene2', rawScene2).repairedText : rawScene2;
            const scene3 = rawScene3 ? microRepairSceneText('scene3', rawScene3).repairedText : rawScene3;
            if (id >= 1 && id <= 6 && !variationsMap.has(id)) {
                variationsMap.set(id, { id, scene2, scene3 });
                parseStatus = 'REPAIRED';
            }
        }
    }

    const variations = Array.from(variationsMap.values()).sort((a, b) => a.id - b.id);
    return {
        variations,
        rawParsed: parsedObj,
        status: variations.length > 0 ? parseStatus : 'FAILED'
    };
}

/**
 * Constructs dynamic per-scene guidance for the selective revision based on violations and scene type.
 */
export function buildRevisionItem(
    s: SceneValidation, 
    minChars: number = CLEAN_D_MIN_CHARS, 
    maxChars: number = CLEAN_D_MAX_CHARS, 
    targetChars: number = 168
): RevisionItemInput {
    const isScene2 = s.scene === 'scene2';
    const tipo = isScene2 ? 'CENA 2 — TEXTO FALADO DA COPY' : 'CENA 3 — TEXTO FALADO DA COPY';
    
    const actions: string[] = [];

    // Language requirement
    actions.push('Reescreva obrigatoriamente como COPY FALADA em português do Brasil.');

    // Scene specific base role
    if (isScene2) {
        actions.push('Mantenha o foco em benefícios reais, desejo e resultado prático.');
    } else {
        actions.push('Crie urgência natural e risco de deixar para depois sem inventar escassez, estoque ou prazo falso.');
    }

    // Explicit contract length guidance
    if (s.violations.includes('CHARACTERS_BELOW_MIN')) {
        actions.push(`O texto atual possui ${s.characterCount} caracteres e está inválido. Retorne a CENA COMPLETA REESCRITA, não um complemento, resumo ou fragmento. A resposta final deste campo deve possuir entre ${minChars} e ${maxChars} caracteres, preferencialmente ${targetChars}. Antes de retornar, conte internamente o texto completo. Se estiver abaixo de ${minChars}, continue desenvolvendo a mesma ideia com informação útil e sustentada. Não devolva o campo enquanto estiver abaixo de ${minChars} ou acima de ${maxChars} (não use repetição ou preenchimento artificial).`);
    } else if (s.violations.includes('CHARACTERS_ABOVE_MAX')) {
        actions.push(`O texto atual possui ${s.characterCount} caracteres e está acima do máximo de ${maxChars}. Retorne a CENA COMPLETA REESCRITA de forma mais concisa em português do Brasil até ficar entre ${minChars} e ${maxChars} caracteres, preferencialmente ${targetChars} (não corte palavras mecanicamente).`);
    } else {
        actions.push(`Mantenha o comprimento estritamente entre ${minChars} e ${maxChars} caracteres (alvo: ~${targetChars}).`);
    }

    // Visual description guidance
    if (s.violations.includes('VISUAL_DESCRIPTION_DETECTED')) {
        actions.push('O texto atual está descrevendo imagem, câmera, pessoa, modelo, movimento, cenário ou composição visual. DESCARTE essa estrutura visual e reescreva a ideia como COPY FALADA diretamente ao consumidor em português do Brasil. Não descreva o que acontece no vídeo.');
    }

    // Orange cart CTA guidance for scene 3
    if (!isScene2) {
        if (s.violations.includes('MISSING_ORANGE_CART_CTA')) {
            actions.push('A CENA 3 está sem o CTA obrigatório. A versão final completa deve conter literalmente a expressão: "carrinho laranja" (não substitua por link, botão, comprar agora, checkout ou carrinho).');
        } else {
            actions.push('A versão final completa deve conter literalmente "carrinho laranja".');
        }
    }

    // Commercial prohibitions
    if (s.violations.some(v => ['PRICE', 'INSTALLMENT', 'DISCOUNT', 'STOCK', 'UNSUPPORTED_COMMERCIAL_CLAIM'].includes(v))) {
        actions.push('Remova qualquer menção a preço, R$, reais, parcelamento, desconto, cupom, estoque ou prazo inventado.');
    }

    return {
        versionId: s.versionId,
        scene: s.scene,
        tipo,
        tamanhoAtual: s.characterCount,
        faixaObrigatoria: `${minChars}–${maxChars} caracteres`,
        currentCharacterCount: s.characterCount,
        violations: [...s.violations],
        acao: actions.join(' '),
        text: s.text
    };
}

/**
 * Computes deterministic field-specific revision permissions for each variation.
 * Only scenes that are explicitly invalid in the validator are authorized for revision.
 */
export function computeRevisionPermissions(
    currentVariations: CleanCopyVariation[],
    invalidScenes: SceneValidation[]
): Map<number, { reviseScene2: boolean; reviseScene3: boolean }> {
    const permissionsMap = new Map<number, { reviseScene2: boolean; reviseScene3: boolean }>();

    for (const v of currentVariations) {
        const hasInvalidScene2 = invalidScenes.some(s => s.versionId === v.id && s.scene === 'scene2' && !s.valid);
        const hasInvalidScene3 = invalidScenes.some(s => s.versionId === v.id && s.scene === 'scene3' && !s.valid);

        permissionsMap.set(v.id, {
            reviseScene2: hasInvalidScene2,
            reviseScene3: hasInvalidScene3
        });
    }

    return permissionsMap;
}

/**
 * Constructs the reviewer text payload for Round 1 or Round 2.
 * In 'text_only' mode, encapsulates a compact structured envelope with anti-visual transformation rules and contracts.
 */
export function buildReviewerTextPayload(
    items: RevisionItemInput[],
    contextText: string,
    commercialEvidence: CommercialEvidence,
    groundingMode: CleanDReviewerGroundingMode = 'multimodal',
    roundNumber: number = 1
): string {
    const evidenceSummary = `Nível ${commercialEvidence.level} (Preço no input: ${commercialEvidence.hasVisiblePrice ? 'SIM' : 'NÃO'}, Desconto explícito: ${commercialEvidence.hasExplicitDiscount ? 'SIM' : 'NÃO'}, Prazo/Estoque: ${commercialEvidence.hasExplicitDeadline || commercialEvidence.hasExplicitStockLimit ? 'SIM' : 'NÃO'})`;

    if (groundingMode === 'text_only') {
        return `CLEAN D SELECTIVE REVISION — ROUND ${roundNumber} (MODO TEXTO APENAS)

${CLEAN_D_SENIOR_COPY_CONTRACT_TEXT}

FATOS E CONTEXTO DO PRODUTO:
${contextText}

EVIDÊNCIA COMERCIAL DISPONÍVEL:
${evidenceSummary}

ITENS PARA REVISÃO:
${JSON.stringify({ itemsToRevise: items }, null, 2)}

CONTRATO SEMÂNTICO E DIRETRIZES DE TRANSFORMAÇÃO:

1. REGRA ANTI-DESCRIÇÃO VISUAL (MANDATÓRIA):
Transforme: OBSERVAÇÃO VISUAL → FATO DO PRODUTO → BENEFÍCIO/VALOR AO CLIENTE.
NUNCA transforme descrição visual em outra descrição visual.
Nunca use termos de câmera, foco, close, destaque, enquadramento, estúdio, iluminação, modelo, cenário ou roteiro de gravação.
O texto final deve ser COPY FALADA diretamente ao consumidor.

2. CENA 2 — CONTRATO POSITIVO:
FATO VERIFICÁVEL → FUNÇÃO REAL → BENEFÍCIO À PESSOA → RESULTADO PRÁTICO NO COTIDIANO → CONTEXTO DE USO.

3. CENA 3 — CONTRATO POSITIVO:
EVIDÊNCIA COMERCIAL → OPORTUNIDADE COMPATÍVEL → RISCO LEGÍTIMO DE DEIXAR PARA DEPOIS → AÇÃO → literal "carrinho laranja".
Nunca mencione preços, R$, valores monetários ou parcelas.
Nunca invente escassez, estoque ou prazo se não houver evidência comprovada.

4. CONTRATO DE CARACTERES:
Cada cena reescrita deve ter estritamente entre 160 e 175 caracteres (contando espaços). Não use preenchimento artificial.`;
    }

    // Multimodal mode
    return `CONTEXTO ORIGINAL DO PRODUTO:
${contextText}

EVIDÊNCIA COMERCIAL:
${evidenceSummary}

${CLEAN_D_SENIOR_COPY_CONTRACT_TEXT}

TAREFA DE REVISÃO SELETIVA${roundNumber > 1 ? ` (ROUND ${roundNumber})` : ''}:
${JSON.stringify({ itemsToRevise: items }, null, 2)}`;
}

/**
 * Robustly extracts candidate text for a specific version and scene from reviewer output.
 * Handles revisions arrays, versions arrays, and variations arrays.
 */
export function extractReviewerSceneText(
    parsedReviewer: any,
    versionId: number,
    scene: 'scene2' | 'scene3'
): string | null {
    if (!parsedReviewer) return null;

    // 1. Check in 'revisions' array (standard schema)
    const revisionsList = Array.isArray(parsedReviewer?.revisions)
        ? parsedReviewer.revisions
        : (Array.isArray(parsedReviewer)
            ? parsedReviewer
            : (Array.isArray(parsedReviewer?.data?.revisions) ? parsedReviewer.data.revisions : null));

    if (Array.isArray(revisionsList)) {
        const match = revisionsList.find((r: any) => {
            const vId = r?.versionId ?? r?.id;
            if (Number(vId) !== versionId) return false;
            const rScene = String(r?.scene || '').toLowerCase().replace(/[\s_-]/g, '');
            if (scene === 'scene2') {
                return rScene === 'scene2' || rScene === 'cena2';
            } else {
                return rScene === 'scene3' || rScene === 'cena3';
            }
        });

        if (match) {
            if (typeof match.text === 'string' && match.text.trim().length > 0) {
                return match.text.trim();
            }
            if (typeof match[scene] === 'string' && match[scene].trim().length > 0) {
                return match[scene].trim();
            }
        }
    }

    // 2. Check in 'versions' or 'variations' array (fallback schema)
    const versionsList = Array.isArray(parsedReviewer?.versions)
        ? parsedReviewer.versions
        : (Array.isArray(parsedReviewer?.variations)
            ? parsedReviewer.variations
            : (Array.isArray(parsedReviewer?.data?.versions)
                ? parsedReviewer.data.versions
                : (Array.isArray(parsedReviewer?.data?.variations) ? parsedReviewer.data.variations : null)));

    if (Array.isArray(versionsList)) {
        const match = versionsList.find((v: any) => Number(v?.id ?? v?.versionId) === versionId);
        if (match && typeof match[scene] === 'string' && match[scene].trim().length > 0) {
            return match[scene].trim();
        }
    }

    return null;
}

/**
 * Evaluates candidate scene returned by the reviewer against the previous scene.
 * Strictly separates PERMISSION TO REVISE from PERMISSION TO ACCEPT REVIEWER OUTPUT.
 * Validates candidate text deterministically using the official validateScene().
 */
export function evaluateCandidateScene(
    versionId: number,
    scene: 'scene2' | 'scene3',
    previousText: string,
    candidateText: string | null,
    authorized: boolean,
    roundNumber: number = 1,
    evidence: CommercialEvidence = DEFAULT_COMMERCIAL_EVIDENCE
): { accepted: boolean; acceptanceReason: AcceptanceReason; finalText: string; diagnostic: SceneMergeDiagnostic } {
    const prevVal = validateScene(versionId, scene, previousText, CLEAN_D_MIN_CHARS, CLEAN_D_MAX_CHARS, evidence);

    if (!authorized) {
        return {
            accepted: false,
            acceptanceReason: 'REJECTED_UNAUTHORIZED_FIELD',
            finalText: previousText,
            diagnostic: {
                scene,
                authorized: false,
                previousCharacterCount: prevVal.characterCount,
                accepted: false,
                acceptanceReason: 'REJECTED_UNAUTHORIZED_FIELD'
            }
        };
    }

    if (!candidateText || candidateText.trim().length === 0) {
        return {
            accepted: false,
            acceptanceReason: 'REJECTED_EMPTY_CANDIDATE',
            finalText: previousText,
            diagnostic: {
                scene,
                authorized: true,
                previousCharacterCount: prevVal.characterCount,
                accepted: false,
                acceptanceReason: 'REJECTED_EMPTY_CANDIDATE'
            }
        };
    }

    const rawCandidate = candidateText.trim();
    const repairedCandidate = microRepairSceneText(scene, rawCandidate, evidence).repairedText;
    const trimmedCandidate = repairedCandidate.trim();
    const candidateVal = validateScene(versionId, scene, trimmedCandidate, CLEAN_D_MIN_CHARS, CLEAN_D_MAX_CHARS, evidence);

    // 1. Case: Candidate is completely valid according to official validator
    if (candidateVal.valid) {
        return {
            accepted: true,
            acceptanceReason: 'VALID_CANDIDATE',
            finalText: trimmedCandidate,
            diagnostic: {
                scene,
                authorized: true,
                previousCharacterCount: prevVal.characterCount,
                candidateCharacterCount: candidateVal.characterCount,
                candidateValid: true,
                candidateViolations: candidateVal.violations,
                accepted: true,
                acceptanceReason: 'VALID_CANDIDATE'
            }
        };
    }

    // 2. Case: Check if candidate contains critical or prohibited violations
    // Strictly enforces: SEMANTICS > CTA > CHARACTERS
    const criticalViolations = [
        'PRICE',
        'INSTALLMENT',
        'DISCOUNT',
        'STOCK',
        'UNSUPPORTED_COMMERCIAL_CLAIM',
        'SCENE_1_DETECTED',
        'VISUAL_DESCRIPTION_DETECTED'
    ];

    const hasCriticalViolation = candidateVal.violations.some(v => criticalViolations.includes(v));
    const hasCtaViolation = scene === 'scene3' && candidateVal.violations.includes('MISSING_ORANGE_CART_CTA');

    if (hasCriticalViolation || hasCtaViolation) {
        return {
            accepted: false,
            acceptanceReason: 'REJECTED_NEW_VIOLATION',
            finalText: previousText,
            diagnostic: {
                scene,
                authorized: true,
                previousCharacterCount: prevVal.characterCount,
                candidateCharacterCount: candidateVal.characterCount,
                candidateValid: false,
                candidateViolations: candidateVal.violations,
                accepted: false,
                acceptanceReason: 'REJECTED_NEW_VIOLATION'
            }
        };
    }

    // 3. Case: Evaluate length progression toward [160, 175]
    const getDistanceToRange = (len: number) => {
        if (len < CLEAN_D_MIN_CHARS) return CLEAN_D_MIN_CHARS - len;
        if (len > CLEAN_D_MAX_CHARS) return len - CLEAN_D_MAX_CHARS;
        return 0;
    };

    const prevDist = getDistanceToRange(prevVal.characterCount);
    const candDist = getDistanceToRange(candidateVal.characterCount);

    if (candDist < prevDist) {
        // Candidate moved closer to the valid range without introducing prohibited violations
        return {
            accepted: true,
            acceptanceReason: 'PROGRESS_TOWARD_RANGE',
            finalText: trimmedCandidate,
            diagnostic: {
                scene,
                authorized: true,
                previousCharacterCount: prevVal.characterCount,
                candidateCharacterCount: candidateVal.characterCount,
                candidateValid: false,
                candidateViolations: candidateVal.violations,
                accepted: true,
                acceptanceReason: 'PROGRESS_TOWARD_RANGE'
            }
        };
    }

    if (candDist === prevDist) {
        return {
            accepted: false,
            acceptanceReason: 'REJECTED_NO_PROGRESS',
            finalText: previousText,
            diagnostic: {
                scene,
                authorized: true,
                previousCharacterCount: prevVal.characterCount,
                candidateCharacterCount: candidateVal.characterCount,
                candidateValid: false,
                candidateViolations: candidateVal.violations,
                accepted: false,
                acceptanceReason: 'REJECTED_NO_PROGRESS'
            }
        };
    }

    // candDist > prevDist (regression)
    return {
        accepted: false,
        acceptanceReason: 'REJECTED_REGRESSION',
        finalText: previousText,
        diagnostic: {
            scene,
            authorized: true,
            previousCharacterCount: prevVal.characterCount,
            candidateCharacterCount: candidateVal.characterCount,
            candidateValid: false,
            candidateViolations: candidateVal.violations,
            accepted: false,
            acceptanceReason: 'REJECTED_REGRESSION'
        }
    };
}

/**
 * Deterministically merges revised scenes into previous variations.
 * ENFORCES CODE-LEVEL BYTE-FOR-BYTE ISOLATION & CANDIDATE VALIDATION:
 * - If reviseScene2 is false: previous.scene2 is preserved EXACTLY, ignoring any reviewer output for scene2.
 * - If reviseScene3 is false: previous.scene3 is preserved EXACTLY, ignoring any reviewer output for scene3.
 * - If authorized, candidate is evaluated deterministically before acceptance.
 */
export function mergeRevisionsSafely(
    previousVariations: CleanCopyVariation[],
    parsedReviewer: any,
    permissionsMap: Map<number, { reviseScene2: boolean; reviseScene3: boolean }>,
    roundNumber: number = 1,
    evidence: CommercialEvidence = DEFAULT_COMMERCIAL_EVIDENCE
): { mergedVariations: CleanCopyVariation[]; diagnostics: VariationMergeDiagnostic[] } {
    const diagnostics: VariationMergeDiagnostic[] = [];

    const mergedVariations = previousVariations.map(prev => {
        const perms = permissionsMap.get(prev.id) || { reviseScene2: false, reviseScene3: false };

        const candidate2 = perms.reviseScene2 
            ? extractReviewerSceneText(parsedReviewer, prev.id, 'scene2') 
            : null;
        const eval2 = evaluateCandidateScene(prev.id, 'scene2', prev.scene2, candidate2, perms.reviseScene2, roundNumber, evidence);

        const candidate3 = perms.reviseScene3 
            ? extractReviewerSceneText(parsedReviewer, prev.id, 'scene3') 
            : null;
        const eval3 = evaluateCandidateScene(prev.id, 'scene3', prev.scene3, candidate3, perms.reviseScene3, roundNumber, evidence);

        diagnostics.push({
            variationId: prev.id,
            revisionRound: roundNumber,
            reviseScene2: perms.reviseScene2,
            reviseScene3: perms.reviseScene3,
            scene2AcceptedFromReviewer: eval2.accepted,
            scene3AcceptedFromReviewer: eval3.accepted,
            scene2Diagnostic: eval2.diagnostic,
            scene3Diagnostic: eval3.diagnostic
        });

        return {
            id: prev.id,
            scene2: eval2.finalText,
            scene3: eval3.finalText
        };
    });

    return { mergedVariations, diagnostics };
}

/**
 * Strict Field Lock Invariant Assertion:
 * Verifies that in single-scene manual repair, ONLY the explicitly authorized target field
 * was mutated and that all other 11 scene strings across all 6 variations remain strictly identical.
 */
export function assertUnauthorizedScenesPreserved(
    before: CleanCopyVariation[],
    after: CleanCopyVariation[],
    authorizedTarget: { versionId: number; scene: 'scene2' | 'scene3' }
): { valid: boolean; violationDetail?: string } {
    if (before.length !== after.length) {
        return { valid: false, violationDetail: `Variation count mismatch: before=${before.length}, after=${after.length}` };
    }
    for (let i = 0; i < before.length; i++) {
        const b = before[i];
        const a = after.find(v => v.id === b.id);
        if (!a) {
            return { valid: false, violationDetail: `Variation ID ${b.id} missing in after state` };
        }
        if (b.id !== authorizedTarget.versionId) {
            if (a.scene2 !== b.scene2) {
                return { valid: false, violationDetail: `Unauthorized mutation in V${b.id}.scene2 (expected "${b.scene2}", got "${a.scene2}")` };
            }
            if (a.scene3 !== b.scene3) {
                return { valid: false, violationDetail: `Unauthorized mutation in V${b.id}.scene3 (expected "${b.scene3}", got "${a.scene3}")` };
            }
        } else {
            if (authorizedTarget.scene === 'scene2' && a.scene3 !== b.scene3) {
                return { valid: false, violationDetail: `Unauthorized mutation in V${b.id}.scene3 during scene2 repair (expected "${b.scene3}", got "${a.scene3}")` };
            }
            if (authorizedTarget.scene === 'scene3' && a.scene2 !== b.scene2) {
                return { valid: false, violationDetail: `Unauthorized mutation in V${b.id}.scene2 during scene3 repair (expected "${b.scene2}", got "${a.scene2}")` };
            }
        }
    }
    return { valid: true };
}

/**
 * Targeted Manual Single-Scene Repair for Clean D:
 * Authorizes solely the specified failing scene (e.g. V4.scene3) for revision.
 * Passes through the deterministic pipeline (evaluateCandidateScene, mergeRevisionsSafely,
 * assertUnauthorizedScenesPreserved, validateCleanCopyResult) to ensure 100% byte-for-byte
 * preservation of all other 11 valid scenes.
 */
export async function repairSingleInvalidScene(
    input: SingleSceneRepairInput
): Promise<SingleSceneRepairResult> {
    const startTime = Date.now();
    const {
        versionId,
        scene,
        currentVariations,
        validationResult,
        commercialEvidence = DEFAULT_COMMERCIAL_EVIDENCE,
        originalContextText = "Foto do produto anexa. Execute a criação das 6 versões conforme as instruções.",
        reviewerGroundingMode = 'text_only',
        productImageBase64,
        imageMimeType = 'image/jpeg'
    } = input;

    const targetVariation = currentVariations.find(v => v.id === versionId);
    if (!targetVariation) {
        return {
            ok: false,
            mergedVariations: currentVariations,
            validationResult,
            repairDiagnostic: {
                versionId,
                scene,
                previousText: '',
                candidateText: null,
                previousCharacterCount: 0,
                candidateCharacterCount: 0,
                violationsBefore: ['VARIATION_NOT_FOUND'],
                violationsAfter: ['VARIATION_NOT_FOUND'],
                accepted: false,
                acceptanceReason: 'REJECTED_UNAUTHORIZED_FIELD',
                executionTimeMs: 0,
                requestId: `req_repair_err_${Date.now()}`
            },
            errorMessage: `Variação ${versionId} não encontrada.`
        };
    }

    const targetSceneVal = validationResult.sceneValidations.find(
        s => s.versionId === versionId && s.scene === scene
    );
    const previousText = scene === 'scene2' ? targetVariation.scene2 : targetVariation.scene3;
    const violationsBefore = targetSceneVal ? targetSceneVal.violations : [];

    // 1. Build permissions: ONLY target versionId and scene is authorized
    const permissionsMap = new Map<number, { reviseScene2: boolean; reviseScene3: boolean }>();
    currentVariations.forEach(v => {
        permissionsMap.set(v.id, {
            reviseScene2: v.id === versionId && scene === 'scene2',
            reviseScene3: v.id === versionId && scene === 'scene3'
        });
    });

    // 2. Build targeted single revision item
    const mockSceneValidation: SceneValidation = targetSceneVal || {
        versionId,
        scene,
        text: previousText,
        characterCount: previousText.length,
        charactersValid: false,
        priceViolation: false,
        installmentViolation: false,
        discountViolation: false,
        stockViolation: false,
        unsupportedCommercialClaim: false,
        missingOrangeCartCTA: scene === 'scene3' && !previousText.toLowerCase().includes('carrinho laranja'),
        visualDescriptionViolation: false,
        scene1Violation: false,
        violations: ['MANUAL_REPAIR_REQUESTED'],
        valid: false
    };

    const repairItem = buildRevisionItem(mockSceneValidation, CLEAN_D_MIN_CHARS, CLEAN_D_MAX_CHARS, 168);
    const textPayload = buildReviewerTextPayload(
        [repairItem],
        originalContextText,
        commercialEvidence,
        reviewerGroundingMode,
        3 // Manual repair round indicator
    );

    const parts: any[] = [];
    if (reviewerGroundingMode === 'multimodal' && productImageBase64) {
        const cleanBase64 = productImageBase64.includes(',')
            ? productImageBase64.split(',')[1]
            : productImageBase64;
        if (cleanBase64) {
            parts.push({
                inlineData: {
                    mimeType: imageMimeType || 'image/jpeg',
                    data: cleanBase64
                }
            });
        }
    }
    parts.push({ text: textPayload });

    const payload = {
        model: GEMINI_MODEL,
        systemInstruction: {
            parts: [{ text: CLEAN_D_REVISOR_INSTRUCTION }]
        },
        contents: [
            {
                role: 'user',
                parts
            }
        ],
        generationConfig: {
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 2500,
            responseMimeType: "application/json",
            responseSchema: AGENTE_DE_COPY_CLEAN_REVISION_SCHEMA
        }
    };

    try {
        const response = await postToWorker('/api/gemini/generate', payload, {
            moduleName: `AgenteDeCopyClean_D_ManualRepair_V${versionId}_${scene}`,
            timeoutMs: 120000
        });

        const candidate = response?.candidates?.[0];
        const textParts = (candidate?.content?.parts || []).filter((p: any) => typeof p.text === 'string' && !p.thought);
        let rawText = textParts.map((p: any) => p.text).join("");
        if (!rawText && response?.raw_text) rawText = response.raw_text;

        let parsed: any = null;
        if (response?.data && typeof response.data === 'object') {
            parsed = response.data;
        } else {
            const { data } = parseJsonSafely(rawText);
            parsed = data;
        }

        // Merge revisions safely with evaluateCandidateScene
        const { mergedVariations, diagnostics } = mergeRevisionsSafely(
            currentVariations,
            parsed,
            permissionsMap,
            3,
            commercialEvidence
        );

        // Strict field lock assertion: verify no unauthorized scene was altered
        const assertion = assertUnauthorizedScenesPreserved(currentVariations, mergedVariations, { versionId, scene });
        if (!assertion.valid) {
            console.error(`[Manual Repair Strict Field Lock Failure]`, assertion.violationDetail);
            return {
                ok: false,
                mergedVariations: currentVariations,
                validationResult,
                repairDiagnostic: {
                    versionId,
                    scene,
                    previousText,
                    candidateText: null,
                    previousCharacterCount: previousText.length,
                    candidateCharacterCount: 0,
                    violationsBefore,
                    violationsAfter: violationsBefore,
                    accepted: false,
                    acceptanceReason: 'REJECTED_UNAUTHORIZED_FIELD',
                    executionTimeMs: Date.now() - startTime,
                    requestId: response?.request_id || `req_repair_${Date.now()}`,
                    outputTokenCount: response?.outputTokenCount ?? null
                },
                errorMessage: `Violação de isolamento estrito: ${assertion.violationDetail}`
            };
        }

        // Revalidate merged variations deterministically
        const newValidationResult = validateCleanCopyResult(
            mergedVariations,
            JSON.stringify({ variations: mergedVariations }, null, 2),
            'D',
            commercialEvidence
        );

        const newSceneVal = newValidationResult.sceneValidations.find(
            s => s.versionId === versionId && s.scene === scene
        );

        const varDiag = diagnostics.find(d => d.variationId === versionId);
        const sceneDiag = scene === 'scene2' ? varDiag?.scene2Diagnostic : varDiag?.scene3Diagnostic;
        const candidateText = extractReviewerSceneText(parsed, versionId, scene);

        const isAccepted = sceneDiag?.accepted ?? false;
        const repairDiag: SingleSceneRepairDiagnostic = {
            versionId,
            scene,
            previousText,
            candidateText,
            previousCharacterCount: previousText.length,
            candidateCharacterCount: candidateText ? candidateText.length : 0,
            violationsBefore,
            violationsAfter: newSceneVal ? newSceneVal.violations : [],
            accepted: isAccepted,
            acceptanceReason: sceneDiag?.acceptanceReason || (newSceneVal?.valid ? 'VALID_CANDIDATE' : 'REJECTED_NO_PROGRESS'),
            executionTimeMs: Date.now() - startTime,
            requestId: response?.request_id || `req_repair_${Date.now()}`,
            outputTokenCount: response?.outputTokenCount ?? null
        };

        return {
            ok: isAccepted,
            mergedVariations,
            validationResult: newValidationResult,
            repairDiagnostic: repairDiag,
            errorMessage: isAccepted ? null : `Candidato rejeitado pelo avaliador determinístico (${repairDiag.acceptanceReason}). Texto anterior preservado.`
        };
    } catch (err: any) {
        console.error(`[Manual Repair Gemini Error]`, err);
        return {
            ok: false,
            mergedVariations: currentVariations,
            validationResult,
            repairDiagnostic: {
                versionId,
                scene,
                previousText,
                candidateText: null,
                previousCharacterCount: previousText.length,
                candidateCharacterCount: 0,
                violationsBefore,
                violationsAfter: violationsBefore,
                accepted: false,
                acceptanceReason: 'REJECTED_EMPTY_CANDIDATE',
                executionTimeMs: Date.now() - startTime,
                requestId: `req_repair_err_${Date.now()}`
            },
            errorMessage: err.message || 'Erro inesperado na chamada de reparo manual ao Gemini.'
        };
    }
}

/**
 * Executes Agente de Copy Clean (variants A, B, C, and D).
 */
export async function executeAgenteDeCopyClean(
    productImageBase64: string,
    imageMimeType: string = 'image/jpeg',
    variant: CleanVariantType = 'D',
    userContextText?: string,
    customEvidence?: Partial<CommercialEvidence>,
    brainVariant: CleanDBrainVariant = 'CURRENT',
    reviewerGroundingMode: CleanDReviewerGroundingMode = 'text_only'
): Promise<AgenteDeCopyCleanResult> {
    const startTime = Date.now();
    const brainText = getCleanBrainByVariant(variant, brainVariant);
    
    // Choose context text: if user provided custom text, use it; otherwise use appropriate default
    const effectiveContextText = userContextText !== undefined
        ? userContextText
        : (variant === 'D' && brainVariant === 'CORE_SHORT'
            ? CLEAN_D_CORE_SHORT_USER_TASK
            : "Foto do produto anexa. Execute a criação das 6 versões conforme as instruções.");

    const commercialEvidence = extractCommercialEvidence(effectiveContextText, customEvidence);
    const cleanBrief = buildCleanProductBrief(effectiveContextText, commercialEvidence);
    const initialPromptText = buildCleanDInitialPrompt(cleanBrief, variant, brainVariant);

    // 1. Clean base64 image data and prepare original source
    const cleanBase64 = productImageBase64.includes(',')
        ? productImageBase64.split(',')[1]
        : productImageBase64;

    const originalContextText = effectiveContextText;
    const originalImagePart = cleanBase64 ? {
        inlineData: {
            mimeType: imageMimeType || 'image/jpeg',
            data: cleanBase64
        }
    } : null;

    const initialParts: any[] = [];
    if (originalImagePart) {
        initialParts.push(originalImagePart);
    }
    initialParts.push({
        text: initialPromptText
    });

    // 2. Initial Generation Payload (identical for C and D)
    const initialPayload = {
        model: GEMINI_MODEL,
        systemInstruction: {
            parts: [{ text: brainText }]
        },
        contents: [
            {
                role: 'user',
                parts: initialParts
            }
        ],
        generationConfig: {
            temperature: 0.65,
            topP: 0.9,
            maxOutputTokens: 3000,
            responseMimeType: "application/json",
            responseSchema: AGENTE_DE_COPY_CLEAN_SCHEMA
        }
    };

    // 3. Initial Call to Gemini
    const initialStartTime = Date.now();
    const initialResponse = await postToWorker('/api/gemini/generate', initialPayload, {
        moduleName: `AgenteDeCopyClean_${variant}_${brainVariant}_Initial`,
        timeoutMs: 120000
    });
    const initialExecutionTimeMs = Date.now() - initialStartTime;

    const initialCandidate = initialResponse?.candidates?.[0];
    const initialCandidateParts = initialCandidate?.content?.parts || [];
    const textParts = initialCandidateParts.filter((p: any) => typeof p.text === 'string' && !p.thought);

    let initialRawText = textParts.map((p: any) => p.text).join("");
    if (!initialRawText && initialResponse?.raw_text) {
        initialRawText = initialResponse.raw_text;
    }
    const initialFinishReason = initialCandidate?.finishReason || initialResponse?.finishReason || (initialResponse?.ok ? 'STOP' : 'ERROR');

    // Prioritize initialResponse.data when it already contains a valid structure
    let parsedInitial: any = null;
    let initialJsonParseStatus: 'SUCCESS' | 'REPAIRED' | 'FAILED' = 'FAILED';

    if (initialResponse?.data && typeof initialResponse.data === 'object') {
        parsedInitial = initialResponse.data;
        initialJsonParseStatus = 'SUCCESS';
        if (!initialRawText) {
            initialRawText = typeof initialResponse.raw_text === 'string' ? initialResponse.raw_text : JSON.stringify(initialResponse.data, null, 2);
        }
    } else {
        const parseResult = parseJsonSafely(initialRawText);
        parsedInitial = parseResult.data;
        initialJsonParseStatus = parseResult.status;
    }

    // Extract initial variations safely
    const initialParsedResult = parseCleanVariationsSafely(initialResponse?.data || initialRawText);
    let currentVariations: CleanCopyVariation[] = initialParsedResult.variations;
    initialJsonParseStatus = initialParsedResult.status;

    // For Clean D: Ensure we have exactly 6 variations (IDs 1 to 6)
    let complementExecuted = false;
    let complementCallTimeMs = 0;
    if (variant === 'D') {
        const requiredIds = [1, 2, 3, 4, 5, 6];
        const presentIdMap = new Map<number, CleanCopyVariation>();
        for (const v of currentVariations) {
            if (requiredIds.includes(v.id) && !presentIdMap.has(v.id)) {
                presentIdMap.set(v.id, v);
            }
        }

        const missingIds = requiredIds.filter(id => !presentIdMap.has(id));
        if (missingIds.length > 0) {
            // Attempt complement call requesting strictly the missing IDs
            complementExecuted = true;
            const compStart = Date.now();
            try {
                const complementPrompt = buildCleanDComplementPrompt(cleanBrief, missingIds);

                const compParts: any[] = [];
                if (originalImagePart) {
                    compParts.push(originalImagePart);
                }
                compParts.push({ text: complementPrompt });

                const compPayload = {
                    model: GEMINI_MODEL,
                    systemInstruction: { parts: [{ text: AGENTE_DE_COPY_CLEAN_D_BRAIN }] },
                    contents: [{ role: 'user', parts: compParts }],
                    generationConfig: {
                        temperature: 0.65,
                        topP: 0.9,
                        maxOutputTokens: 2000,
                        responseMimeType: "application/json",
                        responseSchema: AGENTE_DE_COPY_CLEAN_SCHEMA
                    }
                };

                const compResponse = await postToWorker('/api/gemini/generate', compPayload, {
                    moduleName: `AgenteDeCopyClean_D_Complement_Missing`,
                    timeoutMs: 90000
                });

                if (compResponse?.ok !== false) {
                    const compRawText = compResponse?.data
                        ? (typeof compResponse.data === 'string' ? compResponse.data : JSON.stringify(compResponse.data))
                        : (compResponse?.raw_text || compResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '');

                    const compParsedResult = parseCleanVariationsSafely(compResponse?.data || compRawText);
                    for (const item of compParsedResult.variations) {
                        if (missingIds.includes(item.id) && !presentIdMap.has(item.id)) {
                            presentIdMap.set(item.id, item);
                        }
                    }
                }
            } catch (compErr) {
                console.warn('[AgenteDeCopyClean] Complement call failed:', compErr);
            }
            complementCallTimeMs = Date.now() - compStart;

            // Fill any remaining missing IDs with empty placeholders to guarantee exactly 6 variations
            for (const mid of missingIds) {
                if (!presentIdMap.has(mid)) {
                    presentIdMap.set(mid, { id: mid, scene2: '', scene3: '' });
                }
            }

            currentVariations = requiredIds.map(id => presentIdMap.get(id)!);
        }
    }

    // Run initial deterministic validation
    let validationResult = validateCleanCopyResult(currentVariations, initialRawText, variant, commercialEvidence);
    const initialMetrics = computeInitialGenerationMetrics(validationResult.sceneValidations);

    // For Clean A, B, and C: return immediately without revisions
    if (variant !== 'D') {
        const executionTimeMs = Date.now() - startTime;
        const diagnostics = {
            httpStatus: initialResponse?.status || 200,
            requestId: initialResponse?.request_id || `req_clean_${Date.now()}`,
            requestedModel: GEMINI_MODEL,
            executedModel: initialResponse?.executed_model || GEMINI_MODEL,
            finishReason: initialFinishReason,
            outputTokenCount: initialResponse?.outputTokenCount ?? initialResponse?.usageMetadata?.candidatesTokenCount ?? null,
            candidatePartsCount: initialCandidateParts.length,
            textPartsCount: textParts.length,
            rawLength: initialRawText.length,
            jsonParseStatus: initialJsonParseStatus,
            brainDelivery: 'systemInstruction' as const,
            brainOccurrences: 1,
            executionTimeMs,
            proxyPath: initialResponse?.proxy_path || 'cloudflare_worker',
            brainVariant,
            initialMetrics
        };

        return {
            ok: initialResponse?.ok !== false && currentVariations.length > 0,
            variant,
            brainVariant,
            reviewerGroundingMode,
            variations: currentVariations,
            variationsRecoveredCount: currentVariations.length,
            rawText: initialRawText,
            rawLength: initialRawText.length,
            finishReason: initialFinishReason,
            diagnostics,
            validation: validationResult,
            commercialEvidence,
            errorMessage: initialResponse?.errorMessage || (currentVariations.length === 0 ? "Nenhuma variação válida foi extraída do JSON." : null)
        };
    }

    // ==========================================
    // CLEAN D: Selective Revision Pipeline (Max 2 rounds)
    // ==========================================
    let totalGeminiCalls = 1;
    let round1Diag: RevisionRoundDiagnostics | undefined;
    let valAfterRev1: { validScenesCount: number; invalidScenesCount: number; scenes: typeof validationResult.sceneValidations } | undefined;
    let round2Diag: RevisionRoundDiagnostics | undefined;
    let valAfterRev2: { validScenesCount: number; invalidScenesCount: number; scenes: typeof validationResult.sceneValidations } | undefined;

    const initialInvalidScenes = validationResult.sceneValidations.filter(s => !s.valid);

    // Initial trace structure
    const trace: CleanDExecutionTrace = {
        brainVariant,
        reviewerGroundingMode,
        initial: {
            requestId: initialResponse?.request_id || `req_init_${Date.now()}`,
            finishReason: initialFinishReason,
            rawText: initialRawText,
            rawLength: initialRawText.length,
            executionTimeMs: initialExecutionTimeMs,
            outputTokenCount: initialResponse?.outputTokenCount ?? initialResponse?.usageMetadata?.candidatesTokenCount ?? null,
            validScenesCount: validationResult.sceneValidations.filter(s => s.valid).length,
            invalidScenesCount: initialInvalidScenes.length,
            scenes: [...validationResult.sceneValidations],
            initialMetrics,
            imageIncluded: Boolean(originalImagePart)
        },
        totalGeminiCalls: 1,
        finalHomologationStatus: validationResult.homologationStatus
    };

    // Revision Round 1 (if invalid scenes exist)
    if (initialInvalidScenes.length > 0) {
        // Deterministically compute field-specific revision permissions for Round 1
        const round1Permissions = computeRevisionPermissions(currentVariations, initialInvalidScenes);
        const round1Items: RevisionItemInput[] = initialInvalidScenes.map(s => buildRevisionItem(s, CLEAN_D_MIN_CHARS, CLEAN_D_MAX_CHARS, 168));

        const round1TextPayload = buildReviewerTextPayload(
            round1Items,
            originalContextText,
            commercialEvidence,
            reviewerGroundingMode,
            1
        );

        const round1Parts: any[] = [];
        const includeImageInR1 = reviewerGroundingMode === 'multimodal' && Boolean(originalImagePart);
        if (includeImageInR1 && originalImagePart) {
            round1Parts.push(originalImagePart);
        }
        round1Parts.push({
            text: round1TextPayload
        });

        const round1Payload = {
            model: GEMINI_MODEL,
            systemInstruction: {
                parts: [{ text: CLEAN_D_REVISOR_INSTRUCTION }]
            },
            contents: [
                {
                    role: 'user',
                    parts: round1Parts
                }
            ],
            generationConfig: {
                temperature: 0.65,
                topP: 0.9,
                maxOutputTokens: 2500,
                responseMimeType: "application/json",
                responseSchema: AGENTE_DE_COPY_CLEAN_REVISION_SCHEMA
            }
        };

        const r1StartTime = Date.now();
        const r1Response = await postToWorker('/api/gemini/generate', round1Payload, {
            moduleName: `AgenteDeCopyClean_D_${reviewerGroundingMode}_Revision1`,
            timeoutMs: 120000
        });
        const r1ExecTime = Date.now() - r1StartTime;
        totalGeminiCalls++;

        const r1Candidate = r1Response?.candidates?.[0];
        const r1TextParts = (r1Candidate?.content?.parts || []).filter((p: any) => typeof p.text === 'string' && !p.thought);
        let r1RawText = r1TextParts.map((p: any) => p.text).join("");
        if (!r1RawText && r1Response?.raw_text) r1RawText = r1Response.raw_text;

        let parsedR1: any = null;
        if (r1Response?.data && typeof r1Response.data === 'object') {
            parsedR1 = r1Response.data;
            if (!r1RawText) {
                r1RawText = typeof r1Response.raw_text === 'string' ? r1Response.raw_text : JSON.stringify(r1Response.data, null, 2);
            }
        } else {
            const { data } = parseJsonSafely(r1RawText);
            parsedR1 = data;
        }

        // Merge revisions safely with deterministic field-level permissions (byte-for-byte preservation of unrevised scenes)
        const { mergedVariations: r1Merged, diagnostics: r1MergeDiagnostics } = mergeRevisionsSafely(
            currentVariations,
            parsedR1,
            round1Permissions,
            1,
            commercialEvidence
        );
        currentVariations = r1Merged;

        // Re-validate after round 1 on current active state
        validationResult = validateCleanCopyResult(currentVariations, JSON.stringify({ variations: currentVariations }, null, 2), variant, commercialEvidence);

        round1Diag = {
            roundNumber: 1,
            executed: true,
            reviewerGroundingMode,
            imageIncludedInReviewerPayload: includeImageInR1,
            factualContextIncluded: true,
            commercialEvidenceIncluded: true,
            revisionItemsCount: round1Items.length,
            scenesSentCount: round1Items.length,
            sentItems: round1Items,
            requestId: r1Response?.request_id || `req_rev1_${Date.now()}`,
            finishReason: r1Candidate?.finishReason || r1Response?.finishReason || 'STOP',
            rawText: r1RawText,
            rawLength: r1RawText.length,
            executionTimeMs: r1ExecTime,
            outputTokenCount: r1Response?.outputTokenCount ?? r1Response?.usageMetadata?.candidatesTokenCount ?? null,
            mergeDiagnostics: r1MergeDiagnostics
        };

        valAfterRev1 = {
            validScenesCount: validationResult.sceneValidations.filter(s => s.valid).length,
            invalidScenesCount: validationResult.sceneValidations.filter(s => !s.valid).length,
            scenes: [...validationResult.sceneValidations]
        };

        // Revision Round 2 (recalculate permissions from the fresh post-round-1 validation state)
        const round1RemainingInvalid = validationResult.sceneValidations.filter(s => !s.valid);

        if (round1RemainingInvalid.length > 0) {
            // Recalculate independent Round 2 permissions
            const round2Permissions = computeRevisionPermissions(currentVariations, round1RemainingInvalid);
            const round2Items: RevisionItemInput[] = round1RemainingInvalid.map(s => buildRevisionItem(s, CLEAN_D_MIN_CHARS, CLEAN_D_MAX_CHARS, 168));

            const round2TextPayload = buildReviewerTextPayload(
                round2Items,
                originalContextText,
                commercialEvidence,
                reviewerGroundingMode,
                2
            );

            const round2Parts: any[] = [];
            const includeImageInR2 = reviewerGroundingMode === 'multimodal' && Boolean(originalImagePart);
            if (includeImageInR2 && originalImagePart) {
                round2Parts.push(originalImagePart);
            }
            round2Parts.push({
                text: round2TextPayload
            });

            const round2Payload = {
                model: GEMINI_MODEL,
                systemInstruction: {
                    parts: [{ text: CLEAN_D_REVISOR_INSTRUCTION }]
                },
                contents: [
                    {
                        role: 'user',
                        parts: round2Parts
                    }
                ],
                generationConfig: {
                    temperature: 0.65,
                    topP: 0.9,
                    maxOutputTokens: 2500,
                    responseMimeType: "application/json",
                    responseSchema: AGENTE_DE_COPY_CLEAN_REVISION_SCHEMA
                }
            };

            const r2StartTime = Date.now();
            const r2Response = await postToWorker('/api/gemini/generate', round2Payload, {
                moduleName: `AgenteDeCopyClean_D_${reviewerGroundingMode}_Revision2`,
                timeoutMs: 120000
            });
            const r2ExecTime = Date.now() - r2StartTime;
            totalGeminiCalls++;

            const r2Candidate = r2Response?.candidates?.[0];
            const r2TextParts = (r2Candidate?.content?.parts || []).filter((p: any) => typeof p.text === 'string' && !p.thought);
            let r2RawText = r2TextParts.map((p: any) => p.text).join("");
            if (!r2RawText && r2Response?.raw_text) r2RawText = r2Response.raw_text;

            let parsedR2: any = null;
            if (r2Response?.data && typeof r2Response.data === 'object') {
                parsedR2 = r2Response.data;
                if (!r2RawText) {
                    r2RawText = typeof r2Response.raw_text === 'string' ? r2Response.raw_text : JSON.stringify(r2Response.data, null, 2);
                }
            } else {
                const { data } = parseJsonSafely(r2RawText);
                parsedR2 = data;
            }

            // Merge revisions safely with freshly calculated Round 2 permissions
            const { mergedVariations: r2Merged, diagnostics: r2MergeDiagnostics } = mergeRevisionsSafely(
                currentVariations,
                parsedR2,
                round2Permissions,
                2,
                commercialEvidence
            );
            currentVariations = r2Merged;

            // Final validation after round 2 on current active state
            validationResult = validateCleanCopyResult(currentVariations, JSON.stringify({ variations: currentVariations }, null, 2), variant, commercialEvidence);

            round2Diag = {
                roundNumber: 2,
                executed: true,
                reviewerGroundingMode,
                imageIncludedInReviewerPayload: includeImageInR2,
                factualContextIncluded: true,
                commercialEvidenceIncluded: true,
                revisionItemsCount: round2Items.length,
                scenesSentCount: round2Items.length,
                sentItems: round2Items,
                requestId: r2Response?.request_id || `req_rev2_${Date.now()}`,
                finishReason: r2Candidate?.finishReason || r2Response?.finishReason || 'STOP',
                rawText: r2RawText,
                rawLength: r2RawText.length,
                executionTimeMs: r2ExecTime,
                outputTokenCount: r2Response?.outputTokenCount ?? r2Response?.usageMetadata?.candidatesTokenCount ?? null,
                mergeDiagnostics: r2MergeDiagnostics
            };

            valAfterRev2 = {
                validScenesCount: validationResult.sceneValidations.filter(s => s.valid).length,
                invalidScenesCount: validationResult.sceneValidations.filter(s => !s.valid).length,
                scenes: [...validationResult.sceneValidations]
            };
        }
    }

    trace.revision1 = round1Diag;
    trace.validationAfterRev1 = valAfterRev1;
    trace.revision2 = round2Diag;
    trace.validationAfterRev2 = valAfterRev2;
    trace.totalGeminiCalls = totalGeminiCalls;
    trace.finalHomologationStatus = validationResult.homologationStatus;

    const totalExecutionTimeMs = Date.now() - startTime;

    const diagnostics = {
        httpStatus: initialResponse?.status || 200,
        requestId: initialResponse?.request_id || `req_clean_d_${Date.now()}`,
        requestedModel: GEMINI_MODEL,
        executedModel: initialResponse?.executed_model || GEMINI_MODEL,
        finishReason: initialFinishReason,
        outputTokenCount: (initialResponse?.outputTokenCount || 0) + (round1Diag?.outputTokenCount || 0) + (round2Diag?.outputTokenCount || 0) || null,
        candidatePartsCount: initialCandidateParts.length,
        textPartsCount: textParts.length,
        rawLength: initialRawText.length + (round1Diag?.rawLength || 0) + (round2Diag?.rawLength || 0),
        jsonParseStatus: initialJsonParseStatus,
        brainDelivery: 'systemInstruction' as const,
        brainOccurrences: 1,
        executionTimeMs: totalExecutionTimeMs,
        proxyPath: initialResponse?.proxy_path || 'cloudflare_worker',
        brainVariant,
        initialMetrics
    };

    return {
        ok: initialResponse?.ok !== false && currentVariations.length > 0,
        variant: 'D',
        brainVariant,
        reviewerGroundingMode,
        variations: currentVariations,
        variationsRecoveredCount: currentVariations.length,
        rawText: initialRawText,
        rawLength: initialRawText.length,
        finishReason: initialFinishReason,
        diagnostics,
        validation: validationResult,
        commercialEvidence,
        cleanDTrace: trace,
        errorMessage: initialResponse?.errorMessage || (currentVariations.length === 0 ? "Nenhuma variação válida foi extraída do JSON." : null)
    };
}
