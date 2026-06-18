/**
 * Ordered / Delivered / Poured chart — WebView edition (fully offline).
 *
 * Architecture:
 *   • All card chrome (title, CY/Loads toggle, info pills, fixed Y-axis,
 *     +/- zoom controls, legend) is rendered NATIVELY in React Native.
 *   • Only the Recharts bar plot lives inside a WebView — sized, zoomed,
 *     and horizontally scrolled by an RN `<ScrollView>`.
 *   • The Y-axis stays pinned to the left of the horizontal scroll area,
 *     so its labels never move when the user pans or zooms.
 *
 * The layout mirrors `TrucksOnJobWebView.tsx` / `PourSpeedChart.tsx` so
 * the user sees a consistent zoom-control UX across all three
 * performance charts.
 *
 * Data pipeline:
 *   1. If `orderCode` + `orderDate` + `orderId` props are provided, we
 *      fetch the raw tickets + schedules DIRECTLY from Supabase
 *      (`odpSupabaseFetcher`) — same queries the web runs, guaranteed
 *      byte-identical input.
 *   2. Otherwise we fall back to `data.raw_for_reducer` from the backend
 *      scraper API.
 *   3. `runWebReducer` (src/utils/odpWebReducer.ts) runs on the raw
 *      data. It's the TypeScript port of the web's HourlyODPChart
 *      odpData useMemo (performance-charts.tsx:1504-1932) — line-for-line
 *      equivalent, so the computed buckets match the web exactly.
 *   4. `computeWebYMax` (same file) produces the Y-axis ceiling matching
 *      the web yAxisDomain useMemo (performance-charts.tsx:1949-1997).
 *   5. Buckets + yMax are injected into the WebView HTML as JSON. The
 *      HTML renders just the Recharts `BarChart` with the exact same
 *      defs, custom shapes, custom labels, Customized X-axis, and
 *      Tooltip the web uses.
 *   6. Recharts 2.15.4, React 18.3.1, PropTypes 15.8.1 are bundled
 *      locally in `src/assets/odpVendor/*.ts` (as JSON-escaped UMD
 *      strings) so the WebView has ZERO network dependency.
 *
 * Logic / data / calculations are UNCHANGED from the previous working
 * version — only the layout moved out of the WebView into RN.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { ScrollView as ScrollViewType } from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Text as SvgText, Line as SvgLine } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale as ms } from 'react-native-size-matters';
import type { ODPGraphData, ODPRawForReducer } from '../../types/ticket';
import { fetchOdpRawFromSupabase } from '../../services/odpSupabaseFetcher';
import {
  runWebReducer,
  computeWebYMax,
  type WebReducerBucket,
} from '../../utils/odpWebReducer';
import { colors } from '../../theme/colors';
import { getVolumeUnit } from '../../utils/units';
import { fontFamily } from '../../theme/typography';

// Bundled React + Recharts UMD builds (see src/assets/odpVendor/*.ts).
// Inlining them removes every runtime network dependency for the chart —
// no unpkg / jsdelivr / CDN required, works fully offline. Same exact
// library versions the web frontend uses (React 18.3.1, Recharts 2.15.4).
import REACT_UMD from '../../assets/odpVendor/reactUmd';
import REACT_DOM_UMD from '../../assets/odpVendor/reactDomUmd';
import PROP_TYPES_UMD from '../../assets/odpVendor/propTypesUmd';
import RECHARTS_UMD from '../../assets/odpVendor/rechartsUmd';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ---------------------------------------------------------------------------
// Layout constants — mirror the web chart's Recharts margins so the RN-side
// FixedYAxis tick labels line up pixel-perfect with the WebView gridlines.
// ---------------------------------------------------------------------------
// These match `margin={{top:20, right:30, bottom:20, left:5}}` from the
// web's BarChart (performance-charts.tsx:2085). The X-axis labels are
// drawn inside that bottom 20px band + the Customized boundary labels add
// ~14px extra below the plot.
const CHART_PAD_TOP = 20;
const CHART_PAD_BOTTOM = 40; // 20 chart margin + 20 X-axis label area
const CHART_HEIGHT = 280;
const Y_AXIS_WIDTH = ms(44);

// Zoom bounds — match TrucksOnJobWebView / PourSpeedChart so every
// performance chart has identical zoom UX.
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

// ---------------------------------------------------------------------------
// Colors — must match the web's HourlyODPChart
// (performance-charts.tsx:2163-2180 + Bar fills).
// ---------------------------------------------------------------------------
const COLOR_ORDERED = '#3b82f6';
const COLOR_DELIVERED = '#1f2937';
const COLOR_POURED = '#84cc16';
const COLOR_CARRYOVER_BG = '#d1d5db';
const COLOR_CARRYOVER_STROKE = '#6b7280';

type ViewMode = 'cy' | 'loads';

// ---------------------------------------------------------------------------
// computeXAxisDomainFromRaw — derives the xAxisDomain directly from the
// Supabase-fetched raw data, mirroring the web's pourSpeedXAxisDomain
// computation (performance-charts.tsx:2938-2983).
//
// Why: The parent's xAxisDomain prop is computed from the backend API's
// pour_speed data, which may be stale for in-progress orders (cached up
// to 2 min via React Query staleTime). Meanwhile the ODP raw data is
// fetched fresh from Supabase. If new trucks arrived/poured after the
// API call, the API-derived domain won't extend far enough and the
// reducer will silently drop the latest buckets. Computing the domain
// from the same raw data the reducer consumes eliminates this mismatch.
// ---------------------------------------------------------------------------
function computeXAxisDomainFromRaw(
  raw: ODPRawForReducer,
): [number, number] | undefined {
  // Find primary mix schedule — same traversal as the reducer
  let startTimeStr: string | null = null;
  let numberOfLoads = 0;
  let truckSpaceMin = 0;

  for (const psi of raw.productScheduleItems || []) {
    if (psi.is_mix && psi.schedules && psi.schedules.length) {
      const sched = psi.schedules[0];
      startTimeStr = sched.start_time || null;
      numberOfLoads = sched.number_of_loads || 0;
      truckSpaceMin = sched.truck_space || 0;
      break;
    }
  }

  if (!startTimeStr) return undefined;

  const startDate = new Date(startTimeStr);
  if (isNaN(startDate.getTime())) return undefined;

  const firstScheduledTime = startDate.getTime();
  // Last scheduled load time = start + (nLoads - 1) * truckSpace
  const lastScheduledTime =
    numberOfLoads > 1 && truckSpaceMin > 0
      ? firstScheduledTime +
        (numberOfLoads - 1) * truckSpaceMin * 60 * 1000
      : firstScheduledTime;

  // Scan tickets for earliest/latest delivered and poured times
  let earliestDeliveredTime = firstScheduledTime;
  let latestDeliveredTime = lastScheduledTime;
  let latestPouredTime = lastScheduledTime;
  let hasDelivered = false;

  for (const t of raw.tickets || []) {
    if (t.remove_reason_code && String(t.remove_reason_code).trim() !== '') {
      continue;
    }
    if (t.on_job_time) {
      const d = new Date(t.on_job_time).getTime();
      if (!isNaN(d)) {
        if (!hasDelivered) {
          earliestDeliveredTime = d;
          latestDeliveredTime = d;
          hasDelivered = true;
        } else {
          if (d < earliestDeliveredTime) earliestDeliveredTime = d;
          if (d > latestDeliveredTime) latestDeliveredTime = d;
        }
      }
    }
    const pourTimeStr = t.wash_time || t.to_plant_time;
    if (pourTimeStr) {
      const p = new Date(pourTimeStr).getTime();
      if (!isNaN(p) && p > latestPouredTime) {
        latestPouredTime = p;
      }
    }
  }

  // Floor start to hour, ceil end to next hour (matches web)
  const rawDomainStart = Math.min(firstScheduledTime, earliestDeliveredTime);
  const domainStartDate = new Date(rawDomainStart);
  domainStartDate.setUTCMinutes(0, 0, 0);
  const domainStart = domainStartDate.getTime();

  const rawDomainEnd = Math.max(
    lastScheduledTime,
    latestDeliveredTime,
    latestPouredTime,
  );
  const domainEndDate = new Date(rawDomainEnd);
  domainEndDate.setUTCMinutes(0, 0, 0);
  domainEndDate.setUTCHours(domainEndDate.getUTCHours() + 1);
  const domainEnd = domainEndDate.getTime();

  return [domainStart, domainEnd];
}

export interface ODPChartWebViewProps {
  data?: ODPGraphData | null;
  isDark: boolean;
  /**
   * When `orderCode` + `orderDate` + `orderId` are provided, the chart
   * fetches its raw input (tickets + product schedules) DIRECTLY from
   * Supabase instead of using the scraper API's `raw_for_reducer`
   * payload. This guarantees the mobile sees byte-identical data to
   * what the web reads from Supabase, bypassing any possible backend
   * SQL drift. See `src/services/odpSupabaseFetcher.ts`.
   *
   * If any of these props are missing the chart falls back to
   * `data.raw_for_reducer` (backend-relayed) — same as before.
   */
  orderCode?: string;
  orderDate?: string;
  orderId?: number | string;
  /**
   * Shared x-axis domain from the Pour Speed chart (epoch-ms tuple).
   * When provided the reducer floors startMinFromMidnight to the domain
   * start hour — matching the web's HourlyODPChart xAxisDomain prop.
   */
  xAxisDomain?: [number, number];
}

