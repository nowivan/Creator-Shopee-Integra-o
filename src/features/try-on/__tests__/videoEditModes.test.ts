import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  VIDEO_EDIT_MODES,
  VIDEO_EDIT_CATEGORIES,
  GLOBAL_PRESERVATION_LOCK,
  FACE_AND_IDENTITY_LOCK,
  PERSON_BASED_VIDEO_MODES,
  STYLE_TRANSFER_PRESETS,
  buildVideoEditPrompt,
  formatVideoEditClipboard,
  saveVideoEditPromptToVault,
  VideoEditModeId
} from '../videoEditModes';

describe('Provador Virtual IA - Video Edit Modes & Face & Identity Lock', () => {
  it('1. STYLE_TRANSFER appears in Video Edit Modes', () => {
    const styleTransfer = VIDEO_EDIT_MODES.find(m => m.id === 'STYLE_TRANSFER');
    assert.ok(styleTransfer, 'STYLE_TRANSFER must exist in VIDEO_EDIT_MODES');
    assert.strictEqual(styleTransfer.labelPt, 'Transferir Estilo Visual');
    assert.ok(styleTransfer.shortDescriptionPt.includes('sem alterar identidade'));
  });

  it('2. STYLE_TRANSFER appears under Style & Finish', () => {
    const styleTransfer = VIDEO_EDIT_MODES.find(m => m.id === 'STYLE_TRANSFER');
    assert.ok(styleTransfer);
    assert.strictEqual(styleTransfer.category, 'style_finish');
  });

  it('3. existing 8 modes remain unchanged', () => {
    assert.strictEqual(VIDEO_EDIT_MODES.length, 9);
    const original8Ids: VideoEditModeId[] = [
      'CINEMATIC_UPGRADE',
      'BACKGROUND_REPLACEMENT',
      'OBJECT_REMOVAL',
      'OBJECT_REPLACEMENT',
      'OUTFIT_CHANGE',
      'ACTION_EFFECTS',
      'CAMERA_ANGLE_CHANGE',
      'PRODUCT_ADVERTISEMENT_EDIT'
    ];

    original8Ids.forEach((id) => {
      const mode = VIDEO_EDIT_MODES.find(m => m.id === id);
      assert.ok(mode, `Original mode ${id} must still exist`);
      assert.ok(mode.labelPt.length > 0);
      assert.ok(mode.defaultTechnicalDirectives.length > 0);
    });
  });

  it('4. Face & Identity Lock appears automatically in person-based modes', () => {
    const personModes: VideoEditModeId[] = [
      'CINEMATIC_UPGRADE',
      'BACKGROUND_REPLACEMENT',
      'OUTFIT_CHANGE',
      'ACTION_EFFECTS',
      'CAMERA_ANGLE_CHANGE',
      'STYLE_TRANSFER'
    ];

    personModes.forEach((modeId) => {
      assert.ok(PERSON_BASED_VIDEO_MODES.includes(modeId));
      const res = buildVideoEditPrompt({
        modeId,
        sourceContext: 'Model in motion wearing collection piece',
        targetEditDescription: 'Refined visual adjustment'
      });

      assert.ok(res.faceAndIdentityLock !== undefined, `Mode ${modeId} must include Face & Identity Lock`);
      assert.ok(res.masterPromptEn.includes('FACE & IDENTITY LOCK:'), `Mode ${modeId} master prompt must include Face & Identity Lock`);
      assert.ok(res.googleVidsStructuredPrompt.includes('FACE & IDENTITY LOCK:'));
    });
  });

  it('5. Face & Identity Lock is omitted in product-only mode when no person exists', () => {
    const res = buildVideoEditPrompt({
      modeId: 'PRODUCT_ADVERTISEMENT_EDIT',
      sourceContext: 'Leather handbag spinning on rotating marble platform',
      targetEditDescription: 'Hero golden light sweep on gold buckles and stitching',
      hasPerson: false
    });

    assert.strictEqual(res.faceAndIdentityLock, undefined);
    assert.ok(!res.masterPromptEn.includes('FACE & IDENTITY LOCK:'));
    assert.ok(res.masterPromptEn.includes('GLOBAL PRESERVATION LOCK:'));
    assert.ok(!res.googleVidsStructuredPrompt.includes('FACE & IDENTITY LOCK:'));
  });

  it('6. Face & Identity Lock includes apparent age, expressions, skin texture and facial geometry protection', () => {
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('apparent age'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('facial expressions'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('natural skin texture'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('facial structure'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('facial proportions'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('identity drift'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('face drift'));
    assert.ok(FACE_AND_IDENTITY_LOCK.includes('plastic skin'));
  });

  it('7. STYLE_TRANSFER preserves identity', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Model walking in city street',
      targetEditDescription: '1970s vintage film'
    });

    assert.ok(res.masterPromptEn.includes('PRESERVE:'));
    assert.ok(res.masterPromptEn.includes('- subject identity'));
    assert.ok(res.masterPromptEn.includes('- face'));
  });

  it('8. STYLE_TRANSFER preserves original action and timing', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Model turning around in dynamic dance routine',
      targetEditDescription: 'cinematic noir'
    });

    assert.ok(res.masterPromptEn.includes('- original actions'));
    assert.ok(res.masterPromptEn.includes('- timing'));
    assert.ok(res.masterPromptEn.includes('- camera continuity'));
  });

  it('9. STYLE_TRANSFER preserves product identity', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Subject wearing branded watch',
      targetEditDescription: 'luxury editorial'
    });

    assert.ok(res.masterPromptEn.includes('- product identity'));
    assert.ok(res.masterPromptEn.includes('product mutation'));
  });

  it('10. STYLE_TRANSFER includes temporal consistency', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Fashion show catwalk clip',
      targetEditDescription: 'retro VHS'
    });

    assert.ok(res.masterPromptEn.includes('TEMPORAL CONSISTENCY:'));
    assert.ok(res.masterPromptEn.includes('Apply the visual treatment consistently across every frame.'));
  });

  it('11. STYLE_TRANSFER forbids identity drift', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Subject talking to camera',
      targetEditDescription: 'high-fashion campaign'
    });

    assert.ok(res.masterPromptEn.includes('identity drift'));
    assert.ok(res.masterPromptEn.includes('face drift'));
  });

  it('12. STYLE_TRANSFER forbids product mutation', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Subject holding designer handbag',
      targetEditDescription: 'black & gold premium'
    });

    assert.ok(res.masterPromptEn.includes('product mutation'));
    assert.ok(res.masterPromptEn.includes('wardrobe redesign'));
  });

  it('13. technical prompt remains English', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Modelo usando vestido vermelho em estudio',
      targetEditDescription: 'futuristic minimal',
      secondaryDetails: 'Subtle neon cyan ambient rim light'
    });

    assert.ok(res.masterPromptEn.includes('Transform the source video into'));
    assert.ok(res.masterPromptEn.includes('Maintain realistic motion and spatial relationships.'));
    assert.ok(res.masterPromptEn.includes('GLOBAL PRESERVATION LOCK:'));
  });

  it('14. Portuguese visible text remains exact without translation', () => {
    const visibleText = 'NOVA COLEÇÃO DE INVERNO 2026';
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Fashion campaign',
      targetEditDescription: 'soft beauty commercial',
      visibleTextPt: visibleText,
      textMode: 'with_text'
    });

    assert.ok(res.masterPromptEn.includes(`Render only this exact Portuguese text on screen: "${visibleText}"`));
    assert.ok(res.googleVidsStructuredPrompt.includes(`"${visibleText}" (Strictly preserved in Portuguese, no translation)`));
  });

  it('15. no_text behavior unchanged', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Video scene',
      targetEditDescription: 'analog film look',
      textMode: 'no_text'
    });

    assert.ok(res.masterPromptEn.includes('TEXT CONSTRAINT: No unauthorized visible text'));
    assert.ok(res.googleVidsStructuredPrompt.includes('No unrequested text or fake brand overlays.'));
  });

  it('16. with_text behavior unchanged', () => {
    const text = 'PROMOÇÃO EXCLUSIVA';
    const res = buildVideoEditPrompt({
      modeId: 'CINEMATIC_UPGRADE',
      sourceContext: 'Commercial scene',
      targetEditDescription: '35mm anamorphic',
      visibleTextPt: text,
      textMode: 'with_text'
    });

    assert.ok(res.masterPromptEn.includes(`Render only this exact Portuguese text on screen: "${text}"`));
  });

  it('17. reserved_space_no_text behavior unchanged', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'E-commerce video',
      targetEditDescription: 'clean premium',
      textMode: 'reserved_space_no_text'
    });

    assert.ok(res.masterPromptEn.includes('TEXT CONSTRAINT: RESERVED SPACE — Keep designated negative space clean'));
    assert.ok(res.googleVidsStructuredPrompt.includes('RESERVED SPACE — Keep designated clean negative space free of text'));
  });

  it('18. Google Vids / Omni remains plain structured text', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Video footage',
      targetEditDescription: 'cinematic noir',
      aspectRatio: '16:9'
    });

    assert.ok(res.googleVidsStructuredPrompt.startsWith('======================================================='));
    assert.ok(res.googleVidsStructuredPrompt.includes('GOOGLE VIDS / OMNI — VIDEO EDIT PROMPT'));
    assert.ok(res.googleVidsStructuredPrompt.includes('MODE: TRANSFERIR ESTILO VISUAL (STYLE_TRANSFER)'));
    assert.ok(res.googleVidsStructuredPrompt.includes('ASPECT RATIO: 16:9'));
    assert.ok(res.googleVidsStructuredPrompt.includes('1. EDIT DIRECTIVE:'));
    assert.ok(res.googleVidsStructuredPrompt.includes('2. MANDATORY PRESERVATION LOCK:'));
    assert.ok(res.googleVidsStructuredPrompt.includes('3. FACE & IDENTITY LOCK:'));
  });

  it('19. Prompt Vault save works for STYLE_TRANSFER', () => {
    const res = buildVideoEditPrompt({
      modeId: 'STYLE_TRANSFER',
      sourceContext: 'Fashion clip',
      targetEditDescription: '1970s vintage film',
      aspectRatio: '9:16'
    });

    const vaultItem = saveVideoEditPromptToVault(res);
    assert.strictEqual(vaultItem.type, 'prompt');
    assert.strictEqual(vaultItem.category, 'Vídeo & Animação');
    assert.strictEqual(vaultItem.destinationTool, 'provador_virtual');
    assert.strictEqual(vaultItem.status, 'approved');
    assert.ok(vaultItem.tags.includes('style_transfer'));
    assert.ok(vaultItem.tags.includes('preservation-lock'));
    assert.ok(vaultItem.notes.includes('Transferir Estilo Visual'));
  });

  it('20. all existing Video Edit Mode tests still pass and categories are correctly mapped', () => {
    assert.strictEqual(VIDEO_EDIT_CATEGORIES.length, 4); // all, scene_edit, subject_edit, style_finish
    const sceneModes = VIDEO_EDIT_MODES.filter(m => m.category === 'scene_edit');
    const subjectModes = VIDEO_EDIT_MODES.filter(m => m.category === 'subject_edit');
    const styleModes = VIDEO_EDIT_MODES.filter(m => m.category === 'style_finish');

    assert.strictEqual(sceneModes.length, 3);
    assert.strictEqual(subjectModes.length, 3);
    assert.strictEqual(styleModes.length, 3);
  });
});
