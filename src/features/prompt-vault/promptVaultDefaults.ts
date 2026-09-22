import { PromptVaultItem } from './types';

/**
 * Default compact starter examples seeded ONLY if there is no existing vault data.
 * Lightweight, editable, without base64 or heavy dependencies.
 */
export const DEFAULT_PROMPT_VAULT_ITEMS: PromptVaultItem[] = [
  {
    id: 'vault-seed-1',
    type: 'prompt',
    title: 'Skeleton Watch Advanced Region Lock',
    category: 'Product Lock',
    destinationTool: 'Provador Virtual',
    mainPrompt: `ADVANCED SKELETON WATCH REGION LOCK:
Use very low motion for the product area. Static camera preferred: no zoom, no shake.
The entire watch dial is frozen. Treat the whole dial as a static decorative image area.
Critical region lock: Freeze the upper-left gear-shaped decorative area between 10 and 11 o’clock inside the dial. Pixel-identical frame to frame.
Full dial reference lock: Freeze entire circular watch face, hands, numerals, and subdials.`,
    negativePrompt: `rotating gear at 10 o'clock, rotating gear at 11 o'clock, moving upper-left gear, moving gears, ticking, morphing dial`,
    productContext: 'Relógios mecânicos com engrenagens expostas / skeleton / open-heart',
    tags: ['relogio', 'skeleton', 'region-lock', 'dial-freeze'],
    notes: 'Trava testada e comprovada no Provador Virtual IA.',
    favorite: true,
    status: 'approved',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    useCount: 0,
    lastUsedAt: null
  },
  {
    id: 'vault-seed-2',
    type: 'prompt',
    title: 'No Text / No Overlay Negative Prompt',
    category: 'Negative Prompt',
    destinationTool: 'Flow',
    mainPrompt: `Single continuous take, authentic Brazilian UGC smartphone aesthetic, 9:16 vertical ratio. Product in continuous physical interaction.`,
    negativePrompt: `no subtitles, no on-screen text, no captions, no slogan, no price, no promotion, no urgency, no scarcity, no CTA, no cart mention, no cart icon, no watermark, no app interface, no jump cuts, no transitions, no digital zoom`,
    productContext: 'Universal para vídeos UGC e demonstrações limpas',
    tags: ['ugc', 'clean', 'negative-prompt', 'no-text'],
    notes: 'Elimina ruídos gráficos e poluição de interface na difusão.',
    favorite: false,
    status: 'approved',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    useCount: 0,
    lastUsedAt: null
  },
  {
    id: 'vault-seed-3',
    type: 'prompt',
    title: 'Product Identity Lock',
    category: 'Product Lock',
    destinationTool: 'Creator Pro',
    mainPrompt: `Hold the exact physical item in reference image completely unchanged across all takes: exact color, tone, silhouette, cut, pattern, fabric weave, hardware, stitching, buckles, lenses, and logo placement.`,
    negativePrompt: `altered colors, invented logos, swapped materials, redesigned product, warped textures`,
    productContext: 'Preservação de fidelidade estrutural de produtos físicos',
    tags: ['fidelidade', 'marca', 'produto', 'lock'],
    notes: 'Garante que a IA não reinvente nem deforme o produto enviado.',
    favorite: false,
    status: 'tested',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    useCount: 0,
    lastUsedAt: null
  }
];
