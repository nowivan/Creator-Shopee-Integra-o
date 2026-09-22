/**
 * MOTION ADAPTATION ENGINE — ETAPA 5
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Motor determinístico puro que adapta o PhysicalMotionDNA limpo da referência às
 * características físicas reais do novo produto (ProductInjectionContext) e às
 * restrições de apresentação do avatar / apresentador (IdentityInjectionContext).
 * 
 * Princípios:
 * 1. Pura, determinística, imutável e idempotente.
 * 2. Sem chamadas LLM / Gemini.
 * 3. Preserva a FUNÇÃO de conversão/demonstração, adaptando a FÍSICA para o produto real.
 * 4. Respeita ProductScale, PhysicalConstraints, InteractionCapabilities e PresenterVisibility.
 * 5. Não altera copy, roteiro de voz, câmeras globais ou identidade do avatar.
 */

import {
  StrippedReferenceDNA,
  StrippedPhysicalMotionScene,
  PhysicalMotionScene,
  PhysicalMotionDNA,
  ProductInjectionContext,
  IdentityInjectionContext,
  ProductScale,
  PresenterVisibility,
  GripType,
  ProductOrientation,
  MotionComplexity,
  MotionCompatibilityLevel,
  FunctionalIntent,
  RemodeledMotionScene,
  MotionAdaptationReport,
  RemodeledPhysicalMotion,
} from './types';

// ============================================================================
// CLASSIFICAÇÃO DETERMINÍSTICA DE INTENÇÃO FUNCIONAL
// ============================================================================

export function detectFunctionalIntent(scene: PhysicalMotionScene | StrippedPhysicalMotionScene): FunctionalIntent {
  const text = [
    scene.startPose,
    scene.endPose,
    scene.actionOrder?.join(' '),
    scene.productInteraction?.join(' '),
    scene.contactPoints?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/unboxing|open box|abrir caixa|open lid|abrir tampa|desrosquear|unlid|openable|abertura/i.test(text)) {
    return 'OPEN_DEMO';
  }

  if (/apply|aplicar|passar|spray|borrifar|creme|serum|gotas|dispense|pressionar dosador|skin/i.test(text)) {
    return 'APPLICATION_DEMO';
  }

  if (/wear|vestir|colocar no pulso|calçar|ajustar no corpo|pulseira|wrist|vestimenta/i.test(text)) {
    return 'WEAR_DEMO';
  }

  if (/rotate|girar|360|mostrar verso|mostrar lateral|rotacionar|virar o produto/i.test(text)) {
    return 'ROTATION_SHOWCASE';
  }

  if (/point|apontar|destacar|indicar|touch screen|mostrar detalhe|botão|display|painel/i.test(text)) {
    return 'POINT_FEATURE';
  }

  if (/durability|resistência|água|riscar|bater|flexionar|dobrar|teste|proof|prova/i.test(text)) {
    return 'PROOF_INTERACTION';
  }

  if (/place on|colocar na mesa|pousar|apoiar na bancada|assentar|tabletop/i.test(text)) {
    return 'PLACEMENT_DEMO';
  }

  if (/textura|sentir|toque|tátil|passar a mão|acariciar superfície|tactile/i.test(text)) {
    return 'TACTILE_DEMO';
  }

  if (/compare|comparar|ao lado de|versus|tamanho relativo/i.test(text)) {
    return 'COMPARISON_POSITIONING';
  }

  if (/show|hold|segurar|exibir|mostrar|display|erguer|apresentar/i.test(text)) {
    return 'DISPLAY';
  }

  return 'OTHER';
}

// ============================================================================
// REGRAS DETERMINÍSTICAS DE ADAPTAÇÃO FÍSICA
// ============================================================================

interface SceneAdaptationResult {
  adaptedScene: PhysicalMotionScene;
  compatibility: MotionCompatibilityLevel;
  functionalIntent: FunctionalIntent;
  adaptationReason: string;
  requiresSafety: boolean;
  adaptedActions: string[];
  removedActions: string[];
  directActions: string[];
  incompatibleActions: string[];
}

