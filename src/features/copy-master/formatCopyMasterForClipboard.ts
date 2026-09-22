export interface ClipboardValidationResult {
  has_undefined: boolean;
  has_null: boolean;
  has_object_object: boolean;
  has_raw_json: boolean;
  is_valid: boolean;
}

/**
 * Helper to safely sanitize field values for clipboard/export text.
 * Returns empty string for undefined, null, "undefined", "null", or "[object Object]".
 */
export function safeText(val: any): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (
      trimmed === "undefined" ||
      trimmed === "null" ||
      trimmed === "[object Object]"
    ) {
      return "";
    }
    return trimmed;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  if (typeof val === "object") {
    if (val.full_script) return safeText(val.full_script);
    if (val.text) return safeText(val.text);
    return "";
  }
  return "";
}

/**
 * Validates generated clipboard text to ensure it contains no corrupted placeholders,
 * undefined/null tokens, or raw JSON.
 */
export function validateClipboardText(text: string): ClipboardValidationResult {
  if (!text || typeof text !== "string") {
    return {
      has_undefined: true,
      has_null: true,
      has_object_object: true,
      has_raw_json: false,
      is_valid: false,
    };
  }

  const has_undefined = /\bundefined\b/i.test(text);
  const has_null = /\bnull\b/i.test(text);
  const has_object_object = text.includes("[object Object]");
  const trimmed = text.trim();
  const has_raw_json =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));

  const is_valid =
    !has_undefined && !has_null && !has_object_object && !has_raw_json;

  return {
    has_undefined,
    has_null,
    has_object_object,
    has_raw_json,
    is_valid,
  };
}

/**
 * Formats Copy Master result into clean, human-readable plain text for clipboard & export.
 * Never outputs raw JSON, undefined, null, or [object Object].
 */
