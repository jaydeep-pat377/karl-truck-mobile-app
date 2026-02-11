

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

const COLORS = {
  waiting: '#4A4A4A',
  pouring: colors.dashboard.statGreen,
  washout: colors.dashboard.statBlue,
  grid: '#E0E0E0',
};

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

export const TrucksOnJobChart: React.FC<TrucksOnJobChartProps> = ({
  timePoints,
  averages: _averages,
  isDark,
  height = ms(220),
  horizontalPadding = 16,
  scrollable = true,
  minPointSpacing = 80,
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


  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(['waiting', 'pouring', 'washout'])
  );


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


  const maxY = useMemo(() => {
    if (!hasData) return 4;
    const maxTotal = Math.max(...timePoints.map(d => d.waiting + d.pouring + (d.washout || 0)), 1);
    return Math.max(maxTotal + 1, 4);
  }, [timePoints, hasData]);


  const yAxisValues = useMemo(() => {
    return Array.from({ length: maxY + 1 }, (_, i) => maxY - i);
  }, [maxY]);


  const chartWidth = useMemo(() => {
    if (!hasData) return baseChartWidth;

    const calculatedWidth = (timePoints.length * minPointSpacing) + chartPadding.left + chartPadding.right;

    if (scrollable) {
      return Math.max(calculatedWidth, baseChartWidth);
    }
    return baseChartWidth;
  }, [hasData, timePoints.length, minPointSpacing, scrollable, baseChartWidth]);


  const needsScroll = chartWidth > baseChartWidth;


  const getX = (index: number): number => {
    if (timePoints.length === 1) {
      return chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) / 2;
    }
    const availableWidth = chartWidth - chartPadding.left - chartPadding.right;
    return chartPadding.left + (index / (timePoints.length - 1)) * availableWidth;
  };


  const getY = (value: number): number => {
    return chartPadding.top + chartAreaHeight - (value / maxY) * chartAreaHeight;
  };


  const createWaitingAreaPath = (): string => {
    if (!hasData || timePoints.length === 0) return '';
    if (!selectedFilters.has('waiting')) return '';

    const baseY = getY(0);
    let path = `M ${getX(0)} ${baseY}`;


    path += ` L ${getX(0)} ${getY(timePoints[0].waiting)}`;


    for (let i = 1; i < timePoints.length; i++) {
      path += ` L ${getX(i)} ${getY(timePoints[i].waiting)}`;
    }


    path += ` L ${getX(timePoints.length - 1)} ${baseY}`;


    path += ' Z';

    return path;
  };


  const createPouringAreaPath = (): string => {
    if (!hasData || timePoints.length === 0) return '';
    if (!selectedFilters.has('pouring')) return '';

    const waitingActive = selectedFilters.has('waiting');


    const getBaseValue = (point: TrucksTimePoint) => waitingActive ? point.waiting : 0;

    let path = `M ${getX(0)} ${getY(getBaseValue(timePoints[0]))}`;


    for (let i = 0; i < timePoints.length; i++) {
      const topY = getY(getBaseValue(timePoints[i]) + timePoints[i].pouring);
      if (i === 0) {
        path += ` L ${getX(i)} ${topY}`;
      } else {
        path += ` L ${getX(i)} ${topY}`;
      }
    }


    for (let i = timePoints.length - 1; i >= 0; i--) {
      path += ` L ${getX(i)} ${getY(getBaseValue(timePoints[i]))}`;
    }


    path += ' Z';

    return path;
  };


  const createWashoutAreaPath = (): string => {
    if (!hasData || timePoints.length === 0) return '';
    if (!selectedFilters.has('washout')) return '';


    const hasWashout = timePoints.some(d => (d.washout || 0) > 0);
    if (!hasWashout) return '';

    const waitingActive = selectedFilters.has('waiting');
    const pouringActive = selectedFilters.has('pouring');


    const getBaseValue = (point: TrucksTimePoint) => {
      let base = 0;
      if (waitingActive) base += point.waiting;
      if (pouringActive) base += point.pouring;
      return base;
    };


    let path = `M ${getX(0)} ${getY(getBaseValue(timePoints[0]))}`;


    for (let i = 0; i < timePoints.length; i++) {
      const topY = getY(getBaseValue(timePoints[i]) + (timePoints[i].washout || 0));
      if (i === 0) {
        path += ` L ${getX(i)} ${topY}`;
      } else {
        path += ` L ${getX(i)} ${topY}`;
      }
    }


    for (let i = timePoints.length - 1; i >= 0; i--) {
      path += ` L ${getX(i)} ${getY(getBaseValue(timePoints[i]))}`;
    }


    path += ' Z';

    return path;
  };


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
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          Trucks on the Job
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.text.hint }]}>
          Drag your finger over the plot to zoom in
        </Text>
      </View>

      <Pressable onPress={hideTooltip}>
        <View style={styles.chartRow}>
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

                  {hasData && (
                    <Path
                      d={createWaitingAreaPath()}
                      fill={COLORS.waiting}
                    />
                  )}

                  {hasData && (
                    <Path
                      d={createPouringAreaPath()}
                      fill={COLORS.pouring}
                    />
                  )}

                  {hasData && (
                    <Path
                      d={createWashoutAreaPath()}
                      fill={COLORS.washout}
                    />
                  )}

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
