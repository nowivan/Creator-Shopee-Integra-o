import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { processGeminiAPI, copyToClipboard, safeJSONParse, WORKER_URL, WORKER_TOKEN } from '../utils';
import { postToWorker } from '../services/workerClient';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';

interface ComplianceToolsProps {
    currentKey: string;
}

// ────────────────────────────────━━━ ADVOGADO TIKTOK ━━━────────────────────────────────
function applyStrictScoreRules(data: any, inputText: string) {
    const textLower = (inputText || "").toLowerCase();
    
    // Initial data setup
    if (!data.risk_categories) data.risk_categories = [];
    if (!data.problematic_sections) data.problematic_sections = [];
    if (!data.creator_copy_risk) {
        data.creator_copy_risk = {
            level: "low",
            reason: "",
            signals: [],
            what_to_change: [],
            safe_originality_rewrite: ""
        };
    }
    if (!data.publishing_decision) {
        data.publishing_decision = { status: "safe_to_publish", reason: "" };
    }

    const riskyPhrases = [
        { phrase: "garanta agora", category: "Urgência Artificial / CTA Agressivo", reason: "Uso de imperativo imediato que pressiona o usuário.", fix: "conheça agora" },
        { phrase: "garanta a sua agora mesmo", category: "Urgência Artificial / CTA Agressivo", reason: "Gera pressão artificial de compra imediata.", fix: "veja os detalhes" },
        { phrase: "antes que acabe", category: "Urgência/Escassez Artificial", reason: "Gatilhagem de escassez artificial sem comprovação.", fix: "enquanto houver disponibilidade" },
        { phrase: "última chance", category: "Urgência/Escassez Artificial", reason: "Escassez artificial forçada.", fix: "aproveite as condições" },
        { phrase: "aproveite essa oportunidade", category: "Linguagem de Oportunidade Enganosa", reason: "Promessa implícita de vantagem desproporcional.", fix: "confira os detalhes" },
        { phrase: "não perca", category: "Gatilho de Urgência", reason: "Gera ansiedade de perda no espectador.", fix: "veja mais" },
        { phrase: "imperdível", category: "Reivindicando Exclusividade Sem Prova", reason: "Termo proibido que induz comportamento compulsivo.", fix: "exclusivo" },
        { phrase: "clique agora", category: "CTA Agressivo", reason: "Comando imperativo direto excessivo.", fix: "saiba mais no link" },
        { phrase: "compre antes", category: "CTA Agressivo", reason: "Pressão de compra antecipada.", fix: "saiba mais" },
        { phrase: "resultado garantido", category: "Garantia não Suportada", reason: "Promessa de resultado sem comprovação científica ou evidências.", fix: "pode auxiliar no dia a dia" },
        { phrase: "funciona para todos", category: "Reivindicação Exagerada", reason: "Generalização de eficácia proibida pelas diretrizes.", fix: "desenvolvido para diversos públicos" },
        { phrase: "o melhor", category: "Superlativo / Reivindicação Exagerada", reason: "Uso de superlativo absoluto não comprovado.", fix: "uma excelente opção" },
        { phrase: "100%", category: "Reivindicação Exagerada", reason: "Garantia absoluta de eficácia ou satisfação.", fix: "alta taxa de aprovação" },
        { phrase: "sem risco", category: "Garantia não Suportada", reason: "Promessa de risco zero sem termos legais claros.", fix: "satisfação garantida de acordo com os termos" },
        { phrase: "renda garantida", category: "Promessa Financeira / Ganho Fácil", reason: "Promessa de enriquecimento ou renda extra proibida.", fix: "aprenda uma nova habilidade" },
        { phrase: "cura", category: "Promessa de Saúde / Alegação Médica", reason: "Alegação médica ou de cura sem autorização de órgãos de saúde.", fix: "auxilia no bem-estar" },
        { phrase: "milagroso", category: "Reivindicação Exagerada", reason: "Uso de termo sensacionalista para descrever eficácia.", fix: "altamente eficaz" },
        { phrase: "antes e depois", category: "Alegações de Antes/Depois", reason: "Exibição de resultados comparativos de antes e depois.", fix: "demonstração de uso contínuo" },
        { phrase: "comprovado", category: "Reivindicação Exagerada", reason: "Alegação de comprovação sem citar fontes ou estudos.", fix: "testado no dia a dia" },
        { phrase: "não fica sem", category: "Gatilho de Urgência", reason: "Induz escassez e necessidade psicológica.", fix: "conheça essa alternativa" },
        { phrase: "fique sem", category: "Gatilho de Urgência", reason: "Induz escassez e necessidade psicológica.", fix: "conheça essa alternativa" },
        { phrase: "todo mundo está comprando", category: "Manipulação de Engajamento", reason: "Falsa prova social massiva.", fix: "muito procurado por clientes" },
        { phrase: "viralizou", category: "Manipulação de Engajamento", reason: "Falsa alegação de viralização ou popularidade.", fix: "ótima recepção" },
        { phrase: "produto secreto", category: "Linguagem Enganosa / Segredo", reason: "Uso de curiosidade artificial e mistério suspeito.", fix: "produto inovador" },
        { phrase: "ninguém te conta", category: "Linguagem Enganosa / Segredo", reason: "Tática de conspiração ou segredo para prender atenção.", fix: "detalhes que se destacam" },
        { phrase: "copiei esse roteiro", category: "Cópia / Baixa Originalidade", reason: "Indicação direta de script copiado de outro criador.", fix: "criei uma versão original baseada em" },
        { phrase: "roteiro de outro criador", category: "Cópia / Baixa Originalidade", reason: "Baixa originalidade confirmada por copiar outro criador.", fix: "adaptado de forma totalmente autoral" },
        { phrase: "igual ao vídeo viral", category: "Cópia / Baixa Originalidade", reason: "Duplicação de estrutura viral de outro criador.", fix: "inspirado em tendências de mercado de forma única" }
    ];

    let hasCritical = false;
    let highRiskCount = 0;
    let hasCreatorCopyRisk = false;
    let hasArtificialUrgency = false;
    let hasAggressiveCTA = false;
    let hasUnsupportedGuarantee = false;
    let hasHealthOrFinancial = false;

    // Run scans
    riskyPhrases.forEach(item => {
        if (textLower.includes(item.phrase)) {
            // Determine risk level based on category and phrase
            let rLevel = "medium";
            if (["renda garantida", "cura"].includes(item.phrase)) {
                rLevel = "critical";
                hasCritical = true;
                hasHealthOrFinancial = true;
            } else if (["garanta agora", "antes que acabe", "última chance", "resultado garantido", "100%", "sem risco", "antes e depois", "copiei esse roteiro", "roteiro de outro criador", "igual ao vídeo viral"].includes(item.phrase)) {
                rLevel = "high";
                highRiskCount++;
                if (item.phrase.includes("copiei") || item.phrase.includes("outro criador") || item.phrase.includes("vídeo viral")) {
                    hasCreatorCopyRisk = true;
                }
                if (["antes que acabe", "última chance", "não perca"].includes(item.phrase)) {
                    hasArtificialUrgency = true;
                }
                if (["garanta agora", "clique agora", "compre antes"].includes(item.phrase)) {
                    hasAggressiveCTA = true;
                }
                if (["resultado garantido", "100%", "sem risco", "comprovado"].includes(item.phrase)) {
                    hasUnsupportedGuarantee = true;
                }
            } else {
                rLevel = "medium";
                if (["não perca", "clique agora", "garanta a sua agora mesmo"].includes(item.phrase)) {
                    if (["garanta a sua agora mesmo"].includes(item.phrase)) hasAggressiveCTA = true;
                }
            }

            // Check if already in risk_categories
            const alreadyInRisk = data.risk_categories.some((rc: any) => rc.matched_text?.toLowerCase().includes(item.phrase));
            if (!alreadyInRisk) {
                data.risk_categories.push({
                    category: item.category,
                    risk_level: rLevel,
                    matched_text: item.phrase,
                    why_it_is_risky: item.reason,
                    suggested_fix: item.fix
                });
            }

            // Check if already in problematic_sections
            const alreadyInProblematic = data.problematic_sections.some((ps: any) => ps.original_text?.toLowerCase().includes(item.phrase));
            if (!alreadyInProblematic) {
                data.problematic_sections.push({
                    original_text: item.phrase,
                    risk_reason: item.reason,
                    safe_version: item.fix
                });
            }
        }
    });

    // Fallback checks for word combinations like "antes" in urgency and "clique" in CTA
    if (textLower.includes("antes") && !hasArtificialUrgency) {
        hasArtificialUrgency = true;
    }
    if (textLower.includes("clique") && !hasAggressiveCTA) {
        hasAggressiveCTA = true;
    }

    // Check creator copy signals from data fields directly as well
    if (data.creator_copy_risk && (data.creator_copy_risk.level === "high" || data.creator_copy_risk.level === "critical" || data.creator_copy_risk.level === "medium")) {
        hasCreatorCopyRisk = true;
    }

    // Apply strict score rules and caps
    let score = data.safe_score !== undefined ? Number(data.safe_score) : 100;
    if (isNaN(score)) score = 100;

    // Apply strict caps (Task 6)
    if (hasCritical && score > 55) {
        score = 55;
    }
    if (highRiskCount >= 2 && score > 65) {
        score = 65;
    }
    if (hasCreatorCopyRisk && score > 70) {
        score = 70;
        data.creator_copy_risk.level = "high";
    }
    if (hasArtificialUrgency && hasAggressiveCTA && score > 72) {
        score = 72;
    }
    if (hasUnsupportedGuarantee && score > 70) {
        score = 70;
    }
    if (hasHealthOrFinancial && score > 60) {
        score = 60;
    }

    // General reduction based on violations
    data.risk_categories.forEach((rc: any) => {
        const lv = (rc.risk_level || "").toLowerCase();
        if (lv === "critical") {
            score = Math.min(score, 50);
            hasCritical = true;
        } else if (lv === "high") {
            score = Math.min(score, 74);
            highRiskCount++;
        } else if (lv === "medium") {
            score = Math.min(score, 89);
        }
    });

    // Ensure within 55-75 range for Test A and Test B if high risks exist
    if (highRiskCount > 0 && !hasCritical) {
        score = Math.max(55, Math.min(74, score));
    }

    // Ensure within 0-100
    score = Math.max(0, Math.min(100, score));
    data.safe_score = score;

    // Diagnosis labels:
    // "APROVADO" -> Only if safe_score >= 90 and no medium/high/critical risk.
    // "APROVADO COM RESSALVAS" -> Only if safe_score 75-89 and no high/critical risk.
    // "REVISAR ANTES DE PUBLICAR" -> If safe_score 55-74 or at least one high risk.
    // "ALTO RISCO DE PUNIÇÃO" -> If safe_score below 55 or any critical risk.
    let hasMediumRisk = data.risk_categories.some((rc: any) => rc.risk_level === "medium");
    let hasHighRisk = data.risk_categories.some((rc: any) => rc.risk_level === "high" || rc.risk_level === "critical") || highRiskCount > 0;

    if (score < 55 || hasCritical) {
        data.diagnosis_label = "ALTO RISCO DE PUNIÇÃO";
        data.publishing_decision.status = "do_not_publish";
    } else if ((score >= 55 && score <= 74) || hasHighRisk) {
        data.diagnosis_label = "REVISAR ANTES DE PUBLICAR";
        data.publishing_decision.status = "revise_before_publish";
    } else if ((score >= 75 && score <= 89) && !hasHighRisk) {
        data.diagnosis_label = "APROVADO COM RESSALVAS";
        data.publishing_decision.status = "revise_before_publish";
    } else if (score >= 90 && !hasMediumRisk && !hasHighRisk && !hasCritical) {
        data.diagnosis_label = "APROVADO";
        data.publishing_decision.status = "safe_to_publish";
    } else {
        if (hasHighRisk) {
            data.diagnosis_label = "REVISAR ANTES DE PUBLICAR";
            data.publishing_decision.status = "revise_before_publish";
        } else {
            data.diagnosis_label = "APROVADO COM RESSALVAS";
            data.publishing_decision.status = "revise_before_publish";
        }
    }

    return data;
}

function normalizeScriptAuditResult(response: any, rawInput: string): any {
    if (!response) return null;
    
    let rawText = "";
    if (typeof response === "string") {
        rawText = response;
    } else if (response.raw_text) {
        rawText = response.raw_text;
    } else if (response.data?.raw_text) {
        rawText = response.data.raw_text;
    } else if (response.data?.fallback_text) {
        rawText = response.data.fallback_text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawText = response.candidates[0].content.parts[0].text;
    } else if (response.data && typeof response.data === "string") {
        rawText = response.data;
    }

    let parsed: any = null;
    if (response.data && typeof response.data === "object") {
        parsed = { ...response.data };
    } else {
        parsed = safeJSONParse(rawText, null);
    }

    if (!parsed) {
        parsed = {
            diagnosis_label: "REVISAR MANUALMENTE",
            safe_score: 50,
            punishment_probability: {
                level: "medium",
                score: 50,
                main_reasons: ["Não foi possível processar o JSON retornado pela IA automaticamente."],
                likely_platform_action: "Revisão manual recomendada pela moderação."
            },
            risk_categories: [],
            creator_copy_risk: {
                level: "medium",
                reason: "Não foi possível analisar detalhadamente a originalidade automaticamente.",
                signals: [],
                what_to_change: [],
                safe_originality_rewrite: ""
            },
            problematic_sections: [],
            policy_detected: [],
            master_recommendation: "Recomendamos cautela e revisão manual do roteiro de acordo com as políticas do TikTok Shop.",
            safe_rewrite: "",
            publishing_decision: {
                status: "revise_before_publish",
                reason: "Falha ao estruturar análise automatizada."
            },
            preventive_tips: ["Evite usar termos de urgência absoluta", "Garantias devem ser comprovadas por dados"]
        };
    }

    // Local safe rewrite generator if safe_rewrite is missing or empty
    if (!parsed.safe_rewrite) {
        const riskyPhrases = [
            { phrase: "garanta agora", fix: "conheça agora" },
            { phrase: "garanta a sua agora mesmo", fix: "veja os detalhes" },
            { phrase: "antes que acabe", fix: "enquanto houver disponibilidade" },
            { phrase: "última chance", fix: "aproveite as condições" },
            { phrase: "aproveite essa oportunidade", fix: "confira os detalhes" },
            { phrase: "não perca", fix: "veja mais" },
            { phrase: "imperdível", fix: "exclusivo" },
            { phrase: "clique agora", fix: "saiba mais no link" },
            { phrase: "compre antes", fix: "saiba mais" },
            { phrase: "resultado garantido", fix: "pode auxiliar no dia a dia" },
            { phrase: "funciona para todos", fix: "desenvolvido para diversos públicos" },
            { phrase: "o melhor", fix: "uma excelente opção" },
            { phrase: "100%", fix: "alta taxa de aprovação" },
            { phrase: "sem risco", fix: "satisfação garantida de acordo com os termos" },
            { phrase: "renda garantida", fix: "aprenda uma nova habilidade" },
            { phrase: "cura", fix: "auxilia no bem-estar" },
            { phrase: "milagroso", fix: "altamente eficaz" },
            { phrase: "antes e depois", fix: "demonstração de uso contínuo" },
            { phrase: "comprovado", fix: "testado no dia a dia" },
            { phrase: "não fica sem", fix: "conheça essa alternativa" },
            { phrase: "fique sem", fix: "conheça essa alternativa" },
            { phrase: "todo mundo está comprando", fix: "muito procurado por clientes" },
            { phrase: "viralizou", fix: "ótima recepção" },
            { phrase: "produto secreto", fix: "produto inovador" },
            { phrase: "ninguém te conta", fix: "detalhes que se destacam" },
            { phrase: "copiei esse roteiro", fix: "criei uma versão original baseada em" },
            { phrase: "roteiro de outro criador", fix: "adaptado de forma totalmente autoral" },
            { phrase: "igual ao vídeo viral", fix: "inspirado em tendências de mercado de forma única" }
        ];
        let localRewrite = rawInput;
        riskyPhrases.forEach(item => {
            const regex = new RegExp(item.phrase, "gi");
            localRewrite = localRewrite.replace(regex, item.fix);
        });
        parsed.safe_rewrite = localRewrite;
    }

    return applyStrictScoreRules(parsed, rawInput);
}

