import React, { useState } from 'react';
import { LucideIcon } from '../Common';
import { ActivityTimelinePoint, TimePeriod } from '../../services/telemetryAnalyticsService';

interface TelemetryActivityChartProps {
  timeline: ActivityTimelinePoint[];
  period: TimePeriod;
  hasData: boolean;
}

export function TelemetryActivityChart({ timeline, period, hasData }: TelemetryActivityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxVal = Math.max(
    ...timeline.map(t => Math.max(t.toolOpens, t.aiExecutions, t.errors)),
    1
  );

  const totalOpens = timeline.reduce((acc, t) => acc + t.toolOpens, 0);
  const totalExecs = timeline.reduce((acc, t) => acc + t.aiExecutions, 0);
  const totalErrs = timeline.reduce((acc, t) => acc + t.errors, 0);

  const activePoint = hoveredIdx !== null && timeline[hoveredIdx] ? timeline[hoveredIdx] : null;

  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Header with Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LucideIcon name="activity" className="w-4 h-4 text-indigo-400" />
              Atividade Temporal do Sistema
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/50">
              {period === 'today' ? 'Por Hora' : 'Por Dia'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Comparativo de acessos às ferramentas vs. execuções de inteligência artificial e erros
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
            <span>Acessos ({totalOpens})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
            <span>Execuções IA ({totalExecs})</span>
          </div>
          {totalErrs > 0 && (
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
              <span>Erros ({totalErrs})</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="mt-6 relative min-h-[220px]">
        {!hasData || (totalOpens === 0 && totalExecs === 0 && totalErrs === 0) ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
            <LucideIcon name="bar-chart-2" className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
            <p className="text-sm font-semibold text-slate-400">Ainda não há dados suficientes para este período.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Conforme você navega pelas ferramentas e executa prompts com IA, a volumetria horária aparecerá aqui.
            </p>
          </div>
        ) : (
          <div>
            {/* Hover Tooltip Overlay */}
            {activePoint && (
              <div className="mb-3 p-3 bg-slate-900/95 border border-indigo-500/40 rounded-xl shadow-xl flex items-center justify-between gap-4 text-xs font-mono animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">{activePoint.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-indigo-400">Acessos: <strong className="text-white">{activePoint.toolOpens}</strong></span>
                  <span className="text-cyan-400">Execuções IA: <strong className="text-white">{activePoint.aiExecutions}</strong></span>
                  {activePoint.errors > 0 && (
                    <span className="text-red-400">Erros: <strong className="text-white">{activePoint.errors}</strong></span>
                  )}
                </div>
              </div>
            )}

            {/* Custom Interactive SVG/CSS Bar Group Timeline */}
            <div className="h-44 flex items-end gap-1.5 md:gap-2 px-1 pt-6 pb-2">
              {timeline.map((pt, idx) => {
                const opensH = Math.max(4, Math.round((pt.toolOpens / maxVal) * 100));
                const execsH = Math.max(4, Math.round((pt.aiExecutions / maxVal) * 100));
                const errsH = Math.max(4, Math.round((pt.errors / maxVal) * 100));

                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={pt.key}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all duration-150 rounded-lg p-1 ${
                      isHovered ? 'bg-slate-800/80 ring-1 ring-indigo-500/50' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1 h-32 relative">
                      {/* Tool Opens Bar */}
                      <div
                        style={{ height: `${pt.toolOpens > 0 ? opensH : 0}%` }}
                        className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                          pt.toolOpens > 0
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:brightness-125'
                            : 'bg-transparent'
                        }`}
                      />
                      {/* AI Executions Bar */}
                      <div
                        style={{ height: `${pt.aiExecutions > 0 ? execsH : 0}%` }}
                        className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                          pt.aiExecutions > 0
                            ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:brightness-125'
                            : 'bg-transparent'
                        }`}
                      />
                      {/* Errors Bar */}
                      {pt.errors > 0 && (
                        <div
                          style={{ height: `${errsH}%` }}
                          className="w-full max-w-[8px] bg-red-500 rounded-t-sm animate-pulse"
                        />
                      )}
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
