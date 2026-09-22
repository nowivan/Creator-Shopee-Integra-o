/**
 * COST INTELLIGENCE SERVICE (Etapa 3)
 * CREATOR INTELLIGENCE PRO
 *
 * Central aggregator service responsible for computing financial, token
 * and cost metrics from usage telemetry events without modifying core engines.
 *
 * Guaranteed isolation:
 * - Pure READ-ONLY aggregator over deduplicated UsageTelemetryEvents.
 * - Deduplicates requests by requestId (associates cost with final completed request).
 * - Zero sensitive user data/prompts/images stored or exposed.
 * - Resilient to partial events, missing tokens, and unknown models.
 */

import { UsageTelemetryEvent } from '../types/telemetry';
import { resolveTool } from './usageTelemetryService';
import {
  estimateAiRequestCost,
  getCostCurrencyConfig,
  resolveModelPricing,
  PricingStatus,
  AiModelPricing
} from './aiPricingRegistry';
import { TimePeriod, getPeriodBounds } from './telemetryAnalyticsService';

export interface CostKpis {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
  totalTokens: number;
  tokenReconciliationStatus: 'EXACT' | 'PARTIAL' | 'MISMATCH' | 'NONE';
  totalCostUsd: number;
  totalCostBrl: number;
  todayCostUsd: number;
  todayCostBrl: number;
  avgCostPerRequestUsd: number | null;
  avgCostPerRequestBrl: number | null;
  avgTokensPerRequest: number | null;
  mostUsedModel: { model: string; displayName: string; count: number; totalTokens: number } | null;
  mostExpensiveModel: { model: string; displayName: string; totalCostUsd: number; totalCostBrl: number } | null;
}

export interface DataQualityMetrics {
  totalFinishedRequests: number;
  requestsWithTokens: number;
  requestsWithKnownCost: number;
  requestsWithoutPricing: number;
  requestsWithoutTokenMetadata: number;
  tokenCoveragePercent: number;
  pricingCoveragePercent: number;
  canonicalFinishedRequests: number;
  toolAttributionCoveragePercent: number;
}

export interface ToolCostItem {
  toolId: string;
  toolLabel: string;
  toolCategory: string;
  executions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  avgCostPerRequestBrl: number | null;
  percentageOfGlobalCost: number;
}

export interface ModelIntelligenceItem {
  modelKey: string;
  displayName: string;
  provider: string;
  requestsCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  avgCostPerRequestBrl: number | null;
  sharePercent: number;
}

export interface UserCostItem {
  maskedUserId: string;
  sessionsCount: number;
  requestsCount: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
}

export interface SessionCostStats {
  totalSessions: number;
  avgCostPerSessionBrl: number | null;
  avgTokensPerSession: number | null;
  avgExecutionsPerSession: number | null;
}

export interface DailyCostTimelinePoint {
  key: string;
  label: string;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  costBrl: number;
  executions: number;
}

export interface MonthlyProjection {
  currentAccumulatedBrl: number;
  currentAccumulatedUsd: number;
  projectedTotalBrl: number;
  projectedTotalUsd: number;
  daysPassed: number;
  daysRemaining: number;
  daysInMonth: number;
  activeDaysCount: number;
  dailyAverageActiveDaysBrl: number;
  isEstimate: boolean;
}

export interface SpendCap {
  monthlySpendCapBrl: number;
  currentSpendBrl: number;
  percentageUsed: number;
  isExceeded: boolean;
}

export type CostAnomalyStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export interface CostAnomaly {
  status: CostAnomalyStatus;
  last24hCostBrl: number;
  baselineDailyCostBrl: number;
  variationPercent: number;
  affectedToolLabel?: string;
  affectedToolId?: string;
}

export interface DebugRequestItem {
  requestIdMasked: string;
  toolId: string;
  toolLabel: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  costBrl: number;
  pricingStatus: PricingStatus;
  status: string;
  timestamp: number;
}

export interface CostIntelligenceData {
  hasData: boolean;
  period: TimePeriod;
  currency: 'BRL' | 'USD';
  usdToBrlRate: number;
  kpis: CostKpis;
  dataQuality: DataQualityMetrics;
  toolCostRanking: ToolCostItem[];
  modelIntelligence: ModelIntelligenceItem[];
  userCostAggregation: UserCostItem[];
  sessionCostStats: SessionCostStats;
  costTimeline: DailyCostTimelinePoint[];
  monthlyProjection: MonthlyProjection;
  spendCap: SpendCap;
  costAnomaly: CostAnomaly;
  debugRequests: DebugRequestItem[];
}

