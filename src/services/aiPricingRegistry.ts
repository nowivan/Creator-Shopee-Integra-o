/**
 * AI PRICING REGISTRY (Etapa 3)
 * CREATOR INTELLIGENCE PRO
 *
 * Centralized, audit-grade pricing registry for AI models.
 * Canonical currency base: USD ($ per 1,000,000 tokens).
 *
 * Guaranteed isolation:
 * - Single source of truth for AI model rates.
 * - Unknown models return PRICING_UNKNOWN without guessing.
 * - Pure mathematical calculation without side effects.
 */

export interface AiModelPricing {
  provider: string;
  model: string;
  displayName: string;
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  cachedInputUsdPer1M?: number;
  effectiveFrom?: string;
  source?: string;
}

export type PricingStatus = 'PRICING_KNOWN' | 'PRICING_UNKNOWN' | 'TOKEN_UNAVAILABLE';

export interface RequestCostCalculationResult {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputCostUsd?: number;
  outputCostUsd?: number;
  totalCostUsd?: number;
  totalCostBrl?: number;
  pricingStatus: PricingStatus;
  tokenSource: 'API_REPORTED' | 'UNAVAILABLE';
  modelKey: string;
}

export interface CostCurrencyConfig {
  displayCurrency: 'BRL' | 'USD';
  usdToBrlRate: number;
  rateSource: string;
  rateUpdatedAt: number;
}

// ==========================================
// 1. CANONICAL PRICING REGISTRY
// ==========================================

