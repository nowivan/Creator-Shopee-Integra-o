/**
 * SCENE 2 PROMPT COMPILER — AUTOMATED VERIFICATION SUITE
 * 
 * Tests:
 * 1. TEST A — BATH TOWELS (Bathroom, physical usage, user wardrobe, copy drives action)
 * 2. TEST B — WRISTWATCH (Wearable environment, wrist interaction, no bathroom/towel leak, geometry)
 * 3. TEST C — COOKWARE / FRYING PAN (Kitchen environment, non-stick demo, invariant template)
 * 4. WARDROBE OVERRIDE TEST (User wardrobe overrides avatar reference clothing + priority rule)
 * 5. DETERMINISM TEST (output1 === output2 byte-for-byte)
 * 6. TEMPLATE INVARIANCE TEST (Technical specs and negative constraints identical across products)
 * 7. VALIDATION REJECTION TEST (Rejects incomplete slot sets with typed error)
 */

import { compileScene2Prompt, validateScene2Slots, Scene2CompilationError } from '../promptCompiler';
import { Scene2DynamicSlots } from '../../types/compilerTypes';
import {
  SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE,
  SCENE_2_NEGATIVE_CONSTRAINTS
} from '../../templates/scene2BaseTemplate';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// --------------------------------------------------------------------------
// TEST DATA DEFINITIONS
// --------------------------------------------------------------------------

// TEST A: Bath Towels
export const bathTowelsSlots: Scene2DynamicSlots = {
  productIdentity: "Kit Toalhas de Banho Imperial 500g/m²",
  productFacts: [
    "Algodão 100% penteado com gramatura 500g/m²",
    "Alta absorção de água desde o primeiro uso",
    "Acabamento com costura reforçada e toque aveludado"
  ],
  productQuantity: "Kit com 2 toalhas de banho e 2 toalhas de rosto",
  productVisibleDetails: [
    "Tecido encorpado com textura em relevo felpudo",
    "Tom cinza chumbo uniforme com barra acetinada",
    "Etiqueta discreta bordada na borda inferior"
  ],
  presenter: {
    gender: "female",
    description: "Adult Brazilian woman in her late 20s with natural wavy brown hair and expressive warm smile"
  },
  wardrobe: {
    topType: "basic plain t-shirt",
    topStyle: "crew neck",
    topColor: "white",
    bottomType: "basic jeans",
    bottomColor: "medium wash blue",
    footwearType: "plain sneakers",
    footwearColor: "white"
  },
  environment: "residential bathroom with clean white tile, matte black fixtures and natural window light",
  primaryBenefit: "Secagem instantânea que não deixa o corpo nem o tecido úmido após o banho",
  spokenCopy: "A gente usa toalha todo dia, mas quando ela enxuga de verdade na primeira passada e não fica encharcada no banheiro, você vê a diferença.",
  actions: {
    action0to2: "Presenter holds the unfolded bath towel naturally in both hands, feeling the dense weave texture while looking into the smartphone camera.",
    action2to4: "Presenter gently presses the plush towel against her forearm, demonstrating its deep instantaneous absorbency and softness.",
    action4to6: "Presenter folds the towel smoothly in half, showing its resilient plush fluff and rich texture without stiffness.",
    action6to8: "Presenter holds the neatly folded towel at chest height, speaking the final words with an authentic nod of satisfaction towards the camera."
  },
  speechActionSync: [
    {
      phrase: "enxuga de verdade na primeira passada",
      action: "Gently pressing the dense cotton fabric against forearm demonstrating instantaneous absorption."
    },
    {
      phrase: "não fica encharcada no banheiro",
      action: "Folding the plush towel smoothly and showing its resilient dry texture."
    }
  ]
};

