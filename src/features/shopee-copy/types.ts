/**
 * CREATOR PRO — INDEPENDENT COPY AGENT
 * DEDICATED SHOPEE COPY MODULE — TYPE DEFINITIONS
 * 
 * Phase 1: Core Engine + Safe Handoff Foundation
 * 
 * Invariants:
 * 1. Structure and Style MUST remain independent.
 * 2. Character bounds: 160 to 175 characters per scene (sweet spot 168-172).
 * 3. Platform vocabulary strictly accommodates Shopee idioms (produto marcado, sacolinha, etc.).
 * 4. "carrinho laranja" is strictly forbidden in Shopee mode.
 */

import { CommercialEvidence, DEFAULT_COMMERCIAL_EVIDENCE } from '../agente-de-copy-clean/types';

export enum ShopeeCopyStructure {
  AUTO = 'AUTO',
  PRODUCT_IN_USE = 'PRODUCT_IN_USE',
  ACHADINHO_DISCOVERY = 'ACHADINHO_DISCOVERY',
  PROBLEM_SOLUTION = 'PROBLEM_SOLUTION',
  FEATURE_TO_BENEFIT = 'FEATURE_TO_BENEFIT',
  PERSONAL_REVIEW = 'PERSONAL_REVIEW',
  BEFORE_AFTER = 'BEFORE_AFTER',
  WORTH_IT = 'WORTH_IT',
  OFFER_OPPORTUNITY = 'OFFER_OPPORTUNITY',
  GIFT_OCCASION = 'GIFT_OCCASION',
  ORGANIZATION_PRACTICALITY = 'ORGANIZATION_PRACTICALITY'
}

export enum ShopeeCopyStyle {
  AUTO = 'AUTO',
  UGC_NATURAL = 'UGC_NATURAL',
  ACHADINHO_SHOPEE = 'ACHADINHO_SHOPEE',
  PERSONAL_REVIEW = 'PERSONAL_REVIEW',
  LIFESTYLE = 'LIFESTYLE',
  DIRECT = 'DIRECT',
  ENTHUSIASTIC = 'ENTHUSIASTIC',
  CONSULTATIVE = 'CONSULTATIVE',
  DEMONSTRATION = 'DEMONSTRATION',
  LIGHT_OFFER = 'LIGHT_OFFER'
}

export enum ShopeeCTAType {
  PRODUTO_MARCADO = 'PRODUTO_MARCADO',
  LINK_SHOPEE = 'LINK_SHOPEE',
  SACOLINHA = 'SACOLINHA',
  ICONE_PRODUTO = 'ICONE_PRODUTO',
  PLATFORM_NEUTRAL = 'PLATFORM_NEUTRAL'
}

export enum ShopeeCopyOutputMode {
  FULL_COPY = 'FULL_COPY',
  SCENE_2 = 'SCENE_2',
  SCENE_3 = 'SCENE_3',
  SCENE_2_AND_3 = 'SCENE_2_AND_3'
}

export interface ShopeeOutputModeDefinition {
  mode: ShopeeCopyOutputMode;
  label: string;
  description: string;
}

export const SHOPEE_OUTPUT_MODE_DEFINITIONS: Record<ShopeeCopyOutputMode, ShopeeOutputModeDefinition> = {
  [ShopeeCopyOutputMode.FULL_COPY]: {
    mode: ShopeeCopyOutputMode.FULL_COPY,
    label: 'Copy Completa',
    description: 'Pacote completo com Cena 2 (demonstração) e Cena 3 (fechamento/CTA Shopee).'
  },
  [ShopeeCopyOutputMode.SCENE_2]: {
    mode: ShopeeCopyOutputMode.SCENE_2,
    label: 'Cena 2',
    description: 'Foco na narrativa de demonstração e benefícios reais no cotidiano (160–175 caracteres).'
  },
  [ShopeeCopyOutputMode.SCENE_3]: {
    mode: ShopeeCopyOutputMode.SCENE_3,
    label: 'Cena 3',
    description: 'Foco na chamada de fechamento, aversão à perda e CTA Shopee (160–175 caracteres).'
  },
  [ShopeeCopyOutputMode.SCENE_2_AND_3]: {
    mode: ShopeeCopyOutputMode.SCENE_2_AND_3,
    label: 'Cena 2 + Cena 3',
    description: 'Pares sincronizados de Cena 2 e Cena 3 ritmados com alta precisão.'
  }
};

export interface ShopeeCommercialEvidence extends CommercialEvidence {
  hasExplicitAuthenticity?: boolean;
  hasExplicitReviews?: boolean;
}

export enum ShopeePreset {
  SHOPEE_NATIVE_CREATOR = 'SHOPEE_NATIVE_CREATOR'
}

export const SHOPEE_NATIVE_CREATOR_STEPS = [
  'Product in Use',
  'Feature Demonstration',
  'Practical Benefit',
  'Personal Opinion',
  'Native Shopee CTA'
] as const;

export interface ShopeePresetDefinition {
  id: ShopeePreset | 'SHOPEE_NATIVE_CREATOR';
  label: string;
  badge: string;
  description: string;
  narrativeFlow: string[];
  preferredStructures: ShopeeCopyStructure[];
  defaultStructure: ShopeeCopyStructure;
  defaultStyle: ShopeeCopyStyle;
  defaultCta: ShopeeCTAType;
  defaultOutputMode: ShopeeCopyOutputMode;
}

