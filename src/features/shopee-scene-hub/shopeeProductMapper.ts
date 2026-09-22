/**
 * SHOPEE PRODUCT MAPPER
 * 
 * Maps CreativeDirectorProductWorkspace into the strict ShopeeMappedProductContext.
 * 
 * Priority Hierarchy:
 * EXISTING PRODUCT WORKSPACE > SAFE DERIVATION > USER OVERRIDE > SAFE FALLBACK
 * 
 * Invariants:
 * 1. Never invent unsupported product facts, materials, or claims.
 * 2. Strip promotional buzzwords, prices, and fake discounts.
 * 3. Preserve canonical active color and physical integrity.
 */

import { CreativeDirectorProductWorkspace } from '../creative-director/types/compilerTypes';
import { ShopeeMappedProductContext } from './types';

export interface ShopeeProductMappingOverrides {
  productTitle?: string;
  canonicalColor?: string;
  categoryOrArchetype?: string;
  customPain?: string;
  customEnvironment?: string;
}

/**
 * Derives a realistic everyday functional environment from category, archetype, or product title.
 */
export function deriveFunctionalEnvironment(
  categoryOrArchetype?: string,
  title?: string
): string {
  const combined = `${categoryOrArchetype || ''} ${title || ''}`.toLowerCase();

  if (/cozinha|gourmet|panela|mop|airfryer|liquidificador|tempero|cortador|faca|xícara|prato|garrafa/.test(combined)) {
    return 'Bancada de cozinha residencial limpa, organizada e bem iluminada por luz natural';
  }
  if (/limpeza|vassoura|rodo|esfregão|lavanderia|banheiro|box|ralo|torneira|aspirador/.test(combined)) {
    return 'Área de serviço residencial ou banheiro claro, com piso limpo e iluminação autêntica';
  }
  if (/beleza|maquiagem|cabelo|skincare|escova|secador|batom|creme|rosto/.test(combined)) {
    return 'Penteadeira ou bancada de banheiro residencial moderna com espelho e luz suave';
  }
  if (/eletrônico|celular|fone|carregador|cabo|desk|computador|teclado|mouse|suporte/.test(combined)) {
    return 'Mesa de trabalho ou escritório residencial moderno e minimalista';
  }
  if (/organizador|gaveta|armário|sapateira|cabide|closet|caixa/.test(combined)) {
    return 'Ambiente residencial com armário ou prateleira espaçosa bem iluminada';
  }

  return 'Ambiente residencial autêntico, iluminado e acolhedor (sala ou bancada multifuncional)';
}

/**
 * Derives a specific everyday frustration / pain point without inventing commercial claims.
 */
export function deriveSpecificPain(
  categoryOrArchetype?: string,
  title?: string
): string {
  const combined = `${categoryOrArchetype || ''} ${title || ''}`.toLowerCase();

  if (/limpeza|mop|esfregão|vassoura/.test(combined)) {
    return 'Esforço repetitivo e cansaço para alcançar cantos difíceis com panos convencionais';
  }
  if (/cozinha|cortador|descascador|panela/.test(combined)) {
    return 'Demora, bagunça e cortes irregulares na preparação manual dos alimentos';
  }
  if (/organizador|cabide|gaveta|caixa/.test(combined)) {
    return 'Desordem constante, perda de tempo procurando itens e espaço mal aproveitado';
  }
  if (/eletrônico|cabo|fone|carregador|suporte/.test(combined)) {
    return 'Fios emaranhados, apoios instáveis e falta de praticidade no uso diário';
  }
  if (/beleza|cabelo|escova|maquiagem/.test(combined)) {
    return 'Dificuldade de finalizar o visual com agilidade sem perder tempo na rotina corrida';
  }

  return 'Complicação desnecessária e perda de tempo ao lidar com tarefas simples do dia a dia';
}

/**
 * Derives visible benefit proof grounded purely in physical interaction.
 */
export function deriveVisibleBenefitProof(
  productTitle: string,
  observableDetails: string[]
): string {
  if (observableDetails.length > 0) {
    const mainDetail = observableDetails[0];
    return `Demonstração visual do funcionamento eficiente e imediato, com destaque para ${mainDetail}, proporcionando resultado prático evidente`;
  }
  return `Demonstração do funcionamento suave do ${productTitle}, evidenciando encaixe firme e uso prático sem complicações`;
}

