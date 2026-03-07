

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { ScrollView as ScrollViewType } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const MIN_ZOOM = 1; // 100%
  const MAX_ZOOM = 5; // 500%
  const ZOOM_STEP = 0.5;
  const chartScrollRef = useRef<ScrollViewType>(null);
  const currentScrollX = useRef(0);

  const handleZoomIn = () => {
    if (isAtEnd || zoomLevel >= MAX_ZOOM) return; // Don't zoom in if at the end or max zoom
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    if (zoomLevel <= MIN_ZOOM) return;
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
    setZoomLevel(newZoom);
    setIsAtEnd(false); // Reset end state when zooming out
    // Adjust scroll position to prevent blank screen
    setTimeout(() => {
      const newMaxScroll = baseChartWidth * newZoom - baseChartWidth;
      if (currentScrollX.current > newMaxScroll) {
        chartScrollRef.current?.scrollTo({ x: Math.max(0, newMaxScroll), animated: true });
      }
    }, 50);
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setIsAtEnd(false);
    currentScrollX.current = 0;
    chartScrollRef.current?.scrollTo({ x: 0, animated: true });
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    currentScrollX.current = contentOffset.x;
    // Check if scrolled to the end (with small threshold)
    const isEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    setIsAtEnd(isEnd);
  };

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
  const chartPadding = { top: 15, right: 20, bottom: 65, left: 35 };
  const chartAreaHeight = height - chartPadding.top - chartPadding.bottom;
  const baseChartWidth = containerWidth - yAxisWidth;
  const zoomedChartWidth = baseChartWidth * zoomLevel;

  const hasData = timePoints && timePoints.length > 0;


  const maxY = useMemo(() => {
    if (!hasData) return 4;
    const maxTotal = Math.max(...timePoints.map(d => d.waiting + d.pouring + (d.washout || 0)), 1);
    return Math.max(maxTotal + 1, 4);
  }, [timePoints, hasData]);


  const yAxisValues = useMemo(() => {
    return Array.from({ length: maxY + 1 }, (_, i) => maxY - i);
  }, [maxY]);




  const getX = (index: number, totalPoints?: number): number => {
    const points = totalPoints || timePoints.length || 5; // default 5 for empty state
    if (points === 1) {
      return chartPadding.left + (zoomedChartWidth - chartPadding.left - chartPadding.right) / 2;
    }
    const availableWidth = zoomedChartWidth - chartPadding.left - chartPadding.right;
    return chartPadding.left + (index / (points - 1)) * availableWidth;
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
    if (!hasData) {
      // Show default time labels when no data (8:00 to 10:00 with 30 min intervals)
      const defaultLabels = ['8:00', '8:30', '9:00', '9:30', '10:00'];
      return defaultLabels.map((display, index) => ({
        index,
        display,
        show: true,
        hasData: false,
      }));
    }

    // Calculate how many labels can fit based on chart width and zoom
    // Each rotated label needs approximately 50px of space
    const labelWidth = 50;
    const availableWidth = zoomedChartWidth - chartPadding.left - chartPadding.right;
    const maxLabels = Math.max(2, Math.floor(availableWidth / labelWidth));

    // Calculate interval to fit within maxLabels
    const interval = Math.max(1, Math.ceil(timePoints.length / maxLabels));

    return timePoints.map((point, index) => ({
      index,
      display: point.time_display,
      show: index % interval === 0 || index === timePoints.length - 1,
      hasData: point.waiting > 0 || point.pouring > 0 || (point.washout || 0) > 0,
    }));
  }, [timePoints, hasData, zoomedChartWidth]);

  const hideTooltip = () => setTooltip(null);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            Trucks on the Job
          </Text>
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={[styles.zoomButton, { backgroundColor: isDark ? themeColors.surface : colors.grey[10] }]}
              onPress={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              activeOpacity={0.7}
            >
              <Icon name="minus" size={ms(18)} color={zoomLevel <= MIN_ZOOM ? themeColors.text.disabled : themeColors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomButton, { backgroundColor: isDark ? themeColors.surface : colors.grey[10] }]}
              onPress={handleResetZoom}
              activeOpacity={0.7}
            >
              <Icon name="magnify-expand" size={ms(18)} color={themeColors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomButton, { backgroundColor: isDark ? themeColors.surface : colors.grey[10] }]}
              onPress={handleZoomIn}
              disabled={isAtEnd || zoomLevel >= MAX_ZOOM}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={ms(18)} color={(isAtEnd || zoomLevel >= MAX_ZOOM) ? themeColors.text.disabled : themeColors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
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
              ref={chartScrollRef}
              horizontal
              showsHorizontalScrollIndicator={zoomLevel > 1}
              scrollEnabled={zoomLevel > 1}
              nestedScrollEnabled={true}
              bounces={Platform.OS === 'ios'}
              decelerationRate="normal"
              scrollEventThrottle={16}
              directionalLockEnabled={true}
              disableIntervalMomentum={false}
              onScroll={handleScroll}
            >
              <View style={{ width: zoomedChartWidth, position: 'relative' }}>
                <Svg width={zoomedChartWidth} height={height}>
                  {yAxisValues.map((value) => {
                    const y = getY(value);
                    return (
                      <Line
                        key={`grid-${value}`}
                        x1={chartPadding.left}
                        y1={y}
                        x2={zoomedChartWidth - chartPadding.right}
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
                    const totalLabels = xAxisLabels.filter(l => l.show).length;
                    const x = getX(label.index, hasData ? undefined : totalLabels);
                    return (
                      <SvgText
                        key={`x-${label.index}`}
                        x={x}
                        y={height - 38}
                        fontSize={ms(10)}
                        fill={themeColors.text.hint}
                        textAnchor="end"
                        fontFamily={fontFamily.medium}
                        transform={`rotate(-45, ${x}, ${height - 38})`}
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
                        left: Math.min(Math.max(tooltip.x - 45, 5), zoomedChartWidth - 100),
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

      {zoomLevel > 1 && (
        <View style={styles.swipeIndicator}>
          <Icon name="gesture-swipe-horizontal" size={ms(16)} color={themeColors.text.hint} />
          <Text style={[styles.swipeText, { color: themeColors.text.hint }]}>Swipe right to view more</Text>
        </View>
      )}

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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: ms(15),
    fontFamily: fontFamily.semiBold,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  zoomButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
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
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(6),
    gap: ms(4),
  },
  swipeText: {
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
