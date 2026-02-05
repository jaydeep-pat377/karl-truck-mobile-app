/**
 * OrdersDateChart - Date-based Order Status Chart
 *
 * This component renders a bar/line chart showing order status counts by date.
 * It ONLY displays dates that exist in the API response - no empty dates are generated.
 *
 * Data Flow:
 * 1. API Response (orders array) →
 * 2. groupOrdersByDate() → Groups orders by date
 * 3. transformToChartData() → Converts to chart-ready format
 * 4. Render chart with only dates that have data
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Line,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, spacing } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPE DEFINITIONS
// ============================================

// Compatible with ApiOrder from types/order.ts
interface OrderData {
  order_id: string;
  order_date: string; // "2026-02-04"
  display_date?: string; // "04 Feb 2026"
  status: string; // "In Progress", "Completed", etc.
  ordered_qty: number;
  delivered_qty: number;
  remaining_qty?: number;
  // For pour_speed graph data (if available from order details)
  graphs?: {
    pour_speed?: {
      ordered?: Array<{ time: string; rate: number }>;
      delivered?: Array<{ time: string; rate: number }>;
      poured?: Array<{ time: string; rate: number }>;
    };
  };
}

interface DateGroupedData {
  date: string;
  displayDate: string;
  ordered: number;
  delivered: number;
  poured: number;
  total: number;
}

interface ChartProps {
  orders: OrderData[];
  isDark?: boolean;
  height?: number;
  showLegend?: boolean;
  chartType?: 'bar' | 'line';
}

// ============================================
// DATA TRANSFORMATION LOGIC
// ============================================

/**
 * Groups orders by date and calculates status counts
 *
 * @param orders - Array of orders from API
 * @returns Array of date-grouped data with status counts
 *
 * Logic:
 * 1. Create a Map to group orders by date
 * 2. For each order, increment the appropriate status counter
 * 3. Only return dates that have at least one order
 */
const groupOrdersByDate = (orders: OrderData[]): DateGroupedData[] => {
  // Use Map for efficient grouping
  const dateMap = new Map<string, DateGroupedData>();

  orders.forEach((order) => {
    const date = order.order_date;

    if (!date) return; // Skip orders without dates

    // Get or create entry for this date
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        displayDate: order.display_date || formatDisplayDate(date),
        ordered: 0,
        delivered: 0,
        poured: 0,
        total: 0,
      });
    }

    const entry = dateMap.get(date)!;

    // Increment based on order quantities
    // ordered_qty represents total ordered
    // delivered_qty represents what's been delivered
    // We can infer "poured" from completed orders

    entry.ordered += order.ordered_qty || 0;
    entry.delivered += order.delivered_qty || 0;

    // If order is completed, consider it poured
    const status = order.status?.toLowerCase() || '';
    if (status === 'completed' || status === 'poured') {
      entry.poured += order.delivered_qty || 0;
    }

    entry.total += 1;
  });

  // Convert Map to array and sort by date
  return Array.from(dateMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Alternative: Group by pour_speed graph data if available
 * Use this when you have the detailed graphs.pour_speed data
 */
const groupByPourSpeedData = (orders: OrderData[]): DateGroupedData[] => {
  const dateMap = new Map<string, DateGroupedData>();

  orders.forEach((order) => {
    const pourSpeed = order.graphs?.pour_speed;
    if (!pourSpeed) return;

    const date = order.order_date;
    if (!date) return;

    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        displayDate: order.display_date || formatDisplayDate(date),
        ordered: 0,
        delivered: 0,
        poured: 0,
        total: 0,
      });
    }

    const entry = dateMap.get(date)!;

    // Sum rates from pour_speed arrays (only if data exists)
    if (pourSpeed.ordered && pourSpeed.ordered.length > 0) {
      entry.ordered += pourSpeed.ordered.reduce((sum, d) => sum + d.rate, 0);
    }
    if (pourSpeed.delivered && pourSpeed.delivered.length > 0) {
      entry.delivered += pourSpeed.delivered.reduce((sum, d) => sum + d.rate, 0);
    }
    if (pourSpeed.poured && pourSpeed.poured.length > 0) {
      entry.poured += pourSpeed.poured.reduce((sum, d) => sum + d.rate, 0);
    }

    entry.total += 1;
  });

  // Filter out dates with no data and sort
  return Array.from(dateMap.values())
    .filter(d => d.ordered > 0 || d.delivered > 0 || d.poured > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Format date string to display format
 */
const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });
};

/**
 * Format date for X-axis label (shorter)
 */
const formatAxisDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
};

// ============================================
// CHART COMPONENT
// ============================================

