/**
 * SCENE 2 PROMPT COMPILER — STRICT TYPE CONTRACTS
 * Phase 1 Architecture
 */

import { AvatarIdentityContext } from '../../visual-reference-engine/types/visualReferenceTypes';
export type { AvatarIdentityContext };
import type {
  ResolvedWardrobeContract,
  WardrobeConsistencyLock,
  WardrobeFormInput
} from '../wardrobe/wardrobePriorityResolver';
export type { ResolvedWardrobeContract, WardrobeConsistencyLock, WardrobeFormInput };

export interface ProductCommercialEvidence {
  price_visible: boolean;
  discount_visible: boolean;
  coupon_visible: boolean;
  offer_visible: boolean;
  deadline_visible: boolean;
  stock_visible: boolean;
}

export type GroundingConfidence = 'high' | 'medium' | 'low';

export interface GroundingProvenance {
  field: string;
  source: string; // 'explicit_name' | 'commercial_title' | 'brand_and_type' | 'quantity_and_type' | 'product_type' | 'visible_label' | 'user_override'
  value: string;
}

export interface RawDetectedProductData {
  productName?: string;
  productType?: string;
  brand?: string;
  quantity?: number | null;
  readableLabels?: string[];
  category?: string;
  colors?: string[];
  materials?: string[];
}

export interface NormalizedIdentityResult {
  productIdentity: string;
  productType: string;
  brand?: string;
  quantity?: number | null;
  confidence: GroundingConfidence;
  provenance: GroundingProvenance[];
  rawDetected?: RawDetectedProductData;
  isCommercialPackConfirmed?: boolean;
}

export type ReferenceUnitRole =
  | 'canonical'
  | 'alternate_color'
  | 'front_reference'
  | 'rear_reference'
  | 'side_reference'
  | 'background'
  | 'unknown';

export type PhysicalInteractionRisk = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type DemonstrationRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type GeometryConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type DemonstrationGuardStatus = 'ALLOWED' | 'BLOCKED';

export type DemonstrationMode =
  | 'DISPLAY'
  | 'PASSIVE_VISUAL_DEMO'
  | 'SIMPLE_HANDLING'
  | 'FUNCTIONAL_INTERACTION';

export interface InteractionRequirementCheck {
  requiresVerifiedControlTarget: boolean;
  requiresVerifiedContactSurface: boolean;
  requiresVerifiedMovablePart: boolean;
  requiresVerifiedOrientation: boolean;
  requiresVerifiedGripRegion: boolean;
  targetDescription: string;
  targetFace?: 'front' | 'rear' | 'leftSide' | 'rightSide' | 'top' | 'bottom' | 'unknown';
  isTargetVerified: boolean;
  unverifiedReasons: string[];
}

export interface DemonstrationSafetyEvaluation {
  demonstrationRisk: DemonstrationRisk;
  geometryConfidence: GeometryConfidence;
  interactionRequirements: InteractionRequirementCheck;
  guardStatus: DemonstrationGuardStatus;
  reasons: string[];
}

export interface DemonstrationBenefitCandidate {
  id: string;
  benefitText: string;
  verified: boolean;
  demonstrable: boolean;
  interactionRisk: DemonstrationRisk;
  geometryConfidence: GeometryConfidence;
  controlTargetAvailable: boolean;
  requiredDemoMode: DemonstrationMode;
  safetyEvaluation: DemonstrationSafetyEvaluation;
  selectionScore?: number;
  rejectionReasons?: string[];
}

export interface SafeDemoSelectionResult {
  candidates: DemonstrationBenefitCandidate[];
  selectedBenefit: string;
  selectedMode: DemonstrationMode;
  risk: DemonstrationRisk;
  geometryConfidence: GeometryConfidence;
  safetyStatus: DemonstrationGuardStatus;
  fallbackUsed: boolean;
  fallbackType?: 'NONE' | 'SAFER_CANDIDATE' | 'PASSIVE_VISUAL_DEMO' | 'DISPLAY';
  diagnostic?: {
    [key: string]: any;
  };
}

export type Scene2LoadLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type CameraMovementLoad = 'STATIC_OR_SUBTLE' | 'MODERATE' | 'COMPLEX';

export interface Scene2ActionBudgetEvaluation {
  majorActionCount: number;
  majorActions: string[];
  actionBudgetStatus: 'WITHIN_BUDGET' | 'EXCEEDS_BUDGET';
  actionLoad: Scene2LoadLevel;
  actionComplexityReasons: string[];
}

