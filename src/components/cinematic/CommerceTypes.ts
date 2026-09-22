import {
    CommerceDemoFamily,
    CommerceShotPlan,
    CommerceCompiledPromptOutput,
    ProductVisionData
} from '../../features/cinematic/types';

export type CinematicUIMode = 'classic' | 'commerce';

export type CommerceDurationOption = 8 | 10 | 15;

export type CommerceAudioMode = 'music_only' | 'voiceover_pt' | 'dialogue';

export type CommerceEnvironmentMode =
    | 'clean_studio'
    | 'luxury_retail'
    | 'lifestyle_home'
    | 'outdoor_street'
    | 'ambient_match'
    | 'custom';

export type CommerceCameraStrategy =
    | 'auto'
    | 'handheld_ugc'
    | 'smooth_commercial'
    | 'dynamic_orbit'
    | 'macro_push'
    | 'static_tripod';

export interface CommerceWardrobeState {
    top: string;
    bottom: string;
    footwear: string;
    accessories: string;
    customDescription: string;
}

export interface CommerceAvatarState {
    mode: 'none' | 'ai_auto' | 'custom';
    avatarFile: File | null;
    avatarPreview: string;
    identityLock: boolean;
    gender: 'female' | 'male' | 'neutral' | 'ai_decide';
    presenterStyle: string;
    wardrobe: CommerceWardrobeState;
}

export interface CommerceEnvironmentState {
    mode: CommerceEnvironmentMode;
    customDescription: string;
    surface: string;
    lightingStyle: string;
    backgroundActivity: 'soft_blur' | 'clean_static' | 'active_subtle';
}

export interface CommerceCameraState {
    strategy: CommerceCameraStrategy;
    handheldMicroShakes: boolean;
    macroFocus: boolean;
    orbitMode: 'none' | '180_orbit' | '360_orbit';
}

export interface CommerceUIState {
    mode: CinematicUIMode;
    demoFamily: CommerceDemoFamily;
    duration: CommerceDurationOption;
    aspectRatio: '9:16' | '16:9' | '1:1';
    audioMode: CommerceAudioMode;
    avatar: CommerceAvatarState;
    environment: CommerceEnvironmentState;
    camera: CommerceCameraState;
    customNegative: string;
}

export interface CommerceGenerationResult {
    planOutput: {
        family: CommerceDemoFamily;
        resolvedFamily: Exclude<CommerceDemoFamily, 'AUTO'>;
        totalDurationSec: number;
        targetBeats: number;
        shots: CommerceShotPlan[];
        cameraGuidelines: string[];
        negativeGuidelines: string[];
    };
    compiledOutput: CommerceCompiledPromptOutput;
    visionData: ProductVisionData;
    productName: string;
    category: string;
    generatedAt: string;
}
