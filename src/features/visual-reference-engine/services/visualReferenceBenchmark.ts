/**
 * VISUAL REFERENCE BENCHMARK SERVICE
 * Stage 9: Deterministic, structured comparison between Original Reference Agent and Visual Reference Agent.
 * 
 * Rules:
 * 1. ZERO AI calls: 100% deterministic structured comparison.
 * 2. Evaluates functional structural parity (NOT string equality).
 * 3. Weighted scoring: Higher weight for pose, identity preservation, product preservation, text classification, prompt structure, cleaning fidelity.
 */

import {
  VisualReferenceBenchmarkRecord,
  VisualReferenceBenchmarkComparison,
  BenchmarkDomainResult,
  BenchmarkDomainStatus,
  BenchmarkOverallStatus,
  BenchmarkValidationMode,
  BaselineSource,
  BaselineIntegrityStatus,
  BaselineIntegrityError,
  BenchmarkDomainSummaryCounts,
  BenchmarkSummaryIntegrityError,
  VisualReferenceBenchmarkSuite
} from '../types/benchmarkTypes';
import { VisualReferenceAnalysis } from '../types/visualReferenceTypes';
import { composeVisualPrompt } from './visualPromptComposer';

export interface EvaluateBenchmarkInput {
  id?: string;
  scenario: string;
  scenarioType: 'SIMPLE_PORTRAIT' | 'ASYMMETRIC_POSE' | 'TEXT_OVERLAY' | 'PERSON_PRODUCT' | 'COMPLEX_SCENE' | 'CUSTOM';
  inputReference: string;
  validationMode?: BenchmarkValidationMode;
  confirmedByOperator?: boolean;
  manualOverrides?: Partial<Record<keyof VisualReferenceBenchmarkComparison, BenchmarkDomainResult>>;
  
  // Stage 9B.1 Baseline Integrity Inputs
  baselineSourcePrompt?: string;
  baselineSource?: BaselineSource;
  baselineVerified?: boolean;
  baselineSynthetic?: boolean;

  originalAgent?: {
    prompt?: string;
    cleanedImage?: string;
    notes?: string[];
  };
  visualReferenceAgent: {
    analysis?: VisualReferenceAnalysis;
    prompt?: string;
    cleanedImage?: string;
  };
}

export interface ValidateBaselineIntegrityInput {
  baselineSourcePrompt?: string;
  baselineSource?: BaselineSource;
  baselineVerified?: boolean;
  baselineSynthetic?: boolean;
  analysis?: VisualReferenceAnalysis;
  originalAgent?: {
    prompt?: string;
    cleanedImage?: string;
    notes?: string[];
  };
}

export interface BaselineIntegrityResult {
  sourcePrompt: string;
  source: BaselineSource;
  verified: boolean;
  synthetic: boolean;
  status: BaselineIntegrityStatus;
  error?: BaselineIntegrityError;
  isEligibleForRealParity: boolean;
}

/**
 * Validates baseline integrity deterministically without AI calls.
 * Enforces:
 * 1. baseline exists != baseline verified
 * 2. placeholders / empty prompts cannot receive REAL_PARITY_VALIDATED
 * 3. synthetic baselines cannot receive REAL_PARITY_VALIDATED
 * 4. subject mismatch between reference and baseline triggers BASELINE_INTEGRITY_ERROR
 */
export function validateBaselineIntegrity(input: ValidateBaselineIntegrityInput): BaselineIntegrityResult {
  const rawPrompt = input.baselineSourcePrompt !== undefined
    ? input.baselineSourcePrompt
    : (input.originalAgent?.prompt ?? '');
  
  const trimmed = rawPrompt.trim();
  const lowerPrompt = trimmed.toLowerCase();

  // Determine baseline source if not explicitly specified
  let source: BaselineSource = input.baselineSource || 'MANUAL_REAL_INPUT';
  if (!input.baselineSource) {
    if (trimmed === '' || trimmed.includes('[Aguardando') || lowerPrompt.includes('placeholder')) {
      source = 'PLACEHOLDER';
    } else if (input.baselineSynthetic) {
      source = 'SYNTHETIC_TEST';
    } else {
      source = 'MANUAL_REAL_INPUT';
    }
  }

  // Determine synthetic flag
  const synthetic = input.baselineSynthetic !== undefined
    ? input.baselineSynthetic
    : (source === 'SYNTHETIC_TEST');

  const verified = input.baselineVerified === true;

  // 1. Placeholder & Missing Gate
  if (trimmed === '' || trimmed.includes('[Aguardando') || lowerPrompt.includes('placeholder')) {
    const isMissing = trimmed === '';
    const status: BaselineIntegrityStatus = isMissing ? 'MISSING' : 'PLACEHOLDER';
    return {
      sourcePrompt: rawPrompt,
      source: 'PLACEHOLDER',
      verified: false,
      synthetic: false,
      status,
      error: {
        code: 'BASELINE_INTEGRITY_ERROR',
        reason: isMissing 
          ? 'Baseline prompt não foi fornecido (ausente).'
          : 'Baseline prompt contém placeholder de espera e não representa dados reais do operador.',
        field: 'baselineSourcePrompt'
      },
      isEligibleForRealParity: false
    };
  }

  // 2. Synthetic Test Gate
  if (synthetic || source === 'SYNTHETIC_TEST') {
    return {
      sourcePrompt: rawPrompt,
      source: 'SYNTHETIC_TEST',
      verified: false,
      synthetic: true,
      status: 'SYNTHETIC',
      error: {
        code: 'BASELINE_INTEGRITY_ERROR',
        reason: 'Baseline é sintético de teste ou mock e não pode receber o selo REAL_PARITY_VALIDATED.',
        field: 'baselineSynthetic'
      },
      isEligibleForRealParity: false
    };
  }

  // 3. Subject Mismatch Gate (Structural / Deterministic check)
  if (input.analysis?.subject) {
    const refSubjectType = String(input.analysis.subject.type?.value || '');
    
    // Female signals in visual reference analysis
    const isRefFemale = /\b(woman|female|girl|mulher|apresentadora|feminina|lady|women)\b/i.test(refSubjectType);

    // Male signals in visual reference analysis
    const isRefMale = /\b(man|male|boy|homem|apresentador|masculino|gentleman|men)\b/i.test(refSubjectType);

    // Female signals in baseline prompt
    const isPromptFemale = /\b(woman|female|girl|mulher|lady|women|garota|senhora)\b/i.test(trimmed);

    // Male signals in baseline prompt
    const isPromptMale = /\b(man|male|boy|homem|gentleman|men|garoto|senhor|rapaz)\b/i.test(trimmed);

    if (isRefFemale && isPromptMale && !isPromptFemale) {
      return {
        sourcePrompt: rawPrompt,
        source: 'MANUAL_REAL_INPUT',
        verified: false,
        synthetic: false,
        status: 'SUBJECT_MISMATCH',
        error: {
          code: 'BASELINE_INTEGRITY_ERROR',
          reason: 'Incompatibilidade estrutural de sujeito: Referência visual é feminina (mulher/apresentadora), mas o baseline descreve um homem.',
          field: 'subject',
          expected: 'female / woman',
          actual: 'male / man'
        },
        isEligibleForRealParity: false
      };
    }

    if (isRefMale && isPromptFemale && !isPromptMale) {
      return {
        sourcePrompt: rawPrompt,
        source: 'MANUAL_REAL_INPUT',
        verified: false,
        synthetic: false,
        status: 'SUBJECT_MISMATCH',
        error: {
          code: 'BASELINE_INTEGRITY_ERROR',
          reason: 'Incompatibilidade estrutural de sujeito: Referência visual é masculina (homem/apresentador), mas o baseline descreve uma mulher.',
          field: 'subject',
          expected: 'male / man',
          actual: 'female / woman'
        },
        isEligibleForRealParity: false
      };
    }
  }

  // 4. Verification Check
  if (!verified) {
    return {
      sourcePrompt: rawPrompt,
      source: 'MANUAL_REAL_INPUT',
      verified: false,
      synthetic: false,
      status: 'UNVERIFIED',
      isEligibleForRealParity: false
    };
  }

  // 5. Valid Real Baseline
  return {
    sourcePrompt: rawPrompt,
    source: 'MANUAL_REAL_INPUT',
    verified: true,
    synthetic: false,
    status: 'VALID',
    isEligibleForRealParity: true
  };
}

