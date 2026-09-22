import React, { useState, useEffect, useRef } from 'react';
import { LucideIcon } from '../Common';
import {
  videoEngineLatencyService,
  VideoEngineHealth,
  GlobalHealthStats,
  VideoEngineId,
  ApiTraceRecord,
  EngineHealthStatus
} from '../../services/videoEngineLatencyService';

interface VideoEngineHealthPanelProps {
  className?: string;
}

export const VideoEngineHealthPanel: React.FC<VideoEngineHealthPanelProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [engines, setEngines] = useState<VideoEngineHealth[]>(() => videoEngineLatencyService.getEngines());
  const [globalStats, setGlobalStats] = useState<GlobalHealthStats>(() => videoEngineLatencyService.getGlobalStats());
  const [traces, setTraces] = useState<ApiTraceRecord[]>(() => videoEngineLatencyService.getTraces());
  const [filter, setFilter] = useState<'all' | 'optimal' | 'normal' | 'traces'>('all');
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingingEngineId, setPingingEngineId] = useState<VideoEngineId | null>(null);
  const [autoPing, setAutoPing] = useState<boolean>(() => videoEngineLatencyService.isAutoPingActive());
  const [copiedTrace, setCopiedTrace] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = videoEngineLatencyService.subscribe((updatedEngines, updatedStats) => {
      setEngines(updatedEngines);
      setGlobalStats(updatedStats);
      setTraces(videoEngineLatencyService.getTraces());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePingAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPingingAll(true);
    try {
      await videoEngineLatencyService.pingAllEngines();
    } finally {
      setIsPingingAll(false);
    }
  };

  const handlePingSingle = async (e: React.MouseEvent, engineId: VideoEngineId) => {
    e.stopPropagation();
    setPingingEngineId(engineId);
    try {
      await videoEngineLatencyService.pingEngine(engineId);
    } finally {
      setPingingEngineId(null);
    }
  };

  const handleToggleAutoPing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !autoPing;
    setAutoPing(next);
    videoEngineLatencyService.setAutoPingEnabled(next);
  };

  const handleCopyDiagnostics = (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = {
      timestamp: new Date().toISOString(),
      globalStats,
      engines: engines.map(eng => ({
        id: eng.id,
        name: eng.name,
        provider: eng.provider,
        region: eng.region,
        currentLatencyMs: eng.currentLatencyMs,
        avgLatencyMs: eng.avgLatencyMs,
        minLatencyMs: eng.minLatencyMs,
        maxLatencyMs: eng.maxLatencyMs,
        p95LatencyMs: eng.p95LatencyMs,
        jitterMs: eng.jitterMs,
        status: eng.status,
        successRate: `${eng.successRate}%`,
        totalCalls: eng.totalCalls
      })),
      recentTraces: traces.slice(0, 10)
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2500);
  };

  const filteredEngines = engines.filter(e => {
    if (filter === 'optimal') return e.status === 'optimal';
    if (filter === 'normal') return e.status === 'normal' || e.status === 'degraded';
    return true;
  });

  const getStatusColor = (status: EngineHealthStatus) => {
    switch (status) {
      case 'optimal': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'normal': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'degraded': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'down': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'testing': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 animate-pulse';
    }
  };

  const getLatencyBadgeColor = (latencyMs: number) => {
    if (latencyMs < 150) return 'text-emerald-400';
    if (latencyMs < 300) return 'text-cyan-400';
    if (latencyMs < 500) return 'text-amber-400';
    return 'text-rose-400';
  };

  // Generate SVG Sparkline
  const renderSparkline = (history: number[], color: string = '#10b981', width = 72, height = 20) => {
    if (!history || history.length < 2) return null;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;
    const step = width / (history.length - 1);

    const points = history.map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible inline-block">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Highlight latest point */}
        {history.length > 0 && (
          <circle
            cx={(width).toFixed(1)}
            cy={(height - ((history[history.length - 1] - min) / range) * (height - 4) - 2).toFixed(1)}
            r="2.5"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={panelRef}>
      {/* Footer Trigger Pill */}
      <button
        type="button"
        id="video-engine-health-footer-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-md transition-all cursor-pointer select-none text-[10px] font-mono border ${
          isOpen
            ? 'bg-neutral-800 border-neutral-700 text-white shadow-lg'
            : 'bg-neutral-900/90 hover:bg-neutral-800/90 border-neutral-800 text-neutral-300 hover:text-white'
        }`}
        title="Clique para abrir o Painel de Saúde e Latência dos Motores de Vídeo IA"
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              globalStats.overallStatus === 'optimal'
                ? 'bg-emerald-400'
                : globalStats.overallStatus === 'normal'
                ? 'bg-cyan-400'
                : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              globalStats.overallStatus === 'optimal'
                ? 'bg-emerald-500'
                : globalStats.overallStatus === 'normal'
                ? 'bg-cyan-500'
                : 'bg-amber-500'
            }`}
          />
        </span>

        <span className="text-neutral-400 uppercase font-semibold">Vídeo IA</span>

        <span className={`font-bold ${getLatencyBadgeColor(globalStats.overallAvgLatencyMs)} flex items-center gap-0.5`}>
          <span>⚡</span>
          <span>{globalStats.overallAvgLatencyMs}ms</span>
        </span>

        <span className="text-neutral-500 hidden md:inline">|</span>
        <span className="text-neutral-400 font-medium hidden md:inline">
          {globalStats.totalEnginesOnline}/{globalStats.totalEnginesCount} Motores
        </span>

        {/* Mini sparkline in footer */}
        <div className="hidden lg:block opacity-80 pl-1">
          {renderSparkline(
            engines[0]?.latencyHistory || [100, 110, 105, 120, 118],
            globalStats.overallStatus === 'optimal' ? '#10b981' : '#06b6d4',
            38,
            12
          )}
        </div>

        <LucideIcon
          name={isOpen ? 'chevron-down' : 'chevron-up'}
          className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded System Health Dashboard Popover Panel */}
      {isOpen && (
        <div
          id="video-engine-health-dashboard-popover"
          className="absolute bottom-12 left-0 sm:left-auto sm:bottom-12 sm:-left-20 md:left-0 w-[95vw] sm:w-[580px] md:w-[680px] lg:w-[760px] max-h-[82vh] bg-[#0c0c0e] border border-neutral-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden text-neutral-200 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <LucideIcon name="activity" className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                    Painel de Saúde do Sistema & Latência de Vídeo IA
                  </h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Telemetry
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Monitoramento em tempo real de latência, RTT, jitter e SLA dos motores de geração
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-toggle-auto-ping"
                onClick={handleToggleAutoPing}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition cursor-pointer flex items-center gap-1.5 ${
                  autoPing
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                }`}
                title="Ativar/Desativar auto-ping a cada 15 segundos"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoPing ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                <span>Auto-Ping {autoPing ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                id="btn-ping-all-engines"
                onClick={handlePingAll}
                disabled={isPingingAll}
                className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 border border-neutral-700 text-[10px] font-mono px-2.5 py-1 rounded transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Executar ping em todos os motores simultaneamente"
              >
                <LucideIcon name="refresh-cw" className={`w-3 h-3 ${isPingingAll ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isPingingAll ? 'Testando...' : 'Ping Todos'}</span>
              </button>

              <button
                type="button"
                id="btn-close-health-panel"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Fechar painel"
              >
                <LucideIcon name="x" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-neutral-950/60 border-b border-neutral-800/80 text-xs font-mono shrink-0">
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-2.5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>Latência Média</span>
                <LucideIcon name="clock" className="w-3 h-3 text-neutral-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-base font-extrabold ${getLatencyBadgeColor(globalStats.overallAvgLatencyMs)}`}>
                  {globalStats.overallAvgLatencyMs}
                </span>
                <span className="text-[10px] text-neutral-500">ms</span>
                <span className="text-[9px] text-emerald-400 font-semibold ml-auto">
                  {globalStats.overallAvgLatencyMs < 180 ? '● Ótimo' : '● Estável'}
                </span>
              </div>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-2.5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>Mais Rápido</span>
                <LucideIcon name="zap" className="w-3 h-3 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[90px]" title={globalStats.fastestEngine.name}>
                  {globalStats.fastestEngine.name}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold ml-auto">
                  {globalStats.fastestEngine.latencyMs}ms
                </span>
              </div>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-2.5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>Jitter & Variação</span>
                <LucideIcon name="bar-chart-2" className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-cyan-400">
                  ±{globalStats.avgJitterMs}
                </span>
                <span className="text-[10px] text-neutral-500">ms</span>
                <span className="text-[9px] text-neutral-400 ml-auto">p95: {globalStats.p95LatencyMs}ms</span>
              </div>
            </div>

            <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-2.5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>Disponibilidade</span>
                <LucideIcon name="check-circle-2" className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-extrabold text-emerald-400">
                  {globalStats.globalSuccessRate}%
                </span>
                <span className="text-[9px] text-neutral-400 ml-auto font-mono">
                  {globalStats.totalEnginesOnline}/{globalStats.totalEnginesCount} Online
                </span>
              </div>
            </div>
          </div>

          {/* Filter & View Switcher */}
          <div className="px-3 py-2 bg-neutral-900/40 border-b border-neutral-800 flex items-center justify-between text-[11px] font-mono shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Todos ({engines.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('optimal')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                  filter === 'optimal'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Ótimo &lt;180ms ({engines.filter(e => e.status === 'optimal').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('normal')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                  filter === 'normal'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Normal &gt;180ms ({engines.filter(e => e.status !== 'optimal').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('traces')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer flex items-center gap-1 ${
                  filter === 'traces'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LucideIcon name="terminal" className="w-3 h-3" />
                <span>Traces ({traces.length})</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-copy-diagnostics"
              onClick={handleCopyDiagnostics}
              className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 bg-neutral-800/80 hover:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700/80 transition cursor-pointer"
              title="Copiar relatório completo de telemetria em formato JSON"
            >
              <LucideIcon name={copiedTrace ? 'check' : 'copy'} className={`w-3 h-3 ${copiedTrace ? 'text-emerald-400' : ''}`} />
              <span>{copiedTrace ? 'Copiado!' : 'Exportar JSON'}</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-[220px] max-h-[380px]">
            {filter === 'traces' ? (
              /* Live Traces Log View */
              <div className="space-y-1.5 font-mono text-[10px]">
                {traces.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-xs">
                    Nenhum trace registrado nesta sessão ainda. Realize chamadas de vídeo ou clique em &quot;Ping Todos&quot;.
                  </div>
                ) : (
                  traces.map((trace) => (
                    <div
                      key={trace.id}
                      className="bg-neutral-950/80 border border-neutral-850 rounded-lg p-2 flex items-center justify-between gap-3 text-neutral-300"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${trace.status === 'ok' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-neutral-500">{new Date(trace.timestamp).toLocaleTimeString()}</span>
                        <span className="text-white font-bold">{trace.engineName}</span>
                      </div>
                      <div className="text-neutral-400 truncate flex-1 text-left hidden sm:block">
                        {trace.note || 'API Probe'}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-[9px]">
                          HTTP {trace.statusCode}
                        </span>
                        <span className={`font-bold ${getLatencyBadgeColor(trace.latencyMs)}`}>
                          {trace.latencyMs} ms
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Video Engines Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredEngines.map((engine) => {
                  const isPinging = pingingEngineId === engine.id || (isPingingAll && engine.status === 'testing');
                  return (
                    <div
                      key={engine.id}
                      className="bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800/90 rounded-lg p-3 transition flex flex-col justify-between gap-2.5 group"
                    >
                      {/* Card Top: Title & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate font-mono">
                              {engine.name}
                            </h4>
                          </div>
                          <p className="text-[10px] text-neutral-400 truncate font-sans">
                            {engine.provider} • <span className="text-neutral-500">{engine.region}</span>
                          </p>
                        </div>

                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getStatusColor(
                            engine.status
                          )}`}
                        >
                          {engine.status === 'testing' ? 'Testando' : engine.status}
                        </span>
                      </div>

                      {/* Card Middle: Latency & Sparkline */}
                      <div className="flex items-center justify-between bg-neutral-950/60 border border-neutral-800/60 rounded-md px-2.5 py-1.5 font-mono">
                        <div>
                          <div className="text-[9px] text-neutral-500 uppercase">Latência Atual</div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-base font-extrabold ${getLatencyBadgeColor(engine.currentLatencyMs)}`}>
                              {engine.currentLatencyMs}
                            </span>
                            <span className="text-[10px] text-neutral-400">ms</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="text-[9px] text-neutral-500 uppercase mb-0.5">Histórico (15x)</div>
                          {renderSparkline(
                            engine.latencyHistory,
                            engine.status === 'optimal' ? '#10b981' : engine.status === 'normal' ? '#06b6d4' : '#f59e0b',
                            65,
                            16
                          )}
                        </div>
                      </div>

                      {/* Card Bottom: Min / Avg / Max / Jitter & Ping Button */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 pt-0.5 border-t border-neutral-800/50">
                        <div className="flex items-center gap-2">
                          <span>Mín: <strong className="text-neutral-300">{engine.minLatencyMs}</strong></span>
                          <span>Méd: <strong className="text-neutral-300">{engine.avgLatencyMs}</strong></span>
                          <span>Máx: <strong className="text-neutral-300">{engine.maxLatencyMs}</strong></span>
                          <span>Jitter: <strong className="text-cyan-400">±{engine.jitterMs}</strong></span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handlePingSingle(e, engine.id)}
                          disabled={isPinging}
                          className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-neutral-200 border border-neutral-700 px-2 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer ml-2 shrink-0"
                          title={`Testar ping para ${engine.name}`}
                        >
                          <LucideIcon name="activity" className={`w-2.5 h-2.5 ${isPinging ? 'animate-spin text-emerald-400' : ''}`} />
                          <span>{isPinging ? '...' : 'Ping'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer inside popover */}
          <div className="px-3 py-2 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-500 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Protocolo: HTTP/2 Edge Proxy Multiplexed</span>
            </div>
            <div>
              Última sincronização: {new Date(globalStats.lastGlobalPing).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
