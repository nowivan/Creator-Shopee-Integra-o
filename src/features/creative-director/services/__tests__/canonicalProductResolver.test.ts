/**
 * TEST SUITE: CANONICAL PRODUCT RESOLVER & VISUAL FIDELITY ETAPA 1
 * 
 * Tests separating reference visible units from active scene units:
 * - TEST A: Multi-unit commercial showcase (4 smartphones in different colors) -> No "Kit 4", referenceUnits=4, activeSceneQuantity=1.
 * - TEST B: Genuinely sold kit/pack -> isCommercialPackConfirmed=true, preserves kit identity and pack quantity.
 * - TEST C: Single unit reference -> referenceTotalUnitsVisible=1, activeSceneQuantity=1.
 * - TEST D: User choice selection -> Resolves chosen color as canonical and sets other units as alternates.
 * - TEST E: Deterministic fallback -> Multiple runs produce identical canonical selection.
 */

import {
  normalizeGroundedProductIdentity,
  resolveCanonicalProductUnit,
  createNormalizedProductContext,
  buildCanonicalColorLockClause,
  isExplicitCommercialPack
} from '../productGroundingService';
import { buildCompiledScene2Model, renderScene2Text } from '../../compiler/promptCompiler';
import { Scene2DynamicSlots } from '../../types/compilerTypes';

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