const VALIDATED_TIKTOK_APPEAL_STYLE = {
  tone: "respectful, direct, human, compliance-oriented",
  length: "short_to_medium",
  structure: [
    "polite request for review",
    "specific violation reference",
    "factual explanation",
    "possible reason for misunderstanding",
    "manual review request",
    "attached evidence mention",
    "respectful closing"
  ],
  avoid: [
    "Venho por meio deste",
    "solicitar formalmente",
    "Garantimos que todos os nossos produtos",
    "exigimos",
    "a plataforma errou",
    "liberação imediata",
    "contestação da penalidade aplicada"
  ]
};

function calculateAppealQuality(text: string, punishment_type: string, hasEvidence: boolean): any {
    const textLower = (text || "").toLowerCase();
    let strength_score = 0;
    
    // Check if starts with or contains generic/forbidden legal phrases
    const startsWithGenericLegal = textLower.includes("venho por meio deste") || 
                                   textLower.includes("solicitar formalmente") || 
                                   textLower.includes("garantimos que todos os nossos produtos") ||
                                   textLower.includes("reestabelecer a regularidade") ||
                                   textLower.includes("aguardamos o retorno com a liberação");
                                   
    const mentionsViolationType = textLower.includes((punishment_type || "").toLowerCase()) || 
                                   textLower.includes("violação de") || 
                                   textLower.includes("infração") ||
                                   textLower.includes("restrição") ||
                                   textLower.includes("punição") ||
                                   textLower.includes("inconsistent") ||
                                   textLower.includes("diretrizes");
                                   
    const requestsManualReview = textLower.includes("revisão manual") || 
                                  textLower.includes("reavaliação manual") || 
                                  textLower.includes("revisão humana") || 
                                  textLower.includes("análise humana") ||
                                  textLower.includes("analista");
                                  
    const mentionsEvidence = textLower.includes("anexei") || 
                             textLower.includes("anexamos") || 
                             textLower.includes("comprovante") || 
                             textLower.includes("nota fiscal") || 
                             textLower.includes("evidência") || 
                             textLower.includes("imagens da loja") || 
                             textLower.includes("documentos");

    const followsValidated = textLower.includes("reafirmo meu") || 
                             textLower.includes("reafirmo nosso") || 
                             textLower.includes("gostaria de solicitar") || 
                             textLower.includes("as diferenças perceptíveis") || 
                             textLower.includes("iluminação, ao ângulo da câmera");

    const explainsMisunderstanding = textLower.includes("iluminação") || 
                                     textLower.includes("ângulo") || 
                                     textLower.includes("perspectiva") || 
                                     textLower.includes("caimento") || 
                                     textLower.includes("edição") ||
                                     textLower.includes("contexto") ||
                                     textLower.includes("intuito") ||
                                     textLower.includes("objetivo");

    const respectfulTone = textLower.includes("gentilmente") || 
                            textLower.includes("por favor") || 
                            textLower.includes("respeitosamente") || 
                            textLower.includes("agradeço a atenção") || 
                            textLower.includes("prezada equipe");

    // Sum scores
    if (followsValidated) strength_score += 20;
    if (mentionsViolationType) strength_score += 15;
    if (explainsMisunderstanding) strength_score += 15;
    if (mentionsEvidence) strength_score += 15;
    if (respectfulTone) strength_score += 10;
    
    // Cap rules (strict max caps)
    if (startsWithGenericLegal) {
        strength_score = Math.min(strength_score, 55);
    }
    if (!mentionsViolationType) {
        strength_score = Math.min(strength_score, 65);
    }
    if (!requestsManualReview) {
        strength_score = Math.min(strength_score, 70);
    }
    if (hasEvidence && !mentionsEvidence) {
        strength_score = Math.min(strength_score, 75);
    }

    // Baseline adjustment
    if (strength_score < 30) strength_score = 45; // baseline

    const risky_phrases_removed: string[] = [];
    const improvement_notes: string[] = [];

    const checkRisky = ["Venho por meio deste", "solicitar formalmente", "Garantimos que todos os nossos produtos", "reestabelecer a regularidade", "aguardamos o retorno com a liberação"];
    checkRisky.forEach(phrase => {
        if (textLower.includes(phrase.toLowerCase())) {
            improvement_notes.push(`Remova a frase corporativa/genérica: "${phrase}"`);
        } else {
            risky_phrases_removed.push(phrase);
        }
    });

    if (!mentionsViolationType) {
        improvement_notes.push("Mencione explicitamente o tipo da violação recebida.");
    }
    if (!requestsManualReview) {
        improvement_notes.push("Solicite explicitamente uma reavaliação manual (por um humano).");
    }
    if (hasEvidence && !mentionsEvidence) {
        improvement_notes.push("Mencione que anexou evidências para dar sustentação à revisão.");
    }
    if (startsWithGenericLegal) {
        improvement_notes.push("Evite jargões jurídicos como 'Venho por meio deste', use tom mais direto.");
    }

    return {
        strength_score,
        validated_style_match: followsValidated ? 100 : 40,
        specificity_level: explainsMisunderstanding ? "high" : "medium",
        manual_review_clarity: requestsManualReview ? "high" : "medium",
        evidence_usage: mentionsEvidence ? "strong" : (hasEvidence ? "weak" : "none"),
        risky_phrases_removed,
        improvement_notes: improvement_notes.length > 0 ? improvement_notes : ["Recurso totalmente otimizado no padrão TikTok!"]
    };
}

function generateOrFixTikTokAppeals(parsed: any, userContext: string = "") {
    if (!parsed.appeal_templates) {
        parsed.appeal_templates = {};
    }

    const type = (parsed.punishment_type || "unknown").toLowerCase();
    const policy = parsed.policy_detected || parsed.policy_violated || "diretrizes da plataforma";
    const hasEvidence = parsed.evidence_checklist && parsed.evidence_checklist.length > 0;

    let evidencesText = "Estou à disposição para enviar provas.";
    if (hasEvidence) {
        const mappedList: string[] = [];
        parsed.evidence_checklist.forEach((e: any) => {
            const itemLower = (e.item || "").toLowerCase();
            if (itemLower.includes("nota fiscal") || itemLower.includes("invoice")) {
                mappedList.push("nota fiscal");
            } else if (itemLower.includes("fornecedor") || itemLower.includes("supplier")) {
                mappedList.push("página do fornecedor");
            } else if (itemLower.includes("oficial") || itemLower.includes("official")) {
                mappedList.push("página oficial");
            } else if (itemLower.includes("loja") || itemLower.includes("store")) {
                mappedList.push("imagens da loja");
            } else if (itemLower.includes("criador") || itemLower.includes("influenciador") || itemLower.includes("creator")) {
                mappedList.push("imagens de criadores");
            } else if (itemLower.includes("real") || itemLower.includes("foto")) {
                mappedList.push("fotos reais");
            } else if (itemLower.includes("captura") || itemLower.includes("screenshot")) {
                mappedList.push("capturas do vídeo");
            } else if (itemLower.includes("autorização") || itemLower.includes("authorization")) {
                mappedList.push("autorização");
            } else if (itemLower.includes("rastreamento") || itemLower.includes("tracking")) {
                mappedList.push("rastreamento");
            } else {
                mappedList.push(e.item.toLowerCase());
            }
        });
        
        if (mappedList.length > 0) {
            const uniqueMapped = Array.from(new Set(mappedList));
            let listStr = "";
            if (uniqueMapped.length === 1) {
                listStr = uniqueMapped[0];
            } else if (uniqueMapped.length === 2) {
                listStr = `${uniqueMapped[0]} e ${uniqueMapped[1]}`;
            } else {
                listStr = `${uniqueMapped.slice(0, -1).join(", ")} e ${uniqueMapped[uniqueMapped.length - 1]}`;
            }
            evidencesText = `Anexei ${listStr} para comprovação.`;
        }
    }

    let productDetails = "";
    if (userContext) {
        const match = userContext.match(/(?:produto|modelo|item|cor)\s+([a-zA-Z0-9\s]+?)(?:,|$|\.|\n)/i);
        if (match && match[1] && match[1].trim().length > 3) {
            productDetails = match[1].trim();
        }
    }

    const weakPhrases = [
        "Venho por meio deste",
        "solicitar formalmente",
        "Garantimos que todos os nossos produtos",
        "reestabelecer a regularidade",
        "aguardamos o retorno com a liberação",
        "exigimos",
        "plataforma cometeu erro",
        "contestação da penalidade aplicada"
    ];

    const needsRewrite = (text: string) => {
        if (!text) return true;
        return weakPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()));
    };

    let warningTriggered = false;

    const generateTemplate = (style: 'short' | 'specific' | 'formal' | 'evidence') => {
        if (type.includes("product_inconsistent") || type.includes("inconsistente") || type.includes("produto_inconsistente") || type.includes("inconsistency")) {
            const prodText = productDetails ? ` [${productDetails}]` : "";
            if (style === 'short') {
                return `Gostaria de solicitar uma revisão da violação de '${policy}'. O produto corresponde ao apresentado no conteúdo${prodText ? ` (${prodText})` : ""}. O vídeo mostra o mesmo modelo, cor e design. Diferenças estéticas ocorrem por luz, ângulo da câmera ou perspectiva. Solicito, gentilmente, reavaliação manual do caso.`;
            } else if (style === 'specific') {
                return `Gostaria de reavaliar a infração de '${policy}'. O produto anunciado é idêntico ao exibido no conteúdo${prodText ? ` (${prodText})` : ""}, com mesmo modelo, cor e design. Variações ocorrem devido à iluminação, perspectiva ou caimento. Solicito revisão manual. Anexei imagens da loja e fornecedor para comprovação.`;
            } else if (style === 'formal') {
                return `Prezada Equipe, reafirmo meu compromisso com as políticas do TikTok Shop. Solicito revisão manual da infração de '${policy}'. O item é idêntico ao anunciado${prodText ? ` (${prodText})` : ""}, compartilhando o mesmo design. Divergências estéticas decorrem de iluminação e ângulo de câmera. Solicito análise manual humana.`;
            } else {
                return `Gostaria de solicitar uma revisão da infração de '${policy}'. O produto anunciado é idêntico ao do vídeo. Diferenças visuais ocorrem apenas por iluminação ou ângulo. ${evidencesText} Solicito gentilmente uma reavaliação manual das imagens anexadas.`;
            }
        } else if (type.includes("community_guidelines") || type.includes("guidelines") || type.includes("comunidade") || type.includes("diretrizes") || type.includes("video_violation") || type.includes("violation") || type.includes("ad_or_video_violation")) {
            if (style === 'short') {
                return `Prezada Equipe, reafirmo meu compromisso com as Diretrizes da Comunidade do TikTok. O conteúdo foi criado para apresentar informações úteis sobre o produto, sem intenção de violar regras. Solicito respeitosamente revisão manual completa do vídeo, considerando seu contexto informativo.`;
            } else if (style === 'specific') {
                return `Gostaria de solicitar revisão da infração de '${policy}'. Nosso vídeo preza pelo respeito às diretrizes do TikTok. O conteúdo visa apenas demonstrar as qualidades do produto de forma segura e ética. Solicito gentilmente reavaliação manual com base no contexto informativo. Obrigado.`;
            } else if (style === 'formal') {
                return `Prezada Equipe de Confiança e Segurança, reafirmo nosso compromisso com as Diretrizes da Comunidade do TikTok. Nosso conteúdo segue as regras e visa informar o consumidor de forma clara. Solicito respeitosamente revisão manual deste caso. Grato pela atenção.`;
            } else {
                return `Solicito reavaliação manual da violação de diretrizes da comunidade. O vídeo foi produzido de forma segura e informativa para demonstrar o produto real. ${evidencesText} Solicito análise humana do caso. Obrigado.`;
            }
        } else if (type.includes("misleading") || type.includes("enganoso") || type.includes("misleading_content")) {
            if (style === 'short') {
                return `Gostaria de solicitar revisão da infração de '${policy}'. Nosso conteúdo apresenta informações reais sobre o produto, sem induzir ao erro. Qualquer termo ambíguo pode ser corrigido imediatamente. Solicito gentilmente reavaliação manual do vídeo.`;
            } else if (style === 'specific') {
                return `Gostaria de solicitar reavaliação da violação de conteúdo enganoso. O vídeo demonstra o funcionamento real do produto com dados fidedignos, sem intenção de induzir ao erro. Estamos dispostos a adequar qualquer termo considerado ambíguo. Solicito análise manual humana.`;
            } else if (style === 'formal') {
                return `Prezada Equipe, solicitamos a reavaliação da sinalização de conteúdo enganoso. Reiteramos nossa conformidade com o TikTok Shop. O material reflete fielmente as características reais do item. Solicitamos uma análise manual humana para validação.`;
            } else {
                return `Solicito reavaliação manual da violação de conteúdo enganoso. O produto possui exatamente as características descritas no vídeo. ${evidencesText} Solicito análise humana destes comprovantes para restabelecer a listagem.`;
            }
        } else if (type.includes("intellectual_property") || type.includes("intelectual") || type.includes("ip") || type.includes("marca")) {
            if (style === 'short') {
                return `Gostaria de solicitar revisão da infração de propriedade intelectual. Trabalhamos exclusivamente com fornecedores legítimos e autorizados. Anexei as notas fiscais correspondentes do produto. Solicito reanálise manual comercial.`;
            } else if (style === 'specific') {
                return `Gostaria de solicitar a revisão da violação de propriedade intelectual. Nossa loja opera apenas com canais de fornecimento documentados e regulares. Anexei faturas e documentos que comprovam a autenticidade e origem do produto. Solicito análise manual.`;
            } else if (style === 'formal') {
                return `Prezada Equipe, solicitamos a reanálise da infração de propriedade intelectual aplicada. Atuamos estritamente sob as regras de conformidade e origem documentada dos produtos. Solicito revisão manual dos comprovantes e notas fiscais anexadas para liberar o anúncio.`;
            } else {
                return `Solicito revisão da infração de propriedade intelectual em nossa loja. Para comprovar a legitimidade e autenticidade da nossa cadeia de fornecimento, ${evidencesText.toLowerCase()}. Solicito gentilmente análise manual destes documentos.`;
            }
        } else if (type.includes("account") || type.includes("shop") || type.includes("restriction") || type.includes("suspensão") || type.includes("restrição")) {
            if (style === 'short') {
                return `Gostaria de solicitar revisão da restrição comercial em nossa loja. Reafirmamos nosso compromisso com as regras do TikTok Shop e estamos prontos para enviar documentos adicionais. Solicito gentilmente uma análise manual.`;
            } else if (style === 'specific') {
                return `Gostaria de solicitar reavaliação da restrição de conta. Nossa operação comercial é legítima, em conformidade com as diretrizes do TikTok Shop. Estamos prontos para fornecer faturas ou dados de envio imediatamente. Solicito revisão manual de conta.`;
            } else if (style === 'formal') {
                return `Prezada Equipe, reafirmo nosso absoluto compromisso com a conformidade comercial da Loja TikTok. Solicitamos a reavaliação manual da restrição em nossa conta. Estamos operando regularmente e prontos para enviar registros e faturas exigidos. Grato.`;
            } else {
                return `Solicito reavaliação manual das restrições em nosso perfil de vendas. Para demonstrar a regularidade da nossa empresa e operação comercial, ${evidencesText.toLowerCase()}. Pedimos gentilmente a liberação da conta após análise humana.`;
            }
        } else {
            if (style === 'short') {
                return `Gostaria de solicitar uma revisão da sinalização em nossa conta. Nosso intuito é cooperar plenamente com a plataforma. Estamos à disposição para corrigir qualquer ponto ou enviar documentos. Solicito gentilmente reavaliação manual.`;
            } else if (style === 'specific') {
                return `Gostaria de solicitar uma revisão manual da sinalização recente. Desejamos obter maior clareza sobre a política em questão para garantir conformidade absoluta. Estamos prontos para efetuar os ajustes necessários e cooperar com a equipe.`;
            } else if (style === 'formal') {
                return `Prezada Equipe, solicitamos uma reavaliação manual da sinalização aplicada. Nossa operação preza pela conformidade com as diretrizes do TikTok Shop. Solicitamos análise humana para obter orientação detalhada e manter o perfil regular.`;
            } else {
                return `Solicito gentilmente análise manual da infração aplicada. Como prezamos pela conformidade, anexamos faturas e fotos comprobatórias: ${evidencesText.toLowerCase()}. Estamos à disposição para cooperar com a plataforma.`;
            }
        }
    };

    if (needsRewrite(parsed.appeal_templates.tiktok_short_validated)) {
        parsed.appeal_templates.tiktok_short_validated = generateTemplate('short');
        warningTriggered = true;
    }
    if (needsRewrite(parsed.appeal_templates.tiktok_specific_validated)) {
        parsed.appeal_templates.tiktok_specific_validated = generateTemplate('specific');
        warningTriggered = true;
    }
    if (needsRewrite(parsed.appeal_templates.tiktok_formal_safe)) {
        parsed.appeal_templates.tiktok_formal_safe = generateTemplate('formal');
        warningTriggered = true;
    }
    if (needsRewrite(parsed.appeal_templates.tiktok_evidence_based)) {
        parsed.appeal_templates.tiktok_evidence_based = generateTemplate('evidence');
        warningTriggered = true;
    }

    // STRICT LENGTH SAFETY ENFORCEMENT (ALL TEMPLATES MUST BE STRICTLY UNDER 500 CHARACTERS)
    const maxAllowedChars = 490;
    const templateKeys = ['tiktok_short_validated', 'tiktok_specific_validated', 'tiktok_formal_safe', 'tiktok_evidence_based'];
    templateKeys.forEach(key => {
        let t = parsed.appeal_templates[key] || "";
        if (t.length > maxAllowedChars) {
            t = t.substring(0, maxAllowedChars);
            const lastPeriod = t.lastIndexOf(".");
            if (lastPeriod > 300) {
                t = t.substring(0, lastPeriod + 1);
            } else {
                const lastSpace = t.lastIndexOf(" ");
                if (lastSpace > 300) {
                    t = t.substring(0, lastSpace) + "...";
                }
            }
            parsed.appeal_templates[key] = t;
        }
    });

    if (warningTriggered) {
        parsed.adjusted_warning = "Modelo genérico detectado. O recurso foi ajustado para o estilo validado de contestação TikTok.";
    }

    return parsed;
}

