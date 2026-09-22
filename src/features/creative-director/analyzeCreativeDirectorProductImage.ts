import { processGeminiAPI, safeJSONParse } from '../../utils';

export interface CreativeDirectorProductImageAnalysis {
  product_name: string;
  category: string;
  visual_identity: string;
  front_view: string;
  side_view_inferred: string;
  back_view_inferred: string;
  top_view_inferred: string;
  dominant_colors: string[];
  materials_and_texture: string[];
  visible_logo_text: string[];
  packaging_details: string;
  key_shape_features: string[];
  static_components: string[];
  movable_components: string[];
  do_not_change: string[];
  allowed_motion: string[];
  risk_of_hallucination: string[];
  object_lock_prompt_en: string;
}

export interface CreativeDirectorObjectLock {
  enabled: boolean;
  source: "image_analysis" | "manual" | "description_fallback";
  product_identity: string;
  front_view: string;
  side_view: string;
  back_view: string;
  top_view: string;
  material_and_texture: string;
  colors_and_finish: string;
  logos_and_text: string;
  packaging: string;
  static_components: string[];
  movable_components: string[];
  do_not_change: string[];
  allowed_motion: string[];
  angle_consistency_rules: string;
  object_lock_prompt_en: string;
}

/**
 * Converts a File, Blob, base64 string, data URL, blob URL, or image payload into a base64 string and mime type.
 */
async function processImageToB64(imageInput: any): Promise<{ base64: string; mimeType: string }> {
  if (!imageInput) {
    throw new Error("Nenhuma imagem válida fornecida para análise.");
  }

  // 1. Direct File / Blob instance
  if (typeof Blob !== 'undefined' && imageInput instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        let mimeType = imageInput.type || 'image/png';
        let b64 = result;
        if (typeof result === 'string' && result.includes(';base64,')) {
          const parts = result.split(';base64,');
          const header = parts[0];
          b64 = parts[1];
          if (header.includes('data:')) {
            mimeType = header.replace('data:', '').trim();
          }
        }
        resolve({ base64: b64, mimeType });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(imageInput);
    });
  }

  // 2. Direct string
  if (typeof imageInput === 'string') {
    return parseImageString(imageInput);
  }

  // 3. Object with properties
  if (typeof imageInput === 'object') {
    const fileProp = imageInput.file || imageInput.blob;
    if (fileProp && typeof Blob !== 'undefined' && fileProp instanceof Blob) {
      return processImageToB64(fileProp);
    }

    const rawVal = imageInput.base64 ?? imageInput.preview ?? imageInput.url ?? imageInput.dataUrl ?? imageInput.data ?? imageInput.image ?? imageInput.src;
    if (rawVal) {
      if (typeof rawVal === 'string') {
        return parseImageString(rawVal, imageInput.mimeType);
      }
      if (typeof Blob !== 'undefined' && rawVal instanceof Blob) {
        return processImageToB64(rawVal);
      }
      if (typeof rawVal === 'object') {
        return processImageToB64(rawVal);
      }
    }
  }

  throw new Error("Nenhuma imagem válida fornecida para análise.");
}

async function parseImageString(rawStr: string, defaultMime: string = 'image/png'): Promise<{ base64: string; mimeType: string }> {
  let b64 = typeof rawStr === 'string' ? rawStr.trim() : '';
  let mimeType = defaultMime || 'image/png';

  if (!b64) {
    throw new Error("String de imagem vazia para análise.");
  }

  if (b64.startsWith('blob:') && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(b64);
      const blob = await res.blob();
      return processImageToB64(blob);
    } catch {
      // Fallback
    }
  }

  if (b64.includes(';base64,')) {
    const parts = b64.split(';base64,');
    const header = parts[0];
    b64 = parts[1] || '';
    if (header.includes('data:')) {
      mimeType = header.replace('data:', '').trim() || mimeType;
    }
    return { base64: b64, mimeType };
  }

  return { base64: b64, mimeType };
}

/**
 * TASK 3 & 4: Analyzes an uploaded product image to extract the visual DNA for object locking.
 */
