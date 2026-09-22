export interface AgentCopyVariation {
    id: number;
    scene2: string;
    scene3: string;
}

export interface UploadedProductImage {
    file?: File | null;
    dataUrl: string;
    name: string;
    size?: number;
    type?: string;
}

export interface AgenteDeCopyInput {
    productImage: UploadedProductImage | null;
    productTitle?: string;
    productPrice?: string;
    productInfo?: string;
    apiKey?: string;
}

export interface AgenteDeCopySelectedData {
    productImage: string | null;
    selectedVariationId?: number | null;
    selectedScene2VariationId: number;
    selectedScene3VariationId: number;
    selectedScene2Copy: string;
    selectedScene3Copy: string;
    savedAt?: number;
}

export interface SceneCharacterCount {
    id: number;
    scene2Length: number;
    scene3Length: number;
    scene2Valid: boolean;
    scene3Valid: boolean;
}

export interface AgenteDeCopyValidationResult {
    valid: boolean;
    isStrictRangeMet: boolean;
    issues: string[];
    characterCounts: SceneCharacterCount[];
}

export interface CheckpointADiagnostic {
    type: string;
    keys: string[];
    rawTextPresent: boolean;
    rawTextLength: number;
    textCandidateLength: number;
    sample100: string;
    hasIndexPattern: boolean;
}

export interface CheckpointBDiagnostic {
    textLength: number;
    sample100: string;
    sampleLast100: string;
    hasIndexPattern: boolean;
    fingerprint: string;
}

export interface CheckpointCDiagnostic {
    textLength: number;
    sample100: string;
    hasIndexPattern: boolean;
    fingerprint: string;
    bEqualsC: boolean;
}

export interface ResponseIntegrityCheckpoints {
    checkpointA: CheckpointADiagnostic;
    checkpointB: CheckpointBDiagnostic;
    checkpointC: CheckpointCDiagnostic;
    corruptionDetected: boolean;
    firstCorruptedCheckpoint: 'A' | 'B' | 'C' | null;
    corruptionPatternMatches: string[];
}

export interface SingleAttemptDiagnostic {
    attemptNumber: number;
    requestType: 'Initial Request (Tentativa 1)' | 'Repair Request (Tentativa 2)';
    apiStatus: string;
    modelUsed: string;
    finishReason?: string;
    rawResponseLength: number;
    completeRawText: string;
    versionBlocksDetected: number;
    scene2BlocksDetected: number;
    scene3BlocksDetected: number;
    parsedVariationCount: number;
    exactParserError?: string | null;
    characterCounts: SceneCharacterCount[];
    isValid: boolean;
    isStrictRangeMet: boolean;
    issues: string[];
    requestId?: string | null;
    workerVersion?: string | null;
    proxyPath?: string | null;
    requestedModel?: string | null;
    executedModel?: string | null;
    systemInstructionReceived?: boolean | null;
    systemInstructionForwarded?: boolean | null;
    inlineImageReceived?: boolean | null;
    inlineImageForwarded?: boolean | null;
    failoverUsed?: boolean | null;
    syntheticFallbackUsed?: boolean | null;
    integrityCheckpoints?: ResponseIntegrityCheckpoints | null;
}

export interface AgenteDeCopyDiagnostics {
    currentAttempt: SingleAttemptDiagnostic;
    history: SingleAttemptDiagnostic[];
}

export interface SingleABViolations {
    priceDetected: boolean;
    priceMatches: string[];
    discountDetected: boolean;
    discountMatches: string[];
    couponDetected: boolean;
    couponMatches: string[];
    installmentDetected: boolean;
    installmentMatches: string[];
    scene1Detected: boolean;
    scene1Matches: string[];
    preambleDetected: boolean;
    preambleMatches: string[];
    strategicHeadingsDetected: boolean;
    strategicHeadingsMatches: string[];
    carrinhoLaranjaPresent: boolean;
}

export interface SingleABTestResult {
    label: 'A_SYSTEM_INSTRUCTION' | 'B_MONOBLOCK_CONTENTS';
    name: string;
    description: string;
    httpStatus: string;
    workerVersion: string | null;
    requestedModel: string | null;
    executedModel: string | null;
    finishReason: string;
    rawLength: number;
    rawText: string;
    versionBlocksDetected: number;
    scene2BlocksDetected: number;
    scene3BlocksDetected: number;
    parsedVariationCount: number;
    variations: AgentCopyVariation[];
    validation: AgenteDeCopyValidationResult;
    scenesWithinRangeCount: number;
    hasExactly6Versions: boolean;
    hasScene1Detected: boolean;
    violations: SingleABViolations;
    p0Metadata: {
        requestId?: string | null;
        proxyPath?: string | null;
        failoverUsed?: boolean | null;
        syntheticFallbackUsed?: boolean | null;
        systemInstructionReceived?: boolean | null;
        systemInstructionForwarded?: boolean | null;
        inlineImageReceived?: boolean | null;
        inlineImageForwarded?: boolean | null;
    };
    integrityCheckpoints?: ResponseIntegrityCheckpoints | null;
}

