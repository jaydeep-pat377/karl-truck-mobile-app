import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { formatValue, paletteColor } from './chartUtils';

/**
 * Extract the single representative numeric value from a KPI widget's rows.
 * Prefers the first row's `value`; if no `value` keys exist, sums numeric
 * fields of the first row. Returns null when nothing numeric is found.
 */
function extractKpiValue(widget: Widget): number | null {
  const rows = widget.data?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const rec = row as Record<string, unknown>;
    if ('value' in rec) {
      const num = Number(rec.value);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }

  // Fall back to the first numeric field on the first row.
  const first = rows[0] as Record<string, unknown>;
  for (const key of Object.keys(first)) {
    const num = Number(first[key]);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

export function KpiCardWidget({ widget }: { widget: Widget }) {
  const theme = useAppTheme();
  const accent = paletteColor(0);
  const value = extractKpiValue(widget);
  const display = value === null ? '—' : formatValue(value, widget.config?.valueFormat);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.body}>
        {!!widget.title && (
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {widget.title}
          </Text>
        )}
        <Text variant="h2" color="primary" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
        {!!widget.description && (
          <Text variant="captionSmall" color="hint" numberOfLines={2}>
            {widget.description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: ms(12),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    minHeight: ms(96),
  },
  accent: {
    width: ms(4),
  },
  body: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  value: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});

export default KpiCardWidget;
