export type AffiliatePlatform =
  | 'universal'
  | 'shopee'
  | 'amazon'
  | 'mercado_livre'
  | 'magalu'
  | 'aliexpress'
  | 'pinterest'
  | 'tiktok_shop';

export interface AffiliatePlatformConfig {
  id: AffiliatePlatform;
  label: string;
  badge: string;
  icon: string;
  tagline: string;
  videoDna: string;
  imageDna: string;
  negativePromptAdditions: string;
  ctaSuggestions: string[];
}

export const AFFILIATE_PLATFORMS: AffiliatePlatformConfig[] = [
  {
    id: 'universal',
    label: 'Universal',
    badge: 'Universal',
    icon: 'globe',
    tagline: 'Apresentação limpa e neutra sem alegações exageradas ou interfaces falsas.',
    videoDna: 'Neutral clean affiliate product presentation. Clear product visibility within the first 2 seconds, realistic and authentic physical use, balanced commercial studio/lifestyle lighting, no fake UI, no unverified claims.',
    imageDna: 'Clean balanced commercial product presentation. High product fidelity, clean background, sharp focus, natural lighting, distraction-free framing.',
    negativePromptAdditions: 'fake UI, fake marketplace interface, fake cart icon, fake price tag, fake discount seal, fake ratings, unverified claims, fake promotional badge',
    ctaSuggestions: ['Disponível no link', 'Garanta o seu', 'Veja mais detalhes']
  },
  {
    id: 'shopee',
    label: 'Shopee',
    badge: 'Shopee Video',
    icon: 'shopping-bag',
    tagline: 'UGC dinâmico, produto rápido nos primeiros 2s e apelo de uso prático.',
    videoDna: 'Dynamic UGC commerce style. Product clearly visible and in physical action within the first 2 seconds. Practical everyday benefit demonstration, friendly mobile pacing, clean negative space for legitimate shopping overlays. Avoid fake Shopee UI, fake orange cart, fake coupon stickers, fake free shipping badges.',
    imageDna: 'Vibrant, high-clarity e-commerce presentation with centered product focus, crisp texture detail, and clean composition suitable for mobile shopping feeds.',
    negativePromptAdditions: 'fake Shopee UI, fake orange cart, fake coupon stickers, fake free shipping badges, fake discount tag, fake countdown timer, fake review stars',
    ctaSuggestions: ['Tá na Shopee', 'Veja na sacolinha', 'Cupom no link']
  },
  {
    id: 'amazon',
    label: 'Amazon',
    badge: 'Amazon Affiliate',
    icon: 'package',
    tagline: 'Apresentação sóbria e confiável com foco em inspeção e qualidade dos materiais.',
    videoDna: 'Clean trustworthy product presentation. Calm and deliberate product inspection, realistic lifestyle and authentic review feel, macro material clarity, ergonomic handling. Avoid fake Prime badge, fake 5-star ratings, fake Amazon UI, exaggerated claims.',
    imageDna: 'High-trust catalog or premium lifestyle shot. Crisp focus on materials, clean balanced key lighting, accurate proportions, premium finish.',
    negativePromptAdditions: 'fake Prime badge, fake Amazon Prime logo, fake 5-star ratings, fake star icons, fake Amazon UI, exaggerated claims, fake best-seller badge',
    ctaSuggestions: ['Disponível na Amazon', 'Link na bio', 'Confira no link']
  },
  {
    id: 'mercado_livre',
    label: 'Mercado Livre',
    badge: 'Mercado Livre',
    icon: 'truck',
    tagline: 'Prático, direto e confiável com ênfase no uso real e escala do produto.',
    videoDna: 'Practical, clear, trustworthy everyday demonstration. Emphasize real-world use, accurate physical scale, and unhurried product clarity. Avoid fake Mercado Livre UI, fake Full delivery badge, fake green price tags.',
    imageDna: 'Objective, well-lit commercial studio or authentic domestic setting highlighting true product scale, clean textures, and real-life utility.',
    negativePromptAdditions: 'fake Mercado Livre UI, fake Full delivery badge, fake green price tags, fake hand-shake icon, fake free shipping tag',
    ctaSuggestions: ['Compre no Mercado Livre', 'Disponível no link', 'Veja os detalhes no link']
  },
  {
    id: 'magalu',
    label: 'Parceiro Magalu',
    badge: 'Magalu',
    icon: 'home',
    tagline: 'Acolhedor e amigável em contexto doméstico, familiar ou de presente.',
    videoDna: 'Friendly, accessible, warm domestic/lifestyle context. Everyday practical use, approachable and giftable feel, clean domestic environments (living room, vanity, kitchen). Avoid fake Magalu UI, fake Lu avatar, fake carnê/parcelas badges, unverified offers.',
    imageDna: 'Warm, welcoming domestic lifestyle photo with natural daylight, cozy ambiance, and authentic relatable styling.',
    negativePromptAdditions: 'fake Magalu UI, fake Lu avatar, fake carnê badges, fake parcelas tags, unverified offers, fake promo stickers',
    ctaSuggestions: ['Tem no Magalu', 'Confira no link', 'Link na bio']
  },
  {
    id: 'aliexpress',
    label: 'AliExpress',
    badge: 'AliExpress',
    icon: 'cpu',
    tagline: 'Foco em engenharia, textura, especificações técnicas e construção.',
    videoDna: 'Detail-driven product demo. Highlight construction, mechanical finish, materials, buttons, compartments, and precise functionality. Global e-commerce tech style. Avoid fake AliExpress UI, fake countdown timer, fake coupon banners, flash sale stickers.',
    imageDna: 'Technical macro photography or modern industrial studio packshot with razor-sharp focus on craftsmanship, seams, dials, and materials.',
    negativePromptAdditions: 'fake AliExpress UI, fake countdown timer, fake coupon banners, flash sale stickers, fake red discount badges, fake coin bonuses',
    ctaSuggestions: ['Disponível no link', 'Confira os detalhes', 'Link direto']
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    badge: 'Pinterest Idea',
    icon: 'image',
    tagline: 'Aspiracional, estético, colecionável ("saveable") e iluminação refinada.',
    videoDna: 'Aspirational, aesthetic, saveable, pinnable product discovery mood. Beautiful composition, slow elegant motion, organic transitions, sophisticated color grading, minimal aggressive CTA. Avoid fake Pinterest UI, fake save button, invasive CTA overlays.',
    imageDna: 'Editorial moodboard aesthetic. Soft natural window light, artistic negative space, sophisticated color harmonies, organic textures, highly saveable and inspirational layout.',
    negativePromptAdditions: 'fake Pinterest UI, fake save button, fake pin icon, invasive CTA overlays, aggressive commercial stickers, loud promotional graphics',
    ctaSuggestions: ['Inspire-se no link', 'Salve para depois', 'Mais ideias no link']
  },
  {
    id: 'tiktok_shop',
    label: 'TikTok Shop',
    badge: 'TikTok Shop',
    icon: 'video',
    tagline: 'Hook veloz (1–2s), estilo nativo de smartphone e demonstração física com energia.',
    videoDna: 'Fast hook, native smartphone UGC feel. Product visible and in physical action within the first 1–2 seconds. High visual energy, crisp relatable gestures, dynamic camera engagement. Avoid fake TikTok UI, fake yellow cart, fake discount badges, fake follower counters.',
    imageDna: 'Dynamic social-first portrait shot with bright modern lighting, direct creator-product engagement, and strong visual pop.',
    negativePromptAdditions: 'fake TikTok UI, fake yellow cart, fake discount badges, fake follower counters, fake live stickers, fake floating hearts',
    ctaSuggestions: ['Tá no carrinho amarelo', 'Link na sacolinha', 'Compre agora']
  }
];

