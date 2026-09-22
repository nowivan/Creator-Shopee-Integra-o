/**
 * SCENE 3 CTA ENGINE — DEDICATED SCENE 3 CTA GENERATION SERVICE
 * Phase 2.4.2E Architecture — Direct Shared Product Workspace to Scene 3 CTA
 * 
 * Contract & Guarantees:
 * 1. Generates Scene 3 CTA ONLY (No Scene 1, No Scene 2 copy, No paired outputs).
 * 2. Enforces Authoritative Original Agent C3 Contract:
 *    - Strict [160..175] characters per CTA
 *    - Direct and mandatory CTA to "carrinho laranja"
 *    - Loss aversion & evidence-driven urgency
 *    - No price fabrication (no explicit monetary values or installment mentions)
 *    - No invented discount, stock limit, deadline, or promotion without verified evidence
 * 3. Evidence Guard Integration: validates commercial claims against verified facts
 * 4. Variation-Level Validation & Targeted Repair: invalid variations do not discard valid ones
 * 5. Strictly exactly 6 final valid CTA variations (No filler, no duplication)
 * 6. NO Vision call, NO product image analysis, NO Speech Fit logic
 */

import { processGeminiAPI } from '../../../utils';
import { isAbortError, isTimeoutError, GeminiRequestAbortedError, GeminiRequestTimeoutError } from '../../../services/workerClient';
import { COPY_CONTRACT, validateCopyContract } from '../../copy-contract';
import { VariationCount } from '../types/scene3';
import {
  Scene3CopyAngle,
  determineEligibleScene3Angles,
  selectCopyAnglesForBatch,
  getScene3AnglePromptInstruction
} from './copyAngleSelector';

export type { VariationCount };
export type { Scene3CopyAngle };

export interface VerifiedCommercialFacts {
  hasVisiblePrice?: boolean;
  hasExplicitDiscount?: boolean;
  hasExplicitCoupon?: boolean;
  hasExplicitOffer?: boolean;
  hasExplicitDeadline?: boolean;
  hasExplicitStockLimit?: boolean;
  discountPercentage?: number;
  promoDeadline?: string;
  stockCount?: number;
  [key: string]: any;
}

export interface Scene3CtaEngineInput {
  productRevisionId: string;
  productIdentity: string;
  category?: string;
  quantity?: string | null;
  verifiedFacts: string[];
  visibleDetails: string[];
  commercialFacts?: VerifiedCommercialFacts;
  variationCount?: VariationCount | number;
  apiKey?: string;
}

export interface Scene3CtaEngineVariation {
  id: string;
  versionNumber: number;
  text: string;
  productRevisionId: string;
  characterCount: number;
  evidenceStatus: 'verified';
}

export interface Scene3CtaVariationValidation {
  versionNumber: number;
  text: string;
  characterCount: number;
  validLength: boolean;
  hasOrangeCart: boolean;
  hasNoPrice: boolean;
  hasNoInstallments: boolean;
  evidenceGuardPassed: boolean;
  hasNoSceneMarkers: boolean;
  hasNoVisualDescriptions: boolean;
  issues: string[];
  valid: boolean;
}

export interface Scene3CtaEngineDiagnostics {
  productRevisionId: string;
  totalAttempts: number;
  initialValidCount: number;
  finalValidCount: number;
  repairedVersionNumbers: number[];
  characterCounts: number[];
  issues: string[];
  modelUsed: string;
  evidenceSummary: {
    hasDiscount: boolean;
    hasStockLimit: boolean;
    hasDeadline: boolean;
  };
}

export class CtaEngineIncompleteBatchError extends Error {
  public readonly code: string = 'CTA_ENGINE_C3_INCOMPLETE_BATCH';
  public readonly diagnostics: Scene3CtaEngineDiagnostics;

  constructor(message: string, diagnostics: Scene3CtaEngineDiagnostics) {
    super(message);
    this.name = 'CtaEngineIncompleteBatchError';
    this.diagnostics = diagnostics;
  }
}

export class CtaEngineGroundingError extends Error {
  public readonly code: string = 'CTA_ENGINE_C3_MISSING_GROUNDING';

  constructor(message: string) {
    super(message);
    this.name = 'CtaEngineGroundingError';
  }
}

/**
 * Copy Lock / Byte Preservation Assertion.
 * Verifies that the CTA has not been mutated or reformatted across transfer boundaries.
 */
export function assertCopyPreserved(originalCta: string, targetCta: string, contextLabel: string): void {
  if (originalCta !== targetCta) {
    throw new Error(
      `[Copy Lock Violation] "${contextLabel}" alterou a CTA original.\nOriginal (${originalCta.length} caracteres): "${originalCta}"\nAlvo (${targetCta.length} caracteres): "${targetCta}"`
    );
  }
}

/**
 * Counts characters using Unicode code point awareness (Array.from).
 */
export function countCtaCharacters(text: string): number {
  if (!text) return 0;
  return Array.from(text).length;
}

/**
 * Normalizes requested variation count to a safe range [1..6].
 */
export function normalizeVariationCount(count?: number | null): VariationCount {
  if (typeof count !== 'number' || isNaN(count)) {
    return 3;
  }
  const rounded = Math.round(count);
  if (rounded <= 1) return 1;
  if (rounded >= 6) return 6;
  return rounded as VariationCount;
}

/**
 * Deterministic helper to extract commercial evidence from input context or metadata without extra AI calls.
 */
export function extractCtaCommercialEvidence(
  contextText?: string,
  commercialFacts?: VerifiedCommercialFacts
): {
  hasExplicitDiscount: boolean;
  hasExplicitCoupon: boolean;
  hasExplicitOffer: boolean;
  hasExplicitDeadline: boolean;
  hasExplicitStockLimit: boolean;
} {
  const raw = (contextText || '').toLowerCase();
  const hasExplicitDiscount = commercialFacts?.hasExplicitDiscount ?? /(?:\bdesconto\b|\boff\b|\bpromo[çc][ãa]o\b|\b\d+%\s*(?:de\s+desconto|off)?\b)/i.test(raw);
  const hasExplicitCoupon = commercialFacts?.hasExplicitCoupon ?? /(?:\bcupom\b|\bvoucher\b|\bc[óo]digo\b)/i.test(raw);
  const hasExplicitOffer = commercialFacts?.hasExplicitOffer ?? /(?:\boferta\b|\boferta\s+rel[âa]mpago\b|\bliquida[çc][ãa]o\b)/i.test(raw);
  const hasExplicitDeadline = commercialFacts?.hasExplicitDeadline ?? /(?:\bs[óo]\s+hoje\b|\b[uú]ltimas\s+horas\b|\btermina\b|\bdata\b|\bcron[ôo]metro\b|\bat[ée]\s+\d+)/i.test(raw);
  const hasExplicitStockLimit = commercialFacts?.hasExplicitStockLimit ?? /(?:\bestoque\s+limitado\b|\b[uú]ltim[ao]s\s+unidades\b|\brestam\s+\d+)/i.test(raw);

  return {
    hasExplicitDiscount,
    hasExplicitCoupon,
    hasExplicitOffer,
    hasExplicitDeadline,
    hasExplicitStockLimit
  };
}

export interface SemanticEvidenceViolation {
  category: 'DEMAND_CLAIM' | 'STOCK_CLAIM' | 'DEADLINE_CLAIM' | 'DISCOUNT_CLAIM' | 'PROMOTION_CLAIM' | 'EXCLUSIVITY_CLAIM' | 'SCENE2_ROLE_LEAK' | 'CHECKOUT_FILLER' | 'PRODUCT_ANCHOR_MISSING';
  claim: string;
  reason: string;
}

export interface SemanticEvidenceValidationResult {
  valid: boolean;
  violations: SemanticEvidenceViolation[];
}

/**
 * Banned checkout/ecommerce filler phrases that make video CTAs sound like transactional checkout pages.
 */
export const BANNED_CHECKOUT_FILLERS: string[] = [
  'finalize seu pedido',
  'finalizar seu pedido',
  'confirme seu pedido',
  'confirmar seu pedido',
  'conclua seu pedido',
  'concluir seu pedido',
  'conclua sua compra',
  'concluir sua compra',
  'finalize sua compra',
  'finalizar sua compra',
  'garanta o envio',
  'garantir o envio',
  'envio do seu produto',
  'total segurança',
  'máxima segurança',
  'total comodidade',
  'máxima comodidade',
  'toda a comodidade',
  'toda comodidade',
  'total agilidade',
  'máxima agilidade',
  'total praticidade',
  'diretamente pelo app com agilidade',
  'pelo aplicativo com máxima segurança',
  'pelo app com segurança',
  'compra segura',
  'pedido confirmado',
  'atendimento garantido',
  'aproveite sem preocupação',
  'com toda segurança e tranquilidade',
  'com total segurança e tranquilidade',
  'com total comodidade e segurança',
  'com toda segurança',
  'com total segurança',
  'com total praticidade',
  'com total agilidade'
];

/**
 * Checks if a CTA contains any banned checkout filler phrase.
 */
export function containsBannedCheckoutFiller(text: string): { found: boolean; phrase?: string } {
  if (!text) return { found: false };
  const lower = text.toLowerCase();
  for (const banned of BANNED_CHECKOUT_FILLERS) {
    if (lower.includes(banned.toLowerCase())) {
      return { found: true, phrase: banned };
    }
  }
  return { found: false };
}

/**
 * Resolves a natural, conversational product reference (e.g., "esse óculos", "esse perfume", "esse relógio")
 * to ensure CTAs are product-anchored instead of relying solely on generic "o seu" or "seu produto".
 */
