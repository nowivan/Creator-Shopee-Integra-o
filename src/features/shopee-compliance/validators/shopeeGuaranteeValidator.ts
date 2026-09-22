/**
 * SHOPEE GUARANTEE & UNREALISTIC PROMISES VALIDATOR
 * 
 * Deterministic detection for miracle, medical, and exaggerated performance claims.
 * Differentiates permitted Shopee CTA phrases ("garanta o seu") from unsupported claims ("resultado garantido").
 */

import { ShopeeComplianceViolation } from '../types';

// Permitted Shopee CTA phrases using the imperative verb "garanta"
const ALLOWED_SHOPEE_CTA_PATTERNS = [
  /\bgaranta\s+(?:j[aá]\s+)?(?:o\s+seu|a\s+sua|os\s+seus|as\s+suas|seu|sua|unidade|o\s+produto)\b/iu,
  /\bgaranta\s+no\s+(?:link|produto|carrinho|v[ií]deo)\b/iu,
  /\bgarantir\s+(?:o\s+seu|a\s+sua|os\s+seus|as\s+suas|seu|sua|unidade)\b/iu
];

interface GuaranteePatternDef {
  pattern: RegExp;
  code: string;
  category: 'guarantee_miracle' | 'unrealistic_promise';
  severity: 'critical' | 'warning';
  message: string;
  suggestedAction: string;
  isAbsoluteClaim: boolean;
}

const FORBIDDEN_GUARANTEE_PATTERNS: GuaranteePatternDef[] = [
  // Medical / Miracle
  {
    pattern: /\b(?:cura\s+total|milagre(?:s)?|milagros[oa](?:s)?)\b/iu,
    code: 'MIRACLE_CLAIM',
    category: 'guarantee_miracle',
    severity: 'critical',
    message: 'Alegação milagrosa ou médica ("cura total", "milagre") é estritamente proibida pelas diretrizes da Shopee.',
    suggestedAction: 'Remova promessas de cura ou milagres e foque apenas nos benefícios físicos observáveis.',
    isAbsoluteClaim: true
  },
  // Absolute Efficacy
  {
    pattern: /\b100%\s*(?:eficaz|eficiente|comprovado|seguro|garantido)\b/iu,
    code: 'ABSOLUTE_EFFICACY_CLAIM',
    category: 'guarantee_miracle',
    severity: 'critical',
    message: 'Alegação de eficácia absoluta ("100% eficaz/comprovado") viola as políticas de saúde de conta.',
    suggestedAction: 'Descreva a aplicação real do produto sem prometer 100% de eficácia universal.',
    isAbsoluteClaim: true
  },
  // Guaranteed Results
  {
    pattern: /\b(?:resultado\s+garantido|resultado\s+certo|efic[aá]cia\s+garantida|resultado\s+imediato\s+garantido)\b/iu,
    code: 'GUARANTEED_RESULT_CLAIM',
    category: 'guarantee_miracle',
    severity: 'critical',
    message: 'Promessa de "resultado garantido" ou "eficácia garantida" é considerada informação enganosa.',
    suggestedAction: 'Demonstre a funcionalidade do produto na prática sem garantir o resultado final para todos os usuários.',
    isAbsoluteClaim: true
  },
  // Infallibility
  {
    pattern: /\b(?:funciona\s+sempre|nunca\s+falha)\b/iu,
    code: 'INFALLIBILITY_CLAIM',
    category: 'guarantee_miracle',
    severity: 'critical',
    message: 'Alegações de infalibilidade ("funciona sempre", "nunca falha") violam os padrões de conformidade de vídeo.',
    suggestedAction: 'Foque nas especificações e no funcionamento habitual do produto.',
    isAbsoluteClaim: true
  },
  // Durability Hyperbole
  {
    pattern: /\b(?:n[aã]o\s+quebra\s+nunca|nunca\s+quebra|indestrut[ií]vel|dura\s+para\s+sempre)\b/iu,
    code: 'UNREALISTIC_DURABILITY',
    category: 'unrealistic_promise',
    severity: 'critical',
    message: 'Afirmação de durabilidade impossível ("não quebra nunca", "indestrutível", "dura para sempre").',
    suggestedAction: 'Cite os materiais reais e a resistência do produto sem alegar invulnerabilidade.',
    isAbsoluteClaim: true
  },
  // Universal Problem Solving
  {
    pattern: /\b(?:resolve\s+todos\s+os\s+problemas|acaba\s+com\s+todos\s+os\s+seus\s+problemas)\b/iu,
    code: 'UNIVERSAL_SOLVER_PROMISE',
    category: 'unrealistic_promise',
    severity: 'critical',
    message: 'Promessa irreal de resolver "todos os problemas".',
    suggestedAction: 'Foque na dor de uso específica que o produto soluciona.',
    isAbsoluteClaim: true
  },
  // Standalone "garantido" (when not part of a valid CTA)
  {
    pattern: /\b(?:[eé]\s+garantido|produto\s+garantido|efeito\s+garantido|garantido\s+que\s+funciona|satisfa[çc][ãa]o\s+garantida)\b/iu,
    code: 'STANDALONE_GUARANTEE_CLAIM',
    category: 'guarantee_miracle',
    severity: 'critical',
    message: 'Uso de "garantido" como alegação de eficácia do produto.',
    suggestedAction: 'Substitua por demonstração factual dos benefícios observados.',
    isAbsoluteClaim: true
  },
  // Subjective Exaggeration (Warnings)
  {
    pattern: /\b(?:a\s+)?melhor\s+escolha\b/iu,
    code: 'SUBJECTIVE_SUPERLATIVE_CHOICE',
    category: 'unrealistic_promise',
    severity: 'warning',
    message: 'Afirmação subjetiva de superioridade ("melhor escolha"). Recomendado moderar para conformidade estrita.',
    suggestedAction: 'Destaque os benefícios funcionais específicos em vez de qualificativos genéricos de melhor escolha.',
    isAbsoluteClaim: false
  },
  {
    pattern: /\b(?:o\s+)?melhor\s+do\s+mercado\b/iu,
    code: 'BEST_IN_MARKET_SUPERLATIVE',
    category: 'unrealistic_promise',
    severity: 'warning',
    message: 'Superlativo não fundamentado ("melhor do mercado"). Pode ser contestado pela moderação.',
    suggestedAction: 'Prefira destacar as qualidades observadas em vez de alegar superioridade irrestrita.',
    isAbsoluteClaim: false
  },
  {
    pattern: /\bperfeito\s+para\s+qualquer\s+pessoa\b/iu,
    code: 'UNIVERSAL_SUITABILITY_EXAGGERATION',
    category: 'unrealistic_promise',
    severity: 'warning',
    message: 'Afirmação subjetiva de adequação universal ("perfeito para qualquer pessoa").',
    suggestedAction: 'Especifique para quem o produto é mais útil.',
    isAbsoluteClaim: false
  },
  {
    pattern: /\bfunciona\s+em\s+qualquer\s+situa[çc][ãa]o\b/iu,
    code: 'UNIVERSAL_SITUATION_EXAGGERATION',
    category: 'unrealistic_promise',
    severity: 'warning',
    message: 'Generalização excessiva ("funciona em qualquer situação").',
    suggestedAction: 'Descreva os cenários de teste reais.',
    isAbsoluteClaim: false
  }
];

