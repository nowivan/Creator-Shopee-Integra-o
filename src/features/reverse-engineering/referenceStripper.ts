/**
 * REFERENCE STRIPPER — ETAPA 3
 * Creator Intelligence Pro
 * 
 * Responsabilidade Única:
 * Camada determinística de higienização da referência antes da injeção de novo produto e identidade.
 * Remove informações específicas da referência (marcas, modelos, claims comerciais, cópia literal,
 * e características físicas do apresentador), preservando puramente a estrutura viral, visual,
 * persuasiva e a física abstrata transferível.
 * 
 * Princípios:
 * 1. Pura, determinística, imutável e idempotente.
 * 2. Sem chamadas LLM / Gemini.
 * 3. Preserva função; higieniza conteúdo específico.
 */

import {
  NormalizedReverseDNA,
  ViralStructureDNA,
  CopyViralDNA,
  PhysicalMotionDNA,
  PhysicalMotionScene,
  StrippedReferenceDNA,
  StrippedPhysicalMotionDNA,
  StrippedPhysicalMotionScene,
  TransferabilityLevel,
  RemovedElementsReport,
  PreservationReport,
} from './types';
import { extractPhysicalMotionDNA } from './physicalMotionDnaEngine';

// ============================================================================
// PADRÕES DETERMINÍSTICOS DE DETECÇÃO E HIGIENIZAÇÃO
// ============================================================================

// 1. Claims comerciais factuais da referência (preço, desconto, frete, urgência cronológica, etc.)
const COMMERCIAL_FACT_REGEXES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'discount_percentage', pattern: /\b\d{1,3}%\s*(?:de\s*)?(?:off|desconto)?\b/gi },
  { name: 'currency_price', pattern: /(?:r\$|\$|€|reais?|usd)\s*\d+[\d.,]*/gi },
  { name: 'price_mention', pattern: /\b(?:por\s+(?:apenas|somente|menos\s+de)|custa\s+(?:apenas)?)\s*(?:r\$|\$)?\s*\d+[\d.,]*/gi },
  { name: 'coupon_code', pattern: /\bcupom(?:\s+de\s+desconto)?\s*[:=]?\s*["']?[A-Z0-9_-]+["']?/gi },
  { name: 'stock_claim', pattern: /\b(?:últimas|ultimas)\s+unidades\b|\brestando\s+(?:apenas\s+)?\d+\b|\bestoque\s+limitado\b/gi },
  { name: 'temporal_deadline', pattern: /\b(?:só|apenas|valido\s+ate)\s+hoje\b|\btermina\s+hoje\b|\bacaba\s+hoje\b|\b24\s*horas?\b/gi },
  { name: 'free_shipping', pattern: /\bfrete\s+gr[áa]tis\b/gi },
  { name: 'superlative_claim', pattern: /\b(?:o\s+)?(?:mais\s+vendido|n[úu]mero\s+1|top\s+1|eleito\s+o\s+melhor)\b/gi },
];

// 2. Traços literais de identidade do apresentador da referência (cabelo, gênero, vestimenta)
const IDENTITY_TRAIT_REGEXES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'hair_style_color', pattern: /\b(?:loira|morena|ruiva|careca|cabelo\s+(?:liso|cacheado|curto|longo|loiro|preto|castanho)|de\s+coque)\b/gi },
  { name: 'gender_age_literal', pattern: /\b(?:mulher\s+(?:jovem|loira|adulta)|homem\s+(?:jovem|barbudo|adulto)|garota|garoto)\b/gi },
  { name: 'clothing_specific', pattern: /\b(?:usando|vestindo)\s+(?:camiseta|camisa|vestido|regata|casaco|jaqueta|terno)\s+(?:preta|branca|azul|vermelha|rosa|estampada)\b/gi },
  { name: 'makeup_tattoos', pattern: /\b(?:maquiagem\s+(?:pesada|marcada|leve)|tatuag(?:em|ens)|piercings?)\b/gi },
];

