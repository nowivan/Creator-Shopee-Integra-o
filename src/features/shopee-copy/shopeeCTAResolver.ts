/**
 * SHOPEE CTA RESOLVER — NATIVE CONVERSION CALLS & PLATFORM BOUNDARIES
 * 
 * Rules:
 * 1. Resolves Shopee-native CTA phrasing (produto marcado, link da Shopee, sacolinha, ícone do produto).
 * 2. Explicitly rejects TikTok Shop specific terms (e.g. "carrinho laranja").
 * 3. Never invents nonexistent platform UI affordances or fictional features.
 */

import { ShopeeCTAType, ShopeeCommercialEvidence } from './types';

export const FORBIDDEN_PLATFORM_TERMS: { pattern: RegExp; term: string }[] = [
  { pattern: /\bcarrinho\s+laranja\b/i, term: 'carrinho laranja (TikTok Shop)' },
  { pattern: /\btiktok\b/i, term: 'TikTok' },
  { pattern: /\brede\s+vizinha\b/i, term: 'rede vizinha' }
];

export const SHOPEE_CTA_PATTERNS: Record<ShopeeCTAType, RegExp[]> = {
  [ShopeeCTAType.PRODUTO_MARCADO]: [
    /\bproduto\s+marcado\b/i,
    /\bprodutos?\s+marcados?\b/i
  ],
  [ShopeeCTAType.LINK_SHOPEE]: [
    /\blink\s+(?:da|na)\s+shopee\b/i,
    /\bshopee\b/i
  ],
  [ShopeeCTAType.SACOLINHA]: [
    /\bsacolinha\b/i,
    /\bsacolinha\s+aqui\b/i
  ],
  [ShopeeCTAType.ICONE_PRODUTO]: [
    /\b[ií]cone\s+do\s+produto\b/i,
    /\b[ií]cone\s+aqui\s+embaixo\b/i
  ],
  [ShopeeCTAType.PLATFORM_NEUTRAL]: [
    /\bclic?a(?:ndo)?\s+aqui\s+(?:no\s+v[ií]deo|embaixo)\b/i,
    /\bconfer(?:ir|e)\s+aqui\s+(?:embaixo|no\s+v[ií]deo)\b/i,
    /\bgaranta\s+o\s+seu\s+aqui\s+embaixo\b/i,
    /\baproveit(?:e|ar)\s+aqui\s+embaixo\b/i
  ]
};

export const SHOPEE_SAMPLE_CTA_PHRASES: Record<ShopeeCTAType, string[]> = {
  [ShopeeCTAType.PRODUTO_MARCADO]: [
    'clicando agora no produto marcado aqui embaixo',
    'conferindo todos os detalhes no produto marcado',
    'aproveite para garantir o seu no produto marcado'
  ],
  [ShopeeCTAType.LINK_SHOPEE]: [
    'acessando o link da Shopee aqui embaixo',
    'clicando direto no link da Shopee com total segurança',
    'garanta já o seu pelo link da Shopee aqui no vídeo'
  ],
  [ShopeeCTAType.SACOLINHA]: [
    'clicando na sacolinha aqui na tela agora mesmo',
    'conferindo as opções disponíveis na sacolinha',
    'aproveite e garanta o seu na sacolinha aqui embaixo'
  ],
  [ShopeeCTAType.ICONE_PRODUTO]: [
    'tocando no ícone do produto aqui embaixo do vídeo',
    'conferindo no ícone do produto aqui embaixo com segurança',
    'clicando no ícone do produto aqui embaixo para pedir o seu'
  ],
  [ShopeeCTAType.PLATFORM_NEUTRAL]: [
    'clicando aqui embaixo para garantir o seu com total tranquilidade',
    'conferindo as opções disponíveis aqui embaixo antes que termine',
    'aproveitando agora mesmo aqui embaixo para receber na sua casa'
  ]
};

/**
 * Validates whether a given text contains a valid Shopee CTA and has no forbidden platform terms.
 */
