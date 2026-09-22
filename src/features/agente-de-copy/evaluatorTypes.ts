export interface SceneEvaluationItem {
    variationId: number;
    score: number;
    strengths: string[];
    warnings: string[];
}

export interface CopyEvaluationResult {
    scene2Ranking: SceneEvaluationItem[];
    scene3Ranking: SceneEvaluationItem[];
    recommendedScene2Id: number;
    recommendedScene3Id: number;
    evaluatedAt?: number;
}

export interface CopyEvaluatorInput {
    variations: Array<{
        id: number;
        scene2: string;
        scene3: string;
    }>;
    productImage?: { dataUrl: string; name?: string } | null;
    productTitle?: string;
    productInfo?: string;
    apiKey?: string;
}
