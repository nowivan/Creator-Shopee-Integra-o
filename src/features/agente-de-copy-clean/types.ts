export type CleanVariantType = 'A' | 'B' | 'C' | 'D';
export type CleanDBrainVariant = 'CURRENT' | 'CORE_SHORT';
export type CleanDReviewerGroundingMode = 'multimodal' | 'text_only';

export interface CleanCopyVariation {
    id: number;
    scene2: string;
    scene3: string;
}

export interface CleanDCopyContractSceneSpec {
    role: string;
    style: string;
    dna: readonly string[];
    minCharacters: number;
    maxCharacters: number;
    prohibitedPatterns: readonly string[];
    mandatoryElements?: readonly string[];
}

export interface CleanDCopyContractSpec {
    contractName?: string;
    version: 'D.2.1C_FROZEN_V1' | 'D.2.1B_FROZEN';
    language: 'pt-BR';
    role?: string;
    inputScope?: string;
    objective?: string;
    outputType?: 'SPOKEN_VIDEO_COPY_ONLY';
    exactVariationsCount?: 6;
    variationMeaning?: string;
    versionDefinition?: string;
    evidenceTransformationRule?: string;
    scene2: CleanDCopyContractSceneSpec;
    scene3: CleanDCopyContractSceneSpec;
    globalRules?: readonly string[];
}

/**
 * CONCEPTUAL IMMUTABLE CONTRACT: CLEAN_D_SENIOR_COPY_CONTRACT_V1
 * Source of truth for all Clean D model calls (initial generation, missing complement, selective revision R1/R2, manual repair).
 * Strictly decoupled from Creative Director and other production agents.
 */
export const CLEAN_D_SENIOR_COPY_CONTRACT_V1 = Object.freeze({
    contractName: 'CLEAN_D_SENIOR_COPY_CONTRACT_V1',
    version: 'D.2.1C_FROZEN_V1' as const,
    language: 'pt-BR' as const,
    outputType: 'SPOKEN_VIDEO_COPY_ONLY' as const,
    exactVariationsCount: 6 as const,
    variationMeaning: 'Spoken persuasive sentence for video voiceover. NEVER SKU, product variant, color, or catalog label.',
    role: 'Senior copywriting specialist for short-form product video ads.',
    inputScope: 'Analyze only clearly visible or written information in the product image or context. Never invent or assume unconfirmed facts.',
    objective: 'Generate exactly 6 COPY VERSIONS (IDs 1 to 6). Each version contains ONLY SCENE 2 and SCENE 3. Never create Scene 1.',
    versionDefinition: 'A "version" means exclusively a different formulation of SPOKEN COPY for video voiceover. It NEVER means SKU, product variant, color, size, model, kit, quantity option, catalog option, or product configuration (e.g. "Preto", "4 Andares", "Ferrari Black", "Kit com 2 perfumes" are strictly invalid).',
    evidenceTransformationRule: 'CONFIRMED FACT → safe practical interpretation → real benefit → perceived routine result → natural spoken sentence.',
    scene2: Object.freeze({
        role: 'CENA 2 — REAL BENEFIT + DESIRE + PRACTICAL RESULT',
        style: 'Natural Brazilian Portuguese, easy to speak in video, complete persuasive spoken sentence.',
        dna: Object.freeze([
            'Make the viewer imagine how the product can improve their routine',
            'Sell practical result, not just dry characteristics',
            'Use only confirmed or directly evident benefits',
            'Natural Brazilian Portuguese, easy to speak in video',
            'Avoid generic praise ("produto incrível", "perfeito", "maravilhoso", "qualidade excepcional")',
            'No price, no urgency, no CTA, no visual/camera direction, no catalog/SKU wording'
        ]),
        minCharacters: 160,
        maxCharacters: 175,
        prohibitedPatterns: Object.freeze([
            'Standalone catalog/SKU labels (e.g. "4 Andares", "5 Andares", "Preto", "Branco", "Ferrari Black")',
            'Visual descriptions, camera directions, model poses, studio lighting',
            'Prices, monetary values in R$, $, currency symbols, installments or number of installments',
            'Fictitious or ungrounded benefits'
        ])
    }),
    scene3: Object.freeze({
        role: 'CENA 3 — GROUNDED URGENCY + OPPORTUNITY LOSS + DIRECT CTA',
        style: 'Natural Brazilian Portuguese, closing spoken sentence with mandatory carrinho laranja CTA.',
        dna: Object.freeze([
            'Do not state exact price; describe advantageous condition only if supported',
            'If discount/coupon/promotion is confirmed, describe only as supported advantageous condition',
            'If deadline/flash offer is confirmed, may be used with proportional urgency',
            'Never invent stock scarcity, "last chance", "few units left", fake deadlines or discounts',
            'If no deadline confirmed, use safe conditional urgency ("enquanto essa condição ainda estiver disponível", "se ainda estiver aparecendo para você", "antes de deixar para depois e perder a oportunidade")',
            'Mandatory direct action to click literal "carrinho laranja"',
            'Vary CTA wording between versions'
        ]),
        minCharacters: 160,
        maxCharacters: 175,
        mandatoryElements: Object.freeze(['carrinho laranja']),
        prohibitedPatterns: Object.freeze([
            'Standalone catalog/SKU labels (e.g. "Preto", "5 Andares", "Kit com 2 perfumes")',
            'Visual descriptions, camera angles, recording directions',
            'Exact prices, monetary values, installments',
            'Invented scarcity, fake stocks, ungrounded deadlines or ungrounded discounts'
        ])
    }),
    globalRules: Object.freeze([
        'Exactly 6 versions (IDs 1 to 6)',
        'Only Scene 2 and Scene 3 per version',
        '160–175 characters per scene inclusive',
        'No exact price or monetary figures',
        'Do not invent discount, promotion, coupon, deadline, stock, shipping, gift, or benefit',
        'Use common product name',
        'Do not repeat identical phrase structures; avoid repetitive CTA wording',
        'The 6 versions may use the same verified facts with different phrasing/order (no forced 6 unique benefits)',
        'No tables, no intro, no explanations, no character counts in final output, no comments'
    ])
});