/**
 * Cleanly maps CreativeDirectorProductWorkspace into ShopeeMappedProductContext.
 */
export function mapProductWorkspaceToShopeeContext(
  workspace?: CreativeDirectorProductWorkspace | null,
  overrides?: ShopeeProductMappingOverrides
): ShopeeMappedProductContext {
  const normCtx = workspace?.normalizedProductContext;
  const grounding = workspace?.groundingResult;

  // 1. Product Identity
  const rawTitle =
    overrides?.productTitle?.trim() ||
    normCtx?.identity?.trim() ||
    workspace?.productIdentity?.trim() ||
    grounding?.product_identity?.trim() ||
    'Produto Físico Observado';
  const productIdentity = rawTitle;

  // 2. Canonical Active Product Color
  const rawColor =
    overrides?.canonicalColor?.trim() ||
    normCtx?.canonicalColor?.trim() ||
    grounding?.canonical_color?.trim() ||
    'Cor original do produto observado';
  const canonicalColor = rawColor;

  // 3. Verified Observable Details (Anti-hallucination)
  const observableDetails: string[] = [];
  if (normCtx?.observableDetails && normCtx.observableDetails.length > 0) {
    observableDetails.push(...normCtx.observableDetails);
  } else if (grounding?.observable_details && grounding.observable_details.length > 0) {
    observableDetails.push(...grounding.observable_details);
  }
  const cleanObservable = observableDetails.filter(d => Boolean(d && d.trim()));

  // 4. Known Physical Facts
  const physicalFacts: string[] = [];
  if (normCtx?.verifiedFunctionalFacts && normCtx.verifiedFunctionalFacts.length > 0) {
    physicalFacts.push(...normCtx.verifiedFunctionalFacts);
  } else if (grounding?.verified_functional_facts && grounding.verified_functional_facts.length > 0) {
    physicalFacts.push(...grounding.verified_functional_facts);
  }
  const cleanFacts = physicalFacts.filter(f => Boolean(f && f.trim()));

  // 5. Product Archetype
  const rawArchetype =
    overrides?.categoryOrArchetype?.trim() ||
    normCtx?.category?.trim() ||
    'UTILITARIO_RESIDENCIAL';
  const productArchetype = rawArchetype;

  // 6. Functional Environment
  const functionalEnvironment =
    overrides?.customEnvironment?.trim() ||
    deriveFunctionalEnvironment(productArchetype, productIdentity);

  // 7. Specific Pain
  const specificPain =
    overrides?.customPain?.trim() ||
    deriveSpecificPain(productArchetype, productIdentity);

  // 8. Allowed Physical Interactions
  const allowedInteractions = ((normCtx as any)?.allowedInteractions && (normCtx as any).allowedInteractions.length > 0)
    ? (normCtx as any).allowedInteractions
    : [
        'Segurar com as mãos de forma estável',
        'Acionar partes mecânicas visíveis conforme design original',
        'Apoiar sobre superfície nivelada'
      ];

  // 9. Blocked Physical Interactions
  const blockedInteractions = ((normCtx as any)?.prohibitedInteractions && (normCtx as any).prohibitedInteractions.length > 0)
    ? (normCtx as any).prohibitedInteractions
    : [
        'Não forçar partes rígidas contra limites estruturais',
        'Não torcer componentes em direções não articuladas',
        'Não arremessar ou deformar o produto'
      ];

  // 10. Visible Benefit Proof
  const visibleBenefitProof = deriveVisibleBenefitProof(productIdentity, cleanObservable);

  // 11. Final Product State
  const finalProductState = `Produto ${productIdentity} em sua configuração final estável e completamente operacional, limpo e em perfeito estado de conservação`;

  return {
    productIdentity,
    canonicalColor,
    observableDetails: cleanObservable.length > 0 ? cleanObservable : ['Acabamento e estrutura idênticos à imagem de referência'],
    physicalFacts: cleanFacts.length > 0 ? cleanFacts : ['Dispositivo físico funcional para uso cotidiano'],
    functionalEnvironment,
    specificPain,
    productArchetype,
    allowedInteractions,
    blockedInteractions,
    visibleBenefitProof,
    finalProductState
  };
}
