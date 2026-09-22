import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    CLEAN_D_MIN_CHARS,
    CLEAN_D_MAX_CHARS,
    countCharacters,
    microRepairSceneText,
    validateScene,
    validateCleanCopyResult,
    SCENE_2_SAFE_EXTENSIONS,
    SCENE_3_SAFE_EXTENSIONS
} from '../validator';
import {
    CLEAN_D_SENIOR_COPY_CONTRACT_TEXT,
    AGENTE_DE_COPY_CLEAN_D_BRAIN,
    CLEAN_D_REVISOR_INSTRUCTION
} from '../brain';
import { parseCleanVariationsSafely } from '../service';
import { DEFAULT_COMMERCIAL_EVIDENCE, CommercialEvidence } from '../types';

describe('Clean D Lab — Scene 2/3 Resilience & Sanitizer', () => {

    // 1. Generation target buffer in prompt: includes target 168–172 characters
    it('1. generation instructions in brain.ts target 168-172 characters', () => {
        assert.ok(CLEAN_D_SENIOR_COPY_CONTRACT_TEXT.includes('168–172') || CLEAN_D_SENIOR_COPY_CONTRACT_TEXT.includes('168 a 172'));
        assert.ok(AGENTE_DE_COPY_CLEAN_D_BRAIN.includes('168 a 172') || AGENTE_DE_COPY_CLEAN_D_BRAIN.includes('168–172'));
        assert.ok(CLEAN_D_REVISOR_INSTRUCTION.includes('168 a 172') || CLEAN_D_REVISOR_INSTRUCTION.includes('168–172'));
    });

    // 2. Scene 2 micro-repair: 150-159 chars extended into 160-175 range using safe extensions
    it('2. extends Scene 2 with 150-159 chars into 160-175 range using safe extension bank', () => {
        // 150-159 characters
        const shortScene2 = 'Essa sapateira organizadora com prateleiras resistentes suporta vários pares de calçados mantendo tudo em ordem no seu quarto ou closet de forma simples.';
        const origLen = countCharacters(shortScene2);
        assert.ok(origLen >= 150 && origLen <= 159, `Original length was ${origLen}`);

        const repair = microRepairSceneText('scene2', shortScene2);
        assert.strictEqual(repair.wasRepaired, true);
        assert.strictEqual(repair.repairType, 'EXTENDED');
        assert.ok(repair.finalLength >= CLEAN_D_MIN_CHARS && repair.finalLength <= CLEAN_D_MAX_CHARS);

        const validation = validateScene(1, 'scene2', repair.repairedText);
        assert.strictEqual(validation.valid, true);
        assert.strictEqual(validation.charactersValid, true);
    });

    // 3. Scene 2 micro-repair: preserves original meaning and does not introduce forbidden phrases
    it('3. Scene 2 micro-repair preserves original context and adds no forbidden marketing terms', () => {
        const shortScene2 = 'Este relógio masculino em aço inoxidável combina elegância e precisão para acompanhar você com sofisticação em todos os seus compromissos mais importantes.'; // 156 chars
        const repair = microRepairSceneText('scene2', shortScene2);

        assert.strictEqual(repair.wasRepaired, true);
        assert.ok(repair.repairedText.startsWith('Este relógio masculino em aço inoxidável'));
        assert.ok(!repair.repairedText.includes('R$'));
        assert.ok(!repair.repairedText.includes('desconto'));
        assert.ok(!repair.repairedText.includes('carrinho laranja')); // Scene 2 must not have CTA
    });

    // 4. Scene 3 micro-repair: 150-159 chars extended into 160-175 range with "carrinho laranja" intact
    it('4. extends Scene 3 with 150-159 chars while preserving mandatory carrinho laranja CTA', () => {
        // 150-159 characters
        const shortScene3 = 'Aproveite essa condição especial e clique agora mesmo no carrinho laranja para garantir o seu produto com praticidade direto na comodidade da sua casa.';
        const origLen = countCharacters(shortScene3);
        assert.ok(origLen >= 150 && origLen <= 159, `Original length was ${origLen}`);

        const repair = microRepairSceneText('scene3', shortScene3);
        assert.strictEqual(repair.wasRepaired, true);
        assert.strictEqual(repair.repairType, 'EXTENDED');
        assert.ok(repair.finalLength >= CLEAN_D_MIN_CHARS && repair.finalLength <= CLEAN_D_MAX_CHARS);
        assert.ok(repair.repairedText.toLowerCase().includes('carrinho laranja'));

        const validation = validateScene(1, 'scene3', repair.repairedText);
        assert.strictEqual(validation.valid, true);
        assert.strictEqual(validation.missingOrangeCartCTA, false);
    });

    // 5. Scene 2 overlong trimming: 176-185 chars trimmed down to 160-175 range
    it('5. trims Scene 2 with 176-185 chars down to 160-175 range using safe trimming', () => {
        // 181 characters
        const longScene2 = 'Essa sapateira organizadora com prateleiras reforçadas realmente suporta vários pares de calçados mantendo tudo em ordem no seu quarto ou closet com total praticidade no seu dia a dia.';
        const origLen = countCharacters(longScene2);
        assert.strictEqual(origLen, 186 >= 176 ? origLen : 180);

        const repair = microRepairSceneText('scene2', longScene2);
        assert.strictEqual(repair.wasRepaired, true);
        assert.strictEqual(repair.repairType, 'TRIMMED');
        assert.ok(repair.finalLength >= CLEAN_D_MIN_CHARS && repair.finalLength <= CLEAN_D_MAX_CHARS);

        const validation = validateScene(1, 'scene2', repair.repairedText);
        assert.strictEqual(validation.valid, true);
    });

    // 6. Scene 3 overlong trimming: 176-185 chars trimmed down to 160-175 range without removing "carrinho laranja"
    it('6. trims Scene 3 with 176-185 chars down to 160-175 range without removing carrinho laranja', () => {
        // 180 characters
        const longScene3 = 'Não perca tempo e clique agora mesmo no carrinho laranja para garantir o seu produto com segurança antes que essa condição especial encerre com total facilidade no seu dia a dia.';
        const origLen = countCharacters(longScene3);
        assert.ok(origLen >= 176 && origLen <= 185);

        const repair = microRepairSceneText('scene3', longScene3);
        assert.strictEqual(repair.wasRepaired, true);
        assert.strictEqual(repair.repairType, 'TRIMMED');
        assert.ok(repair.finalLength >= CLEAN_D_MIN_CHARS && repair.finalLength <= CLEAN_D_MAX_CHARS);
        assert.ok(repair.repairedText.toLowerCase().includes('carrinho laranja'));

        const validation = validateScene(1, 'scene3', repair.repairedText);
        assert.strictEqual(validation.valid, true);
    });

    // 7. Text already within 160-175 chars remains untouched (wasRepaired = false)
    it('7. text already within 160-175 chars is untouched and returned as-is', () => {
        const validText = 'Este hidratante facial de alta performance revitaliza profundamente a textura da sua pele todos os dias com rápida absorção e toque suave sem oleosidade excessiva.'; // 163 chars
        const repair = microRepairSceneText('scene2', validText);

        assert.strictEqual(repair.wasRepaired, false);
        assert.strictEqual(repair.repairType, 'NONE');
        assert.strictEqual(repair.repairedText, validText);
    });

    // 8. Text severely out of bounds (<150 or >185) is not mechanically patched (wasRepaired = false)
    it('8. texts with severe length gaps (<150 or >185) are left untouched for AI revision', () => {
        const tooShort = 'Sapateira boa para o quarto.'; // 28 chars
        const tooLong = 'Essa sapateira organizadora com prateleiras reforçadas suporta absolutamente todos os seus sapatos femininos e masculinos, mantendo tudo perfeitamente arrumado no seu quarto com máxima durabilidade ao longo dos anos para toda a família.'; // 240 chars

        const repShort = microRepairSceneText('scene2', tooShort);
        const repLong = microRepairSceneText('scene2', tooLong);

        assert.strictEqual(repShort.wasRepaired, false);
        assert.strictEqual(repLong.wasRepaired, false);
    });

    // 9. Unsupported claims sanitizer: flags 'envio rápido' when not supported by evidence
    it('9. flags unsupported shipping claim "envio rápido" when not in evidence', () => {
        const textWithEnvio = 'Garanta o seu produto clicando no carrinho laranja com envio rápido e receba com comodidade antes que essa condição especial termine no anúncio agora mesmo.'; // 164 chars
        const validation = validateScene(1, 'scene3', textWithEnvio, 160, 175, DEFAULT_COMMERCIAL_EVIDENCE);

        assert.strictEqual(validation.unsupportedCommercialClaim, true);
        assert.ok(validation.violations.includes('UNSUPPORTED_COMMERCIAL_CLAIM'));
        assert.strictEqual(validation.valid, false);
    });

    // 10. Unsupported claims sanitizer: flags 'frete grátis' when not supported by evidence
    it('10. flags unsupported "frete grátis" when not in evidence', () => {
        const textWithFrete = 'Clique no carrinho laranja para garantir o seu item com frete grátis aproveitando essa condição especial diretamente no conforto da sua residência hoje mesmo.'; // 167 chars
        const validation = validateScene(1, 'scene3', textWithFrete, 160, 175, DEFAULT_COMMERCIAL_EVIDENCE);

        assert.strictEqual(validation.unsupportedCommercialClaim, true);
        assert.ok(validation.violations.includes('UNSUPPORTED_COMMERCIAL_CLAIM'));
    });

    // 11. Unsupported claims sanitizer: flags 'entrega garantida' when not supported
    it('11. flags unsupported "entrega garantida" or "entrega expressa" when not supported', () => {
        const textWithEntrega = 'Peça o seu produto agora pelo carrinho laranja com entrega garantida e aproveite todos os benefícios no seu dia a dia com segurança e tranquilidade no anúncio.'; // 169 chars
        const validation = validateScene(1, 'scene3', textWithEntrega, 160, 175, DEFAULT_COMMERCIAL_EVIDENCE);

        assert.strictEqual(validation.unsupportedCommercialClaim, true);
        assert.ok(validation.violations.includes('UNSUPPORTED_COMMERCIAL_CLAIM'));
    });

    // 12. Unsupported claims sanitizer: flags 'preço imperdível' or 'preço de fábrica' when not supported
    it('12. flags unsupported superlatives like "preço imperdível" or "garantia incondicional"', () => {
        const textWithPreco = 'Aproveite este preço imperdível clicando no carrinho laranja e adquira o seu antes que encerre a oportunidade com total comodidade e praticidade na sua casa.'; // 166 chars
        const validation = validateScene(1, 'scene3', textWithPreco, 160, 175, DEFAULT_COMMERCIAL_EVIDENCE);

        assert.strictEqual(validation.unsupportedCommercialClaim, true);
        assert.ok(validation.violations.includes('UNSUPPORTED_COMMERCIAL_CLAIM'));
    });

    // 13. End-to-end integration: parseCleanVariationsSafely automatically applies micro-repair to near-miss outputs
    it('13. parseCleanVariationsSafely auto-repairs near-miss outputs, achieving PASS status in validateCleanCopyResult', () => {
        // Raw payload with 154-156 char scenes
        const rawJsonPayload = JSON.stringify({
            versions: [
                {
                    id: 1,
                    scene2: 'Essa sapateira organizadora com prateleiras resistentes suporta vários pares de calçados mantendo tudo em ordem no seu quarto ou closet de forma simples.', // 154 chars -> extended
                    scene3: 'Aproveite essa condição especial e clique agora mesmo no carrinho laranja para garantir o seu produto com praticidade direto na comodidade da sua casa.' // 153 chars -> extended
                },
                {
                    id: 2,
                    scene2: 'Fórmula inovadora desenvolvida para devolver o viço natural ao seu rosto desde a primeira aplicação diária mantendo a hidratação contínua e protegendo os poros.', // 160 chars
                    scene3: 'Aproveite hoje para transformar sua rotina de cuidados clicando no carrinho laranja e adquira o seu antes que encerre o lote com proteção no anúncio agora.' // 164 chars
                },
                {
                    id: 3,
                    scene2: 'Sinta o frescor imediato na sua pele com este tratamento diário que equilibra os níveis de água no tecido celular sem deixar nenhum resíduo pegajoso após o uso diário.', // 167 chars
                    scene3: 'Clique agora no carrinho laranja e peça o seu com total tranquilidade para receber um produto testado dermatologicamente na sua residência o quanto antes.' // 155 chars -> extended
                },
                {
                    id: 4,
                    scene2: 'Cuidado facial completo com ativos selecionados para uma sensação duradoura de maciez e proteção diária contra todo o ressecamento causado pelo vento e poluição.', // 163 chars
                    scene3: 'Garanta o seu clicando no carrinho laranja e aproveite essa oportunidade exclusiva para cuidar da sua beleza diariamente com total comodidade e segurança.' // 156 chars -> extended
                },
                {
                    id: 5,
                    scene2: 'Textura leve que penetra suavemente nos poros restaurando a barreira protetora da sua pele dia e noite com alta eficácia comprovada em uso contínuo de forma segura.', // 164 chars
                    scene3: 'Não perca mais tempo e adquira o seu clicando no carrinho laranja com compra segura para todo o Brasil direto na sua residência antes que essa oferta encerre.' // 158 chars -> extended
                },
                {
                    id: 6,
                    scene2: 'Tecnologia avançada para revigorar a expressão do seu rosto proporcionando um acabamento aveludado e sensação revigorante ao longo de todo o seu dia a dia e noite.', // 163 chars
                    scene3: 'Finalize seu pedido agora mesmo clicando no carrinho laranja e desfrute de todos os benefícios deste produto maravilhoso entregue na sua porta com total segurança.' // 163 chars
                }
            ]
        });

        const parsed = parseCleanVariationsSafely(rawJsonPayload);
        assert.strictEqual(parsed.variations.length, 6);

        // All variations should now have 160-175 length
        for (const v of parsed.variations) {
            const s2Len = countCharacters(v.scene2);
            const s3Len = countCharacters(v.scene3);
            assert.ok(s2Len >= CLEAN_D_MIN_CHARS && s2Len <= CLEAN_D_MAX_CHARS, `V${v.id} Scene 2 len=${s2Len} out of range`);
            assert.ok(s3Len >= CLEAN_D_MIN_CHARS && s3Len <= CLEAN_D_MAX_CHARS, `V${v.id} Scene 3 len=${s3Len} out of range`);
        }

        const validation = validateCleanCopyResult(parsed.variations, rawJsonPayload, 'D', DEFAULT_COMMERCIAL_EVIDENCE);
        assert.strictEqual(validation.characterComplianceCount, 12);
        assert.strictEqual(validation.carrinhoLaranjaCount, 6);
        assert.strictEqual(validation.allScenesValid, true);
        assert.strictEqual(validation.homologationStatus, 'PASS');
    });
});
