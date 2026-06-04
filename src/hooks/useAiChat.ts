/**
 * useAiChat — orchestrates the AI Assistant conversation on mobile.
 *
 * Responsibilities (mirrors the web `chat-panel.tsx` + `ai-dashboard-layout`):
 *  - hold the message list and stream assistant turns from the SSE endpoint
 *  - derive the generated dashboard / insights / follow-ups from tool outputs
 *  - persist threads (PATCH after each turn) and restore them
 *  - remember the active thread id + selected model across launches
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  aiAssistantService,
  streamChat,
} from '../api/services/aiAssistantService';
import { StreamAccumulator } from '../lib/ai/streamParser';
import {
  extractOutputs,
  fromUIMessages,
  genId,
  toUIMessages,
} from '../lib/ai/messageMapper';
import { DEFAULT_MODEL_ID } from '../lib/ai/models';
import type {
  AiChatMessage,
  DashboardInsight,
  DashboardLayout,
} from '../types/ai-assistant';

const AI_THREAD_KEY = 'ai.assistant.threadId';
const AI_MODEL_KEY = 'ai.assistant.modelId';

export type ChatStatus = 'idle' | 'submitted' | 'streaming';

export interface UseAiChat {
  messages: AiChatMessage[];
  status: ChatStatus;
  modelId: string;
  threadId: string | null;
  dashboard: DashboardLayout | null;
  insights: DashboardInsight[];
  followUps: string[];
  error: string | null;
  saveError: boolean;
  loadingThread: boolean;
  hydrated: boolean;
  send: (text: string) => void;
  stop: () => void;
  newChat: () => void;
  loadThread: (id: string) => Promise<void>;
  setModelId: (id: string) => void;
  retrySave: () => void;
  /** Display a saved dashboard in the dashboard view. */
  showDashboard: (layout: DashboardLayout, insights?: DashboardInsight[]) => void;
}

