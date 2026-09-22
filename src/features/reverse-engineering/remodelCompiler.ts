/**
 * REMODEL COMPILER — ETAPA 6
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Compilador determinístico central que combina:
 * - StrippedReferenceDNA (DNA viral estrutural desprovido de referências de produto/identidade)
 * - ViralStructureDNA & CopyViralDNA
 * - RemodeledPhysicalMotion (movimentos físicos adaptados às restrições do novo produto)
 * - ProductInjectionContext (especificações e fatos verificados do novo produto)
 * - IdentityInjectionContext (identidade visual/voz canônica do novo avatar)
 * - AdaptationContract & PreservationContract
 * 
 * Produzindo o modelo intermediário canônico:
 * - RemodeledSceneBlueprint (por cena)
 * - RemodeledProjectBlueprint (projeto completo compilado)
 * 
 * Princípios:
 * 1. Pura, determinística, imutável e idempotente.
 * 2. Sem chamadas LLM / Gemini e sem mutação de entradas.
 * 3. Isolamento Factual Rígido: nenhum dado comercial da referência vaza para o blueprint.
 * 4. Isolamento de Identidade Rígido: apenas traços da identidade alvo são propagados.
 * 5. Não substitui os compilers finais (commercePromptCompiler/promptComposer) nem a UI.
 */

import {
  StrippedReferenceDNA,
  ViralStructureDNA,
  CopyViralDNA,
  AdaptationContract,
  PreservationContract,
  PreservableElementKey,
  ProductInjectionContext,
  IdentityInjectionContext,
  RemodeledPhysicalMotion,
  RemodeledMotionScene,
  PhysicalMotionScene,
  SceneRole,
  PreservationAction,
  RemodelingIntensityTier,
  DomainPreservationPolicy,
  RemodeledSceneBlueprint,
  RemodeledSceneViralStructure,
  RemodeledSceneVisualDirection,
  RemodeledSceneCopyDirection,
  RemodeledSceneVoiceDirection,
  RemodeledSceneCtaDirection,
  CommercialFactCandidate,
  RemodeledSceneSafetyFlags,
  RemodeledProjectBlueprint,
  RemodeledProjectCompilationReport,
  RemodeledProjectSafetySummary,
  MotionCompatibilityLevel,
  PresenterVisibility,
  ProductScale,
  ALL_PRESERVABLE_ELEMENTS,
} from './types';

// ============================================================================
// RESOLUÇÃO DE POLÍTICA DE PRESERVAÇÃO & INTENSIDADE
// ============================================================================

export function resolveIntensityTier(intensity: number = 50): RemodelingIntensityTier {
  if (intensity <= 14) return 'PRESERVE_MAXIMUM';
  if (intensity <= 39) return 'LIGHT_ADAPTATION';
  if (intensity <= 64) return 'BALANCED';
  if (intensity <= 89) return 'STRONG_ADAPTATION';
  return 'HIGH_FREEDOM';
}

