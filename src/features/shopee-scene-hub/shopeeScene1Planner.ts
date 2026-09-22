/**
 * SHOPEE SCENE 1 PLANNER — HOOK & INSTANT EVERYDAY PROBLEM (3.0 SECONDS)
 * 
 * Choreographs the initial 3-second hook:
 * - 0.0s - 1.5s: Visible daily friction / annoyance / problem in context
 * - 1.5s - 3.0s: Presenter emotional reaction + spoken hook line
 * 
 * Invariants:
 * - English technical instructions.
 * - Portuguese (PT-BR) spoken dialogue.
 * - Strictly NO CTA, NO price, NO discount, NO promotion, NO urgency.
 */

import { ShopeeSceneSequenceContext, ShopeeScene1Plan } from './types';
import { SHOPEE_SCENE_1_NEGATIVE_CONSTRAINTS } from './templates/shopeeScene1BaseTemplate';

/**
 * Plans the 3.0-second Scene 1 visual choreography and dialogue.
 */
export function planShopeeScene1(
  context: ShopeeSceneSequenceContext
): ShopeeScene1Plan {
  const { product, presenter, scene1Dialogue } = context;

  const action0To15 = `Presenter is seen in ${context.environmentDescription}, visibly encountering everyday friction: ${product.specificPain}. The difficulty is immediately apparent through authentic bodily reaction without exaggerated drama.`;

  const action15To3 = `Presenter pauses, turns naturally toward the smartphone camera with an authentic, relatable expression, holding natural eye contact and immediately delivering the spoken hook while introducing the context of ${product.productIdentity}.`;

  const spokenHook = scene1Dialogue.trim() || `Se você também sofre com isso no dia a dia, olha isso aqui.`;

  return {
    sceneDuration: 3.0,
    action0To15,
    action15To3,
    spokenHook,
    negativeConstraints: SHOPEE_SCENE_1_NEGATIVE_CONSTRAINTS
  };
}
