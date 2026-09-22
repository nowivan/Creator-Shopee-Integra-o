/**
 * WARDROBE VISION EXTRACTOR — CREATIVE DIRECTOR AGENT 2 (STAGE 2)
 * 
 * Responsibilities:
 * - Multimodal AI extraction of visible wardrobe and neutral presenter attributes from Identity Hub avatars.
 * - Extracts ONLY visible garment attributes: topType, topColor, topStyle, bottomType, bottomColor, footwearType, footwearColor, accessories, and neutral presenterDescription.
 * - Strict Anti-Hallucination: If garments/footwear are outside the camera frame, returns empty/null without guessing.
 * - Strict Neutrality: Does NOT infer brand, price, sizes, ethnicity, profession, or unverifiable personal traits.
 * - Uses existing AI infrastructure (processGeminiAPI / workerClient).
 */

import { processGeminiAPI, safeJSONParse } from '../../../utils';

export type WardrobeFieldOrigin = 'manual' | 'avatar_extraction' | 'default';

export interface WardrobeFieldOrigins {
  presenterGender: WardrobeFieldOrigin;
  topType: WardrobeFieldOrigin;
  topColor: WardrobeFieldOrigin;
  topStyle: WardrobeFieldOrigin;
  bottomType: WardrobeFieldOrigin;
  bottomColor: WardrobeFieldOrigin;
  footwearType: WardrobeFieldOrigin;
  footwearColor: WardrobeFieldOrigin;
  presenterDescription: WardrobeFieldOrigin;
}

export interface WardrobeConfidenceScores {
  presenterGender?: number;
  topType?: number;
  topColor?: number;
  topStyle?: number;
  bottomType?: number;
  bottomColor?: number;
  footwearType?: number;
  footwearColor?: number;
  presenterDescription?: number;
}

export interface DetectedWardrobeProfile {
  presenterGender?: string;
  topType?: string;
  topColor?: string;
  topStyle?: string;
  bottomType?: string;
  bottomColor?: string;
  footwearType?: string;
  footwearColor?: string;
  presenterDescription?: string;
  accessories?: string[];
  confidence?: WardrobeConfidenceScores;
}

export interface WardrobeVisionExtractorInput {
  avatarImage: string;
  avatarName?: string;
  apiKey?: string;
  signal?: AbortSignal;
}

/**
 * Normalizes and cleans raw text strings from AI output.
 * Strips placeholders like 'N/A', 'none', 'nenhum', 'não visível', etc.
 */
function cleanValue(val: any): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  const invalidPlaceholders = [
    'n/a', 'na', 'none', 'nenhum', 'nenhuma', 'não visível', 'nao visivel',
    'invisível', 'invisivel', 'não se aplica', 'nao se aplica', 'unknown',
    'desconhecido', 'null', 'undefined', '-', '--', 'not visible', 'not visible in frame'
  ];
  if (invalidPlaceholders.includes(lower)) {
    return undefined;
  }
  return trimmed;
}

/**
 * Normalizes confidence scores to numbers between 0 and 1.
 */
function cleanConfidence(val: any): number | undefined {
  if (typeof val === 'number' && !isNaN(val)) {
    return Math.max(0, Math.min(1, Math.round(val * 100) / 100));
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      return Math.max(0, Math.min(1, Math.round(parsed * 100) / 100));
    }
  }
  return undefined;
}

/**
 * Normalizes raw AI output into a clean, typed DetectedWardrobeProfile.
 */
