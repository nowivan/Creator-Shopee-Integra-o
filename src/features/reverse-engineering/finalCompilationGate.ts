/**
 * FINAL COMPILATION GATE — ETAPA 8
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Gate determinístico final que decide formalmente se um projeto remodelado está
 * apto para seguir para a compilação de prompt visual e copy final.
 * 
 * Combina:
 * - MotionSafetyGateResult
 * - CommercialFactGuardResult
 * - RemodeledProjectBlueprint
 * - IdentityInjectionContext
 * - ProductInjectionContext
 * - StrippedReferenceDNA
 * 
 * Princípios Rígidos:
 * 1. Pura, determinística, imutável, idempotente e null-safe.
 * 2. Não gera copy nem visual_prompt_en.
 * 3. Não corrige conteúdo silenciosamente.
 * 4. Decisão formal: READY_FOR_FINAL_COMPILATION | READY_WITH_WARNINGS | BLOCKED.
 * 5. Se BLOCKED -> canCompileFinal = false e buildApprovedFinalCompilationInput retorna null.
 * 6. Preserva integralmente motion lock directives e fatos comerciais verificados.
 */

import {
  RemodeledProjectBlueprint,
  RemodeledSceneBlueprint,
  FinalCompilationGateInput,
  FinalCompilationGateResult,
  FinalCompilationSceneResult,
  FinalCompilationProjectStatus,
  FinalCompilationSceneStatus,
  GateCheckDetail,
  ApprovedFinalCompilationInput,
  ApprovedFinalSceneMotionLockDirective,
  ApprovedFinalCopyScene,
  ApprovedFinalVisualScene,
  CommercialFactValidationResult,
  MotionLockedRemodeledScene,
} from './types';

// ============================================================================
// 1. CHECAGEM DE ISOLAMENTO DE IDENTIDADE
// ============================================================================

export function checkIdentityIsolation(
  project: RemodeledProjectBlueprint,
  input: FinalCompilationGateInput
): GateCheckDetail {
  const details: string[] = [];
  const targetAvatarName = (input.identityContext?.visual?.avatarName || '').trim().toLowerCase();
  const removedIdentities = (input.strippedReference?.removedElements?.identity || [])
    .concat(input.strippedReference?.preservationReport?.removedIdentitySpecific || []);

  // Verifica se há vazamento residual de identidade da referência nas cenas
  for (const scene of project.scenes || []) {
    const sceneText = JSON.stringify({
      sceneVisual: scene.visualDirection,
      sceneIdentity: scene.identityContext,
      sceneCopy: scene.copyDirection,
    }).toLowerCase();

    // Se a referência tinha uma identidade específica removida e ela reapareceu
    for (const idStr of removedIdentities) {
      const trimmed = idStr.trim().toLowerCase();
      if (trimmed.length > 2 && sceneText.includes(trimmed)) {
        if (!targetAvatarName || !trimmed.includes(targetAvatarName)) {
          details.push(`[${scene.sceneId}] Identidade original da referência ("${idStr}") detectada no blueprint remodelado.`);
        }
      }
    }
  }

  if (details.length > 0) {
    return {
      status: 'BLOCK',
      passed: false,
      details,
    };
  }

  return {
    status: 'PASS',
    passed: true,
    details: ['Isolamento de identidade estrito validado com sucesso.'],
  };
}

// ============================================================================
// 2. CHECAGEM DE CONTEXTO DE PRODUTO
// ============================================================================

export function checkProductContextIntegrity(
  project: RemodeledProjectBlueprint,
  input: FinalCompilationGateInput
): GateCheckDetail {
  const details: string[] = [];
  const hasProduct = Boolean(
    input.productContext?.structural?.name ||
    input.productContext?.structural?.category ||
    project.productContext?.structural?.name
  );

  let requiresProductCount = 0;

  for (const scene of project.scenes || []) {
    const isProductCentricRole = ['DEMONSTRATION', 'PROOF', 'OFFER', 'CTA'].includes(scene.role);
    if (isProductCentricRole) {
      requiresProductCount++;
      const sceneHasProduct = Boolean(scene.productContext?.structural?.name);
      if (!hasProduct && !sceneHasProduct) {
        details.push(`[${scene.sceneId}] Cena de ${scene.role} exige contexto estrutural de produto, mas nenhum produto válido foi informado.`);
      }
    }
  }

  if (details.length > 0) {
    return {
      status: 'WARN',
      passed: true,
      details,
    };
  }

  return {
    status: 'PASS',
    passed: true,
    details: [hasProduct ? 'Contexto de produto válido e alinhado a todas as cenas.' : 'Projeto sem dependência crítica de produto físico.'],
  };
}

