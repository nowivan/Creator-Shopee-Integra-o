/**
 * SCENE 3 TYPES & STRICT TYPE CONTRACTS
 * Phase 2.2 Architecture — Deterministic Base Template & Prompt Compiler Skeleton
 */

import { ProductStructuralDNA, ProductReferenceCoverage, ProductMotionSafety } from './compilerTypes';
import { AvatarIdentityContext } from '../../visual-reference-engine/types/visualReferenceTypes';
import type {
  ResolvedWardrobeContract,
  WardrobeConsistencyLock
} from '../wardrobe/wardrobePriorityResolver';
export type { ResolvedWardrobeContract, WardrobeConsistencyLock };

export interface Scene3Presenter {
  identity: string;
  gender?: string; // "female" | "male" | string
  avatarIdentityContext?: AvatarIdentityContext;
}

export interface Scene3Wardrobe {
  description: string;
  topType?: string;
  topStyle?: string;
  topColor?: string;
  bottomType?: string;
  bottomColor?: string;
  footwearType?: string;
  footwearColor?: string;
  resolvedWardrobeContract?: ResolvedWardrobeContract;
  wardrobeConsistencyLock?: WardrobeConsistencyLock;
}

export interface Scene3ProductSlots {
  identity: string;
  visibleDetails: string[];
  knownPhysicalFacts?: string[];
  quantity?: string | null;
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;
}

export interface Scene3Actions {
  action0to2: string; // 0.0s - 2.0s
  action2to4: string; // 2.0s - 4.0s
  action4to6: string; // 4.0s - 6.0s
  action6to8: string; // 6.0s - 8.0s
}

export interface Scene3SpeechActionSyncItem {
  spokenSegment: string; // Substring from spokenCta (or phrase)
  physicalAction: string; // Synchronized physical gesture / movement
}

/**
 * Dynamic input slots for Scene 3 Prompt Compiler.
 * Notice: spokenCta is received from the Copy Agent and is IMMUTABLE.
 */
export interface Scene3DynamicSlots {
  presenter: {
    identity: string;
    gender?: string;
    avatarIdentityContext?: AvatarIdentityContext;
  };
  avatarIdentityContext?: AvatarIdentityContext;

  wardrobe: {
    description: string;
    topType?: string;
    topStyle?: string;
    topColor?: string;
    bottomType?: string;
    bottomColor?: string;
    footwearType?: string;
    footwearColor?: string;
    resolvedWardrobeContract?: ResolvedWardrobeContract;
    wardrobeConsistencyLock?: WardrobeConsistencyLock;
  };

  product: {
    identity: string;
    visibleDetails: string[];
    knownPhysicalFacts?: string[];
    quantity?: string | null;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
  };
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;

  environment: string;

  spokenCta: string;

  actions: {
    action0to2: string;
    action2to4: string;
    action4to6: string;
    action6to8: string;
  };

  ctaGesture: string;

  speechActionSync: Array<{
    spokenSegment: string;
    physicalAction: string;
  }>;

  productSpecificNegatives?: string[];
}

/**
 * CANONICAL INTERMEDIATE MODEL FOR SCENE 3
 * 
 * Immutable intermediate representation created by buildCompiledScene3Model.
 * Serves as the single source of truth for both Text and JSON renderers.
 */
export interface CompiledScene3Model {
  scene: 3;

  technicalSpecifications: {
    aspectRatio: "9:16";
    durationSeconds: 8;
    format: string; // "Brazilian UGC (User-Generated Content), authentic everyday smartphone realism."
    shotType: string; // "Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, NO gimbal stabilization, NO cinematic color grading, authentic natural ambient lighting)."
  };

  presenterContract: {
    identity: string;
    gender?: string;
    avatarIdentityRule: string;
    wardrobe: {
      description: string;
      topType?: string;
      topStyle?: string;
      topColor?: string;
      bottomType?: string;
      bottomColor?: string;
      footwearType?: string;
      footwearColor?: string;
      resolvedWardrobeContract?: ResolvedWardrobeContract;
      wardrobeConsistencyLock?: WardrobeConsistencyLock;
    };
    avatarIdentityContext?: AvatarIdentityContext;
  };

  environment: string;

  productContract: {
    identity: string;
    quantity?: string | null;
    visibleDetails: string[];
    knownPhysicalFacts: string[];
    exclusiveReferenceRule: string;
    scaleAndFidelityRule: string;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
  };

  closingPrinciple: {
    actionMandate: string;
  };

  timeline: {
    action0to2: string;
    action2to4: string;
    action4to6: string;
    action6to8: string;
  };

  dialogue: {
    spokenCta: string;
    audioRules: string[];
    exactDialogueLockRule: string;
  };

  ctaGesture: {
    description: string;
  };

  speechActionSync: Array<{
    spokenSegment: string;
    physicalAction: string;
  }>;

  negativeConstraints: string[] | readonly string[];
  universalNegatives: string[] | readonly string[];
  productSpecificNegatives: string[] | readonly string[];
}

/**
 * DETERMINISTIC SERIALIZED JSON OUTPUT FOR SCENE 3
 */
