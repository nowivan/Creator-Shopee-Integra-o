import React from 'react';
import { LucideIcon } from '../Common';
import { ToolCostItem } from '../../services/costIntelligenceService';
import { formatCurrencyBrl, formatCurrencyUsd, formatTokenCount } from '../../services/aiPricingRegistry';

interface ToolCostRankingTableProps {
  items: ToolCostItem[];
  hasData: boolean;
  currency: 'BRL' | 'USD';
  onOpenTool?: (toolId: string) => void;
}

export function ToolCostRankingTable({
  items,
  hasData,
  currency,
  onOpenTool
}: ToolCostRankingTableProps) {
  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LucideIcon name="layers" className="w-4 h-4 text-indigo-400" />
            Custo por Ferramenta
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distribuição de tokens e despesa consolidada por módulo operacional
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          {items.length} módulos com uso
        </span>
      </div>

      {/* Table Content */}
      <div className="mt-4 overflow-x-auto custom-scrollbar">
        {!hasData || items.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <LucideIcon name="database" className="w-10 h-10 mb-2 opacity-30 mx-auto text-indigo-400" />
            <p className="text-sm font-semibold text-slate-400">Nenhum custo registrado para o período.</p>
            <p className="text-xs text-slate-500 mt-1">Conforme novas gerações forem concluídas, o ranking será preenchido.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3">Ferramenta</th>
                <th className="py-3 px-3 text-right">Execuções</th>
                <th className="py-3 px-3 text-right">Input Tokens</th>
                <th className="py-3 px-3 text-right">Output Tokens</th>
                <th className="py-3 px-3 text-right">Tokens Totais</th>
                <th className="py-3 px-3 text-right">Custo Total</th>
                <th className="py-3 px-3 text-right">Custo Médio</th>
                <th className="py-3 px-3 text-right">% Global</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {items.map(tool => (
                <tr
                  key={tool.toolId}
                  onClick={() => onOpenTool && onOpenTool(tool.toolId)}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                >
                  {/* Tool Name */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/40 group-hover:bg-emerald-400 transition-colors" />
                      <div>
                        <div className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                          {tool.toolLabel}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {tool.toolCategory}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Execuções */}
                  <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">
                    {tool.executions}
                  </td>

                  {/* Input Tokens */}
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    {formatTokenCount(tool.inputTokens)}
                  </td>

                  {/* Output Tokens */}
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    {formatTokenCount(tool.outputTokens)}
                  </td>

                  {/* Total Tokens */}
                  <td className="py-3 px-3 text-right font-mono text-cyan-400 font-semibold">
                    {formatTokenCount(tool.totalTokens)}
                  </td>

                  {/* Custo Total */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {currency === 'BRL'
                      ? formatCurrencyBrl(tool.totalCostBrl)
                      : formatCurrencyUsd(tool.totalCostUsd)}
                  </td>

                  {/* Custo Médio */}
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {tool.avgCostPerRequestBrl !== null
                      ? currency === 'BRL'
                        ? formatCurrencyBrl(tool.avgCostPerRequestBrl)
                        : formatCurrencyUsd(tool.totalCostUsd / Math.max(1, tool.executions))
                      : '—'}
                  </td>

                  {/* % do Custo Global */}
                  <td className="py-3 px-3 text-right font-mono text-indigo-400 font-bold">
                    {tool.percentageOfGlobalCost}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
