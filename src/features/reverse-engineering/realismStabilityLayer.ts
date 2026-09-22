import { buildVoiceDescription, DEFAULT_VOICE_PROFILE } from './voiceProfile';

export { buildFlowAgentInstructions, type FlowAgentInstructionsInput, type FlowAgentInstructionsOutput } from '../cinematic/productMotionLockEngine';

export interface RealismStabilityLayerResult {
  realism_layer_en: string;
  human_behavior_en: string;
  camera_behavior_en: string;
  environment_consistency_en: string;
  product_integrity_lock_en: string;
  negative_prompt_en: string;
}

export interface EnrichedSceneBlock {
  block_id: number | string;
  scene_name: string;
  estimated_time: string;
  visual_context_en: string;
  visual_prompt_en?: string;
  actions: string[];
  voice_description_en: string;
  dialogue_pt_br: string;
  voice_language?: string;
  creator_profile?: string;
  realism_layer_en: string;
  human_behavior_en: string;
  camera_behavior_en: string;
  environment_consistency_en: string;
  product_integrity_lock_en: string;
  negative_prompt_en: string;
  flow_minimal_prompt_pt_br: string;
  flow_three_layer_prompt_pt_br: string;
  full_enriched_prompt_en: string;
  [key: string]: any;
}

/**
 * Builds the Realism & Stability Layer adapted for Flow, UGC, TikTok Shop, Veo, Sora, Runway, etc.
 * Universal and contextual without hardcoding fixed identities or specific products.
 */
export function buildRealismStabilityLayer(input: any): RealismStabilityLayerResult {
  const textToAnalyze = typeof input === 'string'
    ? input
    : (
        JSON.stringify(input || {}) + ' ' +
        (input?.text || '') + ' ' +
        (input?.description || '') + ' ' +
        (input?.productDetails || '') + ' ' +
        (input?.creator_profile || '') + ' ' +
        (input?.visual_prompt_en || '') + ' ' +
        (input?.visual_context_en || '')
      );

  const lower = textToAnalyze.toLowerCase();

  // Detect Human presence
  const hasHumanExplicit = input && typeof input === 'object' && (
    input.human_visibility === 'visible' ||
    input.hasHuman === true ||
    (input.creatorGender && input.creatorGender !== 'Neutral / Not specified')
  );

  const humanKeywords = [
    'female', 'male', 'woman', 'man', 'person', 'human', 'presenter',
    'influencer', 'creator', 'actor', 'speaker', 'hands', 'holding',
    'wearing', 'face', 'body', 'speaking', 'girl', 'boy', 'mulher',
    'homem', 'pessoa', 'mãos', 'maos', 'apresentador', 'criador', 'rosto'
  ];

  const hasHuman = hasHumanExplicit || humanKeywords.some(kw => lower.includes(kw));

  // Detect Product presence
  const hasProductExplicit = input && typeof input === 'object' && (
    input.hasProduct === true ||
    Boolean(input.productDetails) ||
    Boolean(input.productName) ||
    Boolean(input.object_lock)
  );

  const productKeywords = [
    'product', 'item', 'watch', 'bottle', 'shoe', 'box', 'package',
    'cream', 'device', 'gadget', 'phone', 'container', 'object',
    'relógio', 'relogio', 'produto', 'frasco', 'caixa', 'embalagem',
    'tênis', 'tenis', 'cosmético', 'cosmetico', 'perfume', 'bolsa', 'suplemento'
  ];

  const hasProduct = hasProductExplicit || productKeywords.some(kw => lower.includes(kw));

  // Detect Watch specifically
  const watchKeywords = [
    'watch', 'relógio', 'relogio', 'timepiece', 'chronograph',
    'watch dial', 'bezel', 'skeleton watch', 'relogio masculino', 'relogio feminino'
  ];
  const isWatch = watchKeywords.some(kw => lower.includes(kw));

  // Detect Style (Cinematic vs UGC / Flow)
  const cinematicKeywords = [
    'cinematic', 'estúdio', 'estudio', 'studio', 'commercial', 'macro',
    'high-end', '35mm', 'prime lens', 'hollywood', 'dramatic lighting'
  ];
  const isCinematic = cinematicKeywords.some(kw => lower.includes(kw));

  // 1. Realism Layer EN
  const realism_layer_en = "Highly realistic social media video with photorealistic quality. Natural skin texture when people appear, realistic material texture when products appear, accurate lighting, realistic shadows, balanced colors, clean sharp focus, natural depth of field, no over-processed look, no artificial cinematic exaggeration.";

  // 2. Human Behavior EN
  let human_behavior_en = "";
  if (hasHuman) {
    human_behavior_en = "Relaxed posture, natural blinking, subtle facial expressions, natural breathing, gentle hand gestures, small head movements, realistic body movement, no exaggerated acting, no forced sales performance.";
  } else {
    human_behavior_en = "No visible human performance required. Focus on realistic product motion, lighting, and camera behavior.";
  }

  // 3. Camera Behavior EN
  let camera_behavior_en = "";
  if (isCinematic) {
    camera_behavior_en = "Smooth controlled camera movement, macro focus when needed, slow push-in or soft orbit if appropriate, stable product framing, no random camera shake.";
  } else {
    camera_behavior_en = "Modern smartphone camera feel, subtle handheld stabilization, slow natural movement, slight parallax, stable framing, no dramatic cinematic effects.";
  }

  // 4. Environment Consistency EN
  const environment_consistency_en = "Consistent background, stable lighting direction, consistent shadows, natural colors, wardrobe continuity when people appear, no background mutation, no unexplained environment changes, no random object changes.";

  // 5. Product Integrity Lock EN
  let product_integrity_lock_en = "";
  if (hasProduct || isWatch) {
    product_integrity_lock_en = "Preserve product identity, preserve proportions, preserve shape, preserve material, preserve colors, preserve logo, preserve visible text, preserve screen, label, packaging, or decorative details. No deformation, no scale change, no duplicated parts, no product mutation.";
    if (isWatch) {
      product_integrity_lock_en += " Freeze all decorative dial details, markers, logos, numbers, date window, hands, bezel, crown, bracelet links, visible gears, and internal non-functional components. Only camera movement, lighting reflections, and external handling may move.";
    }
  } else {
    product_integrity_lock_en = "No specific product integrity lock required.";
  }

  // 6. Negative Prompt EN
  let negative_prompt_en = "no extra fingers, no extra limbs, no duplicated body parts, no body deformation, no facial glitches, no unrealistic expressions, no product deformation, no product warping, no text distortion, no changing logos, no background mutation, no clothing changes, no flickering, no blur, no subtitles, no text on screen unless requested, no watermark, no CGI look, no cartoon style, no low quality";

  if (hasProduct) {
    negative_prompt_en += ", no altered product design, no changed materials, no changed labels, no changed screen, no duplicated branding, no disappearing product details";
  }

  if (isWatch) {
    negative_prompt_en += ", no mutating watch gears, no shifting watch dial details, no changing hour markers, no moving logo";
  }

  return {
    realism_layer_en,
    human_behavior_en,
    camera_behavior_en,
    environment_consistency_en,
    product_integrity_lock_en,
    negative_prompt_en
  };
}

