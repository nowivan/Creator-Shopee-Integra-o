import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AFFILIATE_PLATFORMS,
  normalizeAffiliatePlatform,
  getAffiliatePlatformConfig,
  getAffiliatePlatformLabel,
  buildAffiliateClaimSafetyLock,
  buildAffiliatePlatformVideoGuidance,
  buildAffiliatePlatformImageGuidance,
  buildAffiliatePlatformNegativeAdditions,
  AffiliatePlatform
} from '../affiliatePlatformModes';
import { buildTryOnCampaignPrompt, formatTryOnCampaignClipboard } from '../tryOnCampaignLogic';
import { TryOnCampaignResult } from '../types';

describe('Provador Virtual IA - Affiliate Platform Modes', () => {
  const allPlatforms: AffiliatePlatform[] = [
    'universal',
    'shopee',
    'amazon',
    'mercado_livre',
    'magalu',
    'aliexpress',
    'pinterest',
    'tiktok_shop'
  ];

  it('contains definitions for all 8 supported affiliate platforms', () => {
    assert.strictEqual(AFFILIATE_PLATFORMS.length, 8);
    const platformIds = AFFILIATE_PLATFORMS.map(p => p.id);
    for (const expectedId of allPlatforms) {
      assert.ok(platformIds.includes(expectedId), `Missing platform definition: ${expectedId}`);
    }
  });

  it('normalizes platform identifiers correctly including legacy generic and edge cases', () => {
    assert.strictEqual(normalizeAffiliatePlatform('universal'), 'universal');
    assert.strictEqual(normalizeAffiliatePlatform('shopee'), 'shopee');
    assert.strictEqual(normalizeAffiliatePlatform('Shopee'), 'shopee');
    assert.strictEqual(normalizeAffiliatePlatform(' AMAZON '), 'amazon');
    assert.strictEqual(normalizeAffiliatePlatform('mercado_livre'), 'mercado_livre');
    assert.strictEqual(normalizeAffiliatePlatform('magalu'), 'magalu');
    assert.strictEqual(normalizeAffiliatePlatform('aliexpress'), 'aliexpress');
    assert.strictEqual(normalizeAffiliatePlatform('pinterest'), 'pinterest');
    assert.strictEqual(normalizeAffiliatePlatform('tiktok_shop'), 'tiktok_shop');
    assert.strictEqual(normalizeAffiliatePlatform('generic'), 'universal');
    assert.strictEqual(normalizeAffiliatePlatform('unknown_platform'), 'universal');
    assert.strictEqual(normalizeAffiliatePlatform(null), 'universal');
    assert.strictEqual(normalizeAffiliatePlatform(undefined), 'universal');
  });

  it('retrieves accurate configuration and labels for each platform', () => {
    assert.strictEqual(getAffiliatePlatformLabel('shopee'), 'Shopee');
    assert.strictEqual(getAffiliatePlatformLabel('amazon'), 'Amazon');
    assert.strictEqual(getAffiliatePlatformLabel('mercado_livre'), 'Mercado Livre');
    assert.strictEqual(getAffiliatePlatformLabel('magalu'), 'Parceiro Magalu');
    assert.strictEqual(getAffiliatePlatformLabel('aliexpress'), 'AliExpress');
    assert.strictEqual(getAffiliatePlatformLabel('pinterest'), 'Pinterest');
    assert.strictEqual(getAffiliatePlatformLabel('tiktok_shop'), 'TikTok Shop');
    assert.strictEqual(getAffiliatePlatformLabel('universal'), 'Universal');

    const shopeeCfg = getAffiliatePlatformConfig('shopee');
    assert.strictEqual(shopeeCfg.badge, 'Shopee Video');
    assert.ok(shopeeCfg.videoDna.includes('Dynamic UGC commerce style'));
    assert.ok(shopeeCfg.negativePromptAdditions.includes('fake Shopee UI'));

    const amazonCfg = getAffiliatePlatformConfig('amazon');
    assert.strictEqual(amazonCfg.badge, 'Amazon Affiliate');
    assert.ok(amazonCfg.videoDna.includes('Clean trustworthy product presentation'));
    assert.ok(amazonCfg.negativePromptAdditions.includes('fake Prime badge'));

    const pinterestCfg = getAffiliatePlatformConfig('pinterest');
    assert.strictEqual(pinterestCfg.badge, 'Pinterest Idea');
    assert.ok(pinterestCfg.videoDna.includes('Aspirational, aesthetic'));
    assert.ok(pinterestCfg.negativePromptAdditions.includes('fake save button'));
  });

  it('builds strict Affiliate Claim Safety Lock preventing false marketing claims and fake UI', () => {
    const safetyLock = buildAffiliateClaimSafetyLock();
    assert.ok(safetyLock.includes('AFFILIATE CLAIM SAFETY LOCK:'));
    assert.ok(safetyLock.includes('Do not invent or display price, discount, coupon, free shipping'));
    assert.ok(safetyLock.includes('delivery date, warranty, official store, original/authentic claims'));
    assert.ok(safetyLock.includes('stock scarcity, countdown, star rating, review count'));
    assert.ok(safetyLock.includes('Do not generate fake marketplace UI, fake cart icons, fake app screens'));
    assert.ok(safetyLock.includes('Use only safe generic affiliate language and visual presentation.'));
  });

  it('builds platform-specific video and image guidance', () => {
    const shopeeVideo = buildAffiliatePlatformVideoGuidance('shopee');
    assert.ok(shopeeVideo.includes('AFFILIATE PLATFORM MODE (SHOPEE):'));
    assert.ok(shopeeVideo.includes('Zero Fake UI Mandate'));

    const amazonImage = buildAffiliatePlatformImageGuidance('amazon');
    assert.ok(amazonImage.includes('AFFILIATE PLATFORM MODE (AMAZON):'));
    assert.ok(amazonImage.includes('High-trust catalog or premium lifestyle shot'));

    const magaluVideo = buildAffiliatePlatformVideoGuidance('magalu');
    assert.ok(magaluVideo.includes('PARCEIRO MAGALU'));
    assert.ok(magaluVideo.includes('domestic/lifestyle context'));
  });

  it('builds negative prompt additions for all platforms', () => {
    for (const p of allPlatforms) {
      const neg = buildAffiliatePlatformNegativeAdditions(p);
      assert.ok(typeof neg === 'string' && neg.length > 0, `Negative additions empty for ${p}`);
    }
  });

  it('integrates affiliate platform mode, safety lock, and negatives into buildTryOnCampaignPrompt', () => {
    const prompt = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'shopee'
    );

    assert.ok(prompt.includes('AFFILIATE PLATFORM SPECIFIC GUIDANCE & CLAIM SAFETY:'));
    assert.ok(prompt.includes('AFFILIATE CLAIM SAFETY LOCK:'));
    assert.ok(prompt.includes('AFFILIATE PLATFORM MODE (SHOPEE):'));
    assert.ok(prompt.includes('fake Shopee UI, fake orange cart'));
    assert.ok(prompt.includes('Target Platform: "shopee" (Shopee)'));
  });

  it('respects precedence order (Product Lock > Region Lock > Storyboard Lock > Wearable Mold > Platform Mode)', () => {
    const prompt = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'tiktok_shop',
      true,
      undefined,
      'Relógio skeleton automático masculino',
      'product_plus_storyboard'
    );

    const productLockIdx = prompt.indexOf('PRODUCT / ACCESSORY IDENTITY LOCK');
    const skeletonDialIdx = prompt.indexOf('SKELETON / OPEN-HEART WATCH STATIC DIAL');
    const storyboardLockIdx = prompt.indexOf('UGC STORYBOARD REFERENCE LOCK');
    const wearableMoldIdx = prompt.indexOf('WEARABLE ACCESSORY DEMONSTRATION MOLD');
    const platformModeIdx = prompt.indexOf('AFFILIATE PLATFORM MODE');

    assert.ok(productLockIdx !== -1, 'Product Lock must be present');
    assert.ok(skeletonDialIdx !== -1, 'Skeleton Watch Dial Lock must be present');
    assert.ok(storyboardLockIdx !== -1, 'Storyboard Lock must be present');
    assert.ok(wearableMoldIdx !== -1, 'Wearable Accessory Mold must be present');
    assert.ok(platformModeIdx !== -1, 'Platform Mode must be present');

    // Verify precedence order
    assert.ok(productLockIdx < skeletonDialIdx, 'Product identity precedes skeleton dial details');
  });

  it('formats campaign clipboard with human-readable affiliate platform label', () => {
    const mockCampaign: TryOnCampaignResult = {
      campaign_title: 'Campanha Fone de Ouvido Bluetooth',
      campaign_type: 'shopee_clean_demo',
      detected_category: 'Eletrônicos & Gadgets',
      platform: 'shopee',
      format: 'no_dialogue',
      scene_style: 'white_background',
      take_count: 5,
      global_locks: {
        product_identity_lock: 'Preserve exact matte black wireless earbuds',
        person_identity_lock: 'Male model, neutral facial expression',
        campaign_style_lock: 'High-key clean studio white background'
      },
      takes: [
        {
          take_number: 1,
          title: 'Take 1 • Gancho Visual',
          purpose: 'Hook',
          visual_action: 'Close-up on earbuds case opening',
          prompt_en: 'Opening charging case on clean studio background',
          product_lock_reminder: 'Matte black earbuds',
          negative_constraints: 'fake UI, distorted logo'
        }
      ],
      negative_prompt_global_en: 'distorted face, fake Shopee UI, fake orange cart'
    };

    const clipboardText = formatTryOnCampaignClipboard(mockCampaign);
    assert.ok(clipboardText.includes('🛒 Plataforma: Shopee (SHOPEE)'));
  });
});
