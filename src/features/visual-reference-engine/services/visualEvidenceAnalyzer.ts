/**
 * VISUAL EVIDENCE ANALYZER SERVICE — V1 FROZEN ARCHITECTURE
 * Part of Visual Reference Engine V1.0.0 (Release Candidate)
 * Responsibilities: Empirical multimodal extraction of Visual DNA without hallucinations.
 * Source of Truth: VisualReferenceAnalysis / IdentityDNA
 * AI Budget: Strictly 1 multimodal AI call per image (gemini-3.7-flash).
 */

import { processGeminiAPI, safeJSONParse } from '../../../utils';
import {
  VisualEvidenceStatus,
  VisualEvidence,
  FrameDNA,
  SubjectDNA,
  IdentityDNA,
  FaceDNA,
  HairDNA,
  SkinDNA,
  ExpressionDNA,
  ArmDNA,
  HandDNA,
  PoseDNA,
  GarmentDNA,
  WardrobeDNA,
  AccessoriesDNA,
  BrandingElementDNA,
  BrandingDNA,
  VisualTextType,
  VisualTextElement,
  SceneObjectDNA,
  CameraDNA,
  CompositionDNA,
  LightingDNA,
  BackgroundDNA,
  TextureDNA,
  StyleDNA,
  ScenePhotoStateDNA,
  PreservationContract,
  ReferenceCleaningContract,
  VisualReferenceAnalysis
} from '../types/visualReferenceTypes';
import {
  buildVisualEvidenceAnalyzerSystemPrompt,
  buildVisualEvidenceAnalyzerUserPrompt
} from '../prompts/visualEvidenceAnalyzerPrompt';

export interface VisualEvidenceAnalyzerInput {
  image: string; // Base64 data URL, raw base64, or image URI
  analysisMode?: 'FULL' | 'IDENTITY' | 'SCENE';
  apiKey?: string;
}

const VALID_STATUSES: Set<VisualEvidenceStatus> = new Set([
  'VISIBLE',
  'PARTIAL',
  'INFERRED',
  'UNKNOWN'
]);

const VALID_ORIENTATIONS = new Set(['portrait', 'landscape', 'square', 'unknown']);
const VALID_LIGHT_TYPES = new Set(['natural-looking', 'artificial-looking', 'mixed', 'indeterminate']);
const VALID_SOFTNESS = new Set(['soft', 'moderately-defined', 'hard', 'mixed']);
const VALID_BRANDING_TYPES = new Set(['logo', 'wordmark', 'symbol', 'label', 'product_marking']);
const VALID_TEXT_TYPES = new Set([
  'overlay_text',
  'caption',
  'price',
  'ui_element',
  'watermark',
  'physical_text',
  'physical_logo',
  'packaging_text'
]);
const VALID_CLEANING_DEFAULTS = new Set(['REMOVE', 'PRESERVE', 'CONTEXT_DEPENDENT']);

/**
 * Sanitizes and normalizes generic VisualEvidence nodes without fabricating missing data.
 */
export function normalizeVisualEvidence<T>(
  raw: any,
  validator?: (val: any) => T | undefined
): VisualEvidence<T> | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  let status: VisualEvidenceStatus = 'UNKNOWN';
  if (typeof raw.status === 'string' && VALID_STATUSES.has(raw.status.toUpperCase() as VisualEvidenceStatus)) {
    status = raw.status.toUpperCase() as VisualEvidenceStatus;
  }

  let value: T | undefined = undefined;
  if (raw.value !== undefined && raw.value !== null && raw.value !== '') {
    if (validator) {
      value = validator(raw.value);
    } else {
      value = raw.value as T;
    }
  }

  let confidence: number | undefined = undefined;
  if (typeof raw.confidence === 'number' && !isNaN(raw.confidence)) {
    confidence = Math.max(0, Math.min(1, raw.confidence));
  } else if (status === 'VISIBLE') {
    confidence = 0.95;
  } else if (status === 'PARTIAL') {
    confidence = 0.75;
  } else if (status === 'INFERRED') {
    confidence = 0.55;
  } else if (status === 'UNKNOWN') {
    confidence = 0.0;
  }

  let description: string | undefined = undefined;
  if (typeof raw.description === 'string' && raw.description.trim() !== '') {
    description = raw.description.trim();
  }

  // If status is UNKNOWN and no value is provided, do not fabricate value
  if (status === 'UNKNOWN' && value === undefined && !description) {
    return { status: 'UNKNOWN' };
  }

  const result: VisualEvidence<T> = { status };
  if (value !== undefined) result.value = value;
  if (confidence !== undefined) result.confidence = confidence;
  if (description !== undefined) result.description = description;

  return result;
}

