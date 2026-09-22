/**
 * REVERSE REMODEL PIPELINE ORCHESTRATOR — ETAPA 12A.1
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Orquestrador determinístico central e puro do novo pipeline da Engenharia Reversa remodelada.
 * Executa as etapas na ordem canônica estrita sem duplicar lógica existente:
 * 
 * 1. normalizeLegacyReverseDNA
 * 2. extractPhysicalMotionDNA (PhysicalMotionDNA)
 * 3. stripReferenceDNA (ReferenceStripper)
 * 4. ProductInjectionContext (buildProductInjectionContext / productVisionBridge)
 * 5. IdentityInjectionContext (buildIdentityInjectionContext / identityInjectionBridge)
 * 6. adaptPhysicalMotion (MotionAdaptationEngine)
 * 7. compileRemodeledProject (RemodelCompiler)
 * 8. applyMotionLocksToProject (MotionLockAdapter)
 * 9. evaluateMotionSafetyGate (MotionSafetyGate)
 * 10. applyCommercialFactGuardsToProject (CommercialFactGuard)
 * 11. evaluateFinalCompilationGate & buildApprovedFinalCompilationInput (FinalCompilationGate)
 * 12. compileFinalRemodeledCopy (FinalCopyCompiler)
 * 13. compileFinalRemodeledVisual (FinalVisualCompiler)
 * 14. assembleFinalRemodeledSceneProject (FinalSceneAssembler)
 * 
 * Princípios Rígidos:
 * - Pura, determinística, sem efeitos colaterais e sem mutação de entradas.
 * - Não acessa estado React, IndexedDB ou localStorage.
 * - Sem chamadas LLM ou Gemini e sem cobrança de créditos.
 * - Se FinalCompilationGate bloquear: não executa FinalCopyCompiler, FinalVisualCompiler ou FinalSceneAssembler.
 * - Se ocorrer erro não tratado: captura e retorna FAILED + failedStage.
 */

import {
  ReverseRemodelPipelineInput,
  ReverseRemodelPipelineResult,
  ReverseRemodelPipelineStatus,
  normalizeLegacyReverseDNA,
  ProductInjectionContext,
  IdentityInjectionContext,
} from './types';

import { extractPhysicalMotionDNA } from './physicalMotionDnaEngine';
import { stripReferenceDNA } from './referenceStripper';
import { buildProductInjectionContext } from './productVisionBridge';
import { buildIdentityInjectionContext } from './identityInjectionBridge';
import { adaptPhysicalMotion } from './motionAdaptationEngine';
import { compileRemodeledProject } from './remodelCompiler';
import { applyMotionLocksToProject } from './remodelMotionLockAdapter';
import { evaluateMotionSafetyGate } from './motionSafetyGate';
import { applyCommercialFactGuardsToProject } from './commercialFactGuardAdapter';
import { evaluateFinalCompilationGate, buildApprovedFinalCompilationInput } from './finalCompilationGate';
import { compileFinalRemodeledCopy } from './finalCopyCompiler';
import { compileFinalRemodeledVisual } from './finalVisualCompiler';
import { assembleFinalRemodeledSceneProject } from './finalSceneAssembler';

/**
 * Deduplica arrays de strings de forma segura e pura.
 */
