import React from 'react';
import { LucideIcon } from '../Common';
import { ModelIntelligenceItem } from '../../services/costIntelligenceService';
import { formatCurrencyBrl, formatCurrencyUsd, formatTokenCount } from '../../services/aiPricingRegistry';

interface ModelIntelligenceTableProps {
  items: ModelIntelligenceItem[];
  hasData: boolean;
  currency: 'BRL' | 'USD';
}

export function ModelIntelligenceTable({
  items,
  hasData,
  currency
}: ModelIntelligenceTableProps) {
  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LucideIcon name="sparkles" className="w-4 h-4 text-purple-400" />
            Inteligência por Modelo de IA
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Consumo, custo unitário e taxa de participação por modelo do catálogo
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          Auditoria Centralizada
        </span>
      </div>

      {/* Content */}
      <div className="mt-4 overflow-x-auto custom-scrollbar">
        {!hasData || items.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <LucideIcon name="cpu" className="w-10 h-10 mb-2 opacity-30 mx-auto text-purple-400" />
            <p className="text-sm font-semibold text-slate-400">Nenhum modelo acionado no período.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3">Modelo</th>
                <th className="py-3 px-3">Provedor</th>
                <th className="py-3 px-3 text-right">Requisições</th>
                <th className="py-3 px-3 text-right">Tokens Totais</th>
                <th className="py-3 px-3 text-right">Custo Total</th>
                <th className="py-3 px-3 text-right">Custo Médio</th>
                <th className="py-3 px-3 text-right">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {items.map(model => (
                <tr key={model.modelKey} className="hover:bg-slate-800/40 transition-colors">
                  {/* Model Name */}
                  <td className="py-3 px-3 font-bold text-slate-200 font-mono">
                    {model.displayName}
                  </td>

                  {/* Provider */}
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {model.provider}
                  </td>

                  {/* Requests */}
                  <td className="py-3 px-3 text-right font-mono text-slate-200">
                    {model.requestsCount}
                  </td>

                  {/* Total Tokens */}
                  <td className="py-3 px-3 text-right font-mono text-cyan-400 font-semibold">
                    {formatTokenCount(model.totalTokens)}
                  </td>

                  {/* Total Cost */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {currency === 'BRL'
                      ? formatCurrencyBrl(model.totalCostBrl)
                      : formatCurrencyUsd(model.totalCostUsd)}
                  </td>

                  {/* Avg Cost */}
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {model.avgCostPerRequestBrl !== null
                      ? currency === 'BRL'
                        ? formatCurrencyBrl(model.avgCostPerRequestBrl)
                        : formatCurrencyUsd(model.totalCostUsd / Math.max(1, model.requestsCount))
                      : '—'}
                  </td>

                  {/* Share % */}
                  <td className="py-3 px-3 text-right font-mono text-purple-400 font-bold">
                    {model.sharePercent}%
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
