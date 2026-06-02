import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text, AlertModal } from '../../../components/common';
import { aiAssistantService } from '../../../api/services/aiAssistantService';

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
  enableExplain,
}: {
  widget: Widget;
  maxHeight?: number;
  /** When true, tapping a row asks the AI to explain that group. */
  enableExplain?: boolean;
}) {
  const theme = useAppTheme();
  const w = widget as unknown as {
    query?: { table?: string; filters?: unknown[] };
    aggregate?: { groupBy?: string; method?: string; valueColumn?: string };
  };
  const [explainOpen, setExplainOpen] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const canExplain = !!enableExplain && !!w.query?.table;

  const explainRow = async (rec: Record<string, unknown>) => {
    if (!canExplain) return;
    const colKey = w.aggregate?.groupBy || effectiveColumns[0];
    setExplanation(null);
    setExplaining(true);
    setExplainOpen(true);
    try {
      const res = await aiAssistantService.explainCell({
        widgetId: widget.id,
        widgetTitle: widget.title,
        widgetType: widget.type,
        columnKey: colKey,
        columnValue: rec[colKey] as string | number,
        query: w.query,
        aggregate: w.aggregate,
      });
      setExplanation(res.explanation);
    } catch (e: any) {
      setExplanation(e?.message ?? 'Could not explain this row.');
    } finally {
      setExplaining(false);
    }
  };

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
    <>
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
              <TouchableOpacity
                key={`r-${r}`}
                style={[styles.row, { borderColor: theme.colors.border }]}
                activeOpacity={canExplain ? 0.6 : 1}
                disabled={!canExplain}
                onPress={() => explainRow(rec)}
              >
                {effectiveColumns.map((col, c) => (
                  <View key={`c-${r}-${c}`} style={[styles.cell, { borderColor: theme.colors.border }]}>
                    <Text variant="bodySmall" color="primary" numberOfLines={1}>
                      {cellText(rec[col])}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>
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
    {canExplain && (
      <AlertModal
        visible={explainOpen}
        type="info"
        icon="lightbulb-on-outline"
        title="Explanation"
        message={explaining ? 'Analyzing…' : explanation ?? ''}
        buttons={[{ text: 'Close', style: 'default' }]}
        onClose={() => setExplainOpen(false)}
      />
    )}
    </>
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
