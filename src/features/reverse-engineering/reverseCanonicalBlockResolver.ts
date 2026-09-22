export interface CanonicalReverseBlock {
    block_id: number | string;
    sceneId: string;
    scene_name: string;
    estimated_time: string;
    timestamp?: string;
    duration?: string | number;
    visual_prompt_en: string;
    action_prompt_en?: string;
    actions: string[];
    voice_description_en?: string;
    dialogue_pt_br: string;
    negative_prompt_en?: string;
    character_profiles_en?: string;
    character_lock_en?: string;
    speaker_timing?: any;
    reaction_directions_en?: string;
    role?: string;
    [key: string]: any;
}

export interface CanonicalReverseResolution {
    blocks: CanonicalReverseBlock[];
    sourceUsed: string;
    warnings: string[];
    normalizedCount: number;
}

function isPotentialSceneObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const sceneKeys = [
        'visual_prompt_en', 'visual_context_en', 'visualDescription', 'veoPrompt', 'visual_en', 'visual', 'visual_prompt',
        'action_prompt_en', 'actionPrompt', 'action_en', 'action', 'actions',
        'dialogue_pt_br', 'spokenCopy', 'dialogue', 'dialogue_pt', 'narration_pt_br', 'narration_pt',
        'scene_name', 'sceneTitle', 'scene_id', 'sceneId', 'block_id', 'voice_description_en', 'voiceDescription'
    ];
    return sceneKeys.some(key => key in obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '');
}

function extractFromNumericObject(obj: any): any[] | null {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const keys = Object.keys(obj).filter(k => /^\d+$/.test(k));
    if (keys.length === 0) return null;
    keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const items = keys.map(k => obj[k]);
    if (items.some(it => isPotentialSceneObject(it))) {
        return items;
    }
    return null;
}

function normalizeActions(item: any): string[] {
    if (Array.isArray(item.actions) && item.actions.length > 0) {
        return item.actions.filter((a: any) => typeof a === 'string' && a.trim().length > 0 && a.trim().toUpperCase() !== 'N/A');
    }
    if (typeof item.actions === 'string' && item.actions.trim().length > 0 && item.actions.trim().toUpperCase() !== 'N/A') {
        return [item.actions.trim()];
    }
    const actionPrompt = item.action_prompt_en || item.actionPrompt || item.action_en || item.action;
    if (typeof actionPrompt === 'string' && actionPrompt.trim().length > 0 && actionPrompt.trim().toUpperCase() !== 'N/A') {
        return [actionPrompt.trim()];
    }
    const motionLock = item.motion_lock_addition || item.motion_instruction || item.motion_prompt || item.physical_motion_prompt;
    if (typeof motionLock === 'string' && motionLock.trim().length > 0 && motionLock.trim().toUpperCase() !== 'N/A') {
        return [motionLock.trim()];
    }
    return [];
}

function normalizeSingleBlock(item: any, index: number): CanonicalReverseBlock {
    const raw = typeof item === 'object' && item !== null ? item : {};

    const block_id = raw.block_id ?? raw.id ?? raw.scene_id ?? raw.sceneId ?? (index + 1);
    const sceneId = raw.sceneId || raw.scene_id || (raw.id ? String(raw.id) : undefined) || raw.scene_key || `scene-${index + 1}`;
    const scene_name = raw.scene_name || raw.sceneTitle || raw.title || raw.name || raw.scene || `Cena ${index + 1}`;
    const estimated_time = raw.estimated_time || raw.estimatedTime || raw.duration || raw.time || raw.timestamp || '';
    const timestamp = raw.timestamp || raw.time || raw.estimated_time || raw.estimatedTime || '';
    const duration = raw.duration || raw.estimated_time || raw.estimatedTime || '';
    
    const visual_prompt_en = raw.visual_prompt_en || raw.visual_context_en || raw.visualDescription || raw.veoPrompt || raw.visual_en || raw.visual || raw.visual_prompt || raw.description || '';
    const action_prompt_en = raw.action_prompt_en || raw.actionPrompt || raw.action_en || raw.action || undefined;
    const actions = normalizeActions(raw);
    const voice_description_en = raw.voice_description_en || raw.voiceDescription || raw.voice_en || raw.voice || undefined;
    const dialogue_pt_br = raw.dialogue_pt_br || raw.spokenCopy || raw.dialogue || raw.dialogue_pt || raw.narration_pt_br || raw.narration_pt || raw.text || '';
    const negative_prompt_en = raw.negative_prompt_en || raw.negativePrompt || raw.negative_en || raw.negative || undefined;
    const character_profiles_en = raw.character_profiles_en || raw.characterProfiles || raw.character_profile || undefined;
    const character_lock_en = raw.character_lock_en || raw.characterLock || undefined;
    const speaker_timing = raw.speaker_timing || raw.speakerTiming || undefined;
    const reaction_directions_en = raw.reaction_directions_en || raw.reactionDirections || undefined;
    const role = raw.role || raw.speaker || undefined;

    return {
        ...raw,
        block_id,
        sceneId,
        scene_name,
        estimated_time,
        timestamp,
        duration,
        visual_prompt_en,
        action_prompt_en,
        actions,
        voice_description_en,
        dialogue_pt_br,
        negative_prompt_en,
        character_profiles_en,
        character_lock_en,
        speaker_timing,
        reaction_directions_en,
        role
    };
}