// ============================================================================
// 3. CHECAGEM DE SANITIZAÇÃO DA REFERÊNCIA
// ============================================================================

export function checkReferenceSanitization(
  project: RemodeledProjectBlueprint,
  input: FinalCompilationGateInput
): GateCheckDetail {
  const details: string[] = [];
  const stripped = input.strippedReference;

  if (!stripped) {
    return {
      status: 'PASS',
      passed: true,
      details: ['Sem dados brutos de referência pré-existentes para validação residual.'],
    };
  }

  // Verificar se elementos removidos da referência reapareceram no blueprint
  const removedTerms: string[] = [
    ...(stripped.removedElements?.product || []),
    ...(stripped.removedElements?.commercialFacts || []),
    ...(stripped.removedElements?.copyLiteral || []),
    ...(stripped.preservationReport?.removedProductSpecific || []),
    ...(stripped.preservationReport?.removedCommercialFacts || []),
    ...(stripped.preservationReport?.removedLiteralCopy || []),
  ];

  for (const scene of project.scenes || []) {
    const sceneJson = JSON.stringify(scene).toLowerCase();
    for (const term of removedTerms) {
      const trimmed = term.trim().toLowerCase();
      if (trimmed.length > 3 && sceneJson.includes(trimmed)) {
        details.push(`[${scene.sceneId}] Dado da referência que foi removido reapareceu no blueprint remodelado: "${term}".`);
      }
    }
  }

  if (details.length > 0) {
    return {
      status: 'BLOCK',
      passed: false,
      details: Array.from(new Set(details)),
    };
  }

  return {
    status: 'PASS',
    passed: true,
    details: ['Sanitização de referência confirmada. Zero contaminação residual detectada.'],
  };
}

// ============================================================================
// 4. AVALIAÇÃO DE CENA INDIVIDUAL
// ============================================================================

export function evaluateFinalCompilationScene(
  scene: RemodeledSceneBlueprint,
  input: FinalCompilationGateInput,
  index: number
): FinalCompilationSceneResult {
  const sceneId = scene.sceneId || `scene_${index + 1}`;
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  // A. Motion Safety da Cena
  const motionScene = input.motionSafety?.sceneResults?.find(s => s.sceneId === sceneId);
  if (motionScene) {
    if (motionScene.status === 'BLOCK') {
      blockingReasons.push(...motionScene.blockingReasons);
    } else if (motionScene.status === 'WARN') {
      warnings.push(...motionScene.warnings);
    }
  } else if (scene.safetyFlags?.requiresSafetyValidation) {
    warnings.push('Validação de segurança física recomendada para esta cena.');
  }

  // B. Fatos Comerciais da Cena
  const commScene = input.commercialSafety?.facts?.filter(f => f.sceneId === sceneId) || [];
  for (const fact of commScene) {
    if (fact.status === 'REJECTED') {
      warnings.push(`Fato comercial rejeitado omitido da cena: "${fact.value}"`);
    } else if (fact.status === 'UNVERIFIED') {
      warnings.push(`Fato comercial não verificado mantido fora da copy: "${fact.value}"`);
    }
  }

  // C. Incompatibilidade física explícita no blueprint
  if (scene.safetyFlags?.incompatibleActions && scene.safetyFlags.incompatibleActions.length > 0) {
    blockingReasons.push(`Ações físicas incompatíveis: ${scene.safetyFlags.incompatibleActions.join(', ')}`);
  }

  // Precedência estrita: BLOCK sempre vence WARN
  let status: FinalCompilationSceneStatus = 'READY';
  let canCompile = true;

  if (blockingReasons.length > 0) {
    status = 'BLOCK';
    canCompile = false;
  } else if (warnings.length > 0) {
    status = 'WARN';
    canCompile = true;
  }

  return {
    sceneId,
    status,
    canCompile,
    blockingReasons: Array.from(new Set(blockingReasons)),
    warnings: Array.from(new Set(warnings)),
  };
}

