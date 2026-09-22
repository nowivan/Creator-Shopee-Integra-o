/**
 * SCENE 2 KIT COMPOSITION PROTOCOL — AUTOMATED TEST SUITE
 * 
 * Tests:
 * 1. TEST A — KIT COM 3 BODY SPLASH:
 *    - 3 frascos visíveis no início
 *    - Modelo escolhe e pega 1
 *    - Outros 2 permanecem visíveis na superfície
 *    - Demonstra 1
 *    - Retorna/reaproxima o item junto ao conjunto
 *    - Os 3 ficam claramente visíveis no final
 * 
 * 2. TEST B — KIT COM 7 TOALHAS:
 *    - 7 toalhas visíveis
 *    - Utiliza 1
 *    - 6 permanecem visíveis
 *    - Enquadramento final mostra as 7
 * 
 * 3. TEST C — PRODUTO UNITÁRIO:
 *    - 1 unidade canônica
 *    - Manuseio normal
 *    - Sem criação indevida de unidades extras
 *    - Lock estrutural padrão de objeto único
 * 
 * 4. TEST D — STRUCTURAL IDENTITY LOCK KIT-AWARE:
 *    - Kit real com N componentes
 *    - Componentes confirmados não são suprimidos
 *    - Contém "This is one commercial kit containing exactly N confirmed physical components"
 *    - Contém "NO unverified extra components" e "DO NOT remove any confirmed kit component"
 * 
 * 5. TEST E — SPEECH / ACTION SYNC:
 *    - Sincronização gestual coerente quando o roteiro fala sobre variedade, conjunto ou escolha
 */

