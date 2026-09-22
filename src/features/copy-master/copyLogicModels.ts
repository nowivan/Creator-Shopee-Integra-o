export type CopyLogicModelKey =
  | 'auto'
  | 'scarcity_urgency'
  | 'direct_tiktok_conversion'
  | 'curiosity_warning'
  | 'hidden_opportunity'
  | 'desire_value_decision'
  | 'ugc_natural'
  | 'premium_perception';

export interface CopyLogicModelDefinition {
  key: Exclude<CopyLogicModelKey, 'auto'>;
  label: string;
  structure: string[];
  useWhen: string;
}

export const COPY_LOGIC_MODELS: Record<Exclude<CopyLogicModelKey, 'auto'>, CopyLogicModelDefinition> = {
  scarcity_urgency: {
    key: 'scarcity_urgency',
    label: 'Escassez & Urgência',
    structure: ['Gancho', 'Retenção', 'Aviso', 'CTA'],
    useWhen: 'O produto depende de disponibilidade, estoque, momento de lançamento, oportunidade limitada, aumento de preço ou "agora é o melhor momento".'
  },
  direct_tiktok_conversion: {
    key: 'direct_tiktok_conversion',
    label: 'Conversão Direta TikTok Shop',
    structure: ['Gancho', 'Oferta', 'Prova', 'Segurança', 'CTA direto'],
    useWhen: 'O usuário fornece desconto, preço, TikTok Shop, unidades vendidas, avaliações, garantia, devolução gratuita, frete grátis, carrinho laranja ou confiança no marketplace.'
  },
  curiosity_warning: {
    key: 'curiosity_warning',
    label: 'Curiosidade + Aviso',
    structure: ['Pergunta forte', 'Crença comum', 'Quebra de expectativa', 'Aviso', 'CTA'],
    useWhen: 'A copy começa com "presta atenção", "você precisa saber", "todo mundo acha", "mas a realidade é outra", "cuidado" ou "não compre antes de ver".'
  },
  hidden_opportunity: {
    key: 'hidden_opportunity',
    label: 'Oportunidade Oculta',
    structure: ['Gancho', 'Crença comum', 'Virada estratégica', 'Janela de oportunidade', 'CTA sutil'],
    useWhen: 'A maioria dos compradores está esperando, hesitando ou perdendo uma janela de compra.'
  },
  desire_value_decision: {
    key: 'desire_value_decision',
    label: 'Desejo → Valor → Decisão',
    structure: ['Cena aspiracional', 'Valor percebido', 'Produto como consequência', 'Decisão natural', 'CTA sem pressão'],
    useWhen: 'O objetivo é fazer a venda parecer uma conclusão natural, sem pressão.'
  },
  ugc_natural: {
    key: 'ugc_natural',
    label: 'UGC Natural',
    structure: ['Fala espontânea', 'Situação real', 'Benefício percebido', 'Prova leve', 'CTA conversacional'],
    useWhen: 'O roteiro deve parecer uma recomendação real de uma pessoa comum.'
  },
  premium_perception: {
    key: 'premium_perception',
    label: 'Percepção Premium',
    structure: ['Experiência', 'Detalhe refinado', 'Prova de valor', 'Condição/oportunidade', 'CTA elegante'],
    useWhen: 'O produto precisa de um tom mais refinado e de alto valor.'
  }
};

export interface DetectionInput {
  product?: string;
  description?: string;
  price?: string;
  discount?: string;
  benefits?: string;
  notes?: string;
  platform?: string;
  guarantee?: string;
  urgency?: string;
  targetAudience?: string;
  referenceScript?: string;
}

export interface DetectionResult {
  model: Exclude<CopyLogicModelKey, 'auto'>;
  label: string;
  confidence: number;
  reason: string;
  detected_signals: string[];
}

export function detectCopyLogicModel(input: DetectionInput | string): DetectionResult {
  let combinedText = "";
  if (typeof input === "string") {
    combinedText = input.toLowerCase();
  } else {
    combinedText = [
      input.product,
      input.description,
      input.price,
      input.discount,
      input.benefits,
      input.notes,
      input.platform,
      input.guarantee,
      input.urgency,
      input.targetAudience,
      input.referenceScript
    ].filter(Boolean).join(" ").toLowerCase();
  }

  const signalsScarcity = [
    "estoque", "limitado", "disponível", "disponivel", "acabando", "lançamento", "lancamento",
    "agora é o melhor momento", "agora e o melhor momento", "difícil de encontrar", "dificil de encontrar",
    "unidades novas", "oportunidade", "últimas unidades", "ultimas unidades", "esperando", "chegada"
  ];

  const signalsDirectTiktok = [
    "desconto", "r$", "a partir de", "unidades vendidas", "avaliações", "avaliacoes",
    "garantia", "devolução gratuita", "devolucao gratuita", "frete grátis", "frete gratis",
    "tiktok shop", "carrinho laranja", "proteção", "protecao", "sacola"
  ];

  const signalsCuriosityWarning = [
    "todo mundo acha", "muita gente espera", "mas na prática", "mas na pratica",
    "acontece o contrário", "acontece o contrario", "realidade é outra", "realidade e outra",
    "presta atenção", "presta atencao", "você precisa saber", "voce precisa saber",
    "cuidado", "não compre antes de ver", "nao compre antes de ver"
  ];

  const signalsPremium = [
    "elegante", "premium", "sofisticado", "acabamento", "presença", "presenca",
    "status", "luxo", "refinado", "exclusivo"
  ];

  const matchedScarcity = signalsScarcity.filter(s => combinedText.includes(s));
  const matchedDirectTiktok = signalsDirectTiktok.filter(s => combinedText.includes(s));
  const matchedCuriosity = signalsCuriosityWarning.filter(s => combinedText.includes(s));
  const matchedPremium = signalsPremium.filter(s => combinedText.includes(s));

  const scores = [
    { model: 'direct_tiktok_conversion' as const, count: matchedDirectTiktok.length * 1.2, signals: matchedDirectTiktok },
    { model: 'scarcity_urgency' as const, count: matchedScarcity.length, signals: matchedScarcity },
    { model: 'curiosity_warning' as const, count: matchedCuriosity.length, signals: matchedCuriosity },
    { model: 'premium_perception' as const, count: matchedPremium.length, signals: matchedPremium },
  ];

  scores.sort((a, b) => b.count - a.count);

  if (scores[0].count > 0) {
    const top = scores[0];
    const def = COPY_LOGIC_MODELS[top.model];
    return {
      model: top.model,
      label: def.label,
      confidence: Math.min(98, Math.round(70 + top.count * 8)),
      reason: `Sinais detectados para ${def.label}: ${top.signals.slice(0, 4).join(", ")}`,
      detected_signals: top.signals
    };
  }

  const defaultDef = COPY_LOGIC_MODELS.direct_tiktok_conversion;
  return {
    model: 'direct_tiktok_conversion',
    label: defaultDef.label,
    confidence: 75,
    reason: "Padrão de conversão direta selecionado com base nos campos preenchidos.",
    detected_signals: ["produto", "conversao"]
  };
}
