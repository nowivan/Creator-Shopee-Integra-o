// ────────────────────────────────━━━ GLOBAL PRESET LIBRARY TYPES ━━━────────────────────────────────

export type PresetCategory =
  | 'affiliate_marketplace'
  | 'product_packshot'
  | 'ugc_lifestyle'
  | 'tryon_fashion'
  | 'beauty_cosmetics'
  | 'cinematic_poster'
  | 'social_thumbnail'
  | 'luxury_editorial'
  | 'camera_angle'
  | 'lighting_mood'
  | 'background_scene'
  | 'text_typography'
  | 'technical_3d'
  | 'editing_transform';

export type PresetOutputMode =
  | 'single_prompt'
  | 'storyboard'
  | 'campaign'
  | 'carousel'
  | 'video_sequence'
  | 'poster'
  | 'thumbnail';

export type CompatibleModule =
  | 'virtual_tryon'
  | 'creative_director'
  | 'cinematic_engine'
  | 'visual_reference'
  | 'copy_master'
  | 'script_refiner'
  | 'image_generator'
  | 'reverse_engineering';

export type PresetModule = CompatibleModule;

export type PresetChannel =
  | 'Shopee'
  | 'TikTok Shop'
  | 'Amazon'
  | 'Pinterest'
  | 'Mercado Livre'
  | 'Magalu'
  | 'AliExpress'
  | 'SHEIN'
  | 'Facebook'
  | 'Instagram'
  | 'YouTube'
  | 'Generic';

export interface PresetTakeTemplate {
  takeNumber?: number;
  title: string;
  objective: string;
  visualAction: string;
  cameraFraming: string;
  productFocus: string;
  onScreenTextSuggestion?: string;
  dialogueSuggestionPtBr?: string;
  promptAdditionEn?: string;
}

export interface PresetDefinition {
  code: string; // e.g. "/shopee-clean-demo"
  label: string; // Portuguese label
  category: PresetCategory;
  description: string;
  bestFor: string[];
  compatibleModules: CompatibleModule[];
  outputModes: PresetOutputMode[];
  promptLanguage: 'en';
  uiLanguage: 'pt-BR';
  channel?: PresetChannel;
  visualDNA: string[];
  commercialDNA?: string[];
  requiredInputs?: string[];
  optionalInputs?: string[];
  defaultTakes?: number;
  takeStructure?: PresetTakeTemplate[];
  promptAdditions?: string[];
  negativePromptAdditions?: string[];
  ctaSuggestions?: string[];
  tags: string[];
  
  // Specific Module Adaptations (Optional Hints)
  suggestedCampaignType?: string;
  suggestedSceneStyle?: string;
  suggestedFormat?: string;
  suggestedPlatform?: string;
  badge?: string;
}

export interface ExpandedPreset {
  preset: PresetDefinition;
  code: string;
  label: string;
  category: PresetCategory;
  categoryLabel: string;
  description: string;
  channel?: PresetChannel;
  promptAdditionsEn: string;
  negativePromptAdditionsEn: string;
  visualDNAList: string[];
  commercialDNAList: string[];
  ctaSuggestions: string[];
  takeStructure?: PresetTakeTemplate[];
  isDirectlyCompatible: boolean;
  compatibilityNotice?: string;
  suggestedCampaignType?: string;
  suggestedSceneStyle?: string;
  suggestedFormat?: string;
  suggestedPlatform?: string;
}

export interface PresetCategoryMeta {
  id: PresetCategory;
  label: string;
  icon: string;
  description: string;
  badgeColor?: string;
}

export type PresetCategoryInfo = PresetCategoryMeta;

export const PRESET_CATEGORIES_METADATA: PresetCategoryMeta[] = [
  {
    id: 'affiliate_marketplace',
    label: 'Afiliado & Marketplaces',
    icon: 'shopping-bag',
    description: 'Presets de conversão para Shopee, TikTok Shop, Amazon, Mercado Livre e SHEIN.',
    badgeColor: 'amber'
  },
  {
    id: 'product_packshot',
    label: 'Packshot & Produto',
    icon: 'package',
    description: 'Fotografia de estúdio, iluminação limpa, macros e fundo infinito.',
    badgeColor: 'blue'
  },
  {
    id: 'ugc_lifestyle',
    label: 'UGC & Lifestyle',
    icon: 'video',
    description: 'Estética autêntica de criador, selfies, testes de produto e formato nativo.',
    badgeColor: 'green'
  },
  {
    id: 'tryon_fashion',
    label: 'Provador & Moda',
    icon: 'sparkles',
    description: 'Lookbooks, editoriais, trocas de roupa e travas de caimento/tecido.',
    badgeColor: 'purple'
  },
  {
    id: 'beauty_cosmetics',
    label: 'Beleza & Cosméticos',
    icon: 'heart',
    description: 'Textura na pele, frascos de luxo, rotinas de skincare e maquiagem.',
    badgeColor: 'pink'
  },
  {
    id: 'cinematic_poster',
    label: 'Pôster & Cinema',
    icon: 'clapperboard',
    description: 'Pôsteres teatrais, key arts, capas dramáticas e estética cinematográfica.',
    badgeColor: 'red'
  },
  {
    id: 'social_thumbnail',
    label: 'Thumbnails & Social',
    icon: 'image',
    description: 'Capas de alto clique para YouTube, Reels, TikTok e Stories.',
    badgeColor: 'indigo'
  },
  {
    id: 'luxury_editorial',
    label: 'Editorial & Luxo',
    icon: 'crown',
    description: 'Haute couture, iluminação chiaroscuro e revistas de alta moda.',
    badgeColor: 'yellow'
  },
  {
    id: 'camera_angle',
    label: 'Câmera & Enquadramento',
    icon: 'camera',
    description: 'Ângulos, movimentos de lente, planos médios, macros e closes.',
    badgeColor: 'cyan'
  },
  {
    id: 'lighting_mood',
    label: 'Luz & Atmosfera',
    icon: 'sun',
    description: 'Iluminação de estúdio, luz volumétrica, neon, rim light e mood.',
    badgeColor: 'orange'
  },
  {
    id: 'background_scene',
    label: 'Cenário & Fundo',
    icon: 'map-pin',
    description: 'Fundos brancos, mesas limpas, ruas urbanas e interiores luxuosos.',
    badgeColor: 'teal'
  },
  {
    id: 'text_typography',
    label: 'Tipografia & Textos',
    icon: 'type',
    description: 'Títulos impactantes, créditos de pôster, terços inferiores e chamadas.',
    badgeColor: 'violet'
  },
  {
    id: 'technical_3d',
    label: 'Técnico, 3D & Diagrama',
    icon: 'box',
    description: 'Renders isométricos, wireframes, plantas técnicas e cutaways.',
    badgeColor: 'emerald'
  },
  {
    id: 'editing_transform',
    label: 'Edição & Transformação',
    icon: 'sliders',
    description: 'Restauração, upscale, remoção de fundo e colorização.',
    badgeColor: 'fuchsia'
  }
];

export const MODULE_NAMES: Record<CompatibleModule, string> = {
  virtual_tryon: 'Provador Virtual IA',
  creative_director: 'Diretor Criativo',
  cinematic_engine: 'Cinematic Engine',
  visual_reference: 'Referência Visual & DNA',
  copy_master: 'Copy Master',
  script_refiner: 'Refinador de Roteiros',
  image_generator: 'Gerador de Imagens',
  reverse_engineering: 'Engenharia Reversa'
};
