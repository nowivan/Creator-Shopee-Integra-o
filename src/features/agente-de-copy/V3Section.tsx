import React, { useState } from 'react';
import { AgenteDeCopyV3Result, UploadedProductImage } from './types';
import { LucideIcon } from '../../components/Common';
import { copyToClipboard } from '../../utils';

interface V3SectionProps {
    v3Result: AgenteDeCopyV3Result | null;
    isGeneratingV3: boolean;
    v3Error: string | null;
    onGenerateV3: () => void;
    productImage: UploadedProductImage | null;
    productTitle?: string;
    productPrice?: string;
    productInfo?: string;
}

export const V3Section: React.FC<V3SectionProps> = ({
    v3Result,
    isGeneratingV3,
    v3Error,
    onGenerateV3,
    productImage,
    productTitle,
    productPrice,
    productInfo
}) => {
    const [copiedRawV3, setCopiedRawV3] = useState<boolean>(false);
    const [copiedSceneKey, setCopiedSceneKey] = useState<string | null>(null);

    const handleCopyRaw = async (text: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedRawV3(true);
            setTimeout(() => setCopiedRawV3(false), 2500);
        }
    };

    const handleCopyScene = async (text: string, key: string) => {
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedSceneKey(key);
            setTimeout(() => setCopiedSceneKey(null), 2000);
        }
    };

    return (
        <div className="bg-[#0B0B0E] border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-6 font-mono text-xs animate-fade-in">
            {/* V3 Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/40 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                        ⚡
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                            AGENTE DE COPY V3 — ORIGINAL BRAIN + STRUCTURED OUTPUT
                            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-extrabold">
                                EXPERIMENTAL
                            </span>
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                            Executa o cérebro original (<strong>AGENTE_DE_COPY_BRAIN</strong>) com contrato de saída estruturado (<code>responseMimeType: application/json</code>) em monobloco.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onGenerateV3}
                    disabled={isGeneratingV3 || !productImage}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 shrink-0"
                >
                    {isGeneratingV3 ? (
                        <>
                            <LucideIcon name="loader-2" className="w-4 h-4 animate-spin text-white" />
                            <span>GERANDO COM V3 JSON...</span>
                        </>
                    ) : (
                        <>
                            <LucideIcon name="sparkles" className="w-4 h-4 text-white" />
                            <span>GERAR COM V3 JSON</span>
                        </>
                    )}
                </button>
            </div>

            {/* Error Display */}
            {v3Error && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                        <LucideIcon name="alert-circle" className="w-4 h-4 text-red-400" />
                        <span>FALHA NA EXECUÇÃO V3:</span>
                    </div>
                    <p className="text-[11px] font-sans text-red-200">{v3Error}</p>
                </div>
            )}

            {/* Results Display */}
            {v3Result && (
                <div className="space-y-6">
                    {/* Top 4 Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {/* Card 1: HTTP & Model */}
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold block">Status & Modelo</span>
                            <div className="flex items-center justify-between">
                                <span className="text-emerald-400 font-bold">{v3Result.httpStatus}</span>
                                <span className="text-[10px] text-emerald-400 font-mono">{v3Result.executedModel || 'gemini-3.5-flash'}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block font-mono">
                                {v3Result.rawLength} chars | {v3Result.finishReason}
                            </span>
                        </div>

                        {/* Card 2: JSON Parse & Contract */}
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold block">Parse JSON & Contrato</span>
                            <div className="flex items-center justify-between">
                                <span className={`font-bold ${v3Result.contractStatus === 'PASS' ? 'text-emerald-400' : (v3Result.contractStatus === 'PARTIAL' ? 'text-amber-400' : 'text-red-400')}`}>
                                    {v3Result.variationsRecoveredCount}/6 Versões
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                                    v3Result.contractStatus === 'PASS'
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                        : (v3Result.contractStatus === 'PARTIAL' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'bg-red-950 text-red-400 border border-red-800/60')
                                }`}>
                                    JSON {v3Result.jsonParseStatus}
                                </span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block font-mono">
                                Contrato: <strong className={v3Result.contractStatus === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}>{v3Result.contractStatus}</strong>
                            </span>
                        </div>

                        {/* Card 3: Character Compliance */}
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold block">Conformidade de Chars</span>
                            <div className="flex items-center justify-between">
                                <span className={`font-bold ${v3Result.validation.characterComplianceCount >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {v3Result.validation.characterComplianceCount} / {v3Result.variationsRecoveredCount * 2} Cenas
                                </span>
                                <span className="text-[10px] text-neutral-400">160–175 chars</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block font-mono">
                                C2: {v3Result.validation.scene2PresentCount}/6 | C3: {v3Result.validation.scene3PresentCount}/6
                            </span>
                        </div>

                        {/* Card 4: Guidelines & Prohibitions */}
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold block">Diretrizes & Proibições</span>
                            <div className="flex items-center justify-between">
                                <span className="text-neutral-300">Carrinho Laranja:</span>
                                <span className={v3Result.validation.carrinhoLaranjaCount === 6 ? 'text-emerald-400 font-bold' : (v3Result.validation.carrinhoLaranjaCount > 0 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold')}>
                                    {v3Result.validation.carrinhoLaranjaCount}/6
                                </span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block truncate">
                                Preço: {v3Result.validation.explicitPrice ? 'SIM (VIOL.)' : 'NÃO'} | Desconto: {v3Result.validation.discountClaim ? 'SIM' : 'NÃO'}
                            </span>
                        </div>
                    </div>

                    {/* Diagnostics & Observability Box */}
                    <div className="bg-neutral-950 p-4 rounded-xl border border-emerald-500/40 space-y-4 font-mono text-xs shadow-lg">
                        <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                                <LucideIcon name="activity" className="w-4 h-4 text-emerald-400" />
                                DIAGNÓSTICO & CHECKPOINTS V3
                            </h4>
                            <span className="text-[10px] text-neutral-400">
                                L0 → L6 Rastreamento de Comprimento
                            </span>
                        </div>

                        {/* Parameter Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800">
                                <span className="text-neutral-500 block uppercase font-bold text-[9px]">MODEL:</span>
                                <span className="text-emerald-300 font-bold">{v3Result.diagnostics.model}</span>
                            </div>
                            <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800">
                                <span className="text-neutral-500 block uppercase font-bold text-[9px]">FINISH REASON:</span>
                                <span className={`font-bold ${v3Result.diagnostics.finishReason === 'STOP' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {v3Result.diagnostics.finishReason}
                                </span>
                            </div>
                            <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800">
                                <span className="text-neutral-500 block uppercase font-bold text-[9px]">OUTPUT TOKENS:</span>
                                <span className="text-neutral-200 font-bold">{v3Result.diagnostics.outputTokenCount ?? 'N/D'}</span>
                            </div>
                            <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800">
                                <span className="text-neutral-500 block uppercase font-bold text-[9px]">CANDIDATE PARTS:</span>
                                <span className="text-neutral-200 font-bold">{v3Result.diagnostics.candidatePartsCount} parte(s)</span>
                            </div>
                        </div>

                        {/* Numeric Checkpoints L0 -> L6 */}
                        <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 space-y-2">
                            <span className="text-[10px] text-neutral-400 block font-bold uppercase">
                                CHECKPOINTS NUMÉRICOS DE COMPRIMENTO (L0 → L6):
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 text-center text-[10px]">
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L0 Gemini</span>
                                    <span className="font-bold text-neutral-200">{v3Result.diagnostics.checkpoints.L0_geminiCandidate} ch</span>
                                </div>
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L1 Worker</span>
                                    <span className="font-bold text-neutral-200">{v3Result.diagnostics.checkpoints.L1_worker} ch</span>
                                </div>
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L2 Server</span>
                                    <span className="font-bold text-neutral-200">{v3Result.diagnostics.checkpoints.L2_serverReceived} ch</span>
                                </div>
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L3 Proxy</span>
                                    <span className="font-bold text-neutral-200">{v3Result.diagnostics.checkpoints.L3_apiProxy} ch</span>
                                </div>
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L4 PostWorker</span>
                                    <span className="font-bold text-neutral-200">{v3Result.diagnostics.checkpoints.L4_postToWorker} ch</span>
                                </div>
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L5 V3Raw</span>
                                    <span className="font-bold text-neutral-200">{v3Result.diagnostics.checkpoints.L5_v3RawText} ch</span>
                                </div>
                                <div className="bg-black/80 p-2 rounded border border-neutral-800">
                                    <span className="text-neutral-500 block text-[9px]">L6 ParserIn</span>
                                    <span className="font-bold text-emerald-400">{v3Result.diagnostics.checkpoints.L6_parserInput} ch</span>
                                </div>
                            </div>
                        </div>

                        {/* Rules & Prohibitions Matrix */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                            {/* Prohibitions */}
                            <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                                <span className="text-[10px] text-neutral-400 font-bold uppercase block border-b border-neutral-800 pb-1">
                                    Auditoria de Proibições:
                                </span>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Cena 1 Proibida:</span>
                                    <span className={v3Result.validation.scene1Detected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Preço Explícito:</span>
                                    <span className={v3Result.validation.explicitPrice ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.explicitPrice ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Preço Exato Informado Vazou:</span>
                                    <span className={v3Result.validation.exactPriceLeak ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.exactPriceLeak ? 'SIM (VAZOU)' : 'NÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Alegação de Desconto:</span>
                                    <span className={v3Result.validation.discountClaim ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.discountClaim ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Estoque Inventado:</span>
                                    <span className={v3Result.validation.inventedStock ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.inventedStock ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Prazo Inventado:</span>
                                    <span className={v3Result.validation.inventedDeadline ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.inventedDeadline ? 'SIM (VIOLAÇÃO)' : 'NÃO'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-neutral-400">Preâmbulo / Explicação:</span>
                                    <span className={v3Result.validation.preambleDetected ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                        {v3Result.validation.preambleDetected ? 'SIM (DETECTADO)' : 'NÃO'}
                                    </span>
                                </div>
                            </div>

                            {/* Character Breakdown */}
                            <div className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800 space-y-1.5">
                                <span className="text-[10px] text-neutral-400 font-bold uppercase block border-b border-neutral-800 pb-1">
                                    Contrato de Caracteres (160–175):
                                </span>
                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    {v3Result.validation.sceneDetails.map(d => (
                                        <div key={d.versionNumber} className="bg-black/60 p-1.5 rounded border border-neutral-800 flex items-center justify-between">
                                            <span className="font-bold text-neutral-300">V{d.versionNumber}:</span>
                                            <div className="flex items-center gap-1">
                                                <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                                                    d.scene2Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                }`}>
                                                    C2: {d.scene2Length} ch
                                                </span>
                                                <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                                                    d.scene3Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                }`}>
                                                    C3: {d.scene3Length} ch
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Variations Cards */}
                    {v3Result.variations.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                                    <LucideIcon name="file-text" className="w-4 h-4 text-emerald-400" />
                                    Versões Extraídas V3 ({v3Result.variations.length}/6 variações recuperadas)
                                </h4>
                                <span className="text-[10px] text-neutral-400">
                                    Parsed directly from JSON structure
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {v3Result.variations.map((v) => {
                                    const s2Len = v.scene2.length;
                                    const s3Len = v.scene3.length;
                                    const s2Valid = s2Len >= 160 && s2Len <= 175;
                                    const s3Valid = s3Len >= 160 && s3Len <= 175;

                                    return (
                                        <div
                                            key={v.id}
                                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-emerald-500/40 transition shadow-md"
                                        >
                                            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                                                <span className="font-bold text-neutral-200 text-xs tracking-wider flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    VERSÃO {v.id}
                                                </span>
                                                <button
                                                    onClick={() => handleCopyScene(`VERSÃO ${v.id}\n\nCENA 2:\n${v.scene2}\n\nCENA 3:\n${v.scene3}`, `v3_full_${v.id}`)}
                                                    className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-1 cursor-pointer"
                                                >
                                                    <LucideIcon name="copy" className="w-3 h-3" />
                                                    <span>{copiedSceneKey === `v3_full_${v.id}` ? 'COPIADO' : 'COPIAR V' + v.id}</span>
                                                </button>
                                            </div>

                                            {/* Scene 2 Box */}
                                            <div className="space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">
                                                        CENA 2 (Benefícios, Desejo & Resultado)
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                                            s2Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                        }`}>
                                                            {s2Len} ch
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyScene(v.scene2, `v3_s2_${v.id}`)}
                                                            className="text-[9px] text-neutral-400 hover:text-white transition cursor-pointer"
                                                            title="Copiar Cena 2"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-neutral-200 leading-relaxed font-sans select-text">
                                                    {v.scene2}
                                                </p>
                                            </div>

                                            {/* Scene 3 Box */}
                                            <div className="space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-850">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                                                        CENA 3 (Urgência, Medo & Carrinho Laranja)
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                                            s3Valid ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                                        }`}>
                                                            {s3Len} ch
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyScene(v.scene3, `v3_s3_${v.id}`)}
                                                            className="text-[9px] text-neutral-400 hover:text-white transition cursor-pointer"
                                                            title="Copiar Cena 3"
                                                        >
                                                            <LucideIcon name="copy" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] text-neutral-200 leading-relaxed font-sans select-text">
                                                    {v.scene3}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Raw Response Block */}
                    <div className="space-y-2 pt-3 border-t border-neutral-800">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-2">
                                <LucideIcon name="code" className="w-3.5 h-3.5 text-neutral-400" />
                                RAW JSON Output V3 ({v3Result.rawLength} caracteres)
                            </label>
                            <button
                                onClick={() => handleCopyRaw(v3Result.rawText)}
                                className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <LucideIcon name="copy" className="w-3 h-3" />
                                <span>{copiedRawV3 ? 'COPIADO!' : 'COPIAR RAW JSON'}</span>
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-neutral-300 bg-black p-4 rounded-xl border border-neutral-800 max-h-96 overflow-y-auto select-text">
                            {v3Result.rawText || '<Nenhum JSON retornado>'}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
