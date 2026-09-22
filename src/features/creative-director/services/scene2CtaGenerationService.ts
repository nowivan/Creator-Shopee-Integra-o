import { executeAgenteDeCopy } from '../../agente-de-copy/service';
import { parseAgenteDeCopyOutput } from '../../agente-de-copy/parser';
import { Scene3CtaVariation } from '../types/scene3';
import { UploadedProductImage, AgenteDeCopyDiagnostics } from '../../agente-de-copy/types';

// Re-export Dedicated Scene 3 CTA Engine (Phase 2.4.2E Primary Engine)
export * from './scene3CtaEngine';

// Re-export Combined Variations Engine (Phase 2.4.3 Combined Scene 2 + Scene 3 Variations Hub)
export * from './combinedVariationsService';
export * from '../types/combinedVariations';

export interface GenerateScene3CtasInput {
  productImage: string | null;
  productImageName?: string;
  productTitle?: string;
  productQuantity?: string;
  category?: string;
  productFactsText?: string;
  visibleDetailsText?: string;
  productRevisionId: string;
  apiKey?: string;
}

export interface CopyAgentCtaParserDiagnostic {
  copyAgentResponseType: string;
  variationCountDetected: number;
  scene3FieldsDetected: number;
  invalidVariationIndexes: number[];
  parserStage: 'direct_variations_array' | 'json_unwrap' | 'raw_text_parser' | 'diagnostics_recovery' | 'failed';
  issues: string[];
}

export interface CtaGenerationRecoveryDiagnostic {
  recoveryUsed: boolean;
  recoverySource: 'currentAttempt' | 'history';
  attemptNumber?: number;
  scene3Count: number;
  scene2ValidationIgnoredForHub: boolean;
  productRevisionId: string;
}

export class CopyAgentCtaAdapterError extends Error {
  public readonly diagnostics: CopyAgentCtaParserDiagnostic;

  constructor(message: string, diagnostics: CopyAgentCtaParserDiagnostic) {
    super(message);
    this.name = 'CopyAgentCtaAdapterError';
    this.diagnostics = diagnostics;
  }
}

let lastCtaRecoveryDiagnostics: CtaGenerationRecoveryDiagnostic | null = null;

export function getLastCtaRecoveryDiagnostics(): CtaGenerationRecoveryDiagnostic | null {
  return lastCtaRecoveryDiagnostics;
}

/**
 * Extracts and asserts exactly 6 Scene 3 CTA variations from any valid Copy Agent output structure.
 * Guarantees strict byte-for-byte preservation without any trim, mutation, or paraphrasing.
 */
