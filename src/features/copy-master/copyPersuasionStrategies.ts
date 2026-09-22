/**
 * Copy Master Persuasion Strategy Layer
 * Extensible architecture for optional persuasion strategies in the Copy Master module.
 */

export type PersuasionStrategyKey = 'PADRAO' | 'PHYSICAL_STORE_ANCHOR';

export interface PersuasionStrategyDefinition {
  key: PersuasionStrategyKey;
  label: string;
  shortLabel: string;
  description: string;
  isAnchorStrategy?: boolean;
}

export const PERSUASION_STRATEGIES: Record<PersuasionStrategyKey, PersuasionStrategyDefinition> = {
  PADRAO: {
    key: 'PADRAO',
    label: 'Padrão',
    shortLabel: 'Padrão',
    description: 'Estratégia padrão de Copy Master sem ancoragem adicional de preço.'
  },
  PHYSICAL_STORE_ANCHOR: {
    key: 'PHYSICAL_STORE_ANCHOR',
    label: 'Ancoragem Loja Física',
    shortLabel: 'Loja Física (2x–3x)',
    description: 'Cria ancoragem casual de valor/preço em loja física (2x–3x) antes de revelar o preço real.',
    isAnchorStrategy: true
  }
};

export interface ExtractedRealPrice {
  raw: string;
  numericValue: number;
  formatted: string;
  spelledOutPtBr?: string;
}

export interface AnchorCalculationResult {
  realPrice: ExtractedRealPrice;
  minAnchor: number;
  maxAnchor: number;
  minFormatted: string;
  maxFormatted: string;
  anchorRangeFormatted: string;
}

/**
 * Robust extractor for Brazilian currency and price expressions.
 * Identifies prices like: "R$ 25", "R$ 25,00", "R$ 49,90", "por apenas R$ 120", "25 reais", "a partir de R$ 8.000".
 */