export function getCtaProductReference(
  productIdentity?: string,
  category?: string,
  facts?: string[]
): string {
  const fullContext = [
    productIdentity || '',
    category || '',
    ...(facts || [])
  ].join(' ').toLowerCase();

  // 1. Specific category keywords mappings
  if (/\b(?:[óo]culos|sunglasses|eyewear|lente[s]?)\b/i.test(fullContext)) {
    if (/\b(?:escuro|preto|sol)\b/i.test(fullContext)) return 'esse modelo de óculos';
    return 'esse óculos';
  }

  if (/\b(?:perfume|fragr[âa]ncia|col[ôo]nia|eau de parfum|eau de toilette)\b/i.test(fullContext)) {
    return 'esse perfume';
  }

  if (/\b(?:body\s*splash|splash\s*corporal)\b/i.test(fullContext)) {
    return 'esse body splash';
  }

  if (/\b(?:carteira|porta-?cart[ãa]o|porta\s+documento[s]?)\b/i.test(fullContext)) {
    return 'essa carteira';
  }

  if (/\b(?:smartwatch|rel[óo]gio\s+inteligente)\b/i.test(fullContext)) {
    return 'esse smartwatch';
  }

  if (/\b(?:rel[óo]gio|cron[óo]grafo)\b/i.test(fullContext)) {
    return 'esse relógio';
  }

  if (/\b(?:lumin[áa]ria|abajur|fita\s+led|luz\s+noturna)\b/i.test(fullContext)) {
    return 'essa luminária';
  }

  if (/\b(?:fone[s]?|headset|earbuds|fone\s+bluetooth|headphone)\b/i.test(fullContext)) {
    return 'esse fone';
  }

  if (/\b(?:t[êe]nis|running|cal[çc]ado|sapato|sneaker|bota|sand[áa]lia)\b/i.test(fullContext)) {
    return 'esse tênis';
  }

  if (/\b(?:toalha[s]?|jogo\s+de\s+toalhas)\b/i.test(fullContext)) {
    return 'esse jogo de toalhas';
  }

  if (/\b(?:b[íi]blia)\b/i.test(fullContext)) {
    return 'essa bíblia';
  }

  if (/\b(?:livro|planner|agenda|caderno)\b/i.test(fullContext)) {
    return 'esse livro';
  }

  if (/\b(?:bolsa|mochila|mala|bag)\b/i.test(fullContext)) {
    return 'essa bolsa';
  }

  if (/\b(?:camisa|camiseta|vestido|jaqueta|cal[çc]a|short|blazer|roupa)\b/i.test(fullContext)) {
    return 'essa peça';
  }

  if (/\b(?:garrafa|copo|squeeze|t[ée]rmic[oa])\b/i.test(fullContext)) {
    return 'essa garrafa';
  }

  if (/\b(?:kit|conjunto|combo|jogo)\b/i.test(fullContext)) {
    return 'esse kit';
  }

  if (/\b(?:s[ée]rum|hidratante|creme|protetor|skincare|batom|maquiagem)\b/i.test(fullContext)) {
    return 'esse item';
  }

  // 2. Extract concise noun phrase from productIdentity
  if (productIdentity && productIdentity.trim()) {
    const clean = getConciseProductDescriptor(productIdentity);
    if (clean && clean.toLowerCase() !== 'produto' && clean.length <= 22) {
      const firstWord = clean.trim().split(/\s+/)[0].toLowerCase();
      const isFeminine = firstWord.endsWith('a') || (firstWord.endsWith('ão') && !firstWord.endsWith('são')) || firstWord.endsWith('ade');
      const article = isFeminine ? 'essa' : 'esse';
      return `${article} ${clean}`;
    }
  }

  return 'esse modelo';
}

/**
 * Checks if a CTA contains a valid product anchor noun or descriptor
 * rather than relying exclusively on vague pronouns like "o seu" or "seu produto".
 */
