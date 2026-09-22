import { PromptVaultItem } from '../prompt-vault/types';
import { createPromptVaultItem } from '../prompt-vault/promptVaultStorage';
import {
  BrandMarkProfile,
  renderBrandMarkVideoPrompt,
  isBrandMarkActive
} from '../visual-reference-engine';

export type VideoEditCategory = 'scene_edit' | 'subject_edit' | 'style_finish';

export type VideoEditModeId =
  | 'CINEMATIC_UPGRADE'
  | 'BACKGROUND_REPLACEMENT'
  | 'OBJECT_REMOVAL'
  | 'OBJECT_REPLACEMENT'
  | 'OUTFIT_CHANGE'
  | 'ACTION_EFFECTS'
  | 'CAMERA_ANGLE_CHANGE'
  | 'PRODUCT_ADVERTISEMENT_EDIT'
  | 'STYLE_TRANSFER';

export type VideoEditTextMode = 'no_text' | 'with_text' | 'reserved_space_no_text';

export interface VideoEditModeOption {
  id: VideoEditModeId;
  labelPt: string;
  category: VideoEditCategory;
  icon: string;
  badge?: string;
  shortDescriptionPt: string;
  descriptionPt: string;
  fieldLabels: {
    targetEditLabel: string;
    targetEditPlaceholder: string;
    secondaryLabel?: string;
    secondaryPlaceholder?: string;
  };
  defaultTechnicalDirectives: string;
}

export const GLOBAL_PRESERVATION_LOCK = `GLOBAL PRESERVATION LOCK:
Preserve original video elements unless explicitly instructed to change. Maintain exact subject identity, face geometry, hairstyle, skin tone, bodily proportions, product dimensions, core motion dynamics, temporal consistency between frames, and physics fidelity. Do not introduce unauthorized morphing, distorted limbs, blurry brand labels, or invented artifacts.`;

export const FACE_AND_IDENTITY_LOCK = `FACE & IDENTITY LOCK:
Treat the person's identity as a locked visual region.

Preserve exactly:
- facial structure
- facial proportions
- eyes
- eyebrows
- nose
- mouth
- jawline
- skin tone
- hairstyle
- apparent age
- facial expressions
- distinctive facial features
- natural skin texture

Maintain the same person consistently across:
- every frame
- movement
- lighting changes
- camera angle changes
- close-ups
- profile views
- partial occlusion
- motion blur situations

Do not:
- beautify
- smooth skin excessively
- reshape the face
- replace the face
- age or de-age
- change facial proportions
- change hairstyle unintentionally
- alter distinctive facial features
- alter expressions unintentionally

Avoid:
identity drift,
face drift,
facial morphing,
beautification,
face replacement,
plastic skin,
skin over-smoothing,
inconsistent age,
expression drift,
facial geometry changes,
frame-to-frame identity inconsistency.

Only modify the explicitly requested edit target.`;

/** Person-based video edit modes that automatically receive Face & Identity Lock */
export const PERSON_BASED_VIDEO_MODES: VideoEditModeId[] = [
  'CINEMATIC_UPGRADE',
  'BACKGROUND_REPLACEMENT',
  'OUTFIT_CHANGE',
  'ACTION_EFFECTS',
  'CAMERA_ANGLE_CHANGE',
  'STYLE_TRANSFER',
];

/**
 * Builds the canonical Presenter Brand Mark lock for Video Extension and Edit modes if configured.
 */
export function buildVideoPresenterBrandMarkLock(brandMark?: BrandMarkProfile | null): string {
  if (!isBrandMarkActive(brandMark)) return '';
  return renderBrandMarkVideoPrompt(brandMark);
}

export const STYLE_TRANSFER_PRESETS: string[] = [
  '1970s vintage film',
  'cinematic noir',
  'clean premium',
  'luxury editorial',
  'black & gold premium',
  'retro VHS',
  'soft beauty commercial',
  'high-fashion campaign',
  'futuristic minimal',
  'analog film look',
];