function normalizeStringArray(rawVal: any): string[] | undefined {
  if (Array.isArray(rawVal)) {
    const cleaned = rawVal.map(v => String(v).trim()).filter(v => v.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (typeof rawVal === 'string' && rawVal.trim() !== '') {
    return [rawVal.trim()];
  }
  return undefined;
}

/**
 * Normalizes FrameDNA.
 */
function normalizeFrame(raw: any): FrameDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    orientation: normalizeVisualEvidence<'portrait' | 'landscape' | 'square' | 'unknown'>(raw.orientation, val => {
      const s = String(val).toLowerCase();
      return VALID_ORIENTATIONS.has(s) ? (s as any) : 'unknown';
    }),
    aspectRatio: normalizeVisualEvidence<string>(raw.aspectRatio),
    framing: normalizeVisualEvidence<string>(raw.framing),
    crop: normalizeVisualEvidence<string>(raw.crop),
    headroom: normalizeVisualEvidence<string>(raw.headroom),
    sideMargins: normalizeVisualEvidence<string>(raw.sideMargins)
  };
}

/**
 * Normalizes SubjectDNA.
 */
function normalizeSubject(raw: any): SubjectDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    count: normalizeVisualEvidence<number>(raw.count, val => {
      const n = Number(val);
      return !isNaN(n) ? n : undefined;
    }),
    type: normalizeVisualEvidence<string>(raw.type),
    orientation: normalizeVisualEvidence<string>(raw.orientation),
    positionInFrame: normalizeVisualEvidence<string>(raw.positionInFrame),
    visibleProportions: normalizeVisualEvidence<string>(raw.visibleProportions),
    occlusion: normalizeVisualEvidence<string>(raw.occlusion)
  };
}

/**
 * Normalizes IdentityDNA (strictly intrinsic traits only).
 */
function normalizeIdentity(raw: any): IdentityDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    visibleFacialAppearance: normalizeVisualEvidence<string>(raw.visibleFacialAppearance),
    facialProportions: normalizeVisualEvidence<string>(raw.facialProportions),
    skinCharacteristics: normalizeVisualEvidence<string>(raw.skinCharacteristics),
    hairCharacteristics: normalizeVisualEvidence<string>(raw.hairCharacteristics),
    distinguishingTraits: normalizeVisualEvidence<string[]>(raw.distinguishingTraits, normalizeStringArray)
  };
}

/**
 * Normalizes FaceDNA.
 */
function normalizeFace(raw: any): FaceDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    visibility: normalizeVisualEvidence<string>(raw.visibility),
    headOrientation: normalizeVisualEvidence<string>(raw.headOrientation),
    eyeAppearance: normalizeVisualEvidence<string>(raw.eyeAppearance),
    eyebrowAppearance: normalizeVisualEvidence<string>(raw.eyebrowAppearance),
    noseAppearance: normalizeVisualEvidence<string>(raw.noseAppearance),
    mouthAppearance: normalizeVisualEvidence<string>(raw.mouthAppearance),
    distinguishingFeatures: normalizeVisualEvidence<string[]>(raw.distinguishingFeatures, normalizeStringArray)
  };
}

/**
 * Normalizes HairDNA.
 */
