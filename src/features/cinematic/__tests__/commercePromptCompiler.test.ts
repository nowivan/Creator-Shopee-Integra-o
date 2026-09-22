import {
    planCommerceShots
} from '../commerceShotStrategy';
import {
    compileCommercePrompt
} from '../commercePromptCompiler';
import {
    buildCommerceStabilityBundle,
    checkClaimSafetyInText
} from '../commerceStabilityContracts';
import {
    generateCinematicShots
} from '../shotGenerator';
import {
    composeCinematicPrompt
} from '../promptComposer';
import {
    buildMotionSuggestion
} from '../motionSuggestionEngine';
import { ProductVisionData } from '../types';

function runPhase2TestSuite() {
    console.log('--- STARTING CINEMATIC COMMERCE ENGINE V1: PHASE 2 TESTS ---');
    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, msg: string) {
        if (condition) {
            console.log(`  ✓ ${msg}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${msg}`);
            failed++;
        }
    }

    // MOCK DATASETS
    const jewelryVision: ProductVisionData = {
        category: 'joias',
        material: 'ouro 18k polido com diamante solitário cravejado',
        color: 'ouro amarelo e brilhante translúcido',
        texture: 'polida espelhada e lapidação brilhante',
        finish: 'alto brilho',
        logo: 'Aura Fine Jewels',
        packaging: 'estojo aveludado verde esmeralda',
        fixedParts: ['aro do anel', 'garras de fixação', 'diamante'],
        movingParts: [],
        rawVisionSummary: '18k yellow gold solitaire diamond ring in emerald velvet box'
    };

    const watchVision: ProductVisionData = {
        category: 'relogio',
        material: 'aço cirúrgico 316L com pulseira jubilee e safira antirreflexo',
        color: 'prata e azul marinho',
        texture: 'escovada e polida',
        finish: 'acetinado',
        logo: 'Nautilus Pro',
        packaging: 'caixa rígida de luxo',
        fixedParts: ['mostrador', 'bezel', 'cristal'],
        movingParts: ['fecho deployment', 'coroa rosqueada'],
        rawVisionSummary: 'Automatic diver watch with blue dial and steel jubilee bracelet'
    };

    const perfumeVision: ProductVisionData = {
        category: 'perfume',
        material: 'vidro âmbar pesado com válvula spray dourada e tampa magnética',
        color: 'âmbar dourado',
        texture: 'vidro lapidado e metal dourado',
        finish: 'brilhante',
        logo: 'Maison Noir Parfum',
        packaging: 'cartucho cartonado com relevo dourado',
        fixedParts: ['frasco', 'rótulo'],
        movingParts: ['tampa', 'atuador spray'],
        rawVisionSummary: 'Luxury French eau de parfum with amber liquid and magnetic cap'
    };

    const footwearVision: ProductVisionData = {
        category: 'calcados',
        material: 'couro legítimo nobuck e solado de borracha vulcanizada',
        color: 'marrom conhaque e sola bege',
        texture: 'couro aveludado e entressola texturizada',
        finish: 'nobuck fosco',
        logo: 'Stride Craft',
        packaging: 'caixa kraft com seda protetora',
        fixedParts: ['cabedal', 'entressola', 'solado'],
        movingParts: ['cadarços de algodão'],
        rawVisionSummary: 'Handcrafted leather sneakers in cognac brown'
    };

    const homeOrgVision: ProductVisionData = {
        category: 'organizacao',
        material: 'acrílico cristal transparente ultra-resistente e puxadores de metal',
        color: 'transparente cristalino',
        texture: 'acrílico liso e metal fosco',
        finish: 'transparente brilhante',
        logo: 'ClearSpace Org',
        packaging: 'embalagem protegida com cantoneiras',
        fixedParts: ['estrutura externa', 'trilhos'],
        movingParts: ['gavetas deslizantes', 'tampa articulada'],
        rawVisionSummary: 'Modular clear acrylic 3-drawer desktop organizer'
    };

    const electronicsVision: ProductVisionData = {
        category: 'eletronicos',
        material: 'policarbonato fosco e almofadas de espuma com memória',
        color: 'grafite fosco',
        texture: 'emborrachado suave',
        finish: 'matte',
        logo: 'SonicPro NC',
        packaging: 'estojo rígido com zíper',
        fixedParts: ['conchas acústicas', 'botoes de comando'],
        movingParts: ['haste dobrável', 'controle deslizante'],
        rawVisionSummary: 'Over-ear wireless noise cancelling headphones'
    };

    // TEST 1: Reference Authority Contract
    console.log('\n[TEST 1] Reference Authority Contract (VISUAL_SOURCE_OF_TRUTH)');
    {
        const plan = planCommerceShots({ visionData: jewelryVision, durationSec: 10, productName: 'Anel Solitário Ouro 18k' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: jewelryVision,
            productName: 'Anel Solitário Ouro 18k'
        });

        assert(compiled.rawSections.referenceAuthority.includes('REFERENCE_IMAGE = VISUAL_SOURCE_OF_TRUTH'), 'Explicit Reference Authority header present');
        assert(compiled.rawSections.referenceAuthority.includes('ouro 18k polido com diamante solitário cravejado'), 'Material preserved in reference authority');
        assert(compiled.rawSections.referenceAuthority.includes('ouro amarelo e brilhante translúcido'), 'Color preserved in reference authority');
        assert(compiled.rawSections.referenceAuthority.includes('Aesthetic lighting, cinematic depth of field, or artistic stylization MUST NEVER override'), 'Aesthetic override prohibition present');
    }

    // TEST 2: Object Count Persistence Contract
    console.log('\n[TEST 2] Object Count Persistence Contract');
    {
        const bundle1 = buildCommerceStabilityBundle({
            visionData: perfumeVision,
            shots: [],
            productName: 'Frasco de Perfume',
            frameZeroConfig: { declaredQuantity: 1 }
        });
        assert(bundle1.objectCountPersistence.includes('Exactly 1 (single unit)'), 'Single unit persistence verified');
        assert(bundle1.objectCountPersistence.includes('Strict prohibition on spontaneous item duplication'), 'Duplication prohibition verified');

        const bundle2 = buildCommerceStabilityBundle({
            visionData: footwearVision,
            shots: [],
            productName: 'Par de Tênis Stride Craft',
            frameZeroConfig: { declaredQuantity: 2 }
        });
        assert(bundle2.objectCountPersistence.includes('Exactly 2 (2 units (exact count))'), 'Multi-unit count persistence verified');
    }

    // TEST 3: Realistic Scale Lock
    console.log('\n[TEST 3] Realistic Scale Lock');
    {
        const bundle = buildCommerceStabilityBundle({
            visionData: watchVision,
            shots: [],
            productName: 'Relógio Nautilus Pro'
        });
        assert(bundle.realisticScaleLock.includes('REALISTIC SCALE LOCK'), 'Realistic scale lock present');
        assert(bundle.realisticScaleLock.includes('human hands (finger width, palm ratio)'), 'Scale relative to hands verified');
        assert(bundle.realisticScaleLock.includes('human body (wrist, torso, neck)'), 'Scale relative to body verified');
    }

    // TEST 4: Frame-to-Frame Identity Lock & 360° Hidden-Surface Rule
    console.log('\n[TEST 4] Frame-to-Frame Identity Lock & 360° Conservative Inference');
    {
        const plan360 = planCommerceShots({
            visionData: electronicsVision,
            durationSec: 10,
            productName: 'Headphone SonicPro',
            requestedOrbitMode: '360_orbit'
        });
        const compiled360 = compileCommercePrompt({
            planOutput: plan360,
            visionData: electronicsVision,
            productName: 'Headphone SonicPro',
            requestedOrbitMode: '360_orbit'
        });

        assert(compiled360.rawSections.stateAndInteractionContinuity.includes('THE PRODUCT MUST REMAIN IDENTICAL AND PHYSICALLY STABLE'), 'Frame-to-frame stability statement present');
        assert(compiled360.rawSections.stateAndInteractionContinuity.includes('CAMERA FREEDOM MUST NEVER CREATE PRODUCT DESIGN FREEDOM'), 'Camera freedom boundary statement present');
        assert(compiled360.rawSections.stateAndInteractionContinuity.includes('unseen reverse/side surfaces must be inferred conservatively'), 'Conservative unseen geometry inference rule verified');
        assert(compiled360.rawSections.camera.includes('Object Lock 360° is ACTIVE'), 'Object Lock 360° active in camera section');
    }

    // TEST 5: State Continuity & Physical Manipulation Sequences
    console.log('\n[TEST 5] State Continuity Law');
    {
        const perfumePlan = planCommerceShots({ visionData: perfumeVision, durationSec: 15, productName: 'Maison Noir Parfum' });
        const compiled = compileCommercePrompt({
            planOutput: perfumePlan,
            visionData: perfumeVision,
            productName: 'Maison Noir Parfum'
        });

        assert(compiled.rawSections.stateAndInteractionContinuity.includes('STATE CONTINUITY LAW: Every product state transformation must follow: INITIAL_STATE -> ACTION -> PHYSICALLY_VALID_STATE_CHANGE -> RESULT'), 'State continuity law present');
        assert(compiled.rawSections.stateAndInteractionContinuity.includes('OPEN_CLOSE'), 'OPEN_CLOSE specific continuity step verified');
        assert(compiled.rawSections.stateAndInteractionContinuity.includes('APPLICATION'), 'APPLICATION specific continuity step verified');
    }

    // TEST 6: Interaction Validity & Action Complexity Balancing
    console.log('\n[TEST 6] Interaction Validity & Action Complexity Balancing');
    {
        const homePlan = planCommerceShots({ visionData: homeOrgVision, durationSec: 10, productName: 'Organizador Acrílico' });
        const compiled = compileCommercePrompt({
            planOutput: homePlan,
            visionData: homeOrgVision,
            productName: 'Organizador Acrílico'
        });

        assert(compiled.rawSections.stateAndInteractionContinuity.includes('INTERACTION VALIDITY'), 'Interaction validity header verified');
        assert(compiled.rawSections.stateAndInteractionContinuity.includes('5 distinct fingers per hand'), 'Anatomical finger rule verified');
        assert(compiled.rawSections.stateAndInteractionContinuity.includes('ACTION COMPLEXITY BALANCING'), 'Action complexity balancing present');
    }

    // TEST 7: Structured Negative Lock (All 7 Categories)
    console.log('\n[TEST 7] Structured Negative Lock (7 Categories)');
    {
        const plan = planCommerceShots({ visionData: watchVision, durationSec: 10 });
        const compiled = compileCommercePrompt({ planOutput: plan, visionData: watchVision });

        const neg = compiled.stabilityBundle.structuredNegativeLock;
        assert(neg.productIdentity.length > 0, 'PRODUCT IDENTITY negative rules present');
        assert(neg.objectGeometry.length > 0, 'OBJECT GEOMETRY negative rules present');
        assert(neg.temporalContinuity.length > 0, 'TEMPORAL CONTINUITY negative rules present');
        assert(neg.handInteraction.length > 0, 'HAND INTERACTION negative rules present');
        assert(neg.camera.length > 0, 'CAMERA negative rules present');
        assert(neg.textAndLogo.length > 0, 'TEXT & LOGO negative rules present');
        assert(neg.scene.length > 0, 'SCENE negative rules present');

        assert(compiled.rawSections.structuredNegativeLock.includes('PRODUCT IDENTITY:'), 'PRODUCT IDENTITY section formatted');
        assert(compiled.rawSections.structuredNegativeLock.includes('OBJECT GEOMETRY:'), 'OBJECT GEOMETRY section formatted');
        assert(compiled.rawSections.structuredNegativeLock.includes('TEMPORAL CONTINUITY:'), 'TEMPORAL CONTINUITY section formatted');
        assert(compiled.rawSections.structuredNegativeLock.includes('HAND INTERACTION:'), 'HAND INTERACTION section formatted');
        assert(compiled.rawSections.structuredNegativeLock.includes('CAMERA:'), 'CAMERA section formatted');
        assert(compiled.rawSections.structuredNegativeLock.includes('TEXT & LOGOS:'), 'TEXT & LOGOS section formatted');
        assert(compiled.rawSections.structuredNegativeLock.includes('SCENE & LIGHTING:'), 'SCENE & LIGHTING section formatted');
    }

    // TEST 8: Claim Safety Contract
    console.log('\n[TEST 8] Claim Safety Contract');
    {
        const safeText = 'Polished gold finish with engraved emblem and visible satin texture';
        const unsafeText = '100% waterproof unbreakable product with guaranteed durability and 50% off discount';

        const checkSafe = checkClaimSafetyInText(safeText);
        const checkUnsafe = checkClaimSafetyInText(unsafeText);

        assert(checkSafe.safe === true && checkSafe.flaggedTerms.length === 0, 'Observable descriptions pass claim safety check');
        assert(checkUnsafe.safe === false && checkUnsafe.flaggedTerms.length >= 3, 'Unverified claims (waterproof, unbreakable, durability, discount) flagged');
    }

    // TEST 9: Prompt Section Order (1 to 13 Exact Hierarchy)
    console.log('\n[TEST 9] Prompt Section Order (1 to 13 Exact Hierarchy)');
    {
        const plan = planCommerceShots({ visionData: jewelryVision, durationSec: 10, productName: 'Anel Solitário' });
        const compiled = compileCommercePrompt({ planOutput: plan, visionData: jewelryVision, productName: 'Anel Solitário' });
        const prompt = compiled.formattedFullPrompt;

        const expectedSections = [
            '[1. FORMAT & SPECIFICATION]',
            '[2. REFERENCE AUTHORITY]',
            '[3. PRODUCT IDENTITY & OBJECT LOCK]',
            '[4. FRAME ZERO (T=0s INITIAL STATE)]',
            '[5. ENVIRONMENT & SURFACE CONTEXT]',
            '[6. COMMERCE DEMO FAMILY]',
            '[7. SHOT & ACTION PLAN',
            '[8. CAMERA DIRECTIVES & COMPLEXITY BALANCING]',
            '[9. LIGHTING & ATMOSPHERE]',
            '[10. PACING & TRANSITIONS]',
            '[11. AUDIO & VOICE DIRECTIVES]',
            '[12. STATE & INTERACTION CONTINUITY]',
            '[13. STRUCTURED NEGATIVE LOCK]'
        ];

        let lastIndex = -1;
        let orderValid = true;
        for (const sec of expectedSections) {
            const idx = prompt.indexOf(sec);
            if (idx === -1 || idx < lastIndex) {
                orderValid = false;
                console.error(`Section order failed at: ${sec}`);
                break;
            }
            lastIndex = idx;
        }

        assert(orderValid, 'All 13 prompt sections appear in exact sequential order');
    }

    // TEST 10: Audio Defaults (Voiceover OFF, Dialogue NONE, Lip Sync OFF)
    console.log('\n[TEST 10] Audio Defaults');
    {
        const plan = planCommerceShots({ visionData: electronicsVision, durationSec: 10 });
        const compiled = compileCommercePrompt({ planOutput: plan, visionData: electronicsVision });

        assert(compiled.rawSections.audio.includes('Voiceover: OFF'), 'Voiceover is OFF');
        assert(compiled.rawSections.audio.includes('Spoken Dialogue: NONE'), 'Dialogue is NONE');
        assert(compiled.rawSections.audio.includes('Lip-Sync Requirement: OFF'), 'Lip sync is OFF');
        assert(compiled.rawSections.audio.includes('commercial background beat'), 'Background music beat permitted');
    }

    // TEST 11: Multi-Category Representative Validation (6 Categories)
    console.log('\n[TEST 11] Multi-Category Representative Validation');
    {
        const categories = [
            { name: 'Jewelry', vision: jewelryVision },
            { name: 'Watches', vision: watchVision },
            { name: 'Perfume', vision: perfumeVision },
            { name: 'Footwear', vision: footwearVision },
            { name: 'Home Organization', vision: homeOrgVision },
            { name: 'Electronics', vision: electronicsVision }
        ];

        for (const cat of categories) {
            const plan = planCommerceShots({ visionData: cat.vision, durationSec: 10, productName: cat.name });
            const compiled = compileCommercePrompt({ planOutput: plan, visionData: cat.vision, productName: cat.name });
            assert(compiled.formattedFullPrompt.length > 500, `${cat.name} compiles complete comprehensive prompt`);
            assert(compiled.negativePromptCompiled.length > 100, `${cat.name} produces compiled negative prompt string`);
        }
    }

    // TEST 12: Strict Non-Regression of Legacy Cinematic Generation
    console.log('\n[TEST 12] Strict Non-Regression of Legacy Cinematic Generation');
    {
        const legacyShots = generateCinematicShots({
            visionData: watchVision,
            productName: 'Legacy Watch'
        });
        assert(legacyShots.length === 4, 'Legacy generateCinematicShots produces 4 shots');

        const motionSug = buildMotionSuggestion(watchVision, 'Legacy Watch');
        const legacyPromptOutput = composeCinematicPrompt({
            customProductName: 'Legacy Watch',
            style: 'commercial',
            shots: legacyShots,
            visionData: watchVision,
            motionSuggestion: motionSug
        });
        assert(legacyPromptOutput.finalPrompt.includes('PRODUTO: LEGACY WATCH'), 'Legacy prompt composer functions unchanged');
        assert(legacyPromptOutput.structuredOutput.blocks.length === 4, 'Legacy blocks length is 4');
    }

    console.log(`\nPHASE 2 TEST RESULTS: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        throw new Error(`${failed} tests failed!`);
    }
}

runPhase2TestSuite();
