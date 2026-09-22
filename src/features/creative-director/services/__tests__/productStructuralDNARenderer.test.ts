import { strict as assert } from 'assert';
import {
  ProductStructuralDNA,
  createEmptyProductStructuralDNA,
  renderProductStructuralDNA,
  buildProductStructuralDNA
} from '../productGroundingService';
import {
  buildCompiledScene2Model,
  renderScene2Text
} from '../../compiler/promptCompiler';
import {
  buildCompiledScene3Model,
  renderScene3Text
} from '../../compiler/scene3PromptCompiler';
import {
  compileCommercePrompt
} from '../../../cinematic/commercePromptCompiler';

console.log('================================================================');
console.log('STARTING PHASE 2C: PRODUCT STRUCTURAL DNA RENDERER TEST SUITE');
console.log('================================================================');

// -----------------------------------------------------------------------------
// TEST A: Full DNA Completeness
// -----------------------------------------------------------------------------
console.log('▶ TEST A: Full DNA Completeness...');
const fullDna: ProductStructuralDNA = {
  category: 'Footwear',
  coreGeometry: {
    silhouette: 'cano baixo ergonômico',
    proportions: 'perfil aerodinâmico alongado',
    thicknessProfile: 'entressola espessa com base larga',
    edgeStyle: 'bordas biseladas suaves',
    cornerProfile: 'biqueira arredondada',
    symmetry: 'simetria bilateral padrão calçado',
    aspectRatio: 1.65
  },
  colors: {
    canonicalColor: 'azul marinho fosco',
    secondaryColors: ['branco neve', 'cinza chumbo'],
    accentColors: ['laranja neon']
  },
  materials: {
    primary: 'mesh respirável de alta densidade',
    secondary: ['borracha vulcanizada', 'poliuretano termoplástico (TPU)'],
    finish: 'fosco antirreflexo',
    texture: 'trama canelada tridimensional'
  },
  branding: {
    logos: [
      {
        id: 'logo-1',
        name: 'Emblema lateral estilizado',
        role: 'branding',
        position: 'painel lateral externo',
        visible: true,
        confidence: 0.95,
        relationshipToOtherParts: ['alinhado ao meio da entressola']
      }
    ],
    visibleText: [
      {
        id: 'text-1',
        name: 'PRO RUNNER 2000',
        role: 'branding',
        position: 'calcanhar traseiro',
        visible: true,
        confidence: 0.9
      }
    ],
    labels: [
      {
        id: 'label-1',
        name: 'GEL CUSHIONING',
        role: 'branding',
        position: 'borda da sola',
        visible: true,
        confidence: 0.85
      }
    ]
  },
  fixedComponents: [
    {
      id: 'fixed-1',
      name: 'Solado de borracha tratorado',
      role: 'fixed',
      shape: 'ondulado com sulcos de tração',
      position: 'base inferior',
      relativeSize: '100% do comprimento da base',
      material: 'borracha vulcanizada',
      color: 'preto e laranja',
      relationshipToOtherParts: ['fusionado diretamente com a entressola de EVA'],
      confidence: 0.95,
      visible: true
    },
    {
      id: 'fixed-2',
      name: 'Placa estabilizadora de TPU',
      role: 'fixed',
      shape: 'arco curvado',
      position: 'arco plantar medial',
      confidence: 0.9,
      visible: true
    }
  ],
  movableComponents: [
    {
      id: 'movable-1',
      name: 'Cadarço tubular ajustável',
      role: 'movable',
      shape: 'cordão cilíndrico trançado',
      position: 'peito do pé',
      relativeSize: 'passante por 6 pares de ilhoses',
      material: 'poliéster',
      color: 'azul marinho com detalhes refletivos',
      relationshipToOtherParts: ['entrelaçado pelos ilhoses reforçados na gáspea'],
      confidence: 0.92,
      visible: true
    }
  ],
  surfaceFeatures: [
    {
      id: 'surface-1',
      name: 'Costura reforçada dupla',
      role: 'surface',
      position: 'contraforte do calcanhar',
      confidence: 0.88,
      visible: true
    }
  ],
  confidence: {
    geometry: 0.95,
    colors: 0.98,
    materials: 0.92,
    branding: 0.95
  }
};

const renderedFull = renderProductStructuralDNA(fullDna);