function deduplicate(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

/**
 * Orquestrador central puro do pipeline de remodelação de Engenharia Reversa.
 */
export function executeReverseRemodelPipeline(
  input: ReverseRemodelPipelineInput
): ReverseRemodelPipelineResult {
  const accumulatedWarnings: string[] = [];
  const accumulatedBlockingReasons: string[] = [];

  let currentStage = 'INIT';

  try {
    // ------------------------------------------------------------------------
    // 1. Normalização do DNA da Referência Legada
    // ------------------------------------------------------------------------
    currentStage = 'normalizeLegacyReverseDNA';
    const normalizedDNA = normalizeLegacyReverseDNA(input.rawReferenceResult);

    // Mesclar override de adaptationContract se fornecido
    const effectiveAdaptationContract = {
      ...normalizedDNA.adaptationContract,
      ...(input.adaptationContractOverride || {}),
    };

    // ------------------------------------------------------------------------
    // 2. Extração do Physical Motion DNA observável da referência
    // ------------------------------------------------------------------------
    currentStage = 'PhysicalMotionDNA';
    const physicalMotionDNA = normalizedDNA.physicalMotionDNA || extractPhysicalMotionDNA(input.rawReferenceResult);

    // ------------------------------------------------------------------------
    // 3. Higienização da Referência (ReferenceStripper)
    // ------------------------------------------------------------------------
    currentStage = 'ReferenceStripper';
    const strippedReference = stripReferenceDNA({
      ...input.rawReferenceResult,
      physicalMotionDNA,
      copyViralDNA: normalizedDNA.copyViralDNA,
      viralStructureDNA: normalizedDNA.viralStructureDNA,
    });

    // ------------------------------------------------------------------------
    // 4. Resolução do Contexto de Produto (ProductInjectionContext)
    // ------------------------------------------------------------------------
    currentStage = 'ProductInjectionContext';
    const productContext: ProductInjectionContext =
      input.productContext ||
      buildProductInjectionContext({
        legacyPayload: input.productBridgeInput?.legacyPayload || input.rawReferenceResult?.newProductPayload || input.rawReferenceResult,
        userFields: input.productBridgeInput?.userFields,
        productVisionData: input.productBridgeInput?.productVisionData,
      });

    // ------------------------------------------------------------------------
    // 5. Resolução do Contexto de Identidade (IdentityInjectionContext)
    // ------------------------------------------------------------------------
    currentStage = 'IdentityInjectionContext';
    const identityContext: IdentityInjectionContext =
      input.identityContext ||
      buildIdentityInjectionContext({
        storedAvatar: input.identityBridgeInput?.storedAvatar,
        avatarProfile: input.identityBridgeInput?.avatarProfile,
        sessionOverrides: input.identityBridgeInput?.sessionOverrides,
        legacyCreatorFields: input.identityBridgeInput?.legacyCreatorFields || {
          creatorPersona: input.rawReferenceResult?.creator_profile,
        },
        locks: input.identityBridgeInput?.locks,
        isPOVMode: input.identityBridgeInput?.isPOVMode,
        isHandsOnly: input.identityBridgeInput?.isHandsOnly,
      });

    // ------------------------------------------------------------------------
    // 6. Adaptação de Movimento Físico (MotionAdaptationEngine)
    // ------------------------------------------------------------------------
    currentStage = 'MotionAdaptationEngine';
    const adaptedMotion = adaptPhysicalMotion({
      rawMotionDNA: strippedReference.physicalMotionDNA || physicalMotionDNA,
      productContext,
      identityContext,
    });

    if (adaptedMotion.adaptationReport?.continuityWarnings) {
      accumulatedWarnings.push(...adaptedMotion.adaptationReport.continuityWarnings);
    }

    // ------------------------------------------------------------------------
    // 7. Compilação do Blueprint Intermediário (RemodelCompiler)
    // ------------------------------------------------------------------------
    currentStage = 'RemodelCompiler';
    const remodelBlueprint = compileRemodeledProject({
      strippedDNA: strippedReference,
      remodeledMotion: adaptedMotion,
      productContext,
      identityContext,
      adaptationContract: effectiveAdaptationContract,
    });

    if (remodelBlueprint.compilationReport?.continuityWarnings) {
      accumulatedWarnings.push(...remodelBlueprint.compilationReport.continuityWarnings);
    }

    // ------------------------------------------------------------------------
    // 8. Aplicação de Motion Locks nas Cenas (MotionLockAdapter)
    // ------------------------------------------------------------------------
    currentStage = 'MotionLockAdapter';
    const motionLockedProject = applyMotionLocksToProject(remodelBlueprint);

    // ------------------------------------------------------------------------
    // 9. Gate de Segurança Física de Movimento (MotionSafetyGate)
    // ------------------------------------------------------------------------
    currentStage = 'MotionSafetyGate';
    const motionSafetyResult = evaluateMotionSafetyGate(motionLockedProject);

    if (motionSafetyResult.warnings) {
      accumulatedWarnings.push(...motionSafetyResult.warnings);
    }
    if (motionSafetyResult.blockingReasons) {
      accumulatedBlockingReasons.push(...motionSafetyResult.blockingReasons);
    }

    // ------------------------------------------------------------------------
    // 10. Guard de Fatos Comerciais (CommercialFactGuard)
    // ------------------------------------------------------------------------
    currentStage = 'CommercialFactGuard';
    const commercialGuardedProject = applyCommercialFactGuardsToProject(remodelBlueprint);
    const commercialSafetyResult = commercialGuardedProject.guardResult;

    if (commercialSafetyResult.warnings) {
      accumulatedWarnings.push(...commercialSafetyResult.warnings);
    }
    if (commercialSafetyResult.blockingReasons) {
      accumulatedBlockingReasons.push(...commercialSafetyResult.blockingReasons);
    }

    // ------------------------------------------------------------------------
    // 11. Gate de Compilação Final (FinalCompilationGate)
    // ------------------------------------------------------------------------
    currentStage = 'FinalCompilationGate';
    const gateInput = {
      project: remodelBlueprint,
      motionSafety: motionSafetyResult,
      commercialSafety: commercialSafetyResult,
      productContext,
      identityContext,
      strippedReference,
    };

    const gateResult = evaluateFinalCompilationGate(gateInput);

    if (gateResult.warnings) {
      accumulatedWarnings.push(...gateResult.warnings);
    }
    if (gateResult.blockingReasons) {
      accumulatedBlockingReasons.push(...gateResult.blockingReasons);
    }

    const approvedCompilationInput = buildApprovedFinalCompilationInput(gateInput, gateResult);

    // Se o Gate Final bloquear ou o input aprovado for nulo, interrompe o pipeline e retorna BLOCKED
    if (!gateResult.canCompileFinal || gateResult.status === 'BLOCKED' || !approvedCompilationInput) {
      return {
        status: 'BLOCKED',
        approvedCompilationInput: null,
        gateResult,
        motionSafetyResult,
        commercialSafetyResult,
        remodelBlueprint,
        motionLockedProject,
        strippedReference,
        adaptedMotion,
        productContext,
        identityContext,
        warnings: deduplicate(accumulatedWarnings),
        blockingReasons: deduplicate(accumulatedBlockingReasons),
      };
    }

    // ------------------------------------------------------------------------
    // 12. Compilador de Copy Final (FinalCopyCompiler)
    // ------------------------------------------------------------------------
    currentStage = 'FinalCopyCompiler';
    const finalCopyProject = compileFinalRemodeledCopy(approvedCompilationInput);

    if (finalCopyProject.copyReport?.copyWarnings) {
      accumulatedWarnings.push(...finalCopyProject.copyReport.copyWarnings);
    }
    if (finalCopyProject.copyReport?.rolePurityWarnings) {
      accumulatedWarnings.push(...finalCopyProject.copyReport.rolePurityWarnings);
    }

    // ------------------------------------------------------------------------
    // 13. Compilador Visual Final (FinalVisualCompiler)
    // ------------------------------------------------------------------------
    currentStage = 'FinalVisualCompiler';
    const finalVisualProject = compileFinalRemodeledVisual(approvedCompilationInput);

    if (finalVisualProject.visualReport?.visualWarnings) {
      accumulatedWarnings.push(...finalVisualProject.visualReport.visualWarnings);
    }
    if (finalVisualProject.visualReport?.continuityWarnings) {
      accumulatedWarnings.push(...finalVisualProject.visualReport.continuityWarnings);
    }

    // ------------------------------------------------------------------------
    // 14. Montagem das Cenas Finais (FinalSceneAssembler)
    // ------------------------------------------------------------------------
    currentStage = 'FinalSceneAssembler';
    const finalSceneProject = assembleFinalRemodeledSceneProject(
      finalCopyProject,
      finalVisualProject,
      approvedCompilationInput
    );

    if (finalSceneProject.assemblyReport?.assemblyWarnings) {
      accumulatedWarnings.push(...finalSceneProject.assemblyReport.assemblyWarnings);
    }

    // Determinação do status geral do pipeline
    let status: ReverseRemodelPipelineStatus = 'READY';
    if (finalSceneProject.projectStatus === 'BLOCKED') {
      status = 'BLOCKED';
    } else if (
      finalSceneProject.projectStatus === 'READY_WITH_WARNINGS' ||
      gateResult.status === 'READY_WITH_WARNINGS' ||
      accumulatedWarnings.length > 0
    ) {
      status = 'READY_WITH_WARNINGS';
    }

    return {
      status,
      finalSceneProject,
      finalCopyProject,
      finalVisualProject,
      approvedCompilationInput,
      gateResult,
      motionSafetyResult,
      commercialSafetyResult,
      remodelBlueprint,
      motionLockedProject,
      strippedReference,
      adaptedMotion,
      productContext,
      identityContext,
      warnings: deduplicate(accumulatedWarnings),
      blockingReasons: deduplicate(accumulatedBlockingReasons),
    };
  } catch (err: any) {
    return {
      status: 'FAILED',
      failedStage: currentStage,
      error: err?.message || String(err),
      warnings: deduplicate(accumulatedWarnings),
      blockingReasons: deduplicate(accumulatedBlockingReasons),
    };
  }
}
