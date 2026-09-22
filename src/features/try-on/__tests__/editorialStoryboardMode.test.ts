import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildEditorialStoryboardPrompt,
  buildEditorialStoryboardLock,
  buildEditorialBrandTextHallucinationLock,
  buildEditorialTextModeLock,
  buildEditorialStoryboardNegativeAdditions,
  formatGoogleVidsPrompt,
  formatEditorialModelPrompt,
  formatEditorialStoryboardClipboard,
  saveEditorialStoryboardToVault,
  EDITORIAL_BRAND_SAFETY_WARNING,
  EditorialStoryboardResult
} from '../editorialStoryboardMode';

describe('Provador Virtual IA - Editorial Product Storyboard Mode & Brand/Text Hallucination Lock', () => {
  it('1. lock appears in Editorial Product Storyboard prompt', () => {
    const prompt = buildEditorialStoryboardPrompt({
      textMode: 'no_text',
      shotCount: 9,
      productContext: 'Vestido de Seda Premium'
    });

    assert.ok(prompt.includes('BRAND AND TEXT HALLUCINATION LOCK:'));
    assert.ok(prompt.includes('If the source product contains visible brand/logo/text:'));
    assert.ok(prompt.includes('preserve only what is visibly present'));
    assert.ok(prompt.includes('do not translate'));
    assert.ok(prompt.includes('do not redesign'));
    assert.ok(prompt.includes('do not add extra labels'));
    assert.ok(prompt.includes('If the source product has no visible text:'));
    assert.ok(prompt.includes('do not invent any brand'));
    assert.ok(prompt.includes('do not add product label'));
    assert.ok(prompt.includes('do not add logo'));
    assert.ok(prompt.includes('do not add random typography'));
  });

  it('2. no_text forbids logos, labels, text, and placeholders', () => {
    const lock = buildEditorialBrandTextHallucinationLock('no_text');
    assert.ok(lock.includes('For no_text:'));
    assert.ok(lock.includes('no text, no logos, no labels, no placeholders'));

    const textModeLock = buildEditorialTextModeLock('no_text');
    assert.ok(textModeLock.includes('NO TEXT'));
    assert.ok(textModeLock.includes('no logos, no labels, no placeholders'));

    const prompt = buildEditorialStoryboardPrompt({
      textMode: 'no_text'
    });
    assert.ok(prompt.includes('no text, no logos, no labels, no placeholders'));
  });

  it('3. with_text allows only exact Portuguese user text without translation or extra words', () => {
    const customText = 'Coleção Verão 2026 • Exclusivo';
    const lock = buildEditorialBrandTextHallucinationLock('with_text', customText);
    assert.ok(lock.includes('For with_text:'));
    assert.ok(lock.includes(`render only the exact Portuguese text provided by user ("${customText}")`));
    assert.ok(lock.includes('no extra words'));
    assert.ok(lock.includes('no translation'));

    const textModeLock = buildEditorialTextModeLock('with_text', customText);
    assert.ok(textModeLock.includes(`Render only the exact Portuguese text provided by user: "${customText}"`));
    assert.ok(textModeLock.includes('No extra words, no translation, no placeholders.'));

    const prompt = buildEditorialStoryboardPrompt({
      textMode: 'with_text',
      customText
    });
    assert.ok(prompt.includes(`"${customText}"`));
    assert.ok(prompt.includes('no extra words'));
    assert.ok(prompt.includes('no translation'));
  });

  it('4. reserved_space_no_text forbids placeholders and preserves blank editable space', () => {
    const lock = buildEditorialBrandTextHallucinationLock('reserved_space_no_text');
    assert.ok(lock.includes('For reserved_space_no_text:'));
    assert.ok(lock.includes('preserve blank editable space'));
    assert.ok(lock.includes('no letters, no labels, no watermarks, no placeholders'));

    const textModeLock = buildEditorialTextModeLock('reserved_space_no_text');
    assert.ok(textModeLock.includes('RESERVED SPACE NO TEXT'));
    assert.ok(textModeLock.includes('Preserve blank editable space. No letters, no labels, no watermarks, no placeholders.'));

    const prompt = buildEditorialStoryboardPrompt({
      textMode: 'reserved_space_no_text'
    });
    assert.ok(prompt.includes('preserve blank editable space'));
    assert.ok(prompt.includes('no placeholders'));
  });

  it('5. prompt forbids invented brand names, fake logos, and altered product labels', () => {
    const prompt = buildEditorialStoryboardPrompt({
      textMode: 'no_text'
    });
    assert.ok(prompt.includes('Avoid: invented brand names, fake logos, altered product labels, random typography, misspelled text, copied reference branding, unauthorized trademarks, fake luxury logos, unreadable product text.'));
    assert.ok(prompt.includes('do not invent any brand'));

    const negatives = buildEditorialStoryboardNegativeAdditions();
    assert.ok(negatives.includes('invented brand names'));
    assert.ok(negatives.includes('fake logos'));
    assert.ok(negatives.includes('altered product labels'));
    assert.ok(negatives.includes('random typography'));
    assert.ok(negatives.includes('misspelled text'));
    assert.ok(negatives.includes('copied reference branding'));
    assert.ok(negatives.includes('unauthorized trademarks'));
    assert.ok(negatives.includes('fake luxury logos'));
    assert.ok(negatives.includes('unreadable product text'));
  });

  it('6. formats Google Vids / Omni export preserving structure and hallucination lock', () => {
    const mockResult: EditorialStoryboardResult = {
      mode: 'editorial_product_storyboard',
      title: 'Campanha Editorial Joias Finas',
      campaign_mood: 'High-end luxury atmosphere with warm cinematic shadows',
      color_palette: 'Obsidian black, warm champaign gold, soft titanium ivory',
      lighting_style: 'Chiaroscuro rim lighting and diffused key light',
      pacing: 'Slow, graceful camera push-ins and 360 orbits',
      global_locks: {
        product_identity_lock: 'Lock exact physical diamond necklace from Image 2.',
        editorial_storyboard_lock: buildEditorialStoryboardLock(),
        brand_text_hallucination_lock: buildEditorialBrandTextHallucinationLock('no_text'),
        brand_safety_lock: 'No logos or real person identities replicated.',
        no_grid_lock: 'Single continuous video, strictly no contact sheet or 3x3 grid.',
        text_mode_lock: buildEditorialTextModeLock('no_text')
      },
      shots: [
        {
          shot_number: 1,
          shot_type: 'hero product close-up',
          title: 'Hero Close-Up da Joia',
          visual_action: 'Câmera se aproxima suavemente evidenciando os detalhes do corte de diamante',
          camera_framing: '85mm macro lens, slow optical push-in, f/2.8 shallow depth of field',
          lighting: 'Diffused studio softbox with golden rim backlight',
          product_lock: 'Diamond necklace craftsmanship and stone settings locked',
          negative_constraints: 'invented brand names, fake logos, altered product labels',
          prompt_en: 'Cinematic 85mm macro product close-up of diamond necklace on velvet pedestal.',
          visible_text_pt_br: ''
        }
      ],
      google_vids_structured_prompt: '',
      model_prompt_en: 'Master technical prompt for diffusion model.',
      negative_prompt_global_en: 'invented brand names, fake logos, altered product labels'
    };

    const formattedVids = formatGoogleVidsPrompt(mockResult, 'no_text');
    assert.ok(formattedVids.includes('GOOGLE VIDS / OMNI — EDITORIAL PRODUCT STORYBOARD'));
    assert.ok(formattedVids.includes('BRAND & TEXT HALLUCINATION LOCK:'));
    assert.ok(formattedVids.includes('CRITICAL INVARIANCE LOCKS:'));
    assert.ok(formattedVids.includes('CINEMATIC SEQUENCE (1 SHOTS):'));
    assert.ok(formattedVids.includes('GLOBAL NEGATIVE PROMPT (EN):'));

    const clipboardText = formatEditorialStoryboardClipboard(mockResult);
    assert.ok(clipboardText.includes('STORYBOARD EDITORIAL DE PRODUTO'));
    assert.ok(clipboardText.includes('Brand & Text Hallucination Lock:'));
    assert.ok(clipboardText.includes(EDITORIAL_BRAND_SAFETY_WARNING));

    const vaultItem = saveEditorialStoryboardToVault(mockResult);
    assert.strictEqual(vaultItem.category, 'Comercial & Moda');
    assert.strictEqual(vaultItem.destinationTool, 'provador_virtual');
    assert.strictEqual(vaultItem.favorite, false);
  });
});
