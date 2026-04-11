/**
 * Ordered / Delivered / Poured chart — WebView edition (fully offline).
 *
 * This is the MANDATORY FALLBACK implementation: instead of reproducing the
 * web chart with React Native SVG (which always drifts from the web's
 * Recharts output), we render the entire chart card INSIDE a WebView
 * using the exact same libraries the web uses:
 *
 *   • React 18.3.1        (bundled at src/assets/odpVendor/reactUmd.ts)
 *   • ReactDOM 18.3.1     (bundled at src/assets/odpVendor/reactDomUmd.ts)
 *   • PropTypes 15.8.1    (bundled at src/assets/odpVendor/propTypesUmd.ts)
 *   • Recharts 2.15.4     (bundled at src/assets/odpVendor/rechartsUmd.ts)
 *
 * ZERO network dependency. The UMD bundles are JSON-escaped strings
 * embedded in the JS bundle, inlined into the WebView HTML via <script>
 * tags before the chart code runs. No unpkg, no jsdelivr, no CDN — the
 * chart renders fine on airplane mode.
 *
 * The web's `HourlyODPChart` reducer and visual config are ported verbatim
 * into the HTML payload. Because the same JS reducer runs on the same
 * raw tickets + schedule that the backend already serves at
 * `graphs.ordered_delivered_poured.raw_for_reducer`, AND the bars are
 * drawn by the exact same charting library, the mobile output is
 * guaranteed to match the web byte-for-byte.
 *
 * Visibility matches the web exactly:
 *   • No `raw_for_reducer` or no buckets → component returns `null`
 *     (the web does `if (odpData.length === 0) return null`).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { moderateScale as ms } from 'react-native-size-matters';
import type { ODPGraphData, ODPRawForReducer } from '../../types/ticket';
import { fetchOdpRawFromSupabase } from '../../services/odpSupabaseFetcher';

// Bundled React + Recharts UMD builds (see src/assets/odpVendor/*.ts).
// Inlining them removes every runtime network dependency for the chart —
// no unpkg / jsdelivr / CDN required, works fully offline. Same exact
// library versions the web frontend uses (React 18.3.1, Recharts 2.15.4).
import REACT_UMD from '../../assets/odpVendor/reactUmd';
import REACT_DOM_UMD from '../../assets/odpVendor/reactDomUmd';
import PROP_TYPES_UMD from '../../assets/odpVendor/propTypesUmd';
import RECHARTS_UMD from '../../assets/odpVendor/rechartsUmd';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
}

// ---------------------------------------------------------------------------
// React Native wrapper — as thin as possible. The whole chart card (header,
// pills, toggle, chart, legend) is rendered inside the WebView using React +
// Recharts. RN only wires up the container size.
// ---------------------------------------------------------------------------
export const ODPChartWebView: React.FC<ODPChartWebViewProps> = ({
  data,
  isDark,
  orderCode,
  orderDate,
  orderId,
}) => {
  // --- Direct Supabase fetch (preferred when order identifiers are passed)
  // This ELIMINATES backend SQL drift as a source of value mismatches.
  // When the fetcher succeeds, its output replaces `data.raw_for_reducer`
  // entirely, so the reducer sees the exact same rows the web sees.
  const [supabaseRaw, setSupabaseRaw] = useState<ODPRawForReducer | null>(null);
  const [supabaseFetched, setSupabaseFetched] = useState<boolean>(false);

  const canUseDirectFetch = !!(orderCode && orderDate && orderId);

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
  }, [canUseDirectFetch, orderCode, orderDate, orderId]);

  // The reducer's input: prefer directly fetched Supabase data. Fall back
  // to backend raw_for_reducer only if direct fetch was not configured
  // (order identifiers missing) or failed outright. In either case the
  // WebView never shows stale/wrong data from two sources at once.
  const effectiveRaw: ODPRawForReducer | null = useMemo(() => {
    if (canUseDirectFetch && supabaseFetched) {
      return supabaseRaw ?? data?.raw_for_reducer ?? null;
    }
    // Direct fetch not yet complete — use backend raw as a first-paint
    // approximation; it will be replaced once Supabase responds.
    return data?.raw_for_reducer ?? null;
  }, [canUseDirectFetch, supabaseFetched, supabaseRaw, data?.raw_for_reducer]);

  const hasRaw = !!effectiveRaw;

  const htmlContent = useMemo(() => {
    if (!effectiveRaw) return '';
    return buildOdpHtml({
      raw: effectiveRaw,
      isDark,
      spacingMin: data?.truck_space ?? 0,
      rate: data?.schedule_rate ?? 0,
      scheduledQty: data?.schedule_qty ?? 0,
      numberOfLoads: data?.number_of_loads ?? 0,
      loadQty: data?.load_qty ?? 0,
    });
  }, [
    effectiveRaw,
    data?.truck_space,
    data?.schedule_rate,
    data?.schedule_qty,
    data?.number_of_loads,
    data?.load_qty,
    isDark,
  ]);

  // Match web visibility exactly: `HourlyODPChart` returns null when it has
  // no data (performance-charts.tsx:1999). Mobile should hide the entire
  // card in the same situation — NO placeholder, NO debug strip.
  if (!hasRaw) return null;

  // The card needs enough vertical room for:
  //   header (title + toggle) ................ ms(44)
  //   pills row (two-line wrapping) ........... ms(56)
  //   chart plot ............................. 280
  //   legend .................................. ms(30)
  //   outer padding ........................... ms(24)
  // Total ≈ ms(454). Use 480 for comfortable overflow-free rendering.
  const width = SCREEN_WIDTH;
  const height = ms(480);

  return (
    <View style={{ width, height }}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        mixedContentMode="always"
        automaticallyAdjustContentInsets={false}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// HTML template generator.
//
// Produces a fully self-contained document that:
//   1. Loads React, ReactDOM, and Recharts from unpkg CDN
//   2. Inlines the raw tickets + schedule as JSON
//   3. Inlines a VERBATIM port of the web's odpData reducer
//   4. Renders the chart card with `React.createElement` using the exact
//      same Recharts primitives (BarChart, Bar, XAxis, YAxis, CartesianGrid,
//      Tooltip, ResponsiveContainer) that the web uses
//
// Every bar color, stripe pattern, margin, bar gap, and radius is copied
// from `truckast-dolese-readymix-frontend/src/app/(protected)/orders/_components/
// performance-charts.tsx` (HourlyODPChart lines 2081-2362).
// ---------------------------------------------------------------------------
interface BuildOdpHtmlArgs {
  raw: ODPRawForReducer;
  isDark: boolean;
  spacingMin: number;
  rate: number;
  scheduledQty: number;
  numberOfLoads: number;
  loadQty: number;
}

function buildOdpHtml(args: BuildOdpHtmlArgs): string {
  const {
    raw,
    isDark,
    spacingMin,
    rate,
    scheduledQty,
    numberOfLoads,
    loadQty,
  } = args;

  const bg = isDark ? '#1f2937' : '#ffffff';
  const cardBg = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#374151' : 'rgba(229,231,235,0.5)';
  const textPrimary = isDark ? '#f3f4f6' : '#111827';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const axisText = isDark ? '#9ca3af' : '#6b7280';
  const toggleBg = isDark ? '#374151' : '#f3f4f6';
  const toggleActiveBg = isDark ? '#4b5563' : '#ffffff';
  const toggleText = isDark ? '#9ca3af' : '#6b7280';
  const toggleActiveText = isDark ? '#f9fafb' : '#111827';

  // Pre-serialize data as JSON, escaping any closing script tags so they
  // can't break out of the <script> block.
  const rawJson = JSON.stringify(raw).replace(/</g, '\\u003c');
  const pillJson = JSON.stringify({
    spacingMin,
    rate,
    scheduledQty,
    numberOfLoads,
    loadQty,
  }).replace(/</g, '\\u003c');

  // Build the <script> block that inlines React + ReactDOM + PropTypes +
  // Recharts from the bundled UMD source. Use string concatenation (not
  // template literal interpolation) because the UMD source may contain
  // backticks, `${}` sequences, or anything else that would be mis-parsed
  // by a template literal. Each source is wrapped in a <script> tag and
  // an IIFE-safe outer closure so earlier failures don't short-circuit
  // later libraries.
  const vendorScripts =
    '<script>' + REACT_UMD + '</script>' +
    '<script>' + PROP_TYPES_UMD + '</script>' +
    '<script>' + REACT_DOM_UMD + '</script>' +
    '<script>' + RECHARTS_UMD + '</script>';

  // NOTE: the reducer below is a line-for-line copy of the web's
  // HourlyODPChart odpData useMemo (performance-charts.tsx:1504-1932),
  // with only trivial syntax adjustments (`var` instead of `const/let`,
  // plain object literals instead of `Map`). Do not "clean up" or
  // "optimize" it — any divergence from the web reducer will cause the
  // dreaded value mismatches the user has been chasing.
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  html,body{
    background:${bg};
    color:${textPrimary};
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
    font-size:14px;
    -webkit-user-select:none;
    user-select:none;
    -webkit-font-smoothing:antialiased;
  }
  #root{padding:12px 16px}
  .card{
    background:${cardBg};
    border:1px solid ${borderColor};
    border-radius:12px;
    padding:16px;
    box-shadow:0 1px 2px rgba(0,0,0,0.05);
  }
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
  .header-left{flex:1;min-width:0}
  .title{font-size:16px;font-weight:600;color:${textPrimary};margin-bottom:8px}
  .pills{display:flex;flex-wrap:wrap;gap:6px}
  .pill{
    display:inline-flex;
    align-items:center;
    gap:4px;
    padding:4px 10px;
    border-radius:8px;
    font-size:11px;
    line-height:1;
  }
  .pill-spacing{background:${isDark ? '#172554' : '#eff6ff'};color:${isDark ? '#93c5fd' : '#2563eb'}}
  .pill-rate{background:${isDark ? '#064e3b' : '#ecfdf5'};color:${isDark ? '#6ee7b7' : '#059669'}}
  .pill-scheduled{background:${isDark ? '#3b0764' : '#faf5ff'};color:${isDark ? '#d8b4fe' : '#9333ea'}}
  .pill-loads{background:${isDark ? '#7c2d12' : '#fff7ed'};color:${isDark ? '#fdba74' : '#ea580c'}}
  .pill-loadsize{background:${isDark ? '#881337' : '#fff1f2'};color:${isDark ? '#fda4af' : '#e11d48'}}
  .pill-label{font-weight:500}
  .pill-value{font-weight:700}
  .toggle{
    display:inline-flex;
    background:${toggleBg};
    border-radius:6px;
    padding:2px;
    flex-shrink:0;
  }
  .toggle button{
    padding:4px 10px;
    font-size:10px;
    font-weight:600;
    border:none;
    background:transparent;
    color:${toggleText};
    border-radius:4px;
    cursor:pointer;
  }
  .toggle button.active{
    background:${toggleActiveBg};
    color:${toggleActiveText};
    box-shadow:0 1px 2px rgba(0,0,0,0.1);
  }
  .chart-wrap{width:100%;height:280px;position:relative}
  .legend{
    display:flex;
    flex-wrap:wrap;
    justify-content:center;
    gap:14px;
    margin-top:10px;
    font-size:11px;
    color:${textSecondary};
  }
  .legend-item{display:inline-flex;align-items:center;gap:5px}
  .legend-swatch{width:12px;height:12px;border-radius:2px;display:inline-block}
  .no-data{
    padding:40px 20px;
    text-align:center;
    color:${textSecondary};
    font-size:12px;
  }
</style>
<!-- Vendor libraries (React 18.3.1, Recharts 2.15.4) inlined below.
     ZERO network dependency. Matches the web's exact library versions. -->
${vendorScripts}
</head>
<body>
<div id="root"><div class="no-data">Loading chart…</div></div>
<script>
(function(){
'use strict';

// Sanity check — the vendor libraries are INLINED in this HTML document,
// so this should always succeed. If not, the bundled assets are corrupt
// (e.g. Metro failed to read them) — surface the exact missing global.
if (!window.React || !window.ReactDOM || !window.Recharts) {
  var missing = [];
  if (!window.React) missing.push('React');
  if (!window.ReactDOM) missing.push('ReactDOM');
  if (!window.Recharts) missing.push('Recharts');
  document.getElementById('root').innerHTML =
    '<div class="card"><div class="no-data">Chart bundle incomplete (missing: ' + missing.join(', ') + '). Rebuild the app so Metro re-reads src/assets/odpVendor/*.ts.</div></div>';
  return;
}

var e = React.createElement;
var R = window.Recharts;

// ---- Injected data -------------------------------------------------------
var RAW = ${rawJson};
var PILL = ${pillJson};

// =========================================================================
// REDUCER — verbatim port of web HourlyODPChart odpData
// (performance-charts.tsx:1504-1932). Do not modify.
// =========================================================================
function getLoadQty(ticket) {
  var p = (ticket.ticket_products || []).find(function(x){return x.is_mix === true;});
  return (p && p.load_qty) || 0;
}

function runReducer(productScheduleItems, tickets) {
  var scheduleLoadQty = 0;
  var orderedRatePerHour = 0;
  var truckSpace = 0;
  if (productScheduleItems && productScheduleItems.length) {
    for (var i0 = 0; i0 < productScheduleItems.length; i0++) {
      var psi = productScheduleItems[i0];
      if (psi.is_mix && psi.schedules && psi.schedules.length) {
        var sched = psi.schedules[0];
        if (sched.delivery_rate_per_hour && sched.delivery_rate_per_hour > 0) {
          orderedRatePerHour = sched.delivery_rate_per_hour;
        }
        if (sched.truck_space && sched.truck_space > 0) {
          truckSpace = sched.truck_space;
        }
        if (sched.load_qty && sched.load_qty > 0) {
          scheduleLoadQty = sched.load_qty;
        }
        if (sched.loads && sched.loads.length) {
          for (var li = 0; li < sched.loads.length; li++) {
            var L = sched.loads[li];
            if (L.load_qty && L.load_qty > 0 && scheduleLoadQty <= 0) {
              scheduleLoadQty = L.load_qty;
              break;
            }
          }
        }
        break;
      }
    }
  }

  var scheduledStartHour = null;
  var scheduledStartMinute = 0;
  if (productScheduleItems && productScheduleItems.length) {
    for (var i1 = 0; i1 < productScheduleItems.length; i1++) {
      var psi1 = productScheduleItems[i1];
      if (psi1.is_mix && psi1.schedules && psi1.schedules.length) {
        var startTimeStr = psi1.schedules[0].start_time;
        if (startTimeStr) {
          var cleaned = String(startTimeStr).trim().replace(/Z$|[+-]\\d{2}:\\d{2}$/, '');
          var m = cleaned.match(/(\\d{2}):(\\d{2})/);
          if (m) {
            scheduledStartHour = parseInt(m[1], 10);
            scheduledStartMinute = parseInt(m[2], 10);
          }
        }
        break;
      }
    }
  }

  var startMinFromMidnight = scheduledStartHour !== null
    ? scheduledStartHour * 60 + scheduledStartMinute
    : 0;
  var scheduledStartMinFromMidnight = startMinFromMidnight;

  function formatTimeLabel(totalMin) {
    var h = Math.floor(totalMin / 60);
    var mn = totalMin % 60;
    return h + ':' + (mn < 10 ? '0' + mn : mn);
  }

  function getBucketForData(minutes) {
    return Math.max(0, Math.floor((minutes - startMinFromMidnight) / 60));
  }

  var expectedEndBucket = null;
  if (productScheduleItems && productScheduleItems.length) {
    for (var i2 = 0; i2 < productScheduleItems.length; i2++) {
      var psi2 = productScheduleItems[i2];
      if (psi2.is_mix && psi2.schedules && psi2.schedules.length) {
        var s2 = psi2.schedules[0];
        var nL = s2.number_of_loads || 0;
        var tS = s2.truck_space || 0;
        if (nL > 0 && tS > 0) {
          expectedEndBucket = Math.ceil((nL * tS) / 60);
        }
        break;
      }
    }
  }

  function getMinutes(timeStr) {
    if (!timeStr) return null;
    var d = new Date(timeStr);
    if (isNaN(d.getTime())) return null;
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  var orderedCountMap = {};
  var deliveredMap = {};
  var deliveredCountMap = {};
  var pouredMap = {};
  var pouredCountMap = {};

  for (var ti = 0; ti < tickets.length; ti++) {
    var t = tickets[ti];
    if (t.remove_reason_code && String(t.remove_reason_code).trim() !== '') continue;
    var qty = getLoadQty(t);
    if (qty <= 0 && scheduleLoadQty > 0) qty = scheduleLoadQty;
    if (qty <= 0) continue;

    var orderedMin = getMinutes(t.scheduled_on_job_time);
    if (orderedMin !== null) {
      var bo = getBucketForData(orderedMin);
      orderedCountMap[bo] = (orderedCountMap[bo] || 0) + 1;
    }
    var deliveredMin = getMinutes(t.on_job_time);
    if (deliveredMin !== null) {
      var clampedD = Math.max(deliveredMin, scheduledStartMinFromMidnight);
      var bd = getBucketForData(clampedD);
      deliveredMap[bd] = (deliveredMap[bd] || 0) + qty;
      deliveredCountMap[bd] = (deliveredCountMap[bd] || 0) + 1;
    }
    var pouredMin = getMinutes(t.wash_time || t.to_plant_time);
    if (pouredMin !== null) {
      var clampedP = Math.max(pouredMin, scheduledStartMinFromMidnight);
      var bp = getBucketForData(clampedP);
      pouredMap[bp] = (pouredMap[bp] || 0) + qty;
      pouredCountMap[bp] = (pouredCountMap[bp] || 0) + 1;
    }
  }

  var allBuckets = {};
  for (var kd in deliveredMap) allBuckets[kd] = true;
  for (var kp in pouredMap) allBuckets[kp] = true;
  for (var ko in orderedCountMap) allBuckets[ko] = true;

  var bucketKeys = Object.keys(allBuckets).map(Number);

  if (bucketKeys.length === 0 && orderedRatePerHour > 0 && scheduledStartHour !== null) {
    if (productScheduleItems && productScheduleItems.length) {
      for (var i3 = 0; i3 < productScheduleItems.length; i3++) {
        var psi3 = productScheduleItems[i3];
        if (psi3.is_mix && psi3.schedules && psi3.schedules.length) {
          var s3 = psi3.schedules[0];
          var nL3 = s3.number_of_loads || 0;
          var tS3 = s3.truck_space || 0;
          if (nL3 > 0 && tS3 > 0) {
            var durH = Math.ceil((nL3 * tS3) / 60);
            for (var h = 0; h <= durH; h++) {
              allBuckets[h] = true;
              bucketKeys.push(h);
            }
          }
          break;
        }
      }
    }
  }

  if (bucketKeys.length === 0) return [];

  bucketKeys.sort(function(a,b){return a-b;});
  var minBucket = Math.min(0, bucketKeys[0]);
  var maxBucket = bucketKeys[bucketKeys.length - 1];

  var orderedRate = Math.round(orderedRatePerHour * 100) / 100;
  var loadsPerHour = truckSpace > 0 ? Math.floor(60 / truckSpace) : 0;

  var totalOrderedQty = 0;
  var totalLoads = 0;
  if (productScheduleItems && productScheduleItems.length) {
    for (var i4 = 0; i4 < productScheduleItems.length; i4++) {
      var psi4 = productScheduleItems[i4];
      if (psi4.is_mix && psi4.schedules && psi4.schedules.length) {
        var s4 = psi4.schedules[0];
        if (s4.schedule_qty && s4.schedule_qty > 0) totalOrderedQty = s4.schedule_qty;
        if (s4.number_of_loads && s4.number_of_loads > 0) totalLoads = s4.number_of_loads;
        break;
      }
    }
  }
  if (totalOrderedQty === 0 && tickets.length > 0) {
    for (var ti2 = 0; ti2 < tickets.length; ti2++) {
      var t2 = tickets[ti2];
      if (t2.remove_reason_code && String(t2.remove_reason_code).trim() !== '') continue;
      var q2 = getLoadQty(t2);
      if (q2 <= 0 && scheduleLoadQty > 0) q2 = scheduleLoadQty;
      if (q2 > 0) totalOrderedQty += q2;
      totalLoads++;
    }
  }

  var remainingOrdered = totalOrderedQty;
  var remainingLoads = totalLoads;
  var scheduledStartBucket = scheduledStartHour !== null
    ? Math.floor((scheduledStartMinFromMidnight - startMinFromMidnight) / 60)
    : 0;

  var rawBuckets = [];
  for (var b = minBucket; b <= maxBucket; b++) {
    var isScheduledHour = b >= scheduledStartBucket;
    var orderedForHour = (orderedRate > 0 && isScheduledHour)
      ? Math.min(orderedRate, Math.max(0, remainingOrdered))
      : 0;
    if (isScheduledHour) remainingOrdered -= orderedForHour;
    var orderedLoadsForHour = (loadsPerHour > 0 && isScheduledHour)
      ? Math.min(loadsPerHour, Math.max(0, remainingLoads))
      : 0;
    if (isScheduledHour) remainingLoads -= orderedLoadsForHour;

    rawBuckets.push({
      h: b,
      label: formatTimeLabel(startMinFromMidnight + b * 60),
      ordered: Math.round(orderedForHour * 100) / 100,
      delivered: Math.round((deliveredMap[b] || 0) * 100) / 100,
      poured: Math.round((pouredMap[b] || 0) * 100) / 100,
      orderedCount: orderedLoadsForHour,
      deliveredCount: deliveredCountMap[b] || 0,
      pouredCount: pouredCountMap[b] || 0,
      isOvertime: expectedEndBucket !== null && b >= expectedEndBucket
    });
  }

  var lastOrderedIndex = -1;
  for (var li2 = rawBuckets.length - 1; li2 >= 0; li2--) {
    if (rawBuckets[li2].ordered > 0) {
      lastOrderedIndex = li2;
      break;
    }
  }

  var carryOver = 0;
  var result = [];
  for (var ri = 0; ri < rawBuckets.length; ri++) {
    var rb = rawBuckets[ri];
    var carryIn = carryOver;
    var deliveredSolid = rb.delivered;
    var deliveredCarryIn = 0;
    var deliveredCarryOut = 0;

    if (rb.poured > rb.delivered) {
      var pouredFromBacklog = rb.poured - rb.delivered;
      deliveredCarryIn = Math.min(carryIn, pouredFromBacklog);
      carryOver = Math.max(0, carryIn - pouredFromBacklog);
    } else {
      carryOver = carryOver + (rb.delivered - rb.poured);
    }

    var orderedSolid = rb.ordered;
    var orderedStriped = 0;
    var orderedCountSolid = rb.orderedCount;
    var orderedCountStriped = 0;
    if (ri === lastOrderedIndex && rb.ordered > 0 && rb.ordered < orderedRate) {
      orderedSolid = rb.ordered;
      orderedStriped = orderedRate - rb.ordered;
      orderedCountSolid = rb.orderedCount;
      orderedCountStriped = loadsPerHour - rb.orderedCount;
    }

    result.push({
      h: rb.h,
      label: rb.label,
      ordered: rb.ordered,
      delivered: rb.delivered,
      poured: rb.poured,
      orderedCount: rb.orderedCount,
      deliveredCount: rb.deliveredCount,
      pouredCount: rb.pouredCount,
      isOvertime: rb.isOvertime,
      orderedSolid: Math.round(orderedSolid * 100) / 100,
      orderedStriped: Math.round(orderedStriped * 100) / 100,
      deliveredCarryIn: Math.round(deliveredCarryIn * 100) / 100,
      deliveredSolid: Math.round(deliveredSolid * 100) / 100,
      deliveredCarryOut: Math.round(deliveredCarryOut * 100) / 100,
      orderedCountSolid: orderedCountSolid,
      orderedCountStriped: orderedCountStriped,
      deliveredCountCarryIn: 0,
      deliveredCountSolid: rb.deliveredCount,
      deliveredCountCarryOut: 0
    });
  }

  var filtered = [];
  for (var fi = 0; fi < result.length; fi++) {
    var rb2 = result[fi];
    if (rb2.ordered > 0 || rb2.delivered > 0 || rb2.poured > 0) {
      filtered.push(rb2);
    }
  }
  return filtered;
}

// =========================================================================
// Y-axis domain — verbatim port of web yAxisDomain useMemo
// (performance-charts.tsx:1949-1997).
// =========================================================================
function computeYMax(odpData, productScheduleItems, viewMode) {
  if (viewMode === 'loads') {
    var maxLoad = 0;
    for (var i = 0; i < odpData.length; i++) {
      var d = odpData[i];
      var v = Math.max(
        d.orderedCountSolid + d.orderedCountStriped,
        d.deliveredCountSolid,
        d.pouredCount
      );
      if (v > maxLoad) maxLoad = v;
    }
    return Math.max(2, Math.ceil(maxLoad * 1.2));
  }
  var orderedRate = 32;
  if (productScheduleItems && productScheduleItems.length) {
    for (var j = 0; j < productScheduleItems.length; j++) {
      var psi = productScheduleItems[j];
      if (psi.is_mix && psi.schedules && psi.schedules.length) {
        var r = psi.schedules[0].delivery_rate_per_hour;
        if (r && r > 0) orderedRate = r;
        break;
      }
    }
  }
  var baseMax = Math.ceil(orderedRate * 1.4);
  var maxDataValue = 0;
  for (var k = 0; k < odpData.length; k++) {
    var dd = odpData[k];
    var v1 = dd.deliveredCarryIn + dd.delivered;
    var v2 = dd.poured;
    var v3 = dd.ordered;
    if (v1 > maxDataValue) maxDataValue = v1;
    if (v2 > maxDataValue) maxDataValue = v2;
    if (v3 > maxDataValue) maxDataValue = v3;
  }
  var targetMax = Math.max(baseMax, Math.ceil(maxDataValue * 1.1));
  if (targetMax <= 25) return 25;
  if (targetMax <= 50) return 50;
  if (targetMax <= 75) return 75;
  if (targetMax <= 100) return 100;
  if (targetMax <= 125) return 125;
  if (targetMax <= 150) return 150;
  if (targetMax <= 175) return 175;
  if (targetMax <= 200) return 200;
  return Math.ceil(targetMax / 50) * 50;
}

// =========================================================================
// Formatting helpers — mirror web fmtQty
// =========================================================================
function fmtQty(v) {
  if (!isFinite(v)) return '';
  var r = Math.round(v * 100) / 100;
  if (r % 1 === 0) return r.toLocaleString('en-US');
  var one = Math.round(r * 10) / 10;
  if (Math.abs(one - r) < 1e-9) {
    return r.toLocaleString('en-US', {minimumFractionDigits:1, maximumFractionDigits:1});
  }
  return r.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// =========================================================================
// Custom tooltip — mirrors web ODPTooltip
// =========================================================================
function ODPTooltip(props) {
  if (!props.active || !props.payload || !props.payload.length) return null;
  var bucket = props.payload[0].payload;
  var viewMode = props.viewMode || 'cy';
  var rows = [];
  var deliveredTotal = bucket.deliveredCarryIn + bucket.delivered;

  function valueText(cy, count) {
    var loadWord = count === 1 ? 'load' : 'loads';
    if (viewMode === 'loads') {
      return count + ' ' + loadWord + ' · ' + fmtQty(cy) + ' CY';
    }
    return fmtQty(cy) + ' CY' + (count > 0 ? ' (' + count + ' ' + loadWord + ')' : '');
  }

  if (bucket.ordered > 0) {
    rows.push({label:'Ordered', color:'#3b82f6', text:valueText(bucket.ordered, bucket.orderedCount), carryIn:0});
  }
  if (deliveredTotal > 0) {
    rows.push({label:'Delivered', color:'#1f2937', text:valueText(deliveredTotal, bucket.deliveredCount), carryIn: viewMode === 'cy' ? bucket.deliveredCarryIn : 0});
  }
  if (bucket.poured > 0) {
    rows.push({label:'Poured', color:'#84cc16', text:valueText(bucket.poured, bucket.pouredCount), carryIn:0});
  }
  if (!rows.length) return null;

  return e('div', {
    style: {
      background: '${cardBg}',
      border: '1px solid ${borderColor}',
      borderRadius: 6,
      padding: 10,
      fontSize: 12,
      minWidth: 200,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      color: '${textPrimary}'
    }
  },
    e('div', {style:{fontWeight:700, fontSize:13, marginBottom:6, paddingBottom:4, borderBottom:'1px solid ${borderColor}'}}, props.label),
    rows.map(function(r, idx) {
      return e('div', {key:idx},
        e('div', {style:{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'2px 0'}},
          e('div', {style:{display:'flex', alignItems:'center', gap:8}},
            e('span', {style:{width:12, height:12, borderRadius:2, background:r.color, display:'inline-block'}}),
            e('span', {style:{color:'${textSecondary}'}}, r.label)
          ),
          e('span', {style:{fontWeight:600, color:'${textPrimary}'}}, r.text)
        ),
        r.carryIn > 0
          ? e('div', {style:{marginLeft:20, fontSize:10, color:'${textSecondary}', paddingBottom:2}},
              '↓ ' + fmtQty(r.carryIn) + ' CY from backlog (poured > delivered)')
          : null
      );
    })
  );
}

// =========================================================================
// Main chart card — mirrors web HourlyODPChart return JSX
// =========================================================================
function HourlyODPChart() {
  var modeState = React.useState('cy');
  var viewMode = modeState[0];
  var setViewMode = modeState[1];

  var odpData = React.useMemo(function(){
    return runReducer(RAW.productScheduleItems || [], RAW.tickets || []);
  }, []);

  // Match web: hide entire card if no data.
  if (!odpData.length) {
    return e('div', {className:'card'},
      e('div', {className:'no-data'}, 'No data yet for this order.')
    );
  }

  var yMax = computeYMax(odpData, RAW.productScheduleItems || [], viewMode);

  var orderedSolidKey = viewMode === 'cy' ? 'orderedSolid' : 'orderedCountSolid';
  var orderedStripedKey = viewMode === 'cy' ? 'orderedStriped' : 'orderedCountStriped';
  var deliveredCarryInKey = viewMode === 'cy' ? 'deliveredCarryIn' : 'deliveredCountCarryIn';
  var deliveredSolidKey = viewMode === 'cy' ? 'deliveredSolid' : 'deliveredCountSolid';
  var pouredKey = viewMode === 'cy' ? 'poured' : 'pouredCount';
  var unitLabel = viewMode === 'cy' ? 'CY' : 'Loads';

  // Header
  var headerLeft = e('div', {className:'header-left'},
    e('div', {className:'title'}, 'Ordered / Delivered / Poured'),
    e('div', {className:'pills'},
      PILL.spacingMin > 0 ? e('span', {className:'pill pill-spacing'},
        e('span', {className:'pill-label'}, 'Spacing'),
        e('span', {className:'pill-value'}, PILL.spacingMin + ' min')
      ) : null,
      PILL.rate > 0 ? e('span', {className:'pill pill-rate'},
        e('span', {className:'pill-label'}, 'Rate'),
        e('span', {className:'pill-value'}, PILL.rate.toFixed(2) + ' CY/HR')
      ) : null,
      PILL.scheduledQty > 0 ? e('span', {className:'pill pill-scheduled'},
        e('span', {className:'pill-label'}, 'Scheduled'),
        e('span', {className:'pill-value'}, PILL.scheduledQty.toFixed(2) + ' CY')
      ) : null,
      PILL.numberOfLoads > 0 ? e('span', {className:'pill pill-loads'},
        e('span', {className:'pill-label'}, 'Loads'),
        e('span', {className:'pill-value'}, String(PILL.numberOfLoads))
      ) : null,
      PILL.loadQty > 0 ? e('span', {className:'pill pill-loadsize'},
        e('span', {className:'pill-label'}, 'Load Size'),
        e('span', {className:'pill-value'}, PILL.loadQty.toFixed(2) + ' CY')
      ) : null
    )
  );

  var toggle = e('div', {className:'toggle'},
    e('button', {className: viewMode === 'cy' ? 'active' : '', onClick: function(){setViewMode('cy');}}, 'CY'),
    e('button', {className: viewMode === 'loads' ? 'active' : '', onClick: function(){setViewMode('loads');}}, 'Loads')
  );

  // Stripe pattern defs (matches performance-charts.tsx:2163-2180)
  var stripeDefs = e('defs', null,
    e('pattern', {id:'odp-stripe-ordered', patternUnits:'userSpaceOnUse', width:10, height:10},
      e('rect', {width:10, height:10, fill:'#3b82f6', fillOpacity:0.25}),
      e('path', {d:'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2', stroke:'#3b82f6', strokeWidth:3, strokeOpacity:0.6})
    ),
    e('pattern', {id:'odp-carryover-delivered', patternUnits:'userSpaceOnUse', width:10, height:10},
      e('rect', {width:10, height:10, fill:'#d1d5db', fillOpacity:0.5}),
      e('path', {d:'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2', stroke:'#6b7280', strokeWidth:3, strokeOpacity:0.7})
    )
  );

  var hasCarryover = viewMode === 'cy' && odpData.some(function(d){return d.deliveredCarryIn > 0;});

  // Helper: make an SVG <path> for a rounded-top rect. Matches web
  // performance-charts.tsx:2215,2256,2307 exactly.
  function roundedTopPath(x, y, width, height, r) {
    return 'M' + x + ',' + (y + r) +
      ' Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      ' L' + (x + width - r) + ',' + y +
      ' Q' + (x + width) + ',' + y + ' ' + (x + width) + ',' + (y + r) +
      ' L' + (x + width) + ',' + (y + height) +
      ' L' + x + ',' + (y + height) + ' Z';
  }

  // Custom X-axis boundary labels — exact port of web's <Customized/>
  // component (performance-charts.tsx:2099-2145). Draws hour labels at
  // band EDGES (not centers) with N+1 labels for N buckets.
  function CustomizedXAxis(props) {
    var xAxisMap = props.xAxisMap;
    var yAxisMap = props.yAxisMap;
    if (!xAxisMap || !yAxisMap) return e('g');
    var xAxis = xAxisMap[Object.keys(xAxisMap)[0]];
    var yAxis = yAxisMap[Object.keys(yAxisMap)[0]];
    if (!xAxis || !xAxis.scale || !yAxis) return e('g');
    var bandSize = xAxis.bandSize || 0;
    var axisY = yAxis.y + yAxis.height + 14;

    var children = [];
    for (var i = 0; i < odpData.length; i++) {
      (function(i){
        var bucket = odpData[i];
        var bucketX = xAxis.scale(bucket.label);
        if (bucketX === undefined) return;
        var leftEdge = bucketX;
        var groupKids = [
          e('text', {
            key: 't' + i,
            x: leftEdge,
            y: axisY,
            textAnchor: 'middle',
            fontSize: 11,
            fill: '${axisText}',
            fontWeight: 500
          }, bucket.label),
          e('line', {
            key: 'l' + i,
            x1: leftEdge,
            y1: yAxis.y + yAxis.height,
            x2: leftEdge,
            y2: yAxis.y + yAxis.height + 4,
            stroke: '${gridColor}',
            strokeWidth: 1
          })
        ];
        if (i === odpData.length - 1) {
          var parts = bucket.label.split(':');
          var totalMin = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0) + 60;
          var nextLabel = (Math.floor(totalMin / 60) % 24) + ':' + String(totalMin % 60).padStart(2, '0');
          groupKids.push(
            e('text', {
              key: 'nt',
              x: leftEdge + bandSize,
              y: axisY,
              textAnchor: 'middle',
              fontSize: 11,
              fill: '${axisText}',
              fontWeight: 500
            }, nextLabel)
          );
          groupKids.push(
            e('line', {
              key: 'nl',
              x1: leftEdge + bandSize,
              y1: yAxis.y + yAxis.height,
              x2: leftEdge + bandSize,
              y2: yAxis.y + yAxis.height + 4,
              stroke: '${gridColor}',
              strokeWidth: 1
            })
          );
        }
        children.push(e('g', {key: 'bnd-' + i}, groupKids));
      })(i);
    }
    return e('g', null, children);
  }

  // --- CUSTOM BAR SHAPES (byte-for-byte port of web shape functions) ---
  // Performance-charts.tsx:2206-2224 Ordered Solid: rounded top only if
  // orderedStriped === 0 (no segment above).
  function OrderedSolidShape(props) {
    var x = props.x, y = props.y, width = props.width, height = props.height;
    var payload = props.payload;
    if (!height || height <= 0) return e('g');
    var isTop = !payload || payload.orderedStriped <= 0;
    if (isTop) {
      return e('path', {d: roundedTopPath(x, y, width, height, 3), fill: '#3b82f6'});
    }
    return e('rect', {x:x, y:y, width:width, height:height, fill:'#3b82f6'});
  }

  // Performance-charts.tsx:2249-2260 — striped ordered always topmost.
  function OrderedStripedShape(props) {
    var x = props.x, y = props.y, width = props.width, height = props.height;
    if (!height || height <= 0) return e('g');
    return e('path', {d: roundedTopPath(x, y, width, height, 3), fill: 'url(#odp-stripe-ordered)'});
  }

  // Performance-charts.tsx:2269-2276 — delivered carry-in rect with border.
  function DeliveredCarryInShape(props) {
    var x = props.x, y = props.y, width = props.width, height = props.height;
    if (!height || height <= 0) return e('g');
    return e('rect', {
      x: x, y: y, width: width, height: height,
      fill: 'url(#odp-carryover-delivered)',
      stroke: '#1f2937',
      strokeWidth: 0.5
    });
  }

  // Performance-charts.tsx:2301-2311 — delivered solid always top of stack.
  function DeliveredSolidShape(props) {
    var x = props.x, y = props.y, width = props.width, height = props.height;
    if (!height || height <= 0) return e('g');
    return e('path', {d: roundedTopPath(x, y, width, height, 3), fill: '#1f2937'});
  }

  // --- CUSTOM LABEL CONTENT FUNCTIONS (byte-for-byte port) ---
  // Web 2189-2204: ordered solid label — only when orderedStriped is 0.
  function OrderedSolidLabel(props) {
    var x = props.x, y = props.y, width = props.width, index = props.index;
    var entry = odpData[index];
    if (!entry || entry.orderedStriped > 0) return null;
    var total = viewMode === 'cy' ? entry.ordered : entry.orderedCount;
    if (total <= 0) return null;
    return e('text', {
      x: x + width / 2,
      y: y - 5,
      textAnchor: 'middle',
      fontSize: 11,
      fill: '#3b82f6',
      fontWeight: 600
    }, viewMode === 'cy' ? fmtQty(total) : String(total));
  }

  // Web 2231-2248: ordered striped label — shows solid+striped total.
  function OrderedStripedLabel(props) {
    var x = props.x, y = props.y, width = props.width, index = props.index;
    var entry = odpData[index];
    if (!entry || entry.orderedStriped <= 0) return null;
    var total = viewMode === 'cy'
      ? (entry.orderedSolid + entry.orderedStriped)
      : (entry.orderedCountSolid + entry.orderedCountStriped);
    if (total <= 0) return null;
    return e('text', {
      x: x + width / 2,
      y: y - 5,
      textAnchor: 'middle',
      fontSize: 11,
      fill: '#3b82f6',
      fontWeight: 600
    }, viewMode === 'cy' ? fmtQty(total) : String(total));
  }

  // Web 2284-2299: delivered label — sum of carryIn + solid.
  function DeliveredLabel(props) {
    var x = props.x, y = props.y, width = props.width, index = props.index;
    var entry = odpData[index];
    if (!entry) return null;
    var total = viewMode === 'cy'
      ? (entry.deliveredCarryIn + entry.delivered)
      : entry.deliveredCount;
    if (total <= 0) return null;
    return e('text', {
      x: x + width / 2,
      y: y - 5,
      textAnchor: 'middle',
      fontSize: 11,
      fill: '#1f2937',
      fontWeight: 600
    }, viewMode === 'cy' ? fmtQty(total) : String(total));
  }

  var chart = e('div', {className:'chart-wrap'},
    e(R.ResponsiveContainer, {width:'100%', height:'100%'},
      e(R.BarChart, {
        data: odpData,
        margin: {top:20, right:30, bottom:20, left:5},
        barGap: 10,
        barCategoryGap: '35%'
      },
        stripeDefs,
        e(R.CartesianGrid, {strokeDasharray:'3 3', vertical:false, stroke:'#e5e7eb'}),
        // Hide default centered X-axis labels — we draw boundary labels via Customized
        e(R.XAxis, {
          dataKey: 'label',
          tick: false,
          tickLine: false,
          axisLine: {stroke: '#e5e7eb'}
        }),
        // Custom X-axis boundary labels at band edges
        e(R.Customized, { component: CustomizedXAxis }),
        e(R.YAxis, {
          tick: {fontSize:11, fill:'#6b7280'},
          tickLine: false,
          axisLine: false,
          allowDecimals: false,
          domain: [0, yMax],
          label: {
            value: unitLabel,
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            style: {fontSize:13, fill:'#6b7280', fontWeight:600}
          }
        }),
        e(R.Tooltip, {
          content: function(p){ return e(ODPTooltip, Object.assign({}, p, {viewMode:viewMode})); },
          cursor: {fill: '#f3f4f6', fillOpacity: 0.5}
        }),
        // Ordered: solid segment with custom shape + conditional label
        e(R.Bar, {
          dataKey: orderedSolidKey,
          name: 'Ordered Solid',
          stackId: 'ordered',
          fill: '#3b82f6',
          isAnimationActive: false,
          shape: OrderedSolidShape,
          label: {content: OrderedSolidLabel}
        }),
        // Ordered: striped padding (last bucket)
        e(R.Bar, {
          dataKey: orderedStripedKey,
          name: 'Ordered Striped',
          stackId: 'ordered',
          fill: 'url(#odp-stripe-ordered)',
          isAnimationActive: false,
          shape: OrderedStripedShape,
          label: {content: OrderedStripedLabel}
        }),
        // Delivered: carry-in striped segment (bottom)
        e(R.Bar, {
          dataKey: deliveredCarryInKey,
          name: 'Delivered CarryIn',
          stackId: 'delivered',
          fill: 'url(#odp-carryover-delivered)',
          isAnimationActive: false,
          shape: DeliveredCarryInShape
        }),
        // Delivered: solid segment (top of stack)
        e(R.Bar, {
          dataKey: deliveredSolidKey,
          name: 'Delivered',
          stackId: 'delivered',
          fill: '#1f2937',
          isAnimationActive: false,
          shape: DeliveredSolidShape,
          label: {content: DeliveredLabel}
        }),
        // Poured: simple solid bar (no striping)
        e(R.Bar, {
          dataKey: pouredKey,
          name: 'Poured',
          fill: '#84cc16',
          radius: [3,3,0,0],
          isAnimationActive: false,
          label: {
            position: 'top',
            fontSize: 11,
            fill: '#65a30d',
            fontWeight: 600,
            formatter: function(v){
              if (!(v > 0)) return '';
              return viewMode === 'cy' ? fmtQty(v) : String(v);
            }
          }
        })
      )
    )
  );

  var legend = e('div', {className:'legend'},
    e('div', {className:'legend-item'},
      e('span', {className:'legend-swatch', style:{background:'#3b82f6'}}),
      'Ordered'
    ),
    e('div', {className:'legend-item'},
      e('span', {className:'legend-swatch', style:{background:'#1f2937'}}),
      'Delivered'
    ),
    e('div', {className:'legend-item'},
      e('span', {className:'legend-swatch', style:{background:'#84cc16'}}),
      'Poured'
    ),
    hasCarryover ? e('div', {className:'legend-item'},
      e('span', {className:'legend-swatch', style:{background:'#d1d5db', border:'1px solid #6b7280'}}),
      'Carryover'
    ) : null
  );

  return e('div', {className:'card'},
    e('div', {className:'header'}, headerLeft, toggle),
    chart,
    legend
  );
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(e(HourlyODPChart));
} catch (err) {
  document.getElementById('root').innerHTML =
    '<div class="card"><div class="no-data">Chart render failed: ' + (err && err.message ? err.message : String(err)) + '</div></div>';
}

})();
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ODPChartWebView;
