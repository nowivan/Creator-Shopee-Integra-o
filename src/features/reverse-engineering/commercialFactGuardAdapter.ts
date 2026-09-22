/**
 * COMMERCIAL FACT GUARD ADAPTER — ETAPA 7B
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Conectar os commercialFactCandidates gerados pelo RemodelCompiler aos guards
 * comerciais já existentes no sistema (Fact Authority, VerifiedCommercialFacts, Semantic Evidence Guard).
 * 
 * Princípios Rígidos:
 * 1. Não altera Fact Authority, VerifiedCommercialFacts nem Semantic Evidence Guard internamente.
 * 2. Impede terminantemente que fatos vindos do vídeo de referência ou claims não verificados
 *    (preço, desconto, estoque, prazo, ranking, exclusividade, demanda) ganhem autoridade.
 * 3. VISION_OBSERVED não valida automaticamente atributos comerciais de alto risco.
 * 4. Pura, determinística, imutável e idempotente. Sem chamadas de rede ou Gemini.
 */

import {
  RemodeledSceneBlueprint,
  RemodeledProjectBlueprint,
  CommercialFactCandidate,
  CommercialFactCategory,
  CommercialFactSourceAuthority,
  CommercialFactValidationStatus,
  CommercialProjectGuardStatus,
  CommercialFactValidationResult,
  CommercialFactGuardResult,
  CommercialGuardedRemodeledScene,
  CommercialGuardedRemodeledProject,
  ProductInjectionContext,
} from './types';

import {
  extractCtaCommercialEvidence,
  validateSemanticEvidence,
  VerifiedCommercialFacts,
  SemanticEvidenceViolation,
} from '../creative-director/services/scene3CtaEngine';

import {
  classifyBenefit,
  filterNonPermanentVisualFacts,
} from '../creative-director/services/scene2CopyBrain';

// ============================================================================
// CLASSIFICAÇÃO DETERMINÍSTICA DE CATEGORIA DE FATO COMERCIAL
// ============================================================================

