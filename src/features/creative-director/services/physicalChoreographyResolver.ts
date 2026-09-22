/**
 * PHYSICAL ACTION CHOREOGRAPHY RESOLVER
 * SCENE 2 — HUMAN–OBJECT SPATIAL SAFETY & MOTION FIDELITY
 * 
 * Purely deterministic, zero-AI-call resolver that sits between Scene 2 Scene Brain
 * and CompiledScene2Model.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Interaction Risk Classification (NONE | LOW | MEDIUM | HIGH)
 * 2. Scene Object Allowlist Extraction (strictly from current Scene 2 context)
 * 3. Choreography Context Validation & Unrelated Object Blocking (PASS | WARN | BLOCK)
 * 4. Safe Fallback Plan Generation on BLOCK (preserves temporal actions & physical continuity)
 * 5. Start Position Anticipation (pre-positions presenter next to primary target)
 * 6. Action Complexity Budget (prevents physical action overload in 8s takes)
 * 7. Spatial Clearance Planning (positive geometric instructions for furniture/surfaces)
 * 8. Valid Body Trajectory & Collision Boundary Definition (prevents clipping/interpenetration)
 * 9. Pre-Existing Prop Continuity (enforces 0.0s existence of handled props)
 * 10. Speech-Action Anchor Validation & Reconciliation (enforces 100% exact dialogue fidelity)
 * 11. Camera Safety Enforcement during complex physical interactions
 */

import {
  Scene2Actions,
  Scene2SpeechActionSyncItem,
  PhysicalInteractionPlan,
  PhysicalInteractionRisk,
  PhysicalSpeechActionAnchor,
  ProductStructuralDNA,
  ProductReferenceCoverage,
  ProductMotionSafety,
  DemonstrationRisk,
  GeometryConfidence,
  DemonstrationGuardStatus,
  DemonstrationMode,
  DemonstrationBenefitCandidate,
  SafeDemoSelectionResult,
  InteractionRequirementCheck,
  DemonstrationSafetyEvaluation,
  Scene2LoadLevel,
  CameraMovementLoad,
  Scene2ActionBudgetEvaluation,
  Scene2SpeechLoadEvaluation,
  Scene2CombinedLoadEvaluation
} from '../types/compilerTypes';

export {
  type DemonstrationRisk,
  type GeometryConfidence,
  type DemonstrationGuardStatus,
  type DemonstrationMode,
  type DemonstrationBenefitCandidate,
  type SafeDemoSelectionResult,
  type InteractionRequirementCheck,
  type DemonstrationSafetyEvaluation,
  type Scene2LoadLevel,
  type CameraMovementLoad,
  type Scene2ActionBudgetEvaluation,
  type Scene2SpeechLoadEvaluation,
  type Scene2CombinedLoadEvaluation
};

export interface PhysicalChoreographyInput {
  actions: Scene2Actions;
  environment: string;
  productIdentity: string;
  category?: string;
  productFacts?: string[];
  productVisibleDetails?: string[];
  spokenCopy: string;
  speechActionSync: Scene2SpeechActionSyncItem[];
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  isCommercialPackConfirmed?: boolean;
  kitComponentCount?: number;
}

export type ChoreographyValidationStatus = 'PASS' | 'WARN' | 'BLOCK';

export interface ChoreographyValidationResult {
  status: ChoreographyValidationStatus;
  reasons: string[];
  unrelatedObjects: string[];
  startStateMismatch?: {
    temporalStartState: string;
    choreographyStartState: string;
  };
  allowlist: string[];
}

// -----------------------------------------------------------------------------
// 1. SCENE OBJECT ALLOWLIST EXTRACTOR (SCENE 2 ONLY)
// -----------------------------------------------------------------------------

const KNOWN_OBJECT_DICTIONARY: { [key: string]: string[] } = {
  bed: ['bed', 'cama', 'colchão', 'mattress', 'headboard', 'cabeceira', 'bedding', 'roupa de cama', 'travesseiro', 'pillow'],
  nightstand: ['nightstand', 'criado-mudo', 'criado mudo', 'mesa de cabeceira', 'bedside', 'bedside table'],
  chair: ['chair', 'cadeira', 'cadeiras', 'banco', 'stool', 'seat', 'assento'],
  armchair: ['armchair', 'poltrona', 'poltronas', 'reclinável', 'recliner'],
  sofa: ['sofa', 'sofá', 'couch', 'estofado'],
  dining_table: ['dining table', 'mesa de jantar', 'mesa de almoço'],
  desk_workstation: ['desk', 'escrivaninha', 'workstation', 'workstation table', 'mesa de trabalho', 'mesa de escritório', 'bancada de trabalho'],
  table: ['table', 'mesa', 'tabletop'],
  countertop: ['counter', 'countertop', 'bancada', 'balcão', 'ilha', 'kitchen island'],
  sink_vanity: ['sink', 'pia', 'vanity', 'lavatório', 'espelho', 'mirror'],
  cabinet: ['cabinet', 'armário', 'armario', 'gaveteiro', 'drawer', 'gaveta', 'shelf', 'prateleira', 'estante', 'closet', 'guarda-roupa'],
  room_structure: ['floor', 'chão', 'piso', 'wall', 'parede', 'window', 'janela', 'door', 'porta', 'ceiling', 'teto'],
  appliance: ['airfryer', 'fritadeira', 'geladeira', 'fridge', 'fogão', 'stove', 'cooktop', 'microwave', 'microondas', 'cafeteira', 'coffee maker'],
  cookware: ['panela', 'pot', 'frigideira', 'pan', 'casserole', 'caçarola', 'tampa', 'lid', 'cesto', 'basket'],
  dinnerware: ['plate', 'prato', 'pratos', 'bowl', 'tigela', 'cup', 'xícara', 'copo', 'glass', 'talher', 'fork', 'garfo', 'knife', 'faca', 'porcelana', 'porcelain'],
  cosmetics: ['bottle', 'frasco', 'dropper', 'conta-gotas', 'pote', 'jar', 'tube', 'tubo', 'dispenser', 'serum', 'sérum', 'creme', 'cream'],
  electronics_props: ['smartphone', 'celular', 'phone', 'speaker', 'g-speaker', 'smart speaker', 'caixa de som', 'lamp', 'luminária', 'abajur', 'sound machine', 'watch', 'relógio', 'laptop', 'notebook', 'towel', 'toalha', 'toalhas', 'box', 'caixa', 'embalagem', 'package']
};

/**
 * Builds the sceneObjectAllowlist strictly from the CURRENT Scene 2 inputs.
 * Only objects present in environment, product, facts, props, presenter, or actions are allowed.
 */
export function buildSceneObjectAllowlist(input: PhysicalChoreographyInput): string[] {
  const combinedContext = [
    input.environment,
    input.productIdentity,
    input.category || '',
    ...(input.productFacts || []),
    ...(input.productVisibleDetails || []),
    input.actions.action0to2,
    input.actions.action2to4,
    input.actions.action4to6,
    input.actions.action6to8,
    input.speechActionSync.map(s => `${s.phrase} ${s.action}`).join(' ')
  ].join(' ').toLowerCase();

  const allowedObjects = new Set<string>();

  // Always allowed structural baselines
  allowedObjects.add('presenter');
  allowedObjects.add('actor');
  allowedObjects.add('hands');
  allowedObjects.add('body');
  allowedObjects.add('floor');
  allowedObjects.add('wall');

  // Add the product identity normalized words
  const productTokens = input.productIdentity.toLowerCase().split(/[\s,/-]+/).filter(t => t.length > 2);
  productTokens.forEach(t => allowedObjects.add(t));

  // Check dictionary entries against the combined context
  for (const [canonicalKey, synonyms] of Object.entries(KNOWN_OBJECT_DICTIONARY)) {
    const isPresent = synonyms.some(syn => {
      const regex = new RegExp(`\\b${syn.replace('-', '[- ]')}\\b`, 'i');
      return regex.test(combinedContext);
    });

    if (isPresent) {
      allowedObjects.add(canonicalKey);
      synonyms.forEach(syn => allowedObjects.add(syn));
    }
  }

  // Also extract custom noun phrases from environment
  const envWords = input.environment.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 3);
  envWords.forEach(w => allowedObjects.add(w));

  return Array.from(allowedObjects).sort();
}

/**
 * Checks if a specific object or term is allowed by the scene context allowlist.
 */
export function isObjectInAllowlist(objectTerm: string, allowlist: string[]): boolean {
  const normalized = objectTerm.toLowerCase().trim();
  if (!normalized) return true;

  return allowlist.some(allowed => {
    return normalized.includes(allowed) || allowed.includes(normalized);
  });
}

// -----------------------------------------------------------------------------
// 2. CHOREOGRAPHY CONTEXT VALIDATOR & UNRELATED OBJECT BLOCKER
// -----------------------------------------------------------------------------

// Specific high-risk furniture/fixture objects that must never leak into foreign scenes
const TRACKED_DISCRETE_OBJECTS: { [key: string]: { label: string; terms: string[]; synonyms: string[] } } = {
  chair: {
    label: 'chair',
    terms: ['chair', 'cadeira', 'chair frame', 'backrest frame', 'chair legs', 'chair base'],
    synonyms: ['chair', 'cadeira', 'cadeiras', 'banco', 'stool']
  },
  workstation_table: {
    label: 'workstation table / desk',
    terms: ['workstation table', 'desk', 'escrivaninha', 'table apron', 'underside apron', 'table frame', 'dining table', 'mesa de jantar', 'mesa de trabalho', 'mesa de escritório'],
    synonyms: ['desk', 'escrivaninha', 'workstation', 'workstation table', 'dining table', 'mesa de jantar', 'table', 'mesa']
  },
  bed: {
    label: 'bed',
    terms: ['bed', 'cama', 'mattress', 'colchão', 'headboard'],
    synonyms: ['bed', 'cama', 'colchão', 'mattress']
  },
  nightstand: {
    label: 'nightstand',
    terms: ['nightstand', 'criado-mudo', 'criado mudo', 'mesa de cabeceira'],
    synonyms: ['nightstand', 'criado-mudo', 'criado mudo', 'mesa de cabeceira']
  },
  armchair_sofa: {
    label: 'armchair / sofa',
    terms: ['armchair', 'poltrona', 'sofa', 'sofá', 'couch', 'lounge furniture'],
    synonyms: ['armchair', 'poltrona', 'sofa', 'sofá', 'couch']
  },
  seat_cushion: {
    label: 'seat cushion',
    terms: ['seat cushion'],
    synonyms: ['chair', 'cadeira', 'cadeiras', 'armchair', 'poltrona', 'sofa', 'sofá', 'couch', 'banco', 'stool']
  },
  countertop: {
    label: 'countertop / vanity',
    terms: ['countertop', 'kitchen counter', 'bancada da cozinha', 'vanity', 'bancada'],
    synonyms: ['counter', 'countertop', 'bancada', 'balcão', 'vanity', 'pia', 'sink']
  }
};

/**
 * Validates a PhysicalInteractionPlan against the current Scene 2 context.
 * Returns: PASS | WARN | BLOCK
 */
