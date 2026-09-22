/**
 * SHOPEE COPY VALIDATOR & DETERMINISTIC REPAIR ENGINE
 * 
 * Rules:
 * 1. Strictly enforces 160–175 characters (target 168–172 chars) using Unicode code points.
 * 2. Scene 2 must contain NO CTA and NO visual camera directions.
 * 3. Scene 3 must contain a valid Shopee CTA and NEVER contain "carrinho laranja".
 * 4. Claim safety checks: numeric price, installments, discounts, coupons, free shipping,
 *    reviews/stars, scarcity, and authenticity claims without explicit evidence.
 * 5. Deterministic micro-repair:
 *    - 150–159 chars: safe semantic extension.
 *    - 176–185 chars: safe semantic pruning (filler words removal).
 *    - Arbitrary string slicing/truncation is STRICTLY FORBIDDEN.
 */

import {
  countCharacters,
  detectVisualDescription,
  extractCommercialEvidence
} from '../agente-de-copy-clean/validator';
import {
  ShopeeCopyVariation,
  ShopeeCommercialEvidence,
  ShopeeCTAType,
  ShopeeCopyStructure,
  ShopeeCopyStyle,
  SHOPEE_MIN_CHARS,
  SHOPEE_MAX_CHARS,
  SHOPEE_SWEET_SPOT_MIN,
  SHOPEE_SWEET_SPOT_MAX
} from './types';
import {
  isAllowedShopeeCTA,
  detectForbiddenPlatformTerms,
  SHOPEE_CTA_PATTERNS
} from './shopeeCTAResolver';

export { countCharacters, detectVisualDescription, extractCommercialEvidence };

export interface SceneValidationViolation {
  code: string;
  message: string;
  field: 'scene2' | 'scene3';
}

export interface SceneValidationResult {
  valid: boolean;
  charCount: number;
  violations: SceneValidationViolation[];
  cleanedText: string;
}

// Regex patterns for Claim Safety (using Unicode property escapes for accurate accented word boundaries)
export const PRICE_CURRENCY_PATTERN = /(?:R\$\s*\d+|\b\d+\s*reais\b|\$\s*\d+)/i;
export const INSTALLMENT_PATTERN = /(?:^|[^\p{L}\p{N}])(?:\d+\s*x(?:\s+sem\s+juros)?|parcelad[oa]|no\s+cart[ãa]o)(?:[^\p{L}\p{N}]|$)/iu;
export const DISCOUNT_PATTERN = /(?:^|[^\p{L}\p{N}])(?:\d+%\s*(?:de\s+)?desconto|desconto\s+exclusivo|metade\s+do\s+pre[çc]o|pre[çc]o\s+de\s+f[áa]brica|promo[çc][ãa]o\s+rel[âa]mpago)(?:[^\p{L}\p{N}]|$)/iu;
export const COUPON_PATTERN = /(?:^|[^\p{L}\p{N}])(?:cupom|cupons|c[óo]digo\s+promocional)(?:[^\p{L}\p{N}]|$)/iu;
export const FREE_SHIPPING_PATTERN = /(?:^|[^\p{L}\p{N}])(?:frete\s+gr[áa]tis|frete\s+gratuito)(?:[^\p{L}\p{N}]|$)/iu;
export const SCARCITY_STOCK_PATTERN = /(?:^|[^\p{L}\p{N}])(?:[uú]ltimas\s+(?:\d+\s+)?unidades|estoque\s+(?:acabando|esgotando|quase\s+no\s+fim)|poucas\s+pe[çc]as|acabe\s+tudo\s+no\s+estoque)(?:[^\p{L}\p{N}]|$)/iu;
export const DEADLINE_PATTERN = /(?:^|[^\p{L}\p{N}])(?:s[óo]\s+hoje|termina\s+hoje|[uú]ltimas\s+horas|s[óo]\s+nesta\s+semana|encerra\s+em\s+breve)(?:[^\p{L}\p{N}]|$)/iu;
export const REVIEWS_STARS_PATTERN = /(?:^|[^\p{L}\p{N}])(?:\d+\s*estrelas|cinco\s+estrelas|mais\s+vendido\s+da\s+shopee|milhares\s+de\s+avalia[çc][õo]es)(?:[^\p{L}\p{N}]|$)/iu;
export const AUTHENTICITY_PATTERN = /(?:^|[^\p{L}\p{N}])(?:100%\s*original|produto\s+original(?:\s+de\s+f[áa]brica)?|aut[êe]ntico|garantia\s+de\s+originalidade)(?:[^\p{L}\p{N}]|$)/iu;
export const GUARANTEE_PATTERN = /(?:^|[^\p{L}\p{N}])(?:garantia\s+incondicional|\d+\s+dias\s+de\s+garantia|devolu[çc][ãa]o\s+garantida)(?:[^\p{L}\p{N}]|$)/iu;