export async function analyzeCreativeDirectorProductImage(
  imageInput: { file?: File; base64?: string; mimeType?: string },
  productName?: string,
  category?: string,
  apiKey: string = ''
): Promise<CreativeDirectorProductImageAnalysis> {
  const { base64, mimeType } = await processImageToB64(imageInput);

  const systemInstructionPrompt = `You are a product consistency analyst for generative video prompts. Analyze the uploaded product image and extract the product's visual DNA for object locking. Focus on shape, proportions, visible angles, colors, materials, logo/text, packaging, fixed components, movable components, and details that must not change across camera angles. Do not invent details that are not visible. If a side/back/top view is not visible, clearly mark it as not visible or inferred. Return only valid JSON.`;

  const schemaInstruction = `
Return ONLY valid JSON matching this exact JSON schema:
{
  "product_name": "${(productName || '').replace(/"/g, '\\"')}",
  "category": "${(category || '').replace(/"/g, '\\"')}",
  "visual_identity": "Overall visual style, brand language, shape and finish summary",
  "front_view": "Detailed description of the visible front view",
  "side_view_inferred": "Side view description (mark as inferred or not visible if only front shown)",
  "back_view_inferred": "Back view description (mark as inferred or not visible if only front shown)",
  "top_view_inferred": "Top view description (mark as inferred or not visible if only front shown)",
  "dominant_colors": ["Color 1", "Color 2"],
  "materials_and_texture": ["Material/Texture 1", "Material/Texture 2"],
  "visible_logo_text": ["Visible text/logo 1"],
  "packaging_details": "Packaging details if visible or style notes",
  "key_shape_features": ["Shape feature 1", "Shape feature 2"],
  "static_components": ["Component 1"],
  "movable_components": ["Component 1"],
  "do_not_change": ["Feature 1", "Feature 2"],
  "allowed_motion": ["Allowed motion 1", "Allowed motion 2"],
  "risk_of_hallucination": ["Risk area 1"],
  "object_lock_prompt_en": "English object lock prompt summarizing strict rules"
}`;

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64
    }
  };

  const textPart = {
    text: `${systemInstructionPrompt}\n\nContext:\nProduct Name: ${productName || 'N/A'}\nCategory: ${category || 'N/A'}\n\n${schemaInstruction}`
  };

  const response = await processGeminiAPI(apiKey, {
    mode: "product_image_analysis",
    moduleName: "Creative Director AI - Object Lock Image Analysis",
    model: "gemini-3.5-flash",
    require_json: true,
    contents: [{ parts: [imagePart, textPart] }]
  });

  if (!response) {
    throw new Error("Não foi possível analisar a imagem do produto.");
  }

  let parsed: any = response.data;
  if (!parsed && response.raw_text) {
    parsed = safeJSONParse(response.raw_text, null);
  }

  if (!parsed) {
    throw new Error("Formato de resposta de análise de imagem inválido.");
  }

  const result: CreativeDirectorProductImageAnalysis = {
    product_name: parsed.product_name || productName || "",
    category: parsed.category || category || "",
    visual_identity: parsed.visual_identity || "Identidade visual do produto enviada em imagem.",
    front_view: parsed.front_view || "Visão frontal capturada na referência de imagem.",
    side_view_inferred: parsed.side_view_inferred || "Not visible in the reference; preserve only if shown in another provided image.",
    back_view_inferred: parsed.back_view_inferred || "Not visible in the reference; preserve basic rear geometry without adding unseen logos.",
    top_view_inferred: parsed.top_view_inferred || "Inferred from visible silhouette; keep consistent but avoid adding unseen details.",
    dominant_colors: Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors : (parsed.dominant_colors ? [parsed.dominant_colors] : []),
    materials_and_texture: Array.isArray(parsed.materials_and_texture) ? parsed.materials_and_texture : (parsed.materials_and_texture ? [parsed.materials_and_texture] : []),
    visible_logo_text: Array.isArray(parsed.visible_logo_text) ? parsed.visible_logo_text : (parsed.visible_logo_text ? [parsed.visible_logo_text] : []),
    packaging_details: parsed.packaging_details || "Embalagem compatível com a marca e produto.",
    key_shape_features: Array.isArray(parsed.key_shape_features) ? parsed.key_shape_features : [],
    static_components: Array.isArray(parsed.static_components) ? parsed.static_components : [],
    movable_components: Array.isArray(parsed.movable_components) ? parsed.movable_components : [],
    do_not_change: Array.isArray(parsed.do_not_change) ? parsed.do_not_change : ["Formato principal", "Cores e materiais visíveis", "Branding e logos"],
    allowed_motion: Array.isArray(parsed.allowed_motion) ? parsed.allowed_motion : ["Rotações de câmera", "Luzes e reflexos", "Manuseio do apresentador"],
    risk_of_hallucination: Array.isArray(parsed.risk_of_hallucination) ? parsed.risk_of_hallucination : ["Inventar visões traseiras ou laterais não mostradas"],
    object_lock_prompt_en: parsed.object_lock_prompt_en || ""
  };

  if (!result.object_lock_prompt_en) {
    result.object_lock_prompt_en = synthesizeObjectLockPromptEn(result);
  }

  return result;
}

