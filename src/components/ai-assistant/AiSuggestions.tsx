/** Empty-state starter prompts shown before the first message. */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import { AI_SUGGESTIONS } from '../../lib/ai/suggestions';
import { aiAssistantService } from '../../api/services/aiAssistantService';

interface Props {
  onPick: (text: string) => void;
}

export const AiSuggestions: React.FC<Props> = ({ onPick }) => {
  const theme = useAppTheme();
  // Role-aware starter questions from the backend (producer vs contractor).
  // Start as null and show placeholder cards until the fetch resolves, so
  // contractors never see the producer list flash before theirs loads. The
  // static list is used only as an error fallback.
  const [suggestions, setSuggestions] = React.useState<string[] | null>(null);
  React.useEffect(() => {
    let active = true;
    aiAssistantService
      .getSuggestions()
      .then((r) => {
        if (!active) return;
        setSuggestions(
          Array.isArray(r?.suggestions) && r.suggestions.length ? r.suggestions : AI_SUGGESTIONS,
        );
      })
      .catch(() => {
        if (active) setSuggestions(AI_SUGGESTIONS);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <View style={styles.container}>
      <View style={[styles.iconBubble, { backgroundColor: theme.colors.primary.main + '22' }]}>
        <Icon name="robot-happy-outline" size={ms(34)} color={theme.colors.primary.main} />
      </View>
      <Text variant="h4" color="primary" align="center" style={styles.title}>
        What would you like to explore?
      </Text>
      <Text variant="bodySmall" color="secondary" align="center" style={styles.subtitle}>
        Pick a prompt or type your own question about Truckast operations
      </Text>
      <View style={styles.grid}>
        {suggestions === null
          ? Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: 0.4 },
                ]}
              />
            ))
          : suggestions.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                activeOpacity={0.7}
                onPress={() => onPick(s)}
              >
                <Icon name="lightning-bolt-outline" size={ms(14)} color={theme.colors.primary.main} />
                <Text variant="caption" color="primary" style={styles.cardText}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.sm },
  iconBubble: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(12),
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: ms(74),
  },
  cardText: { marginTop: spacing.xs },
});

export default AiSuggestions;