export interface Scene3JsonOutput {
  scene: 3;
  durationSeconds: 8;
  aspectRatio: "9:16";
  format: string;
  shotType: string;
  presenter: {
    identity: string;
    gender?: string;
    avatarIdentityRule: string;
    wardrobe: {
      description: string;
    };
    avatarIdentityContext?: AvatarIdentityContext;
  };
  environment: string;
  product: {
    identity: string;
    quantity?: string | null;
    visibleDetails: string[];
    knownPhysicalFacts: string[];
    exclusiveReferenceRule: string;
    scaleAndFidelityRule: string;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
  };
  closingPrinciple: {
    actionMandate: string;
  };
  timeline: {
    action0to2: string;
    action2to4: string;
    action4to6: string;
    action6to8: string;
  };
  dialogue: {
    spokenCta: string;
    audioRules: string[];
    exactDialogueLockRule: string;
  };
  ctaGesture: {
    description: string;
  };
  speechActionSync: Array<{
    spokenSegment: string;
    physicalAction: string;
  }>;
  negativeConstraints: string[] | readonly string[];
  universalNegatives?: string[] | readonly string[];
  productSpecificNegatives?: string[] | readonly string[];
}

export interface Scene3SlotValidationResult {
  valid: boolean;
  errors: string[];
}

export interface Scene3PipelineResult {
  dynamicSlots: Scene3DynamicSlots;
  compiledModel: CompiledScene3Model;
  compiledPrompt: string;
  compiledJson: Scene3JsonOutput;
  compiledJsonString: string;
}

/**
 * SCENE 3 BRAIN INPUT CONTRACT (Phase 2.3)
 */
export interface Scene3BrainInput {
  product: {
    identity: string;
    category?: string;
    visibleDetails: string[];
    knownPhysicalFacts: string[];
    quantity?: string | null;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
  };
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;

  presenter: {
    identity: string;
    gender?: string;
  };

  wardrobe: {
    description: string;
  };

  spokenCta: string; // IMMUTABLE: Received directly from Copy Agent
}

/**
 * SCENE 3 BRAIN OUTPUT CONTRACT (Phase 2.3)
 */
export interface Scene3BrainResult {
  environment: string;

  actions: {
    action0to2: string;
    action2to4: string;
    action4to6: string;
    action6to8: string;
  };

  ctaGesture: string;

  speechActionSync: Array<{
    spokenSegment: string;
    physicalAction: string;
  }>;

  productSpecificNegatives: string[];
}

/**
 * SCENE 3 END-TO-END INTEGRATION CONTRACTS (Phase 2.4)
 */
export interface Scene3PresenterInput {
  identity: string;
  gender?: 'female' | 'male' | string;
  avatarIdentityContext?: AvatarIdentityContext;
}

export interface Scene3WardrobeInput {
  description: string;
  topType?: string;
  topStyle?: string;
  topColor?: string;
  bottomType?: string;
  bottomColor?: string;
  footwearType?: string;
  footwearColor?: string;
  resolvedWardrobeContract?: ResolvedWardrobeContract;
  wardrobeConsistencyLock?: WardrobeConsistencyLock;
}

export interface Scene3ProductContextInput {
  identity: string;
  category?: string;
  visibleDetails: string[];
  knownPhysicalFacts: string[];
  quantity?: string | null;
}

export interface Scene3GenerationInput {
  productContext: Scene3ProductContextInput;
  presenter: Scene3PresenterInput;
  wardrobe: Scene3WardrobeInput;
  resolvedWardrobeContract?: ResolvedWardrobeContract;
  wardrobeConsistencyLock?: WardrobeConsistencyLock;
  spokenCta: string; // IMMUTABLE: Retrieved from Copy Agent
  apiKey?: string;
  avatarIdentityContext?: AvatarIdentityContext;
}

export interface Scene3DiagnosticTrace {
  timestamp: string;
  ctaInput: string;
  productContextSummary: {
    identity: string;
    category?: string;
    factsCount: number;
    detailsCount: number;
    quantity?: string | null;
  };
  brainResult: Scene3BrainResult;
  dynamicSlots: Scene3DynamicSlots;
  avatarIdentityContext?: AvatarIdentityContext;
  compiledPrompt: string;
  compiledJson?: Scene3JsonOutput;
  executionTimeMs: number;
  ctaByteLockVerified: boolean;
}

export interface Scene3GenerationResult {
  brainResult: Scene3BrainResult;
  dynamicSlots: Scene3DynamicSlots;
  compiledModel: CompiledScene3Model;
  finalPrompt: string;
  jsonOutput?: Scene3JsonOutput;
  compiledJsonString?: string;
  diagnosticTrace: Scene3DiagnosticTrace;
}

/**
 * SCENE 3 CTA HANDOFF CONTRACT (Phase 2.4.2)
 * Explicit, user-triggered transfer from Scene 2 to Scene 3.
 * Byte-for-byte immutable transfer generated exclusively by the Copy Agent.
 */
export interface Scene3CtaHandoff {
  cta: string;
  source: 'user_selected' | 'recommended' | 'active_variation' | 'copy_agent' | 'scene2_handoff' | 'manual';
  versionId?: number;
  productTitle?: string;
  productRevisionId?: string;
  sentAt: number;
  characterCount: number;
}

/**
 * SCENE 2 CTA HUB VARIATION & CANDIDATE CONTRACTS (Phase 2.4.2D)
 */
export interface Scene3CtaVariation {
  id: string;
  versionNumber: number;
  text: string;
  productRevisionId: string;
  characterCount: number;
}

export interface Scene3CtaCandidate {
  cta: string;
  variationId: string;
  versionNumber: number;
  productRevisionId: string;
  characterCount: number;
}

export type VariationCount = 1 | 2 | 3 | 4 | 5 | 6;



