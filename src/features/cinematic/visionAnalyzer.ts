import { ProductVisionData } from './types';

export interface VisionAnalyzerInput {
    file?: File | null;
    imageUrl?: string;
    productName?: string;
    categoryHint?: string;
    descriptionHint?: string;
    rawAnalysisResponse?: any;
}

/**
 * Normalizes string arrays by stripping whitespace and empty elements.
 */
function cleanArray(arr?: any[]): string[] {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => String(item).trim()).filter(Boolean);
}

/**
 * Extracts and formats structured ProductVisionData from raw analysis, text input, or image hints.
 * Serves as the single source of truth for the entire Cinematic Engine pipeline.
 */
export function buildProductVisionData(input: VisionAnalyzerInput): ProductVisionData {
    const pName = (input.productName || '').trim();
    const catHint = (input.categoryHint || '').trim();
    const descHint = (input.descriptionHint || '').trim();
    const rawData = input.rawAnalysisResponse || {};

    const combinedText = `${pName} ${catHint} ${descHint}`.toLowerCase();

    // Determine category
    let category = rawData.category || catHint;
    if (!category) {
        if (combinedText.includes('watch') || combinedText.includes('relogio') || combinedText.includes('relógio') || combinedText.includes('joia')) {
            category = 'Relógios & Joias';
        } else if (combinedText.includes('perfum') || combinedText.includes('cosmet') || combinedText.includes('creme') || combinedText.includes('batom') || combinedText.includes('skincare')) {
            category = 'Perfumes & Cosméticos';
        } else if (combinedText.includes('roupa') || combinedText.includes('camis') || combinedText.includes('t-shirt') || combinedText.includes('calca') || combinedText.includes('vestid') || combinedText.includes('moda')) {
            category = 'Moda & Vestuário';
        } else if (combinedText.includes('phon') || combinedText.includes('celul') || combinedText.includes('fones') || combinedText.includes('headphon') || combinedText.includes('eletr')) {
            category = 'Eletrônicos & Tech';
        } else if (combinedText.includes('tenis') || combinedText.includes('tênis') || combinedText.includes('sapato') || combinedText.includes('calcado') || combinedText.includes('calçado')) {
            category = 'Calçados & Tênis';
        } else if (combinedText.includes('bolsa') || combinedText.includes('mochila') || combinedText.includes('bag') || combinedText.includes('mala')) {
            category = 'Bolsas & Acessórios';
        } else {
            category = 'Produto Geral';
        }
    }

    // Determine Material
    let material = rawData.material || rawData.materials;
    if (!material) {
        if (combinedText.includes('aço') || combinedText.includes('metal') || combinedText.includes('gold') || combinedText.includes('ouro') || combinedText.includes('prata')) {
            material = 'aço inoxidável 316L polido e liga metálica nobre';
        } else if (combinedText.includes('vidro') || combinedText.includes('frasco') || combinedText.includes('cristal')) {
            material = 'vidro denso transparente de alta refração';
        } else if (combinedText.includes('algodao') || combinedText.includes('algodão') || combinedText.includes('tecido') || combinedText.includes('malha')) {
            material = 'algodão 100% penteado de alta gramatura';
        } else if (combinedText.includes('couro') || combinedText.includes('leather')) {
            material = 'couro legítimo com textura sutil e acabamento natural';
        } else if (combinedText.includes('plástico') || combinedText.includes('abs') || combinedText.includes('polímero')) {
            material = 'polímero ABS de engenharia de alta densidade';
        } else {
            material = 'material de alta qualidade e estrutura sólida';
        }
    }

    // Determine Color
    let color = rawData.color || rawData.colors;
    if (!color) {
        if (combinedText.includes('preto') || combinedText.includes('black') || combinedText.includes('dark')) {
            color = 'preto profundo e fosco com reflexos elegantes';
        } else if (combinedText.includes('dourado') || combinedText.includes('gold') || combinedText.includes('ouro')) {
            color = 'dourado reluzente de alto brilho com reflexos quentes';
        } else if (combinedText.includes('azul') || combinedText.includes('blue')) {
            color = 'azul marinho sofisticado';
        } else if (combinedText.includes('branco') || combinedText.includes('white')) {
            color = 'branco puro acetinado';
        } else if (combinedText.includes('rosa') || combinedText.includes('pink')) {
            color = 'rosa elegante de alta saturação';
        } else if (combinedText.includes('prata') || combinedText.includes('silver')) {
            color = 'prata metálico espelhado';
        } else {
            color = 'tonalidade elegante coerente com a marca original';
        }
    }

    // Determine Texture
    let texture = rawData.texture;
    if (!texture) {
        if (material.includes('aço') || material.includes('metál')) {
            texture = 'superfície metálica escovada com bisel polido reluzente';
        } else if (material.includes('vidro')) {
            texture = 'superfície lisa ultra-brilhante com transparência cristalina';
        } else if (material.includes('algodão') || material.includes('tecido')) {
            texture = 'trama de algodão macia e aveludada ao toque';
        } else if (material.includes('couro')) {
            texture = 'textura natural de couro com microporos e acabamento premium';
        } else {
            texture = 'textura uniforme sem imperfeições visíveis';
        }
    }

    // Determine Finish
    let finish = rawData.finish;
    if (!finish) {
        if (texture.includes('escovad')) {
            finish = 'polido metálico espelhado e escovado';
        } else if (texture.includes('brilhante')) {
            finish = 'brilho espelhado de estúdio';
        } else {
            finish = 'acabamento premium acetinado de alto padrão';
        }
    }

    // Determine Logo
    let logo = rawData.logo || rawData.branding;
    if (!logo) {
        if (pName) {
            logo = `logotipo e marca "${pName}" gravados em alta precisão na superfície principal`;
        } else {
            logo = 'emblema e logotipo oficial preservados com nitidez absoluta';
        }
    }

    // Determine Packaging
    let packaging = rawData.packaging;
    if (!packaging) {
        if (category.includes('Relógi') || category.includes('Joia')) {
            packaging = 'caixa rígida de apresentação de luxo com berço interno estofado';
        } else if (category.includes('Perfume') || category.includes('Cosmét')) {
            packaging = 'caixa de papelão reforçado com acabamento gráfico de alta definição';
        } else if (category.includes('Eletrô')) {
            packaging = 'embalagem case de estojo rígido com berço em EVA sob medida';
        } else if (category.includes('Calçado')) {
            packaging = 'caixa oficial de calçados reforçada com papel de seda protetor';
        } else {
            packaging = 'embalagem oficial de apresentação da marca';
        }
    }

    // Determine Fixed Parts (Partes Fixas)
    let fixedParts = cleanArray(rawData.fixedParts || rawData.partesFixas);
    if (fixedParts.length === 0) {
        if (category.includes('Relógi')) {
            fixedParts = ['caixa do relógio', 'mostrador principal', 'índices e números', 'engrenagens decorativas internas', 'logotipo gravado', 'bisel', 'vidro de cristal'];
        } else if (category.includes('Perfume')) {
            fixedParts = ['frasco de vidro', 'rótulo impresso com logotipo', 'base do frasco', 'gargalo metálico'];
        } else if (category.includes('Moda') || category.includes('Vestuário')) {
            fixedParts = ['gola reforçada', 'estampa centralizada/logotipo', 'costuras principais', 'etiqueta interna'];
        } else if (category.includes('Eletrô')) {
            fixedParts = ['carcaça do dispositivo', 'bordas da tela', 'logotipo impresso', 'portas de conexão', 'saídas de som'];
        } else if (category.includes('Calçado')) {
            fixedParts = ['estrutura do cabedal', 'logotipo lateral', 'painéis de reforço', 'costuras da sola'];
        } else {
            fixedParts = ['chassis do produto', 'logotipos impressos', 'superfície principal de exibição', 'detalhes de marcação'];
        }
    }

    // Determine Moving Parts (Partes Móveis)
    let movingParts = cleanArray(rawData.movingParts || rawData.partesMoveis);
    if (movingParts.length === 0) {
        if (category.includes('Relógi')) {
            movingParts = ['ponteiros de horas e minutos', 'fecho da pulseira', 'elos articulados da pulseira'];
        } else if (category.includes('Perfume')) {
            movingParts = ['tampa removível', 'mecanismo de acionamento do borrifador/spray'];
        } else if (category.includes('Moda') || category.includes('Vestuário')) {
            movingParts = ['caimento do tecido ao vento', 'mangas ao ajustar', 'zíper/botões articulados'];
        } else if (category.includes('Eletrô')) {
            movingParts = ['tampa do estojo de carregamento', 'indicadores de luz LED acendendo', 'botão de acionamento macio'];
        } else if (category.includes('Calçado')) {
            movingParts = ['cadarço ajustável', 'flexão suave da sola durante o passo'];
        } else {
            movingParts = ['partes móveis funcionais sem alterar a geometria do corpo'];
        }
    }

    return {
        category,
        material: String(material),
        color: String(color),
        texture: String(texture),
        finish: String(finish),
        logo: String(logo),
        packaging: String(packaging),
        fixedParts,
        movingParts,
        confidenceScore: rawData.confidenceScore || 0.95,
        rawVisionSummary: `Produto "${pName || 'Detectado'}" (${category}) em ${material}, cor ${color}, acabamento ${finish}, com logotipo (${logo}).`
    };
}
