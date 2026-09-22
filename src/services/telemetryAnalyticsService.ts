/**
 * TELEMETRY ANALYTICS SERVICE (Etapa 2)
 * CREATOR INTELLIGENCE PRO
 *
 * Central aggregator service responsible for transforming raw telemetry events
 * into deduplicated, structured metrics for the Statistics Dashboard.
 *
 * READ-ONLY layer over UsageTelemetryEvents.
 * Guaranteed privacy: no prompts, images, keys or sensitive user data processed.
 */

import { UsageTelemetryEvent, TelemetryEventType } from '../types/telemetry';
import { TOOL_REGISTRY, resolveTool } from './usageTelemetryService';

export type TimePeriod = 'today' | '7d' | '30d' | 'month';

export type ToolHealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'IDLE' | 'STANDBY';

export interface OverviewKpis {
  activeUsers: number;
  aiExecutions: number;
  mostUsedTool: { id: string; label: string; count: number } | null;
  mostAccessedScreen?: { id: string; label: string; count: number } | null;
  toolAttributionCoveragePercent?: number;
  successRate: number | null; // 0 - 100 percentage, or null if no executions
  totalErrors: number;
  avgLatencyMs: number | null;
  totalSessions: number;
  avgExecutionsPerSession: number | null;
  avgToolsPerSession: number | null;
  totalToolOpens: number;
}

export interface ActivityTimelinePoint {
  key: string;
  label: string;
  timestamp: number;
  toolOpens: number;
  aiExecutions: number;
  errors: number;
  successes: number;
}

export interface ToolRankingItem {
  toolId: string;
  toolLabel: string;
  toolCategory: string;
  toolOpens: number;
  aiExecutions: number;
  successes: number;
  errors: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  health: ToolHealthStatus;
}

export interface ErrorGroupItem {
  code: string;
  label: string;
  count: number;
  affectedTools: { id: string; label: string; count: number }[];
  lastOccurredAt: number;
}

export interface AggregatedDashboardMetrics {
  period: TimePeriod;
  timeBounds: { startTime: number; endTime: number };
  hasData: boolean;
  totalEventsCount: number;
  kpis: OverviewKpis;
  timeline: ActivityTimelinePoint[];
  toolRanking: ToolRankingItem[];
  errorGroups: ErrorGroupItem[];
  sessionStats: {
    totalSessions: number;
    activeUsers: number;
    avgExecutionsPerUser: number | null;
    avgToolsPerSession: number | null;
  };
}

// ==========================================
// 1. TIME PERIOD BOUNDS
// ==========================================

export function getPeriodBounds(period: TimePeriod, referenceNow = Date.now()): { startTime: number; endTime: number } {
  const now = new Date(referenceNow);
  const endTime = referenceNow;

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { startTime: start.getTime(), endTime };
  }

  if (period === '7d') {
    const start = new Date(referenceNow - 7 * 24 * 60 * 60 * 1000);
    return { startTime: start.getTime(), endTime };
  }

  if (period === '30d') {
    const start = new Date(referenceNow - 30 * 24 * 60 * 60 * 1000);
    return { startTime: start.getTime(), endTime };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startTime: start.getTime(), endTime };
  }

  return { startTime: referenceNow - 7 * 24 * 60 * 60 * 1000, endTime };
}

// ==========================================
// 2. ERROR LABELS DICTIONARY
// ==========================================

const ERROR_LABELS: Record<string, string> = {
  'TIMEOUT': 'Tempo Limite Esgotado (Timeout)',
  'REQUEST_TIMEOUT': 'Tempo Limite Esgotado (Timeout)',
  'ABORTED': 'Requisição Cancelada (Abort)',
  'REQUEST_ABORTED': 'Requisição Cancelada (Abort)',
  'BILLING_CAP_EXCEEDED': 'Cota / Limite de Requisições',
  'NETWORK_ERROR': 'Falha de Conexão / CORS',
  'AUTH_FAILED': 'Falha de Autenticação / Token',
  'MODEL_ERROR': 'Erro Interno do Modelo',
  'INVALID_RESPONSE': 'Resposta Inválida da API',
  'PARSER_ERROR': 'Falha de Formatação JSON',
  'VALIDATION_ERROR': 'Falha de Contrato / Schema',
  'UNKNOWN_ERROR': 'Erro Genérico Não Classificado'
};

