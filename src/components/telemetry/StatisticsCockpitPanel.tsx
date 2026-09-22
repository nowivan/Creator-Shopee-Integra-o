import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LucideIcon } from '../Common';
import { usageTelemetry } from '../../services/usageTelemetryService';
import { UsageTelemetryEvent } from '../../types/telemetry';
import {
  computeTelemetryAnalytics,
  TimePeriod,
  AggregatedDashboardMetrics
} from '../../services/telemetryAnalyticsService';
import {
  computeCostIntelligence,
  CostIntelligenceData
} from '../../services/costIntelligenceService';
import {
  getCostCurrencyConfig,
  saveCostCurrencyConfig
} from '../../services/aiPricingRegistry';
import { TelemetryKpiCards } from './TelemetryKpiCards';
import { TelemetryActivityChart } from './TelemetryActivityChart';
import { TelemetryToolRanking } from './TelemetryToolRanking';
import { TelemetryErrorPanel } from './TelemetryErrorPanel';
import { TelemetrySessionStats } from './TelemetrySessionStats';
import { CostKpiCards } from './CostKpiCards';
import { CostAnomalyBanner } from './CostAnomalyBanner';
import { CostProjectionAndSpendCap } from './CostProjectionAndSpendCap';
import { CostActivityChart } from './CostActivityChart';
import { ToolCostRankingTable } from './ToolCostRankingTable';
import { ModelIntelligenceTable } from './ModelIntelligenceTable';
import { UserAndSessionCostPanel } from './UserAndSessionCostPanel';
import { CostDebugPanel } from './CostDebugModalOrDrawer';
import { CreditAnalyticsWidget } from './CreditAnalyticsWidget';

interface StatisticsCockpitPanelProps {
  onOpenTool: (toolId: string) => void;
}

