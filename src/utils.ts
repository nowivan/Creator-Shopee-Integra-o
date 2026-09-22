export const WORKER_URL = "https://holy-band-1f7frobizin-proxy.nowivan.workers.dev/";
export const WORKER_TOKEN = "minha_senha_super_secreta_2026";
export const TTS_WORKER_URL = "https://robizin-tts.nowivan.workers.dev/";
export const GEMINI_MODEL = "gemini-3.5-flash";
export const API_TIMEOUT_MS = 180000; // 3 minutos

import { POV_HOOKS } from "./constants";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { postToWorker, GeminiRequestAbortedError, GeminiRequestTimeoutError, isAbortError, isTimeoutError } from './services/workerClient';

const extractFieldValue = (text: string, keys: string[]): string => {
    for (const key of keys) {
        const regex = new RegExp(key + "\\s*:\\s*([^\\n]+)", "i");
        const match = text.match(regex);
        if (match && match[1]) {
            return match[1].trim().replace(/['"{}[\],]/g, '');
        }
    }
    return "";
};

export const getMockResponseForPrompt = (prompt: string): any => {
    const promptLower = (prompt || "").toLowerCase();
    const prodName = extractFieldValue(prompt, ["nome do produto", "productname", "produto", "nome"]) || "Produto Premium";
    const category = extractFieldValue(prompt, ["categoria", "category"]) || "⌚ Relógios & Smartwatches";

    // 1. Visual analysis / product DNA
    if (promptLower.includes("product_dna") || promptLower.includes("object_lock") || promptLower.includes("análise visual") || promptLower.includes("analise")) {
        return {
            productName: prodName,
            category: category,
            objective: "Conversão de Vendas",
            visualStyle: "Cinematic Premium",
            ctaStyle: "DIRETO",
            voiceStyle: "Conversacional",
            productNameConfidence: 98,
            categoryConfidence: 95,
            voiceStyleConfidence: 95,
            detectedName: prodName,
            detectedCategory: category,
            targetAudience: "Homens e mulheres interessados em qualidade premium",
            communicationTone: "Premium, sofisticado e confiante",
            recommendedVoiceStyle: "Tom de autoridade e confiante",
            recommendedStructure: "Cinematic Show",
            object_lock: {
                brand: prodName.split(' ')[0] || "Cronos",
                product_name: prodName,
                primary_color: "Cor Principal Original",
                secondary_color: "Detalhe de Acabamento",
                material: "Liga Escovada Resistente",
                shape: "Formatergônomico balanceado",
                logo: "Marca gravada em alta definição",
                features: ["Acabamento fosco", "Detalhes metálicos", "Lentes reflexivas"]
            },
            product_dna: {
                product_identity: prodName + " Premium",
                product_shape: "Design ergonômico curvilíneo",
                product_color: "Tonalidades cromáticas premium",
                product_material: "Materiais duráveis de alta resistência",
                product_texture: "Textura agradável com excelente aderência",
                visible_logo: "Símbolos e logo gravados em alta definição",
                visible_text: prodName.toUpperCase(),
                key_visual_features: "Elementos brilhantes, detalhes metálicos adicionais",
                product_quantity: "1 item principal",
                product_accessories: "Estojo de luxo, embalagem premium e manuais"
            },
            product_lock_prompt_en: `Keep the uploaded ${prodName} exactly identical to the reference image. The item is a specific product with design features, shape, colored in exact colors. Crafted from material with smooth/textured surface. Keep all branding, visible text and labels completely untouched.`
        };
    }

    // 2. Videomaker scenes generation
    if (promptLower.includes("veo_structure") || promptLower.includes("sora_structure") || promptLower.includes("grok") || promptLower.includes("scene_blocks") || promptLower.includes("scenes") || promptLower.includes("roterizar")) {
        return {
            creator_prompt: `Premium product showcase commercial for ${prodName} directed in cinematic realism. Highly focused close-ups of product design and features, transition cuts showing elegant handling, finishing on a strong call to action.`,
            veo_structure: [
                {
                    scene_number: 1,
                    segment_name: "Visual Opener hook",
                    action_prompt_en: `A beautiful cinematic macro tracking shot of the premium ${prodName}, catching golden light reflections, slow motion.`,
                    visual_cue_pt_br: `Close-up premium do ${prodName} brilhando sob luz suave.`,
                    sound_cue_pt_br: "Efeito sonoro de transição suave dramática.",
                    speaker: "NARRADOR",
                    dialogue_pt_br: `Você já viu algo com esse nível de acabamento no ${prodName}?`,
                    secondary_character_action: "Nenhum",
                    screen_time_seconds: "4s",
                    remodeling_warning: "Nenhum"
                },
                {
                    scene_number: 2,
                    segment_name: "Core Benefit Show",
                    action_prompt_en: `Product layout in hand demonstrating ${prodName} ergonomic shape and high-quality build materials, seamless movement.`,
                    visual_cue_pt_br: `Mão confiante demonstrando a ergonomia e design do ${prodName}.`,
                    sound_cue_pt_br: "Batida eletrônica de fundo premium e motivadora.",
                    speaker: "NARRADOR",
                    dialogue_pt_br: `Feito sob medida para quem preza por sofisticação e alta performance no dia a dia.`,
                    secondary_character_action: "Nenhum",
                    screen_time_seconds: "6s",
                    remodeling_warning: "Nenhum"
                },
                {
                    scene_number: 3,
                    segment_name: "Strong Call to Action",
                    action_prompt_en: `Macro pan to the elegant brand logo on ${prodName}, fading to a clean elegant web interface showing 'Adicionar ao carrinho'.`,
                    visual_cue_pt_br: "Zoom suave no logotipo da marca com botão virtual de compra.",
                    sound_cue_pt_br: "Som de clique suave de confirmação.",
                    speaker: "NARRADOR",
                    dialogue_pt_br: "Garanta o seu hoje mesmo com frete grátis clicando no link abaixo.",
                    secondary_character_action: "Nenhum",
                    screen_time_seconds: "5s",
                    remodeling_warning: "Nenhum"
                }
            ],
            sora_structure: [
                {
                    scene_number: 1,
                    segment_name: "Sora Hook",
                    action_prompt_en: `Photorealistic close-up of ${prodName} showing intricate components, ultra high details, golden glow.`,
                    speaker: "NARRADOR",
                    dialogue_pt_br: `Você já viu algo com esse nível de acabamento no ${prodName}?`
                }
            ],
            grok_structure: [
                {
                    scene_number: 1,
                    segment_name: "Grok Visual",
                    action_prompt_en: `Crisp macro shot of ${prodName} under vibrant dynamic lighting conditions, modern tech vibe.`,
                    speaker: "NARRADOR",
                    dialogue_pt_br: `Você já viu algo com esse nível de acabamento no ${prodName}?`
                }
            ]
        };
    }

    // 3. Ideation / viral concepts
    if (promptLower.includes("ideador") || promptLower.includes("ideação") || promptLower.includes("ideias") || promptLower.includes("viral ideas") || promptLower.includes("disruptivas") || promptLower.includes("nicho")) {
        return [
            {
                "title": `O Segredo Revelado: ${prodName}`,
                "hook": `Eu aposto que você nunca viu nada parecido com o ${prodName} antes...`,
                "duration": "25s",
                "suggestedVisualPromptEn": `Cinematic close-up of a premium sleek ${prodName} being unboxed under soft ambient light, slow-motion, highly detailed macro shot.`,
                "dialoguePtBr": `Olha a precisão do ${prodName}. Todo mundo me pergunta onde comprei, e honestamente, virou meu item favorito do dia a dia.`,
                "why": `Gera curiosidade imediata com o gancho misterioso e foca no design exclusivo do ${prodName}.`
            },
            {
                "title": `Antes vs Depois Surreal com ${prodName}`,
                "hook": "Sua rotina nunca mais será a mesma depois de assistir esse vídeo.",
                "duration": "30s",
                "suggestedVisualPromptEn": `Split screen showing immediate positive transition, ${prodName} in action with warm light, modern minimal background.`,
                "dialoguePtBr": `Eu costumava perder tanto tempo com o método antigo. Agora, com apenas um clique de ${prodName}, está tudo perfeito.`,
                "why": `O contraste nítido de dor vs solução demonstra valor prático instantâneo do ${prodName}.`
            },
            {
                "title": `Dica de Milhões sobre ${prodName}`,
                "hook": "Essa é a melhor escolha que tomei este ano e posso provar.",
                "duration": "20s",
                "suggestedVisualPromptEn": `Hands demonstrating the main feature of ${prodName} with high-contrast macro details, bright clean studio setup.`,
                "dialoguePtBr": `Se você preza por durabilidade e sofisticação, esse detalhe do ${prodName} aqui faz toda a diferença.`,
                "why": `Aprovações sociais implícitas de autoridade que impulsionam desejo imediato no ${prodName}.`
            },
            {
                "title": `Review Sincero de ${prodName}`,
                "hook": `Eu comprei o ${prodName} achando que seria só mais uma propaganda...`,
                "duration": "35s",
                "suggestedVisualPromptEn": `UGC-style holding the ${prodName}, moving it around to catch highlights, warm lighting, cozy elegant atmosphere.`,
                "dialoguePtBr": `Mas o ${prodName} me surpreendeu de verdade. O material é extremamente resistente e o acabamento supera as fotos.`,
                "why": `Estética realista de criador gera conexão autêntica e quebra objeções de compra.`
            },
            {
                "title": `POV Estilo de Vida com ${prodName}`,
                "hook": "POV: Você finalmente encontrou o que faltava para o seu dia a dia.",
                "duration": "15s",
                "suggestedVisualPromptEn": `Dynamic lifestyle shot of the ${prodName} seamlessly integrated in a premium desktop or fashion layout.`,
                "dialoguePtBr": `O ${prodName} combina com qualquer ocasião e carrega uma personalidade única. Vale cada centavo.`,
                "why": "Foca no apelo estético aspiracional e status que o produto agrega."
            }
        ];
    }

    // 4. Hook generator
    if (promptLower.includes("grouped_hooks") || promptLower.includes("6 categorias") || promptLower.includes("curiosity") || (promptLower.includes("ganchos") && promptLower.includes("ugc"))) {
        return {
            "grouped_hooks": {
                "Curiosity": [
                    `Eu aposto que você nunca viu o ${prodName} funcionando desse jeito...`,
                    `O segredo por trás do ${prodName} que ninguém te conta no TikTok.`,
                    `Descobri por que todo mundo está trocando tudo pelo ${prodName}.`,
                    `Se você usa métodos comuns, precisa conhecer o ${prodName} agora.`
                ],
                "Pain": [
                    `Cansado de perder tempo e dinheiro com produtos que não funcionam?`,
                    `O maior erro que você comete todo dia antes de ter o ${prodName}.`,
                    `Chega de sofrer com soluções ultrapassadas. O ${prodName} resolve isso.`,
                    `Você ainda perde horas nisso? O ${prodName} foi feito pra você.`
                ],
                "Benefit": [
                    `Como ter resultados 3x mais rápidos usando o ${prodName}.`,
                    `O ${prodName} entrega praticidade máxima logo no primeiro uso.`,
                    `Economize tempo e esforço todos os dias com o novo ${prodName}.`,
                    `Tenha a facilidade que você sempre quis com o ${prodName} na sua rotina.`
                ],
                "Price": [
                    `Parece coisa de mil reais, mas o ${prodName} custa menos que uma pizza.`,
                    `O melhor custo-benefício do ano: tudo o que o ${prodName} entrega por esse valor.`,
                    `Você não precisa gastar uma fortuna para ter a qualidade do ${prodName}.`,
                    `Menos de 2 reais por dia para transformar sua rotina com o ${prodName}.`
                ],
                "Urgency": [
                    `Aproveite antes que o lote do ${prodName} esgote no estoque!`,
                    `Últimas unidades do ${prodName} com frete grátis liberado hoje.`,
                    `Essa condição especial para o ${prodName} não vai durar até amanhã.`,
                    `Se você não garantir o seu ${prodName} agora, vai pagar mais caro depois.`
                ],
                "UGC": [
                    `Gente, comprei o ${prodName} achando que era meme e olha isso...`,
                    `Meu relato 100% sincero depois de testar o ${prodName} por uma semana.`,
                    `Todo mundo me perguntou no direct onde eu achei esse ${prodName} incrível.`,
                    `Minha mãe duvidou, mas quando viu o ${prodName} funcionando pediu um pra ela!`
                ]
            },
            "ideal_script": `Se você quer praticidade de verdade sem gastar uma fortuna, o ${prodName} é a solução perfeita. Garanta o seu hoje mesmo no link abaixo!`
        };
    }

    if (promptLower.includes("hook") || promptLower.includes("ganchos") || promptLower.includes("viral hooks")) {
        return [
            {
                "hook": `Assista até o fim se você valoriza o seu tempo livre com ${prodName}...`,
                "visibilidade": "Alta",
                "estilo": "Gatilho de Curiosidade"
            },
            {
                "hook": `Este simples ${prodName} mudou completamente a forma como eu resolvo meus problemas.`,
                "visibilidade": "Extrema",
                "estilo": "Dor vs Solução"
            },
            {
                "hook": `Aqui está o porquê de tanta gente estar escolhendo o ${prodName} este ano.`,
                "visibilidade": "Alta",
                "estilo": "Prova Social"
            }
        ];
    }

    // 5. Scene 3 CTA Engine / CTA Hub
    if (promptLower.includes("agente dedicado de cta cena 3") || promptLower.includes("scene3_cta_engine") || (promptLower.includes("carrinho laranja") && promptLower.includes("cena 3"))) {
        return `VERSÃO 1: Se ainda estiver disponível para o seu endereço, aproveite agora. Toque no carrinho laranja logo abaixo e garanta o seu com total tranquilidade hoje mesmo.
VERSÃO 2: Não deixe para depois caso essa opção ainda esteja aparecendo. Clique no carrinho laranja abaixo e faça o seu pedido com toda a segurança com poucos toques.
VERSÃO 3: Se você gostou desse item, garanta já enquanto a condição estiver ativa. Toque no carrinho laranja aqui embaixo e conclua sua compra com muita facilidade.`;
    }

    // 6. Combined Scene 2 + Scene 3 Variations Hub
    if (promptLower.includes("combined_variations") || promptLower.includes('"pairs"') || promptLower.includes('"corrections"') || (promptLower.includes("cena 2") && promptLower.includes("cena 3"))) {
        if (promptLower.includes('"corrections"') || promptLower.includes("correção granular")) {
            return {
                "corrections": [
                    {
                        "pairIndex": 1,
                        "salesAngle": "Praticidade no dia a dia",
                        "scene2Copy": "Com acabamento aveludado e estrutura de altíssima durabilidade, este produto garante praticidade real e resistência superior para transformar o seu uso no dia a dia.",
                        "scene3Cta": "Aproveite esta condição única com envio rápido e garantia total. Toque agora no carrinho laranja abaixo antes que o lote disponível seja totalmente encerrado hoje."
                    }
                ]
            };
        }

        return {
            "pairs": [
                {
                    "salesAngle": "Praticidade no dia a dia",
                    "scene2Copy": "Com acabamento aveludado e estrutura de altíssima durabilidade, este produto garante praticidade real e resistência superior para transformar o seu uso no dia a dia.",
                    "scene3Cta": "Aproveite esta condição única com envio rápido e garantia total. Toque agora no carrinho laranja abaixo antes que o lote disponível seja totalmente encerrado hoje."
                },
                {
                    "salesAngle": "Custo-benefício comprovado",
                    "scene2Copy": "Desenvolvido com foco total na facilidade de uso, ele resolve suas tarefas com agilidade sem exigir esforço extra, proporcionando muito mais conforto e segurança.",
                    "scene3Cta": "Não deixe para depois e garanta já o seu exemplar com qualidade comprovada. Toque no carrinho laranja logo abaixo para aproveitar essa oportunidade antes de acabar."
                },
                {
                    "salesAngle": "Durabilidade e resistência",
                    "scene2Copy": "Sua textura especial combinada com materiais reforçados garante proteção prolongada contra desgastes, mantendo o aspecto de novo por muito mais tempo em sua rotina.",
                    "scene3Cta": "Últimas unidades com entrega garantida para o seu endereço hoje mesmo. Clique no carrinho laranja abaixo e finalize seu pedido com total segurança antes do fim do dia."
                }
            ]
        };
    }

    // 6. Short Ad Copy
    if (promptLower.includes("ad copy") || promptLower.includes("anúncio") || promptLower.includes("copy")) {
        return `🔥 ATENÇÃO DESEJA MAIS PRATICIDADE? 🔥\n\nConheça o novo ${prodName}! Desenvolvido com tecnologia de ponta e materiais de extrema durabilidade.\n\nPrincipais Vantagens:\n✅ Durabilidade Garantida\n✅ Design Elegante e Atemporal\n✅ Alta Praticidade no Dia a Dia\n\n👉 Aproveite hoje mesmo com Frete Grátis para todo Brasil clicando em comprar agora!`;
    }

    // General fallback
    return `Resultado premium gerado com sucesso para o produto ${prodName}.`;
};

export const prepararPayloadSeguro = (payloadAtual: any, promptUsuario?: string) => {
    let promptFinal = (promptUsuario || payloadAtual?.prompt || "").toString().trim();

    const isEntrevista = /entrevista|entrevistador|microfone|duas pessoas|interview|quem é quem/i.test(promptFinal);

    if (isEntrevista) {
        promptFinal += "\n\n[🔥 MODO ENTREVISTA - REGRA CIRÚRGICA OBRIGATÓRIA]\n" +
            "Este é um vídeo de entrevista com 2 pessoas em PT-BR.\n" +
            "- Pessoa no centro (com a camiseta brilhante) = ENTREVISTADO\n" +
            "- Braço + mão segurando o microfone = ENTREVISTADOR\n\n" +
            "Retorne APENAS este JSON exato (sem texto extra):\n" +
            "{\n" +
            '  "blocks": [\n' +
            '    { "speaker": "ENTREVISTADOR", "dialogue_pt_br": "fala aqui" },\n' +
            '    { "speaker": "ENTREVISTADO", "dialogue_pt_br": "fala aqui" }\n' +
            "  ]\n" +
            "}";
    }

    const sanitized = { ...payloadAtual };
    const isScene3Cta = sanitized.mode === 'scene3_cta_engine' || sanitized.mode === 'scene3_cta_engine_repair';
    const modelStr = String(sanitized.model || '');
    const isFlashThinkingFamily = !modelStr || /gemini-(2\.5|3\.5)-flash/i.test(modelStr);

    if (sanitized.generationConfig && typeof sanitized.generationConfig === 'object') {
        if (isScene3Cta && isFlashThinkingFamily) {
            // Authorized Scene 3 CTA Engine: apply thinkingBudget: 0 for low latency on short copy
            sanitized.generationConfig = {
                ...sanitized.generationConfig,
                thinkingConfig: {
                    thinkingBudget: 0
                }
            };
        } else {
            // All other agents/modes: strip thinkingConfig so they never inherit this
            const { thinkingConfig, thinking_config, ...restGenConfig } = sanitized.generationConfig;
            sanitized.generationConfig = restGenConfig;
        }
    } else if (isScene3Cta && isFlashThinkingFamily) {
        sanitized.generationConfig = {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
            thinkingConfig: {
                thinkingBudget: 0
            }
        };
    }
    delete sanitized.thinkingConfig;
    delete sanitized.thinking_config;

    return {
        ...sanitized,
        prompt: promptFinal
    };
};

export const compressImageFile = (file: File, maxDim = 1280, quality = 0.85): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result?.toString() || '';
                const b64 = result.includes(',') ? result.split(',')[1] : result;
                resolve({ base64: b64, mimeType: file?.type || 'image/jpeg' });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const b64 = dataUrl.split(',')[1] || '';
                    resolve({ base64: b64, mimeType: 'image/jpeg' });
                } else {
                    const result = e.target?.result?.toString() || '';
                    const b64 = result.includes(',') ? result.split(',')[1] : result;
                    resolve({ base64: b64, mimeType: file.type || 'image/jpeg' });
                }
            };
            img.onerror = () => {
                const result = e.target?.result?.toString() || '';
                const b64 = result.includes(',') ? result.split(',')[1] : result;
                resolve({ base64: b64, mimeType: file.type || 'image/jpeg' });
            };
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const pcmToWav = (pcmBytes: Uint8Array, sampleRate = 24000) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBytes.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const pcmArray = new Uint8Array(buffer, 44);
    pcmArray.set(pcmBytes);

    return new Blob([buffer], { type: 'audio/wav' });
};

