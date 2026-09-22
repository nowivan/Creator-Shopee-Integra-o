/**
 * SHOPEE COPY STRUCTURE ENGINE — FORMAL RHETORICAL ANATOMY
 * 
 * Rules:
 * 1. Governs Scene 2 (demonstration/benefit) and Scene 3 (closing/CTA) narrative architecture.
 * 2. Enforces the strict 160–175 character contract (targeting 168–172 chars).
 * 3. MUST NOT contain platform style language, slang, or tonal personas (delegated to ShopeeStyleEngine).
 * 4. MUST NOT invent commercial evidence or claims.
 */

import {
  ShopeeCopyStructure,
  ShopeeCommercialEvidence,
  SHOPEE_MIN_CHARS,
  SHOPEE_MAX_CHARS,
  SHOPEE_SWEET_SPOT_MIN,
  SHOPEE_SWEET_SPOT_MAX
} from './types';

export interface StructureDefinition {
  structure: ShopeeCopyStructure;
  label: string;
  description: string;
  scene2Focus: string;
  scene3Focus: string;
}

export const SHOPEE_STRUCTURE_DEFINITIONS: Record<ShopeeCopyStructure, StructureDefinition> = {
  [ShopeeCopyStructure.AUTO]: {
    structure: ShopeeCopyStructure.AUTO,
    label: 'Automático',
    description: 'Prioriza o padrão nativo Shopee Native Creator: Produto em Uso → Diferencial → Benefício Prático → Opinião Pessoal → CTA Nativo.',
    scene2Focus: 'Demonstrar prova física visível do benefício falado, utilidade prática imediata e manuseio no dia a dia.',
    scene3Focus: 'Aversão à perda de condição de compra, incentivo à ação e chamada de fechamento com CTA nativo.'
  },
  [ShopeeCopyStructure.PRODUCT_IN_USE]: {
    structure: ShopeeCopyStructure.PRODUCT_IN_USE,
    label: 'Produto em Uso',
    description: 'Demonstração funcional do produto em ação no cotidiano.',
    scene2Focus: 'Demonstrar manuseio ativo e prova física visível do benefício falado em ação no cotidiano.',
    scene3Focus: 'Aversão à perda de condição de compra, incentivo à ação e chamada de fechamento com CTA nativo.'
  },
  [ShopeeCopyStructure.ACHADINHO_DISCOVERY]: {
    structure: ShopeeCopyStructure.ACHADINHO_DISCOVERY,
    label: 'Achadinho',
    description: 'Revelação de um item surpreendente e inteligente para facilitar a vida.',
    scene2Focus: 'Apresentar a descoberta do item, destacando a função inteligente e a utilidade prática imediata.',
    scene3Focus: 'Risco de deixar para depois, conveniência da aquisição e convite claro para agir.'
  },
  [ShopeeCopyStructure.PROBLEM_SOLUTION]: {
    structure: ShopeeCopyStructure.PROBLEM_SOLUTION,
    label: 'Problema → Solução',
    description: 'Apresentação de uma dor comum do dia a dia e resolução instantânea.',
    scene2Focus: 'Identificar a dificuldade comum e mostrar como o produto elimina o incômodo com eficácia.',
    scene3Focus: 'Alívio garantido na rotina diária, incentivo à tomada de decisão e CTA direto.'
  },
  [ShopeeCopyStructure.FEATURE_TO_BENEFIT]: {
    structure: ShopeeCopyStructure.FEATURE_TO_BENEFIT,
    label: 'Diferencial → Benefício',
    description: 'Tradução de diferenciais e especificações físicas em vantagens tangíveis para o comprador.',
    scene2Focus: 'Conectar diretamente cada detalhe técnico a um ganho palpável de tempo, conforto ou praticidade.',
    scene3Focus: 'Oportunidade de garantir essa qualidade e direcionamento objetivo para o fechamento.'
  },
  [ShopeeCopyStructure.PERSONAL_REVIEW]: {
    structure: ShopeeCopyStructure.PERSONAL_REVIEW,
    label: 'Review Pessoal',
    description: 'Relato de quem testou e aprovou a usabilidade real.',
    scene2Focus: 'Compartilhar a experiência prática sincera de uso contínuo e a impressão positiva na rotina.',
    scene3Focus: 'Recomendação convicta para quem busca o mesmo resultado e chamada de ação segura.'
  },
  [ShopeeCopyStructure.BEFORE_AFTER]: {
    structure: ShopeeCopyStructure.BEFORE_AFTER,
    label: 'Antes → Depois',
    description: 'Contraste nítido entre a rotina anterior e a facilidade atual.',
    scene2Focus: 'Evidenciar o salto de praticidade e organização proporcionado pelo produto em comparação ao hábito anterior.',
    scene3Focus: 'Sensação de rotina transformada, estímulo a aproveitar o momento e CTA decisivo.'
  },
  [ShopeeCopyStructure.WORTH_IT]: {
    structure: ShopeeCopyStructure.WORTH_IT,
    label: 'Vale a Pena?',
    description: 'Percepção de alto valor agregado sem menção de valores numéricos de preço.',
    scene2Focus: 'Ressaltar como a entrega de valor supera expectativas e compensa cada momento de uso.',
    scene3Focus: 'Ancoragem perceptiva de excelente oportunidade e incentivo para garantir a sua unidade.'
  },
  [ShopeeCopyStructure.OFFER_OPPORTUNITY]: {
    structure: ShopeeCopyStructure.OFFER_OPPORTUNITY,
    label: 'Oferta',
    description: 'Foco na janela favorável de compra com base estrita em evidências.',
    scene2Focus: 'Mostrar a funcionalidade indispensável que torna o produto atrativo no momento presente.',
    scene3Focus: 'Urgência embasada nas evidências disponíveis, cautela para não perder o lote e CTA objetivo.'
  },
  [ShopeeCopyStructure.GIFT_OCCASION]: {
    structure: ShopeeCopyStructure.GIFT_OCCASION,
    label: 'Presente / Ocasião',
    description: 'Posicionamento do produto como escolha assertiva para surpreender ou presentear.',
    scene2Focus: 'Demonstrar o apelo de utilidade, bom gosto e versatilidade como escolha para presentear.',
    scene3Focus: 'Facilidade de escolha, tranquilidade na entrega e chamado para conferir o item.'
  },
  [ShopeeCopyStructure.ORGANIZATION_PRACTICALITY]: {
    structure: ShopeeCopyStructure.ORGANIZATION_PRACTICALITY,
    label: 'Organização / Praticidade',
    description: 'Transformação de ambientes e rotinas com ordem e espaço aproveitado.',
    scene2Focus: 'Exibir a otimização de espaço, o alinhamento visual do ambiente e o ganho em funcionalidade.',
    scene3Focus: 'Desejo de manter o espaço impecável, lembrete para não adiar e CTA direcionado.'
  }
};