export function normalizeDetectedWardrobeProfile(raw: any): DetectedWardrobeProfile {
  if (!raw || typeof raw !== 'object') {
    return {
      accessories: [],
      confidence: {}
    };
  }

  const presenterGenderRaw = cleanValue(raw.presenterGender || raw.gender);
  let presenterGender: string | undefined = undefined;
  if (presenterGenderRaw) {
    const gLower = presenterGenderRaw.toLowerCase();
    if (gLower.includes('fem') || gLower.includes('mulher')) {
      presenterGender = 'female';
    } else if (gLower.includes('masc') || gLower.includes('homem')) {
      presenterGender = 'male';
    } else {
      presenterGender = presenterGenderRaw;
    }
  }

  const topType = cleanValue(raw.topType || raw.top_type || raw.garmentTop);
  const topColor = cleanValue(raw.topColor || raw.top_color || raw.garmentTopColor);
  const topStyle = cleanValue(raw.topStyle || raw.top_style || raw.garmentTopStyle);

  const bottomType = cleanValue(raw.bottomType || raw.bottom_type || raw.garmentBottom);
  const bottomColor = cleanValue(raw.bottomColor || raw.bottom_color || raw.garmentBottomColor);

  const footwearType = cleanValue(raw.footwearType || raw.footwear_type || raw.shoes);
  const footwearColor = cleanValue(raw.footwearColor || raw.footwear_color || raw.shoesColor);

  const presenterDescription = cleanValue(raw.presenterDescription || raw.presenter_description || raw.description);

  let accessories: string[] = [];
  const rawAccessories = raw.accessories || raw.acessorios;
  if (Array.isArray(rawAccessories)) {
    accessories = rawAccessories
      .map((item: any) => (typeof item === 'string' ? cleanValue(item) : ''))
      .filter((item: any): item is string => Boolean(item));
  } else if (typeof rawAccessories === 'string') {
    const single = cleanValue(rawAccessories);
    if (single) accessories = [single];
  }

  const rawConf = raw.confidence || {};
  const confidence: WardrobeConfidenceScores = {
    presenterGender: cleanConfidence(rawConf.presenterGender || rawConf.gender),
    topType: cleanConfidence(rawConf.topType || rawConf.top_type),
    topColor: cleanConfidence(rawConf.topColor || rawConf.top_color),
    topStyle: cleanConfidence(rawConf.topStyle || rawConf.top_style),
    bottomType: cleanConfidence(rawConf.bottomType || rawConf.bottom_type),
    bottomColor: cleanConfidence(rawConf.bottomColor || rawConf.bottom_color),
    footwearType: cleanConfidence(rawConf.footwearType || rawConf.footwear_type),
    footwearColor: cleanConfidence(rawConf.footwearColor || rawConf.footwear_color),
    presenterDescription: cleanConfidence(rawConf.presenterDescription || rawConf.description)
  };

  return {
    ...(presenterGender ? { presenterGender } : {}),
    ...(topType ? { topType } : {}),
    ...(topColor ? { topColor } : {}),
    ...(topStyle ? { topStyle } : {}),
    ...(bottomType ? { bottomType } : {}),
    ...(bottomColor ? { bottomColor } : {}),
    ...(footwearType ? { footwearType } : {}),
    ...(footwearColor ? { footwearColor } : {}),
    ...(presenterDescription ? { presenterDescription } : {}),
    accessories,
    confidence
  };
}

/**
 * Extracts base64 and mime type safely from data URLs or base64 strings.
 */
function extractImagePayload(image: string): { base64: string; mimeType: string } {
  let base64 = image.trim();
  let mimeType = 'image/jpeg';

  if (base64.startsWith('data:')) {
    const parts = base64.split(';base64,');
    const header = parts[0];
    base64 = parts[1] || '';
    if (header.includes('data:')) {
      mimeType = header.replace('data:', '').trim();
    }
  }

  return { base64, mimeType };
}

/**
 * Builds the specialized prompt for Wardrobe & Presenter Vision Extraction.
 */
function buildWardrobeVisionExtractorPrompt(avatarName?: string): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Você é um Especialista em Visão Computacional e Direção de Figurino para Produção de Vídeos Publicitários UGC.
Sua única responsabilidade é analisar a imagem de um avatar/apresentador e extrair estritamente as características visíveis de figurino e aparência para o "Contrato de Figurino".

