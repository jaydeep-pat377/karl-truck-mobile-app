

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { ScrollView as ScrollViewType } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

export interface TimeSeriesData {
  time: string;
  time_display: string;
  rate: number;
  cumulative_qty?: number;
  load_qty?: number;
  actual_spacing_min?: number;
}

export interface PourSpeedChartProps {

  orderedData: TimeSeriesData[];

  deliveredData: TimeSeriesData[];

  pouredData: TimeSeriesData[];

  scheduleRate: number;

  yMax: number;

  scheduledQty: number;

  truckSpace?: number;

  isDark: boolean;

  height?: number;

  horizontalPadding?: number;

  showTruckReferences?: boolean;

  truckReferenceTimes?: string[];

  scrollable?: boolean;

  minPointSpacing?: number;
}

export const PourSpeedChart: React.FC<PourSpeedChartProps> = ({
  orderedData,
  deliveredData,
  pouredData,
  scheduleRate,
  yMax,
  scheduledQty,
  truckSpace = 0,
  isDark,
  height = ms(180),
  horizontalPadding = 16,
  showTruckReferences = false,
  truckReferenceTimes = [],
  scrollable = true,
  minPointSpacing = 120,
}) => {

  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(['ordered', 'delivered', 'poured'])
  );


  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.5;
  const chartScrollRef = useRef<ScrollViewType>(null);
  const currentScrollX = useRef(0);

  const handleZoomIn = () => {
    if (isAtEnd || zoomLevel >= MAX_ZOOM) return;
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    if (zoomLevel <= MIN_ZOOM) return;
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
    setZoomLevel(newZoom);
    setIsAtEnd(false);

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

    const isEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    setIsAtEnd(isEnd);
  };

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
  const padding = { top: 16, right: 20, bottom: 50, left: 35 };
  const chartHeight = height - padding.top - padding.bottom;
  const baseChartWidth = containerWidth - yAxisWidth;

  const parseTimeToMinutes = (timeDisplay: string): number => {

    const timePart = timeDisplay.split(' ')[0];
    const [hours, minutes] = timePart.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const timeRange = useMemo(() => {
    const allTimes = [
      ...orderedData.map(d => parseTimeToMinutes(d.time_display)),
      ...deliveredData.map(d => parseTimeToMinutes(d.time_display)),
      ...pouredData.map(d => parseTimeToMinutes(d.time_display)),
    ];

    const dataMinTime = allTimes.length > 0 ? Math.min(...allTimes) : 480;
    const dataMaxTime = allTimes.length > 0 ? Math.max(...allTimes) : 540;

    const minTime = Math.floor(dataMinTime / 15) * 15 - 15;
    const maxTime = Math.ceil(dataMaxTime / 15) * 15 + 15;
    const range = maxTime - minTime || 1;

    return { minTime, maxTime, range };
  }, [orderedData, deliveredData, pouredData]);


  const zoomedChartWidth = baseChartWidth * zoomLevel;

  const maxValue = Math.max(yMax, 100);
  const yAxisValues = [100, 50, 0];

  const allSeriesConfig = useMemo(() => [
    {
      key: 'delivered',
      color: isDark ? colors.chart.delivered.dark : colors.chart.delivered.light,
      label: 'Delivered',
      data: deliveredData,
      marker: 'filledCircle',
      lineType: 'smooth',
    },
    {
      key: 'poured',
      color: colors.chart.poured,
      label: 'Poured',
      data: pouredData,
      marker: 'diamond',
      lineType: 'smooth',
    },
    {
      key: 'ordered',
      color: colors.chart.ordered,
      label: 'Ordered',
      data: orderedData,
      marker: 'filledSquare',
      lineType: 'linear',
    },
  ], [orderedData, deliveredData, pouredData, isDark]);

  const seriesWithData = allSeriesConfig.filter(s => s.data.length > 0);

  const getX = (time: number) => {
    const normalized = (time - timeRange.minTime) / timeRange.range;
    return padding.left + normalized * (zoomedChartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

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

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
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

  const visibleSeries = allSeriesConfig.filter(
    s => selectedFilters.has(s.key) && s.data.length > 0
  );

  const formatMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const xAxisLabels = useMemo(() => {
    const labels: { time: number; display: string; hasData: boolean }[] = [];



    const labelWidth = 50;
    const availableWidth = zoomedChartWidth - padding.left - padding.right;
    const maxLabels = Math.max(2, Math.floor(availableWidth / labelWidth));


    const totalMinutes = timeRange.maxTime - timeRange.minTime;
    const rawInterval = Math.ceil(totalMinutes / maxLabels);


    const timeInterval = Math.max(15, Math.ceil(rawInterval / 15) * 15);


    const allDataTimes = [
      ...orderedData.map(d => parseTimeToMinutes(d.time_display)),
      ...deliveredData.map(d => parseTimeToMinutes(d.time_display)),
      ...pouredData.map(d => parseTimeToMinutes(d.time_display)),
    ];

    for (let time = timeRange.minTime; time <= timeRange.maxTime; time += timeInterval) {

      const hasData = allDataTimes.some(dataTime =>
        dataTime >= time && dataTime < time + timeInterval
      );
      labels.push({
        time,
        display: formatMinutesToTime(time),
        hasData,
      });
    }

    return labels;
  }, [timeRange, zoomedChartWidth, orderedData, deliveredData, pouredData]);

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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            Pour Speed (CY/HR)
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
        <View style={styles.headerStats}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
            <Icon name="clock-outline" size={ms(14)} color={colors.info.main} />
            <View style={styles.statTextContainer}>
              <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Spacing</Text>
              <Text style={[styles.statValue, { color: colors.info.main }]}>{truckSpace} min</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
            <Icon name="speedometer" size={ms(14)} color={colors.info.main} />
            <View style={styles.statTextContainer}>
              <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Rate</Text>
              <Text style={[styles.statValue, { color: colors.info.main }]}>{scheduleRate} CY/HR</Text>
            </View>
          </View>
          {scheduledQty > 0 && (
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
              <Icon name="calendar-check" size={ms(14)} color={colors.info.main} />
              <View style={styles.statTextContainer}>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Scheduled</Text>
                <Text style={[styles.statValue, { color: colors.info.main }]}>{scheduledQty.toFixed(2)} CY</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <Pressable onPress={hideTooltip} style={{ position: 'relative' }}>
        <View style={styles.chartContainer}>
          <View style={[styles.yAxis, { width: yAxisWidth }]}>
            <Svg width={yAxisWidth} height={height}>
              <SvgText
                x={yAxisWidth - 5}
                y={ms(10)}
                fontSize={ms(9)}
                fill={themeColors.text.hint}
                textAnchor="end"
                fontFamily={fontFamily.medium}
              >
                CY/HR
              </SvgText>
              {yAxisValues.map((value, i) => {
                const y = getY(value);
                return (
                  <SvgText
                    key={`y-label-${i}`}
                    x={yAxisWidth - 5}
                    y={y}
                    fontSize={ms(10)}
                    fill={themeColors.text.hint}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fontFamily={fontFamily.medium}
                  >
                    {value}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          <View style={{
            flex: 1,
            maxWidth: baseChartWidth,
            backgroundColor: themeColors.card,
            borderRadius: ms(8),
            overflow: 'hidden',
          }}>
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
              <View style={[styles.chartArea, { width: zoomedChartWidth, backgroundColor: themeColors.card, overflow: 'visible' }]}>
                <View style={{ position: 'relative', overflow: 'visible' }}>
                  <Svg width={zoomedChartWidth} height={height}>
                {yAxisValues.map((value, i) => {
                  const y = getY(value);
                  return (
                    <Path
                      key={`grid-${i}`}
                      d={`M ${padding.left} ${y} L ${zoomedChartWidth - padding.right} ${y}`}
                      stroke={isDark ? colors.grey[60] + '30' : colors.grey[15]}
                      strokeWidth={1}
                    />
                  );
                })}

                {showTruckReferences && truckReferenceTimes.map((timeStr, i) => {
                  const date = new Date(timeStr);
                  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
                  const x = getX(minutes);

                  if (x < padding.left || x > zoomedChartWidth - padding.right) return null;

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

                {xAxisLabels.map((label, i) => {
                  const x = getX(label.time);
                  if (x < padding.left - 10 || x > zoomedChartWidth - padding.right + 10) return null;

                  const labelColor = label.hasData ? themeColors.text.hint : (isDark ? colors.grey[40] : colors.grey[70]);
                  return (
                    <SvgText
                      key={`x-label-${i}`}
                      x={x}
                      y={height - 28}
                      fontSize={ms(11)}
                      fill={labelColor}
                      textAnchor="end"
                      fontFamily={fontFamily.medium}
                      transform={`rotate(-45, ${x}, ${height - 28})`}
                    >
                      {label.display}
                    </SvgText>
                  );
                })}

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

                  {tooltip && (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          backgroundColor: colors.chart.background.dark,
                          left: Math.min(Math.max(tooltip.x - 60, 10), zoomedChartWidth - 140),
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

      {zoomLevel > 1 && (
        <View style={styles.swipeIndicator}>
          <Icon name="gesture-swipe-horizontal" size={ms(16)} color={themeColors.text.hint} />
          <Text style={[styles.swipeText, { color: themeColors.text.hint }]}>Swipe right to view more</Text>
        </View>
      )}

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
              <View style={styles.legendLineContainer}>
                <Svg width={ms(32)} height={ms(12)}>
                  <Line
                    x1={0}
                    y1={ms(6)}
                    x2={ms(32)}
                    y2={ms(6)}
                    stroke={s.color}
                    strokeWidth={2}
                  />
                  {s.marker === 'filledCircle' && (
                    <Circle
                      cx={ms(16)}
                      cy={ms(6)}
                      r={ms(4)}
                      fill={s.color}
                    />
                  )}
                  {s.marker === 'diamond' && (
                    <Path
                      d={`M ${ms(16)} ${ms(1)} L ${ms(21)} ${ms(6)} L ${ms(16)} ${ms(11)} L ${ms(11)} ${ms(6)} Z`}
                      fill={s.color}
                    />
                  )}
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

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(12),
    padding: ms(12),
    marginVertical: ms(8),
  },
  header: {
    marginBottom: ms(12),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerStats: {
    flexDirection: 'row',
    marginTop: ms(8),
    gap: ms(6),
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(6),
    paddingVertical: ms(4),
    borderRadius: ms(6),
    borderWidth: 1,
    gap: ms(6),
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
  },
  statValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },
  title: {
    fontSize: ms(14),
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