export const AI_PRICING_REGISTRY: Record<string, AiModelPricing> = {
  // Gemini 3.8 Flash
  'gemini-3.8-flash': {
    provider: 'Google AI',
    model: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    inputUsdPer1M: 0.10,
    outputUsdPer1M: 0.40,
    effectiveFrom: '2026-01-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 3.7 Flash
  'gemini-3.7-flash': {
    provider: 'Google AI',
    model: 'gemini-3.7-flash',
    displayName: 'Gemini 3.7 Flash',
    inputUsdPer1M: 0.10,
    outputUsdPer1M: 0.40,
    effectiveFrom: '2026-01-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 3.6 Flash
  'gemini-3.6-flash': {
    provider: 'Google AI',
    model: 'gemini-3.6-flash',
    displayName: 'Gemini 3.6 Flash',
    inputUsdPer1M: 0.10,
    outputUsdPer1M: 0.40,
    effectiveFrom: '2026-01-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 3.5 Flash
  'gemini-3.5-flash': {
    provider: 'Google AI',
    model: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    inputUsdPer1M: 0.10,
    outputUsdPer1M: 0.40,
    effectiveFrom: '2025-06-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 3.1 Flash Lite
  'gemini-3.1-flash-lite': {
    provider: 'Google AI',
    model: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash Lite',
    inputUsdPer1M: 0.075,
    outputUsdPer1M: 0.30,
    effectiveFrom: '2025-06-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 3.1 Pro Preview
  'gemini-3.1-pro-preview': {
    provider: 'Google AI',
    model: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 5.00,
    effectiveFrom: '2025-06-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 2.5 Flash
  'gemini-2.5-flash': {
    provider: 'Google AI',
    model: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    inputUsdPer1M: 0.10,
    outputUsdPer1M: 0.40,
    effectiveFrom: '2025-01-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 2.5 Pro
  'gemini-2.5-pro': {
    provider: 'Google AI',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 5.00,
    effectiveFrom: '2025-01-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 2.0 Flash
  'gemini-2.0-flash': {
    provider: 'Google AI',
    model: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    inputUsdPer1M: 0.10,
    outputUsdPer1M: 0.40,
    effectiveFrom: '2024-12-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 2.0 Flash Lite
  'gemini-2.0-flash-lite': {
    provider: 'Google AI',
    model: 'gemini-2.0-flash-lite',
    displayName: 'Gemini 2.0 Flash Lite',
    inputUsdPer1M: 0.075,
    outputUsdPer1M: 0.30,
    effectiveFrom: '2025-01-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 2.0 Pro Experimental
  'gemini-2.0-pro-exp': {
    provider: 'Google AI',
    model: 'gemini-2.0-pro-exp',
    displayName: 'Gemini 2.0 Pro Exp',
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 5.00,
    effectiveFrom: '2024-12-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 1.5 Flash
  'gemini-1.5-flash': {
    provider: 'Google AI',
    model: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    inputUsdPer1M: 0.075,
    outputUsdPer1M: 0.30,
    effectiveFrom: '2024-05-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 1.5 Flash 8B
  'gemini-1.5-flash-8b': {
    provider: 'Google AI',
    model: 'gemini-1.5-flash-8b',
    displayName: 'Gemini 1.5 Flash 8B',
    inputUsdPer1M: 0.0375,
    outputUsdPer1M: 0.15,
    effectiveFrom: '2024-10-01',
    source: 'Google AI Studio Official Rates'
  },
  // Gemini 1.5 Pro
  'gemini-1.5-pro': {
    provider: 'Google AI',
    model: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 5.00,
    effectiveFrom: '2024-05-01',
    source: 'Google AI Studio Official Rates'
  }
};

// Normalized alias mappings
const MODEL_ALIASES: Record<string, string> = {
  'gemini-flash': 'gemini-3.8-flash',
  'gemini-flash-latest': 'gemini-3.8-flash',
  'gemini-3.8': 'gemini-3.8-flash',
  'gemini-3.7': 'gemini-3.7-flash',
  'gemini-3.6': 'gemini-3.6-flash',
  'gemini-3.5': 'gemini-3.5-flash',
  'gemini-3.1': 'gemini-3.1-flash-lite',
  'gemini-pro': 'gemini-3.1-pro-preview',
  'models/gemini-3.8-flash': 'gemini-3.8-flash',
  'models/gemini-3.7-flash': 'gemini-3.7-flash',
  'models/gemini-3.6-flash': 'gemini-3.6-flash',
  'models/gemini-3.5-flash': 'gemini-3.5-flash',
  'models/gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
  'models/gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
  'gemini-2.5': 'gemini-2.5-flash',
  'gemini-2.0': 'gemini-2.0-flash',
  'models/gemini-2.5-flash': 'gemini-2.5-flash',
  'models/gemini-2.5-pro': 'gemini-2.5-pro',
  'models/gemini-2.0-flash': 'gemini-2.0-flash',
  'models/gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
  'models/gemini-1.5-flash': 'gemini-1.5-flash',
  'models/gemini-1.5-pro': 'gemini-1.5-pro'
};

/**
 * Resolves a model string to its registered canonical pricing definition.
 */
export function resolveModelPricing(modelName?: string): AiModelPricing | null {
  if (!modelName || typeof modelName !== 'string') {
    return null;
  }

  const clean = modelName.trim().toLowerCase();

  // Direct match
  if (AI_PRICING_REGISTRY[clean]) {
    return AI_PRICING_REGISTRY[clean];
  }

  // Alias match
  if (MODEL_ALIASES[clean] && AI_PRICING_REGISTRY[MODEL_ALIASES[clean]]) {
    return AI_PRICING_REGISTRY[MODEL_ALIASES[clean]];
  }

  // Substring match for known models
  for (const [key, pricing] of Object.entries(AI_PRICING_REGISTRY)) {
    if (clean.includes(key)) {
      return pricing;
    }
  }

  return null;
}

// ==========================================
// 2. EXCHANGE RATE & CONFIGURATION
// ==========================================

const DEFAULT_USD_TO_BRL = 5.70;
const CURRENCY_CONFIG_STORAGE_KEY = 'creator_cost_currency_config';

export function getCostCurrencyConfig(): CostCurrencyConfig {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(CURRENCY_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.usdToBrlRate === 'number' && parsed.usdToBrlRate > 0) {
          return {
            displayCurrency: parsed.displayCurrency || 'BRL',
            usdToBrlRate: parsed.usdToBrlRate,
            rateSource: parsed.rateSource || 'Configurado Manualmente',
            rateUpdatedAt: parsed.rateUpdatedAt || Date.now()
          };
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }

  return {
    displayCurrency: 'BRL',
    usdToBrlRate: DEFAULT_USD_TO_BRL,
    rateSource: 'Taxa de Referência Comercial',
    rateUpdatedAt: Date.now()
  };
}

export function saveCostCurrencyConfig(config: Partial<CostCurrencyConfig>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const current = getCostCurrencyConfig();
      const updated: CostCurrencyConfig = {
        ...current,
        ...config,
        rateUpdatedAt: Date.now()
      };
      window.localStorage.setItem(CURRENCY_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Non-blocking
    }
  }
}

// ==========================================
// 3. COST ESTIMATION FUNCTION
// ==========================================

export function estimateAiRequestCost(params: {
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  usdToBrlRate?: number;
}): RequestCostCalculationResult {
  const { model, inputTokens, outputTokens, totalTokens } = params;
  const rate = params.usdToBrlRate || getCostCurrencyConfig().usdToBrlRate;
  const modelKey = (model || 'unknown_model').trim().toLowerCase();

  const hasInput = typeof inputTokens === 'number' && Number.isFinite(inputTokens) && inputTokens >= 0;
  const hasOutput = typeof outputTokens === 'number' && Number.isFinite(outputTokens) && outputTokens >= 0;
  const hasTotal = typeof totalTokens === 'number' && Number.isFinite(totalTokens) && totalTokens >= 0;

  if (!hasInput && !hasOutput && !hasTotal) {
    return {
      pricingStatus: 'TOKEN_UNAVAILABLE',
      tokenSource: 'UNAVAILABLE',
      modelKey
    };
  }

  const effectiveInput = hasInput ? inputTokens! : 0;
  const effectiveOutput = hasOutput ? outputTokens! : 0;
  const effectiveTotal = hasTotal ? totalTokens! : effectiveInput + effectiveOutput;

  const pricing = resolveModelPricing(model);

  if (!pricing) {
    return {
      inputTokens: effectiveInput,
      outputTokens: effectiveOutput,
      totalTokens: effectiveTotal,
      pricingStatus: 'PRICING_UNKNOWN',
      tokenSource: 'API_REPORTED',
      modelKey
    };
  }

  // Canonical formula: (Tokens / 1_000_000) * Price_Per_1M
  const inputCostUsd = (effectiveInput / 1_000_000) * pricing.inputUsdPer1M;
  const outputCostUsd = (effectiveOutput / 1_000_000) * pricing.outputUsdPer1M;
  const totalCostUsd = inputCostUsd + outputCostUsd;
  const totalCostBrl = totalCostUsd * rate;

  return {
    inputTokens: effectiveInput,
    outputTokens: effectiveOutput,
    totalTokens: effectiveTotal,
    inputCostUsd: Math.round(inputCostUsd * 1_000_000) / 1_000_000,
    outputCostUsd: Math.round(outputCostUsd * 1_000_000) / 1_000_000,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    totalCostBrl: Math.round(totalCostBrl * 1_000_000) / 1_000_000,
    pricingStatus: 'PRICING_KNOWN',
    tokenSource: 'API_REPORTED',
    modelKey: pricing.model
  };
}

// ==========================================
// 4. FORMATTING UTILITIES
// ==========================================

export function formatCurrencyBrl(val?: number | null): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '—';
  if (val < 0.01 && val > 0) {
    return `< R$ 0,01`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(val);
}

export function formatCurrencyUsd(val?: number | null): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '—';
  if (val < 0.001 && val > 0) {
    return `< $0.001`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 5
  }).format(val);
}

export function formatTokenCount(val?: number | null): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '—';
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(1)}k`;
  }
  return val.toLocaleString('pt-BR');
}
