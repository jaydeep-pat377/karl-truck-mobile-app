/**
 * Ordered / Delivered / Poured reducer — TypeScript port of the web
 * `HourlyODPChart` odpData reducer.
 *
 * Source: truckast-dolese-readymix-frontend/src/app/(protected)/orders/
 *         _components/performance-charts.tsx lines 1504-1932.
 *
 * Ported VERBATIM to TypeScript. The control flow, every Math.round,
 * every Math.max, every fallback, every filter — all identical to the
 * web. The only differences are syntactic:
 *   - `Map<number, number>` ↔ `Record<number, number>` (plain objects)
 *   - No `React.useMemo` wrapper (the caller memoizes if needed)
 *   - TypeScript type annotations added
 *
 * The verification harness at
 *   Truckast-python-scrapper-api/scripts/verify-odp-vs-web.js
 * runs an identical JS port of this same logic against the backend's
 * buildODPData and proves they produce byte-for-byte identical buckets
 * on 8 test cases including the 21 vs 31.5 repro.
 *
 * NOTE: Do not modify this file without also updating the backend
 *       buildODPData and re-running the verification harness.
 */

import type { ODPRawForReducer, ODPRawTicket } from '../types/ticket';

// ---------------------------------------------------------------------------
// Output bucket type — mirrors the web's ODPBucket (performance-charts.tsx
// types around line 1788). Field names use snake_case where the current
// mobile ODPChart reads them, plus a few extras the reducer needs.
// ---------------------------------------------------------------------------
export interface WebReducerBucket {
  // X axis
  hour_index: number;
  hour_label: string;
  // CY
  ordered: number;
  ordered_solid: number;
  ordered_striped: number;
  delivered: number;
  delivered_carry_in: number;
  delivered_solid: number;
  delivered_carry_out: number;
  poured: number;
  // Loads
  ordered_loads: number;
  ordered_loads_solid: number;
  ordered_loads_striped: number;
  delivered_loads: number;
  poured_loads: number;
  // Meta
  is_overtime: boolean;
}

// ---------------------------------------------------------------------------
// getLoadQty — matches web (performance-charts.tsx getLoadQty).
// Returns the mix ticket_product's load_qty, or 0 if none.
// ---------------------------------------------------------------------------
function getLoadQty(ticket: ODPRawTicket): number {
  const mix = (ticket.ticket_products || []).find((p) => p.is_mix === true);
  return (mix && mix.load_qty) || 0;
}

