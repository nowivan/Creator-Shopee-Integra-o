import React, { useState, useEffect } from 'react';
import { LucideIcon } from './Common';
import { processGeminiAPI, WORKER_URL, WORKER_TOKEN } from '../utils';
import { postToWorker } from '../services/workerClient';

interface VanessaShopViewProps {
    currentKey: string;
}

export function VanessaShopView({ currentKey }: VanessaShopViewProps) {
    const [product, setProduct] = useState('');
    const [audience, setAudience] = useState('');
    const [benefit, setBenefit] = useState('');
    const [tone, setTone] = useState('choque_preco');
    const [formatoIA, setFormatoIA] = useState('padrao'); 

    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null); 

    // Handle Image Paste
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        handleUploadedFile(file);
                    }
                    break;
                }
            }
        };
        
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // Handle pending frame from Reverse Engineering workspace (Creative Director AI integration)
    useEffect(() => {
        try {
            const pending = localStorage.getItem('robizin_pending_vanessa_frame');
            if (pending) {
                localStorage.removeItem('robizin_pending_vanessa_frame');
                
                const dataURLtoFile = (dataurl: string, filename: string) => {
                    const arr = dataurl.split(',');
                    const mime = arr[0].match(/:(.*?);/)![1];
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while(n--){
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    return new File([u8arr], filename, {type: mime});
                };
                
                const file = dataURLtoFile(pending, `extracted_frame_${Date.now()}.png`);
                handleUploadedFile(file);
            }
        } catch (e) {
            console.error("Error loading pending Vanessa frame:", e);
        }
    }, []);

    const getConfigIA = (formato: string) => {
        if (formato === "grok") {
            return { maxTempo: 6 };
        }
        if (formato === "supergrok") {
            return { maxTempo: 10 };
        }
        if (formato === "veo3") {
            return { maxTempo: 8 };
        }
        if (formato === "sora") {
            return { maxTempo: 15 };
        }
        return { maxTempo: 10 };
    };

    const limitarPorPalavras = (texto: string, maxPalavras: number) => {
        const palavras = texto.split(" ");
        return palavras.slice(0, maxPalavras).join(" ");
    };

    const quebrarRoteiroPorIA = (texto: string, formato: string) => {
        const palavrasPorSegundo = 2.0;
        const limiteTempo = getConfigIA(formato).maxTempo;
        
        const tempoSeguro = limiteTempo * 0.85;
        const maxPalavras = Math.floor(tempoSeguro * palavrasPorSegundo);

        const frases = texto.match(/[^.!?]+[.!?]+/g) || [texto];
        let blocos: string[] = [];
        let atual = "";

        frases.forEach(frase => {
            const fraseLimpa = frase.trim();
            if (!fraseLimpa) return;
            
            const contagemAtual = atual ? atual.split(" ").length : 0;
            const contagemFrase = fraseLimpa.split(" ").length;
            
            if (contagemAtual + contagemFrase <= maxPalavras) {
                atual += (atual ? " " : "") + fraseLimpa;
            } else {
                if (atual) {
                    blocos.push(atual.trim());
                }
                atual = fraseLimpa; 
            }
        });

        if (atual) blocos.push(atual.trim());

        return blocos.map(bloco => limitarPorPalavras(bloco, maxPalavras));
    };

    const formatarBlocosTexto = (blocos: string[], formato: string, emoji = '🎬') => {
        return blocos.map((bloco, i) => {
            const maxTempo = getConfigIA(formato).maxTempo;
            const tempo = `${i * maxTempo}s - ${(i + 1) * maxTempo}s`;
            return `${emoji} BLOCO ${i + 1} (${tempo}):\n${bloco}`;
        }).join('\n\n');
    };

    const calcularTempoFala = (texto: string) => {
        if (!texto) return 0;
        const palavras = texto.trim().split(/\s+/).filter(w => w.length > 0).length;
        const pausas = (texto.match(/[.,!?]/g) || []).length;
        const palavrasPorSegundo = 2.0; 
        const tempoBase = palavras / palavrasPorSegundo;
        const tempoPausas = pausas * 0.4; 
        return Math.ceil(tempoBase + tempoPausas);
    };

    const handleUploadedFile = async (file: File) => {
        setImagePreview(URL.createObjectURL(file));

        setAnalyzing(true);
        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
            }).then(res => res.split(',')[1]);

            const visionPrompt = `Analise esta foto de um produto para venda no TikTok Shop. Extraia as características principais e retorne APENAS um objeto JSON estrito com as seguintes chaves: "produto": (O nome claro e comercial do produto) "publico": (O público-alvo ideal) "beneficio": (O principal problema que ele resolve + os materiais exatos visíveis na foto, ex: aço inox, plástico, etc) NÃO use formatação markdown. Retorne apenas o texto JSON puro.`;

            const payload = { 
                contents: [{
                    parts: [
                        { text: visionPrompt },
                        { inlineData: { mimeType: file.type, data: base64Data } }
                    ]
                }] 
            };

            const response = await postToWorker<any>('/', payload, {
                moduleName: "VanessaShop Visão IA",
                workerUrl: WORKER_URL,
                clientToken: WORKER_TOKEN
            });

            if (!response.ok) throw new Error(response.errorMessage || "Erro ao processar visão.");

            const jsonResult = response.data;
            if (!jsonResult) throw new Error("A IA não retornou a análise de dados estruturada.");

            if (jsonResult.produto) setProduct(jsonResult.produto);
            if (jsonResult.publico) setAudience(jsonResult.publico);
            if (jsonResult.beneficio) setBenefit(jsonResult.beneficio);
        } catch (err: any) {
            console.error("Erro na Visão IA:", err);
            alert("🚨 Falha ao analisar a imagem:\n" + err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUploadedFile(file);
        }
    };

    const handleCopy = () => {
        if (!result) return;
        
        const fallbackCopy = () => {
            const textArea = document.createElement("textarea");
            textArea.value = result;
            textArea.style.position = "fixed"; 
            textArea.style.top = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert("Roteiro copiado com sucesso! (Modo de Segurança)");
            } catch (err) {
                console.error("Fallback de cópia falhou:", err);
                alert("O navegador bloqueou a cópia automática. Por favor, selecione o texto e pressione Ctrl+C.");
            }
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(result)
                .then(() => alert("Roteiro copiado com sucesso!"))
                .catch((err) => {
                    console.warn("Clipboard API bloqueada, tentando fallback...", err);
                    fallbackCopy();
                });
        } else {
            fallbackCopy();
        }
    };

    const handleGenerate = async () => {
        if (!product || !audience || !benefit) {
            alert("⚠️ Por favor, preencha o Produto, Público-Alvo e o Benefício principal (Ou faça upload de uma foto do produto).");
            return;
        }

        setLoading(true);

        if (tone === 'oferta_direta') {
            setTimeout(() => {
                const copys = [
                    `Mano, ${audience}… sério, cansado de pagar isso todo ano? 😩 ${product} agora é pagamento único! Você resolve isso de uma vez e ainda tem ${benefit}. Corre no carrinho antes que tirem essa oferta!`,
                    `Se você é ${audience}, para tudo ✋ ${product} tá em promoção hoje e o melhor: você paga uma vez só! Nada de mensalidade. E ainda tem ${benefit}. Clica no carrinho agora porque isso aqui some rápido!`,
                    `Eu não acredito que ainda tem ${audience} pagando isso todo mês 😳 ${product} é vitalício! Pagou uma vez, acesso liberado pra sempre com ${benefit}. Aproveita agora, essa oferta não fica!`
                ];
                
                let resultText = "";
                
                if (formatoIA === 'grok') {
                    const blocos = quebrarRoteiroPorIA(copys[0], 'grok');
                    resultText = `🔥 OFERTA DIRETA (PAGAMENTO ÚNICO) - GROK 🔥\n\n` + formatarBlocosTexto(blocos, 'grok', '🟢');
                } else if (formatoIA === 'supergrok') {
                    const blocos = quebrarRoteiroPorIA(copys[0], 'supergrok');
                    resultText = `🔥 OFERTA DIRETA (PAGAMENTO ÚNICO) - SUPER GROK 🔥\n\n` + formatarBlocosTexto(blocos, 'supergrok', '🟢');
                } else if (formatoIA === 'veo3') {
                    const blocos = quebrarRoteiroPorIA(copys[1], 'veo3');
                    resultText = `🔥 OFERTA DIRETA (PAGAMENTO ÚNICO) - VEO 3 🔥\n\n` + formatarBlocosTexto(blocos, 'veo3', '🔵');
                } else if (formatoIA === 'sora') {
                    const blocos = quebrarRoteiroPorIA(copys[2], 'sora');
                    resultText = `🔥 OFERTA DIRETA (PAGAMENTO ÚNICO) - SORA 2 🔥\n\n` + formatarBlocosTexto(blocos, 'sora', '🟣');
                } else {
                    resultText = `🔥 OFERTA DIRETA (PAGAMENTO ÚNICO) 🔥\n\n🟢 OPÇÃO 1 (Grok - 6s):\n${copys[0]}\n\n🔵 OPÇÃO 2 (Veo 3 - 8s):\n${copys[1]}\n\n🟣 OPÇÃO 3 (Sora 2 - 15s):\n${copys[2]}`;
                }
                
                setResult(resultText);
                setLoading(false);
            }, 600);
            return;
        }

        try {
            let formatosSolicitados = `Gere os 6 scripts aplicando o Ângulo de Venda escolhido acima, APENAS COM AS FALAS, respeitando a seguinte estrutura e limite de tempo:  🔥 SCRIPTS OTIMIZADOS (APENAS NARRAÇÃO) 🔥  🟢 GROK (6s - Foco em Impulso Rápido): [Fala 1 - Gancho de incredulidade alinhado ao Ângulo de Venda] [Fala 2 - Dor ou frustração do cliente] [Fala 3 - Prova social rápida ou autoridade técnica] [Fala 4 - CTA com urgência fria para o carrinho laranja]  🔵 VEO 3 (8s - Foco em Curiosidade e Inimigo Comum): [Fala 1 - Gancho revelando um segredo da indústria/nicho] [Fala 2 - Agitação da dor relacionada a preços ou qualidade] [Fala 3 - A solução rápida que o produto entrega] [Fala 4 - CTA imperativo para o carrinho laranja]  🟣 SORA 2 (10-15s - Foco em História e Transformação): [Fala 1 - Gancho narrativo direto e pessoal] [Fala 2 - Aprofundamento della dor (como se sentia antes)] [Fala 3 - A transformação nítida de vida/status] [Fala 4 - CTA convidativo apontando para o carrinho laranja]  🟡 POV (7-10s - Foco em Identificação Orgânica): [Fala 1 - "POV:" seguido da narração da situação altamente identificável] [Fala 2 - Frase curta confirmando a transformação ou qualidade do material] [Fala 3 - Chamada nativa apontando para o carrinho laranja]  com as regras de carregar o carrinho laranja.`;

            if (formatoIA === 'tiktok_oficial') {
                formatosSolicitados = `Gere APENAS UM SCRIPT FOCADO, aplicando o Ângulo de Venda escolhido, respeitando ESTRITAMENTE a seguinte estrutura de alta conversão:
                1. Prenda no Início: Chame a atenção rápido; diga o desconto direto!
                2. Destaque "Por Que Agora?": Enfatize ofertas limitadas e preços mais baixos.
                3. Foque nos Benefícios: Explique os principais benefícios e o valor do produto.
                4. CTA Claro: Guie a audiência de forma imperativa para clicar no link do produto no vídeo / carrinho laranja.
                
                Formate o texto separando essas 4 etapas de forma clara, usando emojis correspondentes em cada título da etapa.`;
            } else if (formatoIA !== 'padrao') {
                const config = getConfigIA(formatoIA);
                const palavrasPorSegundo = 2.0;
                const maxPalavras = Math.floor(config.maxTempo * palavrasPorSegundo);
                formatosSolicitados = `Gere APENAS UM TEXTO CONTÍNUO E FLUIDO do roteiro, aplicando o Ângulo de Venda escolhido. Apenas o texto corrido (narrativa), direto ao ponto e altamente persuasivo. Foco total em conversão e retenção. O texto deve ser escrito com frases rítmicas, pensado para ser falado em blocos de ${config.maxTempo} segundos (máximo de ${maxPalavras} palavras por bloco).`;
            }

            const systemPrompt = `Atue como um Especialista Sênior em Copywriting para TikTok Shop e Vídeos Curtos de Alta Conversão. O seu objetivo é criar roteiros focados em conversão imediata, no formato "UGC". REGRAS ABSOLUTAS: 1. O CTA deve obrigatoriamente mencionar o "carrinho laranja" ou "link do produto no vídeo". 2. Seja direto, rápido e frio. Use a linguagem de quem comprou o produto e está fazendo um review sincero. 3. É ESTRITAMENTE PROIBIDO usar clichês de marketing. 4. GERE APENAS O TEXTO FALADO/NARRADO. 5. TRAVA ANTI-ALUCINAÇÃO: Não invente caraterísticas. INFORMAÇÕES DO PRODUTO: Produto/Serviço: ${product} Público-alvo: ${audience} Principal Benefício: ${benefit} Ângulo de Venda: ${tone}. \n\n${formatosSolicitados}`;

            const payload = { 
                contents: [{ parts: [{ text: systemPrompt }] }] 
            };

            const response = await postToWorker<any>('/', payload, {
                moduleName: "VanessaShop Engine Copy",
                workerUrl: WORKER_URL,
                clientToken: WORKER_TOKEN
            });

            if (!response.ok) throw new Error(response.errorMessage || "Erro ao gerar cópia.");

            const responseText = response.raw_text;
            if (!responseText) throw new Error("A IA não retornou texto válido.");
            
            if (formatoIA !== 'padrao' && formatoIA !== 'tiktok_oficial') {
                const blocos = quebrarRoteiroPorIA(responseText, formatoIA);
                let formatoLabel = formatoIA === 'grok' ? '🟢 GROK' : formatoIA === 'supergrok' ? '🟢 SUPER GROK' : formatoIA === 'veo3' ? '🔵 VEO 3' : '🟣 SORA 2';
                
                const formatado = `🔥 ROTEIRO SEGMENTADO (${formatoLabel}) 🔥\n\n` + formatarBlocosTexto(blocos, formatoIA, '🎬');
                setResult(formatado);
            } else {
                setResult(responseText);
            }

        } catch (err: any) {
            console.error("Erro no Engine Copy:", err);
            alert("🚨 Falha ao gerar roteiro Premium:\n" + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
                <div className="glass-panel p-6 rounded-2xl shadow-xl border border-yellow-500/30 bg-slate-900/40">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                            <LucideIcon name="crown" className="w-5 h-5 text-yellow-500" />
                            Engine Copy Premium V2
                        </h2>
                    </div>

                    {/* Drag-drop upload area with preview */}
                    <div 
                        onPaste={(e) => {
                            e.preventDefault();
                            const items = e.clipboardData?.items;
                            if (!items) return;
                            for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf('image') !== -1) {
                                    const file = items[i].getAsFile();
                                    if (file) handleUploadedFile(file);
                                    break;
                                }
                            }
                        }}
                        className="mb-6 p-1 border border-dashed border-yellow-500/50 rounded-xl bg-yellow-500/5 text-center relative hover:bg-yellow-500/10 transition-colors overflow-hidden min-h-[120px] flex items-center justify-center focus:outline-none"
                        tabIndex={0}
                    >
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            disabled={analyzing}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20" 
                        />
                        
                        {imagePreview ? (
                            <div className="relative w-full h-32 flex items-center justify-center pointer-events-none">
                                <img src={imagePreview} alt="Preview do Produto" className="max-h-full max-w-full object-contain rounded-lg" />
                                
                                {analyzing ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm z-10">
                                        <LucideIcon name="scan-eye" className="w-8 h-8 text-yellow-500 mb-2 animate-pulse" />
                                        <span className="text-sm text-yellow-400 font-semibold font-sans">Analisando o produto...</span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg backdrop-blur-sm z-10">
                                        <LucideIcon name="refresh-cw" className="w-8 h-8 text-yellow-500 mb-2" />
                                        <span className="text-sm text-yellow-400 font-semibold font-sans">Clique para trocar a foto</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pointer-events-none py-6">
                                <LucideIcon name="image-plus" className="w-8 h-8 text-yellow-500 mb-2" />
                                <span className="text-sm text-yellow-400 font-semibold font-sans">Preenchimento Automático (Visão IA)</span>
                                <span className="text-xs text-slate-400 mt-1 font-sans">Clique ou dê <b>Ctrl+V</b> para enviar a foto</span>
                            </div>
                        )}
                    </div>
                
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">Produto ou Serviço *</label>
                            <input type="text" value={product} onChange={e => setProduct(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors font-sans" placeholder="Ex: Relógio Olevs de Aço Inox" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">Público-Alvo *</label>
                            <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors font-sans" placeholder="Ex: Homens que querem impor respeito" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">Principal Benefício/Diferencial *</label>
                            <textarea value={benefit} onChange={e => setBenefit(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors h-24 resize-none font-sans" placeholder="Ex: Calendário funcional, a prova d'água, brilha no escuro."></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">Ângulo de Venda (Estratégia) *</label>
                            <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors font-sans">
                                <option value="choque_preco">⚡ Choque de Preço (Foco em Incredulidade/Desconto)</option>
                                <option value="contraste_vitrine">🛍️ Contraste de Vitrine (Parece caro, mas é barato)</option>
                                <option value="status_luxo">👑 Elevador de Status (Foco em Ego e Presença)</option>
                                <option value="oferta_direta">🔥 Oferta Direta (Pagamento Único)</option>
                                <option value="moda_evangelica">✨ Moda Evangélica (Elegância, Pudor e Virtude)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-sans">Formato da Copy (IA Alvo) *</label>
                            <select value={formatoIA} onChange={e => setFormatoIA(e.target.value)} className="w-full bg-black/40 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors font-sans">
                                <option value="padrao">Formato Normal (Todos)</option>
                                <option value="tiktok_oficial">🔥 TikTok Oficial (Oferta Agressiva 30-60s)</option>
                                <option value="grok">⚡ Grok (até 6s)</option>
                                <option value="supergrok">⚡ Super Grok (até 10s)</option>
                                <option value="veo3">🎬 Veo 3 (até 8s)</option>
                                <option value="sora">🚀 Sora (10s - 15s)</option>
                            </select>
                        </div>

                        <button onClick={handleGenerate} disabled={loading || analyzing} className="w-full mt-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 font-sans cursor-pointer">
                            {loading ? (
                                <><LucideIcon name="loader-2" className="w-5 h-5 mr-2 animate-spin" /> Gerando Roteiro Premium...</>
                            ) : (
                                <><LucideIcon name="zap" className="w-5 h-5 mr-2" /> Gerar Máquina de Vendas</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="glass-panel p-6 rounded-2xl shadow-xl flex-1 flex flex-col min-h-[500px] border border-yellow-500/30 bg-slate-900/40 relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
                            <LucideIcon name="file-text" className="w-5 h-5 text-yellow-400" />
                            O Seu Roteiro Premium
                        </h2>
                        {result && (
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 shadow-inner" title="Tempo estimado de fala (2.0 palavras/seg)">
                                    <LucideIcon name="mic" className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-mono text-emerald-100 font-bold">~{calcularTempoFala(result)}s</span>
                                </div>
                                <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors cursor-pointer" title="Copiar">
                                    <LucideIcon name="copy" className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 bg-black/30 border border-slate-700/50 rounded-lg p-5 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-300 relative custom-scrollbar">
                        {result ? result : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 opacity-50 text-center p-6">
                                <LucideIcon name="target" className="w-12 h-12 mb-3 text-yellow-500/50" />
                                <p className="font-sans text-sm">Selecione um Ângulo de Venda e a IA fará a mágica aqui...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
