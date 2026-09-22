/**
 * SHOPEE COMMERCIAL CLAIMS VALIDATOR (ADAPTER)
 * 
 * Reuses existing deterministic commercial regex patterns from shopeeCopyValidator.ts.
 * Checks evidence backing for prices, installments, discounts, coupons, free shipping,
 * scarcity, stock limits, deadlines, star ratings, authenticity claims, and return guarantees.
 */

import { ShopeeComplianceViolation } from '../types';
import { ShopeeCommercialEvidence, DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE } from '../../shopee-copy/types';
import {
  PRICE_CURRENCY_PATTERN,
  INSTALLMENT_PATTERN,
  DISCOUNT_PATTERN,
  COUPON_PATTERN,
  FREE_SHIPPING_PATTERN,
  SCARCITY_STOCK_PATTERN,
  DEADLINE_PATTERN,
  REVIEWS_STARS_PATTERN,
  AUTHENTICITY_PATTERN,
  GUARANTEE_PATTERN
} from '../../shopee-copy/shopeeCopyValidator';

export function validateCommercialClaims(
  text: string,
  evidence: ShopeeCommercialEvidence = DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE,
  fieldName: string = 'text'
): ShopeeComplianceViolation[] {
  if (!text || typeof text !== 'string') return [];
  const violations: ShopeeComplianceViolation[] = [];

  // 1. Price Currency (Always strictly forbidden in dynamic UGC copy)
  if (PRICE_CURRENCY_PATTERN.test(text)) {
    const match = text.match(PRICE_CURRENCY_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_PRICE_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Menção de preço numérico ou moeda ("R$", "reais") detectada. Preços oscilam e causam reprovação no Shopee Vídeo.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova valores numéricos e direcione o espectador para conferir o preço atualizado no produto marcado.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 2. Installments / Card Terms
  if (INSTALLMENT_PATTERN.test(text)) {
    const match = text.match(INSTALLMENT_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_INSTALLMENT_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Condição de parcelamento ("x sem juros", "parcelado") detectada sem garantia de estabilidade da oferta.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova termos de parcelamento.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 3. Discount without explicit evidence
  if (!evidence.hasExplicitDiscount && DISCOUNT_PATTERN.test(text)) {
    const match = text.match(DISCOUNT_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_DISCOUNT_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Alegação de desconto ("desconto", "% OFF", "metade do preço") sem evidência comercial comprovada.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Ative a evidência de desconto comprovado nas configurações ou remova a alegação.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 4. Coupon without explicit evidence
  if (!evidence.hasExplicitCoupon && COUPON_PATTERN.test(text)) {
    const match = text.match(COUPON_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_COUPON_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Menção de cupom ou voucher sem evidência comercial ativa.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova a menção a cupom ou marque a evidência comercial correspondente.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 5. Free Shipping without explicit evidence
  if (!evidence.hasExplicitShipping && FREE_SHIPPING_PATTERN.test(text)) {
    const match = text.match(FREE_SHIPPING_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_FREE_SHIPPING',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Promessa de frete grátis sem evidência comercial vinculada.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova a promessa de frete grátis ou comprove que o produto possui frete grátis universal.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 6. Scarcity & Stock Limits without evidence
  if (!evidence.hasExplicitStockLimit && SCARCITY_STOCK_PATTERN.test(text)) {
    const match = text.match(SCARCITY_STOCK_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_SCARCITY_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Urgência ou escassez de estoque artificial ("últimas unidades", "vai acabar") sem evidência comprovada.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova alegações de escassez sem comprovação.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 7. Deadlines & False Urgency without evidence
  if (!evidence.hasExplicitDeadline && DEADLINE_PATTERN.test(text)) {
    const match = text.match(DEADLINE_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_DEADLINE_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Gatilho de urgência temporal ("só hoje", "últimas horas") não permitido sem prazo real comprovado.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova a urgência temporal.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  // 8. Reviews / Stars without evidence
  if (!evidence.hasExplicitReviews && REVIEWS_STARS_PATTERN.test(text)) {
    const match = text.match(REVIEWS_STARS_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_REVIEWS_CLAIM',
      severity: 'warning',
      category: 'commercial_claims',
      message: 'Alegação de avaliação ("5 estrelas", "mais vendido") sem evidência registrada.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Comprove as avaliações com dados observáveis.',
      requiresConfirmation: true,
      blocking: false,
      field: fieldName
    });
  }

  // 9. Authenticity without evidence
  if (!evidence.hasExplicitAuthenticity && AUTHENTICITY_PATTERN.test(text)) {
    const match = text.match(AUTHENTICITY_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_AUTHENTICITY_CLAIM',
      severity: 'warning',
      category: 'commercial_claims',
      message: 'Alegação de autenticidade ("100% original") sem selo oficial verificado.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova ou comprove a autenticidade com certificação de distribuidor oficial.',
      requiresConfirmation: true,
      blocking: false,
      field: fieldName
    });
  }

  // 10. Commercial Return Guarantee without evidence
  if (!evidence.hasExplicitGuarantee && GUARANTEE_PATTERN.test(text)) {
    const match = text.match(GUARANTEE_PATTERN);
    violations.push({
      code: 'UNSUPPORTED_RETURN_GUARANTEE_CLAIM',
      severity: 'critical',
      category: 'commercial_claims',
      message: 'Promessa de garantia estendida ou devolução garantida sem confirmação comercial.',
      offendingText: match ? match[0] : undefined,
      suggestedAction: 'Remova a promessa de garantia de devolução não verificada.',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  return violations;
}
