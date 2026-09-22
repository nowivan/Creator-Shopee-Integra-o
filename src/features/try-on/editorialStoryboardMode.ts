import { TECHNICAL_PROMPT_LANGUAGE_LOCK } from './tryOnCampaignLogic';
import { PromptVaultItem } from '../prompt-vault/types';
import { createPromptVaultItem } from '../prompt-vault/promptVaultStorage';
import {
  BrandMarkProfile,
  isBrandMarkActive,
  resolveBrandMarkAuthority
} from '../visual-reference-engine';

export type EditorialTextMode = 'no_text' | 'with_text' | 'reserved_space_no_text';
export type EditorialExportPreset = 'google_vids' | 'model_prompt' | 'prompt_vault';

export interface EditorialStoryboardShot {
  shot_number: number;
  shot_type: string;
  title: string;
  visual_action: string;
  camera_framing: string;
  lighting: string;
  product_lock: string;
  negative_constraints: string;
  prompt_en: string;
  visible_text_pt_br?: string;
}

export interface EditorialStoryboardResult {
  mode: 'editorial_product_storyboard';
  title: string;
  campaign_mood: string;
  color_palette: string;
  lighting_style: string;
  pacing: string;
  global_locks: {
    product_identity_lock: string;
    editorial_storyboard_lock: string;
    brand_text_hallucination_lock?: string;
    brand_safety_lock: string;
    no_grid_lock: string;
    text_mode_lock: string;
    presenter_brand_mark_lock?: string;
  };
  shots: EditorialStoryboardShot[];
  google_vids_structured_prompt: string;
  model_prompt_en: string;
  negative_prompt_global_en: string;
}

export const EDITORIAL_BRAND_SAFETY_WARNING =
  'Use referências editoriais apenas como direção visual. Não copie marcas, logos, textos, embalagens ou identidade de pessoas reais.';

/**
 * Builds the canonical Presenter Brand Mark lock for Editorial Storyboards if configured.
 */
export function buildEditorialPresenterBrandMarkLock(
  brandMark?: BrandMarkProfile | null
): string {
  if (!isBrandMarkActive(brandMark)) return '';
  const result = resolveBrandMarkAuthority(brandMark);
  return result.active ? result.clause : '';
}

/**
 * Mandatory Brand and Text Hallucination Lock for Editorial Product Storyboard mode.
 * Prevents invented brand names, fake logos, random product labels, misspelled typography,
 * and unauthorized text from appearing in outputs.
 */
export function buildEditorialBrandTextHallucinationLock(
  textMode: EditorialTextMode | string = 'no_text',
  customText?: string
): string {
  let modeConstraint = '';
  if (textMode === 'no_text') {
    modeConstraint = 'For no_text:\n- no text, no logos, no labels, no placeholders';
  } else if (textMode === 'with_text') {
    const text = (customText || '').trim();
    modeConstraint = `For with_text:\n- render only the exact Portuguese text provided by user ("${text}")\n- no extra words\n- no translation`;
  } else if (textMode === 'reserved_space_no_text') {
    modeConstraint = 'For reserved_space_no_text:\n- preserve blank editable space\n- no letters, no labels, no watermarks, no placeholders';
  } else {
    modeConstraint = 'For no_text:\n- no text, no logos, no labels, no placeholders';
  }

  return `BRAND AND TEXT HALLUCINATION LOCK:
If the source product contains visible brand/logo/text:
- preserve only what is visibly present
- do not translate
- do not redesign
- do not add extra labels

If the source product has no visible text:
- do not invent any brand
- do not add product label
- do not add logo
- do not add random typography

${modeConstraint}`;
}

/**
 * Builds the canonical Editorial Storyboard Reference Lock.
 */
export function buildEditorialStoryboardLock(): string {
  return `EDITORIAL STORYBOARD REFERENCE LOCK:
Use the uploaded editorial storyboard reference only for visual direction, shot variety, pacing, composition, lighting, palette, and campaign mood.
Preserve the new product identity exactly.
Do not copy the reference brand, logo, product, packaging, face, model identity, text, symbols, or trademarked design.
Do not reproduce the storyboard grid, panels, borders, captions, timestamps, or layout as a contact sheet.
Generate a continuous cinematic product campaign, not a collage.`;
}

