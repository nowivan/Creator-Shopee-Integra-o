export type StoryboardReferenceMode =
  | 'none'
  | 'storyboard_only'
  | 'product_plus_storyboard';

export type TryOnReferenceType = 
  | 'pose_style'
  | 'multi_angle'
  | 'ugc_storyboard'
  | 'editorial_storyboard';

/**
 * Builds the mandatory UGC STORYBOARD REFERENCE LOCK block.
 * Instructs AI to use the storyboard strictly for scene direction,
 * angles, poses, lighting, and UGC rhythm while forbidding copying
 * grids, numbers, UI, text, split-screen or collage layouts.
 */
export function buildStoryboardReferenceLock(): string {
  return `UGC STORYBOARD REFERENCE LOCK:
Use the uploaded storyboard image only as scene direction and production reference.
The storyboard is NOT the final video layout.
Do not copy the collage grid.
Do not create split screen.
Do not show multiple panels.
Do not show numbered labels.
Do not show circles, icons, UI elements, captions, text, or overlays from the storyboard.
Do not reproduce storyboard tiles as separate frames.
Create one normal continuous vertical video.

Use the storyboard only to understand:
- scene order
- camera angles
- hand/body poses
- product interaction
- lighting mood
- UGC style
- final commercial composition

Product identity must still come from the main clean product image.

If any product appears inside the storyboard but differs from the main product image, ignore that storyboard product identity and replace it with the exact main product.`;
}

/**
 * Builds the specific negative prompt additions when storyboard mode is active.
 * Prevents artifacts such as collage panels, number circles, and UI overlays.
 */
export function buildStoryboardReferenceNegativeAdditions(): string {
  return `collage, grid, split screen, multiple panels, storyboard panels, numbered labels, numbers, circular labels, black number circles, copied layout, UI elements, text overlay, subtitles, captions, watermark, icons, duplicated scene panels, tiled frames, comic layout, storyboard layout, app interface, graphic overlays`;
}

/**
 * Builds the standard linear 8-second vertical UGC video structure
 * inspired by storyboard scene progression.
 */
export function buildStoryboardVideoStructure(): string {
  return `Create ONE realistic vertical 9:16 UGC product video.
Single normal continuous video, not a collage.

0–2s: opening action inspired by storyboard.
2–4s: product reveal or usage action inspired by storyboard.
4–6s: close-up interaction/detail inspired by storyboard.
6–8s: final commercial result inspired by storyboard.`;
}

/**
 * Detects whether storyboard reference mode is active based on inputs.
 */
export function hasStoryboardReference(
  input?: { hasStoryboard?: boolean; mode?: StoryboardReferenceMode; referenceType?: string } | boolean | string | null
): boolean {
  if (!input) return false;
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input === 'ugc_storyboard' || input === 'storyboard_only' || input === 'product_plus_storyboard';
  }
  if (typeof input === 'object') {
    if (input.hasStoryboard === true) return true;
    if (input.mode === 'storyboard_only' || input.mode === 'product_plus_storyboard') return true;
    if (input.referenceType === 'ugc_storyboard') return true;
  }
  return false;
}

/**
 * Determines the internal StoryboardReferenceMode.
 */
export function detectStoryboardReferenceMode(options: {
  hasStoryboard: boolean;
  hasProduct: boolean;
}): StoryboardReferenceMode {
  if (!options.hasStoryboard) return 'none';
  if (!options.hasProduct) return 'storyboard_only';
  return 'product_plus_storyboard';
}
