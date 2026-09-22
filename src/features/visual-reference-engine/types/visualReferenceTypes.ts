/**
 * VISUAL REFERENCE ENGINE — TYPES & CANONICAL CONTRACTS — V1 FROZEN ARCHITECTURE
 * Part of Visual Reference Engine V1.0.0 (Release Candidate)
 * Canonical Contracts: VisualReferenceAnalysis, VisualEvidence<T>, IdentityDNA, ScenePhotoStateDNA,
 * ReferenceCleaningContract, AvatarReferenceProfile, AvatarIdentityContext, SceneReferenceContext.
 */

// ============================================================================
// 2. EVIDENCE STATUS & GENERIC EVIDENCE CONTAINER
// ============================================================================

export type VisualEvidenceStatus =
  | 'VISIBLE'
  | 'PARTIAL'
  | 'INFERRED'
  | 'UNKNOWN';

export interface VisualEvidence<T = string> {
  status: VisualEvidenceStatus;
  value?: T;
  confidence?: number;
  description?: string;
}

// ============================================================================
// 3. FRAME DNA
// ============================================================================

export interface FrameDNA {
  orientation?: VisualEvidence<'portrait' | 'landscape' | 'square' | 'unknown'>;
  aspectRatio?: VisualEvidence<string>;
  framing?: VisualEvidence<string>;
  crop?: VisualEvidence<string>;
  headroom?: VisualEvidence<string>;
  sideMargins?: VisualEvidence<string>;
}

// ============================================================================
// 4. SUBJECT DNA
// ============================================================================

export interface SubjectDNA {
  count?: VisualEvidence<number>;
  type?: VisualEvidence<string>;
  orientation?: VisualEvidence<string>;
  positionInFrame?: VisualEvidence<string>;
  visibleProportions?: VisualEvidence<string>;
  occlusion?: VisualEvidence<string>;
}

// ============================================================================
// 5. IDENTITY DNA (Strictly intrinsic; isolated from transient photo state)
// ============================================================================

export interface IdentityDNA {
  visibleFacialAppearance?: VisualEvidence<string>;
  facialProportions?: VisualEvidence<string>;
  skinCharacteristics?: VisualEvidence<string>;
  hairCharacteristics?: VisualEvidence<string>;
  distinguishingTraits?: VisualEvidence<string[]>;
}

// ============================================================================
// 6. FACE / HAIR / SKIN / EXPRESSION DNA
// ============================================================================

export interface FaceDNA {
  visibility?: VisualEvidence<string>;
  headOrientation?: VisualEvidence<string>;
  eyeAppearance?: VisualEvidence<string>;
  eyebrowAppearance?: VisualEvidence<string>;
  noseAppearance?: VisualEvidence<string>;
  mouthAppearance?: VisualEvidence<string>;
  distinguishingFeatures?: VisualEvidence<string[]>;
}

export interface HairDNA {
  color?: VisualEvidence<string>;
  length?: VisualEvidence<string>;
  texture?: VisualEvidence<string>;
  density?: VisualEvidence<string>;
  parting?: VisualEvidence<string>;
  hairstyle?: VisualEvidence<string>;
  strandBehavior?: VisualEvidence<string>;
  hairlineVisibility?: VisualEvidence<string>;
}

export interface SkinDNA {
  visibleTone?: VisualEvidence<string>;
  surfaceTexture?: VisualEvidence<string>;
  highlights?: VisualEvidence<string>;
  shadowVariation?: VisualEvidence<string>;
  visibleMarks?: VisualEvidence<string[]>;
  retouchingLevel?: VisualEvidence<string>;
}

export interface ExpressionDNA {
  eyeState?: VisualEvidence<string>;
  eyebrowState?: VisualEvidence<string>;
  mouthState?: VisualEvidence<string>;
  facialTension?: VisualEvidence<string>;
  gazeDirection?: VisualEvidence<string>;
}

// ============================================================================
// 7. POSE DNA (Detailed, decoupled bilateral articulation)
// ============================================================================

export interface ArmDNA {
  upperArmDirection?: VisualEvidence<string>;
  elbowState?: VisualEvidence<string>;
  forearmDirection?: VisualEvidence<string>;
  occlusion?: VisualEvidence<string>;
}

export interface HandDNA {
  visibility?: VisualEvidence<string>;
  wristOrientation?: VisualEvidence<string>;
  palmOrientation?: VisualEvidence<string>;
  fingerConfiguration?: VisualEvidence<string>;
  gesture?: VisualEvidence<string>;
  contactTarget?: VisualEvidence<string>;
}

