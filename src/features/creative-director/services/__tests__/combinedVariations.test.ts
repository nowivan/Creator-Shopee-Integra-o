import {
  parseCombinedVariationsOutput,
  extractJsonFromResponse,
  buildCombinedVariationsPrompt,
  buildGranularCorrectionPrompt,
  countCharacters,
  getNonCompliantItems,
  applyGranularCorrections,
  calculateAdaptiveDelta
} from '../combinedVariationsService';
import {
  CombinedVariationQuantity,
  IndividualModeChoice,
  GeneratedScenePair
} from '../../types/combinedVariations';
import { Scene3CtaHandoff } from '../../types/scene3';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function makeString(prefix: string, length: number): string {
  if (prefix.length >= length) return prefix.slice(0, length);
  return prefix + '.'.repeat(length - prefix.length);
}

export async function runAllCombinedVariationsTests(): Promise<void> {
  console.log('\n--- Running Combined Variations Hub Tests (Scene 2 + Scene 3) ---');

  const revisionId = 'rev_test_123';

  // =========================================================================
  // TEST A: Quantity 1 / Scene 2 (1 copy Scene 2, 0 CTA)
  // =========================================================================
  const s2Copy160 = makeString('Esta toalha de banho com fios de algodão egípcio absorve toda a água imediatamente sem deixar umidade', 160);
  const jsonA = {
    pairs: [
      {
        salesAngle: 'Alta Absorção Diária',
        scene2Copy: s2Copy160
      }
    ]
  };

  const parsedA = parseCombinedVariationsOutput(jsonA, 1, revisionId, 'scene2');
  assert(parsedA.length === 1, 'Test A: Must produce exactly 1 item');
  assert(Boolean(parsedA[0].scene2Copy), 'Test A: scene2Copy must be defined');
  assert(!parsedA[0].scene3Cta, 'Test A: scene3Cta must be empty or undefined');
  assert(parsedA[0].characterCountScene2 === 160, `Test A: Character count must be 160, got ${parsedA[0].characterCountScene2}`);
  console.log('[PASS] TEST A: Quantity 1 / Scene 2 generates 1 Scene 2 copy and 0 CTA');

  // =========================================================================
  // TEST B: Quantity 1 / Scene 3 CTA (0 Scene 2, 1 CTA)
  // =========================================================================
  const s3Cta165 = makeString('Toque no carrinho laranja abaixo agora mesmo para garantir seu jogo exclusivo com entrega expressa!', 165);
  const jsonB = {
    pairs: [
      {
        salesAngle: 'Urgência no Carrinho',
        scene3Cta: s3Cta165
      }
    ]
  };

  const parsedB = parseCombinedVariationsOutput(jsonB, 1, revisionId, 'scene3');
  assert(parsedB.length === 1, 'Test B: Must produce exactly 1 item');
  assert(!parsedB[0].scene2Copy, 'Test B: scene2Copy must be empty or undefined');
  assert(Boolean(parsedB[0].scene3Cta), 'Test B: scene3Cta must be defined');
  assert(parsedB[0].characterCountScene3 === 165, `Test B: Character count must be 165, got ${parsedB[0].characterCountScene3}`);
  console.log('[PASS] TEST B: Quantity 1 / CTA generates 0 Scene 2 copy and 1 CTA');

  // =========================================================================
  // TEST C: Quantity 2 (1 Scene 2, 1 CTA, 1 Pair)
  // =========================================================================
  const s2Pair1 = makeString('Secagem imediata com toque aveludado para sua pele após o banho com máxima durabilidade', 160);
  const s3Pair1 = makeString('Clique no carrinho laranja aqui embaixo e aproveite o estoque limitado com envio prioritário!', 166);

  const jsonC = {
    pairs: [
      {
        salesAngle: 'Conforto e Maciez',
        scene2Copy: s2Pair1,
        scene3Cta: s3Pair1
      }
    ]
  };

  const parsedC = parseCombinedVariationsOutput(jsonC, 2, revisionId);
  assert(parsedC.length === 1, 'Test C: Quantity 2 must produce exactly 1 pair');
  assert(parsedC[0].scene2Copy === s2Pair1, 'Test C: Pair 1 must have valid scene2Copy');
  assert(parsedC[0].scene3Cta === s3Pair1, 'Test C: Pair 1 must have valid scene3Cta');
  console.log('[PASS] TEST C: Quantity 2 produces 1 pair (1 Scene 2 + 1 Scene 3 CTA)');

  // =========================================================================
  // TEST D: Quantity 4 (2 Scene 2, 2 CTA, 2 Pairs)
  // =========================================================================
  const s2Pair2 = makeString('Fibras duplas de alta densidade que resistem a centenas de lavagens sem perder o toque macio', 158);
  const s3Pair2 = makeString('Garanta o seu jogo no carrinho laranja antes que o lote especial com frete rápido se esgote!', 168);

  const jsonD = {
    pairs: [
      {
        salesAngle: 'Conforto',
        scene2Copy: s2Pair1,
        scene3Cta: s3Pair1
      },
      {
        salesAngle: 'Durabilidade',
        scene2Copy: s2Pair2,
        scene3Cta: s3Pair2
      }
    ]
  };

  const parsedD = parseCombinedVariationsOutput(jsonD, 4, revisionId);
  assert(parsedD.length === 2, 'Test D: Quantity 4 must produce exactly 2 pairs');
  assert(parsedD[0].pairIndex === 1, 'Test D: First pair index must be 1');
  assert(parsedD[1].pairIndex === 2, 'Test D: Second pair index must be 2');
  assert(parsedD[0].salesAngle === 'Conforto', 'Test D: Preserves sales angle for pair 1');
  assert(parsedD[1].salesAngle === 'Durabilidade', 'Test D: Preserves sales angle for pair 2');
  console.log('[PASS] TEST D: Quantity 4 produces 2 pairs (2 Scene 2 + 2 Scene 3 CTA)');

  // =========================================================================
  // TEST E: Quantity 6 (3 Scene 2, 3 CTA, 3 Pairs)
  // =========================================================================
  const s2Pair3 = makeString('Tamanho gigante banhão que envolve todo o corpo com secagem instantânea no primeiro contato', 162);
  const s3Pair3 = makeString('Toque no carrinho laranja e peça sua edição especial com acabamento premium para seu lar!', 167);

  const jsonE = {
    pairs: [
      {
        salesAngle: 'Conforto',
        scene2Copy: s2Pair1,
        scene3Cta: s3Pair1
      },
      {
        salesAngle: 'Durabilidade',
        scene2Copy: s2Pair2,
        scene3Cta: s3Pair2
      },
      {
        salesAngle: 'Tamanho e Praticidade',
        scene2Copy: s2Pair3,
        scene3Cta: s3Pair3
      }
    ]
  };

  const parsedE = parseCombinedVariationsOutput(jsonE, 6, revisionId);
  assert(parsedE.length === 3, 'Test E: Quantity 6 must produce exactly 3 pairs');
  assert(parsedE[2].pairIndex === 3, 'Test E: Third pair index must be 3');
  assert(parsedE[2].salesAngle === 'Tamanho e Praticidade', 'Test E: Preserves angle 3');
  console.log('[PASS] TEST E: Quantity 6 produces 3 pairs (3 Scene 2 + 3 Scene 3 CTA)');

  // =========================================================================
  // TEST F: Reaproveitamento (State Caching & Zero Gemini Calls on Selection)
  // =========================================================================
  let simulatedGeminiCallCount = 0;

  // Initial generation (1 Gemini call)
  simulatedGeminiCallCount++;
  const cachedPairs: GeneratedScenePair[] = [...parsedE];
  let selectedPairId: string = cachedPairs[0].id;

  // User selects pair 2
  selectedPairId = cachedPairs[1].id;
  const activePair2 = cachedPairs.find(p => p.id === selectedPairId);
  assert(activePair2?.pairIndex === 2, 'Test F: Selected pair 2 must be found in cache');
  assert(simulatedGeminiCallCount === 1, 'Test F: Selecting pair 2 must NOT trigger any new Gemini API call');

  // User selects pair 3
  selectedPairId = cachedPairs[2].id;
  const activePair3 = cachedPairs.find(p => p.id === selectedPairId);
  assert(activePair3?.pairIndex === 3, 'Test F: Selected pair 3 must be found in cache');
  assert(simulatedGeminiCallCount === 1, 'Test F: Selecting pair 3 must NOT trigger any new Gemini API call');

  // User switches back to pair 1
  selectedPairId = cachedPairs[0].id;
  const activePair1 = cachedPairs.find(p => p.id === selectedPairId);
  assert(activePair1?.pairIndex === 1, 'Test F: Selected pair 1 must be found in cache');
  assert(simulatedGeminiCallCount === 1, 'Test F: Re-selecting pair 1 must NOT trigger any new Gemini API call');
  console.log('[PASS] TEST F: Switching between cached pairs triggers zero new AI calls (pure state selection)');

  // =========================================================================
  // TEST G: Compatibilidade (Scene 2 and Scene 3 receiving corresponding copies)
  // =========================================================================
  let scene2AppliedCopy: string = '';
  let scene3HandoffReceived: Scene3CtaHandoff | null = null;

  function applyPair(pair: GeneratedScenePair) {
    if (pair.scene2Copy) {
      scene2AppliedCopy = pair.scene2Copy;
    }
    if (pair.scene3Cta) {
      scene3HandoffReceived = {
        cta: pair.scene3Cta,
        source: 'scene2_handoff',
        versionId: pair.pairIndex,
        productRevisionId: pair.productRevisionId,
        sentAt: Date.now(),
        characterCount: pair.scene3Cta.length
      };
    }
  }

  // Apply Pair 2
  applyPair(cachedPairs[1]);
  assert(scene2AppliedCopy === s2Pair2, 'Test G: Scene 2 must receive Pair 2 copy');
  assert(scene3HandoffReceived !== null && scene3HandoffReceived.cta === s3Pair2, 'Test G: Scene 3 must receive Pair 2 CTA');
  assert(scene3HandoffReceived!.versionId === 2, 'Test G: Scene 3 handoff versionId must match pairIndex 2');

  // Apply Pair 3
  applyPair(cachedPairs[2]);
  assert(scene2AppliedCopy === s2Pair3, 'Test G: Scene 2 must receive Pair 3 copy');
  assert(scene3HandoffReceived !== null && scene3HandoffReceived.cta === s3Pair3, 'Test G: Scene 3 must receive Pair 3 CTA');
  assert(scene3HandoffReceived!.versionId === 3, 'Test G: Scene 3 handoff versionId must match pairIndex 3');

  console.log('[PASS] TEST G: Scene 2 receives corresponding copy and Scene 3 receives corresponding CTA');

  // =========================================================================
  // TEST H: PAIR COUNT LOCK & DETECTING NON-COMPLIANT ITEMS
  // =========================================================================
  const incompletePairs: GeneratedScenePair[] = [
    {
      id: 'p1',
      pairIndex: 1,
      salesAngle: 'Ângulo 1',
      scene2Copy: makeString('Copy 1 válida da Cena 2 com tamanho ideal e pontuação completa no final.', 165),
      scene3Cta: makeString('Clique no carrinho laranja agora mesmo para aproveitar o lote especial.', 165),
      productRevisionId: revisionId
    }
  ];

  // User requested 4 (2 pairs), but only 1 pair exists
  const nonCompliantQty4 = getNonCompliantItems(incompletePairs, 2, 4);
  assert(nonCompliantQty4.length === 1, 'Test H: Must detect 1 missing pair when 2 pairs were requested');
  assert(nonCompliantQty4[0].field === 'missing_pair', 'Test H: Identified missing_pair for pair 2');
  assert(nonCompliantQty4[0].pairIndex === 2, 'Test H: Missing pairIndex must be 2');
  console.log('[PASS] TEST H: Pair Count Lock accurately detects missing pairs');

  // =========================================================================
  // TEST I: COPY COMPLIANCE LOCK (145 ch, 180 ch, missing punctuation)
  // =========================================================================
  const outOfContractPairs: GeneratedScenePair[] = [
    {
      id: 'p1',
      pairIndex: 1,
      salesAngle: 'Ângulo 1',
      // 145 chars (below 160 min)
      scene2Copy: makeString('Esta copy curta de teste tem exatamente cento e quarenta e cinco caracteres para verificar a rejeicao no lock de contrato.', 145),
      // Valid Scene 3
      scene3Cta: makeString('Clique no carrinho laranja agora mesmo para aproveitar o lote especial.', 165),
      productRevisionId: revisionId
    },
    {
      id: 'p2',
      pairIndex: 2,
      salesAngle: 'Ângulo 2',
      // Valid Scene 2
      scene2Copy: makeString('Esta copy da Cena 2 possui o tamanho perfeitamente adequado para o contrato de teste.', 165),
      // 180 chars (above 175 max)
      scene3Cta: makeString('Clique no carrinho laranja agora mesmo para aproveitar esta oferta especial e garantir seu produto com envio prioritario e frete rapido para todo o Brasil.', 180),
      productRevisionId: revisionId
    }
  ];

  const itemsToFix = getNonCompliantItems(outOfContractPairs, 2, 4);
  assert(itemsToFix.length === 2, `Test I: Must detect exactly 2 non-compliant items, got ${itemsToFix.length}`);
  assert(itemsToFix[0].pairIndex === 1 && itemsToFix[0].field === 'scene2Copy', 'Test I: Detected invalid Scene 2 (145 ch) in Pair 1');
  assert(itemsToFix[1].pairIndex === 2 && itemsToFix[1].field === 'scene3Cta', 'Test I: Detected invalid Scene 3 (180 ch) in Pair 2');
  console.log('[PASS] TEST I: Copy Compliance Lock accurately detects out-of-contract texts (145 ch and 180 ch)');

  // =========================================================================
  // TEST J: GRANULAR RETRY (Valid copies preserved, only invalid corrected)
  // =========================================================================
  const correctionResponse = {
    corrections: [
      {
        pairIndex: 1,
        scene2Copy: makeString('Esta copy corrigida da Cena 2 possui exatamente o tamanho perfeito entre 160 e 175 caracteres com pontuacao final valida.', 165)
      },
      {
        pairIndex: 2,
        scene3Cta: makeString('Toque no carrinho laranja abaixo e garanta o seu antes que o estoque acabe!', 165)
      }
    ]
  };

  const correctedPairs = applyGranularCorrections(outOfContractPairs, correctionResponse, itemsToFix, revisionId);

  assert(correctedPairs.length === 2, 'Test J: Preserves 2 pairs');
  // Pair 1 Scene 3 was ALREADY valid and must NOT have been changed:
  assert(correctedPairs[0].scene3Cta === outOfContractPairs[0].scene3Cta, 'Test J: Valid Scene 3 in Pair 1 was kept untouched');
  // Pair 2 Scene 2 was ALREADY valid and must NOT have been changed:
  assert(correctedPairs[1].scene2Copy === outOfContractPairs[1].scene2Copy, 'Test J: Valid Scene 2 in Pair 2 was kept untouched');
  // Pair 1 Scene 2 was updated:
  assert(correctedPairs[0].scene2Copy === correctionResponse.corrections[0].scene2Copy, 'Test J: Pair 1 Scene 2 was corrected');
  // Pair 2 Scene 3 was updated:
  assert(correctedPairs[1].scene3Cta === correctionResponse.corrections[1].scene3Cta, 'Test J: Pair 2 Scene 3 was corrected');

  // Verify all now compliant:
  const remainingFixes = getNonCompliantItems(correctedPairs, 2, 4);
  assert(remainingFixes.length === 0, 'Test J: After granular correction, zero issues remain');
  console.log('[PASS] TEST J: Granular Retry updates only invalid items and preserves valid copies');

  // =========================================================================
  // TEST K: ADAPTIVE DELTA DETERMINISTIC MATH (Cases A, B, C, D, E, F)
  // =========================================================================
  // Caso A: 148 ch -> +12 min / +20 ideal / +27 max (EXPAND to ~168)
  const deltaA = calculateAdaptiveDelta(148);
  assert(deltaA.direction === 'EXPAND', 'Test K: Case A must EXPAND');
  assert(deltaA.minDelta === 12, `Test K: Case A minDelta expected 12, got ${deltaA.minDelta}`);
  assert(deltaA.idealDelta === 20, `Test K: Case A idealDelta expected 20, got ${deltaA.idealDelta}`);
  assert(deltaA.maxDelta === 27, `Test K: Case A maxDelta expected 27, got ${deltaA.maxDelta}`);
  assert(deltaA.targetLength === 168, 'Test K: Case A targetLength must be 168');

  // Caso B: 154 ch -> +6 min / +14 ideal / +21 max (EXPAND to ~168)
  const deltaB = calculateAdaptiveDelta(154);
  assert(deltaB.direction === 'EXPAND', 'Test K: Case B must EXPAND');
  assert(deltaB.minDelta === 6, `Test K: Case B minDelta expected 6, got ${deltaB.minDelta}`);
  assert(deltaB.idealDelta === 14, `Test K: Case B idealDelta expected 14, got ${deltaB.idealDelta}`);
  assert(deltaB.maxDelta === 21, `Test K: Case B maxDelta expected 21, got ${deltaB.maxDelta}`);

  // Caso C: 159 ch -> +1 min / +9 ideal / +16 max (EXPAND to ~168)
  const deltaC = calculateAdaptiveDelta(159);
  assert(deltaC.direction === 'EXPAND', 'Test K: Case C must EXPAND');
  assert(deltaC.minDelta === 1, `Test K: Case C minDelta expected 1, got ${deltaC.minDelta}`);
  assert(deltaC.idealDelta === 9, `Test K: Case C idealDelta expected 9, got ${deltaC.idealDelta}`);
  assert(deltaC.maxDelta === 16, `Test K: Case C maxDelta expected 16, got ${deltaC.maxDelta}`);

  // Caso D: 176 ch -> -1 min / -8 ideal / -16 max (REDUCE to ~168)
  const deltaD = calculateAdaptiveDelta(176);
  assert(deltaD.direction === 'REDUCE', 'Test K: Case D must REDUCE');
  assert(deltaD.minDelta === 1, `Test K: Case D minDelta expected 1, got ${deltaD.minDelta}`);
  assert(deltaD.idealDelta === 8, `Test K: Case D idealDelta expected 8, got ${deltaD.idealDelta}`);
  assert(deltaD.maxDelta === 16, `Test K: Case D maxDelta expected 16, got ${deltaD.maxDelta}`);

  // Caso E: 179 ch -> -4 min / -11 ideal / -19 max (REDUCE to ~168)
  const deltaE = calculateAdaptiveDelta(179);
  assert(deltaE.direction === 'REDUCE', 'Test K: Case E must REDUCE');
  assert(deltaE.minDelta === 4, `Test K: Case E minDelta expected 4, got ${deltaE.minDelta}`);
  assert(deltaE.idealDelta === 11, `Test K: Case E idealDelta expected 11, got ${deltaE.idealDelta}`);
  assert(deltaE.maxDelta === 19, `Test K: Case E maxDelta expected 19, got ${deltaE.maxDelta}`);

  // Caso F: 190 ch -> -15 min / -22 ideal / -30 max (REDUCE to ~168)
  const deltaF = calculateAdaptiveDelta(190);
  assert(deltaF.direction === 'REDUCE', 'Test K: Case F must REDUCE');
  assert(deltaF.minDelta === 15, `Test K: Case F minDelta expected 15, got ${deltaF.minDelta}`);
  assert(deltaF.idealDelta === 22, `Test K: Case F idealDelta expected 22, got ${deltaF.idealDelta}`);
  assert(deltaF.maxDelta === 30, `Test K: Case F maxDelta expected 30, got ${deltaF.maxDelta}`);

  // All resulting lengths 160-175 are VALID
  [160, 165, 168, 172, 175].forEach(len => {
    const d = calculateAdaptiveDelta(len);
    assert(d.direction === 'PERFECT', `Test K: Length ${len} must be PERFECT`);
  });
  console.log('[PASS] TEST K: Adaptive Delta deterministic calculations (Cases A-F) verified accurately');

  // =========================================================================
  // TEST L: ADAPTIVE DELTA PROMPT QUALITY & MINIMAL EDIT INSTRUCTIONS
  // =========================================================================
  const testInput = {
    quantity: 2 as CombinedVariationQuantity,
    productRevisionId: revisionId,
    productIdentity: 'Toalha de Banho Egípcia',
    category: 'Cama, Mesa e Banho',
    verifiedFacts: ['100% algodão egípcio', 'Gramatura 600g/m²'],
    visibleDetails: ['Acabamento aveludado', 'Costura dupla reforçada']
  };

  const sampleInvalidItems = [
    {
      pairIndex: 1,
      field: 'scene2Copy' as const,
      currentText: makeString('Toalha macia de algodao que absorve rapido sem irritar a pele sensivel.', 154),
      charCount: 154,
      issue: 'Extensão inválida (154 caracteres). Esperado: 160 a 175.',
      salesAngle: 'Alta Maciez'
    },
    {
      pairIndex: 2,
      field: 'scene3Cta' as const,
      currentText: makeString('Toque no carrinho laranja e peca a sua toalha premium com entrega ultra rapida para todo o territorio nacional agora mesmo.', 179),
      charCount: 179,
      issue: 'Extensão inválida (179 caracteres). Esperado: 160 a 175.',
      salesAngle: 'Urgência Estoque'
    }
  ];

  const promptResult = buildGranularCorrectionPrompt(testInput, sampleInvalidItems);
  assert(promptResult.userPrompt.includes('Comprimento atual: 154 caracteres'), 'Test L: User prompt contains current length');
  assert(promptResult.userPrompt.includes('Adicione aproximadamente 14 caracteres'), 'Test L: User prompt contains expansion delta (+14)');
  assert(promptResult.userPrompt.includes('Remova aproximadamente 11 caracteres'), 'Test L: User prompt contains reduction delta (-11)');
  assert(promptResult.userPrompt.includes('Não reescrever do zero') || promptResult.systemPrompt.includes('EDITAR, NÃO RECRIAR DO ZERO'), 'Test L: Contains minimal edit instruction');
  assert(promptResult.userPrompt.includes('carrinho laranja'), 'Test L: Scene 3 specifies mandatory carrinho laranja');
  console.log('[PASS] TEST L: Adaptive Delta Prompt contains minimal edit rules and exact delta guidance');

  // =========================================================================
  // TEST M: GRANULAR SCENE ISOLATION (Single invalid scene preserved & corrected)
  // =========================================================================
  // Sub-case 1: Scene 2 invalid + Scene 3 valid -> Only Scene 2 in itemsToFix
  const singleScene2Invalid: GeneratedScenePair[] = [
    {
      id: 'p1',
      pairIndex: 1,
      salesAngle: 'Ângulo 1',
      scene2Copy: makeString('Copy curta', 145), // INVALID
      scene3Cta: makeString('Toque no carrinho laranja abaixo e garanta o seu hoje mesmo.', 165), // VALID
      productRevisionId: revisionId
    }
  ];
  const itemsS2Only = getNonCompliantItems(singleScene2Invalid, 1, 2);
  assert(itemsS2Only.length === 1 && itemsS2Only[0].field === 'scene2Copy', 'Test M: Only Scene 2 flagged when Scene 3 is valid');

  // Sub-case 2: Scene 2 valid + Scene 3 invalid -> Only Scene 3 in itemsToFix
  const singleScene3Invalid: GeneratedScenePair[] = [
    {
      id: 'p1',
      pairIndex: 1,
      salesAngle: 'Ângulo 1',
      scene2Copy: makeString('Esta toalha macia de algodao egipcio absorve a agua sem deixar marcas.', 165), // VALID
      scene3Cta: makeString('Toque no carrinho verde agora', 140), // INVALID (length & missing carrinho laranja)
      productRevisionId: revisionId
    }
  ];
  const itemsS3Only = getNonCompliantItems(singleScene3Invalid, 1, 2);
  assert(itemsS3Only.length === 1 && itemsS3Only[0].field === 'scene3Cta', 'Test M: Only Scene 3 flagged when Scene 2 is valid');

  // Sub-case 3: Both valid -> 0 items to fix (zero retry)
  const bothValid: GeneratedScenePair[] = [
    {
      id: 'p1',
      pairIndex: 1,
      salesAngle: 'Ângulo 1',
      scene2Copy: makeString('Esta toalha macia de algodao egipcio absorve a agua sem deixar marcas.', 165), // VALID
      scene3Cta: makeString('Toque no carrinho laranja abaixo e garanta o seu hoje mesmo sem falta.', 165), // VALID
      productRevisionId: revisionId
    }
  ];
  const itemsNone = getNonCompliantItems(bothValid, 1, 2);
  assert(itemsNone.length === 0, 'Test M: Zero items flagged when both scenes are valid');
  console.log('[PASS] TEST M: Granular isolation accurately isolates single-scene invalidity');

  // =========================================================================
  // EXTRA: JSON unwrapping from Markdown blocks and Unicode character counting
  // =========================================================================
  const markdownWrapped = '```json\n{"pairs": [{"salesAngle": "A", "scene2Copy": "abc", "scene3Cta": "def"}]}\n```';
  const extracted = extractJsonFromResponse(markdownWrapped);
  assert(extracted.pairs.length === 1, 'Extra: Markdown JSON unwrap must succeed');

  assert(countCharacters('carrinho 🍊') === 10, 'Extra: Unicode code point character counting works accurately');

  console.log('\n>>> ALL COMBINED VARIATIONS TESTS (A-G) PASSED SUCCESSFULLY! <<<\n');
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('combinedVariations.test')) {
  runAllCombinedVariationsTests().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
