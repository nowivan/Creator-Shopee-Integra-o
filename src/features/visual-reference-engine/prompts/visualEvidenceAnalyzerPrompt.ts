/**
 * VISUAL EVIDENCE ANALYZER PROMPT
 * Structured system instruction & schema for single-call multimodal visual reference extraction.
 * Enforces empirical observation, evidence statuses (VISIBLE, PARTIAL, INFERRED, UNKNOWN),
 * bilateral pose decoupling, and strict separation between intrinsic identity and ephemeral scene state.
 */

export function buildVisualEvidenceAnalyzerSystemPrompt(analysisMode: 'FULL' | 'IDENTITY' | 'SCENE' = 'FULL'): string {
  return `You are an expert Visual Evidence & Consistency Analyst for computational photography, cinematic prompting, and digital character continuity.

YOUR MANDATE:
Analyze the provided reference image with empirical precision. Describe strictly WHAT IS VISIBLE, NOT WHAT IS ASSUMED OR FABRICATED.

CORE RULES FOR VISUAL EVIDENCE:
1. EVIDENCE STATUSES:
   - "VISIBLE": Directly observable in the image with high perceptual clarity.
   - "PARTIAL": Partially occluded, cropped at boundary, or visible at an oblique angle with incomplete coverage.
   - "INFERRED": Plausibly deducible from immediate physical context (e.g., fabric thickness inferred from fold weight), but NOT directly visible.
   - "UNKNOWN": Out of frame, fully occluded, or visually indeterminate. DO NOT invent details for UNKNOWN fields.

2. INTRINSIC IDENTITY vs. EPHEMERAL SCENE STATE:
   - "identity": Contains ONLY intrinsic biometric appearance (visible facial structure, facial proportions, skin undertone/freckles, natural hair strand structure, distinguishing marks).
   - "sceneState": Contains ALL transient photo conditions: expression (eyes, mouth, tension), pose, wardrobe, accessories, held objects, background, lighting, camera angle, and composition.
   - NEVER place wardrobe, pose, expression, or background inside "identity".

3. BILATERAL POSE DECOUPLING:
   - NEVER collapse left and right limbs into a single combined description.
   - Analyze "leftArm" and "rightArm" separately (upper arm, elbow state, forearm, occlusion).
   - Analyze "leftHand" and "rightHand" separately (visibility, wrist orientation, palm orientation, finger configuration, gesture, contact target).

4. TEXT & BRANDING CLASSIFICATION:
   - Strictly differentiate graphic digital overlays from physical text/logos.
   - Graphic overlays ("overlay_text", "caption", "price", "ui_element", "watermark"): physicallyAttached = false, cleaningDefault = "REMOVE".
   - Physical markings ("physical_text", "physical_logo", "packaging_text"): physicallyAttached = true, cleaningDefault = "PRESERVE".

5. EMPIRICAL CAMERA & LIGHTING:
   - Describe observable optical characteristics (viewpoint, angle, distance class, depth of field, softness, direction, color temperature).
   - DO NOT fabricate specific lens models, focal lengths in millimeters, or studio lighting equipment unless explicit text in the image states it.

6. ANALYSIS MODE FOCUS:
   - Mode "${analysisMode}": ${
     analysisMode === 'IDENTITY'
       ? 'Prioritize facial structure, hair characteristics, skin details, and intrinsic traits while recording scene state separately.'
       : analysisMode === 'SCENE'
       ? 'Prioritize pose articulation, wardrobe details, held objects, camera perspective, lighting, and environment background.'
       : 'Extract complete, comprehensive visual DNA across all dimensions in a single rigorous analysis pass.'
   }

RETURN ONLY VALID JSON. No markdown code blocks (unless parsed as json), no conversational preamble, no trailing commentary.`;
}

