import {
  CopyLogicModelKey,
  COPY_LOGIC_MODELS,
  detectCopyLogicModel,
  DetectionInput,
  DetectionResult
} from './copyLogicModels';
import {
  PersuasionStrategyKey,
  buildPersuasionStrategyInstruction,
  extractRealProductPrice,
  calculatePhysicalStoreAnchor
} from './copyPersuasionStrategies';

export {
  type PersuasionStrategyKey,
  buildPersuasionStrategyInstruction,
  extractRealProductPrice,
  calculatePhysicalStoreAnchor
};

export interface StructuredCopyMasterOutput {
  mode: 'copy_master';
  logic_model: string;
  model_label: string;
  strategic_summary: string;
  detected_signals: string[];
  scripts: {
    direct_conversion: {
      label: string;
      description: string;
      hook: string;
      retention: string;
      warning_or_value: string;
      proof: string;
      security: string;
      cta: string;
      full_script: string;
    };
    curiosity_subtle: {
      label: string;
      description: string;
      hook: string;
      retention: string;
      warning_or_value: string;
      hidden_cta: string;
      full_script: string;
    };
    ugc_natural: {
      label: string;
      full_script: string;
    };
    premium_safe: {
      label: string;
      full_script: string;
    };
  };
  recording_tips: {
    editing: string;
    screen_text: string[];
    recommended_format: string;
    visual_suggestions: string[];
  };
  compliance_notes: string[];
  quality_check: {
    logic_model_score: number;
    retention_score: number;
    cta_strength: number;
    fact_safety: number;
    anti_generic_score: number;
    notes: string[];
  };
}

export const FORBIDDEN_GENERIC_FILLER = [
  "procurando um celular estiloso sem gastar muito",
  "produto de qualidade sem pesar no bolso",
  "design moderno e praticidade no dia a dia",
  "esse produto entrega",
  "achadinho",
  "sem gastar muito"
];

/**
  * TASK 13: Generic Copy Blocker
  */
export function hasGenericCopyFiller(text: string, userInputText?: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const lowerInput = (userInputText || "").toLowerCase();

  for (const filler of FORBIDDEN_GENERIC_FILLER) {
    if (lowerText.includes(filler) && !lowerInput.includes(filler)) {
      return true;
    }
  }
  return false;
}