assert.ok(renderedFull.includes('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION'), 'Must have header');
assert.ok(renderedFull.includes('ANTI-PRIOR OVERRIDE:'), 'Must have anti-prior override');
assert.ok(renderedFull.includes('CORE GEOMETRY:'), 'Must have core geometry');
assert.ok(renderedFull.includes('- silhouette: cano baixo ergonômico'), 'Must render silhouette');
assert.ok(renderedFull.includes('- proportions: perfil aerodinâmico alongado'), 'Must render proportions');
assert.ok(renderedFull.includes('- thickness profile: entressola espessa com base larga'), 'Must render thickness profile');
assert.ok(renderedFull.includes('- edge style: bordas biseladas suaves'), 'Must render edge style');
assert.ok(renderedFull.includes('- corner profile: biqueira arredondada'), 'Must render corner profile');
assert.ok(renderedFull.includes('- symmetry: simetria bilateral padrão calçado'), 'Must render symmetry');
assert.ok(renderedFull.includes('- aspect ratio: 1.65'), 'Must render aspect ratio');

assert.ok(renderedFull.includes('CANONICAL COLOR:'), 'Must have canonical color section');
assert.ok(renderedFull.includes('- canonical color: azul marinho fosco'), 'Must render canonical color');
assert.ok(renderedFull.includes('- secondary colors: branco neve, cinza chumbo'), 'Must render secondary colors');
assert.ok(renderedFull.includes('- accent colors: laranja neon'), 'Must render accent colors');

assert.ok(renderedFull.includes('MATERIALS:'), 'Must have materials section');
assert.ok(renderedFull.includes('- primary material: mesh respirável de alta densidade'), 'Must render primary material');
assert.ok(renderedFull.includes('- secondary materials: borracha vulcanizada, poliuretano termoplástico (TPU)'), 'Must render secondary materials');
assert.ok(renderedFull.includes('- finish: fosco antirreflexo'), 'Must render finish');
assert.ok(renderedFull.includes('- texture: trama canelada tridimensional'), 'Must render texture');

assert.ok(renderedFull.includes('FIXED COMPONENTS:'), 'Must have fixed components section');
assert.ok(renderedFull.includes('Solado de borracha tratorado'), 'Must render fixed component');
assert.ok(renderedFull.includes('(relationships: fusionado diretamente com a entressola de EVA)'), 'Must render relationship');

assert.ok(renderedFull.includes('MOVABLE COMPONENTS:'), 'Must have movable components section');
assert.ok(renderedFull.includes('Cadarço tubular ajustável'), 'Must render movable component');
assert.ok(renderedFull.includes('(relationships: entrelaçado pelos ilhoses reforçados na gáspea)'), 'Must render movable relationship');

assert.ok(renderedFull.includes('BRANDING:'), 'Must have branding section');
assert.ok(renderedFull.includes('- logo: Emblema lateral estilizado'), 'Must render logo');
assert.ok(renderedFull.includes('- visible text: "PRO RUNNER 2000"'), 'Must render visible text');
assert.ok(renderedFull.includes('- label: "GEL CUSHIONING"'), 'Must render label');

assert.ok(renderedFull.includes('SURFACE FEATURES:'), 'Must have surface features section');
assert.ok(renderedFull.includes('Costura reforçada dupla'), 'Must render surface feature');

assert.ok(renderedFull.includes('STRUCTURAL IDENTITY LOCK:'), 'Must have structural lock');
console.log('✅ TEST A PASSED');

// -----------------------------------------------------------------------------
// TEST B: Partial DNA (Only confirmed fields rendered)
// -----------------------------------------------------------------------------
console.log('▶ TEST B: Partial DNA (Zero empty sections)...');
const partialDna: ProductStructuralDNA = {
  coreGeometry: {
    silhouette: 'cilíndrico alongado',
    proportions: 'altura 3x diâmetro'
  },
  colors: {
    canonicalColor: 'âmbar translúcido'
  },
  materials: {},
  fixedComponents: [],
  movableComponents: [],
  surfaceFeatures: [],
  branding: {
    logos: [],
    visibleText: [],
    labels: []
  }
};

const renderedPartial = renderProductStructuralDNA(partialDna);

assert.ok(renderedPartial.includes('CORE GEOMETRY:'), 'Must have core geometry');
assert.ok(renderedPartial.includes('- silhouette: cilíndrico alongado'), 'Must have silhouette');
assert.ok(renderedPartial.includes('CANONICAL COLOR:'), 'Must have canonical color');
assert.ok(renderedPartial.includes('- canonical color: âmbar translúcido'), 'Must have color');