export function resolvePreservationPolicy(
  remodelingIntensity: number = 50,
  preserveElements: PreservableElementKey[] = ALL_PRESERVABLE_ELEMENTS
): DomainPreservationPolicy {
  const tier = resolveIntensityTier(remodelingIntensity);
  const wants = (key: PreservableElementKey) => preserveElements.includes(key);

  const hookPolicy = wants('hook') && tier !== 'HIGH_FREEDOM' ? 'PRESERVE' : 'REMODEL';
  const conversionPolicy =
    wants('conversion_structure') && ['PRESERVE_MAXIMUM', 'LIGHT_ADAPTATION', 'BALANCED'].includes(tier)
      ? 'PRESERVE'
      : 'REMODEL';
  const ctaPolicy = wants('cta_position') ? 'PRESERVE' : 'REMODEL';
  const demoPolicy = wants('demo_type') && tier !== 'HIGH_FREEDOM' ? 'PRESERVE' : 'REMODEL';
  const proofPolicy = wants('visual_proof') && tier !== 'HIGH_FREEDOM' ? 'PRESERVE' : 'REMODEL';
  const pacePolicy = wants('editing_pace') ? 'PRESERVE' : 'REMODEL';
  const visualStylePolicy = wants('visual_style') && tier === 'PRESERVE_MAXIMUM' ? 'PRESERVE' : 'REMODEL';
  const cameraPolicy =
    wants('camera_movement') && ['PRESERVE_MAXIMUM', 'LIGHT_ADAPTATION'].includes(tier)
      ? 'PRESERVE'
      : 'REMODEL';
  const voiceStylePolicy = wants('voice_style') && tier !== 'HIGH_FREEDOM' ? 'PRESERVE' : 'REMODEL';
  const energyPolicy = wants('presentation_energy') ? 'PRESERVE' : 'REMODEL';

  return {
    hook: hookPolicy,
    conversionStructure: conversionPolicy,
    ctaPosition: ctaPolicy,
    demoType: demoPolicy,
    visualProof: proofPolicy,
    editingPace: pacePolicy,
    visualStyle: visualStylePolicy,
    cameraMovement: cameraPolicy,
    voiceStyle: voiceStylePolicy,
    presentationEnergy: energyPolicy,
    physicalMotion: 'ADAPT',
  };
}

// ============================================================================
// DETERMINAÇÃO DE FUNÇÃO DE CENA (SCENE ROLE)
// ============================================================================

export function detectSceneRole(
  sceneIndex: number,
  totalScenes: number,
  sceneName?: string,
  rawVisual?: string,
  actionText?: string
): SceneRole {
  if (sceneIndex === 0) {
    return 'HOOK';
  }

  if (sceneIndex === totalScenes - 1 && totalScenes > 1) {
    return 'CTA';
  }

  const combined = [sceneName, rawVisual, actionText].filter(Boolean).join(' ').toLowerCase();

  if (/cta|chamada|compre|link|bio|oferta|garanta|desconto|preço/i.test(combined)) {
    return sceneIndex >= totalScenes - 2 ? 'CTA' : 'OFFER';
  }

  if (/prova|teste|durabilidade|resistência|água|antes e depois|comparativo|microsc/i.test(combined)) {
    return 'PROOF';
  }

  if (/demo|demonstração|usando|aplicando|girando|detalhes|como funciona|unboxing/i.test(combined)) {
    return 'DEMONSTRATION';
  }

  if (/dor|problema|frustração|cansado de|dificuldade|antigo/i.test(combined)) {
    return 'PROBLEM';
  }

  if (/solução|apresentando|conheça|chegou|o segredo/i.test(combined)) {
    return 'SOLUTION';
  }

  if (/desejo|resultado|sensação|transformação|sonho/i.test(combined)) {
    return 'DESIRE';
  }

  if (/transição|corte|mudança de ambiente/i.test(combined)) {
    return 'TRANSITION';
  }

  // Posição intermediária padrão
  if (sceneIndex === 1 && totalScenes >= 3) {
    return 'PROBLEM';
  }
  if (sceneIndex === 2 && totalScenes >= 4) {
    return 'SOLUTION';
  }

  return 'DEMONSTRATION';
}

// ============================================================================
// ADAPTER DE CENAS LEGADAS
// ============================================================================

export interface LegacySceneLike {
  scene_name?: string;
  name?: string;
  timestamp?: string;
  start?: number;
  end?: number;
  estimated_time?: string;
  duration?: number | string;
  visual_prompt_en?: string;
  visual_context_en?: string;
  dialogue_pt_br?: string;
  action_description?: string;
  camera_movement?: string;
  framing?: string;
  lighting?: string;
  [key: string]: any;
}