// 3. Verbos de ação com baixa transferabilidade (geometria ultra-específica do produto)
const LOW_TRANSFERABILITY_MOTION_KEYWORDS = [
  'lipstick', 'batom', 'lip gloss',
  'shoe', 'sapato', 'sneaker', 'tênis', 'vestir sapato', 'lacing',
  'fold chair', 'dobrar cadeira',
  'cartridge', 'cartucho', 'refill slot',
  'spray bottle pump', 'desrosquear tampa conta-gotas',
];

const MEDIUM_TRANSFERABILITY_MOTION_KEYWORDS = [
  'unboxing', 'open box', 'abrir caixa',
  'open lid', 'abrir tampa', 'twist cap',
  'unlid', 'dispense', 'pressionar dosador',
  'rotate 360', 'girar 360',
];

// ============================================================================
// FUNÇÕES PURAS DE HIGIENIZAÇÃO TEXTUAL
// ============================================================================

/**
 * Remove claims comerciais factuais de um texto e registra os elementos removidos.
 */
function sanitizeCommercialFacts(text: string, removedTracker: string[]): string {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;

  for (const { name, pattern } of COMMERCIAL_FACT_REGEXES) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      matches.forEach(m => {
        if (!removedTracker.includes(m)) {
          removedTracker.push(m);
        }
      });
      sanitized = sanitized.replace(pattern, '').replace(/\s{2,}/g, ' ');
    }
  }

  return sanitized.trim();
}

/**
 * Remove traços literais de identidade do apresentador original.
 */
function sanitizeIdentityTraits(text: string, removedTracker: string[]): string {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;

  for (const { name, pattern } of IDENTITY_TRAIT_REGEXES) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      matches.forEach(m => {
        if (!removedTracker.includes(m)) {
          removedTracker.push(m);
        }
      });
      sanitized = sanitized.replace(pattern, 'presenter').replace(/\s{2,}/g, ' ');
    }
  }

  return sanitized.trim();
}

/**
 * Generaliza menções a produtos e marcas específicas da referência.
 */
