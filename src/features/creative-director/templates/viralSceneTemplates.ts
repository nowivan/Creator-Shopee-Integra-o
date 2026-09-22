/**
 * Fixed Scene Template Builders for Ideador Viral → Creative Director Handoff
 * 
 * Injects concise, high-retention Ideador Viral ingredients into deterministic, 
 * flow-ready 8-second scene blocks tailored for AI video models (Veo 3, Sora, Runway, Kling).
 * 
 * ZERO AI CALLS. 100% Deterministic & Instant.
 */

export type ViralSpeechMode =
  | 'ON_CAMERA_DIALOGUE'
  | 'VOICE_OVER_EXTERNAL'
  | 'NO_DIALOGUE';

export type ViralExecutionStyle =
  | 'tiktok_shop'
  | 'ugc_organic'
  | 'storytelling_cinematic'
  | 'quick_sales';

export type ViralTargetAi =
  | 'veo3'
  | 'sora'
  | 'runway_gen3'
  | 'kling'
  | 'universal';

export interface ViralTemplateContext {
  idea: {
    niche: string;
    title: string;
    angle: string;
    hook: string;
    sceneConcept: string;
    productUse: string;
    cta: string;
    suggestedVisualPromptEn: string;
    dialoguePtBr: string;
    why: string;
  };
  productName: string;
  productCategory: string;
  objectLockPrompt?: string;
  executionStyle: ViralExecutionStyle;
  speechMode: ViralSpeechMode;
  targetAi: ViralTargetAi;
  totalScenes: 3 | 4 | 5;
  avatarVisualDna?: string;
  negativePromptPreset?: string;
  userCustomNotes?: string;
}

export interface FlowReadySceneBlock {
  sceneIndex: number;
  sceneName: string;
  objective: string;
  durationSeconds: 8;
  timingBlocks: {
    label: '0-2s' | '2-4s' | '4-6s' | '6-8s';
    direction: string;
  }[];
  visualDirection: string;
  spokenDialogue: string;
  audioSyncNotes: string;
  startFramePrompt: string;
  endFramePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  continuityLock: string;
}

// ============================================================================
// Internal Pure Helpers for Composition
// ============================================================================

function cleanText(text?: string): string {
  return (text || '').trim().replace(/\s+/g, ' ');
}

/**
 * Truncates text to maxChars cleanly without ellipses ("...").
 * Prefers ending at the last complete sentence, comma, or safe word boundary.
 */
function truncateChars(text: string, maxChars: number): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxChars) return cleaned;

  const sliced = cleaned.slice(0, maxChars);

  // 1. Try to find the last complete sentence ending (. ! ?)
  const lastSentenceEnd = Math.max(
    sliced.lastIndexOf('.'),
    sliced.lastIndexOf('!'),
    sliced.lastIndexOf('?')
  );

  if (lastSentenceEnd > maxChars * 0.45) {
    return sliced.slice(0, lastSentenceEnd + 1).trim();
  }

  // 2. Try to cut at the last comma or semicolon
  const lastClauseEnd = Math.max(
    sliced.lastIndexOf(','),
    sliced.lastIndexOf(';')
  );

  if (lastClauseEnd > maxChars * 0.55) {
    const clause = sliced.slice(0, lastClauseEnd).trim();
    return clause ? `${clause}.` : sliced.trim();
  }

  // 3. Fallback: cut at the last clean word boundary and close safely
  const lastSpace = sliced.lastIndexOf(' ');
  const wordBounded = lastSpace > 0 ? sliced.slice(0, lastSpace).trim() : sliced.trim();
  
  // Clean trailing punctuation
  const trimmedPunctuation = wordBounded.replace(/[,;:\-–—\s]+$/, '');
  if (!/[.!?]$/.test(trimmedPunctuation)) {
    return `${trimmedPunctuation}.`;
  }
  return trimmedPunctuation;
}