export const VIDEO_EDIT_CATEGORIES: { id: VideoEditCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos os Modos (9)', icon: 'layers' },
  { id: 'scene_edit', label: 'Edição de Cena (3)', icon: 'clapperboard' },
  { id: 'subject_edit', label: 'Edição de Sujeito (3)', icon: 'user' },
  { id: 'style_finish', label: 'Estilo & Acabamento (3)', icon: 'palette' },
];

export const VIDEO_EDIT_MODES: VideoEditModeOption[] = [
  // Scene Edit
  {
    id: 'BACKGROUND_REPLACEMENT',
    labelPt: 'Troca de Cenário / Fundo',
    category: 'scene_edit',
    icon: 'image',
    badge: 'Inpainting Fundo',
    shortDescriptionPt: 'Substitui o fundo ou ambiente preservando o sujeito, produto, iluminação de contorno e movimento natural.',
    descriptionPt: 'Troca o ambiente mantendo perfeita harmonia de contato, oclusão, reflexos e sombras do modelo com o novo espaço.',
    fieldLabels: {
      targetEditLabel: 'Novo Cenário / Ambiente Alvo',
      targetEditPlaceholder: 'Ex: Modern minimalist loft with floor-to-ceiling windows and sunbeams, marble kitchen countertop, luxury boutique interior...',
      secondaryLabel: 'Harmonização de Luz / Reflexos',
      secondaryPlaceholder: 'Ex: Match natural directional daylight, soft ambient bounce on subject edges...',
    },
    defaultTechnicalDirectives: 'Seamless background environment replacement. Clean subject rotoscoping, preserve exact hair silhouette, body contours, clothing edges, and motion trajectory. Cast realistic contact shadows and directional bounce light corresponding to the new environment.',
  },
  {
    id: 'OBJECT_REMOVAL',
    labelPt: 'Remoção de Objeto',
    category: 'scene_edit',
    icon: 'eraser',
    badge: 'Limpeza Vídeo',
    shortDescriptionPt: 'Remove elementos indesejados, fios, placas ou objetos do plano com preenchimento temporal perfeito.',
    descriptionPt: 'Inpainting generativo de vídeo que apaga objetos intrusivos sem criar borrões, distorções ou inconsistências quadro a quadro.',
    fieldLabels: {
      targetEditLabel: 'Objeto ou Elemento a Remover',
      targetEditPlaceholder: 'Ex: Power lines in background, stray coffee cup on table, background pedestrian, unwanted branding on wall...',
      secondaryLabel: 'Como preencher o espaço liberado',
      secondaryPlaceholder: 'Ex: Seamless background texture match, continuous clean studio wall, natural floor continuity...',
    },
    defaultTechnicalDirectives: 'Clean generative video inpainting object removal. Delete specified target object completely across all frames. Inpaint background texture with frame-to-frame temporal stability, seamless illumination blending, and no ghosting artifacts.',
  },
  {
    id: 'OBJECT_REPLACEMENT',
    labelPt: 'Substituição de Objeto',
    category: 'scene_edit',
    icon: 'replace',
    badge: 'Troca de Prop',
    shortDescriptionPt: 'Substitui um objeto, acessório ou elemento de cena por outro mantendo posição, escala e física.',
    descriptionPt: 'Troca itens específicos do cenário ou das mãos do sujeito mantendo oclusões, interações e iluminação coerentes.',
    fieldLabels: {
      targetEditLabel: 'Objeto Original e Novo Objeto Alvo',
      targetEditPlaceholder: 'Ex: Replace generic mug with luxury ceramic cup with gold rim; Replace plain notebook with sleek silver tablet...',
      secondaryLabel: 'Detalhes Físicos & Materiais do Novo Item',
      secondaryPlaceholder: 'Ex: Matte brushed finish, accurate reflections matching scene lights, natural grip contact...',
    },
    defaultTechnicalDirectives: 'Object replacement in video stream. Substitute source object with target item while matching precise 3D spatial orientation, scale, motion velocity, hand contact points, and scene lighting shadows.',
  },

  // Subject Edit
  {
    id: 'OUTFIT_CHANGE',
    labelPt: 'Troca de Look / Roupa',
    category: 'subject_edit',
    icon: 'shirt',
    badge: 'Virtual Wardrobe',
    shortDescriptionPt: 'Troca o vestuário ou peças do sujeito preservando o corpo, pose, tom de pele e rosto originais.',
    descriptionPt: 'Modificação precisa de look no sujeito do vídeo sem desfigurar anatomia, caimento ou dinâmica corporal.',
    fieldLabels: {
      targetEditLabel: 'Nova Peça ou Look Desejado',
      targetEditPlaceholder: 'Ex: Tailored emerald green blazer over silk shirt; Minimalist black activewear set; Structured linen coat...',
      secondaryLabel: 'Ajuste de Caimento & Tecido',
      secondaryPlaceholder: 'Ex: Natural fabric drape, wrinkle dynamics with motion, exact body silhouette fit...',
    },
    defaultTechnicalDirectives: 'Virtual wardrobe re-rendering on subject. Replace original outfit with specified garment. Preserve subject facial identity, body anatomy, skin tone, hair, natural movement, and posture with realistic garment dynamics.',
  },
  {
    id: 'CAMERA_ANGLE_CHANGE',
    labelPt: 'Mudança de Ângulo de Câmera',
    category: 'subject_edit',
    icon: 'video',
    badge: 'Reenquadramento 3D',
    shortDescriptionPt: 'Reinterpreta a cena com novo ponto de vista ou movimento de câmera consistente no espaço 3D.',
    descriptionPt: 'Gera nova perspectiva de câmera (low angle hero, dynamic orbit, close-up tracking) preservando a coerência volumétrica.',
    fieldLabels: {
      targetEditLabel: 'Novo Ponto de Vista / Movimento de Câmera',
      targetEditPlaceholder: 'Ex: Low-angle dynamic hero perspective moving upward; Smooth 45-degree orbiting camera tracking subject; Macro tight tracking shot...',
      secondaryLabel: 'Composição & Distância Focal',
      secondaryPlaceholder: 'Ex: 35mm wide lens with dramatic perspective, 85mm medium portrait framing...',
    },
    defaultTechnicalDirectives: '3D multi-view re-projection and camera repositioning. Render the scene from the specified camera angle and motion path with strict 3D volumetric consistency, preserving exact subject, product, and scene geometry.',
  },
  {
    id: 'ACTION_EFFECTS',
    labelPt: 'Efeitos & Dinâmica de Ação',
    category: 'subject_edit',
    icon: 'zap',
    badge: 'VFX Dinâmico',
    shortDescriptionPt: 'Adiciona partículas, speed ramping, rastros de luz, vento realista ou efeitos dinâmicos de cena.',
    descriptionPt: 'Insere efeitos visuais cinematográficos que interagem com o movimento do sujeito e do produto de forma orgânica.',
    fieldLabels: {
      targetEditLabel: 'Efeito Visual / Dinâmica Desejada',
      targetEditPlaceholder: 'Ex: Cinematic golden dust particles floating in light shafts, subtle speed ramp on turn, gentle wind blowing model hair and scarf...',
      secondaryLabel: 'Intensidade & Timing do Efeito',
      secondaryPlaceholder: 'Ex: Subtle organic intensity, peaks during the hero reveal, no visual clutter...',
    },
    defaultTechnicalDirectives: 'Integrate dynamic cinematic visual effects and realistic physics. Add specified atmospheric elements (particles, physics, lighting sweeps, subtle motion emphasis) maintaining physical realism and identity preservation.',
  },

  // Style & Finish
  {
    id: 'CINEMATIC_UPGRADE',
    labelPt: 'Upgrade Cinematográfico',
    category: 'style_finish',
    icon: 'film',
    badge: 'Cinema Look',
    shortDescriptionPt: 'Eleva iluminação, color grading, contraste dinâmico e atmosfera 35mm mantendo o vídeo original intacto.',
    descriptionPt: 'Transforma tomadas casuais em produções de alto padrão estético com volumetria de luz, profundidade de campo rasa e paleta cinematográfica.',
    fieldLabels: {
      targetEditLabel: 'Estilo Cinematográfico & Atmosfera Desejada',
      targetEditPlaceholder: 'Ex: 35mm film grain, anamorphic warm golden hour lighting, subtle volumetric haze, Kodak Portra 400 color science...',
      secondaryLabel: 'Diretrizes de Câmera / Lente (Opcional)',
      secondaryPlaceholder: 'Ex: 50mm f/1.4 prime lens bokeh, smooth organic handheld motion...',
    },
    defaultTechnicalDirectives: 'Apply cinematic lighting upgrade, high dynamic range, volumetric lighting, rich shadows, balanced highlights, 35mm cinematic color grade, and optical depth-of-field while preserving exact subject motion and identity.',
  },
  {
    id: 'STYLE_TRANSFER',
    labelPt: 'Transferir Estilo Visual',
    category: 'style_finish',
    icon: 'palette',
    badge: 'Style Transfer',
    shortDescriptionPt: 'Transforme o tratamento visual do vídeo sem alterar identidade, ação, composição ou produto.',
    descriptionPt: 'Transforme o tratamento visual do vídeo sem alterar identidade, ação, composição ou produto.',
    fieldLabels: {
      targetEditLabel: 'Estilo Visual Alvo & Paleta de Cores',
      targetEditPlaceholder: 'Ex: 1970s vintage film, cinematic noir, clean premium, luxury editorial, black & gold premium, retro VHS, soft beauty commercial, high-fashion campaign, futuristic minimal, analog film look...',
      secondaryLabel: 'Tratamento de Luz & Textura Visual (Opcional)',
      secondaryPlaceholder: 'Ex: Warm golden hour rim lighting, subtle 35mm film grain, analog chromatic aberration...',
    },
    defaultTechnicalDirectives: 'Transform the source video visual treatment while maintaining exact subject identity, actions, timing, composition, and product integrity with temporal consistency across every frame.',
  },
  {
    id: 'PRODUCT_ADVERTISEMENT_EDIT',
    labelPt: 'Edição Publicitária de Produto',
    category: 'style_finish',
    icon: 'sparkles',
    badge: 'Comercial E-comm',
    shortDescriptionPt: 'Transforma tomada em comercial de produto com macro reveals, iluminação de luxo e espaço para CTA.',
    descriptionPt: 'Estruturação de ritmo comercial de alta conversão para e-commerce, moda e marketplace, destacando acabamento e benefícios.',
    fieldLabels: {
      targetEditLabel: 'Foco do Comercial & Destaques do Produto',
      targetEditPlaceholder: 'Ex: Premium texture macro zoom, sleek dynamic light sweep highlighting seams, hero product rotation, clean commercial pacing...',
      secondaryLabel: 'Texto / Gancho Comercial Visível (Exato em Português)',
      secondaryPlaceholder: 'Ex: NOVA COLEÇÃO 2026, TOQUE SUAVE & ACABAMENTO PREMIUM...',
    },
    defaultTechnicalDirectives: 'Commercial advertising video edit. Apply high-end e-commerce commercial pacing, hero zoom reveal, macro craftsmanship emphasis, dynamic commercial lighting sweep, clean negative space for overlays, high-conversion visual aesthetic.',
  },
];

