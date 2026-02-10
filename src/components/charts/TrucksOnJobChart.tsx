/**
 * Trucks on Job Chart Component
 * Stacked AREA chart showing truck states (Waiting & Pouring) over time
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, {
  Path,
  G,
  Text as SvgText,
  Line,
  Circle,
} from 'react-native-svg';
import { moderateScale as ms } from 'react-native-size-matters';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Chart colors - matching the image
const COLORS = {
  waiting: '#4A4A4A',  // Dark gray
  pouring: '#4CAF50',  // Green
  washout: '#64B5F6',  // Light blue
  grid: '#E0E0E0',
};

// ============================================================================
// TYPES
// ============================================================================

export interface TrucksTimePoint {
  time: string;
  time_display: string;
  waiting: number;
  pouring: number;
  washout?: number;
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
  timePoints: TrucksTimePoint[];
  averages?: TrucksAverages;
  isDark: boolean;
  height?: number;
  horizontalPadding?: number;
  scrollable?: boolean;
  minPointSpacing?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TrucksOnJobChart: React.FC<TrucksOnJobChartProps> = ({
  timePoints,
  averages: _averages,
  isDark,
  height = ms(220),
  horizontalPadding = 16,
  scrollable = true,
  minPointSpacing = 80, // Increased for better scrolling
}) => {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    time: string;
    waiting: number;
    pouring: number;
    washout: number;
    total: number;
  } | null>(null);

  // Filter state - all enabled by default
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(['waiting', 'pouring', 'washout'])
  );

  // Toggle filter
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

  const themeColors = isDark ? colors.dark : colors.light;
  const containerWidth = SCREEN_WIDTH - horizontalPadding * 2;
  const yAxisWidth = 25;
  const chartPadding = { top: 15, right: 20, bottom: 30, left: 10 };
  const chartAreaHeight = height - chartPadding.top - chartPadding.bottom;
  const baseChartWidth = containerWidth - yAxisWidth;

  const hasData = timePoints && timePoints.length > 0;

  // Calculate max Y value (including washout)
  const maxY = useMemo(() => {
    if (!hasData) return 4;
    const maxTotal = Math.max(...timePoints.map(d => d.waiting + d.pouring + (d.washout || 0)), 1);
    return Math.max(maxTotal + 1, 4);
  }, [timePoints, hasData]);

  // Y-axis values
  const yAxisValues = useMemo(() => {
    return Array.from({ length: maxY + 1 }, (_, i) => maxY - i);
  }, [maxY]);

  // Chart width calculation - always make it wider than container for scrolling
  const chartWidth = useMemo(() => {
    if (!hasData) return baseChartWidth;
    // Calculate width based on number of points with proper spacing
    const calculatedWidth = (timePoints.length * minPointSpacing) + chartPadding.left + chartPadding.right;
    // If scrollable, use calculated width; otherwise fit to container
    if (scrollable) {
      return Math.max(calculatedWidth, baseChartWidth);
    }
    return baseChartWidth;
  }, [hasData, timePoints.length, minPointSpacing, scrollable, baseChartWidth]);

  // Check if scrolling is needed
  const needsScroll = chartWidth > baseChartWidth;

  // Get X position for a data point
  const getX = (index: number): number => {
    if (timePoints.length === 1) {
      return chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) / 2;
    }
    const availableWidth = chartWidth - chartPadding.left - chartPadding.right;
    return chartPadding.left + (index / (timePoints.length - 1)) * availableWidth;
  };

  // Get Y position for a value
  const getY = (value: number): number => {
    return chartPadding.top + chartAreaHeight - (value / maxY) * chartAreaHeight;
  };

  // Create filled area path for Waiting (bottom layer)
  const createWaitingAreaPath = (): string => {
    if (!hasData || timePoints.length === 0) return '';
    if (!selectedFilters.has('waiting')) return '';

    const baseY = getY(0);
    let path = `M ${getX(0)} ${baseY}`;

    // Go up to first waiting value
    path += ` L ${getX(0)} ${getY(timePoints[0].waiting)}`;

    // Draw top edge through all points
    for (let i = 1; i < timePoints.length; i++) {
      path += ` L ${getX(i)} ${getY(timePoints[i].waiting)}`;
    }

    // Go down to baseline at last point
    path += ` L ${getX(timePoints.length - 1)} ${baseY}`;

    // Close path
    path += ' Z';

    return path;
  };

  // Create filled area path for Pouring (middle layer, stacked on waiting)
  const createPouringAreaPath = (): string => {
    if (!hasData || timePoints.length === 0) return '';
    if (!selectedFilters.has('pouring')) return '';

    const waitingActive = selectedFilters.has('waiting');

    // Start at first point's base level (waiting if active, else 0)
    const getBaseValue = (point: TrucksTimePoint) => waitingActive ? point.waiting : 0;

    let path = `M ${getX(0)} ${getY(getBaseValue(timePoints[0]))}`;

    // Draw top edge (base + pouring) through all points
    for (let i = 0; i < timePoints.length; i++) {
      const topY = getY(getBaseValue(timePoints[i]) + timePoints[i].pouring);
      if (i === 0) {
        path += ` L ${getX(i)} ${topY}`;
      } else {
        path += ` L ${getX(i)} ${topY}`;
      }
    }

    // Draw bottom edge (base level) in reverse
    for (let i = timePoints.length - 1; i >= 0; i--) {
      path += ` L ${getX(i)} ${getY(getBaseValue(timePoints[i]))}`;
    }

    // Close path
    path += ' Z';

    return path;
  };

  // Create filled area path for Washout (top layer, stacked on waiting + pouring)
  const createWashoutAreaPath = (): string => {
    if (!hasData || timePoints.length === 0) return '';
    if (!selectedFilters.has('washout')) return '';

    // Check if there's any washout data
    const hasWashout = timePoints.some(d => (d.washout || 0) > 0);
    if (!hasWashout) return '';

    const waitingActive = selectedFilters.has('waiting');
    const pouringActive = selectedFilters.has('pouring');

    // Calculate base value based on active filters
    const getBaseValue = (point: TrucksTimePoint) => {
      let base = 0;
      if (waitingActive) base += point.waiting;
      if (pouringActive) base += point.pouring;
      return base;
    };

    // Start at first point's base level
    let path = `M ${getX(0)} ${getY(getBaseValue(timePoints[0]))}`;

    // Draw top edge (base + washout) through all points
    for (let i = 0; i < timePoints.length; i++) {
      const topY = getY(getBaseValue(timePoints[i]) + (timePoints[i].washout || 0));
      if (i === 0) {
        path += ` L ${getX(i)} ${topY}`;
      } else {
        path += ` L ${getX(i)} ${topY}`;
      }
    }

    // Draw bottom edge (base level) in reverse
    for (let i = timePoints.length - 1; i >= 0; i--) {
      path += ` L ${getX(i)} ${getY(getBaseValue(timePoints[i]))}`;
    }

    // Close path
    path += ' Z';

    return path;
  };

  // X-axis labels
  const xAxisLabels = useMemo(() => {
    if (!hasData) return [];

    const interval = timePoints.length > 12 ? 3 : timePoints.length > 8 ? 2 : 1;

    return timePoints.map((point, index) => ({
      index,
      display: point.time_display,
      show: index % interval === 0 || index === timePoints.length - 1,
    }));
  }, [timePoints, hasData]);

  const hideTooltip = () => setTooltip(null);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          Trucks on the Job
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.hint }]}>
          Drag your finger over the plot to zoom in
        </Text>
      </View>

      {/* Chart */}
      <Pressable onPress={hideTooltip}>
        <View style={styles.chartRow}>
          {/* Y-Axis */}
          <View style={{ width: yAxisWidth }}>
            <Svg width={yAxisWidth} height={height}>
              {yAxisValues.map((value) => {
                const y = getY(value);
                return (
                  <SvgText
                    key={`y-${value}`}
                    x={yAxisWidth - 5}
                    y={y + 4}
                    fontSize={ms(11)}
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

          {/* Chart Area */}
          <View style={{ flex: 1, maxWidth: baseChartWidth, overflow: 'hidden' }}>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={needsScroll}
              scrollEnabled={scrollable && needsScroll}
              nestedScrollEnabled={true}
              bounces={false}
              contentContainerStyle={{ width: chartWidth }}
            >
              <View style={{ width: chartWidth, position: 'relative' }}>
                <Svg width={chartWidth} height={height}>
                  {/* Grid lines */}
                  {yAxisValues.map((value) => {
                    const y = getY(value);
                    return (
                      <Line
                        key={`grid-${value}`}
                        x1={chartPadding.left}
                        y1={y}
                        x2={chartWidth - chartPadding.right}
                        y2={y}
                        stroke={isDark ? '#333' : COLORS.grid}
                        strokeWidth={1}
                      />
                    );
                  })}

                  {/* Waiting Area (bottom - dark gray) */}
                  {hasData && (
                    <Path
                      d={createWaitingAreaPath()}
                      fill={COLORS.waiting}
                    />
                  )}

                  {/* Pouring Area (middle - green, stacked on waiting) */}
                  {hasData && (
                    <Path
                      d={createPouringAreaPath()}
                      fill={COLORS.pouring}
                    />
                  )}

                  {/* Washout Area (top - blue, stacked on waiting + pouring) */}
                  {hasData && (
                    <Path
                      d={createWashoutAreaPath()}
                      fill={COLORS.washout}
                    />
                  )}

                  {/* Touch points for tooltip */}
                  {hasData && timePoints.map((point, index) => {
                    const x = getX(index);
                    const washout = point.washout || 0;
                    const topY = getY(point.waiting + point.pouring + washout);
                    return (
                      <G
                        key={`touch-${index}`}
                        onPress={() => {
                          setTooltip({
                            x,
                            y: topY,
                            time: point.time_display,
                            waiting: point.waiting,
                            pouring: point.pouring,
                            washout: washout,
                            total: point.waiting + point.pouring + washout,
                          });
                        }}
                      >
                        <Circle
                          cx={x}
                          cy={topY}
                          r={20}
                          fill="transparent"
                        />
                      </G>
                    );
                  })}

                  {/* X-axis labels */}
                  {xAxisLabels.filter(l => l.show).map((label) => {
                    const x = getX(label.index);
                    return (
                      <SvgText
                        key={`x-${label.index}`}
                        x={x}
                        y={height - 8}
                        fontSize={ms(10)}
                        fill={themeColors.text.hint}
                        textAnchor="middle"
                        fontFamily={fontFamily.medium}
                      >
                        {label.display}
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
                        left: Math.min(Math.max(tooltip.x - 45, 5), chartWidth - 100),
                        top: Math.max(tooltip.y - 75, 5),
                      },
                    ]}
                  >
                    <Text style={styles.tooltipTitle}>{tooltip.time}</Text>
                    <View style={styles.tooltipRow}>
                      <View style={[styles.tooltipDot, { backgroundColor: COLORS.waiting }]} />
                      <Text style={styles.tooltipText}>Waiting: {tooltip.waiting}</Text>
                    </View>
                    <View style={styles.tooltipRow}>
                      <View style={[styles.tooltipDot, { backgroundColor: COLORS.pouring }]} />
                      <Text style={styles.tooltipText}>Pouring: {tooltip.pouring}</Text>
                    </View>
                    <View style={styles.tooltipRow}>
                      <View style={[styles.tooltipDot, { backgroundColor: COLORS.washout }]} />
                      <Text style={styles.tooltipText}>Washout: {tooltip.washout}</Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Pressable>

      {/* Legend - Toggleable buttons */}
      <View style={styles.legend}>
        <TouchableOpacity
          style={[
            styles.legendButton,
            {
              backgroundColor: selectedFilters.has('waiting')
                ? isDark ? themeColors.surface : colors.grey[5]
                : 'transparent',
              borderColor: isDark ? themeColors.border : colors.grey[15],
              opacity: selectedFilters.has('waiting') ? 1 : 0.5,
            },
          ]}
          onPress={() => toggleFilter('waiting')}
          activeOpacity={0.7}
        >
          <View style={[styles.legendBox, { backgroundColor: COLORS.waiting }]} />
          <Text style={[
            styles.legendLabel,
            { color: selectedFilters.has('waiting') ? themeColors.text.primary : themeColors.text.hint }
          ]}>
            "Waiting"
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.legendButton,
            {
              backgroundColor: selectedFilters.has('pouring')
                ? isDark ? themeColors.surface : colors.grey[5]
                : 'transparent',
              borderColor: isDark ? themeColors.border : colors.grey[15],
              opacity: selectedFilters.has('pouring') ? 1 : 0.5,
            },
          ]}
          onPress={() => toggleFilter('pouring')}
          activeOpacity={0.7}
        >
          <View style={[styles.legendBox, { backgroundColor: COLORS.pouring }]} />
          <Text style={[
            styles.legendLabel,
            { color: selectedFilters.has('pouring') ? themeColors.text.primary : themeColors.text.hint }
          ]}>
            "Pouring"
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.legendButton,
            {
              backgroundColor: selectedFilters.has('washout')
                ? isDark ? themeColors.surface : colors.grey[5]
                : 'transparent',
              borderColor: isDark ? themeColors.border : colors.grey[15],
              opacity: selectedFilters.has('washout') ? 1 : 0.5,
            },
          ]}
          onPress={() => toggleFilter('washout')}
          activeOpacity={0.7}
        >
          <View style={[styles.legendBox, { backgroundColor: COLORS.washout }]} />
          <Text style={[
            styles.legendLabel,
            { color: selectedFilters.has('washout') ? themeColors.text.primary : themeColors.text.hint }
          ]}>
            "Washout"
          </Text>
        </TouchableOpacity>
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
    marginBottom: ms(10),
  },
  title: {
    fontSize: ms(15),
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    marginTop: ms(2),
  },
  chartRow: {
    flexDirection: 'row',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ms(14),
    gap: ms(8),
    flexWrap: 'nowrap',
  },
  legendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  legendBox: {
    width: ms(12),
    height: ms(12),
    marginRight: ms(6),
    borderRadius: ms(2),
  },
  legendLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    paddingHorizontal: ms(10),
    paddingVertical: ms(8),
    borderRadius: ms(6),
    minWidth: ms(90),
  },
  tooltipTitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    color: '#fff',
    marginBottom: ms(4),
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(2),
  },
  tooltipDot: {
    width: ms(8),
    height: ms(8),
    marginRight: ms(6),
  },
  tooltipText: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    color: '#fff',
  },
});

export default TrucksOnJobChart;