function adaptGripForProduct(
  sourceGrip: GripType = 'UNKNOWN',
  scale: ProductScale,
  requiresTwoHands?: boolean,
  fineManipulation?: boolean,
  isStationary?: boolean
): GripType {
  if (isStationary || scale === 'LARGE_OBJECT') {
    return 'NO_GRIP';
  }

  if (requiresTwoHands || scale === 'TABLETOP') {
    return 'TWO_HAND_SUPPORT';
  }

  if (fineManipulation && scale === 'SMALL_HANDHELD') {
    return sourceGrip === 'PINCH' ? 'PINCH' : 'ONE_HAND_SUPPORT';
  }

  if (scale === 'SMALL_HANDHELD' || scale === 'MEDIUM_HANDHELD') {
    if (sourceGrip === 'TWO_HAND_SUPPORT' && !requiresTwoHands) return 'ONE_HAND_SUPPORT';
    if (sourceGrip === 'PINCH' && scale === 'MEDIUM_HANDHELD') return 'ONE_HAND_SUPPORT';
    return sourceGrip !== 'UNKNOWN' ? sourceGrip : 'ONE_HAND_SUPPORT';
  }

  if (scale === 'WEARABLE') {
    return 'PALM_SUPPORT';
  }

  return sourceGrip !== 'UNKNOWN' ? sourceGrip : 'ONE_HAND_SUPPORT';
}

function adaptStartPose(
  originalStart: string | undefined,
  scale: ProductScale,
  presenterVisibility: PresenterVisibility,
  requiresTwoHands?: boolean,
  isStationary?: boolean,
  productName: string = 'produto'
): string {
  const isHandsOnly = presenterVisibility === 'HANDS_ONLY';
  const isPOV = presenterVisibility === 'POV';
  const isNoPresenter = presenterVisibility === 'NO_PRESENTER';

  if (isNoPresenter) {
    return `${productName} posicionado estaticamente no centro do enquadramento`;
  }

  if (isPOV) {
    if (scale === 'LARGE_OBJECT' || isStationary) {
      return `Visão em primeira pessoa observando o ${productName} posicionado à frente`;
    }
    return `Mãos em perspectiva POV posicionadas para interagir com o ${productName}`;
  }

  if (isHandsOnly) {
    if (scale === 'LARGE_OBJECT' || isStationary) {
      return `Mãos entrando no enquadramento próximas à superfície do ${productName}`;
    }
    return `Mãos centralizadas segurando o ${productName} sobre a bancada`;
  }

  // Full / Upper Body Presenter
  if (scale === 'LARGE_OBJECT') {
    return `Apresentador de pé ao lado do ${productName}, posicionado com postura aberta`;
  }

  if (scale === 'TABLETOP') {
    return `Apresentador com o ${productName} apoiado na bancada à sua frente`;
  }

  if (scale === 'WEARABLE') {
    return `Apresentador com o ${productName} vestido no corpo/pulso em posição de destaque`;
  }

  if (requiresTwoHands) {
    return `Apresentador segurando o ${productName} com ambas as mãos na altura do peito`;
  }

  return originalStart || `Apresentador segurando o ${productName} na altura do peito com postura firme`;
}

function adaptEndPose(
  originalEnd: string | undefined,
  scale: ProductScale,
  presenterVisibility: PresenterVisibility,
  productName: string = 'produto'
): string {
  const isHandsOnly = presenterVisibility === 'HANDS_ONLY';
  const isPOV = presenterVisibility === 'POV';
  const isNoPresenter = presenterVisibility === 'NO_PRESENTER';

  if (isNoPresenter) {
    return `${productName} em repouso nítido no centro do quadro`;
  }

  if (isPOV || isHandsOnly) {
    if (scale === 'LARGE_OBJECT') {
      return `Mão pousada sobre a lateral do ${productName}`;
    }
    return `Mãos estabilizadas segurando o ${productName} com ângulo de destaque`;
  }

  if (scale === 'LARGE_OBJECT') {
    return `Apresentador de pé ao lado do ${productName}, gesticulando em direção a ele`;
  }

  if (scale === 'TABLETOP') {
    return `Apresentador com a mão apoiada suavemente sobre o ${productName} na bancada`;
  }

  return originalEnd || `Apresentador segurando o ${productName} com sorriso e foco visual`;
}

