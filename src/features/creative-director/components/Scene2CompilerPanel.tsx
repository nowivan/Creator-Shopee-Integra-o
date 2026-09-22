import React, { useState, useRef, useEffect } from 'react';
import { Card, LucideIcon } from '../../../components/Common';
import { StoredAvatar } from '../../../components/IdentityHub';
import { loadCanonicalAvatars, subscribeToAvatarUpdates } from '../../../services/avatarStorageService';
import { copyToClipboard } from '../../../utils';
import { isAbortError, isTimeoutError } from '../../../services/workerClient';
import {
  Scene2DynamicSlots,
  Scene2Presenter,
  Scene2Wardrobe,
  Scene2CompilerDiagnosticTrace,
  ProductGroundingResult,
  FieldSource,
  Scene2PipelineStatus,
  DiagnosticStepStatus,
  CompiledScene2Model,
  Scene2JsonOutput,
  Scene2PipelineResult,
  CreativeDirectorProductWorkspace,
  Scene2ProductContext
} from '../types/compilerTypes';
import { CreativeDirectorScene2CompilerSnapshot, hasValidScene2CompiledOutput } from '../creativeDirectorSessionStorage';
import {
  Scene3CtaHandoff,
  Scene3CtaVariation,
  Scene3CtaCandidate,
  VariationCount
} from '../types/scene3';
import {
  Scene3CtaHubQuantity,
  Scene3CtaVariation as Scene3CtaHubVariation
} from '../types/scene3CtaHub';
import { generateScene3CtaHubVariations } from '../services/scene3CtaHubService';
import { COPY_CONTRACT, validateCopyContract } from '../../copy-contract';
import {
  getAuthoritativeCopyAgentScene3Info,
  AuthoritativeCopyAgentCtaInfo
} from '../services/scene3GenerationService';
import {
  generateScene3CtaVariations,
  assertCopyPreserved
} from '../services/scene2CtaGenerationService';
import { generateScene3CtasFromCopyAgent } from '../services/scene2CtaGenerationService';
import {
  compileScene2Prompt,
  validateScene2Slots,
  formatWardrobeSpecification,
  buildCompiledScene2Model,
  renderScene2Text,
  renderScene2Json,
  renderScene2JsonString
} from '../compiler/promptCompiler';
import { runScene2CompilerPipeline } from '../services/scene2BrainService';
import { analyzeProductFactualGrounding, createNormalizedProductContext } from '../services/productGroundingService';
import { SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE } from '../templates/scene2BaseTemplate';
import {
  extractWardrobeFromAvatar,
  DetectedWardrobeProfile,
  WardrobeFieldOrigin,
  WardrobeFieldOrigins
} from '../wardrobe/wardrobeVisionExtractor';
import {
  extractAvatarFullContext,
  saveExtractedWardrobeToCanonicalAvatar,
  buildAvatarFieldOrigins,
  AvatarExtractedData
} from '../wardrobe/avatarWardrobeContext';
import {
  resolveAvatarIdentityContext
} from '../../visual-reference-engine/services/avatarIdentityHandoff';
import {
  resolveWardrobeContract,
  buildWardrobeConsistencyLock,
  computeWardrobeContractHash,
  getWardrobeContractDevDiagnostic,
  ResolvedWardrobeContract,
  WardrobeConsistencyLock
} from '../wardrobe/wardrobePriorityResolver';
import {
  BATH_TOWELS_PRESET,
  WRISTWATCH_PRESET,
  COOKWARE_PRESET
} from '../data/scene2Presets';

interface Scene2CompilerPanelProps {
  currentKey: string;
  defaultProductName?: string;
  defaultCategory?: string;
  defaultProductImage?: string | null;
  defaultAvatarImage?: string | null;
  detectedFacts?: string[];
  detectedVisibleDetails?: string[];
  ctaHandoff?: Scene3CtaHandoff | null;
  onSendCtaToScene3?: (handoff: Scene3CtaHandoff) => void;
  onClearCtaHandoff?: () => void;
  onApplyScene2Copy?: (copy: string) => void;
  // Phase 2.4.2B: Shared Product Workspace
  productWorkspace?: CreativeDirectorProductWorkspace;
  onUploadProductImage?: (file: File) => void;
  onRemoveProductImage?: () => void;
  onAnalyzeProduct?: (overrides?: {
    productName?: string;
    category?: string;
    userFacts?: string[];
    productQuantity?: string | number;
    observableDetails?: string[];
    verifiedFacts?: string[];
    uncertainObservations?: string[];
    forceReanalyze?: boolean;
  }) => Promise<{ grounding: ProductGroundingResult; normalized: Scene2ProductContext } | null>;
  onUpdateProductContext?: (context: Scene2ProductContext) => void;
  // Shared Avatar Props
  selectedAvatarId?: number | string | null;
  onSelectAvatar?: (avatarId: number | string | null) => void;
  sharedAvatarExtractedData?: AvatarExtractedData | null;
  onAvatarExtracted?: (extracted: AvatarExtractedData) => void;
  // Scene 2 Compiler Output Snapshot & Restore Props
  compilerSnapshot?: CreativeDirectorScene2CompilerSnapshot | null;
  onCompilerSnapshotChange?: (snapshot: CreativeDirectorScene2CompilerSnapshot | null) => void;
  isRestoring?: boolean;
}

