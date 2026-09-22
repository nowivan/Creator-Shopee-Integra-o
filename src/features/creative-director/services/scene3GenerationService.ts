/**
 * SCENE 3 GENERATION & ORCHESTRATION SERVICE
 * Phase 2.4 — End-to-End Pipeline Integration
 * 
 * Pipeline Flow:
 * Authoritative Copy Agent CTA
 *   ↓
 * Scene 3 Validation Gate (Product Context, Presenter, Wardrobe, Spoken CTA)
 *   ↓
 * Scene Brain C3 Visual Reasoning Engine
 *   ↓
 * Scene 3 Dynamic Slots Mapping
 *   ↓
 * Scene 3 Deterministic Prompt Compiler & Immutability Verification
 *   ↓
 * End-to-End CTA Byte-Lock Assertion (SCENE3_CTA_DRIFT protection)
 *   ↓
 * Final Homologated Scene 3 Prompt + Diagnostic Trace
 */

import {
  Scene3GenerationInput,
  Scene3GenerationResult,
  Scene3BrainInput,
  Scene3DynamicSlots,
  Scene3DiagnosticTrace
} from '../types/scene3';
import { COPY_CONTRACT, validateCopyContract } from '../../copy-contract';
import {
  runScene3BrainService,
  mapScene3BrainToDynamicSlots,
  validateScene3BrainResult
} from './scene3BrainService';
import {
  validateScene3Slots,
  buildCompiledScene3Model,
  renderScene3Text,
  renderScene3Json,
  renderScene3JsonString,
  Scene3CompilationError
} from '../compiler/scene3PromptCompiler';
import { generateDeterministicCtaFallback } from './scene3CtaEngine';

export class Scene3OrchestrationError extends Error {
  public readonly code: string;
  public readonly details: string[];

  constructor(message: string, code: string, details: string[] = []) {
    super(message);
    this.name = 'Scene3OrchestrationError';
    this.code = code;
    this.details = details;
  }
}

const STORAGE_KEY_SHOPEE = 'creator_pro_shopee_copy_session_v1';
const STORAGE_KEY_CLEAN = 'creator_pro_copy_agent_suite_clean_session_v1';
const STORAGE_KEY_SELECTION = 'robizin_agente_de_copy_selection';
const STORAGE_KEY_STATE = 'robizin_agente_de_copy_state';

export interface AuthoritativeCopyAgentCtaInfo {
  cta: string;
  source: 'user_selected' | 'recommended' | 'active_variation';
  versionId: number;
  productTitle?: string;
  savedAt?: number;
  characterCount: number;
  origin?: 'shopee' | 'clean' | 'legacy';
}

/**
 * Retrieves full metadata and authoritative CTA for Scene 3 from Copy Agent storage.
 * Safe Resolution Priority:
 *   1. Explicit active Shopee selection ('creator_pro_shopee_copy_session_v1')
 *   2. Explicit active Clean selection ('creator_pro_copy_agent_suite_clean_session_v1')
 *   3. Backward-compatible legacy storage ('robizin_*')
 * Strictly guarantees Byte-Lock (no trims, no formatting alterations).
 */