function adaptGazePath(
  originalGaze: string[] | undefined,
  presenterVisibility: PresenterVisibility
): string[] {
  if (
    presenterVisibility === 'HANDS_ONLY' ||
    presenterVisibility === 'POV' ||
    presenterVisibility === 'NO_PRESENTER'
  ) {
    return [];
  }
  return originalGaze && originalGaze.length > 0
    ? originalGaze
    : ['camera', 'product', 'camera'];
}

function adaptBodyPosition(
  originalBody: string | undefined,
  scale: ProductScale,
  presenterVisibility: PresenterVisibility
): string {
  if (presenterVisibility === 'NO_PRESENTER') {
    return 'off-camera';
  }
  if (presenterVisibility === 'HANDS_ONLY' || presenterVisibility === 'POV') {
    return 'hands entering frame / top-down or desk angle';
  }
  if (scale === 'LARGE_OBJECT') {
    return 'standing beside product';
  }
  if (scale === 'TABLETOP') {
    return 'seated or standing behind table';
  }
  return originalBody || 'centered';
}

function adaptComplexity(
  sourceComplexity: MotionComplexity = 'LOW',
  scale: ProductScale,
  requiresTwoHands?: boolean
): MotionComplexity {
  if (sourceComplexity === 'LOW') {
    return (requiresTwoHands || scale === 'TABLETOP') ? 'MEDIUM' : 'LOW';
  }
  if (sourceComplexity === 'MEDIUM') {
    return 'MEDIUM';
  }
  return 'HIGH';
}

// ============================================================================
// ADAPTAÇÃO INDIVIDUAL DE CENA
// ============================================================================

