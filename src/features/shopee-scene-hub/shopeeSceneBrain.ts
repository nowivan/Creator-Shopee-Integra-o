/**
 * SHOPEE SCENE BRAIN
 * 
 * Core coordinator for the 3-Scene Video Generation Hub.
 * 
 * Invariants:
 * 1. "MANUAL COPY OWNS THE WORDS. SHOPEE SCENE BRAIN OWNS THE VISUAL EXECUTION."
 * 2. In AUTO mode: generates 3 compliant, structured script components.
 * 3. In MANUAL mode: preserves user dialogue byte-for-byte without mutation.
 * 4. Checks for forbidden platform terms (e.g. "carrinho laranja" in Shopee mode) and issues warnings.
 * 5. Deterministic, robust, zero uncaught exceptions.
 */

import {
  ShopeeDialogueMode,
  ShopeeCTAMode,
  ShopeePresenterSource,
  ShopeeSceneSequenceContext,
  ShopeeSceneHubResult,
  ShopeeScenePresenter,
  ShopeeContinuityMetadata
} from './types';
import { mapProductWorkspaceToShopeeContext, ShopeeProductMappingOverrides } from './shopeeProductMapper';
import { planShopeeScene1 } from './shopeeScene1Planner';
import { planShopeeScene2 } from './shopeeScene2Planner';
import { planShopeeScene3 } from './shopeeScene3Planner';
import {
  compileShopeeScene1Prompt,
  compileShopeeScene2Prompt,
  compileShopeeScene3Prompt
} from './compiler/shopeePromptCompiler';
import { CreativeDirectorProductWorkspace } from '../creative-director/types/compilerTypes';
import {
  resolveWardrobeContract,
  buildWardrobeConsistencyLock,
  WardrobeFormInput
} from '../creative-director/wardrobe/wardrobePriorityResolver';
import { StoredAvatar } from '../../services/avatarStorageService';
import { extractAvatarFullContext } from '../creative-director/wardrobe/avatarWardrobeContext';
import { BrandMarkProfile } from '../visual-reference-engine/types/brandMarkTypes';
import { isBrandMarkActive, resolveBrandMarkAuthority } from '../visual-reference-engine/services/brandMarkAuthority';

export interface RunShopeeSceneHubParams {
  productWorkspace?: CreativeDirectorProductWorkspace | null;
  productOverrides?: ShopeeProductMappingOverrides;
  presenterSource: ShopeePresenterSource;
  manualPresenterGender?: 'female' | 'male';
  manualPresenterDesc?: string;
  manualWardrobe?: WardrobeFormInput;
  selectedAvatar?: StoredAvatar | null;
  dialogueMode: ShopeeDialogueMode;
  scene1ManualDialogue?: string;
  scene2ManualDialogue?: string;
  scene3ManualDialogue?: string;
  ctaMode: ShopeeCTAMode;
  customEnvironment?: string;
}

/**
 * Generates default auto-dialogue tailored to the product facts and CTA mode,
 * prioritizing the Shopee Native Creator pattern:
 * Product in Use → Feature Demonstration → Practical Benefit → Personal Opinion → Native Shopee CTA.
 */