export function getErrorLabel(code: string): string {
  return ERROR_LABELS[code] || (code ? code.replace(/_/g, ' ') : 'Erro Desconhecido');
}

// ==========================================
// 3. MAIN AGGREGATOR FUNCTION
// ==========================================

export function computeTelemetryAnalytics(
  rawEvents: UsageTelemetryEvent[],
  period: TimePeriod = '7d',
  referenceNow = Date.now()
): AggregatedDashboardMetrics {
  const safeEvents = Array.isArray(rawEvents) ? rawEvents : [];
  const bounds = getPeriodBounds(period, referenceNow);

  // 1. Deduplicate by event ID
  const eventMap = new Map<string, UsageTelemetryEvent>();
  for (const ev of safeEvents) {
    if (!ev || !ev.id) continue;
    if (typeof ev.timestamp !== 'number' || !Number.isFinite(ev.timestamp)) continue;
    if (ev.timestamp >= bounds.startTime && ev.timestamp <= bounds.endTime) {
      if (!eventMap.has(ev.id)) {
        eventMap.set(ev.id, ev);
      }
    }
  }

  const events = Array.from(eventMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  const totalEventsCount = events.length;
  const hasData = totalEventsCount > 0;

  // 2. Request deduplication & execution tracking
  // A single AI execution maps to its requestId (or event.id fallback)
  const executionsByRequestId = new Map<
    string,
    {
      toolId: string;
      started: boolean;
      success: boolean;
      error: boolean;
      errorCode?: string;
      latencyMs?: number;
      timestamp: number;
    }
  >();

  // Track tools opened
  const toolOpenEvents: UsageTelemetryEvent[] = [];
  const activeUserSet = new Set<string>();
  const activeSessionSet = new Set<string>();
  const toolsPerSessionMap = new Map<string, Set<string>>();

  for (const ev of events) {
    // User & Session tracking
    if (ev.userId && ev.userId.trim()) {
      activeUserSet.add(ev.userId.trim());
    }
    if (ev.sessionId && ev.sessionId.trim()) {
      activeSessionSet.add(ev.sessionId.trim());
      if (!toolsPerSessionMap.has(ev.sessionId.trim())) {
        toolsPerSessionMap.set(ev.sessionId.trim(), new Set());
      }
      if (ev.toolId) {
        toolsPerSessionMap.get(ev.sessionId.trim())!.add(ev.toolId);
      }
    }

    if (ev.eventType === 'TOOL_OPEN') {
      toolOpenEvents.push(ev);
    }

    // AI Generations
    if (ev.eventType === 'GENERATION_STARTED' || ev.eventType === 'GENERATION_SUCCESS' || ev.eventType === 'GENERATION_ERROR') {
      const reqId = (ev.metadata?.requestId as string) || ev.id.replace(/^(gen_start_|gen_ok_|gen_err_)/, '') || ev.id;
      const existing = executionsByRequestId.get(reqId) || {
        toolId: ev.toolId,
        started: false,
        success: false,
        error: false,
        timestamp: ev.timestamp
      };

      if (ev.eventType === 'GENERATION_STARTED') {
        existing.started = true;
      } else if (ev.eventType === 'GENERATION_SUCCESS') {
        existing.success = true;
        if (typeof ev.ai?.latencyMs === 'number') {
          existing.latencyMs = ev.ai.latencyMs;
        }
      } else if (ev.eventType === 'GENERATION_ERROR') {
        existing.error = true;
        existing.errorCode = ev.ai?.errorCode || (ev.ai?.status === 'TIMEOUT' ? 'TIMEOUT' : ev.ai?.status === 'ABORTED' ? 'ABORTED' : 'UNKNOWN_ERROR');
        if (typeof ev.ai?.latencyMs === 'number') {
          existing.latencyMs = ev.ai.latencyMs;
        }
      }

      executionsByRequestId.set(reqId, existing);
    }
  }

  // Fallback for active users: if no userId was authenticated, count unique sessions
  const effectiveActiveUsers = activeUserSet.size > 0 ? activeUserSet.size : activeSessionSet.size;

  // 3. Compute KPI aggregations
  const totalToolOpens = toolOpenEvents.length;
  const executionList = Array.from(executionsByRequestId.values());
  const aiExecutions = executionList.length;

  let totalSuccesses = 0;
  let totalErrors = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const exec of executionList) {
    if (exec.success) totalSuccesses++;
    if (exec.error) totalErrors++;
    if (typeof exec.latencyMs === 'number' && exec.latencyMs > 0) {
      latencySum += exec.latencyMs;
      latencyCount++;
    }
  }

  const finishedExecutions = totalSuccesses + totalErrors;
  const successRate = finishedExecutions > 0 ? Math.round((totalSuccesses / finishedExecutions) * 1000) / 10 : (aiExecutions > 0 && totalErrors === 0 ? 100 : null);
  const avgLatencyMs = latencyCount > 0 ? Math.round(latencySum / latencyCount) : null;

  // Tool open frequencies & top tool separation
  const toolOpenCounts = new Map<string, number>();
  for (const to of toolOpenEvents) {
    toolOpenCounts.set(to.toolId, (toolOpenCounts.get(to.toolId) || 0) + 1);
  }

  let mostUsedTool: { id: string; label: string; count: number } | null = null;
  let highestProductiveOpenCount = 0;

  let mostAccessedScreen: { id: string; label: string; count: number } | null = null;
  let highestAnyScreenCount = 0;

  for (const [toolId, count] of toolOpenCounts.entries()) {
    const resolved = resolveTool(toolId);
    if (count > highestAnyScreenCount) {
      highestAnyScreenCount = count;
      mostAccessedScreen = {
        id: resolved.id,
        label: resolved.label,
        count
      };
    }

    if (resolved.role === 'PRODUCTIVE' || resolved.role === undefined) {
      if (count > highestProductiveOpenCount) {
        highestProductiveOpenCount = count;
        mostUsedTool = {
          id: resolved.id,
          label: resolved.label,
          count
        };
      }
    }
  }

  // Calculate canonical attribution coverage
  let canonicalExecutionsCount = 0;
  for (const exec of executionList) {
    const resolved = resolveTool(exec.toolId);
    if (resolved.id !== 'unknown_tool') {
      canonicalExecutionsCount++;
    }
  }
  const toolAttributionCoveragePercent = aiExecutions > 0
    ? Math.round((canonicalExecutionsCount / aiExecutions) * 100)
    : 100;

  // Session & User averages
  const totalSessions = activeSessionSet.size;
  const avgExecutionsPerSession = totalSessions > 0 ? Math.round((aiExecutions / totalSessions) * 10) / 10 : null;
  const avgExecutionsPerUser = effectiveActiveUsers > 0 ? Math.round((aiExecutions / effectiveActiveUsers) * 10) / 10 : null;

  let totalToolsInSessions = 0;
  for (const toolSet of toolsPerSessionMap.values()) {
    totalToolsInSessions += toolSet.size;
  }
  const avgToolsPerSession = totalSessions > 0 ? Math.round((totalToolsInSessions / totalSessions) * 10) / 10 : null;

  const kpis: OverviewKpis = {
    activeUsers: effectiveActiveUsers,
    aiExecutions,
    mostUsedTool,
    mostAccessedScreen,
    toolAttributionCoveragePercent,
    successRate,
    totalErrors,
    avgLatencyMs,
    totalSessions,
    avgExecutionsPerSession,
    avgToolsPerSession,
    totalToolOpens
  };

  // 4. Activity Timeline Bucketing
  const timeline = generateActivityTimeline(events, executionsByRequestId, period, bounds);

  // 5. Tool Ranking & Health Status
  const toolRanking = generateToolRanking(events, executionsByRequestId, toolOpenCounts);

  // 6. Error Analytics
  const errorGroups = generateErrorGroups(events, executionsByRequestId);

  return {
    period,
    timeBounds: bounds,
    hasData,
    totalEventsCount,
    kpis,
    timeline,
    toolRanking,
    errorGroups,
    sessionStats: {
      totalSessions,
      activeUsers: effectiveActiveUsers,
      avgExecutionsPerUser,
      avgToolsPerSession
    }
  };
}

