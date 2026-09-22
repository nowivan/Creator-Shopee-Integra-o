/**
 * PHYSICAL MOTION DNA ENGINE — ETAPA 2
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Extração estruturada de movimento físico observável a partir de análises,
 * cenas, frames e prompts existentes da Engenharia Reversa.
 * 
 * Princípio: OBSERVAÇÃO ESTRUTURADA DA REFERÊNCIA (sem interpretar intenção,
 * sem otimizações arbitrárias, puramente descritivo e determinístico).
 */

import {
  PhysicalMotionDNA,
  PhysicalMotionScene,
  GripType,
  ProductOrientation,
  MotionComplexity,
} from './types';

// ============================================================================
// DICIONÁRIOS DETERMINÍSTICOS DE AÇÃO & FÍSICA OBSERVÁVEL
// ============================================================================

const PHYSICAL_ACTION_VERBS = [
  'hold', 'holds', 'holding',
  'raise', 'raises', 'raising',
  'lift', 'lifts', 'lifting',
  'point', 'points', 'pointing',
  'rotate', 'rotates', 'rotating', 'turn', 'turns', 'turning',
  'open', 'opens', 'opening', 'unlid', 'unlids', 'unboxing',
  'close', 'closes', 'closing',
  'touch', 'touches', 'touching', 'tap', 'taps', 'tapping',
  'place', 'places', 'placing', 'put', 'puts', 'putting',
  'pull', 'pulls', 'pulling',
  'push', 'pushes', 'pushing', 'press', 'presses', 'pressing',
  'wear', 'wears', 'wearing', 'put on', 'puts on',
  'apply', 'applies', 'applying', 'spread', 'spreads',
  'twist', 'twists', 'twisting',
  'spray', 'sprays', 'spraying',
  'wipe', 'wipes', 'wiping',
  'shake', 'shakes', 'shaking',
  'show', 'shows', 'showing', 'present', 'presents', 'presenting',
  'slide', 'slides', 'sliding',
  'squeeze', 'squeezes', 'squeezing',
  'pour', 'pours', 'pouring',
];

const GRIP_KEYWORDS: Array<{ type: GripType; patterns: RegExp[] }> = [
  {
    type: 'TWO_HAND_SUPPORT',
    patterns: [/two hands/i, /both hands/i, /dual hand/i, /duas mãos/i, /ambas as mãos/i],
  },
  {
    type: 'PINCH',
    patterns: [/pinch/i, /fingertips/i, /between thumb and index/i, /pontas dos dedos/i, /pinça/i],
  },
  {
    type: 'PALM_SUPPORT',
    patterns: [/palm/i, /resting on palm/i, /flat palm/i, /palma da mão/i, /apoiado na palma/i],
  },
  {
    type: 'EDGE_GRIP',
    patterns: [/edge/i, /rim/i, /border/i, /holding the side/i, /segura pela borda/i, /lateral/i],
  },
  {
    type: 'ONE_HAND_SUPPORT',
    patterns: [/one hand/i, /single hand/i, /left hand/i, /right hand/i, /held in hand/i, /mão direita/i, /mão esquerda/i, /uma mão/i],
  },
  {
    type: 'NO_GRIP',
    patterns: [/no hands/i, /floating/i, /tabletop only/i, /standalone/i, /sem mãos/i, /sob a mesa/i],
  },
];

const ORIENTATION_KEYWORDS: Array<{ orientation: ProductOrientation; patterns: RegExp[] }> = [
  {
    orientation: 'FRONT_TO_CAMERA',
    patterns: [/facing camera/i, /front label/i, /front facing/i, /de frente/i, /rótulo frontal/i, /direto para a câmera/i],
  },
  {
    orientation: 'SIDE_TO_CAMERA',
    patterns: [/side view/i, /profile view/i, /lateral/i, /de perfil/i, /visão lateral/i],
  },
  {
    orientation: 'TOP_TO_CAMERA',
    patterns: [/top-down/i, /overhead/i, /top view/i, /de cima/i, /visão superior/i],
  },
  {
    orientation: 'ANGLED',
    patterns: [/3\/4 angle/i, /three quarter/i, /tilted/i, /angled/i, /inclinado/i, /ângulo 45/i],
  },
  {
    orientation: 'NATURAL_USE_ORIENTATION',
    patterns: [/in use/i, /functional position/i, /dispensing/i, /em uso/i, /posição natural/i],
  },
];

// ============================================================================
// FUNÇÕES AUXILIARES PURAS DE DETECÇÃO DETERMINÍSTICA
// ============================================================================

