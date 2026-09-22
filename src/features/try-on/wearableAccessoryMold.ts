/**
 * Wearable Accessory Demo Mold for Provador Virtual IA.
 * 
 * Adapts the operational structure of the official Scene 2 Agent prompt as a compact,
 * deterministic mold for demonstrating wearable accessories (watches, bracelets, rings, sunglasses, necklaces).
 * 
 * Key Principles:
 * - 1 scene of 8 seconds (single continuous take, 9:16 vertical, UGC smartphone look)
 * - Uploaded product image is exclusive visual reference (holds shape, color, proportions, material)
 * - Real benefit shown through physical action (no static product presentation)
 * - 0–2s / 2–4s / 4–6s / 6–8s structured progression
 * - Layered with Skeleton Watch Static Dial Lock when applicable
 * - Strict clothing exclusion: clothing items bypass this mold to preserve standard try-on pipelines.
 */

import { 
  detectSkeletonWatchStaticLock, 
  buildSkeletonWatchStaticDialLock, 
  buildSkeletonWatchNegativeAdditions,
  buildSkeletonWatchAdvancedRegionLock,
  buildSkeletonWatchAdvancedRegionNegativeAdditions
} from './skeletonWatchLock';

export type WearableAccessoryType =
  | 'watch'
  | 'bracelet'
  | 'ring'
  | 'sunglasses'
  | 'necklace'
  | 'generic_accessory';

export interface WearableAccessoryContext {
  productName: string;
  accessoryType: WearableAccessoryType;
  productDetails?: string;
  isSkeletonWatch?: boolean;
  avatarWardrobeContext?: string;
  speechMode?: 'NO_DIALOGUE' | 'ON_CAMERA_DIALOGUE';
  spokenText?: string;
}

export interface WearableAccessoryDemoMoldResult {
  promptBlock: string;
  timingBlocks: { label: string; action: string }[];
  negativePromptAdditions: string;
}

// Triggers for specific accessory types
const WATCH_TRIGGERS = ['watch', 'wristwatch', 'relógio', 'relogio', 'cronógrafo', 'cronografo', 'smartwatch'];
const BRACELET_TRIGGERS = ['bracelet', 'pulseira', 'bracelete', 'bangle'];
const RING_TRIGGERS = ['ring', 'anel', 'aliança', 'alianca'];
const SUNGLASSES_TRIGGERS = ['sunglasses', 'óculos', 'oculos', 'eyewear', 'armação', 'armacao'];
const NECKLACE_TRIGGERS = ['necklace', 'colar', 'corrente', 'gargantilha', 'pingente'];
const GENERIC_ACCESSORY_TRIGGERS = ['acessório', 'acessorio', 'wearable accessory', 'accessory'];

// Strict exclusion list for clothing items
const CLOTHING_EXCLUSIONS = [
  'shirt', 't-shirt', 'camiseta', 'blusa', 'vestido', 'dress', 
  'calça', 'calca', 'pants', 'saia', 'skirt', 'casaco', 
  'jacket', 'coat', 'shorts', 'roupa', 'clothing', 'garment'
];

function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function containsTrigger(normalizedText: string, triggers: string[]): boolean {
  return triggers.some(trigger => {
    const normTrigger = normalizeText(trigger);
    const regex = new RegExp(`(^|[^a-z0-9])${normTrigger}([^a-z0-9]|$)`, 'i');
    return regex.test(normalizedText) || normalizedText.includes(normTrigger);
  });
}

/**
 * Detects whether the input sources indicate a wearable accessory.
 * Enforces strict clothing exclusion: if clothing terms are present without explicit accessory precedence, returns null.
 */
