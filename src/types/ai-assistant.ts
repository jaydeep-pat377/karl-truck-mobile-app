/**
 * Types for the AI Assistant feature (mobile).
 *
 * These mirror the web app's `src/types/ai-dashboard.ts` and the Vercel AI SDK
 * v6 UIMessage wire shape so that chat threads created on mobile remain
 * readable on the web and vice-versa.
 */

export type WidgetType =
  | 'bar-chart'
  | 'horizontal-bar-chart'
  | 'stacked-bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'area-chart'
  | 'scatter-chart'
  | 'radar-chart'
  | 'treemap'
  | 'radial-bar-chart'
  | 'composed-chart'
  | 'kpi-card'
  | 'data-table'
  | 'text-summary';

export interface WidgetConfig {
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  colorScheme?: string;
  valueFormat?: 'number' | 'percentage' | 'currency' | 'compact';
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetData {
  columns?: string[];
  rows?: Record<string, unknown>[];
  totalRows?: number;
  text?: string;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  gridPosition: GridPosition;
  config?: WidgetConfig;
  sql?: string;
  data: WidgetData | null;
  error?: string;
  kpiId?: string;
}

export interface DashboardLayout {
  title: string;
  widgets: Widget[];
}

export type InsightSeverity = 'info' | 'warning' | 'alert';

export interface DashboardInsight {
  title: string;
  severity: InsightSeverity;
  widgetId?: string;
}

export type VerifyStatus =
  | 'idle'
  | 'loading'
  | 'verified'
  | 'diverges'
  | 'anomaly'
  | 'error';

export interface VerifyResult {
  aggregatedTotal: number;
  groundTruthCount: number;
  bucketCount: number;
  divergenceRatio: number;
  diverges: boolean;
  isAnomaly: boolean;
  zScore: number | null;
  baselineMean: number | null;
  baselineStddev: number | null;
}

export interface ChatThreadSummary {
  id: string;
  title: string | null;
  updated_at: string;
  created_at: string;
}

/* ---- AI configuration (admin) ---- */
export interface AiServerConfig {
  enabledModelIds: string[];
  defaultModelId: string;
  monthlyTokenBudget: number | null;
  budgetEnforced: boolean;
}
export interface KeyStatusEntry {
  configured: boolean;
  source: 'app' | 'env' | null;
}
export interface ProviderKeyStatus {
  google: KeyStatusEntry;
  anthropic: KeyStatusEntry;
  azureApiKey: KeyStatusEntry;
  azureResourceName: KeyStatusEntry;
  azureDeployment: KeyStatusEntry;
}
export interface TokenBankStatus {
  unlimited: boolean;
  enforced: boolean;
  monthlyAllotment: number | null;
  bonusTokens: number;
  startedWith: number;
  used: number;
  remaining: number;
}
export interface AiConfigPayload {
  config: AiServerConfig;
  models: unknown[];
  isAdmin: boolean;
  monthToDateTokens?: number;
  keyStatus?: ProviderKeyStatus;
  tokenBank?: TokenBankStatus;
}
export interface AiConfigUpdate {
  enabledModelIds?: string[];
  defaultModelId?: string;
  monthlyTokenBudget?: number | null;
  budgetEnforced?: boolean;
  providerKeys?: {
    googleApiKey?: string | null;
    anthropicApiKey?: string | null;
    azureApiKey?: string | null;
    azureResourceName?: string | null;
    azureDeployment?: string | null;
  };
  tokenBank?: { monthlyAllotment?: number | null; enforced?: boolean };
  addTokens?: number;
}
export interface AiUsagePayload {
  range: { from: string; to: string };
  totals: { tokens: number; cost: number; queries: number };
  byModel: Array<{ modelId: string; label: string; tokens: number; cost: number; queries: number }>;
  topQueries: Array<{
    question: string | null;
    modelLabel: string;
    totalTokens: number;
    estimatedCost: number;
    createdAt: string;
  }>;
}

export interface SavedDashboardSummary {
  id: string;
  title: string | null;
  thread_id?: string | null;
  is_public?: boolean;
  share_token?: string | null;
  updated_at: string;
  created_at: string;
}

/** A dashboard shared with the current user (nested under ai_dashboards join). */
export interface SharedDashboardRow {
  dashboard_id: string;
  ai_dashboards: {
    id: string;
    title: string | null;
    user_id: string;
    thread_id?: string | null;
    updated_at: string;
    created_at: string;
  };
}

export interface SavedDashboardFull extends SavedDashboardSummary {
  user_id: string;
  layout: Record<string, unknown>;
  widgets: Widget[];
}

export interface ChatThread extends ChatThreadSummary {
  messages: unknown[];
}

/* ---------------------------------------------------------------------- */
/* Chat message model (internal)                                           */
/* ---------------------------------------------------------------------- */

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error';

export interface AiTextPart {
  type: 'text';
  id?: string;
  text: string;
}

export interface AiToolPart {
  type: 'tool';
  toolCallId: string;
  toolName: string;
  state: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export type AiMessagePart = AiTextPart | AiToolPart;

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: AiMessagePart[];
  metadata?: { usage?: AiUsage; threadId?: string | null };
  /** seconds the assistant turn took (assistant messages only) */
  elapsed?: number;
}

/* ---------------------------------------------------------------------- */
/* AI SDK v6 SSE stream chunk shapes (the wire protocol)                   */
/* ---------------------------------------------------------------------- */

export type StreamChunk =
  | { type: 'start' }
  | { type: 'start-step' }
  | { type: 'finish-step' }
  | { type: 'finish' }
  | { type: 'error'; errorText?: string }
  | { type: 'text-start'; id: string }
  | { type: 'text-delta'; id: string; delta: string }
  | { type: 'text-end'; id: string }
  | { type: 'reasoning-delta'; id?: string; delta?: string }
  | { type: 'tool-input-start'; toolCallId: string; toolName: string }
  | { type: 'tool-input-delta'; toolCallId: string; inputTextDelta?: string }
  | { type: 'tool-input-available'; toolCallId: string; toolName: string; input?: unknown }
  | { type: 'tool-output-available'; toolCallId: string; output?: unknown }
  | { type: 'tool-output-error'; toolCallId: string; errorText?: string }
  | { type: 'data-thread-id'; data: { threadId: string } }
  | { type: 'message-metadata'; messageMetadata?: { threadId?: string | null; usage?: AiUsage } }
  | { type: string; [key: string]: unknown };
