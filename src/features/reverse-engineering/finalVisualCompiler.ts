/**
 * FINAL VISUAL PROMPT COMPILER — ETAPA 9B
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Compilador final de prompts visuais em inglês (`visual_prompt_en`) para projetos
 * remodelados de Engenharia Reversa.
 * 
 * Princípios Rígidos:
 * 1. Consome exclusivamente `ApprovedFinalCompilationInput`.
 * 2. Ordem estrita de prioridade de autoridade:
 *    1. ProductInjectionContext (Fonte da Verdade Física do Produto)
 *    2. IdentityInjectionContext (Fonte da Verdade da Identidade Alvo)
 *    3. RemodeledPhysicalMotion (Movimentos Físicos Adaptados)
 *    4. RemodeledSceneVisualDirection (Direção Visual, Câmera, Iluminação)
 *    5. ViralStructureDNA (Função do Papel da Cena)
 *    6. MotionLockDirectives (Restrições e Invariantes)
 * 3. ZERO REFERENCE LEAK: Nunca reutiliza prompt visual literal ou traços específicos da referência.
 * 4. Respeita visibilidade do apresentador (FULL_PRESENTER, UPPER_BODY, HANDS_ONLY, POV, NO_PRESENTER).
 * 5. Incorpora integralmente motion lock directives e negative prompt additions.
 * 6. Pura, determinística, imutável e sem efeitos colaterais.
 */

import {
  ApprovedFinalCompilationInput,
  ApprovedFinalVisualScene,
  ApprovedFinalSceneMotionLockDirective,
  FinalRemodeledVisualProject,
  FinalRemodeledVisualScene,
  FinalRemodeledVisualReport,
  ProductInjectionContext,
  IdentityInjectionContext,
  PresenterVisibility,
  RemodeledMotionScene,
  PhysicalMotionScene,
} from './types';

// ============================================================================
// 1. COMPILADORES DE BLOCOS DE PROMPT VISUAL
// ============================================================================

/**
 * Compila a descrição física e visual inalterável do produto (Product Truth).
 */
export function compileProductVisualBlock(
  productContext?: ProductInjectionContext
): { text: string; appliedFacts: string[] } {
  if (!productContext || (!productContext.structural && !productContext.rawVisionData)) {
    return { text: 'a sleek commercial product', appliedFacts: [] };
  }

  const structural = productContext.structural;
  const vision = productContext.rawVisionData;
  const appliedFacts: string[] = [];

  const name = structural?.name || 'the product';
  const category = structural?.category || vision?.category || 'product';
  const colors = structural?.colors || (vision?.color ? String(vision.color) : '');
  const materials = structural?.materials || (vision?.material ? String(vision.material) : '');
  const texture = structural?.texture || (vision?.texture ? String(vision.texture) : '');
  const finish = structural?.finish || (vision?.finish ? String(vision.finish) : '');
  const logo = structural?.logo || (vision?.logo ? String(vision.logo) : '');
  const fixedParts = structural?.fixedParts || vision?.fixedParts || [];
  const movingParts = structural?.movingParts || vision?.movingParts || [];

  const descParts: string[] = [];

  // Nome e Categoria
  descParts.push(`featuring ${name} (${category})`);
  appliedFacts.push(`Produto: ${name}`);

  // Materiais, Cor e Acabamento
  const materialAttributes: string[] = [];
  if (colors) {
    materialAttributes.push(`${colors} color palette`);
    appliedFacts.push(`Cor: ${colors}`);
  }
  if (materials) {
    materialAttributes.push(`crafted from ${materials}`);
    appliedFacts.push(`Material: ${materials}`);
  }
  if (texture) {
    materialAttributes.push(`${texture} surface texture`);
    appliedFacts.push(`Textura: ${texture}`);
  }
  if (finish) {
    materialAttributes.push(`${finish} finish`);
    appliedFacts.push(`Acabamento: ${finish}`);
  }

  if (materialAttributes.length > 0) {
    descParts.push(`with ${materialAttributes.join(', ')}`);
  }

  // Identificação e Logo
  if (logo && logo.toLowerCase() !== 'nenhum' && logo.toLowerCase() !== 'none') {
    descParts.push(`displaying crisp authentic "${logo}" branding`);
    appliedFacts.push(`Logo: ${logo}`);
  }

  // Partes Físicas Rígidas vs Articuladas
  if (fixedParts.length > 0) {
    descParts.push(`with fixed rigid components: [${fixedParts.join(', ')}] maintaining strictly unyielding geometry`);
    appliedFacts.push(`Partes fixas: ${fixedParts.join(', ')}`);
  }
  if (movingParts.length > 0) {
    descParts.push(`with articulated moving elements: [${movingParts.join(', ')}] functioning with mechanical precision`);
    appliedFacts.push(`Partes móveis: ${movingParts.join(', ')}`);
  }

  return {
    text: descParts.join(', '),
    appliedFacts,
  };
}

