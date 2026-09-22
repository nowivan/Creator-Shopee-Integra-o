import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { Card, Button, LucideIcon } from './Common';

interface ErrorBoundaryProps {
    children?: ReactNode;
    key?: any;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public props: ErrorBoundaryProps;
    public state: ErrorBoundaryState = {
        hasError: false
    };

    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.props = props;
    }

    public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an uncaught rendering error:", error, errorInfo);
    }

    private handleReset = () => {
        try {
            // Find all localStorage keys starting with 'robizin_' and clear them
            const keysToClear: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('robizin_')) {
                    keysToClear.push(key);
                }
            }
            keysToClear.forEach(key => localStorage.removeItem(key));

            // Also clear all sessionStorage keys
            sessionStorage.clear();
        } catch (e) {
            console.error("Error clearing state on reset:", e);
        }
        // Force reload the page to restart with a clean slate
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div id="error-boundary-screen" className="max-w-md mx-auto text-center py-16 px-4 space-y-6 font-sans">
                    <div id="error-boundary-icon-wrapper" className="relative inline-flex items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <LucideIcon name="alert-triangle" className="w-12 h-12 text-red-400 animate-pulse" />
                    </div>
                    <div id="error-boundary-text-container" className="space-y-3">
                        <h2 className="text-xl font-bold text-white">Algo deu errado nesta ferramenta.</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Você pode resetar a sessão local e tentar novamente.
                        </p>
                    </div>
                    <div id="error-boundary-action-container" className="pt-2">
                        <button
                            id="reset-app-action-btn"
                            onClick={this.handleReset}
                            className="cursor-pointer mx-auto shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 relative flex items-center justify-center gap-2 group text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl px-6 py-3 border border-indigo-400/20 active:scale-95 transition-all duration-200"
                        >
                            <LucideIcon name="rotate-ccw" className="w-4 h-4 text-indigo-200" />
                            Resetar App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export function HistoryView() {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('robizin_historical_runs') || '[]');
            setHistory(saved);
        } catch(e) {}
    }, []);

    const clearHistory = () => {
        if (confirm("Tem certeza que deseja apagar todo o histórico de execuções?")) {
            localStorage.removeItem('robizin_historical_runs');
            setHistory([]);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2"><LucideIcon name="history" className="text-indigo-400" /> Histórico de Cópias</h2>
                    <p className="text-slate-400 text-left">Suas rodadas de geração e scripts salvos localmente.</p>
                </div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs bg-red-600/10 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-xl border border-red-500/35 transition font-bold flex items-center gap-2 cursor-pointer">
                        <LucideIcon name="trash-2" className="w-4 h-4" /> Limpar Histórico
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="text-center py-16 text-slate-600 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center">
                    <LucideIcon name="folder-open" className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">Nenhum script no histórico ainda.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {history.map((run, i) => (
                        <Card key={i} className="bg-slate-900/40 border-slate-700/70 p-5 space-y-3 relative group">
                            <span className="absolute top-4 right-4 text-[10px] text-slate-500 font-mono">{run.date}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">{run.tool}</span>
                                <h3 className="font-bold text-white text-base">{run.title}</h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800 font-sans">
                                {run.content}
                            </p>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export function NotFoundView({ onNavigate }: { onNavigate: (view: string) => void }) {
    return (
        <div className="max-w-md mx-auto text-center py-16 space-y-6 font-sans">
            <LucideIcon name="alert-circle" className="w-16 h-16 text-indigo-500 mx-auto animate-bounce" />
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">Oops! Página não encontrada.</h2>
                <p className="text-sm text-slate-400">A ferramenta que você tentou acessar não existe ou foi movida.</p>
            </div>
            <Button onClick={() => onNavigate('dashboard')} className="mx-auto" icon="home">
                Voltar para o Dashboard
            </Button>
        </div>
    );
}
