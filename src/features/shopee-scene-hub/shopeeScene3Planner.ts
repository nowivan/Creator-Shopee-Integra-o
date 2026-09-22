/**
 * SHOPEE SCENE 3 PLANNER — CONVERSION & CTA CLOSING (8.0 SECONDS)
 * 
 * Choreographs the closing conversion scene:
 * - Direct handoff from Scene 2 end state.
 * - Exact CTA byte-lock (zero mutation of user words).
 * - CTA gesture synchronization (pointing, holding, framing).
 * - Preserves presenter identity, wardrobe, and brand mark.
 * 
 * Invariants:
 * - English technical instructions.
 * - Portuguese (PT-BR) spoken CTA dialogue.
 * - Product state inherited from Scene 2.
 */

import { ShopeeSceneSequenceContext, ShopeeScene3Plan, ShopeeCTAMode } from './types';
import { SHOPEE_SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS } from './templates/shopeeScene3BaseTemplate';

/**
 * Resolves the physical gesture corresponding to the chosen Shopee CTA mode.
 */
export function resolveShopeeCtaGesture(
  ctaMode: ShopeeCTAMode,
  productName: string
): string {
  switch (ctaMode) {
    case 'produto_marcado':
      return `Presenter holds ${productName} clearly in one hand and makes a natural, polite gesture with the open other hand toward the lower area of the screen where the tagged product tag is located.`;
    case 'sacolinha':
      return `Presenter keeps ${productName} visible and points downward with the index finger toward the bottom-left corner of the screen where the Shopee bag icon appears.`;
    case 'link_shopee':
      return `Presenter gestures forward with open palm toward the camera, indicating the Shopee link in the bio or description while showcasing ${productName}.`;
    case 'icone_produto':
      return `Presenter gently tilts ${productName} forward to catch natural lighting, gesturing with the other hand toward the product icon overlay on screen.`;
    case 'manual':
    default:
      return `Presenter maintains steady, authentic eye contact with the smartphone camera, holding ${productName} securely and making an encouraging closing hand gesture.`;
  }
}

/**
 * Plans the 8.0-second Scene 3 conversion actions, CTA gesture, and dialogue.
 */
export function planShopeeScene3(
  context: ShopeeSceneSequenceContext
): ShopeeScene3Plan {
  const { product, scene3Dialogue, ctaMode, productEndState } = context;

  const ctaGesture = resolveShopeeCtaGesture(ctaMode, product.productIdentity);

  const action0To2 = `Scene opens seamlessly from Scene 2: Presenter is in ${context.environmentDescription}, already holding ${product.productIdentity} in its resolved position (${productEndState}). Presenter looks directly into the smartphone camera lens with engaging, friendly confidence and begins speaking the closing CTA.`;

  const action2To4 = `Presenter maintains the product in sharp focus and initiates the call-to-action gesture: ${ctaGesture}. Movement is measured, fluid, and natural, without frantic or rushed behavior.`;

  const action4To6 = `Presenter sustains the conversion gesture and delivers the core directive of the CTA, ensuring the product remains perfectly identifiable and stable.`;

  const action6To8 = `Presenter finishes speaking the exact dialogue, holds a warm and authentic reassuring expression, and lets the final gesture settle cleanly as the 8-second take concludes.`;

  const spokenCta = scene3Dialogue.trim() || `Clica aqui no produto marcado para garantir o seu antes que esgote!`;

  const speechActionSync = `- 0.0s - 2.0s: Presenter engages the viewer with initial closing phrase while holding ${product.productIdentity}.
- 2.0s - 4.0s: The physical CTA gesture (${ctaMode}) synchronizes with the action directive.
- 4.0s - 6.0s: Peak visual clarity of the product alongside the conversion instruction.
- 6.0s - 8.0s: Reassuring concluding smile as the final words are spoken.`;

  return {
    sceneDuration: 8.0,
    action0To2,
    action2To4,
    action4To6,
    action6To8,
    ctaGesture,
    spokenCta,
    speechActionSync,
    negativeConstraints: SHOPEE_SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS
  };
}