// ==========================================
// 4. TIMELINE GENERATOR
// ==========================================

function generateActivityTimeline(
  events: UsageTelemetryEvent[],
  executionsMap: Map<string, { toolId: string; started: boolean; success: boolean; error: boolean; timestamp: number }>,
  period: TimePeriod,
  bounds: { startTime: number; endTime: number }
): ActivityTimelinePoint[] {
  const buckets: ActivityTimelinePoint[] = [];

  if (period === 'today') {
    // 24 hourly buckets
    const startDay = new Date(bounds.startTime);
    for (let h = 0; h < 24; h++) {
      const bucketTime = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), h, 0, 0).getTime();
      const label = `${String(h).padStart(2, '0')}:00`;
      buckets.push({
        key: `hour_${h}`,
        label,
        timestamp: bucketTime,
        toolOpens: 0,
        aiExecutions: 0,
        errors: 0,
        successes: 0
      });
    }

    for (const ev of events) {
      const evDate = new Date(ev.timestamp);
      const hour = evDate.getHours();
      if (hour >= 0 && hour < 24) {
        if (ev.eventType === 'TOOL_OPEN') {
          buckets[hour].toolOpens++;
        }
      }
    }

    for (const exec of executionsMap.values()) {
      const execDate = new Date(exec.timestamp);
      const hour = execDate.getHours();
      if (hour >= 0 && hour < 24) {
        buckets[hour].aiExecutions++;
        if (exec.success) buckets[hour].successes++;
        if (exec.error) buckets[hour].errors++;
      }
    }
  } else {
    // Daily buckets (7 days, 30 days or month)
    const numDays = period === '7d' ? 7 : period === '30d' ? 30 : Math.max(1, new Date().getDate());
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = numDays - 1; i >= 0; i--) {
      const dayTime = bounds.endTime - i * dayMs;
      const d = new Date(dayTime);
      const dayLabel = period === '7d'
        ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      buckets.push({
        key: `day_${d.toISOString().slice(0, 10)}`,
        label: dayLabel,
        timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
        toolOpens: 0,
        aiExecutions: 0,
        errors: 0,
        successes: 0
      });
    }

    // Helper to find closest day bucket
    const findBucketIdx = (ts: number) => {
      if (typeof ts !== 'number' || !Number.isFinite(ts)) return -1;
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return -1;
      try {
        const dateStr = d.toISOString().slice(0, 10);
        return buckets.findIndex(b => b.key === `day_${dateStr}`);
      } catch {
        return -1;
      }
    };

    for (const ev of events) {
      if (ev.eventType === 'TOOL_OPEN') {
        const idx = findBucketIdx(ev.timestamp);
        if (idx !== -1) {
          buckets[idx].toolOpens++;
        }
      }
    }

    for (const exec of executionsMap.values()) {
      const idx = findBucketIdx(exec.timestamp);
      if (idx !== -1) {
        buckets[idx].aiExecutions++;
        if (exec.success) buckets[idx].successes++;
        if (exec.error) buckets[idx].errors++;
      }
    }
  }

  return buckets;
}

