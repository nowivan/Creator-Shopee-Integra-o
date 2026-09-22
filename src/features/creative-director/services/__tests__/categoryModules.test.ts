/**
 * PHASE 2D: CATEGORY MODULES & CAMERA MODULE PILOT TEST SUITE
 * 
 * Verifies:
 * TEST A: Smartphone with camera -> cameraModule created with detected features.
 * TEST B: Product without camera (Towels, Watch, Frying Pan) -> zero category modules.
 * TEST C: Multi-object -> cameraModule derives exclusively from the canonical unit.
 * TEST D: Confirmed lens count and topology -> preserved exactly without guessing.
 * TEST E: Unseen information -> strictly remains undefined (zero default category template fallbacks).
 * TEST F: Renderer includes CATEGORY MODULE — CAMERA only when present.
 * TEST G: Camera structural locks and anti-prior overrides do NOT appear on products without camera.
 * TEST H: Non-regression across all previous stages (1, 2A, 2B, 2C).
 */

import {
  buildProductStructuralDNA,
  renderProductStructuralDNA,
  resolveProductCategoryModules,
  resolveCameraModule
} from '../productGroundingService';
import {
  ProductStructuralDNA,
  ReferenceUnit,
  CameraModuleDNA,
  ProductCategoryModule
} from '../../types/compilerTypes';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
}

console.log('================================================================');
console.log('STARTING PHASE 2D: CATEGORY MODULES & CAMERA MODULE PILOT TESTS');
console.log('================================================================');

// -----------------------------------------------------------------------------
// TEST A: Smartphone with camera -> cameraModule created
// -----------------------------------------------------------------------------
console.log('▶ TEST A: Smartphone with camera produces cameraModule...');
{
  const dna = buildProductStructuralDNA({
    category: 'Smartphone',
    canonicalColor: 'Titânio Natural',
    observableDetails: [
      'Chassi retangular com cantos arredondados',
      'Módulo de câmera quadrado no canto superior esquerdo',
      'Câmera tripla com 3 lentes circulares em arranjo triangular',
      'Flash LED no canto superior direito do módulo',
      'Sensor LiDAR inferior',
      'Traseira em vidro fosco'
    ],
    observableMaterials: ['Titânio', 'Vidro'],
    visibleLabels: ['Logo minimalista na traseira']
  });

  assert(Boolean(dna.categoryModules?.cameraModule), 'Expected cameraModule to be created for smartphone with camera');
  const camMod = dna.categoryModules?.cameraModule as ProductCategoryModule<CameraModuleDNA>;
  assert(camMod.type === 'camera', 'Module type must be camera');
  assert(camMod.data.detected === true, 'Camera must be detected');
  assert(camMod.data.lensCount === 3, `Expected lensCount 3, got ${camMod.data.lensCount}`);
  assert(camMod.data.islandShape === 'quadrado', `Expected islandShape quadrado, got ${camMod.data.islandShape}`);
  assert(camMod.data.islandPosition === 'canto superior esquerdo', `Expected islandPosition canto superior esquerdo, got ${camMod.data.islandPosition}`);
  assert(camMod.data.lensTopology === 'arranjo triangular', `Expected arranjo triangular, got ${camMod.data.lensTopology}`);
  assert(camMod.data.flashPosition?.includes('canto superior direito do módulo') === true, 'Flash position matched');
  assert(Array.isArray(camMod.data.auxiliarySensorPositions), 'Sensor positions array exists');
  assert(camMod.data.auxiliarySensorPositions?.includes('sensor LiDAR') === true, 'Contains LiDAR sensor');
  console.log('✅ TEST A PASSED');
}

// -----------------------------------------------------------------------------
// TEST B: Product without camera -> zero category modules
// -----------------------------------------------------------------------------
console.log('▶ TEST B: Products without camera receive zero category modules...');
{
  // Towels
  const dnaTowels = buildProductStructuralDNA({
    category: 'Banho',
    canonicalColor: 'Azul Marinho',
    observableDetails: ['Tecido felpudo', 'Bordas duplas costuradas'],
    observableMaterials: ['Algodão']
  });
  assert(!dnaTowels.categoryModules?.cameraModule, 'Towels must not receive cameraModule');

  // Watch
  const dnaWatch = buildProductStructuralDNA({
    category: 'Relógios',
    canonicalColor: 'Prata',
    observableDetails: ['Caixa circular em aço', 'Mostrador analógico preto', 'Pulseira de couro'],
    observableMaterials: ['Aço inoxidável', 'Couro']
  });
  assert(!dnaWatch.categoryModules?.cameraModule, 'Watch must not receive cameraModule');

  // Cookware
  const dnaPan = buildProductStructuralDNA({
    category: 'Cozinha',
    canonicalColor: 'Cobre / Terracota',
    observableDetails: ['Frigideira circular', 'Cabo longo ergonômico em aço inoxidável'],
    observableMaterials: ['Cerâmica', 'Aço inoxidável']
  });
  assert(!dnaPan.categoryModules?.cameraModule, 'Pan must not receive cameraModule');

  console.log('✅ TEST B PASSED');
}