const PLATFORM_MAP: Record<AffiliatePlatform, AffiliatePlatformConfig> = AFFILIATE_PLATFORMS.reduce(
  (acc, curr) => {
    acc[curr.id] = curr;
    return acc;
  },
  {} as Record<AffiliatePlatform, AffiliatePlatformConfig>
);

/**
 * Normalizes input platform string or legacy values ('generic' -> 'universal').
 */
export function normalizeAffiliatePlatform(platform?: string | null): AffiliatePlatform {
  if (!platform) return 'universal';
  const clean = platform.toLowerCase().trim();
  if (clean === 'generic') return 'universal';
  if (clean in PLATFORM_MAP) {
    return clean as AffiliatePlatform;
  }
  return 'universal';
}

export function getAffiliatePlatformConfig(platform: AffiliatePlatform | string): AffiliatePlatformConfig {
  const norm = normalizeAffiliatePlatform(platform);
  return PLATFORM_MAP[norm] || PLATFORM_MAP.universal;
}

export function getAffiliatePlatformLabel(platform: AffiliatePlatform | string): string {
  const cfg = getAffiliatePlatformConfig(platform);
  return cfg.label;
}

export function buildAffiliateClaimSafetyLock(): string {
  return `AFFILIATE CLAIM SAFETY LOCK:
Do not invent or display price, discount, coupon, free shipping, delivery date, warranty, official store, original/authentic claims, stock scarcity, countdown, star rating, review count, certification, medical claims, waterproof claims, durability claims or platform badges unless explicitly provided by the user.
Do not generate fake marketplace UI, fake cart icons, fake app screens, fake rating stars, fake discount seals or fake platform labels.
Use only safe generic affiliate language and visual presentation.`;
}

export function buildAffiliatePlatformVideoGuidance(platform: AffiliatePlatform | string): string {
  const cfg = getAffiliatePlatformConfig(platform);
  return `AFFILIATE PLATFORM MODE (${cfg.label.toUpperCase()}):
- Platform DNA: ${cfg.videoDna}
- Safe CTA Tone: ${cfg.ctaSuggestions.join(' / ')}
- Zero Fake UI Mandate: Do not draw fake app buttons, fake cart icons, fake discount tags, or platform logos on screen.`;
}

export function buildAffiliatePlatformImageGuidance(platform: AffiliatePlatform | string): string {
  const cfg = getAffiliatePlatformConfig(platform);
  return `AFFILIATE PLATFORM MODE (${cfg.label.toUpperCase()}):
- Image Composition DNA: ${cfg.imageDna}
- Presentation Focus: Clear product identity, authentic textures, realistic environment, distraction-free framing.
- Zero Fake UI Mandate: Do not draw fake app frames, fake cart icons, fake price tags, or marketplace badges.`;
}

export function buildAffiliatePlatformNegativeAdditions(platform: AffiliatePlatform | string): string {
  const cfg = getAffiliatePlatformConfig(platform);
  return cfg.negativePromptAdditions;
}
