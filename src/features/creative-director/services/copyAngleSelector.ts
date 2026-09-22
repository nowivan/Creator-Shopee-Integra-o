/**
 * CREATIVE DIRECTOR AGENT 3 — COPY ANGLE SELECTOR (STAGE 1)
 * 
 * Provides strategic persuasion and decision angles for Scene 2 and Scene 3 copy generation.
 * Improves strategic variation and natural persuasion without weakening safety,
 * fact authority, semantic evidence guard, role purity, or copy contract.
 * 
 * Strict Guarantees:
 * 1. Internal angle types:
 *    Scene 2: PRACTICAL_BENEFIT, MULTI_FEATURE_VALUE, ROUTINE_IMPROVEMENT,
 *             SPACE_ORGANIZATION, COMFORT_DESIRE, USE_CONTEXT
 *    Scene 3: CONDITION_VALUE, AVAILABILITY_LOSS, DECISION_NOW,
 *             OPPORTUNITY_WINDOW, DONT_MISS, SOFT_URGENCY
 * 2. Verified Facts Only: Angles never invent discount, stock, deadline, promotion,
 *    popularity, ranking, previous price, exclusivity, or demand.
 * 3. True Strategic Variation: Multiple variations receive distinct angles.
 * 4. Role Purity: Scene 2 = benefit/desire/practical result; Scene 3 = decision/CTA.
 * 5. DEV Diagnostics: Logs [COPY_ANGLE_SELECTION] with structured metadata without full copy text.
 */

import { VerifiedCommercialFacts } from './scene3CtaEngine';

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
export type SceneRole = 'scene2' | 'scene3';

export interface CopyAngleDefinition<T extends CopyAngle> {
  id: T;
  labelPtBr: string;
  purpose: string;
  focus: string;
  role: SceneRole;
  forbiddenElements: string[];
}

export interface CopyAngleDiagnostics {
  sceneRole: SceneRole;
  selectedAngle: CopyAngle;
  eligibleAngles: CopyAngle[];
  variationIndex: number;
}

export interface AngleSelectionContext {
  productIdentity: string;
  category?: string;
  quantity?: string | null;
  verifiedFacts?: string[];
  visibleDetails?: string[];
  commercialFacts?: VerifiedCommercialFacts;
}

/**
 * Scene 2 Angle Definitions with exact persuasive objectives.
 */
export const SCENE2_ANGLE_DEFINITIONS: Record<Scene2CopyAngle, CopyAngleDefinition<Scene2CopyAngle>> = {
  PRACTICAL_BENEFIT: {
    id: 'PRACTICAL_BENEFIT',
    labelPtBr: 'Benefício Prático',
    purpose: 'Focar diretamente no que se torna mais fácil, rápido ou útil no dia a dia com o produto.',
    focus: 'Praticidade funcional, facilidade de uso e utilidade imediata.',
    role: 'scene2',
    forbiddenElements: ['CTA agressiva', 'carrinho laranja', 'escassez', 'urgência', 'preço', 'desconto']
  },
  MULTI_FEATURE_VALUE: {
    id: 'MULTI_FEATURE_VALUE',
    labelPtBr: 'Valor Multifuncional Integrado',
    purpose: 'Combinar recursos e funções verificadas em uma única proposta prática de valor integrada.',
    focus: 'Sinergia de múltiplas funções confirmadas (ex: som + luz + relógio ou kit completo).',
    role: 'scene2',
    forbiddenElements: ['CTA agressiva', 'carrinho laranja', 'escassez', 'urgência', 'preço', 'desconto']
  },
  ROUTINE_IMPROVEMENT: {
    id: 'ROUTINE_IMPROVEMENT',
    labelPtBr: 'Melhoria da Rotina Diária',
    purpose: 'Mostrar como o produto transforma e melhora momentos específicos da rotina diária.',
    focus: 'Uso cotidiano contínuo, manhãs, noites, trabalho ou relaxamento.',
    role: 'scene2',
    forbiddenElements: ['CTA agressiva', 'carrinho laranja', 'escassez', 'urgência', 'preço', 'desconto']
  },
  SPACE_ORGANIZATION: {
    id: 'SPACE_ORGANIZATION',
    labelPtBr: 'Organização e Praticidade do Espaço',
    purpose: 'Focar em organização, otimização do ambiente, comodidade e redução de desordem.',
    focus: 'Ambiente limpo, menos itens soltos, formato compacto e espaço organizado.',
    role: 'scene2',
    forbiddenElements: ['CTA agressiva', 'carrinho laranja', 'escassez', 'urgência', 'preço', 'desconto']
  },
  COMFORT_DESIRE: {
    id: 'COMFORT_DESIRE',
    labelPtBr: 'Conforto e Atmosfera Agradável',
    purpose: 'Focar na sensação agradável de uso, conforto visual, ambiente acolhedor e comodidade.',
    focus: 'Sensação tátil/visual agradável, iluminação ambiente, bem-estar e conforto.',
    role: 'scene2',
    forbiddenElements: ['CTA agressiva', 'carrinho laranja', 'escassez', 'urgência', 'preço', 'desconto']
  },
  USE_CONTEXT: {
    id: 'USE_CONTEXT',
    labelPtBr: 'Contexto de Uso Natural',
    purpose: 'Inserir o benefício verificado em um contexto concreto e autêntico de uso cotidiano.',
    focus: 'Cenário realista de uso (mesa de cabeceira, bancada de cozinha, escritório, banheiro).',
    role: 'scene2',
    forbiddenElements: ['CTA agressiva', 'carrinho laranja', 'escassez', 'urgência', 'preço', 'desconto']
  }
};