export const extractAudioFromVideo = async (videoFile: File): Promise<File> => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const arrayBuffer = await videoFile.arrayBuffer();
        
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        const targetSampleRate = 16000;
        const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
        const offlineCtx = new OfflineAudioContextClass(1, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        
        const renderedBuffer = await offlineCtx.startRendering();
        
        const length = renderedBuffer.length * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        let pos = 0;
        
        const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
        const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };
        
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8);
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt "
        setUint32(16);
        setUint16(1); // PCM
        setUint16(1); // Mono
        setUint32(targetSampleRate);
        setUint32(targetSampleRate * 2);
        setUint16(2);
        setUint16(16);
        setUint32(0x61746164); // "data"
        setUint32(length - pos - 4);
        
        const channelData = renderedBuffer.getChannelData(0);
        for (let i = 0; i < renderedBuffer.length; i++) {
            let sample = Math.max(-1, Math.min(1, channelData[i]));
            sample = sample < 0 ? sample * 32768 : sample * 32767;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        
        return new File([buffer], "audio_extraido.wav", { type: "audio/wav" });
    } catch (e) {
        throw new Error("Não foi possível extrair o áudio deste formato de vídeo. Tente um MP4 padrão.");
    }
};

export const safeLocalStorageSet = (key: string, data: any): boolean => {
    try {
        if (key === 'robizin_avatars' && Array.isArray(data)) {
            // Import and use canonical avatar persistence
            const serialized = data.map((item: any) => {
                if (item && typeof item === 'object') {
                    const profile = item.profile ? {
                        ...item.profile,
                        originalImage: '',
                        cleanedImage: undefined
                    } : undefined;
                    return {
                        id: item.id,
                        name: item.name || 'Avatar',
                        image: item.image || '',
                        masterPrompt: item.masterPrompt || item.profile?.identityPrompt || '',
                        profile
                    };
                }
                return item;
            });
            localStorage.setItem(key, JSON.stringify(serialized));
            if (typeof window !== 'undefined') {
                try {
                    window.dispatchEvent(new CustomEvent('creatorpro:avatars-updated', { detail: { count: serialized.length } }));
                } catch (e) {}
            }
            return true;
        }

        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e: any) {
        console.error(`[safeLocalStorageSet] Error saving key "${key}":`, e);
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            const lightData = Array.isArray(data) ? data.map(item => {
                if (item && typeof item === 'object') {
                    const { thumbnail, originalImage, cleanedImage, ...rest } = item;
                    return { ...rest, thumbnail: null };
                }
                return item;
            }) : data;
            try { 
                localStorage.setItem(key, JSON.stringify(lightData)); 
                return true;
            } catch (e2) {
                console.error(`[safeLocalStorageSet] Quota exceeded on secondary attempt for key "${key}":`, e2);
                return false;
            }
        }
        return false;
    }
};