export function normalizeLegacyScenes(rawInput: any): LegacySceneLike[] {
  if (!rawInput || typeof rawInput !== 'object') return [];

  if (Array.isArray(rawInput.veo_structure) && rawInput.veo_structure.length > 0) {
    return rawInput.veo_structure;
  }
  if (Array.isArray(rawInput.sora_structure) && rawInput.sora_structure.length > 0) {
    return rawInput.sora_structure;
  }
  if (Array.isArray(rawInput.grok_structure) && rawInput.grok_structure.length > 0) {
    return rawInput.grok_structure;
  }
  if (Array.isArray(rawInput.blocks) && rawInput.blocks.length > 0) {
    return rawInput.blocks;
  }
  if (Array.isArray(rawInput.scenes) && rawInput.scenes.length > 0) {
    return rawInput.scenes;
  }

  return [];
}

// ============================================================================
// COMPILAÇÃO DETERMINÍSTICA DE CENA INDIVIDUAL
// ============================================================================

export interface CompileSceneInput {
  sceneIndex: number;
  totalScenes: number;
  rawScene?: LegacySceneLike | null;
  viralStructureDNA?: ViralStructureDNA | null;
  copyViralDNA?: CopyViralDNA | null;
  remodeledMotionScene?: RemodeledMotionScene | PhysicalMotionScene | null;
  productContext?: ProductInjectionContext | null;
  identityContext?: IdentityInjectionContext | null;
  domainPolicy: DomainPreservationPolicy;
  remodelingIntensity: number;
}