export function extractRealProductPrice(input: string): ExtractedRealPrice | null {
  if (!input || typeof input !== 'string') return null;

  const patterns = [
    // 1. Explicit R$ with value: R$ 25, R$ 25,00, R$ 1.999,90, R$ 8.000
    /(?:a\s+partir\s+de\s+|por\s+apenas\s+|por\s+|valor\s*(?:de|é)?\s*|preço\s*(?:de|é)?\s*|custo\s*(?:de|é)?\s*)?R\$\s*([\d\.]+(?:,\d{1,2})?)/i,
    // 2. Numeric value followed by "reais": 25 reais, 49,90 reais
    /([\d\.]+(?:,\d{1,2})?)\s*(?:reais|de\s+reais)\b/i,
    // 3. Simple standalone R$ number
    /R\$\s*([\d\.]+(?:,\d{1,2})?)/i
  ];

  for (const p of patterns) {
    const match = input.match(p);
    if (match) {
      const rawMatched = match[0];
      const rawNumStr = match[1]?.trim();
      if (!rawNumStr) continue;

      let cleanVal = rawNumStr;
      if (rawNumStr.includes('.') && rawNumStr.includes(',')) {
        cleanVal = rawNumStr.replace(/\./g, '').replace(',', '.');
      } else if (rawNumStr.includes(',')) {
        cleanVal = rawNumStr.replace(',', '.');
      } else if (rawNumStr.includes('.')) {
        const parts = rawNumStr.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
          // Thousand separator like 1.000 or 8.000
          cleanVal = rawNumStr.replace(/\./g, '');
        } else {
          cleanVal = rawNumStr;
        }
      }

      const num = parseFloat(cleanVal);
      if (!isNaN(num) && num > 0) {
        let formatted = '';
        if (Number.isInteger(num)) {
          formatted = `R$ ${num.toLocaleString('pt-BR')}`;
        } else {
          formatted = `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        return {
          raw: rawMatched.trim(),
          numericValue: num,
          formatted
        };
      }
    }
  }

  return null;
}

/**
 * Calculates suggested anchor range (2x minimum, 3x maximum) based on verified real price.
 */
export function calculatePhysicalStoreAnchor(realPrice: ExtractedRealPrice): AnchorCalculationResult {
  const minAnchor = Math.round(realPrice.numericValue * 2 * 100) / 100;
  const maxAnchor = Math.round(realPrice.numericValue * 3 * 100) / 100;

  const formatCurrency = (val: number): string => {
    if (Number.isInteger(val)) {
      return `R$ ${val.toLocaleString('pt-BR')}`;
    }
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const minFormatted = formatCurrency(minAnchor);
  const maxFormatted = formatCurrency(maxAnchor);

  return {
    realPrice,
    minAnchor,
    maxAnchor,
    minFormatted,
    maxFormatted,
    anchorRangeFormatted: `${minFormatted}–${maxFormatted}`
  };
}

/**
 * Builds the strategy instruction for the Gemini prompt.
 * If strategy is PADRAO or if no real price exists, returns an empty string (preserving default behavior).
 */
export function buildPersuasionStrategyInstruction(
  strategy: PersuasionStrategyKey = 'PADRAO',
  combinedInput: string
): string {
  if (strategy !== 'PHYSICAL_STORE_ANCHOR') {
    return '';
  }

  const realPrice = extractRealProductPrice(combinedInput);
  if (!realPrice) {
    // Graceful fallback to PADRAO if no price is available
    return '';
  }

  const anchor = calculatePhysicalStoreAnchor(realPrice);

  return `
ESTRATÉGIA DE PERSUASÃO ATIVA: ANCORAGEM EM LOJA FÍSICA (PHYSICAL_STORE_ANCHOR)
- PREÇO REAL DO PRODUTO (VERIFICADO): ${realPrice.formatted}
- FAIXA DE ANCORAGEM SUGERIDA (2X A 3X): ${anchor.minFormatted} a ${anchor.maxFormatted} (Ex: ${anchor.anchorRangeFormatted})

DIRETRIZES DE EXECUÇÃO DA ANCORAGEM:
1. **SEQUÊNCIA PERSUASIVA**:
   a. Introduza de forma breve e casual uma referência de preço de mercado ou de loja física dentro da faixa comparativa (${anchor.minFormatted} a ${anchor.maxFormatted}) ANTES de revelar o preço real.
   b. NÃO transforme o preço de âncora no assunto principal. A menção deve ser casual e rápida.
   c. Logo após citar a âncora, volte IMEDIATAMENTE a destacar os benefícios práticos, diferenciais, utilidade e desejo pelo produto.
   d. Revele o preço REAL verificado (${realPrice.formatted}) mais adiante na copy, criando contraste perceptivo de alto valor.
   e. Finalize conduzindo normalmente para o CTA (ex: carrinho laranja no TikTok Shop).

2. **LINGUAGEM COMPARATIVA NÃO-ABSOLUTA (PT-BR)**:
   - PREFIRA termos como:
     * "Em loja física, um produto desse tipo pode custar perto de..."
     * "É comum encontrar modelos semelhantes por..."
     * "Um produto desse tipo em loja física pode chegar a..."
     * "Por aí é comum ver por..."
   - NUNCA AFIRME de forma absoluta:
     * "Todas as lojas físicas cobram mais."
     * "Em qualquer loja custa X."
     * "Esse produto custa X na loja física."
   - É ESTRITAMENTE PROIBIDO usar falsas alegações de desconto do tipo:
     * "Esse produto custava..."
     * "Preço normal era..."
     * "De R$ X por R$ Y..." (a menos que tais fatos estejam explicitamente nos dados originais fornecidos).

3. **PRESERVAÇÃO DO VALOR REAL**:
   - O preço final divulgado para o produto DEVE ser estritamente ${realPrice.formatted}. NUNCA altere ou invente outro preço para o produto.
`;
}
