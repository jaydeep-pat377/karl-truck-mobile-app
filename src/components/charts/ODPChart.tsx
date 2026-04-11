/**
 * Ordered / Delivered / Poured (ODP) chart — mobile edition.
 *
 * This is a pixel-for-pixel port of the web HourlyODPChart from
 *   truckast-dolese-readymix-frontend/src/app/(protected)/orders/_components/performance-charts.tsx
 *
 * Rendering is done with react-native-svg (NOT a WebView/Highcharts) so the
 * bar group layout, stripe patterns, label placement, border radii and axes
 * match the web Recharts output exactly.
 *
 * Layout per bucket (same as web):
 *   [ Ordered bar ] [ Delivered bar ] [ Poured bar ]
 *
 *   - Ordered   : blue #3b82f6 (optional striped padding at top on last bucket)
 *   - Delivered : dark #1f2937 (optional striped carry-in at bottom)
 *   - Poured    : lime #84cc16 (always solid, single segment)
 *
 * Labels:
 *   - Ordered total (solid + striped) shown ABOVE the Ordered bar in blue
 *   - Delivered total (carryIn + solid) shown ABOVE the Delivered bar in dark
 *   - Poured value shown ABOVE the Poured bar in #65a30d
 *
 * Axes:
 *   - Y-axis with unit label ("CY" or "Loads"), nice-rounded tick interval
 *   - X-axis with hour BOUNDARY labels (between bars) – N+1 labels for N buckets
 *   - Dashed horizontal gridlines
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import type { ScrollView as ScrollViewType } from 'react-native';
import Svg, {
  Defs,
  Pattern,
  Rect,
  Path,
  G,
  Line,
  Text as SvgText,
  ClipPath,
} from 'react-native-svg';
import { moderateScale as ms } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import type {
  ODPBucket,
  ODPGraphData,
  ODPTruckBreakdown,
} from '../../types/ticket';
import {
  runWebReducer,
  computeWebYMax,
  type WebReducerBucket,
} from '../../utils/odpWebReducer';

// Re-export shared ODP types from ticket.ts so existing callers keep working.
export type { ODPBucket, ODPGraphData, ODPTruckBreakdown };

const SCREEN_WIDTH = Dimensions.get('window').width;

// ---------------------------------------------------------------------------
// Colors — EXACT web values (see performance-charts.tsx lines 2160-2180, 2200,
// 2282, 2317, 2323).
// ---------------------------------------------------------------------------
const COLOR_ORDERED = '#3b82f6';        // blue
const COLOR_DELIVERED = '#1f2937';      // near-black
const COLOR_POURED = '#84cc16';         // lime
const COLOR_POURED_LABEL = '#65a30d';   // dark lime (label only)
const COLOR_CARRYOVER_BG = '#d1d5db';   // gray carryover fill (web line 2173)
const COLOR_CARRYOVER_STROKE = '#6b7280'; // gray carryover stroke (web line 2174)
const COLOR_GRID = '#e5e7eb';
const COLOR_AXIS_TEXT = '#6b7280';
const COLOR_GRID_DARK = '#374151';
const COLOR_AXIS_TEXT_DARK = '#9ca3af';

export interface ODPChartProps {
  data?: ODPGraphData | null;
  isDark: boolean;
}

type ViewMode = 'cy' | 'loads';

// ---------------------------------------------------------------------------
// Layout constants — calibrated to match the web 280px BarChart.
// ---------------------------------------------------------------------------
const CHART_HEIGHT = 280;         // web: div style height 280 (line 2081)
const PAD_TOP = 20;               // web: margin.top = 20 (line 2085)
const PAD_BOTTOM = 30;            // y for X-axis labels + ticks
const PAD_LEFT = 44;              // room for Y-axis labels + unit label
const PAD_RIGHT = 30;             // web: margin.right = 30 (line 2085)
const MIN_BAND_WIDTH = 72;        // minimum px per bucket band
const BAR_GAP = 10;               // web: barGap={10} (line 2086)
const BAR_CATEGORY_GAP_PCT = 0.35; // web: barCategoryGap="35%" (line 2087)
const BAR_TOP_RADIUS = 3;         // web: radius={[3,3,0,0]} / custom path r=3

// SVG pattern IDs — kept unique and stable
const PATTERN_ID_STRIPE_ORDERED = 'odp-stripe-ordered';
const PATTERN_ID_CARRYOVER = 'odp-carryover-delivered';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a quantity the same way the web's `fmtQty` does:
 *   - Whole numbers show no decimals ("32")
 *   - Fractional values show 1–2 decimals ("24.5", "22.25")
 *   - Thousands separator (en-US)
 */