export function StatisticsCockpitPanel({ onOpenTool }: StatisticsCockpitPanelProps) {
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [rawEvents, setRawEvents] = useState<UsageTelemetryEvent[]>([]);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
  const [spendCapRefreshKey, setSpendCapRefreshKey] = useState<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Safe async telemetry loader
  const loadTelemetryEvents = async (showLoadingIndicator = false) => {
    if (showLoadingIndicator) {
      setIsLoadingTelemetry(true);
    }
    setLoadError(null);

    try {
      const events = await usageTelemetry.getEvents();
      if (isMountedRef.current) {
        setRawEvents(Array.isArray(events) ? events : []);
        setIsLoadingTelemetry(false);
      }
    } catch (error) {
      console.warn('[Statistics Dashboard] Failed to load telemetry:', error);
      if (isMountedRef.current) {
        setRawEvents([]);
        setLoadError('Não foi possível sincronizar eventos em tempo real.');
        setIsLoadingTelemetry(false);
      }
    }
  };

  // Mount & cleanup lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    const cfg = getCostCurrencyConfig();
    setCurrency(cfg.displayCurrency);

    loadTelemetryEvents(true);

    const interval = setInterval(() => {
      loadTelemetryEvents(false);
    }, 10000); // 10s soft background sync

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleCurrency = () => {
    const next = currency === 'BRL' ? 'USD' : 'BRL';
    setCurrency(next);
    saveCostCurrencyConfig({ displayCurrency: next });
  };

  // Aggregate operational metrics memoized by rawEvents and period
  const metrics: AggregatedDashboardMetrics = useMemo(() => {
    return computeTelemetryAnalytics(rawEvents, period);
  }, [rawEvents, period]);

  // Aggregate financial & token cost metrics memoized
  const costMetrics: CostIntelligenceData = useMemo(() => {
    return computeCostIntelligence(rawEvents, period);
  }, [rawEvents, period, spendCapRefreshKey]);

  const periodOptions: { id: TimePeriod; label: string }[] = [
    { id: 'today', label: 'Hoje' },
    { id: '7d', label: '7 dias' },
    { id: '30d', label: '30 dias' },
    { id: 'month', label: 'Mês atual' }
  ];

  return (
    <div className="space-y-8">
      {/* Cockpit Sub-Header: Period Filter & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F172A]/80 border border-slate-800/80 p-4 md:p-5 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-indigo-400">
            <LucideIcon name="bar-chart-3" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Cockpit de Estatísticas & Telemetria
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Telemetria Ativa" />
            </h2>
            <p className="text-xs text-slate-400">
              Métricas de uso operacional, inteligência de tokens & monitoramento de custos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
          {/* Currency Toggle */}
          <button
            onClick={handleToggleCurrency}
            className="px-3 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
            title="Alternar moeda de exibição"
          >
            <span className="text-[10px] text-slate-500 uppercase">Moeda:</span>
            <strong className="text-emerald-400 font-bold">{currency}</strong>
          </button>

          {/* Period Filter Tabs */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
            {periodOptions.map(opt => {
              const isActive = period === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPeriod(opt.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadTelemetryEvents(true)}
            disabled={isLoadingTelemetry}
            className={`p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer ${
              isLoadingTelemetry ? 'opacity-50 cursor-not-allowed animate-spin' : ''
            }`}
            title="Atualizar estatísticas"
          >
            <LucideIcon name="refresh-cw" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Discrete Non-Destructive Load Warning if fetch fails */}
      {loadError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-2">
            <LucideIcon name="alert-triangle" className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => loadTelemetryEvents(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold cursor-pointer transition"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 0: CRÉDITOS & PLAN ENTITLEMENTS (ETAPA 4A)          */}
      {/* ======================================================== */}
      <CreditAnalyticsWidget events={rawEvents} />

      {/* ======================================================== */}
      {/* SEÇÃO 1: CUSTOS & TOKENS INTELLIGENCE (ETAPA 3)           */}
      {/* ======================================================== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <h3 className="text-sm md:text-base font-extrabold text-white tracking-tight uppercase font-mono">
              Custos & Inteligência de Tokens
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Base Canônica USD • Câmbio: R$ {costMetrics.usdToBrlRate.toFixed(2)}
          </span>
        </div>

        {/* Anomaly Detection Alert */}
        <CostAnomalyBanner anomaly={costMetrics.costAnomaly} />

        {/* Financial KPI Cards */}
        <CostKpiCards kpis={costMetrics.kpis} hasData={costMetrics.hasData} currency={currency} />

        {/* Projection, Spend Cap & Data Quality */}
        <CostProjectionAndSpendCap
          projection={costMetrics.monthlyProjection}
          spendCap={costMetrics.spendCap}
          dataQuality={costMetrics.dataQuality}
          onSpendCapUpdated={() => setSpendCapRefreshKey(k => k + 1)}
        />

        {/* Temporal Cost & Token Chart */}
        <CostActivityChart
          timeline={costMetrics.costTimeline}
          period={period}
          hasData={costMetrics.hasData}
          currency={currency}
        />

        {/* Tables: Tool Cost Ranking & Model Intelligence */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7">
            <ToolCostRankingTable
              items={costMetrics.toolCostRanking}
              hasData={costMetrics.hasData}
              currency={currency}
              onOpenTool={onOpenTool}
            />
          </div>
          <div className="xl:col-span-5">
            <ModelIntelligenceTable
              items={costMetrics.modelIntelligence}
              hasData={costMetrics.hasData}
              currency={currency}
            />
          </div>
        </div>

        {/* Masked User & Session Breakdown */}
        <UserAndSessionCostPanel
          userCosts={costMetrics.userCostAggregation}
          sessionStats={costMetrics.sessionCostStats}
          hasData={costMetrics.hasData}
          currency={currency}
        />

        {/* Technical Diagnostics Log (Collapsible, Zero Prompt/Copy data) */}
        <CostDebugPanel
          debugRequests={costMetrics.debugRequests}
          currency={currency}
        />
      </div>

      {/* ======================================================== */}
      {/* SEÇÃO 2: OPERAÇÃO & SAÚDE DOS MÓDULOS (ETAPA 2)           */}
      {/* ======================================================== */}
      <div className="space-y-6 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
          <h3 className="text-sm md:text-base font-extrabold text-white tracking-tight uppercase font-mono">
            Operação & Saúde dos Módulos
          </h3>
        </div>

        {/* 1. Operational KPI Cards */}
        <TelemetryKpiCards kpis={metrics.kpis} hasData={metrics.hasData} />

        {/* 2. Activity Timeline Chart */}
        <TelemetryActivityChart timeline={metrics.timeline} period={period} hasData={metrics.hasData} />

        {/* 3. Tool Ranking Table with Health Status */}
        <TelemetryToolRanking items={metrics.toolRanking} hasData={metrics.hasData} onOpenTool={onOpenTool} />

        {/* 4. Bottom Grid: Error Diagnostic Panel & Session Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <TelemetryErrorPanel errors={metrics.errorGroups} hasData={metrics.hasData} />
          </div>
          <div className="lg:col-span-5">
            <TelemetrySessionStats sessionStats={metrics.sessionStats} hasData={metrics.hasData} />
          </div>
        </div>
      </div>
    </div>
  );
}
