
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
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

const SCREEN_WIDTH = Dimensions.get('window').width;

const COLORS = {
  waiting: '#434348',
  pouring: '#90ed7d',
  grid: '#E0E0E0',
};

export interface ScheduledLoadItem {
  id?: string;
  ticket_id?: string;
  ticket_code?: string | null;
  truck_id?: string;
  truck_code?: string | null;
  load_number?: number;
  load_qty?: number;
  scheduled_qty_raw?: number;
  actual_qty_raw?: number;

  scheduled_qty?: string;
  actual_qty?: string | null;

  scheduled_time?: string;
  scheduled_on_job_time?: string;
  scheduled_fin_pour_time?: string;
  scheduled_at_plant_time?: string;

  actual_time?: string | null;
  actual_on_job_time?: string | null;
  actual_begin_pour_time?: string | null;
  actual_unload_time?: string | null;
  actual_end_pour_time?: string | null;
  actual_wash_time?: string | null;
  actual_to_plant_time?: string | null;
  actual_at_plant_time?: string | null;

  ticket_remove_reason_code?: string | null;
  is_completed?: boolean;
}

interface TruckState {
  ticketId: string;
  truckCode: string;
  onJobTime: string;
  unloadTime: string | null;
  endUnloadTime: string | null;
  washTime: string | null;
  toPlantTime: string | null;
  loadQty: number;
}

interface ChartDataPoint {
  timestamp: number;
  waiting: number;
  pouring: number;
}

export interface TrucksOnJobChartProps {
  scheduledLoads: ScheduledLoadItem[];
  isDark: boolean;
  height?: number;
  horizontalPadding?: number;
}

function parseTimeString(timeStr: string | null | undefined, referenceDate?: Date): Date | null {
  if (!timeStr) return null;


  const isoDate = new Date(timeStr);
  if (!isNaN(isoDate.getTime()) && timeStr.includes('T')) {
    return isoDate;
  }


  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const date = referenceDate ? new Date(referenceDate) : new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  return null;
}

function filterValidLoads(loads: ScheduledLoadItem[]): ScheduledLoadItem[] {
  return loads.filter((load) => {

    if (load.ticket_remove_reason_code && load.ticket_remove_reason_code.trim() !== '') {
      return false;
    }

    if (!load.truck_code || load.truck_code.trim() === '') {
      return false;
    }
    return true;
  });
}

function processTruckStates(loads: ScheduledLoadItem[]): TruckState[] {
  const validLoads = filterValidLoads(loads);


  const referenceDate = new Date();

  return validLoads
    .filter((load) => !!load.actual_on_job_time)
    .map((load) => {
      const onJobDate = parseTimeString(load.actual_on_job_time, referenceDate);
      if (!onJobDate) return null;


      const toPlantDate = parseTimeString(load.actual_to_plant_time || load.actual_at_plant_time, referenceDate);


      let safeToPlant: string | null = null;
      if (toPlantDate) {
        safeToPlant =
          toPlantDate.getTime() >= onJobDate.getTime()
            ? toPlantDate.toISOString()
            : onJobDate.toISOString();
      }


      const unloadDate = parseTimeString(load.actual_begin_pour_time || load.actual_unload_time, referenceDate);

      const endUnloadDate = parseTimeString(load.actual_end_pour_time, referenceDate);

      const washDate = parseTimeString(load.actual_wash_time, referenceDate);


      let loadQty = 0;
      if (typeof load.actual_qty_raw === 'number') {
        loadQty = load.actual_qty_raw;
      } else if (typeof load.load_qty === 'number') {
        loadQty = load.load_qty;
      } else if (typeof load.scheduled_qty_raw === 'number') {
        loadQty = load.scheduled_qty_raw;
      } else if (typeof load.actual_qty === 'string' && load.actual_qty) {
        loadQty = parseFloat(load.actual_qty) || 0;
      } else if (typeof load.scheduled_qty === 'string' && load.scheduled_qty) {
        loadQty = parseFloat(load.scheduled_qty) || 0;
      }

      return {
        ticketId: load.ticket_id || load.ticket_code || load.id || String(load.load_number) || '',
        truckCode: load.truck_code!,
        onJobTime: onJobDate.toISOString(),
        unloadTime: unloadDate?.toISOString() || null,
        endUnloadTime: endUnloadDate?.toISOString() || null,
        washTime: washDate?.toISOString() || null,
        toPlantTime: safeToPlant,
        loadQty,
      };
    })
    .filter((state): state is TruckState => state !== null);
}