export function compileRemodeledScene(input: CompileSceneInput): RemodeledSceneBlueprint {
  const {
    sceneIndex,
    totalScenes,
    rawScene,
    viralStructureDNA,
    copyViralDNA,
    remodeledMotionScene,
    productContext,
    identityContext,
    domainPolicy,
  } = input;

  const sceneId = `scene_${sceneIndex + 1}`;
  const sceneName = rawScene?.scene_name || rawScene?.name || `Cena ${sceneIndex + 1}`;

  // 1. Timing & Duração
  const timestamp =
    rawScene?.timestamp ||
    rawScene?.estimated_time ||
    (rawScene?.start !== undefined && rawScene?.end !== undefined
      ? `${rawScene.start}-${rawScene.end}s`
      : undefined);

  const duration = rawScene?.duration || (rawScene?.end && rawScene?.start ? rawScene.end - rawScene.start : undefined);

  // 2. Role da Cena
  const role = detectSceneRole(
    sceneIndex,
    totalScenes,
    sceneName,
    rawScene?.visual_prompt_en || rawScene?.visual_context_en,
    rawScene?.action_description
  );

  // 3. Estrutura Viral
  const viralStructure: RemodeledSceneViralStructure = {
    hookFunction: sceneIndex === 0 ? viralStructureDNA?.hook?.description : undefined,
    conversionRole: role,
    visualPattern: viralStructureDNA?.visualPattern?.description,
    editingPace: viralStructureDNA?.platformReport?.recommendedPacing || 'DINÂMICO_RECORTE_RÁPIDO',
    proofRole: role === 'PROOF' ? 'Demonstração de eficácia visual com foco no benefício' : undefined,
    ctaPosition: role === 'CTA' ? 'Fechamento com chamada direta para a loja' : undefined,
  };

  // 4. Direção Visual (Combinando padrões de câmera, produto e identidade)
  const productScale = productContext?.productScale || 'MEDIUM_HANDHELD';
  const visibility = identityContext?.presenterVisibility || 'UPPER_BODY';
  const productName = productContext?.structural?.name || 'produto';

  let cameraRole = 'Enquadramento médio focalizando o apresentador e o produto';
  let framingRole = 'Medium Shot';
  let productPositionRole = 'Centro do enquadramento';
  let presenterPositionRole = 'Centralizado';

  if (visibility === 'HANDS_ONLY') {
    cameraRole = 'Close-up focalizando mãos e produto sobre a bancada';
    framingRole = 'Close-up / Top-Down';
    presenterPositionRole = 'Mãos entrando no quadro';
    productPositionRole = 'Centro da bancada';
  } else if (visibility === 'POV') {
    cameraRole = 'Ponto de vista em primeira pessoa (POV) interagindo diretamente com o produto';
    framingRole = 'POV First-Person';
    presenterPositionRole = 'Perspectiva do usuário';
    productPositionRole = 'À frente dos olhos/mãos do espectador';
  } else if (productScale === 'LARGE_OBJECT') {
    cameraRole = 'Plano aberto ou médio aberto posicionando apresentador ao lado do produto';
    framingRole = 'Wide / Medium Wide Shot';
    presenterPositionRole = 'Ao lado do produto com postura aberta';
    productPositionRole = 'Apoiado no piso / base';
  } else if (role === 'DEMONSTRATION' || role === 'PROOF') {
    cameraRole = 'Plano detalhe ou médio fechado destacando a interação com o produto';
    framingRole = 'Close-Up Detalhe';
    productPositionRole = 'Primeiro plano';
  }

  const visualDirection: RemodeledSceneVisualDirection = {
    cameraRole,
    framingRole,
    lightingRole: 'Iluminação difusa de estúdio comercial / luz natural limpa',
    compositionRole: 'Regra dos terços com produto em zona de destaque visual',
    productPositionRole,
    presenterPositionRole,
    environmentRole: 'Ambiente moderno e limpo sem distrações visuais',
    motionEmphasis: 'Movimento fluido com foco nos detalhes funcionais',
  };

  // 5. Contexto Específico de Produto e Identidade para esta Cena
  const filteredProductContext: Partial<ProductInjectionContext> = {
    productScale,
    structural: {
      name: productName,
      category: productContext?.structural?.category || 'Produto',
      materials: productContext?.structural?.materials,
      colors: productContext?.structural?.colors,
      fixedParts: productContext?.structural?.fixedParts,
      movingParts: productContext?.structural?.movingParts,
      packaging: productContext?.structural?.packaging,
    },
    physicalConstraints: productContext?.physicalConstraints,
    interactionCapabilities: productContext?.interactionCapabilities,
  };

  const filteredIdentityContext: Partial<IdentityInjectionContext> = {
    visual: identityContext?.visual ? {
      avatarName: identityContext.visual.avatarName,
      gender: identityContext.visual.gender,
      faceDescriptors: visibility !== 'HANDS_ONLY' && visibility !== 'POV' ? identityContext.visual.faceDescriptors : undefined,
      hairDescriptors: visibility !== 'HANDS_ONLY' && visibility !== 'POV' ? identityContext.visual.hairDescriptors : undefined,
      skinDescriptors: identityContext.visual.skinDescriptors,
      masterPrompt: identityContext.visual.masterPrompt,
      referenceImage: identityContext.visual.referenceImage,
    } : undefined,
    wardrobe: identityContext?.wardrobe,
    presenterVisibility: visibility,
    locks: identityContext?.locks,
  };

  // 6. Copy Direction (Estrutural — sem geração final de texto)
  const copyDirection: RemodeledSceneCopyDirection = {
    hookPattern: sceneIndex === 0 ? copyViralDNA?.hookPattern || 'Retenção por quebra de padrão inicial' : undefined,
    conversionPattern: copyViralDNA?.conversionPattern || 'Apresentação do benefício prático imediato',
    voiceDelivery: copyViralDNA?.voiceDelivery?.description || 'Tom natural e confiante de recomendação autêntica',
    ctaStrategy: role === 'CTA' ? copyViralDNA?.ctaStrategy?.description || 'Direcionamento direto para a compra' : undefined,
    platformBehavior: copyViralDNA?.platform || 'TikTok Shop / Reels',
    suggestedIntent: role === 'HOOK' ? 'Capturar atenção nos primeiros 2 segundos' : role === 'CTA' ? 'Converter interesse em clique' : 'Demonstrar valor prático',
  };

  // 7. Voice Direction (Separando voz base de cadência viral)
  const voiceDirection: RemodeledSceneVoiceDirection = {
    baseVoice: identityContext?.voiceDelivery ? {
      gender: identityContext.voiceDelivery.gender,
      audience: identityContext.voiceDelivery.audience,
      style: identityContext.voiceDelivery.style,
      speakingEnergy: identityContext.voiceDelivery.speakingEnergy,
      speakingPace: identityContext.voiceDelivery.speakingPace,
      persona: identityContext.voiceDelivery.persona,
      voiceDescription: identityContext.voiceDelivery.voiceDescription,
    } : undefined,
    viralDeliveryPattern: copyViralDNA?.voiceDelivery?.voiceStyle || 'Ritmo acelerado e alta clareza de articulação',
    energy: identityContext?.voiceDelivery?.speakingEnergy ?? 70,
    pace: identityContext?.voiceDelivery?.speakingPace || 'Normal',
  };

  // 8. CTA Direction
  const ctaDirection: RemodeledSceneCtaDirection | undefined = role === 'CTA' ? {
    actionType: copyViralDNA?.ctaStrategy?.actionType || 'Compre Agora / Confira no Link',
    timing: timestamp || 'Últimos 3 segundos',
    urgencyLevel: 'Moderada / Foco em benefício',
  } : undefined;

  // 9. Preservação por Cena
  const preservation: Record<PreservableElementKey | string, PreservationAction> = {
    hook: sceneIndex === 0 && domainPolicy.hook === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    conversion_structure: domainPolicy.conversionStructure === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    cta_position: role === 'CTA' && domainPolicy.ctaPosition === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    demo_type: (role === 'DEMONSTRATION' || role === 'PROOF') && domainPolicy.demoType === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    visual_proof: role === 'PROOF' && domainPolicy.visualProof === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    editing_pace: domainPolicy.editingPace === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    visual_style: domainPolicy.visualStyle === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    camera_movement: domainPolicy.cameraMovement === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    voice_style: domainPolicy.voiceStyle === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
    presentation_energy: domainPolicy.presentationEnergy === 'PRESERVE' ? 'PRESERVED' : 'REMODELED',
  };

  // 10. Candidatos a Fatos Comerciais (Isolamento rígido: apenas do target productContext)
  const commercialFactCandidates: CommercialFactCandidate[] = [];
  if (productContext?.commercial) {
    if (productContext.commercial.mainBenefit) {
      commercialFactCandidates.push({
        claim: productContext.commercial.mainBenefit,
        source: 'PRODUCT_INJECTION_CONTEXT:mainBenefit',
        confidence: 0.95,
      });
    }
    if (productContext.commercial.uniqueDifferentiator) {
      commercialFactCandidates.push({
        claim: productContext.commercial.uniqueDifferentiator,
        source: 'PRODUCT_INJECTION_CONTEXT:uniqueDifferentiator',
        confidence: 0.95,
      });
    }
    if (Array.isArray(productContext.commercial.features)) {
      for (const feat of productContext.commercial.features) {
        if (feat && typeof feat === 'string') {
          commercialFactCandidates.push({
            claim: feat,
            source: 'PRODUCT_INJECTION_CONTEXT:features',
            confidence: 0.9,
          });
        }
      }
    }
  }

  // 11. Safety Flags
  const motionScene = remodeledMotionScene as RemodeledMotionScene | undefined;
  const isRemodeledMotion = Boolean(motionScene && motionScene.adaptedMotion);
  const requiresSafety = Boolean(
    motionScene?.requiresSafetyValidation ||
    (productScale === 'LARGE_OBJECT' && (role === 'DEMONSTRATION' || role === 'HOOK'))
  );

  const safetyFlags: RemodeledSceneSafetyFlags = {
    requiresSafetyValidation: requiresSafety,
    continuityWarnings: [],
    incompatibleActions: motionScene?.removedActions || [],
    lowTransferability: motionScene?.compatibility === 'ADAPTABLE' || motionScene?.compatibility === 'INCOMPATIBLE',
  };

  return {
    sceneId,
    sceneName,
    timestamp,
    duration,
    role,
    viralStructure,
    visualDirection,
    physicalMotion: isRemodeledMotion ? motionScene : (remodeledMotionScene as PhysicalMotionScene),
    productContext: filteredProductContext,
    identityContext: filteredIdentityContext,
    copyDirection,
    voiceDirection,
    ctaDirection,
    preservation,
    commercialFactCandidates,
    safetyFlags,
  };
}