function normalizeHair(raw: any): HairDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    color: normalizeVisualEvidence<string>(raw.color),
    length: normalizeVisualEvidence<string>(raw.length),
    texture: normalizeVisualEvidence<string>(raw.texture),
    density: normalizeVisualEvidence<string>(raw.density),
    parting: normalizeVisualEvidence<string>(raw.parting),
    hairstyle: normalizeVisualEvidence<string>(raw.hairstyle),
    strandBehavior: normalizeVisualEvidence<string>(raw.strandBehavior),
    hairlineVisibility: normalizeVisualEvidence<string>(raw.hairlineVisibility)
  };
}

/**
 * Normalizes SkinDNA.
 */
function normalizeSkin(raw: any): SkinDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    visibleTone: normalizeVisualEvidence<string>(raw.visibleTone),
    surfaceTexture: normalizeVisualEvidence<string>(raw.surfaceTexture),
    highlights: normalizeVisualEvidence<string>(raw.highlights),
    shadowVariation: normalizeVisualEvidence<string>(raw.shadowVariation),
    visibleMarks: normalizeVisualEvidence<string[]>(raw.visibleMarks, normalizeStringArray),
    retouchingLevel: normalizeVisualEvidence<string>(raw.retouchingLevel)
  };
}

/**
 * Normalizes ExpressionDNA.
 */
function normalizeExpression(raw: any): ExpressionDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    eyeState: normalizeVisualEvidence<string>(raw.eyeState),
    eyebrowState: normalizeVisualEvidence<string>(raw.eyebrowState),
    mouthState: normalizeVisualEvidence<string>(raw.mouthState),
    facialTension: normalizeVisualEvidence<string>(raw.facialTension),
    gazeDirection: normalizeVisualEvidence<string>(raw.gazeDirection)
  };
}

/**
 * Normalizes ArmDNA.
 */
function normalizeArm(raw: any): ArmDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    upperArmDirection: normalizeVisualEvidence<string>(raw.upperArmDirection),
    elbowState: normalizeVisualEvidence<string>(raw.elbowState),
    forearmDirection: normalizeVisualEvidence<string>(raw.forearmDirection),
    occlusion: normalizeVisualEvidence<string>(raw.occlusion)
  };
}

/**
 * Normalizes HandDNA.
 */
function normalizeHand(raw: any): HandDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    visibility: normalizeVisualEvidence<string>(raw.visibility),
    wristOrientation: normalizeVisualEvidence<string>(raw.wristOrientation),
    palmOrientation: normalizeVisualEvidence<string>(raw.palmOrientation),
    fingerConfiguration: normalizeVisualEvidence<string>(raw.fingerConfiguration),
    gesture: normalizeVisualEvidence<string>(raw.gesture),
    contactTarget: normalizeVisualEvidence<string>(raw.contactTarget)
  };
}

/**
 * Normalizes PoseDNA with bilateral decoupling.
 */
function normalizePose(raw: any): PoseDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    bodyOrientation: normalizeVisualEvidence<string>(raw.bodyOrientation),
    headOrientation: normalizeVisualEvidence<string>(raw.headOrientation),
    shoulderLine: normalizeVisualEvidence<string>(raw.shoulderLine),
    torsoOrientation: normalizeVisualEvidence<string>(raw.torsoOrientation),
    hipOrientation: normalizeVisualEvidence<string>(raw.hipOrientation),
    weightDistribution: normalizeVisualEvidence<string>(raw.weightDistribution),
    leftArm: normalizeArm(raw.leftArm),
    rightArm: normalizeArm(raw.rightArm),
    leftHand: normalizeHand(raw.leftHand),
    rightHand: normalizeHand(raw.rightHand),
    legConfiguration: normalizeVisualEvidence<string>(raw.legConfiguration)
  };
}

/**
 * Normalizes GarmentDNA.
 */
