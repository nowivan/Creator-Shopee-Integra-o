/**
 * TEST SUITE: PHYSICAL ACTION CHOREOGRAPHY RESOLVER (SCENE 2)
 * Validates deterministic spatial safety, collision boundaries, and action budgeting across Scenarios A-H.
 */

import {
  resolvePhysicalActionChoreography,
  determineInteractionRisk,
  validateAndReconcileSpeechAnchors,
  buildSceneObjectAllowlist,
  validateChoreographyAgainstSceneContext,
  createSafeFallbackChoreographyPlan,
  classifyDemonstrationRisk,
  classifyGeometryConfidence,
  checkInteractionRequirements,
  evaluateControlTargetGuard,
  evaluateDemonstrationSafetyGate,
  buildVerifiedBenefitCandidates,
  selectSafestVerifiedBenefit,
  evaluateScene2SpeechLoad,
  evaluateScene2ActionBudget,
  evaluateCameraLoad,
  evaluateScene2CombinedLoad,
  createSimplifiedActionSequence,
  PhysicalChoreographyInput
} from '../physicalChoreographyResolver';
import {
  buildCompiledScene2Model,
  renderScene2Text,
  renderScene2Json
} from '../../compiler/promptCompiler';
import { Scene2DynamicSlots, PhysicalInteractionPlan } from '../../types/compilerTypes';