export const sanitizeJsonString = (str: string): string => {
    let result = "";
    let insideString = false;
    let escaped = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && !escaped) {
            insideString = !insideString;
        }
        
        if (insideString) {
            if (char === '\n') {
                result += "\\n";
            } else if (char === '\r') {
                result += "\\r";
            } else if (char === '\t') {
                result += "\\t";
            } else {
                result += char;
            }
        } else {
            result += char;
        }
        
        if (char === '\\' && !escaped) {
            escaped = true;
        } else {
            escaped = false;
        }
    }
    return result;
};

export const extractJsonBlock = (str: string): string => {
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) {
        return str;
    }
    
    const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    const startChar = str[startIdx];
    const endChar = startChar === '{' ? '}' : ']';
    
    let depth = 0;
    let insideString = false;
    let escaped = false;
    
    for (let i = startIdx; i < str.length; i++) {
        const char = str[i];
        
        if (char === '"' && !escaped) {
            insideString = !insideString;
        }
        
        if (!insideString) {
            if (char === startChar) {
                depth++;
            } else if (char === endChar) {
                depth--;
                if (depth === 0) {
                    return str.substring(startIdx, i + 1);
                }
            }
        }
        
        if (char === '\\' && !escaped) {
            escaped = true;
        } else {
            escaped = false;
        }
    }
    
    return str.substring(startIdx);
};

