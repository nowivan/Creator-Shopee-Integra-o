import { AgentCopyVariation, AgenteDeCopyValidationResult, SceneCharacterCount, CheckpointCDiagnostic } from './types';
import { validateCopyContract, COPY_CONTRACT } from '../copy-contract';

/**
 * Deterministic text fingerprint for transport/extraction validation.
 */
export function computeTextFingerprint(text: string): string {
    if (!text || typeof text !== 'string') return 'EMPTY_0';
    const len = text.length;
    const start20 = text.slice(0, 20).replace(/[\r\n\t]+/g, ' ');
    const end20 = text.slice(-20).replace(/[\r\n\t]+/g, ' ');
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const hexHash = (hash >>> 0).toString(16).padStart(8, '0');
    return `LEN_${len}_H_${hexHash}_S[${start20}]_E[${end20}]`;
}

/**
 * Detects indexed character annotations or textual corruption patterns like e(111), (111), a(120), 110)e(111).
 */
export function detectCorruptionPattern(text: string): { hasIndexPattern: boolean; matches: string[] } {
    if (!text || typeof text !== 'string') {
        return { hasIndexPattern: false, matches: [] };
    }
    const indexRegex = /(?:[a-zA-Z0-9_]\(\d+\)|\(\d+\)[a-zA-Z0-9_]|\b\d{1,4}\)[a-zA-Z]|\(\d{2,5}\))/g;
    const rawMatches = text.match(indexRegex) || [];
    const uniqueMatches = Array.from(new Set(rawMatches)).slice(0, 10);
    return {
        hasIndexPattern: rawMatches.length > 0,
        matches: uniqueMatches
    };
}

export interface ParseAgenteDeCopyDetails {
    variations: AgentCopyVariation[];
    versionBlocksDetected: number;
    scene2BlocksDetected: number;
    scene3BlocksDetected: number;
    exactParserError: string | null;
    checkpointC?: Omit<CheckpointCDiagnostic, 'bEqualsC'>;
}

/**
 * Enhanced Robust Parser for Agente de Copy.
 * Parses raw Agent output into structured AgentCopyVariation[].
 *
 * CRITICAL REQUIREMENTS:
 * - Must NOT rewrite the copies.
 * - Must NOT improve grammar.
 * - Must NOT shorten or expand text locally.
 * - Must NOT generate missing marketing content or use fallback templates.
 * - Strictly extracts what the model produced.
 */
