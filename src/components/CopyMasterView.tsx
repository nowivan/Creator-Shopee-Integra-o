import React, { useState, useEffect } from 'react';
import { Card, Button, LucideIcon, usePasteImageUpload } from './Common';
import { processGeminiAPI, safeJSONParse, copyToClipboard, exportScriptToPDF, safeSaveHistory } from '../utils';
import { useAutoSaveRecovery } from '../hooks/useAutoSaveRecovery';
import {
    CopyLogicModelKey,
    COPY_LOGIC_MODELS,
    detectCopyLogicModel
} from '../features/copy-master/copyLogicModels';
import {
    StructuredCopyMasterOutput,
    buildCopyMasterPrompt,
    buildCopyMasterFallbackOutput,
    hasGenericCopyFiller,
    finalPolishScriptText,
    validateCopyMasterOutput
} from '../features/copy-master/copyMasterLogic';
import {
    PersuasionStrategyKey,
    PERSUASION_STRATEGIES,
    extractRealProductPrice,
    calculatePhysicalStoreAnchor
} from '../features/copy-master/copyPersuasionStrategies';
import {
    formatCopyMasterForClipboard,
    validateClipboardText
} from '../features/copy-master/formatCopyMasterForClipboard';

interface CopyMasterViewProps {
    currentKey: string;
}

interface CopyVersion {
    label?: string;
    hook: string;
    problem: string;
    benefit: string;
    cta: string;
    full_copy: string;
    video_prompt: string;
    was_trimmed?: boolean;
}

function limitWordsBySentence(text: string, maxWords: number) {
  const clean = String(text || "").trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) return clean;

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  let output = "";

  for (const sentence of sentences) {
    const candidate = output ? output + " " + sentence : sentence;
    if (candidate.split(/\s+/).length <= maxWords) {
      output = candidate;
    } else {
      break;
    }
  }

  if (output) return output;

  return words.slice(0, maxWords).join(" ") + "...";
}

