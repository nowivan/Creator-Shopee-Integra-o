/**
 * REVERSE DNA CONTRACTS — ETAPA 1
 * Creator Intelligence Pro
 * 
 * Formalização em TypeScript dos DNAs e contratos de adaptação já existentes
 * na Engenharia Reversa ("Adaptar para outro produto"), com adapter puro
 * para compatibilidade retroativa e imutabilidade total.
 */

import { ProductVisionData } from '../cinematic/types';
import {
  AvatarReferenceProfile,
  IdentityDNA,
  FaceDNA,
  HairDNA,
  SkinDNA,
  WardrobeDNA,
} from '../visual-reference-engine';
import { ReverseVoiceProfile, VoiceGender, VoiceAudience, VoiceStyle } from './voiceProfile';

export type { ProductVisionData, AvatarReferenceProfile, IdentityDNA, FaceDNA, HairDNA, SkinDNA, WardrobeDNA };

export type ProductScale =
  | 'SMALL_HANDHELD'
  | 'MEDIUM_HANDHELD'
  | 'TABLETOP'
  | 'LARGE_OBJECT'
  | 'WEARABLE'
  | 'UNKNOWN';

export type ProductDataSourceOrigin =
  | 'USER_PROVIDED'
  | 'VISION_OBSERVED'
  | 'LEGACY_AI_INFERRED'
  | 'UNKNOWN';

export interface ProductPhysicalConstraints {
  handheld?: boolean;
  wearable?: boolean;
  tabletop?: boolean;
  largeObject?: boolean;
  flexible?: boolean;
  rigid?: boolean;
  openable?: boolean;
  closable?: boolean;
  rotatable?: boolean;
  requiresTwoHands?: boolean;
  fineManipulation?: boolean;
  stationary?: boolean;
}

export interface ProductStructuralData {
  name: string;
  category: string;
  materials?: string;
  colors?: string;
  texture?: string;
  finish?: string;
  logo?: string;
  packaging?: string;
  fixedParts?: string[];
  movingParts?: string[];
  form?: string;
}

export interface ProductCommercialData {
  mainBenefit?: string;
  mainPain?: string;
  uniqueDifferentiator?: string;
  targetAudience?: string;
  priceRange?: string;
  features?: string[];
  platform?: string;
  angleStrategy?: string;
  hookIntensity?: string;
}

export interface ProductSourceMeta {
  primarySource: 'VISION_DATA' | 'USER_INPUT' | 'LEGACY_PAYLOAD' | 'HYBRID';
  confidenceScore?: number;
  fieldOrigins?: Record<string, ProductDataSourceOrigin>;
}

export interface ProductInjectionContext {
  structural: ProductStructuralData;
  commercial: ProductCommercialData;
  sourceMeta: ProductSourceMeta;
  physicalConstraints: ProductPhysicalConstraints;
  productScale: ProductScale;
  interactionCapabilities: string[];
  rawVisionData?: ProductVisionData;
}

// ============================================================================
// IDENTITY INJECTION CONTRACTS — ETAPA 4B
// ============================================================================

export type PresenterVisibility =
  | 'FULL_PRESENTER'
  | 'UPPER_BODY'
  | 'HANDS_ONLY'
  | 'POV'
  | 'NO_PRESENTER'
  | 'UNKNOWN';

export type IdentitySourceOrigin =
  | 'IDENTITY_HUB'
  | 'SESSION_SELECTION'
  | 'LEGACY_REVERSE'
  | 'UNKNOWN';

export interface VisualIdentityData {
  avatarId?: string | number;
  avatarName?: string;
  gender?: string;
  ageRange?: string;
  faceDescriptors?: string;
  hairDescriptors?: string;
  skinDescriptors?: string;
  bodyDescriptors?: string;
  persistentAppearancePrompt?: string;
  masterPrompt?: string;
  accessories?: string[];
  referenceImage?: string;
  cleanedReferenceImage?: string;
  identityDNA?: IdentityDNA;
  faceDNA?: FaceDNA;
  hairDNA?: HairDNA;
  skinDNA?: SkinDNA;
}

export interface WardrobeData {
  clothingType?: string;
  top?: string;
  bottom?: string;
  footwear?: string;
  colors?: string;
  accessories?: string;
  wardrobeLock?: boolean;
  wardrobeDNA?: WardrobeDNA;
}

export interface VoiceDeliveryData {
  gender?: VoiceGender | string;
  audience?: VoiceAudience | string;
  style?: VoiceStyle | string;
  speakingEnergy?: number;
  speakingPace?: string;
  persona?: string;
  voiceDescription?: string;
  profile?: Partial<ReverseVoiceProfile>;
}

export interface IdentityLocks {
  appearanceLock?: boolean;
  wardrobeLock?: boolean;
  brandIdentityLock?: boolean;
  avatarConsistency?: boolean;
}

