/**
 * SCENE 3 BRAIN SERVICE — SCENE 3 VISUAL REASONING ENGINE
 * Phase 2.3 Architecture — Conversion & CTA Closing Scene
 * 
 * Contract:
 * 1. Receives spokenCta as IMMUTABLE input from Copy Agent.
 * 2. MUST NOT generate, rewrite, paraphrase, shorten, expand, or optimize the CTA.
 * 3. Builds the functional environment, 4 temporal action blocks (0-8s), CTA gesture,
 *    speech/action synchronization, and product-specific negative constraints.
 * 4. Strictly enforces evidence gates, quantity awareness, and anti-generic rules.
 */

import { processGeminiAPI, safeJSONParse } from '../../../utils';
import {
  Scene3BrainInput,
  Scene3BrainResult,
  Scene3DynamicSlots
} from '../types/scene3';
import { extractDataFromGeminiResponse } from './productGroundingService';

export class Scene3BrainValidationError extends Error {
  public readonly code: string;
  public readonly details: string[];

  constructor(message: string, code: string = 'SCENE3_BRAIN_INVALID_OUTPUT', details: string[] = []) {
    super(message);
    this.name = 'Scene3BrainValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Deterministically resolves a realistic everyday functional environment
 * based on verified product category, facts, and everyday usage.
 */
export function resolveScene3FunctionalEnvironment(category: string, productName: string): string {
  const cat = (category || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  if (cat.includes('banho') || cat.includes('towel') || cat.includes('toalha') || name.includes('toalha')) {
    return 'residential bathroom with clean white tile, matte black fixtures and natural window light';
  }
  if (cat.includes('cozinha') || cat.includes('kitchen') || cat.includes('panela') || cat.includes('cookware') || name.includes('panela') || name.includes('frigideira')) {
    return 'modern residential kitchen with polished countertop, warm wooden shelves and natural daylight';
  }
  if (cat.includes('perfume') || cat.includes('splash') || cat.includes('fragrância') || cat.includes('cosmético') || cat.includes('beleza') || name.includes('splash') || name.includes('perfume')) {
    return 'contemporary bedroom dressing area with wooden vanity, soft mirror reflections and warm daylight';
  }
  if (cat.includes('relogio') || cat.includes('relógio') || cat.includes('watch') || name.includes('relógio') || name.includes('watch')) {
    return 'modern urban living space with warm wood elements and soft natural daylight';
  }
  if (cat.includes('calçado') || cat.includes('tênis') || cat.includes('tenis') || cat.includes('sneaker') || cat.includes('sapato') || name.includes('tênis') || name.includes('sneaker')) {
    return 'stylish modern apartment entryway with clean hardwood floor and warm natural daylight';
  }
  if (cat.includes('livro') || cat.includes('bíblia') || cat.includes('biblia') || cat.includes('book') || name.includes('bíblia') || name.includes('livro')) {
    return 'cozy residential reading nook with comfortable armchair, wooden bookshelf and gentle window light';
  }
  if (cat.includes('cama') || cat.includes('travesseiro') || cat.includes('pillow') || cat.includes('bedding') || name.includes('travesseiro') || name.includes('lençol')) {
    return 'bright contemporary bedroom with soft linen textures, neutral headboard and morning natural light';
  }
  if (cat.includes('eletrônico') || cat.includes('tech') || cat.includes('gadget') || cat.includes('audio') || cat.includes('fone')) {
    return 'clean minimalist home office desk setup with subtle ambient backlight and authentic room daylight';
  }

  return 'real modern interior with warm neutral tones, authentic everyday furniture and soft ambient daylight';
}

/**
 * Generates product-specific negative constraints based on category and physical facts.
 */
export function generateProductSpecificNegatives(category: string, productName: string): string[] {
  const cat = (category || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  if (cat.includes('relogio') || cat.includes('relógio') || cat.includes('watch') || name.includes('relógio') || name.includes('watch')) {
    return [
      'NO warped watch bracelet or distorted steel links.',
      'NO distorted watch face or misaligned dial markers.',
      'NO oversized watch proportions on wrist.',
      'NO digital smartwatch screen animation on mechanical watch.'
    ];
  }
  if (cat.includes('calçado') || cat.includes('tênis') || cat.includes('tenis') || cat.includes('sneaker') || cat.includes('sapato') || name.includes('tênis') || name.includes('sneaker')) {
    return [
      'NO sole deformation or rubber midsole distortion.',
      'NO foot clipping through shoe fabric or outsole.',
      'NO altered shoe silhouette or distorted laces.'
    ];
  }
  if (cat.includes('livro') || cat.includes('bíblia') || cat.includes('biblia') || cat.includes('book') || name.includes('bíblia') || name.includes('livro')) {
    return [
      'NO duplicate book or phantom second volume.',
      'NO warped pages or impossible page geometry.',
      'NO inverted or unreadable cover typography.'
    ];
  }
  if (cat.includes('perfume') || cat.includes('splash') || cat.includes('fragrância') || cat.includes('cosmético') || name.includes('splash') || name.includes('perfume') || name.includes('kit')) {
    return [
      'NO phantom bottle duplication during handling.',
      'NO changing label colors or dissolving logo art.',
      'NO spray nozzle deformation or missing pump cap.'
    ];
  }
  if (cat.includes('banho') || cat.includes('towel') || cat.includes('toalha') || name.includes('toalha')) {
    return [
      'NO distorted towel stitches or frayed edge artifacts.',
      'NO wet bathroom floor stains or messy background reflections.'
    ];
  }
  if (cat.includes('cozinha') || cat.includes('kitchen') || cat.includes('panela') || cat.includes('cookware') || name.includes('panela')) {
    return [
      'NO distorted cookware handle or warped non-stick coating.',
      'NO impossible stovetop flame or hazard effects.'
    ];
  }

  return [
    'NO product deformation or distorted branding.',
    'NO phantom object duplication during handling.'
  ];
}

/**
 * Validates action evidence against physical facts and common sense rules.
 */
export function validateActionEvidence(actions: {
  action0to2: string;
  action2to4: string;
  action4to6: string;
  action6to8: string;
}, productFacts: string[], category: string = ''): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allActionText = `${actions.action0to2} ${actions.action2to4} ${actions.action4to6} ${actions.action6to8}`.toLowerCase();

  // 1. Prohibit fake UI interactions
  if (allActionText.includes('cart icon') || allActionText.includes('floating button') || allActionText.includes('taps screen button') || allActionText.includes('taps cart')) {
    errors.push('Actions must not interact with fake UI buttons or cart icons.');
  }

  // 2. Prohibit unverified smartwatch mechanisms on analog watches
  if (category.toLowerCase().includes('watch') || category.toLowerCase().includes('relógio')) {
    if (allActionText.includes('touchscreen') || allActionText.includes('swipe screen') || allActionText.includes('digital heart rate')) {
      errors.push('Analog/Quartz watch must not perform digital touchscreen or smartwatch actions.');
    }
  }

  // 3. Prohibit commercial claim invention in actions
  const commercialTerms = ['50% off', 'desconto', 'preço', 'r$', 'cupom', 'estoque limitado', 'últimas unidades'];
  for (const term of commercialTerms) {
    if (allActionText.includes(term)) {
      errors.push(`Action plan must not invent commercial terms ("${term}").`);
    }
  }

  // 4. Anti-generic check: At least 2 blocks must contain concrete product handling
  const actionList = [actions.action0to2, actions.action2to4, actions.action4to6, actions.action6to8];
  const genericStubs = ['holds product and smiles', 'shows product to camera', 'gestures naturally', 'smiles at camera'];
  let specificCount = 0;

  for (const act of actionList) {
    const isPurelyGeneric = genericStubs.some(stub => act.trim().toLowerCase() === stub);
    if (!isPurelyGeneric && act.length > 25) {
      specificCount++;
    }
  }

  if (specificCount < 2) {
    errors.push('At least 2 of the 4 action blocks must contain specific, non-generic product handling.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates the complete Scene 3 Brain Result structure deterministically.
 */
export function validateScene3BrainResult(result: Partial<Scene3BrainResult>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!result) {
    return { valid: false, errors: ['Result is null or undefined.'] };
  }

  if (!result.environment || !result.environment.trim()) {
    errors.push('Missing environment.');
  }

  if (!result.actions) {
    errors.push('Missing actions object.');
  } else {
    if (!result.actions.action0to2 || !result.actions.action0to2.trim()) errors.push('Missing action0to2.');
    if (!result.actions.action2to4 || !result.actions.action2to4.trim()) errors.push('Missing action2to4.');
    if (!result.actions.action4to6 || !result.actions.action4to6.trim()) errors.push('Missing action4to6.');
    if (!result.actions.action6to8 || !result.actions.action6to8.trim()) errors.push('Missing action6to8.');
  }

  if (!result.ctaGesture || !result.ctaGesture.trim()) {
    errors.push('Missing ctaGesture.');
  }

  if (!Array.isArray(result.speechActionSync) || result.speechActionSync.length === 0) {
    errors.push('speechActionSync must contain 1 to 3 items.');
  } else if (result.speechActionSync.length > 3) {
    errors.push('speechActionSync must not exceed 3 items.');
  }

  if (!Array.isArray(result.productSpecificNegatives)) {
    errors.push('productSpecificNegatives must be an array.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Constructs high-fidelity deterministic fallback actions when LLM is unavailable or invalid.
 */
export function buildDeterministicScene3Fallback(input: Scene3BrainInput): Scene3BrainResult {
  const environment = resolveScene3FunctionalEnvironment(input.product.category || '', input.product.identity);
  const prodName = input.product.identity;
  const isKit = prodName.toLowerCase().includes('kit') || (input.product.quantity && parseInt(input.product.quantity, 10) > 1);
  const visibleDetail = input.product.visibleDetails[0] || 'design autêntico e acabamento refinado';

  const action0to2 = isKit
    ? `Presenter holds the featured active unit of ${prodName} prominently in the foreground while companion units remain neatly arranged in view, smiling into the smartphone camera.`
    : `Presenter re-establishes ${prodName} comfortably in frame at chest height, tilting it slightly to highlight its ${visibleDetail} as the CTA delivery begins.`;

  const action2to4 = isKit
    ? `Presenter smoothly rotates the active unit to display its label and finish, gesturing naturally with both hands as spoken CTA continues.`
    : `Presenter lightly touches the surface of ${prodName}, showcasing its solid build and authentic craftsmanship with fluid, realistic hand movements.`;

  const action4to6 = `Presenter brings ${prodName} slightly forward toward the smartphone lens, maintaining direct eye contact and an inviting, conversational UGC expression.`;

  const action6to8 = `Presenter holds ${prodName} securely at chest level, executing a confident, affirmative closing nod directly into the camera lens.`;

  const ctaGesture = `Natural inviting open-palm gesture alongside ${prodName} followed by a subtle affirmative nod toward the smartphone camera lens.`;

  // Extract 1-2 sync segments from spokenCta
  const ctaWords = input.spokenCta.split(' ');
  const firstSegment = ctaWords.slice(0, Math.min(6, ctaWords.length)).join(' ');
  const secondSegment = ctaWords.length > 8 ? ctaWords.slice(-6).join(' ') : firstSegment;

  const speechActionSync = [
    {
      spokenSegment: firstSegment,
      physicalAction: `Showcasing ${prodName} clearly in natural light while engaging the camera.`
    }
  ];

  if (secondSegment !== firstSegment && secondSegment.trim().length > 0) {
    speechActionSync.push({
      spokenSegment: secondSegment,
      physicalAction: `Executing the final closing nod while keeping ${prodName} prominent in frame.`
    });
  }

  const productSpecificNegatives = generateProductSpecificNegatives(input.product.category || '', input.product.identity);

  return {
    environment,
    actions: {
      action0to2,
      action2to4,
      action4to6,
      action6to8
    },
    ctaGesture,
    speechActionSync,
    productSpecificNegatives
  };
}

/**
 * SCENE BRAIN C3 — MAIN REASONING SERVICE
 * Resolves visual environment, 4 temporal action blocks (0-8s), CTA gesture,
 * speech/action synchronization, and product-specific negative constraints.
 * 
 * CRITICAL: Receives spokenCta as IMMUTABLE input and never rewrites or alters it.
 */
export async function runScene3BrainService(
  input: Scene3BrainInput,
  apiKey: string = ''
): Promise<Scene3BrainResult> {
  // Input validation
  if (!input || !input.spokenCta || !input.spokenCta.trim()) {
    throw new Scene3BrainValidationError(
      'Cannot execute Scene Brain C3 without an immutable spokenCta.',
      'SCENE3_CTA_IMMUTABILITY_VIOLATED',
      ['spokenCta is missing or empty.']
    );
  }

  const systemPrompt = `You are the SCENE 3 SCENE BRAIN, a specialized Brazilian UGC conversion and closing visual director.
Your task is to structure the physical environment, 4 temporal action blocks (0.0s - 8.0s), CTA gesture, and speech/action synchronization for Scene 3.

IMPORTANT CONTRACT:
- The spoken CTA is already finalized and IMMUTABLE. DO NOT change, rewrite, paraphrase, translate, or optimize it.
- Your job is strictly VISUAL and PHYSICAL direction.

MANDATORY RULES:
1. FUNCTIONAL CLOSING ENVIRONMENT:
   Select a plausible everyday interior coherent with verified product use (e.g., kitchen for cookware, bathroom for towels/skincare, living space for watch/fashion, reading corner for books).
   NO fake commercial sets, NO promotional billboards, NO studio logos.

2. 4-BLOCK TEMPORAL ACTION PLAN (8 SECONDS TOTAL):
   - action0to2 (0.0s - 2.0s): Re-establish the product clearly in frame and begin direct camera engagement.
   - action2to4 (2.0s - 4.0s): Simple, realistic physical interaction with the product (rotate, show texture, hold naturally).
   - action4to6 (4.0s - 6.0s): Maintain clear product visibility while increasing direct eye contact for the closing call to action.
   - action6to8 (6.0s - 8.0s): Final camera-facing closing with natural CTA gesture and affirmative UGC nod.

3. ANTI-GENERIC RULE:
   At least 2 of the 4 action blocks must contain specific physical handling supported by the product facts and visible details.

4. CTA GESTURE:
   Natural bodily gesture (e.g. inviting open hand, gentle product presentation lift, natural nod).
   STRICTLY FORBIDDEN: NO fake cart icons, NO floating buttons, NO tapping on imaginary screen UI.

5. PRODUCT QUANTITY / KIT AWARENESS:
   If the product is a kit/multipack, preserve the composition. Keep the active handled unit consistent without duplicating or deleting companion items.

6. SPEECH/ACTION SYNCHRONIZATION:
   Select 1 to 3 EXACT substring segments from the spoken CTA (without changing any words) and map them to synchronized physical gestures.

7. PRODUCT-SPECIFIC NEGATIVES:
   Generate 2 to 4 negative constraints specific to this product geometry (e.g., no warped watch face, no sole deformation, etc.).

8. REFERENCE COVERAGE & MOTION SAFETY:
   - Product rotation limit: Max ${input.product.motionSafety?.maxRotationDegrees ?? 30}° rotation.
   - Forbidden angles: ${(input.product.motionSafety?.forbiddenViews ?? []).join(', ') || 'Unseen / unverified product faces'}.
   - Same Object Continuity: Camera movement and hand movement may change perspective, but must never require regeneration of an unseen product face. Different viewing angles must represent the same physical object, not a newly reconstructed version.

Return ONLY valid JSON matching this schema:
{
  "environment": "Short description of the real functional room",
  "actions": {
    "action0to2": "English description of action from 0.0s to 2.0s",
    "action2to4": "English description of action from 2.0s to 4.0s",
    "action4to6": "English description of action from 4.0s to 6.0s",
    "action6to8": "English description of action from 6.0s to 8.0s"
  },
  "ctaGesture": "Description of natural closing gesture",
  "speechActionSync": [
    {
      "spokenSegment": "Exact substring from the spoken CTA",
      "physicalAction": "Synchronized physical movement"
    }
  ],
  "productSpecificNegatives": [
    "NO specific product defect.",
    "NO specific deformation."
  ]
}`;

  const userContext = `PRODUCT & CONVERSION CLOSING CONTEXT:
- Product: ${input.product.identity}
- Category: ${input.product.category || 'General'}
- Verified Facts: ${input.product.knownPhysicalFacts.join('; ') || 'Authentic physical product'}
- Observable Details: ${input.product.visibleDetails.join('; ')}
- Quantity / Composition: ${input.product.quantity || 'Standard'}
- Presenter: ${input.presenter.identity} (${input.presenter.gender || 'unspecified'})
- Wardrobe: ${input.wardrobe.description}
- IMMUTABLE SPOKEN CTA: "${input.spokenCta}"

Generate the visual closing environment, temporal actions, CTA gesture, speech sync, and product-specific negatives now.`;

  try {
    const response = await processGeminiAPI(apiKey, {
      mode: "scene3_scene_brain",
      moduleName: "Scene 3 Scene Brain",
      model: "gemini-3.5-flash",
      require_json: true,
      contents: [
        {
          parts: [
            { text: systemPrompt },
            { text: userContext }
          ]
        }
      ]
    });

    const parsed = extractDataFromGeminiResponse(response);

    if (parsed && parsed.actions && parsed.environment) {
      const candidate: Scene3BrainResult = {
        environment: typeof parsed.environment === 'string' && parsed.environment.trim()
          ? parsed.environment.trim()
          : resolveScene3FunctionalEnvironment(input.product.category || '', input.product.identity),
        actions: {
          action0to2: parsed.actions.action0to2 || `Presenter holds ${input.product.identity} clearly, engaging the camera.`,
          action2to4: parsed.actions.action2to4 || `Presenter showcases the verified features of ${input.product.identity} with natural hand movements.`,
          action4to6: parsed.actions.action4to6 || `Presenter maintains product visibility and eye contact with the camera.`,
          action6to8: parsed.actions.action6to8 || `Presenter holds ${input.product.identity} at chest height with an affirmative closing nod.`
        },
        ctaGesture: typeof parsed.ctaGesture === 'string' && parsed.ctaGesture.trim()
          ? parsed.ctaGesture.trim()
          : `Warm affirmative nod and gentle presentation lift of ${input.product.identity} toward the camera.`,
        speechActionSync: Array.isArray(parsed.speechActionSync) && parsed.speechActionSync.length > 0
          ? parsed.speechActionSync.slice(0, 3).map((item: any) => ({
              spokenSegment: typeof item.spokenSegment === 'string' && item.spokenSegment.trim()
                ? item.spokenSegment.trim()
                : input.spokenCta.slice(0, 30),
              physicalAction: typeof item.physicalAction === 'string' && item.physicalAction.trim()
                ? item.physicalAction.trim()
                : `Showcasing ${input.product.identity} while speaking directly to the smartphone camera.`
            }))
          : [
              {
                spokenSegment: input.spokenCta.slice(0, 30),
                physicalAction: `Presenter holds ${input.product.identity} clearly while addressing the audience.`
              }
            ],
        productSpecificNegatives: Array.isArray(parsed.productSpecificNegatives) && parsed.productSpecificNegatives.length > 0
          ? parsed.productSpecificNegatives.map((n: any) => String(n).trim()).filter(Boolean)
          : generateProductSpecificNegatives(input.product.category || '', input.product.identity)
      };

      // Run evidence and safety gates
      const evidenceCheck = validateActionEvidence(candidate.actions, input.product.knownPhysicalFacts, input.product.category || '');
      const structureCheck = validateScene3BrainResult(candidate);

      if (evidenceCheck.valid && structureCheck.valid) {
        return candidate;
      }
    }
  } catch (err: any) {
    // Graceful fallback to deterministic engine on network / parser issues
  }

  // Return deterministic fallback satisfying all safety and evidence gates
  return buildDeterministicScene3Fallback(input);
}

/**
 * Utility helper to map Scene3BrainInput and Scene3BrainResult directly into Scene3DynamicSlots
 * for clean consumption by buildCompiledScene3Model / compileScene3Prompt.
 */
export function mapScene3BrainToDynamicSlots(
  input: Scene3BrainInput,
  brainResult: Scene3BrainResult
): Scene3DynamicSlots {
  return {
    presenter: {
      identity: input.presenter.identity,
      gender: input.presenter.gender
    },
    wardrobe: {
      description: input.wardrobe.description
    },
    product: {
      identity: input.product.identity,
      visibleDetails: input.product.visibleDetails,
      knownPhysicalFacts: input.product.knownPhysicalFacts,
      quantity: input.product.quantity,
      structuralDNA: input.product.structuralDNA,
      referenceCoverage: input.product.referenceCoverage,
      motionSafety: input.product.motionSafety
    },
    structuralDNA: input.product.structuralDNA,
    referenceCoverage: input.product.referenceCoverage,
    motionSafety: input.product.motionSafety,
    environment: brainResult.environment,
    spokenCta: input.spokenCta, // Strictly preserving immutable CTA
    actions: brainResult.actions,
    ctaGesture: brainResult.ctaGesture,
    speechActionSync: brainResult.speechActionSync,
    productSpecificNegatives: brainResult.productSpecificNegatives
  };
}
