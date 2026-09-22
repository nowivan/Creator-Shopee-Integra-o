/**
 * REMODEL MOTION LOCK ADAPTER — ETAPA 7A.2
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Conectar o RemodeledSceneBlueprint e RemodeledProjectBlueprint ao
 * productMotionLockEngine existente de forma pura, imutável e determinística.
 * 
 * Princípios Rígidos:
 * 1. Não modifica productMotionLockEngine.ts existente.
 * 2. Não altera RemodelCompiler nem MotionAdaptationEngine.
 * 3. Não decide grip, nova pose, nova trajetória nem reescreve cenas.
 * 4. Resolve status de validação determinístico (PASS / WARN / BLOCK) no adapter.
 * 5. Preserva integralmente outputs do engine (prompt_addition, negative_prompt_addition, locks, settings_addition, region_locks_template, flow_agent_instructions).
 * 6. Imutabilidade estrita e idempotência completa.
 */

import {
  RemodeledSceneBlueprint,
  RemodeledProjectBlueprint,
  MotionLockIntegrationResult,
  MotionLockValidationStatus,
  MotionLockedRemodeledScene,
  MotionLockedRemodeledProject,
  MotionLockedProjectSummary,
  RemodeledMotionScene,
} from './types';

import {
  buildProductMotionLock,
  ProductMotionLockInput,
  ProductMotionLockOutput,
} from '../cinematic/productMotionLockEngine';

// ============================================================================
// 1. CONVERSÃO DE BLUEPRINT DE CENA PARA INPUT DO MOTION LOCK ENGINE
// ============================================================================

/**
 * Converte um RemodeledSceneBlueprint no ProductMotionLockInput padrão aceito pelo engine existente.
 */
export function sceneBlueprintToMotionLockInput(
  scene: RemodeledSceneBlueprint
): ProductMotionLockInput {
  const structural = scene?.productContext?.structural;
  const hasValidProduct = Boolean(
    structural &&
    (structural.name?.trim() || structural.category?.trim() || (structural.fixedParts && structural.fixedParts.length > 0))
  );

  const productName = structural?.name?.trim() || undefined;
  const category = structural?.category?.trim() || undefined;
  const staticComponents = structural?.fixedParts && structural.fixedParts.length > 0
    ? [...structural.fixedParts]
    : undefined;
  const customComponentsText = structural?.movingParts && structural.movingParts.length > 0
    ? structural.movingParts.join(', ')
    : undefined;

  return {
    enabled: hasValidProduct,
    mode: 'auto',
    productName,
    category,
    staticComponents,
    customComponentsText,
  };
}

// ============================================================================
// 2. APLICAÇÃO DO MOTION LOCK EM UMA CENA INDIVIDUAL
// ============================================================================

/**
 * Aplica o productMotionLockEngine determinístico a uma cena e calcula o MotionLockIntegrationResult.
 */