export interface Scene2SpeechLoadEvaluation {
  characterCount: number;
  wordCount: number;
  estimatedDurationSec: number;
  phraseDensity: number; // words per second
  speechLoad: Scene2LoadLevel;
}

export interface Scene2CombinedLoadEvaluation {
  speechLoadEvaluation: Scene2SpeechLoadEvaluation;
  actionBudgetEvaluation: Scene2ActionBudgetEvaluation;
  cameraLoad: CameraMovementLoad;
  speechLoad: Scene2LoadLevel;
  actionLoad: Scene2LoadLevel;
  combinedLoad: Scene2LoadLevel;
  overloaded: boolean;
  simplificationApplied: boolean;
  simplificationReasons: string[];
  recommendedDemoMode?: DemonstrationMode;
}

export interface PhysicalSpeechActionAnchor {
  phrase: string;
  action: string;
}

export interface PhysicalInteractionPlan {
  interactionRisk: PhysicalInteractionRisk;
  demonstrationRisk?: DemonstrationRisk;
  geometryConfidence?: GeometryConfidence;
  demonstrationGuardStatus?: DemonstrationGuardStatus;
  demonstrationBlockedReasons?: string[];
  selectedDemoMode?: DemonstrationMode;
  selectedDemoBenefit?: string;
  safeDemoSelection?: SafeDemoSelectionResult;
  speechLoad?: Scene2LoadLevel;
  actionLoad?: Scene2LoadLevel;
  combinedLoad?: Scene2LoadLevel;
  actionBudgetEvaluation?: Scene2ActionBudgetEvaluation;
  speechLoadEvaluation?: Scene2SpeechLoadEvaluation;
  combinedLoadEvaluation?: Scene2CombinedLoadEvaluation;
  actorStartPosition?: string;
  primaryTarget?: string;
  actionSequence?: string[];
  requiredClearance?: string[];
  contactPoints?: string[];
  collisionBoundaries?: string[];
  preExistingProps?: string[];
  cameraSafetyInstructions?: string[];
  speechActionAnchors?: PhysicalSpeechActionAnchor[];
}

export interface ReferenceUnit {
  id: string;
  role: ReferenceUnitRole;
  color?: string;
  view?: 'front' | 'rear' | 'left_side' | 'right_side' | 'three_quarter' | 'unknown';
  description?: string;
}

export interface CanonicalProductSelection {
  referenceTotalUnitsVisible: number | null;
  activeSceneQuantity: number;
  canonicalReferenceUnit: ReferenceUnit | null;
  alternateReferenceUnits: ReferenceUnit[];
  canonicalColor?: string;
  isCommercialPackConfirmed?: boolean;
}

export type StructuralElementRole =
  | 'fixed'
  | 'movable'
  | 'branding'
  | 'surface'
  | 'functional'
  | 'packaging'
  | 'unknown';

export interface StructuralElement {
  id: string;
  name: string;
  role: StructuralElementRole;
  shape?: string;
  position?: string;
  relativeSize?: string;
  orientation?: string;
  material?: string;
  color?: string;
  count?: number;
  relationshipToOtherParts?: string[];
  confidence?: number;
  visible?: boolean;
}

export interface ProductCoreGeometry {
  silhouette?: string;
  aspectRatio?: number;
  proportions?: string;
  thicknessProfile?: string;
  edgeStyle?: string;
  cornerProfile?: string;
  symmetry?: string;
}

export interface ProductColorsStructure {
  canonicalColor?: string;
  secondaryColors?: string[];
  accentColors?: string[];
}

export interface ProductMaterialsStructure {
  primary?: string;
  secondary?: string[];
  finish?: string;
  texture?: string;
}

export interface ProductBrandingStructure {
  logos?: StructuralElement[];
  visibleText?: StructuralElement[];
  labels?: StructuralElement[];
}

export interface ProductCategoryModule<T = Record<string, unknown>> {
  type: string;
  confidence?: number;
  data: T;
}

export interface CameraModuleDNA {
  detected: boolean;
  islandShape?: string;
  islandPosition?: string;
  islandWidthRatio?: number;
  islandHeightRatio?: number;
  lensCount?: number;
  lensTopology?: string;
  lensScale?: string;
  lensSpacing?: string;
  flashPosition?: string;
  auxiliarySensorPositions?: string[];
  confidence?: number;
}

