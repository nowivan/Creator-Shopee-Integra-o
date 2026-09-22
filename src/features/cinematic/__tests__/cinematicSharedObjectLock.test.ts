import {
    planCommerceShots
} from '../commerceShotStrategy';
import {
    compileCommercePrompt
} from '../commercePromptCompiler';
import {
    composeCinematicPrompt
} from '../promptComposer';
import {
    generateCinematicShots
} from '../shotGenerator';
import {
    buildMotionSuggestion
} from '../motionSuggestionEngine';
import {
    ProductVisionData
} from '../types';
import {
    ProductStructuralDNA,
    ProductReferenceCoverage,
    ProductMotionSafety
} from '../../creative-director/types/compilerTypes';
import {
    buildProductStructuralDNA,
    resolveProductMotionSafety,
    resolveCameraModule,
    renderProductStructuralDNA,
    renderReferenceCoverageAndMotionSafety
} from '../../creative-director/services/productGroundingService';

function runSharedObjectLockTestSuite() {
    console.log('--- STARTING CINEMATIC ENGINE: UNIFIED OBJECT LOCK & STRUCTURAL IDENTITY SUITE ---');
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

    // SCENARIO 1: PRODUTO UNITÁRIO COMUM (SINGLE PHYSICAL OBJECT CONTINUITY)
    console.log('\n[SCENARIO 1] Common Single Unit: End-to-End Physical Object Lock');
    {
        const singleUnitDna: ProductStructuralDNA = {
            category: 'perfume',
            coreGeometry: {
                silhouette: 'cilíndrico',
                aspectRatio: 1.8
            },
            colors: {
                canonicalColor: 'Âmbar Dourado (#D4AF37)'
            },
            materials: {
                primary: 'vidro âmbar pesado',
                finish: 'polido brilhante'
            },
            fixedComponents: [
                { id: 'f1', role: 'fixed', name: 'frasco cilíndrico', position: 'base', shape: 'cilíndrico', confidence: 1.0 },
                { id: 'f2', role: 'fixed', name: 'rótulo dourado gravado', position: 'frontal', shape: 'retangular', confidence: 1.0 }
            ],
            movableComponents: [
                { id: 'm1', role: 'movable', name: 'tampa magnética', position: 'topo', shape: 'cilíndrico', confidence: 1.0 },
                { id: 'm2', role: 'movable', name: 'atuador spray metálico', position: 'sob a tampa', shape: 'cilíndrico', confidence: 1.0 }
            ],
            branding: {
                logos: [{ id: 'b1', role: 'branding', name: 'Maison Noir', confidence: 1.0 }]
            },
            isCommercialPackConfirmed: false
        };

        const perfumeVision: ProductVisionData = {
            category: 'perfume',
            material: 'vidro âmbar pesado',
            color: 'Âmbar Dourado (#D4AF37)',
            texture: 'polido',
            finish: 'brilhante',
            logo: 'Maison Noir',
            packaging: 'estojo premium',
            fixedParts: ['frasco cilíndrico', 'rótulo'],
            movingParts: ['tampa', 'atuador spray'],
            structuralDNA: singleUnitDna
        };

        const plan = planCommerceShots({ visionData: perfumeVision, durationSec: 10, productName: 'Perfume Maison Noir' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: perfumeVision,
            productName: 'Perfume Maison Noir',
            structuralDNA: singleUnitDna
        });

        const prompt = compiled.formattedFullPrompt;

        // Verify shared structural identity lock is present in prompt
        assert(prompt.includes('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION'), 'Structural DNA header present in Cinematic prompt');
        assert(prompt.includes('The product must remain the same physical object throughout the entire shot'), 'Same physical object temporal continuity rule active');
        assert(prompt.includes('NO component relocation'), 'NO component relocation constraint enforced');
        assert(prompt.includes('NO structural morphing'), 'NO structural morphing constraint enforced');
        assert(prompt.includes('NO product substitution'), 'NO product substitution constraint enforced');
        assert(prompt.includes('NO color drift'), 'NO color drift constraint enforced');
        assert(prompt.includes('NO extra components'), 'NO extra components constraint enforced for single unit');
    }

    // SCENARIO 2: KIT COMERCIAL CONFIRMADO (N-COMPONENTS KIT LOCK & NO ACCIDENTAL EXTRA OBJECT CLASSIFICATION)
    console.log('\n[SCENARIO 2] Commercial Pack / Kit: Preserves N Components Without Turning Into Single Unit');
    {
        const kitDna: ProductStructuralDNA = {
            category: 'cosmeticos',
            coreGeometry: {
                silhouette: 'cilíndrico'
            },
            colors: {
                canonicalColor: 'Rosa Floral e Pêssego'
            },
            materials: {
                primary: 'plástico PET translúcido com acabamento acetinado'
            },
            fixedComponents: [
                { id: 'k1', role: 'fixed', name: 'frasco 1', position: 'esquerda', shape: 'cilíndrico', confidence: 1.0 },
                { id: 'k2', role: 'fixed', name: 'frasco 2', position: 'centro', shape: 'cilíndrico', confidence: 1.0 },
                { id: 'k3', role: 'fixed', name: 'frasco 3', position: 'direita', shape: 'cilíndrico', confidence: 1.0 }
            ],
            isCommercialPackConfirmed: true,
            kitComponentCount: 3,
            handledComponentCount: 1,
            remainingVisibleComponentCount: 2
        };

        const kitVision: ProductVisionData = {
            category: 'cosmeticos',
            material: 'plástico PET translúcido',
            color: 'Rosa Floral e Pêssego',
            texture: 'acetinada',
            finish: 'translúcido',
            logo: 'Botanical Body Mist Kit',
            packaging: 'conjunto de 3 unidades',
            fixedParts: ['frasco 1', 'frasco 2', 'frasco 3'],
            movingParts: ['tampas'],
            structuralDNA: kitDna
        };

        const plan = planCommerceShots({ visionData: kitVision, durationSec: 10, productName: 'Kit 3 Body Splash' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: kitVision,
            productName: 'Kit 3 Body Splash',
            structuralDNA: kitDna
        });

        const prompt = compiled.formattedFullPrompt;

        // Kit-aware structural lock assertions
        assert(prompt.includes('This is one commercial kit containing exactly 3 confirmed physical components'), 'Kit count explicitly declared in Structural Identity Lock');
        assert(prompt.includes('All 3 components are legitimate parts of the advertised product and must remain preserved'), 'Kit components recognized as legitimate, not illegal extra objects');
        assert(prompt.includes('The presenter may actively handle 1 component at a time while the remaining 2 components stay visible on a nearby surface'), 'Kit handling rule (1 active, 2 visible) preserved');
        assert(prompt.includes('DO NOT remove any confirmed kit component'), 'Strict prohibition on removing confirmed kit components');
        assert(prompt.includes('NO unverified extra components'), 'Distinguishes confirmed kit components from unverified extra objects');
    }

    // SCENARIO 3: SMARTPHONE CATEGORY MODULE (CAMERA MODULE DNA & NO GENERIC PRIORS)
    console.log('\n[SCENARIO 3] Smartphone Camera Module: Exact Topology Preservation');
    {
        const phoneDna: ProductStructuralDNA = {
            category: 'smartphones',
            coreGeometry: {
                silhouette: 'retangular'
            },
            colors: {
                canonicalColor: 'Titanium Blue (#2A3439)'
            },
            materials: {
                primary: 'titânio aeroespacial e vidro fosco texturizado'
            },
            categoryModules: {
                cameraModule: {
                    type: 'cameraModule',
                    confidence: 0.98,
                    data: {
                        detected: true,
                        islandShape: 'rounded rectangle',
                        islandPosition: 'top-left of rear panel',
                        lensCount: 3,
                        lensTopology: 'triangular matrix arrangement',
                        lensScale: 'large sapphire rings with metal bezels',
                        flashPosition: 'top-right of camera island',
                        confidence: 0.98
                    }
                }
            },
            isCommercialPackConfirmed: false
        };

        const phoneVision: ProductVisionData = {
            category: 'smartphones',
            material: 'titânio aeroespacial',
            color: 'Titanium Blue (#2A3439)',
            texture: 'vidro fosco',
            finish: 'texturizado acetinado',
            logo: 'BrandFlagship Phone',
            packaging: 'caixa slim',
            fixedParts: ['chassi retangular', 'módulo de câmeras'],
            movingParts: [],
            structuralDNA: phoneDna
        };

        const plan = planCommerceShots({ visionData: phoneVision, durationSec: 10, productName: 'Smartphone Pro' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: phoneVision,
            productName: 'Smartphone Pro',
            structuralDNA: phoneDna
        });

        const prompt = compiled.formattedFullPrompt;

        assert(prompt.includes('CATEGORY MODULE — CAMERA:'), 'Category Module Camera rendered in Cinematic Engine');
        assert(prompt.includes('- island shape: rounded rectangle'), 'Island shape preserved');
        assert(prompt.includes('- lens count: 3'), 'Lens count strictly preserved');
        assert(prompt.includes('- lens topology: triangular matrix arrangement'), 'Lens topology arrangement preserved');
        assert(prompt.includes('CAMERA MODULE STRUCTURAL LOCK:'), 'Camera Module Structural Lock rendered');
        assert(prompt.includes('NO camera island redesign'), 'NO camera island redesign rule present');
        assert(prompt.includes('NO lens-count changes'), 'NO lens-count changes rule present');
        assert(prompt.includes('NO lens relocation'), 'NO lens relocation rule present');
        assert(prompt.includes('CAMERA ANTI-PRIOR OVERRIDE:'), 'Camera Anti-Prior Override active in Cinematic prompt');
    }

    // SCENARIO 4: CANONICAL COLOR LOCK (NO COLOR DRIFT)
    console.log('\n[SCENARIO 4] Canonical Color Lock: Hex Code & Drift Prevention');
    {
        const colorDna: ProductStructuralDNA = {
            category: 'calcados',
            colors: {
                canonicalColor: 'Deep Burgundy Wine (#5B0E2D)',
                accentColors: ['Brushed Gold (#D4AF37)']
            },
            materials: {
                primary: 'veludo italiano'
            },
            isCommercialPackConfirmed: false
        };

        const shoeVision: ProductVisionData = {
            category: 'calcados',
            material: 'veludo italiano',
            color: 'Deep Burgundy Wine (#5B0E2D)',
            texture: 'aveludada',
            finish: 'matte',
            logo: 'LuxeStep',
            packaging: 'caixa aveludada',
            fixedParts: ['cabedal', 'salto'],
            movingParts: [],
            structuralDNA: colorDna
        };

        const plan = planCommerceShots({ visionData: shoeVision, durationSec: 8, productName: 'Scarpin Luxe' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: shoeVision,
            productName: 'Scarpin Luxe',
            structuralDNA: colorDna
        });

        const prompt = compiled.formattedFullPrompt;

        assert(prompt.includes('CANONICAL COLOR:'), 'Canonical color section present');
        assert(prompt.includes('- canonical color: Deep Burgundy Wine (#5B0E2D)'), 'Canonical color with exact code preserved');
        assert(prompt.includes('- accent colors: Brushed Gold (#D4AF37)'), 'Accent color preserved');
        assert(prompt.includes('NO color drift'), 'NO color drift strictly enforced in identity lock');
    }

    // SCENARIO 5: GEOMETRY & FIXED COMPONENTS (NO REDESIGN, NO INVENTED PARTS)
    console.log('\n[SCENARIO 5] Geometry & Fixed Components: Strict Non-Invention');
    {
        const geoDna: ProductStructuralDNA = {
            category: 'relogios',
            coreGeometry: {
                silhouette: 'circular',
                aspectRatio: 1.0
            },
            fixedComponents: [
                { id: 'w1', role: 'fixed', name: 'caixa circular de aço 40mm', shape: 'circular', position: 'corpo central', confidence: 1.0 },
                { id: 'w2', role: 'fixed', name: 'mostrador esmaltado preto com numerais romanos', shape: 'disco', position: 'face frontal', confidence: 1.0 },
                { id: 'w3', role: 'fixed', name: 'cristal de safira curvo', shape: 'cúpula', position: 'topo frontal', confidence: 1.0 }
            ],
            movableComponents: [
                { id: 'wm1', role: 'movable', name: 'coroa de ajuste canelada', shape: 'cilíndrico', position: 'lateral 3 horas', confidence: 1.0 },
                { id: 'wm2', role: 'movable', name: 'fivela de fecho deployant', shape: 'articulado', position: 'pulseira', confidence: 1.0 }
            ],
            surfaceFeatures: [
                { id: 'ws1', role: 'surface', name: 'gravação guilloché no mostrador central', confidence: 1.0 }
            ]
        };

        const watchVision: ProductVisionData = {
            category: 'relogios',
            material: 'aço cirúrgico 316L',
            color: 'Prata e Preto',
            texture: 'polida e esmaltada',
            finish: 'espelhado',
            logo: 'Chronos Classic',
            packaging: 'estojo de madeira',
            fixedParts: ['caixa circular', 'mostrador esmaltado', 'cristal de safira'],
            movingParts: ['coroa', 'fecho deployant'],
            structuralDNA: geoDna
        };

        const plan = planCommerceShots({ visionData: watchVision, durationSec: 10, productName: 'Relógio Chronos' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: watchVision,
            productName: 'Relógio Chronos',
            structuralDNA: geoDna
        });

        const prompt = compiled.formattedFullPrompt;

        assert(prompt.includes('CORE GEOMETRY:'), 'Core Geometry rendered in prompt');
        assert(prompt.includes('- silhouette: circular'), 'Silhouette preserved');
        assert(prompt.includes('FIXED COMPONENTS:'), 'Fixed components section rendered');
        assert(prompt.includes('- caixa circular de aço 40mm'), 'Specific fixed part preserved');
        assert(prompt.includes('MOVABLE COMPONENTS:'), 'Movable components section rendered');
        assert(prompt.includes('- coroa de ajuste canelada'), 'Specific movable part preserved');
        assert(prompt.includes('SURFACE FEATURES:'), 'Surface features rendered');
        assert(prompt.includes('- gravação guilloché no mostrador central'), 'Guilloché surface feature locked');
        assert(prompt.includes('NO geometry redesign'), 'NO geometry redesign enforced');
        assert(prompt.includes('NO missing fixed components'), 'NO missing fixed components enforced');
    }

    // SCENARIO 6: ANTI-PRIOR OVERRIDE (REFERENCE GEOMETRY > PRETRAINED MODEL PRIOR)
    console.log('\n[SCENARIO 6] Anti-Prior Override: Visual Reference Trumps Pretrained Priors');
    {
        const antiPriorDna: ProductStructuralDNA = {
            category: 'fones de ouvido',
            coreGeometry: {
                silhouette: 'assimétrico poligonal'
            },
            colors: {
                canonicalColor: 'Verde Militar Fosco'
            },
            materials: {
                primary: 'cerâmica técnica fosca e couro vegano perfurado'
            }
        };

        const earphoneVision: ProductVisionData = {
            category: 'fones de ouvido',
            material: 'cerâmica técnica',
            color: 'Verde Militar Fosco',
            texture: 'fosca',
            finish: 'matte',
            logo: 'CustomAudio Lab',
            packaging: 'caixa metálica',
            fixedParts: ['conchas poligonais assimétricas'],
            movingParts: ['haste'],
            structuralDNA: antiPriorDna
        };

        const plan = planCommerceShots({ visionData: earphoneVision, durationSec: 10, productName: 'Headphone Custom' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: earphoneVision,
            productName: 'Headphone Custom',
            structuralDNA: antiPriorDna
        });

        const prompt = compiled.formattedFullPrompt;

        assert(prompt.includes('ANTI-PRIOR OVERRIDE:'), 'ANTI-PRIOR OVERRIDE section present');
        assert(prompt.includes('The uploaded reference geometry has priority over any pretrained expectation'), 'Explicit rule stating reference beats model priors');
        assert(prompt.includes('Do not replace observed geometry with a generic, legacy, standard or more familiar design'), 'Standard/generic replacement strictly forbidden');
    }

    // SCENARIO 7: MOTION SAFETY & REFERENCE COVERAGE (SAFE ANGLES & NO PROHIBITED FACE REVELATION)
    console.log('\n[SCENARIO 7] Reference Coverage & Motion Safety: Safe Angles & Conservative Inference');
    {
        const coverage: ProductReferenceCoverage = {
            front: 'confirmed',
            rear: 'unknown',
            leftSide: 'partial',
            rightSide: 'unknown',
            top: 'confirmed',
            bottom: 'unknown'
        };

        const motionSafety: ProductMotionSafety = resolveProductMotionSafety(coverage);

        const safeDna: ProductStructuralDNA = {
            category: 'cosmeticos',
            colors: { canonicalColor: 'Lavanda Suave' }
        };

        const safeVision: ProductVisionData = {
            category: 'cosmeticos',
            material: 'vidro fosco',
            color: 'Lavanda Suave',
            texture: 'fosco',
            finish: 'matte',
            logo: 'Lavender Serum',
            packaging: 'frasco conta-gotas',
            fixedParts: ['frasco'],
            movingParts: ['bulbo conta-gotas'],
            structuralDNA: safeDna,
            referenceCoverage: coverage,
            motionSafety: motionSafety
        };

        const plan = planCommerceShots({ visionData: safeVision, durationSec: 10, productName: 'Sérum Facial' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: safeVision,
            productName: 'Sérum Facial',
            structuralDNA: safeDna,
            referenceCoverage: coverage,
            motionSafety: motionSafety
        });

        const prompt = compiled.formattedFullPrompt;

        assert(prompt.includes('REFERENCE COVERAGE & MOTION SAFETY'), 'Reference Coverage & Motion Safety rendered in prompt');
        assert(prompt.includes('Confirmed views:'), 'Confirmed views list present');
        assert(prompt.includes('- front'), 'Front view confirmed');
        assert(prompt.includes('Unknown views:'), 'Unknown views list present');
        assert(prompt.includes('- rear'), 'Rear view marked unknown');
        assert(prompt.includes('Movement constraints:'), 'Movement constraints present');
        assert(prompt.includes('keep product front-biased'), 'Front-biased rotation constraint present');
        assert(prompt.includes('do not reveal unknown faces'), 'Prohibition on revealing unknown faces present');
        assert(prompt.includes('Different viewing angles must represent the same physical object, not a newly reconstructed version'), 'Multi-angle same physical object continuity constraint present');
    }

    // SCENARIO 8: PROMPT HIERARCHY & ORDER VERIFICATION
    console.log('\n[SCENARIO 8] Prompt Hierarchy: Identity & Structural DNA Appears Before Scene Directives');
    {
        const sampleDna: ProductStructuralDNA = {
            category: 'relogio',
            colors: { canonicalColor: 'Prata' }
        };
        const sampleVision: ProductVisionData = {
            category: 'relogio',
            material: 'aço',
            color: 'Prata',
            texture: 'polida',
            finish: 'brilhante',
            logo: 'TimeCraft',
            packaging: 'estojo',
            fixedParts: ['mostrador'],
            movingParts: ['pulseira'],
            structuralDNA: sampleDna
        };

        const plan = planCommerceShots({ visionData: sampleVision, durationSec: 10, productName: 'Relógio' });
        const compiled = compileCommercePrompt({
            planOutput: plan,
            visionData: sampleVision,
            productName: 'Relógio',
            structuralDNA: sampleDna
        });

        const prompt = compiled.formattedFullPrompt;

        const refAuthIdx = prompt.indexOf('[2. REFERENCE AUTHORITY]');
        const identityIdx = prompt.indexOf('[3. PRODUCT IDENTITY & OBJECT LOCK]');
        const structuralDnaIdx = prompt.indexOf('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION');
        const structuralLockIdx = prompt.indexOf('STRUCTURAL IDENTITY LOCK:');
        const frameZeroIdx = prompt.indexOf('[4. FRAME ZERO (T=0s INITIAL STATE)]');
        const shotPlanIdx = prompt.indexOf('[7. SHOT & ACTION PLAN');
        const cameraIdx = prompt.indexOf('[8. CAMERA DIRECTIVES & COMPLEXITY BALANCING]');
        const continuityIdx = prompt.indexOf('[12. STATE & INTERACTION CONTINUITY]');
        const negativeIdx = prompt.indexOf('[13. STRUCTURED NEGATIVE LOCK]');

        assert(refAuthIdx !== -1 && refAuthIdx < identityIdx, 'Reference Authority precedes Product Identity');
        assert(identityIdx !== -1 && identityIdx <= structuralDnaIdx, 'Product Identity section contains Structural DNA');
        assert(structuralDnaIdx !== -1 && structuralDnaIdx < structuralLockIdx, 'Structural DNA properties precede Structural Identity Lock');
        assert(structuralLockIdx !== -1 && structuralLockIdx < frameZeroIdx, 'Structural Identity Lock precedes Frame Zero');
        assert(frameZeroIdx !== -1 && frameZeroIdx < shotPlanIdx, 'Frame Zero precedes Shot Plan');
        assert(shotPlanIdx !== -1 && shotPlanIdx < cameraIdx, 'Shot Plan precedes Camera Directives');
        assert(cameraIdx !== -1 && cameraIdx < continuityIdx, 'Camera Directives precede Interaction Continuity');
        assert(continuityIdx !== -1 && continuityIdx < negativeIdx, 'Interaction Continuity precedes Structured Negatives');
    }

    console.log(`\nUNIFIED OBJECT LOCK TEST RESULTS: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        throw new Error(`${failed} tests failed!`);
    }
}

runSharedObjectLockTestSuite();