function calculateTrucksOnJob(
  time: Date,
  truckStates: TruckState[]
): { waiting: number; pouring: number } {
  let waiting = 0;
  let pouring = 0;

  const timeMs = time.getTime();

  for (const state of truckStates) {
    const onJobMs = new Date(state.onJobTime).getTime();


    const endPourMs = state.washTime
      ? new Date(state.washTime).getTime()
      : state.endUnloadTime
        ? new Date(state.endUnloadTime).getTime()
        : state.toPlantTime
          ? new Date(state.toPlantTime).getTime()
          : null;


    const departureMs = endPourMs ?? Infinity;



    if (timeMs < onJobMs || timeMs >= departureMs) {
      continue;
    }

    if (state.unloadTime) {
      const unloadMs = new Date(state.unloadTime).getTime();
      if (timeMs < unloadMs) {

        waiting++;
      } else {

        pouring++;
      }
    } else {

      waiting++;
    }
  }

  return { waiting, pouring };
}

function generateTrucksOnJobData(truckStates: TruckState[]): ChartDataPoint[] {
  if (truckStates.length === 0) return [];


  const eventTimesMs: number[] = [];

  for (const state of truckStates) {

    eventTimesMs.push(new Date(state.onJobTime).getTime());


    if (state.unloadTime) {
      eventTimesMs.push(new Date(state.unloadTime).getTime());
    }


    const endPour = state.washTime || state.endUnloadTime || state.toPlantTime;
    if (endPour) {
      eventTimesMs.push(new Date(endPour).getTime());
    }
  }


  const uniqueEvents = [...new Set(eventTimesMs)].sort((a, b) => a - b);
  if (uniqueEvents.length === 0) return [];


  const dataPoints = new Map<number, { waiting: number; pouring: number }>();


  const firstEventMs = uniqueEvents[0];
  const firstState = calculateTrucksOnJob(new Date(firstEventMs), truckStates);
  dataPoints.set(firstEventMs, {
    waiting: firstState.waiting,
    pouring: firstState.pouring,
  });


  for (let i = 1; i < uniqueEvents.length; i++) {
    const eventMs = uniqueEvents[i];
    const beforeMs = eventMs - 60000;


    if (!dataPoints.has(beforeMs)) {
      const beforeState = calculateTrucksOnJob(new Date(beforeMs), truckStates);
      dataPoints.set(beforeMs, {
        waiting: beforeState.waiting,
        pouring: beforeState.pouring,
      });
    }


    const atState = calculateTrucksOnJob(new Date(eventMs), truckStates);
    dataPoints.set(eventMs, {
      waiting: atState.waiting,
      pouring: atState.pouring,
    });
  }


  const sorted = [...dataPoints.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([timestamp, state]) => ({
    timestamp,
    waiting: state.waiting,
    pouring: state.pouring,
  }));
}