export function parseAgenteDeCopyOutput(rawText: string): ParseAgenteDeCopyDetails {
    // CHECKPOINT C: Captured immediately at entry point before any trim/cleaning
    const cTextLength = typeof rawText === 'string' ? rawText.length : 0;
    const cSample100 = typeof rawText === 'string' ? rawText.slice(0, 100) : '';
    const cCorruption = detectCorruptionPattern(rawText || '');
    const cFingerprint = computeTextFingerprint(rawText || '');

    const checkpointC: Omit<CheckpointCDiagnostic, 'bEqualsC'> = {
        textLength: cTextLength,
        sample100: cSample100,
        hasIndexPattern: cCorruption.hasIndexPattern,
        fingerprint: cFingerprint
    };

    let exactParserError: string | null = null;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        return {
            variations: [],
            versionBlocksDetected: 0,
            scene2BlocksDetected: 0,
            scene3BlocksDetected: 0,
            exactParserError: 'Texto de entrada vazio ou não textual retornado pelo modelo.',
            checkpointC
        };
    }

    const text = rawText.trim();
    const variations: AgentCopyVariation[] = [];

    // Count Scene 2 and Scene 3 occurrences across the raw text
    const scene2GlobalRegex = /(?:^|\n|\*\*)\s*(?:[-*•#\d\.\)\(\]]+\s*)?(?:\*\*)?(?:CENA|Cena|cena)\s*2/gi;
    const scene3GlobalRegex = /(?:^|\n|\*\*)\s*(?:[-*•#\d\.\)\(\]]+\s*)?(?:\*\*)?(?:CENA|Cena|cena)\s*3/gi;
    const scene2Matches = text.match(scene2GlobalRegex) || [];
    const scene3Matches = text.match(scene3GlobalRegex) || [];
    const scene2BlocksDetected = scene2Matches.length;
    const scene3BlocksDetected = scene3Matches.length;

    // Comprehensive regex to find version header boundaries
    // Matches patterns like:
    // "VERSÃO 1", "VERSAO 1", "Versão 1", "Versão 01", "V1"
    // "**VERSÃO 1**", "**VERSÃO 1:**", "### VERSÃO 1", "1. VERSÃO 1", "1. **VERSÃO 1**"
    // "- **VERSÃO 1**", "* **VERSÃO 1**", "[VERSÃO 1]", "## VERSÃO 1:", "VERSÃO 1 - CENA 2 E CENA 3"
    const versionHeaderRegex = /(?:^|\n)\s*(?:[-*•#\d\.\)\(\]]+\s*)?(?:\*\*)?(?:VERS[ÃA]O|VERSAO|Vers[ãa]o|vers[ãa]o|VARIATION|Variation|variation|V)\s*0?([1-6])(?:\*\*)?(?:[^\n\r]*)/gi;

    const matches: Array<{ versionNumber: number; startIndex: number; headerLength: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = versionHeaderRegex.exec(text)) !== null) {
        matches.push({
            versionNumber: parseInt(match[1], 10),
            startIndex: match.index,
            headerLength: match[0].length
        });
    }

    const versionBlocksDetected = matches.length;

    try {
        if (matches.length > 0) {
            for (let i = 0; i < matches.length; i++) {
                const current = matches[i];
                const next = matches[i + 1];
                const sectionText = text.substring(
                    current.startIndex + current.headerLength,
                    next ? next.startIndex : text.length
                ).trim();

                const { scene2, scene3 } = extractScenesFromSection(sectionText);

                if (scene2 || scene3) {
                    variations.push({
                        id: current.versionNumber || (i + 1),
                        scene2: scene2.trim(),
                        scene3: scene3.trim()
                    });
                }
            }
        } else {
            // Fallback: splitting by CENA 2 blocks if version headers were omitted
            const cena2SplitRegex = /(?:^|\n)\s*(?:[-*•#\d\.\)\(\]]+\s*)?(?:\*\*)?(?:CENA|Cena|cena)\s*2(?:\*\*)?(?:[^\n\r:]*)?:?/gi;
            const cena2MatchesList: number[] = [];
            let c2Match: RegExpExecArray | null;
            while ((c2Match = cena2SplitRegex.exec(text)) !== null) {
                cena2MatchesList.push(c2Match.index);
            }

            if (cena2MatchesList.length > 0) {
                for (let i = 0; i < cena2MatchesList.length; i++) {
                    const startIdx = cena2MatchesList[i];
                    const endIdx = cena2MatchesList[i + 1] !== undefined ? cena2MatchesList[i + 1] : text.length;
                    const section = text.substring(startIdx, endIdx).trim();
                    const { scene2, scene3 } = extractScenesFromSection(section);
                    if (scene2 || scene3) {
                        variations.push({
                            id: i + 1,
                            scene2: scene2.trim(),
                            scene3: scene3.trim()
                        });
                    }
                }
            }
        }

        if (variations.length === 0) {
            exactParserError = `Nenhuma versão válida foi extraída do texto (${versionBlocksDetected} cabeçalhos de versão, ${scene2BlocksDetected} marcadores de Cena 2 e ${scene3BlocksDetected} marcadores de Cena 3 encontrados).`;
        } else if (variations.length < 6) {
            exactParserError = `Apenas ${variations.length} versões de 6 foram extraídas com sucesso.`;
        }
    } catch (err: any) {
        exactParserError = err?.message || 'Erro inesperado durante a execução do parser.';
    }

    return {
        variations,
        versionBlocksDetected,
        scene2BlocksDetected,
        scene3BlocksDetected,
        exactParserError,
        checkpointC
    };
}

/**
 * Extracts CENA 2 and CENA 3 text from a version block.
 * Strips any accidental CENA 1 markers without altering the words.
 */
function extractScenesFromSection(section: string): { scene2: string; scene3: string } {
    let scene2 = '';
    let scene3 = '';

    // Regex for CENA 2 header
    // Matches: "CENA 2:", "**CENA 2:**", "**CENA 2**:", "CENA 2 (Benefício):", "Cena 2 - ...", "### CENA 2", etc.
    const scene2HeaderPattern = /(?:^|\n)\s*(?:[-*•#\d\.\)\(\]]+\s*)?(?:\*\*)?(?:CENA|Cena|cena)\s*2(?:\*\*)?(?:[^\n\r:]*)?:?\s*/i;
    
    // Regex for CENA 3 header
    // Matches: "CENA 3:", "**CENA 3:**", "**CENA 3**:", "CENA 3 (Urgência & CTA):", "Cena 3 - ...", "### CENA 3", etc.
    const scene3HeaderPattern = /(?:^|\n)\s*(?:[-*•#\d\.\)\(\]]+\s*)?(?:\*\*)?(?:CENA|Cena|cena)\s*3(?:\*\*)?(?:[^\n\r:]*)?:?\s*/i;

    const scene2HeaderMatch = section.match(scene2HeaderPattern);
    const scene3HeaderMatch = section.match(scene3HeaderPattern);

    if (scene2HeaderMatch && scene2HeaderMatch.index !== undefined) {
        const scene2Start = scene2HeaderMatch.index + scene2HeaderMatch[0].length;
        const scene2End = scene3HeaderMatch && scene3HeaderMatch.index !== undefined && scene3HeaderMatch.index > scene2Start
            ? scene3HeaderMatch.index
            : section.length;

        scene2 = cleanCopyText(section.substring(scene2Start, scene2End));
    }

    if (scene3HeaderMatch && scene3HeaderMatch.index !== undefined) {
        const scene3Start = scene3HeaderMatch.index + scene3HeaderMatch[0].length;
        scene3 = cleanCopyText(section.substring(scene3Start));
    }

    return { scene2, scene3 };
}

/**
 * Cleans surrounding markdown quotes and metadata annotations without changing internal copy wording.
 */
function cleanCopyText(raw: string): string {
    let cleaned = raw.trim();
    
    // Strip leading/trailing surrounding quotation marks if they wrap the entire copy
    cleaned = cleaned.replace(/^["'“]([\s\S]*)["'”]$/, '$1').trim();
    cleaned = cleaned.replace(/^"([\s\S]*)"$/, '$1').trim();
    
    // Strip leading/trailing surrounding bold markdown
    cleaned = cleaned.replace(/^\*\*([\s\S]*)\*\*$/, '$1').trim();

    // Strip leading metadata annotations like "(165 caracteres):" or "[170 chars]:"
    cleaned = cleaned.replace(/^(?:\(\s*\d+\s*(?:caracteres|caracteres\s*totais|chars|letras)?\s*\)|\[\s*\d+\s*(?:caracteres|chars)?\s*\])\s*:?\s*/i, '').trim();

    // Strip trailing metadata annotations like "(165 caracteres)"
    cleaned = cleaned.replace(/\s*(?:\(\s*\d+\s*(?:caracteres|chars|letras)?\s*\)|\[\s*\d+\s*(?:caracteres|chars)?\s*\])\s*$/i, '').trim();

    // Strip trailing markdown separators or extra trailing linebreaks
    cleaned = cleaned.replace(/\s*---\s*$/, '').trim();
    
    return cleaned;
}

/**
 * Validates the strict output contract and 160-175 character range for all 12 scenes.
 */
export function validateAgenteDeCopyContract(variations: AgentCopyVariation[]): AgenteDeCopyValidationResult {
    const issues: string[] = [];
    const characterCounts: SceneCharacterCount[] = [];

    if (!variations || !Array.isArray(variations) || variations.length === 0) {
        return {
            valid: false,
            isStrictRangeMet: false,
            issues: ['Nenhuma variação estruturada foi recebida do modelo.'],
            characterCounts: []
        };
    }

    if (variations.length !== 6) {
        issues.push(`Esperava exatamente 6 versões, mas foram extraídas ${variations.length} versões.`);
    }

    let allScenesValid = true;

    for (let i = 1; i <= 6; i++) {
        const variation = variations.find(v => v.id === i);
        if (!variation) {
            issues.push(`Versão ${i} está ausente.`);
            allScenesValid = false;
            continue;
        }

        const s2Validation = validateCopyContract(variation.scene2 || '');
        const s3Validation = validateCopyContract(variation.scene3 || '');

        const s2Valid = s2Validation.valid;
        const s3Valid = s3Validation.valid;

        if (!s2Valid || !s3Valid) {
            allScenesValid = false;
        }

        characterCounts.push({
            id: variation.id,
            scene2Length: s2Validation.charCount,
            scene3Length: s3Validation.charCount,
            scene2Valid: s2Valid,
            scene3Valid: s3Valid
        });

        if (!variation.scene2 || variation.scene2.trim().length === 0) {
            issues.push(`Versão ${i}: CENA 2 está vazia.`);
        } else if (!s2Valid) {
            issues.push(`Versão ${i} (Cena 2): ${s2Validation.charCount} caracteres (${s2Validation.errors.join('; ')}).`);
        }

        if (!variation.scene3 || variation.scene3.trim().length === 0) {
            issues.push(`Versão ${i}: CENA 3 está vazia.`);
        } else if (!s3Valid) {
            issues.push(`Versão ${i} (Cena 3): ${s3Validation.charCount} caracteres (${s3Validation.errors.join('; ')}).`);
        }
    }

    const isValid = variations.length === 6 && allScenesValid && issues.length === 0;

    return {
        valid: isValid,
        isStrictRangeMet: allScenesValid,
        issues,
        characterCounts
    };
}
