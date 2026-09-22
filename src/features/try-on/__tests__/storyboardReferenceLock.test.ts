import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildStoryboardReferenceLock,
  buildStoryboardReferenceNegativeAdditions,
  buildStoryboardVideoStructure,
  hasStoryboardReference,
  detectStoryboardReferenceMode
} from '../storyboardReferenceLock';
import { buildTryOnCampaignPrompt, formatTryOnCampaignClipboard } from '../tryOnCampaignLogic';
import { TryOnCampaignResult } from '../types';

describe('Provador Virtual IA - UGC Storyboard Reference Mode', () => {
  it('builds mandatory UGC storyboard reference lock with strict constraints', () => {
    const lock = buildStoryboardReferenceLock();
    assert.ok(lock.includes('UGC STORYBOARD REFERENCE LOCK:'));
    assert.ok(lock.includes('The storyboard is NOT the final video layout.'));
    assert.ok(lock.includes('Do not copy the collage grid.'));
    assert.ok(lock.includes('Do not create split screen.'));
    assert.ok(lock.includes('Do not show multiple panels.'));
    assert.ok(lock.includes('Do not show numbered labels.'));
    assert.ok(lock.includes('Create one normal continuous vertical video.'));
    assert.ok(lock.includes('Product identity must still come from the main clean product image.'));
    assert.ok(
      lock.includes('If any product appears inside the storyboard but differs from the main product image, ignore that storyboard product identity and replace it with the exact main product.')
    );
  });

  it('builds negative prompt tokens blocking collage, grid, numbers, and UI overlays', () => {
    const negatives = buildStoryboardReferenceNegativeAdditions();
    assert.ok(negatives.includes('collage'));
    assert.ok(negatives.includes('grid'));
    assert.ok(negatives.includes('split screen'));
    assert.ok(negatives.includes('multiple panels'));
    assert.ok(negatives.includes('numbered labels'));
    assert.ok(negatives.includes('black number circles'));
    assert.ok(negatives.includes('tiled frames'));
    assert.ok(negatives.includes('comic layout'));
    assert.ok(negatives.includes('app interface'));
  });

  it('builds linear 8s vertical UGC storyboard video structure', () => {
    const structure = buildStoryboardVideoStructure();
    assert.ok(structure.includes('Create ONE realistic vertical 9:16 UGC product video.'));
    assert.ok(structure.includes('Single normal continuous video, not a collage.'));
    assert.ok(structure.includes('0–2s:'));
    assert.ok(structure.includes('2–4s:'));
    assert.ok(structure.includes('4–6s:'));
    assert.ok(structure.includes('6–8s:'));
  });

  it('detects storyboard reference accurately across various input formats', () => {
    assert.strictEqual(hasStoryboardReference(true), true);
    assert.strictEqual(hasStoryboardReference(false), false);
    assert.strictEqual(hasStoryboardReference(null), false);
    assert.strictEqual(hasStoryboardReference(undefined), false);

    assert.strictEqual(hasStoryboardReference('ugc_storyboard'), true);
    assert.strictEqual(hasStoryboardReference('storyboard_only'), true);
    assert.strictEqual(hasStoryboardReference('product_plus_storyboard'), true);
    assert.strictEqual(hasStoryboardReference('pose_style'), false);

    assert.strictEqual(hasStoryboardReference({ hasStoryboard: true }), true);
    assert.strictEqual(hasStoryboardReference({ hasStoryboard: false }), false);
    assert.strictEqual(hasStoryboardReference({ mode: 'product_plus_storyboard' }), true);
    assert.strictEqual(hasStoryboardReference({ referenceType: 'ugc_storyboard' }), true);
    assert.strictEqual(hasStoryboardReference({ referenceType: 'multi_angle' }), false);
  });

  it('detects correct storyboard reference mode from presence flags', () => {
    assert.strictEqual(detectStoryboardReferenceMode({ hasStoryboard: false, hasProduct: true }), 'none');
    assert.strictEqual(detectStoryboardReferenceMode({ hasStoryboard: true, hasProduct: false }), 'storyboard_only');
    assert.strictEqual(detectStoryboardReferenceMode({ hasStoryboard: true, hasProduct: true }), 'product_plus_storyboard');
  });

  it('injects storyboard reference lock and negative additions into buildTryOnCampaignPrompt when active', () => {
    const campaignPromptWithStoryboard = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'shopee',
      true,
      undefined,
      undefined,
      'product_plus_storyboard'
    );

    assert.ok(campaignPromptWithStoryboard.includes('UGC STORYBOARD REFERENCE LOCK:'));
    assert.ok(campaignPromptWithStoryboard.includes('The storyboard is NOT the final video layout.'));
    assert.ok(campaignPromptWithStoryboard.includes('collage, grid, split screen, multiple panels'));
    assert.ok(campaignPromptWithStoryboard.includes('storyboard_reference_lock'));
  });

  it('omits storyboard reference lock when storyboard mode is none', () => {
    const campaignPromptWithoutStoryboard = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'shopee',
      false,
      undefined,
      undefined,
      'none'
    );

    assert.ok(!campaignPromptWithoutStoryboard.includes('UGC STORYBOARD REFERENCE LOCK:'));
    assert.ok(!campaignPromptWithoutStoryboard.includes('storyboard_reference_lock'));
  });

  it('formats campaign storyboard reference lock in clipboard exporter', () => {
    const mockCampaign: TryOnCampaignResult = {
      campaign_title: 'Shopee UGC Watch Test',
      campaign_type: 'shopee_clean_demo',
      detected_category: 'Relógios & Joias',
      platform: 'shopee',
      format: 'no_dialogue',
      scene_style: 'white_background',
      take_count: 5,
      global_locks: {
        product_identity_lock: 'Skeleton Dial Automatic Watch',
        person_identity_lock: 'Male model, Brazilian natural light',
        campaign_style_lock: 'Studio clean white backdrop',
        storyboard_reference_lock: 'Follow UGC scene progression without copying multi-panel grid'
      },
      takes: [
        {
          take_number: 1,
          title: 'Take 1 • Gancho',
          purpose: 'Opening Hook',
          visual_action: 'Man showing watch on wrist',
          prompt_en: 'Man looking at watch on wrist with high fidelity',
          product_lock_reminder: 'Skeleton dial automatic watch frozen',
          negative_constraints: 'collage, grid, split screen'
        }
      ],
      negative_prompt_global_en: 'distorted face, blur, collage, grid'
    };

    const clipboardText = formatTryOnCampaignClipboard(mockCampaign);
    assert.ok(clipboardText.includes('Storyboard Reference Lock (Image 3):'));
    assert.ok(clipboardText.includes('Follow UGC scene progression without copying multi-panel grid'));
  });
});