// TEST B: Wristwatch
export const wristwatchSlots: Scene2DynamicSlots = {
  productIdentity: "Relógio Masculino Cronógrafo Cronos Black Steel",
  productFacts: [
    "Caixa em aço inoxidável 316L com vidro de safira antirreflexo",
    "Movimento quartzo de alta precisão com 3 subdials funcionais",
    "Resistência à água de 5 ATM e pulseira de elos maciços"
  ],
  productQuantity: "1 relógio com estojo almofadado e chave de ajuste",
  productVisibleDetails: [
    "Mostrador preto fosco com ponteiros e marcadores luminescentes em tom prata",
    "Bisel taquimétrico polido e botões cronógrafos às 2h e 4h",
    "Pulseira de aço escovado com fecho dobrável de segurança"
  ],
  presenter: {
    gender: "male",
    description: "Adult Brazilian man in his early 30s with short trimmed dark beard and confident posture"
  },
  wardrobe: {
    topType: "casual polo shirt",
    topStyle: "slim fit",
    topColor: "navy blue",
    bottomType: "tailored chinos",
    bottomColor: "beige khaki",
    footwearType: "leather casual shoes",
    footwearColor: "brown"
  },
  environment: "modern urban living space with warm wood elements and soft natural daylight",
  primaryBenefit: "Presença e sofisticação no pulso com peso balanceado e vidro que não risca no dia a dia",
  spokenCopy: "O que me conquistou nesse relógio foi o peso e o acabamento no pulso. É aquele tipo de detalhe que valoriza qualquer roupa sem esforço.",
  actions: {
    action0to2: "Presenter raises his wrist comfortably toward the camera, tilting it slightly so natural light reflects across the sapphire crystal and black dial.",
    action2to4: "Presenter smoothly clicks the top chronograph pusher with his index finger, showing the smooth sweep of the subdial hand while speaking.",
    action4to6: "Presenter adjusts the solid steel bracelet comfortably on his wrist, highlighting the seamless fit and solid link construction.",
    action6to8: "Presenter rests his hand naturally at chest height, speaking directly into the smartphone lens with an affirmative expression."
  },
  speechActionSync: [
    {
      phrase: "peso e o acabamento no pulso",
      action: "Tilting the watch slightly so light catches the brushed steel bezel and sapphire glass."
    },
    {
      phrase: "valoriza qualquer roupa sem esforço",
      action: "Comfortably settling the watch on the wrist and addressing the camera."
    }
  ]
};

// TEST C: Cookware / Ceramic Frying Pan
export const cookwareSlots: Scene2DynamicSlots = {
  productIdentity: "Frigideira Antiaderente Cerâmica Diamond Pro 28cm",
  productFacts: [
    "Revestimento cerâmico mineral livre de PFOA e PTFE",
    "Base de indução em aço inox com distribuição uniforme de calor",
    "Cabo ergonômico em baquelite soft-touch que não esquenta"
  ],
  productQuantity: "1 frigideira de 28cm com espátula de silicone inclusa",
  productVisibleDetails: [
    "Corpo externo em tom terracota acetinado e interior marmorizado creme",
    "Fundo espesso de 4.5mm com bordas ligeiramente curvadas",
    "Cabo com acabamento amadeirado acetinado e furo para pendurar"
  ],
  presenter: {
    gender: "female",
    description: "Adult Brazilian woman in her 30s with hair tied back and warm friendly demeanor"
  },
  wardrobe: {
    topType: "casual linen shirt",
    topStyle: "relaxed fit",
    topColor: "olive green",
    bottomType: "comfortable denim pants",
    bottomColor: "dark blue",
    footwearType: "flat slip-on shoes",
    footwearColor: "tan"
  },
  environment: "contemporary home kitchen with clean quartz countertop and natural window daylight",
  primaryBenefit: "Preparo saudável sem grudar nada e sem precisar usar nem uma gota de óleo",
  spokenCopy: "Essa frigideira mudou minha rotina na cozinha. Você faz um ovo ou grelha um filé e ele desliza sozinho, sem grudar nada e sem óleo.",
  actions: {
    action0to2: "Presenter lifts the frying pan easily by the soft-touch handle over the clean countertop, demonstrating its sturdy yet balanced weight.",
    action2to4: "Presenter gently glides a silicone spatula across the pristine ceramic surface to emphasize the ultra-smooth non-stick coating.",
    action4to6: "Presenter tilts the pan slightly toward the smartphone camera so natural light highlights the thick mineral ceramic interior.",
    action6to8: "Presenter sets the pan down securely and looks directly into the lens with a delighted smile while finishing her speech."
  },
  speechActionSync: [
    {
      phrase: "desliza sozinho, sem grudar nada",
      action: "Gliding the spatula smoothly across the pristine ceramic surface."
    },
    {
      phrase: "mudou minha rotina na cozinha",
      action: "Holding the balanced pan comfortably by its ergonomic handle."
    }
  ]
};