export function resolveCanonicalReverseBlocks(
    result: any,
    activeModel?: string
): CanonicalReverseResolution {
    const warnings: string[] = [];

    if (!result) {
        return {
            blocks: [],
            sourceUsed: 'none',
            warnings: ['Result is null or undefined'],
            normalizedCount: 0
        };
    }

    // Direct Array Input
    if (Array.isArray(result)) {
        if (result.length > 0) {
            const blocks = result.map((item, idx) => normalizeSingleBlock(item, idx));
            return {
                blocks,
                sourceUsed: 'direct_array',
                warnings,
                normalizedCount: blocks.length
            };
        }
        return {
            blocks: [],
            sourceUsed: 'none',
            warnings: ['Result is an empty array'],
            normalizedCount: 0
        };
    }

    const model = (activeModel || '').toLowerCase().trim();

    // 1. Model Specific Candidates
    const modelPaths: Record<string, string[]> = {
        veo: ['veo_structure', 'data.veo_structure'],
        sora: ['sora_structure', 'data.sora_structure'],
        grok: ['grok_structure', 'data.grok_structure']
    };

    // Helper to get nested value
    const getValue = (obj: any, path: string): any => {
        const parts = path.split('.');
        let curr = obj;
        for (const p of parts) {
            if (curr === null || curr === undefined || typeof curr !== 'object') return undefined;
            curr = curr[p];
        }
        return curr;
    };

    // Define source list according to priority
    const sourceCandidates: { path: string; sourceName: string }[] = [];

    // Priority 1: Selected model structure
    if (model && modelPaths[model]) {
        for (const p of modelPaths[model]) {
            sourceCandidates.push({ path: p, sourceName: p });
        }
    }

    // Priority 2: Canonical scene/block arrays
    const canonicalArrays = [
        { path: 'blocks', sourceName: 'blocks' },
        { path: 'scene_blocks', sourceName: 'scene_blocks' },
        { path: 'sceneBlocks', sourceName: 'sceneBlocks' },
        { path: 'scenes', sourceName: 'scenes' },
        { path: 'reverse_blocks', sourceName: 'reverse_blocks' },
        { path: 'reverseBlocks', sourceName: 'reverseBlocks' }
    ];
    sourceCandidates.push(...canonicalArrays);

    // Priority 3: Other model structures
    const allModels = ['veo', 'sora', 'grok'];
    for (const m of allModels) {
        if (m !== model) {
            for (const p of modelPaths[m]) {
                sourceCandidates.push({ path: p, sourceName: p });
            }
        }
    }

    // Priority 4: Nested data structures
    const nestedArrays = [
        { path: 'storyboard', sourceName: 'storyboard' },
        { path: 'timeline', sourceName: 'timeline' },
        { path: 'decomposition.blocks', sourceName: 'decomposition.blocks' },
        { path: 'decomposition', sourceName: 'decomposition' },
        { path: 'analysis.blocks', sourceName: 'analysis.blocks' },
        { path: 'analysis', sourceName: 'analysis' },
        { path: 'data.blocks', sourceName: 'data.blocks' },
        { path: 'data.scene_blocks', sourceName: 'data.scene_blocks' },
        { path: 'data.sceneBlocks', sourceName: 'data.sceneBlocks' },
        { path: 'data.scenes', sourceName: 'data.scenes' },
        { path: 'data.reverse_blocks', sourceName: 'data.reverse_blocks' },
        { path: 'data.reverseBlocks', sourceName: 'data.reverseBlocks' }
    ];
    sourceCandidates.push(...nestedArrays);

    // Iterate through candidates in priority order
    for (const candidate of sourceCandidates) {
        const val = getValue(result, candidate.path);
        if (Array.isArray(val) && val.length > 0) {
            const blocks = val.map((item, idx) => normalizeSingleBlock(item, idx));
            return {
                blocks,
                sourceUsed: candidate.sourceName,
                warnings,
                normalizedCount: blocks.length
            };
        }
    }

    // Priority 5: Numeric object detection on result or nested fields
    const numericCandidates = ['scenes', 'blocks', 'scene_blocks', 'data.scenes', 'data.blocks', 'data'];
    const rootNumeric = extractFromNumericObject(result);
    if (rootNumeric && rootNumeric.length > 0) {
        const blocks = rootNumeric.map((item, idx) => normalizeSingleBlock(item, idx));
        return {
            blocks,
            sourceUsed: 'numeric_object_root',
            warnings,
            normalizedCount: blocks.length
        };
    }

    for (const numPath of numericCandidates) {
        const val = getValue(result, numPath);
        const extracted = extractFromNumericObject(val);
        if (extracted && extracted.length > 0) {
            const blocks = extracted.map((item, idx) => normalizeSingleBlock(item, idx));
            return {
                blocks,
                sourceUsed: `numeric_object_${numPath}`,
                warnings,
                normalizedCount: blocks.length
            };
        }
    }

    // Priority 6: Single scene-like object fallback
    if (isPotentialSceneObject(result)) {
        const singleBlock = normalizeSingleBlock(result, 0);
        return {
            blocks: [singleBlock],
            sourceUsed: 'single_scene_fallback',
            warnings: ['Result normalized as a single scene-like fallback object'],
            normalizedCount: 1
        };
    }

    return {
        blocks: [],
        sourceUsed: 'none',
        warnings: ['No valid scene blocks found in candidate structures'],
        normalizedCount: 0
    };
}
