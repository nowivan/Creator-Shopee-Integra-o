import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    resolveProductInfoAuthority,
    isGenericOrInsufficientTitle,
    isBundleTermAuthorized,
    selectCleanDVideoFacts,
    buildCleanProductBrief,
    BUNDLE_TERMS_LIST
} from '../brief';
import {
    buildCleanDInitialPrompt,
    buildCleanDComplementPrompt,
    buildCleanDReviewerPrompt,
    buildCleanDManualRepairPrompt,
    CLEAN_D_SENIOR_COPY_CONTRACT_TEXT,
    PRODUCT_INFO_SEMANTIC_AUTHORITY_LOCK_TEXT,
    IMAGE_FALLBACK_LOCK_TEXT
} from '../brain';

describe('Product Info Semantic Authority Fallback Hierarchy & Bundle Authorization', () => {

    // Test 1: Title/Description present with multi-item image (Activation service + Card + DVD)
    it('1. follows title product type and forbids kit/combo inference when title is clear but image has multiple items', () => {
        const result = resolveProductInfoAuthority({
            title: 'Gemini AI Pro - Ativação Direto em Conta - Cartão Físico DVD',
            description: 'Serviço de ativação com envio de cartão físico e mídia de instalação.',
            imageComponents: ['Cartão de ativação', 'Mídia DVD instaladora']
        });

        assert.strictEqual(result.selectedAuthoritySource, 'title');
        assert.ok(result.primaryProductName.includes('Gemini AI Pro'));
        assert.strictEqual(result.isBundleAuthorized, false);
        assert.strictEqual(result.authorizedBundleTerms.length, 0);
        assert.ok(result.compressedContext.includes('TERMOS DE CONJUNTO/KIT: PROIBIDOS'));
    });

    // Test 2: Generic Title with multi-item image (Produto premium + Card + DVD)
    it('2. detects generic title and falls back to image components with neutral multi-item description without kit claim', () => {
        const isGeneric = isGenericOrInsufficientTitle('Produto premium');
        assert.strictEqual(isGeneric, true);

        const result = resolveProductInfoAuthority({
            title: 'Produto premium',
            imageComponents: ['Cartão de ativação', 'Mídia DVD instaladora']
        });

        assert.strictEqual(result.selectedAuthoritySource, 'image_components');
        assert.strictEqual(result.isBundleAuthorized, false);
        assert.strictEqual(result.authorizedBundleTerms.length, 0);
        assert.ok(result.primaryProductName.includes('Cartão de ativação e Mídia DVD instaladora apresentados juntos') || result.primaryProductName.includes('apresentados juntos'));
        assert.ok(result.neutralDescription.includes('Componentes visíveis exibidos individualmente'));
        assert.ok(!result.compressedContext.includes('kit autorizado'));
    });

    // Test 3: Explicit bundle title authorizes kit/combo terms
    it('3. authorizes bundle terms only when explicitly present in title, description or user facts', () => {
        const titleAuthorized = isBundleTermAuthorized('Kit 2 Perfumes Importados Scuderia Ferrari Black + Red');
        assert.strictEqual(titleAuthorized, true);

        const result = resolveProductInfoAuthority({
            title: 'Kit 2 Perfumes Importados Scuderia Ferrari Black + Red',
            imageComponents: ['Ferrari Black 100ml', 'Ferrari Red 100ml']
        });

        assert.strictEqual(result.selectedAuthoritySource, 'title');
        assert.strictEqual(result.isBundleAuthorized, true);
        assert.ok(result.authorizedBundleTerms.includes('kit'));
        assert.ok(result.compressedContext.includes('TERMOS DE CONJUNTO/KIT AUTORIZADOS'));
    });

    // Test 4: Description priority over User Facts and Image Components
    it('4. resolves product identity from description when title is generic or insufficient', () => {
        const result = resolveProductInfoAuthority({
            title: 'Item',
            description: 'Sapateira Organizadora Modular 4 Andares em plástico reforçado',
            userFacts: ['Fácil de montar', 'Cor preta'],
            imageComponents: ['Prateleiras pretas', 'Tubos laterais']
        });

        assert.strictEqual(result.selectedAuthoritySource, 'description');
        assert.match(result.primaryProductName, /Sapateira/i);
    });

    // Test 5: User Facts priority when Title and Description are generic/missing
    it('5. resolves product identity from user-provided manual facts when title and description are missing', () => {
        const result = resolveProductInfoAuthority({
            title: 'Sem título',
            description: '',
            userFacts: ['Relógio Masculino Neo Sports Dourado', 'Resistência 5 ATM'],
            imageComponents: ['Relógio metálico dourado']
        });

        assert.strictEqual(result.selectedAuthoritySource, 'user_facts');
        assert.match(result.primaryProductName, /Relógio/i);
        assert.strictEqual(result.isBundleAuthorized, false);
    });

    // Test 6: Image Components fallback when all higher sources are absent
    it('6. falls back to image components safely when all text sources are absent or generic', () => {
        const result = resolveProductInfoAuthority({
            title: '',
            imageComponents: ['Escova Secadora e Alisadora 3 em 1']
        });

        assert.strictEqual(result.selectedAuthoritySource, 'image_components');
        assert.strictEqual(result.primaryProductName, 'Escova Secadora e Alisadora 3 em 1');
        assert.strictEqual(result.isBundleAuthorized, false);
    });

    // Test 7: Safe generic fallback when no information is available
    it('7. uses safe generic fallback when input is completely empty or unknown', () => {
        const result = resolveProductInfoAuthority({});
        assert.strictEqual(result.selectedAuthoritySource, 'generic_fallback');
        assert.strictEqual(result.primaryProductName, 'Produto em Destaque');
        assert.strictEqual(result.isBundleAuthorized, false);
    });

    // Test 8: Prompts include Product Info Semantic Authority Lock & Image Fallback Lock
    it('8. injects Semantic Authority Lock and Image Fallback Lock in all Clean D prompt pipelines', () => {
        const brief = buildCleanProductBrief({
            title: 'Gemini AI Pro - Ativação Direto em Conta - Cartão Físico DVD',
            imageComponents: ['Cartão físico', 'Mídia DVD']
        });

        const initialPrompt = buildCleanDInitialPrompt(brief, 'D');
        const complementPrompt = buildCleanDComplementPrompt(brief, [2, 3]);
        const reviewerPrompt = buildCleanDReviewerPrompt([], brief, 1);
        const repairPrompt = buildCleanDManualRepairPrompt({
            versionId: 1,
            scene: 'scene2',
            text: 'Texto',
            currentCharacterCount: 5,
            violations: ['SCENE_2_TOO_SHORT']
        }, brief);

        // Verify Initial Prompt
        assert.ok(initialPrompt.includes('PRODUCT INFO SEMANTIC AUTHORITY LOCK:'));
        assert.ok(initialPrompt.includes('IMAGE FALLBACK LOCK:'));

        // Verify Complement Prompt
        assert.ok(complementPrompt.includes('PRODUCT INFO SEMANTIC AUTHORITY LOCK:'));
        assert.ok(complementPrompt.includes('IMAGE FALLBACK LOCK:'));

        // Verify Reviewer Prompt
        assert.ok(reviewerPrompt.includes('PRODUCT INFO SEMANTIC AUTHORITY LOCK:'));
        assert.ok(reviewerPrompt.includes('IMAGE FALLBACK LOCK:'));

        // Verify Repair Prompt
        assert.ok(repairPrompt.includes('PRODUCT INFO SEMANTIC AUTHORITY LOCK:'));
        assert.ok(repairPrompt.includes('IMAGE FALLBACK LOCK:'));

        // Verify Senior Contract Text
        assert.ok(CLEAN_D_SENIOR_COPY_CONTRACT_TEXT.includes('PRODUCT INFO SEMANTIC AUTHORITY LOCK:'));
        assert.ok(CLEAN_D_SENIOR_COPY_CONTRACT_TEXT.includes('IMAGE FALLBACK LOCK:'));
    });
});
