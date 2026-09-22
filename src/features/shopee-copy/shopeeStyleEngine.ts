/**
 * SHOPEE COPY STYLE ENGINE — TONAL PERSONAS & SPOKEN VERNACULAR
 * 
 * Rules:
 * 1. Controls voice, rhythm, colloquial flow, and conversational persona only.
 * 2. MUST NOT decide or invent factual product claims.
 * 3. MUST NOT inject free shipping, coupons, flash sales, ratings, volume or scarcity by style alone.
 * 4. All commercial condition mentions REQUIRE explicit verified commercial evidence.
 */

import { ShopeeCopyStyle, ShopeeCommercialEvidence } from './types';

export interface StyleDefinition {
  style: ShopeeCopyStyle;
  label: string;
  description: string;
  toneGuidelines: string;
  spokenPhrasingTips: string[];
}

export const SHOPEE_STYLE_DEFINITIONS: Record<ShopeeCopyStyle, StyleDefinition> = {
  [ShopeeCopyStyle.AUTO]: {
    style: ShopeeCopyStyle.AUTO,
    label: 'Automático',
    description: 'A IA calibra automaticamente o tom de voz ideal para o nicho do produto.',
    toneGuidelines: 'Equilíbrio coloquial e persuasivo típico de criadores de conteúdo do dia a dia.',
    spokenPhrasingTips: [
      'Gente, olha a facilidade disso aqui...',
      'Eu fico boba como isso resolve rápido...',
      'Pra quem me perguntou como eu faço...'
    ]
  },
  [ShopeeCopyStyle.UGC_NATURAL]: {
    style: ShopeeCopyStyle.UGC_NATURAL,
    label: 'UGC Natural',
    description: 'Linguagem coloquial, descontraída e autêntica de criador de conteúdo do dia a dia.',
    toneGuidelines: 'Fale como quem grava um vídeo na sala ou quarto de casa com o celular na mão. Ritmo ágil, natural e próximo.',
    spokenPhrasingTips: [
      'Gente, olha a facilidade disso aqui...',
      'Eu fico boba como isso resolve rápido...',
      'Pra quem me perguntou como eu faço...'
    ]
  },
  [ShopeeCopyStyle.ACHADINHO_SHOPEE]: {
    style: ShopeeCopyStyle.ACHADINHO_SHOPEE,
    label: 'Achadinho Shopee',
    description: 'Tom vibrante de achadinho imperdível que vale cada centavo.',
    toneGuidelines: 'Sensação gostosa de encontrar algo útil e diferenciado navegando na Shopee. Transmita entusiasmo com moderação realista.',
    spokenPhrasingTips: [
      'Mais um achadinho incrível que salvou minha rotina...',
      'Esse é daqueles achados que a gente não larga mais...',
      'Se você ama um achado prático e útil...'
    ]
  },
  [ShopeeCopyStyle.PERSONAL_REVIEW]: {
    style: ShopeeCopyStyle.PERSONAL_REVIEW,
    label: 'Review Pessoal',
    description: 'Tom honesto de avaliação de comprador real em primeira pessoa.',
    toneGuidelines: 'Foque na impressão pessoal de quem realmente manuseou o item. Credibilidade e sinceridade sem exageros promocionais.',
    spokenPhrasingTips: [
      'Depois que comecei a usar esse item aqui...',
      'Testei na prática e fiquei muito satisfeita com o acabamento...',
      'Minha experiência sincera com esse produto foi surpreendente...'
    ]
  },
  [ShopeeCopyStyle.LIFESTYLE]: {
    style: ShopeeCopyStyle.LIFESTYLE,
    label: 'Lifestyle',
    description: 'Integração elegante e harmoniosa do produto com a casa e os hábitos.',
    toneGuidelines: 'Foco no bem-estar, na beleza discreta do ambiente e na satisfação de ter um espaço bem cuidado.',
    spokenPhrasingTips: [
      'Dá um toque tão aconchegante e organizado pro ambiente...',
      'Ele se encaixa com muita harmonia no dia a dia...',
      'Traz aquele cuidado especial que todo cantinho merece...'
    ]
  },
  [ShopeeCopyStyle.DIRECT]: {
    style: ShopeeCopyStyle.DIRECT,
    label: 'Direta',
    description: 'Comunicação limpa, assertiva e rápida, sem rodeios.',
    toneGuidelines: 'Frases diretas, sem enrolação. Mostra a função, destaca o benefício e convida à ação de forma assertiva.',
    spokenPhrasingTips: [
      'Se você quer resolver isso de forma simples e rápida...',
      'A função principal é prática e cumpre exatamente o que promete...',
      'Praticidade pura sem complicação nenhuma no uso...'
    ]
  },
  [ShopeeCopyStyle.ENTHUSIASTIC]: {
    style: ShopeeCopyStyle.ENTHUSIASTIC,
    label: 'Entusiasmada',
    description: 'Energia alta, tom contagioso e surpresa positiva genuína.',
    toneGuidelines: 'Ritmo alegre e cativante, mantendo a fala verossímil e fluida sem adjetivações forçadas.',
    spokenPhrasingTips: [
      'Eu fiquei encantada com a qualidade assim que desembalei...',
      'Olha que coisa maravilhosa de usar na rotina...',
      'Você vai se apaixonar pela praticidade desse modelo...'
    ]
  },
  [ShopeeCopyStyle.CONSULTATIVE]: {
    style: ShopeeCopyStyle.CONSULTATIVE,
    label: 'Consultiva',
    description: 'Postura de recomendação atenciosa, como um conselho de amiga.',
    toneGuidelines: 'Oriente quem está na dúvida sobre qual item escolher. Empatia, cuidado com a decisão do comprador e clareza.',
    spokenPhrasingTips: [
      'Uma dica de ouro pra quem quer organizar sem errar...',
      'Se você tá na dúvida, vale muito a pena conferir os detalhes...',
      'Recomendo prestar atenção na praticidade que ele entrega...'
    ]
  },
  [ShopeeCopyStyle.DEMONSTRATION]: {
    style: ShopeeCopyStyle.DEMONSTRATION,
    label: 'Demonstração',
    description: 'Ênfase no toque, na textura, no manuseio e no funcionamento mecânico.',
    toneGuidelines: 'Descreva a sensação palpável do uso: peso, acabamento ao toque, facilidade de montagem ou aplicação.',
    spokenPhrasingTips: [
      'O acabamento é firme ao toque e muito bem ajustado...',
      'Ao manusear você percebe na hora a firmeza da estrutura...',
      'Encaixa com suavidade e tem um uso muito intuitivo...'
    ]
  },
  [ShopeeCopyStyle.LIGHT_OFFER]: {
    style: ShopeeCopyStyle.LIGHT_OFFER,
    label: 'Oferta Leve',
    description: 'Tom sutil de conveniência de compra sem pressão comercial agressiva.',
    toneGuidelines: 'Ressalte a oportunidade de forma leve. Nada de gritaria de leilão ou desespero comercial.',
    spokenPhrasingTips: [
      'É daquelas oportunidades que valem a pena aproveitar logo...',
      'Uma condição excelente pra levar um item tão útil pra casa...',
      'Se você tava esperando o momento certo, essa é a hora...'
    ]
  }
};