export function parseCopyAgentResponseToScene3Ctas(
  output: any,
  productRevisionId: string,
  stage: 'direct_variations_array' | 'json_unwrap' | 'raw_text_parser' | 'diagnostics_recovery' = 'direct_variations_array'
): Scene3CtaVariation[] {
  const issues: string[] = [];
  const invalidIndexes: number[] = [];

  if (!output) {
    throw new CopyAgentCtaAdapterError(
      'Resposta do Agente de Copy está vazia ou nula.',
      {
        copyAgentResponseType: typeof output,
        variationCountDetected: 0,
        scene3FieldsDetected: 0,
        invalidVariationIndexes: [],
        parserStage: 'failed',
        issues: ['Output is null or undefined']
      }
    );
  }

  // Handle String responses (JSON or Markdown)
  if (typeof output === 'string') {
    const trimmed = output.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        return parseCopyAgentResponseToScene3Ctas(parsedJson, productRevisionId, 'json_unwrap');
      } catch {
        // Fall back to text parsing if JSON parse fails
      }
    }
    const parsedText = parseAgenteDeCopyOutput(output);
    return parseCopyAgentResponseToScene3Ctas(parsedText.variations, productRevisionId, 'raw_text_parser');
  }

  // Resolve array from potential object wrappers
  let rawVariationsArray: any[] | null = null;
  if (Array.isArray(output)) {
    rawVariationsArray = output;
  } else if (typeof output === 'object') {
    if (Array.isArray(output.variations)) {
      rawVariationsArray = output.variations;
    } else if (Array.isArray(output.versions)) {
      rawVariationsArray = output.versions;
    } else if (Array.isArray(output.data)) {
      rawVariationsArray = output.data;
    } else if (typeof output.rawText === 'string' && output.rawText.trim().length > 0) {
      const parsedText = parseAgenteDeCopyOutput(output.rawText);
      return parseCopyAgentResponseToScene3Ctas(parsedText.variations, productRevisionId, 'raw_text_parser');
    } else if (typeof output.completeRawText === 'string' && output.completeRawText.trim().length > 0) {
      const parsedText = parseAgenteDeCopyOutput(output.completeRawText);
      return parseCopyAgentResponseToScene3Ctas(parsedText.variations, productRevisionId, 'raw_text_parser');
    }
  }

  if (!rawVariationsArray || !Array.isArray(rawVariationsArray)) {
    throw new CopyAgentCtaAdapterError(
      'Não foi possível encontrar uma lista de variações na resposta do Agente de Copy.',
      {
        copyAgentResponseType: typeof output,
        variationCountDetected: 0,
        scene3FieldsDetected: 0,
        invalidVariationIndexes: [],
        parserStage: 'failed',
        issues: ['Estrutura da resposta não contém array de variações']
      }
    );
  }

  const variationCountDetected = rawVariationsArray.length;
  const extractedCtas: Scene3CtaVariation[] = [];

  rawVariationsArray.forEach((item: any, idx: number) => {
    if (!item || typeof item !== 'object') {
      invalidIndexes.push(idx);
      issues.push(`Variação no índice ${idx} é inválida ou não é um objeto.`);
      return;
    }

    // Extract CTA text from known Scene 3 / CTA fields in order of precedence
    // NEVER read Scene 2 (e.g. scene2, cena2)
    const rawCtaText = item.scene3 ?? item.cena3 ?? item.Cena3 ?? item.Scene3 ?? item.cta ?? item.CTA ?? item.spokenCta ?? item.text;

    if (typeof rawCtaText !== 'string' || rawCtaText.trim().length === 0) {
      invalidIndexes.push(idx);
      issues.push(`Variação ${idx + 1} não possui campo de CENA 3 / CTA válido.`);
      return;
    }

    // Determine version number
    const versionNum = typeof item.id === 'number'
      ? item.id
      : typeof item.versionNumber === 'number'
      ? item.versionNumber
      : typeof item.versionId === 'number'
      ? item.versionId
      : (idx + 1);

    // Strict byte-level preservation: do NOT mutate, trim, or modify rawCtaText
    extractedCtas.push({
      id: String(versionNum),
      versionNumber: versionNum,
      text: rawCtaText,
      productRevisionId,
      characterCount: rawCtaText.length
    });
  });

  const scene3FieldsDetected = extractedCtas.length;

  if (variationCountDetected !== 6 || scene3FieldsDetected !== 6) {
    const diagnostic: CopyAgentCtaParserDiagnostic = {
      copyAgentResponseType: Array.isArray(output) ? 'Array' : typeof output,
      variationCountDetected,
      scene3FieldsDetected,
      invalidVariationIndexes: invalidIndexes,
      parserStage: stage,
      issues: [
        `Esperava exatamente 6 CTAs de Cena 3, mas foram detectadas ${variationCountDetected} variações (${scene3FieldsDetected} válidas).`,
        ...issues
      ]
    };

    throw new CopyAgentCtaAdapterError(
      `O Agente de Copy retornou ${scene3FieldsDetected} CTAs válidas de Cena 3 (esperado: 6).`,
      diagnostic
    );
  }

  // Sort by version number 1..6 to guarantee deterministic order
  extractedCtas.sort((a, b) => a.versionNumber - b.versionNumber);

  return extractedCtas;
}

/**
 * Phase 2.4.2D.3 — Decoupled Scene 3 CTA Recovery from Diagnostic History.
 * 
 * When executeAgenteDeCopy fails due to strict Scene 2 or 12-scene atomic constraints,
 * this function recovers the 6 valid Scene 3 CTAs without requiring Scene 2 validation.
 * 
 * Rules:
 * 1. Evaluates attempts newest to oldest: currentAttempt -> history[last] -> ... -> history[0]
 * 2. Enforces same-attempt integrity (all 6 CTAs come from the same generation attempt)
 * 3. Validates ONLY Scene 3 (6 non-empty strings, adhering to [160..175] if validated)
 * 4. Preserves byte-for-byte text verbatim
 * 5. Returns recovered CTAs and safe recovery diagnostics
 */