export const repairTruncatedJson = (jsonStr: string): string => {
    let str = jsonStr.trim();
    if (!str) return "{}";
    
    let insideString = false;
    let escaped = false;
    let stack: string[] = [];
    let cleanStr = "";
    
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (insideString) {
            if (char === '\\') {
                escaped = !escaped;
            } else if (char === '"' && !escaped) {
                insideString = false;
            } else {
                escaped = false;
            }
            cleanStr += char;
        } else {
            if (char === '"') {
                insideString = true;
                escaped = false;
                cleanStr += char;
            } else if (char === '{') {
                stack.push('{');
                cleanStr += char;
            } else if (char === '[') {
                stack.push('[');
                cleanStr += char;
            } else if (char === '}') {
                if (stack[stack.length - 1] === '{') {
                    stack.pop();
                    cleanStr += char;
                }
            } else if (char === ']') {
                if (stack[stack.length - 1] === '[') {
                    stack.pop();
                    cleanStr += char;
                }
            } else {
                cleanStr += char;
            }
        }
    }
    
    if (insideString) {
        if (cleanStr.endsWith('\\')) {
            cleanStr = cleanStr.slice(0, -1);
        }
        cleanStr += '"';
    }
    
    let repaired = cleanStr.trim();
    
    while (true) {
        const lastLen = repaired.length;
        repaired = repaired.trim();
        
        if (repaired.endsWith(',')) {
            repaired = repaired.slice(0, -1).trim();
            continue;
        }
        
        if (repaired.endsWith(':')) {
            repaired = repaired.slice(0, -1).trim();
            if (repaired.endsWith('"')) {
                let quoteCount = 0;
                let j = repaired.length - 1;
                while (j >= 0) {
                    if (repaired[j] === '"' && (j === 0 || repaired[j-1] !== '\\')) {
                        quoteCount++;
                        if (quoteCount === 2) {
                            break;
                        }
                    }
                    j--;
                }
                if (j >= 0) {
                    repaired = repaired.slice(0, j).trim();
                }
            }
            continue;
        }
        
        if (repaired.endsWith('"')) {
            let quoteCount = 0;
            let j = repaired.length - 1;
            while (j >= 0) {
                if (repaired[j] === '"' && (j === 0 || repaired[j-1] !== '\\')) {
                    quoteCount++;
                    if (quoteCount === 2) {
                        break;
                    }
                }
                j--;
            }
            if (j >= 0) {
                const beforeString = repaired.slice(0, j).trim();
                if (beforeString.endsWith(',') || beforeString.endsWith('{') || beforeString.endsWith('[')) {
                    let currentStack: string[] = [];
                    let insideStr = false;
                    let esc = false;
                    for (let k = 0; k < j; k++) {
                        const char = beforeString[k];
                        if (insideStr) {
                            if (char === '\\') esc = !esc;
                            else if (char === '"' && !esc) insideStr = false;
                            else esc = false;
                        } else {
                            if (char === '"') { insideStr = true; esc = false; }
                            else if (char === '{' || char === '[') currentStack.push(char);
                            else if (char === '}' || char === ']') currentStack.pop();
                        }
                    }
                    const deepest = currentStack[currentStack.length - 1];
                    if (deepest === '{') {
                        repaired = beforeString;
                        continue;
                    }
                }
            }
        }
        
        if (repaired.length === lastLen) {
            break;
        }
    }
    
    let lastWordMatch = repaired.match(/([a-zA-Z]+)$/);
    if (lastWordMatch) {
        const word = lastWordMatch[1];
        if (word === 'tru' || word === 'tr' || word === 't') {
            repaired = repaired.slice(0, -word.length) + 'true';
        } else if (word === 'fals' || word === 'fal' || word === 'fa' || word === 'f') {
            repaired = repaired.slice(0, -word.length) + 'false';
        } else if (word === 'nul' || word === 'nu' || word === 'n') {
            repaired = repaired.slice(0, -word.length) + 'null';
        } else {
            repaired = repaired.slice(0, -word.length).trim();
        }
    }
    
    if (repaired.endsWith('.')) {
        repaired = repaired.slice(0, -1).trim();
    }
    
    let finalStack: string[] = [];
    let insStr = false;
    let esc = false;
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        if (insStr) {
            if (char === '\\') esc = !esc;
            else if (char === '"' && !esc) insStr = false;
            else esc = false;
        } else {
            if (char === '"') { insStr = true; esc = false; }
            else if (char === '{') finalStack.push('{');
            else if (char === '[') finalStack.push('[');
            else if (char === '}') {
                if (finalStack[finalStack.length - 1] === '{') finalStack.pop();
            }
            else if (char === ']') {
                if (finalStack[finalStack.length - 1] === '[') finalStack.pop();
            }
        }
    }
    
    while (finalStack.length > 0) {
        const open = finalStack.pop();
        if (open === '{') repaired += '}';
        else if (open === '[') repaired += ']';
    }
    
    return repaired;
};