export type ProductFaceVisibility = 'confirmed' | 'partial' | 'unknown';

export interface ProductReferenceCoverage {
  front: 'confirmed' | 'partial' | 'unknown';
  rear: 'confirmed' | 'partial' | 'unknown';
  leftSide: 'confirmed' | 'partial' | 'unknown';
  rightSide: 'confirmed' | 'partial' | 'unknown';
  top: 'confirmed' | 'partial' | 'unknown';
  bottom: 'confirmed' | 'partial' | 'unknown';

  confidence?: number;
}

export interface ProductMotionSafety {
  maxRotationDegrees?: number;

  allowFullFrontReveal: boolean;
  allowFullRearReveal: boolean;
  allowFullSideReveal: boolean;
  allowFullOrbit: boolean;

  preferredViews: string[];
  forbiddenViews: string[];
}

export interface ProductStructuralDNA {
  category?: string;
  coreGeometry?: ProductCoreGeometry;
  colors?: ProductColorsStructure;
  materials?: ProductMaterialsStructure;
  branding?: ProductBrandingStructure;
  fixedComponents?: StructuralElement[];
  movableComponents?: StructuralElement[];
  surfaceFeatures?: StructuralElement[];
  categoryModules?: Record<string, ProductCategoryModule<any>>;
  confidence?: Record<string, number>;
  isCommercialPackConfirmed?: boolean;
  kitComponentCount?: number;
  handledComponentCount?: number;
  remainingVisibleComponentCount?: number;
  isFurnitureOrLargeSet?: boolean;
  allowTemporaryRelocation?: boolean;
}

export function createEmptyProductStructuralDNA(): ProductStructuralDNA {
  return {
    coreGeometry: {},
    colors: {},
    materials: {},
    branding: {
      logos: [],
      visibleText: [],
      labels: []
    },
    fixedComponents: [],
    movableComponents: [],
    surfaceFeatures: [],
    categoryModules: {},
    confidence: {}
  };
}

export interface ProductGroundingResult {
  product_identity: string;
  product_type: string;
  category?: string;
  observable_quantity?: number | null;
  observable_details: string[];
  observable_colors: string[];
  observable_materials: string[];
  packaging_details: string[];
  visible_labels: string[];
  verified_functional_facts: string[];
  commercial_evidence: ProductCommercialEvidence;
  uncertain_observations: string[];
  raw_detected?: RawDetectedProductData;
  confidence?: GroundingConfidence;
  provenance?: GroundingProvenance[];
  discarded_visual_composition?: string[];
  reference_total_units_visible?: number | null;
  active_scene_quantity?: number;
  canonical_color?: string;
  canonical_reference_unit?: ReferenceUnit | null;
  alternate_reference_units?: ReferenceUnit[];
  is_commercial_pack_confirmed?: boolean;
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;
}

export type SemanticOrigin =
  | 'IMAGE_GROUNDING'
  | 'USER_CONFIRMED'
  | 'USER_OVERRIDE'
  | 'DERIVED_BY_COPY_BRAIN'
  | 'DERIVED_BY_SCENE_BRAIN';

export type BenefitClassification =
  | 'PRACTICAL_FUNCTIONAL_BENEFIT'
  | 'AESTHETIC_ATTRIBUTE'
  | 'COMMERCIAL_CLAIM'
  | 'UNSUPPORTED_CLAIM'
  | 'GENERIC_VALUE'
  | 'VALID_USER_GUIDANCE';

export interface Scene2ProductContext {
  identity: string;
  type: string;
  brand?: string;
  category?: string;
  observableQuantity?: number | null;
  referenceTotalUnitsVisible?: number | null;
  activeSceneQuantity?: number;
  canonicalColor?: string;
  canonicalReferenceUnit?: ReferenceUnit | null;
  alternateReferenceUnits?: ReferenceUnit[];
  isCommercialPackConfirmed?: boolean;
  observableDetails: string[];
  observableColors?: string[];
  observableMaterials?: string[];
  packagingDetails?: string[];
  visibleLabels?: string[];
  verifiedFunctionalFacts: string[];
  confirmedUserFacts: string[];
  uncertainObservations: string[];
  sourceOrigins?: Record<string, SemanticOrigin>;
  rawDetected?: RawDetectedProductData;
  confidence?: GroundingConfidence;
  provenance?: GroundingProvenance[];
  discardedVisualComposition?: string[];
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;
  kitComponentCount?: number;
  handledComponentCount?: number;
  remainingVisibleComponentCount?: number;
}