function getStyleModifier(style: ViralExecutionStyle): string {
  switch (style) {
    case 'tiktok_shop':
      return 'fast-paced TikTok Shop aesthetic, engaging native creator vibe, high buyer intent, crisp product interaction';
    case 'ugc_organic':
      return 'authentic everyday UGC creator style, casual smartphone recording, raw and relatable atmosphere';
    case 'storytelling_cinematic':
      return 'cinematic UGC documentary tone, soft natural room lighting, deliberate pacing, premium aesthetic';
    case 'quick_sales':
      return 'direct-response product focus, high dynamic clarity, punchy presentation, practical benefit showcase';
    default:
      return 'authentic smartphone UGC aesthetic, realistic creator recording';
  }
}

function getAiOptimization(ai: ViralTargetAi): string {
  switch (ai) {
    case 'veo3':
      return 'Google Veo 3 native cinematic fidelity, 1080x1920 vertical composition, photorealistic textures, perfect physical interaction';
    case 'sora':
      return 'OpenAI Sora physical world simulation, accurate depth of field, natural motion coherence, realistic human physics';
    case 'runway_gen3':
      return 'Runway Gen-3 Alpha photoreal realism, precise handheld camera path, natural lighting transitions';
    case 'kling':
      return 'Kling AI high-precision motion tracking, stable limbs, ultra-crisp product edges';
    case 'universal':
    default:
      return 'ultra-realistic 9:16 vertical smartphone camera video, 60fps look, photorealistic details';
  }
}

function formatSpokenText(rawDialogue: string, speechMode: ViralSpeechMode, maxOnCamera = 115, maxVoiceOver = 160): string {
  if (speechMode === 'NO_DIALOGUE') {
    return '';
  }
  const cleaned = cleanText(rawDialogue);
  if (!cleaned) return '';

  if (speechMode === 'ON_CAMERA_DIALOGUE') {
    return truncateChars(cleaned, maxOnCamera);
  }
  return truncateChars(cleaned, maxVoiceOver);
}

function buildBaseNegativePrompt(context: ViralTemplateContext, extraSpecifics = ''): string {
  const base = [
    'product deformation',
    'duplicated product',
    'missing product',
    'distorted packaging',
    'wrong product color or shape',
    'invented UI elements',
    'fake buttons',
    'cart icons',
    'subtitles',
    'watermark',
    'CGI look',
    'cartoon 3D render',
    'distorted hands or fingers',
    'extra limbs',
    'unnatural facial distortion',
    'jump cuts',
    'digital zoom',
    'glitchy transitions',
    'overexposed glossy advertising studio lighting',
  ];

  if (context.speechMode === 'NO_DIALOGUE') {
    base.push('mouth moving as if speaking', 'talking head monologue');
  }

  if (context.negativePromptPreset) {
    base.push(cleanText(context.negativePromptPreset));
  }

  if (extraSpecifics) {
    base.push(extraSpecifics);
  }

  return base.filter(Boolean).join(', ');
}

function buildContinuityLock(context: ViralTemplateContext): string {
  const parts: string[] = [];
  if (context.productName) {
    parts.push(`Product Lock: Exactly "${context.productName}"${context.objectLockPrompt ? ` (${context.objectLockPrompt})` : ''} with identical scale, labels, and physical form`);
  }
  if (context.avatarVisualDna) {
    parts.push(`Actor Lock: ${context.avatarVisualDna}`);
  }
  parts.push('Camera & Lighting: Constant natural lighting, consistent environment, continuous 8-second physical realism');
  return parts.join(' | ');
}

// ============================================================================
// Scene 1: Hook / Scroll Stopper Template Builder
// ============================================================================

