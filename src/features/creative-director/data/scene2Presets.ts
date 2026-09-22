/**
 * SCENE 2 PRESETS & EXAMPLE DATA
 * Production-safe sample slot sets for UI exploration and reference.
 */

import { Scene2DynamicSlots } from '../types/compilerTypes';

export const BATH_TOWELS_PRESET: Scene2DynamicSlots = {
  productIdentity: "Kit Toalhas de Banho Imperial 500g/m²",
  productFacts: [
    "Algodão 100% penteado com gramatura 500g/m²",
    "Alta absorção de água desde o primeiro uso",
    "Acabamento com costura reforçada e toque aveludado"
  ],
  productQuantity: "Kit com 2 toalhas de banho e 2 toalhas de rosto",
  productVisibleDetails: [
    "Textura felpuda densa com padrão canelado na barra",
    "Tom cinza chumbo contemporâneo fosco",
    "Etiqueta discreta bordada em tom sobre tom"
  ],
  presenter: {
    gender: "female",
    description: "Adult Brazilian woman in her late 20s with natural wavy brown hair, friendly warm expression"
  },
  wardrobe: {
    topType: "basic plain t-shirt",
    topStyle: "crew neck",
    topColor: "white",
    bottomType: "medium wash blue jeans",
    bottomColor: "blue",
    footwearType: "plain sneakers",
    footwearColor: "white"
  },
  environment: "Modern residential bathroom with clean white subway tile and natural warm morning daylight",
  primaryBenefit: "Secagem ultra rápida e absorção instantânea sem deixar a toalha pesada ou úmida no banheiro",
  spokenCopy: "A gente usa toalha todo dia, mas quando ela enxuga de verdade na primeira passada e não fica encharcada no banheiro, você vê a diferença.",
  actions: {
    action0to2: "Presenter holds the folded bath towel with both hands at chest level, smiling warmly while inspecting the dense weave texture close to the camera.",
    action2to4: "Presenter unfolds one half of the towel and demonstrates its thick absorbent cotton by pressing it gently against the forearm in a smooth, continuous wiping motion.",
    action4to6: "Presenter refolds the towel cleanly on the bathroom counter, feeling the plush softness with open palms and nodding in genuine satisfaction.",
    action6to8: "Presenter rests one hand on the neatly stacked towel set, making direct friendly eye contact with the smartphone camera as she finishes speaking naturally."
  },
  speechActionSync: [
    {
      phrase: "quando ela enxuga de verdade na primeira passada",
      action: "Presenter demonstrates absorption by wiping the towel gently across the forearm."
    },
    {
      phrase: "não fica encharcada no banheiro",
      action: "Presenter refolds the towel cleanly on the counter showing its fluffy, lightweight structure."
    }
  ]
};

