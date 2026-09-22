import React from 'react';
import { LucideIcon } from '../Common';
import { CostAnomaly } from '../../services/costIntelligenceService';
import { formatCurrencyBrl } from '../../services/aiPricingRegistry';

interface CostAnomalyBannerProps {
  anomaly: CostAnomaly;
}

export function CostAnomalyBanner({ anomaly }: CostAnomalyBannerProps) {
  if (anomaly.status === 'NORMAL' || anomaly.status === 'INSUFFICIENT_DATA') {
    return null;
  }

  const isCritical = anomaly.status === 'CRITICAL';

  return (
    <div
      className={`p-4 md:p-5 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in ${
        isCritical
          ? 'bg-red-950/40 border-red-500/50 text-red-200'
          : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
      }`}
    >
      <div className="flex items-start md:items-center gap-3.5">
        <div
          className={`w-10 h-10 rounded-2xl border grid place-items-center shrink-0 ${
            isCritical
              ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
              : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
          }`}
        >
          <LucideIcon name={isCritical ? 'alert-triangle' : 'zap'} className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              {isCritical ? 'Pico Crítico de Custo Detectado' : 'Aviso: Consumo de IA Acima da Média'}
            </h4>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                isCritical
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              +{anomaly.variationPercent}% vs Baseline
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Gasto nas últimas 24h: <strong className="text-white font-mono">{formatCurrencyBrl(anomaly.last24hCostBrl)}</strong> (Média diária dos 7 dias anteriores: <span className="text-slate-400 font-mono">{formatCurrencyBrl(anomaly.baselineDailyCostBrl)}</span>)
            {anomaly.affectedToolLabel && (
              <> • Módulo com maior tração: <strong className="text-indigo-300">{anomaly.affectedToolLabel}</strong></>
            )}
          </p>
        </div>
      </div>

      <div className="self-end md:self-center shrink-0 text-xs font-mono text-slate-400">
        Monitor Determinístico
      </div>
    </div>
  );
}