export function buildScene1HookTemplate(context: ViralTemplateContext): FlowReadySceneBlock {
  const { idea, productName, speechMode, executionStyle, targetAi } = context;
  const styleMod = getStyleModifier(executionStyle);
  const aiMod = getAiOptimization(targetAi);
  const continuity = buildContinuityLock(context);

  const rawDialogue = idea.hook || idea.dialoguePtBr || '';
  const spokenText = formatSpokenText(rawDialogue, speechMode, 115, 150);

  const visualConcept = cleanText(idea.sceneConcept) || `Creator immediately addresses camera holding ${productName || 'the product'}`;
  const angleInfo = cleanText(idea.angle) || 'Pattern Interrupt';
  const objectDesc = context.objectLockPrompt ? `Featuring ${context.objectLockPrompt}.` : (productName ? `Featuring ${productName}.` : '');

  const visualDir = `Immediate visual hook within the first 0–3 seconds (${angleInfo}). ${visualConcept}. Handheld smartphone camera motion captures the immediate reaction in a realistic living room or kitchen setting. ${objectDesc}`;

  const audioSyncNotes = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator speaks opening hook to camera with natural facial expression: "${spokenText}". Spoken words sync with hand movement between 0s and 3s.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `External voiceover plays during the visual hook: "${spokenText}". Ambient room acoustics only.`
    : 'No speech. Organic ambient sound of real-world environment and immediate physical action.';

  const startFramePrompt = `Vertical 9:16 smartphone photography snapshot of creator in natural room lighting, first frame of visual hook: ${visualConcept}. ${context.avatarVisualDna || 'Authentic Brazilian creator, relatable look'}. ${objectDesc} Photorealistic, 4k.`;
  const endFramePrompt = `Vertical 9:16 smartphone photography snapshot at 8 seconds, transitioning seamlessly from hook to product introduction. ${objectDesc} Natural lighting, cinematic UGC depth.`;

  const speechInstruction = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `The creator looks into the phone camera and says in Brazilian Portuguese: "${spokenText}". Perfect lip-sync.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Accompanying off-screen narration in Brazilian Portuguese: "${spokenText}".`
    : 'Ambient sound only, silent mouth.';

  const videoPrompt = `Vertical 9:16 smartphone UGC video, exactly 8 seconds continuous single take. ${styleMod}. ${aiMod}. Scene 1 Hook: ${visualConcept}. ${objectDesc} Realistic handheld camera slight wobble, natural eye-level autofocus. ${speechInstruction} ${continuity}.`;

  const negativePrompt = buildBaseNegativePrompt(context, 'slow start, calm boring intro, text overlays on screen');

  return {
    sceneIndex: 1,
    sceneName: 'Cena 1: Hook / Interrupção de Padrão',
    objective: `Prender a atenção nos primeiros 3 segundos usando o ângulo (${angleInfo}) e impedir o scroll.`,
    durationSeconds: 8,
    timingBlocks: [
      {
        label: '0-2s',
        direction: `Interrupção de padrão imediata: ${truncateChars(visualConcept, 100)} Movimento dinâmico em direção à câmera.`,
      },
      {
        label: '2-4s',
        direction: speechMode !== 'NO_DIALOGUE' 
          ? `Entrega da frase principal do gancho falado: "${truncateChars(spokenText, 60)}"` 
          : 'Expressão de curiosidade/surpresa genuína da pessoa ao demonstrar a situação.',
      },
      {
        label: '4-6s',
        direction: `O problema ou contexto da curiosidade se estabelece visualmente. Primeiro vislumbre do ${productName || 'produto'}.`,
      },
      {
        label: '6-8s',
        direction: 'Transição fluida e natural preparando a demonstração de uso do produto na próxima tomada.',
      },
    ],
    visualDirection: visualDir,
    spokenDialogue: spokenText,
    audioSyncNotes,
    startFramePrompt,
    endFramePrompt,
    videoPrompt,
    negativePrompt,
    continuityLock: continuity,
  };
}

// ============================================================================
// Scene 2: Demonstration / Product Use Template Builder
// ============================================================================