export const safeJSONParse = (text: any, fallback: any = null) => {
    if (typeof text === 'object' && text !== null) return text;
    try {
        if (!text || typeof text !== 'string') return fallback;
        
        let cleaned = text.replace(/```json|```/gi, '').trim();
        cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        
        // Try extracting balanced block first
        const block = extractJsonBlock(cleaned);
        const sanitizedBlock = sanitizeJsonString(block);
        
        try {
            const parsed = JSON.parse(sanitizedBlock);
            if (typeof parsed === 'string' && (parsed.trim().startsWith('{') || parsed.trim().startsWith('['))) {
                try { return JSON.parse(parsed); } catch (_) {}
            }
            return parsed;
        } catch (err) {
            // Attempt to repair truncated JSON
            try {
                const repaired = repairTruncatedJson(cleaned);
                return JSON.parse(sanitizeJsonString(repaired));
            } catch (_) {}

            try {
                return JSON.parse(sanitizeJsonString(cleaned));
            } catch (_) {}
            
            const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (match) {
                try {
                    return JSON.parse(sanitizeJsonString(match[0]));
                } catch (_) {}
                
                try {
                    const repairedMatch = repairTruncatedJson(match[0]);
                    return JSON.parse(sanitizeJsonString(repairedMatch));
                } catch (_) {}
            }

            // Fallback for unquoted keys or trailing commas or single-quoted values
            try {
                let fixed = cleaned
                    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
                    .replace(/,\s*([\}\]])/g, '$1');
                return JSON.parse(fixed);
            } catch (_) {}

            throw err;
        }
    } catch (e: any) {
        console.warn('safeJSONParse - JSON Parse Error:', e.message, '\nTexto recebido:', text?.substring(0, 200));
        return fallback;
    }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err2) {
            return false;
        }
    }
};

