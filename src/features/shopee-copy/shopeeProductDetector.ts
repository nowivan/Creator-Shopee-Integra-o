/**
 * CREATOR PRO — SHOPEE COPY AGENT
 * AUTOMATIC PRODUCT DETECTION FROM IMAGE
 * 
 * Rules:
 * 1. Visual Authority Rule: Only authoritatively extracts physical, observable facts.
 * 2. Anti-Hallucination: Never invents brand, seller, model number, capacity, dimensions,
 *    durability, medical claims, or commercial hype ("premium", "original", "bestseller").
 * 3. Conservative PT-BR naming: e.g. "Organizador Giratório de Cosméticos em Acrílico".
 * 4. Resolves standardized product archetypes with safe fallback 'OTHER'.
 * 5. Strictly typed confidence: HIGH, MEDIUM, LOW.
 */

import { GEMINI_MODEL, safeJSONParse } from '../../utils';
import { postToWorker } from '../../services/workerClient';
import {
  ShopeeProductDetectionResult,
  ShopeeProductArchetype,
  ShopeeDetectionConfidence
} from './types';

export const SHOPEE_DETECTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    productName: { type: "STRING" },
    productCategory: { type: "STRING" },
    productArchetype: {
      type: "STRING",
      enum: [
        "ORGANIZER",
        "KITCHEN_TOOL",
        "BEAUTY_ACCESSORY",
        "ELECTRONICS",
        "HOME_STORAGE",
        "CLEANING_TOOL",
        "FASHION_ACCESSORY",
        "PERSONAL_CARE",
        "PET_ACCESSORY",
        "OTHER"
      ]
    },
    canonicalColor: { type: "STRING" },
    observableDetails: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    knownPhysicalFacts: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    visibleBenefits: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    functionalContext: { type: "STRING" },
    confidence: {
      type: "STRING",
      enum: ["HIGH", "MEDIUM", "LOW"]
    }
  },
  required: [
    "productName",
    "productCategory",
    "productArchetype",
    "observableDetails",
    "knownPhysicalFacts",
    "visibleBenefits",
    "functionalContext",
    "confidence"
  ]
};

export const SHOPEE_DETECTION_SYSTEM_INSTRUCTION = `Você é o Detector Visual de Produtos do Agente Shopee Copy do Creator Pro.
Sua única responsabilidade é analisar visualmente a imagem do produto e extrair com rigor factual estritamente o que é OBSERVÁVEL.

==================================================
DIRETRIZES FUNDAMENTAIS DE AUTORIDADE VISUAL
==================================================
1. REGRAS ANTI-ALUCINAÇÃO E LIMITAÇÕES ESTRITAS:
   - A imagem autoriza APENAS fatos observáveis na foto.
   - É TOTALMENTE PROIBIDO inferir, supor ou inventar:
     * Marca comercial ou nome de loja (a não ser que haja um logotipo tipográfico nítido e inequívoco no próprio produto)
     * Número de modelo, código SKU ou linha de fabricação
     * Capacidade métrica não impressa (não invente "10.000 mAh", "2 Litros", "500ml")
     * Composição de material específica sem certeza visual (use termos neutros como "material translúcido rígido", "acabamento metálico")
     * Dimensões em centímetros ou peso em gramas
     * Especificações elétricas ou duração de bateria (a menos que claramente legível na foto)
     * Durabilidade ("dura anos", "inquebrável"), garantia ou certificações
     * Promessas médicas, estéticas milagrosas ou de saúde
     * Afirmações comerciais e adjetivos de venda: NUNCA use palavras como "premium", "original", "alta capacidade", "melhor do Brasil", "top de linha", "bestseller", "imperdível"

2. NOME DO PRODUTO (productName):
   - Gere um nome descritivo conciso e conservador em Português do Brasil (PT-BR).
   - Exemplo BOM: "Organizador Giratório de Cosméticos em Acrílico"
   - Exemplo RUIM: "Organizador Premium Shopee 360° Original de Alta Capacidade"
   - Para confiança BAIXA (LOW), não afirme com certeza; use um nome genérico neutro.

3. FATOS OBSERVADOS E BENEFÍCIOS VISÍVEIS:
   - observableDetails: formato geométrico, peças componentes visíveis, botões, compartimentos, acabamento e cor.
   - knownPhysicalFacts: fatos físicos verificáveis (ex: base circular, bandejas giratórias, trava manual).
   - visibleBenefits: benefícios práticos estritamente derivados da física do objeto (ex: organizador -> melhora separação e acesso aos itens; suporte -> apoia o dispositivo sem precisar segurar). NUNCA invente "economiza 50% de espaço".
   - functionalContext: uma frase resumindo a finalidade prática plausível do item.

4. ARQUÉTIPO (productArchetype):
   - Classifique estritamente entre:
     ORGANIZER, KITCHEN_TOOL, BEAUTY_ACCESSORY, ELECTRONICS, HOME_STORAGE,
     CLEANING_TOOL, FASHION_ACCESSORY, PERSONAL_CARE, PET_ACCESSORY, OTHER.
   - Se houver dúvida ou não se encaixar com clareza, use SEMPRE "OTHER".

5. NÍVEL DE CONFIANÇA (confidence):
   - HIGH: Produto nítido, central, isolado e perfeitamente reconhecível.
   - MEDIUM: Tipo geral do objeto é visível, mas pequenas variações ou detalhes específicos são ambíguos.
   - LOW: Imagem borrada, cortada, com múltiplos objetos dispersos ou de difícil identificação.`;

