import {
    ProductStructuralDNA,
    ProductReferenceCoverage,
    ProductMotionSafety
} from '../creative-director/types/compilerTypes';
import { AvatarIdentityContext } from '../visual-reference-engine/types/visualReferenceTypes';

export interface ProductVisionData {
    category: string;
    material: string;
    color: string;
    texture: string;
    finish: string;
    logo: string;
    packaging: string;
    fixedParts: string[];
    movingParts: string[];
    confidenceScore?: number;
    rawVisionSummary?: string;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
}

export interface MotionSuggestion {
    category: string;
    allowedMotion: string[];
    forbiddenMotion: string[];
    sensitiveRules: string[];
    motionLockPrompt: string;
    negativePromptAdditions: string[];
    motionBucket?: number;
}

export interface CinematicShot {
    id: string;
    stepName: string;
    camera: string;
    handAction: string;
    framing: string;
    visualObjective: string;
    visualPromptEn: string;
    actionPromptEn: string;
    dialoguePtBr: string;
}

export interface CinematicLibraryPresetShot {
    stepName: string;
    camera: string;
    handAction: string;
    framing: string;
    visualObjective: string;
    visualPromptTemplateEn: string;
    actionPromptTemplateEn: string;
    dialogueTemplatePtBr: string;
}

export interface CinematicLibraryCategory {
    categoryKey: string;
    label: string;
    keywords: string[];
    defaultShots: CinematicLibraryPresetShot[];
    allowedMotion: string[];
    forbiddenMotion: string[];
}

export interface PromptComposerInput {
    visionData: ProductVisionData;
    motionSuggestion: MotionSuggestion;
    shots: CinematicShot[];
    style: 'POV' | 'UGC' | 'Luxury' | 'Studio' | 'TikTok Shop' | 'Shopee' | 'Amazon' | string;
    targetModel?: 'Veo' | 'Sora' | 'Runway' | 'Flow' | string;
    lightingStyle?: string;
    scenario?: string;
    creatorProfile?: string;
    customProductName?: string;
    avatarIdentityContext?: AvatarIdentityContext;
}

export interface PromptComposerOutput {
    finalPrompt: string;
    negativePrompt: string;
    structuredOutput: {
        product_name: string;
        category: string;
        vision_data: ProductVisionData;
        motion_lock: MotionSuggestion;
        style: string;
        target_model: string;
        blocks: Array<{
            scene: string;
            visual_en: string;
            action_en: string;
            dialogue_pt_br: string;
            camera: string;
            hand_action: string;
            framing: string;
            visual_objective: string;
        }>;
    };
}

// ==========================================
// CINEMATIC COMMERCE ENGINE V1 TYPES
// ==========================================

export type CommerceDemoFamily =
    | 'AUTO'
    | 'UGC_POV_NATURAL'
    | 'WEAR_DEMO'
    | 'HAND_DEMO'
    | 'MACRO_DETAIL'
    | 'UNBOXING'
    | 'PREMIUM_STUDIO'
    | 'LIFESTYLE'
    | 'EDITORIAL_LOOKBOOK'
    | 'HIGH_ENERGY_VIRAL';

export type CommerceShotFunction =
    | 'PRODUCT_HOOK'
    | 'HERO_PRODUCT'
    | 'WEAR_DEMO'
    | 'HAND_DEMO'
    | 'FEATURE_PROOF'
    | 'MACRO_DETAIL'
    | 'TEXTURE_DETAIL'
    | 'MATERIAL_DETAIL'
    | 'CLASP_DETAIL'
    | 'ENGRAVING_DETAIL'
    | 'UNBOXING'
    | 'OPEN_CLOSE'
    | 'APPLICATION'
    | 'LIFESTYLE_USE'
    | 'RESULT_VISUAL'
    | 'ALTERNATE_ANGLE'
    | 'FINAL_HERO'
    | 'LOOP_RETURN';

export type CommerceInformationGain =
    | 'appearance'
    | 'use'
    | 'fit'
    | 'scale'
    | 'texture'
    | 'material'
    | 'finish'
    | 'clasp'
    | 'engraving'
    | 'mechanism'
    | 'functional_interaction'
    | 'application'
    | 'result'
    | 'context_of_use';

export interface CommerceShotPlan {
    shotNumber: number;
    functionType: CommerceShotFunction;
    informationGain: CommerceInformationGain[];
    stepName: string;
    camera: string;
    cameraComplexity: 'minimal' | 'low' | 'moderate';
    actionComplexity: 'static' | 'simple' | 'complex';
    handAction: string;
    framing: string;
    visualObjective: string;
    visualPromptEn: string;
    actionPromptEn: string;
    dialoguePtBr: string;
    targetDurationSec?: number;
}

export interface CommerceStrategyPlanInput {
    visionData: ProductVisionData;
    family?: CommerceDemoFamily;
    durationSec?: 8 | 10 | 15 | number;
    productName?: string;
    requestedOrbitMode?: 'none' | '180_orbit' | '360_orbit';
    customFocus?: string;
    creatorProfile?: string;
    avatarIdentityContext?: AvatarIdentityContext;
}

export interface CommerceStrategyPlanOutput {
    family: CommerceDemoFamily;
    resolvedFamily: Exclude<CommerceDemoFamily, 'AUTO'>;
    totalDurationSec: number;
    targetBeats: number;
    shots: CommerceShotPlan[];
    cinematicShots: CinematicShot[];
    cameraGuidelines: string[];
    negativeGuidelines: string[];
}

// ==========================================
// COMMERCE STABILITY & CONTINUITY CONTRACTS
// ==========================================

export interface CommerceFrameZeroConfig {
    initialProductState?: string;
    declaredQuantity?: number;
    avatarOrPerson?: string;
    environmentContext?: string;
    supportObjects?: string[];
}

export interface StructuredNegativeLock {
    productIdentity: string[];
    objectGeometry: string[];
    temporalContinuity: string[];
    handInteraction: string[];
    camera: string[];
    textAndLogo: string[];
    scene: string[];
}

export interface CommerceStabilityBundle {
    referenceAuthority: string[];
    frameZero: string;
    objectCountPersistence: string;
    realisticScaleLock: string;
    frameToFrameIdentityLock: string[];
    stateContinuityDirectives: string[];
    interactionValidityDirectives: string[];
    environmentFunctionLock: string;
    audioDirectives: {
        voiceover: 'OFF';
        dialogue: 'NONE';
        lipSync: 'OFF';
        backgroundMusic: string;
    };
    claimSafetyDirectives: string[];
    structuredNegativeLock: StructuredNegativeLock;
}

export interface CommercePromptCompilerInput {
    planOutput: CommerceStrategyPlanOutput;
    visionData: ProductVisionData;
    productName?: string;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    surface?: string;
    lighting?: string;
    environmentDescription?: string;
    frameZeroConfig?: CommerceFrameZeroConfig;
    requestedOrbitMode?: 'none' | '180_orbit' | '360_orbit';
    customNegativeAdditions?: string[];
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
    avatarIdentityContext?: AvatarIdentityContext;
}

export interface CommerceCompiledPromptOutput {
    formattedFullPrompt: string;
    rawSections: {
        format: string;
        referenceAuthority: string;
        productIdentityAndObjectLock: string;
        frameZero: string;
        environment: string;
        commerceDemoFamily: string;
        shotActionPlan: string;
        camera: string;
        lighting: string;
        pacing: string;
        audio: string;
        stateAndInteractionContinuity: string;
        structuredNegativeLock: string;
    };
    negativePromptCompiled: string;
    stabilityBundle: CommerceStabilityBundle;
}

