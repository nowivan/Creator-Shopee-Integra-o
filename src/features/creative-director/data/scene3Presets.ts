/**
 * SCENE 3 PRESETS & FIXTURES FOR MANUAL TESTING & QA
 */

import { Scene3GenerationInput } from '../types/scene3';

export const SCENE3_BIBLE_PRESET: Scene3GenerationInput = {
  productContext: {
    identity: 'Bíblia de Estudo Luxo em Couro Marrom',
    category: 'Livros & Espiritualidade',
    knownPhysicalFacts: [
      'Capa em couro marrom com acabamento costurado',
      'Fitilho marcador dourado duplo',
      'Laterais das páginas douradas'
    ],
    visibleDetails: [
      'Encadernação flexível marrom texturizada',
      'Tipografia dourada na lombada',
      'Bordas metalizadas douradas'
    ],
    quantity: '1 unidade'
  },
  presenter: {
    identity: 'Mulher adulta brasileira com tom acolhedor e olhar direto para a câmera',
    gender: 'female'
  },
  wardrobe: {
    description: 'Blusa de linho bege claro de manga longa com calça jeans clássica',
    topType: 'blusa de linho de manga longa',
    topColor: 'bege claro',
    bottomType: 'calça jeans clássica',
    bottomColor: 'azul tradicional',
    footwearType: 'sapatos casuais',
    footwearColor: 'caramelo'
  },
  spokenCta: 'Toque no link abaixo agora mesmo para garantir a sua com frete grátis!'
};

export const SCENE3_BODY_SPLASH_PRESET: Scene3GenerationInput = {
  productContext: {
    identity: 'Kit 3 Body Splash Floral Fresh 200ml',
    category: 'Beleza & Perfumaria',
    knownPhysicalFacts: [
      'Frasco cilíndrico transparente com válvula spray metálica',
      'Líquido translúcido rosa suave',
      'Rótulo minimalista com ilustrações florais botânicas'
    ],
    visibleDetails: [
      'Tampa protetora cristalina removível',
      'Design ergonômico vertical para borrifamento com uma mão',
      'Kit com 3 fragrâncias complementares'
    ],
    quantity: 'Kit com 3 frascos'
  },
  presenter: {
    identity: 'Jovem criadora de conteúdo brasileira, comunicativa e expressiva',
    gender: 'female'
  },
  wardrobe: {
    description: 'Camiseta básica branca gola redonda e calça jeans clara',
    topType: 'camiseta básica lisa',
    topStyle: 'gola careca',
    topColor: 'branca',
    bottomType: 'calça jeans',
    bottomColor: 'azul claro',
    footwearType: 'tênis casual',
    footwearColor: 'branco'
  },
  spokenCta: 'Clique no botão aqui embaixo e experimente hoje mesmo com desconto exclusivo!'
};

export const SCENE3_WATCH_PRESET: Scene3GenerationInput = {
  productContext: {
    identity: 'Relógio Cronógrafo Masculino Caixa Aço Escovado',
    category: 'Relógios & Acessórios',
    knownPhysicalFacts: [
      'Caixa circular de 42mm em aço inoxidável escovado',
      'Pulseira de couro legítimo preto com costura pespontada',
      'Mostrador preto fosco com ponteiros luminosos prateados'
    ],
    visibleDetails: [
      'Sub-mostradores de precisão com botões laterais táticos',
      'Vidro de cristal mineral com tratamento anti-reflexo',
      'Fecho clássico de fivela em aço'
    ],
    quantity: '1 relógio'
  },
  presenter: {
    identity: 'Homem adulto brasileiro com postura confiante e profissional',
    gender: 'male'
  },
  wardrobe: {
    description: 'Camisa polo cinza chumbo com calça chino preta',
    topType: 'camisa polo clássica',
    topColor: 'cinza chumbo',
    bottomType: 'calça chino',
    bottomColor: 'preto',
    footwearType: 'sapatos casuais',
    footwearColor: 'preto'
  },
  spokenCta: 'Acesse o site oficial no botão abaixo antes que o estoque acabe!'
};

export const SCENE3_SNEAKER_PRESET: Scene3GenerationInput = {
  productContext: {
    identity: 'Tênis Running Ultraleve Respirável',
    category: 'Calçados Esportivos',
    knownPhysicalFacts: [
      'Cabedal em mesh respirável preto com detalhes reflexivos',
      'Solado em EVA com amortecimento de duplo impacto',
      'Palmilha anatômica removível'
    ],
    visibleDetails: [
      'Trama aberta no peito do pé para circulação de ar',
      'Solado tratorado antiderrapante branco com detalhes em grafite',
      'Cadarço chato reforçado'
    ],
    quantity: '1 par'
  },
  presenter: {
    identity: 'Homem adulto brasileiro com estilo esportivo e dinâmico',
    gender: 'male'
  },
  wardrobe: {
    description: 'Camiseta dry fit preta e bermuda esportiva cinza',
    topType: 'camiseta dry fit',
    topColor: 'preta',
    bottomType: 'bermuda esportiva',
    bottomColor: 'cinza',
    footwearType: 'meias esportivas curtas',
    footwearColor: 'branca'
  },
  spokenCta: 'Clique no botão e peça o seu agora para transformar seus treinos!'
};

export const SCENE3_TOWELS_PRESET: Scene3GenerationInput = {
  productContext: {
    identity: 'Jogo de Toalhas de Banho 100% Algodão Egípcio 500g',
    category: 'Casa, Banho & Decoração',
    knownPhysicalFacts: [
      'Tecido em felpa 100% algodão egípcio de toque macio',
      'Gramatura pesada de 500g/m²',
      'Barra decorativa com textura canelada em relevo'
    ],
    visibleDetails: [
      'Toalhas dobradas com bordas perfeitamente alinhadas',
      'Tonalidade bege suave com brilho natural das fibras',
      'Costuras duplas reforçadas nas extremidades'
    ],
    quantity: 'Jogo com 4 peças'
  },
  presenter: {
    identity: 'Mulher brasileira com postura acolhedora em ambiente doméstico',
    gender: 'female'
  },
  wardrobe: {
    description: 'Blusa básica de algodão off-white e calça confortável em tom bege',
    topType: 'blusa básica lisa',
    topColor: 'off-white',
    bottomType: 'calça casual',
    bottomColor: 'bege',
    footwearType: 'sapatilhas confortáveis',
    footwearColor: 'nude'
  },
  spokenCta: 'Aproveite a promoção de lançamento tocando no botão aqui embaixo!'
};
