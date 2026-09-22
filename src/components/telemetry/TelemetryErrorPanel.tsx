import React from 'react';
import { LucideIcon } from '../Common';
import { ErrorGroupItem } from '../../services/telemetryAnalyticsService';

interface TelemetryErrorPanelProps {
  errors: ErrorGroupItem[];
  hasData: boolean;
}

export function TelemetryErrorPanel({ errors, hasData }: TelemetryErrorPanelProps) {
  const formatTimestamp = (ts: number) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getErrorIcon = (code: string) => {
    if (code.includes('TIMEOUT')) return 'clock';
    if (code.includes('ABORT')) return 'slash';
    if (code.includes('NETWORK') || code.includes('CORS')) return 'wifi-off';
    if (code.includes('BILLING') || code.includes('QUOTA')) return 'credit-card';
    if (code.includes('PARSER') || code.includes('VALIDATION')) return 'file-warning';
    return 'alert-triangle';
  };

  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LucideIcon name="shield-alert" className="w-4 h-4 text-red-400" />
            Classificação & Diagnóstico de Erros
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Agrupamento por causa raiz técnica e módulos impactados
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          {errors.reduce((acc, e) => acc + e.count, 0)} ocorrências
        </span>
      </div>

      {/* Content */}
      <div className="mt-4 flex-1">
        {!hasData || errors.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 grid place-items-center mb-2 border border-emerald-500/20">
              <LucideIcon name="check-circle-2" className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-200">Zero Falhas Registradas</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Todas as requisições de inteligência artificial foram concluídas com 100% de estabilidade técnica no período selecionado.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {errors.map(err => (
              <div
                key={err.code}
                className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Code & Label */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 grid place-items-center shrink-0 mt-0.5">
                    <LucideIcon name={getErrorIcon(err.code)} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs truncate">
                        {err.label}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {err.code}
                      </span>
                    </div>

                    {/* Affected tools tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">Módulos:</span>
                      {err.affectedTools.map(tool => (
                        <span
                          key={tool.id}
                          className="text-[10px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50"
                        >
                          {tool.label} <strong className="text-red-400">({tool.count})</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Count & Last occurrence */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <div className="text-sm font-extrabold font-mono text-red-400">
                    {err.count} {err.count === 1 ? 'erro' : 'erros'}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Último: {formatTimestamp(err.lastOccurredAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