REGRAS DE EXTRAÇÃO:
1. Analise APENAS o que for claramente visível na imagem:
   - presenterGender: Expressão de gênero visível ("female", "male" ou descrição neutra).
   - topType: Tipo da peça superior (ex: "camiseta básica", "camisa polo", "camisa social", "blusa de alça", "regata", "blazer").
   - topColor: Cor principal da peça superior (ex: "branca", "preta", "azul marinho", "cinza mescla").
   - topStyle: Estilo/gola/corte da peça superior (ex: "gola redonda", "gola V", "manga curta", "manga longa", "corte regular").
   - bottomType: Tipo da peça inferior (ex: "calça jeans", "calça de alfaiataria", "shorts", "saia"). SE NÃO ESTIVER VISÍVEL NO ENQUADRAMENTO, RETORNE null.
   - bottomColor: Cor da peça inferior. SE NÃO ESTIVER VISÍVEL, RETORNE null.
   - footwearType: Tipo de calçado (ex: "tênis casual", "sandália", "sapatilha"). SE NÃO ESTIVER VISÍVEL, RETORNE null.
   - footwearColor: Cor do calçado. SE NÃO ESTIVER VISÍVEL, RETORNE null.
   - accessories: Lista de acessórios visíveis (ex: ["óculos de grau", "relógio de pulso", "brincos pequenos"]). Se nenhum, retorne [].
   - presenterDescription: Breve descrição neutra da aparência visual (ex: "Mulher adulta brasileira, cabelos escuros ondulados, expressão natural e carismática").

2. PROIBIÇÕES ABSOLUTAS (ANTI-ALUCINAÇÃO):
   - NUNCA alucine calçados ou peças inferiores se a foto for um busto/retrato fechado (headshot/half-body). Deixe null.
   - NUNCA invente marcas (ex: Nike, Zara), preços, tamanhos ou materiais não óbvios.
   - NUNCA infira etnias, profissões ou traços pessoais sensíveis.
   - NUNCA retorne textos em formato prosa. Retorne EXCLUSIVAMENTE JSON estruturado válido.

3. RETORNE EXATAMENTE ESTE FORMATO JSON:
{
  "presenterGender": "female" | "male" | null,
  "topType": string | null,
  "topColor": string | null,
  "topStyle": string | null,
  "bottomType": string | null,
  "bottomColor": string | null,
  "footwearType": string | null,
  "footwearColor": string | null,
  "presenterDescription": string | null,
  "accessories": string[],
  "confidence": {
    "presenterGender": number,
    "topType": number,
    "topColor": number,
    "topStyle": number,
    "bottomType": number,
    "bottomColor": number,
    "footwearType": number,
    "footwearColor": number,
    "presenterDescription": number
  }
}`;

  const userPrompt = `Analise o avatar fornecido${avatarName ? ` (Nome de referência: "${avatarName}")` : ''} e extraia o perfil de figurino estruturado em JSON conforme as regras.`;

  return { systemPrompt, userPrompt };
}

/**
 * Main Vision Extractor Service: Executes a single multimodal call to extract wardrobe profile from an avatar image.
 */
export async function extractWardrobeFromAvatar(
  input: WardrobeVisionExtractorInput
): Promise<DetectedWardrobeProfile> {
  const { avatarImage, avatarName, apiKey = '', signal } = input;

  if (!avatarImage || typeof avatarImage !== 'string' || avatarImage.trim() === '') {
    throw new Error('Nenhuma imagem de avatar válida fornecida para extração de figurino.');
  }

  const { base64, mimeType } = extractImagePayload(avatarImage);
  if (!base64) {
    throw new Error('A imagem do avatar não possui dados de imagem válidos.');
  }

  const { systemPrompt, userPrompt } = buildWardrobeVisionExtractorPrompt(avatarName);

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64
    }
  };

  const textPart = {
    text: `${systemPrompt}\n\n${userPrompt}`
  };

  const response = await processGeminiAPI(apiKey, {
    mode: 'wardrobe_vision_extractor',
    moduleName: 'Creative Director - Wardrobe Vision Extractor',
    model: 'gemini-3.7-flash',
    require_json: true,
    contents: [{ parts: [imagePart, textPart] }]
  }, {
    signal,
    timeoutMs: 30000
  });

  if (!response) {
    throw new Error('Falha na comunicação com o serviço de visão de figurino.');
  }

  let parsed: any = response.data;
  if (!parsed && response.raw_text) {
    parsed = safeJSONParse(response.raw_text, null);
  }
  if (!parsed && typeof response === 'object' && !response.data && !response.raw_text) {
    parsed = response;
  }

  return normalizeDetectedWardrobeProfile(parsed);
}