export const SHOPEE_PRESET_DEFINITIONS: Record<ShopeePreset, ShopeePresetDefinition> = {
  [ShopeePreset.SHOPEE_NATIVE_CREATOR]: {
    id: ShopeePreset.SHOPEE_NATIVE_CREATOR,
    label: 'Shopee Native Creator',
    badge: 'Prioridade Oficial Shopee',
    description: 'Prioriza a estrutura de retenção orgânica recomendada pela Shopee: Produto em Uso → Demonstração do Diferencial → Benefício Prático → Opinião Pessoal → CTA Nativo.',
    narrativeFlow: [
      'Produto em Uso (Product in Use)',
      'Demonstração do Diferencial (Feature Demonstration)',
      'Benefício Prático (Practical Benefit)',
      'Opinião Pessoal (Personal Opinion)',
      'CTA Nativo Shopee (Native Shopee CTA)'
    ],
    preferredStructures: [
      ShopeeCopyStructure.PRODUCT_IN_USE,
      ShopeeCopyStructure.FEATURE_TO_BENEFIT,
      ShopeeCopyStructure.PERSONAL_REVIEW
    ],
    defaultStructure: ShopeeCopyStructure.PRODUCT_IN_USE,
    defaultStyle: ShopeeCopyStyle.UGC_NATURAL,
    defaultCta: ShopeeCTAType.PRODUTO_MARCADO,
    defaultOutputMode: ShopeeCopyOutputMode.FULL_COPY
  }
};

export interface ShopeeCopyContext {
  productName: string;
  category?: string;
  productFacts: string[];
  productVisibleDetails: string[];
  evidence: ShopeeCommercialEvidence;
  targetAudience?: string;
  structure?: ShopeeCopyStructure;
  style?: ShopeeCopyStyle;
  ctaType?: ShopeeCTAType;
  outputMode?: ShopeeCopyOutputMode;
  preset?: ShopeePreset | 'SHOPEE_NATIVE_CREATOR';
  rawImageBase64?: string;
  imageMimeType?: string;
}

export interface ShopeeCopyVariation {
  id: number;
  scene2: string;
  scene3: string;
  structure: ShopeeCopyStructure;
  style: ShopeeCopyStyle;
  ctaType: ShopeeCTAType;
  scene2CharCount: number;
  scene3CharCount: number;
  isValid: boolean;
  validationErrors?: string[];
  repaired?: boolean;
}

export interface ShopeeCopyDiagnosticTrace {
  timestamp: string;
  executionTimeMs: number;
  productName: string;
  structureUsed: ShopeeCopyStructure;
  styleUsed: ShopeeCopyStyle;
  ctaTypeUsed: ShopeeCTAType;
  evidence: ShopeeCommercialEvidence;
  initialGeneratedCount: number;
  validCount: number;
  repairsAppliedCount: number;
  violationsSummary: Record<string, number>;
}

export interface ShopeeCopyResult {
  ok: boolean;
  variations: ShopeeCopyVariation[];
  evidence: ShopeeCommercialEvidence;
  productName: string;
  errorMessage?: string;
  diagnosticTrace?: ShopeeCopyDiagnosticTrace;
}

export enum ShopeeProductArchetype {
  ORGANIZER = 'ORGANIZER',
  KITCHEN_TOOL = 'KITCHEN_TOOL',
  BEAUTY_ACCESSORY = 'BEAUTY_ACCESSORY',
  ELECTRONICS = 'ELECTRONICS',
  HOME_STORAGE = 'HOME_STORAGE',
  CLEANING_TOOL = 'CLEANING_TOOL',
  FASHION_ACCESSORY = 'FASHION_ACCESSORY',
  PERSONAL_CARE = 'PERSONAL_CARE',
  PET_ACCESSORY = 'PET_ACCESSORY',
  OTHER = 'OTHER'
}

export type ShopeeDetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ShopeeProductDetectionResult {
  productName: string;
  productCategory: string;
  productArchetype: ShopeeProductArchetype;
  canonicalColor?: string;
  observableDetails: string[];
  knownPhysicalFacts: string[];
  visibleBenefits: string[];
  functionalContext: string;
  confidence: ShopeeDetectionConfidence;
}

export interface ShopeeCopySavedSession {
  schemaVersion: 1;
  savedAt: number;
  productContext: string;
  productImagePreview?: string;
  selectedStructure: ShopeeCopyStructure;
  selectedStyle: ShopeeCopyStyle;
  selectedCtaType: ShopeeCTAType;
  selectedOutputMode?: ShopeeCopyOutputMode;
  selectedPreset?: ShopeePreset | 'SHOPEE_NATIVE_CREATOR';
  variations: ShopeeCopyVariation[];
  selectedVariationId?: number;
  selectedScene3Copy?: string;
  usedVariationIds?: number[];
  customNotes?: string;
  detectionResult?: ShopeeProductDetectionResult;
  detectionConfidence?: ShopeeDetectionConfidence;
  detectionSource?: 'upload' | 'drop' | 'paste';
  lastAnalyzedImageId?: string;
}

export const SHOPEE_MIN_CHARS = 160;
export const SHOPEE_MAX_CHARS = 175;
export const SHOPEE_SWEET_SPOT_MIN = 168;
export const SHOPEE_SWEET_SPOT_MAX = 172;

export const DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE: ShopeeCommercialEvidence = {
  ...DEFAULT_COMMERCIAL_EVIDENCE,
  hasExplicitAuthenticity: false,
  hasExplicitReviews: false
};

export const SHOPEE_SESSION_KEY = 'creator_pro_shopee_copy_session_v1';
