export const POV_HOOKS = [
    "The product is partially visible inside the box before the hand interacts with it",
    "A beam of light briefly reflects on the product creating curiosity",
    "The box is slightly open revealing a glimpse of the product",
    "The camera slowly approaches the product before the hand touches it",
    "The product shines for a moment before the box is closed",
    "The viewer sees the product for a split second before the action begins",
    "A reflection on the glass reveals the product briefly",
    "The hand pauses above the product creating suspense",
    "The product is revealed for a second before being hidden",
    "A subtle light sweep highlights the product before interaction"
];

export const WATCH_HOOKS = [
    "The watch dial reflects a sharp beam of light for a split second",
    "The watch is briefly visible inside the box before the lid moves",
    "The metal bracelet catches the light creating a luxury shine",
    "The watch face glows subtly before the hand interacts",
    "The viewer sees the watch ticking for a moment"
];

export const VOICE_OPTIONS = [
    { name: "Aoede", label: "Aoede (Feminina - Profunda)", gender: "Female" },
    { name: "Charon", label: "Charon (Masculina - Profunda)", gender: "Male" },
    { name: "Fenrir", label: "Fenrir (Masculina - Intensa)", gender: "Male" },
    { name: "Kore", label: "Kore (Feminina - Suave)", gender: "Female" },
    { name: "Puck", label: "Puck (Masculina - Jovem)", gender: "Male" }
];

export const ANGLE_LIBRARY: Record<string, string> = {
    "🏆 Walking toward camera (70% Vendas)": "Ela vem andando direto pra câmera (passada confiante), começa de corpo inteiro -> zoom lento até o rosto sorrindo. Texto sugerido: 'Esse conjunto me deixou assim'.",
    "🔄 Spin 360° (Zoom Bumbum/Detalhes)": "Começa de costas -> gira devagar -> para de frente sorrindo. Ideal para legging scrunch bum ou macacão.",
    "🤳 Mirror Gym Selfie (Ângulo Baixo)": "Câmera no chão ou tripod baixo, ela em pé no espinho da academia mostrando o look completo + tênis. Estilo 'Body Check'.",
    "♻️ Jump Cut Outfit Change (3 Looks)": "Ela bate palma -> corta pro próximo look (faz 3-4 looks em 8 segundos). O preço deve aparecer em cada corte.",
    "⏳ Hands on Waist -> Side Profile": "Começa de frente com mãos na cintura -> vira de lado (mostra cintura fina + bumbum empinado). Ótimo para Jumpsuits.",
    "🧘‍♀️ Sit down -> Stand up (Elasticidade)": "Ela senta no chão -> levanta rápido (mostra que a legging não desce e o top não sobe). Prova de qualidade.",
    "🔙 Over the Shoulder (Costas/Glossy)": "Começa filmando de costas, ela olha por cima do ombro sorrindo -> vira de frente. Perfeito pra conjunto vermelho ou glossy.",
    "☀️ Golden Hour Rooftop (Angelical)": "Luz laranja/dourada batendo no rosto + cabelo brilhando. Usar com tennis dress branco ou look suave.",
    "👇 Close-up Rosto -> Pan Down (Preço)": "Começa só rosto sorrindo -> desce rápido pro corpo inteiro. Texto: 'O look inteiro por só R$149'.",
    "🔴 Fake Live (Urgência/Restock)": "Câmera parada como se fosse live, falando direto: 'Gente, esse aqui é o último restock do ano, corre que tá esgotando!'",
    "📸 Estilo Leal (Câmera na Mão + Zoom)": "Estilo clássico Leal: Câmera na mão, zoom in/out brusco para mostrar textura do tecido."
};

export const CAMERA_ANGLES = Object.keys(ANGLE_LIBRARY);

export const TONE_OPTIONS = [
    "Amigo Garimpeiro (Achei a Fonte) 🕵️",
    "Estética UGC (Tremida/Zoom Brusco) 🎥",
    "Status Acessível (Cara de Loja Cara) 💎",
    "Venda Emocional (Benefício > Característica)", 
    "Autêntico/UGC (Vender sem Vender)",
    "Hard Sell (Oferta Direta/Preço)",
    "Humor/Polêmico"
];