// ============================================================================
// 5. FINAL COMPILATION GATE (GLOBAL EVALUATION)
// ============================================================================

export function evaluateFinalCompilationGate(
  input: FinalCompilationGateInput
): FinalCompilationGateResult {
  const project = input.project;
  const scenes = project?.scenes || [];

  const allBlockingReasons: string[] = [];
  const allWarnings: string[] = [];

  // 1. Checagem Motion Safety
  let motionCheck: GateCheckDetail;
  if (!input.motionSafety) {
    motionCheck = {
      status: 'WARN',
      passed: true,
      details: ['MOTION_SAFETY_MISSING: Motion Safety Gate result não fornecido no input.'],
    };
    allWarnings.push('MOTION_SAFETY_MISSING: Motion Safety Gate result não fornecido.');
  } else if (input.motionSafety.projectStatus === 'BLOCKED') {
    motionCheck = {
      status: 'BLOCK',
      passed: false,
      details: input.motionSafety.blockingReasons,
    };
    allBlockingReasons.push(...input.motionSafety.blockingReasons);
  } else if (input.motionSafety.projectStatus === 'CONTINUE_WITH_WARNINGS') {
    motionCheck = {
      status: 'WARN',
      passed: true,
      details: input.motionSafety.warnings,
    };
    allWarnings.push(...input.motionSafety.warnings);
  } else {
    motionCheck = {
      status: 'PASS',
      passed: true,
      details: ['Motion Safety Gate aprovado com status SAFE_TO_CONTINUE.'],
    };
  }

  // 2. Checagem Commercial Safety
  let commCheck: GateCheckDetail;
  if (!input.commercialSafety) {
    commCheck = {
      status: 'WARN',
      passed: true,
      details: ['COMMERCIAL_SAFETY_MISSING: Commercial Fact Guard result não fornecido no input.'],
    };
    allWarnings.push('COMMERCIAL_SAFETY_MISSING: Commercial Fact Guard result não fornecido.');
  } else if (input.commercialSafety.projectStatus === 'COMMERCIAL_BLOCKED') {
    commCheck = {
      status: 'BLOCK',
      passed: false,
      details: input.commercialSafety.blockingReasons,
    };
    allBlockingReasons.push(...input.commercialSafety.blockingReasons);
  } else if (input.commercialSafety.projectStatus === 'COMMERCIAL_SAFE_WITH_WARNINGS') {
    commCheck = {
      status: 'WARN',
      passed: true,
      details: input.commercialSafety.warnings,
    };
    allWarnings.push(...input.commercialSafety.warnings);
  } else {
    commCheck = {
      status: 'PASS',
      passed: true,
      details: ['Commercial Fact Guard aprovado com status COMMERCIAL_SAFE.'],
    };
  }

  // 3. Checagens Estruturais
  const identityCheck = checkIdentityIsolation(project, input);
  if (!identityCheck.passed) allBlockingReasons.push(...identityCheck.details);

  const productCheck = checkProductContextIntegrity(project, input);
  if (productCheck.status === 'WARN') allWarnings.push(...productCheck.details);

  const sanitizationCheck = checkReferenceSanitization(project, input);
  if (!sanitizationCheck.passed) allBlockingReasons.push(...sanitizationCheck.details);

  // 4. Avaliação por Cena
  let readyScenes = 0;
  let warningScenes = 0;
  let blockedScenes = 0;
  const sceneResults: FinalCompilationSceneResult[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sceneRes = evaluateFinalCompilationScene(scenes[i], input, i);
    sceneResults.push(sceneRes);

    if (sceneRes.status === 'READY') {
      readyScenes++;
    } else if (sceneRes.status === 'WARN') {
      warningScenes++;
    } else if (sceneRes.status === 'BLOCK') {
      blockedScenes++;
    }

    if (sceneRes.blockingReasons.length > 0) {
      allBlockingReasons.push(...sceneRes.blockingReasons);
    }
    if (sceneRes.warnings.length > 0) {
      allWarnings.push(...sceneRes.warnings);
    }
  }

  // 5. Decisão Global
  const checks = {
    motionSafety: motionCheck,
    commercialSafety: commCheck,
    identityIsolation: identityCheck,
    productContext: productCheck,
    referenceSanitization: sanitizationCheck,
  };

  const hasAnyBlock = blockedScenes > 0 ||
    motionCheck.status === 'BLOCK' ||
    commCheck.status === 'BLOCK' ||
    identityCheck.status === 'BLOCK' ||
    sanitizationCheck.status === 'BLOCK';

  const hasAnyWarn = warningScenes > 0 ||
    motionCheck.status === 'WARN' ||
    commCheck.status === 'WARN' ||
    productCheck.status === 'WARN' ||
    allWarnings.length > 0;

  let status: FinalCompilationProjectStatus = 'READY_FOR_FINAL_COMPILATION';
  let canCompileFinal = true;

  if (hasAnyBlock) {
    status = 'BLOCKED';
    canCompileFinal = false;
  } else if (hasAnyWarn) {
    status = 'READY_WITH_WARNINGS';
    canCompileFinal = true;
  }

  return {
    status,
    canCompileFinal,
    sceneResults,
    blockingReasons: Array.from(new Set(allBlockingReasons)),
    warnings: Array.from(new Set(allWarnings)),
    checks,
    summary: {
      totalScenes: scenes.length,
      readyScenes,
      warningScenes,
      blockedScenes,
    },
  };
}