/**
 * Scene 3 Angle Definitions with exact decision & closing objectives.
 */
export const SCENE3_ANGLE_DEFINITIONS: Record<Scene3CopyAngle, CopyAngleDefinition<Scene3CopyAngle>> = {
  CONDITION_VALUE: {
    id: 'CONDITION_VALUE',
    labelPtBr: 'Valor e Condição Completa',
    purpose: 'Focar na oportunidade atraente de garantir o produto completo na condição ativa apresentada.',
    focus: 'Percepção de valor do produto completo, fechamento com segurança e conveniência.',
    role: 'scene3',
    forbiddenElements: ['desconto inventado', 'preço em dinheiro', 'benefício longo de cena 2', 'direção de cena']
  },
  AVAILABILITY_LOSS: {
    id: 'AVAILABILITY_LOSS',
    labelPtBr: 'Possibilidade de Saída da Tela',
    purpose: 'Focar na possibilidade real de que a exibição na tela não continue aparecendo para o usuário.',
    focus: 'Aversão à perda da exibição ativa sem inventar contadores ou estoques falsos.',
    role: 'scene3',
    forbiddenElements: ['estoque acabando falso', 'só hoje falso', 'alta demanda falsa', 'benefício longo de cena 2']
  },
  DECISION_NOW: {
    id: 'DECISION_NOW',
    labelPtBr: 'Decisão Pessoal do Usuário',
    purpose: 'Encorajar a decisão e escolha do usuário de levar o modelo agora, de forma natural e fluida.',
    focus: 'Escolha própria do comprador, decisão de ter o item em mãos sem pressão artificial.',
    role: 'scene3',
    forbiddenElements: ['urgência fake', 'preço em dinheiro', 'benefício longo de cena 2', 'direção de cena']
  },
  OPPORTUNITY_WINDOW: {
    id: 'OPPORTUNITY_WINDOW',
    labelPtBr: 'Janela de Oportunidade',
    purpose: 'Enquadrar o momento atual como a oportunidade certa para conferir e pedir o modelo pelo app.',
    focus: 'Momento oportuno de compra enquanto visualiza o produto no aplicativo.',
    role: 'scene3',
    forbiddenElements: ['oportunidade única falsa', 'preço em dinheiro', 'benefício longo de cena 2']
  },
  DONT_MISS: {
    id: 'DONT_MISS',
    labelPtBr: 'Evitar Deixar para Depois',
    purpose: 'Sensação suave de não adiar o pedido para evitar não encontrar o item depois.',
    focus: 'Não deixar para depois, garantir agora de forma simples e direta.',
    role: 'scene3',
    forbiddenElements: ['pânico artificial', 'últimas unidades falsas', 'benefício longo de cena 2']
  },
  SOFT_URGENCY: {
    id: 'SOFT_URGENCY',
    labelPtBr: 'Ação Imediata Fluida',
    purpose: 'Urgência natural e fluida para agir enquanto está no vídeo, sem inventar prazos falsos.',
    focus: 'Ação no fluxo do app, toque no carrinho laranja agora mesmo com rapidez.',
    role: 'scene3',
    forbiddenElements: ['cronômetro falso', 'só hoje inventado', 'benefício longo de cena 2']
  }
};

/**
 * Determines eligible Scene 2 angles based on verified product facts, category, and attributes.
 */