// Must NOT include absent sections
assert.ok(!renderedPartial.includes('MATERIALS:'), 'Must NOT have materials section');
assert.ok(!renderedPartial.includes('FIXED COMPONENTS:'), 'Must NOT have fixed components section');
assert.ok(!renderedPartial.includes('MOVABLE COMPONENTS:'), 'Must NOT have movable components section');
assert.ok(!renderedPartial.includes('BRANDING:'), 'Must NOT have branding section');
assert.ok(!renderedPartial.includes('SURFACE FEATURES:'), 'Must NOT have surface features section');
console.log('✅ TEST B PASSED');

// -----------------------------------------------------------------------------
// TEST C: Product without Branding
// -----------------------------------------------------------------------------
console.log('▶ TEST C: Product without Branding...');
const noBrandingDna: ProductStructuralDNA = {
  coreGeometry: {
    silhouette: 'retangular minimalista'
  },
  colors: {
    canonicalColor: 'preto fosco'
  },
  materials: {
    primary: 'alumínio anodizado'
  },
  fixedComponents: [
    {
      id: 'f-1',
      name: 'Moldura perimetral metálica',
      role: 'fixed',
      confidence: 0.9
    }
  ],
  movableComponents: [],
  surfaceFeatures: [],
  branding: {
    logos: [],
    visibleText: [],
    labels: []
  }
};

const renderedNoBranding = renderProductStructuralDNA(noBrandingDna);
assert.ok(!renderedNoBranding.includes('BRANDING:'), 'Must NOT contain BRANDING header');
assert.ok(!renderedNoBranding.includes('- logo:'), 'Must NOT contain logo lines');
assert.ok(renderedNoBranding.includes('FIXED COMPONENTS:'), 'Must contain FIXED COMPONENTS');
console.log('✅ TEST C PASSED');

// -----------------------------------------------------------------------------
// TEST D: Product without Movable Parts
// -----------------------------------------------------------------------------
console.log('▶ TEST D: Product without Movable Parts...');
const noMovableDna: ProductStructuralDNA = {
  coreGeometry: {
    silhouette: 'bloco cerâmico monolítico'
  },
  materials: {
    primary: 'cerâmica esmaltada'
  },
  fixedComponents: [
    {
      id: 'f-1',
      name: 'Corpo monolítico de cerâmica',
      role: 'fixed',
      confidence: 0.95
    }
  ],
  movableComponents: [],
  surfaceFeatures: [],
  branding: {}
};

const renderedNoMovable = renderProductStructuralDNA(noMovableDna);
assert.ok(!renderedNoMovable.includes('MOVABLE COMPONENTS:'), 'Must NOT contain MOVABLE COMPONENTS header');
assert.ok(renderedNoMovable.includes('FIXED COMPONENTS:'), 'Must contain FIXED COMPONENTS');
console.log('✅ TEST D PASSED');

// -----------------------------------------------------------------------------
// TEST E: UNKNOWN / Undefined Handling (Do not invent, omit empty)
// -----------------------------------------------------------------------------
console.log('▶ TEST E: UNKNOWN / Undefined Handling...');
const emptyDna = createEmptyProductStructuralDNA();
const renderedEmpty = renderProductStructuralDNA(emptyDna);
assert.equal(renderedEmpty, '', 'Empty DNA must render to empty string');

const nullDna = renderProductStructuralDNA(null);
assert.equal(nullDna, '', 'Null DNA must render to empty string');

const undefinedDna = renderProductStructuralDNA(undefined);
assert.equal(undefinedDna, '', 'Undefined DNA must render to empty string');

// Low confidence item filtering (< 0.5)
const lowConfDna: ProductStructuralDNA = {
  coreGeometry: {
    silhouette: 'oval'
  },
  fixedComponents: [
    {
      id: 'f-high',
      name: 'Base de apoio estável',
      role: 'fixed',
      confidence: 0.9
    },
    {
      id: 'f-low',
      name: 'Possível parafuso oculto',
      role: 'fixed',
      confidence: 0.3 // Should be omitted!
    }
  ],
  branding: {
    logos: [
      {
        id: 'logo-low',
        name: 'Invenção não confirmada',
        role: 'branding',
        confidence: 0.2 // Should be omitted!
      }
    ]
  }
};

const renderedLowConf = renderProductStructuralDNA(lowConfDna);
assert.ok(renderedLowConf.includes('Base de apoio estável'), 'High confidence component rendered');
assert.ok(!renderedLowConf.includes('Possível parafuso oculto'), 'Low confidence component omitted');
assert.ok(!renderedLowConf.includes('Invenção não confirmada'), 'Low confidence logo omitted');
assert.ok(!renderedLowConf.includes('BRANDING:'), 'Branding omitted when no high-confidence branding items exist');
console.log('✅ TEST E PASSED');

