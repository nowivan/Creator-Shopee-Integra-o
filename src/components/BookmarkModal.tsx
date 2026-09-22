import React, { useState, useEffect } from 'react';
import { LucideIcon } from './Common';
import { DASH_TOOLS } from '../constants';
import { useFirebase } from '../context/FirebaseContext';

interface BookmarkModalProps {
    activeView: string;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export function BookmarkModal({ activeView, onClose, onSaveSuccess }: BookmarkModalProps) {
    const { addBookmark } = useFirebase();
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const activeTool = DASH_TOOLS.find(t => t.id === activeView);

    useEffect(() => {
        if (activeTool) {
            // Suggest a neat default title based on current date/time
            const currentDatetime = new Date().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            setTitle(`Configuração ${activeTool.label} (${currentDatetime})`);
        }
    }, [activeTool]);

    const handleSave = async () => {
        if (!activeView || !activeTool) return;
        if (!title.trim()) {
            setErrorMsg("Por favor, insira um nome identificar para este favorito.");
            return;
        }

        try {
            // Retrieve current autosaved state
            const storageKey = `robizin_autosave_${activeView}`;
            const stateRaw = localStorage.getItem(storageKey);

            if (!stateRaw) {
                setErrorMsg(`Nenhum dado ou configuração foi detectado nesta ferramenta para ser salvo. Faça alguma alteração ou geração antes de favoritar!`);
                return;
            }

            const stateParsed = JSON.parse(stateRaw);
            
            // Validate that we aren't saving a totally empty state
            if (!stateParsed || typeof stateParsed !== 'object') {
                setErrorMsg("Não há configurações válidas para salvar.");
                return;
            }

            await addBookmark(
                activeView,
                activeTool.label,
                activeTool.icon || '',
                title.trim(),
                notes.trim(),
                stateParsed
            );

            setSuccess(true);
            setTimeout(() => {
                onSaveSuccess();
                onClose();
            }, 1000);
        } catch (e) {
            console.error("Failed to save bookmark", e);
            setErrorMsg("Ocorreu um erro ao salvar o favorito.");
        }
    };


    if (!activeTool) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[#0F0F11] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl shadow-black animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-neutral-800 bg-[#121214] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <LucideIcon name="bookmark" className="w-4 h-4 shadow-sm" />
                        </div>
                        <h3 className="font-bold text-white text-sm font-sans">Salvar aos Favoritos</h3>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-350 cursor-pointer">
                        <LucideIcon name="x" className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4 font-sans text-xs">
                    <div className="p-3.5 bg-neutral-950/40 border border-neutral-800 rounded-xl flex items-center gap-3">
                        <div className="text-2xl">{activeTool.icon}</div>
                        <div>
                            <span className="text-[10px] uppercase font-mono font-bold text-neutral-500 leading-none">Ferramenta Ativa</span>
                            <span className="text-neutral-200 font-bold block mt-0.5">{activeTool.label}</span>
                        </div>
                    </div>

                    {success ? (
                        <div className="py-6 text-center text-emerald-400 space-y-2 animate-fade-in">
                            <LucideIcon name="check-circle" className="w-10 h-10 mx-auto text-emerald-500 animate-bounce" />
                            <p className="font-bold text-sm">Salvo com Sucesso!</p>
                            <p className="text-[10px] text-neutral-500">Esta configuração agora está visível no seu Painel.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {errorMsg && (
                                <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 rounded-xl leading-relaxed">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-neutral-500 uppercase font-black">Nome do Favorito</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => {
                                        setTitle(e.target.value);
                                        setErrorMsg(null);
                                    }}
                                    placeholder="Ex: Roteiro Shampoo Barbearia"
                                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:border-indigo-500 focus:outline-none transition font-sans text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-mono text-neutral-500 uppercase font-black">Anotações / Descrição (Opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ex: Ângulo Baixo, oferta de R$129, criativo UGC de alta conversão"
                                    rows={3}
                                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:border-indigo-500 focus:outline-none transition resize-none font-sans text-xs"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold hover:bg-neutral-800 transition active:scale-95 cursor-pointer text-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-450 hover:to-teal-550 transition active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer text-center"
                                >
                                    Salvar Favorito
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