export function formatCopyMasterForClipboard(inputResult: any): string {
  if (!inputResult) return "";

  let parsed: any = inputResult;
  if (typeof inputResult === "string") {
    try {
      parsed = JSON.parse(inputResult);
    } catch (e) {
      // If it's a plain string that isn't JSON, clean it up directly
      parsed = inputResult;
    }
  }

  // If input is still a pure non-JSON string
  if (typeof parsed === "string") {
    const cleanStr = safeText(parsed);
    const val = validateClipboardText(cleanStr);
    if (!val.is_valid && val.has_raw_json) return "";
    return cleanStr;
  }

  const sections: string[] = [];

  sections.push("COPY MASTER");

  // Handle array of versions (legacy/simple versions list)
  if (Array.isArray(parsed)) {
    parsed.forEach((v: any, idx: number) => {
      const hook = safeText(v.hook);
      const problem = safeText(v.problem);
      const benefit = safeText(v.benefit);
      const cta = safeText(v.cta);
      const fullCopy = safeText(v.full_copy || v.full_script);
      const prompt = safeText(v.video_prompt);

      const blockLines: string[] = [`--- VERSÃO ${idx + 1} ---`];
      if (hook) blockLines.push(`[HOOK]: ${hook}`);
      if (problem) blockLines.push(`[PROBLEMA]: ${problem}`);
      if (benefit) blockLines.push(`[BENEFÍCIO]: ${benefit}`);
      if (cta) blockLines.push(`[CTA]: ${cta}`);
      if (fullCopy) blockLines.push(`[COPY COMPLETA]: ${fullCopy}`);
      if (prompt) blockLines.push(`[PROMPT VÍDEO]: ${prompt}`);

      if (blockLines.length > 1) {
        sections.push(blockLines.join("\n"));
      }
    });

    return sanitizeAndCleanClipboardText(sections.join("\n\n"));
  }

  // Handle structured object (Copy Master result)
  const methodLabel = safeText(
    parsed.method_label || parsed.model_label || parsed.logic_model || "Desejo → Valor → Decisão"
  );
  if (methodLabel) {
    sections.push(`MÉTODO:\n${methodLabel}`);
  }

  const strategicSummary = safeText(parsed.strategic_summary);
  if (strategicSummary) {
    sections.push(`RESUMO ESTRATÉGICO:\n${strategicSummary}`);
  }

  // Extract script versions
  const shortScript = safeText(
    parsed.short_script || parsed.scripts?.direct_conversion?.full_script
  );
  if (shortScript) {
    const label = safeText(parsed.scripts?.direct_conversion?.label) || "SCRIPT CURTO / DIRETO";
    sections.push(`${label.toUpperCase()}:\n${shortScript}`);
  }

  const mediumScript = safeText(
    parsed.medium_script || parsed.scripts?.curiosity_subtle?.full_script
  );
  if (mediumScript) {
    const label = safeText(parsed.scripts?.curiosity_subtle?.label) || "SCRIPT MÉDIO / ANTI-CÓPIA";
    sections.push(`${label.toUpperCase()}:\n${mediumScript}`);
  }

  const premiumScript = safeText(
    parsed.premium_script || parsed.scripts?.premium_safe?.full_script
  );
  if (premiumScript) {
    const label = safeText(parsed.scripts?.premium_safe?.label) || "SCRIPT PREMIUM";
    sections.push(`${label.toUpperCase()}:\n${premiumScript}`);
  }

  const ugcScript = safeText(
    parsed.ugc_script || parsed.scripts?.ugc_natural?.full_script
  );
  if (ugcScript) {
    const label = safeText(parsed.scripts?.ugc_natural?.label) || "SCRIPT UGC";
    sections.push(`${label.toUpperCase()}:\n${ugcScript}`);
  }

  // Hooks
  const hooksList: string[] = [];
  if (Array.isArray(parsed.hooks)) {
    parsed.hooks.forEach((h: any) => {
      const cleanH = safeText(h);
      if (cleanH) hooksList.push(cleanH);
    });
  } else if (parsed.scripts?.direct_conversion?.hook) {
    const h1 = safeText(parsed.scripts.direct_conversion.hook);
    if (h1) hooksList.push(h1);
    if (parsed.scripts?.curiosity_subtle?.hook) {
      const h2 = safeText(parsed.scripts.curiosity_subtle.hook);
      if (h2 && h2 !== h1) hooksList.push(h2);
    }
  }

  if (hooksList.length > 0) {
    sections.push(
      `HOOKS:\n` + hooksList.map((h, i) => `${i + 1}. ${h}`).join("\n")
    );
  }

  // CTAs
  const ctasList: string[] = [];
  if (Array.isArray(parsed.soft_ctas)) {
    parsed.soft_ctas.forEach((c: any) => {
      const cleanC = safeText(c);
      if (cleanC) ctasList.push(cleanC);
    });
  } else {
    if (parsed.scripts?.direct_conversion?.cta) {
      const c1 = safeText(parsed.scripts.direct_conversion.cta);
      if (c1) ctasList.push(c1);
    }
    if (parsed.scripts?.curiosity_subtle?.hidden_cta) {
      const c2 = safeText(parsed.scripts.curiosity_subtle.hidden_cta);
      if (c2) ctasList.push(c2);
    }
  }

  if (ctasList.length > 0) {
    sections.push(
      `CTAS SEM PRESSÃO:\n` + ctasList.map((c, i) => `${i + 1}. ${c}`).join("\n")
    );
  }

  // Scene Blocks
  if (Array.isArray(parsed.scene_blocks) && parsed.scene_blocks.length > 0) {
    const blocksText = parsed.scene_blocks
      .map((b: any, idx: number) => {
        const visual = safeText(b.visual_scene || b.visual);
        const narration = safeText(b.narration);
        const camera = safeText(b.camera_direction);
        const emotion = safeText(b.emotional_intent);

        const lines: string[] = [`Cena ${idx + 1}:`];
        if (narration) lines.push(`- Narração: ${narration}`);
        if (visual) lines.push(`- Visual: ${visual}`);
        if (camera) lines.push(`- Direção de Câmera: ${camera}`);
        if (emotion) lines.push(`- Intenção Emocional: ${emotion}`);
        return lines.join("\n");
      })
      .filter((block: string) => block.length > 10)
      .join("\n\n");

    if (blocksText) {
      sections.push(`BLOCOS DE CENA:\n${blocksText}`);
    }
  }

  // Recording Tips
  if (parsed.recording_tips && typeof parsed.recording_tips === "object") {
    const editing = safeText(parsed.recording_tips.editing);
    const format = safeText(parsed.recording_tips.recommended_format);
    
    let screenTexts: string[] = [];
    const rawScreenText = parsed.recording_tips.screen_text || parsed.recording_tips.on_screen_text;
    if (Array.isArray(rawScreenText)) {
      screenTexts = rawScreenText.map((st: any) => safeText(st)).filter(Boolean);
    } else if (typeof rawScreenText === "string") {
      screenTexts = [safeText(rawScreenText)];
    }

    let visualSugg: string[] = [];
    if (Array.isArray(parsed.recording_tips.visual_suggestions)) {
      visualSugg = parsed.recording_tips.visual_suggestions
        .map((vs: any) => safeText(vs))
        .filter(Boolean);
    }

    const tipLines: string[] = [];
    if (editing) tipLines.push(`Edição: ${editing}`);
    if (screenTexts.length > 0) tipLines.push(`Texto na tela: ${screenTexts.join(", ")}`);
    if (format) tipLines.push(`Formato recomendado: ${format}`);
    if (visualSugg.length > 0) tipLines.push(`Sugestões visuais: ${visualSugg.join("; ")}`);

    if (tipLines.length > 0) {
      sections.push(`DICAS DE GRAVAÇÃO:\n${tipLines.join("\n")}`);
    }
  }

  // Compliance Notes
  if (Array.isArray(parsed.compliance_notes) && parsed.compliance_notes.length > 0) {
    const notes = parsed.compliance_notes.map((n: any) => safeText(n)).filter(Boolean);
    if (notes.length > 0) {
      sections.push(`NOTAS DE COMPLIANCE:\n` + notes.map((n) => `- ${n}`).join("\n"));
    }
  }

  // Quality Check
  if (parsed.quality_check && typeof parsed.quality_check === "object") {
    const q = parsed.quality_check;
    const factSafety = safeText(q.fact_safety) || (q.fact_safety !== undefined ? `${q.fact_safety}/100` : "100% Exato");
    const retention = safeText(q.retention_score) || (q.retention_score !== undefined ? `${q.retention_score}/100` : "Alta");
    const ctaStrength = safeText(q.cta_strength) || (q.cta_strength !== undefined ? `${q.cta_strength}/100` : "Direto");

    sections.push(
      `CHECAGEM DE QUALIDADE:\n` +
        `- Preservação de fatos: ${factSafety}\n` +
        `- Clareza: ${retention}\n` +
        `- CTA: ${ctaStrength}`
    );
  }

  const rawFormatted = sections.join("\n\n");
  return sanitizeAndCleanClipboardText(rawFormatted);
}

/**
 * Strips out any leaking undefined/null strings or raw json artifacts.
 */
function sanitizeAndCleanClipboardText(text: string): string {
  if (!text) return "";
  let clean = text
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return clean;
}