// ---------------------------------------------------------------------------
// Shape of each bucket the WebView renders. This is the camelCase payload
// the web source's custom Bar shapes and labels expect
// (performance-charts.tsx:2183-2327).
// ---------------------------------------------------------------------------
interface ChartBucket {
  h: number;
  label: string;
  ordered: number;
  orderedSolid: number;
  orderedStriped: number;
  orderedCount: number;
  orderedCountSolid: number;
  orderedCountStriped: number;
  delivered: number;
  deliveredSolid: number;
  deliveredCarryIn: number;
  deliveredCarryOut: number;
  deliveredCount: number;
  deliveredCountSolid: number;
  deliveredCountCarryIn: number;
  deliveredCountCarryOut: number;
  poured: number;
  pouredCount: number;
}

function toChartBucket(b: WebReducerBucket): ChartBucket {
  return {
    h: b.hour_index,
    label: b.hour_label,
    ordered: b.ordered,
    orderedSolid: b.ordered_solid,
    orderedStriped: b.ordered_striped,
    orderedCount: b.ordered_loads,
    orderedCountSolid: b.ordered_loads_solid,
    orderedCountStriped: b.ordered_loads_striped,
    delivered: b.delivered,
    deliveredSolid: b.delivered_solid,
    deliveredCarryIn: b.delivered_carry_in,
    deliveredCarryOut: b.delivered_carry_out,
    deliveredCount: b.delivered_loads,
    deliveredCountSolid: b.delivered_loads,
    deliveredCountCarryIn: 0,
    deliveredCountCarryOut: 0,
    poured: b.poured,
    pouredCount: b.poured_loads,
  };
}