function synthesizeObjectLockPromptEn(data: CreativeDirectorProductImageAnalysis): string {
  const colorsStr = data.dominant_colors.join(', ');
  const matStr = data.materials_and_texture.join(', ');
  const logoStr = data.visible_logo_text.join(', ');
  const doNotChangeStr = data.do_not_change.join(', ');
  const motionStr = data.allowed_motion.join(', ');

  return `[OBJECT LOCK - STRICT PRODUCT CONSISTENCY]
Product Name: ${data.product_name || 'Product'}
Category: ${data.category || 'General'}
Visual Identity: ${data.visual_identity}
Front View: ${data.front_view}
Side View (Inferred): ${data.side_view_inferred}
Back View (Inferred): ${data.back_view_inferred}
Top View (Inferred): ${data.top_view_inferred}
Dominant Colors: ${colorsStr || 'As shown in reference'}
Materials & Textures: ${matStr || 'As shown in reference'}
Logos & Text: ${logoStr || 'Preserve visible branding'}
Packaging: ${data.packaging_details}
Do Not Change: ${doNotChangeStr || 'Shape, proportions, colors, materials, logos'}
Allowed Motion: ${motionStr || 'Camera rotation, reflections, hand interaction'}
Consistency Rule: Keep product visually identical across all camera angles and scene changes without hallucinating unverified details.`;
}

/**
 * TASK 5: Builds the object lock structure prioritizing:
 * 1. Uploaded image analysis
 * 2. Manual object lock fields
 * 3. Product description / product analysis fields
 * 4. Generic fallback
 */
