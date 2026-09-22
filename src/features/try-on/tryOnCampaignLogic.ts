import { 
  TryOnCampaignType, 
  TryOnTakeCount, 
  TryOnFormat,
  TryOnSceneStyle,
  TryOnPlatform,
  TryOnCampaignResult, 
  TryOnGlobalLocks, 
  TryOnTake,
  StoryboardReferenceMode
} from './types';
import { 
  detectSkeletonWatchStaticLock, 
  buildSkeletonWatchStaticDialLock, 
  buildSkeletonWatchNegativeAdditions,
  buildSkeletonWatchAdvancedRegionLock,
  buildSkeletonWatchAdvancedRegionNegativeAdditions
} from './skeletonWatchLock';
import {
  detectWearableAccessoryCategory,
  buildWearableAccessoryDemoMold
} from './wearableAccessoryMold';
import {
  buildStoryboardReferenceLock,
  buildStoryboardReferenceNegativeAdditions,
  buildStoryboardVideoStructure,
  hasStoryboardReference
} from './storyboardReferenceLock';
import {
  normalizeAffiliatePlatform,
  buildAffiliateClaimSafetyLock,
  buildAffiliatePlatformVideoGuidance,
  buildAffiliatePlatformNegativeAdditions,
  getAffiliatePlatformLabel
} from './affiliatePlatformModes';

export const TECHNICAL_PROMPT_LANGUAGE_LOCK = `TECHNICAL PROMPT LANGUAGE LOCK:
All technical prompt content must be written in English.
This includes:
- image prompts
- video prompts
- multi-take prompts
- product locks
- identity locks
- wardrobe locks
- negative prompts
- motion constraints
- camera instructions
- lighting instructions
- style instructions
- product preservation locks
- skeleton watch static locks
- affiliate thumbnail prompts
- wearable accessory demo prompts
- storyboard UGC prompt

Portuguese is allowed ONLY for:
- visible text rendered in the image/video
- headline text
- on-screen text
- spoken dialogue
- voice-over text
- exact CTA text
- exact user-provided copy

If the output prompt contains Portuguese visible text or on-screen typography, format it inside the English prompt as:
VISIBLE TEXT: Render only this exact Portuguese text: "<exact Portuguese text>"`;