export function buildVisualEvidenceAnalyzerUserPrompt(analysisMode: 'FULL' | 'IDENTITY' | 'SCENE' = 'FULL'): string {
  return `Analyze this reference image in mode "${analysisMode}" and output the exact JSON structure below.

JSON SCHEMA STRUCTURE:
{
  "frame": {
    "orientation": { "status": "VISIBLE"|"PARTIAL"|"INFERRED"|"UNKNOWN", "value": "portrait"|"landscape"|"square"|"unknown" },
    "aspectRatio": { "status": "...", "value": "..." },
    "framing": { "status": "...", "value": "..." },
    "crop": { "status": "...", "value": "..." },
    "headroom": { "status": "...", "value": "..." },
    "sideMargins": { "status": "...", "value": "..." }
  },
  "subject": {
    "count": { "status": "...", "value": 1 },
    "type": { "status": "...", "value": "..." },
    "orientation": { "status": "...", "value": "..." },
    "positionInFrame": { "status": "...", "value": "..." },
    "visibleProportions": { "status": "...", "value": "..." },
    "occlusion": { "status": "...", "value": "..." }
  },
  "identity": {
    "visibleFacialAppearance": { "status": "...", "value": "...", "confidence": 0.0-1.0 },
    "facialProportions": { "status": "...", "value": "...", "confidence": 0.0-1.0 },
    "skinCharacteristics": { "status": "...", "value": "...", "confidence": 0.0-1.0 },
    "hairCharacteristics": { "status": "...", "value": "...", "confidence": 0.0-1.0 },
    "distinguishingTraits": { "status": "...", "value": ["..."], "confidence": 0.0-1.0 }
  },
  "face": {
    "visibility": { "status": "...", "value": "..." },
    "headOrientation": { "status": "...", "value": "..." },
    "eyeAppearance": { "status": "...", "value": "..." },
    "eyebrowAppearance": { "status": "...", "value": "..." },
    "noseAppearance": { "status": "...", "value": "..." },
    "mouthAppearance": { "status": "...", "value": "..." },
    "distinguishingFeatures": { "status": "...", "value": ["..."] }
  },
  "hair": {
    "color": { "status": "...", "value": "..." },
    "length": { "status": "...", "value": "..." },
    "texture": { "status": "...", "value": "..." },
    "density": { "status": "...", "value": "..." },
    "parting": { "status": "...", "value": "..." },
    "hairstyle": { "status": "...", "value": "..." },
    "strandBehavior": { "status": "...", "value": "..." },
    "hairlineVisibility": { "status": "...", "value": "..." }
  },
  "skin": {
    "visibleTone": { "status": "...", "value": "..." },
    "surfaceTexture": { "status": "...", "value": "..." },
    "highlights": { "status": "...", "value": "..." },
    "shadowVariation": { "status": "...", "value": "..." },
    "visibleMarks": { "status": "...", "value": ["..."] },
    "retouchingLevel": { "status": "...", "value": "..." }
  },
  "sceneState": {
    "expression": {
      "eyeState": { "status": "...", "value": "..." },
      "eyebrowState": { "status": "...", "value": "..." },
      "mouthState": { "status": "...", "value": "..." },
      "facialTension": { "status": "...", "value": "..." },
      "gazeDirection": { "status": "...", "value": "..." }
    },
    "pose": {
      "bodyOrientation": { "status": "...", "value": "..." },
      "headOrientation": { "status": "...", "value": "..." },
      "shoulderLine": { "status": "...", "value": "..." },
      "torsoOrientation": { "status": "...", "value": "..." },
      "hipOrientation": { "status": "...", "value": "..." },
      "weightDistribution": { "status": "...", "value": "..." },
      "leftArm": {
        "upperArmDirection": { "status": "...", "value": "..." },
        "elbowState": { "status": "...", "value": "..." },
        "forearmDirection": { "status": "...", "value": "..." },
        "occlusion": { "status": "...", "value": "..." }
      },
      "rightArm": {
        "upperArmDirection": { "status": "...", "value": "..." },
        "elbowState": { "status": "...", "value": "..." },
        "forearmDirection": { "status": "...", "value": "..." },
        "occlusion": { "status": "...", "value": "..." }
      },
      "leftHand": {
        "visibility": { "status": "...", "value": "..." },
        "wristOrientation": { "status": "...", "value": "..." },
        "palmOrientation": { "status": "...", "value": "..." },
        "fingerConfiguration": { "status": "...", "value": "..." },
        "gesture": { "status": "...", "value": "..." },
        "contactTarget": { "status": "...", "value": "..." }
      },
      "rightHand": {
        "visibility": { "status": "...", "value": "..." },
        "wristOrientation": { "status": "...", "value": "..." },
        "palmOrientation": { "status": "...", "value": "..." },
        "fingerConfiguration": { "status": "...", "value": "..." },
        "gesture": { "status": "...", "value": "..." },
        "contactTarget": { "status": "...", "value": "..." }
      },
      "legConfiguration": { "status": "...", "value": "..." }
    },
    "wardrobe": {
      "top": {
        "type": { "status": "...", "value": "..." },
        "color": { "status": "...", "value": "..." },
        "fabricAppearance": { "status": "...", "value": "..." },
        "fit": { "status": "...", "value": "..." },
        "silhouette": { "status": "...", "value": "..." },
        "neckline": { "status": "...", "value": "..." },
        "sleeves": { "status": "...", "value": "..." },
        "seams": { "status": "...", "value": "..." },
        "folds": { "status": "...", "value": "..." },
        "closures": { "status": "...", "value": "..." },
        "patterns": { "status": "...", "value": "..." },
        "printedElements": { "status": "...", "value": ["..."] }
      },
      "bottom": {
        "type": { "status": "...", "value": "..." },
        "color": { "status": "...", "value": "..." },
        "fabricAppearance": { "status": "...", "value": "..." },
        "fit": { "status": "...", "value": "..." },
        "silhouette": { "status": "...", "value": "..." },
        "patterns": { "status": "...", "value": "..." }
      },
      "footwear": {
        "type": { "status": "...", "value": "..." },
        "color": { "status": "...", "value": "..." }
      },
      "otherGarments": []
    },
    "accessories": {
      "jewelry": { "status": "...", "value": ["..."] },
      "eyewear": { "status": "...", "value": "..." },
      "headwear": { "status": "...", "value": "..." },
      "bags": { "status": "...", "value": "..." },
      "belts": { "status": "...", "value": "..." },
      "watches": { "status": "...", "value": "..." },
      "other": { "status": "...", "value": ["..."] }
    },
    "objects": [
      {
        "type": { "status": "...", "value": "..." },
        "color": { "status": "...", "value": "..." },
        "material": { "status": "...", "value": "..." },
        "position": { "status": "...", "value": "..." },
        "scale": { "status": "...", "value": "..." },
        "orientation": { "status": "...", "value": "..." },
        "interactionWithSubject": { "status": "...", "value": "..." },
        "occlusion": { "status": "...", "value": "..." }
      }
    ],
    "background": {
      "type": { "status": "...", "value": "..." },
      "dominantColors": { "status": "...", "value": ["..."] },
      "surfaces": { "status": "...", "value": ["..."] },
      "depth": { "status": "...", "value": "..." },
      "visibleEnvironmentElements": { "status": "...", "value": ["..."] },
      "blur": { "status": "...", "value": "..." },
      "negativeSpace": { "status": "...", "value": "..." }
    },
    "lighting": {
      "lightType": { "status": "...", "value": "natural-looking"|"artificial-looking"|"mixed"|"indeterminate" },
      "softness": { "status": "...", "value": "soft"|"moderately-defined"|"hard"|"mixed" },
      "direction": { "status": "...", "value": "..." },
      "intensity": { "status": "...", "value": "..." },
      "shadows": { "status": "...", "value": "..." },
      "whiteBalance": { "status": "...", "value": "..." },
      "exposureStyle": { "status": "...", "value": "..." }
    },
    "camera": {
      "viewpoint": { "status": "...", "value": "..." },
      "height": { "status": "...", "value": "..." },
      "angle": { "status": "...", "value": "..." },
      "distanceClass": { "status": "...", "value": "..." },
      "perspective": { "status": "...", "value": "..." },
      "depthOfField": { "status": "...", "value": "..." }
    },
    "composition": {
      "subjectPlacement": { "status": "...", "value": "..." },
      "visualBalance": { "status": "...", "value": "..." },
      "foregroundBackgroundRelationship": { "status": "...", "value": "..." },
      "negativeSpace": { "status": "...", "value": "..." },
      "relativeObjectPositions": { "status": "...", "value": "..." },
      "dominantVisualHierarchy": { "status": "...", "value": "..." }
    }
  },
  "branding": {
    "elements": [
      {
        "type": "logo"|"wordmark"|"symbol"|"label"|"product_marking",
        "location": { "status": "...", "value": "..." },
        "description": { "status": "...", "value": "..." },
        "physicallyAttached": true|false
      }
    ]
  },
  "textElements": [
    {
      "type": "overlay_text"|"caption"|"price"|"ui_element"|"watermark"|"physical_text"|"physical_logo"|"packaging_text",
      "content": { "status": "...", "value": "..." },
      "location": { "status": "...", "value": "..." },
      "physicallyAttached": true|false,
      "cleaningDefault": "REMOVE"|"PRESERVE"|"CONTEXT_DEPENDENT"
    }
  ],
  "texture": {
    "skinTexture": { "status": "...", "value": "..." },
    "fabricTexture": { "status": "...", "value": "..." },
    "surfaceTexture": { "status": "...", "value": "..." },
    "gloss": { "status": "...", "value": "..." },
    "matteResponse": { "status": "...", "value": "..." },
    "reflections": { "status": "...", "value": "..." },
    "fineDetail": { "status": "...", "value": "..." }
  },
  "style": {
    "visualTreatment": { "status": "...", "value": "..." },
    "realismLevel": { "status": "...", "value": "..." },
    "photographicVsRendered": { "status": "...", "value": "..." },
    "retouching": { "status": "...", "value": "..." },
    "detailLevel": { "status": "...", "value": "..." },
    "materialPlausibility": { "status": "...", "value": "..." }
  },
  "unknown": ["List of explicitly unobservable, occluded, or out-of-frame elements"]
}`;
}