// ==========================================
// 5. TOOL RANKING GENERATOR
// ==========================================

function generateToolRanking(
  events: UsageTelemetryEvent[],
  executionsMap: Map<string, { toolId: string; started: boolean; success: boolean; error: boolean; latencyMs?: number }>,
  toolOpenCounts: Map<string, number>
): ToolRankingItem[] {
  const toolStats = new Map<
    string,
    {
      toolOpens: number;
      aiExecutions: number;
      successes: number;
      errors: number;
      latencyTotal: number;
      latencyCount: number;
    }
  >();

  // Initialize from all tool opens
  for (const [toolId, count] of toolOpenCounts.entries()) {
    toolStats.set(toolId, {
      toolOpens: count,
      aiExecutions: 0,
      successes: 0,
      errors: 0,
      latencyTotal: 0,
      latencyCount: 0
    });
  }

  // Aggregate executions per tool
  for (const exec of executionsMap.values()) {
    const toolId = exec.toolId || 'create';
    const curr = toolStats.get(toolId) || {
      toolOpens: 0,
      aiExecutions: 0,
      successes: 0,
      errors: 0,
      latencyTotal: 0,
      latencyCount: 0
    };

    curr.aiExecutions++;
    if (exec.success) curr.successes++;
    if (exec.error) curr.errors++;
    if (typeof exec.latencyMs === 'number' && exec.latencyMs > 0) {
      curr.latencyTotal += exec.latencyMs;
      curr.latencyCount++;
    }

    toolStats.set(toolId, curr);
  }

  const items: ToolRankingItem[] = [];

  for (const [toolId, stat] of toolStats.entries()) {
    const resolved = resolveTool(toolId);
    const finished = stat.successes + stat.errors;
    const rate = finished > 0 ? Math.round((stat.successes / finished) * 1000) / 10 : (stat.aiExecutions > 0 && stat.errors === 0 ? 100 : null);
    const avgLatency = stat.latencyCount > 0 ? Math.round(stat.latencyTotal / stat.latencyCount) : null;

    let health: ToolHealthStatus = 'IDLE';
    if (stat.aiExecutions > 0) {
      if (rate === null || rate >= 95) {
        health = 'HEALTHY';
      } else if (rate >= 80) {
        health = 'WARNING';
      } else {
        health = 'CRITICAL';
      }
    } else if (stat.toolOpens > 0) {
      health = 'STANDBY';
    }

    items.push({
      toolId,
      toolLabel: resolved.label,
      toolCategory: resolved.category,
      toolOpens: stat.toolOpens,
      aiExecutions: stat.aiExecutions,
      successes: stat.successes,
      errors: stat.errors,
      successRate: rate,
      avgLatencyMs: avgLatency,
      health
    });
  }

  // Default sorting: toolOpens DESC, then aiExecutions DESC
  return items.sort((a, b) => b.toolOpens - a.toolOpens || b.aiExecutions - a.aiExecutions);
}