// ===========================================================================
// Main component
// ===========================================================================
export const ODPChartWebView: React.FC<ODPChartWebViewProps> = ({
  data,
  isDark,
  orderCode,
  orderDate,
  orderId,
  xAxisDomain,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  // ----- Direct Supabase fetch (preferred when order identifiers are
  //       passed). Guarantees byte-identical input to the web reducer.
  const [supabaseRaw, setSupabaseRaw] = useState<ODPRawForReducer | null>(null);
  const [supabaseFetched, setSupabaseFetched] = useState<boolean>(false);
  const canUseDirectFetch = !!(orderCode && orderDate && orderId);

  // Re-fetch from Supabase when the parent's API data refreshes (e.g.
  // user pulls to refresh). Without this, the Supabase data is fetched
  // once and never updated — for in-progress orders, this causes the
  // chart to show stale values while the web (with realtime subscriptions)
  // shows the latest data.
  const prevDataRef = useRef(data);
  const [fetchKey, setFetchKey] = useState(0);
  useEffect(() => {
    if (data && data !== prevDataRef.current && supabaseFetched) {
      prevDataRef.current = data;
      setFetchKey((k) => k + 1);
    }
  }, [data, supabaseFetched]);

  useEffect(() => {
    if (!canUseDirectFetch) {
      setSupabaseRaw(null);
      setSupabaseFetched(false);
      return;
    }
    let cancelled = false;
    setSupabaseFetched(false);
    fetchOdpRawFromSupabase(orderCode!, orderDate!, orderId!)
      .then((raw) => {
        if (cancelled) return;
        setSupabaseRaw(raw);
        setSupabaseFetched(true);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn(
          '[ODPChartWebView] Direct Supabase fetch failed, falling back to backend raw_for_reducer:',
          err instanceof Error ? err.message : String(err),
        );
        setSupabaseRaw(null);
        setSupabaseFetched(true);
      });
    return () => {
      cancelled = true;
    };
    // fetchKey changes when the parent API data refreshes (pull-to-refresh),
    // triggering a re-fetch from Supabase so the chart shows fresh data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseDirectFetch, orderCode, orderDate, orderId, fetchKey]);

  // ----- Effective raw data: prefer Supabase, fall back to backend. -----
  const effectiveRaw: ODPRawForReducer | null = useMemo(() => {
    if (canUseDirectFetch && supabaseFetched) {
      return supabaseRaw ?? data?.raw_for_reducer ?? null;
    }
    return data?.raw_for_reducer ?? null;
  }, [canUseDirectFetch, supabaseFetched, supabaseRaw, data?.raw_for_reducer]);

  // ----- Effective xAxisDomain: when we have fresh Supabase data,
  //       compute domain from it and merge with the parent's API-derived
  //       domain, taking the WIDER of the two. This ensures in-progress
  //       orders always show the latest buckets (Supabase may have newer
  //       tickets than the API's pour_speed snapshot). -----
  const effectiveXAxisDomain = useMemo<
    [number, number] | undefined
  >(() => {
    if (canUseDirectFetch && supabaseFetched && supabaseRaw) {
      const selfDomain = computeXAxisDomainFromRaw(supabaseRaw);
      if (selfDomain && xAxisDomain) {
        // Take the wider of the two domains so no bucket is dropped
        return [
          Math.min(selfDomain[0], xAxisDomain[0]),
          Math.max(selfDomain[1], xAxisDomain[1]),
        ];
      }
      return selfDomain ?? xAxisDomain;
    }
    return xAxisDomain;
  }, [canUseDirectFetch, supabaseFetched, supabaseRaw, xAxisDomain]);

  // ----- Run the reducer on RN side (byte-for-byte web port). -----
  // This produces `WebReducerBucket[]` with snake_case field names.
  // We keep it in useMemo so it only recomputes when raw data changes.
  const reducerBuckets = useMemo<WebReducerBucket[]>(() => {
    if (!effectiveRaw) return [];
    return runWebReducer(effectiveRaw, effectiveXAxisDomain);
  }, [effectiveRaw, effectiveXAxisDomain]);

  // ----- View mode (CY / Loads) -----
  const [viewMode, setViewMode] = useState<ViewMode>('cy');

  // ----- Zoom state (mirrors TrucksOnJobWebView). -----
  const [zoomLevel, setZoomLevel] = useState<number>(MIN_ZOOM);
  const [isAtEnd, setIsAtEnd] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollViewType>(null);
  const currentScrollX = useRef<number>(0);

  // ----- Y-axis domain (matches web yAxisDomain useMemo). -----
  const yMax = useMemo<number>(() => {
    if (!effectiveRaw || reducerBuckets.length === 0) {
      return viewMode === 'cy' ? 50 : 10;
    }
    return computeWebYMax(reducerBuckets, effectiveRaw, viewMode);
  }, [reducerBuckets, effectiveRaw, viewMode]);

  // ----- Bucket payload for the WebView (camelCase, matches web). -----
  const chartBuckets = useMemo<ChartBucket[]>(
    () => reducerBuckets.map(toChartBucket),
    [reducerBuckets],
  );

  const hasCarryover = useMemo<boolean>(
    () =>
      viewMode === 'cy' &&
      chartBuckets.some((b) => (b.deliveredCarryIn || 0) > 0),
    [chartBuckets, viewMode],
  );

  // ----- Chart layout math. The container now sits INSIDE the parent
  //       screen's 16 px horizontal padding (outer breathing room), so
  //       the usable card width is SCREEN_WIDTH minus that gutter on
  //       each side. The fixed Y-axis column (Y_AXIS_WIDTH) lives
  //       OUTSIDE the ScrollView, and the remaining horizontal room
  //       goes to the WebView plot area. `zoomedChartWidth` scales
  //       linearly with `zoomLevel`.
  const PARENT_CONTENT_PADDING = 16; // OrderDetailsScreen.contentContainer
  const baseChartWidth =
    SCREEN_WIDTH - PARENT_CONTENT_PADDING * 2 - Y_AXIS_WIDTH;
  const zoomedChartWidth = baseChartWidth * zoomLevel;

  // ----- HTML content: ONLY the Recharts plot body. -----
  const htmlContent = useMemo(() => {
    return buildOdpHtml({
      buckets: chartBuckets,
      yMax,
      viewMode,
      isDark,
      width: zoomedChartWidth,
      height: CHART_HEIGHT,
    });
  }, [chartBuckets, yMax, viewMode, isDark, zoomedChartWidth]);

  // ----- Zoom handlers (mirror TrucksOnJobWebView exactly). -----
  const handleZoomIn = useCallback(() => {
    if (isAtEnd || zoomLevel >= MAX_ZOOM) return;
    setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, [isAtEnd, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (zoomLevel <= MIN_ZOOM) return;
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
    setZoomLevel(newZoom);
    setIsAtEnd(false);
    setTimeout(() => {
      const newMaxScroll = baseChartWidth * newZoom - baseChartWidth;
      if (currentScrollX.current > newMaxScroll) {
        scrollViewRef.current?.scrollTo({
          x: Math.max(0, newMaxScroll),
          animated: true,
        });
      }
    }, 50);
  }, [zoomLevel, baseChartWidth]);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(MIN_ZOOM);
    setIsAtEnd(false);
    currentScrollX.current = 0;
    scrollViewRef.current?.scrollTo({ x: 0, animated: true });
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    currentScrollX.current = contentOffset.x;
    const atEnd =
      contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
    setIsAtEnd(atEnd);
  }, []);

  // ----- Match web visibility: hide entirely when no data. -----
  if (!effectiveRaw || chartBuckets.length === 0) {
    return null;
  }

  // ----- Info-pill values (metadata from the first mix schedule).
  // These mirror what the web shows in the chart-card header. Values come
  // from the backend payload so we don't need to introspect the raw
  // Supabase schedule.
  const spacingMin = data?.truck_space ?? 0;
  const rate = data?.schedule_rate ?? 0;
  const scheduledQty = data?.schedule_qty ?? 0;
  const numberOfLoads = data?.number_of_loads ?? 0;
  const loadQty = data?.load_qty ?? 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.card,
        },
      ]}
    >
      {/* -------- HEADER: title only -------- */}
      <View style={styles.header}>
        <Text
          style={[styles.headerTitle, { color: themeColors.text.primary }]}
        >
          Ordered / Delivered / Poured
        </Text>
      </View>

      {/* -------- PILLS: Spacing / Rate / Scheduled / Loads / Load Size.
           Sits directly below the title and above the CY/Loads + zoom
           controls row, giving the chart header a summary → controls →
           chart structure. -------------------------------------------- */}
      <View style={styles.pillsRow}>
        {spacingMin > 0 && (
          <Pill
            isDark={isDark}
            icon="timer-outline"
            iconColor="#3b82f6"
            bgColor="#3b82f615"
            label="Spacing"
            value={`${spacingMin} min`}
          />
        )}
        {rate > 0 && (
          <Pill
            isDark={isDark}
            icon="gauge"
            iconColor="#10b981"
            bgColor="#10b98115"
            label="Rate"
            value={`${rate.toFixed(2)} ${getVolumeUnit()}/HR`}
          />
        )}
        {scheduledQty > 0 && (
          <Pill
            isDark={isDark}
            icon="package-variant"
            iconColor="#a855f7"
            bgColor="#a855f715"
            label="Scheduled"
            value={`${scheduledQty.toFixed(2)} ${getVolumeUnit()}`}
          />
        )}
        {numberOfLoads > 0 && (
          <Pill
            isDark={isDark}
            icon="layers-outline"
            iconColor="#f59e0b"
            bgColor="#f59e0b15"
            label="Loads"
            value={`${numberOfLoads}`}
          />
        )}
        {loadQty > 0 && (
          <Pill
            isDark={isDark}
            icon="cube-outline"
            iconColor="#ef4444"
            bgColor="#ef444415"
            label="Load Size"
            value={`${loadQty.toFixed(2)} ${getVolumeUnit()}`}
          />
        )}
      </View>

      {/* -------- TOP CONTROLS: CY/Loads toggle on the left, zoom
           controls on the right, grouped on a single row directly
           below the title. ------------------------------------------- */}
      <View style={styles.topControls}>
        {/* CY / Loads toggle */}
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: isDark ? colors.grey[85] : colors.grey[10],
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setViewMode('cy')}
            style={[
              styles.toggleButton,
              viewMode === 'cy' && {
                backgroundColor: isDark
                  ? themeColors.card
                  : colors.common.white,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleLabel,
                {
                  color:
                    viewMode === 'cy'
                      ? themeColors.text.primary
                      : themeColors.text.hint,
                  fontFamily:
                    viewMode === 'cy'
                      ? fontFamily.semiBold
                      : fontFamily.medium,
                },
              ]}
            >
              {getVolumeUnit()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('loads')}
            style={[
              styles.toggleButton,
              viewMode === 'loads' && {
                backgroundColor: isDark
                  ? themeColors.card
                  : colors.common.white,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleLabel,
                {
                  color:
                    viewMode === 'loads'
                      ? themeColors.text.primary
                      : themeColors.text.hint,
                  fontFamily:
                    viewMode === 'loads'
                      ? fontFamily.semiBold
                      : fontFamily.medium,
                },
              ]}
            >
              Loads
            </Text>
          </TouchableOpacity>
        </View>

        {/* Zoom controls — same − ⊕ + pattern as Trucks on Job / Pour Speed */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[
              styles.zoomButton,
              {
                backgroundColor: isDark
                  ? themeColors.surface
                  : colors.grey[10],
              },
            ]}
            onPress={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
            activeOpacity={0.7}
          >
            <Icon
              name="minus"
              size={ms(18)}
              color={
                zoomLevel <= MIN_ZOOM
                  ? themeColors.text.disabled
                  : themeColors.text.primary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.zoomButton,
              {
                backgroundColor: isDark
                  ? themeColors.surface
                  : colors.grey[10],
              },
            ]}
            onPress={handleResetZoom}
            activeOpacity={0.7}
          >
            <Icon
              name="magnify-expand"
              size={ms(18)}
              color={themeColors.text.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.zoomButton,
              {
                backgroundColor: isDark
                  ? themeColors.surface
                  : colors.grey[10],
              },
            ]}
            onPress={handleZoomIn}
            disabled={isAtEnd || zoomLevel >= MAX_ZOOM}
            activeOpacity={0.7}
          >
            <Icon
              name="plus"
              size={ms(18)}
              color={
                isAtEnd || zoomLevel >= MAX_ZOOM
                  ? themeColors.text.disabled
                  : themeColors.text.primary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* -------- CHART ROW: fixed Y-axis + scrollable WebView plot -------- */}
      <View style={styles.chartRow}>
        <FixedYAxis
          width={Y_AXIS_WIDTH}
          height={CHART_HEIGHT}
          yMax={yMax}
          viewMode={viewMode}
          isDark={isDark}
        />

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={zoomLevel > MIN_ZOOM}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.scrollView}
          contentContainerStyle={{ width: zoomedChartWidth }}
        >
          <WebView
            source={{ html: htmlContent }}
            style={[
              styles.webview,
              { width: zoomedChartWidth, height: CHART_HEIGHT },
            ]}
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
            automaticallyAdjustContentInsets={false}
          />
        </ScrollView>
      </View>

      {/* Swipe hint when zoomed in (matches other charts). */}
      {zoomLevel > MIN_ZOOM && (
        <View style={styles.swipeIndicator}>
          <Icon
            name="gesture-swipe-horizontal"
            size={ms(16)}
            color={themeColors.text.hint}
          />
          <Text style={[styles.swipeText, { color: themeColors.text.hint }]}>
            Swipe right to view more
          </Text>
        </View>
      )}

      {/* -------- LEGEND: Ordered / Delivered / Poured on one horizontal
           line with equal spacing between items. --------------------- */}
      <View style={styles.legend}>
        <LegendItem color={COLOR_ORDERED} label="Ordered" isDark={isDark} />
        <LegendItem color={COLOR_DELIVERED} label="Delivered" isDark={isDark} />
        <LegendItem color={COLOR_POURED} label="Poured" isDark={isDark} />
        {hasCarryover && (
          <LegendItem
            color={COLOR_CARRYOVER_BG}
            label="Carryover"
            isDark={isDark}
            striped
          />
        )}
      </View>

    </View>
  );
};

