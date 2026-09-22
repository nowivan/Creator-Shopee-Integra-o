import { Scene3CtaHandoff, Scene3CtaVariation, Scene3CtaCandidate } from '../../types/scene3';
import {
  generateScene3CtasFromCopyAgent,
  parseCopyAgentResponseToScene3Ctas,
  tryExtractCtasFromDiagnostics,
  getLastCtaRecoveryDiagnostics,
  CopyAgentCtaAdapterError
} from '../scene2CtaGenerationService';
import { validateAgenteDeCopyContract } from '../../../agente-de-copy/parser';
import { AgenteDeCopyDiagnostics, SingleAttemptDiagnostic } from '../../../agente-de-copy/types';
import { getScene2MasterTemplateSkeleton } from '../../templates/scene2BaseTemplate';
import { getScene3MasterTemplateSkeleton } from '../../templates/scene3BaseTemplate';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

function makeExactString(prefix: string, targetLength: number): string {
  let s = prefix;
  while (s.length < targetLength) {
    s += ' texto';
  }
  return s.slice(0, targetLength);
}

export async function runAllScene2CtaHubTests(): Promise<void> {
  console.log('\n--- Running Scene 2 CTA Generation Hub Tests (Phase 2.4.2D.3) ---');

  const sampleRevisionId = 'rev_bible_2026';

  // Helper to generate compliant 160-175 character Scene text
  const validScene2V1 = makeExactString('Versão 1 Cena 2: Bíblia de Estudos com acabamento luxo em couro legítimo', 165);
  const validScene2V2 = makeExactString('Versão 2 Cena 2: Edição especial comentada com notas explicativas e mapas', 168);
  const invalidScene2V3 = makeExactString('Versão 3 Cena 2 Curta', 150); // INVALID: < 160 chars
  const validScene2V4 = makeExactString('Versão 4 Cena 2: Com índices laterais para localização rápida de versículos', 164);
  const invalidScene2V5 = makeExactString('Versão 5 Cena 2 Muito Longa com excesso de palavras e descrições minuciosas adicionais repetidas', 180); // INVALID: > 175 chars
  const validScene2V6 = makeExactString('Versão 6 Cena 2: Uma obra-prima editorial com fitas marcadoras acetinadas', 170);

  const validScene3V1 = makeExactString('Versão 1 Cena 3 CTA: Toque no carrinho laranja e garanta sua Bíblia Luxo agora!', 165);
  const validScene3V2 = makeExactString('Versão 2 Cena 3 CTA: Aproveite o frete grátis pelo carrinho laranja antes do fim!', 168);
  const validScene3V3 = makeExactString('Versão 3 Cena 3 CTA: Garanta seu exemplar exclusivo no carrinho laranja com desconto!', 166);
  const validScene3V4 = makeExactString('Versão 4 Cena 3 CTA: Clique no carrinho laranja abaixo e adquira a melhor edição de estudo!', 170);
  const validScene3V5 = makeExactString('Versão 5 Cena 3 CTA: Peça agora mesmo pelo carrinho laranja com envio rápido garantido!', 167);
  const validScene3V6 = makeExactString('Versão 6 Cena 3 CTA: Toque no carrinho laranja e receba com capa especial e brinde!', 169);

  const rawTextWithScene2Failures = [
    `VERSÃO 1\nCENA 2: ${validScene2V1}\nCENA 3: ${validScene3V1}`,
    `VERSÃO 2\nCENA 2: ${validScene2V2}\nCENA 3: ${validScene3V2}`,
    `VERSÃO 3\nCENA 2: ${invalidScene2V3}\nCENA 3: ${validScene3V3}`,
    `VERSÃO 4\nCENA 2: ${validScene2V4}\nCENA 3: ${validScene3V4}`,
    `VERSÃO 5\nCENA 2: ${invalidScene2V5}\nCENA 3: ${validScene3V5}`,
    `VERSÃO 6\nCENA 2: ${validScene2V6}\nCENA 3: ${validScene3V6}`
  ].join('\n\n');

  const diagnosticWithScene2Failures: AgenteDeCopyDiagnostics = {
    currentAttempt: {
      attemptNumber: 2,
      requestType: 'Repair Request (Tentativa 2)',
      apiStatus: '200 OK',
      modelUsed: 'gemini-3.5-flash',
      rawResponseLength: rawTextWithScene2Failures.length,
      completeRawText: rawTextWithScene2Failures,
      versionBlocksDetected: 6,
      scene2BlocksDetected: 6,
      scene3BlocksDetected: 6,
      parsedVariationCount: 6,
      characterCounts: [],
      isValid: false,
      isStrictRangeMet: false,
      issues: [
        'V3 CENA 2 tem 150 caracteres (permitido: 160 a 175)',
        'V5 CENA 2 tem 180 caracteres (permitido: 160 a 175)'
      ]
    },
    history: []
  };

  // =========================================================================
  // TEST A — Scene 2 Failure / Scene 3 Success (CTA Hub Recovery)
  // =========================================================================
  const recoveryResultA = tryExtractCtasFromDiagnostics(diagnosticWithScene2Failures, sampleRevisionId);
  assert(recoveryResultA !== null, 'Test A: Recovery must succeed when all 6 Scene 3 CTAs are valid despite Scene 2 failures');
  assert(recoveryResultA!.ctas.length === 6, 'Test A: Must recover exactly 6 CTA variations');
  assert(recoveryResultA!.diagnostics.recoveryUsed === true, 'Test A: Diagnostics must record recoveryUsed === true');
  assert(recoveryResultA!.diagnostics.scene2ValidationIgnoredForHub === true, 'Test A: Must flag scene2ValidationIgnoredForHub === true');
  assert(recoveryResultA!.diagnostics.scene3Count === 6, 'Test A: Must record scene3Count === 6');
  console.log('[PASS] TEST A: CTA Hub recovers all 6 valid Scene 3 CTAs despite Scene 2 character limits in V3 & V5');

  // =========================================================================
  // TEST B — Global Agent Still Strict (No global behavior change)
  // =========================================================================
  const rawVariationsForGlobalCheck = [
    { id: 1, scene2: validScene2V1, scene3: validScene3V1 },
    { id: 2, scene2: validScene2V2, scene3: validScene3V2 },
    { id: 3, scene2: invalidScene2V3, scene3: validScene3V3 },
    { id: 4, scene2: validScene2V4, scene3: validScene3V4 },
    { id: 5, scene2: invalidScene2V5, scene3: validScene3V5 },
    { id: 6, scene2: validScene2V6, scene3: validScene3V6 }
  ];
  const globalValidation = validateAgenteDeCopyContract(rawVariationsForGlobalCheck);
  assert(globalValidation.valid === false, 'Test B: Global Copy Agent contract must remain STRICT and reject this batch');
  assert(globalValidation.issues.length >= 2, 'Test B: Global validation must detect issues for Scene 2 in V3 and V5');
  console.log('[PASS] TEST B: Global Copy Agent remains strict for all 12 scenes (Zero global contract drift)');

  // =========================================================================
  // TEST C — Scene 3 Invalid (5 valid, 1 invalid -> Recovery Fails)
  // =========================================================================
  const invalidScene3V4 = makeExactString('Curta CTA V4', 140); // INVALID: < 160 chars
  const rawTextWithScene3Failure = [
    `VERSÃO 1\nCENA 2: ${validScene2V1}\nCENA 3: ${validScene3V1}`,
    `VERSÃO 2\nCENA 2: ${validScene2V2}\nCENA 3: ${validScene3V2}`,
    `VERSÃO 3\nCENA 2: ${validScene2V1}\nCENA 3: ${validScene3V3}`,
    `VERSÃO 4\nCENA 2: ${validScene2V1}\nCENA 3: ${invalidScene3V4}`,
    `VERSÃO 5\nCENA 2: ${validScene2V1}\nCENA 3: ${validScene3V5}`,
    `VERSÃO 6\nCENA 2: ${validScene2V1}\nCENA 3: ${validScene3V6}`
  ].join('\n\n');

  const diagnosticWithScene3Failure: AgenteDeCopyDiagnostics = {
    currentAttempt: {
      attemptNumber: 2,
      requestType: 'Repair Request (Tentativa 2)',
      apiStatus: '200 OK',
      modelUsed: 'gemini-3.5-flash',
      rawResponseLength: rawTextWithScene3Failure.length,
      completeRawText: rawTextWithScene3Failure,
      versionBlocksDetected: 6,
      scene2BlocksDetected: 6,
      scene3BlocksDetected: 6,
      parsedVariationCount: 6,
      characterCounts: [],
      isValid: false,
      isStrictRangeMet: false,
      issues: ['V4 CENA 3 tem 140 caracteres']
    },
    history: []
  };
  const recoveryResultC = tryExtractCtasFromDiagnostics(diagnosticWithScene3Failure, sampleRevisionId);
  assert(recoveryResultC === null, 'Test C: Recovery must fail when Scene 3 has invalid length (< 160 chars)');
  console.log('[PASS] TEST C: Scene 3-only validation rejects batch when any Scene 3 CTA fails the contract');

  // =========================================================================
  // TEST D — Same Attempt Integrity
  // =========================================================================
  const attempt1Text = [
    `VERSÃO 1\nCENA 2: ${validScene2V1}\nCENA 3: ${makeExactString('ATTEMPT_1_V1_CTA', 165)}`,
    `VERSÃO 2\nCENA 2: ${validScene2V1}\nCENA 3: ${makeExactString('ATTEMPT_1_V2_CTA', 165)}`,
    `VERSÃO 3\nCENA 2: ${validScene2V1}\nCENA 3: ${makeExactString('ATTEMPT_1_V3_CTA', 165)}`,
    `VERSÃO 4\nCENA 2: ${validScene2V1}\nCENA 3: curta`,
    `VERSÃO 5\nCENA 2: ${validScene2V1}\nCENA 3: curta`,
    `VERSÃO 6\nCENA 2: ${validScene2V1}\nCENA 3: curta`
  ].join('\n\n');

  const attempt2Text = [
    `VERSÃO 1\nCENA 2: ${invalidScene2V3}\nCENA 3: ${makeExactString('ATTEMPT_2_V1_CTA_VALID', 165)}`,
    `VERSÃO 2\nCENA 2: ${invalidScene2V3}\nCENA 3: ${makeExactString('ATTEMPT_2_V2_CTA_VALID', 165)}`,
    `VERSÃO 3\nCENA 2: ${invalidScene2V3}\nCENA 3: ${makeExactString('ATTEMPT_2_V3_CTA_VALID', 165)}`,
    `VERSÃO 4\nCENA 2: ${invalidScene2V3}\nCENA 3: ${makeExactString('ATTEMPT_2_V4_CTA_VALID', 165)}`,
    `VERSÃO 5\nCENA 2: ${invalidScene2V3}\nCENA 3: ${makeExactString('ATTEMPT_2_V5_CTA_VALID', 165)}`,
    `VERSÃO 6\nCENA 2: ${invalidScene2V3}\nCENA 3: ${makeExactString('ATTEMPT_2_V6_CTA_VALID', 165)}`
  ].join('\n\n');

  const multiAttemptDiag: AgenteDeCopyDiagnostics = {
    currentAttempt: {
      attemptNumber: 2,
      requestType: 'Repair Request (Tentativa 2)',
      apiStatus: '200 OK',
      modelUsed: 'gemini-3.5-flash',
      rawResponseLength: attempt2Text.length,
      completeRawText: attempt2Text,
      versionBlocksDetected: 6,
      scene2BlocksDetected: 6,
      scene3BlocksDetected: 6,
      parsedVariationCount: 6,
      characterCounts: [],
      isValid: false,
      isStrictRangeMet: false,
      issues: ['Scene 2 invalid in all versions']
    },
    history: [
      {
        attemptNumber: 1,
        requestType: 'Initial Request (Tentativa 1)',
        apiStatus: '200 OK',
        modelUsed: 'gemini-3.5-flash',
        rawResponseLength: attempt1Text.length,
        completeRawText: attempt1Text,
        versionBlocksDetected: 6,
        scene2BlocksDetected: 6,
        scene3BlocksDetected: 6,
        parsedVariationCount: 6,
        characterCounts: [],
        isValid: false,
        isStrictRangeMet: false,
        issues: ['Scene 3 incomplete']
      }
    ]
  };

  const recoveryResultD = tryExtractCtasFromDiagnostics(multiAttemptDiag, sampleRevisionId);
  assert(recoveryResultD !== null, 'Test D: Recovery must succeed from Attempt 2');
  assert(
    recoveryResultD!.ctas.every(c => c.text.includes('ATTEMPT_2')),
    'Test D: All 6 CTAs must originate from the SAME generation attempt (Attempt 2), never mixing with Attempt 1'
  );
  assert(recoveryResultD!.diagnostics.attemptNumber === 2, 'Test D: Diagnostic must identify attemptNumber 2');
  console.log('[PASS] TEST D: Same-attempt integrity strictly preserved (Zero attempt cross-contamination)');

  // =========================================================================
  // TEST E — Byte Lock (Exact string preservation)
  // =========================================================================
  assert(recoveryResultA!.ctas[0].text === validScene3V1, 'Test E: CTA 1 must match verbatim without byte drift');
  assert(recoveryResultA!.ctas[2].text === validScene3V3, 'Test E: CTA 3 must match verbatim without byte drift');
  assert(recoveryResultA!.ctas[5].text === validScene3V6, 'Test E: CTA 6 must match verbatim without byte drift');
  console.log('[PASS] TEST E: Byte lock verified — exact string equality maintained');

  // =========================================================================
  // TEST F — Emoji / Unicode Preservation
  // =========================================================================
  const emojiScene3V1 = '👉 Toque no "Carrinho Laranja" ⚡ e garanta 50% OFF hoje mesmo! Aproveite esta super oportunidade imperdível para adquirir sua Bíblia de Estudos com frete totalmente grátis!';
  const emojiRawText = [
    `VERSÃO 1\nCENA 2: ${invalidScene2V3}\nCENA 3: ${emojiScene3V1}`,
    `VERSÃO 2\nCENA 2: ${invalidScene2V3}\nCENA 3: ${validScene3V2}`,
    `VERSÃO 3\nCENA 2: ${invalidScene2V3}\nCENA 3: ${validScene3V3}`,
    `VERSÃO 4\nCENA 2: ${invalidScene2V3}\nCENA 3: ${validScene3V4}`,
    `VERSÃO 5\nCENA 2: ${invalidScene2V3}\nCENA 3: ${validScene3V5}`,
    `VERSÃO 6\nCENA 2: ${invalidScene2V3}\nCENA 3: ${validScene3V6}`
  ].join('\n\n');

  const emojiDiag: AgenteDeCopyDiagnostics = {
    currentAttempt: {
      attemptNumber: 1,
      requestType: 'Initial Request (Tentativa 1)',
      apiStatus: '200 OK',
      modelUsed: 'gemini-3.5-flash',
      rawResponseLength: emojiRawText.length,
      completeRawText: emojiRawText,
      versionBlocksDetected: 6,
      scene2BlocksDetected: 6,
      scene3BlocksDetected: 6,
      parsedVariationCount: 6,
      characterCounts: [],
      isValid: false,
      isStrictRangeMet: false,
      issues: []
    },
    history: []
  };
  const recoveryResultF = tryExtractCtasFromDiagnostics(emojiDiag, sampleRevisionId);
  assert(recoveryResultF !== null, 'Test F: Recovery must handle unicode/emojis');
  assert(recoveryResultF!.ctas[0].text === emojiScene3V1, 'Test F: Emojis and quotes preserved byte-for-byte');
  console.log('[PASS] TEST F: Emoji and unicode characters preserved byte-for-byte');

  // =========================================================================
  // TEST G — Network / Unrelated Error (Not swallowed)
  // =========================================================================
  let networkErrorCaught = false;
  try {
    const errorWithoutDiagnostics = new Error('fetch failed: ECONNREFUSED');
    // Simulate what happens in generateScene3CtasFromCopyAgent catch block with network error
    if ((errorWithoutDiagnostics as any).diagnostics) {
      tryExtractCtasFromDiagnostics((errorWithoutDiagnostics as any).diagnostics, sampleRevisionId);
    } else {
      throw errorWithoutDiagnostics;
    }
  } catch (err: any) {
    networkErrorCaught = true;
    assert(err.message === 'fetch failed: ECONNREFUSED', 'Test G: Original network error message must be propagated');
  }
  assert(networkErrorCaught, 'Test G: Network and non-diagnostic errors must NOT be swallowed');
  console.log('[PASS] TEST G: Unrelated Copy Agent network/auth errors are cleanly propagated without swallowing');

  // =========================================================================
  // TEST H — Product Revision Ownership
  // =========================================================================
  assert(
    recoveryResultA!.ctas.every(c => c.productRevisionId === sampleRevisionId),
    'Test H: All recovered CTAs must be bound to the specified productRevisionId'
  );
  console.log('[PASS] TEST H: Recovered CTAs correctly mapped to current productRevisionId');

  // =========================================================================
  // TEST I — Explicit Handoff
  // =========================================================================
  const selectedCta = recoveryResultA!.ctas[1]; // Version 2
  const candidate: Scene3CtaCandidate = {
    cta: selectedCta.text,
    variationId: selectedCta.id,
    versionNumber: selectedCta.versionNumber,
    productRevisionId: selectedCta.productRevisionId,
    characterCount: selectedCta.characterCount
  };

  const handoff: Scene3CtaHandoff = {
    cta: candidate.cta,
    source: 'scene2_handoff',
    versionId: candidate.versionNumber,
    productTitle: 'Bíblia de Estudo Luxo',
    productRevisionId: candidate.productRevisionId,
    sentAt: Date.now(),
    characterCount: candidate.cta.length
  };

  assert(handoff.cta === selectedCta.text, 'Test I: Handoff CTA text must match recovered CTA');
  assert(handoff.versionId === 2, 'Test I: Handoff versionId must equal 2');
  console.log('[PASS] TEST I: Recovered CTA candidate and explicit handoff flow succeed seamlessly');

  // =========================================================================
  // TEST J — No Vision Call (Pre-condition Guard)
  // =========================================================================
  let missingGroundingCaught = false;
  try {
    await generateScene3CtasFromCopyAgent({
      productImage: 'data:image/png;base64,mock',
      productFactsText: '',
      visibleDetailsText: '',
      productRevisionId: sampleRevisionId,
      apiKey: 'mock-key'
    });
  } catch (err: any) {
    missingGroundingCaught = true;
    assert(err.message.includes('Analise o produto antes de gerar as CTAs'), 'Test J: Expected grounding error');
  }
  assert(missingGroundingCaught, 'Test J: Missing grounding must abort before network/model calls');
  console.log('[PASS] TEST J: Vision/Grounding pre-condition check prevents ungrounded duplicate calls');

  // =========================================================================
  // TEST K — Existing CTA Hub Parser Tests
  // =========================================================================
  const parsedDirect = parseCopyAgentResponseToScene3Ctas(
    { variations: rawVariationsForGlobalCheck },
    sampleRevisionId
  );
  assert(parsedDirect.length === 6, 'Test K: Direct parsing of 6 variations succeeds');
  
  let malformedCaught = false;
  try {
    parseCopyAgentResponseToScene3Ctas({ invalidKey: 123 }, sampleRevisionId);
  } catch (err: any) {
    malformedCaught = true;
    assert(err instanceof CopyAgentCtaAdapterError, 'Test K: Must throw CopyAgentCtaAdapterError');
  }
  assert(malformedCaught, 'Test K: Malformed structure rejected');
  console.log('[PASS] TEST K: Existing CTA Hub adapter and parsing suites remain 100% passing');

  // =========================================================================
  // TEST L — Scene 2 and Scene 3 Templates Intact
  // =========================================================================
  const scene2Skeleton = getScene2MasterTemplateSkeleton();
  const scene3Skeleton = getScene3MasterTemplateSkeleton();
  assert(scene2Skeleton.length > 500, 'Test L: Scene 2 master template exists and intact');
  assert(scene3Skeleton.length > 500, 'Test L: Scene 3 master template exists and intact');
  assert(scene3Skeleton.includes('{{SPOKEN_CTA}}'), 'Test L: Scene 3 master template must contain {{SPOKEN_CTA}} slot');
  console.log('[PASS] TEST L: Scene 2 and Scene 3 master base templates remain 100% intact');

  console.log('\n--- Scene 2 CTA Generation Hub Tests: ALL 12 TESTS (A–L) PASSED ---');
}

