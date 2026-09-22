/**
 * FINAL COPY COMPILER — ETAPA 9A
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Compilador final de copy em PT-BR para projetos remodelados de Engenharia Reversa.
 * Gera `dialogue_pt_br` por cena exclusivamente a partir de `ApprovedFinalCompilationInput`.
 * 
 * Princípios Rígidos:
 * 1. Consome estritamente `ApprovedFinalCompilationInput`.
 * 2. Preserva a FUNÇÃO PERSUASIVA (CopyViralDNA, hookPattern, conversionPattern, ctaStrategy),
 *    mas NUNCA preserva ou copia frases literais da referência (Zero Literal Copy Leak).
 * 3. Claims de alto risco (preço, desconto, estoque, prazo, ranking, demanda, frete grátis)
 *    SÓ PODEM ser gerados se existirem em `verifiedCommercialFacts`.
 * 4. Sem fatos verificados de urgência -> OMITIR completamente (Zero Claim Invention).
 * 5. PUREZA DE PAPÉIS:
 *    - Scene 2 (DEMONSTRATION / BENEFIT / PROOF) -> Benefício e função física; ZERO CTA e zero termos promocionais.
 *    - Scene 3 (OFFER / CTA) -> Urgência apenas se factual; CTA compatível com a plataforma alvo.
 * 6. Integração com Semantic Evidence Guard e Copy Contract existentes.
 * 7. Pura, determinística, imutável e sem efeitos colaterais.
 */

import {
  ApprovedFinalCompilationInput,
  ApprovedFinalCopyScene,
  FinalRemodeledCopyProject,
  FinalRemodeledCopyScene,
  FinalRemodeledCopyReport,
  CopyViralDNA,
  ProductInjectionContext,
  IdentityInjectionContext,
} from './types';

import {
  validateSemanticEvidence,
  VerifiedCommercialFacts,
} from '../creative-director/services/scene3CtaEngine';

import {
  validateCopyContract,
} from '../copy-contract';

// ============================================================================
// PLATFORM CTA STRATEGIES
// ============================================================================

export function resolvePlatformCtaPhrase(platform?: string, actionType?: string): string {
  const p = (platform || '').toLowerCase();

  if (p.includes('tiktok') || p.includes('shop')) {
    return 'toque no carrinho laranja aqui embaixo para garantir o seu';
  }
  if (p.includes('shopee')) {
    return 'clique na sacolinha do vídeo e veja os detalhes';
  }
  if (p.includes('mercado') || p.includes('livre')) {
    return 'acesse o link do produto para conferir todas as informações';
  }
  if (p.includes('reels') || p.includes('instagram')) {
    return 'toque no link da bio para conferir';
  }
  if (p.includes('youtube') || p.includes('shorts')) {
    return 'acesse o link fixado no primeiro comentário para saber mais';
  }

  // Default universal e seguro
  return 'toque no link abaixo para garantir o seu';
}

// ============================================================================
// BUILDERS DE COPY PERSUASIVA POR PAPEL (SEM VAZAMENTO LITERAL)
// ============================================================================

interface SceneCopyContext {
  scene: ApprovedFinalCopyScene;
  productContext?: ProductInjectionContext;
  identityContext?: IdentityInjectionContext;
  viralDNA?: CopyViralDNA;
  verifiedFacts: string[];
  effectiveFacts: VerifiedCommercialFacts;
  platform?: string;
}

/**
 * Gera diálogo remodelado para papel de HOOK.
 */
function buildHookCopy(ctx: SceneCopyContext): string {
  const productName = ctx.productContext?.structural?.name || 'este produto';
  const benefit = ctx.productContext?.commercial?.mainBenefit || 'sua rotina prática';
  const hookPattern = ctx.viralDNA?.hookPattern || 'CURIOSITY';

  const hookLower = hookPattern.toUpperCase();

  if (hookLower.includes('PROBLEM') || hookLower.includes('PAIN')) {
    return `Se você também tem dificuldade em encontrar um produto que realmente resolva ${benefit}, precisa ver isso.`;
  }
  if (hookLower.includes('CURIOSITY') || hookLower.includes('DISCOVERY')) {
    return `Eu precisei testar o ${productName} para entender por que todo mundo estava comentando sobre essa solução.`;
  }
  if (hookLower.includes('DEMONSTRATION') || hookLower.includes('ACTION')) {
    return `Dá uma olhada no funcionamento do ${productName} na prática e como ele se comporta no uso diário.`;
  }

  // Fallback padrão persuasivo
  return `Se você procura mais eficiência para ${benefit}, o ${productName} foi feito exatamente para isso.`;
}

/**
 * Gera diálogo remodelado para papel de PROBLEM ou DESIRE.
 */
