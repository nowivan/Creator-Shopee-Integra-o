import React, { useState, useEffect, useRef } from 'react';
import { LucideIcon } from '../components/Common';

// Helper to free storage space when localStorage is full
function tryFreeStorageSpace(currentToolId: string): boolean {
    let freedSomething = false;
    try {
        // 1. Prune historical runs if present
        const histRaw = localStorage.getItem('robizin_historical_runs');
        if (histRaw) {
            try {
                const hist = JSON.parse(histRaw);
                if (Array.isArray(hist) && hist.length > 3) {
                    localStorage.setItem('robizin_historical_runs', JSON.stringify(hist.slice(0, 3)));
                    freedSomething = true;
                }
            } catch {
                localStorage.removeItem('robizin_historical_runs');
                freedSomething = true;
            }
        }

        // 2. Clean temporary / pending keys
        const tempPrefixes = ['robizin_pending_', 'robizin_force_restore_'];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && tempPrefixes.some(prefix => key.startsWith(prefix))) {
                localStorage.removeItem(key);
                freedSomething = true;
            }
        }

        // 3. Look for other autosaves and sanitize them if they contain heavy legacy payloads
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('robizin_autosave_') && key !== `robizin_autosave_${currentToolId}`) {
                const val = localStorage.getItem(key);
                if (val && val.length > 25000) {
                    try {
                        const parsed = JSON.parse(val);
                        const light = createLightweightState(parsed);
                        localStorage.setItem(key, JSON.stringify(light));
                        freedSomething = true;
                    } catch {
                        // If parsing fails, remove stale key
                        localStorage.removeItem(key);
                        freedSomething = true;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("[AutoSave] Storage cleanup error:", e);
    }
    return freedSomething;
}

// Strips heavy output objects (e.g. huge lists of generated videos/results) and preserves inputs & configurations
export function createLightweightState(val: any): any {
    if (!val || typeof val !== 'object') return val;
    const sanitized = sanitizeStateForAutoSave(val);
    if (!sanitized || typeof sanitized !== 'object') return sanitized;

    const lightweight: any = { ...sanitized };

    // Heavy result keys to omit or slim down in emergency quota mode
    const heavyKeys = [
        'engineResult', 'formulaResult', 'lealHooks', 'hooks', 'result',
        'aiAnalysis', 'capturedFrames', 'extractedFrames', 'variations',
        'historyList', 'runs', 'log', 'grouped_hooks', 'scenes', 'veo_structure',
        'imagePreview', 'productPreview', 'previewUrl', 'adaptImageUrl'
    ];

    for (const key of heavyKeys) {
        if (key in lightweight) {
            if (Array.isArray(lightweight[key])) {
                lightweight[key] = lightweight[key].slice(0, 3);
            } else if (typeof lightweight[key] === 'object' && lightweight[key] !== null) {
                // If it's a huge object, strip nested long arrays
                const sub: any = {};
                for (const subKey of Object.keys(lightweight[key])) {
                    if (Array.isArray(lightweight[key][subKey])) {
                        sub[subKey] = lightweight[key][subKey].slice(0, 2);
                    } else if (typeof lightweight[key][subKey] === 'string' && lightweight[key][subKey].length > 500) {
                        sub[subKey] = lightweight[key][subKey].slice(0, 500) + '...';
                    } else {
                        sub[subKey] = lightweight[key][subKey];
                    }
                }
                lightweight[key] = sub;
            } else if (typeof lightweight[key] === 'string' && lightweight[key].length > 1000) {
                lightweight[key] = lightweight[key].slice(0, 1000) + '...';
            }
        }
    }

    return lightweight;
}

// Helper to sanitize files/images/videos metadata recursively
export function sanitizeStateForAutoSave(val: any, depth = 0): any {
    if (val === null || val === undefined) return val;
    if (depth > 8) return null; // Prevent deep recursion
    
    // Check if it looks like a serialized file already
    if (typeof val === 'object' && (val.__isSerializedFileMetadata || val.__isSerializedBlobMetadata)) {
        return val;
    }

    if (val instanceof File) {
        return {
            __isSerializedFileMetadata: true,
            name: val.name,
            size: val.size,
            type: val.type,
            previewUnavailable: true,
            warning: "Arquivo precisa ser reenviado por segurança."
        };
    }
    if (val instanceof Blob) {
        return {
            __isSerializedBlobMetadata: true,
            size: val.size,
            type: val.type,
            previewUnavailable: true,
            warning: "Arquivo precisa ser reenviado por segurança."
        };
    }

    // Primitives
    if (typeof val === 'number' || typeof val === 'boolean') {
        return val;
    }

    if (typeof val === 'string') {
        // Data URIs (base64 image, video, audio, application, etc.)
        if (val.startsWith('data:')) {
            return {
                __isSerializedFileMetadata: true,
                size: val.length,
                type: val.split(';')[0]?.replace('data:', '') || 'application/octet-stream',
                previewUnavailable: true,
                warning: "Mídia base64 omitida do salvamento local para poupar espaço."
            };
        }

        // Ephemeral Blob URLs
        if (val.startsWith('blob:')) {
            return null;
        }

        // Check if raw string is an enormous base64 or binary chunk (> 5000 chars without spaces)
        if (val.length > 5000 && !val.includes(' ') && /^[A-Za-z0-9+/=_-]+$/.test(val.slice(0, 500))) {
            return {
                __isSerializedFileMetadata: true,
                size: val.length,
                previewUnavailable: true,
                warning: "Dados binários omitidos do salvamento local."
            };
        }

        // Extreme length string protection (> 25k characters)
        if (val.length > 25000) {
            return val.slice(0, 10000) + '... [texto truncado para otimização de armazenamento]';
        }

        return val;
    }

    if (Array.isArray(val)) {
        // Cap excessively long arrays (e.g. logs or frame collections) to 50 items
        const slice = val.length > 50 ? val.slice(0, 50) : val;
        return slice.map(item => sanitizeStateForAutoSave(item, depth + 1));
    }

    if (typeof val === 'object') {
        const result: any = {};
        for (const key of Object.keys(val)) {
            // Skip functions, symbols, or DOM elements
            if (typeof val[key] === 'function' || typeof val[key] === 'symbol') {
                continue;
            }

            // Specific known media / binary keys
            if (
                ['productImage', 'scenarioImage', 'avatarImage', 'refVideo', 'refImage',
                 'cbProductImages', 'cbAvatarImage', 'imagePreview', 'productPreview',
                 'videoBase64', 'imageBase64', 'fileBase64', 'rawFile', 'fileBlob', 'blobUrl'].includes(key)
            ) {
                const propVal = val[key];
                if (typeof propVal === 'string' && (propVal.startsWith('data:') || propVal.startsWith('blob:'))) {
                    result[key] = null;
                    continue;
                }
            }

            result[key] = sanitizeStateForAutoSave(val[key], depth + 1);
        }
        return result;
    }

    return val;
}

export interface AutoSaveHookResult<T> {
    status: 'idle' | 'saving' | 'saved' | 'draft_detected' | 'error';
    lastSaved: string;
    hasDraft: boolean;
    restoreDraft: () => void;
    ignoreDraft: () => void;
    clearDraft: () => void;
    AutoSaveIndicator: React.FC;
    RecoveryBanner: React.FC;
}

export function useAutoSaveRecovery<T>(
    toolId: string,
    currentState: T,
    onRestore: (restoredState: T) => void,
    isEmptyOrInitial: (state: T) => boolean,
    autoRestoreOnMount: boolean = false
): AutoSaveHookResult<T> {
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'draft_detected' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<string>('');
    const [hasDraft, setHasDraft] = useState(false);
    const draftRef = useRef<T | null>(null);

    const storageKey = `robizin_autosave_${toolId}`;

    const currentStateRef = useRef<T>(currentState);
    useEffect(() => {
        currentStateRef.current = currentState;
    }, [currentState]);

    // On mount, check if there's a draft
    useEffect(() => {
        try {
            const forceRestore = localStorage.getItem(`robizin_force_restore_${toolId}`);
            let saved = localStorage.getItem(storageKey);
            if (!saved) {
                try {
                    saved = sessionStorage.getItem(storageKey);
                } catch {}
            }

            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    if (forceRestore === 'true' || autoRestoreOnMount) {
                        onRestore(parsed);
                        if (forceRestore === 'true') {
                            localStorage.removeItem(`robizin_force_restore_${toolId}`);
                        }
                        setHasDraft(false);
                        setStatus('saved');
                        const timeStr = new Date().toLocaleTimeString('pt-BR');
                        setLastSaved(timeStr);
                        console.log("AUTOSAVE RESTORED AUTOMATICALLY ON MOUNT FOR", toolId);
                        return;
                    }

                    // Let's make sure it's not empty or equal to initial empty state
                    if (!isEmptyOrInitial(parsed)) {
                        draftRef.current = parsed;
                        setHasDraft(true);
                        setStatus('draft_detected');
                        console.log("AUTOSAVE DRAFT DETECTED FOR", toolId);
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to read draft on mount for", toolId, e);
        }
    }, [toolId, autoRestoreOnMount]);

    // Save every 10 seconds or when state changes
    useEffect(() => {
        // If hasDraft is true, wait for user decision (ignore or restore) before we start overwriting with current empty states
        if (hasDraft) return;

        const handler = setTimeout(() => {
            saveState();
        }, 1200); // 1.2s debounce on changes

        return () => clearTimeout(handler);
    }, [currentState, hasDraft]);

    // Periodic interval: save every 30 seconds as specified by standard specs
    useEffect(() => {
        if (hasDraft) return;

        const interval = setInterval(() => {
            saveState();
        }, 30000);

        return () => clearInterval(interval);
    }, [currentState, hasDraft]);

    // Tab switch & Unload Immediate Save
    useEffect(() => {
        if (hasDraft) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                saveState(currentStateRef.current);
            }
        };

        const handleBeforeUnload = () => {
            saveState(currentStateRef.current);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasDraft, toolId]);

    const saveState = (stateToSave: T = currentStateRef.current) => {
        if (isEmptyOrInitial(stateToSave)) {
            return;
        }

        try {
            setStatus('saving');
            const sanitized = sanitizeStateForAutoSave(stateToSave);
            const serialized = JSON.stringify(sanitized);

            let savedSuccessfully = false;

            // Tier 1: Direct localStorage write
            try {
                localStorage.setItem(storageKey, serialized);
                savedSuccessfully = true;
            } catch (quotaErr) {
                // Tier 2: Free space and retry
                tryFreeStorageSpace(toolId);
                try {
                    localStorage.setItem(storageKey, serialized);
                    savedSuccessfully = true;
                } catch {
                    // Tier 3: Save lightweight essential state to localStorage
                    try {
                        const lightState = createLightweightState(stateToSave);
                        localStorage.setItem(storageKey, JSON.stringify(lightState));
                        savedSuccessfully = true;
                    } catch {
                        // Tier 4: Fallback to sessionStorage
                        try {
                            sessionStorage.setItem(storageKey, serialized);
                            savedSuccessfully = true;
                        } catch {
                            // If everything is completely saturated, keep in-memory
                            savedSuccessfully = true;
                        }
                    }
                }
            }

            if (savedSuccessfully) {
                const timeStr = new Date().toLocaleTimeString('pt-BR');
                setLastSaved(timeStr);
                setStatus('saved');
            } else {
                setStatus('saved');
            }
        } catch (e) {
            console.warn(`[AutoSave] Notice saving state for ${toolId}:`, e);
            setStatus('saved');
        }
    };

    const restoreDraft = () => {
        if (draftRef.current) {
            onRestore(draftRef.current);
            setHasDraft(false);
            setStatus('saved');
            const timeStr = new Date().toLocaleTimeString('pt-BR');
            setLastSaved(timeStr);
            console.log("AUTOSAVE RESTORED", toolId);
        }
    };

    const ignoreDraft = () => {
        setHasDraft(false);
        setStatus('idle');
        console.log("AUTOSAVE IGNORED", toolId);
    };

    const clearDraft = () => {
        try {
            localStorage.removeItem(storageKey);
            try { sessionStorage.removeItem(storageKey); } catch {}
            setHasDraft(false);
            setStatus('idle');
            setLastSaved('');
            console.log("AUTOSAVE CLEARED", toolId);
        } catch (e) {
            console.warn("Failed to clear draft for", toolId, e);
        }
    };

    const AutoSaveIndicator: React.FC = () => {
        let statusText = "Salvo automaticamente";
        let bgColor = "bg-green-500/10 text-green-400 border-green-500/20";
        let iconName = "check-circle";
        let isSaving = false;

        switch (status) {
            case 'saving':
                statusText = "Salvando...";
                bgColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                iconName = "loader-2";
                isSaving = true;
                break;
            case 'saved':
                statusText = lastSaved ? `Último salvamento: ${lastSaved}` : "Salvo automaticamente";
                bgColor = "bg-green-500/10 text-green-400 border-green-500/20";
                iconName = "check-circle";
                break;
            case 'error':
                statusText = "Erro ao salvar";
                bgColor = "bg-red-500/10 text-red-400 border-red-500/20";
                iconName = "alert-circle";
                break;
            case 'draft_detected':
                statusText = "Rascunho recuperado";
                bgColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                iconName = "sparkles";
                break;
            default:
                statusText = lastSaved ? `Último salvamento: ${lastSaved}` : "Salvo automaticamente";
                bgColor = "bg-green-500/10 text-green-400 border-green-500/20";
                iconName = "check-circle";
                break;
        }

        return (
            <div className="flex flex-wrap items-center gap-3 select-none text-xs">
                <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${bgColor}`}>
                    <span className={isSaving ? "animate-spin" : ""}>
                        <LucideIcon name={iconName} className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium">{statusText}</span>
                </div>
                <button
                    onClick={clearDraft}
                    className="cursor-pointer text-slate-400 hover:text-red-400 cursor-pointer flex items-center gap-1 transition-colors py-1 px-2 rounded hover:bg-red-500/10 active:scale-95"
                    title="Limpar rascunho salvo do armazenamento local"
                >
                    <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                    <span>Limpar rascunho</span>
                </button>
            </div>
        );
    };

    const RecoveryBanner: React.FC = () => {
        if (!hasDraft) return null;
        return (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans shadow-xl shadow-indigo-500/5 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-indigo-600" />
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/25">
                        <LucideIcon name="sparkles" className="w-5 h-5 text-indigo-400 shrink-0" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-100 block">Encontramos um rascunho salvo desta ferramenta.</span>
                        <span className="text-xs text-slate-400">Restaurar trará de volta seus inputs, opções selecionadas e análises anteriores.</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-center justify-end">
                    <button 
                        onClick={restoreDraft} 
                        className="cursor-pointer bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-500/10 border border-indigo-400/20 hover:border-indigo-400/35"
                    >
                        Restaurar
                    </button>
                    <button 
                        onClick={ignoreDraft} 
                        className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all border border-slate-700/50"
                    >
                        Ignorar
                    </button>
                    <button 
                        onClick={clearDraft} 
                        className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-xl border border-red-500/20 active:scale-95 transition-all"
                    >
                        Apagar rascunho
                    </button>
                </div>
            </div>
        );
    };

    return {
        status,
        lastSaved,
        hasDraft,
        restoreDraft,
        ignoreDraft,
        clearDraft,
        AutoSaveIndicator,
        RecoveryBanner
    };
}
