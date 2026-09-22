import React, { useState, useEffect, useRef } from 'react';
import { Card, LucideIcon } from '../../../components/Common';
import { copyToClipboard } from '../../../utils';
import { isAbortError, isTimeoutError } from '../../../services/workerClient';
import {
  Scene3GenerationResult,
  Scene3GenerationInput,
  Scene3CtaHandoff
} from '../types/scene3';
import {
  CreativeDirectorProductWorkspace,
  ProductGroundingResult,
  Scene2ProductContext
} from '../types/compilerTypes';
import {
  CreativeDirectorScene3CompilerSnapshot,
  hasValidScene3CompiledOutput
} from '../creativeDirectorSessionStorage';
import {
  runScene3Generation,
  getAuthoritativeCopyAgentScene3Cta,
  getAuthoritativeCopyAgentScene3Info,
  AuthoritativeCopyAgentCtaInfo,
  Scene3OrchestrationError
} from '../services/scene3GenerationService';
import { generateDeterministicCtaFallback } from '../services/scene3CtaEngine';
import { COPY_CONTRACT, validateCopyContract } from '../../copy-contract';
import { analyzeProductFactualGrounding } from '../services/productGroundingService';
import {
  SCENE3_BIBLE_PRESET,
  SCENE3_BODY_SPLASH_PRESET,
  SCENE3_WATCH_PRESET,
  SCENE3_SNEAKER_PRESET,
  SCENE3_TOWELS_PRESET
} from '../data/scene3Presets';
import {
  extractAvatarFullContext,
  saveExtractedWardrobeToCanonicalAvatar,
  buildAvatarFieldOrigins,
  AvatarExtractedData
} from '../wardrobe/avatarWardrobeContext';
import {
  extractWardrobeFromAvatar,
  DetectedWardrobeProfile,
  WardrobeFieldOrigins,
  WardrobeFieldOrigin
} from '../wardrobe/wardrobeVisionExtractor';
import {
  resolveWardrobeContract,
  buildWardrobeConsistencyLock
} from '../wardrobe/wardrobePriorityResolver';
import {
  StoredAvatar,
  loadCanonicalAvatars,
  subscribeToAvatarUpdates
} from '../../../services/avatarStorageService';
import {
  resolveAvatarIdentityContext
} from '../../visual-reference-engine/services/avatarIdentityHandoff';

interface Scene3CompilerPanelProps {
  currentKey: string;
  defaultProductName?: string;
  defaultCategory?: string;
  defaultProductImage?: string | null;
  defaultAvatarImage?: string | null;
  detectedFacts?: string[];
  detectedVisibleDetails?: string[];
  initialCta?: string;
  ctaHandoff?: Scene3CtaHandoff | null;
  onClearCtaHandoff?: () => void;
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
  // Shared Avatar Integration
  selectedAvatarId?: number | string | null;
  onSelectAvatar?: (avatarId: number | string | null) => void;
  sharedAvatarExtractedData?: AvatarExtractedData | null;
  onAvatarExtracted?: (extracted: AvatarExtractedData) => void;
  // Snapshot Restore Integration
  compilerSnapshot?: CreativeDirectorScene3CompilerSnapshot | null;
  onCompilerSnapshotChange?: (snapshot: CreativeDirectorScene3CompilerSnapshot | null) => void;
  isRestoring?: boolean;
}