export function useAiChat(): UseAiChat {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [modelId, setModelIdState] = useState<string>(DEFAULT_MODEL_ID);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardLayout | null>(null);
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const threadIdRef = useRef<string | null>(null);
  const modelIdRef = useRef<string>(DEFAULT_MODEL_ID);
  const messagesRef = useRef<AiChatMessage[]>([]);
  const cancelRef = useRef<(() => void) | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHash = useRef<string | null>(null);

  messagesRef.current = messages;
  threadIdRef.current = threadId;
  modelIdRef.current = modelId;

  /* ---- hydrate persisted thread id + model ---- */
  useEffect(() => {
    (async () => {
      try {
        const [storedThread, storedModel] = await Promise.all([
          AsyncStorage.getItem(AI_THREAD_KEY),
          AsyncStorage.getItem(AI_MODEL_KEY),
        ]);
        if (storedModel) {
          setModelIdState(storedModel);
          modelIdRef.current = storedModel;
        }
        if (storedThread) {
          setThreadId(storedThread);
          threadIdRef.current = storedThread;
          await loadThreadInternal(storedThread);
        }
      } catch {
        /* ignore */
      } finally {
        setHydrated(true);
      }
    })();
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      cancelRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistThreadId = useCallback((id: string | null) => {
    setThreadId(id);
    threadIdRef.current = id;
    AsyncStorage.setItem(AI_THREAD_KEY, id ?? '').catch(() => {});
    if (!id) AsyncStorage.removeItem(AI_THREAD_KEY).catch(() => {});
  }, []);

  const setModelId = useCallback((id: string) => {
    setModelIdState(id);
    modelIdRef.current = id;
    AsyncStorage.setItem(AI_MODEL_KEY, id).catch(() => {});
  }, []);

  /* ---- derive dashboard/insights/follow-ups from a message ---- */
  const applyOutputs = useCallback((msg: AiChatMessage) => {
    const { dashboard: d, insights: ins, followUps: f } = extractOutputs(msg);
    if (d) setDashboard(d as DashboardLayout);
    if (ins) setInsights(ins as DashboardInsight[]);
    if (f) setFollowUps(f);
  }, []);

  /* ---- persist the current messages to the active thread ---- */
  const saveCurrentThread = useCallback(async () => {
    const id = threadIdRef.current;
    const msgs = messagesRef.current;
    if (!id || msgs.length === 0) return;
    const hash = `${msgs.length}:${msgs[msgs.length - 1]?.id}`;
    if (lastSavedHash.current === hash) return;
    try {
      await aiAssistantService.saveThread(id, toUIMessages(msgs));
      lastSavedHash.current = hash;
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, []);

  /* ---- internal thread loader ---- */
  const loadThreadInternal = useCallback(
    async (id: string) => {
      setLoadingThread(true);
      setError(null);
      try {
        const thread = await aiAssistantService.getThread(id);
        const loaded = thread ? fromUIMessages(thread.messages) : [];
        setMessages(loaded);
        messagesRef.current = loaded;
        lastSavedHash.current = loaded.length
          ? `${loaded.length}:${loaded[loaded.length - 1]?.id}`
          : null;
        // Restore the most recent dashboard / insights / follow-ups.
        setDashboard(null);
        setInsights([]);
        setFollowUps([]);
        for (let i = loaded.length - 1; i >= 0; i--) {
          if (loaded[i].role === 'assistant') {
            applyOutputs(loaded[i]);
            break;
          }
        }
      } catch (e: any) {
        // A remembered thread id can be stale — e.g. cached from a previous
        // login/tenant whose DB doesn't have it. Don't surface a scary error;
        // just forget it and start a fresh conversation.
        const notFound =
          e?.response?.status === 404 || /not found/i.test(e?.message ?? '');
        if (notFound) {
          persistThreadId(null);
          setMessages([]);
          messagesRef.current = [];
          setDashboard(null);
          setInsights([]);
          setFollowUps([]);
        } else {
          setError(e?.message ?? 'Failed to load conversation');
        }
      } finally {
        setLoadingThread(false);
      }
    },
    [applyOutputs, persistThreadId],
  );

  const loadThread = useCallback(
    async (id: string) => {
      cancelRef.current?.();
      setStatus('idle');
      persistThreadId(id);
      await loadThreadInternal(id);
    },
    [loadThreadInternal, persistThreadId],
  );

  const newChat = useCallback(() => {
    cancelRef.current?.();
    setStatus('idle');
    setMessages([]);
    messagesRef.current = [];
    persistThreadId(null);
    setDashboard(null);
    setInsights([]);
    setFollowUps([]);
    setError(null);
    setSaveError(false);
    lastSavedHash.current = null;
  }, [persistThreadId]);

  const stop = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setStatus('idle');
  }, []);

  /* ---- send a message + stream the response ---- */
  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status !== 'idle') return;

      setError(null);
      setFollowUps([]);
      const startedAt = Date.now();

      const userMsg: AiChatMessage = {
        id: genId('u'),
        role: 'user',
        parts: [{ type: 'text', text: trimmed }],
      };
      const assistantId = genId('a');
      const assistantMsg: AiChatMessage = {
        id: assistantId,
        role: 'assistant',
        parts: [],
      };

      const baseMessages = [...messagesRef.current, userMsg];
      const next = [...baseMessages, assistantMsg];
      setMessages(next);
      messagesRef.current = next;
      setStatus('submitted');

      const acc = new StreamAccumulator();

      const flush = () => {
        flushTimer.current = null;
        const parts = acc.getParts();
        const updated = messagesRef.current.map((m) =>
          m.id === assistantId ? { ...m, parts } : m,
        );
        messagesRef.current = updated;
        setMessages(updated);
        const aMsg = updated.find((m) => m.id === assistantId);
        if (aMsg) applyOutputs(aMsg);
      };

      const scheduleFlush = () => {
        if (flushTimer.current) return;
        flushTimer.current = setTimeout(flush, 60);
      };

      let streamStarted = false;
      let streamErr: string | null = null;
      const handle = streamChat({
        messages: toUIMessages(baseMessages),
        threadId: threadIdRef.current,
        modelId: modelIdRef.current,
        onThreadId: (tid) => persistThreadId(tid),
        onChunk: (chunk) => {
          if (!streamStarted) {
            streamStarted = true;
            setStatus('streaming');
          }
          // The server streams provider failures (e.g. an invalid AI API key)
          // as an `error` chunk inside a 200 response — surface it instead of
          // silently ending with no reply.
          if ((chunk as any).type === 'error') {
            streamErr = (chunk as any).errorText || 'The AI service returned an error.';
            return;
          }
          acc.ingestChunk(chunk);
          scheduleFlush();
        },
      });
      cancelRef.current = handle.cancel;

      handle.promise
        .then(({ threadId: tid, usage }) => {
          if (flushTimer.current) {
            clearTimeout(flushTimer.current);
            flushTimer.current = null;
          }
          const parts = acc.getParts();
          const elapsed = (Date.now() - startedAt) / 1000;
          const hasContent = parts.some(
            (p) => (p.type === 'text' && p.text.trim()) || p.type === 'tool',
          );

          // Provider/stream error, or a completed turn that produced nothing.
          if (streamErr || !hasContent) {
            setStatus('idle');
            cancelRef.current = null;
            setError(
              streamErr ??
                'The assistant did not return a response. Please try again.',
            );
            const cleaned = messagesRef.current.filter((m) => m.id !== assistantId);
            messagesRef.current = cleaned;
            setMessages(cleaned);
            if (tid) persistThreadId(tid);
            return;
          }

          const finalized = messagesRef.current.map((m) =>
            m.id === assistantId
              ? { ...m, parts, elapsed, metadata: { usage, threadId: tid } }
              : m,
          );
          messagesRef.current = finalized;
          setMessages(finalized);
          const aMsg = finalized.find((m) => m.id === assistantId);
          if (aMsg) applyOutputs(aMsg);
          if (tid) persistThreadId(tid);
          setStatus('idle');
          cancelRef.current = null;
          // Persist the completed turn.
          void saveCurrentThread();
        })
        .catch((e: any) => {
          if (flushTimer.current) {
            clearTimeout(flushTimer.current);
            flushTimer.current = null;
          }
          setStatus('idle');
          cancelRef.current = null;
          if (e?.name === 'AbortError') return;
          setError(e?.message ?? 'Something went wrong');
          // Drop the empty assistant placeholder if nothing streamed.
          const cleaned = messagesRef.current.filter(
            (m) => !(m.id === assistantId && m.parts.length === 0),
          );
          messagesRef.current = cleaned;
          setMessages(cleaned);
        });
    },
    [status, applyOutputs, persistThreadId, saveCurrentThread],
  );

  const retrySave = useCallback(() => {
    lastSavedHash.current = null;
    void saveCurrentThread();
  }, [saveCurrentThread]);

  const showDashboard = useCallback(
    (layout: DashboardLayout, ins?: DashboardInsight[]) => {
      setDashboard(layout);
      setInsights(ins ?? []);
    },
    [],
  );

  return {
    messages,
    status,
    modelId,
    threadId,
    dashboard,
    insights,
    followUps,
    error,
    saveError,
    loadingThread,
    hydrated,
    send,
    stop,
    newChat,
    loadThread,
    setModelId,
    retrySave,
    showDashboard,
  };
}

export default useAiChat;
