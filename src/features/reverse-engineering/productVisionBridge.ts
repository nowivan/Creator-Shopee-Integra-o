/**
 * PRODUCT VISION DATA BRIDGE — ETAPA 4A
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Conectar os dados estruturados de visão de produto (ProductVisionData de cinematic/visionAnalyzer),
 * os dados fornecidos pelo usuário e os payloads legados da Engenharia Reversa (handleAutoFillProduct/newProductPayload),
 * normalizando-os para o contrato canônico ProductInjectionContext.
 * 
 * Princípios:
 * 1. Pura, determinística, imutável e null-safe.
 * 2. Prioridade de fontes (ProductVisionData > Extração Visual > User Input > Legacy Payload).
 * 3. Separação rigorosa entre Estrutura Física do Produto e Claims Comerciais.
 * 4. Rastreabilidade de origem de dados (USER_PROVIDED, VISION_OBSERVED, LEGACY_AI_INFERRED, UNKNOWN).
 * 5. Não realiza injeção ou remodelagem nesta etapa (apenas ponte de dados).
 */

import { ProductVisionData } from '../cinematic/types';
import {
  ProductInjectionContext,
  ProductStructuralData,
  ProductCommercialData,
  ProductSourceMeta,
  ProductPhysicalConstraints,
  ProductScale,
  ProductDataSourceOrigin,
} from './types';

// ============================================================================
// CLASSIFICAÇÃO DETERMINÍSTICA DE ESCALA E CONSTRAINTS
// ============================================================================

export function deriveProductScale(
  category: string = '',
  name: string = '',
  rawVision?: ProductVisionData
): ProductScale {
  const combined = `${name} ${category} ${rawVision?.packaging || ''} ${rawVision?.category || ''}`.toLowerCase();

  // 1. Wearables
  if (
    /rel[oó]gio|watch|smartwatch|joia|anel|colar|pulseira|brinco|t[eê]nis|sapato|cal[cç]ado|sand[aá]lia|bota|camis|cal[cç]a|vestid|roupa|mochila|bolsa|óculos|sunglasses/i.test(
      combined
    )
  ) {
    return 'WEARABLE';
  }

  // 2. Small Handheld (cosméticos, batons, perfumes pequenos, smartphones, fones, canetas)
  if (
    /batom|lipstick|gloss|lip|perfum|frasco|s[eé]rum|creme|esmalte|celular|smartphone|iphone|fone|earbud|airpod|caneta|chaveiro|carteira|pincel/i.test(
      combined
    )
  ) {
    return 'SMALL_HANDHELD';
  }

  // 3. Medium Handheld (garrafas térmicas, tablets, secadores, ferramentas portáteis, embalagens médias)
  if (
    /garrafa|squeeze|copo|stanley|tablet|ipad|secador|modelador|furadeira|c[aâ]mera|powerbank|livro/i.test(
      combined
    )
  ) {
    return 'MEDIUM_HANDHELD';
  }

  // 4. Tabletop (eletrodomésticos de bancada, panelas, notebooks, liquidificadores, luminárias)
  if (
    /liquidificador|air\s*fryer|cafeteira|panela|notebook|laptop|monitor|lumin[aá]ria|caixa\s*de\s*som\s*de\s*mesa|ventilador\s*de\s*mesa|torradeira/i.test(
      combined
    )
  ) {
    return 'TABLETOP';
  }

  // 5. Large Objects (móveis, geladeiras, sofás, bicicletas, esteiras)
  if (
    /geladeira|sof[aá]|bicicleta|bike|esteira|m[aá]quina\s*de\s*lavar|fog[aã]o|arm[aá]rio|cama|mesa\s*de\s*jantar/i.test(
      combined
    )
  ) {
    return 'LARGE_OBJECT';
  }

  if (category || name) {
    return 'MEDIUM_HANDHELD';
  }

  return 'UNKNOWN';
}

