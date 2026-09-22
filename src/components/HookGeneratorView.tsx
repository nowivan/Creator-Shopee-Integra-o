import React, { useState, useEffect } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { NICHES, POLICY_INSTRUCTION, REFINER_CTAS, EMOTION_TRIGGERS } from '../constants';
import { processGeminiAPI, safeJSONParse, copyToClipboard, WORKER_URL, WORKER_TOKEN, sessionStore, safeSaveHistory } from '../utils';
import { postToWorker } from '../services/workerClient';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';

interface HookGeneratorViewProps {
    currentKey: string;
}

const SCRIPT_FORMULA = {
    "interrupcao": [
        "mano, olha isso 😳",
        "para tudo olha isso aqui",
        "eu não tava acreditando nisso",
        "ninguém tá falando disso ainda",
        "olha isso até o final",
        "eu descobri isso sem querer",
        "isso aqui tá escondido",
        "mano sério olha isso aqui",
        "você não vai acreditar nisso",
        "isso aqui virou febre"
    ],
    "curiosidade": [
        "tem um detalhe nisso que ninguém fala",
        "isso aqui é diferente",
        "tem um segredo nisso",
        "isso aqui surpreende",
        "isso aqui muda tudo",
        "ninguém percebe isso",
        "olha esse detalhe",
        "todo mundo quer",
        "isso aqui resolve um problema que você nem percebeu",
        "eu testei e deu nisso"
    ],
    "oferta": [
        "com desconto hoje",
        "preço muito baixo hoje",
        "com desconto",
        "tá em promoção hoje",
        "preço absurdo hoje",
        "preço ridículo hoje",
        "com promoção",
        "de R$199 por R$39,90",
        "mais barato que um lanche"
    ],
    "urgencia": [
        "tá acabando",
        "últimas unidades",
        "já já sobe o preço",
        "acabando rápido",
        "só hoje",
        "tá acabando agora",
        "se você demorar já era",
        "últimas unidades mesmo",
        "já já acaba",
        "não vai durar",
        "isso aqui tá sumindo",
        "estoque quase zerado",
        "acabou pra muita gente",
        "só restam poucas"
    ],
    "cta": [
        "clica agora",
        "aproveita",
        "corre",
        "garante",
        "clica",
        "clica no carrinho laranja",
        "corre antes que acabe"
    ]
};

const lealTemplates = [
    { type: 'Autoridade', text: `Como eu fiz R$ 20 mil em 2 dias vendendo {product} no TikTok Shop.` },
    { type: 'Curiosidade', text: `O erro fatal que 90% dos afiliados cometem ao anunciar {product}.` },
    { type: 'Urgência', text: `Lote de {product} liberado agora! Quem pegar esse lote vai pagar muito abaixo do preço.` },
    { type: 'Prova Social', text: `Por que o {product} é o produto número 1 em vendas no Calodata hoje.` },
    { type: 'Retenção', text: `Pare de rolar a tela! Eu vou te mostrar como faturar alto com {product} sem precisar fazer live.` }
];