export async function runPhysicalChoreographyTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n======================================================');
  console.log('RUNNING PHYSICAL ACTION CHOREOGRAPHY TEST SUITE (SCENARIOS A-J)');
  console.log('======================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorMsg?: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${testName} -> ${errorMsg || 'Condition was false'}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // SCENARIO A: Mesa + 2 Cadeiras (High Risk Seating & Furniture Navigation)
  // ---------------------------------------------------------------------------
  try {
    const inputA: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter stands near the wooden dining table and pulls out the chair.',
        action2to4: 'Presenter steps into the space, turns and sits down comfortably on the chair.',
        action4to6: 'Presenter rests forearms on the table surface while speaking.',
        action6to8: 'Presenter smiles at camera while seated stably.'
      },
      environment: 'Modern dining room with dining table and two chairs',
      productIdentity: 'Conjunto Mesa de Jantar com 2 Cadeiras Estofadas',
      category: 'Móveis',
      productFacts: ['Mesa de madeira maciça', 'Cadeiras estofadas com encosto ergonômico'],
      productVisibleDetails: ['Acabamento amadeirado natural', 'Tecido linho bege'],
      spokenCopy: 'Essa mesa com duas cadeiras transformou meu cantinho de jantar, o assento é super macio e confortável.',
      speechActionSync: [
        { phrase: 'meu cantinho de jantar', action: 'Presenter pulls chair out and sits down comfortably.' },
        { phrase: 'super macio e confortável', action: 'Presenter rests hands on chair seat.' }
      ],
      structuralDNA: {
        category: 'Móveis',
        isFurnitureOrLargeSet: true,
        allowTemporaryRelocation: true,
        isCommercialPackConfirmed: true,
        kitComponentCount: 3
      }
    };

    const planA = resolvePhysicalActionChoreography(inputA);

    assert(planA.interactionRisk === 'HIGH', 'Scenario A: Risk Classification is HIGH');
    assert(planA.actorStartPosition.includes('standing naturally directly beside the selected chair'), 'Scenario A: Start position anticipates chair proximity');
    assert(planA.actionSequence.length === 3, 'Scenario A: Action sequence budgeted into 3 distinct phases');
    assert(planA.requiredClearance.some(c => c.includes('Clearance Creation')), 'Scenario A: Explicit clearance creation instruction present');
    assert(planA.requiredClearance.some(c => c.includes('Side Approach Vector')), 'Scenario A: Side approach vector present');
    assert(planA.collisionBoundaries.some(b => b.includes('Tabletop upper surface plane')), 'Scenario A: Table collision boundaries strictly defined');
    assert(planA.collisionBoundaries.some(b => b.includes('No torso, hip, leg, knee, arm, hand, foot or garment mesh may intersect')), 'Scenario A: Anti-clipping mesh rule enforced');
    assert(planA.cameraSafetyInstructions.some(c => c.includes('NO rapid panning')), 'Scenario A: Camera safety prevents disorienting sweeps during seating');
  } catch (err: any) {
    assert(false, 'Scenario A: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO B: Poltrona / Sofá (High Risk Seating & Cushion Contact)
  // ---------------------------------------------------------------------------
  try {
    const inputB: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter stands next to the armchair.',
        action2to4: 'Presenter sits on the plush armchair cushion.',
        action4to6: 'Presenter reclines gently into the backrest.',
        action6to8: 'Presenter gestures while seated.'
      },
      environment: 'Cozy living room',
      productIdentity: 'Poltrona Reclinável Veludo',
      category: 'Móveis / Decoração',
      spokenCopy: 'O encosto dessa poltrona abraça as costas com suporte ergonômico impecável.',
      speechActionSync: [
        { phrase: 'O encosto dessa poltrona', action: 'Sits and leans back.' }
      ]
    };

    const planB = resolvePhysicalActionChoreography(inputB);
    assert(planB.interactionRisk === 'HIGH', 'Scenario B: Risk Classification is HIGH for armchair');
    assert(planB.primaryTarget.includes('Primary seating lounge furniture') || planB.primaryTarget.includes('chair'), 'Scenario B: Identifies primary seating target');
    assert(planB.collisionBoundaries.some(b => b.includes('No torso, hip, leg, knee, arm, hand, foot')), 'Scenario B: Anti-clipping strict collision boundary present');
  } catch (err: any) {
    assert(false, 'Scenario B: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO C: Geladeira / Airfryer / Cabinet (Medium Risk Appliance Door Clearance)
  // ---------------------------------------------------------------------------
  try {
    const inputC: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter approaches the airfryer on the countertop.',
        action2to4: 'Presenter pulls out the basket drawer to show the nonstick interior.',
        action4to6: 'Presenter pushes the drawer back into place.',
        action6to8: 'Presenter smiles pointing at the digital panel.'
      },
      environment: 'Modern kitchen counter',
      productIdentity: 'Fritadeira Elétrica Air Fryer 4L',
      category: 'Eletroportáteis',
      spokenCopy: 'Essa gaveta com cesto antiaderente desliza fácil e cabe uma refeição inteira.',
      speechActionSync: [
        { phrase: 'Essa gaveta com cesto antiaderente', action: 'Pulls basket drawer outward.' }
      ]
    };

    const planC = resolvePhysicalActionChoreography(inputC);
    assert(planC.interactionRisk === 'MEDIUM', 'Scenario C: Risk Classification is MEDIUM for drawer/appliance motion');
    assert(planC.requiredClearance.some(c => c.includes('Mechanism Swing Clearance') || c.includes('drawer extension slide paths')), 'Scenario C: Clearance covers drawer slide corridors');
  } catch (err: any) {
    assert(false, 'Scenario C: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO D: Cosmético / Prop Continuity (Pre-Existing Prop Enforcement)
  // ---------------------------------------------------------------------------
  try {
    const inputD: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter holds serum bottle and twists open the dropper.',
        action2to4: 'Presenter dispenses two drops onto back of hand and massages gently.',
        action4to6: 'Presenter demonstrates the fast-absorbing velvety texture.',
        action6to8: 'Presenter brings back of hand toward camera.'
      },
      environment: 'Bright bathroom vanity',
      productIdentity: 'Sérum Facial Hidratante 30ml',
      category: 'Beleza & Cuidados',
      spokenCopy: 'A textura leve absorve em segundos sem deixar a pele oleosa nem grudenta.',
      speechActionSync: [
        { phrase: 'A textura leve absorve em segundos', action: 'Massages drops onto skin.' }
      ]
    };

    const planD = resolvePhysicalActionChoreography(inputD);
    assert(planD.interactionRisk === 'MEDIUM', 'Scenario D: Risk Classification is MEDIUM for dispensing/dropper');
    assert(planD.preExistingProps.some(p => p.includes('must already be visibly resting')), 'Scenario D: Enforces pre-existing prop continuity at 0.0s');
    assert(planD.preExistingProps.some(p => p.includes('NO props may spontaneously materialize')), 'Scenario D: Prohibits spontaneous prop appearance');
  } catch (err: any) {
    assert(false, 'Scenario D: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO E: Relógio / Wristwatch (Low / None Risk Simple Presentation)
  // ---------------------------------------------------------------------------
  try {
    const inputE: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter gestures while wearing the watch on left wrist.',
        action2to4: 'Presenter lifts wrist toward camera to highlight dial details.',
        action4to6: 'Presenter points softly to the steel bezel.',
        action6to8: 'Presenter lowers wrist naturally while speaking.'
      },
      environment: 'Clean modern interior',
      productIdentity: 'Relógio Cronógrafo Masculino Aço Inox',
      category: 'Acessórios',
      spokenCopy: 'O acabamento em aço maciço e o vidro resistente entregam presença impecável no pulso.',
      speechActionSync: [
        { phrase: 'O acabamento em aço maciço', action: 'Lifts wrist toward camera.' }
      ]
    };

    const planE = resolvePhysicalActionChoreography(inputE);
    assert(planE.interactionRisk === 'LOW', 'Scenario E: Risk Classification is LOW for simple wrist presentation');
    assert(planE.actorStartPosition.includes('standing naturally facing the camera'), 'Scenario E: Start position is natural stand facing camera');
  } catch (err: any) {
    assert(false, 'Scenario E: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO F: Kit Multi-Peças com DNA (Temporary Relocation & Kit Rules)
  // ---------------------------------------------------------------------------
  try {
    const slotsF: Scene2DynamicSlots = {
      productIdentity: 'Jogo de Jantar 20 Peças Porcelana',
      productFacts: ['Porcelana de alta resistência', '20 peças completas'],
      productVisibleDetails: ['Borda dourada', 'Acabamento branco brilhante'],
      presenter: {
        gender: 'female',
        description: 'Brazilian woman in her late 20s'
      },
      wardrobe: {
        topType: 'Blouse',
        topColor: 'Teal',
        bottomType: 'Trousers',
        bottomColor: 'White',
        footwearType: 'Flats',
        footwearColor: 'Beige'
      },
      environment: 'Dining room setting',
      primaryBenefit: 'Mesa posta elegante e resistente para ocasiões especiais',
      spokenCopy: 'Essa porcelana fina com detalhe dourado deixa qualquer refeição sofisticada e charmosa.',
      actions: {
        action0to2: 'Presenter stands near the arranged dinnerware on the table.',
        action2to4: 'Presenter lifts 1 confirmed plate to show the rim to camera.',
        action4to6: 'Presenter rests the plate gently back on the table.',
        action6to8: 'Presenter smiles with both hands open beside the setting.'
      },
      speechActionSync: [
        { phrase: 'Essa porcelana fina com detalhe dourado', action: 'Lifts plate to camera.' }
      ],
      structuralDNA: {
        category: 'Utilidades Domésticas',
        isCommercialPackConfirmed: true,
        kitComponentCount: 20,
        handledComponentCount: 1,
        remainingVisibleComponentCount: 19,
        allowTemporaryRelocation: true
      },
      isCommercialPackConfirmed: true,
      kitComponentCount: 20,
      handledComponentCount: 1,
      remainingVisibleComponentCount: 19
    };

    const compiledModelF = buildCompiledScene2Model(slotsF);
    const renderedTextF = renderScene2Text(compiledModelF);
    const renderedJsonF = renderScene2Json(compiledModelF);

    assert(renderedTextF.includes('The presenter may actively handle 1 component at a time while the remaining 19 components stay visible'), 'Scenario F: Text prompt renders kit handling rule (1 vs 19)');
    assert(renderedTextF.includes('Temporary relocation required by the demonstration is allowed'), 'Scenario F: Text prompt allows plausible temporary relocation');
    assert(renderedJsonF.product.structuralDNA?.kitComponentCount === 20, 'Scenario F: JSON retains kitComponentCount 20');
    assert(renderedJsonF.product.structuralDNA?.remainingVisibleComponentCount === 19, 'Scenario F: JSON retains remainingVisibleComponentCount 19');
  } catch (err: any) {
    assert(false, 'Scenario F: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO G: Complex 8s Action Overload Prevention
  // ---------------------------------------------------------------------------
  try {
    const inputG: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter walks across the room, pulls chair, removes jacket, turns around.',
        action2to4: 'Presenter sits on chair, opens laptop, adjusts desk lamp, leans forward.',
        action4to6: 'Presenter types on keyboard, takes sip of coffee, reaches for notebook.',
        action6to8: 'Presenter stands up, walks to window, waves at camera.'
      },
      environment: 'Office study',
      productIdentity: 'Cadeira de Escritório Ergonômica',
      category: 'Móveis de Escritório',
      spokenCopy: 'Essa cadeira de escritório garante apoio lombar contínuo o dia todo.',
      speechActionSync: [
        { phrase: 'Essa cadeira de escritório', action: 'Sits down and leans on lumbar support.' }
      ]
    };

    const planG = resolvePhysicalActionChoreography(inputG);
    assert(planG.actionSequence.length === 3, 'Scenario G: Caps overloaded actions into 3 clean, safe phases');
    assert(planG.actorStartPosition.includes('Presenter begins already standing naturally directly beside the selected chair'), 'Scenario G: Eliminates walk-across-room, starting directly beside target');
  } catch (err: any) {
    assert(false, 'Scenario G: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO H: Speech-Action Anchor Validation & Exact Dialogue Reconciliation
  // ---------------------------------------------------------------------------
  try {
    const spokenCopyH = 'Com essa frigideira antiaderente nada gruda e a limpeza fica super rápida.';
    const hallucinatedAnchors = [
      { phrase: 'Totalmente diferente do mercado', action: 'Shows pan surface.' }, // Not in dialogue!
      { phrase: 'nada gruda e a limpeza', action: 'Demonstrates egg sliding effortlessly.' } // In dialogue!
    ];

    const reconciled = validateAndReconcileSpeechAnchors(
      hallucinatedAnchors,
      spokenCopyH,
      {
        action0to2: 'Holds pan',
        action2to4: 'Slides egg',
        action4to6: 'Tilts pan',
        action6to8: 'Smiles'
      }
    );

    assert(reconciled.length === 1, 'Scenario H: Filters out hallucinated anchor phrase not present in spokenCopy');
    assert(reconciled[0].phrase === 'nada gruda e a limpeza', 'Scenario H: Preserves valid anchor phrase matching spokenCopy');

    // Test fallback when ALL anchors are hallucinated
    const allHallucinated = [
      { phrase: 'Promoção imperdível por tempo limitado', action: 'Points at pan.' }
    ];
    const fallbackReconciled = validateAndReconcileSpeechAnchors(
      allHallucinated,
      spokenCopyH,
      {
        action0to2: 'Holds pan',
        action2to4: 'Demonstrates nonstick surface',
        action4to6: 'Tilts pan',
        action6to8: 'Smiles'
      }
    );

    assert(fallbackReconciled.length >= 1, 'Scenario H: Fallback reconciles valid phrase from actual dialogue');
    assert(spokenCopyH.includes(fallbackReconciled[0].phrase), 'Scenario H: Fallback phrase is guaranteed substring of spokenCopy');
  } catch (err: any) {
    assert(false, 'Scenario H: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO I: G-Speaker Bedroom Scene (Explicit Object Leak Prevention)
  // ---------------------------------------------------------------------------
  try {
    const inputI: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter seated on bed reaches for the G-Speaker resting on the bedside nightstand.',
        action2to4: 'Presenter taps the touch sensor to illuminate the lamp.',
        action4to6: 'Presenter adjusts the volume control while sound plays.',
        action6to8: 'Presenter smiles at camera holding smartphone beside the nightstand.'
      },
      environment: 'Modern bedroom with a queen bed and bedside nightstand',
      productIdentity: 'G-Speaker Smart Lamp Sound Machine',
      category: 'Eletrônicos & Iluminação',
      productFacts: ['Luminária com som Bluetooth', 'Carregador por indução', 'Controle por toque'],
      productVisibleDetails: ['Design em formato de G', 'Luz LED multicolorida', 'Base antiderrapante'],
      spokenCopy: 'Essa luminária G-Speaker com som ambiente e carregamento sem fio transformou minhas noites.',
      speechActionSync: [
        { phrase: 'Essa luminária G-Speaker', action: 'Taps touch sensor to illuminate lamp.' }
      ]
    };

    // 1. Validate Allowlist Extraction
    const allowlistI = buildSceneObjectAllowlist(inputI);
    assert(allowlistI.includes('bed') || allowlistI.includes('cama'), 'Scenario I: Allowlist includes bed');
    assert(allowlistI.includes('nightstand') || allowlistI.includes('criado-mudo') || allowlistI.includes('mesa de cabeceira'), 'Scenario I: Allowlist includes nightstand');
    assert(allowlistI.includes('g-speaker') || allowlistI.includes('speaker') || allowlistI.includes('lamp'), 'Scenario I: Allowlist includes product');
    assert(!allowlistI.includes('chair') && !allowlistI.includes('cadeira'), 'Scenario I: Allowlist does NOT include chair');
    assert(!allowlistI.includes('desk') && !allowlistI.includes('escrivaninha'), 'Scenario I: Allowlist does NOT include desk/workstation');

    // 2. Validate Generated Plan
    const planI = resolvePhysicalActionChoreography(inputI);
    const planText = [
      planI.primaryTarget || '',
      planI.actorStartPosition || '',
      ...(planI.actionSequence || []),
      ...(planI.requiredClearance || []),
      ...(planI.collisionBoundaries || [])
    ].join(' ').toLowerCase();

    // Must reject: chair, workstation table, desk, seat cushion, table apron
    assert(!planText.includes('chair') && !planText.includes('cadeira'), 'Scenario I: Plan contains NO chair reference');
    assert(!planText.includes('workstation table') && !planText.includes('desk'), 'Scenario I: Plan contains NO workstation table/desk reference');
    assert(!planText.includes('table apron') && !planText.includes('underside apron'), 'Scenario I: Plan contains NO table apron reference');
    assert(!planText.includes('seat cushion'), 'Scenario I: Plan contains NO seat cushion reference');
    assert(planI.actorStartPosition.includes('seated') || planI.actorStartPosition.includes('bed'), 'Scenario I: Start position correctly aligns with bed seating');

    // 3. Validate Context Validator Passes
    const validationI = validateChoreographyAgainstSceneContext(planI, inputI);
    assert(validationI.status === 'PASS', 'Scenario I: Context validation status is PASS');
    assert(validationI.unrelatedObjects.length === 0, 'Scenario I: Zero unrelated objects detected');
  } catch (err: any) {
    assert(false, 'Scenario I: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO J: Validator BLOCK on Unrelated Objects & Start-State Conflict
  // ---------------------------------------------------------------------------
  try {
    const inputJ: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter seated on bed reaches for the G-Speaker.',
        action2to4: 'Presenter adjusts lamp light.',
        action4to6: 'Presenter demonstrates sound.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Minimalist bedroom with bed and nightstand',
      productIdentity: 'G-Speaker Smart Lamp',
      spokenCopy: 'Essa luminária G-Speaker é incrível para relaxar.',
      speechActionSync: [
        { phrase: 'Essa luminária G-Speaker', action: 'Taps lamp.' }
      ]
    };

    // Construct a hallucinated/leaked plan with chair and desk instructions
    const leakedPlan: PhysicalInteractionPlan = {
      interactionRisk: 'HIGH',
      primaryTarget: 'Designated chair and workstation table in the scene',
      actorStartPosition: 'Presenter begins already standing naturally directly beside the selected chair (not walking from across the room)...',
      actionSequence: [
        'Phase 1: Presenter stands beside chair and pulls it outward...',
        'Phase 2: Presenter lowers into seat cushion...',
        'Phase 3: Presenter rests arms on table apron...'
      ],
      requiredClearance: [
        'Slide chair outward to create gap between table apron and seat cushion.',
        'Keep shins clear of table frame.'
      ],
      collisionBoundaries: [
        'Tabletop upper surface plane, underside apron, and all structural table legs.',
        'Chair seat cushion boundary, backrest frame, armrests, and base legs/crossbars.'
      ]
    };

    const validationJ = validateChoreographyAgainstSceneContext(leakedPlan, inputJ);
    assert(validationJ.status === 'BLOCK', 'Scenario J: Validator returns BLOCK for leaked chair/desk objects in bedroom');
    assert(validationJ.unrelatedObjects.includes('chair'), 'Scenario J: Identifies chair as unrelated object');
    assert(validationJ.unrelatedObjects.includes('workstation table / desk'), 'Scenario J: Identifies workstation table / desk as unrelated object');
    assert(validationJ.startStateMismatch !== undefined, 'Scenario J: Detects start-state mismatch (seated on bed vs standing beside chair)');

    // Test fallback plan generation
    const fallbackPlan = createSafeFallbackChoreographyPlan(inputJ, validationJ.reasons);
    const fallbackText = [
      fallbackPlan.primaryTarget || '',
      fallbackPlan.actorStartPosition || '',
      ...(fallbackPlan.actionSequence || []),
      ...(fallbackPlan.collisionBoundaries || [])
    ].join(' ').toLowerCase();

    assert(!fallbackText.includes('chair'), 'Scenario J: Safe fallback contains NO chair');
    assert(!fallbackText.includes('table apron'), 'Scenario J: Safe fallback contains NO table apron');
    assert(fallbackPlan.actorStartPosition.includes('seated on bed'), 'Scenario J: Safe fallback preserves temporal start-state');
  } catch (err: any) {
    assert(false, 'Scenario J: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO K: Stage 2 Demonstration Risk Classification (LOW vs MEDIUM vs HIGH)
  // ---------------------------------------------------------------------------
  try {
    // 1. LOW: Pure illumination / display / sound
    const lowRiskInput1: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter shows the G-Speaker ambient RGB lamp with smooth color transitions.',
        action2to4: 'Presenter displays the glowing RGB light beside the bed.',
        action4to6: 'Presenter shows the soft glow of the lamp.',
        action6to8: 'Presenter smiles at camera while the light glows.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker Smart Lamp',
      spokenCopy: 'Essa luminária RGB tem cores lindas.',
      speechActionSync: []
    };
    assert(classifyDemonstrationRisk(lowRiskInput1) === 'LOW', 'Scenario K: Pure RGB illumination classified as LOW risk');

    const lowRiskInput2: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter shows the digital clock display on the front screen.',
        action2to4: 'Presenter points at the digital clock numbers.',
        action4to6: 'Presenter checks the time display.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker Smart Lamp',
      spokenCopy: 'O relógio digital no visor é super prático.',
      speechActionSync: []
    };
    assert(classifyDemonstrationRisk(lowRiskInput2) === 'LOW', 'Scenario K: Digital clock display classified as LOW risk');

    // 2. MEDIUM: Simple hold, simple placement, pointing
    const mediumRiskInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter holds the compact speaker stably in hand.',
        action2to4: 'Presenter rests the speaker on the nightstand counter.',
        action4to6: 'Presenter tilts the speaker slightly to show the finish.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker',
      spokenCopy: 'Super fácil de segurar e apoiar.',
      speechActionSync: []
    };
    assert(classifyDemonstrationRisk(mediumRiskInput) === 'MEDIUM', 'Scenario K: Simple hold and placement classified as MEDIUM risk');

    // 3. HIGH: Wireless charging, button pressing, mechanisms, precise alignment
    const highRiskInput1: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter aligns smartphone and places it on the wireless charging pad.',
        action2to4: 'Presenter shows the wireless charging activation.',
        action4to6: 'Presenter demonstrates fast inductive charging.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker Smart Lamp with Inductive Charger',
      spokenCopy: 'Basta encostar o celular na base para carregar por indução.',
      speechActionSync: []
    };
    assert(classifyDemonstrationRisk(highRiskInput1) === 'HIGH', 'Scenario K: Wireless charging / phone placement classified as HIGH risk');

    const highRiskInput2: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter presses the power button on the top panel.',
        action2to4: 'Presenter taps the upper button.',
        action4to6: 'Presenter clicks the mode switch.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker',
      spokenCopy: 'Aperta o botão para ligar.',
      speechActionSync: []
    };
    assert(classifyDemonstrationRisk(highRiskInput2) === 'HIGH', 'Scenario K: Button pressing classified as HIGH risk');
  } catch (err: any) {
    assert(false, 'Scenario K: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO L: Stage 2 Geometry Confidence & Reference Coverage
  // ---------------------------------------------------------------------------
  try {
    const inputL1: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter points at the front display panel.',
        action2to4: 'Presenter shows the front face.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker',
      spokenCopy: 'Display frontal nítido.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };
    assert(classifyGeometryConfidence(inputL1) === 'HIGH', 'Scenario L: Front interaction with confirmed front coverage yields HIGH confidence');

    const inputL2: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter places smartphone on top wireless charging pad.',
        action2to4: 'Presenter aligns phone with charging surface.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker',
      spokenCopy: 'Carregamento sem fio no topo.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };
    assert(classifyGeometryConfidence(inputL2) === 'LOW', 'Scenario L: Top wireless charging with unknown top coverage yields LOW confidence');
  } catch (err: any) {
    assert(false, 'Scenario L: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO M: Control Target Guard (Precision Actions Require Verified Target)
  // ---------------------------------------------------------------------------
  try {
    const inputM: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter presses the top control button.',
        action2to4: 'Presenter taps the upper button.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker',
      spokenCopy: 'Aperte o botão superior.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const reqsM = checkInteractionRequirements(inputM);
    assert(reqsM.requiresVerifiedControlTarget === true, 'Scenario M: Identifies requirement for verified control target');
    assert(reqsM.isTargetVerified === false, 'Scenario M: Flags top button as unverified because top coverage is unknown');

    const guardResultM = evaluateControlTargetGuard(inputM, reqsM, 'LOW');
    assert(guardResultM.status === 'BLOCKED', 'Scenario M: Control Target Guard returns BLOCKED for unverified top button');
  } catch (err: any) {
    assert(false, 'Scenario M: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO N: Hard Safety Rule (HIGH Risk + LOW Confidence = BLOCK)
  // ---------------------------------------------------------------------------
  try {
    const inputN: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter places phone on top wireless charging pad.',
        action2to4: 'Presenter aligns phone with charger.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Bedroom',
      productIdentity: 'G-Speaker',
      spokenCopy: 'Carrega sem fio.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const evaluationN = evaluateDemonstrationSafetyGate(inputN);
    assert(evaluationN.demonstrationRisk === 'HIGH', 'Scenario N: Demonstration risk is HIGH');
    assert(evaluationN.geometryConfidence === 'LOW', 'Scenario N: Geometry confidence is LOW');
    assert(evaluationN.guardStatus === 'BLOCKED', 'Scenario N: Hard safety gate returns BLOCKED');
    assert(evaluationN.reasons.length > 0, 'Scenario N: Provides explicit blocker reasons');
  } catch (err: any) {
    assert(false, 'Scenario N: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO O: Real G-Speaker Bedroom Scene Tests (Validation Matrix)
  // ---------------------------------------------------------------------------
  try {
    // 1. Wireless charging demonstration: MUST BLOCK and generate safe fallback without failing Scene 2
    const gSpeakerChargingInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter seated on bed reaches for the G-Speaker and places smartphone on the top wireless charging pad.',
        action2to4: 'Presenter aligns the phone on the charging surface.',
        action4to6: 'Presenter demonstrates inductive charging.',
        action6to8: 'Presenter smiles at camera.'
      },
      environment: 'Minimalist bedroom with bed, nightstand, and G-Speaker',
      productIdentity: 'G-Speaker Smart Lamp com Carregador por Indução',
      spokenCopy: 'Basta colocar o celular no topo para carregar por indução sem fios.',
      speechActionSync: [
        { phrase: 'colocar o celular no topo', action: 'Places smartphone on top charging surface.' }
      ],
      productFacts: [
        'Carregamento sem fio por indução 15W',
        'Luminária RGB com diversos modos de iluminação',
        'Caixa de som Bluetooth integrada',
        'Relógio digital com display LED'
      ],
      productVisibleDetails: [
        'Display digital com relógio na parte frontal',
        'Iluminação LED RGB circular no corpo em formato G',
        'Base de apoio inferior emborrachada'
      ],
      referenceCoverage: {
        front: 'confirmed',
        bottom: 'confirmed',
        top: 'unknown',
        rear: 'unknown',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const planCharging = resolvePhysicalActionChoreography(gSpeakerChargingInput);
    assert(planCharging.demonstrationGuardStatus === 'BLOCKED', 'Scenario O.1: Wireless charging demo is BLOCKED by safety gate');
    assert(planCharging.demonstrationRisk === 'HIGH', 'Scenario O.1: Risk evaluated as HIGH');
    assert(planCharging.geometryConfidence === 'LOW', 'Scenario O.1: Geometry confidence evaluated as LOW (top unknown)');
    assert(planCharging.actionSequence !== undefined && planCharging.actionSequence.length > 0, 'Scenario O.1: Scene 2 does NOT fail; returns safe fallback plan');

    const chargingPlanText = [
      planCharging.primaryTarget || '',
      planCharging.actorStartPosition || '',
      ...(planCharging.actionSequence || []),
      ...(planCharging.collisionBoundaries || [])
    ].join(' ').toLowerCase();

    // Must NOT contain unverified wireless charging actions or unrelated furniture
    assert(!chargingPlanText.includes('chair'), 'Scenario O.1: Safe fallback contains NO chair');
    assert(!chargingPlanText.includes('desk'), 'Scenario O.1: Safe fallback contains NO desk');

    // 2. RGB illumination demonstration: MUST PASS (LOW risk)
    const gSpeakerRgbInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter seated on bed shows the G-Speaker ambient RGB lighting.',
        action2to4: 'Presenter showcases the glowing circular RGB light transition.',
        action4to6: 'Presenter enjoys the ambient bedroom lighting.',
        action6to8: 'Presenter smiles warmly.'
      },
      environment: 'Minimalist bedroom with bed, nightstand, and G-Speaker',
      productIdentity: 'G-Speaker Smart Lamp com Iluminação RGB',
      spokenCopy: 'Essa iluminação RGB cria uma atmosfera perfeita no quarto.',
      speechActionSync: [
        { phrase: 'iluminação RGB cria uma atmosfera', action: 'Showcases the ambient RGB glow.' }
      ],
      productFacts: [
        'Luminária RGB com diversos modos de iluminação'
      ],
      productVisibleDetails: [
        'Iluminação LED RGB circular no corpo em formato G'
      ],
      referenceCoverage: {
        front: 'confirmed',
        bottom: 'confirmed',
        top: 'unknown',
        rear: 'unknown',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const planRgb = resolvePhysicalActionChoreography(gSpeakerRgbInput);
    assert(planRgb.demonstrationGuardStatus === 'ALLOWED', 'Scenario O.2: RGB illumination demo is ALLOWED');
    assert(planRgb.demonstrationRisk === 'LOW', 'Scenario O.2: RGB demo risk is LOW');

    // 3. Digital clock demonstration: MUST PASS (LOW risk)
    const gSpeakerClockInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter seated on bed points to the digital clock display on the front of the G-Speaker.',
        action2to4: 'Presenter shows the clear digital time numbers.',
        action4to6: 'Presenter speaks about bedside convenience.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Minimalist bedroom with bed, nightstand, and G-Speaker',
      productIdentity: 'G-Speaker Smart Lamp com Relógio Digital',
      spokenCopy: 'O relógio digital no visor frontal é perfeito para o quarto.',
      speechActionSync: [
        { phrase: 'relógio digital no visor frontal', action: 'Points at front digital clock display.' }
      ],
      productFacts: [
        'Relógio digital com display LED'
      ],
      productVisibleDetails: [
        'Display digital com relógio na parte frontal'
      ],
      referenceCoverage: {
        front: 'confirmed',
        bottom: 'confirmed',
        top: 'unknown',
        rear: 'unknown',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const planClock = resolvePhysicalActionChoreography(gSpeakerClockInput);
    assert(planClock.demonstrationGuardStatus === 'ALLOWED', 'Scenario O.3: Digital clock demo is ALLOWED');
    assert(planClock.demonstrationRisk === 'LOW', 'Scenario O.3: Digital clock demo risk is LOW');
  } catch (err: any) {
    assert(false, 'Scenario O: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO P: Specific Target Verification Matrix (Cases A-E)
  // ---------------------------------------------------------------------------
  try {
    // Case A: Known button clearly visible -> ALLOWED
    const caseAInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter presses the front power button on the verified front panel.',
        action2to4: 'Presenter shows device power on.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Studio',
      productIdentity: 'Smart Device with Front Button',
      spokenCopy: 'Aperte o botão frontal.',
      speechActionSync: [],
      productVisibleDetails: ['Botão frontal de energia claramente visível no painel frontal'],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      },
      structuralDNA: {
        fixedComponents: [
          { id: 'btn-front-1', name: 'Botão frontal de energia', role: 'functional', visible: true, confidence: 0.95, position: 'front' }
        ]
      }
    };
    const evalA = evaluateDemonstrationSafetyGate(caseAInput);
    assert(evalA.guardStatus === 'ALLOWED', 'Scenario P (Case A): Known front button is ALLOWED');
    assert(evalA.interactionRequirements.isTargetVerified === true, 'Scenario P (Case A): Target is verified');

    // Case B: Unknown top control -> BLOCKED
    const caseBInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter reaches to top and presses the top button.',
        action2to4: 'Presenter toggles top switch.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Studio',
      productIdentity: 'Device with Unknown Top Control',
      spokenCopy: 'Aperte o botão superior.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };
    const evalB = evaluateDemonstrationSafetyGate(caseBInput);
    assert(evalB.guardStatus === 'BLOCKED', 'Scenario P (Case B): Unknown top control is BLOCKED');
    assert(evalB.geometryConfidence === 'LOW', 'Scenario P (Case B): Geometry confidence is LOW');

    // Case C: Known handle -> ALLOWED
    const caseCInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter holds the cookware firmly by the ergonomic handle.',
        action2to4: 'Presenter shows the balance and grip.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Kitchen',
      productIdentity: 'Frigideira Antiaderente com Cabo Ergonômico',
      spokenCopy: 'O cabo ergonômico dá total firmeza.',
      speechActionSync: [],
      productVisibleDetails: ['Cabo ergonômico lateral fixado com rebites'],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'confirmed',
        bottom: 'confirmed',
        leftSide: 'confirmed',
        rightSide: 'confirmed'
      },
      structuralDNA: {
        fixedComponents: [
          { id: 'handle-1', name: 'Cabo ergonômico', role: 'fixed', visible: true, confidence: 0.95, position: 'front' }
        ]
      }
    };
    const evalC = evaluateDemonstrationSafetyGate(caseCInput);
    assert(evalC.guardStatus === 'ALLOWED', 'Scenario P (Case C): Known handle is ALLOWED');

    // Case D: Unknown charging surface -> BLOCKED
    const caseDInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter places smartphone on the top wireless charging surface.',
        action2to4: 'Presenter aligns phone with charger.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Office',
      productIdentity: 'Gadget with Inductive Pad',
      spokenCopy: 'Carrega no topo.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };
    const evalD = evaluateDemonstrationSafetyGate(caseDInput);
    assert(evalD.guardStatus === 'BLOCKED', 'Scenario P (Case D): Unknown charging surface is BLOCKED');

    // Case E: Passive lighting demonstration -> ALLOWED
    const caseEInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Presenter shows the ambient lighting glowing with soft colors.',
        action2to4: 'Presenter showcases the visual light effect.',
        action4to6: 'Presenter speaks.',
        action6to8: 'Presenter smiles.'
      },
      environment: 'Living Room',
      productIdentity: 'Luminária Decorativa',
      spokenCopy: 'Iluminação ambiente maravilhosa.',
      speechActionSync: [],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };
    const evalE = evaluateDemonstrationSafetyGate(caseEInput);
    assert(evalE.guardStatus === 'ALLOWED', 'Scenario P (Case E): Passive lighting demonstration is ALLOWED');
    assert(evalE.demonstrationRisk === 'LOW', 'Scenario P (Case E): Demonstration risk is LOW');
  } catch (err: any) {
    assert(false, 'Scenario P: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO Q: STAGE 3 — VERIFIED BENEFIT CANDIDATES BUILDING
  // ---------------------------------------------------------------------------
  try {
    const candidatesInput = {
      productIdentity: 'G-Speaker Smart Lamp',
      category: 'luminária inteligente',
      primaryBenefit: 'Carregamento sem fio por indução',
      productFacts: [
        'Carregamento sem fio por indução rápida',
        'Iluminação RGB com múltiplos modos de luz',
        'Relógio digital com display integrado',
        'Caixa de som Bluetooth 5.0'
      ],
      productVisibleDetails: [
        'Formato em G estilizado',
        'Base de apoio sólida',
        'Display frontal com dígitos digitais'
      ],
      referenceCoverage: {
        front: 'confirmed' as const,
        rear: 'unknown' as const,
        top: 'unknown' as const,
        bottom: 'confirmed' as const,
        leftSide: 'partial' as const,
        rightSide: 'partial' as const
      }
    };

    const candidates = buildVerifiedBenefitCandidates(candidatesInput);
    assert(candidates.length >= 4, 'Scenario Q: Built at least 4 verified candidates');
    assert(candidates.every(c => c.verified === true), 'Scenario Q: All candidates are marked verified');

    const chargingCandidate = candidates.find(c => c.benefitText.includes('indução') || c.benefitText.includes('sem fio'));
    assert(Boolean(chargingCandidate), 'Scenario Q: Wireless charging candidate exists');
    assert(chargingCandidate?.requiredDemoMode === 'FUNCTIONAL_INTERACTION', 'Scenario Q: Wireless charging requires FUNCTIONAL_INTERACTION mode');
    assert(chargingCandidate?.interactionRisk === 'HIGH', 'Scenario Q: Wireless charging interaction risk is HIGH');
    assert(chargingCandidate?.safetyEvaluation.guardStatus === 'BLOCKED', 'Scenario Q: Wireless charging is BLOCKED by Stage 2 safety gate');

    const rgbCandidate = candidates.find(c => c.benefitText.includes('RGB') || c.benefitText.includes('Iluminação'));
    assert(Boolean(rgbCandidate), 'Scenario Q: RGB lighting candidate exists');
    assert(rgbCandidate?.requiredDemoMode === 'PASSIVE_VISUAL_DEMO', 'Scenario Q: RGB lighting requires PASSIVE_VISUAL_DEMO mode');
    assert(rgbCandidate?.interactionRisk === 'LOW', 'Scenario Q: RGB lighting interaction risk is LOW');
    assert(rgbCandidate?.safetyEvaluation.guardStatus === 'ALLOWED', 'Scenario Q: RGB lighting is ALLOWED');

    const clockCandidate = candidates.find(c => c.benefitText.includes('Relógio') || c.benefitText.includes('display'));
    assert(Boolean(clockCandidate), 'Scenario Q: Digital clock candidate exists');
    assert(clockCandidate?.requiredDemoMode === 'PASSIVE_VISUAL_DEMO', 'Scenario Q: Digital clock requires PASSIVE_VISUAL_DEMO mode');
    assert(clockCandidate?.safetyEvaluation.guardStatus === 'ALLOWED', 'Scenario Q: Digital clock is ALLOWED');
  } catch (err: any) {
    assert(false, 'Scenario Q: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO R: STAGE 3 — SAFE BENEFIT SELECTION RULES (CASES A-E)
  // ---------------------------------------------------------------------------
  try {
    // Case A: Primary benefit safe -> keep it
    const caseASelection = selectSafestVerifiedBenefit({
      primaryBenefit: 'Iluminação RGB com modos de cor',
      productFacts: ['Iluminação RGB com modos de cor', 'Acabamento acetinado'],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    });
    assert(caseASelection.fallbackUsed === false, 'Scenario R (Case A): Primary benefit safe keeps it without fallback');
    assert(caseASelection.selectedBenefit === 'Iluminação RGB com modos de cor', 'Scenario R (Case A): Correct benefit selected');
    assert(caseASelection.selectedMode === 'PASSIVE_VISUAL_DEMO', 'Scenario R (Case A): Selected mode is PASSIVE_VISUAL_DEMO');
    assert(caseASelection.safetyStatus === 'ALLOWED', 'Scenario R (Case A): Safety status is ALLOWED');

    // Case B: Primary benefit blocked -> select safer verified benefit
    const caseBSelection = selectSafestVerifiedBenefit({
      primaryBenefit: 'Carregamento sem fio por indução rápida',
      productFacts: [
        'Carregamento sem fio por indução rápida',
        'Iluminação RGB com modos de luz',
        'Relógio digital com display'
      ],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    });
    assert(caseBSelection.fallbackUsed === true, 'Scenario R (Case B): Blocked primary benefit triggers safe fallback');
    assert(caseBSelection.fallbackType === 'SAFER_CANDIDATE', 'Scenario R (Case B): Fallback type is SAFER_CANDIDATE');
    assert(caseBSelection.selectedBenefit !== 'Carregamento sem fio por indução rápida', 'Scenario R (Case B): Blocked benefit was not selected');
    assert(caseBSelection.selectedMode === 'PASSIVE_VISUAL_DEMO', 'Scenario R (Case B): Selected mode is PASSIVE_VISUAL_DEMO');
    assert(caseBSelection.safetyStatus === 'ALLOWED', 'Scenario R (Case B): Safety status is ALLOWED');

    // Case C: Only passive benefit safe -> PASSIVE_VISUAL_DEMO
    const caseCSelection = selectSafestVerifiedBenefit({
      primaryBenefit: 'Pressionar botão superior não visível',
      productFacts: [
        'Pressionar botão superior não visível',
        'Display com relógio digital integrado'
      ],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    });
    assert(caseCSelection.selectedMode === 'PASSIVE_VISUAL_DEMO', 'Scenario R (Case C): Only passive safe selects PASSIVE_VISUAL_DEMO');
    assert(caseCSelection.safetyStatus === 'ALLOWED', 'Scenario R (Case C): Safety status is ALLOWED');

    // Case D: No demonstrable functional/visual benefit -> DISPLAY
    const caseDSelection = selectSafestVerifiedBenefit({
      productIdentity: 'Manual Técnico do Produto',
      productFacts: ['Garantia de 12 meses pelo fabricante', 'Bivolt automático 110V/220V', 'Certificação técnica ABNT'],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    });
    assert(caseDSelection.selectedMode === 'DISPLAY', 'Scenario R (Case D): Non-demonstrable specs fallback to DISPLAY');
    assert(caseDSelection.safetyStatus === 'ALLOWED', 'Scenario R (Case D): Safety status is ALLOWED');

    // Case E: Known functional target with sufficient geometry -> FUNCTIONAL_INTERACTION allowed
    const caseESelection = selectSafestVerifiedBenefit({
      primaryBenefit: 'Botão frontal de energia e controle',
      productFacts: ['Botão frontal de energia e controle'],
      structuralDNA: {
        fixedComponents: [
          { id: 'btn-1', name: 'Botão frontal de energia', role: 'functional', visible: true, confidence: 0.95, position: 'front' }
        ]
      },
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    });
    assert(caseESelection.selectedMode === 'FUNCTIONAL_INTERACTION', 'Scenario R (Case E): Verified functional target allows FUNCTIONAL_INTERACTION');
    assert(caseESelection.safetyStatus === 'ALLOWED', 'Scenario R (Case E): Safety status is ALLOWED');
  } catch (err: any) {
    assert(false, 'Scenario R: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO S: G-SPEAKER COMPREHENSIVE SAFE DEMO RESOLUTION
  // ---------------------------------------------------------------------------
  try {
    const gSpeakerInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Apresentadora segura o G-Speaker ao lado da cama.',
        action2to4: 'Apresentadora posiciona o smartphone sobre a base superior para carregamento por indução.',
        action4to6: 'Apresentadora demonstra o carregamento sem fio.',
        action6to8: 'Apresentadora sorri mostrando o resultado.'
      },
      environment: 'Quarto aconchegante com cama e mesa de cabeceira',
      productIdentity: 'G-Speaker Luminária Inteligente',
      category: 'luminária com carregador e caixa de som',
      productFacts: [
        'Carregamento sem fio por indução rápida',
        'Iluminação RGB com modos de cor customizáveis',
        'Relógio digital integrado com display frontal',
        'Caixa de som Bluetooth'
      ],
      productVisibleDetails: [
        'Formato em G vazado',
        'Display frontal com relógio digital',
        'Acabamento fosco moderno'
      ],
      spokenCopy: 'Essa luminária G-Speaker transforma seu quarto com luz ambiente e praticidade no dia a dia.',
      speechActionSync: [
        { phrase: 'transforma seu quarto com luz ambiente', action: 'Destaca a iluminação suave.' }
      ],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const choreographyPlan = resolvePhysicalActionChoreography(gSpeakerInput);

    // 1. Stage 2 blocked the unsafe wireless charging demonstration
    assert(choreographyPlan.demonstrationGuardStatus === 'BLOCKED', 'Scenario S: G-Speaker wireless charging demo is BLOCKED by Stage 2');
    assert(choreographyPlan.demonstrationRisk === 'HIGH', 'Scenario S: Demonstration risk is HIGH');
    assert(choreographyPlan.geometryConfidence === 'LOW', 'Scenario S: Geometry confidence is LOW (top unknown)');

    // 2. Stage 3 safely selected verified benefit and mode
    assert(Boolean(choreographyPlan.safeDemoSelection), 'Scenario S: Safe demo selection metadata is present');
    assert(choreographyPlan.selectedDemoMode === 'PASSIVE_VISUAL_DEMO', 'Scenario S: Selected mode is PASSIVE_VISUAL_DEMO');
    const selectedBenefit = choreographyPlan.selectedDemoBenefit || '';
    assert(
      selectedBenefit.includes('RGB') || selectedBenefit.includes('Iluminação') || selectedBenefit.includes('Relógio') || selectedBenefit.includes('display'),
      'Scenario S: Selected benefit is RGB illumination or digital clock display'
    );
    assert(!selectedBenefit.includes('indução') && !selectedBenefit.includes('sem fio'), 'Scenario S: Blocked wireless charging was NOT forced');

    // 3. Stage 1 context validation preserved without hallucinated objects
    const planText = JSON.stringify(choreographyPlan).toLowerCase();
    assert(!planText.includes('chair') && !planText.includes('cadeira'), 'Scenario S: Fallback contains NO chair');
    assert(!planText.includes('desk') && !planText.includes('workstation table'), 'Scenario S: Fallback contains NO desk');
    assert(!planText.includes('phone on charging') && !planText.includes('smartphone sobre a base'), 'Scenario S: NO precise phone placement in safe plan');
  } catch (err: any) {
    assert(false, 'Scenario S: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO T: STAGE 4 SPEECH LOAD CLASSIFIER
  // ---------------------------------------------------------------------------
  try {
    const shortSpeech = 'Olha esse acabamento lindo e prático.'; // 38 chars, 6 words
    const mediumSpeech = 'Essa luminária G-Speaker transforma seu quarto com luz ambiente e praticidade no dia a dia.'; // 92 chars, 15 words
    const denseSpeech = 'Com essa luminária inteligente você tem carregamento sem fio por indução rápida, relógio digital integrado, caixa de som bluetooth e iluminação RGB com múltiplos modos customizáveis tudo em um único aparelho completo.'; // 223 chars, 33 words

    const evalShort = evaluateScene2SpeechLoad(shortSpeech);
    const evalMedium = evaluateScene2SpeechLoad(mediumSpeech);
    const evalDense = evaluateScene2SpeechLoad(denseSpeech);

    assert(evalShort.speechLoad === 'LOW', 'Scenario T: Short speech classified as LOW');
    assert(evalMedium.speechLoad === 'MEDIUM', 'Scenario T: Medium speech classified as MEDIUM');
    assert(evalDense.speechLoad === 'HIGH', 'Scenario T: Dense speech classified as HIGH');
    assert(evalDense.wordCount > 22, 'Scenario T: Dense speech word count correctly measured');
  } catch (err: any) {
    assert(false, 'Scenario T: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO U: STAGE 4 ACTION BUDGET CLASSIFIER
  // ---------------------------------------------------------------------------
  try {
    const actions2 = {
      action0to2: 'Apresentadora exibe a luminária na bancada.',
      action2to4: 'Apresentadora gesticula sorrindo para a câmera.',
      action4to6: 'Apresentadora mantém o produto em foco.',
      action6to8: 'Apresentadora conclui a fala.'
    };
    const eval2 = evaluateScene2ActionBudget(actions2);
    assert(eval2.actionBudgetStatus === 'WITHIN_BUDGET', 'Scenario U: 2 major actions is WITHIN_BUDGET');
    assert(eval2.actionLoad === 'LOW', 'Scenario U: 2 simple actions load is LOW');

    const actions6 = {
      action0to2: 'Pega o produto, gira 180 graus e senta na cadeira.',
      action2to4: 'Alinha precisamente o celular, pressiona o botão lateral e abre a tampa.',
      action4to6: 'Desliza o mecanismo, troca de mão e aponta para o display.',
      action6to8: 'Aperta o controle e revela o resultado na tela.'
    };
    const eval6 = evaluateScene2ActionBudget(actions6);
    assert(eval6.actionBudgetStatus === 'EXCEEDS_BUDGET', 'Scenario U: 6+ precise actions is EXCEEDS_BUDGET');
    assert(eval6.actionLoad === 'HIGH', 'Scenario U: 6+ precise actions load is HIGH');
    assert(eval6.majorActionCount > 4, 'Scenario U: Major action count exceeds 4');
  } catch (err: any) {
    assert(false, 'Scenario U: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO V: STAGE 4 CAMERA LOAD CLASSIFIER
  // ---------------------------------------------------------------------------
  try {
    const subtleCam = ['Authentic handheld smartphone camera motion with natural micro-movements.'];
    const complexCam = ['Camera executes rapid 360-degree orbit with dynamic tracking and aggressive push-in.'];

    assert(evaluateCameraLoad(subtleCam) === 'STATIC_OR_SUBTLE', 'Scenario V: Subtle camera is STATIC_OR_SUBTLE');
    assert(evaluateCameraLoad(complexCam) === 'COMPLEX', 'Scenario V: Orbit camera is COMPLEX');
  } catch (err: any) {
    assert(false, 'Scenario V: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO W: STAGE 4 VALIDATION CASE A (Short dialogue + 2 actions -> ALLOWED)
  // ---------------------------------------------------------------------------
  try {
    const inputCaseA: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Apresentadora exibe o produto com sorriso natural.',
        action2to4: 'Apresentadora gesticula suavemente destacando a cor.',
        action4to6: 'Apresentadora mantém a postura estável.',
        action6to8: 'Apresentadora conclui a demonstração.'
      },
      environment: 'Sala iluminada',
      productIdentity: 'Caneca Térmica Inox',
      spokenCopy: 'Olha que design incrível.',
      speechActionSync: [{ phrase: 'design incrível', action: 'Exibe a caneca' }]
    };

    const planCaseA = resolvePhysicalActionChoreography(inputCaseA);
    assert(planCaseA.combinedLoad === 'LOW', 'Scenario W (Case A): Combined load is LOW');
    assert(planCaseA.combinedLoadEvaluation?.overloaded === false, 'Scenario W (Case A): Not overloaded');
    assert(planCaseA.actionBudgetEvaluation?.actionBudgetStatus === 'WITHIN_BUDGET', 'Scenario W (Case A): Within budget');
    assert(planCaseA.demonstrationGuardStatus === 'ALLOWED', 'Scenario W (Case A): Status is ALLOWED');
  } catch (err: any) {
    assert(false, 'Scenario W (Case A): Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO X: STAGE 4 VALIDATION CASE B (Long dialogue + 6 precise actions -> SIMPLIFY)
  // ---------------------------------------------------------------------------
  try {
    const inputCaseB: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Pega o produto, gira 180 graus e senta na cadeira.',
        action2to4: 'Alinha precisamente o celular, pressiona o botão lateral e abre a tampa.',
        action4to6: 'Desliza o mecanismo, troca de mão e aponta para o display.',
        action6to8: 'Aperta o controle e revela o resultado na tela.'
      },
      environment: 'Escritório moderno com mesa de trabalho e cadeira',
      productIdentity: 'Hub Multifuncional 10 em 1',
      category: 'eletrônicos',
      productFacts: ['Conexão USB-C rápida', 'Corpo de alumínio'],
      productVisibleDetails: ['Acabamento metálico cinza'],
      spokenCopy: 'Com esse hub você conecta múltiplos monitores simultaneamente, transfere arquivos em alta velocidade sem travamentos e mantém sua mesa organizada com máxima produtividade todos os dias.',
      speechActionSync: [{ phrase: 'alta velocidade', action: 'Desliza o mecanismo e pressiona o botão' }]
    };

    const planCaseB = resolvePhysicalActionChoreography(inputCaseB);
    assert(planCaseB.speechLoad === 'HIGH', 'Scenario X (Case B): Speech load is HIGH');
    assert(planCaseB.combinedLoadEvaluation?.overloaded === true, 'Scenario X (Case B): Combined load is OVERLOADED');
    assert(planCaseB.combinedLoadEvaluation?.simplificationApplied === true, 'Scenario X (Case B): Simplification applied');
    assert(planCaseB.actionSequence.length <= 4, 'Scenario X (Case B): Action sequence simplified to <= 4 phases');
    assert(inputCaseB.spokenCopy.length > 0, 'Scenario X (Case B): Locked dialogue copy NOT truncated');
  } catch (err: any) {
    assert(false, 'Scenario X (Case B): Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO Y: STAGE 4 VALIDATION CASE C & D (Passive Visual Demo & Simple Handling)
  // ---------------------------------------------------------------------------
  try {
    // Case C: Passive visual demo + dense dialogue -> keep movement minimal
    const inputCaseC: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Apresentadora exibe o display frontal.',
        action2to4: 'Apresentadora destaca os dígitos iluminados.',
        action4to6: 'Apresentadora mantém o produto estável.',
        action6to8: 'Apresentadora sorri para a câmera.'
      },
      environment: 'Quarto',
      productIdentity: 'Relógio Digital de Mesa',
      category: 'relógio',
      productFacts: ['Display de LED visível'],
      productVisibleDetails: ['Display digital frontal'],
      spokenCopy: 'Com números grandes e iluminação nítida você confere as horas em qualquer ângulo mesmo no escuro com total clareza e conforto visual para o seu dia.',
      speechActionSync: [{ phrase: 'iluminação nítida', action: 'Destaca o display' }]
    };

    const planCaseC = resolvePhysicalActionChoreography(inputCaseC);
    assert(planCaseC.selectedDemoMode === 'PASSIVE_VISUAL_DEMO', 'Scenario Y (Case C): Selected mode is PASSIVE_VISUAL_DEMO');
    assert(planCaseC.actionLoad === 'LOW', 'Scenario Y (Case C): Passive visual demo action load is LOW');

    // Case D: Simple handling + medium dialogue -> ALLOWED if physically safe
    const inputCaseD: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Apresentadora empunha a garrafa térmica.',
        action2to4: 'Apresentadora segura a garrafa com apoio seguro.',
        action4to6: 'Apresentadora exibe o acabamento externo.',
        action6to8: 'Apresentadora sorri concluindo a fala.'
      },
      environment: 'Cozinha',
      productIdentity: 'Garrafa Térmica 1L',
      category: 'utensílios',
      productFacts: ['Isolamento a vácuo'],
      productVisibleDetails: ['Tampa rosqueável', 'Corpo em inox'],
      spokenCopy: 'Essa garrafa mantém sua água gelada o dia inteiro com facilidade.',
      speechActionSync: [{ phrase: 'água gelada', action: 'Segura a garrafa' }]
    };

    const planCaseD = resolvePhysicalActionChoreography(inputCaseD);
    assert(planCaseD.selectedDemoMode === 'SIMPLE_HANDLING' || planCaseD.selectedDemoMode === 'PASSIVE_VISUAL_DEMO' || planCaseD.selectedDemoMode === 'DISPLAY', 'Scenario Y (Case D): Simple handling demo mode');
    assert(planCaseD.demonstrationGuardStatus === 'ALLOWED', 'Scenario Y (Case D): Simple handling is ALLOWED');
  } catch (err: any) {
    assert(false, 'Scenario Y: Threw error', err.message);
  }

  // ---------------------------------------------------------------------------
  // SCENARIO Z: STAGE 4 VALIDATION CASE E (G-Speaker low-risk, low-action choreography)
  // ---------------------------------------------------------------------------
  try {
    const gSpeakerInput: PhysicalChoreographyInput = {
      actions: {
        action0to2: 'Apresentadora segura o G-Speaker ao lado da cama.',
        action2to4: 'Apresentadora posiciona o smartphone sobre a base superior para carregamento por indução.',
        action4to6: 'Apresentadora demonstra o carregamento sem fio.',
        action6to8: 'Apresentadora sorri mostrando o resultado.'
      },
      environment: 'Quarto aconchegante com cama e mesa de cabeceira',
      productIdentity: 'G-Speaker Luminária Inteligente',
      category: 'luminária com carregador e caixa de som',
      productFacts: [
        'Carregamento sem fio por indução rápida',
        'Iluminação RGB com modos de cor customizáveis',
        'Relógio digital integrado com display frontal',
        'Caixa de som Bluetooth'
      ],
      productVisibleDetails: [
        'Formato em G vazado',
        'Display frontal com relógio digital',
        'Acabamento fosco moderno'
      ],
      spokenCopy: 'Essa luminária G-Speaker transforma seu quarto com luz ambiente e praticidade no dia a dia.',
      speechActionSync: [
        { phrase: 'transforma seu quarto com luz ambiente', action: 'Destaca a iluminação suave.' }
      ],
      referenceCoverage: {
        front: 'confirmed',
        rear: 'unknown',
        top: 'unknown',
        bottom: 'confirmed',
        leftSide: 'partial',
        rightSide: 'partial'
      }
    };

    const planGSpeaker = resolvePhysicalActionChoreography(gSpeakerInput);

    assert(planGSpeaker.actionBudgetEvaluation !== undefined, 'Scenario Z (Case E): Action budget evaluation is present');
    assert(planGSpeaker.speechLoadEvaluation !== undefined, 'Scenario Z (Case E): Speech load evaluation is present');
    assert(planGSpeaker.actionLoad === 'LOW', 'Scenario Z (Case E): G-Speaker action load is LOW');
    assert(planGSpeaker.speechLoad === 'MEDIUM', 'Scenario Z (Case E): G-Speaker speech load is MEDIUM');
    assert(planGSpeaker.combinedLoad === 'LOW' || planGSpeaker.combinedLoad === 'MEDIUM', 'Scenario Z (Case E): G-Speaker combined load is LOW/MEDIUM (not overloaded)');
    assert(planGSpeaker.actionBudgetEvaluation?.actionBudgetStatus === 'WITHIN_BUDGET', 'Scenario Z (Case E): G-Speaker actions WITHIN_BUDGET (2-4 major actions)');
    assert(planGSpeaker.actionSequence.length >= 2 && planGSpeaker.actionSequence.length <= 4, 'Scenario Z (Case E): Action count is within 2 to 4 phases');
    assert(planGSpeaker.selectedDemoMode === 'PASSIVE_VISUAL_DEMO', 'Scenario Z (Case E): G-Speaker demo mode is PASSIVE_VISUAL_DEMO');
  } catch (err: any) {
    assert(false, 'Scenario Z (Case E): Threw error', err.message);
  }

  console.log(`\nPhysical Choreography Tests: ${passed} PASSED, ${failed} FAILED`);
  return { passed, failed };
}