export const SCENARIO_OPTIONS = [
    "Automático (Adaptar ao Nicho)",
    "Cenário Real (Sala/Carro/Garagem) 🏠",
    "Quarto 'Aesthetic' (Clean/Soft)",
    "Cozinha Moderna/Equipada",
    "Escritório Home Office / Tech",
    "Academia / Fitness Studio",
    "Ao Ar Livre / Natureza",
    "Oficina / Garagem (DIY)",
    "Estúdio Profissional (Fundo Infinito)"
];

export const NICHES = [
    "👗 Roupas Femininas & Lingerie",
    "👕 Roupas Masculinas & Íntimas",
    "💄 Beleza & Cuidados Pessoais",
    "📱 Celulares & Eletrônicos",
    "💻 Computadores & Escritório",
    "🏠 Casa, Cozinha & Decoração",
    "🛋️ Móveis & Iluminação",
    "💪 Saúde & Bem-Estar",
    "👟 Esportes & Ar Livre",
    "👶 Bebês & Maternidade",
    "🧸 Brinquedos & Hobbies",
    "🐶 Pet Shop",
    "🚗 Automotivo & Motociclismo",
    "🛠️ Ferramentas & Construção",
    "📚 Livros & Papelaria",
    "👜 Bolsas & Malas",
    "👞 Calçados",
    "⌚ Relógios & Joias",
    "🍎 Alimentos & Bebidas",
    "🎮 Videogames & Consoles",
    "💸 Renda Extra & Infoprodutos"
];

export const DURATION_OPTIONS = [
    "IA Decide (Automático) 🤖",
    "Flash (15s - Leal Style) ⚡",
    "Rápido (20s) 🚀",
    "Médio (30s) 📹",
    "Longo (60s) 🎬"
];

export const EMOTION_TRIGGERS = [
    "Urgência ⏰",
    "Economia 💰",
    "Status 💎", 
    "Conforto 🛋️"
];

export const GROK_PROMPT_RULES = `
🚨 REGRAS PARA BLOCOS GROK (RETENÇÃO + CONVERSÃO - MÁX 6s)
Você é um copywriter especialista em TikTok Shop focado em conversão e retenção.
Sua missão é gerar roteiros em blocos independentes de 6 segundos, ideais para o modelo Grok.
Cada bloco deve seguir regras rígidas de tempo, impacto e densidade.

REGRAS GERAIS DE DENSIDADE (MUITO RÍGIDAS):
- Cada bloco deve ter o LIMITE FIXO DE ATÉ 12 PALAVRAS (ritmo perfeito de 2 palavras/segundo). Se passar de 12 palavras, o áudio ficará denso e cortará.
- Linguagem natural de fala (estilo live ou UGC).
- Frases fluidas (não usar frases quebradas ou genéricas).
- Cada bloco deve cumprir um objetivo específico.
- Evitar termos genéricos como "produto incrível" ou "imperdível".

SISTEMA DE BLOCOS:
O tipo do bloco será definido automaticamente conforme a posição:
1º bloco → GANCHO
2º bloco (ou intermediários) → BENEFÍCIO + MICRO PROVA
Último bloco → CTA

ESTRUTURA POR BLOCO:
🔹 GANCHO (6s)
- Começar com situação real ou pergunta.
- Criar tensão ou identificação.
- NÃO mencionar o produto ou preço.

🔹 BENEFÍCIO + PROVA (6s)
- Apresentar o produto naturalmente.
- Incluir 1 benefício concreto e prova social.

🔹 CTA (6s)
- Verbo de ação obrigatório.
- Criar urgência leve.
- Direcionar para o carrinho ou botão.
`;

export interface ViralScriptTemplate {
    label: string;
    description: string;
    structure: string;
    instruction: string;
    example: string;
}

