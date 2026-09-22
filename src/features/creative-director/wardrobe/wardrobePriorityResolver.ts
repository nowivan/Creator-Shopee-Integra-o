/**
 * WARDROBE PRIORITY RESOLVER & CROSS-SCENE CONSISTENCY LOCK — STAGE 4
 * 
 * Strict Authority Hierarchy:
 * manual > avatar_extraction > default
 * 
 * Architecture Rules:
 * 1. Pure, deterministic, zero AI calls, zero side effects.
 * 2. The final wardrobe form is the single authoritative source consumed by scene compilers.
 * 3. Does not read raw detected avatar profiles or re-analyze avatar images.
 * 4. Structured wardrobe fields strictly override prose (structured fields > presenter description prose).
 * 5. Generates deterministic WardrobeConsistencyLock used identically by Scene 2 and Scene 3.
 */

import { WardrobeFieldOrigin, WardrobeFieldOrigins } from './wardrobeVisionExtractor';
import { Scene2Wardrobe } from '../types/compilerTypes';

export interface WardrobeFormInput {
  presenterGender?: 'female' | 'male' | string;
  topType?: string;
  topColor?: string;
  topStyle?: string;
  bottomType?: string;
  bottomColor?: string;
  footwearType?: string;
  footwearColor?: string;
  presenterDescription?: string;
}

export interface ResolvedWardrobeContract {
  presenterGender?: string;
  topType?: string;
  topColor?: string;
  topStyle?: string;
  bottomType?: string;
  bottomColor?: string;
  footwearType?: string;
  footwearColor?: string;
  presenterDescription?: string;

  fieldOrigins?: {
    presenterGender?: WardrobeFieldOrigin;
    topType?: WardrobeFieldOrigin;
    topColor?: WardrobeFieldOrigin;
    topStyle?: WardrobeFieldOrigin;
    bottomType?: WardrobeFieldOrigin;
    bottomColor?: WardrobeFieldOrigin;
    footwearType?: WardrobeFieldOrigin;
    footwearColor?: WardrobeFieldOrigin;
    presenterDescription?: WardrobeFieldOrigin;
  };
}

export interface WardrobeConsistencyLock {
  locked: true;
  presenterGender?: string;
  top: {
    type?: string;
    color?: string;
    style?: string;
  };
  bottom: {
    type?: string;
    color?: string;
  };
  footwear: {
    type?: string;
    color?: string;
  };
  hash: string;
}

export interface ResolveWardrobeContractParams {
  wardrobeForm: WardrobeFormInput;
  fieldOrigins?: Partial<WardrobeFieldOrigins>;
}

/**
 * Computes a deterministic 64-bit FNV-1a hex hash from a string.
 */
function fnv1a64Hex(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch << 1), 0x01000193);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

/**
 * Computes a stable, canonical hash of the resolved wardrobe contract.
 * Guarantees cross-scene consistency validation.
 */
export function computeWardrobeContractHash(contract: ResolvedWardrobeContract | Scene2Wardrobe): string {
  const canonical = {
    presenterGender: ('presenterGender' in contract && contract.presenterGender ? contract.presenterGender.trim().toLowerCase() : ''),
    topType: (contract.topType ? contract.topType.trim().toLowerCase() : ''),
    topColor: (contract.topColor ? contract.topColor.trim().toLowerCase() : ''),
    topStyle: (contract.topStyle ? contract.topStyle.trim().toLowerCase() : ''),
    bottomType: (contract.bottomType ? contract.bottomType.trim().toLowerCase() : ''),
    bottomColor: (contract.bottomColor ? contract.bottomColor.trim().toLowerCase() : ''),
    footwearType: (contract.footwearType ? contract.footwearType.trim().toLowerCase() : ''),
    footwearColor: (contract.footwearColor ? contract.footwearColor.trim().toLowerCase() : '')
  };
  const serialized = JSON.stringify(canonical);
  return `WHASH_${fnv1a64Hex(serialized)}`;
}

/**
 * Resolves the final authoritative wardrobe contract from the current form and field origins.
 * 
 * Rules:
 * - Current form values are strictly authoritative.
 * - If a field is empty/undefined, does not hallucinate clothing.
 * - Origin hierarchy: manual > avatar_extraction > default.
 */
