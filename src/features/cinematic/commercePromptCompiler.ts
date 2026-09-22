import {
    CommercePromptCompilerInput,
    CommerceCompiledPromptOutput,
    CommerceShotPlan
} from './types';
import {
    buildCommerceStabilityBundle
} from './commerceStabilityContracts';
import { COMMERCE_DEMO_FAMILIES } from './commerceShotStrategy';
import {
    renderProductStructuralDNA,
    renderReferenceCoverageAndMotionSafety,
    resolveProductMotionSafety
} from '../creative-director/services/productGroundingService';
import { renderAvatarIdentityBlock } from '../visual-reference-engine';

// =========================================================================
// COMMERCE PROMPT COMPILER (CINEMATIC_COMMERCE_ENGINE_V1)
// =========================================================================

/**
 * Formats shot-by-shot action plan into structured prompt text.
 */
function formatShotActionPlanSection(shots: CommerceShotPlan[]): string {
    return shots.map((s, idx) => {
        const durText = s.targetDurationSec ? ` [~${s.targetDurationSec}s]` : '';
        return `SHOT ${idx + 1} (${s.functionType})${durText}:
- Visual: ${s.visualPromptEn}
- Action & Camera: ${s.actionPromptEn}
- Hand / Object Interaction: ${s.handAction}
- Framing: ${s.framing}
- Goal: ${s.visualObjective}`;
    }).join('\n\n');
}

/**
 * Formats the structured negative lock into a clean grouped block.
 */
function formatStructuredNegativeSection(bundle: ReturnType<typeof buildCommerceStabilityBundle>): string {
    const neg = bundle.structuredNegativeLock;
    return `[NEGATIVE LOCK — STRICT ANTI-DEFECT CONSTRAINTS]
- PRODUCT IDENTITY: ${neg.productIdentity.join(', ')}
- OBJECT GEOMETRY: ${neg.objectGeometry.join(', ')}
- TEMPORAL CONTINUITY: ${neg.temporalContinuity.join(', ')}
- HAND INTERACTION: ${neg.handInteraction.join(', ')}
- CAMERA: ${neg.camera.join(', ')}
- TEXT & LOGOS: ${neg.textAndLogo.join(', ')}
- SCENE & LIGHTING: ${neg.scene.join(', ')}`;
}

/**
 * Compiles a full Flow-ready prompt adhering to the 13-section Commerce Standard.
 */
