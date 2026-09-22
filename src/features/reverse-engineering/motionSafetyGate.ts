/**
 * FINAL MOTION SAFETY GATE — ETAPA 7A.3
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Gate determinístico final de segurança física que avalia o MotionLockedRemodeledProject
 * para decidir formalmente se o projeto remodelado está apto a prosseguir para a
 * compilação final (SAFE_TO_CONTINUE, CONTINUE_WITH_WARNINGS ou BLOCKED).
 * 
 * Princípios Rígidos:
 * 1. Não reavalia a física do produto nem cria novas heurísticas.
 * 2. Consome exclusivamente os dados e validações já computadas pelo Motion Lock Adapter.
 * 3. Se qualquer cena for BLOCK -> projectStatus = BLOCKED e canProceedToFinalCompilation = false.
 * 4. Se todas as cenas forem PASS -> projectStatus = SAFE_TO_CONTINUE e canProceedToFinalCompilation = true.
 * 5. Se houver WARN sem nenhum BLOCK -> projectStatus = CONTINUE_WITH_WARNINGS e canProceedToFinalCompilation = true.
 * 6. Preserva sem alteração todas as diretrizes do productMotionLockEngine.
 * 7. Imutável, determinístico, idempotente e null-safe.
 */

import {
  MotionLockedRemodeledProject,
  MotionLockedRemodeledScene,
  MotionSafetyGateResult,
  MotionSafetySceneGateResult,
  MotionSafetyProjectStatus,
  MotionLockValidationStatus,
} from './types';

// ============================================================================
// AVALIAÇÃO DE SEGURANÇA DE CENA INDIVIDUAL
// ============================================================================

export function evaluateSceneMotionSafety(
  scene: MotionLockedRemodeledScene,
  index: number
): MotionSafetySceneGateResult {
  const sceneId = scene?.sceneId || `scene_${index + 1}`;
  const lockResult = scene?.motionLockResult;

  // Fallback se não possuir motionLockResult
  if (!lockResult) {
    return {
      sceneId,
      status: 'WARN',
      canProceed: true,
      blockingReasons: [],
      warnings: ['MOTION_LOCK_RESULT_MISSING: Cena não possui resultado de validação de motion lock'],
    };
  }

  const status: MotionLockValidationStatus = lockResult.validationStatus || 'WARN';
  const warnings: string[] = [];
  const blockingReasons: string[] = [];

  // Extração de warnings e blocking reasons do resultado do adapter
  if (Array.isArray(lockResult.warnings)) {
    for (const w of lockResult.warnings) {
      if (status === 'BLOCK') {
        blockingReasons.push(w);
      } else {
        warnings.push(w);
      }
    }
  }

  // Agregação de flags adicionais se presentes no blueprint da cena
  if (scene?.safetyFlags?.requiresSafetyValidation && status !== 'BLOCK') {
    warnings.push('SAFETY_VALIDATION_REQUIRED: Validação de segurança adicional recomendada');
  }

  if (scene?.safetyFlags?.lowTransferability && status !== 'BLOCK') {
    warnings.push('LOW_TRANSFERABILITY: Movimento adaptado possui baixa transferabilidade funcional');
  }

  if (Array.isArray(scene?.safetyFlags?.continuityWarnings)) {
    for (const cw of scene.safetyFlags.continuityWarnings) {
      warnings.push(`CONTINUITY_WARNING: ${cw}`);
    }
  }

  const canProceed = status !== 'BLOCK';

  return {
    sceneId,
    status,
    canProceed,
    blockingReasons: Array.from(new Set(blockingReasons)),
    warnings: Array.from(new Set(warnings)),
  };
}

// ============================================================================
// GATE GLOBAL DE SEGURANÇA DE MOVIMENTO (PURE, DETERMINISTIC, IMMUTABLE)
// ============================================================================

/**
 * Avalia o projeto inteiro e retorna a decisão formal do MotionSafetyGate.
 */
export function evaluateMotionSafetyGate(
  project?: MotionLockedRemodeledProject | null
): MotionSafetyGateResult {
  const scenes = project?.scenes || [];

  if (scenes.length === 0) {
    return {
      projectStatus: 'CONTINUE_WITH_WARNINGS',
      sceneResults: [],
      summary: {
        totalScenes: 0,
        passCount: 0,
        warnCount: 0,
        blockCount: 0,
      },
      blockingReasons: [],
      warnings: ['MOTION_LOCK_PROJECT_EMPTY: Nenhum registro de cena recebido no gate de segurança'],
      canProceedToFinalCompilation: true,
    };
  }

  let passCount = 0;
  let warnCount = 0;
  let blockCount = 0;

  const sceneResults: MotionSafetySceneGateResult[] = [];
  const allBlockingReasons: string[] = [];
  const allWarnings: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const result = evaluateSceneMotionSafety(scene, i);

    sceneResults.push(result);

    if (result.status === 'PASS') {
      passCount++;
    } else if (result.status === 'WARN') {
      warnCount++;
    } else if (result.status === 'BLOCK') {
      blockCount++;
    }

    if (result.blockingReasons.length > 0) {
      allBlockingReasons.push(...result.blockingReasons.map(r => `[${result.sceneId}] ${r}`));
    }
    if (result.warnings.length > 0) {
      allWarnings.push(...result.warnings.map(w => `[${result.sceneId}] ${w}`));
    }
  }

  // Decisão global de status
  let projectStatus: MotionSafetyProjectStatus = 'SAFE_TO_CONTINUE';
  let canProceedToFinalCompilation = true;

  if (blockCount > 0) {
    projectStatus = 'BLOCKED';
    canProceedToFinalCompilation = false;
  } else if (warnCount > 0) {
    projectStatus = 'CONTINUE_WITH_WARNINGS';
    canProceedToFinalCompilation = true;
  }

  return {
    projectStatus,
    sceneResults,
    summary: {
      totalScenes: scenes.length,
      passCount,
      warnCount,
      blockCount,
    },
    blockingReasons: Array.from(new Set(allBlockingReasons)),
    warnings: Array.from(new Set(allWarnings)),
    canProceedToFinalCompilation,
  };
}

// ============================================================================
// FINAL COMPILATION ASSERTION HELPER
// ============================================================================

export interface MotionSafetyAssertionOutput {
  allowed: boolean;
  status: MotionSafetyProjectStatus;
  reasons: string[];
}

/**
 * Helper puro que verifica se a compilação final pode prosseguir sem lançar exceções não tratadas.
 */
export function assertMotionSafeForFinalCompilation(
  result: MotionSafetyGateResult
): MotionSafetyAssertionOutput {
  if (result.canProceedToFinalCompilation && result.projectStatus !== 'BLOCKED') {
    return {
      allowed: true,
      status: result.projectStatus,
      reasons: result.warnings,
    };
  }

  return {
    allowed: false,
    status: 'BLOCKED',
    reasons: result.blockingReasons.length > 0
      ? result.blockingReasons
      : ['Movimento bloqueado por inconformidades de segurança física do produto'],
  };
}
