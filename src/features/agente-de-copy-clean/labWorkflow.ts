/**
 * Copy Variation Lab Workflow Engine (Phase Clean D.2)
 * Manages lightweight UI state, clipboards, usage toggling, and non-mutating filters.
 */

import { CleanCopyVariation, AgenteDeCopyCleanResult, VariationFilter, VariationUsageState, UsageStats } from './types';

/**
 * Formats Scene 2 and Scene 3 for clean pair copy.
 * Preserves both texts byte-for-byte.
 */
export function formatPairCopy(scene2: string, scene3: string): string {
    return `CENA 2:\n${scene2}\n\nCENA 3:\n${scene3}`;
}

/**
 * Derives variation readiness from individual scene validity.
 */
export function isVariationReady(s2Valid: boolean, s3Valid: boolean): boolean {
    return Boolean(s2Valid && s3Valid);
}

/**
 * Filters variations based on used state without mutating original array or order.
 */
export function filterVariations(
    variations: CleanCopyVariation[],
    usedVariationIds: number[],
    filter: VariationFilter
): CleanCopyVariation[] {
    const usedSet = new Set(usedVariationIds);
    if (filter === 'used') {
        return variations.filter(v => usedSet.has(v.id));
    }
    if (filter === 'available') {
        return variations.filter(v => !usedSet.has(v.id));
    }
    return [...variations];
}

/**
 * Calculates current usage statistics for display.
 */
export function calculateUsageStats(total: number, usedVariationIds: number[]): UsageStats {
    const totalCount = Math.max(0, total);
    const uniqueUsed = Array.from(new Set(usedVariationIds)).filter(id => id >= 1 && id <= totalCount);
    const usedCount = uniqueUsed.length;
    const availableCount = Math.max(0, totalCount - usedCount);

    return {
        total: totalCount,
        usedCount,
        availableCount
    };
}

/**
 * Toggles the used state of a variation.
 * Enforces safety: cannot mark as used if isReady === false.
 * Allows reverting an already used variation to available.
 */
export function toggleUsedVariation(
    currentUsedIds: number[],
    variationId: number,
    isReady: boolean
): number[] {
    if (currentUsedIds.includes(variationId)) {
        return currentUsedIds.filter(id => id !== variationId);
    }
    if (!isReady) {
        return currentUsedIds;
    }
    return [...currentUsedIds, variationId];
}

/**
 * Derives a stable result identity key for associating workflow state.
 */
export function getResultIdentity(result: AgenteDeCopyCleanResult | null | undefined): string {
    if (!result || !result.variations || result.variations.length === 0) return '';
    if (result.cleanDTrace?.initial.requestId) {
        return result.cleanDTrace.initial.requestId;
    }
    const signature = result.variations.map(v => `${v.id}:${v.scene2.slice(0, 15)}`).join('|');
    return `clean_${result.variant}_${signature}`;
}

/**
 * Loads lightweight workflow state from localStorage.
 */
export function loadWorkflowState(resultId: string): VariationUsageState {
    if (!resultId || typeof window === 'undefined') {
        return { resultId: resultId || '', usedVariationIds: [], filter: 'all' };
    }
    try {
        const key = `clean_d_lab_usage_${resultId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.usedVariationIds) && ['all', 'available', 'used'].includes(parsed.filter)) {
                return {
                    resultId,
                    usedVariationIds: parsed.usedVariationIds,
                    filter: parsed.filter
                };
            }
        }
    } catch {
        // Fallback on storage errors
    }
    return { resultId, usedVariationIds: [], filter: 'all' };
}

/**
 * Saves lightweight workflow state to localStorage.
 */
export function saveWorkflowState(state: VariationUsageState): void {
    if (!state.resultId || typeof window === 'undefined') return;
    try {
        const key = `clean_d_lab_usage_${state.resultId}`;
        localStorage.setItem(key, JSON.stringify({
            usedVariationIds: state.usedVariationIds,
            filter: state.filter
        }));
    } catch {
        // Fallback on storage errors
    }
}
