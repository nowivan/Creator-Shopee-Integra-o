// Creator Pro IA - Cloudflare Worker for Creative Director AI
// Built for GET /health, visual analytics, automatic product detection, and proxy capabilities.

const WORKER_VERSION = "creator-worker-2026-08-19-p0-observability-2";
const DEFAULT_TEXT_MODEL = "gemini-3.5-flash";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Client-Token, X-Gemini-Model, Accept, Authorization, X-Request-Id, X-Timestamp, X-Module-Name",
  "Content-Type": "application/json",
};

const AVAILABLE_MODES = [
  "product_analysis",
  "product_image_analysis",
  "creative_brief",
  "script_refiner",
  "hook_generator",
  "chat",
  "compliance_audit"
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

function hasInlineImage(contents) {
  if (!Array.isArray(contents)) return false;

  return contents.some(content =>
    Array.isArray(content?.parts) &&
    content.parts.some(part =>
      Boolean(
        part?.inlineData?.data ||
        part?.inline_data?.data
      )
    )
  );
}

function extractTextFromCandidate(candidate) {
  if (!candidate || !candidate.content || !candidate.content.parts) {
    return "";
  }
  const parts = candidate.content.parts;
  const nonThoughtParts = parts.filter(p => p && p.text && !p.thought);
  if (nonThoughtParts.length > 0) {
    return nonThoughtParts.map(p => p.text).join("");
  }
  return parts.filter(p => p && p.text).map(p => p.text).join("");
}

function normalizeInlineDataParts(contents) {
  if (!Array.isArray(contents)) return contents;
  return contents.map(item => {
    if (!item?.parts || !Array.isArray(item.parts)) return item;
    const parts = item.parts.map(part => {
      if (part?.inlineData?.data && typeof part.inlineData.data === 'string') {
        return {
          ...part,
          inlineData: {
            ...part.inlineData,
            data: part.inlineData.data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
          }
        };
      }
      if (part?.inline_data?.data && typeof part.inline_data.data === 'string') {
        return {
          ...part,
          inlineData: {
            mimeType: part.inline_data.mime_type || part.inline_data.mimeType || "image/jpeg",
            data: part.inline_data.data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
          }
        };
      }
      return part;
    });
    return { ...item, parts };
  });
}

function buildStructuredPayload(body) {
  const hasContents = Array.isArray(body.contents) && body.contents.length > 0;
  const payload = {
    contents: hasContents
      ? normalizeInlineDataParts(body.contents)
      : [
          {
            role: "user",
            parts: [{ text: body.prompt || body.text || "" }],
          },
        ],

    generationConfig: {
      ...(body.generationConfig || {}),
    },
  };

  if (body.systemInstruction) {
    payload.systemInstruction = body.systemInstruction;
  }

  if (body.require_json || body.responseMimeType === "application/json" || body.response_mime_type === "application/json") {
    payload.generationConfig.responseMimeType = "application/json";
  }
  if (body.maxOutputTokens !== undefined) {
    payload.generationConfig.maxOutputTokens = body.maxOutputTokens;
  }
  if (body.temperature !== undefined) {
    payload.generationConfig.temperature = body.temperature;
  }
  if (body.topP !== undefined) {
    payload.generationConfig.topP = body.topP;
  }
  if (body.topK !== undefined) {
    payload.generationConfig.topK = body.topK;
  }

  return payload;
}

function buildImagePayload(prompt, image) {
  const parts = [{ text: prompt }];

  const base64 =
    image?.base64 ||
    image?.data ||
    image?.image_base64 ||
    "";

  const mimeType =
    image?.mimeType ||
    image?.mime_type ||
    image?.image_mime_type ||
    "image/jpeg";

  if (base64) {
    parts.push({
      inlineData: {
        mimeType,
        data: String(base64).replace(/^data:image\/[a-zA-Z]+;base64,/, ""),
      },
    });
  }

  return {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };
}

async function callGemini(model, payload, apiKey) {
  const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function structuredGeminiMode(body, env, request_id, mode) {
  const apiKey = env.GEMINI_API_KEY || env.API_KEY || "";
  
  const requestedModel = body.model || DEFAULT_TEXT_MODEL;
  const systemInstructionReceived = Boolean(body.systemInstruction);
  const inlineImageReceived = hasInlineImage(body.contents);

  const geminiPayload = {
    ...buildStructuredPayload(body),
    ...(body.safetySettings ? { safetySettings: body.safetySettings } : {})
  };

  const systemInstructionForwarded = Boolean(geminiPayload.systemInstruction);
  const inlineImageForwarded = hasInlineImage(geminiPayload.contents);
  const executedModel = requestedModel;

  const executionMeta = {
    worker_version: WORKER_VERSION,
    requested_model: requestedModel,
    executed_model: executedModel,
    system_instruction_received: systemInstructionReceived,
    system_instruction_forwarded: systemInstructionForwarded,
    inline_image_received: inlineImageReceived,
    inline_image_forwarded: inlineImageForwarded
  };

  if (!apiKey) {
    return {
      status: 401,
      response: {
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        execution_meta: executionMeta,
        error: "API Key missing",
        message: "GEMINI_API_KEY do Worker não está definida."
      }
    };
  }

  let response;
  try {
    response = await callGemini(executedModel, geminiPayload, apiKey);
  } catch (err) {
    return {
      status: 500,
      response: {
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        execution_meta: executionMeta,
        error: "Gemini connection error",
        message: "Falha na conexão de rede com a API do Gemini: " + (err.message || String(err))
      }
    };
  }

  const responseText = await response.text();
  let responseJson = null;
  try {
    responseJson = JSON.parse(responseText);
  } catch (e) {
    return {
      status: response.status || 500,
      response: {
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        execution_meta: executionMeta,
        error: "Gemini response corruption",
        message: "O Gemini retornou um HTML ou formato incorreto. Resposta: " + responseText.slice(0, 400)
      }
    };
  }

  if (!response.ok) {
    return {
      status: response.status,
      response: {
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        execution_meta: executionMeta,
        error: "Gemini API error",
        message: responseJson?.error?.message || `HTTP ${response.status}`,
        raw: responseJson
      }
    };
  }

  const rawCandidate = responseJson?.candidates?.[0];
  const candidateParts = rawCandidate?.content?.parts || [];
  const l0Parts = candidateParts.filter(p => p && p.text && !p.thought);
  const l0Text = l0Parts.length > 0
    ? l0Parts.map(p => p.text).join("")
    : candidateParts.filter(p => p && p.text).map(p => p.text).join("");
  const l0Len = l0Text.length;

  const rawText = extractTextFromCandidate(rawCandidate);
  const l1Len = (rawText || "").length;

  const partsMeta = candidateParts.map((p, idx) => ({
    index: idx,
    textLength: (p?.text || "").length,
    isThought: Boolean(p?.thought)
  }));

  const diagnosticMeta = {
    worker_generation_config: {
      maxOutputTokens: geminiPayload.generationConfig?.maxOutputTokens ?? null,
      temperature: geminiPayload.generationConfig?.temperature ?? null,
      topP: geminiPayload.generationConfig?.topP ?? null
    },
    worker_request_model: executedModel,
    gemini_http_status: response.status,
    candidate_count: responseJson?.candidates?.length || 0,
    candidate_parts_count: candidateParts.length,
    parts_meta: partsMeta,
    finishReason: rawCandidate?.finishReason || "STOP",
    finishMessage: rawCandidate?.finishMessage || null,
    usageMetadata: responseJson?.usageMetadata || null,
    promptTokenCount: responseJson?.usageMetadata?.promptTokenCount ?? null,
    candidatesTokenCount: responseJson?.usageMetadata?.candidatesTokenCount ?? null,
    totalTokenCount: responseJson?.usageMetadata?.totalTokenCount ?? null,
    L0: l0Len,
    L1: l1Len
  };

  return {
    status: 200,
    response: {
      ok: true,
      request_id,
      worker_version: WORKER_VERSION,
      execution_meta: executionMeta,
      diagnostic_meta: diagnosticMeta,
      raw_text: rawText,
      data: null,
      candidates: responseJson?.candidates,
      raw: responseJson
    }
  };
}

async function productAnalysis(body, env, request_id) {
  const image =
    body.product_image ||
    body.image ||
    body.productImage ||
    body.uploaded_product_image ||
    (
      body.image_base64
        ? {
            base64: body.image_base64,
            mimeType: body.image_mime_type || body.mime_type || "image/jpeg",
          }
        : null
    );

  if (!image || (!image.base64 && !image.data && !image.image_base64)) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "skipped_no_image",
      message: "Nenhuma imagem do produto foi fornecida no payload para análise.",
    };
  }

  // Get apiKey
  const apiKey = env.GEMINI_API_KEY || env.API_KEY || "";
  if (!apiKey) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "API Key missing",
      message: "O Worker está sem a chave de API (GEMINI_API_KEY) configurada.",
    };
  }

  // Define prompt for analysis
  const visionPrompt = `
You are a Senior Product UX Architect and Visual Analyst.
Analyze this product image and extract key attributes to autofill a short-form video ad visualizer and director panels.
You must output a single, well-formatted JSON object containing precisely the structure described below. Do NOT output any markdown tags (like backticks or \`\`\`json), explanations, or extra text.

Select the category strictly from this list of options:
- "👗 Roupas Femininas & Lingerie"
- "💄 Beleza & Cuidados Pessoais"
- "📱 Celulares & Eletrônicos"
- "💪 Saúde & Bem-Estar"
- "⌚ Relógios & Joias"
- "🏠 Casa & Cozinha"

Select the productCategory strictly from these options (or "Other" if none fit):
- "Beauty" | "Fashion" | "Watches" | "Electronics" | "Home" | "Kitchen" | "Fitness" | "Health" | "Children" | "Automotive" | "Courses" | "Software" | "Accessories" | "Jewelry" | "Shoes" | "Bags" | "Pet" | "Tools" | "Other"

JSON structure:
{
  "productName": "Detected short commercial name of the product",
  "category": "One of the strict category options listed above",
  "productDescription": "Short description of the product and its premium appeal",
  "mainBenefit": "Main commercial value / user benefit",
  "mainPainSolved": "Pain point resolved",
  "uniqueDifferentiator": "Unique competitive selling point",
  "materialTexture": "Tactile build materials",
  "dominantColors": "Primary and secondary colors",
  "visibleTextLogo": "Visible brand name/logos",
  "productType": "Specific product classification",
  "suggestedPlatform": "Recommended platform (TikTok Shop, Instagram Reels, Shopee Vídeo)",
  "suggestedCtaStyle": "DIRETO or AJUDA_INDIRETA",
  
  "product_name_suggestion": "Suggested commercial product name",
  "product_category_suggestion": "Matches one of standard categories: Beauty, Fashion, Watches, Electronics, Home, Kitchen, Fitness, Health, Accessories, Jewelry, Bags, Physical, Tools, Other",
  "category_confidence": "low | medium | high",
  "detected_brand": "Brand or manufacturer visible",
  "detected_product_type": "Visual class of product",
  "visual_evidence": ["Evidence 1 from image matching labels", "Evidence 2 ..."],
  
  "object_lock": {
    "brand": "Identified brand",
    "product_name": "Suggested product name",
    "primary_color": "E.g. Matte Black",
    "secondary_color": "E.g. Chrome Silver",
    "material": "Estimated build materials",
    "shape": "Geometric form/shape",
    "logo": "Brand logo description",
    "features": ["Feature 1", "Feature 2"]
  },

  "product_dna": {
    "product_identity": "Model name",
    "product_shape": "Geometric form",
    "product_color": "Color palette",
    "product_material": "Estimated materials",
    "product_texture": "Tactile surface",
    "visible_logo": "Identified details",
    "visible_text": "Strict letters/symbols on item",
    "key_visual_features": "Design highlights",
    "product_quantity": "E.g. 1 item",
    "product_accessories": "Accompanying extras or boxes"
  },
  "product_lock_prompt_en": "Keep the uploaded product exactly identical to the reference image. Do NOT alter, mutate, recolor, or change its visual identity, style, labels, or elements in any generated prompt scene.",
  "objective": "E.g. Conversão de Vendas",
  "visualStyle": "E.g. Cinematic Premium",
  "ctaStyle": "DIRETO",
  "voiceStyle": "Conversacional",
  "productNameConfidence": 95,
  "categoryConfidence": 90,
  "voiceStyleConfidence": 92,
  "detectedName": "Commercial name",
  "detectedCategory": "Visual niche",
  "targetAudience": "E.g. Men and women...",
  "communicationTone": "E.g. Sophisticated",
  "recommendedVoiceStyle": "E.g. Authoritative tone",
  "recommendedStructure": "Cinematic"
}
`;

  // Build payload
  const geminiPayload = buildImagePayload(visionPrompt, image);

  // Call Gemini
  const model = body.model || DEFAULT_TEXT_MODEL;
  let response;
  try {
    response = await callGemini(model, geminiPayload, apiKey);
  } catch (err) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "Gemini connection error",
      message: "Falha na conexão de rede com a API do Gemini: " + err.message,
    };
  }

  const responseText = await response.text();
  if (!response.ok) {
    let errMsg = "API error";
    try {
      const parsedErr = JSON.parse(responseText);
      errMsg = parsedErr?.error?.message || errMsg;
    } catch (_) {}
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "gemini_api_error",
      message: `A API do Gemini retornou erro HTTP ${response.status}: ${errMsg}`,
    };
  }

  if (!responseText.trim()) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "EMPTY_VISUAL_ANALYSIS_RESPONSE",
      message: "A API da Gemini retornou uma resposta em branco (vazia).",
    };
  }

  let rawText = "";
  try {
    const responseJson = JSON.parse(responseText);
    rawText = extractTextFromCandidate(responseJson?.candidates?.[0]);
  } catch (err) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "Gemini JSON parsing failed",
      message: "The blank string is not valid JSON / A resposta da API do Gemini não pôde ser analisada como JSON válido.",
    };
  }

  if (!rawText.trim()) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "EMPTY_VISUAL_ANALYSIS_RESPONSE",
      message: "O texto da resposta da análise visual retornada pela IA está em branco.",
    };
  }

  // Parse model response json
  let parsed = null;
  let cleanText = rawText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();
  }
  
  try {
    parsed = JSON.parse(cleanText);
  } catch (err) {
    // Try extract json via boundaries
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }
  }

  if (!parsed) {
    return {
      ok: false,
      request_id,
      worker_version: WORKER_VERSION,
      error: "Product analysis JSON parsing failed",
      message: "O formato JSON retornado pela IA está em branco ou corrompido.",
      raw_text: rawText,
    };
  }

  const normalized = {
    ...parsed,
    product_name_suggestion:
      parsed.product_name_suggestion ||
      parsed.productName ||
      parsed.product_name ||
      parsed.product_dna?.product_identity ||
      "",

    product_category_suggestion:
      parsed.product_category_suggestion ||
      parsed.productCategory ||
      parsed.category ||
      "Other",

    category_confidence:
      parsed.category_confidence ||
      "medium",

    detected_brand:
      parsed.detected_brand ||
      parsed.product_dna?.visible_logo ||
      parsed.object_lock?.brand ||
      "",

    detected_product_type:
      parsed.detected_product_type ||
      parsed.productType ||
      parsed.product_type ||
      parsed.detected_product_type ||
      "",

    visual_evidence:
      parsed.visual_evidence ||
      parsed.product_dna?.key_visual_features ||
      parsed.object_lock?.features ||
      [],

    locked_attributes:
      parsed.locked_attributes || {
        brand: parsed.product_dna?.visible_logo || parsed.object_lock?.brand || "",
        product_name: parsed.productName || parsed.product_name || "",
        primary_color: parsed.product_dna?.product_color || parsed.object_lock?.primary_color || "",
        material: parsed.product_dna?.product_material || parsed.object_lock?.material || "",
        shape: parsed.product_dna?.product_shape || parsed.object_lock?.shape || "",
        logo: parsed.product_dna?.visible_logo || parsed.object_lock?.logo || "",
        features: parsed.product_dna?.key_visual_features || parsed.object_lock?.features || [],
      },
  };

  return {
    ok: true,
    mode: "product_image_analysis",
    worker_version: WORKER_VERSION,
    request_id,
    data: normalized,
    raw_text: rawText,
    risk_metadata: body?.risk_metadata || null,
  };
}

