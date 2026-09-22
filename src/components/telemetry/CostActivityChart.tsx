import React, { useState } from 'react';
import { LucideIcon } from '../Common';
import { DailyCostTimelinePoint } from '../../services/costIntelligenceService';
import { TimePeriod } from '../../services/telemetryAnalyticsService';
import { formatCurrencyBrl, formatCurrencyUsd, formatTokenCount } from '../../services/aiPricingRegistry';

interface CostActivityChartProps {
  timeline: DailyCostTimelinePoint[];
  period: TimePeriod;
  hasData: boolean;
  currency: 'BRL' | 'USD';
}

export function CostActivityChart({ timeline, period, hasData, currency }: CostActivityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxCost = Math.max(
    ...timeline.map(t => (currency === 'BRL' ? t.costBrl : t.costUsd)),
    0.001
  );

  const totalCost = timeline.reduce(
    (acc, t) => acc + (currency === 'BRL' ? t.costBrl : t.costUsd),
    0
  );
  const totalTokens = timeline.reduce((acc, t) => acc + t.totalTokens, 0);

  const activePoint = hoveredIdx !== null && timeline[hoveredIdx] ? timeline[hoveredIdx] : null;

  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Header with Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LucideIcon name="bar-chart-2" className="w-4 h-4 text-emerald-400" />
              Consumo de Tokens & Custo da API
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/50">
              {period === 'today' ? 'Por Hora' : 'Por Dia'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Evolução temporal de tokens de entrada/saída e custos financeiros acumulados
          </p>
        </div>

        {/* Legend & Totals */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
            <span>Tokens ({formatTokenCount(totalTokens)})</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>
              Custo ({currency === 'BRL' ? formatCurrencyBrl(totalCost) : formatCurrencyUsd(totalCost)})
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="mt-6 relative min-h-[220px]">
        {!hasData || (totalCost === 0 && totalTokens === 0) ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
            <LucideIcon name="wallet" className="w-10 h-10 mb-2 opacity-30 text-emerald-400" />
            <p className="text-sm font-semibold text-slate-400">Ainda não há consumo financeiro neste período.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              As execuções e tokens processados aparecerão discriminados aqui por data e hora.
            </p>
          </div>
        ) : (
          <div>
            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <div className="mb-3 p-3 bg-slate-900/95 border border-emerald-500/40 rounded-xl shadow-xl flex items-center justify-between gap-4 text-xs font-mono animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">{activePoint.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-cyan-400">
                    Tokens: <strong className="text-white">{formatTokenCount(activePoint.totalTokens)}</strong> (In: {formatTokenCount(activePoint.inputTokens)} | Out: {formatTokenCount(activePoint.outputTokens)})
                  </span>
                  <span className="text-emerald-400">
                    Custo:{' '}
                    <strong className="text-white">
                      {currency === 'BRL'
                        ? formatCurrencyBrl(activePoint.costBrl)
                        : formatCurrencyUsd(activePoint.costUsd)}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    Reqs: <strong className="text-white">{activePoint.executions}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Custom Interactive CSS/SVG Bar Chart */}
            <div className="h-44 flex items-end gap-1.5 md:gap-2 px-1 pt-6 pb-2">
              {timeline.map((pt, idx) => {
                const currentVal = currency === 'BRL' ? pt.costBrl : pt.costUsd;
                const costH = Math.max(4, Math.round((currentVal / maxCost) * 100));
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={pt.key}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all duration-150 rounded-lg p-1 ${
                      isHovered ? 'bg-slate-800/80 ring-1 ring-emerald-500/50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center h-32 relative">
                      <div
                        style={{ height: `${currentVal > 0 ? costH : 0}%` }}
                        className={`w-full max-w-[14px] rounded-t-sm transition-all duration-300 ${
                          currentVal > 0
                            ? 'bg-gradient-to-t from-emerald-600 to-cyan-400 group-hover:brightness-125'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* X-axis Label */}
                    <div className="text-[9px] font-mono text-slate-500 group-hover:text-slate-200 mt-2 truncate max-w-full text-center">
                      {pt.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