const cleanCandidates = (candidatesArray: any[]) => {
    if (!Array.isArray(candidatesArray)) return candidatesArray;
    return candidatesArray.map(candidate => {
        if (!candidate?.content?.parts) return candidate;
        const parts = candidate.content.parts;
        const nonThoughtParts = parts.filter((p: any) => p && p.text && !p.thought);
        if (nonThoughtParts.length > 0) {
            return {
                ...candidate,
                content: {
                    ...candidate.content,
                    parts: nonThoughtParts
                }
            };
        }
        return candidate;
    });
};

export const normalizeWorkerResponse = (response: any) => {
    if (!response) {
        return {
            ok: false,
            partial: false,
            mode: null,
            request_id: null,
            data: null,
            raw_text: "",
            warnings: [],
            errorMessage: "Resposta nula ou inválida recebida da IA.",
            candidates: [],
            raw: null
        };
    }

    // 1. Check if it's the wrapped Cloudflare Worker response
    const hasWorkerFields = ('ok' in response) || ('raw_text' in response) || ('request_id' in response);
    
    if (hasWorkerFields) {
        const ok = response.ok !== false && !response.error;
        const raw_text = response.raw_text || response.message || "";
        let data = response.data || null;

        // If data is null/undefined but raw_text exists, target extracting json
        if (!data && raw_text) {
            data = safeJSONParse(raw_text, null);
        }

        const candidates = [
            {
                content: {
                    parts: [
                        { text: raw_text }
                    ]
                },
                finishReason: "STOP"
            }
        ];

        return {
            ok,
            partial: !!response.partial,
            mode: response.mode || null,
            request_id: response.request_id || null,
            data,
            raw_text,
            warnings: response.warnings || [],
            errorMessage: response.message || (ok ? null : "Erro do Worker."),
            candidates,
            raw: response
        };
    }

    // 2. Check if it's the older direct Gemini raw format (with candidates array)
    if (response.candidates && Array.isArray(response.candidates)) {
        const candidate = response.candidates[0];
        const parts = candidate?.content?.parts || [];
        const nonThoughtParts = parts.filter((p: any) => p && p.text && !p.thought);
        const text = nonThoughtParts.length > 0 
            ? nonThoughtParts.map((p: any) => p.text).join("")
            : (parts.filter((p: any) => p && p.text).map((p: any) => p.text).join("") || "");
        const parsedData = safeJSONParse(text, null);

        return {
            ok: true,
            partial: false,
            mode: null,
            request_id: null,
            data: parsedData,
            raw_text: text,
            warnings: [],
            errorMessage: null,
            candidates: cleanCandidates(response.candidates),
            raw: response
        };
    }

    // 3. Fallback: plain string or other object
    const raw_text = typeof response === 'string' ? response : (response.text || JSON.stringify(response));
    const parsedData = typeof response === 'object' && response !== null ? response : safeJSONParse(raw_text, null);

    const candidates = [
        {
            content: {
                parts: [
                    { text: raw_text }
                ]
            },
            finishReason: "STOP"
        }
    ];

    return {
        ok: true,
        partial: false,
        mode: null,
        request_id: null,
        data: parsedData || response,
        raw_text,
        warnings: [],
        errorMessage: null,
        candidates,
        raw: response
    };
};