export function validateShopeeCTA(text: string, expectedType?: ShopeeCTAType): {
  isValid: boolean;
  ctaType?: ShopeeCTAType;
  forbiddenTerm?: string;
  violations: string[];
} {
  const res = isAllowedShopeeCTA(text, expectedType);
  return {
    isValid: res.valid,
    ctaType: res.detectedType,
    forbiddenTerm: res.forbiddenTerm,
    violations: res.valid ? [] : [res.reason || 'CTA inválido para Shopee']
  };
}

export function isShopeeNativeCTA(text: string): boolean {
  return isAllowedShopeeCTA(text).valid;
}

export function resolveShopeeCTAs(ctaType: ShopeeCTAType): string[] {
  return SHOPEE_SAMPLE_CTA_PHRASES[ctaType] || SHOPEE_SAMPLE_CTA_PHRASES[ShopeeCTAType.PRODUTO_MARCADO];
}

export function isAllowedShopeeCTA(text: string, expectedType?: ShopeeCTAType): {
  valid: boolean;
  detectedType?: ShopeeCTAType;
  forbiddenTerm?: string;
  reason?: string;
} {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'Texto vazio ou indefinido.' };
  }

  // 1. Check forbidden platform terms
  for (const { pattern, term } of FORBIDDEN_PLATFORM_TERMS) {
    if (pattern.test(text)) {
      return {
        valid: false,
        forbiddenTerm: term,
        reason: `Termo proibido para Shopee detectado: "${term}". A Shopee não utiliza carrinho laranja.`
      };
    }
  }

  // 2. Check if text matches expected type or any allowed Shopee CTA pattern
  if (expectedType) {
    const patterns = SHOPEE_CTA_PATTERNS[expectedType];
    const matchesExpected = patterns.some(p => p.test(text));
    if (matchesExpected) {
      return { valid: true, detectedType: expectedType };
    }
  }

  // 3. Scan all allowed patterns
  for (const [type, patterns] of Object.entries(SHOPEE_CTA_PATTERNS) as [ShopeeCTAType, RegExp[]][]) {
    if (patterns.some(p => p.test(text))) {
      return { valid: true, detectedType: type };
    }
  }

  return {
    valid: false,
    reason: 'Nenhum CTA válido da Shopee detectado (esperado: produto marcado, link da Shopee, sacolinha, ou ícone do produto).'
  };
}

/**
 * Detects any forbidden terms in copy text.
 */
export function detectForbiddenPlatformTerms(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const { pattern, term } of FORBIDDEN_PLATFORM_TERMS) {
    if (pattern.test(text)) {
      found.push(term);
    }
  }
  return found;
}

/**
 * Returns prompt guidance describing the CTA requirement.
 */
export function getShopeeCTAPromptGuidance(
  ctaType: ShopeeCTAType,
  evidence: ShopeeCommercialEvidence
): string {
  const samples = SHOPEE_SAMPLE_CTA_PHRASES[ctaType] || SHOPEE_SAMPLE_CTA_PHRASES[ShopeeCTAType.PRODUTO_MARCADO];
  const sampleList = samples.map(s => `"${s}"`).join(', ');

  let conditionalClosing = 'Condição: utilize frases com segurança e aversão à perda condicional ("se ainda estiver disponível", "antes que essa oportunidade passe").';
  if (evidence.hasExplicitShipping) {
    conditionalClosing += ' Evidência confirmada: pode mencionar envio facilitado ou frete com tranquilidade.';
  }

  return `DIRETRIZ DE CTA PARA CENA 3 (FAMÍLIA: ${ctaType}):
- OBRIGATÓRIO: A Cena 3 deve direcionar a ação para "${ctaType.toLowerCase().replace('_', ' ')}" de forma 100% natural na fala.
- Exemplos de encerramento permitidos: ${sampleList}.
- PROIBIDO ABSOLUTO: NUNCA mencione "carrinho laranja", "rede vizinha" ou termos de outras plataformas. A Shopee usa "produto marcado", "link da Shopee", "sacolinha" ou "ícone do produto".
- ${conditionalClosing}`;
}