export interface IdentitySourceMeta {
  primarySource: 'IDENTITY_HUB' | 'SESSION_SELECTION' | 'LEGACY_REVERSE' | 'UNKNOWN';
  confidenceScore?: number;
  fieldOrigins?: Record<string, IdentitySourceOrigin>;
}

export interface IdentityInjectionContext {
  visual: VisualIdentityData;
  wardrobe: WardrobeData;
  voiceDelivery: VoiceDeliveryData;
  locks: IdentityLocks;
  presenterVisibility: PresenterVisibility;
  sourceMeta: IdentitySourceMeta;
  isPOVMode?: boolean;
  isHandsOnly?: boolean;
  rawProfile?: AvatarReferenceProfile;
  rawStoredAvatar?: any;
}

// ============================================================================
// MOTION ADAPTATION CONTRACTS — ETAPA 5
// ============================================================================

export type MotionCompatibilityLevel = 'DIRECT' | 'ADAPTABLE' | 'INCOMPATIBLE' | 'UNKNOWN';

export type FunctionalIntent =
  | 'DISPLAY'
  | 'POINT_FEATURE'
  | 'OPEN_DEMO'
  | 'APPLICATION_DEMO'
  | 'WEAR_DEMO'
  | 'ROTATION_SHOWCASE'
  | 'PROOF_INTERACTION'
  | 'PLACEMENT_DEMO'
  | 'TACTILE_DEMO'
  | 'COMPARISON_POSITIONING'
  | 'OTHER';

export interface RemodeledMotionScene {
  sceneId?: string;
  sourceMotion?: StrippedPhysicalMotionScene | PhysicalMotionScene;
  adaptedMotion: PhysicalMotionScene;
  functionalIntent: FunctionalIntent;
  compatibility: MotionCompatibilityLevel;
  adaptationReason?: string;
  requiresSafetyValidation: boolean;
  appliedGrip?: GripType;
  adaptedActions: string[];
  removedActions: string[];
}

export interface MotionAdaptationReport {
  directActions: string[];
  adaptedActions: string[];
  removedActions: string[];
  incompatibleActions: string[];
  continuityWarnings: string[];
  safetyValidationRequired: boolean;
  overallCompatibility: MotionCompatibilityLevel;
}

export interface RemodeledPhysicalMotion {
  scenes: RemodeledMotionScene[];
  adaptationReport: MotionAdaptationReport;
  overallCompatibility: MotionCompatibilityLevel;
  productScale?: ProductScale;
  presenterVisibility?: PresenterVisibility;
}

// ============================================================================
// REMODEL COMPILER CONTRACTS — ETAPA 6
// ============================================================================

export type SceneRole =
  | 'HOOK'
  | 'PROBLEM'
  | 'DESIRE'
  | 'SOLUTION'
  | 'DEMONSTRATION'
  | 'PROOF'
  | 'TRANSITION'
  | 'OFFER'
  | 'CTA'
  | 'OTHER';

export type PreservationAction = 'PRESERVED' | 'REMODELED' | 'NOT_APPLICABLE';

export type RemodelingIntensityTier =
  | 'PRESERVE_MAXIMUM'   // 0–14
  | 'LIGHT_ADAPTATION'   // 15–39
  | 'BALANCED'           // 40–64
  | 'STRONG_ADAPTATION'  // 65–89
  | 'HIGH_FREEDOM';      // 90–100

export type PreservationDomainPolicy = 'PRESERVE' | 'REMODEL' | 'ADAPT';

export interface DomainPreservationPolicy {
  hook: PreservationDomainPolicy;
  conversionStructure: PreservationDomainPolicy;
  ctaPosition: PreservationDomainPolicy;
  demoType: PreservationDomainPolicy;
  visualProof: PreservationDomainPolicy;
  editingPace: PreservationDomainPolicy;
  visualStyle: PreservationDomainPolicy;
  cameraMovement: PreservationDomainPolicy;
  voiceStyle: PreservationDomainPolicy;
  presentationEnergy: PreservationDomainPolicy;
  physicalMotion: PreservationDomainPolicy;
}

export interface RemodeledSceneViralStructure {
  hookFunction?: string;
  conversionRole?: string;
  visualPattern?: string;
  editingPace?: string;
  proofRole?: string;
  ctaPosition?: string;
}

export interface RemodeledSceneVisualDirection {
  cameraRole?: string;
  framingRole?: string;
  lightingRole?: string;
  compositionRole?: string;
  productPositionRole?: string;
  presenterPositionRole?: string;
  environmentRole?: string;
  motionEmphasis?: string;
}

export interface RemodeledSceneCopyDirection {
  hookPattern?: string;
  conversionPattern?: string;
  voiceDelivery?: string;
  ctaStrategy?: string;
  platformBehavior?: string;
  suggestedIntent?: string;
}

