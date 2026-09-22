/**
 * SHOPEE SCENE 2 PLANNER — SPOKEN BENEFIT & PHYSICAL DEMONSTRATION (8.0 SECONDS)
 * 
 * Choreographs the 4-beat physical demonstration:
 * - 0.0s - 2.0s: Introduce / Begin Use
 * - 2.0s - 4.0s: Primary Physical Demonstration
 * - 4.0s - 6.0s: Visible Benefit Proof
 * - 6.0s - 8.0s: Resolved Product State
 * 
 * Invariants:
 * - English technical instructions.
 * - Portuguese (PT-BR) spoken dialogue.
 * - Strictly NO CTA, NO price, NO discount.
 * - Preserves product structural integrity.
 */

import { ShopeeSceneSequenceContext, ShopeeScene2Plan } from './types';
import { SHOPEE_SCENE_2_NEGATIVE_CONSTRAINTS } from './templates/shopeeScene2BaseTemplate';

/**
 * Plans the 8.0-second Scene 2 4-beat action choreography, product interactions, and speech sync.
 */
export function planShopeeScene2(
  context: ShopeeSceneSequenceContext
): ShopeeScene2Plan {
  const { product, scene2Dialogue } = context;

  const action0To2 = `Presenter introduces ${product.productIdentity} (canonical color: ${product.canonicalColor}) in active use, holding it naturally at chest level. Action allowed: ${product.allowedInteractions[0] || 'handled with both hands'}. Presenter begins speaking directly to the camera with conversational enthusiasm.`;

  const action2To4 = `Presenter initiates primary physical operation of ${product.productIdentity}, prioritizing visible physical proof of the spoken benefit. Practical physical demonstration: ${product.allowedInteractions[1] || 'activating the practical mechanism smoothly'}. Camera keeps the product mechanism in clear focus while maintaining handheld natural stability to show direct physical evidence of how it operates. Prohibited: ${product.blockedInteractions[0] || 'do not bend or force rigid components'}.`;

  const action4To6 = `Presenter prioritizes and spotlights decisive visible physical proof of the spoken benefit: ${product.visibleBenefitProof}. The practical outcome is immediately apparent to the viewer, confirming genuine utility with clear visual physical proof without special effects or exaggeration.`;

  const action6To8 = `Presenter rests the product in its resolved, operational configuration: ${product.finalProductState}. Presenter completes the spoken explanation, looking directly into the lens with a satisfied, authentic expression.`;

  const spokenCopy = scene2Dialogue.trim() || `Esse achadinho resolveu de vez o problema aqui em casa. Super prático e funcional no dia a dia.`;

  const speechActionSync = `- 0.0s - 2.0s: Hand movement introduces ${product.productIdentity} as the presenter starts speaking with natural facial inflection.
- 2.0s - 4.0s: The physical operation coincides directly with the explanation of the functional mechanism, prioritizing physical demonstration.
- 4.0s - 6.0s: Camera and gesture spotlight visible physical proof of the spoken benefit as the practical utility is articulated.
- 6.0s - 8.0s: Hand settles the product in clean operational position as the sentence concludes naturally.`;

  return {
    sceneDuration: 8.0,
    action0To2,
    action2To4,
    action4To6,
    action6To8,
    spokenCopy,
    visibleBenefitProof: product.visibleBenefitProof,
    speechActionSync,
    negativeConstraints: SHOPEE_SCENE_2_NEGATIVE_CONSTRAINTS,
    endState: product.finalProductState
  };
}
