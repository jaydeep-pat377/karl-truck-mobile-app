import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';

const MAX_ROWS = 50;
const CELL_MIN_WIDTH = ms(110);

/** Coerce any cell value to a display string. */
function cellText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

export function DataTableWidget({
  widget,
  maxHeight,
}: {
  widget: Widget;
  maxHeight?: number;
}) {
  const theme = useAppTheme();

  const columns = Array.isArray(widget.data?.columns) ? widget.data!.columns! : [];
  const allRows = Array.isArray(widget.data?.rows) ? widget.data!.rows! : [];

  // Derive columns from the first row when none were supplied explicitly.
  const effectiveColumns =
    columns.length > 0
      ? columns
      : allRows.length > 0 && allRows[0] && typeof allRows[0] === 'object'
        ? Object.keys(allRows[0] as Record<string, unknown>)
        : [];

  if (effectiveColumns.length === 0 || allRows.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text variant="bodySmall" color="hint">
          No data
        </Text>
      </View>
    );
  }

  const rows = allRows.slice(0, MAX_ROWS);
  const overflow = allRows.length - rows.length;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <ScrollView
          style={maxHeight ? { maxHeight } : undefined}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* Header */}
          <View
            style={[
              styles.row,
              styles.headerRow,
              { backgroundColor: theme.colors.cardElevated, borderColor: theme.colors.border },
            ]}
          >
            {effectiveColumns.map((col, i) => (
              <View key={`h-${i}`} style={[styles.cell, { borderColor: theme.colors.border }]}>
                <Text variant="caption" color="secondary" numberOfLines={1} style={styles.headerText}>
                  {col}
                </Text>
              </View>
            ))}
          </View>

          {/* Body */}
          {rows.map((row, r) => {
            const rec = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
            return (
              <View
                key={`r-${r}`}
                style={[styles.row, { borderColor: theme.colors.border }]}
              >
                {effectiveColumns.map((col, c) => (
                  <View key={`c-${r}-${c}`} style={[styles.cell, { borderColor: theme.colors.border }]}>
                    <Text variant="bodySmall" color="primary" numberOfLines={1}>
                      {cellText(rec[col])}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

          {overflow > 0 && (
            <View style={[styles.row, { borderColor: theme.colors.border }]}>
              <View style={styles.footerCell}>
                <Text variant="captionSmall" color="hint">
                  … {overflow} more rows
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  headerRow: {
    borderTopLeftRadius: ms(8),
    borderTopRightRadius: ms(8),
  },
  cell: {
    minWidth: CELL_MIN_WIDTH,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: '600',
  },
  footerCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DataTableWidget;