export const processGeminiAPI = async (
    currentKey: string,
    payload: any,
    options: {
        useOfflineFallback?: boolean;
        signal?: AbortSignal;
        timeoutMs?: number;
        toolId?: string;
        moduleName?: string;
    } = {}
) => {
    const { useOfflineFallback = false, signal, timeoutMs, toolId, moduleName } = options;
    let promptText = "";
    
    // Strict whitelist of modes where generic fallback mocks are FORBIDDEN
    const NO_MOCK_MODES = new Set([
        'product_factual_grounding',
        'scene3_cta_engine',
        'scene3_cta_engine_repair',
        'scene2_copy_brain',
        'scene2_scene_brain',
        'scene3_scene_brain',
        'script_refiner',
        'compliance_script_audit',
        'punishment_print_analysis'
    ]);
    const isMockForbidden = payload?.mode && NO_MOCK_MODES.has(payload.mode);

    try {
        let textPartIndex = -1;
        let targetPartList = null;

        if (payload.contents && payload.contents[0] && payload.contents[0].parts) {
            const parts = payload.contents[0].parts;
            textPartIndex = parts.findIndex((p: any) => p.text);
            if (textPartIndex !== -1) {
                promptText = parts[textPartIndex].text;
                targetPartList = parts;
            }
        } else if (payload.prompt) {
            promptText = payload.prompt;
        }

        const securePayload = prepararPayloadSeguro(payload, promptText);
        
        if (securePayload.prompt && targetPartList && textPartIndex !== -1) {
            targetPartList[textPartIndex].text = securePayload.prompt;
            delete securePayload.prompt;
        }

        if (!securePayload.model && !securePayload.ai_target) {
            securePayload.model = GEMINI_MODEL;
        }

        console.log('Gemini API Request:', { endpoint: 'generateContent', payload: { ...securePayload, contents: '[...]' } });
        
        const resolvedToolId = toolId || payload?.toolId || moduleName || payload?.moduleName || payload?.mode || payload?.ai_target || 'unknown_tool';
        const resolvedModuleName = moduleName || payload?.moduleName || toolId || payload?.toolId || payload?.mode || 'unknown_tool';

        const normalized = await postToWorker<any>('/', securePayload, {
            timeoutMs: timeoutMs || API_TIMEOUT_MS,
            toolId: resolvedToolId,
            moduleName: resolvedModuleName,
            signal: signal
        });
        if (!normalized || !normalized.raw_text) {
            throw new Error("A resposta da IA veio em branco.");
        }
        console.log('Gemini API Success via postToWorker:', { ok: normalized.ok, request_id: normalized.request_id });
        return normalized;

    } catch (error: any) {
        // Never convert Abort or Timeout errors into generic mocks in ANY mode
        if (isAbortError(error) || isTimeoutError(error)) {
            console.warn('Gemini API Request Aborted/Timed out, skipping fallback:', error.message || error);
            throw error;
        }

        // Never generate synthetic mock for modes with strict schemas
        if (isMockForbidden) {
            console.warn(`Gemini API Error in strict mode '${payload?.mode}', skipping fallback:`, error.message || error);
            throw error;
        }

        console.warn('Gemini API Error, falling back to clean mock generation:', error);
        const mockData = getMockResponseForPrompt(promptText);
        const textVal = typeof mockData === 'string' ? mockData : JSON.stringify(mockData);
        const fallbackObj = {
            ok: true,
            raw_text: textVal,
            data: mockData
        };
        return normalizeWorkerResponse(fallbackObj);
    }
};