export function tryExtractCtasFromDiagnostics(
  diagnostics: AgenteDeCopyDiagnostics,
  productRevisionId: string,
  options: { validateScene3LengthRange?: boolean } = { validateScene3LengthRange: true }
): { ctas: Scene3CtaVariation[]; diagnostics: CtaGenerationRecoveryDiagnostic } | null {
  if (!diagnostics || typeof diagnostics !== 'object') {
    return null;
  }

  const candidateAttempts: Array<{ attempt: any; source: 'currentAttempt' | 'history' }> = [];

  if (diagnostics.currentAttempt) {
    candidateAttempts.push({ attempt: diagnostics.currentAttempt, source: 'currentAttempt' });
  }

  if (Array.isArray(diagnostics.history)) {
    for (let i = diagnostics.history.length - 1; i >= 0; i--) {
      const h = diagnostics.history[i];
      if (h && h !== diagnostics.currentAttempt) {
        candidateAttempts.push({ attempt: h, source: 'history' });
      }
    }
  }

  for (const { attempt, source } of candidateAttempts) {
    if (!attempt || typeof attempt.completeRawText !== 'string' || attempt.completeRawText.trim().length === 0) {
      continue;
    }

    try {
      const parsed = parseAgenteDeCopyOutput(attempt.completeRawText);
      if (!parsed.variations || parsed.variations.length !== 6) {
        continue;
      }

      let allScene3Valid = true;
      const extracted: Scene3CtaVariation[] = [];

      for (let i = 0; i < parsed.variations.length; i++) {
        const v = parsed.variations[i];
        if (!v || typeof v.scene3 !== 'string') {
          allScene3Valid = false;
          break;
        }

        const ctaText = v.scene3;
        if (ctaText.trim().length === 0) {
          allScene3Valid = false;
          break;
        }

        if (options.validateScene3LengthRange) {
          if (ctaText.length < 160 || ctaText.length > 175) {
            allScene3Valid = false;
            break;
          }
        }

        const versionNum = typeof v.id === 'number' ? v.id : (i + 1);

        // Strict byte preservation
        extracted.push({
          id: String(versionNum),
          versionNumber: versionNum,
          text: ctaText,
          productRevisionId,
          characterCount: ctaText.length
        });
      }

      if (allScene3Valid && extracted.length === 6) {
        extracted.sort((a, b) => a.versionNumber - b.versionNumber);
        return {
          ctas: extracted,
          diagnostics: {
            recoveryUsed: true,
            recoverySource: source,
            attemptNumber: attempt.attemptNumber,
            scene3Count: 6,
            scene2ValidationIgnoredForHub: true,
            productRevisionId
          }
        };
      }
    } catch {
      // Continue to previous attempt
    }
  }

  return null;
}

/**
 * Phase 2.4.2D — Scene 2 CTA Generation Service
 * 
 * Reuses the EXISTING Copy Agent service (executeAgenteDeCopy) without creating
 * any new copy intelligence, vision re-analysis, or duplicate grounding.
 * Extracts all 6 Scene 3 CTA variations with strict byte-lock preservation.
 */
export async function generateScene3CtasFromCopyAgent(
  input: GenerateScene3CtasInput
): Promise<Scene3CtaVariation[]> {
  const {
    productImage,
    productImageName,
    productTitle,
    productQuantity,
    category,
    productFactsText,
    visibleDetailsText,
    productRevisionId,
    apiKey
  } = input;

  // 1. Strict Grounding Pre-condition Check
  if (!productImage) {
    throw new Error('Imagem do produto é obrigatória para gerar as CTAs.');
  }

  const hasFactualGrounding = Boolean(
    (productFactsText && productFactsText.trim().length > 0) ||
    (visibleDetailsText && visibleDetailsText.trim().length > 0)
  );

  if (!hasFactualGrounding) {
    throw new Error('Analise o produto antes de gerar as CTAs.');
  }

  // 2. Prepare structured factual context for the existing Copy Agent
  const infoParts: string[] = [];
  if (category && category.trim()) {
    infoParts.push(`Categoria: ${category.trim()}`);
  }
  if (productQuantity && productQuantity.trim()) {
    infoParts.push(`Quantidade/Topologia: ${productQuantity.trim()}`);
  }
  if (productFactsText && productFactsText.trim()) {
    infoParts.push(`Fatos físicos verificados:\n${productFactsText.trim()}`);
  }
  if (visibleDetailsText && visibleDetailsText.trim()) {
    infoParts.push(`Detalhes visuais observáveis:\n${visibleDetailsText.trim()}`);
  }

  const uploadedImage: UploadedProductImage = {
    dataUrl: productImage,
    name: productImageName || 'product_image.png',
    type: productImage.startsWith('data:image/webp')
      ? 'image/webp'
      : productImage.startsWith('data:image/png')
      ? 'image/png'
      : 'image/jpeg'
  };

  lastCtaRecoveryDiagnostics = null;

  // 3. Delegate directly to the existing Copy Agent engine
  try {
    const copyAgentResult = await executeAgenteDeCopy({
      productImage: uploadedImage,
      productTitle: productTitle?.trim() || undefined,
      productInfo: infoParts.length > 0 ? infoParts.join('\n\n') : undefined,
      apiKey
    });

    return parseCopyAgentResponseToScene3Ctas(copyAgentResult, productRevisionId, 'direct_variations_array');
  } catch (err: any) {
    // Attempt recovery from diagnostics if executeAgenteDeCopy threw AgenteDeCopyExecutionError
    if (err?.diagnostics) {
      const recovered = tryExtractCtasFromDiagnostics(err.diagnostics, productRevisionId, { validateScene3LengthRange: true });
      if (recovered && recovered.ctas.length === 6) {
        lastCtaRecoveryDiagnostics = recovered.diagnostics;
        return recovered.ctas;
      }
    }

    if (err instanceof CopyAgentCtaAdapterError) {
      throw err;
    }

    // Do NOT swallow unrelated errors (network, auth, API errors without diagnostics)
    const message = err?.message || 'Erro ao gerar CTAs com o Agente de Copy.';
    throw new Error(message);
  }
}

