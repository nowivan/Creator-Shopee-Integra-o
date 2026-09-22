/**
 * SHOPEE PROMPT COMPILER
 * 
 * Deterministically compiles the 3 distinct video prompts for Shopee:
 * - Scene 1: Hook & Instant Problem (3.0s)
 * - Scene 2: Spoken Benefit & Physical Demonstration (8.0s)
 * - Scene 3: Conversion & CTA Closing (8.0s)
 * 
 * Invariants:
 * 1. Technical instructions in English.
 * 2. Spoken dialogue in PT-BR only.
 * 3. Exact dialogue byte-lock (zero rewriting or trimming of manual copy).
 * 4. Continuity of presenter, wardrobe, brand mark, and product state across all 3 prompts.
 */

import {
  ShopeeSceneSequenceContext,
  ShopeeScene1Plan,
  ShopeeScene2Plan,
  ShopeeScene3Plan,
  ShopeeCompiledScene
} from '../types';
import { getShopeeScene1MasterTemplateSkeleton } from '../templates/shopeeScene1BaseTemplate';
import { getShopeeScene2MasterTemplateSkeleton } from '../templates/shopeeScene2BaseTemplate';
import { getShopeeScene3MasterTemplateSkeleton } from '../templates/shopeeScene3BaseTemplate';
import { formatCanonicalWardrobeSpecification } from '../../creative-director/wardrobe/wardrobePriorityResolver';
import {
  isBrandMarkActive,
  renderBrandMarkVideoPrompt
} from '../../visual-reference-engine/services/brandMarkAuthority';

/**
 * Renders the optional BrandMark section if active.
 */
export function resolveBrandMarkPromptSection(context: ShopeeSceneSequenceContext): string {
  if (isBrandMarkActive(context.brandMarkProfile)) {
    const snippet = renderBrandMarkVideoPrompt(context.brandMarkProfile);
    if (snippet) {
      return `\n${snippet}\n`;
    }
  }
  return '';
}

/**
 * Compiles Prompt 1 (Scene 1: Hook & Instant Problem, 3.0s).
 */
export function compileShopeeScene1Prompt(
  context: ShopeeSceneSequenceContext,
  plan: ShopeeScene1Plan
): ShopeeCompiledScene {
  const skeleton = getShopeeScene1MasterTemplateSkeleton();
  const wardrobeSpec = formatCanonicalWardrobeSpecification(context.wardrobe);
  const brandMarkSection = resolveBrandMarkPromptSection(context);

  let prompt = skeleton
    .replace('{{PRESENTER_DESCRIPTION}}', context.presenter.description)
    .replace('{{WARDROBE_SPECIFICATION}}', wardrobeSpec)
    .replace('{{BRAND_MARK_SECTION}}', brandMarkSection ? `${brandMarkSection}` : '')
    .replace('{{ENVIRONMENT_SPECIFICATION}}', context.environmentDescription)
    .replace('{{PRODUCT_IDENTITY}}', context.product.productIdentity)
    .replace('{{PROBLEM_CONTEXT}}', context.product.specificPain)
    .replace('{{ACTION_0_1_5}}', plan.action0To15)
    .replace('{{ACTION_1_5_3}}', plan.action15To3)
    .replace('{{SPOKEN_HOOK}}', plan.spokenHook);

  // Clean up any double blank lines
  prompt = prompt.replace(/\n{3,}/g, '\n\n').trim();

  return {
    sceneNumber: 1,
    title: 'Cena 1 — Gancho & Problema Imediato',
    durationSeconds: 3.0,
    prompt,
    spokenDialogue: plan.spokenHook
  };
}

/**
 * Compiles Prompt 2 (Scene 2: Spoken Benefit & Physical Demonstration, 8.0s).
 */