/**
 * Frozen Local Clean D Copy Contract alias.
 */
export const CLEAN_D_COPY_CONTRACT: CleanDCopyContractSpec = CLEAN_D_SENIOR_COPY_CONTRACT_V1;

export interface SceneValidation {
    versionId: number;
    scene: 'scene2' | 'scene3';
    text: string;
    characterCount: number;
    charactersValid: boolean;
    priceViolation: boolean;
    installmentViolation: boolean;
    discountViolation: boolean;
    stockViolation: boolean;
    unsupportedCommercialClaim: boolean;
    missingOrangeCartCTA: boolean;
    visualDescriptionViolation: boolean;
    scene1Violation: boolean;
    skuAttributeViolation?: boolean;
    violations: string[];
    valid: boolean;
}

export interface CleanValidationSceneDetail {
    versionNumber: number;
    scene2Length: number;
    scene2Valid: boolean;
    scene3Length: number;
    scene3Valid: boolean;
    hasCarrinhoLaranja: boolean;
    scene2Validation?: SceneValidation;
    scene3Validation?: SceneValidation;
}

export interface CleanValidationResult {
    versionsCount: number; // X/6
    scene2Count: number; // X/6
    scene3Count: number; // X/6
    characterComplianceCount: number; // X/12 within 160-175
    carrinhoLaranjaCount: number; // X/6
    visualDescriptionDetected: boolean;
    visualDescriptionViolationsCount: number;
    skuAttributeDetected?: boolean;
    skuAttributeViolationsCount?: number;
    scene1Detected: boolean;
    explicitPrice: boolean;
    installmentViolationDetected: boolean;
    discountClaim: boolean;
    inventedStock: boolean;
    inventedDeadline: boolean;
    unsupportedClaimsDetected: boolean;
    preambleDetected: boolean;
    sceneDetails: CleanValidationSceneDetail[];
    sceneValidations: SceneValidation[];
    uniqueIds1to6: boolean;
    allScenesValid: boolean;
    homologationStatus: 'PASS' | 'PARTIAL';
}

export interface CleanDiagnostics {
    httpStatus: number | string;
    requestId: string;
    requestedModel: string;
    executedModel: string;
    finishReason: string;
    outputTokenCount: number | null;
    candidatePartsCount: number;
    textPartsCount: number;
    rawLength: number;
    jsonParseStatus: 'SUCCESS' | 'REPAIRED' | 'FAILED';
    brainDelivery: 'systemInstruction';
    brainOccurrences: number; // 1
    executionTimeMs: number;
    proxyPath: string;
    brainVariant?: CleanDBrainVariant;
    initialMetrics?: InitialGenerationMetrics;
}

