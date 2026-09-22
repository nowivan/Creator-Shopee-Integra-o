import React, { useState, useRef } from 'react';
import { Card, Button, LucideIcon, VoiceSelector } from './Common';
import { processGeminiAPI, copyToClipboard, safeJSONParse, TTS_WORKER_URL } from '../utils';
import { postToWorker } from '../services/workerClient';

interface AudioToolsProps {
    currentKey: string;
}

// ────────────────────────────────━━━ LYRIA MUSIC ENGINE ━━━────────────────────────────────
export function LyriaMusicView({ currentKey }: AudioToolsProps) {
    const [mood, setMood] = useState('Energetic');
    const [subniche, setSubniche] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const moods = ['Energetic', 'Chill / Lo-Fi', 'Luxury / Soft', 'Tension / Cinematic', 'Vintage / Retro', 'Futuristic / Tech', 'Aesthetic'];

    const handleGenerate = async () => {
        if (!currentKey) return alert("Configure a Chave API.");

        setLoading(true);
        try {
            const prompt = `
                Atue como um Engenheiro e Sound Designer Sênior para o motor de áudio musical Lyria.
                Gere um roteiro de comando musical detalhado em INGLÊS que instrua o Lyria a comissionar a trilha de fundo perfeita para o seguinte nicho/vídeo:
                - Subnicho/Público: "${subniche || 'Geral'}"
                - Mood/Estilo: "${mood}"
                
                Retorne APENAS um JSON válido contendo:
                {
                    "lyria_prompt": "O comando de prompts instrumentais detalhados em inglês para música generativa...",
                    "tempo_bpm": "Média de batidas (ex: 128 BPM)...",
                    "musical_style": "Descrição em português do estilo..."
                }
            `;

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const parsed = safeJSONParse(data.candidates[0].content.parts[0].text, {});
            setResult(parsed);
        } catch (e: any) {
            alert("Erro ao gerar áudio Lyria: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-pink-500/10 text-pink-400 px-3 py-1 rounded-full text-xs font-bold border border-pink-500/20 mb-2">
                    <LucideIcon name="music" className="w-3 h-3" /> AUDIO GENERATIVE
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Lyria Backing Track Engine</h2>
                <p className="text-slate-400">Gere trilhas sonoras perfeitamente orquestradas para reter usuários até o final do vídeo.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <Card className="bg-slate-900/40 border border-slate-700">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Estilo / Vibe do Áudio</label>
                            <div className="relative">
                                <select value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-pink-500 outline-none appearance-none">
                                    {moods.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Subniche / Detalhes (Opcional)</label>
                            <input value={subniche} onChange={e => setSubniche(e.target.value)} placeholder="Ex: Rímel de cílios, Smartwatch esportivo..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-pink-500 outline-none" />
                        </div>
                        <Button onClick={handleGenerate} disabled={loading} className="w-full mt-6 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500" icon={loading ? "loader-2" : "music-2"}>
                            {loading ? "Comissionando Áudio Generativo..." : "Orquestrar Trilha Lyria"}
                        </Button>
                    </Card>
                </div>

                <div className="glass-panel p-6 rounded-xl border border-slate-700 flex flex-col justify-between bg-slate-900/40">
                    <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-700 pb-2"><LucideIcon name="sliders" className="w-4 h-4 text-pink-400" /> Comando do Motor Musical</h3>
                    {!result ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-slate-500 opacity-50 min-h-[150px]">
                            <LucideIcon name="headphones" className="w-12 h-12 mb-2 animate-pulse" />
                            <p className="text-xs text-center px-4">Selecione o estilo de áudio desejado e gere o comando generativo.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-grow animate-fade-in">
                            <div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Lyria Synthesizer Prompt (EN)</span>
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs font-serif text-white flex justify-between items-start gap-2">
                                    <p className="leading-relaxed">{result.lyria_prompt}</p>
                                    <button onClick={() => copyToClipboard(result.lyria_prompt).then(ok=>ok&&alert("Copied Prompt!"))} className="text-slate-400 hover:text-white cursor-pointer"><LucideIcon name="copy" className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <span className="text-pink-400 font-bold block mb-1">Batidas Tempo:</span>
                                    <p className="text-slate-300 font-mono">{result.tempo_bpm}</p>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <span className="text-indigo-400 font-bold block mb-1">Estilo Musical:</span>
                                    <p className="text-slate-300">{result.musical_style}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────━━━ TRANSCRIPTION & NARRATION ━━━────────────────────────────────
export function TranscriptionView({ currentKey }: AudioToolsProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [timeEstimate, setTimeEstimate] = useState<number | null>(null);
    
    // Voice & Optional Narration generation states
    const [selectedVoice, setSelectedVoice] = useState('Aoede');
    const [emotion, setEmotion] = useState('Neutro');
    const [energy, setEnergy] = useState(5);
    const [pace, setPace] = useState('Normal');
    const [speechStyle, setSpeechStyle] = useState('Conversacional');
    const [generatingNarration, setGeneratingNarration] = useState(false);
    const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
    const [ttsError, setTtsError] = useState<string | null>(null);
    
    // Status Confirmation banner state
    const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
            setTranscript('');

            if (currentKey) {
                setLoading(true);
                try {
                    const b64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(f);
                        reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
                        reader.onerror = reject;
                    });
                    
                    const prompt = "Atue como um Especialista em Transcrição. Transcreva com extrema exatidão o áudio/vídeo enviado. Remova apenas gaguejos extremos. Retorne EXATAMENTE o texto falado puro, sem legendas técnicas ou observações.";
                    const data = await processGeminiAPI(currentKey, {
                        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: f.type, data: b64 } }] }]
                    });

                    const textStr = data.candidates[0].content.parts[0].text;
                    setTranscript(textStr);
                    calculateTime(textStr);
                } catch (e: any) {
                    alert("Erro ao transcrever: " + e.message);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const calculateTime = (textInput: string) => {
        if (!textInput) { setTimeEstimate(null); return; }
        const wordCount = textInput.trim().split(/\s+/).length;
        const speed = pace === 'Rápido' ? 3.2 : pace === 'Lento' ? 1.8 : 2.5; 
        setTimeEstimate(Math.ceil(wordCount / speed));
    };

    // optional speech generator caller
    const handleGenerateNarration = async () => {
        if (!transcript) {
            return alert("Por favor, digite ou transcreva um texto primeiro.");
        }
        
        setGeneratingNarration(true);
        setTtsError(null);
        setNarrationAudioUrl(null);

        try {
            const payload = {
                text: transcript,
                voice: selectedVoice,
                emotion: emotion,
                energy: energy,
                pace: pace,
                style: speechStyle
            };

            const response = await postToWorker<any>('/', payload, {
                moduleName: "Vocalize TTS Narração",
                workerUrl: TTS_WORKER_URL,
                clientToken: "" // TTS does not require a signature token by default
            });

            const b64ToBlob = (b64: string, contentType = 'audio/mp3'): Blob => {
                const byteCharacters = atob(b64);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }
                return new Blob(byteArrays, { type: contentType });
            };

            const data = response.raw;
            if (!data) throw new Error("A IA de narração respondeu com formato inválido.");
            
            if (data.error) {
                if (data.audioContent || data.audio || data.data) {
                    const b64Data = data.audioContent || data.audio || data.data;
                    const blob = b64ToBlob(b64Data);
                    const url = URL.createObjectURL(blob);
                    setNarrationAudioUrl(url);
                } else {
                    throw new Error(data.error || "Erro retornado pela API");
                }
            } else if (data.audioContent || data.audio || data.data) {
                const b64Data = data.audioContent || data.audio || data.data;
                const blob = b64ToBlob(b64Data);
                const url = URL.createObjectURL(blob);
                setNarrationAudioUrl(url);
            } else {
                throw new Error("Não foi possível gerar narração: " + (data.raw?.error?.message || "Erro desconhecido."));
            }
        } catch (err: any) {
            console.error("Erro no TTS:", err);
            setTtsError(err.message || "Erro de conexão com o servidor de voz.");
        } finally {
            setGeneratingNarration(false);
        }
    };

    // helper integration functions with ScriptRefiner
    const handleSendToRefiner = (autoTrigger: boolean) => {
        if (!transcript.trim()) {
            return alert("Por favor, digite ou gere um texto para enviar.");
        }

        localStorage.setItem('robizin_refiner_auto_input', transcript);
        if (autoTrigger) {
            localStorage.setItem('robizin_refiner_auto_trigger', 'true');
        } else {
            localStorage.removeItem('robizin_refiner_auto_trigger');
        }

        // Show confirmation message
        setConfirmationMessage("Texto enviado para Refinador de Script.");
        
        // Hide confirmation after 4 seconds
        setTimeout(() => {
            setConfirmationMessage(null);
        }, 4000);

        // Navigate to Refinador de Script
        window.dispatchEvent(new CustomEvent('change-active-view', { detail: 'script-refiner' }));
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setTranscript(val);
        calculateTime(val);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Transcrição & Narração</h2>
                <p className="text-slate-400">Transcreva arquivos de áudio/vídeo automaticamente ou digite seu texto para simular tempos e vozes de IA.</p>
            </div>

            {confirmationMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
                    <LucideIcon name="check-circle" className="w-4 h-4 text-emerald-400 shrink-0" />
                    {confirmationMessage}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/40 border border-slate-700 flex flex-col gap-4">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">1. Fonte de Áudio ou Vídeo</span>
                    <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${file ? 'border-pink-500 bg-pink-500/5' : 'border-slate-700 hover:border-pink-400 hover:bg-slate-800'}`}>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*,video/*" className="hidden" />
                        {!file ? (
                            <div className="pointer-events-none py-4">
                                <LucideIcon name="mic" className="w-10 h-10 mx-auto mb-2 text-slate-500 animate-pulse" />
                                <p className="text-sm text-slate-300 font-bold">Faça o upload do Áudio ou Vídeo</p>
                                <p className="text-xs text-slate-500 mt-1">Carregue arquivos para iniciar transcrição automática</p>
                            </div>
                        ) : (
                            <div>
                                <LucideIcon name="music" className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                                <span className="text-xs text-slate-200 font-semibold truncate max-w-[240px] block mx-auto">{file.name}</span>
                                <span className="text-[10px] text-slate-500 block mt-1">Clique para substituir o arquivo</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="border-t border-slate-800 pt-4 space-y-4">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">2. Configurações de Narração</span>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Narrador / Voz Google AI Studio</label>
                            <VoiceSelector selected={selectedVoice} onChange={(val) => { setSelectedVoice(val); calculateTime(transcript); }} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Emoção</label>
                                <select 
                                    value={emotion} 
                                    onChange={(e) => setEmotion(e.target.value)}
                                    className="w-full bg-slate-850 hover:bg-slate-800 text-white p-2.5 rounded-lg border border-slate-700 focus:border-pink-500 text-xs outline-none transition cursor-pointer"
                                >
                                    <option value="Neutro">Neutro</option>
                                    <option value="Feliz">Feliz / Contente</option>
                                    <option value="Sério">Sério / Corporativo</option>
                                    <option value="Entusiasmado">Entusiasmado / Vendedor</option>
                                    <option value="Dramático">Dramático / Narrativo</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Velocidade (Pace)</label>
                                <select 
                                    value={pace} 
                                    onChange={(e) => { setPace(e.target.value); setTimeout(() => calculateTime(transcript), 50); }}
                                    className="w-full bg-slate-850 hover:bg-slate-800 text-white p-2.5 rounded-lg border border-slate-700 focus:border-pink-500 text-xs outline-none transition cursor-pointer"
                                >
                                    <option value="Lento">Lento</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Rápido">Rápido</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Estilo de Fala</label>
                            <select 
                                value={speechStyle} 
                                onChange={(e) => setSpeechStyle(e.target.value)}
                                className="w-full bg-slate-850 hover:bg-slate-800 text-white p-2.5 rounded-lg border border-slate-700 focus:border-pink-500 text-xs outline-none transition cursor-pointer"
                            >
                                <option value="Conversacional">Conversacional / Casual</option>
                                <option value="Narrativo">Roteiro Corrido / Narrativo</option>
                                <option value="Comercial / Enérgico">Comercial / Enérgico</option>
                                <option value="UGC Dinâmico">UGC Dinâmico (TikTok Style)</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block">Energia da Voz</label>
                                <span className="text-xs font-mono font-bold text-pink-400">{energy} / 10</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={energy} 
                                onChange={(e) => setEnergy(Number(e.target.value))}
                                className="w-full accent-pink-500 h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer" 
                            />
                        </div>

                        <Button 
                            onClick={handleGenerateNarration} 
                            disabled={generatingNarration || loading}
                            className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 font-bold border-transparent text-sm active:scale-95"
                            icon={generatingNarration ? "loader-2" : "audio-lines"}
                        >
                            {generatingNarration ? "Gerando Narração..." : "Gerar Narração"}
                        </Button>

                        {ttsError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[10px] text-red-400 leading-relaxed font-mono">
                                <span className="font-bold block text-red-500 mb-0.5">AVISO DA API :</span>
                                {ttsError}
                                <span className="text-[9px] text-slate-400 block mt-1">Preencha também a sua chave API se o worker exigir.</span>
                            </div>
                        )}

                        {narrationAudioUrl && (
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 space-y-2 animate-fade-in">
                                <span className="text-[10px] text-indigo-400 uppercase font-black tracking-wider block">Narração Gerada com Sucesso</span>
                                <audio controls src={narrationAudioUrl} className="w-full h-8" />
                                <a 
                                    href={narrationAudioUrl} 
                                    download="narracao_creator_intel.mp3" 
                                    className="flex items-center justify-center gap-1.5 w-full bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold py-2 rounded-lg border border-slate-700 transition"
                                >
                                    <LucideIcon name="download" className="w-3.5 h-3.5" />
                                    Baixar Áudio (.mp3)
                                </a>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="bg-slate-900/40 border border-slate-700 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Editor & Transcritor</span>
                            {transcript && (
                                <button 
                                    onClick={() => copyToClipboard(transcript).then(ok => ok && alert("Roteiro copiado!"))} 
                                    className="text-xs text-indigo-400 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1 font-bold"
                                    title="Copiar texto"
                                >
                                    <LucideIcon name="copy" className="w-3.5 h-3.5" />
                                    Copiar
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <LucideIcon name="loader-2" className="animate-spin text-pink-500 mb-2 w-10 h-10" />
                                <p className="text-xs font-bold text-slate-300">Processando áudio com Redes Neurais...</p>
                                <p className="text-[10px] text-slate-500 mt-1">Extraindo texto e cadência da mídia...</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <textarea 
                                    value={transcript} 
                                    onChange={handleTextChange} 
                                    placeholder="Digite seu texto, cole o roteiro ou faça o upload de uma mídia para receber a transcrição automática aqui. Você pode editar este texto livremente para ajustar a narração..." 
                                    className="w-full h-80 bg-slate-950 border border-slate-850 rounded-lg p-3 text-sm text-slate-300 focus:border-pink-500 outline-none resize-none custom-scrollbar"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                    <span>{transcript.trim() ? transcript.trim().split(/\s+/).length : 0} palavras</span>
                                    <span>{transcript.length} caracteres</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 space-y-4">
                        {timeEstimate !== null && (
                            <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl flex items-center justify-between shadow-inner">
                                <div>
                                    <span className="text-[10px] text-pink-400 uppercase font-black tracking-widest block mb-0.5">Tempo Estimado de Narração</span>
                                    <span className="text-base font-black text-white">{timeEstimate} segundos</span>
                                </div>
                                <LucideIcon name="clock" className="w-6 h-6 text-pink-500 opacity-60" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                            <Button 
                                onClick={() => handleSendToRefiner(false)}
                                disabled={!transcript.trim()}
                                className="bg-slate-800 hover:bg-slate-750 text-white font-bold border-slate-700/60 shadow py-3 text-xs"
                                icon="share-2"
                            >
                                Enviar para Refinador
                            </Button>
                            
                            <Button 
                                onClick={() => handleSendToRefiner(true)}
                                disabled={!transcript.trim()}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold border-transparent shadow py-3 text-xs active:scale-95"
                                icon="zap"
                            >
                                Enviar e Refinar
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
