import React, { useState } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { processGeminiAPI, safeJSONParse, copyToClipboard, safeSaveHistory } from '../utils';

// Helper to save successful generations to history
function saveToHistory(tool: string, title: string, content: string) {
    safeSaveHistory({
        date: new Date().toLocaleString(),
        tool,
        title,
        content
    });
}

export function CollageStudioView({ currentKey }: { currentKey: string }) {
    const [images, setImages] = useState<string[]>([]);
    const { feedback: pasteFeedback, error: pasteError } = usePasteImageUpload({
        onImagePasted: (fileObj) => {
            const reader = new FileReader();
            reader.onload = () => {
                setImages(prev => [...prev, reader.result as string].slice(0, 6));
            };
            reader.readAsDataURL(fileObj);
        }
    });
    const [layout, setLayout] = useState('Bento Grid');
    const [aspectRatio, setAspectRatio] = useState('9:16 (Vertical)');
    const [platform, setPlatform] = useState('Instagram Stories');
    const [textOverlay, setTextOverlay] = useState('');
    const [style, setStyle] = useState('Estética UGC Pop');
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [collagePrompt, setCollagePrompt] = useState('');
    const [layoutDesc, setLayoutDesc] = useState('');
    const [activeTab, setActiveTab] = useState<'prompt' | 'desc' | 'json' | 'debug'>('prompt');
    const [rawDebug, setRawDebug] = useState('');

    const handleMultipleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = () => {
                    setImages(prev => [...prev, reader.result as string].slice(0, 6)); // max 6 images
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleClearImages = () => {
        setImages([]);
    };

    const handleGenerate = async () => {
        setLoading(true);
        setErrorMsg(null);
        setCollagePrompt('');
        setLayoutDesc('');
        setRawDebug('');

        const payload = {
            imageCount: images.length,
            layout,
            aspectRatio,
            platform,
            textOverlay,
            style
        };

        console.log("Criador de Colagem Request Payload:", payload);

        try {
            const systemPrompt = `
You are an expert design director and prompt engineer specializing in high-converting ad collages and moodboards.
Your role is to build a top-performing image generation prompt and detailed layout composition blueprint for a photo collage.

Your reply must be a valid JSON object. Do not wrap in markdown \`\`\`json blocks. Return raw JSON only with exactly these fields:
{
  "collage_prompt": "A highly descriptive, rich English prompt for Midjourney/Flux/DALL-E 3 that specifies how to generate this visual collage.",
  "layout_description": "A clear, structured, Portuguese description explaining how to structure this collage layout manually or inside an editor."
}

Use these exact user requirements:
- Total references/images uploaded: ${images.length}
- Target Collage Layout: ${layout}
- Selected Aspect Ratio: ${aspectRatio}
- Destination Platform: ${platform}
- Overlay Text: "${textOverlay}"
- Style preset: ${style}
`;

            const contents = [{ parts: [{ text: systemPrompt }] }];

            const aiData = await processGeminiAPI(currentKey, {
                contents,
                generationConfig: { responseMimeType: "application/json" }
            });

            console.log("Criador de Colagem Raw Response (Gemini):", aiData);
            setRawDebug(JSON.stringify(aiData, null, 2));

            let textResponse = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) {
                throw new Error("A IA retornou um resultado vazio.");
            }

            const parsed = safeJSONParse(textResponse);
            if (!parsed || !parsed.collage_prompt) {
                throw new Error("Não foi possível mapear a resposta estruturada para a cena da colagem.");
            }

            setCollagePrompt(parsed.collage_prompt);
            setLayoutDesc(parsed.layout_description || '');

            const historyText = `Estilo: ${style}\nLayout: ${layout}\n\n=== PROMPT PARA IA ===\n${parsed.collage_prompt}\n\n=== BLUEPRINT ===\n${parsed.layout_description || ''}`;
            saveToHistory("Criador de Colagem", `Colagem ${style}`, historyText);

        } catch (err: any) {
            console.error("Criador de Colagem Error:", err);
            setErrorMsg(err.message || "Erro de conexão ao processar imagem de colagem.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPrompt = () => {
        copyToClipboard(collagePrompt).then(ok => ok && alert("Prompt da colagem copiado com sucesso!"));
    };

    const handleCopyDesc = () => {
        copyToClipboard(layoutDesc).then(ok => ok && alert("Descrição do layout copiada!"));
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                    <LucideIcon name="layout-grid" className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white font-sans">Criador de Colagem</h2>
                    <p className="text-xs text-slate-400 font-sans">Desenvolva composições, overlays e presets visuais perfeitos para múltiplos canais.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* INPUT SECTION */}
                <div className="lg:col-span-5 space-y-4">
                    <Card className="bg-slate-900/60 border-slate-800/80 p-5 space-y-4">
                        <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider font-mono">Configurações da Colagem</span>
                        
                        <div className="space-y-3 font-sans text-xs">
                            {/* Drag & multi file upload */}
                            <div>
                                <label className="block text-slate-400 mb-1 font-semibold">Imagens de Referência ({images.length}/6)</label>
                                <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 text-center bg-slate-950 relative transition cursor-pointer">
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        onChange={handleMultipleUpload} 
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                    />
                                    <LucideIcon name="cloud-upload" className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                                    <p className="font-bold text-slate-300">Upload, arraste ou pressione Ctrl+V para colar imagem</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Selecione ou cole múltiplas imagens (Max 6)</p>
                                    {pasteError && (
                                        <p className="text-[10px] text-red-500 mt-1 leading-tight font-sans">
                                            {pasteError}
                                        </p>
                                    )}
                                    {pasteFeedback && (
                                        <p className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans">
                                            ✓ {pasteFeedback.message} ({pasteFeedback.name})
                                        </p>
                                    )}
                                </div>
                                
                                {images.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex gap-1 overflow-x-auto py-1 custom-scrollbar">
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative w-12 h-12 rounded border border-slate-800 bg-slate-950 flex-shrink-0">
                                                    <img src={img} className="w-full h-full object-cover rounded" />
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={handleClearImages} className="text-[10px] text-red-400 hover:underline flex items-center gap-1 font-mono cursor-pointer">
                                            <LucideIcon name="trash" className="w-3 h-3" /> Limpar tudo
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Selectors */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 mb-1">Layout Principal</label>
                                    <select value={layout} onChange={(e) => setLayout(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-300">
                                        <option>Bento Grid</option>
                                        <option>Split Horizontal</option>
                                        <option>Split Vertical</option>
                                        <option>Symmetric Masonry</option>
                                        <option>Cinematic Moodboard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Proporção (Aspect Ratio)</label>
                                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-300">
                                        <option>9:16 (Vertical)</option>
                                        <option>1:1 (Quadrado)</option>
                                        <option>16:9 (Horizontal)</option>
                                        <option>4:5 (Instagram Feed)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 mb-1">Plataforma-Alvo</label>
                                    <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-300">
                                        <option>Instagram Stories</option>
                                        <option>Pinterest Ad</option>
                                        <option>TikTok Promo</option>
                                        <option>Facebook Banner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Preset de Estilo</label>
                                    <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-300">
                                        <option>Estética UGC Pop</option>
                                        <option>Minimalista Luxury</option>
                                        <option>Cyberpunk Retro</option>
                                        <option>Cozinha Orgânica</option>
                                        <option>Sleek Editorial</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1 font-semibold">Texto Sobreposto (Overlay)</label>
                                <input 
                                    type="text" 
                                    value={textOverlay} 
                                    onChange={(e) => setTextOverlay(e.target.value)} 
                                    placeholder="Ex: SEU CORPO AGRADECE (Opcional)" 
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 outline-none focus:border-indigo-500 transition" 
                                />
                            </div>

                            <Button 
                                onClick={handleGenerate} 
                                disabled={loading} 
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold border-indigo-500/20"
                                icon={loading ? "loader-2" : "wand"}
                            >
                                {loading ? "Construindo Colagem..." : "Gerar Prompt de Colagem"}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* OUTPUT DISPLAY */}
                <div className="lg:col-span-7 flex flex-col font-sans">
                    <Card className="bg-slate-900/60 border-slate-800/80 p-5 flex-1 flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                            <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-wider">Preview e Layout da Colagem</span>
                            {collagePrompt && (
                                <button onClick={handleCopyPrompt} className="text-[9px] bg-indigo-500/10 text-indigo-400 hover:text-white px-2.5 py-1 rounded border border-indigo-500/20 transition cursor-pointer flex items-center gap-1 font-mono">
                                    <LucideIcon name="copy" className="w-3 h-3" /> Copiar Prompt
                                </button>
                            )}
                        </div>

                        {errorMsg && (
                            <div className="bg-red-950/20 text-red-400 border border-red-500/20 rounded-lg p-3 text-xs font-mono my-2">
                                <strong>Erro na geração:</strong> {errorMsg}
                            </div>
                        )}

                        {!collagePrompt ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-16">
                                <LucideIcon name="layout-grid" className="w-12 h-12 mb-2 animate-pulse" />
                                <p className="text-xs font-mono">Preencha e envie para estruturar sua colagem.</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col space-y-4">
                                {/* Tab Navigation */}
                                <div className="flex gap-2 border-b border-slate-850 pb-2">
                                    <button onClick={() => setActiveTab('prompt')} className={`text-[10px] font-bold pb-1 cursor-pointer transition ${activeTab === 'prompt' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500'}`}>Prompt da Colagem</button>
                                    <button onClick={() => setActiveTab('desc')} className={`text-[10px] font-bold pb-1 cursor-pointer transition ${activeTab === 'desc' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500'}`}>Estrutura do Layout</button>
                                    <button onClick={() => setActiveTab('debug')} className={`text-[10px] font-bold pb-1 cursor-pointer transition ${activeTab === 'debug' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-slate-500'}`}>Debug Payload</button>
                                </div>

                                {/* Tab Contents */}
                                <div className="flex-1 bg-black/40 border border-slate-850 rounded-xl p-4 overflow-y-auto max-h-[300px]">
                                    {activeTab === 'prompt' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-slate-300 leading-relaxed font-mono select-all bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                                                {collagePrompt}
                                            </p>
                                            <Button onClick={handleCopyPrompt} className="py-2 text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800" icon="copy">
                                                Copiar Prompt Final
                                            </Button>
                                        </div>
                                    )}

                                    {activeTab === 'desc' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {layoutDesc || 'Nenhuma descrição estrutural adicional foi retornada.'}
                                            </p>
                                            <Button onClick={handleCopyDesc} className="py-2 text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800" icon="copy">
                                                Copiar Layout Blueprint
                                            </Button>
                                        </div>
                                    )}

                                    {activeTab === 'debug' && (
                                        <pre className="text-[9px] text-indigo-200 font-mono whitespace-pre-wrap leading-normal">
                                            {rawDebug}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