export function buildTryOnCampaignPrompt(
  campaignType: TryOnCampaignType,
  takeCount: TryOnTakeCount,
  format: TryOnFormat = 'no_dialogue',
  sceneStyle: TryOnSceneStyle = 'white_background',
  platform: TryOnPlatform = 'shopee',
  hasVisualReference: boolean = false,
  presetGuidelines?: string,
  productContext?: string,
  storyboardReferenceMode: StoryboardReferenceMode = 'none'
): string {
  const isStoryboardActive = hasStoryboardReference(storyboardReferenceMode);
  const normalizedPlatform = normalizeAffiliatePlatform(platform);
  const styleDescriptions: Record<TryOnCampaignType, string> = {
    // Affiliate presets
    shopee_clean_demo: 'Shopee Clean Demo: Minimalist ultra-clean white background, hand-held product demonstration, minimal visual distractions, centered product framing, functional clarity, text-on-screen friendly negative space, clear final CTA framing.',
    tiktok_shop_fast_demo: 'TikTok Shop Fast Demo: Fast visual hook in first second, dynamic handheld feel, crisp social-commerce pacing, bold on-screen text zones, immediate product benefit visualization, direct cart/basket CTA framing.',
    white_glove_packshot: 'White Glove Packshot: Premium clean white-gloved hands holding/inspecting the product against an immaculate white/off-white studio backdrop, luxury studio key lighting, macro material reflections, high-end catalog inspection feel.',
    ugc_product_in_use: 'UGC Product in Use: Authentic social-commerce creator showing real product usage/wearing, natural relatable gestures, genuine lifestyle environment, focus on tangible everyday benefits and fit.',
    before_after_comparison: 'Before & After / Comparative Demo: High-contrast problem versus solution framing, visible demonstration of transformation or comparative advantage, split-screen or side-by-side visual proof.',
    conversion_carousel: 'Conversion Carousel: 5 coordinated static e-commerce carousel slides with designated sales functions: 1. Cover Hook -> 2. Main Benefit -> 3. Detail Proof -> 4. Product in Use -> 5. Final Offer/CTA.',
    
    // Fashion / Storyboard presets
    visual_storyboard: 'Cinematic visual sequence with dynamic camera framing, realistic soft key lighting, 8k resolution, crisp lens depth of field, natural motion aesthetics.',
    ugc_ad: 'Authentic social media UGC creator look (TikTok / Instagram Reels style), vertical orientation, ring light or bright indoor ambient daylight, natural relatable posture, organic lifestyle atmosphere.',
    fashion_carousel: 'High-end lookbook / catalogue multi-slide aesthetic, clean neutral backdrop, balanced studio softbox illumination, clean color reproduction, fashion-forward framing.',
    editorial_premium: 'Vogue / GQ luxury editorial style, dramatic chiaroscuro or refined high-fashion lighting, haute couture posing, hyper-detailed texture rendering, sophisticated luxury atmosphere.'
  };

  const sceneStyleDescriptions: Record<TryOnSceneStyle, string> = {
    white_background: 'Clean seamless white or off-white studio background with soft natural drop shadow, zero clutter, high commercial product isolation.',
    holding_hand: 'Realistic human hand naturally holding, rotating, or presenting the product, clean fingernails, natural grip that does not obscure product features.',
    white_glove: 'Pristine white cotton/satin-gloved hand gently holding and inspecting the product with jewelry/curator elegance.',
    clean_table: 'Minimalist clean tabletop (white marble, bleached wood, or matte acrylic surface) with soft overhead lighting and subtle contact shadows.',
    model_wearing: 'Person from Image 1 actively wearing or demonstrating the product in a natural, anatomically sound manner.',
    lifestyle: 'Modern authentic lifestyle setting (stylish living room, sunlit vanity table, modern apartment, or trendy street).',
    mixed: 'Dynamic blend of clean packshots, hand demonstrations, and lifestyle wearing shots tailored for maximum conversion.'
  };

  const platformCtaGuide: Record<TryOnPlatform, string> = {
    universal: 'Universal / Multi-platform clean affiliate context (CTA suggestions in PT-BR like "Disponível no link", "Garanta o seu", "Veja mais detalhes")',
    shopee: 'Shopee Video / Live commerce context (CTA suggestions in PT-BR like "Tá na Shopee", "Veja na sacolinha", "Cupom no link")',
    tiktok_shop: 'TikTok Shop social commerce context (CTA suggestions in PT-BR like "Tá no carrinho amarelo", "Link na sacolinha", "Compre agora")',
    amazon: 'Amazon Storefront / Affiliate context (CTA suggestions in PT-BR like "Disponível na Amazon", "Link na bio", "Confira no link")',
    mercado_livre: 'Mercado Livre marketplace context (CTA suggestions in PT-BR like "Compre no Mercado Livre", "Disponível no link", "Veja os detalhes no link")',
    magalu: 'Parceiro Magalu context (CTA suggestions in PT-BR like "Tem no Magalu", "Confira no link", "Link na bio")',
    aliexpress: 'AliExpress tech / global commerce context (CTA suggestions in PT-BR like "Disponível no link", "Confira os detalhes", "Link direto")',
    pinterest: 'Pinterest idea / discovery context (CTA suggestions in PT-BR like "Inspire-se no link", "Salve para depois", "Mais ideias no link")',
    generic: 'Universal / Multi-platform clean affiliate context (CTA suggestions in PT-BR like "Disponível no link", "Garanta o seu", "Veja mais detalhes")'
  };

  const formatInstructions: Record<TryOnFormat, string> = {
    no_dialogue: 'FORMAT: NO SPOKEN DIALOGUE. Focus strictly on visual camera actions and concise Brazilian Portuguese on-screen text overlays. Do NOT include spoken narrator scripts.',
    text_on_screen: 'FORMAT: TEXT ON SCREEN EMPHASIS. Focus on bold visual actions with high-impact Brazilian Portuguese text hooks designed to be read in silence on mobile screens.',
    short_speech: 'FORMAT: SHORT SPOKEN CUE. In addition to the technical visual prompt in English, include a short (1-2 sentence) natural Brazilian Portuguese spoken line in "optional_dialogue_pt_br" that a creator could speak during this take.',
    visual_prompt_only: 'FORMAT: PURE VISUAL PROMPT. Focus purely on technical diffusion prompts and camera execution with minimal text requirements.'
  };

  const styleGuide = styleDescriptions[campaignType] || styleDescriptions.shopee_clean_demo;
  const sceneGuide = sceneStyleDescriptions[sceneStyle] || sceneStyleDescriptions.white_background;
  const platformGuide = platformCtaGuide[normalizedPlatform] || platformCtaGuide.universal;
  const formatGuide = formatInstructions[format] || formatInstructions.no_dialogue;

  return `
You are an Elite AI Virtual Try-On Architect, E-Commerce Creative Director, and Multimodal Diffusion Engineer specializing in high-converting affiliate campaigns (Shopee Video, TikTok Shop, Amazon, Mercado Livre, Magalu, AliExpress, Pinterest, and Universal E-Commerce).

${TECHNICAL_PROMPT_LANGUAGE_LOCK}

${
  isStoryboardActive
    ? `Your task is to analyze Image 1 (Person/Avatar), Image 2 (Main Product: Garment, Outfit, Sunglasses/Eyewear, Bag, Watch, Jewelry, Perfume, Wallet, Gadget, or Accessory), and Image 3 (UGC Storyboard Reference) and generate a master storyboard containing exactly ${takeCount} distinct, sequential takes.`
    : hasVisualReference
      ? `Your task is to analyze Image 1 (Person/Avatar), Image 2 (Garment, Outfit, Sunglasses/Eyewear, Bag, Watch, Jewelry, Perfume, Wallet, Gadget, or Accessory), and Image 3 (Visual Style / Pose / Composition Reference) and generate a master storyboard containing exactly ${takeCount} distinct, sequential takes.`
      : `Your task is to analyze Image 1 (Person/Avatar) and Image 2 (Garment, Outfit, Sunglasses/Eyewear, Bag, Watch, Jewelry, Perfume, Wallet, Gadget, or Accessory) and generate a master storyboard containing exactly ${takeCount} distinct, sequential takes.`
}

CAMPAIGN CONFIGURATION:
- Campaign Preset: "${campaignType}" -> ${styleGuide}
- Target Platform: "${normalizedPlatform}" (${getAffiliatePlatformLabel(normalizedPlatform)}) -> ${platformGuide}
- Scene Style: "${sceneStyle}" -> ${sceneGuide}
- Video Format: "${format}" -> ${formatGuide}
- Number of Takes: ${takeCount} takes
${isStoryboardActive ? `- UGC Storyboard Reference Image: Provided as Image 3 (Guiding scene sequence, angles, poses, lighting mood, and UGC rhythm only - NOT the video layout)` : hasVisualReference ? `- Visual Reference Image: Provided as Image 3 (Guiding pose, lighting, angle, composition, and mood only)` : ''}
${presetGuidelines ? `\nMASTER PRESET / SLASH COMMAND DIRECTIVES:\n${presetGuidelines}\n` : ''}

AFFILIATE PLATFORM SPECIFIC GUIDANCE & CLAIM SAFETY:
${buildAffiliateClaimSafetyLock()}

${buildAffiliatePlatformVideoGuidance(normalizedPlatform)}

CRITICAL IDENTITY & PRODUCT LOCKS (STRICT PRESERVATION MANDATE - PRECEDENCE ORDER):
${isStoryboardActive ? `\n${buildStoryboardReferenceLock()}\n` : ''}
1. PERSON IDENTITY LOCK:
   - When a person/avatar is present in Image 1: Hold the exact facial structure, bone shape, eyes, lips, nose, skin tone, hair color, hair texture, and physical identity of the person completely unchanged across all takes. Write all technical lock instructions in English.
2. PRODUCT / ACCESSORY IDENTITY LOCK (ABSOLUTE PRIORITY OVER PLATFORM STYLE):
   - Hold the exact physical item in Image 2 completely unchanged across all takes: exact color, tone, silhouette, cut, pattern, fabric weave, hardware, stitching, buckles, lenses, frame shape, dials, bottle geometry, nozzle, logo placement, and distinctive craftsmanship details.
   - Strictly FORBID the model from altering colors, inventing new logos, swapping materials, or redesigning the product.
   - SKELETON / OPEN-HEART WATCH STATIC DIAL & ADVANCED REGION MANDATE: If the product is a watch with visible internal gears, skeleton dial, transparent dial, open-heart design, or tourbillon-style details, enforce the SKELETON WATCH STATIC DIAL LOCK & ADVANCED REGION LOCK:
     * The entire watch dial must remain completely static from first frame to last frame.
     * All visible gears, exposed mechanics, tourbillon-style details, hands, second hand, Roman numerals, subdials, markings, logo, date window and inner dial components are visual design details only.
     * Do not animate, rotate, tick, oscillate, spin, flicker, morph or simulate any internal mechanical activity.
     * Critical region lock: Freeze the upper-left gear-shaped decorative area between 10 and 11 o’clock inside the dial. This region must not rotate, flicker, shimmer, crawl, pulse, morph, shift, or animate. Keep it pixel-identical frame to frame.
     * Full dial reference lock: Freeze the entire circular watch face, including all gear-shaped details, hands, numerals, logo, subdials, screws, date window and inner decorative textures. Everything inside the dial must remain static and unchanged.
     * Allowed motion: natural hand/wrist micro-movement, subtle camera movement, background motion, and soft light reflections on outer case, bracelet or glass only.
     * When triggered, include specific negative terms in negative_constraints and negative_prompt_global_en: "rotating gear at 10 o'clock, rotating gear at 11 o'clock, moving upper-left gear, animated upper-left dial detail, flickering upper-left gear, shimmering upper-left gear, crawling texture at 10 o'clock, pulsing upper-left gear, shifting upper-left gear, moving gears, rotating gears, spinning gears, spinning tourbillon, ticking hands, moving watch hands, moving second hand, animated internal mechanism, internal gear motion, oscillating balance wheel, animated skeleton movement, flickering gears, flickering dial, morphing dial, warped Roman numerals, changing numerals, moving subdials, changing logo, moving brand text, invented mechanical activity inside the watch, product face animation".
3. SCENE & COMMERCIAL LOCK:
   - Enforce clean, distraction-free framing adhering to the selected Scene Style (${sceneStyle}).
   - Preserve clear negative space in final framing for price tags, coupon badges, or platform CTA overlays without cluttering the product.
${
  isStoryboardActive
    ? `4. UGC STORYBOARD REFERENCE LOCK (IMAGE 3 - SCENE DIRECTION ONLY):
   - Use Image 3 strictly as scene direction and production reference: scene order, camera angles, hand/body poses, product interaction, lighting mood, UGC style, and final commercial composition.
   - Strictly FORBID copying the storyboard collage grid, split screen, multiple panels, numbered labels, circular number badges, UI overlays, watermarks, or tiled layout.
   - Produce one single continuous vertical video.`
    : hasVisualReference
      ? `4. VISUAL REFERENCE LOCK (IMAGE 3 - STRICT AUTHORITY BOUNDARY):
   - Use Image 3 ONLY as visual direction: pose direction, camera angle, framing, lighting, composition, mood, background style, and campaign aesthetic.
   - Strictly FORBID copying the person, face, identity, skin, body, clothing, accessories, product, logos, text, or brand marks from Image 3.
   - Apply this visual reference aesthetic consistently across all takes while varying take purpose and angles according to the campaign preset.`
      : ''
}

PRESET TAKE SEQUENCING ARCHETYPES:
Adhere strictly to the requested preset sequence:

${
  campaignType === 'shopee_clean_demo' ? `
- SHOPEE CLEAN DEMO SPECIFIC SEQUENCE:
  * TAKE 1 — Visual Hook: Show product immediately, centered on clean background (${sceneStyle}). Brazilian Portuguese on-screen text suggestion: "Olha esse detalhe" or immediate benefit hook.
  * TAKE 2 — Hand Demo: Hand (${sceneStyle === 'white_glove' ? 'white-gloved hand' : 'natural hand'}) holds, rotates, opens, adjusts, applies, or shows the product in action.
  * TAKE 3 — Detail Proof: Macro close-up on material, finish, texture, lens, stitching, clasp, button, dial, or key craftsmanship detail.
  * TAKE 4 — Benefit Shot: Show scale, fit on body/hand, before/after contrast, or visible functional advantage.
  * TAKE 5 (if ${takeCount} === 5) — CTA Hero: Clean final hero packshot with clean negative space for price/CTA. Brazilian Portuguese on-screen text suggestion: "Tá na Shopee" or "Veja na sacolinha".
` : campaignType === 'tiktok_shop_fast_demo' ? `
- TIKTOK SHOP FAST DEMO SPECIFIC SEQUENCE:
  * TAKE 1 — 1-Second Hook: Immediate dynamic product reveal or problem/curiosity trigger that stops scrolling.
  * TAKE 2 — Problem / Curiosity: Show what makes the product unique or solves a relatable frustration.
  * TAKE 3 — Use Demo: Show the product being used/worn naturally with social-commerce vitality.
  * TAKE 4 — Proof Detail: Zoom on material/function/durability/texture proof.
  * TAKE 5 (if ${takeCount} === 5) — CTA Push: Final high-energy visual shot with direct PT-BR CTA: "Tá no carrinho" / "Link na sacolinha".
` : campaignType === 'white_glove_packshot' ? `
- WHITE GLOVE PACKSHOT SPECIFIC SEQUENCE:
  * TAKE 1 — White Glove Hero: Pristine white-gloved hand holding product centered on clean white/off-white studio background.
  * TAKE 2 — Front Inspection: Show the front face/primary design with museum-level studio lighting.
  * TAKE 3 — Side / Material Detail: Turn product slightly to reveal side profile, material, texture, or construction.
  * TAKE 4 — Close Detail: Macro close-up of distinctive hardware, lens, dial, leather grain, or gemstone facet.
  * TAKE 5 (if ${takeCount} === 5) — Final Packshot: Product placed or held cleanly with balanced negative space for CTA overlay.
` : campaignType === 'ugc_product_in_use' ? `
- UGC PRODUCT IN USE SPECIFIC SEQUENCE:
  * TAKE 1 — Natural Reveal: Same model shows or puts on the product naturally.
  * TAKE 2 — Use Moment: Model interacts with or adjusts the product in authentic everyday motion.
  * TAKE 3 — Detail While Using: Close-up of the product as it is worn/used on the model.
  * TAKE 4 — Reaction / Confidence Shot: Model subtle expression or confident body posture showing real satisfaction.
  * TAKE 5 (if ${takeCount} === 5) — CTA Shot: Final product-in-use framing with clean space for platform shopping badge.
` : campaignType === 'before_after_comparison' ? `
- BEFORE & AFTER / COMPARATIVE SPECIFIC SEQUENCE:
  * TAKE 1 — Before / Problem: Show the situation or aesthetic limitation before using the product.
  * TAKE 2 — Product Introduction: Show the product entering the scene as the ideal solution.
  * TAKE 3 — Application / Use: Show product being applied, worn, or operated seamlessly.
  * TAKE 4 — After / Result: Show the visible transformation, elevated look, or immediate result.
  * TAKE 5 (if ${takeCount} === 5) — Comparison + CTA: Side-by-side or split-screen visual proof with platform CTA text.
` : campaignType === 'conversion_carousel' ? `
- CONVERSION CAROUSEL SPECIFIC SEQUENCE:
  * TAKE 1 — Cover Hook: High-impact hero image with generous headline negative space.
  * TAKE 2 — Main Benefit: Slide showcasing the strongest visual benefit.
  * TAKE 3 — Detail Proof: Macro close-up of material, texture, build quality, or certification detail.
  * TAKE 4 — Product in Use: Slide demonstrating real-world wear or practical usage.
  * TAKE 5 (if ${takeCount} === 5) — CTA / Offer: Clean packshot with designated space for coupon, price, or platform link.
` : `
- FASHION & STORYBOARD SEQUENCE:
  * TAKE 1: Full-context or establishing hero shot showing the complete product in aesthetic harmony.
  * TAKE 2: 3/4 dynamic angled view highlighting silhouette, volume, and craftsmanship.
  * TAKE 3: Functional gesture or interaction view.
  * TAKE 4: Movement or lifestyle context shot with authentic energy.
  * TAKE 5 (if ${takeCount} === 5): Macro detail close-up on texture, stitching, or hardware.
`
}
${isStoryboardActive ? `
UGC STORYBOARD SCENE SEQUENCE GUIDE (CONTINUOUS VERTICAL VIDEO, NOT A COLLAGE):
${buildStoryboardVideoStructure()}
` : ''}
CATEGORY-SPECIFIC ADAPTATION RULES:
- If SUNGLASSES / EYEWEAR: Show front frame alignment, temple arms, hinges, lens gradient/reflection, fit on nose bridge, and hand-held rotation.
- If PERFUME / COSMETICS: Show bottle front, cap, spray nozzle, glass transparency, label, and hand holding/spraying mist without fake medical claims.
- If WATCHES / JEWELRY: Show wrist/hand close-up, bezel, dial numerals, metal luster, clasp, and facet sparkle. FOR SKELETON/OPEN-HEART WATCHES: Explicitly freeze all internal gears, balance wheels, cogs, subdials, and hands (zero mechanical animation).
- If WALLET / BAGS: Show exterior texture, leather grain, stitching, hardware buckles, compartments, and hand scale.
- If CLOTHING: Show complete drape, silhouette, neckline, movement, and fabric weave.
- FOR WEARABLE ACCESSORIES (WATCHES, BRACELETS, RINGS, SUNGLASSES, NECKLACES): Structure physical demonstration takes following the 8-Second Scene 2 progression (0-2s reveal in outfit context, 2-4s ergonomic interaction/clasp/fit, 4-6s natural lifestyle action, 6-8s final wearable look). Uploaded product image is exclusive visual reference. Real benefit shown through physical action, no static product display, no CTA, no fake UI overlays.
${(() => {
  const accType = detectWearableAccessoryCategory(productContext);
  if (!accType) return '';
  const mold = buildWearableAccessoryDemoMold({
    productName: productContext || 'the accessory',
    accessoryType: accType,
    speechMode: format === 'short_speech' ? 'ON_CAMERA_DIALOGUE' : 'NO_DIALOGUE'
  });
  return `\n${mold.promptBlock}\n`;
})()}

REQUIRED JSON OUTPUT SCHEMA:
Return ONLY valid JSON matching this exact structure with no markdown ticks outside:

{
  "campaign_title": "Descriptive title in Portuguese (e.g., Campanha Afiliado: Shopee Clean Demo - Óculos Aviador)",
  "detected_category": "Category name in Portuguese (e.g., Óculos de Sol, Perfumaria, Vestuário, Relógios & Joias, Bolsas & Carteiras)",
  "campaign_type": "${campaignType}",
  "take_count": ${takeCount},
  "platform": "${normalizedPlatform}",
  "format": "${format}",
  "scene_style": "${sceneStyle}",
  "global_locks": {
    "person_identity_lock": "Exhaustive English instructions locking facial features, skin tone, hair texture, physique of person in Image 1",
    "product_identity_lock": "Exhaustive English instructions locking exact shape, color, pattern, material, and details of item in Image 2",
    "campaign_style_lock": "Exhaustive English styling instructions defining scene style (${sceneStyle}), lighting, camera lens, color grading, clean backgrounds"${isStoryboardActive ? `,
    "storyboard_reference_lock": "UGC STORYBOARD REFERENCE LOCK: English instructions enforcing scene direction without copying layout/grid. Product identity comes exclusively from Image 2."` : hasVisualReference ? `,
    "visual_reference_lock": "VISUAL REFERENCE LOCK: English instructions using Image 3 strictly for pose/lighting without copying identity or garments."` : ''}
  },
  "takes": [
    {
      "take_number": 1,
      "title": "Title in Portuguese (e.g., Take 1 • Gancho Visual Fundo Branco)",
      "purpose": "Visual and conversion objective of this take in Portuguese",
      "visual_action": "Concise description of the camera motion and physical action in Portuguese",
      "on_screen_text": "Short catchy Brazilian Portuguese text suggestion to overlay on screen (e.g. Olha esse detalhe, Tá na Shopee, Veja na sacolinha)",
      "optional_dialogue_pt_br": ${format === 'short_speech' ? '"Short natural spoken line in Portuguese (1-2 sentences)"' : '""'},
      "prompt_en": "Complete, standalone, high-performance English diffusion prompt for Take 1 written entirely in technical English, integrating person identity lock, product lock, scene style (${sceneStyle}), exact camera, lens, lighting, and motion. If on-screen Portuguese text is included, specify as: VISIBLE TEXT: Render only this exact Portuguese text: '[exact on-screen text]'",
      "product_lock_reminder": "Concise English reminder of product details to hold invariant in this take",
      "negative_constraints": "Specific negative tokens for this take in English"
    }
  ],
  "negative_prompt_global_en": "distorted face, changed person, altered facial features, different model, modified product design, different product color, altered accessory shape, hallucinated logos, bad anatomy, deformed hands, extra fingers, blurry textures, cluttered background${(() => {
    const tokens: string[] = [];
    const accType = detectWearableAccessoryCategory(productContext);
    if (accType) {
      const mold = buildWearableAccessoryDemoMold({
        productName: productContext || 'the accessory',
        accessoryType: accType
      });
      tokens.push(mold.negativePromptAdditions);
    }
    if (isStoryboardActive) {
      tokens.push(buildStoryboardReferenceNegativeAdditions());
    }
    const platformNegatives = buildAffiliatePlatformNegativeAdditions(normalizedPlatform);
    if (platformNegatives) {
      tokens.push(platformNegatives);
    }
    return tokens.length > 0 ? `, ${tokens.join(', ')}` : '';
  })()}"
}
`;
}

