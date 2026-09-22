/**
 * SCENE 3 BRAIN SERVICE TEST SUITE
 * Phase 2.3 Architecture Validation
 */

import {
  runScene3BrainService,
  buildDeterministicScene3Fallback,
  resolveScene3FunctionalEnvironment,
  generateProductSpecificNegatives,
  validateActionEvidence,
  validateScene3BrainResult,
  mapScene3BrainToDynamicSlots,
  Scene3BrainValidationError
} from '../scene3BrainService';
import { Scene3BrainInput, Scene3BrainResult } from '../../types/scene3';
import { compileScene3Prompt } from '../../compiler/scene3PromptCompiler';
import { getScene2MasterTemplateSkeleton } from '../../templates/scene2BaseTemplate';

export async function runAllScene3BrainTests() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 2.3 — SCENE BRAIN C3 TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // TEST A: CTA Input Is Immutable
  try {
    const rawCta = 'Garanta o seu kit hoje mesmo pelo link abaixo e aproveite o frete rápido!';
    const input: Scene3BrainInput = {
      product: {
        identity: 'Kit Toalhas Imperial 500g',
        category: 'Banho',
        visibleDetails: ['Algodão penteado', 'Barra acetinada'],
        knownPhysicalFacts: ['500g/m²', 'Alta absorção']
      },
      presenter: { identity: 'Mulher brasileira', gender: 'female' },
      wardrobe: { description: 'Camiseta branca e jeans' },
      spokenCta: rawCta
    };

    const result = await runScene3BrainService(input);
    // Ensure output does not contain any rewritten CTA field
    assert((result as any).spokenCta === undefined, 'TEST A1 — Scene Brain result does NOT return a rewritten spokenCta field');
    
    // Map to slots and verify exact preservation
    const slots = mapScene3BrainToDynamicSlots(input, result);
    assert(slots.spokenCta === rawCta, 'TEST A2 — CTA Input is preserved 100% byte-for-byte in mapped dynamic slots');
  } catch (err: any) {
    assert(false, 'TEST A — CTA Input Is Immutable', err.message);
  }

  // TEST B: 4 Action Blocks
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Frigideira Antiaderente Granito Pro',
        category: 'Cozinha',
        visibleDetails: ['Revestimento cerâmico marmorizado', 'Cabo soft-touch baquelite'],
        knownPhysicalFacts: ['Alumínio forjado 4.5mm', 'Livre de PFOA']
      },
      presenter: { identity: 'Homem brasileiro na faixa dos 30 anos', gender: 'male' },
      wardrobe: { description: 'Avental cinza e camisa polo azul' },
      spokenCta: 'Clica aqui no botão e garante a sua frigideira com acabamento profissional na sua casa.'
    };

    const result = await runScene3BrainService(input);
    const { action0to2, action2to4, action4to6, action6to8 } = result.actions;
    assert(
      Boolean(action0to2 && action2to4 && action4to6 && action6to8),
      'TEST B1 — Exactly 4 non-empty temporal action blocks are generated (0-8s)'
    );
    assert(
      action0to2.length > 20 && action2to4.length > 20 && action4to6.length > 20 && action6to8.length > 20,
      'TEST B2 — All 4 temporal action blocks have sufficient descriptive depth'
    );
  } catch (err: any) {
    assert(false, 'TEST B — 4 Action Blocks', err.message);
  }

  // TEST C: Product Specificity (Anti-Generic Rule)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Travesseiro Cervical Viscoelástico Nasa',
        category: 'Cama e Banho',
        visibleDetails: ['Formato anatômico ondulado', 'Capa em tecido de bambu respirável com zíper'],
        knownPhysicalFacts: ['Espuma viscoelástica de memória', 'Densidade D50 antiácaro']
      },
      presenter: { identity: 'Mulher adulta', gender: 'female' },
      wardrobe: { description: 'Pijama confortável de algodão' },
      spokenCta: 'Se você quer acordar sem dores no pescoço, clica no link e experimente hoje mesmo.'
    };

    const result = await runScene3BrainService(input);
    const evidence = validateActionEvidence(result.actions, input.product.knownPhysicalFacts, input.product.category);
    assert(evidence.valid, 'TEST C — Product Specificity (At least 2 action blocks contain product-specific physical interaction)');
  } catch (err: any) {
    assert(false, 'TEST C — Product Specificity', err.message);
  }

  // TEST D: Watch (Physical wrist handling, NO smartwatch invention)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Relógio Cronógrafo Cronos Black Steel',
        category: 'Relógios e Acessórios',
        visibleDetails: ['Mostrador preto fosco', 'Bisel taquimétrico', 'Pulseira de aço escovado'],
        knownPhysicalFacts: ['Caixa em aço inoxidável 316L', 'Vidro de safira', 'Movimento quartzo']
      },
      presenter: { identity: 'Homem adulto', gender: 'male' },
      wardrobe: { description: 'Polo azul marinho e calça chino' },
      spokenCta: 'Dá uma olhada nos detalhes e clica aqui para garantir o seu antes que esgote.'
    };

    const result = await runScene3BrainService(input);
    const allActions = `${result.actions.action0to2} ${result.actions.action2to4} ${result.actions.action4to6} ${result.actions.action6to8}`.toLowerCase();
    assert(
      !allActions.includes('touchscreen') && !allActions.includes('smartwatch') && !allActions.includes('swipe screen'),
      'TEST D1 — Watch handling does not invent digital touchscreen/smartwatch features'
    );
    assert(
      result.productSpecificNegatives.some(n => n.toLowerCase().includes('watch') || n.toLowerCase().includes('dial') || n.toLowerCase().includes('bracelet')),
      'TEST D2 — Watch generates tailored geometry negatives (bracelet / dial)'
    );
  } catch (err: any) {
    assert(false, 'TEST D — Watch', err.message);
  }

  // TEST E: Sneaker (Valid wear/show interaction, no deformation)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Tênis Running Ultralight Carbon Pro',
        category: 'Calçados',
        visibleDetails: ['Cabedal em mesh respirável preto', 'Entressola de EVA texturizada branca', 'Solado de borracha aderente'],
        knownPhysicalFacts: ['Placa de propulsão flexível', 'Peso de apenas 210g']
      },
      presenter: { identity: 'Atleta brasileiro', gender: 'male' },
      wardrobe: { description: 'Camiseta dry fit e shorts esportivo' },
      spokenCta: 'Clica aqui no link e garanta o seu par para turbinar seus treinos diários.'
    };

    const result = await runScene3BrainService(input);
    const env = result.environment.toLowerCase();
    assert(
      env.includes('entryway') || env.includes('interior') || env.includes('apartment') || env.includes('living'),
      'TEST E1 — Sneaker resolves coherent everyday interior / entryway environment'
    );
    assert(
      result.productSpecificNegatives.some(n => n.toLowerCase().includes('sole') || n.toLowerCase().includes('shoe') || n.toLowerCase().includes('clipping')),
      'TEST E2 — Sneaker generates sole deformation and clipping negatives'
    );
  } catch (err: any) {
    assert(false, 'TEST E — Sneaker', err.message);
  }

  // TEST F: Bible / Book (Valid page/cover handling, no duplicate book)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Bíblia Sagrada Edição de Estudo Couro Nobre',
        category: 'Livros e Bíblias',
        visibleDetails: ['Capa em couro legítimo marrom com gravação dourada', 'Bordas douradas', 'Fita marcadora de cetim'],
        knownPhysicalFacts: ['Papel bíblia ultrafino 28g', 'Texto em versão Almeida Revista e Atualizada']
      },
      presenter: { identity: 'Mulher adulta com expressão serena', gender: 'female' },
      wardrobe: { description: 'Blusa de linho bege e saia longa' },
      spokenCta: 'Se você quer aprofundar seus estudos com uma edição especial, clica no link e garanta a sua.'
    };

    const result = await runScene3BrainService(input);
    const env = result.environment.toLowerCase();
    assert(
      env.includes('reading') || env.includes('book') || env.includes('living') || env.includes('interior'),
      'TEST F1 — Bible resolves reading nook / living interior environment'
    );
    assert(
      result.productSpecificNegatives.some(n => n.toLowerCase().includes('book') || n.toLowerCase().includes('page')),
      'TEST F2 — Bible generates book duplication and page geometry negatives'
    );
  } catch (err: any) {
    assert(false, 'TEST F — Bible', err.message);
  }

  // TEST G: Body Splash Kit (Preserves kit composition and active bottle handling)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Kit Body Splash Flor de Cerejeira + Baunilha Real (2 Frascos)',
        category: 'Perfumaria e Cosméticos',
        visibleDetails: ['Frascos cilíndricos transparentes de 200ml', 'Válvula spray dourada com tampa acrílica', 'Líquido com leve coloração rosada e dourada'],
        knownPhysicalFacts: ['Fixação de até 8 horas', 'Fórmula vegana sem parabenos'],
        quantity: '2'
      },
      presenter: { identity: 'Jovem mulher brasileira', gender: 'female' },
      wardrobe: { description: 'Regata de seda rosa claro e calça off-white' },
      spokenCta: 'Aproveita que o kit vem com as duas fragrâncias e clica no link para garantir o seu.'
    };

    const result = await runScene3BrainService(input);
    const actionText = `${result.actions.action0to2} ${result.actions.action2to4}`.toLowerCase();
    assert(
      actionText.includes('kit') || actionText.includes('unit') || actionText.includes('frascos') || actionText.includes('splash'),
      'TEST G1 — Body Splash Kit handles multi-unit/kit composition coherently'
    );
    assert(
      result.productSpecificNegatives.some(n => n.toLowerCase().includes('bottle') || n.toLowerCase().includes('spray') || n.toLowerCase().includes('duplication')),
      'TEST G2 — Body Splash Kit generates bottle duplication and spray nozzle negatives'
    );
  } catch (err: any) {
    assert(false, 'TEST G — Body Splash Kit', err.message);
  }

  // TEST H: No Commercial Fact Creation
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Garrafa Térmica Inox 1 Litro',
        category: 'Utilidades',
        visibleDetails: ['Aço inox escovado', 'Tampa com botão de pressão'],
        knownPhysicalFacts: ['Mantém 24h gelado', 'Livre de BPA']
      },
      presenter: { identity: 'Homem adulto', gender: 'male' },
      wardrobe: { description: 'Camiseta cinza' },
      spokenCta: 'Clica aqui no link para ter sua água gelada o dia inteiro.'
    };

    const result = await runScene3BrainService(input);
    const allText = JSON.stringify(result).toLowerCase();
    const commercialDisallowed = ['50% off', 'r$', 'reais', 'por apenas', 'estoque restante', 'últimos 3 itens', 'promoção relâmpago'];
    const hasInventedCommercialFact = commercialDisallowed.some(term => allText.includes(term));
    assert(!hasInventedCommercialFact, 'TEST H — No commercial facts (discounts, prices, stock counts) invented in Scene Brain');
  } catch (err: any) {
    assert(false, 'TEST H — No Commercial Fact Creation', err.message);
  }

  // TEST I: No Unsupported Benefit Invention
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Suporte Articulado para Monitor',
        category: 'Informática',
        visibleDetails: ['Braço em alumínio preto fosco', 'Morsa de fixação para mesa'],
        knownPhysicalFacts: ['Padrão VESA 75/100', 'Pistão a gás para até 9kg']
      },
      presenter: { identity: 'Profissional de tecnologia', gender: 'male' },
      wardrobe: { description: 'Camisa casual' },
      spokenCta: 'Organize sua mesa agora mesmo clicando no link abaixo.'
    };

    const result = await runScene3BrainService(input);
    const allActions = `${result.actions.action0to2} ${result.actions.action2to4} ${result.actions.action4to6} ${result.actions.action6to8}`.toLowerCase();
    // Ensure no unsupported medical or wireless claims
    assert(!allActions.includes('cura postura') && !allActions.includes('bluetooth'), 'TEST I — No unsupported clinical or technical claims created in actions');
  } catch (err: any) {
    assert(false, 'TEST I — No Benefit Invention', err.message);
  }

  // TEST J: CTA Gesture (No fake cart icon or UI interaction)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Fone de Ouvido Bluetooth Noise Cancelling',
        category: 'Eletrônicos',
        visibleDetails: ['Almofadas circumaurais em couro sintético', 'Haste ajustável'],
        knownPhysicalFacts: ['Cancelamento ativo de ruído ANC', 'Bateria de 40 horas']
      },
      presenter: { identity: 'Jovem adulto', gender: 'male' },
      wardrobe: { description: 'Jaqueta casual e fone no pescoço' },
      spokenCta: 'Clica aqui no link para conferir o isolamento de ruído na prática.'
    };

    const result = await runScene3BrainService(input);
    const gesture = result.ctaGesture.toLowerCase();
    assert(
      !gesture.includes('cart icon') && !gesture.includes('floating button') && !gesture.includes('taps screen') && !gesture.includes('taps cart'),
      'TEST J — CTA Gesture strictly forbids fake cart icons, floating buttons or screen UI tapping'
    );
  } catch (err: any) {
    assert(false, 'TEST J — CTA Gesture', err.message);
  }

  // TEST K: Speech Sync (1-3 exact segments mapped to physical actions)
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Kit 4 Panos de Microfibra Multiuso',
        category: 'Limpeza',
        visibleDetails: ['Tecido em microfibra ultramacio', 'Cores sortidas (azul, amarelo, verde, cinza)'],
        knownPhysicalFacts: ['80% poliéster e 20% poliamida', 'Não solta fiapos nem risca superfícies']
      },
      presenter: { identity: 'Mulher adulta', gender: 'female' },
      wardrobe: { description: 'Camiseta confortável' },
      spokenCta: 'Se você quer limpar sem riscar nada, clica no link e garanta o seu kit hoje mesmo.'
    };

    const result = await runScene3BrainService(input);
    assert(
      result.speechActionSync.length >= 1 && result.speechActionSync.length <= 3,
      'TEST K1 — Exactly 1 to 3 speech-action synchronization items produced'
    );
    for (const item of result.speechActionSync) {
      assert(Boolean(item.spokenSegment && item.physicalAction), 'TEST K2 — Each sync item has non-empty spokenSegment and physicalAction');
    }
  } catch (err: any) {
    assert(false, 'TEST K — Speech Sync', err.message);
  }

  // TEST L: Scene 3 Compiler Compatibility
  try {
    const input: Scene3BrainInput = {
      product: {
        identity: 'Kit Toalhas de Banho Imperial 500g/m²',
        category: 'Banho',
        visibleDetails: [
          'Tecido encorpado com textura em relevo felpudo',
          'Tom cinza chumbo uniforme com barra acetinada',
          'Etiqueta discreta bordada na borda inferior'
        ],
        knownPhysicalFacts: [
          'Algodão 100% penteado com gramatura 500g/m²',
          'Alta absorção de água desde o primeiro uso',
          'Acabamento com costura reforçada e toque aveludado'
        ]
      },
      presenter: {
        identity: 'Adult Brazilian woman in her late 20s with natural wavy brown hair and expressive warm smile',
        gender: 'female'
      },
      wardrobe: {
        description: 'white basic plain t-shirt (crew neck), medium wash blue basic jeans, and white plain sneakers'
      },
      spokenCta: 'Se você também quer renovar o seu banho com toalha macia de verdade, clica aqui no link e garante o seu kit.'
    };

    const brainResult = await runScene3BrainService(input);
    const dynamicSlots = mapScene3BrainToDynamicSlots(input, brainResult);
    const compiledPrompt = compileScene3Prompt(dynamicSlots);

    assert(compiledPrompt.length > 500, 'TEST L1 — Compiled Scene 3 prompt is valid and >500 characters');
    assert(compiledPrompt.includes(input.spokenCta), 'TEST L2 — Compiled prompt contains exact immutable spoken CTA');
    assert(compiledPrompt.includes('=== SCENE 3: CONVERSION & CTA CLOSING (8 SECONDS) ==='), 'TEST L3 — Compiled prompt contains Scene 3 header');
  } catch (err: any) {
    assert(false, 'TEST L — Scene 3 Compiler Compatibility', err.message);
  }

  // TEST M: Scene 2 Isolation
  try {
    const scene2Skeleton = getScene2MasterTemplateSkeleton();
    assert(
      scene2Skeleton.includes('=== SCENE 2: SPOKEN BENEFIT & PHYSICAL DEMONSTRATION (8 SECONDS) ===') &&
      scene2Skeleton.includes('[BENEFIT DEMONSTRATION PRINCIPLE]'),
      'TEST M — Scene 2 Master Template is 100% intact and unaltered'
    );
  } catch (err: any) {
    assert(false, 'TEST M — Scene 2 Isolation', err.message);
  }

  // TEST N: Empty / Missing Spoken CTA Throws Typed Error
  try {
    let threw = false;
    try {
      await runScene3BrainService({
        product: { identity: 'Produto Teste', visibleDetails: ['detalhe'], knownPhysicalFacts: ['fato'] },
        presenter: { identity: 'Pessoa' },
        wardrobe: { description: 'Roupa' },
        spokenCta: ''
      });
    } catch (e: any) {
      if (e instanceof Scene3BrainValidationError && e.code === 'SCENE3_CTA_IMMUTABILITY_VIOLATED') {
        threw = true;
      }
    }
    assert(threw, 'TEST N — Empty spokenCta strictly throws Scene3BrainValidationError (SCENE3_CTA_IMMUTABILITY_VIOLATED)');
  } catch (err: any) {
    assert(false, 'TEST N — Empty / Missing Spoken CTA Throws Typed Error', err.message);
  }

  console.log('\n======================================================');
  console.log(`Scene 3 Brain Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  return { passed, failed };
}

// Direct execution when run via tsx
if (import.meta.url.endsWith('scene3BrainService.test.ts') || process.argv[1]?.includes('scene3BrainService.test')) {
  runAllScene3BrainTests();
}
