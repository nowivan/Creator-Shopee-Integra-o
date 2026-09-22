/**
 * Surgical Static Dial Lock for Skeleton / Open-Heart Watches in Provador Virtual IA.
 * 
 * Prevents AI diffusion and video generation models from animating, rotating, or simulating motion
 * on visible internal gears, mechanical balance wheels, hands, or exposed mechanisms of skeleton watches.
 * 
 * This rule applies ONLY when the product analysis or user product text contains signs of skeleton/open-heart watches.
 * It is NOT applied globally to all accessories or regular watches unless triggered.
 */

const SKELETON_WATCH_TRIGGERS: string[] = [
  'skeleton watch',
  'open-heart watch',
  'open heart watch',
  'transparent dial watch',
  'visible internal gears',
  'exposed mechanics',
  'mechanical watch face',
  'tourbillon-style detail',
  'tourbillon style',
  'tourbillon',
  'visible gears inside watch',
  'engrenagens internas visíveis',
  'engrenagens internas visiveis',
  'mostrador transparente',
  'relógio skeleton',
  'relogio skeleton',
  'relógio esqueleto',
  'relogio esqueleto',
  'relógio com engrenagens',
  'relogio com engrenagens',
  'relógio automático com mecanismo aparente',
  'relogio automatico com mecanismo aparente',
  'mecanismo aparente',
  'engrenagens aparentes',
  'open heart dial',
  'skeleton dial',
  'exposed cogs',
  'visible cogs'
];

/**
 * Detects if the product analysis, product title, description, or preset guidelines represent a skeleton/open-heart watch.
 */
export function detectSkeletonWatchStaticLock(...sources: (string | undefined | null)[]): boolean {
  const combinedText = sources
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // normalize accents for robust matching

  // If explicitly negated (e.g. "sem engrenagens aparentes", "without visible gears", "sem mecanismo aparente")
  const negatedPatterns = [
    'sem engrenagens',
    'sem mecanismo',
    'sem esqueleto',
    'without visible gears',
    'without exposed mechanics',
    'no exposed gears',
    'no visible gears'
  ];

  if (negatedPatterns.some(neg => combinedText.includes(neg))) {
    return false;
  }

  return SKELETON_WATCH_TRIGGERS.some(trigger => {
    const normalizedTrigger = trigger
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return combinedText.includes(normalizedTrigger);
  });
}

/**
 * Builds the exact static dial lock instruction text to be injected into the Product Object Lock / Product Fidelity section.
 */
export function buildSkeletonWatchStaticDialLock(): string {
  return `SKELETON WATCH STATIC DIAL LOCK:
The product is a watch with visible internal mechanics. The entire watch dial must remain completely static from the first frame to the last frame.

All visible gears, exposed mechanics, tourbillon-style details, hands, second hand, Roman numerals, subdials, markings, logo, date window and inner dial components are visual design details only.

Do not animate, rotate, tick, oscillate, spin, flicker, morph or simulate any internal mechanical activity.

The watch face must remain pixel-perfect static. Only the wearer’s hand/wrist, camera movement, background motion, and soft external light reflections on the outer glass, case or bracelet may move.

FORBIDDEN MOTION ZONES:
- all visible internal gears
- exposed mechanical layers
- tourbillon-style cage/details
- hour/minute/second hands
- Roman numerals
- subdials
- logo/brand markings
- inner dial texture
- date window if visible

ALLOWED MOTION ZONES:
- natural hand/wrist micro-movement
- subtle camera movement
- background motion
- soft light reflections on outer case, bracelet or glass only`;
}

/**
 * Builds negative prompt tokens specifically blocking gear animation and ticking hands on skeleton watches.
 */
export function buildSkeletonWatchNegativeAdditions(): string {
  return 'moving gears, rotating gears, spinning gears, spinning tourbillon, ticking hands, moving watch hands, moving second hand, animated internal mechanism, internal gear motion, oscillating balance wheel, animated skeleton movement, flickering gears, flickering dial, morphing dial, warped Roman numerals, changing numerals, moving subdials, changing logo, moving brand text, invented mechanical activity inside the watch, product face animation';
}

/**
 * Builds the Advanced Region Lock specifically freezing the 10-11 o'clock upper-left gear and full dial reference.
 */
export function buildSkeletonWatchAdvancedRegionLock(): string {
  return `ADVANCED SKELETON WATCH REGION LOCK:
Use very low motion for the product area. Static camera preferred: no zoom, no shake.

The entire watch dial is frozen. No movement on any internal dial parts. Treat the whole dial as a static decorative image area, not a working mechanism.

Critical region lock:
Freeze the upper-left gear-shaped decorative area between 10 and 11 o’clock inside the dial. This region must not rotate, flicker, shimmer, crawl, pulse, morph, shift, or animate. Keep it pixel-identical frame to frame.

Full dial reference lock:
Freeze the entire circular watch face, including all gear-shaped details, hands, numerals, logo, subdials, screws, date window and inner decorative textures. Everything inside the dial must remain static and unchanged.

Allowed motion:
- fingers slightly adjusting grip
- very subtle wrist/hand micro-movement
- gentle reflections only on outer glass, case and bracelet
- background softness

Forbidden motion:
- critical upper-left gear between 10 and 11 o’clock
- any part inside the watch face
- all gear-shaped dial details
- all watch hands
- Roman numerals
- logo/brand text
- subdials
- date window

The watch may move only as one rigid object with the hand or wrist. No internal dial element may move independently.`;
}

/**
 * Builds negative prompt tokens specifically targeting the upper-left 10-11 o'clock gear and advanced region motion.
 */
export function buildSkeletonWatchAdvancedRegionNegativeAdditions(): string {
  return "rotating gear at 10 o'clock, rotating gear at 11 o'clock, moving upper-left gear, animated upper-left dial detail, flickering upper-left gear, shimmering upper-left gear, crawling texture at 10 o'clock, pulsing upper-left gear, shifting upper-left gear, moving gears, gear animation, animated mechanism, working mechanism, watch hands moving, ticking, dial flickering, dial warping, morphing dial, moving Roman numerals, moving subdials, changing logo, changing date window";
}