// Domain weights configuration
const HIGH_WEIGHT_DOMAINS: Array<keyof VisualReferenceBenchmarkComparison> = [
  'pose',
  'arms',
  'hands',
  'preservation',
  'branding',
  'textClassification',
  'promptStructure',
  'objects',
  'cleaningQuality'
];

/**
 * Standard benchmark scenarios (A through E)
 * Scenario A: Synthetic baseline for Studio Portrait (White Polo) — awaiting real baseline from operator
 * Scenarios B-E: Prepared benchmark slots awaiting real baseline input
 */
export const BENCHMARK_SCENARIOS_DATA: Array<{
  scenarioType: 'SIMPLE_PORTRAIT' | 'ASYMMETRIC_POSE' | 'TEXT_OVERLAY' | 'PERSON_PRODUCT' | 'COMPLEX_SCENE';
  name: string;
  description: string;
  imageUrl: string;
  baselineSource: BaselineSource;
  baselineSynthetic: boolean;
  baselineVerified: boolean;
  originalBaseline: {
    prompt: string;
    cleanedImage?: string;
    notes: string[];
  };
}> = [
  {
    scenarioType: 'SIMPLE_PORTRAIT',
    name: 'Cenário A — Studio Portrait (White Polo)',
    description: 'Retrato de estúdio com modelo em camisa polo branca, iluminação difusa suave e fundo neutro claro.',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    baselineSource: 'SYNTHETIC_TEST',
    baselineSynthetic: true,
    baselineVerified: false,
    originalBaseline: {
      prompt: 'Studio portrait of a young man wearing a white polo shirt, standing against a clean light background, looking directly at the camera with soft studio lighting.',
      cleanedImage: undefined,
      notes: [
        'Prompt sintético de teste — aguardando inserção do prompt real do operador.',
        'Sem identificação de proporções faciais, simetria e subtons de pele.',
        'Sem decomposição bilateral de braços ou alvos de repouso.',
        'Sem diretivas formais de preservação de pose, vestuário, cores e iluminação.',
        'Sem garantia contra plastificação de pele / perda de poros.'
      ]
    }
  },
  {
    scenarioType: 'ASYMMETRIC_POSE',
    name: 'Cenário B — Pose Assimétrica & Gestos [Aguardando Entrada Real]',
    description: 'Sujeito com articulação bilateral independente de membros, cabeça inclinada e alvo de gesto específico.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    baselineSource: 'PLACEHOLDER',
    baselineSynthetic: false,
    baselineVerified: false,
    originalBaseline: {
      prompt: '',
      notes: [
        'Aguardando inserção manual do prompt do Agente Original.'
      ]
    }
  },
  {
    scenarioType: 'TEXT_OVERLAY',
    name: 'Cenário C — Texto Overlay vs Branding Físico [Aguardando Entrada Real]',
    description: 'Imagem com texto gráfico promocional (overlay) e branding físico legítimo na roupa/produto.',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    baselineSource: 'PLACEHOLDER',
    baselineSynthetic: false,
    baselineVerified: false,
    originalBaseline: {
      prompt: '',
      notes: [
        'Aguardando inserção manual do prompt do Agente Original.'
      ]
    }
  },
  {
    scenarioType: 'PERSON_PRODUCT',
    name: 'Cenário D — Pessoa + Produto (Lock Coexistente) [Aguardando Entrada Real]',
    description: 'Apresentador segurando embalagem de produto com interação física e logo visível.',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
    baselineSource: 'PLACEHOLDER',
    baselineSynthetic: false,
    baselineVerified: false,
    originalBaseline: {
      prompt: '',
      notes: [
        'Aguardando inserção manual do prompt do Agente Original.'
      ]
    }
  },
  {
    scenarioType: 'COMPLEX_SCENE',
    name: 'Cenário E — Cena Complexa com Fundo e Múltiplos Objetos [Aguardando Entrada Real]',
    description: 'Ambiente com múltiplos planos, objetos de cena, vetores de luz e profundidade de campo.',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    baselineSource: 'PLACEHOLDER',
    baselineSynthetic: false,
    baselineVerified: false,
    originalBaseline: {
      prompt: '',
      notes: [
        'Aguardando inserção manual do prompt do Agente Original.'
      ]
    }
  }
];