export function getShopeeStyleDefinition(style: ShopeeCopyStyle): StyleDefinition {
  return SHOPEE_STYLE_DEFINITIONS[style] || SHOPEE_STYLE_DEFINITIONS[ShopeeCopyStyle.UGC_NATURAL];
}

/**
 * Generates the style instruction prompt block for prompt compilation.
 */
export function getShopeeStyleInstruction(
  style: ShopeeCopyStyle,
  evidence: ShopeeCommercialEvidence
): string {
  const def = SHOPEE_STYLE_DEFINITIONS[style] || SHOPEE_STYLE_DEFINITIONS[ShopeeCopyStyle.UGC_NATURAL];

  const evidenceSafeguards: string[] = [];
  if (!evidence.hasExplicitShipping) {
    evidenceSafeguards.push('- PROIBIDO mencionar "frete grátis" (não comprovado no produto).');
  }
  if (!evidence.hasExplicitCoupon) {
    evidenceSafeguards.push('- PROIBIDO mencionar "cupom", "cupom de desconto" ou códigos (não comprovado).');
  }
  if (!evidence.hasExplicitDiscount) {
    evidenceSafeguards.push('- PROIBIDO inventar porcentagens de desconto ou alegações de "metade do preço".');
  }
  if (!evidence.hasExplicitStockLimit) {
    evidenceSafeguards.push('- PROIBIDO inventar "últimas 3 unidades", "quase esgotado" ou escassez fictícia.');
  }
  if (!evidence.hasExplicitAuthenticity) {
    evidenceSafeguards.push('- PROIBIDO prometer "100% original", "produto original de fábrica" ou selos de autenticidade não verificados.');
  }
  if (!evidence.hasExplicitReviews) {
    evidenceSafeguards.push('- PROIBIDO inventar "5 estrelas na Shopee", "milhares de vendidos" ou avaliações não comprovadas.');
  }

  return `ESTILO E TOM DE VOZ: ${def.label.toUpperCase()}
- Diretriz de tom: ${def.toneGuidelines}
- Ritmo de fala: Linguagem falada brasileira fluida, natural e autêntica. Evite termos artificiais, tópicos soltos ou jargões de telemarketing.

SALVAGUARDAS CRÍTICAS DE ESTILO (NUNCA VIOLAR):
${evidenceSafeguards.join('\n')}
- Preço: NUNCA mencione valores em dinheiro (R$, reais, cifrões) ou parcelamentos (ex: 10x sem juros). Use apenas percepção de oportunidade natural.`;
}
