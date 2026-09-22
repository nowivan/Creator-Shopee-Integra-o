import React, { useState, useEffect } from 'react';
import { DASH_TOOLS } from '../constants';
import { LucideIcon } from './Common';
import { useFirebase } from '../context/FirebaseContext';
import { StatisticsCockpitPanel } from './telemetry/StatisticsCockpitPanel';

const HISTORY_KEY = "robizin_history_v1";

export function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveHistory(items: any[]) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {}
}

export function pushHistory(prev: any[], toolId: string) {
    const tool = DASH_TOOLS.find(t => t.id === toolId);
    const label = tool?.label || toolId;

    const item = { toolId, label, ts: Date.now() };
    const next = [item, ...prev.filter(x => x.toolId !== toolId)].slice(0, 12);
    return next;
}

function fmtTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface DashboardViewProps {
    onOpenTool: (toolId: string) => void;
    bookmarkUpdateTrigger?: number;
}

export function DashboardView({ onOpenTool, bookmarkUpdateTrigger = 0 }: DashboardViewProps) {
    const { bookmarks, history, deleteBookmark, clearHistory, user } = useFirebase();

    const handleRestoreBookmark = (bm: any) => {
        try {
            // Save state to active autosave key
            localStorage.setItem(`robizin_autosave_${bm.toolId}`, JSON.stringify(bm.state));
            // Set force restore flag for useAutoSaveRecovery
            localStorage.setItem(`robizin_force_restore_${bm.toolId}`, 'true');
            // Navigate to the tool!
            onOpenTool(bm.toolId);
        } catch (e) {
            console.error("Failed to restore bookmark", e);
        }
    };

    const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent launching
        deleteBookmark(id);
    };

    const featured = DASH_TOOLS.find(t => t.featured) || DASH_TOOLS[0];
    const others = DASH_TOOLS.filter(t => t.id !== featured.id);

    return (
        <div className="p-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header / Premium Welcome Banner */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B]/85 to-[#0F172A] border border-slate-800/70 p-6 md:p-8 rounded-[2rem] relative overflow-hidden shadow-2xl mb-8 group">
                {/* Visual glows and patterns */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-indigo-500/15 transition-colors duration-500"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-4 max-w-3xl">
                        {/* Slogan pill */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-mono font-bold text-indigo-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span>
                            <span>Analise. Remodele. Domine.</span>
                        </div>
                        
                        <div className="space-y-1">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight">
                                Creator Intelligence Pro
                            </h1>
                            <p className="text-sm font-semibold tracking-wide uppercase text-indigo-400/90 font-mono">
                                Suite de IA para Criadores Profissionais
                            </p>
                        </div>
                        
                        <div className="text-slate-450 text-sm leading-relaxed space-y-2">
                            <span className="text-slate-200 font-bold block text-base">
                                Bem-vindo ao Creator Intelligence Pro.
                            </span>
                            <p className="text-slate-300">
                                Sua plataforma de inteligência criativa para análise, engenharia reversa, remodelagem de criativos e geração de conteúdo com IA.
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                                Transforme referências em estratégias, estratégias em criativos e criativos em resultados.
                            </p>
                            <p className="text-indigo-450 font-bold text-[11px] font-mono tracking-wide uppercase">
                                Analise. Remodele. Domine.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0 justify-end pt-2 lg:pt-0">
                        <button
                            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/30 text-sm font-bold text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                            onClick={() => onOpenTool(featured.id)}
                        >
                            {featured.icon} <span>Ir para {featured.label}</span>
                            <LucideIcon name="arrow-right" className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center justify-center lg:justify-end gap-1.5 text-[10px] font-mono text-slate-500">
                            <LucideIcon name="database" className="w-3.5 h-3.5" />
                            <span>Storage Local Ativo (V4.8.2)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Dashboard / Overview Cockpit (Etapa 2) */}
            <div className="mb-10">
                <StatisticsCockpitPanel onOpenTool={onOpenTool} />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Ferramentas */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Acesso rápido</h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">{DASH_TOOLS.length} ferramentas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Card destacado */}
                        <button
                            onClick={() => onOpenTool(featured.id)}
                            className="text-left rounded-3xl p-5 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 hover:border-indigo-500/50 transition-all group relative overflow-hidden shadow-lg hover:shadow-2xl"
                        >
                            {/* Glow suave no fundo */}
                            <div
                                className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-30 pointer-events-none"
                                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 60%)" }}
                            />

                            <div className="absolute top-0 right-0 flex items-start">
                                {featured.ai === 'perplexity' && (
                                    <div className="bg-[#22d3ee]/20 text-[#22d3ee] text-[9px] font-black px-3 py-1 rounded-bl-xl border-b border-l border-[#22d3ee]/30 flex items-center gap-1 tracking-widest backdrop-blur-sm shadow-sm mr-2">
                                        <LucideIcon name="cpu" className="w-3 h-3" /> GEMINI
                                    </div>
                                )}
                                {featured.ai === 'gemini' && (
                                    <div className="bg-blue-500/20 text-blue-300 text-[9px] font-black px-3 py-1 rounded-bl-xl border-b border-l border-blue-500/30 flex items-center gap-1 tracking-widest backdrop-blur-sm shadow-sm mr-2">
                                        <LucideIcon name="sparkles" className="w-3 h-3" /> GEMINI
                                    </div>
                                )}
                                <div className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-indigo-500/20">
                                    Recomendado
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                    {featured.icon}
                                </div>
                                <div className="min-w-0 flex-1 pr-4">
                                    <div className="font-bold text-white text-lg truncate group-hover:text-indigo-400 transition-colors">{featured.label}</div>
                                    <div className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{featured.desc}</div>
                                    <div className="text-[10px] text-slate-500 mt-2 opacity-75">
                                        Dica: use ofertas + escassez + CTA direto no vídeo.
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Outros cards */}
                        {others.map(t => (
                            <button
                                key={t.id}
                                onClick={() => onOpenTool(t.id)}
                                className="text-left rounded-2xl p-4 bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all hover:translate-x-1 relative overflow-hidden group/card"
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-slate-900/50 border border-slate-700/50 grid place-items-center text-2xl flex-shrink-0 group-hover/card:scale-110 transition-transform">
                                        {t.icon}
                                    </div>
                                    <div className="min-w-0 flex-1 pr-14">
                                        <div className="font-semibold text-slate-200 truncate">{t.label}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.desc}</div>
                                    </div>
                                </div>
                                
                                {t.ai === 'perplexity' && (
                                    <div className="absolute top-0 right-0 bg-[#22d3ee]/10 text-[#22d3ee] text-[8px] font-black px-2 py-1 rounded-bl-lg border-l border-b border-[#22d3ee]/20 flex items-center gap-1 tracking-widest shadow-sm">
                                        <LucideIcon name="cpu" className="w-2.5 h-2.5" /> PERPLEXITY
                                    </div>
                                )}
                                {t.ai === 'gemini' && (
                                    <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-[8px] font-black px-2 py-1 rounded-bl-lg border-l border-b border-blue-500/20 flex items-center gap-1 tracking-widest shadow-sm">
                                        <LucideIcon name="sparkles" className="w-2.5 h-2.5" /> GEMINI
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Histórico e Favoritos */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Seus Favoritos Component */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <LucideIcon name="bookmark" className="w-4 h-4 text-emerald-400" /> Favoritos & Saved
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded-full">
                                {bookmarks.length} itens
                            </span>
                        </div>

                        <div className="bg-[#0B0B0D] rounded-3xl border border-neutral-800 p-2.5 min-h-[160px] max-h-[380px] overflow-y-auto custom-scrollbar space-y-2">
                            {bookmarks.length === 0 ? (
                                <div className="py-10 text-center text-neutral-500 flex flex-col items-center justify-center">
                                    <LucideIcon name="bookmark" className="w-8 h-8 text-neutral-700 mb-2 animate-pulse" />
                                    <p className="text-xs font-semibold text-neutral-400">Nenhum favorito salvo</p>
                                    <p className="text-[10px] text-neutral-500 mt-1 max-w-[190px] mx-auto leading-normal">
                                        Use o botão <span className="text-emerald-400 font-bold">Favoritar</span> no topo ao usar uma ferramenta.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {bookmarks.map((bm) => (
                                        <div
                                            key={bm.id}
                                            onClick={() => handleRestoreBookmark(bm)}
                                            className="p-3 bg-[#0F0F13] hover:bg-[#131317] border border-neutral-800 rounded-2xl transition duration-150 group cursor-pointer relative overflow-hidden flex flex-col gap-1.5"
                                        >
                                            <div className="flex items-start justify-between gap-2.5 relative z-10">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-lg shrink-0 select-none block leading-none">{bm.toolIcon}</span>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-neutral-200 group-hover:text-emerald-400 text-xs block truncate leading-tight transition-colors">
                                                            {bm.title}
                                                        </span>
                                                        <span className="text-[9px] text-neutral-500 font-mono mt-0.5 block uppercase tracking-wider">
                                                            {bm.toolLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteBookmark(bm.id, e)}
                                                    className="text-neutral-500 hover:text-red-450 p-1 rounded hover:bg-red-500/10 cursor-pointer transition flex shrink-0 active:scale-90"
                                                    title="Deletar favorito"
                                                >
                                                    <LucideIcon name="trash-2" className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {bm.notes && (
                                                <p className="text-[10px] text-neutral-450 leading-relaxed bg-[#060608]/40 border border-neutral-900/50 px-2 py-1.5 rounded-lg italic line-clamp-2">
                                                    {bm.notes}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-neutral-600 mt-0.5 pt-1.5 border-t border-neutral-900/50">
                                                <span>SALVO EM {fmtTime(bm.timestamp)}</span>
                                                <span className="text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-mono uppercase">
                                                    RESTAURAR <LucideIcon name="corner-down-left" className="w-2.5 h-2.5" />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-neutral-800/80"></div>

                    {/* Histórico original */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Continue</h3>
                            <button
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 text-xs font-medium transition border border-slate-700 hover:border-red-900/50 cursor-pointer"
                                onClick={clearHistory}
                            >
                                Limpar
                            </button>
                        </div>

                        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-2 min-h-[160px]">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 opacity-60">
                                    <LucideIcon name="history" className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">Ainda sem histórico.</p>
                                    <button
                                        className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition text-slate-300 cursor-pointer"
                                        onClick={() => onOpenTool(featured.id)}
                                    >
                                        Começar Agora
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {history.slice(0, 8).map((h, idx) => (
                                        <button
                                            key={h.id || (h.timestamp || h.ts) + "_" + idx}
                                            onClick={() => onOpenTool(h.toolId)}
                                            className="w-full text-left p-3 rounded-2xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition group cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.8)] transition-shadow"></div>
                                                    <span className="font-medium text-slate-300 group-hover:text-white text-sm truncate">{h.label}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-600 group-hover:text-indigo-400 font-mono whitespace-nowrap">{fmtTime(h.timestamp || h.ts)}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dedicated Platform About & Footer Section at the bottom of Dashboard */}
            <div className="mt-12 pt-8 border-t border-slate-900/80 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                <div className="md:col-span-8 space-y-3">
                    <h4 className="text-sm font-bold text-slate-300 font-mono tracking-wider uppercase">Sobre o Creator Intelligence Pro</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-4xl font-sans">
                        Creator Intelligence Pro é uma plataforma avançada de inteligência criativa que combina engenharia reversa, análise de DNA de conteúdo, remodelagem de criativos, direção criativa assistida por IA e geração de prompts cinematográficos para ajudar criadores, afiliados e profissionais de marketing a produzir conteúdos de alta performance.
                    </p>
                </div>
                <div className="md:col-span-4 flex flex-col md:items-end justify-between self-stretch text-left md:text-right gap-3">
                    <div className="space-y-1">
                        <div className="font-extrabold text-white text-base tracking-tight font-sans">Creator Intelligence Pro</div>
                        <div className="text-[10px] text-indigo-400 font-mono tracking-wide uppercase">Suite de IA para Criadores Profissionais</div>
                        <div className="text-[10px] text-slate-500 font-mono italic">Analise. Remodele. Domine.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
