/**
 * SCENE 3 PROMPT COMPILER — PURE DETERMINISTIC ENGINE
 * Phase 2.2 Architecture — Conversion & CTA Closing Scene
 * 
 * Rules:
 * 1. MUST NOT call Gemini.
 * 2. MUST NOT rewrite, paraphrase, shorten, expand or optimize the spoken CTA (immutable from Copy Agent).
 * 3. MUST NOT improvise instructions.
 * 4. Validates required slots and throws typed errors on missing values.
 * 5. Guarantees byte-for-byte deterministic output for identical slot inputs.
 */

import {
  Scene3DynamicSlots,
  CompiledScene3Model,
  Scene3JsonOutput,
  Scene3SlotValidationResult
} from '../types/scene3';
import {
  ProductStructuralDNA,
  StructuralElement,
  ProductCategoryModule,
  CameraModuleDNA
} from '../types/compilerTypes';
import {
  getScene3MasterTemplateSkeleton,
  SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE,
  SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS,
  SCENE_3_CTA_CLOSING_ACTION_MANDATE
} from '../templates/scene3BaseTemplate';
import {
  getAvatarIdentityStatus,
  SHARED_AVATAR_WARDROBE_PRIORITY_RULE,
  SHARED_AVATAR_POSE_PRIORITY_RULE,
  AvatarIdentityContext,
  resolveBrandMarkAuthority,
  isBrandMarkActive,
  serializeScene3CleanAvatarIdentity
} from '../../visual-reference-engine';
import { renderReferenceCoverageAndMotionSafety } from '../services/productGroundingService';
import {
  resolveWardrobeContract,
  buildWardrobeConsistencyLock,
  formatCanonicalWardrobeSpecification,
  ResolvedWardrobeContract,
  WardrobeConsistencyLock
} from '../wardrobe/wardrobePriorityResolver';

export class Scene3CompilationError extends Error {
  public readonly missingFields: string[];

  constructor(message: string, missingFields: string[] = []) {
    super(message);
    this.name = 'Scene3CompilationError';
    this.missingFields = missingFields;
  }
}

/**
 * Validates that all required Scene 3 dynamic slots are present and non-empty.
 */