// ==========================================
// 6. ERROR GROUPS GENERATOR
// ==========================================

function generateErrorGroups(
  events: UsageTelemetryEvent[],
  executionsMap: Map<string, { toolId: string; error: boolean; errorCode?: string; timestamp: number }>
): ErrorGroupItem[] {
  const groups = new Map<
    string,
    {
      count: number;
      lastOccurredAt: number;
      toolsCount: Map<string, number>;
    }
  >();

  for (const exec of executionsMap.values()) {
    if (!exec.error) continue;
    const code = exec.errorCode || 'UNKNOWN_ERROR';
    const curr = groups.get(code) || {
      count: 0,
      lastOccurredAt: 0,
      toolsCount: new Map()
    };

    curr.count++;
    curr.lastOccurredAt = Math.max(curr.lastOccurredAt, exec.timestamp);
    curr.toolsCount.set(exec.toolId, (curr.toolsCount.get(exec.toolId) || 0) + 1);

    groups.set(code, curr);
  }

  const result: ErrorGroupItem[] = [];

  for (const [code, grp] of groups.entries()) {
    const affectedTools = Array.from(grp.toolsCount.entries())
      .map(([toolId, count]) => ({
        id: toolId,
        label: resolveTool(toolId).label,
        count
      }))
      .sort((a, b) => b.count - a.count);

    result.push({
      code,
      label: getErrorLabel(code),
      count: grp.count,
      affectedTools,
      lastOccurredAt: grp.lastOccurredAt
    });
  }

  return result.sort((a, b) => b.count - a.count);
}