export function determineEligibleScene2Angles(context: AngleSelectionContext): Scene2CopyAngle[] {
  const eligible: Scene2CopyAngle[] = [];
  const text = [
    context.productIdentity,
    context.category || '',
    context.quantity || '',
    ...(context.verifiedFacts || []),
    ...(context.visibleDetails || [])
  ].join(' ').toLowerCase();

  const factsCount = (context.verifiedFacts || []).length;
  const isKit = /\b(kit|conjunto|\d+\s*peças|\d+\s*unidades|splashes|frascos)\b/i.test(text);
  const isMultiFeature = factsCount >= 2 || /\b(luminária|relógio|smartwatch|multifuncional|3 em 1|4 em 1|bluetooth|indução|rgb|carregador)\b/i.test(text);
  const hasRoutineContext = /\b(dia a dia|rotina|manhã|noite|quarto|cozinha|banho|trabalho|sono|acordar|estudo)\b/i.test(text) || true;
  const hasComfortContext = /\b(rgb|luz|iluminação|som|música|conforto|aconchego|toque|macio|aroma|perfume|relax)\b/i.test(text);
  const hasSpaceContext = /\b(mesa|cabeceira|bancada|organiza|espaço|compacto|sem fios|tudo em um|integrado)\b/i.test(text);

  // 1. PRACTICAL_BENEFIT is always foundational
  eligible.push('PRACTICAL_BENEFIT');

  // 2. MULTI_FEATURE_VALUE when product combines multiple verified functions or items
  if (isMultiFeature || isKit) {
    eligible.push('MULTI_FEATURE_VALUE');
  }

  // 3. ROUTINE_IMPROVEMENT
  if (hasRoutineContext) {
    eligible.push('ROUTINE_IMPROVEMENT');
  }

  // 4. COMFORT_DESIRE
  if (hasComfortContext) {
    eligible.push('COMFORT_DESIRE');
  }

  // 5. SPACE_ORGANIZATION
  if (hasSpaceContext || isMultiFeature || isKit) {
    eligible.push('SPACE_ORGANIZATION');
  }

  // 6. USE_CONTEXT is always naturally grounded
  eligible.push('USE_CONTEXT');

  // Ensure full coverage order if pool is small
  const allScene2Angles: Scene2CopyAngle[] = [
    'PRACTICAL_BENEFIT',
    'MULTI_FEATURE_VALUE',
    'ROUTINE_IMPROVEMENT',
    'SPACE_ORGANIZATION',
    'COMFORT_DESIRE',
    'USE_CONTEXT'
  ];

  for (const angle of allScene2Angles) {
    if (!eligible.includes(angle)) {
      eligible.push(angle);
    }
  }

  return eligible;
}

/**
 * Determines eligible Scene 3 decision angles based on commercial facts and scene role.
 */
export function determineEligibleScene3Angles(context: AngleSelectionContext): Scene3CopyAngle[] {
  // All 6 Scene 3 angles are structurally eligible for decision & closing
  // The priority and framing adapt to verified commercial facts while respecting Fact Authority
  const allScene3Angles: Scene3CopyAngle[] = [
    'CONDITION_VALUE',
    'AVAILABILITY_LOSS',
    'DECISION_NOW',
    'OPPORTUNITY_WINDOW',
    'DONT_MISS',
    'SOFT_URGENCY'
  ];

  const hasDiscount = Boolean(context.commercialFacts?.hasExplicitDiscount || context.commercialFacts?.hasExplicitCoupon || context.commercialFacts?.hasExplicitOffer);
  const hasStockLimit = Boolean(context.commercialFacts?.hasExplicitStockLimit);
  const hasDeadline = Boolean(context.commercialFacts?.hasExplicitDeadline);

  if (hasDiscount || hasStockLimit || hasDeadline) {
    // When explicit commercial facts exist, prioritize condition value and opportunity window
    return [
      'CONDITION_VALUE',
      'OPPORTUNITY_WINDOW',
      'AVAILABILITY_LOSS',
      'DECISION_NOW',
      'DONT_MISS',
      'SOFT_URGENCY'
    ];
  }

  // Standard neutral order providing maximal semantic variation across variations
  return allScene3Angles;
}

/**
 * Selects distinct angles for a requested batch size (1..6) without unwanted duplicates.
 */
export function selectCopyAnglesForBatch<T extends CopyAngle>(
  sceneRole: SceneRole,
  eligibleAngles: T[],
  variationCount: number
): T[] {
  const count = Math.max(1, Math.min(6, Math.round(variationCount || 1)));
  const pool = eligibleAngles.length > 0 ? eligibleAngles : ([] as T[]);
  const selected: T[] = [];

  for (let i = 0; i < count; i++) {
    const angleIndex = i % pool.length;
    const angle = pool[angleIndex];
    selected.push(angle);

    // DEV-only diagnostic logging (Rule 8)
    logCopyAngleSelection({
      sceneRole,
      selectedAngle: angle,
      eligibleAngles: pool,
      variationIndex: i + 1
    });
  }

  return selected;
}