function normalizeGarment(raw: any): GarmentDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    type: normalizeVisualEvidence<string>(raw.type),
    color: normalizeVisualEvidence<string>(raw.color),
    fabricAppearance: normalizeVisualEvidence<string>(raw.fabricAppearance),
    fit: normalizeVisualEvidence<string>(raw.fit),
    silhouette: normalizeVisualEvidence<string>(raw.silhouette),
    neckline: normalizeVisualEvidence<string>(raw.neckline),
    sleeves: normalizeVisualEvidence<string>(raw.sleeves),
    seams: normalizeVisualEvidence<string>(raw.seams),
    folds: normalizeVisualEvidence<string>(raw.folds),
    closures: normalizeVisualEvidence<string>(raw.closures),
    patterns: normalizeVisualEvidence<string>(raw.patterns),
    printedElements: normalizeVisualEvidence<string[]>(raw.printedElements, normalizeStringArray)
  };
}

/**
 * Normalizes WardrobeDNA.
 */
function normalizeWardrobe(raw: any): WardrobeDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const top = normalizeGarment(raw.top);
  const bottom = normalizeGarment(raw.bottom);
  const footwear = normalizeGarment(raw.footwear);
  const otherGarments = Array.isArray(raw.otherGarments)
    ? raw.otherGarments.map((g: any) => normalizeGarment(g)).filter(Boolean)
    : undefined;

  return {
    top,
    bottom,
    footwear,
    otherGarments: otherGarments && otherGarments.length > 0 ? (otherGarments as GarmentDNA[]) : undefined
  };
}

/**
 * Normalizes AccessoriesDNA.
 */
function normalizeAccessories(raw: any): AccessoriesDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    jewelry: normalizeVisualEvidence<string[]>(raw.jewelry, normalizeStringArray),
    eyewear: normalizeVisualEvidence<string>(raw.eyewear),
    headwear: normalizeVisualEvidence<string>(raw.headwear),
    bags: normalizeVisualEvidence<string>(raw.bags),
    belts: normalizeVisualEvidence<string>(raw.belts),
    watches: normalizeVisualEvidence<string>(raw.watches),
    other: normalizeVisualEvidence<string[]>(raw.other, normalizeStringArray)
  };
}

/**
 * Normalizes SceneObjectDNA.
 */
function normalizeSceneObject(raw: any): SceneObjectDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    type: normalizeVisualEvidence<string>(raw.type),
    color: normalizeVisualEvidence<string>(raw.color),
    material: normalizeVisualEvidence<string>(raw.material),
    position: normalizeVisualEvidence<string>(raw.position),
    scale: normalizeVisualEvidence<string>(raw.scale),
    orientation: normalizeVisualEvidence<string>(raw.orientation),
    interactionWithSubject: normalizeVisualEvidence<string>(raw.interactionWithSubject),
    occlusion: normalizeVisualEvidence<string>(raw.occlusion)
  };
}

/**
 * Normalizes BackgroundDNA.
 */
function normalizeBackground(raw: any): BackgroundDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    type: normalizeVisualEvidence<string>(raw.type),
    dominantColors: normalizeVisualEvidence<string[]>(raw.dominantColors, normalizeStringArray),
    surfaces: normalizeVisualEvidence<string[]>(raw.surfaces, normalizeStringArray),
    depth: normalizeVisualEvidence<string>(raw.depth),
    visibleEnvironmentElements: normalizeVisualEvidence<string[]>(raw.visibleEnvironmentElements, normalizeStringArray),
    blur: normalizeVisualEvidence<string>(raw.blur),
    negativeSpace: normalizeVisualEvidence<string>(raw.negativeSpace)
  };
}

/**
 * Normalizes LightingDNA.
 */
function normalizeLighting(raw: any): LightingDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    lightType: normalizeVisualEvidence<'natural-looking' | 'artificial-looking' | 'mixed' | 'indeterminate'>(raw.lightType, val => {
      const s = String(val).toLowerCase();
      return VALID_LIGHT_TYPES.has(s) ? (s as any) : 'indeterminate';
    }),
    softness: normalizeVisualEvidence<'soft' | 'moderately-defined' | 'hard' | 'mixed'>(raw.softness, val => {
      const s = String(val).toLowerCase();
      return VALID_SOFTNESS.has(s) ? (s as any) : 'mixed';
    }),
    direction: normalizeVisualEvidence<string>(raw.direction),
    intensity: normalizeVisualEvidence<string>(raw.intensity),
    shadows: normalizeVisualEvidence<string>(raw.shadows),
    whiteBalance: normalizeVisualEvidence<string>(raw.whiteBalance),
    exposureStyle: normalizeVisualEvidence<string>(raw.exposureStyle)
  };
}

