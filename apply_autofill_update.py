import re

with open('src/components/ReverseEngineeringView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = '    const normalizeDetectedCategory = '
if start_str not in content:
    start_str = '    const handleAutoFillProduct = async () => {'
end_str = '    const handleModeChange = (mode: \'preservar_viral\' | \'preservar_visual\' | \'remodelar_total\') => {'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

assert start_idx != -1 and end_idx != -1, f'Indices not found: {start_idx}, {end_idx}'

new_block = '''    const normalizeDetectedCategory = (aiCategory: string, productName: string = ''): string => {
        const combined = `${aiCategory || ''} ${productName || ''}`.toLowerCase().trim();
        if (!combined) return '';

        // 1. Calçados (Sandálias, rasteirinhas, tênis, sapatos, chinelos, botas, tamancos, etc.)
        if (/sand[aá]li|rasteir|chinel|t[eê]nis|sapat|bota|tamanc|mocassim|scarpin|rasteira|cal[cç]ad|crocs|slide|sneaker|footwear/i.test(combined)) {
            return 'Calçados';
        }

        // 2. Moda & Vestuário (Roupas, vestidos, camisas, calças, casacos, etc.)
        if (/vestu[aá]ri|roup|vestid|camis|camiset|cal[cç]a|jaquet|casac|short|saia|moletom|lingerie|biqu[ií]ni|moda\\b|blus/i.test(combined)) {
            return 'Moda & Vestuário';
        }

        // 3. Perfumaria & Beleza (Perfumes, cosméticos, maquiagem, skincare)
        if (/perfum|fragr[aâ]nc|col[oô]ni|aroma|desodor|maquiag|make|batom|rimel|r[ií]mel|skincare|pele|creme|hidratant|s[eé]rum|cabel|shampoo|condicionador|escova\\s+(?:alisadora|secadora)|cosm[eé]t/i.test(combined)) {
            return 'Perfumaria & Beleza';
        }

        // 4. Relógios & Smartwatch (Smartwatches, relógios de pulso, cronógrafos)
        if (/smartwatch|rel[oó]gi|relogio|wrist\\s*watch|cron[oó]graf|pulseira\\s+inteligent|apple\\s*watch|mi\\s*band/i.test(combined)) {
            return 'Relógios & Smartwatch';
        }

        // 5. Eletrônicos & Tecnologia (Fones, celulares, carregadores, caixas de som, gadgets)
        if (/eletr[oô]nic|fone|earbud|headphon|headset|bluetooth|celular|smartphon|carregador|powerbank|cabo\\s+usb|notebook|computad|tablet|gadget|caixa\\s+de\\s+som|drone|c[aâ]mera/i.test(combined)) {
            return 'Eletrônicos & Tecnologia';
        }

        // 6. Cozinha & Utilidades (Panelas, airfryer, liquidificador, potes, garrafas térmicas)
        if (/cozinh|panela|frigideir|air\\s*fryer|liquidificad|batedeir|pote|facas?|garrafa\\s*t[eé]rmic|copo\\s*stanley|utens[ií]lio|copo|caneca|prato|processador\\s+de\\s+alimento/i.test(combined)) {
            return 'Cozinha & Utilidades';
        }

        // 7. Casa & Organização (Cadeiras, sapateiras, organizadores, prateleiras, móveis, decoração)
        if (/casa\\b|organizad|sapateira|cabid|prateleir|gaveteir|m[oó]ve|cadeir|sof[aá]|mesa\\b|estante|almofad|cortina|lumin[aá]ri|abajur|decora[cç]|tapet|cama|len[cç]ol|toalha/i.test(combined)) {
            return 'Casa & Organização';
        }

        // 8. Saúde & Bem-Estar (Ortopedia, joelheiras, corretores posturais, massageadores, etc.)
        if (/sa[uú]de|ortop[eé]d|joelheir|corretor\\s+postural|massagead|palmilha|coluna|al[ií]vio\\s+de\\s+dor|suplement|term[oô]metr|inalad/i.test(combined)) {
            return 'Saúde & Bem-Estar';
        }

        // 9. Acessórios & Joias (Bolsas, carteiras, mochilas, colares, anéis, brincos, óculos)
        if (/acess[oó]ri|joia|j[oó]ia|bolsa|mochil|carteir|óculos|oculos|colar\\b|anel\\b|brinco|pulseira(?!.*inteligent)|bijuteri/i.test(combined)) {
            return 'Acessórios & Joias';
        }

        // 10. Automotivo (Acessórios para carro, suportes veiculares, limpadores)
        if (/automot|ve[ií]cul|carro|moto\\b|suporte\\s+veicular|aspirador\\s+port[aá]til|pneu/i.test(combined)) {
            return 'Automotivo';
        }

        // 11. Pet Shop
        if (/pet|cachorr|c[aã]o|gato|felin|ra[cç][aã]o|coleira|brinquedo\\s+pet|caminha\\s+pet|tapete\\s+higi[eê]nic/i.test(combined)) {
            return 'Pet Shop';
        }

        // 12. Infantil & Bebês
        if (/infantil|beb[eê]|crian[cç]|brinqued(?!.*pet)|mordedor|chupeta|carrinho\\s+de\\s+beb/i.test(combined)) {
            return 'Infantil & Bebês';
        }

        if (aiCategory && typeof aiCategory === 'string' && aiCategory.trim()) {
            const clean = aiCategory.trim();
            if (!/^(geral|produto|item|outro|outros|n\\/a|none|unknown)$/i.test(clean)) {
                return clean;
            }
        }

        return '';
    };

    const handleAutoFillProduct = async () => {
        if (!adaptImageFile && !adaptImageUrl) return alert("Envie uma imagem ou cole um link primeiro.");
        if (!currentKey) return alert("Configure a Chave API.");

        const requestId = ++autofillAnalysisRequestIdRef.current;
        resetDerivedProductFields();
        setIsAnalyzingAdaptProduct(true);
        try {
            let requestParts: any[] = [];
            if (adaptImageFile) {
                const b64 = await fileToBase64(adaptImageFile);
                requestParts.push({ inlineData: { mimeType: adaptImageFile.type, data: b64 } });
            } else if (adaptImageUrl) {
                try {
                    let response = await fetch(adaptImageUrl).catch(() => fetch('https://corsproxy.io/?' + encodeURIComponent(adaptImageUrl)));
                    if (!response || !response.ok) throw new Error("Erro no link.");
                    const blob = await response.blob();
                    const b64 = await new Promise<string>((resolve, reject) => { 
                        const reader = new FileReader(); 
                        reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || ''); 
                        reader.onerror = reject; 
                        reader.readAsDataURL(blob); 
                    });
                    requestParts.push({ inlineData: { mimeType: blob.type || 'image/jpeg', data: b64 } });
                } catch(err) {
                    requestParts.push({ text: `Analise o produto neste link/texto: ${adaptImageUrl}` });
                }
            }

            const prompt = `
                Atue como um Especialista Sênior em E-commerce, Copywriting de Conversão e Inteligência de Produtos.
                Analise a imagem ou link do produto fornecido com máxima acuidade visual e técnica.

                Identifique com precisão o produto REAL e extraia/infira as seguintes propriedades comerciais:

                1. "name": Nome comercial, atraente e específico do produto em português (ex: se for uma sandália rasteira: "Sandália Rasteirinha Confort Feminina"; se for perfume: "Perfume Importado Masculino 100ml"; se for organizador: "Sapateira Organizadora Multiuso"; se for smartwatch: "Smartwatch Esportivo Pro").
                2. "category": Categoria canônica exata em português (ex: "Calçados", "Moda & Vestuário", "Perfumaria & Beleza", "Relógios & Smartwatch", "Eletrônicos & Tecnologia", "Cozinha & Utilidades", "Casa & Organização", "Saúde & Bem-Estar", "Acessórios & Joias", "Automotivo", "Pet Shop", "Infantil & Bebês"). NUNCA invente uma categoria que não corresponda ao produto da imagem.
                3. "priceRange": Faixa de preço realista estimada para o mercado brasileiro (ex: "R$ 79 a R$ 139").
                4. "targetAudience": Perfil de público-alvo ESPECÍFICO deste produto em português (ex: para uma sandália rasteira: "Mulheres que buscam conforto, leveza e estilo para o dia a dia e passeios", JAMAIS use descrições genéricas vazias).
                5. "mainBenefit": O principal benefício prático ou transformação que este produto específico entrega (ex: "Caminhar com maciez e frescor sem causar atrito ou machucar os pés").
                6. "mainPain": A dor ou incômodo urgente que o produto elimina (ex: "Dores e cansaço nos pés ao usar calçados duros e pesados em dias quentes").
                7. "uniqueDifferentiator": O diferencial físico, anatômico ou de design real visível no produto (ex: "Design anatômico com tiras macias e solado leve antiderrapante").
                8. "platform": Escolha a plataforma mais propícia entre: "TikTok Shop", "Shopee Vídeo", "Mercado Livre", "Instagram Reels", "YouTube Shorts", "Facebook Reels".
                9. "features": Lista (array de strings) com 3 a 5 características reais do produto (ex: ["Solado flexível antiderrapante", "Tiras macias de toque suave", "Palmilha confortável", "Acabamento leve e resistente"]).
                10. "angleStrategy": Escolha o melhor ângulo entre: "emergencia", "economia", "autoridade", "praticidade", "independencia".
                11. "hookIntensity": Escolha a intensidade recomendada entre: "normal", "forte", "agressivo".

                Retorne APENAS um JSON válido no formato abaixo, sem nenhum texto adicional fora do JSON:
                {
                    "name": "Nome do produto",
                    "category": "Calçados",
                    "priceRange": "R$ 79 a R$ 139",
                    "targetAudience": "Mulheres que buscam conforto e estilo no dia a dia",
                    "mainBenefit": "Alívio e leveza ao caminhar sem machucar os pés",
                    "mainPain": "Pés cansados e dores ao usar calçados duros",
                    "uniqueDifferentiator": "Palmilha anatômica acolchoada com solado flexível antiderrapante",
                    "platform": "TikTok Shop",
                    "features": ["Solado antiderrapante", "Tiras confortáveis", "Palmilha anatômica macia"],
                    "angleStrategy": "praticidade",
                    "hookIntensity": "forte"
                }
            `;
            requestParts.unshift({ text: prompt });

            const data = await processGeminiAPI(currentKey, {
                contents: [{ parts: requestParts }],
                generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "medium" } }
            });

            if (requestId !== autofillAnalysisRequestIdRef.current) return;

            const resultParsed = safeJSONParse(data?.candidates?.[0]?.content?.parts?.[0]?.text, {});
            
            const cleanStr = (val: any): string => (typeof val === 'string' ? val.trim() : '');
            const newProductName = cleanStr(resultParsed.name || resultParsed.newProduct);
            const rawCategory = cleanStr(resultParsed.category);
            const normalizedCategory = normalizeDetectedCategory(rawCategory, newProductName);
            const priceRangeVal = cleanStr(resultParsed.priceRange);
            const targetAudienceVal = cleanStr(resultParsed.targetAudience);
            const mainBenefitVal = cleanStr(resultParsed.mainBenefit);
            const mainPainVal = cleanStr(resultParsed.mainPain);
            const uniqueDiffVal = cleanStr(resultParsed.uniqueDifferentiator);
            
            let featuresVal = '';
            if (Array.isArray(resultParsed.features)) {
                featuresVal = resultParsed.features.map((f: any) => String(f).trim()).filter(Boolean).join(', ');
            } else if (typeof resultParsed.features === 'string') {
                featuresVal = resultParsed.features.trim();
            }

            const validPlatforms = ["TikTok Shop", "Shopee Vídeo", "Mercado Livre", "Instagram Reels", "YouTube Shorts", "Facebook Reels"];
            const validAngles = ["emergencia", "economia", "autoridade", "praticidade", "independencia"];
            const validHooks = ["normal", "forte", "agressivo"];

            const finalPlatform = (typeof resultParsed.platform === 'string' && validPlatforms.includes(resultParsed.platform)) ? resultParsed.platform : 'TikTok Shop';
            const finalAngle = (typeof resultParsed.angleStrategy === 'string' && validAngles.includes(resultParsed.angleStrategy.toLowerCase())) ? resultParsed.angleStrategy.toLowerCase() : 'praticidade';
            const finalHook = (typeof resultParsed.hookIntensity === 'string' && validHooks.includes(resultParsed.hookIntensity.toLowerCase())) ? resultParsed.hookIntensity.toLowerCase() : 'forte';

            // Log debug results for validation without any base64/image payload
            console.log('AUTOFILL_RAW_RESULT:', resultParsed);
            console.log('AUTOFILL_NORMALIZED_RESULT:', {
                name: newProductName,
                category: normalizedCategory,
                rawCategory,
                priceRange: priceRangeVal,
                targetAudience: targetAudienceVal,
                mainBenefit: mainBenefitVal,
                mainPain: mainPainVal,
                uniqueDifferentiator: uniqueDiffVal,
                features: featuresVal,
                platform: finalPlatform,
                angleStrategy: finalAngle,
                hookIntensity: finalHook
            });

            setAdaptData(prev => {
                if (requestId !== autofillAnalysisRequestIdRef.current) return prev;
                return {
                    ...prev,
                    // Derived fields strictly overwritten by fresh analysis; NEVER defaulting to previous product state
                    newProduct: newProductName,
                    category: normalizedCategory,
                    priceRange: priceRangeVal,
                    targetAudience: targetAudienceVal,
                    mainBenefit: mainBenefitVal,
                    mainPain: mainPainVal,
                    uniqueDifferentiator: uniqueDiffVal,
                    features: featuresVal,
                    platform: finalPlatform as any,
                    angleStrategy: finalAngle,
                    hookIntensity: finalHook,
                    productVisionData: undefined
                };
            });
            
        } catch(e: any) {
            if (requestId === autofillAnalysisRequestIdRef.current) {
                alert("Erro ao analisar produto com IA: " + e.message);
            }
        } finally {
            if (requestId === autofillAnalysisRequestIdRef.current) {
                setIsAnalyzingAdaptProduct(false);
            }
        }
    };

'''

content = content[:start_idx] + new_block + content[end_idx:]

with open('src/components/ReverseEngineeringView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated ReverseEngineeringView.tsx successfully!')
