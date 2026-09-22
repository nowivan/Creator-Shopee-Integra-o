/**
 * SCENE 2 PROMPT COMPILER — PURE DETERMINISTIC ENGINE
 * 
 * Rules:
 * 1. MUST NOT call Gemini.
 * 2. MUST NOT rewrite or summarize semantic content.
 * 3. MUST NOT improvise instructions.
 * 4. Validates required slots and throws typed errors on missing values.
 * 5. Guarantees byte-for-byte deterministic output for identical slot inputs.
 */

import {
  Scene2DynamicSlots,
  Scene2Wardrobe,
  CompiledScene2Model,
  Scene2JsonOutput,
  PhysicalInteractionPlan,
  ProductStructuralDNA,
  StructuralElement,
  ProductCategoryModule,
  CameraModuleDNA
} from '../types/compilerTypes';
import {
  getScene2MasterTemplateSkeleton,
  SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE,
  SCENE_2_NEGATIVE_CONSTRAINTS
} from '../templates/scene2BaseTemplate';
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
  ResolvedWardrobeContract,
  WardrobeConsistencyLock
} from '../wardrobe/wardrobePriorityResolver';

export class Scene2CompilationError extends Error {
  public readonly missingFields: string[];

  constructor(message: string, missingFields: string[] = []) {
    super(message);
    this.name = 'Scene2CompilationError';
    this.missingFields = missingFields;
  }
}

export interface SlotValidationResult {
  valid: boolean;
  errors: string[];
}

const BANNED_COMPILATION_FALLBACK_PATTERNS = [
  /\bproduto\s+factual(\s+de\s+refer[eê]ncia)?\b/i,
  /\bconforme\s+especifica[cç][aã]o\b/i,
  /\bresultado\s+pr[aá]tico\b/i,
  /\bgrande\s+diferencial\b/i,
  /\bproduto\s+de\s+consumo\s+para\s+uso\s+di[aá]rio\b/i,
  /\bitem\s+comercial\s+de\s+consumo\b/i,
  /\bitem\s+f[ií]sico\s+com\s+estrutura\s+e\s+acabamento\b/i,
  /\bgeometria\s+principal\s+e\s+elementos\b/i,
  /\bdetalhe\s+de\s+produto\b/i
];

const BANNED_GENERIC_IDENTITIES = [
  'produto',
  'produto demonstrado',
  'item factual',
  'produto de referência',
  'produto factual',
  'produto factual de referência',
  'item comercial de consumo',
  'item'
];

/**
 * PRE-COMPILATION SEMANTIC GATE
 * 
 * Verifies that the slots do not contain unresolved generic fallback placeholders
 * and that the data is grounded, specific, and actionable before compilation.
 */