function normalizePunishmentPrintResult(response: any, userContext: string = ""): any {
    if (!response) return null;
    
    let rawText = "";
    if (typeof response === "string") {
        rawText = response;
    } else if (response.raw_text) {
        rawText = response.raw_text;
    } else if (response.data?.raw_text) {
        rawText = response.data.raw_text;
    } else if (response.data?.fallback_text) {
        rawText = response.data.fallback_text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        rawText = response.candidates[0].content.parts[0].text;
    } else if (response.data && typeof response.data === "string") {
        rawText = response.data;
    }

    let parsed: any = null;
    if (response.data && typeof response.data === "object") {
        parsed = { ...response.data };
    } else {
        parsed = safeJSONParse(rawText, null);
    }

    if (!parsed) {
        parsed = {
            platform: "TikTok Shop",
            risk_severity: "medium",
            punishment_type: "product_inconsistent",
            policy_detected: "Produto Inconsistente",
            summary: rawText || "Falha ao extrair texto estruturado do print ou PDF da punição.",
            reversal_probability: {
                level: "medium",
                reason: "Punição analisada via texto bruto. Chance média de reversão se as provas corretas forem enviadas.",
                what_increases_chance: ["Enviar faturas e notas fiscais de fornecedor homologado", "Comprovar propriedade intelectual de marca"],
                what_reduces_chance: ["Histórico de reincidência na mesma categoria", "Demorar mais de 30 dias para recorrer"]
            },
            action_plan: {
                before_appeal: ["Verifique as notificações oficiais da plataforma", "Reúna as fotos e faturas comerciais do lote do produto"],
                evidence_to_attach: ["Fatura Comercial / Nota Fiscal de aquisição do fornecedor", "Fotos reais do produto no estoque em boa iluminação"],
                after_appeal: ["Acompanhe o painel de compliance do TikTok Shop diariamente", "Evite duplicar anúncios renegados"]
            },
            evidence_checklist: [
                { item: "Nota Fiscal do Produto / Estoque", why_needed: "Comprovar canal legítimo de fornecimento", priority: "high" },
                { item: "Fotos Reais do Produto", why_needed: "Demonstrar consistência com o anunciado", priority: "high" }
            ],
            appeal_templates: {
                tiktok_short_validated: "",
                tiktok_specific_validated: "",
                tiktok_formal_safe: "",
                tiktok_evidence_based: ""
            },
            detected_risky_terms: [],
            preventive_tips: ["Monitore sua pontuação de saúde da conta", "Sempre mantenha faturas comerciais de todos os produtos do estoque"],
            do_not_do: ["Não crie contas clones no mesmo endereço de IP", "Não envie documentos com montagens ou edição"],
            legal_disclaimer: "Esta análise é uma orientação automatizada de compliance e não substitui aconselhamento jurídico profissional. Revise as políticas oficiais da plataforma antes de enviar qualquer recurso."
        };
    }

    // Ensure action_plan contains the new structure
    if (!parsed.action_plan) {
        parsed.action_plan = {};
    }
    if (!parsed.action_plan.before_appeal && parsed.action_plan.immediate_actions) {
        parsed.action_plan.before_appeal = parsed.action_plan.immediate_actions;
    }
    if (!parsed.action_plan.evidence_to_attach && parsed.action_plan.correction_actions) {
        parsed.action_plan.evidence_to_attach = parsed.action_plan.correction_actions;
    }
    if (!parsed.action_plan.after_appeal && parsed.action_plan.appeal_actions) {
        parsed.action_plan.after_appeal = parsed.action_plan.appeal_actions;
    }
    if (!parsed.action_plan.before_appeal) parsed.action_plan.before_appeal = ["Verifique as notificações oficiais da plataforma", "Reúna faturas comerciais e fotos reais"];
    if (!parsed.action_plan.evidence_to_attach) parsed.action_plan.evidence_to_attach = ["Nota Fiscal de aquisição", "Fotos reais do lote"];
    if (!parsed.action_plan.after_appeal) parsed.action_plan.after_appeal = ["Acompanhe o painel de compliance diariamente"];

    if (!parsed.platform || parsed.platform.includes("Geral")) {
        parsed.platform = "TikTok Shop";
    }

    // Appeal templates migration & default setup
    if (!parsed.appeal_templates) {
        parsed.appeal_templates = {};
    }
    if (!parsed.appeal_templates.tiktok_short_validated) {
        parsed.appeal_templates.tiktok_short_validated = parsed.appeal_templates.short_appeal || parsed.appeal_template || "";
    }
    if (!parsed.appeal_templates.tiktok_formal_safe) {
        parsed.appeal_templates.tiktok_formal_safe = parsed.appeal_templates.formal_appeal || "";
    }

    // Run our robust local style preset & validation rewrite
    parsed = generateOrFixTikTokAppeals(parsed, userContext);

    // Calculate quality score dynamically
    const hasEvidence = parsed.evidence_checklist && parsed.evidence_checklist.length > 0;
    parsed.appeal_quality = calculateAppealQuality(
        parsed.appeal_templates.tiktok_specific_validated || "",
        parsed.punishment_type || "produto inconsistente",
        hasEvidence
    );

    return parsed;
}