// ---------------------------------------------------------------------------
// runWebReducer — the full web reducer, line-for-line.
// ---------------------------------------------------------------------------
export function runWebReducer(
  raw: ODPRawForReducer,
  xAxisDomain?: [number, number],
): WebReducerBucket[] {
  const productScheduleItems = raw.productScheduleItems || [];
  const tickets = raw.tickets || [];

  // ----- scheduleLoadQty / orderedRatePerHour / truckSpace ---------------
  let scheduleLoadQty = 0;
  let orderedRatePerHour = 0;
  let truckSpace = 0;
  for (const psi of productScheduleItems) {
    if (psi.is_mix && psi.schedules && psi.schedules.length) {
      const sched = psi.schedules[0];
      if (sched.delivery_rate_per_hour && sched.delivery_rate_per_hour > 0) {
        orderedRatePerHour = sched.delivery_rate_per_hour;
      }
      if (sched.truck_space && sched.truck_space > 0) {
        truckSpace = sched.truck_space;
      }
      if (sched.load_qty && sched.load_qty > 0) {
        scheduleLoadQty = sched.load_qty;
      }
      // Web line 1525-1532: loads[] load_qty fallback
      if (sched.loads && sched.loads.length) {
        for (const L of sched.loads as Array<{ load_qty?: number }>) {
          if (L.load_qty && L.load_qty > 0 && scheduleLoadQty <= 0) {
            scheduleLoadQty = L.load_qty;
            break;
          }
        }
      }
      break;
    }
  }

  // ----- scheduledStartHour / scheduledStartMinute -----------------------
  let scheduledStartHour: number | null = null;
  let scheduledStartMinute = 0;
  for (const psi of productScheduleItems) {
    if (psi.is_mix && psi.schedules && psi.schedules.length) {
      const startTimeStr = psi.schedules[0].start_time;
      if (startTimeStr) {
        const cleaned = String(startTimeStr)
          .trim()
          .replace(/Z$|[+-]\d{2}:\d{2}$/, '');
        const m = cleaned.match(/(\d{2}):(\d{2})/);
        if (m) {
          scheduledStartHour = parseInt(m[1], 10);
          scheduledStartMinute = parseInt(m[2], 10);
        }
      }
      break;
    }
  }

  // ----- anchors (unfloored, single source of truth) ---------------------
  // Web lines 1561-1569: when xAxisDomain is provided, use its floored
  // start hour so bucket boundaries align with the Pour Speed chart.
  let startMinFromMidnight: number;
  if (xAxisDomain) {
    const domainStartDate = new Date(xAxisDomain[0]);
    startMinFromMidnight =
      domainStartDate.getUTCHours() * 60 + domainStartDate.getUTCMinutes();
  } else {
    startMinFromMidnight =
      scheduledStartHour !== null
        ? scheduledStartHour * 60 + scheduledStartMinute
        : 0;
  }
  // Clamping always uses actual scheduled time, not xAxisDomain start
  const scheduledStartMinFromMidnight =
    scheduledStartHour !== null
      ? scheduledStartHour * 60 + scheduledStartMinute
      : 0;

  const formatTimeLabel = (totalMin: number): string => {
    const h = Math.floor(totalMin / 60);
    const mn = totalMin % 60;
    return `${h}:${mn < 10 ? '0' + mn : mn}`;
  };

  const getBucketForData = (minutes: number): number =>
    Math.max(0, Math.floor((minutes - startMinFromMidnight) / 60));

  // ----- expectedEndBucket ------------------------------------------------
  let expectedEndBucket: number | null = null;
  for (const psi of productScheduleItems) {
    if (psi.is_mix && psi.schedules && psi.schedules.length) {
      const s2 = psi.schedules[0];
      const nL = s2.number_of_loads || 0;
      const tS = s2.truck_space || 0;
      if (nL > 0 && tS > 0) {
        expectedEndBucket = Math.ceil((nL * tS) / 60);
      }
      break;
    }
  }

  // ----- getMinutes from ISO timestamp (UTC) -----------------------------
  const getMinutes = (timeStr: string | null | undefined): number | null => {
    if (!timeStr) return null;
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return null;
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  };

  // ----- per-bucket raw maps ----------------------------------------------
  const orderedCountMap: Record<number, number> = {};
  const deliveredMap: Record<number, number> = {};
  const deliveredCountMap: Record<number, number> = {};
  const pouredMap: Record<number, number> = {};
  const pouredCountMap: Record<number, number> = {};

  for (const t of tickets) {
    if (
      t.remove_reason_code &&
      String(t.remove_reason_code).trim() !== ''
    ) {
      continue;
    }
    let qty = getLoadQty(t);
    if (qty <= 0 && scheduleLoadQty > 0) qty = scheduleLoadQty;
    if (qty <= 0) continue;

    const orderedMin = getMinutes(t.scheduled_on_job_time);
    if (orderedMin !== null) {
      const b = getBucketForData(orderedMin);
      orderedCountMap[b] = (orderedCountMap[b] || 0) + 1;
    }
    const deliveredMin = getMinutes(t.on_job_time);
    if (deliveredMin !== null) {
      const clamped = Math.max(deliveredMin, scheduledStartMinFromMidnight);
      const b = getBucketForData(clamped);
      deliveredMap[b] = (deliveredMap[b] || 0) + qty;
      deliveredCountMap[b] = (deliveredCountMap[b] || 0) + 1;
    }
    const pouredMin = getMinutes(t.wash_time || t.to_plant_time);
    if (pouredMin !== null) {
      const clamped = Math.max(pouredMin, scheduledStartMinFromMidnight);
      const b = getBucketForData(clamped);
      pouredMap[b] = (pouredMap[b] || 0) + qty;
      pouredCountMap[b] = (pouredCountMap[b] || 0) + 1;
    }
  }

  // ----- bucket range ----------------------------------------------------
  const allBuckets: Record<number, boolean> = {};
  for (const k of Object.keys(deliveredMap)) allBuckets[Number(k)] = true;
  for (const k of Object.keys(pouredMap)) allBuckets[Number(k)] = true;
  for (const k of Object.keys(orderedCountMap)) allBuckets[Number(k)] = true;

  let bucketKeys = Object.keys(allBuckets).map(Number);

  // Schedule-based empty fill (matches web lines 1695-1716)
  if (
    bucketKeys.length === 0 &&
    orderedRatePerHour > 0 &&
    scheduledStartHour !== null
  ) {
    for (const psi of productScheduleItems) {
      if (psi.is_mix && psi.schedules && psi.schedules.length) {
        const s3 = psi.schedules[0];
        const nL3 = s3.number_of_loads || 0;
        const tS3 = s3.truck_space || 0;
        if (nL3 > 0 && tS3 > 0) {
          const durH = Math.ceil((nL3 * tS3) / 60);
          for (let h = 0; h <= durH; h++) {
            allBuckets[h] = true;
          }
          bucketKeys = Object.keys(allBuckets).map(Number);
        }
        break;
      }
    }
  }

  if (bucketKeys.length === 0) return [];

  // Web lines 1721-1739: when xAxisDomain is provided, extend the bucket
  // range to cover the full Pour Speed chart time range.
  let minBucket: number;
  let maxBucket: number;
  if (xAxisDomain && scheduledStartHour !== null) {
    const durationMs = xAxisDomain[1] - xAxisDomain[0];
    const durationHours = Math.ceil(durationMs / (60 * 60 * 1000));
    minBucket = 0;
    maxBucket = durationHours - 1;
  } else {
    bucketKeys.sort((a, b) => a - b);
    minBucket = Math.min(0, bucketKeys[0]);
    maxBucket = bucketKeys[bucketKeys.length - 1];
  }

  const orderedRate = Math.round(orderedRatePerHour * 100) / 100;
  const loadsPerHour = truckSpace > 0 ? Math.floor(60 / truckSpace) : 0;

  // ----- totalOrderedQty / totalLoads from primary schedule --------------
  let totalOrderedQty = 0;
  let totalLoads = 0;
  for (const psi of productScheduleItems) {
    if (psi.is_mix && psi.schedules && psi.schedules.length) {
      const s4 = psi.schedules[0];
      if (s4.schedule_qty && s4.schedule_qty > 0) {
        totalOrderedQty = s4.schedule_qty;
      }
      if (s4.number_of_loads && s4.number_of_loads > 0) {
        totalLoads = s4.number_of_loads;
      }
      break;
    }
  }

  // Fallback from tickets (matches web lines 1768-1775)
  if (totalOrderedQty === 0 && tickets.length > 0) {
    for (const t of tickets) {
      if (
        t.remove_reason_code &&
        String(t.remove_reason_code).trim() !== ''
      ) {
        continue;
      }
      let q = getLoadQty(t);
      if (q <= 0 && scheduleLoadQty > 0) q = scheduleLoadQty;
      if (q > 0) totalOrderedQty += q;
      totalLoads++;
    }
  }

  let remainingOrdered = totalOrderedQty;
  let remainingLoads = totalLoads;
  const scheduledStartBucket =
    scheduledStartHour !== null
      ? Math.floor(
          (scheduledStartMinFromMidnight - startMinFromMidnight) / 60,
        )
      : 0;

  // ----- First pass: raw buckets -----------------------------------------
  interface RawBucket {
    h: number;
    label: string;
    ordered: number;
    delivered: number;
    poured: number;
    orderedCount: number;
    deliveredCount: number;
    pouredCount: number;
    isOvertime: boolean;
  }
  const rawBuckets: RawBucket[] = [];
  for (let b = minBucket; b <= maxBucket; b++) {
    const isScheduledHour = b >= scheduledStartBucket;
    const orderedForHour =
      orderedRate > 0 && isScheduledHour
        ? Math.min(orderedRate, Math.max(0, remainingOrdered))
        : 0;
    if (isScheduledHour) remainingOrdered -= orderedForHour;
    const orderedLoadsForHour =
      loadsPerHour > 0 && isScheduledHour
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
      isOvertime: expectedEndBucket !== null && b >= expectedEndBucket,
    });
  }

  // ----- find lastOrderedIndex -------------------------------------------
  let lastOrderedIndex = -1;
  for (let i = rawBuckets.length - 1; i >= 0; i--) {
    if (rawBuckets[i].ordered > 0) {
      lastOrderedIndex = i;
      break;
    }
  }

  // ----- Second pass: carryover + striped padding ------------------------
  let carryOver = 0;
  const result: WebReducerBucket[] = [];
  for (let ri = 0; ri < rawBuckets.length; ri++) {
    const rb = rawBuckets[ri];
    const carryIn = carryOver;
    let deliveredSolid = rb.delivered;
    let deliveredCarryIn = 0;
    const deliveredCarryOut = 0;

    if (rb.poured > rb.delivered) {
      const pouredFromBacklog = rb.poured - rb.delivered;
      deliveredCarryIn = Math.min(carryIn, pouredFromBacklog);
      deliveredSolid = rb.delivered;
      carryOver = Math.max(0, carryIn - pouredFromBacklog);
    } else {
      deliveredCarryIn = 0;
      deliveredSolid = rb.delivered;
      carryOver = carryOver + (rb.delivered - rb.poured);
    }

    let orderedSolid = rb.ordered;
    let orderedStriped = 0;
    let orderedLoadsSolid = rb.orderedCount;
    let orderedLoadsStriped = 0;
    if (
      ri === lastOrderedIndex &&
      rb.ordered > 0 &&
      rb.ordered < orderedRate
    ) {
      orderedSolid = rb.ordered;
      orderedStriped = orderedRate - rb.ordered;
      orderedLoadsSolid = rb.orderedCount;
      orderedLoadsStriped = loadsPerHour - rb.orderedCount;
    }

    result.push({
      hour_index: rb.h,
      hour_label: rb.label,
      // CY mode
      ordered: Math.round(rb.ordered * 100) / 100,
      ordered_solid: Math.round(orderedSolid * 100) / 100,
      ordered_striped: Math.round(orderedStriped * 100) / 100,
      delivered: Math.round(rb.delivered * 100) / 100,
      delivered_carry_in: Math.round(deliveredCarryIn * 100) / 100,
      delivered_solid: Math.round(deliveredSolid * 100) / 100,
      delivered_carry_out: Math.round(deliveredCarryOut * 100) / 100,
      poured: Math.round(rb.poured * 100) / 100,
      // Loads mode
      ordered_loads: rb.orderedCount,
      ordered_loads_solid: orderedLoadsSolid,
      ordered_loads_striped: orderedLoadsStriped,
      delivered_loads: rb.deliveredCount,
      poured_loads: rb.pouredCount,
      // Meta
      is_overtime: rb.isOvertime,
    });
  }

  // ----- Filter empty buckets (web lines 1917-1929) -----------------------
  // When xAxisDomain is provided, keep ALL buckets for chart alignment.
  if (xAxisDomain) {
    return result;
  }
  return result.filter(
    (b) => b.ordered > 0 || b.delivered > 0 || b.poured > 0,
  );
}