export function validateChoreographyAgainstSceneContext(
  plan: PhysicalInteractionPlan,
  input: PhysicalChoreographyInput
): ChoreographyValidationResult {
  const allowlist = buildSceneObjectAllowlist(input);
  const reasons: string[] = [];
  const unrelatedObjects: string[] = [];

  // 1. Gather all generated choreography text
  const choreographyTextParts = [
    plan.primaryTarget || '',
    plan.actorStartPosition || '',
    ...(plan.actionSequence || []),
    ...(plan.requiredClearance || []),
    ...(plan.collisionBoundaries || [])
  ];
  const combinedChoreographyText = choreographyTextParts.join(' ').toLowerCase();

  // 2. Check for presence of unallowed discrete objects
  for (const [objKey, config] of Object.entries(TRACKED_DISCRETE_OBJECTS)) {
    const mentionedInChoreography = config.terms.some(term => combinedChoreographyText.includes(term));
    if (mentionedInChoreography) {
      const allowed = config.synonyms.some(syn => allowlist.includes(syn));
      if (!allowed) {
        unrelatedObjects.push(config.label);
        reasons.push(`Choreography references '${config.label}' (${config.terms.filter(t => combinedChoreographyText.includes(t)).join(', ')}), which is NOT present in current Scene 2 context.`);
      }
    }
  }

  // 3. Start-State Consistency Validation
  const temporalAction0to2 = input.actions.action0to2.toLowerCase();
  const choreoStartPosition = (plan.actorStartPosition || '').toLowerCase();

  const temporalIsSeated = temporalAction0to2.includes('seated') || temporalAction0to2.includes('sitting') || temporalAction0to2.includes('senta') || temporalAction0to2.includes('sentado') || temporalAction0to2.includes('sentada') || temporalAction0to2.includes('deitado') || temporalAction0to2.includes('lying');
  const temporalIsStanding = temporalAction0to2.includes('standing') || temporalAction0to2.includes('stands') || temporalAction0to2.includes('em pé') || temporalAction0to2.includes('de pé') || temporalAction0to2.includes('walks') || temporalAction0to2.includes('caminha') || temporalAction0to2.includes('levanta');

  const choreoIsStanding = choreoStartPosition.includes('standing') || choreoStartPosition.includes('stands') || choreoStartPosition.includes('stands naturally');
  const choreoIsSeated = choreoStartPosition.includes('seated') || choreoStartPosition.includes('sitting');

  let startStateMismatch: { temporalStartState: string; choreographyStartState: string } | undefined;

  if (temporalIsSeated && choreoIsStanding && !choreoIsSeated) {
    startStateMismatch = {
      temporalStartState: input.actions.action0to2,
      choreographyStartState: plan.actorStartPosition || ''
    };
    reasons.push(`Start-state conflict: Temporal action plan specifies presenter is seated/sitting, but choreography specifies standing start position ('${plan.actorStartPosition}').`);
  } else if (temporalIsStanding && choreoIsSeated && !choreoIsStanding) {
    startStateMismatch = {
      temporalStartState: input.actions.action0to2,
      choreographyStartState: plan.actorStartPosition || ''
    };
    reasons.push(`Start-state conflict: Temporal action plan specifies presenter is standing, but choreography specifies seated start position ('${plan.actorStartPosition}').`);
  }

  // Check surface anchor mismatch in start position
  if (temporalAction0to2.includes('bed') || temporalAction0to2.includes('cama')) {
    if (choreoStartPosition.includes('chair') || choreoStartPosition.includes('cadeira') || choreoStartPosition.includes('workstation')) {
      reasons.push(`Start-state surface mismatch: Temporal action anchors to 'bed', but choreography start position anchors to '${choreoStartPosition}'.`);
    }
  }

  // Determine final status
  if (unrelatedObjects.length > 0 || startStateMismatch) {
    return {
      status: 'BLOCK',
      reasons,
      unrelatedObjects: Array.from(new Set(unrelatedObjects)),
      startStateMismatch,
      allowlist
    };
  }

  if (reasons.length > 0) {
    return {
      status: 'WARN',
      reasons,
      unrelatedObjects: [],
      allowlist
    };
  }

  return {
    status: 'PASS',
    reasons: [],
    unrelatedObjects: [],
    allowlist
  };
}

// -----------------------------------------------------------------------------
// 3. SAFE FALLBACK CHOREOGRAPHY PLAN GENERATOR
// -----------------------------------------------------------------------------

/**
 * Creates a safe fallback physical choreography plan aligned strictly with the
 * valid Temporal Action Plan and Scene 2 context, without foreign objects.
 */
export function createSafeFallbackChoreographyPlan(
  input: PhysicalChoreographyInput,
  reasons?: string[]
): PhysicalInteractionPlan {
  const speechActionAnchors = validateAndReconcileSpeechAnchors(
    input.speechActionSync,
    input.spokenCopy,
    input.actions
  );

  // Derive start position authentically from action0to2
  const rawAction0to2 = input.actions.action0to2.trim();

  const isSafetyGateBlocked = Array.isArray(reasons) && reasons.some(r =>
    r.toLowerCase().includes('safety') ||
    r.toLowerCase().includes('unverified') ||
    r.toLowerCase().includes('control target') ||
    r.toLowerCase().includes('charging') ||
    r.toLowerCase().includes('indução')
  );

  const sanitizeAction = (act: string): string => {
    if (!isSafetyGateBlocked) return act.trim();
    if (/\b(wireless charging|carregamento sem fio|indução|posiciona o (?:smart)?phone|pousa o celular|smartphone sobre|docking|charging pad)\b/i.test(act)) {
      return `Apresentadora exibe o ${input.productIdentity} destacando seus recursos visuais e acabamento com naturalidade.`;
    }
    if (/\b(press|pressiona|aperta|insert|inserir|remove|remover|encaixar|desencaixar|alinha precisamente)\b/i.test(act)) {
      return `Apresentadora gesticula suavemente apresentando o design ergonômico de ${input.productIdentity}.`;
    }
    return act.trim();
  };

  const sanitizedAction0to2 = sanitizeAction(rawAction0to2);
  const actorStartPosition = `Presenter begins positioned naturally according to scene start: ${sanitizedAction0to2.replace(/\.$/, '')}, facing the camera with immediate access to ${input.productIdentity}.`;

  // Stage 4 evaluations for fallback plan
  const speechLoadEval = evaluateScene2SpeechLoad(input.spokenCopy);
  const actionBudgetEval = evaluateScene2ActionBudget(input.actions, {
    interactionRisk: 'LOW',
    selectedMode: 'PASSIVE_VISUAL_DEMO',
    productStructuralDNA: input.structuralDNA
  });
  const cameraLoad = evaluateCameraLoad([
    'Authentic handheld smartphone camera motion with natural micro-movements and conversational framing.'
  ]);
  const combinedLoadEval = evaluateScene2CombinedLoad(input, {
    speechLoadEval,
    actionBudgetEval,
    cameraLoad,
    selectedDemoMode: 'PASSIVE_VISUAL_DEMO'
  });

  const plan: PhysicalInteractionPlan = {
    interactionRisk: 'LOW',
    primaryTarget: `${input.productIdentity} in ${input.environment}`,
    actorStartPosition,
    actionSequence: [
      `0.0s - 2.0s: ${sanitizeAction(input.actions.action0to2)}`,
      `2.0s - 4.0s: ${sanitizeAction(input.actions.action2to4)}`,
      `4.0s - 6.0s: ${sanitizeAction(input.actions.action4to6)}`,
      `6.0s - 8.0s: ${sanitizeAction(input.actions.action6to8)}`
    ],
    requiredClearance: [
      `Maintain natural body clearance around ${input.productIdentity} and immediate support surfaces in ${input.environment}.`,
      'Maintain positive limb and hand separation during demonstration movements.',
      'Maintain unobstructed camera visibility of the product and primary action.'
    ],
    collisionBoundaries: [
      `${input.productIdentity} physical structure and touch points.`,
      `Primary support surfaces and solid fixtures in ${input.environment}.`,
      'Solid room flooring and architectural walls.',
      'Strict Mandate: No torso, hip, leg, knee, arm, hand, foot or garment mesh may intersect, clip, or pass through solid geometry at any point during 0.0s - 8.0s.'
    ],
    preExistingProps: [
      `All props and handled items (including ${input.productIdentity}) must already be visibly resting in the scene or held by the presenter at 0.0s.`,
      'NO props may spontaneously materialize, pop into existence, or appear from outside the frame.'
    ],
    cameraSafetyInstructions: [
      'Authentic handheld smartphone camera motion with natural micro-movements and conversational framing.',
      'Line-of-sight guarantee: Keep both presenter and product demonstration clearly in view without sudden perspective jumps.'
    ],
    speechActionAnchors,
    speechLoad: speechLoadEval.speechLoad,
    actionLoad: actionBudgetEval.actionLoad,
    combinedLoad: combinedLoadEval.combinedLoad,
    speechLoadEvaluation: speechLoadEval,
    actionBudgetEvaluation: actionBudgetEval,
    combinedLoadEvaluation: combinedLoadEval
  };

  return Object.freeze(plan);
}

// -----------------------------------------------------------------------------
// 4. INTERACTION RISK CLASSIFIER
// -----------------------------------------------------------------------------

const HIGH_RISK_ACTION_KEYWORDS = [
  'sit', 'sits', 'sitting', 'seated', 'sentar', 'senta', 'sentando', 'sentada', 'assento',
  'stand up', 'stands up', 'levanta', 'levanta-se', 'levantando',
  'pull chair', 'pulls chair', 'puxa a cadeira', 'puxa cadeira', 'puxar cadeira', 'arrasta cadeira',
  'move chair', 'move table', 'adjust chair', 'slide chair', 'desliza cadeira',
  'between table', 'entre a mesa', 'entre as cadeiras', 'walk around', 'contorna', 'contornar',
  'passa ao lado', 'approach chair', 'approaches chair', 'aproxima-se da cadeira',
  'lean across', 'inclina sobre', 'inclinar sobre', 'debruçar', 'debruça', 'reach across table',
  'reclines', 'recline', 'reclinável',
  'climb', 'step on', 'subir', 'montar', 'pedalar', 'deitar', 'lie down', 'lay down'
];

const HIGH_RISK_PRODUCT_KEYWORDS = [
  'cadeira', 'chair', 'mesa', 'table', 'poltrona', 'armchair', 'sofa', 'sofá', 'couch',
  'banco', 'stool', 'bench', 'escrivaninha', 'desk', 'armario', 'armário', 'cabinet',
  'estante', 'cama', 'bed', 'móvel', 'moveis', 'móveis', 'furniture',
  'treadmill', 'esteira', 'exercise bike', 'bicicleta ergométrica', 'fitness equipment',
  'banco de musculação', 'ladder', 'escada'
];

const MEDIUM_RISK_ACTION_KEYWORDS = [
  'open', 'abre', 'opening', 'abrir', 'close', 'fecha', 'closing', 'fechar',
  'unfold', 'desdobra', 'desdobrar', 'fold', 'dobra', 'dobrar',
  'drawer', 'gaveta', 'lid', 'tampa', 'door', 'porta', 'cabinet', 'compartimento', 'case', 'estojo',
  'pour', 'despeja', 'despejar', 'serve', 'servir', 'dispenses', 'dispensa', 'dispensing', 'dropper', 'conta-gotas', 'drops', 'gotas', 'massages', 'massageia', 'twists', 'gira', 'spray', 'aplica spray', 'pump',
  'reach', 'alcança', 'alcançar', 'estende o braço', 'pega na bancada', 'retira da',
  'push', 'empurra', 'empurrar', 'pull', 'puxa', 'puxar', 'desliza', 'slides', 'sliding',
  'cutting', 'cortando', 'cortar', 'fatia', 'slices', 'sweeping', 'varrendo',
  'vacuuming', 'aspirando', 'passando pano', 'scrubbing', 'esfregando'
];

