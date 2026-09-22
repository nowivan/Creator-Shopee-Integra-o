import { PresetDefinition, PresetCategory, PresetCategoryInfo } from './types';
import { AFFILIATE_PRESETS } from './presets/affiliate';
import { PRODUCT_PRESETS } from './presets/product';
import { UGC_PRESETS } from './presets/ugc';
import { FASHION_PRESETS } from './presets/fashion';
import { BEAUTY_PRESETS } from './presets/beauty';
import { CINEMATIC_PRESETS } from './presets/cinematic';
import { SOCIAL_PRESETS } from './presets/social';
import { CAMERA_PRESETS } from './presets/camera';
import { LIGHTING_PRESETS } from './presets/lighting';
import { BACKGROUND_PRESETS } from './presets/background';
import { TYPOGRAPHY_PRESETS } from './presets/typography';
import { TECHNICAL_PRESETS } from './presets/technical';
import { EDITING_PRESETS } from './presets/editing';

// Combine all preset collections into a single unified master array
export const MASTER_PRESETS: PresetDefinition[] = [
  ...AFFILIATE_PRESETS,
  ...PRODUCT_PRESETS,
  ...UGC_PRESETS,
  ...FASHION_PRESETS,
  ...BEAUTY_PRESETS,
  ...CINEMATIC_PRESETS,
  ...SOCIAL_PRESETS,
  ...CAMERA_PRESETS,
  ...LIGHTING_PRESETS,
  ...BACKGROUND_PRESETS,
  ...TYPOGRAPHY_PRESETS,
  ...TECHNICAL_PRESETS,
  ...EDITING_PRESETS
];

// Quick O(1) map by code
export const PRESET_BY_CODE = new Map<string, PresetDefinition>(
  MASTER_PRESETS.map((preset) => [preset.code.toLowerCase(), preset])
);

// Category Definitions with Portuguese labels and Lucide icon hints
export const PRESET_CATEGORIES: PresetCategoryInfo[] = [
  {
    id: 'affiliate_marketplace',
    label: 'Afiliados & Marketplace',
    icon: 'ShoppingBag',
    description: 'Criativos otimizados para conversão em TikTok Shop, Shopee Video e marketplaces.'
  },
  {
    id: 'product_packshot',
    label: 'Produtos & Packshots',
    icon: 'Box',
    description: 'Fotos de produto em fundo limpo, estúdio, luvas brancas e iluminação comercial.'
  },
  {
    id: 'ugc_lifestyle',
    label: 'UGC & Estilo de Vida',
    icon: 'Users',
    description: 'Estética espontânea de usuário real gravando no dia a dia com celular.'
  },
  {
    id: 'tryon_fashion',
    label: 'Provador Virtual & Moda',
    icon: 'Shirt',
    description: 'Vestimenta de roupas, acessórios, calçados e joias com preservação de caimento.'
  },
  {
    id: 'beauty_cosmetics',
    label: 'Beleza & Cosméticos',
    icon: 'Sparkles',
    description: 'Demonstrações de skincare, maquiagens, texturas e fragrâncias de luxo.'
  },
  {
    id: 'cinematic_poster',
    label: 'Cinema & Pôsteres',
    icon: 'Film',
    description: 'Pôsteres teatrais, iluminação Chiaroscuro, capas de streaming e key art oficial.'
  },
  {
    id: 'social_thumbnail',
    label: 'Social & Thumbnails',
    icon: 'LayoutGrid',
    description: 'Capas de YouTube de alto CTR, capas de Reels, TikTok e banners de conversão.'
  },
  {
    id: 'camera_angle',
    label: 'Câmera & Enquadramento',
    icon: 'Camera',
    description: 'Ângulos de visão, distâncias focais, movimentos de câmera e planos de cinema.'
  },
  {
    id: 'lighting_mood',
    label: 'Iluminação & Atmosfera',
    icon: 'Sun',
    description: 'Setups de estúdio, luz natural de janela, contraluz dourado e efeitos visuais.'
  },
  {
    id: 'background_scene',
    label: 'Cenários & Ambientes',
    icon: 'Image',
    description: 'Fundos de estúdio, salas modernas, ruas europeias e banheiros de spa.'
  },
  {
    id: 'text_typography',
    label: 'Tipografia & Textos',
    icon: 'Type',
    description: 'Estruturação de títulos, créditos de cinema, taglines e selos promocionais.'
  },
  {
    id: 'technical_3d',
    label: 'Técnico, 3D & Diagramas',
    icon: 'Layers',
    description: 'Renders 3D Octane, plantas baixas, blueprints, cortes de engenharia e wireframes.'
  },
  {
    id: 'editing_transform',
    label: 'Edição & Transformação',
    icon: 'Wand2',
    description: 'Troca de fundo, reiluminação, expansão de formato e upscale de texturas.'
  }
];

// LocalStorage helpers for Favorites
const FAVORITES_STORAGE_KEY = 'creator_pro_preset_favorites';
const RECENTS_STORAGE_KEY = 'creator_pro_preset_recents';

export function getFavoritePresetCodes(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavoritePreset(code: string): string[] {
  try {
    const current = getFavoritePresetCodes();
    const exists = current.includes(code);
    const updated = exists ? current.filter((c) => c !== code) : [...current, code];
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function isFavoritePreset(code: string): boolean {
  return getFavoritePresetCodes().includes(code);
}

export function getRecentPresetCodes(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordRecentPreset(code: string): string[] {
  try {
    const current = getRecentPresetCodes().filter((c) => c !== code);
    const updated = [code, ...current].slice(0, 10); // Keep max 10
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