export function compileShopeeScene2Prompt(
  context: ShopeeSceneSequenceContext,
  plan: ShopeeScene2Plan
): ShopeeCompiledScene {
  const skeleton = getShopeeScene2MasterTemplateSkeleton();
  const wardrobeSpec = formatCanonicalWardrobeSpecification(context.wardrobe);
  const brandMarkSection = resolveBrandMarkPromptSection(context);

  const observableDetailsStr = context.product.observableDetails.join('; ');
  const physicalFactsStr = context.product.physicalFacts.join('; ');
  const allowedInteractionsStr = context.product.allowedInteractions.join('; ');
  const blockedInteractionsStr = context.product.blockedInteractions.join('; ');

  let prompt = skeleton
    .replace('{{PRESENTER_DESCRIPTION}}', context.presenter.description)
    .replace('{{WARDROBE_SPECIFICATION}}', wardrobeSpec)
    .replace('{{BRAND_MARK_SECTION}}', brandMarkSection ? `${brandMarkSection}` : '')
    .replace('{{ENVIRONMENT_SPECIFICATION}}', context.environmentDescription)
    .replace('{{PRODUCT_IDENTITY}}', context.product.productIdentity)
    .replace('{{CANONICAL_COLOR}}', context.product.canonicalColor)
    .replace('{{PRODUCT_VISIBLE_DETAILS}}', observableDetailsStr)
    .replace('{{PRODUCT_FACTS}}', physicalFactsStr)
    .replace('{{ALLOWED_INTERACTIONS}}', allowedInteractionsStr)
    .replace('{{BLOCKED_INTERACTIONS}}', blockedInteractionsStr)
    .replace('{{VISIBLE_BENEFIT_PROOF}}', plan.visibleBenefitProof)
    .replace('{{ACTION_0_2}}', plan.action0To2)
    .replace('{{ACTION_2_4}}', plan.action2To4)
    .replace('{{ACTION_4_6}}', plan.action4To6)
    .replace('{{ACTION_6_8}}', plan.action6To8)
    .replace('{{SPOKEN_COPY}}', plan.spokenCopy)
    .replace('{{SPEECH_ACTION_SYNC}}', plan.speechActionSync);

  prompt = prompt.replace(/\n{3,}/g, '\n\n').trim();

  return {
    sceneNumber: 2,
    title: 'Cena 2 — Benefício Falado & Demonstração Física',
    durationSeconds: 8.0,
    prompt,
    spokenDialogue: plan.spokenCopy
  };
}

/**
 * Compiles Prompt 3 (Scene 3: Conversion & CTA Closing, 8.0s).
 */
export function compileShopeeScene3Prompt(
  context: ShopeeSceneSequenceContext,
  plan: ShopeeScene3Plan
): ShopeeCompiledScene {
  const skeleton = getShopeeScene3MasterTemplateSkeleton();
  const wardrobeSpec = formatCanonicalWardrobeSpecification(context.wardrobe);
  const brandMarkSection = resolveBrandMarkPromptSection(context);

  let prompt = skeleton
    .replace('{{PRESENTER_DESCRIPTION}}', context.presenter.description)
    .replace('{{WARDROBE_SPECIFICATION}}', wardrobeSpec)
    .replace('{{BRAND_MARK_SECTION}}', brandMarkSection ? `${brandMarkSection}` : '')
    .replace('{{ENVIRONMENT_SPECIFICATION}}', context.environmentDescription)
    .replace('{{PRODUCT_IDENTITY}}', context.product.productIdentity)
    .replace('{{CANONICAL_COLOR}}', context.product.canonicalColor)
    .replace('{{PRODUCT_END_STATE}}', context.productEndState)
    .replace('{{ACTION_0_2}}', plan.action0To2)
    .replace('{{ACTION_2_4}}', plan.action2To4)
    .replace('{{ACTION_4_6}}', plan.action4To6)
    .replace('{{ACTION_6_8}}', plan.action6To8)
    .replace('{{CTA_GESTURE}}', plan.ctaGesture)
    .replace('{{SPOKEN_CTA}}', plan.spokenCta)
    .replace('{{SPEECH_ACTION_SYNC}}', plan.speechActionSync);

  prompt = prompt.replace(/\n{3,}/g, '\n\n').trim();

  return {
    sceneNumber: 3,
    title: 'Cena 3 — Conversão & Fechamento com CTA',
    durationSeconds: 8.0,
    prompt,
    spokenDialogue: plan.spokenCta
  };
}
