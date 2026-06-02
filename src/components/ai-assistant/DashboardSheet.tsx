/**
 * Collapsible bottom sheet that shows the AI-generated dashboard: an insights
 * banner followed by each widget rendered natively.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text, Icon, BottomSheet } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing } from '../../utils/responsive';
import { WidgetRenderer, InsightsBanner } from './widgets';
import type { DashboardLayout, DashboardInsight } from '../../types/ai-assistant';

interface Props {
  visible: boolean;
  onClose: () => void;
  dashboard: DashboardLayout | null;
  insights: DashboardInsight[];
  onSave?: () => void;
  saving?: boolean;
  /** Saved-dashboard id (enables per-widget comments); null for a live/unsaved dashboard. */
  dashboardId?: string | null;
}

const SHEET_H_PADDING = spacing.lg; // BottomSheet content horizontal padding

export const DashboardSheet: React.FC<Props> = ({
  visible,
  onClose,
  dashboard,
  insights,
  onSave,
  saving,
  dashboardId,
}) => {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();

  // WidgetRenderer subtracts its own card padding internally, so hand it the
  // full content-area width.
  const contentWidth = width - SHEET_H_PADDING * 2;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={dashboard?.title || 'Dashboard'}
      headerIcon="view-dashboard-outline"
      height="full"
    >
      {!dashboard ? (
        <View style={styles.empty}>
          <Icon name="chart-box-outline" size={ms(40)} color={theme.colors.textHint} />
          <Text variant="body" color="secondary" align="center" style={styles.emptyTitle}>
            No dashboard yet
          </Text>
          <Text variant="caption" color="hint" align="center" style={styles.emptySub}>
            Ask a question in the chat to generate an interactive dashboard with
            charts about your operations.
          </Text>
        </View>
      ) : (
        <View>
          {!!onSave && (
            <TouchableOpacity
              style={[styles.saveBtn, { borderColor: theme.colors.primary.main }]}
              activeOpacity={0.8}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.colors.primary.main} />
              ) : (
                <Icon name="content-save-outline" size={ms(16)} color={theme.colors.primary.main} />
              )}
              <Text variant="caption" color="primary" style={styles.saveText}>
                {saving ? 'Saving…' : 'Save dashboard'}
              </Text>
            </TouchableOpacity>
          )}
          {insights.length > 0 && <InsightsBanner insights={insights} />}
          {dashboard.widgets.map((w) => (
            <WidgetRenderer key={w.id} widget={w} width={contentWidth} dashboardId={dashboardId} />
          ))}
        </View>
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: ms(16),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  saveText: { marginLeft: spacing.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { marginTop: spacing.md },
  emptySub: { marginTop: spacing.xs, paddingHorizontal: spacing.lg },
});

export default DashboardSheet;