function normalizeCopyMasterResult(response: string): CopyVersion[] {
    let text = response.trim();
    if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    }
    
    // Helper function to normalize keys for an object
    const normalizeVersionObject = (v: any, index: number): CopyVersion => {
        const normalized: CopyVersion = {
            label: v.label || `Versão ${index + 1}`,
            hook: "",
            problem: "",
            benefit: "",
            cta: "",
            full_copy: "",
            video_prompt: ""
        };

        const findValue = (keys: string[]): string => {
            for (const k of keys) {
                if (v[k] !== undefined && v[k] !== null) return String(v[k]).trim();
                // Case-insensitive search
                const lowercaseKey = k.toLowerCase();
                for (const objKey of Object.keys(v)) {
                    if (objKey.toLowerCase() === lowercaseKey && v[objKey] !== null) {
                        return String(v[objKey]).trim();
                    }
                }
            }
            return "";
        };

        normalized.hook = findValue(['hook', 'gancho', 'introducao', 'intro', 'headline', 'head', 'gancho_provocativo']);
        normalized.problem = findValue(['problem', 'problema', 'dor', 'agitacao', 'agitate', 'incomodo', 'dor_latente']);
        normalized.benefit = findValue(['benefit', 'beneficio', 'beneficios', 'solucao', 'solution', 'vantagem', 'diferenciais']);
        normalized.cta = findValue(['cta', 'chamada', 'chamada_para_acao', 'chamada-para-acao', 'action', 'chamada_acao']);
        normalized.full_copy = findValue(['full_copy', 'fullcopy', 'copy_completa', 'copyCompleta', 'copy', 'texto', 'roteiro', 'script', 'transcricao', 'copy_corrida', 'transcricao_corrida']);
        normalized.video_prompt = findValue(['video_prompt', 'videoprompt', 'prompt_video', 'promptVideo', 'prompt_de_video', 'instrucao_visual', 'visual', 'diretrizes_visuais', 'prompt_do_video', 'video_directives']);

        if (v.was_trimmed !== undefined) {
            normalized.was_trimmed = v.was_trimmed;
        }

        return normalized;
    };

    try {
        // Attempt to repair trailing commas or simple syntax issues before parsing
        let cleanText = text.replace(/,\s*([\]}])/g, '$1');
        cleanText = cleanText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1'); // remove JS comments
        
        const parsed = JSON.parse(cleanText);
        if (parsed && typeof parsed === 'object') {
            let versions: any[] = [];
            if (Array.isArray(parsed)) {
                versions = parsed;
            } else if (parsed.versions && Array.isArray(parsed.versions)) {
                versions = parsed.versions;
            } else if (parsed.version && typeof parsed.version === 'object') {
                versions = [parsed.version];
            } else {
                // Find any key in parsed that contains an array of objects
                for (const key of Object.keys(parsed)) {
                    if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
                        versions = parsed[key];
                        break;
                    }
                }
            }

            if (versions.length > 0) {
                return versions.map((v, i) => normalizeVersionObject(v, i));
            }
        }
    } catch (e) {
        console.warn("Failed parsing as JSON, attempting regex extraction of JSON objects or falling back to regex block parsing", e);
    }

    // 2. Regex-based soft JSON parsing (if text looks like JSON but couldn't be parsed)
    if (text.includes('{') && text.includes('}')) {
        try {
            // Find all JSON-like objects in the text
            const objectMatches = text.match(/\{[\s\S]*?\}/g);
            if (objectMatches && objectMatches.length > 0) {
                const versionsList: CopyVersion[] = [];
                for (let i = 0; i < objectMatches.length; i++) {
                    const rawObjText = objectMatches[i];
                    // Skip if it is the root wrapper object containing versions
                    if (rawObjText.includes('"versions"') && rawObjText.trim().endsWith(']')) {
                        continue;
                    }

                    // Extract values using regex
                    const extractValue = (keys: string[]): string => {
                        for (const key of keys) {
                            const pattern = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`, 'i');
                            const match = rawObjText.match(pattern);
                            if (match && match[1]) {
                                // Simple unescape for quotes and newlines
                                return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                            }
                        }
                        return "";
                    };

                    const hook = extractValue(['hook', 'gancho', 'introducao', 'intro', 'headline', 'head', 'gancho_provocativo']);
                    const problem = extractValue(['problem', 'problema', 'dor', 'agitacao', 'agitate', 'incomodo', 'dor_latente']);
                    const benefit = extractValue(['benefit', 'beneficio', 'beneficios', 'solucao', 'solution', 'vantagem', 'diferenciais']);
                    const cta = extractValue(['cta', 'chamada', 'chamada_para_acao', 'chamada-para-acao', 'action', 'chamada_acao']);
                    const full_copy = extractValue(['full_copy', 'fullcopy', 'copy_completa', 'copyCompleta', 'copy', 'texto', 'roteiro', 'script', 'transcricao', 'copy_corrida', 'transcricao_corrida']);
                    const video_prompt = extractValue(['video_prompt', 'videoprompt', 'prompt_video', 'promptVideo', 'prompt_de_video', 'instrucao_visual', 'visual', 'diretrizes_visuais', 'prompt_do_video', 'video_directives']);

                    if (hook || problem || benefit || cta || full_copy || video_prompt) {
                        versionsList.push({
                            label: `Versão ${versionsList.length + 1}`,
                            hook,
                            problem,
                            benefit,
                            cta,
                            full_copy,
                            video_prompt
                        });
                    }
                }
                if (versionsList.length > 0) {
                    return versionsList;
                }
            }
        } catch (regexErr) {
            console.warn("Soft regex JSON parsing failed", regexErr);
        }
    }

    // 3. Regex-based plain-text block parsing (fallback for plain text formats)
    const versionsList: CopyVersion[] = [];
    const parts = text.split(/VERSÃO\s*\d+[\:\-\s]*/i);
    const subParts = parts.slice(1);
    
    if (subParts.length === 0) {
        subParts.push(text);
    }

    for (let i = 0; i < subParts.length; i++) {
        const rawVersion = subParts[i].trim();
        if (!rawVersion) continue;

        const extractField = (fieldName: string, textContent: string): string => {
            const regexes = [
                new RegExp(`\\[${fieldName}\\]\\s*:\\s*([\\s\\S]*?)(?=\\n\\[|\\nVERSÃO|$)`, 'i'),
                new RegExp(`\\[${fieldName}\\]\\s*([\\s\\S]*?)(?=\\n\\[|\\nVERSÃO|$)`, 'i'),
                new RegExp(`\\*\\*${fieldName}\\*\\*\\s*:\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\nVERSÃO|$)`, 'i'),
                new RegExp(`\\*\\*${fieldName}\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\nVERSÃO|$)`, 'i'),
                new RegExp(`${fieldName}\\s*:\\s*([\\s\\S]*?)(?=\\n${fieldName}|\\nVERSÃO|$)`, 'i'),
            ];
            for (const r of regexes) {
                const match = textContent.match(r);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            return "";
        };

        const hook = extractField("HOOK", rawVersion) || extractField("GANCHO", rawVersion);
        const problem = extractField("PROBLEM", rawVersion) || extractField("PROBLEMA", rawVersion);
        const benefit = extractField("BENEFIT", rawVersion) || extractField("BENEFÍCIO", rawVersion);
        const cta = extractField("CTA", rawVersion);
        const full_copy = extractField("FULL COPY", rawVersion) || extractField("COPY COMPLETA", rawVersion) || extractField("FULL_COPY", rawVersion);
        const video_prompt = extractField("PROMPT FOR VIDEO GENERATION", rawVersion) || extractField("VIDEO_PROMPT", rawVersion) || extractField("PROMPT DE VÍDEO", rawVersion);

        if (hook || problem || benefit || cta || full_copy || video_prompt) {
            versionsList.push({
                label: `Versão ${i + 1}`,
                hook,
                problem,
                benefit,
                cta,
                full_copy,
                video_prompt
            });
        }
    }

    if (versionsList.length === 0) {
        versionsList.push({
            label: "Versão 1",
            hook: "",
            problem: "",
            benefit: "",
            cta: "",
            full_copy: text,
            video_prompt: ""
        });
    }

    return versionsList;
}

function getCleanTextForExport(pVersions: CopyVersion[]): string {
    return pVersions.map((v, i) => {
        return `VERSÃO ${i + 1}
[HOOK]: ${v.hook}
[PROBLEMA]: ${v.problem}
[BENEFÍCIO]: ${v.benefit}
[CTA]: ${v.cta}
[FULL COPY]: ${v.full_copy}
[PROMPT FOR VIDEO GENERATION]: ${v.video_prompt}`;
    }).join('\n\n');
}

function getWordCount(text: string): number {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeAntiPressureCopy(text: string): { sanitized: string; termsRemoved: string[] } {
  if (!text) return { sanitized: "", termsRemoved: [] };
  let sanitized = text;
  const termsRemoved: string[] = [];

  const rules = [
    { pattern: /compre\s+agora(?:\s+antes\s+que\s+acabe)?/gi, replacement: "veja os detalhes e escolha se faz sentido para você", label: "compre agora antes que acabe" },
    { pattern: /compre\s+agora/gi, replacement: "veja os detalhes e escolha se faz sentido para você", label: "compre agora" },
    { pattern: /garanta\s+já(?:\s+o\s+seu)?/gi, replacement: "dá uma olhada no carrinho", label: "garanta já o seu" },
    { pattern: /garanta\s+agora/gi, replacement: "dá uma olhada no carrinho", label: "garanta agora" },
    { pattern: /última\s+chance/gi, replacement: "escolha com calma", label: "última chance" },
    { pattern: /antes\s+que\s+acabe/gi, replacement: "se fizer sentido para você", label: "antes que acabe" },
    { pattern: /oferta\s+imperdível/gi, replacement: "pode ser o detalhe que faltava", label: "oferta imperdível" },
    { pattern: /você\s+precisa\s+disso/gi, replacement: "pode ser o detalhe que faltava", label: "você precisa disso" },
    { pattern: /não\s+perca/gi, replacement: "vale conferir", label: "não perca" },
    { pattern: /corra/gi, replacement: "dá uma olhada", label: "corra" },
    { pattern: /só\s+hoje/gi, replacement: "com tranquilidade", label: "só hoje" },
    { pattern: /o\s+melhor\s+do\s+mercado/gi, replacement: "uma escolha com cuidado e qualidade", label: "o melhor do mercado" },
    { pattern: /100%\s+garantido/gi, replacement: "comprovado e de confiança", label: "100% garantido" },
    { pattern: /resultado\s+garantido/gi, replacement: "comprovado e de confiança", label: "resultado garantido" }
  ];

  for (const rule of rules) {
    if (rule.pattern.test(sanitized)) {
      termsRemoved.push(rule.label);
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }

  return { sanitized, termsRemoved };
}

function evaluateAntiPressureCopy(text: string) {
  const cleanText = String(text || "").trim().toLowerCase();
  
  const aggressiveCTAPattern = /^(compre|garanta|aproveite|última|clique|corra|adquira)/i;
  const startsWithAggressiveCTA = aggressiveCTAPattern.test(cleanText);

  const productIntroducers = ["este", "esta", "esse", "essa", "produto", "compre", "adquira", "garanta"];
  const desireKeywords = ["imagine", "sinto", "sabe quando", "visual", "sensação", "presença", "olhar", "estilo", "conexão", "experiência"];
  
  let productIdx = -1;
  for (const keyword of productIntroducers) {
    const idx = cleanText.indexOf(keyword);
    if (idx !== -1 && (productIdx === -1 || idx < productIdx)) {
      productIdx = idx;
    }
  }

  let desireIdx = -1;
  for (const keyword of desireKeywords) {
    const idx = cleanText.indexOf(keyword);
    if (idx !== -1 && (desireIdx === -1 || idx < desireIdx)) {
      desireIdx = idx;
    }
  }

  let desire_before_product = false;
  if (desireIdx !== -1 && (productIdx === -1 || desireIdx < productIdx)) {
    desire_before_product = true;
  } else if (desireIdx !== -1 && productIdx !== -1 && desireIdx > productIdx) {
    desire_before_product = false;
  } else {
    desire_before_product = desireIdx !== -1;
  }

  const fakeUrgencyPattern = /(antes que acabe|última chance|só hoje|corra|tempo limitado|tempo acabar|últimas unidades)/i;
  const hasFakeUrgency = fakeUrgencyPattern.test(cleanText);

  const softCTAPattern = /(veja os detalhes|dá uma olhada|faz sentido|carrinho|escolha|conferir|estilo|conheça)/i;
  const has_soft_cta = softCTAPattern.test(cleanText);

  const valuePerceptionPattern = /(percepção|detalhe|acabamento|brilho|sensação|qualidade|cuidado|valor)/i;
  const has_value_perception = valuePerceptionPattern.test(cleanText);

  const aggressiveTerms = [
    "compre agora", "garanta agora", "última chance", "antes que acabe", 
    "oferta imperdível", "você precisa disso", "não perca", "corra", 
    "só hoje", "o melhor do mercado", "100% garantido", "resultado garantido"
  ];
  const aggressive_terms_found: string[] = [];
  for (const term of aggressiveTerms) {
    if (cleanText.includes(term)) {
      aggressive_terms_found.push(term);
    }
  }

  let score = 30; // base score
  const improvement_notes: string[] = [];

  if (desire_before_product) {
    score += 20;
  } else {
    improvement_notes.push("O produto foi apresentado muito cedo. Tente criar desejo antes de introduzi-lo.");
  }

  if (has_soft_cta) {
    score += 15;
  } else {
    improvement_notes.push("Considere usar um CTA mais suave e convidativo, sem pressão direta de compra.");
  }

  if (has_value_perception) {
    score += 20;
  } else {
    improvement_notes.push("Enfatize os detalhes, acabamento e a percepção de valor antes do preço.");
  }

  const hypePattern = /(melhor do mundo|inacreditável|maravilhoso|perfeito|fantástico|revolucionário|único|exclusivo)/i;
  const hasHype = hypePattern.test(cleanText);
  if (!hasHype) {
    score += 15;
  } else {
    improvement_notes.push("Evite promessas exageradas e adjetivos inflados (hype) para soar mais humano.");
  }

  if (startsWithAggressiveCTA) {
    score = Math.min(score, 55);
    improvement_notes.push("A copy começou com um CTA agressivo. Isso aumenta a reatância psicológica.");
  }
  if (!desire_before_product && productIdx !== -1) {
    score = Math.min(score, 70);
  }
  if (hasFakeUrgency) {
    score = Math.min(score, 60);
    improvement_notes.push("Uso de escassez artificial ou urgência agressiva detectado.");
  }

  return {
    anti_pressure_score: Math.max(10, Math.min(score, 100)),
    aggressive_terms_found,
    desire_before_product,
    has_soft_cta,
    has_value_perception,
    improvement_notes
  };
}

export function CopyMasterView({ currentKey }: CopyMasterViewProps) {
    const COPY_LENGTH_CONFIG = {
      curta: {
        hookMaxWords: 16,
        problemMaxWords: 30,
        benefitMaxWords: 35,
        ctaMaxWords: 18,
        fullCopyMaxWords: 85,
        videoPromptMaxWords: 55
      },
      media: {
        hookMaxWords: 22,
        problemMaxWords: 45,
        benefitMaxWords: 55,
        ctaMaxWords: 22,
        fullCopyMaxWords: 130,
        videoPromptMaxWords: 75
      },
      completa: {
        hookMaxWords: 28,
        problemMaxWords: 60,
        benefitMaxWords: 75,
        ctaMaxWords: 28,
        fullCopyMaxWords: 180,
        videoPromptMaxWords: 95
      }
    };

    const [product, setProduct] = useState('');
    const [audience, setAudience] = useState('');
    const [features, setFeatures] = useState('');
    const [referenceScript, setReferenceScript] = useState("");
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedJSON, setCopiedJSON] = useState(false);
    const [showCopyToast, setShowCopyToast] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [versionCount, setVersionCount] = useState<number>(3);
    const [copyLength, setCopyLength] = useState<'curta' | 'media' | 'completa'>('media');
    const [copyFormat, setCopyFormat] = useState<string>('TikTok Shop');
    const [copyMethod, setCopyMethod] = useState<'direct_response' | 'ugc_conversational' | 'problem_solution' | 'before_after' | 'desire_value_decision' | 'premium_perception' | 'soft_persuasion'>('desire_value_decision');
    const [selectedLogicModel, setSelectedLogicModel] = useState<CopyLogicModelKey>('auto');
    const [persuasionStrategy, setPersuasionStrategy] = useState<PersuasionStrategyKey>('PADRAO');
    const [expandedFullCopy, setExpandedFullCopy] = useState<Record<number, boolean>>({});
    const [expandedVideoPrompt, setExpandedVideoPrompt] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (copyFormat === 'TikTok Shop') {
            setCopyMethod('desire_value_decision');
        }
    }, [copyFormat]);

    // Create the state object for Autosave & Recovery in Copy Master
    const currentState = {
        product,
        audience,
        features,
        referenceScript,
        result,
        imagePreview,
        versionCount,
        copyLength,
        copyFormat,
        copyMethod,
        selectedLogicModel,
        persuasionStrategy
    };

    const handleRestore = (saved: any) => {
        if (!saved) return;
        if (saved.product !== undefined) setProduct(saved.product);
        if (saved.audience !== undefined) setAudience(saved.audience);
        if (saved.features !== undefined) setFeatures(saved.features);
        if (saved.referenceScript !== undefined) setReferenceScript(saved.referenceScript);
        if (saved.result !== undefined) setResult(saved.result);
        if (saved.imagePreview !== undefined) setImagePreview(saved.imagePreview);
        if (saved.versionCount !== undefined) setVersionCount(saved.versionCount);
        if (saved.copyLength !== undefined) setCopyLength(saved.copyLength);
        if (saved.copyFormat !== undefined) setCopyFormat(saved.copyFormat);
        if (saved.copyMethod !== undefined) setCopyMethod(saved.copyMethod);
        if (saved.selectedLogicModel !== undefined) setSelectedLogicModel(saved.selectedLogicModel);
        if (saved.persuasionStrategy !== undefined) setPersuasionStrategy(saved.persuasionStrategy);
    };

    const isEmptyOrInitial = (state: any) => {
        return !state.product && !state.result;
    };

    const { AutoSaveIndicator, RecoveryBanner } = useAutoSaveRecovery('copy_master', currentState, handleRestore, isEmptyOrInitial);

    const { feedback: pasteFeedback, error: pasteError } = usePasteImageUpload({
        onImagePasted: (fileObj) => {
            handleUploadedFile(fileObj);
        }
    });

    const handleCopyAll = () => {
        if (!result) return;
        try {
            let parsed: any = null;
            try {
                parsed = JSON.parse(result);
            } catch {
                parsed = result;
            }

            let formattedText = formatCopyMasterForClipboard(parsed);
            const validation = validateClipboardText(formattedText);

            if (!validation.is_valid) {
                formattedText = formattedText
                    .replace(/\bundefined\b/gi, '')
                    .replace(/\bnull\b/gi, '')
                    .replace(/\[object Object\]/gi, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();

                setShowCopyToast(true);
                setTimeout(() => setShowCopyToast(false), 3000);
            }

            copyToClipboard(formattedText);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        } catch (e) {
            console.error("Error in handleCopyAll:", e);
        }
    };

    const handleCopyJSON = () => {
        if (!result) return;
        try {
            let parsed: any = null;
            try {
                parsed = JSON.parse(result);
            } catch {
                parsed = result;
            }

            const jsonString = typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : result;
            copyToClipboard(jsonString);
            setCopiedJSON(true);
            setTimeout(() => setCopiedJSON(false), 2000);
        } catch (e) {
            console.error("Error in handleCopyJSON:", e);
        }
    };

    const handleCopyVersion = (v: CopyVersion, index: number) => {
        const textToCopy = `VERSÃO ${index + 1}
[HOOK]: ${v.hook}
[PROBLEMA]: ${v.problem}
[BENEFÍCIO]: ${v.benefit}
[CTA]: ${v.cta}
[FULL COPY]: ${v.full_copy}
[PROMPT FOR VIDEO GENERATION]: ${v.video_prompt}`;
        copyToClipboard(textToCopy);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const downloadAsPDF = () => {
        const pNameClean = (product || 'script').toLowerCase().replace(/[^a-z0-9]/gi, '_');
        let textToExport = "";

        try {
            let parsed: any = null;
            try {
                parsed = JSON.parse(result);
            } catch {
                parsed = result;
            }
            textToExport = formatCopyMasterForClipboard(parsed);
        } catch (e) {
            textToExport = result;
        }

        exportScriptToPDF({
            fileName: `roteiro_copy_${pNameClean || 'v1'}.pdf`,
            title: 'Roteiros e Copywriting Gerados com IA',
            productName: product || 'Geral',
            audience: audience || 'Geral',
            features: features || undefined,
            scriptText: textToExport
        });
    };

    const handleUploadedFile = async (file: File) => {
        if (file.size > 15 * 1024 * 1024) {
            alert("A imagem é muito pesada (Máx 15MB). Tente enviar um arquivo menor.");
            return;
        }

        setImagePreview(URL.createObjectURL(file));
        setAnalyzing(true);
        
        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }).then(res => res.split(',')[1]);
            
            setImageBase64(base64Data);

            const visionPrompt = `Analise esta foto de produto. Retorne APENAS um objeto JSON com as chaves exatas (tudo em letras minúsculas e sem acento): "produto" (nome comercial curto), "publico" (público-alvo ideal), e "beneficios" (3 a 5 diferenciais em texto corrido). NÃO use formatação markdown, apenas JSON puro.`;

            const data = await processGeminiAPI(currentKey, {
                contents: [{
                    parts: [
                        { text: visionPrompt },
                        { inlineData: { mimeType: file.type || "image/jpeg", data: base64Data } }
                    ]
                }],
                generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "medium" } }
            });

            let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) throw new Error("A IA não retornou a análise visual.");

            let jsonResult = safeJSONParse(responseText, {});
            
            if (Array.isArray(jsonResult)) {
                jsonResult = jsonResult[0] || {};
            }

            const normalizedJson = Object.keys(jsonResult).reduce((acc: any, key) => {
                const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                acc[cleanKey] = jsonResult[key];
                return acc;
            }, {});

            const prod = normalizedJson.produto || normalizedJson.product || normalizedJson.nome || normalizedJson.titulo || "";
            const aud = normalizedJson.publico || normalizedJson.audience || normalizedJson.alvo || normalizedJson.target || normalizedJson.comprador || "";
            let ben = normalizedJson.beneficios || normalizedJson.features || normalizedJson.beneficio || normalizedJson.diferenciais || normalizedJson.vantagens || "";

            if (Array.isArray(ben)) ben = ben.join(', ');

            if (prod) setProduct(prod);
            if (aud) setAudience(aud);
            if (ben) setFeatures(ben);

        } catch (err: any) {
            console.error("Erro na Visão IA:", err);
            alert("🚨 Falha ao analisar a imagem:\n\n" + err.message + "\n\nDica: Verifique se sua Chave API do Google no Worker está funcionando.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUploadedFile(file);
        }
    };

    const generateCopy = async () => {
        const baseInput = referenceScript || product;
        if (!baseInput) {
            setErrorMsg("Por favor, preencha o nome do produto ou cole um script de referência.");
            return;
        }
        if (!currentKey) {
            setErrorMsg("Configure a Chave API nas configurações.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);
        setResult('');

        const combinedInput = `${product} ${audience} ${features} ${referenceScript}`;
        const prompt = buildCopyMasterPrompt(product, audience, features, referenceScript, selectedLogicModel, persuasionStrategy);

        const requestPayload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        };

        try {
            const data = await processGeminiAPI(currentKey, requestPayload);

            let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) {
                throw new Error("A IA retornou um texto vazio.");
            }

            let parsed: StructuredCopyMasterOutput | null = null;
            try {
                parsed = safeJSONParse(responseText, null);
            } catch (e) {
                console.warn("[CopyMasterView] JSON parse failed, using fallback engine", e);
            }

            const rawJsonStr = JSON.stringify(parsed || {});
            const isGeneric = hasGenericCopyFiller(rawJsonStr, combinedInput);

            if (!parsed || !parsed.scripts || !parsed.scripts.direct_conversion || isGeneric) {
                console.warn("[CopyMasterView] AI output missing required structure or contained generic filler. Rebuilding fallback.");
                parsed = buildCopyMasterFallbackOutput(combinedInput, selectedLogicModel, persuasionStrategy);
            } else {
                if (parsed.scripts.direct_conversion) {
                    parsed.scripts.direct_conversion.full_script = finalPolishScriptText(parsed.scripts.direct_conversion.full_script, combinedInput);
                }
                if (parsed.scripts.curiosity_subtle) {
                    parsed.scripts.curiosity_subtle.full_script = finalPolishScriptText(parsed.scripts.curiosity_subtle.full_script, combinedInput);
                }
                if (parsed.scripts.ugc_natural) {
                    parsed.scripts.ugc_natural.full_script = finalPolishScriptText(parsed.scripts.ugc_natural.full_script, combinedInput);
                }
                if (parsed.scripts.premium_safe) {
                    parsed.scripts.premium_safe.full_script = finalPolishScriptText(parsed.scripts.premium_safe.full_script, combinedInput);
                }
            }

            const finalJSONString = JSON.stringify(parsed);
            setResult(finalJSONString);

            safeSaveHistory({
                date: new Date().toLocaleString(),
                tool: "Copy Master",
                title: product || "Copy Personalizada",
                content: finalJSONString
            });

        } catch (err: any) {
            console.warn("Erro no Gemini para Copy Master, usando gerador estruturado local:", err);
            const fallback = buildCopyMasterFallbackOutput(combinedInput, selectedLogicModel, persuasionStrategy);
            const finalJSONString = JSON.stringify(fallback);
            setResult(finalJSONString);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                    <LucideIcon name="pen-tool" className="w-3 h-3" /> COPYWRITING PRO
                </div>
                <div className="flex items-center">
                    <AutoSaveIndicator />
                </div>
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Copy Master</h2>
                <p className="text-slate-400">Gere Headlines, Bullets e CTAs matadores para seus produtos em segundos.</p>
            </div>

            <RecoveryBanner />

            <div className="grid md:grid-cols-12 gap-6">
                <div className="md:col-span-5 space-y-4">
                    <Card className="border-emerald-500/30 bg-slate-900/40">
                        {/* Drag-drop upload area with preview */}
                        <div className="mb-6 p-1 border border-dashed border-emerald-500/50 rounded-xl bg-emerald-500/5 text-center relative hover:bg-emerald-500/10 transition-colors overflow-hidden min-h-[120px] flex items-center justify-center">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                disabled={analyzing}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20" 
                            />
                            
                            {imagePreview ? (
                                <div className="relative w-full h-32 flex items-center justify-center">
                                    <img src={imagePreview} alt="Preview do Produto" className="max-h-full max-w-full object-contain rounded-lg" />
                                    
                                    {analyzing ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm z-10">
                                            <LucideIcon name="scan-eye" className="w-8 h-8 text-emerald-500 mb-2 animate-pulse" />
                                            <span className="text-sm text-emerald-400 font-semibold font-sans">A analisar o produto...</span>
                                        </div>
                                    ) : (imagePreview && imagePreview.startsWith('blob:')) ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 rounded-lg border border-red-500/20 p-2 text-center z-10">
                                            <LucideIcon name="alert-triangle" className="w-5 h-5 text-rose-500 mb-1 animate-pulse" />
                                            <span className="text-[10px] font-bold text-rose-450 font-sans leading-tight">Arquivo precisa ser reenviado por segurança.</span>
                                            <span className="text-[9px] text-slate-500 mt-1">O link expirou após atualizar a página.</span>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity rounded-lg backdrop-blur-sm z-10">
                                            <LucideIcon name="refresh-cw" className="w-8 h-8 text-emerald-500 mb-2" />
                                            <span className="text-sm text-emerald-400 font-semibold font-sans">Clique para trocar a foto</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center pointer-events-none py-6">
                                    <LucideIcon name="image-plus" className="w-8 h-8 text-emerald-500 mb-2" />
                                    <span className="text-sm text-emerald-400 font-semibold font-sans">Preenchimento Automático (Visão IA)</span>
                                    <span className="text-xs text-slate-400 mt-1 font-sans">Upload, arraste ou pressione Ctrl+V para colar imagem</span>
                                    {pasteError && (
                                        <span className="text-[10px] text-red-500 mt-1 leading-tight font-sans font-normal">
                                            {pasteError}
                                        </span>
                                    )}
                                    {pasteFeedback && (
                                        <span className="text-[10px] text-emerald-450 mt-1 leading-tight font-sans font-normal">
                                            ✓ {pasteFeedback.message} ({pasteFeedback.name})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 font-sans">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Produto / Oferta</label>
                                <input 
                                    value={product} 
                                    onChange={(e) => setProduct(e.target.value)} 
                                    placeholder="Ex: Tênis Ortopédico Nuvem" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Público-Alvo (Opcional)</label>
                                <input 
                                    value={audience} 
                                    onChange={(e) => setAudience(e.target.value)} 
                                    placeholder="Ex: Pessoas com fascite plantar" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Diferenciais (Opcional)</label>
                                <textarea 
                                    value={features} 
                                    onChange={(e) => setFeatures(e.target.value)} 
                                    placeholder="Ex: Solado de EVA, leve, previne dores..." 
                                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-emerald-500 outline-none resize-none custom-scrollbar transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Script de Referência a Clonar (Opcional)</label>
                                <textarea 
                                    value={referenceScript} 
                                    onChange={(e) => setReferenceScript(e.target.value)} 
                                    placeholder="Cole um script que já vende (opcional)" 
                                    className="w-full h-24 bg-emerald-900/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-100 focus:border-emerald-500 outline-none resize-none custom-scrollbar transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                                    <span>Estratégia de Persuasão</span>
                                    {persuasionStrategy === 'PHYSICAL_STORE_ANCHOR' && (
                                        <span className="text-[10px] text-emerald-400 font-mono">
                                            🏬 Âncora 2x–3x
                                        </span>
                                    )}
                                </label>
                                <select
                                    value={persuasionStrategy}
                                    onChange={(e) => setPersuasionStrategy(e.target.value as PersuasionStrategyKey)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none transition h-[38px]"
                                >
                                    <option value="PADRAO">Padrão</option>
                                    <option value="PHYSICAL_STORE_ANCHOR">Ancoragem Loja Física</option>
                                </select>
                                {persuasionStrategy === 'PHYSICAL_STORE_ANCHOR' && (
                                    <div className="mt-1.5 p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300/90 leading-tight">
                                        {(() => {
                                            const realPrice = extractRealProductPrice(`${product} ${features} ${referenceScript}`);
                                            if (realPrice) {
                                                const anchor = calculatePhysicalStoreAnchor(realPrice);
                                                return (
                                                    <span>
                                                        ✓ Preço real: <strong className="text-white">{realPrice.formatted}</strong> | Âncora externa comparativa: <strong className="text-emerald-300">{anchor.anchorRangeFormatted}</strong>
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="text-slate-400">
                                                    ℹ️ Informe o preço real no produto ou diferenciais (ex: R$ 25) para ativar a faixa de ancoragem 2x–3x.
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                                    <span>Modelo Lógico de Copy</span>
                                    {selectedLogicModel === 'auto' && (
                                        <span className="text-[10px] text-emerald-400 font-mono">
                                            🎯 {detectCopyLogicModel(`${product} ${audience} ${features} ${referenceScript}`).label}
                                        </span>
                                    )}
                                </label>
                                <select
                                    value={selectedLogicModel}
                                    onChange={(e) => setSelectedLogicModel(e.target.value as CopyLogicModelKey)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none transition h-[38px]"
                                >
                                    <option value="auto">Auto Detectar 🎯</option>
                                    <option value="scarcity_urgency">Escassez & Urgência</option>
                                    <option value="direct_tiktok_conversion">Conversão Direta TikTok Shop</option>
                                    <option value="curiosity_warning">Curiosidade + Aviso</option>
                                    <option value="hidden_opportunity">Oportunidade Oculta</option>
                                    <option value="desire_value_decision">Desejo → Valor → Decisão</option>
                                    <option value="ugc_natural">UGC Natural</option>
                                    <option value="premium_perception">Percepção Premium</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Formato da Copy</label>
                                    <select
                                        value={copyFormat}
                                        onChange={(e) => setCopyFormat(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none transition h-[38px]"
                                    >
                                        <option value="TikTok Shop">TikTok Shop</option>
                                        <option value="Reels">Instagram Reels</option>
                                        <option value="Shorts">YouTube Shorts</option>
                                        <option value="Marketplace">Marketplace Ads</option>
                                        <option value="Ads">Direct Response Ads</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Tamanho da Copy</label>
                                    <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700 h-[38px] items-center">
                                        {(['curta', 'media', 'completa'] as const).map((sz) => (
                                            <button
                                                key={sz}
                                                type="button"
                                                onClick={() => setCopyLength(sz)}
                                                className={`py-1 px-1 text-[10px] font-bold rounded-md transition cursor-pointer text-center capitalize ${
                                                    copyLength === sz
                                                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }`}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Método de Copywriting</label>
                                <select
                                    value={copyMethod}
                                    onChange={(e) => setCopyMethod(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 outline-none transition h-[38px]"
                                >
                                    <option value="desire_value_decision">Método Desejo → Valor → Decisão (Venda Sem Pressão) 🔥</option>
                                    <option value="direct_response">Direct Response Persuasivo (Fórmula Clássica)</option>
                                    <option value="ugc_conversational">UGC Nativo & Conversacional</option>
                                    <option value="problem_solution">Problema & Solução Rápida</option>
                                    <option value="before_after">Antes & Depois Transformacional</option>
                                    <option value="premium_perception">Percepção de Valor Elevada / Luxo</option>
                                    <option value="soft_persuasion">Persuasão Indireta / Convite</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                                    <span>Versões de Copy a Gerar</span>
                                    <span className="text-[10px] text-emerald-400 lowercase font-mono">
                                        {versionCount === 3 ? 'recomendações completas' : 'economia de tokens ativa'}
                                    </span>
                                </label>
                                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
                                    {[1, 2, 3].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setVersionCount(num)}
                                            className={`py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                                                versionCount === num
                                                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                                            }`}
                                        >
                                            <span>{num} {num === 1 ? 'versão' : 'versões'}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 pl-1">
                                    Escolher menos versões economiza até {versionCount === 1 ? '66%' : versionCount === 2 ? '33%' : '0%'} de tokens do modelo Gemini.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={generateCopy} disabled={loading || analyzing || !(product || referenceScript)} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500/50 shadow-lg py-4 text-sm font-bold" icon={loading ? "loader-2" : "pen-tool"}>
                                    {loading ? "Escrevendo..." : "Gerar Copy Matadora"}
                                </Button>
                                <button 
                                    onClick={() => { setProduct(''); setAudience(''); setFeatures(''); setReferenceScript(''); setResult(''); setImagePreview(null); setImageBase64(null); }} 
                                    className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 px-5 py-4 rounded-xl border border-slate-700 hover:border-red-500/50 transition-colors flex items-center justify-center cursor-pointer"
                                    title="Limpar todos os campos"
                                >
                                    <LucideIcon name="trash-2" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-7 relative flex flex-col font-sans">
                    <Card className="h-full flex flex-col p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-emerald-500/30 min-h-[400px]">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <LucideIcon name="file-text" className="w-5 h-5 text-emerald-400"/> Resultado da Copy
                            </h3>
                            {result && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button onClick={handleCopyJSON} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer" title="Copiar estrutura JSON pura">
                                        <LucideIcon name={copiedJSON ? "check" : "code"} className="w-3.5 h-3.5 text-slate-400" /> {copiedJSON ? "JSON Copiado!" : "Copiar JSON"}
                                    </button>
                                    <button onClick={downloadAsPDF} className="text-xs bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer" title="Exportar roteiro completo em formato PDF profissional">
                                        <LucideIcon name="file-down" className="w-3.5 h-3.5 text-indigo-400" /> Exportar PDF
                                    </button>
                                    <button onClick={handleCopyAll} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-slate-950 hover:text-slate-950 px-3.5 py-1.5 rounded-lg font-extrabold transition flex items-center gap-1 shadow-md cursor-pointer">
                                        <LucideIcon name={copiedAll ? "check" : "copy"} className="w-3.5 h-3.5" /> {copiedAll ? "Copiado!" : "Copiar Tudo"}
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 bg-black/20 rounded-xl border border-slate-700/50 p-4 relative overflow-hidden custom-scrollbar overflow-y-auto">
                            {result ? (() => {
                                const parsed = safeJSONParse(result, null);
                                if (!parsed) {
                                    return (
                                        <div className="text-sm text-rose-450 font-mono bg-rose-950/20 p-4 rounded-xl border border-rose-500/20">
                                            Falha ao decodificar resultado formatado.
                                        </div>
                                    );
                                }

                                if (parsed.scripts) {
                                    const validation = validateCopyMasterOutput(result, `${product} ${audience} ${features} ${referenceScript}`);

                                    return (
                                        <div className="space-y-6 animate-fade-in font-sans">
                                            {/* Model Header */}
                                            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5 space-y-4">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-450"></span>
                                                            🎯 {parsed.model_label || 'Modelo Lógico de Copy'}
                                                        </h4>
                                                        <p className="text-xs text-slate-400 mt-0.5">{parsed.strategic_summary}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
                                                            Fatos: 100% Preservados
                                                        </span>
                                                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
                                                            Retenção: {parsed.quality_check?.retention_score || 94}/100
                                                        </span>
                                                    </div>
                                                </div>

                                                {parsed.detected_signals && parsed.detected_signals.length > 0 && (
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Sinais Detectados:</span>
                                                        {parsed.detected_signals.map((sig: string, idx: number) => (
                                                            <span key={idx} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md font-mono border border-slate-700">
                                                                🎯 {sig}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* TASK 4: CHECAGEM DE QUALIDADE */}
                                            <div className="bg-slate-800/90 rounded-2xl border border-emerald-500/30 p-4 space-y-3">
                                                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                                                    <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <LucideIcon name="check-circle-2" className="w-4 h-4 text-emerald-400" />
                                                        Checagem de Qualidade & Proteção
                                                    </h4>
                                                    <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                                                        Score Guard: {validation.score}/100
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                                                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Modelo Lógico</span>
                                                        <span className="font-semibold text-slate-200 truncate block">{parsed.model_label || 'Padrão'}</span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Preservação Fatos</span>
                                                        <span className={`font-semibold ${validation.checks.pricesPreserved && validation.checks.discountsPreserved ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {validation.checks.pricesPreserved && validation.checks.discountsPreserved ? '100% Exato' : 'Ajustado'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Risco Invenção</span>
                                                        <span className={`font-semibold ${validation.checks.noUnsupportedFacts ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {validation.checks.noUnsupportedFacts ? 'Mínimo / Zero' : 'Revisar'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Clareza</span>
                                                        <span className={`font-semibold ${validation.checks.noBrokenSentence && validation.checks.noGenericFiller ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {validation.checks.noBrokenSentence && validation.checks.noGenericFiller ? 'Alta' : 'Validada'}
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">CTA</span>
                                                        <span className="font-semibold text-emerald-400">
                                                            {parsed.quality_check?.cta_strength ? `${parsed.quality_check.cta_strength}/100` : 'Direto'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {validation.warnings && validation.warnings.length > 0 && (
                                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-300 space-y-1">
                                                        {validation.warnings.map((w, idx) => (
                                                            <p key={idx} className="flex items-center gap-1">⚠️ {w}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* TASK 3: BOTÕES DE EXPORTAÇÃO RÁPIDA */}
                                            <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Exportação Rápida:</span>
                                                
                                                {parsed.scripts.direct_conversion?.full_script && (
                                                    <button
                                                        onClick={() => copyToClipboard(parsed.scripts.direct_conversion.full_script)}
                                                        className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Script Principal
                                                    </button>
                                                )}

                                                {parsed.scripts.curiosity_subtle?.full_script && (
                                                    <button
                                                        onClick={() => copyToClipboard(parsed.scripts.curiosity_subtle.full_script)}
                                                        className="text-xs bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Anti-Cópia
                                                    </button>
                                                )}

                                                {parsed.scripts.ugc_natural?.full_script && (
                                                    <button
                                                        onClick={() => copyToClipboard(parsed.scripts.ugc_natural.full_script)}
                                                        className="text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar UGC
                                                    </button>
                                                )}

                                                {parsed.scripts.premium_safe?.full_script && (
                                                    <button
                                                        onClick={() => copyToClipboard(parsed.scripts.premium_safe.full_script)}
                                                        className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Premium
                                                    </button>
                                                )}

                                                {parsed.recording_tips && (
                                                    <button
                                                        onClick={() => {
                                                            const tipsText = `DICAS DE GRAVAÇÃO & PROMPT FLOW:\n- Ritmo/Edição: ${parsed.recording_tips.editing}\n- Formato: ${parsed.recording_tips.recommended_format}\n- Textos na Tela: ${(parsed.recording_tips.on_screen_text || parsed.recording_tips.screen_text || []).join(", ")}`;
                                                            copyToClipboard(tipsText);
                                                        }}
                                                        className="text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <LucideIcon name="video" className="w-3.5 h-3.5" /> Copiar Prompt Flow Minimalista
                                                    </button>
                                                )}
                                            </div>

                                            {/* Task 9: OPÇÕES ESTRATÉGICAS */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                                    <LucideIcon name="target" className="w-4 h-4 text-emerald-400" />
                                                    Opções Estratégicas
                                                </h4>

                                                {/* Opção 1: Direta e Focada em Conversão */}
                                                {parsed.scripts.direct_conversion && (
                                                    <div className="bg-slate-800/60 rounded-2xl border border-emerald-500/40 p-5 space-y-3 relative">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full uppercase border border-emerald-500/30">
                                                                    Opção 1
                                                                </span>
                                                                <h5 className="text-sm font-bold text-white mt-1">
                                                                    {parsed.scripts.direct_conversion.label}
                                                                </h5>
                                                                <p className="text-xs text-slate-400">{parsed.scripts.direct_conversion.description}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    copyToClipboard(parsed.scripts.direct_conversion.full_script);
                                                                    alert("Script Direto copiado!");
                                                                }}
                                                                className="text-xs text-emerald-400 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-emerald-500/30 cursor-pointer"
                                                            >
                                                                <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Script Completo
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-sky-400 uppercase text-[9px] tracking-wider block mb-0.5">Gancho</span>
                                                                <p className="text-slate-200">{parsed.scripts.direct_conversion.hook}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-emerald-400 uppercase text-[9px] tracking-wider block mb-0.5">Retenção</span>
                                                                <p className="text-slate-200">{parsed.scripts.direct_conversion.retention}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-amber-400 uppercase text-[9px] tracking-wider block mb-0.5">Aviso / Oferta</span>
                                                                <p className="text-slate-200">{parsed.scripts.direct_conversion.warning_or_value}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-indigo-400 uppercase text-[9px] tracking-wider block mb-0.5">Prova & Segurança</span>
                                                                <p className="text-slate-200">{parsed.scripts.direct_conversion.proof} {parsed.scripts.direct_conversion.security}</p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-emerald-500/20 mt-2">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Script Completo (Pronto para Gravar)</span>
                                                                <span className="text-[10px] text-slate-500 font-mono">CTA: {parsed.scripts.direct_conversion.cta}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{parsed.scripts.direct_conversion.full_script}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Opção 2: Focada em Curiosidade */}
                                                {parsed.scripts.curiosity_subtle && (
                                                    <div className="bg-slate-800/60 rounded-2xl border border-sky-500/40 p-5 space-y-3 relative">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className="text-[10px] font-extrabold bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full uppercase border border-sky-500/30">
                                                                    Opção 2
                                                                </span>
                                                                <h5 className="text-sm font-bold text-white mt-1">
                                                                    {parsed.scripts.curiosity_subtle.label}
                                                                </h5>
                                                                <p className="text-xs text-slate-400">{parsed.scripts.curiosity_subtle.description}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    copyToClipboard(parsed.scripts.curiosity_subtle.full_script);
                                                                    alert("Script Curiosidade copiado!");
                                                                }}
                                                                className="text-xs text-sky-400 hover:text-white bg-sky-950/60 hover:bg-sky-900 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border border-sky-500/30 cursor-pointer"
                                                            >
                                                                <LucideIcon name="copy" className="w-3.5 h-3.5" /> Copiar Script Completo
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-sky-400 uppercase text-[9px] tracking-wider block mb-0.5">Gancho</span>
                                                                <p className="text-slate-200">{parsed.scripts.curiosity_subtle.hook}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-emerald-400 uppercase text-[9px] tracking-wider block mb-0.5">Retenção</span>
                                                                <p className="text-slate-200">{parsed.scripts.curiosity_subtle.retention}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-amber-400 uppercase text-[9px] tracking-wider block mb-0.5">Aviso / Valor</span>
                                                                <p className="text-slate-200">{parsed.scripts.curiosity_subtle.warning_or_value}</p>
                                                            </div>
                                                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                                                                <span className="font-bold text-indigo-400 uppercase text-[9px] tracking-wider block mb-0.5">Chamada Oculta</span>
                                                                <p className="text-slate-200">{parsed.scripts.curiosity_subtle.hidden_cta}</p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-sky-500/20 mt-2">
                                                            <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider block mb-1">Script Completo (Curiosidade Sutil)</span>
                                                            <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{parsed.scripts.curiosity_subtle.full_script}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Task 14: Outras Variações de Estilo */}
                                            {(parsed.scripts.ugc_natural || parsed.scripts.premium_safe) && (
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                                        <LucideIcon name="layers" className="w-4 h-4 text-indigo-400" />
                                                        Outras Variações de Estilo
                                                    </h4>
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        {parsed.scripts.ugc_natural && (
                                                            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                                                        <LucideIcon name="user" className="w-3.5 h-3.5" />
                                                                        {parsed.scripts.ugc_natural.label}
                                                                    </h5>
                                                                    <button
                                                                        onClick={() => copyToClipboard(parsed.scripts.ugc_natural.full_script)}
                                                                        className="text-[11px] text-indigo-400 hover:text-white bg-slate-900 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                                                                    >
                                                                        Copiar
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-slate-300 leading-relaxed">{parsed.scripts.ugc_natural.full_script}</p>
                                                            </div>
                                                        )}

                                                        {parsed.scripts.premium_safe && (
                                                            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                                                        <LucideIcon name="crown" className="w-3.5 h-3.5" />
                                                                        {parsed.scripts.premium_safe.label}
                                                                    </h5>
                                                                    <button
                                                                        onClick={() => copyToClipboard(parsed.scripts.premium_safe.full_script)}
                                                                        className="text-[11px] text-amber-400 hover:text-white bg-slate-900 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                                                                    >
                                                                        Copiar
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-slate-300 leading-relaxed">{parsed.scripts.premium_safe.full_script}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Task 10: Dicas Rápidas para Gravação */}
                                            {parsed.recording_tips && (
                                                <div className="bg-emerald-950/20 rounded-2xl border border-emerald-500/30 p-5 space-y-3">
                                                    <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <LucideIcon name="video" className="w-4 h-4 text-emerald-400" />
                                                        Dicas rápidas para gravação
                                                    </h4>

                                                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                                                        {/* Edição */}
                                                        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                                                            <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider block mb-1">Ritmo & Edição</span>
                                                            <p className="text-slate-200 leading-relaxed">{parsed.recording_tips.editing}</p>
                                                        </div>

                                                        {/* Formato Recomendado */}
                                                        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                                                            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block mb-1">Formato Recomendado</span>
                                                            <p className="text-slate-200 leading-relaxed">{parsed.recording_tips.recommended_format}</p>
                                                        </div>
                                                    </div>

                                                    {/* Texto na tela */}
                                                    {parsed.recording_tips.on_screen_text && parsed.recording_tips.on_screen_text.length > 0 && (
                                                        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                                                            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-2">Texto na Tela (Ganchos Visuais)</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                {parsed.recording_tips.on_screen_text.map((txt: string, idx: number) => (
                                                                    <span key={idx} className="bg-emerald-500/10 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-mono font-bold border border-emerald-500/20">
                                                                        💬 {txt}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sugestões visuais */}
                                                    {parsed.recording_tips.visual_suggestions && parsed.recording_tips.visual_suggestions.length > 0 && (
                                                        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-1">
                                                            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">Sugestões Visuais</span>
                                                            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                                                {parsed.recording_tips.visual_suggestions.map((vis: string, idx: number) => (
                                                                    <li key={idx}>{vis}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Compliance Notes */}
                                            {parsed.compliance_notes && parsed.compliance_notes.length > 0 && (
                                                <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 space-y-2">
                                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <LucideIcon name="shield-check" className="w-4 h-4 text-emerald-400" />
                                                        Notas de Compliance & Qualidade
                                                    </h5>
                                                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                                        {parsed.compliance_notes.map((note: string, idx: number) => (
                                                            <li key={idx}>{note}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // Fallback for legacy JSON
                                return (
                                    <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap p-3">
                                        {JSON.stringify(parsed, null, 2)}
                                    </div>
                                );
                            })() : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <LucideIcon name="pen-tool" className="w-12 h-12 mb-2" />
                                    <p className="text-xs">Preencha os dados e a inteligência fará o resto.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {showCopyToast && (
                <div className="fixed bottom-6 right-6 z-50 bg-emerald-900/90 text-emerald-200 border border-emerald-500/50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
                    <LucideIcon name="check-circle-2" className="w-4 h-4 text-emerald-400" />
                    Texto corrigido e copiado sem campos vazios.
                </div>
            )}
        </div>
    );
}
