/** Renders one chat message (user bubble or assistant timeline). */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing, fontSizes } from '../../utils/responsive';
import { MarkdownText } from './MarkdownText';
import { AiToolStep } from './AiToolStep';
import { AiTypingDots } from './AiTypingDots';
import { getModelDef } from '../../lib/ai/models';
import type { AiChatMessage as AiMessage, AiToolPart } from '../../types/ai-assistant';

interface Props {
  message: AiMessage;
  isStreaming?: boolean;
  modelId: string;
}

function Footer({ message, modelId }: { message: AiMessage; modelId: string }) {
  const usage = message.metadata?.usage;
  const toolCount = message.parts.filter((p) => p.type === 'tool').length;
  if (!message.elapsed && !usage) return null;
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const total = inputTokens + outputTokens;
  const pricing = getModelDef(modelId);
  const cost =
    (inputTokens * pricing.inputPricePer1M + outputTokens * pricing.outputPricePer1M) /
    1_000_000;
  const fmtCost = cost >= 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(6)}`;

  const segs: string[] = [];
  if (message.elapsed) segs.push(`${message.elapsed.toFixed(1)}s`);
  if (total > 0) segs.push(`↑ ${inputTokens.toLocaleString()} ↓ ${outputTokens.toLocaleString()}`);
  if (total > 0) segs.push(fmtCost);
  if (toolCount > 0) segs.push(`${toolCount} tool${toolCount > 1 ? 's' : ''}`);

  return (
    <Text variant="captionSmall" color="hint" style={styles.footer}>
      {segs.join('  ·  ')}
    </Text>
  );
}

export const AiChatMessage: React.FC<Props> = ({ message, isStreaming, modelId }) => {
  const theme = useAppTheme();

  if (message.role === 'user') {
    const text = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as any).text)
      .join('\n');
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.colors.primary.main }]}>
          <Text variant="bodySmall" color="white">
            {text}
          </Text>
        </View>
      </View>
    );
  }

  const hasContent = message.parts.length > 0;

  return (
    <View style={styles.assistantRow}>
      <View style={[styles.avatar, { backgroundColor: theme.colors.primary.main }]}>
        <Text variant="captionSmall" color="white" style={styles.avatarText}>
          AI
        </Text>
      </View>
      <View style={styles.assistantBody}>
        {!hasContent && isStreaming && <AiTypingDots />}
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            if (!part.text.trim()) return null;
            return <MarkdownText key={`t-${i}`} content={part.text} />;
          }
          return <AiToolStep key={`tool-${(part as AiToolPart).toolCallId}-${i}`} part={part as AiToolPart} />;
        })}
        {hasContent && isStreaming && (
          <View style={styles.working}>
            <AiTypingDots />
          </View>
        )}
        <Footer message={message} modelId={modelId} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', marginBottom: spacing.md },
  userBubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(16),
    borderBottomRightRadius: ms(4),
  },
  assistantRow: { flexDirection: 'row', marginBottom: spacing.md, paddingRight: spacing.sm },
  avatar: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: ms(2),
  },
  avatarText: { fontSize: fontSizes.xs, fontWeight: '700' },
  assistantBody: { flex: 1 },
  working: { opacity: 0.8 },
  footer: { marginTop: spacing.xs },
});

export default AiChatMessage;