/**
 * Compila a descrição da identidade visual do apresentador (Target Identity Only).
 */
export function compileIdentityVisualBlock(
  identityContext?: IdentityInjectionContext,
  visibility: PresenterVisibility = 'UPPER_BODY'
): { text: string; applied: boolean } {
  if (visibility === 'NO_PRESENTER') {
    return { text: 'No human presenter visible, purely focused product cinematography', applied: false };
  }

  if (visibility === 'POV') {
    return {
      text: 'First-person POV perspective, user hands cleanly visible operating the item from a natural subjective angle',
      applied: true,
    };
  }

  if (visibility === 'HANDS_ONLY') {
    const skin = identityContext?.visual?.skinDescriptors || 'natural skin tone';
    return {
      text: `Clean manicured presenter hands with ${skin}, carefully framing and manipulating the product with steady tactile dexterity, no face visible in frame`,
      applied: true,
    };
  }

  // FULL_PRESENTER ou UPPER_BODY
  if (!identityContext || !identityContext.visual) {
    return {
      text: visibility === 'FULL_PRESENTER'
        ? 'Professional presenter in full body framing with natural posture and charismatic commercial delivery'
        : 'Professional presenter in medium close-up upper body framing with confident engaging expression',
      applied: false,
    };
  }

  const visual = identityContext.visual;
  const wardrobe = identityContext.wardrobe;
  const avatarName = visual.avatarName || 'the presenter';
  const gender = visual.gender || 'presenter';
  const ageRange = visual.ageRange || 'adult';
  const hair = visual.hairDescriptors || '';
  const skin = visual.skinDescriptors || '';
  const face = visual.faceDescriptors || '';

  const traits: string[] = [];
  if (face) traits.push(face);
  if (hair) traits.push(hair);
  if (skin) traits.push(skin);

  const presenterFrame = visibility === 'FULL_PRESENTER' ? 'full-body frame' : 'upper-body medium shot';

  let result = `${avatarName} as an engaging ${ageRange} ${gender} in ${presenterFrame}`;
  if (traits.length > 0) {
    result += ` with ${traits.join(', ')}`;
  }

  // Incorporação de figurino alvo travado
  const wardrobeDesc = wardrobe?.clothingType || wardrobe?.top ? [wardrobe.top, wardrobe.bottom, wardrobe.clothingType].filter(Boolean).join(' and ') : '';
  if (wardrobeDesc) {
    result += `, wearing ${wardrobeDesc}`;
  }

  return {
    text: result,
    applied: true,
  };
}

/**
 * Compila a coreografia física de movimento (Remodeled Physical Motion).
 */