export function derivePhysicalConstraints(
  scale: ProductScale,
  category: string = '',
  material: string = '',
  visionData?: ProductVisionData
): ProductPhysicalConstraints {
  const combined = `${category} ${material} ${visionData?.texture || ''} ${visionData?.finish || ''}`.toLowerCase();

  const isSmall = scale === 'SMALL_HANDHELD';
  const isMedium = scale === 'MEDIUM_HANDHELD';
  const isTabletop = scale === 'TABLETOP';
  const isLarge = scale === 'LARGE_OBJECT';
  const isWearable = scale === 'WEARABLE';

  const handheld = isSmall || isMedium;
  const wearable = isWearable;
  const tabletop = isTabletop;
  const largeObject = isLarge;

  const flexible = /algod[aã]o|tecido|malha|couro|leather|borracha|silicone|flex[ií]vel/i.test(combined);
  const rigid = /a[cç]o|metal|vidro|pol[ií]mero|abs|pl[aá]stico|madeira|acril/i.test(combined) || !flexible;

  const hasLidOrMovingParts =
    (visionData?.movingParts && visionData.movingParts.length > 0) ||
    /tampa|cap|lid|frasco|abert|unboxing|embalagem|zíper|bot[aã]o|dosador|nozzle|spray/i.test(combined);

  const openable = hasLidOrMovingParts && !isLarge;
  const closable = openable;
  const rotatable = handheld || isTabletop || (visionData?.movingParts && visionData.movingParts.length > 0);
  const requiresTwoHands = isTabletop || isLarge || (isMedium && hasLidOrMovingParts);
  const fineManipulation = isSmall || /conta-gotas|nozzle|bot[aã]o|dial|regulador|touch/i.test(combined);
  const stationary = isTabletop || isLarge;

  return {
    handheld: handheld || undefined,
    wearable: wearable || undefined,
    tabletop: tabletop || undefined,
    largeObject: largeObject || undefined,
    flexible: flexible || undefined,
    rigid: rigid || undefined,
    openable: openable || undefined,
    closable: closable || undefined,
    rotatable: rotatable || undefined,
    requiresTwoHands: requiresTwoHands || undefined,
    fineManipulation: fineManipulation || undefined,
    stationary: stationary || undefined,
  };
}

export function deriveInteractionCapabilities(
  constraints: ProductPhysicalConstraints,
  scale: ProductScale,
  category: string = ''
): string[] {
  const capabilities: string[] = ['display', 'point'];
  const catLower = category.toLowerCase();

  if (constraints.handheld) {
    capabilities.push('hold', 'rotate', 'lift', 'place');
  }

  if (constraints.wearable) {
    capabilities.push('wear', 'hold');
  }

  if (constraints.openable) {
    capabilities.push('open', 'close');
  }

  if (/perfum|cosm[eé]t|creme|s[eé]rum|batom|skin/i.test(catLower)) {
    capabilities.push('apply', 'press');
    if (/perfum|spray|aerossol/i.test(catLower)) {
      capabilities.push('spray');
    }
  } else if (/eletr[oô]n|tech|celular|phone|gadget/i.test(catLower)) {
    capabilities.push('press', 'touch');
  }

  return Array.from(new Set(capabilities));
}

// ============================================================================
// CONSTRUTORES PURAS DE INJECTION CONTEXT
// ============================================================================

export interface BuildProductInjectionInput {
  productVisionData?: ProductVisionData | null;
  legacyPayload?: any;
  userFields?: {
    name?: string;
    category?: string;
    targetAudience?: string;
    priceRange?: string;
    mainBenefit?: string;
    mainPain?: string;
    uniqueDifferentiator?: string;
    platform?: string;
    features?: string | string[];
    angleStrategy?: string;
    hookIntensity?: string;
  };
}

/**
 * Constrói o ProductInjectionContext consolidando as fontes de dados com prioridade canônica:
 * 1. ProductVisionData estruturado (quando presente)
 * 2. Dados visuais e estruturais informados/observados
 * 3. UserFields explícitos
 * 4. LegacyPayload (handleAutoFillProduct / newProductPayload)
 */