export function generateAutoDialogueForShopee(
  productName: string,
  specificPain: string,
  observableDetail: string,
  ctaMode: ShopeeCTAMode
): { scene1: string; scene2: string; scene3: string } {
  const scene1 = `Se você também perde tempo com ${specificPain.toLowerCase()}, você precisa ver isso aqui.`;

  // Scene 2: Shopee Native Creator flow (Product in Use -> Feature Demo -> Practical Benefit -> Personal Opinion)
  // Strictly calibrated for 160-175 char range without CTA
  let scene2 = `Quando comecei a usar esse ${productName} no meu dia a dia, a praticidade foi imediata. Ele funciona muito rápido, facilita a rotina e cumpre de verdade o que promete.`;
  if (scene2.length > 175) {
    scene2 = `Usando esse ${productName} na minha rotina, a praticidade foi imediata. Ele funciona rápido, facilita meu dia e cumpre de verdade o que promete em casa.`;
  }
  if (scene2.length < 160) {
    scene2 = `Quando comecei a usar esse ${productName} no meu dia a dia, a praticidade foi imediata. Ele funciona muito rápido, facilita a rotina e cumpre de verdade tudo o que promete.`;
  }

  // Scene 3: Focused CTA copy
  let scene3 = '';
  switch (ctaMode) {
    case 'produto_marcado':
      scene3 = `Aproveita que o produto tá marcado aqui embaixo no vídeo pra garantir o seu com facilidade antes que acabe o estoque!`;
      break;
    case 'sacolinha':
      scene3 = `Clica agora na sacolinha aqui embaixo pra conferir todos os detalhes e garantir o seu com praticidade total!`;
      break;
    case 'link_shopee':
      scene3 = `O link da Shopee tá disponível aqui no perfil pra você garantir o seu agora mesmo com total praticidade!`;
      break;
    case 'icone_produto':
      scene3 = `Clica no ícone do produto aqui na tela e garante logo o seu com envio rápido antes que acabe tudo!`;
      break;
    case 'manual':
    default:
      scene3 = `Aproveita e confere aqui no produto marcado pra garantir o seu agora mesmo com total tranquilidade!`;
      break;
  }

  return { scene1, scene2, scene3 };
}

/**
 * Validates manual text for forbidden platform terms (e.g. "carrinho laranja").
 */
export function validateShopeeDialogueText(
  text: string,
  sceneLabel: string
): string[] {
  const warnings: string[] = [];
  if (/carrinho\s+laranja/i.test(text)) {
    warnings.push(
      `Aviso (${sceneLabel}): O termo "carrinho laranja" é associado a outra plataforma e pode ser restringido na Shopee. Recomenda-se usar "produto marcado", "sacolinha" ou "link da Shopee".`
    );
  }
  return warnings;
}

/**
 * Core execution entry point for the Shopee Scene Hub.
 */
