/**
 * SHOPEE VIDEO COMPLIANCE GUARD — MASTER PREFLIGHT ORCHESTRATOR
 * 
 * Aggregates all deterministic compliance validators:
 * - Guarantee & Miracle Validator
 * - Privacy & PII Validator
 * - Watermark & External Platform Validator
 * - Commercial Claims & Evidence Validator
 * - Visual Quality & Directive Completeness Validator
 * 
 * Strictly preserves the invariant: "MANUAL COPY OWNS THE WORDS."
 * Never silently mutates dialogue or user content.
 */

import {
  ShopeePreflightInput,
  ShopeeComplianceReport,
  ShopeeComplianceViolation,
  ShopeeComplianceStatus,
  ShopeeComplianceChecklist
} from '../types';
import { validateGuaranteeAndPromises } from '../validators/shopeeGuaranteeValidator';
import { validatePrivacyAndPii } from '../validators/shopeePrivacyValidator';
import { validateWatermarksAndPlatforms } from '../validators/shopeeWatermarkValidator';
import { validateCommercialClaims } from '../validators/shopeeCommercialClaimsValidator';
import { validateVisualQualityPrompt, injectMissingNegativeLightingConstraints } from '../validators/shopeeVisualQualityValidator';
import { DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE } from '../../shopee-copy/types';

