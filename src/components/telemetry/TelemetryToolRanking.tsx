import React, { useState } from 'react';
import { LucideIcon } from '../Common';
import { ToolRankingItem } from '../../services/telemetryAnalyticsService';

interface TelemetryToolRankingProps {
  items: ToolRankingItem[];
  hasData: boolean;
  onOpenTool?: (toolId: string) => void;
}

type SortField = 'toolOpens' | 'aiExecutions' | 'errors' | 'successRate';

export function TelemetryToolRanking({ items, hasData, onOpenTool }: TelemetryToolRankingProps) {
  const [sortField, setSortField] = useState<SortField>('toolOpens');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) valA = -1;
    if (valB === null || valB === undefined) valB = -1;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return b.toolOpens - a.toolOpens;
  });

  const renderHealthBadge = (health: ToolRankingItem['health']) => {
    switch (health) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            HEALTHY
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            WARNING
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
            CRITICAL
          </span>
        );
      case 'STANDBY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800/60 text-slate-400 border border-slate-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            STANDBY
          </span>
        );
      case 'IDLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800/40 text-slate-500 border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            IDLE
          </span>
        );
    }
  };

  const formatLatency = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—';
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LucideIcon name="bar-chart" className="w-4 h-4 text-indigo-400" />
            Ranking de Uso & Saúde dos Módulos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Acessos ao módulo vs. execuções reais de IA, taxa de sucesso e latência
          </p>
        </div>

        {/* Sort selector pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-500 px-2">Ordenar:</span>
          <button
            onClick={() => handleSort('toolOpens')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sortField === 'toolOpens' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Acessos {sortField === 'toolOpens' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => handleSort('aiExecutions')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sortField === 'aiExecutions' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Execuções {sortField === 'aiExecutions' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => handleSort('errors')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sortField === 'errors' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Erros {sortField === 'errors' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="mt-4 overflow-x-auto custom-scrollbar">
        {!hasData || sortedItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <LucideIcon name="layers" className="w-10 h-10 mb-2 opacity-30 mx-auto text-indigo-400" />
            <p className="text-sm font-semibold text-slate-400">Ainda não há dados suficientes para este período.</p>
            <p className="text-xs text-slate-500 mt-1">Os dados de acesso e execuções serão consolidados aqui.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3">Ferramenta</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Acessos</th>
                <th className="py-3 px-3 text-right">Execuções IA</th>
                <th className="py-3 px-3 text-right">Sucessos</th>
                <th className="py-3 px-3 text-right">Erros</th>
                <th className="py-3 px-3 text-right">Taxa Sucesso</th>
                <th className="py-3 px-3 text-right">Latência Média</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedItems.map(tool => {
                const rateColor =
                  tool.successRate === null
                    ? 'text-slate-500'
                    : tool.successRate >= 95
                    ? 'text-emerald-400 font-bold'
                    : tool.successRate >= 80
                    ? 'text-amber-400 font-bold'
                    : 'text-red-400 font-bold';

                return (
                  <tr
                    key={tool.toolId}
                    onClick={() => onOpenTool && onOpenTool(tool.toolId)}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    {/* Tool Name & Category */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 transition-colors" />
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                            {tool.toolLabel}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {tool.toolCategory}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Health Badge */}
                    <td className="py-3 px-3">
                      {renderHealthBadge(tool.health)}
                    </td>

                    {/* Acessos */}
                    <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">
                      {tool.toolOpens}
                    </td>

                    {/* Execuções IA */}
                    <td className="py-3 px-3 text-right font-mono text-cyan-400 font-semibold">
                      {tool.aiExecutions}
                    </td>

                    {/* Sucessos */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">
                      {tool.successes}
                    </td>

                    {/* Erros */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className={tool.errors > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                        {tool.errors}
                      </span>
                    </td>

                    {/* Taxa de Sucesso */}
                    <td className={`py-3 px-3 text-right font-mono ${rateColor}`}>
                      {tool.successRate !== null ? `${tool.successRate}%` : '—'}
                    </td>

                    {/* Latência Média */}
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {formatLatency(tool.avgLatencyMs)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
