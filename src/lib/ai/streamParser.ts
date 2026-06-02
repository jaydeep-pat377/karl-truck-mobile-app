/**
 * Incrementally reconstructs an assistant message from the Vercel AI SDK v6
 * UI-message SSE stream. Feed it parsed chunks (one JSON object per `data:`
 * line) and read back the ordered list of message parts at any time.
 *
 * The wire protocol (confirmed against ai@^6) emits chunk objects with a
 * `type` discriminator: text-start / text-delta / text-end, tool-input-start /
 * tool-input-available / tool-output-available / tool-output-error,
 * data-thread-id, message-metadata, start / finish, etc.
 */

import type {
  AiMessagePart,
  AiTextPart,
  AiToolPart,
  AiUsage,
  StreamChunk,
} from '../../types/ai-assistant';

export class StreamAccumulator {
  private parts: AiMessagePart[] = [];
  private textIndexById = new Map<string, number>();
  private toolIndexById = new Map<string, number>();

  threadId: string | null = null;
  usage: AiUsage | undefined;

  ingestChunk(chunk: StreamChunk): void {
    switch (chunk.type) {
      case 'text-start': {
        const id = (chunk as any).id ?? `t-${this.parts.length}`;
        if (!this.textIndexById.has(id)) {
          const part: AiTextPart = { type: 'text', id, text: '' };
          this.textIndexById.set(id, this.parts.push(part) - 1);
        }
        break;
      }
      case 'text-delta': {
        const id = (chunk as any).id ?? this.lastTextId();
        const delta = (chunk as any).delta ?? '';
        if (id == null) {
          // No start seen — append to a trailing text part or create one.
          const part: AiTextPart = { type: 'text', text: delta };
          this.parts.push(part);
          break;
        }
        let idx = this.textIndexById.get(id);
        if (idx == null) {
          const part: AiTextPart = { type: 'text', id, text: '' };
          idx = this.parts.push(part) - 1;
          this.textIndexById.set(id, idx);
        }
        (this.parts[idx] as AiTextPart).text += delta;
        break;
      }
      case 'text-end':
        break;

      case 'tool-input-start': {
        const { toolCallId, toolName } = chunk as any;
        this.upsertTool(toolCallId, {
          toolName,
          state: 'input-streaming',
        });
        break;
      }
      case 'tool-input-available': {
        const { toolCallId, toolName, input } = chunk as any;
        this.upsertTool(toolCallId, {
          toolName,
          input,
          state: 'input-available',
        });
        break;
      }
      case 'tool-output-available': {
        const { toolCallId, output } = chunk as any;
        this.upsertTool(toolCallId, {
          output,
          state: 'output-available',
        });
        break;
      }
      case 'tool-output-error': {
        const { toolCallId, errorText } = chunk as any;
        this.upsertTool(toolCallId, {
          errorText,
          state: 'output-error',
        });
        break;
      }

      case 'data-thread-id': {
        const tid = (chunk as any).data?.threadId;
        if (tid) this.threadId = tid;
        break;
      }
      case 'message-metadata': {
        const meta = (chunk as any).messageMetadata;
        if (meta?.threadId) this.threadId = meta.threadId;
        if (meta?.usage) this.usage = meta.usage;
        break;
      }
      default:
        break;
    }
  }

  getParts(): AiMessagePart[] {
    // Return a shallow-cloned snapshot so React state updates are detected.
    return this.parts.map((p) =>
      p.type === 'text' ? { ...p } : { ...(p as AiToolPart) },
    );
  }

  private upsertTool(
    toolCallId: string,
    patch: Partial<Omit<AiToolPart, 'type' | 'toolCallId'>>,
  ): void {
    let idx = this.toolIndexById.get(toolCallId);
    if (idx == null) {
      const part: AiToolPart = {
        type: 'tool',
        toolCallId,
        toolName: patch.toolName ?? 'tool',
        state: patch.state ?? 'input-streaming',
        input: patch.input,
        output: patch.output,
        errorText: patch.errorText,
      };
      idx = this.parts.push(part) - 1;
      this.toolIndexById.set(toolCallId, idx);
      return;
    }
    const existing = this.parts[idx] as AiToolPart;
    this.parts[idx] = {
      ...existing,
      ...patch,
      // Never let a later patch blank out a known tool name.
      toolName: patch.toolName ?? existing.toolName,
    };
  }

  private lastTextId(): string | null {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.type === 'text' && p.id) return p.id;
    }
    return null;
  }
}

/**
 * Splits a raw SSE text buffer into individual JSON chunks. Returns the parsed
 * chunks found and the unconsumed remainder (a partial trailing line).
 */
export function consumeSSEBuffer(buffer: string): {
  chunks: StreamChunk[];
  rest: string;
  done: boolean;
} {
  const chunks: StreamChunk[] = [];
  let done = false;
  const lines = buffer.split('\n');
  // The last element is an incomplete line (no trailing newline yet).
  const rest = lines.pop() ?? '';

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    if (payload === '[DONE]') {
      done = true;
      continue;
    }
    try {
      chunks.push(JSON.parse(payload) as StreamChunk);
    } catch {
      // Ignore malformed fragments — should not happen for complete lines.
    }
  }

  return { chunks, rest, done };
}