/**
 * Builds the text mode constraint lock based on user selection.
 */
export function buildEditorialTextModeLock(textMode: EditorialTextMode | string = 'no_text', customText?: string): string {
  if (textMode === 'no_text') {
    return 'TEXT MODE: NO TEXT. No text, no logos, no labels, no placeholders, no words, no letters, no typography, and no watermarks.';
  }
  if (textMode === 'with_text') {
    const text = (customText || '').trim();
    return `TEXT MODE: WITH TEXT. Render only the exact Portuguese text provided by user: "${text}". No extra words, no translation, no placeholders.`;
  }
  if (textMode === 'reserved_space_no_text') {
    return 'TEXT MODE: RESERVED SPACE NO TEXT. Preserve blank editable space. No letters, no labels, no watermarks, no placeholders.';
  }
  return 'TEXT MODE: NO TEXT. No text, no logos, no labels, no placeholders.';
}

/**
 * Negative additions to block contact sheets, grid reproductions, and brand copying.
 */
export function buildEditorialStoryboardNegativeAdditions(): string {
  return 'invented brand names, fake logos, altered product labels, random typography, misspelled text, copied reference branding, unauthorized trademarks, fake luxury logos, unreadable product text, brand logo, trademark, reference brand, reference packaging, reference model face, reference identity, contact sheet, 3x3 grid, storyboard grid, split screen, multi-panel, panel borders, numbered labels, frame numbers, film borders, timestamps, text watermark, copyrighted text, collage, graphic layout, UI overlay, duplicated frames, contact sheet layout';
}

/**
 * Standard 6 to 9 shot structure definition for editorial campaigns.
 */
export const EDITORIAL_SHOT_TEMPLATES = [
  { shot_number: 1, shot_type: 'hero product close-up', default_title: 'Hero Product Close-Up' },
  { shot_number: 2, shot_type: 'hand-held product detail', default_title: 'Hand-Held Product Detail' },
  { shot_number: 3, shot_type: 'model interaction', default_title: 'Model Interaction' },
  { shot_number: 4, shot_type: 'macro material/texture', default_title: 'Macro Material & Texture' },
  { shot_number: 5, shot_type: 'product in use', default_title: 'Product in Use / Demonstration' },
  { shot_number: 6, shot_type: 'rotating beauty shot', default_title: 'Rotating 360 Beauty Shot' },
  { shot_number: 7, shot_type: 'lifestyle/editorial pose', default_title: 'Lifestyle Editorial Pose' },
  { shot_number: 8, shot_type: 'detail of packaging/product finish', default_title: 'Packaging & Finish Detail' },
  { shot_number: 9, shot_type: 'final hero frame', default_title: 'Final Hero Campaign Frame' }
];

/**
 * Builds the AI generation prompt for Editorial Product Storyboard mode.
 */