// ============================================================================
// 6. CONSTRUTOR DE PAYLOAD APROVADO PARA COMPILAÇÃO FINAL
// ============================================================================

export function buildApprovedFinalCompilationInput(
  input: FinalCompilationGateInput,
  gateResult: FinalCompilationGateResult
): ApprovedFinalCompilationInput | null {
  if (!gateResult.canCompileFinal || gateResult.status === 'BLOCKED') {
    return null;
  }

  const project = input.project;
  const verifiedCommercialFacts: CommercialFactValidationResult[] =
    input.commercialSafety?.verifiedFacts || [];

  const verifiedFactStrings = verifiedCommercialFacts.map(f => f.value);

  // 1. Extração de Diretrizes de Motion Lock
  const motionLockDirectives: ApprovedFinalSceneMotionLockDirective[] = (project.scenes || []).map(s => {
    const lockedScene = s as MotionLockedRemodeledScene;
    const output = lockedScene.motionLockResult?.output;

    return {
      sceneId: s.sceneId,
      prompt_addition: output?.prompt_addition,
      negative_prompt_addition: output?.negative_prompt_addition,
      settings_addition: output?.settings_addition,
      locks: output?.locks,
      region_locks_template: output?.region_locks_template,
      flow_agent_instructions: output?.flow_agent_instructions,
    };
  });

  // 2. Preparação de Cenas de Copy
  const copyScenes: ApprovedFinalCopyScene[] = (project.scenes || []).map(s => ({
    sceneId: s.sceneId,
    role: s.role,
    copyIntent: s.copyDirection?.suggestedIntent,
    voiceStyle: s.voiceDirection?.viralDeliveryPattern,
    ctaStrategy: s.ctaDirection?.actionType,
    verifiedFacts: verifiedFactStrings,
  }));

  // 3. Preparação de Cenas Visuais
  const visualScenes: ApprovedFinalVisualScene[] = (project.scenes || []).map(s => {
    const lockedScene = s as MotionLockedRemodeledScene;
    const motionPrompt = lockedScene.motionLockResult?.output?.prompt_addition;

    return {
      sceneId: s.sceneId,
      role: s.role,
      visualDirection: s.visualDirection,
      structural: input.productContext?.structural || project.productContext?.structural,
      visualIdentity: input.identityContext?.visual || project.identityContext?.visual,
      physicalMotion: s.physicalMotion,
      motionLockPrompt: motionPrompt,
    };
  });

  return {
    approvedProject: project,
    motionLockDirectives,
    verifiedCommercialFacts,
    identityContext: input.identityContext || project.identityContext,
    productContext: input.productContext || project.productContext,
    copyInputPayload: {
      platform: project.scenes?.[0]?.copyDirection?.platformBehavior || 'TikTok / Reels',
      copyViralDNA: input.strippedReference?.copyViralDNA,
      scenes: copyScenes,
    },
    visualInputPayload: {
      scenes: visualScenes,
    },
    warnings: gateResult.warnings,
  };
}