function extractSentencesAndPhrases(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/[.;,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);
}

function detectActionOrder(text: string): string[] | undefined {
  if (!text) return undefined;
  const phrases = extractSentencesAndPhrases(text);
  const actions: string[] = [];

  for (const phrase of phrases) {
    const lower = phrase.toLowerCase();
    const hasVerb = PHYSICAL_ACTION_VERBS.some(v => new RegExp(`\\b${v}\\b`, 'i').test(lower));
    if (hasVerb) {
      actions.push(phrase);
    }
  }

  return actions.length > 0 ? actions : undefined;
}

function detectProductInteraction(text: string): string[] | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const verb of PHYSICAL_ACTION_VERBS) {
    if (new RegExp(`\\b${verb}\\b`, 'i').test(lower)) {
      // Normaliza forma base
      const baseVerb = verb.endsWith('ing')
        ? verb.replace(/ing$/, '')
        : verb.endsWith('es')
          ? verb.replace(/es$/, '')
          : verb.endsWith('s')
            ? verb.replace(/s$/, '')
            : verb;
      if (!found.includes(baseVerb)) {
        found.push(baseVerb);
      }
    }
  }

  return found.length > 0 ? found : undefined;
}

function detectGripType(text: string): GripType | undefined {
  if (!text) return undefined;
  for (const item of GRIP_KEYWORDS) {
    if (item.patterns.some(pattern => pattern.test(text))) {
      return item.type;
    }
  }
  return undefined;
}

function detectProductOrientation(text: string): ProductOrientation | undefined {
  if (!text) return undefined;
  for (const item of ORIENTATION_KEYWORDS) {
    if (item.patterns.some(pattern => pattern.test(text))) {
      return item.orientation;
    }
  }
  return undefined;
}

function detectGazePath(text: string): string[] | undefined {
  if (!text) return undefined;
  const gazeList: string[] = [];
  const lower = text.toLowerCase();

  if (/look(ing|s)? (at|into|towards) (the )?camera/i.test(lower) && /look(ing|s)? (at|down at) (the )?product/i.test(lower)) {
    gazeList.push('camera -> product -> camera');
  } else if (/look(ing|s)? (at|into|towards) (the )?camera/i.test(lower) || /direct eye contact/i.test(lower)) {
    gazeList.push('direct to camera');
  } else if (/look(ing|s)? (at|down at) (the )?product/i.test(lower) || /focusing on product/i.test(lower)) {
    gazeList.push('focused on product');
  }

  return gazeList.length > 0 ? gazeList : undefined;
}

function detectHandPath(text: string): string[] | undefined {
  if (!text) return undefined;
  const paths: string[] = [];
  const lower = text.toLowerCase();

  if (/left hand/i.test(lower)) {
    const match = text.match(/(left hand[^.;,\n]+)/i);
    if (match) paths.push(match[1].trim());
  }
  if (/right hand/i.test(lower)) {
    const match = text.match(/(right hand[^.;,\n]+)/i);
    if (match) paths.push(match[1].trim());
  }
  if (paths.length === 0 && /hands?|fingers?/i.test(lower)) {
    const match = text.match(/((?:both |two )?hands?[^.;,\n]+)/i);
    if (match) paths.push(match[1].trim());
  }

  return paths.length > 0 ? paths : undefined;
}

function detectContactPoints(text: string): string[] | undefined {
  if (!text) return undefined;
  const points: string[] = [];
  const lower = text.toLowerCase();

  if (/base|bottom/i.test(lower) && /hand|palm|fingers/i.test(lower)) {
    points.push('palm supporting base');
  }
  if (/lid|cap|nozzle|dispenser|top/i.test(lower) && /finger|index|hand|touch|press/i.test(lower)) {
    points.push('finger contact on top/lid');
  }
  if (/side|sides|body/i.test(lower) && /grip|hold|fingers/i.test(lower)) {
    points.push('fingers gripping body sides');
  }

  return points.length > 0 ? points : undefined;
}

function detectMicroPauses(text: string): string[] | undefined {
  if (!text) return undefined;
  const pauses: string[] = [];
  const lower = text.toLowerCase();

  if (/pause|brief hold|hesitat|freeze|stillness/i.test(lower)) {
    const match = text.match(/([^.;,\n]*(?:pause|brief hold|hesitat|stillness)[^.;,\n]*)/i);
    if (match) pauses.push(match[1].trim());
  }

  return pauses.length > 0 ? pauses : undefined;
}