export function buildScene2DemoTemplate(context: ViralTemplateContext): FlowReadySceneBlock {
  const { idea, productName, speechMode, executionStyle, targetAi } = context;
  const styleMod = getStyleModifier(executionStyle);
  const aiMod = getAiOptimization(targetAi);
  const continuity = buildContinuityLock(context);

  const productUseText = cleanText(idea.productUse) || `Creator uses ${productName || 'the product'} naturally in real context`;
  const visualSeedEn = cleanText(idea.suggestedVisualPromptEn);
  const objectDesc = context.objectLockPrompt ? `Featuring exact item: ${context.objectLockPrompt}.` : (productName ? `Featuring ${productName}.` : '');

  // Extract demonstration sentence: derive speech directly from productUse (never why)
  let dialogueSource = cleanText(idea.dialoguePtBr);
  if (!dialogueSource || dialogueSource.length > 180) {
    if (idea.productUse) {
      dialogueSource = `Olha como é prático: ${idea.productUse.charAt(0).toLowerCase() + idea.productUse.slice(1)}`;
    } else {
      dialogueSource = `Na prática com ${productName || 'o produto'}, você já sente a diferença no primeiro uso.`;
    }
  }
  const spokenText = formatSpokenText(dialogueSource, speechMode, 115, 160);

  const visualDir = `Close and medium shots showing the product in practical, organic use. ${productUseText}. Real tactile interaction with hands, showing physical textures and immediate function. ${objectDesc}`;

  const audioSyncNotes = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator speaks while demonstrating: "${spokenText}". Hand movements match words between 2s and 6s.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Voiceover describes practical benefit: "${spokenText}". Hands perform action synchronously.`
    : 'Ambient sound of physical product handling (clicks, textures, real audio).';

  const startFramePrompt = `Vertical 9:16 smartphone photography snapshot at 0s of Scene 2: Close-up on hands and ${productName || 'product'} starting demonstration. ${objectDesc} Natural soft lighting, real skin textures.`;
  const endFramePrompt = `Vertical 9:16 smartphone photography snapshot at 8s of Scene 2: Result of product use clearly visible in creator hands. ${objectDesc} Satisfied mood.`;

  const speechInstruction = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator naturally talks while showing product in Brazilian Portuguese: "${spokenText}". Realistic lip sync.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Voice-over narration in Brazilian Portuguese: "${spokenText}".`
    : 'No speech, natural product tactile sounds.';

  const videoPrompt = `Vertical 9:16 smartphone UGC video, exactly 8 seconds continuous single take. ${styleMod}. ${aiMod}. Scene 2 Demonstration: ${productUseText}. ${visualSeedEn ? `Visual specifics: ${visualSeedEn}.` : ''} ${objectDesc} Crisp autofocus on product details, handheld macro to medium transition. ${speechInstruction} ${continuity}.`;

  const negativePrompt = buildBaseNegativePrompt(context, 'static infomercial pose, studio product stand, 3D exploded view');

  return {
    sceneIndex: 2,
    sceneName: 'Cena 2: Demonstração / Uso Orgânico',
    objective: `Demonstrar o produto em ação orgânica (${productName || 'produto'}), provando o benefício prático sem parecer comercial tradicional.`,
    durationSeconds: 8,
    timingBlocks: [
      {
        label: '0-2s',
        direction: `Introduzir o produto em contexto de uso real: ${truncateChars(productUseText, 90)}`,
      },
      {
        label: '2-4s',
        direction: 'Ação principal com o produto (abrir, aplicar, vestir ou acionar com as mãos em close).',
      },
      {
        label: '4-6s',
        direction: 'O benefício prático torna-se visível e evidente na tela com reação de facilidade/conforto.',
      },
      {
        label: '6-8s',
        direction: 'Resultado prático obtido, mostrando o produto em pleno funcionamento estável.',
      },
    ],
    visualDirection: visualDir,
    spokenDialogue: spokenText,
    audioSyncNotes,
    startFramePrompt,
    endFramePrompt,
    videoPrompt,
    negativePrompt,
    continuityLock: continuity,
  };
}

// ============================================================================
// Scene 3: Payoff / CTA Template Builder
// ============================================================================