// -----------------------------------------------------------------------------
// TEST F: Universal Structural Identity Lock Verification
// -----------------------------------------------------------------------------
console.log('▶ TEST F: Universal Structural Identity Lock Verification...');
const testFDna: ProductStructuralDNA = {
  coreGeometry: { silhouette: 'esférico' },
  colors: { canonicalColor: 'vermelho carmim' }
};
const renderedF = renderProductStructuralDNA(testFDna);

assert.ok(renderedF.includes('STRUCTURAL IDENTITY LOCK:'), 'Lock header present');
assert.ok(renderedF.includes('The product must remain the same physical object throughout the entire shot.'), 'Core physical lock sentence present');
assert.ok(renderedF.includes('- component counts;'), 'Check count rule');
assert.ok(renderedF.includes('- component positions;'), 'Check position rule');
assert.ok(renderedF.includes('- component relative sizes;'), 'Check relative sizes rule');
assert.ok(renderedF.includes('- geometry;'), 'Check geometry rule');
assert.ok(renderedF.includes('- colors;'), 'Check colors rule');
assert.ok(renderedF.includes('- materials;'), 'Check materials rule');
assert.ok(renderedF.includes('- branding placement;'), 'Check branding rule');
assert.ok(renderedF.includes('- relationships between parts.'), 'Check relationships rule');

// Universal negatives:
assert.ok(renderedF.includes('NO component relocation'), 'Negative 1 present');
assert.ok(renderedF.includes('NO component-count changes'), 'Negative 2 present');
assert.ok(renderedF.includes('NO missing fixed components'), 'Negative 3 present');
assert.ok(renderedF.includes('NO extra components'), 'Negative 4 present');
assert.ok(renderedF.includes('NO geometry redesign'), 'Negative 5 present');
assert.ok(renderedF.includes('NO branding relocation'), 'Negative 6 present');
assert.ok(renderedF.includes('NO material substitution'), 'Negative 7 present');
assert.ok(renderedF.includes('NO color drift'), 'Negative 8 present');
assert.ok(renderedF.includes('NO structural morphing'), 'Negative 9 present');
assert.ok(renderedF.includes('NO product substitution'), 'Negative 10 present');
console.log('✅ TEST F PASSED');

// -----------------------------------------------------------------------------
// TEST G: Universal Anti-Prior Override Verification
// -----------------------------------------------------------------------------
console.log('▶ TEST G: Universal Anti-Prior Override Verification...');
assert.ok(renderedF.includes('ANTI-PRIOR OVERRIDE:'), 'Anti-Prior header present');
assert.ok(
  renderedF.includes('The uploaded reference geometry has priority over any pretrained expectation associated with the product name, brand, category or family.'),
  'Priority clause present'
);
assert.ok(
  renderedF.includes('Do not replace observed geometry with a generic, legacy, standard or more familiar design.'),
  'No replacement clause present'
);

// Count occurrences: must be exactly 1
const occurrences = (renderedF.match(/ANTI-PRIOR OVERRIDE:/g) || []).length;
assert.equal(occurrences, 1, 'Anti-Prior override must appear exactly once');
console.log('✅ TEST G PASSED');

// -----------------------------------------------------------------------------
// TEST H: Duplication Prevention & Multi-Pipeline Integration
// -----------------------------------------------------------------------------
console.log('▶ TEST H: Duplication Prevention & Pipeline Integration (Scene 2, Scene 3, Commerce)...');

// 1. Scene 2 Integration
const scene2Model = buildCompiledScene2Model({
  productIdentity: 'Relógio Cronógrafo Esportivo',
  productFacts: ['Caixa de aço inoxidável 42mm', 'Resistência a respingos'],
  productVisibleDetails: ['Mostrador preto', 'Três submostradores', 'Pulseira de silicone'],
  presenter: {
    gender: 'male',
    description: 'Homem atlético 30 anos'
  },
  wardrobe: {
    topType: 'Camiseta',
    topColor: 'Cinza',
    bottomType: 'Calça jeans',
    bottomColor: 'Azul',
    footwearType: 'Tênis',
    footwearColor: 'Preto'
  },
  environment: 'Academia moderna e iluminada',
  primaryBenefit: 'Acompanhe seu desempenho com precisão cronométrica',
  spokenCopy: 'Esse relógio mudou meu ritmo de treino!',
  actions: {
    action0to2: 'Olha para o relógio no pulso e sorri',
    action2to4: 'Aciona o botão do cronômetro com o polegar',
    action4to6: 'Mostra o mostrador em funcionamento para a câmera',
    action6to8: 'Ajusta a pulseira e fala diretamente com o espectador'
  },
  speechActionSync: [
    { phrase: 'mudou meu ritmo', action: 'Toca na lateral da caixa do relógio' }
  ],
  structuralDNA: fullDna
});

