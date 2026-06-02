/** No-data state with an on-demand AI suggestion (POST /ai/empty-hint). */
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from '../../../components/common';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { aiAssistantService } from '../../../api/services/aiAssistantService';
import type { Widget } from '../../../types/ai-assistant';

export function EmptyHint({ widget }: { widget: Widget }) {
  const theme = useAppTheme();
  const w = widget as unknown as { query?: { table?: string }; aggregate?: unknown };
  const query = w.query;
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHint = async () => {
    if (!query?.table) return;
    setLoading(true);
    try {
      const res = await aiAssistantService.emptyHint({
        widgetTitle: widget.title,
        query,
        aggregate: w.aggregate,
      });
      setHint(res.hint);
    } catch {
      setHint('Try widening the date range or removing a filter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Icon name="database-off-outline" size={ms(24)} color={theme.colors.textHint} />
      <Text variant="bodySmall" color="hint" style={styles.gap}>No data</Text>
      {hint ? (
        <Text variant="caption" color="secondary" align="center" style={styles.hint}>{hint}</Text>
      ) : query?.table ? (
        <TouchableOpacity style={styles.btn} onPress={fetchHint} disabled={loading} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : (
            <Icon name="lightbulb-on-outline" size={ms(14)} color={theme.colors.primary.main} />
          )}
          <Text variant="caption" color="primary" style={styles.btnText}>Why no data?</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  gap: { marginTop: spacing.xs },
  hint: { marginTop: spacing.sm, paddingHorizontal: spacing.md },
  btn: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  btnText: { marginLeft: spacing.xs, fontWeight: '600' },
});

export default EmptyHint;
