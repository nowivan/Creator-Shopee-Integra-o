/**
 * SCENE 3 CTA HUB SERVICE — DEDICATED CTA GENERATION HUB
 * Connects the UI directly to the canonical scene3CtaEngine.ts
 */

import { generateScene3CtaVariations, Scene3CtaEngineInput, validateSemanticEvidence } from './scene3CtaEngine';
import { Scene3CtaHubInput, Scene3CtaHubResult, Scene3CtaVariation } from '../types/scene3CtaHub';
import { validateCopyContract } from '../../copy-contract';

export async function generateScene3CtaHubVariations(input: Scene3CtaHubInput): Promise<Scene3CtaHubResult> {
  const engineInput: Scene3CtaEngineInput = {
    productRevisionId: input.productRevisionId,
    productIdentity: input.productIdentity,
    category: input.category,
    quantity: input.quantityDescription,
    verifiedFacts: input.verifiedFacts,
    visibleDetails: input.visibleDetails,
    commercialFacts: input.commercialFacts,
    variationCount: input.quantity,
    apiKey: input.apiKey
  };

  const engineVariations = await generateScene3CtaVariations(engineInput);

  const variations: Scene3CtaVariation[] = engineVariations.map((v, idx) => {
    const contractValidation = validateCopyContract(v.text);
    const semanticValidation = validateSemanticEvidence(v.text, input.commercialFacts);
    const isValid = contractValidation.valid && semanticValidation.valid;

    return {
      id: `cta-var-${v.versionNumber || idx + 1}`,
      variationIndex: v.versionNumber || idx + 1,
      text: v.text,
      characterCount: v.characterCount || v.text.length,
      isValid,
      productRevisionId: v.productRevisionId || input.productRevisionId,
      semanticEvidenceValid: semanticValidation.valid,
      semanticViolations: semanticValidation.violations
    };
  });

  return {
    quantity: input.quantity,
    variations
  };
}