// Scene 2 CTA forbidden patterns
export const SCENE2_CTA_FORBIDDEN_PATTERNS = [
  /\bclic?a(?:r|ndo)?\b/i,
  /\bgarant(?:a|ir|indo)\b/i,
  /\bcompr(?:e|ar|ando)\b/i,
  /\badquir(?:a|ir)\b/i,
  /\bpe[çc]a\s+o\s+seu\b/i,
  /\blink\b/i,
  /\bproduto\s+marcado\b/i,
  /\bsacolinha\b/i,
  /\bshopee\b/i,
  /\bcarrinho\b/i
];

/**
 * Validates Scene 2 (demonstration/practical benefit).
 * Must contain NO CTA, NO camera directions, NO price, and adhere strictly to 160-175 chars.
 */
export function validateShopeeScene2(
  text: string,
  evidence: ShopeeCommercialEvidence
): SceneValidationResult {
  const violations: SceneValidationViolation[] = [];
  const charCount = countCharacters(text);

  if (charCount < SHOPEE_MIN_CHARS || charCount > SHOPEE_MAX_CHARS) {
    violations.push({
      code: 'INVALID_CHARACTER_COUNT',
      message: `Cena 2 possui ${charCount} caracteres. Requerido: entre ${SHOPEE_MIN_CHARS} e ${SHOPEE_MAX_CHARS}.`,
      field: 'scene2'
    });
  }

  // Camera direction check
  if (detectVisualDescription(text)) {
    violations.push({
      code: 'VISUAL_CAMERA_DIRECTION',
      message: 'Cena 2 contém termos de direção audiovisual/câmera proibidos na locução falada.',
      field: 'scene2'
    });
  }

  // Scene 2 CTA check
  for (const pattern of SCENE2_CTA_FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      violations.push({
        code: 'SCENE2_CONTAINS_CTA',
        message: 'Cena 2 não pode conter verbos de compra ou CTAs de fechamento.',
        field: 'scene2'
      });
      break;
    }
  }

  // Forbidden platform terms
  const forbiddenTerms = detectForbiddenPlatformTerms(text);
  if (forbiddenTerms.length > 0) {
    violations.push({
      code: 'FORBIDDEN_PLATFORM_TERM',
      message: `Cena 2 contém termos proibidos de outras plataformas: ${forbiddenTerms.join(', ')}.`,
      field: 'scene2'
    });
  }

  // Claim safety checks
  validateClaimSafety(text, evidence, 'scene2', violations);

  return {
    valid: violations.length === 0,
    charCount,
    violations,
    cleanedText: text
  };
}

/**
 * Validates Scene 3 (closing & CTA).
 * Must contain a valid Shopee CTA, NO camera directions, NO price, and adhere strictly to 160-175 chars.
 */
export function validateShopeeScene3(
  text: string,
  evidence: ShopeeCommercialEvidence,
  expectedCtaType?: ShopeeCTAType
): SceneValidationResult {
  const violations: SceneValidationViolation[] = [];
  const charCount = countCharacters(text);

  if (charCount < SHOPEE_MIN_CHARS || charCount > SHOPEE_MAX_CHARS) {
    violations.push({
      code: 'INVALID_CHARACTER_COUNT',
      message: `Cena 3 possui ${charCount} caracteres. Requerido: entre ${SHOPEE_MIN_CHARS} e ${SHOPEE_MAX_CHARS}.`,
      field: 'scene3'
    });
  }

  // Camera direction check
  if (detectVisualDescription(text)) {
    violations.push({
      code: 'VISUAL_CAMERA_DIRECTION',
      message: 'Cena 3 contém termos de direção audiovisual/câmera proibidos na locução falada.',
      field: 'scene3'
    });
  }

  // CTA verification
  const ctaCheck = isAllowedShopeeCTA(text, expectedCtaType);
  if (!ctaCheck.valid) {
    violations.push({
      code: ctaCheck.forbiddenTerm ? 'FORBIDDEN_PLATFORM_TERM' : 'MISSING_SHOPEE_CTA',
      message: ctaCheck.reason || 'Cena 3 deve conter chamada para ação explícita para a Shopee (ex: produto marcado, sacolinha, link da Shopee).',
      field: 'scene3'
    });
  }

  // Claim safety checks
  validateClaimSafety(text, evidence, 'scene3', violations);

  return {
    valid: violations.length === 0,
    charCount,
    violations,
    cleanedText: text
  };
}

/**
 * Runs claim safety verifications against available evidence.
 */
