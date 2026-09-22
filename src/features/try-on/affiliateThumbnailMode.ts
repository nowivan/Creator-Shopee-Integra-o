import { AffiliatePlatform, getAffiliatePlatformConfig } from './affiliatePlatformModes';

export type ThumbnailTextMode = 'no_text' | 'with_text';

export interface AffiliateThumbnailOptions {
  platform?: AffiliatePlatform;
  textMode: ThumbnailTextMode;
  headline?: string;
  productName?: string;
}

/**
 * Builds the strict plain-text lock for headline/text overlay on the thumbnail.
 * If textMode is 'no_text' or headline is empty, strictly instructs no text overlay.
 * If textMode is 'with_text' and headline is provided, requires the exact string character-for-character
 * without translation or paraphrasing.
 */
export function buildThumbnailTextLock(
  textMode: ThumbnailTextMode,
  headline?: string
): string {
  const trimmedHeadline = headline?.trim();

  if (textMode === 'with_text' && trimmedHeadline) {
    return [
      'HEADLINE OVERLAY INSTRUCTIONS:',
      `- Render ONLY the exact text: "${trimmedHeadline}".`,
      '- Preserve the headline character-for-character in its original language.',
      '- DO NOT translate the headline into English or any other language.',
      '- DO NOT paraphrase, fix typos, or alter the wording in any way.',
      '- Render the text cleanly in a large, readable, high-contrast, modern bold typeface suitable for mobile feeds.',
      '- DO NOT add any extra words, subtitle text, price tags, coupon labels, discount percentages, or fake promotional stickers.'
    ].join('\n');
  }

  return [
    'NO TEXT OVERLAY MANDATE:',
    '- DO NOT add any text overlay, typography, captions, words, letters, numbers, badges, watermarks, or logos over the image.',
    '- The thumbnail must be completely clean and distraction-free, relying purely on visual product clarity.'
  ].join('\n');
}

/**
 * Builds negative prompt tokens blocking fake marketplace UI and false commercial claims.
 * If a custom headline is active, also blocks translated and misspelled headline variants.
 */
export function buildAffiliateThumbnailNegativePrompt(
  options: AffiliateThumbnailOptions
): string {
  const baseNegatives = [
    'fake UI',
    'fake marketplace screen',
    'fake cart icon',
    'fake Shopee UI',
    'fake TikTok UI',
    'fake Amazon UI',
    'fake Mercado Livre UI',
    'fake Magalu UI',
    'fake AliExpress UI',
    'fake Pinterest UI',
    'fake discount badge',
    'fake coupon',
    'fake price',
    'fake free shipping',
    'fake rating stars',
    'fake review count',
    'fake countdown',
    'watermark',
    'clutter',
    'unreadable text',
    'misspelled text',
    'random letters',
    'warped product',
    'wrong logo',
    'extra product',
    'duplicated product'
  ];

  const trimmedHeadline = options.headline?.trim();
  if (options.textMode === 'with_text' && trimmedHeadline) {
    baseNegatives.push(
      'translated headline',
      'English headline replacement',
      'extra text beyond the exact headline',
      'misspelled headline',
      'duplicated headline'
    );
  }

  return baseNegatives.join(', ');
}

/**
 * Builds a complete static 9:16 product thumbnail image prompt for affiliate video covers.
 * Instructions are in English, while preserving exact user-provided headline.
 */
export function buildAffiliateThumbnailPrompt(
  options: AffiliateThumbnailOptions
): string {
  const platformId = options.platform || 'universal';
  const platformConfig = getAffiliatePlatformConfig(platformId);
  const platformLabel = platformConfig ? platformConfig.label : 'Universal';

  const textLock = buildThumbnailTextLock(options.textMode, options.headline);
  const negativePrompt = buildAffiliateThumbnailNegativePrompt(options);

  return [
    'AFFILIATE VIDEO THUMBNAIL IMAGE PROMPT:',
    `Create one vertical 9:16 static product thumbnail image for ${platformLabel}.`,
    'This is a cover image for an affiliate product video.',
    'The uploaded product image is the exclusive product identity reference.',
    'Show the product large, sharp, centered and clearly recognizable.',
    'Use a clean marketplace-safe composition.',
    'Make the image visually clickable, simple and readable on a mobile feed.',
    '',
    'PRODUCT IDENTITY LOCK:',
    'Preserve exact product shape, colors, materials, proportions, finish, branding, logo position, visible details and quantity.',
    '',
    'TEXT LOCK:',
    textLock,
    '',
    'SAFETY LOCK:',
    'Do not invent or display price, discount, coupon, free shipping, delivery date, warranty, official store, original/authentic claim, stock scarcity, countdown, best seller claim, star rating, review count, certification, medical claim, technical durability claim or platform badge unless explicitly provided by the user.',
    'Do not create fake marketplace UI, fake cart icons, fake app screens, fake product page screenshots or fake platform labels.',
    '',
    'NEGATIVE PROMPT:',
    negativePrompt
  ].join('\n');
}