// Storage key for spend cap
const SPEND_CAP_STORAGE_KEY = 'creator_monthly_spend_cap_brl';
const DEFAULT_SPEND_CAP_BRL = 150.0;

export function getMonthlySpendCapBrl(): number {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(SPEND_CAP_STORAGE_KEY);
      if (stored) {
        const val = parseFloat(stored);
        if (Number.isFinite(val) && val > 0) return val;
      }
    } catch {
      // Non-blocking
    }
  }
  return DEFAULT_SPEND_CAP_BRL;
}

export function saveMonthlySpendCapBrl(val: number): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (Number.isFinite(val) && val > 0) {
        window.localStorage.setItem(SPEND_CAP_STORAGE_KEY, val.toString());
      }
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Masks user ID for display (e.g. "USR-9F1A"). Never exposes emails or personal names.
 */
function maskUserId(rawId?: string): string {
  if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
    return 'USR-ANON';
  }
  const clean = rawId.trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
  return `USR-${hex}`;
}

/**
 * Masks Request ID for technical debug (e.g. "REQ-...3A8F").
 */
function maskRequestId(rawId?: string): string {
  if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
    return 'REQ-UNKNOWN';
  }
  const clean = rawId.trim();
  if (clean.length <= 8) return `REQ-${clean}`;
  return `REQ-...${clean.slice(-6)}`;
}

/**
 * Primary computation engine for Cost & Token Intelligence.
 */
