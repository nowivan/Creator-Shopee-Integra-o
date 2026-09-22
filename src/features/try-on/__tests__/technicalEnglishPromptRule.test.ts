import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  TECHNICAL_PROMPT_LANGUAGE_LOCK,
  buildTryOnCampaignPrompt
} from '../tryOnCampaignLogic';
import { buildAffiliateThumbnailPrompt } from '../affiliateThumbnailMode';
import { buildSkeletonWatchStaticDialLock, buildSkeletonWatchAdvancedRegionLock } from '../skeletonWatchLock';
import { buildStoryboardReferenceLock } from '../storyboardReferenceLock';
import { buildWearableAccessoryDemoMold } from '../wearableAccessoryMold';

describe('Provador Virtual IA - Global Technical English Prompt Rule', () => {
  it('exports the canonical TECHNICAL_PROMPT_LANGUAGE_LOCK mandate', () => {
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('TECHNICAL PROMPT LANGUAGE LOCK'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('All technical prompt content must be written in English.'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('VISIBLE TEXT: Render only this exact Portuguese text:'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('image prompts'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('video prompts'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('negative prompts'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('product preservation locks'));
    assert.ok(TECHNICAL_PROMPT_LANGUAGE_LOCK.includes('skeleton watch static locks'));
  });

  it('injects TECHNICAL_PROMPT_LANGUAGE_LOCK into buildTryOnCampaignPrompt across presets', () => {
    const promptShopee = buildTryOnCampaignPrompt('shopee_clean_demo', 4, 'no_dialogue', 'white_background', 'shopee');
    assert.ok(promptShopee.includes(TECHNICAL_PROMPT_LANGUAGE_LOCK));
    assert.ok(promptShopee.includes('Complete, standalone, high-performance English diffusion prompt for Take 1 written entirely in technical English'));
    assert.ok(promptShopee.includes('VISIBLE TEXT: Render only this exact Portuguese text:'));

    const promptTikTok = buildTryOnCampaignPrompt('tiktok_shop_fast_demo', 5, 'short_speech', 'model_wearing', 'tiktok_shop');
    assert.ok(promptTikTok.includes(TECHNICAL_PROMPT_LANGUAGE_LOCK));

    const promptCarousel = buildTryOnCampaignPrompt('conversion_carousel', 5, 'text_on_screen', 'clean_table', 'mercado_livre');
    assert.ok(promptCarousel.includes(TECHNICAL_PROMPT_LANGUAGE_LOCK));
  });

  it('ensures all campaign style descriptions and scene descriptions provide English technical directives', () => {
    const promptUgc = buildTryOnCampaignPrompt('ugc_product_in_use', 4, 'no_dialogue', 'holding_hand', 'magalu');
    assert.ok(promptUgc.includes('UGC Product in Use:'));
    assert.ok(promptUgc.includes('Realistic human hand naturally holding, rotating, or presenting the product'));

    const promptBeforeAfter = buildTryOnCampaignPrompt('before_after_comparison', 4, 'no_dialogue', 'white_glove', 'amazon');
    assert.ok(promptBeforeAfter.includes('Before & After / Comparative Demo:'));
    assert.ok(promptBeforeAfter.includes('Pristine white cotton/satin-gloved hand'));
  });

  it('preserves Skeleton Watch static locks in technical English', () => {
    const dialLock = buildSkeletonWatchStaticDialLock();
    assert.ok(dialLock.includes('SKELETON WATCH STATIC DIAL LOCK:'));
    assert.ok(dialLock.includes('The entire watch dial must remain completely static from the first frame to the last frame.'));
    assert.ok(dialLock.includes('Do not animate, rotate, tick, oscillate, spin, flicker, morph or simulate any internal mechanical activity.'));

    const regionLock = buildSkeletonWatchAdvancedRegionLock();
    assert.ok(regionLock.includes('ADVANCED SKELETON WATCH REGION LOCK:'));
    assert.ok(regionLock.includes('Freeze the upper-left gear-shaped decorative area between 10 and 11 o’clock inside the dial.'));
  });

  it('preserves Storyboard Reference locks in technical English', () => {
    const storyboardLock = buildStoryboardReferenceLock();
    assert.ok(storyboardLock.includes('UGC STORYBOARD REFERENCE LOCK:'));
    assert.ok(storyboardLock.includes('Create one normal continuous vertical video.'));
    assert.ok(storyboardLock.includes('Do not copy the collage grid.'));
  });

  it('preserves Wearable Accessory Demo Mold in technical English while maintaining spoken dialogue in Portuguese', () => {
    const mold = buildWearableAccessoryDemoMold({
      productName: 'Relógio Cronógrafo Olevs',
      accessoryType: 'watch',
      speechMode: 'ON_CAMERA_DIALOGUE',
      spokenText: 'Olha o acabamento desse relógio no pulso!'
    });

    assert.ok(mold.promptBlock.includes('WEARABLE ACCESSORY DEMONSTRATION MOLD (8-SECOND SCENE 2 STRUCTURE):'));
    assert.ok(mold.promptBlock.includes('The visible person speaks directly to camera in natural Brazilian Portuguese: "Olha o acabamento desse relógio no pulso!"'));
    assert.ok(mold.negativePromptAdditions.includes('no CGI look'));
  });

  it('ensures Affiliate Thumbnail prompts are structured in technical English with preserved Portuguese headline', () => {
    const thumbnailWithText = buildAffiliateThumbnailPrompt({
      platform: 'shopee',
      textMode: 'with_text',
      headline: 'FRETE GRÁTIS HOJE'
    });

    assert.ok(thumbnailWithText.includes('AFFILIATE VIDEO THUMBNAIL IMAGE PROMPT:'));
    assert.ok(thumbnailWithText.includes('Render ONLY the exact text: "FRETE GRÁTIS HOJE".'));
    assert.ok(thumbnailWithText.includes('SAFETY LOCK:'));
  });
});
