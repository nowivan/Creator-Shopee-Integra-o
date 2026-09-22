export type TryOnOutputMode = 'single' | 'campaign' | 'thumbnail';

export type TryOnCampaignType = 
  // Traditional / Fashion
  | 'visual_storyboard'
  | 'ugc_ad'
  | 'fashion_carousel'
  | 'editorial_premium'
  // Affiliate / Conversion Presets
  | 'shopee_clean_demo'
  | 'tiktok_shop_fast_demo'
  | 'white_glove_packshot'
  | 'ugc_product_in_use'
  | 'before_after_comparison'
  | 'conversion_carousel';

export type TryOnTakeCount = 4 | 5;

export type TryOnFormat = 
  | 'no_dialogue'
  | 'text_on_screen'
  | 'short_speech'
  | 'visual_prompt_only';

export type TryOnSceneStyle = 
  | 'white_background'
  | 'holding_hand'
  | 'white_glove'
  | 'clean_table'
  | 'model_wearing'
  | 'lifestyle'
  | 'mixed';

export type TryOnPlatform = 
  | 'universal'
  | 'shopee'
  | 'amazon'
  | 'mercado_livre'
  | 'magalu'
  | 'aliexpress'
  | 'pinterest'
  | 'tiktok_shop'
  | 'generic';

export type TryOnPasteTarget = 'person' | 'garment' | 'visualReference';

export type TryOnReferenceType = 
  | 'pose_style'
  | 'multi_angle'
  | 'ugc_storyboard'
  | 'editorial_storyboard';

export type StoryboardReferenceMode =
  | 'none'
  | 'storyboard_only'
  | 'product_plus_storyboard';

export interface TryOnGlobalLocks {
  person_identity_lock: string;
  product_identity_lock: string;
  campaign_style_lock: string;
  visual_reference_lock?: string;
  storyboard_reference_lock?: string;
}

export interface TryOnTake {
  take_number: number;
  title: string;
  prompt_en: string;
  purpose: string;
  visual_action?: string;
  on_screen_text?: string;
  optional_dialogue_pt_br?: string;
  product_lock_reminder: string;
  negative_constraints: string;
}

export interface TryOnCampaignResult {
  campaign_title: string;
  detected_category: string;
  campaign_type: TryOnCampaignType;
  take_count: TryOnTakeCount;
  platform?: TryOnPlatform;
  format?: TryOnFormat;
  scene_style?: TryOnSceneStyle;
  global_locks: TryOnGlobalLocks;
  takes: TryOnTake[];
  negative_prompt_global_en?: string;
}

export interface TryOnSingleResult {
  prompt_en: string;
  clothing_details: string;
  person_details: string;
  visual_reference_details?: string;
  storyboard_reference_details?: string;
}

export interface TryOnCampaignTypeOption {
  id: TryOnCampaignType;
  label: string;
  description: string;
  icon: string;
  category: 'affiliate' | 'fashion';
  badge?: string;
  defaultSceneStyle?: TryOnSceneStyle;
  defaultPlatform?: TryOnPlatform;
}

