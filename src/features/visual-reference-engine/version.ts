/**
 * VISUAL REFERENCE ENGINE V1 — CANONICAL VERSION & RELEASE MANIFEST
 * 
 * Formal architecture freeze for Visual Reference Engine V1.
 * Release Candidate: v1.0.0-rc.1 (Stable Release Candidate)
 */

export const VISUAL_REFERENCE_ENGINE_VERSION = '1.0.0' as const;
export const VISUAL_REFERENCE_ENGINE_RELEASE_CANDIDATE = 'v1.0.0-rc.1' as const;
export const VISUAL_REFERENCE_ENGINE_STATUS = 'STABLE' as const;
export const VISUAL_REFERENCE_ENGINE_STAGE = 'STAGE_12_FREEZE' as const;

export interface EngineVersionInfo {
  version: typeof VISUAL_REFERENCE_ENGINE_VERSION;
  releaseCandidate: typeof VISUAL_REFERENCE_ENGINE_RELEASE_CANDIDATE;
  status: typeof VISUAL_REFERENCE_ENGINE_STATUS;
  freezeDate: string;
  buildStatus: 'PRODUCTION_READY';
}

export const ENGINE_VERSION_INFO: EngineVersionInfo = {
  version: VISUAL_REFERENCE_ENGINE_VERSION,
  releaseCandidate: VISUAL_REFERENCE_ENGINE_RELEASE_CANDIDATE,
  status: VISUAL_REFERENCE_ENGINE_STATUS,
  freezeDate: '2026-08-27',
  buildStatus: 'PRODUCTION_READY'
};

/**
 * SEMANTIC VERSIONING & CHANGE POLICY V1:
 * 
 * PATCH (1.0.x):
 *   Permitted: Bug fixes, accessibility, UI polish, performance improvements, documentation, security hardening.
 *   Forbidden: Breaking visual evidence contracts, changing canonical prompt clause ordering, mutating cleaner resolution rules.
 * 
 * MINOR (1.x.0):
 *   Permitted: Backward-compatible extensions, optional visual inspection modes, additive metadata.
 *   Forbidden: Breaking existing consumer contracts (Creative Director, Cinematic Engine, Identity Hub).
 * 
 * MAJOR (2.0.0):
 *   Required when: Modifying VisualReferenceAnalysis schema, changing evidence state semantics, altering lock authority,
 *   rearchitecting ProductStructuralDNA authority, or breaking handoff APIs.
 */
export const CHANGE_POLICY_V1 = {
  patch: '1.0.x — Bug fixes, UI/A11y, performance, security without visual contract changes.',
  minor: '1.x.0 — Additive compatible features and optional diagnostics without breaking existing consumers.',
  major: '2.0.0 — Mandatory for schema breaking changes, evidence state changes, or lock authority rearchitectures.'
} as const;