/**
 * Normalizes CameraDNA.
 */
function normalizeCamera(raw: any): CameraDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    viewpoint: normalizeVisualEvidence<string>(raw.viewpoint),
    height: normalizeVisualEvidence<string>(raw.height),
    angle: normalizeVisualEvidence<string>(raw.angle),
    distanceClass: normalizeVisualEvidence<string>(raw.distanceClass),
    perspective: normalizeVisualEvidence<string>(raw.perspective),
    depthOfField: normalizeVisualEvidence<string>(raw.depthOfField)
  };
}

/**
 * Normalizes CompositionDNA.
 */
function normalizeComposition(raw: any): CompositionDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    subjectPlacement: normalizeVisualEvidence<string>(raw.subjectPlacement),
    visualBalance: normalizeVisualEvidence<string>(raw.visualBalance),
    foregroundBackgroundRelationship: normalizeVisualEvidence<string>(raw.foregroundBackgroundRelationship),
    negativeSpace: normalizeVisualEvidence<string>(raw.negativeSpace),
    relativeObjectPositions: normalizeVisualEvidence<string>(raw.relativeObjectPositions),
    dominantVisualHierarchy: normalizeVisualEvidence<string>(raw.dominantVisualHierarchy)
  };
}

/**
 * Normalizes BrandingDNA.
 */
function normalizeBranding(raw: any): BrandingDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const rawElements = Array.isArray(raw.elements) ? raw.elements : [];
  const elements: BrandingElementDNA[] = rawElements.map((el: any) => {
    let type: BrandingElementDNA['type'] = 'logo';
    if (typeof el.type === 'string' && VALID_BRANDING_TYPES.has(el.type.toLowerCase())) {
      type = el.type.toLowerCase() as any;
    }
    return {
      type,
      location: normalizeVisualEvidence<string>(el.location),
      description: normalizeVisualEvidence<string>(el.description),
      physicallyAttached: typeof el.physicallyAttached === 'boolean' ? el.physicallyAttached : true
    };
  });

  return { elements };
}

/**
 * Normalizes VisualTextElement array.
 */
function normalizeTextElements(raw: any): VisualTextElement[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const elements: VisualTextElement[] = raw.map((el: any) => {
    let type: VisualTextType = 'physical_text';
    if (typeof el.type === 'string' && VALID_TEXT_TYPES.has(el.type.toLowerCase() as VisualTextType)) {
      type = el.type.toLowerCase() as VisualTextType;
    }

    const isOverlay = ['overlay_text', 'caption', 'price', 'ui_element', 'watermark'].includes(type);
    const physicallyAttached = typeof el.physicallyAttached === 'boolean' ? el.physicallyAttached : !isOverlay;

    let cleaningDefault: VisualTextElement['cleaningDefault'] = isOverlay ? 'REMOVE' : 'PRESERVE';
    if (typeof el.cleaningDefault === 'string' && VALID_CLEANING_DEFAULTS.has(el.cleaningDefault.toUpperCase())) {
      cleaningDefault = el.cleaningDefault.toUpperCase() as any;
    }

    return {
      type,
      content: normalizeVisualEvidence<string>(el.content),
      location: normalizeVisualEvidence<string>(el.location),
      physicallyAttached,
      cleaningDefault
    };
  });

  return elements.length > 0 ? elements : undefined;
}

/**
 * Normalizes TextureDNA.
 */
