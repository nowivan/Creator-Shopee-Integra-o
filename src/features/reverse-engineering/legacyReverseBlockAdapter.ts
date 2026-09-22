export interface LegacyNormalizedBlock {
  block_id: number;
  sceneId: string;
  scene_name: string;
  estimated_time: string;
  timestamp?: string;
  duration?: string | number;
  visual_prompt_en: string;
  action_prompt_en?: string;
  actions: string[];
  voice_description_en: string;
  dialogue_pt_br: string;
  negative_prompt_en?: string;
  character_profiles_en?: string;
  character_lock_en?: string;
  speaker_timing?: any;
  reaction_directions_en?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Checks whether an object resembles a scene/block dictionary.
 */
function isSceneLikeObject(item: any): boolean {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const sceneKeys = [
    'visual_prompt_en', 'visual_context_en', 'visual_prompt', 'visual_en', 'description', 'scene_description', 'rebuild_prompt_en', 'environment',
    'action_prompt_en', 'subject_action_en', 'camera_action_en', 'action', 'camera_movement', 'actions',
    'dialogue_pt_br', 'dialogue_pt', 'narration_pt_br', 'narration_pt', 'text', 'dialogue', 'voice_or_dialogue_pt_br', 'narrative',
    'scene_name', 'name', 'scene', 'title', 'sceneId', 'scene_id', 'block_id',
    'voice_description_en', 'voice_style_en', 'creator_profile'
  ];
  return sceneKeys.some(k => k in item && item[k] !== undefined && item[k] !== null && item[k] !== '');
}

/**
 * Extracts scene arrays from numerically indexed dictionary structures ({ "0": {...}, "1": {...} }).
 */
function extractFromNumericObject(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const keys = Object.keys(obj).filter(k => /^\d+$/.test(k));
  if (keys.length === 0) return null;
  keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const items = keys.map(k => obj[k]).filter(Boolean);
  if (items.some(it => isSceneLikeObject(it))) {
    return items;
  }
  return null;
}

/**
 * Extracts raw reverse blocks from any legacy or modern result shape.
 * Supports legacy source order and aliases.
 */
export function extractLegacyReverseBlocks(result: any, preferredModel?: string): any[] {
  if (!result) return [];

  // Direct array input
  if (Array.isArray(result)) {
    return result.filter(it => isSceneLikeObject(it) || typeof it === 'object');
  }

  // Model-specific preference if provided and non-empty
  if (preferredModel) {
    const modelKey = preferredModel.toLowerCase();
    if (modelKey === 'veo' || modelKey === 'flow') {
      if (Array.isArray(result.veo_structure) && result.veo_structure.length > 0) return result.veo_structure;
      if (Array.isArray(result.data?.veo_structure) && result.data.veo_structure.length > 0) return result.data.veo_structure;
    } else if (modelKey === 'sora') {
      if (Array.isArray(result.sora_structure) && result.sora_structure.length > 0) return result.sora_structure;
      if (Array.isArray(result.data?.sora_structure) && result.data.sora_structure.length > 0) return result.data.sora_structure;
    } else if (modelKey === 'grok') {
      if (Array.isArray(result.grok_structure) && result.grok_structure.length > 0) return result.grok_structure;
      if (Array.isArray(result.data?.grok_structure) && result.data.grok_structure.length > 0) return result.data.grok_structure;
    }
  }

  // Candidate source properties in prioritized legacy order
  const candidateKeys = [
    'blocks',
    'scene_blocks',
    'sceneBlocks',
    'scenes',
    'storyboard',
    'decomposition.blocks',
    'decomposition',
    'analysis.blocks',
    'analysis',
    'reverse_blocks',
    'reverseBlocks',
    'rcif_blocks',
    'veo_structure',
    'sora_structure',
    'grok_structure',
    'data.blocks',
    'data.scene_blocks',
    'data.sceneBlocks',
    'data.scenes',
    'data.veo_structure',
    'data.sora_structure',
    'data.grok_structure',
  ];

  for (const path of candidateKeys) {
    let val: any = result;
    if (path.includes('.')) {
      const parts = path.split('.');
      for (const p of parts) {
        val = val?.[p];
      }
    } else {
      val = result[path];
    }

    if (Array.isArray(val) && val.length > 0) {
      const filtered = val.filter(it => it && (isSceneLikeObject(it) || typeof it === 'object'));
      if (filtered.length > 0) {
        return filtered;
      }
    } else if (val && typeof val === 'object') {
      const numericItems = extractFromNumericObject(val);
      if (numericItems && numericItems.length > 0) {
        return numericItems;
      }
    }
  }

  // Check top-level numeric object
  const rootNumeric = extractFromNumericObject(result);
  if (rootNumeric && rootNumeric.length > 0) {
    return rootNumeric;
  }

  // Single scene object fallback
  if (isSceneLikeObject(result)) {
    return [result];
  }

  return [];
}

/**
 * Normalizes a raw legacy scene block into a clean, predictable structure.
 */
export function normalizeLegacyReverseBlock(raw: any, index: number): LegacyNormalizedBlock {
  if (!raw || typeof raw !== 'object') {
    return {
      block_id: index + 1,
      sceneId: `scene_${index + 1}`,
      scene_name: `Cena ${index + 1}`,
      estimated_time: '0-5s',
      visual_prompt_en: '',
      actions: [],
      voice_description_en: '',
      dialogue_pt_br: '',
    };
  }

  // 1. Scene Name / Title
  let sceneName = raw.scene_name || raw.name || raw.scene || raw.title || '';
  if (typeof sceneName !== 'string' || !sceneName.trim()) {
    sceneName = `Cena ${index + 1}`;
  } else {
    sceneName = sceneName.trim();
  }

  // 2. Timing / Estimated time
  let estimatedTime = raw.estimated_time || raw.timing || raw.timestamp || raw.duration || '';
  if (typeof estimatedTime === 'number') {
    estimatedTime = `${estimatedTime}s`;
  } else if (typeof estimatedTime !== 'string' || !estimatedTime.trim()) {
    estimatedTime = '';
  } else {
    estimatedTime = estimatedTime.trim();
  }

  // 3. Visual Prompt (EN)
  let visualPrompt = raw.visual_prompt_en || raw.visual_context_en || raw.visual_prompt || raw.visual_en || raw.description || raw.scene_description || raw.rebuild_prompt_en || raw.environment || '';
  if (typeof visualPrompt !== 'string') {
    visualPrompt = String(visualPrompt || '');
  }
  visualPrompt = visualPrompt.trim();

  // 4. Action Prompt (EN)
  let actionPrompt = raw.action_prompt_en || raw.subject_action_en || raw.camera_action_en || raw.action || raw.camera_movement || '';
  if (typeof actionPrompt !== 'string') {
    actionPrompt = String(actionPrompt || '');
  }
  actionPrompt = actionPrompt.trim();

  // 5. Actions (Array preservation - DO NOT derive from visual_prompt_en)
  let actions: string[] = [];
  if (Array.isArray(raw.actions) && raw.actions.length > 0) {
    actions = raw.actions
      .filter((a: any) => typeof a === 'string' && a.trim() && a.trim().toUpperCase() !== 'N/A')
      .map((a: string) => a.trim());
  } else if (typeof raw.actions === 'string' && raw.actions.trim() && raw.actions.trim().toUpperCase() !== 'N/A') {
    actions = [raw.actions.trim()];
  } else if (actionPrompt && actionPrompt.toUpperCase() !== 'N/A') {
    actions = [actionPrompt];
  }

  // 6. Dialogue (PT-BR)
  let dialogue = raw.dialogue_pt_br || raw.dialogue_pt || raw.narration_pt_br || raw.narration_pt || raw.text || raw.dialogue || raw.voice_or_dialogue_pt_br || raw.narrative || '';
  if (typeof dialogue !== 'string') {
    dialogue = String(dialogue || '');
  }
  dialogue = dialogue.trim();

  // 7. Voice Description (EN)
  let voice = raw.voice_description_en || raw.voice_style_en || raw.creator_profile || '';
  if (typeof voice !== 'string') {
    voice = String(voice || '');
  }
  voice = voice.trim();

  // 8. Preservation of optional metadata
  const negativePrompt = typeof raw.negative_prompt_en === 'string' ? raw.negative_prompt_en.trim() : undefined;
  const characterProfiles = typeof raw.character_profiles_en === 'string' ? raw.character_profiles_en.trim() : undefined;
  const characterLock = typeof raw.character_lock_en === 'string' ? raw.character_lock_en.trim() : undefined;
  const reactionDirections = typeof raw.reaction_directions_en === 'string' ? raw.reaction_directions_en.trim() : undefined;
  const role = typeof raw.role === 'string' ? raw.role.trim() : undefined;
  const timestamp = typeof raw.timestamp === 'string' ? raw.timestamp.trim() : undefined;
  const duration = raw.duration;
  const blockId = typeof raw.block_id === 'number' ? raw.block_id : (index + 1);
  const sceneId = raw.sceneId || raw.scene_id || `scene_${index + 1}`;

  return {
    ...raw,
    block_id: blockId,
    sceneId,
    scene_name: sceneName,
    estimated_time: estimatedTime,
    timestamp,
    duration,
    visual_prompt_en: visualPrompt,
    action_prompt_en: actionPrompt || undefined,
    actions,
    voice_description_en: voice,
    dialogue_pt_br: dialogue,
    negative_prompt_en: negativePrompt,
    character_profiles_en: characterProfiles,
    character_lock_en: characterLock,
    speaker_timing: raw.speaker_timing,
    reaction_directions_en: reactionDirections,
    role,
  };
}

/**
 * Proven legacy scene text formatter for clipboard and full prompt generation.
 */
export function formatLegacySceneText(block: LegacyNormalizedBlock, index: number): string {
  const title = block.scene_name || `Cena ${index + 1}`;
  const duration = block.estimated_time || (block.duration ? `${block.duration}s` : '');

  const lines: string[] = [];
  lines.push(`CENA ${index + 1} — ${title.toUpperCase()}`);
  if (duration) {
    lines.push(`DURAÇÃO: ${duration}`);
  }
  lines.push('');

  if (block.visual_prompt_en) {
    lines.push('PROMPT VISUAL');
    lines.push(block.visual_prompt_en);
    lines.push('');
  }

  if (block.actions && block.actions.length > 0) {
    lines.push('AÇÕES');
    block.actions.forEach(act => {
      const trimmed = act.trim();
      const val = trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
      lines.push(val);
    });
    lines.push('');
  } else if (block.action_prompt_en) {
    lines.push('AÇÕES');
    const trimmed = block.action_prompt_en.trim();
    lines.push(trimmed.startsWith('-') ? trimmed : `- ${trimmed}`);
    lines.push('');
  }

  if (block.voice_description_en) {
    lines.push('DESCRIÇÃO DA VOZ');
    lines.push(block.voice_description_en);
    lines.push('');
  }

  if (block.dialogue_pt_br) {
    lines.push('FALA');
    lines.push(block.dialogue_pt_br);
    lines.push('');
  }

  return lines.join('\n').trim();
}