export const gerarNarracao = (script: string) => {
    if (!script) return "";
    return script
        .replace(/\*\*VERSÃO \d+\*\*/gi, "")
        .replace(/VERSÃO \d+:?/gi, "")
        .replace(/SCRIPT REFINADO:?/gi, "")
        .replace(/HOOK:?/gi, "")
        .replace(/APRESENTAÇÃO:?/gi, "")
        .replace(/PROVA:?/gi, "")
        .replace(/BENEFÍCIOS?:?/gi, "")
        .replace(/ANCORAGEM:?/gi, "")
        .replace(/CHOQUE DE PREÇO:?/gi, "")
        .replace(/PREÇO:?/gi, "") 
        .replace(/CTA:?/gi, "")
        .replace(/\*/g, "") 
        .replace(/\n/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
};

// Active Script Refiner Logic imports & re-exports
import {
    extractHook,
    extractCTA,
    detectScriptFacts,
    processVideoScript,
    getDurationWordLimits,
    normalizeOriginalScript
} from './features/script-refiner/scriptRefinerLogic';

export {
    extractHook,
    extractCTA,
    detectScriptFacts,
    processVideoScript,
    getDurationWordLimits,
    normalizeOriginalScript as cleanTranscript
};

/**
 * Central Session Storage Wrapper for persistent app session & tool status.
 * Ensures state is persisted safely and survives page refreshes.
 */
export const sessionStore = {
    get: <T>(key: string, defaultValue: T): T => {
        try {
            const item = sessionStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item) as T;
        } catch (error) {
            console.warn(`Error reading sessionStorage key "${key}":`, error);
            return defaultValue;
        }
    },
    set: <T>(key: string, value: T): void => {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Error setting sessionStorage key "${key}":`, error);
        }
    },
    remove: (key: string): void => {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.warn(`Error removing sessionStorage key "${key}":`, error);
        }
    },
    clear: (): void => {
        try {
            sessionStorage.clear();
        } catch (error) {
            console.warn('Error clearing sessionStorage:', error);
        }
    }
};

export interface ExportScriptToPDFOptions {
    fileName?: string;
    title: string;
    subtitle?: string;
    productName?: string;
    audience?: string;
    features?: string;
    scriptText: string;
}

export const exportScriptToPDF = (options: ExportScriptToPDFOptions) => {
    const {
        fileName = 'roteiro_creator_pro.pdf',
        title,
        subtitle = 'Suite de IA para Criadores Profissionais',
        productName = 'Não Informado',
        audience = 'Não Informado',
        features,
        scriptText
    } = options;

    try {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - (margin * 2);

        // Header Color Accent (slate-900 / dark brand)
        doc.setFillColor(15, 23, 42); // deep slate #0F172A
        doc.rect(0, 0, pageWidth, 42, 'F');

        // Brand Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("CREATOR INTELLIGENCE PRO", margin, 18);
        
        // Subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text(subtitle, margin, 24);

        // Title / Document Type
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(129, 140, 248); // indigo-400
        doc.text(title.toUpperCase(), margin, 31);

        // Slogan right aligned
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("Analise. Remodele. Domine.", pageWidth - margin - 45, 31);

        let currentY = 52;

        // Use jspdf-autotable to draw a beautiful metadata table
        const tableRows = [
            ["Produto / Oferta", productName],
            ["Público-Alvo", audience],
        ];
        if (features) {
            tableRows.push(["Diferenciais / Recursos", features]);
        }
        tableRows.push(["Data de Geração", `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`]);

        // Use autoTable safely
        (doc as any).autoTable({
            startY: currentY,
            margin: { left: margin, right: margin },
            head: [["Informações da Estratégia", "Detalhes"]],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [30, 41, 59], // slate-800
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [51, 65, 85] // slate-700
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 45 },
                1: { cellWidth: 'auto' }
            },
            didDrawPage: (data: any) => {
                currentY = data.cursor.y + 12;
            }
        });

        // Render the Script Content
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42); // slate-900

        if (currentY + 10 > 280) {
            doc.addPage();
            currentY = 25;
        }

        doc.text("CONTEÚDO DO ROTEIRO", margin, currentY);
        currentY += 8;

        // Split text into paragraphs
        const paragraphs = scriptText.split('\n');

        paragraphs.forEach((para) => {
            const trimmed = para.trim();
            if (!trimmed) {
                currentY += 2; // small spacing on empty lines
                return;
            }

            // Determine formatting based on script segment types
            const isHeading = trimmed.startsWith('#') || trimmed.match(/^[\*\-\s\#]*VERSÃO\s*\d+/i) || trimmed.match(/^[\*\-\s\#]*SCRIPT REFINADO/i);
            const isHook = trimmed.match(/^HOOK:?/i) || trimmed.match(/^\[HOOK\]/i) || trimmed.match(/^\*\*HOOK\*\*/i);
            const isCTA = trimmed.match(/^CTA:?/i) || trimmed.match(/^\[CTA\]/i) || trimmed.match(/^\*\*CTA\*\*/i) || trimmed.match(/carrinho laranja/i);
            const isBenefits = trimmed.match(/^BENEF[ÍI]CIOS:?/i) || trimmed.match(/^\[BENEF[ÍI]CIOS\]/i) || trimmed.match(/^\*\*BENEF[ÍI]CIOS\*\*/i);

            let fontStyle = 'normal';
            let fontSize = 9;
            let textColor = [51, 65, 85]; // slate-700 default

            if (isHeading) {
                fontStyle = 'bold';
                fontSize = 9.5;
                textColor = [79, 70, 229]; // indigo-600
                
                // Draw subtle background bar on new version sections
                if (trimmed.match(/VERSÃO\s*\d+/i)) {
                    if (currentY + 15 > 280) {
                        doc.addPage();
                        currentY = 25;
                    }
                    doc.setFillColor(241, 245, 249); 
                    doc.rect(margin, currentY - 2, maxLineWidth, 7, 'F');
                    currentY += 1;
                }
            } else if (isHook) {
                fontStyle = 'bold';
                textColor = [2, 132, 199]; // sky-600
            } else if (isCTA) {
                fontStyle = 'bold';
                textColor = [217, 119, 6]; // amber-600
            } else if (isBenefits) {
                fontStyle = 'bold';
                textColor = [16, 185, 129]; // emerald-600
            }

            const cleanText = trimmed
                .replace(/[\*\#]+/g, '') 
                .trim();

            doc.setFont("helvetica", fontStyle);
            doc.setFontSize(fontSize);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);

            const splitText = doc.splitTextToSize(cleanText, maxLineWidth);

            // Page breaking check
            if (currentY + (splitText.length * 5) > 280) {
                doc.addPage();
                currentY = 25;
            }

            const textX = isHeading ? margin : margin + 2;
            doc.text(splitText, textX, currentY);
            currentY += (splitText.length * 5) + 2.5;
        });

        // Pagination and styling footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184); 
            doc.text(`Gerado via Creator Intelligence Pro  |  Página ${i} de ${pageCount}`, margin, 287);
            doc.text(`Identidade de Marca: CREATOR PRO IA`, pageWidth - margin - 55, 287);
        }

        doc.save(fileName);
    } catch (err: any) {
        console.error("Erro ao gerar PDF:", err);
        alert("Erro ao exportar PDF: " + err.message);
    }
};

export function safeSaveHistory(newItem: { date: string; tool: string; title: string; content: string }) {
    try {
        let existing: any[] = [];
        try {
            existing = JSON.parse(localStorage.getItem('robizin_historical_runs') || '[]');
            if (!Array.isArray(existing)) {
                existing = [];
            }
        } catch (e) {
            existing = [];
        }

        // Limit the array size to prevent localStorage quota limit issues (e.g. keep max 40 items)
        const pruned = [newItem, ...existing].slice(0, 40);

        try {
            localStorage.setItem('robizin_historical_runs', JSON.stringify(pruned));
        } catch (setErr) {
            // If it still fails, let's try to prune it even more (e.g. max 10 items)
            try {
                localStorage.setItem('robizin_historical_runs', JSON.stringify([newItem].concat(existing).slice(0, 10)));
            } catch (innerErr) {
                console.error("Failed to save history even with pruned array:", innerErr);
            }
        }
    } catch (e) {
        console.error("Failed in safeSaveHistory:", e);
    }
}