function adaptSingleScene(
  scene: PhysicalMotionScene | StrippedPhysicalMotionScene,
  productContext?: ProductInjectionContext | null,
  identityContext?: IdentityInjectionContext | null
): SceneAdaptationResult {
  const scale = productContext?.productScale || 'MEDIUM_HANDHELD';
  const constraints = productContext?.physicalConstraints || {};
  const capabilities = productContext?.interactionCapabilities || ['display', 'point'];
  const productName = productContext?.structural?.name || 'produto';
  const visibility = identityContext?.presenterVisibility || 'UPPER_BODY';

  const functionalIntent = detectFunctionalIntent(scene);

  const directActions: string[] = [];
  const adaptedActions: string[] = [];
  const removedActions: string[] = [];
  const incompatibleActions: string[] = [];

  let compatibility: MotionCompatibilityLevel = 'DIRECT';
  let adaptationReason = 'Transferência direta de dinâmica física funcional.';
  let requiresSafety = false;

  // 1. Validação de Incompatibilidade de Escala e Ações
  const sourceActions = scene.actionOrder || [];
  const adaptedActionList: string[] = [];

  const isLarge = scale === 'LARGE_OBJECT';
  const isTabletop = scale === 'TABLETOP';
  const isWearable = scale === 'WEARABLE';
  const isOpenable = Boolean(constraints.openable);
  const requiresTwoHands = Boolean(constraints.requiresTwoHands);
  const isStationary = Boolean(constraints.stationary);

  for (const rawAction of sourceActions) {
    const act = rawAction.toLowerCase();

    // Ação: Erguer / Segurar próximo ao rosto
    if (/near face|altura do rosto|próximo ao rosto|lift to face|raise to eye/i.test(act)) {
      if (isLarge || isTabletop || isStationary) {
        removedActions.push(rawAction);
        adaptedActions.push(`Apresentar ${productName} na bancada/ao lado com gesto indicativo`);
        adaptedActionList.push(`Apresentar ${productName} na bancada/ao lado com gesto indicativo`);
        compatibility = 'ADAPTABLE';
        adaptationReason = `Produto com escala ${scale} não permite elevação até o rosto.`;
        requiresSafety = true;
      } else if (visibility === 'HANDS_ONLY' || visibility === 'POV') {
        removedActions.push(rawAction);
        adaptedActions.push(`Centralizar ${productName} no enquadramento das mãos`);
        adaptedActionList.push(`Centralizar ${productName} no enquadramento das mãos`);
        compatibility = 'ADAPTABLE';
      } else {
        directActions.push(rawAction);
        adaptedActionList.push(rawAction);
      }
      continue;
    }

    // Ação: Abrir tampa / Unboxing
    if (/open lid|abrir tampa|desrosquear|unboxing|open box/i.test(act)) {
      if (!isOpenable && !capabilities.includes('open')) {
        removedActions.push(rawAction);
        incompatibleActions.push(`Ação de abertura incompatível (produto não possui tampa móvel)`);
        adaptedActions.push(`Demonstrar acabamento e detalhes de superfície do ${productName}`);
        adaptedActionList.push(`Demonstrar acabamento e detalhes de superfície do ${productName}`);
        compatibility = 'ADAPTABLE';
        adaptationReason = `Produto não possui partes móveis ou tampa abrível.`;
        requiresSafety = true;
      } else {
        directActions.push(rawAction);
        adaptedActionList.push(rawAction);
      }
      continue;
    }

    // Ação: Aplicar cosmético / spray / creme
    if (/apply|aplicar no rosto|passar na pele|borrifar|spray/i.test(act)) {
      if (!capabilities.includes('apply') && !capabilities.includes('spray')) {
        removedActions.push(rawAction);
        incompatibleActions.push(`Aplicação cosmética incompatível`);
        adaptedActions.push(`Gesto tátil destacando ergonomia e textura do ${productName}`);
        adaptedActionList.push(`Gesto tátil destacando ergonomia e textura do ${productName}`);
        compatibility = 'ADAPTABLE';
        adaptationReason = `Categoria do produto não suporta aplicação direta na pele.`;
      } else {
        directActions.push(rawAction);
        adaptedActionList.push(rawAction);
      }
      continue;
    }

    // Ação: Vestir / Ajustar no corpo
    if (/wear|vestir|calçar/i.test(act)) {
      if (!isWearable && !capabilities.includes('wear')) {
        removedActions.push(rawAction);
        adaptedActions.push(`Exibir ${productName} em ângulo frontal seguro`);
        adaptedActionList.push(`Exibir ${productName} em ângulo frontal seguro`);
        compatibility = 'ADAPTABLE';
        adaptationReason = `Produto não é vestível.`;
      } else {
        directActions.push(rawAction);
        adaptedActionList.push(rawAction);
      }
      continue;
    }

    // Ação compatível padrão
    directActions.push(rawAction);
    adaptedActionList.push(rawAction);
  }

  // Se a lista de ações ficou vazia, insere fallback baseado no intent
  if (adaptedActionList.length === 0) {
    if (isLarge) {
      adaptedActionList.push(`Gesticular e apontar para os detalhes principais do ${productName}`);
    } else if (isTabletop) {
      adaptedActionList.push(`Interagir com o ${productName} repousado sobre a mesa`);
    } else if (isWearable) {
      adaptedActionList.push(`Exibir o ${productName} ajustado ao corpo/pulso`);
    } else {
      adaptedActionList.push(`Exibir o ${productName} com firmeza para a câmera`);
    }
  }

  // 2. Adaptação de Grip
  const appliedGrip = adaptGripForProduct(
    scene.gripType,
    scale,
    requiresTwoHands,
    constraints.fineManipulation,
    isStationary
  );

  // 3. Adaptação de Poses, Gaze, Corpo
  const startPose = adaptStartPose(
    scene.startPose,
    scale,
    visibility,
    requiresTwoHands,
    isStationary,
    productName
  );

  const endPose = adaptEndPose(
    scene.endPose,
    scale,
    visibility,
    productName
  );

  const gazePath = adaptGazePath(scene.gazePath, visibility);
  const bodyPosition = adaptBodyPosition(scene.bodyPosition, scale, visibility);

  // 4. Adaptação de Contact Points
  const adaptedContactPoints = (scene.contactPoints || []).filter(cp => {
    const cpLower = cp.toLowerCase();
    if (!isOpenable && /tampa|lid|cap|zíper/i.test(cpLower)) return false;
    if (isLarge && /segurar com dedos|pinch/i.test(cpLower)) return false;
    return true;
  });

  if (adaptedContactPoints.length === 0) {
    if (appliedGrip === 'TWO_HAND_SUPPORT') {
      adaptedContactPoints.push('ambas as mãos apoiando as laterais');
    } else if (appliedGrip === 'ONE_HAND_SUPPORT') {
      adaptedContactPoints.push('mão dominante na base do produto');
    } else if (appliedGrip === 'NO_GRIP') {
      adaptedContactPoints.push('dedo indicador apontando detalhe');
    }
  }

  // 5. Orçamento de Complexidade
  const motionComplexity = adaptComplexity(scene.motionComplexity, scale, requiresTwoHands);

  // 6. Safety Check
  if (
    requiresTwoHands ||
    isLarge ||
    incompatibleActions.length > 0 ||
    (scene as StrippedPhysicalMotionScene).transferability === 'LOW' ||
    adaptedActionList.length > 4
  ) {
    requiresSafety = true;
  }

  const adaptedScene: PhysicalMotionScene = {
    sceneId: scene.sceneId,
    startPose,
    bodyPosition,
    actionOrder: adaptedActionList,
    handPath: scene.handPath,
    gazePath,
    productInteraction: scene.productInteraction,
    contactPoints: adaptedContactPoints,
    gripType: appliedGrip,
    productOrientation: scene.productOrientation || 'FRONT_TO_CAMERA',
    microPauses: scene.microPauses,
    continuityNotes: scene.continuityNotes,
    endPose,
    motionComplexity,
  };

  return {
    adaptedScene,
    compatibility,
    functionalIntent,
    adaptationReason,
    requiresSafety,
    adaptedActions,
    removedActions,
    directActions,
    incompatibleActions,
  };
}