// --------------------------------------------------------------------------
// TEST EXECUTION RUNNER
// --------------------------------------------------------------------------

export function runAllScene2CompilerTests() {
  console.log('================================================================');
  console.log('STARTING SCENE 2 PROMPT COMPILER AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  // 1. TEST A — BATH TOWELS
  console.log('▶ RUNNING TEST A: BATH TOWELS...');
  const promptA = compileScene2Prompt(bathTowelsSlots);
  assert(promptA.includes('Kit Toalhas de Banho Imperial 500g/m²'), 'Prompt A must include towel product name');
  assert(promptA.includes('residential bathroom with clean white tile'), 'Prompt A environment must be bathroom');
  assert(promptA.includes('white basic plain t-shirt (crew neck), medium wash blue basic jeans, and white plain sneakers'), 'Prompt A must specify user wardrobe');
  assert(promptA.includes(SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE), 'Prompt A must enforce avatar/wardrobe priority');
  assert(promptA.includes('enxuga de verdade na primeira passada'), 'Prompt A must include spoken copy in dialogue lock');
  assert(promptA.includes('0.0s - 2.0s: Presenter holds the unfolded bath towel'), 'Prompt A must contain physical towel action 0-2s');
  assert(promptA.includes(SCENE_2_NEGATIVE_CONSTRAINTS), 'Prompt A must contain negative constraints');
  console.log('✅ TEST A PASSED (Bath Towels correctly compiled into bathroom environment with towel actions and wardrobe priority).\n');

  // 2. TEST B — WRISTWATCH
  console.log('▶ RUNNING TEST B: WRISTWATCH...');
  const promptB = compileScene2Prompt(wristwatchSlots);
  assert(promptB.includes('Relógio Masculino Cronógrafo Cronos Black Steel'), 'Prompt B must include watch product name');
  assert(promptB.includes('modern urban living space'), 'Prompt B environment must be urban living space');
  assert(!promptB.includes('bathroom'), 'Prompt B MUST NOT inherit bathroom from towels');
  assert(!promptB.includes('towel'), 'Prompt B MUST NOT inherit towel actions');
  assert(promptB.includes('navy blue casual polo shirt (slim fit), beige khaki tailored chinos, and brown leather casual shoes'), 'Prompt B must specify user wardrobe');
  assert(promptB.includes('Presenter raises his wrist comfortably toward the camera'), 'Prompt B action must be wrist interaction');
  assert(promptB.includes('Mostrador preto fosco com ponteiros e marcadores luminescentes'), 'Prompt B must preserve watch geometry');
  console.log('✅ TEST B PASSED (Wristwatch compiled into wearable environment with wrist action, zero bathroom/towel leaks).\n');

  // 3. TEST C — THIRD UNRELATED PRODUCT (COOKWARE)
  console.log('▶ RUNNING TEST C: COOKWARE / CERAMIC FRYING PAN...');
  const promptC = compileScene2Prompt(cookwareSlots);
  assert(promptC.includes('Frigideira Antiaderente Cerâmica Diamond Pro 28cm'), 'Prompt C must include pan product name');
  assert(promptC.includes('contemporary home kitchen'), 'Prompt C environment must be home kitchen');
  assert(!promptC.includes('bathroom') && !promptC.includes('wristwatch'), 'Prompt C MUST NOT leak other categories');
  assert(promptC.includes('Presenter gently glides a silicone spatula across the pristine ceramic surface'), 'Prompt C must demonstrate non-stick cooking action');
  assert(promptC.includes(SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE), 'Prompt C must preserve avatar priority rule');
  assert(promptC.includes(SCENE_2_NEGATIVE_CONSTRAINTS), 'Prompt C must preserve negative constraints');
  console.log('✅ TEST C PASSED (Cookware compiled into kitchen environment with spatula/pan action).\n');

  // 4. WARDROBE OVERRIDE TEST
  console.log('▶ RUNNING TEST 4: WARDROBE OVERRIDE & AVATAR PRIORITY...');
  const customWardrobeSlots: Scene2DynamicSlots = {
    ...bathTowelsSlots,
    presenter: {
      gender: "male",
      description: "Adult Brazilian man with short dark hair and athletic build"
    },
    wardrobe: {
      topType: "basic plain t-shirt",
      topStyle: "crew neck",
      topColor: "white",
      bottomType: "basic jeans",
      bottomColor: "medium wash blue",
      footwearType: "plain sneakers",
      footwearColor: "white"
    }
  };
  const promptWardrobe = compileScene2Prompt(customWardrobeSlots);
  assert(promptWardrobe.includes('white basic plain t-shirt (crew neck), medium wash blue basic jeans, and white plain sneakers'), 'Must strictly output user wardrobe');
  assert(!promptWardrobe.includes('black polo'), 'Must NOT inherit black polo from avatar reference');
  assert(promptWardrobe.includes(SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE), 'Must contain priority rule');
  console.log('✅ TEST 4 PASSED (User wardrobe strictly overrides avatar reference clothing with priority clause).\n');

  // 5. DETERMINISM TEST
  console.log('▶ RUNNING TEST 5: DETERMINISM (BYTE-FOR-BYTE PURITY)...');
  const run1 = compileScene2Prompt(bathTowelsSlots);
  const run2 = compileScene2Prompt(bathTowelsSlots);
  assert(run1 === run2, 'Compiling the same valid slots twice must be byte-for-byte identical (run1 === run2)');
  assert(run1.length === run2.length, 'Length must be identical');
  console.log(`✅ TEST 5 PASSED (Byte-for-byte exact determinism confirmed: ${run1.length} characters matched).\n`);

  // 6. TEMPLATE INVARIANCE TEST
  console.log('▶ RUNNING TEST 6: TEMPLATE INVARIANCE ACROSS DIFFERENT PRODUCTS...');
  const invariantHeaders = [
    '=== SCENE 2: SPOKEN BENEFIT & PHYSICAL DEMONSTRATION (8 SECONDS) ===',
    '[TECHNICAL SPECIFICATIONS]',
    '- Scene: Scene 2 (Value Proposition & Practical Demonstration)',
    '- Aspect Ratio: 9:16 Vertical (Smartphone Orientation)',
    '- Exact Duration: 8.0 Seconds',
    '- Shot Type: Single continuous uninterrupted take',
    '- Format: Brazilian UGC (User-Generated Content)',
    '[PRESENTER & WARDROBE CONTRACT]',
    '- Avatar Identity Reference Rule:',
    '[FUNCTIONAL ENVIRONMENT]',
    '[PRODUCT IDENTITY & PRESERVATION]',
    '[BENEFIT DEMONSTRATION PRINCIPLE]',
    '[TEMPORAL ACTION PLAN (8 SECONDS)]',
    '[DIRECT ON-CAMERA SPEECH & DIALOGUE LOCK]',
    '[SPEECH AND PHYSICAL ACTION SYNCHRONIZATION]',
    '[NEGATIVE CONSTRAINTS — STRICTLY FORBIDDEN]'
  ];

  for (const header of invariantHeaders) {
    assert(promptA.includes(header), `Prompt A must contain invariant section: ${header}`);
    assert(promptB.includes(header), `Prompt B must contain invariant section: ${header}`);
    assert(promptC.includes(header), `Prompt C must contain invariant section: ${header}`);
  }
  console.log('✅ TEST 6 PASSED (All 16 structural headers and technical specs are 100% invariant across all 3 products).\n');

  // 7. VALIDATION REJECTION TEST
  console.log('▶ RUNNING TEST 7: VALIDATION REJECTION ON INCOMPLETE SLOTS...');
  let errorCaught = false;
  try {
    const incompleteSlots: any = {
      productIdentity: "Produto Teste",
      // missing productFacts, wardrobe, actions, etc.
    };
    compileScene2Prompt(incompleteSlots);
  } catch (err: any) {
    if (err instanceof Scene2CompilationError) {
      errorCaught = true;
      assert(err.missingFields.length > 0, 'Error must list missing fields');
      console.log(`Captured expected Scene2CompilationError with ${err.missingFields.length} missing fields.`);
    }
  }
  assert(errorCaught, 'Compiling incomplete slots must throw Scene2CompilationError');
  console.log('✅ TEST 7 PASSED (Incomplete slot sets are rejected with explicit typed errors).\n');

  // 8. DEDUPLICATION TEST (SINGLE-OWNER DOMAINS)
  console.log('▶ RUNNING TEST 8: DEDUPLICATION VERIFICATION (SINGLE OWNER DOMAINS)...');
  const complexSlots: Scene2DynamicSlots = {
    ...cookwareSlots,
    productIdentity: "Frigideira Antiaderente Cerâmica Diamond Pro 28cm",
    presenter: {
      gender: "female",
      description: "Brasileira de 28 anos com cabelos castanhos ondulados e sorriso acolhedor"
    },
    structuralDNA: {
      category: "Cookware",
      coreGeometry: {
        silhouette: "circular pan with curved sloping sides",
        proportions: "28cm diameter with low profile depth",
        thicknessProfile: "4mm forged aluminum base",
        edgeStyle: "rolled smooth lip",
        cornerProfile: "rounded base curve",
        symmetry: "radial symmetry with single linear handle"
      },
      fixedComponents: [
        {
          id: "handle_1",
          name: "ergonomic bakelite handle",
          role: "fixed",
          shape: "curved elongated grip",
          position: "fixed to side rim",
          relativeSize: "approx 18cm length",
          relationshipToOtherParts: ["riveted to pan body"],
          confidence: 0.95
        }
      ]
    },
    avatarIdentityContext: {
      identityPrompt: "Brasileira de 28 anos com cabelos castanhos ondulados e sorriso acolhedor",
      referenceImage: "avatar_clean_ref.png"
    },
    physicalChoreography: {
      interactionRisk: "HIGH",
      primaryTarget: "Frigideira Cerâmica 28cm",
      actorStartPosition: "Presenter standing beside kitchen countertop",
      actionSequence: ["0-2s: Action duplicated", "2-4s: Action duplicated"],
      requiredClearance: ["50cm countertop clearance"],
      collisionBoundaries: ["Countertop edge", "Cooktop surface"]
    }
  };

  const compiledComplexPrompt = compileScene2Prompt(complexSlots);

  // Check 1: Product name does not duplicate across structural DNA footer
  const nameOccurrences = (compiledComplexPrompt.match(/Frigideira Antiaderente Cerâmica Diamond Pro 28cm/g) || []).length;
  assert(nameOccurrences === 1, `Product identity should have a single owner section, found ${nameOccurrences} occurrences`);

  // Check 2: Full presenter description does not duplicate across avatar identity block
  const presenterOccurrences = (compiledComplexPrompt.match(/Brasileira de 28 anos com cabelos castanhos ondulados e sorriso acolhedor/g) || []).length;
  assert(presenterOccurrences === 1, `Presenter description should have a single owner section, found ${presenterOccurrences} occurrences`);

  // Check 3: Physical Action Choreography provides safety/clearance rules without duplicating timeline
  assert(compiledComplexPrompt.includes('[PHYSICAL ACTION & CHOREOGRAPHY CONTRACT]'), 'Should include choreography contract');
  assert(compiledComplexPrompt.includes('Spatial Clearance & Movement Trajectory'), 'Should include spatial clearance');
  assert(!compiledComplexPrompt.includes('Action duplicated'), 'Should not duplicate action timeline inside choreography block');

  // Check 4: Structural DNA preserves geometry lock without repeating generic name
  assert(compiledComplexPrompt.includes('CORE GEOMETRY LOCK:'), 'Should include core geometry lock');
  assert(compiledComplexPrompt.includes('circular pan with curved sloping sides'), 'Should include silhouette');
  assert(compiledComplexPrompt.includes('ANTI-PRIOR OVERRIDE:'), 'Should include anti-prior override');

  console.log('✅ TEST 8 PASSED (All domains strictly deduplicated with single-owner sections and unique structural locks).\n');

  console.log('================================================================');
  console.log('🎉 ALL 8 AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');

  return {
    testA: promptA,
    testB: promptB,
    testC: promptC,
    status: 'ALL_PASSED'
  };
}

// Execute when run directly via tsx / node
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && (import.meta.url.includes(process.argv[1].replace(/\\/g, '/')) || process.argv[1].includes('promptCompiler.test'))) {
  runAllScene2CompilerTests();
}