function generalizeProductMentions(text: string, removedTracker: string[]): string {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;

  // Regex para detectar marcas genéricas ("marca X", "brand Y") ou nomes explícitos citados
  const brandPattern = /\b(?:marca|brand|fabricante|modelo)\s+["']?[A-Z0-9_-]+["']?/gi;
  const matches = sanitized.match(brandPattern);
  if (matches && matches.length > 0) {
    matches.forEach(m => {
      if (!removedTracker.includes(m)) {
        removedTracker.push(m);
      }
    });
    sanitized = sanitized.replace(brandPattern, 'product');
  }

  return sanitized.trim();
}

/**
 * Higieniza copy literal transformando-a em diretriz puramente funcional.
 */
function sanitizeLiteralCopy(copyText: string, removedTracker: string[]): string {
  if (!copyText || typeof copyText !== 'string') return '';
  
  // Se for uma frase literal entre aspas ou um claim longo, rastreia como removido
  if (copyText.length > 20 && !copyText.startsWith('Função:') && !copyText.startsWith('Estratégia:')) {
    if (!removedTracker.includes(copyText)) {
      removedTracker.push(copyText);
    }
  }

  // Higieniza claims e fatos da copy
  let stripped = sanitizeCommercialFacts(copyText, removedTracker);
  stripped = generalizeProductMentions(stripped, removedTracker);
  return stripped;
}

// ============================================================================
// TRANSFERABILITY CLASSIFICATION (DETERMINISTIC)
// ============================================================================

function classifySceneTransferability(scene: PhysicalMotionScene, lowMotionTracker: string[]): TransferabilityLevel {
  const text = [
    scene.actionOrder?.join(' '),
    scene.productInteraction?.join(' '),
    scene.contactPoints?.join(' '),
    scene.startPose,
    scene.endPose,
  ].filter(Boolean).join(' ').toLowerCase();

  for (const keyword of LOW_TRANSFERABILITY_MOTION_KEYWORDS) {
    if (text.includes(keyword)) {
      if (!lowMotionTracker.includes(keyword)) {
        lowMotionTracker.push(`Low transferability motion detected: "${keyword}"`);
      }
      return 'LOW';
    }
  }

  for (const keyword of MEDIUM_TRANSFERABILITY_MOTION_KEYWORDS) {
    if (text.includes(keyword)) {
      return 'MEDIUM';
    }
  }

  return 'HIGH';
}

function calculateOverallTransferability(levels: TransferabilityLevel[]): TransferabilityLevel {
  if (levels.length === 0) return 'HIGH';
  if (levels.includes('LOW')) return 'LOW';
  if (levels.includes('MEDIUM')) return 'MEDIUM';
  return 'HIGH';
}

// ============================================================================
// STRIPPER ENGINE (PURE, IMMUTABLE, DETERMINISTIC, IDEMPOTENT)
// ============================================================================

/**
 * Higieniza completamente os DNAs da referência extraídos pela Engenharia Reversa,
 * removendo detalhes exclusivos da referência (produto, marca, preço, claims e dados do avatar)
 * e gerando um StrippedReferenceDNA pronto para injeção e remodelagem.
 */
export function stripReferenceDNA(input: any): StrippedReferenceDNA {
  const removedElements: RemovedElementsReport = {
    product: [],
    commercialFacts: [],
    identity: [],
    copyLiteral: [],
  };

  const preservedStructuralElements: string[] = [
    'hookTiming',
    'hookFunction',
    'conversionArc',
    'visualFraming',
    'lightingPattern',
    'cameraMovement',
    'deliveryEnergy',
    'ctaPosition',
    'ctaFunction',
  ];

  const lowTransferabilityMotion: string[] = [];

  // Extrai ou herda NormalizedReverseDNA
  const normalized: NormalizedReverseDNA = (input && input.viralStructureDNA && input.copyViralDNA)
    ? input
    : (input && typeof input === 'object' && input.viralStructureDNA)
      ? input
      : {
          viralStructureDNA: {
            hook: { description: '' },
            conversionArc: { description: '' },
            visualPattern: { description: '' },
            preservation: { preservedElements: [] },
            remodelingIntensity: 50,
          },
          copyViralDNA: {
            voiceDelivery: { description: '' },
            ctaStrategy: { description: '' },
          },
          adaptationContract: {
            adaptationMode: 'preservar_viral',
            remodelingIntensity: 50,
            preserveElements: [],
          },
        };

  // 1. Higienização de ViralStructureDNA
  const originalHookDesc = normalized.viralStructureDNA.hook?.description || '';
  const sanitizedHookDesc = sanitizeIdentityTraits(
    generalizeProductMentions(
      sanitizeCommercialFacts(originalHookDesc, removedElements.commercialFacts),
      removedElements.product
    ),
    removedElements.identity
  );

  const originalConversionDesc = normalized.viralStructureDNA.conversionArc?.description || '';
  const sanitizedConversionDesc = generalizeProductMentions(
    sanitizeCommercialFacts(originalConversionDesc, removedElements.commercialFacts),
    removedElements.product
  );

  const originalVisualDesc = normalized.viralStructureDNA.visualPattern?.description || '';
  const sanitizedVisualDesc = sanitizeIdentityTraits(
    generalizeProductMentions(
      sanitizeCommercialFacts(originalVisualDesc, removedElements.commercialFacts),
      removedElements.product
    ),
    removedElements.identity
  );

  const strippedViralStructureDNA: ViralStructureDNA = {
    ...normalized.viralStructureDNA,
    hook: {
      ...normalized.viralStructureDNA.hook,
      description: sanitizedHookDesc || 'Padrão de gancho funcional abstrato',
      retentionMechanism: normalized.viralStructureDNA.hook?.retentionMechanism
        ? sanitizeCommercialFacts(normalized.viralStructureDNA.hook.retentionMechanism, removedElements.commercialFacts)
        : undefined,
    },
    conversionArc: {
      ...normalized.viralStructureDNA.conversionArc,
      description: sanitizedConversionDesc || 'Arco de conversão e demonstração funcional',
    },
    visualPattern: {
      ...normalized.viralStructureDNA.visualPattern,
      description: sanitizedVisualDesc || 'Conceito visual limpo com iluminação consistente',
    },
  };

  // 2. Higienização de CopyViralDNA
  const originalVoiceDesc = normalized.copyViralDNA.voiceDelivery?.description || '';
  const sanitizedVoiceDesc = sanitizeIdentityTraits(
    sanitizeCommercialFacts(originalVoiceDesc, removedElements.commercialFacts),
    removedElements.identity
  );

  const originalCtaDesc = normalized.copyViralDNA.ctaStrategy?.description || '';
  const sanitizedCtaDesc = sanitizeCommercialFacts(
    generalizeProductMentions(originalCtaDesc, removedElements.product),
    removedElements.commercialFacts
  );

  const strippedCopyViralDNA: CopyViralDNA = {
    ...normalized.copyViralDNA,
    hookPattern: normalized.copyViralDNA.hookPattern
      ? sanitizeLiteralCopy(normalized.copyViralDNA.hookPattern, removedElements.copyLiteral)
      : undefined,
    conversionPattern: normalized.copyViralDNA.conversionPattern
      ? sanitizeLiteralCopy(normalized.copyViralDNA.conversionPattern, removedElements.copyLiteral)
      : undefined,
    voiceDelivery: {
      ...normalized.copyViralDNA.voiceDelivery,
      description: sanitizedVoiceDesc || 'Estilo de locução dinâmico e persuasivo',
    },
    ctaStrategy: {
      ...normalized.copyViralDNA.ctaStrategy,
      description: sanitizedCtaDesc || 'Chamada para ação direta na plataforma',
    },
  };

  // 3. Higienização e Abstração de PhysicalMotionDNA
  let strippedPhysicalMotionDNA: StrippedPhysicalMotionDNA | undefined = undefined;
  const rawMotionDNA: PhysicalMotionDNA = normalized.physicalMotionDNA || extractPhysicalMotionDNA(input);

  if (rawMotionDNA && Array.isArray(rawMotionDNA.scenes) && rawMotionDNA.scenes.length > 0) {
    const sceneLevels: TransferabilityLevel[] = [];

    const strippedScenes: StrippedPhysicalMotionScene[] = rawMotionDNA.scenes.map(scene => {
      const transferability = classifySceneTransferability(scene, lowTransferabilityMotion);
      sceneLevels.push(transferability);

      // Abstrai ações para remover nomes específicos do produto
      const sanitizedActionOrder = scene.actionOrder?.map(action =>
        generalizeProductMentions(sanitizeCommercialFacts(action, removedElements.commercialFacts), removedElements.product)
      );

      const sanitizedInteractions = scene.productInteraction?.map(interaction =>
        generalizeProductMentions(interaction, removedElements.product)
      );

      const sanitizedStartPose = scene.startPose
        ? sanitizeIdentityTraits(generalizeProductMentions(scene.startPose, removedElements.product), removedElements.identity)
        : undefined;

      const sanitizedEndPose = scene.endPose
        ? sanitizeIdentityTraits(generalizeProductMentions(scene.endPose, removedElements.product), removedElements.identity)
        : undefined;

      return {
        ...scene,
        actionOrder: sanitizedActionOrder,
        productInteraction: sanitizedInteractions,
        startPose: sanitizedStartPose,
        endPose: sanitizedEndPose,
        transferability,
      };
    });

    strippedPhysicalMotionDNA = {
      scenes: strippedScenes,
      overallTransferability: calculateOverallTransferability(sceneLevels),
    };
  }

  // 4. Montagem do Relatório de Preservação
  const preservationReport: PreservationReport = {
    removedProductSpecific: Array.from(new Set(removedElements.product)),
    removedCommercialFacts: Array.from(new Set(removedElements.commercialFacts)),
    removedIdentitySpecific: Array.from(new Set(removedElements.identity)),
    removedLiteralCopy: Array.from(new Set(removedElements.copyLiteral)),
    preservedStructuralElements,
    lowTransferabilityMotion: Array.from(new Set(lowTransferabilityMotion)),
  };

  const overallTransferability: TransferabilityLevel = strippedPhysicalMotionDNA
    ? strippedPhysicalMotionDNA.overallTransferability
    : 'HIGH';

  return {
    viralStructureDNA: strippedViralStructureDNA,
    copyViralDNA: strippedCopyViralDNA,
    ...(strippedPhysicalMotionDNA ? { physicalMotionDNA: strippedPhysicalMotionDNA } : {}),
    removedElements,
    preservationReport,
    overallTransferability,
  };
}