/**
 * Builds a clean, Flow-friendly prompt in Portuguese (PT-BR) according to strict rules:
 * - No JSON inside text
 * - No bullet points
 * - No long technical descriptions
 * - No excessive camera/lighting details
 * - Preserves key action, person/product, and speech
 */
export function buildFlowMinimalPrompt(block: any, context?: any): string {
  const dialogueVal = (
    block?.dialogue_pt_br ||
    block?.dialogue_pt ||
    block?.narration_pt_br ||
    block?.narration_pt ||
    block?.text ||
    block?.dialogue ||
    ''
  ).trim();

  const hasSpeech = dialogueVal &&
    dialogueVal !== '[Sem Áudio]' &&
    !dialogueVal.toLowerCase().includes('sem áudio') &&
    dialogueVal !== '...';

  if (hasSpeech) {
    const searchString = (
      (block?.creator_profile || '') + ' ' +
      (block?.voice_description_en || '') + ' ' +
      (context?.creatorGender || '') + ' ' +
      JSON.stringify(block || {})
    ).toLowerCase();

    let gender = 'neutral';
    if (
      searchString.includes('female') ||
      searchString.includes('woman') ||
      searchString.includes('mulher') ||
      searchString.includes('influenciadora')
    ) {
      gender = 'female';
    } else if (
      searchString.includes('male') ||
      searchString.includes('man') ||
      searchString.includes('homem') ||
      searchString.includes('influenciador')
    ) {
      gender = 'male';
    }

    if (gender === 'female') {
      return `Essa jovem fala com voz natural de influenciadora de TikTok Shop em português brasileiro.\n\n"${dialogueVal}"`;
    } else if (gender === 'male') {
      return `Esse jovem fala com voz natural de influenciador de TikTok Shop em português brasileiro.\n\n"${dialogueVal}"`;
    } else {
      return `Uma pessoa fala com voz natural de criador de TikTok Shop em português brasileiro.\n\n"${dialogueVal}"`;
    }
  }

  return 'Vídeo vertical realista de produto, com movimento natural de câmera e foco no produto.';
}