export const VIRAL_SCRIPTS: Record<string, ViralScriptTemplate> = {
    "LEAL_PADRAO": {
        label: "🏆 Fórmula Leal Padrão (O Esqueleto Viral)",
        description: "A estrutura completa validada: Gancho -> Prova -> Benefício -> Objeção/Preço -> CTA Indireto.",
        structure: "Visual Agressivo -> Validação Rápida -> Benefício Oculto -> Matadora de Objeções + Ancoragem -> Link de Ajuda",
        instruction: "Comece com ação agressiva (esticar/bater). Mostre o produto resolvendo. Revele um detalhe oculto. Mate a objeção de preço ('paguei menos de...'). CTA como ajuda ('link aqui').",
        example: "Duvido você ver uma calça fazer isso... [ESTICA]. Paguei preço de banana."
    },
    "LEAL_SENSORIAL": {
        label: "1️⃣ Gancho Sensorial/Visual (Estica/Bate/Molha) 🖐️",
        description: "O vídeo é mudo no início. Ação física brusca prende a atenção visual.",
        structure: "Ação Física Brusca -> Reação ao Toque -> Detalhe Técnico -> Preço -> CTA",
        instruction: "Comece esticando o tecido, batendo no produto ou jogando água. Foque na textura ('gelado', 'macio').",
        example: "Olha esse tecido! Gelado, seca rápido... parece que não tá vestindo nada."
    },
    "LEAL_ARREPENDIMENTO": {
        label: "2️⃣ Gancho Arrependimento Reverso (Curiosidade) 🫢",
        description: "Gera fofoca/negatividade inicial, mas entrega recomendação positiva.",
        structure: "Arrependimento -> Motivo Inesperado (Positivo) -> Demonstração -> CTA",
        instruction: "Inicie dizendo 'Que arrependimento de ter comprado...'. O motivo deve ser: 'não ter comprado mais cores' ou 'não ter achado antes'.",
        example: "Que arrependimento de ter comprado essa calça... arrependimento de não ter comprado TODAS as cores antes."
    },
    "LEAL_AUTORIDADE": {
        label: "3️⃣ Gancho Autoridade/Exagero (A Ferrari das...) 🏎️",
        description: "Cria necessidade imediata por comparação de alto nível.",
        structure: "Afirmação Exagerada -> Prova de Superioridade -> Comparação Preço -> CTA",
        instruction: "Use termos como 'A Ferrari das...', 'O iPhone das...', 'Todo homem precisa disso'. Compare qualidade de shopping com preço de fábrica.",
        example: "Essa é a Ferrari das trenas. Todo mundo deveria ter um adaptador desse em casa."
    },
    "LEAL_ANCORAGEM": {
        label: "4️⃣ Gancho Ancoragem (O Achadinho/Fonte) 🕵️",
        description: "Faz o preço parecer ridículo. Sensação de vantagem ('levei a melhor').",
        structure: "Preço Shopping -> 'Achei a Fonte' -> Preço Real Baixo -> CTA de 'Segredo'",
        instruction: "Cite o preço alto (R$ 299). Diga que achou a 'fonte' ou 'direto da fábrica' no TikTok. Revele preço baixo (R$ 70).",
        example: "No shopping custa 299, achei a fonte no TikTok por menos de 70. É direto da fábrica."
    },
    "LEAL_EMOCIONAL": {
        label: "5️⃣ Venda Emocional (Benefício > Lógica) 🧠",
        description: "Estratégia do Vídeo: 'A compra não é lógica, é emocional'. Foca na transformação (energia/foco) e não na técnica.",
        structure: "Afirmação Anti-Técnica -> Dor do Cotidiano (Cansaço) -> Produto como Solução de Vida -> Validação Técnico Rápida -> CTA",
        instruction: "Diga que o cliente não quer 'X característica técnica'. Pergunte se ele sente 'Y dor'. Apresente o produto como a cura dessa dor. Use a técnica apenas para justificar o preço no final.",
        example: "Você não quer uma garrafa térmica. Você quer parar de se sentir cansado depois do almoço. A água gelada é o combustível."
    },
    "LEAL_RESSIGNIFICACAO": {
        label: "6️⃣ Quebra de Padrão & Ressignificação (Caixa de Ferramentas) 🛠️",
        description: "Baseado no case 'Oficina do Brigadeiro'. Usa um elemento visual estranho para chamar atenção e vende a emoção pura.",
        structure: "Elemento Estranho/Pergunta Confusa -> Revelação Surpresa -> Ressignificação do Produto -> Venda de Emoção -> CTA",
        instruction: "Comece com algo que não tem nada a ver com o nicho (ex: uma maleta, uma frase estranha). Revele o produto. Não venda o item, venda a química cerebral (Felicidade, Alívio, Poder).",
        example: "Cheguei com essa maleta de médico... Foi aqui que pediram um transplante de autoestima? (Mostra o Kit de Maquiagem)."
    },
    "LEAL_PREMIUM": {
        label: "💎 Modo Premium (Percepção de Valor Elevada)",
        description: "Foco em sofisticação, clareza e status. O preço é apresentado como surpresa positiva (Smart Choice).",
        structure: "Experiência/Identidade -> Detalhes Refinados -> Prova de Valor -> Preço Surpresa -> CTA Elegante",
        instruction: "ESTRUTURA OBRIGATÓRIA PREMIUM: 1. INÍCIO: Jamais comece pelo preço. Comece pela experiência ou transformação. 2. LINGUAGEM: Refinada e clara. Zero gírias excessivas, zero exageros ('incrível'). 3. VOCABULÁRIO: Substitua 'barato' por 'vale cada centavo' ou 'investimento inteligente'. 4. PREÇO: Apresente o valor como uma quebra de expectativa positiva ('Parece custar mil, mas é...'). 5. TOM: Sofisticado e calmo.",
        example: "Eu percebi que não precisava de vários controles. Precisava de uma solução mais inteligente. Esse controle universal substitui todos. Compacto, discreto e fácil de programar. E paguei só R$29,32. Um valor pequeno para simplificar o dia a dia. Se ainda estiver disponível, toca no carrinho."
    },
    "LEAL_ECONOMICO": {
        label: "💸 Produto Econômico (Até R$50 - Impulso)",
        description: "Foco total em compra por impulso. Simples, natural e sem parecer golpe.",
        structure: "Pergunta Única (Hábito) -> Solução Imediata -> Preço Baixo Contextualizado -> CTA",
        instruction: "ESTRUTURA OBRIGATÓRIA 'IMPULSO LIMPO': 1. CENA 01: Uma única pergunta sobre o dia a dia. 2. CENA 02: A solução direta ('Resolvi com X'). 3. CENA 03: O preço exato ('Paguei só R$X') e validação ('Compensa demais'). Nada de promessas milagrosas.",
        example: "Quantos controles você usa todo dia? Eu resolvi isso com um controle universal. Portão e alarme no mesmo botão. E paguei só R$29,32. Por esse valor, compensa demais. Toca no carrinho."
    },
    "FALCI_AUTORIDADE": {
        label: "💼 Fechamento Alto Valor (Autoridade Consultiva)",
        description: "Estratégia do PH Falci para produtos Premium. Remove objeções de preço focando no impacto, conduz a venda sem parecer desesperado e troca 'desconto' por 'condição especial'.",
        structure: "Gancho de Autoridade -> Impacto do Investimento -> Próximo Passo -> Condição Especial -> Direcionamento (CTA)",
        instruction: "Aja como um consultor sênior de vendas. É ESTRITAMENTE PROIBIDO usar as palavras 'barato', 'desconto', 'se você quiser' ou perguntar 'o que você prefere'. USE OBRIGATORIAMENTE ESTA LÓGICA DE PERSUASÃO: 1. Mostre que pelo 'impacto' gerado, o 'investimento faz sentido'. 2. Assuma o controle dizendo 'O próximo passo agora é...'. 3. Crie urgência revelando uma 'condição especial' (nunca fale desconto). 4. Remova a carga de decisão do cliente finalizando com 'Pelo que conversamos, o melhor caminho é [Ação/CTA]'.",
        example: "Quando você olha o impacto que esse produto gera, o investimento faz todo o sentido. O próximo passo agora é garantir a sua unidade. Existe uma condição especial liberada apenas hoje. Pelo que vi, o melhor caminho é você clicar no carrinho laranja e finalizar agora."
    }
};