export function buildEditorialStoryboardPrompt(options: {
  textMode: EditorialTextMode;
  customText?: string;
  shotCount?: number;
  productContext?: string;
  presetGuidelines?: string;
  platform?: string;
}): string {
  const shotCount = Math.min(Math.max(options.shotCount || 9, 6), 9);
  const textLock = buildEditorialTextModeLock(options.textMode, options.customText);
  const brandTextHallucinationLock = buildEditorialBrandTextHallucinationLock(options.textMode, options.customText);

  return `You are an Elite Luxury Editorial Campaign Director, Commercial Cinematographer, and Multimodal Diffusion Engineer.

${TECHNICAL_PROMPT_LANGUAGE_LOCK}

${buildEditorialStoryboardLock()}

${brandTextHallucinationLock}

${textLock}

BRAND & REFERENCE SAFETY MANDATE:
- ${EDITORIAL_BRAND_SAFETY_WARNING}
- Extract and reuse ONLY: shot variety, campaign mood, color palette, lighting style, product close-up rhythm, model interaction style, macro texture shots, multi-angle product framing, editorial pacing, and premium composition.
- Strictly FORBID copying: brand names, logos, trademarks, exact product identity, exact face/identity from the reference, exact typography, exact grid/panel layout, copyrighted campaign text, or reference-specific symbols.
- Avoid: invented brand names, fake logos, altered product labels, random typography, misspelled text, copied reference branding, unauthorized trademarks, fake luxury logos, unreadable product text.
- Produce ONE continuous cinematic product campaign (not a collage, not a 3x3 contact sheet, not a grid of panels).

PRODUCT IDENTITY MANDATE (IMAGE 2):
- The product identity comes EXCLUSIVELY and UNCOMPROMISINGLY from Image 2.
- Preserve exact shape, materials, silhouette, texture, tone, and craftsmanship.
- If the source product contains visible brand/logo/text: preserve only what is visibly present, do not translate, do not redesign, do not add extra labels.
- If the source product has no visible text: do not invent any brand, do not add product label, do not add logo, do not add random typography.
${options.productContext ? `- Product Context: "${options.productContext}"` : ''}

${options.presetGuidelines ? `MASTER PRESET DIRECTIVES:\n${options.presetGuidelines}\n` : ''}

REQUIRED SEQUENCE:
Generate exactly ${shotCount} editorial shot suggestions covering:
1. hero product close-up
2. hand-held product detail
3. model interaction
4. macro material/texture
5. product in use
6. rotating beauty shot
7. lifestyle/editorial pose
8. detail of packaging/product finish
9. final hero frame

Each shot MUST include:
- visual action (cinematic action description)
- camera/framing (lens, focal length, angle, motion)
- lighting (studio / natural high-end lighting setup)
- product lock (concise English product invariance rule)
- negative constraints (English negative tokens)
- prompt_en (exhaustive technical English diffusion prompt for video/image generation)
${options.textMode === 'with_text' && options.customText ? `- visible_text_pt_br: "${options.customText.trim()}"` : ''}

REQUIRED JSON OUTPUT SCHEMA:
Return ONLY valid JSON matching this schema:
{
  "mode": "editorial_product_storyboard",
  "title": "Editorial Campaign Title in Portuguese (e.g. Campanha Editorial: Luxo & Textura)",
  "campaign_mood": "High-end luxury mood description in English",
  "color_palette": "Refined color palette extracted from moodboard in English",
  "lighting_style": "Sophisticated lighting setup description in English",
  "pacing": "Editorial video rhythm and transition pacing in English",
  "global_locks": {
    "product_identity_lock": "Exhaustive English instructions locking product from Image 2",
    "editorial_storyboard_lock": "EDITORIAL STORYBOARD REFERENCE LOCK: English visual direction rules",
    "brand_text_hallucination_lock": "BRAND AND TEXT HALLUCINATION LOCK: Rules forbidding invented brands/logos/labels",
    "brand_safety_lock": "English safety rules forbidding logo/trademark/model identity replication",
    "no_grid_lock": "Strict anti-collage, anti-grid, anti-contact sheet technical lock",
    "text_mode_lock": "${textLock}"
  },
  "shots": [
    {
      "shot_number": 1,
      "shot_type": "hero product close-up",
      "title": "Title in Portuguese (e.g. Shot 1 • Hero Close-Up de Impacto)",
      "visual_action": "Cinematic visual action description in Portuguese",
      "camera_framing": "Camera lens, angle, and motion in English (e.g. 85mm macro lens, slow push-in, shallow depth of field)",
      "lighting": "Lighting setup in English (e.g. Diffused softbox key light, subtle rim light)",
      "product_lock": "Product invariance reminder in English",
      "negative_constraints": "Negative constraints for this shot in English",
      "prompt_en": "Complete technical diffusion prompt written entirely in English. ${options.textMode === 'with_text' && options.customText ? `VISIBLE TEXT: Render only this exact Portuguese text: \\"${options.customText.trim()}\\"` : ''}",
      "visible_text_pt_br": ${options.textMode === 'with_text' && options.customText ? `"${options.customText.trim()}"` : '""'}
    }
  ],
  "google_vids_structured_prompt": "Plain structured text prompt for Google Vids / Omni in technical English with preserved Portuguese text",
  "model_prompt_en": "Complete single-stream technical English master prompt for diffusion models incorporating product lock, no brand copying lock, and no grid lock",
  "negative_prompt_global_en": "invented brand names, fake logos, altered product labels, random typography, misspelled text, copied reference branding, unauthorized trademarks, fake luxury logos, unreadable product text, distorted product, altered silhouette, brand logo, trademark, reference model face, contact sheet, 3x3 grid, storyboard panels, split screen, multi-panel, numbered labels, text watermark, collage"
}`;
}