export interface RemodeledSceneVoiceDirection {
  baseVoice?: Partial<VoiceDeliveryData>;
  viralDeliveryPattern?: string;
  energy?: number;
  pace?: string;
}

export interface RemodeledSceneCtaDirection {
  actionType?: string;
  timing?: string;
  urgencyLevel?: string;
}

export interface CommercialFactCandidate {
  claim: string;
  source: string;
  confidence?: number;
}

export interface RemodeledSceneSafetyFlags {
  requiresSafetyValidation: boolean;
  continuityWarnings: string[];
  incompatibleActions: string[];
  lowTransferability: boolean;
}

export interface RemodeledSceneBlueprint {
  sceneId: string;
  sceneName?: string;
  timestamp?: string;
  duration?: number | string;
  role: SceneRole;
  viralStructure: RemodeledSceneViralStructure;
  visualDirection: RemodeledSceneVisualDirection;
  physicalMotion?: RemodeledMotionScene | PhysicalMotionScene;
  productContext?: Partial<ProductInjectionContext>;
  identityContext?: Partial<IdentityInjectionContext>;
  copyDirection: RemodeledSceneCopyDirection;
  voiceDirection: RemodeledSceneVoiceDirection;
  ctaDirection?: RemodeledSceneCtaDirection;
  preservation: Record<PreservableElementKey | string, PreservationAction>;
  commercialFactCandidates: CommercialFactCandidate[];
  safetyFlags: RemodeledSceneSafetyFlags;
}

export interface RemodeledProjectCompilationReport {
  sceneCount: number;
  intensityPolicy: RemodelingIntensityTier;
  remodelingIntensity: number;
  commercialFactsIsolated: boolean;
  identityIsolated: boolean;
  continuityWarnings: string[];
  safetyValidationRequired: boolean;
  overallCompatibility: MotionCompatibilityLevel;
}

export interface RemodeledProjectSafetySummary {
  requiresSafetyValidation: boolean;
  flaggedSceneIds: string[];
  continuityWarnings: string[];
  incompatibleActionCount: number;
}

export interface RemodeledProjectBlueprint {
  scenes: RemodeledSceneBlueprint[];
  productContext?: ProductInjectionContext;
  identityContext?: IdentityInjectionContext;
  adaptationContract?: AdaptationContract;
  preservationPolicy: DomainPreservationPolicy;
  compilationReport: RemodeledProjectCompilationReport;
  safetySummary: RemodeledProjectSafetySummary;
}

// ============================================================================
// MOTION LOCK INTEGRATION CONTRACTS — ETAPA 7A.2
// ============================================================================

export type MotionLockValidationStatus = 'PASS' | 'WARN' | 'BLOCK';

export interface MotionLockIntegrationResult {
  applied: boolean;
  input: any;
  output: any;
  validationStatus: MotionLockValidationStatus;
  warnings: string[];
}

export interface MotionLockedRemodeledScene extends RemodeledSceneBlueprint {
  motionLockResult: MotionLockIntegrationResult;
}

export interface MotionLockedProjectSummary {
  passCount: number;
  warnCount: number;
  blockCount: number;
  lockAppliedCount: number;
  overallStatus: MotionLockValidationStatus;
}

export interface MotionLockedRemodeledProject {
  scenes: MotionLockedRemodeledScene[];
  projectBlueprint: RemodeledProjectBlueprint;
  summary: MotionLockedProjectSummary;
}

// ============================================================================
// MOTION SAFETY GATE CONTRACTS — ETAPA 7A.3
// ============================================================================

export type MotionSafetyProjectStatus =
  | 'SAFE_TO_CONTINUE'
  | 'CONTINUE_WITH_WARNINGS'
  | 'BLOCKED';