export interface PoseDNA {
  bodyOrientation?: VisualEvidence<string>;
  headOrientation?: VisualEvidence<string>;
  shoulderLine?: VisualEvidence<string>;
  torsoOrientation?: VisualEvidence<string>;
  hipOrientation?: VisualEvidence<string>;
  weightDistribution?: VisualEvidence<string>;

  leftArm?: ArmDNA;
  rightArm?: ArmDNA;
  leftHand?: HandDNA;
  rightHand?: HandDNA;

  legConfiguration?: VisualEvidence<string>;
}

// ============================================================================
// 8. WARDROBE DNA
// ============================================================================

export interface GarmentDNA {
  type?: VisualEvidence<string>;
  color?: VisualEvidence<string>;
  fabricAppearance?: VisualEvidence<string>;
  fit?: VisualEvidence<string>;
  silhouette?: VisualEvidence<string>;
  neckline?: VisualEvidence<string>;
  sleeves?: VisualEvidence<string>;
  seams?: VisualEvidence<string>;
  folds?: VisualEvidence<string>;
  closures?: VisualEvidence<string>;
  patterns?: VisualEvidence<string>;
  printedElements?: VisualEvidence<string[]>;
}

export interface WardrobeDNA {
  top?: GarmentDNA;
  bottom?: GarmentDNA;
  footwear?: GarmentDNA;
  otherGarments?: GarmentDNA[];
}

// ============================================================================
// 9. ACCESSORIES & BRANDING DNA
// ============================================================================

export interface AccessoriesDNA {
  jewelry?: VisualEvidence<string[]>;
  eyewear?: VisualEvidence<string>;
  headwear?: VisualEvidence<string>;
  bags?: VisualEvidence<string>;
  belts?: VisualEvidence<string>;
  watches?: VisualEvidence<string>;
  other?: VisualEvidence<string[]>;
}

export interface BrandingElementDNA {
  type: 'logo' | 'wordmark' | 'symbol' | 'label' | 'product_marking';
  location?: VisualEvidence<string>;
  description?: VisualEvidence<string>;
  physicallyAttached?: boolean;
}

export interface BrandingDNA {
  elements: BrandingElementDNA[];
}

// ============================================================================
// 10. TEXT CLASSIFICATION & VISUAL TEXT ELEMENTS
// ============================================================================

export type VisualTextType =
  | 'overlay_text'
  | 'caption'
  | 'price'
  | 'ui_element'
  | 'watermark'
  | 'physical_text'
  | 'physical_logo'
  | 'packaging_text';

export interface VisualTextElement {
  type: VisualTextType;
  content?: VisualEvidence<string>;
  location?: VisualEvidence<string>;
  physicallyAttached?: boolean;
  cleaningDefault:
    | 'REMOVE'
    | 'PRESERVE'
    | 'CONTEXT_DEPENDENT';
}

// ============================================================================
// 11. OBJECT DNA
// ============================================================================

export interface SceneObjectDNA {
  type?: VisualEvidence<string>;
  color?: VisualEvidence<string>;
  material?: VisualEvidence<string>;
  position?: VisualEvidence<string>;
  scale?: VisualEvidence<string>;
  orientation?: VisualEvidence<string>;
  interactionWithSubject?: VisualEvidence<string>;
  occlusion?: VisualEvidence<string>;
}

// ============================================================================
// 12. CAMERA DNA
// ============================================================================

export interface CameraDNA {
  viewpoint?: VisualEvidence<string>;
  height?: VisualEvidence<string>;
  angle?: VisualEvidence<string>;
  distanceClass?: VisualEvidence<string>;
  perspective?: VisualEvidence<string>;
  depthOfField?: VisualEvidence<string>;
}

// ============================================================================
// 13. COMPOSITION DNA
// ============================================================================

export interface CompositionDNA {
  subjectPlacement?: VisualEvidence<string>;
  visualBalance?: VisualEvidence<string>;
  foregroundBackgroundRelationship?: VisualEvidence<string>;
  negativeSpace?: VisualEvidence<string>;
  relativeObjectPositions?: VisualEvidence<string>;
  dominantVisualHierarchy?: VisualEvidence<string>;
}

// ============================================================================
// 14. LIGHTING DNA
// ============================================================================

export interface LightingDNA {
  lightType?: VisualEvidence<
    'natural-looking' |
    'artificial-looking' |
    'mixed' |
    'indeterminate'
  >;

  softness?: VisualEvidence<
    'soft' |
    'moderately-defined' |
    'hard' |
    'mixed'
  >;