function normalizeTexture(raw: any): TextureDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    skinTexture: normalizeVisualEvidence<string>(raw.skinTexture),
    fabricTexture: normalizeVisualEvidence<string>(raw.fabricTexture),
    surfaceTexture: normalizeVisualEvidence<string>(raw.surfaceTexture),
    gloss: normalizeVisualEvidence<string>(raw.gloss),
    matteResponse: normalizeVisualEvidence<string>(raw.matteResponse),
    reflections: normalizeVisualEvidence<string>(raw.reflections),
    fineDetail: normalizeVisualEvidence<string>(raw.fineDetail)
  };
}

/**
 * Normalizes StyleDNA.
 */
function normalizeStyle(raw: any): StyleDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    visualTreatment: normalizeVisualEvidence<string>(raw.visualTreatment),
    realismLevel: normalizeVisualEvidence<string>(raw.realismLevel),
    photographicVsRendered: normalizeVisualEvidence<string>(raw.photographicVsRendered),
    retouching: normalizeVisualEvidence<string>(raw.retouching),
    detailLevel: normalizeVisualEvidence<string>(raw.detailLevel),
    materialPlausibility: normalizeVisualEvidence<string>(raw.materialPlausibility)
  };
}

/**
 * Normalizes ScenePhotoStateDNA.
 */
function normalizeSceneState(raw: any): ScenePhotoStateDNA | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const objects = Array.isArray(raw.objects)
    ? raw.objects.map((obj: any) => normalizeSceneObject(obj)).filter(Boolean)
    : undefined;

  return {
    expression: normalizeExpression(raw.expression),
    pose: normalizePose(raw.pose),
    wardrobe: normalizeWardrobe(raw.wardrobe),
    accessories: normalizeAccessories(raw.accessories),
    objects: objects && objects.length > 0 ? (objects as SceneObjectDNA[]) : undefined,
    background: normalizeBackground(raw.background),
    lighting: normalizeLighting(raw.lighting),
    camera: normalizeCamera(raw.camera),
    composition: normalizeComposition(raw.composition)
  };
}

/**
 * Derives a conservative, anti-hallucination PreservationContract.
 */
export function derivePreservationContract(analysis?: Partial<VisualReferenceAnalysis>): PreservationContract {
  return {
    preservePose: true,
    preserveWardrobe: true,
    preserveColors: true,
    preservePhysicalBranding: true,
    preserveRelativeProportions: true,
    preserveCrop: true,
    preserveSubjectPlacement: true,
    preserveOcclusions: true,
    avoidUnsupportedObjects: true,
    avoidUnsupportedDetails: true,
    preferUnknownOverFabrication: true
  };
}

/**
 * Derives a candidate ReferenceCleaningContract based on detected text/overlay elements.
 */
export function deriveCleaningContract(textElements?: VisualTextElement[]): ReferenceCleaningContract {
  const elements = textElements || [];
  const hasOverlayText = elements.some(t => t.type === 'overlay_text');
  const hasCaptions = elements.some(t => t.type === 'caption');
  const hasUi = elements.some(t => t.type === 'ui_element');
  const hasWatermarkOrClutter = elements.some(t => t.type === 'watermark');

  return {
    removeOverlayText: hasOverlayText,
    removeCaptions: hasCaptions,
    removeUiElements: hasUi,
    removeUnrelatedClutter: hasWatermarkOrClutter,
    replaceBackgroundWithWhite: false,

    preservePrincipalSubject: true,
    preserveWardrobe: true,
    preserveProduct: true,
    preservePose: true,
    preservePhysicalLogos: true,

    improveVisualClarity: true
  };
}

/**
 * Normalizes raw LLM output into a strictly compliant VisualReferenceAnalysis root model.
 */