function fmtQty(v: number): string {
  if (!isFinite(v)) return '';
  const rounded = Math.round(v * 100) / 100;
  if (rounded % 1 === 0) {
    return rounded.toLocaleString('en-US');
  }
  // 1 or 2 decimals depending on whether the hundredths is 0
  const oneDec = Math.round(rounded * 10) / 10;
  if (Math.abs(oneDec - rounded) < 1e-9) {
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Choose a tickInterval that divides yMax cleanly into ~4–6 gridlines.
 * Same buckets the backend uses for roundToNiceValue but returns the stepping.
 */
function pickTickInterval(yMax: number): number {
  if (yMax <= 10) return 2;
  if (yMax <= 50) return 10;
  if (yMax <= 100) return 25;
  if (yMax <= 200) return 50;
  if (yMax <= 500) return 100;
  return Math.ceil(yMax / 5 / 50) * 50;
}

/**
 * Rounded-top rectangle path: rounded on top-left/top-right, square bottom.
 * Matches web custom Bar shape props (lines 2212-2217, 2254-2259, 2305-2310).
 */
function roundedTopRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  if (h <= 0 || w <= 0) return '';
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} L${x},${y + h} Z`;
}

// ---------------------------------------------------------------------------
// Computed layout for a bucket's 3-bar group
// ---------------------------------------------------------------------------
interface BarGroupLayout {
  groupX: number;      // x of the first (Ordered) bar
  barWidth: number;    // width of ONE bar
  orderedX: number;
  deliveredX: number;
  pouredX: number;
}

function computeBarGroup(bandX: number, bandWidth: number): BarGroupLayout {
  // Recharts barCategoryGap="35%" means 35% of the band is empty space BETWEEN
  // groups. So 65% of bandWidth is usable for the group of 3 bars.
  const groupWidth = bandWidth * (1 - BAR_CATEGORY_GAP_PCT);
  const groupX = bandX + (bandWidth - groupWidth) / 2;
  // 3 bars with BAR_GAP between them
  const rawBarWidth = (groupWidth - 2 * BAR_GAP) / 3;
  const barWidth = Math.max(2, rawBarWidth);
  return {
    groupX,
    barWidth,
    orderedX: groupX,
    deliveredX: groupX + barWidth + BAR_GAP,
    pouredX: groupX + 2 * (barWidth + BAR_GAP),
  };
}

// ---------------------------------------------------------------------------
// The chart body (pure SVG, no WebView)
// ---------------------------------------------------------------------------
interface ODPChartSvgProps {
  buckets: ODPBucket[];
  yMax: number;
  viewMode: ViewMode;
  isDark: boolean;
  chartWidth: number;
  onBarPress: (index: number) => void;
  activeIndex: number | null;
}

const ODPChartSvg: React.FC<ODPChartSvgProps> = ({
  buckets,
  yMax,
  viewMode,
  isDark,
  chartWidth,
  onBarPress,
  activeIndex,
}) => {
  const gridColor = isDark ? COLOR_GRID_DARK : COLOR_GRID;
  const axisTextColor = isDark ? COLOR_AXIS_TEXT_DARK : COLOR_AXIS_TEXT;
  // In dark mode, render the near-black Delivered label in light text so it's
  // visible against the dark card background. Same tweak applies to the
  // near-black Delivered value text above bars.
  const deliveredLabelColor = isDark ? '#e5e7eb' : COLOR_DELIVERED;
  const pouredLabelColor = isDark ? '#a3e635' : COLOR_POURED_LABEL;

  const innerW = chartWidth - PAD_LEFT - PAD_RIGHT;
  const innerH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const n = buckets.length;
  const bandWidth = n > 0 ? innerW / n : 0;

  // ----- Y helpers -----
  const yMaxSafe = Math.max(1, yMax);
  const yFor = (v: number) => PAD_TOP + innerH - (v / yMaxSafe) * innerH;
  const heightFor = (v: number) => (v / yMaxSafe) * innerH;

  // ----- Y ticks -----
  const tickInterval = pickTickInterval(yMaxSafe);
  const yTicks: number[] = [];
  for (let v = 0; v <= yMaxSafe + 0.001; v += tickInterval) {
    yTicks.push(v);
  }
  if (yTicks[yTicks.length - 1] < yMaxSafe - 0.001) yTicks.push(yMaxSafe);

  // ----- Boundary labels (N+1 labels for N buckets) -----
  // Matches web Customized component (lines 2099-2145).
  const boundaryLabels: Array<{ x: number; text: string }> = [];
  buckets.forEach((b, i) => {
    const x = PAD_LEFT + i * bandWidth;
    boundaryLabels.push({ x, text: b.hour_label });
    if (i === n - 1) {
      // Next-hour label at right edge of last bucket
      const parts = b.hour_label.split(':');
      const totalMin =
        (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0) + 60;
      const nh = Math.floor(totalMin / 60) % 24;
      const nm = totalMin % 60;
      boundaryLabels.push({
        x: PAD_LEFT + (i + 1) * bandWidth,
        text: `${nh}:${nm.toString().padStart(2, '0')}`,
      });
    }
  });

  // ----- Per-bucket bar geometry (pre-computed for easy rendering) -----
  const bucketLayouts = buckets.map((_, i) => {
    const bandX = PAD_LEFT + i * bandWidth;
    return {
      bandX,
      ...computeBarGroup(bandX, bandWidth),
    };
  });

  return (
    <Svg width={chartWidth} height={CHART_HEIGHT}>
      {/* ---------------- SVG definitions: stripe + carryover patterns --- */}
      <Defs>
        {/* Ordered stripe: blue diagonal stripes (web lines 2163-2166) */}
        <Pattern
          id={PATTERN_ID_STRIPE_ORDERED}
          patternUnits="userSpaceOnUse"
          width="10"
          height="10"
        >
          <Rect width="10" height="10" fill={COLOR_ORDERED} fillOpacity={0.25} />
          <Path
            d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2"
            stroke={COLOR_ORDERED}
            strokeWidth={3}
            strokeOpacity={0.6}
          />
        </Pattern>
        {/* Carryover stripe: gray diagonal stripes (web lines 2172-2175) */}
        <Pattern
          id={PATTERN_ID_CARRYOVER}
          patternUnits="userSpaceOnUse"
          width="10"
          height="10"
        >
          <Rect
            width="10"
            height="10"
            fill={COLOR_CARRYOVER_BG}
            fillOpacity={0.5}
          />
          <Path
            d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2"
            stroke={COLOR_CARRYOVER_STROKE}
            strokeWidth={3}
            strokeOpacity={0.7}
          />
        </Pattern>
      </Defs>

      {/* ---------------- Y-axis: dashed gridlines + tick labels --------- */}
      <G>
        {yTicks.map((v, i) => (
          <G key={`yt-${i}`}>
            <Line
              x1={PAD_LEFT}
              y1={yFor(v)}
              x2={chartWidth - PAD_RIGHT}
              y2={yFor(v)}
              stroke={gridColor}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <SvgText
              x={PAD_LEFT - 6}
              y={yFor(v) + 4}
              fontSize={11}
              fill={axisTextColor}
              textAnchor="end"
            >
              {Math.round(v).toString()}
            </SvgText>
          </G>
        ))}
      </G>

      {/* ---------------- Y-axis title (rotated "CY" / "Loads") ---------- */}
      <SvgText
        x={14}
        y={PAD_TOP + innerH / 2}
        fontSize={12}
        fontWeight="600"
        fill={axisTextColor}
        textAnchor="middle"
        transform={`rotate(-90, 14, ${PAD_TOP + innerH / 2})`}
      >
        {viewMode === 'cy' ? 'CY' : 'Loads'}
      </SvgText>

      {/* ---------------- X-axis: baseline + boundary ticks & labels ----- */}
      <Line
        x1={PAD_LEFT}
        y1={PAD_TOP + innerH}
        x2={chartWidth - PAD_RIGHT}
        y2={PAD_TOP + innerH}
        stroke={gridColor}
        strokeWidth={1}
      />
      {boundaryLabels.map((bl, i) => (
        <G key={`xl-${i}`}>
          <Line
            x1={bl.x}
            y1={PAD_TOP + innerH}
            x2={bl.x}
            y2={PAD_TOP + innerH + 4}
            stroke={gridColor}
            strokeWidth={1}
          />
          <SvgText
            x={bl.x}
            y={PAD_TOP + innerH + 16}
            fontSize={11}
            fill={axisTextColor}
            textAnchor="middle"
            fontWeight="500"
          >
            {bl.text}
          </SvgText>
        </G>
      ))}

      {/* ---------------- Bars: 3 groups per bucket --------------------- */}
      {buckets.map((b, i) => {
        const layout = bucketLayouts[i];
        const { barWidth, orderedX, deliveredX, pouredX } = layout;

        // Derive view-mode values
        const orderedSolid =
          viewMode === 'cy' ? b.ordered_solid : b.ordered_loads_solid;
        const orderedStriped =
          viewMode === 'cy' ? b.ordered_striped : b.ordered_loads_striped;
        // Loads mode never shows carry-over striping (matches web line 1940-41)
        const deliveredCarryIn =
          viewMode === 'cy' ? b.delivered_carry_in : 0;
        const deliveredSolid =
          viewMode === 'cy' ? b.delivered_solid : b.delivered_loads;
        const poured = viewMode === 'cy' ? b.poured : b.poured_loads;

        const orderedTotal = orderedSolid + orderedStriped;
        const deliveredTotal = deliveredCarryIn + deliveredSolid;

        // ----- Ordered bar segments (stacked) -----
        const orderedSolidH = heightFor(orderedSolid);
        const orderedStripedH = heightFor(orderedStriped);
        const orderedSolidY = yFor(orderedSolid);
        const orderedStripedY = yFor(orderedTotal);

        // ----- Delivered bar segments (stacked) -----
        const deliveredCarryInH = heightFor(deliveredCarryIn);
        const deliveredSolidH = heightFor(deliveredSolid);
        const deliveredCarryInY = yFor(deliveredCarryIn);
        const deliveredSolidY = yFor(deliveredTotal);

        // ----- Poured bar -----
        const pouredH = heightFor(poured);
        const pouredY = yFor(poured);

        // Whether this bar group is currently tapped (show subtle highlight)
        const isActive = activeIndex === i;

        // Opacity cap to match web hover behaviour lightly
        const highlightOpacity = isActive ? 0.85 : 1;

        return (
          <G key={`bar-${i}`} opacity={highlightOpacity}>
            {/* ======== ORDERED GROUP ======== */}
            {/* Solid blue segment (bottom). Top corners rounded only when it
                IS the topmost visible ordered segment (no striped padding). */}
            {orderedSolid > 0 &&
              (orderedStriped > 0 ? (
                <Rect
                  x={orderedX}
                  y={orderedSolidY}
                  width={barWidth}
                  height={orderedSolidH}
                  fill={COLOR_ORDERED}
                />
              ) : (
                <Path
                  d={roundedTopRect(
                    orderedX,
                    orderedSolidY,
                    barWidth,
                    orderedSolidH,
                    BAR_TOP_RADIUS,
                  )}
                  fill={COLOR_ORDERED}
                />
              ))}
            {/* Striped blue padding (top) — last partial bucket only */}
            {orderedStriped > 0 && (
              <>
                {/* Pattern fill + border — web uses url(#odp-stripe-ordered)
                    without an explicit border, but the rounded path is the
                    topmost segment. */}
                <Path
                  d={roundedTopRect(
                    orderedX,
                    orderedStripedY,
                    barWidth,
                    orderedStripedH,
                    BAR_TOP_RADIUS,
                  )}
                  fill={`url(#${PATTERN_ID_STRIPE_ORDERED})`}
                />
                {/* Thin blue outline mirrors the web's subtle border effect */}
                <Path
                  d={roundedTopRect(
                    orderedX,
                    orderedStripedY,
                    barWidth,
                    orderedStripedH,
                    BAR_TOP_RADIUS,
                  )}
                  fill="none"
                  stroke={COLOR_ORDERED}
                  strokeWidth={1}
                  strokeOpacity={0.6}
                />
              </>
            )}
            {/* Ordered label (blue, 11px, bold) above the topmost segment */}
            {orderedTotal > 0 && (
              <SvgText
                x={orderedX + barWidth / 2}
                y={yFor(orderedTotal) - 5}
                fontSize={11}
                fontWeight="600"
                fill={COLOR_ORDERED}
                textAnchor="middle"
              >
                {viewMode === 'cy' ? fmtQty(orderedTotal) : orderedTotal}
              </SvgText>
            )}

            {/* ======== DELIVERED GROUP ======== */}
            {/* Carry-in striped segment (BOTTOM of the delivered stack).
                Matches web line 2263-2276: bottom striped with thin border. */}
            {deliveredCarryIn > 0 && (
              <Rect
                x={deliveredX}
                y={deliveredCarryInY}
                width={barWidth}
                height={deliveredCarryInH}
                fill={`url(#${PATTERN_ID_CARRYOVER})`}
                stroke={COLOR_DELIVERED}
                strokeWidth={0.5}
              />
            )}
            {/* Solid near-black delivered segment (TOP of delivered stack) */}
            {deliveredSolid > 0 && (
              <Path
                d={roundedTopRect(
                  deliveredX,
                  deliveredSolidY,
                  barWidth,
                  deliveredSolidH,
                  BAR_TOP_RADIUS,
                )}
                fill={COLOR_DELIVERED}
              />
            )}
            {/* Delivered label (dark, 11px bold) above the full stack */}
            {deliveredTotal > 0 && (
              <SvgText
                x={deliveredX + barWidth / 2}
                y={yFor(deliveredTotal) - 5}
                fontSize={11}
                fontWeight="600"
                fill={deliveredLabelColor}
                textAnchor="middle"
              >
                {viewMode === 'cy'
                  ? fmtQty(deliveredTotal)
                  : (b.delivered_loads ?? 0)}
              </SvgText>
            )}

            {/* ======== POURED GROUP ======== */}
            {poured > 0 && (
              <Path
                d={roundedTopRect(
                  pouredX,
                  pouredY,
                  barWidth,
                  pouredH,
                  BAR_TOP_RADIUS,
                )}
                fill={COLOR_POURED}
              />
            )}
            {/* Poured label (lime, 11px, bold) above bar */}
            {poured > 0 && (
              <SvgText
                x={pouredX + barWidth / 2}
                y={pouredY - 5}
                fontSize={11}
                fontWeight="600"
                fill={pouredLabelColor}
                textAnchor="middle"
              >
                {viewMode === 'cy' ? fmtQty(poured) : poured}
              </SvgText>
            )}

            {/* Invisible hit area covering the entire bucket band for tap */}
            <Rect
              x={layout.bandX}
              y={PAD_TOP}
              width={bandWidth}
              height={innerH}
              fill="transparent"
              onPress={() => onBarPress(i)}
            />
          </G>
        );
      })}
    </Svg>
  );
};