export const TrucksOnJobChart: React.FC<TrucksOnJobChartProps> = ({
  scheduledLoads,
  isDark,
  height = ms(220),
  horizontalPadding = 16,
}) => {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    time: string;
    waiting: number;
    pouring: number;
  } | null>(null);


  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(['waiting', 'pouring'])
  );


  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.5;
  const chartScrollRef = useRef<ScrollViewType>(null);
  const currentScrollX = useRef(0);


  const truckStates = useMemo(() => processTruckStates(scheduledLoads), [scheduledLoads]);
  const chartData = useMemo(() => generateTrucksOnJobData(truckStates), [truckStates]);

  const hasData = chartData.length > 0;

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

  const toggleFilter = (key: string) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {

        if (newSet.size === 1) return prev;
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


  const maxY = useMemo(() => {
    if (!hasData) return 6;

    const showWaiting = selectedFilters.has('waiting');
    const showPouring = selectedFilters.has('pouring');

    let maxValue = 0;

    if (showWaiting && showPouring) {
      maxValue = Math.max(...chartData.map(d => d.waiting + d.pouring), 0);
    } else if (showWaiting) {
      maxValue = Math.max(...chartData.map(d => d.waiting), 0);
    } else if (showPouring) {
      maxValue = Math.max(...chartData.map(d => d.pouring), 0);
    }


    const roundedUp = Math.ceil(maxValue / 2) * 2 + 2;
    return Math.max(roundedUp, 6);
  }, [chartData, hasData, selectedFilters]);


  const yAxisValues = useMemo(() => {
    const values: number[] = [];
    for (let i = maxY; i >= 0; i -= 2) {
      values.push(i);
    }
    return values;
  }, [maxY]);


  const xAxisConfig = useMemo(() => {
    if (!hasData || chartData.length === 0) {
      return { startMs: Date.now(), endMs: Date.now() + 3600000, tickInterval: 30 };
    }

    const firstTime = chartData[0].timestamp;
    const lastTime = chartData[chartData.length - 1].timestamp;


    const PADDING_MS = 30 * 60 * 1000;
    const startMs = firstTime - PADDING_MS;
    const endMs = lastTime + PADDING_MS;


    const durationHours = (endMs - startMs) / (60 * 60 * 1000);
    let tickInterval: number;
    if (durationHours <= 4) {
      tickInterval = 15;
    } else if (durationHours <= 8) {
      tickInterval = 30;
    } else {
      tickInterval = 60;
    }

    return { startMs, endMs, tickInterval };
  }, [chartData, hasData]);


  const getX = (timestamp: number): number => {
    const { startMs, endMs } = xAxisConfig;
    const totalRange = endMs - startMs;

    if (totalRange === 0) {
      return chartPadding.left + (zoomedChartWidth - chartPadding.left - chartPadding.right) / 2;
    }

    const position = (timestamp - startMs) / totalRange;
    const availableWidth = zoomedChartWidth - chartPadding.left - chartPadding.right;
    return chartPadding.left + position * availableWidth;
  };

  const getY = (value: number): number => {
    return chartPadding.top + chartAreaHeight - (value / maxY) * chartAreaHeight;
  };


  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const mins = date.getMinutes();
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };


  const xAxisLabels = useMemo(() => {
    const { startMs, endMs, tickInterval } = xAxisConfig;
    const labels: Array<{ timestamp: number; display: string; position: number }> = [];

    for (let ms = startMs; ms <= endMs; ms += tickInterval * 60 * 1000) {
      const position = (ms - startMs) / (endMs - startMs);
      labels.push({
        timestamp: ms,
        display: formatTime(ms),
        position,
      });
    }

    return labels;
  }, [xAxisConfig]);


  const createWaitingAreaPath = (): string => {
    if (!hasData || chartData.length === 0) return '';
    if (!selectedFilters.has('waiting')) return '';

    const n = chartData.length;
    const baseY = getY(0);


    const topEdge: Array<{ x: number; y: number }> = [];
    topEdge.push({ x: getX(chartData[0].timestamp), y: getY(chartData[0].waiting) });

    for (let i = 1; i < n; i++) {

      topEdge.push({ x: getX(chartData[i].timestamp), y: getY(chartData[i - 1].waiting) });

      topEdge.push({ x: getX(chartData[i].timestamp), y: getY(chartData[i].waiting) });
    }

    let path = `M ${getX(chartData[0].timestamp)} ${baseY}`;
    path += ` L ${topEdge[0].x} ${topEdge[0].y}`;

    for (let i = 1; i < topEdge.length; i++) {
      path += ` L ${topEdge[i].x} ${topEdge[i].y}`;
    }

    path += ` L ${getX(chartData[n - 1].timestamp)} ${baseY}`;
    path += ' Z';

    return path;
  };


  const createPouringAreaPath = (): string => {
    if (!hasData || chartData.length === 0) return '';
    if (!selectedFilters.has('pouring')) return '';

    const waitingActive = selectedFilters.has('waiting');
    const getBaseValue = (point: ChartDataPoint) => waitingActive ? point.waiting : 0;
    const getTopValue = (point: ChartDataPoint) => getBaseValue(point) + point.pouring;

    const n = chartData.length;


    const topEdge: Array<{ x: number; y: number }> = [];
    topEdge.push({ x: getX(chartData[0].timestamp), y: getY(getTopValue(chartData[0])) });

    for (let i = 1; i < n; i++) {
      topEdge.push({ x: getX(chartData[i].timestamp), y: getY(getTopValue(chartData[i - 1])) });
      topEdge.push({ x: getX(chartData[i].timestamp), y: getY(getTopValue(chartData[i])) });
    }


    const bottomEdge: Array<{ x: number; y: number }> = [];
    bottomEdge.push({ x: getX(chartData[0].timestamp), y: getY(getBaseValue(chartData[0])) });

    for (let i = 1; i < n; i++) {
      bottomEdge.push({ x: getX(chartData[i].timestamp), y: getY(getBaseValue(chartData[i - 1])) });
      bottomEdge.push({ x: getX(chartData[i].timestamp), y: getY(getBaseValue(chartData[i])) });
    }

    let path = `M ${bottomEdge[0].x} ${bottomEdge[0].y}`;
    path += ` L ${topEdge[0].x} ${topEdge[0].y}`;

    for (let i = 1; i < topEdge.length; i++) {
      path += ` L ${topEdge[i].x} ${topEdge[i].y}`;
    }

    path += ` L ${bottomEdge[bottomEdge.length - 1].x} ${bottomEdge[bottomEdge.length - 1].y}`;

    for (let i = bottomEdge.length - 2; i >= 0; i--) {
      path += ` L ${bottomEdge[i].x} ${bottomEdge[i].y}`;
    }

    path += ' Z';
    return path;
  };

  const getXFromPosition = (position: number): number => {
    const availableWidth = zoomedChartWidth - chartPadding.left - chartPadding.right;
    return chartPadding.left + position * availableWidth;
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            {t('orders.trucksOnJob')}
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
                    y={y}
                    fontSize={ms(11)}
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
                      fillOpacity={0.85}
                    />
                  )}

                  {hasData && (
                    <Path
                      d={createPouringAreaPath()}
                      fill={COLORS.pouring}
                      fillOpacity={0.85}
                    />
                  )}

                  {hasData && chartData.map((point, index) => {
                    const x = getX(point.timestamp);
                    const topY = getY(point.waiting + point.pouring);
                    return (
                      <G
                        key={`touch-${index}`}
                        onPress={() => {
                          setTooltip({
                            x,
                            y: topY,
                            time: formatTime(point.timestamp),
                            waiting: point.waiting,
                            pouring: point.pouring,
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

                  {xAxisLabels.map((label, idx) => {
                    const x = getXFromPosition(label.position);
                    return (
                      <SvgText
                        key={`x-${idx}-${label.display}`}
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
                      <Text style={styles.tooltipText}>{t('charts.waiting')}: {tooltip.waiting}</Text>
                    </View>
                    <View style={styles.tooltipRow}>
                      <View style={[styles.tooltipDot, { backgroundColor: COLORS.pouring }]} />
                      <Text style={styles.tooltipText}>{t('charts.pouring')}: {tooltip.pouring}</Text>
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
          <Text style={[styles.swipeText, { color: themeColors.text.hint }]}>{t('charts.swipeToViewMore')}</Text>
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
              borderColor: selectedFilters.has('waiting') ? COLORS.waiting : (isDark ? themeColors.border : colors.grey[15]),
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
            {t('charts.waiting')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.legendButton,
            {
              backgroundColor: selectedFilters.has('pouring')
                ? isDark ? themeColors.surface : colors.grey[5]
                : 'transparent',
              borderColor: selectedFilters.has('pouring') ? COLORS.pouring : (isDark ? themeColors.border : colors.grey[15]),
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
            {t('charts.pouring')}
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