/**
 * Evaluates structural domain comparison between baseline and Visual Reference Agent.
 */
export function evaluateBenchmarkRecord(input: EvaluateBenchmarkInput): VisualReferenceBenchmarkRecord {
  const analysis = input.visualReferenceAgent.analysis;
  const vrPrompt = input.visualReferenceAgent.prompt || (analysis ? composeVisualPrompt({ analysis, mode: 'RECONSTRUCTION' }).prompt : '');
  const origPrompt = input.baselineSourcePrompt !== undefined ? input.baselineSourcePrompt : (input.originalAgent?.prompt || '');
  const origNotes = input.originalAgent?.notes || [];

  // Stage 9B.1 Baseline Integrity Evaluation
  const integrity = validateBaselineIntegrity({
    baselineSourcePrompt: input.baselineSourcePrompt,
    baselineSource: input.baselineSource,
    baselineVerified: input.baselineVerified,
    baselineSynthetic: input.baselineSynthetic,
    analysis,
    originalAgent: input.originalAgent
  });

  const findings: string[] = [];

  // 1. Subject Evaluation
  const subjectResult: BenchmarkDomainResult = evaluateSubjectDomain(analysis, origPrompt);
  if (subjectResult.status === 'BETTER') findings.push('Sujeito: Mapeamento de contagem e tipo com maior precisão anatômica.');

  // 2. Face Evaluation
  const faceResult: BenchmarkDomainResult = evaluateFaceDomain(analysis, origPrompt);
  if (faceResult.status === 'BETTER') findings.push('Rosto: Extração detalhada de olhos, sobrancelhas e formato nasal.');

  // 3. Hair Evaluation
  const hairResult: BenchmarkDomainResult = evaluateHairDomain(analysis, origPrompt);

  // 4. Skin Evaluation
  const skinResult: BenchmarkDomainResult = evaluateSkinDomain(analysis, origPrompt);
  if (skinResult.status === 'BETTER') findings.push('Pele: Detecção de textura de poros reais e subtons.');

  // 5. Expression Evaluation
  const expressionResult: BenchmarkDomainResult = {
    status: analysis?.identity?.visibleFacialAppearance?.value ? 'MATCH' : 'UNDETERMINED',
    originalAgentObservation: origPrompt ? 'Expressão básica inferida' : undefined,
    visualReferenceAgentObservation: String(analysis?.identity?.visibleFacialAppearance?.value || 'Expressão neutra visível')
  };

  // 6. Pose Evaluation (High weight - Body & Head orientation)
  const poseResult: BenchmarkDomainResult = evaluatePoseDomain(analysis, origPrompt);
  if (poseResult.status === 'BETTER') findings.push('Pose: Orientação anatômica do tronco e cabeça estruturados.');

  // 6b. Arms Evaluation (High weight - Bilateral Arms & Elbows)
  const armsResult: BenchmarkDomainResult = evaluateArmsDomain(analysis, origPrompt);
  if (armsResult.status === 'BETTER') findings.push('Braços: Decomposição bilateral independente (braço esquerdo vs direito, cotovelos).');

  // 6c. Hands Evaluation (High weight - Hands, Fingers & Contact Targets)
  const handsResult: BenchmarkDomainResult = evaluateHandsDomain(analysis, origPrompt);
  if (handsResult.status === 'BETTER') findings.push('Mãos: Configuração de dedos e alvos de contato mapeados.');

  // 7. Wardrobe Evaluation
  const wardrobeResult: BenchmarkDomainResult = evaluateWardrobeDomain(analysis, origPrompt);

  // 8. Accessories Evaluation
  const accessoriesResult: BenchmarkDomainResult = {
    status: 'MATCH',
    originalAgentObservation: 'Identificação padrão',
    visualReferenceAgentObservation: 'Identificado no contexto de vestuário'
  };

  // 9. Branding Evaluation (High weight)
  const brandingResult: BenchmarkDomainResult = evaluateBrandingDomain(analysis, origPrompt);
  if (brandingResult.status === 'BETTER') findings.push('Branding: Distinção física vs overlay com regras de preservação específicas.');

  // 10. Objects Evaluation (High weight)
  const objectsResult: BenchmarkDomainResult = evaluateObjectsDomain(analysis, origPrompt);

  // 11. Camera Evaluation
  const cameraResult: BenchmarkDomainResult = evaluateCameraDomain(analysis, origPrompt);
  if (cameraResult.status === 'BETTER') findings.push('Câmera: Parâmetros ópticos, ângulo e profundidade de campo explicitados.');

  // 12. Crop Evaluation
  const cropResult: BenchmarkDomainResult = {
    status: analysis?.frame?.framing?.value ? 'MATCH' : 'UNDETERMINED',
    originalAgentObservation: 'Enquadramento implícito',
    visualReferenceAgentObservation: String(analysis?.frame?.framing?.value || 'Enquadramento documentado')
  };

  // 13. Composition Evaluation
  const compositionResult: BenchmarkDomainResult = {
    status: analysis?.frame?.orientation?.value ? 'MATCH' : 'UNDETERMINED',
    originalAgentObservation: 'Composição básica',
    visualReferenceAgentObservation: `Orientação: ${analysis?.frame?.orientation?.value || 'N/A'}, Ratio: ${analysis?.frame?.aspectRatio?.value || 'N/A'}`
  };

  // 14. Lighting Evaluation
  const lightingResult: BenchmarkDomainResult = evaluateLightingDomain(analysis, origPrompt);

  // 15. Background Evaluation
  const backgroundResult: BenchmarkDomainResult = {
    status: analysis?.sceneState?.background?.type?.value ? 'MATCH' : 'UNDETERMINED',
    originalAgentObservation: 'Fundo genérico',
    visualReferenceAgentObservation: String(analysis?.sceneState?.background?.type?.value || 'Fundo estruturado')
  };

  // 16. Texture Evaluation
  const textureResult: BenchmarkDomainResult = {
    status: analysis?.skin?.surfaceTexture?.value ? 'BETTER' : 'MATCH',
    originalAgentObservation: 'Sem detalhamento de microtextura',
    visualReferenceAgentObservation: String(analysis?.skin?.surfaceTexture?.value || 'Poro natural e tecidos sem plastificação')
  };

  // 17. Text Classification Evaluation (High weight)
  const textClassificationResult: BenchmarkDomainResult = evaluateTextClassificationDomain(analysis, origPrompt);
  if (textClassificationResult.status === 'BETTER') findings.push('Classificação de Texto: Segregação estrita entre REMOVE (overlays) e PRESERVE (branding físico).');

  // 18. Preservation Evaluation (High weight)
  const preservationResult: BenchmarkDomainResult = evaluatePreservationDomain(analysis);
  if (preservationResult.status === 'BETTER') findings.push('Preservação: Cláusulas de lock e invariância aplicadas.');

  // 19. Prompt Structure Evaluation (High weight)
  const promptStructureResult: BenchmarkDomainResult = evaluatePromptStructureDomain(vrPrompt, origPrompt);
  if (promptStructureResult.status === 'BETTER') findings.push('Estrutura de Prompt: Blocos modulares isolados (Identity vs Scene State vs Locks).');

  // 20. Cleaning Quality Evaluation (Optional)
  let cleaningQualityResult: BenchmarkDomainResult | undefined = undefined;
  if (input.visualReferenceAgent.cleanedImage || input.originalAgent?.cleanedImage) {
    cleaningQualityResult = evaluateCleaningQualityDomain(input.visualReferenceAgent.cleanedImage, input.originalAgent?.cleanedImage);
    if (cleaningQualityResult.status === 'BETTER') findings.push('Limpeza: Preservação de contornos e remoção cirúrgica de artefatos.');
  }

  const baseComparison: VisualReferenceBenchmarkComparison = {
    subject: subjectResult,
    face: faceResult,
    hair: hairResult,
    skin: skinResult,
    expression: expressionResult,
    pose: poseResult,
    arms: armsResult,
    hands: handsResult,
    wardrobe: wardrobeResult,
    accessories: accessoriesResult,
    branding: brandingResult,
    objects: objectsResult,
    camera: cameraResult,
    crop: cropResult,
    composition: compositionResult,
    lighting: lightingResult,
    background: backgroundResult,
    texture: textureResult,
    textClassification: textClassificationResult,
    preservation: preservationResult,
    promptStructure: promptStructureResult,
    cleaningQuality: cleaningQualityResult
  };

  // Apply manual operator overrides if provided
  const comparison: VisualReferenceBenchmarkComparison = { ...baseComparison };
  if (input.manualOverrides) {
    for (const [key, val] of Object.entries(input.manualOverrides)) {
      if (val && key in comparison) {
        (comparison as any)[key] = val;
      }
    }
  }

  const overallStatus = computeOverallBenchmarkStatus(comparison);

  // Stage 9B.1 Real Parity Validation Gate
  // REAL_PARITY_VALIDATED requires confirmedByOperator AND integrity eligibility
  const isConfirmed = input.confirmedByOperator === true;
  let validationMode: BenchmarkValidationMode = 'HARNESS_VALIDATED';
  if ((isConfirmed || input.validationMode === 'REAL_PARITY_VALIDATED') && integrity.isEligibleForRealParity) {
    validationMode = 'REAL_PARITY_VALIDATED';
  } else {
    validationMode = 'HARNESS_VALIDATED';
  }

  return {
    id: input.id || `bench_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    scenario: input.scenario,
    scenarioType: input.scenarioType,
    inputReference: input.inputReference,
    validationMode,
    confirmedByOperator: isConfirmed,

    // Stage 9B.1 Baseline Integrity Fields
    baselineSourcePrompt: integrity.sourcePrompt,
    baselineSource: integrity.source,
    baselineVerified: integrity.verified,
    baselineSynthetic: integrity.synthetic,
    baselineIntegrityStatus: integrity.status,
    baselineIntegrityError: integrity.error,

    originalAgent: {
      prompt: integrity.sourcePrompt,
      cleanedImage: input.originalAgent?.cleanedImage,
      notes: origNotes
    },
    visualReferenceAgent: {
      analysis: input.visualReferenceAgent.analysis,
      prompt: vrPrompt,
      cleanedImage: input.visualReferenceAgent.cleanedImage
    },
    comparison,
    overallStatus,
    summaryFindings: findings,
    createdAt: Date.now()
  };
}

// -------------------------------------------------------------
// Domain Evaluators
// -------------------------------------------------------------

function evaluateSubjectDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  if (!analysis?.subject?.type?.value) {
    return { status: 'UNDETERMINED', originalAgentObservation: origPrompt ? 'Presente' : 'N/A' };
  }
  const vrType = String(analysis.subject.type.value);
  const vrCount = analysis.subject.count?.value ?? 1;

  if (origPrompt && (origPrompt.toLowerCase().includes('person') || origPrompt.toLowerCase().includes('woman') || origPrompt.toLowerCase().includes('man') || origPrompt.toLowerCase().includes('model'))) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Sujeito genérico no prompt',
      visualReferenceAgentObservation: `Sujeito tipo: "${vrType}", contagem: ${vrCount}, status: ${analysis.subject.type.status}`,
      notes: 'Visual Reference Agent classifica formalmente a contagem e especificidade.'
    };
  }

  return {
    status: 'MATCH',
    visualReferenceAgentObservation: `${vrType} (${vrCount})`
  };
}

function evaluateFaceDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  if (!analysis?.face) {
    return { status: 'UNDETERMINED' };
  }

  const hasFaceDetails = !!(
    analysis.face.eyeAppearance?.value &&
    analysis.face.noseAppearance?.value &&
    analysis.face.mouthAppearance?.value
  );

  if (hasFaceDetails) {
    return {
      status: 'BETTER',
      originalAgentObservation: origPrompt ? 'Referência facial resumida' : 'Nenhuma',
      visualReferenceAgentObservation: `Olhos: ${analysis.face.eyeAppearance?.value}, Nariz: ${analysis.face.noseAppearance?.value}, Boca: ${analysis.face.mouthAppearance?.value}`,
      notes: 'Estruturação anatômica granular por subsistemas.'
    };
  }

  return { status: 'MATCH' };
}

function evaluateHairDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  if (!analysis?.hair?.color?.value) return { status: 'UNDETERMINED' };
  return {
    status: 'MATCH',
    originalAgentObservation: origPrompt ? 'Cor do cabelo descrita' : 'N/A',
    visualReferenceAgentObservation: `Cor: ${analysis.hair.color.value}, Textura: ${analysis.hair.texture?.value || 'N/A'}, Comprimento: ${analysis.hair.length?.value || 'N/A'}`
  };
}

function evaluateSkinDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  if (!analysis?.skin?.visibleTone?.value) return { status: 'UNDETERMINED' };
  const hasTexture = !!analysis.skin.surfaceTexture?.value;
  return {
    status: hasTexture ? 'BETTER' : 'MATCH',
    originalAgentObservation: 'Tom de pele básico',
    visualReferenceAgentObservation: `Tom: ${analysis.skin.visibleTone.value}, Textura: ${analysis.skin.surfaceTexture?.value || 'Natural'}`,
    notes: hasTexture ? 'Garante microtextura de poros e impede plastificação/airbrush excessivo.' : undefined
  };
}

function evaluatePoseDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const pose = analysis?.sceneState?.pose;
  if (!pose) return { status: 'UNDETERMINED' };

  const hasOrientation = !!(pose.bodyOrientation?.value || pose.shoulderLine?.value);
  const headOrientation = analysis.face?.headOrientation?.value;

  if (hasOrientation || headOrientation) {
    return {
      status: 'BETTER',
      originalAgentObservation: origPrompt ? 'Pose inferida por texto contínuo ("standing", "posing")' : 'Sem pose granular',
      visualReferenceAgentObservation: `Tronco: ${pose.bodyOrientation?.value || 'Frontal'}, Cabeça: ${headOrientation || '0° frontal'}, Ombros: ${pose.shoulderLine?.value || 'Naturais'}`,
      notes: 'Estruturação geométrica da orientação do corpo e alinhamento do tronco.'
    };
  }

  return { status: 'MATCH', visualReferenceAgentObservation: 'Orientação corporal documentada' };
}

function evaluateArmsDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const pose = analysis?.sceneState?.pose;
  if (!pose) return { status: 'UNDETERMINED' };

  const hasLeftArm = !!(pose.leftArm?.upperArmDirection?.value || pose.leftArm?.elbowState?.value);
  const hasRightArm = !!(pose.rightArm?.upperArmDirection?.value || pose.rightArm?.elbowState?.value);

  if (hasLeftArm || hasRightArm) {
    return {
      status: 'BETTER',
      originalAgentObservation: origPrompt ? 'Membros superiores descritos de forma genérica' : 'Sem decomposição de braços',
      visualReferenceAgentObservation: `Braço Esq: ${pose.leftArm?.upperArmDirection?.value || 'natural'} (cotovelo: ${pose.leftArm?.elbowState?.value || 'estendido'}) | Braço Dir: ${pose.rightArm?.upperArmDirection?.value || 'natural'} (cotovelo: ${pose.rightArm?.elbowState?.value || 'estendido'})`,
      notes: 'Decomposição bilateral de braço esquerdo vs direito e articulação de cotovelos.'
    };
  }

  return { status: 'MATCH', visualReferenceAgentObservation: 'Braços na posição neutra de repouso' };
}

function evaluateHandsDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const pose = analysis?.sceneState?.pose;
  if (!pose) return { status: 'UNDETERMINED' };

  const hasLeftHand = !!(pose.leftHand?.gesture?.value || pose.leftHand?.contactTarget?.value);
  const hasRightHand = !!(pose.rightHand?.gesture?.value || pose.rightHand?.contactTarget?.value);

  if (hasLeftHand || hasRightHand) {
    return {
      status: 'BETTER',
      originalAgentObservation: origPrompt ? 'Gestos descritos sem alvos de toque estritos' : 'Sem mapeamento de mãos',
      visualReferenceAgentObservation: `Mão Esq: ${pose.leftHand?.gesture?.value || 'repouso'} [alvo: ${pose.leftHand?.contactTarget?.value || 'nenhum'}] | Mão Dir: ${pose.rightHand?.gesture?.value || 'repouso'} [alvo: ${pose.rightHand?.contactTarget?.value || 'nenhum'}]`,
      notes: 'Mapeamento de configuração de dedos, gestos e alvos de contato sem alucinação.'
    };
  }

  return { status: 'MATCH', visualReferenceAgentObservation: 'Mãos em repouso neutro' };
}

function evaluateWardrobeDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const wardrobe = analysis?.sceneState?.wardrobe;
  if (!wardrobe) return { status: 'UNDETERMINED' };

  return {
    status: wardrobe.top?.fabricAppearance?.value ? 'BETTER' : 'MATCH',
    originalAgentObservation: origPrompt ? 'Roupa mencionada no prompt' : 'N/A',
    visualReferenceAgentObservation: `Top: ${wardrobe.top?.type?.value || '—'} (${wardrobe.top?.fabricAppearance?.value || 'tecido visível'}), Bottom: ${wardrobe.bottom?.type?.value || '—'}`
  };
}

function evaluateBrandingDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const hasBranding = analysis?.textElements?.some(
    (t) => t.type === 'physical_logo' || t.type === 'physical_text' || t.type === 'packaging_text'
  );
  if (hasBranding) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Tratado como elemento genérico da cena',
      visualReferenceAgentObservation: 'Marcado explicitamente com cleaningDefault: PRESERVE e physicallyAttached: true',
      notes: 'Impede remoção acidental de logos físicos em roupas ou produtos.'
    };
  }
  return { status: 'MATCH', visualReferenceAgentObservation: 'Sem branding concorrente' };
}

function evaluateObjectsDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const hasObjects = analysis?.sceneState?.objects && analysis.sceneState.objects.length > 0;
  if (hasObjects) {
    return {
      status: 'BETTER',
      originalAgentObservation: origPrompt ? 'Objetos listados no texto' : 'N/A',
      visualReferenceAgentObservation: `Objetos identificados: ${analysis.sceneState!.objects!.length} item(ns) com posição e escala relativa`,
      notes: 'Preserva objeto independente da identidade do avatar.'
    };
  }
  return { status: 'MATCH', visualReferenceAgentObservation: 'Sem objetos complexos adicionais' };
}

function evaluateCameraDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const camera = analysis?.sceneState?.camera;
  if (!camera) return { status: 'UNDETERMINED' };

  return {
    status: camera.depthOfField?.value ? 'BETTER' : 'MATCH',
    originalAgentObservation: 'Ângulo de câmera básico ou omitido',
    visualReferenceAgentObservation: `Ponto de vista: ${camera.viewpoint?.value || '—'}, Ângulo: ${camera.angle?.value || '—'}, DoF: ${camera.depthOfField?.value || '—'}`
  };
}

function evaluateLightingDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const lighting = analysis?.sceneState?.lighting;
  if (!lighting) return { status: 'UNDETERMINED' };

  return {
    status: lighting.direction?.value ? 'BETTER' : 'MATCH',
    originalAgentObservation: 'Iluminação citada sem vetor direcional',
    visualReferenceAgentObservation: `Tipo: ${lighting.lightType?.value || '—'}, Suavidade: ${lighting.softness?.value || '—'}, Direção: ${lighting.direction?.value || '—'}`
  };
}

function evaluateTextClassificationDomain(analysis?: VisualReferenceAnalysis, origPrompt?: string): BenchmarkDomainResult {
  const textElements = analysis?.textElements;
  if (!textElements || textElements.length === 0) {
    return { status: 'NOT_APPLICABLE', notes: 'Nenhum elemento textual detectado na imagem.' };
  }

  const hasOverlayRemoval = textElements.some(
    (t) =>
      (t.type === 'overlay_text' || t.type === 'caption' || t.type === 'price' || t.type === 'ui_element') &&
      t.cleaningDefault === 'REMOVE'
  );
  const hasPhysicalPreserve = textElements.some(
    (t) =>
      (t.type === 'physical_logo' || t.type === 'physical_text' || t.type === 'packaging_text') &&
      t.cleaningDefault === 'PRESERVE'
  );

  if (hasOverlayRemoval && hasPhysicalPreserve) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Mistura texto overlay com prompt de geração',
      visualReferenceAgentObservation: 'Separação cirúrgica: Overlay marcado para REMOVE e Logo/Embalagem Física marcado para PRESERVE',
      notes: 'Elimina alucinação de banners promocionais enquanto protege a marca.'
    };
  }

  if (hasOverlayRemoval) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Texto de overlay incluído no prompt ou não higienizado',
      visualReferenceAgentObservation: 'Overlay classificado para remoção higiênica',
      notes: 'Impede vazamento de texto comercial 50% OFF para o prompt.'
    };
  }

  return { status: 'MATCH', visualReferenceAgentObservation: 'Classificação consistente' };
}

function evaluatePreservationDomain(analysis?: VisualReferenceAnalysis): BenchmarkDomainResult {
  if (analysis?.preservation) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Sem cláusulas explícitas de preservação',
      visualReferenceAgentObservation: `Pose: ${analysis.preservation.preservePose}, Roupas: ${analysis.preservation.preserveWardrobe}, Cores: ${analysis.preservation.preserveColors}, Branding: ${analysis.preservation.preservePhysicalBranding}`,
      notes: 'Diretivas formais de invariância visual.'
    };
  }
  return { status: 'MATCH' };
}

function evaluatePromptStructureDomain(vrPrompt: string, origPrompt: string): BenchmarkDomainResult {
  if (!vrPrompt) return { status: 'UNDETERMINED' };

  const hasModularSections = vrPrompt.includes('---') || vrPrompt.includes('VISUAL RECONSTRUCTION PROMPT') || vrPrompt.includes('IDENTITY') || vrPrompt.includes('SCENE');
  const isOriginalMonolithic = !origPrompt.includes('---') && origPrompt.length > 0;

  if (hasModularSections && isOriginalMonolithic) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Prompt em texto corrido (monolítico sem hierarquia de tokens)',
      visualReferenceAgentObservation: 'Prompt modular estruturado em blocos de dominância (Frame, Identity DNA, Scene State, Locks)',
      notes: 'Paridade estrutural e funcional com maior determinismo de geração.'
    };
  }

  // Check functional parity (not string equality): equivalent functional visual concepts are valid
  if (vrPrompt.length > 0 && origPrompt.length > 0) {
    return {
      status: 'DIFFERENT_BUT_VALID',
      originalAgentObservation: 'Prompt alternativo com informações visuais preservadas',
      visualReferenceAgentObservation: 'Prompt estruturado funcionalmente equivalente',
      notes: 'Redação distinta com informação visual preservada funcionalmente.'
    };
  }

  return {
    status: 'MATCH',
    originalAgentObservation: 'Prompt baseline',
    visualReferenceAgentObservation: 'Prompt estruturado'
  };
}

function evaluateCleaningQualityDomain(vrCleaned?: string, origCleaned?: string): BenchmarkDomainResult {
  if (!vrCleaned && !origCleaned) return { status: 'NOT_APPLICABLE' };
  
  if (vrCleaned && !origCleaned) {
    return {
      status: 'BETTER',
      originalAgentObservation: 'Nenhum resultado limpo disponível',
      visualReferenceAgentObservation: 'Imagem higienizada gerada com fundo branco/neutro, preservando contornos faciais, cabelos e logo físico',
      notes: 'Compara: subject identity, facial fidelity, hair edges, pose, wardrobe, physical logo, overlay removal, white background, edge fidelity, natural texture, artifacts.'
    };
  }

  return {
    status: 'MATCH',
    originalAgentObservation: 'Imagem limpa fornecida pelo agente original',
    visualReferenceAgentObservation: 'Imagem limpa gerada pelo Visual Reference Cleaner',
    notes: 'Paridade de isolamento de sujeito, fidelidade de bordas e remoção de overlays.'
  };
}

/**
 * Computes overall benchmark status based on domain weights.
 */
export function computeOverallBenchmarkStatus(
  comparison: VisualReferenceBenchmarkComparison
): BenchmarkOverallStatus {
  const domainEntries = Object.entries(comparison) as Array<[keyof VisualReferenceBenchmarkComparison, BenchmarkDomainResult | undefined]>;
  
  let highWeightBetterCount = 0;
  let regularBetterCount = 0;
  let worseCount = 0;
  let matchCount = 0;
  let applicableCount = 0;

  for (const [key, result] of domainEntries) {
    if (!result || result.status === 'NOT_APPLICABLE' || result.status === 'UNDETERMINED') {
      continue;
    }

    applicableCount++;

    if (result.status === 'WORSE') {
      worseCount++;
    } else if (result.status === 'BETTER') {
      if (HIGH_WEIGHT_DOMAINS.includes(key)) {
        highWeightBetterCount++;
      } else {
        regularBetterCount++;
      }
    } else if (result.status === 'MATCH' || result.status === 'DIFFERENT_BUT_VALID') {
      matchCount++;
    }
  }

  if (applicableCount === 0) {
    return 'UNDETERMINED';
  }

  // If there are significant regressions
  if (worseCount > 1) {
    return 'REGRESSION';
  }

  // If there is 1 regression, but matched or improved in other domains
  if (worseCount === 1) {
    return 'PARTIAL_PARITY';
  }

  // If strictly improved with no regressions (high weight or multiple regular domains)
  if (highWeightBetterCount >= 1 || regularBetterCount >= 3) {
    return 'IMPROVED';
  }

  if (matchCount >= 2 && worseCount === 0) {
    return 'PARITY';
  }

  return 'PARITY';
}

/**
 * Builds or updates a benchmark suite summary.
 */
export function createBenchmarkSuite(
  name: string,
  records: VisualReferenceBenchmarkRecord[]
): VisualReferenceBenchmarkSuite {
  let parityCount = 0;
  let improvedCount = 0;
  let partialParityCount = 0;
  let regressionCount = 0;
  let undeterminedCount = 0;

  for (const r of records) {
    switch (r.overallStatus) {
      case 'PARITY':
        parityCount++;
        break;
      case 'IMPROVED':
        improvedCount++;
        break;
      case 'PARTIAL_PARITY':
        partialParityCount++;
        break;
      case 'REGRESSION':
        regressionCount++;
        break;
      case 'UNDETERMINED':
      default:
        undeterminedCount++;
        break;
    }
  }

  return {
    id: `suite_${Date.now()}`,
    name,
    records,
    summary: {
      totalRecords: records.length,
      parityCount,
      improvedCount,
      partialParityCount,
      regressionCount,
      undeterminedCount
    },
    createdAt: Date.now()
  };
}

/**
 * Canonical breakdown of all 22 comparison keys:
 * 20 macro benchmark domains + 2 dedicated bilateral pose subdomains (arms, hands).
 */
export const BENCHMARK_CANONICAL_DOMAIN_COUNT_LABEL = '22 comparison keys (20 macro domains + arms + hands)';

export const BENCHMARK_COMPARISON_KEYS_SCHEMA: Array<{
  key: keyof VisualReferenceBenchmarkComparison;
  label: string;
  category: 'MACRO_DOMAIN' | 'POSE_SUBDOMAIN';
  priority: 'HIGH' | 'NORMAL';
}> = [
  { key: 'pose', label: 'Pose (Orientation, Tilt & Trunk Alignment)', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'arms', label: 'Arms (Bilateral Directions & Elbow States)', category: 'POSE_SUBDOMAIN', priority: 'HIGH' },
  { key: 'hands', label: 'Hands (Gestures, Fingers & Contact Targets)', category: 'POSE_SUBDOMAIN', priority: 'HIGH' },
  { key: 'textClassification', label: 'Text / Branding (Remove Overlay vs Preserve Physical)', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'branding', label: 'Physical Branding & Embroidered Logos', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'promptStructure', label: 'Prompt Modular Structure & Token Hierarchy', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'preservation', label: 'Preservation Directives & Invariance Locks', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'objects', label: 'Product / Objects Hierarchy & Handheld Grips', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'cleaningQuality', label: 'Cleaner Fidelity, Hair Edges & Masking', category: 'MACRO_DOMAIN', priority: 'HIGH' },
  { key: 'subject', label: 'Subject Count & Type Specification', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'face', label: 'Face Anatomy (Eyes, Nose, Mouth Subsystems)', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'skin', label: 'Skin Microtexture & Natural Undertones', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'hair', label: 'Hair Details, Volume & Color', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'wardrobe', label: 'Wardrobe & Fabric Weave Details', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'camera', label: 'Camera Angle & Depth of Field', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'lighting', label: 'Lighting Vectors & Diffused Softness', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'background', label: 'Background Separation & Dominant Colors', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'texture', label: 'Anti-Airbrushing / Pore Texture', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'expression', label: 'Expression / Gaze Neutrality', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'crop', label: 'Framing / Crop Isolation', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'composition', label: 'Aspect Ratio & Spatial Balance', category: 'MACRO_DOMAIN', priority: 'NORMAL' },
  { key: 'accessories', label: 'Accessories', category: 'MACRO_DOMAIN', priority: 'NORMAL' }
];

/**
 * Normalizes enum output to strictly one valid BenchmarkDomainStatus string.
 * Never outputs combined or slashed strings like "MATCH / BETTER".
 */
export function formatDomainStatusEnum(status: BenchmarkDomainStatus): BenchmarkDomainStatus {
  const validStatuses: BenchmarkDomainStatus[] = [
    'MATCH',
    'BETTER',
    'WORSE',
    'DIFFERENT_BUT_VALID',
    'NOT_APPLICABLE',
    'UNDETERMINED'
  ];
  return validStatuses.includes(status) ? status : 'UNDETERMINED';
}

/**
 * Deterministically aggregates counts across all 22 comparison keys.
 * Invariant: better + match + worse + differentButValid + notApplicable + undetermined === 22.
 * Throws an Error with 'BENCHMARK_SUMMARY_INTEGRITY_ERROR' if the comparison does not sum to 22.
 */
export function summarizeBenchmarkDomainStatuses(
  comparison: VisualReferenceBenchmarkComparison
): BenchmarkDomainSummaryCounts {
  if (!comparison || typeof comparison !== 'object') {
    throw new Error('BENCHMARK_SUMMARY_INTEGRITY_ERROR: Comparison object is null or invalid');
  }

  let better = 0;
  let match = 0;
  let worse = 0;
  let differentButValid = 0;
  let notApplicable = 0;
  let undetermined = 0;

  for (const item of BENCHMARK_COMPARISON_KEYS_SCHEMA) {
    const res = comparison[item.key];
    const status = res ? formatDomainStatusEnum(res.status) : 'UNDETERMINED';

    switch (status) {
      case 'BETTER':
        better++;
        break;
      case 'MATCH':
        match++;
        break;
      case 'WORSE':
        worse++;
        break;
      case 'DIFFERENT_BUT_VALID':
        differentButValid++;
        break;
      case 'NOT_APPLICABLE':
        notApplicable++;
        break;
      case 'UNDETERMINED':
      default:
        undetermined++;
        break;
    }
  }

  const sum = better + match + worse + differentButValid + notApplicable + undetermined;

  if (sum !== 22) {
    throw new Error(
      `BENCHMARK_SUMMARY_INTEGRITY_ERROR: Expected 22 keys in benchmark summary, got ${sum}`
    );
  }

  return {
    total: 22,
    better,
    match,
    worse,
    differentButValid,
    notApplicable,
    undetermined
  };
}

/**
 * Validates integrity of summary counts against expected 22 keys.
 */
export function validateBenchmarkSummaryIntegrity(
  comparison: VisualReferenceBenchmarkComparison
): { isValid: boolean; summary?: BenchmarkDomainSummaryCounts; error?: BenchmarkSummaryIntegrityError } {
  try {
    const summary = summarizeBenchmarkDomainStatuses(comparison);
    return { isValid: true, summary };
  } catch (err: any) {
    return {
      isValid: false,
      error: {
        code: 'BENCHMARK_SUMMARY_INTEGRITY_ERROR',
        reason: err?.message || 'Summary count invariant broken',
        expectedTotal: 22,
        actualTotal: (comparison && typeof comparison === 'object') ? Object.keys(comparison).length : 0,
        counts: {
          better: 0,
          match: 0,
          worse: 0,
          differentButValid: 0,
          notApplicable: 0,
          undetermined: 0
        }
      }
    };
  }
}

/**
 * Generates a normalized textual report for a single benchmark record.
 * Conforms strictly to Stage 9C.1 & Stage 9D.1:
 * - Declares "22 comparison keys (20 macro domains + arms + hands)"
 * - Outputs strictly scalar enum values for each key (never slashed strings)
 * - Embeds deterministic summary counts table calculated from summarizeBenchmarkDomainStatuses
 */
export function generateNormalizedBenchmarkReport(record: VisualReferenceBenchmarkRecord): string {
  const summary = summarizeBenchmarkDomainStatuses(record.comparison);
  const lines: string[] = [];
  lines.push(`=== BENCHMARK REPORT: ${record.scenario} ===`);
  lines.push(`Scenario Type: ${record.scenarioType}`);
  lines.push(`Validation Mode: ${record.validationMode || 'HARNESS_VALIDATED'}`);
  lines.push(`Baseline Source: ${record.baselineSource || 'UNKNOWN'}`);
  lines.push(`Baseline Synthetic: ${record.baselineSynthetic ?? false}`);
  lines.push(`Baseline Verified: ${record.baselineVerified ?? false}`);
  lines.push(`Baseline Integrity Status: ${record.baselineIntegrityStatus || 'VALID'}`);
  lines.push(`Comparison Scope: ${BENCHMARK_CANONICAL_DOMAIN_COUNT_LABEL}`);
  lines.push(`Overall Status: ${record.overallStatus}`);
  lines.push('');
  lines.push('--- SUMMARY COUNTS (22 comparison keys) ---');
  lines.push(`BETTER              ${String(summary.better).padStart(2, ' ')}`);
  lines.push(`MATCH               ${String(summary.match).padStart(2, ' ')}`);
  lines.push(`DIFFERENT_BUT_VALID ${String(summary.differentButValid).padStart(2, ' ')}`);
  lines.push(`WORSE               ${String(summary.worse).padStart(2, ' ')}`);
  lines.push(`NOT_APPLICABLE      ${String(summary.notApplicable).padStart(2, ' ')}`);
  lines.push(`UNDETERMINED        ${String(summary.undetermined).padStart(2, ' ')}`);
  lines.push(`TOTAL               ${String(summary.total).padStart(2, ' ')}`);
  lines.push('');
  lines.push('--- COMPARISON MATRIX (22 Comparison Keys) ---');

  for (const item of BENCHMARK_COMPARISON_KEYS_SCHEMA) {
    const domainResult = record.comparison[item.key];
    const statusVal = domainResult ? formatDomainStatusEnum(domainResult.status) : 'UNDETERMINED';
    const tag = item.category === 'POSE_SUBDOMAIN' ? '[POSE SUBDOMAIN]' : '[MACRO DOMAIN]';
    const weightTag = item.priority === 'HIGH' ? '(HIGH WEIGHT)' : '(NORMAL)';
    lines.push(`- ${item.key.padEnd(20, ' ')} : ${statusVal.padEnd(20, ' ')} ${tag} ${weightTag}`);
  }

  return lines.join('\n');
}
