/**
 * SCENE 3 MASTER TEMPLATE — CODE-OWNED STRUCTURAL CONTRACT
 * 
 * SOURCE OF TRUTH for Scene 3 (Brazilian UGC, Conversion & CTA Closing, 8 Seconds, 9:16 Vertical).
 * All technical invariants and negative constraints are controlled by code.
 * Gemini DOES NOT rewrite or summarize this structural architecture.
 * The spoken CTA is received from the Copy Agent and is strictly immutable.
 */

export const SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE = `The uploaded presenter/avatar element is strictly an identity reference for facial and physical traits. Do not inherit clothing from the avatar reference when it conflicts with the wardrobe specified in this prompt. The wardrobe specified in this prompt has absolute priority.`;

export const SCENE_3_UNIVERSAL_NEGATIVE_CONSTRAINTS = `NO MUSIC. NO SOUNDTRACK. NO BACKGROUND MUSIC. NO VOICE-OVER. NO NARRATION. NO subtitles. NO captions. NO on-screen text. NO price. NO invented discount. NO invented deadline. NO invented stock. NO invented scarcity. NO fake cart icon. NO fake button. NO graphical CTA. NO watermark. NO username. NO application interface. NO product deformation. NO product replacement. NO invented product features. NO invented accessories. NO random environment. NO impossible interaction. NO floating objects. NO repeated dialogue.`;

export const SCENE_3_CTA_CLOSING_ACTION_MANDATE = `Presenter maintains direct camera engagement and keeps the product clearly visible while speaking the final call to action. Visual action and final physical gesture must naturally reinforce the conversion message without artificial urgency or fake graphical elements.`;

export interface Scene3TemplateSections {
  header: string;
  technicalSpecs: string;
  presenterAndWardrobe: string;
  environment: string;
  productPreservation: string;
  ctaClosingPrinciple: string;
  temporalActions: string;
  dialogueLock: string;
  ctaGesture: string;
  speechActionSync: string;
  negativeConstraints: string;
}

/**
 * Returns the homologated master structural template for Scene 3.
 */
export function getScene3MasterTemplateSkeleton(): string {
  return `=== SCENE 3: CONVERSION & CTA CLOSING (8 SECONDS) ===

[TECHNICAL SPECIFICATIONS]
- Scene: Scene 3 (Conversion & CTA Closing)
- Aspect Ratio: 9:16 Vertical (Smartphone Orientation)
- Exact Duration: 8.0 Seconds
- Shot Type: Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, NO gimbal stabilization, NO cinematic color grading, authentic natural ambient lighting).
- Format: Brazilian UGC (User-Generated Content), authentic everyday smartphone realism.

[PRESENTER & WARDROBE CONTRACT]
- Avatar Identity Reference Rule: ${SCENE_3_AVATAR_WARDROBE_PRIORITY_CLAUSE}
- Presenter Identity: {{PRESENTER_DESCRIPTION}}
- Presenter Wardrobe (Enforced Priority): {{WARDROBE_SPECIFICATION}}

[FUNCTIONAL ENVIRONMENT]
- Location: {{ENVIRONMENT_SPECIFICATION}}

[PRODUCT IDENTITY & PRESERVATION]
- Product Identity: {{PRODUCT_IDENTITY}}
- Exclusive Reference: The uploaded product image is the exclusive visual reference.
- Verified Observable Details: {{PRODUCT_VISIBLE_DETAILS}}
- Known Physical Facts: {{PRODUCT_FACTS}}
- Scale & Fidelity: Maintain realistic physical scale and structural integrity. Do not deform, omit essential parts or invent unverified accessories.

[CTA CLOSING PRINCIPLE]
- Action Mandate: ${SCENE_3_CTA_CLOSING_ACTION_MANDATE}

[TEMPORAL ACTION PLAN (8 SECONDS)]
- 0.0s - 2.0s: {{ACTION_0_2}}
- 2.0s - 4.0s: {{ACTION_2_4}}
- 4.0s - 6.0s: {{ACTION_4_6}}
- 6.0s - 8.0s: {{ACTION_6_8}}

[DIRECT ON-CAMERA CTA & DIALOGUE LOCK]
- Audio Rules: Direct on-camera speech in Brazilian Portuguese (PT-BR). NO VOICE-OVER. NO NARRATION. Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.
- Exact Dialogue Lock: Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word:
"{{SPOKEN_CTA}}"

[CTA GESTURE]
- Closing Gesture: {{CTA_GESTURE}}

[SPEECH AND PHYSICAL ACTION SYNCHRONIZATION]
{{SPEECH_ACTION_SYNC}}

[NEGATIVE CONSTRAINTS — STRICTLY FORBIDDEN]
{{NEGATIVE_CONSTRAINTS}}`;
}
