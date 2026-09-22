/**
 * SCENE 2 MASTER TEMPLATE — CODE-OWNED STRUCTURAL CONTRACT
 * 
 * SOURCE OF TRUTH for Scene 2 (Brazilian UGC, 8 Seconds, 9:16 Vertical).
 * All technical invariants and negative constraints are controlled by code.
 * Gemini DOES NOT rewrite or summarize this structural architecture.
 */

export const SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE = `The uploaded presenter/avatar element is strictly an identity reference for facial and physical traits. Do not inherit clothing from the avatar reference when it conflicts with the wardrobe specified in this prompt. The wardrobe specified in this prompt has absolute priority.`;

export const SCENE_2_NEGATIVE_CONSTRAINTS = `NO MUSIC. NO SOUNDTRACK. NO BACKGROUND MUSIC. NO VOICE-OVER. NO NARRATION. NO subtitles. NO on-screen text. NO price. NO promotion. NO urgency. NO scarcity. NO CTA. NO cart mention. NO cart icon. NO watermark. NO app interface. NO invented features. NO extra accessories. NO product deformation. NO random environment. NO impossible interaction. NO exaggerated product scale. NO repeated dialogue.`;

export interface Scene2TemplateSections {
  header: string;
  technicalSpecs: string;
  presenterAndWardrobe: string;
  environment: string;
  productPreservation: string;
  benefitDemonstrationPrinciple: string;
  temporalActions: string;
  dialogueLock: string;
  speechActionSync: string;
  negativeConstraints: string;
}

/**
 * Returns the homologated master structural template for Scene 2.
 */
export function getScene2MasterTemplateSkeleton(): string {
  return `=== SCENE 2: SPOKEN BENEFIT & PHYSICAL DEMONSTRATION (8 SECONDS) ===

[TECHNICAL SPECIFICATIONS]
- Scene: Scene 2 (Value Proposition & Practical Demonstration)
- Aspect Ratio: 9:16 Vertical (Smartphone Orientation)
- Exact Duration: 8.0 Seconds
- Shot Type: Single continuous uninterrupted take (NO cuts, NO transitions, NO visual effects, NO artificial zooms, natural subtle autofocus, realistic handheld smartphone camera motion with natural human micro-movements, NO gimbal stabilization, NO cinematic color grading, authentic natural ambient lighting).
- Format: Brazilian UGC (User-Generated Content), authentic everyday smartphone realism.

[PRESENTER & WARDROBE CONTRACT]
- Avatar Identity Reference Rule: ${SCENE_2_AVATAR_WARDROBE_PRIORITY_CLAUSE}
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

[BENEFIT DEMONSTRATION PRINCIPLE]
- Primary Benefit: {{PRIMARY_BENEFIT}}
- Action Mandate: Action must physically support the spoken benefit through practical everyday handling. No empty product presentation, no static posing, no generic holding of packaging.

[TEMPORAL ACTION PLAN (8 SECONDS)]
- 0.0s - 2.0s: {{ACTION_0_2}}
- 2.0s - 4.0s: {{ACTION_2_4}}
- 4.0s - 6.0s: {{ACTION_4_6}}
- 6.0s - 8.0s: {{ACTION_6_8}}

[DIRECT ON-CAMERA SPEECH & DIALOGUE LOCK]
- Audio Rules: Direct on-camera speech in Brazilian Portuguese (PT-BR). NO VOICE-OVER. NO NARRATION. Natural lip synchronization with spoken words, authentic conversational tone, and realistic room acoustics without background music.
- Exact Dialogue Lock: Say ONLY this exact phrase. Do not change, add, remove, shorten or repeat any word:
"{{SPOKEN_COPY}}"

[SPEECH AND PHYSICAL ACTION SYNCHRONIZATION]
{{SPEECH_ACTION_SYNC}}

[NEGATIVE CONSTRAINTS — STRICTLY FORBIDDEN]
${SCENE_2_NEGATIVE_CONSTRAINTS}`;
}