export function validateScene3Slots(slots: Partial<Scene3DynamicSlots>): Scene3SlotValidationResult {
  const errors: string[] = [];

  if (!slots) {
    return { valid: false, errors: ['Slot object is undefined or null.'] };
  }

  // 1. Product validation
  if (!slots.product || !slots.product.identity || !slots.product.identity.trim()) {
    errors.push('Missing required slot: product.identity');
  }

  if (!slots.product || !Array.isArray(slots.product.visibleDetails) || slots.product.visibleDetails.length === 0) {
    errors.push('Missing required slot: product.visibleDetails (must contain observable details)');
  }

  // 2. Presenter validation
  if (!slots.presenter || !slots.presenter.identity || !slots.presenter.identity.trim()) {
    errors.push('Missing required slot: presenter.identity');
  }

  // 3. Wardrobe validation
  if (!slots.wardrobe || !slots.wardrobe.description || !slots.wardrobe.description.trim()) {
    errors.push('Missing required slot: wardrobe.description');
  }

  // 4. Environment validation
  if (!slots.environment || !slots.environment.trim()) {
    errors.push('Missing required slot: environment');
  }

  // 5. Spoken CTA validation (CRITICAL: Immutable slot from Copy Agent)
  if (!slots.spokenCta || !slots.spokenCta.trim()) {
    errors.push('Missing required slot: spokenCta');
  }

  // 6. Actions validation (4 blocks: 0-2s, 2-4s, 4-6s, 6-8s)
  if (!slots.actions) {
    errors.push('Missing required slot: actions');
  } else {
    const a = slots.actions;
    if (!a.action0to2 || !a.action0to2.trim()) errors.push('Missing required action: action0to2 (0.0s - 2.0s)');
    if (!a.action2to4 || !a.action2to4.trim()) errors.push('Missing required action: action2to4 (2.0s - 4.0s)');
    if (!a.action4to6 || !a.action4to6.trim()) errors.push('Missing required action: action4to6 (4.0s - 6.0s)');
    if (!a.action6to8 || !a.action6to8.trim()) errors.push('Missing required action: action6to8 (6.0s - 8.0s)');
  }

  // 7. CTA Gesture validation
  if (!slots.ctaGesture || !slots.ctaGesture.trim()) {
    errors.push('Missing required slot: ctaGesture');
  }

  // 8. Speech Action Sync validation
  if (!slots.speechActionSync || !Array.isArray(slots.speechActionSync) || slots.speechActionSync.length === 0) {
    errors.push('Missing required slot: speechActionSync (must contain at least one synchronization item)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Builds the complete negative constraints string for Scene 3,
 * ensuring universal constraints are never removed and product-specific negatives are appended.
 */
export function buildScene3NegativeConstraints(productSpecificNegatives?: string[] | readonly string[]): {
  combinedText: string;
  combinedList: string[];
  universalList: string[];
  productSpecificList: string[];
} {
  const universalList = SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS.split('. ')
    .map(c => c.trim())
    .filter(Boolean);

  const productSpecificList = Array.isArray(productSpecificNegatives)
    ? productSpecificNegatives.map(n => n.trim()).filter(Boolean)
    : [];

  let combinedText = SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS;
  if (productSpecificList.length > 0) {
    const formattedSpecific = productSpecificList.map(n => n.endsWith('.') ? n : `${n}.`).join(' ');
    combinedText = `${SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS}\n${formattedSpecific}`;
  }

  const combinedList = [...universalList, ...productSpecificList];

  return {
    combinedText,
    combinedList,
    universalList,
    productSpecificList
  };
}

/**
 * Pure deterministic model builder for Scene 3.
 * Validates dynamic slots and creates the intermediate CompiledScene3Model canonical representation.
 */
export function buildCompiledScene3Model(slots: Scene3DynamicSlots): CompiledScene3Model {
  const validation = validateScene3Slots(slots);
  if (!validation.valid) {
    throw new Scene3CompilationError(
      `Cannot compile Scene 3 prompt. Missing or invalid slots: ${validation.errors.join('; ')}`,
      validation.errors
    );
  }

  const negatives = buildScene3NegativeConstraints(slots.productSpecificNegatives);

  const resolvedWardrobe = slots.wardrobe.resolvedWardrobeContract || resolveWardrobeContract({
    wardrobeForm: {
      presenterGender: slots.presenter.gender,
      topType: slots.wardrobe.topType,
      topColor: slots.wardrobe.topColor,
      topStyle: slots.wardrobe.topStyle,
      bottomType: slots.wardrobe.bottomType,
      bottomColor: slots.wardrobe.bottomColor,
      footwearType: slots.wardrobe.footwearType,
      footwearColor: slots.wardrobe.footwearColor,
      presenterDescription: slots.presenter.identity
    }
  });
  const wardrobeLock = slots.wardrobe.wardrobeConsistencyLock || buildWardrobeConsistencyLock(resolvedWardrobe);

  const model: CompiledScene3Model = {
    scene: 3,
    technicalSpecifications: {
      aspectRatio: "9:16",
      durationSeconds: 8,
      format: "Brazilian UGC (User-Generated Content), authentic everyday smartphone realism.",
      shotType: "Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, NO gimbal stabilization, NO cinematic color grading, authentic natural ambient lighting)."
    },
    presenterContract: {
      identity: slots.presenter.identity.trim(),
      ...(slots.presenter.gender ? { gender: slots.presenter.gender.trim() } : {}),
      avatarIdentityRule: SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE,
      wardrobe: {
        description: slots.wardrobe.description.trim(),
        ...(resolvedWardrobe.topType || slots.wardrobe.topType ? { topType: (resolvedWardrobe.topType || slots.wardrobe.topType)!.trim() } : {}),
        ...(resolvedWardrobe.topStyle || slots.wardrobe.topStyle ? { topStyle: (resolvedWardrobe.topStyle || slots.wardrobe.topStyle)!.trim() } : {}),
        ...(resolvedWardrobe.topColor || slots.wardrobe.topColor ? { topColor: (resolvedWardrobe.topColor || slots.wardrobe.topColor)!.trim() } : {}),
        ...(resolvedWardrobe.bottomType || slots.wardrobe.bottomType ? { bottomType: (resolvedWardrobe.bottomType || slots.wardrobe.bottomType)!.trim() } : {}),
        ...(resolvedWardrobe.bottomColor || slots.wardrobe.bottomColor ? { bottomColor: (resolvedWardrobe.bottomColor || slots.wardrobe.bottomColor)!.trim() } : {}),
        ...(resolvedWardrobe.footwearType || slots.wardrobe.footwearType ? { footwearType: (resolvedWardrobe.footwearType || slots.wardrobe.footwearType)!.trim() } : {}),
        ...(resolvedWardrobe.footwearColor || slots.wardrobe.footwearColor ? { footwearColor: (resolvedWardrobe.footwearColor || slots.wardrobe.footwearColor)!.trim() } : {}),
        resolvedWardrobeContract: resolvedWardrobe,
        wardrobeConsistencyLock: wardrobeLock
      },
      ...(slots.avatarIdentityContext || slots.presenter.avatarIdentityContext ? {
        avatarIdentityContext: slots.avatarIdentityContext || slots.presenter.avatarIdentityContext
      } : {})
    },
    environment: slots.environment.trim(),
    productContract: {
      identity: slots.product.identity.trim(),
      ...(slots.product.quantity ? { quantity: slots.product.quantity.trim() } : {}),
      visibleDetails: slots.product.visibleDetails.map(d => d.trim()).filter(Boolean),
      knownPhysicalFacts: Array.isArray(slots.product.knownPhysicalFacts)
        ? slots.product.knownPhysicalFacts.map(f => f.trim()).filter(Boolean)
        : [],
      exclusiveReferenceRule: "The uploaded product image is the exclusive visual reference.",
      scaleAndFidelityRule: "Maintain realistic physical scale and structural integrity. Do not deform, omit essential parts or invent unverified accessories.",
      ...(slots.structuralDNA || slots.product.structuralDNA ? { structuralDNA: slots.structuralDNA || slots.product.structuralDNA } : {}),
      ...(slots.referenceCoverage || slots.product.referenceCoverage ? { referenceCoverage: slots.referenceCoverage || slots.product.referenceCoverage } : {}),
      ...(slots.motionSafety || slots.product.motionSafety ? { motionSafety: slots.motionSafety || slots.product.motionSafety } : {})
    },
    closingPrinciple: {
      actionMandate: SCENE_3_CTA_CLOSING_ACTION_MANDATE
    },
    timeline: {
      action0to2: slots.actions.action0to2.trim(),
      action2to4: slots.actions.action2to4.trim(),
      action4to6: slots.actions.action4to6.trim(),
      action6to8: slots.actions.action6to8.trim()
    },
    dialogue: {
      spokenCta: slots.spokenCta, // Strictly preserving exact CTA
      audioRules: [
        "Direct on-camera speech in Brazilian Portuguese (PT-BR).",
        "NO VOICE-OVER. NO NARRATION.",
        "Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.",
        "Say ONLY the exact dialogue locked phrase."
      ],
      exactDialogueLockRule: "Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word."
    },
    ctaGesture: {
      description: slots.ctaGesture.trim()
    },
    speechActionSync: slots.speechActionSync.map(item => ({
      spokenSegment: item.spokenSegment.trim(),
      physicalAction: item.physicalAction.trim()
    })),
    negativeConstraints: Object.freeze(negatives.combinedList),
    universalNegatives: Object.freeze(negatives.universalList),
    productSpecificNegatives: Object.freeze(negatives.productSpecificList)
  };

  // Deep freeze all sub-objects
  Object.freeze(model.technicalSpecifications);
  Object.freeze(model.presenterContract);
  Object.freeze(model.presenterContract.wardrobe);
  Object.freeze(model.productContract);
  Object.freeze(model.closingPrinciple);
  Object.freeze(model.timeline);
  Object.freeze(model.dialogue);
  Object.freeze(model.ctaGesture);
  Object.freeze(model.speechActionSync);

  return Object.freeze(model);
}

/**
 * Renders deduplicated Product Structural DNA for Scene 3.
 * Emits structural locks, geometry constraints, and component relationships
 * without repeating product name, visible colors, or generic appearance descriptions
 * already established in the Product Contract.
 */
export function renderScene3ProductStructuralDNA(dna?: ProductStructuralDNA | null): string {
  if (!dna) return '';

  // 1. Core Geometry Locks
  const geometryLines: string[] = [];
  if (dna.coreGeometry) {
    const cg = dna.coreGeometry;
    if (cg.silhouette && cg.silhouette.trim()) geometryLines.push(`- silhouette: ${cg.silhouette.trim()}`);
    if (cg.proportions && cg.proportions.trim()) geometryLines.push(`- proportions: ${cg.proportions.trim()}`);
    if (cg.thicknessProfile && cg.thicknessProfile.trim()) geometryLines.push(`- thickness profile: ${cg.thicknessProfile.trim()}`);
    if (cg.edgeStyle && cg.edgeStyle.trim()) geometryLines.push(`- edge style: ${cg.edgeStyle.trim()}`);
    if (cg.cornerProfile && cg.cornerProfile.trim()) geometryLines.push(`- corner profile: ${cg.cornerProfile.trim()}`);
    if (cg.symmetry && cg.symmetry.trim()) geometryLines.push(`- symmetry: ${cg.symmetry.trim()}`);
    if (cg.aspectRatio !== undefined && cg.aspectRatio !== null && !isNaN(cg.aspectRatio)) geometryLines.push(`- aspect ratio: ${cg.aspectRatio}`);
  }

  // 2. Component Structural Relationships (Unique structural definitions)
  const componentLines: string[] = [];
  const formatComponentLock = (el: StructuralElement): string | null => {
    if (!el || !el.name || !el.name.trim()) return null;
    if (el.confidence !== undefined && el.confidence < 0.5) return null;
    const parts: string[] = [];
    if (el.shape && el.shape.trim()) parts.push(`shape: ${el.shape.trim()}`);
    if (el.position && el.position.trim()) parts.push(`position: ${el.position.trim()}`);
    if (el.relativeSize && el.relativeSize.trim()) parts.push(`relative size: ${el.relativeSize.trim()}`);
    if (el.count && el.count > 1) parts.push(`count: ${el.count}`);
    const relStr = (Array.isArray(el.relationshipToOtherParts) && el.relationshipToOtherParts.length > 0)
      ? el.relationshipToOtherParts.map(r => r.trim()).filter(Boolean).join(', ')
      : '';
    let line = `- ${el.name.trim()}`;
    if (parts.length > 0) line += `: ${parts.join(', ')}`;
    if (relStr) line += ` (relationships: ${relStr})`;
    return line;
  };

  if (Array.isArray(dna.fixedComponents)) {
    for (const el of dna.fixedComponents) {
      const f = formatComponentLock(el);
      if (f) componentLines.push(f);
    }
  }
  if (Array.isArray(dna.movableComponents)) {
    for (const el of dna.movableComponents) {
      const f = formatComponentLock(el);
      if (f) componentLines.push(f);
    }
  }

  // 3. Category Module Locks (e.g. Camera Module)
  const categoryModuleSections: string[] = [];
  const cameraMod = dna.categoryModules?.cameraModule as ProductCategoryModule<CameraModuleDNA> | undefined;
  let cameraLockBlock = '';
  let cameraAntiPriorBlock = '';

  if (cameraMod && cameraMod.data && cameraMod.data.detected) {
    const camData = cameraMod.data;
    const camLines: string[] = [];
    if (camData.islandShape && camData.islandShape.trim()) camLines.push(`- island shape: ${camData.islandShape.trim()}`);
    if (camData.islandPosition && camData.islandPosition.trim()) camLines.push(`- island position: ${camData.islandPosition.trim()}`);
    if (camData.lensCount !== undefined && camData.lensCount !== null) camLines.push(`- lens count: ${camData.lensCount}`);
    if (camData.lensTopology && camData.lensTopology.trim()) camLines.push(`- lens topology: ${camData.lensTopology.trim()}`);
    if (camData.lensScale && camData.lensScale.trim()) camLines.push(`- lens scale: ${camData.lensScale.trim()}`);
    if (camData.lensSpacing && camData.lensSpacing.trim()) camLines.push(`- lens spacing: ${camData.lensSpacing.trim()}`);
    if (camData.flashPosition && camData.flashPosition.trim()) camLines.push(`- flash position: ${camData.flashPosition.trim()}`);
    if (Array.isArray(camData.auxiliarySensorPositions) && camData.auxiliarySensorPositions.length > 0) {
      const validSensors = camData.auxiliarySensorPositions.map(s => s.trim()).filter(Boolean);
      if (validSensors.length > 0) camLines.push(`- auxiliary sensors: ${validSensors.join(', ')}`);
    }
    if (camLines.length > 0) {
      categoryModuleSections.push(`CATEGORY MODULE — CAMERA:\n${camLines.join('\n')}`);
    }
    const conf = camData.confidence ?? cameraMod.confidence ?? 0.9;
    if (conf >= 0.5) {
      cameraLockBlock = `CAMERA MODULE STRUCTURAL LOCK:
Preserve the exact camera-module geometry observed in the reference.

NO camera island redesign
NO lens-count changes
NO lens relocation
NO lens resizing
NO flash relocation
NO sensor relocation
NO generic camera-layout substitution`;

      cameraAntiPriorBlock = `CAMERA ANTI-PRIOR OVERRIDE:
Do not replace the observed camera-module geometry with a standard, legacy or more familiar layout associated with the product category or brand.`;
    }
  }

  // 4. Structural Identity Lock
  const isKit = Boolean(dna.isCommercialPackConfirmed && (dna.kitComponentCount ?? 0) > 1);
  const n = dna.kitComponentCount ?? 2;
  const remainingCount = dna.remainingVisibleComponentCount ?? (n - 1);
  const categoryLower = (dna.category || '').toLowerCase();
  const isFurnitureOrLargeSet = Boolean(
    dna.isFurnitureOrLargeSet ||
    categoryLower.includes('móve') ||
    categoryLower.includes('move') ||
    categoryLower.includes('furnitur') ||
    categoryLower.includes('cadeira') ||
    categoryLower.includes('chair') ||
    categoryLower.includes('mesa') ||
    categoryLower.includes('table') ||
    categoryLower.includes('poltrona') ||
    categoryLower.includes('sofa') ||
    categoryLower.includes('couch') ||
    categoryLower.includes('armario') ||
    categoryLower.includes('cabinet') ||
    categoryLower.includes('estante') ||
    categoryLower.includes('desk') ||
    categoryLower.includes('cama') ||
    categoryLower.includes('bed')
  );
  const allowRelocation = Boolean(dna.allowTemporaryRelocation || isFurnitureOrLargeSet);

  const sections: string[] = [
    'PRODUCT STRUCTURAL DNA — STRICT PRESERVATION',
    'ANTI-PRIOR OVERRIDE:\nThe uploaded reference geometry has priority over any pretrained expectation associated with the product name, brand, category or family.\nDo not replace observed geometry with a generic, legacy, standard or more familiar design.'
  ];

  if (geometryLines.length > 0) {
    sections.push(`CORE GEOMETRY LOCK:\n${geometryLines.join('\n')}`);
  }

  if (componentLines.length > 0) {
    sections.push(`COMPONENT STRUCTURE & RELATIONSHIPS:\n${componentLines.join('\n')}`);
  }

  if (categoryModuleSections.length > 0) {
    sections.push(...categoryModuleSections);
  }

  if (cameraLockBlock) {
    sections.push(cameraLockBlock);
  }

  if (cameraAntiPriorBlock) {
    sections.push(cameraAntiPriorBlock);
  }

  if (isKit) {
    const componentPlacementClause = isFurnitureOrLargeSet
      ? `The presenter may actively handle or interact with 1 component at a time while the remaining ${remainingCount} confirmed components stay clearly visible in their legitimate scene positions.`
      : `The presenter may actively handle 1 component at a time while the remaining ${remainingCount} components stay visible on a nearby surface.`;

    const relocationClause = allowRelocation
      ? `Identity, count, scale, geometry and legitimate kit composition are preserved. Temporary relocation required by the demonstration is allowed (movement must be physically plausible, with no duplication or removal).`
      : `NO component relocation`;

    sections.push(
      `STRUCTURAL IDENTITY LOCK:
This is one commercial kit containing exactly ${n} confirmed physical components.

All ${n} components are legitimate parts of the advertised product and must remain preserved.

${componentPlacementClause}

Do not remove, duplicate, merge, replace, recolor or reinterpret any confirmed kit component.

Preserve all confirmed:
- component counts;
- component positions;
- component relative sizes;
- geometry;
- branding placement;
- relationships between parts.

${relocationClause}
NO component-count changes
NO missing fixed components
NO unverified extra components.
DO NOT remove any confirmed kit component.
NO geometry redesign
NO branding relocation
NO material substitution
NO color drift
NO structural morphing
NO product substitution`
    );
  } else {
    const relocationClause = allowRelocation
      ? `Identity, count, scale, geometry and physical structure are preserved. Temporary relocation required by the demonstration is allowed (movement must be physically plausible, with no duplication or removal).`
      : `NO component relocation`;

    sections.push(
      `STRUCTURAL IDENTITY LOCK:
The product must remain the same physical object throughout the entire shot.

Preserve all confirmed:
- component counts;
- component positions;
- component relative sizes;
- geometry;
- branding placement;
- relationships between parts.

${relocationClause}
NO component-count changes
NO missing fixed components
NO extra components
NO geometry redesign
NO branding relocation
NO material substitution
NO color drift
NO structural morphing
NO product substitution`
    );
  }

  return sections.join('\n\n');
}

/**
 * Renders the deduplicated Avatar Identity Lock for Scene 3.
 * Preserves identity and wardrobe constraints without repeating the presenter description.
 */
export function renderScene3AvatarIdentityLock(
  context?: AvatarIdentityContext | null
): string {
  if (!context) return '';

  const status = getAvatarIdentityStatus(context);
  if (!status.active) return '';

  const lines: string[] = [
    `[AVATAR IDENTITY REFERENCE & LOCK]`,
    `- Status: Avatar Identity ACTIVE (Source: ${status.source})`,
    `- Clean Reference: ${status.cleanReference}`,
    `- Rule: Use the supplied avatar identity reference only to preserve the visible identity-related appearance of the presenter.`,
    `- Preserved Traits: Preserve facial appearance, visible facial proportions, hair characteristics, skin characteristics and confirmed distinguishing traits.`,
    `- Exclusion Mandate: Do not inherit pose, wardrobe, jewelry, background, camera framing, objects or lighting from the avatar reference unless explicitly requested by the current scene.`,
    `- Wardrobe Priority: ${SHARED_AVATAR_WARDROBE_PRIORITY_RULE}`,
    `- Action Priority: ${SHARED_AVATAR_POSE_PRIORITY_RULE}`,
    `- Lock Separation: AVATAR IDENTITY LOCK is strictly distinct from PRODUCT OBJECT LOCK. Avatar reference locks the human presenter only.`,
    `- Identity Continuity: Maintain consistent facial identity throughout all 8.0 seconds with zero facial morphing or identity drift.`
  ];

  const cleanIntrinsicProfile = serializeScene3CleanAvatarIdentity(context);
  if (cleanIntrinsicProfile && cleanIntrinsicProfile.length > 0) {
    lines.push(`- Intrinsic Identity Profile: ${cleanIntrinsicProfile}`);
  }

  if (isBrandMarkActive(context.brandMarkProfile)) {
    const brandMarkResult = resolveBrandMarkAuthority(context.brandMarkProfile);
    if (brandMarkResult.active && brandMarkResult.clause) {
      lines.push('');
      lines.push(brandMarkResult.clause);
    }
  }

  return lines.join('\n');
}

/**
 * Alias for buildCompiledScene3Model
 */
export const compileScene3Model = buildCompiledScene3Model;

/**
 * TEXT RENDERER
 * Formats the exact homologated master prompt from the canonical CompiledScene3Model.
 * Zero semantic drift: utilizes purely the frozen model fields.
 * Deduplicates domain ownership across product, presenter, actions, and structural locks.
 */
export function renderScene3Text(model: CompiledScene3Model): string {
  // Format presenter description
  const genderSuffix = model.presenterContract.gender ? ` (${model.presenterContract.gender.charAt(0).toUpperCase() + model.presenterContract.gender.slice(1)})` : '';
  const presenterDesc = `${model.presenterContract.identity}${genderSuffix}`;

  // Format wardrobe specification
  const wardrobeSpec = model.presenterContract.wardrobe.description;

  // Format environment
  const envSpec = `Real ${model.environment}, authentic everyday interior with natural ambient light, coherent with verified product use.`;

  // Format visible details
  const visibleDetailsStr = model.productContract.visibleDetails.join('; ');

  // Format product facts
  const factsStr = model.productContract.knownPhysicalFacts.length > 0
    ? model.productContract.knownPhysicalFacts.join('; ')
    : 'Identidade física e visual preservadas rigorosamente conforme imagem de referência.';

  // Format speech/action synchronization
  const syncItemsStr = model.speechActionSync
    .map(item => `- While speaking "${item.spokenSegment}": ${item.physicalAction}`)
    .join('\n');

  // Negative constraints text
  const negativesResult = buildScene3NegativeConstraints(model.productSpecificNegatives);

  // Retrieve master skeleton
  const skeleton = getScene3MasterTemplateSkeleton();

  // Perform clean deterministic interpolation
  const compiled = skeleton
    .replace('{{PRESENTER_DESCRIPTION}}', presenterDesc)
    .replace('{{WARDROBE_SPECIFICATION}}', wardrobeSpec)
    .replace('{{ENVIRONMENT_SPECIFICATION}}', envSpec)
    .replace('{{PRODUCT_IDENTITY}}', model.productContract.identity)
    .replace('{{PRODUCT_VISIBLE_DETAILS}}', visibleDetailsStr)
    .replace('{{PRODUCT_FACTS}}', factsStr)
    .replace('{{ACTION_0_2}}', model.timeline.action0to2)
    .replace('{{ACTION_2_4}}', model.timeline.action2to4)
    .replace('{{ACTION_4_6}}', model.timeline.action4to6)
    .replace('{{ACTION_6_8}}', model.timeline.action6to8)
    .replace('{{SPOKEN_CTA}}', model.dialogue.spokenCta)
    .replace('{{CTA_GESTURE}}', model.ctaGesture.description)
    .replace('{{SPEECH_ACTION_SYNC}}', syncItemsStr)
    .replace('{{NEGATIVE_CONSTRAINTS}}', negativesResult.combinedText);

  const structuralDnaBlock = renderScene3ProductStructuralDNA(model.productContract.structuralDNA);
  const coverageBlock = renderReferenceCoverageAndMotionSafety(
    model.productContract.referenceCoverage,
    model.productContract.motionSafety
  );
  const avatarIdentityBlock = renderScene3AvatarIdentityLock(model.presenterContract.avatarIdentityContext);

  let output = compiled;
  if (avatarIdentityBlock && !output.includes('[AVATAR IDENTITY REFERENCE & LOCK]')) {
    output = `${output}\n\n${avatarIdentityBlock}`;
  }
  if (structuralDnaBlock && !output.includes('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION')) {
    output = `${output}\n\n${structuralDnaBlock}`;
  }
  if (coverageBlock && !output.includes('REFERENCE COVERAGE & MOTION SAFETY')) {
    output = `${output}\n\n${coverageBlock}`;
  }

  return output;
}

/**
 * JSON RENDERER
 * Directly serializes the CompiledScene3Model into a typed JSON output.
 * 
 * GUARANTEES:
 * 1. Zero AI calls.
 * 2. Zero semantic drift (shares exact same data source).
 * 3. Does not summarize, rewrite, or drop semantic fields.
 */
export function renderScene3Json(model: CompiledScene3Model): Scene3JsonOutput {
  return {
    scene: model.scene,
    durationSeconds: model.technicalSpecifications.durationSeconds,
    aspectRatio: model.technicalSpecifications.aspectRatio,
    format: model.technicalSpecifications.format,
    shotType: model.technicalSpecifications.shotType,
    presenter: {
      identity: model.presenterContract.identity,
      ...(model.presenterContract.gender ? { gender: model.presenterContract.gender } : {}),
      avatarIdentityRule: model.presenterContract.avatarIdentityRule,
      wardrobe: {
        description: model.presenterContract.wardrobe.description
      },
      ...(model.presenterContract.avatarIdentityContext ? { avatarIdentityContext: model.presenterContract.avatarIdentityContext } : {})
    },
    environment: model.environment,
    product: {
      identity: model.productContract.identity,
      ...(model.productContract.quantity ? { quantity: model.productContract.quantity } : {}),
      visibleDetails: [...model.productContract.visibleDetails],
      knownPhysicalFacts: [...model.productContract.knownPhysicalFacts],
      exclusiveReferenceRule: model.productContract.exclusiveReferenceRule,
      scaleAndFidelityRule: model.productContract.scaleAndFidelityRule,
      ...(model.productContract.structuralDNA ? { structuralDNA: model.productContract.structuralDNA } : {}),
      ...(model.productContract.referenceCoverage ? { referenceCoverage: model.productContract.referenceCoverage } : {}),
      ...(model.productContract.motionSafety ? { motionSafety: model.productContract.motionSafety } : {})
    },
    closingPrinciple: {
      actionMandate: model.closingPrinciple.actionMandate
    },
    timeline: {
      action0to2: model.timeline.action0to2,
      action2to4: model.timeline.action2to4,
      action4to6: model.timeline.action4to6,
      action6to8: model.timeline.action6to8
    },
    dialogue: {
      spokenCta: model.dialogue.spokenCta,
      audioRules: [...model.dialogue.audioRules],
      exactDialogueLockRule: model.dialogue.exactDialogueLockRule
    },
    ctaGesture: {
      description: model.ctaGesture.description
    },
    speechActionSync: model.speechActionSync.map(s => ({
      spokenSegment: s.spokenSegment,
      physicalAction: s.physicalAction
    })),
    negativeConstraints: [...model.negativeConstraints]
  };
}

/**
 * Returns formatted 2-space indented JSON string of the compiled scene 3 model.
 */
export function renderScene3JsonString(model: CompiledScene3Model): string {
  return JSON.stringify(renderScene3Json(model), null, 2);
}

/**
 * Public compiler entry point for Scene 3.
 * Builds the canonical intermediate model and renders the homologated prompt text.
 */
export function compileScene3Prompt(slots: Scene3DynamicSlots): string {
  const model = buildCompiledScene3Model(slots);
  return renderScene3Text(model);
}
