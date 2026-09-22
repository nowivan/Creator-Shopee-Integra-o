import { useState } from 'react';
import { Button, Card, LucideIcon } from './Common';
import { NICHES } from '../constants';
import { processGeminiAPI, safeJSONParse, copyToClipboard, safeSaveHistory } from '../utils';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';
import { createViralIdeaPayload, saveViralHandoffPayload } from '../utils/viralHandoff';

interface IdeationViewProps {
    currentKey: string;
    onNavigate?: (view: string) => void;
}

interface Idea {
    title: string;
    angle: string;
    hook: string;
    sceneConcept: string;
    productUse: string;
    cta: string;
    suggestedVisualPromptEn: string;
    dialoguePtBr: string;
    why: string;
}

export function IdeationView({ currentKey, onNavigate }: IdeationViewProps) {
    const [niche, setNiche] = useState('');
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [sentIdeaIndex, setSentIdeaIndex] = useState<number | null>(null);

    // Handler to send selected viral idea to Creative Director via staged handoff
    const handleSendToCreativeDirector = (idea: Idea, index: number) => {
        const payload = createViralIdeaPayload(idea, niche);
        saveViralHandoffPayload(payload);
        setSentIdeaIndex(index);
        setTimeout(() => setSentIdeaIndex(null), 2500);

        if (onNavigate) {
            onNavigate('create');
        }
    };

    // Create the state object for Autosave & Recovery in Ideador Viral
    const currentState = {
        niche,
        ideas
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (saved.niche !== undefined) setNiche(saved.niche);
        if (saved.ideas !== undefined) setIdeas(saved.ideas);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.niche && (!state.ideas || state.ideas.length === 0);
    };

    const { AutoSaveIndicator, RecoveryBanner } = useAutoSaveRecovery('ideation_view', currentState, handleRestore, isEmptyOrInitial);

    const generateIdeas = async () => {
        if (!niche) {
            setErrorMsg("Por favor, preencha o seu nicho.");
            return;
        }
        if (!currentKey) {
            setErrorMsg("Verifique a API Key nas configurações.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);
        setIdeas([]);

        try {
            const prompt = `Você é um Estrategista de Tráfego Orgânico e Especialista em Vídeos Virais do TikTok Shop e Reels de alta retenção.
            Desta vez, gere exatamente 5 ideias de vídeos de altíssimo engajamento validadas comercialmente para o nicho de e-commerce/infoprodutos: "${niche}". 

            Cada ideia no array JSON de retorno deve ter a seguinte estrutura estrita:
            1. title: Um título explicativo e direto para o conceito.
            2. angle: O ângulo psicológico de vendas (ex: Prova Social, Unboxing Bizarro, Curiosidade Oculta, Inveja Saudável).
            3. hook: Gancho inicial dito com até 15 palavras (linguagem natural, falada, sem clichês ou termos exagerados como "preço de banana").
            4. sceneConcept: Detalhe visual curto do que acontece nos primeiros 3 segundos da tela.
            5. productUse: Como o produto anunciado é introduzido de maneira nativa e orgânica no vídeo.
            6. cta: Uma chamada de fechamento voltada para a ação rápida (como clicar no link ou carrinho).
            7. suggestedVisualPromptEn: Prompt visual descritivo e cinematográfico escrito em inglês técnico para geradores como Veo 3, Runway, Sora ou Kling.
            8. dialoguePtBr: Um roteiro falado em português de no máximo 2-3 frases de alta retenção para gravação rápida.
            9. why: Explicação lógica de por que esse roteiro prende a atenção e converte vendas.

            Formato de Saída (JSON Array estrito, retorne apenas o array sem aspas de markdown):
            [
              {
                "title": "Exemplo",
                "angle": "Exemplo",
                "hook": "Exemplo",
                "sceneConcept": "Exemplo",
                "productUse": "Exemplo",
                "cta": "Exemplo",
                "suggestedVisualPromptEn": "Exemplo",
                "dialoguePtBr": "Exemplo",
                "why": "Exemplo"
              }
            ]`;

            const requestPayload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" },
                toolId: "ideador",
                moduleName: "ideador"
            };

            console.log("Ideation Generator Request Payload:", requestPayload);

            const data = await processGeminiAPI(currentKey, requestPayload, {
                toolId: "ideador",
                moduleName: "ideador"
            });
            console.log("Ideation Generator Raw Response:", data);

            const rawText = data?.raw_text || data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                throw new Error("A IA retornou uma resposta em branco.");
            }

            const parsed = safeJSONParse(rawText, []);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error("Falha ao analisar a lista estruturada de ideias de vídeo.");
            }

            setIdeas(parsed);

            // Save to historical runs
            safeSaveHistory({
                date: new Date().toLocaleString(),
                tool: "Ideador Viral",
                title: `Conceitos de Ideia: ${niche}`,
                content: `Total de Ideias: ${parsed.length}\nNicho: ${niche}\nPrimeira Ideia: ${parsed[0].title}`
            });

        } catch (e: any) {
            console.error("Ideation Generator Error:", e);
            setErrorMsg(e.message || "Erro de conexão ao gerar ideias. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyIdea = (idea: Idea) => {
        const text = `=== CONCEITO DE VÍDEO VIRAL ===
TÍTULO: ${idea.title}
ÂNGULO PERSUASIVO: ${idea.angle}
🎣 GANCHO: "${idea.hook}"
CONCEITO DE CENA (3s): ${idea.sceneConcept}
USO DO PRODUTO: ${idea.productUse}
📢 CHAMADA P/ AÇÃO: ${idea.cta}

🎬 PROMPT VISUAL (EN): ${idea.suggestedVisualPromptEn}

🎙️ DIÁLOGO / COPY (PT-BR):
"${idea.dialoguePtBr}"

💡 POR QUE FUNCIONA: ${idea.why}`;

        copyToClipboard(text).then(ok => ok && alert("A ideia e prompt completo foram copiados!"));
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                    <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20 flex items-center gap-1">
                        <LucideIcon name="lightbulb" className="w-3.5 h-3.5" /> STRATEGY HUB
                    </span>
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                     Ideador Viral <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1"><LucideIcon name="shield-check" className="w-3 h-3 text-emerald-400" /> POLICY SAFE</div>
                </h2>
                <p className="text-slate-400">Gere conceitos, prompts visuais e roteiros validados pela IA livres de bloqueios.</p>
            </div>

            <RecoveryBanner />

            {errorMsg && (
                <div className="bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl p-4 text-xs font-mono leading-relaxed">
                    <strong>Erro no Processamento:</strong> {errorMsg}
                </div>
            )}

            <Card className="flex flex-col sm:flex-row gap-4 items-center bg-slate-900/40 border border-slate-700 p-4">
                <div className="relative flex-1 w-full">
                    <input 
                        type="text" 
                        value={niche} 
                        onChange={(e) => setNiche(e.target.value)} 
                        placeholder="Digite o nicho ou produto (ex: Skin Care, Vestido Floral, Corretor Postural...)" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none text-sm h-12" 
                    />
                </div>
                <Button 
                    onClick={generateIdeas} 
                    disabled={loading} 
                    className="w-full sm:w-auto whitespace-nowrap h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <LucideIcon name="loader-2" className="animate-spin w-4 h-4" />
                            <span>Mapeando Tendências...</span>
                        </>
                    ) : (
                        <>
                            <LucideIcon name="zap" className="w-4 h-4" />
                            <span>Gerar Ideias e Roteiros</span>
                        </>
                    )}
                </Button>
            </Card>

            <div className="grid gap-6">
                {ideas.map((idea, i) => (
                    <div key={i} className="glass-panel p-6 hover:bg-slate-800/20 transition-all border-l-4 border-indigo-500 rounded-r-xl bg-slate-900/40 border border-slate-700/30 relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">CENA VIRAL {i + 1}</span>
                                <h3 className="text-xl font-bold text-white">{idea.title}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleSendToCreativeDirector(idea, i)}
                                    className="text-emerald-400 hover:text-white bg-emerald-950/60 hover:bg-emerald-600 border border-emerald-800/60 hover:border-emerald-500 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    title="Enviar ideia selecionada para o Creative Director como briefing estruturado"
                                >
                                    <LucideIcon name={sentIdeaIndex === i ? "check" : "send"} className="w-3.5 h-3.5" />
                                    <span>{sentIdeaIndex === i ? "Enviado!" : "Enviar para Creative Director"}</span>
                                </button>
                                <button 
                                    onClick={() => handleCopyIdea(idea)} 
                                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                    title="Copiar Idéia, Prompt e Diálogo estruturados"
                                >
                                    <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Completo
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                                <span className="text-slate-400 font-bold block mb-1 uppercase text-[10px] tracking-wider">🎯 Ângulo Persuasivo:</span>
                                <p className="text-slate-200 text-sm">{idea.angle}</p>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                                <span className="text-yellow-400 font-bold block mb-1 uppercase text-[10px] tracking-wider">🎣 Gancho Inicial (Retenção):</span>
                                <p className="text-slate-200 text-sm font-semibold">"{idea.hook}"</p>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                                <span className="text-purple-400 font-bold block mb-1 uppercase text-[10px] tracking-wider">🎬 Conceito da Cena Inicial:</span>
                                <p className="text-slate-200 text-sm">{idea.sceneConcept}</p>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                                <span className="text-teal-400 font-bold block mb-1 uppercase text-[10px] tracking-wider">🛒 Uso Organico do Produto:</span>
                                <p className="text-slate-200 text-sm">{idea.productUse}</p>
                            </div>
                        </div>

                        <div className="mt-4 p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-3">
                            <div>
                                <span className="text-indigo-400 font-black block text-xs uppercase tracking-wider mb-1">🎬 Suggested Visual Prompt (Copy into Sora/Veo/Runway):</span>
                                <div className="flex gap-2 items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                                    <p className="text-xs text-slate-300 flex-1 font-mono">{idea.suggestedVisualPromptEn}</p>
                                    <button 
                                        onClick={() => copyToClipboard(idea.suggestedVisualPromptEn).then(ok => ok && alert("Prompt visual copiado!"))} 
                                        className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                                        title="Copiar prompt de vídeo recomendado"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <span className="text-emerald-400 font-black block text-xs uppercase tracking-wider mb-1">🎙️ Diálogo / Copy PT-BR (Locução Nativa):</span>
                                <div className="flex gap-2 items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                                    <p className="text-sm text-slate-100 flex-1 italic">"{idea.dialoguePtBr}"</p>
                                    <button 
                                        onClick={() => copyToClipboard(idea.dialoguePtBr).then(ok => ok && alert("Diálogo copiado!"))} 
                                        className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                                        title="Copiar diálogo de áudio recomendado"
                                    >
                                        <LucideIcon name="copy" className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 text-xs text-slate-500 flex items-center gap-2 pt-3 border-t border-slate-800">
                            <LucideIcon name="lightbulb" className="w-3.5 h-3.5 text-yellow-500" />
                            <span className="font-bold text-slate-400">Por que funciona:</span> {idea.why}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
