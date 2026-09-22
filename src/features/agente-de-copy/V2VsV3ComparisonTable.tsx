import React from 'react';
import { AgenteDeCopyV2Result, AgenteDeCopyV3Result } from './types';
import { LucideIcon } from '../../components/Common';

interface V2VsV3ComparisonTableProps {
    v2Result: AgenteDeCopyV2Result | null;
    v3Result: AgenteDeCopyV3Result | null;
}

export const V2VsV3ComparisonTable: React.FC<V2VsV3ComparisonTableProps> = ({
    v2Result,
    v3Result
}) => {
    if (!v2Result && !v3Result) {
        return null;
    }

    // Helper to calculate V2 violations/counts
    const v2Versions = v2Result ? `${v2Result.structure.versionsDetected}/6` : '—';
    const v3Versions = v3Result ? `${v3Result.variationsRecoveredCount}/6` : '—';

    const v2Chars = v2Result ? `${v2Result.characterCompliance.compliantCount}/12` : '—';
    const v3Chars = v3Result ? `${v3Result.validation.characterComplianceCount}/12` : '—';

    const v2CTA = v2Result ? (v2Result.violations.carrinhoLaranjaPresent ? '6/6 (ou presente)' : '0/6') : '—';
    const v3CTA = v3Result ? `${v3Result.validation.carrinhoLaranjaCount}/6` : '—';

    const v2RawLen = v2Result ? `${v2Result.rawLength} chars` : '—';
    const v3RawLen = v3Result ? `${v3Result.rawLength} chars` : '—';

    const v2Tokens = v2Result?.truncationDiag?.outputTokenCount ?? 'N/D';
    const v3Tokens = v3Result?.diagnostics.outputTokenCount ?? 'N/D';

    const v2Finish = v2Result ? v2Result.finishReason : '—';
    const v3Finish = v3Result ? v3Result.finishReason : '—';

    const v2Price = v2Result ? (v2Result.violations.priceDetected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';
    const v3Price = v3Result ? (v3Result.validation.explicitPrice ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';

    const v2ExactPrice = v2Result ? (v2Result.violations.exactPriceLeakDetected ? 'SIM (VAZOU)' : 'NÃO') : '—';
    const v3ExactPrice = v3Result ? (v3Result.validation.exactPriceLeak ? 'SIM (VAZOU)' : 'NÃO') : '—';

    const v2Discount = v2Result ? (v2Result.violations.discountDetected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';
    const v3Discount = v3Result ? (v3Result.validation.discountClaim ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';

    const v2Stock = v2Result ? (v2Result.violations.stockDetected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';
    const v3Stock = v3Result ? (v3Result.validation.inventedStock ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';

    const v2Deadline = v2Result ? (v2Result.violations.deadlinesDetected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';
    const v3Deadline = v3Result ? (v3Result.validation.inventedDeadline ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';

    const v2Scene1 = v2Result ? (v2Result.structure.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';
    const v3Scene1 = v3Result ? (v3Result.validation.scene1Detected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';

    const v2Preamble = v2Result ? (v2Result.violations.preambleDetected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';
    const v3Preamble = v3Result ? (v3Result.validation.preambleDetected ? 'SIM (VIOLAÇÃO)' : 'NÃO') : '—';

    return (
        <div className="bg-[#0B0B0E] border-2 border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                        📊
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                            COMPARAÇÃO FACTUAL DE RESULTADOS: V2 (TEXTO LIVRE) VS V3 (JSON ESTRUTURADO)
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                            Mesmo Cérebro Original (<code className="text-emerald-400 font-mono">AGENTE_DE_COPY_BRAIN</code>) • Mesma Entrega Monobloco • Sem Retries • Sem Mocks
                        </p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 text-[10px] uppercase font-bold">
                            <th className="py-2.5 px-3">Métrica / Critério</th>
                            <th className="py-2.5 px-3 text-center bg-cyan-950/20 text-cyan-300 border-x border-neutral-800">
                                V2 (Texto Livre)
                            </th>
                            <th className="py-2.5 px-3 text-center bg-emerald-950/20 text-emerald-300">
                                V3 (JSON Estruturado)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-[11px]">
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Versões Extraídas</td>
                            <td className="py-2 px-3 text-center font-bold text-cyan-400 border-x border-neutral-800">{v2Versions}</td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-400">{v3Versions}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Conformidade Chars (160–175)</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-200 border-x border-neutral-800">{v2Chars}</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-200">{v3Chars}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Carrinho Laranja (CTA)</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-200 border-x border-neutral-800">{v2CTA}</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-200">{v3CTA}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Comprimento RAW (chars)</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-300 border-x border-neutral-800">{v2RawLen}</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-300">{v3RawLen}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Tokens de Saída</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-300 border-x border-neutral-800">{v2Tokens}</td>
                            <td className="py-2 px-3 text-center font-mono text-neutral-300">{v3Tokens}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Gemini finishReason</td>
                            <td className="py-2 px-3 text-center font-bold text-neutral-200 border-x border-neutral-800">{v2Finish}</td>
                            <td className="py-2 px-3 text-center font-bold text-neutral-200">{v3Finish}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Cena 1 Detectada (Proibido)</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2Scene1}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3Scene1}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Preço Explícito</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2Price}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3Price}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Preço Exato Fornecido Vazou</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2ExactPrice}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3ExactPrice}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Alegação de Desconto Inventado</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2Discount}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3Discount}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Estoque Inventado</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2Stock}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3Stock}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Prazo Inventado</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2Deadline}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3Deadline}</td>
                        </tr>
                        <tr className="hover:bg-neutral-900/30">
                            <td className="py-2 px-3 text-neutral-300 font-medium">Preâmbulo / Explicação</td>
                            <td className="py-2 px-3 text-center text-neutral-200 border-x border-neutral-800">{v2Preamble}</td>
                            <td className="py-2 px-3 text-center text-neutral-200">{v3Preamble}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p className="text-[10px] text-neutral-500 italic font-sans pt-1">
                * Comparação estritamente factual e diagnóstica. Nenhum vencedor automático é declarado.
            </p>
        </div>
    );
};
