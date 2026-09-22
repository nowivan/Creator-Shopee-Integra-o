import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Send,
  RefreshCw,
  Info,
  Check,
  Tag,
  ShieldCheck,
  BookmarkCheck,
  ChevronRight,
  Upload,
  X,
  FileText,
  Sliders,
  Layers
} from 'lucide-react';
import {
  ShopeeCopyStructure,
  ShopeeCopyStyle,
  ShopeeCTAType,
  ShopeeCopyOutputMode,
  ShopeeCopyVariation,
  ShopeeCommercialEvidence,
  DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE,
  SHOPEE_OUTPUT_MODE_DEFINITIONS,
  SHOPEE_MIN_CHARS,
  SHOPEE_MAX_CHARS,
  SHOPEE_SWEET_SPOT_MIN,
  SHOPEE_SWEET_SPOT_MAX,
  ShopeeProductDetectionResult,
  ShopeeDetectionConfidence,
  ShopeePreset,
  SHOPEE_PRESET_DEFINITIONS,
  SHOPEE_NATIVE_CREATOR_STEPS
} from './types';
import { SHOPEE_STRUCTURE_DEFINITIONS } from './shopeeStructureEngine';
import { SHOPEE_STYLE_DEFINITIONS } from './shopeeStyleEngine';
import { executeShopeeCopyGeneration } from './shopeeCopyService';
import {
  loadShopeeCopySession,
  saveShopeeCopySession,
  markShopeeVariationUsed
} from './shopeeSessionStorage';
import {
  validateShopeeProductImage,
  shouldHandleClipboardImagePaste
} from './shopeeImageUtils';
import {
  detectShopeeProductFromImage,
  formatShopeeDetectionFacts,
  generateImageFingerprint
} from './shopeeProductDetector';
import {
  ShopeeVideoComplianceGuard,
  ShopeeCompliancePreflightPanel
} from '../shopee-compliance';

interface ShopeeCopyViewProps {
  currentKey?: string;
  onNavigate?: (view: string) => void;
}