export interface InitialGenerationMetrics {
    initialValidScenes: number; // X/12
    scene2Valid: number; // X/6
    scene3Valid: number; // X/6
    charsValid: number; // X/12
    orangeCartValid: number; // X/6
    violations: {
        PRICE: number;
        INSTALLMENT: number;
        DISCOUNT: number;
        STOCK: number;
        VISUAL_DESCRIPTION_DETECTED: number;
        SKU_ATTRIBUTE_AS_COPY?: number;
        CHARACTERS_BELOW_MIN: number;
        CHARACTERS_ABOVE_MAX: number;
        MISSING_ORANGE_CART_CTA: number;
        [key: string]: number | undefined;
    };
}

export interface RevisionItemInput {
    versionId: number;
    scene: 'scene2' | 'scene3';
    tipo?: string;
    tamanhoAtual?: number;
    faixaObrigatoria?: string;
    currentCharacterCount: number;
    violations: string[];
    acao?: string;
    text: string;
}

export type AcceptanceReason =
    | 'VALID_CANDIDATE'
    | 'PROGRESS_TOWARD_RANGE'
    | 'REJECTED_NO_PROGRESS'
    | 'REJECTED_REGRESSION'
    | 'REJECTED_NEW_VIOLATION'
    | 'REJECTED_UNAUTHORIZED_FIELD'
    | 'REJECTED_EMPTY_CANDIDATE';

export type CommercialEvidenceLevel = 0 | 1 | 2 | 3;

export interface CleanProductBriefCommercialSignals {
    hasPrice: boolean;
    priceText?: string;
    hasDiscount: boolean;
    discountText?: string;
    hasUrgencyOrDeadline: boolean;
    deadlineText?: string;
    hasStockLimit: boolean;
    stockText?: string;
    hasFreeShipping: boolean;
    hasGuarantee: boolean;
    hasTikTokShop: boolean;
    hasSocialProof: boolean;
}

export type ProductInfoAuthoritySource =
    | 'title'
    | 'description'
    | 'user_facts'
    | 'image_components'
    | 'generic_fallback';

export interface ProductInfoAuthorityInput {
    title?: string | null;
    description?: string | null;
    userFacts?: string[] | null;
    imageComponents?: string[] | null;
    imageContextText?: string | null;
}

export interface ProductInfoAuthorityResult {
    primaryProductName: string;
    productType: string;
    selectedAuthoritySource: ProductInfoAuthoritySource;
    isBundleAuthorized: boolean;
    authorizedBundleTerms: string[];
    visibleComponents: string[];
    neutralDescription: string;
    videoRelevantFacts: string[];
    compressedContext: string;
}

export interface CleanDVideoFactSelection {
    primaryProductName: string;
    videoRelevantFacts: string[];
    ignoredMetadata: string[];
    safeClaimWarnings: string[];
    compressedContext: string;
    authorityResult?: ProductInfoAuthorityResult;
}

export interface CleanProductBrief {
    productName: string;
    category?: string;
    confirmedFeatures: string[];
    confirmedBenefits: string[];
    commercialSignals: CleanProductBriefCommercialSignals;
    evidenceLevel: CommercialEvidenceLevel;
    forbiddenSkuTerms: string[];
    rawContext: string;
    videoFactSelection?: CleanDVideoFactSelection;
}

export interface CommercialEvidence {
    level: CommercialEvidenceLevel;
    hasVisiblePrice: boolean;
    hasExplicitDiscount: boolean;
    hasExplicitCoupon: boolean;
    hasExplicitOffer: boolean;
    hasExplicitDeadline: boolean;
    hasExplicitStockLimit: boolean;
    hasExplicitShipping?: boolean;
    hasExplicitGuarantee?: boolean;
}

export const DEFAULT_COMMERCIAL_EVIDENCE: CommercialEvidence = {
    level: 0,
    hasVisiblePrice: false,
    hasExplicitDiscount: false,
    hasExplicitCoupon: false,
    hasExplicitOffer: false,
    hasExplicitDeadline: false,
    hasExplicitStockLimit: false,
    hasExplicitShipping: false,
    hasExplicitGuarantee: false
};

