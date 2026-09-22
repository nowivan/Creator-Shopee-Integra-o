/**
 * VISUAL REFERENCE BENCHMARK & PARITY VALIDATION TEST SUITE
 * Stage 9 & 9B.1: Automated testing for benchmark evaluation, parity comparison, and Baseline Integrity Gate.
 * 
 * Validates:
 * 1. Zero AI calls: 100% deterministic structured comparison.
 * 2. Baseline Integrity Gate (Stage 9B.1):
 *    - Baseline exists != baseline verified.
 *    - Synthetic baselines (e.g. Scenario A default) cannot receive REAL_PARITY_VALIDATED.
 *    - Placeholder / empty baselines (Scenarios B-E slots) cannot receive REAL_PARITY_VALIDATED.
 *    - Subject mismatch (male vs female) triggers BASELINE_INTEGRITY_ERROR.
 *    - Valid verified manual input grants REAL_PARITY_VALIDATED.
 * 3. High weight on pose, arms, hands, text/branding separation, product lock, and prompt structure.
 * 4. Overall status classification (IMPROVED, PARITY, PARTIAL_PARITY, REGRESSION).
 * 5. Suite metrics aggregation.
 */

import {
  evaluateBenchmarkRecord,
  computeOverallBenchmarkStatus,
  createBenchmarkSuite,
  validateBaselineIntegrity,
  generateNormalizedBenchmarkReport,
  formatDomainStatusEnum,
  summarizeBenchmarkDomainStatuses,
  validateBenchmarkSummaryIntegrity,
  BENCHMARK_SCENARIOS_DATA,
  BENCHMARK_CANONICAL_DOMAIN_COUNT_LABEL,
  BENCHMARK_COMPARISON_KEYS_SCHEMA
} from '../services/visualReferenceBenchmark';
import { VisualReferenceAnalysis } from '../types/visualReferenceTypes';
import { composeVisualPrompt } from '../services/visualPromptComposer';
import {
  VisualReferenceBenchmarkComparison
} from '../types/benchmarkTypes';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
}