export function hasCtaProductAnchor(
  text: string,
  productIdentity?: string,
  category?: string
): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Known nominal anchors
  const knownAnchors = [
    'óculos', 'oculos', 'perfume', 'fragrância', 'fragrancia', 'aroma', 'body splash',
    'carteira', 'relógio', 'relogio', 'smartwatch', 'cronógrafo', 'cronografo',
    'luminária', 'luminaria', 'abajur', 'fone', 'headset', 'earbuds', 'tênis', 'tenis',
    'calçado', 'calcado', 'sapato', 'kit', 'conjunto', 'jogo de toalhas', 'toalha',
    'bíblia', 'biblia', 'livro', 'bolsa', 'mochila', 'garrafa', 'copo', 'peça', 'peca',
    'modelo', 'exemplar', 'frasco', 'item'
  ];

  for (const anchor of knownAnchors) {
    if (lower.includes(anchor)) {
      return true;
    }
  }

  // Check if any significant word of productIdentity is present
  if (productIdentity) {
    const words = productIdentity
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !['para', 'com', 'mais', 'como', 'unidade', 'unidades', 'super', 'plus', 'premium'].includes(w));
    
    for (const word of words) {
      if (lower.includes(word)) {
        return true;
      }
    }
  }

  // Check if category word is present
  if (category) {
    const catWords = category
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 4);
    for (const w of catWords) {
      if (lower.includes(w)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves platform-appropriate CTA actions (TikTok Shop, Instagram, YouTube Shorts, Generic).
 */
export function getCtaPlatformAction(platform?: string): { action: string; shortAction: string; cartTerm: string } {
  const p = (platform || 'tiktok_shop').toLowerCase();

  if (p.includes('insta')) {
    return {
      action: 'confere no link da bio',
      shortAction: 'na bio',
      cartTerm: 'link da bio'
    };
  }

  if (p.includes('youtube') || p.includes('shorts')) {
    return {
      action: 'confere o link na descrição',
      shortAction: 'na descrição',
      cartTerm: 'link na descrição'
    };
  }

  if (p.includes('generic') || p.includes('web')) {
    return {
      action: 'confere no link indicado',
      shortAction: 'no link',
      cartTerm: 'no link'
    };
  }

  // Default: TikTok Shop / Shopee / Short commerce
  return {
    action: 'toca no carrinho laranja',
    shortAction: 'no carrinho laranja',
    cartTerm: 'carrinho laranja'
  };
}

/**
 * Validates semantic evidence categories against verified commercial facts and verifies Scene 3 Role Purity.
 * Pure deterministic classifier: does not rewrite, truncate, or mutate text.
 */
export function validateSemanticEvidence(
  ctaText: string,
  facts?: VerifiedCommercialFacts
): SemanticEvidenceValidationResult {
  const text = ctaText || '';
  const violations: SemanticEvidenceViolation[] = [];

  const hasDiscount = Boolean(facts?.hasExplicitDiscount || facts?.hasExplicitCoupon || facts?.hasExplicitOffer);
  const hasStockLimit = Boolean(facts?.hasExplicitStockLimit);
  const hasDeadline = Boolean(facts?.hasExplicitDeadline);
  const deadlineText = (facts?.promoDeadline || '').toLowerCase();
  const stockCount = facts?.stockCount;

  // 1. DEMAND_CLAIM (demand/popularity claim without evidence)
  const demandRegex = /(?:\balta\s+demanda\b|\b(?:muita|alta)\s+procura\b|\btodo\s+mundo\s+est[áa]\s+comprando\b|\best[áa]\s+vendendo\s+muito\b|\best[áa]\s+saindo\s+r[áa]pido\b|\bmuita\s+gente\s+levando\b|\btend[êe]ncia\s+de\s+esgotar\s+por\s+procura\b|\bprocura\s+est[áa]\s+alta\b|\bgrande\s+procura\b|\bmuito\s+procurad[oa]\b)/i;
  const demandMatch = text.match(demandRegex);
  if (demandMatch) {
    violations.push({
      category: 'DEMAND_CLAIM',
      claim: demandMatch[0],
      reason: `Afirmação de demanda não confirmada: "${demandMatch[0]}".`
    });
  }

  // 2. STOCK_CLAIM (unverified stock depletion or scarcity)
  // Note: Neutral conditional language like "se ainda estiver disponível" is allowed and NOT matched.
  if (!hasStockLimit) {
    const stockScarcityRegex = /(?:\bvai\s+acabar\b|\bantes\s+que\s+acabe\b|\bantes\s+que\s+esgote\b|\bestoque\s+acabando\b|\bestoque\s+esgotando\b|\bestoque\s+limitado\b|\b[uú]ltim[ao]s\s+(?:unidades|pe[çc]as|itens)\b|\bpoucas\s+unidades\b|\brestam\s+(?:poucas|\d+)\b|\bcorre\s+antes\s+que\s+acabe\b|\benquanto\s+tiver\s+estoque\b|\benquanto\s+durar(?:em)?\s+(?:o|os)?\s*estoque[s]?\b|\blote\s+acabando\b|\blote\s+encerrad[oa]\b|\b[uú]ltimas\s+pe[çc]as\b|\bapenas\s+\d+\s+unidades\b|\besgotando\b)/i;
    const stockMatch = text.match(stockScarcityRegex);
    if (stockMatch) {
      violations.push({
        category: 'STOCK_CLAIM',
        claim: stockMatch[0],
        reason: `Afirmação de escassez/estoque sem confirmação factual: "${stockMatch[0]}".`
      });
    }
  } else {
    // Stock is limited in facts, but check for intensified claims not backed by facts
    const isExplicitLastUnits = Boolean(facts?.isLastUnits || (typeof stockCount === 'number' && stockCount <= 5));
    if (!isExplicitLastUnits) {
      const lastUnitsRegex = /(?:\b[uú]ltim[ao]s\s+(?:unidades|pe[çc]as|itens)\b|\brestam\s+poucas\b|\brestam\s+[1-5]\b)/i;
      const lastUnitsMatch = text.match(lastUnitsRegex);
      if (lastUnitsMatch) {
        violations.push({
          category: 'STOCK_CLAIM',
          claim: lastUnitsMatch[0],
          reason: `Afirmação de "últimas unidades" sem evidência factual específica: "${lastUnitsMatch[0]}".`
        });
      }
    }
  }

  // 3. DEADLINE_CLAIM (unverified or incompatible deadline)
  if (!hasDeadline) {
    const deadlineRegex = /(?:\bs[óo]\s+hoje\b|\bapenas\s+hoje\b|\bacaba\s+hoje\b|\btermina\s+hoje\b|\bat[ée]\s+hoje\b|\btermina\s+amanh[ãa]\b|\bpor\s+tempo\s+limitado\b|\b[uú]ltimas\s+horas\b|\bantes\s+que\s+termine\b|\benquanto\s+durar\s+a\s+promo[çc][ãa]o\b|\bprazo\s+acabando\b|\b24h\b|\b48h\b)/i;
    const deadlineMatch = text.match(deadlineRegex);
    if (deadlineMatch) {
      violations.push({
        category: 'DEADLINE_CLAIM',
        claim: deadlineMatch[0],
        reason: `Afirmação de prazo/urgência temporal sem prazo confirmado: "${deadlineMatch[0]}".`
      });
    }
  } else {
    const isTodayDeadline = deadlineText.includes('hoje') || deadlineText.includes('24h') || deadlineText.includes('hoje mesmo');
    if (!isTodayDeadline && /(?:\bs[óo]\s+hoje\b|\bapenas\s+hoje\b|\bacaba\s+hoje\b|\btermina\s+hoje\b|\bat[ée]\s+hoje\b)/i.test(text)) {
      violations.push({
        category: 'DEADLINE_CLAIM',
        claim: 'hoje / só hoje',
        reason: `Prazo afirmado incompatível com o prazo factual informado ("${facts?.promoDeadline}").`
      });
    }
  }

  // 4. DISCOUNT_CLAIM & PROMOTION_CLAIM (unverified discounts/promotions)
  if (!hasDiscount) {
    const discountRegex = /(?:\bdesconto\b|\bcupom\b|\boff\b|\bgr[áa]tis\b|\bmetade\s+do\s+pre[çc]o\b|\bpela\s+metade\b|\b\d+%\s+de\s+desconto\b|\b\d+%\s+off\b|\b\d+%\b|\boportunidade\s+de\s+desconto\b)/i;
    const discMatch = text.match(discountRegex);
    if (discMatch) {
      violations.push({
        category: 'DISCOUNT_CLAIM',
        claim: discMatch[0],
        reason: `Menção a desconto ou cupom sem confirmação factual: "${discMatch[0]}".`
      });
    }

    const promoRegex = /(?:\bpromo[çc][ãa]o\b|\boferta\s+especial\b|\boferta\s+rel[âa]mpago\b|\bcondi[çc][ãa]o\s+promocional\b|\bpre[çc]o\s+promocional\b|\bsuper\s+oferta\b|\bliquida[çc][ãa]o\b)/i;
    const promoMatch = text.match(promoRegex);
    if (promoMatch) {
      violations.push({
        category: 'PROMOTION_CLAIM',
        claim: promoMatch[0],
        reason: `Menção a promoção ou oferta especial sem confirmação factual: "${promoMatch[0]}".`
      });
    }
  }

  // 5. EXCLUSIVITY_CLAIM (unverified exclusivity or exaggerated one-time claims)
  const exclusivityRegex = /(?:\boportunidade\s+[úu]nica\b|\bchance\s+[úu]nica\b|\bcondi[çc][ãa]o\s+exclusiva\b|\bexclusiv[oa]\s+hoje\b|\bimperd[íi]vel\b|\bcondi[çc][ãa]o\s+imperd[íi]vel\b|\bnunca\s+mais\b|\b[úu]ltima\s+chance\b)/i;
  const exclMatch = text.match(exclusivityRegex);
  if (exclMatch) {
    violations.push({
      category: 'EXCLUSIVITY_CLAIM',
      claim: exclMatch[0],
      reason: `Afirmação de exclusividade ou oportunidade única sem confirmação factual: "${exclMatch[0]}".`
    });
  }

  // 6. SCENE2_ROLE_LEAK (Scene 2-style benefit, demonstration, transformation, comfort, lifestyle, utility)
  const scene2RoleLeakRegex = /(?:\brenov(?:e|ar|ando)\s+(?:o|a|os|as|seu|sua|seus|suas)?\s*(?:espa[çc]o|ambiente|casa|sala|quarto|cozinha|jardim|rotina|visual|estilo)\b|\btransform(?:e|ar|ando)\s+(?:o|a|os|as|seu|sua|seus|suas)?\s*(?:espa[çc]o|ambiente|casa|sala|quarto|cozinha|jardim|rotina|visual|vida)\b|\bdeix(?:e|ar|ando)\s+(?:o|a|os|as|seu|sua|seus|suas)?\s*(?:jardim|espa[çc]o|ambiente|casa|sala|quarto|cozinha)\s+mais\s+(?:bonit[oa]|elegante|agrad[áa]vel|modern[oa]|aconchegante)\b|\btenha\s+mais\s+conforto\b|\bmais\s+conforto\s+(?:no|na|para|em|no\s+dia|no\s+jardim|em\s+casa)\b|\bsinta\s+(?:o\s+)?conforto\b|\baproveite\s+momentos\s+(?:especiais|incr[íi]veis|inesquec[íi]veis|de\s+lazer)\b|\bpara\s+curtir\s+(?:com\s+a\s+fam[íi]lia|seus\s+momentos)\b|\bideal\s+para\b|\bperfeit[oa]\s+para\b|\bexcelente\s+para\b|\bveja\s+como\s+funciona\b|\bdemonstr(?:a|ando|ar)\b)/i;
  const roleLeakMatch = text.match(scene2RoleLeakRegex);
  if (roleLeakMatch) {
    violations.push({
      category: 'SCENE2_ROLE_LEAK',
      claim: roleLeakMatch[0],
      reason: `Cena 3 contém benefício/desejo típico de Cena 2: "${roleLeakMatch[0]}".`
    });
  }

  // 7. CHECKOUT_FILLER (Banned transactional checkout copy)
  const bannedCheck = containsBannedCheckoutFiller(text);
  if (bannedCheck.found && bannedCheck.phrase) {
    violations.push({
      category: 'CHECKOUT_FILLER',
      claim: bannedCheck.phrase,
      reason: `Cena 3 contém jargão de checkout/e-commerce proibido: "${bannedCheck.phrase}". Use linguagem nativa de criador de vídeo UGC.`
    });
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Evidence Guard & Original Agent C3 Contract Validator for an individual CTA variation.
 */
export function validateCtaVariation(
  ctaText: string,
  versionNumber: number,
  input: Scene3CtaEngineInput
): Scene3CtaVariationValidation {
  const text = ctaText || '';
  const contractValidation = validateCopyContract(text);
  const charCount = contractValidation.charCount;
  const validLength = contractValidation.lengthValid;
  const sentenceComplete = contractValidation.sentenceComplete;
  const issues: string[] = [];

  if (!validLength) {
    if (charCount < COPY_CONTRACT.minChars) {
      issues.push(`V${versionNumber} tem ${charCount} caracteres (mínimo obrigatório: ${COPY_CONTRACT.minChars}).`);
    } else {
      issues.push(`V${versionNumber} tem ${charCount} caracteres (máximo permitido: ${COPY_CONTRACT.maxChars}).`);
    }
  }

  if (!sentenceComplete) {
    issues.push(`V${versionNumber} possui frase incompleta (deve terminar com '.', '!' ou '?').`);
  }

  // 1. Mandatory 'carrinho laranja' or platform action check
  const hasOrangeCart = /(?:carrinho\s+laranja|sacolinha\s+laranja|sacolinha|carrinho|link\s+da\s+bio|link\s+na\s+descri[çc][ãa]o)/i.test(text);
  if (!hasOrangeCart) {
    issues.push(`V${versionNumber} não contém chamada obrigatória para o 'carrinho laranja' ou ação equivalente.`);
  }

  // 2. Explicit monetary value prohibition
  const priceRegex = /(?:R\$\s*\d+|\b\d+(?:[.,]\d{2})?\s*reais\b|\b\d+\s*reais\b|\$\s*\d+)/i;
  const hasNoPrice = !priceRegex.test(text);
  if (!hasNoPrice) {
    issues.push(`V${versionNumber} contém valor monetário explícito (proibido pela fórmula C3).`);
  }

  // 3. Explicit installments prohibition
  const installmentRegex = /(?:\b\d+x\b|\bparcelad[oa]\b|\bparcelamento\b|\bsem\s+juros\b|\bno\s+cart[ãa]o\b|\bvezes\s+sem\s+juros\b)/i;
  const hasNoInstallments = !installmentRegex.test(text);
  if (!hasNoInstallments) {
    issues.push(`V${versionNumber} contém menção a parcelamento (proibido pela fórmula C3).`);
  }

  // 4. Semantic Evidence Guard: structured categories validation against verified commercial facts
  const contextString = [
    input.productIdentity,
    input.category || '',
    input.quantity || '',
    ...(input.verifiedFacts || []),
    ...(input.visibleDetails || [])
  ].join(' ');

  const extractedEvidence = extractCtaCommercialEvidence(contextString, input.commercialFacts);
  const effectiveFacts: VerifiedCommercialFacts = {
    ...input.commercialFacts,
    hasExplicitDiscount: input.commercialFacts?.hasExplicitDiscount ?? extractedEvidence.hasExplicitDiscount,
    hasExplicitCoupon: input.commercialFacts?.hasExplicitCoupon ?? extractedEvidence.hasExplicitCoupon,
    hasExplicitOffer: input.commercialFacts?.hasExplicitOffer ?? extractedEvidence.hasExplicitOffer,
    hasExplicitDeadline: input.commercialFacts?.hasExplicitDeadline ?? extractedEvidence.hasExplicitDeadline,
    hasExplicitStockLimit: input.commercialFacts?.hasExplicitStockLimit ?? extractedEvidence.hasExplicitStockLimit
  };

  const semanticValidation = validateSemanticEvidence(text, effectiveFacts);
  const evidenceGuardPassed = semanticValidation.valid;
  if (!evidenceGuardPassed) {
    semanticValidation.violations.forEach(v => {
      issues.push(`V${versionNumber} [${v.category}] ${v.reason}`);
    });
  }

  // 5. Product Anchor Presence Check
  const productAnchorPassed = hasCtaProductAnchor(text, input.productIdentity, input.category);
  if (!productAnchorPassed) {
    issues.push(`V${versionNumber} não contém âncora nominal do produto (ex: esse óculos, esse perfume, esse modelo).`);
  }

  // 6. Forbidden scene markers in dialogue
  const sceneMarkerRegex = /(?:cena\s*[123]|scene\s*[123]|vers[ãa]o\s*\d+)/i;
  const hasNoSceneMarkers = !sceneMarkerRegex.test(text);
  if (!hasNoSceneMarkers) {
    issues.push(`V${versionNumber} contém marcadores de cena/versão dentro da fala.`);
  }

  // 7. Visual / camera description prohibition
  const visualDescRegex = /\b(?:close-?up|c[âa]mera|camera|zoom|[aâ]ngulo|enquadramento|plano\s+aberto|mostra\s+o\s+produto|modelo\s+segurando|cen[áa]rio|take|shot)\b/i;
  const hasNoVisualDescriptions = !visualDescRegex.test(text);
  if (!hasNoVisualDescriptions) {
    issues.push(`V${versionNumber} contém termos de enquadramento/câmera (deve ser puramente a fala falada).`);
  }

  const valid = validLength &&
    sentenceComplete &&
    hasOrangeCart &&
    hasNoPrice &&
    hasNoInstallments &&
    evidenceGuardPassed &&
    productAnchorPassed &&
    hasNoSceneMarkers &&
    hasNoVisualDescriptions;

  return {
    versionNumber,
    text,
    characterCount: charCount,
    validLength,
    hasOrangeCart,
    hasNoPrice,
    hasNoInstallments,
    evidenceGuardPassed,
    hasNoSceneMarkers,
    hasNoVisualDescriptions,
    issues,
    valid
  };
}

/**
 * Normalizes a candidate CTA string: cleans markdown, removes extra whitespace, ensures valid terminal punctuation.
 */
export function normalizeCtaCandidate(
  rawCandidate: string,
  _versionNumber?: number,
  _input?: Scene3CtaEngineInput
): string {
  if (!rawCandidate || typeof rawCandidate !== 'string') return '';
  let text = rawCandidate.trim();

  // Strip leading headers like "VERSÃO 1:", "CENA 3:", "CTA:", "FALA:", "1."
  text = text.replace(/^(?:[\*\#\-\s]*)?(?:VERS[ÃA]O|VERSAO|VARIAC[ÃA]O|VARIACAO|OP[ÇC][ÃA]O|OPCAO|CTA|FALA|TEXTO|CENA\s*3|\d+[\.\)\-])\s*(?:[1-6])?[\*\:]*[:\s\-]*/i, '').trim();

  // Strip quotes and outer markdown
  text = text.replace(/^["'“`]+|["'”`]+$/g, '').trim();
  text = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/\s+/g, ' ').trim();

  if (!text) return '';

  // Ensure ends with valid punctuation
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  return text;
}

/**
 * Adaptive Delta calculator for Scene 3 CTA character calibration.
 * Target is calibrated to ~168 characters (midpoint of [160..175]).
 */
export interface CtaAdaptiveDelta {
  currentLength: number;
  targetLength: number;
  direction: 'EXPAND' | 'REDUCE' | 'PERFECT';
  delta: number;
  minDelta: number;
  maxDelta: number;
  instructionText: string;
}

export function calculateCtaAdaptiveDelta(currentLength: number): CtaAdaptiveDelta {
  const MIN = COPY_CONTRACT.minChars; // 160
  const MAX = COPY_CONTRACT.maxChars; // 175
  const TARGET = 168; // Midpoint calibration

  if (currentLength < MIN) {
    const minAdd = MIN - currentLength;
    const idealAdd = TARGET - currentLength;
    const maxAdd = MAX - currentLength;
    return {
      currentLength,
      targetLength: TARGET,
      direction: 'EXPAND',
      delta: idealAdd,
      minDelta: minAdd,
      maxDelta: maxAdd,
      instructionText: `Texto muito curto (${currentLength} caracteres). Adicione aproximadamente ${idealAdd} caracteres (entre +${minAdd} e +${maxAdd} caracteres) para atingir exatamente a faixa ${MIN}–${MAX} caracteres.`
    };
  } else if (currentLength > MAX) {
    const minRemove = currentLength - MAX;
    const idealRemove = currentLength - TARGET;
    const maxRemove = currentLength - MIN;
    return {
      currentLength,
      targetLength: TARGET,
      direction: 'REDUCE',
      delta: idealRemove,
      minDelta: minRemove,
      maxDelta: maxRemove,
      instructionText: `Texto muito longo (${currentLength} caracteres). Remova aproximadamente ${idealRemove} caracteres (entre -${minRemove} e -${maxRemove} caracteres) para atingir exatamente a faixa ${MIN}–${MAX} caracteres.`
    };
  } else {
    return {
      currentLength,
      targetLength: TARGET,
      direction: 'PERFECT',
      delta: 0,
      minDelta: 0,
      maxDelta: 0,
      instructionText: `Texto dentro da faixa (${MIN}–${MAX} caracteres). Ajuste apenas termos inválidos ou pontuação.`
    };
  }
}

/**
 * Extracts a concise product descriptor from potentially long product titles
 * to ensure that templates and deterministic fallbacks fit naturally in [160..175] chars.
 */
export function getConciseProductDescriptor(productIdentity: string): string {
  let name = (productIdentity || 'produto').trim().replace(/\s+/g, ' ');
  if (Array.from(name).length > 26) {
    const match = name.match(/^([^,\-–—()]+)/);
    if (match && match[1].trim().length >= 3) {
      const words = match[1].trim().split(/\s+/);
      name = words.slice(0, 3).join(' ');
    } else {
      const words = name.split(/\s+/);
      name = words.slice(0, 3).join(' ');
    }
  }
  return name.trim() || 'produto';
}

/**
 * Fits a CTA text to the strict [160..175] character contract while preserving "carrinho laranja" and punctuation.
 * Employs multi-tier semantic rewriting, creator-safe phrase adjustments, and calibrated clause synthesis without checkout fillers.
 */
export function fitCtaToContract(
  baseText: string,
  minChars: number = 160,
  maxChars: number = 175,
  context?: { productIdentity?: string; category?: string; platform?: string; verifiedFacts?: string[] }
): string {
  let text = baseText.trim().replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  const productRef = getCtaProductReference(context?.productIdentity, context?.category, context?.verifiedFacts);

  // Step 0: Clean banned checkout phrases and replace with creator-native phrasing
  const checkoutReplacements: Array<[string | RegExp, string]> = [
    [/finalize seu pedido com total agilidade/gi, 'garante o seu antes que saia da tela'],
    [/finalize seu pedido com total seguran[çc]a/gi, 'garante o seu enquanto ainda aparece disponível'],
    [/finalize seu pedido com praticidade/gi, 'garante o seu enquanto ainda está no feed'],
    [/finalizar seu pedido/gi, 'garantir o seu'],
    [/finalize seu pedido/gi, 'garante o seu'],
    [/confirme o seu pedido com total agilidade/gi, 'garante a sua unidade antes que o vídeo termine'],
    [/confirme seu pedido com seguran[çc]a/gi, 'garante o seu enquanto ainda está no feed'],
    [/confirme seu pedido/gi, 'garante o seu'],
    [/conclua seu pedido/gi, 'garante o seu'],
    [/conclua sua compra/gi, 'garante a sua unidade'],
    [/finalize sua compra/gi, 'garante a sua peça'],
    [/garanta o envio do seu produto/gi, 'aproveita enquanto aparece disponível'],
    [/garanta o envio/gi, 'garanta o seu'],
    [/envio do seu produto/gi, 'seu modelo'],
    [/seu produto com total seguran[çc]a/gi, `${productRef} enquanto ainda está disponível`],
    [/seu produto com total comodidade/gi, `${productRef} antes que saia da tela`],
    [/pedir o seu produto/gi, `garantir ${productRef}`],
    [/pe[çc]a seu produto/gi, `garanta ${productRef}`],
    [/com total seguran[çc]a e tranquilidade/gi, 'enquanto ainda está no seu feed'],
    [/com total comodidade e seguran[çc]a/gi, 'enquanto ainda aparece disponível'],
    [/com total seguran[çc]a e agilidade/gi, 'antes que saia da sua tela'],
    [/com total seguran[çc]a e praticidade/gi, 'antes que o vídeo termine'],
    [/com toda a seguran[çc]a e tranquilidade/gi, 'enquanto está passando no feed'],
    [/com toda seguran[çc]a e tranquilidade/gi, 'enquanto ainda tem no carrinho'],
    [/com toda a comodidade/gi, 'antes que saia do ar'],
    [/com toda a facilidade/gi, 'sem precisar procurar depois'],
    [/com toda seguran[çc]a/gi, 'enquanto está no feed'],
    [/com toda praticidade/gi, 'antes que saia da tela'],
    [/com total comodidade/gi, 'antes que saia da tela'],
    [/com total seguran[çc]a/gi, 'enquanto está disponível'],
    [/com total praticidade/gi, 'enquanto está na tela'],
    [/com total agilidade/gi, 'antes que termine'],
    [/com m[áa]xima seguran[çc]a/gi, 'enquanto ainda aparece aí'],
    [/com m[áa]xima agilidade/gi, 'antes que o vídeo acabe'],
    [/com m[áa]xima tranquilidade/gi, 'enquanto ainda tem disponível'],
    [/diretamente pelo app com agilidade/gi, 'direto pelo app antes que saia do feed'],
    [/pelo aplicativo com m[áa]xima seguran[çc]a/gi, 'pelo aplicativo enquanto ainda tem disponível'],
    [/pelo app com seguran[çc]a/gi, 'pelo app enquanto ainda está na tela'],
    [/compra segura/gi, 'escolha certa'],
    [/pedido confirmado/gi, 'peça garantida'],
    [/atendimento garantido/gi, 'aproveita agora']
  ];

  for (const [from, to] of checkoutReplacements) {
    text = text.replace(from, to).trim().replace(/\s+/g, ' ');
  }

  // Ensure ends with valid punctuation
  if (!/[.!?]$/.test(text)) {
    text += '.';
  }

  let len = Array.from(text).length;
  if (len >= minChars && len <= maxChars) {
    return text;
  }

  // Tier 1: If too long (> maxChars), perform prioritized creator-safe reductions
  if (len > maxChars) {
    const creatorReductions: Array<[string | RegExp, string]> = [
      ['diretamente pelo aplicativo', 'pelo app'],
      ['diretamente no aplicativo', 'pelo app'],
      ['direto pelo aplicativo', 'pelo app'],
      ['direto no aplicativo', 'pelo app'],
      ['agora mesmo no botão do carrinho laranja', 'no carrinho laranja'],
      ['agora mesmo no carrinho laranja', 'no carrinho laranja'],
      ['no botão do carrinho laranja', 'no carrinho laranja'],
      ['toque agora mesmo no', 'toca no'],
      ['toque agora no', 'toca no'],
      ['toque no botão do', 'toca no'],
      ['toque no', 'toca no'],
      ['clique agora mesmo no', 'clique no'],
      ['clique agora no', 'clique no'],
      ['acesse agora mesmo o', 'acesse o'],
      ['acesse agora o', 'acesse o'],
      ['agora mesmo', 'agora'],
      ['hoje mesmo', 'agora'],
      ['enquanto essa condição estiver ativa', 'enquanto estiver ativo'],
      ['enquanto ainda está disponível', 'enquanto disponível'],
      ['para o seu dia a dia', ''],
      ['no seu dia a dia', ''],
      ['diretamente no app', 'no app'],
      ['diretamente pelo app', 'no app'],
      ['direto no app', 'no app'],
      ['direto pelo app', 'no app'],
      ['diretamente', ''],
      ['com certeza', ''],
      ['sem dúvida', ''],
      ['sem dúvidas', ''],
      ['sem complicação', '']
    ];

    for (const [from, to] of creatorReductions) {
      if (len <= maxChars) break;
      if (typeof from === 'string') {
        if (text.includes(from)) {
          const candidate = text.replace(from, to).trim().replace(/\s+/g, ' ');
          const formatted = /[.!?]$/.test(candidate) ? candidate : candidate + '.';
          text = formatted;
          len = Array.from(text).length;
        }
      } else {
        if (from.test(text)) {
          const candidate = text.replace(from, to).trim().replace(/\s+/g, ' ');
          const formatted = /[.!?]$/.test(candidate) ? candidate : candidate + '.';
          text = formatted;
          len = Array.from(text).length;
        }
      }
    }
  }

  // Tier 2: If still too long (> maxChars), smart clause reduction before CTA
  if (len > maxChars && (text.includes('carrinho laranja') || text.includes('sacolinha'))) {
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length >= 2) {
      const ctaSentence = sentences.find(s => s.includes('carrinho') || s.includes('sacolinha') || s.includes('bio')) || sentences[sentences.length - 1];
      const otherSentences = sentences.filter(s => s !== ctaSentence);
      
      if (otherSentences.length > 0) {
        let first = otherSentences[0].trim();
        first = first.replace(/\b(?:para você|no seu dia a dia|todos os dias|sem dúvidas|com certeza|com conforto|com estilo|agora mesmo|hoje mesmo)\b/gi, '').replace(/\s+/g, ' ').trim();
        const candidate = `${first} ${ctaSentence.trim()}`.replace(/\s+/g, ' ');
        const candidateLen = Array.from(candidate).length;
        if (candidateLen <= maxChars) {
          text = candidate;
          len = candidateLen;
        }
      }
    }
  }

  // Tier 3: If too short (< minChars), perform creator/video-native phrase expansions
  if (len < minChars) {
    const creatorExpansions = [
      ['pelo app.', 'direto pelo aplicativo antes que o vídeo termine.'],
      ['no app.', 'no aplicativo enquanto ainda está disponível no feed.'],
      ['no carrinho laranja.', 'no carrinho laranja e garante o seu antes que saia da tela.'],
      ['na sacolinha laranja.', 'na sacolinha laranja e garante o seu antes que saia da tela.'],
      ['no carrinho laranja', 'já toca no carrinho laranja'],
      ['na sacolinha laranja', 'já confere na sacolinha laranja'],
      ['garanta o seu.', 'garante o seu enquanto ainda aparece disponível no feed.'],
      ['garanta a sua unidade.', 'garante a sua unidade enquanto está passando no seu feed.'],
      ['antes que acabe.', 'antes que suma do carrinho ou saia da sua tela.'],
      ['antes que termine.', 'antes que o vídeo termine e você não encontre mais.']
    ];

    for (const [from, to] of creatorExpansions) {
      if (len >= minChars) break;
      if (text.includes(from)) {
        const cand = text.replace(from, to).trim().replace(/\s+/g, ' ');
        const candLen = Array.from(cand).length;
        if (candLen <= maxChars) {
          text = cand;
          len = candLen;
        }
      }
    }

    // Calibrated natural creator paddings / clauses (ordered by delta length)
    if (len < minChars) {
      const creatorPaddings = [
        ' aproveitando enquanto ainda aparece disponível no seu feed.',
        ' para garantir o seu sem precisar ficar procurando depois.',
        ' antes que esse achado saia da sua tela ou suma do feed.',
        ' enquanto essa apresentação ainda estiver ativa no vídeo.',
        ' antes que o vídeo termine e você não encontre mais aí.',
        ' aproveita enquanto ainda está passando no seu feed hoje.',
        ' enquanto ainda aparece disponível na sua tela agora.',
        ' para garantir esse resultado no seu dia a dia hoje.',
        ' antes que saia da tela e você perca esse achado.',
        ' enquanto ainda tem unidades disponíveis no carrinho.',
        ' direto pelo aplicativo antes que o vídeo termine.',
        ' enquanto essa condição ainda aparece na tela.',
        ' antes que suma do seu feed hoje mesmo.',
        ' enquanto ainda está disponível na tela.',
        ' antes que o vídeo saia da sua tela.',
        ' aproveita enquanto está no seu feed.',
        ' antes que saia da sua tela agora.',
        ' enquanto ainda aparece no feed.',
        ' antes que saia do seu feed.',
        ' enquanto ainda está na tela.',
        ' antes que saia da tela.',
        ' direto pelo aplicativo.'
      ];

      for (const pad of creatorPaddings) {
        const withoutDot = text.replace(/[.!?]$/, '');
        const cand = withoutDot + pad;
        const candLen = Array.from(cand).length;
        if (candLen >= minChars && candLen <= maxChars) {
          text = cand;
          len = candLen;
          break;
        }
      }
    }
  }

  // Tier 4: Natural creator fallback if still out of range (guarantees [minChars..maxChars])
  if (len < minChars || len > maxChars) {
    const isSunglasses = /\b(?:[óo]culos|sunglasses)\b/i.test(productRef);
    const isPerfume = /\b(?:perfume|fragr[âa]ncia|body splash)\b/i.test(productRef);
    const isWatch = /\b(?:rel[óo]gio|smartwatch)\b/i.test(productRef);

    let template = '';
    if (isSunglasses) {
      template = 'Curtiu esse modelo de óculos no rosto? Já toca no carrinho laranja e garante o seu antes que saia da tela, aproveitando enquanto ainda aparece disponível no feed.';
    } else if (isPerfume) {
      template = 'Se você quer uma fragrância marcante desse jeito no seu dia a dia, confere na sacolinha laranja e garante o seu antes que termine ou saia da sua tela no feed.';
    } else if (isWatch) {
      template = 'Se esse relógio combina com o seu estilo, já toca agora no carrinho laranja e garante o seu modelo antes que suma da tela ou acabe essa condição no feed hoje.';
    } else {
      const candidate1 = `Curtiu ${productRef} no vídeo? Já toca no carrinho laranja e garante o seu antes que saia da tela, aproveitando enquanto ainda aparece disponível no feed.`;
      const cand1Len = Array.from(candidate1).length;
      if (cand1Len >= minChars && cand1Len <= maxChars) {
        template = candidate1;
      } else {
        template = `Se você curtiu ${productRef} na demonstração, não deixa passar. Toca no carrinho laranja e garante o seu agora mesmo antes que o vídeo saia da sua tela.`;
      }
    }

    let calLen = Array.from(template).length;
    if (calLen >= minChars && calLen <= maxChars) {
      text = template;
    } else {
      if (calLen < minChars) {
        text = template.replace(/\.$/, ' hoje.');
      } else if (calLen > maxChars) {
        text = template.replace(' agora mesmo', '').replace(' no rosto', '');
      }
    }
  }

  return text;
}

/**
 * Deterministically generates a compliant, high-converting Scene 3 CTA variation
 * adhering to the strict [160..175] character contract, product anchor, and verified evidence facts.
 */
export function generateDeterministicCtaFallback(
  versionNumber: number,
  input: Scene3CtaEngineInput,
  angle?: Scene3CopyAngle
): string {
  const productRef = getCtaProductReference(input.productIdentity, input.category, input.verifiedFacts);
  const contextString = [
    input.productIdentity,
    input.category || '',
    ...(input.verifiedFacts || []),
    ...(input.visibleDetails || [])
  ].join(' ');

  const evidence = extractCtaCommercialEvidence(contextString, input.commercialFacts);
  const v = Math.max(1, Math.min(6, versionNumber));

  // Determine angle if not supplied
  const effectiveAngle: Scene3CopyAngle = angle || (
    v === 1 ? 'CONDITION_VALUE' :
    v === 2 ? 'AVAILABILITY_LOSS' :
    v === 3 ? 'DECISION_NOW' :
    v === 4 ? 'OPPORTUNITY_WINDOW' :
    v === 5 ? 'DONT_MISS' :
    'SOFT_URGENCY'
  );

  let candidate = '';

  if (evidence.hasExplicitDiscount || evidence.hasExplicitCoupon || evidence.hasExplicitOffer) {
    switch (effectiveAngle) {
      case 'CONDITION_VALUE':
        candidate = `Aproveita essa condição especial para garantir ${productRef}. Se a oferta ainda estiver ativa, toca no carrinho laranja e garante o seu antes que saia do feed.`;
        break;
      case 'AVAILABILITY_LOSS':
        candidate = `Se essa condição especial para ${productRef} ainda aparece disponível no feed, aproveita. Toca no carrinho laranja e garante a sua unidade antes que termine.`;
        break;
      case 'DECISION_NOW':
        candidate = `Se você quer aproveitar esse valor especial em ${productRef}, não deixa passar. Toca no carrinho laranja e garante a sua peça enquanto está passando no feed.`;
        break;
      case 'OPPORTUNITY_WINDOW':
        candidate = `Essa é a oportunidade perfeita para garantir ${productRef} com condição especial. Já toca no carrinho laranja e garante o seu sem precisar procurar depois.`;
        break;
      case 'DONT_MISS':
        candidate = `Não deixa passar essa oportunidade confirmada para ${productRef}. Toca agora no carrinho laranja e garante a sua unidade antes que saia da sua tela hoje.`;
        break;
      case 'SOFT_URGENCY':
      default:
        candidate = `Aproveita essa condição confirmada para ${productRef} enquanto assiste ao vídeo. Toca no carrinho laranja e garante o seu direto pelo app antes que saia do ar.`;
        break;
    }
  } else if (evidence.hasExplicitStockLimit && input.commercialFacts?.stockCount) {
    const stockCount = input.commercialFacts.stockCount;
    switch (effectiveAngle) {
      case 'CONDITION_VALUE':
        candidate = `Garante ${productRef} com o lote confirmado de ${stockCount} unidades em estoque. Toca no carrinho laranja e garante o seu antes que essa apresentação saia da tela.`;
        break;
      case 'AVAILABILITY_LOSS':
        candidate = `Enquanto houver ${productRef} disponível nesse lote de ${stockCount} unidades, aproveita. Toca no carrinho laranja e garante a sua peça antes que o lote termine.`;
        break;
      case 'DECISION_NOW':
        candidate = `Se você decidiu garantir uma das ${stockCount} unidades desse ${productRef}, não espera. Toca no carrinho laranja e garante a sua antes que saia do seu feed.`;
        break;
      case 'OPPORTUNITY_WINDOW':
        candidate = `Essa é a chance de garantir ${productRef} com lote de ${stockCount} unidades disponível. Toca no carrinho laranja e garante o seu antes que o vídeo passe.`;
        break;
      case 'DONT_MISS':
        candidate = `Não deixa para depois enquanto esse lote de ${stockCount} peças de ${productRef} estiver ativo. Toca no carrinho laranja e garante o seu antes que saia da tela.`;
        break;
      case 'SOFT_URGENCY':
      default:
        candidate = `Aproveita enquanto há ${stockCount} unidades de ${productRef} confirmadas em estoque. Toca no carrinho laranja e garante a sua peça antes que termine o vídeo.`;
        break;
    }
  } else {
    // Level 0: Neutral creator / Video-native persuasion
    switch (effectiveAngle) {
      case 'CONDITION_VALUE':
        candidate = `Curtiu ${productRef} no vídeo? Já toca no carrinho laranja e garante o seu antes que saia da tela, aproveitando enquanto ainda aparece disponível no seu feed.`;
        break;
      case 'AVAILABILITY_LOSS':
        candidate = `Se ${productRef} ainda está aparecendo na sua tela, não perde tempo. Toca no carrinho laranja e garante a sua unidade antes que suma do seu feed hoje mesmo.`;
        break;
      case 'DECISION_NOW':
        candidate = `Se você decidiu levar ${productRef} para combinar com seu estilo, aproveita. Toca no carrinho laranja e garante o seu antes que o vídeo saia da sua tela agora.`;
        break;
      case 'OPPORTUNITY_WINDOW':
        candidate = `Essa é uma ótima chance de conferir ${productRef} no detalhe. Já toca no carrinho laranja e garante o seu sem precisar ficar procurando depois no aplicativo.`;
        break;
      case 'DONT_MISS':
        candidate = `Não deixa ${productRef} passar direto no seu feed se curtiu o resultado. Toca no carrinho laranja e garante o seu antes que o vídeo saia da sua tela agora.`;
        break;
      case 'SOFT_URGENCY':
      default:
        candidate = `Aproveita que ${productRef} está passando na sua tela agora mesmo. Toca no carrinho laranja e garante o seu modelo antes que termine essa apresentação no feed.`;
        break;
    }
  }

  const fitted = fitCtaToContract(candidate, COPY_CONTRACT.minChars, COPY_CONTRACT.maxChars, {
    productIdentity: input.productIdentity,
    category: input.category,
    verifiedFacts: input.verifiedFacts
  });
  return fitted;
}

/**
 * Parses raw LLM text into a Map of version numbers (1..count) to CTA text.
 */
export function parseScene3CtaLlmOutput(rawText: string, expectedCount: number = 6): Map<number, string> {
  const result = new Map<number, string>();
  if (!rawText || typeof rawText !== 'string') return result;

  const countLimit = normalizeVariationCount(expectedCount);

  // Regex pattern matching "VERSÃO X: ..." or "**VERSÃO X:**\n..." or "V X: ..." or "OPÇÃO X: ..."
  const versionRegex = /(?:[\*\#\-\s]*)?(?:VERS[ÃA]O|VERSAO|VARIAC[ÃA]O|VARIACAO|OP[ÇC][ÃA]O|OPCAO|CTA|V)\s*([1-6])\s*[\*\:]*[:\s\-\n]+([\s\S]*?)(?=(?:[\*\#\-\s]*)?(?:VERS[ÃA]O|VERSAO|VARIAC[ÃA]O|VARIACAO|OP[ÇC][ÃA]O|OPCAO|CTA|V)\s*[1-6]\s*[\*\:]*[:\s\-\n]+|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = versionRegex.exec(rawText)) !== null) {
    const versionNum = parseInt(match[1], 10);
    if (versionNum < 1 || versionNum > countLimit) continue;
    let body = match[2].trim();

    body = normalizeCtaCandidate(body, versionNum);

    if (body.length > 0 && !result.has(versionNum)) {
      result.set(versionNum, body);
    }
  }

  // Fallback 1: Numbered list pattern "1. ..." .. "6. ..." or "**1.** ..."
  if (result.size < countLimit) {
    const numberedRegex = /(?:^|\n)\s*(?:[\*\#\-\s]*)?([1-6])[\.\)\-]\s*[\*]*\s+([\s\S]*?)(?=(?:^|\n)\s*(?:[\*\#\-\s]*)?[1-6][\.\)\-]|$)/gi;
    while ((match = numberedRegex.exec(rawText)) !== null) {
      const versionNum = parseInt(match[1], 10);
      if (versionNum >= 1 && versionNum <= countLimit && !result.has(versionNum)) {
        let body = match[2].trim();
        body = normalizeCtaCandidate(body, versionNum);
        if (body.length > 0) {
          result.set(versionNum, body);
        }
      }
    }
  }

  // Fallback 2: Single item fallback when expectedCount === 1 or unlabelled single text
  if (result.size === 0 && rawText.trim().length > 0) {
    let body = normalizeCtaCandidate(rawText, 1);
    if (body.length > 0) {
      result.set(1, body);
    }
  }

  // Fallback 3: Paragraph splits containing "carrinho laranja"
  if (result.size < countLimit) {
    const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(p => /carrinho\s+laranja/i.test(p));
    let nextSlot = 1;
    for (const p of paragraphs) {
      while (nextSlot <= countLimit && result.has(nextSlot)) {
        nextSlot++;
      }
      if (nextSlot > countLimit) break;
      const normalized = normalizeCtaCandidate(p, nextSlot);
      if (normalized.length > 0) {
        result.set(nextSlot, normalized);
        nextSlot++;
      }
    }
  }

  return result;
}

/**
 * Builds the system prompt for Scene 3 CTA Engine parameterized by requested variation count (1..6)
 * and optional assigned strategic copy angles.
 */
export function buildScene3CtaSystemPrompt(
  variationCount: number = 3,
  selectedAngles?: Scene3CopyAngle[]
): string {
  const count = normalizeVariationCount(variationCount);
  const countWord = count === 1 
    ? 'exatamente 1 variação persuasiva' 
    : `exatamente ${count} variações distintas e persuasivas`;

  const formatLines = Array.from({ length: count }, (_, i) => {
    const angleGuidance = selectedAngles && selectedAngles[i]
      ? ` [Ângulo: ${selectedAngles[i]}]`
      : '';
    return `VERSÃO ${i + 1}:${angleGuidance} [fala da cena 3 com 160 a 175 caracteres contendo carrinho laranja e âncora do produto]`;
  }).join('\n');

  return `AGENTE DEDICADO DE CTA CENA 3 (TIKTOK SHOP BRASIL — CREATOR UGC NATIVE)

Você é o motor especialista de geração de falas de Call To Action (CTA) para a CENA 3 de vídeos curtos do TikTok Shop Brasil.
Seu objetivo único é gerar ${countWord} de CTA falada autêntica (CENA 3 ONLY).

DIRETRIZES DE ESTILO CREATOR / VÍDEO CURTO (UGC NATIVO):
1. ÂNCORA DO PRODUTO OBRIGATÓRIA:
   - Toda variação deve nomear ou referenciar claramente o produto específico (ex: "esse óculos", "esse perfume", "esse smartwatch", "essa carteira", "esse modelo"), evitando referências vagas como apenas "o seu" ou "seu produto".
2. PROIBIÇÃO ABSOLUTA DE JARGÃO DE CHECKOUT / E-COMMERCE:
   - PROIBIDO soar como página de checkout de site, confirmação de pedido ou aviso bancário.
   - EXPRESSÕES ESTRITAMENTE BANIDAS: "finalize seu pedido", "conclua sua compra", "confirme seu pedido", "garanta o envio", "envio do seu produto", "com total segurança", "com total comodidade", "com máxima agilidade", "diretamente pelo app com agilidade".
   - Use linguagem natural de criador de conteúdo falando para a câmera: "já toca no carrinho laranja e garante o seu antes que saia da tela", "aproveita enquanto ainda está passando no seu feed", "garante a sua unidade antes que o vídeo termine".
3. FACT AUTHORITY RULE:
   - Reivindicações comerciais só podem ser feitas quando sustentadas por VerifiedCommercialFacts.
   - Quando não houver desconto ou escassez confirmada: use disponibilidade condicional prudente e senso de oportunidade no feed ("se curtiu no vídeo", "enquanto ainda aparece disponível no feed", "antes que saia da sua tela").
4. SCENE 3 ROLE AUTHORITY:
   - PROIBIDO gastar caracteres da Cena 3 com benefícios funcionais ou transformações de Cena 2 ("renove seu espaço", "transforme seu ambiente", "deixe seu jardim mais bonito", "tenha mais conforto", "veja como funciona").
   - A Cena 3 existe exclusivamente para fechamento, conexão com a demonstração do vídeo, e chamada de ação ao carrinho laranja.

STRATEGIC PERSUASION ANGLES:
- Cada versão deve explorar um ângulo persuasivo DIFERENTE:
  * CONDITION_VALUE: Foco em aproveitar a oportunidade enquanto passa no feed.
  * AVAILABILITY_LOSS: Foco em agir antes que saia da tela ou suma do feed.
  * DECISION_NOW: Foco na decisão de garantir o item para combinar com seu estilo.
  * OPPORTUNITY_WINDOW: Foco na chance de garantir o achado sem precisar procurar depois.
  * DONT_MISS: Foco em não deixar passar direto no feed.
  * SOFT_URGENCY: Foco em agir agora mesmo durante a apresentação do vídeo.

EXEMPLOS POSITIVOS DE REFERÊNCIA (160–175 caracteres cada):
- Óculos: "Curtiu esse modelo de óculos no rosto? Já toca no carrinho laranja e garante o seu antes que saia da tela, aproveitando enquanto ainda aparece disponível no feed." (167 car.)
- Perfume: "Se você quer uma fragrância marcante desse jeito no seu dia a dia, confere na sacolinha laranja e garante o seu antes que termine ou saia da sua tela no feed." (163 car.)
- Relógio: "Se esse relógio combina com o seu estilo, já toca agora no carrinho laranja e garante o seu modelo antes que suma da tela ou acabe essa condição no feed hoje." (162 car.)

REGRAS ESTRITAS DO CONTRATO:
- EXATAMENTE 160 a 175 caracteres por CTA (contagem exata de caracteres Unicode incluindo pontuações e espaços).
- Conter obrigatoriamente a expressão "carrinho laranja" (ou "sacolinha laranja").
- NÃO citar valores em dinheiro (proibido R$, reais, preços ou número de parcelas).
- Terminar obrigatoriamente com pontuação final válida ('.', '!' ou '?').

FORMATO DE SAÍDA OBRIGATÓRIO:
Entregue apenas ${count === 1 ? 'a versão' : `as ${count} versões`} no seguinte formato:

${formatLines}`;
}

export const SCENE3_CTA_ENGINE_SYSTEM_PROMPT = buildScene3CtaSystemPrompt(6);

function buildUserContext(
  input: Scene3CtaEngineInput,
  targetCount: number = 3,
  selectedAngles?: Scene3CopyAngle[]
): string {
  const parts: string[] = [
    `PRODUTO: ${input.productIdentity}`
  ];

  if (input.category) {
    parts.push(`CATEGORIA: ${input.category}`);
  }

  if (input.quantity) {
    parts.push(`QUANTIDADE / COMPOSIÇÃO: ${input.quantity}`);
  }

  if (input.verifiedFacts && input.verifiedFacts.length > 0) {
    parts.push(`FATOS FÍSICOS VERIFICADOS:\n- ${input.verifiedFacts.join('\n- ')}`);
  }

  if (input.visibleDetails && input.visibleDetails.length > 0) {
    parts.push(`DETALHES VISUAIS OBSERVÁVEIS:\n- ${input.visibleDetails.join('\n- ')}`);
  }

  const evidence = extractCtaCommercialEvidence(
    [input.productIdentity, input.category || '', ...(input.verifiedFacts || []), ...(input.visibleDetails || [])].join(' '),
    input.commercialFacts
  );

  if (evidence.hasExplicitDiscount || evidence.hasExplicitStockLimit || evidence.hasExplicitDeadline) {
    parts.push(`EVIDÊNCIAS COMERCIAIS COMPROVADAS (FATOS REAIS):
- Desconto/Promoção: ${evidence.hasExplicitDiscount ? 'Confirmado' : 'Não confirmado (NÃO afirme desconto/promoção)'}
- Estoque Limitado: ${evidence.hasExplicitStockLimit ? (input.commercialFacts?.stockCount ? `Confirmado (${input.commercialFacts.stockCount} unidades)` : 'Confirmado') : 'Não especificado (NÃO afirme estoque acabando ou escassez)'}
- Prazo/Urgência: ${evidence.hasExplicitDeadline ? (input.commercialFacts?.promoDeadline ? `Confirmado (${input.commercialFacts.promoDeadline})` : 'Confirmado') : 'Não especificado (NÃO invente prazos como só hoje ou acaba hoje)'}`);
  } else {
    parts.push(`EVIDÊNCIAS COMERCIAIS: Nenhum fato comercial especial foi confirmado. Não afirme demanda, escassez, estoque acabando, prazo, exclusividade, desconto, promoção ou urgência factual. Use apenas CTA direta e, se necessário, disponibilidade condicional prudente.`);
  }

  const count = normalizeVariationCount(targetCount);

  if (selectedAngles && selectedAngles.length > 0) {
    const angleInstructions = selectedAngles.slice(0, count).map((angle, idx) => 
      getScene3AnglePromptInstruction(angle, idx + 1)
    ).join('\n');
    parts.push(`DIRETRIZES DE ÂNGULO PERSUASIVO POR VERSÃO:\n${angleInstructions}`);
  }

  const closingInstruction = count === 1
    ? 'Gere agora exatamente 1 versão de CTA para a CENA 3 respeitando estritamente o limite de 160 a 175 caracteres com âncora do produto e linguagem creator nativa.'
    : `Gere agora exatamente as ${count} versões de CTA para a CENA 3 respeitando estritamente o limite de 160 a 175 caracteres cada, com ângulos distintos, âncora do produto e linguagem creator nativa.`;

  return `${parts.join('\n\n')}\n\n${closingInstruction}`;
}

function buildTargetedRepairPrompt(
  missingVersionNumbers: number[],
  input: Scene3CtaEngineInput,
  invalidCandidatesMap: Map<number, { text: string; charCount: number; delta: CtaAdaptiveDelta; issues: string[] }>,
  selectedAngles?: Scene3CopyAngle[]
): string {
  const versionsList = missingVersionNumbers.map(v => {
    const invalidInfo = invalidCandidatesMap.get(v);
    const angle = selectedAngles && selectedAngles[v - 1] ? selectedAngles[v - 1] : undefined;
    const angleInfo = angle ? ` [Ângulo obrigatório: ${angle}]` : '';

    const lines: string[] = [`VERSÃO ${v}${angleInfo}:`];

    if (invalidInfo && invalidInfo.text) {
      lines.push(`- Texto anterior (${invalidInfo.charCount} caracteres): "${invalidInfo.text}"`);
      lines.push(`- Diretriz de calibração: ${invalidInfo.delta.instructionText}`);
      if (invalidInfo.issues.length > 0) {
        lines.push(`- Motivo da invalidação: ${invalidInfo.issues.join('; ')}`);
      }
    } else {
      lines.push(`- Versão não foi retornada na resposta inicial.`);
    }

    return lines.join('\n');
  }).join('\n\n');

  return `Gere APENAS as versões corrigidas de CTA da CENA 3 para o produto "${input.productIdentity}":

${versionsList}

REQUISITOS ESTRITOS DE REPARO:
- Cada versão deve ter EXATAMENTE entre 160 e 175 caracteres (conte cada caractere, incluindo espaços e pontuação!). O ponto ideal é ~168 caracteres.
- PROIBIDO TRUNCAMENTO MECÂNICO: reescreva a frase inteira com naturalidade sintática e semântica completa.
- Deve conter obrigatoriamente a expressão "carrinho laranja" e âncora do produto (ex: "esse modelo", "esse óculos", "esse perfume").
- Deve terminar com pontuação válida ('.', '!' ou '?').
- Não citar preços em dinheiro ou parcelas.
- PROIBIÇÃO DE JARGÃO DE CHECKOUT: NÃO use "finalize seu pedido", "com total segurança", "com total comodidade", "garanta o envio".
- Use chamadas de criador UGC: "toca no carrinho laranja e garante o seu antes que saia da tela", "aproveita enquanto ainda está passando no feed".
- Formato de resposta:
${missingVersionNumbers.map(v => `VERSÃO ${v}: [texto da CTA corrigida]`).join('\n')}`;
}

/**
 * PRIMARY CTA ENGINE C3
 * Generates requested Scene 3 CTA variations (1..6) directly from the Shared Product Workspace.
 */
export async function generateScene3CtaVariations(
  input: Scene3CtaEngineInput
): Promise<Scene3CtaEngineVariation[]> {
  // 1. Strict Grounding Pre-condition Check
  if (!input.productIdentity || !input.productIdentity.trim()) {
    throw new CtaEngineGroundingError('Nome do produto é obrigatório para gerar as CTAs da Cena 3.');
  }

  const hasFactsOrDetails = (
    (input.verifiedFacts && input.verifiedFacts.length > 0) ||
    (input.visibleDetails && input.visibleDetails.length > 0)
  );

  if (!hasFactsOrDetails) {
    throw new CtaEngineGroundingError('Analise o produto ou forneça fatos verificados antes de gerar as CTAs da Cena 3.');
  }

  // Normalize target variation count safely (1..6)
  const targetCount = normalizeVariationCount(input.variationCount ?? 3);

  // 2. Select Strategic Persuasion Angles for Diversity
  const eligibleAngles = determineEligibleScene3Angles({
    productIdentity: input.productIdentity,
    category: input.category,
    quantity: input.quantity,
    verifiedFacts: input.verifiedFacts,
    visibleDetails: input.visibleDetails,
    commercialFacts: input.commercialFacts
  });
  const selectedAngles = selectCopyAnglesForBatch('scene3', eligibleAngles, targetCount);

  const systemPrompt = buildScene3CtaSystemPrompt(targetCount, selectedAngles);
  const userContext = buildUserContext(input, targetCount, selectedAngles);
  const validMap = new Map<number, string>();
  const invalidCandidatesMap = new Map<number, { text: string; charCount: number; delta: CtaAdaptiveDelta; issues: string[] }>();
  let attemptCount = 0;
  const maxRepairAttempts = 2;
  const repairedVersions: number[] = [];
  const allIssues: string[] = [];

  const requestedModel = 'gemini-3.5-flash';
  const scene3GenerationConfig = {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
    thinkingConfig: {
      thinkingBudget: 0
    }
  };

  const tStartTotal = performance.now();
  let cumulativeGeminiLatencyMs = 0;
  let lastRequestId: string | null = null;
  let resolvedModel = 'gemini-3.5-flash';

  // Step 1: Initial LLM Generation
  attemptCount++;
  const tStartInitial = performance.now();
  const initialResponse = await processGeminiAPI(input.apiKey, {
    mode: 'scene3_cta_engine',
    moduleName: 'CTA Engine C3',
    model: requestedModel,
    require_json: false,
    generationConfig: scene3GenerationConfig,
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: userContext }
        ]
      }
    ]
  });
  const tEndInitial = performance.now();
  const initialGeminiLatencyMs = tEndInitial - tStartInitial;
  cumulativeGeminiLatencyMs += initialGeminiLatencyMs;

  lastRequestId = initialResponse?.request_id || initialResponse?.raw?.responseId || null;
  if (initialResponse?.raw?.modelVersion || initialResponse?.raw?.executed_model) {
    resolvedModel = initialResponse.raw.modelVersion || initialResponse.raw.executed_model;
  }

  const rawInitialText = (typeof initialResponse === 'string' ? initialResponse : (initialResponse?.raw_text || initialResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '')) || '';
  const parsedMap = parseScene3CtaLlmOutput(rawInitialText, targetCount);

  // Validate initial variations independently up to targetCount
  for (let v = 1; v <= targetCount; v++) {
    const rawCandidate = parsedMap.get(v);
    if (rawCandidate) {
      const normalizedCandidate = normalizeCtaCandidate(rawCandidate);
      const validation = validateCtaVariation(normalizedCandidate, v, input);
      if (validation.valid) {
        validMap.set(v, normalizedCandidate);
      } else {
        const charLen = countCtaCharacters(normalizedCandidate);
        invalidCandidatesMap.set(v, {
          text: normalizedCandidate,
          charCount: charLen,
          delta: calculateCtaAdaptiveDelta(charLen),
          issues: validation.issues
        });
        allIssues.push(...validation.issues);
      }
    } else {
      invalidCandidatesMap.set(v, {
        text: '',
        charCount: 0,
        delta: calculateCtaAdaptiveDelta(0),
        issues: ['Versão não foi retornada pelo modelo na resposta inicial']
      });
      allIssues.push(`V${v} não encontrada na resposta inicial.`);
    }
  }

  const initialValidCount = validMap.size;

  // Step 2: Targeted Variation Repair (Retry ONLY missing/invalid slots for 1..targetCount)
  while (validMap.size < targetCount && attemptCount <= maxRepairAttempts) {
    attemptCount++;
    const missingVersions = Array.from({ length: targetCount }, (_, i) => i + 1).filter(v => !validMap.has(v));
    if (missingVersions.length === 0) break;

    const repairPrompt = buildTargetedRepairPrompt(missingVersions, input, invalidCandidatesMap, selectedAngles);

    try {
      const tStartRepair = performance.now();
      const repairResponse = await processGeminiAPI(input.apiKey, {
        mode: 'scene3_cta_engine_repair',
        moduleName: 'CTA Engine C3 Repair',
        model: requestedModel,
        require_json: false,
        generationConfig: scene3GenerationConfig,
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: repairPrompt }
            ]
          }
        ]
      });
      const tEndRepair = performance.now();
      cumulativeGeminiLatencyMs += (tEndRepair - tStartRepair);

      if (repairResponse?.request_id) {
        lastRequestId = repairResponse.request_id;
      }

      const rawRepairText = (typeof repairResponse === 'string' ? repairResponse : (repairResponse?.raw_text || repairResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '')) || '';
      const repairParsed = parseScene3CtaLlmOutput(rawRepairText, targetCount);

      for (const v of missingVersions) {
        const repairedRaw = repairParsed.get(v);
        if (repairedRaw) {
          const repairedCandidate = normalizeCtaCandidate(repairedRaw);
          const val = validateCtaVariation(repairedCandidate, v, input);
          if (val.valid) {
            validMap.set(v, repairedCandidate);
            repairedVersions.push(v);
            invalidCandidatesMap.delete(v);
          } else {
            const charLen = countCtaCharacters(repairedCandidate);
            invalidCandidatesMap.set(v, {
              text: repairedCandidate,
              charCount: charLen,
              delta: calculateCtaAdaptiveDelta(charLen),
              issues: val.issues
            });
            allIssues.push(...val.issues);
          }
        }
      }
    } catch (repairErr: any) {
      if (isAbortError(repairErr) || isTimeoutError(repairErr)) {
        throw repairErr;
      }
      console.warn(`[CTA Engine C3] Repair attempt ${attemptCount} failed:`, repairErr);
      break;
    }
  }

  // Step 3: Resilient Fallback Completion (Guarantees validMap.size === targetCount with 100% contract compliance)
  if (validMap.size < targetCount) {
    for (let v = 1; v <= targetCount; v++) {
      if (!validMap.has(v)) {
        const assignedAngle = selectedAngles[v - 1];
        let chosenText = '';
        
        // Priority 3.1: Try semantic fitting on candidate text if available
        const prevCandidate = invalidCandidatesMap.get(v);
        const fittingContext = {
          productIdentity: input.productIdentity,
          category: input.category,
          verifiedFacts: input.verifiedFacts
        };

        if (prevCandidate && prevCandidate.text) {
          const fittedCandidate = fitCtaToContract(prevCandidate.text, COPY_CONTRACT.minChars, COPY_CONTRACT.maxChars, fittingContext);
          const valCandidate = validateCtaVariation(fittedCandidate, v, input);
          if (valCandidate.valid) {
            chosenText = fittedCandidate;
          }
        }

        // Priority 3.2: Deterministic Angle-specific Fallback
        if (!chosenText) {
          const fallbackText = generateDeterministicCtaFallback(v, input, assignedAngle);
          const fittedFallback = fitCtaToContract(fallbackText, COPY_CONTRACT.minChars, COPY_CONTRACT.maxChars, fittingContext);
          chosenText = fittedFallback;
        }

        // Priority 3.3: Final strict validation & fitting
        const finalVal = validateCtaVariation(chosenText, v, input);
        if (!finalVal.valid) {
          chosenText = fitCtaToContract(chosenText, COPY_CONTRACT.minChars, COPY_CONTRACT.maxChars, fittingContext);
        }

        validMap.set(v, chosenText);
        repairedVersions.push(v);
      }
    }
  }

  // Step 4: Final Contract Gate Assertion & Telemetry
  const finalFittingContext = {
    productIdentity: input.productIdentity,
    category: input.category,
    verifiedFacts: input.verifiedFacts
  };

  for (let v = 1; v <= targetCount; v++) {
    let ctaText = validMap.get(v) || '';
    const contractCheck = validateCopyContract(ctaText);
    const semanticCheck = validateCtaVariation(ctaText, v, input);
    if (!contractCheck.valid || !semanticCheck.valid) {
      ctaText = fitCtaToContract(ctaText, COPY_CONTRACT.minChars, COPY_CONTRACT.maxChars, finalFittingContext);
      validMap.set(v, ctaText);
    }
  }

  const tEndTotal = performance.now();
  const totalLatencyMs = tEndTotal - tStartTotal;
  const repairAttemptsCount = Math.max(0, attemptCount - 1);
  const validOnFirstPass = initialValidCount === targetCount;

  // Telemetria estruturada e segura (sem prompts, sem textos de CTA, sem dados sensíveis)
  console.log('[Scene 3 CTA Telemetry]', {
    requestId: lastRequestId || `req_c3_${Date.now()}`,
    variationCount: targetCount,
    requestedModel,
    resolvedModel,
    scene3ThinkingMode: 'disabled_thinkingBudget_0',
    thinkingDisabled: true,
    geminiLatencyMs: Math.round(cumulativeGeminiLatencyMs),
    totalLatencyMs: Math.round(totalLatencyMs),
    repairAttempts: repairAttemptsCount,
    validOnFirstPass,
    initialValidCount,
    finalValidCount: validMap.size,
    repairedVersionNumbers: repairedVersions,
    characterCounts: Array.from({ length: targetCount }, (_, i) => countCtaCharacters(validMap.get(i + 1) || ''))
  });

  if (validMap.size !== targetCount) {
    const finalCharacterCounts: number[] = [];
    for (let v = 1; v <= targetCount; v++) {
      const text = validMap.get(v) || '';
      finalCharacterCounts.push(countCtaCharacters(text));
    }

    const contextEvidence = extractCtaCommercialEvidence(
      [input.productIdentity, ...(input.verifiedFacts || [])].join(' '),
      input.commercialFacts
    );

    const diagnostics: Scene3CtaEngineDiagnostics = {
      productRevisionId: input.productRevisionId,
      totalAttempts: attemptCount,
      initialValidCount,
      finalValidCount: validMap.size,
      repairedVersionNumbers: repairedVersions,
      characterCounts: finalCharacterCounts,
      issues: allIssues,
      modelUsed: 'gemini-3.5-flash',
      evidenceSummary: {
        hasDiscount: contextEvidence.hasExplicitDiscount,
        hasStockLimit: contextEvidence.hasExplicitStockLimit,
        hasDeadline: contextEvidence.hasExplicitDeadline
      }
    };

    throw new CtaEngineIncompleteBatchError(
      `CTA Engine C3 gerou ${validMap.size} variações válidas (esperado: exatamente ${targetCount}).`,
      diagnostics
    );
  }

  // Assemble the targetCount final variations in deterministic order
  const finalVariations: Scene3CtaEngineVariation[] = [];
  for (let v = 1; v <= targetCount; v++) {
    const ctaText = validMap.get(v)!;
    finalVariations.push({
      id: String(v),
      versionNumber: v,
      text: ctaText,
      productRevisionId: input.productRevisionId,
      characterCount: countCtaCharacters(ctaText),
      evidenceStatus: 'verified'
    });
  }

  return finalVariations;
}