export function validatePreCompilationSemanticGate(slots: Partial<Scene2DynamicSlots>): SlotValidationResult {
  const errors: string[] = [];

  if (!slots) {
    return { valid: false, errors: ['Slot object is undefined.'] };
  }

  // 1. Identity Check
  const identity = (slots.productIdentity || '').trim().toLowerCase();
  if (!identity || BANNED_GENERIC_IDENTITIES.includes(identity)) {
    errors.push(`UNRESOLVED_SEMANTIC_FALLBACK: Identidade do produto inválida ou genérica ("${slots.productIdentity}"). Deve ser um nome específico.`);
  }

  // 2. Scan all string fields and arrays for banned semantic fallback strings
  const stringFieldsToScan: { fieldName: string; value: string }[] = [
    { fieldName: 'productIdentity', value: slots.productIdentity || '' },
    { fieldName: 'primaryBenefit', value: slots.primaryBenefit || '' },
    { fieldName: 'spokenCopy', value: slots.spokenCopy || '' },
    { fieldName: 'environment', value: slots.environment || '' },
    { fieldName: 'actions.action0to2', value: slots.actions?.action0to2 || '' },
    { fieldName: 'actions.action2to4', value: slots.actions?.action2to4 || '' },
    { fieldName: 'actions.action4to6', value: slots.actions?.action4to6 || '' },
    { fieldName: 'actions.action6to8', value: slots.actions?.action6to8 || '' }
  ];

  if (Array.isArray(slots.productFacts)) {
    slots.productFacts.forEach((fact, idx) => {
      stringFieldsToScan.push({ fieldName: `productFacts[${idx}]`, value: fact });
    });
  }

  if (Array.isArray(slots.productVisibleDetails)) {
    slots.productVisibleDetails.forEach((detail, idx) => {
      stringFieldsToScan.push({ fieldName: `productVisibleDetails[${idx}]`, value: detail });
    });
  }

  for (const item of stringFieldsToScan) {
    for (const pattern of BANNED_COMPILATION_FALLBACK_PATTERNS) {
      if (pattern.test(item.value)) {
        errors.push(`UNRESOLVED_SEMANTIC_FALLBACK: Campo "${item.fieldName}" contém placeholder genérico não permitido: ${pattern}`);
      }
    }
  }

  // 3. Speech Action Sync Check
  if (Array.isArray(slots.speechActionSync) && slots.spokenCopy) {
    const copyLower = slots.spokenCopy.toLowerCase();
    slots.speechActionSync.forEach((sync, idx) => {
      const phraseLower = (sync.phrase || '').toLowerCase().trim();
      if (phraseLower && !copyLower.includes(phraseLower) && phraseLower.length > 8) {
        // Warning: partial mismatch
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates that all required Scene 2 dynamic slots are present and non-empty,
 * and passes the Pre-Compilation Semantic Gate.
 */
export function validateScene2Slots(slots: Partial<Scene2DynamicSlots>): SlotValidationResult {
  const errors: string[] = [];

  if (!slots) {
    return { valid: false, errors: ['Slot object is undefined or null.'] };
  }

  if (!slots.productIdentity || !slots.productIdentity.trim()) {
    errors.push('Missing required slot: productIdentity');
  }

  if (!slots.productFacts || !Array.isArray(slots.productFacts) || slots.productFacts.length === 0) {
    errors.push('Missing required slot: productFacts (must contain at least one verified fact)');
  }

  if (!slots.productVisibleDetails || !Array.isArray(slots.productVisibleDetails) || slots.productVisibleDetails.length === 0) {
    errors.push('Missing required slot: productVisibleDetails (must contain observable details)');
  }

  if (!slots.presenter || !slots.presenter.description || !slots.presenter.description.trim()) {
    errors.push('Missing required slot: presenter.description');
  }

  if (!slots.wardrobe) {
    errors.push('Missing required slot: wardrobe');
  } else {
    const w = slots.wardrobe;
    if (!w.topType || !w.topType.trim()) errors.push('Missing required wardrobe field: topType');
    if (!w.topColor || !w.topColor.trim()) errors.push('Missing required wardrobe field: topColor');
    if (!w.bottomType || !w.bottomType.trim()) errors.push('Missing required wardrobe field: bottomType');
    if (!w.bottomColor || !w.bottomColor.trim()) errors.push('Missing required wardrobe field: bottomColor');
    if (!w.footwearType || !w.footwearType.trim()) errors.push('Missing required wardrobe field: footwearType');
    if (!w.footwearColor || !w.footwearColor.trim()) errors.push('Missing required wardrobe field: footwearColor');
  }

  if (!slots.environment || !slots.environment.trim()) {
    errors.push('Missing required slot: environment');
  }

  if (!slots.primaryBenefit || !slots.primaryBenefit.trim()) {
    errors.push('Missing required slot: primaryBenefit');
  }

  if (!slots.spokenCopy || !slots.spokenCopy.trim()) {
    errors.push('Missing required slot: spokenCopy');
  }

  if (!slots.actions) {
    errors.push('Missing required slot: actions');
  } else {
    const a = slots.actions;
    if (!a.action0to2 || !a.action0to2.trim()) errors.push('Missing required action: action0to2 (0.0s - 2.0s)');
    if (!a.action2to4 || !a.action2to4.trim()) errors.push('Missing required action: action2to4 (2.0s - 4.0s)');
    if (!a.action4to6 || !a.action4to6.trim()) errors.push('Missing required action: action4to6 (4.0s - 6.0s)');
    if (!a.action6to8 || !a.action6to8.trim()) errors.push('Missing required action: action6to8 (6.0s - 8.0s)');
  }

  if (!slots.speechActionSync || !Array.isArray(slots.speechActionSync) || slots.speechActionSync.length === 0) {
    errors.push('Missing required slot: speechActionSync (must contain at least one synchronization item)');
  }

  // Run Pre-Compilation Semantic Gate
  const semanticGate = validatePreCompilationSemanticGate(slots);
  if (!semanticGate.valid) {
    errors.push(...semanticGate.errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formats the wardrobe specification string following the priority contract.
 */
export function formatWardrobeSpecification(w: Scene2Wardrobe): string {
  const topDesc = `${w.topColor.trim()} ${w.topType.trim()}${w.topStyle ? ` (${w.topStyle.trim()})` : ''}`;
  const bottomDesc = `${w.bottomColor.trim()} ${w.bottomType.trim()}`;
  const footwearDesc = `${w.footwearColor.trim()} ${w.footwearType.trim()}`;
  return `${topDesc}, ${bottomDesc}, and ${footwearDesc}`;
}

/**
 * Pure deterministic model builder for Scene 2.
 * Validates dynamic slots and creates the intermediate CompiledScene2Model canonical representation.
 */
export function buildCompiledScene2Model(slots: Scene2DynamicSlots): CompiledScene2Model {
  const validation = validateScene2Slots(slots);
  if (!validation.valid) {
    throw new Scene2CompilationError(
      `Cannot compile Scene 2 prompt. Missing or invalid slots: ${validation.errors.join('; ')}`,
      validation.errors
    );
  }

  const resolvedWardrobe = slots.resolvedWardrobeContract || resolveWardrobeContract({
    wardrobeForm: {
      presenterGender: slots.presenter.gender,
      topType: slots.wardrobe.topType,
      topColor: slots.wardrobe.topColor,
      topStyle: slots.wardrobe.topStyle,
      bottomType: slots.wardrobe.bottomType,
      bottomColor: slots.wardrobe.bottomColor,
      footwearType: slots.wardrobe.footwearType,
      footwearColor: slots.wardrobe.footwearColor,
      presenterDescription: slots.presenter.description
    }
  });
  const wardrobeLock = slots.wardrobeConsistencyLock || buildWardrobeConsistencyLock(resolvedWardrobe);

  const model: CompiledScene2Model = {
    scene: 2,
    technicalSpecifications: {
      aspectRatio: "9:16",
      durationSeconds: 8,
      format: "Brazilian UGC (User-Generated Content), authentic everyday smartphone realism.",
      shotType: "Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, NO gimbal stabilization, NO cinematic color grading, authentic natural ambient lighting)."
    },
    presenter: {
      gender: slots.presenter.gender,
      description: slots.presenter.description.trim(),
      avatarIdentityRule: SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE,
      wardrobe: {
        topType: (resolvedWardrobe.topType || slots.wardrobe.topType).trim(),
        ...(resolvedWardrobe.topStyle || slots.wardrobe.topStyle ? { topStyle: (resolvedWardrobe.topStyle || slots.wardrobe.topStyle)!.trim() } : {}),
        topColor: (resolvedWardrobe.topColor || slots.wardrobe.topColor).trim(),
        bottomType: (resolvedWardrobe.bottomType || slots.wardrobe.bottomType).trim(),
        bottomColor: (resolvedWardrobe.bottomColor || slots.wardrobe.bottomColor).trim(),
        footwearType: (resolvedWardrobe.footwearType || slots.wardrobe.footwearType).trim(),
        footwearColor: (resolvedWardrobe.footwearColor || slots.wardrobe.footwearColor).trim()
      },
      resolvedWardrobeContract: resolvedWardrobe,
      wardrobeConsistencyLock: wardrobeLock,
      ...(slots.avatarIdentityContext || slots.presenter.avatarIdentityContext ? {
        avatarIdentityContext: slots.avatarIdentityContext || slots.presenter.avatarIdentityContext
      } : {})
    },
    environment: slots.environment.trim(),
    product: {
      identity: slots.productIdentity.trim(),
      quantity: slots.productQuantity ? slots.productQuantity.trim() : null,
      observableDetails: slots.productVisibleDetails.map(d => d.trim()).filter(Boolean),
      physicalFacts: slots.productFacts.map(f => f.trim()).filter(Boolean),
      exclusiveReferenceRule: "The uploaded product image is the exclusive visual reference.",
      scaleAndFidelityRule: "Maintain realistic physical scale and structural integrity. Do not deform, omit essential parts or invent unverified accessories.",
      ...(slots.structuralDNA ? {
        structuralDNA: {
          ...slots.structuralDNA,
          ...(slots.isCommercialPackConfirmed ? { isCommercialPackConfirmed: true } : {}),
          ...(slots.kitComponentCount ? { kitComponentCount: slots.kitComponentCount } : {}),
          ...(slots.handledComponentCount ? { handledComponentCount: slots.handledComponentCount } : {}),
          ...(slots.remainingVisibleComponentCount ? { remainingVisibleComponentCount: slots.remainingVisibleComponentCount } : {})
        }
      } : {}),
      ...(slots.referenceCoverage ? { referenceCoverage: slots.referenceCoverage } : {}),
      ...(slots.motionSafety ? { motionSafety: slots.motionSafety } : {})
    },
    primaryBenefit: slots.primaryBenefit.trim(),
    benefitActionMandate: "Action must physically support the spoken benefit through practical everyday handling. No empty product presentation, no static posing, no generic holding of packaging.",
    actions: {
      action0to2: slots.actions.action0to2.trim(),
      action2to4: slots.actions.action2to4.trim(),
      action4to6: slots.actions.action4to6.trim(),
      action6to8: slots.actions.action6to8.trim()
    },
    spokenCopy: slots.spokenCopy.trim(),
    speechActionSync: slots.speechActionSync.map(item => ({
      phrase: item.phrase.trim(),
      action: item.action.trim()
    })),
    audioRules: [
      "Direct on-camera speech in Brazilian Portuguese (PT-BR).",
      "NO VOICE-OVER. NO NARRATION.",
      "Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.",
      "Say ONLY the exact dialogue locked phrase."
    ],
    negativeConstraints: SCENE_2_NEGATIVE_CONSTRAINTS.split('. ').map(c => c.trim()).filter(Boolean),
    ...(slots.physicalChoreography ? { physicalChoreography: slots.physicalChoreography } : {})
  };

  return Object.freeze(model);
}

/**
 * Deterministically renders the Physical Action & Choreography contract block for the prompt.
 * Only active when interactionRisk is MEDIUM or HIGH.
 * Emits physical continuity, collision avoidance, and safety constraints without restating the action timeline.
 */
export function renderPhysicalActionChoreography(plan?: PhysicalInteractionPlan): string | null {
  if (!plan || (plan.interactionRisk !== 'HIGH' && plan.interactionRisk !== 'MEDIUM')) {
    return null;
  }

  const lines: string[] = [
    `[PHYSICAL ACTION & CHOREOGRAPHY CONTRACT]`,
    `- Interaction Risk Level: ${plan.interactionRisk}`,
    `- Primary Target: ${plan.primaryTarget || 'Primary product structure'}`,
    `- Anticipated Start Position: ${plan.actorStartPosition || 'Presenter begins already positioned beside primary target.'}`
  ];

  if (plan.requiredClearance && plan.requiredClearance.length > 0) {
    lines.push(`- Spatial Clearance & Movement Trajectory:`);
    plan.requiredClearance.forEach(clr => lines.push(`  * ${clr}`));
  }

  if (plan.collisionBoundaries && plan.collisionBoundaries.length > 0) {
    lines.push(`- Collision Boundaries & Solid Geometry:`);
    plan.collisionBoundaries.forEach(cb => lines.push(`  * ${cb}`));
  }

  if (plan.preExistingProps && plan.preExistingProps.length > 0) {
    lines.push(`- Prop Continuity & Pre-Existing Props:`);
    plan.preExistingProps.forEach(prop => lines.push(`  * ${prop}`));
  }

  if (plan.cameraSafetyInstructions && plan.cameraSafetyInstructions.length > 0) {
    lines.push(`- Camera Safety Mandate:`);
    plan.cameraSafetyInstructions.forEach(cs => lines.push(`  * ${cs}`));
  }

  lines.push(`- Physical Continuity & Collision Constraints:`);
  lines.push(`  * Hand and grip continuity: maintain stable grip and natural hand contact throughout interaction.`);
  lines.push(`  * Product orientation continuity: preserve product orientation across transitions without sudden flips.`);
  lines.push(`  * Physically plausible movement: all motions follow natural human kinetics and arm trajectories.`);
  lines.push(`  * Transition safety: movements between actions remain smooth, continuous, and physically grounded.`);
  lines.push(`  * No body-object clipping or mesh interpenetration.`);
  lines.push(`  * No torso, hip, leg, knee, arm or hand passing through solid furniture geometry.`);
  lines.push(`  * No teleportation or phase-shifting across obstacles.`);
  lines.push(`  * The presenter must navigate around obstacles with positive spatial clearance rather than intersecting them.`);

  return lines.join('\n');
}

/**
 * Renders deduplicated Product Structural DNA for Scene 2.
 * Emits structural locks, geometry constraints, and component relationships
 * without repeating product name, visible colors, or generic appearance descriptions
 * already established in the Product Contract.
 */
export function renderScene2ProductStructuralDNA(dna?: ProductStructuralDNA | null): string {
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
 * Renders the deduplicated Avatar Identity Lock for Scene 2.
 * Preserves identity and wardrobe constraints without repeating the presenter description.
 */
export function renderScene2AvatarIdentityLock(
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
 * Alias for buildCompiledScene2Model
 */
export const compileScene2Model = buildCompiledScene2Model;

/**
 * TEXT RENDERER
 * Formats the exact homologated master prompt from the canonical CompiledScene2Model.
 * Zero semantic drift: utilizes purely the frozen model fields.
 * Deduplicates domain ownership across product, presenter, actions, and structural locks.
 */
export function renderScene2Text(model: CompiledScene2Model): string {
  // Format presenter description
  const presenterDesc = `${model.presenter.description} (${model.presenter.gender === 'female' ? 'Female' : 'Male'})`;

  // Format wardrobe specification
  const wardrobeSpec = formatWardrobeSpecification(model.presenter.wardrobe);

  // Format environment
  const envSpec = `Real ${model.environment}, authentic everyday interior with natural ambient light, coherent with verified product use.`;

  // Format visible details
  const visibleDetailsStr = model.product.observableDetails.join('; ');

  // Format product facts
  const factsStr = model.product.physicalFacts.join('; ');

  // Format speech/action synchronization
  const syncItemsStr = model.speechActionSync
    .map(item => `- While speaking "${item.phrase}": ${item.action}`)
    .join('\n');

  // Retrieve master skeleton
  const skeleton = getScene2MasterTemplateSkeleton();

  // Perform clean deterministic interpolation
  const compiled = skeleton
    .replace('{{PRESENTER_DESCRIPTION}}', presenterDesc)
    .replace('{{WARDROBE_SPECIFICATION}}', wardrobeSpec)
    .replace('{{ENVIRONMENT_SPECIFICATION}}', envSpec)
    .replace('{{PRODUCT_IDENTITY}}', model.product.identity)
    .replace('{{PRODUCT_VISIBLE_DETAILS}}', visibleDetailsStr)
    .replace('{{PRODUCT_FACTS}}', factsStr)
    .replace('{{PRIMARY_BENEFIT}}', model.primaryBenefit)
    .replace('{{ACTION_0_2}}', model.actions.action0to2)
    .replace('{{ACTION_2_4}}', model.actions.action2to4)
    .replace('{{ACTION_4_6}}', model.actions.action4to6)
    .replace('{{ACTION_6_8}}', model.actions.action6to8)
    .replace('{{SPOKEN_COPY}}', model.spokenCopy)
    .replace('{{SPEECH_ACTION_SYNC}}', syncItemsStr);

  const structuralDnaBlock = renderScene2ProductStructuralDNA(model.product.structuralDNA);
  const coverageBlock = renderReferenceCoverageAndMotionSafety(
    model.product.referenceCoverage,
    model.product.motionSafety
  );
  const avatarIdentityBlock = renderScene2AvatarIdentityLock(model.presenter.avatarIdentityContext);
  const physicalChoreographyBlock = renderPhysicalActionChoreography(model.physicalChoreography);

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
  if (physicalChoreographyBlock && !output.includes('[PHYSICAL ACTION & CHOREOGRAPHY CONTRACT]')) {
    output = `${output}\n\n${physicalChoreographyBlock}`;
  }

  return output;
}

/**
 * JSON RENDERER
 * Directly serializes the CompiledScene2Model into a typed JSON output.
 * 
 * GUARANTEES:
 * 1. Zero AI calls.
 * 2. Zero semantic drift (shares exact same data source).
 * 3. Does not summarize, rewrite, or drop semantic fields.
 */
export function renderScene2Json(model: CompiledScene2Model): Scene2JsonOutput {
  return {
    scene: model.scene,
    durationSeconds: model.technicalSpecifications.durationSeconds,
    aspectRatio: model.technicalSpecifications.aspectRatio,
    format: model.technicalSpecifications.format,
    shotType: model.technicalSpecifications.shotType,
    presenter: {
      gender: model.presenter.gender,
      description: model.presenter.description,
      avatarIdentityRule: model.presenter.avatarIdentityRule,
      wardrobe: {
        topType: model.presenter.wardrobe.topType,
        ...(model.presenter.wardrobe.topStyle ? { topStyle: model.presenter.wardrobe.topStyle } : {}),
        topColor: model.presenter.wardrobe.topColor,
        bottomType: model.presenter.wardrobe.bottomType,
        bottomColor: model.presenter.wardrobe.bottomColor,
        footwearType: model.presenter.wardrobe.footwearType,
        footwearColor: model.presenter.wardrobe.footwearColor
      },
      ...(model.presenter.avatarIdentityContext ? { avatarIdentityContext: model.presenter.avatarIdentityContext } : {})
    },
    environment: model.environment,
    product: {
      identity: model.product.identity,
      ...(model.product.quantity ? { quantity: model.product.quantity } : {}),
      observableDetails: [...model.product.observableDetails],
      physicalFacts: [...model.product.physicalFacts],
      exclusiveReferenceRule: model.product.exclusiveReferenceRule,
      scaleAndFidelityRule: model.product.scaleAndFidelityRule,
      ...(model.product.structuralDNA ? { structuralDNA: model.product.structuralDNA } : {}),
      ...(model.product.referenceCoverage ? { referenceCoverage: model.product.referenceCoverage } : {}),
      ...(model.product.motionSafety ? { motionSafety: model.product.motionSafety } : {})
    },
    primaryBenefit: model.primaryBenefit,
    benefitActionMandate: model.benefitActionMandate,
    actions: {
      action0to2: model.actions.action0to2,
      action2to4: model.actions.action2to4,
      action4to6: model.actions.action4to6,
      action6to8: model.actions.action6to8
    },
    spokenCopy: model.spokenCopy,
    speechActionSync: model.speechActionSync.map(s => ({
      phrase: s.phrase,
      action: s.action
    })),
    audioRules: [...model.audioRules],
    negativeConstraints: [...model.negativeConstraints],
    ...(model.physicalChoreography ? { physicalChoreography: model.physicalChoreography } : {})
  };
}

/**
 * Returns formatted 2-space indented JSON string of the compiled scene model.
 */
export function renderScene2JsonString(model: CompiledScene2Model): string {
  return JSON.stringify(renderScene2Json(model), null, 2);
}

/**
 * Public compiler entry point for Scene 2.
 * Builds the canonical intermediate model and renders the homologated prompt text.
 */
export function compileScene2Prompt(slots: Scene2DynamicSlots): string {
  const model = buildCompiledScene2Model(slots);
  return renderScene2Text(model);
}