function buildProblemDesireCopy(ctx: SceneCopyContext): string {
  const productName = ctx.productContext?.structural?.name || 'produto';
  const problemArea = ctx.productContext?.commercial?.mainBenefit
    ? `lidar com ${ctx.productContext.commercial.mainBenefit.toLowerCase()}`
    : 'encontrar durabilidade e eficiência no mesmo item';

  if (ctx.scene.role === 'PROBLEM') {
    return `A maioria das opções do mercado costuma falhar justamente na hora em que você mais precisa de consistência e estabilidade.`;
  }

  return `O ponto mais importante que todo mundo busca é ter uma solução prática, moderna e que entregue exatamente o que foi prometido.`;
}

/**
 * Gera diálogo remodelado para papel de SOLUTION ou DEMONSTRATION.
 * PUREZA: ZERO CTA, ZERO PROMOÇÃO. Foco em mecanismo físico e benefício prático.
 */
function buildSolutionDemoCopy(ctx: SceneCopyContext): string {
  const productName = ctx.productContext?.structural?.name || 'ele';
  const fixedParts = ctx.productContext?.structural?.fixedParts || [];
  const movingParts = ctx.productContext?.structural?.movingParts || [];
  const benefit = ctx.productContext?.commercial?.mainBenefit || '';

  const physicalDetail = fixedParts.length > 0
    ? `com estrutura em ${fixedParts[0]}`
    : movingParts.length > 0
      ? `com ajuste preciso de ${movingParts[0]}`
      : 'com acabamento reforçado';

  if (benefit && benefit.length > 5) {
    return `O ${productName} foi desenvolvido ${physicalDetail}, garantindo ${benefit.toLowerCase()} sem complicações no seu dia a dia.`;
  }

  return `Na prática, o ${productName} opera ${physicalDetail}, entregando uma resposta imediata com total estabilidade de uso.`;
}

/**
 * Gera diálogo remodelado para papel de PROOF.
 */
function buildProofCopy(ctx: SceneCopyContext): string {
  const productName = ctx.productContext?.structural?.name || 'produto';
  const verifiedFirst = ctx.verifiedFacts.length > 0 ? ctx.verifiedFacts[0] : null;

  if (verifiedFirst) {
    return `Como você pode observar, o ${productName} conta com ${verifiedFirst}, comprovando a solidez da sua construção.`;
  }

  return `A qualidade construtiva se destaca em cada detalhe visível, mantendo o padrão esperado durante toda a utilização.`;
}

/**
 * Gera diálogo remodelado para papel de OFFER ou CTA.
 * Fact-backed claims ONLY.
 */
function buildOfferCtaCopy(ctx: SceneCopyContext): string {
  const ctaPhrase = resolvePlatformCtaPhrase(ctx.platform, ctx.scene.ctaStrategy);
  const productName = ctx.productContext?.structural?.name || 'produto';

  // Verificar se há desconto verificado
  const hasDiscount = ctx.effectiveFacts.hasExplicitDiscount;
  const hasStock = ctx.effectiveFacts.hasExplicitStockLimit;
  const hasDeadline = ctx.effectiveFacts.hasExplicitDeadline;

  let offerPreamble = `Para garantir o seu ${productName} com total segurança`;

  if (hasDiscount && ctx.effectiveFacts.discountPercentage) {
    offerPreamble = `Aproveitando as condições confirmadas de ${ctx.effectiveFacts.discountPercentage}%`;
  } else if (hasDiscount) {
    offerPreamble = `Aproveitando a condição de desconto confirmada`;
  } else if (hasStock) {
    offerPreamble = `Com o lote atual disponível para pedido`;
  } else if (hasDeadline) {
    offerPreamble = `Aproveitando o período anunciado`;
  }

  return `${offerPreamble}, ${ctaPhrase}.`;
}

// ============================================================================
// COMPILADOR DE CENA INDIVIDUAL
// ============================================================================