export function compileCommercePrompt(input: CommercePromptCompilerInput): CommerceCompiledPromptOutput {
    const {
        planOutput,
        visionData,
        productName = 'Produto',
        aspectRatio = '9:16',
        surface,
        lighting = 'Clean commercial studio 3-point lighting with soft fill and crisp edge definition',
        environmentDescription,
        frameZeroConfig = {},
        requestedOrbitMode = 'none',
        customNegativeAdditions = []
    } = input;

    // 1. Build stability bundle and contracts
    const stabilityBundle = buildCommerceStabilityBundle({
        visionData,
        shots: planOutput.shots,
        productName,
        surface,
        environmentDescription,
        frameZeroConfig,
        requestedOrbitMode,
        customNegativeAdditions
    });

    const familyDef = COMMERCE_DEMO_FAMILIES[planOutput.resolvedFamily];

    // 2. Build 13 Individual Sections

    // SECTION 1: FORMAT
    const section1_format = `[1. FORMAT & SPECIFICATION]
- Aspect Ratio: ${aspectRatio} Vertical Video (Optimized for Social Commerce / TikTok / Reels / Shorts)
- Target Duration: ${planOutput.totalDurationSec}s (${planOutput.targetBeats} planned visual beats)
- Resolution & Quality: 4K 60fps ultra-sharp photorealistic commercial capture
- Aesthetic Standard: High-end commercial cinematography with pristine product fidelity`;

    // SECTION 2: REFERENCE AUTHORITY
    const section2_refAuthority = `[2. REFERENCE AUTHORITY]
${stabilityBundle.referenceAuthority.join('\n')}`;

    // SECTION 3: PRODUCT IDENTITY / OBJECT LOCK (Consuming shared canonical ProductStructuralDNA)
    const dna = input.structuralDNA || visionData?.structuralDNA;
    const structuralDnaBlock = renderProductStructuralDNA(dna);

    let section3_productIdentity: string;
    if (structuralDnaBlock) {
        section3_productIdentity = `[3. PRODUCT IDENTITY & OBJECT LOCK]
- Product Name: ${productName}
- Category: ${dna?.category || visionData.category || 'General Commercial Product'}
- ${stabilityBundle.realisticScaleLock}
- ${stabilityBundle.objectCountPersistence}

${structuralDnaBlock}`;
    } else {
        const fixedPartsList = (visionData.fixedParts || []).join(', ') || 'solid body';
        const movingPartsList = (visionData.movingParts || []).join(', ') || 'none';
        section3_productIdentity = `[3. PRODUCT IDENTITY & OBJECT LOCK]
- Product Name: ${productName}
- Category: ${visionData.category || 'General Commercial Product'}
- Primary Materials: ${visionData.material || 'Standard commercial material'}
- Color Palette: ${visionData.color || 'Reference color palette'}
- Surface Texture & Finish: ${visionData.texture || 'Smooth'} / ${visionData.finish || 'Refined'}
- Logos & Engravings: ${visionData.logo || 'Authentic reference branding'}
- Fixed Immutable Parts: [${fixedPartsList}]
- Permitted Mobile Parts: [${movingPartsList}]
- ${stabilityBundle.realisticScaleLock}
- ${stabilityBundle.objectCountPersistence}`;
    }

    // REFERENCE COVERAGE & MOTION SAFETY (Consuming shared canonical renderer)
    const coverage = input.referenceCoverage || visionData?.referenceCoverage;
    const safety = input.motionSafety || visionData?.motionSafety || (coverage ? resolveProductMotionSafety(coverage) : undefined);
    const coverageBlock = renderReferenceCoverageAndMotionSafety(coverage, safety);
    const avatarIdentityBlock = renderAvatarIdentityBlock(input.avatarIdentityContext);

    // SECTION 4: FRAME ZERO
    const section4_frameZero = `[4. FRAME ZERO (T=0s INITIAL STATE)]
${stabilityBundle.frameZero}`;

    // SECTION 5: ENVIRONMENT
    const section5_environment = `[5. ENVIRONMENT & SURFACE CONTEXT]
${stabilityBundle.environmentFunctionLock}`;

    // SECTION 6: COMMERCE DEMO FAMILY
    const section6_demoFamily = `[6. COMMERCE DEMO FAMILY]
- Family Mode: ${planOutput.resolvedFamily} (${familyDef.label})
- Style Directive: ${familyDef.description}
- Tempo: ${familyDef.pacingTempo.toUpperCase()}`;

    // SECTION 7: SHOT / ACTION PLAN
    const section7_shotPlan = `[7. SHOT & ACTION PLAN (${planOutput.targetBeats} BEATS)]
${formatShotActionPlanSection(planOutput.shots)}`;

    // SECTION 8: CAMERA
    const section8_camera = `[8. CAMERA DIRECTIVES & COMPLEXITY BALANCING]
- Camera Language: ${familyDef.defaultCameraStyle}
${planOutput.cameraGuidelines.map(g => `- ${g}`).join('\n')}
${requestedOrbitMode === '360_orbit' ? '- Object Lock 360° is ACTIVE: Camera performs orbital rotation while object geometry remains strictly rigid.' : ''}`;

    // SECTION 9: LIGHTING
    const section9_lighting = `[9. LIGHTING & ATMOSPHERE]
- Lighting Setup: ${lighting}
- Specular Control: Realistic, smooth specular highlights tracing materials without blown-out clipping.`;

    // SECTION 10: PACING
    const section10_pacing = `[10. PACING & TRANSITIONS]
- Total Duration: ${planOutput.totalDurationSec} seconds
- Cut Style: Clean snap cuts between informative beats. Zero contemplative long pauses.
- Principle: Every shot delivers fresh commercial information on use, scale, detail, or result.`;

    // SECTION 11: AUDIO
    const section11_audio = `[11. AUDIO & VOICE DIRECTIVES]
- Voiceover: ${stabilityBundle.audioDirectives.voiceover}
- Spoken Dialogue: ${stabilityBundle.audioDirectives.dialogue}
- Lip-Sync Requirement: ${stabilityBundle.audioDirectives.lipSync}
- Audio Track: ${stabilityBundle.audioDirectives.backgroundMusic}`;

    // SECTION 12: STATE & INTERACTION CONTINUITY
    const section12_continuity = `[12. STATE & INTERACTION CONTINUITY]
${stabilityBundle.frameToFrameIdentityLock.join('\n')}
${stabilityBundle.stateContinuityDirectives.join('\n')}
${stabilityBundle.interactionValidityDirectives.join('\n')}
${stabilityBundle.claimSafetyDirectives.join('\n')}`;

    // SECTION 13: STRUCTURED NEGATIVE LOCK
    const section13_negatives = `[13. STRUCTURED NEGATIVE LOCK]
${formatStructuredNegativeSection(stabilityBundle)}`;

    // 3. Assemble Full Prompt
    const rawSections = {
        format: section1_format,
        referenceAuthority: section2_refAuthority,
        productIdentityAndObjectLock: section3_productIdentity,
        frameZero: section4_frameZero,
        environment: section5_environment,
        commerceDemoFamily: section6_demoFamily,
        shotActionPlan: section7_shotPlan,
        camera: section8_camera,
        lighting: section9_lighting,
        pacing: section10_pacing,
        audio: section11_audio,
        stateAndInteractionContinuity: section12_continuity,
        structuredNegativeLock: section13_negatives
    };

    const formattedFullPromptList = [
        section1_format,
        section2_refAuthority,
        section3_productIdentity,
        ...(avatarIdentityBlock ? [avatarIdentityBlock] : []),
        ...(coverageBlock ? [coverageBlock] : []),
        section4_frameZero,
        section5_environment,
        section6_demoFamily,
        section7_shotPlan,
        section8_camera,
        section9_lighting,
        section10_pacing,
        section11_audio,
        section12_continuity,
        section13_negatives
    ];

    const formattedFullPrompt = formattedFullPromptList.join('\n\n');

    // Consolidated single negative string for video models supporting a separate negative prompt field
    const negativePromptCompiled = Object.values(stabilityBundle.structuredNegativeLock)
        .flatMap(arr => arr)
        .join(', ');

    return {
        formattedFullPrompt,
        rawSections,
        negativePromptCompiled,
        stabilityBundle
    };
}
