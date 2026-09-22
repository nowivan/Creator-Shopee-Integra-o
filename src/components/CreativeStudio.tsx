import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { processGeminiAPI, copyToClipboard, safeJSONParse } from '../utils';
import {
    TranslationMode,
    TRANSLATION_MODES,
    SOURCE_LANGUAGES,
    TARGET_LANGUAGES,
    buildTranslationPrompt,
    buildStrictRetryPrompt,
    extractProtectedTerms,
    preserveTranslationFormatting,
    validateTranslationFaithfulness,
    formatCopyAllText
} from '../features/translator/translatorLogic';
import {
    TryOnOutputMode,
    TryOnCampaignType,
    TryOnTakeCount,
    TryOnFormat,
    TryOnSceneStyle,
    TryOnPlatform,
    TryOnCampaignResult,
    TryOnReferenceType,
    TRY_ON_CAMPAIGN_TYPES,
    TRY_ON_FORMATS,
    TRY_ON_SCENE_STYLES,
    TRY_ON_PLATFORMS
} from '../features/try-on/types';
import {
    buildTryOnCampaignPrompt,
    TECHNICAL_PROMPT_LANGUAGE_LOCK
} from '../features/try-on/tryOnCampaignLogic';
import {
    buildStoryboardReferenceLock,
    buildStoryboardReferenceNegativeAdditions
} from '../features/try-on/storyboardReferenceLock';
import {
    AFFILIATE_PLATFORMS,
    AffiliatePlatform,
    getAffiliatePlatformConfig,
    buildAffiliateClaimSafetyLock,
    buildAffiliatePlatformImageGuidance,
    buildAffiliatePlatformNegativeAdditions
} from '../features/try-on/affiliatePlatformModes';
import {
    ThumbnailTextMode,
    buildAffiliateThumbnailPrompt
} from '../features/try-on/affiliateThumbnailMode';
import {
    TryOnCampaignStoryboard
} from '../features/try-on/components/TryOnCampaignStoryboard';
import {
    EditorialTextMode,
    EditorialStoryboardResult,
    EDITORIAL_BRAND_SAFETY_WARNING,
    buildEditorialStoryboardPrompt,
    buildEditorialStoryboardLock
} from '../features/try-on/editorialStoryboardMode';
import {
    EditorialStoryboardPanel
} from '../features/try-on/components/EditorialStoryboardPanel';
import {
    VideoEditModesPanel
} from '../features/try-on/components/VideoEditModesPanel';
import {
    PresetPickerBar,
    PresetDefinition,
    mergePresets,
    buildMergedPresetSummaryText,
    getPresetByCode
} from '../features/preset-library';

interface CreativeStudioProps {
    currentKey: string;
}

// ────────────────────────────────━━━ TRY-ON (PROVADOR IA) ━━━────────────────────────────────
export type TryOnPasteTarget = "person" | "garment" | "visualReference";