export function classifyFactCategory(claimText: string): CommercialFactCategory {
  const text = (claimText || '').trim().toLowerCase();

  // 1. Preço e Valores Monetários
  if (/(?:r\$\s*\d+|\b\d+(?:[.,]\d{2})?\s*reais\b|\b\d+\s*reais\b|\$\s*\d+|\bpre[çc]o\b|\bparcelad[oa]\b|\bparcelamento\b|\bsem\s+juros\b|\bno\s+cart[ãa]o\b|\b\d+x\b)/i.test(text)) {
    return 'PRICE';
  }

  // 2. Desconto e Cupons
  if (/(?:desconto|cupom|voucher|c[óo]digo\s+promocional|\d+%\s*off|\d+%\s*de\s*desconto|metade\s+do\s+pre[çc]o|pela\s+metade)/i.test(text)) {
    return 'DISCOUNT';
  }

  // 3. Promoção e Ofertas
  if (/(?:promo[çc][ãa]o|oferta\s+especial|oferta\s+rel[âa]mpago|queima\s+de\s+estoque|liquida[çc][ãa]o|super\s+oferta)/i.test(text)) {
    return 'PROMOTION';
  }

  // 4. Estoque e Escassez
  if (/(?:[uú]ltim[ao]s\s+(?:unidades|pe[çc]as|itens)|estoque\s+(?:acabando|limitado|esgotando)|poucas\s+unidades|restam\s+\d+|antes\s+que\s+esgote|esgotando)/i.test(text)) {
    return 'STOCK';
  }

  // 5. Prazo e Urgência Temporal
  if (/(?:s[óo]\s+hoje|apenas\s+hoje|acaba\s+hoje|termina\s+hoje|at[ée]\s+hoje|[uú]ltimas\s+horas|por\s+tempo\s+limitado|24h|48h|termina\s+amanh[ãa])/i.test(text)) {
    return 'DEADLINE';
  }

  // 6. Exclusividade e Oportunidade Única
  if (/(?:oportunidade\s+[úu]nica|chance\s+[úu]nica|condi[çc][ãa]o\s+exclusiva|exclusiv[oa]|nunca\s+mais|[úu]ltima\s+chance|imperd[íi]vel)/i.test(text)) {
    return 'EXCLUSIVITY';
  }

  // 7. Ranking e Superioridade Não Comprovada
  if (/(?:mais\s+vendido|n[úu]mero\s+1|n[ºo]\s*1|top\s+1|o\s+melhor\s+do\s+brasil|l[íi]der\s+de\s+mercado|campe[ãa]o\s+de\s+vendas)/i.test(text)) {
    return 'RANKING';
  }

  // 8. Demanda e Procura
  if (/(?:alta\s+demanda|muita\s+procura|alta\s+procura|todo\s+mundo\s+est[áa]\s+comprando|est[áa]\s+vendendo\s+muito|est[áa]\s+saindo\s+r[áa]pido)/i.test(text)) {
    return 'DEMAND';
  }

  // 9. Frete e Envio
  if (/(?:frete\s+gr[áa]tis|envio\s+imediato|entrega\s+r[áa]pida|pronta\s+entrega)/i.test(text)) {
    return 'SHIPPING';
  }

  // 10. Performance e Especificações Físicas
  if (/(?:resistente|prova\s+d['’]?[áa]gua|bateria|durabilidade|tit[âa]nio|a[çc]o|algod[ãa]o|pot[êe]ncia|voltagem|gramatura|capacidade|mililitros|\bml\b|\bkg\b|\bmm\b|\bcm\b)/i.test(text)) {
    return 'PERFORMANCE';
  }

  // 11. Diferenciador
  if (/(?:exclusivo\s+sistema|patentead[oa]|tecnologia\s+pr[óo]pria|diferencial|f[óo]rmula\s+[úu]nica)/i.test(text)) {
    return 'DIFFERENTIATOR';
  }

  // 12. Benefício Prático
  return 'BENEFIT';
}

// ============================================================================
// CLASSIFICAÇÃO DE AUTORIDADE DE ORIGEM (SOURCE AUTHORITY)
// ============================================================================

export function resolveSourceAuthority(source?: string): CommercialFactSourceAuthority {
  if (!source) return 'UNKNOWN';

  const s = source.toUpperCase();

  if (s.includes('REFERENCE') || s.includes('STRIPPED') || s.includes('LEGACY_VIDEO')) {
    return 'REJECTED_REFERENCE_FACT';
  }

  if (s.includes('USER') || s.includes('MANUAL') || s.includes('INJECTION_CONTEXT')) {
    return 'USER_PROVIDED';
  }

  if (s.includes('VISION') || s.includes('IMAGE') || s.includes('GROUNDING')) {
    return 'VISION_OBSERVED';
  }

  if (s.includes('AI') || s.includes('INFERRED') || s.includes('SYNTHESIZED')) {
    return 'LEGACY_AI_INFERRED';
  }

  return 'UNKNOWN';
}

// ============================================================================
// CONSTRUÇÃO DE EVIDÊNCIA COMERCIAL VERIFICADA BASE (VERIFIED COMMERCIAL FACTS)
// ============================================================================

export function buildEffectiveCommercialFacts(
  productContext?: ProductInjectionContext | null
): VerifiedCommercialFacts {
  if (!productContext) return {};

  const comm = productContext.commercial || {};
  const diff = comm.uniqueDifferentiator || '';
  const benefit = comm.mainBenefit || '';
  const features = (comm.features || []).join(' ');
  const fullText = `${diff} ${benefit} ${features} ${productContext.structural?.name || ''}`;

  const extracted = extractCtaCommercialEvidence(fullText);

  return {
    ...extracted,
    hasVisiblePrice: false, // Preços monetários não são inferidos automaticamente
  };
}

// ============================================================================
// VALIDAÇÃO DE CANDIDATO A FATO INDIVIDUAL
// ============================================================================

export interface ValidateFactInput {
  candidate: CommercialFactCandidate;
  sceneId?: string;
  factIndex: number;
  productContext?: ProductInjectionContext | null;
  effectiveFacts: VerifiedCommercialFacts;
}

export function validateCommercialFactCandidate(
  input: ValidateFactInput
): CommercialFactValidationResult {
  const { candidate, sceneId, factIndex, effectiveFacts } = input;
  const rawClaim = (candidate.claim || '').trim();
  const rawSource = candidate.source || 'UNKNOWN';

  const type = classifyFactCategory(rawClaim);
  const source = resolveSourceAuthority(rawSource);
  const factId = `fact_${sceneId || 'global'}_${factIndex + 1}`;
  const reasons: string[] = [];

  // 1. Rejeição Imediata de Fatos da Referência (Zero Contaminação)
  if (source === 'REJECTED_REFERENCE_FACT') {
    return {
      factId,
      sceneId,
      type,
      value: rawClaim,
      source,
      status: 'REJECTED',
      reasons: ['Fato originado do vídeo de referência rejeitado para evitar contaminação factual do novo produto.'],
    };
  }

  // 2. High-Risk Claims (Preço, Desconto, Promoção, Estoque, Prazo, Ranking, Demanda, Exclusividade)
  const isHighRiskCategory = [
    'PRICE',
    'DISCOUNT',
    'PROMOTION',
    'STOCK',
    'DEADLINE',
    'EXCLUSIVITY',
    'RANKING',
    'DEMAND',
  ].includes(type);

  if (isHighRiskCategory) {
    // Visão NUNCA valida claims comerciais de alto risco
    if (source === 'VISION_OBSERVED') {
      return {
        factId,
        sceneId,
        type,
        value: rawClaim,
        source,
        status: 'UNVERIFIED',
        reasons: [`Claim comercial de ${type} não pode ser verificado exclusivamente por observação visual de produto.`],
      };
    }

    // Executa Semantic Evidence Guard contra os fatos comerciais verificados
    const semanticValidation = validateSemanticEvidence(rawClaim, effectiveFacts);

    if (!semanticValidation.valid) {
      const violationReasons = semanticValidation.violations.map(v => v.reason);
      return {
        factId,
        sceneId,
        type,
        value: rawClaim,
        source,
        status: 'UNVERIFIED',
        reasons: violationReasons,
      };
    }

    // Se for ranking ou demanda sem prova expressa
    if (type === 'RANKING' || type === 'DEMAND') {
      return {
        factId,
        sceneId,
        type,
        value: rawClaim,
        source,
        status: 'UNVERIFIED',
        reasons: [`Afirmações superlativas de ${type} exigem autoridade externa explícita e auditada.`],
      };
    }

    // Se passou na validação semântica com suporte factual
    return {
      factId,
      sceneId,
      type,
      value: rawClaim,
      source,
      status: 'VERIFIED',
      reasons: ['Claim comercial suportado por evidência factual verificada.'],
      normalizedEvidence: { [type.toLowerCase()]: true },
    };
  }

  // 3. Validação de Benefícios e Atributos Funcionais
  if (type === 'BENEFIT' || type === 'PERFORMANCE' || type === 'DIFFERENTIATOR') {
    const benefitCheck = classifyBenefit(rawClaim);

    // Se benefício contém termos comerciais proibidos
    if (benefitCheck.isCommercialClaim) {
      return {
        factId,
        sceneId,
        type: 'PROMOTION',
        value: rawClaim,
        source,
        status: 'UNVERIFIED',
        reasons: [benefitCheck.explanation],
      };
    }

    // Se é puramente estético (não é benefício funcional demonstrável autônomo)
    if (benefitCheck.isAestheticOnly) {
      return {
        factId,
        sceneId,
        type,
        value: rawClaim,
        source,
        status: 'UNVERIFIED',
        reasons: [benefitCheck.explanation],
      };
    }

    // Test of Permanence (Filtro de fatos de estúdio / composição efêmera)
    const permanentCheck = filterNonPermanentVisualFacts([rawClaim]);
    if (permanentCheck.length === 0) {
      return {
        factId,
        sceneId,
        type,
        value: rawClaim,
        source,
        status: 'REJECTED',
        reasons: ['Fato rejeitado pelo Teste de Permanência: refere-se a composição efêmera de estúdio/foto.'],
      };
    }

    // Benefício prático funcional válido
    return {
      factId,
      sceneId,
      type,
      value: rawClaim,
      source,
      status: source === 'USER_PROVIDED' || source === 'VISION_OBSERVED' ? 'VERIFIED' : 'UNVERIFIED',
      reasons: [benefitCheck.explanation],
    };
  }

  // Fallback Seguro
  return {
    factId,
    sceneId,
    type,
    value: rawClaim,
    source,
    status: 'UNKNOWN',
    reasons: ['Fato sem categoria de validação específica; mantido em estado neutro.'],
  };
}

// ============================================================================
// VALIDAÇÃO EM NÍVEL DE CENA
// ============================================================================

export function validateSceneCommercialFacts(
  scene: RemodeledSceneBlueprint,
  effectiveFacts: VerifiedCommercialFacts,
  productContext?: ProductInjectionContext | null
): CommercialGuardedRemodeledScene {
  const candidates = scene.commercialFactCandidates || [];

  const commercialFactValidation: CommercialFactValidationResult[] = candidates.map((cand, idx) =>
    validateCommercialFactCandidate({
      candidate: cand,
      sceneId: scene.sceneId,
      factIndex: idx,
      productContext,
      effectiveFacts,
    })
  );

  return {
    ...scene,
    commercialFactValidation,
  };
}

// ============================================================================
// VALIDAÇÃO EM NÍVEL DE PROJETO (PURE, DETERMINISTIC, DEDUPLICATED)
// ============================================================================

export function applyCommercialFactGuardsToProject(
  project: RemodeledProjectBlueprint
): CommercialGuardedRemodeledProject {
  const scenes = project?.scenes || [];
  const productContext = project?.productContext || null;
  const effectiveCommercialFacts = buildEffectiveCommercialFacts(productContext);

  const seenFactKeys = new Set<string>();
  const allValidatedFacts: CommercialFactValidationResult[] = [];
  const verifiedFacts: CommercialFactValidationResult[] = [];
  const unverifiedFacts: CommercialFactValidationResult[] = [];
  const rejectedFacts: CommercialFactValidationResult[] = [];
  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  // 1. Processar cada cena
  const guardedScenes: CommercialGuardedRemodeledScene[] = scenes.map(scene => {
    const guardedScene = validateSceneCommercialFacts(scene, effectiveCommercialFacts, productContext);

    for (const val of guardedScene.commercialFactValidation) {
      // Deduplicação determinística
      const factKey = `${val.type}:${val.value.trim().toLowerCase()}:${val.source}`;

      if (!seenFactKeys.has(factKey)) {
        seenFactKeys.add(factKey);
        allValidatedFacts.push(val);

        if (val.status === 'VERIFIED') {
          verifiedFacts.push(val);
        } else if (val.status === 'UNVERIFIED' || val.status === 'UNKNOWN') {
          unverifiedFacts.push(val);
          warnings.push(`[${val.sceneId || 'global'}] Fato não verificado omitido da copy: "${val.value}" (${val.reasons.join('; ')})`);
        } else if (val.status === 'REJECTED') {
          rejectedFacts.push(val);
          warnings.push(`[${val.sceneId || 'global'}] Fato rejeitado: "${val.value}" (${val.reasons.join('; ')})`);
        }
      }
    }

    return guardedScene;
  });

  // 2. Determinar Política de Status do Projeto
  // COMMERCIAL_BLOCKED: Se houver tentativa forçada de uso de claim expressamente proibido sem alternativa
  // COMMERCIAL_SAFE_WITH_WARNINGS: Se houver fatos unverified/rejected (eles simplesmente NÃO serão repassados à copy)
  // COMMERCIAL_SAFE: Se todos forem verified ou nenhum fato de risco existir
  let projectStatus: CommercialProjectGuardStatus = 'COMMERCIAL_SAFE';
  let canProceedToCopyCompilation = true;

  if (blockingReasons.length > 0) {
    projectStatus = 'COMMERCIAL_BLOCKED';
    canProceedToCopyCompilation = false;
  } else if (unverifiedFacts.length > 0 || rejectedFacts.length > 0 || warnings.length > 0) {
    projectStatus = 'COMMERCIAL_SAFE_WITH_WARNINGS';
    canProceedToCopyCompilation = true;
  }

  const guardResult: CommercialFactGuardResult = {
    facts: allValidatedFacts,
    verifiedFacts,
    unverifiedFacts,
    rejectedFacts,
    warnings: Array.from(new Set(warnings)),
    blockingReasons: Array.from(new Set(blockingReasons)),
    canProceedToCopyCompilation,
    projectStatus,
    effectiveVerifiedCommercialFacts: effectiveCommercialFacts,
  };

  return {
    scenes: guardedScenes,
    projectBlueprint: project,
    guardResult,
  };
}