export interface MotionSafetySceneGateResult {
  sceneId: string;
  status: MotionLockValidationStatus;
  canProceed: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export interface MotionSafetyGateSummary {
  totalScenes: number;
  passCount: number;
  warnCount: number;
  blockCount: number;
}

export interface MotionSafetyGateResult {
  projectStatus: MotionSafetyProjectStatus;
  sceneResults: MotionSafetySceneGateResult[];
  summary: MotionSafetyGateSummary;
  blockingReasons: string[];
  warnings: string[];
  canProceedToFinalCompilation: boolean;
}

// ============================================================================
// COMMERCIAL FACT GUARD CONTRACTS — ETAPA 7B
// ============================================================================

export type CommercialFactCategory =
  | 'PRICE'
  | 'DISCOUNT'
  | 'PROMOTION'
  | 'STOCK'
  | 'DEADLINE'
  | 'EXCLUSIVITY'
  | 'RANKING'
  | 'DEMAND'
  | 'SHIPPING'
  | 'PERFORMANCE'
  | 'BENEFIT'
  | 'DIFFERENTIATOR'
  | 'OTHER';

export type CommercialFactSourceAuthority =
  | 'USER_PROVIDED'
  | 'VISION_OBSERVED'
  | 'LEGACY_AI_INFERRED'
  | 'REJECTED_REFERENCE_FACT'
  | 'UNKNOWN';

export type CommercialFactValidationStatus =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'REJECTED'
  | 'UNKNOWN';

export type CommercialProjectGuardStatus =
  | 'COMMERCIAL_SAFE'
  | 'COMMERCIAL_SAFE_WITH_WARNINGS'
  | 'COMMERCIAL_BLOCKED';

export interface CommercialFactValidationResult {
  factId: string;
  sceneId?: string;
  type: CommercialFactCategory;
  value: string;
  source: CommercialFactSourceAuthority;
  status: CommercialFactValidationStatus;
  reasons: string[];
  normalizedEvidence?: Record<string, any>;
}

export interface CommercialFactGuardResult {
  facts: CommercialFactValidationResult[];
  verifiedFacts: CommercialFactValidationResult[];
  unverifiedFacts: CommercialFactValidationResult[];
  rejectedFacts: CommercialFactValidationResult[];
  warnings: string[];
  blockingReasons: string[];
  canProceedToCopyCompilation: boolean;
  projectStatus: CommercialProjectGuardStatus;
  effectiveVerifiedCommercialFacts: Record<string, any>;
}

export interface CommercialGuardedRemodeledScene extends RemodeledSceneBlueprint {
  commercialFactValidation: CommercialFactValidationResult[];
}

export interface CommercialGuardedRemodeledProject {
  scenes: CommercialGuardedRemodeledScene[];
  projectBlueprint: RemodeledProjectBlueprint;
  guardResult: CommercialFactGuardResult;
}

// ============================================================================
// FINAL COMPILATION GATE CONTRACTS — ETAPA 8
// ============================================================================

export type FinalCompilationProjectStatus =
  | 'READY_FOR_FINAL_COMPILATION'
  | 'READY_WITH_WARNINGS'
  | 'BLOCKED';

export type FinalCompilationSceneStatus = 'READY' | 'WARN' | 'BLOCK';

export interface FinalCompilationSceneResult {
  sceneId: string;
  status: FinalCompilationSceneStatus;
  canCompile: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export interface GateCheckDetail {
  status: 'PASS' | 'WARN' | 'BLOCK';
  passed: boolean;
  details: string[];
}

export interface FinalCompilationGateChecks {
  motionSafety: GateCheckDetail;
  commercialSafety: GateCheckDetail;
  identityIsolation: GateCheckDetail;
  productContext: GateCheckDetail;
  referenceSanitization: GateCheckDetail;
}

export interface FinalCompilationGateSummary {
  totalScenes: number;
  readyScenes: number;
  warningScenes: number;
  blockedScenes: number;
}

export interface FinalCompilationGateInput {
  project: RemodeledProjectBlueprint;
  motionSafety?: MotionSafetyGateResult | null;
  commercialSafety?: CommercialFactGuardResult | null;
  productContext?: ProductInjectionContext | null;
  identityContext?: IdentityInjectionContext | null;
  strippedReference?: StrippedReferenceDNA | null;
}

export interface FinalCompilationGateResult {
  status: FinalCompilationProjectStatus;
  canCompileFinal: boolean;
  sceneResults: FinalCompilationSceneResult[];
  blockingReasons: string[];
  warnings: string[];
  checks: FinalCompilationGateChecks;
  summary: FinalCompilationGateSummary;
}

export interface ApprovedFinalSceneMotionLockDirective {
  sceneId: string;
  prompt_addition?: string;
  negative_prompt_addition?: string;
  settings_addition?: any;
  locks?: any;
  region_locks_template?: any[];
  flow_agent_instructions?: any;
}

export interface ApprovedFinalCopyScene {
  sceneId: string;
  role: string;
  copyIntent?: string;
  voiceStyle?: string;
  ctaStrategy?: string;
  verifiedFacts: string[];
}

export interface ApprovedFinalVisualScene {
  sceneId: string;
  role: string;
  visualDirection: RemodeledSceneVisualDirection;
  structural?: ProductStructuralData;
  visualIdentity?: VisualIdentityData;
  physicalMotion?: any;
  motionLockPrompt?: string;
}

export interface ApprovedFinalCompilationInput {
  approvedProject: RemodeledProjectBlueprint;
  motionLockDirectives: ApprovedFinalSceneMotionLockDirective[];
  verifiedCommercialFacts: CommercialFactValidationResult[];
  identityContext?: IdentityInjectionContext;
  productContext?: ProductInjectionContext;
  copyInputPayload: {
    platform?: string;
    copyViralDNA?: CopyViralDNA;
    scenes: ApprovedFinalCopyScene[];
  };
  visualInputPayload: {
    scenes: ApprovedFinalVisualScene[];
  };
  warnings: string[];
}

// ============================================================================
// FINAL REMODELED COPY COMPILATION CONTRACTS — ETAPA 9A
// ============================================================================

export interface FinalRemodeledCopyScene {
  sceneId: string;
  role: string;
  dialogue_pt_br: string;
  appliedFacts: string[];
  omittedFacts: string[];
  warnings: string[];
}

export interface FinalRemodeledCopyReport {
  generatedScenes: number;
  factBackedClaims: number;
  omittedUnverifiedClaims: number;
  rolePurityWarnings: string[];
  copyWarnings: string[];
}

export interface FinalRemodeledCopyProject {
  scenes: FinalRemodeledCopyScene[];
  copyReport: FinalRemodeledCopyReport;
}

// ============================================================================
// FINAL REMODELED VISUAL PROMPT COMPILATION CONTRACTS — ETAPA 9B
// ============================================================================

export interface FinalRemodeledVisualScene {
  sceneId: string;
  role: string;
  visual_prompt_en: string;
  negative_prompt_en?: string;
  motionLockDirectives?: ApprovedFinalSceneMotionLockDirective;
  appliedProductFacts: string[];
  identityApplied: boolean;
  warnings: string[];
}

export interface FinalRemodeledVisualReport {
  generatedScenes: number;
  productLockApplied: number;
  identityLockApplied: number;
  motionLockApplied: number;
  referenceLeaksBlocked: number;
  continuityWarnings: string[];
  visualWarnings: string[];
}

export interface FinalRemodeledVisualProject {
  scenes: FinalRemodeledVisualScene[];
  visualReport: FinalRemodeledVisualReport;
}

// ============================================================================
// FINAL SCENE ASSEMBLY CONTRACTS — ETAPA 10
// ============================================================================

export type FinalAssemblySceneStatus = 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED';
export type FinalAssemblyProjectStatus = 'READY_FOR_DELIVERY' | 'READY_WITH_WARNINGS' | 'BLOCKED';

export interface FinalRemodeledScene {
  sceneId: string;
  role: string;
  timestamp?: string;
  duration?: number | string;