export const ShopeeCopyView: React.FC<ShopeeCopyViewProps> = ({ currentKey, onNavigate }) => {
  // 1. Core State
  const [productName, setProductName] = useState('');
  const [productContext, setProductContext] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);

  // Auto-Detection State
  const [detectionResult, setDetectionResult] = useState<ShopeeProductDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectionSource, setDetectionSource] = useState<'upload' | 'drop' | 'paste' | null>(null);
  const [pendingDetectionNotice, setPendingDetectionNotice] = useState(false);

  // User input tracking refs to distinguish user-authored vs auto-filled data
  const isProductNameUserEditedRef = useRef(false);
  const isProductContextUserEditedRef = useRef(false);
  const wasAutoFilledRef = useRef(false);
  const detectionAbortControllerRef = useRef<AbortController | null>(null);

  // 1. Preset Selector (defaults to SHOPEE_NATIVE_CREATOR)
  const [selectedPreset, setSelectedPreset] = useState<ShopeePreset>(ShopeePreset.SHOPEE_NATIVE_CREATOR);

  // 2. Selectors according to exact user taxonomy (defaults prioritize Shopee Native Creator)
  const [selectedStructure, setSelectedStructure] = useState<ShopeeCopyStructure>(ShopeeCopyStructure.PRODUCT_IN_USE);
  const [selectedStyle, setSelectedStyle] = useState<ShopeeCopyStyle>(ShopeeCopyStyle.UGC_NATURAL);
  const [selectedOutputMode, setSelectedOutputMode] = useState<ShopeeCopyOutputMode>(ShopeeCopyOutputMode.FULL_COPY);
  const [selectedCta, setSelectedCta] = useState<ShopeeCTAType>(ShopeeCTAType.PRODUTO_MARCADO);

  // 3. Commercial Evidence Controls
  const [evidence, setEvidence] = useState<ShopeeCommercialEvidence>(DEFAULT_SHOPEE_COMMERCIAL_EVIDENCE);

  // 4. Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<ShopeeCopyVariation[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | undefined>(undefined);
  const [usedVariationIds, setUsedVariationIds] = useState<number[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing session on mount
  useEffect(() => {
    try {
      const saved = loadShopeeCopySession();
      if (saved) {
        if (saved.productContext) setProductContext(saved.productContext);
        if (saved.productImagePreview) setProductImage(saved.productImagePreview);
        if (saved.selectedPreset) setSelectedPreset(saved.selectedPreset as ShopeePreset);
        if (saved.selectedStructure) setSelectedStructure(saved.selectedStructure);
        if (saved.selectedStyle) setSelectedStyle(saved.selectedStyle);
        if (saved.selectedCtaType) setSelectedCta(saved.selectedCtaType);
        if (saved.selectedOutputMode) setSelectedOutputMode(saved.selectedOutputMode);
        if (saved.variations && saved.variations.length > 0) {
          setVariations(saved.variations);
        }
        if (saved.selectedVariationId) setSelectedVariationId(saved.selectedVariationId);
        if (saved.usedVariationIds) setUsedVariationIds(saved.usedVariationIds);
        if (saved.detectionResult) {
          setDetectionResult(saved.detectionResult);
          if (saved.detectionSource) setDetectionSource(saved.detectionSource);
        }
      }
    } catch (e) {
      console.warn('Could not restore Shopee session', e);
    }
  }, []);

  // Automatic visual product detection trigger
  const triggerImageDetection = async (
    imageBase64: string,
    source: 'upload' | 'drop' | 'paste' = 'upload'
  ) => {
    setIsDetecting(true);
    setDetectionError(null);
    setPendingDetectionNotice(false);

    if (detectionAbortControllerRef.current) {
      detectionAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    detectionAbortControllerRef.current = abortController;

    try {
      const mimeType = imageBase64.startsWith('data:image/png')
        ? 'image/png'
        : imageBase64.startsWith('data:image/webp')
        ? 'image/webp'
        : 'image/jpeg';

      const result = await detectShopeeProductFromImage({
        imageBase64,
        imageMimeType: mimeType,
        signal: abortController.signal
      });

      setDetectionResult(result);
      setDetectionSource(source);
      setIsDetecting(false);

      // Auto-fill logic
      const detectedFacts = formatShopeeDetectionFacts(result);
      const isNameManuallyTyped = isProductNameUserEditedRef.current && productName.trim().length > 0;
      const isContextManuallyTyped = isProductContextUserEditedRef.current && productContext.trim().length > 0;

      let filledAny = false;

      // 1. Product Name Auto-Fill
      if (!isNameManuallyTyped && result.confidence !== 'LOW' && result.productName) {
        setProductName(result.productName);
        filledAny = true;
      }

      // 2. Facts Auto-Fill
      if (!isContextManuallyTyped && detectedFacts) {
        setProductContext(detectedFacts);
        filledAny = true;
      }

      if (filledAny) {
        wasAutoFilledRef.current = true;
      }

      // If user had manually typed into fields, show that detection is available without overwriting
      if (isNameManuallyTyped || isContextManuallyTyped) {
        setPendingDetectionNotice(true);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.isAborted) return;
      setIsDetecting(false);
      console.warn('Erro ao detectar produto da imagem:', err);
      setDetectionError(
        'Não foi possível identificar o produto automaticamente. Informe o nome ou os detalhes manualmente.'
      );
    }
  };

  // User applies detected data manually (overriding or completing manual fields)
  const applyDetectedData = () => {
    if (!detectionResult) return;
    if (detectionResult.productName && detectionResult.confidence !== 'LOW') {
      setProductName(detectionResult.productName);
      isProductNameUserEditedRef.current = false;
    }
    const detectedFacts = formatShopeeDetectionFacts(detectionResult);
    if (detectedFacts) {
      setProductContext(detectedFacts);
      isProductContextUserEditedRef.current = false;
    }
    wasAutoFilledRef.current = true;
    setPendingDetectionNotice(false);
    setSuccessNotice('Dados detectados aplicados nos campos.');
    setTimeout(() => {
      setSuccessNotice((prev) => (prev === 'Dados detectados aplicados nos campos.' ? null : prev));
    }, 3000);
  };

  // Canonical image ingestion pipeline (File Input, Drag & Drop, and Clipboard Paste)
  const handleProductImageFile = (file: File, source: 'upload' | 'drop' | 'paste' = 'upload') => {
    const validation = validateShopeeProductImage(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Por favor, envie um arquivo de imagem válido.');
      return;
    }

    setErrorMessage(null);

    // Invalidate previous detection on image change
    setDetectionResult(null);
    setDetectionError(null);
    setPendingDetectionNotice(false);

    // If previous fields were auto-filled by detection and not manually modified, reset them
    if (!isProductNameUserEditedRef.current && wasAutoFilledRef.current) {
      setProductName('');
    }
    if (!isProductContextUserEditedRef.current && wasAutoFilledRef.current) {
      setProductContext('');
    }
    wasAutoFilledRef.current = false;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProductImage(result);

      if (source === 'paste') {
        setSuccessNotice('Imagem colada com sucesso.');
        setTimeout(() => {
          setSuccessNotice((prev) => (prev === 'Imagem colada com sucesso.' ? null : prev));
        }, 3000);
      }

      // Automatic trigger for visual product detection
      triggerImageDetection(result, source);
    };
    reader.onerror = () => {
      setErrorMessage('Falha ao processar a imagem. Tente novamente.');
    };
    reader.readAsDataURL(file);
  };

  // Safe removal of product image and related auto-detection data
  const handleRemoveProductImage = () => {
    if (detectionAbortControllerRef.current) {
      detectionAbortControllerRef.current.abort();
    }
    setProductImage(null);
    setDetectionResult(null);
    setDetectionError(null);
    setPendingDetectionNotice(false);
    setIsDetecting(false);

    // If fields were purely auto-filled and untouched by the user, clear them
    if (!isProductNameUserEditedRef.current && wasAutoFilledRef.current) {
      setProductName('');
    }
    if (!isProductContextUserEditedRef.current && wasAutoFilledRef.current) {
      setProductContext('');
    }
    wasAutoFilledRef.current = false;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProductImageFile(e.dataTransfer.files[0], 'drop');
    }
  };

  // Clipboard Image Paste Support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      try {
        const { shouldHandle, file } = shouldHandleClipboardImagePaste(
          e.target,
          e.clipboardData
        );
        if (shouldHandle && file) {
          e.preventDefault();
          handleProductImageFile(file, 'paste');
        }
      } catch (err) {
        console.warn('Erro ao processar imagem colada:', err);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Trigger Generation
  const handleGenerate = async () => {
    const effectiveProductName = productName.trim() || (detectionResult && detectionResult.confidence !== 'LOW' ? detectionResult.productName : '');
    const effectiveContext = productContext.trim() || (detectionResult ? formatShopeeDetectionFacts(detectionResult) : '');

    if (!effectiveProductName && !effectiveContext) {
      setErrorMessage('Informe ao menos o nome do produto ou detalhes observados.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const result = await executeShopeeCopyGeneration({
        productName: effectiveProductName || 'Produto Shopee',
        category: detectionResult?.productCategory || 'Geral',
        productFacts: effectiveContext ? [effectiveContext] : [],
        productVisibleDetails: detectionResult
          ? [...detectionResult.observableDetails, ...detectionResult.knownPhysicalFacts]
          : [],
        evidence,
        structure: selectedStructure,
        style: selectedStyle,
        ctaType: selectedCta,
        outputMode: selectedOutputMode,
        preset: selectedPreset,
        rawImageBase64: productImage ? (productImage.includes(',') ? productImage.split(',')[1] : productImage) : undefined,
        imageMimeType: productImage?.startsWith('data:image/png')
          ? 'image/png'
          : productImage?.startsWith('data:image/webp')
          ? 'image/webp'
          : 'image/jpeg'
      });

      if (result.ok && result.variations.length > 0) {
        setVariations(result.variations);
        setSelectedVariationId(result.variations[0]?.id);

        // Persist session automatically
        saveShopeeCopySession({
          productContext: effectiveContext || effectiveProductName,
          productImagePreview: productImage || undefined,
          selectedPreset,
          selectedStructure,
          selectedStyle,
          selectedCtaType: selectedCta,
          selectedOutputMode,
          variations: result.variations,
          selectedVariationId: result.variations[0]?.id,
          selectedScene3Copy: result.variations[0]?.scene3,
          usedVariationIds,
          detectionResult: detectionResult || undefined,
          detectionConfidence: detectionResult?.confidence,
          detectionSource: detectionSource || undefined,
          lastAnalyzedImageId: productImage ? generateImageFingerprint(productImage) : undefined
        });

        setSuccessNotice('6 versões de copy Shopee geradas com conformidade estrita (160–175 caracteres)!');
      } else {
        setErrorMessage(result.errorMessage || 'Falha ao processar as variações. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado na geração de copy Shopee.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle used variation
  const handleToggleUsed = (id: number) => {
    const updated = markShopeeVariationUsed(id);
    setUsedVariationIds(updated);
  };

  // Select variation for Creative Director
  const handleSelectForCreativeDirector = (variation: ShopeeCopyVariation) => {
    setSelectedVariationId(variation.id);
    saveShopeeCopySession({
      productContext: productContext || productName,
      productImagePreview: productImage || undefined,
      selectedStructure,
      selectedStyle,
      selectedCtaType: selectedCta,
      selectedOutputMode,
      variations,
      selectedVariationId: variation.id,
      selectedScene3Copy: variation.scene3,
      usedVariationIds
    });

    setSuccessNotice(`Versão #${variation.id} selecionada para o Creative Director (Cena 3)!`);

    if (onNavigate) {
      setTimeout(() => {
        onNavigate('create');
      }, 700);
    }
  };

  // Character counter helper
  const renderCharBadge = (count: number) => {
    const isOptimal = count >= SHOPEE_SWEET_SPOT_MIN && count <= SHOPEE_SWEET_SPOT_MAX;
    const isValid = count >= SHOPEE_MIN_CHARS && count <= SHOPEE_MAX_CHARS;

    if (isOptimal) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          {count} carac. ✓ Sweet Spot
        </span>
      );
    }
    if (isValid) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          {count} carac. ✓ Conforme
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        {count} carac. (Alvo: 160–175)
      </span>
    );
  };

  // Exact Structure Definitions list
  const structureEntries = Object.entries(SHOPEE_STRUCTURE_DEFINITIONS) as [
    ShopeeCopyStructure,
    typeof SHOPEE_STRUCTURE_DEFINITIONS[ShopeeCopyStructure]
  ][];

  // Exact Style Definitions list
  const styleEntries = Object.entries(SHOPEE_STYLE_DEFINITIONS) as [
    ShopeeCopyStyle,
    typeof SHOPEE_STYLE_DEFINITIONS[ShopeeCopyStyle]
  ][];

  // Exact Output Mode Definitions list
  const outputModeEntries = Object.entries(SHOPEE_OUTPUT_MODE_DEFINITIONS) as [
    ShopeeCopyOutputMode,
    typeof SHOPEE_OUTPUT_MODE_DEFINITIONS[ShopeeCopyOutputMode]
  ][];

  return (
    <div id="shopee-copy-view" className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-950/60 via-neutral-900 to-neutral-900 border border-orange-500/30 p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Shopee Copy Agent
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-orange-500 text-white tracking-wider">
                  Módulo Dedicado
                </span>
              </div>
              <p className="text-sm md:text-base text-neutral-300 max-w-3xl">
                Motor independente calibrado para conversão nativa da Shopee. Enforce estrito de 160–175 caracteres,
                ausência de jargões ilegais (&quot;carrinho laranja&quot; proibido) e integração direta com o Creative Director.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span>Contrato: 160–175 caracteres</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Notifications */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Atenção ao gerar</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Operação realizada com sucesso</p>
              <p className="text-xs text-emerald-300/90 mt-0.5">{successNotice}</p>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Grid: Inputs + Options */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Product & Options Form */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. Product Identification Card */}
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  1. Dados do Produto
                </h2>
              </div>

              {/* Pending Detection Notification */}
              {pendingDetectionNotice && detectionResult && (
                <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-800/60 flex items-center justify-between text-xs text-orange-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <span className="font-semibold">Análise disponível:</span> Detecção visual pronta ({detectionResult.productCategory} • {detectionResult.productArchetype})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={applyDetectedData}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded text-xs transition-colors shrink-0"
                  >
                    Usar dados detectados
                  </button>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Nome do Produto / Título da Oferta
                </label>
                <input
                  id="shopee-product-name-input"
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    isProductNameUserEditedRef.current = true;
                  }}
                  placeholder="Ex: Mini Processador Triturador de Alimentos Elétrico USB"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Context / Facts */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Fatos Observados & Benefícios Visíveis
                </label>
                <textarea
                  id="shopee-product-context-input"
                  rows={3}
                  value={productContext}
                  onChange={(e) => {
                    setProductContext(e.target.value);
                    isProductContextUserEditedRef.current = true;
                  }}
                  placeholder="Ex: Três lâminas de aço inoxidável, acionamento por botão touch, bateria recarregável USB, tampa com trava de segurança..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {/* Image Uploader & Preview */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Imagem do Produto (Opcional - Análise Visual)
                </label>
                {productImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950 p-2 flex items-center justify-between">
                    <img src={productImage} alt="Produto Preview" className="h-20 w-20 object-cover rounded" />
                    <div className="flex-1 px-4 text-xs text-neutral-400">
                      Imagem carregada para inspeção factual visual
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
                        title="Substituir imagem"
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveProductImage}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg bg-neutral-800 transition-colors"
                        title="Remover imagem"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleProductImageFile(e.target.files[0], 'upload')}
                    />
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-neutral-800 hover:border-orange-500/50 rounded-lg p-4 text-center transition-colors bg-neutral-950/50"
                  >
                    <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
                    <p className="text-xs text-neutral-300 font-medium">
                      Clique, arraste ou cole com Ctrl+V / Cmd+V
                    </p>
                    <p className="text-[11px] text-neutral-500">PNG, JPG, WEBP até 5MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleProductImageFile(e.target.files[0], 'upload')}
                    />
                  </div>
                )}

                {/* Detection Status, Progress & Feedback */}
                {isDetecting && (
                  <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-950/30 border border-orange-800/50 rounded-lg p-2.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400 shrink-0" />
                    <span>Analisando produto...</span>
                  </div>
                )}

                {detectionError && (
                  <div className="text-xs text-amber-200 bg-amber-950/30 border border-amber-800/60 rounded-lg p-2.5 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="flex-1">{detectionError}</span>
                  </div>
                )}

                {detectionResult && !isDetecting && (
                  <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-medium text-neutral-200">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                        <span>Detectado automaticamente</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500 text-[11px]">Confiança:</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          detectionResult.confidence === 'HIGH'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/70'
                            : detectionResult.confidence === 'MEDIUM'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/70'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}>
                          {detectionResult.confidence === 'HIGH' ? 'Alta' : detectionResult.confidence === 'MEDIUM' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-400 text-[11px]">
                      <div>
                        <span className="text-neutral-500">Categoria:</span>{' '}
                        <span className="text-neutral-300 font-medium">{detectionResult.productCategory || 'Geral'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Arquétipo:</span>{' '}
                        <span className="text-neutral-300 font-medium">{detectionResult.productArchetype}</span>
                      </div>
                      {detectionResult.canonicalColor && (
                        <div>
                          <span className="text-neutral-500">Cor:</span>{' '}
                          <span className="text-neutral-300 font-medium">{detectionResult.canonicalColor}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-neutral-900">
                      <button
                        type="button"
                        onClick={() => triggerImageDetection(productImage!, detectionSource || 'upload')}
                        className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Analisar novamente
                      </button>

                      {pendingDetectionNotice && (
                        <button
                          type="button"
                          onClick={applyDetectedData}
                          className="px-2.5 py-1 text-[11px] font-medium text-orange-300 bg-orange-950/60 hover:bg-orange-900/80 border border-orange-800/80 rounded transition-colors"
                        >
                          Usar dados detectados
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Shopee Native Creator Preset Card */}
            <div className="rounded-xl bg-gradient-to-br from-neutral-900 via-orange-950/20 to-neutral-900 border border-orange-500/30 p-5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white tracking-wide">
                    SHOPEE_NATIVE_CREATOR
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/40">
                    Prioridade Oficial Shopee
                  </span>
                </div>
                <span className="text-xs text-orange-300 font-medium">Preset Ativo</span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                Prioriza o padrão nativo de conteúdo recomendado pela Shopee com foco na Cena 2 em prova física visível do benefício falado:
              </p>

              {/* 5-step visual flow */}
              <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Sequência do Conteúdo (Shopee Native Pattern):
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-medium">
                    1. Product in Use
                  </span>
                  <span className="text-neutral-600">→</span>
                  <span className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-medium">
                    2. Feature Demonstration
                  </span>
                  <span className="text-neutral-600">→</span>
                  <span className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-medium">
                    3. Practical Benefit
                  </span>
                  <span className="text-neutral-600">→</span>
                  <span className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-medium">
                    4. Personal Opinion
                  </span>
                  <span className="text-neutral-600">→</span>
                  <span className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-medium">
                    5. Native Shopee CTA
                  </span>
                </div>
              </div>

              {/* Preferred Structures Quick Pick */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-neutral-400 font-medium">
                  Estruturas Preferenciais Recomendadas (clique rápido):
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: ShopeeCopyStructure.PRODUCT_IN_USE, label: 'Produto em Uso' },
                    { id: ShopeeCopyStructure.FEATURE_TO_BENEFIT, label: 'Diferencial → Benefício' },
                    { id: ShopeeCopyStructure.PERSONAL_REVIEW, label: 'Review Pessoal' }
                  ].map((pref) => {
                    const isSelected = selectedStructure === pref.id;
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => setSelectedStructure(pref.id)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-300'
                            : 'bg-neutral-950/80 border border-orange-800/40 text-orange-200 hover:border-orange-500/50'
                        }`}
                      >
                        ✓ {pref.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Exact Structure Selector */}
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-400" />
                  Estrutura Narrativa
                </h2>
                <span className="text-xs text-neutral-400">11 opções</span>
              </div>
              <p className="text-xs text-neutral-400">
                Determina o arcabouço argumentativo e o foco da CENA 2 no roteiro:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {structureEntries.map(([key, def]) => {
                  const isSelected = selectedStructure === key;
                  const isPreferred = [
                    ShopeeCopyStructure.PRODUCT_IN_USE,
                    ShopeeCopyStructure.FEATURE_TO_BENEFIT,
                    ShopeeCopyStructure.PERSONAL_REVIEW
                  ].includes(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedStructure(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400'
                          : isPreferred
                          ? 'bg-neutral-950 border border-orange-800/60 text-orange-200 hover:border-orange-500/70 hover:text-white'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                      }`}
                      title={def.description}
                    >
                      {isPreferred && <span className="text-[10px] text-orange-400 font-bold">★</span>}
                      <span>[{def.label}]</span>
                    </button>
                  );
                })}
              </div>
              {/* Selected Structure Info */}
              <div className="text-xs text-neutral-400 bg-neutral-950/70 p-3 rounded-lg border border-neutral-800/80">
                <strong className="text-orange-400">Foco Cena 2:</strong>{' '}
                {SHOPEE_STRUCTURE_DEFINITIONS[selectedStructure]?.scene2Focus}
              </div>
            </div>

            {/* 3. Exact Style Selector */}
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  Estilo de Voz
                </h2>
                <span className="text-xs text-neutral-400">10 opções</span>
              </div>
              <p className="text-xs text-neutral-400">
                Calibra o tom emocional, o ritmo e a postura falada no vídeo:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {styleEntries.map(([key, def]) => {
                  const isSelected = selectedStyle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedStyle(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                      }`}
                      title={def.description}
                    >
                      [{def.label}]
                    </button>
                  );
                })}
              </div>
              {/* Selected Style Info */}
              <div className="text-xs text-neutral-400 bg-neutral-950/70 p-3 rounded-lg border border-neutral-800/80">
                <strong className="text-orange-400">Tom de Voz:</strong>{' '}
                {SHOPEE_STYLE_DEFINITIONS[selectedStyle]?.toneGuidelines}
              </div>
            </div>

            {/* 4. Exact Output Mode Selector */}
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  Saída da Copy
                </h2>
                <span className="text-xs text-neutral-400">4 modos</span>
              </div>
              <p className="text-xs text-neutral-400">
                Escolha a prioridade de geração e exibição dos blocos de cena:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {outputModeEntries.map(([key, def]) => {
                  const isSelected = selectedOutputMode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedOutputMode(key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                      }`}
                      title={def.description}
                    >
                      [{def.label}]
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-neutral-400 bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80">
                {SHOPEE_OUTPUT_MODE_DEFINITIONS[selectedOutputMode]?.description}
              </div>
            </div>

            {/* 5. Shopee Call to Action (CTA) & Guardrails */}
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-400" />
                  Chamada para Ação (CTA Shopee)
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: ShopeeCTAType.PRODUTO_MARCADO, label: 'Produto Marcado', hint: '"clique no produto marcado aqui embaixo"' },
                  { id: ShopeeCTAType.LINK_SHOPEE, label: 'Link da Shopee', hint: '"link da Shopee na bio/descrição"' },
                  { id: ShopeeCTAType.SACOLINHA, label: 'Sacolinha', hint: '"conferir na sacolinha aqui embaixo"' },
                  { id: ShopeeCTAType.ICONE_PRODUTO, label: 'Ícone do Produto', hint: '"clique no ícone do produto aqui embaixo"' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedCta(item.id)}
                    className={`p-2.5 text-left rounded-lg text-xs border transition-all ${
                      selectedCta === item.id
                        ? 'bg-orange-500/15 border-orange-500 text-orange-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-semibold text-white">[{item.label}]</div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">{item.hint}</div>
                  </button>
                ))}
              </div>

              {/* Guardrails Checkboxes */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Evidências Comerciais Comprovadas (Anti-Alucinação):
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evidence.hasExplicitShipping}
                      onChange={(e) => setEvidence({ ...evidence, hasExplicitShipping: e.target.checked })}
                      className="rounded bg-neutral-950 border-neutral-700 text-orange-500 focus:ring-orange-500"
                    />
                    Frete Grátis Comprovado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evidence.hasExplicitCoupon}
                      onChange={(e) => setEvidence({ ...evidence, hasExplicitCoupon: e.target.checked })}
                      className="rounded bg-neutral-950 border-neutral-700 text-orange-500 focus:ring-orange-500"
                    />
                    Cupom Visível na Tela
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evidence.hasExplicitDiscount}
                      onChange={(e) => setEvidence({ ...evidence, hasExplicitDiscount: e.target.checked })}
                      className="rounded bg-neutral-950 border-neutral-700 text-orange-500 focus:ring-orange-500"
                    />
                    Desconto Comprovado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evidence.hasExplicitStockLimit}
                      onChange={(e) => setEvidence({ ...evidence, hasExplicitStockLimit: e.target.checked })}
                      className="rounded bg-neutral-950 border-neutral-700 text-orange-500 focus:ring-orange-500"
                    />
                    Estoque Limitado Real
                  </label>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              id="shopee-generate-button"
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2.5 text-sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando 6 Variações Shopee (160–175 caracteres)...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar 6 Cópias Shopee Conformes
                </>
              )}
            </button>

          </div>

          {/* Right Column: Generated 6 Variations */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookmarkCheck className="w-5 h-5 text-orange-400" />
                  Variações Geradas
                </h2>
                {variations.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300">
                    {variations.length} versões
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">
                Contrato rígido: 160–175 caracteres
              </span>
            </div>

            {variations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 p-12 text-center space-y-3 bg-neutral-900/30">
                <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-300">Nenhuma copy gerada ainda</h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Configure o nome do produto, selecione Estrutura, Estilo e Saída, e clique em{' '}
                  <strong className="text-orange-400">&quot;Gerar 6 Cópias Shopee Conformes&quot;</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {variations.map((v) => {
                  const isSelected = selectedVariationId === v.id;
                  const isUsed = usedVariationIds.includes(v.id);
                  const s2Length = v.scene2.length;
                  const s3Length = v.scene3.length;
                  const showScene2 =
                    selectedOutputMode === ShopeeCopyOutputMode.FULL_COPY ||
                    selectedOutputMode === ShopeeCopyOutputMode.SCENE_2 ||
                    selectedOutputMode === ShopeeCopyOutputMode.SCENE_2_AND_3;
                  const showScene3 =
                    selectedOutputMode === ShopeeCopyOutputMode.FULL_COPY ||
                    selectedOutputMode === ShopeeCopyOutputMode.SCENE_3 ||
                    selectedOutputMode === ShopeeCopyOutputMode.SCENE_2_AND_3;

                  // Audit copy compliance
                  const complianceReport = ShopeeVideoComplianceGuard.audit({
                    copyText: `${v.scene2} ${v.scene3}`,
                    commercialEvidence: evidence,
                    ctaMode: selectedCta
                  });

                  return (
                    <div
                      key={v.id}
                      className={`rounded-xl border transition-all p-4 space-y-3 ${
                        complianceReport.isBlocked
                          ? 'bg-neutral-900/60 border-red-900/60'
                          : isSelected
                          ? 'bg-neutral-900/95 border-orange-500/80 shadow-md shadow-orange-500/10'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {/* Variation Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              complianceReport.isBlocked
                                ? 'bg-red-900/80 text-red-200'
                                : isSelected
                                ? 'bg-orange-500 text-white'
                                : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {v.id}
                          </span>
                          <span className="text-xs font-semibold text-neutral-200">
                            Versão #{v.id}
                          </span>
                          {isUsed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-400">
                              Já Utilizada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Mark as Used toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleUsed(v.id)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              isUsed
                                ? 'text-amber-400 bg-amber-400/10'
                                : 'text-neutral-500 hover:text-neutral-300 bg-neutral-800/60'
                            }`}
                            title={isUsed ? 'Marcar como não usada' : 'Marcar como usada'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Full Variation */}
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                `CENA 2:\n${v.scene2}\n\nCENA 3:\n${v.scene3}`,
                                `full-${v.id}`
                              )
                            }
                            className="p-1.5 rounded-lg text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center gap-1"
                            title="Copiar Cena 2 + Cena 3"
                          >
                            {copiedKey === `full-${v.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Select for Creative Director */}
                          <button
                            type="button"
                            disabled={complianceReport.isBlocked}
                            onClick={() => !complianceReport.isBlocked && handleSelectForCreativeDirector(v)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              complianceReport.isBlocked
                                ? 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                                : isSelected
                                ? 'bg-orange-500 text-white'
                                : 'bg-orange-500/15 text-orange-300 hover:bg-orange-500/30'
                            }`}
                            title={
                              complianceReport.isBlocked
                                ? 'Bloqueado: revise as violações de conformidade antes de exportar'
                                : 'Usar no Roteiro'
                            }
                          >
                            <Send className="w-3 h-3" />
                            <span>
                              {complianceReport.isBlocked
                                ? 'Bloqueado'
                                : isSelected
                                ? 'Selecionada'
                                : 'Usar no Roteiro'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Video Health Preflight Panel */}
                      <ShopeeCompliancePreflightPanel
                        report={complianceReport}
                        title={`SHOPEE VIDEO HEALTH — VERSÃO #${v.id}`}
                      />

                      {/* Scene 2 Block */}
                      {showScene2 && (
                        <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                              Cena 2 — Demonstração & Benefício
                            </span>
                            <div className="flex items-center gap-2">
                              {renderCharBadge(s2Length)}
                              <button
                                type="button"
                                onClick={() => handleCopy(v.scene2, `s2-${v.id}`)}
                                className="text-neutral-500 hover:text-white"
                                title="Copiar Cena 2"
                              >
                                {copiedKey === `s2-${v.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-neutral-200 leading-relaxed font-sans select-text">
                            {v.scene2}
                          </p>
                        </div>
                      )}

                      {/* Scene 3 Block */}
                      {showScene3 && (
                        <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-800/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">
                              Cena 3 — Fechamento & CTA Shopee
                            </span>
                            <div className="flex items-center gap-2">
                              {renderCharBadge(s3Length)}
                              <button
                                type="button"
                                onClick={() => handleCopy(v.scene3, `s3-${v.id}`)}
                                className="text-orange-400 hover:text-white"
                                title="Copiar Cena 3"
                              >
                                {copiedKey === `s3-${v.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-orange-100 leading-relaxed font-sans select-text">
                            {v.scene3}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
