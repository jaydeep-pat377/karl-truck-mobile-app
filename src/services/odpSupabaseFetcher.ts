/**
 * ODP direct Supabase fetcher.
 *
 * Bypasses the scraper API entirely for the Ordered/Delivered/Poured chart
 * and reads the raw data the web's `HourlyODPChart` reducer consumes — tickets
 * (+ their is_mix ticket_products) and order_products (+ their nested
 * order_product_schedules) — DIRECTLY from Supabase, using the same queries
 * the web runs in `truckast-dolese-readymix-frontend/src/actions/
 * orderTabDataActions.ts::fetchTickets` and `::fetchProductSchedule`.
 *
 * Because we hit the same Supabase tables with the same filters and the same
 * joins/projections, the mobile reducer is guaranteed to see byte-identical
 * input to the web. Any past "values don't match" issues that came from
 * backend SQL drift (`order_qty_unit='CY'` filter, non-deterministic
 * `LIMIT 1`, schedule selection differences, etc.) are architecturally
 * eliminated: we don't go through the backend at all.
 *
 * The returned payload conforms to `ODPRawForReducer` so the existing
 * WebView reducer consumes it unchanged.
 */

import { supabase } from './supabase/supabaseClient';
import type { ODPRawForReducer } from '../types/ticket';

/** Row shapes are intentionally loose — only the fields the reducer reads
 *  are typed. All other columns are ignored. */
interface RawTicketRow {
  ticket_id: number;
  ticket_code: string | null;
  truck_code: string | null;
  scheduled_on_job_time: string | null;
  on_job_time: string | null;
  wash_time: string | null;
  to_plant_time: string | null;
  remove_reason_code: string | null;
}

interface RawTicketProductRow {
  id: number;
  ticket_id: number;
  is_mix: boolean | null;
  load_qty: number | null;
}

interface RawSchedule {
  id: number;
  start_time: string | null;
  delivery_rate_per_hour: number | null;
  truck_space: number | null;
  schedule_qty: number | null;
  number_of_loads: number | null;
  load_qty: number | null;
}

interface RawOrderProductWithSchedules {
  id: number;
  is_mix: boolean | null;
  order_product_schedules: RawSchedule[] | null;
}

/**
 * Fetch raw ODP inputs from Supabase.
 *
 * @param orderCode  Order code (matches the web's `.eq("order_code", …)`).
 * @param orderDate  `YYYY-MM-DD` date string used to filter `order_date`
 *                   exactly the same way the web does (see
 *                   `orderTabDataActions.ts:382-387`).
 * @param orderId    Numeric order_id used for the `order_products` query
 *                   (web `fetchProductSchedule:192`).
 *
 * @returns          An `ODPRawForReducer` payload identical in shape and
 *                   content to what the web reducer sees. Returns `null`
 *                   if any query fails or no data is found (caller should
 *                   fall back to the backend-supplied payload in that
 *                   case).
 */
/**
 * Normalize any date string the caller might pass in to the `YYYY-MM-DD`
 * format the web uses for its Supabase date filters (see
 * orderTabDataActions.ts:384). Accepts:
 *   - "2026-04-11"                  → "2026-04-11"
 *   - "2026-04-11T00:00:00Z"        → "2026-04-11"
 *   - "2026-04-11T00:00:00+00:00"   → "2026-04-11"
 *   - Date-parseable anything else  → "YYYY-MM-DD" (UTC)
 */
