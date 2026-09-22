/**
 * FINAL SCENE ASSEMBLER — ETAPA 10
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Camada determinística final que junta os outputs já compilados e aprovados
 * da Engenharia Reversa remodelada (`FinalRemodeledCopyProject`, `FinalRemodeledVisualProject`
 * e `ApprovedFinalCompilationInput`) em cenas estruturadas prontas para entrega (`FinalRemodeledSceneProject`).
 * 
 * Princípios Rígidos:
 * 1. Consome exclusivamente os outputs aprovados.
 * 2. Imutabilidade e Idempotência: Não reescreve copy, não reescreve prompts visuais,
 *    não altera timings, roles ou diretrizes de motion lock.
 * 3. Match estrito por `sceneId` (não por índice posicional).
 * 4. Agregação e deduplicação de warnings sem perda de contexto.
 * 5. Determinação de status:
 *    - Cena: READY | READY_WITH_WARNINGS | BLOCKED (se copy/visual ausente ou gate bloqueado).
 *    - Projeto: READY_FOR_DELIVERY | READY_WITH_WARNINGS | BLOCKED (se qualquer cena for BLOCKED).
 * 6. Fornece adapter opcional puro `finalSceneProjectToLegacyReverseResult` para compatibilidade futura.
 */

import {
  ApprovedFinalCompilationInput,
  FinalRemodeledCopyProject,
  FinalRemodeledVisualProject,
  FinalRemodeledSceneProject,
  FinalRemodeledScene,
  FinalAssemblyReport,
  FinalAssemblySceneStatus,
  FinalAssemblyProjectStatus,
  IdentityInjectionContext,
  CopyViralDNA,
} from './types';

// ============================================================================
// 1. HELPERS PUROS DE MONTAGEM
// ============================================================================

/**
 * Constrói a descrição da locução da cena em inglês a partir da identidade alvo
 * e do CopyViralDNA aprovado, sem inventar novas personas.
 */
export function buildVoiceDescriptionEn(
  identityContext?: IdentityInjectionContext,
  copyViralDNA?: CopyViralDNA
): { voiceText?: string; warning?: string } {
  const targetVoice = identityContext?.voiceDelivery;
  const viralVoice = copyViralDNA?.voiceDelivery;

  const parts: string[] = [];

  if (targetVoice?.voiceDescription) {
    parts.push(targetVoice.voiceDescription);
  } else {
    if (targetVoice?.style) {
      parts.push(`speaking in a ${targetVoice.style} tone`);
    }
    if (targetVoice?.speakingEnergy) {
      parts.push(`energy level ${targetVoice.speakingEnergy}/10`);
    }
    if (targetVoice?.speakingPace) {
      parts.push(`at ${targetVoice.speakingPace} pacing`);
    }
    if (targetVoice?.gender) {
      parts.push(`${targetVoice.gender} voice`);
    }
    if (targetVoice?.audience) {
      parts.push(`targeted to ${targetVoice.audience}`);
    }
  }

  if (viralVoice?.description && !parts.some(p => p.includes(viralVoice.description))) {
    parts.push(`emulating viral cadence: ${viralVoice.description}`);
  }

  if (parts.length === 0) {
    return {
      voiceText: undefined,
      warning: 'VOICE_DESCRIPTION_MISSING',
    };
  }

  return {
    voiceText: `Natural engaging Brazilian Portuguese vocal delivery, ${parts.join(', ')}`,
    warning: undefined,
  };
}

/**
 * Deduplica arrays de strings preservando a ordem original.
 */
function deduplicateStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

// ============================================================================
// 2. ASSEMBLER PRINCIPAL DE PROJETO FINAL (PURE & DETERMINISTIC)
// ============================================================================