export function compilePhysicalMotionBlock(
  motionScene?: RemodeledMotionScene | PhysicalMotionScene
): string {
  if (!motionScene) {
    return 'smooth controlled commercial interaction with the product in stable focus';
  }

  const motion: PhysicalMotionScene = 'adaptedMotion' in motionScene ? motionScene.adaptedMotion : motionScene;
  const steps: string[] = [];

  if (motion.startPose) {
    steps.push(`initial pose starting with ${motion.startPose}`);
  }
  if (motion.actionOrder && motion.actionOrder.length > 0) {
    steps.push(`chronological action sequence: ${motion.actionOrder.join(' -> ')}`);
  }
  if (motion.gripType) {
    steps.push(`utilizing a secure ${motion.gripType} grip`);
  }
  if (motion.contactPoints && motion.contactPoints.length > 0) {
    steps.push(`contact maintained strictly at ${motion.contactPoints.join(' and ')}`);
  }
  if (motion.productOrientation) {
    steps.push(`product held in ${motion.productOrientation} orientation facing camera`);
  }
  if (motion.handPath && motion.handPath.length > 0) {
    steps.push(`fluid hand trajectory following ${motion.handPath.join(' to ')}`);
  }
  if (motion.endPose) {
    steps.push(`culminating in a steady ${motion.endPose}`);
  }

  return steps.length > 0
    ? steps.join(', ')
    : 'natural continuous product demonstration maintaining realistic physics';
}

/**
 * Compila a atmosfera cinematográfica (Câmera, Enquadramento, Iluminação, Cenário).
 */
export function compileCinematicEnvironmentBlock(
  visualDirection?: ApprovedFinalVisualScene['visualDirection'],
  role: string = 'DEMONSTRATION'
): string {
  const camera = visualDirection?.cameraRole || 'smooth subtle camera push-in';
  const framing = visualDirection?.framingRole || 'sharp medium-close framing with shallow depth of field';
  const lighting = visualDirection?.lightingRole || 'high-end studio commercial lighting with soft warm rim highlights';
  const environment = visualDirection?.environmentRole || 'minimalist contemporary lifestyle studio setting';
  const composition = visualDirection?.compositionRole || 'rule-of-thirds product-centric balanced composition';

  let roleEmphasis = '';
  const r = role.toUpperCase();
  if (r === 'HOOK') {
    roleEmphasis = 'high visual stopping power, crisp immediate clarity to arrest scroll attention';
  } else if (r === 'PROOF') {
    roleEmphasis = 'ultra-sharp macro texture focus emphasizing authentic physical craftsmanship';
  } else if (r === 'OFFER' || r === 'CTA') {
    roleEmphasis = 'clean hero presentation, pristine product spotlighting with frictionless visual appeal';
  }

  return [
    camera,
    framing,
    lighting,
    environment,
    composition,
    roleEmphasis,
  ].filter(Boolean).join(', ');
}

// ============================================================================
// 2. COMPILADOR DE CENA VISUAL INDIVIDUAL
// ============================================================================

export interface CompileVisualSceneContext {
  scene: ApprovedFinalVisualScene;
  directive?: ApprovedFinalSceneMotionLockDirective;
  productContext?: ProductInjectionContext;
  identityContext?: IdentityInjectionContext;
  visibility: PresenterVisibility;
  platform?: string;
}

export function compileRemodeledVisualScene(
  ctx: CompileVisualSceneContext
): FinalRemodeledVisualScene {
  const sceneId = ctx.scene.sceneId;
  const role = ctx.scene.role || 'DEMONSTRATION';
  const warnings: string[] = [];

  // 1. Compilação do Produto (Product Truth)
  const productBlock = compileProductVisualBlock(ctx.productContext);

  // 2. Compilação da Identidade (Target Identity Only)
  const identityBlock = compileIdentityVisualBlock(ctx.identityContext, ctx.visibility);

  // 3. Compilação do Movimento Físico (Remodeled Physical Motion)
  const motionBlock = compilePhysicalMotionBlock(ctx.scene.physicalMotion);

  // 4. Compilação da Cinematografia & Ambiente
  const cinemaBlock = compileCinematicEnvironmentBlock(ctx.scene.visualDirection, role);

  // 5. Integração de Motion Lock Directives
  const lockPromptAddition = ctx.directive?.prompt_addition || ctx.scene.motionLockPrompt || '';
  const lockNegativeAddition = ctx.directive?.negative_prompt_addition || '';

  // 6. Montagem do Prompt Visual Mestre
  const promptSections: string[] = [
    `Commercial 4k cinematic video for ${role} scene`,
    identityBlock.text,
    productBlock.text,
    motionBlock,
    cinemaBlock,
  ];

  if (lockPromptAddition) {
    promptSections.push(`[Physical Invariant Locks: ${lockPromptAddition}]`);
  }

  promptSections.push('photorealistic, 8k resolution, professional color grading, ultra-detailed textures, zero digital artifacts, 24fps motion blur');

  const visual_prompt_en = promptSections.filter(Boolean).join('. ');

  // 7. Negative Prompt Base Seguro
  const baseNegative = 'morphing product, distorted logos, changing materials, deformed hands, extra fingers, missing fingers, floating objects, warped geometry, flickering, jitter, uncanny valley, watermark, low quality, oversaturated noise';
  const negative_prompt_en = lockNegativeAddition
    ? `${baseNegative}, ${lockNegativeAddition}`
    : baseNegative;

  return {
    sceneId,
    role,
    visual_prompt_en,
    negative_prompt_en,
    motionLockDirectives: ctx.directive,
    appliedProductFacts: productBlock.appliedFacts,
    identityApplied: identityBlock.applied,
    warnings,
  };
}