export function buildScene3CtaTemplate(context: ViralTemplateContext): FlowReadySceneBlock {
  const { idea, productName, speechMode, executionStyle, targetAi } = context;
  const styleMod = getStyleModifier(executionStyle);
  const aiMod = getAiOptimization(targetAi);
  const continuity = buildContinuityLock(context);

  const ctaText = cleanText(idea.cta) || 'Clica no link da bio ou no carrinho para garantir o seu!';
  const whyText = cleanText(idea.why);
  const objectDesc = context.objectLockPrompt ? `Holding exact item: ${context.objectLockPrompt}.` : (productName ? `Holding ${productName}.` : '');

  const spokenText = formatSpokenText(ctaText, speechMode, 105, 140);

  const visualDir = `Creator holds ${productName || 'the product'} with genuine confidence, smiling subtly and directing attention naturally to the action point. During the final 3 seconds, the creator keeps the product in primary focus at chest level, looks directly into the lens with a confident natural smile, and makes one subtle downward gesture only if the CTA references the cart or link. No fake UI, no button, no cart icon, no overlay. Clean, credible payoff (${truncateChars(whyText, 80)}). ${objectDesc}`;

  const audioSyncNotes = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator delivers call-to-action directly to viewer: "${spokenText}". Direct eye contact between 4s and 8s.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `External narration concludes with direct CTA: "${spokenText}".`
    : 'No speech. Reassuring ambient music vibe and clear visual product presentation.';

  const startFramePrompt = `Vertical 9:16 smartphone photography snapshot at 0s of Scene 3: Creator holding ${productName || 'product'} with genuine approval. ${objectDesc} Natural warm room light.`;
  const endFramePrompt = `Vertical 9:16 smartphone photography snapshot at 8s of Scene 3: Final confident closing frame with clear product visibility and friendly smile. ${objectDesc}`;

  const speechInstruction = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `The creator delivers closing CTA in Brazilian Portuguese: "${spokenText}". Authentic lip sync.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Voice-over closing CTA in Brazilian Portuguese: "${spokenText}".`
    : 'Ambient sound only.';

  const videoPrompt = `Vertical 9:16 smartphone UGC video, exactly 8 seconds continuous single take. ${styleMod}. ${aiMod}. Scene 3 CTA Payoff: Creator presents ${productName || 'product'} with genuine satisfaction and delivers closing invitation. During the final 3 seconds, the creator keeps the product in primary focus at chest level, looks directly into the lens with a confident natural smile, and makes one subtle downward gesture only if the CTA references the cart or link. No fake UI, no button, no cart icon, no overlay. ${objectDesc} Eye contact with phone camera, natural handheld movement. ${speechInstruction} ${continuity}.`;

  const negativePrompt = buildBaseNegativePrompt(context, 'fake discount tags, fake countdown timer, fake buy now buttons, popups');

  return {
    sceneIndex: 3,
    sceneName: 'Cena 3: Payoff / Chamada para Ação',
    objective: 'Consolidar o valor e direcionar o espectador para a ação de compra ou visita sem apelos falsos de escassez.',
    durationSeconds: 8,
    timingBlocks: [
      {
        label: '0-2s',
        direction: `Produto claramente visível em mãos com setup do payoff: ${objectDesc || 'visão clara do item'}.`,
      },
      {
        label: '2-4s',
        direction: 'Reforço do motivo principal de satisfação e confiança do produto.',
      },
      {
        label: '4-6s',
        direction: speechMode !== 'NO_DIALOGUE'
          ? `Início da frase de CTA falada com entusiasmo natural: "${truncateChars(spokenText, 45)}"`
          : 'Gesto natural convidativo e sorriso confiante para a câmera.',
      },
      {
        label: '6-8s',
        direction: 'Fechamento do vídeo com o produto em destaque nítido no peito, sorriso autêntico e olhar direto.',
      },
    ],
    visualDirection: visualDir,
    spokenDialogue: spokenText,
    audioSyncNotes,
    startFramePrompt,
    endFramePrompt,
    videoPrompt,
    negativePrompt,
    continuityLock: continuity,
  };
}

// ============================================================================
// Scene 4: Proof / Result Template Builder (Optional: 4 or 5 scenes)
// ============================================================================