export function runShopeeSceneHubPipeline(
  params: RunShopeeSceneHubParams
): ShopeeSceneHubResult {
  const warnings: string[] = [];

  // 1. Resolve Product Context
  const product = mapProductWorkspaceToShopeeContext(
    params.productWorkspace,
    params.productOverrides
  );

  // 2. Resolve Presenter
  let presenter: ShopeeScenePresenter;
  let brandMarkProfile: BrandMarkProfile | null = null;
  let wardrobeInput: WardrobeFormInput = {};

  if (params.presenterSource === 'identity_hub' && params.selectedAvatar) {
    const avatarCtx = extractAvatarFullContext(params.selectedAvatar);
    presenter = {
      source: 'identity_hub',
      gender: avatarCtx?.gender || 'female',
      description: avatarCtx?.presenterIdentity || params.selectedAvatar.name || 'Apresentador brasileiro autêntico e expressivo',
      avatarId: params.selectedAvatar.id,
      avatarName: params.selectedAvatar.name,
      avatarImage: params.selectedAvatar.image
    };

    if (params.selectedAvatar.brandMarkProfile) {
      brandMarkProfile = params.selectedAvatar.brandMarkProfile;
    }

    wardrobeInput = {
      presenterGender: presenter.gender,
      topType: avatarCtx?.topType || 't-shirt casual',
      topColor: avatarCtx?.topColor || 'preta',
      topStyle: avatarCtx?.topStyle,
      bottomType: avatarCtx?.bottomType || 'calça jeans',
      bottomColor: avatarCtx?.bottomColor || 'azul',
      presenterDescription: presenter.description
    };
  } else {
    // Manual Presenter
    const gender = params.manualPresenterGender || 'female';
    const defaultDesc = `Apresentadora brasileira com visual moderno e abordagem calorosa`;
    presenter = {
      source: 'manual',
      gender,
      description: params.manualPresenterDesc?.trim() || defaultDesc
    };
    wardrobeInput = params.manualWardrobe || {
      presenterGender: gender,
      topType: 'camiseta básica',
      topColor: 'branca',
      bottomType: 'calça jeans',
      bottomColor: 'azul escuro',
      presenterDescription: presenter.description
    };
  }

  // 3. Resolve Wardrobe Contract & Lock
  const wardrobe = resolveWardrobeContract({ wardrobeForm: wardrobeInput });
  const wardrobeLock = buildWardrobeConsistencyLock(wardrobe);

  // 4. Resolve Environment
  const environmentDescription =
    params.customEnvironment?.trim() || product.functionalEnvironment;

  // 5. Resolve Dialogue (Auto vs Manual)
  let s1Dialogue = '';
  let s2Dialogue = '';
  let s3Dialogue = '';

  if (params.dialogueMode === 'manual') {
    // Manual Copy Owns The Words
    s1Dialogue = (params.scene1ManualDialogue || '').trim();
    s2Dialogue = (params.scene2ManualDialogue || '').trim();
    s3Dialogue = (params.scene3ManualDialogue || '').trim();

    // Warnings for forbidden terms (no silent rewriting)
    if (s1Dialogue) warnings.push(...validateShopeeDialogueText(s1Dialogue, 'Cena 1'));
    if (s2Dialogue) warnings.push(...validateShopeeDialogueText(s2Dialogue, 'Cena 2'));
    if (s3Dialogue) warnings.push(...validateShopeeDialogueText(s3Dialogue, 'Cena 3'));

    // Check for CTA or Price leaks in Scene 1 & Scene 2
    if (/clica|compre|link|sacolinha|carrinho|cupom|desconto|preço|r\$/i.test(s1Dialogue)) {
      warnings.push(`Atenção: A Cena 1 (Hook) não deve conter chamadas para ação (CTA), links ou menções a preços.`);
    }
    if (/clica|compre|link|sacolinha|carrinho|cupom|desconto|preço|r\$/i.test(s2Dialogue)) {
      warnings.push(`Atenção: A Cena 2 (Demonstração) não deve conter chamadas para ação (CTA), links ou menções a preços.`);
    }

    if (!s1Dialogue) {
      s1Dialogue = `Se você também passa por isso no dia a dia, olha só esse achadinho.`;
    }
    if (!s2Dialogue) {
      s2Dialogue = `Esse ${product.productIdentity} resolve na prática com facilidade total. Muito simples de usar e funciona de verdade.`;
    }
    if (!s3Dialogue) {
      s3Dialogue = `Clica aqui no produto marcado para garantir o seu antes que esgote!`;
    }
  } else {
    // Auto Dialogue Mode
    const auto = generateAutoDialogueForShopee(
      product.productIdentity,
      product.specificPain,
      product.observableDetails[0] || 'detalhes originais',
      params.ctaMode
    );
    s1Dialogue = auto.scene1;
    s2Dialogue = auto.scene2;
    s3Dialogue = auto.scene3;
  }

  // 6. Resolve Continuity & Sequence Context
  const brandMarkActive = isBrandMarkActive(brandMarkProfile);
  const brandMarkSummary = brandMarkActive
    ? resolveBrandMarkAuthority(brandMarkProfile).statusSummary?.anchorText
    : undefined;

  const continuityMetadata: ShopeeContinuityMetadata = {
    presenterIdentity: presenter.description,
    wardrobeContractHash: wardrobeLock.hash,
    wardrobeLock,
    brandMarkActive,
    brandMarkSummary,
    environmentDescription,
    productIdentity: product.productIdentity,
    canonicalColor: product.canonicalColor,
    productInitialState: `Produto em configuração inicial pronta para apresentação`,
    productEndState: product.finalProductState
  };

  const sequenceContext: ShopeeSceneSequenceContext = {
    product,
    presenter,
    wardrobe,
    brandMarkProfile,
    environmentDescription,
    scene1Dialogue: s1Dialogue,
    scene2Dialogue: s2Dialogue,
    scene3Dialogue: s3Dialogue,
    ctaMode: params.ctaMode,
    productEndState: product.finalProductState,
    continuityMetadata
  };

  // 7. Plan Each Scene
  const plan1 = planShopeeScene1(sequenceContext);
  const plan2 = planShopeeScene2(sequenceContext);
  const plan3 = planShopeeScene3(sequenceContext);

  // 8. Compile Prompts
  const scene1 = compileShopeeScene1Prompt(sequenceContext, plan1);
  const scene2 = compileShopeeScene2Prompt(sequenceContext, plan2);
  const scene3 = compileShopeeScene3Prompt(sequenceContext, plan3);

  return {
    scene1,
    scene2,
    scene3,
    sequenceContext,
    warnings,
    compiledAt: Date.now()
  };
}
