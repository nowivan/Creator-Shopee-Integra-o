import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  detectWearableAccessoryCategory, 
  buildWearableAccessoryDemoMold 
} from '../wearableAccessoryMold';
import { buildTryOnCampaignPrompt } from '../tryOnCampaignLogic';

describe('Wearable Accessory Demo Mold (Scene 2 Architecture)', () => {
  // Test 1: Common watch
  it('1. Common watch: returns "watch", includes wrist reveal & slow wrist turn, no skeleton gear freeze', () => {
    const category = detectWearableAccessoryCategory('relógio dourado');
    assert.strictEqual(category, 'watch');

    const mold = buildWearableAccessoryDemoMold({
      productName: 'relógio dourado',
      accessoryType: 'watch',
      isSkeletonWatch: false
    });

    assert.ok(mold.promptBlock.includes('WEARABLE ACCESSORY DEMONSTRATION MOLD'));
    assert.ok(mold.promptBlock.includes('0–2s: Reveal relógio dourado already worn on the wrist by gently adjusting the sleeve/cuff'));
    assert.ok(mold.promptBlock.includes('2–4s: Slow, controlled wrist turn showing the bracelet/strap, case finish, bezel and dial'));
    assert.ok(!mold.promptBlock.includes('SKELETON WATCH STATIC DIAL LOCK'));
    assert.ok(!mold.promptBlock.includes('ADVANCED SKELETON WATCH REGION LOCK'));
    assert.ok(!mold.negativePromptAdditions.includes('spinning tourbillon'));
    assert.ok(!mold.negativePromptAdditions.includes("rotating gear at 10 o'clock"));
  });

  // Test 2: Skeleton watch
  it('2. Skeleton watch: returns "watch", includes wearable mold, skeleton dial lock & advanced region lock appended', () => {
    const category = detectWearableAccessoryCategory('relógio skeleton com engrenagens visíveis');
    assert.strictEqual(category, 'watch');

    const mold = buildWearableAccessoryDemoMold({
      productName: 'relógio skeleton com engrenagens visíveis',
      accessoryType: 'watch',
      isSkeletonWatch: true
    });

    assert.ok(mold.promptBlock.includes('WEARABLE ACCESSORY DEMONSTRATION MOLD'));
    assert.ok(mold.promptBlock.includes('SKELETON WATCH STATIC DIAL LOCK'));
    assert.ok(mold.promptBlock.includes('ADVANCED SKELETON WATCH REGION LOCK'));
    assert.ok(mold.promptBlock.includes('upper-left gear-shaped decorative area between 10 and 11 o’clock'));
    assert.ok(mold.promptBlock.includes('Full dial reference lock:'));
    assert.ok(mold.promptBlock.includes('FORBIDDEN MOTION ZONES:'));
    assert.ok(mold.promptBlock.includes('all visible internal gears'));
    assert.ok(mold.negativePromptAdditions.includes('moving gears'));
    assert.ok(mold.negativePromptAdditions.includes('spinning tourbillon'));
    assert.ok(mold.negativePromptAdditions.includes('ticking hands'));
    assert.ok(mold.negativePromptAdditions.includes("rotating gear at 10 o'clock"));
    assert.ok(mold.negativePromptAdditions.includes("rotating gear at 11 o'clock"));
  });

  // Test 3: Sunglasses
  it('3. Sunglasses: returns "sunglasses", includes face/bridge adjustment and head turn', () => {
    const category = detectWearableAccessoryCategory('óculos de sol');
    assert.strictEqual(category, 'sunglasses');

    const mold = buildWearableAccessoryDemoMold({
      productName: 'óculos de sol',
      accessoryType: 'sunglasses'
    });

    assert.ok(mold.promptBlock.includes('adjusts óculos de sol on their face and bridge of the nose'));
    assert.ok(mold.promptBlock.includes('showing the lenses, frame geometry, and temple arms'));
  });

  // Test 4: Ring
  it('4. Ring: returns "ring", includes hand/finger interaction', () => {
    const category = detectWearableAccessoryCategory('anel dourado');
    assert.strictEqual(category, 'ring');

    const mold = buildWearableAccessoryDemoMold({
      productName: 'anel dourado',
      accessoryType: 'ring'
    });

    assert.ok(mold.promptBlock.includes('Close-up on hand and fingers with anel dourado naturally worn'));
    assert.ok(mold.promptBlock.includes('metal luster, and gemstone/material shine'));
  });

  // Test 5: Bracelet
  it('5. Bracelet: returns "bracelet", includes wrist movement and clasp/finish', () => {
    const category = detectWearableAccessoryCategory('pulseira feminina');
    assert.strictEqual(category, 'bracelet');

    const mold = buildWearableAccessoryDemoMold({
      productName: 'pulseira feminina',
      accessoryType: 'bracelet'
    });

    assert.ok(mold.promptBlock.includes('worn on the wrist in an authentic natural outfit context'));
    assert.ok(mold.promptBlock.includes('showing finish, fit and clasp'));
  });

  // Test 6: Necklace
  it('6. Necklace: returns "necklace", includes neck/chest reveal and pendant/chain touch', () => {
    const category = detectWearableAccessoryCategory('colar com pingente');
    assert.strictEqual(category, 'necklace');

    const mold = buildWearableAccessoryDemoMold({
      productName: 'colar com pingente',
      accessoryType: 'necklace'
    });

    assert.ok(mold.promptBlock.includes('Reveal colar com pingente on the neck/chest area'));
    assert.ok(mold.promptBlock.includes('touch on the pendant or chain showing the fit, drape, and metallic luster'));
  });

  // Test 7: Clothing exclusion
  it('7. Clothing exclusion: returns null for "camiseta branca"', () => {
    const category = detectWearableAccessoryCategory('camiseta branca');
    assert.strictEqual(category, null);
  });

  // Test 8: Clothing priority
  it('8. Clothing priority: returns null for "camiseta com pessoa usando relógio" unless explicitly accessory category', () => {
    const category = detectWearableAccessoryCategory('camiseta com pessoa usando relógio');
    assert.strictEqual(category, null);

    const explicitAccessory = detectWearableAccessoryCategory('relógio clássico para combinar com camiseta');
    assert.strictEqual(explicitAccessory, 'watch');
  });

  // Test 9: TryOnCampaign prompt integration
  it('9. Campaign prompt integrates mold when accessory context provided and keeps clothing untouched', () => {
    const accessoryPrompt = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'shopee',
      false,
      undefined,
      'relógio masculino esportivo'
    );
    assert.ok(accessoryPrompt.includes('WEARABLE ACCESSORY DEMONSTRATION MOLD'));
    assert.ok(accessoryPrompt.includes('adjusting the sleeve/cuff'));

    const clothingPrompt = buildTryOnCampaignPrompt(
      'shopee_clean_demo',
      5,
      'no_dialogue',
      'white_background',
      'shopee',
      false,
      undefined,
      'vestido longo floral'
    );
    assert.ok(!clothingPrompt.includes('WEARABLE ACCESSORY DEMONSTRATION MOLD (8-SECOND SCENE 2 STRUCTURE)'));
  });
});
