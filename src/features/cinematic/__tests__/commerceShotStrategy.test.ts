import {
    planCommerceShots,
    resolveCategoryCommerceStrategy,
    resolveCommerceDemoFamily,
    calculateDurationPlan,
    sanitizeShotSequence,
    balanceCameraRule,
    COMMERCE_DEMO_FAMILIES,
    SHOT_FUNCTIONS_METADATA,
    CATEGORY_COMMERCE_STRATEGIES
} from '../commerceShotStrategy';
import { generateCinematicShots } from '../shotGenerator';
import { suggestCinematicScenes, CINEMATIC_LIBRARY } from '../cinematicLibrary';
import { buildProductMotionLock } from '../productMotionLockEngine';
import { ProductVisionData, CommerceDemoFamily } from '../types';

function runTestSuite() {
    console.log('--- STARTING CINEMATIC COMMERCE ENGINE V1 TESTS ---');
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

    const mockWatchVision: ProductVisionData = {
        category: 'relogio',
        material: 'aço inoxidável 316L escovado com cristal de safira',
        color: 'prata com mostrador preto fosco',
        texture: 'metálica escovada com ranhuras no bisel',
        finish: 'polido e escovado',
        logo: 'OurStart Chrono',
        packaging: 'estojo almofadado preto de couro com logo dourado',
        fixedParts: ['mostrador', 'bezel', 'cristal', 'coroa', 'logotipo'],
        movingParts: ['ponteiro dos segundos', 'fecho da pulseira'],
        rawVisionSummary: 'Luxury sports chronograph watch with stainless steel bracelet and black dial'
    };

    const mockPerfumeVision: ProductVisionData = {
        category: 'perfume',
        material: 'vidro pesado translúcido com tampa magnética em metal dourado',
        color: 'líquido âmbar dourado com frasco transparente',
        texture: 'vidro liso facetado e tampa metálica polida',
        finish: 'brilho espelhado e transparência de cristal',
        logo: 'Elegance No. 5',
        packaging: 'caixa rígida com berço aveludado',
        fixedParts: ['gargalo de vidro', 'frasco', 'rótulo em relevo'],
        movingParts: ['tampa magnética removível', 'acionador do spray'],
        rawVisionSummary: 'Luxury French perfume bottle with golden liquid and magnetic cap'
    };

    const mockElectronicsVision: ProductVisionData = {
        category: 'eletronicos',
        material: 'alumínio anodizado cinza espacial e polímero fosco',
        color: 'space gray',
        texture: 'metal acetinado',
        finish: 'matte premium',
        logo: 'TechFlow Earbuds',
        packaging: 'estojo de carregamento compacto',
        fixedParts: ['chassi', 'conectores magneticos'],
        movingParts: ['tampa do estojo'],
        rawVisionSummary: 'True wireless noise cancelling earbuds in space gray'
    };

    // TEST 1: Commerce Demo Family Selection & AUTO Resolution
    console.log('\n[TEST 1] Commerce Demo Family Selection & AUTO Resolution');
    {
        const watchStrategy = resolveCategoryCommerceStrategy(mockWatchVision, 'Chronograph Watch');
        assert(watchStrategy.normalizedCategory === 'watches', 'Watches category resolved correctly');
        
        const autoWatchFamily = resolveCommerceDemoFamily('AUTO', watchStrategy);
        assert(autoWatchFamily === 'WEAR_DEMO', 'Watches AUTO resolves to WEAR_DEMO');

        const explicitFamily = resolveCommerceDemoFamily('PREMIUM_STUDIO', watchStrategy);
        assert(explicitFamily === 'PREMIUM_STUDIO', 'Explicit family overrides default strategy');

        const perfumeStrategy = resolveCategoryCommerceStrategy(mockPerfumeVision, 'Parfum');
        assert(perfumeStrategy.normalizedCategory === 'perfume', 'Perfume category resolved correctly');
        const autoPerfumeFamily = resolveCommerceDemoFamily('AUTO', perfumeStrategy);
        assert(autoPerfumeFamily === 'PREMIUM_STUDIO', 'Perfume AUTO resolves to PREMIUM_STUDIO');

        const allFamilies: Array<Exclude<CommerceDemoFamily, 'AUTO'>> = [
            'UGC_POV_NATURAL', 'WEAR_DEMO', 'HAND_DEMO', 'MACRO_DETAIL',
            'UNBOXING', 'PREMIUM_STUDIO', 'LIFESTYLE', 'EDITORIAL_LOOKBOOK', 'HIGH_ENERGY_VIRAL'
        ];
        allFamilies.forEach(f => {
            assert(COMMERCE_DEMO_FAMILIES[f] !== undefined, `Family ${f} is registered in COMMERCE_DEMO_FAMILIES`);
        });
    }

    // TEST 2: Category-to-Shot-Function Mapping
    console.log('\n[TEST 2] Category-to-Shot-Function Mapping');
    {
        const watchPlan = planCommerceShots({
            visionData: mockWatchVision,
            durationSec: 10,
            productName: 'OurStart Chrono'
        });
        assert(watchPlan.shots.length === 5, '10s Watch plan has 5 beats');
        assert(watchPlan.shots[0].functionType === 'PRODUCT_HOOK', 'Watch shot 1 is PRODUCT_HOOK');
        assert(watchPlan.shots.some(s => s.functionType === 'WEAR_DEMO'), 'Watch plan contains WEAR_DEMO');
        assert(watchPlan.shots.some(s => s.functionType === 'CLASP_DETAIL' || s.functionType === 'TEXTURE_DETAIL'), 'Watch plan contains clasp/texture details');
        assert(!watchPlan.shots.some(s => s.functionType === 'APPLICATION'), 'Watch plan strictly forbids APPLICATION function');

        const perfumePlan = planCommerceShots({
            visionData: mockPerfumeVision,
            durationSec: 15,
            productName: 'Elegance No. 5'
        });
        assert(perfumePlan.shots.length === 6, '15s Perfume plan has 6 beats');
        assert(perfumePlan.shots.some(s => s.functionType === 'APPLICATION'), 'Perfume plan includes APPLICATION (spray/mist)');
        assert(perfumePlan.shots.some(s => s.functionType === 'OPEN_CLOSE'), 'Perfume plan includes OPEN_CLOSE (cap)');
        assert(!perfumePlan.shots.some(s => s.functionType === 'WEAR_DEMO'), 'Perfume plan strictly forbids WEAR_DEMO');
    }

    // TEST 3: Duration & Beat Planning (8s / 10s / 15s)
    console.log('\n[TEST 3] Duration & Beat Planning (8s / 10s / 15s)');
    {
        const p8 = calculateDurationPlan(8);
        assert(p8.targetBeats === 4, '8s duration produces 4 beats');
        const sum8 = p8.durations.reduce((a, b) => a + b, 0);
        assert(Math.abs(sum8 - 8) < 0.1, '8s duration beats sum exactly to 8s');

        const p10 = calculateDurationPlan(10);
        assert(p10.targetBeats === 5, '10s duration produces 5 beats');
        const sum10 = p10.durations.reduce((a, b) => a + b, 0);
        assert(Math.abs(sum10 - 10) < 0.1, '10s duration beats sum exactly to 10s');

        const p15 = calculateDurationPlan(15);
        assert(p15.targetBeats === 6, '15s duration produces 6 beats');
        const sum15 = p15.durations.reduce((a, b) => a + b, 0);
        assert(Math.abs(sum15 - 15) < 0.1, '15s duration beats sum exactly to 15s');
    }

    // TEST 4: No Consecutive Redundant Commercial Functions
    console.log('\n[TEST 4] No Consecutive Redundant Commercial Functions');
    {
        const rawDuplicateSequence = ['PRODUCT_HOOK', 'PRODUCT_HOOK', 'WEAR_DEMO', 'WEAR_DEMO', 'FINAL_HERO'] as any;
        const sanitized = sanitizeShotSequence(rawDuplicateSequence, []);
        assert(sanitized.length === 3, 'Consecutive identical functions removed');
        assert(sanitized[0] === 'PRODUCT_HOOK' && sanitized[1] === 'WEAR_DEMO' && sanitized[2] === 'FINAL_HERO', 'Clean sequential order preserved');

        const planOutput = planCommerceShots({
            visionData: mockElectronicsVision,
            durationSec: 15
        });
        for (let i = 1; i < planOutput.shots.length; i++) {
            assert(planOutput.shots[i].functionType !== planOutput.shots[i - 1].functionType, `No consecutive duplicate at shot ${i + 1}`);
        }
    }

    // TEST 5: Camera Complexity Balancing & 360 Orbit Permission
    console.log('\n[TEST 5] Camera Complexity Balancing & 360 Orbit Permission');
    {
        const heroMeta = SHOT_FUNCTIONS_METADATA.HERO_PRODUCT;
        const handMeta = SHOT_FUNCTIONS_METADATA.HAND_DEMO;
        const family = COMMERCE_DEMO_FAMILIES.PREMIUM_STUDIO;

        // Action complexity UP -> Camera complexity DOWN
        const handBalanced = balanceCameraRule(handMeta, family, 'none');
        assert(handBalanced.cameraComplexity === 'minimal', 'Complex hand manipulation enforces minimal camera movement');

        const heroBalanced = balanceCameraRule(heroMeta, family, 'none');
        assert(heroBalanced.cameraComplexity === 'moderate', 'Static hero shot allows moderate camera movement');

        // 360 Orbit explicitly allowed when requested
        const orbitBalanced = balanceCameraRule(heroMeta, family, '360_orbit');
        assert(orbitBalanced.cameraDescription.includes('360-degree orbital rotation'), '360 orbit rule respected when explicitly requested');
        assert(orbitBalanced.cameraDescription.includes('Object Lock 360°'), '360 orbit preserves Object Lock reference');
    }

    // TEST 6: Classic Cinematic Strategy Backward Compatibility
    console.log('\n[TEST 6] Classic Cinematic Strategy Backward Compatibility');
    {
        const classicLib = suggestCinematicScenes(mockWatchVision.category, mockWatchVision);
        assert(classicLib.categoryKey === 'relogio', 'Classic library suggests relogio category');
        assert(classicLib.defaultShots.length === 4, 'Classic library has 4 default shots for relogio');

        const classicShots = generateCinematicShots({
            visionData: mockWatchVision,
            productName: 'Classic Watch'
        });
        assert(classicShots.length === 4, 'Classic shot generator produces 4 shots unchanged');
        assert(classicShots[0].id.includes('relogio'), 'Classic shot ID structure preserved');
    }

    // TEST 7: Integration with Stability & Product Motion Lock Contracts
    console.log('\n[TEST 7] Stability & Product Motion Lock Integration Contracts');
    {
        const motionLock = buildProductMotionLock({
            enabled: true,
            mode: 'auto',
            category: mockWatchVision.category,
            productName: 'OurStart Chrono'
        });
        assert(motionLock.enabled === true, 'Product motion lock enabled');
        assert(motionLock.mode_used === 'watch_skeleton', 'Watch skeleton mode resolved automatically');
        assert(motionLock.flow_agent_instructions !== undefined, 'Flow agent instructions present');
        assert((motionLock.flow_agent_instructions?.forbidden_motion || []).length > 0, 'Forbidden motion preserved');
        assert((motionLock.flow_agent_instructions?.preserved_elements || []).length > 0, 'Preserved elements list intact');

        const commercePlan = planCommerceShots({
            visionData: mockWatchVision,
            durationSec: 10
        });
        assert(commercePlan.cinematicShots.length === 5, 'CinematicShot conversion produces standard interface array');
        assert(commercePlan.cinematicShots[0].actionPromptEn.length > 0, 'Action prompt correctly populated');
        assert(commercePlan.cinematicShots[0].dialoguePtBr.length > 0, 'Dialogue PT-BR correctly populated');
    }

    console.log(`\nTEST RESULTS: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        throw new Error(`${failed} tests failed!`);
    }
}

runTestSuite();
