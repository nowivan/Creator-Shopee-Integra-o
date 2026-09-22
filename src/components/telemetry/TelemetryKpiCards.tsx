import React from 'react';
import { LucideIcon } from '../Common';
import { OverviewKpis } from '../../services/telemetryAnalyticsService';

interface TelemetryKpiCardsProps {
  kpis: OverviewKpis;
  hasData: boolean;
}

export function TelemetryKpiCards({ kpis, hasData }: TelemetryKpiCardsProps) {
  const formatLatency = (ms: number | null) => {
    if (ms === null || ms === undefined) return '—';
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  const getSuccessRateColor = (rate: number | null) => {
    if (rate === null) return 'text-slate-400';
    if (rate >= 95) return 'text-emerald-400';
    if (rate >= 80) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
      {/* 1. Usuários Ativos */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">Usuários Ativos</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 grid place-items-center">
            <LucideIcon name="users" className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
            {hasData ? kpis.activeUsers : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {hasData ? `${kpis.totalSessions} sessões únicas` : 'Aguardando telemetria'}
          </div>
        </div>
      </div>

      {/* 2. Execuções IA */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">Execuções IA</span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 grid place-items-center">
            <LucideIcon name="cpu" className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
            {hasData ? kpis.aiExecutions : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {hasData && kpis.avgExecutionsPerSession !== null
              ? `~${kpis.avgExecutionsPerSession} / sessão`
              : 'Gerações com IA'}
          </div>
        </div>
      </div>

      {/* 3. Ferramenta Mais Usada */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">Top Ferramenta</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 grid place-items-center">
            <LucideIcon name="flame" className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 min-w-0">
          <div className="text-sm font-extrabold text-slate-100 truncate tracking-tight" title={kpis.mostUsedTool?.label}>
            {hasData && kpis.mostUsedTool ? kpis.mostUsedTool.label : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {hasData && kpis.mostUsedTool
              ? `${kpis.mostUsedTool.count} acessos`
              : 'Sem acessos registrados'}
          </div>
        </div>
      </div>

      {/* 4. Taxa de Sucesso */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">Taxa de Sucesso</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 grid place-items-center">
            <LucideIcon name="check-circle" className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-extrabold font-mono tracking-tight ${getSuccessRateColor(kpis.successRate)}`}>
            {hasData && kpis.successRate !== null ? `${kpis.successRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {hasData ? (kpis.totalErrors === 0 ? 'Zero falhas' : `${kpis.totalErrors} erro(s)`) : 'Taxa de conclusão'}
          </div>
        </div>
      </div>

      {/* 5. Total de Erros */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">Erros IA</span>
          <div className={`w-7 h-7 rounded-lg grid place-items-center ${kpis.totalErrors > 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800/50 text-slate-500'}`}>
            <LucideIcon name="alert-triangle" className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-extrabold font-mono tracking-tight ${kpis.totalErrors > 0 ? 'text-red-400' : 'text-slate-300'}`}>
            {hasData ? kpis.totalErrors : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {hasData ? (kpis.totalErrors === 0 ? 'Estabilidade 100%' : 'Classificados') : 'Falhas observadas'}
          </div>
        </div>
      </div>

      {/* 6. Latência Média */}
      <div className="bg-[#0B0F19]/90 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-400">Latência Média</span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 grid place-items-center">
            <LucideIcon name="clock" className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-white tracking-tight font-mono">
            {hasData ? formatLatency(kpis.avgLatencyMs) : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 truncate">
            {hasData && kpis.avgLatencyMs ? 'Tempo de resposta' : 'Medição ativa'}
          </div>
        </div>
      </div>
    </div>
  );
}