export function TryOnView({ currentKey }: CreativeStudioProps) {
    const [personFile, setPersonFile] = useState<File | null>(null);
    const [personUrl, setPersonUrl] = useState('');
    const [clothingFile, setClothingFile] = useState<File | null>(null);
    const [clothingUrl, setClothingUrl] = useState('');
    const [visualRefFile, setVisualRefFile] = useState<File | null>(null);
    const [visualRefUrl, setVisualRefUrl] = useState('');
    const [referenceType, setReferenceType] = useState<TryOnReferenceType>('pose_style');
    
    // Preset Library State
    const [selectedPresets, setSelectedPresets] = useState<PresetDefinition[]>([]);

    const handleAddPreset = (preset: PresetDefinition) => {
        if (!selectedPresets.some(p => p.code === preset.code)) {
            const next = [...selectedPresets, preset];
            setSelectedPresets(next);
            showToast('success', `Preset ${preset.code} (${preset.label}) aplicado!`);

            // If preset has a suggested campaign type, sync campaign settings
            if (preset.suggestedCampaignType) {
                setCampaignType(preset.suggestedCampaignType as TryOnCampaignType);
                const opt = TRY_ON_CAMPAIGN_TYPES.find(o => o.id === preset.suggestedCampaignType);
                if (opt?.defaultSceneStyle) setSceneStyle(opt.defaultSceneStyle);
                if (opt?.defaultPlatform) setPlatform(opt.defaultPlatform);
            }
        }
    };

    const handleRemovePreset = (presetCode: string) => {
        setSelectedPresets(prev => prev.filter(p => p.code !== presetCode));
        showToast('info', `Preset ${presetCode} removido.`);
    };

    const handleClearAllPresets = () => {
        setSelectedPresets([]);
        showToast('info', 'Todos os presets foram removidos.');
    };
    
    // Output Mode & Campaign Configuration State
    const [outputMode, setOutputMode] = useState<TryOnOutputMode>('single');
    const [campaignType, setCampaignType] = useState<TryOnCampaignType>('shopee_clean_demo');
    const [takeCount, setTakeCount] = useState<TryOnTakeCount>(5);
    const [format, setFormat] = useState<TryOnFormat>('no_dialogue');
    const [sceneStyle, setSceneStyle] = useState<TryOnSceneStyle>('white_background');
    const [platform, setPlatform] = useState<TryOnPlatform>('shopee');
    const [campaignCategoryFilter, setCampaignCategoryFilter] = useState<'all' | 'affiliate' | 'fashion'>('all');
    const [thumbnailTextMode, setThumbnailTextMode] = useState<ThumbnailTextMode>('no_text');
    const [thumbnailHeadline, setThumbnailHeadline] = useState<string>('');

    const handleSelectPreset = (presetId: TryOnCampaignType) => {
        setCampaignType(presetId);
        const opt = TRY_ON_CAMPAIGN_TYPES.find(o => o.id === presetId);
        if (opt?.defaultSceneStyle) {
            setSceneStyle(opt.defaultSceneStyle);
        }
        if (opt?.defaultPlatform) {
            setPlatform(opt.defaultPlatform);
        }
    };

    const [pasteTarget, setPasteTarget] = useState<TryOnPasteTarget | null>(null);
    const [isDraggingPerson, setIsDraggingPerson] = useState(false);
    const [isDraggingClothing, setIsDraggingClothing] = useState(false);
    const [isDraggingVisualRef, setIsDraggingVisualRef] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'info' | 'error'; message: string } | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [campaignResult, setCampaignResult] = useState<TryOnCampaignResult | null>(null);
    const [editorialResult, setEditorialResult] = useState<EditorialStoryboardResult | null>(null);
    const [editorialTextMode, setEditorialTextMode] = useState<EditorialTextMode>('no_text');
    const [editorialCustomText, setEditorialCustomText] = useState<string>('');
    const [editorialShotCount, setEditorialShotCount] = useState<number>(9);

    const personInputRef = useRef<HTMLInputElement>(null);
    const clothingInputRef = useRef<HTMLInputElement>(null);
    const visualRefInputRef = useRef<HTMLInputElement>(null);

    const showToast = (type: 'success' | 'warning' | 'info' | 'error', message: string) => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setToast({ type, message });
        toastTimeoutRef.current = setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    const handleSetPersonFile = (f: File, source: 'upload' | 'drop' | 'paste' = 'upload') => {
        if (!f.type.startsWith('image/')) {
            showToast('error', 'Formato não suportado. Envie uma imagem válida (PNG, JPG, WEBP).');
            return false;
        }
        if (personUrl) URL.revokeObjectURL(personUrl);
        setPersonFile(f);
        setPersonUrl(URL.createObjectURL(f));
        setPasteTarget("person");
        if (source === 'paste') {
            showToast('success', 'Imagem colada em Pessoa/Avatar');
        }
        return true;
    };

    const handleSetClothingFile = (f: File, source: 'upload' | 'drop' | 'paste' = 'upload') => {
        if (!f.type.startsWith('image/')) {
            showToast('error', 'Formato não suportado. Envie uma imagem válida (PNG, JPG, WEBP).');
            return false;
        }
        if (clothingUrl) URL.revokeObjectURL(clothingUrl);
        setClothingFile(f);
        setClothingUrl(URL.createObjectURL(f));
        setPasteTarget("garment");
        if (source === 'paste') {
            showToast('success', 'Imagem colada em Peça / Acessório');
        }
        return true;
    };

    const handleSetVisualRefFile = (f: File, source: 'upload' | 'drop' | 'paste' = 'upload') => {
        if (!f.type.startsWith('image/')) {
            showToast('error', 'Formato não suportado. Envie uma imagem válida (PNG, JPG, WEBP).');
            return false;
        }
        if (visualRefUrl) URL.revokeObjectURL(visualRefUrl);
        setVisualRefFile(f);
        setVisualRefUrl(URL.createObjectURL(f));
        setPasteTarget("visualReference");
        if (source === 'paste') {
            showToast('success', 'Imagem colada em Referência Visual / Pose');
        }
        return true;
    };

    const handleRemovePerson = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (personUrl) URL.revokeObjectURL(personUrl);
        setPersonFile(null);
        setPersonUrl('');
        setPasteTarget("person");
    };

    const handleRemoveClothing = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (clothingUrl) URL.revokeObjectURL(clothingUrl);
        setClothingFile(null);
        setClothingUrl('');
        setPasteTarget("garment");
    };

    const handleRemoveVisualRef = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (visualRefUrl) URL.revokeObjectURL(visualRefUrl);
        setVisualRefFile(null);
        setVisualRefUrl('');
        setPasteTarget("visualReference");
    };

    // Helper to safely extract image file from clipboard
    const getImageFileFromClipboard = (event: ClipboardEvent): File | null => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file && file.type.startsWith("image/")) {
                    return file;
                }
            }
        }
        return null;
    };

    // Global and localized paste handling
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            // If the user is currently typing in an input/textarea (other than our upload dropzones), do not intercept
            const activeEl = document.activeElement;
            const isTextInput = activeEl && (
                (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text') ||
                activeEl.tagName === 'TEXTAREA'
            );
            if (isTextInput) return;

            const imageFile = getImageFileFromClipboard(e);

            if (!imageFile) {
                // If there's clipboard content but no image (e.g. text only)
                const hasClipboardData = Boolean(e.clipboardData?.items?.length || e.clipboardData?.types?.length);
                if (hasClipboardData) {
                    showToast('info', 'Nenhuma imagem encontrada na área de transferência.');
                }
                return;
            }

            e.preventDefault();

            // Determine target slot
            let target: TryOnPasteTarget | null = pasteTarget;

            if (!target) {
                if (!personFile) {
                    target = "person";
                } else if (!clothingFile) {
                    target = "garment";
                } else if (!visualRefFile) {
                    target = "visualReference";
                } else {
                    // All 3 are filled and no zone was explicitly selected
                    showToast('warning', 'Clique no campo que deseja substituir antes de colar.');
                    return;
                }
            }

            if (target === "person") {
                handleSetPersonFile(imageFile, 'paste');
            } else if (target === "garment") {
                handleSetClothingFile(imageFile, 'paste');
            } else if (target === "visualReference") {
                handleSetVisualRefFile(imageFile, 'paste');
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, [pasteTarget, personFile, clothingFile, visualRefFile, personUrl, clothingUrl, visualRefUrl]);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            if (personUrl) URL.revokeObjectURL(personUrl);
            if (clothingUrl) URL.revokeObjectURL(clothingUrl);
            if (visualRefUrl) URL.revokeObjectURL(visualRefUrl);
        };
    }, []);

    const fileToBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result?.toString().split(',')[1] || ''); r.onerror = reject; r.readAsDataURL(f);
    });

    const handleGenerate = async () => {
        if (referenceType === 'editorial_storyboard') {
            if (!clothingFile) return alert("Selecione a Imagem do Produto Principal (Imagem 2).");
            if (!visualRefFile) return alert("Selecione a Referência de Storyboard Editorial (Imagem 3).");
        } else if (outputMode === 'thumbnail') {
            if (!clothingFile) return alert("Selecione a Imagem do Produto Principal (Imagem 2).");
        } else {
            if (!personFile || !clothingFile) return alert("Selecione pelo menos a Pessoa (Imagem 1) e a Peça/Acessório (Imagem 2).");
        }
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        try {
            const personB64 = personFile ? await fileToBase64(personFile) : null;
            const clothingB64 = await fileToBase64(clothingFile);
            const visualRefB64 = visualRefFile ? await fileToBase64(visualRefFile) : null;

            // Merge any active presets
            const mergedPresetsData = selectedPresets.length > 0 ? mergePresets(selectedPresets) : null;
            const presetDirectivesText = mergedPresetsData ? `
MASTER PRESETS APPLIED: ${mergedPresetsData.appliedPresets.map(p => `${p.code} (${p.label})`).join(', ')}
${mergedPresetsData.promptAdditions ? `STYLE PROMPT DIRECTIVES: ${mergedPresetsData.promptAdditions}` : ''}
${mergedPresetsData.visualDNA.length > 0 ? `VISUAL DNA GUIDELINES:\n${mergedPresetsData.visualDNA.map(v => `- ${v}`).join('\n')}` : ''}
${mergedPresetsData.negativePromptAdditions ? `NEGATIVE CONSTRAINTS: ${mergedPresetsData.negativePromptAdditions}` : ''}
` : '';

            if (referenceType === 'editorial_storyboard') {
                const editorialPrompt = buildEditorialStoryboardPrompt({
                    textMode: editorialTextMode,
                    customText: editorialCustomText,
                    shotCount: editorialShotCount,
                    presetGuidelines: presetDirectivesText || undefined,
                    platform
                });

                const parts: any[] = [
                    { text: editorialPrompt },
                    { inlineData: { mimeType: clothingFile.type, data: clothingB64 } }
                ];

                if (visualRefFile && visualRefB64) {
                    parts.push({ inlineData: { mimeType: visualRefFile.type, data: visualRefB64 } });
                }

                if (personFile && personB64) {
                    parts.unshift({ inlineData: { mimeType: personFile.type, data: personB64 } });
                }

                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                const parsed = safeJSONParse(responseText, null) as EditorialStoryboardResult | null;
                if (parsed && Array.isArray(parsed.shots) && parsed.shots.length > 0) {
                    setEditorialResult(parsed);
                    setResult(null);
                    setCampaignResult(null);
                    showToast('success', 'Storyboard Editorial gerado com sucesso!');
                } else {
                    throw new Error("Não foi possível estruturar o storyboard editorial. Tente novamente.");
                }
            } else if (outputMode === 'thumbnail') {
                setEditorialResult(null);
                const thumbnailPrompt = buildAffiliateThumbnailPrompt({
                    platform,
                    textMode: thumbnailTextMode,
                    headline: thumbnailHeadline
                });

                const parts: any[] = [
                    { text: `
                        You are an AI Virtual Try-On Specialist and Affiliate Video Thumbnail Art Director.
                        
                        ${TECHNICAL_PROMPT_LANGUAGE_LOCK}

                        MASTER INSTRUCTION:
                        ${thumbnailPrompt}

                        ${presetDirectivesText ? `\nPRESET STYLE DIRECTIVES:\n${presetDirectivesText}\n` : ''}

                        Return ONLY valid JSON containing:
                        {
                            "prompt_en": "Complete 9:16 static composition prompt written entirely in technical English incorporating the Affiliate Thumbnail Lock. If a Portuguese headline is rendered, specify it as: VISIBLE TEXT: Render only this exact Portuguese text: '[exact headline]'",
                            "clothing_details": "Instruções de preservação de fidelidade do produto em português...",
                            "person_details": "Instruções de composição limpa 9:16 e destaque do produto em português..."
                        }
                    ` },
                    { inlineData: { mimeType: clothingFile.type, data: clothingB64 } }
                ];

                if (personFile && personB64) {
                    parts.push({ inlineData: { mimeType: personFile.type, data: personB64 } });
                }

                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                const parsed = safeJSONParse(responseText, {});
                setResult(parsed);
                setCampaignResult(null);
            } else if (outputMode === 'single') {
                const isStoryboard = visualRefFile && referenceType === 'ugc_storyboard';
                const prompt = visualRefFile ? (
                    isStoryboard ? `
                        You are an AI Virtual Try-On Specialist and UGC Director. Analyze the person in Image 1, the main product in Image 2, and the UGC reference storyboard in Image 3.

                        ${TECHNICAL_PROMPT_LANGUAGE_LOCK}

                        IMAGE AUTHORITY MANDATES:
                        1. Image 1 (Person / Avatar): Controls facial identity, skin tone, hair, anatomical proportions.
                        2. Image 2 (Main Product): Controls exact product category, shape, color, material, texture, scale, and craftsmanship details.
                        SKELETON WATCH STATIC DIAL & ADVANCED REGION MANDATE: If the product is a watch with visible internal gears, skeleton dial, transparent dial, open-heart or tourbillon details, freeze the entire watch dial completely (zero animation on internal gears, hands, or mechanism) and lock the upper-left gear between 10 and 11 o'clock.
                        
                        ${buildAffiliateClaimSafetyLock()}

                        ${buildAffiliatePlatformImageGuidance(platform)}

                        3. Image 3 (UGC Storyboard / Scene Reference):
                        ${buildStoryboardReferenceLock()}

                        NEGATIVE CONSTRAINTS TO ADD:
                        ${buildStoryboardReferenceNegativeAdditions()}
                        ${buildAffiliatePlatformNegativeAdditions(platform)}

                        ${presetDirectivesText ? `\nPRESET STYLE DIRECTIVES:\n${presetDirectivesText}\n` : ''}

                        Generate a detailed English diffusion prompt that instructs a video/image diffusion model to fit this exact product onto the person, inspired by the poses, framing, and UGC rhythm of the storyboard without copying any grid, collage, text, or numbering ${presetDirectivesText ? 'and active style presets' : ''}.
                        
                        Return ONLY valid JSON containing:
                        {
                            "prompt_en": "Complete technical generation prompt in English incorporating the UGC Storyboard Reference Lock. If visible Portuguese text is rendered, specify as: VISIBLE TEXT: Render only this exact Portuguese text: '[exact text]'",
                            "clothing_details": "Instruções de preservação da roupa/acessório em português...",
                            "person_details": "Instruções de preservação do modelo em português...",
                            "storyboard_reference_details": "Instruções de sequência de cena, poses, ângulos e ritmo UGC guiados pela Imagem 3 (sem cópia de grade/layout) em português..."
                        }
                    ` : `
                        You are an AI Virtual Try-On Specialist. Analyze the person in Image 1, the garment/accessory in Image 2, and the visual/pose reference in Image 3.

                        ${TECHNICAL_PROMPT_LANGUAGE_LOCK}

                        IMAGE AUTHORITY MANDATES:
                        1. Image 1 (Person / Avatar): Controls facial identity, skin tone, hair, anatomical proportions.
                        2. Image 2 (Garment / Accessory): Controls exact product, category, shape, color, material, texture, scale, and craftsmanship details.
                        SKELETON WATCH STATIC DIAL & ADVANCED REGION MANDATE: If the product is a watch with visible internal gears, skeleton dial, transparent dial, open-heart or tourbillon details, freeze the entire watch dial completely (zero animation on internal gears, hands, or mechanism) and lock the upper-left gear between 10 and 11 o'clock.
                        
                        ${buildAffiliateClaimSafetyLock()}

                        ${buildAffiliatePlatformImageGuidance(platform)}

                        3. Image 3 (Visual Reference / Pose / Angle):
                        VISUAL REFERENCE LOCK:
                        Use Image 3 only as visual direction: pose, angle, composition, lighting, mood and background style.
                        Do not copy the person, face, clothing, accessories, product, logos, text or identity from Image 3.

                        NEGATIVE CONSTRAINTS TO ADD:
                        ${buildAffiliatePlatformNegativeAdditions(platform)}

                        ${presetDirectivesText ? `\nPRESET STYLE DIRECTIVES:\n${presetDirectivesText}\n` : ''}

                        Generate a detailed English diffusion prompt that instructs an image diffusion model (Stable Diffusion, Midjourney, Flux) to dress this exact garment/accessory onto the person, following the reference pose/style while preserving physical identity and product details ${presetDirectivesText ? 'and active style presets' : ''}.
                        
                        Return ONLY valid JSON containing:
                        {
                            "prompt_en": "Detailed image generation prompt in English incorporating the Visual Reference Lock. If visible Portuguese text is rendered, specify as: VISIBLE TEXT: Render only this exact Portuguese text: '[exact text]'",
                            "clothing_details": "Instruções de preservação da roupa/acessório em português...",
                            "person_details": "Instruções de preservação do modelo em português...",
                            "visual_reference_details": "Instruções de pose, iluminação e enquadramento guiados pela Imagem 3 (sem copiar pessoa/produto) em português..."
                        }
                    `
                ) : `
                    You are an AI Virtual Try-On Specialist. Analyze the person in Image 1 and the garment/accessory in Image 2.

                    ${TECHNICAL_PROMPT_LANGUAGE_LOCK}

                    SKELETON WATCH STATIC DIAL & ADVANCED REGION MANDATE: If the product is a watch with visible internal gears, skeleton dial, transparent dial, open-heart or tourbillon details, freeze the entire watch dial completely (zero animation on internal gears, hands, or mechanism) and lock the upper-left gear between 10 and 11 o'clock.
                    
                    ${buildAffiliateClaimSafetyLock()}

                    ${buildAffiliatePlatformImageGuidance(platform)}

                    NEGATIVE CONSTRAINTS TO ADD:
                    ${buildAffiliatePlatformNegativeAdditions(platform)}

                    ${presetDirectivesText ? `\nPRESET STYLE DIRECTIVES:\n${presetDirectivesText}\n` : ''}
                    Generate a detailed English diffusion prompt that instructs an image diffusion model (Stable Diffusion, Midjourney, Flux) to dress this exact garment/accessory onto the person, preserving the physical identity (face, hair, skin tone) and essential item details (color, pattern, neckline, model) ${presetDirectivesText ? 'and active style presets' : ''}.
                    
                    Return ONLY valid JSON containing:
                    {
                        "prompt_en": "Detailed image generation prompt written entirely in technical English. If visible Portuguese text is rendered, specify as: VISIBLE TEXT: Render only this exact Portuguese text: '[exact text]'",
                        "clothing_details": "Instruções de preservação da roupa/acessório em português...",
                        "person_details": "Instruções de preservação do modelo em português..."
                    }
                `;

                const parts: any[] = [
                    { text: prompt },
                    { inlineData: { mimeType: personFile.type, data: personB64 } },
                    { inlineData: { mimeType: clothingFile.type, data: clothingB64 } }
                ];

                if (visualRefFile && visualRefB64) {
                    parts.push({ inlineData: { mimeType: visualRefFile.type, data: visualRefB64 } });
                }

                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                const parsed = safeJSONParse(responseText, {});
                setResult(parsed);
                setCampaignResult(null);
                setEditorialResult(null);
            } else {
                const campaignPrompt = buildTryOnCampaignPrompt(
                    campaignType, 
                    takeCount, 
                    format, 
                    sceneStyle, 
                    platform, 
                    !!visualRefFile,
                    presetDirectivesText || undefined,
                    undefined,
                    visualRefFile && referenceType === 'ugc_storyboard' ? 'product_plus_storyboard' : 'none'
                );

                const parts: any[] = [
                    { text: campaignPrompt },
                    { inlineData: { mimeType: personFile.type, data: personB64 } },
                    { inlineData: { mimeType: clothingFile.type, data: clothingB64 } }
                ];

                if (visualRefFile && visualRefB64) {
                    parts.push({ inlineData: { mimeType: visualRefFile.type, data: visualRefB64 } });
                }

                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                const parsed = safeJSONParse(responseText, null) as TryOnCampaignResult | null;
                if (parsed && Array.isArray(parsed.takes) && parsed.takes.length > 0) {
                    if (!parsed.platform) parsed.platform = platform;
                    if (!parsed.format) parsed.format = format;
                    if (!parsed.scene_style) parsed.scene_style = sceneStyle;
                    setCampaignResult(parsed);
                    setResult(null);
                    setEditorialResult(null);
                } else {
                    throw new Error("Não foi possível estruturar o storyboard da campanha. Tente novamente.");
                }
            }
        } catch (e: any) {
            alert("Erro ao processar provador virtual: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/20 mb-2">
                    <LucideIcon name="sparkles" className="w-3 h-3" /> PROVADOR & ACESSÓRIOS IA
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Provador Virtual IA (Try-On)</h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm">
                    Monte o look perfeito transpondo roupas, óculos, relógios, bolsas e acessórios em modelos com fidelidade de identidade e storyboards multi-take.
                </p>
            </div>

            {/* Notification / Toast Banner */}
            {toast && (
                <div 
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-medium animate-fade-in shadow-lg transition-all ${
                        toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' :
                        toast.type === 'warning' ? 'bg-amber-950/80 border-amber-500/40 text-amber-200' :
                        toast.type === 'error' ? 'bg-red-950/80 border-red-500/40 text-red-200' :
                        'bg-slate-900/90 border-slate-700 text-slate-200'
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        <LucideIcon 
                            name={
                                toast.type === 'success' ? 'check-circle' :
                                toast.type === 'warning' ? 'alert-triangle' :
                                toast.type === 'error' ? 'alert-circle' : 'clipboard'
                            } 
                            className="w-4 h-4 shrink-0" 
                        />
                        <span>{toast.message}</span>
                    </div>
                    <button 
                        onClick={() => setToast(null)}
                        className="text-slate-400 hover:text-white ml-3 p-1 rounded transition"
                        title="Fechar notificação"
                    >
                        <LucideIcon name="x" className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* MASTER PRESET PICKER BAR */}
            <PresetPickerBar
                selectedPresets={selectedPresets}
                onAddPreset={handleAddPreset}
                onRemovePreset={handleRemovePreset}
                onClearAllPresets={handleClearAllPresets}
                activeModule="virtual_tryon"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Inputs Column */}
                <div className="lg:col-span-5 space-y-4">
                    {/* 1. Pessoa / Avatar Dropzone */}
                    <div 
                        tabIndex={0}
                        onFocus={() => setPasteTarget("person")}
                        onMouseEnter={() => setPasteTarget("person")}
                        onClick={() => {
                            setPasteTarget("person");
                            if (!personFile) personInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                personInputRef.current?.click();
                            }
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setPasteTarget("person");
                            setIsDraggingPerson(true);
                        }}
                        onDragLeave={() => setIsDraggingPerson(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingPerson(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) handleSetPersonFile(f, 'drop');
                        }}
                        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all outline-none ${
                            personFile 
                                ? 'border-purple-500 bg-purple-500/5' 
                                : isDraggingPerson
                                    ? 'border-purple-400 bg-purple-500/20 scale-[1.01]'
                                    : pasteTarget === 'person'
                                        ? 'border-purple-400/80 bg-slate-850 shadow-md ring-1 ring-purple-500/30'
                                        : 'border-slate-700 hover:border-purple-400 hover:bg-slate-800'
                        }`}
                    >
                        <input 
                            type="file" 
                            ref={personInputRef} 
                            onChange={e => { 
                                const f = e.target.files?.[0]; 
                                if (f) handleSetPersonFile(f, 'upload');
                                e.target.value = '';
                            }} 
                            accept="image/*" 
                            className="hidden" 
                        />

                        {pasteTarget === 'person' && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <LucideIcon name="clipboard" className="w-2.5 h-2.5" /> Alvo Ctrl+V
                            </div>
                        )}

                        {!personFile ? (
                            <div className="py-4 pointer-events-none space-y-2">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                                    <LucideIcon name="user-plus" className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-200 font-bold">1. Upload da Foto da Pessoa / Avatar</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Clique, arraste ou cole com <span className="text-purple-300 font-semibold bg-purple-950/60 px-1 py-0.5 rounded border border-purple-800/60">Ctrl+V</span> a foto da pessoa/avatar
                                    </p>
                                </div>
                                <span className="inline-block text-[10px] text-slate-500 font-mono">PNG, JPG, WEBP</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative group inline-block">
                                    <img src={personUrl} alt="Pessoa / Avatar" className="max-h-40 mx-auto rounded-lg shadow-md border border-slate-700 object-contain" />
                                </div>
                                <div className="flex items-center justify-center gap-2 pt-1">
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                             e.stopPropagation();
                                            personInputRef.current?.click();
                                        }}
                                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <LucideIcon name="refresh-cw" className="w-3 h-3" /> Trocar Imagem (Ctrl+V)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleRemovePerson}
                                        className="text-[11px] bg-red-950/40 hover:bg-red-900/60 text-red-300 px-2.5 py-1 rounded-md border border-red-900/40 font-medium transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <LucideIcon name="trash-2" className="w-3 h-3" /> Remover
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Peça de Roupa / Acessório Dropzone */}
                    <div 
                        tabIndex={0}
                        onFocus={() => setPasteTarget("garment")}
                        onMouseEnter={() => setPasteTarget("garment")}
                        onClick={() => {
                            setPasteTarget("garment");
                            if (!clothingFile) clothingInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                clothingInputRef.current?.click();
                            }
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setPasteTarget("garment");
                            setIsDraggingClothing(true);
                        }}
                        onDragLeave={() => setIsDraggingClothing(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingClothing(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) handleSetClothingFile(f, 'drop');
                        }}
                        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all outline-none ${
                            clothingFile 
                                ? 'border-purple-500 bg-purple-500/5' 
                                : isDraggingClothing
                                    ? 'border-purple-400 bg-purple-500/20 scale-[1.01]'
                                    : pasteTarget === 'garment'
                                        ? 'border-purple-400/80 bg-slate-850 shadow-md ring-1 ring-purple-500/30'
                                        : 'border-slate-700 hover:border-purple-400 hover:bg-slate-800'
                        }`}
                    >
                        <input 
                            type="file" 
                            ref={clothingInputRef} 
                            onChange={e => { 
                                const f = e.target.files?.[0]; 
                                if (f) handleSetClothingFile(f, 'upload');
                                e.target.value = '';
                            }} 
                            accept="image/*" 
                            className="hidden" 
                        />

                        {pasteTarget === 'garment' && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <LucideIcon name="clipboard" className="w-2.5 h-2.5" /> Alvo Ctrl+V
                            </div>
                        )}

                        {!clothingFile ? (
                            <div className="py-4 pointer-events-none space-y-2">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                                    <LucideIcon name="shopping-bag" className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-200 font-bold">2. Upload do Produto Principal (Roupa ou Acessório)</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Clique, arraste ou cole com <span className="text-purple-300 font-semibold bg-purple-950/60 px-1 py-0.5 rounded border border-purple-800/60">Ctrl+V</span> a imagem da peça, roupa ou acessório
                                    </p>
                                </div>
                                <span className="inline-block text-[10px] text-slate-500 font-mono">PNG, JPG, WEBP (Roupas, Óculos, Bolsas, Joias, Chapéus)</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative group inline-block">
                                    <img src={clothingUrl} alt="Produto Principal" className="max-h-40 mx-auto rounded-lg shadow-md border border-slate-700 object-contain" />
                                </div>
                                <div className="flex items-center justify-center gap-2 pt-1">
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clothingInputRef.current?.click();
                                        }}
                                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <LucideIcon name="refresh-cw" className="w-3 h-3" /> Trocar Imagem (Ctrl+V)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleRemoveClothing}
                                        className="text-[11px] bg-red-950/40 hover:bg-red-900/60 text-red-300 px-2.5 py-1 rounded-md border border-red-900/40 font-medium transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <LucideIcon name="trash-2" className="w-3 h-3" /> Remover
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Referência Visual / Storyboard (Opcional) */}
                    <div className="space-y-2">
                        {/* Reference Mode Selector */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <LucideIcon name="sliders" className="w-3.5 h-3.5 text-amber-400" /> Modo da Imagem 3:
                            </span>
                            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10.5px]">
                                <button
                                    type="button"
                                    onClick={() => setReferenceType('pose_style')}
                                    className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                                        referenceType === 'pose_style'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    Pose / Estilo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReferenceType('multi_angle')}
                                    className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                                        referenceType === 'multi_angle'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    Multiângulo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReferenceType('ugc_storyboard')}
                                    className={`px-2 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                                        referenceType === 'ugc_storyboard'
                                            ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <LucideIcon name="clapperboard" className="w-2.5 h-2.5" /> Storyboard UGC
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReferenceType('editorial_storyboard')}
                                    className={`px-2 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                                        referenceType === 'editorial_storyboard'
                                            ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 font-bold'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <LucideIcon name="gem" className="w-2.5 h-2.5" /> Storyboard Editorial
                                </button>
                            </div>
                        </div>

                        <div 
                            tabIndex={0}
                            role="region"
                            aria-label="Upload de Referência Visual ou Storyboard"
                            onClick={() => {
                                setPasteTarget("visualReference");
                                if (!visualRefFile) {
                                    visualRefInputRef.current?.click();
                                }
                            }}
                            onFocus={() => setPasteTarget("visualReference")}
                            onMouseEnter={() => {
                                if (!pasteTarget || pasteTarget !== 'visualReference') {
                                    setPasteTarget("visualReference");
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    visualRefInputRef.current?.click();
                                }
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setPasteTarget("visualReference");
                                setIsDraggingVisualRef(true);
                            }}
                            onDragLeave={() => setIsDraggingVisualRef(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingVisualRef(false);
                                const f = e.dataTransfer.files?.[0];
                                if (f) handleSetVisualRefFile(f, 'drop');
                            }}
                            className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all outline-none ${
                                visualRefFile 
                                    ? referenceType === 'editorial_storyboard'
                                        ? 'border-indigo-500 bg-indigo-500/5'
                                        : referenceType === 'ugc_storyboard'
                                            ? 'border-purple-500 bg-purple-500/5'
                                            : 'border-amber-500 bg-amber-500/5' 
                                    : isDraggingVisualRef
                                        ? 'border-amber-400 bg-amber-500/20 scale-[1.01]'
                                        : pasteTarget === 'visualReference'
                                            ? 'border-amber-400/80 bg-slate-850 shadow-md ring-1 ring-amber-500/30'
                                            : 'border-slate-700 hover:border-amber-400/80 hover:bg-slate-800'
                            }`}
                        >
                            <input 
                                type="file" 
                                ref={visualRefInputRef} 
                                onChange={e => { 
                                    const f = e.target.files?.[0]; 
                                    if (f) handleSetVisualRefFile(f, 'upload');
                                    e.target.value = '';
                                }} 
                                accept="image/*" 
                                className="hidden" 
                            />

                            {pasteTarget === 'visualReference' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <LucideIcon name="clipboard" className="w-2.5 h-2.5" /> Alvo Ctrl+V
                                </div>
                            )}

                            {!visualRefFile ? (
                                <div className="py-4 pointer-events-none space-y-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                                        referenceType === 'editorial_storyboard'
                                            ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'
                                            : referenceType === 'ugc_storyboard'
                                                ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400'
                                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                    }`}>
                                        <LucideIcon name={referenceType === 'editorial_storyboard' ? 'gem' : (referenceType === 'ugc_storyboard' ? 'clapperboard' : 'sparkles')} className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1.5">
                                            <p className="text-sm text-slate-200 font-bold">
                                                {referenceType === 'editorial_storyboard'
                                                    ? '3. Moodboard / Storyboard Editorial de Produto'
                                                    : referenceType === 'ugc_storyboard' 
                                                        ? '3. Referência de Storyboard UGC' 
                                                        : referenceType === 'multi_angle'
                                                            ? '3. Colagem Multiângulo do Produto'
                                                            : '3. Referência de Estilo / Pose / Ângulo'}
                                            </p>
                                            <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                                                {referenceType === 'editorial_storyboard' ? 'Requer Imagem 3' : 'Opcional'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {referenceType === 'editorial_storyboard' ? (
                                                'Envie um moodboard ou storyboard 3x3 de campanha editorial para guiar planos, iluminação, paleta de cores e ritmo de close-ups. Não copia marcas ou rostos reais.'
                                            ) : referenceType === 'ugc_storyboard' ? (
                                                'Use uma imagem de storyboard UGC para guiar poses, ângulos, sequência e clima visual. O sistema não copiará grade, números, textos ou layout da colagem.'
                                            ) : referenceType === 'multi_angle' ? (
                                                'Use uma colagem multiângulo do produto para guiar ângulos e acabamentos detalhados.'
                                            ) : (
                                                <>Clique, arraste ou cole com <span className="text-amber-300 font-semibold bg-amber-950/60 px-1 py-0.5 rounded border border-amber-800/60">Ctrl+V</span> uma referência visual de pose, luz ou composição.</>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-amber-300/80 mt-1 italic">
                                            {referenceType === 'editorial_storyboard'
                                                ? 'Trava Editorial de Produto: Direção visual sem cópia de grade, logotipos, embalagens ou pessoas reais.'
                                                : referenceType === 'ugc_storyboard'
                                                    ? 'Identidade preservada do produto principal (Imagem 2). Storyboard guia ritmo e poses.'
                                                    : 'Esta imagem guia apenas a estética visual. Não copia a pessoa nem o produto.'}
                                        </p>
                                    </div>
                                    <span className="inline-block text-[10px] text-slate-500 font-mono">
                                        {referenceType === 'editorial_storyboard'
                                            ? 'PNG, JPG, WEBP (Moodboard 3x3 Editorial, Campanha de Moda/Produto, Storyboard de Campanha)'
                                            : referenceType === 'ugc_storyboard'
                                                ? 'PNG, JPG, WEBP (Storyboard de Cenas, Grade UGC, Sequência de Poses)'
                                                : 'PNG, JPG, WEBP (Guia de Pose, Enquadramento, Iluminação e Mood)'}
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative group inline-block">
                                        <img src={visualRefUrl} alt="Referência Visual" className="max-h-40 mx-auto rounded-lg shadow-md border border-slate-700 object-contain" />
                                    </div>
                                    <p className={`text-[11px] font-medium italic ${
                                        referenceType === 'editorial_storyboard'
                                            ? 'text-indigo-300/90'
                                            : referenceType === 'ugc_storyboard' ? 'text-purple-300/90' : 'text-amber-300/90'
                                    }`}>
                                        {referenceType === 'editorial_storyboard'
                                            ? 'Trava Editorial Ativa: Planos, iluminação, paleta de cores e ritmo extraídos como direção visual. Marcas, logos e grade 3x3 terminantemente bloqueados.'
                                            : referenceType === 'ugc_storyboard'
                                                ? 'Trava UGC Storyboard Ativa: Sequência, poses, ângulos e clima inspirados no storyboard. Proibida cópia de grade/painéis/números. Identidade preservada do produto principal.'
                                                : referenceType === 'multi_angle'
                                                    ? 'Trava Multiângulo Ativa: Ângulos e detalhes adicionais guiados pela imagem de referência.'
                                                    : 'Trava Ativa: Pose, enquadramento e luz guiados pela Imagem 3 (pessoa e produto originais preservados).'}
                                    </p>
                                    <div className="flex items-center justify-center gap-2 pt-1">
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                visualRefInputRef.current?.click();
                                            }}
                                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 font-medium transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="refresh-cw" className="w-3 h-3" /> Trocar Imagem (Ctrl+V)
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleRemoveVisualRef}
                                            className="text-[11px] bg-red-950/40 hover:bg-red-900/60 text-red-300 px-2.5 py-1 rounded-md border border-red-900/40 font-medium transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <LucideIcon name="trash-2" className="w-3 h-3" /> Remover
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controles Específicos para Storyboard Editorial de Produto */}
                        {referenceType === 'editorial_storyboard' && (
                            <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-3.5 space-y-3.5 shadow-md animate-fade-in">
                                {/* Aviso Obrigatório de Segurança de Marca */}
                                <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 flex items-start gap-2 text-amber-200/90 text-xs">
                                    <LucideIcon name="alert-triangle" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{EDITORIAL_BRAND_SAFETY_WARNING}</span>
                                </div>

                                {/* Modo de Texto */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <LucideIcon name="type" className="w-3.5 h-3.5 text-indigo-400" />
                                            Tratamento de Texto na Cena
                                        </span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setEditorialTextMode('no_text')}
                                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border flex items-center justify-center gap-1 ${
                                                editorialTextMode === 'no_text'
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                        >
                                            <LucideIcon name="eye-off" className="w-3 h-3" />
                                            <span>Sem Texto</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditorialTextMode('with_text')}
                                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border flex items-center justify-center gap-1 ${
                                                editorialTextMode === 'with_text'
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                        >
                                            <LucideIcon name="type" className="w-3 h-3" />
                                            <span>Texto Exato</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditorialTextMode('reserved_space_no_text')}
                                            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer border flex items-center justify-center gap-1 ${
                                                editorialTextMode === 'reserved_space_no_text'
                                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                        >
                                            <LucideIcon name="layout" className="w-3 h-3" />
                                            <span>Espaço Reservado</span>
                                        </button>
                                    </div>
                                </div>

                                {editorialTextMode === 'with_text' && (
                                    <div className="space-y-1.5 animate-fade-in">
                                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-indigo-400" />
                                                Texto Exato em Português
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-normal">Exato, sem tradução</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editorialCustomText}
                                            onChange={(e) => setEditorialCustomText(e.target.value)}
                                            placeholder="Ex: NOVA COLEÇÃO PREMIUM, EDIÇÃO LIMITADA..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                                        />
                                    </div>
                                )}

                                {/* Quantidade de Planos Editoriais (6 a 9) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                            <LucideIcon name="film" className="w-3.5 h-3.5 text-indigo-400" />
                                            Quantidade de Planos / Shots
                                        </label>
                                        <span className="text-[10px] font-mono font-bold text-indigo-300">
                                            {editorialShotCount} Planos Sequenciais
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[6, 7, 8, 9].map((cnt) => (
                                            <button
                                                key={cnt}
                                                type="button"
                                                onClick={() => setEditorialShotCount(cnt)}
                                                className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                    editorialShotCount === cnt
                                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                                }`}
                                            >
                                                {cnt} Shots {cnt === 9 ? '(3x3)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CONFIGURAÇÃO DE MODO DE SAÍDA */}
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
                                <LucideIcon name="sliders" className="w-3.5 h-3.5 text-purple-400" />
                                Modo de Saída
                            </label>
                            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setOutputMode('single')}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        outputMode === 'single'
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                    }`}
                                >
                                    <LucideIcon name="terminal" className="w-3.5 h-3.5" />
                                    <span>Prompt Único</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOutputMode('campaign')}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        outputMode === 'campaign'
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                    }`}
                                >
                                    <LucideIcon name="clapperboard" className="w-3.5 h-3.5" />
                                    <span>Campanha</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOutputMode('thumbnail')}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        outputMode === 'thumbnail'
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                    }`}
                                >
                                    <LucideIcon name="image" className="w-3.5 h-3.5" />
                                    <span>Capa Vídeo</span>
                                </button>
                            </div>
                        </div>

                        {/* Controles Específicos para Capa para Vídeo (Affiliate Video Thumbnail Mode) */}
                        {outputMode === 'thumbnail' && (
                            <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-fade-in">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                            <LucideIcon name="shopping-bag" className="w-3.5 h-3.5 text-amber-400" />
                                            Plataforma de Destino
                                        </label>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                            {getAffiliatePlatformConfig(platform).badge}
                                        </span>
                                    </div>

                                    {/* Platform Selector Chips */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {AFFILIATE_PLATFORMS.map((p) => {
                                            const isSelected = platform === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setPlatform(p.id)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border text-left ${
                                                        isSelected
                                                            ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500/30 font-bold'
                                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                    }`}
                                                    title={p.tagline}
                                                >
                                                    <LucideIcon 
                                                        name={p.icon} 
                                                        className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} 
                                                    />
                                                    <span className="truncate">{p.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Modo de Texto na Capa */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                        <LucideIcon name="type" className="w-3.5 h-3.5 text-purple-400" />
                                        Texto na Capa
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setThumbnailTextMode('no_text')}
                                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                                                thumbnailTextMode === 'no_text'
                                                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                                                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                        >
                                            <LucideIcon name="eye-off" className="w-3 h-3" />
                                            <span>Sem Texto (Limpa)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setThumbnailTextMode('with_text')}
                                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                                                thumbnailTextMode === 'with_text'
                                                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                                                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                                            }`}
                                        >
                                            <LucideIcon name="type" className="w-3 h-3" />
                                            <span>Com Headline / Gancho</span>
                                        </button>
                                    </div>
                                </div>

                                {thumbnailTextMode === 'with_text' && (
                                    <div className="space-y-1.5 animate-fade-in">
                                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-amber-400" />
                                                Texto da Headline (Gancho)
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-normal">Exato, sem tradução</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={thumbnailHeadline}
                                            onChange={(e) => setThumbnailHeadline(e.target.value)}
                                            placeholder="Ex: ACHADINHO QUE VALE CADA CENTAVO, 3 MOTIVOS PARA COMPRAR..."
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition"
                                        />
                                    </div>
                                )}

                                <p className="text-[11px] text-slate-400/90 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
                                    <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Gera prompt estático vertical 9:16 com produto em destaque e composição segura para feeds de vídeo, sem inventar preços ou interface simulada.</span>
                                </p>
                            </div>
                        )}

                        {/* Controles Específicos para Prompt Único (Single Image/Video Mode) */}
                        {outputMode === 'single' && (
                            <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-fade-in">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                            <LucideIcon name="shopping-bag" className="w-3.5 h-3.5 text-amber-400" />
                                            Plataforma / Canal Afiliado
                                        </label>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                            {getAffiliatePlatformConfig(platform).badge}
                                        </span>
                                    </div>

                                    {/* Compact Selector Chips */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                        {AFFILIATE_PLATFORMS.map((p) => {
                                            const isSelected = platform === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setPlatform(p.id)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border text-left ${
                                                        isSelected
                                                            ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500/30 font-bold'
                                                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                    }`}
                                                    title={p.tagline}
                                                >
                                                    <LucideIcon 
                                                        name={p.icon} 
                                                        className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} 
                                                    />
                                                    <span className="truncate">{p.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Helper Text Obrigatório */}
                                    <p className="text-[11px] text-slate-400/90 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
                                        <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>Adapte o prompt ao canal afiliado escolhido sem inventar preço, frete, desconto, estoque, avaliações ou interface da plataforma.</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Controles Específicos para Campanha Try-On */}
                        {outputMode === 'campaign' && (
                            <div className="space-y-4 pt-2 border-t border-slate-800/80 animate-fade-in">
                                {/* Filtro e Seleção de Presets de Campanha */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                            <LucideIcon name="shopping-bag" className="w-3.5 h-3.5 text-amber-400" />
                                            Presets de Campanha & Afiliado
                                        </label>
                                        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => setCampaignCategoryFilter('all')}
                                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                                    campaignCategoryFilter === 'all'
                                                        ? 'bg-purple-600 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                Todos (10)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCampaignCategoryFilter('affiliate')}
                                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                                    campaignCategoryFilter === 'affiliate'
                                                        ? 'bg-amber-600 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                Afiliado (6)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCampaignCategoryFilter('fashion')}
                                                className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                                                    campaignCategoryFilter === 'fashion'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                Fashion (4)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                        {TRY_ON_CAMPAIGN_TYPES
                                            .filter(t => campaignCategoryFilter === 'all' || t.category === campaignCategoryFilter)
                                            .map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => handleSelectPreset(t.id)}
                                                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                                                        campaignType === t.id
                                                            ? 'bg-purple-950/60 border-purple-500/90 text-white shadow-md ring-1 ring-purple-500/40'
                                                            : 'bg-slate-950 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <LucideIcon 
                                                                name={t.icon} 
                                                                className={`w-3.5 h-3.5 shrink-0 ${campaignType === t.id ? 'text-purple-400' : 'text-slate-500'}`} 
                                                            />
                                                            <span className="text-xs font-bold font-sans truncate">{t.label}</span>
                                                        </div>
                                                        {t.badge && (
                                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                                                                {t.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                                                        {t.description}
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Formato, Estilo de Cena e Plataforma */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                                    {/* Formato */}
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-slate-300 uppercase font-mono block">
                                            Formato
                                        </label>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value as TryOnFormat)}
                                            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-purple-500 cursor-pointer"
                                        >
                                            {TRY_ON_FORMATS.map(f => (
                                                <option key={f.id} value={f.id}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Estilo de Cena */}
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-slate-300 uppercase font-mono block">
                                            Estilo de Cena
                                        </label>
                                        <select
                                            value={sceneStyle}
                                            onChange={(e) => setSceneStyle(e.target.value as TryOnSceneStyle)}
                                            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-purple-500 cursor-pointer"
                                        >
                                            {TRY_ON_SCENE_STYLES.map(s => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Plataforma CTA & Canal Afiliado */}
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-slate-300 uppercase font-mono block flex items-center justify-between">
                                            <span>Plataforma CTA</span>
                                            <span className="text-[9px] font-mono text-amber-300">
                                                {getAffiliatePlatformConfig(platform).badge}
                                            </span>
                                        </label>
                                        <select
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value as TryOnPlatform)}
                                            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 outline-none focus:border-purple-500 cursor-pointer"
                                        >
                                            {AFFILIATE_PLATFORMS.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.label} ({p.badge})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Helper Text Obrigatório para Modo Campanha */}
                                <p className="text-[11px] text-slate-400/90 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
                                    <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>Adapte o prompt ao canal afiliado escolhido sem inventar preço, frete, desconto, estoque, avaliações ou interface da plataforma.</span>
                                </p>

                                {/* Quantidade de Takes */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                                            Quantidade de Takes
                                        </label>
                                        <span className="text-[10px] text-purple-400 font-mono font-bold">
                                            {takeCount === 5 ? '5 Takes (Completo com Macro Detail / CTA)' : '4 Takes (Essencial)'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTakeCount(4)}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                takeCount === 4
                                                    ? 'bg-purple-600 text-white border-purple-500 shadow'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                            }`}
                                        >
                                            4 Takes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTakeCount(5)}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer border ${
                                                takeCount === 5
                                                    ? 'bg-purple-600 text-white border-purple-500 shadow'
                                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                            }`}
                                        >
                                            5 Takes (Padrão)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button 
                        onClick={handleGenerate} 
                        disabled={
                            loading || 
                            !clothingFile || 
                            (referenceType === 'editorial_storyboard' ? !visualRefFile : (outputMode !== 'thumbnail' && !personFile))
                        } 
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-3.5 font-bold shadow-lg shadow-purple-600/20 cursor-pointer" 
                        icon={loading ? "loader-2" : (referenceType === 'editorial_storyboard' ? "gem" : (outputMode === 'campaign' ? "clapperboard" : (outputMode === 'thumbnail' ? "image" : "sparkles")))}
                    >
                        {loading 
                            ? (referenceType === 'editorial_storyboard' ? "Extraindo Storyboard Editorial..." : (outputMode === 'campaign' ? "Gerando Campanha..." : (outputMode === 'thumbnail' ? "Gerando Capa 9:16..." : "Processando Combinação..."))) 
                            : (referenceType === 'editorial_storyboard'
                                ? "Gerar Storyboard Editorial (Omni/Vids)"
                                : (outputMode === 'campaign' 
                                    ? (TRY_ON_CAMPAIGN_TYPES.find(t => t.id === campaignType)?.category === 'affiliate' ? "Gerar Campanha Afiliado" : "Gerar Campanha Try-On") 
                                    : (outputMode === 'thumbnail' ? "Gerar Capa para Vídeo (9:16)" : "Aplicar no Modelo com IA")))
                        }
                    </Button>
                </div>

                {/* Outputs Column */}
                <div className="lg:col-span-7">
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between bg-slate-900/60 shadow-xl min-h-[480px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 font-mono">
                                <LucideIcon 
                                    name={editorialResult ? "gem" : (outputMode === 'campaign' ? "clapperboard" : (outputMode === 'thumbnail' ? "image" : "terminal"))} 
                                    className="w-4 h-4 text-purple-400" 
                                />
                                {editorialResult
                                    ? "Storyboard Editorial de Produto"
                                    : (outputMode === 'campaign' ? "Storyboard Campanha Try-On" : (outputMode === 'thumbnail' ? "Prompt Capa para Vídeo (9:16)" : "Prompt Tecnológico Único"))}
                            </h3>
                            {editorialResult && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                                    {editorialResult.shots.length} Planos Editoriais (Omni/Vids)
                                </span>
                            )}
                            {!editorialResult && outputMode === 'campaign' && campaignResult && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                                    {campaignResult.takes.length} Takes Prontos
                                </span>
                            )}
                            {!editorialResult && outputMode === 'thumbnail' && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                                    9:16 Vertical Cover
                                </span>
                            )}
                            {!editorialResult && outputMode === 'single' && selectedPresets.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                                        {selectedPresets.length} {selectedPresets.length === 1 ? 'Preset Ativo' : 'Presets Ativos'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Editorial Storyboard Result Rendering */}
                        {editorialResult ? (
                            <div className="flex-grow">
                                <EditorialStoryboardPanel
                                    result={editorialResult}
                                    textMode={editorialTextMode}
                                    customText={editorialCustomText}
                                    onSavedToVault={() => showToast('success', 'Molde editorial salvo com sucesso no Prompt Vault!')}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Single Mode & Thumbnail Mode Output Rendering */}
                                {(outputMode === 'single' || outputMode === 'thumbnail') && (
                                    <>
                                        {!result ? (
                                            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[300px] text-center p-6 space-y-3">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400">
                                                    <LucideIcon name={referenceType === 'editorial_storyboard' ? "gem" : (outputMode === 'thumbnail' ? "image" : "sparkles")} className="w-7 h-7 animate-pulse" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-300">
                                                        {referenceType === 'editorial_storyboard'
                                                            ? "Aguardando Geração do Storyboard Editorial"
                                                            : (outputMode === 'thumbnail' ? "Aguardando Imagem do Produto" : "Aguardando Imagens do Look")}
                                                    </p>
                                                    <p className="text-xs text-slate-500 max-w-sm">
                                                        {referenceType === 'editorial_storyboard'
                                                            ? "Envie a imagem do produto e o moodboard editorial (Imagem 3) para extrair o storyboard sequencial para Google Vids ou geração de imagem/vídeo."
                                                            : (outputMode === 'thumbnail'
                                                                ? "Envie a foto da peça/produto para estruturar a capa estática 9:16 otimizada para canais afiliados com produto em destaque."
                                                                : "Envie a pessoa e a peça, roupa ou acessório para gerar os comandos estruturados com travas de fidelidade."
                                                            )}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 flex-grow animate-fade-in">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                                                            {outputMode === 'thumbnail' ? "Affiliate Video Cover Prompt (EN)" : "Visual Prompt Generated (EN)"}
                                                        </span>
                                                        <button 
                                                            onClick={() => copyToClipboard(result.prompt_en).then(ok=>ok&&showToast('success', 'Prompt copiado para a área de transferência!'))} 
                                                            className="text-purple-400 hover:text-purple-300 cursor-pointer flex items-center gap-1 text-xs font-mono"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar Prompt
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 leading-relaxed">
                                                        <p className="leading-relaxed whitespace-pre-wrap">{result.prompt_en}</p>
                                                    </div>
                                                </div>
                                                <div className={`grid grid-cols-1 ${result.storyboard_reference_details || result.visual_reference_details ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3 text-xs`}>
                                                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                                                        <span className="text-purple-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                                            <LucideIcon name="tag" className="w-3 h-3" /> {outputMode === 'thumbnail' ? 'Fidelidade do Produto:' : 'Trava da Peça / Produto:'}
                                                        </span>
                                                        <p className="text-slate-300 leading-relaxed font-sans">{result.clothing_details}</p>
                                                    </div>
                                                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                                                        <span className="text-indigo-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                                            <LucideIcon name="user" className="w-3 h-3" /> {outputMode === 'thumbnail' ? 'Diretrizes de Composição 9:16:' : 'Trava da Pessoa:'}
                                                        </span>
                                                        <p className="text-slate-300 leading-relaxed font-sans">{result.person_details}</p>
                                                    </div>
                                                    {result.storyboard_reference_details && (
                                                        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                                                            <span className="text-purple-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                                                <LucideIcon name="clapperboard" className="w-3 h-3" /> Trava UGC Storyboard:
                                                            </span>
                                                            <p className="text-slate-300 leading-relaxed font-sans">{result.storyboard_reference_details}</p>
                                                        </div>
                                                    )}
                                                    {result.visual_reference_details && !result.storyboard_reference_details && (
                                                        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                                                            <span className="text-amber-400 font-bold font-mono text-[10.5px] uppercase tracking-wider flex items-center gap-1">
                                                                <LucideIcon name="image" className="w-3 h-3" /> Trava de Referência Visual:
                                                            </span>
                                                            <p className="text-slate-300 leading-relaxed font-sans">{result.visual_reference_details}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Campaign Mode Output Rendering */}
                                {outputMode === 'campaign' && (
                                    <>
                                        {!campaignResult ? (
                                            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 opacity-60 min-h-[300px] text-center p-6 space-y-3">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400">
                                                    <LucideIcon name="clapperboard" className="w-7 h-7 animate-pulse" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-300">Aguardando Geração de Campanha</p>
                                                    <p className="text-xs text-slate-500 max-w-sm">
                                                        Envie a pessoa e a peça/acessório para gerar o storyboard multi-take com travas globais de identidade e enquadramentos sequenciais de alta fidelidade.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-grow">
                                                <TryOnCampaignStoryboard campaign={campaignResult} />
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* SEÇÃO CIRÚRGICA: EDIÇÃO INTELIGENTE DE VÍDEO (VIDEO EDIT MODES) */}
            <div className="pt-2">
                <VideoEditModesPanel 
                    onSavedToVault={() => showToast('success', 'Molde de edição de vídeo salvo com sucesso no Prompt Vault!')} 
                />
            </div>
        </div>
    );
}

// ────────────────────────────────━━━ TRANSLATOR (TRADUTOR VIRTUAL) ━━━────────────────────────────────
export function TranslatorView({ currentKey }: CreativeStudioProps) {
    const [text, setText] = useState('');
    const [sourceLanguage, setSourceLanguage] = useState('auto');
    const [targetLanguage, setTargetLanguage] = useState('pt');
    const [mode, setMode] = useState<TranslationMode>('faithful');
    const [result, setResult] = useState('');
    const [validationWarning, setValidationWarning] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const activeModeObj = TRANSLATION_MODES.find(m => m.value === mode) || TRANSLATION_MODES[0];
    const sourceLangObj = SOURCE_LANGUAGES.find(s => s.code === sourceLanguage) || SOURCE_LANGUAGES[0];
    const targetLangObj = TARGET_LANGUAGES.find(t => t.code === targetLanguage) || TARGET_LANGUAGES[0];

    const protectedTerms = extractProtectedTerms(text);

    const handleTranslate = async () => {
        if (!text || !text.trim()) return;
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        setValidationWarning(null);
        setResult('');

        try {
            const prompt = buildTranslationPrompt(text, sourceLanguage, targetLanguage, mode);
            const data = await processGeminiAPI(currentKey, { contents: [{ parts: [{ text: prompt }] }] });
            
            let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            // Safe string extraction & normalization
            if (typeof rawText !== 'string' || !rawText) {
                rawText = '';
            } else {
                rawText = rawText.trim().replace(/^["'“«]+|["'”»]+$/g, '').trim();
            }

            if (!rawText) {
                setValidationWarning("Não foi possível traduzir com segurança.");
                setResult(text); // Safe fallback to original text if API returns empty
                return;
            }

            // Task 7: Preserve formatting
            let formatted = preserveTranslationFormatting(text, rawText, mode);

            // Task 8: Faithfulness validation
            let validation = validateTranslationFaithfulness(text, formatted, targetLanguage);

            if (!validation.is_valid) {
                // Retry with strict prompt
                try {
                    const strictPrompt = buildStrictRetryPrompt(text, targetLanguage);
                    const retryData = await processGeminiAPI(currentKey, { contents: [{ parts: [{ text: strictPrompt }] }] });
                    let retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (typeof retryText === 'string' && retryText.trim()) {
                        retryText = retryText.trim().replace(/^["'“«]+|["'”»]+$/g, '').trim();
                        const retryFormatted = preserveTranslationFormatting(text, retryText, mode);
                        const retryValidation = validateTranslationFaithfulness(text, retryFormatted, targetLanguage);
                        
                        if (retryValidation.is_valid || retryValidation.same_topic) {
                            formatted = retryFormatted;
                            setValidationWarning("Tradução refeita por risco de conteúdo inventado.");
                        } else {
                            setValidationWarning("Tradução ajustada. Verifique os nomes e números preservados.");
                        }
                    } else {
                        setValidationWarning("Tradução refeita por risco de conteúdo inventado.");
                    }
                } catch (retryErr) {
                    setValidationWarning("Tradução refeita por risco de conteúdo inventado.");
                }
            }

            // Ensure output is clean string with no undefined / null / object leak
            setResult(String(formatted || text));
        } catch (e: any) { 
            setValidationWarning("Não foi possível traduzir com segurança.");
            setResult(String(text || '')); 
            alert("Erro ao traduzir: " + (e?.message || "Erro desconhecido"));
        } finally { 
            setLoading(false); 
        }
    };

    const handleCopyAll = () => {
        if (!result) return;
        const formattedAll = formatCopyAllText(
            sourceLangObj.label,
            targetLangObj.label,
            activeModeObj.label,
            text,
            result
        );
        copyToClipboard(formattedAll).then(ok => ok && alert("Tudo copiado com sucesso!"));
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20 mb-2">
                    <LucideIcon name="languages" className="w-3.5 h-3.5 text-indigo-400" /> LOCALIZAÇÃO FIEL DE SCRIPTS
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Tradutor Virtual</h2>
                <p className="text-slate-400 text-sm max-w-xl mx-auto">Tradução e localização de roteiros, legendas e textos de overlay mantendo 100% da fidelidade sem inventar dados ou anúncios novos.</p>
            </div>

            {/* Mode Selector */}
            <Card className="bg-slate-900/60 border border-slate-800 p-4 space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <LucideIcon name="sliders" className="w-3.5 h-3.5 text-indigo-400" /> Modo de Tradução
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Padrão: Tradução Fiel</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {TRANSLATION_MODES.map(m => (
                        <button
                            key={m.value}
                            onClick={() => setMode(m.value)}
                            className={`px-2.5 py-2 rounded-lg text-xs font-bold border text-left transition cursor-pointer flex flex-col justify-between ${
                                mode === m.value
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                                    : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750 hover:text-white'
                            }`}
                        >
                            <span>{m.label}</span>
                        </button>
                    ))}
                </div>
                <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                    <span className="font-semibold text-slate-300">Comportamento:</span> {activeModeObj.description}
                </p>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Left Panel: Original Text */}
                <Card className="flex flex-col gap-3 bg-slate-900/50 border border-slate-800">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                            <LucideIcon name="file-text" className="w-3.5 h-3.5 text-indigo-400" /> TEXTO ORIGINAL
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Origem:</span>
                            <select
                                value={sourceLanguage}
                                onChange={e => setSourceLanguage(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                            >
                                {SOURCE_LANGUAGES.map(s => (
                                    <option key={s.code} value={s.code}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Cole o roteiro, legenda, especificações de produto ou texto de overlay aqui..."
                        className="w-full h-52 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none custom-scrollbar leading-relaxed"
                    />

                    {protectedTerms.length > 0 && (
                        <div className="bg-slate-950/80 p-2 rounded border border-slate-800 text-[10px] text-slate-400 flex flex-wrap items-center gap-1">
                            <span className="font-bold text-indigo-400 uppercase tracking-wider">Termos Protegidos:</span>
                            {protectedTerms.map((term, i) => (
                                <span key={i} className="bg-indigo-950/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/50 font-mono">
                                    {term}
                                </span>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={handleTranslate}
                        disabled={loading || !text.trim()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
                        icon={loading ? "loader-2" : "languages"}
                    >
                        {loading ? "Traduzindo fielmente..." : "Traduzir com Fidelidade"}
                    </Button>
                </Card>

                {/* Right Panel: Translated Output */}
                <Card className="flex flex-col justify-between bg-slate-900/50 border border-slate-800">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                            <LucideIcon name="check-circle" className="w-3.5 h-3.5 text-emerald-400" /> RESULTADO DA TRADUÇÃO
                        </label>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Destino:</span>
                            <select
                                value={targetLanguage}
                                onChange={e => setTargetLanguage(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                            >
                                {TARGET_LANGUAGES.map(t => (
                                    <option key={t.code} value={t.code}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {validationWarning && (
                        <div className="my-2 p-2 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 text-xs flex items-center gap-1.5 animate-fade-in">
                            <LucideIcon name="alert-triangle" className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{validationWarning}</span>
                        </div>
                    )}

                    <div className="flex-grow bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap min-h-[208px] custom-scrollbar overflow-y-auto max-h-56 my-2 leading-relaxed font-sans select-text">
                        {result ? (
                            result
                        ) : (
                            <span className="opacity-40 italic text-xs text-slate-400">
                                A tradução fiel aparecerá aqui sem invenções ou alterações de significado...
                            </span>
                        )}
                    </div>

                    {/* Copy Buttons Bar */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                        <button
                            onClick={() => result && copyToClipboard(result).then(ok => ok && alert("Tradução copiada!"))}
                            disabled={!result}
                            className="bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 py-1.5 rounded text-xs font-bold border border-slate-700 transition cursor-pointer flex justify-center items-center gap-1"
                        >
                            <LucideIcon name="copy" className="w-3.5 h-3.5 text-indigo-400" />
                            Copiar Tradução
                        </button>
                        <button
                            onClick={() => text && copyToClipboard(text).then(ok => ok && alert("Texto original copiado!"))}
                            disabled={!text}
                            className="bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 py-1.5 rounded text-xs font-bold border border-slate-700 transition cursor-pointer flex justify-center items-center gap-1"
                        >
                            <LucideIcon name="file-text" className="w-3.5 h-3.5 text-slate-400" />
                            Copiar Original
                        </button>
                        <button
                            onClick={handleCopyAll}
                            disabled={!result}
                            className="bg-indigo-950/60 hover:bg-indigo-900/60 disabled:opacity-40 text-indigo-300 py-1.5 rounded text-xs font-bold border border-indigo-800/60 transition cursor-pointer flex justify-center items-center gap-1"
                        >
                            <LucideIcon name="layers" className="w-3.5 h-3.5 text-indigo-400" />
                            Copiar Tudo
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ────────────────────────────────━━━ IMAGE DESCRIBER ━━━────────────────────────────────
export function ImageDescriberView({ currentKey }: CreativeStudioProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [language, setLanguage] = useState('en');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);

    const handleUploadedFile = async (f: File) => {
        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
        setResult('');

        if (currentKey) {
            setLoading(true);
            try {
                const b64 = await new Promise<string>((resolve, reject) => {
                    const r = new FileReader(); r.onload = () => resolve(r.result?.toString().split(',')[1] || ''); r.onerror = reject; r.readAsDataURL(f);
                });
                const prompt = `Analise esta foto de produto. Descreva detalhadamente a composição da imagem, iluminação, cores e texturas em \${language === 'en' ? 'Inglês' : 'Português'} de forma a servir de prompt para recriação visual exata.`;
                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: f.type, data: b64 } }] }]
                });
                setResult(data.candidates[0].content.parts[0].text);
            } catch (e: any) {
                alert("Erro ao analisar imagem: " + e.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleUploadedFile(f);
    };

    const { feedback: pasteFeedback, error: pasteError } = usePasteImageUpload({
        onImagePasted: (fileObj) => {
            handleUploadedFile(fileObj);
        }
    });

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">IA Descrever Imagem</h2>
                <p className="text-slate-400">Analise imagens e extraia composições para réplicas.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Card className="flex flex-col gap-3 justify-center items-center h-80 cursor-pointer bg-slate-900/40 relative group border-2 border-dashed border-slate-700 hover:border-indigo-500" onClick={() => inputRef.current?.click()}>
                    <input type="file" ref={inputRef} onChange={handleUpload} accept="image/*" className="hidden" />
                    {previewUrl ? (
                        <div className="relative w-full h-full p-2 flex items-center justify-center">
                            <img src={previewUrl} className="max-h-full max-w-full object-contain rounded" />
                            {loading && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded"><LucideIcon name="loader-2" className="animate-spin text-indigo-500 w-8 h-8" /></div>}
                        </div>
                    ) : (
                        <div className="text-center pointer-events-none p-4">
                            <LucideIcon name="camera" className="w-12 h-12 mx-auto mb-2 text-slate-500 group-hover:logo-purple transition-colors" />
                            <p className="text-xs text-slate-300 font-bold">Upload, arraste ou pressione Ctrl+V para colar imagem</p>
                            {pasteError && (
                                <p className="text-[10px] text-red-500 mt-1 leading-tight font-sans font-normal">
                                    {pasteError}
                                </p>
                            )}
                            {pasteFeedback && (
                                <p className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans font-normal">
                                    ✓ {pasteFeedback.message} ({pasteFeedback.name})
                                </p>
                            )}
                        </div>
                    )}
                </Card>
                <Card className="flex flex-col justify-between bg-slate-900/40 border border-slate-700">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold uppercase text-slate-400">Descrição Composicional</span>
                        {result && <button onClick={() => copyToClipboard(result).then(ok=>ok&&alert("Descrição copiada!"))} className="text-xs text-indigo-400 hover:text-white cursor-pointer"><LucideIcon name="copy" className="w-4 h-4" /></button>}
                    </div>
                    <div className="flex-grow bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 whitespace-pre-wrap min-h-[192px] custom-scrollbar overflow-y-auto max-h-48">
                        {result || <span className="opacity-40 italic text-xs">Aguardando a imagem de upload para gerar a engenharia descritiva...</span>}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ────────────────────────────────━━━ MAGIC PROMPT (APRIMORADOR) ━━━────────────────────────────────
export function MagicPromptView({ currentKey }: CreativeStudioProps) {
    const [rawPrompt, setRawPrompt] = useState('');
    const [enhanced, setEnhanced] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEnhance = async () => {
        if (!rawPrompt) return;
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        try {
            const prompt = `Aprimore o prompt de imagem abaixo para que ele produza uma imagem fotorrealista de alta qualidade em um gerador como Midjourney ou Stable Diffusion. Adicione detalhes de iluminação, estúdio, lente cinematográfica e renderização 4K/8K. Retorne APENAS o prompt aprimorado em INGLÊS. PROMPT ORIGINAL: "${rawPrompt}"`;
            const data = await processGeminiAPI(currentKey, { contents: [{ parts: [{ text: prompt }] }] });
            setEnhanced(data.candidates[0].content.parts[0].text);
        } catch (e: any) { 
            alert("Erro ao aprimorar: " + e.message); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Aprimorador Mágico</h2>
                <p className="text-slate-400">Refine prompts curtos ou simples em comandos hiper detalhados para IA de imagem.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                <Card className="flex flex-col gap-3 bg-slate-900/40">
                    <span className="text-xs font-bold uppercase text-slate-400">Rascunho de Prompt</span>
                    <textarea value={rawPrompt} onChange={e => setRawPrompt(e.target.value)} placeholder="Ex: a sleek black headphone on a table..." className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none custom-scrollbar" />
                    <Button onClick={handleEnhance} disabled={loading || !rawPrompt} className="w-full" icon={loading ? "loader-2" : "sparkles"}>
                        {loading ? "Aprimorando..." : "Melhorar Prompt IA"}
                    </Button>
                </Card>

                <Card className="flex flex-col justify-between bg-slate-900/40 border border-slate-700">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold uppercase text-slate-400 text-indigo-400">Prompt Aprimorado (Pronto para Flux/Midjourney)</span>
                        {enhanced && <button onClick={() => copyToClipboard(enhanced).then(ok=>ok&&alert("Copiado!"))} className="text-xs text-indigo-400 hover:text-white cursor-pointer"><LucideIcon name="copy" className="w-4 h-4" /></button>}
                    </div>
                    <div className="flex-grow bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 font-mono whitespace-pre-wrap min-h-[192px] custom-scrollbar overflow-y-auto max-h-48">
                        {enhanced || <span className="opacity-40 italic text-xs">O resultado aparecerá em inglês pronto para ser copiado.</span>}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ────────────────────────────────━━━ EDIT PROMPT (PROMPT REFINER) ━━━────────────────────────────────
export function PromptRefinerView({ currentKey }: CreativeStudioProps) {
    const [prompt, setPrompt] = useState('');
    const [instruction, setInstruction] = useState('');
    const [refined, setRefined] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRefine = async () => {
        if (!prompt || !instruction) return;
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        try {
            const fullPrompt = `Edite o prompt de imagem original baseado na instrução de modificação. O prompt editado deve ser escrito em INGLÊS.
            
            PROMPT ORIGINAL: "${prompt}"
            INSTRUÇÃO DE MODIFICAÇÃO: "${instruction}"
            
            Retorne APENAS o prompt final editado completo em inglês, sem explicações adicionais ou markdown.`;

            const data = await processGeminiAPI(currentKey, { contents: [{ parts: [{ text: fullPrompt }] }] });
            setRefined(data.candidates[0].content.parts[0].text);
        } catch (e: any) { 
            alert("Erro ao editar prompt: " + e.message); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Editar com IA</h2>
                <p className="text-slate-400">Faça modificações rápidas em prompts existentes adicionando ou removendo elementos.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Card className="flex flex-col gap-3 bg-slate-900/40">
                    <div>
                        <span className="text-xs font-bold uppercase text-slate-400 mb-1 block">Prompt Original</span>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: photo of a man in NYC..." className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-indigo-500 outline-none resize-none custom-scrollbar" />
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase text-slate-400 mb-1 block">Instrução de Mudança</span>
                        <input value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="Ex: change the weather to sunny and add a yellow coat..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <Button onClick={handleRefine} disabled={loading || !prompt || !instruction} className="w-full" icon={loading ? "loader-2" : "edit"}>
                        {loading ? "Ajustando Prompt..." : "Ajustar Prompt com IA"}
                    </Button>
                </Card>

                <Card className="flex flex-col justify-between bg-slate-900/40 border border-slate-700">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold uppercase text-slate-400">Prompt Final Ajustado</span>
                        {refined && <button onClick={() => copyToClipboard(refined).then(ok=>ok&&alert("Copiado!"))} className="text-xs text-indigo-400 hover:text-white cursor-pointer"><LucideIcon name="copy" className="w-4 h-4" /></button>}
                    </div>
                    <div className="flex-grow bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 font-mono whitespace-pre-wrap min-h-[192px] custom-scrollbar overflow-y-auto max-h-48">
                        {refined || <span className="opacity-40 italic text-xs">O resultado modificado será gerado aqui em inglês...</span>}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ────────────────────────────────━━━ IMAGE EXTRACOR ━━━────────────────────────────────
export function ImagePromptExtractorView({ currentKey }: CreativeStudioProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);

    const handleUploadedFile = async (f: File) => {
        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
        setResult('');

        if (currentKey) {
            setLoading(true);
            try {
                const b64 = await new Promise<string>((resolve, reject) => {
                    const r = new FileReader(); r.onload = () => resolve(r.result?.toString().split(',')[1] || ''); r.onerror = reject; r.readAsDataURL(f);
                });
                const prompt = `Deconstruct this image. Act as a prompt expert. Write a highly accurate prompt in English that would recreate this exact image in a high-quality model like Midjourney (v6) or Flux. Do not include introductory text other than the prompt itself.`;
                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: f.type, data: b64 } }] }]
                });
                setResult(data.candidates[0].content.parts[0].text);
            } catch (e: any) {
                alert("Erro ao extrair prompt: " + e.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleUploadedFile(f);
    };

    const { feedback: pasteFeedback, error: pasteError } = usePasteImageUpload({
        onImagePasted: (fileObj) => {
            handleUploadedFile(fileObj);
        }
    });

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Extrator de Prompt de Imagem</h2>
                <p className="text-slate-400">Envie qualquer imagem artística para extrair o prompt fotorrealista exato em inglês.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <Card className="flex flex-col gap-3 justify-center items-center h-80 cursor-pointer bg-slate-900/40 relative group border-2 border-dashed border-slate-700 hover:border-indigo-500" onClick={() => inputRef.current?.click()}>
                    <input type="file" ref={inputRef} onChange={handleUpload} accept="image/*" className="hidden" />
                    {previewUrl ? (
                        <div className="relative w-full h-full p-2 flex items-center justify-center">
                            <img src={previewUrl} className="max-h-full max-w-full object-contain rounded" />
                            {loading && <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center rounded"><LucideIcon name="loader-2" className="animate-spin text-indigo-500 w-8 h-8" /></div>}
                        </div>
                    ) : (
                        <div className="text-center pointer-events-none p-4">
                            <LucideIcon name="image" className="w-12 h-12 mx-auto mb-2 text-slate-500 group-hover:logo-purple transition-colors" />
                            <p className="text-xs text-slate-300 font-bold">Upload, arraste ou pressione Ctrl+V para colar imagem</p>
                            {pasteError && (
                                <p className="text-[10px] text-red-500 mt-1 leading-tight font-sans font-normal">
                                    {pasteError}
                                </p>
                            )}
                            {pasteFeedback && (
                                <p className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans font-normal">
                                    ✓ {pasteFeedback.message} ({pasteFeedback.name})
                                </p>
                            )}
                        </div>
                    )}
                </Card>
                <Card className="flex flex-col justify-between bg-slate-900/40 border border-slate-700">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold uppercase text-slate-400">Prompt Extraído (Flux/Midjourney)</span>
                        {result && <button onClick={() => copyToClipboard(result).then(ok=>ok&&alert("Prompt copiado!"))} className="text-xs text-indigo-400 hover:text-white cursor-pointer"><LucideIcon name="copy" className="w-4 h-4" /></button>}
                    </div>
                    <div className="flex-grow bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300 font-mono whitespace-pre-wrap min-h-[192px] custom-scrollbar overflow-y-auto max-h-48">
                        {result || <span className="opacity-40 italic text-xs">O prompt em inglês extraído aparecerá aqui...</span>}
                    </div>
                </Card>
            </div>
        </div>
    );
}