export function assembleFinalRemodeledSceneProject(
  copyProject: FinalRemodeledCopyProject,
  visualProject: FinalRemodeledVisualProject,
  approvedInput: ApprovedFinalCompilationInput
): FinalRemodeledSceneProject {
  const approvedScenes = approvedInput?.approvedProject?.scenes || [];
  const copyScenes = copyProject?.scenes || [];
  const visualScenes = visualProject?.scenes || [];
  const directives = approvedInput?.motionLockDirectives || [];

  const platform = approvedInput?.copyInputPayload?.platform || approvedInput?.approvedProject?.adaptationContract?.platform || 'TikTok Shop';
  const adaptationContract = approvedInput?.approvedProject?.adaptationContract;
  const identityContext = approvedInput?.identityContext;
  const productContext = approvedInput?.productContext;
  const viralCopyDNA = approvedInput?.copyInputPayload?.copyViralDNA;

  // Montagem da descrição de voz base aprovada
  const { voiceText: globalVoiceDescription, warning: voiceWarning } = buildVoiceDescriptionEn(
    identityContext,
    viralCopyDNA
  );

  // Mapeamentos rápidos por sceneId
  const copyMap = new Map(copyScenes.map(s => [s.sceneId, s]));
  const visualMap = new Map(visualScenes.map(s => [s.sceneId, s]));
  const directiveMap = new Map(directives.map(d => [d.sceneId, d]));

  // Coleta de todos os IDs de cena únicos mantendo a ordem do blueprint aprovado
  const allSceneIds: string[] = [];
  for (const scene of approvedScenes) {
    if (!allSceneIds.includes(scene.sceneId)) {
      allSceneIds.push(scene.sceneId);
    }
  }
  for (const cs of copyScenes) {
    if (!allSceneIds.includes(cs.sceneId)) {
      allSceneIds.push(cs.sceneId);
    }
  }
  for (const vs of visualScenes) {
    if (!allSceneIds.includes(vs.sceneId)) {
      allSceneIds.push(vs.sceneId);
    }
  }

  const assembledScenes: FinalRemodeledScene[] = [];
  const sceneIdMismatches: string[] = [];
  const aggregatedCopyWarnings: string[] = [...(copyProject?.copyReport?.copyWarnings || []), ...(copyProject?.copyReport?.rolePurityWarnings || [])];
  const aggregatedVisualWarnings: string[] = [...(visualProject?.visualReport?.visualWarnings || [])];
  const aggregatedMotionWarnings: string[] = [];
  const aggregatedCommercialWarnings: string[] = [];
  const aggregatedContinuityWarnings: string[] = [...(visualProject?.visualReport?.continuityWarnings || [])];
  const aggregatedAssemblyWarnings: string[] = [];

  if (voiceWarning) {
    aggregatedAssemblyWarnings.push(voiceWarning);
  }

  let readyCount = 0;
  let warningCount = 0;
  let blockedCount = 0;

  for (const sceneId of allSceneIds) {
    const blueprintScene = approvedScenes.find(s => s.sceneId === sceneId);
    const copyScene = copyMap.get(sceneId);
    const visualScene = visualMap.get(sceneId);
    const directive = directiveMap.get(sceneId) || visualScene?.motionLockDirectives;

    const sceneWarnings: string[] = [];
    let isBlocked = false;

    // Checagem de integridade de pareamento
    if (!copyScene) {
      sceneWarnings.push('MISSING_COPY_SCENE: Cena sem diálogo remodelado aprovado.');
      sceneIdMismatches.push(`[${sceneId}] Falta output de copy.`);
      isBlocked = true;
    }
    if (!visualScene) {
      sceneWarnings.push('MISSING_VISUAL_SCENE: Cena sem prompt visual remodelado aprovado.');
      sceneIdMismatches.push(`[${sceneId}] Falta output visual.`);
      isBlocked = true;
    }

    if (copyScene?.warnings) {
      sceneWarnings.push(...copyScene.warnings);
    }
    if (visualScene?.warnings) {
      sceneWarnings.push(...visualScene.warnings);
    }
    if (voiceWarning) {
      sceneWarnings.push(voiceWarning);
    }

    // Determinação do status da cena
    let assemblyStatus: FinalAssemblySceneStatus = 'READY';
    if (isBlocked) {
      assemblyStatus = 'BLOCKED';
      blockedCount++;
    } else if (sceneWarnings.length > 0) {
      assemblyStatus = 'READY_WITH_WARNINGS';
      warningCount++;
    } else {
      readyCount++;
    }

    const sceneRole = copyScene?.role || visualScene?.role || blueprintScene?.role || 'DEMONSTRATION';
    const timestamp = blueprintScene?.timestamp;
    const duration = blueprintScene?.duration;

    // Preservar ações estruturadas existentes upstream sem sintetizar de visual_prompt_en
    let preservedActions: string[] = [];
    const upstreamActions = (blueprintScene as any)?.actions || (visualScene as any)?.actions || (copyScene as any)?.actions;
    if (Array.isArray(upstreamActions) && upstreamActions.length > 0) {
      preservedActions = upstreamActions.filter((a: any) => typeof a === 'string' && a.trim() && a.trim().toUpperCase() !== 'N/A');
    } else if (typeof upstreamActions === 'string' && upstreamActions.trim() && upstreamActions.trim().toUpperCase() !== 'N/A') {
      preservedActions = [upstreamActions.trim()];
    } else {
      const upstreamActionPrompt = (blueprintScene as any)?.action_prompt_en || (visualScene as any)?.action_prompt_en || (copyScene as any)?.action_prompt_en;
      if (typeof upstreamActionPrompt === 'string' && upstreamActionPrompt.trim() && upstreamActionPrompt.trim().toUpperCase() !== 'N/A') {
        preservedActions = [upstreamActionPrompt.trim()];
      } else if (directive?.prompt_addition && typeof directive.prompt_addition === 'string' && directive.prompt_addition.trim() && directive.prompt_addition.trim().toUpperCase() !== 'N/A') {
        preservedActions = [directive.prompt_addition.trim()];
      }
    }

    const actionPromptEn = (blueprintScene as any)?.action_prompt_en || (visualScene as any)?.action_prompt_en || (preservedActions.length > 0 ? preservedActions.join('; ') : undefined);

    assembledScenes.push({
      sceneId,
      role: sceneRole,
      timestamp,
      duration,
      visual_prompt_en: visualScene?.visual_prompt_en || '',
      action_prompt_en: actionPromptEn,
      actions: preservedActions,
      negative_prompt_en: visualScene?.negative_prompt_en,
      dialogue_pt_br: copyScene?.dialogue_pt_br || '',
      voice_description_en: globalVoiceDescription,
      motionLockDirectives: directive,
      productContextRef: {
        name: productContext?.structural?.name,
        category: productContext?.structural?.category,
        appliedFacts: visualScene?.appliedProductFacts,
      },
      identityContextRef: {
        avatarName: identityContext?.visual?.avatarName,
        applied: visualScene?.identityApplied,
      },
      warnings: deduplicateStrings(sceneWarnings),
      assemblyStatus,
    });
  }

  // Ordenação das cenas pelo timing aprovado (ou ordem original de blueprint)
  assembledScenes.sort((a, b) => {
    const idxA = approvedScenes.findIndex(s => s.sceneId === a.sceneId);
    const idxB = approvedScenes.findIndex(s => s.sceneId === b.sceneId);
    if (idxA !== -1 && idxB !== -1) {
      return idxA - idxB;
    }
    return 0;
  });

  // Determinação do status do projeto consolidado
  let projectStatus: FinalAssemblyProjectStatus = 'READY_FOR_DELIVERY';
  if (blockedCount > 0) {
    projectStatus = 'BLOCKED';
  } else if (warningCount > 0 || aggregatedAssemblyWarnings.length > 0 || sceneIdMismatches.length > 0) {
    projectStatus = 'READY_WITH_WARNINGS';
  }

  const assemblyReport: FinalAssemblyReport = {
    totalScenes: assembledScenes.length,
    readyScenes: readyCount,
    warningScenes: warningCount,
    blockedScenes: blockedCount,
    sceneIdMismatches: deduplicateStrings(sceneIdMismatches),
    copyWarnings: deduplicateStrings(aggregatedCopyWarnings),
    visualWarnings: deduplicateStrings(aggregatedVisualWarnings),
    motionWarnings: deduplicateStrings(aggregatedMotionWarnings),
    commercialWarnings: deduplicateStrings(aggregatedCommercialWarnings),
    continuityWarnings: deduplicateStrings(aggregatedContinuityWarnings),
    assemblyWarnings: deduplicateStrings(aggregatedAssemblyWarnings),
  };

  return {
    scenes: assembledScenes,
    assemblyReport,
    projectStatus,
    platform,
    adaptationContract,
    compilationMetadata: {
      assembledAt: new Date().toISOString(),
      sourceApprovedInputVersion: 'Etapa10_FinalSceneAssembly',
    },
  };
}