export const CTA_STYLES = {
    "AJUDA_INDIRETA": "🤝 Ajuda/Indireto (Estilo Leal - 'Vou deixar o link')",
    "DIRETO": "🔥 Direto ao Carrinho (Foco Ação)",
    "BUG": "🐛 Bug/Glitch (Curiosidade Máxima)",
    "URGENCIA": "⏰ Urgência Suave (Escassez)"
};

export const CTA_LIBRARY: Record<string, string[]> = {
    "AJUDA_INDIRETA": [
        "Vou deixar o link do fornecedor oficial aqui no carrinho laranja",
        "Achei a fonte oficial e deixei na sacola aqui embaixo",
        "Se quiser garantir, clica no ícone da sacola no vídeo",
        "Pra quem perguntou, a loja oficial tá no carrinho laranja",
        "Deixei o produto marcado na sacola pra facilitar"
    ],
    "DIRETO": [
        "Tá no carrinho laranja aqui embaixo", "É só tocar na sacola amarela/laranja", "Clica no carrinho pra garantir agora",
        "Compra direto no carrinho do vídeo", "Tá aparecendo na sacola agora"
    ],
    "BUG": [
        "Tenho certeza que é um erro do sistema, clica no carrinho",
        "Isso aqui só pode ser bug, olha o preço na sacola",
        "Acho que erraram o preço no carrinho, corre",
        "Não sei se é bug, mas o preço caiu muito no carrinho",
        "Aproveita antes que percebam esse erro na sacola"
    ],
    "URGENCIA": [
        "Antes que mude o preço, clica no carrinho laranja", "Corre que tá acabando, sacola aqui embaixo",
        "Aproveita enquanto tá no carrinho do vídeo", "Agora é a hora, clica na sacola",
        "Não deixa passar, garante no carrinho"
    ]
};