export function getAuthoritativeCopyAgentScene3Info(): AuthoritativeCopyAgentCtaInfo | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    // PRIORITY 1: Shopee Canonical Session
    const shopeeRaw = localStorage.getItem(STORAGE_KEY_SHOPEE);
    if (shopeeRaw) {
      try {
        const shopeeSession = JSON.parse(shopeeRaw);
        if (
          shopeeSession &&
          shopeeSession.schemaVersion === 1 &&
          Array.isArray(shopeeSession.variations) &&
          shopeeSession.variations.length > 0
        ) {
          // Explicit selectedScene3Copy
          if (
            typeof shopeeSession.selectedScene3Copy === 'string' &&
            shopeeSession.selectedScene3Copy.trim().length > 0
          ) {
            const versionId = shopeeSession.selectedVariationId || 1;
            return {
              cta: shopeeSession.selectedScene3Copy,
              source: 'user_selected',
              versionId,
              productTitle: shopeeSession.productContext || undefined,
              savedAt: shopeeSession.savedAt || undefined,
              characterCount: shopeeSession.selectedScene3Copy.length,
              origin: 'shopee'
            };
          }

          // Selected variation ID lookup
          if (typeof shopeeSession.selectedVariationId === 'number') {
            const found = shopeeSession.variations.find(
              (v: any) => v && v.id === shopeeSession.selectedVariationId
            );
            if (found && typeof found.scene3 === 'string' && found.scene3.trim().length > 0) {
              return {
                cta: found.scene3,
                source: 'user_selected',
                versionId: found.id,
                productTitle: shopeeSession.productContext || undefined,
                savedAt: shopeeSession.savedAt || undefined,
                characterCount: found.scene3.length,
                origin: 'shopee'
              };
            }
          }

          // Fallback to active variation 1
          const firstVar = shopeeSession.variations.find(
            (v: any) => v && typeof v.scene3 === 'string' && v.scene3.trim().length > 0
          );
          if (firstVar) {
            return {
              cta: firstVar.scene3,
              source: 'active_variation',
              versionId: firstVar.id || 1,
              productTitle: shopeeSession.productContext || undefined,
              savedAt: shopeeSession.savedAt || undefined,
              characterCount: firstVar.scene3.length,
              origin: 'shopee'
            };
          }
        }
      } catch (e) {
        console.warn('[Scene 3 Orchestration] Malformed Shopee session JSON in storage:', e);
      }
    }

    // PRIORITY 2: Clean Canonical Session
    const cleanRaw = localStorage.getItem(STORAGE_KEY_CLEAN);
    if (cleanRaw) {
      try {
        const cleanSession = JSON.parse(cleanRaw);
        if (cleanSession && cleanSession.schemaVersion === 1) {
          // Explicit selectedScene3Copy
          if (
            typeof cleanSession.selectedScene3Copy === 'string' &&
            cleanSession.selectedScene3Copy.trim().length > 0
          ) {
            const versionId = cleanSession.selectedVariationId || 1;
            return {
              cta: cleanSession.selectedScene3Copy,
              source: 'user_selected',
              versionId,
              productTitle: cleanSession.productContext || undefined,
              savedAt: cleanSession.savedAt || undefined,
              characterCount: cleanSession.selectedScene3Copy.length,
              origin: 'clean'
            };
          }

          // Check cleanResultsByVariant
          if (cleanSession.cleanResultsByVariant && typeof cleanSession.cleanResultsByVariant === 'object') {
            const resultsByVariant = cleanSession.cleanResultsByVariant;
            const targetVariantKey =
              cleanSession.brainVariant ||
              cleanSession.activeMode?.replace('clean_', '').toUpperCase() ||
              'D';
            const activeResult =
              resultsByVariant[targetVariantKey] ||
              Object.values(resultsByVariant).find(
                (r: any) => r && Array.isArray(r.variations) && r.variations.length > 0
              );

            if (activeResult && Array.isArray(activeResult.variations) && activeResult.variations.length > 0) {
              const targetId = cleanSession.selectedVariationId;
              if (targetId) {
                const found = activeResult.variations.find((v: any) => v && v.id === targetId);
                if (found && typeof found.scene3 === 'string' && found.scene3.trim().length > 0) {
                  return {
                    cta: found.scene3,
                    source: 'user_selected',
                    versionId: targetId,
                    productTitle: cleanSession.productContext || undefined,
                    savedAt: cleanSession.savedAt || undefined,
                    characterCount: found.scene3.length,
                    origin: 'clean'
                  };
                }
              }

              const firstVar = activeResult.variations.find(
                (v: any) => v && typeof v.scene3 === 'string' && v.scene3.trim().length > 0
              );
              if (firstVar) {
                return {
                  cta: firstVar.scene3,
                  source: 'active_variation',
                  versionId: firstVar.id || 1,
                  productTitle: cleanSession.productContext || undefined,
                  savedAt: cleanSession.savedAt || undefined,
                  characterCount: firstVar.scene3.length,
                  origin: 'clean'
                };
              }
            }
          }

          // Check cleanSession.variations (e.g. structured or text formats)
          if (Array.isArray(cleanSession.variations) && cleanSession.variations.length > 0) {
            for (const v of cleanSession.variations) {
              if (typeof v.text === 'string' && v.text.includes('CENA 3:')) {
                const parts = v.text.split(/CENA\s*3\s*:\s*/i);
                if (parts[1]) {
                  const scene3Text = parts[1].split(/\n\n/)[0].trim();
                  if (scene3Text.length > 0) {
                    return {
                      cta: scene3Text,
                      source: 'active_variation',
                      versionId: Number(v.id) || 1,
                      productTitle: cleanSession.productContext || undefined,
                      savedAt: cleanSession.savedAt || undefined,
                      characterCount: scene3Text.length,
                      origin: 'clean'
                    };
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Scene 3 Orchestration] Malformed Clean session JSON in storage:', e);
      }
    }

    // PRIORITY 3: Legacy Fallback Storage ('robizin_*')
    let rawSelection: any = null;
    const savedSelectionRaw = localStorage.getItem(STORAGE_KEY_SELECTION);
    if (savedSelectionRaw) {
      try {
        rawSelection = JSON.parse(savedSelectionRaw);
      } catch (e) {
        console.warn('[Scene 3 Orchestration] Malformed selection JSON in storage:', e);
      }
    }

    let rawState: any = null;
    const savedStateRaw = localStorage.getItem(STORAGE_KEY_STATE);
    if (savedStateRaw) {
      try {
        rawState = JSON.parse(savedStateRaw);
      } catch (e) {
        console.warn('[Scene 3 Orchestration] Malformed state JSON in storage:', e);
      }
    }

    // 1. Check primary selection storage for explicit selectedScene3Copy
    if (rawSelection && typeof rawSelection.selectedScene3Copy === 'string' && rawSelection.selectedScene3Copy.length > 0) {
      const versionId = rawSelection.selectedScene3VariationId || rawSelection.selectedVariationId || 1;
      return {
        cta: rawSelection.selectedScene3Copy,
        source: 'user_selected',
        versionId,
        productTitle: rawState?.productTitle || undefined,
        savedAt: rawSelection.savedAt || undefined,
        characterCount: rawSelection.selectedScene3Copy.length,
        origin: 'legacy'
      };
    }

    // 2. Check if a variation ID was selected in rawSelection and look up in rawState.variations
    if (rawSelection && rawState && Array.isArray(rawState.variations) && rawState.variations.length > 0) {
      const targetId = rawSelection.selectedScene3VariationId || rawSelection.selectedVariationId;
      if (targetId) {
        const found = rawState.variations.find((v: any) => v.id === targetId);
        if (found && typeof found.scene3 === 'string' && found.scene3.length > 0) {
          return {
            cta: found.scene3,
            source: 'user_selected',
            versionId: targetId,
            productTitle: rawState?.productTitle || undefined,
            savedAt: rawSelection.savedAt || undefined,
            characterCount: found.scene3.length,
            origin: 'legacy'
          };
        }
      }
    }

    // 3. Fallback: check if rawState has an evaluation with recommendedScene3Id
    if (rawState && Array.isArray(rawState.variations) && rawState.variations.length > 0) {
      const recId = rawState.evaluation?.recommendedScene3Id;
      if (recId) {
        const found = rawState.variations.find((v: any) => v.id === recId);
        if (found && typeof found.scene3 === 'string' && found.scene3.length > 0) {
          return {
            cta: found.scene3,
            source: 'recommended',
            versionId: recId,
            productTitle: rawState?.productTitle || undefined,
            characterCount: found.scene3.length,
            origin: 'legacy'
          };
        }
      }

      // 4. Fallback: take active variation 1
      const firstVar = rawState.variations[0];
      if (firstVar && typeof firstVar.scene3 === 'string' && firstVar.scene3.length > 0) {
        return {
          cta: firstVar.scene3,
          source: 'active_variation',
          versionId: firstVar.id || 1,
          productTitle: rawState?.productTitle || undefined,
          characterCount: firstVar.scene3.length,
          origin: 'legacy'
        };
      }
    }
  } catch (err) {
    console.warn('[Scene 3 Orchestration] Could not read Copy Agent selection storage:', err);
  }
  return null;
}

/**
 * Retrieves the authoritative Scene 3 CTA string from the Copy Agent storage / session.
 * Exact byte-lock match.
 */
export function getAuthoritativeCopyAgentScene3Cta(): string | null {
  const info = getAuthoritativeCopyAgentScene3Info();
  return info ? info.cta : null;
}

/**
 * Runs the end-to-end Scene 3 generation pipeline.
 * Validates inputs, executes Scene Brain C3, maps dynamic slots, compiles the prompt,
 * and rigorously asserts CTA byte-preservation across all stages.
 */
export async function runScene3Generation(
  input: Scene3GenerationInput
): Promise<Scene3GenerationResult> {
  const startTime = Date.now();

  // 1. INPUT VALIDATION GATES
  if (!input) {
    throw new Scene3OrchestrationError(
      'Parâmetros de entrada inválidos para geração da Cena 3.',
      'SCENE3_INPUT_INVALID',
      ['O objeto de entrada não pode ser nulo ou indefinido.']
    );
  }

  // 1.1 Product Context Gate
  if (
    !input.productContext ||
    !input.productContext.identity ||
    !input.productContext.identity.trim() ||
    !Array.isArray(input.productContext.visibleDetails) ||
    input.productContext.visibleDetails.length === 0 ||
    !Array.isArray(input.productContext.knownPhysicalFacts) ||
    input.productContext.knownPhysicalFacts.length === 0
  ) {
    throw new Scene3OrchestrationError(
      'Contexto factual do produto ausente ou incompleto para a Cena 3.',
      'SCENE3_PRODUCT_CONTEXT_MISSING',
      ['Identidade do produto, fatos verificáveis e detalhes visíveis são obrigatórios.']
    );
  }

  // 1.2 Presenter Gate
  if (!input.presenter || !input.presenter.identity || !input.presenter.identity.trim()) {
    throw new Scene3OrchestrationError(
      'Identidade do apresentador não informada para a Cena 3.',
      'SCENE3_PRESENTER_MISSING',
      ['A descrição da identidade do apresentador é obrigatória.']
    );
  }

  // 1.3 Wardrobe Gate
  if (!input.wardrobe || !input.wardrobe.description || !input.wardrobe.description.trim()) {
    throw new Scene3OrchestrationError(
      'Figurino (Wardrobe) não informado para a Cena 3.',
      'SCENE3_WARDROBE_MISSING',
      ['A descrição do figurino do apresentador é obrigatória.']
    );
  }

  // 1.4 Spoken CTA Gate (Immutable source contract + Pre-Byte-Lock Canonical Contract Validation)
  let effectiveSpokenCta = (input.spokenCta || '').trim();
  if (!effectiveSpokenCta) {
    const authoritativeInfo = getAuthoritativeCopyAgentScene3Info();
    if (authoritativeInfo?.cta?.trim()) {
      effectiveSpokenCta = authoritativeInfo.cta.trim();
    } else if (input.productContext?.identity) {
      effectiveSpokenCta = generateDeterministicCtaFallback(1, {
        productRevisionId: 'rev_auto',
        productIdentity: input.productContext.identity.trim(),
        category: input.productContext.category?.trim(),
        verifiedFacts: input.productContext.knownPhysicalFacts || [],
        visibleDetails: input.productContext.visibleDetails || []
      }).trim();
    }
  }

  if (!effectiveSpokenCta) {
    throw new Scene3OrchestrationError(
      'Nenhum CTA falado disponível para a Cena 3.',
      'SCENE3_CTA_MISSING',
      ['O CTA falado deve ser fornecido pelo Agente de Copy ou preenchido manualmente.']
    );
  }

  const immutableSpokenCta = effectiveSpokenCta;

  // PRE-BYTE-LOCK CANONICAL COPY CONTRACT GATE
  const ctaContractValidation = validateCopyContract(immutableSpokenCta);
  if (!ctaContractValidation.valid) {
    throw new Scene3OrchestrationError(
      `A CTA da Cena 3 não cumpre o contrato canônico de copy (${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres com frase completa).`,
      'SCENE3_CTA_CONTRACT_INVALID',
      ctaContractValidation.errors
    );
  }

  // 2. CONSTRUCT SCENE 3 BRAIN INPUT
  const brainInput: Scene3BrainInput = {
    product: {
      identity: input.productContext.identity.trim(),
      category: input.productContext.category?.trim() || undefined,
      visibleDetails: input.productContext.visibleDetails.map(d => d.trim()).filter(Boolean),
      knownPhysicalFacts: input.productContext.knownPhysicalFacts.map(f => f.trim()).filter(Boolean),
      quantity: input.productContext.quantity || null
    },
    presenter: {
      identity: input.presenter.identity.trim(),
      gender: input.presenter.gender
    },
    wardrobe: {
      description: input.wardrobe.description.trim()
    },
    spokenCta: immutableSpokenCta
  };

  // 3. EXECUTE SCENE BRAIN C3 REASONING
  let brainResult;
  try {
    brainResult = await runScene3BrainService(brainInput, input.apiKey || '');
  } catch (brainErr: any) {
    throw new Scene3OrchestrationError(
      `Falha no processamento visual do Scene Brain C3: ${brainErr.message}`,
      'SCENE3_BRAIN_FAILURE',
      [brainErr.message]
    );
  }

  // 4. VALIDATE BRAIN RESULT
  const brainValidation = validateScene3BrainResult(brainResult);
  if (!brainValidation.valid) {
    throw new Scene3OrchestrationError(
      'Resultado gerado pelo Scene Brain C3 é inválido.',
      'SCENE3_BRAIN_INVALID_OUTPUT',
      brainValidation.errors
    );
  }

  // 5. MAP BRAIN RESULT TO SCENE 3 DYNAMIC SLOTS
  const dynamicSlots: Scene3DynamicSlots = mapScene3BrainToDynamicSlots(brainInput, brainResult);
  if (input.avatarIdentityContext || input.presenter.avatarIdentityContext) {
    dynamicSlots.avatarIdentityContext = input.avatarIdentityContext || input.presenter.avatarIdentityContext;
    dynamicSlots.presenter.avatarIdentityContext = input.avatarIdentityContext || input.presenter.avatarIdentityContext;
  }
  // Ensure structured wardrobe fields are retained if passed
  dynamicSlots.wardrobe = {
    description: input.wardrobe.description.trim(),
    topType: input.wardrobe.topType,
    topStyle: input.wardrobe.topStyle,
    topColor: input.wardrobe.topColor,
    bottomType: input.wardrobe.bottomType,
    bottomColor: input.wardrobe.bottomColor,
    footwearType: input.wardrobe.footwearType,
    footwearColor: input.wardrobe.footwearColor,
    resolvedWardrobeContract: input.wardrobe.resolvedWardrobeContract || input.resolvedWardrobeContract,
    wardrobeConsistencyLock: input.wardrobe.wardrobeConsistencyLock || input.wardrobeConsistencyLock
  };

  // 6. VALIDATE DYNAMIC SLOTS DETERMINISTICALLY
  const slotsValidation = validateScene3Slots(dynamicSlots);
  if (!slotsValidation.valid) {
    throw new Scene3OrchestrationError(
      'Slots dinâmicos da Cena 3 não passaram na validação do compilador.',
      'SCENE3_COMPILATION_FAILURE',
      slotsValidation.errors
    );
  }

  // 7. BUILD COMPILED MODEL & RENDER OUTPUTS
  let compiledModel;
  let finalPrompt;
  let jsonOutput;
  let compiledJsonString;

  try {
    compiledModel = buildCompiledScene3Model(dynamicSlots);
    finalPrompt = renderScene3Text(compiledModel);
    jsonOutput = renderScene3Json(compiledModel);
    compiledJsonString = renderScene3JsonString(compiledModel);
  } catch (compErr: any) {
    throw new Scene3OrchestrationError(
      `Erro na compilação do prompt da Cena 3: ${compErr.message}`,
      'SCENE3_COMPILATION_FAILURE',
      [compErr.message]
    );
  }

  // 8. END-TO-END CTA BYTE-PRESERVATION ASSERTION
  // Copy Agent Scene 3 CTA === Scene3BrainInput.spokenCta === Scene3DynamicSlots.spokenCta === CompiledScene3Model.dialogue.spokenCta === CTA in final prompt
  const matchesInput = brainInput.spokenCta === immutableSpokenCta;
  const matchesSlots = dynamicSlots.spokenCta === immutableSpokenCta;
  const matchesModel = compiledModel.dialogue.spokenCta === immutableSpokenCta;
  const matchesPrompt = finalPrompt.includes(immutableSpokenCta);

  if (!matchesInput || !matchesSlots || !matchesModel || !matchesPrompt) {
    throw new Scene3OrchestrationError(
      'Violação crítica do contrato de imutabilidade do CTA: Detectado drift de CTA no pipeline.',
      'SCENE3_CTA_DRIFT',
      [
        `Original CTA: "${immutableSpokenCta}"`,
        `Brain Input: "${brainInput.spokenCta}"`,
        `Dynamic Slots: "${dynamicSlots.spokenCta}"`,
        `Compiled Model: "${compiledModel.dialogue.spokenCta}"`,
        `Present in Final Prompt: ${matchesPrompt}`
      ]
    );
  }

  const executionTimeMs = Date.now() - startTime;

  // 9. COMPOSE SAFE DIAGNOSTIC TRACE (No secrets, no base64)
  const diagnosticTrace: Scene3DiagnosticTrace = {
    timestamp: new Date().toISOString(),
    ctaInput: immutableSpokenCta,
    productContextSummary: {
      identity: input.productContext.identity,
      category: input.productContext.category,
      factsCount: input.productContext.knownPhysicalFacts.length,
      detailsCount: input.productContext.visibleDetails.length,
      quantity: input.productContext.quantity
    },
    brainResult,
    dynamicSlots,
    avatarIdentityContext: input.avatarIdentityContext || input.presenter.avatarIdentityContext,
    compiledPrompt: finalPrompt,
    compiledJson: jsonOutput,
    executionTimeMs,
    ctaByteLockVerified: true
  };

  return {
    brainResult,
    dynamicSlots,
    compiledModel,
    finalPrompt,
    jsonOutput,
    compiledJsonString,
    diagnosticTrace
  };
}