// -----------------------------------------------------------------------------
// TEST C: Multi-object -> cameraModule derives exclusively from canonical unit
// -----------------------------------------------------------------------------
console.log('▶ TEST C: Multi-object isolation (canonical unit authority)...');
{
  const canonicalUnit: ReferenceUnit = {
    id: 'unit-1',
    role: 'canonical',
    color: 'Preto Grafite',
    description: 'Smartphone principal com câmera dupla vertical no canto superior esquerdo'
  };

  const dna = buildProductStructuralDNA(
    {
      canonicalSelection: {
        canonicalReferenceUnit: canonicalUnit,
        canonicalColor: 'Preto Grafite',
        activeSceneQuantity: 1,
        referenceTotalUnitsVisible: 2,
        alternateReferenceUnits: [
          {
            id: 'unit-2',
            role: 'alternate_color',
            color: 'Branco',
            description: 'Smartphone secundário com câmera quádrupla e sensor lateral'
          }
        ]
      },
      observableDetails: [
        'Smartphone principal em acabamento fosco',
        'Outro modelo secundário ao fundo em branco com 4 lentes'
      ]
    },
    canonicalUnit
  );

  const camMod = dna.categoryModules?.cameraModule as ProductCategoryModule<CameraModuleDNA>;
  assert(Boolean(camMod), 'Camera module should exist for canonical smartphone unit');
  assert(camMod.data.lensCount === 2, `Expected 2 lenses from canonical unit, got ${camMod.data.lensCount}`);
  assert(camMod.data.lensTopology === 'disposição vertical em linha', 'Topology must match canonical unit');
  console.log('✅ TEST C PASSED');
}

// -----------------------------------------------------------------------------
// TEST D: Confirmed lens count and topology preserved
// -----------------------------------------------------------------------------
console.log('▶ TEST D: Confirmed lens count and topology preserved...');
{
  const dna = buildProductStructuralDNA({
    category: 'Eletrônicos',
    observableDetails: [
      'Dispositivo móvel com ilha de câmera circular centralizada no painel traseiro',
      '4 lentes em matriz 2x2 com lentes circulares proeminentes e anéis metálicos grossos'
    ]
  });

  const camMod = dna.categoryModules?.cameraModule as ProductCategoryModule<CameraModuleDNA>;
  assert(Boolean(camMod), 'Camera module detected');
  assert(camMod.data.lensCount === 4, `Expected 4 lenses, got ${camMod.data.lensCount}`);
  assert(camMod.data.islandShape === 'circular', `Expected circular shape, got ${camMod.data.islandShape}`);
  assert(camMod.data.islandPosition === 'centralizado no painel traseiro', `Expected centralizado no painel traseiro, got ${camMod.data.islandPosition}`);
  assert(camMod.data.lensTopology === 'matriz 2x2', `Expected matriz 2x2, got ${camMod.data.lensTopology}`);
  assert(camMod.data.lensScale === 'lentes circulares proeminentes', 'Lens scale preserved');
  console.log('✅ TEST D PASSED');
}

// -----------------------------------------------------------------------------
// TEST E: Unseen information strictly remains undefined
// -----------------------------------------------------------------------------
console.log('▶ TEST E: Unseen information strictly remains undefined...');
{
  const dna = buildProductStructuralDNA({
    category: 'Smartphone',
    observableDetails: [
      'Dispositivo retangular com câmera dupla traseira'
    ]
  });

  const camMod = dna.categoryModules?.cameraModule as ProductCategoryModule<CameraModuleDNA>;
  assert(Boolean(camMod), 'Camera module created');
  assert(camMod.data.lensCount === 2, 'Lens count is 2');
  assert(camMod.data.islandShape === undefined, 'islandShape must be undefined when not observed');
  assert(camMod.data.islandPosition === 'painel traseiro', 'Position is painel traseiro');
  assert(camMod.data.flashPosition === undefined, 'flashPosition must remain undefined');
  assert(camMod.data.auxiliarySensorPositions === undefined, 'auxiliarySensorPositions must remain undefined');
  assert(camMod.data.islandWidthRatio === undefined, 'islandWidthRatio must remain undefined');
  assert(camMod.data.islandHeightRatio === undefined, 'islandHeightRatio must remain undefined');
  console.log('✅ TEST E PASSED');
}

