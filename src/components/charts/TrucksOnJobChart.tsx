/**
 * Trucks on Job Chart Component
 *
 * Displays a multi-line/area chart showing truck states over time:
 * - Waiting: Trucks on job site waiting to pour
 * - Pouring: Trucks actively pouring concrete
 * - Washout: Trucks washing out after pour
 *
 * Based on web app performance-charts.tsx logic.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { moderateScale as ms } from 'react-native-size-matters';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

// Shadow styles for tooltips
const SHADOWS = {
  lg: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
};

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// TYPES
// ============================================================================

export interface TrucksTimePoint {
  time: string;
  time_display: string;
  waiting: number;
  pouring: number;
  washout: number;
  total: number;
  avg_waiting_minutes?: number | null;
  avg_pouring_minutes?: number | null;
  avg_washing_minutes?: number | null;
}

export interface TrucksAverages {
  avg_waiting_minutes: number;
  avg_pouring_minutes: number;
  avg_washout_minutes: number;
}

export interface TrucksOnJobChartProps {
  /** Time point data */
  timePoints: TrucksTimePoint[];
  /** Overall averages */
  averages: TrucksAverages;
  /** Dark mode flag */
  isDark: boolean;
  /** Chart height */
  height?: number;
  /** Horizontal padding */
  horizontalPadding?: number;
  /** Display mode: 'line' for line chart, 'area' for stacked area chart */
  displayMode?: 'line' | 'area';
  /** Enable horizontal scrolling */
  scrollable?: boolean;
  /** Minimum width per data point when scrollable (default: 40) */
  minPointSpacing?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TrucksOnJobChart: React.FC<TrucksOnJobChartProps> = ({
  timePoints,
  averages,
  isDark,
  height = ms(180),
  horizontalPadding = 16,
  displayMode = 'line',
  scrollable = true,
  minPointSpacing = 120,
}) => {
  // Multi-select filter - all selected by default
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(['waiting', 'pouring', 'washout'])
  );
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    time: string;
    waiting: number;
    pouring: number;
    washout: number;
    total: number;
    avgWaiting?: number | null;
    avgPouring?: number | null;
    avgWashing?: number | null;
  } | null>(null);

  const themeColors = isDark ? colors.dark : colors.light;
  const containerWidth = SCREEN_WIDTH - horizontalPadding * 2;
  const yAxisWidth = 35;
  const padding = { top: 16, right: 20, bottom: 32, left: 10 };
  const chartHeight = height - padding.top - padding.bottom;
  const baseChartWidth = containerWidth - yAxisWidth;

  const hasData = timePoints && timePoints.length > 0;

  // Parse time to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Calculate time range
  const timeRange = useMemo(() => {
    const allTimes = hasData
      ? timePoints.map(d => parseTimeToMinutes(d.time_display))
      : [480, 600]; // Default 8:00 - 10:00

    const dataMinTime = Math.min(...allTimes);
    const dataMaxTime = Math.max(...allTimes);
    const minTime = Math.floor(dataMinTime / 15) * 15 - 15;
    const maxTime = Math.ceil(dataMaxTime / 15) * 15 + 15;
    const range = maxTime - minTime || 1;

    return { minTime, maxTime, range };
  }, [timePoints, hasData]);

  // Calculate chart width - expand based on time duration if scrollable
  const timeSlots = Math.ceil(timeRange.range / 15); // Number of 15-min slots
  const scrollableWidth = Math.max(timeSlots * minPointSpacing, baseChartWidth);
  const chartWidth = scrollable ? scrollableWidth : baseChartWidth;

  // Y-axis configuration - based on max total trucks
  const { maxValue, yAxisValues } = useMemo(() => {
    const maxTotal = hasData ? Math.max(...timePoints.map(d => d.total), 1) : 3;
    const max = Math.ceil(maxTotal / 2) * 2 + 2; // Round up to even + buffer
    const values = Array.from({ length: max + 1 }, (_, i) => max - i);
    return { maxValue: max, yAxisValues: values };
  }, [timePoints, hasData]);

  // Series configuration
  const seriesConfig = useMemo(() => [
    {
      key: 'waiting',
      color: colors.chart.waiting,
      label: 'Waiting',
      marker: 'circle',
    },
    {
      key: 'pouring',
      color: colors.chart.pouring,
      label: 'Pouring',
      marker: 'diamond',
    },
    {
      key: 'washout',
      color: colors.chart.washout,
      label: 'Washout',
      marker: 'square',
    },
  ], []);

  // Coordinate transformations
  const getX = (time: number) => {
    const normalized = (time - timeRange.minTime) / timeRange.range;
    return padding.left + normalized * (chartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  // Create line path for a series
  const createLinePath = (key: string) => {
    if (!hasData || timePoints.length < 1) return '';

    const points = timePoints.map(d => ({
      x: getX(parseTimeToMinutes(d.time_display)),
      y: getY(d[key as keyof TrucksTimePoint] as number),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Create filled area path for a series (area from line to bottom)
  const createFilledAreaPath = (key: string) => {
    if (!hasData || timePoints.length < 1) return '';

    const points = timePoints.map(d => ({
      x: getX(parseTimeToMinutes(d.time_display)),
      y: getY(d[key as keyof TrucksTimePoint] as number),
    }));

    const bottomY = getY(0);

    // Start from bottom-left
    let path = `M ${points[0].x} ${bottomY}`;

    // Line up to first point
    path += ` L ${points[0].x} ${points[0].y}`;

    // Draw line through all points
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    // Line down to bottom-right
    path += ` L ${points[points.length - 1].x} ${bottomY}`;

    // Close path
    path += ' Z';

    return path;
  };

  // Create stacked area path for a series
  const createStackedAreaPath = (key: string, stackedKeys: string[]) => {
    if (!hasData || timePoints.length < 1) return '';

    const keyIndex = stackedKeys.indexOf(key);
    if (keyIndex === -1) return '';

    // Calculate cumulative values for this series
    const points = timePoints.map(d => {
      let cumulative = 0;
      for (let i = 0; i <= keyIndex; i++) {
        cumulative += d[stackedKeys[i] as keyof TrucksTimePoint] as number;
      }
      return {
        x: getX(parseTimeToMinutes(d.time_display)),
        y: getY(cumulative),
        baseY: keyIndex === 0
          ? getY(0)
          : getY(stackedKeys.slice(0, keyIndex).reduce((sum, k) =>
              sum + (d[k as keyof TrucksTimePoint] as number), 0)),
      };
    });

    // Create closed area path
    let path = `M ${points[0].x} ${points[0].baseY}`;

    // Top line
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        path += ` L ${points[i].x} ${points[i].y}`;
      } else {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    // Bottom line (reverse)
    for (let i = points.length - 1; i >= 0; i--) {
      path += ` L ${points[i].x} ${points[i].baseY}`;
    }

    path += ' Z';
    return path;
  };

  // Filter handling - toggle individual filters
  const toggleFilter = (key: string) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const visibleSeries = seriesConfig.filter(s => selectedFilters.has(s.key));

  // Format minutes to time string (e.g., 480 -> "8:00")
  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // X-axis labels at 15-minute intervals
  const xAxisLabels = useMemo(() => {
    const labels: { time: number; display: string }[] = [];

    // Generate labels at every 15-minute interval
    for (let time = timeRange.minTime; time <= timeRange.maxTime; time += 15) {
      labels.push({
        time,
        display: formatMinutesToTime(time),
      });
    }

    return labels;
  }, [timeRange]);

  // Render marker based on type
  const renderMarker = (
    type: string,
    x: number,
    y: number,
    color: string,
    size: number = 5
  ) => {
    switch (type) {
      case 'circle':
        return (
          <Circle
            cx={x}
            cy={y}
            r={size}
            fill={themeColors.card}
            stroke={color}
            strokeWidth={2}
          />
        );
      case 'diamond':
        const d = size;
        return (
          <Path
            d={`M ${x} ${y - d} L ${x + d} ${y} L ${x} ${y + d} L ${x - d} ${y} Z`}
            fill={color}
          />
        );
      case 'square':
        const s = size - 1;
        return (
          <Path
            d={`M ${x - s} ${y - s} L ${x + s} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`}
            fill={color}
          />
        );
      default:
        return <Circle cx={x} cy={y} r={size} fill={color} />;
    }
  };

  const hideTooltip = () => setTooltip(null);

  // Stack order for area chart
  const stackOrder = ['waiting', 'pouring', 'washout'];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          Trucks on the Job
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.hint }]}>
          Avg Wait: {averages.avg_waiting_minutes.toFixed(1)} min  •  Avg Pour: {averages.avg_pouring_minutes.toFixed(1)} min  •  Avg Washout: {averages.avg_washout_minutes.toFixed(1)} min
        </Text>
      </View>

      {/* Chart - wrapped in Pressable to hide tooltip on tap */}
      <Pressable onPress={hideTooltip} style={{ position: 'relative' }}>
        <View style={styles.chartContainer}>
          {/* Y-axis */}
          <View style={[styles.yAxis, { width: yAxisWidth }]}>
            <Text style={[styles.yAxisLabel, { color: themeColors.text.hint }]}>
              Trucks
            </Text>
            <Svg width={yAxisWidth} height={height}>
              {yAxisValues
                .filter((_, i) => i % 2 === 0 || maxValue <= 4)
                .map((value, i) => {
                  const y = getY(value);
                  return (
                    <SvgText
                      key={`y-label-${i}`}
                      x={yAxisWidth - 5}
                      y={y + 4}
                      fontSize={ms(10)}
                      fill={themeColors.text.hint}
                      textAnchor="end"
                      fontFamily={fontFamily.medium}
                    >
                      {value}
                    </SvgText>
                  );
                })}
            </Svg>
          </View>

          {/* Chart Area with horizontal scroll */}
          <View style={{
            flex: 1,
            maxWidth: baseChartWidth,
            backgroundColor: themeColors.card,
            borderRadius: ms(8),
            overflow: 'hidden',
          }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={scrollable && chartWidth > baseChartWidth}
              scrollEnabled={scrollable && chartWidth > baseChartWidth}
              nestedScrollEnabled={true}
              bounces={false}
              scrollEventThrottle={16}
              style={{
                backgroundColor: themeColors.card,
                flexGrow: 0,
              }}
              contentContainerStyle={{
                minWidth: chartWidth,
                backgroundColor: themeColors.card,
              }}
            >
              <View style={[styles.chartArea, { width: chartWidth, backgroundColor: themeColors.card, overflow: 'visible' }]}>
                <View style={{ position: 'relative', overflow: 'visible' }}>
                  <Svg width={chartWidth} height={height}>
                {/* Gradients for filled areas */}
                <Defs>
                  {seriesConfig.map(s => (
                    <LinearGradient
                      key={`gradient-${s.key}`}
                      id={`gradient-${s.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <Stop offset="0%" stopColor={s.color} stopOpacity={0.4} />
                      <Stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
                    </LinearGradient>
                  ))}
                </Defs>

                {/* Grid lines */}
                {yAxisValues
                  .filter((_, i) => i % 2 === 0 || maxValue <= 4)
                  .map((value, i) => {
                    const y = getY(value);
                    return (
                      <Path
                        key={`grid-${i}`}
                        d={`M ${padding.left} ${y} L ${chartWidth - padding.right} ${y}`}
                        stroke={isDark ? colors.grey[60] + '30' : colors.grey[15]}
                        strokeWidth={1}
                      />
                    );
                  })}

                {/* X-axis labels */}
                {xAxisLabels.map((label, i) => {
                  const x = getX(label.time);
                  if (x < padding.left - 10 || x > chartWidth - padding.right + 10) return null;
                  return (
                    <SvgText
                      key={`x-label-${i}`}
                      x={x}
                      y={height - 8}
                      fontSize={ms(9)}
                      fill={themeColors.text.hint}
                      textAnchor="middle"
                      fontFamily={fontFamily.medium}
                    >
                      {label.display}
                    </SvgText>
                  );
                })}

                {/* Filled areas under lines (line mode) */}
                {displayMode === 'line' && hasData && visibleSeries.map(s => (
                  <Path
                    key={`filled-area-${s.key}`}
                    d={createFilledAreaPath(s.key)}
                    fill={`url(#gradient-${s.key})`}
                    stroke="none"
                  />
                ))}

                {/* Stacked area fills (area mode) */}
                {displayMode === 'area' && hasData && visibleSeries.map(s => {
                  const visibleKeys = visibleSeries.map(vs => vs.key);
                  return (
                    <Path
                      key={`area-${s.key}`}
                      d={createStackedAreaPath(s.key, activeFilter ? [activeFilter] : stackOrder)}
                      fill={`url(#gradient-${s.key})`}
                      stroke="none"
                    />
                  );
                })}

                {/* Lines */}
                {hasData && visibleSeries.map(s => (
                  <Path
                    key={`line-${s.key}`}
                    d={createLinePath(s.key)}
                    stroke={s.color}
                    strokeWidth={2}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Data point markers */}
                {hasData && visibleSeries.map(s =>
                  timePoints.map((d, i) => {
                    const x = getX(parseTimeToMinutes(d.time_display));
                    const value = d[s.key as keyof TrucksTimePoint] as number;
                    const y = getY(value);
                    return (
                      <G
                        key={`marker-${s.key}-${i}`}
                        onPress={() => {
                          setTooltip({
                            x,
                            y,
                            time: d.time_display,
                            waiting: d.waiting,
                            pouring: d.pouring,
                            washout: d.washout,
                            total: d.total,
                            avgWaiting: d.avg_waiting_minutes,
                            avgPouring: d.avg_pouring_minutes,
                            avgWashing: d.avg_washing_minutes,
                          });
                        }}
                      >
                        <Circle cx={x} cy={y} r={15} fill="transparent" />
                        {renderMarker(s.marker, x, y, s.color, 5)}
                      </G>
                    );
                  })
                )}
              </Svg>

                  {/* Tooltip - positioned on the chart */}
                  {tooltip && (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          backgroundColor: colors.chart.background.dark,
                          left: Math.min(Math.max(tooltip.x - 60, 10), chartWidth - 150),
                          top: Math.max(tooltip.y - 140, 10),
                          ...SHADOWS.lg,
                        },
                      ]}
                    >
                      <Text style={styles.tooltipTime}>{tooltip.time}</Text>

                      {/* Truck counts */}
                      <View style={styles.tooltipRow}>
                        <View style={[styles.tooltipDot, { backgroundColor: colors.chart.waiting }]} />
                        <Text style={styles.tooltipLabel}>Waiting</Text>
                        <Text style={styles.tooltipValue}>{tooltip.waiting}</Text>
                      </View>
                      <View style={styles.tooltipRow}>
                        <View style={[styles.tooltipDot, { backgroundColor: colors.chart.pouring }]} />
                        <Text style={styles.tooltipLabel}>Pouring</Text>
                        <Text style={styles.tooltipValue}>{tooltip.pouring}</Text>
                      </View>
                      <View style={styles.tooltipRow}>
                        <View style={[styles.tooltipDot, { backgroundColor: colors.chart.washout }]} />
                        <Text style={styles.tooltipLabel}>Washout</Text>
                        <Text style={styles.tooltipValue}>{tooltip.washout}</Text>
                      </View>

                      {/* Avg durations section */}
                      {(tooltip.avgWaiting != null || tooltip.avgPouring != null || tooltip.avgWashing != null) && (
                        <>
                          <View style={styles.tooltipDivider} />
                          <Text style={styles.tooltipSectionTitle}>Avg Time Durations:</Text>
                          {tooltip.avgWaiting != null && (
                            <View style={styles.tooltipRow}>
                              <Text style={styles.tooltipLabel}>Waiting:</Text>
                              <Text style={styles.tooltipValue}>{tooltip.avgWaiting.toFixed(1)} min</Text>
                            </View>
                          )}
                          {tooltip.avgPouring != null && (
                            <View style={styles.tooltipRow}>
                              <Text style={styles.tooltipLabel}>Pouring:</Text>
                              <Text style={styles.tooltipValue}>{tooltip.avgPouring.toFixed(1)} min</Text>
                            </View>
                          )}
                          {tooltip.avgWashing != null && (
                            <View style={styles.tooltipRow}>
                              <Text style={styles.tooltipLabel}>Washing:</Text>
                              <Text style={styles.tooltipValue}>{tooltip.avgWashing.toFixed(1)} min</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>

      </Pressable>

      {/* Legend */}
      <View style={styles.legend}>
        {seriesConfig.map(s => {
          const isActive = selectedFilters.has(s.key);
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.legendPill,
                {
                  backgroundColor: isActive
                    ? isDark
                      ? themeColors.surface
                      : colors.grey[5]
                    : 'transparent',
                  borderColor: isDark ? themeColors.border : colors.grey[15],
                  opacity: isActive ? 1 : 0.5,
                },
              ]}
              onPress={() => toggleFilter(s.key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.legendMarker,
                  s.marker === 'circle' && {
                    borderRadius: 6,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: s.color,
                  },
                  s.marker === 'diamond' && {
                    transform: [{ rotate: '45deg' }],
                    backgroundColor: s.color,
                    borderRadius: 1,
                  },
                  s.marker === 'square' && {
                    backgroundColor: s.color,
                    borderRadius: 1,
                  },
                ]}
              />
              <Text
                style={[
                  styles.legendText,
                  { color: isActive ? themeColors.text.primary : themeColors.text.hint },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(12),
    padding: ms(12),
    marginVertical: ms(8),
  },
  header: {
    marginBottom: ms(12),
  },
  title: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(2),
  },
  subtitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    alignItems: 'flex-end',
    paddingRight: ms(4),
  },
  yAxisLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    marginBottom: ms(4),
  },
  chartArea: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: ms(12),
    gap: ms(8),
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  legendMarker: {
    width: ms(10),
    height: ms(10),
    marginRight: ms(6),
  },
  legendText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    borderRadius: ms(8),
    minWidth: ms(130),
  },
  tooltipTime: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    color: colors.chart.tooltip.text,
    marginBottom: ms(4),
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(2),
  },
  tooltipDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    marginRight: ms(6),
  },
  tooltipLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    color: colors.chart.tooltip.text,
    marginRight: ms(8),
  },
  tooltipValue: {
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
    color: colors.chart.tooltip.text,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: ms(6),
  },
  tooltipSectionTitle: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    color: colors.chart.tooltip.text,
    opacity: 0.8,
    marginBottom: ms(2),
  },
});

export default TrucksOnJobChart;