export function resolveWardrobeContract(params: ResolveWardrobeContractParams): ResolvedWardrobeContract {
  const { wardrobeForm, fieldOrigins } = params;

  const sanitize = (val?: string): string | undefined => {
    if (!val || typeof val !== 'string') return undefined;
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const getOrigin = (field: keyof WardrobeFieldOrigins, hasValue: boolean): WardrobeFieldOrigin => {
    if (fieldOrigins && fieldOrigins[field]) {
      return fieldOrigins[field]!;
    }
    return hasValue ? 'manual' : 'default';
  };

  const presenterGender = sanitize(wardrobeForm.presenterGender);
  const topType = sanitize(wardrobeForm.topType);
  const topColor = sanitize(wardrobeForm.topColor);
  const topStyle = sanitize(wardrobeForm.topStyle);
  const bottomType = sanitize(wardrobeForm.bottomType);
  const bottomColor = sanitize(wardrobeForm.bottomColor);
  const footwearType = sanitize(wardrobeForm.footwearType);
  const footwearColor = sanitize(wardrobeForm.footwearColor);
  const presenterDescription = sanitize(wardrobeForm.presenterDescription);

  const resolvedOrigins: WardrobeFieldOrigins = {
    presenterGender: getOrigin('presenterGender', !!presenterGender),
    topType: getOrigin('topType', !!topType),
    topColor: getOrigin('topColor', !!topColor),
    topStyle: getOrigin('topStyle', !!topStyle),
    bottomType: getOrigin('bottomType', !!bottomType),
    bottomColor: getOrigin('bottomColor', !!bottomColor),
    footwearType: getOrigin('footwearType', !!footwearType),
    footwearColor: getOrigin('footwearColor', !!footwearColor),
    presenterDescription: getOrigin('presenterDescription', !!presenterDescription)
  };

  const contract: ResolvedWardrobeContract = {
    ...(presenterGender ? { presenterGender } : {}),
    ...(topType ? { topType } : {}),
    ...(topColor ? { topColor } : {}),
    ...(topStyle ? { topStyle } : {}),
    ...(bottomType ? { bottomType } : {}),
    ...(bottomColor ? { bottomColor } : {}),
    ...(footwearType ? { footwearType } : {}),
    ...(footwearColor ? { footwearColor } : {}),
    ...(presenterDescription ? { presenterDescription } : {}),
    fieldOrigins: resolvedOrigins
  };

  return Object.freeze(contract);
}

/**
 * Builds the immutable WardrobeConsistencyLock from a resolved wardrobe contract.
 */
export function buildWardrobeConsistencyLock(contract: ResolvedWardrobeContract): WardrobeConsistencyLock {
  const hash = computeWardrobeContractHash(contract);

  const lock: WardrobeConsistencyLock = {
    locked: true,
    ...(contract.presenterGender ? { presenterGender: contract.presenterGender } : {}),
    top: {
      ...(contract.topType ? { type: contract.topType } : {}),
      ...(contract.topColor ? { color: contract.topColor } : {}),
      ...(contract.topStyle ? { style: contract.topStyle } : {})
    },
    bottom: {
      ...(contract.bottomType ? { type: contract.bottomType } : {}),
      ...(contract.bottomColor ? { color: contract.bottomColor } : {})
    },
    footwear: {
      ...(contract.footwearType ? { type: contract.footwearType } : {}),
      ...(contract.footwearColor ? { color: contract.footwearColor } : {})
    },
    hash
  };

  return Object.freeze(lock);
}

/**
 * Formats canonical wardrobe prompt text from resolved wardrobe values.
 * Emits wardrobe information strictly once per semantic domain.
 */
export function formatCanonicalWardrobeSpecification(
  contract: ResolvedWardrobeContract | Scene2Wardrobe
): string {
  const topType = (contract.topType || '').trim() || 'basic plain t-shirt';
  const topColor = (contract.topColor || '').trim() || 'white';
  const topStyle = (contract.topStyle || '').trim();
  const bottomType = (contract.bottomType || '').trim() || 'basic jeans';
  const bottomColor = (contract.bottomColor || '').trim() || 'medium wash blue';
  const footwearType = (contract.footwearType || '').trim() || 'plain sneakers';
  const footwearColor = (contract.footwearColor || '').trim() || 'white';

  const topDesc = `${topColor} ${topType}${topStyle ? ` (${topStyle})` : ''}`;
  const bottomDesc = `${bottomColor} ${bottomType}`;
  const footwearDesc = `${footwearColor} ${footwearType}`;

  return `${topDesc}, ${bottomDesc}, and ${footwearDesc}`;
}

/**
 * Validates cross-scene consistency between Scene 2 and Scene 3 wardrobe contracts.
 */
export function validateCrossSceneWardrobeConsistency(
  scene2Contract: ResolvedWardrobeContract | Scene2Wardrobe,
  scene3Contract: ResolvedWardrobeContract | Scene2Wardrobe
): {
  matches: boolean;
  scene2Hash: string;
  scene3Hash: string;
  mismatches: string[];
} {
  const scene2Hash = computeWardrobeContractHash(scene2Contract);
  const scene3Hash = computeWardrobeContractHash(scene3Contract);
  const mismatches: string[] = [];

  const getVal = (obj: any, key: string) => (obj[key] || '').trim().toLowerCase();

  const fieldsToCheck = [
    'topType',
    'topColor',
    'topStyle',
    'bottomType',
    'bottomColor',
    'footwearType',
    'footwearColor'
  ];

  for (const field of fieldsToCheck) {
    const val2 = getVal(scene2Contract, field);
    const val3 = getVal(scene3Contract, field);
    if (val2 !== val3) {
      mismatches.push(`${field}: Scene 2 has "${val2}", Scene 3 has "${val3}"`);
    }
  }

  return {
    matches: scene2Hash === scene3Hash && mismatches.length === 0,
    scene2Hash,
    scene3Hash,
    mismatches
  };
}

/**
 * Dev-only diagnostic trace generator for wardrobe contracts.
 * Strictly avoids logging base64 strings or sensitive avatar data.
 */
export function getWardrobeContractDevDiagnostic(
  contract: ResolvedWardrobeContract,
  scene2Hash?: string,
  scene3Hash?: string
) {
  const hash = computeWardrobeContractHash(contract);
  const s2Hash = scene2Hash || hash;
  const s3Hash = scene3Hash || hash;

  return {
    resolvedFields: {
      presenterGender: contract.presenterGender,
      topType: contract.topType,
      topColor: contract.topColor,
      topStyle: contract.topStyle,
      bottomType: contract.bottomType,
      bottomColor: contract.bottomColor,
      footwearType: contract.footwearType,
      footwearColor: contract.footwearColor,
      presenterDescription: contract.presenterDescription
    },
    fieldOrigins: contract.fieldOrigins,
    scene2Hash: s2Hash,
    scene3Hash: s3Hash,
    consistent: s2Hash === s3Hash
  };
}