export interface ABDiagnosticResult {
    testA: SingleABTestResult;
    testB: SingleABTestResult;
    executedAt: string;
    inputSnapshot: {
        hasImage: boolean;
        imageName: string;
        imageSize: number;
        productTitle?: string;
        productInfo?: string;
        userTextPrompt: string;
        model: string;
        temperature: number;
        topP: number;
        maxOutputTokens: number;
    };
}

export interface AgenteDeCopyV2StructuralValidity {
    versionsDetected: number;
    scene2Detected: number;
    scene3Detected: number;
    scene1Detected: boolean;
    isStructurallyComplete: boolean;
}

export interface AgenteDeCopyV2CharacterCompliance {
    compliantCount: number;
    totalScenes: number;
    isStrictRangeMet: boolean;
    counts: SceneCharacterCount[];
}

export interface V2TruncationDiagnostic {
    model: string;
    maxOutputTokensRequested: number;
    maxOutputTokensAtWorker?: number | null;
    geminiHttpStatus?: number | string | null;
    geminiFinishReason: string;
    finishMessage?: string | null;
    candidateCount: number;
    candidatePartsCount: number;
    candidatePartsMeta?: { index: number; textLength: number; isThought: boolean }[];
    outputTokenCount?: number | null;
    promptTokenCount?: number | null;
    totalTokenCount?: number | null;
    outboundGenerationConfig: {
        requested_model: string;
        temperature: number;
        topP: number;
        maxOutputTokens: number;
        hasMaxTokensField: boolean;
        hasMax_tokensField: boolean;
        hasMaxLengthField: boolean;
        hasMax_lengthField: boolean;
        hasOutputLengthField: boolean;
        hasResponseLengthField: boolean;
    };
    payloadIntegrity: {
        contents_count: number;
        parts_count: number;
        has_text_part: boolean;
        has_inline_image: boolean;
        systemInstruction_present: boolean;
        brain_delivery: 'contents_monoblock';
    };
    checkpoints: {
        L0_geminiCandidate: number;
        L1_worker: number;
        L2_serverReceived: number;
        L3_apiProxy: number;
        L4_postToWorker: number;
        L5_v2RawText: number;
        L6_parserInput: number;
    };
    truncationLocation: string;
}

export type V2HomologationRejectionReason =
    | 'benefício não comprovado'
    | 'genérica demais'
    | 'exagero/promessa'
    | 'urgência artificial'
    | 'CTA fraco'
    | 'linguagem pouco natural'
    | 'outro';

export interface V2VariationManualReview {
    variationIndex: number; // 1 to 6
    status: 'APROVADA' | 'REPROVADA' | 'PENDENTE';
    rejectionReason?: V2HomologationRejectionReason | null;
    customNote?: string;
}

export interface V2RuleComplianceReport {
    explicitPrice: boolean;
    priceMatches: string[];
    exactPriceLeak: boolean;
    exactPriceMatches: string[];
    explicitDiscount: boolean;
    discountMatches: string[];
    coupon: boolean;
    couponMatches: string[];
    inventedStockClaim: boolean;
    stockMatches: string[];
    inventedDeadline: boolean;
    deadlineMatches: string[];
    installmentTerms: boolean;
    installmentMatches: string[];
    scene1Detected: boolean;
    scene1Matches: string[];
    preambleDetected: boolean;
    preambleMatches: string[];
    strategicHeadings: boolean;
    strategicHeadingsMatches: string[];
    characterCountAnnotations: boolean;
    characterCountAnnotationMatches: string[];
    scene3WithCarrinhoLaranjaCount: number; // X/6
    totalViolationsCount: number;
}

export interface V2HomologationSessionRecord {
    id: string;
    productLabel: string;
    productTitle?: string;
    timestamp: string;
    whetherPriceWasProvided: boolean;
    whetherAdditionalInfoWasProvided: boolean;
    structure: {
        versionsDetected: number;
        scene2Detected: number;
        scene3Detected: number;
        scene1Detected: boolean;
    };
    characters: {
        compliantScenes: number;
        below160: number;
        above175: number;
        totalScenes: number;
        sceneDetails: {
            versionNumber: number;
            scene2Length: number;
            scene2Compliant: boolean;
            scene3Length: number;
            scene3Compliant: boolean;
        }[];
    };
    rules: V2RuleComplianceReport;
    manualReviews: V2VariationManualReview[];
    summary: {
        structureDisplay: string; // e.g. "6/6"
        charsDisplay: string; // e.g. "9/12"
        ctaDisplay: string; // e.g. "6/6"
        violationsCount: number; // e.g. 2
        manualApprovalDisplay: string; // e.g. "4/6"
    };
}