export function formatTryOnCampaignClipboard(campaign: TryOnCampaignResult): string {
  const lines: string[] = [];
  const isAffiliate = [
    'shopee_clean_demo',
    'tiktok_shop_fast_demo',
    'white_glove_packshot',
    'ugc_product_in_use',
    'before_after_comparison',
    'conversion_carousel'
  ].includes(campaign.campaign_type);

  lines.push(`=======================================================`);
  lines.push(`🎬 ${isAffiliate ? 'CAMPANHA AFILIADO' : 'CAMPANHA STORYBOARD'} — ${campaign.campaign_title.toUpperCase()}`);
  lines.push(`📦 Categoria Detectada: ${campaign.detected_category}`);
  if (campaign.platform) {
    lines.push(`🛒 Plataforma: ${getAffiliatePlatformLabel(campaign.platform)} (${campaign.platform.toUpperCase()})`);
  }
  if (campaign.format) {
    lines.push(`🎥 Formato: ${campaign.format}`);
  }
  if (campaign.scene_style) {
    lines.push(`🎨 Estilo de Cena: ${campaign.scene_style}`);
  }
  lines.push(`🔢 Quantidade de Takes: ${campaign.take_count} Takes`);
  lines.push(`=======================================================\n`);

  lines.push(`🔒 GLOBAL LOCKS`);
  lines.push(`-------------------------------------------------------`);
  lines.push(`👤 Person Identity Lock:\n${campaign.global_locks?.person_identity_lock || 'Same model identity preserved from Image 1.'}\n`);
  lines.push(`🏷️ Product / Accessory Identity Lock:\n${campaign.global_locks?.product_identity_lock || 'Same product/garment preserved from Image 2.'}\n`);
  lines.push(`✨ Commercial Style Lock:\n${campaign.global_locks?.campaign_style_lock || 'Consistent lighting, camera, and grade.'}\n`);
  if (campaign.global_locks?.storyboard_reference_lock) {
    lines.push(`🎬 Storyboard Reference Lock (Image 3):\n${campaign.global_locks.storyboard_reference_lock}\n`);
  } else if (campaign.global_locks?.visual_reference_lock) {
    lines.push(`🖼️ Visual Reference Lock (Image 3):\n${campaign.global_locks.visual_reference_lock}\n`);
  }
  if (campaign.negative_prompt_global_en) {
    lines.push(`🚫 Global Negative Constraints:\n${campaign.negative_prompt_global_en}\n`);
  }
  lines.push(`=======================================================\n`);

  campaign.takes.forEach((take) => {
    lines.push(`📽️ [TAKE ${take.take_number}] ${take.title.toUpperCase()}`);
    lines.push(`🎯 Objetivo: ${take.purpose}`);
    if (take.visual_action) {
      lines.push(`🎬 Ação Visual: ${take.visual_action}`);
    }
    if (take.on_screen_text) {
      lines.push(`💬 Texto na Tela (Sugestão): "${take.on_screen_text}"`);
    }
    if (take.optional_dialogue_pt_br) {
      lines.push(`🎙️ Fala Opcional: "${take.optional_dialogue_pt_br}"`);
    }
    lines.push(`\nPROMPT (EN):\n${take.prompt_en}\n`);
    lines.push(`🔒 Trava do Produto: ${take.product_lock_reminder}`);
    lines.push(`🚫 Restrições Negativas: ${take.negative_constraints}`);
    lines.push(`-------------------------------------------------------\n`);
  });

  return lines.join('\n');
}