// ============================================================================
// 3. COMPILADOR DE PROJETO VISUAL COMPLETO (PURE & DETERMINISTIC)
// ============================================================================

export function compileFinalRemodeledVisual(
  input: ApprovedFinalCompilationInput
): FinalRemodeledVisualProject {
  const visualScenesInput = input?.visualInputPayload?.scenes || [];
  const directives = input?.motionLockDirectives || [];
  const productContext = input?.productContext;
  const identityContext = input?.identityContext;
  const blueprint = input?.approvedProject;

  // Determinar visibilidade do apresentador do blueprint remodelado
  const presenterVisibility: PresenterVisibility =
    blueprint?.scenes?.[0]?.visualDirection?.presenterPositionRole === 'POV'
      ? 'POV'
      : blueprint?.scenes?.[0]?.visualDirection?.presenterPositionRole === 'HANDS_ONLY'
        ? 'HANDS_ONLY'
        : blueprint?.scenes?.[0]?.visualDirection?.presenterPositionRole === 'NO_PRESENTER'
          ? 'NO_PRESENTER'
          : 'UPPER_BODY';

  const compiledScenes: FinalRemodeledVisualScene[] = [];
  const continuityWarnings: string[] = [];
  const visualWarnings: string[] = [];

  let productLockAppliedCount = 0;
  let identityLockAppliedCount = 0;
  let motionLockAppliedCount = 0;
  let referenceLeaksBlockedCount = 0;

  for (const sceneInput of visualScenesInput) {
    const directive = directives.find(d => d.sceneId === sceneInput.sceneId);

    const compiledScene = compileRemodeledVisualScene({
      scene: sceneInput,
      directive,
      productContext,
      identityContext,
      visibility: presenterVisibility,
    });

    compiledScenes.push(compiledScene);

    if (compiledScene.appliedProductFacts.length > 0) {
      productLockAppliedCount++;
    }
    if (compiledScene.identityApplied) {
      identityLockAppliedCount++;
    }
    if (directive?.prompt_addition || directive?.locks) {
      motionLockAppliedCount++;
    }

    for (const w of compiledScene.warnings) {
      visualWarnings.push(`[${compiledScene.sceneId}] ${w}`);
    }
  }

  // Validação de Continuidade entre Cenas Consecutivas
  for (let i = 1; i < compiledScenes.length; i++) {
    const prev = compiledScenes[i - 1];
    const curr = compiledScenes[i];

    if (prev.identityApplied !== curr.identityApplied && presenterVisibility !== 'NO_PRESENTER') {
      continuityWarnings.push(`Variação de visibilidade da identidade entre [${prev.sceneId}] e [${curr.sceneId}].`);
    }
  }

  const visualReport: FinalRemodeledVisualReport = {
    generatedScenes: compiledScenes.length,
    productLockApplied: productLockAppliedCount,
    identityLockApplied: identityLockAppliedCount,
    motionLockApplied: motionLockAppliedCount,
    referenceLeaksBlocked: referenceLeaksBlockedCount,
    continuityWarnings: Array.from(new Set(continuityWarnings)),
    visualWarnings: Array.from(new Set(visualWarnings)),
  };

  return {
    scenes: compiledScenes,
    visualReport,
  };
}
