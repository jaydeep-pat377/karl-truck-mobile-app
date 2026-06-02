import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing, iconSizes } from '../../../utils/responsive';
import { Text, Icon } from '../../../components/common';
import { KpiCardWidget } from './KpiCardWidget';
import { DataTableWidget } from './DataTableWidget';
import { BarChartWidget } from './BarChartWidget';
import { LineChartWidget } from './LineChartWidget';
import { PieChartWidget } from './PieChartWidget';
import { ScatterChartWidget } from './ScatterChartWidget';
import { RadarChartWidget } from './RadarChartWidget';
import { ComposedChartWidget } from './ComposedChartWidget';
import { TreemapWidget } from './TreemapWidget';
import { RadialBarChartWidget } from './RadialBarChartWidget';
import { WidgetActions } from './WidgetActions';
import { EmptyHint } from './EmptyHint';

const CARD_PADDING = spacing.md;

/** Whether the widget has any renderable data. */
function hasData(widget: Widget): boolean {
  const data = widget.data;
  if (!data) {
    return false;
  }
  if (widget.type === 'text-summary') {
    return Boolean((data.text && data.text.trim()) || (widget.description && widget.description.trim()));
  }
  return Array.isArray(data.rows) && data.rows.length > 0;
}

export function WidgetRenderer({
  widget,
  width,
  dashboardId,
}: {
  widget: Widget;
  width: number;
  dashboardId?: string | null;
}) {
  const theme = useAppTheme();

  // Width available to the body once card padding is removed.
  const innerWidth = Math.max(ms(80), width - CARD_PADDING * 2);

  const renderBody = (): React.ReactNode => {
    if (widget.error) {
      return (
        <View style={styles.statusRow}>
          <Icon name="alert-circle-outline" size={iconSizes.sm} color={theme.colors.textSecondary} />
          <Text variant="bodySmall" color="hint" style={styles.statusText} numberOfLines={4}>
            {widget.error}
          </Text>
        </View>
      );
    }

    if (!hasData(widget)) {
      return <EmptyHint widget={widget} />;
    }

    switch (widget.type) {
      case 'kpi-card':
        return <KpiCardWidget widget={widget} />;
      case 'data-table':
        return <DataTableWidget widget={widget} maxHeight={ms(280)} enableExplain />;
      case 'text-summary':
        return (
          <Text variant="body" color="primary">
            {widget.data?.text || widget.description || ''}
          </Text>
        );
      case 'line-chart':
      case 'area-chart':
        return <LineChartWidget widget={widget} width={innerWidth} />;
      case 'pie-chart':
        return <PieChartWidget widget={widget} width={innerWidth} />;
      case 'treemap':
        return <TreemapWidget widget={widget} width={innerWidth} />;
      case 'radial-bar-chart':
        return <RadialBarChartWidget widget={widget} width={innerWidth} />;
      case 'scatter-chart':
        return <ScatterChartWidget widget={widget} width={innerWidth} />;
      case 'radar-chart':
        return <RadarChartWidget widget={widget} width={innerWidth} />;
      case 'composed-chart':
        return <ComposedChartWidget widget={widget} width={innerWidth} />;
      default:
        // bar-chart, horizontal-bar-chart, stacked-bar-chart
        return <BarChartWidget widget={widget} width={innerWidth} />;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          {!!widget.title && (
            <Text variant="h4" color="primary" style={styles.title} numberOfLines={2}>
              {widget.title}
            </Text>
          )}
          {!!widget.description && widget.type !== 'text-summary' && (
            <Text variant="caption" color="hint" style={styles.description} numberOfLines={3}>
              {widget.description}
            </Text>
          )}
        </View>
        <WidgetActions widget={widget} dashboardId={dashboardId} />
      </View>
      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ms(14),
    borderWidth: 0.5,
    padding: CARD_PADDING,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.sm,
  },
  body: {
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  statusText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WidgetRenderer;