function normalizeOrderDate(input: string): string {
  if (!input) return input;
  // Fast path: already YYYY-MM-DD
  const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // Slow path: parse and reformat
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchOdpRawFromSupabase(
  orderCode: string,
  orderDate: string,
  orderId: number | string,
): Promise<ODPRawForReducer | null> {
  try {
    const normalizedDate = normalizeOrderDate(orderDate);

    // -----------------------------------------------------------------
    // 1. Tickets — mirrors orderTabDataActions.ts:340-398
    //    Same `.eq("order_code", …)` + date-range filter on order_date.
    // -----------------------------------------------------------------
    let ticketsQuery = supabase
      .from('tickets')
      .select(
        `
        ticket_id,
        ticket_code,
        truck_code,
        scheduled_on_job_time,
        on_job_time,
        wash_time,
        to_plant_time,
        remove_reason_code
      `,
      )
      .eq('order_code', orderCode);

    if (normalizedDate) {
      const dateFrom = `${normalizedDate}T00:00:00`;
      const dateTo = `${normalizedDate}T23:59:59`;
      ticketsQuery = ticketsQuery
        .gte('order_date', dateFrom)
        .lte('order_date', dateTo);
    }

    const { data: ticketsData, error: ticketsError } = await ticketsQuery;
    if (ticketsError) {
      console.warn(
        '[odpSupabaseFetcher] tickets query failed:',
        ticketsError.message,
      );
      return null;
    }
    if (!ticketsData || ticketsData.length === 0) {
      // No tickets — still return empty raw payload so reducer can decide
      // whether to render (it will return empty buckets → WebView hides).
      // We still need to fetch the schedule to tell the reducer the rate,
      // because the web's "no tickets yet, use schedule duration" branch
      // relies on productScheduleItems being populated.
    }

    const ticketRows = (ticketsData || []) as RawTicketRow[];
    const ticketIds = ticketRows.map((t) => t.ticket_id);

    // -----------------------------------------------------------------
    // 2. Ticket products — mirrors orderTabDataActions.ts:400-447
    //    Fetched without any `is_mix` filter; reducer picks the mix via
    //    `Array.find(p => p.is_mix === true)`. We order by `id ASC` to
    //    match Supabase's default physical order for deterministic
    //    primary-mix-product selection on tickets with multiple mixes.
    // -----------------------------------------------------------------
    const productsByTicketId = new Map<number, RawTicketProductRow[]>();
    if (ticketIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('ticket_products')
        .select(
          `
          id,
          ticket_id,
          is_mix,
          load_qty
        `,
        )
        .in('ticket_id', ticketIds)
        .order('id', { ascending: true });

      if (productsError) {
        console.warn(
          '[odpSupabaseFetcher] ticket_products query failed:',
          productsError.message,
        );
        return null;
      }

      for (const p of (productsData || []) as RawTicketProductRow[]) {
        const tid = p.ticket_id;
        if (!productsByTicketId.has(tid)) {
          productsByTicketId.set(tid, []);
        }
        productsByTicketId.get(tid)!.push(p);
      }
    }

    // -----------------------------------------------------------------
    // 3. Product schedules — mirrors orderTabDataActions.ts:145-316
    //    No `is_mix` filter, no unit filter. Reducer picks the first
    //    `is_mix === true` product. `.order("id", ASC)` guarantees a
    //    stable primary-schedule selection that matches Supabase's
    //    default physical order (which the web relies on).
    // -----------------------------------------------------------------
    const { data: productsWithSchedules, error: schedError } = await supabase
      .from('order_products')
      .select(
        `
        id,
        is_mix,
        order_product_schedules (
          id,
          start_time,
          delivery_rate_per_hour,
          truck_space,
          schedule_qty,
          number_of_loads,
          load_qty
        )
      `,
      )
      .eq('order_id', orderId)
      .order('id', { ascending: true });

    if (schedError) {
      console.warn(
        '[odpSupabaseFetcher] order_products query failed:',
        schedError.message,
      );
      return null;
    }

    if (!productsWithSchedules || productsWithSchedules.length === 0) {
      return null;
    }

    // -----------------------------------------------------------------
    // 4. Shape into ODPRawForReducer — exact field names the reducer
    //    inside the WebView HTML expects (performance-charts.tsx
    //    lines 1504-1932). Do NOT drop fields or rename them.
    // -----------------------------------------------------------------
    const raw: ODPRawForReducer = {
      tickets: ticketRows.map((t) => {
        const products = productsByTicketId.get(t.ticket_id) || [];
        return {
          ticket_code: t.ticket_code || null,
          truck_code: t.truck_code || null,
          remove_reason_code: t.remove_reason_code || null,
          on_job_time: t.on_job_time || null,
          wash_time: t.wash_time || null,
          to_plant_time: t.to_plant_time || null,
          scheduled_on_job_time: t.scheduled_on_job_time || null,
          // Preserve full products list so `getLoadQty` finds the first
          // `is_mix === true` exactly like the web does.
          ticket_products: products.map((p) => ({
            is_mix: !!p.is_mix,
            load_qty: typeof p.load_qty === 'number' ? p.load_qty : 0,
          })),
        };
      }),
      productScheduleItems: (
        productsWithSchedules as unknown as RawOrderProductWithSchedules[]
      ).map((p) => ({
        is_mix: !!p.is_mix,
        schedules: (p.order_product_schedules || []).map((s) => ({
          delivery_rate_per_hour:
            typeof s.delivery_rate_per_hour === 'number'
              ? s.delivery_rate_per_hour
              : 0,
          truck_space: typeof s.truck_space === 'number' ? s.truck_space : 0,
          schedule_qty:
            typeof s.schedule_qty === 'number' ? s.schedule_qty : 0,
          number_of_loads:
            typeof s.number_of_loads === 'number' ? s.number_of_loads : 0,
          load_qty: typeof s.load_qty === 'number' ? s.load_qty : 0,
          start_time: s.start_time || '',
          loads: [],
        })),
      })),
    };

    return raw;
  } catch (err) {
    console.warn(
      '[odpSupabaseFetcher] unexpected error:',
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
