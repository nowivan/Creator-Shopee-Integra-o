/**
 * SCENE 2 COPY BRAIN — AUTOMATED VERIFICATION SUITE (FASE 1.1)
 * 
 * Tests:
 * 1. TEST A — BODY SPLASH KIT (Variety / alternation / choice, rejects pure generic "praticidade")
 * 2. TEST B — BATH TOWELS (Strict factual grounding, no hallucination of absent attributes)
 * 3. TEST C — WATCH (Feature → Function → Benefit translation over mere visual praise)
 * 4. TEST D — ANTI VISUAL CONTAMINATION (Permanence test rejects presenter smiling, black shirt, store background, table)
 * 5. TEST E — NO COMMERCIAL C2 (Absence of CTA, cart, price, discount, urgency, scarcity)
 * 6. TEST F — STRUCTURED RESULT (dominant_fact, real_function, consumer_gain, practical_result, compatible_context, spoken_copy)
 * 7. TEST G — CHARACTER / NATURALNESS (140-180 chars target calibration without artificial filler)
 */

import {
  filterNonPermanentVisualFacts,
  selectDominantFact,
  evaluateAntiGenericCopyGate,
  synthesizeDeterministicCopyBrainResult,
  runScene2CopyBrain
} from '../scene2CopyBrain';
import {
  determineEligibleScene2Angles,
  selectCopyAnglesForBatch,
  getScene2AnglePromptInstruction,
  Scene2CopyAngle
} from '../copyAngleSelector';
import { Scene2CopyBrainInput } from '../../types/compilerTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runAllScene2CopyBrainTests(): Promise<{ passed: number; failed: number; summary: string[] }> {
  const summary: string[] = [];
  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res.then(() => {
          passed++;
          summary.push(`✅ PASS: ${name}`);
        }).catch((err) => {
          failed++;
          summary.push(`❌ FAIL: ${name} -> ${err.message}`);
        });
      }
      passed++;
      summary.push(`✅ PASS: ${name}`);
    } catch (err: any) {
      failed++;
      summary.push(`❌ FAIL: ${name} -> ${err.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST A: BODY SPLASH KIT
  // --------------------------------------------------------------------------
  await runTest("TEST A — Body Splash Kit (Variety/alternation reasoning, rejects pure generic)", async () => {
    const input: Scene2CopyBrainInput = {
      productName: "Kit Body Splash Romance",
      category: "Perfumaria e Beleza",
      productFacts: [
        "Kit com três body splashes de 200ml",
        "Três fragrâncias distintas: floral, frutada e oriental",
        "Fixação suave para reaplicar ao longo do dia"
      ],
      primaryBenefit: "Variedade de fragrâncias para usar em diferentes momentos da rotina"
    };

    const result = await runScene2CopyBrain(input);

    // Validate structured fields
    assert(Boolean(result.dominant_fact), "Must contain dominant_fact");
    assert(Boolean(result.real_function), "Must contain real_function");
    assert(Boolean(result.consumer_gain), "Must contain consumer_gain");
    assert(Boolean(result.spoken_copy), "Must contain spoken_copy");

    // Must communicate variety / alternation / choice
    const copyLower = result.spoken_copy.toLowerCase();
    const hasVarietyTheme = copyLower.includes('três') || copyLower.includes('variar') || copyLower.includes('diferentes') || copyLower.includes('fragrância') || copyLower.includes('momentos');
    assert(hasVarietyTheme, "Spoken copy must communicate variety/alternation of fragrances");

    // Anti-generic validation
    const gate = evaluateAntiGenericCopyGate(result, input.productFacts);
    assert(gate.isValid, `Copy must pass anti-generic gate: ${gate.reasons.join(', ')}`);
    assert(!gate.isPureGenericCliche, "Must not be a pure ungrounded cliché");
  });

  // --------------------------------------------------------------------------
  // TEST B: BATH TOWELS — STRICT FACTUAL GROUNDING
  // --------------------------------------------------------------------------
  await runTest("TEST B — Bath Towels (Strict fact adherence without unverified feature hallucination)", async () => {
    // Towel A: explicitly declared cotton 500g and high absorption
    const inputWithCotton: Scene2CopyBrainInput = {
      productName: "Kit Toalhas de Banho Imperial 500g/m²",
      category: "Cama, Mesa e Banho",
      productFacts: [
        "Algodão 100% penteado com gramatura 500g/m²",
        "Alta absorção de água desde o primeiro uso",
        "Acabamento com costura reforçada e toque aveludado"
      ],
      primaryBenefit: "Secagem instantânea sem deixar a toalha pesada ou úmida"
    };

    const resultA = await runScene2CopyBrain(inputWithCotton);
    assert(resultA.spoken_copy.length >= 130, "Copy A length within acceptable speech bounds");
    assert(resultA.dominant_fact.toLowerCase().includes('algodão') || resultA.dominant_fact.toLowerCase().includes('500g') || resultA.dominant_fact.toLowerCase().includes('absorção') || resultA.dominant_fact.toLowerCase().includes('toalha'), "Dominant fact A grounded in verified facts");

    // Towel B: fixture with ONLY microfiber and fast drying, NO cotton 500g
    const inputMicrofiber: Scene2CopyBrainInput = {
      productName: "Toalha de Viagem Compacta DryFit",
      category: "Acessórios de Viagem",
      productFacts: [
        "Tecido em microfibra ultrafina compactável",
        "Secagem três vezes mais rápida que toalha comum",
        "Ocupa menos de 10cm na mochila"
      ],
      primaryBenefit: "Seca rápido e cabe em qualquer bolso ou mochila"
    };

    const resultB = await runScene2CopyBrain(inputMicrofiber);
    // Must NOT hallucinate "algodão 500g" because it was NOT declared in facts!
    assert(!resultB.spoken_copy.toLowerCase().includes('500g'), "Must not invent 500g when not in facts");
    assert(!resultB.dominant_fact.toLowerCase().includes('500g'), "Must not invent 500g in dominant fact");
  });

  // --------------------------------------------------------------------------
  // TEST C: WATCH — FEATURE → FUNCTION → BENEFIT TRANSLATION
  // --------------------------------------------------------------------------
  await runTest("TEST C — Watch (Translates functional mechanism over mere aesthetic praise)", async () => {
    const input: Scene2CopyBrainInput = {
      productName: "Relógio Cronógrafo Automático Steel Horizon",
      category: "Acessórios Masculinos",
      productFacts: [
        "Caixa em aço inoxidável 316L cirúrgico e vidro em cristal de safira resistente a riscos",
        "Movimento automático mecânico com reserva de marcha de 48 horas",
        "Resistência à água de 10 ATM (100 metros)"
      ],
      primaryBenefit: "Precisão mecânica e durabilidade à prova de riscos"
    };

    const result = await runScene2CopyBrain(input);
    const copyLower = result.spoken_copy.toLowerCase();

    // Must highlight a functional anchor (safira, 316L, resistente, durabilidade, peso)
    const hasFunctionalAnchor = copyLower.includes('safira') || copyLower.includes('risca') || copyLower.includes('aço') || copyLower.includes('cronógrafo') || copyLower.includes('pulso') || copyLower.includes('peso');
    assert(hasFunctionalAnchor, "Copy must translate a functional feature into a concrete benefit");
    assert(Boolean(result.real_function), "Must define real_function");
    assert(Boolean(result.consumer_gain), "Must define consumer_gain");
  });

  // --------------------------------------------------------------------------
  // TEST D: ANTI VISUAL CONTAMINATION (Permanence Test)
  // --------------------------------------------------------------------------
  await runTest("TEST D — Anti Visual Contamination (Permanence test filters studio background, pose, clothing)", async () => {
    const contaminatedFacts = [
      "Fundo de estúdio fotográfico branco iluminado",
      "Pessoa sorrindo com camiseta preta na foto",
      "Produto apoiado em cima de uma mesa de madeira",
      "Ângulo de cima com close-up na embalagem",
      "Caixa em aço inoxidável 316L com vidro em cristal de safira",
      "Movimento cronógrafo de alta precisão"
    ];

    const filtered = filterNonPermanentVisualFacts(contaminatedFacts);

    assert(filtered.length === 2, `Should keep exactly 2 permanent facts, got ${filtered.length}`);
    assert(filtered[0].includes('aço inoxidável') || filtered[0].includes('safira'), "Filtered must preserve true product facts");
    assert(filtered[1].includes('cronógrafo'), "Filtered must preserve true product facts");

    // Dominant fact selection must pick real product fact, never the photo background
    const dominant = selectDominantFact(contaminatedFacts);
    assert(!dominant.toLowerCase().includes('fundo'), "Dominant fact must not be photo background");
    assert(!dominant.toLowerCase().includes('sorrindo'), "Dominant fact must not be presenter smile");
    assert(!dominant.toLowerCase().includes('camiseta'), "Dominant fact must not be wardrobe in photo");
  });

  // --------------------------------------------------------------------------
  // TEST E: NO COMMERCIAL C2 (Anti-Commercial Guarantee)
  // --------------------------------------------------------------------------
  await runTest("TEST E — No Commercial C2 (Rejects CTA, cart, price, discount, scarcity)", async () => {
    const cleanResult = {
      dominant_fact: "Vidro em cristal de safira",
      real_function: "Protege contra arranhões acidentais",
      consumer_gain: "Mantém a tela perfeita no uso diário",
      practical_result: "Sem riscos ao bater nas chaves ou superfícies",
      compatible_context: "Rotina de trabalho e lazer",
      spoken_copy: "Esse relógio tem cristal de safira que não risca por nada e aquele peso firme no pulso que você só sente em peça com acabamento e precisão de verdade no seu uso."
    };

    const cleanValidation = evaluateAntiGenericCopyGate(cleanResult, ["Vidro em cristal de safira"]);
    assert(cleanValidation.isValid, "Clean copy should be valid");
    assert(!cleanValidation.hasForbiddenCommercialTerms, "Clean copy must not have commercial terms");

    // Violations test
    const commercialViolations = [
      "Clique no carrinho laranja agora e garanta com 50% de desconto por apenas 99 reais!",
      "Corre que o estoque tá acabando, aproveite essa oferta imperdível no link da bio.",
      "Compre agora para não perder essa super promoção com frete grátis."
    ];

    for (const badCopy of commercialViolations) {
      const badResult = { ...cleanResult, spoken_copy: badCopy };
      const badVal = evaluateAntiGenericCopyGate(badResult, ["Vidro em cristal de safira"]);
      assert(!badVal.isValid, `Commercial copy "${badCopy}" must be REJECTED`);
      assert(badVal.hasForbiddenCommercialTerms, `Must flag commercial terms in "${badCopy}"`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST F: STRUCTURED RESULT SCHEMA
  // --------------------------------------------------------------------------
  await runTest("TEST F — Structured Result Schema (Coherent population of all 6 chain properties)", () => {
    const input: Scene2CopyBrainInput = {
      productName: "Frigideira Cerâmica Antiaderente 28cm",
      category: "Cozinha e Gastronomia",
      productFacts: [
        "Revestimento cerâmico mineral 100% livre de PTFE e PFOA",
        "Base tripla de indução para calor uniforme",
        "Cabo em baquelite soft-touch antitérmico"
      ],
      primaryBenefit: "Alimentos não grudam sem precisar usar óleo e limpeza rápida"
    };

    const synth = synthesizeDeterministicCopyBrainResult(input);

    assert(Boolean(synth.dominant_fact) && synth.dominant_fact.length > 5, "dominant_fact populated");
    assert(Boolean(synth.real_function) && synth.real_function.length > 5, "real_function populated");
    assert(Boolean(synth.consumer_gain) && synth.consumer_gain.length > 5, "consumer_gain populated");
    assert(Boolean(synth.practical_result) && synth.practical_result.length > 5, "practical_result populated");
    assert(Boolean(synth.compatible_context) && synth.compatible_context.length > 3, "compatible_context populated");
    assert(Boolean(synth.spoken_copy) && synth.spoken_copy.length >= 120, "spoken_copy populated");
  });

  // --------------------------------------------------------------------------
  // TEST G: CHARACTER / NATURALNESS TARGET
  // --------------------------------------------------------------------------
  await runTest("TEST G — Character Target & Natural PT-BR (140-180 chars without artificial filler)", () => {
    const input: Scene2CopyBrainInput = {
      productName: "Kit Body Splash Romance",
      category: "Perfumaria",
      productFacts: ["Kit com três body splashes", "Três fragrâncias distintas"],
      primaryBenefit: "Variar fragrâncias ao longo do dia"
    };

    const synth = synthesizeDeterministicCopyBrainResult(input);
    const len = synth.spoken_copy.length;

    assert(len >= 135 && len <= 185, `Character length (${len}) must be around the 140-180 target`);
    assert(!synth.spoken_copy.includes("bla bla bla") && !synth.spoken_copy.includes("..."), "No artificial filler");
    assert(synth.spoken_copy.startsWith("Com três body splashes"), "Natural conversational opener");
  });

  // --------------------------------------------------------------------------
  // TEST H: SCENE 2 COPY ANGLE SELECTOR INTEGRATION
  // --------------------------------------------------------------------------
  await runTest("TEST H — Scene 2 Copy Angle Selector (Eligible angles, distinct batch angles, contract fitting)", async () => {
    const input: Scene2CopyBrainInput = {
      productName: "Luminária G-Speaker Smart 4 em 1",
      category: "Eletrônicos e Casa",
      productFacts: [
        "Caixa de som Bluetooth integrada de alta definição",
        "Carregador por indução sem fio rápido de 15W na base",
        "Iluminação ambiente RGB com modos dinâmicos",
        "Relógio digital e despertador com simulação do nascer do sol"
      ],
      primaryBenefit: "Tudo em um para a mesa de cabeceira com som, luz e carregamento sem fio"
    };

    const eligible = determineEligibleScene2Angles({
      productIdentity: input.productName,
      category: input.category,
      verifiedFacts: input.productFacts
    });

    assert(eligible.includes('PRACTICAL_BENEFIT'), "Must include PRACTICAL_BENEFIT");
    assert(eligible.includes('MULTI_FEATURE_VALUE'), "Must include MULTI_FEATURE_VALUE for multi-feature product");
    assert(eligible.length >= 4, "Eligible angle pool has depth");

    const batchAngles = selectCopyAnglesForBatch('scene2', eligible, 3);
    assert(batchAngles.length === 3, "Batch angles match requested count");
    assert(new Set(batchAngles).size === 3, "All 3 batch angles are distinct");

    for (let i = 0; i < batchAngles.length; i++) {
      const angle = batchAngles[i];
      const result = await runScene2CopyBrain(input, '', angle);
      const gate = evaluateAntiGenericCopyGate(result, input.productFacts);
      assert(gate.isValid, `Angle ${angle} must produce valid copy passing anti-generic gate`);
      assert(result.spoken_copy.length >= 160 && result.spoken_copy.length <= 175, `Angle ${angle} copy (${result.spoken_copy.length}) must strictly satisfy 160-175 contract`);
    }
  });

  return { passed, failed, summary };
}

// Guard for direct execution via CLI
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && (import.meta.url.includes(process.argv[1].replace(/\\/g, '/')) || process.argv[1].includes('scene2CopyBrain.test'))) {
  runAllScene2CopyBrainTests().then((res) => {
    console.log("\n=========================================");
    console.log("SCENE 2 COPY BRAIN TEST SUITE (FASE 1.1)");
    console.log("=========================================");
    res.summary.forEach(s => console.log(s));
    console.log(`\nTOTAL: ${res.passed} PASSED, ${res.failed} FAILED`);
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
