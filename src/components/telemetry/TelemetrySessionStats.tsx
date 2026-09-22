import React from 'react';
import { LucideIcon } from '../Common';
import { AggregatedDashboardMetrics } from '../../services/telemetryAnalyticsService';

interface TelemetrySessionStatsProps {
  sessionStats: AggregatedDashboardMetrics['sessionStats'];
  hasData: boolean;
}

export function TelemetrySessionStats({ sessionStats, hasData }: TelemetrySessionStatsProps) {
  return (
    <div className="bg-[#0B0F19]/90 border border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LucideIcon name="fingerprint" className="w-4 h-4 text-emerald-400" />
            Engajamento & Métricas de Sessão
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Volumetria agregada de navegação e profundidade de uso
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Sessions */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono uppercase text-[10px] text-slate-400">Total de Sessões</span>
            <LucideIcon name="globe" className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-white font-mono">
            {hasData ? sessionStats.totalSessions : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {hasData ? 'Sessões identificadas' : 'Aguardando telemetria'}
          </div>
        </div>

        {/* Ferramentas por Sessão */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono uppercase text-[10px] text-slate-400">Módulos por Sessão</span>
            <LucideIcon name="compass" className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-white font-mono">
            {hasData && sessionStats.avgToolsPerSession !== null
              ? sessionStats.avgToolsPerSession
              : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {hasData ? 'Média de ferramentas abertas' : 'Profundidade média'}
          </div>
        </div>

        {/* Execuções por Usuário */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-mono uppercase text-[10px] text-slate-400">Gerações / Usuário</span>
            <LucideIcon name="zap" className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-white font-mono">
            {hasData && sessionStats.avgExecutionsPerUser !== null
              ? sessionStats.avgExecutionsPerUser
              : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {hasData ? 'Média de requisições' : 'Volume médio'}
          </div>
        </div>
      </div>
    </div>
  );
}