// ============================================================================
// MOTOR DE ADAPTAÇÃO GLOBAL (PURE, DETERMINISTIC, IMMUTABLE)
// ============================================================================

export interface AdaptPhysicalMotionInput {
  strippedDNA?: StrippedReferenceDNA | null;
  productContext?: ProductInjectionContext | null;
  identityContext?: IdentityInjectionContext | null;
  rawMotionDNA?: PhysicalMotionDNA | null;
}

/**
 * Executa a adaptação determinística do PhysicalMotionDNA, convertendo a dinâmica
 * limpa de referência em um modelo físico remodelado compatível com o produto alvo e avatar.
 */
export function adaptPhysicalMotion(input: AdaptPhysicalMotionInput): RemodeledPhysicalMotion {
  const scenesToProcess: Array<PhysicalMotionScene | StrippedPhysicalMotionScene> =
    input.strippedDNA?.physicalMotionDNA?.scenes ||
    input.rawMotionDNA?.scenes ||
    [];

  if (scenesToProcess.length === 0) {
    return {
      scenes: [],
      adaptationReport: {
        directActions: [],
        adaptedActions: [],
        removedActions: [],
        incompatibleActions: [],
        continuityWarnings: [],
        safetyValidationRequired: false,
        overallCompatibility: 'UNKNOWN',
      },
      overallCompatibility: 'UNKNOWN',
      productScale: input.productContext?.productScale || 'UNKNOWN',
      presenterVisibility: input.identityContext?.presenterVisibility || 'UNKNOWN',
    };
  }

  const remodeledScenes: RemodeledMotionScene[] = [];
  const allDirectActions: string[] = [];
  const allAdaptedActions: string[] = [];
  const allRemovedActions: string[] = [];
  const allIncompatibleActions: string[] = [];
  const continuityWarnings: string[] = [];
  let safetyValidationRequired = false;
  const compatibilityLevels: MotionCompatibilityLevel[] = [];

  // 1. Processar cada cena
  for (let i = 0; i < scenesToProcess.length; i++) {
    const srcScene = scenesToProcess[i];
    const result = adaptSingleScene(srcScene, input.productContext, input.identityContext);

    remodeledScenes.push({
      sceneId: srcScene.sceneId || `scene_${i + 1}`,
      sourceMotion: srcScene,
      adaptedMotion: result.adaptedScene,
      functionalIntent: result.functionalIntent,
      compatibility: result.compatibility,
      adaptationReason: result.adaptationReason,
      requiresSafetyValidation: result.requiresSafety,
      appliedGrip: result.adaptedScene.gripType,
      adaptedActions: result.adaptedActions,
      removedActions: result.removedActions,
    });

    allDirectActions.push(...result.directActions);
    allAdaptedActions.push(...result.adaptedActions);
    allRemovedActions.push(...result.removedActions);
    allIncompatibleActions.push(...result.incompatibleActions);
    compatibilityLevels.push(result.compatibility);

    if (result.requiresSafety) {
      safetyValidationRequired = true;
    }
  }

  // 2. Validação de Continuidade entre Cenas
  for (let i = 0; i < remodeledScenes.length - 1; i++) {
    const currentScene = remodeledScenes[i].adaptedMotion;
    const nextScene = remodeledScenes[i + 1].adaptedMotion;

    // Discontinuidade de Grip (ex: No grip para Two Hand sem transição)
    if (
      currentScene.gripType === 'NO_GRIP' &&
      nextScene.gripType === 'TWO_HAND_SUPPORT' &&
      !nextScene.startPose?.includes('mãos') &&
      !nextScene.startPose?.includes('posicion')
    ) {
      continuityWarnings.push(
        `Cena ${i + 1} para Cena ${i + 2}: Transição de NO_GRIP para TWO_HAND_SUPPORT requer alcance e contato prévio.`
      );
    }

    // Discontinuidade de Escala / Posição do Objeto
    if (
      currentScene.bodyPosition === 'standing beside product' &&
      nextScene.bodyPosition === 'centered' &&
      input.productContext?.productScale === 'LARGE_OBJECT'
    ) {
      continuityWarnings.push(
        `Cena ${i + 1} para Cena ${i + 2}: Produto de grande porte deve manter o apresentador posicionado ao lado.`
      );
    }
  }

  // 3. Resolução de Compatibilidade Geral
  let overallCompatibility: MotionCompatibilityLevel = 'DIRECT';
  if (compatibilityLevels.includes('INCOMPATIBLE')) {
    overallCompatibility = 'INCOMPATIBLE';
  } else if (compatibilityLevels.includes('ADAPTABLE')) {
    overallCompatibility = 'ADAPTABLE';
  } else if (compatibilityLevels.includes('UNKNOWN')) {
    overallCompatibility = 'UNKNOWN';
  }

  const adaptationReport: MotionAdaptationReport = {
    directActions: Array.from(new Set(allDirectActions)),
    adaptedActions: Array.from(new Set(allAdaptedActions)),
    removedActions: Array.from(new Set(allRemovedActions)),
    incompatibleActions: Array.from(new Set(allIncompatibleActions)),
    continuityWarnings,
    safetyValidationRequired,
    overallCompatibility,
  };

  return {
    scenes: remodeledScenes,
    adaptationReport,
    overallCompatibility,
    productScale: input.productContext?.productScale,
    presenterVisibility: input.identityContext?.presenterVisibility,
  };
}

/**
 * Normaliza qualquer payload de movimento adaptado para garantir conformidade estrita com
 * os tipos do RemodeledPhysicalMotion.
 */
export function normalizeRemodeledPhysicalMotion(raw: any): RemodeledPhysicalMotion {
  if (raw && Array.isArray(raw.scenes) && raw.adaptationReport) {
    return raw as RemodeledPhysicalMotion;
  }
  return adaptPhysicalMotion({
    rawMotionDNA: raw?.physicalMotionDNA || raw,
  });
}
