/**
 * TEST SUITE: PRODUCT STRUCTURAL DNA & VISUAL FIDELITY ETAPA 2B
 * 
 * Tests building universal physical/structural DNA from grounded data and canonical unit:
 * - TEST A: Single unit product -> DNA created normally with physical geometry and materials.
 * - TEST B: Multi-object showcase -> DNA derived exclusively from canonical unit (no alternate unit color contamination).
 * - TEST C: Canonical color -> canonicalColor properly assigned in productStructuralDNA.colors.
 * - TEST D: Missing information -> Unconfirmed fields strictly remain undefined without hallucinations.
 * - TEST E: Product with no movable parts -> movableComponents is strictly [].
 * - TEST F: Product with branding -> Logos and visible text mapped into branding.logos / visibleText.
 * - TEST G: Normalized Context -> Scene2ProductContext contains structuralDNA without altering prompt output.
 */

import {
  buildProductStructuralDNA,
  createEmptyProductStructuralDNA,
  createNormalizedProductContext,
  resolveCanonicalProductUnit
} from '../productGroundingService';
import { ProductGroundingResult, ReferenceUnit } from '../../types/compilerTypes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (failureDetails) {
      console.error(`   Details: ${failureDetails}`);
    }
    failed++;
  }
}

export async function runProductStructuralDNATests(): Promise<{ passed: number; failed: number }> {
  passed = 0;
  failed = 0;
  console.log('\n======================================================');
  console.log('10. RUNNING PRODUCT STRUCTURAL DNA TESTS (ETAPA 2B)');
  console.log('======================================================');

  // TEST A: Produto único — DNA criado normalmente
  try {
    const singleProductGrounding: Partial<ProductGroundingResult> = {
      product_identity: 'Relógio Cronógrafo Masculino Aço',
      product_type: 'Relógio de Pulso',
      category: 'Acessórios & Joias',
      observable_quantity: 1,
      observable_colors: ['Prata'],
      observable_materials: ['Aço inoxidável', 'Vidro mineral'],
      observable_details: [
        'Caixa circular em aço com acabamento escovado',
        'Mostrador analógico preto com ponteiros luminescentes',
        'Pulseira de elos metálicos com fecho dobrável'
      ],
      visible_labels: ['Casio', 'WR 100M'],
      verified_functional_facts: [
        'Resistência à água de 100 metros para uso cotidiano',
        'Mecanismo de cronógrafo com medição de frações de segundo'
      ]
    };

    const dna = buildProductStructuralDNA(singleProductGrounding);

    const hasCore = dna.coreGeometry.silhouette === 'circular';
    const hasFinish = dna.materials.finish === 'escovado';
    const hasPrimaryMat = dna.materials.primary === 'Aço inoxidável';
    const hasCanonicalColor = dna.colors.canonicalColor === 'Prata';
    const hasFixed = dna.fixedComponents.some(c => c.name.toLowerCase().includes('mostrador'));
    const hasMovable = dna.movableComponents.some(c => c.name.toLowerCase().includes('pulseira') || c.name.toLowerCase().includes('fecho'));

    assert(
      hasCore && hasFinish && hasPrimaryMat && hasCanonicalColor && hasFixed && hasMovable,
      'TEST A — Single unit product: DNA created normally with geometry, finish, materials and components',
      `silhouette=${dna.coreGeometry.silhouette}, finish=${dna.materials.finish}, color=${dna.colors.canonicalColor}`
    );
  } catch (err: any) {
    assert(false, 'TEST A — Single unit product: DNA created normally', err.message);
  }

  // TEST B: Multi-object — DNA derivado apenas da unidade canônica
  try {
    const multi4DevicesGrounding: Partial<ProductGroundingResult> = {
      product_identity: 'Smartphone Pro Max',
      product_type: 'Smartphone',
      category: 'Eletrônicos',
      observable_quantity: 4,
      observable_colors: ['Branco / Prata', 'Laranja Cósmico', 'Azul Titânio', 'Preto Espacial'],
      observable_details: [
        'Módulo traseiro quadrado com lentes fotográficas',
        'Laterais metálicas planas e cantos arredondados',
        'Acabamento traseiro em vidro fosco'
      ],
      visible_labels: ['Pro', '5G'],
      verified_functional_facts: [
        'Smartphone com câmera de alta resolução'
      ]
    };

    const canonicalUnit: ReferenceUnit = {
      id: 'unit-1',
      color: 'Branco / Prata',
      view: 'rear',
      role: 'canonical',
      description: 'Smartphone cor Branco / Prata em visão traseira'
    };

    const dna = buildProductStructuralDNA({
      grounding: multi4DevicesGrounding,
      canonicalReferenceUnit: canonicalUnit,
      canonicalColor: canonicalUnit.color,
      observableDetails: multi4DevicesGrounding.observable_details,
      observableColors: multi4DevicesGrounding.observable_colors,
      observableMaterials: ['Vidro', 'Metal']
    });

    const isColorPure = dna.colors.canonicalColor === 'Branco / Prata';
    const noPollutionFromAlternateColors = !(dna.colors.canonicalColor || '').includes('Laranja') &&
      !(dna.colors.canonicalColor || '').includes('Azul') &&
      !(dna.colors.canonicalColor || '').includes('Preto');
    const secondaryColorIsSilver = Array.isArray(dna.colors.secondaryColors) && dna.colors.secondaryColors.includes('Prata');

    assert(
      isColorPure && noPollutionFromAlternateColors && secondaryColorIsSilver,
      'TEST B — Multi-object: DNA derived exclusively from canonical unit (no alternate color pollution)',
      `canonicalColor=${dna.colors.canonicalColor}, secondaryColors=${JSON.stringify(dna.colors.secondaryColors)}`
    );
  } catch (err: any) {
    assert(false, 'TEST B — Multi-object: DNA derived exclusively from canonical unit', err.message);
  }

  // TEST C: Cor canônica com seleção do usuário ("Azul Titânio")
  try {
    const userSelectedColor = 'Azul Titânio';
    const dna = buildProductStructuralDNA({
      canonicalColor: userSelectedColor,
      observableDetails: ['Corpo retangular com bordas retas'],
      observableMaterials: ['Titânio']
    });

    assert(
      dna.colors.canonicalColor === 'Azul Titânio',
      'TEST C — Canonical color correctly mapped to productStructuralDNA.colors.canonicalColor',
      `canonicalColor=${dna.colors.canonicalColor}`
    );
  } catch (err: any) {
    assert(false, 'TEST C — Canonical color', err.message);
  }

  // TEST D: Informação ausente — Campos não confirmados permanecem estritamente undefined
  try {
    const sparseGrounding: Partial<ProductGroundingResult> = {
      product_identity: 'Item Básico Desconhecido',
      product_type: 'Item Genérico',
      observable_details: [],
      observable_colors: [],
      observable_materials: [],
      visible_labels: []
    };

    const dna = buildProductStructuralDNA(sparseGrounding);

    const undefinedGeometry = dna.coreGeometry.silhouette === undefined &&
      dna.coreGeometry.proportions === undefined &&
      dna.coreGeometry.edgeStyle === undefined &&
      dna.coreGeometry.cornerProfile === undefined &&
      dna.coreGeometry.aspectRatio === undefined;
    const undefinedColors = dna.colors.canonicalColor === undefined && dna.colors.secondaryColors === undefined;
    const undefinedMaterials = dna.materials.primary === undefined && dna.materials.finish === undefined;
    const emptyComponents = dna.fixedComponents.length === 0 && dna.movableComponents.length === 0;

    assert(
      undefinedGeometry && undefinedColors && undefinedMaterials && emptyComponents,
      'TEST D — Missing information: Unconfirmed fields remain strictly undefined without hallucination',
      `silhouette=${dna.coreGeometry.silhouette}, primaryMaterial=${dna.materials.primary}`
    );
  } catch (err: any) {
    assert(false, 'TEST D — Missing information', err.message);
  }

  // TEST E: Produto sem partes móveis — movableComponents = []
  try {
    const rigidObjectGrounding: Partial<ProductGroundingResult> = {
      product_identity: 'Toalha de Banho Felpuda',
      product_type: 'Toalha de Banho',
      observable_details: [
        'Estrutura têxtil dobrada',
        'Acabamento com costura reforçada nas bordas',
        'Superfície felpuda com relevo decorativo'
      ],
      observable_materials: ['Tecido 100% Algodão']
    };

    const dna = buildProductStructuralDNA(rigidObjectGrounding);

    assert(
      dna.movableComponents.length === 0 && Array.isArray(dna.movableComponents),
      'TEST E — Product without movable parts: movableComponents is strictly []',
      `movableComponents.length=${dna.movableComponents.length}`
    );
  } catch (err: any) {
    assert(false, 'TEST E — Product without movable parts', err.message);
  }

  // TEST F: Produto com branding — Logo e texto mapeados corretamente
  try {
    const brandingGrounding: Partial<ProductGroundingResult> = {
      product_identity: 'Fragrância Body Splash',
      product_type: 'Body Splash',
      visible_labels: ["Logo Barbour's", 'Body Splash Floral', '200ml / 6.7 fl oz'],
      observable_details: ['Frasco cilíndrico com válvula spray borrifadora']
    };

    const dna = buildProductStructuralDNA(brandingGrounding);

    const hasLogo = (dna.branding.logos?.length || 0) >= 1 && dna.branding.logos?.[0].name.includes("Logo Barbour's");
    const hasText = (dna.branding.visibleText?.length || 0) >= 2;
    const hasSprayMovable = dna.movableComponents.some(c => c.name.toLowerCase().includes('spray') || c.name.toLowerCase().includes('válvula'));

    assert(
      hasLogo && hasText && hasSprayMovable,
      'TEST F — Product with branding: Logos and visible text mapped into branding structure correctly',
      `logos=${dna.branding.logos?.length}, visibleText=${dna.branding.visibleText?.length}`
    );
  } catch (err: any) {
    assert(false, 'TEST F — Product with branding', err.message);
  }

  // TEST G: Integração com createNormalizedProductContext
  try {
    const grounding: Partial<ProductGroundingResult> = {
      product_identity: 'Kit 3 Body Splash Barbour',
      product_type: 'Body Splash',
      category: 'Beleza & Perfumaria',
      observable_quantity: 3,
      observable_colors: ['Rosa', 'Dourado', 'Lilás'],
      observable_materials: ['Frasco plástico', 'Válvula metálica'],
      observable_details: [
        'Kit com 3 frascos cilíndricos com válvula spray dosadora',
        'Tampa borrifadora transparente'
      ],
      visible_labels: ['Body Splash', '200ml'],
      verified_functional_facts: ['Frasco de 200ml para aplicação rápida']
    };

    const context = createNormalizedProductContext(grounding);

    const hasDNA = !!context.structuralDNA;
    const dnaSilhouette = context.structuralDNA?.coreGeometry.silhouette === 'cilíndrico';
    const dnaMovable = (context.structuralDNA?.movableComponents.length || 0) > 0;

    assert(
      hasDNA && dnaSilhouette && dnaMovable,
      'TEST G — Normalized context: Scene2ProductContext contains structuralDNA preserving all properties',
      `hasDNA=${hasDNA}, silhouette=${context.structuralDNA?.coreGeometry.silhouette}`
    );
  } catch (err: any) {
    assert(false, 'TEST G — Normalized context contains structuralDNA', err.message);
  }

  console.log(`Product Structural DNA Tests: ${passed} PASSED, ${failed} FAILED`);
  return { passed, failed };
}