const scene2Prompt = renderScene2Text(scene2Model);
assert.ok(scene2Prompt.includes('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION'), 'Scene 2 must contain DNA');
const scene2DnaCount = (scene2Prompt.match(/PRODUCT STRUCTURAL DNA — STRICT PRESERVATION/g) || []).length;
assert.equal(scene2DnaCount, 1, 'Scene 2 DNA must appear exactly once');

// 2. Scene 3 Integration
const scene3Model = buildCompiledScene3Model({
  presenter: {
    identity: 'Homem atlético 30 anos',
    gender: 'male'
  },
  wardrobe: {
    description: 'Camiseta cinza e calça jeans'
  },
  product: {
    identity: 'Relógio Cronógrafo Esportivo',
    visibleDetails: ['Mostrador preto', 'Três submostradores'],
    knownPhysicalFacts: ['Caixa de aço inoxidável 42mm'],
    structuralDNA: fullDna
  },
  environment: 'Academia moderna',
  spokenCta: 'Clique no carrinho laranja abaixo e garanta o seu hoje mesmo!',
  actions: {
    action0to2: 'Apresentador segura o relógio na mão esquerda com mostrador voltado para a câmera',
    action2to4: 'Aponta o indicador direito em direção ao produto com entusiasmo',
    action4to6: 'Gesticula convidando o público a aproveitar a condição',
    action6to8: 'Mantém o produto em destaque enquanto conclui a fala com firmeza'
  },
  ctaGesture: 'Aponta para a parte inferior da tela enquanto exibe o relógio',
  speechActionSync: [
    { spokenSegment: 'carrinho laranja', physicalAction: 'Gesto de apontar para baixo' }
  ]
});

const scene3Prompt = renderScene3Text(scene3Model);
assert.ok(scene3Prompt.includes('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION'), 'Scene 3 must contain DNA');
const scene3DnaCount = (scene3Prompt.match(/PRODUCT STRUCTURAL DNA — STRICT PRESERVATION/g) || []).length;
assert.equal(scene3DnaCount, 1, 'Scene 3 DNA must appear exactly once');

// 3. Cinematic Commerce Integration
const commerceOutput = compileCommercePrompt({
  planOutput: {
    family: 'WEAR_DEMO',
    resolvedFamily: 'WEAR_DEMO',
    totalDurationSec: 15,
    targetBeats: 4,
    shots: [
      {
        shotNumber: 1,
        functionType: 'HERO_PRODUCT',
        informationGain: ['appearance', 'material'],
        stepName: 'Hero Reveal',
        camera: 'Smooth orbital macro',
        cameraComplexity: 'low',
        actionComplexity: 'static',
        targetDurationSec: 4,
        visualPromptEn: 'Macro shot of chronograph watch on slate surface',
        actionPromptEn: 'Camera glides smoothly around the watch bezel',
        handAction: 'No hands, pure hero product reveal',
        framing: 'Macro 45-degree',
        visualObjective: 'Establish luxury craftsmanship',
        dialoguePtBr: ''
      }
    ],
    cinematicShots: [],
    cameraGuidelines: ['Smooth macro slider tracking'],
    negativeGuidelines: []
  },
  visionData: {
    category: 'Watch',
    material: 'Stainless steel and sapphire glass',
    color: 'Deep black and silver',
    finish: 'Brushed metal',
    texture: 'Metallic',
    logo: 'Engraved dial crown',
    packaging: 'Premium presentation box',
    fixedParts: ['Case', 'Bezel', 'Dial', 'Subdials'],
    movingParts: ['Push buttons', 'Hands', 'Silicone strap'],
    structuralDNA: fullDna
  },
  productName: 'Relógio Cronógrafo Esportivo'
});

assert.ok(commerceOutput.formattedFullPrompt.includes('PRODUCT STRUCTURAL DNA — STRICT PRESERVATION'), 'Commerce prompt must contain DNA');
const commerceDnaCount = (commerceOutput.formattedFullPrompt.match(/PRODUCT STRUCTURAL DNA — STRICT PRESERVATION/g) || []).length;
assert.equal(commerceDnaCount, 1, 'Commerce DNA must appear exactly once');

console.log('✅ TEST H PASSED');

console.log('================================================================');
console.log('🎉 ALL 8 TESTS (A through H) PASSED WITH 100% SUCCESS!');
console.log('================================================================');
