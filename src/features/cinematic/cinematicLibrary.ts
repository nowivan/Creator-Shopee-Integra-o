import { CinematicLibraryCategory, ProductVisionData } from './types';

export const CINEMATIC_LIBRARY: Record<string, CinematicLibraryCategory> = {
    relogio: {
        categoryKey: 'relogio',
        label: 'Relógios & Joias',
        keywords: ['watch', 'relogio', 'relógio', 'joia', 'jewel', 'cronógrafo', 'pulseira', 'smartwatch', 'rolex', 'ourstart'],
        allowedMotion: [
            'rotação suave 360 do pulso com luva preta',
            'panorâmica lenta de câmera sobre o bisel e caixa metálica',
            'deslizamento de reflexo de luz especular pelo cristal de safira',
            'movimento suave de afastar/aproximar (push in / pull back)',
            'movimento dos ponteiros das horas/minutos sem alterar mecanismo interno'
        ],
        forbiddenMotion: [
            'animação de engrenagens decorativas internas congeladas',
            'rotação de cogs ou mecanismos de esqueleto estáticos',
            'alteração dos números, marcadores romanos ou janela de data',
            'deformação da caixa, bezel, vidro ou elos da pulseira',
            'alteração de logotipo do mostrador ou marcações do bisel'
        ],
        defaultShots: [
            {
                stepName: 'Hook de Impacto Macro',
                camera: 'Close-up extremo macro 4K (CU) com lente de 85mm e profundidade de campo rasa',
                handAction: 'Mão masculina elegante com luvas pretas de algodão segurando o relógio com postura impecável',
                framing: 'Enquadramento centralizado 9:16 com fundo escuro de estúdio e luz dramática lateral',
                visualObjective: 'Capturar o brilho metálico imediato, os detalhes do mostrador e a presença de luxo',
                visualPromptTemplateEn: 'Extreme macro close-up shot of a luxury watch ({product_name}) in {color} with {finish} finish, held gently by gloved hands against a sleek dark studio backdrop. Specular light reflections glinting across the sapphire crystal.',
                actionPromptTemplateEn: 'Slow 4K macro camera push-in towards the watch dial, smooth cinematic motion, shallow depth of field (f/1.8).',
                dialogueTemplatePtBr: 'Olha o nível de acabamento deste relógio! Cada detalhe impressiona de perto.'
            },
            {
                stepName: 'Detalhe do Mostrador e Vidro',
                camera: 'Plano fechado com ângulo em 45 graus e inclinação sutil de luz',
                handAction: 'Inclinando suavemente o relógio para que o feixe de luz perpasse o visor',
                framing: 'Enquadramento dinâmico na diagonal destacando relevos e índices',
                visualObjective: 'Evidenciar a clareza do vidro, o logotipo gravado e a textura do mostrador',
                visualPromptTemplateEn: 'Detailed close-up shot focusing on the {material} watch bezel and {texture} dial. Light sweeps across the surface revealing the crisp {logo} and indices.',
                actionPromptTemplateEn: 'Controlled camera pan across the watch face, highlighting specular highlights and texture without deforming any structural details.',
                dialogueTemplatePtBr: 'O mostrador possui marcadores gravados com precisão cirúrgica e cristal de alta resistência.'
            },
            {
                stepName: 'Demonstração de Uso no Pulso',
                camera: 'Plano médio curto em movimento suave estilo POV lifestyle',
                handAction: 'Mão ajustando a pulseira no pulso, mostrando o fecho e o caimento no braço',
                framing: 'Plano vertical 9:16 estilo UGC de alto valor, ambiente de escritório elegante ou carro executivo',
                visualObjective: 'Demonstrar o caimento real, o fecho de segurança e o apelo visual do produto no dia a dia',
                visualPromptTemplateEn: 'POV shot of a stylish wrist wearing the {product_name}, adjusting the cuff of a tailored jacket. Natural ambient lighting reflecting off the {color} watch case.',
                actionPromptTemplateEn: 'Handheld organic micro-movement camera following the wrist movement as it rotates slightly to display the strap and clasp.',
                dialogueTemplatePtBr: 'No pulso ele fica extremamente confortável e transforma qualquer visual instantaneamente.'
            },
            {
                stepName: 'Fechamento & Prova de Valor',
                camera: 'Plano geral de estúdio com movimento rápido de revelação da caixa de embalagem',
                handAction: 'Acomodando o relógio de volta no berço estofado da caixa premium',
                framing: 'Composição simétrica com iluminação de vitrine',
                visualObjective: 'Reforçar o valor de presente, a embalagem oficial e incentivar a decisão imediata',
                visualPromptTemplateEn: 'Sleek presentation shot of the {product_name} inside its {packaging}, surrounded by soft warm studio lighting.',
                actionPromptTemplateEn: 'Smooth camera lift and pull-back revealing the full unboxing setup and luxury presentation box.',
                dialogueTemplatePtBr: 'Acompanha a caixa oficial de apresentação. Clique no link e garanta o seu com desconto exclusivo!'
            }
        ]
    },

    perfume: {
        categoryKey: 'perfume',
        label: 'Perfumes & Cosméticos',
        keywords: ['perfume', 'fragrancia', 'fragrância', 'cosmetico', 'cosmético', 'colonia', 'colônia', 'aroma', 'skincare', 'creme', 'sérum', 'batom', 'beleza'],
        allowedMotion: [
            'remoção elegante da tampa do frasco',
            'borrifada fina de névoa de perfume iluminada por luz traseira',
            'rotação suave do frasco de vidro no próprio eixo',
            'gotas sutis de condensação ou luz transpassando o líquido transparente',
            'aplicação suave na pele com dedos delicados'
        ],
        forbiddenMotion: [
            'alteração na forma geométrica do frasco ou gargalo',
            'descolamento ou deformação do rótulo impresso',
            'alteração da cor do líquido ou nível dentro do frasco',
            'mudança na tipografia do logotipo ou marca da embalagem',
            'derretimento ou liquefação da tampa/borrifador'
        ],
        defaultShots: [
            {
                stepName: 'Hook de Borrifada Visual',
                camera: 'Super macro em câmera lenta (120fps feel) focada no borrifador',
                handAction: 'Mãos femininas ou masculinas cuidadosas pressionando o spray suavemente',
                framing: 'Enquadramento contra-luz (backlit) ressaltando as micropartículas de névoa no ar',
                visualObjective: 'Criar um gancho sensorial imediato através da névoa de perfume flutuando no ar',
                visualPromptTemplateEn: 'Ultra high-speed macro shot of {product_name} spraying a fine misty cloud of perfume, backlit by soft golden cinematic studio lighting, particles illuminated in slow motion.',
                actionPromptTemplateEn: 'Cinematic slow push-in on the nozzle as mist is released, capturing crystal-clear liquid droplets and glass transparency.',
                dialogueTemplatePtBr: 'Apenas uma borrifada e você entende por que essa fragrância é incomparável.'
            },
            {
                stepName: 'Detalhe do Frasco e Vidro',
                camera: 'Close-up orbital 360 ao redor do frasco em superfície espelhada ou de mármore',
                handAction: 'Mão apoiando delicadamente a base do frasco de {material}',
                framing: 'Composição de estúdio minimalista com reflexo nítido na base',
                visualObjective: 'Destacar o peso do vidro, a cor do líquido, o acabamento do gargalo e o logotipo',
                visualPromptTemplateEn: 'Close-up camera rotation around the {color} glass bottle of {product_name} resting on a polished marble surface, highlighting the crisp {logo} label.',
                actionPromptTemplateEn: 'Smooth orbital camera track around the bottle, emphasizing glass reflections, clarity, and metallic cap finish.',
                dialogueTemplatePtBr: 'O frasco tem design imponente em vidro pesado e acabamento de alto padrão.'
            },
            {
                stepName: 'Ritual de Aplicação',
                camera: 'Plano médio em luz de vaidade suave (vanity mirror aesthetic)',
                handAction: 'Aplicando o perfume nos pontos de pulsação (pescoço/pulso)',
                framing: 'Plano de perfil elegante focado no gesto e na sofisticação',
                visualObjective: 'Conectar o produto ao estilo de vida, sedução e rotina pessoal',
                visualPromptTemplateEn: 'Aesthetic lifestyle video of a creator applying {product_name} near the neck and wrist in front of a soft warm vanity backdrop.',
                actionPromptTemplateEn: 'Handheld smooth tracking shot following the gentle motion of application.',
                dialogueTemplatePtBr: 'A fixação dura o dia todo e deixa uma projeção marcante por onde você passa.'
            },
            {
                stepName: 'Call To Action & Embalagem',
                camera: 'Plano frontal de revelação junto à caixa e notas olfativas',
                handAction: 'Acomodando o frasco ao lado da embalagem original de {packaging}',
                framing: 'Enquadramento editorial de revista de luxo',
                visualObjective: 'Finalizar com a apresentação completa do produto e chamada clara para compra',
                visualPromptTemplateEn: 'Editorial product display featuring the {product_name} bottle alongside its elegant {packaging} packaging under studio spotlights.',
                actionPromptTemplateEn: 'Slow camera tilt up from the base to the top cap, settling in a perfectly balanced hero shot.',
                dialogueTemplatePtBr: 'Aproveite a promoção oficial com frete grátis no carrinho!'
            }
        ]
    },

    camiseta: {
        categoryKey: 'camiseta',
        label: 'Moda & Vestuário',
        keywords: ['camiseta', 't-shirt', 'roupa', 'vestuario', 'vestuário', 'moda', 'camisa', 'jaqueta', 'calça', 'calca', 'vestido', 'moletom', 'fabric'],
        allowedMotion: [
            'ajuste natural da peça no corpo ou no cabide',
            'movimento leve de vento fazendo o tecido fluir suavemente',
            'toque das mãos sentindo a textura do algodão/tecido',
            'câmera aproximando nas costuras, gola e estampa',
            'movimento de vestir ou mostrar o caimento em 360'
        ],
        forbiddenMotion: [
            'alteração do formato da gola ou comprimento das mangas',
            'distorção ou deformação da estampa/logotipo impresso',
            'mudança na cor do tecido ou padrão da trama',
            'rasgos ou alteração da estrutura do tecido',
            'descentralização das costuras ou da etiqueta'
        ],
        defaultShots: [
            {
                stepName: 'Hook de Caimento & Estilo',
                camera: 'Plano inteiro a médio (3/4) em movimento de revelação de moda',
                handAction: 'Modelo ou avatar ajustando a gola e as mangas da {product_name}',
                framing: 'Enquadramento vertical 9:16 em cenário urbano ou estúdio conceitual',
                visualObjective: 'Mostrar imediatamente a qualidade da peça no corpo e o apelo visual do look',
                visualPromptTemplateEn: 'Full shot of a stylish model wearing the {color} {product_name} in {material}, adjusting the sleeves. Clean modern streetwear backdrop.',
                actionPromptTemplateEn: 'Dynamic camera panning up from waist to shoulders, smooth movement capturing the drape and fit of the apparel.',
                dialogueTemplatePtBr: 'Procurando a camiseta perfeita com caimento impecável e tecido premium?'
            },
            {
                stepName: 'Macro de Textura e Costura',
                camera: 'Extreme close-up (ECU) focado na trama do tecido e gola reforçada',
                handAction: 'Mão esticando levemente o tecido para demonstrar a elasticidade e densidade',
                framing: 'Plano fechado com iluminação tangencial ressaltando os relevos do fio',
                visualObjective: 'Comprovar a qualidade do material, espessura do algodão e acabamento de costura',
                visualPromptTemplateEn: 'Extreme close-up shot of the {texture} fabric weave of {product_name}, showing fine stitching and crisp {logo} detail.',
                actionPromptTemplateEn: 'Slow horizontal camera slide across the collar seams and chest branding, highlighting material premium weight.',
                dialogueTemplatePtBr: 'Dá uma olhada nessa estrutura! Algodão de alta gramatura que não encolhe nem desbota.'
            },
            {
                stepName: 'Teste de Movimento e Versatilidade',
                camera: 'Plano em movimento (tracking shot) estilo caminhada ou rotação rápida',
                handAction: 'Colocando uma jaqueta por cima ou combinando com acessórios',
                framing: 'Enquadramento lifestyle dinâmico e natural',
                visualObjective: 'Mostrar a versatilidade de combinações para diferentes ocasiões',
                visualPromptTemplateEn: 'Dynamic lifestyle shot of creator moving confidently while wearing {product_name}, showing comfort and motion flexibility.',
                actionPromptTemplateEn: 'Handheld camera following natural movement, capturing fabric drape in motion with natural warm sunlight.',
                dialogueTemplatePtBr: 'Super versátil, combina tanto com um look casual quanto para sair à noite.'
            },
            {
                stepName: 'Chamada de Ação & Oferta',
                camera: 'Plano médio em estúdio com indicação para a tag de compra',
                handAction: 'Ajeitando a peça para a câmera com sorriso confiante',
                framing: 'Composição limpa com foco total na peça principal',
                visualObjective: 'Estimular o clique imediato destacando o melhor custo-benefício',
                visualPromptTemplateEn: 'Hero showcase shot of the {product_name} neatly presented with brand tags visible.',
                actionPromptTemplateEn: 'Smooth camera zoom-in ending on a confident centered pose.',
                dialogueTemplatePtBr: 'Gostou? Escolha sua cor e tamanho preferido clicando na sacolinha abaixo!'
            }
        ]
    },

    eletronico: {
        categoryKey: 'eletronico',
        label: 'Eletrônicos & Tech',
        keywords: ['eletronico', 'eletrônico', 'tech', 'fone', 'headphone', 'headset', 'celular', 'smartphone', 'gadget', 'carregador', 'caixa de som', 'teclado', 'mouse', 'computador', 'smartwatch'],
        allowedMotion: [
            'acendimento de luzes LED ou tela com interface limpa',
            'conexão magnética ou encaixe de cabos/acessórios',
            'mãos segurando e operando botões físicos sem alterar estrutura',
            'reflexo de iluminação neon/tech passeando pela carcaça',
            'abertura de estojo/case de carregamento'
        ],
        forbiddenMotion: [
            'deformação das bordas da tela, carcaça ou portas de conexão',
            'alteração no formato dos botões ou saídas de som',
            'derretimento da carcaça de plástico/alumínio',
            'mudança nos logotipos gravados ou indicadores de LED',
            'mudança de posição das lentes da câmera ou entradas USB'
        ],
        defaultShots: [
            {
                stepName: 'Hook Tech e Abertura do Case',
                camera: 'Macro dinâmico com iluminação cibernética/futurista suave',
                handAction: 'Mãos experientes abrindo o estojo de {product_name} revelando os LEDs acendendo',
                framing: 'Plano vertical 9:16 com fundo escuro de estúdio tech e reflexos sutis',
                visualObjective: 'Gerar fascínio instantâneo com a tecnologia, LEDs e design futurista',
                visualPromptTemplateEn: 'Futuristic macro shot of {product_name} in {color} with {finish} metallic accents. Case opens to reveal glowing status indicators.',
                actionPromptTemplateEn: 'Fast smooth camera push-in as case opens, illuminating sleek contours and precision engineering.',
                dialogueTemplatePtBr: 'Esse é simplesmente o gadget tech mais impressionante que testei esse mês.'
            },
            {
                stepName: 'Detalhe da Construção e Botões',
                camera: 'Close-up deslizante (slider shot) nas entradas e acabamento de {material}',
                handAction: 'Pressionando o botão principal ou mostrando os encaixes de precisão',
                framing: 'Plano inclinado ressaltando o acabamento do alumínio/plástico ABS',
                visualObjective: 'Mostrar a durabilidade, ausência de rebarbas e acabamento premium',
                visualPromptTemplateEn: 'Close-up slider camera movement along the edge of {product_name}, highlighting precise button click controls and seamless joints.',
                actionPromptTemplateEn: 'Linear camera glide tracking along the sleek body, showcasing metallic textures and refined craftsmanship.',
                dialogueTemplatePtBr: 'Construção robusta em liga de alumínio anodizado, projetada para durar anos.'
            },
            {
                stepName: 'Uso Prático no Dia a Dia',
                camera: 'Plano médio em mesa de trabalho (desk setup) minimalista com iluminação RGB/suave',
                handAction: 'Utilizando o produto de forma natural em um cenário de alta produtividade',
                framing: 'Composição limpa estilo setup dos sonhos (dream setup aesthetic)',
                visualObjective: 'Demonstrar a facilidade de uso, conectividade e conveniência prática',
                visualPromptTemplateEn: 'Aesthetic desk setup shot showcasing {product_name} seamlessly working next to a modern laptop and workspace decor.',
                actionPromptTemplateEn: 'Smooth handheld tracking shot demonstrating real-world ergonomics and instant responsiveness.',
                dialogueTemplatePtBr: 'Ele conecta instantaneamente sem travamentos e tem bateria de longa duração.'
            },
            {
                stepName: 'Encerramento e Garantia',
                camera: 'Plano final com câmera subindo levemente e iluminação de destaque',
                handAction: 'Colocando o dispositivo na base com apresentação impecável',
                framing: 'Composição frontal limpa estilo anúncio oficial de tecnologia',
                visualObjective: 'Reforçar a confiança na compra e orientar a ação direta',
                visualPromptTemplateEn: 'Hero product display of {product_name} alongside its sleek packaging under soft studio spotlights.',
                actionPromptTemplateEn: 'Smooth upward camera boom movement settling into a crisp final frame.',
                dialogueTemplatePtBr: 'Acompanha garantia e envio rápido. Garanta o seu com desconto de lançamento!'
            }
        ]
    },

    calcado: {
        categoryKey: 'calcado',
        label: 'Calçados & Tênis',
        keywords: ['calcado', 'calçado', 'tenis', 'tênis', 'sapato', 'sandalia', 'sandália', 'bota', 'sneaker', 'solado'],
        allowedMotion: [
            'rotação 360 do calçado em plataforma flutuante ou estúdio',
            'mão ajustando o cadarço ou tocando a textura do couro/tecido',
            'pressão leve no solado amortecido para mostrar flexibilidade',
            'passo firme em superfície limpa de estúdio ou calçada urbana',
            'luz deslizando pela entressola e cabedal'
        ],
        forbiddenMotion: [
            'deformação permanente do formato da biqueira ou solado',
            'descolamento de partes do tênis ou rasgo de costuras',
            'alteração nas cores dos painéis laterais ou logotipo da marca',
            'mudança do número de ilhós de cadarço',
            'estiramento irreal da borracha do solado'
        ],
        defaultShots: [
            {
                stepName: 'Hook de Apresentação Sneaker',
                camera: 'Low-angle de baixo para cima com movimento orbital dinâmico',
                handAction: 'Mão segurando o tênis {product_name} pela sola e apresentando o design',
                framing: 'Plano vertical 9:16 com estética urbana/streetwear de alto impacto',
                visualObjective: 'Destacar a silhueta, o solado estiloso e as combinações de cores do calçado',
                visualPromptTemplateEn: 'Dynamic low-angle macro shot of {product_name} in {color} with {material} upper, held by hand against an urban aesthetic background.',
                actionPromptTemplateEn: 'Fast orbital camera turn revealing the full silhouette and bold outsole profile.',
                dialogueTemplatePtBr: 'Se você busca conforto absoluto sem abrir mão do estilo, precisa ver este tênis.'
            },
            {
                stepName: 'Detalhe do Cabedal e Amortecimento',
                camera: 'Close-up extremo no amortecimento da sola e costuras do cabedal',
                handAction: 'Pressionando suavemente a sola de EVA/gel para demonstrar o macio',
                framing: 'Foco cravado no material com desfoque de fundo (bokeh)',
                visualObjective: 'Comprovar o conforto, a qualidade da sola e o tecido respirável',
                visualPromptTemplateEn: 'Macro close-up focusing on the {texture} upper and cushioned outsole of {product_name}. Finger pressing slightly on midsole.',
                actionPromptTemplateEn: 'Slow camera tracking movement along the lateral logo and midsole cushion texture.',
                dialogueTemplatePtBr: 'O sistema de amortecimento absorve cada impacto e o tecido respirável mantém os pés frescos.'
            },
            {
                stepName: 'On-Feet Walk Demonstration',
                camera: 'Tracking shot acompanhando os pés em caminhada fluida',
                handAction: 'Avatar/modelo dando passos firmes e mostrando a flexibilidade ao caminhar',
                framing: 'Plano baixo focado da cintura para baixo em calçada moderna ou estúdio',
                visualObjective: 'Mostrar o tênis sendo usado no mundo real com roupas adequadas',
                visualPromptTemplateEn: 'On-feet tracking shot of model walking wearing {product_name}, demonstrating natural flex and movement on clean pavement.',
                actionPromptTemplateEn: 'Low camera tracking shot moving alongside the footsteps in smooth fluid motion.',
                dialogueTemplatePtBr: 'Combina perfeitamente com calça jeans, jogger ou shorts. Caimento impecável.'
            },
            {
                stepName: 'Fechamento com Caixa e CTA',
                camera: 'Plano de estúdio descendo suavemente sobre a caixa oficial',
                handAction: 'Acomodando o par em cima da caixa de embalagem original',
                framing: 'Composição limpa e alinhada estilo loja oficial',
                visualObjective: 'Garantir a autenticidade do produto e direcionar para o link de compra',
                visualPromptTemplateEn: 'Hero shot of {product_name} resting on top of its branded shoebox under bright warm studio light.',
                actionPromptTemplateEn: 'Smooth camera pedestal down settling on a balanced full-pair display.',
                dialogueTemplatePtBr: 'Par exclusivo com estoque limitado. Clique no link e garanta o seu tamanho!'
            }
        ]
    },

    bolsa: {
        categoryKey: 'bolsa',
        label: 'Bolsas & Acessórios',
        keywords: ['bolsa', 'mochila', 'mala', 'carteira', 'bag', 'backpack', 'pochete', 'case', 'necessaire'],
        allowedMotion: [
            'abertura e fechamento suave do zíper ou fecho magnético',
            'mão mostrando os compartimentos internos limpos',
            'ajuste da alça de ombro ajustável',
            'movimento de carregar a bolsa com elegância',
            'brilho de luz nos metais, fivelas e zíperes'
        ],
        forbiddenMotion: [
            'alteração na forma da estrutura rígida ou costuras da bolsa',
            'deformação dos logotipos metálicos gravados',
            'rasgo de tecido ou descascamento do couro',
            'desaparecimento das fivelas ou mosquetões da alça',
            'alteração da cor do forro interno'
        ],
        defaultShots: [
            {
                stepName: 'Hook de Elegância e Design',
                camera: 'Plano de revelação com câmera descendo na vertical (pedestal down)',
                handAction: 'Mão feminina/masculina elegante segurando a alça da {product_name}',
                framing: 'Plano médio em ambiente sofisticado ou estúdio de moda com luz suave',
                visualObjective: 'Apresentar a bolsa como um item de desejo, sofisticação e funcionalidade',
                visualPromptTemplateEn: 'Elegant product reveal shot of {product_name} in {material} with {finish} hardware, held gracefully against a refined backdrop.',
                actionPromptTemplateEn: 'Smooth vertical camera pedestal movement from the top handles down to the structured base.',
                dialogueTemplatePtBr: 'A bolsa perfeita existe e combina espaço interno com um design espetacular.'
            },
            {
                stepName: 'Detalhe dos Metais e Zíper',
                camera: 'Macro nos puxadores de zíper metálicos e fecho magnético',
                handAction: 'Deslizando o zíper com extrema fluidez para mostrar a facilidade',
                framing: 'Close-up com iluminação focal nos detalhes dourados/prateados',
                visualObjective: 'Demonstrar a qualidade dos metais que não descascam e o zíper reforçado',
                visualPromptTemplateEn: 'Macro shot of the polished metallic zipper and hardware of {product_name}, showcasing the crisp {logo} emblem.',
                actionPromptTemplateEn: 'Close-up slider camera movement following the smooth opening of the zipper track.',
                dialogueTemplatePtBr: 'Ferragens banhadas de alta resistência que não perdem o brilho com o tempo.'
            },
            {
                stepName: 'Capacidade Interna e Organização',
                camera: 'Plano top-down (vista superior 90 graus) ou inclinado para dentro',
                handAction: 'Organizando itens essenciais (celular, carteira, chaves, maquiagem) nos bolsos',
                framing: 'Enquadramento claro e iluminado do compartimento interno',
                visualObjective: 'Provar a excelente divisão interna e utilidade no dia a dia',
                visualPromptTemplateEn: 'Top-down organizational shot revealing the interior pockets and spacious compartments of {product_name}.',
                actionPromptTemplateEn: 'Static top-down frame with gentle hand movements displaying internal capacity.',
                dialogueTemplatePtBr: 'Por dentro ela é super espaçosa, com divisórias estratégicas para manter tudo no lugar.'
            },
            {
                stepName: 'CTA de Moda e Estilo',
                camera: 'Plano geral de estilo com rotação leve da modelo mostrando a bolsa no ombro',
                handAction: 'Ajustando a bolsa com postura impecável',
                framing: 'Composição de revista de moda moderna',
                visualObjective: 'Estimular a aquisição imediata no e-commerce',
                visualPromptTemplateEn: 'Hero lifestyle shot of the model wearing {product_name} over the shoulder, posing in warm sunlight.',
                actionPromptTemplateEn: 'Slow camera pull-back showcasing the complete outfit and bag pairing.',
                dialogueTemplatePtBr: 'Garanta a sua bolsa com envio imediato e condição especial clicando abaixo!'
            }
        ]
    },

    geral: {
        categoryKey: 'geral',
        label: 'Produto Geral',
        keywords: ['produto', 'item', 'geral', 'objeto'],
        allowedMotion: [
            'rotação suave 360 do produto em plataforma de estúdio',
            'mão experiente interagindo com as funções principais',
            'luz de preenchimento deslizando pelas curvas e bordas',
            'aproximação e afastamento de câmera cinematográfica (zoom/push)',
            'apresentação da embalagem e acessórios originais'
        ],
        forbiddenMotion: [
            'deformação da forma física principal',
            'alteração de logotipos, textos e etiquetas impresso',
            'mudança nas cores e materiais originais',
            'derretimento ou liquefação de superfícies rígidas',
            'criação de partes inexistentes no produto'
        ],
        defaultShots: [
            {
                stepName: 'Hook de Destaque do Produto',
                camera: 'Close-up cinematográfico com rotação suave e iluminação de estúdio',
                handAction: 'Mãos experientes posicionando o {product_name} no centro do enquadramento',
                framing: 'Enquadramento centralizado 9:16 com fundo limpo de estúdio',
                visualObjective: 'Apresentar o produto com máxima clareza e impacto visual',
                visualPromptTemplateEn: 'Photorealistic close-up shot of {product_name} in {color} with {finish} finish, illuminated by soft cinematic studio light.',
                actionPromptTemplateEn: 'Slow camera push-in towards the product, highlighting shape, texture, and core features.',
                dialogueTemplatePtBr: 'Conheça o {product_name}, a solução perfeita que vai facilitar a sua rotina.'
            },
            {
                stepName: 'Detalhe do Material e Acabamento',
                camera: 'Macro nos detalhes principais de {material} e textura {texture}',
                handAction: 'Tocando delicadamente na superfície para comprovar a qualidade',
                framing: 'Plano fechado ressaltando o acabamento impecável',
                visualObjective: 'Comprovar a durabilidade, textura e excelência do acabamento',
                visualPromptTemplateEn: 'Macro detailed shot of {product_name} focusing on the {material} surface and crisp {logo} detail.',
                actionPromptTemplateEn: 'Controlled camera glide across the product surface with specular light reflections.',
                dialogueTemplatePtBr: 'Desenvolvido com materiais de alta qualidade e acabamento resistente.'
            },
            {
                stepName: 'Demonstração Prática de Benefício',
                camera: 'Plano médio mostrando o produto em ação real',
                handAction: 'Demonstrando a principal utilidade do produto de forma simples e direta',
                framing: 'Ambiente natural de uso cotidiano',
                visualObjective: 'Provar o benefício funcional e resolver a dor do cliente',
                visualPromptTemplateEn: 'Practical demonstration video of {product_name} being used in a real-world scenario.',
                actionPromptTemplateEn: 'Handheld tracking camera capturing the seamless operation and benefit in action.',
                dialogueTemplatePtBr: 'Prático, fácil de usar e entrega exatamente o resultado que você precisa.'
            },
            {
                stepName: 'Fechamento & Chamada para Ação',
                camera: 'Plano frontal com o produto e embalagem oficial em destaque',
                handAction: 'Apresentando o produto pronto para entrega ao consumidor',
                framing: 'Composição equilibrada e limpa',
                visualObjective: 'Concluir a venda direcionando para a compra segura',
                visualPromptTemplateEn: 'Hero shot of {product_name} next to its official packaging box in a illuminated studio environment.',
                actionPromptTemplateEn: 'Smooth camera pedestal movement settling into a balanced final frame.',
                dialogueTemplatePtBr: 'Aproveite nossa condição especial de hoje! Clique no botão e peça já o seu.'
            }
        ]
    }
};

export function findCategoryInLibrary(categoryName?: string, productName?: string): CinematicLibraryCategory {
    const text = `${categoryName || ''} ${productName || ''}`.toLowerCase();

    for (const catKey of Object.keys(CINEMATIC_LIBRARY)) {
        if (catKey === 'geral') continue;
        const libCategory = CINEMATIC_LIBRARY[catKey];
        if (libCategory.keywords.some(kw => text.includes(kw))) {
            return libCategory;
        }
    }

    return CINEMATIC_LIBRARY.geral;
}

export function suggestCinematicScenes(categoryName?: string, visionData?: ProductVisionData): CinematicLibraryCategory {
    const matchedCategory = findCategoryInLibrary(categoryName || visionData?.category, visionData?.rawVisionSummary);
    return matchedCategory;
}