export function HookGeneratorView({ currentKey }: HookGeneratorViewProps) {
    const [hookMode, setHookMode] = useState(() => sessionStore.get('hook_mode', 'auto')); // 'auto' | 'manual' | 'formula' | 'leal'
    
    // Auto Mode States
    const [autoConfig, setAutoConfig] = useState(() => sessionStore.get('hook_auto_config', {
        niche: NICHES[0],
        product: '',
        objective: 'Direct Sales (Conversion)',
        temperature: 'Warm'
    }));
    
    // Manual Mode States
    const [inputs, setInputs] = useState(() => sessionStore.get('hook_manual_inputs', {
        produto: '',
        publico: '',
        dor: '',
        desejo: '',
        objecao: ''
    }));

    const [formulaResult, setFormulaResult] = useState<any>(() => sessionStore.get('hook_formula_result', null));
    const [formulaNiche, setFormulaNiche] = useState(() => sessionStore.get('hook_formula_niche', ''));

    const [lealProduct, setLealProduct] = useState(() => sessionStore.get('hook_leal_product', ''));
    const [lealHooks, setLealHooks] = useState<any[]>(() => sessionStore.get('hook_leal_hooks', []));

    const [hooks, setHooks] = useState<any[]>(() => sessionStore.get('hook_hooks', [])); 
    const [idealScript, setIdealScript] = useState(() => sessionStore.get('hook_ideal_script', '')); 
    const [engineResult, setEngineResult] = useState<any>(() => sessionStore.get('hook_engine_result', null)); 
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [analyzingImage, setAnalyzingImage] = useState(false);

    // Create the state object for Autosave & Recovery in Hook Generator
    const currentState = {
        hookMode,
        autoConfig,
        inputs,
        formulaResult,
        formulaNiche,
        lealProduct,
        lealHooks,
        hooks,
        idealScript,
        engineResult,
        imagePreview
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (saved.hookMode !== undefined) setHookMode(saved.hookMode);
        if (saved.autoConfig !== undefined) setAutoConfig(saved.autoConfig);
        if (saved.inputs !== undefined) setInputs(saved.inputs);
        if (saved.formulaResult !== undefined) setFormulaResult(saved.formulaResult);
        if (saved.formulaNiche !== undefined) setFormulaNiche(saved.formulaNiche);
        if (saved.lealProduct !== undefined) setLealProduct(saved.lealProduct);
        if (saved.lealHooks !== undefined) setLealHooks(saved.lealHooks);
        if (saved.hooks !== undefined) setHooks(saved.hooks);
        if (saved.idealScript !== undefined) setIdealScript(saved.idealScript);
        if (saved.engineResult !== undefined) setEngineResult(saved.engineResult);
        if (saved.imagePreview !== undefined) setImagePreview(saved.imagePreview);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.autoConfig?.product && !state.inputs?.produto && !state.engineResult && !state.formulaResult;
    };

    const { AutoSaveIndicator, RecoveryBanner } = useAutoSaveRecovery('hook_generator', currentState, handleRestore, isEmptyOrInitial);

    const CATEGORY_ALIASES: Record<string, string[]> = {
        Curiosity: ['curiosity', 'curiosidade', 'curioso', 'curiosidades'],
        Pain: ['pain', 'dor', 'dores', 'problema', 'problemas'],
        Benefit: ['benefit', 'benefício', 'beneficio', 'benefícios', 'beneficios', 'vantagem', 'vantagens'],
        Price: ['price', 'preço', 'preco', 'oferta', 'desconto', 'valor', 'custo-benefício', 'custo beneficio'],
        Urgency: ['urgency', 'urgência', 'urgencia', 'escassez', 'tempo'],
        UGC: ['ugc', 'conteudo relacionavel', 'conteúdo relacionável', 'relacionavel', 'relacionável', 'diario', 'dia a dia', 'depoimento', 'prova social']
    };

    const getGroupedHooks = (result: any, key: string): string[] => {
        if (!result || !result.grouped_hooks) return [];
        const targetAliases = CATEGORY_ALIASES[key] || [key.toLowerCase()];
        
        for (const [k, val] of Object.entries(result.grouped_hooks)) {
            const cleanK = k.toLowerCase().trim();
            if (targetAliases.some(alias => cleanK === alias || cleanK.includes(alias) || alias.includes(cleanK))) {
                if (Array.isArray(val)) return val.filter(item => typeof item === 'string' && item.trim().length > 0);
            }
        }
        return [];
    };

    const handleCopyAllHooks = () => {
        if (!engineResult || !engineResult.grouped_hooks) return;
        let text = "";
        Object.entries(engineResult.grouped_hooks).forEach(([cat, list]) => {
            if (Array.isArray(list)) {
                text += `=== ${cat.toUpperCase()} ===\n`;
                list.forEach((hk, i) => {
                    text += `${i + 1}. ${hk}\n`;
                });
                text += `\n`;
            }
        });
        copyToClipboard(text).then(ok => ok && alert("Todos os ganchos foram copiados com sucesso!"));
    };

    const handleUploadedFile = async (file: File) => {
        setImagePreview(URL.createObjectURL(file));
        setAnalyzingImage(true);

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
            }).then(res => res.split(',')[1]);

            const visionPrompt = `
                Analise esta imagem de produto para criar ganchos virais no TikTok Shop.
                Extraia as informações cruciais e retorne APENAS um objeto JSON estrito.
                
                Tente mapear o nicho do produto para UMA destas opções exatas (se nenhuma se encaixar perfeitamente, escolha a mais próxima):
                \${NICHES.join(' | ')}

                Formato JSON esperado (sem formatação markdown):
                {
                    "produto": "Nome curto e comercial do produto",
                    "nicho": "O nicho exato da lista acima",
                    "publico": "Público-alvo ideal (ex: gamers, donas de casa, estudantes)",
                    "dor": "A dor principal que o produto resolve de forma curta",
                    "desejo": "O desejo oculto ou benefício emocional associado",
                    "objecao": "A objeção de compra mais comum (ex: é caro?, estraga rápido?)"
                }
            `;

            const payload = {
                contents: [{
                    parts: [
                        { text: visionPrompt },
                        { inlineData: { mimeType: file.type, data: base64Data } }
                    ]
                }]
            };

            const response = await postToWorker<any>('/', payload, {
                moduleName: "Hook Generator Visão IA",
                workerUrl: WORKER_URL,
                clientToken: WORKER_TOKEN
            });

            if (!response.ok) throw new Error(response.errorMessage || "Erro no servidor.");

            const jsonResult = response.data;
            if (!jsonResult) throw new Error("A IA não retornou a análise visual estruturada.");

            setAutoConfig(prev => ({
                ...prev,
                product: jsonResult.produto || prev.product,
                niche: NICHES.includes(jsonResult.nicho) ? jsonResult.nicho : prev.niche
            }));

            setInputs(prev => ({
                ...prev,
                produto: jsonResult.produto || prev.produto,
                publico: jsonResult.publico || prev.publico,
                dor: jsonResult.dor || prev.dor,
                desejo: jsonResult.desejo || prev.desejo,
                objecao: jsonResult.objecao || prev.objecao
            }));
        } catch (err: any) {
            console.error("Erro na Visão IA:", err);
            alert("🚨 Falha ao analisar a imagem:\n" + err.message);
        } finally {
            setAnalyzingImage(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUploadedFile(file);
    };

    const { feedback: pasteFeedback, error: pasteError } = usePasteImageUpload({
        onImagePasted: (fileObj) => {
            handleUploadedFile(fileObj);
        }
    });

    const handleChangeManual = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    };

    const handleChangeAuto = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setAutoConfig(prev => ({ ...prev, [name]: value }));
    };

    const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    const gerarHookAntigo = (inputText: string) => {
        return {
            interrupcao: randomItem(SCRIPT_FORMULA.interrupcao),
            curiosidade: randomItem(SCRIPT_FORMULA.curiosidade),
            produto: inputText || "[Insira Seu Produto Aqui]",
            oferta: randomItem(SCRIPT_FORMULA.oferta),
            urgencia: randomItem(SCRIPT_FORMULA.urgencia),
            cta: randomItem(SCRIPT_FORMULA.cta)
        };
    };

    const detectarNichoLeve = (produto = "") => {
        const texto = produto.toLowerCase();
        if (texto.includes("pele") || texto.includes("cabelo")) return "beleza";
        if (texto.includes("academia") || texto.includes("emagrecer")) return "fitness";
        if (texto.includes("roupa") || texto.includes("look")) return "moda";
        if (texto.includes("smart") || texto.includes("gadget")) return "eletronico";
        if (texto.includes("cozinha") || texto.includes("casa")) return "casa";
        return "geral";
    };

    const escolherModelo = (nicho: string) => {
        const mapa: Record<string, number[]> = {
            beleza: [21,22,23,41,42],
            fitness: [21,26,30,43,49],
            moda: [1,8,14,15,45],
            eletronico: [3,5,7,27,29],
            casa: [4,6,46,48,44]
        };
        return randomItem(mapa[nicho] || [1,11,21]);
    };

    const melhorarHookComNicho = (inputText: string, hook: any) => {
        if (!inputText) return hook;
        const nicho = detectarNichoLeve(inputText);
        const melhorias: Record<string, string> = {
            beleza: "olha isso na minha pele 😳",
            fitness: "eu tava travado nisso 😳",
            moda: "mano, olha como isso veste 😳",
            eletronico: "isso aqui faz um negócio bizarro 😳",
            casa: "isso resolveu um problema aqui em casa 😳"
        };
        const prefixo = melhorias[nicho] || "mano, olha isso 😳";
        
        return {
            ...hook,
            interrupcao: `${prefixo}… ${hook.interrupcao.toLowerCase()}`
        };
    };

    const adicionarCTA = (hook: any) => {
        if (!hook.cta) {
            hook.cta = randomItem(SCRIPT_FORMULA.cta);
        }
        return hook;
    };

    const gerarHook = (inputText: string) => {
        try {
            let hook: any = gerarHookAntigo(inputText);
            hook = melhorarHookComNicho(inputText, hook);
            hook = adicionarCTA(hook);
            
            const nicho = detectarNichoLeve(inputText);
            hook.modeloId = escolherModelo(nicho);
            
            return hook;
        } catch {
            return gerarHookAntigo(inputText);
        }
    };

    const generateFormulaScript = () => {
        const result = gerarHook(formulaNiche);
        setFormulaResult(result);
    };

    const copyFormulaResult = () => {
        if (!formulaResult) return;
        const text = `${formulaResult.interrupcao}\n${formulaResult.curiosidade}\n${formulaResult.produto !== "[Insira Seu Produto Aqui]" ? formulaResult.produto : "[SEU PRODUTO AQUI]"}\n${formulaResult.oferta}\n${formulaResult.urgencia}\n${formulaResult.cta}`;
        copyToClipboard(text).then(ok => ok && alert("Roteiro Fórmula copiado!"));
    };

    const generateLealHooks = async () => {
        if (!lealProduct) return alert("Digite o nome do produto!");
        if (!currentKey) return alert("Configure a Chave API nas configurações.");

        setLoading(true);
        setLealHooks([]); 
        
        try {
            const prompt = `
                Atue como um Especialista em Copywriting para TikTok Shop, seguindo a estratégia de retenção de Moisés Leal.
                Gere 5 ganchos virais altamente persuasivos para o produto: "${lealProduct}".
                
                Baseie-se nestes 5 ângulos obrigatórios:
                1. Autoridade (Exemplo base: Como eu fiz R$ 20 mil em 2 dias vendendo [produto] no TikTok Shop.)
                2. Curiosidade (Exemplo base: O erro fatal que 90% dos afiliados cometem ao anunciar [produto].)
                3. Urgência (Exemplo base: Lote de [produto] liberado agora! Quem pegar esse lote vai pagar muito abaixo do preço.)
                4. Prova Social (Exemplo base: Por que o [produto] é o produto número 1 em vendas no Calodata hoje.)
                5. Retenção (Exemplo base: Pare de rolar a tela! Eu vou te mostrar como faturar alto com [produto] sem precisar fazer live.)

                Adapte os exemplos perfeitamente ao produto informado, mantendo a agressividade e o estilo nativo do TikTok.

                Retorne APENAS um array JSON válido (sem formatação markdown) com a seguinte estrutura:
                [
                    { "type": "Autoridade", "text": "texto gerado..." },
                    { "type": "Curiosidade", "text": "texto gerado..." },
                    { "type": "Urgência", "text": "texto gerado..." },
                    { "type": "Prova Social", "text": "texto gerado..." },
                    { "type": "Retenção", "text": "texto gerado..." }
                ]
            `;

            const data = await processGeminiAPI(currentKey, {
                ai_target: "perplexity",
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            });

            const result = safeJSONParse(data.candidates[0].content.parts[0].text, []);
            
            if (Array.isArray(result) && result.length > 0) {
                setLealHooks(result);
            } else if (result.hooks && Array.isArray(result.hooks)) {
                setLealHooks(result.hooks);
            } else {
                throw new Error("Formato de resposta inesperado da IA.");
            }
        } catch (e) {
            console.error(e);
            alert("A IA demorou a responder, a aplicar templates base...");
            
            const generatedFallback = lealTemplates.map(t => ({
                type: t.type,
                text: t.text.replace(/\{product\}/g, lealProduct)
            }));
            setLealHooks(generatedFallback);
        } finally {
            setLoading(false);
        }
    };

    const parseAndNormalizeGroupedHooks = (rawResponse: any, rawTextCandidate: string, productName: string): { grouped_hooks: Record<string, string[]>; ideal_script: string } => {
        let parsed: any = null;

        if (rawResponse && typeof rawResponse === 'object') {
            if (rawResponse.grouped_hooks || rawResponse.groupedHooks || rawResponse.data?.grouped_hooks) {
                parsed = rawResponse.data || rawResponse;
            }
        }

        if (!parsed && rawTextCandidate) {
            parsed = safeJSONParse(rawTextCandidate, null);
        }

        const defaultCuriosity = [
            `Eu aposto que você nunca viu o ${productName} funcionando desse jeito...`,
            `O detalhe escondido no ${productName} que ninguém te conta no TikTok.`,
            `Descobri por que todo mundo está trocando soluções antigas pelo ${productName}.`,
            `Se você ainda não conhece o ${productName}, você tá perdendo tempo.`
        ];
        const defaultPain = [
            `Cansado de gastar dinheiro com produtos que prometem e não entregam?`,
            `O maior erro que todo mundo comete antes de comprar o ${productName}.`,
            `Chega de perder tempo com dor de cabeça. O ${productName} resolve na hora.`,
            `Você ainda sofre com isso todos os dias? O ${productName} muda tudo.`
        ];
        const defaultBenefit = [
            `Como ter resultados 3x mais rápidos no seu dia a dia com o ${productName}.`,
            `O ${productName} entrega praticidade absoluta logo no primeiro uso.`,
            `Economize tempo, esforço e dinheiro com o novo ${productName}.`,
            `Tenha a qualidade que você sempre quis com o ${productName} na sua rotina.`
        ];
        const defaultPrice = [
            `Parece coisa de R$ 500, mas o ${productName} custa menos que um lanche.`,
            `O melhor custo-benefício do ano: tudo o que o ${productName} entrega por esse valor.`,
            `Você não precisa gastar uma fortuna para ter a qualidade do ${productName}.`,
            `Menos de 2 reais por dia para ter a solução do ${productName} em mãos.`
        ];
        const defaultUrgency = [
            `Aproveite antes que o lote especial do ${productName} esgote no estoque!`,
            `Últimas unidades do ${productName} com condição especial liberada hoje.`,
            `Essa promoção relâmpago para o ${productName} pode sair do ar a qualquer momento.`,
            `Se você não garantir o seu ${productName} agora, vai pagar muito mais caro depois.`
        ];
        const defaultUGC = [
            `Gente, comprei o ${productName} achando que era meme e me surpreendi...`,
            `Meu relato 100% sincero depois de usar o ${productName} a semana inteira.`,
            `Todo mundo me mandou mensagem perguntando onde eu comprei esse ${productName}!`,
            `Minha mãe duvidou no começo, mas agora quer um ${productName} só pra ela!`
        ];

        const resultGrouped: Record<string, string[]> = {
            Curiosity: [],
            Pain: [],
            Benefit: [],
            Price: [],
            Urgency: [],
            UGC: []
        };

        const targetCategoryMap: Record<string, string[]> = {
            Curiosity: ['curiosity', 'curiosidade', 'curioso'],
            Pain: ['pain', 'dor', 'dores', 'problema'],
            Benefit: ['benefit', 'benefício', 'beneficio', 'benefícios', 'vantagem'],
            Price: ['price', 'preço', 'preco', 'oferta', 'desconto', 'valor', 'custo'],
            Urgency: ['urgency', 'urgência', 'urgencia', 'escassez', 'tempo'],
            UGC: ['ugc', 'conteudo', 'conteúdo', 'relacionavel', 'relacionável', 'diario', 'depoimento', 'prova social']
        };

        const categorizeString = (str: string, categoryHint?: string) => {
            if (!str || typeof str !== 'string') return;
            const clean = str.replace(/^[\d\.\-\*\•\s]+/, '').replace(/^["']|["']$/g, '').trim();
            if (!clean || clean.length < 5) return;

            let targetCat = 'Curiosity';
            if (categoryHint) {
                const cleanHint = categoryHint.toLowerCase().trim();
                for (const [catName, aliases] of Object.entries(targetCategoryMap)) {
                    if (aliases.some(a => cleanHint.includes(a))) {
                        targetCat = catName;
                        break;
                    }
                }
            }
            resultGrouped[targetCat].push(clean);
        };

        if (parsed) {
            const candidateSource = parsed.grouped_hooks || parsed.groupedHooks || parsed.categories || (typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null);

            if (candidateSource && typeof candidateSource === 'object' && !Array.isArray(candidateSource)) {
                for (const [key, val] of Object.entries(candidateSource)) {
                    if (key === 'ideal_script' || key === 'idealScript' || key === 'script') continue;
                    if (Array.isArray(val)) {
                        val.forEach(item => {
                            if (typeof item === 'string') categorizeString(item, key);
                            else if (item && typeof item === 'object') {
                                categorizeString(item.text || item.hook || item.gancho || item.content || '', item.type || item.categoria || item.category || key);
                            }
                        });
                    } else if (typeof val === 'string') {
                        categorizeString(val, key);
                    }
                }
            } else if (Array.isArray(parsed)) {
                parsed.forEach((item: any) => {
                    if (typeof item === 'string') {
                        categorizeString(item);
                    } else if (item && typeof item === 'object') {
                        categorizeString(item.text || item.hook || item.gancho || item.content || item.frase || '', item.type || item.categoria || item.category || item.estilo);
                    }
                });
            }
        }

        if (Object.values(resultGrouped).every(arr => arr.length === 0) && rawTextCandidate) {
            const lines = rawTextCandidate.split('\n');
            let currentSection = 'Curiosity';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const lower = trimmed.toLowerCase();
                for (const [catName, aliases] of Object.entries(targetCategoryMap)) {
                    if (aliases.some(a => lower.includes(a))) {
                        currentSection = catName;
                        break;
                    }
                }
                if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+[\.\)]/.test(trimmed)) {
                    categorizeString(trimmed, currentSection);
                }
            }
        }

        if (resultGrouped.Curiosity.length === 0) resultGrouped.Curiosity = defaultCuriosity;
        if (resultGrouped.Pain.length === 0) resultGrouped.Pain = defaultPain;
        if (resultGrouped.Benefit.length === 0) resultGrouped.Benefit = defaultBenefit;
        if (resultGrouped.Price.length === 0) resultGrouped.Price = defaultPrice;
        if (resultGrouped.Urgency.length === 0) resultGrouped.Urgency = defaultUrgency;
        if (resultGrouped.UGC.length === 0) resultGrouped.UGC = defaultUGC;

        const idealScript = parsed?.ideal_script || parsed?.idealScript || parsed?.script ||
            `Se você quer praticidade de verdade sem gastar uma fortuna, o ${productName} é a solução perfeita. Garanta o seu hoje mesmo no link abaixo!`;

        return {
            grouped_hooks: resultGrouped,
            ideal_script: idealScript
        };
    };

    const generateHooks = async () => {
        if (!currentKey) {
            setErrorMsg("Verifique a API Key nas configurações.");
            return;
        }
        
        const productName = hookMode === 'manual' ? inputs.produto : autoConfig.product;
        if (!productName) {
            setErrorMsg("Preencha o nome do produto.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);
        setEngineResult(null);
        setHooks([]);
        setIdealScript('');
        
        try {
            const prompt = `
                Você é um Engenheiro de Conversão Viral especialista na criação de ganchos (hooks) de retenção bizarros de alta conversão para o TikTok Shop e Reels.
                Desta vez, você deve gerar exatamente um total de pelo menos 20 GANCHOS de alta retenção empacotados em um formato JSON estrito.

                PRODUTO: ${productName}
                CONTEXTO: ${hookMode === 'manual' ? `Público: ${inputs.publico}, Dor: ${inputs.dor}, Desejo: ${inputs.desejo}, Objeção: ${inputs.objecao}` : `Nicho: ${autoConfig.niche}, Objetivo: ${autoConfig.objective}, Temperatura: ${autoConfig.temperature}`}

                Instruções:
                Crie pelo menos 3-4 ganchos hiper-chamativos em cada uma das seguintes 6 Categorias Obrigatórias:
                1. Curiosity (Curiosidade)
                2. Pain (Dor)
                3. Benefit (Benefício)
                4. Price (Preço)
                5. Urgency (Urgência)
                6. UGC (Conteúdo Relacionável por Pessoas do Dia a Dia)

                Os ganchos devem conter palavras-chave do nicho e serem enxutos (máximo 15 palavras por gancho), estilo falado de viral do TikTok.
                Retorne também um script de conversão de 15 segundos unificando o melhor gancho em "ideal_script".

                Formato de Saída (JSON Obrigatório, retorne apenas o objeto JSON sem aspas de markdown):
                {
                    "grouped_hooks": {
                        "Curiosity": ["Gancho 1", "Gancho 2", "Gancho 3", "Gancho 4"],
                        "Pain": ["Gancho 1", "Gancho 2", "Gancho 3", "Gancho 4"],
                        "Benefit": ["Gancho 1", "Gancho 2", "Gancho 3", "Gancho 4"],
                        "Price": ["Gancho 1", "Gancho 2", "Gancho 3", "Gancho 4"],
                        "Urgency": ["Gancho 1", "Gancho 2", "Gancho 3", "Gancho 4"],
                        "UGC": ["Gancho 1", "Gancho 2", "Gancho 3", "Gancho 4"]
                    },
                    "ideal_script": "Seu script reduzido unificado aqui..."
                }
            `;

            const requestPayload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            };

            console.log("Hook Generator Request Payload:", requestPayload);

            const data = await processGeminiAPI(currentKey, requestPayload);
            console.log("Hook Generator Raw Response:", data);

            let rawText = data?.raw_text || data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText && data && typeof data === 'object') {
                rawText = JSON.stringify(data.data || data);
            }

            const result = parseAndNormalizeGroupedHooks(data, rawText || '', productName);

            setEngineResult(result);
            setIdealScript(result.ideal_script || "");

            // Converte o objeto agrupado para o formato antigo de hooks se o resto do app depender dele
            const flattened: any[] = [];
            Object.keys(result.grouped_hooks).forEach(cat => {
                const list = result.grouped_hooks[cat];
                if (Array.isArray(list)) {
                    list.forEach(hk => {
                        flattened.push({ type: cat, text: hk });
                    });
                }
            });
            setHooks(flattened);

            // Save success run to history
            safeSaveHistory({
                date: new Date().toLocaleString(),
                tool: "Gerador de Ganchos Virais",
                title: `Ganchos para ${productName}`,
                content: `Modo: ${hookMode}\nTotal Ganchos: ${flattened.length}\nIdeal Script:\n${result.ideal_script || ''}`
            });

        } catch (e: any) {
            console.error("Hook Generator Error:", e);
            setErrorMsg(e.message || "Erro desconhecido na comunicação com o robô.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                    <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20 flex items-center gap-1">
                        <LucideIcon name="anchor" className="w-3.5 h-3.5" /> RECOVERY ENABLED
                    </span>
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                     Gerador de Ganchos Virais <LucideIcon name="anchor" className="w-6 h-6 text-yellow-400" />
                </h2>
                <p className="text-slate-400">Capture a atenção nos primeiros 3 segundos.</p>
            </div>

            <RecoveryBanner />

            <div className="flex flex-wrap sm:flex-nowrap bg-slate-800 p-1 rounded-xl mb-4 max-w-3xl mx-auto border border-slate-700 gap-1">
                <button onClick={() => setHookMode('auto')} className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${hookMode === 'auto' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <LucideIcon name="zap" className="w-3 h-3" /> Modo Turbo (Auto)
                </button>
                <button onClick={() => setHookMode('manual')} className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${hookMode === 'manual' ? 'bg-yellow-600 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <LucideIcon name="pen-tool" className="w-3 h-3" /> Modo Detalhado
                </button>
                <button onClick={() => setHookMode('formula')} className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${hookMode === 'formula' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <LucideIcon name="shuffle" className="w-3 h-3" /> Fórmula Express
                </button>
                <button onClick={() => setHookMode('leal')} className={`flex-1 py-2.5 px-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${hookMode === 'leal' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <LucideIcon name="trending-up" className="w-3 h-3" /> Estratégia Leal
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    {hookMode === 'formula' ? (
                        <Card className="border border-pink-500/30 relative overflow-hidden h-full flex flex-col justify-center text-center p-8 bg-slate-900/40">
                            <div className="absolute top-0 right-0 bg-pink-500/10 text-pink-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-pink-500/20">SPINTAX ENGINE</div>
                            <LucideIcon name="sparkles" className="w-12 h-12 text-pink-500 mx-auto mb-4" />
                            <h4 className="text-xl font-bold uppercase mb-2 text-white">
                                Roteiro Instantâneo
                            </h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Gera scripts combinando variáveis de Interrupção, Curiosidade, Oferta, Urgência e CTA. Preencha o nicho para a IA unificar o contexto.</p>
                            
                            <div className="mb-6 text-left">
                                <label className="text-xs text-slate-400 font-bold block mb-1">Nicho / Produto (Opcional - Ativa IA)</label>
                                <input 
                                    value={formulaNiche} 
                                    onChange={(e) => setFormulaNiche(e.target.value)} 
                                    placeholder="Ex: Corretor Postural" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-pink-500 outline-none" 
                                />
                            </div>

                            <Button onClick={generateFormulaScript} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold border-none py-4 text-lg" icon="zap">
                                Sortear Script Viral
                            </Button>
                        </Card>
                    ) : hookMode === 'leal' ? (
                        <Card className="border border-blue-500/30 relative overflow-hidden h-full flex flex-col justify-center text-center p-8 bg-slate-900/40">
                            <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-blue-500/20">ESTRATÉGIA AFILIADO</div>
                            <LucideIcon name="trending-up" className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                            <h4 className="text-xl font-bold uppercase mb-2 text-white">
                                Ganchos Moisés Leal
                            </h4>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">Templates validados de alta retenção focados em Autoridade, Curiosidade e Urgência para TikTok Shop e Calodata.</p>
                            
                            <div className="mb-6 text-left">
                                <label className="text-xs text-slate-400 font-bold block mb-1">Nome do Produto</label>
                                <input 
                                    value={lealProduct} 
                                    onChange={(e) => setLealProduct(e.target.value)} 
                                    placeholder="Ex: Cabeceira..." 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none" 
                                />
                            </div>

                            <Button onClick={generateLealHooks} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold border-none py-4 text-lg" icon={loading ? "loader-2" : "zap"}>
                                {loading ? "A Gerar com IA..." : "Gerar Ganchos (Leal)"}
                            </Button>
                        </Card>
                    ) : (
                        <Card className={`border ${hookMode === 'auto' ? 'border-indigo-500/30' : 'border-yellow-500/30'} relative overflow-hidden bg-slate-900/40`}>
                            {hookMode === 'auto' && <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-indigo-500/20">CONVERSION ENGINE</div>}
                            
                            <h4 className={`text-sm font-bold uppercase mb-4 flex items-center gap-2 ${hookMode === 'auto' ? 'text-indigo-400' : 'text-yellow-400'}`}>
                                <LucideIcon name={hookMode === 'auto' ? "cpu" : "sliders-horizontal"} className="w-4 h-4" /> 
                                {hookMode === 'auto' ? "Variáveis de Conversão" : "Dados do Gancho"}
                            </h4>
                            
                            {/* Visual automatic prefill area */}
                            <div className={`mb-6 p-1 border border-dashed rounded-xl text-center relative transition-colors overflow-hidden min-h-[100px] flex items-center justify-center ${hookMode === 'auto' ? 'border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10' : 'border-yellow-500/50 bg-yellow-500/5 hover:bg-yellow-500/10'}`}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    disabled={analyzingImage}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20" 
                                />
                                
                                {imagePreview ? (
                                    <div className="relative w-full h-24 flex items-center justify-center">
                                        <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                                        
                                        {analyzingImage ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm z-10">
                                                <LucideIcon name="loader-2" className={`w-6 h-6 mb-1 animate-spin ${hookMode === 'auto' ? 'text-indigo-400' : 'text-yellow-400'}`} />
                                                <span className={`text-[10px] font-semibold ${hookMode === 'auto' ? 'text-indigo-300' : 'text-yellow-300'}`}>Analisando produto...</span>
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity rounded-lg backdrop-blur-sm z-10">
                                                <LucideIcon name="refresh-cw" className={`w-6 h-6 mb-1 ${hookMode === 'auto' ? 'text-indigo-400' : 'text-yellow-400'}`} />
                                                <span className={`text-[10px] font-semibold ${hookMode === 'auto' ? 'text-indigo-300' : 'text-yellow-300'}`}>Trocar foto</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pointer-events-none py-4">
                                        <LucideIcon name="image-plus" className={`w-6 h-6 mb-2 \${hookMode === 'auto' ? 'text-indigo-400' : 'text-yellow-400'}`} />
                                        <span className={`text-xs font-semibold \${hookMode === 'auto' ? 'text-indigo-300' : 'text-yellow-300'}`}>Preenchimento Automático (IA)</span>
                                        <span className="text-[10px] text-slate-400 mt-1">Upload, arraste ou pressione Ctrl+V para colar imagem</span>
                                        {pasteError && (
                                            <span className="text-[10px] text-red-500 mt-1 leading-tight font-sans font-normal">
                                                {pasteError}
                                            </span>
                                        )}
                                        {pasteFeedback && (
                                            <span className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans font-normal">
                                                ✓ {pasteFeedback.message} ({pasteFeedback.name})
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {hookMode === 'auto' ? (
                                    <>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Nicho</label>
                                            <div className="relative">
                                                <select name="niche" value={autoConfig.niche} onChange={handleChangeAuto} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none appearance-none font-medium">
                                                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                                                </select>
                                                <LucideIcon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Produto</label>
                                            <input name="product" value={autoConfig.product} onChange={handleChangeAuto} placeholder="Ex: Vestido Midi Floral, Fone Bluetooth..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400 font-bold block mb-1">Objetivo</label>
                                                <div className="relative">
                                                    <select name="objective" value={autoConfig.objective} onChange={handleChangeAuto} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-indigo-500 outline-none appearance-none">
                                                        <option value="Direct Sales (Conversion)">Vendas Diretas</option>
                                                        <option value="Lead Generation">Captação de Leads</option>
                                                        <option value="Engagement / Virality">Engajamento / Viralidade</option>
                                                        <option value="Brand Awareness">Reconhecimento de Marca</option>
                                                    </select>
                                                    <LucideIcon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 font-bold block mb-1">Temperatura</label>
                                                <div className="relative">
                                                    <select name="temperature" value={autoConfig.temperature} onChange={handleChangeAuto} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-indigo-500 outline-none appearance-none">
                                                        <option value="Cold">Frio (Inconsciente)</option>
                                                        <option value="Warm">Morno (Consciente)</option>
                                                        <option value="Hot">Quente (Pronto)</option>
                                                    </select>
                                                    <LucideIcon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Produto</label>
                                            <input name="produto" value={inputs.produto} onChange={handleChangeManual} placeholder="Ex: Corretor Postural" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-yellow-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Público-Alvo</label>
                                            <input name="publico" value={inputs.publico} onChange={handleChangeManual} placeholder="Ex: Home office, gamers" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-yellow-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Dor Principal 😫</label>
                                            <input name="dor" value={inputs.dor} onChange={handleChangeManual} placeholder="Ex: Dor nas costas constante" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Desejo Oculto 🤫</label>
                                            <input name="desejo" value={inputs.desejo} onChange={handleChangeManual} placeholder="Ex: Trabalhar sem cansaço" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 font-bold block mb-1">Objeção Comum 🤨</label>
                                            <input name="objecao" value={inputs.objecao} onChange={handleChangeManual} placeholder="Ex: Incomoda de usar?" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-orange-500 outline-none" />
                                        </div>
                                    </>
                                )}
                            </div>
                            <Button 
                                onClick={generateHooks} 
                                disabled={loading} 
                                className={`w-full mt-6 font-bold border-none text-white ${hookMode === 'auto' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500' : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-black'}`} 
                                icon={loading ? "loader-2" : "zap"}
                            >
                                {loading ? "Processando Engine IA..." : (hookMode === 'auto' ? "Rodar Conversion Engine" : "Gerar Ganchos (Manual)")}
                            </Button>
                        </Card>
                    )}
                </div>

                <div className="space-y-4">
                    {hookMode === 'formula' && formulaResult ? (
                        <div className="space-y-4 animate-fade-in h-full flex flex-col justify-center">
                            <div className="glass-panel p-6 rounded-xl border border-pink-500/30 bg-gradient-to-br from-slate-900 to-pink-900/10 shadow-lg relative bg-slate-900/40">
                                <button onClick={copyFormulaResult} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-pink-600 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer">
                                    <LucideIcon name="copy" className="w-3 h-3" /> Copiar Completo
                                </button>
                                <h3 className="text-lg font-bold text-pink-400 mb-6 flex items-center gap-2">
                                    <LucideIcon name="zap" className="w-5 h-5" /> Script Resultante
                                </h3>
                                
                                <div className="space-y-4 text-sm font-medium text-slate-200">
                                    <div className="flex gap-3 items-start group">
                                        <span className="bg-pink-500/20 text-pink-300 text-[10px] font-bold px-2 py-0.5 rounded border border-pink-500/30 mt-0.5 flex-shrink-0 w-24 text-center">Interrupção</span>
                                        <p className="flex-1">"{formulaResult.interrupcao}"</p>
                                    </div>
                                    <div className="flex gap-3 items-start group">
                                        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/30 mt-0.5 flex-shrink-0 w-24 text-center">Curiosidade</span>
                                        <p className="flex-1">"{formulaResult.curiosidade}"</p>
                                    </div>
                                    <div className={`flex gap-3 items-start ${(!formulaNiche && formulaResult.produto === "[Insira Seu Produto Aqui]") ? 'opacity-50' : 'group'}`}>
                                        <span className="bg-slate-500/20 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-500/30 mt-0.5 flex-shrink-0 w-24 text-center">Produto</span>
                                        <p className={`flex-1 ${(!formulaNiche && formulaResult.produto === "[Insira Seu Produto Aqui]") ? 'italic' : 'text-slate-100 font-bold'}`}>
                                            {(!formulaNiche && formulaResult.produto === "[Insira Seu Produto Aqui]") ? "[Insira Seu Produto Aqui]" : `"${formulaResult.produto}"`}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 items-start group">
                                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 mt-0.5 flex-shrink-0 w-24 text-center">Oferta</span>
                                        <p className="flex-1">"{formulaResult.oferta}"</p>
                                    </div>
                                    <div className="flex gap-3 items-start group">
                                        <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30 mt-0.5 flex-shrink-0 w-24 text-center">Urgência</span>
                                        <p className="flex-1">"{formulaResult.urgencia}"</p>
                                    </div>
                                    <div className="flex gap-3 items-start group">
                                        <span className="bg-orange-500/20 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/30 mt-0.5 flex-shrink-0 w-24 text-center">CTA</span>
                                        <p className="flex-1">"{formulaResult.cta}"</p>
                                    </div>
                                    
                                    {formulaResult.modeloId && (
                                        <div className="flex gap-3 items-start group mt-4 pt-4 border-t border-pink-500/20">
                                            <span className="bg-slate-500/20 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-500/30 mt-0.5 flex-shrink-0 w-24 text-center">Modelo Base ID</span>
                                            <p className="flex-1 text-slate-400 font-mono">#{formulaResult.modeloId}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : hookMode === 'leal' && lealHooks.length > 0 ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center text-slate-400 text-xs uppercase font-bold tracking-widest px-1">
                                <span>Ganchos Estratégicos</span>
                                <span>{lealHooks.length} Variações</span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                {lealHooks.map((hook, i) => (
                                    <div key={i} className="glass-panel p-4 rounded-xl border border-blue-500/30 hover:border-blue-500 transition-all group relative cursor-pointer bg-slate-900/40" onClick={() => copyToClipboard(hook.text).then(ok => ok && alert("Gancho copiado!"))}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-blue-500/10 text-blue-300 border-blue-500/20">{hook.type}</span>
                                            <LucideIcon name="copy" className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <p className="text-base font-bold text-white leading-snug mt-2">"{hook.text}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : engineResult ? (
                        <div className="space-y-6 animate-fade-in custom-scrollbar overflow-y-auto max-h-[800px] pr-2 font-sans">
                            {errorMsg && (
                                <div className="bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl p-3 text-xs leading-relaxed font-mono">
                                    <strong>Erro na escrita:</strong> {errorMsg}
                                </div>
                            )}

                            <div className="flex justify-between items-center bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5 uppercase">
                                    <LucideIcon name="anchor" className="w-4 h-4 text-emerald-400 animate-pulse" />
                                    Painel de Ganchos Virais (20+ Prontos)
                                </span>
                                <button 
                                    onClick={handleCopyAllHooks} 
                                    className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition duration-200 cursor-pointer"
                                    title="Copiar todos os ganchos gerados organizadamente"
                                >
                                    <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Todos os Ganchos
                                </button>
                            </div>

                            {/* 6 requested categories */}
                            {[
                                { key: 'Curiosity', label: 'Curiosity (Curiosidade)', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5', badge: 'text-yellow-300 bg-yellow-500/10' },
                                { key: 'Pain', label: 'Pain (Dor)', color: 'border-red-500/30 text-red-400 bg-red-500/5', badge: 'text-red-300 bg-red-500/10' },
                                { key: 'Benefit', label: 'Benefit (Benefício)', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5', badge: 'text-emerald-300 bg-emerald-500/10' },
                                { key: 'Price', label: 'Price (Preço)', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5', badge: 'text-cyan-300 bg-cyan-500/10' },
                                { key: 'Urgency', label: 'Urgency (Urgência)', color: 'border-pink-500/30 text-pink-400 bg-pink-500/5', badge: 'text-pink-300 bg-pink-500/10' },
                                { key: 'UGC', label: 'UGC (Relacionável / Diário)', color: 'border-purple-500/30 text-purple-400 bg-purple-500/5', badge: 'text-purple-300 bg-purple-500/10' }
                            ].map((cat) => {
                                const list = getGroupedHooks(engineResult, cat.key);
                                if (list.length === 0) return null;
                                return (
                                    <div key={cat.key} className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-1.5">
                                            <span className={`w-2 h-2 rounded-full ${cat.key === 'Curiosity' ? 'bg-yellow-400' : cat.key === 'Pain' ? 'bg-red-400' : cat.key === 'Benefit' ? 'bg-emerald-400' : cat.key === 'Price' ? 'bg-cyan-400' : cat.key === 'Urgency' ? 'bg-pink-400' : 'bg-purple-400'}`} />
                                            {cat.label}
                                        </div>
                                        <div className="grid gap-2">
                                            {list.map((hk: string, idx: number) => (
                                                <div 
                                                    key={idx} 
                                                    className={`p-3 rounded-lg border ${cat.color} flex justify-between items-center group/item hover:scale-[1.01] transition-transform cursor-pointer`}
                                                    onClick={() => copyToClipboard(hk).then(ok => ok && alert("Gancho copiado!"))}
                                                >
                                                    <span className="text-sm font-semibold text-slate-100 flex-1 leading-snug">"{hk}"</span>
                                                    <span className="opacity-40 group-hover/item:opacity-100 transition-opacity bg-slate-800 p-1.5 rounded hover:text-white hover:bg-slate-700 ml-2">
                                                        <LucideIcon name="copy" className="w-3.5 h-3.5" />
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {idealScript && (
                                <div className="glass-panel p-5 rounded-xl border border-orange-500/50 mt-4 bg-gradient-to-br from-slate-900 to-orange-900/10 shadow-lg bg-slate-900/40">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
                                            <LucideIcon name="zap" className="w-4 h-4 text-orange-400" /> Roteiro Rápido Unificado
                                        </h4>
                                        <button onClick={() => copyToClipboard(idealScript).then(ok => ok && alert("Script copiado!"))} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer">
                                            <LucideIcon name="copy" className="w-3" /> Copiar Script
                                        </button>
                                    </div>
                                    <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed border-l-2 border-orange-500 pl-3 font-mono">
                                        {idealScript}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 p-8 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30 min-h-[400px]">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${hookMode === 'auto' ? 'bg-indigo-500/10 text-indigo-500' : hookMode === 'manual' ? 'bg-yellow-500/10 text-yellow-500' : hookMode === 'leal' ? 'bg-blue-500/10 text-blue-500' : 'bg-pink-500/10 text-pink-500'}`}>
                                <LucideIcon name={hookMode === 'auto' ? "brain-circuit" : hookMode === 'manual' ? "pen-tool" : hookMode === 'leal' ? "trending-up" : "shuffle"} className="w-8 h-8" />
                            </div>
                            <p className="text-center text-sm font-medium mb-1 font-sans">{hookMode === 'auto' ? "Conversion Intelligence Engine" : hookMode === 'manual' ? "Modo Manual" : hookMode === 'leal' ? "Estratégia Afiliado Leal" : "Spintax Rápido"}</p>
                            <p className="text-center text-xs text-slate-500 max-w-[250px] font-sans">
                                {hookMode === 'auto' 
                                    ? "Insira as variáveis de conversão para gerar Ganchos, Estruturas Grok/Veo/Sora e Mapeamento Psicológico." 
                                    : hookMode === 'manual' ? "Preencha os detalhes manualmente para controle total da geração baseada nos 7 ganchos virais." 
                                    : hookMode === 'leal' ? "Utilize os 5 ganchos estratégicos validados por Moisés Leal para conversão de produtos." 
                                    : "Sorteia roteiros aleatórios com elementos fixos de alta conversão sem consumo da API."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