// ===========================================================================
// FixedYAxis — native SVG column drawn OUTSIDE the horizontal ScrollView,
// so its labels stay perfectly stationary when the user pans or zooms.
// ===========================================================================
interface FixedYAxisProps {
  width: number;
  height: number;
  yMax: number;
  viewMode: ViewMode;
  isDark: boolean;
}

const FixedYAxis: React.FC<FixedYAxisProps> = ({
  width,
  height,
  yMax,
  viewMode,
  isDark,
}) => {
  const axisText = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  // Plot area math matches the WebView's Recharts margins:
  //   margin={{top:20, right:30, bottom:20, left:5}} with X-axis labels
  //   adding ~20px below the plot.
  const plotTop = CHART_PAD_TOP;
  const plotBottom = height - CHART_PAD_BOTTOM;
  const plotHeight = plotBottom - plotTop;

  const yMaxSafe = Math.max(1, yMax);
  const yFor = (v: number) => plotBottom - (v / yMaxSafe) * plotHeight;

  // Pick 5 evenly spaced ticks for the CY view; 3 for loads.
  const tickCount = viewMode === 'cy' ? 5 : 3;
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push((yMaxSafe / (tickCount - 1)) * i);
  }

  const fmt = (n: number): string => {
    if (n % 1 === 0) return String(Math.round(n));
    return (Math.round(n * 10) / 10).toString();
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Unit label — vertical text on the left, matching the web's
            `YAxis label={{value: "CY", angle: -90, position: "insideLeft"}}`. */}
        <SvgText
          x={12}
          y={plotTop + plotHeight / 2}
          fontSize={12}
          fontWeight="600"
          fill={axisText}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${plotTop + plotHeight / 2})`}
        >
          {viewMode === 'cy' ? getVolumeUnit() : 'Loads'}
        </SvgText>

        {/* Tick labels — numeric, right-aligned to the column edge. */}
        {ticks.map((v, i) => (
          <React.Fragment key={`ytick-${i}`}>
            <SvgText
              x={width - 4}
              y={yFor(v) + 4}
              fontSize={11}
              fill={axisText}
              textAnchor="end"
              fontWeight="500"
            >
              {fmt(v)}
            </SvgText>
            {/* A tiny right-edge gridline spur to align with the
                CartesianGrid inside the WebView. */}
            <SvgLine
              x1={width - 2}
              y1={yFor(v)}
              x2={width}
              y2={yFor(v)}
              stroke={gridColor}
              strokeWidth={1}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

// ===========================================================================
// Pill — native info pill with icon + label + value.
// ===========================================================================
interface PillProps {
  isDark: boolean;
  icon: string;
  iconColor: string;
  bgColor: string;
  label: string;
  value: string;
}

const Pill: React.FC<PillProps> = ({
  isDark,
  icon,
  iconColor,
  bgColor,
  label,
  value,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <Icon name={icon} size={ms(13)} color={iconColor} />
      <Text style={[styles.pillLabel, { color: iconColor }]}>{label}</Text>
      <Text style={[styles.pillValue, { color: themeColors.text.primary }]}>
        {value}
      </Text>
    </View>
  );
};

// ===========================================================================
// LegendItem — native legend swatch + label.
// ===========================================================================
interface LegendItemProps {
  color: string;
  label: string;
  isDark: boolean;
  striped?: boolean;
}

const LegendItem: React.FC<LegendItemProps> = ({
  color,
  label,
  isDark,
  striped,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          {
            backgroundColor: color,
            borderColor: striped ? COLOR_CARRYOVER_STROKE : color,
            opacity: striped ? 0.7 : 1,
          },
        ]}
      />
      <Text style={[styles.legendLabel, { color: themeColors.text.secondary }]}>
        {label}
      </Text>
    </View>
  );
};

// ===========================================================================
// buildOdpHtml — simplified HTML template. Only renders the Recharts bar
// plot. No card chrome, no header, no pills, no toggle, no legend — those
// all live in RN now.
//
// Inputs:
//   - buckets:    camelCase bucket rows (already computed by RN reducer)
//   - yMax:       Y-axis ceiling (already computed by RN)
//   - viewMode:   'cy' | 'loads'
//   - isDark:     theme flag
//   - width:      WebView body width (= zoomedChartWidth)
//   - height:     WebView body height (= CHART_HEIGHT)
// ===========================================================================
interface BuildOdpHtmlArgs {
  buckets: ChartBucket[];
  yMax: number;
  viewMode: ViewMode;
  isDark: boolean;
  width: number;
  height: number;
}

function buildOdpHtml(args: BuildOdpHtmlArgs): string {
  const { buckets, yMax, viewMode, isDark, width, height } = args;

  const bg = isDark ? '#323232' : '#ffffff';
  const textPrimary = isDark ? '#f3f4f6' : '#111827';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const axisText = isDark ? '#9ca3af' : '#6b7280';
  const deliveredLabelFill = isDark ? '#e5e7eb' : '#1f2937';
  const pouredLabelFill = isDark ? '#a3e635' : '#65a30d';

  const bucketsJson = JSON.stringify(buckets).replace(/</g, '\\u003c');

  const vendorScripts =
    '<script>' + REACT_UMD + '</script>' +
    '<script>' + PROP_TYPES_UMD + '</script>' +
    '<script>' + REACT_DOM_UMD + '</script>' +
    '<script>' + RECHARTS_UMD + '</script>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body{
    width:${width}px;
    height:${height}px;
    background:${bg};
    color:${textPrimary};
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    font-size:14px;
    overflow:hidden;
    -webkit-user-select:none;
    user-select:none;
    -webkit-font-smoothing:antialiased;
  }
  #root{width:${width}px;height:${height}px}
  .no-data{
    padding:40px 20px;
    text-align:center;
    color:${textSecondary};
    font-size:12px;
  }
</style>
${vendorScripts}
</head>
<body>
<div id="root"></div>
<script>
(function(){
'use strict';

if (!window.React || !window.ReactDOM || !window.Recharts) {
  var missing = [];
  if (!window.React) missing.push('React');
  if (!window.ReactDOM) missing.push('ReactDOM');
  if (!window.Recharts) missing.push('Recharts');
  document.getElementById('root').innerHTML =
    '<div class="no-data">Chart bundle incomplete (missing: ' + missing.join(', ') + ').</div>';
  return;
}

var e = React.createElement;
var R = window.Recharts;

// ---- Injected chart inputs ----------------------------------------------
var BUCKETS = ${bucketsJson};
var Y_MAX = ${yMax};
var VIEW_MODE = ${JSON.stringify(viewMode)};
var WIDTH = ${width};
var HEIGHT = ${height};

// ---- fmtQty mirrors the web's fmtQty helper. -----------------------------
function fmtQty(v){
  if(!isFinite(v)) return '';
  var r = Math.round(v*100)/100;
  if(r % 1 === 0) return r.toLocaleString('en-US');
  var one = Math.round(r*10)/10;
  if(Math.abs(one - r) < 1e-9){
    return r.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  }
  return r.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ---- Active series keys (CY vs Loads view). ------------------------------
var orderedSolidKey   = VIEW_MODE === 'cy' ? 'orderedSolid'      : 'orderedCountSolid';
var orderedStripedKey = VIEW_MODE === 'cy' ? 'orderedStriped'    : 'orderedCountStriped';
var deliveredCarryInKey = VIEW_MODE === 'cy' ? 'deliveredCarryIn'   : 'deliveredCountCarryIn';
var deliveredSolidKey   = VIEW_MODE === 'cy' ? 'deliveredSolid'     : 'deliveredCountSolid';
var pouredKey           = VIEW_MODE === 'cy' ? 'poured'             : 'pouredCount';

// ---- ODPTooltip — mirrors the web's ODPTooltip
//      (performance-charts.tsx:1362-1475).
function ODPTooltip(props){
  if(!props.active || !props.payload || !props.payload.length) return null;
  var bucket = props.payload[0].payload;
  if(!bucket) return null;
  var rows = [];

  function valueText(cy, count){
    var loadWord = count === 1 ? 'load' : 'loads';
    if(VIEW_MODE === 'loads'){
      return count + ' ' + loadWord + ' · ' + fmtQty(cy) + ' ' + getVolumeUnit();
    }
    return fmtQty(cy) + ' ' + getVolumeUnit() + (count > 0 ? ' (' + count + ' ' + loadWord + ')' : '');
  }

  var deliveredTotal = bucket.deliveredCarryIn + bucket.delivered;

  if(bucket.ordered > 0){
    rows.push({label:'Ordered', color:'#3b82f6', text:valueText(bucket.ordered, bucket.orderedCount), carryIn:0});
  }
  if(deliveredTotal > 0){
    rows.push({label:'Delivered', color:'#1f2937', text:valueText(deliveredTotal, bucket.deliveredCount), carryIn: VIEW_MODE === 'cy' ? bucket.deliveredCarryIn : 0});
  }
  if(bucket.poured > 0){
    rows.push({label:'Poured', color:'#84cc16', text:valueText(bucket.poured, bucket.pouredCount), carryIn:0});
  }
  if(!rows.length) return null;

  return e('div',{
    style:{
      background:'${bg}',
      border:'1px solid ${gridColor}',
      borderRadius:6,
      padding:10,
      fontSize:12,
      minWidth:200,
      boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
      color:'${textPrimary}'
    }
  },
    e('div',{style:{fontWeight:700, fontSize:13, marginBottom:6, paddingBottom:4, borderBottom:'1px solid ${gridColor}'}}, props.label),
    rows.map(function(r,idx){
      return e('div',{key:idx},
        e('div',{style:{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'2px 0'}},
          e('div',{style:{display:'flex', alignItems:'center', gap:8}},
            e('span',{style:{width:12, height:12, borderRadius:2, background:r.color, display:'inline-block'}}),
            e('span',{style:{color:'${textSecondary}'}}, r.label)
          ),
          e('span',{style:{fontWeight:600, color:'${textPrimary}'}}, r.text)
        ),
        r.carryIn > 0
          ? e('div',{style:{marginLeft:20, fontSize:10, color:'${textSecondary}', paddingBottom:2}},
              '↓ ' + fmtQty(r.carryIn) + ' ' + getVolumeUnit() + ' from backlog (poured > delivered)')
          : null
      );
    })
  );
}

// ---- Customized X-axis boundary labels
//      (performance-charts.tsx:2099-2145).
function CustomizedXAxis(props){
  var xAxisMap = props.xAxisMap;
  var yAxisMap = props.yAxisMap;
  if(!xAxisMap || !yAxisMap) return e('g');
  var xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
  var yAxis = yAxisMap[Object.keys(yAxisMap)[0]];
  if(!xAxis || !xAxis.scale || !yAxis) return e('g');
  var bandSize = xAxis.bandSize || 0;
  var axisY = yAxis.y + yAxis.height + 14;

  var children = [];
  for(var i = 0; i < BUCKETS.length; i++){
    (function(i){
      var bucket = BUCKETS[i];
      var bucketX = xAxis.scale(bucket.label);
      if(bucketX === undefined) return;
      // First label sits at x=0 (right next to the RN Y-axis column).
      // Centering it would push half the text into negative x where it gets
      // clipped (e.g. "16:00" rendering as "6:00"). Anchor it to 'start' so
      // the full label sits to the right of the band's left edge.
      var firstAnchor = i === 0 ? 'start' : 'middle';
      var kids = [
        e('text',{
          key:'t'+i,
          x:bucketX,
          y:axisY,
          textAnchor:firstAnchor,
          fontSize:11,
          fill:'${axisText}',
          fontWeight:500
        }, bucket.label),
        e('line',{
          key:'l'+i,
          x1:bucketX,
          y1:yAxis.y + yAxis.height,
          x2:bucketX,
          y2:yAxis.y + yAxis.height + 4,
          stroke:'${gridColor}',
          strokeWidth:1
        })
      ];
      if(i === BUCKETS.length - 1){
        var parts = bucket.label.split(':');
        var totalMin = (parseInt(parts[0],10) || 0) * 60 + (parseInt(parts[1],10) || 0) + 60;
        var nextLabel = (Math.floor(totalMin/60) % 24) + ':' + String(totalMin % 60).padStart(2,'0');
        kids.push(
          e('text',{
            key:'nt',
            x:bucketX + bandSize,
            y:axisY,
            textAnchor:'middle',
            fontSize:11,
            fill:'${axisText}',
            fontWeight:500
          }, nextLabel)
        );
        kids.push(
          e('line',{
            key:'nl',
            x1:bucketX + bandSize,
            y1:yAxis.y + yAxis.height,
            x2:bucketX + bandSize,
            y2:yAxis.y + yAxis.height + 4,
            stroke:'${gridColor}',
            strokeWidth:1
          })
        );
      }
      children.push(e('g',{key:'b-'+i}, kids));
    })(i);
  }
  return e('g', null, children);
}

// ---- Rounded-top rect helper (matches web custom shape paths). ----------
function roundedTopPath(x, y, w, h, r){
  return 'M' + x + ',' + (y + r) +
    ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
    ' L' + (x + w - r) + ',' + y +
    ' Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
    ' L' + (x + w) + ',' + (y + h) +
    ' L' + x + ',' + (y + h) + ' Z';
}

// ---- Custom bar shapes (byte-for-byte ports). ---------------------------
function OrderedSolidShape(props){
  var x = props.x, y = props.y, w = props.width, h = props.height, payload = props.payload;
  if(!h || h <= 0) return e('g');
  var isTop = !payload || payload.orderedStriped <= 0;
  if(isTop) return e('path',{d:roundedTopPath(x,y,w,h,3), fill:'#3b82f6'});
  return e('rect',{x:x, y:y, width:w, height:h, fill:'#3b82f6'});
}
function OrderedStripedShape(props){
  var x = props.x, y = props.y, w = props.width, h = props.height;
  if(!h || h <= 0) return e('g');
  return e('path',{d:roundedTopPath(x,y,w,h,3), fill:'url(#odp-stripe-ordered)'});
}
function DeliveredCarryInShape(props){
  var x = props.x, y = props.y, w = props.width, h = props.height;
  if(!h || h <= 0) return e('g');
  return e('rect',{x:x, y:y, width:w, height:h, fill:'url(#odp-carryover-delivered)', stroke:'#1f2937', strokeWidth:0.5});
}
function DeliveredSolidShape(props){
  var x = props.x, y = props.y, w = props.width, h = props.height;
  if(!h || h <= 0) return e('g');
  return e('path',{d:roundedTopPath(x,y,w,h,3), fill:'#1f2937'});
}

// ---- Custom label content functions. ------------------------------------
function OrderedSolidLabel(props){
  var x = props.x, y = props.y, w = props.width, index = props.index;
  var entry = BUCKETS[index];
  if(!entry || entry.orderedStriped > 0) return null;
  var total = VIEW_MODE === 'cy' ? entry.ordered : entry.orderedCount;
  if(total <= 0) return null;
  return e('text',{
    x:x + w/2, y:y - 5, textAnchor:'middle',
    fontSize:11, fill:'#3b82f6', fontWeight:600
  }, VIEW_MODE === 'cy' ? fmtQty(total) : String(total));
}
function OrderedStripedLabel(props){
  var x = props.x, y = props.y, w = props.width, index = props.index;
  var entry = BUCKETS[index];
  if(!entry || entry.orderedStriped <= 0) return null;
  var total = VIEW_MODE === 'cy'
    ? (entry.orderedSolid + entry.orderedStriped)
    : (entry.orderedCountSolid + entry.orderedCountStriped);
  if(total <= 0) return null;
  return e('text',{
    x:x + w/2, y:y - 5, textAnchor:'middle',
    fontSize:11, fill:'#3b82f6', fontWeight:600
  }, VIEW_MODE === 'cy' ? fmtQty(total) : String(total));
}
function DeliveredLabel(props){
  var x = props.x, y = props.y, w = props.width, index = props.index;
  var entry = BUCKETS[index];
  if(!entry) return null;
  var total = VIEW_MODE === 'cy'
    ? (entry.deliveredCarryIn + entry.delivered)
    : entry.deliveredCount;
  if(total <= 0) return null;
  return e('text',{
    x:x + w/2, y:y - 5, textAnchor:'middle',
    fontSize:11, fill:'${deliveredLabelFill}', fontWeight:600
  }, VIEW_MODE === 'cy' ? fmtQty(total) : String(total));
}

// ---- Main chart render. -------------------------------------------------
function ChartBody(){
  if(!BUCKETS.length){
    return e('div',{className:'no-data'}, 'No data yet for this order.');
  }

  var stripeDefs = e('defs', null,
    e('pattern',{id:'odp-stripe-ordered', patternUnits:'userSpaceOnUse', width:10, height:10},
      e('rect',{width:10, height:10, fill:'#3b82f6', fillOpacity:0.25}),
      e('path',{d:'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2', stroke:'#3b82f6', strokeWidth:3, strokeOpacity:0.6})
    ),
    e('pattern',{id:'odp-carryover-delivered', patternUnits:'userSpaceOnUse', width:10, height:10},
      e('rect',{width:10, height:10, fill:'#d1d5db', fillOpacity:0.5}),
      e('path',{d:'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2', stroke:'#6b7280', strokeWidth:3, strokeOpacity:0.7})
    )
  );

  return e(R.BarChart, {
    width: WIDTH,
    height: HEIGHT,
    data: BUCKETS,
    margin: {top:20, right:30, bottom:20, left:5},
    barGap: 8,
    barCategoryGap: '10%'
  },
    stripeDefs,
    e(R.CartesianGrid, {strokeDasharray:'3 3', vertical:false, stroke:'${gridColor}'}),
    // X-axis: tickless, label-less — Customized draws boundary labels.
    e(R.XAxis, {
      dataKey:'label',
      tick:false,
      tickLine:false,
      axisLine:{stroke:'${gridColor}'}
    }),
    e(R.Customized, { component: CustomizedXAxis }),
    // Y-axis: hidden (labels live in RN column) but scale is used for bars.
    e(R.YAxis, {
      domain:[0, Y_MAX],
      hide:true,
      allowDecimals:false
    }),
    e(R.Tooltip, {
      content: function(p){ return e(ODPTooltip, p); },
      cursor: {fill:'#f3f4f6', fillOpacity:0.5}
    }),
    // Ordered solid
    e(R.Bar, {
      dataKey: orderedSolidKey,
      name:'Ordered Solid',
      stackId:'ordered',
      fill:'#3b82f6',
      isAnimationActive:false,
      shape: OrderedSolidShape,
      label: {content: OrderedSolidLabel}
    }),
    // Ordered striped
    e(R.Bar, {
      dataKey: orderedStripedKey,
      name:'Ordered Striped',
      stackId:'ordered',
      fill:'url(#odp-stripe-ordered)',
      isAnimationActive:false,
      shape: OrderedStripedShape,
      label: {content: OrderedStripedLabel}
    }),
    // Delivered carry-in
    e(R.Bar, {
      dataKey: deliveredCarryInKey,
      name:'Delivered CarryIn',
      stackId:'delivered',
      fill:'url(#odp-carryover-delivered)',
      isAnimationActive:false,
      shape: DeliveredCarryInShape
    }),
    // Delivered solid
    e(R.Bar, {
      dataKey: deliveredSolidKey,
      name:'Delivered',
      stackId:'delivered',
      fill:'#1f2937',
      isAnimationActive:false,
      shape: DeliveredSolidShape,
      label: {content: DeliveredLabel}
    }),
    // Poured
    e(R.Bar, {
      dataKey: pouredKey,
      name:'Poured',
      fill:'#84cc16',
      radius:[3,3,0,0],
      isAnimationActive:false,
      label:{
        position:'top',
        fontSize:11,
        fill:'${pouredLabelFill}',
        fontWeight:600,
        formatter: function(v){
          if(!(v > 0)) return '';
          return VIEW_MODE === 'cy' ? fmtQty(v) : String(v);
        }
      }
    })
  );
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(e(ChartBody));
} catch(err){
  document.getElementById('root').innerHTML =
    '<div class="no-data">Chart render failed: ' + (err && err.message ? err.message : String(err)) + '</div>';
}

})();
</script>
</body>
</html>`;
}