export function formatSingleTakeClipboard(take: TryOnTake, globalLocks?: TryOnGlobalLocks): string {
  const lines: string[] = [];
  lines.push(`📽️ [TAKE ${take.take_number}] ${take.title.toUpperCase()}`);
  lines.push(`🎯 Objetivo: ${take.purpose}`);
  if (take.visual_action) {
    lines.push(`🎬 Ação Visual: ${take.visual_action}`);
  }
  if (take.on_screen_text) {
    lines.push(`💬 Texto na Tela: "${take.on_screen_text}"`);
  }
  if (take.optional_dialogue_pt_br) {
    lines.push(`🎙️ Fala Opcional: "${take.optional_dialogue_pt_br}"`);
  }
  lines.push(`\nPROMPT (EN):\n${take.prompt_en}\n`);
  lines.push(`🔒 Trava do Produto: ${take.product_lock_reminder}`);
  lines.push(`🚫 Restrições Negativas: ${take.negative_constraints}`);
  if (globalLocks?.product_identity_lock) {
    lines.push(`\n[Product Anchor]: ${globalLocks.product_identity_lock}`);
  }
  if (globalLocks?.storyboard_reference_lock) {
    lines.push(`\n[Storyboard Reference Anchor]: ${globalLocks.storyboard_reference_lock}`);
  } else if (globalLocks?.visual_reference_lock) {
    lines.push(`\n[Visual Reference Anchor]: ${globalLocks.visual_reference_lock}`);
  }
  return lines.join('\n');
}