export default {
  async fetch(request, env, ctx) {
    const request_id = request.headers.get("X-Request-Id") || `req_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    
    // 1. Handle OPTIONS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. GET /health or / endpoint check
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "GET" && (pathname === "/health" || pathname === "/")) {
      return jsonResponse({
        ok: true,
        status: "online",
        service: "creative-director-worker",
        proxy_mode: "active",
        worker_version: WORKER_VERSION,
        available_modes: AVAILABLE_MODES,
        time: new Date().toISOString(),
        request_id,
      }, 200);
    }

    // 3. /debug_post diagnostic endpoint
    if (pathname === "/debug_post") {
      const hasClientToken = Boolean(request.headers.get("X-Client-Token"));
      const hasAuth = Boolean(request.headers.get("Authorization"));
      const hasGeminiKey = Boolean(env.GEMINI_API_KEY || env.API_KEY);
      return jsonResponse({
        ok: true,
        endpoint: "/debug_post",
        worker_version: WORKER_VERSION,
        request_id,
        headers_present: {
          x_client_token: hasClientToken,
          authorization: hasAuth,
        },
        env_configured: {
          gemini_api_key: hasGeminiKey,
        },
        time: new Date().toISOString(),
      }, 200);
    }

    // 4. Exclusively allow POST for model generations and operations
    if (request.method !== "POST") {
      return jsonResponse({
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        error: "Method not allowed",
        message: "Use POST para gerar conteúdos via API.",
      }, 405);
    }

    // 5. Decode request body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse({
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        error: "Invalid JSON",
        message: "O corpo da requisição não é um JSON válido.",
      }, 400);
    }

    // 6. Check if it is a visual analysis target
    const currentMode = body.mode || body.ai_target || body.currentMode || "";

    if (
      currentMode === "product_analysis" ||
      currentMode === "product_image_analysis"
    ) {
      try {
        const result = await productAnalysis(body, env, request_id);
        const statusCode = result.ok ? 200 : 500;
        return jsonResponse(result, statusCode);
      } catch (err) {
        return jsonResponse({
          ok: false,
          request_id,
          worker_version: WORKER_VERSION,
          error: "Analysis failure",
          message: err.message || String(err),
        }, 500);
      }
    }

    // 7. Structured Gemini Router
    try {
      const { status, response } = await structuredGeminiMode(body, env, request_id, currentMode);
      return jsonResponse(response, status);
    } catch (err) {
      return jsonResponse({
        ok: false,
        request_id,
        worker_version: WORKER_VERSION,
        error: "Worker exception",
        message: err.message || String(err)
      }, 500);
    }
  }
};