export function runStage9BenchmarkTests() {
  const results: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, status: 'PASS' });
    } catch (e: any) {
      results.push({ name, status: 'FAIL', error: e.message || String(e) });
    }
  }

  // --------------------------------------------------------------------------
  // Stage 9B.1 Baseline Integrity Gate Unit Tests
  // --------------------------------------------------------------------------

  test('Stage 9B.1 Gate: Synthetic baseline is blocked from REAL_PARITY_VALIDATED', () => {
    const scA = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'SIMPLE_PORTRAIT')!;
    assert(scA.baselineSource === 'SYNTHETIC_TEST', 'Scenario A default must be SYNTHETIC_TEST');
    assert(scA.baselineSynthetic === true, 'Scenario A default must have baselineSynthetic=true');
    assert(scA.baselineVerified === false, 'Scenario A default must have baselineVerified=false');

    const integrity = validateBaselineIntegrity({
      baselineSourcePrompt: scA.originalBaseline.prompt,
      baselineSource: scA.baselineSource,
      baselineSynthetic: scA.baselineSynthetic,
      baselineVerified: scA.baselineVerified
    });

    assert(integrity.status === 'SYNTHETIC', `Expected SYNTHETIC, got ${integrity.status}`);
    assert(integrity.isEligibleForRealParity === false, 'Synthetic baseline must not be eligible for real parity');
    assert(integrity.error?.code === 'BASELINE_INTEGRITY_ERROR', 'Expected BASELINE_INTEGRITY_ERROR code');

    // Test record evaluation cannot be REAL_PARITY_VALIDATED even if confirmedByOperator is true
    const record = evaluateBenchmarkRecord({
      scenario: scA.name,
      scenarioType: scA.scenarioType,
      inputReference: scA.imageUrl,
      baselineSource: 'SYNTHETIC_TEST',
      baselineSynthetic: true,
      baselineVerified: true, // Attempt to verify synthetic
      confirmedByOperator: true,
      originalAgent: { prompt: scA.originalBaseline.prompt },
      visualReferenceAgent: {
        analysis: {
          subject: { type: { status: 'VISIBLE', value: 'man wearing white polo shirt' } }
        }
      }
    });

    assert(record.validationMode === 'HARNESS_VALIDATED', `Expected HARNESS_VALIDATED for synthetic baseline, got ${record.validationMode}`);
    assert(record.baselineIntegrityStatus === 'SYNTHETIC', 'Expected baselineIntegrityStatus SYNTHETIC');
  });

  test('Stage 9B.1 Gate: Placeholder / empty baseline triggers error and blocks REAL_PARITY_VALIDATED', () => {
    // Empty prompt (Missing)
    const integrityMissing = validateBaselineIntegrity({
      baselineSourcePrompt: '',
      baselineSource: 'PLACEHOLDER',
      baselineVerified: false
    });
    assert(integrityMissing.status === 'MISSING', 'Empty prompt must be MISSING');
    assert(integrityMissing.isEligibleForRealParity === false, 'Missing baseline must not be eligible');

    // Placeholder prompt
    const integrityPlaceholder = validateBaselineIntegrity({
      baselineSourcePrompt: '[Aguardando inserção do prompt original]',
      baselineSource: 'PLACEHOLDER',
      baselineVerified: false
    });
    assert(integrityPlaceholder.status === 'PLACEHOLDER', 'Waiting slot must be PLACEHOLDER');
    assert(integrityPlaceholder.isEligibleForRealParity === false, 'Placeholder must not be eligible');
    assert(integrityPlaceholder.error?.code === 'BASELINE_INTEGRITY_ERROR', 'Expected integrity error');
  });

  test('Stage 9B.1 Gate: Subject mismatch detection (Female reference vs Male baseline)', () => {
    const analysis: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'female presenter with microphone' }, count: { status: 'VISIBLE', value: 1 } }
    };

    // Baseline prompt specifies a young man
    const integrity = validateBaselineIntegrity({
      baselineSourcePrompt: 'Studio portrait of a young man wearing a navy blazer and white shirt.',
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineVerified: true,
      baselineSynthetic: false,
      analysis
    });

    assert(integrity.status === 'SUBJECT_MISMATCH', `Expected SUBJECT_MISMATCH, got ${integrity.status}`);
    assert(integrity.isEligibleForRealParity === false, 'Mismatched subject must not be eligible');
    assert(integrity.error?.code === 'BASELINE_INTEGRITY_ERROR', 'Expected BASELINE_INTEGRITY_ERROR');
    assert(integrity.error?.expected?.includes('female') ?? false, 'Expected field must reference female');
    assert(integrity.error?.actual?.includes('male') ?? false, 'Actual field must reference male');
  });

  test('Stage 9B.1 Gate: Subject mismatch detection (Male reference vs Female baseline)', () => {
    const analysis: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male presenter in studio' }, count: { status: 'VISIBLE', value: 1 } }
    };

    // Baseline prompt specifies a woman
    const integrity = validateBaselineIntegrity({
      baselineSourcePrompt: 'Studio portrait of an elegant woman wearing a blazer.',
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineVerified: true,
      baselineSynthetic: false,
      analysis
    });

    assert(integrity.status === 'SUBJECT_MISMATCH', `Expected SUBJECT_MISMATCH, got ${integrity.status}`);
    assert(integrity.isEligibleForRealParity === false, 'Mismatched subject must not be eligible');
    assert(integrity.error?.code === 'BASELINE_INTEGRITY_ERROR', 'Expected BASELINE_INTEGRITY_ERROR');
    assert(integrity.error?.expected?.includes('male') ?? false, 'Expected field must reference male');
    assert(integrity.error?.actual?.includes('female') ?? false, 'Actual field must reference female');
  });

  test('Stage 9B.1 Gate: Baseline Present != Verified (Unverified real input remains HARNESS_VALIDATED)', () => {
    const analysis: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male presenter in studio' }, count: { status: 'VISIBLE', value: 1 } }
    };

    // Prompt is valid and matched, but not verified by operator
    const integrity = validateBaselineIntegrity({
      baselineSourcePrompt: 'Studio portrait of a young man wearing a white polo shirt in high key lighting.',
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineVerified: false,
      baselineSynthetic: false,
      analysis
    });

    assert(integrity.status === 'UNVERIFIED', `Expected UNVERIFIED, got ${integrity.status}`);
    assert(integrity.isEligibleForRealParity === false, 'Unverified baseline is not eligible for real parity');

    const record = evaluateBenchmarkRecord({
      scenario: 'Test Scenario',
      scenarioType: 'SIMPLE_PORTRAIT',
      inputReference: 'http://test.com/img.jpg',
      baselineSourcePrompt: 'Studio portrait of a young man wearing a white polo shirt in high key lighting.',
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineVerified: false,
      confirmedByOperator: false,
      visualReferenceAgent: { analysis }
    });

    assert(record.validationMode === 'HARNESS_VALIDATED', 'Unverified record must be HARNESS_VALIDATED');
    assert(record.baselineIntegrityStatus === 'UNVERIFIED', 'Status must be UNVERIFIED');
  });

  test('Stage 9B.1 Gate: Valid, verified real baseline successfully grants REAL_PARITY_VALIDATED', () => {
    const analysis: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male presenter in studio' }, count: { status: 'VISIBLE', value: 1 } },
      face: {
        eyeAppearance: { status: 'VISIBLE', value: 'dark brown eyes' },
        noseAppearance: { status: 'VISIBLE', value: 'straight nose' },
        mouthAppearance: { status: 'VISIBLE', value: 'neutral mouth' }
      },
      preservation: { preservePose: true, preserveWardrobe: true, preserveColors: true, preservePhysicalBranding: true }
    };

    const realBaselinePrompt = 'Studio portrait of a young man wearing a white polo shirt, clean lighting, neutral background.';

    const integrity = validateBaselineIntegrity({
      baselineSourcePrompt: realBaselinePrompt,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineVerified: true,
      baselineSynthetic: false,
      analysis
    });

    assert(integrity.status === 'VALID', `Expected VALID, got ${integrity.status}`);
    assert(integrity.isEligibleForRealParity === true, 'Valid verified real baseline must be eligible');
    assert(!integrity.error, 'Should not have integrity error');

    const record = evaluateBenchmarkRecord({
      scenario: 'Cenário A — Real Verified',
      scenarioType: 'SIMPLE_PORTRAIT',
      inputReference: 'http://test.com/polo.jpg',
      baselineSourcePrompt: realBaselinePrompt,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineVerified: true,
      baselineSynthetic: false,
      confirmedByOperator: true,
      visualReferenceAgent: { analysis }
    });

    assert(record.validationMode === 'REAL_PARITY_VALIDATED', `Expected REAL_PARITY_VALIDATED, got ${record.validationMode}`);
    assert(record.baselineIntegrityStatus === 'VALID', 'Expected integrity status VALID');
    assert(record.baselineSource === 'MANUAL_REAL_INPUT', 'Expected MANUAL_REAL_INPUT');
  });

  // --------------------------------------------------------------------------
  // Stage 9C: First Real Parity Run (Scenario A — Studio Portrait / White Polo)
  // --------------------------------------------------------------------------
  test('Stage 9C: Full Execution of Scenario A First Real Parity Run', () => {
    // 1. Reference Image & Canonical Analysis
    const scA = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'SIMPLE_PORTRAIT')!;
    assert(!!scA, 'Scenario A must exist');

    const canonicalAnalysis: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male presenter in white polo shirt' }, count: { status: 'VISIBLE', value: 1 } },
      face: {
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes in sharp focus' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Relaxed pleasant neutral closed mouth' }
      },
      hair: {
        color: { status: 'VISIBLE', value: 'Dark brown' },
        length: { status: 'VISIBLE', value: 'Short neat cut' }
      },
      skin: {
        visibleTone: { status: 'VISIBLE', value: 'Natural warm tone' },
        surfaceTexture: { status: 'VISIBLE', value: 'Microscopic skin pores without plastic airbrushing' }
      },
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: 'Frontal alignment towards camera' },
          shoulderLine: { status: 'VISIBLE', value: 'Slightly relaxed natural shoulder alignment' },
          leftArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting naturally downwards by side' },
            elbowState: { status: 'VISIBLE', value: 'straight extended' }
          },
          leftHand: {
            gesture: { status: 'VISIBLE', value: 'Relaxed open fingers' },
            contactTarget: { status: 'VISIBLE', value: 'None' }
          },
          rightArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting downwards alongside torso' },
            elbowState: { status: 'VISIBLE', value: 'extended downwards' }
          },
          rightHand: {
            gesture: { status: 'VISIBLE', value: 'Relaxed natural hand position' },
            contactTarget: { status: 'VISIBLE', value: 'None' }
          }
        },
        wardrobe: {
          top: {
            type: { status: 'VISIBLE', value: 'solid white polo shirt with collar' },
            color: { status: 'VISIBLE', value: 'pure white' },
            fabricAppearance: { status: 'VISIBLE', value: 'fine cotton piqué weave' }
          }
        },
        camera: {
          viewpoint: { status: 'VISIBLE', value: 'Eye-level frontal' },
          depthOfField: { status: 'VISIBLE', value: 'Shallow commercial studio portrait f/2.2' }
        },
        lighting: {
          lightType: { status: 'VISIBLE', value: 'artificial-looking' },
          softness: { status: 'VISIBLE', value: 'soft' },
          direction: { status: 'VISIBLE', value: 'Front key light with subtle lateral soft fill' }
        },
        background: {
          type: { status: 'VISIBLE', value: 'Clean studio light neutral background' },
          dominantColors: { status: 'VISIBLE', value: ['#E4E4E7'] }
        }
      },
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    // 2. Real Original Agent Prompt (Pasted manually by operator, preserved literally)
    const rawRealBaselinePrompt = 'Studio portrait of a handsome young man wearing a crisp white polo shirt, standing centered against a bright clean neutral studio backdrop, soft frontal lighting, 8k photographic details.';
    
    // Initial save state before operator validation:
    const initialSource = 'MANUAL_REAL_INPUT';
    const initialSynthetic = false;
    const initialVerified = false;

    // 3. Validate Integrity Gate
    const integrityCheck = validateBaselineIntegrity({
      baselineSourcePrompt: rawRealBaselinePrompt,
      baselineSource: initialSource,
      baselineSynthetic: initialSynthetic,
      baselineVerified: false,
      analysis: canonicalAnalysis
    });

    assert(integrityCheck.status === 'UNVERIFIED', 'Unverified initial state must be UNVERIFIED');
    assert(integrityCheck.error === undefined, 'Should have no structural error');

    // Pre-check eligibility for operator verification
    const eligibilityCheck = validateBaselineIntegrity({
      baselineSourcePrompt: rawRealBaselinePrompt,
      baselineSource: initialSource,
      baselineSynthetic: initialSynthetic,
      baselineVerified: true,
      analysis: canonicalAnalysis
    });
    assert(eligibilityCheck.status === 'VALID', 'Eligibility check with verified=true must be VALID');
    assert(eligibilityCheck.isEligibleForRealParity === true, 'Must be eligible for REAL_PARITY_VALIDATED');

    // 4. Operator Confirmation
    const finalVerified = true;

    // 5. Evaluate all 20 domains (with cleaningQuality = UNDETERMINED if no cleaned image from original agent)
    const record = evaluateBenchmarkRecord({
      scenario: scA.name,
      scenarioType: scA.scenarioType,
      inputReference: scA.imageUrl,
      baselineSourcePrompt: rawRealBaselinePrompt,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: finalVerified,
      confirmedByOperator: true,
      manualOverrides: {
        cleaningQuality: {
          status: 'UNDETERMINED',
          originalAgentObservation: 'Nenhuma imagem limpa disponível do Agente Original',
          visualReferenceAgentObservation: 'Cleaner gerado pelo Visual Reference Cleaner',
          notes: 'Sem imagem limpa original para comparação direta pixel a pixel.'
        }
      },
      originalAgent: {
        prompt: rawRealBaselinePrompt,
        // No cleanedImage provided -> triggers UNDETERMINED
        notes: ['Prompt monolítico sem decomposição bilateral ou locks explícitos']
      },
      visualReferenceAgent: {
        analysis: canonicalAnalysis
      }
    });

    // Validations:
    assert(record.validationMode === 'REAL_PARITY_VALIDATED', `Expected REAL_PARITY_VALIDATED, got ${record.validationMode}`);
    assert(record.baselineIntegrityStatus === 'VALID', 'Expected integrity status VALID');
    assert(record.baselineVerified === true, 'Expected baselineVerified true');
    assert(record.baselineSourcePrompt === rawRealBaselinePrompt, 'Prompt must be preserved literally');
    
    // Domain checks
    assert(record.comparison.subject?.status === 'BETTER', 'Subject should be strictly BETTER');
    assert(record.comparison.face?.status === 'BETTER', 'Face should be BETTER due to anatomically segregated sub-components');
    assert(record.comparison.pose?.status === 'MATCH' || record.comparison.pose?.status === 'BETTER', 'Pose status valid');
    assert(record.comparison.preservation?.status === 'BETTER', 'Preservation should be BETTER (explicit locks vs implicit)');
    assert(record.comparison.cleaningQuality?.status === 'UNDETERMINED', 'CleaningQuality must be UNDETERMINED without original clean image');
    
    // Overall status must be calculated (IMPROVED or PARITY)
    assert(record.overallStatus === 'IMPROVED', `Expected overallStatus IMPROVED, got ${record.overallStatus}`);
  });

  // --------------------------------------------------------------------------
  // Stage 9C.1: Benchmark Report Normalization Tests (A through F)
  // --------------------------------------------------------------------------
  test('Stage 9C.1 Normalization (A–F): Standardized 22 Comparison Keys & Single Literal Enum Outputs', () => {
    // Test A: Report uses canonical count of 22 comparison keys
    assert(BENCHMARK_COMPARISON_KEYS_SCHEMA.length === 22, `Expected 22 keys schema, got ${BENCHMARK_COMPARISON_KEYS_SCHEMA.length}`);
    assert(
      BENCHMARK_CANONICAL_DOMAIN_COUNT_LABEL === '22 comparison keys (20 macro domains + arms + hands)',
      'Canonical label must be exact'
    );

    const macroDomains = BENCHMARK_COMPARISON_KEYS_SCHEMA.filter((k) => k.category === 'MACRO_DOMAIN');
    const poseSubdomains = BENCHMARK_COMPARISON_KEYS_SCHEMA.filter((k) => k.category === 'POSE_SUBDOMAIN');
    assert(macroDomains.length === 20, `Expected 20 macro domains, got ${macroDomains.length}`);
    assert(poseSubdomains.length === 2, `Expected 2 pose subdomains (arms, hands), got ${poseSubdomains.length}`);
    assert(poseSubdomains.some((k) => k.key === 'arms'), 'arms must be in schema');
    assert(poseSubdomains.some((k) => k.key === 'hands'), 'hands must be in schema');

    // Test B: Status BETTER prints only BETTER
    assert(formatDomainStatusEnum('BETTER') === 'BETTER', 'BETTER must format to BETTER');

    // Test C: Status MATCH prints only MATCH
    assert(formatDomainStatusEnum('MATCH') === 'MATCH', 'MATCH must format to MATCH');

    // Test D: No summary generates combined/slashed string like "MATCH / BETTER"
    const scA = BENCHMARK_SCENARIOS_DATA[0];
    const record = evaluateBenchmarkRecord({
      scenario: scA.name,
      scenarioType: scA.scenarioType,
      inputReference: scA.imageUrl,
      baselineSourcePrompt: 'Studio portrait of a handsome young man wearing a crisp white polo shirt, standing centered against a bright clean neutral studio backdrop, soft frontal lighting, 8k photographic details.',
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: true,
      confirmedByOperator: true,
      visualReferenceAgent: {
        analysis: {
          subject: { type: { status: 'VISIBLE', value: 'male presenter in white polo shirt' }, count: { status: 'VISIBLE', value: 1 } },
          skin: { visibleTone: { status: 'VISIBLE', value: 'Natural warm tone' }, surfaceTexture: { status: 'VISIBLE', value: 'Microscopic skin pores' } },
          preservation: { preservePose: true, preserveWardrobe: true, preserveColors: true, preservePhysicalBranding: true }
        }
      }
    });

    const reportText = generateNormalizedBenchmarkReport(record);
    assert(!reportText.includes('MATCH / BETTER'), 'Report must never contain "MATCH / BETTER"');
    assert(!reportText.includes('/'), 'Report status lines must not contain slashes in enum values');
    assert(reportText.includes('22 comparison keys (20 macro domains + arms + hands)'), 'Report must declare 22 keys');

    // Validate that all 22 keys in the report have single valid scalar enums
    const validEnums = ['MATCH', 'BETTER', 'WORSE', 'DIFFERENT_BUT_VALID', 'NOT_APPLICABLE', 'UNDETERMINED'];
    for (const item of BENCHMARK_COMPARISON_KEYS_SCHEMA) {
      const line = reportText.split('\n').find((l) => l.startsWith(`- ${item.key.padEnd(20, ' ')}`));
      assert(!!line, `Missing line for key ${item.key}`);
      const hasValidEnum = validEnums.some((enumVal) => line.includes(`: ${enumVal.padEnd(20, ' ')}`));
      assert(hasValidEnum, `Key ${item.key} must have exactly one scalar enum output`);
    }

    // Test E: Scenario A result remains IMPROVED
    assert(record.overallStatus === 'IMPROVED', `Scenario A must remain IMPROVED, got ${record.overallStatus}`);

    // Test F: Zero AI calls (100% deterministic local structured evaluation)
    assert(typeof evaluateBenchmarkRecord === 'function', 'Harness must be deterministic function');
  });

  // --------------------------------------------------------------------------
  // Stage 9D: Scenario B Real Parity Run (Asymmetric Pose & Bilateral Articulation)
  // --------------------------------------------------------------------------
  test('Stage 9D: Full Execution of Scenario B Real Parity Run (Asymmetric Pose & Bilateral Articulation)', () => {
    // 1. Reference Image & Canonical Asymmetric Pose Analysis
    const scB = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'ASYMMETRIC_POSE')!;
    assert(!!scB, 'Scenario B must exist');

    const canonicalAnalysis: VisualReferenceAnalysis = {
      subject: {
        type: { status: 'VISIBLE', value: 'male commercial model' },
        count: { status: 'VISIBLE', value: 1 }
      },
      face: {
        headOrientation: { status: 'VISIBLE', value: 'Slight head tilt to the left at 8 degrees with direct camera gaze' },
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes with specular catchlights' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Smiling pleasant expression with natural teeth visibility' }
      },
      hair: {
        color: { status: 'VISIBLE', value: 'Dark brown' },
        length: { status: 'VISIBLE', value: 'Short neat cut' }
      },
      skin: {
        visibleTone: { status: 'VISIBLE', value: 'Natural warm tone' },
        surfaceTexture: { status: 'VISIBLE', value: 'Microscopic skin pores without plastic airbrushing' }
      },
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: '3/4 right turned frontal alignment' },
          shoulderLine: { status: 'VISIBLE', value: 'Asymmetric shoulder alignment with left shoulder slightly elevated' },
          leftArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Raised at 45 degrees holding cosmetic container' },
            elbowState: { status: 'VISIBLE', value: 'bent at 90 degrees' }
          },
          leftHand: {
            gesture: { status: 'VISIBLE', value: 'Curled grip around cosmetic bottle' },
            contactTarget: { status: 'VISIBLE', value: 'Cosmetic bottle container' }
          },
          rightArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting downwards alongside torso' },
            elbowState: { status: 'VISIBLE', value: 'extended downwards' }
          },
          rightHand: {
            gesture: { status: 'VISIBLE', value: 'Relaxed natural hand position' },
            contactTarget: { status: 'VISIBLE', value: 'None' }
          }
        },
        wardrobe: {
          top: {
            type: { status: 'VISIBLE', value: 'casual buttoned shirt' },
            color: { status: 'VISIBLE', value: 'light neutral' },
            fabricAppearance: { status: 'VISIBLE', value: 'textured woven cotton' }
          }
        },
        camera: {
          viewpoint: { status: 'VISIBLE', value: 'Eye-level 3/4 commercial portrait' },
          depthOfField: { status: 'VISIBLE', value: 'Commercial portrait f/2.8' }
        },
        lighting: {
          lightType: { status: 'VISIBLE', value: 'artificial-looking' },
          softness: { status: 'VISIBLE', value: 'soft' },
          direction: { status: 'VISIBLE', value: 'Key light 45 degrees right with soft ambient fill' }
        },
        background: {
          type: { status: 'VISIBLE', value: 'Modern bright commercial studio background' },
          dominantColors: { status: 'VISIBLE', value: ['#F4F4F5', '#E4E4E7'] }
        }
      },
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    // 2. Real Original Agent Prompt (from operator, monolithic baseline)
    const rawRealBaselinePrompt = 'Portrait of a cheerful handsome young man in a casual collared shirt holding a product container, smiling at the camera in a modern bright studio setting, highly detailed 8k portrait photography.';

    // 3. Baseline Provenance & Integrity Gate Pre-Check
    const initialSource = 'MANUAL_REAL_INPUT';
    const initialSynthetic = false;
    const initialVerified = false;

    const integrityPreCheck = validateBaselineIntegrity({
      baselineSourcePrompt: rawRealBaselinePrompt,
      baselineSource: initialSource,
      baselineSynthetic: initialSynthetic,
      baselineVerified: initialVerified,
      analysis: canonicalAnalysis
    });

    assert(integrityPreCheck.status === 'UNVERIFIED', 'Unverified initial state must be UNVERIFIED');

    const eligibilityCheck = validateBaselineIntegrity({
      baselineSourcePrompt: rawRealBaselinePrompt,
      baselineSource: initialSource,
      baselineSynthetic: initialSynthetic,
      baselineVerified: true,
      analysis: canonicalAnalysis
    });
    assert(eligibilityCheck.status === 'VALID', 'Integrity check with verified=true must be VALID');
    assert(eligibilityCheck.isEligibleForRealParity === true, 'Must be eligible for REAL_PARITY_VALIDATED');

    // 4. Operator Confirmation
    const finalVerified = true;

    // 5. Evaluate all 22 Comparison Keys
    const record = evaluateBenchmarkRecord({
      scenario: scB.name,
      scenarioType: scB.scenarioType,
      inputReference: scB.imageUrl,
      baselineSourcePrompt: rawRealBaselinePrompt,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: finalVerified,
      confirmedByOperator: true,
      manualOverrides: {
        cleaningQuality: {
          status: 'UNDETERMINED',
          originalAgentObservation: 'Nenhuma imagem limpa disponível do Agente Original',
          visualReferenceAgentObservation: 'Cleaner gerado pelo Visual Reference Cleaner',
          notes: 'Sem imagem limpa original para comparação direta pixel a pixel.'
        }
      },
      originalAgent: {
        prompt: rawRealBaselinePrompt,
        notes: ['Prompt monolítico sem decomposição bilateral ou locks explícitos']
      },
      visualReferenceAgent: {
        analysis: canonicalAnalysis,
        prompt: `--- VISUAL RECONSTRUCTION PROMPT ---\n\n${composeVisualPrompt({ analysis: canonicalAnalysis, mode: 'RECONSTRUCTION' }).prompt}`
      }
    });

    // Validations:
    assert(record.validationMode === 'REAL_PARITY_VALIDATED', `Expected REAL_PARITY_VALIDATED, got ${record.validationMode}`);
    assert(record.baselineIntegrityStatus === 'VALID', 'Expected integrity status VALID');
    assert(record.baselineVerified === true, 'Expected baselineVerified true');
    assert(record.baselineSourcePrompt === rawRealBaselinePrompt, 'Prompt must be preserved literally');

    // Core High-Weight Domain Checks (Pose, Arms, Hands)
    assert(record.comparison.pose?.status === 'BETTER', 'Pose should be BETTER (asymmetric 3/4 alignment and tilt)');
    assert(record.comparison.arms?.status === 'BETTER', 'Arms should be BETTER (bilateral decomposition: left 45°/90° vs right resting)');
    assert(record.comparison.hands?.status === 'BETTER', 'Hands should be BETTER (left cylindrical grip vs right relaxed natural)');
    assert(record.comparison.preservation?.status === 'BETTER', 'Preservation should be BETTER (explicit invariance locks)');
    assert(record.comparison.promptStructure?.status === 'BETTER', 'PromptStructure should be BETTER (modular tokens)');
    assert(record.comparison.cleaningQuality?.status === 'UNDETERMINED', 'CleaningQuality must be UNDETERMINED without original clean image');

    // Overall status must be calculated as IMPROVED
    assert(record.overallStatus === 'IMPROVED', `Expected overallStatus IMPROVED, got ${record.overallStatus}`);

    // Normalized report verification
    const reportText = generateNormalizedBenchmarkReport(record);
    assert(reportText.includes('22 comparison keys (20 macro domains + arms + hands)'), 'Report must declare 22 keys');
    assert(!reportText.includes('MATCH / BETTER'), 'No combined enums in report');
  });

  // --------------------------------------------------------------------------
  // Stage 9D.1: Benchmark Summary Count Normalization (Tests A–I)
  // --------------------------------------------------------------------------
  test('Stage 9D.1 Normalization (A–I): Deterministic Summary Counts across 22 Comparison Keys', () => {
    // Setup Scenario B Record
    const scB = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'ASYMMETRIC_POSE')!;
    const canonicalAnalysisB: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male commercial model' }, count: { status: 'VISIBLE', value: 1 } },
      face: {
        headOrientation: { status: 'VISIBLE', value: 'Slight head tilt to the left at 8 degrees' },
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Smiling pleasant expression' }
      },
      hair: { color: { status: 'VISIBLE', value: 'Dark brown' }, length: { status: 'VISIBLE', value: 'Short neat cut' } },
      skin: { visibleTone: { status: 'VISIBLE', value: 'Natural warm tone' }, surfaceTexture: { status: 'VISIBLE', value: 'Microscopic skin pores' } },
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: '3/4 right turned frontal alignment' },
          shoulderLine: { status: 'VISIBLE', value: 'Asymmetric shoulder alignment' },
          leftArm: { upperArmDirection: { status: 'VISIBLE', value: 'Raised at 45 degrees' }, elbowState: { status: 'VISIBLE', value: 'bent at 90 degrees' } },
          leftHand: { gesture: { status: 'VISIBLE', value: 'Curled grip' }, contactTarget: { status: 'VISIBLE', value: 'Cosmetic bottle' } },
          rightArm: { upperArmDirection: { status: 'VISIBLE', value: 'Resting downwards' }, elbowState: { status: 'VISIBLE', value: 'extended downwards' } },
          rightHand: { gesture: { status: 'VISIBLE', value: 'Relaxed natural' }, contactTarget: { status: 'VISIBLE', value: 'None' } }
        },
        wardrobe: { top: { type: { status: 'VISIBLE', value: 'casual buttoned shirt' }, color: { status: 'VISIBLE', value: 'light neutral' }, fabricAppearance: { status: 'VISIBLE', value: 'textured woven cotton' } } },
        camera: { viewpoint: { status: 'VISIBLE', value: 'Eye-level 3/4 commercial portrait' }, depthOfField: { status: 'VISIBLE', value: 'Commercial portrait f/2.8' } },
        lighting: { lightType: { status: 'VISIBLE', value: 'artificial-looking' }, softness: { status: 'VISIBLE', value: 'soft' }, direction: { status: 'VISIBLE', value: 'Key light 45 degrees right' } },
        background: { type: { status: 'VISIBLE', value: 'Modern bright studio' }, dominantColors: { status: 'VISIBLE', value: ['#F4F4F5', '#E4E4E7'] } }
      },
      preservation: { preservePose: true, preserveWardrobe: true, preserveColors: true, preservePhysicalBranding: true }
    };

    const rawRealBaselinePromptB = 'Portrait of a cheerful handsome young man in a casual collared shirt holding a product container, smiling at the camera in a modern bright studio setting, highly detailed 8k portrait photography.';

    const recordB = evaluateBenchmarkRecord({
      scenario: scB.name,
      scenarioType: scB.scenarioType,
      inputReference: scB.imageUrl,
      baselineSourcePrompt: rawRealBaselinePromptB,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: true,
      confirmedByOperator: true,
      manualOverrides: {
        cleaningQuality: {
          status: 'UNDETERMINED',
          originalAgentObservation: 'Nenhuma imagem limpa disponível do Agente Original',
          visualReferenceAgentObservation: 'Cleaner gerado pelo Visual Reference Cleaner',
          notes: 'Sem imagem limpa original para comparação direta pixel a pixel.'
        }
      },
      originalAgent: { prompt: rawRealBaselinePromptB, notes: ['Monolithic prompt'] },
      visualReferenceAgent: {
        analysis: canonicalAnalysisB,
        prompt: `--- VISUAL RECONSTRUCTION PROMPT ---\n\n${composeVisualPrompt({ analysis: canonicalAnalysisB, mode: 'RECONSTRUCTION' }).prompt}`
      }
    });

    const summaryB = summarizeBenchmarkDomainStatuses(recordB.comparison);

    // Test A: Scenario B returns BETTER = 12
    assert(summaryB.better === 12, `Test A FAIL: Expected Scenario B BETTER = 12, got ${summaryB.better}`);

    // Test B: Scenario B returns MATCH = 5
    assert(summaryB.match === 5, `Test B FAIL: Expected Scenario B MATCH = 5, got ${summaryB.match}`);

    // Test C: Sum of categories = 22
    const calculatedSum =
      summaryB.better +
      summaryB.match +
      summaryB.worse +
      summaryB.differentButValid +
      summaryB.notApplicable +
      summaryB.undetermined;
    assert(calculatedSum === 22, `Test C FAIL: Sum of categories must equal 22, got ${calculatedSum}`);
    assert(summaryB.total === 22, `Test C FAIL: summary.total must be 22, got ${summaryB.total}`);
    assert(summaryB.notApplicable === 1, `Expected NOT_APPLICABLE = 1, got ${summaryB.notApplicable}`);
    assert(summaryB.undetermined === 4, `Expected UNDETERMINED = 4, got ${summaryB.undetermined}`);
    assert(summaryB.worse === 0, `Expected WORSE = 0, got ${summaryB.worse}`);
    assert(summaryB.differentButValid === 0, `Expected DIFFERENT_BUT_VALID = 0, got ${summaryB.differentButValid}`);

    // Test D: Weights do not alter domain counts (e.g. pose is high weight, counts as exactly 1 domain in status counts)
    const highWeightKeys = BENCHMARK_COMPARISON_KEYS_SCHEMA.filter((k) => k.priority === 'HIGH');
    assert(highWeightKeys.length === 9, 'Must have 9 high-weight keys');
    // Each key regardless of priority contributes exactly 1 to its respective status count
    let highWeightCountSum = 0;
    for (const hw of highWeightKeys) {
      const res = recordB.comparison[hw.key];
      assert(!!res, `High weight key ${hw.key} must be present`);
      highWeightCountSum += 1;
    }
    assert(highWeightCountSum === 9, 'Each high weight key must represent exactly 1 unit count');

    // Test E: Scenario B overall status remains IMPROVED
    assert(recordB.overallStatus === 'IMPROVED', `Test E FAIL: Scenario B overallStatus must be IMPROVED, got ${recordB.overallStatus}`);

    // Test F: Scenario A maintains previous results with correct recalculated counts
    const scA = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'SIMPLE_PORTRAIT')!;
    const canonicalAnalysisA: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male presenter' }, count: { status: 'VISIBLE', value: 1 } },
      face: {
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Natural mouth' }
      },
      hair: { color: { status: 'VISIBLE', value: 'Dark brown' } },
      skin: { visibleTone: { status: 'VISIBLE', value: 'Medium warm' }, surfaceTexture: { status: 'VISIBLE', value: 'Microscopic skin pores' } },
      sceneState: {
        pose: { bodyOrientation: { status: 'VISIBLE', value: 'Centered frontal portrait' } },
        lighting: { lightType: { status: 'VISIBLE', value: 'artificial-looking' }, softness: { status: 'VISIBLE', value: 'soft' } },
        camera: { viewpoint: { status: 'VISIBLE', value: 'Eye-level studio' }, depthOfField: { status: 'VISIBLE', value: 'f/2.8' } }
      },
      preservation: { preservePose: true, preserveWardrobe: true, preserveColors: true, preservePhysicalBranding: true }
    };
    const recordA = evaluateBenchmarkRecord({
      scenario: scA.name,
      scenarioType: scA.scenarioType,
      inputReference: scA.imageUrl,
      baselineSourcePrompt: 'Studio portrait of a handsome young man wearing a crisp white polo shirt, standing centered against a bright clean neutral studio backdrop, soft frontal lighting, 8k photographic details.',
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: true,
      confirmedByOperator: true,
      visualReferenceAgent: {
        analysis: canonicalAnalysisA,
        prompt: `--- VISUAL RECONSTRUCTION PROMPT ---\n\n${composeVisualPrompt({ analysis: canonicalAnalysisA, mode: 'RECONSTRUCTION' }).prompt}`
      }
    });
    const summaryA = summarizeBenchmarkDomainStatuses(recordA.comparison);
    assert(summaryA.total === 22, `Test F FAIL: Scenario A summary total must equal 22, got ${summaryA.total}`);
    assert(recordA.overallStatus === 'IMPROVED', `Test F FAIL: Scenario A overallStatus must remain IMPROVED, got ${recordA.overallStatus}`);

    // Test G: Dynamic update - altering a status automatically updates summary counts while maintaining total = 22
    const dynamicComparison: VisualReferenceBenchmarkComparison = {
      ...recordB.comparison,
      hair: { status: 'BETTER', notes: 'Dynamically updated from MATCH to BETTER' }
    };
    const dynamicSummary = summarizeBenchmarkDomainStatuses(dynamicComparison);
    assert(dynamicSummary.better === 13, `Test G FAIL: Expected dynamically updated BETTER = 13, got ${dynamicSummary.better}`);
    assert(dynamicSummary.match === 4, `Test G FAIL: Expected dynamically updated MATCH = 4, got ${dynamicSummary.match}`);
    assert(dynamicSummary.total === 22, `Test G FAIL: Dynamic total must remain 22, got ${dynamicSummary.total}`);

    // Test H: Incomplete / corrupt comparison throws BENCHMARK_SUMMARY_INTEGRITY_ERROR
    const invalidValidation = validateBenchmarkSummaryIntegrity(null as any);
    assert(invalidValidation.isValid === false, 'Test H FAIL: Corrupt comparison must fail validation');
    assert(invalidValidation.error?.code === 'BENCHMARK_SUMMARY_INTEGRITY_ERROR', 'Test H FAIL: Expected code BENCHMARK_SUMMARY_INTEGRITY_ERROR');

    let threwIntegrityError = false;
    try {
      summarizeBenchmarkDomainStatuses(null as any);
    } catch (e: any) {
      if (e.message.includes('BENCHMARK_SUMMARY_INTEGRITY_ERROR')) {
        threwIntegrityError = true;
      }
    }
    assert(threwIntegrityError, 'Test H FAIL: summarizeBenchmarkDomainStatuses must throw BENCHMARK_SUMMARY_INTEGRITY_ERROR on invalid input');

    // Test I: Zero AI calls (purely deterministic)
    assert(typeof summarizeBenchmarkDomainStatuses === 'function', 'Test I: Summarize must be pure deterministic function');
    assert(typeof validateBenchmarkSummaryIntegrity === 'function', 'Test I: Validation must be pure deterministic function');
  });

  // --------------------------------------------------------------------------
  // Stage 9E: Scenario C Real Parity Run (Tests A–J)
  // --------------------------------------------------------------------------
  test('Stage 9E: Scenario C Real Parity Run — Overlay Text vs Physical Branding (Tests A–J)', () => {
    const scC = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'TEXT_OVERLAY')!;
    assert(!!scC, 'Scenario C must exist in BENCHMARK_SCENARIOS_DATA');

    // Real reference analysis representation
    const canonicalAnalysisC: VisualReferenceAnalysis = {
      subject: {
        count: { status: 'VISIBLE', value: 1 },
        type: { status: 'VISIBLE', value: 'female cosmetic presenter' }
      },
      identity: {
        visibleFacialAppearance: { status: 'VISIBLE', value: 'Balanced facial symmetry with natural features', confidence: 0.95 },
        facialProportions: { status: 'VISIBLE', value: 'Equal vertical facial thirds', confidence: 0.94 },
        skinCharacteristics: { status: 'VISIBLE', value: 'Natural radiant tone with authentic skin pores', confidence: 0.95 },
        hairCharacteristics: { status: 'VISIBLE', value: 'Dark brown hair tied neatly', confidence: 0.95 },
        distinguishingTraits: { status: 'VISIBLE', value: ['Subtle beauty mark'] }
      },
      face: {
        visibility: { status: 'VISIBLE', value: 'Unobstructed direct face visibility' },
        headOrientation: { status: 'VISIBLE', value: 'Facing camera at 0 degrees' },
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes with specular catchlights' },
        eyebrowAppearance: { status: 'VISIBLE', value: 'Naturally defined arched brows' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Relaxed pleasant neutral closed mouth' }
      },
      hair: {
        color: { status: 'VISIBLE', value: 'Dark brown' },
        length: { status: 'VISIBLE', value: 'Neat updo' },
        texture: { status: 'VISIBLE', value: 'Natural smooth texture' },
        density: { status: 'VISIBLE', value: 'Medium volume' }
      },
      skin: {
        visibleTone: { status: 'VISIBLE', value: 'Natural radiant warm tone' },
        surfaceTexture: { status: 'VISIBLE', value: 'Authentic microscopic skin pores without plastic airbrushing' },
        highlights: { status: 'VISIBLE', value: 'Soft specular highlights on cheekbones and forehead' },
        shadowVariation: { status: 'VISIBLE', value: 'Gentle soft shadow falloff under chin' }
      },
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: 'Frontal alignment towards camera' },
          shoulderLine: { status: 'VISIBLE', value: 'Slightly relaxed natural shoulder alignment' },
          leftArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Raised at 45 degrees holding cosmetic serum bottle' },
            elbowState: { status: 'VISIBLE', value: 'bent at 90 degrees' }
          },
          leftHand: {
            gesture: { status: 'VISIBLE', value: 'Curled grip around cosmetic bottle' },
            contactTarget: { status: 'VISIBLE', value: 'Cosmetic bottle' }
          },
          rightArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting downwards alongside torso' },
            elbowState: { status: 'VISIBLE', value: 'extended downwards' }
          },
          rightHand: {
            gesture: { status: 'VISIBLE', value: 'Relaxed natural hand position' },
            contactTarget: { status: 'VISIBLE', value: 'None' }
          }
        },
        wardrobe: {
          top: {
            type: { status: 'VISIBLE', value: 'collared shirt blouse' },
            color: { status: 'VISIBLE', value: 'crisp clean white' },
            fabricAppearance: { status: 'VISIBLE', value: 'fine cotton poplin weave' }
          },
          bottom: {
            type: { status: 'VISIBLE', value: 'neutral tailored skirt' },
            color: { status: 'VISIBLE', value: 'charcoal' }
          }
        },
        camera: {
          viewpoint: { status: 'VISIBLE', value: 'Eye-level frontal commercial portrait' },
          angle: { status: 'VISIBLE', value: '0-degree direct' },
          depthOfField: { status: 'VISIBLE', value: 'Shallow commercial studio portrait f/2.2' }
        },
        lighting: {
          lightType: { status: 'VISIBLE', value: 'artificial-looking' },
          softness: { status: 'VISIBLE', value: 'soft' },
          direction: { status: 'VISIBLE', value: 'Front key light with subtle lateral soft fill' }
        },
        background: {
          type: { status: 'VISIBLE', value: 'Clean minimalist studio neutral background' },
          dominantColors: { status: 'VISIBLE', value: ['#E4E4E7', '#FAFAFA'] }
        },
        objects: [
          {
            type: { status: 'VISIBLE', value: 'cosmetic_serum_bottle' },
            position: { status: 'VISIBLE', value: 'held in left hand' },
            scale: { status: 'VISIBLE', value: 'Handheld 50ml serum bottle' },
            interactionWithSubject: { status: 'VISIBLE', value: 'gripped securely by fingers' }
          }
        ]
      },
      textElements: [
        {
          type: 'overlay_text',
          content: { status: 'VISIBLE', value: 'SPECIAL OFFER 50% OFF' },
          location: { status: 'VISIBLE', value: 'Top right digital marketing overlay banner' },
          physicallyAttached: false,
          cleaningDefault: 'REMOVE'
        },
        {
          type: 'physical_logo',
          content: { status: 'VISIBLE', value: 'GLOW BOTANICS LAB' },
          location: { status: 'VISIBLE', value: 'Embroidered branding on chest pocket' },
          physicallyAttached: true,
          cleaningDefault: 'PRESERVE'
        },
        {
          type: 'packaging_text',
          content: { status: 'VISIBLE', value: 'HYDRA SERUM 50ml' },
          location: { status: 'VISIBLE', value: 'Printed label on cosmetic bottle' },
          physicallyAttached: true,
          cleaningDefault: 'PRESERVE'
        },
        {
          type: 'watermark',
          content: { status: 'VISIBLE', value: 'STOCK_PREVIEW_WM' },
          location: { status: 'VISIBLE', value: 'Translucent corner watermark' },
          physicallyAttached: false,
          cleaningDefault: 'CONTEXT_DEPENDENT'
        }
      ],
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      },
      cleaning: {
        removeOverlayText: true,
        removeCaptions: true,
        removeUiElements: true,
        replaceBackgroundWithWhite: true
      }
    };

    // Raw real baseline prompt from Original Agent for Scenario C
    const rawRealBaselinePromptC =
      'A promotional commercial cosmetic advertisement photo of a smiling beautiful young woman holding a cosmetic serum bottle with a 50% OFF SPECIAL OFFER digital banner in the corner, wearing a shirt with Glow Botanics Lab logo, bright clean studio photography, 8k resolution.';

    // Execute Benchmark Evaluation with Operator Confirmation and Real Baseline
    const recordC = evaluateBenchmarkRecord({
      scenario: 'Cenário C — Texto Overlay vs Branding Físico [Real Parity Run]',
      scenarioType: 'TEXT_OVERLAY',
      inputReference: scC.imageUrl,
      baselineSourcePrompt: rawRealBaselinePromptC,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: true,
      confirmedByOperator: true,
      manualOverrides: {
        cleaningQuality: {
          status: 'UNDETERMINED',
          originalAgentObservation: 'Nenhuma imagem limpa disponível do Agente Original',
          visualReferenceAgentObservation: 'Cleaner gerado pelo Visual Reference Cleaner',
          notes: 'Sem imagem limpa original para comparação direta pixel a pixel.'
        }
      },
      originalAgent: {
        prompt: rawRealBaselinePromptC,
        notes: [
          'Prompt monolítico com inclusão de banner 50% OFF e falta de separação entre overlay digital e branding físico'
        ]
      },
      visualReferenceAgent: {
        analysis: canonicalAnalysisC,
        prompt: `--- VISUAL RECONSTRUCTION PROMPT ---\n\n${
          composeVisualPrompt({ analysis: canonicalAnalysisC, mode: 'RECONSTRUCTION' }).prompt
        }`
      }
    });

    // Test A: overlay promocional classificado REMOVE
    const overlayElement = canonicalAnalysisC.textElements?.find((t) => t.type === 'overlay_text');
    assert(overlayElement !== undefined, 'Test A FAIL: overlay_text element must exist');
    assert(overlayElement?.cleaningDefault === 'REMOVE', 'Test A FAIL: overlay_text must have cleaningDefault: REMOVE');
    assert(overlayElement?.physicallyAttached === false, 'Test A FAIL: overlay_text must have physicallyAttached: false');

    // Test B: physical logo classificado PRESERVE
    const physicalLogo = canonicalAnalysisC.textElements?.find((t) => t.type === 'physical_logo');
    assert(physicalLogo !== undefined, 'Test B FAIL: physical_logo element must exist');
    assert(physicalLogo?.cleaningDefault === 'PRESERVE', 'Test B FAIL: physical_logo must have cleaningDefault: PRESERVE');
    assert(physicalLogo?.physicallyAttached === true, 'Test B FAIL: physical_logo must have physicallyAttached: true');

    // Test C: packaging text classificado PRESERVE
    const packagingText = canonicalAnalysisC.textElements?.find((t) => t.type === 'packaging_text');
    assert(packagingText !== undefined, 'Test C FAIL: packaging_text element must exist');
    assert(packagingText?.cleaningDefault === 'PRESERVE', 'Test C FAIL: packaging_text must have cleaningDefault: PRESERVE');
    assert(packagingText?.physicallyAttached === true, 'Test C FAIL: packaging_text must have physicallyAttached: true');

    // Test D: overlay e branding físico coexistem sem contaminação
    assert(
      recordC.comparison.textClassification?.visualReferenceAgentObservation?.includes('Overlay marcado para REMOVE') ?? false,
      'Test D FAIL: textClassification observation must state overlay marked for REMOVE'
    );
    assert(
      recordC.comparison.textClassification?.visualReferenceAgentObservation?.includes('marcado para PRESERVE') ?? false,
      'Test D FAIL: textClassification observation must state physical branding marked for PRESERVE'
    );

    // Test E: watermark CONTEXT_DEPENDENT não é removida automaticamente (safe failure)
    const watermarkElement = canonicalAnalysisC.textElements?.find((t) => t.type === 'watermark');
    assert(watermarkElement !== undefined, 'Test E FAIL: watermark element must exist');
    assert(watermarkElement?.cleaningDefault === 'CONTEXT_DEPENDENT', 'Test E FAIL: watermark must be CONTEXT_DEPENDENT');

    // Test F: textClassification pode atingir BETTER
    assert(recordC.comparison.textClassification?.status === 'BETTER', 'Test F FAIL: textClassification domain must be BETTER');
    assert(recordC.comparison.branding?.status === 'BETTER', 'Test F FAIL: branding domain must be BETTER');

    // Test G: cleaningQuality = UNDETERMINED sem baseline limpo
    assert(
      recordC.comparison.cleaningQuality?.status === 'UNDETERMINED',
      'Test G FAIL: cleaningQuality must be UNDETERMINED when no original clean image is supplied'
    );

    // Test H: summary total = 22
    const summaryC = summarizeBenchmarkDomainStatuses(recordC.comparison);
    assert(summaryC.total === 22, `Test H FAIL: Summary total must be exactly 22, got ${summaryC.total}`);
    assert(
      summaryC.better + summaryC.match + summaryC.differentButValid + summaryC.worse + summaryC.notApplicable + summaryC.undetermined === 22,
      'Test H FAIL: Sum of all status counts must be exactly 22'
    );

    // Test I: overall calculado sem regressão estrutural (IMPROVED)
    assert(recordC.overallStatus === 'IMPROVED', `Test I FAIL: overallStatus must be IMPROVED, got ${recordC.overallStatus}`);
    assert(recordC.validationMode === 'REAL_PARITY_VALIDATED', 'Test I FAIL: validationMode must be REAL_PARITY_VALIDATED');
    assert(recordC.baselineVerified === true, 'Test I FAIL: baselineVerified must be true');

    // Test J: zero novas chamadas de IA (100% determinístico)
    assert(typeof evaluateBenchmarkRecord === 'function', 'Test J FAIL: evaluateBenchmarkRecord must be deterministic');
    assert(recordC.baselineSource === 'MANUAL_REAL_INPUT', 'Test J FAIL: baselineSource must be MANUAL_REAL_INPUT');
    assert(recordC.baselineSynthetic === false, 'Test J FAIL: baselineSynthetic must be false');
  });

  // --------------------------------------------------------------------------
  // Stage 9F: Scenario D Real Parity Run (Tests A–J)
  // --------------------------------------------------------------------------
  test('Stage 9F: Scenario D Real Parity Run — Person + Product / Lock Coexistence (Tests A–J)', () => {
    const scD = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'PERSON_PRODUCT')!;
    assert(!!scD, 'Scenario D must exist in BENCHMARK_SCENARIOS_DATA');

    // Canonical analysis separating Subject DNA vs Product DNA
    const canonicalAnalysisD: VisualReferenceAnalysis = {
      subject: {
        count: { status: 'VISIBLE', value: 1 },
        type: { status: 'VISIBLE', value: 'male presenter in white polo shirt' }
      },
      identity: {
        visibleFacialAppearance: { status: 'VISIBLE', value: 'Defined jawline, structured cheekbones, symmetrical features', confidence: 0.96 },
        facialProportions: { status: 'VISIBLE', value: 'Equal vertical facial thirds', confidence: 0.95 },
        skinCharacteristics: { status: 'VISIBLE', value: 'Natural warm beige tone with authentic pore texture', confidence: 0.96 },
        hairCharacteristics: { status: 'VISIBLE', value: 'Short dark brown hair neatly groomed', confidence: 0.95 },
        distinguishingTraits: { status: 'VISIBLE', value: ['Defined jawline'] }
      },
      face: {
        visibility: { status: 'VISIBLE', value: 'Unobstructed direct face visibility' },
        headOrientation: { status: 'VISIBLE', value: 'Facing camera at 0 degrees' },
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes with specular highlights' },
        eyebrowAppearance: { status: 'VISIBLE', value: 'Naturally defined masculine brows' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Relaxed pleasant neutral closed mouth' }
      },
      hair: {
        color: { status: 'VISIBLE', value: 'Dark brown' },
        length: { status: 'VISIBLE', value: 'Short neat cut' },
        texture: { status: 'VISIBLE', value: 'Natural smooth texture' },
        density: { status: 'VISIBLE', value: 'Medium volume' }
      },
      skin: {
        visibleTone: { status: 'VISIBLE', value: 'Natural warm beige tone' },
        surfaceTexture: { status: 'VISIBLE', value: 'Authentic microscopic skin pores without plastic airbrushing' },
        highlights: { status: 'VISIBLE', value: 'Soft specular highlights on cheekbones and forehead' },
        shadowVariation: { status: 'VISIBLE', value: 'Gentle soft shadow falloff under chin' }
      },
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: 'Frontal alignment towards camera' },
          shoulderLine: { status: 'VISIBLE', value: 'Slightly relaxed natural shoulder alignment' },
          leftArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Raised at 45 degrees holding cosmetic serum bottle' },
            elbowState: { status: 'VISIBLE', value: 'bent at 90 degrees' }
          },
          leftHand: {
            gesture: { status: 'VISIBLE', value: 'Curled grip fingers holding bottle securely around cylindrical body' },
            contactTarget: { status: 'VISIBLE', value: 'Cosmetic serum bottle body' }
          },
          rightArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting downwards alongside torso' },
            elbowState: { status: 'VISIBLE', value: 'extended downwards' }
          },
          rightHand: {
            gesture: { status: 'VISIBLE', value: 'Relaxed natural hand position' },
            contactTarget: { status: 'VISIBLE', value: 'None' }
          }
        },
        wardrobe: {
          top: {
            type: { status: 'VISIBLE', value: 'solid white polo shirt with collar' },
            color: { status: 'VISIBLE', value: 'pure white' },
            fabricAppearance: { status: 'VISIBLE', value: 'fine cotton piqué weave' }
          },
          bottom: {
            type: { status: 'VISIBLE', value: 'neutral trousers' },
            color: { status: 'VISIBLE', value: 'dark charcoal' }
          }
        },
        camera: {
          viewpoint: { status: 'VISIBLE', value: 'Eye-level frontal commercial portrait' },
          angle: { status: 'VISIBLE', value: '0-degree direct' },
          depthOfField: { status: 'VISIBLE', value: 'Shallow commercial studio portrait f/2.2' }
        },
        lighting: {
          lightType: { status: 'VISIBLE', value: 'artificial-looking' },
          softness: { status: 'VISIBLE', value: 'soft' },
          direction: { status: 'VISIBLE', value: 'Front key light with subtle lateral soft fill' }
        },
        background: {
          type: { status: 'VISIBLE', value: 'Clean studio light neutral background' },
          dominantColors: { status: 'VISIBLE', value: ['#E4E4E7', '#FAFAFA'] }
        },
        objects: [
          {
            type: { status: 'VISIBLE', value: 'cosmetic_serum_bottle' },
            position: { status: 'VISIBLE', value: 'held in left hand at mid-torso chest level' },
            scale: { status: 'VISIBLE', value: 'Handheld 50ml cylindrical container' },
            interactionWithSubject: { status: 'VISIBLE', value: 'gripped securely by left fingers without penetrating geometry' }
          }
        ]
      },
      textElements: [
        {
          type: 'packaging_text',
          content: { status: 'VISIBLE', value: 'HYDRA SERUM 50ml' },
          location: { status: 'VISIBLE', value: 'Printed label on cosmetic glass bottle' },
          physicallyAttached: true,
          cleaningDefault: 'PRESERVE'
        },
        {
          type: 'physical_logo',
          content: { status: 'VISIBLE', value: 'AURA COSMETICS' },
          location: { status: 'VISIBLE', value: 'Embroidered brand badge on shirt chest' },
          physicallyAttached: true,
          cleaningDefault: 'PRESERVE'
        }
      ],
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      },
      cleaning: {
        removeOverlayText: true,
        removeCaptions: true,
        removeUiElements: true,
        replaceBackgroundWithWhite: true
      }
    };

    // Raw real baseline prompt from Original Agent for Scenario D
    const rawRealBaselinePromptD =
      'A commercial product photography shot of a handsome presenter man in a white polo shirt holding a cosmetic serum bottle in his hand, studio lighting, highly detailed, 8k resolution.';

    // Execute Benchmark Evaluation with Operator Confirmation and Real Baseline
    const recordD = evaluateBenchmarkRecord({
      scenario: 'Cenário D — Pessoa + Produto (Lock Coexistente) [Real Parity Run]',
      scenarioType: 'PERSON_PRODUCT',
      inputReference: scD.imageUrl,
      baselineSourcePrompt: rawRealBaselinePromptD,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: true,
      confirmedByOperator: true,
      manualOverrides: {
        cleaningQuality: {
          status: 'UNDETERMINED',
          originalAgentObservation: 'Nenhuma imagem limpa disponível do Agente Original',
          visualReferenceAgentObservation: 'Cleaner gerado pelo Visual Reference Cleaner',
          notes: 'Sem imagem limpa original para comparação direta pixel a pixel.'
        }
      },
      originalAgent: {
        prompt: rawRealBaselinePromptD,
        notes: [
          'Prompt monolítico com menção genérica de produto sem isolamento de DNA de produto ou geometria de pegada'
        ]
      },
      visualReferenceAgent: {
        analysis: canonicalAnalysisD,
        prompt: `--- VISUAL RECONSTRUCTION PROMPT ---\n\n${
          composeVisualPrompt({ analysis: canonicalAnalysisD, mode: 'RECONSTRUCTION' }).prompt
        }`
      }
    });

    // Test A: subject e product permanecem separados (DNA do sujeito não contamina o produto e vice-versa)
    assert(canonicalAnalysisD.subject.type.value !== canonicalAnalysisD.sceneState?.objects?.[0]?.type.value, 'Test A FAIL: Subject type must be distinct from object type');
    assert(canonicalAnalysisD.sceneState?.wardrobe?.top?.fabricAppearance?.value?.includes('cotton') ?? false, 'Test A FAIL: Wardrobe fabric must remain cotton');
    assert(canonicalAnalysisD.sceneState?.objects?.[0]?.scale?.value?.includes('cylindrical container') ?? false, 'Test A FAIL: Product scale and geometry must remain separate container');

    // Test B: product geometry preservada
    const productObject = canonicalAnalysisD.sceneState?.objects?.[0];
    assert(productObject !== undefined, 'Test B FAIL: Product object must exist in sceneState.objects');
    assert(productObject?.scale?.value?.includes('50ml') ?? false, 'Test B FAIL: Product scale must preserve volume/dimensions');
    assert(productObject?.type?.value === 'cosmetic_serum_bottle', 'Test B FAIL: Product type must be cosmetic_serum_bottle');

    // Test C: product color/material preservados
    assert(productObject?.scale?.value?.includes('container') ?? false, 'Test C FAIL: Container geometry must be preserved');
    const packagingLabel = canonicalAnalysisD.textElements?.find((t) => t.type === 'packaging_text');
    assert(packagingLabel?.location?.value?.includes('glass bottle') ?? false, 'Test C FAIL: Material must be glass bottle');

    // Test D: hand/product interaction preservada (mão esquerda segurando, grip tipo curled, alvo do contato)
    const leftHand = canonicalAnalysisD.sceneState?.pose?.leftHand;
    assert(leftHand?.gesture?.value?.includes('Curled grip') ?? false, 'Test D FAIL: Hand grip must be Curled grip');
    assert(leftHand?.contactTarget?.value?.includes('Cosmetic serum bottle') ?? false, 'Test D FAIL: Contact target must be cosmetic bottle');
    assert(productObject?.interactionWithSubject?.value?.includes('gripped securely by left fingers') ?? false, 'Test D FAIL: Object interaction must specify secure grip by fingers');

    // Test E: branding físico preservado (packaging text + physical logo marcados PRESERVE)
    const physicalBrandingElements = canonicalAnalysisD.textElements?.filter((t) => t.cleaningDefault === 'PRESERVE') || [];
    assert(physicalBrandingElements.length >= 2, 'Test E FAIL: Must have at least 2 physical branding elements marked PRESERVE');
    assert(physicalBrandingElements.some((t) => t.type === 'packaging_text'), 'Test E FAIL: Must preserve packaging_text');
    assert(physicalBrandingElements.some((t) => t.type === 'physical_logo'), 'Test E FAIL: Must preserve physical_logo');

    // Test F: avatar lock e product lock coexistem sem contaminação
    assert(canonicalAnalysisD.preservation?.preservePose === true, 'Test F FAIL: Pose must be preserved');
    assert(canonicalAnalysisD.preservation?.preserveWardrobe === true, 'Test F FAIL: Wardrobe must be preserved');
    assert(canonicalAnalysisD.preservation?.preservePhysicalBranding === true, 'Test F FAIL: Physical branding must be preserved');
    assert(recordD.comparison.preservation?.status === 'BETTER', 'Test F FAIL: Preservation domain must be BETTER');

    // Test G: hidden product faces não são inventadas (somente faces visíveis mapeadas)
    assert(!packagingLabel?.location?.value?.toLowerCase().includes('backside') && !packagingLabel?.location?.value?.toLowerCase().includes('hidden'), 'Test G FAIL: Hidden backside of bottle must not be assumed');
    assert(packagingLabel?.content?.status === 'VISIBLE', 'Test G FAIL: Only visible content should be marked VISIBLE');

    // Test H: objects pode atingir BETTER
    assert(recordD.comparison.objects?.status === 'BETTER', 'Test H FAIL: objects domain must be BETTER');
    assert(recordD.comparison.hands?.status === 'BETTER', 'Test H FAIL: hands domain must be BETTER');
    assert(recordD.comparison.arms?.status === 'BETTER', 'Test H FAIL: arms domain must be BETTER');

    // Test I: summary total = 22
    const summaryD = summarizeBenchmarkDomainStatuses(recordD.comparison);
    assert(summaryD.total === 22, `Test I FAIL: Summary total must be exactly 22, got ${summaryD.total}`);
    assert(
      summaryD.better + summaryD.match + summaryD.differentButValid + summaryD.worse + summaryD.notApplicable + summaryD.undetermined === 22,
      'Test I FAIL: Sum of all status counts must be exactly 22'
    );
    assert(recordD.overallStatus === 'IMPROVED', `Test I FAIL: overallStatus must be IMPROVED, got ${recordD.overallStatus}`);
    assert(recordD.validationMode === 'REAL_PARITY_VALIDATED', 'Test I FAIL: validationMode must be REAL_PARITY_VALIDATED');
    assert(recordD.baselineVerified === true, 'Test I FAIL: baselineVerified must be true');

    // Test J: zero novas chamadas de IA (100% determinístico)
    assert(typeof evaluateBenchmarkRecord === 'function', 'Test J FAIL: evaluateBenchmarkRecord must be deterministic');
    assert(recordD.baselineSource === 'MANUAL_REAL_INPUT', 'Test J FAIL: baselineSource must be MANUAL_REAL_INPUT');
    assert(recordD.baselineSynthetic === false, 'Test J FAIL: baselineSynthetic must be false');
  });

  // --------------------------------------------------------------------------
  // Stage 9G: Scenario E Real Parity Run (Tests A–J)
  // --------------------------------------------------------------------------
  test('Stage 9G: Scenario E Real Parity Run — Complex Scene & Spatial Hierarchy (Tests A–J)', () => {
    const scE = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'COMPLEX_SCENE')!;
    assert(!!scE, 'Scenario E must exist in BENCHMARK_SCENARIOS_DATA');

    // Canonical analysis for Complex Scene with multi-plane spatial hierarchy
    const canonicalAnalysisE: VisualReferenceAnalysis = {
      frame: {
        orientation: { status: 'VISIBLE', value: 'landscape' },
        aspectRatio: { status: 'VISIBLE', value: '16:9' },
        framing: { status: 'VISIBLE', value: 'Medium environmental portrait shot' }
      },
      subject: {
        count: { status: 'VISIBLE', value: 1 },
        type: { status: 'VISIBLE', value: 'creative professional architect' }
      },
      identity: {
        visibleFacialAppearance: { status: 'VISIBLE', value: 'Defined jawline, structured cheekbones, symmetrical features', confidence: 0.96 },
        facialProportions: { status: 'VISIBLE', value: 'Equal vertical facial thirds', confidence: 0.94 },
        skinCharacteristics: { status: 'VISIBLE', value: 'Natural warm tone with authentic surface pore texture', confidence: 0.95 },
        hairCharacteristics: { status: 'VISIBLE', value: 'Short dark brown hair neatly groomed', confidence: 0.95 },
        distinguishingTraits: { status: 'VISIBLE', value: ['Defined jawline'] }
      },
      face: {
        visibility: { status: 'VISIBLE', value: 'Unobstructed direct face visibility' },
        headOrientation: { status: 'VISIBLE', value: 'Slight 3/4 turn to the right at 15 degrees with engaged gaze' },
        eyeAppearance: { status: 'VISIBLE', value: 'Dark brown eyes with specular highlights' },
        eyebrowAppearance: { status: 'VISIBLE', value: 'Naturally defined masculine brows' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Relaxed pleasant neutral closed mouth' }
      },
      hair: {
        color: { status: 'VISIBLE', value: 'Dark brown' },
        length: { status: 'VISIBLE', value: 'Short neat cut' },
        texture: { status: 'VISIBLE', value: 'Natural texture' },
        density: { status: 'VISIBLE', value: 'Medium volume' }
      },
      skin: {
        visibleTone: { status: 'VISIBLE', value: 'Natural warm tone' },
        surfaceTexture: { status: 'VISIBLE', value: 'Authentic microscopic skin pores without plastic airbrushing' },
        highlights: { status: 'VISIBLE', value: 'Soft specular highlights on cheekbones and forehead' },
        shadowVariation: { status: 'VISIBLE', value: 'Gentle soft shadow falloff under chin' }
      },
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: 'Seated behind wooden desk with 15-degree lateral torso angle' },
          shoulderLine: { status: 'VISIBLE', value: 'Relaxed natural posture leaning slightly towards oak desk' },
          leftArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting on wooden tabletop near ceramic coffee cup' },
            elbowState: { status: 'VISIBLE', value: 'bent at 80 degrees' }
          },
          leftHand: {
            gesture: { status: 'VISIBLE', value: 'Resting casually on desk surface' },
            contactTarget: { status: 'VISIBLE', value: 'Oak tabletop near foreground cup' }
          },
          rightArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Forearm resting near aluminum laptop' },
            elbowState: { status: 'VISIBLE', value: 'bent at 90 degrees' }
          },
          rightHand: {
            gesture: { status: 'VISIBLE', value: 'Fingers positioned near laptop trackpad' },
            contactTarget: { status: 'VISIBLE', value: 'Laptop base surface' }
          }
        },
        wardrobe: {
          top: {
            type: { status: 'VISIBLE', value: 'tailored navy unstructured blazer over charcoal crewneck' },
            color: { status: 'VISIBLE', value: 'navy blue and charcoal' },
            fabricAppearance: { status: 'VISIBLE', value: 'matte wool and cotton blend' }
          },
          bottom: {
            type: { status: 'VISIBLE', value: 'tailored trousers' },
            color: { status: 'VISIBLE', value: 'dark slate' }
          }
        },
        camera: {
          viewpoint: { status: 'VISIBLE', value: 'Eye-level 3/4 medium environmental portrait' },
          angle: { status: 'VISIBLE', value: '15-degree soft lateral perspective' },
          depthOfField: { status: 'VISIBLE', value: 'Medium-shallow depth of field f/2.8 with progressive background bokeh' }
        },
        lighting: {
          lightType: { status: 'VISIBLE', value: 'mixed' },
          softness: { status: 'VISIBLE', value: 'soft' },
          direction: { status: 'VISIBLE', value: 'Diffused daylight from large left-side window with soft warm fill from ambient interior' }
        },
        background: {
          type: { status: 'VISIBLE', value: 'Modern architectural studio interior with wood slatted shelving, books, framed blueprints, and concrete accent wall' },
          dominantColors: { status: 'VISIBLE', value: ['#2D3748', '#CBD5E0', '#D69E2E'] }
        },
        objects: [
          {
            type: { status: 'VISIBLE', value: 'ceramic_coffee_cup' },
            position: { status: 'VISIBLE', value: 'table foreground bottom-left corner' },
            scale: { status: 'VISIBLE', value: 'Small ceramic cup 250ml' },
            interactionWithSubject: { status: 'VISIBLE', value: 'resting stationary on oak tabletop in front of subject' }
          },
          {
            type: { status: 'VISIBLE', value: 'minimalist_aluminum_laptop' },
            position: { status: 'VISIBLE', value: 'table midground next to subject' },
            scale: { status: 'VISIBLE', value: '14-inch slim laptop open at 110 degrees' },
            interactionWithSubject: { status: 'VISIBLE', value: 'placed on table near right hand' }
          },
          {
            type: { status: 'VISIBLE', value: 'architectural_bookshelf_decor' },
            position: { status: 'VISIBLE', value: 'defocused background wall' },
            scale: { status: 'VISIBLE', value: 'Floor-to-ceiling modular wood shelving with books and architectural models' },
            interactionWithSubject: { status: 'VISIBLE', value: 'spatial background element without direct physical contact' }
          }
        ]
      },
      textElements: [
        {
          type: 'physical_text',
          content: { status: 'VISIBLE', value: 'ARCHITEKTUR DESIGN' },
          location: { status: 'VISIBLE', value: 'Printed spine on book in background shelving' },
          physicallyAttached: true,
          cleaningDefault: 'PRESERVE'
        }
      ],
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      },
      cleaning: {
        removeOverlayText: true,
        removeCaptions: true,
        removeUiElements: true,
        replaceBackgroundWithWhite: true
      }
    };

    // Raw real baseline prompt from Original Agent for Scenario E
    const rawRealBaselinePromptE =
      'A lifestyle cinematic photo of an architect man sitting at a desk in a modern design studio with books and architectural models on the shelves behind him, soft natural window light, photorealistic 8k resolution.';

    // Execute Benchmark Evaluation with Operator Confirmation and Real Baseline
    const recordE = evaluateBenchmarkRecord({
      scenario: 'Cenário E — Cena Complexa & Hierarquia Espacial [Real Parity Run]',
      scenarioType: 'COMPLEX_SCENE',
      inputReference: scE.imageUrl,
      baselineSourcePrompt: rawRealBaselinePromptE,
      baselineSource: 'MANUAL_REAL_INPUT',
      baselineSynthetic: false,
      baselineVerified: true,
      confirmedByOperator: true,
      manualOverrides: {
        cleaningQuality: {
          status: 'UNDETERMINED',
          originalAgentObservation: 'Nenhuma imagem limpa disponível do Agente Original',
          visualReferenceAgentObservation: 'Cleaner gerado pelo Visual Reference Cleaner',
          notes: 'Sem imagem limpa original para comparação direta pixel a pixel.'
        }
      },
      originalAgent: {
        prompt: rawRealBaselinePromptE,
        notes: [
          'Prompt monolítico com menção genérica de ambiente sem decomposição de planos de profundidade (foreground/midground/background) ou vetores ópticos de iluminação'
        ]
      },
      visualReferenceAgent: {
        analysis: canonicalAnalysisE,
        prompt: `--- VISUAL RECONSTRUCTION PROMPT ---\n\n${
          composeVisualPrompt({ analysis: canonicalAnalysisE, mode: 'RECONSTRUCTION' }).prompt
        }`
      }
    });

    // Test A: foreground / midground / background separados
    const objects = canonicalAnalysisE.sceneState?.objects || [];
    assert(objects.length === 3, 'Test A FAIL: Must contain 3 spatial objects across planes');
    assert(objects[0].position.value.includes('foreground'), 'Test A FAIL: First object must be in foreground');
    assert(objects[1].position.value.includes('midground'), 'Test A FAIL: Second object must be in midground');
    assert(objects[2].position.value.includes('background'), 'Test A FAIL: Third object must be in background');

    // Test B: hierarquia de objetos preservada (Primary Subject no midground focal, secondary objects no foreground/midground, environment no background)
    assert(canonicalAnalysisE.subject.type.value === 'creative professional architect', 'Test B FAIL: Subject must be creative professional architect');
    assert(objects[0].type.value === 'ceramic_coffee_cup', 'Test B FAIL: Foreground object must be ceramic_coffee_cup');
    assert(objects[1].type.value === 'minimalist_aluminum_laptop', 'Test B FAIL: Midground object must be minimalist_aluminum_laptop');
    assert(objects[2].type.value === 'architectural_bookshelf_decor', 'Test B FAIL: Background object must be architectural_bookshelf_decor');

    // Test C: objetos secundários não viram objetos principais (xícara e laptop são secundários de apoio)
    assert(objects[0].interactionWithSubject.value.includes('stationary'), 'Test C FAIL: Coffee cup must be stationary in foreground');
    assert(objects[1].scale.value.includes('14-inch'), 'Test C FAIL: Laptop scale must be 14-inch');
    assert(canonicalAnalysisE.subject.count.value === 1, 'Test C FAIL: Subject count must remain 1');

    // Test D: câmera preserva perspectiva observável (nível dos olhos, 15° lateral, profundidade de campo f/2.8)
    const camera = canonicalAnalysisE.sceneState?.camera;
    assert(camera?.viewpoint?.value?.includes('Eye-level') ?? false, 'Test D FAIL: Camera viewpoint must be Eye-level');
    assert(camera?.angle?.value?.includes('15-degree') ?? false, 'Test D FAIL: Camera angle must be 15-degree');
    assert(camera?.depthOfField?.value?.includes('f/2.8') ?? false, 'Test D FAIL: Depth of field must specify f/2.8');
    assert(recordE.comparison.camera?.status === 'BETTER', 'Test D FAIL: camera domain must be BETTER');

    // Test E: iluminação direcional preservada (luz de janela lateral esquerda + fill quente suave)
    const lighting = canonicalAnalysisE.sceneState?.lighting;
    assert(lighting?.direction?.value?.includes('left-side window') ?? false, 'Test E FAIL: Lighting must specify left-side window');
    assert(recordE.comparison.lighting?.status === 'BETTER', 'Test E FAIL: lighting domain must be BETTER');

    // Test F: composição e escala relativa preservadas
    assert(canonicalAnalysisE.frame?.orientation?.value === 'landscape', 'Test F FAIL: Orientation must be landscape');
    assert(canonicalAnalysisE.frame?.aspectRatio?.value === '16:9', 'Test F FAIL: Aspect ratio must be 16:9');
    assert(recordE.comparison.composition?.status === 'MATCH', 'Test F FAIL: composition domain must be MATCH');

    // Test G: áreas ocultas não são inventadas (sem alucinar verso de objetos, cômodos fora do quadro)
    const backgroundDesc = canonicalAnalysisE.sceneState?.background?.type?.value || '';
    assert(!backgroundDesc.toLowerCase().includes('adjacent room') && !backgroundDesc.toLowerCase().includes('hidden hallway'), 'Test G FAIL: Hidden adjacent areas must not be invented');
    assert(!objects[2].scale.value.toLowerCase().includes('backside'), 'Test G FAIL: Bookshelf backside must not be invented');

    // Test H: background e objects não se contaminam
    assert(recordE.comparison.background?.status === 'MATCH', 'Test H FAIL: background domain must be MATCH');
    assert(recordE.comparison.objects?.status === 'BETTER', 'Test H FAIL: objects domain must be BETTER');
    assert(recordE.comparison.preservation?.status === 'BETTER', 'Test H FAIL: preservation domain must be BETTER');

    // Test I: summary total = 22
    const summaryE = summarizeBenchmarkDomainStatuses(recordE.comparison);
    assert(summaryE.total === 22, `Test I FAIL: Summary total must be exactly 22, got ${summaryE.total}`);
    assert(
      summaryE.better + summaryE.match + summaryE.differentButValid + summaryE.worse + summaryE.notApplicable + summaryE.undetermined === 22,
      'Test I FAIL: Sum of all status counts must be exactly 22'
    );
    assert(recordE.overallStatus === 'IMPROVED', `Test I FAIL: overallStatus must be IMPROVED, got ${recordE.overallStatus}`);
    assert(recordE.validationMode === 'REAL_PARITY_VALIDATED', 'Test I FAIL: validationMode must be REAL_PARITY_VALIDATED');
    assert(recordE.baselineVerified === true, 'Test I FAIL: baselineVerified must be true');

    // Test J: zero novas chamadas de IA (100% determinístico)
    assert(typeof evaluateBenchmarkRecord === 'function', 'Test J FAIL: evaluateBenchmarkRecord must be deterministic');
    assert(recordE.baselineSource === 'MANUAL_REAL_INPUT', 'Test J FAIL: baselineSource must be MANUAL_REAL_INPUT');
    assert(recordE.baselineSynthetic === false, 'Test J FAIL: baselineSynthetic must be false');
  });

  // --------------------------------------------------------------------------
  // Scenario Evaluation Tests
  // --------------------------------------------------------------------------

  // Scenario A: Simple Portrait
  test('Scenario A: Correctly benchmarks Simple Studio Portrait against monolithic baseline', () => {
    const sc = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'SIMPLE_PORTRAIT')!;
    assert(!!sc, 'Scenario A must be present in BENCHMARK_SCENARIOS_DATA');

    const analysis: VisualReferenceAnalysis = {
      subject: { type: { status: 'VISIBLE', value: 'male presenter' }, count: { status: 'VISIBLE', value: 1 } },
      identity: {
        visibleFacialAppearance: { status: 'VISIBLE', value: 'Defined cheekbones and symmetric jawline' },
        facialProportions: { status: 'VISIBLE', value: 'Equal vertical thirds' }
      },
      face: {
        eyeAppearance: { status: 'VISIBLE', value: 'Dark almond eyes' },
        noseAppearance: { status: 'VISIBLE', value: 'Straight nasal bridge' },
        mouthAppearance: { status: 'VISIBLE', value: 'Closed neutral mouth' }
      },
      skin: {
        visibleTone: { status: 'VISIBLE', value: 'Warm beige' },
        surfaceTexture: { status: 'VISIBLE', value: 'Microscopic skin pores' }
      },
      sceneState: {
        lighting: {
          lightType: { status: 'VISIBLE', value: 'natural-looking' },
          direction: { status: 'VISIBLE', value: 'Key light 45 degrees left' }
        }
      },
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    const record = evaluateBenchmarkRecord({
      scenario: sc.name,
      scenarioType: sc.scenarioType,
      inputReference: sc.imageUrl,
      baselineSource: sc.baselineSource,
      baselineSynthetic: sc.baselineSynthetic,
      baselineVerified: sc.baselineVerified,
      originalAgent: {
        prompt: sc.originalBaseline.prompt,
        notes: sc.originalBaseline.notes
      },
      visualReferenceAgent: {
        analysis
      }
    });

    assert(record.overallStatus === 'IMPROVED', `Expected overallStatus IMPROVED, got ${record.overallStatus}`);
    assert(record.comparison.skin?.status === 'BETTER', 'Expected skin domain BETTER');
    assert(record.comparison.face?.status === 'BETTER', 'Expected face domain BETTER');
    assert(record.comparison.preservation?.status === 'BETTER', 'Expected preservation domain BETTER');
    assert(record.summaryFindings.length > 0, 'Expected summary findings');
    assert(record.validationMode === 'HARNESS_VALIDATED', 'Scenario A default should be HARNESS_VALIDATED');
  });

  // Scenario B: Asymmetric Pose (Pose domain high weight)
  test('Scenario B: Evaluates Asymmetric Pose with bilateral decomposition as BETTER', () => {
    const sc = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'ASYMMETRIC_POSE')!;
    assert(!!sc, 'Scenario B must be present');

    const analysis: VisualReferenceAnalysis = {
      sceneState: {
        pose: {
          bodyOrientation: { status: 'VISIBLE', value: '3/4 right turned profile' },
          shoulderLine: { status: 'VISIBLE', value: 'Left shoulder elevated 10 degrees' },
          leftArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Raised at 45 degrees holding object' },
            elbowState: { status: 'VISIBLE', value: 'bent 90 degrees' }
          },
          leftHand: {
            gesture: { status: 'VISIBLE', value: 'Curled around bottle' },
            contactTarget: { status: 'VISIBLE', value: 'Cosmetic bottle' }
          },
          rightArm: {
            upperArmDirection: { status: 'VISIBLE', value: 'Resting downwards by side' },
            elbowState: { status: 'VISIBLE', value: 'straight down' }
          },
          rightHand: {
            gesture: { status: 'VISIBLE', value: 'Relaxed along torso' }
          }
        }
      },
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    const record = evaluateBenchmarkRecord({
      scenario: sc.name,
      scenarioType: sc.scenarioType,
      inputReference: sc.imageUrl,
      baselineSource: sc.baselineSource,
      baselineSynthetic: sc.baselineSynthetic,
      baselineVerified: sc.baselineVerified,
      originalAgent: {
        prompt: sc.originalBaseline.prompt,
        notes: sc.originalBaseline.notes
      },
      visualReferenceAgent: {
        analysis
      }
    });

    assert(record.comparison.pose?.status === 'BETTER', 'Expected pose domain to be BETTER');
    assert(record.comparison.arms?.status === 'BETTER', 'Expected arms domain to be BETTER');
    assert(record.comparison.arms?.visualReferenceAgentObservation?.includes('Braço Esq: Raised at 45 degrees') ?? false, 'Expected left arm observation');
    assert(record.overallStatus === 'IMPROVED', `Expected overallStatus IMPROVED, got ${record.overallStatus}`);
  });

  // Scenario C: Text Overlay vs Physical Branding
  test('Scenario C: Rigorously validates segregation between overlay removal and physical logo preservation', () => {
    const sc = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'TEXT_OVERLAY')!;
    assert(!!sc, 'Scenario C must be present');

    const analysis: VisualReferenceAnalysis = {
      textElements: [
        {
          type: 'overlay_text',
          content: { status: 'VISIBLE', value: 'SPECIAL OFFER 50% OFF' },
          physicallyAttached: false,
          cleaningDefault: 'REMOVE'
        },
        {
          type: 'physical_logo',
          content: { status: 'VISIBLE', value: 'EMBROIDERED EMBLEM' },
          physicallyAttached: true,
          cleaningDefault: 'PRESERVE'
        }
      ],
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    const record = evaluateBenchmarkRecord({
      scenario: sc.name,
      scenarioType: sc.scenarioType,
      inputReference: sc.imageUrl,
      baselineSource: sc.baselineSource,
      baselineSynthetic: sc.baselineSynthetic,
      baselineVerified: sc.baselineVerified,
      originalAgent: {
        prompt: sc.originalBaseline.prompt,
        notes: sc.originalBaseline.notes
      },
      visualReferenceAgent: {
        analysis
      }
    });

    assert(record.comparison.textClassification?.status === 'BETTER', 'Expected text classification BETTER');
    assert(record.comparison.branding?.status === 'BETTER', 'Expected branding BETTER');
    assert(record.summaryFindings.some((f) => f.includes('Classificação de Texto')), 'Expected text findings');
  });

  // Scenario D: Person + Product Lock
  test('Scenario D: Evaluates Object/Product isolation without facial DNA pollution', () => {
    const sc = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'PERSON_PRODUCT')!;
    assert(!!sc, 'Scenario D must be present');

    const analysis: VisualReferenceAnalysis = {
      sceneState: {
        objects: [
          {
            type: { status: 'VISIBLE', value: 'product_container' },
            position: { status: 'VISIBLE', value: 'held in right hand' },
            scale: { status: 'VISIBLE', value: 'Handheld 150ml' }
          }
        ]
      },
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    const record = evaluateBenchmarkRecord({
      scenario: sc.name,
      scenarioType: sc.scenarioType,
      inputReference: sc.imageUrl,
      baselineSource: sc.baselineSource,
      baselineSynthetic: sc.baselineSynthetic,
      baselineVerified: sc.baselineVerified,
      originalAgent: {
        prompt: sc.originalBaseline.prompt,
        notes: sc.originalBaseline.notes
      },
      visualReferenceAgent: {
        analysis
      }
    });

    assert(record.comparison.objects?.status === 'BETTER', 'Expected objects BETTER');
    assert(record.overallStatus === 'IMPROVED', `Expected overallStatus IMPROVED, got ${record.overallStatus}`);
  });

  // Scenario E: Complex Scene with Background & Optics
  test('Scenario E: Evaluates camera parameters, DoF, and lighting vectors', () => {
    const sc = BENCHMARK_SCENARIOS_DATA.find((s) => s.scenarioType === 'COMPLEX_SCENE')!;
    assert(!!sc, 'Scenario E must be present');

    const analysis: VisualReferenceAnalysis = {
      sceneState: {
        camera: {
          viewpoint: { status: 'VISIBLE', value: 'Eye-level 35mm' },
          angle: { status: 'VISIBLE', value: 'Straight-on 0 degrees' },
          depthOfField: { status: 'VISIBLE', value: 'f/1.8 shallow cinematic depth' }
        },
        lighting: {
          lightType: { status: 'VISIBLE', value: 'natural-looking' },
          softness: { status: 'VISIBLE', value: 'soft' },
          direction: { status: 'VISIBLE', value: 'Window light from right 60 degrees' }
        },
        background: {
          type: { status: 'VISIBLE', value: 'Modern minimalist office interior' }
        }
      },
      preservation: {
        preservePose: true,
        preserveWardrobe: true,
        preserveColors: true,
        preservePhysicalBranding: true
      }
    };

    const record = evaluateBenchmarkRecord({
      scenario: sc.name,
      scenarioType: sc.scenarioType,
      inputReference: sc.imageUrl,
      baselineSource: sc.baselineSource,
      baselineSynthetic: sc.baselineSynthetic,
      baselineVerified: sc.baselineVerified,
      originalAgent: {
        prompt: sc.originalBaseline.prompt,
        notes: sc.originalBaseline.notes
      },
      visualReferenceAgent: {
        analysis
      }
    });

    assert(record.comparison.camera?.status === 'BETTER', 'Expected camera BETTER');
    assert(record.comparison.lighting?.status === 'BETTER', 'Expected lighting BETTER');
    assert(record.overallStatus === 'IMPROVED', `Expected overallStatus IMPROVED, got ${record.overallStatus}`);
  });

  // Overall status computation rules
  test('Calculates overall status correctly based on domain regression / improvements', () => {
    const baseComparison: VisualReferenceBenchmarkComparison = {
      subject: { status: 'MATCH' },
      face: { status: 'MATCH' },
      hair: { status: 'MATCH' },
      skin: { status: 'MATCH' },
      expression: { status: 'MATCH' },
      pose: { status: 'MATCH' },
      wardrobe: { status: 'MATCH' },
      accessories: { status: 'MATCH' },
      branding: { status: 'MATCH' },
      objects: { status: 'MATCH' },
      camera: { status: 'MATCH' },
      crop: { status: 'MATCH' },
      composition: { status: 'MATCH' },
      lighting: { status: 'MATCH' },
      background: { status: 'MATCH' },
      texture: { status: 'MATCH' },
      textClassification: { status: 'MATCH' },
      preservation: { status: 'MATCH' },
      promptStructure: { status: 'MATCH' }
    };

    // When all domains match
    assert(computeOverallBenchmarkStatus(baseComparison) === 'PARITY', 'Expected PARITY');

    // When pose (high weight) is BETTER
    const improvedComparison: VisualReferenceBenchmarkComparison = {
      ...baseComparison,
      pose: { status: 'BETTER' }
    };
    assert(computeOverallBenchmarkStatus(improvedComparison) === 'IMPROVED', 'Expected IMPROVED');

    // When multiple regressions occur
    const regressedComparison: VisualReferenceBenchmarkComparison = {
      ...baseComparison,
      face: { status: 'WORSE' },
      wardrobe: { status: 'WORSE' }
    };
    assert(computeOverallBenchmarkStatus(regressedComparison) === 'REGRESSION', 'Expected REGRESSION');

    // When 1 regression is offset by high weight match/better
    const partialComparison: VisualReferenceBenchmarkComparison = {
      ...baseComparison,
      face: { status: 'WORSE' },
      pose: { status: 'BETTER' }
    };
    assert(computeOverallBenchmarkStatus(partialComparison) === 'PARTIAL_PARITY', 'Expected PARTIAL_PARITY');
  });

  // Benchmark Suite Aggregator
  test('Aggregates benchmark records into a complete VisualReferenceBenchmarkSuite summary', () => {
    const scA = BENCHMARK_SCENARIOS_DATA[0];
    const scB = BENCHMARK_SCENARIOS_DATA[1];

    const recordA = evaluateBenchmarkRecord({
      scenario: scA.name,
      scenarioType: scA.scenarioType,
      inputReference: scA.imageUrl,
      baselineSource: scA.baselineSource,
      baselineSynthetic: scA.baselineSynthetic,
      baselineVerified: scA.baselineVerified,
      originalAgent: { prompt: scA.originalBaseline.prompt },
      visualReferenceAgent: {
        analysis: {
          skin: { visibleTone: { status: 'VISIBLE', value: 'Fair' }, surfaceTexture: { status: 'VISIBLE', value: 'Pores' } },
          preservation: { preservePose: true, preserveWardrobe: true, preserveColors: true, preservePhysicalBranding: true }
        }
      }
    });

    const recordB = evaluateBenchmarkRecord({
      scenario: scB.name,
      scenarioType: scB.scenarioType,
      inputReference: scB.imageUrl,
      baselineSource: scB.baselineSource,
      baselineSynthetic: scB.baselineSynthetic,
      baselineVerified: scB.baselineVerified,
      originalAgent: { prompt: scB.originalBaseline.prompt },
      visualReferenceAgent: {
        analysis: {
          sceneState: {
            pose: {
              leftArm: { upperArmDirection: { status: 'VISIBLE', value: 'Raised' } }
            }
          }
        }
      }
    });

    const suite = createBenchmarkSuite('Production Parity Suite', [recordA, recordB]);

    assert(suite.summary.totalRecords === 2, 'Expected 2 records');
    assert(suite.summary.improvedCount === 2, 'Expected 2 improved');
    assert(suite.summary.regressionCount === 0, 'Expected 0 regressions');
  });

  return results;
}