export function buildProductInjectionContext(input: BuildProductInjectionInput): ProductInjectionContext {
  const vision = input.productVisionData || undefined;
  const legacy = (input.legacyPayload && typeof input.legacyPayload === 'object') ? input.legacyPayload : {};
  const user = (input.userFields && typeof input.userFields === 'object') ? input.userFields : {};

  const fieldOrigins: Record<string, ProductDataSourceOrigin> = {};

  // 1. Extração Estrutural
  let name = user.name || legacy.name || legacy.newProduct || '';
  if (name) {
    fieldOrigins['name'] = user.name ? 'USER_PROVIDED' : 'LEGACY_AI_INFERRED';
  } else {
    name = 'Novo Produto';
    fieldOrigins['name'] = 'UNKNOWN';
  }

  let category = vision?.category || user.category || legacy.category || '';
  if (vision?.category) {
    fieldOrigins['category'] = 'VISION_OBSERVED';
  } else if (user.category) {
    fieldOrigins['category'] = 'USER_PROVIDED';
  } else if (legacy.category) {
    fieldOrigins['category'] = 'LEGACY_AI_INFERRED';
  } else {
    category = 'Produto Geral';
    fieldOrigins['category'] = 'UNKNOWN';
  }

  const materials = vision?.material || legacy.material || legacy.materials || undefined;
  if (materials) fieldOrigins['materials'] = vision?.material ? 'VISION_OBSERVED' : 'LEGACY_AI_INFERRED';

  const colors = vision?.color || legacy.color || legacy.colors || undefined;
  if (colors) fieldOrigins['colors'] = vision?.color ? 'VISION_OBSERVED' : 'LEGACY_AI_INFERRED';

  const texture = vision?.texture || legacy.texture || undefined;
  if (texture) fieldOrigins['texture'] = vision?.texture ? 'VISION_OBSERVED' : 'LEGACY_AI_INFERRED';

  const finish = vision?.finish || legacy.finish || undefined;
  if (finish) fieldOrigins['finish'] = vision?.finish ? 'VISION_OBSERVED' : 'LEGACY_AI_INFERRED';

  const logo = vision?.logo || legacy.logo || undefined;
  if (logo) fieldOrigins['logo'] = vision?.logo ? 'VISION_OBSERVED' : 'LEGACY_AI_INFERRED';

  const packaging = vision?.packaging || legacy.packaging || undefined;
  if (packaging) fieldOrigins['packaging'] = vision?.packaging ? 'VISION_OBSERVED' : 'LEGACY_AI_INFERRED';

  const fixedParts = vision?.fixedParts || legacy.fixedParts || undefined;
  const movingParts = vision?.movingParts || legacy.movingParts || undefined;

  const structural: ProductStructuralData = {
    name,
    category,
    materials,
    colors,
    texture,
    finish,
    logo,
    packaging,
    fixedParts,
    movingParts,
  };

  // 2. Extração Comercial
  const mainBenefit = user.mainBenefit || legacy.main_benefit || legacy.mainBenefit || undefined;
  if (mainBenefit) fieldOrigins['mainBenefit'] = user.mainBenefit ? 'USER_PROVIDED' : 'LEGACY_AI_INFERRED';

  const mainPain = user.mainPain || legacy.main_pain || legacy.mainPain || undefined;
  if (mainPain) fieldOrigins['mainPain'] = user.mainPain ? 'USER_PROVIDED' : 'LEGACY_AI_INFERRED';

  const uniqueDifferentiator = user.uniqueDifferentiator || legacy.unique_differentiator || legacy.uniqueDifferentiator || undefined;
  if (uniqueDifferentiator) fieldOrigins['uniqueDifferentiator'] = user.uniqueDifferentiator ? 'USER_PROVIDED' : 'LEGACY_AI_INFERRED';

  const targetAudience = user.targetAudience || legacy.target_audience || legacy.targetAudience || undefined;
  if (targetAudience) fieldOrigins['targetAudience'] = user.targetAudience ? 'USER_PROVIDED' : 'LEGACY_AI_INFERRED';

  const priceRange = user.priceRange || legacy.price_range || legacy.priceRange || undefined;
  if (priceRange) fieldOrigins['priceRange'] = user.priceRange ? 'USER_PROVIDED' : 'LEGACY_AI_INFERRED';

  let rawFeatures = user.features || legacy.features || undefined;
  let features: string[] | undefined = undefined;
  if (Array.isArray(rawFeatures)) {
    features = rawFeatures.map(f => String(f).trim()).filter(Boolean);
  } else if (typeof rawFeatures === 'string') {
    features = rawFeatures.split(',').map(f => f.trim()).filter(Boolean);
  }

  const platform = user.platform || legacy.platform || undefined;
  const angleStrategy = user.angleStrategy || legacy.angleStrategy || undefined;
  const hookIntensity = user.hookIntensity || legacy.hookIntensity || undefined;

  const commercial: ProductCommercialData = {
    mainBenefit,
    mainPain,
    uniqueDifferentiator,
    targetAudience,
    priceRange,
    features,
    platform,
    angleStrategy,
    hookIntensity,
  };

  // 3. Metadados de Origem
  let primarySource: ProductSourceMeta['primarySource'] = 'LEGACY_PAYLOAD';
  if (vision) {
    primarySource = user.name || user.mainBenefit ? 'HYBRID' : 'VISION_DATA';
  } else if (user.name && user.mainBenefit) {
    primarySource = 'USER_INPUT';
  }

  const sourceMeta: ProductSourceMeta = {
    primarySource,
    confidenceScore: vision?.confidenceScore || (primarySource === 'USER_INPUT' ? 0.9 : 0.7),
    fieldOrigins,
  };

  // 4. Derivações Físicas
  const productScale = deriveProductScale(category, name, vision);
  const physicalConstraints = derivePhysicalConstraints(productScale, category, materials || '', vision);
  const interactionCapabilities = deriveInteractionCapabilities(physicalConstraints, productScale, category);

  return {
    structural,
    commercial,
    sourceMeta,
    physicalConstraints,
    productScale,
    interactionCapabilities,
    rawVisionData: vision,
  };
}

/**
 * Normaliza o payload legado do modal de adaptação (handleAutoFillProduct / newProductPayload)
 * em um ProductInjectionContext sem alterar o objeto de entrada.
 */
export function normalizeLegacyProductPayload(legacyPayload: any, userFields?: any): ProductInjectionContext {
  return buildProductInjectionContext({
    legacyPayload,
    userFields,
  });
}