export const REFINER_CTAS = [
    "Clica no carrinho laranja antes que acabe.",
    "Corre no carrinho laranja e garante o seu.",
    "Pega no carrinho laranja agora.",
    "Garante no carrinho laranja antes que suba.",
    "Aproveita no carrinho laranja agora."
];

export interface DashboardTool {
    id: string;
    label: string;
    icon: string;
    desc: string;
    featured?: boolean;
    ai?: "perplexity" | "gemini";
}

export const DASH_TOOLS: DashboardTool[] = [
    { id: "agente-de-copy", label: "Agente de Copy",    icon: "📄", desc: "Gere variações de copy para Cena 2 e Cena 3 a partir do produto", ai: "gemini" },
    { id: "create", label: "Creative Director AI", icon: "✨", desc: "Crie roteiros e prompts inteligentes para vídeo do zero", featured: true },
    { id: "product-listing", label: "Gerador Título, Tags & Descrição", icon: "🏷️", desc: "Listagens SEO otimizadas para TikTok Shop, Shopee, Meli e Instagram", ai: "gemini" },
    { id: "collage-studio", label: "Criador de Colagem", icon: "🖼️", desc: "Crie composições perfeitas com imagens e textos" },
    { id: "transcription", label: "Transcrição",        icon: "🎙️", desc: "Transcreva e transforme em roteiro", ai: "gemini" },
    { id: "ideador",       label: "Ideador Viral",      icon: "🚀", desc: "Ideias + ganchos + variações rápidas", ai: "perplexity" },
    { id: "vanessa",       label: "Engine Copy Premium V2",       icon: "⚡", desc: "Criativos e páginas para produtos" },
    { id: "tiktok-legal",  label: "Advogado TikTok Shop", icon: "⚖️", desc: "Reverta punições com recursos profissionais." },
    { id: "copy-master",   label: "Copy Master",        icon: "✍️", desc: "Headline, CTA e bullets prontos", ai: "perplexity" },
    { id: "script-refiner",label: "Refinador de Script",icon: "🔄", desc: "Modele scripts de vídeo mantendo a estrutura (Anti-Cópia)", ai: "perplexity" },
    { id: "hooks",         label: "Gerador de Ganchos Virais", icon: "🪝", desc: "Ganchos para parar o scroll", ai: "perplexity" },
    { id: "prompt-refiner",label: "Refinador de Prompts",      icon: "🤖", desc: "Refinar e modificar prompts com IA" },
    { id: "magic-enhancer",label: "Aprimorador Mágico", icon: "🪄", desc: "Transforme texto simples em prompt detalhado" },
    { id: "video-generator",label: "Gerador de Prompts de Vídeo", icon: "🎬", desc: "Transforme ideias em prompts profissionais de vídeo" },
    { id: "cinematic",     label: "Cinematic Engine",   icon: "🎞️", desc: "Imagem para Vídeo: Prompts para Runway, Veo ou Sora", ai: "gemini" },
    { id: "ai-try-on",     label: "Provador Virtual IA", icon: "👕", desc: "Experimente roupas virtualmente em fotos usando IA", ai: "gemini" },
    { id: "image-describer",label: "IA Descrever Imagem", icon: "📝", desc: "Deixe a IA analisar e descrever qualquer imagem em detalhes", ai: "gemini" },
    { id: "translator",    label: "Translate Traduzir", icon: "🌐", desc: "Traduza prompts de imagem entre idiomas de forma fluida" },
    { id: "reverse",       label: "Clonagem (Reverse)", icon: "🧬", desc: "Remodelagem / anti-cópia", ai: "gemini" },
    { id: "image-extractor", label: "Extrator de Prompt", icon: "🖼️", desc: "Descubra o prompt de qualquer imagem", ai: "gemini" },
    { id: "audit",         label: "Auditoria",          icon: "🛡️", desc: "Verifique conformidade e qualidade", ai: "gemini" },
    { id: "lyria-music",   label: "Lyria Music Engine", icon: "🎵", desc: "Trilhas originais com IA para seus vídeos", ai: "gemini" },
    { id: "chat",          label: "Consultor IA",       icon: "💬", desc: "Assistente virtual especializado", ai: "gemini" }
];

