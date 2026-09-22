import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, LucideIcon, usePasteImageUpload } from './Common';
import { CAMERA_ANGLES, SCENARIO_OPTIONS, TONE_OPTIONS, POLICY_INSTRUCTION } from '../constants';
import { processGeminiAPI, safeJSONParse, copyToClipboard } from '../utils';
import { loadCanonicalAvatars, subscribeToAvatarUpdates } from '../services/avatarStorageService';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';
import {
    FinalRemodeledSceneProject,
    executeReverseRemodelPipeline,
    finalSceneProjectToLegacyReverseResult,
    resolveCanonicalReverseBlocks,
    extractLegacyReverseBlocks,
    normalizeLegacyReverseBlock,
    formatLegacySceneText
} from '../features/reverse-engineering';
import { enrichReverseEngineeringResult, buildFlowMinimalPrompt, buildFlowThreeLayerPrompt, buildFullEnrichedPrompt, enrichSceneBlock } from '../features/reverse-engineering/realismStabilityLayer';
import {
    VoiceGender,
    VoiceAudience,
    VoiceStyle,
    ReverseVoiceProfile,
    DEFAULT_VOICE_PROFILE,
    VOICE_GENDER_OPTIONS,
    VOICE_AUDIENCE_OPTIONS,
    VOICE_STYLE_OPTIONS,
    buildVoiceDescription
} from '../features/reverse-engineering/voiceProfile';
import {
    CinematicModeSelector,
    ProductReferenceCard,
    AvatarReferenceCard,
    AvatarWardrobeCard,
    EnvironmentCard,
    CommerceDemoStyleCard,
    CameraMotionCard,
    DurationAudioCard,
    AdvancedStabilityCard
} from './cinematic/CommerceControlCards';
import { CommercePromptPreview } from './cinematic/CommercePromptPreview';
import {
    CommerceUIState,
    CinematicUIMode,
    CommerceGenerationResult
} from './cinematic/CommerceTypes';
import { executeCommercePipeline } from './cinematic/useCommercePipeline';

interface ReverseEngineeringViewProps {
    currentKey: string;
}

const PRESERVE_ELEMENT_LABELS: Record<string, string> = {
    hook: "Hook",
    conversion_structure: "Estrutura de Conversão",
    editing_pace: "Ritmo de Edição",
    visual_style: "Estilo Visual",
    cta_position: "Posição do CTA",
    voice_style: "Estilo de Voz",
    camera_movement: "Movimento de Câmera",
    demo_type: "Tipo de Demonstração",
    visual_proof: "Prova Visual",
    presentation_energy: "Energia da Apresentação"
};

const getRemodelingIntensityText = (value: number) => {
    if (value <= 14) {
        return `Nível ${value}%: muito próximo do original - preserva quase tudo exceto a identidade do produto.`;
    }
    if (value <= 39) {
        return `Nível ${value}%: leve adaptação - preserva gancho, ritmo e estrutura de cena. Adapta referências do produto.`;
    }
    if (value <= 64) {
        return `Nível ${value}%: equilibrado - mantém o DNA de conversão, mas remodela visual, narrativa e fala para o novo produto.`;
    }
    if (value <= 89) {
        return `Nível ${value}%: forte remodelagem - preserva apenas gatilhos psicológicos e timing do CTA.`;
    }
    return `Nível ${value}%: criativo totalmente novo - usa o DNA extraído apenas como inspiração e cria um criativo totalmente novo.`;
};

// TASK 1 — Add POV mode lock
export function isPOVProductMode(input: any): boolean {
    if (!input) return false;
    let textToTest = "";
    if (typeof input === "string") {
        textToTest = input;
    } else if (typeof input === "object") {
        textToTest = Object.values(input)
            .map(v => (typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : ""))
            .join(" ");
    }

    const lower = textToTest.toLowerCase();
    const triggers = [
        "pov",
        "pov estilo live",
        "hands only",
        "hands-only",
        "product demo",
        "white background",
        "fundo branco",
        "background white",
        "luvas brancas",
        "white cotton gloves",
        "sem pessoa",
        "sem rosto",
        "only hands"
    ];
    return triggers.some(t => lower.includes(t));
}

// TASK 3 — Hard-block UGC creator terms
export const FORBIDDEN_POV_TERMS = [
    "female creator",
    "male creator",
    "influencer",
    "woman",
    "man",
    "person",
    "face",
    "selfie",
    "bedroom closet",
    "bedroom",
    "closet",
    "mirror",
    "full body",
    "lifestyle model",
    "smiling at the camera",
    "talking to camera",
    "outfit",
    "creator smiles",
    "full-length mirror",
    "live-stream selfie angle",
    "talking head",
    "outfit try-on",
    "try-on"
];

// TASK 4 — Add POV negative prompt
export const POV_NEGATIVE_PROMPT_ADDITION = "no face, no woman, no man, no influencer, no visible person, no selfie, no mirror shot, no bedroom closet, no full body, no talking head, no lifestyle model, no UGC creator, no outfit try-on, no background person, no facial expression, no visible body except hands, no creator holding wrist to camera";

// TASK 6 — Static component lock for watches
export const WATCH_STATIC_LOCK_TEXT = "Freeze all decorative and static watch details: dial markers, Roman numerals, logo text, date window, printed numbers, bezel facets, crown, bracelet links, screws, decorative gears, skeleton-style visible components, and all internal non-functional details. Only the gloved hands, camera movement, and lighting reflections may move.";

// TASK 8 — Clean generated blocks
export function sanitizePOVOutput(result: any, isPOV?: boolean, isWatch?: boolean, productName?: string): any {
    if (!result) return result;
    const sanitized = typeof result === 'object' ? JSON.parse(JSON.stringify(result)) : result;

    const pName = productName || sanitized.product_name || "";
    const cat = sanitized.category || "";
    const catLower = (cat || "").toLowerCase();
    const nameLower = (pName || "").toLowerCase();

    const checkWatch = isWatch !== undefined ? isWatch : (
        catLower.includes("relo") || catLower.includes("watch") || catLower.includes("clock") || catLower.includes("joia") ||
        nameLower.includes("relo") || nameLower.includes("watch") || nameLower.includes("clock") || nameLower.includes("quartz") || nameLower.includes("ourstart")
    );

    const checkPOV = isPOV !== undefined ? isPOV : isPOVProductMode(sanitized);

    if (checkWatch) {
        if (!sanitized.static_component_lock || !sanitized.static_component_lock.includes("Freeze all decorative and static watch details")) {
            sanitized.static_component_lock = (sanitized.static_component_lock ? sanitized.static_component_lock + " " : "") + WATCH_STATIC_LOCK_TEXT;
        }
    }

    if (!checkPOV) return sanitized;

    // TASK 2 & TASK 7: Output schema update & forced POV product prompt rules
    sanitized.avatar_mode = "none";
    sanitized.human_visibility = "hands_only";
    sanitized.scene_type = "POV product demo";
    sanitized.scenario = "clean white studio background";
    sanitized.hand_style = "white cotton gloves";
    sanitized.creator_visibility = "hidden";
    sanitized.face_visibility = "none";
    sanitized.camera = "POV macro product shot";

    // TASK 4: Append POV negative prompt
    if (sanitized.negative_prompt) {
        if (!sanitized.negative_prompt.includes("no face, no woman, no man")) {
            sanitized.negative_prompt = sanitized.negative_prompt.trim() + ", " + POV_NEGATIVE_PROMPT_ADDITION;
        }
    } else {
        sanitized.negative_prompt = POV_NEGATIVE_PROMPT_ADDITION;
    }

    const cleanText = (text: string): string => {
        if (!text) return text;
        let cleaned = text;

        FORBIDDEN_POV_TERMS.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            cleaned = cleaned.replace(regex, "");
        });

        cleaned = cleaned
            .replace(/female creator/gi, "")
            .replace(/male creator/gi, "")
            .replace(/lifestyle model/gi, "")
            .replace(/bedroom closet/gi, "clean white studio background")
            .replace(/bedroom/gi, "white studio")
            .replace(/closet/gi, "white background")
            .replace(/mirror shot/gi, "POV macro product shot")
            .replace(/mirror/gi, "studio background")
            .replace(/selfie video/gi, "POV product demo")
            .replace(/selfie/gi, "macro shot")
            .replace(/full body/gi, "product centered")
            .replace(/influencer talking/gi, "product demo")
            .replace(/influencer/gi, "")
            .replace(/talking head/gi, "")
            .replace(/outfit try-on/gi, "macro product view")
            .replace(/outfit/gi, "product")
            .replace(/smiling at the camera/gi, "holding product steady")
            .replace(/talking to camera/gi, "demonstrating product")
            .replace(/\s+/g, " ")
            .trim();

        return cleaned;
    };

    if (sanitized.blocks && Array.isArray(sanitized.blocks)) {
        sanitized.blocks = sanitized.blocks.map((block: any, idx: number) => {
            let visual = cleanText(block.visual_en || "");
            let action = cleanText(block.action_en || block.action_prompt_en || block.ACTION_PROMPT_EN || "");
            let dialogue = cleanText(block.dialogue_pt_br || "");

            if (checkWatch) {
                const prod = pName || "Ourstart watch";
                if (idx === 0) {
                    visual = `POV macro product shot on a clean white studio background. White cotton gloves hold the ${prod} upright in the center of the frame. The silver-and-gold bracelet, faceted bezel, deep blue dial, gold Roman markers, OURSTART logo, QUARTZ text, and SUN 8 date window remain perfectly identical to the source image.`;
                    action = "The gloved hands gently tilt the watch left and right while the camera slowly pushes in. Only lighting reflections move across the metal and glass.";
                } else if (idx === 1) {
                    visual = `Close-up of the bracelet and bezel against the white background. The gloved fingers carefully adjust the metal bracelet links without bending or deforming the product.`;
                    action = "The camera moves from the bracelet to the blue dial in a smooth macro slide.";
                } else if (idx === 2) {
                    visual = `Extreme macro close-up of the blue dial, gold markers, logo text, and calendar window. All printed text and numbers remain sharp and unchanged.`;
                    action = "The camera holds steady while a soft light sweep passes across the glass.";
                } else if (idx === 3) {
                    visual = `The watch returns to the centered hero position in the gloved hands on the white studio background.`;
                    action = "The hands pause, then slightly angle the watch back to the initial position for a seamless loop.";
                }
            } else {
                if (!visual.toLowerCase().includes("white cotton gloves") && !visual.toLowerCase().includes("hands")) {
                    visual = `POV macro product shot on a clean white studio background. White cotton gloves hold the ${pName || "product"} in the center of the frame. ` + visual;
                }
            }

            return {
                ...block,
                visual_en: visual,
                action_en: action,
                dialogue_pt_br: dialogue
            };
        });
    }

    return sanitized;
}

export function hasUsableReverseResult(value: any): boolean {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value.veo_structure) && value.veo_structure.length > 0) return true;
    if (Array.isArray(value.sora_structure) && value.sora_structure.length > 0) return true;
    if (Array.isArray(value.grok_structure) && value.grok_structure.length > 0) return true;
    if (Array.isArray(value.blocks) && value.blocks.length > 0) return true;
    if (Array.isArray(value.scenes) && value.scenes.length > 0) return true;
    return false;
}

export function ReverseEngineeringView({ currentKey }: ReverseEngineeringViewProps) {
    const [sessionHistory, setSessionHistory] = useState<any[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Parallel Pipeline State (ETAPA 12A.2)
    const [finalRemodeledProject, setFinalRemodeledProject] = useState<FinalRemodeledSceneProject | null>(null);
    const [reversePipelineStatus, setReversePipelineStatus] = useState<'IDLE' | 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED' | 'FAILED'>('IDLE');
    const [reversePipelineWarnings, setReversePipelineWarnings] = useState<string[]>([]);
    const [showPipelineWarnings, setShowPipelineWarnings] = useState(false);
    const [expandedDnaCard, setExpandedDnaCard] = useState(false);
    const [expandedMotionCard, setExpandedMotionCard] = useState(false);
    const [expandedSafetyCard, setExpandedSafetyCard] = useState(false);
    const latestAdaptationExecutionIdRef = useRef<number>(0);

    const [activeModel, setActiveModel] = useState('veo');
    const [targetModel, setTargetModel] = useState('veo');
    const [activeTab, setActiveTab] = useState<'creator' | 'blocks' | 'veo' | 'sora' | 'grok' | 'json'>('creator');
    
    const [avatars, setAvatars] = useState<any[]>([]);
    const [selectedAvatarId, setSelectedAvatarId] = useState('');

    // Object Lock states
    const [productFile, setProductFile] = useState<File | null>(null);
    const [productPreview, setProductPreview] = useState('');
    const [productDetails, setProductDetails] = useState('');
    const [showObjectLock, setShowObjectLock] = useState(false);
    const [extractingDetails, setExtractingDetails] = useState(false);

    // Creator Profile states
    const [creatorGender, setCreatorGender] = useState<'Female' | 'Male' | 'Neutral / Not specified'>('Neutral / Not specified');
    const [creatorAge, setCreatorAge] = useState<'Young Adult' | 'Adult' | 'Mature Adult'>('Young Adult');
    const [creatorPersona, setCreatorPersona] = useState<string>('UGC Influencer Real');
    const [speakingEnergy, setSpeakingEnergy] = useState<number>(70);
    const [speakingPace, setSpeakingPace] = useState<'Slow' | 'Normal' | 'Fast' | 'TikTok Fast'>('Normal');
    const [detectingProfile, setDetectingProfile] = useState(false);
    const [profileDetectionSuccess, setProfileDetectionSuccess] = useState<string | null>(null);

    // Voice Profile states
    const [voiceGender, setVoiceGender] = useState<VoiceGender>(DEFAULT_VOICE_PROFILE.gender);
    const [voiceAudience, setVoiceAudience] = useState<VoiceAudience>(DEFAULT_VOICE_PROFILE.audience);
    const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>(DEFAULT_VOICE_PROFILE.style);

    const voiceProfile = useMemo<ReverseVoiceProfile>(() => ({
        gender: voiceGender,
        audience: voiceAudience,
        style: voiceStyle
    }), [voiceGender, voiceAudience, voiceStyle]);

    // Audio states
    const [ignoreAudio, setIgnoreAudio] = useState(false);

    // Customization states
    const [customCamera, setCustomCamera] = useState('Automático (Manter Original)');
    const [customScenario, setCustomScenario] = useState('Automático (Manter Original)');
    const [customTone, setCustomTone] = useState('Automático (Manter Original)');
    const [videoType, setVideoType] = useState('auto'); 
    const [showCustomOptions, setShowCustomOptions] = useState(false);

    // Adaptation states
    const [showAdaptModal, setShowAdaptModal] = useState(false);
    const [adaptData, setAdaptData] = useState({
        newProduct: '',
        features: '',
        targetAudience: '',
        angleStrategy: 'praticidade',
        hookIntensity: 'forte',
        adaptationMode: 'preservar_viral' as 'preservar_viral' | 'preservar_visual' | 'remodelar_total',
        remodelingIntensity: 50,
        preserveElements: ['hook', 'conversion_structure', 'cta_position', 'demo_type', 'visual_proof'] as string[],
        category: '',
        priceRange: '',
        mainBenefit: '',
        mainPain: '',
        uniqueDifferentiator: '',
        platform: 'TikTok Shop' as 'TikTok Shop' | 'Shopee Vídeo' | 'Mercado Livre' | 'Instagram Reels' | 'YouTube Shorts' | 'Facebook Reels'
    });
    const [isAdapting, setIsAdapting] = useState(false);
    
    // Adapt auto filler states
    const [adaptImageFile, setAdaptImageFile] = useState<File | null>(null);
    const [adaptImageUrl, setAdaptImageUrl] = useState('');
    const [adaptPreviewUrl, setAdaptPreviewUrl] = useState('');
    const [adaptPreviewError, setAdaptPreviewError] = useState(false);
    const [isAnalyzingAdaptProduct, setIsAnalyzingAdaptProduct] = useState(false);
    const autofillAnalysisRequestIdRef = useRef(0);

    useEffect(() => {
        setAdaptPreviewError(false);
        if (adaptImageFile) {
            const objectUrl = URL.createObjectURL(adaptImageFile);
            setAdaptPreviewUrl(objectUrl);
            return () => {
                URL.revokeObjectURL(objectUrl);
            };
        } else if (adaptImageUrl && (adaptImageUrl.startsWith('http://') || adaptImageUrl.startsWith('https://') || adaptImageUrl.startsWith('data:image/'))) {
            setAdaptPreviewUrl(adaptImageUrl);
        } else {
            setAdaptPreviewUrl('');
        }
    }, [adaptImageFile, adaptImageUrl]);

    const resetDerivedProductFields = () => {
        setAdaptData(prev => ({
            ...prev,
            newProduct: '',
            category: '',
            priceRange: '',
            targetAudience: '',
            mainBenefit: '',
            mainPain: '',
            uniqueDifferentiator: '',
            features: '',
            productVisionData: undefined
        }));
    };

    // Create the state object for Autosave & Recovery in Reverse Engineering
    const currentState = {
        activeSessionId,
        previewUrl,
        result,
        activeModel,
        targetModel,
        activeTab,
        selectedAvatarId,
        productPreview,
        productDetails,
        showObjectLock,
        ignoreAudio,
        customCamera,
        customScenario,
        customTone,
        videoType,
        showCustomOptions,
        showAdaptModal,
        adaptData,
        adaptImageUrl,
        isAdapting,
        isAnalyzingAdaptProduct
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (loading || isAdapting) {
            if (process.env.NODE_ENV !== 'production') {
                console.log("[Reverse Restore Guard] Active execution in progress, handleRestore skipped");
            }
            return;
        }
        if (saved.activeSessionId !== undefined && saved.activeSessionId) {
            setActiveSessionId(saved.activeSessionId);
            localStorage.setItem('robizin_active_session_id', saved.activeSessionId);
        }
        if (saved.previewUrl !== undefined) setPreviewUrl(saved.previewUrl);

        // Result Authority Guard
        const currentResult = latestStateRef.current?.result ?? result;
        const currentUsable = hasUsableReverseResult(currentResult);
        const savedResult = saved.result;
        const savedUsable = hasUsableReverseResult(savedResult);

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Reverse Restore Guard] current usable: ${currentUsable}`);
            console.log(`[Reverse Restore Guard] saved usable: ${savedUsable}`);
        }

        if (savedUsable) {
            if (!currentUsable) {
                // Rule C: Current result unusable + Saved result usable -> RESTORE
                setResult(saved.result);
                if (process.env.NODE_ENV !== 'production') {
                    console.log("[Reverse Restore Guard] restore applied");
                }
            } else {
                // Rule E: Both usable -> timestamp freshness check
                const savedTimestamp = saved.updatedAt || saved.timestamp || 0;
                const currentTimestamp = currentResult?.updatedAt || currentResult?.timestamp || 0;
                if (savedTimestamp > currentTimestamp && savedTimestamp > 0) {
                    setResult(saved.result);
                    if (process.env.NODE_ENV !== 'production') {
                        console.log("[Reverse Restore Guard] restore applied");
                    }
                } else {
                    if (process.env.NODE_ENV !== 'production') {
                        console.log("[Reverse Restore Guard] restore skipped");
                    }
                }
            }
        } else {
            // Saved is unusable or null
            if (currentUsable) {
                // Rule A & B: Current usable + Saved unusable/null -> PRESERVE current result
                if (process.env.NODE_ENV !== 'production') {
                    console.log("[Reverse Restore Guard] restore skipped");
                }
            } else {
                // Rule D: Both unusable -> empty state allowed
                if (saved.result !== undefined) setResult(saved.result);
                if (process.env.NODE_ENV !== 'production') {
                    console.log("[Reverse Restore Guard] restore applied");
                }
            }
        }

        if (saved.activeModel !== undefined) setActiveModel(saved.activeModel);
        if (saved.targetModel !== undefined) setTargetModel(saved.targetModel);
        if (saved.activeTab !== undefined) setActiveTab(saved.activeTab);
        if (saved.selectedAvatarId !== undefined) setSelectedAvatarId(saved.selectedAvatarId);
        if (saved.productPreview !== undefined) setProductPreview(saved.productPreview);
        if (saved.productDetails !== undefined) setProductDetails(saved.productDetails);
        if (saved.showObjectLock !== undefined) setShowObjectLock(saved.showObjectLock);
        if (saved.ignoreAudio !== undefined) setIgnoreAudio(saved.ignoreAudio);
        if (saved.customCamera !== undefined) setCustomCamera(saved.customCamera);
        if (saved.customScenario !== undefined) setCustomScenario(saved.customScenario);
        if (saved.customTone !== undefined) setCustomTone(saved.customTone);
        if (saved.videoType !== undefined) setVideoType(saved.videoType);
        if (saved.showCustomOptions !== undefined) setShowCustomOptions(saved.showCustomOptions);
        if (saved.showAdaptModal !== undefined) setShowAdaptModal(saved.showAdaptModal);
        if (saved.adaptData !== undefined) {
            setAdaptData(prev => ({
                ...prev,
                ...saved.adaptData
            }));
        }
        if (saved.adaptImageUrl !== undefined) setAdaptImageUrl(saved.adaptImageUrl);
        if (saved.isAdapting !== undefined) setIsAdapting(saved.isAdapting);
        if (saved.isAnalyzingAdaptProduct !== undefined) setIsAnalyzingAdaptProduct(saved.isAnalyzingAdaptProduct);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.previewUrl && !state.result;
    };

    const {
        AutoSaveIndicator,
        RecoveryBanner
    } = useAutoSaveRecovery('reverse_engineering', currentState, handleRestore, isEmptyOrInitial);

    const { feedback: productPasteFeedback, error: productPasteError } = usePasteImageUpload({
        isActive: showObjectLock && !showAdaptModal,
        onImagePasted: (fileObj) => {
            setProductFile(fileObj);
            setProductPreview(URL.createObjectURL(fileObj));
        }
    });

    const { feedback: adaptPasteFeedback, error: adaptPasteError } = usePasteImageUpload({
        isActive: showAdaptModal,
        onImagePasted: (fileObj) => {
            autofillAnalysisRequestIdRef.current++;
            setIsAnalyzingAdaptProduct(false);
            setAdaptImageFile(fileObj);
            setAdaptImageUrl('');
            resetDerivedProductFields();
        }
    });

    // --- UPGRADED WORKSPACE STATES ---
    const [capturedFrames, setCapturedFrames] = useState<any[]>([]);
    const [selectedFrame, setSelectedFrame] = useState<any | null>(null);
    const [extractingFrames, setExtractingFrames] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(0);
    const [videoMetadata, setVideoMetadata] = useState<{
        duration: number;
        resolution: string;
        aspectRatio: string;
        fps: number;
        sceneEstimate: number;
    } | null>(null);
    const [selectedAnalysisFrame, setSelectedAnalysisFrame] = useState<any | null>(null);
    const [frameIntelligence, setFrameIntelligence] = useState<{
        cameraAngle: string;
        lensStyle: string;
        lighting: string;
        composition: string;
        aspect_ratio: string;
    } | null>(null);
    const [analyzingFrameIntel, setAnalyzingFrameIntel] = useState(false);
    
    // Ambient Match AI states
    const [ambientDna, setAmbientDna] = useState<{
        environment_type?: string;
        dominant_colors?: string;
        lighting_style?: string;
        background_objects?: string;
        surface_materials?: string;
        wall_or_room_style?: string;
        mood?: string;
        composition?: string;
        depth_of_field?: string;
        product_placement_style?: string;
        camera_angle?: string;
        texture_profile?: string;
    } | null>(null);
    const [environmentPromptEn, setEnvironmentPromptEn] = useState('');
    const [negativeEnvironmentPrompt, setNegativeEnvironmentPrompt] = useState('');
    const [productAccuracyLock, setProductAccuracyLock] = useState(true);
    const [productLockPromptEn, setProductLockPromptEn] = useState('');
    const [environmentRemodelPromptEn, setEnvironmentRemodelPromptEn] = useState('');
    const [negativeProductChangePrompt, setNegativeProductChangePrompt] = useState('');
    const [extractingDna, setExtractingDna] = useState(false);
    const [generatingSimilarEnv, setGeneratingSimilarEnv] = useState(false);

    // Promise-based IndexedDB utility to store large payloads, frames, videos and prompts safely
    const getDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ReverseEngineeringDB', 3);
            request.onupgradeneeded = (e) => {
                const db = request.result;
                if (!db.objectStoreNames.contains('sessions')) {
                    db.createObjectStore('sessions');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error("IDB open failed"));
        });
    };

    const idbGet = async (key: string): Promise<any> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('sessions', 'readonly');
                const store = tx.objectStore('sessions');
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error || new Error("IDB get failed"));
            });
        } catch (e) {
            console.error("IndexedDB get error:", e);
            return null;
        }
    };

    const idbSet = async (key: string, val: any): Promise<void> => {
        try {
            const db = await getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('sessions', 'readwrite');
                const store = tx.objectStore('sessions');
                const req = store.put(val, key);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error || new Error("IDB put failed"));
            });
        } catch (e) {
            console.error("IndexedDB set error:", e);
        }
    };

    const saveReverseSession = async (sessId: string) => {
        if (!sessId) return;
        console.log("Saving structured prompts", sessId);
        
        try {
            let effectiveResult = result;
            if (!hasUsableReverseResult(effectiveResult)) {
                try {
                    const existing = await idbGet(sessId).catch(() => null);
                    if (hasUsableReverseResult(existing?.result)) {
                        effectiveResult = existing.result;
                    } else {
                        const backupRaw = localStorage.getItem(`robizin_backup_session_${sessId}`);
                        if (backupRaw) {
                            const parsedBackup = JSON.parse(backupRaw);
                            if (hasUsableReverseResult(parsedBackup?.result)) {
                                effectiveResult = parsedBackup.result;
                            }
                        }
                    }
                } catch (e) {}
            }

            const sessData = {
                id: sessId,
                activeTab,
                activeModel,
                targetModel,
                selectedAvatarId,
                productDetails,
                showObjectLock,
                ignoreAudio,
                customCamera,
                customScenario,
                customTone,
                videoType,
                showCustomOptions,
                showAdaptModal,
                adaptData,
                adaptImageUrl,
                isAdapting,
                isAnalyzingAdaptProduct,
                videoMetadata,
                ambientDna,
                environmentPromptEn,
                negativeEnvironmentPrompt,
                productAccuracyLock,
                productLockPromptEn,
                environmentRemodelPromptEn,
                negativeProductChangePrompt,
                creatorGender,
                creatorAge,
                creatorPersona,
                speakingEnergy,
                speakingPace,
                voiceGender,
                voiceAudience,
                voiceStyle,
                result: hasUsableReverseResult(effectiveResult) ? effectiveResult : (effectiveResult || undefined),
                selectedFrameId: selectedFrame ? selectedFrame.id : null,
                file,
                productFile,
                adaptImageFile,
                productPreview,
                capturedFrames: (capturedFrames || []).map(f => ({
                    id: f.id,
                    timestamp: f.timestamp,
                    time: f.time,
                    label: f.label,
                    dataUrl: f.dataUrl
                }))
            };
            await idbSet(sessId, sessData);

            // Synchronous LocalStorage Backup to shield against browser suspend/tab changes
            try {
                const backupSessData = {
                    ...sessData,
                    file: undefined,
                    productFile: undefined,
                    adaptImageFile: undefined
                };
                localStorage.setItem(`robizin_backup_session_${sessId}`, JSON.stringify(backupSessData));
            } catch (le) {
                console.warn("Failed to write backup session to localStorage:", le);
            }
        } catch (e) {
            console.error("Error saving session in saveReverseSession:", e);
        }
    };

    const restoreReverseSession = async (sessId: string) => {
        if (loading || isAdapting) {
            if (process.env.NODE_ENV !== 'production') {
                console.log("[Reverse Restore Guard] Active execution in progress, restore skipped");
            }
            return;
        }
        console.log("Restoring structured prompts", sessId);
        try {
            let saved = await idbGet(sessId);

            // Fallback to synchronous localStorage backup
            if (!saved) {
                try {
                    const backupRaw = localStorage.getItem(`robizin_backup_session_${sessId}`);
                    if (backupRaw) {
                        saved = JSON.parse(backupRaw);
                        console.log("Restored session from synchronous localStorage backup:", sessId);
                    }
                } catch (le) {
                    console.error("Failed to read backup session from localStorage:", le);
                }
            }

            if (!saved) {
                console.warn("Session data not found in IndexedDB or localStorage backup:", sessId);
                return;
            }
            
            setActiveSessionId(sessId);
            localStorage.setItem('robizin_active_session_id', sessId);
            
            if (saved.activeTab !== undefined) setActiveTab(saved.activeTab);
            if (saved.activeModel !== undefined) setActiveModel(saved.activeModel);
            if (saved.targetModel !== undefined) setTargetModel(saved.targetModel);
            if (saved.selectedAvatarId !== undefined) setSelectedAvatarId(saved.selectedAvatarId);
            if (saved.productDetails !== undefined) setProductDetails(saved.productDetails);
            if (saved.showObjectLock !== undefined) setShowObjectLock(saved.showObjectLock);
            if (saved.ignoreAudio !== undefined) setIgnoreAudio(saved.ignoreAudio);
            if (saved.customCamera !== undefined) setCustomCamera(saved.customCamera);
            if (saved.customScenario !== undefined) setCustomScenario(saved.customScenario);
            if (saved.customTone !== undefined) setCustomTone(saved.customTone);
            if (saved.videoType !== undefined) setVideoType(saved.videoType);
            if (saved.showCustomOptions !== undefined) setShowCustomOptions(saved.showCustomOptions);
            if (saved.showAdaptModal !== undefined) setShowAdaptModal(saved.showAdaptModal);
            if (saved.adaptData !== undefined) setAdaptData(saved.adaptData);
            if (saved.adaptImageUrl !== undefined) setAdaptImageUrl(saved.adaptImageUrl);
            if (saved.isAdapting !== undefined) setIsAdapting(saved.isAdapting);
            if (saved.isAnalyzingAdaptProduct !== undefined) setIsAnalyzingAdaptProduct(saved.isAnalyzingAdaptProduct);
            if (saved.videoMetadata !== undefined) setVideoMetadata(saved.videoMetadata);
            if (saved.creatorGender !== undefined) setCreatorGender(saved.creatorGender);
            if (saved.creatorAge !== undefined) setCreatorAge(saved.creatorAge);
            if (saved.creatorPersona !== undefined) setCreatorPersona(saved.creatorPersona);
            if (saved.speakingEnergy !== undefined) setSpeakingEnergy(saved.speakingEnergy);
            if (saved.speakingPace !== undefined) setSpeakingPace(saved.speakingPace);
            if (saved.voiceGender !== undefined) setVoiceGender(saved.voiceGender);
            if (saved.voiceAudience !== undefined) setVoiceAudience(saved.voiceAudience);
            if (saved.voiceStyle !== undefined) setVoiceStyle(saved.voiceStyle);
            
            if (saved.ambientDna !== undefined) setAmbientDna(saved.ambientDna);
            if (saved.environmentPromptEn !== undefined) setEnvironmentPromptEn(saved.environmentPromptEn);
            if (saved.negativeEnvironmentPrompt !== undefined) setNegativeEnvironmentPrompt(saved.negativeEnvironmentPrompt);
            if (saved.productAccuracyLock !== undefined) setProductAccuracyLock(saved.productAccuracyLock);
            if (saved.productLockPromptEn !== undefined) setProductLockPromptEn(saved.productLockPromptEn);
            if (saved.environmentRemodelPromptEn !== undefined) setEnvironmentRemodelPromptEn(saved.environmentRemodelPromptEn);
            if (saved.negativeProductChangePrompt !== undefined) setNegativeProductChangePrompt(saved.negativeProductChangePrompt);
            
            // Result Authority Guard
            const currentResult = latestStateRef.current?.result ?? result;
            const currentUsable = hasUsableReverseResult(currentResult);
            const savedResult = saved.result;
            const savedUsable = hasUsableReverseResult(savedResult);

            if (process.env.NODE_ENV !== 'production') {
                console.log(`[Reverse Restore Guard] current usable: ${currentUsable}`);
                console.log(`[Reverse Restore Guard] saved usable: ${savedUsable}`);
            }

            if (savedUsable) {
                if (!currentUsable) {
                    // Rule C: Current result unusable + Saved result usable -> RESTORE
                    const enriched = enrichReverseEngineeringResult(saved.result, {
                        creatorGender: saved.creatorGender,
                        creatorPersona: saved.creatorPersona,
                        speakingEnergy: saved.speakingEnergy,
                        speakingPace: saved.speakingPace,
                        productDetails: saved.productDetails,
                        voiceProfile: {
                            gender: saved.voiceGender || DEFAULT_VOICE_PROFILE.gender,
                            audience: saved.voiceAudience || DEFAULT_VOICE_PROFILE.audience,
                            style: saved.voiceStyle || DEFAULT_VOICE_PROFILE.style,
                        }
                    });
                    setResult(enriched);
                    if (process.env.NODE_ENV !== 'production') {
                        console.log("[Reverse Restore Guard] restore applied");
                    }
                } else {
                    // Rule E: Both usable -> timestamp freshness check
                    const savedTimestamp = saved.updatedAt || saved.timestamp || 0;
                    const currentTimestamp = currentResult?.updatedAt || currentResult?.timestamp || 0;
                    if (savedTimestamp > currentTimestamp && savedTimestamp > 0) {
                        const enriched = enrichReverseEngineeringResult(saved.result, {
                            creatorGender: saved.creatorGender,
                            creatorPersona: saved.creatorPersona,
                            speakingEnergy: saved.speakingEnergy,
                            speakingPace: saved.speakingPace,
                            productDetails: saved.productDetails,
                            voiceProfile: {
                                gender: saved.voiceGender || DEFAULT_VOICE_PROFILE.gender,
                                audience: saved.voiceAudience || DEFAULT_VOICE_PROFILE.audience,
                                style: saved.voiceStyle || DEFAULT_VOICE_PROFILE.style,
                            }
                        });
                        setResult(enriched);
                        if (process.env.NODE_ENV !== 'production') {
                            console.log("[Reverse Restore Guard] restore applied");
                        }
                    } else {
                        if (process.env.NODE_ENV !== 'production') {
                            console.log("[Reverse Restore Guard] restore skipped");
                        }
                    }
                }
            } else {
                // Saved is unusable or null
                if (currentUsable) {
                    // Rule A & B: Current usable + Saved unusable/null -> PRESERVE current result
                    if (process.env.NODE_ENV !== 'production') {
                        console.log("[Reverse Restore Guard] restore skipped");
                    }
                } else {
                    // Rule D: Both unusable -> empty state allowed
                    setResult(null);
                    if (process.env.NODE_ENV !== 'production') {
                        console.log("[Reverse Restore Guard] restore applied");
                    }
                }
            }
            
            cleanupObjectUrls();
            
            if (saved.file) {
                setFile(saved.file);
                setPreviewUrl(URL.createObjectURL(saved.file));
            } else {
                setFile(null);
                setPreviewUrl('');
                alert("Vídeo original não encontrado, mas os prompts estruturados foram restaurados.");
            }
            
            if (saved.productFile) {
                setProductFile(saved.productFile);
                setProductPreview(URL.createObjectURL(saved.productFile));
            } else if (saved.productPreview) {
                setProductPreview(saved.productPreview);
                setProductFile(null);
            } else {
                setProductFile(null);
                setProductPreview('');
            }
            
            if (saved.adaptImageFile) {
                setAdaptImageFile(saved.adaptImageFile);
            } else {
                setAdaptImageFile(null);
            }
            
            if (saved.capturedFrames && saved.capturedFrames.length > 0) {
                const restoredFrames = await Promise.all(saved.capturedFrames.map(async (frame: any) => {
                    if (frame.dataUrl) {
                        try {
                            const res = await fetch(frame.dataUrl);
                            const blob = await res.blob();
                            const objUrl = URL.createObjectURL(blob);
                            return {
                                ...frame,
                                url: objUrl
                            };
                        } catch (e) {
                            return frame;
                        }
                    }
                    return frame;
                }));
                setCapturedFrames(restoredFrames);
                
                if (saved.selectedFrameId) {
                    const targetF = restoredFrames.find(f => f.id === saved.selectedFrameId);
                    if (targetF) setSelectedFrame(targetF);
                } else {
                    setSelectedFrame(restoredFrames[restoredFrames.length - 1] || null);
                }
            } else {
                setCapturedFrames([]);
                setSelectedFrame(null);
            }

            if (saved.environmentPromptEn) {
                localStorage.setItem('robizin_pending_cinematic_env', saved.environmentPromptEn);
                localStorage.setItem('robizin_pending_cinematic_product_lock_enabled', saved.productAccuracyLock ? 'true' : 'false');
                localStorage.setItem('robizin_pending_cinematic_environment_editable', 'true');
                localStorage.setItem('robizin_pending_cinematic_product_accuracy_mode', 'tiktok_shop_safe');
                localStorage.setItem('robizin_pending_cinematic_product_lock_prompt_en', saved.productLockPromptEn || '');
                localStorage.setItem('robizin_pending_cinematic_environment_remodel_prompt_en', saved.environmentRemodelPromptEn || '');
                localStorage.setItem('robizin_pending_cinematic_negative_product_change_prompt', saved.negativeProductChangePrompt || '');
            }

            const creatorPrompt = saved.result?.blocks || saved.result;
            const sceneBlocks = saved.result?.blocks || [];
            const dnaAnalysis = saved.result?.hook_dna || saved.ambientDna || null;
            const smartRemodelOutput = saved.result?.remodeling_intensity || null;
            const flow = saved.result?.veo_structure || [];
            const sora = saved.result?.sora_structure || [];
            const grok = saved.result?.grok_structure || [];
            const json = saved.result || null;

            console.log("Restores summary logs:");
            console.log("Restoring structured prompts", sessId);
            console.log("Restored creator prompt", !!creatorPrompt);
            console.log("Restored scene blocks", sceneBlocks.length);
            console.log("Restored DNA analysis", !!dnaAnalysis);
            console.log("Restored smart remodel", !!smartRemodelOutput);
            console.log("Restored model outputs", { flow, sora, grok, json });

        } catch (err) {
            console.error("Error in restoreReverseSession:", err);
        }
    };

    // Reactive Auto-Save triggered by changes to structured prompts, tabs and settings
    useEffect(() => {
        if (activeSessionId) {
            saveReverseSession(activeSessionId);
        }
    }, [
        activeSessionId,
        result,
        capturedFrames,
        selectedFrame,
        activeTab,
        ambientDna,
        environmentPromptEn,
        negativeEnvironmentPrompt,
        productAccuracyLock,
        productLockPromptEn,
        environmentRemodelPromptEn,
        negativeProductChangePrompt,
        creatorGender,
        creatorAge,
        creatorPersona,
        speakingEnergy,
        speakingPace,
    ]);

    const latestStateRef = useRef<any>(null);
    latestStateRef.current = {
        activeSessionId,
        activeTab,
        activeModel,
        targetModel,
        selectedAvatarId,
        productDetails,
        showObjectLock,
        ignoreAudio,
        customCamera,
        customScenario,
        customTone,
        videoType,
        showCustomOptions,
        showAdaptModal,
        adaptData,
        adaptImageUrl,
        isAdapting,
        isAnalyzingAdaptProduct,
        videoMetadata,
        ambientDna,
        environmentPromptEn,
        negativeEnvironmentPrompt,
        productAccuracyLock,
        productLockPromptEn,
        environmentRemodelPromptEn,
        negativeProductChangePrompt,
        creatorGender,
        creatorAge,
        creatorPersona,
        speakingEnergy,
        speakingPace,
        result,
        selectedFrame,
        file,
        productFile,
        adaptImageFile,
        productPreview,
        capturedFrames
    };

    // Immediate Save on Tab switch / Document hidden / Before unload
    useEffect(() => {
        const handleImmediateSave = () => {
            const state = latestStateRef.current;
            if (!state || !state.activeSessionId) return;

            console.log("IMMEDIATE SAVE TRIGGERED FOR REVERSE ENGINEERING SESSION:", state.activeSessionId);

            let effectiveResult = state.result;
            if (!hasUsableReverseResult(effectiveResult) && state.activeSessionId) {
                try {
                    const backupRaw = localStorage.getItem(`robizin_backup_session_${state.activeSessionId}`);
                    if (backupRaw) {
                        const parsed = JSON.parse(backupRaw);
                        if (hasUsableReverseResult(parsed?.result)) {
                            effectiveResult = parsed.result;
                        }
                    }
                } catch (e) {}
            }

            // 1. Synchronously save the session backup to localStorage
            try {
                const backupSessData = {
                    id: state.activeSessionId,
                    activeTab: state.activeTab,
                    activeModel: state.activeModel,
                    targetModel: state.targetModel,
                    selectedAvatarId: state.selectedAvatarId,
                    productDetails: state.productDetails,
                    showObjectLock: state.showObjectLock,
                    ignoreAudio: state.ignoreAudio,
                    customCamera: state.customCamera,
                    customScenario: state.customScenario,
                    customTone: state.customTone,
                    videoType: state.videoType,
                    showCustomOptions: state.showCustomOptions,
                    showAdaptModal: state.showAdaptModal,
                    adaptData: state.adaptData,
                    adaptImageUrl: state.adaptImageUrl,
                    isAdapting: state.isAdapting,
                    isAnalyzingAdaptProduct: state.isAnalyzingAdaptProduct,
                    videoMetadata: state.videoMetadata,
                    ambientDna: state.ambientDna,
                    environmentPromptEn: state.environmentPromptEn,
                    negativeEnvironmentPrompt: state.negativeEnvironmentPrompt,
                    productAccuracyLock: state.productAccuracyLock,
                    productLockPromptEn: state.productLockPromptEn,
                    environmentRemodelPromptEn: state.environmentRemodelPromptEn,
                    negativeProductChangePrompt: state.negativeProductChangePrompt,
                    creatorGender: state.creatorGender,
                    creatorAge: state.creatorAge,
                    creatorPersona: state.creatorPersona,
                    speakingEnergy: state.speakingEnergy,
                    speakingPace: state.speakingPace,
                    result: hasUsableReverseResult(effectiveResult) ? effectiveResult : (effectiveResult || undefined),
                    selectedFrameId: state.selectedFrame ? state.selectedFrame.id : null,
                    productPreview: state.productPreview,
                    capturedFrames: (state.capturedFrames || []).map((f: any) => ({
                        id: f.id,
                        timestamp: f.timestamp,
                        time: f.time,
                        label: f.label,
                        dataUrl: f.dataUrl
                    }))
                };
                localStorage.setItem(`robizin_backup_session_${state.activeSessionId}`, JSON.stringify(backupSessData));
                localStorage.setItem('robizin_active_session_id', state.activeSessionId);
            } catch (le) {
                console.warn("Failed to write fast backup session to localStorage:", le);
            }

            // 2. Perform the async IndexedDB save
            try {
                const sessData = {
                    id: state.activeSessionId,
                    activeTab: state.activeTab,
                    activeModel: state.activeModel,
                    targetModel: state.targetModel,
                    selectedAvatarId: state.selectedAvatarId,
                    productDetails: state.productDetails,
                    showObjectLock: state.showObjectLock,
                    ignoreAudio: state.ignoreAudio,
                    customCamera: state.customCamera,
                    customScenario: state.customScenario,
                    customTone: state.customTone,
                    videoType: state.videoType,
                    showCustomOptions: state.showCustomOptions,
                    showAdaptModal: state.showAdaptModal,
                    adaptData: state.adaptData,
                    adaptImageUrl: state.adaptImageUrl,
                    isAdapting: state.isAdapting,
                    isAnalyzingAdaptProduct: state.isAnalyzingAdaptProduct,
                    videoMetadata: state.videoMetadata,
                    ambientDna: state.ambientDna,
                    environmentPromptEn: state.environmentPromptEn,
                    negativeEnvironmentPrompt: state.negativeEnvironmentPrompt,
                    productAccuracyLock: state.productAccuracyLock,
                    productLockPromptEn: state.productLockPromptEn,
                    environmentRemodelPromptEn: state.environmentRemodelPromptEn,
                    negativeProductChangePrompt: state.negativeProductChangePrompt,
                    creatorGender: state.creatorGender,
                    creatorAge: state.creatorAge,
                    creatorPersona: state.creatorPersona,
                    speakingEnergy: state.speakingEnergy,
                    speakingPace: state.speakingPace,
                    result: hasUsableReverseResult(effectiveResult) ? effectiveResult : (effectiveResult || undefined),
                    selectedFrameId: state.selectedFrame ? state.selectedFrame.id : null,
                    file: state.file,
                    productFile: state.productFile,
                    adaptImageFile: state.adaptImageFile,
                    productPreview: state.productPreview,
                    capturedFrames: (state.capturedFrames || []).map((f: any) => ({
                        id: f.id,
                        timestamp: f.timestamp,
                        time: f.time,
                        label: f.label,
                        dataUrl: f.dataUrl
                    }))
                };
                idbSet(state.activeSessionId, sessData);
            } catch (e) {
                console.error("Failed to write fast IDB session:", e);
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                handleImmediateSave();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('beforeunload', handleImmediateSave);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleImmediateSave);
        };
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const productInputRef = useRef<HTMLInputElement>(null);
    const adaptFileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Paste handler interceptor
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const pastedFile = items[i].getAsFile();
                    if (!pastedFile) continue;
                    
                    if (file) {
                        setProductFile(pastedFile);
                        setProductPreview(URL.createObjectURL(pastedFile));
                    } else {
                        setFile(pastedFile);
                        setPreviewUrl(URL.createObjectURL(pastedFile));
                    }
                    break;
                }
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [file]);

    // Load avatars and session history on mount
    useEffect(() => {
        try {
            const savedAvatars = loadCanonicalAvatars();
            setAvatars(savedAvatars);
        } catch(e) {}

        try {
            const savedHistory = JSON.parse(localStorage.getItem('robizin_reverse_history') || '[]');
            const uniqueHistory = Array.isArray(savedHistory)
                ? savedHistory.reduce((acc: any[], current: any) => {
                    if (current && current.id && !acc.some(item => item.id === current.id)) {
                        acc.push(current);
                    }
                    return acc;
                }, [])
                : [];
            setSessionHistory(uniqueHistory);
        } catch(e) {}

        try {
            const lastActiveSessId = localStorage.getItem('robizin_active_session_id');
            if (lastActiveSessId) {
                restoreReverseSession(lastActiveSessId);
            }
        } catch(e) {}
    }, []);

    // Sync avatars from canonical storage on storage events, same-tab events, and focus
    useEffect(() => {
        const handleSync = (savedAvatars: any[]) => {
            setAvatars(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(savedAvatars)) {
                    return savedAvatars;
                }
                return prev;
            });
        };

        const initial = loadCanonicalAvatars();
        handleSync(initial);

        const unsubscribe = subscribeToAvatarUpdates(handleSync);
        return unsubscribe;
    }, []);

    // Release Object URLs on unmount and file refresh to prevent memory leaks
    const cleanupObjectUrls = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            console.log("Releasing main video Object URL:", previewUrl);
            URL.revokeObjectURL(previewUrl);
        }
        capturedFrames.forEach(frame => {
            if (frame.url && frame.url.startsWith('blob:')) {
                console.log("Releasing frame Object URL:", frame.url);
                URL.revokeObjectURL(frame.url);
            }
        });
    };

    useEffect(() => {
        return () => {
            cleanupObjectUrls();
        };
    }, [previewUrl, capturedFrames]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            cleanupObjectUrls();
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
            setResult(null);
            
            // Generate a fresh session ID right away
            const newSessId = `sess_${Date.now()}`;
            setActiveSessionId(newSessId);
            localStorage.setItem('robizin_active_session_id', newSessId);
            
            // Clear prior session states
            setCapturedFrames([]);
            setSelectedFrame(null);
            setSelectedAnalysisFrame(null);
            setFrameIntelligence(null);
            setVideoMetadata(null);
            console.log("Successfully loaded reference video:", f.name);
        }
    };

    const handleProductSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setProductFile(f);
            setProductPreview(URL.createObjectURL(f));
        }
    };

    const fileToBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(f);
    });

    const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const video = e.currentTarget;
        const meta = {
            duration: video.duration,
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            aspectRatio: video.videoWidth === video.videoHeight ? '1:1' : video.videoWidth > video.videoHeight ? '16:9' : '9:16',
            fps: 30, // Standard video framerate default
            sceneEstimate: Math.max(2, Math.floor(video.duration / 3.5))
        };
        setVideoMetadata(meta);
        console.log("Detected Video Metadata:", meta);

        // Auto-save the session in local history log
        if (file) {
            try {
                const historyObj = JSON.parse(localStorage.getItem('robizin_reverse_history') || '[]');
                const sessId = activeSessionId || `sess_${Date.now()}`;
                if (!activeSessionId) {
                    setActiveSessionId(sessId);
                    localStorage.setItem('robizin_active_session_id', sessId);
                }
                const newSession = {
                    id: sessId,
                    videoName: file.name,
                    date: new Date().toLocaleDateString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
                    duration: video.duration.toFixed(1) + 's',
                    resolution: meta.resolution,
                    aspectRatio: meta.aspectRatio
                };
                const filteredHistory = Array.isArray(historyObj) ? historyObj.filter((s: any) => s && s.id !== sessId) : [];
                const updatedList = [newSession, ...filteredHistory];
                const uniqueList = updatedList.reduce((acc: any[], current: any) => {
                    if (current && current.id && !acc.some(item => item.id === current.id)) {
                        acc.push(current);
                    }
                    return acc;
                }, []);
                const slicedList = uniqueList.slice(0, 5);
                localStorage.setItem('robizin_reverse_history', JSON.stringify(slicedList));
                setSessionHistory(slicedList);
                
                // Immediately save the metadata session state
                saveReverseSession(sessId);
            } catch(e) {
                console.error("Error logging local history:", e);
            }
        }
    };

    const captureFrame = (e: React.MouseEvent) => {
        if(e) e.stopPropagation();
        const video = videoRef.current;
        if (!video) { alert("Erro: Vídeo não inicializado."); return; }
        if (video.readyState < 2) { alert("Aguarde o vídeo carregar ou dê play antes de capturar."); return; }
        try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            canvas.toBlob((blob) => {
                if (!blob) return;
                const objUrl = URL.createObjectURL(blob);
                const time = video.currentTime;
                const mins = Math.floor(time / 60);
                const secs = Math.floor(time % 60);
                const stamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                
                const frameId = `manual_${Date.now()}`;
                const newFrame = {
                    id: frameId,
                    url: objUrl,
                    dataUrl: dataUrl,
                    timestamp: stamp,
                    time: time,
                    label: `Frame ${capturedFrames.length + 1} — ${stamp}`
                };
                
                setCapturedFrames(prev => [...prev, newFrame]);
                setSelectedFrame(newFrame);
                console.log(`Manual Frame captured successfully at stream timestamp ${stamp}`);
            }, "image/jpeg", 0.85);
        } catch (err) {
            console.error("Erro captureFrame:", err);
            alert("Erro ao capturar frame do visualizador.");
        }
    };

    const extractKeyFrames = async (interval: number) => {
        if (!previewUrl) return alert("Por favor, selecione um vídeo de referência primeiro.");
        setExtractingFrames(true);
        setExtractionProgress(1);
        console.log(`Command triggered: Automatic Frame Extraction. Mode/Interval: ${interval === -1 ? 'Smart AI' : interval + 's'}`);

        let useFallback = false;
        let duration = 15; // default fallback duration in seconds

        try {
            const hiddenVideo = document.createElement("video");
            hiddenVideo.src = previewUrl;
            hiddenVideo.muted = true;
            hiddenVideo.playsInline = true;

            try {
                await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error("Timeout loading video metadata"));
                    }, 3500);

                    hiddenVideo.onloadedmetadata = () => {
                        clearTimeout(timeoutId);
                        resolve(true);
                    };
                    hiddenVideo.onerror = () => {
                        clearTimeout(timeoutId);
                        reject(new Error("Erro ao renderizar vídeo oculto de extração"));
                    };
                });
                duration = hiddenVideo.duration || 15;
            } catch (videoLoadError) {
                console.warn("Using fallback mock frames for keyframe extraction because video element could not load the source:", videoLoadError);
                useFallback = true;
            }

            const timesToExtract: number[] = [];

            if (interval === -1) {
                // Smart AI Mode: Extract 5 key moments (0%, 25%, 50%, 75%, 95% progress)
                const step = duration > 10 ? duration / 5 : 2;
                for (let i = 0; i < 5; i++) {
                    timesToExtract.push(Math.min(i * step, duration - 0.1));
                }
            } else {
                for (let t = 0.1; t < duration; t += interval) {
                    timesToExtract.push(t);
                }
            }

            const extracted: any[] = [];
            
            for (let i = 0; i < timesToExtract.length; i++) {
                const time = timesToExtract[i];
                
                if (!useFallback) {
                    try {
                        hiddenVideo.currentTime = time;
                        await new Promise((resolve) => {
                            const tId = setTimeout(() => resolve(false), 2000);
                            hiddenVideo.onseeked = () => {
                                clearTimeout(tId);
                                resolve(true);
                            };
                            hiddenVideo.onerror = () => {
                                clearTimeout(tId);
                                resolve(false);
                            };
                        });
                    } catch (seekErr) {
                        console.warn("Seek failed, falling back for this frame:", seekErr);
                        useFallback = true;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = (!useFallback && hiddenVideo.videoWidth) ? hiddenVideo.videoWidth : 640;
                canvas.height = (!useFallback && hiddenVideo.videoHeight) ? hiddenVideo.videoHeight : 360;
                const ctx = canvas.getContext("2d");
                
                if (ctx) {
                    if (!useFallback) {
                        try {
                            ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                        } catch (drawErr) {
                            console.warn("Draw image failed, generating placeholder:", drawErr);
                            useFallback = true;
                        }
                    }
                    
                    if (useFallback) {
                        // Create a beautiful slate gradient mockup as keyframe representation
                        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                        gradient.addColorStop(0, '#1e1e2f');
                        gradient.addColorStop(1, '#0f0f16');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Frame visual helper lines
                        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

                        // Grid background decoration
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.lineWidth = 1;
                        for (let x = 0; x < canvas.width; x += 40) {
                            ctx.beginPath();
                            ctx.moveTo(x, 0);
                            ctx.lineTo(x, canvas.height);
                            ctx.stroke();
                        }
                        for (let y = 0; y < canvas.height; y += 40) {
                            ctx.beginPath();
                            ctx.moveTo(0, y);
                            ctx.lineTo(canvas.width, y);
                            ctx.stroke();
                        }

                        // Decorative abstract geometry (cinematic soundwaves / tracks visualization)
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                        for (let bar = 0; bar < 8; bar++) {
                            const barHeight = 20 + Math.sin(bar + time) * 30;
                            ctx.fillRect(50 + bar * 15, canvas.height - 50 - barHeight, 10, barHeight);
                        }

                        // Main text label info
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(`CENA DETECTADA — ${(time).toFixed(1)}s`, canvas.width / 2, canvas.height / 2 - 20);

                        ctx.fillStyle = '#10b981';
                        ctx.font = 'bold 12px monospace';
                        ctx.fillText(`[ANÁLISE DE TIMELINE INTELIGENTE]`, canvas.width / 2, canvas.height / 2 + 15);
                        
                        ctx.fillStyle = '#94a3b8';
                        ctx.font = '11px sans-serif';
                        ctx.fillText(`Cena processada automaticamente para engenharia reversa`, canvas.width / 2, canvas.height / 2 + 45);
                    }
                }

                const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.75));
                
                if (blob) {
                    const objUrl = URL.createObjectURL(blob);
                    const mins = Math.floor(time / 60);
                    const secs = Math.floor(time % 60);
                    const stamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                    extracted.push({
                        id: `auto_${Date.now()}_${i}`,
                        url: objUrl,
                        dataUrl: dataUrl,
                        timestamp: stamp,
                        time: time,
                        label: `Frame ${capturedFrames.length + extracted.length + 1} — ${stamp}`
                    });
                }
                setExtractionProgress(Math.ceil(((i + 1) / timesToExtract.length) * 100));
            }

            setCapturedFrames(prev => [...prev, ...extracted]);
            if (extracted.length > 0) {
                setSelectedFrame(extracted[0]);
            }
            console.log(`Auto extracted ${extracted.length} keyframes successfully.`);
        } catch (err: any) {
            console.error("Erro extractKeyFrames:", err);
            alert("Erro durante extração automática de frames: " + err.message);
        } finally {
            setExtractingFrames(false);
            setExtractionProgress(0);
        }
    };

    const analyzeSelectedFrameIntel = async () => {
        if (!selectedFrame) return;
        if (!currentKey) { alert("Configure a Chave API para rodar a Inteligência de Frames."); return; }
        
        setAnalyzingFrameIntel(true);
        console.log(`Requesting Gemini analysis for Frame captured at ${selectedFrame.timestamp}...`);
        try {
            const b64 = selectedFrame.dataUrl.split(',')[1];
            const prompt = `Analise este frame de vídeo comercial e extraia detalhes exatos sobre a cinematografia de produto. Retorne APENAS um objeto JSON válido (com campos curtos, em Português) usando exatamente o seguinte esquema, sem markdown, sem caixas de código:
            {
              "cameraAngle": "Ex. Close-up Dinâmico, Ângulo de Inseto, Close-up Médio",
              "lensStyle": "Ex. Lente Prime 35mm f/1.8 de Desfoque Suave, Macro Comercial 100mm",
              "lighting": "Ex. Softbox Difuso de Três Pontos, Spotlight Chiaroscuro de Alto Contraste",
              "composition": "Ex. Regra dos terços, centralizado e focado, profundidade de campo sutil",
              "aspect_ratio": "Ex. Vertical 9:16 ou Horizontal 16:9"
            }`;
            
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: b64 } }] }]
            });
            
            let txt = data.candidates[0].content.parts[0].text;
            txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = safeJSONParse(txt, {
                cameraAngle: "Close-up Comercial",
                lensStyle: "Lente Comercial de Alta Definição",
                lighting: "Spotlight Suave Coletivo",
                composition: "Elemento Centralizado em Foco",
                aspect_ratio: "Vertical detectado"
            });
            
            setFrameIntelligence(parsed);
            console.log("Frame Analysis completed with AI success:", parsed);
        } catch (e: any) {
            console.error(e);
            setFrameIntelligence({
                cameraAngle: "Close-Up Cinematográfico",
                lensStyle: "Lente Fotográfica 50mm Comercial",
                lighting: "Iluminação de Estúdio Suave",
                composition: "Foco Centralizado no Produto",
                aspect_ratio: "9:16 / Vertical"
            });
        } finally {
            setAnalyzingFrameIntel(false);
        }
    };

    // Auto trigger heuristic data when frame is changed to avoid blank screens
    useEffect(() => {
        if (selectedFrame) {
            // Provide a natural visual preview immediately, which they can enrich with AI call
            setFrameIntelligence({
                cameraAngle: "Mapeando Ângulo...",
                lensStyle: "Ajustando Lente...",
                lighting: "Analisando Tons...",
                composition: "Analisando Grade...",
                aspect_ratio: videoMetadata?.aspectRatio || "9:16"
            });
            // Clear prior Ambient DNA Match AI state for the newly selected frame
            setAmbientDna(null);
            setEnvironmentPromptEn('');
            setNegativeEnvironmentPrompt('');
            setProductLockPromptEn('');
            setEnvironmentRemodelPromptEn('');
            setNegativeProductChangePrompt('');
        }
    }, [selectedFrame]);

    const sendToCinematic = () => {
        if (!selectedFrame) return;
        localStorage.setItem('robizin_pending_cinematic_frame', selectedFrame.dataUrl);
        window.dispatchEvent(new CustomEvent('change-active-view', { detail: 'cinematic' }));
        console.log("Transferred pending frame to Cinematic Engine successfully.");
    };

    const sendToVanessa = () => {
        if (!selectedFrame) return;
        localStorage.setItem('robizin_pending_vanessa_frame', selectedFrame.dataUrl);
        window.dispatchEvent(new CustomEvent('change-active-view', { detail: 'vanessa' }));
        console.log("Transferred pending frame to Vanessa Copy Creator successfully.");
    };

    const handleExtractDna = async () => {
        if (!selectedFrame) return;
        if (!currentKey) {
            alert("Por favor, configure sua Chave de API no topo da página.");
            return;
        }
        setExtractingDna(true);
        try {
            const b64 = selectedFrame.dataUrl.split(',')[1];
            const prompt = `Analise detalhadamente este frame de referência de vídeo e extraia o DNA do ambiente (AMBIENT_DNA). Retorne APENAS um JSON plano com os seguintes campos:
            {
               "environment_type": "Ex: Estúdio de mesa moderno minimalista, Cozinha rústica industrial, Banheiro spa luxuoso",
               "dominant_colors": "Escreva as cores dominantes (ex: tons de madeira natural, bege, off-white, verde sálvia)",
               "lighting_style": "Estilo específico de luz (ex: luz de janela natural suave lateral, iluminação difusa tridimensional)",
               "background_objects": "Objetos decorativos secundários (ex: livro de capa dura, folha seca de palmeira em vaso abstrato)",
               "surface_materials": "Textura/material onde produto se apoia (ex: madeira clara com vetores naturais escovados, concreto polido)",
               "wall_or_room_style": "Estilo estético geral (ex: parede texturizada de gesso fosco neutro com sombras de folhas)",
               "mood": "Atmosfera e sentimento (ex: aconchegante, clean, sofisticação serena, orgânico manufaturado)",
               "composition": "Equilíbrio de render de cena (ex: produto centralizado no terço inferior, elementos decorativos balanceados ao fundo)",
               "depth_of_field": "Nível de foco do fundo (ex: desfoque de fundo suave e amanteigado tipo bokeh comercial f/1.8)",
               "product_placement_style": "Ex: apoiado em base monolítica geométrica de pedra calcária clara",
               "camera_angle": "Ex: ângulo frontal de altura dos olhos levemente inclinado para baixo",
               "texture_profile": "Ex: superfícies foscas táteis com grão orgânico fino e microdetalhes nítidos"
            }`;
            
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: b64 } }] }]
            });
            
            let txt = data.candidates[0].content.parts[0].text;
            txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = safeJSONParse(txt, null);
            if (parsed) {
                setAmbientDna(parsed);
                console.log("Ambient DNA loaded:", parsed);
            } else {
                throw new Error("Não foi possível parsear a resposta do DNA.");
            }
        } catch (e: any) {
            console.error("Extract DNA Error:", e);
            alert("Erro ao extrair DNA do ambiente: " + e.message);
        } finally {
            setExtractingDna(false);
        }
    };

    const handleGenerateSimilarEnv = async () => {
        if (!selectedFrame) return;
        if (!currentKey) {
            alert("Por favor, configure sua Chave de API no topo da página.");
            return;
        }
        setGeneratingSimilarEnv(true);
        try {
            const b64 = selectedFrame.dataUrl.split(',')[1];
            const dnaText = ambientDna ? JSON.stringify(ambientDna) : "Visual frame-based environment extraction.";
            const prompt = `Você é um Engenheiro de Prompts Sênior especialista em IA de vídeo (Sora, Veo, Runway, Kling e Flow) e Arquiteto de Conformidade do TikTok Shop.
            Seu objetivo é analisar o frame enviado e/ou os dados de DNA de ambiente abaixo para gerar um prompt em inglês de recriação de cenário similar garantindo conformidade comercial e segurança de produto.

            O usuário selecionou o seguinte modo de proteção:
            - TikTok Shop Bloqueio de Precisão do Produto (PRODUCT_ACCURACY_LOCK): ${productAccuracyLock ? "ATIVADO (MUITO ESTRITO)" : "DESATIVADO"}

            DNA do Ambiente a Respeitar:
            ${dnaText}
            
            REGRAS OBRIGATÓRIAS DE CONFORMIDADE TIKTOK SHOP & SHOPEE:
            - O produto principal ou objeto comercial deve permanecer VISUALMENTE IDÊNTICO ao frame de referência. Qualquer alteração no produto pode causar suspensão do anúncio por "Conteúdo enganoso / produto divergente" ou "mismatch between video and product listing".
            - APENAS o cenário, iluminação e ambiente ao redor podem ser modificados/remodelados.
            - Caso o produto seja um item de decoração, relógio, cosmético, eletrônico ou embalagem, preserve com exatidão máxima: formato, cores exatas, texturas, escala, logotipo, letras decorativas, texto de rótulo, embalagem, quantidade e materiais.
            - O cenário remodelado pode mudar as paredes, texturas do fundo, decorações secundárias, foco/profundidade de campo (depth of field) e atmosfera geral de luz, contanto que mantenha o produto em si na mesma escala e posição relativa.
            
            Retorne APENAS um objeto JSON válido contendo exatamente os seguintes campos de texto em inglês:
            {
               "ENVIRONMENT_PROMPT_EN": "Uma descrição linda em inglês de 3 a 5 frases focado em recriar a atmosfera, iluminação, cores e materiais da cena.",
               "NEGATIVE_ENVIRONMENT_PROMPT": "Uma lista de termos proibidos (prompt negativo) em inglês focado em evitar layout idêntico, textos do fundo, objetos idênticos e defeitos visuais de morphing do cenário original.",
               "PRODUCT_LOCK_PROMPT_EN": "A description focusing on keeping the original product exactly identical to the reference image. State clearly: Do not modify its shape, color, material, texture, typography, logo, text, scale, proportions, arrangement, accessories, quantity, or visual identity. Only the surrounding environment may be changed.",
               "ENVIRONMENT_REMODEL_PROMPT_EN": "A description detailing the style of the remodeled background inspired by the reference frame. State clearly: Create a new surrounding environment inspired by the reference frame. Preserve the mood, lighting, color palette, camera angle, interior design style and atmosphere, but keep the product itself unchanged.",
               "NEGATIVE_PRODUCT_CHANGE_PROMPT": "A strict negative prompt regarding the product: Do not change the product. Do not redesign the object. Do not alter the color, shape, texture, material, text, logo, label, typography, scale, quantity, arrangement or product identity. Do not hallucinate new product details. Do not replace the product with a similar version."
            }`;
            
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: b64 } }] }]
            });
            
            let txt = data.candidates[0].content.parts[0].text;
            txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = safeJSONParse(txt, null);
            if (parsed) {
                setEnvironmentPromptEn(parsed.ENVIRONMENT_PROMPT_EN || "");
                setNegativeEnvironmentPrompt(parsed.NEGATIVE_ENVIRONMENT_PROMPT || "");
                setProductLockPromptEn(parsed.PRODUCT_LOCK_PROMPT_EN || "Keep the original product exactly identical to the reference image. Do not modify its shape, color, material, texture, typography, logo, text, scale, proportions, arrangement, accessories, quantity, or visual identity. Only the surrounding environment may be changed.");
                setEnvironmentRemodelPromptEn(parsed.ENVIRONMENT_REMODEL_PROMPT_EN || "Create a new surrounding environment inspired by the reference frame. Preserve the mood, lighting, color palette, camera angle, interior design style and atmosphere, but keep the product itself unchanged.");
                setNegativeProductChangePrompt(parsed.NEGATIVE_PRODUCT_CHANGE_PROMPT || "Do not change the product. Do not redesign the object. Do not alter the color, shape, texture, material, text, logo, label, typography, scale, quantity, arrangement or product identity. Do not hallucinate new product details. Do not replace the product with a similar version.");
                console.log("Similar environment loaded with TikTok Shop locks:", parsed);
            } else {
                throw new Error("Não foi possível parsear a resposta do cenário similar.");
            }
        } catch (e: any) {
            console.error("Generate Similar Env Error:", e);
            alert("Erro ao gerar cenário similar: " + e.message);
        } finally {
            setGeneratingSimilarEnv(false);
        }
    };

    const sendEnvironmentToCinematic = () => {
        if (!environmentPromptEn) {
            alert("Gere o Cenário Similar primeiro antes de enviar para o Cinematic Engine.");
            return;
        }
        localStorage.setItem('robizin_pending_cinematic_env', environmentPromptEn);
        localStorage.setItem('robizin_pending_cinematic_product_lock_enabled', productAccuracyLock ? 'true' : 'false');
        localStorage.setItem('robizin_pending_cinematic_environment_editable', 'true');
        localStorage.setItem('robizin_pending_cinematic_product_accuracy_mode', 'tiktok_shop_safe');
        localStorage.setItem('robizin_pending_cinematic_product_lock_prompt_en', productLockPromptEn);
        localStorage.setItem('robizin_pending_cinematic_environment_remodel_prompt_en', environmentRemodelPromptEn);
        localStorage.setItem('robizin_pending_cinematic_negative_product_change_prompt', negativeProductChangePrompt);
        
        window.dispatchEvent(new CustomEvent('change-active-view', { detail: 'cinematic' }));
        console.log("Transferred pending ambient prompt and TikTok safe locks to Cinematic Engine successfully.");
    };

    const handleCopyFullPackage = () => {
        let fullText = `=== AMBIENT MATCH AI PACKAGE ===\n\n`;
        if (ambientDna) {
            fullText += `[AMBIENT DNA EXTRACTION]\n`;
            Object.entries(ambientDna).forEach(([key, value]) => {
                fullText += `- ${key}: ${value}\n`;
            });
            fullText += `\n`;
        }
        fullText += `[ENVIRONMENT_PROMPT_EN]\n${environmentPromptEn}\n\n`;
        fullText += `[NEGATIVE_ENVIRONMENT_PROMPT]\n${negativeEnvironmentPrompt}\n`;
        
        copyToClipboard(fullText);
        alert("Pacote completo copiado com sucesso!");
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyFullTikTokPackage = () => {
        let packageText = `=== TIKTOK SHOP SAFE PRODUCT ACCURACY PACKAGE ===\n\n`;
        packageText += `[PRODUCT_LOCK_PROMPT_EN]\n${productLockPromptEn || 'Keep the original product exactly identical to the reference image. Do not modify its shape, color, material, texture, typography, logo, text, scale, proportions, arrangement, accessories, quantity, or visual identity.'}\n\n`;
        packageText += `[ENVIRONMENT_REMODEL_PROMPT_EN]\n${environmentRemodelPromptEn || 'Create a new surrounding environment inspired by the reference frame. Preserve the mood, lighting, color palette, camera angle, interior design style and atmosphere, but keep the product itself unchanged.'}\n\n`;
        packageText += `[NEGATIVE_PRODUCT_CHANGE_PROMPT]\n${negativeProductChangePrompt || 'Do not change the product. Do not redesign the object. Do not alter the color, shape, texture, material, text, logo, label, typography, scale, quantity, arrangement or product identity.'}\n\n`;
        packageText += `[STANDARD ENVIRONMENT COMBINED PROMPT]\n${environmentPromptEn || ''}\n\n`;
        packageText += `[NEGATIVE_ENVIRONMENT_PROMPT]\n${negativeEnvironmentPrompt || ''}\n\n`;
        if (ambientDna) {
            packageText += `[AMBIENT DNA EXTRACTION PARAMETERS]\n`;
            Object.entries(ambientDna).forEach(([key, value]) => {
                packageText += `- ${key}: ${value}\n`;
            });
        }
        copyToClipboard(packageText);
        alert("Full TikTok-Safe Environment Package copiado com sucesso!");
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const downloadFrame = () => {
        if (!selectedFrame) return;
        const link = document.createElement('a');
        link.download = `${file ? file.name.split('.')[0] : 'video'}_frame_${selectedFrame.timestamp.replace(':', '_')}.jpg`;
        link.href = selectedFrame.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const extractDetailsFromImage = async () => {
        if (!productFile) return alert("Envie uma imagem de referência do produto primeiro (ex: verso/traseira).");
        if (!currentKey) return alert("Configure a Chave API.");

        setExtractingDetails(true);
        try {
            const b64 = await fileToBase64(productFile);
            const prompt = "Analyze this product image. Extract ONLY the core physical traits needed for AI video consistency: exact material, main colors, distinct shape, and any highly visible text/logo. Return a VERY CONCISE comma-separated list in English (Maximum 30 words). NO marketing buzzwords, ONLY concrete visual facts.";
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: productFile.type, data: b64 } }] }]
            });
            const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            setProductDetails(prev => (prev ? prev + " | " : "") + description);
        } catch (e: any) {
            alert("Erro ao extrair detalhes: " + e.message);
        } finally {
            setExtractingDetails(false);
        }
    };

    const normalizeDetectedCategory = (aiCategory: string, productName: string = ''): string => {
        const combined = `${aiCategory || ''} ${productName || ''}`.toLowerCase().trim();
        if (!combined) return '';

        // 1. Calçados (Sandálias, rasteirinhas, tênis, sapatos, chinelos, botas, tamancos, etc.)
        if (/sand[aá]li|rasteir|chinel|t[eê]nis|sapat|bota|tamanc|mocassim|scarpin|rasteira|cal[cç]ad|crocs|slide|sneaker|footwear/i.test(combined)) {
            return 'Calçados';
        }

        // 2. Moda & Vestuário (Roupas, vestidos, camisas, calças, casacos, etc.)
        if (/vestu[aá]ri|roup|vestid|camis|camiset|cal[cç]a|jaquet|casac|short|saia|moletom|lingerie|biqu[ií]ni|moda\b|blus/i.test(combined)) {
            return 'Moda & Vestuário';
        }

        // 3. Perfumaria & Beleza (Perfumes, cosméticos, maquiagem, skincare)
        if (/perfum|fragr[aâ]nc|col[oô]ni|aroma|desodor|maquiag|make|batom|rimel|r[ií]mel|skincare|pele|creme|hidratant|s[eé]rum|cabel|shampoo|condicionador|escova\s+(?:alisadora|secadora)|cosm[eé]t/i.test(combined)) {
            return 'Perfumaria & Beleza';
        }

        // 4. Relógios & Smartwatch (Smartwatches, relógios de pulso, cronógrafos)
        if (/smartwatch|rel[oó]gi|relogio|wrist\s*watch|cron[oó]graf|pulseira\s+inteligent|apple\s*watch|mi\s*band/i.test(combined)) {
            return 'Relógios & Smartwatch';
        }

        // 5. Eletrônicos & Tecnologia (Fones, celulares, carregadores, caixas de som, gadgets)
        if (/eletr[oô]nic|fone|earbud|headphon|headset|bluetooth|celular|smartphon|carregador|powerbank|cabo\s+usb|notebook|computad|tablet|gadget|caixa\s+de\s+som|drone|c[aâ]mera/i.test(combined)) {
            return 'Eletrônicos & Tecnologia';
        }

        // 6. Cozinha & Utilidades (Panelas, airfryer, liquidificador, potes, garrafas térmicas)
        if (/cozinh|panela|frigideir|air\s*fryer|liquidificad|batedeir|pote|facas?|garrafa\s*t[eé]rmic|copo\s*stanley|utens[ií]lio|copo|caneca|prato|processador\s+de\s+alimento/i.test(combined)) {
            return 'Cozinha & Utilidades';
        }

        // 7. Casa & Organização (Cadeiras, sapateiras, organizadores, prateleiras, móveis, decoração)
        if (/casa\b|organizad|sapateira|cabid|prateleir|gaveteir|m[oó]ve|cadeir|sof[aá]|mesa\b|estante|almofad|cortina|lumin[aá]ri|abajur|decora[cç]|tapet|cama|len[cç]ol|toalha/i.test(combined)) {
            return 'Casa & Organização';
        }

        // 8. Saúde & Bem-Estar (Ortopedia, joelheiras, corretores posturais, massageadores, etc.)
        if (/sa[uú]de|ortop[eé]d|joelheir|corretor\s+postural|massagead|palmilha|coluna|al[ií]vio\s+de\s+dor|suplement|term[oô]metr|inalad/i.test(combined)) {
            return 'Saúde & Bem-Estar';
        }

        // 9. Acessórios & Joias (Bolsas, carteiras, mochilas, colares, anéis, brincos, óculos)
        if (/acess[oó]ri|joia|j[oó]ia|bolsa|mochil|carteir|óculos|oculos|colar\b|anel\b|brinco|pulseira(?!.*inteligent)|bijuteri/i.test(combined)) {
            return 'Acessórios & Joias';
        }

        // 10. Automotivo (Acessórios para carro, suportes veiculares, limpadores)
        if (/automot|ve[ií]cul|carro|moto\b|suporte\s+veicular|aspirador\s+port[aá]til|pneu/i.test(combined)) {
            return 'Automotivo';
        }

        // 11. Pet Shop
        if (/pet|cachorr|c[aã]o|gato|felin|ra[cç][aã]o|coleira|brinquedo\s+pet|caminha\s+pet|tapete\s+higi[eê]nic/i.test(combined)) {
            return 'Pet Shop';
        }

        // 12. Infantil & Bebês
        if (/infantil|beb[eê]|crian[cç]|brinqued(?!.*pet)|mordedor|chupeta|carrinho\s+de\s+beb/i.test(combined)) {
            return 'Infantil & Bebês';
        }

        if (aiCategory && typeof aiCategory === 'string' && aiCategory.trim()) {
            const clean = aiCategory.trim();
            if (!/^(geral|produto|item|outro|outros|n\/a|none|unknown)$/i.test(clean)) {
                return clean;
            }
        }

        return '';
    };

    const handleAutoFillProduct = async () => {
        if (!adaptImageFile && !adaptImageUrl) return alert("Envie uma imagem ou cole um link primeiro.");
        if (!currentKey) return alert("Configure a Chave API.");

        const requestId = ++autofillAnalysisRequestIdRef.current;
        resetDerivedProductFields();
        setIsAnalyzingAdaptProduct(true);
        try {
            let requestParts: any[] = [];
            if (adaptImageFile) {
                const b64 = await fileToBase64(adaptImageFile);
                requestParts.push({ inlineData: { mimeType: adaptImageFile.type, data: b64 } });
            } else if (adaptImageUrl) {
                try {
                    let response = await fetch(adaptImageUrl).catch(() => fetch('https://corsproxy.io/?' + encodeURIComponent(adaptImageUrl)));
                    if (!response || !response.ok) throw new Error("Erro no link.");
                    const blob = await response.blob();
                    const b64 = await new Promise<string>((resolve, reject) => { 
                        const reader = new FileReader(); 
                        reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || ''); 
                        reader.onerror = reject; 
                        reader.readAsDataURL(blob); 
                    });
                    requestParts.push({ inlineData: { mimeType: blob.type || 'image/jpeg', data: b64 } });
                } catch(err) {
                    requestParts.push({ text: `Analise o produto neste link/texto: ${adaptImageUrl}` });
                }
            }

            const prompt = `
                Atue como um Especialista Sênior em E-commerce, Copywriting de Conversão e Inteligência de Produtos.
                Analise a imagem ou link do produto fornecido com máxima acuidade visual e técnica.

                Identifique com precisão o produto REAL e extraia/infira as seguintes propriedades comerciais:

                1. "name": Nome comercial, atraente e específico do produto em português (ex: se for uma sandália rasteira: "Sandália Rasteirinha Confort Feminina"; se for perfume: "Perfume Importado Masculino 100ml"; se for organizador: "Sapateira Organizadora Multiuso"; se for smartwatch: "Smartwatch Esportivo Pro").
                2. "category": Categoria canônica exata em português (ex: "Calçados", "Moda & Vestuário", "Perfumaria & Beleza", "Relógios & Smartwatch", "Eletrônicos & Tecnologia", "Cozinha & Utilidades", "Casa & Organização", "Saúde & Bem-Estar", "Acessórios & Joias", "Automotivo", "Pet Shop", "Infantil & Bebês"). NUNCA invente uma categoria que não corresponda ao produto da imagem.
                3. "priceRange": Faixa de preço realista estimada para o mercado brasileiro (ex: "R$ 79 a R$ 139").
                4. "targetAudience": Perfil de público-alvo ESPECÍFICO deste produto em português (ex: para uma sandália rasteira: "Mulheres que buscam conforto, leveza e estilo para o dia a dia e passeios", JAMAIS use descrições genéricas vazias).
                5. "mainBenefit": O principal benefício prático ou transformação que este produto específico entrega (ex: "Caminhar com maciez e frescor sem causar atrito ou machucar os pés").
                6. "mainPain": A dor ou incômodo urgente que o produto elimina (ex: "Dores e cansaço nos pés ao usar calçados duros e pesados em dias quentes").
                7. "uniqueDifferentiator": O diferencial físico, anatômico ou de design real visível no produto (ex: "Design anatômico com tiras macias e solado leve antiderrapante").
                8. "platform": Escolha a plataforma mais propícia entre: "TikTok Shop", "Shopee Vídeo", "Mercado Livre", "Instagram Reels", "YouTube Shorts", "Facebook Reels".
                9. "features": Lista (array de strings) com 3 a 5 características reais do produto (ex: ["Solado flexível antiderrapante", "Tiras macias de toque suave", "Palmilha confortável", "Acabamento leve e resistente"]).
                10. "angleStrategy": Escolha o melhor ângulo entre: "emergencia", "economia", "autoridade", "praticidade", "independencia".
                11. "hookIntensity": Escolha a intensidade recomendada entre: "normal", "forte", "agressivo".

                Retorne APENAS um JSON válido no formato abaixo, sem nenhum texto adicional fora do JSON:
                {
                    "name": "Nome do produto",
                    "category": "Calçados",
                    "priceRange": "R$ 79 a R$ 139",
                    "targetAudience": "Mulheres que buscam conforto e estilo no dia a dia",
                    "mainBenefit": "Alívio e leveza ao caminhar sem machucar os pés",
                    "mainPain": "Pés cansados e dores ao usar calçados duros",
                    "uniqueDifferentiator": "Palmilha anatômica acolchoada com solado flexível antiderrapante",
                    "platform": "TikTok Shop",
                    "features": ["Solado antiderrapante", "Tiras confortáveis", "Palmilha anatômica macia"],
                    "angleStrategy": "praticidade",
                    "hookIntensity": "forte"
                }
            `;
            requestParts.unshift({ text: prompt });

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: requestParts }],
                generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "medium" } }
            });

            if (requestId !== autofillAnalysisRequestIdRef.current) return;

            const resultParsed = safeJSONParse(data?.candidates?.[0]?.content?.parts?.[0]?.text, {});
            
            const cleanStr = (val: any): string => (typeof val === 'string' ? val.trim() : '');
            const newProductName = cleanStr(resultParsed.name || resultParsed.newProduct);
            const rawCategory = cleanStr(resultParsed.category);
            const normalizedCategory = normalizeDetectedCategory(rawCategory, newProductName);
            const priceRangeVal = cleanStr(resultParsed.priceRange);
            const targetAudienceVal = cleanStr(resultParsed.targetAudience);
            const mainBenefitVal = cleanStr(resultParsed.mainBenefit);
            const mainPainVal = cleanStr(resultParsed.mainPain);
            const uniqueDiffVal = cleanStr(resultParsed.uniqueDifferentiator);
            
            let featuresVal = '';
            if (Array.isArray(resultParsed.features)) {
                featuresVal = resultParsed.features.map((f: any) => String(f).trim()).filter(Boolean).join(', ');
            } else if (typeof resultParsed.features === 'string') {
                featuresVal = resultParsed.features.trim();
            }

            const validPlatforms = ["TikTok Shop", "Shopee Vídeo", "Mercado Livre", "Instagram Reels", "YouTube Shorts", "Facebook Reels"];
            const validAngles = ["emergencia", "economia", "autoridade", "praticidade", "independencia"];
            const validHooks = ["normal", "forte", "agressivo"];

            const finalPlatform = (typeof resultParsed.platform === 'string' && validPlatforms.includes(resultParsed.platform)) ? resultParsed.platform : 'TikTok Shop';
            const finalAngle = (typeof resultParsed.angleStrategy === 'string' && validAngles.includes(resultParsed.angleStrategy.toLowerCase())) ? resultParsed.angleStrategy.toLowerCase() : 'praticidade';
            const finalHook = (typeof resultParsed.hookIntensity === 'string' && validHooks.includes(resultParsed.hookIntensity.toLowerCase())) ? resultParsed.hookIntensity.toLowerCase() : 'forte';

            // Log debug results for validation without any base64/image payload
            console.log('AUTOFILL_RAW_RESULT:', resultParsed);
            console.log('AUTOFILL_NORMALIZED_RESULT:', {
                name: newProductName,
                category: normalizedCategory,
                rawCategory,
                priceRange: priceRangeVal,
                targetAudience: targetAudienceVal,
                mainBenefit: mainBenefitVal,
                mainPain: mainPainVal,
                uniqueDifferentiator: uniqueDiffVal,
                features: featuresVal,
                platform: finalPlatform,
                angleStrategy: finalAngle,
                hookIntensity: finalHook
            });

            setAdaptData(prev => {
                if (requestId !== autofillAnalysisRequestIdRef.current) return prev;
                return {
                    ...prev,
                    // Derived fields strictly overwritten by fresh analysis; NEVER defaulting to previous product state
                    newProduct: newProductName,
                    category: normalizedCategory,
                    priceRange: priceRangeVal,
                    targetAudience: targetAudienceVal,
                    mainBenefit: mainBenefitVal,
                    mainPain: mainPainVal,
                    uniqueDifferentiator: uniqueDiffVal,
                    features: featuresVal,
                    platform: finalPlatform as any,
                    angleStrategy: finalAngle,
                    hookIntensity: finalHook,
                    productVisionData: undefined
                };
            });
            
        } catch(e: any) {
            if (requestId === autofillAnalysisRequestIdRef.current) {
                alert("Erro ao analisar produto com IA: " + e.message);
            }
        } finally {
            if (requestId === autofillAnalysisRequestIdRef.current) {
                setIsAnalyzingAdaptProduct(false);
            }
        }
    };

    const handleModeChange = (mode: 'preservar_viral' | 'preservar_visual' | 'remodelar_total') => {
        let defaults: string[] = [];
        if (mode === 'preservar_viral') {
            defaults = ['hook', 'conversion_structure', 'cta_position', 'demo_type', 'visual_proof'];
        } else if (mode === 'preservar_visual') {
            defaults = ['editing_pace', 'visual_style', 'camera_movement'];
        } else {
            defaults = [];
        }
        setAdaptData(prev => ({
            ...prev,
            adaptationMode: mode,
            preserveElements: defaults
        }));
    };

    const handleAdaptProduct = async () => {
        if (isAdapting) return;
        if (!adaptData.newProduct) return alert("Preencha o nome do novo produto.");
        if (!currentKey) return alert("Configure a Chave API.");

        // Register executionId, invalidate previous execution & reset parallel pipeline state (ETAPA 12A.4)
        const executionId = ++latestAdaptationExecutionIdRef.current;
        setFinalRemodeledProject(null);
        setReversePipelineStatus('IDLE');
        setReversePipelineWarnings([]);
        setShowPipelineWarnings(false);

        setIsAdapting(true);
        try {
            let modeInstructions = "";
            let dnaInstructions = "";
            if (adaptData.adaptationMode === 'preservar_viral') {
                modeInstructions = `
                    MODO DE ADAPTAÇÃO: 🧬 PRESERVAR ESTRUTURA VIRAL.
                    Você DEVE obrigatoriamente:
                    - PRESERVAR RIGIDAMENTE:
                      * A estrutura e estilo do Gancho (Hook structure) - ex: se o original começa com um gancho de curiosidade, de pânico ou de revelação, mantenha esse formato de gatilho.
                      * A sequência lógica de conversão (Conversion sequence) e fluxo dos blocos.
                      * Os gatilhos psicológicos utilizados originalmente.
                      * O posicionamento e timing do Call To Action (CTA).
                      * O fluxo de demonstração do produto (Demonstration flow).
                      * A progressão de cenas (Scene progression) intacta.
                    - NÃO SE DEVE PRESERVAR (reescreva de forma inovadora para o novo produto):
                      * O produto original e referências de marca.
                      * A identidade do avatar/personagem original.
                      * O ambiente/cenário (rebuild completo para adequar ao novo produto).
                      * O texto das falas e diálogo.
                      * Substitua todas as referências do produto antigo pelo novo produto adaptado, mantendo a mímica estrutural viral perfeita!
                `;
                dnaInstructions = `
                    Como você está operando em "Modo Preservar Estrutura Viral", extraia, defina e coloque no objeto JSON raiz as seguintes propriedades de string obrigatórias:
                    - "hook_dna": Uma descrição curta (1-2 frases) do DNA e do gatilho emocional da estrutura de gancho identificada no roteiro original.
                    - "conversion_dna": Uma descrição curta (1-2 frases) descrevendo como a copy constrói valor e desejo para induzir a conversão.
                    - "visual_dna": Uma descrição curta (1-2 frases) detalhando o DNA e conceito visual adotado nas cenas.
                    - "voice_dna": Uma descrição curta (1-2 frases) detalhando o ritmo, entonação e tom de voz ideal para esta adaptação.
                    - "cta_dna": Uma descrição curta (1-2 frases) detalhando o gatilho final e escopo do CTA.
                    - "adaptation_summary": Uma descrição curta de 2-3 linhas de como a engrenagem viral original e sua estrutura de blocos foram preservadas e ajustadas para o novo produto ("${adaptData.newProduct}").
                `;
            } else if (adaptData.adaptationMode === 'preservar_visual') {
                modeInstructions = `
                    MODO DE ADAPTAÇÃO: PRESERVAR APENAS VISUAL.
                    Você DEVE:
                    - Manter as referências estéticas, cores, iluminação e movimentos de câmera.
                    - Criar uma nova copy de diálogo e estrutura narrativa 100% desenhada do zero para o novo produto, desvinculada dos gatilhos ou sequências anteriores.
                `;
            } else {
                modeInstructions = `
                    MODO DE ADAPTAÇÃO: REMODELAR TOTALMENTE.
                    Você DEVE:
                    - Recriar totalmente o visual, o diálogo, a sequência de cenas e o tom, gerando novos ângulos inovadores do zero especificamente otimizados para o novo produto.
                `;
            }

            const intensityVal = adaptData.remodelingIntensity !== undefined ? adaptData.remodelingIntensity : 50;
            let remodelingInstructions = `
                🎚 NÍVEL DE REMODELAGEM: ${intensityVal}%.
                Você deve controlar a similaridade ao DNA criativo original estritamente baseado no Nível de Remodelagem de ${intensityVal}%:
                - Se o nível estiver próximo de 0% (ou de 0% a 14%): muito próximo do original - preserve quase tudo exceto a identidade do produto. similaridade deve ser máxima.
                - Se o nível estiver próximo de 25% (ou de 15% a 39%): leve adaptação - preserve gancho, ritmo e estrutura de cena. Adapte as referências do produto.
                - Se o nível estiver próximo de 55% (ou de 40% a 64%): equilibrado - mantém o DNA de conversão, mas remodela visual, narrativa e fala para o novo produto.
                - Se o nível estiver próximo de 75% (ou de 65% a 89%): forte remodelagem - preserva apenas gatilhos psicológicos e timing do CTA. Redefina cenas e falas livremente.
                - Se o nível estiver de 90% a 100%: criativo totalmente novo - usa o DNA extraído apenas como inspiração e cria um criativo totalmente novo de forma livre.

                Adicione OBRIGATORIAMENTE no objeto JSON raiz:
                - "remodeling_intensity": o número correspondente ao nível de remodelagem de hoje (exatamente ${intensityVal}).
                - "what_preserved": Texto resumido especificando com clareza o que de fato foi preservado/mantido do roteiro original.
                - "what_changed": Texto resumido especificando o que foi substancialmente reescrito ou redesenhado para o novo produto.
                - "similarity_risk": Nível de risco de similaridade em relação ao original. Escolha exatamente um dos valores: "High" (se nível de remodelagem estiver entre 0 e 30), "Medium" (se nível estiver entre 31 e 70) ou "Low" (se nível estiver entre 71 e 100).
            `;

            const preserveElementsVal = adaptData.preserveElements || [];
            let preserveInstructions = `
                ☑ ELEMENTOS SELECIONADOS PARA PRESERVAR (preserve_elements): [${preserveElementsVal.map(x => `"${x}"`).join(', ')}].
                
                Você DEVE obrigatoriamente seguir as diretrizes rígidas sobre o que manter e o que remodelar/alterar de acordo com a seleção de preserve_elements do usuário:
                - "hook" (Hook): ${preserveElementsVal.includes('hook') ? 'PRESERVE o DNA e impacto do gancho original. Adapte o diálogo ao novo produto de forma mimetizada.' : 'Crie um gancho completamente novo sob medida para o novo produto.'}
                - "conversion_structure" (Estrutura de Conversão): ${preserveElementsVal.includes('conversion_structure') ? 'PRESERVE o fluxo lógico de conversão e a sequência de blocos argumentativos.' : 'Desenhe um fluxo narrativo e uma estrutura lógica de conversão totalmente nova adaptada ao novo produto.'}
                - "editing_pace" (Ritmo de Edição): ${preserveElementsVal.includes('editing_pace') ? 'PRESERVE os tempos médios, velocidade e ritmo de corte das cenas.' : 'Mude livremente a duração e ritmo de cortes das cenas.'}
                - "visual_style" (Estilo Visual): ${preserveElementsVal.includes('visual_style') ? 'PRESERVE o estilo estético geral, cenário e cores descritos nos prompts.' : 'Desenhe um estilo visual inovador e adequado ao nicho/público do novo produto.'}
                - "cta_position" (Posição do CTA): ${preserveElementsVal.includes('cta_position') ? 'PRESERVE o timing e posição estratégico em que o Call to Action original é feito.' : 'Reposicione ou reestruture a chamada para ação final de forma mais oportuna.'}
                - "voice_style" (Estilo de Voz): ${preserveElementsVal.includes('voice_style') ? 'PRESERVE o estilo de voz/locução e ritmo do narrador.' : 'Mude o estilo e o tom ideal da narração para corresponder melhor ao novo produto.'}
                - "camera_movement" (Movimento de Câmera): ${preserveElementsVal.includes('camera_movement') ? 'PRESERVE os movimentos de câmera cinemáticos e enquadramentos especificados.' : 'Use movimentos de câmera totalmente repaginados e inovadores.'}
                - "demo_type" (Tipo de Demonstração): ${preserveElementsVal.includes('demo_type') ? 'PRESERVE a mímica e a forma de demonstrar os benefícios do original.' : 'Crie uma forma alternativa de demonstrar os atributos do novo produto.'}
                - "visual_proof" (Prova Visual): ${preserveElementsVal.includes('visual_proof') ? 'PRESERVE as provas visuais e de credibilidade do original.' : 'Substitua as provas originais por ganchos ou explicações mais adequadas ao novo produto.'}
                - "presentation_energy" (Energia da Apresentação): ${preserveElementsVal.includes('presentation_energy') ? 'PRESERVE a energia e entonação emocional da fala.' : 'Ajuste livremente a energia da oratória para se adequar ao tom do novo produto.'}

                Sempre que um elemento NÃO estiver no array preserve_elements, você está AUTORIZADO E DEVE remodelá-lo para adequar melhor de maneira inteligente ao novo produto.

                Adicione OBRIGATORIAMENTE no objeto JSON raiz:
                - "preserved_elements_list": Array de strings listando os nomes em português de cada elemento que foi de fato mantido (ex: ["Hook", "Estrutura de Conversão", ...]).
                - "remodeled_elements_list": Array de strings listando de forma explícita os elementos amigáveis em português que foram modificados/remodelados (ex: ["Estilo Visual", "Estilo de Voz", ...]).
            `;

            const newProductPayload = {
                name: adaptData.newProduct,
                category: adaptData.category,
                target_audience: adaptData.targetAudience,
                price_range: adaptData.priceRange,
                main_benefit: adaptData.mainBenefit,
                main_pain: adaptData.mainPain,
                unique_differentiator: adaptData.uniqueDifferentiator,
                platform: adaptData.platform
            };

            let ctaRulesText = "";
            let platformIntelligenceInfo = "";
            let recommendedDurationDefault = "30-60s";
            let defaultCtaText = "";

            if (adaptData.platform === "TikTok Shop") {
                ctaRulesText = `Você DEVE OBRIGATORIAMENTE usar expressões como "carrinho laranja" ou "sacola" para a chamada de ação (CTA) final.`;
                recommendedDurationDefault = "15-25s";
                defaultCtaText = "Carrinho laranja";
                platformIntelligenceInfo = `
                    CARACTERÍSTICAS DA PLATAFORMA TikTok Shop:
                    - Estilo: UGC, ritmo muito rápido, interrupção de padrão visual forte e enérgica, demonstração ágil do produto com prova social de uso imediato.
                    - Call To Action (CTA): Focado em instigar o clique no carrinho laranja ou sacola da loja.
                    - Duração média/alvo de retenção: 15 a 30 segundos.
                    - Otimização necessária: Tornar o gancho agressivo, voz altamente entusiasmada e energética, CTA com máxima urgência temporal e fluxo de conversão muito limpo.
                `;
            } else if (adaptData.platform === "Shopee Vídeo") {
                ctaRulesText = `Você DEVE OBRIGATORIAMENTE usar expressões como "produto marcado" ou "link da Shopee" para a chamada de ação (CTA) final.`;
                recommendedDurationDefault = "20-35s";
                defaultCtaText = "Produto marcado";
                platformIntelligenceInfo = `
                    CARACTERÍSTICAS DA PLATAFORMA Shopee Vídeo:
                    - Estilo: Focado em preço, custo-benefício competitivo, cupons de desconto e apelo irresistível de frete grátis. Demonstração prática do produto destacando a economia.
                    - Call To Action (CTA): "produto marcado" ou "link da Shopee".
                    - Duração recomendada: 20 a 35 segundos.
                    - Otimização necessária: Posicionamento claro do preço/desconto, vantagens de economia imediata e destaque para o cupom de desconto.
                `;
            } else if (adaptData.platform === "Mercado Livre") {
                ctaRulesText = `Você DEVE OBRIGATORIAMENTE usar expressões como "link do anúncio" ou "produto no anúncio" para a chamada de ação (CTA) final.`;
                recommendedDurationDefault = "20-30s";
                defaultCtaText = "link do anúncio";
                platformIntelligenceInfo = `
                    CARACTERÍSTICAS DA PLATAFORMA Mercado Livre:
                    - Estilo: Alta credibilidade, qualidade de construção e entrega do produto, segurança de compra e especificações técnicas diretas.
                    - Call To Action (CTA): "link do anúncio" ou "produto no anúncio".
                    - Otimização necessária: Reforço na reputação de vendedor confiável, especificações detalhadas do material e segurança contra fraudes.
                `;
            } else if (adaptData.platform === "Facebook Reels") {
                ctaRulesText = `Você DEVE usar uma abordagem mais sutil e direcionada à curiosidade (soft engagement) ou direcionando para o link de compra nos comentários/descrição.`;
                recommendedDurationDefault = "30-60s";
                defaultCtaText = "Soft engagement";
                platformIntelligenceInfo = `
                    CARACTERÍSTICAS DA PLATAFORMA Facebook Reels:
                    - Estilo: Narrativa humana forte, conexão emocional, estilo storytelling informal ("você não vai acreditar no que aconteceu..."). Vendas menos agressivas.
                    - Call To Action (CTA): Engajamento sutil (soft engagement).
                    - Duração recomendada: 30 a 60 segundos.
                    - Otimização necessária: Narrativa voltada a histórias reais, apelo empático e curiosidade prolongada.
                `;
            } else if (adaptData.platform === "Instagram Reels") {
                ctaRulesText = `Você DEVE OBRIGATORIAMENTE usar expressões como "toque no link disponível" ou "chame no direct" para a chamada de ação (CTA) final.`;
                recommendedDurationDefault = "15-30s";
                defaultCtaText = "link disponível ou chame no direct";
                platformIntelligenceInfo = `
                    CARACTERÍSTICAS DA PLATAFORMA Instagram Reels:
                    - Estilo: Super estético, focado em lifestyle, branding pessoal ou de produto sofisticado, uso forte de provas sociais elegantes, harmonia de cores e aspiração de status.
                    - Call To Action (CTA): Direcionando para clicar no link da bio ("toque no link disponível") ou enviar mensagem privados ("chame no direct").
                    - Otimização necessária: Visual impecável, desejabilidade imediata e posicionamento aspiracional de status.
                `;
            } else if (adaptData.platform === "YouTube Shorts") {
                ctaRulesText = `Você DEVE usar um CTA persuasivo altamente focado em retenção profunda ou loops de curiosidade.`;
                recommendedDurationDefault = "30-60s";
                defaultCtaText = "Retention-focused";
                platformIntelligenceInfo = `
                    CARACTERÍSTICAS DA PLATAFORMA YouTube Shorts:
                    - Estilo: Projetado para o máximo watch time (taxa de retenção), ganchos de curiosidade contínuos, ângulo altamente educativo ou demonstrações ultra-curiosas (ex: antes e depois rápido, testes de resistência extrema).
                    - Call To Action (CTA): Curtas chamadas voltadas ao engajamento constante ou visualização do link fixado.
                    - Duração recomendada: 30 a 60 segundos.
                    - Otimização necessária: Loops de curiosidade que se conectam ao início do vídeo, dinamismo sem espaços vazios de silêncio e montagem cirúrgica.
                `;
            }

            const prompt = `
                ATUE COMO UM ESPECIALISTA EM ENGENHARIA REVERSA E COPYWRITING DE VÍDEO CURTO.
                
                Você receberá uma ESTRUTURA DE VÍDEO ORIGINAL (tempos, cenas, ângulos) e precisará ADAPTAR toda a narrativa, diálogo e contexto visual para um NOVO PRODUTO de acordo com as especificações a seguir.
                
                ESTRUTURA ORIGINAL (JSON):
                ${JSON.stringify(result)}
                
                DADOS DO NOVO PRODUTO (new_product):
                \`\`\`json
                ${JSON.stringify(newProductPayload, null, 2)}
                \`\`\`

                DEMAIS VARIÁVEIS DE ADAPTAÇÃO:
                CARACTERÍSTICAS ADICIONAIS: ${adaptData.features}
                ÂNGULO ESTRATÉGICO: ${adaptData.angleStrategy}
                INTENSIDADE DO GANCHO (HOOK): ${adaptData.hookIntensity}
                
                PERFIL DE CRIADOR / INFLUENCER SELECIONADO:
                - Gênero do Criador: ${creatorGender}
                - Faixa de Idade/Estilo: ${creatorAge}
                - Persona de Apresentação: ${creatorPersona}
                - Energia de Fala: ${speakingEnergy}/100
                - Ritmo/Pace de Fala: ${speakingPace}

                Você DEVE obrigatoriamente projetar este Perfil de Criador selecionado nos blocos gerados:
                1. No "voice_description_en": Descreva as características de voz e entonação de acordo com o Gênero, Idade, Energia e Persona selecionados. Mantenha consistência.
                2. No "dialogue_pt_br": Adapte o nível de persuasão, gírias e vocabulário à Persona (ex: TikTok Shop Seller foca em vendas imediatas apontando para o carrinho; Casual Friend usa termos amigáveis e naturais; Authority Expert é formal e técnico).
                3. No "visual_prompt_en" / Actions: Inclua orientações de linguagem corporal (body language) e presença de câmera condizentes com o gênero e persona escolhidos.
                4. Cada cena gerada no JSON (veo_structure, sora_structure, ou grok_structure) DEVE incluir a propriedade "creator_profile" textualmente preenchida com: "Gender: ${creatorGender}, Persona: ${creatorPersona}, Energy: ${speakingEnergy}%, Pace: ${speakingPace}".
                
                ${modeInstructions}
                ${dnaInstructions}
                ${remodelingInstructions}
                ${preserveInstructions}

                🎯 DIRETRIZES DE ADAPTAÇÃO PARA A PLATAFORMA SELECIONADA (${adaptData.platform}):
                ${platformIntelligenceInfo}

                As variáveis geradas para as cenas, especificamente 'visual_prompt_en', 'voice_description_en', 'dialogue_pt_br', 'CTA' e 'Hook' em cada bloco DEVEM obrigatoriamente se adaptar a essas características de estilo de voz, energia, duração e ritmo que a plataforma selecionada exige.

                DIRETRIZES DE ESTILO E ADAPTAÇÃO COM BASE NOS DADOS DO NOVO PRODUTO (OBRIGATÓRIO):
                - Hook: Se "hook" está selecionado em preserve_elements, preserve o DNA e ritmo do original adaptando as palavras. Se não estiver selecionado, crie um novo gancho adaptado ao comportamento da plataforma selecionada focado na Dor Principal: "${newProductPayload.main_pain}".
                - Diálogo: Adapte todo o diálogo textual para o público-alvo "${newProductPayload.target_audience}", ressaltando os benefícios: "${newProductPayload.main_benefit}".
                - CTA: Adapte o CTA final para a plataforma "${newProductPayload.platform}". ${ctaRulesText}
                - Prova Visual & Demonstração: Foque na demonstração do Diferencial Único do Produto "${newProductPayload.unique_differentiator}".
                - Objeções: Resolva objeções relativas à categoria "${newProductPayload.category}" e à faixa de preço "${newProductPayload.price_range}".

                DIRETRIZES RÍGIDAS DE REESCRITA E TEMPO:
                1. MANTENHA a mesma quantidade de blocos, tempos e identificadores originais intactos.
                2. ADAPTE os campos 'visual_prompt_en' (ESTE DEVE ESTAR EM INGLÊS) para fazerem sentido com o novo produto e o apelo visual da plataforma.
                3. REESCREVA o 'dialogue_pt_br' focado 100% no novo produto, aplicando REGRAS RÍGIDAS DE CONTAGEM DE PALAVRAS E ESTILO DE COMUNICAÇÃO DA PLATAFORMA.
                4. RETORNE E ADAPTE todos os blocos de cena usando 'visual_prompt_en', 'dialogue_pt_br' e 'voice_language: "pt-BR"'.
                5. Para o JSON, retorne na mesma estrutura (usando as chaves veo_structure, sora_structure, ou grok_structure que vieram no original).
                ${adaptData.adaptationMode === 'preservar_viral' ? '6. ADICIONE OBRIGATORIAMENTE no objeto JSON raiz as propriedades de string adicionais solicitadas: "hook_dna", "conversion_dna", "visual_dna", "voice_dna", "cta_dna" e "adaptation_summary".' : ''}
                7. ADICIONE OBRIGATORIAMENTE no objeto JSON raiz as chaves decretadas: "remodeling_intensity" (com valor ${intensityVal}), "what_preserved", "what_changed", "similarity_risk", "preserved_elements_list" e "remodeled_elements_list".
                8. ADICIONE OBRIGATORIAMENTE no objeto JSON raiz o resumo dos detalhes de adaptação na chave "new_product_adaptation_summary" acompanhando as propriedades de texto: {"name": "${newProductPayload.name}", "target_audience": "${newProductPayload.target_audience}", "platform": "${newProductPayload.platform}", "main_benefit": "${newProductPayload.main_benefit}", "cta_strategy": "Sua explicação resumida de 1 frase descrevendo a copy exata e estratégia persuasiva do CTA idealizado para esta plataforma"}.
                9. ADICIONE OBRIGATORIAMENTE no objeto JSON raiz a chave "platform_adaptation_report" (Relatório de Adaptação para Plataforma) retornando EXATAMENTE esse objeto JSON preenchido com suas considerações estratégicas com base nos guias passados:
                   "platform_adaptation_report": {
                       "platform_selected": "${adaptData.platform}",
                       "hook_strategy": "Sua estratégia de copy adaptada de hook para esta plataforma",
                       "cta_strategy": "Sua estratégia descritiva detalhada de CTA em português",
                       "recommended_duration": "Uma faixa recomendada em segundos baseada nos guias da plataforma (ex: 15-25s ou 30-60s)",
                       "voice_style": "Estilo ideal de voz/narração detalhado para esta plataforma",
                       "recommended_pacing": "Ritmo de edição e corte aconselhado"
                   }
                10. RETORNE APENAS em formato JSON válido respeitando essa estrutura.
            `;

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: "medium" } }
            });
            
            const jsonResult = safeJSONParse(data.candidates[0].content.parts[0].text, {
                tiktok_caption: "",
                veo_structure: [],
                sora_structure: [],
                grok_structure: [],
                hook_dna: "",
                conversion_dna: "",
                visual_dna: "",
                voice_dna: "",
                cta_dna: "",
                adaptation_summary: "",
                remodeling_intensity: intensityVal,
                what_preserved: "",
                what_changed: "",
                similarity_risk: intensityVal <= 30 ? "High" : intensityVal <= 70 ? "Medium" : "Low",
                preserved_elements_list: [],
                remodeled_elements_list: [],
                new_product_adaptation_summary: {
                    name: newProductPayload.name,
                    target_audience: newProductPayload.target_audience,
                    platform: newProductPayload.platform,
                    main_benefit: newProductPayload.main_benefit || "Demonstração e diferenciação imediata de valor",
                    cta_strategy: "CTA direcionado ao " + newProductPayload.platform
                },
                platform_adaptation_report: {
                    platform_selected: newProductPayload.platform,
                    hook_strategy: "Rápido de alto impacto adaptado para a audiência",
                    cta_strategy: "Chamada de ação direcionada baseada em " + defaultCtaText,
                    recommended_duration: recommendedDurationDefault,
                    voice_style: "Entonação e tom apropriados para a plataforma",
                    recommended_pacing: "Ritmo otimizado para a retenção do público"
                }
            });
            
            jsonResult._meta = {
                avatar_used: result._meta?.avatar_used,
                object_lock: "Adaptado: " + adaptData.newProduct,
                adaptation_mode: adaptData.adaptationMode,
                remodeling_intensity: intensityVal,
                preserve_elements: preserveElementsVal.map(key => PRESERVE_ELEMENT_LABELS[key] || key),
                remodeled_elements: Object.keys(PRESERVE_ELEMENT_LABELS).filter(key => !preserveElementsVal.includes(key)).map(key => PRESERVE_ELEMENT_LABELS[key]),
                new_product_adaptation_summary: {
                    name: newProductPayload.name,
                    target_audience: newProductPayload.target_audience,
                    platform: newProductPayload.platform,
                    main_benefit: newProductPayload.main_benefit || "Demonstração e diferenciação imediata de valor",
                    cta_strategy: jsonResult.new_product_adaptation_summary?.cta_strategy || "CTA direcionado focado na plataforma " + newProductPayload.platform
                },
                platform_adaptation_report: jsonResult.platform_adaptation_report || {
                    platform_selected: newProductPayload.platform,
                    hook_strategy: "Rápido de alto impacto adaptado para a audiência",
                    cta_strategy: "Chamada de ação direcionada baseada em " + defaultCtaText,
                    recommended_duration: recommendedDurationDefault,
                    voice_style: "Entonação e tom apropriados para a plataforma",
                    recommended_pacing: "Ritmo otimizado para a retenção do público"
                }
            };

            const enrichedResult = enrichReverseEngineeringResult(jsonResult, {
                creatorGender,
                creatorPersona,
                speakingEnergy,
                speakingPace,
                productDetails: adaptData.newProduct,
                voiceProfile
            });
            setResult(enrichedResult);

            // Execute deterministic reverseRemodelPipeline in parallel state (ETAPA 12A.3)
            try {
                const selectedAvatar = selectedAvatarId
                    ? avatars.find(a => a.id.toString() === selectedAvatarId.toString())
                    : null;

                const pipelineResult = executeReverseRemodelPipeline({
                    rawReferenceResult: enrichedResult,
                    productBridgeInput: {
                        legacyPayload: newProductPayload,
                        userFields: {
                            ...adaptData,
                            productName: adaptData.newProduct,
                            productDetails: adaptData.newProduct,
                            platform: adaptData.platform,
                            mainBenefit: adaptData.mainBenefit,
                            mainPain: adaptData.mainPain,
                            uniqueDifferentiator: adaptData.uniqueDifferentiator,
                            targetAudience: adaptData.targetAudience,
                            category: adaptData.category,
                            priceRange: adaptData.priceRange,
                        },
                        productVisionData: (adaptData as any).productVisionData,
                    },
                    identityBridgeInput: {
                        storedAvatar: selectedAvatar,
                        legacyCreatorFields: {
                            creatorGender,
                            creatorPersona,
                            creatorAge,
                            speakingEnergy,
                            speakingPace,
                            voiceProfile,
                        },
                    },
                    adaptationContractOverride: {
                        adaptationMode: adaptData.adaptationMode as any,
                        remodelingIntensity: intensityVal,
                        preserveElements: preserveElementsVal as any,
                        platform: adaptData.platform as any,
                    },
                });

                // Validate against stale execution before updating state (ETAPA 12A.4 & ETAPA 12B.1)
                if (executionId === latestAdaptationExecutionIdRef.current) {
                    if (pipelineResult.status === 'READY') {
                        setFinalRemodeledProject(pipelineResult.finalSceneProject || null);
                        setReversePipelineStatus('READY');
                        setReversePipelineWarnings([]);

                        if (pipelineResult.finalSceneProject) {
                            const convertedLegacyResult = finalSceneProjectToLegacyReverseResult(
                                pipelineResult.finalSceneProject,
                                enrichedResult
                            );
                            const isValidLegacyResult = Boolean(
                                convertedLegacyResult &&
                                typeof convertedLegacyResult === 'object' &&
                                Array.isArray(convertedLegacyResult.scenes) &&
                                convertedLegacyResult.scenes.length > 0
                            );
                            if (isValidLegacyResult) {
                                const bridgedResult = {
                                    ...convertedLegacyResult,
                                    _meta: convertedLegacyResult._meta || enrichedResult._meta || result?._meta,
                                    hook_dna: convertedLegacyResult.hook_dna ?? enrichedResult.hook_dna ?? result?.hook_dna,
                                    conversion_dna: convertedLegacyResult.conversion_dna ?? enrichedResult.conversion_dna ?? result?.conversion_dna,
                                    visual_dna: convertedLegacyResult.visual_dna ?? enrichedResult.visual_dna ?? result?.visual_dna,
                                    voice_dna: convertedLegacyResult.voice_dna ?? enrichedResult.voice_dna ?? result?.voice_dna,
                                    cta_dna: convertedLegacyResult.cta_dna ?? enrichedResult.cta_dna ?? result?.cta_dna,
                                    adaptation_summary: convertedLegacyResult.adaptation_summary ?? enrichedResult.adaptation_summary ?? result?.adaptation_summary,
                                    remodeling_intensity: convertedLegacyResult.remodeling_intensity ?? enrichedResult.remodeling_intensity ?? result?.remodeling_intensity,
                                    what_preserved: convertedLegacyResult.what_preserved ?? enrichedResult.what_preserved ?? result?.what_preserved,
                                    what_changed: convertedLegacyResult.what_changed ?? enrichedResult.what_changed ?? result?.what_changed,
                                    similarity_risk: convertedLegacyResult.similarity_risk ?? enrichedResult.similarity_risk ?? result?.similarity_risk,
                                    preserved_elements_list: convertedLegacyResult.preserved_elements_list ?? enrichedResult.preserved_elements_list ?? result?.preserved_elements_list,
                                    remodeled_elements_list: convertedLegacyResult.remodeled_elements_list ?? enrichedResult.remodeled_elements_list ?? result?.remodeled_elements_list,
                                    new_product_adaptation_summary: convertedLegacyResult.new_product_adaptation_summary ?? enrichedResult.new_product_adaptation_summary ?? result?.new_product_adaptation_summary,
                                    platform_adaptation_report: convertedLegacyResult.platform_adaptation_report ?? enrichedResult.platform_adaptation_report ?? result?.platform_adaptation_report,
                                };
                                const enrichedBridgedResult = enrichReverseEngineeringResult(bridgedResult, {
                                    creatorGender,
                                    creatorPersona,
                                    speakingEnergy,
                                    speakingPace,
                                    productDetails: adaptData.newProduct,
                                    voiceProfile
                                });
                                setResult(enrichedBridgedResult);
                            }
                        }
                    } else if (pipelineResult.status === 'READY_WITH_WARNINGS') {
                        setFinalRemodeledProject(pipelineResult.finalSceneProject || null);
                        setReversePipelineStatus('READY_WITH_WARNINGS');
                        setReversePipelineWarnings(pipelineResult.warnings || []);

                        if (pipelineResult.finalSceneProject) {
                            const convertedLegacyResult = finalSceneProjectToLegacyReverseResult(
                                pipelineResult.finalSceneProject,
                                enrichedResult
                            );
                            const isValidLegacyResult = Boolean(
                                convertedLegacyResult &&
                                typeof convertedLegacyResult === 'object' &&
                                Array.isArray(convertedLegacyResult.scenes) &&
                                convertedLegacyResult.scenes.length > 0
                            );
                            if (isValidLegacyResult) {
                                const bridgedResult = {
                                    ...convertedLegacyResult,
                                    _meta: convertedLegacyResult._meta || enrichedResult._meta || result?._meta,
                                    hook_dna: convertedLegacyResult.hook_dna ?? enrichedResult.hook_dna ?? result?.hook_dna,
                                    conversion_dna: convertedLegacyResult.conversion_dna ?? enrichedResult.conversion_dna ?? result?.conversion_dna,
                                    visual_dna: convertedLegacyResult.visual_dna ?? enrichedResult.visual_dna ?? result?.visual_dna,
                                    voice_dna: convertedLegacyResult.voice_dna ?? enrichedResult.voice_dna ?? result?.voice_dna,
                                    cta_dna: convertedLegacyResult.cta_dna ?? enrichedResult.cta_dna ?? result?.cta_dna,
                                    adaptation_summary: convertedLegacyResult.adaptation_summary ?? enrichedResult.adaptation_summary ?? result?.adaptation_summary,
                                    remodeling_intensity: convertedLegacyResult.remodeling_intensity ?? enrichedResult.remodeling_intensity ?? result?.remodeling_intensity,
                                    what_preserved: convertedLegacyResult.what_preserved ?? enrichedResult.what_preserved ?? result?.what_preserved,
                                    what_changed: convertedLegacyResult.what_changed ?? enrichedResult.what_changed ?? result?.what_changed,
                                    similarity_risk: convertedLegacyResult.similarity_risk ?? enrichedResult.similarity_risk ?? result?.similarity_risk,
                                    preserved_elements_list: convertedLegacyResult.preserved_elements_list ?? enrichedResult.preserved_elements_list ?? result?.preserved_elements_list,
                                    remodeled_elements_list: convertedLegacyResult.remodeled_elements_list ?? enrichedResult.remodeled_elements_list ?? result?.remodeled_elements_list,
                                    new_product_adaptation_summary: convertedLegacyResult.new_product_adaptation_summary ?? enrichedResult.new_product_adaptation_summary ?? result?.new_product_adaptation_summary,
                                    platform_adaptation_report: convertedLegacyResult.platform_adaptation_report ?? enrichedResult.platform_adaptation_report ?? result?.platform_adaptation_report,
                                };
                                const enrichedBridgedResult = enrichReverseEngineeringResult(bridgedResult, {
                                    creatorGender,
                                    creatorPersona,
                                    speakingEnergy,
                                    speakingPace,
                                    productDetails: adaptData.newProduct,
                                    voiceProfile
                                });
                                setResult(enrichedBridgedResult);
                            }
                        }
                    } else if (pipelineResult.status === 'BLOCKED') {
                        setFinalRemodeledProject(null);
                        setReversePipelineStatus('BLOCKED');
                        setReversePipelineWarnings(
                            pipelineResult.blockingReasons?.length
                                ? pipelineResult.blockingReasons
                                : pipelineResult.warnings || []
                        );
                    } else {
                        setFinalRemodeledProject(null);
                        setReversePipelineStatus('FAILED');
                        setReversePipelineWarnings(
                            pipelineResult.warnings?.length
                                ? pipelineResult.warnings
                                : pipelineResult.error
                                ? [pipelineResult.error]
                                : []
                        );
                    }
                } else {
                    console.warn(`[ReverseRemodelPipeline] Stale execution discarded (execId: ${executionId}, latest: ${latestAdaptationExecutionIdRef.current})`);
                }
            } catch (pipeErr: any) {
                if (executionId === latestAdaptationExecutionIdRef.current) {
                    console.warn("ReverseRemodelPipeline parallel execution fallback:", pipeErr);
                    setFinalRemodeledProject(null);
                    setReversePipelineStatus('FAILED');
                    setReversePipelineWarnings([pipeErr?.message || String(pipeErr)]);
                }
            }

            setShowAdaptModal(false);

            if (adaptData.adaptationMode === 'preservar_viral') {
                alert("Estrutura viral preservada. Produto, narrativa e elementos visuais foram remodelados para o novo contexto.");
            }
        } catch (e: any) {
            alert("Erro ao adaptar: " + e.message);
        } finally {
            setIsAdapting(false);
        }
    };

    const analyzeVideo = async () => {
        if (!file) return alert("Selecione um vídeo.");
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        try {
            const b64Video = await fileToBase64(file);
            const requestParts: any[] = [];

            let ignoreAudioInstruction = ignoreAudio
                ? `\n- MODO SILENCIOSO ATIVADO: É ESTRITAMENTE PROIBIDO transcrever ou inventar qualquer diálogo. Assuma que o vídeo é 100% mudo. Preencha o campo de narração com "[Sem Áudio]".`
                : "";
            
            let customCameraInstruction = customCamera !== 'Automático (Manter Original)'
                ? `\n- OVERRIDE DE CÂMERA: Ignore a câmera do vídeo original. Use APENAS este estilo: "${customCamera}".`
                : "";
            
            let customScenarioInstruction = customScenario !== 'Automático (Manter Original)'
                ? `\n- OVERRIDE DE CENÁRIO: Substitua o fundo original estritamente por: "${customScenario}".`
                : "";
            
            let customToneInstruction = customTone !== 'Automático (Manter Original)'
                ? `\n- OVERRIDE DE TOM (COPY): Reescreva o diálogo adaptando-o fortemente para a persona: "${customTone}".`
                : "";
            
            let videoTypeInstruction = "";
            if (videoType === 'entrevista') {
                videoTypeInstruction = "\n- OVERRIDE DE FORMATO: Este é um vídeo de entrevista (duas pessoas conversando/podcast). Identifique quem é o entrevistador e quem é o entrevistado.";
            } else if (videoType === 'solo') {
                videoTypeInstruction = "\n- OVERRIDE DE FORMATO: Este é um vídeo solo (apenas 1 pessoa apresentando o produto).";
            }
            
            let avatarNameForLog = "Original";
            let avatarInstruction = "";
            if (selectedAvatarId) {
                const avatar = avatars.find(a => a.id.toString() === selectedAvatarId.toString());
                if (avatar) {
                    avatarNameForLog = avatar.name;
                    avatarInstruction = `\n- CHARACTER SWAP (CAMADA 1): Ignore a pessoa do vídeo original. Descreva o sujeito principal EXATAMENTE assim: "${avatar.masterPrompt}".`;
                }
            }

            let objectLockStatus = "Inativo";
            let objectLockInstruction = "";
            if (productFile || productDetails) {
                objectLockStatus = "Ativo 🔒";
                objectLockInstruction = `\n- OBJECT LOCK 360º (CAMADA 2): Mantenha consistência absoluta do produto mostrado, usando estes detalhes rígidos: "${productDetails || 'Siga a referência visual da imagem extra'}".`;
            }

            let targetModelRules = "";
            let jsonFormat = "";

            if (targetModel === 'grok') {
                targetModelRules = `BLOCOS GROK: Crie exatamente blocos de 6 segundos. A fala (dialogue_pt_br) de cada bloco DEVE ter um LIMITE FIXO MÁXIMO DE 12 PALAVRAS (ritmo perfeito de 2 palavras/segundo). Se passar de 12, reduza. O primeiro bloco é o Gancho, intermediários são Benefício/Prova, o último é o CTA. Espontâneo e impactante.`;
                jsonFormat = `{ "grok_structure": [ { "block_id": 1, "scene_name": "Name", "estimated_time": "6s", "visual_prompt_en": "WRITE STRICTLY IN ENGLISH. Highly detailed visual description...", "actions": ["action in english 1..."], "voice_description_en": "voice tone in english...", "dialogue_pt_br": "fala curta em pt-br...", "voice_language": "pt-BR", "creator_profile": "Gender: Male/Female/Neutral, Persona: UGC Influencer/etc, Energy: 70%, Pace: Normal" } ] }`;
            } else if (targetModel === 'veo') {
                targetModelRules = `BLOCOS VEO 3: Crie blocos de 8 segundos. A fala (dialogue_pt_br) de cada bloco DEVE ter um LIMITE FIXO MÁXIMO DE 18 PALAVRAS (ritmo perfeito de 2.2 palavras/segundo). Foco em ação fluida e reação.`;
                jsonFormat = `{ "veo_structure": [ { "block_id": 1, "scene_name": "Name", "estimated_time": "8s", "visual_prompt_en": "WRITE STRICTLY IN ENGLISH. Highly detailed visual description...", "actions": ["action in english 1..."], "voice_description_en": "voice tone in english...", "dialogue_pt_br": "fala média em pt-br...", "voice_language": "pt-BR", "creator_profile": "Gender: Male/Female/Neutral, Persona: UGC Influencer/etc, Energy: 70%, Pace: Normal" } ] }`;
            } else {
                targetModelRules = `BLOCOS SORA 2: Crie blocos contínuos de 15 segundos. A fala (dialogue_pt_br) de cada bloco DEVE ter entre 25 e 35 PALAVRAS. A descrição visual ('visual_prompt_en') deve obrigatoriamente seguir a fórmula: [Camera Movement/Angle] + [Lighting/Atmosphere] + [Environment/Setting] + [Main Subject/Hands] + [Specific Actions/Physics] + [Product Details].`;
                jsonFormat = `{ "sora_structure": [ { "block_id": 1, "scene_name": "Name", "estimated_time": "15s", "visual_prompt_en": "WRITE STRICTLY IN ENGLISH: [Camera Movement/Angle] + [Lighting] + ...", "actions": ["action in english 1..."], "voice_description_en": "voice tone in english...", "dialogue_pt_br": "fala completa em pt-br...", "voice_language": "pt-BR", "creator_profile": "Gender: Male/Female/Neutral, Persona: UGC Influencer/etc, Energy: 70%, Pace: Normal" } ] }`;
            }

            const rcifPrompt = `
                ## [ROLE] (Papel) 
                Atue como um Especialista Sênior em Engenharia de Prompts para Vídeos de IA Generativa e Arquiteto de Prompts.
                
                ## [CONTEXT] (Contexto) 
                O usuário está fornecendo um vídeo de referência. O objetivo é realizar uma "Engenharia Reversa": desconstruir este vídeo cena a cena para clonar a estrutura narrativa e ângulos para a IA (Sora, Veo ou Grok).
                
                ## [INSTRUCTION] (Instrução) 
                1. Analise o vídeo frame a frame. O mapeamento DEVE ser 100% completo.
                2. Decomponha em blocos de cena cronológicos (ex: SCENE 1 - HOOK, SCENE 2 - DEMO, SCENE 3 - PROOF, SCENE 4 - CTA). 
                3. Extraia iluminação, estilo de câmera e movimentos físicos ESTRITAMENTE EM INGLÊS. 
                4. Identifique e transcreva o diálogo ESTRITAMENTE EM PORTUGUÊS (PT-BR). 
                5. APLIQUE OVERRIDES: ${ignoreAudioInstruction} ${customCameraInstruction} ${customScenarioInstruction} ${customToneInstruction} ${avatarInstruction} ${objectLockInstruction} ${videoTypeInstruction}
                
                ## [CREATOR / INFLUENCER PROFILE]
                Selecione as seguintes diretrizes para aproximar a geração do perfil escolhido pelo usuário:
                - Gênero do Criador: ${creatorGender}
                - Faixa de Idade/Estilo: ${creatorAge}
                - Persona de Apresentação: ${creatorPersona}
                - Energia de Fala: ${speakingEnergy}/100
                - Ritmo/Pace de Fala: ${speakingPace}

                Você DEVE refletir essas características nos blocos gerados:
                1. No "voice_description_en": Descreva as características de voz e entonação de acordo com o Gênero, Idade e Persona selecionados. Mantenha consistência.
                2. No "dialogue_pt_br": Adapte o nível de persuasão, gírias e vocabulário à Persona (ex: TikTok Shop Seller foca em vendas imediatas apontando para o carrinho; Casual Friend usa termos amigáveis e naturais; Authority Expert é formal e técnico).
                3. No "visual_prompt_en" e "actions": Inclua orientações de linguagem corporal (body language) e presença de câmera condizentes com o gênero e persona escolhidos.
                4. Preencha "creator_profile" textualmente com: "Gender: ${creatorGender}, Persona: ${creatorPersona}, Energy: ${speakingEnergy}%, Pace: ${speakingPace}".
                
                🚨 REGRA DE OURO (ANTI-OVERFITTING VISUAL E IDIOMA - CRÍTICO):
                - É EXPRESSAMENTE PROIBIDO gastar o limite de palavras descrevendo minuciosamente o rosto, maquiagem, formato dos olhos, dentes ou características étnicas detalhadas do ator.
                - Resuma o sujeito em, no máximo, 5 palavras (ex: "A young East Asian woman", "A man").
                - Foque a descrição visual ('visual_prompt_en') NESTA ORDEM DE PRIORIDADE:
                  1. Movimento e Ângulo de Câmera (ex: "Static medium shot").
                  2. Iluminação e Cenário (ex: "Bright softbox lighting, minimalist desk").
                  3. O Produto e Ação Física (ex: "Holding a white earbud case, presenting to camera").
                - O prompt deve ser limpo e otimizado para focar no movimento do produto!
                
                ## [LANGUAGE & FIELD RULES - SUPER CRITICAL]
                - Visual instructions must ALWAYS be in English.
                - Spoken dialogue must ALWAYS be in Brazilian Portuguese.
                - ALWAYS use the precise field names:
                  * "visual_prompt_en": For English visual details and prompt instructions.
                  * "dialogue_pt_br": For Brazilian Portuguese spoken words or dialogue.
                  * "voice_language": Must be set to "pt-BR"
                - DO NOT use generic fields or names like "dialogue", "speech", "narration", "visual_context_en", or "visual_prompt".

                ## [PRODUCT ANIMATION & INTERNAL GEARS MANDATE (FLOW / VEO / SORA / GROK)]
                - For watches, jewelry, or products with visible internal mechanisms/gears (e.g. skeleton watch faces, exposed decorative cogs):
                  * In 'visual_prompt_en' and 'actions', you MUST explicitly specify that all internal decorative gears, cogs, and wheelwork remain 100% COMPLETELY FROZEN, STATIC, and UNMOVING across all frames.
                  * Do NOT request or permit internal gear spinning, rotation, or mechanical animation.
                  * ONLY watch hands (hour/minute/second hands) or overall physical camera/hand movement are allowed to move.

                ## [FORMAT & CONSTRAINTS] (Formato e Restrições) 
                - CRITÉRIOS DO MODELO ALVO: ${targetModelRules} 
                - REGRAS DE COPY SAFE (TikTok): Proibido usar "robusto", "robusta", "milagre", "imperdível" em português. 
                - O CTA final deve sempre apontar para o "carrinho laranja". 
                - FORMATO ESTRITO: Retorne APENAS JSON válido, usando a estrutura exata abaixo:
                ${jsonFormat}

                ### INSTRUÇÃO DE MODELAGEM DE SCRIPT:
                Ao extrair e processar os diálogos (campo 'dialogue_pt_br'), você deve aplicar a técnica de 'Remodelagem Direta':
                - Remova introduções longas.
                - Transforme frases longas em frases de impacto curtas.
                - O texto final deve ser direto e pronto para voz.
                - Se encontrar o CTA, garanta que ele esteja conforme as regras de TikTok Shop.
            `;

            requestParts.push({ text: rcifPrompt.trim() });
            requestParts.push({ inlineData: { mimeType: file.type, data: b64Video } });

            if (productFile) {
                const b64Product = await fileToBase64(productFile);
                requestParts.push({ inlineData: { mimeType: productFile.type, data: b64Product } });
            }

            if (selectedAnalysisFrame && selectedAnalysisFrame.dataUrl) {
                const b64Frame = selectedAnalysisFrame.dataUrl.split(',')[1];
                requestParts.push({ inlineData: { mimeType: "image/jpeg", data: b64Frame } });
                console.log(`Injected selected keyframe (${selectedAnalysisFrame.timestamp}) as visual guide into Gemini payload.`);
            }
            
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: requestParts }],
                generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: "medium" } }
            });
            
            const jsonResult = safeJSONParse(data.candidates[0].content.parts[0].text, {
                tiktok_caption: "",
                veo_structure: [],
                sora_structure: [],
                grok_structure: []
            });
            
            jsonResult._meta = {
                avatar_used: avatarNameForLog,
                object_lock: objectLockStatus,
                custom_settings: (customCamera !== 'Automático (Manter Original)' || customScenario !== 'Automático (Manter Original)' || customTone !== 'Automático (Manter Original)') ? 'Sim' : 'Não'
            };

            const enrichedResult = enrichReverseEngineeringResult(jsonResult, {
                creatorGender,
                creatorPersona,
                speakingEnergy,
                speakingPace,
                productDetails,
                voiceProfile
            });

            console.log("[REVERSE_TRACE_ANALYSIS_RESULT]", {
                resultExists: Boolean(enrichedResult),
                resultType: typeof enrichedResult,
                topLevelKeys: enrichedResult ? Object.keys(enrichedResult) : [],
                blocksLength: Array.isArray(enrichedResult?.blocks) ? enrichedResult.blocks.length : undefined,
                scenesLength: Array.isArray(enrichedResult?.scenes) ? enrichedResult.scenes.length : undefined,
                veoStructureLength: Array.isArray(enrichedResult?.veo_structure) ? enrichedResult.veo_structure.length : undefined,
                soraStructureLength: Array.isArray(enrichedResult?.sora_structure) ? enrichedResult.sora_structure.length : undefined,
                grokStructureLength: Array.isArray(enrichedResult?.grok_structure) ? enrichedResult.grok_structure.length : undefined,
                hasMeta: Boolean(enrichedResult?._meta),
                metaKeys: enrichedResult?._meta ? Object.keys(enrichedResult._meta) : []
            });

            setResult(enrichedResult);
            setActiveModel(targetModel);

        } catch (e: any) {
            alert("Erro ao analisar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const autoDetectCreatorProfile = async () => {
        if (!file) return alert("Por favor, selecione um vídeo primeiro.");
        if (!currentKey) return alert("Configure a Chave API.");

        setDetectingProfile(true);
        setProfileDetectionSuccess(null);
        try {
            const b64Video = await fileToBase64(file);
            const requestParts: any[] = [];

            const detectionPrompt = `
                Analyze the uploaded video of a person/creator. 
                Identify and extract the following parameters about the speaker/presenter/creator shown in the video:
                1. GENDER: Choose exactly one: "Female", "Male", or "Neutral / Not specified".
                2. AGE STYLE: Choose exactly one: "Young Adult", "Adult", or "Mature Adult".
                3. CREATOR PERSONA: Choose the best fit from:
                   - "UGC Influencer Real" (UGC style, authentic, home-studio/bedroom presentation)
                   - "TikTok Shop Seller" (energetic, pointing, showing product closely, call to actions, selling vibe)
                   - "Product Reviewer" (rational, hands-on, showing features, camera focused on hands/items)
                   - "Lifestyle Creator" (dynamic, vlog style, outdoors, aesthetic, soft background)
                   - "Luxury Presenter" (high-end presentation, sophisticated tone, premium lighting, elegant)
                   - "Casual Friend" (intimate, conversational, very natural, simple tone)
                   - "Authority Expert" (authoritative, technical, formal, professional, direct advice)
                4. SPEAKING ENERGY: Estimate the level of energy/enthusiasm in their speech/delivery on a scale of 0 to 100. Provide an integer.
                5. SPEAKING PACE: Choose exactly one: "Slow", "Normal", "Fast", "TikTok Fast".

                Return EXCLUSIVELY a JSON object with the following exact keys (and no other formatting, no markdown wrapper):
                {
                  "gender": "Female" | "Male" | "Neutral / Not specified",
                  "age": "Young Adult" | "Adult" | "Mature Adult",
                  "persona": "UGC Influencer Real" | "TikTok Shop Seller" | "Product Reviewer" | "Lifestyle Creator" | "Luxury Presenter" | "Casual Friend" | "Authority Expert",
                  "energy": 70, 
                  "pace": "Slow" | "Normal" | "Fast" | "TikTok Fast",
                  "brief_justification": "A short, 1-sentence justification in Portuguese (PT-BR) explaining your choice."
                }
            `;

            requestParts.push({ text: detectionPrompt.trim() });
            requestParts.push({ inlineData: { mimeType: file.type, data: b64Video } });

            if (selectedAnalysisFrame && selectedAnalysisFrame.dataUrl) {
                const b64Frame = selectedAnalysisFrame.dataUrl.split(',')[1];
                requestParts.push({ inlineData: { mimeType: "image/jpeg", data: b64Frame } });
            }

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: requestParts }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
            });

            const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const parsed = safeJSONParse(textResponse, null);

            if (parsed) {
                if (parsed.gender) setCreatorGender(parsed.gender as any);
                if (parsed.age) setCreatorAge(parsed.age as any);
                if (parsed.persona) setCreatorPersona(parsed.persona);
                if (parsed.energy !== undefined) setSpeakingEnergy(Number(parsed.energy));
                if (parsed.pace) setSpeakingPace(parsed.pace as any);
                
                const justification = parsed.brief_justification || "Perfil do criador autodetectado com sucesso!";
                setProfileDetectionSuccess(justification);
                
                if (activeSessionId) {
                    setTimeout(() => {
                        saveReverseSession(activeSessionId);
                    }, 500);
                }
            } else {
                alert("Não foi possível analisar a resposta da IA. Tente novamente.");
            }
        } catch (e: any) {
            console.error("Error auto-detecting creator profile:", e);
            alert("Erro ao auto-selecionar perfil com IA: " + e.message);
        } finally {
            setDetectingProfile(false);
        }
    };

    const normalizedReverseBlocks = useMemo(() => {
        console.log("[REVERSE_TRACE_MEMO_TRIGGER]", {
            resultExists: Boolean(result),
            resultType: typeof result,
            topLevelKeys: result ? Object.keys(result) : [],
            blocksLength: Array.isArray(result?.blocks) ? result.blocks.length : undefined,
            scenesLength: Array.isArray(result?.scenes) ? result.scenes.length : undefined,
            veoStructureLength: Array.isArray(result?.veo_structure) ? result.veo_structure.length : undefined,
            soraStructureLength: Array.isArray(result?.sora_structure) ? result.sora_structure.length : undefined,
            grokStructureLength: Array.isArray(result?.grok_structure) ? result.grok_structure.length : undefined
        });
        if (!result) return [];
        const extracted = extractLegacyReverseBlocks(result);
        console.log("[REVERSE_TRACE_EXTRACTED_BLOCKS]", {
            count: extracted.length,
            extractedPreview: extracted.map((b, idx) => ({
                idx,
                scene_name: b?.scene_name || b?.name || b?.title,
                hasVisual: Boolean(b?.visual_prompt_en || b?.visual_context_en || b?.description),
                hasDialogue: Boolean(b?.dialogue_pt_br || b?.dialogue || b?.text),
                keys: Object.keys(b || {})
            }))
        });
        const normalized = extracted.map((block: any, index: number) =>
            normalizeLegacyReverseBlock(block, index)
        );
        console.log("[REVERSE_TRACE_NORMALIZED_BLOCKS]", {
            count: normalized.length,
            firstBlock: normalized[0] || null
        });
        return normalized;
    }, [result]);

    const getModelBlocks = (modelOverride?: string) => {
        if (!result) return [];
        const model = modelOverride || (['veo', 'sora', 'grok'].includes(activeTab) ? activeTab : activeModel);
        const extracted = extractLegacyReverseBlocks(result, model);
        console.log("[REVERSE_TRACE_GET_MODEL_BLOCKS]", {
            requestedModel: model,
            extractedCount: extracted ? extracted.length : 0,
            normalizedCount: normalizedReverseBlocks.length
        });
        if (extracted && extracted.length > 0) {
            return extracted.map((block: any, index: number) => normalizeLegacyReverseBlock(block, index));
        }
        return normalizedReverseBlocks;
    };

    const getActiveBlocks = (modelOverride?: string) => {
        return getModelBlocks(modelOverride);
    };

    const getSceneTitle = (idx: number, optName?: string) => {
        const SCENE_TYPES = ["HOOK", "DEMO", "PROOF", "CTA"];
        if (idx < 4) return SCENE_TYPES[idx];
        return optName ? optName.toUpperCase() : "DEMO";
    };

    const getAuthoritativeCreatorPromptString = (): string | null => {
        if (!result) return null;
        // Priority A: Authoritative creator prompt string
        const directPrompt = result.creator_prompt || result.creatorPrompt || result.creator_prompt_text || result.creatorPromptText;
        if (typeof directPrompt === 'string' && directPrompt.trim().length > 0) {
            return directPrompt.trim();
        }
        // Priority B: Full-script / general-script string
        const scriptString = result.full_script || result.fullScript || result.general_script || result.generalScript || result.script || result.roteiro_completo || result.roteiro;
        if (typeof scriptString === 'string' && scriptString.trim().length > 0) {
            return scriptString.trim();
        }
        return null;
    };

    const formatSceneText = (block: any, idx: number) => {
        const norm = normalizeLegacyReverseBlock(block, idx);
        return formatLegacySceneText(norm, idx);
    };

    const handleCopyAllFlowThreeLayerPrompts = () => {
        const blocks = normalizedReverseBlocks;
        const text = blocks.map((block: any, idx: number) => {
            const enriched = enrichSceneBlock(block, idx, { creatorGender, creatorPersona, speakingEnergy, speakingPace, productDetails });
            return `CENA ${idx + 1}:\n${enriched.flow_three_layer_prompt_pt_br}`;
        }).join('\n\n---\n\n');
        copyToClipboard(text).then(ok => ok && alert("Todos os Prompts Flow em 3 Camadas copiados!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyAllFlowMinimalPrompts = () => {
        const blocks = normalizedReverseBlocks;
        const text = blocks.map((block, idx) => {
            const enriched = enrichSceneBlock(block, idx, { creatorGender, creatorPersona, speakingEnergy, speakingPace, productDetails });
            return `CENA ${idx + 1}:\n${enriched.flow_minimal_prompt_pt_br}`;
        }).join('\n\n---\n\n');
        copyToClipboard(text).then(ok => ok && alert("Todos os Prompts Flow Minimalistas copiados!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyAllFullEnrichedPrompts = () => {
        const blocks = normalizedReverseBlocks;
        const text = blocks.map((block, idx) => {
            const enriched = enrichSceneBlock(block, idx, { creatorGender, creatorPersona, speakingEnergy, speakingPace, productDetails });
            return `CENA ${idx + 1}:\n${enriched.full_enriched_prompt_en}`;
        }).join('\n\n---\n\n');
        copyToClipboard(text).then(ok => ok && alert("Todos os Prompts Enriquecidos Completos copiados!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const getFormattedFullPromptState = () => {
        if (normalizedReverseBlocks.length > 0) {
            return normalizedReverseBlocks.map((block, idx) => formatLegacySceneText(block, idx)).join("\n\n────────────────────────\n\n");
        }
        const creatorPromptString = getAuthoritativeCreatorPromptString();
        if (creatorPromptString) {
            return creatorPromptString;
        }
        return '';
    };

    const handleCopyAllScenes = () => {
        const text = getFormattedFullPromptState();
        copyToClipboard(text).then(ok => ok && alert("Todas as cenas copiadas no formato oficial!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyAllVisualPrompts = () => {
        const blocks = normalizedReverseBlocks;
        const text = blocks.map((block) => block.visual_prompt_en).filter(Boolean).join('\n\n');
        copyToClipboard(text).then(ok => ok && alert("Todos os visuais copiados!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyAllDialogues = () => {
        const blocks = normalizedReverseBlocks;
        const text = blocks.map((block) => block.dialogue_pt_br).filter(Boolean).join('\n\n');
        copyToClipboard(text).then(ok => ok && alert("Todos os diálogos copiados!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyFullPromptCombined = () => {
        const blocksText = getFormattedFullPromptState();
        let combined = blocksText;
        if (result?.tiktok_caption) {
            combined += `\n\n==================================================\n\nLEGENDA TIKTOK CASUAL:\n${result.tiktok_caption}`;
        }
        copyToClipboard(combined).then(ok => ok && alert("Prompt completo com legendas copiado!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const handleCopyRawJson = () => {
        copyToClipboard(JSON.stringify(result, null, 2)).then(ok => ok && alert("JSON Completo Copiado!"));
        if (activeSessionId) saveReverseSession(activeSessionId);
    };

    const copyFormattedBlock = (block: any, type: string = '', idx: number = 0) => {
        const text = formatSceneText(block, idx);
        copyToClipboard(text).then(ok => ok && alert("Cena copiada!"));
    };

    const copyBlockJSON = (block: any) => {
        copyToClipboard(JSON.stringify(block, null, 2)).then(ok => ok && alert("JSON do Bloco Copiado!"));
    };

    const copyFullJson = (structure: any) => {
        copyToClipboard(JSON.stringify(structure, null, 2)).then(ok => ok && alert("JSON Completo Copiado!"));
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20">
                    <LucideIcon name="scan-face" className="w-3 h-3" /> ESPAÇO DE TRABALHO EXPANDIDO
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Análise Cinemática & Extração de Frames</h2>
                <p className="text-slate-400 max-w-xl mx-auto text-sm">
                    Decomponha vídeos de referência, extraia frames de alta precisão e gere scripts estruturados prontos para <span className="text-white font-bold">Sora, Veo 3 e Grok 2</span>.
                </p>
            </div>

            <RecoveryBanner />

            {!file && !result ? (
                <div className="space-y-8 max-w-3xl mx-auto">
                    <div onClick={() => fileInputRef.current?.click()} className="relative group border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all border-slate-700 bg-slate-900/40 hover:border-indigo-500 hover:bg-indigo-500/5">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*" className="hidden" />
                        <div className="space-y-4 pointer-events-none">
                            <div className="w-20 h-20 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform group-hover:text-indigo-400">
                                <LucideIcon name="upload" className="w-10 h-10" />
                            </div>
                            <p className="text-slate-300 font-medium text-lg">Arraste ou clique para carregar o vídeo referência (MP4, MOV, WEBM)</p>
                        </div>
                    </div>

                    {sessionHistory.length > 0 && (
                        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <LucideIcon name="history" className="w-4 h-4 text-indigo-400" /> Histórico de Sessões Recentes
                            </h3>
                            <div className="divide-y divide-slate-800">
                                {sessionHistory.map((sess: any, idx: number) => (
                                    <div key={`${sess.id || 'sess'}-${idx}`} className="py-2.5 flex justify-between items-center hover:bg-slate-800/10 px-2 rounded-lg transition">
                                        <div className="flex items-center gap-3">
                                            <LucideIcon name="film" className="w-4 h-4 text-slate-400" />
                                            <div>
                                                <p className="text-sm font-medium text-slate-200 truncate max-w-xs">{sess.videoName}</p>
                                                <span className="text-[10px] text-slate-500 font-mono">{sess.date} — {sess.duration || 'Auto'}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => restoreReverseSession(sess.id)} className="text-xs bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer">
                                            <LucideIcon name="refresh-cw" className="w-3 h-3" /> Carregar Vídeo
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* COLUNA 1: PLAYER & PARAMETROS */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span> Monitor de Referência
                                </span>
                                <button onClick={() => { setFile(null); setResult(null); setActiveSessionId(null); localStorage.removeItem('robizin_active_session_id'); }} className="text-[10px] bg-red-900 border border-red-500/20 text-red-100 px-2.5 py-1 rounded transition cursor-pointer">
                                    Fechar
                                </button>
                            </div>

                            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black">
                                {!file && previewUrl ? (
                                    <div className="w-full h-44 bg-slate-950 flex flex-col items-center justify-center p-4 text-center leading-relaxed">
                                        <LucideIcon name="alert-triangle" className="w-6 h-6 text-rose-500 mb-1.5 animate-pulse" />
                                        <p className="text-xs text-rose-450 font-bold">Arquivo precisa ser reenviado por segurança.</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Gostaria de reenviar o vídeo para habilitar o reprodutor e a captura de quadros?</p>
                                        <button onClick={() => fileInputRef.current?.click()} className="mt-3 cursor-pointer bg-slate-850 hover:bg-slate-700 text-slate-200 text-[10px] uppercase font-bold py-1 px-2.5 rounded border border-slate-700 tracking-wider">Selecionar Vídeo</button>
                                    </div>
                                ) : (
                                    <video ref={videoRef} src={previewUrl || undefined} onLoadedMetadata={handleVideoLoadedMetadata} controls className="w-full max-h-72 object-contain" />
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                                <span className="text-[9px] font-mono text-slate-400">Frames:</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1/24); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[9px] cursor-pointer">-1 Fr.</button>
                                    <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 1/24); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[9px] cursor-pointer">+1 Fr.</button>
                                    <button onClick={captureFrame} className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition cursor-pointer">
                                        <LucideIcon name="camera" className="w-3 h-3" /> Capturar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {videoMetadata && (
                            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl text-[11px] font-mono space-y-1">
                                <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-400 uppercase text-[9px] font-bold tracking-wide">
                                    <span>Metadados do Vídeo</span>
                                    <span className="text-indigo-400">Análise Real</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                                    <div>Resolução: <strong className="text-white">{videoMetadata.resolution}</strong></div>
                                    <div>Aspect Ratio: <strong className="text-indigo-300">{videoMetadata.aspectRatio}</strong></div>
                                    <div>Duração: <strong className="text-white">{videoMetadata.duration.toFixed(1)}s</strong></div>
                                    <div>Cenas Est.: <strong className="text-white">~{videoMetadata.sceneEstimate}</strong></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Avatar */}
                            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                                <label className="text-[10px] font-bold text-indigo-300 uppercase block mb-1 tracking-wider">Substituir Personagem (Character Swap)</label>
                                {avatars.length === 0 ? (
                                    <p className="text-[9px] text-slate-500">Crie avatares no Identity Hub.</p>
                                ) : (
                                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                                        <div onClick={() => setSelectedAvatarId('')} className={`cursor-pointer flex-shrink-0 relative rounded-lg border w-10 h-10 flex flex-col items-center justify-center bg-slate-950 ${!selectedAvatarId ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-slate-800'}`}><span className="text-[8px] uppercase font-bold text-center">Orig.</span></div>
                                        {avatars.map(avatar => (
                                            <div key={avatar.id} onClick={() => setSelectedAvatarId(avatar.id.toString())} className={`cursor-pointer flex-shrink-0 relative rounded-lg overflow-hidden border w-10 h-10 ${selectedAvatarId === avatar.id.toString() ? 'border-indigo-500 scale-102 font-bold ring-1 ring-indigo-500/30' : 'border-slate-800 opacity-60'}`}>
                                                <img src={avatar.image} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Object Lock */}
                            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                                <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={() => setShowObjectLock(!showObjectLock)}>
                                    <label className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block">Trava de Objeto (Object Lock)</label>
                                    <LucideIcon name={showObjectLock ? "chevron-up" : "chevron-down"} className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                {showObjectLock && (
                                    <div className="space-y-2 pt-2 border-t border-slate-800 animate-fade-in">
                                        <p className="text-[8px] text-slate-500 leading-tight">
                                            Upload, arraste ou pressione Ctrl+V para colar imagem
                                        </p>
                                        {productPasteError && (
                                            <p className="text-[8px] text-red-400 leading-tight">
                                                {productPasteError}
                                            </p>
                                        )}
                                        {productPasteFeedback && (
                                            <p className="text-[8px] text-emerald-450 leading-tight animate-fade-in">
                                                ✓ {productPasteFeedback.message} ({productPasteFeedback.name} - {productPasteFeedback.size})
                                            </p>
                                        )}
                                        <div className="flex gap-2.5">
                                            <div onClick={() => productInputRef.current?.click()} className={`w-12 h-12 flex-shrink-0 rounded border border-dashed flex flex-col items-center justify-center cursor-pointer ${productPreview ? 'border-yellow-500 bg-yellow-500/5' : 'border-slate-700'}`}>
                                                <input type="file" ref={productInputRef} onChange={handleProductSelect} accept="image/*" className="hidden" />
                                                {productPreview ? (
                                                     <div className="relative w-full h-full">
                                                         <img src={productPreview} className="w-full h-full object-cover rounded" />
                                                         <button 
                                                             type="button"
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 setProductFile(null);
                                                                 setProductPreview('');
                                                                 if (productInputRef.current) productInputRef.current.value = '';
                                                             }}
                                                             className="absolute -top-1 -right-1 bg-red-650 hover:bg-red-750 text-white rounded-full p-0.5 shadow-md hover:scale-105 transition-all z-20 cursor-pointer"
                                                             title="Excluir imagem"
                                                         >
                                                             <LucideIcon name="trash-2" className="w-2.5 h-2.5" />
                                                         </button>
                                                     </div>
                                                 ) : <LucideIcon name="image-plus" className="w-3.5 h-3.5 text-slate-500" />}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Fórmula de DNA</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); extractDetailsFromImage(); }} disabled={extractingDetails || !productFile} className="text-[8px] text-yellow-400 hover:underline cursor-pointer">Extrair</button>
                                                        {(productPreview || productDetails) && (
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("Deseja realmente limpar todos os dados da Trava de Objeto?")) {
                                                                        setProductFile(null);
                                                                        setProductPreview('');
                                                                        setProductDetails('');
                                                                        if (productInputRef.current) productInputRef.current.value = '';
                                                                    }
                                                                }}
                                                                className="text-[8px] text-red-400 hover:underline cursor-pointer"
                                                            >
                                                                Limpar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <textarea value={productDetails} onChange={(e) => setProductDetails(e.target.value)} placeholder="Detalhes de textura..." className="w-full h-10 bg-slate-950 border border-slate-800 rounded p-1 text-[9px] text-white outline-none resize-none" />
                                                {productPreview && !productFile && (
                                                    <p className="text-[8px] text-rose-450 font-sans leading-tight mt-0.5">✓ Arquivo precisa ser reenviado por segurança.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Custom Script parameters */}
                            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                                <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={() => setShowCustomOptions(!showCustomOptions)}>
                                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Personalização de Roteiro</label>
                                    <LucideIcon name={showCustomOptions ? "chevron-up" : "chevron-down"} className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                {showCustomOptions && (
                                    <div className="space-y-2 pt-2 border-t border-slate-800 text-[9px] text-slate-300">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Tom Narrativa</span>
                                                <select value={customTone} onChange={e => setCustomTone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none">
                                                    <option value="Automático (Manter Original)">Original</option>
                                                    {TONE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500 font-mono">Tipo Vídeo</span>
                                                <select value={videoType} onChange={e => setVideoType(e.target.value)} className="w-full bg-slate-950 border border-slate-805 rounded p-1 text-white outline-none">
                                                    <option value="auto">Auto</option>
                                                    <option value="solo">Solo</option>
                                                    <option value="entrevista">Entrevista</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Cenário</span>
                                            <select value={customScenario} onChange={e => setCustomScenario(e.target.value)} className="w-full bg-slate-950 border border-slate-807 rounded p-1 text-white outline-none">
                                                <option value="Automático (Manter Original)">Original</option>
                                                {SCENARIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Override Câmera</span>
                                            <select value={customCamera} onChange={e => setCustomCamera(e.target.value)} className="w-full bg-slate-950 border border-slate-809 rounded p-1 text-white outline-none">
                                                <option value="Automático (Manter Original)">Original</option>
                                                {CAMERA_ANGLES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Model Optimizations */}
                            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Engine Otimizadora Alvo</label>
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                                    {['veo', 'sora', 'grok'].map(m => (
                                        <button key={m} onClick={() => setTargetModel(m)} className={`p-1.5 rounded border transition-all cursor-pointer text-center font-bold ${targetModel === m ? 'border-indigo-500 bg-indigo-500/5 text-indigo-300' : 'border-slate-800 hover:border-slate-700 text-slate-400'}`}>
                                            {m.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Creator Profile Panel */}
                            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block font-mono flex items-center gap-1.5">
                                        <LucideIcon name="users" className="w-3.5 h-3.5" /> CREATOR / INFLUENCER PROFILE
                                    </label>
                                    {file && (
                                        <button
                                            type="button"
                                            onClick={autoDetectCreatorProfile}
                                            disabled={detectingProfile}
                                            className="text-[8px] text-indigo-400 hover:text-indigo-300 font-bold uppercase cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                            title="Auto-detectar gênero, idade, persona, energia e pace com IA"
                                        >
                                            <LucideIcon name={detectingProfile ? "loader-2" : "sparkles"} className={`w-2.5 h-2.5 ${detectingProfile ? 'animate-spin' : ''}`} />
                                            IA Auto
                                        </button>
                                    )}
                                </div>
                                
                                {detectingProfile && (
                                    <p className="text-[8px] text-indigo-400 animate-pulse font-sans">Analisando vídeo com IA...</p>
                                )}
                                {profileDetectionSuccess && (
                                    <p className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded font-sans leading-tight">
                                        ✓ {profileDetectionSuccess}
                                    </p>
                                )}

                                <div className="space-y-2.5 text-[9px] text-slate-300">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Gender</span>
                                            <select 
                                                value={creatorGender} 
                                                onChange={e => setCreatorGender(e.target.value as any)} 
                                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                            >
                                                <option value="Neutral / Not specified">Neutral</option>
                                                <option value="Female">Female</option>
                                                <option value="Male">Male</option>
                                            </select>
                                        </div>
                                        <div>
                                            <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Age Style</span>
                                            <select 
                                                value={creatorAge} 
                                                onChange={e => setCreatorAge(e.target.value as any)} 
                                                className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                            >
                                                <option value="Young Adult">Young Adult</option>
                                                <option value="Adult">Adult</option>
                                                <option value="Mature Adult">Mature Adult</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Creator Persona</span>
                                        <select 
                                            value={creatorPersona} 
                                            onChange={e => setCreatorPersona(e.target.value)} 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="UGC Influencer Real">UGC Influencer Real</option>
                                            <option value="TikTok Shop Seller">TikTok Shop Seller</option>
                                            <option value="Product Reviewer">Product Reviewer</option>
                                            <option value="Lifestyle Creator">Lifestyle Creator</option>
                                            <option value="Luxury Presenter">Luxury Presenter</option>
                                            <option value="Casual Friend">Casual Friend</option>
                                            <option value="Authority Expert">Authority Expert</option>
                                        </select>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-bold uppercase text-[8px] text-slate-500">Speaking Energy</span>
                                            <span className="font-mono text-[9px] text-indigo-400 font-bold">{speakingEnergy}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={speakingEnergy} 
                                            onChange={e => setSpeakingEnergy(Number(e.target.value))} 
                                            className="w-full accent-indigo-500 cursor-pointer text-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">Speaking Pace</span>
                                        <select 
                                            value={speakingPace} 
                                            onChange={e => setSpeakingPace(e.target.value as any)} 
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="Slow">Slow</option>
                                            <option value="Normal">Normal</option>
                                            <option value="Fast">Fast</option>
                                            <option value="TikTok Fast">TikTok Fast</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CONFIGURAÇÃO DE VOZ Panel */}
                        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block font-mono flex items-center gap-1.5">
                                    <LucideIcon name="mic" className="w-3.5 h-3.5" /> CONFIGURAÇÃO DE VOZ
                                </label>
                            </div>

                            <div className="space-y-2.5 text-[9px] text-slate-300">
                                <div>
                                    <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">VOZ</span>
                                    <select 
                                        value={voiceGender} 
                                        onChange={e => setVoiceGender(e.target.value as VoiceGender)} 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                    >
                                        {VOICE_GENDER_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">PÚBLICO / NICHO</span>
                                    <select 
                                        value={voiceAudience} 
                                        onChange={e => setVoiceAudience(e.target.value as VoiceAudience)} 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                    >
                                        {VOICE_AUDIENCE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <span className="block mb-0.5 font-bold uppercase text-[8px] text-slate-500">ESTILO DE INTERPRETAÇÃO</span>
                                    <select 
                                        value={voiceStyle} 
                                        onChange={e => setVoiceStyle(e.target.value as VoiceStyle)} 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white outline-none active:border-indigo-500 cursor-pointer"
                                    >
                                        {VOICE_STYLE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA 2: FRAME GALLERY & SELECTED SYSTEM */}
                    <div className="lg:col-span-4 bg-[#0F0F11] border border-slate-800 rounded-2xl p-4 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <LucideIcon name="camera" className="w-4 h-4 text-indigo-400" /> Frame Workspace
                            </span>
                        </div>

                        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block pb-0.5">Extração Automatizada</span>
                            <div className="grid grid-cols-4 gap-1">
                                {[1, 2, 4].map(sec => (
                                    <button key={sec} onClick={() => extractKeyFrames(sec)} disabled={extractingFrames} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 rounded text-[8px] font-bold border border-slate-700 disabled:opacity-50 cursor-pointer">
                                        a cada {sec}s
                                    </button>
                                ))}
                                <button onClick={() => extractKeyFrames(-1)} disabled={extractingFrames} className="bg-indigo-600 hover:bg-indigo-500 text-white py-1 rounded text-[8px] font-bold disabled:opacity-50 cursor-pointer">
                                    Smart AI
                                </button>
                            </div>

                            {extractingFrames && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[8px] font-mono text-slate-500">
                                        <span>Capturando frames...</span>
                                        <span>{extractionProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                                        <div className="bg-indigo-500 h-1 text-right" style={{ width: `${extractionProgress}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {capturedFrames.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                    <span>Galeria do Vídeo ({capturedFrames.length})</span>
                                    <button onClick={() => { setCapturedFrames([]); setSelectedFrame(null); }} className="text-red-400 hover:underline font-bold">Limpar</button>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto pb-1 max-h-20 custom-scrollbar">
                                    {capturedFrames.map((frame, i) => (
                                        <div key={frame.id || i} onClick={() => setSelectedFrame(frame)} className={`flex-shrink-0 w-12 h-12 rounded relative overflow-hidden border-2 cursor-pointer transition ${selectedFrame?.id === frame.id ? 'border-indigo-500' : 'border-slate-800 hover:border-slate-700'}`}>
                                            <img src={frame.url} className="w-full h-full object-cover" />
                                            {selectedAnalysisFrame?.id === frame.id && <div className="absolute top-0.5 left-0.5 bg-indigo-500 rounded-full p-0.5"><LucideIcon name="check" className="w-2 h-2 text-white" /></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedFrame ? (
                            <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/10 space-y-3">
                                <div className="flex justify-between text-[9px] font-mono text-indigo-300">
                                    <span>Ponto de Ajuste: {selectedFrame.timestamp}</span>
                                    {selectedAnalysisFrame?.id === selectedFrame.id ? <span className="font-bold text-emerald-400">✔ Ativo</span> : <button onClick={analyzeSelectedFrameIntel} disabled={analyzingFrameIntel} className="text-indigo-400 hover:underline">{analyzingFrameIntel ? "Calculando..." : "Rodar IA Cinemography"}</button>}
                                </div>

                                <div className="aspect-video rounded overflow-hidden border border-slate-800 bg-black">
                                    <img src={selectedFrame.url} className="w-full h-full object-contain" />
                                </div>

                                {frameIntelligence && (
                                    <div className="grid grid-cols-2 gap-1.5 text-[9px] pt-1">
                                        <div className="bg-slate-900/55 p-1.5 rounded border border-slate-850 font-mono">
                                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Grave</span>
                                            <span className="text-slate-200 block truncate" title={frameIntelligence.cameraAngle}>{frameIntelligence.cameraAngle}</span>
                                        </div>
                                        <div className="bg-slate-900/55 p-1.5 rounded border border-slate-850 font-mono">
                                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Lente</span>
                                            <span className="text-slate-200 block truncate" title={frameIntelligence.lensStyle}>{frameIntelligence.lensStyle}</span>
                                        </div>
                                        <div className="bg-slate-900/55 p-1.5 rounded border border-slate-850 font-mono">
                                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Iluminação</span>
                                            <span className="text-slate-200 block truncate" title={frameIntelligence.lighting}>{frameIntelligence.lighting}</span>
                                        </div>
                                        <div className="bg-slate-900/55 p-1.5 rounded border border-slate-850 font-mono">
                                            <span className="text-slate-500 block text-[7px] uppercase font-bold">Layout</span>
                                            <span className="text-slate-200 block truncate" title={frameIntelligence.composition}>{frameIntelligence.composition}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5 text-[9px]">
                                    <button onClick={() => { setSelectedAnalysisFrame(selectedFrame); }} className={`w-full py-1.5 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer ${selectedAnalysisFrame?.id === selectedFrame.id ? 'bg-indigo-600 text-white border-indigo-505' : 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300'}`}>
                                        {selectedAnalysisFrame?.id === selectedFrame.id ? 'Fixado Como Guia Visual ✔' : 'Fixar Como Guia Visual'}
                                    </button>

                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button onClick={sendToCinematic} className="bg-slate-900 border border-slate-800 py-1.5 rounded text-[8px] font-bold text-purple-400 hover:bg-purple-600/20 hover:text-white cursor-pointer select-none">Para Cinematic</button>
                                        <button onClick={sendToVanessa} className="bg-slate-900 border border-slate-800 py-1.5 rounded text-[8px] font-bold text-emerald-400 hover:bg-emerald-600/20 hover:text-white cursor-pointer select-none">Para Copywriter</button>
                                    </div>
                                    <button onClick={downloadFrame} className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 py-1 rounded text-[8px] text-slate-500 hover:text-white cursor-pointer flex justify-center items-center gap-1 select-none">
                                        <LucideIcon name="download" className="w-3 h-3" /> Baixar JPG
                                    </button>
                                </div>

                                {/* Ambient Match AI Card */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-purple-500/20 bg-gradient-to-b from-purple-950/10 to-slate-950 space-y-3 shadow-lg shadow-purple-950/15">
                                    <div className="flex items-center gap-1.5 border-b border-purple-500/20 pb-2">
                                        <LucideIcon name="sparkles" className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                                        <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider">
                                            Ambient Match AI
                                        </span>
                                    </div>
                                    
                                    <p className="text-[8.5px] text-slate-400 leading-relaxed">
                                        Automate matching of this frame's visual style. Recreate a similar ambiance, lighting, colors, and materials without copy-pasting exact layouts or identifiable rooms.
                                    </p>

                                    {/* TikTok Shop Warnings & Lock Toggle */}
                                    <div className="space-y-2">
                                        <div className="bg-amber-950/25 border border-amber-500/25 rounded-md p-2 space-y-1">
                                            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[9px] font-sans">
                                                <LucideIcon name="alert-triangle" className="w-3 h-3 text-amber-400" />
                                                <span>⚠️ Segurança TikTok Shop</span>
                                            </div>
                                            <p className="text-[8px] text-amber-200/90 leading-relaxed font-sans">
                                                O cenário pode ser remodelado, mas o produto precisa permanecer idêntico ao anúncio para evitar risco de punição por produto inconsistente.
                                            </p>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded border border-slate-800/80 hover:border-slate-700/80 transition select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={productAccuracyLock} 
                                                onChange={(e) => setProductAccuracyLock(e.target.checked)}
                                                className="accent-pink-500 rounded border-slate-700 bg-slate-900 cursor-pointer w-3.5 h-3.5"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[8.5px] font-bold text-slate-200 font-sans">
                                                    TikTok Shop Product Accuracy Lock
                                                </span>
                                                <span className="text-[7.5px] text-pink-400 flex items-center gap-0.5 mt-0.5 font-semibold">
                                                    ☑ Manter produto exatamente igual
                                                </span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Product Accuracy Checklist */}
                                    <div className="bg-slate-900/40 rounded border border-slate-900 p-2 space-y-1">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Product Accuracy Checklist:</span>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8px] font-sans">
                                            <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                                <span className="text-emerald-400 select-none">✓</span>
                                                <span>Product identity locked</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                                <span className="text-emerald-400 select-none">✓</span>
                                                <span>Product colors locked</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                                <span className="text-emerald-400 select-none">✓</span>
                                                <span>Product text/logo locked</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-400 font-medium">
                                                <span className="text-emerald-400 select-none">✓</span>
                                                <span>Product shape locked</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-400 font-medium col-span-2 border-t border-slate-900/50 pt-1 mt-0.5">
                                                <span className="text-emerald-400 select-none">✓</span>
                                                <span>Environment only editable</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button 
                                            type="button"
                                            onClick={handleExtractDna} 
                                            disabled={extractingDna} 
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded py-1.5 px-1 text-[8.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 select-none"
                                        >
                                            {extractingDna ? (
                                                <>
                                                    <LucideIcon name="refresh-cw" className="w-3 h-3 animate-spin" />
                                                    Analizando...
                                                </>
                                            ) : (
                                                <>
                                                    <LucideIcon name="scan" className="w-3 h-3" />
                                                    Extract DNA
                                                 </>
                                            )}
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={handleGenerateSimilarEnv} 
                                            disabled={generatingSimilarEnv} 
                                            className="bg-purple-600 hover:bg-purple-500 text-white rounded py-1.5 px-1 text-[8.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 select-none"
                                        >
                                            {generatingSimilarEnv ? (
                                                <>
                                                    <LucideIcon name="refresh-cw" className="w-3 h-3 animate-spin" />
                                                    Gerando...
                                                </>
                                            ) : (
                                                <>
                                                    <LucideIcon name="sparkles" className="w-3 h-3" />
                                                    Generate Env
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Result Display Workspace */}
                                    {(ambientDna || environmentPromptEn || negativeEnvironmentPrompt) && (
                                        <div className="space-y-3 pt-2.5 border-t border-slate-900/90 animate-fade-in">
                                            
                                            {/* AMBIENT_DNA */}
                                            {ambientDna && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[8px] font-mono">
                                                        <span className="font-bold text-slate-400 uppercase tracking-wider">🧬 AMBIENT_DNA</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                let txt = Object.entries(ambientDna).map(([k, v]) => `${k}: ${v}`).join('\n');
                                                                copyToClipboard(txt);
                                                                alert("Ambient DNA copiado com sucesso!");
                                                            }} 
                                                            className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 text-[8px] hover:bg-indigo-500/15 cursor-pointer transition select-none flex items-center gap-0.5"
                                                        >
                                                            <LucideIcon name="copy" className="w-2 h-2" /> Copy DNA
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-900/70 rounded p-1.5 text-[8px] border border-slate-800/65 max-h-36 overflow-y-auto custom-scrollbar space-y-1 text-slate-300">
                                                        {Object.entries(ambientDna).map(([k, v]) => (
                                                            <div key={k} className="flex flex-col border-b border-slate-950 pb-1 last:border-0 last:pb-0">
                                                                <span className="text-[7.5px] font-bold text-slate-500 font-mono uppercase">{k.replace(/_/g, ' ')}</span>
                                                                <span className="text-slate-200 mt-0.5">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* PRODUCT_LOCK_PROMPT_EN */}
                                            {productLockPromptEn && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[8px] font-mono">
                                                        <span className="font-bold text-pink-400 uppercase tracking-wider">🔒 PRODUCT_LOCK_PROMPT_EN</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                copyToClipboard(productLockPromptEn);
                                                                alert("PRODUCT_LOCK_PROMPT_EN copiado!");
                                                            }} 
                                                            className="px-2 py-0.5 rounded bg-pink-950/40 border border-pink-500/30 text-pink-400 text-[8px] hover:bg-pink-500/15 cursor-pointer transition select-none flex items-center gap-0.5"
                                                        >
                                                            <LucideIcon name="copy" className="w-2 h-2" /> Copy Product Lock
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-900/70 rounded p-1.5 text-[8px] text-slate-200 border border-slate-800/65 leading-relaxed font-mono">
                                                        {productLockPromptEn}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ENVIRONMENT_REMODEL_PROMPT_EN */}
                                            {environmentRemodelPromptEn && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[8px] font-mono">
                                                        <span className="font-bold text-teal-400 uppercase tracking-wider">🏞️ ENVIRONMENT_REMODEL_PROMPT_EN</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                copyToClipboard(environmentRemodelPromptEn);
                                                                alert("ENVIRONMENT_REMODEL_PROMPT_EN copiado!");
                                                            }} 
                                                            className="px-2 py-0.5 rounded bg-teal-950/40 border border-teal-500/30 text-teal-400 text-[8px] hover:bg-teal-500/15 cursor-pointer transition select-none flex items-center gap-0.5"
                                                        >
                                                            <LucideIcon name="copy" className="w-2 h-2" /> Copy Environment Prompt
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-900/70 rounded p-1.5 text-[8px] text-slate-200 border border-slate-800/65 leading-relaxed">
                                                        {environmentRemodelPromptEn}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ENVIRONMENT_PROMPT_EN */}
                                            {environmentPromptEn && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[8px] font-mono">
                                                        <span className="font-bold text-purple-400 uppercase tracking-wider">🇺🇸 ENVIRONMENT_PROMPT_EN</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                copyToClipboard(environmentPromptEn);
                                                                alert("ENVIRONMENT_PROMPT_EN copiado!");
                                                             }} 
                                                             className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-400 text-[8px] hover:bg-purple-500/15 cursor-pointer transition select-none flex items-center gap-0.5"
                                                         >
                                                             <LucideIcon name="copy" className="w-2 h-2" /> Copy Combined Prompt
                                                         </button>
                                                     </div>
                                                     <div className="bg-slate-900/70 rounded p-1.5 text-[8px] text-slate-200 border border-slate-800/65 leading-relaxed">
                                                         {environmentPromptEn}
                                                     </div>
                                                 </div>
                                             )}

                                            {/* NEGATIVE_PRODUCT_CHANGE_PROMPT */}
                                            {negativeProductChangePrompt && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center text-[8px] font-mono">
                                                        <span className="font-bold text-amber-500 uppercase tracking-wider">🚫 NEGATIVE_PRODUCT_CHANGE_PROMPT</span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                copyToClipboard(negativeProductChangePrompt);
                                                                alert("NEGATIVE_PRODUCT_CHANGE_PROMPT copiado!");
                                                            }} 
                                                            className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 text-[8px] hover:bg-amber-500/15 cursor-pointer transition select-none flex items-center gap-0.5"
                                                        >
                                                            <LucideIcon name="copy" className="w-2 h-2" /> Copy Negative Prompt
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-900/70 rounded p-1.5 text-[8px] text-slate-400 border border-slate-800/65 leading-relaxed font-mono">
                                                        {negativeProductChangePrompt}
                                                    </div>
                                                </div>
                                            )}

                                             {/* NEGATIVE_ENVIRONMENT_PROMPT */}
                                             {negativeEnvironmentPrompt && (
                                                 <div className="space-y-1">
                                                     <div className="flex justify-between items-center text-[8px] font-mono">
                                                         <span className="font-bold text-red-500 uppercase tracking-wider">🚫 NEGATIVE_ENVIRONMENT_PROMPT</span>
                                                         <button 
                                                             type="button"
                                                             onClick={() => {
                                                                 copyToClipboard(negativeEnvironmentPrompt);
                                                                 alert("NEGATIVE_ENVIRONMENT_PROMPT copiado!");
                                                             }} 
                                                             className="px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-[8px] hover:bg-red-500/15 cursor-pointer transition select-none flex items-center gap-0.5"
                                                         >
                                                             <LucideIcon name="copy" className="w-2 h-2" /> Copy
                                                         </button>
                                                     </div>
                                                     <div className="bg-slate-900/70 rounded p-1.5 text-[8px] text-slate-400 border border-slate-800/65 leading-relaxed font-mono">
                                                         {negativeEnvironmentPrompt}
                                                     </div>
                                                 </div>
                                             )}

                                             {/* Cinematic Router and Copiers */}
                                             <div className="space-y-1 pt-1.5 border-t border-slate-900/95">
                                                 <button 
                                                     type="button"
                                                     onClick={sendEnvironmentToCinematic} 
                                                     disabled={!environmentPromptEn}
                                                     className="w-full bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-500 hover:to-indigo-550 text-white rounded py-2 text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 select-none shadow shadow-purple-950/20"
                                                 >
                                                     <LucideIcon name="send" className="w-3.5 h-3.5" />
                                                     Send to Cinematic Engine
                                                 </button>
                                                 
                                                 <div className="flex flex-col gap-1.5">
                                                     <button 
                                                         type="button"
                                                         onClick={handleCopyFullTikTokPackage} 
                                                         className="w-full bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 py-2 rounded text-[8.5px] font-bold text-emerald-400 cursor-pointer flex justify-center items-center gap-1 select-none"
                                                     >
                                                         <LucideIcon name="shield-check" className="w-3 h-3 text-emerald-400" /> Copy Full TikTok-Safe Environment Package
                                                     </button>
                                                     
                                                     <div className="grid grid-cols-2 gap-1 leading-none">
                                                         <button 
                                                             type="button"
                                                             onClick={handleCopyFullPackage} 
                                                             className="bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 py-1.5 rounded text-[8px] font-bold text-slate-400 cursor-pointer flex justify-center items-center gap-1 select-none"
                                                         >
                                                             <LucideIcon name="box" className="w-2.5 h-2.5 text-indigo-400" /> Package
                                                         </button>
                                                         <button 
                                                             type="button"
                                                             onClick={() => {
                                                                 setAmbientDna(null);
                                                                 setEnvironmentPromptEn('');
                                                                 setNegativeEnvironmentPrompt('');
                                                                 setProductLockPromptEn('');
                                                                 setEnvironmentRemodelPromptEn('');
                                                                 setNegativeProductChangePrompt('');
                                                             }} 
                                                             className="bg-slate-900 hover:bg-slate-850 hover:text-red-400 border border-slate-800 py-1.5 rounded text-[8px] font-bold text-red-500 cursor-pointer flex justify-center items-center gap-1 select-none"
                                                         >
                                                             <LucideIcon name="trash" className="w-2.5 h-2.5 text-red-405" /> Clear
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>

                                         </div>
                                     )}
                                 </div>
                            </div>
                        ) : (
                            <div className="bg-black/20 p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-[10px] space-y-1">
                                <span className="block font-bold">Nenhum Frame Selecionado</span>
                                <p className="text-slate-600">Clique em qualquer foto do timeline roll para abrir as ações e IA filmography.</p>
                            </div>
                        )}
                    </div>

                    {/* COLUNA 3: OUTPUT E ANÁLISE COMPLETA */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Ação Executora</span>
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-950 border border-slate-850 rounded-lg cursor-pointer" onClick={() => setIgnoreAudio(!ignoreAudio)}>
                                <div className={`w-6 h-3 rounded-full relative transition-colors ${ignoreAudio ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full transition-transform ${ignoreAudio ? 'translate-x-3' : ''}`}></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-300">Ignorar Áudio?</span>
                            </div>

                            <Button onClick={analyzeVideo} disabled={loading} className="w-full py-3.5 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl font-bold rounded-lg cursor-pointer transition" icon={loading ? "loader-2" : (result ? "refresh-cw" : "wand-2")}>
                                {loading ? "Processando..." : (result ? "Refazer Análise 🔄" : "Clonar Roteiro & Planos 🎬")}
                            </Button>
                        </div>

                        {result ? (
                            <div className="space-y-3.5 text-[10px] animate-fade-in bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                                {/* PIPELINE STATUS INDICATOR (ETAPA 12C) */}
                                {reversePipelineStatus !== 'IDLE' && (
                                    <div className="space-y-2">
                                        <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[10px] font-sans transition ${
                                            reversePipelineStatus === 'READY'
                                                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                                : reversePipelineStatus === 'READY_WITH_WARNINGS'
                                                ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                                                : reversePipelineStatus === 'BLOCKED'
                                                ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                                                : 'bg-red-950/30 border-red-500/30 text-red-300'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <LucideIcon
                                                    name={
                                                        reversePipelineStatus === 'READY'
                                                            ? 'check-circle'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS'
                                                            ? 'alert-triangle'
                                                            : reversePipelineStatus === 'BLOCKED'
                                                            ? 'shield-alert'
                                                            : 'alert-circle'
                                                    }
                                                    className={`w-3.5 h-3.5 shrink-0 ${
                                                        reversePipelineStatus === 'READY'
                                                            ? 'text-emerald-400'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS'
                                                            ? 'text-amber-400'
                                                            : reversePipelineStatus === 'BLOCKED'
                                                            ? 'text-rose-400'
                                                            : 'text-red-400'
                                                    }`}
                                                />
                                                <span className="font-semibold">
                                                    {reversePipelineStatus === 'READY' && 'Remodelagem validada'}
                                                    {reversePipelineStatus === 'READY_WITH_WARNINGS' && 'Remodelagem concluída com alertas'}
                                                    {reversePipelineStatus === 'BLOCKED' && 'Remodelagem bloqueada por validação'}
                                                    {reversePipelineStatus === 'FAILED' && 'Falha no pipeline de remodelagem'}
                                                </span>
                                            </div>

                                            {reversePipelineWarnings.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPipelineWarnings(!showPipelineWarnings)}
                                                    className="text-[9px] underline hover:opacity-80 transition cursor-pointer flex items-center gap-1 font-medium select-none"
                                                >
                                                    <span>{showPipelineWarnings ? 'Ocultar alertas' : `Ver alertas (${Array.from(new Set(reversePipelineWarnings)).length})`}</span>
                                                    <LucideIcon name={showPipelineWarnings ? 'chevron-up' : 'chevron-down'} className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                        </div>

                                        {showPipelineWarnings && reversePipelineWarnings.length > 0 && (
                                            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1 text-[9px] text-slate-300 animate-fade-in font-sans">
                                                <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400 block font-mono">
                                                    Alertas da Remodelagem:
                                                </span>
                                                <ul className="space-y-1 list-disc list-inside">
                                                    {Array.from(new Set(reversePipelineWarnings.map(w => {
                                                        if (!w) return '';
                                                        return w.replace(/\bat\s+.*:\d+:\d+/g, '')
                                                                .replace(/\[(?:ReverseRemodelPipeline|PhysicalMotionDnaEngine|MotionAdaptationEngine|ProductVisionBridge|IdentityInjectionBridge|FinalSceneAssembler|FinalCopyCompiler|FinalVisualCompiler|RealismStabilityLayer|ReferenceStripper|CommercialFactGuardAdapter|MotionSafetyGate|RemodelMotionLockAdapter|FinalCompilationGate)\]/gi, '')
                                                                .replace(/\.(ts|js|tsx|jsx)\b/gi, '')
                                                                .trim();
                                                    }).filter(Boolean))).map((warning, wIdx) => (
                                                        <li key={wIdx} className="leading-snug text-slate-300">
                                                            {warning}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* OUTPUT TABS */}
                                <div className="flex flex-wrap justify-center gap-1 border-b border-slate-800 pb-2">
                                    {[
                                        { id: 'creator', label: 'Creator Prompt' },
                                        { id: 'blocks', label: 'Scene Blocks' },
                                        { id: 'veo', label: 'Veo 3 / Flow' },
                                        { id: 'sora', label: 'Sora 2' },
                                        { id: 'grok', label: 'Grok' },
                                        { id: 'json', label: 'JSON' }
                                    ].map(tab => (
                                        <button 
                                            key={tab.id} 
                                            onClick={() => {
                                                setActiveTab(tab.id as any);
                                                if (['veo', 'sora', 'grok'].includes(tab.id)) {
                                                    setActiveModel(tab.id);
                                                }
                                            }} 
                                            className={`pb-1 px-2.5 text-[9px] md:text-[10px] font-bold cursor-pointer transition-colors ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* META LOG INFO */}
                                {result._meta && (
                                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800 text-[8px] font-mono flex justify-between">
                                        <span>Avatar: <strong>{result._meta.avatar_used || 'Orig.'}</strong></span>
                                        <span>Object Lock: <strong>{result._meta.object_lock || 'Não'}</strong></span>
                                    </div>
                                )}

                                {/* TAB CONTENTS */}
                                {activeTab === 'creator' && (
                                    <div className="space-y-3 animate-fade-in pt-1">
                                        <div className="flex justify-between items-center bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-300">Visualização do Roteiro Geral</span>
                                            <button 
                                                onClick={handleCopyAllScenes} 
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                                            >
                                                <LucideIcon name="copy" className="w-3 h-3" /> Copiar Roteiro Prontinho
                                            </button>
                                        </div>
                                        
                                        <div className="bg-black/40 border border-slate-850 p-4 rounded-xl font-mono text-[10px] text-slate-300 leading-relaxed max-h-96 overflow-y-auto custom-scrollbar select-text whitespace-pre-wrap">
                                            {normalizedReverseBlocks.length === 0 ? (
                                                <div className="text-center py-6 text-slate-500 font-sans text-xs">
                                                    Nenhum roteiro disponível para exibição.
                                                </div>
                                            ) : (
                                                normalizedReverseBlocks.map((block: any, idx: number) => {
                                                    const title = block.scene_name || `Cena ${idx + 1}`;
                                                    const duration = block.estimated_time || (block.duration ? `${block.duration}s` : '');
                                                    const visual = block.visual_prompt_en || '';
                                                    const actionList = block.actions || [];
                                                    const voice = block.voice_description_en || '';
                                                    const dialogue = block.dialogue_pt_br || '';

                                                    return (
                                                        <div key={idx} className="mb-6 last:mb-0 pb-6 last:pb-0 border-b last:border-0 border-slate-800/60 font-sans">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-indigo-400 font-bold font-sans text-xs">
                                                                    CENA {idx + 1} — {title.toUpperCase()}
                                                                </span>
                                                                {duration && (
                                                                    <span className="text-[9px] text-slate-500 font-mono">
                                                                        {duration}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {visual && (
                                                                <div className="mt-2.5">
                                                                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider mb-1 font-sans">PROMPT VISUAL</span>
                                                                    <p className="text-slate-300 bg-black/20 p-2 rounded border border-slate-800/60 mb-2.5 leading-normal font-sans text-xs">
                                                                        {visual}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {actionList.length > 0 && (
                                                                <div className="mt-2.5">
                                                                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider mb-1 font-sans">AÇÕES</span>
                                                                    <div className="text-slate-200 bg-black/20 p-2 rounded border border-slate-800/60 mb-2.5 leading-normal font-sans text-xs">
                                                                        <ul className="space-y-0.5">
                                                                            {actionList.map((act: string, actIdx: number) => {
                                                                                const trimmed = act.trim();
                                                                                const textVal = trimmed.startsWith('-') ? trimmed.substring(1).trim() : trimmed;
                                                                                return (
                                                                                    <li key={actIdx} className="flex items-start gap-1.5">
                                                                                        <span className="text-indigo-400 font-bold">-</span>
                                                                                        <span>{textVal}</span>
                                                                                    </li>
                                                                                );
                                                                            })}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {voice && (
                                                                <div className="mt-2.5">
                                                                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider mb-1 font-sans">VOZ</span>
                                                                    <p className="text-slate-300 bg-black/20 p-2 rounded border border-slate-800/60 mb-2.5 leading-normal font-sans text-xs">
                                                                        {voice}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            
                                                            {dialogue && (
                                                                <div className="mt-2.5">
                                                                    <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider mb-1 font-sans">FALA</span>
                                                                    <p className="text-purple-300 bg-purple-500/5 p-2 rounded border border-purple-500/10 leading-normal font-sans text-xs">
                                                                        "{dialogue}"
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'blocks' && (
                                    <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar pr-1 animate-fade-in pt-1">
                                        {normalizedReverseBlocks.length === 0 ? (
                                            <div className="text-center py-6 text-slate-500 font-sans text-xs">
                                                Nenhum bloco de cena disponível.
                                            </div>
                                        ) : (
                                            normalizedReverseBlocks.map((block: any, idx: number) => {
                                                const title = block.scene_name || `Cena ${idx + 1}`;
                                                const duration = block.estimated_time || (block.duration ? `${block.duration}s` : '');
                                                const visualText = block.visual_prompt_en || '';
                                                const actionList: string[] = block.actions || [];
                                                const voiceText = block.voice_description_en || '';
                                                const dialogueText = block.dialogue_pt_br || '';

                                                const copySec = () => {
                                                    const formatted = formatSceneText(block, idx);
                                                    copyToClipboard(formatted).then(ok => ok && alert(`CENA ${idx + 1} copiada com sucesso!`));
                                                };
                                                const copyVis = () => {
                                                    copyToClipboard(visualText).then(ok => ok && alert("Prompt Visual copiado!"));
                                                };
                                                const copyDial = () => {
                                                    copyToClipboard(dialogueText).then(ok => ok && alert("Fala copiada!"));
                                                };
                                                const copyBlockJson = () => {
                                                    copyToClipboard(JSON.stringify(block, null, 2)).then(ok => ok && alert("JSON da cena copiado!"));
                                                };

                                                return (
                                                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3 hover:border-slate-700/60 transition shadow-sm font-sans">
                                                        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] text-white flex items-center justify-center font-bold">
                                                                    {idx + 1}
                                                                </div>
                                                                <span className="font-bold text-slate-100 text-sm">CENA {idx + 1} — {title}</span>
                                                            </div>
                                                            {duration && (
                                                                <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                                                                    DURAÇÃO: {duration}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="space-y-2.5">
                                                            {visualText && (
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">PROMPT VISUAL</span>
                                                                        <button onClick={copyVis} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer hover:underline">
                                                                            <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copiar
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-xs text-slate-200 bg-black/30 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                                                                        {visualText}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {actionList.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">AÇÕES</span>
                                                                    <div className="text-xs text-slate-200 bg-black/30 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                                                                        <ul className="space-y-1">
                                                                            {actionList.map((act: string, i: number) => {
                                                                                const trimmed = act.trim();
                                                                                const textVal = trimmed.startsWith('-') ? trimmed.substring(1).trim() : trimmed;
                                                                                return (
                                                                                    <li key={i} className="flex items-start gap-1.5">
                                                                                        <span className="text-indigo-400 font-bold">-</span>
                                                                                        <span>{textVal}</span>
                                                                                    </li>
                                                                                );
                                                                            })}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {voiceText && (
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">DESCRIÇÃO DA VOZ</span>
                                                                    <p className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-lg border border-slate-800/60 font-sans leading-relaxed">
                                                                        {voiceText}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {dialogueText && (
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] uppercase font-bold text-purple-400 font-mono tracking-wider">FALA</span>
                                                                        <button onClick={copyDial} className="text-[9px] text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 cursor-pointer hover:underline">
                                                                            <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copiar fala
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-sm font-medium text-purple-100 bg-purple-950/20 p-2.5 rounded-lg border border-purple-800/40 leading-relaxed font-sans">
                                                                        {dialogueText}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                                                            <button onClick={copySec} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                                                                <LucideIcon name="copy" className="w-3 h-3" /> Copiar cena
                                                            </button>
                                                            {visualText && (
                                                                <button onClick={copyVis} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-slate-700">
                                                                    <LucideIcon name="eye" className="w-3 h-3 text-indigo-400" /> Copiar visual
                                                                </button>
                                                            )}
                                                            {dialogueText && (
                                                                <button onClick={copyDial} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-slate-700">
                                                                    <LucideIcon name="message-square" className="w-3 h-3 text-purple-400" /> Copiar fala
                                                                </button>
                                                            )}
                                                            <button onClick={copyBlockJson} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-slate-700">
                                                                <LucideIcon name="code" className="w-3 h-3 text-slate-400" /> JSON
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                                {['veo', 'sora', 'grok'].includes(activeTab) && (
                                    <div className="space-y-3 animate-fade-in pt-1">
                                        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-[9px] text-slate-400">
                                            <span>Estrutura de IA: <strong className="text-white uppercase font-bold">{activeTab === 'veo' ? 'Veo 3 / Flow (8s)' : activeTab === 'sora' ? 'Sora 2 (15s)' : 'Grok (6s)'}</strong></span>
                                            {targetModel !== activeTab ? (
                                                <button 
                                                    onClick={() => { setTargetModel(activeTab); setTimeout(() => analyzeVideo(), 100); }}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded font-bold cursor-pointer transition flex items-center gap-1 text-[8.5px]"
                                                >
                                                    <LucideIcon name="refresh-cw" className="w-2.5 h-2.5 animate-spin-slow" /> Adaptar Para {activeTab.toUpperCase()}
                                                </button>
                                            ) : (
                                                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><LucideIcon name="check-circle" className="w-3 h-3" /> Já Otimizado</span>
                                            )}
                                        </div>

                                        <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar font-sans pr-1">
                                            {getModelBlocks(activeTab).length === 0 ? (
                                                <div className="text-center py-6 text-slate-500 font-sans text-xs">
                                                    Nenhuma cena disponível para este modelo.
                                                </div>
                                            ) : (
                                                getModelBlocks(activeTab).map((block: any, idx: number) => {
                                                    const title = block.scene_name || `Cena ${idx + 1}`;
                                                    const duration = block.estimated_time || (block.duration ? `${block.duration}s` : '');
                                                    const visualText = block.visual_prompt_en || '';
                                                    const actionList: string[] = block.actions || [];
                                                    const voiceText = block.voice_description_en || '';
                                                    const dialogueText = block.dialogue_pt_br || '';

                                                    const copySec = () => {
                                                        const formatted = formatSceneText(block, idx);
                                                        copyToClipboard(formatted).then(ok => ok && alert(`CENA ${idx + 1} copiada com sucesso!`));
                                                    };
                                                    const copyVis = () => {
                                                        copyToClipboard(visualText).then(ok => ok && alert("Prompt Visual copiado!"));
                                                    };
                                                    const copyDial = () => {
                                                        copyToClipboard(dialogueText).then(ok => ok && alert("Fala copiada!"));
                                                    };
                                                    const copyBlockJson = () => {
                                                        copyToClipboard(JSON.stringify(block, null, 2)).then(ok => ok && alert("JSON da cena copiado!"));
                                                    };

                                                    return (
                                                        <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3 hover:border-slate-700/60 transition shadow-sm font-sans">
                                                            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] text-white flex items-center justify-center font-bold">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <span className="font-bold text-slate-100 text-sm">CENA {idx + 1} — {title}</span>
                                                                </div>
                                                                {duration && (
                                                                    <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                                                                        DURAÇÃO: {duration}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="space-y-2.5">
                                                                {visualText && (
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">PROMPT VISUAL</span>
                                                                            <button onClick={copyVis} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer hover:underline">
                                                                                <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copiar
                                                                            </button>
                                                                        </div>
                                                                        <p className="text-xs text-slate-200 bg-black/30 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                                                                            {visualText}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {actionList.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">AÇÕES</span>
                                                                        <div className="text-xs text-slate-200 bg-black/30 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                                                                            <ul className="space-y-1">
                                                                                {actionList.map((act: string, i: number) => {
                                                                                    const trimmed = act.trim();
                                                                                    const textVal = trimmed.startsWith('-') ? trimmed.substring(1).trim() : trimmed;
                                                                                    return (
                                                                                        <li key={i} className="flex items-start gap-1.5">
                                                                                            <span className="text-indigo-400 font-bold">-</span>
                                                                                            <span>{textVal}</span>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {voiceText && (
                                                                    <div className="space-y-1">
                                                                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider block">DESCRIÇÃO DA VOZ</span>
                                                                        <p className="text-xs text-slate-300 bg-black/20 p-2.5 rounded-lg border border-slate-800/60 font-sans leading-relaxed">
                                                                            {voiceText}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {dialogueText && (
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-[10px] uppercase font-bold text-purple-400 font-mono tracking-wider">FALA</span>
                                                                            <button onClick={copyDial} className="text-[9px] text-purple-400 hover:text-purple-300 font-mono flex items-center gap-1 cursor-pointer hover:underline">
                                                                                <LucideIcon name="copy" className="w-2.5 h-2.5" /> Copiar fala
                                                                            </button>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-purple-100 bg-purple-950/20 p-2.5 rounded-lg border border-purple-800/40 leading-relaxed font-sans">
                                                                            {dialogueText}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                                                                <button onClick={copySec} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                                                                    <LucideIcon name="copy" className="w-3 h-3" /> Copiar cena
                                                                </button>
                                                                {visualText && (
                                                                    <button onClick={copyVis} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-slate-700">
                                                                        <LucideIcon name="eye" className="w-3 h-3 text-indigo-400" /> Copiar visual
                                                                    </button>
                                                                )}
                                                                {dialogueText && (
                                                                    <button onClick={copyDial} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-slate-700">
                                                                        <LucideIcon name="message-square" className="w-3 h-3 text-purple-400" /> Copiar fala
                                                                    </button>
                                                                )}
                                                                <button onClick={copyBlockJson} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1 border border-slate-700">
                                                                    <LucideIcon name="code" className="w-3 h-3 text-slate-400" /> JSON
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'json' && (
                                    <div className="space-y-3 animate-fade-in font-mono pt-1">
                                        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-[10px]">
                                            <span className="text-slate-400">JSON de Desenvolvimento</span>
                                            <button 
                                                onClick={handleCopyRawJson} 
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[8px] font-bold cursor-pointer transition font-sans"
                                            >
                                                Copiar JSON Completo
                                            </button>
                                        </div>
                                        <pre className="bg-black/50 border border-slate-850 p-3 h-80 rounded-xl overflow-auto custom-scrollbar text-[9px] text-indigo-200 select-all whitespace-pre-wrap leading-relaxed">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {/* GLOBAL ACTIONS GRID */}
                                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2 mt-2">
                                    <span className="text-[9px] uppercase font-bold text-indigo-400 block tracking-wider font-mono">Ações Globais</span>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[9px]">
                                        <button onClick={handleCopyAllScenes} className="bg-slate-850 hover:bg-slate-800 text-white p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-slate-755 cursor-pointer">
                                            <LucideIcon name="copy" className="w-3 h-3 text-indigo-400" /> Copiar Cenas (Oficial)
                                        </button>
                                        <button onClick={handleCopyAllFlowThreeLayerPrompts} className="bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-emerald-800/50 cursor-pointer">
                                             <LucideIcon name="layers" className="w-3 h-3 text-emerald-400" /> Flow 3 Camadas (Todos)
                                         </button>
                                         <button onClick={handleCopyAllFlowMinimalPrompts} className="bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-indigo-800/50 cursor-pointer">
                                            <LucideIcon name="zap" className="w-3 h-3 text-indigo-400" /> Flow Minimal (Todos)
                                        </button>
                                        <button onClick={handleCopyAllFullEnrichedPrompts} className="bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-purple-800/50 cursor-pointer">
                                            <LucideIcon name="sparkles" className="w-3 h-3 text-purple-300" /> Full Enriched (Todos)
                                        </button>
                                        <button onClick={handleCopyAllVisualPrompts} className="bg-slate-850 hover:bg-slate-800 text-white p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-slate-755 cursor-pointer">
                                            <LucideIcon name="image" className="w-3 h-3 text-blue-400" /> Prompts Visuais EN
                                        </button>
                                        <button onClick={handleCopyAllDialogues} className="bg-slate-850 hover:bg-slate-850/80 text-white p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-slate-755 cursor-pointer">
                                            <LucideIcon name="message-square" className="w-3 h-3 text-emerald-400" /> Diálogos PT-BR
                                        </button>
                                        <button onClick={handleCopyFullPromptCombined} className="bg-slate-850 hover:bg-slate-800 text-white p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-slate-755 cursor-pointer">
                                            <LucideIcon name="file-text" className="w-3 h-3 text-yellow-400" /> Full Prompt + Meta
                                        </button>
                                        <button onClick={handleCopyRawJson} className="bg-slate-850 hover:bg-slate-800 text-white p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-slate-755 cursor-pointer font-mono">
                                            <LucideIcon name="code" className="w-3 h-3 text-purple-400" /> Copiar Full JSON
                                        </button>
                                        <button onClick={() => setShowAdaptModal(true)} className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 p-2 rounded-md font-bold transition flex items-center justify-center gap-1 border border-indigo-500/30 cursor-pointer">
                                            <LucideIcon name="refresh-cw" className="w-3 h-3 text-indigo-300 animate-spin-slow" /> Adaptar Roteiro
                                        </button>
                                    </div>
                                </div>

                                {/* CASUAL TIKTOK CAPTION */}
                                {result.tiktok_caption && (
                                    <div className="pt-2 border-t border-slate-800 space-y-1.5 font-sans">
                                        <div className="flex justify-between items-center font-sans">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-sans">Legenda de Copy</span>
                                            <button onClick={() => copyToClipboard(result.tiktok_caption).then(ok => ok && alert("Copiado!"))} className="text-[8px] text-indigo-400 hover:underline font-sans">Copiar</button>
                                        </div>
                                        <p className="text-[9px] text-slate-300 leading-snug whitespace-pre-wrap bg-slate-900 p-2 rounded border border-slate-800 max-h-20 overflow-y-auto custom-scrollbar select-text font-sans">{result.tiktok_caption}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-black/20 border border-dashed border-slate-850 rounded-2xl p-6 text-center text-slate-500 text-[10px] flex flex-col justify-center items-center min-h-[180px] space-y-1.5">
                                <LucideIcon name="wand-2" className="w-4 h-4 text-slate-600 animate-pulse" />
                                <span className="font-bold text-slate-400">Aguardando Análise</span>
                                <p className="text-slate-600 font-light max-w-[180px]">Mapeie la timeline e gere o script clonado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {showAdaptModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setShowAdaptModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer z-10"><LucideIcon name="x" className="w-5 h-5" /></button>
                        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2 pr-6 border-b border-slate-800 pb-2 shrink-0">
                            <LucideIcon name="refresh-cw" className="text-purple-500" /> Adaptar Para Novo Produto
                        </h2>
                        
                        <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar py-1">
                            <div 
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && file.type.startsWith('image/')) {
                                        autofillAnalysisRequestIdRef.current++;
                                        setIsAnalyzingAdaptProduct(false);
                                        setAdaptImageFile(file);
                                        setAdaptImageUrl('');
                                        resetDerivedProductFields();
                                    }
                                }}
                                className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/30 transition-all"
                            >
                                <label className="text-[10px] font-bold text-purple-400 uppercase mb-3 flex items-center gap-2">
                                    <LucideIcon name="sparkles" className="w-3 h-3" /> Autopreenchimento com IA (Opcional)
                                </label>
                                <p className="text-[8px] text-slate-500 mb-1 leading-tight font-sans">
                                    Upload, arraste ou pressione Ctrl+V para colar imagem
                                </p>
                                {adaptPasteError && (
                                    <p className="text-[8px] text-red-400 mb-1 leading-tight">
                                        {adaptPasteError}
                                    </p>
                                )}
                                {adaptPasteFeedback && (
                                    <p className="text-[8px] text-emerald-450 mb-1 leading-tight animate-fade-in">
                                        ✓ {adaptPasteFeedback.message} ({adaptPasteFeedback.name} - {adaptPasteFeedback.size})
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => adaptFileInputRef.current?.click()} 
                                        className={`flex-1 bg-slate-800 border rounded-lg p-2 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                            (adaptImageFile || adaptImageUrl) 
                                                ? 'border-purple-500/60 text-purple-300 hover:bg-purple-950/30' 
                                                : 'border-slate-600 text-slate-300 hover:text-white hover:border-purple-500/50'
                                        }`}
                                    >
                                        <LucideIcon name="image" className="w-4 h-4" />
                                        {(adaptImageFile || adaptImageUrl) ? 'Trocar imagem' : 'Upload Foto'}
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={adaptFileInputRef} 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            autofillAnalysisRequestIdRef.current++;
                                            setIsAnalyzingAdaptProduct(false);
                                            setAdaptImageFile(file); 
                                            setAdaptImageUrl('');
                                            resetDerivedProductFields();
                                        }} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    
                                    <input 
                                        type="text" 
                                        value={adaptImageUrl} 
                                        onChange={(e) => {
                                            const url = e.target.value;
                                            autofillAnalysisRequestIdRef.current++;
                                            setIsAnalyzingAdaptProduct(false);
                                            setAdaptImageUrl(url); 
                                            setAdaptImageFile(null);
                                            resetDerivedProductFields();
                                        }} 
                                        placeholder="Ou cole um link..." 
                                        className="flex-1 w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none" 
                                    />
                                    
                                    <button 
                                        type="button"
                                        onClick={handleAutoFillProduct} 
                                        disabled={isAnalyzingAdaptProduct || (!adaptImageFile && !adaptImageUrl)} 
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center min-w-[40px] cursor-pointer"
                                        title="Analisar produto com IA"
                                    >
                                        {isAnalyzingAdaptProduct ? <LucideIcon name="loader-2" className="w-4 h-4 animate-spin" /> : <LucideIcon name="search" className="w-4 h-4" />}
                                    </button>
                                </div>

                                {(adaptImageFile || adaptImageUrl) && (
                                    <div className="mt-3 rounded-lg border border-purple-500/30 bg-slate-950/80 p-2.5 overflow-hidden space-y-2">
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                                    <LucideIcon name="check-circle" className="w-2.5 h-2.5" />
                                                    Produto carregado
                                                </span>
                                                <span className="text-[10px] text-slate-300 font-mono truncate" title={adaptImageFile ? adaptImageFile.name : adaptImageUrl}>
                                                    {adaptImageFile ? adaptImageFile.name : adaptImageUrl}
                                                </span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    autofillAnalysisRequestIdRef.current++;
                                                    setIsAnalyzingAdaptProduct(false);
                                                    setAdaptImageFile(null); 
                                                    setAdaptImageUrl('');
                                                    setAdaptPreviewUrl('');
                                                    setAdaptPreviewError(false);
                                                    resetDerivedProductFields();
                                                }} 
                                                className="text-[10px] text-red-400 hover:text-red-300 transition hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                                            >
                                                <LucideIcon name="trash-2" className="w-3 h-3" />
                                                Remover
                                            </button>
                                        </div>

                                        <div className="relative w-full h-32 max-h-[140px] rounded-md bg-slate-900/90 border border-slate-800/80 flex items-center justify-center overflow-hidden">
                                            {adaptPreviewUrl && !adaptPreviewError ? (
                                                <img 
                                                    src={adaptPreviewUrl} 
                                                    alt="Uploaded product preview" 
                                                    className="w-full h-full object-contain p-1 rounded" 
                                                    onError={() => setAdaptPreviewError(true)}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                                                    <LucideIcon name="image-off" className="w-5 h-5 text-slate-500" />
                                                    <span className="text-[10px] text-slate-400">Preview indisponível</span>
                                                </div>
                                            )}

                                            {isAnalyzingAdaptProduct && (
                                                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 text-purple-300">
                                                    <LucideIcon name="loader-2" className="w-6 h-6 animate-spin text-purple-400" />
                                                    <span className="text-[10px] font-semibold animate-pulse">Analisando produto com IA...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1">
                                    <LucideIcon name="git-branch" className="w-3 h-3 text-purple-400" />
                                    Modo de Adaptação
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer hover:text-purple-300 transition">
                                        <input 
                                            type="radio" 
                                            name="adaptationMode" 
                                            value="preservar_viral" 
                                            checked={adaptData.adaptationMode === 'preservar_viral'} 
                                            onChange={() => handleModeChange('preservar_viral')}
                                            className="text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700 w-3.5 h-3.5"
                                        />
                                        <span className="font-medium">🧬 Preservar Estrutura Viral</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-purple-300 transition">
                                        <input 
                                            type="radio" 
                                            name="adaptationMode" 
                                            value="preservar_visual" 
                                            checked={adaptData.adaptationMode === 'preservar_visual'} 
                                            onChange={() => handleModeChange('preservar_visual')}
                                            className="text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700 w-3.5 h-3.5"
                                        />
                                        <span>○ Preservar Apenas Visual</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-purple-300 transition">
                                        <input 
                                            type="radio" 
                                            name="adaptationMode" 
                                            value="remodelar_total" 
                                            checked={adaptData.adaptationMode === 'remodelar_total'} 
                                            onChange={() => handleModeChange('remodelar_total')}
                                            className="text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700 w-3.5 h-3.5"
                                        />
                                        <span>○ Remodelar Totalmente</span>
                                    </label>
                                </div>
                            </div>

                            {/* ☑ O que manter do vídeo original? Checklist Section */}
                            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <LucideIcon name="check-square" className="w-3.5 h-3.5 text-emerald-400" />
                                    ☑ O que manter do vídeo original?
                                </label>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                                    {Object.entries(PRESERVE_ELEMENT_LABELS).map(([key, label]) => {
                                        const isChecked = (adaptData.preserveElements || []).includes(key);
                                        return (
                                            <label key={key} className="flex items-start gap-1.5 text-[11px] text-slate-300 cursor-pointer hover:text-white transition select-none py-0.5">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const currentList = adaptData.preserveElements || [];
                                                        let newList = [...currentList];
                                                        if (e.target.checked) {
                                                            if (!newList.includes(key)) newList.push(key);
                                                        } else {
                                                            newList = newList.filter(x => x !== key);
                                                        }
                                                        setAdaptData({
                                                            ...adaptData,
                                                            preserveElements: newList
                                                        });
                                                    }}
                                                    className="mt-0.5 rounded border-slate-700 text-emerald-500 bg-slate-800 focus:ring-emerald-500 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                                                />
                                                <span className={isChecked ? "text-emerald-300 font-medium" : "text-slate-400"}>
                                                    {label}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 🎚 Nível de Remodelagem Slider */}
                            <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <LucideIcon name="sliders" className="w-3 h-3 text-pink-400" />
                                        🎚 Nível de Remodelagem
                                    </label>
                                    <span className="text-xs font-bold text-pink-400 font-mono">
                                        {adaptData.remodelingIntensity !== undefined ? adaptData.remodelingIntensity : 50}%
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    step="5"
                                    value={adaptData.remodelingIntensity !== undefined ? adaptData.remodelingIntensity : 50} 
                                    onChange={(e) => setAdaptData({...adaptData, remodelingIntensity: parseInt(e.target.value)})}
                                    className="w-full accent-pink-500 bg-slate-800 cursor-pointer h-1 rounded-lg appearance-none"
                                />
                                <div className="flex justify-between text-[8px] text-slate-500 font-mono leading-none pt-0.5">
                                    <span>0%</span>
                                    <span>25%</span>
                                    <span>50%</span>
                                    <span>75%</span>
                                    <span>100%</span>
                                </div>
                                <p className="text-[9px] text-slate-300 leading-normal bg-pink-500/5 p-2 rounded border border-pink-500/10 font-sans">
                                    {getRemodelingIntensityText(adaptData.remodelingIntensity !== undefined ? adaptData.remodelingIntensity : 50)}
                                </p>
                            </div>

                            {/* 🎯 Novo Produto Form Section */}
                            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                    <LucideIcon name="target" className="w-3.5 h-3.5 text-purple-400" />
                                    🎯 Novo Produto
                                </label>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nome do Produto</label>
                                        <input type="text" value={adaptData.newProduct || ""} onChange={e => setAdaptData({...adaptData, newProduct: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Ex: Tênis Ortopédico ConfortMax" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Categoria</label>
                                            <input type="text" value={adaptData.category || ""} onChange={e => setAdaptData({...adaptData, category: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Detectar automaticamente" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Faixa de Preço</label>
                                            <input type="text" value={adaptData.priceRange || ""} onChange={e => setAdaptData({...adaptData, priceRange: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Ex: R$ 197 a R$ 297" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Público-Alvo</label>
                                        <input type="text" value={adaptData.targetAudience || ""} onChange={e => setAdaptData({...adaptData, targetAudience: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Ex: Idosos, pessoas com dores ou esporão" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Principal Benefício</label>
                                        <input type="text" value={adaptData.mainBenefit || ""} onChange={e => setAdaptData({...adaptData, mainBenefit: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Ex: Acaba com dores nos pés e calcanhares no primeiro dia" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Principal Dor que Resolve</label>
                                        <input type="text" value={adaptData.mainPain || ""} onChange={e => setAdaptData({...adaptData, mainPain: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Ex: Dor crônica ao pisar pela manhã" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Diferencial do Produto</label>
                                        <input type="text" value={adaptData.uniqueDifferentiator || ""} onChange={e => setAdaptData({...adaptData, uniqueDifferentiator: e.target.value})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none" placeholder="Ex: Tecnologia de amortecimento de impacto em gel 3D" />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Plataforma de Venda</label>
                                        <select value={adaptData.platform || "TikTok Shop"} onChange={e => setAdaptData({...adaptData, platform: e.target.value as any})} className="w-full bg-slate-850 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none">
                                            <option value="TikTok Shop">TikTok Shop</option>
                                            <option value="Shopee Vídeo">Shopee Vídeo</option>
                                            <option value="Mercado Livre">Mercado Livre</option>
                                            <option value="Instagram Reels">Instagram Reels</option>
                                            <option value="YouTube Shorts">YouTube Shorts</option>
                                            <option value="Facebook Reels">Facebook Reels</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Características Adicionais</label>
                                        <textarea value={adaptData.features || ""} onChange={e => setAdaptData({...adaptData, features: e.target.value})} className="w-full h-16 bg-slate-850 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-purple-500 outline-none resize-none custom-scrollbar" placeholder="Características adicionais de copywriting, ex: Macio, alivia calcanhar..." />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ângulo Estratégico</label>
                                    <select value={adaptData.angleStrategy || "praticidade"} onChange={e => setAdaptData({...adaptData, angleStrategy: e.target.value})} className="w-full bg-slate-805 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none">
                                        <option value="emergencia">Emergência</option>
                                        <option value="economia">Economia</option>
                                        <option value="autoridade">Autoridade</option>
                                        <option value="praticidade">Praticidade</option>
                                        <option value="independencia">Independência</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Intensidade do Hook</label>
                                    <select value={adaptData.hookIntensity || "forte"} onChange={e => setAdaptData({...adaptData, hookIntensity: e.target.value})} className="w-full bg-slate-805 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 outline-none">
                                        <option value="normal">Normal</option>
                                        <option value="forte">Forte</option>
                                        <option value="agressivo">Agressivo</option>
                                    </select>
                                </div>
                            </div>

                            {/* 🧠 FEEDBACK DA INTELIGÊNCIA DO PIPELINE (ETAPA 12C.1 / 12C.2 / 12C.3) */}
                            {(reversePipelineStatus !== 'IDLE' || finalRemodeledProject !== null) && (
                                <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-3 rounded-xl border border-slate-800/80 space-y-2.5 animate-fade-in font-sans shadow-lg">
                                    {/* 8. STATUS FINAL HEADER */}
                                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-purple-950/80 border border-purple-800/60 flex items-center justify-center">
                                                <LucideIcon name="activity" className="w-3 h-3 text-purple-400" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono block leading-none">
                                                    Inteligência do Pipeline
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 text-[8.5px] px-2 py-0.5 rounded-full font-bold font-mono border tracking-wider shadow-sm ${
                                            reversePipelineStatus === 'READY'
                                                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20'
                                                : reversePipelineStatus === 'READY_WITH_WARNINGS'
                                                ? 'bg-amber-950/70 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/20'
                                                : reversePipelineStatus === 'BLOCKED'
                                                ? 'bg-rose-950/70 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/20'
                                                : 'bg-red-950/70 border-red-500/40 text-red-300 ring-1 ring-red-500/20'
                                        }`}>
                                            <LucideIcon 
                                                name={
                                                    reversePipelineStatus === 'READY' 
                                                        ? 'check-circle-2' 
                                                        : reversePipelineStatus === 'READY_WITH_WARNINGS' 
                                                        ? 'alert-triangle' 
                                                        : reversePipelineStatus === 'BLOCKED' 
                                                        ? 'alert-octagon' 
                                                        : 'x-circle'
                                                } 
                                                className="w-2.5 h-2.5" 
                                            />
                                            {reversePipelineStatus === 'READY' && 'READY'}
                                            {reversePipelineStatus === 'READY_WITH_WARNINGS' && 'READY WITH WARNINGS'}
                                            {reversePipelineStatus === 'BLOCKED' && 'BLOCKED'}
                                            {reversePipelineStatus === 'FAILED' && 'FAILED'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {/* 1. DNA VIRAL DETECTADO */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-purple-900/30 space-y-1.5 transition-all shadow-sm">
                                            <div 
                                                className="flex items-center justify-between text-[10px] font-bold text-purple-300 cursor-pointer select-none group"
                                                onClick={() => setExpandedDnaCard(prev => !prev)}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <LucideIcon name="dna" className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                                                    <span className="text-slate-200">DNA Viral Detectado</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[7.5px] font-mono bg-purple-950/70 text-purple-300 border border-purple-800/40 px-1.5 py-0.2 rounded font-semibold">
                                                        5 Vetores
                                                    </span>
                                                    <LucideIcon 
                                                        name={expandedDnaCard ? "chevron-up" : "chevron-down"} 
                                                        className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-transform" 
                                                    />
                                                </div>
                                            </div>

                                            {/* 5. DNA CARD — Versão recolhida */}
                                            <div className="grid grid-cols-2 gap-1.5 text-[8.5px] text-slate-300 pt-0.5">
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Hook:</span>
                                                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[85px] text-[8px] bg-purple-950/40 px-1 py-0.2 rounded border border-purple-800/30">
                                                        {result?.hook_dna && typeof result.hook_dna === 'object'
                                                            ? (result.hook_dna.hook_type || result.hook_dna.type || result.hook_dna.pattern || 'Detectado')
                                                            : (typeof result?.hook_dna === 'string' && result.hook_dna.trim() ? result.hook_dna.trim() : (result?.hook_dna ? 'Detectado' : 'Sem dados'))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Conversão:</span>
                                                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[85px] text-[8px] bg-purple-950/40 px-1 py-0.2 rounded border border-purple-800/30">
                                                        {result?.conversion_dna && typeof result.conversion_dna === 'object'
                                                            ? (result.conversion_dna.structure || result.conversion_dna.type || 'Estruturada')
                                                            : (typeof result?.conversion_dna === 'string' && result.conversion_dna.trim() ? result.conversion_dna.trim() : (result?.conversion_dna ? 'Estruturada' : 'Sem dados'))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Visual:</span>
                                                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[85px] text-[8px] bg-purple-950/40 px-1 py-0.2 rounded border border-purple-800/30">
                                                        {result?.visual_dna && typeof result.visual_dna === 'object'
                                                            ? (result.visual_dna.style || result.visual_dna.camera || 'Mapeado')
                                                            : (typeof result?.visual_dna === 'string' && result.visual_dna.trim() ? result.visual_dna.trim() : (result?.visual_dna ? 'Mapeado' : 'Sem dados'))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Voz:</span>
                                                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[85px] text-[8px] bg-purple-950/40 px-1 py-0.2 rounded border border-purple-800/30">
                                                        {result?.voice_dna && typeof result.voice_dna === 'object'
                                                            ? (result.voice_dna.tone || result.voice_dna.persona || 'Calibrada')
                                                            : (typeof result?.voice_dna === 'string' && result.voice_dna.trim() ? result.voice_dna.trim() : (result?.voice_dna ? 'Calibrada' : 'Sem dados'))}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">CTA:</span>
                                                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[180px] text-[8px] bg-purple-950/40 px-1 py-0.2 rounded border border-purple-800/30">
                                                        {result?.cta_dna && typeof result.cta_dna === 'object'
                                                            ? (result.cta_dna.action || result.cta_dna.channel || 'Definido')
                                                            : (typeof result?.cta_dna === 'string' && result.cta_dna.trim() ? result.cta_dna.trim() : (result?.cta_dna ? 'Definido' : 'Sem dados'))}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expanded Detailed View */}
                                            {expandedDnaCard && (
                                                <div className="space-y-1.5 pt-1.5 border-t border-purple-900/40 animate-fade-in text-[8.5px]">
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-purple-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Hook DNA</span>
                                                        <p className="text-slate-300 leading-relaxed break-words">
                                                            {result?.hook_dna && typeof result.hook_dna === 'object'
                                                                ? (JSON.stringify(result.hook_dna, null, 1).replace(/[{}"]/g, '').trim() || 'Sem dados disponíveis')
                                                                : (typeof result?.hook_dna === 'string' && result.hook_dna.trim() ? result.hook_dna.trim() : 'Sem dados disponíveis')}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-purple-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Estrutura de Conversão DNA</span>
                                                        <p className="text-slate-300 leading-relaxed break-words">
                                                            {result?.conversion_dna && typeof result.conversion_dna === 'object'
                                                                ? (JSON.stringify(result.conversion_dna, null, 1).replace(/[{}"]/g, '').trim() || 'Sem dados disponíveis')
                                                                : (typeof result?.conversion_dna === 'string' && result.conversion_dna.trim() ? result.conversion_dna.trim() : 'Sem dados disponíveis')}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-purple-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Visual DNA</span>
                                                        <p className="text-slate-300 leading-relaxed break-words">
                                                            {result?.visual_dna && typeof result.visual_dna === 'object'
                                                                ? (JSON.stringify(result.visual_dna, null, 1).replace(/[{}"]/g, '').trim() || 'Sem dados disponíveis')
                                                                : (typeof result?.visual_dna === 'string' && result.visual_dna.trim() ? result.visual_dna.trim() : 'Sem dados disponíveis')}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-purple-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Voz DNA</span>
                                                        <p className="text-slate-300 leading-relaxed break-words">
                                                            {result?.voice_dna && typeof result.voice_dna === 'object'
                                                                ? (JSON.stringify(result.voice_dna, null, 1).replace(/[{}"]/g, '').trim() || 'Sem dados disponíveis')
                                                                : (typeof result?.voice_dna === 'string' && result.voice_dna.trim() ? result.voice_dna.trim() : 'Sem dados disponíveis')}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-purple-400 font-bold font-mono text-[8px] uppercase tracking-wider block">CTA DNA</span>
                                                        <p className="text-slate-300 leading-relaxed break-words">
                                                            {result?.cta_dna && typeof result.cta_dna === 'object'
                                                                ? (JSON.stringify(result.cta_dna, null, 1).replace(/[{}"]/g, '').trim() || 'Sem dados disponíveis')
                                                                : (typeof result?.cta_dna === 'string' && result.cta_dna.trim() ? result.cta_dna.trim() : 'Sem dados disponíveis')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. ADAPTAÇÃO FÍSICA */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-sky-900/30 space-y-1.5 transition-all shadow-sm">
                                            <div 
                                                className="flex items-center justify-between text-[10px] font-bold text-sky-300 cursor-pointer select-none group"
                                                onClick={() => setExpandedMotionCard(prev => !prev)}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <LucideIcon name="move" className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                                                    <span className="text-slate-200">Adaptação Física</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[7.5px] border ${
                                                        reversePipelineStatus === 'BLOCKED'
                                                            ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w))
                                                            ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                                                            : reversePipelineStatus === 'READY'
                                                            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                                            : 'bg-sky-950/70 border-sky-500/40 text-sky-300'
                                                    }`}>
                                                        {reversePipelineStatus === 'BLOCKED'
                                                            ? 'BLOQUEADO'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w))
                                                            ? 'ATENÇÃO'
                                                            : reversePipelineStatus === 'READY'
                                                            ? 'COMPATÍVEL'
                                                            : 'ADAPTADO'}
                                                    </span>
                                                    <LucideIcon 
                                                        name={expandedMotionCard ? "chevron-up" : "chevron-down"} 
                                                        className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300 transition-transform" 
                                                    />
                                                </div>
                                            </div>

                                            {/* 6. MOTION CARD — Versão recolhida */}
                                            <div className="space-y-1 text-[8.5px] pt-0.5">
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Compatibilidade:</span>
                                                    <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[8px] border ${
                                                        reversePipelineStatus === 'BLOCKED'
                                                            ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w))
                                                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                                            : reversePipelineStatus === 'READY'
                                                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                                            : 'bg-sky-950/60 border-sky-500/40 text-sky-300'
                                                    }`}>
                                                        {reversePipelineStatus === 'BLOCKED'
                                                            ? 'BLOQUEADO'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w))
                                                            ? 'ATENÇÃO'
                                                            : reversePipelineStatus === 'READY'
                                                            ? 'COMPATÍVEL'
                                                            : 'ADAPTADO'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Product Scale:</span>
                                                    <span className="font-mono text-sky-300 font-semibold text-[8px] bg-sky-950/40 px-1.5 py-0.2 rounded border border-sky-800/30">
                                                        {(() => {
                                                            const text = `${adaptData.category || ''} ${adaptData.newProduct || ''}`.toLowerCase();
                                                            if (!text.trim()) return 'UNKNOWN';
                                                            if (text.includes('relo') || text.includes('watch') || text.includes('anel') || text.includes('ring') || text.includes('pulseira') || text.includes('brinco') || text.includes('tenis') || text.includes('sapato') || text.includes('vest') || text.includes('roupa')) return 'WEARABLE';
                                                            if (text.includes('fone') || text.includes('earbud') || text.includes('batom') || text.includes('lipstick') || text.includes('chave') || text.includes('joia') || text.includes('caneta')) return 'SMALL_HANDHELD';
                                                            if (text.includes('lamp') || text.includes('luminaria') || text.includes('liquidificador') || text.includes('panela') || text.includes('suporte') || text.includes('prato') || text.includes('teclado') || text.includes('monitor')) return 'TABLETOP';
                                                            if (text.includes('sofa') || text.includes('mesa') || text.includes('geladeira') || text.includes('carro') || text.includes('bike') || text.includes('bicicleta') || text.includes('tv')) return 'LARGE_OBJECT';
                                                            if (text.includes('celular') || text.includes('phone') || text.includes('garrafa') || text.includes('bottle') || text.includes('frasco') || text.includes('creme') || text.includes('perfum') || text.includes('copo') || text.includes('livro')) return 'MEDIUM_HANDHELD';
                                                            return 'MEDIUM_HANDHELD';
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                    <span className="text-slate-400 font-medium">Presenter Mode:</span>
                                                    <span className="font-mono text-sky-300 font-semibold text-[8px] bg-sky-950/40 px-1.5 py-0.2 rounded border border-sky-800/30">
                                                        {(() => {
                                                            const cam = (customCamera || '').toLowerCase();
                                                            if (cam.includes('pov') || cam.includes('primeira pessoa')) return 'POV';
                                                            if (cam.includes('hands') || cam.includes('mãos') || videoType === 'hands_only') return 'HANDS_ONLY';
                                                            if (cam.includes('corpo inteiro') || cam.includes('full body')) return 'FULL_PRESENTER';
                                                            if (cam.includes('sem apresentador') || cam.includes('no presenter') || cam.includes('apenas produto')) return 'NO_PRESENTER';
                                                            return 'UPPER_BODY';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expanded Detailed View */}
                                            {expandedMotionCard && (
                                                <div className="space-y-1.5 pt-1.5 border-t border-sky-900/40 animate-fade-in text-[8.5px]">
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-sky-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Compatibility</span>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineStatus === 'BLOCKED' 
                                                                ? 'BLOQUEADO — Conflito físico ou escala incompatível' 
                                                                : reversePipelineStatus === 'READY_WITH_WARNINGS' 
                                                                ? 'ATENÇÃO — Requer adaptações manuais de manuseio' 
                                                                : reversePipelineStatus === 'READY' 
                                                                ? 'COMPATÍVEL — Movimentos 100% transferíveis' 
                                                                : 'ADAPTADO — Ações físicas remapeadas'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-sky-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Functional Intent</span>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {adaptData.mainBenefit 
                                                                ? `Demonstração de produto com ênfase em: ${adaptData.mainBenefit}` 
                                                                : (adaptData.newProduct ? `Uso funcional e exibição de ${adaptData.newProduct}` : 'Sem dados disponíveis')}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-sky-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Adapted Actions</span>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {finalRemodeledProject?.scenes && finalRemodeledProject.scenes.length > 0 
                                                                ? `${finalRemodeledProject.scenes.length} cenas compiladas com diretivas de movimento e interação de produto adaptadas.` 
                                                                : 'Ações de pegada, orientação e interação física remapeadas para o novo produto.'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-sky-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Removed Actions</span>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineWarnings.filter(w => /remov|substitu|incompat|strip/i.test(w)).length > 0 
                                                                ? reversePipelineWarnings.filter(w => /remov|substitu|incompat|strip/i.test(w)).join('; ') 
                                                                : 'Nenhuma ação incompatível removida.'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-sky-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Requires Safety Validation</span>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineStatus === 'BLOCKED' || reversePipelineWarnings.some(w => /motion|físic|safety/i.test(w)) 
                                                                ? 'Sim — Validação de física e escala necessária antes da renderização.' 
                                                                : 'Não — Compatibilidade direta verificada sem violações físicas.'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-0.5">
                                                        <span className="text-sky-400 font-bold font-mono text-[8px] uppercase tracking-wider block">Continuity Warnings</span>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {finalRemodeledProject?.assemblyReport?.continuityWarnings && finalRemodeledProject.assemblyReport.continuityWarnings.length > 0 
                                                                ? finalRemodeledProject.assemblyReport.continuityWarnings.join(' • ') 
                                                                : (reversePipelineWarnings.filter(w => /continu|transi/i.test(w)).length > 0 
                                                                    ? reversePipelineWarnings.filter(w => /continu|transi/i.test(w)).join(' • ') 
                                                                    : 'Nenhum alerta de continuidade.')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 3. SEGURANÇA DA REMODELAGEM */}
                                        <div className="bg-slate-900/90 p-2.5 rounded-lg border border-emerald-900/30 space-y-1.5 transition-all shadow-sm">
                                            <div 
                                                className="flex items-center justify-between text-[10px] font-bold text-emerald-300 cursor-pointer select-none group"
                                                onClick={() => setExpandedSafetyCard(prev => !prev)}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                                    <span className="text-slate-200">Segurança da Remodelagem</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[7.5px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                                                        reversePipelineStatus === 'BLOCKED'
                                                            ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                                                            : reversePipelineStatus === 'READY_WITH_WARNINGS'
                                                            ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                                                            : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                                    }`}>
                                                        {reversePipelineStatus === 'BLOCKED' ? 'BLOCKED' : reversePipelineStatus === 'READY_WITH_WARNINGS' ? 'WARNING' : 'OK'}
                                                    </span>
                                                    <LucideIcon 
                                                        name={expandedSafetyCard ? "chevron-up" : "chevron-down"} 
                                                        className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-transform" 
                                                    />
                                                </div>
                                            </div>

                                            {/* 7. SAFETY CARD — Versão recolhida */}
                                            <div className="grid grid-cols-2 gap-1.5 text-[8.5px] pt-0.5">
                                                {[
                                                    {
                                                        label: 'Motion',
                                                        status: reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /motion|movimento/i.test(w))
                                                            ? 'BLOCKED'
                                                            : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w)))
                                                            ? 'WARNING'
                                                            : 'OK'
                                                    },
                                                    {
                                                        label: 'Commercial',
                                                        status: reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /fact|comercial|preço|claim/i.test(w))
                                                            ? 'BLOCKED'
                                                            : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /fact|comercial|preço|claim/i.test(w)))
                                                            ? 'WARNING'
                                                            : 'OK'
                                                    },
                                                    {
                                                        label: 'Identity',
                                                        status: reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /identity|avatar|face/i.test(w))
                                                            ? 'BLOCKED'
                                                            : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /identity|avatar|face/i.test(w)))
                                                            ? 'WARNING'
                                                            : 'OK'
                                                    },
                                                    {
                                                        label: 'Reference',
                                                        status: reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /reference|leak|marca/i.test(w))
                                                            ? 'BLOCKED'
                                                            : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /reference|leak|marca/i.test(w)))
                                                            ? 'WARNING'
                                                            : 'OK'
                                                    }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800/70">
                                                        <span className="text-slate-400 text-[8px] font-medium truncate max-w-[85px]">{item.label}:</span>
                                                        <span className={`font-mono font-bold text-[7.5px] px-1.5 py-0.2 rounded border ${
                                                            item.status === 'OK'
                                                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                                                : item.status === 'WARNING'
                                                                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                                                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Expanded Detailed View */}
                                            {expandedSafetyCard && (
                                                <div className="space-y-1.5 pt-1.5 border-t border-emerald-900/40 animate-fade-in text-[8.5px]">
                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-emerald-400 font-bold font-mono text-[8px] uppercase tracking-wider">Motion Safety</span>
                                                            <span className={`font-mono text-[7.5px] px-1.5 py-0.2 rounded border ${
                                                                reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /motion|movimento/i.test(w))
                                                                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                                                    : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w)))
                                                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                                                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                                            }`}>
                                                                {reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /motion|movimento/i.test(w)) ? 'BLOCKED' : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /motion|movimento/i.test(w))) ? 'WARNING' : 'OK'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineWarnings.filter(w => /motion|movimento|físic/i.test(w)).length > 0 
                                                                ? reversePipelineWarnings.filter(w => /motion|movimento|físic/i.test(w)).join(' • ') 
                                                                : 'Nenhum risco de movimento físico detectado. Interações anatômicas validadas.'}
                                                        </p>
                                                    </div>

                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-emerald-400 font-bold font-mono text-[8px] uppercase tracking-wider">Commercial Safety</span>
                                                            <span className={`font-mono text-[7.5px] px-1.5 py-0.2 rounded border ${
                                                                reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /fact|comercial|preço|claim/i.test(w))
                                                                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                                                    : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /fact|comercial|preço|claim/i.test(w)))
                                                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                                                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                                            }`}>
                                                                {reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /fact|comercial|preço|claim/i.test(w)) ? 'BLOCKED' : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /fact|comercial|preço|claim/i.test(w))) ? 'WARNING' : 'OK'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineWarnings.filter(w => /fact|comercial|preço|claim|benefício/i.test(w)).length > 0 
                                                                ? reversePipelineWarnings.filter(w => /fact|comercial|preço|claim|benefício/i.test(w)).join(' • ') 
                                                                : 'Todos os fatos comerciais, especificações e claims foram validados contra o produto.'}
                                                        </p>
                                                    </div>

                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-emerald-400 font-bold font-mono text-[8px] uppercase tracking-wider">Identity Isolation</span>
                                                            <span className={`font-mono text-[7.5px] px-1.5 py-0.2 rounded border ${
                                                                reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /identity|avatar|face/i.test(w))
                                                                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                                                    : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /identity|avatar|face/i.test(w)))
                                                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                                                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                                            }`}>
                                                                {reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /identity|avatar|face/i.test(w)) ? 'BLOCKED' : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /identity|avatar|face/i.test(w))) ? 'WARNING' : 'OK'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineWarnings.filter(w => /identity|avatar|face|rosto/i.test(w)).length > 0 
                                                                ? reversePipelineWarnings.filter(w => /identity|avatar|face|rosto/i.test(w)).join(' • ') 
                                                                : 'Identidade do criador e traços faciais originais desvinculados com isolamento completo.'}
                                                        </p>
                                                    </div>

                                                    <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-emerald-400 font-bold font-mono text-[8px] uppercase tracking-wider">Reference Sanitization</span>
                                                            <span className={`font-mono text-[7.5px] px-1.5 py-0.2 rounded border ${
                                                                reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /reference|leak|marca/i.test(w))
                                                                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                                                    : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /reference|leak|marca/i.test(w)))
                                                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                                                    : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                                            }`}>
                                                                {reversePipelineStatus === 'BLOCKED' && reversePipelineWarnings.some(w => /reference|leak|marca/i.test(w)) ? 'BLOCKED' : (reversePipelineStatus === 'READY_WITH_WARNINGS' || reversePipelineWarnings.some(w => /reference|leak|marca/i.test(w))) ? 'WARNING' : 'OK'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-300 leading-relaxed">
                                                            {reversePipelineWarnings.filter(w => /reference|leak|marca|original/i.test(w)).length > 0 
                                                                ? reversePipelineWarnings.filter(w => /reference|leak|marca|original/i.test(w)).join(' • ') 
                                                                : 'Todas as referências nominais, logos e marcas do produto de referência foram expurgadas.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="pt-2 flex gap-3">
                                <Button onClick={handleAdaptProduct} disabled={isAdapting || !adaptData.newProduct} className="flex-grow bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500" icon={isAdapting ? "loader-2" : "rocket"}>
                                    {isAdapting ? "Adaptando..." : "Gerar Nova Versão"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────━━━ CINEMATIC ENGINE ━━━────────────────────────────────

import { promptLibrary } from '../constants';

const UNIVERSAL_QUICK_PRESETS = [
  {
    id: "universal_clean_studio",
    label: "Estúdio Limpo Universal",
    badge: "UNIVERSAL",
    description: "Fundo limpo, iluminação premium e foco total no produto. Ideal para qualquer categoria.",
    patch: {
      sceneType: "clean_studio",
      backgroundStyle: "minimal clean studio",
      cameraStyle: "slow push-in with product-centered framing",
      lightingStyle: "soft premium commercial lighting",
      handInteraction: "optional natural product presentation",
      mood: "premium, clear, trustworthy"
    }
  },
  {
    id: "hands_on_product_demo",
    label: "Demonstração com Mãos",
    badge: "MAIS ÚTIL",
    description: "Mãos reais interagindo com o produto de forma natural, mostrando uso, escala e detalhes.",
    patch: {
      sceneType: "hands_on_demo",
      backgroundStyle: "realistic use environment",
      cameraStyle: "close-up handheld or smooth gimbal",
      lightingStyle: "natural soft light",
      handInteraction: "realistic hands using, holding, opening, adjusting, or demonstrating the product",
      mood: "practical, human, clear"
    }
  },
  {
    id: "lifestyle_context",
    label: "Contexto de Uso Real",
    badge: "ASPIRACIONAL",
    description: "Produto inserido em um ambiente realista e aspiracional, conectado ao cotidiano do público.",
    patch: {
      sceneType: "lifestyle_context",
      backgroundStyle: "real-life aspirational environment adapted to product category",
      cameraStyle: "cinematic lifestyle movement with natural depth of field",
      lightingStyle: "warm natural lifestyle lighting",
      handInteraction: "natural interaction according to product usage",
      mood: "aspirational, relatable, desirable"
    }
  },
  {
    id: "premium_macro_detail",
    label: "Macro Premium de Detalhes",
    badge: "DETALHE",
    description: "Close-ups cinematográficos em textura, material, acabamento, embalagem, rótulo e design.",
    patch: {
      sceneType: "premium_macro_detail",
      backgroundStyle: "minimal premium background",
      cameraStyle: "macro lens, slow orbit, shallow depth of field",
      lightingStyle: "controlled highlights emphasizing texture and material",
      handInteraction: "subtle hand rotation or touch only if useful",
      mood: "premium, tactile, refined"
    }
  },
  {
    id: "unboxing_reveal",
    label: "Revelação Unboxing",
    badge: "UNBOXING",
    description: "Abertura de embalagem, retirada do produto e apresentação visual com sensação premium.",
    patch: {
      sceneType: "unboxing_reveal",
      backgroundStyle: "clean tabletop or lifestyle surface",
      cameraStyle: "top-down reveal, slow push-in, detail cutaways",
      lightingStyle: "soft commercial lighting",
      handInteraction: "hands opening packaging and revealing the product",
      mood: "anticipation, discovery, premium reveal"
    }
  },
  {
    id: "problem_to_value_scene",
    label: "Problema para Valor",
    badge: "CONVERSÃO",
    description: "Mostra visualmente o produto resolvendo uma necessidade simples, sem promessas exageradas.",
    patch: {
      sceneType: "problem_to_value",
      backgroundStyle: "realistic problem-use environment",
      cameraStyle: "before-detail-after visual progression",
      lightingStyle: "clear realistic lighting",
      handInteraction: "hands demonstrating the product solving a practical need",
      mood: "useful, simple, convincing without hype"
    }
  },
  {
    id: "marketplace_hero_shot",
    label: "Hero Shot Marketplace",
    badge: "CATÁLOGO",
    description: "Vídeo limpo, centralizado e comercial para página de produto, catálogo ou anúncio.",
    patch: {
      sceneType: "marketplace_hero",
      backgroundStyle: "clean ecommerce background",
      cameraStyle: "centered product hero shot with slow rotation",
      lightingStyle: "bright commercial product lighting",
      handInteraction: "minimal or none unless needed for scale",
      mood: "clear, professional, trustworthy"
    }
  },
  {
    id: "creator_ugc_cinematic",
    label: "UGC Cinematográfico",
    badge: "CRIADOR",
    description: "Criador apresentando o produto de forma natural, com estética de conteúdo real e câmera dinâmica.",
    patch: {
      sceneType: "creator_ugc",
      backgroundStyle: "creator room, desk, home, bathroom, kitchen, gym, or lifestyle setting adapted to product",
      cameraStyle: "natural handheld creator camera with cinematic close-ups",
      lightingStyle: "natural creator lighting with clean highlights",
      handInteraction: "creator naturally holding, showing, using, or demonstrating the product",
      mood: "authentic, human, persuasive, non-aggressive"
    }
  }
];

export function translatePortugueseComponentToEnglish(component: string): string {
    const comp = component.toLowerCase().trim();
    const dictionary: { [key: string]: string } = {
        "engrenagens": "gears",
        "engrenagens douradas": "decorative gold gears",
        "engrenagem": "gear",
        "engrenagens douradas do mostrador": "decorative gold gears on the watch dial",
        "ponteiros": "watch hands",
        "ponteiro": "hand",
        "mostrador": "dial",
        "mostrador do relógio": "watch dial",
        "logo": "logo",
        "logos": "logos",
        "texto": "text",
        "textos": "texts",
        "logo e textos": "logo and text",
        "números": "numbers",
        "número": "number",
        "data": "date",
        "números e data": "numbers and date",
        "tela": "screen",
        "tela do produto": "product screen",
        "botões": "buttons",
        "botão": "button",
        "parafusos": "screws",
        "parafuso": "screw",
        "pedras": "gemstones",
        "pedra": "gemstone",
        "ornamentos": "ornaments",
        "pedras e ornamentos": "gemstones and ornaments",
        "peças internas": "internal components",
        "rótulo": "label",
        "rótulo da embalagem": "packaging label",
        "formato": "geometry",
        "formato do produto": "product geometry",
        "todos os detalhes internos": "all internal details",
        "coroa": "winding crown",
        "pulseira": "strap",
        "fivela": "buckle",
        "vidro": "glass crystal",
        "caixa": "case",
        "bezel": "bezel",
        "embalagem": "packaging",
        "frasco": "flask bottle",
        "tampa": "cap",
        "spray": "nozzle sprayer"
    };

    if (dictionary[comp]) return dictionary[comp];

    let translated = comp;
    const replacements: [RegExp, string][] = [
        [/engrenagens douradas/g, "decorative gold gears"],
        [/engrenagens/g, "gears"],
        [/ponteiros/g, "watch hands"],
        [/mostrador/g, "dial"],
        [/para/g, "for"],
        [/do relógio/g, "on the watch"],
        [/do mostrador/g, "on the dial"],
        [/da embalagem/g, "on the packaging"],
        [/de/g, "of"],
        [/com/g, "with"],
        [/ouro/g, "gold"],
        [/dourado/g, "gold"],
        [/dourada/g, "gold"],
        [/douradas/g, "gold"],
        [/dourados/g, "gold"],
        [/prata/g, "silver"],
        [/prateado/g, "silver"],
        [/prateada/g, "silver"],
        [/preto/g, "black"],
        [/preta/g, "black"],
        [/branco/g, "white"],
        [/branca/g, "white"],
        [/azul/g, "blue"],
        [/vermelho/g, "red"],
        [/verde/g, "green"],
        [/vidro/g, "glass"],
        [/metal/g, "metal"],
        [/plástico/g, "plastic"],
        [/couro/g, "leather"],
        [/aço/g, "steel"],
        [/aço inoxidável/g, "stainless steel"],
        [/botão/g, "button"],
        [/botões/g, "buttons"],
        [/parafuso/g, "screw"],
        [/parafusos/g, "screws"],
        [/rótulo/g, "label"],
        [/marca/g, "brand"],
        [/texto/g, "text"],
        [/detalhes/g, "details"],
        [/peças/g, "parts"],
        [/internas/g, "internal"],
        [/internos/g, "internal"]
    ];

    for (const [regex, replacement] of replacements) {
        translated = translated.replace(regex, replacement);
    }

    return translated;
}

export interface ValidationIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    description: string;
}

export function validatePrompt(result: any, config: {
    lockStaticComponents: boolean;
    staticComponents: string[];
    customStaticComponents: string;
    category: string;
    productName: string;
}): { issues: ValidationIssue[]; totalWordCount: number; hasLargeWarning: boolean } {
    const issues: ValidationIssue[] = [];
    if (!result || typeof result !== 'object') return { issues, totalWordCount: 0, hasLargeWarning: false };

    let totalText = "";
    
    const consistency = result.consistency_lock || result.consistency_locks || "";
    const staticLock = result.static_component_lock || "";
    const negative = result.negative_prompt || "";

    totalText += " " + consistency;
    totalText += " " + staticLock;
    totalText += " " + negative;

    const blocks = Array.isArray(result.blocks) ? result.blocks : [];
    blocks.forEach((block: any) => {
        if (block && typeof block === 'object') {
            totalText += " " + (block.visual_en || block.visual_context_en || "");
            totalText += " " + (block.action_en || block.action_prompt_en || block.actions_en || "");
        }
    });

    const getWordCount = (str: string) => {
        if (!str) return 0;
        return str.trim().split(/\s+/).filter(Boolean).length;
    };

    const totalWordCount = getWordCount(totalText);

    blocks.forEach((block: any, idx: number) => {
        if (!block || typeof block !== 'object') return;
        const visText = block.visual_en || block.visual_context_en || "";
        const visCount = getWordCount(visText);
        if (visText && (visCount < 40 || visCount > 100)) {
            issues.push({
                type: 'warning',
                message: `Tamanho do visual da Cena ${idx + 1} fora do recomendado`,
                description: `A descrição visual possui ${visCount} palavras (recomendado: 40 a 100 palavras).`
            });
        }

        const actText = block.action_en || block.action_prompt_en || block.actions_en || "";
        const actCount = getWordCount(actText);
        if (actText && (actCount < 20 || actCount > 60)) {
            issues.push({
                type: 'warning',
                message: `Tamanho da ação da Cena ${idx + 1} fora do recomendado`,
                description: `A descrição da ação possui ${actCount} palavras (recomendado: 20 a 60 palavras).`
            });
        }
    });

    const constCount = getWordCount(consistency);
    if (consistency && (constCount < 30 || constCount > 80)) {
        issues.push({
            type: 'warning',
            message: `Tamanho do bloqueio de consistência fora do recomendado`,
            description: `O bloqueio de consistência possui ${constCount} palavras (recomendado: 30 a 80 palavras).`
        });
    }

    const staticCount = getWordCount(staticLock);
    if (config.lockStaticComponents && staticLock && (staticCount < 40 || staticCount > 100)) {
        issues.push({
            type: 'warning',
            message: `Tamanho da proteção estática fora do recomendado`,
            description: `O bloqueio estático possui ${staticCount} palavras (recomendado: 40 a 100 palavras).`
        });
    }

    const negCount = getWordCount(negative);
    if (negative && (negCount < 30 || negCount > 80)) {
        issues.push({
            type: 'warning',
            message: `Tamanho do prompt negativo fora do recomendado`,
            description: `O prompt negativo possui ${negCount} palavras (recomendado: 30 a 80 palavras).`
        });
    }

    const oldFields = ['ACTION_PROMPT_EN', 'action_prompt_en', 'actions_en', 'action_prompt', 'ACTION_PROMPT'];
    const hasDuplicatesOnRoot = Object.keys(result).some(k => oldFields.includes(k));
    let hasDuplicatesInBlocks = false;
    blocks.forEach((block: any) => {
        if (block && typeof block === 'object') {
            if (Object.keys(block).some(k => oldFields.includes(k) && k !== 'action_en')) {
                hasDuplicatesInBlocks = true;
            }
        }
    });
    if (hasDuplicatesOnRoot || hasDuplicatesInBlocks) {
        issues.push({
            type: 'error',
            message: 'Campos duplicados detectados no JSON',
            description: 'O JSON gerado contém campos de ação antigos ou aliases duplicados.'
        });
    }

    const sentences = totalText.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 15);
    const seenSentences = new Set<string>();
    const duplicateSentences = new Set<string>();
    sentences.forEach(s => {
        if (seenSentences.has(s)) {
            duplicateSentences.add(s);
        } else {
            seenSentences.add(s);
        }
    });
    if (duplicateSentences.size > 0) {
        issues.push({
            type: 'warning',
            message: 'Sentenças repetidas detectadas',
            description: `Frases idênticas ou repetidas foram identificadas no prompt gerado.`
        });
    }

    const restrictionWords = ["do not rotate", "do not spin", "no rotating", "no spinning", "no rotational movement"];
    const foundRestrictions = restrictionWords.filter(word => totalText.toLowerCase().includes(word));
    if (foundRestrictions.length > 1) {
        issues.push({
            type: 'warning',
            message: 'Restrições semânticas repetidas',
            description: `Múltiplas restrições redundantes sobre rotação/giro foram encontradas: "${foundRestrictions.join(', ')}". Considere usar apenas uma clara.`
        });
    }

    const ptWords = ["engrenagens", "ponteiros", "mostrador", "parafusos", "tampa", "frasco", "embalagem", "botões", "tela", "rótulo", "e", "com", "de", "para"];
    const foundPtWords: string[] = [];
    
    let englishTextConcat = "";
    englishTextConcat += " " + consistency;
    englishTextConcat += " " + staticLock;
    englishTextConcat += " " + negative;
    blocks.forEach((block: any) => {
        englishTextConcat += " " + (block.visual_en || block.visual_context_en || "");
        englishTextConcat += " " + (block.action_en || block.action_prompt_en || block.actions_en || "");
    });

    const tokens = englishTextConcat.toLowerCase().split(/[^a-zA-Záéíóúâêôãõç]+/);
    ptWords.forEach(word => {
        if (tokens.includes(word)) {
            foundPtWords.push(word);
        }
    });

    if (foundPtWords.length > 0) {
        issues.push({
            type: 'warning',
            message: 'Mistura de idiomas (Português/Inglês)',
            description: `Palavras em português foram encontradas nos prompts técnicos em inglês: "${foundPtWords.slice(0, 5).join(', ')}".`
        });
    }

    const placeholders = ["N/A", "None", "Undefined", "[insert", "TODO", "undefined", "null"];
    const foundPlaceholders = placeholders.filter(p => totalText.includes(p));
    if (foundPlaceholders.length > 0) {
        issues.push({
            type: 'error',
            message: 'Placeholders ou campos indefinidos',
            description: `O prompt contém termos indefinidos ou marcadores de posição: "${foundPlaceholders.join(', ')}".`
        });
    }

    const catLower = (config.category || "").toLowerCase();
    const nameLower = (config.productName || "").toLowerCase();
    const isWatch = catLower.includes("relo") || catLower.includes("watch") || catLower.includes("clock") || catLower.includes("joia") || catLower.includes("jewel") || nameLower.includes("relo") || nameLower.includes("watch") || nameLower.includes("joia") || nameLower.includes("clock");
    const isPerfume = catLower.includes("perfum") || catLower.includes("fragran") || catLower.includes("cologn") || catLower.includes("aroma") || catLower.includes("cosmetic") || catLower.includes("beleza");
    
    if (isWatch && totalText.toLowerCase().includes("packaging label") && !totalText.toLowerCase().includes("packaging box")) {
        issues.push({
            type: 'info',
            message: 'Componente protegido irrelevante',
            description: 'O produto é um relógio sem embalagem descrita, mas "packaging label" está incluído nas regras de proteção.'
        });
    }
    if (isPerfume && (totalText.toLowerCase().includes("watch hands") || totalText.toLowerCase().includes("decorative gears"))) {
        issues.push({
            type: 'info',
            message: 'Componentes de relógio em perfume',
            description: 'O produto é um perfume, mas contém ponteiros ou engrenagens de relógio nas regras.'
        });
    }

    if (totalText.toLowerCase().includes("rotate the watch hands") && totalText.toLowerCase().includes("hands must not rotate")) {
        issues.push({
            type: 'error',
            message: 'Movimentos contraditórios detectados',
            description: 'O prompt solicita rotacionar os ponteiros e simultaneamente diz para não rotacioná-los.'
        });
    }

    const hasLargeWarning = totalWordCount > 800;

    return { issues, totalWordCount, hasLargeWarning };
}

export function buildStaticComponentProtection(config: {
    lockStaticComponents: boolean;
    staticComponents: string[];
    customStaticComponents: string;
    staticProtectionStrength: 'normal' | 'strong' | 'maximum';
    category?: string;
    productName?: string;
}) {
    if (!config.lockStaticComponents) {
        return "";
    }

    const splitCustomComponents = (str: string): string[] => {
        if (!str) return [];
        return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
    };

    const removeDuplicatesAndEmptyValues = (arr: string[]): string[] => {
        const cleaned = arr.map(item => item.trim()).filter(item => item.length > 0);
        return Array.from(new Set(cleaned));
    };

    const rawComponents = [
        ...config.staticComponents,
        ...splitCustomComponents(config.customStaticComponents)
    ];

    const translatedComponents = rawComponents.map(comp => translatePortugueseComponentToEnglish(comp));

    const uniqueComponents = removeDuplicatesAndEmptyValues(translatedComponents);

    const catLower = (config.category || "").toLowerCase();
    const nameLower = (config.productName || "").toLowerCase();
    const isWatchCategory = catLower.includes("relo") || catLower.includes("watch") || catLower.includes("clock") || catLower.includes("joia") || catLower.includes("jewel") || nameLower.includes("relo") || nameLower.includes("watch") || nameLower.includes("joia") || nameLower.includes("clock");
    const isPerfumeCategory = catLower.includes("perfum") || catLower.includes("fragran") || catLower.includes("cologn") || catLower.includes("aroma") || catLower.includes("cosmetic") || catLower.includes("beleza");
    const isElectronicsCategory = catLower.includes("eletr") || catLower.includes("gadg") || catLower.includes("phone") || catLower.includes("comput") || catLower.includes("headphon") || catLower.includes("tec");
    const isPackagingCategory = catLower.includes("embal") || catLower.includes("packag") || catLower.includes("box") || catLower.includes("caixa");

    let filteredUniqueComponents = uniqueComponents;
    if (isWatchCategory) {
        filteredUniqueComponents = uniqueComponents.filter(c => c !== "packaging label" && c !== "product screen");
    } else if (isPerfumeCategory) {
        filteredUniqueComponents = uniqueComponents.filter(c => c !== "watch hands" && c !== "decorative gears" && c !== "product screen" && c !== "numbers and date");
    } else if (isElectronicsCategory) {
        filteredUniqueComponents = uniqueComponents.filter(c => c !== "decorative gears" && c !== "watch hands" && c !== "packaging label" && c !== "numbers and date");
    } else if (isPackagingCategory) {
        filteredUniqueComponents = uniqueComponents.filter(c => c !== "watch hands" && c !== "decorative gears" && c !== "product screen" && c !== "buttons");
    }

    const components = filteredUniqueComponents.length > 0
        ? filteredUniqueComponents.join(", ")
        : (isWatchCategory ? "watch dial, dial markers, sub-dials, indices, watch hands, logo, text, winding crown, side buttons, decorative gears, screws, and watch geometry"
          : isPerfumeCategory ? "perfume bottle geometry, glass thickness, bottle label, designer logo, text engraving, spray nozzle, and cap"
          : isElectronicsCategory ? "electronic device screen, bezels, buttons, brand logo, port slots, grilles, and device geometry"
          : isPackagingCategory ? "packaging box geometry, paper seams, printed typography, brand logo, barcode parallel lines, and nutritional/technical labels"
          : "all visible internal details, decorative components, logos, text, numbers, indicators, and product geometry");

    const getProtectionTemplate = (strength: 'normal' | 'strong' | 'maximum', compList: string) => {
        const distinctionRule = "\n\nDISTINCTION RULE & GEAR FREEZE MANDATE: Complete rigid physical movement of the entire product as a single object is allowed and encouraged (e.g., tilting, rotating the whole watch/device, moving closer to the camera). However, independent movement, rotation, spinning, or warping of individual protected components—SPECIFICALLY INTERNAL DECORATIVE GEARS, COGS, AND SKELETON WHEELS—is strictly forbidden. All internal gears and mechanical cogs must remain 100% frozen, unmoving, and static across all frames. Only watch hands (hour/minute/second hands) or overall camera motion are permitted to move. Zero movement on internal gears.";

        if (strength === 'normal') {
            return `STATIC COMPONENT PROTECTION:
Keep the following product components completely unchanged, stationary, and unmoving: ${compList}. These elements are fixed parts of the original product and must remain strictly static. Preserve their exact appearance, orientation, proportions, colors, and placement from the reference image. INTERNAL GEARS AND COGS MUST NOT SPIN OR ROTATE.${distinctionRule}`;
        } else if (strength === 'strong') {
            return `CRITICAL STATIC COMPONENT PROTECTION:
The following elements are fixed, non-functional, or decorative parts of the product: ${compList}. They must remain completely frozen, unmoving, and identical to the reference image throughout the entire video. Do not change, move, shift, rotate, spin, vibrate, pulse, flicker, deform, or animate these components in any way. SPECIFICALLY, ALL INTERNAL GEARS, COGS, AND DECORATIVE WHEELS MUST REMAIN ABSOLUTELY STILL. Treat these elements as permanently attached to the product as part of one single rigid object.${distinctionRule}`;
        } else if (strength === 'maximum') {
            return `ABSOLUTE PRODUCT COMPONENT LOCK:
The following components must remain pixel-consistent, completely motionless, and visually identical to the original reference image: ${compList}.

CRITICAL CONSTRAINTS: ABSOLUTELY ZERO rotational or spinning movement of internal gears, cogs, or wheels. No changing text or numbers, no screen graphics morphing, and no internal structural deformation. All individual internal gears and details must remain completely rigid and stationary relative to each other.${distinctionRule}`;
        }
        return "";
    };

    return getProtectionTemplate(config.staticProtectionStrength, components);
}

export function CinematicEngineView({ currentKey }: ReverseEngineeringViewProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // CINEMATIC MODE: Classic vs Commerce Demo V1
    const [cinematicMode, setCinematicMode] = useState<CinematicUIMode>('commerce');

    // CINEMATIC COMMERCE ENGINE V1 STATES
    const [commerceUIState, setCommerceUIState] = useState<CommerceUIState>({
        mode: 'commerce',
        demoFamily: 'AUTO',
        duration: 10,
        aspectRatio: '9:16',
        audioMode: 'music_only',
        avatar: {
            mode: 'none',
            avatarFile: null,
            avatarPreview: '',
            identityLock: true,
            gender: 'female',
            presenterStyle: '',
            wardrobe: {
                top: '',
                bottom: '',
                footwear: '',
                accessories: '',
                customDescription: ''
            }
        },
        environment: {
            mode: 'clean_studio',
            customDescription: '',
            surface: '',
            lightingStyle: 'Clean commercial studio 3-point lighting with soft fill and crisp edge definition',
            backgroundActivity: 'soft_blur'
        },
        camera: {
            strategy: 'auto',
            handheldMicroShakes: true,
            macroFocus: true,
            orbitMode: 'none'
        },
        customNegative: ''
    });
    const [commerceResult, setCommerceResult] = useState<CommerceGenerationResult | null>(null);

    const [manualProductName, setManualProductName] = useState('');
    const [manualCategory, setManualCategory] = useState('');
    const [structureMode, setStructureMode] = useState('single_scene'); 
    const [handStyle, setHandStyle] = useState('optimal subject/avatar chosen by AI');
    const [suitColor, setSuitColor] = useState('purple'); 
    const [scenario, setScenario] = useState('vibrant monochromatic purple studio background with professional dramatic lighting and seamless backdrop'); 
    const [bgStrategy, setBgStrategy] = useState('auto');
    const [presetToast, setPresetToast] = useState<string | null>(null);
    const [showSpecificPresets, setShowSpecificPresets] = useState(false);

    const applyUniversalPreset = (id: string) => {
        const preset = UNIVERSAL_QUICK_PRESETS.find(p => p.id === id);
        if (!preset) return;

        const cat = (manualCategory || "").toLowerCase();
        const name = (manualProductName || "").toLowerCase();
        
        const isBeauty = cat.includes("perfum") || cat.includes("fragran") || cat.includes("cologn") || cat.includes("aroma") || cat.includes("cosmetic") || cat.includes("beleza") || cat.includes("skin") || cat.includes("make") || cat.includes("batom") || cat.includes("creme") || name.includes("perfum") || name.includes("cosmetic") || name.includes("creme");
        
        const isKitchen = cat.includes("cozinh") || cat.includes("kitche") || cat.includes("panela") || cat.includes("prato") || cat.includes("air") || cat.includes("fryer") || cat.includes("liquidi") || cat.includes("domo") || cat.includes("casa") || cat.includes("lar") || cat.includes("utilid") || name.includes("air") || name.includes("fryer") || name.includes("panela");
        
        const isClothing = cat.includes("roupa") || cat.includes("vestu") || cat.includes("mod") || cat.includes("cloth") || cat.includes("fash") || cat.includes("t-shirt") || cat.includes("calca") || cat.includes("sapa") || cat.includes("camis") || cat.includes("jaquet") || name.includes("roupa") || name.includes("vestido") || name.includes("shirt") || name.includes("t-shirt") || name.includes("calça");
        
        const isPhone = cat.includes("phon") || cat.includes("celul") || cat.includes("smartph") || cat.includes("eletr") || cat.includes("gadget") || cat.includes("watch") || cat.includes("relo") || cat.includes("tablet") || cat.includes("comput") || cat.includes("note") || cat.includes("headphone") || cat.includes("fone") || name.includes("phone") || name.includes("celular") || name.includes("smartwatch") || name.includes("relógio") || name.includes("headphone");
        
        const isDigital = cat.includes("curso") || cat.includes("digital") || cat.includes("softw") || cat.includes("ebook") || cat.includes("pdf") || cat.includes("site") || cat.includes("plat") || cat.includes("dash") || cat.includes("logic") || cat.includes("app") || cat.includes("design") || name.includes("curso") || name.includes("e-book") || name.includes("software") || name.includes("planilha") || name.includes("plataforma");

        let finalHandStyle = 'optimal subject/avatar chosen by AI';
        let finalScenario = 'vibrant monochromatic purple studio background with professional dramatic lighting and seamless backdrop';
        let finalAction = 'optimal action chosen by AI';
        let finalCameraShot = 'optimal camera shot chosen by AI';
        let finalCameraMovement = 'optimal cinematic camera movement chosen by AI';
        let finalBgStrategy = 'auto';
        let finalStructureMode = 'single_scene';
        let finalPresetCategory = 'none';

        if (id === 'universal_clean_studio') {
            finalBgStrategy = 'white';
            finalStructureMode = 'single_scene';
            finalCameraShot = 'close-up shot (CU) focusing on intricate details and textures';
            finalCameraMovement = 'slow, smooth push in towards the subject';
            finalHandStyle = 'No hands, the product is magically floating';
            finalScenario = 'Professional e-commerce pure white seamless background';
            
            if (isBeauty) {
                finalAction = "The perfume bottle is perfectly centered, rotating slowly to capture premium reflections.";
            } else if (isKitchen) {
                finalAction = "The appliance sits centered on a clean minimalist kitchen surface, capturing high-end details.";
            } else if (isClothing) {
                finalAction = "The clothing item is perfectly presented on a minimal hanger, with soft air making it sway gently.";
            } else if (isPhone) {
                finalAction = "The device is centered in the frame, screen glowing softly with elegant interface.";
            } else if (isDigital) {
                finalAction = "A laptop screen displays the beautiful course curriculum or digital platform interface in high fidelity.";
            } else {
                finalAction = "The product is centered in a premium studio space, rotating slowly with elegant reflections.";
            }
        } 
        else if (id === 'hands_on_product_demo') {
            finalBgStrategy = 'replace';
            finalStructureMode = 'single_scene';
            finalCameraShot = 'close-up shot (CU) focusing on intricate details and textures';
            finalCameraMovement = 'handheld cinematic shot with organic micro-shakes';
            
            if (isBeauty) {
                finalHandStyle = 'A delicate feminine hand with elegant nails';
                finalScenario = 'Modern minimalist vanity table with soft natural light';
                finalAction = 'The hands hold the perfume bottle, gently removing the cap and spraying a fine, misty spray.';
            } else if (isKitchen) {
                finalHandStyle = 'A sophisticated male hand';
                finalScenario = 'Clean contemporary kitchen with stainless steel appliances';
                finalAction = 'The hands use the product on the kitchen countertop, demonstrating its main function naturally.';
            } else if (isClothing) {
                finalHandStyle = 'A sophisticated male hand';
                finalScenario = 'Warm stylish boutique background with soft ambient lights';
                finalAction = 'The hands adjust the high-quality fabric, zipper, sleeve, and fit of the clothing, showing details.';
            } else if (isPhone) {
                finalHandStyle = 'A sophisticated male hand';
                finalScenario = 'Modern office desk with sleek desk mat';
                finalAction = 'The hands tap the touchscreen, rotate the device to show ports, and adjust the buttons.';
            } else if (isDigital) {
                finalHandStyle = 'A person holding the product in a casual Live Stream POV selfie angle';
                finalScenario = 'Modern wooden desk with a sleek laptop or tablet';
                finalAction = 'The hands type on the laptop, click the mouse, and navigate the interactive user dashboard.';
            } else {
                finalHandStyle = 'A sophisticated male hand';
                finalScenario = 'Realistic everyday use environment appropriate for this product category';
                finalAction = 'Hands real and natural interacting with the product, holding it, showing its scale and operation.';
            }
        }
        else if (id === 'lifestyle_context') {
            finalBgStrategy = 'replace';
            finalStructureMode = 'single_scene';
            finalCameraShot = 'eye-level shot, straight-on cinematic perspective';
            finalCameraMovement = 'smooth steadicam shot following the action';
            finalHandStyle = 'optimal subject/avatar chosen by AI';

            if (isBeauty) {
                finalScenario = 'Modern minimalist bathroom with natural sunlight coming through a large window';
                finalAction = 'A person naturally picks up the bottle from a vanity, applying it gently with a smile.';
            } else if (isKitchen) {
                finalScenario = 'Sunny bright modern kitchen during breakfast time, family atmosphere in background';
                finalAction = 'A person uses the kitchen appliance to prepare a delicious healthy meal, steaming fresh.';
            } else if (isClothing) {
                finalScenario = 'Elegant outdoor street or cafe during golden hour, soft bokeh of city life';
                finalAction = 'A person wearing the outfit walks confidently, the fabric flowing naturally in the breeze.';
            } else if (isPhone) {
                finalScenario = 'A cozy modern living room during a warm evening, soft ambient lamps glowing';
                finalAction = 'A person uses the device in their hand while relaxing on a couch, showing seamless interaction.';
            } else if (isDigital) {
                finalScenario = 'A warm creative workspace or coffee shop, natural morning light';
                finalAction = 'A person smiles while learning from the course on a laptop, typing and taking notes enthusiastically.';
            } else {
                finalScenario = 'Aspirational real-life environment connected to the product category';
                finalAction = 'The product is seamlessly integrated into a natural lifestyle scene, being used in daily life.';
            }
        }
        else if (id === 'premium_macro_detail') {
            finalBgStrategy = 'gradient';
            finalStructureMode = 'single_scene';
            finalCameraShot = 'close-up shot (CU) focusing on intricate details and textures';
            finalCameraMovement = 'macro zoom shot, approaching until extreme detail';
            finalHandStyle = 'No hands, the product is magically floating';

            if (isBeauty) {
                finalScenario = 'Sleek marble countertop with soft warm light highlights';
                finalAction = 'The camera slowly glides across the elegant glass texturing, gold lettering, and fine label details.';
            } else if (isKitchen) {
                finalScenario = 'Polished granite surface with dramatic spotlighting';
                finalAction = 'The camera slow orbit focuses on the brushed metal finishes, seamless buttons, and premium build quality.';
            } else if (isClothing) {
                finalScenario = 'High-end textile showroom with detailed fiber highlights';
                finalAction = 'The camera pans slowly across the high-precision stitching, fabric weave pattern, and zipper metal.';
            } else if (isPhone) {
                finalScenario = 'Sleek dark reflective studio surface with moody cinematic lighting';
                finalAction = 'The camera zooms into the premium metallic edges, glass reflections, camera lens, and laser-etched logo.';
            } else if (isDigital) {
                finalScenario = 'Super clean macro shot of screen pixels or premium digital design elements';
                finalAction = 'The camera orbits slowly focusing on the clean UI elements, sharp typography, and glowing icons on the laptop.';
            } else {
                finalScenario = 'Minimal premium background with controlled highlights emphasizing textures and materials';
                finalAction = 'The camera executes a slow cinematic macro orbit, highlighting premium materials, branding, and details.';
            }
        }
        else if (id === 'unboxing_reveal') {
            finalBgStrategy = 'replace';
            finalStructureMode = 'single_scene';
            finalCameraShot = 'bird’s eye view, top-down omniscient perspective';
            finalCameraMovement = 'slow, smooth push in towards the subject';
            finalHandStyle = 'A sophisticated male hand';
            finalScenario = 'Clean premium wooden tabletop with soft cinematic desk light';

            if (isBeauty) {
                finalAction = 'Elegant hands slowly open the premium textured box, lift the heavy glass perfume bottle, and place it gently beside the box.';
            } else if (isKitchen) {
                finalAction = 'Hands unbox the clean device, removing it from its protective cardboard container, presenting its clean design.';
            } else if (isClothing) {
                finalAction = 'Hands open a custom paper-wrapped boutique box, peeling back the sticker and unfolding the garment beautifully.';
            } else if (isPhone) {
                finalAction = 'Hands peel the clean screen protector plastic off the new device, showing a pristine reflective screen.';
            } else if (isDigital) {
                finalAction = 'Hands open a premium welcome book or digital activation envelope, revealing a sleek login card with key details.';
            } else {
                finalAction = 'Hands elegantly open the premium packaging, lift the product out, and showcase its fresh pristine design.';
            }
        }
        else if (id === 'problem_to_value_scene') {
            finalBgStrategy = 'replace';
            finalStructureMode = 'problem_solution';
            finalCameraShot = 'eye-level shot, straight-on cinematic perspective';
            finalCameraMovement = 'smooth steadicam shot following the action';
            finalHandStyle = 'optimal subject/avatar chosen by AI';

            if (isBeauty) {
                finalScenario = 'A slightly tired morning face transforming into glowing refreshed skin in a bright bathroom';
                finalAction = 'The video demonstrates skin feeling dry, then hands applying the product to immediately show a hydrated, natural glow.';
            } else if (isKitchen) {
                finalScenario = 'Messy kitchen countertop with prep clutter, transitioning to organized clean cooking';
                finalAction = 'The video shows a messy task made effortless and clean with the help of this premium kitchen appliance.';
            } else if (isClothing) {
                finalScenario = 'A person wearing wrinkled old clothes, transitioning to putting on the fresh stylish outfit';
                finalAction = 'The video shows the user looking uncomfortable, then putting on this outfit and instantly feeling confident and stylish.';
            } else if (isPhone) {
                finalScenario = 'Dealing with tangled wires or slow devices, transitioning to this sleek smart device';
                finalAction = 'The video shows old tech struggling, then hands turning on this device for a fast, responsive user experience.';
            } else if (isDigital) {
                finalScenario = 'Struggling with confusing sheets or old books, transitioning to the clean laptop screen showing the dashboard';
                finalAction = 'The video shows a person feeling lost, then clicking play on the laptop and immediately smiling at the clear curriculum.';
            } else {
                finalScenario = 'A realistic problem-solving environment suited for the product category';
                finalAction = 'The video demonstrates resolving a simple practical need with the product, showing clear value.';
            }
        }
        else if (id === 'marketplace_hero_shot') {
            finalBgStrategy = 'white';
            finalStructureMode = 'single_scene';
            finalCameraShot = 'eye-level shot, straight-on cinematic perspective';
            finalCameraMovement = '360-degree orbital camera rotation around the focal point';
            finalHandStyle = 'No hands, the product is magically floating';
            finalScenario = 'Professional e-commerce pure white seamless background';
            finalAction = 'The product is perfectly centered, rotating slowly 360 degrees on an invisible pedestal under high-end commercial studio light.';
        }
        else if (id === 'creator_ugc_cinematic') {
            finalBgStrategy = 'replace';
            finalStructureMode = 'viral_hook';
            finalCameraShot = 'handheld camera style with organic micro-shakes and dynamic fast zooms';
            finalCameraMovement = 'handheld cinematic shot with organic micro-shakes';
            finalHandStyle = 'A person holding the product in a casual Live Stream POV selfie angle';

            if (isBeauty) {
                finalScenario = 'A clean cozy bedroom or minimalist vanity mirror background';
                finalAction = 'The creator naturally shows the bottle to the camera, talks with friendly hand gestures, and sprays it with a smile.';
            } else if (isKitchen) {
                finalScenario = 'Cozy modern kitchen corner with warm ambient lights';
                finalAction = 'The creator points at the device, shows a fresh snack prepared with it, and gives a thumbs up.';
            } else if (isClothing) {
                finalScenario = 'Stylish bedroom closet or full-length mirror bedroom setup';
                finalAction = 'The creator wears the outfit, spins in front of the camera, and adjustments the fit while smiling.';
            } else if (isPhone) {
                finalScenario = 'Desk space filled with modern accessories and tech gadgets';
                finalAction = 'The creator holds the device close, shows its screen to the lens, and naturally demonstrates its fast usage.';
            } else if (isDigital) {
                finalScenario = 'Cozy home office desk with dual monitors or a warm study corner';
                finalAction = 'The creator points to their laptop, types on the keyboard, and gestures excitedly toward the digital dashboard.';
            } else {
                finalScenario = 'Authentic creator room or home environment adapted to the product';
                finalAction = 'The creator naturally holds, shows, and demonstrates the product in a friendly and authentic way.';
            }
        }

        setBgStrategy(finalBgStrategy);
        setStructureMode(finalStructureMode);
        setCameraShot(finalCameraShot);
        setCameraMovement(finalCameraMovement);
        setHandStyle(finalHandStyle);
        setScenario(finalScenario);
        setActionStr(finalAction);
        setPresetCategory(finalPresetCategory);

        setPresetToast("Preset universal aplicado.");
        setTimeout(() => setPresetToast(null), 3000);
        alert("Preset universal aplicado.");
    };
    const [actionStr, setActionStr] = useState('optimal action chosen by AI');
    const [cameraShot, setCameraShot] = useState('optimal camera shot chosen by AI');
    const [cameraMovement, setCameraMovement] = useState('optimal cinematic camera movement chosen by AI');
    const [presetCategory, setPresetCategory] = useState('none');

    // Configuração Cinemática states
    const [aiTarget, setAiTarget] = useState('runway');
    const [lightingStyle, setLightingStyle] = useState('soft_commercial');
    const [visualHook, setVisualHook] = useState('reveal_360');
    const [autoAdaptProduct, setAutoAdaptProduct] = useState(true);

    const autoAdaptToCategory = (cat: string) => {
        if (!cat) return;
        const c = cat.toLowerCase();

        if (c.includes("mod") || c.includes("roup") || c.includes("fash") || c.includes("vestu") || c.includes("cloth") || c.includes("calca") || c.includes("sapa") || c.includes("camis") || c.includes("jaquet")) {
            setActionStr("The hands adjust the high-quality fabric, zipper, sleeve, and fit of the clothing, showing details.");
            setScenario("Ultra-realistic fashion showcase photography, vertical 9:16, 8k resolution, cinematic lighting, high detail, professional retail environment inside a luxury clothing store with warm ambient lighting.");
            setLightingStyle("luxury_spotlight");
            setCameraShot("eye-level shot, straight-on cinematic perspective");
            setStructureMode("fashion_conversion");
            setVisualHook("reveal_360");
        } else if (c.includes("relo") || c.includes("watch") || c.includes("joia") || c.includes("jewel") || c.includes("clock")) {
            setActionStr("The hand slowly rotates the product 360 degrees, revealing its intricate details and premium construction from all perspectives.");
            setScenario("Luxury jewelry store with bright spotlights and glass displays, or soft pink studio lighting inside a jewelry box environment.");
            setLightingStyle("high_contrast_dramatic");
            setCameraShot("close-up shot (CU) focusing on intricate details and textures");
            setStructureMode("tech_demo");
            setVisualHook("luxury_unboxing");
        } else if (c.includes("perfum") || c.includes("fragran") || c.includes("cologn") || c.includes("cosmetic") || c.includes("beleza") || c.includes("skin") || c.includes("batom") || c.includes("creme") || c.includes("aroma")) {
            setActionStr("The hands hold the perfume bottle, gently removing the cap and spraying a fine, misty spray.");
            setScenario("Modern minimalist vanity table with soft natural light and subtle water reflections.");
            setLightingStyle("soft_commercial");
            setCameraShot("close-up shot (CU) focusing on intricate details and textures");
            setStructureMode("beauty_proof");
            setVisualHook("macro_hands");
        } else if (c.includes("eletr") || c.includes("gadg") || c.includes("phon") || c.includes("celul") || c.includes("smart") || c.includes("headphon") || c.includes("comput") || c.includes("fone") || c.includes("tec")) {
            setActionStr("The hands tap the touchscreen, rotate the device to show ports, and adjust the buttons.");
            setScenario("Sleek dark reflective studio surface with moody cinematic lighting and tech neon accent.");
            setLightingStyle("neon_cyberpunk");
            setCameraShot("close-up shot (CU) focusing on intricate details and textures");
            setStructureMode("tech_demo");
            setVisualHook("reveal_360");
        } else if (c.includes("cozinh") || c.includes("kitche") || c.includes("panela") || c.includes("air") || c.includes("domo") || c.includes("casa") || c.includes("utilid")) {
            setActionStr("The hands use the product on the kitchen countertop, demonstrating its main function naturally.");
            setScenario("Clean contemporary kitchen with stainless steel appliances and bright natural light.");
            setLightingStyle("bright_softbox");
            setCameraShot("eye-level shot, straight-on cinematic perspective");
            setStructureMode("problem_solution");
            setVisualHook("problem_solution");
        } else if (c.includes("curso") || c.includes("digital") || c.includes("softw") || c.includes("ebook") || c.includes("app") || c.includes("site") || c.includes("plat")) {
            setActionStr("The creator points to their laptop, types on the keyboard, and gestures excitedly toward the digital dashboard.");
            setScenario("Cozy home office desk with dual monitors or a warm study corner.");
            setLightingStyle("golden_hour");
            setCameraShot("handheld camera style with organic micro-shakes and dynamic fast zooms");
            setStructureMode("viral_hook");
            setVisualHook("ugc_demo");
        } else {
            setActionStr("optimal action chosen by AI");
            setScenario("vibrant monochromatic purple studio background with professional dramatic lighting and seamless backdrop");
            setLightingStyle("soft_commercial");
            setCameraShot("optimal camera shot chosen by AI");
            setStructureMode("single_scene");
            setVisualHook("reveal_360");
        }
    };
    
    // Collapsible sections for Prompt Preview
    const [visualOpen, setVisualOpen] = useState(true);
    const [actionOpen, setActionOpen] = useState(true);
    const [locksOpen, setLocksOpen] = useState(true);
    const [negativeOpen, setNegativeOpen] = useState(true);
    
    // Object Lock states
    const [productFile, setProductFile] = useState<File | null>(null);
    const [productPreview, setProductPreview] = useState('');
    const [productDetails, setProductDetails] = useState('');
    const [showObjectLock, setShowObjectLock] = useState(false);
    const [extractingDetails, setExtractingDetails] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);

    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Create the state object for Autosave & Recovery in Cinematic Engine
    const currentState = {
        cinematicMode,
        previewUrl,
        result,
        manualProductName,
        manualCategory,
        structureMode,
        handStyle,
        suitColor,
        scenario,
        bgStrategy,
        actionStr,
        cameraShot,
        cameraMovement,
        presetCategory,
        productPreview,
        productDetails,
        showObjectLock,
        aiTarget,
        lightingStyle,
        visualHook,
        autoAdaptProduct
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (saved.cinematicMode !== undefined) setCinematicMode(saved.cinematicMode);
        if (saved.previewUrl !== undefined) setPreviewUrl(saved.previewUrl);
        if (saved.result !== undefined) setResult(saved.result);
        if (saved.manualProductName !== undefined) setManualProductName(saved.manualProductName);
        if (saved.manualCategory !== undefined) setManualCategory(saved.manualCategory);
        if (saved.structureMode !== undefined) setStructureMode(saved.structureMode);
        if (saved.handStyle !== undefined) setHandStyle(saved.handStyle);
        if (saved.suitColor !== undefined) setSuitColor(saved.suitColor);
        if (saved.scenario !== undefined) setScenario(saved.scenario);
        if (saved.bgStrategy !== undefined) setBgStrategy(saved.bgStrategy);
        if (saved.actionStr !== undefined) setActionStr(saved.actionStr);
        if (saved.cameraShot !== undefined) setCameraShot(saved.cameraShot);
        if (saved.cameraMovement !== undefined) setCameraMovement(saved.cameraMovement);
        if (saved.presetCategory !== undefined) setPresetCategory(saved.presetCategory);
        if (saved.productPreview !== undefined) setProductPreview(saved.productPreview);
        if (saved.productDetails !== undefined) setProductDetails(saved.productDetails);
        if (saved.showObjectLock !== undefined) setShowObjectLock(saved.showObjectLock);
        if (saved.aiTarget !== undefined) setAiTarget(saved.aiTarget);
        if (saved.lightingStyle !== undefined) setLightingStyle(saved.lightingStyle);
        if (saved.visualHook !== undefined) setVisualHook(saved.visualHook);
        if (saved.autoAdaptProduct !== undefined) setAutoAdaptProduct(saved.autoAdaptProduct);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.previewUrl && !state.result && !state.manualProductName;
    };

    const {
        AutoSaveIndicator,
        RecoveryBanner
    } = useAutoSaveRecovery('cinematic_engine', currentState, handleRestore, isEmptyOrInitial);

    const { feedback: mainPasteFeedback, error: mainPasteError } = usePasteImageUpload({
        isActive: !showObjectLock,
        onImagePasted: (fileObj) => {
            handleUploadedFile(fileObj);
        }
    });

    const { feedback: objectPasteFeedback, error: objectPasteError } = usePasteImageUpload({
        isActive: showObjectLock,
        onImagePasted: (fileObj) => {
            setProductFile(fileObj);
            setProductPreview(URL.createObjectURL(fileObj));
        }
    });

    // Handle pending frame from Reverse Engineering workspace (Cinematic integration)
    useEffect(() => {
        try {
            const pending = localStorage.getItem('robizin_pending_cinematic_frame');
            if (pending) {
                localStorage.removeItem('robizin_pending_cinematic_frame');
                
                const dataURLtoFile = (dataurl: string, filename: string) => {
                    const arr = dataurl.split(',');
                    const mime = arr[0].match(/:(.*?);/)![1];
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while(n--){
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    return new File([u8arr], filename, {type: mime});
                };
                
                const fileObj = dataURLtoFile(pending, `extracted_frame_${Date.now()}.png`);
                handleUploadedFile(fileObj);
            }
        } catch (e) {
            console.error("Error loading pending Cinematic frame:", e);
        }
    }, []);

    // Handle pending Ambient Match prompt from Reverse Engineering workspace (Ambient Match AI)
    useEffect(() => {
        try {
            const pendingEnv = localStorage.getItem('robizin_pending_cinematic_env');
            if (pendingEnv) {
                localStorage.removeItem('robizin_pending_cinematic_env');
                setBgStrategy('similar_env');
                setScenario(pendingEnv);
                
                localStorage.removeItem('robizin_pending_cinematic_product_lock_enabled');
                localStorage.removeItem('robizin_pending_cinematic_product_lock_prompt_en');
                localStorage.removeItem('robizin_pending_cinematic_environment_remodel_prompt_en');
                localStorage.removeItem('robizin_pending_cinematic_negative_product_change_prompt');
                localStorage.removeItem('robizin_pending_cinematic_product_accuracy_mode');
                localStorage.removeItem('robizin_pending_cinematic_environment_editable');

                console.log("Auto-loaded pending Ambient Match environment and details into CinematicEngine.");
            }
        } catch (e) {
            console.error("Error loading pending Ambient Match prompt:", e);
        }
    }, []);

    const THEME_COLORS = [
        { value: 'purple', label: 'Roxo (Purple)', scenario: 'vibrant monochromatic purple studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'red', label: 'Vermelho (Red)', scenario: 'vibrant monochromatic red studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'navy blue', label: 'Azul Marinho (Navy Blue)', scenario: 'vibrant monochromatic navy blue studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'emerald green', label: 'Verde Esmeralda (Emerald Green)', scenario: 'vibrant monochromatic emerald green studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'yellow', label: 'Amarelo (Yellow)', scenario: 'vibrant monochromatic yellow studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'orange', label: 'Laranja (Orange)', scenario: 'vibrant monochromatic orange studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'hot pink', label: 'Rosa Choque (Hot Pink)', scenario: 'vibrant monochromatic hot pink studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'black', label: 'Preto (Black)', scenario: 'vibrant monochromatic black studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'white', label: 'Branco (White)', scenario: 'vibrant monochromatic white studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'gold', label: 'Dourado (Gold)', scenario: 'vibrant monochromatic gold studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'silver', label: 'Prateado (Silver)', scenario: 'vibrant monochromatic silver studio background with professional dramatic lighting and seamless backdrop' },
        { value: 'neon cyan', label: 'Ciano Neon (Neon Cyan)', scenario: 'vibrant monochromatic neon cyan studio background with professional dramatic lighting and seamless backdrop' }
    ];

    const handOptions = [
        { value: 'optimal subject/avatar chosen by AI', label: 'Automático (IA Decide)' },
        { value: 'Full body subject matching the product style', label: 'Corpo Completo (Avatar Automático)' },
        { value: 'custom_suit_man', label: 'Homem Terno Personalizado (Corpo Completo)' },
        { value: 'subject_adapted_color', label: 'Adaptar Sujeito da Foto ao Tema (Corpo Completo)' }, 
        { value: 'A sophisticated male hand', label: 'Mão Masculina Sofisticada' },
        { value: 'A delicate feminine hand with elegant nails', label: 'Mão Feminina Delicada' },
        { value: 'Hands wearing pristine white cotton gloves', label: 'Luvas Brancas (Joalheria)' },
        { value: 'Hands wearing sleek black leather gloves', label: 'Luvas Pretas de Luxo' },
        { value: 'A robotic cybernetic hand', label: 'Mão Robótica / Sci-Fi' },
        { value: 'No hands, the product is magically floating', label: 'Sem Mão (Produto Flutuando)' },
        { value: 'A person holding the product in a casual Live Stream POV selfie angle', label: 'POV Estilo Live (Segurando com 1 mão)' },
        { value: 'A sophisticated male hand with a luxury watch and suit cuff', label: 'Mão Masculina Executiva (Tech/Finanças)' },
        { value: 'Hands wearing blue latex clinical gloves', label: 'Luvas de Látex (Saúde/Limpeza)' },
        { value: 'Hands with urban streetwear tattoos', label: 'Mão com Tatuagens (Urbano/Street)' },
        { value: 'A masculine hand with realistic skin texture and detailed tattoos visible interacting naturally with the mannequin, one hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction', label: 'Moda: Mão Masculina com Tatuagens no Manequim' }
    ];

    const scenarioOptions = [
        { value: 'optimal environment chosen by AI', label: 'Automático (IA Decide)' },
        ...THEME_COLORS.map(c => ({ value: c.scenario, label: `Estúdio: ${c.label}` })),
        { value: 'Luxury jewelry store with bright spotlights and glass displays', label: 'Joalheria Luxuosa' },
        { value: 'Sunny resort swimming pool with shimmering water reflections', label: 'Piscina de Resort (Água e Sol)' },
        { value: 'Sleek dark reflective studio surface with moody cinematic lighting', label: 'Estúdio Escuro (Superfície Reflexiva)' },
        { value: 'Modern minimalist living room with natural sunlight from a window', label: 'Sala de Estar Moderna (Luz Natural)' },
        { value: 'Luxury white marble countertop', label: 'Mesa de Mármore Branco' },
        { value: 'Professional e-commerce pure white seamless background', label: 'Fundo Branco Infinito (E-commerce)' },
        { value: 'Clean contemporary kitchen with stainless steel appliances', label: 'Cozinha Contemporânea Clean' },
        { value: 'High-end sports car interior with leather seats', label: 'Interior de Carro de Luxo' },
        { value: 'Organized professional garage workshop', label: 'Oficina / Garagem (Ferramentas/DIY)' },
        { value: 'Ultra-realistic fashion showcase photography, vertical 9:16, 8k resolution, cinematic lighting, high detail, professional retail environment. The scene takes place inside a luxury clothing store with warm ambient lighting, polished marble floor, and elegant wooden wall panels. Clothing racks with neatly arranged garments are softly blurred in the background, creating depth. A matte black mannequin is centered in the frame, standing upright and facing forward. The mannequin is wearing the clothing from the reference image. The clothing must be EXACTLY identical to the reference image in every aspect: same color, print, texture, proportions, stitching and all design details. No modifications, no reinterpretation, no stylization, no added or removed elements. A masculine hand with realistic skin texture and detailed tattoos is visible interacting naturally with the mannequin, one hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction. The clothing occupies around 60–70% of the frame, with natural fabric draping and subtle folds. Soft directional lighting enhances texture and depth without harsh shadows. Clean composition, centered framing, slight depth of field keeping the clothing sharp while softly blurring the background. No text, no interface elements, no logos or overlays. Professional, realistic, high-end fashion presentation style', label: 'Moda: Vitrine de Luxo & Manequim (Fashion Showcase)' }
    ];

    const actionOptions = [
        { value: 'optimal action chosen by AI', label: 'Automático (IA Decide)' },
        { value: 'The hand slowly rotates the product 360 degrees, revealing its intricate details and premium construction from all perspectives.', label: 'Giro 360º Lento nas Mãos' },
        { value: 'The hand gently places the product onto the surface, followed by a mesmerizing close-up capturing its sophisticated details and glimmering reflections.', label: 'Colocar na Superfície + Zoom' },
        { value: 'The camera slowly pushes in for an extreme macro close-up, panning across the textures and materials of the product.', label: 'Macro Zoom (Explorando Texturas)' },
        { value: 'The hands elegantly unbox the product, lifting it from its premium packaging to reveal it to the camera.', label: 'Unboxing Elegante' },
        { value: 'The person holds the product close to the camera as if showing it to viewers on a live stream, slightly tilting it to catch the light.', label: 'Mostrar para a Câmera (Estilo Live)' }
    ];

    const cameraShotsOptions = [
        { label: "Automático (IA Decide)", value: "optimal camera shot chosen by AI" },
        { label: "🏆 Walking toward camera", value: "dynamic tracking shot of the subject walking confidently straight toward the camera, full body to close-up" },
        { label: "🔄 Spin 360° (Zoom Detalhes)", value: "smooth camera shot capturing the subject spinning 360 degrees to show full product details" },
        { label: "🤳 Mirror Gym Selfie", value: "low angle camera shot simulating a realistic mirror selfie in a gym environment" },
        { label: "✂️ Jump Cut Outfit Change", value: "dynamic centered shot optimized for fast jump-cut transitions" },
        { label: "⏳ Hands on Waist -> Side Profile", value: "medium shot of subject with hands on waist turning into a sharp side profile" },
        { label: "🧘‍♀️ Sit down -> Stand up", value: "dynamic tracking shot following the subject sitting down on the floor and standing up smoothly" },
        { label: "🔙 Over the Shoulder (Costas)", value: "over the shoulder shot from the back, subject looking back at the camera smiling" },
        { label: "☀️ Golden Hour Rooftop", value: "cinematic shot on a rooftop during golden hour, angelic lighting" },
        { label: "👇 Close-up -> Pan Down", value: "close-up shot on the face panning down quickly to reveal the full body and outfit" },
        { label: "🔴 Fake Live (Estático)", value: "static eye-level camera angle simulating a realistic social media live stream broadcast" },
        { label: "📸 Estilo UGC (Câmera na Mão)", value: "handheld camera style with organic micro-shakes and dynamic fast zooms" },
        { label: "Close-Up (Detalhe)", value: "close-up shot (CU) focusing on intricate details and textures" },
        { label: "Over-the-Shoulder Clássico", value: "over-the-shoulder shot (OTS) to provide immersion and context" },
        { label: "Low Angle (Poder)", value: "low angle shot to make the subject appear powerful and imposing" },
        { label: "High Angle (Conjunto)", value: "high angle shot to emphasize the scale or layout from above" },
        { label: "Bird’s Eye View", value: "bird’s eye view, top-down omniscient perspective" },
        { label: "Dutch Angle (Tensão)", value: "dutch angle shot, tilted frame for dramatic tension" },
        { label: "Wide Shot (Cenário)", value: "wide shot (WS) to capture the environment and full context" },
        { label: "Eye-Level (Conexão Direta)", value: "eye-level shot, straight-on cinematic perspective" }
    ];

    const cameraMovementsOptions = [
        { label: "Automático (IA Decide)", value: "optimal cinematic camera movement chosen by AI" },
        { label: "Slow Push In", value: "slow, smooth push in towards the subject" },
        { label: "Slow Dolly Out", value: "slow dolly out to gradually reveal the environment" },
        { label: "Orbit 360°", value: "360-degree orbital camera rotation around the focal point" },
        { label: "Whip Pan (Rápido)", value: "fast whip pan with motion blur for dynamic transitions" },
        { label: "Lateral Truck", value: "smooth lateral truck move, sliding horizontally" },
        { label: "Vertigo Effect", value: "vertigo effect (dolly zoom) for spatial distortion" },
        { label: "Handheld (UGC)", value: "handheld cinematic shot with organic micro-shakes" },
        { label: "Crane Up (Épico)", value: "cinematic crane up shot to reveal the vast landscape" },
        { label: "Macro Zoom", value: "macro zoom shot, approaching until extreme detail" },
        { label: "Steadicam Follow (Acompanhar)", value: "smooth steadicam shot following the action" },
        { label: "Zoom Burst (Destaque Rápido)", value: "rapid zoom burst towards the product for emphasis" }
    ];

    const applyFashionShowcasePreset = () => {
        setManualProductName('Outfit de Moda Realista');
        setManualCategory('Moda (Fashion)');
        setStructureMode('fashion_conversion');
        setHandStyle('A masculine hand with realistic skin texture and detailed tattoos visible interacting naturally with the mannequin, one hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction');
        setScenario('Ultra-realistic fashion showcase photography, vertical 9:16, 8k resolution, cinematic lighting, high detail, professional retail environment. The scene takes place inside a luxury clothing store with warm ambient lighting, polished marble floor, and elegant wooden wall panels. Clothing racks with neatly arranged garments are softly blurred in the background, creating depth. A matte black mannequin is centered in the frame, standing upright and facing forward. The mannequin is wearing the clothing from the reference image. The clothing must be EXACTLY identical to the reference image in every aspect: same color, print, texture, proportions, stitching and all design details. No modifications, no reinterpretation, no stylization, no added or removed elements. A masculine hand with realistic skin texture and detailed tattoos is visible interacting naturally with the mannequin, one hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction. The clothing occupies around 60–70% of the frame, with natural fabric ding and subtle folds. Soft directional lighting enhances texture and depth without harsh shadows. Clean composition, centered framing, slight depth of field keeping the clothing sharp while softly blurring the background. No text, no interface elements, no logos or overlays. Professional, realistic, high-end fashion presentation style');
        setBgStrategy('replace');
        setActionStr('A masculine hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction.');
        setCameraShot('optimal camera shot chosen by AI');
        setCameraMovement('optimal cinematic camera movement chosen by AI');
        alert('Preset Ultra-Realistic Fashion Showcase aplicado com sucesso!');
    };

    const applyCinematicWatchPreset = () => {
        setManualProductName('Luxury Silver-and-Gold Watch with Black Face');
        setManualCategory('Acessórios / Relógios de Luxo');
        setStructureMode('tech_demo');
        setHandStyle('A delicate feminine hand with elegant nails');
        setScenario('Soft pink studio lighting inside a jewelry box environment, with transitions to bright natural light and dim glowing wrist shots');
        setBgStrategy('replace');
        setActionStr("A woman's hands open a pink jewelry box presenting the luxury watch, then dip it in water, show it glowing, and place it back closing the lid.");
        setCameraShot('close-up shot (CU) focusing on intricate details and textures');
        setCameraMovement('optimal cinematic camera movement chosen by AI');
        setPresetCategory('luxury_fashion');
        
        setResult({
            product_name: "Luxury Silver-and-Gold Watch with Black Face",
            category: "Acessórios / Relógios de Luxo",
            emotion: "Desejo & Sofisticação",
            speed: "Lento e Cinematográfico",
            camera: "Macro & Close-up",
            lighting: "Soft Pink Studio Lighting & Bright Natural Light",
            duration: "15s",
            format: "vertical 9:16",
            style: "Sequential Story",
            mode: "tech_demo",
            consistency_locks: "OBJECT DNA LOCK, LOGO PRESERVATION LOCK, TEXT PRESERVATION LOCK, MATERIAL LOCK, GEOMETRY LOCK, BACKGROUND LOCK, WATCH DATE LOCK. Calendar date window is frozen exactly to maintain perfect video frame-to-frame fidelity.",
            negative_prompt: "morphed logos, hallucinated text, changing numbers, shifting date window, duplicate branding, warping dial, fluid metal, mutated hands, deformed watch face, changing materials, flickering text, recreated product, background drift, environment mutation, incorrect reflections",
            blocks: [
                {
                    scene: "Cena 1: Unboxing de Luxo",
                    visual_en: "Static macro shot. Soft pink studio lighting. A woman's hands open a pink jewelry box, presenting a luxury silver-and-gold watch with a black face.",
                    action_prompt_en: "Static macro shot. Soft pink studio lighting. A woman's hands open a pink jewelry box, presenting a luxury silver-and-gold watch with a black face.",
                    ACTION_PROMPT_EN: "Static macro shot. Soft pink studio lighting. A woman's hands open a pink jewelry box, presenting a luxury silver-and-gold watch with a black face.",
                    voice_description_en: "Elegant, polished female voice speaking with refined sophistication and a slow, prestige-driven pacing.",
                    dialogue_pt_br: "A precisão encontra a sofisticação pura. Cada detalhe esculpido para ser inesquecível.",
                    creator_profile: "Gender: Female, Persona: Luxury Presenter, Energy: 60%, Pace: Slow"
                },
                {
                    scene: "Cena 2: Resiliência em Luz e Água",
                    visual_en: "Close-up transitions. Bright natural light. Hands dip the watch into a glass of water, then showcase the watch glowing in dim light on a wrist.",
                    action_prompt_en: "Close-up transitions. Bright natural light. Hands dip the watch into a glass of water, then showcase the watch glowing in dim light on a wrist.",
                    ACTION_PROMPT_EN: "Close-up transitions. Bright natural light. Hands dip the watch into a glass of water, then showcase the watch glowing in dim light on a wrist.",
                    voice_description_en: "Dynamic, clear female voice, conveying premium durability and absolute engineering perfection.",
                    dialogue_pt_br: "À prova d'água, desenhado para resistir. E no escuro, o brilho fosforescente que atrai todos os olhares.",
                    creator_profile: "Gender: Female, Persona: Luxury Presenter, Energy: 70%, Pace: Normal"
                },
                {
                    scene: "Cena 3: O Fecho & Retorno",
                    visual_en: "Macro shot. Soft studio lighting. Hands display the metallic clasp of the watch, then place it back into the pink box, closing the lid.",
                    action_prompt_en: "Macro shot. Soft studio lighting. Hands display the metallic clasp of the watch, then place it back into the pink box, closing the lid.",
                    ACTION_PROMPT_EN: "Macro shot. Soft studio lighting. Hands display the metallic clasp of the watch, then place it back into the pink box, closing the lid.",
                    voice_description_en: "Calm, premium closing voice tone, leaving an evocative impression of ultimate prestige.",
                    dialogue_pt_br: "O fecho perfeito da alta joalharia. O seu novo padrão de luxo. Garanta o seu.",
                    creator_profile: "Gender: Female, Persona: Luxury Presenter, Energy: 65%, Pace: Slow"
                }
            ]
        });
        
        alert('Preset Cinematic Engine: Relógio de Luxo (Pink Box) aplicado com sucesso!');
    };

    const fileToBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(f);
    });

    const handleProductSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setProductFile(f);
            setProductPreview(URL.createObjectURL(f));
        }
    };

    const extractDetailsFromImage = async () => {
        if (!productFile) return alert("Envie uma imagem de referência do produto primeiro (ex: verso/traseira).");
        if (!currentKey) return alert("Configure a Chave API.");

        setExtractingDetails(true);
        try {
            const b64 = await fileToBase64(productFile);
            const prompt = "Analyze this product image. Extract ONLY the core physical traits needed for AI video consistency: exact material, main colors, distinct shape, and any highly visible text/logo. Return a VERY CONCISE comma-separated list in English (Maximum 30 words). NO markdown, NO paragraphs, NO titles.";
            
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: productFile.type, data: b64 } }] }]
            });
            
            const description = data.candidates[0].content.parts[0].text.trim();
            setProductDetails(prev => (prev ? prev + " | " : "") + description);
        } catch (e: any) {
            alert("Erro ao extrair detalhes: " + e.message);
        } finally {
            setExtractingDetails(false);
        }
    };

    const handleUploadedFile = async (f: File) => {
        if (f.size > 15 * 1024 * 1024) {
            alert("A imagem é muito pesada (Máx 15MB).");
            return;
        }

        setFile(f);
        setPreviewUrl(URL.createObjectURL(f));
        setResult(null); 
        
        if (currentKey) {
            setIsAnalyzingImage(true);
            try {
                const b64 = await fileToBase64(f);
                const prompt = `Analise esta imagem de produto para um comercial cinematográfico. 
                Retorne APENAS um objeto JSON válido com as chaves exatas (em letras minúsculas): 
                "product_name" (Nome descritivo e comercial curto em Português) e 
                "category" (Categoria geral em Português, ex: Eletrônicos, Moda, Beleza, Casa, Joias).
                NÃO use formatação markdown, apenas JSON puro.`;
                
                const data = await processGeminiAPI(currentKey, {
                    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: f.type || "image/jpeg", data: b64 } }] }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!responseText) {
                    console.warn("A IA não retornou texto na análise visual.");
                    return;
                }

                let parsed = safeJSONParse(responseText, null);

                // Fallback text parsing if JSON parsing returned null
                if (!parsed && responseText) {
                    const prodMatch = responseText.match(/(?:product_?name|produto|nome|product)\s*[:=]\s*["']?([^"'\n,}]+)["']?/i);
                    const catMatch = responseText.match(/(?:category|categoria|tipo)\s*[:=]\s*["']?([^"'\n,}]+)["']?/i);

                    if (prodMatch || catMatch) {
                        parsed = {
                            product_name: prodMatch ? prodMatch[1].trim() : "",
                            category: catMatch ? catMatch[1].trim() : ""
                        };
                    } else if (responseText.length > 0 && responseText.length < 100) {
                        parsed = {
                            product_name: responseText.trim().replace(/^["']|["']$/g, ''),
                            category: "Geral"
                        };
                    }
                }

                if (!parsed) {
                    console.warn("Auto-detecção da imagem não encontrou campos formatados:", responseText);
                    return;
                }
                
                if (Array.isArray(parsed)) parsed = parsed[0] || {};

                const normalizedJson = Object.keys(parsed).reduce((acc: any, key) => {
                    const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    acc[cleanKey] = parsed[key];
                    return acc;
                }, {});

                const prodName = normalizedJson.product_name || normalizedJson.productname || normalizedJson.produto || normalizedJson.nome || "";
                const cat = normalizedJson.category || normalizedJson.categoria || normalizedJson.tipo || "";

                if (prodName) setManualProductName(prodName);
                if (cat) setManualCategory(cat);
            } catch (err: any) {
                console.warn("Aviso na auto-detecção da imagem (preenchimento manual disponível):", err);
            } finally {
                setIsAnalyzingImage(false);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            handleUploadedFile(f);
        }
    };

    const generateCommercePrompt = async () => {
        if (!file && !manualProductName) {
            return alert("Selecione uma imagem do produto ou digite o nome manualmente.");
        }
        setLoading(true);
        try {
            const genResult = executeCommercePipeline({
                productName: manualProductName || 'Produto',
                category: manualCategory || 'Geral',
                productFile: file,
                productPreview: previewUrl,
                productDetails: productDetails || '',
                uiState: commerceUIState,
                currentKey
            });
            setCommerceResult(genResult);
        } catch (e: any) {
            alert("Erro ao gerar Commerce Demo Prompt: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExtractCommerceDetails = async () => {
        if (!currentKey || !file) {
            const smartDetails = "Acabamento de alta qualidade, geometria precisa e detalhes estruturais fieis à imagem de referência.";
            setProductDetails(smartDetails);
            return;
        }
        setExtractingDetails(true);
        try {
            const b64 = await fileToBase64(file);
            const prompt = "Analise a imagem do produto. Descreva em 1 ou 2 frases concisas (em português) seus materiais visíveis, acabamento, logos/gravações e detalhes essenciais de preservação.";
            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: b64 } }] }]
            });
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
                setProductDetails(text);
            }
        } catch (err) {
            console.warn("Auto-extração de detalhes:", err);
        } finally {
            setExtractingDetails(false);
        }
    };

    const generateAnimationPrompt = async () => {
        if (!file && !manualProductName) return alert("Selecione uma imagem do produto ou digite o nome manualmente.");
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        try {
            let b64 = null;
            if (file) {
                b64 = await fileToBase64(file);
            }

            const prompt = `
                Atue como um Especialista em Direção de Arte e Engenharia de Prompts para Animação de Produtos em IA (Runway Gen-2, Luma Dream Machine, Sora, Kling).
                Análise a imagem enviada do produto e crie uma direção de cena cinematicamente perfeita.

                PARÂMETROS DA ANIMAÇÃO DADOS PELO USUÁRIO:
                - Modelo de IA Alvo: ${aiTarget}
                - Estilo de Iluminação: ${lightingStyle}
                - Hook Visual / Ação Principal: ${visualHook}
                - Estilo de Mão/Modelo: ${handStyle}
                - Cenário/Background: ${scenario}
                - Direção de Animação/Movimento: ${actionStr}
                - Enquadramento da Câmera: ${cameraShot}
                - Movimento de Câmera: ${cameraMovement}
                ${showObjectLock && productDetails ? `- DETALHES DO PRODUTO (OBJECT LOCK): ${productDetails}` : ''}

                Sua missão é gerar um JSON estritamente válido contendo o prompt estruturado de animação em inglês (visual_en, action_en) e a locução em português (dialogue_pt_br).

                FORMATO DE SAÍDA ESPERADO (JSON APENAS):
                {
                  "product_name": "${manualProductName || 'Nome do Produto'}",
                  "category": "${manualCategory || 'Geral'}",
                  "emotion": "Desejo / Sofisticação",
                  "speed": "Cinemático Médio",
                  "camera": "${cameraShot} com ${cameraMovement}",
                  "lighting": "${lightingStyle}",
                  "duration": "5s",
                  "format": "vertical 9:16",
                  "target": "${aiTarget}",
                  "style": "Photorealistic 4K cinematic",
                  "mode": "${structureMode}",
                  "blocks": [
                    {
                      "scene": "Cena Principal",
                      "visual_en": "High-end commercial product shot. Describe product details, environment (${scenario}), lighting (${lightingStyle}), and subject (${handStyle}). Photorealistic 8k, studio lighting.",
                      "action_en": "Cinematic camera movement (${cameraMovement}). Describe smooth action (${actionStr}) and interaction (${visualHook}).",
                      "dialogue_pt_br": "Texto de locução envolvente em português do Brasil focado no produto."
                    }
                  ],
                  "negative_prompt": "morphed logos, hallucinated text, duplicate branding, warping geometry, deformed shapes, changing materials, flickering text, recreated product, background drift"
                }
            `;

            const requestParts: any[] = [{ text: prompt }];
            if (file && b64) {
                requestParts.push({ inlineData: { mimeType: file.type, data: b64 } });
            }

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: requestParts }],
                generationConfig: { responseMimeType: "application/json" }
            });

            let parsed = safeJSONParse(data.candidates[0].content.parts[0].text, null);
            if (!parsed) throw new Error("A IA não retornou um formato JSON válido.");

            // Enforce clean block mapping with ONLY four keys: scene, visual_en, action_en, dialogue_pt_br
            if (parsed.blocks && Array.isArray(parsed.blocks)) {
                parsed.blocks = parsed.blocks.map((block: any, idx: number) => {
                    const scene = block.scene || block.scene_name || `Scene ${idx + 1}`;
                    const visual_en = block.visual_en || block.visual_context_en || block.visual_prompt_en || "Sem descrição visual.";
                    const action_en = block.action_en || block.action_prompt_en || block.ACTION_PROMPT_EN || block.action_prompt || block.ACTION_PROMPT || block.actions_prompt_en || block.actions_en || block.action || block.actions || "Sem descrição de ação.";
                    const dialogue_pt_br = block.dialogue_pt_br || block.dialogue_pt || block.narration_pt_br || block.narration_pt || block.text || block.dialogue || "";

                    return {
                        scene,
                        visual_en,
                        action_en,
                        dialogue_pt_br
                    };
                });
            } else {
                const visual_en = parsed.visual_en || parsed.visual_context_en || "Sem descrição visual.";
                const action_en = parsed.action_en || parsed.action_prompt_en || parsed.ACTION_PROMPT_EN || parsed.actions_en || "";
                const dialogue_pt_br = parsed.dialogue_pt_br || parsed.dialogue_pt || "";
                parsed.blocks = [{
                    scene: "Single Scene",
                    visual_en,
                    action_en,
                    dialogue_pt_br
                }];
            }

            // Remove duplicated actions or metadata on root
            const redundantKeys = ['ACTION_PROMPT_EN', 'action_prompt_en', 'actions_en', 'action_prompt', 'ACTION_PROMPT', 'visual_context_en', 'visual_prompt_en'];
            redundantKeys.forEach(k => delete parsed[k]);

            setResult(parsed);
        } catch (e: any) {
            alert("Erro ao gerar animação: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const catLower = (manualCategory || "").toLowerCase();
    const nameLower = (manualProductName || "").toLowerCase();
    const isWatchCategory = catLower.includes("relo") || catLower.includes("watch") || catLower.includes("clock") || catLower.includes("joia") || catLower.includes("jewel") || nameLower.includes("relo") || nameLower.includes("watch") || nameLower.includes("joia") || nameLower.includes("clock");
    const isClothingCategory = catLower.includes("roupa") || catLower.includes("vestu") || catLower.includes("mod") || catLower.includes("cloth") || catLower.includes("fash") || nameLower.includes("roupa") || nameLower.includes("vestido") || nameLower.includes("shirt") || nameLower.includes("t-shirt");
    const isSpecificCategory = isWatchCategory || isClothingCategory;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
                <div className="inline-flex items-center gap-2 bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full text-xs font-bold border border-pink-500/20">
                    <LucideIcon name="video" className="w-3 h-3" /> IMAGE TO VIDEO ENGINE
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Cinematic Prompt Generator</h2>
                <p className="text-slate-400 max-w-2xl mx-auto align-middle">
                    Transforme imagens estáticas em prompts perfeitos para Runway, Veo ou Sora. Escolha o cenário, as mãos, a ação e a câmera, e a IA faz o resto.
                </p>
            </div>

            {/* Toast Notification */}
            {presetToast && (
                <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/35 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fade-in">
                    <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg">
                        <LucideIcon name="check-circle" className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-semibold font-sans">
                        {presetToast}
                    </div>
                </div>
            )}

            {/* Mode Selector */}
            <div className="mb-4">
                <CinematicModeSelector mode={cinematicMode} onSelectMode={setCinematicMode} />
            </div>

            {cinematicMode === 'commerce' ? (
                <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                    {/* Left Column: Commerce Inputs */}
                    <div className="space-y-4">
                        <ProductReferenceCard
                            productName={manualProductName}
                            setProductName={setManualProductName}
                            category={manualCategory}
                            setCategory={setManualCategory}
                            productFile={file}
                            productPreview={previewUrl}
                            productDetails={productDetails}
                            setProductDetails={setProductDetails}
                            onProductFileSelect={handleUploadedFile}
                            onProductClear={() => {
                                setFile(null);
                                setPreviewUrl('');
                                setCommerceResult(null);
                            }}
                            onExtractDetails={handleExtractCommerceDetails}
                            isExtractingDetails={extractingDetails}
                            isAnalyzingProduct={isAnalyzingImage}
                            productPasteFeedback={mainPasteFeedback}
                            productPasteError={mainPasteError}
                        />

                        <AvatarReferenceCard
                            avatarState={commerceUIState.avatar}
                            onAvatarChange={(updater) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    avatar: updater(prev.avatar)
                                }))
                            }
                        />

                        <AvatarWardrobeCard
                            avatarState={commerceUIState.avatar}
                            onAvatarChange={(updater) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    avatar: updater(prev.avatar)
                                }))
                            }
                        />

                        <EnvironmentCard
                            envState={commerceUIState.environment}
                            onEnvChange={(updater) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    environment: updater(prev.environment)
                                }))
                            }
                        />

                        <CommerceDemoStyleCard
                            demoFamily={commerceUIState.demoFamily}
                            onSelectFamily={(fam) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    demoFamily: fam
                                }))
                            }
                        />

                        <CameraMotionCard
                            cameraState={commerceUIState.camera}
                            onCameraChange={(updater) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    camera: updater(prev.camera)
                                }))
                            }
                        />

                        <DurationAudioCard
                            duration={commerceUIState.duration}
                            onDurationChange={(dur) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    duration: dur
                                }))
                            }
                            audioMode={commerceUIState.audioMode}
                            onAudioModeChange={(m) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    audioMode: m
                                }))
                            }
                            aspectRatio={commerceUIState.aspectRatio}
                            onAspectRatioChange={(ar) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    aspectRatio: ar
                                }))
                            }
                        />

                        <AdvancedStabilityCard
                            customNegative={commerceUIState.customNegative}
                            onCustomNegativeChange={(val) =>
                                setCommerceUIState((prev) => ({
                                    ...prev,
                                    customNegative: val
                                }))
                            }
                        />

                        <Button
                            onClick={generateCommercePrompt}
                            disabled={loading || isAnalyzingImage || (!file && !manualProductName)}
                            className="w-full mt-4 py-4 text-base bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-xl shadow-pink-500/20 font-bold cursor-pointer"
                            icon={loading ? 'loader-2' : 'sparkles'}
                        >
                            {loading ? 'Compilando Commerce Prompt...' : 'Gerar Commerce Demo Prompt'}
                        </Button>
                    </div>

                    {/* Right Column: Commerce Preview */}
                    <div>
                        {commerceResult ? (
                            <CommercePromptPreview
                                result={commerceResult}
                                aiTarget={aiTarget}
                            />
                        ) : (
                            <div className="glass-panel p-8 rounded-2xl border border-slate-800 h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-60 min-h-[460px] bg-slate-900/40 text-center">
                                <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
                                    <LucideIcon name="shopping-bag" className="w-12 h-12 animate-pulse" />
                                </div>
                                <div className="space-y-1 max-w-sm">
                                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                                        Commerce Demo V1 Pronto
                                    </h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Selecione uma imagem do produto e configure a estratégia visual (Macro, Unboxing, Wear, Lifestyle, Editorial ou UGC) para compilar o prompt cinemático estruturado.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* 🎬 Configuração Cinemática */}
                    <div className="bg-slate-900/80 border border-pink-500/20 rounded-xl p-5 shadow-xl space-y-5">
                <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <LucideIcon name="sliders" className="w-5 h-5 text-pink-400" />
                        Configuração Cinemática
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Monte o prompt com controle de mãos, câmera, ambiente, iluminação e IA alvo.
                    </p>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <label className="flex items-center justify-between cursor-pointer p-1">
                        <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                            <LucideIcon name="wand-2" className="w-3.5 h-3.5 text-pink-400" />
                            Auto adaptar ao produto
                        </span>
                        <input 
                            type="checkbox"
                            checked={autoAdaptProduct}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setAutoAdaptProduct(checked);
                                if (checked && manualCategory) {
                                    autoAdaptToCategory(manualCategory);
                                }
                            }}
                            className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                        />
                    </label>


                </div>

                {/* Grid of Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">
                    {/* 1. IA Alvo */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="cpu" className="w-3 h-3 text-pink-400" /> IA Alvo
                        </label>
                        <select
                            value={aiTarget}
                            onChange={(e) => setAiTarget(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="runway">Runway Gen-3 Alpha</option>
                            <option value="luma">Luma Dream Machine</option>
                            <option value="sora">OpenAI Sora</option>
                            <option value="veo">Google Veo 2</option>
                            <option value="kling">Kling 1.5</option>
                            <option value="pika">Pika Labs 2.0</option>
                            <option value="auto">Automático (Melhor para o produto)</option>
                        </select>
                    </div>

                    {/* 2. Categoria do Produto */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="bookmark" className="w-3 h-3 text-pink-400" /> Categoria do Produto
                        </label>
                        <input
                            type="text"
                            value={manualCategory}
                            onChange={(e) => {
                                const cat = e.target.value;
                                setManualCategory(cat);
                                if (autoAdaptProduct) {
                                    autoAdaptToCategory(cat);
                                }
                            }}
                            placeholder="Ex: Relógio de Luxo, Moda, Cosmético"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none"
                        />
                    </div>

                    {/* 3. Estilo de Mãos */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="hand" className="w-3 h-3 text-pink-400" /> Estilo de Mãos
                        </label>
                        <select
                            value={handStyle}
                            onChange={(e) => setHandStyle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            {handOptions.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Ação das Mãos */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="play-circle" className="w-3 h-3 text-pink-400" /> Ação das Mãos
                        </label>
                        <select
                            value={actionStr}
                            onChange={(e) => setActionStr(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            {actionOptions.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 5. Superfície / Ambiente */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="map-pin" className="w-3 h-3 text-pink-400" /> Superfície / Ambiente
                        </label>
                        <select
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            {scenarioOptions.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 6. Iluminação */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="sun" className="w-3 h-3 text-pink-400" /> Iluminação
                        </label>
                        <select
                            value={lightingStyle}
                            onChange={(e) => setLightingStyle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="soft_commercial">Iluminação de Estúdio Suave (Soft Commercial)</option>
                            <option value="high_contrast_dramatic">Cinematográfica Dramática (High Contrast)</option>
                            <option value="golden_hour">Luz Natural Golden Hour</option>
                            <option value="neon_cyberpunk">Brilho Neon Cyberpunk</option>
                            <option value="luxury_spotlight">Spotlight de Luxo Acolhedor</option>
                            <option value="bright_softbox">Estúdio Bright Softbox</option>
                        </select>
                    </div>

                    {/* 7. Ângulo de Câmera */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="camera" className="w-3 h-3 text-pink-400" /> Ângulo de Câmera
                        </label>
                        <select
                            value={cameraShot}
                            onChange={(e) => setCameraShot(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            {cameraShotsOptions.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 8. Estilo de Vídeo */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="layers" className="w-3 h-3 text-pink-400" /> Estilo de Vídeo
                        </label>
                        <select
                            value={structureMode}
                            onChange={(e) => setStructureMode(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="single_scene">Cena Única (Cinematic Padrão)</option>
                            <option value="viral_hook">Gancho Viral TikTok (4 Cenas Rápidas)</option>
                            <option value="fashion_conversion">Conversão de Moda (4 Cenas de Look)</option>
                            <option value="beauty_proof">Prova de Beleza (Antes/Depois)</option>
                            <option value="tech_demo">Tech Demo (Gadgets/Eletrônicos)</option>
                            <option value="problem_solution">Problema e Solução (Limpeza/Utilidades)</option>
                        </select>
                    </div>

                    {/* 9. Gancho Visual */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                            <LucideIcon name="zap" className="w-3 h-3 text-pink-400" /> Gancho Visual
                        </label>
                        <select
                            value={visualHook}
                            onChange={(e) => setVisualHook(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="reveal_360">Revelação 360º com Reflexo Premium</option>
                            <option value="luxury_unboxing">Abertura / Unboxing de Estojo de Luxo</option>
                            <option value="macro_hands">Mãos Apresentando em Macro Close-up</option>
                            <option value="water_splash">Mergulho em Água / Resiliência em Ação</option>
                            <option value="ugc_demo">UGC Autêntico - Demonstração para Câmera</option>
                            <option value="problem_solution">Problema do Cotidiano -&gt; Solução Impecável</option>
                            <option value="auto">Automático (IA Decide)</option>
                        </select>
                    </div>
                </div>

                {/* Primary Button */}
                <div className="pt-2">
                    <Button 
                        onClick={generateAnimationPrompt} 
                        disabled={loading || isAnalyzingImage || (!file && !manualProductName)} 
                        className="w-full py-3.5 text-base font-bold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-xl shadow-pink-500/20 cursor-pointer" 
                        icon={loading ? "loader-2" : "clapperboard"}
                    >
                        {loading ? "A Gerar Direção de Arte..." : "Gerar Prompt Cinemático"}
                    </Button>
                </div>

                {/* Presets de Categoria Específicos */}
                <div className="pt-3 border-t border-slate-800/60">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setShowSpecificPresets(!showSpecificPresets)}
                            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-wider cursor-pointer"
                        >
                            <LucideIcon name={showSpecificPresets ? "chevron-down" : "chevron-right"} className="w-3.5 h-3.5 text-pink-400" />
                            <span>Presets de Categoria Específicos {(isSpecificCategory) && <span className="text-[10px] text-emerald-400 font-medium lowercase tracking-normal">(auto-expandido por categoria detectada)</span>}</span>
                        </button>
                    </div>

                    {(showSpecificPresets || isSpecificCategory) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 animate-fade-in">
                            <div 
                                onClick={applyFashionShowcasePreset}
                                className="group relative bg-slate-950 border border-slate-850 hover:border-pink-500/50 p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-900/30 flex items-start gap-3 shadow-md"
                            >
                                <div className="bg-pink-500/10 text-pink-400 p-2.5 rounded-lg group-hover:scale-110 transition-transform">
                                    <LucideIcon name="shirt" className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors">Fashion Showcase Photography</h4>
                                        <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-bold">ESPECÍFICO MODA</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                                        Ative a composição ultra-realista 9:16 com manequim em loja de luxo, fundo desfocado de roupas e interação de mãos masculinas realistas.
                                    </p>
                                </div>
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-pink-500 text-[10px] font-bold flex items-center gap-0.5">
                                    Aplicar <LucideIcon name="chevron-right" className="w-3 h-3" />
                                </div>
                            </div>

                            <div 
                                onClick={applyCinematicWatchPreset}
                                className="group relative bg-slate-950 border border-slate-850 hover:border-pink-500/50 p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-900/30 flex items-start gap-3 shadow-md"
                            >
                                <div className="bg-pink-500/10 text-pink-400 p-2.5 rounded-lg group-hover:scale-110 transition-transform">
                                    <LucideIcon name="gem" className="w-4 h-4 text-pink-400" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-white group-hover:text-pink-400 transition-colors font-sans">Cinematic Watch Box</h4>
                                        <span className="text-[8px] bg-pink-500/10 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded-full font-bold">ESPECÍFICO RELÓGIOS</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                                        Estúdio rosa soft, abertura de estojo de joias, mergulho em água em luz natural brilhante e relógio brilhando no escuro no pulso.
                                    </p>
                                </div>
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-pink-500 text-[10px] font-bold flex items-center gap-0.5">
                                    Aplicar <LucideIcon name="chevron-right" className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div onClick={() => !isAnalyzingImage && fileInputRef.current?.click()} className={`relative group border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${file || previewUrl ? 'border-pink-500 bg-pink-500/5' : 'border-slate-700 hover:border-pink-400 hover:bg-slate-800'} ${isAnalyzingImage ? 'opacity-70 pointer-events-none' : ''}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                        {!file && !previewUrl ? (
                            <div className="py-8 pointer-events-none">
                                <LucideIcon name="image-plus" className="w-10 h-10 mx-auto mb-2 text-slate-500 group-hover:text-pink-400 transition-colors" />
                                <p className="text-sm text-slate-300 font-medium font-sans">Upload da Imagem do Produto</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                    Upload, arraste ou pressione Ctrl+V para colar imagem
                                </p>
                                {mainPasteError && (
                                    <p className="text-[10px] text-red-400 mt-1 leading-tight">
                                        {mainPasteError}
                                    </p>
                                )}
                                {mainPasteFeedback && (
                                    <p className="text-[10px] text-emerald-450 mt-1 leading-tight animate-fade-in">
                                        ✓ {mainPasteFeedback.message} ({mainPasteFeedback.name} - {mainPasteFeedback.size})
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <img src={previewUrl || undefined} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-md" />
                                {isAnalyzingImage && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-10">
                                        <LucideIcon name="scan-eye" className="w-8 h-8 text-pink-400 mb-2 animate-pulse" />
                                        <span className="text-[10px] font-bold text-pink-300 font-sans">Analisando produto...</span>
                                    </div>
                                )}
                                {!file && previewUrl && (
                                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm border border-red-500/20 p-2 text-center z-10">
                                        <LucideIcon name="alert-triangle" className="w-5 h-5 text-rose-500 mb-1 animate-pulse" />
                                        <span className="text-[10px] font-bold text-rose-450 font-sans">Arquivo precisa ser reenviado por segurança.</span>
                                        <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="mt-2 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-705 cursor-pointer font-bold font-sans uppercase">Reenviar Imagem</button>
                                    </div>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(''); setResult(null); setManualProductName(''); setManualCategory(''); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors z-20 cursor-pointer"><LucideIcon name="x" className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-5 rounded-2xl border border-pink-500/15 space-y-4 bg-slate-900/60 shadow-xl shadow-slate-950/40 transition-all duration-300 hover:border-pink-500/25 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="tag" className="w-3 h-3" /> Nome do Produto</label>
                                <div className="relative">
                                    <input type="text" value={manualProductName} onChange={(e) => setManualProductName(e.target.value)} disabled={isAnalyzingImage} placeholder="Ex: Relógio Smartwatch X" className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none ${isAnalyzingImage ? 'opacity-50' : ''}`} />
                                    {isAnalyzingImage && <LucideIcon name="loader-2" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 animate-spin" />}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="bookmark" className="w-3 h-3" /> Categoria</label>
                                <div className="relative">
                                    <input type="text" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} disabled={isAnalyzingImage} placeholder="Ex: Gadget" className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none ${isAnalyzingImage ? 'opacity-50' : ''}`} />
                                    {isAnalyzingImage && <LucideIcon name="loader-2" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 animate-spin" />}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <LucideIcon name="sparkles" className="w-3 h-3 text-pink-400" /> Categoria do Preset (Preset Style Category)
                            </label>
                            <div className="relative">
                                <select 
                                    value={presetCategory} 
                                    onChange={(e) => {
                                        const cat = e.target.value;
                                        setPresetCategory(cat);
                                        if (cat === 'luxury_fashion') {
                                            setManualCategory('Moda de Luxo (Luxury Fashion)');
                                            setStructureMode('fashion_conversion');
                                            setHandStyle('A masculine hand with realistic skin texture and detailed tattoos visible interacting naturally with the mannequin, one hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction');
                                            setBgStrategy('replace');
                                            setScenario('Ultra-realistic fashion showcase photography, vertical 9:16, 8k resolution, cinematic lighting, high detail, professional retail environment. The scene takes place inside a luxury clothing store with warm ambient lighting, polished marble floor, and elegant wooden wall panels. Clothing racks with neatly arranged garments are softly blurred in the background, creating depth. A matte black mannequin is centered in the frame, standing upright and facing forward. The mannequin is wearing the clothing from the reference image. The clothing must be EXACTLY identical to the reference image in every aspect: same color, print, texture, proportions, stitching and all design details. No modifications, no reinterpretation, no stylization, no added or removed elements. A masculine hand with realistic skin texture and detailed tattoos is visible interacting naturally with the mannequin, one hand resting on the shoulder and the other lightly adjusting the lower part of the clothing, adding a sense of realism and human interaction. The clothing occupies around 60–70% of the frame, with natural fabric draping and subtle folds. Soft directional lighting enhances texture and depth without harsh shadows. Clean composition, centered framing, slight depth of field keeping the clothing sharp while softly blurring the background. No text, no interface elements, no logos or overlays. Professional, realistic, high-end fashion presentation style');
                                            setCameraShot('medium shot (MS) showing key details and full silhouette');
                                        } else if (cat === 'streetwear') {
                                            setManualCategory('Streetwear / Moda Urbana');
                                            setStructureMode('viral_hook');
                                            setHandStyle('Hands with urban streetwear tattoos');
                                            setBgStrategy('similar_env');
                                            setScenario('vibrant monochromatic hot pink studio background with professional dramatic lighting and seamless backdrop');
                                            setCameraShot('close-up shot (CU) focusing on intricate details and textures');
                                        } else if (cat === 'minimalist') {
                                            setManualCategory('Minimalista / Design');
                                            setStructureMode('single_scene');
                                            setHandStyle('optimal subject/avatar chosen by AI');
                                            setBgStrategy('white');
                                            setScenario('Professional e-commerce pure white seamless background');
                                            setCameraShot('extreme close-up shot (ECU) focusing on fine textures');
                                        }
                                    }} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none font-sans"
                                >
                                    <option value="none">Nenhum / Padrão Geral (None / Standard)</option>
                                    <option value="luxury_fashion">✨ Luxury Fashion (Moda de Luxo / Fotografia de Vitrine)</option>
                                    <option value="streetwear">🔥 Streetwear (Moda Urbana & Atitude)</option>
                                    <option value="minimalist">🍃 Minimalist (Visual Limpo & Foco no Produto)</option>
                                </select>
                                <LucideIcon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1 leading-normal font-sans">
                                Ajusta automaticamente a direção de arte da cena, influenciando o tom da narração e o foco visual da inteligência artificial.
                            </p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="layers" className="w-3 h-3" /> Estrutura do Vídeo</label>
                            <div className="relative">
                                <select value={structureMode} onChange={(e) => setStructureMode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none">
                                    <option value="single_scene">Cena Única (Cinematic Padrão)</option>
                                    <option value="viral_hook">Gancho Viral TikTok (4 Cenas Rápidas)</option>
                                    <option value="fashion_conversion">Conversão de Moda (4 Cenas de Look)</option>
                                    <option value="beauty_proof">Prova de Beleza (Antes/Depois)</option>
                                    <option value="tech_demo">Tech Demo (Gadgets/Eletrônicos)</option>
                                    <option value="problem_solution">Problema e Solução (Limpeza/Utilidades)</option>
                                </select>
                                <LucideIcon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="hand" className="w-3 h-3" /> Estilo da Mão / Avatar</label>
                            <select 
                                value={handStyle} 
                                onChange={(e) => {
                                    const newStyle = e.target.value;
                                    setHandStyle(newStyle);
                                    if (['custom_suit_man', 'subject_adapted_color'].includes(newStyle)) {
                                        const matchedTheme = THEME_COLORS.find(c => c.value === suitColor);
                                        if (matchedTheme) setScenario(matchedTheme.scenario);
                                    }
                                }} 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none font-sans"
                            >
                                {handOptions.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                            </select>
                            
                            {['custom_suit_man', 'subject_adapted_color'].includes(handStyle) && (
                                <div className="mt-2 animate-fade-in p-2.5 bg-pink-500/10 border border-pink-500/30 rounded-lg shadow-inner">
                                    <label className="text-[10px] font-bold text-pink-400 uppercase mb-1 flex items-center gap-1">Cor do Tema</label>
                                    <div className="relative">
                                        <select
                                            value={suitColor}
                                            onChange={(e) => {
                                                const newColor = e.target.value;
                                                setSuitColor(newColor);
                                                const matchedTheme = THEME_COLORS.find(c => c.value === newColor);
                                                if (matchedTheme) setScenario(matchedTheme.scenario);
                                            }}
                                            className="w-full bg-slate-950 border border-pink-500/50 rounded px-3 py-2 text-xs text-white focus:border-pink-400 outline-none appearance-none"
                                        >
                                            {THEME_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                        </select>
                                        <LucideIcon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="map-pin" className="w-3 h-3" /> Cenário / Ambiente</label>
                            {bgStrategy === 'similar_env' ? (
                                <textarea
                                    value={scenario}
                                    onChange={(e) => setScenario(e.target.value)}
                                    rows={4}
                                    className="w-full bg-slate-900 border border-slate-705 rounded-lg p-2.5 text-xs text-white focus:border-pink-500 outline-none font-sans leading-relaxed custom-scrollbar shadow-inner"
                                    placeholder="Enter your custom Ambient Match DNA or generated Similar Environment prompt here..."
                                />
                            ) : (
                                <select 
                                    value={scenario} 
                                    onChange={(e) => {
                                        const newScenario = e.target.value;
                                        setScenario(newScenario);
                                        const matchedTheme = THEME_COLORS.find(c => c.scenario === newScenario);
                                        if (matchedTheme && ['custom_suit_man', 'subject_adapted_color'].includes(handStyle)) {
                                            setSuitColor(matchedTheme.value);
                                        }
                                    }} 
                                    className="w-full bg-slate-900 border border-slate-707 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none"
                                >
                                    {scenarioOptions.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <LucideIcon name="sliders" className="w-3 h-3" /> Estratégia de Fundo (Background Strategy)
                            </label>
                            <select 
                                value={bgStrategy} 
                                onChange={(e) => setBgStrategy(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none font-sans"
                            >
                                <option value="auto">Automático (Automatic / Smart Backdrop)</option>
                                <option value="similar_env">🔄 Similar Environment from Frame (Ambient Match AI)</option>
                                <option value="preserve">Preservar Ambiente Original (Preserve Original Environment)</option>
                                <option value="replace">Substituir Fundo (Replace Background)</option>
                                <option value="white">Estúdio Branco Puro (Pure Studio White - seamless cyclorama)</option>
                                <option value="black">Estúdio Preto de Luxo (Luxury Black Studio)</option>
                                <option value="transparent_stage font-sans">Palco de Produto Transparente (Transparent Product Stage)</option>
                                <option value="gradient opacity-90">Estúdio Gradiente Suave (Soft Gradient Studio)</option>
                            </select>

                            {bgStrategy === 'similar_env' && (
                                <div className="mt-2.5 space-y-2 animate-fade-in">
                                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-md p-2 space-y-1">
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[9px] font-sans">
                                            <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                            <span>Product Accuracy Lock: ACTIVATED</span>
                                        </div>
                                        <p className="text-[8px] text-emerald-300/90 leading-relaxed font-sans">
                                            The generative model is instructed to preserve product details (shape, text, colors, labels) while remodeling only the background.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="play-circle" className="w-3 h-3" /> Ação / Movimento Principal</label>
                            <select value={actionStr} onChange={(e) => setActionStr(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none">
                                {actionOptions.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="camera" className="w-3 h-3" /> Plano de Câmera</label>
                                <select value={cameraShot} onChange={(e) => setCameraShot(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none">
                                    {cameraShotsOptions.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><LucideIcon name="move" className="w-3 h-3" /> Mov. de Câmera</label>
                                <select value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-pink-500 outline-none appearance-none">
                                    {cameraMovementsOptions.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Object Lock section */}
                    <div className="object-lock-area bg-slate-800/50 p-5 rounded-xl border border-yellow-500/20 animate-fade-in shadow-inner relative overflow-hidden mt-4">
                        <div className="flex justify-between items-start mb-2 relative z-10 cursor-pointer" onClick={() => setShowObjectLock(!showObjectLock)}>
                            <div>
                                <label className="text-sm font-bold text-yellow-400 uppercase flex items-center gap-2 mb-1 bg-transparent">
                                    <LucideIcon name="box" className="w-4 h-4" /> Trava de Objeto (Object Lock 360º)
                                </label>
                                <p className="text-[10px] text-slate-400 max-w-md">Resolva problemas de "alucinação" quando o produto gira ou muda de ângulo.</p>
                            </div>
                            <LucideIcon name={showObjectLock ? "chevron-up" : "chevron-down"} className="w-5 h-5 text-slate-500" />
                        </div>

                        {showObjectLock && (
                            <div className="mt-4 space-y-4 animate-fade-in border-t border-slate-700 pt-4">
                                <p className="text-[10px] text-slate-500 mb-1 font-sans">
                                    Upload, arraste ou pressione Ctrl+V para colar imagem
                                </p>
                                {objectPasteError && (
                                    <p className="text-[10px] text-red-400 mb-1 leading-tight">
                                        {objectPasteError}
                                    </p>
                                )}
                                {objectPasteFeedback && (
                                    <p className="text-[10px] text-emerald-450 mb-1 leading-tight animate-fade-in">
                                        ✓ {objectPasteFeedback.message} ({objectPasteFeedback.name} - {objectPasteFeedback.size})
                                    </p>
                                )}
                                <div className="flex gap-4">
                                    <div onClick={() => productInputRef.current?.click()} className={`relative group w-24 h-24 flex-shrink-0 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${productFile ? 'border-yellow-500 bg-yellow-500/10' : 'border-slate-600 hover:border-yellow-400 hover:bg-slate-700'}`}>
                                        <input type="file" ref={productInputRef} onChange={handleProductSelect} accept="image/*" className="hidden" />
                                        {productPreview ? (
                                            <>
                                                <img src={productPreview} className="w-full h-full object-cover rounded-md" />
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setProductFile(null);
                                                        setProductPreview('');
                                                        if (productInputRef.current) productInputRef.current.value = '';
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md hover:scale-105 transition-all z-20 cursor-pointer"
                                                    title="Excluir imagem"
                                                >
                                                    <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <LucideIcon name="image-plus" className="w-6 h-6 text-slate-400 mb-1" />
                                                <span className="text-[8px] text-slate-400 text-center font-bold">Foto Ref.<br/>(Ex: Verso)</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Detalhes Técnicos / Ocultos</label>
                                            <div className="flex items-center gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={extractDetailsFromImage} 
                                                    disabled={extractingDetails || !productFile}
                                                    className="text-[10px] bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    {extractingDetails ? <LucideIcon name="loader-2" className="w-3 h-3 animate-spin" /> : <LucideIcon name="sparkles" className="w-3 h-3" />}
                                                    Extrair da Imagem
                                                </button>
                                                {(productPreview || productDetails) && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm("Deseja realmente limpar todos os dados da Trava de Objeto?")) {
                                                                setProductFile(null);
                                                    setProductPreview('');
                                                                setProductDetails('');
                                                                if (productInputRef.current) productInputRef.current.value = '';
                                                            }
                                                        }}
                                                        className="text-[10px] bg-red-950/40 hover:bg-red-950/70 border border-red-500/30 text-red-400 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
                                                        title="Excluir toda a trava de objeto"
                                                    >
                                                        <LucideIcon name="trash-2" className="w-3 h-3 text-red-400" />
                                                        Excluir
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <textarea 
                                            value={productDetails} 
                                            onChange={(e) => setProductDetails(e.target.value)} 
                                            placeholder="Descreva o que a IA não vê na foto principal (ex: logo prata nas costas)..." 
                                            className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-yellow-500 outline-none resize-none custom-scrollbar"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>



                    <Button onClick={generateAnimationPrompt} disabled={loading || isAnalyzingImage || (!file && !manualProductName)} className="w-full mt-6 py-4 text-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-xl shadow-pink-500/20" icon={loading ? "loader-2" : "clapperboard"}>
                        {loading ? "A Gerar Direção de Arte..." : "Gerar Prompt de Animação"}
                    </Button>
                </div>

                {/* Right Column Result */}
                <div className="glass-panel p-6 rounded-xl border border-slate-700 h-full flex flex-col bg-slate-900/40">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                        <LucideIcon name="terminal" className="w-4 h-4 text-pink-400" />
                        Prompt Preview (Professional Consistency Lock)
                    </h3>
                    
                    {!result ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50 min-h-[300px]">
                            <LucideIcon name="film" className="w-16 h-16 animate-pulse" />
                            <p className="text-sm text-center px-4 font-sans">Faça o upload do produto, escolha as definições e clique em Gerar.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in flex-1 overflow-y-auto custom-scrollbar pr-2 md:max-h-[720px]">
                            
                            {result.product_name && (
                                <div className="flex flex-wrap gap-2 mb-2 bg-slate-900 p-3 rounded-lg border border-slate-700">
                                    <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="box" className="w-3 h-3 text-pink-400" /> {result.product_name}</span>
                                    <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="tag" className="w-3 h-3 text-purple-400" /> {result.category}</span>
                                    {result.emotion && <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="heart" className="w-3 h-3 text-red-400" /> {result.emotion}</span>}
                                    {result.speed && <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="gauge" className="w-3 h-3 text-orange-400" /> {result.speed}</span>}
                                    {result.camera && <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="camera" className="w-3 h-3 text-blue-400" /> {result.camera}</span>}
                                    {result.lighting && <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="sun" className="w-3 h-3 text-yellow-400" /> {result.lighting}</span>}
                                    <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="clock" className="w-3 h-3 text-indigo-400" /> {result.duration}</span>
                                    <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded flex items-center gap-1 border border-slate-600"><LucideIcon name="smartphone" className="w-3 h-3 text-emerald-400" /> {result.format}</span>
                                </div>
                            )}

                            {/* 🧬 Viral Structure Preserved Card */}
                            {(result._meta?.adaptation_mode === 'preservar_viral' || result.hook_dna) && (
                                <div className="border border-purple-500/30 rounded-xl bg-purple-950/10 p-4 space-y-3 shadow-md border-l-4 border-l-purple-500">
                                    <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2">
                                        <LucideIcon name="dna" className="w-5 h-5 text-purple-400" />
                                        <span className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1">🧬 Viral Structure Preserved</span>
                                    </div>
                                    <div className="space-y-3 font-sans">
                                        {result.hook_dna && (
                                            <div>
                                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Hook DNA</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">
                                                    {typeof result.hook_dna === 'object' && result.hook_dna !== null ? JSON.stringify(result.hook_dna, null, 2) : String(result.hook_dna)}
                                                </p>
                                            </div>
                                        )}
                                        {result.conversion_dna && (
                                            <div>
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Conversion DNA</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">
                                                    {typeof result.conversion_dna === 'object' && result.conversion_dna !== null ? JSON.stringify(result.conversion_dna, null, 2) : String(result.conversion_dna)}
                                                </p>
                                            </div>
                                        )}
                                        {result.visual_dna && (
                                            <div>
                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Visual DNA</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">
                                                    {typeof result.visual_dna === 'object' && result.visual_dna !== null ? JSON.stringify(result.visual_dna, null, 2) : String(result.visual_dna)}
                                                </p>
                                            </div>
                                        )}
                                        {result.voice_dna && (
                                            <div>
                                                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">Voice DNA</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">
                                                    {typeof result.voice_dna === 'object' && result.voice_dna !== null ? JSON.stringify(result.voice_dna, null, 2) : String(result.voice_dna)}
                                                </p>
                                            </div>
                                        )}
                                        {result.cta_dna && (
                                            <div>
                                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">CTA DNA</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">
                                                    {typeof result.cta_dna === 'object' && result.cta_dna !== null ? JSON.stringify(result.cta_dna, null, 2) : String(result.cta_dna)}
                                                </p>
                                            </div>
                                        )}
                                        {result.adaptation_summary && (
                                            <div>
                                                <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-wider block">Adaptation Summary</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">
                                                    {typeof result.adaptation_summary === 'object' && result.adaptation_summary !== null ? JSON.stringify(result.adaptation_summary, null, 2) : String(result.adaptation_summary)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 🎚 Remodeling Summary Card */}
                            {(result.remodeling_intensity !== undefined || result.what_preserved || result.what_changed || result.similarity_risk) && (
                                <div className="border border-pink-500/30 rounded-xl bg-pink-950/10 p-4 space-y-3 shadow-md border-l-4 border-l-pink-500 font-sans">
                                    <div className="flex items-center gap-2 border-b border-pink-500/20 pb-2">
                                        <LucideIcon name="sliders" className="w-5 h-5 text-pink-400" />
                                        <span className="text-sm font-bold text-white uppercase tracking-wider font-sans flex items-center justify-between w-full">
                                            <span>🎚 Remodeling Summary</span>
                                            {result.remodeling_intensity !== undefined && (
                                                <span className="text-xs font-bold text-pink-400 font-mono bg-pink-950/80 px-2 py-0.5 rounded border border-pink-500/20">
                                                    {result.remodeling_intensity}%
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="space-y-3 font-sans">
                                        {((result.new_product_adaptation_summary) || (result._meta?.new_product_adaptation_summary)) && (() => {
                                            const summary = result.new_product_adaptation_summary || result._meta?.new_product_adaptation_summary;
                                            return (
                                                <div className="bg-slate-950/60 border border-purple-500/30 rounded-xl p-3.5 space-y-2.5 mt-1">
                                                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block flex items-center gap-1.5">
                                                        <LucideIcon name="target" className="w-3.5 h-3.5 text-purple-400" />
                                                        🎯 Produto Adaptado
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs leading-normal">
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Nome do Produto</span>
                                                            <span className="text-slate-100 font-semibold">{summary.name || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Público-Alvo</span>
                                                            <span className="text-slate-100 font-semibold">{summary.target_audience || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Plataforma</span>
                                                            <span className="text-slate-100 font-semibold font-mono">{summary.platform || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Principal Benefício</span>
                                                            <span className="text-slate-100 font-semibold">{summary.main_benefit || "N/A"}</span>
                                                        </div>
                                                        <div className="sm:col-span-2 border-t border-slate-800/60 pt-2 mt-1">
                                                            <span className="text-[9px] text-purple-400 font-bold uppercase block tracking-wide">Estratégia do CTA (CTA Strategy)</span>
                                                            <span className="text-purple-300 font-medium italic bg-purple-950/30 px-3 py-2 rounded-lg border border-purple-500/20 block mt-1 leading-relaxed">{summary.cta_strategy || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* 🎯 Platform Adaptation Report */}
                                        {((result.platform_adaptation_report) || (result._meta?.platform_adaptation_report)) && (() => {
                                            const report = result.platform_adaptation_report || result._meta?.platform_adaptation_report;
                                            return (
                                                <div className="bg-slate-950/60 border border-pink-500/30 rounded-xl p-3.5 space-y-2.5 mt-2">
                                                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block flex items-center gap-1.5 border-b border-slate-800 pb-2">
                                                        <LucideIcon name="smartphone" className="w-3.5 h-3.5 text-pink-400" />
                                                        🎯 Platform Adaptation Report
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs leading-normal">
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Platform Selected</span>
                                                            <span className="text-pink-300 font-semibold font-sans">{report.platform_selected || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Recommended Duration</span>
                                                            <span className="text-white font-semibold font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] inline-block">{report.recommended_duration || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Voice Style</span>
                                                            <span className="text-slate-100 font-medium">{report.voice_style || "N/A"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-wide">Recommended Pacing</span>
                                                            <span className="text-slate-100 font-medium">{report.recommended_pacing || "N/A"}</span>
                                                        </div>
                                                        <div className="sm:col-span-2 border-t border-slate-800/60 pt-2.5">
                                                            <span className="text-[9px] text-pink-400 font-bold uppercase block tracking-wide mb-1">Hook Strategy</span>
                                                            <p className="text-slate-200 font-medium bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800/80 leading-relaxed text-[11px]">{report.hook_strategy || "N/A"}</p>
                                                        </div>
                                                        <div className="sm:col-span-2 border-t border-slate-800/60 pt-2.5">
                                                            <span className="text-[9px] text-purple-400 font-bold uppercase block tracking-wide mb-1">CTA Strategy</span>
                                                            <p className="text-slate-200 font-medium bg-purple-950/20 px-3 py-2 rounded-lg border border-purple-500/10 leading-relaxed text-[11px] italic">"{report.cta_strategy || "N/A"}"</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {result.what_preserved && (
                                            <div>
                                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">O que foi preservado (What was preserved)</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">{result.what_preserved}</p>
                                            </div>
                                        )}
                                        {result.what_changed && (
                                            <div>
                                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">O que foi alterado (What was changed)</span>
                                                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded border border-slate-800 leading-normal mt-1">{result.what_changed}</p>
                                            </div>
                                        )}

                                        {/* ELEMENTOS PRESERVADOS Badge list */}
                                        {((result.preserved_elements_list && result.preserved_elements_list.length > 0) || (result._meta?.preserve_elements && result._meta.preserve_elements.length > 0)) && (
                                            <div>
                                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">ELEMENTOS PRESERVADOS</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {(result.preserved_elements_list && result.preserved_elements_list.length > 0 
                                                        ? result.preserved_elements_list 
                                                        : (result._meta?.preserve_elements || [])
                                                    ).map((el: string) => (
                                                        <span key={el} className="text-[9px] font-medium font-sans bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                            {el}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ELEMENTOS REMODELADOS Badge list */}
                                        {((result.remodeled_elements_list && result.remodeled_elements_list.length > 0) || (result._meta?.remodeled_elements && result._meta.remodeled_elements.length > 0)) && (
                                            <div>
                                                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">ELEMENTOS REMODELADOS</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {(result.remodeled_elements_list && result.remodeled_elements_list.length > 0 
                                                        ? result.remodeled_elements_list 
                                                        : (result._meta?.remodeled_elements || [])
                                                    ).map((el: string) => (
                                                        <span key={el} className="text-[9px] font-medium font-sans bg-pink-500/10 text-pink-300 border border-pink-500/20 px-2.5 py-1 rounded-md flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                                                            {el}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {result.similarity_risk && (
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risco de similaridade ao original (Risk of similarity)</span>
                                                <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider text-center max-w-[100px] ${
                                                        result.similarity_risk.toLowerCase() === 'high' 
                                                            ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                                                            : result.similarity_risk.toLowerCase() === 'medium' 
                                                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' 
                                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    }`}>
                                                        {result.similarity_risk}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 leading-tight">
                                                        {result.similarity_risk.toLowerCase() === 'high' 
                                                            ? 'Atenção: Alta proximidade com a estrutura, ganchos e cenas originais.' 
                                                            : result.similarity_risk.toLowerCase() === 'medium' 
                                                            ? 'Equilibrado: Ajustado de forma inteligente para novo contexto.' 
                                                            : 'Excelente: Alta originalidade visual e narrativa diferenciada.'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}



                            {/* COLLAPSIBLE ACCORDION FOR PROMPT PREVIEWS */}
                            <div className="space-y-3 font-sans">
                                
                                {/* 1. Visual Prompt (Collapsible) */}
                                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/25">
                                    <button 
                                        type="button" 
                                        onClick={() => setVisualOpen(!visualOpen)} 
                                        className="w-full flex items-center justify-between p-4 bg-slate-900/60 transition hover:bg-slate-900 text-left border-b border-transparent hover:border-slate-800"
                                    >
                                        <div className="flex items-center gap-2">
                                            <LucideIcon name="eye" className="w-4 h-4 text-pink-400" />
                                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans">Visual Prompt</span>
                                        </div>
                                        <LucideIcon name={visualOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-slate-400" />
                                    </button>
                                    {visualOpen && (
                                        <div className="p-4 space-y-4 animate-fade-in bg-black/20 max-h-96 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-4">
                                                {result.blocks?.map((block: any, idx: number) => (
                                                    <div key={idx} className="bg-black/30 rounded-lg p-3 border border-slate-800 space-y-1">
                                                        <div className="flex justify-between items-center text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                                                            <span>Scene {idx + 1}: {block.scene}</span>
                                                            <button onClick={() => { copyToClipboard(block.visual_en).then(ok => ok && alert("Copiado!")) }} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"><LucideIcon name="copy" className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                        <p className="text-xs text-slate-300 leading-relaxed font-serif">{block.visual_en}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Action Prompt (Collapsible) */}
                                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/25">
                                    <button 
                                        type="button" 
                                        onClick={() => setActionOpen(!actionOpen)} 
                                        className="w-full flex items-center justify-between p-4 bg-slate-900/60 transition hover:bg-slate-900 text-left border-b border-transparent hover:border-slate-800"
                                    >
                                        <div className="flex items-center gap-2">
                                            <LucideIcon name="play-circle" className="w-4 h-4 text-purple-400" />
                                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans flex items-center gap-2">
                                                <span>Action Prompt</span>
                                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-sans font-bold flex items-center gap-1">
                                                    🎬 AI Video Optimized
                                                </span>
                                            </span>
                                        </div>
                                        <LucideIcon name={actionOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-slate-400" />
                                    </button>
                                    {actionOpen && (
                                        <div className="p-4 space-y-4 animate-fade-in bg-black/20 max-h-96 overflow-y-auto custom-scrollbar">
                                            <div className="space-y-4">
                                                {result.blocks?.map((block: any, idx: number) => {
                                                    const currentActionText = block.action_en || block.action_prompt_en || "";
                                                    return (
                                                        <div key={idx} className="bg-black/30 rounded-lg p-3 border border-slate-800 space-y-1">
                                                            <div className="flex justify-between items-center text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                                                                <span className="flex items-center gap-1.5">
                                                                    <span>Scene {idx + 1}: {block.scene}</span>
                                                                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 rounded font-sans font-bold">🎬 AI Video Optimized</span>
                                                                </span>
                                                                <button onClick={() => { copyToClipboard(currentActionText).then(ok => ok && alert("Copiado!")) }} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"><LucideIcon name="copy" className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                            <p className="text-xs text-slate-300 leading-relaxed font-sans">{currentActionText || "Sem ação cadastrada."}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>



                                {/* 4. Negative Prompt (Collapsible) */}
                                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/25">
                                    <button 
                                        type="button" 
                                        onClick={() => setNegativeOpen(!negativeOpen)} 
                                        className="w-full flex items-center justify-between p-4 bg-slate-900/60 transition hover:bg-slate-900 text-left border-b border-transparent hover:border-slate-800"
                                    >
                                        <div className="flex items-center gap-2">
                                            <LucideIcon name="shield-alert" className="w-4 h-4 text-red-400" />
                                            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider font-sans">Negative Prompt</span>
                                        </div>
                                        <LucideIcon name={negativeOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-slate-400" />
                                    </button>
                                    {negativeOpen && (
                                        <div className="p-4 space-y-2 animate-fade-in bg-black/20">
                                            <div className="flex justify-between items-center text-[10px] text-red-400 font-mono uppercase font-bold">
                                                <span>Anti-Morph Suffix</span>
                                                <button onClick={() => { copyToClipboard(result.negative_prompt || "").then(ok => ok && alert("Copiado!")) }} className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"><LucideIcon name="copy" className="w-3.5 h-3.5" /></button>
                                            </div>
                                            <p className="text-xs text-red-200/80 leading-relaxed font-serif bg-red-950/20 border border-red-900/30 p-3 rounded-lg whitespace-pre-wrap break-words">{result.negative_prompt}</p>
                                        </div>
                                    )}
                                </div>



                            </div>

                            <div className="flex gap-3 mt-4">
                                <Button onClick={() => copyToClipboard(JSON.stringify(result, null, 2)).then(ok=>ok&&alert("Objeto JSON Copiado!"))} variant="secondary" className="w-full border-purple-500/30 hover:border-purple-500 text-xs cursor-pointer">
                                    <LucideIcon name="file-json" className="w-4 h-4 text-purple-400" /> Copiar JSON Completo
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </>
            )}
        </div>
    );
}