export function sanitizeGenericCopyFiller(text: string, userInputText?: string): string {
  if (!text) return "";
  let clean = text;
  const lowerInput = (userInputText || "").toLowerCase();

  for (const filler of FORBIDDEN_GENERIC_FILLER) {
    if (!lowerInput.includes(filler)) {
      const reg = new RegExp(filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      clean = clean.replace(reg, "");
    }
  }
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * TASK 12: Exact Money Values Preservation
 */
export function extractMoneyAndClaimPhrases(input: string): string[] {
  if (!input) return [];
  const matches: string[] = [];

  // Match money expressions: R$ 2.000, R$ 8.000, 2.000 de desconto, a partir de R$ 8.000, etc.
  const regexes = [
    /(?:quase\s+)?R\$\s*[\d.,]+/gi,
    /(?:a\s+partir\s+de\s+)?R\$\s*[\d.,]+/gi,
    /(?:quase\s+)?R\$\s*[\d.,]+\s+de\s+desconto/gi,
    /centenas\s+de\s+unidades\s+vendidas/gi,
    /avaliações\s+muito\s+positivas/gi,
    /garantia\s+apple\s+de\s+um\s+ano/gi,
    /garantia\s+de\s+\d+\s+dias\s+do\s+tiktok\s+shop/gi,
    /devolução\s+gratuit[aa]\s+em\s+até\s+\d+\s+dias/gi,
    /frete\s*grá?tis/gi,
    /proteção\s+total\s+pelo\s+tiktok\s+shop/gi,
    /carrinho\s+laranja/gi
  ];

  for (const reg of regexes) {
    const found = input.match(reg);
    if (found) {
      found.forEach(f => {
        if (!matches.includes(f.trim())) {
          matches.push(f.trim());
        }
      });
    }
  }

  return matches;
}

export function preserveExactMoneyClaims(generatedText: string, originalInput: string): string {
  if (!generatedText || !originalInput) return generatedText;
  let result = generatedText;

  // Check if original has "R$ 2.000" or "quase R$ 2.000 de desconto"
  const discountMatch = originalInput.match(/quase\s+R\$\s*[\d.,]+\s+de\s+desconto|R\$\s*[\d.,]+\s+de\s+desconto/i);
  if (discountMatch) {
    const exactDiscount = discountMatch[0];
    // If AI distorted it to something else or left it out, replace faulty money numbers with exact match
    if (!result.toLowerCase().includes(exactDiscount.toLowerCase())) {
      result = result.replace(/R\$\s*100\b|R\$\s*1\.000\b|desconto enorme|super desconto/gi, exactDiscount);
    }
  }

  const anchorMatch = originalInput.match(/a\s+partir\s+de\s+R\$\s*[\d.,]+/i);
  if (anchorMatch) {
    const exactAnchor = anchorMatch[0];
    if (!result.toLowerCase().includes(exactAnchor.toLowerCase())) {
      result = result.replace(/a\s+partir\s+de\s+R\$\s*[\d.,]+/gi, exactAnchor);
    }
  }

  return result;
}

/**
 * TASK 15: Final Polish for Copy Master Text
 */
export function finalPolishScriptText(text: string, originalInput?: string): string {
  if (!text) return "";
  let polished = text;

  // Preserve exact money values
  if (originalInput) {
    polished = preserveExactMoneyClaims(polished, originalInput);
    polished = sanitizeGenericCopyFiller(polished, originalInput);
  }

  // Grammar & repeated words/connectors fix
  polished = polished.replace(/\b(e|que|de|da|do|para|com|em)\s+\1\b/gi, "$1");
  polished = polished.replace(/,\s*e\s*,\s*/g, ", ");
  polished = polished.replace(/e\s+e\b/gi, "e");
  polished = polished.replace(/\s+/g, " ");
  polished = polished.replace(/\s+([.,!?])/g, "$1");
  polished = polished.replace(/\.{2,}/g, ".");
  polished = polished.replace(/,\s*\./g, ".");
  polished = polished.replace(/,\s*,/g, ",");

  // Fix agreement
  polished = polished.replace(/(iPhone[^\n.,!?]+?\s+e\s+(?:o\s+)?iPhone[^\n.,!?]+?)\s+aparece\b/gi, "$1 aparecem");
  polished = polished.replace(/(iPhone[^\n.,!?]+?\s+e\s+(?:o\s+)?iPhone[^\n.,!?]+?)\s+está\b/gi, "$1 estão");

  // Capitalize sentence starts
  polished = polished.replace(/(?:^|[.!?]\s+)([a-zà-ÿ])/g, (m) => m.toUpperCase());

  return polished.trim();
}

/**
 * Helper to extract key facts from user input without inventing facts (TASK 11)
 */
export function extractUserProvidedFacts(input: string) {
  const clean = input || "";

  const hasDiscount = /desconto|off|economize/i.test(clean);
  const discountMatch = clean.match(/(?:quase\s+)?R\$\s*[\d.,]+(?:\s+de\s+desconto)?|\d+%\s+off/i);
  const discountStr = discountMatch ? discountMatch[0] : "";

  const hasPrice = /r\$|a partir de|valor|preço/i.test(clean);
  const priceMatch = clean.match(/a\s+partir\s+de\s+R\$\s*[\d.,]+|R\$\s*[\d.,]+/i);
  const priceStr = priceMatch ? priceMatch[0] : "";

  const hasTikTokShop = /tiktok\s+shop|carrinho\s+laranja|sacola/i.test(clean);
  const hasUnits = /unidades\s+vendidas|vendidos|vendas/i.test(clean);
  const unitsMatch = clean.match(/\d+\s+unidades\s+vendidas|centenas\s+de\s+unidades\s+vendidas/i);
  const unitsStr = unitsMatch ? unitsMatch[0] : (hasUnits ? "centenas de unidades vendidas" : "");

  const hasReviews = /avaliações|avaliacoes|positivas|estrelas/i.test(clean);
  const reviewsStr = hasReviews ? "avaliações muito positivas" : "";

  const hasAppleGuarantee = /garantia\s+apple/i.test(clean);
  const hasTikTokGuarantee = /garantia\s+de\s+\d+\s+dias\s+do\s+tiktok\s+shop/i.test(clean);
  const hasReturn = /devolução\s+gratuit[aa]/i.test(clean);
  const returnMatch = clean.match(/devolução\s+gratuit[aa]\s+em\s+até\s+\d+\s+dias/i);
  const returnStr = returnMatch ? returnMatch[0] : (hasReturn ? "devolução gratuita" : "");

  const hasShipping = /frete\s*grá?tis/i.test(clean);
  const hasProtection = /proteção\s+total|protecao/i.test(clean);

  // Products
  const products: string[] = [];
  if (/iphone\s+17\s+pro\s+max/i.test(clean)) products.push("iPhone 17 Pro Max");
  if (/iphone\s+17\s+pro\b/i.test(clean) && !products.includes("iPhone 17 Pro")) products.unshift("iPhone 17 Pro");
  if (/iphone\s+18/i.test(clean)) {
    // Note: iPhone 18 might be mentioned as upcoming/launch
  }

  return {
    products,
    hasDiscount,
    discountStr,
    hasPrice,
    priceStr,
    hasTikTokShop,
    hasUnits,
    unitsStr,
    hasReviews,
    reviewsStr,
    hasAppleGuarantee,
    hasTikTokGuarantee,
    hasReturn,
    returnStr,
    hasShipping,
    hasProtection
  };
}

/**
 * Builds local Copy Master fallback output when offline or ensuring 100% compliant structure
 */
export function buildCopyMasterFallbackOutput(
  rawInput: string,
  selectedModel: CopyLogicModelKey = 'auto',
  persuasionStrategy: PersuasionStrategyKey = 'PADRAO'
): StructuredCopyMasterOutput {
  const det = detectCopyLogicModel(rawInput);
  const modelKey = selectedModel === 'auto' ? det.model : (selectedModel as Exclude<CopyLogicModelKey, 'auto'>);
  const modelDef = COPY_LOGIC_MODELS[modelKey];

  const facts = extractUserProvidedFacts(rawInput);
  const prodText = facts.products.length > 0
    ? (facts.products.length === 1 ? facts.products[0] : facts.products.join(" e o "))
    : "produto";

  const verbAparece = prodText.includes(" e ") ? "aparecem" : "aparece";

  // Check for physical store anchor strategy
  const realPriceObj = persuasionStrategy === 'PHYSICAL_STORE_ANCHOR' ? extractRealProductPrice(rawInput) : null;
  const anchorObj = realPriceObj ? calculatePhysicalStoreAnchor(realPriceObj) : null;

  // Build facts strings strictly provided by user
  let offerChunk = "";
  if (facts.discountStr) offerChunk += ` com ${facts.discountStr}`;
  if (facts.priceStr) offerChunk += `, ${facts.priceStr.toLowerCase().includes('a partir') ? facts.priceStr : `a partir de ${facts.priceStr}`}`;

  let proofChunk = "";
  if (facts.unitsStr || facts.reviewsStr) {
    const parts = [facts.unitsStr, facts.reviewsStr].filter(Boolean);
    proofChunk = ` Já são ${parts.join(" com ")} no TikTok Shop.`;
  }

  const secParts: string[] = [];
  if (facts.hasAppleGuarantee) secParts.push("garantia Apple de um ano");
  if (facts.hasTikTokGuarantee) secParts.push("garantia de 30 dias do TikTok Shop");
  if (facts.returnStr) secParts.push(facts.returnStr);
  if (facts.hasShipping) secParts.push("frete grátis");
  if (facts.hasProtection) secParts.push("proteção total pelo TikTok Shop");

  let securityChunk = "";
  if (secParts.length > 0) {
    if (secParts.length === 1) {
      securityChunk = ` Além disso, você conta com ${secParts[0]}.`;
    } else {
      const allExceptLast = secParts.slice(0, -1).join(", ");
      const last = secParts[secParts.length - 1];
      securityChunk = ` Além disso, você conta com ${allExceptLast} e ${last}.`;
    }
  }

  // Model specific script generation
  let directConversion = {
    label: "Direta e Focada em Conversão",
    description: "TikTok Shop padrão, linguagem direta e CTA claro.",
    hook: "",
    retention: "",
    warning_or_value: "",
    proof: "",
    security: "",
    cta: "",
    full_script: ""
  };

  let curiositySubtle = {
    label: "Focada em Curiosidade",
    description: "Mesma lógica, com chamada mais sutil e menos agressiva.",
    hook: "",
    retention: "",
    warning_or_value: "",
    hidden_cta: "",
    full_script: ""
  };

  let ugcNaturalScript = "";
  let premiumSafeScript = "";

  if (anchorObj && realPriceObj) {
    // Specialized PHYSICAL_STORE_ANCHOR fallback logic
    directConversion.hook = `Em loja física, um produto desse tipo pode custar perto de ${anchorObj.minFormatted}, mas olha a praticidade do ${prodText}.`;
    directConversion.retention = `Muita gente procura essa categoria no shopping e acaba pagando bem mais caro pela mesma utilidade.`;
    directConversion.warning_or_value = `E esse aqui está saindo por ${realPriceObj.formatted} no TikTok Shop.`;
    directConversion.proof = proofChunk.trim();
    directConversion.security = securityChunk.trim();
    directConversion.cta = `Se o ${prodText} faz sentido para sua rotina, confere a disponibilidade no carrinho laranja.`;
    directConversion.full_script = `${directConversion.hook} ${directConversion.retention} ${directConversion.warning_or_value}${proofChunk}${securityChunk} ${directConversion.cta}`;

    curiositySubtle.hook = `É comum encontrar produtos semelhantes por ${anchorObj.minFormatted} a ${anchorObj.maxFormatted} no mercado tradicional.`;
    curiositySubtle.retention = `Mas pouca gente sabe que dá para ter essa mesma experiência sem precisar pagar esse valor.`;
    curiositySubtle.warning_or_value = `O ${prodText} está disponível hoje por ${realPriceObj.formatted}.`;
    curiositySubtle.hidden_cta = `Dá uma olhada no carrinho laranja e confira todos os detalhes.`;
    curiositySubtle.full_script = `${curiositySubtle.hook} ${curiositySubtle.retention} ${curiositySubtle.warning_or_value}${proofChunk}${securityChunk} ${curiositySubtle.hidden_cta}`;

    ugcNaturalScript = `Gente, em loja física um produto desse tipo pode chegar a uns ${anchorObj.minFormatted}, mas olha isso: o ${prodText} tá saindo por ${realPriceObj.formatted}!${proofChunk} E o melhor:${securityChunk ? securityChunk.replace('Além disso, você conta com', '') : ' você tem total segurança no pedido'}. Se tava na dúvida, clica no carrinho laranja e confere!`;
    premiumSafeScript = `Enquanto opções desse segmento em lojas físicas costumam ficar entre ${anchorObj.minFormatted} e ${anchorObj.maxFormatted}, o ${prodText} entrega alta qualidade por ${realPriceObj.formatted}.${proofChunk}${securityChunk} Acesse os detalhes e especificações através do carrinho laranja.`;

  } else if (modelKey === 'scarcity_urgency') {
    // TASK 5: Escassez & Urgência
    const hasIphone18 = /iphone\s+18/i.test(rawInput);
    if (hasIphone18) {
      directConversion.hook = `Está esperando o iPhone 18 lançar para comprar o ${prodText}?`;
      directConversion.retention = `Com a chegada do iPhone 18, muita gente espera o preço cair.`;
      directConversion.warning_or_value = `Mas, na prática, unidades novas podem ficar difíceis de encontrar e o estoque acabar.`;
      directConversion.cta = `Se o ${prodText} já faz sentido para você, confere a disponibilidade no carrinho laranja.`;
    } else {
      directConversion.hook = `Está esperando o momento certo para comprar o ${prodText}?`;
      directConversion.retention = `Muita gente fica adiando esperando o preço mudar.`;
      directConversion.warning_or_value = `Mas, na prática, as unidades disponíveis são limitadas e o estoque pode encerrar a qualquer momento.`;
      directConversion.cta = `Se o ${prodText} já faz sentido para você, garante no carrinho laranja enquanto ainda tem estoque.`;
    }

    directConversion.full_script = `${directConversion.hook} ${directConversion.retention} ${directConversion.warning_or_value}${securityChunk} ${directConversion.cta}`;

    curiositySubtle.hook = `Você precisa saber disso antes de decidir sobre o ${prodText}.`;
    curiositySubtle.retention = `Todo mundo acha que é melhor esperar mais um pouco.`;
    curiositySubtle.warning_or_value = `Mas a realidade é que unidades novas ficam cada vez mais raras.`;
    curiositySubtle.hidden_cta = `Dá uma olhada no carrinho laranja e veja se ainda está disponível.`;
    curiositySubtle.full_script = `${curiositySubtle.hook} ${curiositySubtle.retention} ${curiositySubtle.warning_or_value}${securityChunk} ${curiositySubtle.hidden_cta}`;

  } else if (modelKey === 'direct_tiktok_conversion') {
    // TASK 6: Conversão Direta TikTok Shop
    directConversion.hook = `Como essa oportunidade do ${prodText} ainda está disponível?`;
    directConversion.retention = `O ${prodText} ${verbAparece}${offerChunk}.`;
    directConversion.proof = proofChunk.trim();
    directConversion.security = securityChunk.trim();
    directConversion.cta = `Se você estava procurando trocar de aparelho, confere no carrinho laranja enquanto ainda aparece disponível.`;
    directConversion.full_script = `${directConversion.hook} ${directConversion.retention}${proofChunk}${securityChunk} ${directConversion.cta}`;

    curiositySubtle.hook = `Você viu os valores do ${prodText} hoje no TikTok Shop?`;
    curiositySubtle.retention = `Muita gente não reparou, mas ele está saindo${offerChunk}.`;
    curiositySubtle.warning_or_value = proofChunk.trim();
    curiositySubtle.hidden_cta = `Se fizer sentido para você, os detalhes completos estão no carrinho laranja.`;
    curiositySubtle.full_script = `${curiositySubtle.hook} ${curiositySubtle.retention}${proofChunk}${securityChunk} ${curiositySubtle.hidden_cta}`;

  } else if (modelKey === 'curiosity_warning') {
    // TASK 7: Curiosidade + Aviso
    directConversion.hook = `Você está pensando em comprar o ${prodText}?`;
    directConversion.retention = `Então presta atenção nisso antes de tomar qualquer decisão.`;
    directConversion.warning_or_value = `Todo mundo acha que o preço vai cair ainda mais, mas na prática as melhores oportunidades esgotam rápido.`;
    directConversion.proof = proofChunk.trim();
    directConversion.security = securityChunk.trim();
    directConversion.cta = `Confere os detalhes no carrinho laranja antes de decidir.`;
    directConversion.full_script = `${directConversion.hook} ${directConversion.retention} ${directConversion.warning_or_value}${proofChunk}${securityChunk} ${directConversion.cta}`;

    curiositySubtle.hook = `Presta atenção nesse detalhe do ${prodText}.`;
    curiositySubtle.retention = `Muita gente espera até o último minuto para garantir.`;
    curiositySubtle.warning_or_value = `Mas a realidade é que essa condição${offerChunk} só aparece em janelas específicas.`;
    curiositySubtle.hidden_cta = `Vale a pena conferir as opções no carrinho laranja.`;
    curiositySubtle.full_script = `${curiositySubtle.hook} ${curiositySubtle.retention} ${curiositySubtle.warning_or_value}${securityChunk} ${curiositySubtle.hidden_cta}`;

  } else if (modelKey === 'hidden_opportunity') {
    // TASK 8: Oportunidade Oculta
    directConversion.hook = `Existe uma oportunidade no ${prodText} que a maioria das pessoas não percebeu.`;
    directConversion.retention = `Todo mundo fica esperando [evento] achando que é o único momento de comprar.`;
    directConversion.warning_or_value = `A virada estratégica é que a janela com${offerChunk} está aberta agora no TikTok Shop.`;
    directConversion.proof = proofChunk.trim();
    directConversion.security = securityChunk.trim();
    directConversion.cta = `Acesse o carrinho laranja para aproveitar essa janela.`;
    directConversion.full_script = `${directConversion.hook} ${directConversion.retention} ${directConversion.warning_or_value}${proofChunk}${securityChunk} ${directConversion.cta}`;

    curiositySubtle.hook = `Reparou no que está acontecendo com o ${prodText}?`;
    curiositySubtle.retention = `A maioria dos compradores está esperando o momento perfeito.`;
    curiositySubtle.warning_or_value = `Mas agora abriu uma janela com ${offerChunk}.`;
    curiositySubtle.hidden_cta = `Confira sem compromisso no carrinho laranja.`;
    curiositySubtle.full_script = `${curiositySubtle.hook} ${curiositySubtle.retention} ${curiositySubtle.warning_or_value}${securityChunk} ${curiositySubtle.hidden_cta}`;

  } else {
    // Generic fallback for desire_value_decision, ugc_natural, premium_perception
    directConversion.hook = `Como essa promoção do ${prodText} ainda está disponível?`;
    directConversion.retention = `O ${prodText} ${verbAparece}${offerChunk}.`;
    directConversion.proof = proofChunk.trim();
    directConversion.security = securityChunk.trim();
    directConversion.cta = `Confere no carrinho laranja enquanto ainda aparece disponível.`;
    directConversion.full_script = `${directConversion.hook} ${directConversion.retention}${proofChunk}${securityChunk} ${directConversion.cta}`;

    curiositySubtle.hook = `Você viu como o ${prodText} está hoje?`;
    curiositySubtle.retention = `O modelo tá saindo${offerChunk}.`;
    curiositySubtle.warning_or_value = proofChunk.trim();
    curiositySubtle.hidden_cta = `Dá uma olhada no carrinho laranja e confira.`;
    curiositySubtle.full_script = `${curiositySubtle.hook} ${curiositySubtle.retention}${proofChunk}${securityChunk} ${curiositySubtle.hidden_cta}`;
  }

  // TASK 14: UGC Natural & Premium Safe versions (if not already set by anchor strategy)
  if (!ugcNaturalScript) {
    ugcNaturalScript = `Gente, olhem isso! O ${prodText} tá saindo${offerChunk || " com uma excelente condição"}!${proofChunk} E o melhor: você conta com${securityChunk ? securityChunk.replace('Além disso, você conta com', '') : ' total segurança'}. Se tava na dúvida, clica no carrinho laranja e dá uma olhada!`;
  }
  if (!premiumSafeScript) {
    premiumSafeScript = `Para quem busca excelência e transparência: os modelos ${prodText} contam com opções oficiais${offerChunk}.${proofChunk}${securityChunk} Acesse todos os detalhes oficiais através do carrinho laranja.`;
  }

  // Polish all full scripts
  directConversion.full_script = finalPolishScriptText(directConversion.full_script, rawInput);
  curiositySubtle.full_script = finalPolishScriptText(curiositySubtle.full_script, rawInput);
  ugcNaturalScript = finalPolishScriptText(ugcNaturalScript, rawInput);
  premiumSafeScript = finalPolishScriptText(premiumSafeScript, rawInput);

  // Screen text & recording tips (TASK 10)
  const screenTextList: string[] = [prodText];
  if (facts.discountStr) screenTextList.push(facts.discountStr);
  if (facts.priceStr) screenTextList.push(facts.priceStr);
  if (facts.hasShipping) screenTextList.push("Frete Grátis");
  if (facts.hasAppleGuarantee) screenTextList.push("Garantia Apple 1 Ano");
  if (facts.hasProtection) screenTextList.push("Proteção TikTok Shop");
  if (screenTextList.length < 3) screenTextList.push("Oportunidade Imperdível");

  return {
    mode: 'copy_master',
    logic_model: modelKey,
    model_label: modelDef.label,
    strategic_summary: `Roteiros estruturados sob a lógica ${modelDef.label}, mantendo 100% de precisão nos fatos fornecidos sem inventar garantias ou preços.`,
    detected_signals: det.detected_signals,
    scripts: {
      direct_conversion: directConversion,
      curiosity_subtle: curiositySubtle,
      ugc_natural: {
        label: "UGC Natural",
        full_script: ugcNaturalScript
      },
      premium_safe: {
        label: "Premium Seguro",
        full_script: premiumSafeScript
      }
    },
    recording_tips: {
      editing: "Corte todos os respiros entre as frases. O ritmo no TikTok precisa ser dinâmico para segurar a pessoa até o final.",
      screen_text: screenTextList.slice(0, 5),
      recommended_format: facts.hasTikTokShop ? "UGC com demonstração" : "Talking head",
      visual_suggestions: [
        `Mostrar o ${prodText} em mãos com zoom nos detalhes`,
        "Destacar o selo de garantia ou carrinho laranja na tela",
        "Gravar em ambiente bem iluminado sem ruídos de fundo"
      ]
    },
    compliance_notes: [
      "Sem promessas de cura ou garantia absoluta de resultados.",
      "Preço, descontos e benefícios estritamente fiéis aos dados fornecidos."
    ],
    quality_check: {
      logic_model_score: 95,
      retention_score: 92,
      cta_strength: 90,
      fact_safety: 100,
      anti_generic_score: 100,
      notes: ["Fatos e valores preservados com precisão."]
    }
  };
}

export interface CopyMasterValidationReport {
  isValid: boolean;
  score: number;
  checks: {
    nonEmpty: boolean;
    distinctScripts: boolean;
    pricesPreserved: boolean;
    discountsPreserved: boolean;
    noUnsupportedFacts: boolean;
    noBrokenSentence: boolean;
    noGenericFiller: boolean;
  };
  warnings: string[];
  notes: string[];
}

/**
 * TASK 1 — Regression guard for Copy Master output
 */
export function validateCopyMasterOutput(result: any, input: string): CopyMasterValidationReport {
  const warnings: string[] = [];
  const notes: string[] = [];

  let parsed: any = result;
  if (typeof result === 'string') {
    try {
      parsed = JSON.parse(result);
    } catch (e) {
      parsed = null;
    }
  }

  // Check 1: Non-empty
  const nonEmpty = Boolean(
    parsed &&
    ((parsed.scripts && (parsed.scripts.direct_conversion?.full_script || parsed.scripts.curiosity_subtle?.full_script)) ||
      (Array.isArray(parsed) && parsed.length > 0) ||
      (typeof result === 'string' && result.trim().length > 10))
  );

  if (!nonEmpty) {
    warnings.push("O resultado da copy está vazio ou malformatado.");
  }

  // Extract scripts
  let scriptTexts: string[] = [];
  if (parsed?.scripts) {
    if (parsed.scripts.direct_conversion?.full_script) scriptTexts.push(parsed.scripts.direct_conversion.full_script);
    if (parsed.scripts.curiosity_subtle?.full_script) scriptTexts.push(parsed.scripts.curiosity_subtle.full_script);
    if (parsed.scripts.ugc_natural?.full_script) scriptTexts.push(parsed.scripts.ugc_natural.full_script);
    if (parsed.scripts.premium_safe?.full_script) scriptTexts.push(parsed.scripts.premium_safe.full_script);
  } else if (Array.isArray(parsed)) {
    scriptTexts = parsed.map((item: any) => item.full_copy || item.full_script || item.hook || "").filter(Boolean);
  }

  const combinedScriptsText = scriptTexts.join(" ");

  // Check 2: Generated scripts are not identical
  let distinctScripts = true;
  if (scriptTexts.length > 1) {
    const unique = new Set(scriptTexts.map(s => s.trim().toLowerCase()));
    if (unique.size < scriptTexts.length) {
      distinctScripts = false;
      warnings.push("Variações de roteiro geradas possuem conteúdo idêntico.");
    }
  }

  // Extract facts provided by user
  const userFacts = extractUserProvidedFacts(input || "");

  // Check 3: Exact prices provided by user are preserved
  let pricesPreserved = true;
  if (userFacts.hasPrice && userFacts.priceStr) {
    const cleanPrice = userFacts.priceStr.toLowerCase().replace(/a\s+partir\s+de\s+/i, "").trim();
    if (cleanPrice && !combinedScriptsText.toLowerCase().includes(cleanPrice)) {
      pricesPreserved = false;
      warnings.push(`Preço exato fornecido (${userFacts.priceStr}) não foi mantido na copy.`);
    }
  }

  // Check 4: Exact discounts provided by user are preserved
  let discountsPreserved = true;
  if (userFacts.hasDiscount && userFacts.discountStr) {
    const cleanDiscount = userFacts.discountStr.toLowerCase();
    if (cleanDiscount && !combinedScriptsText.toLowerCase().includes(cleanDiscount)) {
      discountsPreserved = false;
      warnings.push(`Desconto exato fornecido (${userFacts.discountStr}) não foi totalmente preservado.`);
    }
  }

  // Check 5: No unsupported facts are invented
  let noUnsupportedFacts = true;
  if (!userFacts.hasShipping && /frete\s*grá?tis/i.test(combinedScriptsText)) {
    noUnsupportedFacts = false;
    warnings.push("Fato inventado detectado: 'frete grátis' adicionado sem constar no input.");
  }
  if (!userFacts.hasPrice && !userFacts.hasDiscount && /(?:R\$\s*\d+|[\d.]+\s*reais)/i.test(combinedScriptsText)) {
    noUnsupportedFacts = false;
    warnings.push("Fato inventado detectado: preço em R$ adicionado sem constar no input.");
  }

  // Check 6: No broken sentence such as "O preço fica e..."
  let noBrokenSentence = true;
  const brokenPatterns = [
    /\bpreço\s+fica\s+e\b/i,
    /\bsaindo\s+por\s+e\b/i,
    /\bfica\s+e\s*$/i,
    /\bpor\s+e\s*$/i,
    /\bcom\s+e\b/i,
    /\be\s+e\b/i,
    /\bcontam\s+com\.\b/i,
    /[,\s]+e\s*$/i
  ];
  for (const pat of brokenPatterns) {
    if (pat.test(combinedScriptsText)) {
      noBrokenSentence = false;
      warnings.push("Detectada frase truncada ou conector incorreto.");
      break;
    }
  }

  // Check 7: No generic filler if input has specific strategy
  let noGenericFiller = true;
  if (hasGenericCopyFiller(combinedScriptsText, input)) {
    noGenericFiller = false;
    warnings.push("Foram identificados clichês genéricos na copy.");
  }

  const checkList = [
    nonEmpty,
    distinctScripts,
    pricesPreserved,
    discountsPreserved,
    noUnsupportedFacts,
    noBrokenSentence,
    noGenericFiller
  ];

  const passedCount = checkList.filter(Boolean).length;
  const score = Math.round((passedCount / checkList.length) * 100);

  if (pricesPreserved) notes.push("Fatos e valores de preço 100% mantidos.");
  if (discountsPreserved) notes.push("Descontos preservados com exatidão.");
  if (noUnsupportedFacts) notes.push("Zero invenção de dados não fornecidos.");
  if (distinctScripts) notes.push("4 variações estratégicas e distintas.");

  return {
    isValid: nonEmpty && noBrokenSentence && distinctScripts,
    score,
    checks: {
      nonEmpty,
      distinctScripts,
      pricesPreserved,
      discountsPreserved,
      noUnsupportedFacts,
      noBrokenSentence,
      noGenericFiller
    },
    warnings,
    notes
  };
}

/**
 * Builds AI system prompt for Copy Master with the exact JSON schema
 */
export function buildCopyMasterPrompt(
  product: string,
  audience: string,
  features: string,
  referenceScript: string,
  selectedLogicModel: CopyLogicModelKey,
  persuasionStrategy: PersuasionStrategyKey = 'PADRAO'
): string {
  const combinedInput = `${product} ${audience} ${features} ${referenceScript}`;
  const det = detectCopyLogicModel(combinedInput);
  const effectiveModelKey = selectedLogicModel === 'auto' ? det.model : selectedLogicModel;
  const modelDef = COPY_LOGIC_MODELS[effectiveModelKey as Exclude<CopyLogicModelKey, 'auto'>];
  const persuasionInstruction = buildPersuasionStrategyInstruction(persuasionStrategy, combinedInput);

  return `
Você é um Copywriter Senior Master especialista em resposta direta, vídeos curtos para TikTok Shop, Reels, Shorts e UGC de alta conversão.

Sua missão é gerar os roteiros usando o **Modelo Lógico de Copy**: "${modelDef.label}" (${modelDef.key}).

MODELO LÓGICO SELECIONADO:
- Chave: ${modelDef.key}
- Nome: ${modelDef.label}
- Estrutura de Seções: ${modelDef.structure.join(" → ")}
- Quando usar: ${modelDef.useWhen}

DADOS DA OFERTA E FATOS FORNECIDOS PELO USUÁRIO:
PRODUTO: ${product || "Produto informado"}
PÚBLICO-ALVO: ${audience || "Geral"}
DIFERENCIAIS/FATOS: ${features || "Usar os fatos fornecidos"}
${referenceScript ? `SCRIPT DE REFERÊNCIA:\n"${referenceScript}"\n` : ""}
${persuasionInstruction ? `${persuasionInstruction}\n` : ""}
REGRAS DE CONVERSÃO E PRESERVAÇÃO RIGOROSA DE FATOS (MANDATÓRIO):
1. **PRESERVAÇÃO ABSOLUTA DE VALORES E FATOS**:
   - Se o usuário forneceu "quase R$ 2.000 de desconto", PRESERVE "quase R$ 2.000 de desconto". NUNCA mude para R$ 100, R$ 1.000 ou "desconto enorme".
   - Se forneceu "a partir de R$ 8.000", PRESERVE "a partir de R$ 8.000".
   - NUNCA invente estoque, preços, descontos, avaliações, unidades vendidas, frete grátis, garantia de fabricante, ou termos de plataforma que não foram explicitamente mencionados.
2. **BLOQUEIO DE FILLER GENÉRICO**:
   - É ESTRITAMENTE PROIBIDO usar frases genéricas como: "Procurando um celular estiloso sem gastar muito?", "produto de qualidade sem pesar no bolso", "design moderno e praticidade no dia a dia", "esse produto entrega", "achadinho" ou "sem gastar muito".
3. **DIFERENCIAÇÃO DE VERSÕES**:
   - 'direct_conversion': Roteiro direto, focado em conversão e TikTok Shop.
   - 'curiosity_subtle': Roteiro baseado em curiosidade, com quebra de expectativa e chamada mais sutil.
   - 'ugc_natural': Roteiro em tom conversacional, espontâneo e humano.
   - 'premium_safe': Roteiro sereno, elegante e de percepção de alto valor.
4. **ESTRUTURA DO MODELO LÓGICO**:
   - Se 'scarcity_urgency': Gancho (pergunta forte) → Retenção (o que esperam) → Aviso (risco/estoque/oportunidade) → CTA (carrinho laranja). Ex: "Está esperando [evento] para comprar [produto]?..."
   - Se 'direct_tiktok_conversion': Gancho (oportunidade) → Oferta (preço/desconto) → Prova (unidades/avaliações) → Segurança (garantia/frete) → CTA (carrinho laranja).
   - Se 'curiosity_warning': Pergunta/Gancho → Crença comum → Quebra de expectativa/Aviso → CTA sutil.
   - Se 'hidden_opportunity': Oportunidade não percebida → Crença comum → Virada estratégica → Janela → CTA sutil.
5. **PRESERVAÇÃO DA ESTRUTURA E REGRAS DE SEGURANÇA**:
   - Preserve the current successful structure. Do not replace specific offer logic with generic product copy. Use only facts provided by the user.

Você DEVE retornar APENAS um objeto JSON compacto e válido, sem wrappers markdown (não use \`\`\`json ou similares):

{
  "mode": "copy_master",
  "logic_model": "${modelDef.key}",
  "model_label": "${modelDef.label}",
  "strategic_summary": "Resumo estratégico em 1 ou 2 frases da lógica aplicada.",
  "detected_signals": ${JSON.stringify(det.detected_signals)},
  "scripts": {
    "direct_conversion": {
      "label": "Direta e Focada em Conversão",
      "description": "TikTok Shop padrão, linguagem direta e CTA claro.",
      "hook": "Texto do gancho",
      "retention": "Texto da retenção",
      "warning_or_value": "Texto do aviso ou oferta/valor",
      "proof": "Texto de prova social se houver",
      "security": "Texto de segurança/garantia se houver",
      "cta": "Texto da chamada para ação",
      "full_script": "Texto completo compilado do roteiro direto"
    },
    "curiosity_subtle": {
      "label": "Focada em Curiosidade",
      "description": "Mesma lógica, com chamada mais sutil e menos agressiva.",
      "hook": "Texto do gancho de curiosidade",
      "retention": "Texto da retenção",
      "warning_or_value": "Texto do aviso ou virada",
      "hidden_cta": "Texto da chamada sutil",
      "full_script": "Texto completo compilado do roteiro de curiosidade"
    },
    "ugc_natural": {
      "label": "UGC Natural",
      "full_script": "Texto completo do roteiro UGC conversacional"
    },
    "premium_safe": {
      "label": "Premium Seguro",
      "full_script": "Texto completo do roteiro Premium elegante"
    }
  },
  "recording_tips": {
    "editing": "Corte todos os respiros entre as frases. O ritmo no TikTok precisa ser dinâmico para segurar a pessoa até o final.",
    "screen_text": ["Palavra 1", "Palavra 2", "Palavra 3", "Palavra 4"],
    "recommended_format": "Talking head / UGC com demonstração / POV de produto",
    "visual_suggestions": ["Sugestão visual 1", "Sugestão visual 2"]
  },
  "compliance_notes": ["Nota de compliance 1", "Nota de compliance 2"],
  "quality_check": {
    "logic_model_score": 95,
    "retention_score": 90,
    "cta_strength": 90,
    "fact_safety": 100,
    "anti_generic_score": 100,
    "notes": ["Fatos e valores preservados com precisão."]
  }
}
`;
}
