import { describe, it } from 'node:test';
import assert from 'node:assert';
import { selectCleanDVideoFacts, buildCleanProductBrief, extractCleanProductName } from '../brief';
import { buildCleanDInitialPrompt, buildCleanDManualRepairPrompt, CLEAN_D_SENIOR_COPY_CONTRACT_TEXT } from '../brain';
import { validateScene, CLEAN_D_MIN_CHARS, CLEAN_D_MAX_CHARS, countCharacters } from '../validator';
import { shouldOfferCopyAgentRestore } from '../../copy-agent/copyAgentSessionStorage';

const LONG_TECHNICAL_ORIENT_WATCH = `Relógio Orient Masculino Neo Sports MGSS1159D2KX
mecanismo analógico
pulseira em aço dourado
26 cm comprimento
fecho dobrável com dois botões
caixa em aço
4.4 cm diâmetro
0.9 cm espessura
tamanho médio masculino
resistência à água 5 ATM
calendário analógico com data
fornecedor/metadados legais
CNPJ 00.000.000/0001-00
garantia do fornecedor de 1 ano
maior loja do Brasil`;

describe('Clean D Lab — Fact Selection & Resilience', () => {
    // 1. Long technical product description is compressed before Clean D Lab generation
    it('1. compresses long technical product description before Clean D Lab generation', () => {
        const selection = selectCleanDVideoFacts(LONG_TECHNICAL_ORIENT_WATCH);
        assert.strictEqual(selection.primaryProductName, 'Relógio Orient Masculino Neo Sports');
        assert.ok(selection.videoRelevantFacts.length > 0);
        assert.ok(selection.videoRelevantFacts.length <= 5);
        assert.ok(selection.compressedContext.length < LONG_TECHNICAL_ORIENT_WATCH.length * 2);
    });

    // 2. CNPJ/legal metadata is ignored
    it('2. ignores CNPJ and legal/tax metadata from copy extraction', () => {
        const selection = selectCleanDVideoFacts(LONG_TECHNICAL_ORIENT_WATCH);
        const hasCnpjInFacts = selection.videoRelevantFacts.some(f => /CNPJ|00\.000\.000/i.test(f));
        assert.strictEqual(hasCnpjInFacts, false);
        assert.ok(selection.ignoredMetadata.some(m => /CNPJ/i.test(m)));
    });

    // 3. Supplier/store marketing phrases are ignored
    it('3. ignores supplier/store marketing phrases like "maior loja do Brasil"', () => {
        const selection = selectCleanDVideoFacts(LONG_TECHNICAL_ORIENT_WATCH);
        const hasStoreSloganInFacts = selection.videoRelevantFacts.some(f => /maior loja do brasil/i.test(f));
        assert.strictEqual(hasStoreSloganInFacts, false);
        assert.ok(selection.ignoredMetadata.some(m => /maior loja/i.test(m)));
    });

    // 4. Measurements are not overused / ignored when excessive
    it('4. ignores excessive micro-measurements (26 cm comprimento, 0.9 cm espessura, 4.4 cm diâmetro)', () => {
        const selection = selectCleanDVideoFacts(LONG_TECHNICAL_ORIENT_WATCH);
        const hasExcessiveDimensions = selection.videoRelevantFacts.some(f => /0\.9\s*cm|26\s*cm|4\.4\s*cm/i.test(f));
        assert.strictEqual(hasExcessiveDimensions, false);
        assert.ok(selection.ignoredMetadata.some(m => /medidas técnicas/i.test(m)));
    });

    // 5. Selected facts include visible/buyer-relevant details
    it('5. selects visible/buyer-relevant details such as steel materials, mechanism, water resistance', () => {
        const selection = selectCleanDVideoFacts(LONG_TECHNICAL_ORIENT_WATCH);
        const joined = selection.videoRelevantFacts.join(' ').toLowerCase();
        assert.match(joined, /aço|dourado/i);
        assert.match(joined, /analógico|5 atm|fecho|resistência/i);
    });

    // 6. Generated prompt includes Product Fact Selection Lock
    it('6. generated Clean D prompt includes Product Fact Selection Lock and Character Contract Support', () => {
        const brief = buildCleanProductBrief(LONG_TECHNICAL_ORIENT_WATCH);
        const prompt = buildCleanDInitialPrompt(brief, 'D');

        assert.ok(prompt.includes('PRODUCT FACT SELECTION LOCK:'));
        assert.ok(prompt.includes('Select only 2 or 3 video-relevant product facts per variation.'));
        assert.ok(prompt.includes('CHARACTER CONTRACT SUPPORT:'));
        assert.ok(prompt.includes('160 and 175 characters'));
        assert.ok(CLEAN_D_SENIOR_COPY_CONTRACT_TEXT.includes('PRODUCT FACT SELECTION LOCK:'));
    });

    // 7. Character contract remains 160–175
    it('7. character contract remains strictly 160 to 175 characters', () => {
        assert.strictEqual(CLEAN_D_MIN_CHARS, 160);
        assert.strictEqual(CLEAN_D_MAX_CHARS, 175);

        const sampleText = 'Esse relógio masculino com acabamento em aço dourado e calendário analógico transforma o seu visual diário com elegância indiscutível e alta durabilidade comprovada.';
        const length = countCharacters(sampleText);
        assert.ok(length >= 160 && length <= 175);

        const validation = validateScene(1, 'scene2', sampleText, 160, 175);
        assert.strictEqual(validation.valid, true);
        assert.strictEqual(validation.charactersValid, true);
    });

    // 8. Repair flow preserves selected facts and safety locks
    it('8. repair prompt preserves selected facts, fact selection lock and safety constraints', () => {
        const brief = buildCleanProductBrief(LONG_TECHNICAL_ORIENT_WATCH);
        const repairPrompt = buildCleanDManualRepairPrompt(
            {
                versionId: 1,
                scene: 'scene2',
                text: 'Texto curto',
                currentCharacterCount: 11,
                violations: ['SCENE_2_TOO_SHORT']
            },
            brief,
            'text_only'
        );

        assert.ok(repairPrompt.includes('PRODUCT FACT SELECTION LOCK:'));
        assert.ok(repairPrompt.includes('CHARACTER CONTRACT SUPPORT:'));
        assert.ok(repairPrompt.includes('160 a 175 caracteres'));
        assert.ok(repairPrompt.includes('Relógio Orient Masculino Neo Sports'));
    });

    // 9. Failed cards are not saved as valid session
    it('9. ensures failed generations or empty cards are not considered valid for restoration', () => {
        const invalidSession = {
            schemaVersion: 1 as const,
            savedAt: Date.now(),
            activeMode: 'clean_d_lab' as const,
            productContext: 'Test',
            selectedPlatform: 'tiktok_shop',
            variations: [],
            labVariations: []
        };
        assert.strictEqual(shouldOfferCopyAgentRestore(invalidSession), false);
    });

    // 10. Clean D Lab still works for short product context
    it('10. works cleanly for short concise product context', () => {
        const shortContext = 'Sapateira de 5 andares organizadora para sapatos em plástico resistente preto';
        const selection = selectCleanDVideoFacts(shortContext);
        assert.match(selection.primaryProductName, /Sapateira/i);
        assert.ok(selection.videoRelevantFacts.length > 0);
        assert.strictEqual(selection.ignoredMetadata.length, 0);
    });

    // 11. Clean D Lab still returns valid brief and prompt for normal inputs
    it('11. builds structured brief and formatted prompt for normal inputs', () => {
        const normalContext = 'Fone de ouvido bluetooth sem fio com cancelamento de ruído e bateria de 24 horas';
        const brief = buildCleanProductBrief(normalContext);
        assert.match(brief.productName, /Fone/i);
        assert.ok(brief.confirmedFeatures.length > 0);

        const prompt = buildCleanDInitialPrompt(brief, 'D');
        assert.ok(prompt.includes('Fone'));
        assert.ok(prompt.includes('PRODUCT FACT SELECTION LOCK:'));
    });
});