function validateClaimSafety(
  text: string,
  evidence: ShopeeCommercialEvidence,
  field: 'scene2' | 'scene3',
  violations: SceneValidationViolation[]
): void {
  if (PRICE_CURRENCY_PATTERN.test(text)) {
    violations.push({
      code: 'NUMERIC_PRICE_FORBIDDEN',
      message: 'Proibido citar valores numéricos de preço (R$, reais, cifrões).',
      field
    });
  }

  if (INSTALLMENT_PATTERN.test(text)) {
    violations.push({
      code: 'INSTALLMENT_FORBIDDEN',
      message: 'Proibido citar condições de parcelamento ou cartão.',
      field
    });
  }

  if (DISCOUNT_PATTERN.test(text) && !evidence.hasExplicitDiscount) {
    violations.push({
      code: 'UNSUPPORTED_DISCOUNT_CLAIM',
      message: 'Menção a desconto sem comprovação factual observável.',
      field
    });
  }

  if (COUPON_PATTERN.test(text) && !evidence.hasExplicitCoupon) {
    violations.push({
      code: 'UNSUPPORTED_COUPON_CLAIM',
      message: 'Menção a cupom promocional sem comprovação factual.',
      field
    });
  }

  if (FREE_SHIPPING_PATTERN.test(text) && !evidence.hasExplicitShipping) {
    violations.push({
      code: 'UNSUPPORTED_FREE_SHIPPING',
      message: 'Menção a frete grátis sem evidência factual comprovada.',
      field
    });
  }

  if (SCARCITY_STOCK_PATTERN.test(text) && !evidence.hasExplicitStockLimit) {
    violations.push({
      code: 'UNSUPPORTED_SCARCITY_CLAIM',
      message: 'Menção a escassez ou estoque esgotando sem evidência factual.',
      field
    });
  }

  if (DEADLINE_PATTERN.test(text) && !evidence.hasExplicitDeadline) {
    violations.push({
      code: 'UNSUPPORTED_DEADLINE_CLAIM',
      message: 'Menção a prazo expirando ou "só hoje" sem evidência factual.',
      field
    });
  }

  if (REVIEWS_STARS_PATTERN.test(text) && !evidence.hasExplicitReviews) {
    violations.push({
      code: 'UNSUPPORTED_REVIEWS_CLAIM',
      message: 'Menção a estrelas ou volume de vendas sem comprovação factual.',
      field
    });
  }

  if (AUTHENTICITY_PATTERN.test(text) && !evidence.hasExplicitAuthenticity) {
    violations.push({
      code: 'UNSUPPORTED_AUTHENTICITY_CLAIM',
      message: 'Menção a "100% original" ou autenticidade sem comprovação documental ou factual.',
      field
    });
  }

  if (GUARANTEE_PATTERN.test(text) && !evidence.hasExplicitGuarantee) {
    violations.push({
      code: 'UNSUPPORTED_GUARANTEE_CLAIM',
      message: 'Menção a garantia incondicional sem evidência comprovada.',
      field
    });
  }
}

/**
 * Unified validator for either Scene 2 or Scene 3.
 */
export function validateShopeeScene(
  scene: 'scene2' | 'scene3',
  text: string,
  evidence: ShopeeCommercialEvidence,
  expectedCtaType?: ShopeeCTAType
): {
  isValid: boolean;
  charCount: number;
  violations: string[];
  cleanedText: string;
} {
  const res = scene === 'scene2'
    ? validateShopeeScene2(text, evidence)
    : validateShopeeScene3(text, evidence, expectedCtaType);
  return {
    isValid: res.valid,
    charCount: res.charCount,
    violations: res.violations.map(v => v.message),
    cleanedText: res.cleanedText
  };
}

// Deterministic repair extensions for under-length texts (150–159 chars)
const SHOPEE_SCENE2_EXTENSIONS = [
  ' com facilidade.',
  ' na sua rotina.',
  ' no dia a dia.',
  ' com total conforto.',
  ' com praticidade.',
  ' com muita facilidade.',
  ' com muita praticidade.',
  ' trazendo mais praticidade.',
  ' facilitando a sua rotina.',
  ' com encaixe perfeito e acabamento de qualidade.'
];

const SHOPEE_SCENE3_EXTENSIONS = [
  ' com segurança.',
  ' antes que termine.',
  ' com tranquilidade.',
  ' com total segurança.',
  ' com entrega segura.',
  ' com envio rápido.',
  ' direto no seu endereço.',
  ' com envio seguro para sua casa.'
];

// Semantic fillers for pruning over-length texts (176–185 chars)
const PRUNABLE_FILLERS = [
  /\bno\s+seu\s+dia\s+a\s+dia\b/gi,
  /\bno\s+dia\s+a\s+dia\b/gi,
  /\bcom\s+muita\s+facilidade\b/gi,
  /\bcom\s+total\s+facilidade\b/gi,
  /\bcom\s+total\s+seguran[çc]a\b/gi,
  /\bagora\s+mesmo\b/gi,
  /\bmesmo\b/gi,
  /\bj[áa]\b/gi,
  /\btotalmente\b/gi,
  /\brealmente\b/gi
];

