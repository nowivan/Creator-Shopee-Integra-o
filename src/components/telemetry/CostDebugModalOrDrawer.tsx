import React, { useState } from 'react';
import { LucideIcon } from '../Common';
import { DebugRequestItem } from '../../services/costIntelligenceService';
import { formatCurrencyBrl, formatCurrencyUsd, formatTokenCount } from '../../services/aiPricingRegistry';

interface CostDebugPanelProps {
  debugRequests: DebugRequestItem[];
  currency: 'BRL' | 'USD';
}

export function CostDebugPanel({ debugRequests, currency }: CostDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Accordion Trigger */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/50 grid place-items-center text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">
            <LucideIcon name="terminal" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
              Diagnóstico de Custos por Requisição
              <span className="text-[10px] font-mono font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                Técnico
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Audit log técnico das últimas 50 requisições (zero prompts, imagens ou saídas expostas)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
          <LucideIcon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform"
          />
        </div>
      </div>

      {/* Expanded Table */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-800/60 overflow-x-auto custom-scrollbar animate-fade-in">
          {debugRequests.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              Nenhuma requisição de IA gravada neste período.
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-2">Request ID</th>
                  <th className="py-2 px-2">Horário</th>
                  <th className="py-2 px-2">Módulo</th>
                  <th className="py-2 px-2">Modelo</th>
                  <th className="py-2 px-2 text-right">In / Out Tokens</th>
                  <th className="py-2 px-2 text-right">Tokens Totais</th>
                  <th className="py-2 px-2 text-right">Custo</th>
                  <th className="py-2 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {debugRequests.map((req, idx) => (
                  <tr key={`${req.requestIdMasked}_${idx}`} className="hover:bg-slate-800/20">
                    <td className="py-2 px-2 text-slate-400">{req.requestIdMasked}</td>
                    <td className="py-2 px-2 text-slate-500">
                      {new Date(req.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-2 px-2 text-slate-300 font-bold">{req.toolLabel}</td>
                    <td className="py-2 px-2 text-purple-400">{req.model}</td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      {formatTokenCount(req.inputTokens)} / {formatTokenCount(req.outputTokens)}
                    </td>
                    <td className="py-2 px-2 text-right text-cyan-400 font-bold">
                      {formatTokenCount(req.totalTokens)}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-400 font-bold">
                      {currency === 'BRL'
                        ? formatCurrencyBrl(req.costBrl)
                        : formatCurrencyUsd(req.costUsd)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          req.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