/**
 * Formats the plain structured text prompt for Google Vids / Omni export.
 * Output is plain structured text, NOT JSON.
 */
export function formatGoogleVidsPrompt(
  result: EditorialStoryboardResult,
  textMode: EditorialTextMode | string = 'no_text',
  customText?: string
): string {
  const lines: string[] = [];

  lines.push(`=======================================================`);
  lines.push(`GOOGLE VIDS / OMNI — EDITORIAL PRODUCT STORYBOARD`);
  lines.push(`CAMPAIGN: ${result.title.toUpperCase()}`);
  lines.push(`FORMAT: Continuous Cinematic Product Campaign (Single Stream, No Grid/Collage)`);
  lines.push(`PACING: ${result.pacing || 'Refined editorial rhythm with smooth seamless transitions'}`);
  lines.push(`=======================================================\n`);

  lines.push(`VISUAL DNA & DIRECTION:`);
  lines.push(`- Campaign Mood: ${result.campaign_mood}`);
  lines.push(`- Color Palette: ${result.color_palette}`);
  lines.push(`- Lighting Setup: ${result.lighting_style}\n`);

  lines.push(`CRITICAL INVARIANCE LOCKS:`);
  lines.push(`1. PRODUCT IDENTITY LOCK:`);
  lines.push(`${result.global_locks?.product_identity_lock || 'Preserve exact product identity from main product image.'}\n`);
  lines.push(`2. EDITORIAL STORYBOARD LOCK:`);
  lines.push(`${buildEditorialStoryboardLock()}\n`);
  lines.push(`3. BRAND & TEXT HALLUCINATION LOCK:`);
  lines.push(`${result.global_locks?.brand_text_hallucination_lock || buildEditorialBrandTextHallucinationLock(textMode, customText)}\n`);
  lines.push(`4. TEXT CONSTRAINT:`);
  lines.push(`${buildEditorialTextModeLock(textMode, customText)}\n`);

  lines.push(`CINEMATIC SEQUENCE (${result.shots.length} SHOTS):`);
  lines.push(`-------------------------------------------------------`);

  result.shots.forEach((shot) => {
    lines.push(`[SHOT ${shot.shot_number}: ${shot.shot_type.toUpperCase()} - ${shot.title.toUpperCase()}]`);
    lines.push(`• Framing & Lens: ${shot.camera_framing}`);
    lines.push(`• Action: ${shot.visual_action}`);
    lines.push(`• Lighting: ${shot.lighting}`);
    lines.push(`• Product Anchor: ${shot.product_lock}`);
    if (shot.visible_text_pt_br) {
      lines.push(`• Visible Text (PT-BR): "${shot.visible_text_pt_br}"`);
    }
    lines.push(`• Technical Prompt (EN):\n${shot.prompt_en}`);
    lines.push(`• Shot Negatives: ${shot.negative_constraints}`);
    lines.push(`-------------------------------------------------------`);
  });

  lines.push(`\nGLOBAL NEGATIVE PROMPT (EN):`);
  lines.push(
    result.negative_prompt_global_en ||
      `${buildEditorialStoryboardNegativeAdditions()}, blurry textures, distorted geometry`
  );

  return lines.join('\n');
}

/**
 * Formats the technical English image/video model prompt.
 */
export function formatEditorialModelPrompt(result: EditorialStoryboardResult): string {
  if (result.model_prompt_en) {
    return result.model_prompt_en;
  }

  const promptParts: string[] = [];
  promptParts.push(`Cinematic luxury editorial product commercial video.`);
  promptParts.push(`Mood: ${result.campaign_mood}.`);
  promptParts.push(`Palette: ${result.color_palette}.`);
  promptParts.push(`Lighting: ${result.lighting_style}.`);
  promptParts.push(`Pacing: ${result.pacing}.`);
  promptParts.push(`Continuous single-take vertical 9:16 composition, seamless studio camera motion.`);
  promptParts.push(`Product identity: ${result.global_locks?.product_identity_lock || 'exact physical product from main image'}.`);
  promptParts.push(buildEditorialStoryboardLock());

  return promptParts.join(' ');
}

