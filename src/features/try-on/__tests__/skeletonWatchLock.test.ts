import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  detectSkeletonWatchStaticLock, 
  buildSkeletonWatchStaticDialLock, 
  buildSkeletonWatchNegativeAdditions,
  buildSkeletonWatchAdvancedRegionLock,
  buildSkeletonWatchAdvancedRegionNegativeAdditions
} from '../skeletonWatchLock';
import { buildTryOnCampaignPrompt } from '../tryOnCampaignLogic';

describe('Provador Virtual IA - Skeleton Watch Static Dial Lock & Advanced Region Lock', () => {
  it('detects skeleton watch triggers in English and Portuguese with accents', () => {
    assert.strictEqual(detectSkeletonWatchStaticLock('Mens skeleton watch luxury edition'), true);
    assert.strictEqual(detectSkeletonWatchStaticLock('Relógio automático com mecanismo aparente e engrenagens'), true);
    assert.strictEqual(detectSkeletonWatchStaticLock('Open-heart tourbillon style watch dial'), true);
    assert.strictEqual(detectSkeletonWatchStaticLock('Mostrador transparente com ponteiros'), true);
    assert.strictEqual(detectSkeletonWatchStaticLock('open-heart watch with visible mechanics'), true);
    assert.strictEqual(detectSkeletonWatchStaticLock('relógio skeleton com engrenagens visíveis'), true);
    assert.strictEqual(detectSkeletonWatchStaticLock('relógio dourado clássico sem engrenagens aparentes'), false);
    assert.strictEqual(detectSkeletonWatchStaticLock('Camisa casual de linho branca'), false);
    assert.strictEqual(detectSkeletonWatchStaticLock('Óculos de sol aviador'), false);
    assert.strictEqual(detectSkeletonWatchStaticLock('Bolsa de couro feminina'), false);
  });

  it('builds comprehensive static dial lock rules with forbidden and allowed zones', () => {
    const lock = buildSkeletonWatchStaticDialLock();
    assert.ok(lock.includes('SKELETON WATCH STATIC DIAL LOCK'));
    assert.ok(lock.includes('FORBIDDEN MOTION ZONES:'));
    assert.ok(lock.includes('ALLOWED MOTION ZONES:'));
    assert.ok(lock.includes('all visible internal gears'));
    assert.ok(lock.includes('natural hand/wrist micro-movement'));
  });

  it('builds negative tokens blocking moving gears and animated hands', () => {
    const negatives = buildSkeletonWatchNegativeAdditions();
    assert.ok(negatives.includes('moving gears'));
    assert.ok(negatives.includes('rotating gears'));
    assert.ok(negatives.includes('spinning tourbillon'));
    assert.ok(negatives.includes('ticking hands'));
  });

  it('builds Advanced Region Lock targeting 10-11 oclock upper-left gear and full dial reference', () => {
    const advLock = buildSkeletonWatchAdvancedRegionLock();
    assert.ok(advLock.includes('ADVANCED SKELETON WATCH REGION LOCK:'));
    assert.ok(advLock.includes('Critical region lock:'));
    assert.ok(advLock.includes('upper-left gear-shaped decorative area between 10 and 11 o’clock'));
    assert.ok(advLock.includes('Full dial reference lock:'));
    assert.ok(advLock.includes('Forbidden motion:'));
    assert.ok(advLock.includes('Allowed motion:'));
  });

  it('builds Advanced Region negative prompt additions targeting 10 and 11 oclock gear motion', () => {
    const advNegatives = buildSkeletonWatchAdvancedRegionNegativeAdditions();
    assert.ok(advNegatives.includes("rotating gear at 10 o'clock"));
    assert.ok(advNegatives.includes("rotating gear at 11 o'clock"));
    assert.ok(advNegatives.includes("moving upper-left gear"));
    assert.ok(advNegatives.includes("crawling texture at 10 o'clock"));
  });

  it('injects skeleton dial lock & advanced region lock into campaign prompt system instructions', () => {
    const prompt = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'shopee',
      false
    );
    assert.ok(prompt.includes('SKELETON / OPEN-HEART WATCH STATIC DIAL & ADVANCED REGION MANDATE'));
    assert.ok(prompt.includes('Critical region lock: Freeze the upper-left gear-shaped decorative area between 10 and 11 o’clock'));
    assert.ok(prompt.includes("rotating gear at 10 o'clock, rotating gear at 11 o'clock"));
  });
});