/**
 * Strips commercial hype, forbidden promotional buzzwords, and unsupported claims.
 */
export function sanitizeDetectedProductName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\b(premium|original|alta capacidade|melhor do brasil|top de linha|garantia total|100%\s*original|super|imperdível|promocional|shopee)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Validates and normalizes archetype with safe fallback to 'OTHER'.
 */
export function normalizeProductArchetype(rawArchetype: string): ShopeeProductArchetype {
  const upper = String(rawArchetype || '').trim().toUpperCase();
  if (Object.values(ShopeeProductArchetype).includes(upper as ShopeeProductArchetype)) {
    return upper as ShopeeProductArchetype;
  }
  return ShopeeProductArchetype.OTHER;
}

/**
 * Normalizes detection confidence to 'HIGH' | 'MEDIUM' | 'LOW'.
 */
export function normalizeConfidence(rawConfidence: string): ShopeeDetectionConfidence {
  const upper = String(rawConfidence || '').trim().toUpperCase();
  if (upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
    return upper as ShopeeDetectionConfidence;
  }
  return 'MEDIUM';
}

/**
 * Formats detection result into a natural, conservative factual statement
 * suitable for the "Fatos Observados & Benefícios Visíveis" field.
 */
export function formatShopeeDetectionFacts(result: ShopeeProductDetectionResult): string {
  if (!result) return '';

  const details = (result.observableDetails || [])
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
  const facts = (result.knownPhysicalFacts || [])
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
  const benefits = (result.visibleBenefits || [])
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const physicalStatements = Array.from(new Set([...details, ...facts]));

  const sections: string[] = [];

  if (physicalStatements.length > 0) {
    sections.push(physicalStatements.join(', '));
  }

  if (benefits.length > 0) {
    sections.push(benefits.join('; '));
  } else if (result.functionalContext && result.functionalContext.trim()) {
    sections.push(result.functionalContext.trim());
  }

  return sections.join('; ');
}

/**
 * Generates a lightweight identifier / hash for tracking image replacement.
 */
export function generateImageFingerprint(base64: string): string {
  if (!base64) return '';
  const len = base64.length;
  const sample = base64.slice(0, 32) + base64.slice(-32);
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = (hash << 5) - hash + sample.charCodeAt(i);
    hash |= 0;
  }
  return `img_${len}_${Math.abs(hash)}`;
}

/**
 * Executes automatic visual product detection using Gemini Vision.
 */
export async function detectShopeeProductFromImage(params: {
  imageBase64: string;
  imageMimeType?: string;
  signal?: AbortSignal;
}): Promise<ShopeeProductDetectionResult> {
  const { imageBase64, imageMimeType = 'image/jpeg', signal } = params;

  const cleanBase64 = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  if (!cleanBase64) {
    throw new Error('Imagem inválida para análise visual.');
  }

  const promptText = `Analise a imagem deste produto comercial. Identifique rigorosamente os componentes observáveis, fatos físicos demonstráveis, benefícios diretos do uso físico e classifique o arquétipo. Siga estritamente as regras de autoridade visual sem inventar marcas ou afirmações comerciais.`;

  const payload = {
    model: GEMINI_MODEL,
    systemInstruction: {
      parts: [{ text: SHOPEE_DETECTION_SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType,
              data: cleanBase64
            }
          },
          { text: promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      responseMimeType: "application/json",
      responseSchema: SHOPEE_DETECTION_SCHEMA
    }
  };

  const workerRes = await postToWorker('/api/gemini/generate', payload, {
    moduleName: 'ShopeeProductDetector',
    timeoutMs: 45000,
    signal
  });

  let rawData: any = null;
  if (workerRes?.data && typeof workerRes.data === 'object') {
    rawData = workerRes.data;
  } else if (workerRes?.raw_text) {
    rawData = safeJSONParse(workerRes.raw_text, null);
  }

  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Não foi possível interpretar a resposta visual do produto.');
  }

  const confidence = normalizeConfidence(rawData.confidence);
  const rawName = String(rawData.productName || '').trim();
  const sanitizedName = sanitizeDetectedProductName(rawName);

  // For LOW confidence, use a safe, neutral descriptor instead of asserting uncertain specifics
  const finalProductName = confidence === 'LOW'
    ? (sanitizedName ? `Item observado (${sanitizedName})` : 'Produto em análise manual')
    : (sanitizedName || 'Produto Detectado');

  const archetype = normalizeProductArchetype(rawData.productArchetype);

  const result: ShopeeProductDetectionResult = {
    productName: finalProductName,
    productCategory: String(rawData.productCategory || 'Geral').trim(),
    productArchetype: archetype,
    canonicalColor: rawData.canonicalColor ? String(rawData.canonicalColor).trim() : undefined,
    observableDetails: Array.isArray(rawData.observableDetails)
      ? rawData.observableDetails.map(String).map(s => s.trim()).filter(Boolean)
      : [],
    knownPhysicalFacts: Array.isArray(rawData.knownPhysicalFacts)
      ? rawData.knownPhysicalFacts.map(String).map(s => s.trim()).filter(Boolean)
      : [],
    visibleBenefits: Array.isArray(rawData.visibleBenefits)
      ? rawData.visibleBenefits.map(String).map(s => s.trim()).filter(Boolean)
      : [],
    functionalContext: String(rawData.functionalContext || '').trim(),
    confidence
  };

  return result;
}