// ===========================================================================
// Styles
// ===========================================================================
const styles = StyleSheet.create({
  // Outer card: borderless, rounded. Horizontal gutter comes from the
  // parent `OrderDetailsScreen.contentContainer` (padding: GRID.md = 16).
  // `marginVertical: ms(8)` is a slightly tighter outer gap than the
  // previous ms(12), giving the graph a more compact vertical footprint
  // while still maintaining readable separation from sibling charts.
  // This also aligns with `PourSpeedChart` and `TrucksOnJobChart` which
  // both use `marginVertical: ms(8)`.
  container: {
    borderRadius: ms(16),
    borderWidth: 0,
    overflow: 'hidden',
    marginVertical: ms(2),
    paddingBottom: ms(12),
  },
  // Header: title only (toggle + zoom moved to the bottom controls row).
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    paddingTop: ms(14),
    paddingBottom: ms(10),
  },
  headerTitle: {
    fontSize: ms(15),
    fontFamily: fontFamily.semiBold,
    flex: 1,
    minWidth: 0,
  },
  // Toggle pill group — rounded, borderless.
  toggle: {
    flexDirection: 'row',
    borderRadius: ms(10),
    borderWidth: 0,
    padding: ms(2),
  },
  toggleButton: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(8),
    borderWidth: 0,
    minWidth: ms(38),
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  // Zoom controls — three round soft buttons.
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  zoomButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(10),
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Pills row — sits directly below the title and above the CY/Loads +
  // zoom controls row. Left-aligned to mirror the title's alignment,
  // with gentle vertical padding to separate it from both the title
  // above and the controls below.
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(14),
    paddingTop: ms(2),
    paddingBottom: ms(10),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(999),
    borderWidth: 0,
    gap: ms(4),
  },
  pillLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  pillValue: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
  },
  // Chart row: Y-axis + horizontally-scrollable WebView. ZERO horizontal
  // padding so the chart fills the card edge-to-edge.
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  scrollView: {
    flexGrow: 0,
  },
  webview: {
    backgroundColor: 'transparent',
  },
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
    marginTop: ms(6),
  },
  swipeText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  // Legend — Ordered / Delivered / Poured in a single horizontal row with
  // equal spacing between items. `space-around` evenly distributes the
  // swatches across the full card width.
  legend: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: ms(14),
    paddingBottom: ms(10),
    paddingHorizontal: ms(14),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  legendSwatch: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(4),
    borderWidth: 0,
  },
  legendLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  // Top controls row: CY/Loads toggle on the left, zoom controls on
  // the right, separated by `justify-content: space-between` so they
  // hug the card edges and never crowd each other on narrow screens.
  // Placed directly below the title, above the chart.
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingTop: ms(4),
    paddingBottom: ms(10),
    gap: ms(8),
  },
});

export default ODPChartWebView;