// -----------------------------------------------------------------------------
// TEST F: Renderer includes CATEGORY MODULE — CAMERA only when present
// -----------------------------------------------------------------------------
console.log('▶ TEST F: Renderer formatting with cameraModule...');
{
  const dna: ProductStructuralDNA = {
    category: 'Smartphone',
    coreGeometry: {
      silhouette: 'retangular',
      cornerProfile: 'cantos arredondados'
    },
    colors: {
      canonicalColor: 'Titânio Natural'
    },
    materials: {
      primary: 'Titânio'
    },
    categoryModules: {
      cameraModule: {
        type: 'camera',
        confidence: 0.95,
        data: {
          detected: true,
          islandShape: 'retangular com cantos arredondados',
          islandPosition: 'canto superior esquerdo',
          lensCount: 3,
          lensTopology: 'arranjo triangular',
          flashPosition: 'canto superior direito do módulo',
          auxiliarySensorPositions: ['sensor LiDAR']
        }
      }
    }
  };

  const rendered = renderProductStructuralDNA(dna);
  assert(rendered.includes('CATEGORY MODULE — CAMERA:'), 'Must include CATEGORY MODULE — CAMERA:');
  assert(rendered.includes('- island shape: retangular com cantos arredondados'), 'Includes island shape');
  assert(rendered.includes('- island position: canto superior esquerdo'), 'Includes island position');
  assert(rendered.includes('- lens count: 3'), 'Includes lens count 3');
  assert(rendered.includes('- lens topology: arranjo triangular'), 'Includes lens topology');
  assert(rendered.includes('- flash position: canto superior direito do módulo'), 'Includes flash position');
  assert(rendered.includes('- auxiliary sensors: sensor LiDAR'), 'Includes auxiliary sensors');
  assert(rendered.includes('CAMERA MODULE STRUCTURAL LOCK:'), 'Includes CAMERA MODULE STRUCTURAL LOCK');
  assert(rendered.includes('NO camera island redesign'), 'Includes NO camera island redesign');
  assert(rendered.includes('NO lens-count changes'), 'Includes NO lens-count changes');
  assert(rendered.includes('NO generic camera-layout substitution'), 'Includes NO generic camera-layout substitution');
  assert(rendered.includes('CAMERA ANTI-PRIOR OVERRIDE:'), 'Includes CAMERA ANTI-PRIOR OVERRIDE');
  assert(rendered.includes('Do not replace the observed camera-module geometry with a standard, legacy or more familiar layout'), 'Includes anti-prior clause');

  // Verify generic brand names are NOT present in rendered output
  assert(!rendered.toLowerCase().includes('apple'), 'No hardcoded Apple brand name');
  assert(!rendered.toLowerCase().includes('iphone'), 'No hardcoded iPhone brand name');
  assert(!rendered.toLowerCase().includes('samsung'), 'No hardcoded Samsung brand name');
  assert(!rendered.toLowerCase().includes('galaxy'), 'No hardcoded Galaxy brand name');

  console.log('✅ TEST F PASSED');
}

// -----------------------------------------------------------------------------
// TEST G: Camera locks do NOT appear on products without camera
// -----------------------------------------------------------------------------
console.log('▶ TEST G: Camera locks do NOT appear on products without camera...');
{
  const dnaWatch: ProductStructuralDNA = {
    category: 'Relógio',
    coreGeometry: {
      silhouette: 'circular'
    },
    colors: {
      canonicalColor: 'Dourado'
    },
    materials: {
      primary: 'Aço inoxidável'
    }
  };

  const renderedWatch = renderProductStructuralDNA(dnaWatch);
  assert(!renderedWatch.includes('CATEGORY MODULE — CAMERA'), 'Watch must not contain CATEGORY MODULE — CAMERA');
  assert(!renderedWatch.includes('CAMERA MODULE STRUCTURAL LOCK'), 'Watch must not contain CAMERA MODULE STRUCTURAL LOCK');
  assert(!renderedWatch.includes('CAMERA ANTI-PRIOR OVERRIDE'), 'Watch must not contain CAMERA ANTI-PRIOR OVERRIDE');
  assert(renderedWatch.includes('STRUCTURAL IDENTITY LOCK:'), 'Universal lock still present');
  assert(renderedWatch.includes('ANTI-PRIOR OVERRIDE:'), 'Universal anti-prior still present');

  console.log('✅ TEST G PASSED');
}

// -----------------------------------------------------------------------------
// TEST H: Non-regression across earlier stages
// -----------------------------------------------------------------------------
console.log('▶ TEST H: Non-regression across earlier stages...');
{
  // Test registry directly
  const emptyModules = resolveProductCategoryModules({
    category: 'Mochila',
    observableDetails: ['Tecido impermeável', 'Zíperes duplos']
  });
  assert(Object.keys(emptyModules).length === 0, 'No modules for non-camera product');

  // Test cameraModule resolver directly
  const camDirect = resolveCameraModule({
    category: 'Smartphone',
    observableDetails: ['Módulo de câmera retangular', 'Câmera tripla']
  });
  assert(camDirect !== null, 'Camera module resolved directly');
  assert(camDirect?.data.detected === true, 'detected is true');
  assert(camDirect?.data.lensCount === 3, 'lensCount is 3');

  console.log('✅ TEST H PASSED');
}

console.log('================================================================');
console.log('🎉 ALL 8 TESTS (A through H) PASSED WITH 100% SUCCESS!');
console.log('================================================================');
