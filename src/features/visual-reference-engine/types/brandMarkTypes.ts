/**
 * BRAND & LOGO IDENTITY TYPES — CANONICAL CONTRACT
 * Visual Reference Engine — Identity Hub Brand Mark Authority
 */

export type BrandMarkType =
  | 'print'
  | 'embroidery'
  | 'patch'
  | 'badge'
  | 'pin'
  | 'other';

export type BrandMarkAnchorRegion =
  | 'left_chest'
  | 'right_chest'
  | 'center_chest'
  | 'left_sleeve'
  | 'right_sleeve'
  | 'custom';

export type BrandMarkFidelityLevel =
  | 'standard'
  | 'high'
  | 'strict';

export interface BrandMarkProfile {
  enabled: boolean;
  referenceImage?: string;
  markType: BrandMarkType;
  anchorRegion: BrandMarkAnchorRegion;
  customAnchorRegion?: string;
  relativeScale?: 'small' | 'medium' | 'large' | string;
  colorProfile?: string;
  visibleText?: string;
  fidelityLevel: BrandMarkFidelityLevel;
  preserveAcrossScenes: boolean;
}

export interface BrandMarkResolutionResult {
  active: boolean;
  clause: string;
  videoPrompt: string;
  cameraGuard: string;
  statusSummary: {
    statusText: string;
    anchorText: string;
    fidelityText: string;
    markTypeText: string;
    hasImage: boolean;
  };
}