const MEDIUM_RISK_PRODUCT_KEYWORDS = [
  'airfryer', 'fritadeira', 'geladeira', 'fridge', 'liquidificador', 'blender', 'panela', 'pot', 'frigideira', 'pan', 'sérum', 'serum', 'creme', 'cosmético', 'shampoo', 'cafeteira', 'aspirador'
];

const LOW_RISK_ACTION_KEYWORDS = [
  'hold', 'holds', 'holding', 'segura', 'segurando', 'empunha',
  'point', 'points', 'aponta', 'apontando', 'mostra', 'shows', 'exibe', 'indicates',
  'pick up', 'picks up', 'pega', 'rests on hand', 'ergue no pulso', 'tilts', 'inclina levemente',
  'touches', 'toca', 'feels', 'sente', 'examines', 'inspeciona'
];

/**
 * Deterministically classifies the physical interaction risk of the scene.
 */
export function determineInteractionRisk(input: PhysicalChoreographyInput): PhysicalInteractionRisk {
  const combinedActionsText = [
    input.actions.action0to2,
    input.actions.action2to4,
    input.actions.action4to6,
    input.actions.action6to8,
    input.speechActionSync.map(s => s.action).join(' ')
  ].join(' ').toLowerCase();

  const combinedContextText = [
    input.productIdentity,
    input.category || '',
    input.environment,
    ...(input.productFacts || []),
    ...(input.productVisibleDetails || [])
  ].join(' ').toLowerCase();

  // Check structural DNA category / furniture flags
  if (input.structuralDNA?.isFurnitureOrLargeSet) {
    return 'HIGH';
  }

  // 1. Check HIGH risk triggers
  const hasHighRiskAction = HIGH_RISK_ACTION_KEYWORDS.some(k => combinedActionsText.includes(k));
  const hasHighRiskProduct = HIGH_RISK_PRODUCT_KEYWORDS.some(k => combinedContextText.includes(k));

  if (hasHighRiskAction || (hasHighRiskProduct && (combinedActionsText.includes('sit') || combinedActionsText.includes('sent') || combinedActionsText.includes('use') || combinedActionsText.includes('usa') || combinedActionsText.includes('test')))) {
    return 'HIGH';
  }

  if (hasHighRiskProduct) {
    return 'HIGH';
  }

  // 2. Check MEDIUM risk triggers
  const hasMediumRiskAction = MEDIUM_RISK_ACTION_KEYWORDS.some(k => combinedActionsText.includes(k));
  const hasMediumRiskProduct = MEDIUM_RISK_PRODUCT_KEYWORDS.some(k => combinedContextText.includes(k));

  if (hasMediumRiskAction || hasMediumRiskProduct) {
    return 'MEDIUM';
  }

  // 3. Check LOW risk triggers
  const hasLowRiskAction = LOW_RISK_ACTION_KEYWORDS.some(k => combinedActionsText.includes(k));
  if (hasLowRiskAction) {
    return 'LOW';
  }

  return 'NONE';
}

// -----------------------------------------------------------------------------
// 5. SPEECH-ACTION ANCHOR VALIDATION & RECONCILIATION
// -----------------------------------------------------------------------------

function normalizeTextForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates speech-action synchronization anchors against the exact dialogue lock.
 * Filters out hallucinated / obsolete anchor phrases that do not appear in spokenCopy,
 * and deterministically reconstructs valid anchors if needed.
 */
export function validateAndReconcileSpeechAnchors(
  speechActionSync: Scene2SpeechActionSyncItem[],
  spokenCopy: string,
  actions: Scene2Actions
): PhysicalSpeechActionAnchor[] {
  const normalizedSpokenCopy = normalizeTextForMatching(spokenCopy);
  const validatedAnchors: PhysicalSpeechActionAnchor[] = [];

  for (const item of speechActionSync) {
    const rawPhrase = item.phrase.trim();
    const rawAction = item.action.trim();
    if (!rawPhrase || !rawAction) continue;

    const normalizedPhrase = normalizeTextForMatching(rawPhrase);
    if (normalizedPhrase.length >= 3 && normalizedSpokenCopy.includes(normalizedPhrase)) {
      validatedAnchors.push({
        phrase: rawPhrase,
        action: rawAction
      });
    }
  }

  // If at least one valid anchor was found, return validated list
  if (validatedAnchors.length > 0) {
    return validatedAnchors;
  }

  // Fallback reconciliation: derive anchor deterministically from actual spokenCopy
  const spokenSentences = spokenCopy.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  if (spokenSentences.length > 0) {
    // Pick the most salient clause from the dialogue
    const selectedSentence = spokenSentences[0];
    const words = selectedSentence.split(/\s+/);
    const keyPhrase = words.length > 6 ? words.slice(0, 6).join(' ') : selectedSentence;

    validatedAnchors.push({
      phrase: keyPhrase,
      action: actions.action2to4 || actions.action0to2 || 'Demonstrating the key product benefit smoothly on-camera.'
    });
  } else {
    validatedAnchors.push({
      phrase: spokenCopy.slice(0, Math.min(spokenCopy.length, 30)),
      action: actions.action2to4 || 'Demonstrating the primary product feature with clear, steady posture.'
    });
  }

  return validatedAnchors;
}

// -----------------------------------------------------------------------------
// 6. CONTEXT-AWARE TARGET & START POSITION ANTICIPATION
// -----------------------------------------------------------------------------

export function resolveTargetAndStartPosition(
  input: PhysicalChoreographyInput,
  risk: PhysicalInteractionRisk
): { primaryTarget: string; actorStartPosition: string } {
  const allowlist = buildSceneObjectAllowlist(input);
  const action0to2Lower = input.actions.action0to2.toLowerCase();
  const isAction0to2Seated = action0to2Lower.includes('seated') || action0to2Lower.includes('sitting') || action0to2Lower.includes('senta') || action0to2Lower.includes('sentado') || action0to2Lower.includes('sentada') || action0to2Lower.includes('lying') || action0to2Lower.includes('deitado');

  const hasChair = allowlist.includes('chair') || allowlist.includes('cadeira');
  const hasDeskOrTable = allowlist.includes('desk_workstation') || allowlist.includes('dining_table') || allowlist.includes('desk') || allowlist.includes('escrivaninha') || allowlist.includes('mesa de jantar');
  const hasBed = allowlist.includes('bed') || allowlist.includes('cama');
  const hasNightstand = allowlist.includes('nightstand') || allowlist.includes('criado-mudo') || allowlist.includes('mesa de cabeceira');
  const hasArmchairOrSofa = allowlist.includes('armchair') || allowlist.includes('poltrona') || allowlist.includes('sofa') || allowlist.includes('sofá');
  const hasCountertop = allowlist.includes('countertop') || allowlist.includes('sink_vanity') || allowlist.includes('bancada');

  if (risk === 'HIGH') {
    // 1. Chair + Table (Only when chair is actually confirmed in current scene allowlist)
    if (hasChair && (hasDeskOrTable || action0to2Lower.includes('chair') || action0to2Lower.includes('cadeira'))) {
      const isSeated = isAction0to2Seated;
      return {
        primaryTarget: 'Designated chair and workstation table in the scene',
        actorStartPosition: isSeated
          ? 'Presenter begins already seated comfortably on the chair at the table, oriented naturally toward the camera with immediate access to the product.'
          : 'Presenter begins already standing naturally directly beside the selected chair (not walking from across the room), oriented at a comfortable 45-degree angle toward the camera with immediate, unobstructed access to the chair frame.'
      };
    }

    // 2. Bed / Bedroom (When bed is in the allowlist)
    if (hasBed) {
      const targetDesc = hasNightstand
        ? `${input.productIdentity} resting on the bedside nightstand next to the bed`
        : `${input.productIdentity} and primary bed surface in the bedroom`;
      
      return {
        primaryTarget: targetDesc,
        actorStartPosition: isAction0to2Seated
          ? 'Presenter begins already seated naturally and comfortably on the bed, oriented toward the camera with immediate access to the bedside surface and product.'
          : 'Presenter begins standing naturally beside the bed in the bedroom, with immediate reach to the bedside surface.'
      };
    }

    // 3. Lounge Furniture (Poltrona / Sofá)
    if (hasArmchairOrSofa) {
      return {
        primaryTarget: 'Primary seating lounge furniture',
        actorStartPosition: isAction0to2Seated
          ? 'Presenter begins already seated comfortably on the lounge furniture cushion with relaxed posture facing the camera.'
          : 'Presenter begins already standing directly adjacent to the designated seat cushion with immediate, open lateral access.'
      };
    }

    // 4. Table / Desk alone (no chair)
    if (hasDeskOrTable || allowlist.includes('table') || allowlist.includes('mesa')) {
      return {
        primaryTarget: `${input.productIdentity} and main table work surface`,
        actorStartPosition: 'Presenter begins already positioned standing naturally at the table perimeter with full direct reach to the surface.'
      };
    }

    return {
      primaryTarget: `${input.productIdentity} primary physical structure`,
      actorStartPosition: isAction0to2Seated
        ? `Presenter begins seated comfortably in ${input.environment}, oriented naturally toward the camera.`
        : 'Presenter begins already positioned immediately in front of or beside the primary structure, oriented naturally toward the camera.'
    };
  }

  if (risk === 'MEDIUM') {
    if (hasCountertop) {
      return {
        primaryTarget: `${input.productIdentity} and immediate support surface`,
        actorStartPosition: isAction0to2Seated
          ? `Presenter begins seated comfortably at the support surface in ${input.environment}, with the product within immediate arm's reach.`
          : `Presenter begins standing naturally at the support surface in ${input.environment}, with the product within immediate, unobstructed arm's reach.`
      };
    }

    return {
      primaryTarget: `${input.productIdentity} and immediate support surface`,
      actorStartPosition: 'Presenter begins standing naturally facing the camera in authentic conversational posture, holding or gesturing beside the product.'
    };
  }

  return {
    primaryTarget: input.productIdentity,
    actorStartPosition: 'Presenter begins standing naturally facing the camera in authentic conversational posture, holding or gesturing beside the product.'
  };
}

// -----------------------------------------------------------------------------
// 7. CONTEXT-AWARE ACTION SEQUENCE RESOLUTION
// -----------------------------------------------------------------------------