export type FieldSource = 'extracted_from_image' | 'user_provided' | 'manual_override';

export type Scene2PipelineStatus =
  | 'EMPTY'
  | 'IMAGE_SELECTED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'GROUNDING_REVIEW'
  | 'READY_TO_COMPILE'
  | 'COMPILING'
  | 'COMPILED'
  | 'ERROR';

export type DiagnosticStepStatus = 'PENDING' | 'RUNNING' | 'PASS' | 'WARNING' | 'ERROR';

export interface Scene2Presenter {
  gender: "female" | "male";
  description: string; // e.g. "Adult Brazilian woman in her late 20s with natural wavy brown hair"
  avatarIdentityContext?: AvatarIdentityContext;
}

export interface Scene2Wardrobe {
  topType: string;       // e.g. "basic plain t-shirt", "casual blouse"
  topStyle?: string;     // e.g. "crew neck", "relaxed fit"
  topColor: string;      // e.g. "white", "navy blue"
  bottomType: string;    // e.g. "basic blue jeans", "tailored trousers"
  bottomColor: string;   // e.g. "medium wash blue", "black"
  footwearType: string;  // e.g. "plain sneakers", "casual loafers"
  footwearColor: string; // e.g. "white", "black"
}

export interface Scene2Actions {
  action0to2: string; // 0.0s - 2.0s
  action2to4: string; // 2.0s - 4.0s
  action4to6: string; // 4.0s - 6.0s
  action6to8: string; // 6.0s - 8.0s
}

export interface Scene2SpeechActionSyncItem {
  phrase: string; // Exact substring from spokenCopy
  action: string; // Synchronized physical movement
}

export interface Scene2ProductPreservationFacts {
  productIdentity: string;
  productFacts: string[];
  productQuantity?: string;
  productVisibleDetails: string[];
  materials?: string[];
  colors?: string[];
  shape?: string;
  packaging?: string;
}

export interface Scene2DynamicSlots {
  productIdentity: string;
  productFacts: string[];
  productQuantity?: string;
  productVisibleDetails: string[];

  presenter: Scene2Presenter;
  wardrobe: Scene2Wardrobe;
  resolvedWardrobeContract?: ResolvedWardrobeContract;
  wardrobeConsistencyLock?: WardrobeConsistencyLock;
  avatarIdentityContext?: AvatarIdentityContext;

  environment: string;
  primaryBenefit: string;
  spokenCopy: string;

  actions: Scene2Actions;
  speechActionSync: Scene2SpeechActionSyncItem[];
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;
  isCommercialPackConfirmed?: boolean;
  kitComponentCount?: number;
  handledComponentCount?: number;
  remainingVisibleComponentCount?: number;
  physicalChoreography?: PhysicalInteractionPlan;
}

export interface Scene2CopyBrainResult {
  dominant_fact: string;
  real_function: string;
  consumer_gain: string;
  practical_result: string;
  compatible_context: string;
  spoken_copy: string;
}

export interface Scene2CopyBrainInput {
  productName: string;
  category: string;
  productFacts: string[];
  primaryBenefit?: string;
  productQuantity?: string;
  productVisibleDetails?: string[];
  targetAudience?: string;
  toneStyle?: string;
}

export interface Scene2CopyBrainOutput extends Scene2CopyBrainResult {
  // CamelCase aliases for backwards compatibility with existing UI/diagnostics
  spokenCopy: string;
  verifiedFactUsed: string;
}

export interface Scene2SceneBrainInput {
  productName: string;
  category: string;
  productFacts: string[];
  productVisibleDetails: string[];
  primaryBenefit: string;
  spokenCopy: string; // Exact copy finalized by Copy Brain
  presenter: Scene2Presenter;
  wardrobe: Scene2Wardrobe;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;
  isCommercialPackConfirmed?: boolean;
  kitComponentCount?: number;
  handledComponentCount?: number;
  remainingVisibleComponentCount?: number;
}

export interface Scene2SceneBrainOutput {
  environment: string; // Functional environment (e.g. bathroom for towels, kitchen for cookware)
  actions: Scene2Actions;
  speechActionSync: Scene2SpeechActionSyncItem[];
}