/**
 * Deterministic micro-repair for Shopee copy scenes.
 * - 150-159 chars: adds safe semantic extension.
 * - 176-185 chars: removes fillers without breaking grammar.
 * - Slicing / substring() / mechanical truncation is strictly forbidden!
 */
export function microRepairShopeeSceneText(
  arg1: string,
  arg2: 'scene2' | 'scene3' | string
): { repairedText: string; repaired: boolean; charCount: number } {
  let text = '';
  let scene: 'scene2' | 'scene3' = 'scene2';

  if (arg1 === 'scene2' || arg1 === 'scene3') {
    scene = arg1;
    text = typeof arg2 === 'string' ? arg2 : '';
  } else {
    text = arg1;
    scene = arg2 === 'scene3' ? 'scene3' : 'scene2';
  }

  if (!text) return { repairedText: text, repaired: false, charCount: 0 };

  let current = text.trim();
  const initialLength = countCharacters(current);

  if (initialLength >= SHOPEE_MIN_CHARS && initialLength <= SHOPEE_MAX_CHARS) {
    return { repairedText: current, repaired: false, charCount: initialLength };
  }

  // Case A: 150–159 characters -> Semantic Extension
  if (initialLength >= 150 && initialLength < SHOPEE_MIN_CHARS) {
    const extensions = scene === 'scene2' ? SHOPEE_SCENE2_EXTENSIONS : SHOPEE_SCENE3_EXTENSIONS;
    // Strip trailing period if present before appending
    const base = current.endsWith('.') ? current.slice(0, -1) : current;

    for (const ext of extensions) {
      const candidate = `${base}${ext}`;
      const len = countCharacters(candidate);
      if (len >= SHOPEE_MIN_CHARS && len <= SHOPEE_MAX_CHARS) {
        return { repairedText: candidate, repaired: true, charCount: len };
      }
    }
  }

  // Case B: 176–185 characters -> Semantic Filler Pruning
  if (initialLength > SHOPEE_MAX_CHARS && initialLength <= 185) {
    let candidate = current;
    for (const filler of PRUNABLE_FILLERS) {
      if (filler.test(candidate)) {
        let pruned = candidate.replace(filler, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,!?:])/g, '$1').trim();
        if (!/[.!?]$/.test(pruned)) {
          pruned = pruned.replace(/[,;:]$/, '') + '.';
        }
        const len = countCharacters(pruned);
        if (len >= SHOPEE_MIN_CHARS && len <= SHOPEE_MAX_CHARS) {
          return { repairedText: pruned, repaired: true, charCount: len };
        }
        if (len > SHOPEE_MAX_CHARS) {
          candidate = pruned;
        }
      }
    }
  }

  // Outside 150–185 window or couldn't fix safely: DO NOT TRUNCATE MECHANICALLY!
  return { repairedText: current, repaired: false, charCount: initialLength };
}

/**
 * Validates and repairs a ShopeeCopyVariation.
 */
export function validateAndRepairShopeeVariation(
  variation: {
    id: number;
    scene2: string;
    scene3: string;
    structure?: ShopeeCopyStructure;
    style?: ShopeeCopyStyle;
    ctaType?: ShopeeCTAType;
  },
  evidence: ShopeeCommercialEvidence
): ShopeeCopyVariation {
  let s2 = variation.scene2;
  let s3 = variation.scene3;
  let repaired = false;

  // 1. Attempt deterministic micro-repairs if needed
  const s2Repair = microRepairShopeeSceneText(s2, 'scene2');
  if (s2Repair.repaired) {
    s2 = s2Repair.repairedText;
    repaired = true;
  }

  const s3Repair = microRepairShopeeSceneText(s3, 'scene3');
  if (s3Repair.repaired) {
    s3 = s3Repair.repairedText;
    repaired = true;
  }

  // 2. Full Validation
  const v2 = validateShopeeScene2(s2, evidence);
  const v3 = validateShopeeScene3(s3, evidence, variation.ctaType);

  const errors: string[] = [
    ...v2.violations.map(v => `[Cena 2] ${v.message}`),
    ...v3.violations.map(v => `[Cena 3] ${v.message}`)
  ];

  return {
    id: variation.id,
    scene2: s2,
    scene3: s3,
    structure: variation.structure || ShopeeCopyStructure.PRODUCT_IN_USE,
    style: variation.style || ShopeeCopyStyle.UGC_NATURAL,
    ctaType: variation.ctaType || ShopeeCTAType.PRODUTO_MARCADO,
    scene2CharCount: v2.charCount,
    scene3CharCount: v3.charCount,
    isValid: errors.length === 0,
    validationErrors: errors.length > 0 ? errors : undefined,
    repaired
  };
}