export function buildScene4ProofTemplate(context: ViralTemplateContext): FlowReadySceneBlock {
  const { idea, productName, speechMode, executionStyle, targetAi } = context;
  const styleMod = getStyleModifier(executionStyle);
  const aiMod = getAiOptimization(targetAi);
  const continuity = buildContinuityLock(context);

  const proofContext = cleanText(idea.why) || cleanText(idea.angle) || 'Social proof and visible transformation';
  const objectDesc = context.objectLockPrompt ? `Featuring ${context.objectLockPrompt}.` : (productName ? `Featuring ${productName}.` : '');

  const dialogueProof = `Olha a diferença real que faz no dia a dia com ${productName || 'esse produto'}.`;
  const spokenText = formatSpokenText(dialogueProof, speechMode, 110, 150);

  const visualDir = `Proof and result demonstration. Side-by-side or immediate before-and-after comparison showing the concrete result delivered by ${productName || 'the product'}. Real lighting, no artificial retouching. ${objectDesc}`;

  const audioSyncNotes = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator highlights the visible proof: "${spokenText}". Spoken between 2s and 6s.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Narration emphasizes authentic result: "${spokenText}".`
    : 'Ambient room sound and tactile product sounds.';

  const startFramePrompt = `Vertical 9:16 smartphone photography snapshot at 0s of Proof Scene: Detailed focus on the tangible result of ${productName || 'product'}. ${objectDesc} Natural realistic textures.`;
  const endFramePrompt = `Vertical 9:16 smartphone photography snapshot at 8s of Proof Scene: Full view of creator admiring the finished result with satisfaction.`;

  const speechInstruction = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator remarks in Brazilian Portuguese: "${spokenText}". Accurate lip sync.`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Narration in Brazilian Portuguese: "${spokenText}".`
    : 'No spoken dialogue.';

  const videoPrompt = `Vertical 9:16 smartphone UGC video, exactly 8 seconds continuous single take. ${styleMod}. ${aiMod}. Scene Proof/Result: Concrete evidence of benefit (${proofContext.slice(0, 100)}). ${objectDesc} Natural camera tilt, genuine reaction, handheld realism. ${speechInstruction} ${continuity}.`;

  const negativePrompt = buildBaseNegativePrompt(context, 'exaggerated medical claims, fake lab diagrams, CGI overlays');

  return {
    sceneIndex: 4,
    sceneName: 'Cena 4: Prova / Resultado Prático',
    objective: 'Eliminar qualquer objeção final demonstrando o resultado tangível e a transformação prática.',
    durationSeconds: 8,
    timingBlocks: [
      {
        label: '0-2s',
        direction: 'Foco imediato no detalhe do resultado obtido ou estado transformado.',
      },
      {
        label: '2-4s',
        direction: 'Comparação sutil de facilidade / qualidade em relação ao método antigo.',
      },
      {
        label: '4-6s',
        direction: 'Expressão de alívio e satisfação genuína com o uso contínuo.',
      },
      {
        label: '6-8s',
        direction: 'Consolidação da prova com o produto em primeiro plano nítido.',
      },
    ],
    visualDirection: visualDir,
    spokenDialogue: spokenText,
    audioSyncNotes,
    startFramePrompt,
    endFramePrompt,
    videoPrompt,
    negativePrompt,
    continuityLock: continuity,
  };
}

// ============================================================================
// Scene 5: Closing Shot / Final CTA Template Builder (Optional: 5 scenes)
// ============================================================================

export function buildScene5ClosingTemplate(context: ViralTemplateContext): FlowReadySceneBlock {
  const { idea, productName, speechMode, executionStyle, targetAi } = context;
  const styleMod = getStyleModifier(executionStyle);
  const aiMod = getAiOptimization(targetAi);
  const continuity = buildContinuityLock(context);

  const closingText = cleanText(idea.cta) || `Aproveita e confere ${productName || 'todos os detalhes'} no link direto!`;
  const spokenText = formatSpokenText(closingText, speechMode, 100, 130);
  const objectDesc = context.objectLockPrompt ? `Hero packshot of ${context.objectLockPrompt}.` : (productName ? `Hero packshot of ${productName}.` : '');

  const visualDir = `Hero closing shot of ${productName || 'the product'} in clean, aesthetic real-world setting (desk, shelf, or hands). Warm natural ambient glow, crisp packaging details, calm confident closing atmosphere. ${objectDesc}`;

  const audioSyncNotes = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator finishes with friendly closing gesture and says: "${spokenText}".`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Final audio call: "${spokenText}".`
    : 'Peaceful ambient audio fade.';

  const startFramePrompt = `Vertical 9:16 smartphone photography snapshot at 0s of Final Closing: Aesthetic hero arrangement of ${productName || 'product'} in authentic room setting. ${objectDesc} Cinematic UGC lighting.`;
  const endFramePrompt = `Vertical 9:16 smartphone photography snapshot at 8s of Final Closing: Final perfectly focused frame with product front and center.`;

  const speechInstruction = speechMode === 'ON_CAMERA_DIALOGUE'
    ? `Creator delivers final friendly sign-off in Brazilian Portuguese: "${spokenText}".`
    : speechMode === 'VOICE_OVER_EXTERNAL'
    ? `Voiceover sign-off in Brazilian Portuguese: "${spokenText}".`
    : 'Ambient sound only.';

  const videoPrompt = `Vertical 9:16 smartphone UGC video, exactly 8 seconds continuous single take. ${styleMod}. ${aiMod}. Scene 5 Closing Hero Shot: Elegant hero close-up on ${productName || 'the product'} with organic lifestyle backdrop. ${objectDesc} Subtle camera slow drift, soft natural light, pristine physical finish. ${speechInstruction} ${continuity}.`;

  const negativePrompt = buildBaseNegativePrompt(context, 'blurry product packaging, distorted brand name, abrupt cutoff');

  return {
    sceneIndex: 5,
    sceneName: 'Cena 5: Packshot Final / Fechamento Hero',
    objective: 'Gravar a imagem hero do produto na memória do espectador nos segundos finais.',
    durationSeconds: 8,
    timingBlocks: [
      {
        label: '0-2s',
        direction: `Apresentação hero do ${productName || 'produto'} em repouso estético.`,
      },
      {
        label: '2-4s',
        direction: 'Movimento sutil e suave de câmera revelando os detalhes do acabamento.',
      },
      {
        label: '4-6s',
        direction: 'Última lembrança amigável da chamada para ação.',
      },
      {
        label: '6-8s',
        direction: 'Frame final limpo, nítido e estável pronto para o loop do vídeo.',
      },
    ],
    visualDirection: visualDir,
    spokenDialogue: spokenText,
    audioSyncNotes,
    startFramePrompt,
    endFramePrompt,
    videoPrompt,
    negativePrompt,
    continuityLock: continuity,
  };
}

// ============================================================================
// Master Compiler: compileViralIdeaToScenes
// ============================================================================

/**
 * Compiles a ViralTemplateContext into sequential 8-second FlowReadySceneBlocks.
 * 
 * Scene sequencing rules:
 * - 3 scenes: Scene 1 (Hook), Scene 2 (Demo), Scene 3 (CTA)
 * - 4 scenes: Scene 1 (Hook), Scene 2 (Demo), Scene 4 (Proof), Scene 3 (CTA)
 * - 5 scenes: Scene 1 (Hook), Scene 2 (Demo), Scene 4 (Proof), Scene 3 (CTA), Scene 5 (Closing)
 * 
 * Scene indices are guaranteed sequential (1..N).
 */
export function compileViralIdeaToScenes(context: ViralTemplateContext): FlowReadySceneBlock[] {
  const scene1 = buildScene1HookTemplate(context);
  const scene2 = buildScene2DemoTemplate(context);
  const scene3 = buildScene3CtaTemplate(context);

  if (context.totalScenes === 3) {
    return [
      { ...scene1, sceneIndex: 1 },
      { ...scene2, sceneIndex: 2 },
      { ...scene3, sceneIndex: 3 },
    ];
  }

  const scene4Proof = buildScene4ProofTemplate(context);

  if (context.totalScenes === 4) {
    return [
      { ...scene1, sceneIndex: 1 },
      { ...scene2, sceneIndex: 2 },
      { ...scene4Proof, sceneIndex: 3, sceneName: 'Cena 3: Prova / Resultado Prático' },
      { ...scene3, sceneIndex: 4, sceneName: 'Cena 4: Payoff / Chamada para Ação' },
    ];
  }

  const scene5Closing = buildScene5ClosingTemplate(context);

  return [
    { ...scene1, sceneIndex: 1 },
    { ...scene2, sceneIndex: 2 },
    { ...scene4Proof, sceneIndex: 3, sceneName: 'Cena 3: Prova / Resultado Prático' },
    { ...scene3, sceneIndex: 4, sceneName: 'Cena 4: Payoff / Chamada para Ação' },
    { ...scene5Closing, sceneIndex: 5, sceneName: 'Cena 5: Packshot Final / Fechamento Hero' },
  ];
}