export const POLICY_INSTRUCTION = `
    DIRETRIZES DE ESTILO "LEAL RECOMENDA" (OBRIGATÓRIO):
    1. FILOSOFIA: "Review como Entretenimento". Pareça um amigo dando uma dica, não um vendedor.
    2. ESTÉTICA UGC: O script deve sugerir câmera na mão, zoom in/out brusco para mostrar textura/detalhes.
    3. PALAVRAS-CHAVE DE ALTA CONVERSÃO (Adapte obrigatóriamente ao Nicho):
       - ROUPAS: "Tecido Gelado", "Não amassa", "Veste como uma luva", "Caimento Perfeito".
       - LIVROS/OBJETOS: "Acabamento de Luxo", "Toque aveludado", "Páginas Amarelas", "Material de Qualidade", "Ergonomia".
       - COSMÉTICOS: "Cheiro de Rica", "Textura aveludada", "Não fica pegajoso".
       - GERAL: "Fonte Oficial", "Direto da fábrica", "Qualidade Premium".
    4. COERÊNCIA SEMÂNTICA: JAMAIS use "Veste bem" para livros. Use termos adequados ao produto.
    5. TÉCNICA DA "DESCULPA PARA COMPRAR": Dê uma justificativa emocional.
    6. PROIBIDO INTRODUÇÕES: "Olá pessoal", "Tudo bem?". COMECE COM O GANCHO IMEDIATO.
    
    🚨 ESTRATÉGIA DE PREÇO (PRICE TIERS) - Siga conforme o valor do produto:
    📊 ATÉ R$50 (IMPULSO):
       - Foco: Compra sem pensar.
       - Tom: "Paguei só R$X, nem acredito".
       - Gatilho: Praticidade imediata + Preço irrisório.
    📊 R$50 – R$150 (RACIONAL):
       - Foco: Benefício + Prova.
       - Tom: "Vale cada centavo porque resolve X".
       - Gatilho: Custo-benefício inteligente.
    📊 ACIMA DE R$150 (MODO PREMIUM):
       - Foco: Experiência e Investimento.
       - Tom: "Não é barato, mas vale o investimento".
       - Gatilho: Sofisticação e Exclusividade. Zero gírias.

    🚨 NOVAS REGRAS DE REFINAMENTO (PRIORIDADE MÁXIMA):
    - CLAREZA: Evite termos técnicos complexos. Explique como se falasse com um leigo.
    - SEM EXAGEROS: Proibido termos como "preço de banana", "quase de graça". Prefira "preço acessível".
    - HOOK LIMPO: Use no MÁXIMO uma pergunta no início. Evite sequências de perguntas.
    - NATURALIDADE: O texto deve fluir como uma conversa real, não um anúncio de TV.
    - PALAVRAS PROIBIDAS: JAMAIS use as palavras "robusto" ou "robusta". Substitua por "resistente", "durável" ou termos semelhantes.

    🚨 REGRAS TIKTOK SHOP SAFE (ANTI-BAN OBRIGATÓRIO):
    - NÃO USAR em hipótese alguma os termos: secreto, quase de graça, garantido, milagre, imperdível, robusto, robusta.
    - NÃO criar urgência falsa (ex: "só hoje", "vai acabar").
    - NÃO prometer valores irreais.
    - NÃO afirmar comparações não comprovadas com outras marcas.
    - Linguagem estritamente natural e informativa.

    🚨 REGRA DE OURO DO TIKTOK SHOP (ZERO BIO):
    - PROIBIDO: JAMAIS escreva "Link na Bio", "Link no Perfil" ou "Site na Bio".
    - OBRIGATÓRIO: Use SEMPRE "Clica no Carrinho Laranja", "Clica na Sacola", "Link aqui no vídeo".
    - VISUAL: Se o personagem apontar, deve ser para o canto inferior esquerdo (onde fica o carrinho), NUNCA para cima ou para o perfil.

    🛡️ CHECKLIST LÓGICO POLICY SAFE (VERIFICAÇÃO OBRIGATÓRIA INTERNA):
    Antes de entregar o resultado final, você DEVE submeter os roteiros e textos a este checklist. Se o conteúdo falhar em qualquer ponto, reescreva-o silenciosamente para se adequar antes de gerar o JSON:
    1. [ ] ATRIBUTOS DO PRODUTO: As funções citadas batem com a descrição oficial? (Nunca invente características físicas, tamanhos ou logotipos falsos).
    2. [ ] LINGUAGEM SENSACIONALISTA: Foram removidos adjetivos exagerados como "mágico", "infalível", "milagre"? (Substitua por termos realistas e concretos).
    3. [ ] CTA (Chamada para ação): O link indicado leva DIRETAMENTE para o produto exibido na tela (Carrinho)? (Não prometa falsas promoções como "compre 1 ganhe 2" se não houver contexto para isso).
    4. [ ] SAÚDE/ESTÉTICA: Existe alguma promessa explícita de perda de peso ou cura médica? (SE SIM, BLOQUEIE A FRASE E REESCREVA FOCANDO APENAS EM CONFORTO OU ESTÉTICA LEVE).
    5. [ ] USO DE MARCAS: O script evita citar marcas concorrentes de forma depreciativa? (Fale apenas do seu produto, sem diminuir outros).
`;