export interface Scene2CompilerDiagnosticTrace {
  timestamp: string;
  groundingResult?: ProductGroundingResult;
  productContext?: Scene2ProductContext;
  productFacts: string[];
  primaryBenefit: string;
  benefitClassification?: BenefitClassification;
  copyBrainOutput: Scene2CopyBrainOutput;
  sceneBrainSlots: Scene2SceneBrainOutput;
  wardrobeContract: {
    userWardrobe: Scene2Wardrobe;
    avatarIdentityPriorityEnforced: boolean;
    resolvedWardrobeContract?: ResolvedWardrobeContract;
    wardrobeConsistencyLock?: WardrobeConsistencyLock;
  };
  avatarIdentityContext?: AvatarIdentityContext;
  compiledPrompt: string;
  compiledJson?: Scene2JsonOutput;
  executionTimeMs: number;
  totalCalls: number;
  preCompilationValidation?: {
    valid: boolean;
    errors: string[];
  };
}

/**
 * FASE 1.2B: COMPILED SCENE MODEL (INTERMEDIATE TYPED CANONICAL SOURCE OF TRUTH)
 * 
 * Single authoritative model that feeds both Text Renderer and JSON Renderer.
 * Zero Semantic Drift: neither renderer mutates or reinterprets this model.
 */
export interface CompiledScene2Model {
  scene: 2;

  technicalSpecifications: {
    aspectRatio: "9:16";
    durationSeconds: 8;
    format: string; // "Brazilian UGC (User-Generated Content), authentic everyday smartphone realism."
    shotType: string; // "Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, NO gimbal stabilization, NO cinematic color grading, authentic natural ambient lighting)."
  };

  presenter: {
    gender: "female" | "male";
    description: string;
    avatarIdentityRule: string;
    wardrobe: Scene2Wardrobe;
    resolvedWardrobeContract?: ResolvedWardrobeContract;
    wardrobeConsistencyLock?: WardrobeConsistencyLock;
    avatarIdentityContext?: AvatarIdentityContext;
  };

  environment: string;

  product: {
    identity: string;
    quantity?: string | null;
    observableDetails: string[];
    physicalFacts: string[];
    exclusiveReferenceRule: string;
    scaleAndFidelityRule: string;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
  };

  primaryBenefit: string;
  benefitActionMandate: string;

  actions: {
    action0to2: string;
    action2to4: string;
    action4to6: string;
    action6to8: string;
  };

  spokenCopy: string;

  speechActionSync: Array<{
    phrase: string;
    action: string;
  }>;

  audioRules: string[];

  negativeConstraints: string[];

  physicalChoreography?: PhysicalInteractionPlan;
}

/**
 * DETERMINISTIC SERIALIZED JSON OUTPUT FOR SCENE 2
 * Represents all semantic fields from the CompiledScene2Model with zero drift.
 */
export interface Scene2JsonOutput {
  scene: 2;
  durationSeconds: 8;
  aspectRatio: "9:16";
  format: string;
  shotType: string;
  presenter: {
    gender: "female" | "male";
    description: string;
    avatarIdentityRule: string;
    wardrobe: {
      topType: string;
      topStyle?: string;
      topColor: string;
      bottomType: string;
      bottomColor: string;
      footwearType: string;
      footwearColor: string;
    };
    avatarIdentityContext?: AvatarIdentityContext;
  };
  environment: string;
  product: {
    identity: string;
    quantity?: string | null;
    observableDetails: string[];
    physicalFacts: string[];
    exclusiveReferenceRule: string;
    scaleAndFidelityRule: string;
    structuralDNA?: ProductStructuralDNA;
    referenceCoverage?: ProductReferenceCoverage;
    motionSafety?: ProductMotionSafety;
  };
  primaryBenefit: string;
  benefitActionMandate: string;
  actions: {
    action0to2: string;
    action2to4: string;
    action4to6: string;
    action6to8: string;
  };
  spokenCopy: string;
  speechActionSync: Array<{
    phrase: string;
    action: string;
  }>;
  audioRules: string[];
  negativeConstraints: string[];
  physicalChoreography?: PhysicalInteractionPlan;
}

export interface Scene2PipelineResult {
  dynamicSlots: Scene2DynamicSlots;
  compiledModel: CompiledScene2Model;
  compiledPrompt: string;
  compiledJson: Scene2JsonOutput;
  compiledJsonString: string;
  diagnosticTrace: Scene2CompilerDiagnosticTrace;
}