export function normalizeVisualReferenceAnalysis(raw: any): VisualReferenceAnalysis {
  if (!raw || typeof raw !== 'object') {
    return {
      preservation: derivePreservationContract(),
      cleaning: deriveCleaningContract(),
      unknown: ['Unparseable image reference analysis']
    };
  }

  const frame = normalizeFrame(raw.frame);
  const subject = normalizeSubject(raw.subject);
  const identity = normalizeIdentity(raw.identity);
  const face = normalizeFace(raw.face);
  const hair = normalizeHair(raw.hair);
  const skin = normalizeSkin(raw.skin);
  const sceneState = normalizeSceneState(raw.sceneState);
  const branding = normalizeBranding(raw.branding);
  const textElements = normalizeTextElements(raw.textElements);

  const rawObjects = Array.isArray(raw.objects)
    ? raw.objects.map((o: any) => normalizeSceneObject(o)).filter(Boolean)
    : undefined;
  const objects = rawObjects && rawObjects.length > 0 ? (rawObjects as SceneObjectDNA[]) : undefined;

  const texture = normalizeTexture(raw.texture);
  const style = normalizeStyle(raw.style);

  let rawUnknown = normalizeStringArray(raw.unknown);
  if (!rawUnknown && Array.isArray(raw.unknown)) {
    rawUnknown = raw.unknown.map((u: any) => String(u)).filter((u: string) => u.trim() !== '');
  }

  const preservation = raw.preservation && typeof raw.preservation === 'object'
    ? { ...derivePreservationContract(), ...raw.preservation }
    : derivePreservationContract({ frame, subject, identity, sceneState });

  const cleaning = raw.cleaning && typeof raw.cleaning === 'object'
    ? { ...deriveCleaningContract(textElements), ...raw.cleaning }
    : deriveCleaningContract(textElements);

  const result: VisualReferenceAnalysis = {
    frame,
    subject,
    identity,
    face,
    hair,
    skin,
    sceneState,
    branding,
    textElements,
    objects,
    texture,
    style,
    preservation,
    cleaning,
    unknown: rawUnknown
  };

  return result;
}

/**
 * Parses image string to base64 & MIME type.
 */
function extractImagePayload(imageInput: any): { base64: string; mimeType: string } {
  let base64 = typeof imageInput === 'string' ? imageInput.trim() : (imageInput?.base64 || imageInput?.preview || imageInput?.url || '');
  let mimeType = 'image/png';

  if (typeof base64 === 'string' && base64.includes(';base64,')) {
    const parts = base64.split(';base64,');
    const header = parts[0];
    base64 = parts[1] || '';
    if (header.includes('data:')) {
      mimeType = header.replace('data:', '').trim() || mimeType;
    }
  }

  return { base64: String(base64 || ''), mimeType };
}

/**
 * Core Analyzer: Executes a single multimodal AI call to analyze visual reference evidence.
 */
export async function analyzeVisualEvidence(
  input: VisualEvidenceAnalyzerInput
): Promise<VisualReferenceAnalysis> {
  const { image, analysisMode = 'FULL', apiKey = '' } = input;

  if (!image || typeof image !== 'string' || image.trim() === '') {
    throw new Error('Nenhuma imagem válida fornecida para análise de evidência visual.');
  }

  const { base64, mimeType } = extractImagePayload(image);

  const systemPrompt = buildVisualEvidenceAnalyzerSystemPrompt(analysisMode);
  const userPrompt = buildVisualEvidenceAnalyzerUserPrompt(analysisMode);

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64
    }
  };

  const textPart = {
    text: `${systemPrompt}\n\n${userPrompt}`
  };

  const response = await processGeminiAPI(apiKey, {
    mode: 'visual_reference_analysis',
    moduleName: 'Visual Reference Engine - Evidence Analyzer',
    model: 'gemini-3.5-flash',
    require_json: true,
    contents: [{ parts: [imagePart, textPart] }]
  });

  if (!response) {
    throw new Error('Falha ao obter resposta do Visual Evidence Analyzer.');
  }

  let parsed: any = response.data;
  if (!parsed && response.raw_text) {
    parsed = safeJSONParse(response.raw_text, null);
  }

  if (!parsed && typeof response === 'object' && !response.data && !response.raw_text) {
    parsed = response;
  }

  return normalizeVisualReferenceAnalysis(parsed);
}
