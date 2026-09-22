/**
 * SHOPEE SCENE HUB — TYPES & CONTRACTS
 * 
 * Production-safe types for the 3-Scene Video Generation Hub
 * (Scene 1: Hook, Scene 2: Demonstration, Scene 3: CTA Closing).
 */

import { BrandMarkProfile } from '../visual-reference-engine/types/brandMarkTypes';
import { ResolvedWardrobeContract, WardrobeConsistencyLock } from '../creative-director/wardrobe/wardrobePriorityResolver';
import { CreativeDirectorProductWorkspace } from '../creative-director/types/compilerTypes';

export type ShopeeDialogueMode = 'auto' | 'manual';

export type ShopeeCTAMode =
  | 'produto_marcado'
  | 'sacolinha'
  | 'link_shopee'
  | 'icone_produto'
  | 'manual';

export type ShopeePresenterSource = 'manual' | 'identity_hub';

export interface ShopeeMappedProductContext {
  productIdentity: string;
  canonicalColor: string;
  observableDetails: string[];
  physicalFacts: string[];
  functionalEnvironment: string;
  specificPain: string;
  productArchetype: string;
  allowedInteractions: string[];
  blockedInteractions: string[];
  visibleBenefitProof: string;
  finalProductState: string;
}

export interface ShopeeScenePresenter {
  source: ShopeePresenterSource;
  gender: 'female' | 'male';
  description: string;
  avatarId?: string | number;
  avatarName?: string;
  avatarImage?: string;
}

export interface ShopeeContinuityMetadata {
  presenterIdentity: string;
  wardrobeContractHash: string;
  wardrobeLock: WardrobeConsistencyLock;
  brandMarkActive: boolean;
  brandMarkSummary?: string;
  environmentDescription: string;
  productIdentity: string;
  canonicalColor: string;
  productInitialState: string;
  productEndState: string;
}

export interface ShopeeSceneSequenceContext {
  product: ShopeeMappedProductContext;
  presenter: ShopeeScenePresenter;
  wardrobe: ResolvedWardrobeContract;
  brandMarkProfile?: BrandMarkProfile | null;
  environmentDescription: string;
  scene1Dialogue: string;
  scene2Dialogue: string;
  scene3Dialogue: string;
  ctaMode: ShopeeCTAMode;
  productEndState: string;
  continuityMetadata: ShopeeContinuityMetadata;
}

export interface ShopeeScene1Plan {
  sceneDuration: 3.0;
  action0To15: string;
  action15To3: string;
  spokenHook: string;
  negativeConstraints: string;
}

export interface ShopeeScene2Plan {
  sceneDuration: 8.0;
  action0To2: string;
  action2To4: string;
  action4To6: string;
  action6To8: string;
  spokenCopy: string;
  visibleBenefitProof: string;
  speechActionSync: string;
  negativeConstraints: string;
  endState: string;
}

export interface ShopeeScene3Plan {
  sceneDuration: 8.0;
  action0To2: string;
  action2To4: string;
  action4To6: string;
  action6To8: string;
  ctaGesture: string;
  spokenCta: string;
  speechActionSync: string;
  negativeConstraints: string;
}

export interface ShopeeCompiledScene {
  sceneNumber: 1 | 2 | 3;
  title: string;
  durationSeconds: 3.0 | 8.0;
  prompt: string;
  spokenDialogue: string;
}

export interface ShopeeSceneHubResult {
  scene1: ShopeeCompiledScene;
  scene2: ShopeeCompiledScene;
  scene3: ShopeeCompiledScene;
  sequenceContext: ShopeeSceneSequenceContext;
  warnings: string[];
  compiledAt: number;
}

export interface ShopeeSceneHubSnapshot {
  dialogueMode: ShopeeDialogueMode;
  presenterSource: ShopeePresenterSource;
  manualPresenterGender: 'female' | 'male';
  manualPresenterDesc: string;
  manualWardrobeTop?: string;
  manualWardrobeBottom?: string;
  manualWardrobeFootwear?: string;
  selectedAvatarId?: string | number;
  scene1ManualDialogue: string;
  scene2ManualDialogue: string;
  scene3ManualDialogue: string;
  ctaMode: ShopeeCTAMode;
  compiledResult?: ShopeeSceneHubResult | null;
  updatedAt: number;
}

export interface ShopeeSceneHubPanelProps {
  currentKey?: string;
  productWorkspace?: CreativeDirectorProductWorkspace;
  onUploadProductImage?: (file: File) => Promise<void>;
  onRemoveProductImage?: () => void;
  onAnalyzeProduct?: (overrides?: any) => Promise<any>;
  onUpdateProductContext?: (updater: (prev: any) => any) => void;
  sessionSnapshot?: ShopeeSceneHubSnapshot | null;
  onSessionSnapshotChange?: (snapshot: ShopeeSceneHubSnapshot) => void;
}
