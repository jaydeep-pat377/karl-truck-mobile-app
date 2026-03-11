import React, { useMemo, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { ScrollView as ScrollViewType } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Svg, { Line, Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale as ms } from 'react-native-size-matters';
import { ScheduledLoadItem } from './TrucksOnJobChart';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

const CHART_COLORS = {
  waiting: '#434348',
  pouring: '#90ed7d',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface TrucksOnJobWebViewProps {
  scheduledLoads: ScheduledLoadItem[];
  isDark: boolean;
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

function parseTimeString(timeStr: string | null | undefined, referenceDate?: Date): Date | null {
  if (!timeStr) return null;


  const isoDate = new Date(timeStr);
  if (!isNaN(isoDate.getTime()) && timeStr.includes('T')) {
    return isoDate;
  }


  if (!isNaN(isoDate.getTime()) && timeStr.includes('-')) {
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

function generateTrucksOnJobData(truckStates: TruckState[]): {
  waitingData: [number, number][];
  pouringData: [number, number][];
} {
  const emptyResult = {
    waitingData: [] as [number, number][],
    pouringData: [] as [number, number][],
  };

  if (truckStates.length === 0) return emptyResult;

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
  if (uniqueEvents.length === 0) return emptyResult;

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
  const waitingData: [number, number][] = sorted.map(([ts, s]) => [ts, s.waiting]);
  const pouringData: [number, number][] = sorted.map(([ts, s]) => [ts, s.pouring]);

  return { waitingData, pouringData };
}

function generateHighchartsHTML(
  waitingData: [number, number][],
  pouringData: [number, number][],
  isDark: boolean,
  chartHeight: number,
  chartWidth: number,
  zoomLevel: number,
  visibleSeries: { waiting: boolean; pouring: boolean },
  maxYValue: number
): string {
  const backgroundColor = isDark ? '#323232' : '#ffffff';
  const textColor = isDark ? '#e5e7eb' : '#333333';
  const gridColor = isDark ? '#374151' : '#e6e6e6';


  let xMin: number;
  let xMax: number;

  const allTimestamps = [
    ...waitingData.map(d => d[0]),
    ...pouringData.map(d => d[0])
  ];

  if (allTimestamps.length > 0) {
    const minTime = Math.min(...allTimestamps);
    const maxTime = Math.max(...allTimestamps);


    const startDate = new Date(minTime);
    startDate.setMinutes(0, 0, 0);
    xMin = startDate.getTime();


    const endDate = new Date(maxTime);
    endDate.setMinutes(0, 0, 0);
    endDate.setHours(endDate.getHours() + 1);
    xMax = endDate.getTime();
  } else {

    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(startDate.getHours() - 2);
    startDate.setMinutes(0, 0, 0);
    xMin = startDate.getTime();

    const endDate = new Date(now);
    endDate.setHours(endDate.getHours() + 2);
    endDate.setMinutes(0, 0, 0);
    xMax = endDate.getTime();
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${chartWidth}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${chartWidth}px; height: 100%; overflow: hidden; background-color: ${backgroundColor}; }
    #container { width: ${chartWidth}px; height: ${chartHeight}px; }
    #status { padding: 10px; font-family: -apple-system, sans-serif; font-size: 12px; color: ${textColor}; text-align: center; }
  </style>
</head>
<body>
  <div id="status">Loading Highcharts...</div>
  <div id="container"></div>
  <script>
    var statusEl = document.getElementById('status');
    function setStatus(msg) { statusEl.textContent = msg; }
    function hideStatus() { statusEl.style.display = 'none'; }

    function sendMessage(type, data) {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
        }
      } catch(e) {}
    }

    var waitingData = ${JSON.stringify(waitingData)};
    var pouringData = ${JSON.stringify(pouringData)};
    var chartHeight = ${chartHeight};
    var xMin = ${xMin};
    var xMax = ${xMax};

    setStatus('Data loaded: ' + waitingData.length + ' waiting, ' + pouringData.length + ' pouring');

    var cdnUrls = [
      'https://cdn.jsdelivr.net/npm/highcharts@11/highcharts.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/highcharts/11.2.0/highcharts.min.js',
      'https://code.highcharts.com/highcharts.js'
    ];
    var currentCdn = 0;

    function tryNextCdn() {
      if (currentCdn >= cdnUrls.length) {
        setStatus('Failed to load chart library from all CDNs');
        sendMessage('error', 'All CDNs failed');
        return;
      }

      var url = cdnUrls[currentCdn];
      setStatus('Loading from CDN ' + (currentCdn + 1) + '...');
      sendMessage('debug', 'Trying CDN: ' + url);

      var script = document.createElement('script');
      script.src = url;

      var timeout = setTimeout(function() {
        sendMessage('debug', 'CDN ' + currentCdn + ' timeout');
        currentCdn++;
        tryNextCdn();
      }, 8000);

      script.onload = function() {
        clearTimeout(timeout);
        setStatus('Highcharts loaded, rendering...');
        sendMessage('debug', 'CDN loaded: ' + url);
        initChart();
      };

      script.onerror = function() {
        clearTimeout(timeout);
        sendMessage('debug', 'CDN ' + currentCdn + ' failed');
        currentCdn++;
        tryNextCdn();
      };

      document.head.appendChild(script);
    }

    var chart = null;

    function initChart() {
      try {
        if (typeof Highcharts === 'undefined') {
          setStatus('Error: Highcharts not defined');
          sendMessage('error', 'Highcharts not defined');
          return;
        }

        hideStatus();
        Highcharts.setOptions({ time: { useUTC: false } });

        var xAxisConfig = {
          type: 'datetime',
          min: xMin,
          max: xMax,
          minRange: 60000,
          title: { text: null },
          labels: {
            format: '{value:%H:%M}',
            style: { color: '${textColor}', fontSize: '12px' },
            rotation: -45,
            y: 20
          },
          gridLineColor: '${gridColor}',
          lineColor: '${gridColor}',
          tickColor: '${gridColor}',
          tickLength: 8,
          tickWidth: 1,
          tickPosition: 'outside',
          tickInterval: ${zoomLevel > 1 ? 30 * 60 * 1000 : 60 * 60 * 1000}
        };

        chart = Highcharts.chart('container', {
          chart: {
            type: 'area',
            backgroundColor: '${backgroundColor}',
            width: ${chartWidth},
            height: chartHeight,
            spacingRight: 20,
            spacingLeft: 10,
            spacingTop: 20,
            spacingBottom: 50,
            style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
          },
          colors: ['#434348', '#90ed7d'],
          title: { text: null },
          subtitle: { text: null },
          xAxis: xAxisConfig,
          yAxis: {
            min: 0,
            max: ${maxYValue},
            tickPositions: [0, ${maxYValue / 2}, ${maxYValue}],
            title: { text: '' },
            allowDecimals: false,
            labels: {
              enabled: false
            },
            gridLineColor: '${gridColor}'
          },
          tooltip: {
            shared: true,
            xDateFormat: '%H:%M:%S',
            backgroundColor: '${isDark ? '#374151' : '#ffffff'}',
            borderColor: '${isDark ? '#4b5563' : '#e5e7eb'}',
            style: { color: '${textColor}', fontSize: '12px' }
          },
          legend: { enabled: false },
          credits: { enabled: false },
          plotOptions: {
            area: {
              stacking: 'normal',
              lineWidth: 1,
              fillOpacity: 0.85,
              marker: { enabled: false },
              shadow: false,
              states: { hover: { lineWidth: 1 } },
              threshold: null
            },
            series: { connectNulls: true, animation: false }
          },
          series: [
            { type: 'area', name: 'Waiting', data: waitingData, visible: ${visibleSeries.waiting} },
            { type: 'area', name: 'Pouring', data: pouringData, visible: ${visibleSeries.pouring} }
          ]
        });

        sendMessage('success', 'Chart rendered');
      } catch (e) {
        setStatus('Error: ' + e.message);
        sendMessage('error', 'Chart error: ' + e.message);
      }
    }

    // Listen for messages from React Native to toggle series visibility
    document.addEventListener('message', function(e) {
      handleMessage(e);
    });
    window.addEventListener('message', function(e) {
      handleMessage(e);
    });

    function handleMessage(e) {
      try {
        var message = JSON.parse(e.data);
        if (message.type === 'toggleSeries' && chart) {
          var seriesIndex = message.seriesKey === 'waiting' ? 0 : 1;
          var series = chart.series[seriesIndex];
          if (series) {
            if (message.visible) {
              series.show();
            } else {
              series.hide();
            }
            sendMessage('debug', 'Toggled ' + message.seriesKey + ' to ' + message.visible);
          }
        }
      } catch(err) {
        // Ignore parse errors from other messages
      }
    }

    // Start loading
    tryNextCdn();
  </script>
</body>
</html>
`;
}

export const TrucksOnJobWebView: React.FC<TrucksOnJobWebViewProps> = ({
  scheduledLoads,
  isDark,
}) => {

  const cardHeight = (SCREEN_HEIGHT * 0.22) + ms(150);
  const themeColors = isDark ? colors.dark : colors.light;
  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollViewType>(null);
  const currentScrollX = useRef(0);


  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.5;


  const [visibleSeries, setVisibleSeries] = useState<{ waiting: boolean; pouring: boolean }>({
    waiting: true,
    pouring: true,
  });

  const truckStates = useMemo(() => processTruckStates(scheduledLoads), [scheduledLoads]);
  const { waitingData, pouringData } = useMemo(
    () => generateTrucksOnJobData(truckStates),
    [truckStates]
  );


  const horizontalPadding = ms(16);
  const yAxisWidth = ms(35);
  const baseChartWidth = SCREEN_WIDTH - horizontalPadding * 2 - yAxisWidth;

  const chartHeight = SCREEN_HEIGHT * 0.25;
  const zoomedChartWidth = baseChartWidth * zoomLevel;




  const maxYValue = useMemo(() => {
    if (waitingData.length === 0 && pouringData.length === 0) return 10;


    const totalsMap = new Map<number, number>();


    if (visibleSeries.waiting) {
      waitingData.forEach(([timestamp, value]) => {
        totalsMap.set(timestamp, (totalsMap.get(timestamp) || 0) + value);
      });
    }


    if (visibleSeries.pouring) {
      pouringData.forEach(([timestamp, value]) => {
        totalsMap.set(timestamp, (totalsMap.get(timestamp) || 0) + value);
      });
    }


    if (totalsMap.size === 0) return 10;


    const maxTotal = Math.max(...Array.from(totalsMap.values()));

    if (maxTotal === 0) return 10;


    const rounded = Math.ceil(maxTotal / 2) * 2;
    return Math.max(rounded, 2);
  }, [waitingData, pouringData, visibleSeries]);

  const htmlContent = useMemo(
    () => generateHighchartsHTML(waitingData, pouringData, isDark, chartHeight, zoomedChartWidth, zoomLevel, visibleSeries, maxYValue),
    [waitingData, pouringData, isDark, chartHeight, zoomedChartWidth, zoomLevel, visibleSeries, maxYValue]
  );

  const hasData = waitingData.length > 0 || pouringData.length > 0;


  console.log('[TrucksOnJobWebView] scheduledLoads:', scheduledLoads.length);
  console.log('[TrucksOnJobWebView] truckStates:', truckStates.length);
  console.log('[TrucksOnJobWebView] waitingData:', waitingData.length);
  console.log('[TrucksOnJobWebView] pouringData:', pouringData.length);


  const handleZoomIn = useCallback(() => {
    if (isAtEnd || zoomLevel >= MAX_ZOOM) return;
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, [isAtEnd, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel <= MIN_ZOOM) return;
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
    setZoomLevel(newZoom);
    setIsAtEnd(false);

    setTimeout(() => {
      const newMaxScroll = baseChartWidth * newZoom - baseChartWidth;
      if (currentScrollX.current > newMaxScroll) {
        scrollViewRef.current?.scrollTo({ x: Math.max(0, newMaxScroll), animated: true });
      }
    }, 50);
  }, [zoomLevel, baseChartWidth]);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setIsAtEnd(false);
    currentScrollX.current = 0;
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }, []);


  const toggleSeriesVisibility = useCallback((seriesKey: 'waiting' | 'pouring') => {
    setVisibleSeries(prev => {
      const newState = { ...prev, [seriesKey]: !prev[seriesKey] };

      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'toggleSeries',
          seriesKey,
          visible: newState[seriesKey],
        }));
      }
      return newState;
    });
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    currentScrollX.current = contentOffset.x;

    const isEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    setIsAtEnd(isEnd);
  }, []);


  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[TrucksOnJobWebView] WebView:', message.type, message.data);
    } catch (e) {
      console.warn('[TrucksOnJobWebView] Message parse error:', e);
    }
  }, []);

  return (
    <View style={[styles.container, { height: cardHeight, backgroundColor: themeColors.card }]}>

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          Trucks on the Job
        </Text>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[styles.zoomButton, { backgroundColor: isDark ? themeColors.surface : colors.grey[10] }]}
            onPress={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
            activeOpacity={0.7}
          >
            <Icon
              name="minus"
              size={ms(18)}
              color={zoomLevel <= MIN_ZOOM ? themeColors.text.disabled : themeColors.text.primary}
            />
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
            <Icon
              name="plus"
              size={ms(18)}
              color={(isAtEnd || zoomLevel >= MAX_ZOOM) ? themeColors.text.disabled : themeColors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>


      <View style={styles.chartContainer}>

        <View style={[styles.yAxis, { width: yAxisWidth, height: chartHeight }]}>
          <Text style={[styles.yAxisLabel, { color: themeColors.text.primary }]}>{maxYValue}</Text>
          <Text style={[styles.yAxisLabel, { color: themeColors.text.primary }]}>{maxYValue / 2}</Text>
          <Text style={[styles.yAxisLabel, { color: themeColors.text.primary }]}>0</Text>
        </View>


        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.scrollView}
          contentContainerStyle={{ width: zoomedChartWidth }}
        >
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={[styles.webview, { width: zoomedChartWidth, height: chartHeight }]}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={false}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            cacheEnabled={true}
            onMessage={handleWebViewMessage}
            onError={(syntheticEvent) => {
              console.warn('[TrucksOnJobWebView] WebView error:', syntheticEvent.nativeEvent);
            }}
            onHttpError={(syntheticEvent) => {
              console.warn('[TrucksOnJobWebView] HTTP error:', syntheticEvent.nativeEvent.statusCode);
            }}
          />
        </ScrollView>
      </View>


      {zoomLevel > 1 && (
        <View style={styles.swipeIndicator}>
          <Icon name="gesture-swipe-horizontal" size={ms(16)} color={themeColors.text.hint} />
          <Text style={[styles.swipeText, { color: themeColors.text.hint }]}>
            Swipe right to view more
          </Text>
        </View>
      )}


      <View style={[styles.legend, { marginTop: zoomLevel > 1 ? 0 : ms(12) }]}>
        <TouchableOpacity
          style={[
            styles.legendPill,
            {
              backgroundColor: isDark ? themeColors.surface : colors.grey[5],
              borderColor: isDark ? themeColors.border : colors.grey[10],
              opacity: visibleSeries.waiting ? 1 : 0.4,
            }
          ]}
          onPress={() => toggleSeriesVisibility('waiting')}
          activeOpacity={0.7}
        >
          <View style={styles.legendLineContainer}>
            <Svg width={ms(32)} height={ms(12)}>
              <Line
                x1={0}
                y1={ms(6)}
                x2={ms(32)}
                y2={ms(6)}
                stroke={CHART_COLORS.waiting}
                strokeWidth={2}
              />
              <Circle cx={ms(16)} cy={ms(6)} r={ms(4)} fill={CHART_COLORS.waiting} />
            </Svg>
          </View>
          <Text style={[styles.legendText, { color: themeColors.text.primary }]}>
            Waiting
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.legendPill,
            {
              backgroundColor: isDark ? themeColors.surface : colors.grey[5],
              borderColor: isDark ? themeColors.border : colors.grey[10],
              opacity: visibleSeries.pouring ? 1 : 0.4,
            }
          ]}
          onPress={() => toggleSeriesVisibility('pouring')}
          activeOpacity={0.7}
        >
          <View style={styles.legendLineContainer}>
            <Svg width={ms(32)} height={ms(12)}>
              <Line
                x1={0}
                y1={ms(6)}
                x2={ms(32)}
                y2={ms(6)}
                stroke={CHART_COLORS.pouring}
                strokeWidth={2}
              />
              <Circle cx={ms(16)} cy={ms(6)} r={ms(4)} fill={CHART_COLORS.pouring} />
            </Svg>
          </View>
          <Text style={[styles.legendText, { color: themeColors.text.primary }]}>
            Pouring
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(16),
    overflow: 'hidden',
    marginVertical: ms(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(20),
    paddingVertical: ms(16),
  },
  headerTitle: {
    fontSize: ms(16),
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
  chartContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  yAxis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: ms(4),
    paddingTop: ms(20),
    paddingBottom: ms(50),
  },
  yAxisLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  scrollView: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    marginBottom: ms(12),
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
    marginTop: ms(6),
    marginBottom: ms(0),
    gap: ms(4),
  },
  swipeText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
    paddingBottom: ms(10)
  },
  emptyContainer: {
    padding: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ms(150),
  },
  title: {
    fontSize: ms(15),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(8),
  },
  emptyText: {
    fontSize: ms(13),
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  debugText: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    marginTop: ms(8),
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default TrucksOnJobWebView;