// ============================================================================
// COMPILAÇÃO DETERMINÍSTICA DO PROJETO COMPLETO (REMODELED PROJECT BLUEPRINT)
// ============================================================================

export interface CompileProjectInput {
  strippedDNA?: StrippedReferenceDNA | null;
  viralStructureDNA?: ViralStructureDNA | null;
  copyViralDNA?: CopyViralDNA | null;
  remodeledMotion?: RemodeledPhysicalMotion | null;
  productContext?: ProductInjectionContext | null;
  identityContext?: IdentityInjectionContext | null;
  adaptationContract?: AdaptationContract | null;
  preservationContract?: PreservationContract | null;
  rawScenes?: any[] | null;
}

/**
 * Compila o projeto inteiro em um RemodeledProjectBlueprint canônico e imutável.
 */
export function compileRemodeledProject(input: CompileProjectInput): RemodeledProjectBlueprint {
  const viralDNA = input.viralStructureDNA || input.strippedDNA?.viralStructureDNA || null;
  const copyDNA = input.copyViralDNA || input.strippedDNA?.copyViralDNA || null;
  const adaptationContract = input.adaptationContract || null;
  const intensity = adaptationContract?.remodelingIntensity ?? viralDNA?.remodelingIntensity ?? 50;
  const preserveElements =
    adaptationContract?.preserveElements ||
    input.preservationContract?.preservedElements ||
    viralDNA?.preservation?.preservedElements ||
    ALL_PRESERVABLE_ELEMENTS;

  const domainPolicy = resolvePreservationPolicy(intensity, preserveElements);
  const intensityTier = resolveIntensityTier(intensity);

  // 1. Resolução de Cenas
  let legacyScenes = Array.isArray(input.rawScenes) && input.rawScenes.length > 0
    ? input.rawScenes
    : normalizeLegacyScenes(input.strippedDNA || {});

  const motionScenes = input.remodeledMotion?.scenes || [];
  const sceneCount = Math.max(legacyScenes.length, motionScenes.length, 1);

  const compiledScenes: RemodeledSceneBlueprint[] = [];
  const continuityWarnings: string[] = [];
  const flaggedSceneIds: string[] = [];
  let totalIncompatibleActions = 0;

  for (let i = 0; i < sceneCount; i++) {
    const rawScene = legacyScenes[i] || null;
    const motionScene = motionScenes[i] || null;

    const compiledScene = compileRemodeledScene({
      sceneIndex: i,
      totalScenes: sceneCount,
      rawScene,
      viralStructureDNA: viralDNA,
      copyViralDNA: copyDNA,
      remodeledMotionScene: motionScene,
      productContext: input.productContext,
      identityContext: input.identityContext,
      domainPolicy,
      remodelingIntensity: intensity,
    });

    if (compiledScene.safetyFlags.requiresSafetyValidation) {
      flaggedSceneIds.push(compiledScene.sceneId);
    }
    totalIncompatibleActions += compiledScene.safetyFlags.incompatibleActions.length;

    compiledScenes.push(compiledScene);
  }

  // 2. Validação Estrutural de Continuidade entre Cenas
  for (let i = 0; i < compiledScenes.length - 1; i++) {
    const current = compiledScenes[i];
    const next = compiledScenes[i + 1];

    // Conflito de Visibilidade do Apresentador
    if (
      current.identityContext?.presenterVisibility &&
      next.identityContext?.presenterVisibility &&
      current.identityContext.presenterVisibility !== next.identityContext.presenterVisibility
    ) {
      const warn = `Transição de visibilidade entre ${current.sceneId} (${current.identityContext.presenterVisibility}) e ${next.sceneId} (${next.identityContext.presenterVisibility}) requer alinhamento suave.`;
      continuityWarnings.push(warn);
      current.safetyFlags.continuityWarnings.push(warn);
    }
  }

  // Incorporar warnings do motion adaptation report
  if (input.remodeledMotion?.adaptationReport?.continuityWarnings) {
    continuityWarnings.push(...input.remodeledMotion.adaptationReport.continuityWarnings);
  }

  // 3. Relatório e Resumo de Segurança
  const overallCompatibility: MotionCompatibilityLevel =
    input.remodeledMotion?.overallCompatibility || 'DIRECT';

  const compilationReport: RemodeledProjectCompilationReport = {
    sceneCount: compiledScenes.length,
    intensityPolicy: intensityTier,
    remodelingIntensity: intensity,
    commercialFactsIsolated: true,
    identityIsolated: true,
    continuityWarnings: Array.from(new Set(continuityWarnings)),
    safetyValidationRequired: flaggedSceneIds.length > 0 || totalIncompatibleActions > 0,
    overallCompatibility,
  };

  const safetySummary: RemodeledProjectSafetySummary = {
    requiresSafetyValidation: compilationReport.safetyValidationRequired,
    flaggedSceneIds,
    continuityWarnings: Array.from(new Set(continuityWarnings)),
    incompatibleActionCount: totalIncompatibleActions,
  };

  return {
    scenes: compiledScenes,
    productContext: input.productContext || undefined,
    identityContext: input.identityContext || undefined,
    adaptationContract: adaptationContract || undefined,
    preservationPolicy: domainPolicy,
    compilationReport,
    safetySummary,
  };
}