export function resolveActionSequence(
  input: PhysicalChoreographyInput,
  risk: PhysicalInteractionRisk
): string[] {
  const allowlist = buildSceneObjectAllowlist(input);
  const action0to2Lower = input.actions.action0to2.toLowerCase();
  const hasChair = allowlist.includes('chair') || allowlist.includes('cadeira');

  if (risk === 'HIGH') {
    // Only generate chair sliding sequence if chair is confirmed in allowlist AND action explicitly requires sitting into a chair
    if (hasChair && (action0to2Lower.includes('pull') || action0to2Lower.includes('puxa') || action0to2Lower.includes('approach chair') || action0to2Lower.includes('sits down on the chair'))) {
      return [
        'Phase 1 (0.0s - 2.5s): Presenter stands beside the designated chair, lightly grasps the upper backrest, and smoothly slides the chair outward just enough to establish a visible, unobstructed seating corridor.',
        'Phase 2 (2.5s - 5.5s): Presenter steps into the corridor from the open side, rotates hips and torso to face forward/camera, and lowers smoothly and vertically into the center of the seat cushion with shins completely clear of table geometry.',
        'Phase 3 (5.5s - 8.0s): Presenter rests comfortably in the seated position, resting hands naturally while delivering the spoken benefit directly to the camera with authentic facial engagement.'
      ];
    }

    return [
      `Phase 1 (0.0s - 2.5s): Presenter initiates interaction immediately beside ${input.productIdentity}, establishing a stable physical stance and clear line-of-sight.`,
      `Phase 2 (2.5s - 5.5s): Presenter executes the primary demonstration motion smoothly along its natural physical axis with positive body clearance.`,
      'Phase 3 (5.5s - 8.0s): Presenter settles into a stable demonstration posture and delivers the key benefit directly to the camera.'
    ];
  }

  if (risk === 'MEDIUM') {
    return [
      `Phase 1 (0.0s - 2.5s): Presenter presents ${input.productIdentity} at the support surface with clear hand positioning and no surface occlusion.`,
      'Phase 2 (2.5s - 5.5s): Presenter demonstrates the primary mechanical or functional action smoothly along its intended trajectory.',
      'Phase 3 (5.5s - 8.0s): Presenter showcases the authentic result directly into the camera lens with natural conversational posture.'
    ];
  }

  return [
    `0.0s - 4.0s: Presenter introduces ${input.productIdentity} naturally with clear, steady hand positioning.`,
    '4.0s - 8.0s: Presenter delivers the spoken benefit with authentic conversational expressions and gestures.'
  ];
}

// -----------------------------------------------------------------------------
// 8. CONTEXT-AWARE SPATIAL CLEARANCE
// -----------------------------------------------------------------------------

export function resolveRequiredClearance(
  input: PhysicalChoreographyInput,
  risk: PhysicalInteractionRisk
): string[] {
  const allowlist = buildSceneObjectAllowlist(input);
  const hasChair = allowlist.includes('chair') || allowlist.includes('cadeira');
  const hasBed = allowlist.includes('bed') || allowlist.includes('cama');
  const hasCounter = allowlist.includes('countertop') || allowlist.includes('sink_vanity') || allowlist.includes('bancada');
  const combinedActions = (input.actions.action0to2 + ' ' + input.actions.action2to4).toLowerCase();

  if (risk === 'HIGH') {
    if (hasChair && (combinedActions.includes('chair') || combinedActions.includes('cadeira') || combinedActions.includes('pull'))) {
      return [
        'Clearance Creation: Slide or pull the chair outward from the table before sitting to create an open, visible gap between table apron and seat cushion.',
        'Side Approach Vector: Enter the seating area exclusively from the open lateral side; never attempt to step over or cross through chair/table legs.',
        'Leg & Shin Clearance: Keep knees, shins, thighs and feet strictly outside the vertical plane of the table frame during rotation and descent.',
        'Vertical Descent Axis: Rotate torso 90 degrees to face forward, then lower pelvis strictly along a vertical downward vector onto the seat cushion with zero forward table penetration.'
      ];
    }

    if (hasBed) {
      return [
        'Bedside Clearance: Maintain natural, comfortable posture on or beside the bed with limbs clear of bedside edges.',
        'Reach Vector: Reach toward bedside surfaces along open trajectories without clipping through bed frame or nightstand.',
        'Arm Reach Clearance: Extend limbs through free, open air space with positive separation from solid edges.'
      ];
    }

    return [
      'Perimeter Clearance: Maintain torso and pelvis outside the bounding volume of rigid furniture or structures at all times.',
      'Trajectory Clearance: Navigate around structural obstacles along open floor corridors rather than intersecting geometry.',
      'Arm Reach Clearance: Extend limbs through free, open air space with positive separation from solid edges.'
    ];
  }

  if (risk === 'MEDIUM') {
    if (hasCounter) {
      return [
        'Surface Clearance: Maintain torso outside the perimeter edge plane of the countertop.',
        'Mechanism Swing Clearance: Position hands and body clear of moving door swing arcs, drawer extension slide paths, or spray dispersion cones.',
        'Hand-Object Separation: Grasp handles and grips with distinct, anatomically accurate finger placement.'
      ];
    }

    return [
      'Surface Clearance: Maintain torso outside the perimeter edge plane of the support surface.',
      'Mechanism Swing Clearance: Position hands and body clear of moving parts or dispersion paths.',
      'Hand-Object Separation: Grasp handles and touch points with distinct, anatomically accurate finger placement.'
    ];
  }

  return [
    'Maintain comfortable personal space and unobstructed camera visibility of the product.'
  ];
}

// -----------------------------------------------------------------------------
// 9. CONTEXT-AWARE COLLISION BOUNDARIES
// -----------------------------------------------------------------------------

export function resolveCollisionBoundaries(
  input: PhysicalChoreographyInput,
  risk: PhysicalInteractionRisk
): string[] {
  const allowlist = buildSceneObjectAllowlist(input);
  const boundaries: string[] = [];

  const hasChair = allowlist.includes('chair') || allowlist.includes('cadeira');
  const hasDeskOrTable = allowlist.includes('desk_workstation') || allowlist.includes('dining_table') || allowlist.includes('desk') || allowlist.includes('escrivaninha') || allowlist.includes('table') || allowlist.includes('mesa');
  const hasBed = allowlist.includes('bed') || allowlist.includes('cama');
  const hasNightstand = allowlist.includes('nightstand') || allowlist.includes('criado-mudo') || allowlist.includes('mesa de cabeceira');
  const hasCountertop = allowlist.includes('countertop') || allowlist.includes('sink_vanity') || allowlist.includes('bancada');
  const hasAppliance = allowlist.includes('appliance') || allowlist.includes('airfryer') || allowlist.includes('geladeira');

  if (risk === 'HIGH') {
    if (hasDeskOrTable) {
      boundaries.push('Tabletop upper surface plane, underside apron, and all structural table legs.');
    }
    if (hasChair) {
      boundaries.push('Chair seat cushion boundary, backrest frame, armrests, and base legs/crossbars.');
    }
    if (hasBed) {
      boundaries.push('Bed mattress plane, headboard structure, and bed frame perimeter.');
    }
    if (hasNightstand) {
      boundaries.push('Nightstand top surface plane and drawer front enclosure.');
    }
    if (boundaries.length === 0) {
      boundaries.push(`${input.productIdentity} rigid physical structure and casing.`);
    }

    boundaries.push('Solid flooring and adjacent architectural walls / cabinetry.');
    boundaries.push('Strict Mandate: No torso, hip, leg, knee, arm, hand, foot or garment mesh may intersect, clip, or pass through these solid boundaries at any point during 0.0s - 8.0s.');
    return boundaries;
  }

  if (risk === 'MEDIUM') {
    if (hasCountertop) {
      boundaries.push('Countertop edge plane and solid front support panels.');
    }
    if (hasAppliance) {
      boundaries.push('Appliance housing, movable drawer slide paths, and door swing boundaries.');
    }
    boundaries.push(`${input.productIdentity} rigid casing, container walls, and functional touch points.`);
    boundaries.push('Strict Mandate: Hands and fingers interact exclusively with designed touch points without clipping into solid geometry.');
    return boundaries;
  }

  return [
    `${input.productIdentity} outer surface geometry and presenter hand contact surfaces.`
  ];
}

// -----------------------------------------------------------------------------
// 10. PRE-EXISTING PROPS & CAMERA SAFETY
// -----------------------------------------------------------------------------

export function resolvePreExistingProps(
  input: PhysicalChoreographyInput,
  risk: PhysicalInteractionRisk
): string[] {
  return [
    'All props, accessories, secondary tools, cups, or auxiliary items handled during 0.0s - 8.0s must already be visibly resting on a support surface in the scene or held in the presenter\'s hand from 0.0s.',
    'NO props may spontaneously materialize, pop into existence, appear from outside the frame, or vanish without plausible physical handling.'
  ];
}

export function resolveCameraSafetyInstructions(
  risk: PhysicalInteractionRisk
): string[] {
  if (risk === 'HIGH') {
    return [
      'Camera Framing: Maintain a stable medium shot with authentic, subtle handheld smartphone micro-movements.',
      'Anti-Perspective Drift: NO rapid panning, NO 360-degree orbiting around furniture, and NO aggressive push-ins during physical seating or body repositioning.',
      'Line-of-Sight Guarantee: Camera must never pass through or be obstructed by furniture geometry, keeping both the presenter\'s upper body and product interaction point clearly visible.',
      'Spatial Coherence: Keep horizontal horizon and perspective lines stable during human vertical descent.'
    ];
  }

  if (risk === 'MEDIUM') {
    return [
      'Camera Framing: Medium or medium-close framing keeping presenter and product demonstration area simultaneously in view.',
      'Movement: Smooth, gentle natural handheld drift without sudden perspective jumps or focal hunting.'
    ];
  }

  return [
    'Authentic handheld smartphone camera motion with natural micro-movements and conversational medium framing.'
  ];
}

// -----------------------------------------------------------------------------
// 11. STAGE 2: DEMONSTRATION RISK CLASSIFICATION & GEOMETRY CONFIDENCE GUARD
// -----------------------------------------------------------------------------

/**
 * Classifies candidate physical demonstrations deterministically:
 * - LOW: visible illumination, display visibility, passive visual result, no precise contact, no mechanism manipulation
 * - MEDIUM: simple hold, simple placement on known surface, pointing at visible component, basic rotation with verified geometry
 * - HIGH: precise alignment, charging contact, inserting/removing parts, pressing an uncertain button, opening unknown mechanism, sliding unknown parts, interacting with partially unseen geometry
 */