// ---------------------------------------------------------------------------
// Tooltip card — shown when a bucket is tapped. Mirrors the web ODPTooltip
// structure: title = hour label; rows = Ordered / Delivered / Poured with
// values; carry-in sub-line when carryIn > 0 in CY mode.
// ---------------------------------------------------------------------------
interface ODPTooltipCardProps {
  bucket: ODPBucket;
  viewMode: ViewMode;
  isDark: boolean;
}

const ODPTooltipCard: React.FC<ODPTooltipCardProps> = ({
  bucket,
  viewMode,
  isDark,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const loadWord = (n: number) => (n === 1 ? 'load' : 'loads');

  const valueText = (cy: number, count: number) => {
    if (viewMode === 'cy') {
      return `${fmtQty(cy)} CY${count > 0 ? ` (${count} ${loadWord(count)})` : ''}`;
    }
    return `${count} ${loadWord(count)} · ${fmtQty(cy)} CY`;
  };

  const deliveredTotalCY = bucket.delivered + bucket.delivered_carry_in;

  const rows: Array<{
    label: string;
    color: string;
    text: string;
    carryIn: number;
  }> = [];

  if (bucket.ordered > 0) {
    rows.push({
      label: 'Ordered',
      color: COLOR_ORDERED,
      text: valueText(bucket.ordered, bucket.ordered_loads),
      carryIn: 0,
    });
  }
  if (deliveredTotalCY > 0 || bucket.delivered_loads > 0) {
    rows.push({
      label: 'Delivered',
      color: COLOR_DELIVERED,
      text: valueText(deliveredTotalCY, bucket.delivered_loads),
      carryIn: viewMode === 'cy' ? bucket.delivered_carry_in : 0,
    });
  }
  if (bucket.poured > 0 || bucket.poured_loads > 0) {
    rows.push({
      label: 'Poured',
      color: COLOR_POURED,
      text: valueText(bucket.poured, bucket.poured_loads),
      carryIn: 0,
    });
  }

  if (rows.length === 0) return null;

  return (
    <View
      style={[
        styles.tooltip,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
      ]}
    >
      <Text style={[styles.tooltipTitle, { color: themeColors.text.primary }]}>
        {bucket.hour_label}
      </Text>
      {rows.map((r, i) => (
        <View key={`row-${i}`} style={styles.tooltipRow}>
          <View style={styles.tooltipRowLeft}>
            <View
              style={[styles.tooltipSwatch, { backgroundColor: r.color }]}
            />
            <Text
              style={[
                styles.tooltipLabel,
                { color: themeColors.text.secondary },
              ]}
            >
              {r.label}
            </Text>
          </View>
          <Text
            style={[styles.tooltipValue, { color: themeColors.text.primary }]}
          >
            {r.text}
          </Text>
          {r.carryIn > 0 && (
            <Text
              style={[styles.tooltipSub, { color: COLOR_CARRYOVER_STROKE }]}
            >
              ↓ {fmtQty(r.carryIn)} CY from backlog
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const ODPChart: React.FC<ODPChartProps> = ({ data, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const [viewMode, setViewMode] = useState<ViewMode>('cy');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollViewType>(null);

  // --- Run the web reducer on raw backend data ---------------------------
  // Source of truth = the TS port of the web HourlyODPChart reducer
  // (src/utils/odpWebReducer.ts) executed on `raw_for_reducer` that the
  // backend ships alongside the pre-computed buckets. This guarantees the
  // mobile chart values match the web byte-for-byte.
  const reducerBuckets = useMemo<WebReducerBucket[]>(() => {
    if (data?.raw_for_reducer) {
      return runWebReducer(data.raw_for_reducer);
    }
    return [];
  }, [data?.raw_for_reducer]);

  // Map WebReducerBucket → ODPBucket shape for the SVG renderer.
  // Fallback: when `raw_for_reducer` is missing (older backend), fall back
  // to the backend's own pre-computed buckets.
  const buckets: ODPBucket[] = useMemo(() => {
    if (data?.raw_for_reducer) {
      return reducerBuckets.map((b) => ({
        hour_index: b.hour_index,
        hour_label: b.hour_label,
        ordered: b.ordered,
        ordered_solid: b.ordered_solid,
        ordered_striped: b.ordered_striped,
        delivered: b.delivered,
        delivered_carry_in: b.delivered_carry_in,
        delivered_solid: b.delivered_solid,
        delivered_carry_out: b.delivered_carry_out,
        poured: b.poured,
        ordered_loads: b.ordered_loads,
        ordered_loads_solid: b.ordered_loads_solid,
        ordered_loads_striped: b.ordered_loads_striped,
        delivered_loads: b.delivered_loads,
        poured_loads: b.poured_loads,
        trucks: [],
      }));
    }
    return data?.buckets || [];
  }, [data?.raw_for_reducer, reducerBuckets, data?.buckets]);

  // --- Y-axis max (computed LOCALLY via the TS reducer, not trusted from
  //     the backend). Uses the same formula as the web.
  const yMax = useMemo(() => {
    if (data?.raw_for_reducer && reducerBuckets.length > 0) {
      return computeWebYMax(reducerBuckets, data.raw_for_reducer, viewMode);
    }
    // Fallback when raw_for_reducer is missing (older backend).
    return viewMode === 'cy' ? data?.y_max || 50 : data?.y_max_loads || 10;
  }, [
    data?.raw_for_reducer,
    data?.y_max,
    data?.y_max_loads,
    reducerBuckets,
    viewMode,
  ]);

  const onBarPress = useCallback(
    (i: number) => {
      setActiveIndex((prev) => (prev === i ? null : i));
    },
    [],
  );

  // Match web visibility: `HourlyODPChart` returns null when odpData is
  // empty (performance-charts.tsx:1999). Mobile should hide the entire
  // card in the same situation — no placeholder, no debug banner.
  if (!data || buckets.length === 0) {
    return null;
  }

  // --- Chart width / horizontal scroll --------------------------------------
  // If we have lots of buckets, expand the SVG to MIN_BAND_WIDTH per bucket and
  // let the horizontal ScrollView handle overflow.
  const horizontalPadding = ms(16);
  const visibleWidth = SCREEN_WIDTH - horizontalPadding * 2;
  const requiredWidth = PAD_LEFT + PAD_RIGHT + buckets.length * MIN_BAND_WIDTH;
  const chartWidth = Math.max(visibleWidth, requiredWidth);

  // --- Info pill data (from backend metadata) -------------------------------
  const spacingMin = data?.truck_space ?? 0;
  const rate = data?.schedule_rate ?? 0;
  const scheduledQty = data?.schedule_qty ?? 0;
  const numberOfLoads = data?.number_of_loads ?? 0;
  const loadQty = data?.load_qty ?? 0;

  const hasCarryover =
    viewMode === 'cy' &&
    buckets.some((b) => (b.delivered_carry_in || 0) > 0);

  const activeBucket =
    activeIndex !== null && activeIndex >= 0 && activeIndex < buckets.length
      ? buckets[activeIndex]
      : null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* ------------ Header: title + toggle ------------- */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          Ordered / Delivered / Poured
        </Text>
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: isDark ? colors.grey[90] : colors.grey[10],
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setViewMode('cy')}
            style={[
              styles.toggleButton,
              viewMode === 'cy' && {
                backgroundColor: isDark ? themeColors.card : colors.common.white,
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
              CY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('loads')}
            style={[
              styles.toggleButton,
              viewMode === 'loads' && {
                backgroundColor: isDark ? themeColors.card : colors.common.white,
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
      </View>

      {/* ------------ Info pills row ------------ */}
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
            value={`${rate.toFixed(2)} CY/HR`}
          />
        )}
        {scheduledQty > 0 && (
          <Pill
            isDark={isDark}
            icon="package-variant"
            iconColor="#a855f7"
            bgColor="#a855f715"
            label="Scheduled"
            value={`${scheduledQty.toFixed(2)} CY`}
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
            value={`${loadQty.toFixed(2)} CY`}
          />
        )}
      </View>

      {/* ------------ Chart (horizontal scroll when many buckets) ------------ */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={chartWidth > visibleWidth}
        bounces={false}
        style={styles.scrollView}
        contentContainerStyle={{ width: chartWidth }}
      >
        <ODPChartSvg
          buckets={buckets}
          yMax={yMax}
          viewMode={viewMode}
          isDark={isDark}
          chartWidth={chartWidth}
          onBarPress={onBarPress}
          activeIndex={activeIndex}
        />
      </ScrollView>

      {/* ------------ Tooltip card (shown on tap) ------------ */}
      {activeBucket && (
        <Pressable
          onPress={() => setActiveIndex(null)}
          style={styles.tooltipWrapper}
        >
          <ODPTooltipCard
            bucket={activeBucket}
            viewMode={viewMode}
            isDark={isDark}
          />
        </Pressable>
      )}

      {/* ------------ Legend ------------ */}
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

// ---------------------------------------------------------------------------
// Subcomponents: Pill + LegendItem
// ---------------------------------------------------------------------------
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
            opacity: striped ? 0.6 : 1,
          },
        ]}
      />
      <Text
        style={[styles.legendLabel, { color: themeColors.text.secondary }]}
      >
        {label}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    borderRadius: ms(16),
    overflow: 'hidden',
    marginVertical: ms(12),
    paddingBottom: ms(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingTop: ms(14),
    paddingBottom: ms(8),
  },
  headerTitle: {
    fontSize: ms(15),
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: ms(6),
    padding: ms(2),
  },
  toggleButton: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(4),
  },
  toggleLabel: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
    paddingHorizontal: ms(16),
    paddingBottom: ms(10),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(8),
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
  scrollView: {
    flexGrow: 0,
  },
  tooltipWrapper: {
    marginHorizontal: ms(16),
    marginTop: ms(10),
  },
  tooltip: {
    borderRadius: ms(8),
    borderWidth: 1,
    padding: ms(10),
    gap: ms(4),
  },
  tooltipTitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.bold,
    marginBottom: ms(4),
  },
  tooltipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ms(2),
  },
  tooltipRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  tooltipSwatch: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(2),
  },
  tooltipLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  tooltipValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
  },
  tooltipSub: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    marginLeft: ms(18),
    width: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: ms(14),
    paddingTop: ms(10),
    paddingHorizontal: ms(16),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
  },
  legendSwatch: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(2),
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
});