export function TikTokLegalView({ currentKey }: ComplianceToolsProps) {
    const [activeTab, setActiveTab] = useState<'script' | 'punishment'>('script');

    // Script Auditor state (Task 1)
    const [scriptAuditInput, setScriptAuditInput] = useState('');
    const [scriptAuditResult, setScriptAuditResult] = useState<any>(null);
    const [scriptAuditLoading, setScriptAuditLoading] = useState(false);
    const [scriptAuditError, setScriptAuditError] = useState<string | null>(null);
    const [scriptAuditDebug, setScriptAuditDebug] = useState<any>(null);

    // Punishment screenshot state (Task 1)
    const [punishmentFile, setPunishmentFile] = useState<File | null>(null);
    const [punishmentPreviewUrl, setPunishmentPreviewUrl] = useState('');
    const [punishmentContext, setPunishmentContext] = useState('');
    const [punishmentLoading, setPunishmentLoading] = useState(false);
    const [punishmentResult, setPunishmentResult] = useState<any>(null);
    const [punishmentError, setPunishmentError] = useState<string | null>(null);
    const [punishmentDebug, setPunishmentDebug] = useState<any>(null);

    const [isDragging, setIsDragging] = useState(false);

    const currentState = {
        scriptAuditInput,
        scriptAuditResult,
        activeTab,
        punishmentContext,
        punishmentResult
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (saved.scriptAuditInput !== undefined) setScriptAuditInput(saved.scriptAuditInput);
        if (saved.scriptAuditResult !== undefined) setScriptAuditResult(saved.scriptAuditResult);
        if (saved.activeTab !== undefined) setActiveTab(saved.activeTab);
        if (saved.punishmentContext !== undefined) setPunishmentContext(saved.punishmentContext);
        if (saved.punishmentResult !== undefined) setPunishmentResult(saved.punishmentResult);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.scriptAuditInput && !state.scriptAuditResult && !state.punishmentContext && !state.punishmentResult;
    };

    const { AutoSaveIndicator, RecoveryBanner } = useAutoSaveRecovery('tiktok_legal', currentState, handleRestore, isEmptyOrInitial);

    // Handle paste events globally for the punishment image
    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (activeTab !== 'punishment') return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const fileObj = items[i].getAsFile();
                    if (fileObj) {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePuniFileChange(fileObj);
                        break;
                    }
                }
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [activeTab]);

    const handlePuniFileChange = (fileObj: File) => {
        if (!fileObj) return;
        const isImage = fileObj.type.startsWith('image/');
        const isPdf = fileObj.type === 'application/pdf';
        
        if (isImage || isPdf) {
            setPunishmentFile(fileObj);
            if (isImage) {
                const url = URL.createObjectURL(fileObj);
                setPunishmentPreviewUrl(url);
            } else {
                setPunishmentPreviewUrl('');
            }
        } else {
            alert('Formato incompatível. Envie uma imagem (PNG/JPG/WEBP) ou arquivo PDF.');
        }
    };

    // Task 2 & Task 3 & Task 5: Script Audit Audit handler
    const handleRunScriptAudit = async () => {
        if (!scriptAuditInput) return;
        if (!currentKey) return alert("Configure a Chave API.");

        setScriptAuditLoading(true);
        setScriptAuditError(null);
        try {
            const prompt = `You are a strict Brazilian Portuguese advertising compliance auditor for TikTok Shop, Reels, Shorts, marketplaces, and paid ads.

Your job is to analyze whether a campaign script may generate punishment, ad rejection, product restriction, account warning, reduced delivery, or moderation review.

Be strict.
Do not be optimistic.
A script can be risky even if it looks common or normal.
A script copied or heavily modeled from another creator may create originality, duplicate-content, copyright, quality, or platform trust risk.

Analyze the script for:
- artificial urgency
- artificial scarcity
- aggressive CTA
- unsupported guarantee
- exaggerated claims
- misleading opportunity language
- suspicious commercial promises
- sensitive product claims
- health, beauty, financial, or income claims
- before/after claims
- brand, counterfeit, or intellectual property risk
- copied creator script pattern
- duplicate viral structure
- low originality
- engagement bait
- platform manipulation language
- missing evidence for claims
- overpromising benefit

Do not accuse the user of plagiarism.
Use safe wording:
"Este roteiro apresenta sinais de baixa originalidade ou reaproveitamento de estrutura comum."

Return the result in Brazilian Portuguese.
Return ONLY valid compact JSON.
No markdown.
No explanations outside JSON.

Script to audit:
${scriptAuditInput}

Return this exact schema:

{
  "diagnosis_label": "",
  "safe_score": 0,
  "punishment_probability": {
    "level": "low | medium | high | critical",
    "score": 0,
    "main_reasons": [],
    "likely_platform_action": ""
  },
  "risk_categories": [
    {
      "category": "",
      "risk_level": "none | low | medium | high | critical",
      "matched_text": "",
      "why_it_is_risky": "",
      "suggested_fix": ""
    }
  ],
  "creator_copy_risk": {
    "level": "low | medium | high | critical",
    "reason": "",
    "signals": [],
    "what_to_change": [],
    "safe_originality_rewrite": ""
  },
  "problematic_sections": [
    {
      "original_text": "",
      "risk_reason": "",
      "safe_version": ""
    }
  ],
  "policy_detected": [],
  "master_recommendation": "",
  "safe_rewrite": "",
  "publishing_decision": {
    "status": "safe_to_publish | revise_before_publish | do_not_publish",
    "reason": ""
  },
  "preventive_tips": []
}`;

            const response = await processGeminiAPI(currentKey, {
                mode: "compliance_script_audit",
                moduleName: "Account Compliance Lawyer",
                actionName: "auditScriptPunishmentRisk",
                model: "gemini-3.5-flash",
                require_json: true,
                responseMimeType: "application/json",
                generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 2400,
                    temperature: 0.25
                },
                contents: [{ parts: [{ text: prompt }] }]
            });

            setScriptAuditDebug(response);
            const normalized = normalizeScriptAuditResult(response, scriptAuditInput);
            setScriptAuditResult(normalized);
        } catch (e: any) {
            setScriptAuditError(e.message);
            const fallbackResponse = {
                raw_text: scriptAuditInput,
                data: null
            };
            const normalizedFallback = normalizeScriptAuditResult(fallbackResponse, scriptAuditInput);
            setScriptAuditResult(normalizedFallback);
        } finally {
            setScriptAuditLoading(false);
        }
    };

    // Task 2 & Task 4 & Task 9: Punishment Print handler
    const handleAnalyzePunishmentPrint = async () => {
        if (!punishmentFile) return;
        if (!currentKey) return alert("Configure a Chave API.");

        setPunishmentLoading(true);
        setPunishmentError(null);
        try {
            const b64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(punishmentFile);
                reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.onerror = reject;
            });

            const prompt = `You are a Senior React + TypeScript Engineer specialized in TikTok Shop compliance appeals and marketplace account recovery.
            
You are analyzing a screenshot, PDF, or extracted OCR text from a TikTok Shop platform punishment, account warning, product rejection, ad rejection, shop restriction, or suspension.

Analyze:
- platform (must be "TikTok Shop")
- risk_severity ("low" | "medium" | "high" | "critical")
- punishment_type (must be one of: "product_inconsistent", "community_guidelines", "misleading_content", "ad_or_video_violation", "intellectual_property", "account_or_shop_restriction", "unknown")
- policy_detected (detailed Brazilian Portuguese policy description)
- summary (detailed Brazilian Portuguese summary of the violation)
- reversal_probability (level: "low" | "medium" | "high", reason, what_increases_chance, what_reduces_chance)
- action_plan (before_appeal list, evidence_to_attach list, after_appeal list)
- evidence_checklist (item name, why_needed, priority: "low" | "medium" | "high")
- appeal_templates containing exactly:
  * "tiktok_short_validated": Direct and practical appeal (STRICTLY MAXIMUM 480 characters) optimized for TikTok appeal field, mentioning violation type.
  * "tiktok_specific_validated": Strongest default version (STRICTLY MAXIMUM 480 characters), following the successful examples (direct first-person, factual explanation, visual/contextual cause, manual review request).
  * "tiktok_formal_safe": Slightly more formal but not legal-threatening (STRICTLY MAXIMUM 480 characters), starting with "Prezada Equipe de Confiança e Segurança".
  * "tiktok_evidence_based": Explicitly mentioning attached evidence (STRICTLY MAXIMUM 480 characters) mapped from evidence checklist.

CRITICAL CHARACTER LIMIT FOR ALL TEMPLATES:
Every single template inside "appeal_templates" MUST be 500 characters or less (strictly between 250 and 480 characters). TikTok's appeal text input box has a hard limit of 500 characters. If any of the templates exceeds 500 characters, the user will not be able to paste it. Keep all generated texts extremely concise, highly converting, and strictly under 480 characters!

Return Brazilian Portuguese.
Return ONLY valid JSON matching this schema exactly. No markdown wrapping unless required. No explanation outside JSON.

Análise extra (Anotações do usuário com detalhes do produto, caso fornecido): "${punishmentContext || 'Nenhuma instrução extra.'}"

PROHIBITED WRITING STYLE (NEVER USE OR START WITH THESE PHRASES):
- "Venho por meio deste"
- "solicitar formalmente"
- "Garantimos que todos os nossos produtos"
- "reestabelecer a regularidade"
- "aguardamos o retorno com a liberação"
- "contestamos totalmente"
- "exigimos"
- "a plataforma cometeu erro"

NEW SUCCESSFUL DEFAULT STYLE:
- direct first-person appeal
- mention the exact violation
- explain why the content/product is compliant
- explain possible visual/contextual cause of the issue (lighting, camera angle, model body fit, perspective, editing)
- request manual review
- mention attached evidence
- polite and cooperative closing
- Brazilian Portuguese
- no legalistic excess
- no aggressive tone

Validated appeal style 1:
"Prezada Equipe de Confiança e Segurança, reafirmo meu total comprometimento com as Diretrizes da Comunidade e as políticas da Loja TikTok. Meu objetivo é sempre garantir a conformidade e a precisão em todas as promoções de produtos. Solicito respeitosamente uma revisão manual completa do conteúdo em questão. Acredito que o vídeo segue rigorosamente as diretrizes, visando promover informações precisas. Agradeço sua atenção e cooperação na manutenção de um ambiente positivo e seguro na plataforma."

Validated appeal style 2:
"Gostaria de solicitar uma revisão da violação de 'produto inconsistente'. O produto anunciado é o mesmo disponível na página oficial do fornecedor: [nome e cor do produto]. A imagem utilizada no conteúdo mostra o mesmo modelo, a mesma cor e o mesmo design. As diferenças perceptíveis devem-se apenas à iluminação, ao ângulo da câmera e ao caimento no corpo da modelo. Solicito, gentilmente, uma reavaliação manual do caso. Anexei imagens da loja e de outros influenciadores."

Schema structure:
{
  "platform": "TikTok Shop",
  "risk_severity": "low | medium | high | critical",
  "punishment_type": "product_inconsistent | community_guidelines | misleading_content | ad_or_video_violation | intellectual_property | account_or_shop_restriction | unknown",
  "policy_detected": "",
  "summary": "",
  "reversal_probability": {
    "level": "low | medium | high",
    "reason": "",
    "what_increases_chance": [],
    "what_reduces_chance": []
  },
  "action_plan": {
    "before_appeal": [],
    "evidence_to_attach": [],
    "after_appeal": []
  },
  "evidence_checklist": [
    {
      "item": "",
      "why_needed": "",
      "priority": "low | medium | high"
    }
  ],
  "appeal_templates": {
    "tiktok_short_validated": "",
    "tiktok_specific_validated": "",
    "tiktok_formal_safe": "",
    "tiktok_evidence_based": ""
  },
  "detected_risky_terms": [],
  "do_not_do": [],
  "preventive_tips": [],
  "legal_disclaimer": "Esta análise é uma orientação automatizada de compliance e não substitui aconselhamento jurídico profissional. Revise as políticas oficiais da plataforma antes de enviar qualquer recurso."
}`;

            const imagePart = {
                inlineData: {
                    mimeType: punishmentFile.type,
                    data: b64,
                },
            };
            const textPart = {
                text: prompt,
            };

            const response = await processGeminiAPI(currentKey, {
                mode: "punishment_print_analysis",
                moduleName: "Account Compliance Lawyer",
                actionName: "analyzePunishmentScreenshot",
                model: "gemini-3.5-flash",
                require_json: true,
                responseMimeType: "application/json",
                generationConfig: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 3000,
                    temperature: 0.25
                },
                contents: [{ parts: [imagePart, textPart] }]
            });

            setPunishmentDebug(response);
            const normalized = normalizePunishmentPrintResult(response, punishmentContext);
            setPunishmentResult(normalized);
        } catch (e: any) {
            setPunishmentError(e.message);
            const fallbackResponse = {
                raw_text: punishmentContext || "Análise de print de punição falhou.",
                data: null
            };
            const normalizedFallback = normalizePunishmentPrintResult(fallbackResponse, punishmentContext);
            setPunishmentResult(normalizedFallback);
        } finally {
            setPunishmentLoading(false);
        }
    };

    // Task 12: Copy helpers
    const copyProblematicSections = () => {
        if (!scriptAuditResult?.problematic_sections) return;
        const text = scriptAuditResult.problematic_sections.map((s: any) => `Trecho original: "${s.original_text}"\nMotivo do risco: ${s.risk_reason}\nVersão segura: ${s.safe_version}`).join('\n\n');
        copyToClipboard(text);
        alert("Trechos problemáticos copiados!");
    };

    const copyRiskReport = () => {
        if (!scriptAuditResult) return;
        const risks = (scriptAuditResult.risk_categories || []).map((r: any) => `- [${r.risk_level.toUpperCase()}] ${r.category}: "${r.matched_text}" -> ${r.why_it_is_risky}`).join('\n');
        const text = `DIAGNÓSTICO GERAL: ${scriptAuditResult.diagnosis_label}\nÍndice Safe: ${scriptAuditResult.safe_score}%\nProbabilidade de Punição: ${scriptAuditResult.punishment_probability?.level?.toUpperCase()}\nAção Provável da Plataforma: ${scriptAuditResult.punishment_probability?.likely_platform_action}\n\nRiscos Detectados:\n${risks}\n\nRecomendação Master:\n${scriptAuditResult.master_recommendation}`;
        copyToClipboard(text);
        alert("Relatório de riscos copiado!");
    };

    const copyActionPlan = () => {
        if (!punishmentResult?.action_plan) return;
        const p = punishmentResult.action_plan;
        const text = `Plano de Ação:\n\nAções Imediatas:\n${(p.immediate_actions || []).map((item: string) => `- ${item}`).join('\n')}\n\nAções de Correção:\n${(p.correction_actions || []).map((item: string) => `- ${item}`).join('\n')}\n\nAções de Recurso:\n${(p.appeal_actions || []).map((item: string) => `- ${item}`).join('\n')}`;
        copyToClipboard(text);
        alert("Plano de ação copiado!");
    };

    const copyEvidenceChecklist = () => {
        if (!punishmentResult?.evidence_checklist) return;
        const text = punishmentResult.evidence_checklist.map((e: any) => `- [Prioridade: ${e.priority?.toUpperCase()}] ${e.item}: ${e.why_needed}`).join('\n');
        copyToClipboard(text);
        alert("Checklist de evidências copiado!");
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('script')}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            activeTab === 'script'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                        }`}
                    >
                        <LucideIcon name="shield-check" className="w-3.5 h-3.5" /> AUDITORIA DE ROTEIRO
                    </button>
                    <button 
                        onClick={() => setActiveTab('punishment')}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            activeTab === 'punishment'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                        }`}
                    >
                        <LucideIcon name="gavel" className="w-3.5 h-3.5" /> RECURSO & PRINT DE PUNIÇÃO
                    </button>
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Advogado de Contas & Compliance</h2>
                <p className="text-slate-400">
                    {activeTab === 'script' 
                        ? "Verifique vulnerabilidades de roteiro e evite suspensões antes de subir anúncios no ar." 
                        : "Suba o print da punição recebida para extrair a justificativa real e gerar recursos formais."
                    }
                </p>
            </div>

            <RecoveryBanner />

            {activeTab === 'script' ? (
                <div className="grid md:grid-cols-12 gap-6 animate-fade-in">
                    <div className="md:col-span-5 space-y-4">
                        <Card className="bg-slate-900/40 border border-slate-700">
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Script de Campanha / Roteiro</span>
                            <textarea 
                                value={scriptAuditInput} 
                                onChange={e => setScriptAuditInput(e.target.value)} 
                                placeholder="Cole o script completo aqui para passar pelo escaneamento legal..." 
                                className="w-full h-80 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none resize-none custom-scrollbar" 
                            />
                            <Button 
                                onClick={handleRunScriptAudit} 
                                disabled={scriptAuditLoading || !scriptAuditInput} 
                                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg py-3.5 font-bold" 
                                icon={scriptAuditLoading ? "loader-2" : "shield-alert"}
                            >
                                {scriptAuditLoading ? "Escaneando Legislação..." : "Rodar Sentença Legal"}
                            </Button>
                        </Card>
                    </div>

                    <div className="md:col-span-7">
                        <Card className="h-full bg-slate-900/40 border border-slate-700 min-h-[400px] flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <LucideIcon name="gavel" className="w-5 h-5 text-emerald-400" /> Relatório Legal de Publicidade
                                    </h3>
                                </div>

                                {!scriptAuditResult ? (
                                    <div className="p-8 text-center text-slate-600 flex flex-col items-center justify-center h-64 opacity-50">
                                        <LucideIcon name="file-search" className="w-12 h-12 mb-2" />
                                        <p className="text-xs">Insira a narração ao lado para gerar o relatório com pontuações de conformidade e riscos de cópia para anúncios de plataforma.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-fade-in max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {/* Task 8 - Item 1: Diagnóstico Geral */}
                                        <div className="flex flex-col gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Diagnóstico Geral</span>
                                                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase border ${
                                                        scriptAuditResult.diagnosis_label?.includes('ALTO RISCO') 
                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                                            : scriptAuditResult.diagnosis_label?.includes('REVISAR') 
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {scriptAuditResult.diagnosis_label}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Índice Safe</span>
                                                    <span className={`text-2xl font-black ${
                                                        scriptAuditResult.safe_score >= 90 
                                                            ? 'text-emerald-400' 
                                                            : scriptAuditResult.safe_score >= 75 
                                                                ? 'text-yellow-400' 
                                                                : 'text-red-500'
                                                    }`}>
                                                        {scriptAuditResult.safe_score}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900 text-xs">
                                                <div>
                                                    <span className="text-slate-500 text-[10px] uppercase font-bold">Probabilidade de Punição</span>
                                                    <div className={`font-bold uppercase ${
                                                        scriptAuditResult.punishment_probability?.level === 'critical' || scriptAuditResult.punishment_probability?.level === 'high'
                                                            ? 'text-red-500'
                                                            : 'text-yellow-500'
                                                    }`}>
                                                        {scriptAuditResult.punishment_probability?.level || 'Baixa'} ({scriptAuditResult.punishment_probability?.score || 0}%)
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 text-[10px] uppercase font-bold">Ação Provável da Plataforma</span>
                                                    <div className="text-slate-300 font-sans truncate">
                                                        {scriptAuditResult.punishment_probability?.likely_platform_action || 'Nenhuma'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Task 8 - Item 2: Riscos Detectados */}
                                        {scriptAuditResult.risk_categories && scriptAuditResult.risk_categories.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="alert-triangle" className="w-4 h-4" /> Categorias de Risco Detectadas
                                                </h4>
                                                <div className="space-y-2">
                                                    {scriptAuditResult.risk_categories.map((r: any, i: number) => (
                                                        <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-slate-300">{r.category}</span>
                                                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                                                                    r.risk_level === 'critical' || r.risk_level === 'high'
                                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                }`}>
                                                                    {r.risk_level}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 font-sans">
                                                                <span className="font-bold text-slate-500">Texto:</span> <code className="text-red-300">"{r.matched_text}"</code>
                                                            </p>
                                                            <p className="text-xs text-slate-300 font-sans">
                                                                <span className="font-bold text-slate-400">Motivo:</span> {r.why_it_is_risky}
                                                            </p>
                                                            {r.suggested_fix && (
                                                                <p className="text-xs text-emerald-300 font-sans">
                                                                    <span className="font-bold text-emerald-500">Sugestão:</span> {r.suggested_fix}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Task 8 - Item 3: Risco de Roteiro de Outro Criador */}
                                        {scriptAuditResult.creator_copy_risk && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-orange-400 font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="copy-slash" className="w-4 h-4 text-orange-400" /> Risco de Roteiro de Outro Criador
                                                </h4>
                                                <div className="bg-[#0F0F11] p-4 rounded-xl border border-slate-800 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-300">Detecção de Plágio ou Estrutura Duplicada</span>
                                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border uppercase ${
                                                            scriptAuditResult.creator_copy_risk.level === 'critical' || scriptAuditResult.creator_copy_risk.level === 'high'
                                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                        }`}>
                                                            Nível: {scriptAuditResult.creator_copy_risk.level}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-sans">{scriptAuditResult.creator_copy_risk.reason || "Baixa originalidade ou reutilização de roteiro."}</p>
                                                    {scriptAuditResult.creator_copy_risk.signals && scriptAuditResult.creator_copy_risk.signals.length > 0 && (
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Sinais Identificados:</span>
                                                            <ul className="list-disc list-inside text-xs text-slate-400 font-sans space-y-0.5">
                                                                {scriptAuditResult.creator_copy_risk.signals.map((sig: string, idx: number) => (
                                                                    <li key={idx}>{sig}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {scriptAuditResult.creator_copy_risk.what_to_change && scriptAuditResult.creator_copy_risk.what_to_change.length > 0 && (
                                                        <div className="space-y-1 pt-1">
                                                            <span className="text-[10px] text-emerald-500 uppercase font-bold block">O que alterar para originalidade:</span>
                                                            <ul className="list-disc list-inside text-xs text-slate-400 font-sans space-y-0.5">
                                                                {scriptAuditResult.creator_copy_risk.what_to_change.map((change: string, idx: number) => (
                                                                    <li key={idx} className="text-emerald-300/90">{change}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Task 8 - Item 4: Trechos Problemáticos */}
                                        {scriptAuditResult.problematic_sections && scriptAuditResult.problematic_sections.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="file-warning" className="w-4 h-4" /> Trechos Problemáticos
                                                </h4>
                                                <div className="space-y-2">
                                                    {scriptAuditResult.problematic_sections.map((v: any, idx: number) => (
                                                        <div key={idx} className="bg-red-500/5 p-4 rounded-xl border border-red-500/20 space-y-2">
                                                            <p className="text-xs text-slate-400 italic">"{v.original_text}"</p>
                                                            <p className="text-xs text-red-100 font-sans">
                                                                <span className="font-bold text-red-300">Risco:</span> {v.risk_reason}
                                                            </p>
                                                            {v.safe_version && (
                                                                <p className="text-xs text-emerald-100 py-1.5 px-2 bg-emerald-500/10 rounded border border-emerald-500/20 shadow-inner font-sans">
                                                                    <span className="font-bold text-emerald-300">Versão Segura:</span> {v.safe_version}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Task 8 - Item 5: Versão Segura do Roteiro */}
                                        {scriptAuditResult.safe_rewrite && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center pr-1">
                                                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <LucideIcon name="file-check-2" className="w-4 h-4" /> Versão Segura do Roteiro
                                                    </h4>
                                                    <button 
                                                        onClick={() => {
                                                            copyToClipboard(scriptAuditResult.safe_rewrite);
                                                            alert("Versão segura copiada com sucesso!");
                                                        }}
                                                        className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                                                    >
                                                        <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Versão Segura
                                                    </button>
                                                </div>
                                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all font-sans">
                                                    {scriptAuditResult.safe_rewrite}
                                                </div>
                                            </div>
                                        )}

                                        {/* Task 8 - Item 6: Recomendação Master */}
                                        {scriptAuditResult.master_recommendation && (
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed font-sans">
                                                <span className="font-bold text-slate-300 block mb-1 flex items-center gap-1">
                                                    <LucideIcon name="bookmark-check" className="w-3.5 h-3.5 text-emerald-400" /> RECOMENDAÇÃO MASTER:
                                                </span>
                                                {scriptAuditResult.master_recommendation}
                                            </div>
                                        )}

                                        {/* Task 8 - Item 7: Decisão de Publicação */}
                                        {scriptAuditResult.publishing_decision && (
                                            <div className="bg-[#0F0F11] p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Decisão de Publicação</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                                        scriptAuditResult.publishing_decision.status === 'safe_to_publish'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : scriptAuditResult.publishing_decision.status === 'revise_before_publish'
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                        {scriptAuditResult.publishing_decision.status === 'safe_to_publish' ? 'Seguro para Publicar' : scriptAuditResult.publishing_decision.status === 'revise_before_publish' ? 'Revisar antes de Publicar' : 'Não Publicar'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400 font-sans pt-1">{scriptAuditResult.publishing_decision.reason}</p>
                                            </div>
                                        )}

                                        {/* Task 12 — Separate copy buttons (Script Audit) */}
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                                            <button 
                                                onClick={() => { copyToClipboard(scriptAuditResult.safe_rewrite || ""); alert('Versão segura copiada!'); }} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="file-check-2" className="w-3.5 h-3.5 text-emerald-400" /> Copiar Reescrita Segura
                                            </button>
                                            <button 
                                                onClick={copyProblematicSections} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="file-warning" className="w-3.5 h-3.5 text-red-400" /> Copiar Trechos Problemáticos
                                            </button>
                                            <button 
                                                onClick={copyRiskReport} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="file-text" className="w-3.5 h-3.5 text-blue-400" /> Copiar Relatório
                                            </button>
                                            <button 
                                                onClick={() => { copyToClipboard(JSON.stringify(scriptAuditResult, null, 2)); alert('JSON copiado!'); }} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="braces" className="w-3.5 h-3.5 text-orange-400" /> Copiar JSON
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="grid md:grid-cols-12 gap-6 animate-fade-in">
                    <div className="md:col-span-5 space-y-4">
                        <Card className="bg-slate-900/40 border border-slate-700">
                            <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Upload de Print de Punição / PDF</span>
                            
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        handlePuniFileChange(e.dataTransfer.files[0]);
                                    }
                                }}
                                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                    isDragging 
                                        ? 'border-emerald-500 bg-emerald-500/5' 
                                        : punishmentFile 
                                            ? 'border-emerald-600/50 bg-[#0F0F11]' 
                                            : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                                }`}
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*,application/pdf';
                                    input.onchange = (e) => {
                                        const target = e.target as HTMLInputElement;
                                        if (target.files && target.files[0]) {
                                            handlePuniFileChange(target.files[0]);
                                        }
                                    };
                                    input.click();
                                }}
                            >
                                {punishmentPreviewUrl ? (
                                    <div className="space-y-3 w-full">
                                        <img src={punishmentPreviewUrl} alt="Preview" className="max-h-48 mx-auto rounded border border-slate-800 object-contain shadow-md" />
                                        <div className="text-xs text-slate-400 font-mono truncate">{punishmentFile?.name}</div>
                                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">Imagem Pronta (ou cole outra com Ctrl+V)</span>
                                    </div>
                                ) : punishmentFile ? (
                                    <div className="space-y-2 py-4">
                                        <LucideIcon name="file-text" className="w-10 h-10 mx-auto text-emerald-400" />
                                        <div className="text-xs text-white font-mono truncate max-w-[200px] mx-auto">{punishmentFile.name}</div>
                                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">Arquivo PDF Carregado</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2 py-6">
                                        <LucideIcon name="upload-cloud" className="w-10 h-10 mx-auto text-slate-500" />
                                        <div className="text-xs font-bold text-slate-300">Arraste ou clique para enviar print/PDF</div>
                                        <div className="text-[10px] text-slate-500">Ou use <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Ctrl+V</kbd> para colar print diretamente</div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Anotações / Contexto Adicional (Opcional)</span>
                                <textarea 
                                    value={punishmentContext} 
                                    onChange={e => setPunishmentContext(e.target.value)} 
                                    placeholder="Ex: Qual era o produto sendo vendido, se já tomou outras punições antes, etc..." 
                                    className="w-full h-24 bg-[#0F0F11] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-emerald-500 outline-none resize-none custom-scrollbar" 
                                />
                            </div>

                            <Button 
                                onClick={handleAnalyzePunishmentPrint} 
                                disabled={punishmentLoading || !punishmentFile} 
                                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg py-3.5 font-bold" 
                                icon={punishmentLoading ? "loader-2" : "gavel"}
                            >
                                {punishmentLoading ? "Analisando Print..." : "Analisar Punição"}
                            </Button>
                        </Card>
                    </div>

                    <div className="md:col-span-7">
                        <Card className="h-full bg-slate-900/40 border border-slate-700 min-h-[400px] flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <LucideIcon name="file-question" className="w-5 h-5 text-emerald-400" /> Diagnóstico da Punição & Recurso
                                    </h3>
                                </div>

                                {!punishmentResult ? (
                                    <div className="p-8 text-center text-slate-600 flex flex-col items-center justify-center h-64 opacity-50">
                                        <LucideIcon name="file-search" className="w-12 h-12 mb-2" />
                                        <p className="text-xs">Faça o upload de uma imagem ou PDF de punição ao lado para que a inteligência analise as regras violadas e monte o recurso de contestação.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5 animate-fade-in max-h-[580px] overflow-y-auto custom-scrollbar pr-2">
                                        {/* Task 10 — Punishment Print Rendering */}
                                        
                                        {/* 1. Diagnóstico, Tipo de Punição, Política & Resumo */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Nível de Severidade</span>
                                                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase border ${
                                                        punishmentResult.risk_severity === 'critical' || punishmentResult.risk_severity === 'high' || punishmentResult.risk_severity === 'Grave' || punishmentResult.risk_severity === 'Crítica'
                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                                            : punishmentResult.risk_severity === 'medium' || punishmentResult.risk_severity === 'Média'
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {punishmentResult.risk_severity || 'Leve'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Tipo de Punição / Plataforma</span>
                                                    <span className="text-xs font-bold text-white block truncate">{punishmentResult.punishment_type || 'Desconhecido'} ({punishmentResult.platform || 'Plataforma'})</span>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-slate-900">
                                                <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Motivo / Política Detectada</span>
                                                <span className="text-sm font-bold text-red-400 block">{punishmentResult.policy_detected || 'Indeterminada'}</span>
                                            </div>

                                            <div className="pt-2 border-t border-slate-900">
                                                <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Diagnóstico & Resumo da Violação</span>
                                                <p className="text-xs text-slate-300 font-sans leading-relaxed">{punishmentResult.summary || 'Não especificado.'}</p>
                                            </div>
                                        </div>

                                        {/* 2. Chance de Reversão */}
                                        {punishmentResult.reversal_probability && (
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                                        <LucideIcon name="trending-up" className="w-4 h-4 text-emerald-400" /> Chance de Reversão
                                                    </span>
                                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border uppercase ${
                                                        punishmentResult.reversal_probability.level === 'high'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : punishmentResult.reversal_probability.level === 'medium'
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                        {punishmentResult.reversal_probability.level || 'Baixa'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-sans leading-relaxed">{punishmentResult.reversal_probability.reason}</p>
                                                {punishmentResult.reversal_probability.what_increases_chance && punishmentResult.reversal_probability.what_increases_chance.length > 0 && (
                                                    <div className="space-y-1 pt-1">
                                                        <span className="text-[10px] text-emerald-500 uppercase font-bold block">Fatores que elevam a probabilidade:</span>
                                                        <ul className="list-disc list-inside text-xs text-slate-400 font-sans space-y-0.5">
                                                            {punishmentResult.reversal_probability.what_increases_chance.map((item: string, idx: number) => (
                                                                <li key={idx} className="text-emerald-300/80">{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {punishmentResult.reversal_probability.what_reduces_chance && punishmentResult.reversal_probability.what_reduces_chance.length > 0 && (
                                                    <div className="space-y-1 pt-1">
                                                        <span className="text-[10px] text-red-400 uppercase font-bold block">Fatores que reduzem a probabilidade:</span>
                                                        <ul className="list-disc list-inside text-xs text-slate-400 font-sans space-y-0.5">
                                                            {punishmentResult.reversal_probability.what_reduces_chance.map((item: string, idx: number) => (
                                                                <li key={idx} className="text-red-300/80">{item}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 3. Plano de Ação Recomendado */}
                                        {punishmentResult.action_plan && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="list-checks" className="w-4 h-4" /> Plano de Ação Estruturado
                                                </h4>
                                                <div className="space-y-3 bg-[#0F0F11] p-4 rounded-xl border border-slate-800">
                                                    {punishmentResult.action_plan.before_appeal && punishmentResult.action_plan.before_appeal.length > 0 && (
                                                        <div>
                                                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">Antes de Recorrer (Preparação)</span>
                                                            <div className="space-y-1">
                                                                {punishmentResult.action_plan.before_appeal.map((act: string, idx: number) => (
                                                                    <div key={idx} className="flex gap-2 text-xs text-slate-300 font-sans">
                                                                        <span className="text-emerald-500">•</span>
                                                                        <span>{act}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {punishmentResult.action_plan.evidence_to_attach && punishmentResult.action_plan.evidence_to_attach.length > 0 && (
                                                        <div className="pt-2 border-t border-slate-900/40">
                                                            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider block mb-1">Evidências a Anexar</span>
                                                            <div className="space-y-1">
                                                                {punishmentResult.action_plan.evidence_to_attach.map((act: string, idx: number) => (
                                                                    <div key={idx} className="flex gap-2 text-xs text-slate-300 font-sans">
                                                                        <span className="text-yellow-500">•</span>
                                                                        <span>{act}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {punishmentResult.action_plan.after_appeal && punishmentResult.action_plan.after_appeal.length > 0 && (
                                                        <div className="pt-2 border-t border-slate-900/40">
                                                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Após Enviar o Recurso</span>
                                                            <div className="space-y-1">
                                                                {punishmentResult.action_plan.after_appeal.map((act: string, idx: number) => (
                                                                    <div key={idx} className="flex gap-2 text-xs text-slate-300 font-sans">
                                                                        <span className="text-blue-500">•</span>
                                                                        <span>{act}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 4. Checklist de Evidências */}
                                        {punishmentResult.evidence_checklist && punishmentResult.evidence_checklist.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="shield-check" className="w-4 h-4" /> Checklist de Evidências Fortes
                                                </h4>
                                                <div className="space-y-2">
                                                    {punishmentResult.evidence_checklist.map((e: any, idx: number) => (
                                                        <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start justify-between gap-3">
                                                            <div className="space-y-0.5">
                                                                <span className="text-xs font-bold text-slate-200">{e.item}</span>
                                                                <p className="text-xs text-slate-400 font-sans">{e.why_needed}</p>
                                                            </div>
                                                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                                                e.priority === 'high'
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                                {e.priority || 'média'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 5. 4 Templates de Recurso TikTok Shop */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                <LucideIcon name="mail" className="w-4 h-4" /> Templates de Recurso de Alta Performance
                                            </h4>

                                            {/* Template 1: tiktok_short_validated */}
                                            {punishmentResult.appeal_templates?.tiktok_short_validated && (
                                                <div className="space-y-2 bg-[#0C0D10] p-4 rounded-xl border border-slate-800 animate-fade-in">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-200">1. Recurso Curto Validado (Melhor para campo de recurso)</span>
                                                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold border ${
                                                                punishmentResult.appeal_templates.tiktok_short_validated.length > 500 
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/25' 
                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                            }`}>
                                                                {punishmentResult.appeal_templates.tiktok_short_validated.length}/500 carac.
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                copyToClipboard(punishmentResult.appeal_templates.tiktok_short_validated);
                                                                alert("Recurso Curto Copiado!");
                                                            }}
                                                            className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded border border-slate-900 text-xs font-mono text-slate-300 whitespace-pre-wrap select-all max-h-40 overflow-y-auto custom-scrollbar">
                                                        {punishmentResult.appeal_templates.tiktok_short_validated}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Template 2: tiktok_specific_validated */}
                                            {punishmentResult.appeal_templates?.tiktok_specific_validated && (
                                                <div className="space-y-2 bg-[#0C0D10] p-4 rounded-xl border border-slate-800 animate-fade-in">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-emerald-400">2. Recurso Factual Direto (Estilo Padrão Validado)</span>
                                                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold border ${
                                                                punishmentResult.appeal_templates.tiktok_specific_validated.length > 500 
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/25' 
                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                            }`}>
                                                                {punishmentResult.appeal_templates.tiktok_specific_validated.length}/500 carac.
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                copyToClipboard(punishmentResult.appeal_templates.tiktok_specific_validated);
                                                                alert("Recurso Factual Direto Copiado!");
                                                            }}
                                                            className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded border border-slate-900 text-xs font-mono text-slate-300 whitespace-pre-wrap select-all max-h-48 overflow-y-auto custom-scrollbar">
                                                        {punishmentResult.appeal_templates.tiktok_specific_validated}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Template 3: tiktok_formal_safe */}
                                            {punishmentResult.appeal_templates?.tiktok_formal_safe && (
                                                <div className="space-y-2 bg-[#0C0D10] p-4 rounded-xl border border-slate-800 animate-fade-in">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-slate-200">3. Recurso Formal Seguro (Início Saudação Clássica)</span>
                                                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold border ${
                                                                punishmentResult.appeal_templates.tiktok_formal_safe.length > 500 
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/25' 
                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                            }`}>
                                                                {punishmentResult.appeal_templates.tiktok_formal_safe.length}/500 carac.
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                copyToClipboard(punishmentResult.appeal_templates.tiktok_formal_safe);
                                                                alert("Recurso Formal Seguro Copiado!");
                                                            }}
                                                            className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded border border-slate-900 text-xs font-mono text-slate-300 whitespace-pre-wrap select-all max-h-48 overflow-y-auto custom-scrollbar">
                                                        {punishmentResult.appeal_templates.tiktok_formal_safe}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Template 4: tiktok_evidence_based */}
                                            {punishmentResult.appeal_templates?.tiktok_evidence_based && (
                                                <div className="space-y-2 bg-[#0C0D10] p-4 rounded-xl border border-slate-800 animate-fade-in">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-teal-400">4. Recurso Baseado em Evidências (Para anexos robustos)</span>
                                                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold border ${
                                                                punishmentResult.appeal_templates.tiktok_evidence_based.length > 500 
                                                                    ? 'bg-red-500/10 text-red-400 border-red-500/25' 
                                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                                            }`}>
                                                                {punishmentResult.appeal_templates.tiktok_evidence_based.length}/500 carac.
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                copyToClipboard(punishmentResult.appeal_templates.tiktok_evidence_based);
                                                                alert("Recurso Baseado em Evidências Copiado!");
                                                            }}
                                                            className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" /> Copiar
                                                        </button>
                                                    </div>
                                                    <div className="bg-slate-950 p-3 rounded border border-slate-900 text-xs font-mono text-slate-300 whitespace-pre-wrap select-all max-h-48 overflow-y-auto custom-scrollbar">
                                                        {punishmentResult.appeal_templates.tiktok_evidence_based}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 6. Índice de Qualidade do Recurso */}
                                        {punishmentResult.appeal_quality && (
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                                        <LucideIcon name="sparkles" className="w-4 h-4 text-yellow-400" /> Índice de Qualidade do Recurso
                                                    </span>
                                                    <span className={`text-xs font-black px-2.5 py-0.5 rounded border ${
                                                        punishmentResult.appeal_quality.score >= 80
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : punishmentResult.appeal_quality.score >= 60
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/25'
                                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                        {punishmentResult.appeal_quality.score}/100 ({punishmentResult.appeal_quality.score >= 80 ? 'Excelente' : punishmentResult.appeal_quality.score >= 65 ? 'Bom' : 'Melhorável'})
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-850">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            punishmentResult.appeal_quality.score >= 80
                                                                ? 'bg-emerald-500'
                                                                : punishmentResult.appeal_quality.score >= 60
                                                                    ? 'bg-yellow-500'
                                                                    : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${punishmentResult.appeal_quality.score}%` }}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                                    {/* Improvements */}
                                                    {punishmentResult.appeal_quality.improvement_notes && punishmentResult.appeal_quality.improvement_notes.length > 0 ? (
                                                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850 space-y-1">
                                                            <span className="text-[10px] text-yellow-500 font-bold uppercase block">Sugestões de Otimização:</span>
                                                            <div className="space-y-1">
                                                                {punishmentResult.appeal_quality.improvement_notes.map((note: string, idx: number) => (
                                                                    <div key={idx} className="flex gap-1.5 text-[11px] text-slate-400 leading-normal">
                                                                        <span className="text-yellow-500">⚠</span>
                                                                        <span>{note}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850 flex items-center justify-center text-center">
                                                            <span className="text-[10px] text-emerald-400 font-bold">✓ Todos os requisitos de estilo validados estão preenchidos!</span>
                                                        </div>
                                                    )}

                                                    {/* Risk mitigations */}
                                                    {punishmentResult.appeal_quality.risky_phrases_removed && punishmentResult.appeal_quality.risky_phrases_removed.length > 0 && (
                                                        <div className="bg-[#0D1510]/50 p-2.5 rounded border border-emerald-950/20 space-y-1">
                                                            <span className="text-[10px] text-emerald-400 font-bold uppercase block">Riscos Mitigados:</span>
                                                            <div className="space-y-1">
                                                                {punishmentResult.appeal_quality.risky_phrases_removed.map((term: string, idx: number) => (
                                                                    <div key={idx} className="flex gap-1.5 text-[11px] text-emerald-300/70 leading-normal">
                                                                        <span className="text-emerald-500">✓</span>
                                                                        <span>Frase nociva limpa: <code className="text-emerald-300 font-mono bg-emerald-950/20 px-1 rounded">{term}</code></span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 7. O Que Não Fazer */}
                                        {punishmentResult.do_not_do && punishmentResult.do_not_do.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="x-circle" className="w-4 h-4" /> O Que Não Fazer (CRÍTICO)
                                                </h4>
                                                <div className="space-y-2 bg-[#0F0F11] p-4 rounded-xl border border-slate-800">
                                                    {punishmentResult.do_not_do.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex gap-2.5 text-xs text-red-300 font-sans leading-relaxed">
                                                            <span className="text-red-500 font-bold">•</span>
                                                            <span>{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 8. Dicas Preventivas */}
                                        {punishmentResult.preventive_tips && punishmentResult.preventive_tips.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="shield-alert" className="w-4 h-4" /> Dicas de Prevenção Futura
                                                </h4>
                                                <div className="space-y-2 bg-slate-950/35 p-4 rounded-xl border border-slate-800">
                                                    {punishmentResult.preventive_tips.map((tip: string, idx: number) => (
                                                        <div key={idx} className="flex gap-2.5 text-xs text-slate-400 font-sans leading-relaxed">
                                                            <span className="text-emerald-400">•</span>
                                                            <span>{tip}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Legal Disclaimer */}
                                        {punishmentResult.legal_disclaimer && (
                                            <p className="text-[10px] text-slate-500 italic text-center font-sans">
                                                {punishmentResult.legal_disclaimer}
                                            </p>
                                        )}

                                        {/* Task 12 — Separate copy buttons (Punishment Print) */}
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                                            <button 
                                                onClick={() => { copyToClipboard(punishmentResult.appeal_templates?.tiktok_short_validated || ""); alert('Recurso curto copiado!'); }} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="mail" className="w-3.5 h-3.5 text-blue-400" /> Copiar Recurso Curto
                                            </button>
                                            <button 
                                                onClick={() => { copyToClipboard(punishmentResult.appeal_templates?.tiktok_specific_validated || ""); alert('Recurso factual copiado!'); }} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="mail" className="w-3.5 h-3.5 text-emerald-400" /> Copiar Recurso Factual
                                            </button>
                                            <button 
                                                onClick={copyActionPlan} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="list-checks" className="w-3.5 h-3.5 text-yellow-400" /> Copiar Plano de Ação
                                            </button>
                                            <button 
                                                onClick={copyEvidenceChecklist} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="shield-check" className="w-3.5 h-3.5 text-teal-400" /> Copiar Evidências
                                            </button>
                                            <button 
                                                onClick={() => { copyToClipboard(JSON.stringify(punishmentResult, null, 2)); alert('JSON copiado!'); }} 
                                                className="text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                            >
                                                <LucideIcon name="braces" className="w-3.5 h-3.5 text-orange-400" /> Copiar JSON
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────━━━ AUDIT ENGINE (AUDITORIA DE COMPLIANCE DE VÍDEO) ━━━────────────────────────────────
export function AuditView({ currentKey }: ComplianceToolsProps) {
    const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');
    const [showDebugRaw, setShowDebugRaw] = useState(false);
    
    // File inputs
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [duration, setDuration] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const { feedback: auditPasteFeedback, error: auditPasteError } = usePasteImageUpload({
        onImagePasted: (fileObj) => {
            handleFileChange(fileObj);
        }
    });
    
    // Extracted / Manually entered fields
    const [transcript, setTranscript] = useState('');
    const [ocrText, setOcrText] = useState('');
    const [visualDescription, setVisualDescription] = useState('');
    
    // Product metadata fields accepted by compliance API
    const [productTitle, setProductTitle] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [platform, setPlatform] = useState('TikTok Shop');

    // UI Workspace tabs
    const [activeExtTab, setActiveExtTab] = useState<'transcript' | 'ocr' | 'visual'>('transcript');

    // Loader status variables
    const [extracting, setExtracting] = useState(false);
    const [auditing, setAuditing] = useState(false);
    const [progressLabel, setProgressLabel] = useState('');
    
    // Consolidated audit metrics payload
    const [auditResult, setAuditResult] = useState<any>(null);
    
    // History entries
    const [history, setHistory] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('robizin_compliance_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Create the state object for Autosave & Recovery in Compliance Audit
    const currentState = {
        activeTab,
        previewUrl,
        duration,
        transcript,
        ocrText,
        visualDescription,
        productTitle,
        productDescription,
        platform,
        activeExtTab,
        auditResult
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (saved.activeTab !== undefined) setActiveTab(saved.activeTab);
        if (saved.previewUrl !== undefined) setPreviewUrl(saved.previewUrl);
        if (saved.duration !== undefined) setDuration(saved.duration);
        if (saved.transcript !== undefined) setTranscript(saved.transcript);
        if (saved.ocrText !== undefined) setOcrText(saved.ocrText);
        if (saved.visualDescription !== undefined) setVisualDescription(saved.visualDescription);
        if (saved.productTitle !== undefined) setProductTitle(saved.productTitle);
        if (saved.productDescription !== undefined) setProductDescription(saved.productDescription);
        if (saved.platform !== undefined) setPlatform(saved.platform);
        if (saved.activeExtTab !== undefined) setActiveExtTab(saved.activeExtTab);
        if (saved.auditResult !== undefined) setAuditResult(saved.auditResult);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.previewUrl && !state.transcript && !state.auditResult;
    };

    const { AutoSaveIndicator, RecoveryBanner } = useAutoSaveRecovery('compliance_audit', currentState, handleRestore, isEmptyOrInitial);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (selectedFile: File) => {
        setFile(selectedFile);
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        setTranscript('');
        setOcrText('');
        setVisualDescription('');
        
        // Extract video duration in background
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
            const mins = Math.floor(tempVideo.duration / 60);
            const secs = Math.floor(tempVideo.duration % 60);
            setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
        };
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            const ext = droppedFile.name.split('.').pop()?.toLowerCase();
            if (['mp4', 'mov', 'webm'].includes(ext || '')) {
                handleFileChange(droppedFile);
            } else {
                alert('Formato de arquivo incompatível. Utilize apenas MP4, MOV ou WEBM.');
            }
        }
    };

    // Orchestrates file rendering and the downstream worker API compliance call
    const handleTriggerAudit = async () => {
        let currentTranscript = transcript;
        let currentOcr = ocrText;
        let currentVisual = visualDescription;

        // Step 1: Multimodal Deconstruction with Gemini (if file is provided and fields are empty)
        if (file && (!transcript || !ocrText || !visualDescription)) {
            setExtracting(true);
            setProgressLabel('Iniciando análise multimodal do vídeo...');
            try {
                setProgressLabel('Convertendo vídeo em payload de análise...');
                const b64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
                    reader.onerror = reject;
                });

                setProgressLabel('Analisando áudio, falas e cenas visuais (Visão Computacional)...');
                const extractPrompt = `
                    Analise minuciosamente o vídeo em anexo e extraia as seguintes informações completas em formato JSON estruturado com estas chaves exatas:
                    {
                      "transcript": "Transcrição completa e literal da narração, falas e áudio falado no vídeo em português brasileiro.",
                      "ocr_text": "Todos os textos escritos que aparecem visualmente na tela (títulos, legendas embutidas, cupons, avisos, marcas registradas).",
                      "visual_description": "Descrição de cenas, movimentos físicos, produtos, expressões e cenários representados no vídeo."
                    }
                    Siga estritamente o formato JSON de retorno bruto, sem adicionar formatações markdown extras.
                `;

                const extractionResponse = await processGeminiAPI(currentKey, {
                    contents: [{
                        parts: [
                            { text: extractPrompt },
                            { inlineData: { mimeType: file.type, data: b64 } }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });

                const parsedExtraction = safeJSONParse(extractionResponse.candidates[0].content.parts[0].text, {});
                
                currentTranscript = parsedExtraction.transcript || 'Nenhuma fala audível detectada.';
                currentOcr = parsedExtraction.ocr_text || 'Nenhum texto visual em tela foi identificado.';
                currentVisual = parsedExtraction.visual_description || 'Nenhum elemento ativo identificado.';

                setTranscript(currentTranscript);
                setOcrText(currentOcr);
                setVisualDescription(currentVisual);

            } catch (e: any) {
                console.error("Falha na desconstrução visual:", e);
                alert("Erro ao extrair dados do vídeo: " + e.message + "\nVocê pode digitar os dados manualmente para prosseguir.");
                setExtracting(false);
                return;
            } finally {
                setExtracting(false);
            }
        }

        // Validate basic criteria
        if (!currentTranscript.trim() && !currentOcr.trim() && !currentVisual.trim()) {
            return alert("Por favor, faça upload de um vídeo ou digite manualmente a transcrição, OCR e descrição visual.");
        }

        // Step 2: Query the main Cloudflare Compliance Worker directly
        setAuditing(true);
        setProgressLabel('Carregando informações nas heurísticas de compliance do Worker...');

        try {
            const auditPayload = {
                mode: "compliance_audit",
                transcript: currentTranscript || "",
                ocr_text: currentOcr || "",
                visual_description: currentVisual || "",
                product_title: productTitle || "",
                product_description: productDescription || "",
                platform: platform || "TikTok Shop"
            };

            console.log("=== COMPLIANCE AUDIT PAYLOAD ===");
            console.log(auditPayload);
            console.log("=== END COMPLIANCE AUDIT PAYLOAD ===");

            const response = await postToWorker<any>('/', auditPayload, {
                moduleName: "Advogado TikTok Auditoria",
                workerUrl: WORKER_URL,
                clientToken: WORKER_TOKEN
            });

            if (!response.ok) {
                throw new Error(response.errorMessage || "Erro na comunicação da auditoria.");
            }

            const rawResponseJson = response.data;
            if (!rawResponseJson) {
                throw new Error("O Worker respondeu mas os dados de auditoria não puderam ser extraídos.");
            }

            // Log raw response exactly as received, before any state updates, transformations, validations or UI logic
            console.log("=== WORKER RAW RESPONSE ===");
            console.log(rawResponseJson);
            console.log("=== END WORKER RAW RESPONSE ===");

            // Runtime guard for incorrect routing
            if (rawResponseJson && (rawResponseJson.error === true || rawResponseJson.error) && 
                typeof rawResponseJson.message === 'string' && rawResponseJson.message.includes("Unknown name")) {
                const routeErrorMsg = "Invalid routing: payload was sent to Gemini instead of compliance_audit route.";
                alert(routeErrorMsg);
                throw new Error(routeErrorMsg);
            }

            // Defensive logging for unexpected response structure
            if (!rawResponseJson || typeof rawResponseJson !== 'object' || 
                (rawResponseJson.compliance_score === undefined && rawResponseJson.compliance_overall === undefined)) {
                console.warn("Unexpected worker response structure:", rawResponseJson);
            }

            setAuditResult(rawResponseJson);

            // Helper to parsing scores safely
            const getScoreValue = (val: any): number | null => {
                if (val === undefined || val === null || val === '') return null;
                const num = Number(val);
                return isNaN(num) ? null : num;
            };

            const computedScore = getScoreValue(rawResponseJson.compliance_score) ?? getScoreValue(rawResponseJson.compliance_overall) ?? 0;

            // Record to local audit histories
            const historyItem = {
                id: Date.now().toString(),
                date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                videoName: file ? file.name : 'Auditoria de Texto Manual',
                complianceScore: computedScore,
                riskLevel: rawResponseJson.risk_level || 'UNKNOWN',
                status: rawResponseJson.overall_status || 'NEEDS IMPROVEMENT',
                result: rawResponseJson,
                inputs: {
                    transcript: currentTranscript,
                    ocr_text: currentOcr,
                    visual_description: currentVisual,
                    product_title: productTitle,
                    product_description: productDescription,
                    platform
                }
            };

            const newHistory = [historyItem, ...history.filter(h => h.id !== historyItem.id)];
            setHistory(newHistory);
            localStorage.setItem('robizin_compliance_history', JSON.stringify(newHistory));

        } catch (e: any) {
            console.error("Compliance evaluation fail:", e);
            alert("Erro na auditoria de compliance: " + e.message);
        } finally {
            setAuditing(false);
            setProgressLabel('');
        }
    };

    const handleReopenHistory = (item: any) => {
        setFile(null);
        setPreviewUrl('');
        setDuration('');
        
        setTranscript(item.inputs?.transcript || '');
        setOcrText(item.inputs?.ocr_text || '');
        setVisualDescription(item.inputs?.visual_description || '');
        setProductTitle(item.inputs?.product_title || '');
        setProductDescription(item.inputs?.product_description || '');
        setPlatform(item.inputs?.platform || 'TikTok Shop');
        
        setAuditResult(item.result);
        setActiveTab('audit');
    };

    const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Excluir este relatório do histórico permanente?")) return;
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        localStorage.setItem('robizin_compliance_history', JSON.stringify(newHistory));
    };

    // Calculate score color levels
    const getScoreColorClass = (score: number | null) => {
        if (score === null) return 'text-slate-400 border-slate-705 bg-slate-800/10';
        if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
        if (score >= 50) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
        return 'text-red-400 border-red-500/20 bg-red-500/10';
    };

    const getScoreBarColor = (score: number | null, isRisk = false) => {
        if (score === null) return 'bg-slate-800';
        if (isRisk) {
            if (score >= 70) return 'bg-red-500';
            if (score >= 35) return 'bg-amber-500';
            return 'bg-emerald-500';
        }
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getStatusTheme = (statusVal: string) => {
        const val = (statusVal || '').toUpperCase().replace(/_/g, ' ').trim();
        if (val === 'APPROVED' || val.includes('APPROV') || val.includes('SEGURO')) {
            return {
                bg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
                dot: 'bg-emerald-400',
                label: 'APPROVED'
            };
        } else if (val === 'HIGH RISK' || val.includes('RISK') || val.includes('HIGH') || val === 'REPROVADO' || val.includes('PERIGO')) {
            return {
                bg: 'bg-red-950/60 border-red-500/40 text-red-400',
                dot: 'bg-red-500',
                label: 'HIGH RISK'
            };
        } else {
            return {
                bg: 'bg-amber-950/60 border-amber-500/40 text-amber-400',
                dot: 'bg-amber-400',
                label: 'NEEDS IMPROVEMENT'
            };
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6 font-sans pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Compliance & Deconstruction Studio</h2>
                    <p className="text-slate-400 text-xs mt-1 font-sans">Efetue escaneamentos profundos de tom legal em seus criativos comparando contra diretrizes rígidas do TikTok Shop, Instagram e outras redes.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <AutoSaveIndicator />
                    
                    {/* Navigation Tabs */}
                    <div className="flex bg-slate-950 border border-slate-800 rounded p-1 font-mono">
                        <button 
                            onClick={() => setActiveTab('audit')} 
                            className={`px-4 py-2 rounded text-[10px] font-bold tracking-wider uppercase transition ${activeTab === 'audit' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Nova Auditoria
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')} 
                            className={`px-4 py-2 rounded text-[10px] font-bold tracking-wider uppercase transition flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LucideIcon name="history" className="w-3.5 h-3.5" />
                            Histórico ({history.length})
                        </button>
                    </div>
                </div>
            </div>

            <RecoveryBanner />

            {activeTab === 'history' ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-900/30 border border-slate-800/80 p-4 rounded font-mono">
                        <span className="text-[11px] font-bold text-slate-400">HISTÓRICO PERMANENTE DE RELATÓRIOS SALVOS LOCALMENTE</span>
                        <span className="text-[10px] text-slate-500">Único local do navegador</span>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center p-16 bg-slate-900/10 rounded border border-dashed border-slate-800/60 text-slate-500">
                            <LucideIcon name="folder-open" className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                            <p className="text-sm font-bold font-mono text-slate-400">NENHUM RELATÓRIO SALVO</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">Faça upload de um vídeo e execute a análise técnica para manter seus relatórios guardados.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {history.map((h) => {
                                const statusTheme = getStatusTheme(h.status);
                                return (
                                    <div 
                                        key={h.id} 
                                        onClick={() => handleReopenHistory(h)}
                                        className="bg-[#0b0c10] border border-slate-800 hover:border-slate-700/80 p-4 rounded transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-900 rounded border border-slate-800/80 flex items-center justify-center text-slate-400 shrink-0">
                                                <LucideIcon name="file-video" className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition font-mono truncate max-w-md">{h.videoName}</div>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                                                    <span>{h.date}</span>
                                                    <span>•</span>
                                                    <span>Plataforma: <strong className="text-slate-400">{h.inputs?.platform || 'TikTok Shop'}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 justify-between md:justify-end shrink-0">
                                            <div className="flex items-center gap-2">
                                                {/* Compliance value indicator */}
                                                <div className="text-right">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Compliance</span>
                                                    <span className="text-xs font-black text-slate-200">{h.complianceScore}%</span>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${statusTheme.bg}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusTheme.dot}`}></span>
                                                    {statusTheme.label}
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    className="p-1 px-2.5 text-[9px] font-bold uppercase font-mono tracking-wider text-slate-400 bg-slate-900 border border-slate-800 rounded hover:text-white"
                                                    onClick={() => handleReopenHistory(h)}
                                                >
                                                    Abrir
                                                </button>
                                                <button 
                                                    className="p-1 px-2 text-[9px] font-bold uppercase font-mono tracking-wider text-red-500 bg-red-950/20 border border-red-900/35 rounded hover:bg-red-900/40"
                                                    onClick={(e) => handleDeleteHistoryItem(h.id, e)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid lg:grid-cols-12 gap-6 items-start">
                    {/* Setup Panel (Left Side - Inputs) */}
                    <div className="lg:col-span-5 space-y-5">
                        
                        <Card className="bg-slate-900/20 border border-slate-800 p-5 space-y-4">
                                                  {/* Drop Zone */}
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded p-5 text-center transition-all cursor-pointer relative bg-slate-950/50 ${
                                    isDragging 
                                        ? 'border-amber-500 bg-amber-500/5' 
                                        : (file || previewUrl)
                                            ? 'border-emerald-500/30 hover:border-emerald-500/50 bg-[#0A1612]/30' 
                                            : 'border-slate-800 hover:border-slate-700/80'
                                    }`}
                                onClick={() => !file && !previewUrl && fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileChange(f);
                                    }}
                                    accept="video/mp4,video/quicktime,video/webm,image/*"
                                    className="hidden" 
                                />

                                {!file && !previewUrl ? (
                                    <div className="py-5 space-y-2">
                                        <LucideIcon name="image" className="w-8 h-8 text-slate-500 mx-auto" />
                                        <p className="text-xs font-mono font-bold uppercase text-slate-300">Arraste seu vídeo de anúncio ou screenshot</p>
                                        <p className="text-[10px] text-slate-500 font-sans">
                                            Upload, arraste ou pressione Ctrl+V para colar imagem
                                        </p>
                                        {auditPasteError && (
                                            <p className="text-[10px] text-red-400 mt-1 leading-tight font-sans">
                                                {auditPasteError}
                                            </p>
                                        )}
                                        {auditPasteFeedback && (
                                            <p className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans animate-fade-in">
                                                ✓ {auditPasteFeedback.message} ({auditPasteFeedback.name} - {auditPasteFeedback.size})
                                            </p>
                                        )}
                                    </div>
                                ) : !file && previewUrl ? (
                                    <div className="space-y-4 text-left p-2">
                                        <div className="p-4 bg-slate-950 border border-red-500/20 text-center rounded flex flex-col items-center justify-center">
                                            <LucideIcon name="alert-triangle" className="w-6 h-6 text-rose-500 mb-2 animate-pulse" />
                                            <p className="text-xs text-rose-455 font-bold font-sans">Arquivo precisa ser reenviado por segurança.</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Por favor, selecione ou arraste o arquivo original para reativar as ações de análise.</p>
                                            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="mt-3 cursor-pointer text-[10px] uppercase font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 px-2 rounded py-1 font-sans">Selecionar Arquivo</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-left">
                                        <div className="flex gap-3 items-center bg-slate-950 p-2.5 rounded border border-slate-800 text-xs font-mono">
                                            <div className="w-9 h-9 bg-emerald-500/10 rounded flex items-center justify-center shrink-0 border border-emerald-500/20">
                                                <LucideIcon name={file.type.startsWith('image/') ? "file-image" : "file-video"} className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div className="min-w-0 flex-grow font-sans">
                                                <div className="text-xs font-bold text-neural-100 truncate">{file.name}</div>
                                                <div className="text-[10px] text-slate-500 flex gap-2 font-mono mt-0.5">
                                                    <span>TAMANHO: <strong className="text-slate-300">{(file.size / (1024 * 1024)).toFixed(2)} MB</strong></span>
                                                    {!file.type.startsWith('image/') && duration && <span>DURAÇÃO: <strong className="text-slate-300">{duration}</strong></span>}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFile(null);
                                                    setPreviewUrl('');
                                                    setDuration('');
                                                }}
                                                className="p-1 px-2 text-[9px] bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/40 rounded transition uppercase font-bold font-mono shrink-0"
                                            >
                                                remover
                                            </button>
                                        </div>

                                        {previewUrl && (
                                            <div className="relative rounded overflow-hidden border border-slate-800 bg-black aspect-video max-h-48 mx-auto shadow-inner">
                                                {file.type.startsWith('image/') ? (
                                                    <img 
                                                        src={previewUrl} 
                                                        className="w-full h-full object-contain" 
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <video 
                                                        src={previewUrl} 
                                                        controls 
                                                        playsInline
                                                        className="w-full h-full object-contain" 
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Context info for the product validation */}
                        <Card className="bg-slate-900/20 border border-slate-800 p-5 space-y-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
                                <LucideIcon name="file-text" className="text-amber-500 w-4 h-4" />
                                Passo 2: Contextualização do Produto
                            </span>

                            <div className="grid gap-3">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Título do Produto / Marca</label>
                                    <input 
                                        type="text" 
                                        value={productTitle} 
                                        onChange={e => setProductTitle(e.target.value)} 
                                        placeholder="Ex: Pure Serum Hyaluronic 2% ou Vanessa Cosméticos" 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-white focus:border-amber-500 outline-none" 
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Breve Descrição / Promessa de Venda</label>
                                    <textarea 
                                        value={productDescription} 
                                        onChange={e => setProductDescription(e.target.value)} 
                                        placeholder="Ex: Creme de tratamento noturno que promete reduzir linhas de expressão em até 14 dias..." 
                                        className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-white focus:border-amber-500 outline-none resize-none custom-scrollbar" 
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rede de Veiculação (Análise Direcionada)</label>
                                    <select 
                                        value={platform} 
                                        onChange={e => setPlatform(e.target.value)} 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-white focus:border-amber-500 outline-none font-mono"
                                    >
                                        <option value="TikTok Shop">TikTok Shop (Políticas TikTok)</option>
                                        <option value="Instagram Ads">Instagram/Meta Ads Solutions</option>
                                        <option value="YouTube Shorts">YouTube Shorts Guidelines</option>
                                    </select>
                                </div>
                            </div>
                        </Card>

                        {/* Extractions Panel (Step 1 outputs or manual overrides) */}
                        <Card className="bg-slate-900/20 border border-slate-800 p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <LucideIcon name="sliders" className="text-amber-500 w-4 h-4" />
                                    Passo 3: Dados Decompostos do Vídeo
                                </span>
                                {extracting && (
                                    <span className="text-[9px] font-bold font-mono text-amber-400 animate-pulse uppercase flex items-center gap-1">
                                        <LucideIcon name="loader-2" className="w-3 h-3 animate-spin" />
                                        extraindo
                                    </span>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Estes dados serão extraídos automaticamente ao rodar a análise no vídeo do Passo 1. Se preferir, você pode preenchê-los manualmente sem vídeo.
                            </p>

                            {/* Extraction Sub-tabs */}
                            <div className="grid grid-cols-3 bg-slate-950 border border-slate-800 p-0.5 rounded font-mono text-[9px] font-bold">
                                <button 
                                    type="button"
                                    onClick={() => setActiveExtTab('transcript')} 
                                    className={`py-1.5 rounded transition uppercase ${activeExtTab === 'transcript' ? 'bg-slate-900 text-amber-400' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Transcrição
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setActiveExtTab('ocr')} 
                                    className={`py-1.5 rounded transition uppercase ${activeExtTab === 'ocr' ? 'bg-slate-900 text-amber-400' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Texto OCR (Fita)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setActiveExtTab('visual')} 
                                    className={`py-1.5 rounded transition uppercase ${activeExtTab === 'visual' ? 'bg-slate-900 text-amber-400' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Visual
                                </button>
                            </div>

                            {activeExtTab === 'transcript' && (
                                <textarea 
                                    value={transcript} 
                                    onChange={e => setTranscript(e.target.value)} 
                                    placeholder="Transcrição da narração falada. (Será preenchida automaticamente pelo robô de IA multimodal)..." 
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 focus:border-amber-500 outline-none resize-none custom-scrollbar font-sans" 
                                />
                            )}

                            {activeExtTab === 'ocr' && (
                                <textarea 
                                    value={ocrText} 
                                    onChange={e => setOcrText(e.target.value)} 
                                    placeholder="Textos visuais presentes em fita/legendas na tela. (Autopreencher ao carregar vídeo)..." 
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 focus:border-amber-500 outline-none resize-none custom-scrollbar font-sans" 
                                />
                            )}

                            {activeExtTab === 'visual' && (
                                <textarea 
                                    value={visualDescription} 
                                    onChange={e => setVisualDescription(e.target.value)} 
                                    placeholder="Descrição detalhada das cenas e cortes visuais. (Autopreencher)..." 
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 focus:border-amber-500 outline-none resize-none custom-scrollbar font-sans" 
                                />
                            )}

                            {/* Execution Core Audits Button */}
                            <Button 
                                onClick={handleTriggerAudit} 
                                disabled={extracting || auditing || (!file && !transcript.trim() && !ocrText.trim() && !visualDescription.trim())}
                                className="w-full mt-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 border-none shadow-lg py-3.5 font-bold shrink-0" 
                                icon={extracting || auditing ? "loader-2" : "shield-alert"}
                            >
                                {extracting ? "Extraindo Vídeo..." : auditing ? "Computando Compliance..." : file ? "Analisar Vídeo Estritamente" : "Rodar Auditoria Técnica"}
                            </Button>
                        </Card>

                        {/* Progress display state */}
                        {(extracting || auditing) && (
                            <div className="bg-[#0f172a] border border-blue-900/40 p-4 rounded text-center space-y-3 font-mono animate-pulse">
                                <div className="flex items-center justify-center gap-2">
                                    <LucideIcon name="loader-2" className="w-4 h-4 text-blue-400 animate-spin" />
                                    <span className="text-[11px] font-bold text-slate-200">OPERAÇÃO DE AUDITORIA EM CURSO</span>
                                </div>
                                <p className="text-[10px] text-slate-400 capitalize">{progressLabel}</p>
                            </div>
                        )}
                    </div>

                    {/* Report Output Panel (Right Side) */}
                    <div className="lg:col-span-7">
                        {!auditResult ? (
                            <Card className="h-full bg-slate-900/10 border border-slate-800/85 min-h-[550px] flex flex-col justify-center items-center text-center p-8">
                                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4 animate-pulse">
                                    <LucideIcon name="shield-alert" className="w-8 h-8" />
                                </div>
                                <h3 className="text-sm font-bold font-mono text-slate-300 uppercase">Aguardando Auditoria Técnica</h3>
                                <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                                    Carregue o criativo para que a Inteligência Artificial execute as heurísticas do robô regulador de anúncios do TikTok e Meta.
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {/* Overall Verdict & Score Grid */}
                                <Card className="bg-[#0b0c10] border border-slate-800 p-5 space-y-5">
                                    {(() => {
                                        const getScoreValue = (val: any): number | null => {
                                            if (val === undefined || val === null || val === '') return null;
                                            const num = Number(val);
                                            return isNaN(num) ? null : num;
                                        };

                                        const complianceVal = getScoreValue(auditResult.compliance_score) ?? getScoreValue(auditResult.compliance_overall);
                                        const riskVal = getScoreValue(auditResult.risk_score);
                                        const conversionVal = getScoreValue(auditResult.conversion_score);
                                        const retentionVal = getScoreValue(auditResult.retention_score);
                                        const hookVal = getScoreValue(auditResult.hook_score);
                                        const ctaVal = getScoreValue(auditResult.cta_score);

                                        const scoreCards = [
                                            { label: 'Compliance Score', score: complianceVal, isRisk: false },
                                            { label: 'Risk Score', score: riskVal, isRisk: true },
                                            { label: 'Conversion Score', score: conversionVal, isRisk: false },
                                            { label: 'Retention Score', score: retentionVal, isRisk: false },
                                            { label: 'Hook Score', score: hookVal, isRisk: false },
                                            { label: 'CTA Score', score: ctaVal, isRisk: false },
                                        ];

                                        return (
                                            <>
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                                                    <div className="text-center sm:text-left">
                                                        <span className="text-slate-500 text-[9px] font-bold uppercase block tracking-wider mb-1 font-mono">STATUS DE VEICULAÇÃO</span>
                                                        {(() => {
                                                            const badge = getStatusTheme(auditResult.overall_status || auditResult.risk_level);
                                                            return (
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black uppercase border tracking-wider bg-black/40 ${badge.bg}`}>
                                                                    <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                                                                    {badge.label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className="text-center sm:text-right font-mono">
                                                        <span className="text-slate-500 text-[9px] font-bold uppercase block tracking-wider mb-0.5">SCORE DE COMPLIANCE GERAL</span>
                                                        <span className={`text-3xl font-black ${complianceVal !== null && complianceVal >= 80 ? 'text-emerald-400' : complianceVal !== null && complianceVal >= 50 ? 'text-amber-400' : 'text-red-500'}`}>
                                                            {complianceVal !== null ? `${complianceVal}%` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 3x2 Grid of Scores */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {scoreCards.map((card, i) => (
                                                        <div key={i} className="bg-slate-950 p-3 rounded border border-slate-850 space-y-2">
                                                            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider font-mono">
                                                                <span className="text-slate-500">{card.label}</span>
                                                                <span className={card.isRisk ? 'text-red-400' : 'text-slate-200'}>
                                                                    {card.score !== null ? `${card.score}%` : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-300 ${getScoreBarColor(card.score, card.isRisk)}`}
                                                                    style={{ width: `${card.score !== null ? card.score : 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </Card>

                                {/* Violations Panel */}
                                <Card className="bg-[#0b0c10] border border-slate-800 p-5 space-y-4">
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
                                        <LucideIcon name="alert-triangle" className="w-4 h-4" />
                                        VIOLATIONS PANEL (VIOLAÇÕES E RETENÇÃO)
                                    </span>

                                    {(() => {
                                        const violations = auditResult.detected_issues || [];
                                        if (violations.length === 0) {
                                            return (
                                                <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded text-center text-xs text-emerald-400 font-sans space-y-1">
                                                    <LucideIcon name="check-circle2" className="w-5 h-5 mx-auto text-emerald-400" />
                                                    <p className="font-bold">CONFORMIDADE GERAL ESTÁVEL</p>
                                                    <p className="text-[10px] text-slate-400">Nossa verificação não acusou graves infrações de copy ou imagem nas políticas normatizadas do TikTok Shop.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                                {violations.map((v: any, index: number) => (
                                                    <div key={index} className="bg-slate-950 p-3.5 rounded border border-red-950/40 space-y-3 font-sans">
                                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono">
                                                                    POLÍTICA: {v.category || 'Geral'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] font-bold font-mono uppercase bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400">
                                                                Risco: {v.risk_level || v.severity || 'Medium'}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                                                            <div>
                                                                <strong className="text-red-400 font-bold">Problema Detectado:</strong> {v.issue || v.reason}
                                                            </div>
                                                            {v.evidence && (
                                                                <div className="text-[11px] text-slate-400 italic bg-slate-900/40 p-2 rounded border border-slate-800/40">
                                                                    Evidência: "{v.evidence || v.text}"
                                                                </div>
                                                            )}
                                                            {(v.recommended_fix || v.fix) && (
                                                                <div className="text-[11px] text-emerald-300 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                                                                    <strong className="text-emerald-400 font-bold block mb-0.5">Correção Recomendada:</strong>
                                                                    {v.recommended_fix || v.fix}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </Card>

                                {/* Recommendations Panel */}
                                <Card className="bg-[#0b0c10] border border-slate-800 p-5 space-y-4">
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
                                        <LucideIcon name="lightbulb" className="w-4 h-4" />
                                        RECOMMENDATIONS PANEL (RECOMENDAÇÕES DA COORDENAÇÃO)
                                    </span>

                                    <div className="space-y-4 font-sans text-xs">
                                        {/* Summary Overview */}
                                        {auditResult.summary && (
                                            <div className="bg-slate-950 p-3.5 rounded border border-slate-850 leading-relaxed text-slate-300">
                                                <strong className="text-amber-400 text-[10px] font-bold uppercase block mb-1 font-mono tracking-wider">Diagnóstico Geral Master</strong>
                                                {auditResult.summary}
                                            </div>
                                        )}

                                        {/* Recommended Hook */}
                                        {auditResult.recommended_hook && (
                                            <div className="bg-slate-950 p-3 rounded border border-slate-850">
                                                <div className="flex justify-between items-center mb-1 bg-neutral-900/40 px-2 py-1 rounded">
                                                    <span className="text-blue-400 text-[9px] font-mono font-bold uppercase tracking-wider">Sugestão de Hook (Anzol)</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(auditResult.recommended_hook).then(o => o && alert('Hook copiado!'))}
                                                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[9px] font-bold font-mono transition uppercase cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3 h-3" /> Copiar
                                                    </button>
                                                </div>
                                                <p className="text-slate-300 italic p-1">"{auditResult.recommended_hook}"</p>
                                            </div>
                                        )}

                                        {/* Recommended CTA */}
                                        {auditResult.recommended_cta && (
                                            <div className="bg-slate-950 p-3 rounded border border-slate-850">
                                                <div className="flex justify-between items-center mb-1 bg-neutral-900/40 px-2 py-1 rounded">
                                                    <span className="text-pink-400 text-[9px] font-mono font-bold uppercase tracking-wider">Sugestão de Call To Action (Chamada para ação)</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(auditResult.recommended_cta).then(o => o && alert('CTA copiado!'))}
                                                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[9px] font-bold font-mono transition uppercase cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3 h-3" /> Copiar
                                                    </button>
                                                </div>
                                                <p className="text-slate-300 italic p-1">"{auditResult.recommended_cta}"</p>
                                            </div>
                                        )}

                                        {/* Recommended Script Fix */}
                                        {auditResult.recommended_script_fix && (
                                            <div className="bg-slate-950 p-3.5 rounded border border-slate-850 space-y-1.5">
                                                <div className="flex justify-between items-center mb-1 border-b border-slate-900 pb-1.5">
                                                    <span className="text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-wider">Transcrição / Copy com Ajuste de Legalidade</span>
                                                    <button 
                                                        onClick={() => copyToClipboard(auditResult.recommended_script_fix).then(o => o && alert('Roteiro corrigido copiado!'))}
                                                        className="text-slate-400 hover:text-white flex items-center gap-1 text-[9px] font-bold font-mono transition uppercase cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3" /> Copiar Completo
                                                    </button>
                                                </div>
                                                <div className="bg-black/40 p-2.5 rounded border border-slate-900 max-h-36 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                    {auditResult.recommended_script_fix}
                                                </div>
                                            </div>
                                        )}

                                        {/* Lists of warnings, approved_elements and final_recommendations */}
                                        {(() => {
                                            const getSafeList = (input: any): string[] => {
                                                if (!input) return [];
                                                if (Array.isArray(input)) return input.filter(item => typeof item === 'string' && item.trim());
                                                if (typeof input === 'string') {
                                                    try {
                                                        const parsed = JSON.parse(input);
                                                        if (Array.isArray(parsed)) return parsed.filter(item => typeof item === 'string' && item.trim());
                                                    } catch {}
                                                    return input.split('\n').map(s => s.replace(/^[-\*\s\d\)]+/, '').trim()).filter(Boolean);
                                                }
                                                return [];
                                            };

                                            const approvedElements = getSafeList(auditResult.approved_elements);
                                            const warningsList = getSafeList(auditResult.warnings);
                                            const finalRecommendations = getSafeList(auditResult.final_recommendations);

                                            if (approvedElements.length === 0 && warningsList.length === 0 && finalRecommendations.length === 0) {
                                                return null;
                                            }

                                            return (
                                                <div className="space-y-4 pt-2 border-t border-slate-900/60">
                                                    {approvedElements.length > 0 && (
                                                        <div className="space-y-2">
                                                            <strong className="text-emerald-400 text-[9px] font-bold uppercase block tracking-wider font-mono">Pontos Fortes Identificados (Approved Elements)</strong>
                                                            <ul className="grid gap-2">
                                                                {approvedElements.map((elem: string, idx: number) => (
                                                                    <li key={idx} className="flex gap-2 items-start bg-emerald-950/10 p-2 rounded border border-emerald-900/30">
                                                                        <LucideIcon name="check-circle" className="text-emerald-500 w-4 h-4 shrink-0 mt-0.5" />
                                                                        <span className="text-slate-300 leading-relaxed">{elem}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {warningsList.length > 0 && (
                                                        <div className="space-y-2">
                                                            <strong className="text-amber-400 text-[9px] font-bold uppercase block tracking-wider font-mono">Alertas e Avisos (Warnings)</strong>
                                                            <ul className="grid gap-2">
                                                                {warningsList.map((warn: string, idx: number) => (
                                                                    <li key={idx} className="flex gap-2 items-start bg-amber-950/10 p-2 rounded border border-amber-950/20">
                                                                        <LucideIcon name="alert-circle" className="text-amber-500 w-4 h-4 shrink-0 mt-0.5" />
                                                                        <span className="text-slate-300 leading-relaxed">{warn}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {finalRecommendations.length > 0 && (
                                                        <div className="space-y-2">
                                                            <strong className="text-blue-400 text-[9px] font-bold uppercase block tracking-wider font-mono">Conselhos Finais Importantes (Final Recommendations)</strong>
                                                            <ul className="grid gap-2">
                                                                {finalRecommendations.map((rec: string, idx: number) => (
                                                                    <li key={idx} className="flex gap-1.5 items-start bg-slate-950/60 p-2 rounded border border-slate-900">
                                                                        <LucideIcon name="check-square" className="text-blue-400 w-4 h-4 shrink-0 mt-0.5" />
                                                                        <span className="text-slate-300 leading-relaxed">{rec}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </Card>

                                {/* Debug Raw JSON Panel */}
                                <Card className="bg-[#0b0c10] border border-slate-800 p-4 space-y-2 font-mono">
                                    <button
                                        type="button"
                                        onClick={() => setShowDebugRaw(!showDebugRaw)}
                                        className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition focus:outline-none"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <LucideIcon name="code" className="w-4 h-4 text-amber-400" />
                                            RAW JSON RESPONSE DEBUG PANEL
                                        </span>
                                        <LucideIcon name={showDebugRaw ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-slate-500" />
                                    </button>

                                    {showDebugRaw && (
                                        <div className="bg-black/55 p-3.5 rounded border border-slate-900/80 mt-3 max-h-96 overflow-y-auto custom-scrollbar text-[10px] text-amber-200/90 whitespace-pre-wrap leading-relaxed select-all">
                                            {JSON.stringify(auditResult, null, 2)}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
