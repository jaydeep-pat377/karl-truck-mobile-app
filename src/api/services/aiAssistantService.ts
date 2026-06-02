/**
 * AI Assistant API client (mobile).
 *
 * Talks to the app's OWN backend (api.truckast.ai) at /api/ai/*, which hosts
 * the ported AI engine. Auth reuses the app's existing JWT (attached by the
 * axios interceptor for thread CRUD, and read from storage for the streaming
 * XHR). This is why history/persistence "just work" — the backend resolves the
 * Supabase user id from the same token the rest of the app uses.
 *
 * Streaming uses XMLHttpRequest (React Native's fetch can't read a response
 * body incrementally). We poll `responseText` on each `onprogress` tick and
 * parse the appended SSE lines.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../apiClient';
import axiosInstance from '../axiosInstance';
import { STORAGE_KEYS } from '../../utils/storage';
import { consumeSSEBuffer } from '../../lib/ai/streamParser';
import type {
  AiUsage,
  ChatThread,
  ChatThreadSummary,
  StreamChunk,
  VerifyResult,
  SavedDashboardSummary,
  SharedDashboardRow,
  SavedDashboardFull,
  AiConfigPayload,
  AiConfigUpdate,
  AiUsagePayload,
} from '../../types/ai-assistant';

export interface VerifyWidgetPayload {
  table: string;
  filters?: unknown[];
  groupBy?: string;
  method: string;
  valueColumn?: string;
  dateFormat?: string;
  sort?: string;
  topN?: number;
}

/** The app's active API base (per-tenant, set on login). Includes the /api prefix. */
const getApiBase = (): string =>
  (axiosInstance.defaults.baseURL || '').replace(/\/+$/, '');

const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
};

export interface StreamChatOptions {
  messages: Record<string, unknown>[];
  threadId: string | null;
  modelId: string;
  onChunk: (chunk: StreamChunk) => void;
  onThreadId?: (threadId: string) => void;
}

export interface StreamChatHandle {
  promise: Promise<{ threadId: string | null; usage?: AiUsage }>;
  cancel: () => void;
}

/**
 * POST /api/ai/dashboard-chat — streams the assistant turn as SSE.
 */