export function getShopeeStructureDefinition(structure: ShopeeCopyStructure): StructureDefinition {
  return SHOPEE_STRUCTURE_DEFINITIONS[structure] || SHOPEE_STRUCTURE_DEFINITIONS[ShopeeCopyStructure.PRODUCT_IN_USE];
}

/**
 * Returns structural instructions for prompt compilation.
 */
export function getShopeeStructureInstruction(
  structure: ShopeeCopyStructure,
  evidence: ShopeeCommercialEvidence
): string {
  const def = SHOPEE_STRUCTURE_DEFINITIONS[structure] || SHOPEE_STRUCTURE_DEFINITIONS[ShopeeCopyStructure.PRODUCT_IN_USE];

  let urgencyClue = 'Se não houver prazo ou estoque confirmado na imagem, use urgência condicional cautelosa ("enquanto ainda estiver disponível", "antes que essa condição mude").';
  if (evidence.hasExplicitDeadline) {
    urgencyClue = 'Prazo/oferta comprovada: mencione a brevidade da condição com base na evidência factual observável.';
  } else if (evidence.hasExplicitStockLimit) {
    urgencyClue = 'Estoque limitado comprovado: mencione a disponibilidade restrita confirmada sem inventar números.';
  }

  const nativeCreatorSection = structure === ShopeeCopyStructure.AUTO
    ? `
PADRÃO PRIORITÁRIO SHOPEE NATIVE CREATOR (DIRETRIZ OFICIAL):
Para máxima retenção e conversão orgânica nativa da Shopee, priorize o encadeamento:
1. Produto em Uso (Product in Use)
2. Demonstração do Diferencial (Feature Demonstration)
3. Benefício Prático (Practical Benefit)
4. Opinião / Percepção Pessoal (Personal Opinion)
5. CTA Nativo Shopee (Native Shopee CTA)

Distribuir as 6 versões geradas preferencialmente entre as estruturas nativas comprovadas da Shopee:
- PRODUTO EM USO: manuseio ativo, visual claro do produto em ação no cotidiano
- DIFERENCIAL → BENEFÍCIO: conexão direta entre a característica visível e a vantagem real
- REVIEW PESSOAL: validação sincera da usabilidade e percepção autêntica de quem usa
`
    : '';

  return `ARQUITETURA ESTRUTURAL DA COPY (${def.label.toUpperCase()}):
${nativeCreatorSection}
CENA 2 — ESTRUTURA DE DEMONSTRAÇÃO E BENEFÍCIO (160 A 175 CARACTERES):
- Foco estrutural: ${def.scene2Focus}
- Prova física prioritária: Priorizar prova física visível do benefício falado (exibir no vídeo o resultado concreto que comprova a utilidade dita).
- Papel retórico: Conectar fatos visíveis do produto a um resultado sensorial ou prático direto no cotidiano.
- Regra rígida: A CENA 2 NUNCA contém CTA, chamada para ação, menção a links ou indicações de compra.
- Limite: Exatamente entre ${SHOPEE_MIN_CHARS} e ${SHOPEE_MAX_CHARS} caracteres (alvo: ${SHOPEE_SWEET_SPOT_MIN}–${SHOPEE_SWEET_SPOT_MAX}).

CENA 3 — ESTRUTURA DE FECHAMENTO E CONVERSÃO (160 A 175 CARACTERES):
- Foco estrutural: ${def.scene3Focus}
- Urgência embasada: ${urgencyClue}
- Papel retórico: Fechar o argumento com aversão à perda e conduzir diretamente ao CTA permitido.
- Regra rígida: A CENA 3 SEMPRE deve conter um CTA claro e explícito da família permitida.
- Limite: Exatamente entre ${SHOPEE_MIN_CHARS} e ${SHOPEE_MAX_CHARS} caracteres (alvo: ${SHOPEE_SWEET_SPOT_MIN}–${SHOPEE_SWEET_SPOT_MAX}).`;
}