export const TRY_ON_CAMPAIGN_TYPES: TryOnCampaignTypeOption[] = [
  // Affiliate / Marketplace Presets
  {
    id: 'shopee_clean_demo',
    label: 'Shopee Clean Demo',
    description: 'Demonstração limpa com fundo branco, mão segurando e gancho visual para conversão na Shopee.',
    icon: 'shopping-bag',
    category: 'affiliate',
    badge: 'Shopee Afiliado',
    defaultSceneStyle: 'white_background',
    defaultPlatform: 'shopee'
  },
  {
    id: 'tiktok_shop_fast_demo',
    label: 'TikTok Shop Fast Demo',
    description: 'Hook veloz no 1º segundo, cortes rápidos e gatilho de compra direto para a sacolinha/carrinho.',
    icon: 'zap',
    category: 'affiliate',
    badge: 'TikTok Shop',
    defaultSceneStyle: 'holding_hand',
    defaultPlatform: 'tiktok_shop'
  },
  {
    id: 'white_glove_packshot',
    label: 'White Glove Packshot',
    description: 'Luvas brancas premium e iluminação de estúdio para inspeção de óculos, joias, relógios e perfumes.',
    icon: 'sparkles',
    category: 'affiliate',
    badge: 'Premium Packshot',
    defaultSceneStyle: 'white_glove',
    defaultPlatform: 'shopee'
  },
  {
    id: 'ugc_product_in_use',
    label: 'UGC Produto em Uso',
    description: 'Modelo usando o produto de forma natural e autêntica focando no benefício funcional real.',
    icon: 'user-check',
    category: 'affiliate',
    badge: 'UGC Conversão',
    defaultSceneStyle: 'model_wearing',
    defaultPlatform: 'tiktok_shop'
  },
  {
    id: 'before_after_comparison',
    label: 'Antes e Depois / Comparativo',
    description: 'Contraste visual de problema x solução com prova de benefício imediata e chamada para ação.',
    icon: 'split',
    category: 'affiliate',
    badge: 'Comparativo',
    defaultSceneStyle: 'mixed',
    defaultPlatform: 'shopee'
  },
  {
    id: 'conversion_carousel',
    label: 'Carrossel de Conversão',
    description: 'Sequência de 5 slides estáticos estruturados (Capa, Benefício, Prova, Uso e Oferta CTA).',
    icon: 'images',
    category: 'affiliate',
    badge: '5 Slides E-comm',
    defaultSceneStyle: 'clean_table',
    defaultPlatform: 'generic'
  },
  // Fashion / Storyboard Presets
  {
    id: 'visual_storyboard',
    label: 'Storyboard Visual',
    description: 'Sequência dinâmica de planos e ângulos cinematográficos para demonstrar caimento e estilo.',
    icon: 'film',
    category: 'fashion',
    defaultSceneStyle: 'lifestyle',
    defaultPlatform: 'generic'
  },
  {
    id: 'ugc_ad',
    label: 'Anúncio UGC Fashion',
    description: 'Estilo autêntico para TikTok, Reels e Shopee, focado em recomendação e estilo no dia a dia.',
    icon: 'smartphone',
    category: 'fashion',
    defaultSceneStyle: 'model_wearing',
    defaultPlatform: 'tiktok_shop'
  },
  {
    id: 'fashion_carousel',
    label: 'Carrossel Fashion',
    description: 'Enquadramentos coordenados ideais para lookbooks, feeds do Instagram e catálogos.',
    icon: 'layout-grid',
    category: 'fashion',
    defaultSceneStyle: 'model_wearing',
    defaultPlatform: 'generic'
  },
  {
    id: 'editorial_premium',
    label: 'Editorial Premium',
    description: 'Iluminação de estúdio luxuosa, alta costura e composições sofisticadas de passarela.',
    icon: 'gem',
    category: 'fashion',
    defaultSceneStyle: 'lifestyle',
    defaultPlatform: 'generic'
  }
];

export const TRY_ON_FORMATS: { id: TryOnFormat; label: string; description: string }[] = [
  {
    id: 'no_dialogue',
    label: 'Sem diálogo (Com texto na tela)',
    description: 'Vídeo focado em ações visuais limpas e sugestões de textos rápidos na tela.'
  },
  {
    id: 'text_on_screen',
    label: 'Apenas texto na tela',
    description: 'Ênfase máxima em títulos e destaques visuais em português na tela.'
  },
  {
    id: 'short_speech',
    label: 'Com fala curta (Opção de voz)',
    description: 'Inclui uma fala curta em português (1-2 frases) por take além do prompt em inglês.'
  },
  {
    id: 'visual_prompt_only',
    label: 'Apenas prompt visual',
    description: 'Foco exclusivo na geração visual e movimentos de câmera técnicos.'
  }
];

export const TRY_ON_SCENE_STYLES: { id: TryOnSceneStyle; label: string }[] = [
  { id: 'white_background', label: 'Fundo branco' },
  { id: 'holding_hand', label: 'Mão segurando' },
  { id: 'white_glove', label: 'Luva branca' },
  { id: 'clean_table', label: 'Mesa clean' },
  { id: 'model_wearing', label: 'Modelo usando' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'mixed', label: 'Misto' }
];

export const TRY_ON_PLATFORMS: { id: TryOnPlatform; label: string; ctaExample: string }[] = [
  { id: 'universal', label: 'Universal (Multiplataforma)', ctaExample: 'Disponível no link / Garanta o seu' },
  { id: 'shopee', label: 'Shopee', ctaExample: 'Tá na Shopee / Veja na sacolinha' },
  { id: 'tiktok_shop', label: 'TikTok Shop', ctaExample: 'Tá no carrinho / Compre no TikTok Shop' },
  { id: 'amazon', label: 'Amazon', ctaExample: 'Disponível na Amazon / Link na bio' },
  { id: 'mercado_livre', label: 'Mercado Livre', ctaExample: 'Compre no Mercado Livre / Link no perfil' },
  { id: 'magalu', label: 'Parceiro Magalu', ctaExample: 'Tem no Magalu / Link na bio' },
  { id: 'aliexpress', label: 'AliExpress', ctaExample: 'Disponível no link / Confira os detalhes' },
  { id: 'pinterest', label: 'Pinterest', ctaExample: 'Inspire-se no link / Salve para depois' },
  { id: 'generic', label: 'Genérico (Legado)', ctaExample: 'Disponível no link / Garanta o seu' }
];