export function streamChat(options: StreamChatOptions): StreamChatHandle {
  const { messages, threadId, modelId, onChunk, onThreadId } = options;
  let xhr: XMLHttpRequest | null = null;
  let cancelled = false;

  const promise = new Promise<{ threadId: string | null; usage?: AiUsage }>(
    async (resolve, reject) => {
      const base = getApiBase();
      if (!base) {
        reject(new Error('API base URL is not configured (not logged in?)'));
        return;
      }

      const token = await getToken();
      if (cancelled) {
        reject(new AbortLikeError('Aborted'));
        return;
      }

      xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/ai/dashboard-chat`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'text/event-stream');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      let buffer = '';
      let lastIndex = 0;
      let resolvedThreadId: string | null = threadId;
      let usage: AiUsage | undefined;

      const drain = (chunkText: string) => {
        buffer += chunkText;
        const { chunks, rest } = consumeSSEBuffer(buffer);
        buffer = rest;
        for (const chunk of chunks) {
          if (chunk.type === 'data-thread-id') {
            const tid = (chunk as any).data?.threadId;
            if (tid) {
              resolvedThreadId = tid;
              onThreadId?.(tid);
            }
          }
          if (chunk.type === 'message-metadata') {
            const meta = (chunk as any).messageMetadata;
            if (meta?.threadId) resolvedThreadId = meta.threadId;
            if (meta?.usage) usage = meta.usage;
          }
          onChunk(chunk);
        }
      };

      xhr.onprogress = () => {
        if (!xhr || cancelled) return;
        if (xhr.status >= 400) return; // handled in onload
        const text = xhr.responseText;
        if (text.length > lastIndex) {
          const appended = text.slice(lastIndex);
          lastIndex = text.length;
          drain(appended);
        }
      };

      xhr.onload = () => {
        if (!xhr) return;
        if (cancelled) {
          reject(new AbortLikeError('Aborted'));
          return;
        }
        if (xhr.status >= 400) {
          let detail = `Request failed (${xhr.status})`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.error) detail = parsed.error;
            else if (parsed?.message) detail = parsed.message;
          } catch {
            /* not json */
          }
          reject(new Error(detail));
          return;
        }
        const text = xhr.responseText;
        if (text.length > lastIndex) {
          drain(text.slice(lastIndex));
          lastIndex = text.length;
        }
        if (buffer.trim().length) drain('\n');
        resolve({ threadId: resolvedThreadId, usage });
      };

      xhr.onerror = () => reject(new Error('Network error contacting AI service'));
      xhr.ontimeout = () => reject(new Error('AI request timed out'));

      xhr.send(JSON.stringify({ messages, threadId, modelId }));
    },
  );

  return {
    promise,
    cancel: () => {
      cancelled = true;
      try {
        xhr?.abort();
      } catch {
        /* ignore */
      }
    },
  };
}

/* ---------------------------------------------------------------------- */
/* Thread CRUD — via the shared axios client (auth + token refresh built-in) */
/* ---------------------------------------------------------------------- */

export const aiAssistantService = {
  listThreads: async (): Promise<ChatThreadSummary[]> => {
    const data = await apiClient.get<{ threads: ChatThreadSummary[] }>('/ai/threads');
    return data.threads ?? [];
  },

  getThread: async (id: string): Promise<ChatThread | null> => {
    const data = await apiClient.get<{ thread: ChatThread }>(`/ai/threads/${id}`);
    return data.thread ?? null;
  },

  saveThread: async (
    id: string,
    messages: Record<string, unknown>[],
  ): Promise<void> => {
    await apiClient.patch(`/ai/threads/${id}`, { messages });
  },

  deleteThread: async (id: string): Promise<void> => {
    await apiClient.delete(`/ai/threads/${id}`);
  },

  verifyWidget: async (payload: VerifyWidgetPayload): Promise<VerifyResult> => {
    return apiClient.post<VerifyResult>('/ai/verify-widget', payload);
  },

  /* ---- Saved & shared dashboards ---- */
  listDashboards: async (): Promise<{
    owned: SavedDashboardSummary[];
    shared: SharedDashboardRow[];
  }> => {
    return apiClient.get('/ai/dashboards');
  },

  saveDashboard: async (payload: {
    title: string;
    widgets: unknown[];
    layout?: Record<string, unknown>;
    threadId?: string | null;
  }): Promise<SavedDashboardSummary> => {
    const data = await apiClient.post<{ dashboard: SavedDashboardSummary }>(
      '/ai/dashboards',
      payload,
    );
    return data.dashboard;
  },

  getDashboard: async (id: string): Promise<SavedDashboardFull | null> => {
    const data = await apiClient.get<{ dashboard: SavedDashboardFull }>(
      `/ai/dashboards/${id}`,
    );
    return data.dashboard ?? null;
  },

  deleteDashboard: async (id: string): Promise<void> => {
    await apiClient.delete(`/ai/dashboards/${id}`);
  },

  /* ---- AI configuration (admin) ---- */
  getConfig: async (): Promise<AiConfigPayload> => {
    return apiClient.get<AiConfigPayload>('/ai/config');
  },

  updateConfig: async (
    payload: AiConfigUpdate,
  ): Promise<{ ok: boolean; config?: unknown }> => {
    return apiClient.put('/ai/config', payload);
  },

  getConfigUsage: async (from?: string, to?: string): Promise<AiUsagePayload> => {
    const params: string[] = [];
    if (from) params.push(`from=${encodeURIComponent(from)}`);
    if (to) params.push(`to=${encodeURIComponent(to)}`);
    const suffix = params.length ? `?${params.join('&')}` : '';
    return apiClient.get<AiUsagePayload>(`/ai/config/usage${suffix}`);
  },

  /* ---- Widget Info raw rows, cell explain, empty-state hint ---- */
  getRawRows: async (body: {
    table: string;
    filters?: unknown[];
    order?: { column: string; ascending?: boolean };
    limit?: number;
  }): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> => {
    return apiClient.post('/ai/raw-rows', body);
  },

  explainCell: async (body: Record<string, unknown>): Promise<{ explanation: string }> => {
    return apiClient.post('/ai/explain-cell', body);
  },

  emptyHint: async (body: Record<string, unknown>): Promise<{ hint: string }> => {
    return apiClient.post('/ai/empty-hint', body);
  },

  recordFeedback: async (body: {
    auditLogId: number;
    rating: 'up' | 'down';
    comment?: string | null;
  }): Promise<{ success: boolean }> => {
    return apiClient.post('/ai/feedback', body);
  },

  /* ---- Dashboard sharing ---- */
  getShareInfo: async (
    id: string,
  ): Promise<{
    shares: Array<{ id: string; shared_with_user_id: string; created_at: string }>;
    publicToken: string | null;
    isPublic: boolean;
  }> => {
    return apiClient.get(`/ai/dashboards/${id}/share`);
  },

  applyShare: async (
    id: string,
    body:
      | { action: 'invite'; email: string }
      | { action: 'generateLink' }
      | { action: 'revokeLink' },
  ): Promise<any> => {
    return apiClient.post(`/ai/dashboards/${id}/share`, body);
  },

  revokeShare: async (id: string, sharedWithUserId: string): Promise<void> => {
    await apiClient.delete(`/ai/dashboards/${id}/share`, { data: { sharedWithUserId } });
  },

  /* ---- Widget comments (on saved dashboards) ---- */
  listComments: async (
    id: string,
    widgetId?: string,
  ): Promise<{
    comments: Array<{
      id: string;
      widget_id: string;
      user_id: string;
      body: string;
      parent_id: string | null;
      created_at: string;
    }>;
  }> => {
    const suffix = widgetId ? `?widgetId=${encodeURIComponent(widgetId)}` : '';
    return apiClient.get(`/ai/dashboards/${id}/comments${suffix}`);
  },

  addComment: async (
    id: string,
    body: { widgetId: string; body: string; parentId?: string | null },
  ): Promise<any> => {
    return apiClient.post(`/ai/dashboards/${id}/comments`, body);
  },

  deleteComment: async (id: string, commentId: string): Promise<void> => {
    await apiClient.delete(`/ai/dashboards/${id}/comments/${commentId}`);
  },
};

class AbortLikeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortError';
  }
}

export default aiAssistantService;