export async function runCanonicalProductResolverTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n======================================================');
  console.log('9. RUNNING CANONICAL PRODUCT RESOLVER TESTS (ETAPA 1)');
  console.log('======================================================');

  // TEST A: Marketplace screenshot with 4 phones in different colors -> No "Kit 4", activeSceneQuantity=1
  try {
    const raw4Phones = {
      product_identity: 'Apple iPhone 17 Pro',
      product_type: 'Smartphone',
      brand: 'Apple',
      observable_quantity: 4,
      observable_colors: ['Branco / Prata', 'Laranja Cósmico', 'Azul Titânio', 'Preto Espacial'],
      observable_details: [
        'Módulo traseiro com lentes fotográficas',
        'Acabamento em vidro fosco e lateral metálica'
      ],
      verified_functional_facts: [
        'Smartphone com câmera de alta resolução e processador avançado'
      ]
    };

    const normalized = normalizeGroundedProductIdentity(raw4Phones);
    const selection = resolveCanonicalProductUnit({
      grounding: raw4Phones,
      observableColors: raw4Phones.observable_colors,
      observableQuantity: 4,
      productIdentity: normalized.productIdentity,
      productType: normalized.productType
    });

    const isNotKit = !normalized.productIdentity.toLowerCase().includes('kit');
    const isReference4 = selection.referenceTotalUnitsVisible === 4;
    const isActive1 = selection.activeSceneQuantity === 1;
    const hasCanonicalUnit = selection.canonicalReferenceUnit !== null;
    const hasAlternates = selection.alternateReferenceUnits.length === 3;

    // Test context creation and color lock clause
    const context = createNormalizedProductContext(raw4Phones, raw4Phones.verified_functional_facts);
    const hasColorLockInDetails = context.observableDetails.some(d => d.includes('CANONICAL ACTIVE PRODUCT COLOR'));

    assert(
      isNotKit && isReference4 && isActive1 && hasCanonicalUnit && hasAlternates && hasColorLockInDetails,
      'TEST A — Multi-Unit Commercial Reference (4 phones -> 1 active unit, no Kit 4 contamination)',
      `Identity: "${normalized.productIdentity}", RefQty: ${selection.referenceTotalUnitsVisible}, ActiveQty: ${selection.activeSceneQuantity}, Details: ${JSON.stringify(context.observableDetails)}`
    );
  } catch (e: any) {
    assert(false, 'TEST A — Multi-Unit Commercial Reference', e.message);
  }

  // TEST B: Real commercial kit / pack confirmed
  try {
    const rawRealKit = {
      product_identity: 'Kit com 4 Toalhas de Banho Döhler',
      product_type: 'Toalha de Banho',
      brand: 'Döhler',
      observable_quantity: 4,
      observable_colors: ['Cinza', 'Branco', 'Azul', 'Bege'],
      verified_functional_facts: ['Jogo de 4 toalhas para família']
    };

    const normalizedKit = normalizeGroundedProductIdentity(rawRealKit);
    const isPack = isExplicitCommercialPack(rawRealKit.product_identity);
    const selectionKit = resolveCanonicalProductUnit({
      grounding: rawRealKit,
      observableColors: rawRealKit.observable_colors,
      observableQuantity: 4,
      isCommercialPackConfirmed: isPack,
      productIdentity: normalizedKit.productIdentity,
      productType: normalizedKit.productType
    });

    const preservesKitIdentity = normalizedKit.productIdentity.toLowerCase().includes('kit');
    const isActive4 = selectionKit.activeSceneQuantity === 4;

    assert(
      preservesKitIdentity && isActive4 && selectionKit.isCommercialPackConfirmed === true,
      'TEST B — Real Commercial Kit (Kit 4 Bath Towels preserved)',
      `Identity: "${normalizedKit.productIdentity}", ActiveQty: ${selectionKit.activeSceneQuantity}`
    );
  } catch (e: any) {
    assert(false, 'TEST B — Real Commercial Kit', e.message);
  }

  // TEST C: Single unit reference
  try {
    const rawSingle = {
      product_identity: 'Relógio Masculino Cronógrafo',
      product_type: 'Relógio de Pulso',
      brand: 'Casio',
      observable_quantity: 1,
      observable_colors: ['Preto / Aço'],
      verified_functional_facts: ['Resistência à água 100m']
    };

    const selectionSingle = resolveCanonicalProductUnit({
      grounding: rawSingle,
      observableColors: rawSingle.observable_colors,
      observableQuantity: 1
    });

    assert(
      selectionSingle.referenceTotalUnitsVisible === 1 &&
      selectionSingle.activeSceneQuantity === 1 &&
      selectionSingle.alternateReferenceUnits.length === 0,
      'TEST C — Single Unit Reference (1 visible unit -> 1 active scene unit)',
      `RefQty: ${selectionSingle.referenceTotalUnitsVisible}, ActiveQty: ${selectionSingle.activeSceneQuantity}`
    );
  } catch (e: any) {
    assert(false, 'TEST C — Single Unit Reference', e.message);
  }

  // TEST D: User choice overrides canonical unit / color
  try {
    const rawMultiColors = {
      product_identity: 'Apple iPhone 17 Pro',
      product_type: 'Smartphone',
      observable_quantity: 4,
      observable_colors: ['Branco / Prata', 'Laranja Cósmico', 'Azul Titânio', 'Preto Espacial'],
      verified_functional_facts: ['Corpo em titânio e tela OLED']
    };

    const selectionWithChoice = resolveCanonicalProductUnit({
      grounding: rawMultiColors,
      observableColors: rawMultiColors.observable_colors,
      observableQuantity: 4,
      userChoice: { color: 'Azul Titânio' }
    });

    const isBlueCanonical = selectionWithChoice.canonicalColor === 'Azul Titânio';
    const isCanonicalUnitBlue = selectionWithChoice.canonicalReferenceUnit?.color === 'Azul Titânio';

    assert(
      isBlueCanonical && isCanonicalUnitBlue,
      'TEST D — User Explicit Color Choice ("Azul Titânio" selected as canonical)',
      `CanonicalColor: "${selectionWithChoice.canonicalColor}", UnitColor: "${selectionWithChoice.canonicalReferenceUnit?.color}"`
    );
  } catch (e: any) {
    assert(false, 'TEST D — User Explicit Color Choice', e.message);
  }

  // TEST E: Deterministic fallback across repeated calls
  try {
    const rawDeterministic = {
      product_identity: 'Smartwatch Ultra 2',
      product_type: 'Relógio Inteligente',
      observable_quantity: 3,
      observable_colors: ['Preto', 'Prata', 'Dourado'],
      verified_functional_facts: ['Monitor cardíaco e GPS integrado']
    };

    const run1 = resolveCanonicalProductUnit({ grounding: rawDeterministic, observableColors: rawDeterministic.observable_colors });
    const run2 = resolveCanonicalProductUnit({ grounding: rawDeterministic, observableColors: rawDeterministic.observable_colors });
    const run3 = resolveCanonicalProductUnit({ grounding: rawDeterministic, observableColors: rawDeterministic.observable_colors });

    const isConsistent = (
      run1.canonicalReferenceUnit?.id === run2.canonicalReferenceUnit?.id &&
      run2.canonicalReferenceUnit?.id === run3.canonicalReferenceUnit?.id &&
      run1.canonicalColor === run2.canonicalColor &&
      run2.canonicalColor === run3.canonicalColor
    );

    assert(
      isConsistent,
      'TEST E — Deterministic Fallback (Repeated resolution produces identical canonical unit)',
      `Run1: ${run1.canonicalColor} (${run1.canonicalReferenceUnit?.id}), Run2: ${run2.canonicalColor}, Run3: ${run3.canonicalColor}`
    );
  } catch (e: any) {
    assert(false, 'TEST E — Deterministic Fallback', e.message);
  }

  return { passed, failed };
}
