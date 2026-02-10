/**
 * Pour Speed Chart Component
 *
 * Displays a line chart showing:
 * - Ordered line: Planned/scheduled delivery rate (constant Y-value)
 * - Delivered line: Actual delivery rate based on truck arrivals
 * - Poured line: Actual pour rate based on completion times
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
  Line,
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

export interface TimeSeriesData {
  time: string;
  time_display: string;
  rate: number;
  cumulative_qty?: number;
  load_qty?: number;
  actual_spacing_min?: number;
}

export interface PourSpeedChartProps {
  /** Ordered/scheduled data points */
  orderedData: TimeSeriesData[];
  /** Delivered data points (based on on_job_time) */
  deliveredData: TimeSeriesData[];
  /** Poured data points (based on wash_time/unload_time) */
  pouredData: TimeSeriesData[];
  /** Schedule delivery rate (CY/HR) */
  scheduleRate: number;
  /** Y-axis maximum value */
  yMax: number;
  /** Total scheduled quantity (CY) */
  scheduledQty: number;
  /** Truck spacing in minutes */
  truckSpace?: number;
  /** Dark mode flag */
  isDark: boolean;
  /** Chart height */
  height?: number;
  /** Horizontal padding */
  horizontalPadding?: number;
  /** Show reference lines for truck start times */
  showTruckReferences?: boolean;
  /** Reference line times (ISO strings) */
  truckReferenceTimes?: string[];
  /** Enable horizontal scrolling */
  scrollable?: boolean;
  /** Minimum width per data point when scrollable (default: 60) */
  minPointSpacing?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PourSpeedChart: React.FC<PourSpeedChartProps> = ({
  orderedData,
  deliveredData,
  pouredData,
  scheduleRate: _scheduleRate,
  yMax,
  scheduledQty: _scheduledQty,
  truckSpace: _truckSpace = 0,
  isDark,
  height = ms(180),
  horizontalPadding = 16,
  showTruckReferences = false,
  truckReferenceTimes = [],
  scrollable = true,
  minPointSpacing = 120,
}) => {
  // Multi-select filter - all selected by default
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(['ordered', 'delivered', 'poured'])
  );
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    time: string;
    label: string;
    value: number;
    color: string;
    loadQty?: number;
    actualSpacing?: number;
  } | null>(null);

  const themeColors = isDark ? colors.dark : colors.light;
  const containerWidth = SCREEN_WIDTH - horizontalPadding * 2;
  const yAxisWidth = 40;
  const padding = { top: 16, right: 20, bottom: 32, left: 10 };
  const chartHeight = height - padding.top - padding.bottom;
  const baseChartWidth = containerWidth - yAxisWidth;

  // Parse time_display (HH:MM format) to minutes from midnight
  const parseTimeToMinutes = (timeDisplay: string): number => {
    const [hours, minutes] = timeDisplay.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  // Calculate time range
  const timeRange = useMemo(() => {
    const allTimes = [
      ...orderedData.map(d => parseTimeToMinutes(d.time_display)),
      ...deliveredData.map(d => parseTimeToMinutes(d.time_display)),
      ...pouredData.map(d => parseTimeToMinutes(d.time_display)),
    ];

    const dataMinTime = allTimes.length > 0 ? Math.min(...allTimes) : 480;
    const dataMaxTime = allTimes.length > 0 ? Math.max(...allTimes) : 540;

    // Add 15 min padding on each side
    const minTime = Math.floor(dataMinTime / 15) * 15 - 15;
    const maxTime = Math.ceil(dataMaxTime / 15) * 15 + 15;
    const range = maxTime - minTime || 1;

    return { minTime, maxTime, range };
  }, [orderedData, deliveredData, pouredData]);

  // Calculate chart width - expand based on time duration if scrollable
  // Each 15 minutes of time range gets minPointSpacing pixels
  const timeSlots = Math.ceil(timeRange.range / 15); // Number of 15-min slots
  const scrollableWidth = Math.max(timeSlots * minPointSpacing, baseChartWidth);
  const chartWidth = scrollable ? scrollableWidth : baseChartWidth;

  // Y-axis configuration
  const maxValue = Math.max(yMax, 100);
  const yAxisValues = [100, 50, 0]; // Fixed values for consistency

  // Series configuration - order: Delivered, Poured, Ordered (as per design)
  const allSeriesConfig = useMemo(() => [
    {
      key: 'delivered',
      color: isDark ? colors.chart.delivered.dark : colors.chart.delivered.light,
      label: 'Delivered',
      data: deliveredData,
      marker: 'filledCircle', // Rounded/filled circle
      lineType: 'smooth',
    },
    {
      key: 'poured',
      color: colors.chart.poured,
      label: 'Poured',
      data: pouredData,
      marker: 'diamond', // Diamond/cross square
      lineType: 'smooth',
    },
    {
      key: 'ordered',
      color: colors.chart.ordered,
      label: 'Ordered',
      data: orderedData,
      marker: 'filledSquare', // Filled square
      lineType: 'linear',
    },
  ], [orderedData, deliveredData, pouredData, isDark]);

  const seriesWithData = allSeriesConfig.filter(s => s.data.length > 0);

  // Coordinate transformations
  const getX = (time: number) => {
    const normalized = (time - timeRange.minTime) / timeRange.range;
    return padding.left + normalized * (chartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  // Create line path (straight segments)
  const createLinePath = (seriesData: TimeSeriesData[]) => {
    if (seriesData.length < 1) return '';

    const points = seriesData.map(d => ({
      x: getX(parseTimeToMinutes(d.time_display)),
      y: getY(d.rate),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Create smooth curve path (Catmull-Rom approximation)
  const createSmoothPath = (seriesData: TimeSeriesData[]) => {
    if (seriesData.length < 2) return createLinePath(seriesData);

    const points = seriesData.map(d => ({
      x: getX(parseTimeToMinutes(d.time_display)),
      y: getY(d.rate),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      // Control points for smooth curve
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

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

  const visibleSeries = allSeriesConfig.filter(
    s => selectedFilters.has(s.key) && s.data.length > 0
  );

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
      case 'filledCircle':
        return (
          <Circle
            cx={x}
            cy={y}
            r={size}
            fill={color}
          />
        );
      case 'diamond':
        const d = size;
        return (
          <Path
            d={`M ${x} ${y - d} L ${x + d} ${y} L ${x} ${y + d} L ${x - d} ${y} Z`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
        );
      case 'square':
        const s = size - 1;
        return (
          <Path
            d={`M ${x - s} ${y - s} L ${x + s} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
        );
      case 'filledSquare':
        const fs = size - 1;
        return (
          <Path
            d={`M ${x - fs} ${y - fs} L ${x + fs} ${y - fs} L ${x + fs} ${y + fs} L ${x - fs} ${y + fs} Z`}
            fill={color}
          />
        );
      case 'hollowSquare':
        const hs = size - 1;
        return (
          <Path
            d={`M ${x - hs} ${y - hs} L ${x + hs} ${y - hs} L ${x + hs} ${y + hs} L ${x - hs} ${y + hs} Z`}
            fill={themeColors.card}
            stroke={color}
            strokeWidth={2}
          />
        );
      default:
        return <Circle cx={x} cy={y} r={size} fill={color} />;
    }
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          Pour Speed (CY/HR)
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.hint }]}>
          Drag your finger over the plot to zoom in
        </Text>
      </View>

      {/* Chart - wrapped in Pressable to hide tooltip on tap */}
      <Pressable onPress={hideTooltip} style={{ position: 'relative' }}>
        <View style={styles.chartContainer}>
          {/* Y-axis */}
          <View style={[styles.yAxis, { width: yAxisWidth }]}>
            <Text style={[styles.yAxisLabel, { color: themeColors.text.hint }]}>
              CY/HR
            </Text>
            <Svg width={yAxisWidth} height={height}>
              {yAxisValues.map((value, i) => {
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
                {/* Grid lines */}
                {yAxisValues.map((value, i) => {
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

                {/* Truck reference lines */}
                {showTruckReferences && truckReferenceTimes.map((timeStr, i) => {
                  const date = new Date(timeStr);
                  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
                  const x = getX(minutes);

                  if (x < padding.left || x > chartWidth - padding.right) return null;

                  return (
                    <G key={`ref-${i}`}>
                      <Line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={height - padding.bottom}
                        stroke="hsl(280, 60%, 50%)"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      />
                      <SvgText
                        x={x}
                        y={padding.top - 2}
                        fontSize={ms(10)}
                        fill="hsl(280, 60%, 50%)"
                        textAnchor="middle"
                        fontFamily={fontFamily.semiBold}
                      >
                        T{i + 1}
                      </SvgText>
                    </G>
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

                {/* Lines */}
                {visibleSeries.map(s => (
                  <Path
                    key={`line-${s.key}`}
                    d={s.lineType === 'smooth' ? createSmoothPath(s.data) : createLinePath(s.data)}
                    stroke={s.color}
                    strokeWidth={2}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Data point markers */}
                {visibleSeries.map(s =>
                  s.data.map((d, i) => {
                    const x = getX(parseTimeToMinutes(d.time_display));
                    const y = getY(d.rate);
                    return (
                      <G
                        key={`marker-${s.key}-${i}`}
                        onPress={() => {
                          setTooltip({
                            x,
                            y,
                            time: d.time_display,
                            label: s.label,
                            value: d.rate,
                            color: s.color,
                            loadQty: d.load_qty,
                            actualSpacing: d.actual_spacing_min,
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
                          left: Math.min(Math.max(tooltip.x - 60, 10), chartWidth - 140),
                          top: Math.max(tooltip.y - 90, 10),
                          ...SHADOWS.lg,
                        },
                      ]}
                    >
                      <Text style={styles.tooltipTime}>{tooltip.time}</Text>
                      <View style={styles.tooltipRow}>
                        <View style={[styles.tooltipDot, { backgroundColor: tooltip.color }]} />
                        <Text style={styles.tooltipLabel}>{tooltip.label}</Text>
                        <Text style={styles.tooltipValue}>{tooltip.value.toFixed(2)} CY/HR</Text>
                      </View>
                      {tooltip.loadQty != null && (
                        <View style={[styles.tooltipRow, { marginLeft: ms(12) }]}>
                          <Text style={styles.tooltipLabel}>Load Qty</Text>
                          <Text style={styles.tooltipValue}>{tooltip.loadQty.toFixed(2)} CY</Text>
                        </View>
                      )}
                      {tooltip.actualSpacing != null && (
                        <View style={[styles.tooltipRow, { marginLeft: ms(12) }]}>
                          <Text style={styles.tooltipLabel}>Actual Spacing</Text>
                          <Text style={styles.tooltipValue}>{Math.round(tooltip.actualSpacing)} min</Text>
                        </View>
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
        {allSeriesConfig.map(s => {
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
              {/* Legend line with marker */}
              <View style={styles.legendLineContainer}>
                <Svg width={ms(32)} height={ms(12)}>
                  {/* Solid line */}
                  <Line
                    x1={0}
                    y1={ms(6)}
                    x2={ms(32)}
                    y2={ms(6)}
                    stroke={s.color}
                    strokeWidth={2}
                  />
                  {/* Filled circle marker (Delivered) */}
                  {s.marker === 'filledCircle' && (
                    <Circle
                      cx={ms(16)}
                      cy={ms(6)}
                      r={ms(4)}
                      fill={s.color}
                    />
                  )}
                  {/* Diamond marker (Poured) */}
                  {s.marker === 'diamond' && (
                    <Path
                      d={`M ${ms(16)} ${ms(1)} L ${ms(21)} ${ms(6)} L ${ms(16)} ${ms(11)} L ${ms(11)} ${ms(6)} Z`}
                      fill={s.color}
                    />
                  )}
                  {/* Filled square marker (Ordered) */}
                  {s.marker === 'filledSquare' && (
                    <Path
                      d={`M ${ms(12)} ${ms(2)} L ${ms(20)} ${ms(2)} L ${ms(20)} ${ms(10)} L ${ms(12)} ${ms(10)} Z`}
                      fill={s.color}
                    />
                  )}
                </Svg>
              </View>
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
    flexWrap: 'nowrap',
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
  legendLineContainer: {
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
    minWidth: ms(100),
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
});

export default PourSpeedChart;