// ============================================================================
// 3. ADAPTER DE SAÍDA LEGADA (PREPARADO PARA COMPATIBILIDADE FUTURA)
// ============================================================================

/**
 * Converte o projeto remodelado montado (`FinalRemodeledSceneProject`) em um
 * formato compatível com o schema legado de resposta de engenharia reversa,
 * sem mutar nenhum dado e mantendo compatibilidade 100%.
 */
export function finalSceneProjectToLegacyReverseResult(
  project: FinalRemodeledSceneProject,
  originalLegacyReference?: any
): any {
  if (!project) return originalLegacyReference || {};

  const legacyScenes = project.scenes.map((s, idx) => {
    const rawActions = s.actions || (s as any).actions;
    let actions: string[] = [];
    if (Array.isArray(rawActions) && rawActions.length > 0) {
      actions = rawActions.filter((a: any) => typeof a === 'string' && a.trim() && a.trim().toUpperCase() !== 'N/A');
    } else if (typeof rawActions === 'string' && rawActions.trim() && rawActions.trim().toUpperCase() !== 'N/A') {
      actions = [rawActions.trim()];
    } else if (s.action_prompt_en && typeof s.action_prompt_en === 'string' && s.action_prompt_en.trim() && s.action_prompt_en.trim().toUpperCase() !== 'N/A') {
      actions = [s.action_prompt_en.trim()];
    } else if (s.motionLockDirectives?.prompt_addition && typeof s.motionLockDirectives.prompt_addition === 'string' && s.motionLockDirectives.prompt_addition.trim() && s.motionLockDirectives.prompt_addition.trim().toUpperCase() !== 'N/A') {
      actions = [s.motionLockDirectives.prompt_addition.trim()];
    }

    return {
      sceneId: s.sceneId || `scene_${idx + 1}`,
      block_id: idx + 1,
      scene_name: `Cena ${idx + 1}`,
      role: s.role,
      timestamp: s.timestamp || (typeof s.duration === 'number' ? `00:${idx * s.duration}` : undefined),
      duration: s.duration,
      visual_prompt_en: s.visual_prompt_en,
      action_prompt_en: s.action_prompt_en,
      negative_prompt_en: s.negative_prompt_en,
      dialogue_pt_br: s.dialogue_pt_br,
      voice_description_en: s.voice_description_en,
      actions,
      motion_lock_addition: s.motionLockDirectives?.prompt_addition,
    };
  });

  return {
    ...(originalLegacyReference && typeof originalLegacyReference === 'object' ? originalLegacyReference : {}),
    scenes: legacyScenes,
    blocks: legacyScenes,
    veo_structure: legacyScenes,
    sora_structure: legacyScenes,
    grok_structure: legacyScenes,
    platform: project.platform,
    assemblyStatus: project.projectStatus,
    assemblyReport: project.assemblyReport,
    compilationMetadata: project.compilationMetadata,
  };
}