export function detectWearableAccessoryCategory(
  ...sources: (string | undefined | null)[]
): WearableAccessoryType | null {
  const combined = sources.filter(Boolean).join(' ');
  const normalized = normalizeText(combined);
  if (!normalized) return null;

  // Check clothing exclusion
  const hasClothing = containsTrigger(normalized, CLOTHING_EXCLUSIONS);

  // If clothing is mentioned, clothing takes strict priority unless the primary term/phrase is explicitly an accessory
  if (hasClothing) {
    // Find index of first clothing term vs index of first accessory term
    const firstSource = normalizeText(sources[0]);
    const firstClothingIdx = CLOTHING_EXCLUSIONS.reduce((minIdx, item) => {
      const idx = firstSource.indexOf(normalizeText(item));
      return idx !== -1 && (minIdx === -1 || idx < minIdx) ? idx : minIdx;
    }, -1);

    const allAccessoryTriggers = [
      ...WATCH_TRIGGERS, ...SUNGLASSES_TRIGGERS, ...RING_TRIGGERS, ...BRACELET_TRIGGERS, ...NECKLACE_TRIGGERS
    ];

    const firstAccessoryIdx = allAccessoryTriggers.reduce((minIdx, item) => {
      const idx = firstSource.indexOf(normalizeText(item));
      return idx !== -1 && (minIdx === -1 || idx < minIdx) ? idx : minIdx;
    }, -1);

    // If clothing appears before accessory or no accessory in first source, deny accessory mold
    if (firstClothingIdx !== -1 && (firstAccessoryIdx === -1 || firstClothingIdx <= firstAccessoryIdx)) {
      return null;
    }
  }

  // Check accessory categories
  const hasWatch = containsTrigger(normalized, WATCH_TRIGGERS);
  if (hasWatch) return 'watch';

  const hasSunglasses = containsTrigger(normalized, SUNGLASSES_TRIGGERS);
  if (hasSunglasses) return 'sunglasses';

  const hasRing = containsTrigger(normalized, RING_TRIGGERS);
  if (hasRing) return 'ring';

  const hasBracelet = containsTrigger(normalized, BRACELET_TRIGGERS);
  if (hasBracelet) return 'bracelet';

  const hasNecklace = containsTrigger(normalized, NECKLACE_TRIGGERS);
  if (hasNecklace) return 'necklace';

  const hasGeneric = containsTrigger(normalized, GENERIC_ACCESSORY_TRIGGERS);
  if (hasGeneric && !hasClothing) return 'generic_accessory';

  return null;
}

/**
 * Generates timing blocks tailored to the specific wearable accessory type.
 */
function getTimingBlocksForAccessory(type: WearableAccessoryType, productName: string): { label: string; action: string }[] {
  const name = productName || 'the accessory';
  switch (type) {
    case 'watch':
      return [
        { label: '0–2s', action: `Reveal ${name} already worn on the wrist by gently adjusting the sleeve/cuff in natural lighting.` },
        { label: '2–4s', action: `Slow, controlled wrist turn showing the bracelet/strap, case finish, bezel and dial in sharp focus.` },
        { label: '4–6s', action: `Natural lifestyle hand gesture while keeping ${name} in continuous clean visibility.` },
        { label: '6–8s', action: `Final wearable result showing full watch, wrist, and part of the outfit in balanced aesthetic harmony.` }
      ];
    case 'bracelet':
      return [
        { label: '0–2s', action: `Reveal ${name} already worn on the wrist in an authentic natural outfit context.` },
        { label: '2–4s', action: `Subtle arm and wrist movement showing finish, fit and clasp.` },
        { label: '4–6s', action: `Natural lifestyle gesture while ${name} remains clearly visible without obstruction.` },
        { label: '6–8s', action: `Final wearable result with the bracelet integrated seamlessly into the overall look.` }
      ];
    case 'ring':
      return [
        { label: '0–2s', action: `Close-up on hand and fingers with ${name} naturally worn on the finger.` },
        { label: '2–4s', action: `Subtle finger and hand movement showing the fit, metal luster, and gemstone/material shine.` },
        { label: '4–6s', action: `Natural lifestyle hand action (holding a coffee cup, smartphone, keys, or resting hand on table).` },
        { label: '6–8s', action: `Final hand pose showing ${name} integrated with the personal style.` }
      ];
    case 'sunglasses':
      return [
        { label: '0–2s', action: `Person naturally adjusts ${name} on their face and bridge of the nose.` },
        { label: '2–4s', action: `Slight head turn in natural daylight showing the lenses, frame geometry, and temple arms.` },
        { label: '4–6s', action: `Natural lifestyle movement and confident expression while ${name} is worn comfortably.` },
        { label: '6–8s', action: `Final wearable result with full face and sunglasses clearly visible in aesthetic framing.` }
      ];
    case 'necklace':
      return [
        { label: '0–2s', action: `Reveal ${name} on the neck/chest area within a clean, complementary outfit context.` },
        { label: '2–4s', action: `Subtle gentle touch on the pendant or chain showing the fit, drape, and metallic luster.` },
        { label: '4–6s', action: `Natural torso and head movement showing how ${name} sits and moves against the collarbone/shirt.` },
        { label: '6–8s', action: `Final wearable look with ${name} centered and clearly visible.` }
      ];
    case 'generic_accessory':
    default:
      return [
        { label: '0–2s', action: `Reveal ${name} naturally worn in real-world lifestyle context.` },
        { label: '2–4s', action: `Physical interaction highlighting craftsmanship, material, texture, and ergonomic fit.` },
        { label: '4–6s', action: `Natural lifestyle motion with the product remaining fully visible throughout.` },
        { label: '6–8s', action: `Final stable wearable framing showcasing ${name} in full aesthetic clarity.` }
      ];
  }
}