export function classifyDemonstrationRisk(
  input: PhysicalChoreographyInput | { actions: Scene2Actions; [key: string]: any }
): DemonstrationRisk {
  const combinedActionsText = [
    input.actions.action0to2,
    input.actions.action2to4,
    input.actions.action4to6,
    input.actions.action6to8,
    ...(Array.isArray(input.speechActionSync) ? input.speechActionSync.map((s: any) => `${s.phrase || ''} ${s.action || ''}`) : [])
  ].join(' ').toLowerCase();

  const combinedContextText = [
    input.productIdentity || '',
    input.category || '',
    input.environment || '',
    ...(input.productFacts || []),
    ...(input.productVisibleDetails || [])
  ].join(' ').toLowerCase();

  // 1. High Risk Triggers (strict word boundaries)
  const HIGH_RISK_ACTION_PATTERNS = [
    // Wireless charging & precision phone placement
    /\b(wireless charging|carregamento sem fio|por indução|carregador por indução|charging pad|charging surface)\b/i,
    /\b(places? (?:smart)?phone|aligns? (?:smart)?phone|celular para carregar|pousa o celular|coloca o telefone|docking|carrega o celular|encostar celular|base de carregamento)\b/i,
    // Precise alignment & precision placement
    /\b(precise alignment|precisely aligns|aligns precisely|alinha precisamente|encaixe preciso|posiciona com precisão|precision placement|places? precisely|alinhamento preciso)\b/i,
    // Insertion / removal / assembly / blade / cartridge / refills
    /\b(insert|inserts|inserir|encaixar|remove|removes|remover|desencaixar|attach|detach|acoplar|desacoplar|trocar lâmina|troca refil|substitui refil)\b/i,
    // Button pressing / switch / keys
    /\b(press|presses|pressiona|pressionar|aperta|apertar|clica|clicar|push button|aperta o botão|pressiona o botão|tap button|toca no botão|aciona o botão|acionar botão|apertando)\b/i,
    // Unknown mechanisms & sliding parts
    /\b(slide|slides|desliza|pull drawer|puxa gaveta|open lid|abre tampa|unlock|destravar)\b/i,
    // Seating & furniture interaction
    /\b(sit|sits|sitting|sentar|senta|sentado|sentada|pull chair|puxa cadeira|recline|reclinável)\b/i
  ];

  const hasHighRiskTrigger = HIGH_RISK_ACTION_PATTERNS.some(pattern => pattern.test(combinedActionsText));
  if (hasHighRiskTrigger || input.structuralDNA?.isFurnitureOrLargeSet) {
    return 'HIGH';
  }

  const HIGH_RISK_PRODUCTS = [/\bcadeira\b/i, /\bchair\b/i, /\bpoltrona\b/i, /\barmchair\b/i, /\bsofa\b/i, /\bsofá\b/i, /\bmóvel\b/i, /\bfurniture\b/i];
  if (HIGH_RISK_PRODUCTS.some(p => p.test(combinedContextText))) {
    return 'HIGH';
  }

  // 2. Medium Risk Triggers (strict word boundaries)
  const MEDIUM_RISK_ACTION_PATTERNS = [
    /\b(hold|holds|holding|segura|segurando|empunha|pega na mão)\b/i,
    /\b(pick up|picks up|pega|pousa na bancada|rests on counter|coloca sobre a mesa|pousa)\b/i,
    /\b(point|points|aponta|apontando|mostra com o dedo|gestures toward)\b/i,
    /\b(tilt|tilts|inclina levemente|rotates|gira suavemente|turns)\b/i,
    /\b(massages|massageia|dropper|drops|gotas|aplica|applies)\b/i
  ];

  const hasMediumRiskTrigger = MEDIUM_RISK_ACTION_PATTERNS.some(pattern => pattern.test(combinedActionsText));

  // 3. Low Risk Triggers (passive illumination, display visibility, sound, texture, conversational presentation)
  const LOW_RISK_PATTERNS = [
    /\b(rgb|illumination|iluminação|lamp|light|luz|glow|ambient light|acende|cores|colors|brilho|luminária|led|leds)\b/i,
    /\b(clock|digital clock|relógio|relógio digital|display|screen|tela|visor|horas|números)\b/i,
    /\b(texture|textura|acabamento|som|sound|music|música|ouve|listens|smiles|sorri|shows|mostra|exibe)\b/i
  ];

  const hasLowRiskTrigger = LOW_RISK_PATTERNS.some(pattern => pattern.test(combinedActionsText));

  // Physical handling (holding, resting, placing, tilting, applying) distinguishes MEDIUM from pure non-contact pointing/showing
  const hasPhysicalHandling = /\b(hold|holds|holding|segura|segurando|empunha|pega na mão|pick up|picks up|pega|pousa|rests|coloca|tilt|tilts|inclina|rotates|gira|massages|massageia|dropper|drops|gotas|aplica|applies)\b/i.test(combinedActionsText);

  if (hasLowRiskTrigger && !hasPhysicalHandling) {
    return 'LOW';
  }

  if (hasMediumRiskTrigger) {
    return 'MEDIUM';
  }

  if (hasLowRiskTrigger) {
    return 'LOW';
  }

  return 'LOW';
}

/**
 * Checks interaction requirements for candidate actions:
 * - verified control target
 * - verified contact surface
 * - verified movable part
 * - verified orientation
 * - verified grip/contact region
 */
export function checkInteractionRequirements(input: PhysicalChoreographyInput): InteractionRequirementCheck {
  const combinedActionsText = [
    input.actions.action0to2,
    input.actions.action2to4,
    input.actions.action4to6,
    input.actions.action6to8,
    ...(Array.isArray(input.speechActionSync) ? input.speechActionSync.map(s => `${s.phrase || ''} ${s.action || ''}`) : [])
  ].join(' ').toLowerCase();

  const detailsText = (input.productVisibleDetails || []).join(' ').toLowerCase();
  const factsText = (input.productFacts || []).join(' ').toLowerCase();
  const coverage = input.referenceCoverage;
  const dna = input.structuralDNA;

  let requiresVerifiedControlTarget = false;
  let requiresVerifiedContactSurface = false;
  let requiresVerifiedMovablePart = false;
  let requiresVerifiedOrientation = false;
  let requiresVerifiedGripRegion = false;

  let targetDescription = 'general product body';
  let targetFace: 'front' | 'rear' | 'leftSide' | 'rightSide' | 'top' | 'bottom' | 'unknown' | undefined;
  let isTargetVerified = true;
  const unverifiedReasons: string[] = [];

  // 1. Wireless charging contact & phone placement
  const isWirelessChargingAction = /\b(wireless charging|carregamento sem fio|por indução|carregador por indução|charging pad|charging surface|places? (?:smart)?phone|celular para carregar|pousa o celular|apoia o celular)\b/i.test(combinedActionsText);
  if (isWirelessChargingAction) {
    requiresVerifiedContactSurface = true;
    targetDescription = 'top wireless charging surface';
    targetFace = 'top';

    const topCoverageConfirmed = coverage?.top === 'confirmed';
    const hasTopChargingElementInDNA = Boolean(
      dna?.surfaceFeatures?.some(f => /charging|indução|top surface|pad/i.test(f.name) && (f.visible || (f.confidence ?? 0) >= 0.7)) ||
      dna?.fixedComponents?.some(c => /charging|indução|pad/i.test(c.name) && (c.visible || (c.confidence ?? 0) >= 0.7))
    );
    const visibleInDetails = /superfície superior|topo com carregador|área de carregamento|base de indução visível/i.test(detailsText);

    if (!topCoverageConfirmed && !hasTopChargingElementInDNA && !visibleInDetails) {
      isTargetVerified = false;
      unverifiedReasons.push('Wireless charging contact surface on top face is unverified (top reference coverage is unknown / unverified).');
    }
  }

  // 2. Control target (button, switch, touch panel)
  const isButtonAction = /\b(press|presses|pressiona|pressionar|aperta|apertar|clica|clicar|push button|tap button|toca no botão|aciona o botão|turn knob|gira botão)\b/i.test(combinedActionsText);
  if (isButtonAction) {
    requiresVerifiedControlTarget = true;
    const isTopControl = /\b(top|topo|superior|upper)\b/i.test(combinedActionsText);
    const isRearControl = /\b(rear|back|traseir|posterior)\b/i.test(combinedActionsText);

    if (isTopControl) {
      targetFace = 'top';
      targetDescription = 'top control button';
      const hasTopButtonInDNA = Boolean(
        dna?.fixedComponents?.some(c => /button|botão|switch|knob/i.test(c.name) && /top|superior/i.test(c.position || '')) ||
        dna?.surfaceFeatures?.some(f => /button|botão/i.test(f.name) && /top|superior/i.test(f.position || ''))
      );
      const topConfirmed = coverage?.top === 'confirmed';
      if (!topConfirmed && !hasTopButtonInDNA) {
        isTargetVerified = false;
        unverifiedReasons.push('Action requires pressing top control button, but top face geometry is unverified.');
      }
    } else if (isRearControl) {
      targetFace = 'rear';
      targetDescription = 'rear control switch';
      const rearConfirmed = coverage?.rear === 'confirmed';
      if (!rearConfirmed) {
        isTargetVerified = false;
        unverifiedReasons.push('Action requires rear control, but rear face geometry is unverified.');
      }
    } else {
      // Front control / general control
      targetFace = 'front';
      targetDescription = 'front control button / panel';
      const hasButtonInDNA = Boolean(
        dna?.fixedComponents?.some(c => /button|botão|switch|knob|painel|display/i.test(c.name)) ||
        dna?.surfaceFeatures?.some(f => /button|botão|panel|painel/i.test(f.name))
      );
      const frontConfirmed = (coverage?.front === 'confirmed' || coverage?.front === 'partial') || hasButtonInDNA || /botão|painel|display/i.test(detailsText);
      if (!frontConfirmed && !hasButtonInDNA) {
        isTargetVerified = false;
        unverifiedReasons.push('Action requires pressing control button, but no confirmed button exists in product geometry.');
      }
    }
  }

  // 3. Movable parts (drawer, lid, door)
  const isMovableAction = /\b(pull drawer|puxa gaveta|slide drawer|desliza cesto|open lid|abre tampa|open door|abre porta)\b/i.test(combinedActionsText);
  if (isMovableAction) {
    requiresVerifiedMovablePart = true;
    targetDescription = 'movable drawer / lid mechanism';
    targetFace = 'front';
    const hasMovableInDNA = Boolean(
      dna?.movableComponents && dna.movableComponents.length > 0
    ) || /gaveta|cesto|tampa|drawer|basket|lid/i.test(detailsText + ' ' + factsText + ' ' + input.productIdentity);
    if (!hasMovableInDNA) {
      isTargetVerified = false;
      unverifiedReasons.push('Action requires manipulating movable part/drawer, but no movable component is confirmed in geometry.');
    }
  }

  // 4. Insertion / Removal / Refill
  const isInsertionAction = /\b(insert|inserir|encaixar|remove|remover|desencaixar|trocar lâmina|troca refil|trocar refil)\b/i.test(combinedActionsText);
  if (isInsertionAction) {
    requiresVerifiedOrientation = true;
    targetDescription = 'component insertion slot / socket';
    const hasModularDNA = Boolean(
      dna?.movableComponents?.some(c => /lâmina|blade|refil|cartridge|compartimento/i.test(c.name))
    ) || /refil|lâmina|cartucho|compartimento/i.test(detailsText + ' ' + factsText);
    if (!hasModularDNA) {
      isTargetVerified = false;
      unverifiedReasons.push('Action requires inserting or removing parts, but modular socket/part geometry is unverified.');
    }
  }

  // 5. Grip / Handle
  const isHandleAction = /\b(handle|alça|cabo|pegador)\b/i.test(combinedActionsText);
  if (isHandleAction) {
    requiresVerifiedGripRegion = true;
    targetDescription = 'ergonomic handle / grip';
    const hasHandleInDNA = Boolean(
      dna?.fixedComponents?.some(c => /handle|alça|cabo/i.test(c.name)) ||
      dna?.movableComponents?.some(c => /handle|alça|cabo/i.test(c.name))
    ) || /alça|cabo|handle|pegador/i.test(detailsText + ' ' + factsText + ' ' + input.productIdentity);
    if (!hasHandleInDNA) {
      isTargetVerified = false;
      unverifiedReasons.push('Action requires grasping handle, but handle geometry is unverified.');
    }
  }

  return {
    requiresVerifiedControlTarget,
    requiresVerifiedContactSurface,
    requiresVerifiedMovablePart,
    requiresVerifiedOrientation,
    requiresVerifiedGripRegion,
    targetDescription,
    targetFace,
    isTargetVerified,
    unverifiedReasons
  };
}

/**
 * Classifies geometry confidence based on reference coverage, structural DNA,
 * confirmed component positions, and interaction requirements:
 * - HIGH: Required geometry is confirmed in reference coverage and structural DNA
 * - MEDIUM: Partial reference coverage or verified general features with minor unobserved angles
 * - LOW: Required interaction target is unknown, unverified, or on an unseen product face
 */