export interface VideoEditRequestOptions {
  modeId: VideoEditModeId;
  sourceContext: string;
  targetEditDescription: string;
  secondaryDetails?: string;
  visibleTextPt?: string;
  textMode?: VideoEditTextMode;
  hasPerson?: boolean;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
  targetEngine?: 'google_vids' | 'diffusion_video_model' | 'universal';
  customNegativePrompt?: string;
}

export interface VideoEditPromptResult {
  modeId: VideoEditModeId;
  modeLabelPt: string;
  category: VideoEditCategory;
  titlePt: string;
  aspectRatio: string;
  globalPreservationLock: string;
  faceAndIdentityLock?: string;
  technicalDirectivesEn: string;
  sourceContextSummaryEn: string;
  targetEditInstructionsEn: string;
  visibleTextPtBr?: string;
  masterPromptEn: string;
  googleVidsStructuredPrompt: string;
  negativePromptEn: string;
}

/**
 * Builds the canonical Video Edit Prompt for any of the 9 modes with Global Preservation Lock
 * and automatic Face & Identity Lock for person-based edits.
 * Technical prompt is in English. Visible text (if any) remains strictly in Portuguese.
 */
export function buildVideoEditPrompt(options: VideoEditRequestOptions): VideoEditPromptResult {
  const modeOption = VIDEO_EDIT_MODES.find(m => m.id === options.modeId) || VIDEO_EDIT_MODES[0];
  const aspectRatio = options.aspectRatio || '9:16';
  const sourceContext = (options.sourceContext || 'Source video footage containing human subject / product in action').trim();
  const targetEdit = (options.targetEditDescription || '').trim();
  const secondary = (options.secondaryDetails || '').trim();
  const visibleText = (options.visibleTextPt || '').trim();
  const textMode = options.textMode || (visibleText ? 'with_text' : 'no_text');

  // Determine if Face & Identity Lock should be applied
  // Auto-applied to person-based modes unless explicitly opted out via hasPerson: false
  // For product-only modes (like PRODUCT_ADVERTISEMENT_EDIT, OBJECT_REMOVAL), only applied if hasPerson: true
  const isPersonMode = PERSON_BASED_VIDEO_MODES.includes(modeOption.id);
  const includePersonLock = options.hasPerson !== undefined ? options.hasPerson : isPersonMode;

  let masterPromptEn = '';

  if (modeOption.id === 'STYLE_TRANSFER') {
    // Specialized 5-pillar structure for STYLE_TRANSFER:
    // GOAL / PRESERVE / APPLY / TEMPORAL CONSISTENCY / AVOID
    const promptParts: string[] = [];
    promptParts.push(`[VIDEO EDIT MODE: STYLE_TRANSFER]`);
    promptParts.push(`Aspect ratio: ${aspectRatio}.`);
    promptParts.push(`Source Footage Context: "${sourceContext}".`);
    promptParts.push(`\nGOAL:`);
    promptParts.push(`Transform the source video into ${targetEdit || 'the requested visual style'}.`);
    
    promptParts.push(`\nPRESERVE:`);
    promptParts.push(`Keep unchanged:`);
    promptParts.push(`- subject identity`);
    promptParts.push(`- face`);
    promptParts.push(`- body proportions`);
    promptParts.push(`- clothing`);
    promptParts.push(`- original actions`);
    promptParts.push(`- timing`);
    promptParts.push(`- composition`);
    promptParts.push(`- scene geometry`);
    promptParts.push(`- object placement`);
    promptParts.push(`- product identity`);
    promptParts.push(`- camera continuity`);

    promptParts.push(`\nAPPLY:`);
    promptParts.push(`Introduce:`);
    promptParts.push(`- ${targetEdit || 'Target visual style'}`);
    if (secondary) {
      promptParts.push(`- ${secondary}`);
    } else {
      promptParts.push(`- Cohesive color palette, visual texture, film/look characteristics, and lighting treatment`);
    }
    promptParts.push(`Maintain realistic motion and spatial relationships.`);

    promptParts.push(`\nTEMPORAL CONSISTENCY:`);
    promptParts.push(`Apply the visual treatment consistently across every frame.`);
    promptParts.push(`Do not allow:`);
    promptParts.push(`- identity drift`);
    promptParts.push(`- face drift`);
    promptParts.push(`- product redesign`);
    promptParts.push(`- wardrobe redesign`);
    promptParts.push(`- geometry changes`);
    promptParts.push(`- object movement changes`);
    promptParts.push(`- action changes`);
    promptParts.push(`- timing changes`);
    promptParts.push(`- unstable color treatment`);
    promptParts.push(`- inconsistent textures`);

    promptParts.push(`\nAVOID:`);
    promptParts.push(`identity drift, product mutation, wardrobe redesign, geometry changes, flicker, morphing, unstable color, inconsistent texture, excessive distortion, random typography, invented branding.`);

    promptParts.push(`\n${GLOBAL_PRESERVATION_LOCK}`);

    if (includePersonLock) {
      promptParts.push(`\n${FACE_AND_IDENTITY_LOCK}`);
    }

    if (textMode === 'reserved_space_no_text') {
      promptParts.push(`\nTEXT CONSTRAINT: RESERVED SPACE — Keep designated negative space clean and free of text/typography for post-production graphic overlays.`);
    } else if (textMode === 'with_text' && visibleText) {
      promptParts.push(`\nVISIBLE ON-SCREEN TEXT (PT-BR MANDATORY): Render only this exact Portuguese text on screen: "${visibleText}". Do not translate, do not add random words.`);
    } else {
      promptParts.push(`\nTEXT CONSTRAINT: No unauthorized visible text, no misspelled words, no random logos, no fake typography.`);
    }

    masterPromptEn = promptParts.join('\n');
  } else {
    // Standard mode-specific prompt assembly for other modes
    const promptParts: string[] = [];
    promptParts.push(`[VIDEO EDIT MODE: ${modeOption.id}]`);
    promptParts.push(`Aspect ratio: ${aspectRatio}.`);
    promptParts.push(`Source Footage Context: "${sourceContext}".`);
    promptParts.push(`Target Edit Directive: "${targetEdit}".`);

    if (secondary) {
      promptParts.push(`Secondary Fine-tuning: "${secondary}".`);
    }

    promptParts.push(`Execution Instructions: ${modeOption.defaultTechnicalDirectives}`);
    promptParts.push(GLOBAL_PRESERVATION_LOCK);

    if (includePersonLock) {
      promptParts.push(FACE_AND_IDENTITY_LOCK);
    }

    if (textMode === 'reserved_space_no_text') {
      promptParts.push(`TEXT CONSTRAINT: RESERVED SPACE — Keep designated negative space clean and free of text/typography for post-production graphic overlays.`);
    } else if (textMode === 'with_text' && visibleText) {
      promptParts.push(`VISIBLE ON-SCREEN TEXT (PT-BR MANDATORY): Render only this exact Portuguese text on screen: "${visibleText}". Do not translate, do not add random words.`);
    } else {
      promptParts.push(`TEXT CONSTRAINT: No unauthorized visible text, no misspelled words, no random logos, no fake typography.`);
    }

    masterPromptEn = promptParts.join('\n');
  }

  // Google Vids / Omni structured plain text format
  const vidsLines: string[] = [];
  vidsLines.push(`=======================================================`);
  vidsLines.push(`GOOGLE VIDS / OMNI — VIDEO EDIT PROMPT`);
  vidsLines.push(`MODE: ${modeOption.labelPt.toUpperCase()} (${modeOption.id})`);
  vidsLines.push(`ASPECT RATIO: ${aspectRatio}`);
  vidsLines.push(`CATEGORY: ${modeOption.category.replace('_', ' ').toUpperCase()}`);
  vidsLines.push(`=======================================================\n`);

  vidsLines.push(`1. EDIT DIRECTIVE:`);
  vidsLines.push(`• Mode: ${modeOption.id}`);
  vidsLines.push(`• Source Description: ${sourceContext}`);
  vidsLines.push(`• Target Modification: ${targetEdit}`);
  if (secondary) {
    vidsLines.push(`• Technical Nuances: ${secondary}`);
  }
  vidsLines.push(`• Directives: ${modeOption.defaultTechnicalDirectives}\n`);

  vidsLines.push(`2. MANDATORY PRESERVATION LOCK:`);
  vidsLines.push(`${GLOBAL_PRESERVATION_LOCK}\n`);

  if (includePersonLock) {
    vidsLines.push(`3. FACE & IDENTITY LOCK:`);
    vidsLines.push(`${FACE_AND_IDENTITY_LOCK}\n`);
  }

  const textSectionNum = includePersonLock ? '4' : '3';
  if (textMode === 'reserved_space_no_text') {
    vidsLines.push(`${textSectionNum}. TEXT CONSTRAINT:`);
    vidsLines.push(`RESERVED SPACE — Keep designated clean negative space free of text for graphic overlays.\n`);
  } else if (textMode === 'with_text' && visibleText) {
    vidsLines.push(`${textSectionNum}. VISIBLE ON-SCREEN TEXT (PT-BR):`);
    vidsLines.push(`"${visibleText}" (Strictly preserved in Portuguese, no translation)\n`);
  } else {
    vidsLines.push(`${textSectionNum}. TEXT CONSTRAINT:`);
    vidsLines.push(`No unrequested text or fake brand overlays.\n`);
  }

  const promptSectionNum = includePersonLock ? '5' : '4';
  vidsLines.push(`${promptSectionNum}. MASTER TECHNICAL PROMPT (EN):`);
  vidsLines.push(`${masterPromptEn}\n`);

  const negativeDefault = options.customNegativePrompt || 
    'distorted anatomy, morphing face, altered identity, extra limbs, jitter, flickering, blurry brand logos, fake typography, unwanted text artifacts, discontinuous lighting, physics violation, low resolution, overexposed highlights';

  const negSectionNum = includePersonLock ? '6' : '5';
  vidsLines.push(`${negSectionNum}. NEGATIVE CONSTRAINTS (EN):`);
  vidsLines.push(negativeDefault);

  const googleVidsStructuredPrompt = vidsLines.join('\n');

  return {
    modeId: modeOption.id,
    modeLabelPt: modeOption.labelPt,
    category: modeOption.category,
    titlePt: `${modeOption.labelPt} • Edição Inteligente`,
    aspectRatio,
    globalPreservationLock: GLOBAL_PRESERVATION_LOCK,
    faceAndIdentityLock: includePersonLock ? FACE_AND_IDENTITY_LOCK : undefined,
    technicalDirectivesEn: modeOption.defaultTechnicalDirectives,
    sourceContextSummaryEn: sourceContext,
    targetEditInstructionsEn: targetEdit,
    visibleTextPtBr: visibleText || undefined,
    masterPromptEn,
    googleVidsStructuredPrompt,
    negativePromptEn: negativeDefault,
  };
}

/**
 * Formats clipboard text containing the full video edit mode payload.
 */
export function formatVideoEditClipboard(result: VideoEditPromptResult): string {
  return result.googleVidsStructuredPrompt;
}

/**
 * Saves the Video Edit Mode prompt into the Prompt Vault as an approved reusable mold.
 */
export function saveVideoEditPromptToVault(result: VideoEditPromptResult): PromptVaultItem {
  return createPromptVaultItem({
    type: 'prompt',
    title: `${result.titlePt} (${result.aspectRatio})`,
    category: 'Vídeo & Animação',
    destinationTool: 'provador_virtual',
    mainPrompt: result.googleVidsStructuredPrompt,
    negativePrompt: result.negativePromptEn,
    productContext: result.sourceContextSummaryEn,
    tags: ['video-edit', result.modeId.toLowerCase(), 'google-vids', 'omni', 'preservation-lock', 'provador-virtual'],
    notes: `Modo: ${result.modeLabelPt} | Formato: ${result.aspectRatio} | Trava Global & Identidade Ativa`,
    favorite: false,
    status: 'approved',
  });
}