/**
 * Formats the complete Editorial Storyboard campaign for clipboard copying.
 */
export function formatEditorialStoryboardClipboard(result: EditorialStoryboardResult): string {
  const lines: string[] = [];

  lines.push(`=======================================================`);
  lines.push(`🎬 STORYBOARD EDITORIAL DE PRODUTO — ${result.title.toUpperCase()}`);
  lines.push(`✨ Mood: ${result.campaign_mood}`);
  lines.push(`🎨 Paleta: ${result.color_palette}`);
  lines.push(`💡 Iluminação: ${result.lighting_style}`);
  lines.push(`⏱️ Ritmo: ${result.pacing}`);
  lines.push(`🔢 Quantidade de Shots: ${result.shots.length} Shots`);
  lines.push(`=======================================================\n`);

  lines.push(`🔒 GLOBAL LOCKS & DIRETRIZES`);
  lines.push(`-------------------------------------------------------`);
  lines.push(`🏷️ Product Identity Lock:\n${result.global_locks?.product_identity_lock}\n`);
  lines.push(`🎬 Editorial Storyboard Lock:\n${result.global_locks?.editorial_storyboard_lock || buildEditorialStoryboardLock()}\n`);
  lines.push(`🛡️ Brand Safety Warning:\n${EDITORIAL_BRAND_SAFETY_WARNING}\n`);
  lines.push(`🔒 Brand & Text Hallucination Lock:\n${result.global_locks?.brand_text_hallucination_lock || buildEditorialBrandTextHallucinationLock(result.global_locks?.text_mode_lock)}\n`);
  lines.push(`🚫 Anti-Grid & Anti-Contact Sheet Lock:\n${result.global_locks?.no_grid_lock || 'Continuous cinematic sequence, not a collage.'}\n`);
  lines.push(`📝 Text Mode Lock:\n${result.global_locks?.text_mode_lock}\n`);
  lines.push(`=======================================================\n`);

  result.shots.forEach((shot) => {
    lines.push(`📽️ [SHOT ${shot.shot_number}] ${shot.title.toUpperCase()} (${shot.shot_type})`);
    lines.push(`🎬 Ação: ${shot.visual_action}`);
    lines.push(`🎥 Câmera / Lente: ${shot.camera_framing}`);
    lines.push(`💡 Iluminação: ${shot.lighting}`);
    lines.push(`🔒 Trava do Produto: ${shot.product_lock}`);
    if (shot.visible_text_pt_br) {
      lines.push(`💬 Texto Visível (PT-BR): "${shot.visible_text_pt_br}"`);
    }
    lines.push(`\nPROMPT (EN):\n${shot.prompt_en}\n`);
    lines.push(`🚫 Restrições Negativas: ${shot.negative_constraints}`);
    lines.push(`-------------------------------------------------------\n`);
  });

  if (result.negative_prompt_global_en) {
    lines.push(`🚫 Global Negative Prompt:\n${result.negative_prompt_global_en}\n`);
  }

  return lines.join('\n');
}

/**
 * Saves the Editorial Storyboard result into the Prompt Vault as a reusable mold.
 */
export function saveEditorialStoryboardToVault(result: EditorialStoryboardResult): PromptVaultItem {
  const mainPrompt = formatGoogleVidsPrompt(result);
  const negativePrompt = result.negative_prompt_global_en || buildEditorialStoryboardNegativeAdditions();

  return createPromptVaultItem({
    type: 'prompt',
    title: result.title || 'Storyboard Editorial de Produto',
    category: 'Comercial & Moda',
    destinationTool: 'provador_virtual',
    mainPrompt,
    negativePrompt,
    productContext: result.global_locks?.product_identity_lock,
    tags: ['editorial', 'storyboard', 'luxury', 'product-campaign', 'google-vids', 'provador-virtual'],
    notes: `Mood: ${result.campaign_mood} | Paleta: ${result.color_palette} | Iluminação: ${result.lighting_style}`,
    favorite: false,
    status: 'approved'
  });
}