// ---------------------------------------------------------------------------
// computeWebYMax — matches web performance-charts.tsx:1949-1997
// ---------------------------------------------------------------------------
export function computeWebYMax(
  buckets: WebReducerBucket[],
  raw: ODPRawForReducer,
  viewMode: 'cy' | 'loads',
): number {
  if (viewMode === 'loads') {
    let maxLoad = 0;
    for (const b of buckets) {
      const v = Math.max(
        b.ordered_loads_solid + b.ordered_loads_striped,
        b.delivered_loads,
        b.poured_loads,
      );
      if (v > maxLoad) maxLoad = v;
    }
    return Math.max(2, Math.ceil(maxLoad * 1.2));
  }

  // CY mode
  let orderedRate = 32;
  for (const psi of raw.productScheduleItems || []) {
    if (psi.is_mix && psi.schedules && psi.schedules.length) {
      const r = psi.schedules[0].delivery_rate_per_hour;
      if (r && r > 0) orderedRate = r;
      break;
    }
  }
  const baseMax = Math.ceil(orderedRate * 1.4);
  let maxDataValue = 0;
  for (const b of buckets) {
    const v1 = b.delivered_carry_in + b.delivered;
    const v2 = b.poured;
    const v3 = b.ordered;
    if (v1 > maxDataValue) maxDataValue = v1;
    if (v2 > maxDataValue) maxDataValue = v2;
    if (v3 > maxDataValue) maxDataValue = v3;
  }
  const targetMax = Math.max(baseMax, Math.ceil(maxDataValue * 1.1));
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