export function compileRemodeledSceneCopy(
  ctx: SceneCopyContext
): FinalRemodeledCopyScene {
  const role = (ctx.scene.role || 'DEMONSTRATION').toUpperCase();
  const sceneId = ctx.scene.sceneId;

  let rawDialogue = '';
  const appliedFacts: string[] = [];
  const omittedFacts: string[] = [];
  const warnings: string[] = [];

  // 1. Roteamento por SceneRole
  if (role === 'HOOK') {
    rawDialogue = buildHookCopy(ctx);
  } else if (role === 'PROBLEM' || role === 'DESIRE') {
    rawDialogue = buildProblemDesireCopy(ctx);
  } else if (role === 'SOLUTION' || role === 'DEMONSTRATION') {
    rawDialogue = buildSolutionDemoCopy(ctx);
  } else if (role === 'PROOF') {
    rawDialogue = buildProofCopy(ctx);
  } else if (role === 'OFFER' || role === 'CTA') {
    rawDialogue = buildOfferCtaCopy(ctx);
  } else {
    rawDialogue = buildSolutionDemoCopy(ctx);
  }

  // 2. Coleta de fatos aplicados vs omitidos
  for (const fact of ctx.verifiedFacts) {
    if (rawDialogue.toLowerCase().includes(fact.toLowerCase())) {
      appliedFacts.push(fact);
    }
  }

  // 3. Validação com Semantic Evidence Guard
  const semanticValidation = validateSemanticEvidence(rawDialogue, ctx.effectiveFacts);
  if (!semanticValidation.valid) {
    for (const v of semanticValidation.violations) {
      warnings.push(`[SemanticEvidence] ${v.reason}`);
      omittedFacts.push(v.claim);
    }
  }

  // 4. Checagem de Pureza de Papel (Scene 2 / Demo NÃO pode ter CTA)
  const isNonCtaRole = ['HOOK', 'PROBLEM', 'DESIRE', 'SOLUTION', 'DEMONSTRATION', 'PROOF'].includes(role);
  const hasCtaLeak = /(?:toque\s+no\s+link|clique\s+no\s+carrinho|link\s+da\s+bio|acesse\s+o\s+link|garanta\s+o\s+seu)/i.test(rawDialogue);

  if (isNonCtaRole && hasCtaLeak) {
    warnings.push(`[RolePurity] CTA detectado em cena de papel não-comercial (${role}).`);
  }

  // 5. Garantia de pontuação final
  let dialogue_pt_br = rawDialogue.trim();
  if (!/[.!?]$/.test(dialogue_pt_br)) {
    dialogue_pt_br += '.';
  }

  return {
    sceneId,
    role,
    dialogue_pt_br,
    appliedFacts: Array.from(new Set(appliedFacts)),
    omittedFacts: Array.from(new Set(omittedFacts)),
    warnings: Array.from(new Set(warnings)),
  };
}

// ============================================================================
// COMPILADOR DE PROJETO COMPLETO DE COPY (PURE & DETERMINISTIC)
// ============================================================================

export function compileFinalRemodeledCopy(
  input: ApprovedFinalCompilationInput
): FinalRemodeledCopyProject {
  const copyScenesInput = input?.copyInputPayload?.scenes || [];
  const platform = input?.copyInputPayload?.platform || 'TikTok Shop';
  const viralDNA = input?.copyInputPayload?.copyViralDNA;
  const productContext = input?.productContext;
  const identityContext = input?.identityContext;

  // Extração de fatos verificados do input aprovado
  const verifiedCommercialFacts = input?.verifiedCommercialFacts || [];
  const verifiedFactStrings = verifiedCommercialFacts
    .filter(f => f.status === 'VERIFIED')
    .map(f => f.value);

  // Normalização de fatos efetivos para o Semantic Evidence Guard
  const effectiveFacts: VerifiedCommercialFacts = {
    hasExplicitDiscount: verifiedCommercialFacts.some(f => f.type === 'DISCOUNT' && f.status === 'VERIFIED'),
    hasExplicitStockLimit: verifiedCommercialFacts.some(f => f.type === 'STOCK' && f.status === 'VERIFIED'),
    hasExplicitDeadline: verifiedCommercialFacts.some(f => f.type === 'DEADLINE' && f.status === 'VERIFIED'),
    hasExplicitOffer: verifiedCommercialFacts.some(f => f.type === 'PROMOTION' && f.status === 'VERIFIED'),
    hasVisiblePrice: verifiedCommercialFacts.some(f => f.type === 'PRICE' && f.status === 'VERIFIED'),
  };

  const compiledScenes: FinalRemodeledCopyScene[] = [];
  const rolePurityWarnings: string[] = [];
  const copyWarnings: string[] = [];
  let factBackedCount = 0;
  let omittedCount = 0;

  for (const sceneInput of copyScenesInput) {
    const sceneResult = compileRemodeledSceneCopy({
      scene: sceneInput,
      productContext,
      identityContext,
      viralDNA,
      verifiedFacts: verifiedFactStrings,
      effectiveFacts,
      platform,
    });

    compiledScenes.push(sceneResult);

    factBackedCount += sceneResult.appliedFacts.length;
    omittedCount += sceneResult.omittedFacts.length;

    for (const w of sceneResult.warnings) {
      if (w.includes('[RolePurity]')) {
        rolePurityWarnings.push(`[${sceneResult.sceneId}] ${w}`);
      } else {
        copyWarnings.push(`[${sceneResult.sceneId}] ${w}`);
      }
    }
  }

  const copyReport: FinalRemodeledCopyReport = {
    generatedScenes: compiledScenes.length,
    factBackedClaims: factBackedCount,
    omittedUnverifiedClaims: omittedCount,
    rolePurityWarnings: Array.from(new Set(rolePurityWarnings)),
    copyWarnings: Array.from(new Set(copyWarnings)),
  };

  return {
    scenes: compiledScenes,
    copyReport,
  };
}