export const Scene2CompilerPanel: React.FC<Scene2CompilerPanelProps> = ({
  currentKey,
  defaultProductName = '',
  defaultCategory = '',
  defaultProductImage = null,
  defaultAvatarImage = null,
  detectedFacts = [],
  detectedVisibleDetails = [],
  ctaHandoff = null,
  onSendCtaToScene3,
  onClearCtaHandoff,
  onApplyScene2Copy,
  productWorkspace,
  onUploadProductImage,
  onRemoveProductImage,
  onAnalyzeProduct,
  onUpdateProductContext,
  selectedAvatarId = null,
  onSelectAvatar,
  sharedAvatarExtractedData = null,
  onAvatarExtracted,
  compilerSnapshot = null,
  onCompilerSnapshotChange,
  isRestoring = false
}) => {
  // Preset selector
  const [selectedPreset, setSelectedPreset] = useState<'towels' | 'watch' | 'cookware' | 'custom'>('custom');

  // Mode: Image Analysis (default) vs Manual Entry
  const [sourceMode, setSourceMode] = useState<'image' | 'manual'>('image');

  // Product Image State
  const [productImage, setProductImage] = useState<string | null>(
    productWorkspace?.productImagePreview || defaultProductImage || null
  );
  const [productImageName, setProductImageName] = useState<string>(
    productWorkspace?.productImageName || (defaultProductImage ? 'product-reference.jpg' : '')
  );
  const [groundingResult, setGroundingResult] = useState<ProductGroundingResult | null>(
    productWorkspace?.groundingResult || null
  );
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Field source tracking for badges: [Extraído da imagem], [Informado pelo usuário], [Override manual]
  const [productNameSource, setProductNameSource] = useState<FieldSource>(defaultProductName ? 'user_provided' : 'user_provided');
  const [categorySource, setCategorySource] = useState<FieldSource>(defaultCategory ? 'user_provided' : 'user_provided');
  const [quantitySource, setQuantitySource] = useState<FieldSource>('user_provided');
  const [factsSource, setFactsSource] = useState<FieldSource>(detectedFacts.length > 0 ? 'user_provided' : 'user_provided');
  const [detailsSource, setDetailsSource] = useState<FieldSource>(detectedVisibleDetails.length > 0 ? 'user_provided' : 'user_provided');

  // Input states
  const [productName, setProductName] = useState(defaultProductName || '');
  const [category, setCategory] = useState(defaultCategory || '');
  const [primaryBenefit, setPrimaryBenefit] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productFactsText, setProductFactsText] = useState(
    Array.isArray(detectedFacts) && detectedFacts.length > 0 ? detectedFacts.join('\n') : ''
  );
  const [visibleDetailsText, setVisibleDetailsText] = useState(
    Array.isArray(detectedVisibleDetails) && detectedVisibleDetails.length > 0
      ? detectedVisibleDetails.join('\n')
      : ''
  );

  // Track product revision ID to react to external workspace updates
  const lastRevisionIdRef = useRef<string | null>(productWorkspace?.productRevisionId || null);

  // Synchronize with Shared Product Workspace (Phase 2.4.2B)
  useEffect(() => {
    if (!productWorkspace) return;

    setProductImage(productWorkspace.productImagePreview);
    setProductImageName(productWorkspace.productImageName || '');
    if (productWorkspace.groundingResult) {
      setGroundingResult(productWorkspace.groundingResult);
    }

    if (productWorkspace.productRevisionId !== lastRevisionIdRef.current) {
      lastRevisionIdRef.current = productWorkspace.productRevisionId;

      if (productWorkspace.normalizedProductContext) {
        setProductName(productWorkspace.normalizedProductContext.identity);
        setCategory(productWorkspace.normalizedProductContext.category || '');
        setProductQuantity(
          productWorkspace.normalizedProductContext.observableQuantity
            ? String(productWorkspace.normalizedProductContext.observableQuantity)
            : ''
        );
        setProductFactsText(productWorkspace.normalizedProductContext.verifiedFunctionalFacts.join('\n'));
        setVisibleDetailsText(productWorkspace.normalizedProductContext.observableDetails.join('\n'));
        setProductNameSource('extracted_from_image');
        setCategorySource('extracted_from_image');
        setQuantitySource('extracted_from_image');
        setFactsSource('extracted_from_image');
        setDetailsSource('extracted_from_image');

        if (!isRestoring && !compilerSnapshot?.compiledPrompt && !compilerSnapshot?.pipelineResult) {
          setPipelineStatus('ANALYZED');
          invalidateDependentProductData();
        }
      } else if (productWorkspace.productImagePreview) {
        if (!isRestoring && !compilerSnapshot?.compiledPrompt && !compilerSnapshot?.pipelineResult) {
          setPipelineStatus('IMAGE_SELECTED');
          setProductName('');
          setCategory('');
          setProductQuantity('');
          setProductFactsText('');
          setVisibleDetailsText('');
          setPrimaryBenefit('');
          invalidateDependentProductData();
        }
      } else {
        if (!isRestoring && !compilerSnapshot?.compiledPrompt && !compilerSnapshot?.pipelineResult) {
          setPipelineStatus('EMPTY');
          setProductName('');
          setCategory('');
          setProductQuantity('');
          setProductFactsText('');
          setVisibleDetailsText('');
          setPrimaryBenefit('');
          invalidateDependentProductData();
        }
      }
    } else if (productWorkspace.groundingStatus === 'ready' && productWorkspace.normalizedProductContext) {
      setProductName(productWorkspace.normalizedProductContext.identity);
      setCategory(productWorkspace.normalizedProductContext.category || '');
      setProductQuantity(
        productWorkspace.normalizedProductContext.observableQuantity
          ? String(productWorkspace.normalizedProductContext.observableQuantity)
          : ''
      );
      setProductFactsText(productWorkspace.normalizedProductContext.verifiedFunctionalFacts.join('\n'));
      setVisibleDetailsText(productWorkspace.normalizedProductContext.observableDetails.join('\n'));
      setProductNameSource('extracted_from_image');
      setCategorySource('extracted_from_image');
      setQuantitySource('extracted_from_image');
      setFactsSource('extracted_from_image');
      setDetailsSource('extracted_from_image');
      if (!result && !compilerSnapshot?.compiledPrompt && !compilerSnapshot?.pipelineResult) {
        setPipelineStatus('ANALYZED');
      }
    }
  }, [productWorkspace?.productRevisionId, productWorkspace?.groundingStatus, productWorkspace?.normalizedProductContext, isRestoring, compilerSnapshot]);

  // Presenter & Wardrobe (Enforced Priority)
  const [wardrobeSourceMode, setWardrobeSourceMode] = useState<'manual' | 'identity_hub'>('manual');
  const [selectedWardrobeAvatarId, setSelectedWardrobeAvatarId] = useState<number | string | null>(null);
  const [availableAvatars, setAvailableAvatars] = useState<StoredAvatar[]>([]);
  const [presenterGender, setPresenterGender] = useState<'female' | 'male'>('female');
  const [presenterDesc, setPresenterDesc] = useState('');
  const [topType, setTopType] = useState('basic plain t-shirt');
  const [topStyle, setTopStyle] = useState('crew neck');
  const [topColor, setTopColor] = useState('white');
  const [bottomType, setBottomType] = useState('basic jeans');
  const [bottomColor, setBottomColor] = useState('medium wash blue');
  const [footwearType, setFootwearType] = useState('plain sneakers');
  const [footwearColor, setFootwearColor] = useState('white');

  // Stage 3: Field-level Wardrobe Origin Tracking (manual > avatar_extraction > default)
  const [wardrobeFieldOrigins, setWardrobeFieldOrigins] = useState<WardrobeFieldOrigins>({
    presenterGender: 'default',
    topType: 'default',
    topColor: 'default',
    topStyle: 'default',
    bottomType: 'default',
    bottomColor: 'default',
    footwearType: 'default',
    footwearColor: 'default',
    presenterDescription: 'default'
  });
  const [wardrobeApplyFeedback, setWardrobeApplyFeedback] = useState<string | null>(null);

  // Stage 2: Wardrobe Vision Extraction from Identity Hub Avatar (Temporary Detection State)
  const [detectedWardrobeProfile, setDetectedWardrobeProfile] = useState<DetectedWardrobeProfile | null>(null);
  const [wardrobeExtractionStatus, setWardrobeExtractionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [wardrobeExtractionError, setWardrobeExtractionError] = useState<string | null>(null);
  const [detectedWardrobeAvatarId, setDetectedWardrobeAvatarId] = useState<number | string | null>(null);
  const wardrobeExtractionRequestIdRef = useRef<number>(0);

  const handleSelectWardrobeAvatar = (avatarId: number | string) => {
    setSelectedWardrobeAvatarId(avatarId);
    wardrobeExtractionRequestIdRef.current++;
    onSelectAvatar?.(avatarId);

    const selectedAvatar = availableAvatars.find(a => String(a.id) === String(avatarId));
    if (selectedAvatar) {
      const extracted = extractAvatarFullContext(selectedAvatar);
      if (extracted) {
        onAvatarExtracted?.(extracted);
        if (extracted.hasWardrobe) {
          if (extracted.gender) setPresenterGender(extracted.gender);
          if (extracted.presenterIdentity) setPresenterDesc(extracted.presenterIdentity);
          if (extracted.topType) setTopType(extracted.topType);
          if (extracted.topColor) setTopColor(extracted.topColor);
          if (extracted.topStyle) setTopStyle(extracted.topStyle);
          if (extracted.bottomType) setBottomType(extracted.bottomType);
          if (extracted.bottomColor) setBottomColor(extracted.bottomColor);
          if (extracted.footwearType) setFootwearType(extracted.footwearType);
          if (extracted.footwearColor) setFootwearColor(extracted.footwearColor);
          setWardrobeFieldOrigins(buildAvatarFieldOrigins(extracted));
          setWardrobeApplyFeedback('Dados do avatar aplicados automaticamente.');
          setTimeout(() => setWardrobeApplyFeedback(null), 4000);
        } else if (extracted.presenterIdentity) {
          if (extracted.gender) setPresenterGender(extracted.gender);
          setPresenterDesc(extracted.presenterIdentity);
        }
      }
    }

    if (String(detectedWardrobeAvatarId) !== String(avatarId)) {
      setDetectedWardrobeProfile(null);
      setWardrobeExtractionStatus('idle');
      setWardrobeExtractionError(null);
    }
  };

  const handleExtractWardrobeFromAvatar = async () => {
    const selectedAvatar = availableAvatars.find(a => String(a.id) === String(selectedWardrobeAvatarId));
    if (!selectedAvatar) {
      setWardrobeExtractionStatus('error');
      setWardrobeExtractionError('Nenhum avatar selecionado do Identity Hub.');
      return;
    }

    if (!selectedAvatar.image) {
      setWardrobeExtractionStatus('error');
      setWardrobeExtractionError('O avatar selecionado não possui imagem de referência.');
      return;
    }

    const requestId = ++wardrobeExtractionRequestIdRef.current;
    const currentAvatarId = selectedAvatar.id;

    setWardrobeExtractionStatus('loading');
    setWardrobeExtractionError(null);

    try {
      const profile = await extractWardrobeFromAvatar({
        avatarImage: selectedAvatar.image,
        avatarName: selectedAvatar.name,
        apiKey: currentKey
      });

      // Stale check: verify request ID is still current and selected avatar hasn't changed
      if (
        requestId === wardrobeExtractionRequestIdRef.current &&
        String(selectedWardrobeAvatarId) === String(currentAvatarId)
      ) {
        setDetectedWardrobeProfile(profile);
        setDetectedWardrobeAvatarId(currentAvatarId);
        setWardrobeExtractionStatus('success');

        // Save extracted profile back to canonical storage
        const updatedAvatar = saveExtractedWardrobeToCanonicalAvatar(currentAvatarId, profile);
        const fullExtracted = extractAvatarFullContext(updatedAvatar || selectedAvatar);
        if (fullExtracted) {
          onAvatarExtracted?.(fullExtracted);
        }
      }
    } catch (err: any) {
      if (requestId === wardrobeExtractionRequestIdRef.current) {
        setWardrobeExtractionStatus('error');
        setWardrobeExtractionError(err?.message || 'Erro ao extrair figurino do avatar.');
      }
    }
  };

  // Stage 3: Explicit Apply Action from Detected Vision Profile to Existing Wardrobe Form
  const handleApplyDetectedWardrobe = () => {
    if (
      !detectedWardrobeProfile ||
      String(detectedWardrobeAvatarId) !== String(selectedWardrobeAvatarId) ||
      wardrobeExtractionStatus !== 'success'
    ) {
      return;
    }

    const newOrigins: WardrobeFieldOrigins = { ...wardrobeFieldOrigins };

    // presenterGender
    if (detectedWardrobeProfile.presenterGender && detectedWardrobeProfile.presenterGender.trim() !== '') {
      const g = detectedWardrobeProfile.presenterGender.toLowerCase();
      if (g === 'female' || g === 'male') {
        setPresenterGender(g as 'female' | 'male');
        newOrigins.presenterGender = 'avatar_extraction';
      }
    }

    // topType
    if (detectedWardrobeProfile.topType && detectedWardrobeProfile.topType.trim() !== '') {
      setTopType(detectedWardrobeProfile.topType.trim());
      newOrigins.topType = 'avatar_extraction';
    }

    // topColor
    if (detectedWardrobeProfile.topColor && detectedWardrobeProfile.topColor.trim() !== '') {
      setTopColor(detectedWardrobeProfile.topColor.trim());
      newOrigins.topColor = 'avatar_extraction';
    }

    // topStyle
    if (detectedWardrobeProfile.topStyle && detectedWardrobeProfile.topStyle.trim() !== '') {
      setTopStyle(detectedWardrobeProfile.topStyle.trim());
      newOrigins.topStyle = 'avatar_extraction';
    }

    // bottomType
    if (detectedWardrobeProfile.bottomType && detectedWardrobeProfile.bottomType.trim() !== '') {
      setBottomType(detectedWardrobeProfile.bottomType.trim());
      newOrigins.bottomType = 'avatar_extraction';
    }

    // bottomColor
    if (detectedWardrobeProfile.bottomColor && detectedWardrobeProfile.bottomColor.trim() !== '') {
      setBottomColor(detectedWardrobeProfile.bottomColor.trim());
      newOrigins.bottomColor = 'avatar_extraction';
    }

    // footwearType
    if (detectedWardrobeProfile.footwearType && detectedWardrobeProfile.footwearType.trim() !== '') {
      setFootwearType(detectedWardrobeProfile.footwearType.trim());
      newOrigins.footwearType = 'avatar_extraction';
    }

    // footwearColor
    if (detectedWardrobeProfile.footwearColor && detectedWardrobeProfile.footwearColor.trim() !== '') {
      setFootwearColor(detectedWardrobeProfile.footwearColor.trim());
      newOrigins.footwearColor = 'avatar_extraction';
    }

    // presenterDescription
    if (detectedWardrobeProfile.presenterDescription && detectedWardrobeProfile.presenterDescription.trim() !== '') {
      setPresenterDesc(detectedWardrobeProfile.presenterDescription.trim());
      newOrigins.presenterDescription = 'avatar_extraction';
    }

    setWardrobeFieldOrigins(newOrigins);
    invalidateCompiledOutput();
    setWardrobeApplyFeedback('Figurino aplicado aos campos.');
    setTimeout(() => {
      setWardrobeApplyFeedback(null);
    }, 4000);
  };

  const renderWardrobeOriginBadge = (origin?: WardrobeFieldOrigin) => {
    if (origin === 'avatar_extraction') {
      return (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/50 font-medium inline-flex items-center gap-1">
          <LucideIcon name="sparkles" className="w-2.5 h-2.5 text-purple-400" />
          Detectado do Avatar
        </span>
      );
    }
    if (origin === 'manual') {
      return (
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/50 font-medium inline-flex items-center gap-1">
          <LucideIcon name="edit-3" className="w-2.5 h-2.5 text-blue-400" />
          Manual
        </span>
      );
    }
    return null;
  };

  // Sync available Identity Hub avatars from canonical storage
  useEffect(() => {
    const handleSync = (updated: StoredAvatar[]) => {
      setAvailableAvatars(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(updated)) {
          return updated;
        }
        return prev;
      });

      // Selected avatar safety: if selected avatar is missing, clear or adjust safely
      setSelectedWardrobeAvatarId(prevId => {
        if (prevId && !updated.some(a => String(a.id) === String(prevId))) {
          return updated.length > 0 ? updated[0].id : null;
        }
        return prevId;
      });
    };

    // Initial load
    const initial = loadCanonicalAvatars();
    handleSync(initial);

    // Subscribe to same-tab and cross-tab updates
    const unsubscribe = subscribeToAvatarUpdates(handleSync);
    return unsubscribe;
  }, []);

  // Pipeline Status & Tabs
  const [pipelineStatus, setPipelineStatus] = useState<Scene2PipelineStatus>(
    defaultProductImage ? 'IMAGE_SELECTED' : 'EMPTY'
  );
  const [loading, setLoading] = useState(false);
  const [activeLayerTab, setActiveLayerTab] = useState<'compiled' | 'grounding' | 'copy_brain' | 'scene_brain' | 'slots' | 'tests'>('compiled');
  const [outputFormat, setOutputFormat] = useState<'prompt' | 'json'>('prompt');
  const [result, setResult] = useState<Scene2PipelineResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Helper to build CreativeDirectorScene2CompilerSnapshot
  const buildSnapshotFromResult = (
    pipelineResult: Scene2PipelineResult | null,
    grounding: ProductGroundingResult | null,
    tab: string = activeLayerTab,
    format: 'prompt' | 'json' = outputFormat,
    status: 'idle' | 'compiled' | 'error' = 'compiled'
  ): CreativeDirectorScene2CompilerSnapshot | null => {
    if (!pipelineResult && !grounding) {
      return null;
    }

    return {
      compiledPrompt: pipelineResult?.compiledPrompt,
      compiledJson: pipelineResult?.compiledJson,
      compiledJsonString: pipelineResult?.compiledJsonString,
      groundingFactual: grounding || undefined,
      copyBrainC2: pipelineResult?.diagnosticTrace?.copyBrainOutput,
      sceneBrainC2: pipelineResult?.dynamicSlots?.environment || pipelineResult?.dynamicSlots?.actions ? {
        environment: pipelineResult.dynamicSlots.environment,
        actions: pipelineResult.dynamicSlots.actions,
        speechActionSync: pipelineResult.dynamicSlots.speechActionSync
      } : undefined,
      slotsJson: pipelineResult?.dynamicSlots,
      guaranteesP0: pipelineResult?.diagnosticTrace?.wardrobeContract,
      activeOutputTab: tab,
      activePromptView: format,
      characterCount: pipelineResult?.compiledPrompt ? pipelineResult.compiledPrompt.length : 0,
      status: pipelineResult ? 'compiled' : status,
      compiledAt: Date.now(),
      pipelineResult: pipelineResult || undefined
    };
  };

  // Helper to hydrate Scene2PipelineResult from Snapshot
  const hydrateResultFromSnapshot = (
    snapshot: CreativeDirectorScene2CompilerSnapshot
  ): Scene2PipelineResult | null => {
    if (snapshot.pipelineResult) {
      return snapshot.pipelineResult;
    }

    if (snapshot.compiledPrompt) {
      const dynamicSlots = (snapshot.slotsJson as Scene2DynamicSlots) || ({} as Scene2DynamicSlots);
      const compiledJson = (snapshot.compiledJson as Scene2JsonOutput) || ({} as Scene2JsonOutput);
      const compiledJsonString = snapshot.compiledJsonString || (snapshot.compiledJson ? JSON.stringify(snapshot.compiledJson, null, 2) : '');
      const copyBrainOutput = (snapshot.copyBrainC2 as any) || undefined;
      const sceneBrainOutput = (snapshot.sceneBrainC2 as any) || undefined;

      return {
        dynamicSlots: {
          ...dynamicSlots,
          spokenCopy: copyBrainOutput?.spoken_copy || copyBrainOutput?.spokenCopy || dynamicSlots.spokenCopy || '',
          environment: sceneBrainOutput?.environment || dynamicSlots.environment || '',
          actions: sceneBrainOutput?.actions || dynamicSlots.actions,
          speechActionSync: sceneBrainOutput?.speechActionSync || dynamicSlots.speechActionSync || []
        },
        compiledModel: (snapshot.pipelineResult as any)?.compiledModel || ({} as any),
        compiledPrompt: snapshot.compiledPrompt,
        compiledJson,
        compiledJsonString,
        diagnosticTrace: {
          timestamp: new Date(snapshot.compiledAt || Date.now()).toISOString(),
          productFacts: [],
          primaryBenefit: '',
          copyBrainOutput: copyBrainOutput || {
            dominant_fact: '',
            real_function: '',
            consumer_gain: '',
            practical_result: '',
            spoken_copy: '',
            verifiedFactUsed: ''
          },
          sceneBrainSlots: sceneBrainOutput || {
            environment: '',
            actions: { action0to2: '', action2to4: '', action4to6: '', action6to8: '' },
            speechActionSync: []
          },
          wardrobeContract: snapshot.guaranteesP0 as any,
          compiledPrompt: snapshot.compiledPrompt,
          compiledJson,
          executionTimeMs: 0,
          totalCalls: 0
        }
      };
    }

    return null;
  };

  // Hydrate from compilerSnapshot on session restore or prop update
  useEffect(() => {
    if (!compilerSnapshot) return;

    if (hasValidScene2CompiledOutput(compilerSnapshot)) {
      const hydrated = hydrateResultFromSnapshot(compilerSnapshot);
      if (hydrated) {
        setResult(hydrated);
        setPipelineStatus('COMPILED');
      }

      if (compilerSnapshot.groundingFactual) {
        setGroundingResult(compilerSnapshot.groundingFactual as ProductGroundingResult);
      }

      if (compilerSnapshot.activeOutputTab) {
        setActiveLayerTab(compilerSnapshot.activeOutputTab as any);
      }

      if (compilerSnapshot.activePromptView) {
        setOutputFormat(compilerSnapshot.activePromptView);
      }
    }
  }, [compilerSnapshot]);

  // Phase 2.4.4 — Dedicated Scene 3 CTA Hub State
  const [ctaQuantity, setCtaQuantity] = useState<Scene3CtaHubQuantity>(3);
  const [ctaVariations, setCtaVariations] = useState<Scene3CtaHubVariation[]>([]);
  const [isGeneratingCtas, setIsGeneratingCtas] = useState<boolean>(false);
  const [ctaGenerationError, setCtaGenerationError] = useState<string | null>(null);
  const [ctaSuccessMsg, setCtaSuccessMsg] = useState<string | null>(null);
  const [ctaActionErrors, setCtaActionErrors] = useState<Record<string, string>>({});

  // Available External Copy Agent CTA
  const [availableCopyAgentCta, setAvailableCopyAgentCta] = useState<AuthoritativeCopyAgentCtaInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync available Copy Agent Scene 3 CTA on mount or product change
  useEffect(() => {
    const info = getAuthoritativeCopyAgentScene3Info();
    setAvailableCopyAgentCta(info);
  }, [productName]);

  // Synchronize/Invalidate CTA variations when productRevisionId changes
  useEffect(() => {
    if (productWorkspace?.productRevisionId) {
      if (ctaVariations.length > 0 && ctaVariations[0].productRevisionId !== productWorkspace.productRevisionId) {
        setCtaVariations([]);
        setCtaActionErrors({});
        setCtaGenerationError(null);
        setCtaSuccessMsg(null);
      }
    }
  }, [productWorkspace?.productRevisionId]);

  // Handler for sending Scene 3 CTA (with Copy Contract Gate + Byte-Lock handoff)
  const handleSendCtaToScene3 = (variation: Scene3CtaHubVariation) => {
    if (!variation.text) return;

    const validation = validateCopyContract(variation.text);
    if (!validation.valid) {
      setCtaActionErrors(prev => ({
        ...prev,
        [variation.id]: `✕ Copy inválida (${validation.charCount} ch • Esperado: ${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} ch)`
      }));
      return;
    }

    // Clear error on valid dispatch
    setCtaActionErrors(prev => {
      const updated = { ...prev };
      delete updated[variation.id];
      return updated;
    });

    const handoff: Scene3CtaHandoff = {
      cta: variation.text,
      source: 'scene2_handoff',
      versionId: variation.variationIndex,
      productTitle: productName || productWorkspace?.productName || undefined,
      productRevisionId: variation.productRevisionId || productWorkspace?.productRevisionId || undefined,
      sentAt: Date.now(),
      characterCount: variation.text.length
    };

    if (onSendCtaToScene3) {
      onSendCtaToScene3(handoff);
    }

    setCtaSuccessMsg(`✓ CTA ${variation.variationIndex} enviada para Cena 3 com sucesso!`);
    setTimeout(() => setCtaSuccessMsg(null), 4000);
  };

  // Handler for generating Scene 3 CTA variations (Single AI call, NO auto-dispatch)
  const handleGenerateCtas = async () => {
    if (isGeneratingCtas) return;
    setCtaGenerationError(null);
    setCtaActionErrors({});

    const hasGrounding = Boolean(
      (productFactsText && productFactsText.trim().length > 0) ||
      (visibleDetailsText && visibleDetailsText.trim().length > 0) ||
      groundingResult !== null ||
      productWorkspace?.groundingStatus === 'ready'
    );

    if (!hasGrounding) {
      setCtaGenerationError('Analise o produto ou forneça fatos antes de gerar as CTAs.');
      return;
    }

    setIsGeneratingCtas(true);
    try {
      const revisionId = productWorkspace?.productRevisionId || `rev_${Date.now()}`;
      const effectiveFacts = productFactsText
        ? productFactsText.split('\n').map(s => s.trim()).filter(Boolean)
        : (productWorkspace?.knownPhysicalFacts || []);
      const effectiveDetails = visibleDetailsText
        ? visibleDetailsText.split('\n').map(s => s.trim()).filter(Boolean)
        : (productWorkspace?.visibleDetails || []);

      const variationsResult = await generateScene3CtaHubVariations({
        quantity: ctaQuantity,
        productRevisionId: revisionId,
        productIdentity: productName || productWorkspace?.productName || 'Produto',
        category: category.trim() || productWorkspace?.category || undefined,
        quantityDescription: productQuantity.trim() || productWorkspace?.quantity || undefined,
        verifiedFacts: effectiveFacts,
        visibleDetails: effectiveDetails,
        apiKey: currentKey
      });

      // Purely store options - NO automatic dispatch
      setCtaVariations(variationsResult.variations);
      setCtaSuccessMsg(`✓ ${variationsResult.variations.length} ${variationsResult.variations.length === 1 ? 'CTA gerada' : 'CTAs geradas'} com sucesso! Utilize o botão abaixo para enviar para a Cena 3.`);
      setTimeout(() => setCtaSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('[CTA CENA 3 — HUB] Erro ao gerar variações de CTA:', err);
      setCtaGenerationError(err.message || 'Erro ao gerar variações de CTA.');
    } finally {
      setIsGeneratingCtas(false);
    }
  };

  // Helper for source badge
  const renderSourceBadge = (source: FieldSource) => {
    if (source === 'extracted_from_image') {
      return (
        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Extraído da imagem
        </span>
      );
    }
    if (source === 'manual_override') {
      return (
        <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Override manual
        </span>
      );
    }
    return (
      <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        Informado pelo usuário
      </span>
    );
  };

  /**
   * INVOCATION & INVALIDATION ENGINE
   * When product image changes or is removed:
   * - Invalidate previous grounding
   * - Invalidate previous facts/details derived from old product
   * - Invalidate previous Copy Brain & Scene Brain output
   * - Invalidate previous compiled prompt & intermediate model & JSON
   * - PRESERVE independent settings: User Wardrobe and Presenter description
   */
  const invalidateDependentProductData = () => {
    if (isRestoring) return;
    setGroundingResult(null);
    setResult(null);
    setErrorMessage(null);
    setCtaVariations([]);
    setCtaActionErrors({});
    setCtaGenerationError(null);
    setCtaSuccessMsg(null);
    onClearCtaHandoff?.();
    onCompilerSnapshotChange?.(null);
  };

  const invalidateCompiledOutput = () => {
    if (isRestoring) return;
    if (result) {
      setResult(null);
      if (pipelineStatus === 'COMPILED') {
        setPipelineStatus(groundingResult ? 'ANALYZED' : 'READY_TO_COMPILE');
      }
      onCompilerSnapshotChange?.(null);
    }
    onClearCtaHandoff?.();
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleScene2ProductImage = (file: File) => {
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type.toLowerCase())) {
      setErrorMessage('Formato inválido. Por favor envie uma imagem PNG, JPG, JPEG ou WEBP.');
      return;
    }

    if (onUploadProductImage) {
      onUploadProductImage(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProductImage(dataUrl);
      setProductImageName(file.name || 'product-reference.png');

      // Invalidate old product derivations
      invalidateDependentProductData();
      setPipelineStatus('IMAGE_SELECTED');

      // Clear fields to avoid showing stale product data
      setProductName('');
      setCategory('');
      setProductQuantity('');
      setProductFactsText('');
      setVisibleDetailsText('');
      setPrimaryBenefit('');
      setProductNameSource('user_provided');
      setCategorySource('user_provided');
      setQuantitySource('user_provided');
      setFactsSource('user_provided');
      setDetailsSource('user_provided');
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleScene2ProductImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleScene2ProductImage(file);
    }
  };

  // Clipboard Paste Listener (CTRL+V / CMD+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      let imageItem: DataTransferItem | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          imageItem = items[i];
          break;
        }
      }

      // If no image is present in the clipboard, allow normal text paste into inputs/textareas
      if (!imageItem) {
        return;
      }

      // Image item detected: extract file and handle
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        handleScene2ProductImage(file);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onUploadProductImage]);

  const handleRemoveImage = () => {
    if (onRemoveProductImage) {
      onRemoveProductImage();
    } else {
      setProductImage(null);
      setProductImageName('');
      invalidateDependentProductData();
      setPipelineStatus('EMPTY');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Run Factual Grounding Analysis
  const handleAnalyzeImage = async () => {
    if (!productImage) {
      setErrorMessage('Nenhuma imagem carregada para análise.');
      return;
    }

    setAnalyzingImage(true);
    setPipelineStatus('ANALYZING');
    setErrorMessage(null);

    try {
      if (onAnalyzeProduct) {
        const res = await onAnalyzeProduct({
          productName: productName.trim() || undefined,
          category: category.trim() || undefined,
          userFacts: productFactsText.split('\n').map(s => s.trim()).filter(Boolean)
        });

        if (res) {
          setGroundingResult(res.grounding);
          if (res.normalized.identity) {
            setProductName(res.normalized.identity);
            setProductNameSource('extracted_from_image');
          }
          if (res.normalized.category) {
            setCategory(res.normalized.category);
            setCategorySource('extracted_from_image');
          }
          if (res.normalized.observableQuantity) {
            setProductQuantity(String(res.normalized.observableQuantity));
            setQuantitySource('extracted_from_image');
          }
          if (res.normalized.verifiedFunctionalFacts.length > 0) {
            setProductFactsText(res.normalized.verifiedFunctionalFacts.join('\n'));
            setFactsSource('extracted_from_image');
          }
          if (res.normalized.observableDetails.length > 0) {
            setVisibleDetailsText(res.normalized.observableDetails.join('\n'));
            setDetailsSource('extracted_from_image');
          }
        }
      } else {
        const grounding = await analyzeProductFactualGrounding(
          {
            imageInput: { base64: productImage },
            productName: productName.trim() || undefined,
            category: category.trim() || undefined,
            userFacts: productFactsText.split('\n').map(s => s.trim()).filter(Boolean)
          },
          currentKey
        );

        setGroundingResult(grounding);

        // Auto-populate fields with confidence and set source badges
        if (grounding.product_identity) {
          setProductName(grounding.product_identity);
          setProductNameSource('extracted_from_image');
        }
        if (grounding.category) {
          setCategory(grounding.category);
          setCategorySource('extracted_from_image');
        }
        if (typeof grounding.observable_quantity === 'number') {
          setProductQuantity(String(grounding.observable_quantity));
          setQuantitySource('extracted_from_image');
        }
        if (Array.isArray(grounding.verified_functional_facts) && grounding.verified_functional_facts.length > 0) {
          setProductFactsText(grounding.verified_functional_facts.join('\n'));
          setFactsSource('extracted_from_image');
        } else if (Array.isArray(grounding.observable_details) && grounding.observable_details.length > 0) {
          setProductFactsText(grounding.observable_details.slice(0, 2).join('\n'));
          setFactsSource('extracted_from_image');
        }
        if (Array.isArray(grounding.observable_details) && grounding.observable_details.length > 0) {
          setVisibleDetailsText(grounding.observable_details.join('\n'));
          setDetailsSource('extracted_from_image');
        }
      }

      setPipelineStatus('ANALYZED');
      setActiveLayerTab('grounding');
    } catch (err: any) {
      console.error('Grounding Analysis Error:', err);
      const isAborted = isAbortError(err);
      const isTimeout = isTimeoutError(err);
      
      let errMsg = err.message || 'Erro ao analisar a imagem do produto.';
      if (isAborted) {
        errMsg = 'Análise cancelada. Clique em "Analisar Imagem" para tentar novamente.';
      } else if (isTimeout) {
        errMsg = 'Tempo limite esgotado. Verifique a conexão e tente novamente.';
      }

      setErrorMessage(errMsg);
      setPipelineStatus(isAborted ? 'IDLE' : 'ERROR');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Field change handlers that detect and set 'manual_override' and invalidate stale compilations
  const handleProductNameChange = (val: string) => {
    setProductName(val);
    setProductNameSource(groundingResult ? 'manual_override' : 'user_provided');
    invalidateCompiledOutput();
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    setCategorySource(groundingResult ? 'manual_override' : 'user_provided');
    invalidateCompiledOutput();
  };

  const handleQuantityChange = (val: string) => {
    setProductQuantity(val);
    setQuantitySource(groundingResult ? 'manual_override' : 'user_provided');
    invalidateCompiledOutput();
  };

  const handleFactsChange = (val: string) => {
    setProductFactsText(val);
    setFactsSource(groundingResult ? 'manual_override' : 'user_provided');
    invalidateCompiledOutput();
  };

  const handleDetailsChange = (val: string) => {
    setVisibleDetailsText(val);
    setDetailsSource(groundingResult ? 'manual_override' : 'user_provided');
    invalidateCompiledOutput();
  };

  const handlePrimaryBenefitChange = (val: string) => {
    setPrimaryBenefit(val);
    invalidateCompiledOutput();
  };

  const handlePresenterGenderChange = (val: 'female' | 'male') => {
    setPresenterGender(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, presenterGender: 'manual' }));
    invalidateCompiledOutput();
  };

  const handlePresenterDescChange = (val: string) => {
    setPresenterDesc(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, presenterDescription: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleTopTypeChange = (val: string) => {
    setTopType(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, topType: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleTopStyleChange = (val: string) => {
    setTopStyle(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, topStyle: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleTopColorChange = (val: string) => {
    setTopColor(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, topColor: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleBottomTypeChange = (val: string) => {
    setBottomType(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, bottomType: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleBottomColorChange = (val: string) => {
    setBottomColor(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, bottomColor: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleFootwearTypeChange = (val: string) => {
    setFootwearType(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, footwearType: 'manual' }));
    invalidateCompiledOutput();
  };

  const handleFootwearColorChange = (val: string) => {
    setFootwearColor(val);
    setWardrobeFieldOrigins(prev => ({ ...prev, footwearColor: 'manual' }));
    invalidateCompiledOutput();
  };

  // Apply a preset (loads pre-grounded fixtures)
  const handleSelectPreset = (preset: 'towels' | 'watch' | 'cookware' | 'custom') => {
    setSelectedPreset(preset);
    setErrorMessage(null);

    let presetData: Scene2DynamicSlots | null = null;
    let presetCat = '';

    if (preset === 'towels') {
      presetData = BATH_TOWELS_PRESET;
      presetCat = 'Casa, Banho & Decoração';
    } else if (preset === 'watch') {
      presetData = WRISTWATCH_PRESET;
      presetCat = 'Relógios & Acessórios';
    } else if (preset === 'cookware') {
      presetData = COOKWARE_PRESET;
      presetCat = 'Cozinha & Utilidades';
    }

    if (presetData) {
      setProductName(presetData.productIdentity || '');
      setCategory(presetCat);
      setPrimaryBenefit(presetData.primaryBenefit || '');
      setProductQuantity(presetData.productQuantity || '');
      setProductFactsText((presetData.productFacts || []).join('\n'));
      setVisibleDetailsText((presetData.productVisibleDetails || []).join('\n'));
      setPresenterGender(presetData.presenter?.gender || 'female');
      setPresenterDesc(presetData.presenter?.description || '');
      setTopType(presetData.wardrobe?.topType || '');
      setTopStyle(presetData.wardrobe?.topStyle || '');
      setTopColor(presetData.wardrobe?.topColor || '');
      setBottomType(presetData.wardrobe?.bottomType || '');
      setBottomColor(presetData.wardrobe?.bottomColor || '');
      setFootwearType(presetData.wardrobe?.footwearType || '');
      setFootwearColor(presetData.wardrobe?.footwearColor || '');

      setWardrobeFieldOrigins({
        presenterGender: 'default',
        topType: 'default',
        topColor: 'default',
        topStyle: 'default',
        bottomType: 'default',
        bottomColor: 'default',
        footwearType: 'default',
        footwearColor: 'default',
        presenterDescription: 'default'
      });

      setProductNameSource('user_provided');
      setCategorySource('user_provided');
      setQuantitySource('user_provided');
      setFactsSource('user_provided');
      setDetailsSource('user_provided');

      try {
        const model = buildCompiledScene2Model(presetData);
        const compiledPrompt = renderScene2Text(model);
        const compiledJson = renderScene2Json(model);
        const compiledJsonString = renderScene2JsonString(model);
        const presetResult: Scene2PipelineResult = {
          dynamicSlots: presetData,
          compiledModel: model,
          compiledPrompt,
          compiledJson,
          compiledJsonString,
          diagnosticTrace: {
            timestamp: new Date().toISOString(),
            productFacts: presetData.productFacts || [],
            primaryBenefit: presetData.primaryBenefit || '',
            copyBrainOutput: {
              dominant_fact: presetData.productFacts?.[0] || '',
              real_function: 'demonstração prática',
              consumer_gain: presetData.primaryBenefit || '',
              practical_result: presetData.primaryBenefit || '',
              compatible_context: presetData.environment || '',
              spoken_copy: presetData.spokenCopy || '',
              spokenCopy: presetData.spokenCopy || '',
              verifiedFactUsed: presetData.productFacts?.[0] || ''
            },
            sceneBrainSlots: {
              environment: presetData.environment || '',
              actions: presetData.actions || {
                action0to2: '',
                action2to4: '',
                action4to6: '',
                action6to8: ''
              },
              speechActionSync: presetData.speechActionSync || []
            },
            wardrobeContract: {
              userWardrobe: presetData.wardrobe,
              avatarIdentityPriorityEnforced: true,
              resolvedWardrobeContract: model.presenter.resolvedWardrobeContract,
              wardrobeConsistencyLock: model.presenter.wardrobeConsistencyLock
            },
            compiledPrompt,
            compiledJson,
            executionTimeMs: 1,
            totalCalls: 0
          }
        };
        setResult(presetResult);
        setPipelineStatus('COMPILED');
        const snapshot = buildSnapshotFromResult(presetResult, groundingResult, activeLayerTab, outputFormat, 'compiled');
        onCompilerSnapshotChange?.(snapshot);
      } catch (e: any) {
        console.warn('Preset compilation error:', e);
      }
    } else if (preset === 'custom') {
      if (defaultProductName) setProductName(defaultProductName);
      if (defaultCategory) setCategory(defaultCategory);
      if (Array.isArray(detectedFacts) && detectedFacts.length > 0) {
        setProductFactsText(detectedFacts.join('\n'));
      }
      if (Array.isArray(detectedVisibleDetails) && detectedVisibleDetails.length > 0) {
        setVisibleDetailsText(detectedVisibleDetails.join('\n'));
      }
      invalidateCompiledOutput();
    }
  };

  // Run the full AI + Compiler Pipeline
  const handleRunPipeline = async () => {
    // Mode Guard: If in image mode and not analyzed yet, disallow empty -> compiled
    if (sourceMode === 'image' && !groundingResult && !productFactsText.trim()) {
      setErrorMessage('Por favor, envie a imagem e clique em "Analisar Produto" antes de compilar.');
      return;
    }

    setLoading(true);
    setPipelineStatus('COMPILING');
    setErrorMessage(null);

    try {
      const facts = productFactsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      const visibleDetails = visibleDetailsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      if (!productName.trim()) {
        throw new Error('Insira o nome do produto ou analise uma imagem de referência.');
      }
      if (facts.length === 0) {
        throw new Error('Insira ao menos um fato verificável do produto no campo de Fatos.');
      }
      if (visibleDetails.length === 0) {
        throw new Error('Insira ao menos um detalhe visível observado no produto.');
      }

      const resolvedContract = resolveWardrobeContract({
        wardrobeForm: {
          presenterGender,
          topType,
          topColor,
          topStyle,
          bottomType,
          bottomColor,
          footwearType,
          footwearColor,
          presenterDescription: presenterDesc
        },
        fieldOrigins: wardrobeFieldOrigins
      });

      const wardrobeLock = buildWardrobeConsistencyLock(resolvedContract);

      const presenter: Scene2Presenter = {
        gender: presenterGender,
        description: resolvedContract.presenterDescription || presenterDesc.trim() || `Adult Brazilian ${presenterGender === 'female' ? 'woman' : 'man'} with natural expressive posture`
      };

      const wardrobe: Scene2Wardrobe = {
        topType: resolvedContract.topType || 'basic plain t-shirt',
        topStyle: resolvedContract.topStyle || undefined,
        topColor: resolvedContract.topColor || 'white',
        bottomType: resolvedContract.bottomType || 'basic jeans',
        bottomColor: resolvedContract.bottomColor || 'medium wash blue',
        footwearType: resolvedContract.footwearType || 'plain sneakers',
        footwearColor: resolvedContract.footwearColor || 'white'
      };

      const pipelineOutput = await runScene2CompilerPipeline(
        {
          productName: productName.trim(),
          category: category.trim() || 'Geral',
          productFacts: facts,
          productVisibleDetails: visibleDetails,
          productQuantity: productQuantity.trim() || undefined,
          primaryBenefit: primaryBenefit.trim(),
          presenter,
          wardrobe,
          resolvedWardrobeContract: resolvedContract,
          wardrobeConsistencyLock: wardrobeLock,
          groundingResult: groundingResult || undefined
        },
        currentKey
      );

      setResult(pipelineOutput);
      setPipelineStatus('COMPILED');
      setActiveLayerTab('compiled');
      const snapshot = buildSnapshotFromResult(pipelineOutput, groundingResult, 'compiled', outputFormat, 'compiled');
      onCompilerSnapshotChange?.(snapshot);
    } catch (err: any) {
      console.error('Scene 2 Pipeline Error:', err);
      setErrorMessage(err.message || 'Erro ao executar o pipeline de compilação da Cena 2.');
      setPipelineStatus('ERROR');
    } finally {
      setLoading(false);
    }
  };

  const handleLayerTabChange = (tab: 'compiled' | 'grounding' | 'copy_brain' | 'scene_brain' | 'slots' | 'tests') => {
    setActiveLayerTab(tab);
    if (result) {
      onCompilerSnapshotChange?.(buildSnapshotFromResult(result, groundingResult, tab, outputFormat, 'compiled'));
    }
  };

  const handleOutputFormatChange = (format: 'prompt' | 'json') => {
    setOutputFormat(format);
    if (result) {
      onCompilerSnapshotChange?.(buildSnapshotFromResult(result, groundingResult, activeLayerTab, format, 'compiled'));
    }
  };

  /**
   * INDEPENDENT STRICT CLIPBOARD HANDLERS
   * Guarantees that each button copies ONLY its intended serialization.
   */
  const handleCopyPromptOnly = () => {
    if (!result?.compiledPrompt) return;
    copyToClipboard(result.compiledPrompt);
    setCopyStatus('✓ Prompt textual copiado para a área de transferência!');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const handleCopyJsonOnly = () => {
    if (!result?.compiledJsonString) return;
    copyToClipboard(result.compiledJsonString);
    setCopyStatus('✓ JSON estruturado copiado para a área de transferência!');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  // Compute Diagnostic Step Statuses
  const imageStepStatus: DiagnosticStepStatus = productImage ? 'PASS' : (sourceMode === 'manual' ? 'WARNING' : 'PENDING');
  const groundingStepStatus: DiagnosticStepStatus = analyzingImage
    ? 'RUNNING'
    : groundingResult
    ? 'PASS'
    : productFactsText.trim()
    ? 'PASS'
    : 'PENDING';
  const copyBrainStepStatus: DiagnosticStepStatus = loading
    ? 'RUNNING'
    : result?.diagnosticTrace?.copyBrainOutput
    ? 'PASS'
    : 'PENDING';
  const sceneBrainStepStatus: DiagnosticStepStatus = loading
    ? 'RUNNING'
    : result?.diagnosticTrace?.sceneBrainSlots
    ? 'PASS'
    : 'PENDING';
  const compilerStepStatus: DiagnosticStepStatus = result?.compiledPrompt ? 'PASS' : 'PENDING';

  const renderStepBadge = (label: string, status: DiagnosticStepStatus) => {
    let colorClass = 'bg-slate-900 text-slate-500 border-slate-800';
    let icon = 'circle';

    if (status === 'PASS') {
      colorClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 shadow-sm';
      icon = 'check-circle-2';
    } else if (status === 'RUNNING') {
      colorClass = 'bg-indigo-950/90 text-indigo-300 border-indigo-500 animate-pulse';
      icon = 'loader-2';
    } else if (status === 'WARNING') {
      colorClass = 'bg-amber-950/70 text-amber-300 border-amber-700/60';
      icon = 'alert-triangle';
    } else if (status === 'ERROR') {
      colorClass = 'bg-rose-950/70 text-rose-300 border-rose-700/60';
      icon = 'x-circle';
    }

    return (
      <div className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 transition-all ${colorClass}`}>
        <LucideIcon name={icon} className={`w-3.5 h-3.5 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
        <span className="font-bold tracking-tight">{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans animate-fade-in">
      {/* HIDDEN FILE INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* HEADER BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase tracking-wide">
              Contrato Arquitetural P0 Homologado
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Phase 1.2A — Factual Grounding
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Scene 2 Prompt Compiler Engine
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Upload da imagem de referência → Análise Factual Objetiva → Copy Brain C2 → Scene Brain C2 → Template Base Imutável.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40 flex items-center gap-1.5">
            <LucideIcon name="shield-check" className="w-4 h-4 text-emerald-400" />
            Factual Grounding Ativo
          </span>
        </div>
      </div>

      {/* VISUAL DIAGNOSTIC STEPPER */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono font-semibold">
          <LucideIcon name="git-commit" className="w-4 h-4 text-indigo-400" />
          <span>Pipeline:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {renderStepBadge('1. PRODUCT IMAGE', imageStepStatus)}
          <span className="text-slate-600 text-xs font-mono">→</span>
          {renderStepBadge('2. FACTUAL GROUNDING', groundingStepStatus)}
          <span className="text-slate-600 text-xs font-mono">→</span>
          {renderStepBadge('3. COPY BRAIN C2', copyBrainStepStatus)}
          <span className="text-slate-600 text-xs font-mono">→</span>
          {renderStepBadge('4. SCENE BRAIN C2', sceneBrainStepStatus)}
          <span className="text-slate-600 text-xs font-mono">→</span>
          {renderStepBadge('5. PROMPT COMPILER', compilerStepStatus)}
        </div>
      </div>

      {/* PRESET SELECTOR & A/B COMPARISON */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 font-mono uppercase">Presets de Teste:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleSelectPreset('towels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPreset === 'towels'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>🚿</span> Toalhas de Banho (Test A)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('watch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPreset === 'watch'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>⌚</span> Relógio Cronógrafo (Test B)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('cookware')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPreset === 'cookware'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>🍳</span> Frigideira Cerâmica (Test C)
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                selectedPreset === 'custom'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>⚙️</span> Customizado / Vazio
            </button>
          </div>
        </div>

        {/* MODE TOGGLE */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <label className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer select-none text-slate-300">
            <input
              type="radio"
              name="sourceMode"
              checked={sourceMode === 'image'}
              onChange={() => setSourceMode('image')}
              className="accent-indigo-500"
            />
            <span className="font-semibold text-xs">Analisar Imagem (Principal)</span>
          </label>
          <label className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer select-none text-slate-400 hover:text-slate-200">
            <input
              type="radio"
              name="sourceMode"
              checked={sourceMode === 'manual'}
              onChange={() => setSourceMode('manual')}
              className="accent-indigo-500"
            />
            <span className="text-xs">Preenchimento Manual</span>
          </label>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
          <LucideIcon name="alert-circle" className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {copyStatus && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2 animate-fade-in">
          <LucideIcon name="check" className="w-4 h-4 text-emerald-400" />
          <span>{copyStatus}</span>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMN 1: INPUT CONTROLLER (5 SECTIONS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* SECTION 1: PRODUTO DE REFERÊNCIA (IMAGE UPLOAD & ANALYSIS) */}
          <Card className="bg-slate-900/80 border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <LucideIcon name="image" className="w-4 h-4 text-indigo-400" />
                1. Produto de Referência
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Visual Grounding</span>
            </div>

            {sourceMode === 'image' ? (
              <div className="space-y-3">
                {productImage ? (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={productImage}
                          alt="Produto de Referência"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white truncate block">
                          {productImageName || 'Imagem do Produto Carregada'}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono block">
                          Fonte visual exclusiva para o produto
                        </span>
                        {groundingResult && (
                          <span className="text-[10px] text-emerald-400 font-mono mt-1 inline-flex items-center gap-1">
                            <LucideIcon name="check" className="w-3 h-3" /> Fatos extraídos com sucesso
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAnalyzeImage}
                        disabled={analyzingImage}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {analyzingImage ? (
                          <>
                            <LucideIcon name="loader-2" className="w-3.5 h-3.5 animate-spin" />
                            Analisando Fatos...
                          </>
                        ) : (
                          <>
                            <LucideIcon name="scan" className="w-3.5 h-3.5" />
                            {groundingResult ? 'Analisar Novamente' : 'Analisar Produto'}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        disabled={analyzingImage}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition cursor-pointer"
                        title="Substituir imagem"
                      >
                        <LucideIcon name="refresh-cw" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={analyzingImage}
                        className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-lg text-xs font-medium transition cursor-pointer"
                        title="Remover imagem"
                      >
                        <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleTriggerUpload}
                    className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition space-y-2 group ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-slate-700 hover:border-indigo-500 bg-slate-950/50 hover:bg-indigo-950/20'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LucideIcon name="upload-cloud" className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">
                        + Enviar imagem do produto
                      </span>
                      <p className="text-[11px] text-indigo-400 font-mono mt-0.5">
                        CTRL+V / CMD+V para colar
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        PNG, JPG, JPEG ou WEBP (Arrastar ou clicar)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Modo de Preenchimento Manual Ativo</span>
                <p>Os fatos e detalhes observáveis devem ser fornecidos diretamente nos campos abaixo.</p>
              </div>
            )}
          </Card>

          {/* SECTION 2: GROUNDING FACTUAL */}
          <Card className="bg-slate-900/80 border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <LucideIcon name="database" className="w-4 h-4" />
                2. Grounding Factual
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Fatos Verificados</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">Identidade do Produto</label>
                  {renderSourceBadge(productNameSource)}
                </div>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  placeholder="Ex: Kit Toalhas Imperial 500g/m²"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-semibold">Categoria</label>
                    {renderSourceBadge(categorySource)}
                  </div>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    placeholder="Ex: Casa e Banho"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-semibold">Qtd. Observável</label>
                    {renderSourceBadge(quantitySource)}
                  </div>
                  <input
                    type="text"
                    value={productQuantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="Ex: 3 peças"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">Fatos Verificáveis do Produto (1 por linha)</label>
                  {renderSourceBadge(factsSource)}
                </div>
                <textarea
                  rows={3}
                  value={productFactsText}
                  onChange={(e) => handleFactsChange(e.target.value)}
                  placeholder="Insira fatos verificados (ex: Algodão 100%, 500g/m²)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-[11px] outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">Detalhes Visuais Observáveis (1 por linha)</label>
                  {renderSourceBadge(detailsSource)}
                </div>
                <textarea
                  rows={2}
                  value={visibleDetailsText}
                  onChange={(e) => handleDetailsChange(e.target.value)}
                  placeholder="Detalhes observados (ex: Textura felpuda, tom cinza chumbo)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono text-[11px] outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </Card>

          {/* SECTION 3: BENEFÍCIO / OVERRIDE */}
          <Card className="bg-slate-900/80 border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <LucideIcon name="zap" className="w-4 h-4" />
                3. Benefício Principal / Override
              </span>
              <span className="text-[10px] text-slate-400 font-mono">User Verified Gain</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="block text-slate-400 font-semibold">
                  Benefício Principal Prático <span className="text-slate-500 font-normal">(Opcional)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Auto se vazio</span>
              </div>
              <input
                type="text"
                value={primaryBenefit}
                onChange={(e) => handlePrimaryBenefitChange(e.target.value)}
                placeholder="Ex: Secagem instantânea sem deixar a toalha úmida no banheiro"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition text-xs"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Se não for informado ou for estético, o Copy Brain C2 ancora o benefício diretamente nos fatos técnicos e funcionais comprovados do produto.
              </p>
            </div>
          </Card>

          {/* SECTION 4: FIGURINO (WARDROBE PRIORITY) */}
          <Card className="bg-slate-900/80 border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold font-mono text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <LucideIcon name="shirt" className="w-4 h-4" />
                4. Contrato de Figurino (Wardrobe Priority)
              </span>
              <span className="text-[9px] bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-800/40 font-mono">
                User Wardrobe &gt; Avatar Image
              </span>
            </div>

            <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-[10px] text-slate-300">
              <p className="text-slate-400">
                {SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE}
              </p>
            </div>

            {/* FONTE DO FIGURINO SELECTOR */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LucideIcon name="user-check" className="w-3.5 h-3.5 text-purple-400" />
                  Fonte do Figurino
                </span>
                {wardrobeSourceMode === 'identity_hub' && selectedWardrobeAvatarId && availableAvatars.some(a => String(a.id) === String(selectedWardrobeAvatarId)) && (
                  <span className="text-[10px] font-normal text-purple-300 font-mono">
                    Referência vinculada
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWardrobeSourceMode('manual')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    wardrobeSourceMode === 'manual'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <LucideIcon name="edit-3" className="w-3.5 h-3.5" />
                  Preencher Manualmente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWardrobeSourceMode('identity_hub');
                    if (!selectedWardrobeAvatarId && availableAvatars.length > 0) {
                      setSelectedWardrobeAvatarId(availableAvatars[0].id);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    wardrobeSourceMode === 'identity_hub'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-purple-400" />
                  Usar Avatar do Identity Hub
                </button>
              </div>
            </div>

            {/* IDENTITY HUB AVATAR PICKER & SELECTED AVATAR CARD */}
            {wardrobeSourceMode === 'identity_hub' && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-900/40 space-y-3">
                {availableAvatars.length === 0 ? (
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-center space-y-1">
                    <p className="text-xs text-slate-300 font-medium">Nenhum avatar encontrado no Identity Hub</p>
                    <p className="text-[10px] text-slate-500">
                      Crie ou importe avatares na aba <strong>Identity Hub</strong> para utilizá-los como referência visual de figurino.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono block">
                        Avatares do Identity Hub ({availableAvatars.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availableAvatars.map((avatar) => {
                          const isSelected = String(avatar.id) === String(selectedWardrobeAvatarId);
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => handleSelectWardrobeAvatar(avatar.id)}
                              className={`relative group p-1.5 rounded-lg border text-left transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-500 shadow-md shadow-purple-950/50'
                                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                              }`}
                            >
                              <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                                {avatar.image ? (
                                  <img src={avatar.image} alt={avatar.name} className="w-full h-full object-cover" />
                                ) : (
                                  <LucideIcon name="user" className="w-5 h-5 text-slate-600" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-200 font-medium truncate max-w-full text-center">
                                {avatar.name || 'Avatar'}
                              </span>
                              {isSelected && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-purple-950" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* SELECTED AVATAR REFERENCE CARD & STAGE 2 VISION DETECTION */}
                    {(() => {
                      const selectedAvatar = availableAvatars.find(a => String(a.id) === String(selectedWardrobeAvatarId));
                      if (!selectedAvatar) return null;

                      const isExtracting = wardrobeExtractionStatus === 'loading';
                      const hasDetectedForThisAvatar =
                        detectedWardrobeProfile &&
                        String(detectedWardrobeAvatarId) === String(selectedAvatar.id);

                      return (
                        <div className="space-y-2.5">
                          <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-950 border border-purple-700/50 flex-shrink-0">
                                {selectedAvatar.image ? (
                                  <img src={selectedAvatar.image} alt={selectedAvatar.name} className="w-full h-full object-cover" />
                                ) : (
                                  <LucideIcon name="user" className="w-5 h-5 text-slate-600 m-auto" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] uppercase tracking-wider font-mono text-purple-400 block font-semibold">
                                  Avatar Selecionado
                                </span>
                                <p className="text-xs font-semibold text-slate-100 truncate">
                                  {selectedAvatar.name || 'Avatar'}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleExtractWardrobeFromAvatar}
                              disabled={isExtracting}
                              className="px-2.5 py-1.5 bg-purple-900/60 hover:bg-purple-800/80 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-600/50 rounded-lg text-[11px] font-medium text-purple-100 flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer shadow-sm shadow-purple-950"
                            >
                              {isExtracting ? (
                                <>
                                  <LucideIcon name="loader-2" className="w-3.5 h-3.5 text-purple-300 animate-spin" />
                                  <span>Analisando Figurino...</span>
                                </>
                              ) : hasDetectedForThisAvatar ? (
                                <>
                                  <LucideIcon name="refresh-cw" className="w-3 h-3 text-purple-300" />
                                  <span>Extrair Novamente</span>
                                </>
                              ) : (
                                <>
                                  <LucideIcon name="sparkles" className="w-3 h-3 text-purple-300" />
                                  <span>Extrair Figurino do Avatar</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Error feedback */}
                          {wardrobeExtractionStatus === 'error' && wardrobeExtractionError && (
                            <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-2 text-red-200 text-xs">
                              <LucideIcon name="alert-circle" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold block text-[11px] text-red-300">Erro na Análise do Figurino</span>
                                <p className="text-[10px] text-red-200/90">{wardrobeExtractionError}</p>
                              </div>
                            </div>
                          )}

                          {/* DETECTED WARDROBE PREVIEW PANEL (Requirement 8) */}
                          {hasDetectedForThisAvatar && (
                            <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-700/40 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-purple-800/30 pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="text-xs font-semibold text-purple-200">Figurino Detectado</span>
                                </div>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 font-medium">
                                  Detectado pela IA — ainda não aplicado
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {detectedWardrobeProfile.presenterGender && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Gênero</span>
                                    <span className="text-slate-200 font-medium">
                                      {detectedWardrobeProfile.presenterGender === 'female'
                                        ? 'Feminino (Mulher)'
                                        : detectedWardrobeProfile.presenterGender === 'male'
                                        ? 'Masculino (Homem)'
                                        : detectedWardrobeProfile.presenterGender}
                                    </span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.topType && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Parte Superior</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.topType}</span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.topColor && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Cor Superior</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.topColor}</span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.topStyle && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Estilo</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.topStyle}</span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.bottomType && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Parte Inferior</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.bottomType}</span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.bottomColor && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Cor Inferior</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.bottomColor}</span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.footwearType && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Calçado</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.footwearType}</span>
                                  </div>
                                )}
                                {detectedWardrobeProfile.footwearColor && (
                                  <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30">
                                    <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Cor Calçado</span>
                                    <span className="text-slate-200 font-medium">{detectedWardrobeProfile.footwearColor}</span>
                                  </div>
                                )}
                              </div>

                              {detectedWardrobeProfile.accessories && detectedWardrobeProfile.accessories.length > 0 && (
                                <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30 text-[11px]">
                                  <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Acessórios Visíveis</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {detectedWardrobeProfile.accessories.map((acc, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-200 text-[10px] border border-purple-800/40">
                                        {acc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {detectedWardrobeProfile.presenterDescription && (
                                <div className="p-1.5 rounded bg-slate-950/60 border border-purple-900/30 text-[11px]">
                                  <span className="text-[9px] uppercase font-mono text-purple-400 block font-medium">Descrição Visual Neutra</span>
                                  <p className="text-slate-300 text-[10px] mt-0.5 leading-relaxed">
                                    {detectedWardrobeProfile.presenterDescription}
                                  </p>
                                </div>
                              )}

                              {/* STAGE 3: EXPLICIT APPLY ACTION */}
                              <div className="pt-2.5 border-t border-purple-800/30 flex items-center justify-between gap-3">
                                <span className="text-[10px] text-purple-300/80">
                                  Substitui apenas campos detectados com valores visíveis
                                </span>
                                <button
                                  type="button"
                                  onClick={handleApplyDetectedWardrobe}
                                  disabled={
                                    !detectedWardrobeProfile ||
                                    String(detectedWardrobeAvatarId) !== String(selectedAvatar.id) ||
                                    wardrobeExtractionStatus !== 'success'
                                  }
                                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold rounded-lg shadow-sm shadow-purple-950 flex items-center gap-1.5 transition cursor-pointer flex-shrink-0"
                                >
                                  <LucideIcon name="check" className="w-3.5 h-3.5 text-white" />
                                  <span>Aplicar Figurino Detectado</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* STAGE 3: APPLY CONFIRMATION FEEDBACK */}
                          {wardrobeApplyFeedback && (
                            <div className="p-2.5 bg-emerald-950/50 border border-emerald-700/60 rounded-lg flex items-center gap-2 text-emerald-200 text-xs">
                              <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span className="font-medium text-emerald-300">{wardrobeApplyFeedback}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Gênero Apresentador</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.presenterGender)}
                  </div>
                  <select
                    value={presenterGender}
                    onChange={(e) => handlePresenterGenderChange(e.target.value as 'female' | 'male')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  >
                    <option value="female">Feminino (Mulher Brasileira)</option>
                    <option value="male">Masculino (Homem Brasileiro)</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Parte Superior (Top Type)</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.topType)}
                  </div>
                  <input
                    type="text"
                    value={topType}
                    onChange={(e) => handleTopTypeChange(e.target.value)}
                    placeholder="ex: basic plain t-shirt"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Cor Parte Superior</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.topColor)}
                  </div>
                  <input
                    type="text"
                    value={topColor}
                    onChange={(e) => handleTopColorChange(e.target.value)}
                    placeholder="ex: white, navy blue"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Estilo (Top Style)</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.topStyle)}
                  </div>
                  <input
                    type="text"
                    value={topStyle}
                    onChange={(e) => handleTopStyleChange(e.target.value)}
                    placeholder="ex: crew neck, polo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Parte Inferior (Bottom Type)</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.bottomType)}
                  </div>
                  <input
                    type="text"
                    value={bottomType}
                    onChange={(e) => handleBottomTypeChange(e.target.value)}
                    placeholder="ex: basic jeans"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Cor Parte Inferior</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.bottomColor)}
                  </div>
                  <input
                    type="text"
                    value={bottomColor}
                    onChange={(e) => handleBottomColorChange(e.target.value)}
                    placeholder="ex: medium wash blue"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Calçado (Footwear)</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.footwearType)}
                  </div>
                  <input
                    type="text"
                    value={footwearType}
                    onChange={(e) => handleFootwearTypeChange(e.target.value)}
                    placeholder="ex: plain sneakers"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Cor Calçado</label>
                    {renderWardrobeOriginBadge(wardrobeFieldOrigins.footwearColor)}
                  </div>
                  <input
                    type="text"
                    value={footwearColor}
                    onChange={(e) => handleFootwearColorChange(e.target.value)}
                    placeholder="ex: white, black"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-semibold">Descrição do Apresentador (Traços Identitários)</label>
                  {renderWardrobeOriginBadge(wardrobeFieldOrigins.presenterDescription)}
                </div>
                <input
                  type="text"
                  value={presenterDesc}
                  onChange={(e) => handlePresenterDescChange(e.target.value)}
                  placeholder="ex: Adult Brazilian woman with natural wavy hair"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500 transition text-xs"
                />
              </div>
            </div>
          </Card>

          {/* SECTION 5: EXECUÇÃO */}
          <Card className="bg-slate-900/80 border-slate-800 p-4 space-y-2 shadow-lg">
            <button
              type="button"
              onClick={handleRunPipeline}
              disabled={loading || analyzingImage}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-600 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold font-sans rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LucideIcon name="loader-2" className="w-4 h-4 animate-spin" />
                  <span>Compilando Cena 2 (Copy Brain + Scene Brain + Base Template)...</span>
                </>
              ) : (
                <>
                  <LucideIcon name="sparkles" className="w-4 h-4 text-amber-300" />
                  <span>5. Executar Pipeline Completo da Cena 2</span>
                </>
              )}
            </button>
          </Card>

          {/* SECTION 6: CTA CENA 3 — HUB DE GERAÇÃO */}
          <Card className="bg-slate-900/80 border-slate-800 p-4 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <LucideIcon name="sparkles" className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wide">
                  6. CTA CENA 3 — HUB DE GERAÇÃO
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {ctaHandoff?.cta && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 flex items-center gap-1">
                    <LucideIcon name="check" className="w-3 h-3 text-cyan-400" />
                    CTA Cena 3 Ativa
                  </span>
                )}
              </div>
            </div>

            {/* CTA QUANTITY SELECTOR ([1 CTA] [2 CTAs] [3 CTAs]) */}
            <div id="scene3-cta-hub-selector" className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <LucideIcon name="sliders" className="w-3.5 h-3.5 text-cyan-400" />
                  Seletor de Quantidade
                </span>
                <span className="text-cyan-400 font-bold">
                  {ctaQuantity === 1 && '1 CTA (1 chamada IA)'}
                  {ctaQuantity === 2 && '2 CTAs (1 chamada IA)'}
                  {ctaQuantity === 3 && '3 CTAs (1 chamada IA)'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {([
                  { qty: 1 as Scene3CtaHubQuantity, label: '1 CTA', desc: '1 Variação C3' },
                  { qty: 2 as Scene3CtaHubQuantity, label: '2 CTAs', desc: '2 Variações C3' },
                  { qty: 3 as Scene3CtaHubQuantity, label: '3 CTAs', desc: '3 Variações C3' }
                ]).map(({ qty, label, desc }) => {
                  const isSelected = ctaQuantity === qty;
                  return (
                    <button
                      key={qty}
                      id={`scene3-cta-btn-${qty}`}
                      type="button"
                      disabled={isGeneratingCtas || loading}
                      onClick={() => setCtaQuantity(qty)}
                      className={`py-2 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50 scale-[1.02]'
                          : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-800/80'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="text-xs font-black">{label}</span>
                      <span className="text-[9px] opacity-80 uppercase tracking-tighter">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GENERATE BUTTON */}
            <button
              type="button"
              id="scene3-cta-hub-generate-btn"
              onClick={handleGenerateCtas}
              disabled={isGeneratingCtas || loading}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold font-sans rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingCtas ? (
                <>
                  <LucideIcon name="loader-2" className="w-4 h-4 animate-spin" />
                  <span>
                    {ctaQuantity === 1 && 'Gerando 1 CTA para Cena 3 (1 chamada IA)...'}
                    {ctaQuantity === 2 && 'Gerando 2 CTAs para Cena 3 (1 chamada IA)...'}
                    {ctaQuantity === 3 && 'Gerando 3 CTAs para Cena 3 (1 chamada IA)...'}
                  </span>
                </>
              ) : (
                <>
                  <LucideIcon name="sparkles" className="w-4 h-4 text-cyan-300" />
                  <span>
                    {ctaQuantity === 1 && (ctaVariations.length > 0 ? 'Regerar 1 CTA (Cena 3)' : 'Gerar 1 CTA (Cena 3)')}
                    {ctaQuantity === 2 && (ctaVariations.length > 0 ? 'Regerar 2 CTAs (Cena 3)' : 'Gerar 2 CTAs (Cena 3)')}
                    {ctaQuantity === 3 && (ctaVariations.length > 0 ? 'Regerar 3 CTAs (Cena 3)' : 'Gerar 3 CTAs (Cena 3)')}
                  </span>
                </>
              )}
            </button>

            {/* ERROR NOTIFICATION */}
            {ctaGenerationError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] font-mono rounded-lg flex items-start gap-2 animate-fade-in">
                <LucideIcon name="alert-circle" className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">{ctaGenerationError}</span>
                </div>
              </div>
            )}

            {/* SUCCESS BANNER */}
            {ctaSuccessMsg && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[11px] font-mono rounded-lg flex items-center gap-2 animate-fade-in">
                <LucideIcon name="check-circle-2" className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{ctaSuccessMsg}</span>
              </div>
            )}

            {/* GENERATED CTAS LIST */}
            {ctaVariations.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                  <span>Variações de CTA Geradas:</span>
                  <span className="text-cyan-400 font-bold">{ctaVariations.length} {ctaVariations.length === 1 ? 'CTA' : 'CTAs'}</span>
                </div>

                <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {ctaVariations.map((variation) => {
                    const isCtaActive = Boolean(variation.text && ctaHandoff?.cta === variation.text);
                    const validation = validateCopyContract(variation.text);
                    const actionError = ctaActionErrors[variation.id];
                    const hasSemanticError = variation.semanticEvidenceValid === false && (variation.semanticViolations?.length || 0) > 0;
                    const isFullyValid = validation.valid && !hasSemanticError;

                    return (
                      <div
                        key={variation.id}
                        id={`scene3-cta-variation-${variation.variationIndex}`}
                        className={`p-3.5 rounded-xl border transition-all text-xs space-y-3 bg-slate-950/80 ${
                          isCtaActive
                            ? 'border-cyan-500/80 shadow-lg ring-1 ring-cyan-500/30'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* CTA HEADER */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                              CTA {variation.variationIndex}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate max-w-[220px]">
                              Variação {variation.variationIndex}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] font-mono">
                            {isCtaActive && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1">
                                <LucideIcon name="check" className="w-3 h-3 text-emerald-400" />
                                Cena 3 Ativa
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA TEXT & CONTRACT STATUS */}
                        <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                              <LucideIcon name="send" className="w-3.5 h-3.5 text-cyan-400" />
                              FALA DA CENA 3
                            </span>
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${
                              isFullyValid
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                : 'bg-rose-950/80 text-rose-300 border-rose-800'
                            }`}>
                              {validation.charCount} ch {isFullyValid ? '• Válida' : '• Inválida'}
                            </span>
                          </div>

                          <p className="text-xs font-mono text-cyan-100 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800/80">
                            "{variation.text}"
                          </p>

                          {/* DIAGNOSTIC ERROR IF INVALID */}
                          {((!isFullyValid) || actionError) && (
                            <div className="text-[10px] font-mono text-rose-300 bg-rose-950/50 p-2.5 rounded border border-rose-800/80 space-y-1.5 animate-fade-in">
                              {!validation.valid && (
                                <div className="space-y-0.5">
                                  <div className="font-bold flex items-center gap-1 text-rose-400">
                                    <LucideIcon name="alert-circle" className="w-3 h-3 text-rose-400" />
                                    ✕ Copy inválida ({validation.charCount} ch / esperado: 160–175 ch)
                                  </div>
                                  {validation.errors.map((err, i) => (
                                    <div key={i} className="text-rose-400/90">• {err}</div>
                                  ))}
                                </div>
                              )}
                              {actionError && <div className="text-rose-400 font-bold">• {actionError}</div>}
                              {variation.semanticViolations?.map((violation, i) => {
                                const isRoleLeak = violation.category === 'SCENE2_ROLE_LEAK';
                                return (
                                  <div key={`sem-${i}`} className="space-y-0.5 pt-1 border-t border-rose-900/60">
                                    <div className="font-bold text-amber-300 flex items-center gap-1">
                                      <LucideIcon name="shield-alert" className="w-3 h-3 text-amber-400" />
                                      {isRoleLeak ? '✕ Scene 3 Role Purity' : `✕ [${violation.category}]`}
                                    </div>
                                    <div className="text-amber-200/90 pl-4">
                                      {isRoleLeak ? 'Cena 3 contém benefício/desejo típico de Cena 2.' : violation.reason}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* CTA SEND BUTTON / FEEDBACK */}
                          <div>
                            {isCtaActive ? (
                              <div className="w-full py-2 px-3 bg-cyan-950/90 border border-cyan-700 text-cyan-200 font-mono text-xs font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 shadow-sm">
                                <div className="flex items-center gap-1">
                                  <LucideIcon name="check" className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>✓ Enviada para Cena 3</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-emerald-300">
                                  <span>✓ Copy Contract</span>
                                  <span>•</span>
                                  <span>✓ Byte-Lock</span>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                id={`send-cta-variation-${variation.variationIndex}-btn`}
                                disabled={!isFullyValid}
                                onClick={() => handleSendCtaToScene3(variation)}
                                className="w-full py-2 px-3 bg-cyan-950/90 hover:bg-cyan-900/90 border border-cyan-700/80 hover:border-cyan-500 text-cyan-200 hover:text-white font-mono text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <LucideIcon name="arrow-right-circle" className="w-3.5 h-3.5 text-cyan-400" />
                                <span>ENVIAR PARA CENA 3</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : availableCopyAgentCta?.cta ? (
              <div className="space-y-2.5">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>CTA Disponível do Agente de Copy ({availableCopyAgentCta.source})</span>
                    <span className="text-cyan-400 font-bold">{availableCopyAgentCta.characterCount || availableCopyAgentCta.cta.length} caracteres</span>
                  </div>
                  <p className="text-xs text-cyan-200 font-mono font-semibold italic bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                    "{availableCopyAgentCta.cta}"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (availableCopyAgentCta.cta) {
                      onSendCtaToScene3?.({
                        cta: availableCopyAgentCta.cta,
                        source: 'scene2_handoff',
                        versionId: availableCopyAgentCta.versionId,
                        productTitle: availableCopyAgentCta.productTitle || productName || undefined,
                        productRevisionId: productWorkspace?.productRevisionId || undefined,
                        sentAt: Date.now(),
                        characterCount: availableCopyAgentCta.characterCount || availableCopyAgentCta.cta.length
                      });
                      setCtaSuccessMsg('✓ CTA enviada para Cena 3 com sucesso!');
                      setTimeout(() => setCtaSuccessMsg(null), 4000);
                    }
                  }}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold font-sans rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LucideIcon name="arrow-right-circle" className="w-4 h-4" />
                  <span>Enviar CTA Existente para Cena 3</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                <p>Nenhuma CTA gerada ainda.</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  Selecione a quantidade desejada (1 CTA, 2 CTAs ou 3 CTAs) e clique em "Gerar" para criar opções em 1 chamada única de IA.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* COLUMN 2: DIAGNOSTICS & COMPILED OUTPUT */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-slate-900/80 border-slate-800 p-5 space-y-4 shadow-xl min-h-[550px]">
            {/* DIAGNOSTIC TABS */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono flex-wrap">
                <button
                  type="button"
                  onClick={() => handleLayerTabChange('compiled')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeLayerTab === 'compiled'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name="layers" className="w-3.5 h-3.5" />
                  Resultado Compilado
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerTabChange('grounding')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeLayerTab === 'grounding'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name="scan" className="w-3.5 h-3.5 text-cyan-400" />
                  Grounding Factual
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerTabChange('copy_brain')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeLayerTab === 'copy_brain'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name="mic" className="w-3.5 h-3.5 text-emerald-400" />
                  Copy Brain C2
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerTabChange('scene_brain')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeLayerTab === 'scene_brain'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name="clapperboard" className="w-3.5 h-3.5 text-blue-400" />
                  Scene Brain C2
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerTabChange('slots')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeLayerTab === 'slots'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name="code" className="w-3.5 h-3.5 text-amber-400" />
                  Slots JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerTabChange('tests')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    activeLayerTab === 'tests'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LucideIcon name="check-square" className="w-3.5 h-3.5 text-emerald-400" />
                  Garantias P0
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyPromptOnly}
                    title="Copiar estritamente o Prompt Compilado (Texto)"
                    className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <LucideIcon name="copy" className="w-3.5 h-3.5" />
                    <span>Copiar Prompt</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJsonOnly}
                    title="Copiar estritamente a Serialização JSON"
                    className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <LucideIcon name="code" className="w-3.5 h-3.5" />
                    <span>Copiar JSON</span>
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: FINAL COMPILED OUTPUT (PROMPT & JSON DUAL RENDERER) */}
            {activeLayerTab === 'compiled' && (
              <div className="space-y-3 animate-fade-in">
                {/* DUAL RENDERER FORMAT TOGGLE & METADATA BAR */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Visualização:</span>
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOutputFormatChange('prompt')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          outputFormat === 'prompt'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <LucideIcon name="file-text" className="w-3.5 h-3.5" />
                        <span>PROMPT</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOutputFormatChange('json')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          outputFormat === 'json'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <LucideIcon name="code" className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">
                      {outputFormat === 'prompt' ? (
                        <span className="flex items-center gap-1 text-indigo-400">
                          <LucideIcon name="lock" className="w-3 h-3 text-emerald-400" />
                          {result?.compiledPrompt ? `${result.compiledPrompt.length} caracteres` : 'Aguardando compilação'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <LucideIcon name="check" className="w-3 h-3 text-emerald-400" />
                          {result?.compiledJsonString ? `${result.compiledJsonString.length} chars (JSON válido)` : 'Aguardando compilação'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {copyStatus && (
                  <div className="p-2 bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 text-xs font-mono rounded-lg animate-fade-in flex items-center gap-2">
                    <LucideIcon name="check" className="w-4 h-4 text-emerald-400" />
                    <span>{copyStatus}</span>
                  </div>
                )}

                {/* VIEW 1: PROMPT TEXTUAL */}
                {outputFormat === 'prompt' && (
                  <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800/90 font-mono text-[11.5px] text-slate-200 leading-relaxed max-h-[500px] overflow-auto whitespace-pre-wrap select-text">
                    {result?.compiledPrompt ? (
                      result.compiledPrompt
                    ) : (
                      <div className="py-12 text-center text-slate-500 space-y-2">
                        <LucideIcon name="cpu" className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                        <p className="text-xs font-sans">
                          Nenhum prompt compilado ainda. Envie a imagem do produto, analise os fatos e clique em <strong>"Executar Pipeline Completo da Cena 2"</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 2: JSON ESTRUTURADO */}
                {outputFormat === 'json' && (
                  <div className="relative bg-slate-950 p-4 rounded-xl border border-slate-800/90 font-mono text-[11px] text-emerald-300 leading-relaxed max-h-[500px] overflow-auto whitespace-pre-wrap select-text">
                    {result?.compiledJsonString ? (
                      <pre className="text-emerald-300 font-mono text-[11px] whitespace-pre">{result.compiledJsonString}</pre>
                    ) : (
                      <div className="py-12 text-center text-slate-500 space-y-2">
                        <LucideIcon name="code" className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                        <p className="text-xs font-sans">
                          Nenhum JSON compilado ainda. Envie a imagem do produto, analise os fatos e clique em <strong>"Executar Pipeline Completo da Cena 2"</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GROUNDING FACTUAL */}
            {activeLayerTab === 'grounding' && (
              <div className="space-y-3 animate-fade-in text-xs">
                {groundingResult ? (
                  <div className="space-y-3">
                    {/* TOP SUMMARY & CONFIDENCE / PROVENANCE */}
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                          Identidade Factual Extraída
                        </span>
                        <div className="flex items-center gap-2">
                          {groundingResult.confidence && (
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              groundingResult.confidence === 'high'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                : groundingResult.confidence === 'medium'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}>
                              Confiança: {groundingResult.confidence}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            Qtd: {groundingResult.observable_quantity ?? 'N/A'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-white font-bold font-sans">
                        {groundingResult.product_identity}
                      </p>
                      <p className="text-xs text-slate-400">
                        {groundingResult.product_type} — {groundingResult.category}
                      </p>

                      {/* PROVENANCE TRACE */}
                      {groundingResult.provenance && groundingResult.provenance.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-900 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <span className="text-slate-500 font-bold">Proveniência:</span>
                          {groundingResult.provenance.map((p, idx) => (
                            <span key={idx} className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300/90 border border-slate-800">
                              {p.field} ← {p.source} ({p.value})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RAW / NORMALIZED COMPARISON */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                      {/* RAW DETECTED */}
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                          1. Raw Detected (Extração Bruta)
                        </span>
                        <div className="space-y-1 text-[10.5px] text-slate-300">
                          <div><strong className="text-slate-400">Nome:</strong> {groundingResult.raw_detected?.productName || 'Não isolado'}</div>
                          <div><strong className="text-slate-400">Tipo:</strong> {groundingResult.raw_detected?.productType || 'Não isolado'}</div>
                          <div><strong className="text-slate-400">Marca:</strong> {groundingResult.raw_detected?.brand || 'Nenhuma'}</div>
                          <div><strong className="text-slate-400">Quantidade:</strong> {groundingResult.raw_detected?.quantity ?? 'N/A'}</div>
                          {groundingResult.raw_detected?.readableLabels && groundingResult.raw_detected.readableLabels.length > 0 && (
                            <div>
                              <strong className="text-slate-400">Rótulos/Textos:</strong>
                              <ul className="list-disc list-inside text-slate-400 pl-1">
                                {groundingResult.raw_detected.readableLabels.map((lbl, i) => (
                                  <li key={i}>{lbl}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NORMALIZED RESOLUTION */}
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase block tracking-wider">
                          2. Normalized Identity (Resolução Autoritativa)
                        </span>
                        <div className="space-y-1 text-[10.5px] text-slate-300">
                          <div><strong className="text-slate-400">Identidade Final:</strong> <span className="text-cyan-300 font-bold">{groundingResult.product_identity}</span></div>
                          <div><strong className="text-slate-400">Tipo Normalizado:</strong> {groundingResult.product_type}</div>
                          <div><strong className="text-slate-400">Status Placeholder:</strong> <span className="text-emerald-400 font-bold">Válido (Sem Placeholders Genéricos)</span></div>
                        </div>
                      </div>
                    </div>

                    {/* 3-CLASS BREAKDOWN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                      {/* CLASS A: OBSERVABLE PRODUCT FACTS */}
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase block">
                          A. Observable Product Facts
                        </span>
                        <ul className="list-disc list-inside text-slate-300 space-y-1 text-[10.5px]">
                          {groundingResult.observable_details.map((det, i) => (
                            <li key={i}>{det}</li>
                          ))}
                        </ul>
                        {groundingResult.observable_colors.length > 0 && (
                          <div className="pt-1 text-[10px] text-slate-400">
                            <strong>Cores:</strong> {groundingResult.observable_colors.join(', ')}
                          </div>
                        )}
                        {groundingResult.observable_materials.length > 0 && (
                          <div className="text-[10px] text-slate-400">
                            <strong>Materiais:</strong> {groundingResult.observable_materials.join(', ')}
                          </div>
                        )}
                      </div>

                      {/* CLASS B: VERIFIED FUNCTIONAL FACTS */}
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                          B. Verified Functional Facts
                        </span>
                        {groundingResult.verified_functional_facts.length > 0 ? (
                          <ul className="list-disc list-inside text-emerald-300 space-y-1 text-[10.5px]">
                            {groundingResult.verified_functional_facts.map((fact, i) => (
                              <li key={i}>{fact}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">
                            Nenhum texto técnico explícito na imagem (fatos preservados da entrada).
                          </span>
                        )}

                        {groundingResult.visible_labels.length > 0 && (
                          <div className="pt-1 text-[10px] text-slate-400">
                            <strong>Rótulos legíveis:</strong> {groundingResult.visible_labels.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CLASS C: VISUAL COMPOSITION FILTER NOTE & DISCARDED ITEMS */}
                    <div className="p-2.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-[10.5px] text-slate-300 space-y-1">
                      <span className="font-bold text-indigo-300 font-mono block">
                        C. Visual Composition (Filtro de Permanência Aplicado)
                      </span>
                      <p className="text-slate-400 leading-normal">
                        Fundo de estúdio, iluminação, interface de marketplace e modelos na foto de catálogo são categoricamente descartados e NÃO alimentam o Copy Brain C2.
                      </p>
                      {groundingResult.discarded_visual_composition && groundingResult.discarded_visual_composition.length > 0 && (
                        <div className="pt-1 text-[10px] text-indigo-200/70 font-mono">
                          <strong>Elementos descartados:</strong> {groundingResult.discarded_visual_composition.join(' • ')}
                        </div>
                      )}
                    </div>

                    {groundingResult.uncertain_observations.length > 0 && (
                      <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[10.5px] text-amber-300 space-y-0.5">
                        <span className="font-bold font-mono">Observações Incertas (Não transformadas em fato):</span>
                        <ul className="list-disc list-inside text-[10px] text-amber-200/80">
                          {groundingResult.uncertain_observations.map((u, idx) => (
                            <li key={idx}>{u}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-950 border border-slate-850 rounded-xl text-center text-slate-500 space-y-2">
                    <LucideIcon name="scan" className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                    <p className="text-xs font-sans">
                      Aguardando upload e análise da imagem do produto. O Grounding Factual extrai estritamente observações físicas comprovadas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COPY BRAIN C2 */}
            {activeLayerTab === 'copy_brain' && (
              <div className="space-y-4 animate-fade-in text-xs">
                {result?.diagnosticTrace?.copyBrainOutput ? (
                  <div className="p-3 bg-indigo-950/40 border border-indigo-900/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 block tracking-wider">
                        Copy Brain Output (PT-BR)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                        {result.diagnosticTrace.copyBrainOutput.spoken_copy?.length || result.diagnosticTrace.copyBrainOutput.spokenCopy?.length || 0} caracteres
                      </span>
                    </div>

                    <p className="text-base text-emerald-300 font-semibold italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      "{result.diagnosticTrace.copyBrainOutput.spoken_copy || result.diagnosticTrace.copyBrainOutput.spokenCopy}"
                    </p>

                    {/* Full Structured Semantic Chain */}
                    <div className="space-y-1.5 pt-2 border-t border-indigo-900/40 text-[11px]">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                        Cadeia de Raciocínio Semântico (Fato → Benefício)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-850">
                          <span className="font-mono text-[9.5px] text-amber-400 block uppercase font-bold">1. Dominant Fact</span>
                          <span>{result.diagnosticTrace.copyBrainOutput.dominant_fact || result.diagnosticTrace.copyBrainOutput.verifiedFactUsed || 'Fato verificado'}</span>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-850">
                          <span className="font-mono text-[9.5px] text-cyan-400 block uppercase font-bold">2. Real Function</span>
                          <span>{result.diagnosticTrace.copyBrainOutput.real_function || 'Função mecânica direta'}</span>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-850">
                          <span className="font-mono text-[9.5px] text-indigo-400 block uppercase font-bold">3. Consumer Gain</span>
                          <span>{result.diagnosticTrace.copyBrainOutput.consumer_gain || 'Ganho perceptível'}</span>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-850">
                          <span className="font-mono text-[9.5px] text-emerald-400 block uppercase font-bold">4. Practical Result</span>
                          <span>{result.diagnosticTrace.copyBrainOutput.practical_result || result.diagnosticTrace.copyBrainOutput.practicalResult || 'Impacto na rotina'}</span>
                        </div>
                      </div>
                      {result.diagnosticTrace.copyBrainOutput.compatible_context && (
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-850 text-slate-300">
                          <span className="font-mono text-[9.5px] text-purple-400 block uppercase font-bold">5. Compatible Context</span>
                          <span>{result.diagnosticTrace.copyBrainOutput.compatible_context}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950 border border-slate-850 rounded-xl text-center text-slate-500 text-xs font-sans">
                    Aguardando execução do Copy Brain. Preencha os slots e execute o pipeline.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SCENE BRAIN C2 */}
            {activeLayerTab === 'scene_brain' && (
              <div className="space-y-3 animate-fade-in text-xs">
                {result?.dynamicSlots?.environment ? (
                  <>
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-blue-400 block">
                        Ambiente Funcional Resolvido (Environment Slot)
                      </span>
                      <p className="text-xs text-white font-mono">
                        {result.dynamicSlots.environment}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                        Linha do Tempo de Ações Físicas (4 Blocos de 2 Segundos)
                      </span>
                      <div className="grid grid-cols-1 gap-2 font-mono text-[11px]">
                        <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                          <span className="text-indigo-400 font-bold block mb-0.5">0.0s - 2.0s:</span>
                          <span className="text-slate-300">{result.dynamicSlots.actions?.action0to2 || 'Ação inicial'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                          <span className="text-indigo-400 font-bold block mb-0.5">2.0s - 4.0s (Demonstração do Benefício):</span>
                          <span className="text-slate-300">{result.dynamicSlots.actions?.action2to4 || 'Ação de benefício'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                          <span className="text-indigo-400 font-bold block mb-0.5">4.0s - 6.0s (Resultado Tátil):</span>
                          <span className="text-slate-300">{result.dynamicSlots.actions?.action4to6 || 'Ação de resultado'}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                          <span className="text-indigo-400 font-bold block mb-0.5">6.0s - 8.0s (Fechamento Natural):</span>
                          <span className="text-slate-300">{result.dynamicSlots.actions?.action6to8 || 'Fechamento'}</span>
                        </div>
                      </div>
                    </div>

                    {Array.isArray(result.dynamicSlots.speechActionSync) && result.dynamicSlots.speechActionSync.length > 0 && (
                      <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
                          Sincronização Fala / Ação (Speech-Action Sync)
                        </span>
                        {result.dynamicSlots.speechActionSync.map((item, idx) => (
                          <div key={idx} className="text-[10.5px] font-mono border-b border-slate-900 pb-1 last:border-0">
                            <span className="text-emerald-400 font-bold">"{item?.phrase}"</span>
                            <span className="text-slate-400"> → {item?.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 bg-slate-950 border border-slate-850 rounded-xl text-center text-slate-500 text-xs font-sans">
                    Aguardando resolução do Scene Brain. Preencha os slots e execute o pipeline.
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: RAW SLOTS JSON */}
            {activeLayerTab === 'slots' && (
              <div className="space-y-2 animate-fade-in">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  JSON Estruturado dos Slots Resolvidos (Sem invenção de estrutura pelo LLM)
                </span>
                <pre className="bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono text-[10.5px] text-slate-300 max-h-[450px] overflow-auto">
                  {result?.dynamicSlots ? JSON.stringify(result.dynamicSlots, null, 2) : '{\n  "status": "idle",\n  "slots": null\n}'}
                </pre>
              </div>
            )}

            {/* TAB 6: AUTOMATED TESTS VERIFICATION & ARCHITECTURAL GUARANTEES */}
            {activeLayerTab === 'tests' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
                    <LucideIcon name="check-circle" className="w-5 h-5 text-emerald-400" />
                    <span>CONTRATOS ARQUITETURAIS HOMOLOGADOS (FASE 1.2A & 1.2B)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    A arquitetura do compilador impõe as seguintes garantias de engenharia e isolamento:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px] pt-1">
                    <li><strong>Product Image Upload:</strong> Fonte visual primária para identidade física do produto</li>
                    <li><strong>Factual Grounding:</strong> Extrai fatos observáveis sem inventar copy, benefícios ou ações</li>
                    <li><strong>Separation of 3 Classes:</strong> Fatos observáveis vs funcionais vs composição visual</li>
                    <li><strong>User Verified Override &gt; Model Inference:</strong> Edições do usuário têm precedência absoluta</li>
                    <li><strong>Invalidation Engine:</strong> Troca de imagem invalida dados derivados do produto antigo</li>
                    <li><strong>Wardrobe Priority:</strong> Figurino do usuário vence roupas da imagem do avatar</li>
                    <li><strong>Anti Visual Contamination:</strong> Teste de permanência barra fundo de estúdio e mesas</li>
                    <li><strong>Dual Renderer Architecture (1.2B):</strong> Modelo intermediário canônico tipado (`CompiledScene2Model`)</li>
                    <li><strong>Zero Semantic Drift (1.2B):</strong> Renderers Textual e JSON compartilham a mesma fonte da verdade</li>
                    <li><strong>Independent Clipboard Handlers (1.2B):</strong> Cópia estrita de Prompt ou JSON sem contaminação</li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400">
                  <span className="font-bold text-indigo-400 block mb-1">Execução CLI da Suite de Testes:</span>
                  <code className="text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded block">
                    npx tsx src/features/creative-director/services/__tests__/jsonRenderer.test.ts
                  </code>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