export interface SceneMergeDiagnostic {
    scene: 'scene2' | 'scene3';
    authorized: boolean;
    previousCharacterCount: number;
    candidateCharacterCount?: number;
    candidateValid?: boolean;
    candidateViolations?: string[];
    accepted: boolean;
    acceptanceReason: AcceptanceReason;
}

export interface VariationMergeDiagnostic {
    variationId: number;
    revisionRound: number;
    reviseScene2: boolean;
    reviseScene3: boolean;
    scene2AcceptedFromReviewer: boolean;
    scene3AcceptedFromReviewer: boolean;
    scene2Diagnostic?: SceneMergeDiagnostic;
    scene3Diagnostic?: SceneMergeDiagnostic;
}

export interface RevisionRoundDiagnostics {
    roundNumber: number;
    executed: boolean;
    reviewerGroundingMode?: CleanDReviewerGroundingMode;
    imageIncludedInReviewerPayload?: boolean;
    factualContextIncluded?: boolean;
    commercialEvidenceIncluded?: boolean;
    revisionItemsCount?: number;
    scenesSentCount: number;
    sentItems: RevisionItemInput[];
    requestId: string;
    finishReason: string;
    rawText: string;
    rawLength: number;
    executionTimeMs: number;
    outputTokenCount: number | null;
    mergeDiagnostics?: VariationMergeDiagnostic[];
}

export interface CleanDExecutionTrace {
    brainVariant?: CleanDBrainVariant;
    reviewerGroundingMode?: CleanDReviewerGroundingMode;
    initial: {
        requestId: string;
        finishReason: string;
        rawText: string;
        rawLength: number;
        executionTimeMs: number;
        outputTokenCount: number | null;
        validScenesCount: number;
        invalidScenesCount: number;
        scenes: SceneValidation[];
        initialMetrics?: InitialGenerationMetrics;
        imageIncluded?: boolean;
    };
    revision1?: RevisionRoundDiagnostics;
    validationAfterRev1?: {
        validScenesCount: number;
        invalidScenesCount: number;
        scenes: SceneValidation[];
    };
    revision2?: RevisionRoundDiagnostics;
    validationAfterRev2?: {
        validScenesCount: number;
        invalidScenesCount: number;
        scenes: SceneValidation[];
    };
    totalGeminiCalls: number;
    finalHomologationStatus: 'PASS' | 'PARTIAL';
    manualRepairs?: SingleSceneRepairDiagnostic[];
}

export interface SingleSceneRepairDiagnostic {
    versionId: number;
    scene: 'scene2' | 'scene3';
    previousText: string;
    candidateText: string | null;
    previousCharacterCount: number;
    candidateCharacterCount: number;
    violationsBefore: string[];
    violationsAfter: string[];
    accepted: boolean;
    acceptanceReason: AcceptanceReason;
    executionTimeMs: number;
    requestId: string;
    outputTokenCount?: number | null;
}

export interface SingleSceneRepairInput {
    versionId: number;
    scene: 'scene2' | 'scene3';
    currentVariations: CleanCopyVariation[];
    validationResult: CleanValidationResult;
    commercialEvidence?: CommercialEvidence;
    originalContextText?: string;
    reviewerGroundingMode?: CleanDReviewerGroundingMode;
    productImageBase64?: string | null;
    imageMimeType?: string;
}

export interface SingleSceneRepairResult {
    ok: boolean;
    mergedVariations: CleanCopyVariation[];
    validationResult: CleanValidationResult;
    repairDiagnostic: SingleSceneRepairDiagnostic;
    errorMessage?: string | null;
}

export interface AgenteDeCopyCleanResult {
    ok: boolean;
    variant: CleanVariantType;
    brainVariant?: CleanDBrainVariant;
    reviewerGroundingMode?: CleanDReviewerGroundingMode;
    variations: CleanCopyVariation[];
    variationsRecoveredCount: number;
    rawText: string;
    rawLength: number;
    finishReason: string;
    diagnostics: CleanDiagnostics;
    validation: CleanValidationResult;
    cleanDTrace?: CleanDExecutionTrace;
    commercialEvidence?: CommercialEvidence;
    errorMessage?: string | null;
}

export type VariationFilter = 'all' | 'available' | 'used';

export interface VariationUsageState {
    resultId: string;
    usedVariationIds: number[];
    filter: VariationFilter;
}

export interface UsageStats {
    total: number;
    usedCount: number;
    availableCount: number;
}