/**
 * Formats or cleans visual prompt into clear, practical PT-BR description without technical fluff.
 */
function formatVisualPromptToPtBr(rawVisual: string, actionsText: string): string {
  let combined = (rawVisual + (actionsText ? `. Ação: ${actionsText}` : '')).trim();

  if (!combined) {
    return 'Cena com foco principal no produto e no ambiente natural.';
  }

  // Remove JSON brackets/quotes if present
  combined = combined.replace(/[\{\}\[\]"]/g, ' ');

  // Common English prompt translation map to Portuguese
  const translations: [RegExp, string][] = [
    [/vertical video of/gi, 'Vídeo vertical de'],
    [/vertical video/gi, 'Vídeo vertical'],
    [/smartphone video of/gi, 'Vídeo de celular de'],
    [/a young woman/gi, 'uma jovem'],
    [/a young female/gi, 'uma jovem'],
    [/a young man/gi, 'um jovem'],
    [/a young male/gi, 'um jovem'],
    [/a woman/gi, 'uma mulher'],
    [/a man/gi, 'um homem'],
    [/a person/gi, 'uma pessoa'],
    [/an influencer/gi, 'um influenciador'],
    [/holding a/gi, 'segurando um(a)'],
    [/holding the/gi, 'segurando o(a)'],
    [/showing to the camera/gi, 'mostrando para a câmera'],
    [/showing the product to camera/gi, 'mostrando o produto para a câmera'],
    [/showing the/gi, 'mostrando o(a)'],
    [/pointing to/gi, 'apontando para'],
    [/pointing at/gi, 'apontando para'],
    [/close-up shot of/gi, 'take em close-up de'],
    [/close-up of/gi, 'take em close-up de'],
    [/medium shot of/gi, 'plano médio de'],
    [/talking to camera/gi, 'falando para a câmera'],
    [/speaking directly to camera/gi, 'falando diretamente para a câmera'],
    [/in a bedroom/gi, 'em um quarto'],
    [/in a cozy room/gi, 'em um quarto aconchegante'],
    [/in a studio/gi, 'em um estúdio'],
    [/in a store/gi, 'em uma loja'],
    [/on a table/gi, 'sobre uma mesa'],
    [/on a desk/gi, 'sobre uma mesa de trabalho'],
    [/demonstrating/gi, 'demonstrando'],
    [/unboxing/gi, 'desembalando'],
    [/wearing/gi, 'vestindo'],
    [/smiling/gi, 'sorrindo'],
    [/with natural lighting/gi, 'com iluminação natural'],
    [/macro shot/gi, 'detalhe em macro'],
    [/extreme close-up/gi, 'super close-up']
  ];

  for (const [regex, replacement] of translations) {
    combined = combined.replace(regex, replacement);
  }

  // Strip technical prompt fluff & negative prompts
  combined = combined.replace(/\b(4k|8k|octane render|unreal engine|35mm|photorealistic|hyperrealistic|masterpiece|cinematic lighting|trending on artstation)\b/gi, '');

  combined = combined.replace(/\s+/g, ' ').replace(/\s+\./g, '.').trim();

  return combined || 'Cena realista com foco na ação principal.';
}

/**
 * Infers ambient sound based on explicit block fields or scene keywords.
 */
function inferAmbientSoundPtBr(block: any, context: any, visual: string, actions: string): string {
  const explicitSound = (
    block?.ambient_sound_pt_br ||
    block?.ambient_sound ||
    block?.audio_environment ||
    block?.som_ambiente ||
    block?.sound_effect ||
    ''
  ).trim();

  if (explicitSound) {
    const lowerSound = explicitSound.toLowerCase();
    if (lowerSound.includes('store') || lowerSound.includes('loja')) return 'som leve de loja, passos e conversas ao fundo';
    if (lowerSound.includes('street') || lowerSound.includes('rua') || lowerSound.includes('outdoor')) return 'som ambiente externo, pessoas passando e conversa distante';
    if (lowerSound.includes('room') || lowerSound.includes('quarto')) return 'som interno leve, ambiente silencioso';
    if (lowerSound.includes('studio') || lowerSound.includes('estúdio') || lowerSound.includes('estudio')) return 'som limpo de ambiente interno';
    return explicitSound;
  }

  const fullText = (
    (block?.scene_name || '') + ' ' +
    visual + ' ' +
    actions + ' ' +
    (block?.creator_profile || '') + ' ' +
    (context?.creatorPersona || '') + ' ' +
    JSON.stringify(block || {})
  ).toLowerCase();

  if (fullText.includes('loja') || fullText.includes('store') || fullText.includes('shop') || fullText.includes('boutique') || fullText.includes('shopping') || fullText.includes('retail')) {
    return 'som leve de loja, passos e conversas ao fundo';
  }

  if (fullText.includes('rua') || fullText.includes('feira') || fullText.includes('street') || fullText.includes('outdoor') || fullText.includes('market') || fullText.includes('parque') || fullText.includes('park') || fullText.includes('avenida') || fullText.includes('externo')) {
    return 'som ambiente externo, pessoas passando e conversa distante';
  }

  if (fullText.includes('quarto') || fullText.includes('bedroom') || fullText.includes('sala') || fullText.includes('casa') || fullText.includes('home') || fullText.includes('cozinha') || fullText.includes('kitchen') || fullText.includes('escritório') || fullText.includes('office')) {
    return 'som interno leve, ambiente silencioso';
  }

  if (fullText.includes('estúdio') || fullText.includes('estudio') || fullText.includes('studio') || fullText.includes('fundo neutro') || fullText.includes('commercial') || fullText.includes('comercial')) {
    return 'som limpo de ambiente interno';
  }

  const hasHumanExplicit = block?.hasHuman === true || block?.human_visibility === 'visible';
  const humanKeywords = ['woman', 'man', 'person', 'influencer', 'creator', 'mulher', 'homem', 'pessoa', 'apresentador'];
  const mentionsHuman = hasHumanExplicit || humanKeywords.some(kw => fullText.includes(kw));

  if (!mentionsHuman || fullText.includes('macro') || fullText.includes('somente produto') || fullText.includes('product only')) {
    return 'som sutil de manipulação do produto';
  }

  return 'som interno leve, ambiente silencioso';
}

/**
 * Returns short PT-BR product lock rule if product is present, or null if no product.
 */
function getProductLockPtBr(block: any, context: any): string | null {
  const textToAnalyze = (
    JSON.stringify(block || {}) + ' ' +
    (block?.productDetails || '') + ' ' +
    (block?.productName || '') + ' ' +
    (block?.visual_context_en || '') + ' ' +
    (block?.visual_prompt_en || '') + ' ' +
    (context?.productDetails || '')
  ).toLowerCase();

  const lockEn = (block?.product_integrity_lock_en || '').toLowerCase();

  if (
    lockEn.includes('no specific product integrity lock') ||
    lockEn.includes('no product integrity lock') ||
    lockEn.includes('no product required') ||
    lockEn === 'no product'
  ) {
    return null;
  }

  const productKeywords = [
    'product', 'item', 'watch', 'bottle', 'shoe', 'box', 'package',
    'cream', 'device', 'gadget', 'phone', 'container', 'object', 'console',
    'relógio', 'relogio', 'produto', 'frasco', 'caixa', 'embalagem',
    'tênis', 'tenis', 'cosmético', 'cosmetico', 'perfume', 'bolsa', 'suplemento',
    'videogame', 'celular', 'iphone', 'smartwatch'
  ];

  const hasExplicitProduct = Boolean(
    block?.hasProduct === true ||
    block?.productDetails ||
    block?.productName ||
    context?.productDetails ||
    (lockEn && lockEn.length > 5 && !lockEn.includes('no specific product'))
  );

  const hasProductKeyword = productKeywords.some(kw => textToAnalyze.includes(kw));

  if (!hasExplicitProduct && !hasProductKeyword) {
    return null;
  }

  if (textToAnalyze.includes('watch') || textToAnalyze.includes('relógio') || textToAnalyze.includes('relogio') || textToAnalyze.includes('chronograph')) {
    return 'Manter mostrador, marcadores, logo, janela de data, pulseira, cor e formato. Não animar engrenagens ou detalhes fixos.';
  }

  if (textToAnalyze.includes('console') || textToAnalyze.includes('videogame') || textToAnalyze.includes('playstation') || textToAnalyze.includes('xbox') || textToAnalyze.includes('nintendo')) {
    return 'Manter formato, placas, cores, logo/texto visível, controle e proporções. Não transformar em outro modelo.';
  }

  if (textToAnalyze.includes('phone') || textToAnalyze.includes('celular') || textToAnalyze.includes('iphone') || textToAnalyze.includes('smartphone')) {
    return 'Manter formato do aparelho, módulo de câmeras, cor, logo, tela e proporções do corpo. Não alterar a identidade visual do smartphone.';
  }

  if (textToAnalyze.includes('cosmet') || textToAnalyze.includes('perfume') || textToAnalyze.includes('creme') || textToAnalyze.includes('cream') || textToAnalyze.includes('skincare') || textToAnalyze.includes('frasco')) {
    return 'Manter o frasco, rótulo, tampa, cores, texto da embalagem e proporções exatas. Não alterar a identidade do produto.';
  }

  if (textToAnalyze.includes('tênis') || textToAnalyze.includes('tenis') || textToAnalyze.includes('shoe') || textToAnalyze.includes('sneaker') || textToAnalyze.includes('sapato')) {
    return 'Manter o design do tênis, solado, cadarços, logo, combinação de cores e proporções. Não alterar o modelo.';
  }

  return 'Manter o produto com o mesmo formato, cor, proporções, materiais, logo/texto visível e detalhes principais. Não alterar a identidade visual.';
}

/**
 * Builds the "Flow em 3 Camadas" prompt in PT-BR for Google Flow.
 * Simple, practical structure:
 * VISUAL: ...
 * SOM AMBIENTE: ...
 * FALA: "..."
 * TRAVA DO PRODUTO: ... (optional)
 */
export function buildFlowThreeLayerPrompt(block: any, context?: any): string {
  const rawVisual = (
    block?.visual_context_pt_br ||
    block?.visual_description_pt_br ||
    block?.visual_prompt_pt_br ||
    block?.visual_context_en ||
    block?.visual_prompt_en ||
    block?.visual_prompt ||
    block?.description ||
    ''
  ).trim();

  let actionsText = '';
  if (Array.isArray(block?.actions) && block.actions.length > 0) {
    actionsText = block.actions.join(', ');
  } else if (typeof block?.actions === 'string') {
    actionsText = block.actions;
  } else if (block?.action_prompt_en) {
    actionsText = String(block.action_prompt_en);
  }

  const visualPtBr = formatVisualPromptToPtBr(rawVisual, actionsText);
  const ambientSoundPtBr = inferAmbientSoundPtBr(block, context, rawVisual, actionsText);

  const dialogueVal = (
    block?.dialogue_pt_br ||
    block?.dialogue_pt ||
    block?.narration_pt_br ||
    block?.narration_pt ||
    block?.dialogue ||
    block?.text ||
    ''
  ).trim();

  let falaText = '';
  const hasSpeech = dialogueVal &&
    dialogueVal !== '[Sem Áudio]' &&
    !dialogueVal.toLowerCase().includes('sem áudio') &&
    dialogueVal !== '...';

  if (hasSpeech) {
    const cleanedSpeech = dialogueVal.replace(/^["'“«]+|["'”»]+$/g, '').trim();
    falaText = `"${cleanedSpeech}"`;
  } else {
    falaText = '[Sem fala]';
  }

  const productLockPtBr = getProductLockPtBr(block, context);

  let result = `VISUAL:\n${visualPtBr}\n\nSOM AMBIENTE:\n${ambientSoundPtBr}\n\nFALA:\n${falaText}`;

  if (productLockPtBr) {
    result += `\n\nTRAVA DO PRODUTO:\n${productLockPtBr}`;
  }

  return result;
}

/**
 * Builds a comprehensive English prompt combining visual context, actions, realism,
 * human behavior, camera behavior, environment consistency, product lock, and negative prompt.
 */
export function buildFullEnrichedPrompt(block: any, realismLayer: RealismStabilityLayerResult): string {
  const visual = block?.visual_context_en || block?.visual_prompt_en || block?.visual_prompt || block?.description || '';
  const actionsList = Array.isArray(block?.actions)
    ? block.actions.join(', ')
    : (block?.actions || block?.action_prompt_en || '');

  const parts = [
    visual ? `VISUAL CONTEXT: ${visual}` : '',
    actionsList ? `ACTIONS: ${actionsList}` : '',
    `REALISM LAYER: ${realismLayer.realism_layer_en}`,
    `HUMAN BEHAVIOR: ${realismLayer.human_behavior_en}`,
    `CAMERA BEHAVIOR: ${realismLayer.camera_behavior_en}`,
    `ENVIRONMENT CONSISTENCY: ${realismLayer.environment_consistency_en}`,
    `PRODUCT INTEGRITY LOCK: ${realismLayer.product_integrity_lock_en}`,
    `NEGATIVE PROMPT: ${realismLayer.negative_prompt_en}`
  ].filter(Boolean);

  return parts.join('\n\n');
}

/**
 * Enriches a single scene block with all required fields from the Reverse Engineering schema.
 */
export function enrichSceneBlock(block: any, idx: number = 0, context?: any): EnrichedSceneBlock {
  const realismLayer = buildRealismStabilityLayer({ ...block, ...context });
  
  const visualVal = block?.visual_context_en || block?.visual_prompt_en || block?.visual_prompt || block?.description || '';
  const actionsVal = Array.isArray(block?.actions)
    ? block.actions
    : (block?.actions ? [String(block.actions)] : (block?.action_prompt_en ? [String(block.action_prompt_en)] : []));
  
  const dialogueVal = block?.dialogue_pt_br || block?.dialogue_pt || block?.narration_pt_br || block?.narration_pt || block?.text || block?.dialogue || '';

  const flowMinimal = block?.flow_minimal_prompt_pt_br || buildFlowMinimalPrompt(block, context);
  const flowThreeLayer = block?.flow_three_layer_prompt_pt_br || buildFlowThreeLayerPrompt(block, context);
  const fullEnriched = block?.full_enriched_prompt_en || buildFullEnrichedPrompt(block, realismLayer);

  const detectedGender = (context?.creatorGender === 'Female' || context?.creatorGender === 'female')
    ? 'female'
    : (context?.creatorGender === 'Male' || context?.creatorGender === 'male')
      ? 'male'
      : undefined;

  const ageStyle = (context?.creatorAge === 'Young Adult' || context?.creatorAge === 'young')
    ? 'young'
    : (context?.creatorAge === 'Adult' || context?.creatorAge === 'Mature Adult' || context?.creatorAge === 'adult')
      ? 'adult'
      : undefined;

  const voiceProfile = context?.voiceProfile || DEFAULT_VOICE_PROFILE;
  const voiceDesc = buildVoiceDescription(voiceProfile, { detectedGender, ageStyle });

  return {
    ...block,
    block_id: block?.block_id || (idx + 1),
    scene_name: block?.scene_name || `SCENE ${idx + 1}`,
    estimated_time: block?.estimated_time || block?.duration || 'Auto',
    visual_context_en: visualVal,
    visual_prompt_en: block?.visual_prompt_en || visualVal,
    actions: actionsVal,
    voice_description_en: voiceDesc,
    dialogue_pt_br: dialogueVal,
    voice_language: block?.voice_language || 'pt-BR',
    creator_profile: block?.creator_profile || '',
    realism_layer_en: block?.realism_layer_en || realismLayer.realism_layer_en,
    human_behavior_en: block?.human_behavior_en || realismLayer.human_behavior_en,
    camera_behavior_en: block?.camera_behavior_en || realismLayer.camera_behavior_en,
    environment_consistency_en: block?.environment_consistency_en || realismLayer.environment_consistency_en,
    product_integrity_lock_en: block?.product_integrity_lock_en || realismLayer.product_integrity_lock_en,
    negative_prompt_en: block?.negative_prompt_en || realismLayer.negative_prompt_en,
    flow_minimal_prompt_pt_br: flowMinimal,
    flow_three_layer_prompt_pt_br: flowThreeLayer,
    full_enriched_prompt_en: fullEnriched
  };
}

/**
 * Enriches an entire Reverse Engineering result object (all structures/blocks).
 */
export function enrichReverseEngineeringResult(result: any, context?: any): any {
  if (!result || typeof result !== 'object') return result;

  const copy = { ...result };

  const enrichStructure = (arr: any[]) => {
    if (!Array.isArray(arr)) return arr;
    return arr.map((block, idx) => enrichSceneBlock(block, idx, context));
  };

  if (Array.isArray(copy.veo_structure)) {
    copy.veo_structure = enrichStructure(copy.veo_structure);
  }
  if (Array.isArray(copy.sora_structure)) {
    copy.sora_structure = enrichStructure(copy.sora_structure);
  }
  if (Array.isArray(copy.grok_structure)) {
    copy.grok_structure = enrichStructure(copy.grok_structure);
  }
  if (Array.isArray(copy.blocks)) {
    copy.blocks = enrichStructure(copy.blocks);
  }

  return copy;
}
