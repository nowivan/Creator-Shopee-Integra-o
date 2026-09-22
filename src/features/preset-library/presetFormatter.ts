import { PresetDefinition } from './types';

export interface MergedPresetApplication {
  appliedPresets: PresetDefinition[];
  combinedPromptAdditions: string;
  combinedNegativePromptAdditions: string;
  combinedVisualDNA: string[];
  promptAdditions?: string;
  negativePromptAdditions?: string;
  visualDNA: string[];
  suggestedCampaignType?: string;
  defaultTakes?: number;
}

/**
 * Merge multiple selected presets into structured prompt additions
 */
export function mergePresets(presets: PresetDefinition[]): MergedPresetApplication {
  const promptAdditions: string[] = [];
  const negativePromptAdditions: string[] = [];
  const visualDNA: string[] = [];
  let suggestedCampaignType: string | undefined;
  let defaultTakes: number | undefined;

  for (const preset of presets) {
    if (preset.promptAdditions) {
      promptAdditions.push(...preset.promptAdditions);
    }
    if (preset.negativePromptAdditions) {
      negativePromptAdditions.push(...preset.negativePromptAdditions);
    }
    if (preset.visualDNA) {
      visualDNA.push(...preset.visualDNA);
    }
    if (preset.suggestedCampaignType && !suggestedCampaignType) {
      suggestedCampaignType = preset.suggestedCampaignType;
    }
    if (preset.defaultTakes && !defaultTakes) {
      defaultTakes = preset.defaultTakes;
    }
  }

  // Deduplicate
  const uniquePrompt = Array.from(new Set(promptAdditions)).join(' ');
  const uniqueNegative = Array.from(new Set(negativePromptAdditions)).join(', ');
  const uniqueDNA = Array.from(new Set(visualDNA));

  return {
    appliedPresets: presets,
    combinedPromptAdditions: uniquePrompt,
    combinedNegativePromptAdditions: uniqueNegative,
    combinedVisualDNA: uniqueDNA,
    promptAdditions: uniquePrompt,
    negativePromptAdditions: uniqueNegative,
    visualDNA: uniqueDNA,
    suggestedCampaignType,
    defaultTakes
  };
}

/**
 * Format a human-readable summary of applied presets in Portuguese
 */
export function formatPresetSummary(preset: PresetDefinition): string {
  return `Preset [${preset.code}] - ${preset.label}: ${preset.description}`;
}

export function buildMergedPresetSummaryText(merged: MergedPresetApplication): string {
  if (merged.appliedPresets.length === 0) return '';
  return `Presets Ativos (${merged.appliedPresets.length}): ${merged.appliedPresets.map(p => `${p.code} (${p.label})`).join(', ')}`;
}
