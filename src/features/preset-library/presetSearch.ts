import { PresetDefinition, PresetCategory, CompatibleModule, PresetOutputMode } from './types';
import { MASTER_PRESETS, PRESET_BY_CODE, getFavoritePresetCodes, getRecentPresetCodes } from './presetRegistry';

export interface PresetFilterOptions {
  searchQuery?: string;
  category?: PresetCategory | 'all' | 'favorites' | 'recent';
  compatibleModule?: CompatibleModule;
  outputMode?: PresetOutputMode;
}

export function searchPresets(options: PresetFilterOptions): PresetDefinition[] {
  const { searchQuery = '', category = 'all', compatibleModule, outputMode } = options;
  const cleanQuery = searchQuery.trim().toLowerCase();
  const isSlash = cleanQuery.startsWith('/');
  const queryTerm = isSlash ? cleanQuery.slice(1) : cleanQuery;

  const favoriteCodes = getFavoritePresetCodes();
  const recentCodes = getRecentPresetCodes();

  return MASTER_PRESETS.filter((preset) => {
    // Category filter
    if (category === 'favorites') {
      if (!favoriteCodes.includes(preset.code)) return false;
    } else if (category === 'recent') {
      if (!recentCodes.includes(preset.code)) return false;
    } else if (category !== 'all' && preset.category !== category) {
      return false;
    }

    // Module compatibility filter
    if (compatibleModule && !preset.compatibleModules.includes(compatibleModule)) {
      return false;
    }

    // Output mode filter
    if (outputMode && !preset.outputModes.includes(outputMode)) {
      return false;
    }

    // Search query matching
    if (cleanQuery) {
      const codeMatch = preset.code.toLowerCase().includes(queryTerm);
      const labelMatch = preset.label.toLowerCase().includes(cleanQuery);
      const descMatch = preset.description.toLowerCase().includes(cleanQuery);
      const tagsMatch = preset.tags.some((t) => t.toLowerCase().includes(queryTerm));
      const bestForMatch = preset.bestFor.some((b) => b.toLowerCase().includes(cleanQuery));

      if (!codeMatch && !labelMatch && !descMatch && !tagsMatch && !bestForMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract slash commands from a user text input (e.g., "/movieposter /3drender")
 */
export function extractSlashCommands(text: string): PresetDefinition[] {
  if (!text) return [];
  const matches = text.match(/\/[a-zA-Z0-9_-]+/g);
  if (!matches) return [];

  const found: PresetDefinition[] = [];
  for (const match of matches) {
    const preset = PRESET_BY_CODE.get(match.toLowerCase());
    if (preset && !found.some((p) => p.code === preset.code)) {
      found.push(preset);
    }
  }
  return found;
}

/**
 * Get preset by code
 */
export function getPresetByCode(code: string): PresetDefinition | undefined {
  if (!code) return undefined;
  const normalized = code.startsWith('/') ? code.toLowerCase() : `/${code.toLowerCase()}`;
  return PRESET_BY_CODE.get(normalized);
}