  direction?: VisualEvidence<string>;
  intensity?: VisualEvidence<string>;
  shadows?: VisualEvidence<string>;
  whiteBalance?: VisualEvidence<string>;
  exposureStyle?: VisualEvidence<string>;
}

// ============================================================================
// 15. BACKGROUND / TEXTURE / STYLE DNA
// ============================================================================

export interface BackgroundDNA {
  type?: VisualEvidence<string>;
  dominantColors?: VisualEvidence<string[]>;
  surfaces?: VisualEvidence<string[]>;
  depth?: VisualEvidence<string>;
  visibleEnvironmentElements?: VisualEvidence<string[]>;
  blur?: VisualEvidence<string>;
  negativeSpace?: VisualEvidence<string>;
}

export interface TextureDNA {
  skinTexture?: VisualEvidence<string>;
  fabricTexture?: VisualEvidence<string>;
  surfaceTexture?: VisualEvidence<string>;
  gloss?: VisualEvidence<string>;
  matteResponse?: VisualEvidence<string>;
  reflections?: VisualEvidence<string>;
  fineDetail?: VisualEvidence<string>;
}

export interface StyleDNA {
  visualTreatment?: VisualEvidence<string>;
  realismLevel?: VisualEvidence<string>;
  photographicVsRendered?: VisualEvidence<string>;
  retouching?: VisualEvidence<string>;
  detailLevel?: VisualEvidence<string>;
  materialPlausibility?: VisualEvidence<string>;
}

// ============================================================================
// 16. SCENE PHOTO STATE DNA (Separated from IdentityDNA)
// ============================================================================

export interface ScenePhotoStateDNA {
  expression?: ExpressionDNA;
  pose?: PoseDNA;
  wardrobe?: WardrobeDNA;
  accessories?: AccessoriesDNA;
  objects?: SceneObjectDNA[];
  background?: BackgroundDNA;
  lighting?: LightingDNA;
  camera?: CameraDNA;
  composition?: CompositionDNA;
}

// ============================================================================
// 17. PRESERVATION CONTRACT
// ============================================================================

export interface PreservationContract {
  preservePose?: boolean;
  preserveWardrobe?: boolean;
  preserveColors?: boolean;
  preservePhysicalBranding?: boolean;
  preserveRelativeProportions?: boolean;
  preserveCrop?: boolean;
  preserveSubjectPlacement?: boolean;
  preserveOcclusions?: boolean;

  avoidUnsupportedObjects?: boolean;
  avoidUnsupportedDetails?: boolean;
  preferUnknownOverFabrication?: boolean;
}

// ============================================================================
// 18. REFERENCE CLEANING CONTRACT
// ============================================================================

export interface ReferenceCleaningContract {
  removeOverlayText?: boolean;
  removeCaptions?: boolean;
  removeUiElements?: boolean;
  removeUnrelatedClutter?: boolean;
  replaceBackgroundWithWhite?: boolean;

  preservePrincipalSubject?: boolean;
  preserveWardrobe?: boolean;
  preserveProduct?: boolean;
  preservePose?: boolean;
  preservePhysicalLogos?: boolean;

  improveVisualClarity?: boolean;
}

// ============================================================================
// 19. ROOT MODEL
// ============================================================================

export interface VisualReferenceAnalysis {
  frame?: FrameDNA;
  subject?: SubjectDNA;

  identity?: IdentityDNA;

  face?: FaceDNA;
  hair?: HairDNA;
  skin?: SkinDNA;

  sceneState?: ScenePhotoStateDNA;

  branding?: BrandingDNA;
  textElements?: VisualTextElement[];
  objects?: SceneObjectDNA[];

  texture?: TextureDNA;
  style?: StyleDNA;

  preservation?: PreservationContract;
  cleaning?: ReferenceCleaningContract;

  unknown?: string[];
}

// ============================================================================
// 20. AVATAR REFERENCE PROFILE & HANDOFF CONTEXT
// ============================================================================

import { BrandMarkProfile } from './brandMarkTypes';
export * from './brandMarkTypes';

export interface AvatarReferenceProfile {
  id: string;

  originalImage: string;
  cleanedImage?: string;

  analysis: VisualReferenceAnalysis;

  identityDNA?: IdentityDNA;
  sceneStateDNA?: ScenePhotoStateDNA;

  identityPrompt: string;
  brandMarkProfile?: BrandMarkProfile;

  createdAt: number;
  updatedAt: number;
}

export interface AvatarIdentityContext {
  identityDNA?: IdentityDNA;
  identityPrompt: string;
  referenceImage: string;
  cleanedReferenceImage?: string;
  brandMarkProfile?: BrandMarkProfile;
}