export function computeCostIntelligence(
  rawEvents: UsageTelemetryEvent[],
  period: TimePeriod = '7d',
  referenceNow = Date.now()
): CostIntelligenceData {
  const safeEvents = Array.isArray(rawEvents) ? rawEvents : [];
  const currencyConfig = getCostCurrencyConfig();
  const usdToBrlRate = currencyConfig.usdToBrlRate;
  const spendCapBrl = getMonthlySpendCapBrl();

  const bounds = getPeriodBounds(period, referenceNow);
  const todayBounds = getPeriodBounds('today', referenceNow);

  // 1. Deduplicate by requestId to avoid counting started + finished multiple times
  // Map key: requestId -> { event, costResult, toolInfo }
  interface ResolvedAiExecution {
    requestId: string;
    toolId: string;
    toolLabel: string;
    toolCategory: string;
    userId?: string;
    sessionId: string;
    timestamp: number;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    totalTokens: number;
    costUsd: number;
    costBrl: number;
    pricingStatus: PricingStatus;
    tokenSource: 'API_REPORTED' | 'UNAVAILABLE';
    status: string;
  }

  const executionMap = new Map<string, ResolvedAiExecution>();
  const allHistoricalExecutions: ResolvedAiExecution[] = [];

  for (const ev of safeEvents) {
    if (!ev || typeof ev !== 'object') continue;
    if (typeof ev.timestamp !== 'number' || !Number.isFinite(ev.timestamp)) continue;

    const isAiFinished = ev.eventType === 'GENERATION_SUCCESS' || ev.eventType === 'GENERATION_ERROR';
    if (!isAiFinished) continue;

    const requestId = (ev.metadata?.requestId as string) || ev.id.replace(/^gen_(ok|err|start)_/, '');
    if (!requestId) continue;

    const tool = resolveTool(ev.toolId);
    const model = ev.ai?.model || 'gemini-3.5-flash';
    const provider = ev.ai?.provider || 'Google AI';

    // Extract tokens
    let inputTokens = ev.ai?.inputTokens;
    let outputTokens = ev.ai?.outputTokens;
    let thinkingTokens = ev.ai?.thinkingTokens;
    let totalTokens = ev.ai?.totalTokens;

    // Check fallback aliases if in metadata
    if (inputTokens === undefined && typeof ev.metadata?.promptTokenCount === 'number') {
      inputTokens = ev.metadata.promptTokenCount;
    }
    if (outputTokens === undefined && typeof ev.metadata?.candidatesTokenCount === 'number') {
      outputTokens = ev.metadata.candidatesTokenCount;
    }
    if (thinkingTokens === undefined && typeof ev.metadata?.thoughtsTokenCount === 'number') {
      thinkingTokens = ev.metadata.thoughtsTokenCount;
    }
    if (thinkingTokens === undefined && typeof ev.metadata?.thinkingTokenCount === 'number') {
      thinkingTokens = ev.metadata.thinkingTokenCount;
    }
    if (totalTokens === undefined && typeof ev.metadata?.totalTokenCount === 'number') {
      totalTokens = ev.metadata.totalTokenCount;
    }

    const costCalc = estimateAiRequestCost({
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      usdToBrlRate
    });

    const execution: ResolvedAiExecution = {
      requestId,
      toolId: tool.id,
      toolLabel: tool.label,
      toolCategory: tool.category,
      userId: ev.userId,
      sessionId: ev.sessionId || 'sess_default',
      timestamp: ev.timestamp,
      model: costCalc.modelKey,
      provider,
      inputTokens: costCalc.inputTokens || 0,
      outputTokens: costCalc.outputTokens || 0,
      thinkingTokens: thinkingTokens || 0,
      totalTokens: costCalc.totalTokens || 0,
      costUsd: costCalc.totalCostUsd || 0,
      costBrl: costCalc.totalCostBrl || 0,
      pricingStatus: costCalc.pricingStatus,
      tokenSource: costCalc.tokenSource,
      status: ev.ai?.status || (ev.eventType === 'GENERATION_SUCCESS' ? 'SUCCESS' : 'ERROR')
    };

    // Keep all historical for anomaly detection baseline
    allHistoricalExecutions.push(execution);

    // Filter within active period for current KPIs & Tables
    if (ev.timestamp >= bounds.startTime && ev.timestamp <= bounds.endTime) {
      // Prioritize success with usage metadata if duplicate
      const existing = executionMap.get(requestId);
      if (!existing || (existing.totalTokens === 0 && execution.totalTokens > 0)) {
        executionMap.set(requestId, execution);
      }
    }
  }

  const periodExecutions = Array.from(executionMap.values());
  const hasData = periodExecutions.length > 0;

  // 2. Compute Aggregated KPIs
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;
  let totalTokens = 0;
  let totalCostUsd = 0;
  let totalCostBrl = 0;

  let todayCostUsd = 0;
  let todayCostBrl = 0;

  let requestsWithTokens = 0;
  let requestsWithKnownCost = 0;
  let requestsWithoutPricing = 0;
  let requestsWithoutTokenMetadata = 0;
  let canonicalFinishedRequests = 0;

  const modelUsageMap = new Map<string, { count: number; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; costBrl: number; provider: string }>();
  const toolCostMap = new Map<string, { executions: number; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; costBrl: number; label: string; category: string }>();
  const userCostMap = new Map<string, { sessions: Set<string>; requests: number; totalTokens: number; costUsd: number; costBrl: number }>();
  const sessionCostMap = new Map<string, { requests: number; totalTokens: number; costBrl: number }>();

  for (const exec of periodExecutions) {
    totalInputTokens += exec.inputTokens;
    totalOutputTokens += exec.outputTokens;
    totalThinkingTokens += exec.thinkingTokens;
    totalTokens += exec.totalTokens;
    totalCostUsd += exec.costUsd;
    totalCostBrl += exec.costBrl;

    if (exec.toolId !== 'unknown_tool') {
      canonicalFinishedRequests++;
    }

    // Today filter check
    if (exec.timestamp >= todayBounds.startTime && exec.timestamp <= todayBounds.endTime) {
      todayCostUsd += exec.costUsd;
      todayCostBrl += exec.costBrl;
    }

    // Data Quality counters
    if (exec.tokenSource === 'API_REPORTED' && exec.totalTokens > 0) {
      requestsWithTokens++;
      if (exec.pricingStatus === 'PRICING_KNOWN') {
        requestsWithKnownCost++;
      } else if (exec.pricingStatus === 'PRICING_UNKNOWN') {
        requestsWithoutPricing++;
      }
    } else {
      requestsWithoutTokenMetadata++;
    }

    // Model map
    const modelEntry = modelUsageMap.get(exec.model) || { count: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0, provider: exec.provider };
    modelEntry.count++;
    modelEntry.inputTokens += exec.inputTokens;
    modelEntry.outputTokens += exec.outputTokens;
    modelEntry.totalTokens += exec.totalTokens;
    modelEntry.costUsd += exec.costUsd;
    modelEntry.costBrl += exec.costBrl;
    modelUsageMap.set(exec.model, modelEntry);

    // Tool cost map
    const toolEntry = toolCostMap.get(exec.toolId) || { executions: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, costBrl: 0, label: exec.toolLabel, category: exec.toolCategory };
    toolEntry.executions++;
    toolEntry.inputTokens += exec.inputTokens;
    toolEntry.outputTokens += exec.outputTokens;
    toolEntry.totalTokens += exec.totalTokens;
    toolEntry.costUsd += exec.costUsd;
    toolEntry.costBrl += exec.costBrl;
    toolCostMap.set(exec.toolId, toolEntry);

    // User cost map
    const maskedUser = maskUserId(exec.userId);
    const userEntry = userCostMap.get(maskedUser) || { sessions: new Set<string>(), requests: 0, totalTokens: 0, costUsd: 0, costBrl: 0 };
    userEntry.sessions.add(exec.sessionId);
    userEntry.requests++;
    userEntry.totalTokens += exec.totalTokens;
    userEntry.costUsd += exec.costUsd;
    userEntry.costBrl += exec.costBrl;
    userCostMap.set(maskedUser, userEntry);

    // Session cost map
    const sessEntry = sessionCostMap.get(exec.sessionId) || { requests: 0, totalTokens: 0, costBrl: 0 };
    sessEntry.requests++;
    sessEntry.totalTokens += exec.totalTokens;
    sessEntry.costBrl += exec.costBrl;
    sessionCostMap.set(exec.sessionId, sessEntry);
  }

  // 3. Most Used & Most Expensive Model
  let mostUsedModel: CostKpis['mostUsedModel'] = null;
  let mostExpensiveModel: CostKpis['mostExpensiveModel'] = null;

  let maxCount = -1;
  let maxCost = -1;

  for (const [modelKey, data] of modelUsageMap.entries()) {
    const pricing = resolveModelPricing(modelKey);
    const displayName = pricing?.displayName || modelKey;

    if (data.count > maxCount) {
      maxCount = data.count;
      mostUsedModel = {
        model: modelKey,
        displayName,
        count: data.count,
        totalTokens: data.totalTokens
      };
    }

    if (data.costUsd > maxCost) {
      maxCost = data.costUsd;
      mostExpensiveModel = {
        model: modelKey,
        displayName,
        totalCostUsd: Math.round(data.costUsd * 1000) / 1000,
        totalCostBrl: Math.round(data.costBrl * 100) / 100
      };
    }
  }

  const finishedCount = periodExecutions.length;
  const avgCostPerRequestUsd = finishedCount > 0 ? totalCostUsd / finishedCount : null;
  const avgCostPerRequestBrl = finishedCount > 0 ? totalCostBrl / finishedCount : null;
  const avgTokensPerRequest = finishedCount > 0 ? Math.round(totalTokens / finishedCount) : null;

  let tokenReconciliationStatus: 'EXACT' | 'PARTIAL' | 'MISMATCH' | 'NONE' = 'NONE';
  if (totalTokens > 0) {
    const sumKnown = totalInputTokens + totalOutputTokens + totalThinkingTokens;
    if (sumKnown === totalTokens) {
      tokenReconciliationStatus = 'EXACT';
    } else if (sumKnown < totalTokens) {
      tokenReconciliationStatus = 'PARTIAL';
    } else {
      tokenReconciliationStatus = 'MISMATCH';
    }
  }

  const kpis: CostKpis = {
    totalInputTokens,
    totalOutputTokens,
    totalThinkingTokens,
    totalTokens,
    tokenReconciliationStatus,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    totalCostBrl: Math.round(totalCostBrl * 1_000_000) / 1_000_000,
    todayCostUsd: Math.round(todayCostUsd * 1_000_000) / 1_000_000,
    todayCostBrl: Math.round(todayCostBrl * 1_000_000) / 1_000_000,
    avgCostPerRequestUsd,
    avgCostPerRequestBrl,
    avgTokensPerRequest,
    mostUsedModel,
    mostExpensiveModel
  };

  // 4. Data Quality Metrics
  const tokenCoveragePercent = finishedCount > 0 ? Math.round((requestsWithTokens / finishedCount) * 100) : 100;
  const pricingCoveragePercent = requestsWithTokens > 0 ? Math.round((requestsWithKnownCost / requestsWithTokens) * 100) : 100;
  const toolAttributionCoveragePercent = finishedCount > 0 ? Math.round((canonicalFinishedRequests / finishedCount) * 100) : 100;

  const dataQuality: DataQualityMetrics = {
    totalFinishedRequests: finishedCount,
    requestsWithTokens,
    requestsWithKnownCost,
    requestsWithoutPricing,
    requestsWithoutTokenMetadata,
    tokenCoveragePercent,
    pricingCoveragePercent,
    canonicalFinishedRequests,
    toolAttributionCoveragePercent
  };

  // 5. Tool Cost Ranking Table
  const toolCostRanking: ToolCostItem[] = Array.from(toolCostMap.entries()).map(([toolId, data]) => {
    const avgCost = data.executions > 0 ? data.costBrl / data.executions : null;
    const share = totalCostBrl > 0 ? (data.costBrl / totalCostBrl) * 100 : 0;
    return {
      toolId,
      toolLabel: data.label,
      toolCategory: data.category,
      executions: data.executions,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      totalCostUsd: Math.round(data.costUsd * 1000) / 1000,
      totalCostBrl: Math.round(data.costBrl * 100) / 100,
      avgCostPerRequestBrl: avgCost,
      percentageOfGlobalCost: Math.round(share * 10) / 10
    };
  }).sort((a, b) => b.totalCostBrl - a.totalCostBrl);

  // 6. Model Intelligence Table
  const modelIntelligence: ModelIntelligenceItem[] = Array.from(modelUsageMap.entries()).map(([modelKey, data]) => {
    const pricing = resolveModelPricing(modelKey);
    const displayName = pricing?.displayName || modelKey;
    const avgCost = data.count > 0 ? data.costBrl / data.count : null;
    const share = totalCostBrl > 0 ? (data.costBrl / totalCostBrl) * 100 : 0;
    return {
      modelKey,
      displayName,
      provider: data.provider,
      requestsCount: data.count,
      inputTokens: data.inputTokens || (pricing ? Math.round(data.totalTokens * 0.6) : 0),
      outputTokens: data.outputTokens || (pricing ? Math.round(data.totalTokens * 0.4) : 0),
      totalTokens: data.totalTokens,
      totalCostUsd: Math.round(data.costUsd * 1000) / 1000,
      totalCostBrl: Math.round(data.costBrl * 100) / 100,
      avgCostPerRequestBrl: avgCost,
      sharePercent: Math.round(share * 10) / 10
    };
  }).sort((a, b) => b.totalCostBrl - a.totalCostBrl);

  // 7. User Cost Aggregation Table
  const userCostAggregation: UserCostItem[] = Array.from(userCostMap.entries()).map(([maskedUserId, data]) => {
    return {
      maskedUserId,
      sessionsCount: data.sessions.size,
      requestsCount: data.requests,
      totalTokens: data.totalTokens,
      totalCostUsd: Math.round(data.costUsd * 1000) / 1000,
      totalCostBrl: Math.round(data.costBrl * 100) / 100
    };
  }).sort((a, b) => b.totalCostBrl - a.totalCostBrl);

  // 8. Session Cost Stats
  const totalSessions = sessionCostMap.size;
  const avgCostPerSessionBrl = totalSessions > 0 ? totalCostBrl / totalSessions : null;
  const avgTokensPerSession = totalSessions > 0 ? Math.round(totalTokens / totalSessions) : null;
  const avgExecutionsPerSession = totalSessions > 0 ? Math.round((finishedCount / totalSessions) * 10) / 10 : null;

  const sessionCostStats: SessionCostStats = {
    totalSessions,
    avgCostPerSessionBrl,
    avgTokensPerSession,
    avgExecutionsPerSession
  };

  // 9. Cost Timeline Builder (Hourly for today, Daily for other periods)
  const costTimeline: DailyCostTimelinePoint[] = [];

  if (period === 'today') {
    // 24 hour buckets
    const startOfToday = todayBounds.startTime;
    for (let h = 0; h < 24; h++) {
      const bucketTime = startOfToday + h * 60 * 60 * 1000;
      const label = `${String(h).padStart(2, '0')}:00`;
      costTimeline.push({
        key: `hour_${h}`,
        label,
        timestamp: bucketTime,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        costBrl: 0,
        executions: 0
      });
    }

    for (const exec of periodExecutions) {
      const d = new Date(exec.timestamp);
      const hour = d.getHours();
      if (hour >= 0 && hour < 24 && costTimeline[hour]) {
        costTimeline[hour].inputTokens += exec.inputTokens;
        costTimeline[hour].outputTokens += exec.outputTokens;
        costTimeline[hour].totalTokens += exec.totalTokens;
        costTimeline[hour].costUsd += exec.costUsd;
        costTimeline[hour].costBrl += exec.costBrl;
        costTimeline[hour].executions++;
      }
    }
  } else {
    // Daily buckets
    const daysCount = period === '7d' ? 7 : period === '30d' ? 30 : 31;
    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = new Date(referenceNow - i * 24 * 60 * 60 * 1000);
      const dateStr = dayDate.toISOString().slice(0, 10);
      const label = dayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      costTimeline.push({
        key: `day_${dateStr}`,
        label,
        timestamp: new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime(),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        costBrl: 0,
        executions: 0
      });
    }

    for (const exec of periodExecutions) {
      if (typeof exec.timestamp !== 'number' || !Number.isFinite(exec.timestamp)) continue;
      const d = new Date(exec.timestamp);
      if (Number.isNaN(d.getTime())) continue;
      try {
        const dateStr = d.toISOString().slice(0, 10);
        const bucket = costTimeline.find(b => b.key === `day_${dateStr}`);
        if (bucket) {
          bucket.inputTokens += exec.inputTokens;
          bucket.outputTokens += exec.outputTokens;
          bucket.totalTokens += exec.totalTokens;
          bucket.costUsd += exec.costUsd;
          bucket.costBrl += exec.costBrl;
          bucket.executions++;
        }
      } catch {
        // Non-blocking
      }
    }
  }

  // 10. Monthly Projection Calculation
  const refDate = new Date(referenceNow);
  const currentMonth = refDate.getMonth();
  const currentYear = refDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDayOfMonth = refDate.getDate();
  const daysRemaining = Math.max(0, daysInMonth - currentDayOfMonth);

  // Find month accumulated cost from historical executions
  const startOfMonthTs = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0).getTime();
  let monthAccCostUsd = 0;
  let monthAccCostBrl = 0;
  const activeDaysSet = new Set<string>();

  for (const exec of allHistoricalExecutions) {
    if (exec.timestamp >= startOfMonthTs && exec.timestamp <= referenceNow) {
      monthAccCostUsd += exec.costUsd;
      monthAccCostBrl += exec.costBrl;
      const dStr = new Date(exec.timestamp).toISOString().slice(0, 10);
      activeDaysSet.add(dStr);
    }
  }

  const activeDaysCount = Math.max(1, activeDaysSet.size);
  const dailyAverageActiveDaysBrl = monthAccCostBrl / activeDaysCount;
  const projectedRemainingBrl = dailyAverageActiveDaysBrl * daysRemaining;
  const projectedTotalBrl = monthAccCostBrl + projectedRemainingBrl;
  const projectedTotalUsd = monthAccCostUsd + (monthAccCostUsd / activeDaysCount) * daysRemaining;

  const monthlyProjection: MonthlyProjection = {
    currentAccumulatedBrl: Math.round(monthAccCostBrl * 100) / 100,
    currentAccumulatedUsd: Math.round(monthAccCostUsd * 100) / 100,
    projectedTotalBrl: Math.round(projectedTotalBrl * 100) / 100,
    projectedTotalUsd: Math.round(projectedTotalUsd * 100) / 100,
    daysPassed: currentDayOfMonth,
    daysRemaining,
    daysInMonth,
    activeDaysCount,
    dailyAverageActiveDaysBrl: Math.round(dailyAverageActiveDaysBrl * 100) / 100,
    isEstimate: true
  };

  // 11. Spend Cap Support
  const percentageUsed = spendCapBrl > 0 ? Math.round((monthAccCostBrl / spendCapBrl) * 100) : 0;
  const isExceeded = monthAccCostBrl > spendCapBrl;

  const spendCap: SpendCap = {
    monthlySpendCapBrl: spendCapBrl,
    currentSpendBrl: Math.round(monthAccCostBrl * 100) / 100,
    percentageUsed,
    isExceeded
  };

  // 12. Cost Anomaly Monitor (last 24h vs previous 7-day average)
  const oneDayMs = 24 * 60 * 60 * 1000;
  const last24hStart = referenceNow - oneDayMs;
  const baselineStart = referenceNow - 8 * oneDayMs;
  const baselineEnd = last24hStart;

  let last24hCostBrl = 0;
  const last24hToolCosts = new Map<string, number>();

  let baselineCostBrl = 0;
  const baselineActiveDays = new Set<string>();

  for (const exec of allHistoricalExecutions) {
    if (exec.timestamp >= last24hStart && exec.timestamp <= referenceNow) {
      last24hCostBrl += exec.costBrl;
      last24hToolCosts.set(exec.toolId, (last24hToolCosts.get(exec.toolId) || 0) + exec.costBrl);
    } else if (exec.timestamp >= baselineStart && exec.timestamp < baselineEnd) {
      baselineCostBrl += exec.costBrl;
      const dStr = new Date(exec.timestamp).toISOString().slice(0, 10);
      baselineActiveDays.add(dStr);
    }
  }

  let anomalyStatus: CostAnomalyStatus = 'NORMAL';
  let variationPercent = 0;
  const baselineDaysCount = Math.max(1, baselineActiveDays.size);
  const baselineDailyCostBrl = baselineCostBrl / baselineDaysCount;

  // Most impacted tool in last 24h
  let topToolId: string | undefined;
  let topToolCost = -1;
  for (const [tId, tCost] of last24hToolCosts.entries()) {
    if (tCost > topToolCost) {
      topToolCost = tCost;
      topToolId = tId;
    }
  }
  const affectedToolLabel = topToolId ? resolveTool(topToolId).label : undefined;

  if (allHistoricalExecutions.length < 5 || (baselineCostBrl === 0 && last24hCostBrl < 1.0)) {
    anomalyStatus = 'INSUFFICIENT_DATA';
  } else if (baselineDailyCostBrl > 0) {
    const ratio = last24hCostBrl / baselineDailyCostBrl;
    variationPercent = Math.round((ratio - 1) * 100);

    if (ratio >= 3.0 && last24hCostBrl >= 0.50) {
      anomalyStatus = 'CRITICAL';
    } else if (ratio >= 2.0 && last24hCostBrl >= 0.30) {
      anomalyStatus = 'WARNING';
    }
  }

  const costAnomaly: CostAnomaly = {
    status: anomalyStatus,
    last24hCostBrl: Math.round(last24hCostBrl * 100) / 100,
    baselineDailyCostBrl: Math.round(baselineDailyCostBrl * 100) / 100,
    variationPercent,
    affectedToolLabel,
    affectedToolId: topToolId
  };

  // 13. Debug Requests List (max 50, masked IDs, no sensitive payload)
  const debugRequests: DebugRequestItem[] = periodExecutions
    .slice(-50)
    .reverse()
    .map(exec => ({
      requestIdMasked: maskRequestId(exec.requestId),
      toolId: exec.toolId,
      toolLabel: exec.toolLabel,
      model: exec.model,
      inputTokens: exec.inputTokens,
      outputTokens: exec.outputTokens,
      totalTokens: exec.totalTokens,
      costUsd: exec.costUsd,
      costBrl: exec.costBrl,
      pricingStatus: exec.pricingStatus,
      status: exec.status,
      timestamp: exec.timestamp
    }));

  return {
    hasData,
    period,
    currency: currencyConfig.displayCurrency,
    usdToBrlRate,
    kpis,
    dataQuality,
    toolCostRanking,
    modelIntelligence,
    userCostAggregation,
    sessionCostStats,
    costTimeline,
    monthlyProjection,
    spendCap,
    costAnomaly,
    debugRequests
  };
}