export class ShopeeVideoComplianceGuard {
  /**
   * Runs complete preflight audit over copy, dialogue, prompts, and context.
   */
  public static audit(input: ShopeePreflightInput): ShopeeComplianceReport {
    const violations: ShopeeComplianceViolation[] = [];
    const evidence = input.commercialEvidence || DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE;

    // 1. Audit Spoken Copy / Dialogue Text
    const copySources: Array<{ text: string | undefined; label: string }> = [
      { text: input.copyText, label: 'Texto da Copy' },
      { text: input.scene1Dialogue, label: 'Cena 1 (Fala)' },
      { text: input.scene2Dialogue, label: 'Cena 2 (Fala)' },
      { text: input.scene3Dialogue, label: 'Cena 3 (Fala)' },
      { text: input.presenterDescription, label: 'Apresentador(a)' },
      { text: input.environmentDescription, label: 'Ambiente' }
    ];

    for (const item of copySources) {
      if (!item.text || typeof item.text !== 'string') continue;

      // Guarantee & Miracle detection
      violations.push(...validateGuaranteeAndPromises(item.text, item.label));

      // Privacy & PII detection
      violations.push(...validatePrivacyAndPii(item.text, item.label));

      // Watermarks, external platforms & forbidden terms
      violations.push(...validateWatermarksAndPlatforms(item.text, item.label));

      // Commercial claims & evidence backing
      violations.push(...validateCommercialClaims(item.text, evidence, item.label));
    }

    // 2. Audit CTA Mode
    if (input.ctaMode) {
      const ctaStr = String(input.ctaMode).toLowerCase();
      if (ctaStr.includes('carrinho_laranja') || ctaStr.includes('carrinho laranja')) {
        violations.push({
          code: 'FORBIDDEN_CTA_MODE',
          severity: 'critical',
          category: 'cta_compliance',
          message: 'Modo de CTA inválido ("carrinho laranja"). No Shopee Vídeo utilize produto_marcado, sacolinha ou link.',
          suggestedAction: 'Altere o modo de CTA para "produto_marcado" ou "sacolinha".',
          requiresConfirmation: true,
          blocking: true,
          field: 'Modo CTA'
        });
      }
    }

    // 3. Audit Compiled Prompts (if present)
    if (input.compiledPrompts) {
      const promptEntries: Array<{ prompt: string; name: string }> = [];

      if (Array.isArray(input.compiledPrompts)) {
        input.compiledPrompts.forEach((p, idx) => {
          if (p) promptEntries.push({ prompt: p, name: `Prompt Cena ${idx + 1}` });
        });
      } else if (typeof input.compiledPrompts === 'object') {
        if (input.compiledPrompts.scene1) {
          promptEntries.push({ prompt: input.compiledPrompts.scene1, name: 'Prompt Cena 1' });
        }
        if (input.compiledPrompts.scene2) {
          promptEntries.push({ prompt: input.compiledPrompts.scene2, name: 'Prompt Cena 2' });
        }
        if (input.compiledPrompts.scene3) {
          promptEntries.push({ prompt: input.compiledPrompts.scene3, name: 'Prompt Cena 3' });
        }
      }

      for (const entry of promptEntries) {
        // Visual quality checks
        violations.push(...validateVisualQualityPrompt(entry.prompt, entry.name));

        // Privacy & PII in compiled prompts
        violations.push(...validatePrivacyAndPii(entry.prompt, entry.name));

        // Watermarks & external platforms in compiled prompts
        violations.push(...validateWatermarksAndPlatforms(entry.prompt, entry.name));
      }
    }

    // 4. Calculate Severity & Metrics
    const criticalCount = violations.filter(v => v.severity === 'critical' || v.blocking).length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    const infoCount = violations.filter(v => v.severity === 'info').length;

    let status: ShopeeComplianceStatus = 'APTO';
    if (criticalCount > 0) {
      status = 'BLOQUEADO';
    } else if (warningCount > 0) {
      status = 'REVISAO_NECESSARIA';
    }

    // 5. Checklist Resolution
    const checklist: ShopeeComplianceChecklist = {
      productVisible: !violations.some(v => v.code === 'MISSING_PRODUCT_VISIBILITY_DIRECTIVE'),
      benefitGrounded: !violations.some(v => v.code === 'UNREALISTIC_DURABILITY' || v.code === 'UNIVERSAL_SOLVER_PROMISE'),
      noUnsupportedGuarantee: !violations.some(v => v.category === 'guarantee_miracle'),
      commercialConditionsValid: !violations.some(v => v.category === 'commercial_claims'),
      noExternalWatermarkOrUI: !violations.some(v => v.category === 'watermark_recycled'),
      privacyProtected: !violations.some(v => v.category === 'privacy_pii'),
      ctaValid: !violations.some(v => v.category === 'cta_compliance' || v.code === 'FORBIDDEN_CARRINHO_LARANJA')
    };

    const passedChecks: string[] = [];
    if (checklist.productVisible) passedChecks.push('Produto Visível');
    if (checklist.benefitGrounded) passedChecks.push('Benefício Factual');
    if (checklist.noUnsupportedGuarantee) passedChecks.push('Sem Promessas Milagrosas');
    if (checklist.commercialConditionsValid) passedChecks.push('Condições Comerciais Válidas');
    if (checklist.noExternalWatermarkOrUI) passedChecks.push('Isento de Marca d\'Água Externa');
    if (checklist.privacyProtected) passedChecks.push('Privacidade Protegida');
    if (checklist.ctaValid) passedChecks.push('CTA Shopee Válida');

    return {
      status,
      violations,
      isApto: status === 'APTO',
      isBlocked: status === 'BLOQUEADO',
      requiresReview: status === 'REVISAO_NECESSARIA',
      checklist,
      summary: {
        criticalCount,
        warningCount,
        infoCount,
        passedChecks
      },
      timestamp: Date.now()
    };
  }

  // ==========================================
  // SAFE AUTO-FIX POLICY UTILITIES
  // (Never modifies dialogue or user words)
  // ==========================================

  /**
   * Safe auto-fix: Normalizes duplicate whitespace and carriage returns without changing semantics.
   */
  public static safeNormalizeWhitespace(text: string): string {
    if (!text) return text;
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Safe auto-fix: Normalizes Unicode quotation marks and apostrophes to standard characters.
   */
  public static safeNormalizeQuotes(text: string): string {
    if (!text) return text;
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
  }

  /**
   * Safe auto-fix: Injects missing negative lighting constraints into video generator prompt.
   */
  public static safeInjectNegativeLightingConstraints(promptText: string): string {
    return injectMissingNegativeLightingConstraints(promptText);
  }
}