function calculateMotionComplexity(actionCount: number, hasMultipleHands: boolean, hasRepositioning: boolean): MotionComplexity {
  if (actionCount >= 5 || (actionCount >= 3 && hasMultipleHands && hasRepositioning)) {
    return 'HIGH';
  }
  if (actionCount >= 3 || (actionCount >= 2 && hasMultipleHands)) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function extractStartAndEndPose(
  sceneText: string,
  sceneIndex: number,
  totalScenes: number
): { startPose?: string; endPose?: string; bodyPosition?: string } {
  if (!sceneText) return {};

  const lower = sceneText.toLowerCase();
  let bodyPosition: string | undefined = undefined;

  if (/pov|first[- ]person|hands[- ]only|close[- ]up on hands/i.test(lower)) {
    bodyPosition = 'POV / Hands-only';
  } else if (/upper body|torso|waist up|medium shot/i.test(lower)) {
    bodyPosition = 'Presenter medium upper-torso';
  } else if (/full body|standing/i.test(lower)) {
    bodyPosition = 'Presenter full body';
  } else if (/close[- ]up/i.test(lower)) {
    bodyPosition = 'Presenter close-up';
  }

  // Gera descrições simples e objetivas dos estados inicial e final
  const phrases = extractSentencesAndPhrases(sceneText);
  const startPose = phrases.length > 0
    ? phrases[0]
    : bodyPosition
      ? `${bodyPosition} at start of scene`
      : undefined;

  const endPose = phrases.length > 1
    ? phrases[phrases.length - 1]
    : phrases.length === 1
      ? phrases[0]
      : bodyPosition
        ? `${bodyPosition} at end of scene`
        : undefined;

  return { startPose, endPose, bodyPosition };
}

// ============================================================================
// CONTINUITY ANALYSIS ACROSS CONSECUTIVE SCENES
// ============================================================================

function computeContinuityNotes(scenes: PhysicalMotionScene[]): PhysicalMotionScene[] {
  if (!Array.isArray(scenes) || scenes.length <= 1) return scenes;

  return scenes.map((scene, idx) => {
    if (idx === 0) return scene;
    const prevScene = scenes[idx - 1];
    const notes: string[] = [];

    // Compara hand/grip continuity
    if (prevScene.gripType && scene.gripType && prevScene.gripType === scene.gripType) {
      notes.push(`Grip (${scene.gripType}) maintained from previous scene.`);
    }

    // Compara body position continuity
    if (prevScene.bodyPosition && scene.bodyPosition && prevScene.bodyPosition === scene.bodyPosition) {
      notes.push(`Body position (${scene.bodyPosition}) remains consistent with scene ${idx}.`);
    } else if (prevScene.bodyPosition && scene.bodyPosition && prevScene.bodyPosition !== scene.bodyPosition) {
      notes.push(`Transition from ${prevScene.bodyPosition} to ${scene.bodyPosition}.`);
    }

    // Compara startPose com endPose anterior
    if (prevScene.endPose && scene.startPose && /left hand|right hand|product/i.test(prevScene.endPose) && /left hand|right hand|product/i.test(scene.startPose)) {
      notes.push(`Product interaction continuity observed across cut.`);
    }

    return {
      ...scene,
      continuityNotes: notes.length > 0 ? notes : scene.continuityNotes,
    };
  });
}

// ============================================================================
// NORMALIZER FUNCTION (PURE & IMMUTABLE)
// ============================================================================

/**
 * Normaliza e sanitiza um objeto PhysicalMotionDNA para garantir integridade estrutural.
 */
export function normalizePhysicalMotionDNA(raw: any): PhysicalMotionDNA {
  if (!raw || typeof raw !== 'object') {
    return { scenes: [] };
  }

  const rawScenes: any[] = Array.isArray(raw.scenes)
    ? raw.scenes
    : Array.isArray(raw)
      ? raw
      : [];

  const scenes: PhysicalMotionScene[] = rawScenes.map((s, idx) => {
    const sceneId = typeof s.sceneId === 'string' ? s.sceneId : `scene_${idx + 1}`;
    const actionOrder = Array.isArray(s.actionOrder) ? s.actionOrder.filter(Boolean) : undefined;
    const handPath = Array.isArray(s.handPath) ? s.handPath.filter(Boolean) : undefined;
    const gazePath = Array.isArray(s.gazePath) ? s.gazePath.filter(Boolean) : undefined;
    const productInteraction = Array.isArray(s.productInteraction) ? s.productInteraction.filter(Boolean) : undefined;
    const contactPoints = Array.isArray(s.contactPoints) ? s.contactPoints.filter(Boolean) : undefined;
    const microPauses = Array.isArray(s.microPauses) ? s.microPauses.filter(Boolean) : undefined;
    const continuityNotes = Array.isArray(s.continuityNotes) ? s.continuityNotes.filter(Boolean) : undefined;

    return {
      sceneId,
      startPose: typeof s.startPose === 'string' ? s.startPose : undefined,
      bodyPosition: typeof s.bodyPosition === 'string' ? s.bodyPosition : undefined,
      actionOrder: actionOrder && actionOrder.length > 0 ? actionOrder : undefined,
      handPath: handPath && handPath.length > 0 ? handPath : undefined,
      gazePath: gazePath && gazePath.length > 0 ? gazePath : undefined,
      productInteraction: productInteraction && productInteraction.length > 0 ? productInteraction : undefined,
      contactPoints: contactPoints && contactPoints.length > 0 ? contactPoints : undefined,
      gripType: s.gripType || undefined,
      productOrientation: s.productOrientation || undefined,
      microPauses: microPauses && microPauses.length > 0 ? microPauses : undefined,
      continuityNotes: continuityNotes && continuityNotes.length > 0 ? continuityNotes : undefined,
      endPose: typeof s.endPose === 'string' ? s.endPose : undefined,
      motionComplexity: (['LOW', 'MEDIUM', 'HIGH'].includes(s.motionComplexity)) ? s.motionComplexity : undefined,
    };
  });

  return {
    scenes: computeContinuityNotes(scenes),
  };
}

// ============================================================================
// MAIN EXTRACTOR ENGINE (PURE & DETERMINISTIC)
// ============================================================================

/**
 * Extrai o PhysicalMotionDNA a partir de dados de cenas existentes da Engenharia Reversa
 * (veo_structure, sora_structure, grok_structure, blocks, ou array direto de cenas).
 * 
 * Não modifica os dados de entrada.
 */
export function extractPhysicalMotionDNA(input: any): PhysicalMotionDNA {
  if (!input) return { scenes: [] };

  // 1. Extração segura da lista de cenas
  const scenesList: any[] = Array.isArray(input)
    ? input
    : Array.isArray(input.veo_structure) && input.veo_structure.length > 0
      ? input.veo_structure
      : Array.isArray(input.sora_structure) && input.sora_structure.length > 0
        ? input.sora_structure
        : Array.isArray(input.grok_structure) && input.grok_structure.length > 0
          ? input.grok_structure
          : Array.isArray(input.blocks) && input.blocks.length > 0
            ? input.blocks
            : Array.isArray(input.scenes) && input.scenes.length > 0
              ? input.scenes
              : [];

  if (scenesList.length === 0) {
    return { scenes: [] };
  }

  // 2. Extração determinística cena a cena
  const extractedScenes: PhysicalMotionScene[] = scenesList.map((scene: any, idx: number) => {
    const sceneId = scene.scene_name || scene.name || `scene_${idx + 1}`;
    
    // Concatena descrições visuais existentes
    const visualText = [
      scene.visual_prompt_en,
      scene.visual_context_en,
      scene.action,
      scene.actions,
      scene.action_description,
      scene.camera_movement_en,
      scene.creator_profile,
    ].filter(Boolean).join('. ');

    const actionOrder = detectActionOrder(visualText);
    const productInteraction = detectProductInteraction(visualText);
    const gripType = detectGripType(visualText);
    const productOrientation = detectProductOrientation(visualText);
    const gazePath = detectGazePath(visualText);
    const handPath = detectHandPath(visualText);
    const contactPoints = detectContactPoints(visualText);
    const microPauses = detectMicroPauses(visualText);

    const { startPose, endPose, bodyPosition } = extractStartAndEndPose(visualText, idx, scenesList.length);

    const actionCount = actionOrder ? actionOrder.length : (productInteraction ? productInteraction.length : 0);
    const hasMultipleHands = (handPath && handPath.length > 1) || gripType === 'TWO_HAND_SUPPORT';
    const hasRepositioning = /reposition|moves across|walks|turns around|rotates/i.test(visualText);
    const motionComplexity = calculateMotionComplexity(actionCount, hasMultipleHands, hasRepositioning);

    return {
      sceneId,
      startPose,
      bodyPosition,
      actionOrder,
      handPath,
      gazePath,
      productInteraction,
      contactPoints,
      gripType,
      productOrientation,
      microPauses,
      endPose,
      motionComplexity,
    };
  });

  return {
    scenes: computeContinuityNotes(extractedScenes),
  };
}