export function applyMotionLockToScene(
  scene: RemodeledSceneBlueprint
): MotionLockIntegrationResult {
  const input = sceneBlueprintToMotionLockInput(scene);
  const warnings: string[] = [];

  // Verificação de Motion Scene e Incompatibilidades
  const motionScene = scene?.physicalMotion as RemodeledMotionScene | undefined;
  const isRemodeledMotion = Boolean(motionScene && motionScene.adaptedMotion);
  const incompatibleActions = scene?.safetyFlags?.incompatibleActions || [];
  const hasIncompatibleActions = incompatibleActions.length > 0;
  const isMotionIncompatible = isRemodeledMotion && motionScene?.compatibility === 'INCOMPATIBLE';

  // 1. Cenário de BLOCK (Conflitos físicos e estruturais explícitos já catalogados no blueprint)
  if (hasIncompatibleActions || isMotionIncompatible) {
    const blockReasons: string[] = [];
    if (hasIncompatibleActions) {
      blockReasons.push(`Ações físicas incompatíveis detectadas: ${incompatibleActions.join(', ')}`);
    }
    if (isMotionIncompatible) {
      blockReasons.push('Movimento marcado como INCOMPATIBLE pelo motor de adaptação física');
    }

    const output: ProductMotionLockOutput = buildProductMotionLock(input);

    return {
      applied: input.enabled,
      input,
      output,
      validationStatus: 'BLOCK',
      warnings: blockReasons,
    };
  }

  // 2. Cenário sem Produto ou com Dados Insuficientes (WARN Fallback)
  const structural = scene?.productContext?.structural;
  const hasFullProductInfo = Boolean(
    structural?.name &&
    structural?.category &&
    structural.category.toUpperCase() !== 'UNKNOWN' &&
    structural.category.toUpperCase() !== 'PRODUTO' &&
    structural?.fixedParts &&
    structural.fixedParts.length > 0
  );

  if (!input.enabled) {
    warnings.push('INSUFFICIENT_MOTION_LOCK_DATA: Nenhum contexto de produto estrutural presente na cena');
  } else if (!hasFullProductInfo) {
    warnings.push('INSUFFICIENT_MOTION_LOCK_DATA: Especificação estrutural do produto está parcial ou com categoria genérica');
  }

  // 3. Verificação de Safety Flags e Continuidade (WARN)
  if (scene?.safetyFlags?.requiresSafetyValidation) {
    warnings.push('REQUIRES_SAFETY_VALIDATION: Cena sinalizada para validação adicional de segurança física');
  }
  if (scene?.safetyFlags?.continuityWarnings && scene.safetyFlags.continuityWarnings.length > 0) {
    warnings.push(...scene.safetyFlags.continuityWarnings);
  }
  if (scene?.safetyFlags?.lowTransferability) {
    warnings.push('LOW_TRANSFERABILITY: Baixa transferabilidade de movimento entre referências');
  }

  const output: ProductMotionLockOutput = buildProductMotionLock(input);

  // 4. Determinação final do Status
  const validationStatus: MotionLockValidationStatus = (!input.enabled || warnings.length > 0)
    ? 'WARN'
    : 'PASS';

  return {
    applied: input.enabled,
    input,
    output,
    validationStatus,
    warnings: Array.from(new Set(warnings)),
  };
}

// ============================================================================
// 3. APLICAÇÃO DO MOTION LOCK EM UM PROJETO COMPLETO
// ============================================================================

/**
 * Itera sobre todas as cenas do RemodeledProjectBlueprint de forma pura e imutável,
 * anexando o resultado do motion lock e compilando o summary do projeto.
 */
export function applyMotionLocksToProject(
  project: RemodeledProjectBlueprint
): MotionLockedRemodeledProject {
  const scenes = project?.scenes || [];

  let passCount = 0;
  let warnCount = 0;
  let blockCount = 0;
  let lockAppliedCount = 0;

  const motionLockedScenes: MotionLockedRemodeledScene[] = scenes.map(scene => {
    const motionLockResult = applyMotionLockToScene(scene);

    if (motionLockResult.validationStatus === 'PASS') {
      passCount++;
    } else if (motionLockResult.validationStatus === 'WARN') {
      warnCount++;
    } else if (motionLockResult.validationStatus === 'BLOCK') {
      blockCount++;
    }

    if (motionLockResult.applied) {
      lockAppliedCount++;
    }

    // Retorna uma cópia da cena enriquecida com o resultado do lock sem mutar o original
    return {
      ...scene,
      motionLockResult,
    };
  });

  // Resolução do overallStatus do projeto
  const overallStatus: MotionLockValidationStatus = blockCount > 0
    ? 'BLOCK'
    : warnCount > 0
      ? 'WARN'
      : 'PASS';

  const summary: MotionLockedProjectSummary = {
    passCount,
    warnCount,
    blockCount,
    lockAppliedCount,
    overallStatus,
  };

  return {
    scenes: motionLockedScenes,
    projectBlueprint: project,
    summary,
  };
}