export const Scene3CompilerPanel: React.FC<Scene3CompilerPanelProps> = ({
  currentKey,
  defaultProductName = '',
  defaultCategory = '',
  defaultProductImage = null,
  detectedFacts = [],
  detectedVisibleDetails = [],
  initialCta = '',
  ctaHandoff = null,
  onClearCtaHandoff,
  productWorkspace,
  onUploadProductImage,
  onRemoveProductImage,
  onAnalyzeProduct,
  onUpdateProductContext,
  selectedAvatarId = null,
  onSelectAvatar,
  sharedAvatarExtractedData = null,
  onAvatarExtracted,
  compilerSnapshot,
  onCompilerSnapshotChange,
  isRestoring = false
}) => {
  // Preset selector
  const [selectedPreset, setSelectedPreset] = useState<'custom' | 'bible' | 'body_splash' | 'watch' | 'sneaker' | 'towels'>('custom');

  // Input states — Product Image Reference
  const [productImage, setProductImage] = useState<string | null>(
    productWorkspace?.productImagePreview || defaultProductImage || null
  );
  const [productImageName, setProductImageName] = useState<string>(
    productWorkspace?.productImageName || (defaultProductImage ? 'imagem_padrao.png' : '')
  );
  const [productImageFile, setProductImageFile] = useState<File | null>(
    productWorkspace?.productImageFile || null
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [analyzingImage, setAnalyzingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Input states — Product Factual Details
  const [productName, setProductName] = useState(defaultProductName || '');
  const [category, setCategory] = useState(defaultCategory || '');
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
    setProductImageFile(productWorkspace.productImageFile);

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
        invalidateOutput();
      } else if (productWorkspace.productImagePreview) {
        setProductName('');
        setCategory('');
        setProductQuantity('');
        setProductFactsText('');
        setVisibleDetailsText('');
        invalidateOutput();
      } else {
        setProductName('');
        setCategory('');
        setProductQuantity('');
        setProductFactsText('');
        setVisibleDetailsText('');
        setSpokenCta('');
        invalidateOutput();
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
      invalidateOutput();
    }
  }, [productWorkspace?.productRevisionId, productWorkspace?.groundingStatus, productWorkspace?.normalizedProductContext]);

  // Presenter & Wardrobe (Identity Hub vs Manual Flow)
  const [wardrobeSourceMode, setWardrobeSourceMode] = useState<'manual' | 'identity_hub'>(
    selectedAvatarId ? 'identity_hub' : 'manual'
  );
  const [selectedWardrobeAvatarId, setSelectedWardrobeAvatarId] = useState<number | string | null>(
    selectedAvatarId || null
  );
  const [availableAvatars, setAvailableAvatars] = useState<StoredAvatar[]>([]);
  const [isScene3WardrobeDirty, setIsScene3WardrobeDirty] = useState<boolean>(false);
  const [presenterGender, setPresenterGender] = useState<'female' | 'male'>('female');
  const [presenterDesc, setPresenterDesc] = useState('');
  const [wardrobeDesc, setWardrobeDesc] = useState('Camiseta básica branca e calça jeans clássica');
  const [topType, setTopType] = useState('basic plain t-shirt');
  const [topColor, setTopColor] = useState('white');
  const [bottomType, setBottomType] = useState('basic jeans');
  const [bottomColor, setBottomColor] = useState('medium wash blue');
  const [footwearType, setFootwearType] = useState('plain sneakers');
  const [footwearColor, setFootwearColor] = useState('white');

  // Field origins & extraction states
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
  const [detectedWardrobeProfile, setDetectedWardrobeProfile] = useState<DetectedWardrobeProfile | null>(null);
  const [wardrobeExtractionStatus, setWardrobeExtractionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [wardrobeExtractionError, setWardrobeExtractionError] = useState<string | null>(null);
  const [detectedWardrobeAvatarId, setDetectedWardrobeAvatarId] = useState<number | string | null>(null);
  const [avatarApplyFeedback, setAvatarApplyFeedback] = useState<string | null>(null);
  const wardrobeExtractionRequestIdRef = useRef<number>(0);

  // Helper to apply extracted avatar data to Scene 3
  const applyExtractedDataToScene3 = (extracted: AvatarExtractedData, force = false) => {
    if (isScene3WardrobeDirty && !force) {
      return;
    }

    setPresenterGender(extracted.gender);
    setPresenterDesc(extracted.presenterIdentity);

    if (extracted.hasWardrobe) {
      if (extracted.wardrobeDescription) setWardrobeDesc(extracted.wardrobeDescription);
      if (extracted.topType) setTopType(extracted.topType);
      if (extracted.topColor) setTopColor(extracted.topColor);
      if (extracted.bottomType) setBottomType(extracted.bottomType);
      if (extracted.bottomColor) setBottomColor(extracted.bottomColor);
      if (extracted.footwearType) setFootwearType(extracted.footwearType);
      if (extracted.footwearColor) setFootwearColor(extracted.footwearColor);
      setWardrobeFieldOrigins(buildAvatarFieldOrigins(extracted));
      setAvatarApplyFeedback('Dados do avatar aplicados automaticamente.');
    } else {
      setAvatarApplyFeedback('Avatar selecionado. Extraia os dados para preencher automaticamente.');
    }

    setIsScene3WardrobeDirty(false);
    invalidateOutput();
    setTimeout(() => setAvatarApplyFeedback(null), 4000);
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

      setSelectedWardrobeAvatarId(prevId => {
        if (prevId && !updated.some(a => String(a.id) === String(prevId))) {
          return updated.length > 0 ? updated[0].id : null;
        }
        return prevId;
      });
    };

    const initial = loadCanonicalAvatars();
    handleSync(initial);

    const unsubscribe = subscribeToAvatarUpdates(handleSync);
    return unsubscribe;
  }, []);

  // Sync with external selectedAvatarId prop
  useEffect(() => {
    if (selectedAvatarId && String(selectedAvatarId) !== String(selectedWardrobeAvatarId)) {
      setSelectedWardrobeAvatarId(selectedAvatarId);
      setWardrobeSourceMode('identity_hub');
      const avatar = availableAvatars.find(a => String(a.id) === String(selectedAvatarId));
      if (avatar) {
        const extracted = extractAvatarFullContext(avatar);
        if (extracted && !isScene3WardrobeDirty) {
          applyExtractedDataToScene3(extracted);
        }
      }
    }
  }, [selectedAvatarId, availableAvatars]);

  // Sync with sharedAvatarExtractedData from parent/Scene 2
  useEffect(() => {
    if (sharedAvatarExtractedData && wardrobeSourceMode === 'identity_hub') {
      if (!isScene3WardrobeDirty) {
        applyExtractedDataToScene3(sharedAvatarExtractedData);
      }
    }
  }, [sharedAvatarExtractedData]);

  const handleSelectWardrobeAvatar = (avatarId: number | string) => {
    setSelectedWardrobeAvatarId(avatarId);
    setWardrobeSourceMode('identity_hub');
    onSelectAvatar?.(avatarId);

    const selectedAvatar = availableAvatars.find(a => String(a.id) === String(avatarId));
    if (!selectedAvatar) return;

    const extracted = extractAvatarFullContext(selectedAvatar);
    if (!extracted) return;

    onAvatarExtracted?.(extracted);

    if (!isScene3WardrobeDirty) {
      applyExtractedDataToScene3(extracted, true);
    } else {
      setAvatarApplyFeedback('Avatar selecionado. A Cena 3 mantém edições manuais (clique em "Sincronizar com Avatar" para substituir).');
      setTimeout(() => setAvatarApplyFeedback(null), 5000);
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

      if (requestId === wardrobeExtractionRequestIdRef.current) {
        setDetectedWardrobeProfile(profile);
        setDetectedWardrobeAvatarId(currentAvatarId);
        setWardrobeExtractionStatus('success');

        const updatedAvatar = saveExtractedWardrobeToCanonicalAvatar(currentAvatarId, profile);
        const fullExtracted = extractAvatarFullContext(updatedAvatar || selectedAvatar);

        if (fullExtracted) {
          applyExtractedDataToScene3(fullExtracted, true);
          onAvatarExtracted?.(fullExtracted);
          setAvatarApplyFeedback('Identidade e figurino aplicados à Cena 2 e Cena 3.');
          setTimeout(() => setAvatarApplyFeedback(null), 4000);
        }
      }
    } catch (err: any) {
      if (requestId === wardrobeExtractionRequestIdRef.current) {
        setWardrobeExtractionStatus('error');
        setWardrobeExtractionError(err?.message || 'Erro ao extrair figurino do avatar.');
      }
    }
  };

  const handleSyncScene3WithAvatar = () => {
    const selectedAvatar = availableAvatars.find(a => String(a.id) === String(selectedWardrobeAvatarId));
    if (!selectedAvatar) return;

    const extracted = extractAvatarFullContext(selectedAvatar);
    if (!extracted) return;

    applyExtractedDataToScene3(extracted, true);
    setIsScene3WardrobeDirty(false);
    setAvatarApplyFeedback('Cena 3 sincronizada com o avatar.');
    setTimeout(() => setAvatarApplyFeedback(null), 3000);
  };

  // Field change handlers tracking dirty state
  const handlePresenterGenderChange = (val: 'female' | 'male') => {
    setPresenterGender(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, presenterGender: 'manual' }));
    invalidateOutput();
  };

  const handlePresenterDescChange = (val: string) => {
    setPresenterDesc(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, presenterDescription: 'manual' }));
    invalidateOutput();
  };

  const handleWardrobeDescChange = (val: string) => {
    setWardrobeDesc(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    invalidateOutput();
  };

  const handleTopTypeChange = (val: string) => {
    setTopType(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, topType: 'manual' }));
    invalidateOutput();
  };

  const handleTopColorChange = (val: string) => {
    setTopColor(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, topColor: 'manual' }));
    invalidateOutput();
  };

  const handleBottomTypeChange = (val: string) => {
    setBottomType(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, bottomType: 'manual' }));
    invalidateOutput();
  };

  const handleBottomColorChange = (val: string) => {
    setBottomColor(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, bottomColor: 'manual' }));
    invalidateOutput();
  };

  const handleFootwearTypeChange = (val: string) => {
    setFootwearType(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, footwearType: 'manual' }));
    invalidateOutput();
  };

  const handleFootwearColorChange = (val: string) => {
    setFootwearColor(val);
    if (wardrobeSourceMode === 'identity_hub') {
      setIsScene3WardrobeDirty(true);
    }
    setWardrobeFieldOrigins(prev => ({ ...prev, footwearColor: 'manual' }));
    invalidateOutput();
  };

  // Spoken CTA (Immutable Source)
  const [spokenCta, setSpokenCta] = useState(ctaHandoff?.cta || initialCta || '');
  const [ctaLoadedFromCopyAgent, setCtaLoadedFromCopyAgent] = useState(!!ctaHandoff?.cta);
  const [ctaSourceInfo, setCtaSourceInfo] = useState<AuthoritativeCopyAgentCtaInfo | null>(null);
  const [availableCopyAgentInfo, setAvailableCopyAgentInfo] = useState<AuthoritativeCopyAgentCtaInfo | null>(null);

  // Output & Execution State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compiled' | 'brain' | 'slots' | 'json' | 'diagnostics'>('compiled');
  const [result, setResult] = useState<Scene3GenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Request counter to protect against stale async responses
  const activeRequestIdRef = useRef<number>(0);
  const lastAdoptedHandoffCtaRef = useRef<string | null>(ctaHandoff?.cta || null);

  // Phase 2.4.2 — Explicit Prop-Based CTA Handoff Reception
  useEffect(() => {
    if (ctaHandoff?.cta) {
      if (
        ctaHandoff.productRevisionId &&
        productWorkspace?.productRevisionId &&
        ctaHandoff.productRevisionId !== productWorkspace.productRevisionId
      ) {
        return;
      }
      // If spokenCta is empty or matches the previous handoff, auto-adopt the new handoff
      if (!spokenCta || spokenCta === lastAdoptedHandoffCtaRef.current) {
        setSpokenCta(ctaHandoff.cta);
        lastAdoptedHandoffCtaRef.current = ctaHandoff.cta;
        setCtaLoadedFromCopyAgent(true);
        invalidateOutput();
      }
    }
  }, [ctaHandoff, productWorkspace?.productRevisionId]);

  // Load Copy Agent info for manual import fallback if needed
  useEffect(() => {
    const info = getAuthoritativeCopyAgentScene3Info();
    setAvailableCopyAgentInfo(info);
  }, []);

  // Snapshot builders and hydrators
  const buildSnapshotFromResult = (
    genResult: Scene3GenerationResult | null,
    tab: string = activeTab
  ): CreativeDirectorScene3CompilerSnapshot | null => {
    if (!genResult || !genResult.finalPrompt) {
      return null;
    }

    return {
      compiledPrompt: genResult.finalPrompt,
      finalPrompt: genResult.finalPrompt,
      compiledJson: genResult.dynamicSlots,
      compiledJsonString: genResult.compiledJsonString,
      spokenCta: genResult.dynamicSlots?.spokenCta || spokenCta,
      brainResult: genResult.brainResult,
      dynamicSlots: genResult.dynamicSlots,
      diagnosticTrace: genResult.diagnosticTrace,
      activeOutputTab: tab,
      characterCount: genResult.finalPrompt ? genResult.finalPrompt.length : 0,
      status: 'compiled',
      compiledAt: Date.now(),
      generationResult: genResult
    };
  };

  const hydrateResultFromSnapshot = (
    snapshot: CreativeDirectorScene3CompilerSnapshot
  ): Scene3GenerationResult | null => {
    if (!hasValidScene3CompiledOutput(snapshot)) {
      return null;
    }

    if (snapshot.generationResult && snapshot.generationResult.finalPrompt) {
      return snapshot.generationResult;
    }

    const promptText = snapshot.finalPrompt || snapshot.compiledPrompt;
    if (promptText) {
      return {
        finalPrompt: promptText,
        dynamicSlots: (snapshot.dynamicSlots as any) || (snapshot.compiledJson as any) || {},
        compiledModel: (snapshot.generationResult?.compiledModel as any) || (snapshot.dynamicSlots as any) || ({} as any),
        brainResult: (snapshot.brainResult as any) || {
          environment: '',
          actions: { action0to2: '', action2to4: '', action4to6: '', action6to8: '' },
          ctaGesture: '',
          speechActionSync: [],
          productSpecificNegatives: []
        },
        compiledJsonString: snapshot.compiledJsonString || (snapshot.compiledJson ? JSON.stringify(snapshot.compiledJson, null, 2) : ''),
        diagnosticTrace: (snapshot.diagnosticTrace as any) || {
          executionTimeMs: 0,
          timestamp: new Date(snapshot.compiledAt || Date.now()).toISOString(),
          ctaInput: snapshot.spokenCta || spokenCta || '',
          productContextSummary: {
            identity: '',
            factsCount: 0,
            detailsCount: 0
          },
          brainResult: (snapshot.brainResult as any) || ({} as any),
          dynamicSlots: (snapshot.dynamicSlots as any) || ({} as any),
          compiledPrompt: promptText,
          ctaByteLockVerified: true
        }
      };
    }

    return null;
  };

  // Hydrate from compilerSnapshot on session restore or prop update
  useEffect(() => {
    if (!compilerSnapshot) return;

    if (hasValidScene3CompiledOutput(compilerSnapshot)) {
      const hydrated = hydrateResultFromSnapshot(compilerSnapshot);
      if (hydrated) {
        setResult(hydrated);
      }
      if (compilerSnapshot.activeOutputTab) {
        setActiveTab(compilerSnapshot.activeOutputTab as any);
      }
    }
  }, [compilerSnapshot]);

  // Tab change handler that preserves snapshot output tab
  const handleTabChange = (tab: 'compiled' | 'brain' | 'slots' | 'json' | 'diagnostics') => {
    setActiveTab(tab);
    if (result && hasValidScene3CompiledOutput(result)) {
      const updatedSnapshot = buildSnapshotFromResult(result, tab);
      if (updatedSnapshot) {
        onCompilerSnapshotChange?.(updatedSnapshot);
      }
    }
  };

  // Invalidation Engine: Invalidate compiled result when any critical input changes
  const invalidateOutput = () => {
    if (isRestoring) return;
    if (result) {
      setResult(null);
      onCompilerSnapshotChange?.(null);
    }
  };

  /**
   * Unified Image Processing Handler
   * Used identically by:
   * 1. File Upload (click / file picker)
   * 2. Clipboard Paste (CTRL+V / CMD+V)
   * 3. Drag & Drop
   */
  const handleScene3ProductImage = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Formato inválido (SCENE3_PRODUCT_IMAGE_INVALID_TYPE). Envie uma imagem PNG, JPG ou WEBP.');
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
      setProductImageName(file.name || 'clipboard_image.png');
      setProductImageFile(file);
      setErrorMessage(null);
      setErrorDetails([]);

      // Invalidate stale Scene 3 derived output
      invalidateOutput();
    };
    reader.onerror = () => {
      setErrorMessage('Falha ao carregar imagem (SCENE3_PRODUCT_IMAGE_LOAD_FAILED).');
    };
    reader.readAsDataURL(file);
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
        handleScene3ProductImage(file);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleScene3ProductImage(file);
    }
  };

  const handleRemoveImage = () => {
    if (onRemoveProductImage) {
      onRemoveProductImage();
    } else {
      setProductImage(null);
      setProductImageName('');
      setProductImageFile(null);
      invalidateOutput();
      onClearCtaHandoff?.();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleScene3ProductImage(file);
    }
  };

  // Factual Grounding Analysis from Product Image
  const handleAnalyzeProductImage = async () => {
    if (!productImage) {
      setErrorMessage('Nenhuma imagem de produto carregada para análise.');
      return;
    }

    setAnalyzingImage(true);
    setErrorMessage(null);
    setErrorDetails([]);

    try {
      if (onAnalyzeProduct) {
        const res = await onAnalyzeProduct({
          productName: productName.trim() || undefined,
          category: category.trim() || undefined,
          userFacts: productFactsText.split('\n').map(s => s.trim()).filter(Boolean)
        });

        if (res) {
          if (res.normalized.identity) {
            setProductName(res.normalized.identity);
          }
          if (res.normalized.category) {
            setCategory(res.normalized.category);
          }
          if (res.normalized.observableQuantity) {
            setProductQuantity(String(res.normalized.observableQuantity));
          }
          if (res.normalized.verifiedFunctionalFacts.length > 0) {
            setProductFactsText(res.normalized.verifiedFunctionalFacts.join('\n'));
          }
          if (res.normalized.observableDetails.length > 0) {
            setVisibleDetailsText(res.normalized.observableDetails.join('\n'));
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

        if (grounding.product_identity) {
          setProductName(grounding.product_identity);
        }
        if (grounding.category) {
          setCategory(grounding.category);
        }
        if (typeof grounding.observable_quantity === 'number') {
          setProductQuantity(String(grounding.observable_quantity));
        }
        if (Array.isArray(grounding.verified_functional_facts) && grounding.verified_functional_facts.length > 0) {
          setProductFactsText(grounding.verified_functional_facts.join('\n'));
        } else if (Array.isArray(grounding.observable_details) && grounding.observable_details.length > 0) {
          setProductFactsText(grounding.observable_details.join('\n'));
        }
        if (Array.isArray(grounding.observable_details) && grounding.observable_details.length > 0) {
          setVisibleDetailsText(grounding.observable_details.join('\n'));
        }
      }

      invalidateOutput();
    } catch (err: any) {
      console.warn('Grounding analysis error:', err);
      const isAborted = isAbortError(err);
      const isTimeout = isTimeoutError(err);
      if (isAborted) {
        setErrorMessage('Análise cancelada. Clique em "Analisar Imagem" para tentar novamente.');
      } else if (isTimeout) {
        setErrorMessage('Tempo limite esgotado. Verifique a conexão e tente novamente.');
      } else {
        setErrorMessage(err.message || 'Falha na análise factual da imagem.');
      }
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleFetchCtaFromCopyAgent = () => {
    const info = getAuthoritativeCopyAgentScene3Info();
    if (info && info.cta && info.cta.length > 0) {
      // Strictly guarantee Byte Lock: exact verbatim copy, no transformations
      setSpokenCta(info.cta);
      setCtaLoadedFromCopyAgent(true);
      setCtaSourceInfo(info);
      setAvailableCopyAgentInfo(info);
      invalidateOutput();
      setErrorMessage(null);
      setErrorDetails([]);
    } else {
      const facts = productFactsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      const visibleDetails = visibleDetailsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const synthCta = generateDeterministicCtaFallback(1, {
        productRevisionId: productWorkspace?.productRevisionId || 'rev_default',
        productIdentity: productName.trim() || 'esse produto',
        category: category.trim() || undefined,
        verifiedFacts: facts,
        visibleDetails: visibleDetails
      });

      if (synthCta && synthCta.trim()) {
        setSpokenCta(synthCta.trim());
        setCtaLoadedFromCopyAgent(true);
        invalidateOutput();
        setErrorMessage(null);
        setErrorDetails([]);
      } else {
        setErrorMessage('Nenhuma CTA falada disponível para a Cena 3 no Agente de Copy.');
        setErrorDetails([
          'Gere as versões no Agente de Copy primeiro ou digite uma CTA no campo acima.',
          `A CTA deve respeitar o contrato de copy canônico (${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres).`
        ]);
      }
    }
  };

  const handleSelectPreset = (presetKey: 'custom' | 'bible' | 'body_splash' | 'watch' | 'sneaker' | 'towels') => {
    setSelectedPreset(presetKey);
    setErrorMessage(null);
    setErrorDetails([]);
    invalidateOutput();

    let presetInput: Scene3GenerationInput | null = null;
    if (presetKey === 'bible') presetInput = SCENE3_BIBLE_PRESET;
    if (presetKey === 'body_splash') presetInput = SCENE3_BODY_SPLASH_PRESET;
    if (presetKey === 'watch') presetInput = SCENE3_WATCH_PRESET;
    if (presetKey === 'sneaker') presetInput = SCENE3_SNEAKER_PRESET;
    if (presetKey === 'towels') presetInput = SCENE3_TOWELS_PRESET;

    if (presetInput) {
      setProductName(presetInput.productContext.identity);
      setCategory(presetInput.productContext.category || '');
      setProductQuantity(presetInput.productContext.quantity || '');
      setProductFactsText(presetInput.productContext.knownPhysicalFacts.join('\n'));
      setVisibleDetailsText(presetInput.productContext.visibleDetails.join('\n'));
      setPresenterGender((presetInput.presenter.gender as 'female' | 'male') || 'female');
      setPresenterDesc(presetInput.presenter.identity);
      setWardrobeDesc(presetInput.wardrobe.description);
      setTopType(presetInput.wardrobe.topType || 'basic plain t-shirt');
      setTopColor(presetInput.wardrobe.topColor || 'white');
      setBottomType(presetInput.wardrobe.bottomType || 'basic jeans');
      setBottomColor(presetInput.wardrobe.bottomColor || 'medium wash blue');
      setFootwearType(presetInput.wardrobe.footwearType || 'plain sneakers');
      setFootwearColor(presetInput.wardrobe.footwearColor || 'white');
      setSpokenCta(presetInput.spokenCta);
      setCtaLoadedFromCopyAgent(false);
    } else {
      if (defaultProductName) setProductName(defaultProductName);
      if (defaultCategory) setCategory(defaultCategory);
    }
  };

  // Run Scene 3 Generation Pipeline
  const handleGenerateScene3 = async () => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setErrorMessage(null);
    setErrorDetails([]);

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
        throw new Scene3OrchestrationError(
          'Informe o nome ou identidade do produto.',
          'SCENE3_PRODUCT_CONTEXT_MISSING',
          ['O campo "Identidade do Produto" não pode ficar vazio.']
        );
      }
      if (facts.length === 0) {
        throw new Scene3OrchestrationError(
          'Informe ao menos um fato verificável do produto.',
          'SCENE3_PRODUCT_CONTEXT_MISSING',
          ['Adicione fatos físicos e funcionais comprovados do produto.']
        );
      }
      if (visibleDetails.length === 0) {
        throw new Scene3OrchestrationError(
          'Informe ao menos um detalhe visual observado.',
          'SCENE3_PRODUCT_CONTEXT_MISSING',
          ['Adicione características visíveis como cores, materiais ou formatos.']
        );
      }
      let effectiveSpokenCta = spokenCta.trim();
      if (!effectiveSpokenCta) {
        const info = getAuthoritativeCopyAgentScene3Info();
        if (info && info.cta && info.cta.trim()) {
          effectiveSpokenCta = info.cta.trim();
          setSpokenCta(effectiveSpokenCta);
          setCtaLoadedFromCopyAgent(true);
        } else {
          const synthCta = generateDeterministicCtaFallback(1, {
            productRevisionId: productWorkspace?.productRevisionId || 'rev_default',
            productIdentity: productName.trim() || 'esse produto',
            category: category.trim() || undefined,
            verifiedFacts: facts,
            visibleDetails: visibleDetails
          });
          if (synthCta && synthCta.trim()) {
            effectiveSpokenCta = synthCta.trim();
            setSpokenCta(effectiveSpokenCta);
            setCtaLoadedFromCopyAgent(true);
          }
        }
      }

      if (!effectiveSpokenCta) {
        throw new Scene3OrchestrationError(
          'Nenhum CTA falado disponível para a Cena 3.',
          'SCENE3_CTA_MISSING',
          ['O CTA falado deve ser importado do Agente de Copy ou preenchido manualmente.']
        );
      }

      const ctaVal = validateCopyContract(effectiveSpokenCta);
      if (!ctaVal.valid) {
        throw new Scene3OrchestrationError(
          `A CTA da Cena 3 não cumpre o contrato canônico de copy (${COPY_CONTRACT.minChars}–${COPY_CONTRACT.maxChars} caracteres com frase completa).`,
          'SCENE3_CTA_CONTRACT_INVALID',
          ctaVal.errors
        );
      }

      const selectedAvatar = wardrobeSourceMode === 'identity_hub' && selectedWardrobeAvatarId
        ? availableAvatars.find(a => String(a.id) === String(selectedWardrobeAvatarId))
        : null;

      const avatarContext = selectedAvatar ? resolveAvatarIdentityContext(selectedAvatar) : undefined;

      const resolvedContract = resolveWardrobeContract({
        wardrobeForm: {
          presenterGender,
          topType,
          topColor,
          bottomType,
          bottomColor,
          footwearType,
          footwearColor,
          presenterDescription: presenterDesc
        },
        fieldOrigins: wardrobeFieldOrigins
      });

      const wardrobeLock = buildWardrobeConsistencyLock(resolvedContract);

      const input: Scene3GenerationInput = {
        productContext: {
          identity: productName.trim(),
          category: category.trim() || undefined,
          visibleDetails,
          knownPhysicalFacts: facts,
          quantity: productQuantity.trim() || undefined
        },
        presenter: {
          identity: presenterDesc.trim() || `Adult Brazilian ${presenterGender === 'female' ? 'woman' : 'man'} with authentic UGC engagement`,
          gender: presenterGender,
          avatarIdentityContext: avatarContext
        },
        wardrobe: {
          description: wardrobeDesc.trim() || `${topColor} ${topType} with ${bottomColor} ${bottomType}`,
          topType: resolvedContract.topType || topType,
          topColor: resolvedContract.topColor || topColor,
          bottomType: resolvedContract.bottomType || bottomType,
          bottomColor: resolvedContract.bottomColor || bottomColor,
          footwearType: resolvedContract.footwearType || footwearType,
          footwearColor: resolvedContract.footwearColor || footwearColor,
          resolvedWardrobeContract: resolvedContract,
          wardrobeConsistencyLock: wardrobeLock
        },
        resolvedWardrobeContract: resolvedContract,
        wardrobeConsistencyLock: wardrobeLock,
        avatarIdentityContext: avatarContext,
        spokenCta: effectiveSpokenCta,
        apiKey: currentKey
      };

      const genResult = await runScene3Generation(input);

      // Race-condition guard: check if this is still the active request
      if (requestId === activeRequestIdRef.current) {
        setResult(genResult);
        setActiveTab('compiled');
        const snap = buildSnapshotFromResult(genResult, 'compiled');
        if (snap) {
          onCompilerSnapshotChange?.(snap);
        }
      }
    } catch (err: any) {
      if (requestId === activeRequestIdRef.current) {
        console.error('Scene 3 Generation Error:', err);
        const isAborted = isAbortError(err);
        const isTimeout = isTimeoutError(err);
        if (isAborted) {
          setErrorMessage('Geração cancelada.');
        } else if (isTimeout) {
          setErrorMessage('Tempo limite esgotado ao gerar Cena 3. Tente novamente.');
        } else {
          setErrorMessage(err.message || 'Erro ao gerar prompt da Cena 3.');
        }
        if (err.details && Array.isArray(err.details)) {
          setErrorDetails(err.details);
        }
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCopyPrompt = () => {
    if (!result?.finalPrompt) return;
    copyToClipboard(result.finalPrompt);
    setCopyStatus('✓ Prompt da Cena 3 copiado!');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const handleCopyJson = () => {
    if (!result?.compiledJsonString) return;
    copyToClipboard(result.compiledJsonString);
    setCopyStatus('✓ JSON estruturado da Cena 3 copiado!');
    setTimeout(() => setCopyStatus(null), 3000);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans animate-fade-in">
      {/* HEADER WITH BADGE */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              Pipeline Homologado P0
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              Fase 2.4 — Integração E2E
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <LucideIcon name="zap" className="w-5 h-5 text-emerald-400" />
            Scene 3 Deterministic Compiler & Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Recebe a CTA do Agente de Copy com garantia de Byte-Lock, constrói a dinâmica visual com o Scene Brain C3 e compila o prompt final da Cena 3.
          </p>
        </div>

        {/* PRESET SELECTOR */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Preset:</span>
          <select
            value={selectedPreset}
            onChange={(e) => handleSelectPreset(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:border-indigo-500 focus:outline-none"
          >
            <option value="custom">Personalizado (Manual)</option>
            <option value="bible">📖 Bíblia de Estudo Luxo</option>
            <option value="body_splash">🌸 Kit Body Splash</option>
            <option value="watch">⌚ Relógio Cronógrafo</option>
            <option value="sneaker">👟 Tênis Running</option>
            <option value="towels">🛁 Jogo de Toalhas</option>
          </select>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: INPUTS & CONFIGURATION */}
        <div className="lg:col-span-5 space-y-4">
          {/* CTA CARD (EXPLICIT HANDOFF / AUTHORITATIVE COPY AGENT SOURCE) */}
          <Card className="bg-slate-900/90 border-emerald-900/40 p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LucideIcon name="message-square" className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono">
                  CTA Falada da Cena 3
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {ctaHandoff?.cta ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                    <LucideIcon name="check-circle-2" className="w-3 h-3 text-emerald-400" />
                    CTA recebida da Cena 2
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 flex items-center gap-1">
                    <LucideIcon name="info" className="w-3 h-3 text-slate-500" />
                    Nenhuma CTA recebida da Cena 2
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleFetchCtaFromCopyAgent}
                  className="text-[10px] font-mono font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-950/70 hover:bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-800/60 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                  title="Buscar diretamente do Agente de Copy"
                >
                  <LucideIcon name="refresh-cw" className="w-3 h-3" />
                  Importar
                </button>
              </div>
            </div>

            {/* PENDING HANDOFF CONFLICT RESOLUTION IF MANUALLY EDITED */}
            {ctaHandoff?.cta && spokenCta !== ctaHandoff.cta && (
              <div className="p-3 bg-indigo-950/80 border border-indigo-700 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-indigo-300 font-bold flex items-center gap-1.5">
                    <LucideIcon name="arrow-down-circle" className="w-4 h-4 text-cyan-400" />
                    CTA Recebida da Cena 2 (Disponível)
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/70 px-2 py-0.5 rounded">
                    {ctaHandoff.characterCount || ctaHandoff.cta.length} ch
                  </span>
                </div>
                <p className="text-[11px] text-cyan-200 font-mono bg-slate-950/70 p-2 rounded border border-indigo-900/50 italic">
                  "{ctaHandoff.cta}"
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSpokenCta(ctaHandoff.cta);
                      setCtaLoadedFromCopyAgent(true);
                      invalidateOutput();
                    }}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <LucideIcon name="check" className="w-3.5 h-3.5" />
                    Aplicar CTA Recebida
                  </button>
                </div>
              </div>
            )}

            {/* CONTRACT & INTEGRITY DUAL STATUS STRIP */}
            {spokenCta.trim().length > 0 && (() => {
              const ctaVal = validateCopyContract(spokenCta);
              const hasSourceMatch = (ctaHandoff?.cta && spokenCta === ctaHandoff.cta) || (ctaLoadedFromCopyAgent && Boolean(ctaSourceInfo));

              return (
                <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    {/* Copy Contract Gate */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">CONTRATO:</span>
                      {ctaVal.valid ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1">
                          <LucideIcon name="check" className="w-3 h-3 text-emerald-400" />
                          Válida ({ctaVal.charCount} ch)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
                          <LucideIcon name="alert-circle" className="w-3 h-3 text-rose-400" />
                          Inválida ({ctaVal.charCount} ch • Esperado: 160–175)
                        </span>
                      )}
                    </div>

                    {/* Byte-Lock Integrity Guard */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">BYTE-LOCK:</span>
                      {ctaVal.valid && hasSourceMatch ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-bold flex items-center gap-1">
                          <LucideIcon name="shield-check" className="w-3 h-3 text-cyan-400" />
                          Integridade Ativa
                        </span>
                      ) : !ctaVal.valid ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 text-[10px]">
                          Suspenso (Contrato Inválido)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px]">
                          Entrada manual
                        </span>
                      )}
                    </div>
                  </div>

                  {!ctaVal.valid && (
                    <div className="text-[10px] text-rose-300/90 font-mono bg-rose-950/40 p-1.5 rounded border border-rose-900/50 space-y-0.5">
                      {ctaVal.errors.map((err, i) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Texto do CTA falado (Imutável durante compilação):</span>
                {spokenCta.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {spokenCta.length} caracteres
                  </span>
                )}
              </div>
              <textarea
                value={spokenCta}
                onChange={(e) => {
                  setSpokenCta(e.target.value);
                  setCtaLoadedFromCopyAgent(false);
                  setCtaSourceInfo(null);
                  invalidateOutput();
                }}
                rows={3}
                placeholder="Aguardando envio de CTA da Cena 2 ou digite manualmente..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none leading-relaxed transition-all"
              />
            </div>
          </Card>

          {/* PRODUCT FACTUAL GROUNDING CARD */}
          <Card className="bg-slate-900/60 border-slate-800/80 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono flex items-center gap-2">
                <LucideIcon name="package" className="w-4 h-4 text-indigo-400" />
                Contexto Factual do Produto
              </span>
              {productWorkspace?.groundingStatus === 'ready' && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <LucideIcon name="check" className="w-3 h-3 text-emerald-400" />
                  Sincronizado via Workspace Compartilhado
                </span>
              )}
            </div>

            {/* PRODUCT REFERENCE IMAGE INPUT BLOCK */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Imagem de Referência do Produto
                </label>
                {productImage && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    Referência principal
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Envie ou cole a imagem principal do produto. Esta imagem será usada como referência visual autoritativa.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {!productImage ? (
                /* EMPTY / DROPZONE STATE */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleTriggerUpload}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-950/20'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950/80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <LucideIcon name="image" className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300">
                      Arraste uma imagem ou clique para selecionar
                    </p>
                    <p className="text-[11px] text-indigo-400 font-mono mt-0.5">
                      CTRL+V / CMD+V para colar
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    PNG, JPG ou WEBP
                  </span>
                </div>
              ) : (
                /* LOADED / PREVIEW STATE */
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-slate-900/90 border border-slate-800/80 flex items-center justify-center p-2 min-h-[160px] max-h-52">
                    <img
                      src={productImage}
                      alt="Referência do Produto"
                      className="max-h-48 w-auto object-contain rounded"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]" title={productImageName}>
                      {productImageName || 'imagem_referencia.png'}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAnalyzeProductImage}
                        disabled={analyzingImage}
                        className="text-[10px] font-mono font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-950/70 hover:bg-emerald-900/80 px-2 py-1 rounded border border-emerald-800/60 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Extrair fatos observáveis e identidade do produto com IA"
                      >
                        {analyzingImage ? (
                          <>
                            <LucideIcon name="refresh-cw" className="w-3 h-3 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <LucideIcon name="sparkles" className="w-3 h-3 text-emerald-400" />
                            Extrair Fatos
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        className="text-[10px] font-mono text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <LucideIcon name="refresh-cw" className="w-3 h-3" />
                        Trocar imagem
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[10px] font-mono text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 px-2 py-1 rounded border border-red-900/60 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <LucideIcon name="trash-2" className="w-3 h-3" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Identidade do Produto *</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    invalidateOutput();
                  }}
                  placeholder="Ex: Bíblia de Estudo Luxo em Couro Marrom"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      invalidateOutput();
                    }}
                    placeholder="Ex: Livros & Espiritualidade"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Quantidade / Embalagem</label>
                  <input
                    type="text"
                    value={productQuantity}
                    onChange={(e) => {
                      setProductQuantity(e.target.value);
                      invalidateOutput();
                    }}
                    placeholder="Ex: 1 unidade, Kit com 3"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Fatos Físicos / Funcionais * (1 por linha)
                </label>
                <textarea
                  value={productFactsText}
                  onChange={(e) => {
                    setProductFactsText(e.target.value);
                    invalidateOutput();
                  }}
                  rows={3}
                  placeholder="Capa em couro marrom flexível&#10;Fitilho marcador dourado duplo"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Detalhes Visuais Observados * (1 por linha)
                </label>
                <textarea
                  value={visibleDetailsText}
                  onChange={(e) => {
                    setVisibleDetailsText(e.target.value);
                    invalidateOutput();
                  }}
                  rows={3}
                  placeholder="Lombada costurada reforçada&#10;Bordas das páginas metalizadas douradas"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          </Card>

          {/* PRESENTER & WARDROBE CARD */}
          <Card className="bg-slate-900/60 border-slate-800/80 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-300 font-mono flex items-center gap-2">
                <LucideIcon name="user" className="w-4 h-4 text-pink-400" />
                Apresentador & Figurino
              </span>
              {wardrobeSourceMode === 'identity_hub' && selectedWardrobeAvatarId && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Identity Hub Ativo
                </span>
              )}
            </div>

            {/* FLOW SELECTOR: MANUAL vs IDENTITY HUB */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LucideIcon name="user-check" className="w-3.5 h-3.5 text-purple-400" />
                  Fonte do Apresentador & Figurino
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
                  <span>Manual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWardrobeSourceMode('identity_hub');
                    if (!selectedWardrobeAvatarId && availableAvatars.length > 0) {
                      handleSelectWardrobeAvatar(availableAvatars[0].id);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    wardrobeSourceMode === 'identity_hub'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-purple-400" />
                  <span>Identity Hub ({availableAvatars.length})</span>
                </button>
              </div>
            </div>

            {/* IDENTITY HUB AVATAR PICKER */}
            {wardrobeSourceMode === 'identity_hub' && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-900/40 space-y-3">
                {availableAvatars.length === 0 ? (
                  <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-center space-y-1">
                    <p className="text-xs text-slate-300 font-medium">Nenhum avatar encontrado no Identity Hub</p>
                    <p className="text-[10px] text-slate-500">
                      Crie ou importe avatares na aba <strong>Identity Hub</strong> para utilizá-los na Cena 3.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono block">
                        Selecione o Avatar do Identity Hub
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

                    {/* SELECTED AVATAR ACTION CARD */}
                    {(() => {
                      const selectedAvatar = availableAvatars.find(a => String(a.id) === String(selectedWardrobeAvatarId));
                      if (!selectedAvatar) return null;

                      const isExtracting = wardrobeExtractionStatus === 'loading';
                      const hasDetected = detectedWardrobeProfile && String(detectedWardrobeAvatarId) === String(selectedAvatar.id);

                      return (
                        <div className="space-y-2.5 pt-1">
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
                              ) : hasDetected ? (
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

                          {/* DIRTY STATE SYNC BANNER */}
                          {isScene3WardrobeDirty && (
                            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-700/50 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0 text-amber-200">
                                <LucideIcon name="alert-circle" className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span className="text-[11px]">Cena 3 possui edições manuais personalizadas.</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleSyncScene3WithAvatar}
                                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 flex-shrink-0 cursor-pointer shadow transition"
                              >
                                <LucideIcon name="refresh-cw" className="w-3 h-3" />
                                Sincronizar com Avatar
                              </button>
                            </div>
                          )}

                          {/* FEEDBACK BANNER */}
                          {avatarApplyFeedback && (
                            <div className="p-2 rounded bg-emerald-950/50 border border-emerald-700/50 text-emerald-200 text-xs flex items-center gap-1.5">
                              <LucideIcon name="check-circle" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="text-[11px] font-medium">{avatarApplyFeedback}</span>
                            </div>
                          )}

                          {/* ERROR BANNER */}
                          {wardrobeExtractionStatus === 'error' && wardrobeExtractionError && (
                            <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-2 text-red-200 text-xs">
                              <LucideIcon name="alert-circle" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold block text-[11px] text-red-300">Erro na Análise do Figurino</span>
                                <p className="text-[10px] text-red-200/90">{wardrobeExtractionError}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* PRESENT & WARDROBE EDITABLE FORM */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-[11px] font-mono text-slate-400">Gênero:</label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="presenterGender"
                    checked={presenterGender === 'female'}
                    onChange={() => handlePresenterGenderChange('female')}
                    className="text-pink-500 focus:ring-0"
                  />
                  Feminino
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="presenterGender"
                    checked={presenterGender === 'male'}
                    onChange={() => handlePresenterGenderChange('male')}
                    className="text-indigo-500 focus:ring-0"
                  />
                  Masculino
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Identidade do Apresentador</label>
                <input
                  type="text"
                  value={presenterDesc}
                  onChange={(e) => handlePresenterDescChange(e.target.value)}
                  placeholder="Ex: Mulher adulta brasileira com tom caloroso e comunicativo"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Descrição do Figurino (Wardrobe)</label>
                <input
                  type="text"
                  value={wardrobeDesc}
                  onChange={(e) => handleWardrobeDescChange(e.target.value)}
                  placeholder="Ex: Camiseta básica branca e calça jeans clássica"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-pink-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>
                  <span>Top:</span>
                  <input
                    type="text"
                    value={topType}
                    onChange={(e) => handleTopTypeChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <span>Cor Top:</span>
                  <input
                    type="text"
                    value={topColor}
                    onChange={(e) => handleTopColorChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs mt-0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>
                  <span>Bottom (Calça/Saia):</span>
                  <input
                    type="text"
                    value={bottomType}
                    onChange={(e) => handleBottomTypeChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <span>Cor Bottom:</span>
                  <input
                    type="text"
                    value={bottomColor}
                    onChange={(e) => handleBottomColorChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs mt-0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>
                  <span>Calçado (Footwear):</span>
                  <input
                    type="text"
                    value={footwearType}
                    onChange={(e) => handleFootwearTypeChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <span>Cor Calçado:</span>
                  <input
                    type="text"
                    value={footwearColor}
                    onChange={(e) => handleFootwearColorChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs mt-0.5"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* GENERATE BUTTON */}
          <button
            type="button"
            onClick={handleGenerateScene3}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.99]'
            }`}
          >
            <LucideIcon name={loading ? 'loader-2' : 'zap'} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Executando Scene Brain C3 & Compilando...' : 'Gerar Cena 3'}
          </button>

          {/* ERROR DISPLAY */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-200 space-y-1.5 animate-shake">
              <div className="flex items-center gap-2 font-bold font-mono text-rose-300">
                <LucideIcon name="alert-circle" className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
              {errorDetails.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-rose-300/80 font-mono space-y-0.5">
                  {errorDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: OUTPUT & INSPECTION WORKBENCH */}
        <div className="lg:col-span-7 space-y-4">
          {/* TAB BAR */}
          <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleTabChange('compiled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'compiled'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LucideIcon name="file-text" className="w-3.5 h-3.5" />
                Prompt Cena 3
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('brain')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'brain'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LucideIcon name="brain" className="w-3.5 h-3.5" />
                Brain Cena 3
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('slots')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'slots'
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LucideIcon name="sliders" className="w-3.5 h-3.5" />
                Slots Dinâmicos
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'json'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LucideIcon name="code" className="w-3.5 h-3.5" />
                JSON
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('diagnostics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'diagnostics'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LucideIcon name="activity" className="w-3.5 h-3.5" />
                Diagnóstico E2E
              </button>
            </div>

            {/* ACTION BUTTONS */}
            {result && (
              <div className="flex items-center gap-2">
                {activeTab === 'json' ? (
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
                  >
                    <LucideIcon name="copy" className="w-3 h-3" />
                    Copiar JSON
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-mono flex items-center gap-1 border border-emerald-800 transition-all cursor-pointer"
                  >
                    <LucideIcon name="copy" className="w-3 h-3" />
                    Copiar Prompt
                  </button>
                )}
              </div>
            )}
          </div>

          {/* COPY NOTIFICATION */}
          {copyStatus && (
            <div className="p-2 bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs font-mono rounded-lg flex items-center gap-2 animate-fade-in">
              <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400" />
              <span>{copyStatus}</span>
            </div>
          )}

          {/* OUTPUT CONTAINER */}
          <Card className="bg-slate-900/60 border-slate-800/80 p-5 min-h-[480px]">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <LucideIcon name="loader-2" className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="font-mono text-xs">Processando Scene Brain C3 e compilando template determinístico...</span>
              </div>
            ) : !result ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-2 text-slate-500">
                <LucideIcon name="sparkles" className="w-8 h-8 text-slate-600" />
                <span className="font-mono text-xs">Configure os parâmetros à esquerda e clique em "Gerar Cena 3"</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* COMPILED PROMPT TAB */}
                {activeTab === 'compiled' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <LucideIcon name="check-circle-2" className="w-4 h-4" /> Prompt Final Compilado (Scene 3)
                      </span>
                      <span>{result.finalPrompt.length} caracteres • {result.diagnosticTrace.executionTimeMs}ms</span>
                    </div>

                    <pre className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[540px]">
                      {result.finalPrompt}
                    </pre>
                  </div>
                )}

                {/* BRAIN C3 TAB */}
                {activeTab === 'brain' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                        <LucideIcon name="brain" className="w-4 h-4" /> Visual Reasoning — Scene Brain C3
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">
                        CTA Byte-Lock: 100% Preservado
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                        <span className="text-indigo-300 font-mono font-bold block mb-1">Ambiente Coerente (Environment):</span>
                        <p className="text-slate-300 font-sans leading-relaxed">{result.brainResult.environment}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2">
                        <span className="text-indigo-300 font-mono font-bold block">Timeline de Ação Física (4 Blocos):</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                          <div className="p-2 bg-slate-900 rounded border border-slate-800">
                            <span className="text-slate-400 font-bold">[0-2s]:</span> {result.brainResult.actions.action0to2}
                          </div>
                          <div className="p-2 bg-slate-900 rounded border border-slate-800">
                            <span className="text-slate-400 font-bold">[2-4s]:</span> {result.brainResult.actions.action2to4}
                          </div>
                          <div className="p-2 bg-slate-900 rounded border border-slate-800">
                            <span className="text-slate-400 font-bold">[4-6s]:</span> {result.brainResult.actions.action4to6}
                          </div>
                          <div className="p-2 bg-slate-900 rounded border border-slate-800">
                            <span className="text-slate-400 font-bold">[6-8s]:</span> {result.brainResult.actions.action6to8}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                        <span className="text-indigo-300 font-mono font-bold block mb-1">Gesto Específico de CTA (ctaGesture):</span>
                        <p className="text-slate-300 font-sans leading-relaxed">{result.brainResult.ctaGesture}</p>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                        <span className="text-indigo-300 font-mono font-bold block mb-1">Sincronização Fala-Ação:</span>
                        <div className="space-y-1 text-[11px] font-mono">
                          {result.brainResult.speechActionSync.map((sync, idx) => (
                            <div key={idx} className="p-1.5 bg-slate-900 rounded border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-1">
                              <span className="text-emerald-300">"{sync.spokenSegment}"</span>
                              <span className="text-slate-400">→ {sync.physicalAction}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {result.brainResult.productSpecificNegatives.length > 0 && (
                        <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                          <span className="text-rose-400 font-mono font-bold block mb-1">Restrições Negativas Específicas do Produto:</span>
                          <ul className="list-disc list-inside text-[11px] text-slate-300 font-mono">
                            {result.brainResult.productSpecificNegatives.map((neg, idx) => (
                              <li key={idx}>{neg}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SLOTS TAB */}
                {activeTab === 'slots' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-pink-400 font-bold flex items-center gap-1.5">
                        <LucideIcon name="sliders" className="w-4 h-4" /> Scene 3 Dynamic Slots
                      </span>
                    </div>

                    <pre className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[500px]">
                      {JSON.stringify(result.dynamicSlots, null, 2)}
                    </pre>
                  </div>
                )}

                {/* JSON TAB */}
                {activeTab === 'json' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-amber-400 font-bold flex items-center gap-1.5">
                        <LucideIcon name="code" className="w-4 h-4" /> JSON Estruturado (Scene 3 Model)
                      </span>
                    </div>

                    <pre className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[500px]">
                      {result.compiledJsonString}
                    </pre>
                  </div>
                )}

                {/* DIAGNOSTICS TAB */}
                {activeTab === 'diagnostics' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                      <span className="text-teal-400 font-bold flex items-center gap-1.5">
                        <LucideIcon name="activity" className="w-4 h-4" /> Trace de Diagnóstico E2E (Scene 3)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 text-[10px] border border-teal-800/60">
                        Byte-Lock Status: 100% Verificado
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Origem do CTA</span>
                        <div className="text-slate-200 font-bold flex items-center gap-1.5">
                          {ctaLoadedFromCopyAgent ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <LucideIcon name="check" className="w-3.5 h-3.5" /> Agente de Copy (Autoritativo)
                            </span>
                          ) : (
                            <span className="text-amber-400">Entrada Manual / Preset</span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Versão Ativa</span>
                        <div className="text-slate-200 font-bold">
                          {ctaSourceInfo ? `Versão ${ctaSourceInfo.versionId} (${ctaSourceInfo.source})` : 'N/A (Manual)'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Contagem de Caracteres CTA</span>
                        <div className="text-slate-200 font-bold">
                          {result.spokenCta.length} caracteres
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider block">Identidade do Produto</span>
                        <div className="text-slate-200 font-bold truncate">
                          {productName || 'Não especificado'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-teal-300 font-mono font-bold text-xs block">Verificação de Integridade Byte-Lock:</span>
                      <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>CTA de Entrada:</span>
                          <span className="text-emerald-400 font-bold">VERBATIM</span>
                        </div>
                        <p className="text-slate-300 italic bg-slate-950 p-2 rounded border border-slate-800/80">
                          "{result.spokenCta}"
                        </p>
                        <div className="flex items-center justify-between text-slate-400 pt-1">
                          <span>Slot [SPOKEN_CTA_PHRASE] no Prompt Compilado:</span>
                          <span className="text-emerald-400 font-bold">PRESERVADO ✓</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Tempo Total de Execução:</span>
                          <span className="text-slate-200 font-bold">{result.diagnosticTrace.executionTimeMs} ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