export function classifyGeometryConfidence(
  input: PhysicalChoreographyInput,
  requirements?: InteractionRequirementCheck
): GeometryConfidence {
  const reqs = requirements || checkInteractionRequirements(input);
  const coverage = input.referenceCoverage;

  // If a specific required target was checked and failed verification -> LOW
  if (!reqs.isTargetVerified) {
    return 'LOW';
  }

  // If interaction requires a specific face
  if (reqs.targetFace) {
    const faceCoverage = coverage ? coverage[reqs.targetFace] : undefined;
    if (faceCoverage === 'confirmed') return 'HIGH';
    if (faceCoverage === 'partial') return 'MEDIUM';
    if (faceCoverage === 'unknown') return 'LOW';
  }

  // General geometry confidence from reference coverage
  if (coverage) {
    if (coverage.front === 'confirmed') {
      const otherConfirmedCount = [coverage.top, coverage.rear, coverage.leftSide, coverage.rightSide, coverage.bottom].filter(f => f === 'confirmed').length;
      if (otherConfirmedCount >= 1) return 'HIGH';
      return 'HIGH'; // Front confirmed is baseline HIGH for general display/body interactions
    }
    if (coverage.front === 'partial') return 'MEDIUM';
    if (coverage.front === 'unknown') return 'LOW';
  }

  // Structural DNA fallback
  if (input.structuralDNA && Object.keys(input.structuralDNA.coreGeometry || {}).length > 0) {
    return 'HIGH';
  }

  return 'HIGH';
}

/**
 * Evaluates the Control Target Guard:
 * Actions such as press, tap, slide, rotate, insert, remove, align precisely, place precisely
 * require a verified target. If no verified target -> BLOCKED.
 */
export function evaluateControlTargetGuard(
  input: PhysicalChoreographyInput,
  requirements: InteractionRequirementCheck,
  geometryConfidence: GeometryConfidence
): { status: DemonstrationGuardStatus; reasons: string[] } {
  const requiresPrecisionControl =
    requirements.requiresVerifiedControlTarget ||
    requirements.requiresVerifiedContactSurface ||
    requirements.requiresVerifiedMovablePart ||
    requirements.requiresVerifiedOrientation;

  if (requiresPrecisionControl && !requirements.isTargetVerified) {
    return {
      status: 'BLOCKED',
      reasons: requirements.unverifiedReasons.length > 0
        ? requirements.unverifiedReasons
        : [`Action requires verified target ('${requirements.targetDescription}'), but target geometry is unverified or unknown.`]
    };
  }

  return {
    status: 'ALLOWED',
    reasons: []
  };
}

/**
 * Evaluates the deterministic demonstration safety gate (Stage 2):
 * - Control Target Guard: precision actions require verified target
 * - Hard Safety Rule: HIGH interaction risk + LOW geometry confidence = BLOCK
 */
export function evaluateDemonstrationSafetyGate(
  input: PhysicalChoreographyInput
): DemonstrationSafetyEvaluation {
  const demonstrationRisk = classifyDemonstrationRisk(input);
  const interactionRequirements = checkInteractionRequirements(input);
  const geometryConfidence = classifyGeometryConfidence(input, interactionRequirements);
  const controlTargetGuard = evaluateControlTargetGuard(input, interactionRequirements, geometryConfidence);

  const reasons: string[] = [];
  let guardStatus: DemonstrationGuardStatus = 'ALLOWED';

  if (controlTargetGuard.status === 'BLOCKED') {
    guardStatus = 'BLOCKED';
    reasons.push(...controlTargetGuard.reasons);
  }

  // Hard Safety Rule: HIGH interaction risk + LOW geometry confidence = BLOCK
  if (demonstrationRisk === 'HIGH' && geometryConfidence === 'LOW') {
    guardStatus = 'BLOCKED';
    reasons.push(
      `Hard Safety Rule Violation: HIGH interaction risk (${demonstrationRisk}) combined with LOW geometry confidence (${geometryConfidence}).`
    );
  }

  return {
    demonstrationRisk,
    geometryConfidence,
    interactionRequirements,
    guardStatus,
    reasons: Array.from(new Set(reasons))
  };
}

// -----------------------------------------------------------------------------
// 12. STAGE 3: SAFE BENEFIT CANDIDATE BUILDING & SELECTION
// -----------------------------------------------------------------------------

export interface BenefitCandidateInput {
  primaryBenefit?: string;
  productFacts?: string[];
  productVisibleDetails?: string[];
  structuralDNA?: ProductStructuralDNA;
  referenceCoverage?: ProductReferenceCoverage;
  motionSafety?: ProductMotionSafety;
  category?: string;
  productIdentity?: string;
  actions?: Scene2Actions;
}

/**
 * Builds candidate benefit items from verified product facts and visible details already in context.
 * Strictly uses existing facts/details without inventing new benefits.
 */
export function buildVerifiedBenefitCandidates(
  input: BenefitCandidateInput
): DemonstrationBenefitCandidate[] {
  const rawPool: string[] = [];

  if (input.primaryBenefit && input.primaryBenefit.trim().length > 0) {
    rawPool.push(input.primaryBenefit.trim());
  }

  if (Array.isArray(input.productFacts)) {
    for (const fact of input.productFacts) {
      if (typeof fact === 'string' && fact.trim().length > 0) {
        rawPool.push(fact.trim());
      }
    }
  }

  if (Array.isArray(input.productVisibleDetails)) {
    for (const detail of input.productVisibleDetails) {
      if (typeof detail === 'string' && detail.trim().length > 0) {
        rawPool.push(detail.trim());
      }
    }
  }

  // Deduplicate case-insensitively while preserving original string
  const seen = new Set<string>();
  const uniqueTexts: string[] = [];
  for (const text of rawPool) {
    const key = text.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTexts.push(text);
    }
  }

  if (uniqueTexts.length === 0) {
    const fallbackText = input.productIdentity
      ? `Apresentação de ${input.productIdentity}`
      : 'Apresentação e acabamento refinado do produto';
    uniqueTexts.push(fallbackText);
  }

  return uniqueTexts.map((text, idx) => {
    const lower = text.toLowerCase();

    // 1. Determine interaction characteristics & mode
    const isWirelessCharging = /\b(wireless charging|carregamento sem fio|por indução|carregador por indução|charging pad|charging surface|carregar o celular|pousa o celular|docking)\b/i.test(lower);
    const isButtonOrControl = /\b(press|presses|pressiona|aperta|clica|botão|switch|knob|dial|chave liga|painel de toque)\b/i.test(lower);
    const isMovableMechanism = /\b(slide|slides|desliza|gaveta|drawer|tampa|open lid|abre tampa|troca refil|substitui refil|trocar lâmina|encaixar)\b/i.test(lower);
    const isHandling = /\b(hold|holds|segura|empunha|pega|pousa|rests|coloca|tilt|tilts|inclina|rotates|gira|massages|massageia|dropper|gotas|aplica|alça|cabo|pegador|ergonomia|ergonômico|compacto|leve)\b/i.test(lower);
    const isPassiveVisual = /\b(rgb|illumination|iluminação|luz|led|leds|glow|cores|colors|luminária|clock|digital clock|relógio|relógio digital|display|tela|visor|horas|números|som|sound|music|música|audio|áudio|bluetooth|caixa de som|alto-falante|acabamento|textura)\b/i.test(lower);

    let requiredDemoMode: DemonstrationMode = 'DISPLAY';
    let demonstrable = false;

    if (isWirelessCharging || isButtonOrControl || isMovableMechanism) {
      requiredDemoMode = 'FUNCTIONAL_INTERACTION';
      demonstrable = true;
    } else if (isHandling) {
      requiredDemoMode = 'SIMPLE_HANDLING';
      demonstrable = true;
    } else if (isPassiveVisual) {
      requiredDemoMode = 'PASSIVE_VISUAL_DEMO';
      demonstrable = true;
    } else {
      requiredDemoMode = 'DISPLAY';
      demonstrable = false;
    }

    // 2. Build candidate evaluation input
    const candidateInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: `Apresenta ${input.productIdentity || 'o produto'}.`,
        action2to4: `Demonstra ${text}.`,
        action4to6: `Destaca os detalhes e benefícios de ${text}.`,
        action6to8: `Finaliza a demonstração com naturalidade.`
      },
      environment: 'Cenário de demonstração',
      productIdentity: input.productIdentity || '',
      category: input.category,
      productFacts: [text, ...(input.productFacts || [])],
      productVisibleDetails: input.productVisibleDetails,
      spokenCopy: text,
      speechActionSync: [],
      structuralDNA: input.structuralDNA,
      referenceCoverage: input.referenceCoverage
    };

    const safetyEvaluation = evaluateDemonstrationSafetyGate(candidateInput);

    return {
      id: `benefit-${idx}`,
      benefitText: text,
      verified: true,
      demonstrable,
      interactionRisk: safetyEvaluation.demonstrationRisk,
      geometryConfidence: safetyEvaluation.geometryConfidence,
      controlTargetAvailable: safetyEvaluation.interactionRequirements.isTargetVerified,
      requiredDemoMode,
      safetyEvaluation,
      rejectionReasons: safetyEvaluation.guardStatus === 'BLOCKED' ? safetyEvaluation.reasons : []
    };
  });
}

/**
 * Deterministically selects the safest strong verified benefit for Scene 2.
 * Follows priority:
 * 1. ALLOWED LOW risk (PASSIVE_VISUAL_DEMO / DISPLAY)
 * 2. ALLOWED MEDIUM risk (SIMPLE_HANDLING)
 * 3. ALLOWED HIGH risk (FUNCTIONAL_INTERACTION with verified targets)
 * 
 * If primary benefit is BLOCKED, safely falls back to another verified candidate,
 * then to PASSIVE_VISUAL_DEMO, then to DISPLAY. Never fails Scene 2.
 */