export interface AgenteDeCopyV2Result {
    httpStatus: string;
    workerVersion?: string | null;
    requestedModel?: string | null;
    executedModel?: string | null;
    finishReason: string;
    rawLength: number;
    rawText: string;
    structure: AgenteDeCopyV2StructuralValidity;
    characterCompliance: AgenteDeCopyV2CharacterCompliance;
    violations: SingleABViolations;
    variations: AgentCopyVariation[];
    validation: AgenteDeCopyValidationResult;
    p0Metadata: {
        requestId?: string | null;
        proxyPath?: string | null;
        failoverUsed?: boolean | null;
        syntheticFallbackUsed?: boolean | null;
        systemInstructionReceived?: boolean | null;
        systemInstructionForwarded?: boolean | null;
        inlineImageReceived?: boolean | null;
        inlineImageForwarded?: boolean | null;
    };
    truncationDiag?: V2TruncationDiagnostic | null;
    executedAt: string;
}

export interface V3SceneDetail {
    versionNumber: number;
    scene2Length: number;
    scene2Valid: boolean;
    scene3Length: number;
    scene3Valid: boolean;
    scene2Text: string;
    scene3Text: string;
}

export interface AgenteDeCopyV3ValidationResult {
    versionsDetected: number; // e.g. 6/6
    scene2PresentCount: number; // e.g. 6/6
    scene3PresentCount: number; // e.g. 6/6
    characterComplianceCount: number; // e.g. X/12 within 160-175
    sceneDetails: V3SceneDetail[];
    scene1Detected: boolean;
    scene1Matches: string[];
    carrinhoLaranjaCount: number; // e.g. 6/6
    carrinhoLaranjaMatches: string[];
    explicitPrice: boolean;
    priceMatches: string[];
    exactPriceLeak: boolean;
    exactPriceMatches: string[];
    discountClaim: boolean;
    discountMatches: string[];
    inventedStock: boolean;
    stockMatches: string[];
    inventedDeadline: boolean;
    deadlineMatches: string[];
    preambleDetected: boolean;
    preambleMatches: string[];
    uniqueIds1to6: boolean;
    totalViolationsCount: number;
}

export interface AgenteDeCopyV3Diagnostics {
    model: string;
    requestedModel?: string;
    executedModel?: string;
    httpStatus: string;
    finishReason: string;
    candidateCount: number;
    candidatePartsCount: number;
    textPartsCount: number;
    joinedTextLength: number;
    outputTokenCount?: number | null;
    promptTokenCount?: number | null;
    totalTokenCount?: number | null;
    rawResponseLength: number;
    jsonParseStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    variationsRecovered: number; // X/6
    characterComplianceDisplay: string; // e.g. "9/12"
    ctaComplianceDisplay: string; // e.g. "6/6"
    contractStatus: 'PASS' | 'PARTIAL' | 'FAIL';
    payloadIntegrity: {
        contents_count: number;
        parts_count: number;
        has_text_part: boolean;
        has_inline_image: boolean;
        systemInstruction_present: boolean;
        brain_delivery: 'contents_monoblock_structured';
    };
    checkpoints: {
        L0_geminiCandidate: number;
        L1_worker: number;
        L2_serverReceived: number;
        L3_apiProxy: number;
        L4_postToWorker: number;
        L5_v3RawText: number;
        L6_parserInput: number;
    };
}

export interface AgenteDeCopyV3Result {
    httpStatus: string;
    workerVersion?: string | null;
    requestedModel?: string | null;
    executedModel?: string | null;
    finishReason: string;
    rawLength: number;
    rawText: string;
    jsonParseStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    variationsRecoveredCount: number;
    variations: AgentCopyVariation[];
    contractStatus: 'PASS' | 'PARTIAL' | 'FAIL';
    validation: AgenteDeCopyV3ValidationResult;
    diagnostics: AgenteDeCopyV3Diagnostics;
    p0Metadata: {
        requestId?: string | null;
        proxyPath?: string | null;
        failoverUsed?: boolean | null;
        syntheticFallbackUsed?: boolean | null;
        systemInstructionReceived?: boolean | null;
        systemInstructionForwarded?: boolean | null;
        inlineImageReceived?: boolean | null;
        inlineImageForwarded?: boolean | null;
    };
    executedAt: string;
}