export const promptLibrary = {  
    handStyles: [  "female elegant hands", "male strong hands", "luxury black gloves", "white cotton gloves", "latex gloves", "minimalist feminine hands", "tattooed hands", "aged hands with texture", "robotic chrome hand", "cyberpunk robotic hand", "luxury jewelry hands", "natural clean nails", "glossy manicure nails", "professional chef hands", "artisan hands with texture", "delicate feminine fingers", "rough worker hands", "minimal aesthetic hands", "luxury fashion model hands", "soft skincare commercial hands"  ],  
    handActions: [  "opening the box slowly", "lifting the product", "placing product on table", "rotating the product slowly", "pressing the power button", "connecting cable", "revealing the product from shadow", "unboxing dramatically", "sliding the product forward", "holding the product toward camera", "testing the product", "charging the device", "assembling the product", "tapping the screen", "turning the device on", "displaying product to camera", "adjusting product position"  ],  
    surfaces: [  "clean white studio surface", "luxury black marble table", "dark cinematic desk", "minimalist beige background", "natural wooden table", "industrial concrete surface", "matte black studio table", "glass reflective surface", "tech neon desk", "premium leather surface", "luxury jewelry display table", "minimal apple style table"  ],  
    lighting: [  "soft studio lighting", "cinematic moody lighting", "dramatic spotlight", "high contrast lighting", "luxury product lighting", "tech neon lighting", "sunset golden hour lighting", "rim lighting effect", "dark background spotlight", "ultra soft beauty lighting", "commercial advertising lighting", "cinematic film lighting", "minimal studio lighting"  ],  
    cameraAngles: [  "macro product shot", "top down shot", "POV camera angle", "handheld cinematic shot", "side product shot", "close up product shot", "extreme macro lens", "85mm cinematic lens", "50mm commercial lens", "slow push in camera", "dramatic reveal camera move"  ],  
    videoStyles: [  "apple commercial style", "luxury brand commercial", "tech startup advertisement", "cyberpunk futuristic ad", "minimalist product commercial", "tiktok viral ad style", "high end cinematic commercial", "beauty brand advertisement", "premium ecommerce ad", "viral social media ad"  ]  
};