/**
 * Formats DEV diagnostic log entry for angle selection (Rule 8).
 * Never logs full copy text.
 */
export function logCopyAngleSelection(diag: CopyAngleDiagnostics): void {
  try {
    console.log('[COPY_ANGLE_SELECTION]', JSON.stringify({
      sceneRole: diag.sceneRole,
      selectedAngle: diag.selectedAngle,
      eligibleAngles: diag.eligibleAngles,
      variationIndex: diag.variationIndex
    }));
  } catch {
    // Silent fail in non-console environments
  }
}

/**
 * Returns formatted instructions for Scene 3 CTA LLM prompts tailored to the assigned angle.
 */
export function getScene3AnglePromptInstruction(angle: Scene3CopyAngle, versionNumber: number): string {
  const def = SCENE3_ANGLE_DEFINITIONS[angle];
  switch (angle) {
    case 'CONDITION_VALUE':
      return `VERSÃO ${versionNumber} (Ângulo: Valor da Condição): Foque na oportunidade atraente de garantir o produto completo com praticidade e segurança pelo app.`;
    case 'AVAILABILITY_LOSS':
      return `VERSÃO ${versionNumber} (Ângulo: Disponibilidade na Tela): Foque na possibilidade de a exibição na tela não continuar aparecendo para o usuário ("se ainda estiver aparecendo na tela", "antes que saia da sua tela").`;
    case 'DECISION_NOW':
      return `VERSÃO ${versionNumber} (Ângulo: Decisão Pessoal): Encoraje a decisão imediata e pessoal de levar o produto para casa de forma natural e sem pressão artificial ("se você decidiu garantir o seu", "faça a sua escolha").`;
    case 'OPPORTUNITY_WINDOW':
      return `VERSÃO ${versionNumber} (Ângulo: Janela de Oportunidade): Enquadre o momento atual como a oportunidade certa para conferir o modelo e concluir o pedido pelo aplicativo.`;
    case 'DONT_MISS':
      return `VERSÃO ${versionNumber} (Ângulo: Não Deixar Passar): Use uma chamada suave para não deixar para depois para evitar não encontrar o item mais tarde.`;
    case 'SOFT_URGENCY':
      return `VERSÃO ${versionNumber} (Ângulo: Ação Imediata Fluida): Conduza uma ação imediata e dinâmica no fluxo do aplicativo ("aproveite agora mesmo", "toque no carrinho laranja e garanta").`;
    default:
      return `VERSÃO ${versionNumber}: ${def?.purpose || 'Foque no fechamento com chamada ao carrinho laranja.'}`;
  }
}

/**
 * Returns formatted instructions for Scene 2 LLM prompts tailored to the assigned angle.
 */
export function getScene2AnglePromptInstruction(angle: Scene2CopyAngle, versionNumber: number): string {
  const def = SCENE2_ANGLE_DEFINITIONS[angle];
  switch (angle) {
    case 'PRACTICAL_BENEFIT':
      return `VERSÃO ${versionNumber} (Ângulo: Benefício Prático): Foque diretamente no que se torna mais fácil, rápido ou útil no dia a dia com o produto.`;
    case 'MULTI_FEATURE_VALUE':
      return `VERSÃO ${versionNumber} (Ângulo: Valor Multifuncional Integrado): Combine os recursos verificados em uma única proposta prática de valor (ex: iluminação + relógio + som).`;
    case 'ROUTINE_IMPROVEMENT':
      return `VERSÃO ${versionNumber} (Ângulo: Melhoria da Rotina): Mostre como o produto transforma a rotina cotidiana (manhãs, trabalho ou momentos de descanso).`;
    case 'SPACE_ORGANIZATION':
      return `VERSÃO ${versionNumber} (Ângulo: Organização do Espaço): Foque na comodidade, no ambiente organizado e na redução de desordem/itens soltos.`;
    case 'COMFORT_DESIRE':
      return `VERSÃO ${versionNumber} (Ângulo: Conforto e Atmosfera): Foque na sensação agradável de uso, iluminação acolhedora, bem-estar e conforto visual.`;
    case 'USE_CONTEXT':
      return `VERSÃO ${versionNumber} (Ângulo: Contexto de Uso): Insira o benefício verificado em um contexto concreto de uso (mesa de cabeceira, bancada ou mesa de trabalho).`;
    default:
      return `VERSÃO ${versionNumber}: ${def?.purpose || 'Foque na demonstração prática do benefício funcional.'}`;
  }
}