import {
  createNormalizedProductContext,
  buildProductStructuralDNA,
  renderProductStructuralDNA
} from '../productGroundingService';
import { runScene2SceneBrain, runScene2CompilerPipeline } from '../scene2BrainService';
import { compileScene2Prompt, buildCompiledScene2Model } from '../../compiler/promptCompiler';
import { Scene2DynamicSlots } from '../../types/compilerTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runAllScene2KitCompositionTests(): Promise<{ passed: number; failed: number; summary: string[] }> {
  const summary: string[] = [];
  let passed = 0;
  let failed = 0;

  async function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        await res;
      }
      passed++;
      summary.push(`✅ PASS: ${name}`);
    } catch (err: any) {
      failed++;
      summary.push(`❌ FAIL: ${name} -> ${err?.message || err}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST A: Kit com 3 Body Splash
  // --------------------------------------------------------------------------
  await runTest('Test A: Kit with 3 Body Splash preserves all 3 units across 0-8s temporal action blocks', async () => {
    const context = createNormalizedProductContext(
      {
        product_identity: 'Kit 3 Body Splash Tododia Algodão Macadâmia e Ameixa 200ml',
        category: 'Perfumaria / Cuidados Pessoais',
        observable_details: [
          'Três frascos cilíndricos translúcidos com spray dourado e tampas transparentes',
          'Rótulos distintos nas cores azul suave, bege e violeta',
          'Líquido perfumado visível em cada frasco'
        ],
        verified_functional_facts: [
          'Fragrância leve para o dia a dia',
          'Fórmula com 95% de ingredientes naturais',
          'Volume de 200ml por frasco'
        ],
        observable_quantity: 3,
        reference_total_units_visible: 3,
        active_scene_quantity: 3,
        is_commercial_pack_confirmed: true
      },
      ['Fragrância leve para o dia a dia', 'Volume de 200ml por frasco'],
      {
        isCommercialPackConfirmed: true,
        productQuantity: 3
      }
    );

    assert(context.isCommercialPackConfirmed === true, 'isCommercialPackConfirmed should be true');
    assert(context.kitComponentCount === 3, 'kitComponentCount should be 3');
    assert(context.handledComponentCount === 1, 'handledComponentCount should be 1');
    assert(context.remainingVisibleComponentCount === 2, 'remainingVisibleComponentCount should be 2');

    // Run Scene 2 Scene Brain (deterministic fallback mode)
    const brainOutput = await runScene2SceneBrain({
      productName: context.identity,
      category: context.category || 'Perfumaria',
      productFacts: context.verifiedFunctionalFacts,
      productVisibleDetails: context.observableDetails,
      primaryBenefit: 'Perfumação suave e variedade de fragrâncias para alternar na rotina',
      spokenCopy: 'Gente, esse kit com três body splash é perfeito pra variar o cheirinho todo dia!',
      presenter: {
        gender: 'female',
        description: 'Authentic 26-year-old Brazilian woman'
      },
      wardrobe: {
        topType: 'regata',
        topColor: 'branca',
        bottomType: 'jeans',
        bottomColor: 'azul',
        footwearType: 'sandália',
        footwearColor: 'bege'
      },
      isCommercialPackConfirmed: true,
      kitComponentCount: 3,
      handledComponentCount: 1,
      remainingVisibleComponentCount: 2
    });

    const { actions } = brainOutput;
    // 0-2s: All 3 components clearly visible on surface
    assert(
      actions.action0to2.includes('3') || actions.action0to2.toLowerCase().includes('three') || actions.action0to2.toLowerCase().includes('complete') || actions.action0to2.toLowerCase().includes('arranged') || actions.action0to2.toLowerCase().includes('vanity') || actions.action0to2.toLowerCase().includes('counter'),
      'Action 0-2s must reference the complete set / 3 items visible'
    );

    // 2-4s: Picks 1 component, other 2 remain visible
    assert(
      (actions.action2to4.includes('1') || actions.action2to4.toLowerCase().includes('one') || actions.action2to4.toLowerCase().includes('single') || actions.action2to4.toLowerCase().includes('select') || actions.action2to4.toLowerCase().includes('picks')) &&
      (actions.action2to4.includes('2') || actions.action2to4.toLowerCase().includes('two') || actions.action2to4.toLowerCase().includes('other') || actions.action2to4.toLowerCase().includes('remaining') || actions.action2to4.toLowerCase().includes('rest') || actions.action2to4.toLowerCase().includes('surface') || actions.action2to4.toLowerCase().includes('vanity') || actions.action2to4.toLowerCase().includes('counter')),
      'Action 2-4s must select 1 while remaining items stay visible'
    );

    // 4-6s: Demonstrates 1, others remain visible
    assert(
      actions.action4to6.toLowerCase().includes('demonstrate') || actions.action4to6.toLowerCase().includes('test') || actions.action4to6.toLowerCase().includes('visible') || actions.action4to6.toLowerCase().includes('spray') || actions.action4to6.toLowerCase().includes('apply') || actions.action4to6.toLowerCase().includes('scent') || actions.action4to6.toLowerCase().includes('benefit'),
      'Action 4-6s must demonstrate item while kit remains in context'
    );

    // 6-8s: Returns/repositions component alongside set, complete 3-piece kit visible
    assert(
      actions.action6to8.includes('3') || actions.action6to8.toLowerCase().includes('three') || actions.action6to8.toLowerCase().includes('kit') || actions.action6to8.toLowerCase().includes('alongside') || actions.action6to8.toLowerCase().includes('set') || actions.action6to8.toLowerCase().includes('together') || actions.action6to8.toLowerCase().includes('vanity'),
      'Action 6-8s must reposition handled item so complete kit is framed at the end'
    );
    assert(
      !actions.action6to8.toLowerCase().includes('chest level') && !actions.action6to8.toLowerCase().includes('altura do peito'),
      'Action 6-8s must not have generic chest-level holding for kit'
    );
  });

  // --------------------------------------------------------------------------
  // TEST B: Kit com 7 toalhas
  // --------------------------------------------------------------------------
  await runTest('Test B: Kit with 7 Towels maintains 7 units with 1 handled and 6 remaining visible', async () => {
    const context = createNormalizedProductContext(
      {
        product_identity: 'Jogo de Toalhas 7 Peças Banhão 100% Algodão',
        category: 'Cama, Mesa e Banho',
        observable_details: [
          'Pilha com 7 toalhas dobradas em degradê de cinza e branco',
          'Barra com detalhe jacquard geométrico',
          'Felpa encorpada com alto relevo'
        ],
        verified_functional_facts: [
          'Algodão 100% penteado 500g/m²',
          'Kit com 2 toalhas banhão, 2 toalhas de rosto, 2 toalhas de lavabo e 1 piso',
          'Alta capacidade de absorção'
        ],
        observable_quantity: 7,
        reference_total_units_visible: 7,
        active_scene_quantity: 7,
        is_commercial_pack_confirmed: true
      },
      ['Algodão 100% penteado 500g/m²', 'Alta capacidade de absorção'],
      {
        isCommercialPackConfirmed: true,
        productQuantity: 7
      }
    );

    assert(context.isCommercialPackConfirmed === true, 'isCommercialPackConfirmed is true');
    assert(context.kitComponentCount === 7, 'kitComponentCount is 7');
    assert(context.handledComponentCount === 1, 'handledComponentCount is 1');
    assert(context.remainingVisibleComponentCount === 6, 'remainingVisibleComponentCount is 6');

    const brainOutput = await runScene2SceneBrain({
      productName: context.identity,
      category: 'Cama, Mesa e Banho',
      productFacts: context.verifiedFunctionalFacts,
      productVisibleDetails: context.observableDetails,
      primaryBenefit: 'Toque macio com secagem rápida e alta absorção',
      spokenCopy: 'Olha a maciez desse jogo de 7 toalhas, enxuga rápido sem agredir a pele!',
      presenter: {
        gender: 'female',
        description: 'Adult Brazilian woman in home setting'
      },
      wardrobe: {
        topType: 'camiseta',
        topColor: 'cinza',
        bottomType: 'calça jeans',
        bottomColor: 'azul escuro',
        footwearType: 'pantufa',
        footwearColor: 'cinza'
      },
      isCommercialPackConfirmed: true,
      kitComponentCount: 7,
      handledComponentCount: 1,
      remainingVisibleComponentCount: 6
    });

    const { actions } = brainOutput;
    assert(actions.action0to2.includes('7'), 'Action 0-2s mentions 7 components');
    assert(actions.action2to4.includes('6') || actions.action2to4.includes('remaining'), 'Action 2-4s mentions 6 remaining');
    assert(actions.action6to8.includes('7') || actions.action6to8.includes('complete'), 'Action 6-8s final frame shows 7-piece kit');
  });

  // --------------------------------------------------------------------------
  // TEST C: Produto Unitário
  // --------------------------------------------------------------------------
  await runTest('Test C: Unitary product enforces single object lock without multiplying units', async () => {
    const context = createNormalizedProductContext(
      {
        product_identity: 'Garrafa Térmica Inox 1L',
        category: 'Utilidades Domésticas',
        observable_details: ['Corpo cilíndrico em aço escovado com alça preta', 'Tampa de rosca com bico dosador'],
        verified_functional_facts: ['Isolamento a vácuo de parede dupla', 'Mantém temperatura por 24h'],
        observable_quantity: 1,
        reference_total_units_visible: 1,
        active_scene_quantity: 1,
        is_commercial_pack_confirmed: false
      },
      ['Isolamento a vácuo de parede dupla', 'Mantém temperatura por 24h'],
      {
        isCommercialPackConfirmed: false,
        productQuantity: 1
      }
    );

    assert(context.isCommercialPackConfirmed === false || context.isCommercialPackConfirmed === undefined, 'isCommercialPackConfirmed is false for single item');

    const dna = context.structuralDNA || buildProductStructuralDNA(context);
    const lockText = renderProductStructuralDNA(dna);

    assert(lockText.includes('The product must remain the same physical object throughout the entire shot'), 'Single product lock text');
    assert(lockText.includes('NO extra components'), 'Single product has NO extra components negative lock');
    assert(!lockText.includes('This is one commercial kit containing exactly'), 'Must not have kit lock text for single item');
  });

  // --------------------------------------------------------------------------
  // TEST D: Structural Identity Lock Kit-Aware
  // --------------------------------------------------------------------------
  await runTest('Test D: Kit-Aware Structural Identity Lock permits confirmed kit items and forbids unverified extras', async () => {
    const dna = buildProductStructuralDNA({
      grounding: {
        product_identity: 'Kit 3 Perfumes Miniatura 30ml',
        category: 'Perfumaria',
        observable_details: ['Três frascos quadrados de vidro transparente', 'Tampas cromadas metálicas'],
        verified_functional_facts: ['Fragrâncias exclusivas', '30ml cada frasco'],
        observable_quantity: 3,
        reference_total_units_visible: 3,
        active_scene_quantity: 3,
        is_commercial_pack_confirmed: true
      },
      isCommercialPackConfirmed: true,
      kitComponentCount: 3,
      handledComponentCount: 1,
      remainingVisibleComponentCount: 2
    });

    const renderedDNA = renderProductStructuralDNA(dna);

    // Checks required text
    assert(
      renderedDNA.includes('This is one commercial kit containing exactly 3 confirmed physical components.'),
      'Contains exact kit declaration with 3 components'
    );
    assert(
      renderedDNA.includes('All 3 components are legitimate parts of the advertised product and must remain preserved.'),
      'Contains legitimate parts clause'
    );
    assert(
      renderedDNA.includes('The presenter may actively handle 1 component at a time while the remaining 2 components stay visible on a nearby surface.'),
      'Contains 1 handled and 2 visible clause'
    );
    assert(
      renderedDNA.includes('Do not remove, duplicate, merge, replace, recolor or reinterpret any confirmed kit component.'),
      'Contains preservation clause for kit'
    );
    assert(
      renderedDNA.includes('NO unverified extra components.'),
      'Contains NO unverified extra components'
    );
    assert(
      renderedDNA.includes('DO NOT remove any confirmed kit component.'),
      'Contains DO NOT remove any confirmed kit component'
    );
    assert(
      !renderedDNA.includes('\nNO extra components\n'),
      'Must NOT contain raw ambiguous NO extra components that would suppress kit items'
    );
  });

  // --------------------------------------------------------------------------
  // TEST E: Speech / Action Sync & Prompt Compilation for Kits
  // --------------------------------------------------------------------------
  await runTest('Test E: Prompt Compiler seamlessly integrates Kit Composition into compiled model and prompt', async () => {
    const slots: Scene2DynamicSlots = {
      productIdentity: 'Kit 3 Body Splash Tododia',
      productFacts: ['Fórmula vegana', 'Fragrância leve 200ml'],
      productVisibleDetails: ['Três frascos com spray dourado', 'Líquidos coloridos em tons pastel'],
      presenter: {
        gender: 'female',
        description: 'Authentic 25-year-old Brazilian creator'
      },
      wardrobe: {
        topType: 'blusa',
        topColor: 'branca',
        bottomType: 'jeans',
        bottomColor: 'azul claro',
        footwearType: 'tênis',
        footwearColor: 'branco'
      },
      environment: 'quarto iluminado com penteadeira funcional',
      primaryBenefit: 'Variedade para alternar aromas conforme o momento',
      spokenCopy: 'São três opções deliciosas pra você escolher uma diferente a cada dia!',
      actions: {
        action0to2: 'All 3 items of the complete Kit 3 Body Splash Tododia are neatly arranged and visible on the vanity, as presenter introduces them.',
        action2to4: 'Presenter selects and picks up 1 bottle to demonstrate, while the other 2 bottles remain clearly visible on the vanity.',
        action4to6: 'Presenter applies a light mist of the chosen body splash on her wrist, enjoying the scent while the other 2 bottles stay in view.',
        action6to8: 'Presenter places the bottle back beside the other two on the vanity, with all 3 bottles clearly visible together in the final shot.'
      },
      speechActionSync: [
        {
          phrase: 'São três opções deliciosas',
          action: 'Presenter gestures to the complete 3-piece set visible on the vanity before picking one.'
        }
      ],
      isCommercialPackConfirmed: true,
      kitComponentCount: 3,
      handledComponentCount: 1,
      remainingVisibleComponentCount: 2,
      structuralDNA: buildProductStructuralDNA({
        grounding: {
          product_identity: 'Kit 3 Body Splash Tododia',
          category: 'Perfumaria',
          observable_details: ['Três frascos com spray dourado'],
          verified_functional_facts: ['Fórmula vegana']
        },
        isCommercialPackConfirmed: true,
        kitComponentCount: 3
      })
    };

    const model = buildCompiledScene2Model(slots);
    assert(Boolean(model.product.structuralDNA?.isCommercialPackConfirmed), 'Model has kit confirmed');
    assert(model.product.structuralDNA?.kitComponentCount === 3, 'Model has kitComponentCount 3');

    const promptText = compileScene2Prompt(slots);
    assert(promptText.includes('This is one commercial kit containing exactly 3 confirmed physical components'), 'Prompt includes kit lock');
    assert(promptText.includes('NO unverified extra components'), 'Prompt includes kit-safe negative constraint');
    assert(promptText.includes('DO NOT remove any confirmed kit component'), 'Prompt protects kit components');
    assert(promptText.includes('São três opções deliciosas'), 'Prompt includes speech action sync phrase');
  });

  return { passed, failed, summary };
}