export function selectSafestVerifiedBenefit(
  input: BenefitCandidateInput
): SafeDemoSelectionResult {
  const candidates = buildVerifiedBenefitCandidates(input);

  if (candidates.length === 0) {
    const defaultResult: SafeDemoSelectionResult = {
      candidates: [],
      selectedBenefit: input.productIdentity ? `Apresentação de ${input.productIdentity}` : 'Apresentação do produto',
      selectedMode: 'DISPLAY',
      risk: 'LOW',
      geometryConfidence: 'HIGH',
      safetyStatus: 'ALLOWED',
      fallbackUsed: false,
      fallbackType: 'NONE'
    };
    logSafeDemoSelection(defaultResult);
    return defaultResult;
  }

  // Identify nominal primary benefit candidate if present
  const nominalCandidate = input.primaryBenefit
    ? candidates.find(c =>
        c.benefitText.toLowerCase() === input.primaryBenefit!.trim().toLowerCase() ||
        c.benefitText.toLowerCase().includes(input.primaryBenefit!.trim().toLowerCase()) ||
        input.primaryBenefit!.trim().toLowerCase().includes(c.benefitText.toLowerCase())
      )
    : undefined;

  const isNominalBlocked = nominalCandidate && nominalCandidate.safetyEvaluation.guardStatus === 'BLOCKED';

  // Filter allowed candidates
  const allowedCandidates = candidates.filter(c => c.safetyEvaluation.guardStatus === 'ALLOWED');

  let selectedCandidate: DemonstrationBenefitCandidate | undefined;
  let fallbackUsed = false;
  let fallbackType: 'NONE' | 'SAFER_CANDIDATE' | 'PASSIVE_VISUAL_DEMO' | 'DISPLAY' = 'NONE';

  if (nominalCandidate && !isNominalBlocked && nominalCandidate.demonstrable) {
    // If nominal candidate is ALLOWED and demonstrable:
    // If it's LOW or MEDIUM risk, keep it directly!
    // If it's HIGH risk with verified targets (e.g. front button confirmed), keep it!
    selectedCandidate = nominalCandidate;
    fallbackUsed = false;
    fallbackType = 'NONE';
  } else {
    // Nominal is BLOCKED or not demonstrable -> we must select safest verified candidate
    if (isNominalBlocked) {
      fallbackUsed = true;
      fallbackType = 'SAFER_CANDIDATE';
    }

    // Group allowed candidates by priority tiers
    // Tier 1: ALLOWED LOW Risk + Demonstrable (PASSIVE_VISUAL_DEMO)
    const tier1 = allowedCandidates.filter(c => c.interactionRisk === 'LOW' && c.requiredDemoMode === 'PASSIVE_VISUAL_DEMO');
    // Tier 2: ALLOWED MEDIUM Risk + Demonstrable (SIMPLE_HANDLING)
    const tier2 = allowedCandidates.filter(c => c.interactionRisk === 'MEDIUM' && c.requiredDemoMode === 'SIMPLE_HANDLING');
    // Tier 3: ALLOWED HIGH Risk + Demonstrable with verified target (FUNCTIONAL_INTERACTION)
    const tier3 = allowedCandidates.filter(c => c.interactionRisk === 'HIGH' && c.requiredDemoMode === 'FUNCTIONAL_INTERACTION' && c.controlTargetAvailable);
    // Tier 4: ALLOWED LOW Risk Display
    const tier4 = allowedCandidates.filter(c => c.requiredDemoMode === 'DISPLAY');

    if (tier1.length > 0) {
      // Prefer RGB illumination or digital clock or audio if present
      selectedCandidate = tier1[0];
      if (isNominalBlocked) {
        fallbackType = 'SAFER_CANDIDATE';
      }
    } else if (tier2.length > 0) {
      selectedCandidate = tier2[0];
      if (isNominalBlocked) {
        fallbackType = 'SAFER_CANDIDATE';
      }
    } else if (tier3.length > 0) {
      selectedCandidate = tier3[0];
      if (isNominalBlocked) {
        fallbackType = 'SAFER_CANDIDATE';
      }
    } else if (tier4.length > 0) {
      selectedCandidate = tier4[0];
      fallbackType = 'DISPLAY';
    } else {
      // Absolute fallback if no candidate allowed
      selectedCandidate = candidates[0];
      fallbackUsed = true;
      fallbackType = 'DISPLAY';
    }
  }

  // If no demonstrable passive or functional candidate, fallback to DISPLAY mode
  let finalMode = selectedCandidate.requiredDemoMode;
  if (selectedCandidate.safetyEvaluation.guardStatus === 'BLOCKED') {
    finalMode = 'DISPLAY';
    fallbackUsed = true;
    fallbackType = 'DISPLAY';
  }

  const result: SafeDemoSelectionResult = {
    candidates,
    selectedBenefit: selectedCandidate.benefitText,
    selectedMode: finalMode,
    risk: selectedCandidate.interactionRisk,
    geometryConfidence: selectedCandidate.geometryConfidence,
    safetyStatus: selectedCandidate.safetyEvaluation.guardStatus,
    fallbackUsed,
    fallbackType
  };

  logSafeDemoSelection(result);
  return result;
}

function logSafeDemoSelection(result: SafeDemoSelectionResult) {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    try {
      const diagnosticOutput = {
        candidates: result.candidates.map(c => ({
          benefit: c.benefitText,
          mode: c.requiredDemoMode,
          risk: c.interactionRisk,
          geometryConfidence: c.geometryConfidence,
          safetyStatus: c.safetyEvaluation.guardStatus,
          reasons: c.rejectionReasons
        })),
        selectedBenefit: result.selectedBenefit,
        selectedMode: result.selectedMode,
        risk: result.risk,
        geometryConfidence: result.geometryConfidence,
        safetyStatus: result.safetyStatus,
        fallbackUsed: result.fallbackUsed,
        fallbackType: result.fallbackType
      };
      console.log('[SAFE_DEMO_SELECTION]', JSON.stringify(diagnosticOutput));
    } catch {
      // Ignore logging serialization errors in dev
    }
  }
}

// -----------------------------------------------------------------------------
// 13. STAGE 4: ACTION BUDGET, SPEECH LOAD, ACTION LOAD & COMBINED LOAD GUARD
// -----------------------------------------------------------------------------

/**
 * 13.1 SPEECH LOAD CLASSIFIER
 * Estimates speech load based on character count, estimated speaking duration (at ~14-16 chars/sec or 2.5 words/sec),
 * and phrase density.
 * Note: Does not modify the dialogue.
 */
export function evaluateScene2SpeechLoad(spokenCopy: string): Scene2SpeechLoadEvaluation {
  const clean = (spokenCopy || '').trim();
  const characterCount = clean.length;
  const words = clean.length > 0 ? clean.split(/\s+/).filter(w => w.length > 0) : [];
  const wordCount = words.length;

  // In Portuguese / conversational speech, average speech rate is ~2.3 - 2.8 words/second (approx 14-18 chars/sec)
  const estimatedDurationSec = wordCount > 0 ? Math.round((wordCount / 2.5) * 10) / 10 : 0;
  const phraseDensity = estimatedDurationSec > 0 ? Math.round((wordCount / 8.0) * 10) / 10 : 0;

  // Classification for 8s single-take take:
  // LOW: <= 70 chars or <= 12 words (comfortable, plenty of breathing room)
  // MEDIUM: 71 - 135 chars or 13 - 22 words (standard conversational density)
  // HIGH: > 135 chars or > 22 words (dense / fast-paced monologue for an 8s take)
  let speechLoad: Scene2LoadLevel = 'LOW';
  if (characterCount > 135 || wordCount > 22) {
    speechLoad = 'HIGH';
  } else if (characterCount > 70 || wordCount > 12) {
    speechLoad = 'MEDIUM';
  } else {
    speechLoad = 'LOW';
  }

  return {
    characterCount,
    wordCount,
    estimatedDurationSec,
    phraseDensity,
    speechLoad
  };
}

/**
 * 13.2 ACTION BUDGET & ACTION LOAD CLASSIFIER
 * Classifies major physical actions in Scene 2 actions.
 * Prefer: 2 to 4 major actions maximum for an 8s take.
 */
export function evaluateScene2ActionBudget(
  actions: Scene2Actions,
  options?: {
    interactionRisk?: DemonstrationRisk | PhysicalInteractionRisk;
    selectedMode?: DemonstrationMode;
    cameraLoad?: CameraMovementLoad;
    productStructuralDNA?: ProductStructuralDNA;
  }
): Scene2ActionBudgetEvaluation {
  const rawSegments = [
    actions.action0to2,
    actions.action2to4,
    actions.action4to6,
    actions.action6to8
  ].filter(s => typeof s === 'string' && s.trim().length > 0);

  const majorActions: string[] = [];
  const complexityReasons: string[] = [];

  // Major action detection regexes
  const MAJOR_ACTION_PATTERNS: Array<{ name: string; pattern: RegExp; precisionWeight: number }> = [
    { name: 'pick up product', pattern: /\b(pick up|picks up|pega|empunha|retira da base|pega na mão|takes|lift|lifts)\b/i, precisionWeight: 1 },
    { name: 'place object / surface placement', pattern: /\b(place|places|pousa|coloca|apoia|posiciona sobre|rests on|rests|sets down)\b/i, precisionWeight: 1 },
    { name: 'align object precisely / docking', pattern: /\b(align|aligns|alinha|encaixar|dock|docking|precise alignment|posiciona com precisão)\b/i, precisionWeight: 2 },
    { name: 'press control / button / switch', pattern: /\b(press|presses|pressiona|aperta|clica|push button|aciona|touch screen|tap)\b/i, precisionWeight: 2 },
    { name: 'rotate / tilt product', pattern: /\b(rotate|rotates|gira|inclina|tilt|tilts|rotaciona|vira)\b/i, precisionWeight: 1 },
    { name: 'move body position / seating', pattern: /\b(sit|sits|sentar|senta|stand up|levanta|walk|caminha|step|passos|aproxima-se|recua)\b/i, precisionWeight: 2 },
    { name: 'point to feature / highlight gesture', pattern: /\b(point|points|aponta|indica|destaca com o dedo|gesticula|mostra detalhe)\b/i, precisionWeight: 1 },
    { name: 'reveal result / showcase', pattern: /\b(reveal|reveals|mostra|exibe|revela|sorri exibindo|apresenta o resultado|demonstra)\b/i, precisionWeight: 1 },
    { name: 'change interaction target / hand switch', pattern: /\b(troca de mão|switch hand|pega outro|alcança segundo objeto|muda de posição)\b/i, precisionWeight: 2 },
    { name: 'manipulate mechanism / slide / open', pattern: /\b(slide|slides|desliza|open|opens|abre|pull|puxa|drawer|gaveta|tampa)\b/i, precisionWeight: 2 }
  ];

  let precisionScore = 0;

  for (const segment of rawSegments) {
    // Split on punctuation and conjunctions: comma, semicolon, period, " e ", " and "
    const clauses = segment.split(/[,.;]|\s+(?:e|and)\s+/i).map(c => c.trim()).filter(c => c.length > 2);
    for (const clause of clauses) {
      for (const item of MAJOR_ACTION_PATTERNS) {
        if (item.pattern.test(clause)) {
          const descriptor = `${item.name}: "${clause}"`;
          if (!majorActions.some(a => a === descriptor)) {
            majorActions.push(descriptor);
            precisionScore += item.precisionWeight;
          }
        }
      }
    }
  }

  // If no specific patterns matched, count non-empty segment phases as default actions
  if (majorActions.length === 0) {
    for (let i = 0; i < rawSegments.length; i++) {
      majorActions.push(`Action phase ${i + 1}: "${rawSegments[i]}"`);
      precisionScore += 1;
    }
  }

  const majorActionCount = majorActions.length;
  const isExceedsBudget = majorActionCount > 4 || precisionScore >= 6;

  if (majorActionCount > 4) {
    complexityReasons.push(`Action count (${majorActionCount}) exceeds the 8-second single take budget of 2-4 major actions.`);
  }
  if (precisionScore >= 6) {
    complexityReasons.push(`High physical precision and multi-target complexity score (${precisionScore}).`);
  }

  // Determine Action Load Level
  let actionLoad: Scene2LoadLevel = 'LOW';
  if (majorActionCount >= 5 || precisionScore >= 6 || options?.interactionRisk === 'HIGH') {
    actionLoad = 'HIGH';
  } else if (majorActionCount >= 4 || precisionScore >= 4 || options?.interactionRisk === 'MEDIUM') {
    actionLoad = 'MEDIUM';
  } else {
    actionLoad = 'LOW';
  }

  // If selectedMode is PASSIVE_VISUAL_DEMO or DISPLAY and no high precision actions, actionLoad is strictly LOW
  if ((options?.selectedMode === 'PASSIVE_VISUAL_DEMO' || options?.selectedMode === 'DISPLAY') && precisionScore <= 5 && majorActionCount <= 5) {
    actionLoad = 'LOW';
  }

  // If total major actions <= 3 and precision <= 3, actionLoad is strictly LOW
  if (majorActionCount <= 3 && precisionScore <= 3) {
    actionLoad = 'LOW';
  }

  return {
    majorActionCount,
    majorActions,
    actionBudgetStatus: isExceedsBudget ? 'EXCEEDS_BUDGET' : 'WITHIN_BUDGET',
    actionLoad,
    actionComplexityReasons: complexityReasons
  };
}