  visual_prompt_en: string;
  action_prompt_en?: string;
  actions?: string[];
  negative_prompt_en?: string;

  dialogue_pt_br: string;

  voice_description_en?: string;

  motionLockDirectives?: ApprovedFinalSceneMotionLockDirective;

  productContextRef?: {
    name?: string;
    category?: string;
    appliedFacts?: string[];
  };
  identityContextRef?: {
    avatarName?: string;
    applied?: boolean;
  };

  warnings: string[];

  assemblyStatus: FinalAssemblySceneStatus;
}

export interface FinalAssemblyReport {
  totalScenes: number;
  readyScenes: number;
  warningScenes: number;
  blockedScenes: number;
  sceneIdMismatches: string[];
  copyWarnings: string[];
  visualWarnings: string[];
  motionWarnings: string[];
  commercialWarnings: string[];
  continuityWarnings: string[];
  assemblyWarnings: string[];
}

export interface FinalRemodeledSceneProject {
  scenes: FinalRemodeledScene[];
  assemblyReport: FinalAssemblyReport;
  projectStatus: FinalAssemblyProjectStatus;
  platform?: string;
  adaptationContract?: AdaptationContract;
  compilationMetadata?: {
    assembledAt: string;
    sourceApprovedInputVersion?: string;
  };
}

// ============================================================================
// REVERSE PIPELINE ORCHESTRATOR CONTRACTS — ETAPA 12A.1
// ============================================================================

export type ReverseRemodelPipelineStatus = 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED' | 'FAILED';

export interface ReverseRemodelPipelineInput {
  rawReferenceResult: any;
  productContext?: ProductInjectionContext | null;
  identityContext?: IdentityInjectionContext | null;
  productBridgeInput?: {
    legacyPayload?: any;
    userFields?: any;
    productVisionData?: any;
  };
  identityBridgeInput?: {
    storedAvatar?: any;
    avatarProfile?: any;
    sessionOverrides?: any;
    legacyCreatorFields?: any;
    locks?: any;
    isPOVMode?: boolean;
    isHandsOnly?: boolean;
  };
  adaptationContractOverride?: Partial<AdaptationContract>;
}

export interface ReverseRemodelPipelineResult {
  status: ReverseRemodelPipelineStatus;
  finalSceneProject?: FinalRemodeledSceneProject;
  finalCopyProject?: FinalRemodeledCopyProject;
  finalVisualProject?: FinalRemodeledVisualProject;
  approvedCompilationInput?: ApprovedFinalCompilationInput | null;
  gateResult?: FinalCompilationGateResult;
  motionSafetyResult?: MotionSafetyGateResult;
  commercialSafetyResult?: CommercialFactGuardResult;
  remodelBlueprint?: RemodeledProjectBlueprint;
  motionLockedProject?: MotionLockedRemodeledProject;
  strippedReference?: StrippedReferenceDNA;
  adaptedMotion?: RemodeledPhysicalMotion;
  productContext?: ProductInjectionContext;
  identityContext?: IdentityInjectionContext;
  warnings: string[];
  blockingReasons: string[];
  failedStage?: string;
  error?: string;
}

// ============================================================================
// 1. PRESERVATION CONTRACT
// ============================================================================

export type PreservableElementKey =
  | 'hook'
  | 'conversion_structure'
  | 'cta_position'
  | 'demo_type'
  | 'visual_proof'
  | 'editing_pace'
  | 'visual_style'
  | 'camera_movement'
  | 'voice_style'
  | 'presentation_energy';

export const ALL_PRESERVABLE_ELEMENTS: PreservableElementKey[] = [
  'hook',
  'conversion_structure',
  'cta_position',
  'demo_type',
  'visual_proof',
  'editing_pace',
  'visual_style',
  'camera_movement',
  'voice_style',
  'presentation_energy',
];

export interface PreservationContract {
  preservedElements: PreservableElementKey[];
  preservedElementsList?: string[];
  remodeledElementsList?: string[];
  whatPreserved?: string;
  whatChanged?: string;
}

// ============================================================================
// 2. ADAPTATION CONTRACT
// ============================================================================

export type AdaptationMode = 'preservar_viral' | 'preservar_visual' | 'remodelar_total';

export type HookIntensity = 'normal' | 'forte' | 'agressivo';

export type AngleStrategy = 'emergencia' | 'economia' | 'autoridade' | 'praticidade' | 'independencia';

export type AdaptationPlatform =
  | 'TikTok Shop'
  | 'Shopee Vídeo'
  | 'Mercado Livre'
  | 'Instagram Reels'
  | 'YouTube Shorts'
  | 'Facebook Reels'
  | string;

export interface AdaptationNewProductSummary {
  name?: string;
  targetAudience?: string;
  platform?: string;
  mainBenefit?: string;
  ctaStrategy?: string;
}

export interface PlatformAdaptationReport {
  platformSelected?: string;
  hookStrategy?: string;
  ctaStrategy?: string;
  recommendedDuration?: string;
  voiceStyle?: string;
  recommendedPacing?: string;
}

export interface AdaptationContract {
  adaptationMode: AdaptationMode;
  remodelingIntensity: number; // 0 - 100
  preserveElements: PreservableElementKey[];
  angleStrategy?: AngleStrategy;
  hookIntensity?: HookIntensity;
  platform?: AdaptationPlatform;
  similarityRisk?: 'High' | 'Medium' | 'Low' | string;
  newProductSummary?: AdaptationNewProductSummary;
  adaptationSummary?: string;
  platformReport?: PlatformAdaptationReport;
}

// ============================================================================
// 3. VIRAL STRUCTURE DNA
// ============================================================================

export interface ViralStructureDNA {
  hook: {
    description: string;
    intensity?: HookIntensity;
    timing?: string;
    retentionMechanism?: string;
  };
  conversionArc: {
    description: string;
    sceneOrder?: string[];
  };
  visualPattern: {
    description: string;
  };
  preservation: PreservationContract;
  remodelingIntensity: number;
  platformReport?: {
    platformSelected?: string;
    recommendedDuration?: string;
    recommendedPacing?: string;
  };
}

// ============================================================================
// 4. COPY VIRAL DNA
// ============================================================================

export interface CopyViralDNA {
  hookPattern?: string;
  conversionPattern?: string;
  voiceDelivery: {
    description: string;
    voiceStyle?: string;
  };
  ctaStrategy: {
    description: string;
    actionType?: string;
  };
  platform?: string;
  platformReport?: {
    hookStrategy?: string;
    ctaStrategy?: string;
    voiceStyle?: string;
  };
}

// ============================================================================
// 5. PHYSICAL MOTION DNA (CONTRATO ESTRUTURAL & OBSERVAÇÃO)
// ============================================================================

export type GripType =
  | 'ONE_HAND_SUPPORT'
  | 'TWO_HAND_SUPPORT'
  | 'PINCH'
  | 'PALM_SUPPORT'
  | 'EDGE_GRIP'
  | 'NO_GRIP'
  | 'UNKNOWN';

export type ProductOrientation =
  | 'FRONT_TO_CAMERA'
  | 'SIDE_TO_CAMERA'
  | 'TOP_TO_CAMERA'
  | 'ANGLED'
  | 'NATURAL_USE_ORIENTATION'
  | 'UNKNOWN';

export type MotionComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PhysicalMotionScene {
  sceneId?: string;
  startPose?: string;
  bodyPosition?: string;
  actionOrder?: string[];
  handPath?: string[];
  gazePath?: string[];
  productInteraction?: string[];
  contactPoints?: string[];
  gripType?: GripType;
  productOrientation?: ProductOrientation;
  microPauses?: string[];
  continuityNotes?: string[];
  endPose?: string;
  motionComplexity?: MotionComplexity;
}

export interface PhysicalMotionDNA {
  scenes: PhysicalMotionScene[];
}

export type TransferabilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RemovedElementsReport {
  product: string[];
  commercialFacts: string[];
  identity: string[];
  copyLiteral: string[];
}

export interface PreservationReport {
  removedProductSpecific: string[];
  removedCommercialFacts: string[];
  removedIdentitySpecific: string[];
  removedLiteralCopy: string[];
  preservedStructuralElements: string[];
  lowTransferabilityMotion: string[];
}

export interface StrippedPhysicalMotionScene extends PhysicalMotionScene {
  transferability: TransferabilityLevel;
}

export interface StrippedPhysicalMotionDNA {
  scenes: StrippedPhysicalMotionScene[];
  overallTransferability: TransferabilityLevel;
}

export interface StrippedReferenceDNA {
  viralStructureDNA: ViralStructureDNA;
  copyViralDNA: CopyViralDNA;
  physicalMotionDNA?: StrippedPhysicalMotionDNA;
  removedElements: RemovedElementsReport;
  preservationReport: PreservationReport;
  overallTransferability: TransferabilityLevel;
}

// ============================================================================
// 6. UNIFIED NORMALIZED REVERSE DNA
// ============================================================================

export interface NormalizedReverseDNA {
  viralStructureDNA: ViralStructureDNA;
  copyViralDNA: CopyViralDNA;
  physicalMotionDNA?: PhysicalMotionDNA;
  adaptationContract: AdaptationContract;
}

// ============================================================================
// 7. LEGACY DNA ADAPTER (PURE FUNCTION - IMMUTABLE)
// ============================================================================

/**
 * Normaliza o objeto de resultado legado retornado por handleAdaptProduct
 * ou pela análise de engenharia reversa em contratos tipados estritos,
 * sem modificar ou mutar o objeto original.
 */
export function normalizeLegacyReverseDNA(rawResult: any): NormalizedReverseDNA {
  const result = (rawResult && typeof rawResult === 'object') ? rawResult : {};

  // 1. Extração segura de campos de preservação
  const preservedList: string[] = Array.isArray(result.preserved_elements_list)
    ? result.preserved_elements_list
    : [];

  const rawPreserveElements: any[] = Array.isArray(result.preserveElements)
    ? result.preserveElements
    : [];

  const validPreservedKeys: PreservableElementKey[] = rawPreserveElements.filter(
    (k): k is PreservableElementKey => ALL_PRESERVABLE_ELEMENTS.includes(k)
  );

  const preservation: PreservationContract = {
    preservedElements: validPreservedKeys.length > 0 ? validPreservedKeys : [...ALL_PRESERVABLE_ELEMENTS],
    preservedElementsList: preservedList.length > 0 ? preservedList : undefined,
    remodeledElementsList: Array.isArray(result.remodeled_elements_list) ? result.remodeled_elements_list : undefined,
    whatPreserved: typeof result.what_preserved === 'string' ? result.what_preserved : undefined,
    whatChanged: typeof result.what_changed === 'string' ? result.what_changed : undefined,
  };

  // 2. Extração segura do relatório de plataforma
  const rawReport = result.platform_adaptation_report || {};
  const platformReport: PlatformAdaptationReport | undefined = Object.keys(rawReport).length > 0
    ? {
        platformSelected: rawReport.platform_selected || result.platform || undefined,
        hookStrategy: rawReport.hook_strategy || undefined,
        ctaStrategy: rawReport.cta_strategy || undefined,
        recommendedDuration: rawReport.recommended_duration || undefined,
        voiceStyle: rawReport.voice_style || undefined,
        recommendedPacing: rawReport.recommended_pacing || undefined,
      }
    : undefined;

  // 3. Extração segura do sumário do novo produto
  const rawNewProduct = result.new_product_adaptation_summary || {};
  const newProductSummary: AdaptationNewProductSummary | undefined = Object.keys(rawNewProduct).length > 0
    ? {
        name: rawNewProduct.name || undefined,
        targetAudience: rawNewProduct.target_audience || undefined,
        platform: rawNewProduct.platform || undefined,
        mainBenefit: rawNewProduct.main_benefit || undefined,
        ctaStrategy: rawNewProduct.cta_strategy || undefined,
      }
    : undefined;

  const remodelingIntensity = typeof result.remodeling_intensity === 'number'
    ? result.remodeling_intensity
    : typeof result.remodelingIntensity === 'number'
      ? result.remodelingIntensity
      : 50;

  // 4. Construção do AdaptationContract
  const adaptationContract: AdaptationContract = {
    adaptationMode: (['preservar_viral', 'preservar_visual', 'remodelar_total'].includes(result.adaptationMode))
      ? result.adaptationMode
      : 'preservar_viral',
    remodelingIntensity,
    preserveElements: preservation.preservedElements,
    angleStrategy: result.angleStrategy || undefined,
    hookIntensity: result.hookIntensity || undefined,
    platform: result.platform || platformReport?.platformSelected || undefined,
    similarityRisk: result.similarity_risk || undefined,
    newProductSummary,
    adaptationSummary: typeof result.adaptation_summary === 'string' ? result.adaptation_summary : undefined,
    platformReport,
  };

  // 5. Cenas e timing para extração de sceneOrder / timing
  const scenes = Array.isArray(result.veo_structure) && result.veo_structure.length > 0
    ? result.veo_structure
    : Array.isArray(result.sora_structure) && result.sora_structure.length > 0
      ? result.sora_structure
      : Array.isArray(result.grok_structure) && result.grok_structure.length > 0
        ? result.grok_structure
        : Array.isArray(result.blocks)
          ? result.blocks
          : [];

  const firstScene = scenes[0] || {};
  const hookTiming = firstScene.timestamp || firstScene.estimated_time || (firstScene.start !== undefined ? `${firstScene.start}-${firstScene.end}s` : undefined);
  const sceneOrder = scenes.map((s: any, idx: number) => s.scene_name || s.name || `Cena ${idx + 1}`);

  // 6. Construção do ViralStructureDNA
  const viralStructureDNA: ViralStructureDNA = {
    hook: {
      description: typeof result.hook_dna === 'string' && result.hook_dna.trim()
        ? result.hook_dna
        : (firstScene.visual_prompt_en || firstScene.visual_context_en || 'Hook visual e retenção inicial padrão'),
      intensity: result.hookIntensity || undefined,
      timing: hookTiming,
      retentionMechanism: platformReport?.hookStrategy || undefined,
    },
    conversionArc: {
      description: typeof result.conversion_dna === 'string' && result.conversion_dna.trim()
        ? result.conversion_dna
        : 'Estrutura de conversão direta com dor, demonstração e CTA.',
      sceneOrder: sceneOrder.length > 0 ? sceneOrder : undefined,
    },
    visualPattern: {
      description: typeof result.visual_dna === 'string' && result.visual_dna.trim()
        ? result.visual_dna
        : (result.ambientDna || 'Conceito visual UGC limpo com iluminação natural e foco em produto'),
    },
    preservation,
    remodelingIntensity,
    platformReport: platformReport ? {
      platformSelected: platformReport.platformSelected,
      recommendedDuration: platformReport.recommendedDuration,
      recommendedPacing: platformReport.recommendedPacing,
    } : undefined,
  };

  // 7. Construção do CopyViralDNA
  const copyViralDNA: CopyViralDNA = {
    hookPattern: typeof result.hook_dna === 'string' ? result.hook_dna : undefined,
    conversionPattern: typeof result.conversion_dna === 'string' ? result.conversion_dna : undefined,
    voiceDelivery: {
      description: typeof result.voice_dna === 'string' && result.voice_dna.trim()
        ? result.voice_dna
        : (firstScene.voice_description_en || 'Locução natural, persuasiva e dinâmica em PT-BR'),
      voiceStyle: platformReport?.voiceStyle || undefined,
    },
    ctaStrategy: {
      description: typeof result.cta_dna === 'string' && result.cta_dna.trim()
        ? result.cta_dna
        : (newProductSummary?.ctaStrategy || platformReport?.ctaStrategy || 'Chamada para ação direta'),
      actionType: platformReport?.ctaStrategy || undefined,
    },
    platform: result.platform || platformReport?.platformSelected || undefined,
    platformReport: platformReport ? {
      hookStrategy: platformReport.hookStrategy,
      ctaStrategy: platformReport.ctaStrategy,
      voiceStyle: platformReport.voiceStyle,
    } : undefined,
  };

  // 8. Opcional: PhysicalMotionDNA se já presente no resultado
  const physicalMotionDNA: PhysicalMotionDNA | undefined = (result.physicalMotionDNA && typeof result.physicalMotionDNA === 'object')
    ? result.physicalMotionDNA
    : undefined;

  return {
    viralStructureDNA,
    copyViralDNA,
    ...(physicalMotionDNA ? { physicalMotionDNA } : {}),
    adaptationContract,
  };
}