/**
 * SHARED PRODUCT WORKSPACE (Phase 2.4.2B)
 * Single authoritative product owner shared between Scene 2 and Scene 3.
 * Guarantees exactly one product image, one factual analysis, and single-source normalization.
 */
export interface CreativeDirectorProductWorkspace {
  productImageFile: File | null;
  productImagePreview: string | null;
  productImageName: string | null;
  productRevisionId: string | null;

  groundingResult: ProductGroundingResult | null;
  normalizedProductContext: Scene2ProductContext | null;

  productIdentity: string | null;

  groundingStatus: 'idle' | 'analyzing' | 'ready' | 'error';
  groundingError?: string | null;
}

/**
 * CONSOLIDATED CREATIVE DIRECTOR WORKSPACE (Phase 2.4.3D)
 * Single unified persistence lifecycle managing:
 * - Shared Product Grounding
 * - Scene 2 / Scene 3 Outputs and Handoffs
 * - Tab navigation preservation (Navigation is NOT invalidation)
 * - Revision-based cache invalidation
 */
export interface CreativeDirectorWorkspace {
  productWorkspace: CreativeDirectorProductWorkspace;
  scene3CtaHandoff: any | null; // Scene3CtaHandoff | null
  mainTab: string;

  // Creative Director Core State
  productName?: string;
  category?: string;
  platform?: string;
  objective?: string;
  visualStyle?: string;
  ctaStyle?: string;
  duration?: string;
  format?: string;
  extraInstructions?: string;
  productImage?: string | null;
  scenarioImage?: string | null;
  avatarImage?: string | null;
  refVideo?: string | null;
  refImage?: string | null;
  result?: any;
  activeTab?: string;
  modelStructureSource?: string;
  voiceStyle?: string;
  aiAnalysis?: any;
  creativeMode?: string;
  directorMode?: string;
  characters?: any[];

  hookStyle?: string;
  emotionalTrigger?: string;
  audienceType?: string;
  presenterStyle?: string;
  cameraStyle?: string;
  energyLevel?: string;
  optimizationLevel?: string;
  productCategory?: string;
  viralFramework?: string;

  // Campaign Builder State
  cbProductImages?: string[];
  cbProductName?: string;
  cbProductCategory?: string;
  cbMainBenefit?: string;
  cbMainPainSolved?: string;
  cbPriceRange?: string;
  cbUniqueDifferentiator?: string;
  cbAvatarImage?: string | null;
  cbCreatorGender?: string;
  cbCreatorAgeStyle?: string;
  cbCreatorPersona?: string;
  cbSpeakingEnergy?: string;
  cbSpeakingPace?: string;
  cbScenarioImage?: string | null;
  cbScenarioDescription?: string;
  cbBackgroundStrategy?: string;
  cbRefVideo?: string | null;
  cbSocialProofImages?: string[];
  cbPlatform?: string;
  cbNumScenes?: number;
  cbSecondsPerScene?: number;
  cbCampaignStyle?: string;
  cbRemodelingIntensity?: string;
  cbProductLock?: boolean;
  cbResult?: any;
  cbActiveOutputTab?: string;

  // Object Lock
  objectLockEnabled?: boolean;
  objectLockLevel?: string;
  olBrand?: string;
  olProductName?: string;
  olPrimaryColor?: string;
  olSecondaryColor?: string;
  olMaterial?: string;
  olShape?: string;
  olLogoDescription?: string;
  olUniqueFeatures?: string;
}

/**
 * COPY ANGLE TYPES (Creative Director Agent 3 - Stage 1)
 */
export type Scene2CopyAngle =
  | 'PRACTICAL_BENEFIT'
  | 'MULTI_FEATURE_VALUE'
  | 'ROUTINE_IMPROVEMENT'
  | 'SPACE_ORGANIZATION'
  | 'COMFORT_DESIRE'
  | 'USE_CONTEXT';

export type Scene3CopyAngle =
  | 'CONDITION_VALUE'
  | 'AVAILABILITY_LOSS'
  | 'DECISION_NOW'
  | 'OPPORTUNITY_WINDOW'
  | 'DONT_MISS'
  | 'SOFT_URGENCY';

export type CopyAngle = Scene2CopyAngle | Scene3CopyAngle;