// ============================================================================
// PROMPT COMPOSER COMPATIBILITY ADAPTER
// ============================================================================

export interface RemodeledPromptCompilerInput {
  scenes: Array<{
    sceneId: string;
    role: string;
    timestamp?: string;
    duration?: number | string;
    visualDirection: RemodeledSceneVisualDirection;
    motionScene?: PhysicalMotionScene;
    productName?: string;
    productScale?: ProductScale;
    avatarName?: string;
    presenterVisibility?: PresenterVisibility;
    copyIntent?: string;
    voiceStyle?: string;
    ctaStrategy?: string;
    commercialFacts: string[];
    safetyFlags: RemodeledSceneSafetyFlags;
  }>;
  overallPacing?: string;
  remodelingIntensity: number;
  safetySummary: RemodeledProjectSafetySummary;
}

/**
 * Converte um RemodeledProjectBlueprint em uma estrutura de entrada pronta para os
 * compilers de prompt posteriores sem modificação dos arquivos legados.
 */
export function remodeledBlueprintToPromptInput(
  projectBlueprint: RemodeledProjectBlueprint
): RemodeledPromptCompilerInput {
  const scenes = projectBlueprint.scenes.map(s => {
    const motion = s.physicalMotion && 'adaptedMotion' in s.physicalMotion
      ? (s.physicalMotion as RemodeledMotionScene).adaptedMotion
      : (s.physicalMotion as PhysicalMotionScene | undefined);

    const commercialFacts = s.commercialFactCandidates.map(c => c.claim);

    return {
      sceneId: s.sceneId,
      role: s.role,
      timestamp: s.timestamp,
      duration: s.duration,
      visualDirection: s.visualDirection,
      motionScene: motion,
      productName: s.productContext?.structural?.name,
      productScale: s.productContext?.productScale,
      avatarName: s.identityContext?.visual?.avatarName,
      presenterVisibility: s.identityContext?.presenterVisibility,
      copyIntent: s.copyDirection.suggestedIntent,
      voiceStyle: s.voiceDirection.viralDeliveryPattern,
      ctaStrategy: s.ctaDirection?.actionType,
      commercialFacts,
      safetyFlags: s.safetyFlags,
    };
  });

  return {
    scenes,
    overallPacing: projectBlueprint.adaptationContract?.platformReport?.recommendedPacing,
    remodelingIntensity: projectBlueprint.compilationReport.remodelingIntensity,
    safetySummary: projectBlueprint.safetySummary,
  };
}