export const WRISTWATCH_PRESET: Scene2DynamicSlots = {
  productIdentity: "Relógio Cronógrafo Automático Steel Horizon 42mm",
  productFacts: [
    "Caixa em aço inoxidável 316L cirúrgico e vidro em cristal de safira resistente a riscos",
    "Movimento automático mecânico com reserva de marcha de 48 horas",
    "Resistência à água de 10 ATM (100 metros)"
  ],
  productQuantity: "1 relógio com pulseira em aço e estojo rígido",
  productVisibleDetails: [
    "Mostrador azul marinho escovado com subdials prateados de cronógrafo",
    "Bisel polido com escala taquimétrica gravada a laser",
    "Pulseira de elos maciços em aço escovado com fecho borboleta"
  ],
  presenter: {
    gender: "male",
    description: "Adult Brazilian man in his early 30s with short dark hair, well-groomed beard, wearing a genuine relaxed posture"
  },
  wardrobe: {
    topType: "casual button-down linen shirt",
    topStyle: "sleeves neatly rolled to mid-forearm",
    topColor: "light grey",
    bottomType: "tailored chinos",
    bottomColor: "dark navy",
    footwearType: "leather casual loafers",
    footwearColor: "brown"
  },
  environment: "Contemporary urban apartment living space with natural window light and wooden side table",
  primaryBenefit: "Precisão mecânica e durabilidade à prova de riscos para o dia a dia executivo e casual",
  spokenCopy: "Esse cronógrafo tem cristal de safira que não risca por nada e aquele peso equilibrado no pulso que você só encontra em relógio de verdade.",
  actions: {
    action0to2: "Presenter raises his left wrist into clear frame, tilting it slightly to let natural ambient daylight catch the deep blue brushed sunray dial.",
    action2to4: "Presenter uses his right index finger and thumb to click the top chronograph pusher with a crisp mechanical action, then rotates wrist to show sapphire clarity.",
    action4to6: "Presenter adjusts the solid steel bracelet clasp with a smooth snap, demonstrating the comfortable contour fit against the wrist.",
    action6to8: "Presenter brings both hands naturally in front of chest level, looking straight into the smartphone camera with confident authentic eye contact."
  },
  speechActionSync: [
    {
      phrase: "cristal de safira que não risca por nada",
      action: "Presenter tilts the watch dial toward natural daylight, highlighting the scratch-resistant crystal reflection."
    },
    {
      phrase: "peso equilibrado no pulso",
      action: "Presenter snaps the solid steel bracelet clasp smoothly in place."
    }
  ]
};

export const COOKWARE_PRESET: Scene2DynamicSlots = {
  productIdentity: "Frigideira Antiaderente Cerâmica Chef Pro 28cm",
  productFacts: [
    "Revestimento cerâmico mineral 100% livre de PTFE, PFOA e metais pesados",
    "Base tripla de indução com distribuição térmica ultra homogênea",
    "Cabo em baquelite soft-touch antitérmico com pegada ergonômica"
  ],
  productQuantity: "1 frigideira 28cm com tampa de vidro temperado",
  productVisibleDetails: [
    "Corpo externo em acabamento fosco terracota acetinado",
    "Superfície interna em cerâmica marmorizada creme clara",
    "Cabo preto fosco com detalhe em aço escovado na fixação"
  ],
  presenter: {
    gender: "female",
    description: "Adult Brazilian woman in her mid-30s with hair tied in a practical loose low bun, confident engaging smile"
  },
  wardrobe: {
    topType: "plain cotton crew neck t-shirt",
    topStyle: "fitted short sleeves",
    topColor: "black",
    bottomType: "stretch denim jeans",
    bottomColor: "charcoal grey",
    footwearType: "canvas slip-on shoes",
    footwearColor: "black"
  },
  environment: "Contemporary home kitchen with clean quartz countertop, wooden utensil block and soft ambient daylight",
  primaryBenefit: "Alimentos deslizam sem uma única gota de óleo e limpeza completa em menos de 10 segundos",
  spokenCopy: "O que me conquistou nessa frigideira é grelhar qualquer coisa sem usar uma gota de óleo e depois limpar com uma passada leve de esponja.",
  actions: {
    action0to2: "Presenter lifts the ceramic frying pan by its ergonomic soft-touch handle over the quartz kitchen counter, tilting it to showcase the pristine interior.",
    action2to4: "Presenter takes a smooth silicone spatula and glides it freely across the dry ceramic surface in a circular sweep, demonstrating zero friction.",
    action4to6: "Presenter places the pan back onto the counter surface and displays a clean damp microfiber cloth wiping the inner rim in one effortless motion.",
    action6to8: "Presenter rests one hand on the pan handle and speaks directly into the camera lens with an authentic reassuring nod."
  },
  speechActionSync: [
    {
      phrase: "sem usar uma gota de óleo",
      action: "Presenter glides the silicone spatula smoothly across the pristine ceramic surface."
    },
    {
      phrase: "limpar com uma passada leve",
      action: "Presenter wipes the inner rim with an effortless single motion."
    }
  ]
};
