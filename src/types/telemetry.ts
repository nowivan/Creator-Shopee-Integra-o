/**
 * Canoncial types for Creator Intelligence Pro Telemetry Core (Etapa 1).
 */

export type TelemetryEventType =
  | 'TOOL_OPEN'
  | 'GENERATION_STARTED'
  | 'GENERATION_SUCCESS'
  | 'GENERATION_ERROR'
  | 'IMAGE_ANALYSIS'
  | 'COPY_RESULT'
  | 'CTA_GENERATION'
  | 'EXPORT'
  | 'COPY_RESULT_TO_CLIPBOARD';

export type TelemetryRequestStatus =
  | 'SUCCESS'
  | 'ERROR'
  | 'ABORTED'
  | 'TIMEOUT';

export type ToolRole = 'PRODUCTIVE' | 'INFRASTRUCTURE';

export type TokenReconciliationStatus = 'EXACT' | 'PARTIAL' | 'MISMATCH' | 'NONE';

export interface UsageTelemetryAiMeta {
  provider?: string;
  model?: string;

  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  totalTokens?: number;

  tokenReconciliation?: TokenReconciliationStatus;

  latencyMs?: number;

  estimatedCostUsd?: number;
  estimatedCostBrl?: number;

  status?: TelemetryRequestStatus;

  errorCode?: string;
}

export interface UsageTelemetryEvent {
  id: string;
  userId?: string;
  sessionId: string;

  toolId: string;
  toolName?: string;

  eventType: TelemetryEventType;

  timestamp: number;

  ai?: UsageTelemetryAiMeta;

  metadata?: Record<string, string | number | boolean | null>;
}

export interface ToolRegistryItem {
  id: string;
  label: string;
  category: string;
  role?: ToolRole;
}

export interface TelemetryStorageAdapter {
  saveEvent(event: UsageTelemetryEvent): Promise<void>;
  getEvents(query?: {
    limit?: number;
    toolId?: string;
    eventType?: TelemetryEventType;
    startTime?: number;
    endTime?: number;
  }): Promise<UsageTelemetryEvent[]>;
  clearEvents?(): Promise<void>;
}