/**
 * Builds the compact Scene 2-inspired wearable accessory demonstration mold.
 */
export function buildWearableAccessoryDemoMold(
  context: WearableAccessoryContext
): WearableAccessoryDemoMoldResult {
  const {
    productName,
    accessoryType,
    productDetails,
    avatarWardrobeContext,
    speechMode = 'NO_DIALOGUE',
    spokenText
  } = context;

  // Check skeleton watch condition
  const isSkeleton = context.isSkeletonWatch ?? (
    accessoryType === 'watch' && detectSkeletonWatchStaticLock(productName, productDetails)
  );

  const timingBlocks = getTimingBlocksForAccessory(accessoryType, productName);

  const speechDirective = speechMode === 'ON_CAMERA_DIALOGUE' && spokenText
    ? `The visible person speaks directly to camera in natural Brazilian Portuguese: "${spokenText.trim()}". Accurate lip sync. No external narrator.`
    : `No speech. Ambient sound only. Silent mouth, authentic real-world environmental acoustics.`;

  const timingText = timingBlocks
    .map(b => `   - ${b.label}: ${b.action}`)
    .join('\n');

  let promptBlock = `WEARABLE ACCESSORY DEMONSTRATION MOLD (8-SECOND SCENE 2 STRUCTURE):
- SPECIFICATION: Exactly one 8-second scene, vertical 9:16 aspect ratio, single continuous take, authentic Brazilian UGC smartphone aesthetic, realistic daylight/room illumination.
- PRODUCT FIDELITY: The uploaded product image is the exclusive visual reference. Preserve exact physical scale, silhouette, geometry, color tones, materials, textures, clasps, engravings, and craftsmanship.
- PHYSICAL BENEFIT IN ACTION: Demonstrate real ergonomic fit, comfort, and wearability through organic physical movement. No static product display, no infomercial poses, no detached floating product.
- CAMERA & MOTION: Natural handheld camera micro-shake, subtle optical autofocus, zero jump cuts, zero artificial transitions, zero digital zoom.
- PROGRESSION:
${timingText}
- SPEECH MODE: ${speechDirective}
${avatarWardrobeContext ? `- WARDROBE CONTEXT: ${avatarWardrobeContext}` : ''}`;

  if (accessoryType === 'watch' && isSkeleton) {
    promptBlock += `\n\n${buildSkeletonWatchStaticDialLock()}\n\n${buildSkeletonWatchAdvancedRegionLock()}`;
  }

  let negativePromptAdditions = 'no subtitles, no on-screen text, no captions, no slogan, no price, no promotion, no urgency, no scarcity, no CTA, no cart mention, no cart icon, no watermark, no app interface, no invented features, no extra accessories competing with the product, no product deformation, no random environment, no static product presentation, no person merely holding or pointing at the product, no impossible interaction, no exaggerated product size, no repeated dialogue, no jump cuts, no transitions, no digital zoom, no CGI look';

  if (accessoryType === 'watch' && isSkeleton) {
    negativePromptAdditions += `, ${buildSkeletonWatchNegativeAdditions()}, ${buildSkeletonWatchAdvancedRegionNegativeAdditions()}`;
  }

  return {
    promptBlock,
    timingBlocks,
    negativePromptAdditions
  };
}