export const OrdersDateChart: React.FC<ChartProps> = ({
  orders,
  isDark = false,
  height = ms(200),
  showLegend = true,
  chartType = 'bar',
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    values: { label: string; value: number; color: string }[];
  } | null>(null);

  const themeColors = isDark ? colors.dark : colors.light;

  // Transform data - only dates with data will be included
  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    // Check if orders have pour_speed data
    const hasPourSpeedData = orders.some(o => o.graphs?.pour_speed);

    if (hasPourSpeedData) {
      return groupByPourSpeedData(orders);
    }

    return groupOrdersByDate(orders);
  }, [orders]);

  // Series configuration - only include series with data
  const seriesConfig = useMemo(() => {
    const allSeries = [
      { key: 'ordered', color: colors.chart?.ordered || colors.warning.main, label: 'Ordered' },
      { key: 'delivered', color: isDark ? colors.info.main : colors.info.dark, label: 'Delivered' },
      { key: 'poured', color: colors.chart?.poured || colors.success.main, label: 'Poured' },
    ];

    // Filter to only include series that have data
    return allSeries.filter(series => {
      return chartData.some(d => (d[series.key as keyof DateGroupedData] as number) > 0);
    });
  }, [chartData, isDark]);

  // Calculate chart dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const containerWidth = SCREEN_WIDTH - spacing.lg * 2;
  const barWidth = Math.min(40, (containerWidth - padding.left - padding.right) / (chartData.length * 1.5));
  const chartWidth = Math.max(containerWidth, chartData.length * (barWidth * seriesConfig.length + 20) + padding.left + padding.right);
  const chartHeight = height - padding.top - padding.bottom;
  const needsScroll = chartWidth > containerWidth;

  // Calculate Y-axis max
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 100;

    const max = Math.max(
      ...chartData.flatMap(d => [d.ordered, d.delivered, d.poured])
    );
    return Math.ceil(max / 10) * 10 || 100;
  }, [chartData]);

  // Y-axis labels
  const yAxisLabels = useMemo(() => {
    const step = maxValue / 4;
    return [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];
  }, [maxValue]);

  // Get X position for a date
  const getX = (index: number): number => {
    const groupWidth = barWidth * seriesConfig.length + 10;
    return padding.left + index * groupWidth + groupWidth / 2;
  };

  // Get Y position for a value
  const getY = (value: number): number => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  // Visible series based on filter
  const visibleSeries = activeFilter
    ? seriesConfig.filter(s => s.key === activeFilter)
    : seriesConfig;

  // Toggle legend filter
  const toggleFilter = (key: string) => {
    setActiveFilter(activeFilter === key ? null : key);
  };

  // Handle bar press for tooltip
  const handleBarPress = (dateData: DateGroupedData, x: number, y: number) => {
    setTooltip({
      x,
      y,
      date: dateData.displayDate,
      values: seriesConfig.map(s => ({
        label: s.label,
        value: dateData[s.key as keyof DateGroupedData] as number,
        color: s.color,
      })),
    });
  };

  // No data state
  if (chartData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <View style={styles.emptyContainer}>
          <Text variant="body" color="secondary">
            No data available for chart
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          Orders by Date
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.hint }]}>
          {chartData.length} date{chartData.length !== 1 ? 's' : ''} with orders
        </Text>
      </View>

      {/* Chart */}
      <View style={styles.chartWrapper}>
        {/* Fixed Y-axis */}
        <View style={[styles.yAxis, { width: padding.left }]}>
          <Svg width={padding.left} height={height}>
            {yAxisLabels.map((value, i) => {
              const y = getY(value);
              return (
                <SvgText
                  key={`y-${i}`}
                  x={padding.left - 8}
                  y={y + 4}
                  fontSize={ms(10)}
                  fill={themeColors.text.hint}
                  textAnchor="end"
                  fontFamily={fontFamily.medium}
                >
                  {Math.round(value)}
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* Scrollable Chart */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={needsScroll}
          scrollEnabled={needsScroll}
          style={styles.scrollView}
          contentContainerStyle={{ width: chartWidth - padding.left }}
          onScrollBeginDrag={() => setTooltip(null)}
        >
          <Svg width={chartWidth - padding.left} height={height}>
            {/* Grid lines */}
            {yAxisLabels.map((value, i) => {
              const y = getY(value);
              return (
                <Line
                  key={`grid-${i}`}
                  x1={0}
                  y1={y}
                  x2={chartWidth - padding.left - padding.right}
                  y2={y}
                  stroke={isDark ? colors.grey[60] + '30' : colors.grey[15]}
                  strokeWidth={1}
                />
              );
            })}

            {/* Bars or Lines */}
            {chartType === 'bar' ? (
              // Bar Chart
              chartData.map((dateData, dateIndex) => {
                const groupX = getX(dateIndex) - padding.left;
                const barGroupWidth = barWidth * visibleSeries.length;
                const startX = groupX - barGroupWidth / 2;

                return (
                  <G key={`group-${dateIndex}`}>
                    {visibleSeries.map((series, seriesIndex) => {
                      const value = dateData[series.key as keyof DateGroupedData] as number;
                      if (value === 0) return null;

                      const barX = startX + seriesIndex * barWidth;
                      const barHeight = (value / maxValue) * chartHeight;
                      const barY = padding.top + chartHeight - barHeight;

                      return (
                        <G
                          key={`bar-${dateIndex}-${series.key}`}
                          onPress={() => handleBarPress(dateData, groupX, barY)}
                        >
                          <Rect
                            x={barX}
                            y={barY}
                            width={barWidth - 2}
                            height={barHeight}
                            fill={series.color}
                            rx={4}
                            ry={4}
                          />
                        </G>
                      );
                    })}
                  </G>
                );
              })
            ) : (
              // Line Chart
              visibleSeries.map((series) => {
                const points = chartData
                  .map((d, i) => ({
                    x: getX(i) - padding.left,
                    y: getY(d[series.key as keyof DateGroupedData] as number),
                    value: d[series.key as keyof DateGroupedData] as number,
                  }))
                  .filter(p => p.value > 0);

                if (points.length < 1) return null;

                // Create line path
                let path = `M ${points[0].x} ${points[0].y}`;
                for (let i = 1; i < points.length; i++) {
                  path += ` L ${points[i].x} ${points[i].y}`;
                }

                return (
                  <G key={`line-${series.key}`}>
                    <Path
                      d={path}
                      stroke={series.color}
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {points.map((p, i) => (
                      <Circle
                        key={`point-${i}`}
                        cx={p.x}
                        cy={p.y}
                        r={5}
                        fill={themeColors.card}
                        stroke={series.color}
                        strokeWidth={2}
                      />
                    ))}
                  </G>
                );
              })
            )}

            {/* X-axis labels */}
            {chartData.map((d, i) => {
              const x = getX(i) - padding.left;
              return (
                <SvgText
                  key={`x-${i}`}
                  x={x}
                  y={height - 10}
                  fontSize={ms(10)}
                  fill={themeColors.text.hint}
                  textAnchor="middle"
                  fontFamily={fontFamily.medium}
                >
                  {formatAxisDate(d.date)}
                </SvgText>
              );
            })}
          </Svg>

          {/* Tooltip */}
          {tooltip && (
            <View
              style={[
                styles.tooltip,
                {
                  left: Math.min(Math.max(tooltip.x - 60, 8), chartWidth - 140),
                  top: Math.max(tooltip.y - 80, 5),
                },
              ]}
            >
              <Text style={styles.tooltipDate}>{tooltip.date}</Text>
              {tooltip.values.map((v, i) => (
                <View key={i} style={styles.tooltipRow}>
                  <View style={[styles.tooltipDot, { backgroundColor: v.color }]} />
                  <Text style={styles.tooltipLabel}>{v.label}:</Text>
                  <Text style={styles.tooltipValue}>{v.value.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Legend */}
      {showLegend && seriesConfig.length > 0 && (
        <View style={styles.legend}>
          {seriesConfig.map((series) => {
            const isActive = activeFilter === null || activeFilter === series.key;
            return (
              <TouchableOpacity
                key={series.key}
                style={[
                  styles.legendItem,
                  {
                    backgroundColor: isActive
                      ? (isDark ? themeColors.surface : colors.grey[5])
                      : 'transparent',
                    borderColor: isDark ? themeColors.border : colors.grey[15],
                    opacity: isActive ? 1 : 0.5,
                  },
                ]}
                onPress={() => toggleFilter(series.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.legendDot, { backgroundColor: series.color }]} />
                <Text
                  style={[
                    styles.legendText,
                    { color: isActive ? themeColors.text.primary : themeColors.text.secondary },
                  ]}
                >
                  {series.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(16),
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: ms(16),
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    marginTop: ms(2),
  },
  chartWrapper: {
    flexDirection: 'row',
  },
  yAxis: {
    marginRight: -spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    height: ms(150),
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grey[15],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: ms(16),
    borderWidth: 1,
    gap: spacing.xs,
  },
  legendDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
  },
  legendText: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.chart?.background?.dark || colors.grey[80],
    padding: spacing.sm,
    borderRadius: ms(8),
    minWidth: ms(120),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipDate: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
    color: colors.common.white,
    marginBottom: spacing.xs,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tooltipDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  tooltipLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    color: colors.grey[30],
  },
  tooltipValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    color: colors.common.white,
  },
});

export default OrdersDateChart;
