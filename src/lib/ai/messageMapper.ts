/**
 * Converts between the mobile internal `AiChatMessage` model and the Vercel AI
 * SDK v6 `UIMessage` shape that is persisted in `ai_chat_threads.messages`.
 *
 * Keeping the persisted shape identical to the web app's means a thread
 * created on mobile opens correctly on the web (and vice-versa).
 */

import type {
  AiChatMessage,
  AiMessagePart,
  AiTextPart,
  AiToolPart,
  ToolState,
} from '../../types/ai-assistant';

let idCounter = 0;
export function genId(prefix = 'm'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/** Internal message -> persisted UIMessage (plain object). */
export function toUIMessage(msg: AiChatMessage): Record<string, unknown> {
  const parts = msg.parts.map((part) => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text, state: 'done' };
    }
    const tool = part as AiToolPart;
    return {
      type: `tool-${tool.toolName}`,
      toolCallId: tool.toolCallId,
      state: tool.state,
      input: tool.input,
      output: tool.output,
      errorText: tool.errorText,
    };
  });
  return {
    id: msg.id,
    role: msg.role,
    parts,
    metadata: msg.metadata,
  };
}

export function toUIMessages(messages: AiChatMessage[]): Record<string, unknown>[] {
  return messages.map(toUIMessage);
}

/** Persisted UIMessage[] -> internal messages (tolerant of both shapes). */
export function fromUIMessages(raw: unknown[]): AiChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AiChatMessage[] = [];

  for (const item of raw) {
    const m = item as any;
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;

    const parts: AiMessagePart[] = [];
    const rawParts = Array.isArray(m.parts) ? m.parts : [];

    for (const p of rawParts) {
      if (!p || typeof p.type !== 'string') continue;

      if (p.type === 'text') {
        if (typeof p.text === 'string' && p.text.length) {
          parts.push({ type: 'text', text: p.text } as AiTextPart);
        }
        continue;
      }

      // Internal shape persisted as { type: 'tool', ... } (defensive).
      if (p.type === 'tool') {
        parts.push({
          type: 'tool',
          toolCallId: p.toolCallId ?? genId('tc'),
          toolName: p.toolName ?? 'tool',
          state: (p.state as ToolState) ?? 'output-available',
          input: p.input,
          output: p.output,
          errorText: p.errorText,
        });
        continue;
      }

      // Web UIMessage shape: tool parts are typed `tool-<name>`.
      if (p.type.startsWith('tool-')) {
        parts.push({
          type: 'tool',
          toolCallId: p.toolCallId ?? genId('tc'),
          toolName: p.type.slice('tool-'.length),
          state: (p.state as ToolState) ?? 'output-available',
          input: p.input,
          output: p.output,
          errorText: p.errorText,
        });
        continue;
      }

      if (p.type === 'dynamic-tool') {
        parts.push({
          type: 'tool',
          toolCallId: p.toolCallId ?? genId('tc'),
          toolName: p.toolName ?? 'tool',
          state: (p.state as ToolState) ?? 'output-available',
          input: p.input,
          output: p.output,
          errorText: p.errorText,
        });
        continue;
      }
      // step-start / reasoning / file parts are ignored on mobile.
    }

    out.push({
      id: m.id ?? genId(),
      role: m.role,
      parts,
      metadata: m.metadata,
    });
  }

  return out;
}

/** Pull the structured outputs (dashboard / insights / follow-ups) from a message. */
export function extractOutputs(msg: AiChatMessage): {
  dashboard: unknown | null;
  insights: unknown[] | null;
  followUps: string[] | null;
} {
  let dashboard: unknown | null = null;
  let insights: unknown[] | null = null;
  let followUps: string[] | null = null;

  for (const part of msg.parts) {
    if (part.type !== 'tool' || part.state !== 'output-available') continue;
    const tool = part as AiToolPart;
    const out = tool.output as any;
    if (!out) continue;

    if (tool.toolName === 'generateDashboard') {
      dashboard = out;
    } else if (tool.toolName === 'generateInsights') {
      if (Array.isArray(out.insights)) insights = out.insights;
    } else if (tool.toolName === 'suggestFollowUps') {
      if (Array.isArray(out.followUps)) followUps = out.followUps;
    }
  }

  return { dashboard, insights, followUps };
}