export function buildCreativeDirectorObjectLock(
  productImageAnalysis?: CreativeDirectorProductImageAnalysis | null,
  manualFields?: Partial<CreativeDirectorObjectLock> | null,
  productInput?: { productName?: string; category?: string; description?: string; detectedProductData?: any }
): CreativeDirectorObjectLock {
  const enabled = manualFields?.enabled ?? true;

  let source: "image_analysis" | "manual" | "description_fallback" = "description_fallback";

  const hasAnalysis = !!(productImageAnalysis && (productImageAnalysis.visual_identity || productImageAnalysis.front_view || productImageAnalysis.product_name));
  const hasManual = !!(manualFields && (manualFields.product_identity || manualFields.front_view || manualFields.material_and_texture || manualFields.colors_and_finish));

  if (hasAnalysis) {
    source = "image_analysis";
  } else if (hasManual) {
    source = "manual";
  } else {
    source = "description_fallback";
  }

  // Priority 1: Uploaded Image Analysis
  // Priority 2: Manual Object Lock fields
  // Priority 3: Product Description / Product Analysis fields
  // Priority 4: Generic Fallback

  const prodName = manualFields?.product_identity || productImageAnalysis?.product_name || productInput?.productName || productInput?.detectedProductData?.product_name || "Produto";
  const catName = productImageAnalysis?.category || productInput?.category || productInput?.detectedProductData?.category || "Geral";

  const product_identity = manualFields?.product_identity ||
    (productImageAnalysis?.visual_identity ? `${prodName} (${catName}): ${productImageAnalysis.visual_identity}` : null) ||
    (productInput?.detectedProductData?.visual_identity ? `${prodName}: ${productInput.detectedProductData.visual_identity}` : null) ||
    (productInput?.description ? `${prodName}: ${productInput.description.slice(0, 120)}` : `${prodName} - Identidade visual padrão do produto.`);

  const front_view = manualFields?.front_view ||
    productImageAnalysis?.front_view ||
    (productInput?.detectedProductData?.visual_identity ? `Visão frontal: ${productInput.detectedProductData.visual_identity}` : `Visão frontal baseada na descrição do produto ${prodName}.`);

  const side_view = manualFields?.side_view ||
    productImageAnalysis?.side_view_inferred ||
    "Not visible in the reference; preserve only if shown in another provided image.";

  const back_view = manualFields?.back_view ||
    productImageAnalysis?.back_view_inferred ||
    "Not visible in the reference; preserve basic rear geometry without adding unseen logos.";

  const top_view = manualFields?.top_view ||
    productImageAnalysis?.top_view_inferred ||
    "Inferred from visible silhouette; keep consistent but avoid adding unseen details.";

  const material_and_texture = manualFields?.material_and_texture ||
    (Array.isArray(productImageAnalysis?.materials_and_texture) ? productImageAnalysis!.materials_and_texture.join(', ') : productImageAnalysis?.materials_and_texture) ||
    productInput?.detectedProductData?.material ||
    "Materiais e textura visualmente observados no produto.";

  const colors_and_finish = manualFields?.colors_and_finish ||
    (Array.isArray(productImageAnalysis?.dominant_colors) ? productImageAnalysis!.dominant_colors.join(', ') : productImageAnalysis?.dominant_colors) ||
    productInput?.detectedProductData?.colors ||
    "Cores principais e acabamento visualmente identificados no produto.";

  const logos_and_text = manualFields?.logos_and_text ||
    (Array.isArray(productImageAnalysis?.visible_logo_text) ? productImageAnalysis!.visible_logo_text.join(', ') : productImageAnalysis?.visible_logo_text) ||
    "Manter logotipos, marcas e tipografia fiéis ao produto.";

  const packaging = manualFields?.packaging ||
    productImageAnalysis?.packaging_details ||
    "Embalagem padrão em consonância com a identidade da marca.";

  const static_components = manualFields?.static_components ||
    productImageAnalysis?.static_components ||
    ["Corpo do produto", "Ajustes fixos", "Inscrições e branding"];

  const movable_components = manualFields?.movable_components ||
    productImageAnalysis?.movable_components ||
    ["Partes móveis", "Acessórios", "Tampas/Aberturas"];

  const do_not_change = manualFields?.do_not_change ||
    productImageAnalysis?.do_not_change ||
    ["Silhueta e formato principal", "Cores dominantes", "Logos e marcas", "Acabamento e materiais"];

  const allowed_motion = manualFields?.allowed_motion ||
    productImageAnalysis?.allowed_motion ||
    ["Movimento de câmera 360", "Iluminação ambiente e reflexos", "Interação das mãos do apresentador", "Aproximação e afaste de câmera"];

  const angle_consistency_rules = manualFields?.angle_consistency_rules ||
    "Use the provided object_lock as a strict product consistency guide. When changing camera angles or scene blocks, keep the product visually consistent with the reference. Do not alter shape, proportions, colors, materials, visible logos/text, packaging, or fixed components. If an angle was not visible in the reference, avoid inventing specific unseen details; preserve the visible silhouette and product identity.";

  const object_lock_prompt_en = manualFields?.object_lock_prompt_en ||
    productImageAnalysis?.object_lock_prompt_en ||
    `[OBJECT LOCK - STRICT PRODUCT CONSISTENCY GUIDE]
SOURCE: ${source.toUpperCase()}
PRODUCT IDENTITY: ${product_identity}
FRONT VIEW: ${front_view}
SIDE VIEW: ${side_view}
BACK VIEW: ${back_view}
TOP VIEW: ${top_view}
COLORS & FINISH: ${colors_and_finish}
MATERIALS: ${material_and_texture}
LOGOS & TEXT: ${logos_and_text}
PACKAGING: ${packaging}
DO NOT CHANGE: ${Array.isArray(do_not_change) ? do_not_change.join(', ') : do_not_change}
ALLOWED MOTION: ${Array.isArray(allowed_motion) ? allowed_motion.join(', ') : allowed_motion}
RULES: ${angle_consistency_rules}`;

  return {
    enabled,
    source,
    product_identity,
    front_view,
    side_view,
    back_view,
    top_view,
    material_and_texture,
    colors_and_finish,
    logos_and_text,
    packaging,
    static_components,
    movable_components,
    do_not_change,
    allowed_motion,
    angle_consistency_rules,
    object_lock_prompt_en
  };
}