/**
 * 13.3 CAMERA MOVEMENT LOAD EVALUATION
 */
export function evaluateCameraLoad(
  cameraSafetyInstructions?: string[]
): CameraMovementLoad {
  const cameraText = (cameraSafetyInstructions || []).join(' ').toLowerCase();

  if (/\b(orbit|360|rapid pan|whip pan|dynamic tracking|aggressive push-in|complex movement|zoom in and out)\b/i.test(cameraText)) {
    return 'COMPLEX';
  }
  if (/\b(pan|tilt|dolly|tracking|smooth handheld drift|gentle drift|medium-close)\b/i.test(cameraText)) {
    return 'MODERATE';
  }
  return 'STATIC_OR_SUBTLE';
}

/**
 * 13.4 COMBINED LOAD RULE & SIMPLIFIER
 * If speechLoad === 'HIGH' and actionLoad === 'HIGH' (or with complex camera),
 * simplifys physical choreography to PASSIVE_VISUAL_DEMO or fewer, calmer actions.
 * Does NOT truncate or modify locked dialogue.
 */
export function evaluateScene2CombinedLoad(
  input: PhysicalChoreographyInput,
  options?: {
    actionBudgetEval?: Scene2ActionBudgetEvaluation;
    speechLoadEval?: Scene2SpeechLoadEvaluation;
    cameraLoad?: CameraMovementLoad;
    selectedDemoMode?: DemonstrationMode;
  }
): Scene2CombinedLoadEvaluation {
  const speechLoadEval = options?.speechLoadEval || evaluateScene2SpeechLoad(input.spokenCopy);
  const actionBudgetEval = options?.actionBudgetEval || evaluateScene2ActionBudget(input.actions, {
    selectedMode: options?.selectedDemoMode,
    productStructuralDNA: input.structuralDNA
  });
  const cameraLoad = options?.cameraLoad || 'STATIC_OR_SUBTLE';

  const speechLoad = speechLoadEval.speechLoad;
  const actionLoad = actionBudgetEval.actionLoad;

  let combinedLoad: Scene2LoadLevel = 'LOW';
  let overloaded = false;
  const simplificationReasons: string[] = [];

  if (speechLoad === 'HIGH' && actionLoad === 'HIGH') {
    combinedLoad = 'HIGH';
    overloaded = true;
    simplificationReasons.push('Combined Load Guard: Both speech load (HIGH) and physical action load (HIGH) exceed single-take capacity in 8 seconds.');
  } else if (speechLoad === 'HIGH' && actionLoad === 'MEDIUM' && cameraLoad === 'COMPLEX') {
    combinedLoad = 'HIGH';
    overloaded = true;
    simplificationReasons.push('Combined Load Guard: Dense speech, multi-action choreography, and complex camera movement overload 8-second take.');
  } else if (speechLoad === 'HIGH' || actionLoad === 'HIGH') {
    combinedLoad = 'MEDIUM';
    overloaded = actionBudgetEval.actionBudgetStatus === 'EXCEEDS_BUDGET';
    if (overloaded) {
      simplificationReasons.push(`Action budget exceeded with ${actionBudgetEval.majorActionCount} major actions in 8 seconds.`);
    }
  } else if (speechLoad === 'MEDIUM' && actionLoad === 'MEDIUM') {
    combinedLoad = 'MEDIUM';
    overloaded = false;
  } else {
    combinedLoad = 'LOW';
    overloaded = false;
  }

  let recommendedDemoMode = options?.selectedDemoMode;
  let simplificationApplied = false;

  if (overloaded) {
    simplificationApplied = true;
    if (recommendedDemoMode === 'FUNCTIONAL_INTERACTION' || !recommendedDemoMode) {
      recommendedDemoMode = 'PASSIVE_VISUAL_DEMO';
    }
  }

  return {
    speechLoadEvaluation: speechLoadEval,
    actionBudgetEvaluation: actionBudgetEval,
    cameraLoad,
    speechLoad,
    actionLoad,
    combinedLoad,
    overloaded,
    simplificationApplied,
    simplificationReasons,
    recommendedDemoMode
  };
}

/**
 * Creates simplified 8-second action sequence for overloaded or high-combined-load scenes.
 * Reduces 5-6 fragmented micro-actions into 2-3 calm, fluid major action phases.
 */
export function createSimplifiedActionSequence(
  input: PhysicalChoreographyInput,
  demoMode: DemonstrationMode
): string[] {
  const prod = input.productIdentity || 'o produto';

  if (demoMode === 'PASSIVE_VISUAL_DEMO') {
    return [
      `0.0s - 3.0s: Apresentadora exibe o ${prod} em destaque com postura calma e postura estável em direção à câmera.`,
      `3.0s - 6.0s: Apresentadora demonstra a iluminação suave e os detalhes visuais do ${prod} com gestos naturais.`,
      `6.0s - 8.0s: Apresentadora conclui a demonstração com expressão confiante mantendo o produto visível.`
    ];
  }

  if (demoMode === 'SIMPLE_HANDLING') {
    return [
      `0.0s - 3.0s: Apresentadora empunha o ${prod} com apoio seguro e natural.`,
      `3.0s - 6.0s: Apresentadora apresenta o formato ergonômico e acabamento do ${prod} sem movimentos bruscos.`,
      `6.0s - 8.0s: Apresentadora sorri exibindo o resultado diretamente para a câmera.`
    ];
  }

  return [
    `0.0s - 4.0s: Apresentadora apresenta o ${prod} com postura confiante e clara visibilidade.`,
    `4.0s - 8.0s: Apresentadora entrega o benefício principal diretamente para a câmera.`
  ];
}

// -----------------------------------------------------------------------------
// MAIN RESOLVER ENTRY POINT (WITH DETERMINISTIC VALIDATOR & SAFE FALLBACK)
// -----------------------------------------------------------------------------

/**
 * Resolves the full physical action choreography plan for Scene 2.
 * Purely deterministic, immutable, and zero-AI-call.
 * Includes context validation against Scene 2 allowlist with automatic safe fallback on BLOCK.
 */
export function resolvePhysicalActionChoreography(
  input: PhysicalChoreographyInput
): PhysicalInteractionPlan {
  // 1. Stage 3 Safe Demo Benefit Selection
  const safeDemoSelection = selectSafestVerifiedBenefit({
    primaryBenefit: input.productFacts?.[0],
    productFacts: input.productFacts,
    productVisibleDetails: input.productVisibleDetails,
    structuralDNA: input.structuralDNA,
    referenceCoverage: input.referenceCoverage,
    category: input.category,
    productIdentity: input.productIdentity,
    actions: input.actions
  });

  // 2. Stage 2 Demonstration Safety Gate (Risk + Geometry Confidence + Control Target Guard)
  const safetyGate = evaluateDemonstrationSafetyGate(input);

  if (safetyGate.guardStatus === 'BLOCKED') {
    // Return safe fallback without failing the scene
    const fallback = createSafeFallbackChoreographyPlan(input, safetyGate.reasons);
    return Object.freeze({
      ...fallback,
      demonstrationRisk: safetyGate.demonstrationRisk,
      geometryConfidence: safetyGate.geometryConfidence,
      demonstrationGuardStatus: 'BLOCKED',
      demonstrationBlockedReasons: safetyGate.reasons,
      selectedDemoMode: safeDemoSelection.selectedMode,
      selectedDemoBenefit: safeDemoSelection.selectedBenefit,
      safeDemoSelection
    });
  }

  const risk = determineInteractionRisk(input);
  const { primaryTarget, actorStartPosition } = resolveTargetAndStartPosition(input, risk);
  const actionSequence = resolveActionSequence(input, risk);
  const requiredClearance = resolveRequiredClearance(input, risk);
  const collisionBoundaries = resolveCollisionBoundaries(input, risk);
  const preExistingProps = resolvePreExistingProps(input, risk);
  const cameraSafetyInstructions = resolveCameraSafetyInstructions(risk);
  const speechActionAnchors = validateAndReconcileSpeechAnchors(
    input.speechActionSync,
    input.spokenCopy,
    input.actions
  );

  // Stage 4 Load & Action Budget Evaluations
  const speechLoadEval = evaluateScene2SpeechLoad(input.spokenCopy);
  const actionBudgetEval = evaluateScene2ActionBudget(input.actions, {
    interactionRisk: risk,
    selectedMode: safeDemoSelection.selectedMode,
    productStructuralDNA: input.structuralDNA
  });
  const cameraLoad = evaluateCameraLoad(cameraSafetyInstructions);
  const combinedLoadEval = evaluateScene2CombinedLoad(input, {
    speechLoadEval,
    actionBudgetEval,
    cameraLoad,
    selectedDemoMode: safeDemoSelection.selectedMode
  });

  // If combined load is overloaded (or budget exceeded with high speech load), simplify action sequence
  let finalActionSequence = actionSequence;
  let finalDemoMode = safeDemoSelection.selectedMode;
  if (combinedLoadEval.overloaded && combinedLoadEval.simplificationApplied) {
    finalDemoMode = combinedLoadEval.recommendedDemoMode || 'PASSIVE_VISUAL_DEMO';
    finalActionSequence = createSimplifiedActionSequence(input, finalDemoMode);
  }

  const candidatePlan: PhysicalInteractionPlan = {
    interactionRisk: risk,
    demonstrationRisk: safetyGate.demonstrationRisk,
    geometryConfidence: safetyGate.geometryConfidence,
    demonstrationGuardStatus: 'ALLOWED',
    selectedDemoMode: finalDemoMode,
    selectedDemoBenefit: safeDemoSelection.selectedBenefit,
    safeDemoSelection: {
      ...safeDemoSelection,
      selectedMode: finalDemoMode
    },
    speechLoad: speechLoadEval.speechLoad,
    actionLoad: actionBudgetEval.actionLoad,
    combinedLoad: combinedLoadEval.combinedLoad,
    speechLoadEvaluation: speechLoadEval,
    actionBudgetEvaluation: actionBudgetEval,
    combinedLoadEvaluation: combinedLoadEval,
    actorStartPosition,
    primaryTarget,
    actionSequence: finalActionSequence,
    requiredClearance,
    collisionBoundaries,
    preExistingProps,
    cameraSafetyInstructions,
    speechActionAnchors
  };

  // Run Stage 1 Scene Context Validation Gate
  const validation = validateChoreographyAgainstSceneContext(candidatePlan, input);

  if (validation.status === 'BLOCK') {
    // Return safe fallback without failing the scene
    const fallback = createSafeFallbackChoreographyPlan(input, validation.reasons);
    return Object.freeze({
      ...fallback,
      demonstrationRisk: safetyGate.demonstrationRisk,
      geometryConfidence: safetyGate.geometryConfidence,
      demonstrationGuardStatus: 'ALLOWED',
      selectedDemoMode: safeDemoSelection.selectedMode,
      selectedDemoBenefit: safeDemoSelection.selectedBenefit,
      safeDemoSelection
    });
  }

  return Object.freeze(candidatePlan);
}