export function validateGuaranteeAndPromises(text: string, fieldName: string = 'text'): ShopeeComplianceViolation[] {
  if (!text || typeof text !== 'string') return [];
  const violations: ShopeeComplianceViolation[] = [];

  // Check whether text matches any of the forbidden guarantee / promise patterns
  for (const def of FORBIDDEN_GUARANTEE_PATTERNS) {
    const match = text.match(def.pattern);
    if (match) {
      const offending = match[0];
      
      // Secondary check: if the offending text is part of a permitted CTA phrase like "garanta o seu", skip!
      const isAllowedCta = ALLOWED_SHOPEE_CTA_PATTERNS.some(ctaPat => {
        // Check if the match is enveloped in a valid CTA
        return ctaPat.test(text);
      });

      // If the match was specifically "garanta", check if it was allowed CTA
      if (offending.toLowerCase().startsWith('garanta') && isAllowedCta) {
        continue;
      }

      violations.push({
        code: def.code,
        severity: def.severity,
        category: def.category,
        message: def.message,
        offendingText: offending,
        suggestedAction: def.suggestedAction,
        requiresConfirmation: true,
        blocking: def.severity === 'critical',
        field: fieldName
      });
    }
  }

  // Check for bare word "garantido" (e.g. "Isso aqui é garantido!")
  // Ensure we don't catch "garanta o seu"
  const bareGarantidoMatch = text.match(/\bgarantid[oa]s?\b/iu);
  if (bareGarantidoMatch && !violations.some(v => v.code === 'STANDALONE_GUARANTEE_CLAIM' || v.code === 'GUARANTEED_RESULT_CLAIM')) {
    violations.push({
      code: 'STANDALONE_GUARANTEE_CLAIM',
      severity: 'critical',
      category: 'guarantee_miracle',
      message: 'Uso de "garantido" como alegação de eficácia. Não confunda com a CTA permitida "garanta o seu".',
      offendingText: bareGarantidoMatch[0],
      suggestedAction: 'Remova a alegação de garantia de resultado ou utilize a CTA padrão "Garanta o seu no link".',
      requiresConfirmation: true,
      blocking: true,
      field: fieldName
    });
  }

  return violations;
}
