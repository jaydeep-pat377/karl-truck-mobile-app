import type { WidgetData } from '../../../types/ai-assistant';

/**
 * Shared helpers for the AI-assistant dashboard widgets.
 */

/**
 * Chart palette aligned to the web app's chart colors (same hue order), so a
 * given slice/series gets the same color on mobile as on web.
 * web order: blue, teal, amber, purple, red, cyan, pink, green.
 */
export const CHART_PALETTE: string[] = [
  '#2563EB', // blue
  '#2EB887', // teal/green
  '#FABB1F', // amber
  '#B45EE0', // purple
  '#DC2626', // red
  '#2697D9', // cyan-blue
  '#DB4D8F', // pink
  '#39AC39', // green
  '#F97316', // orange (extra)
  '#6366F1', // indigo (extra)
];

/** Pick a palette color by index (wraps around). */
export function paletteColor(index: number): string {
  const i = ((index % CHART_PALETTE.length) + CHART_PALETTE.length) % CHART_PALETTE.length;
  return CHART_PALETTE[i];
}

/** Add thousands separators to an integer-ish string of digits. */
function withThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a number for display according to an optional config format.
 *  - 'compact'    -> 1.2K / 3.4M / 5.6B
 *  - 'percentage' -> `${n}%`
 *  - 'currency'   -> `$` + thousands separated
 *  - default      -> thousands separated, up to 1 decimal when not an integer
 */
export function formatValue(n: number, format?: string): string {
  if (!Number.isFinite(n)) {
    return '—';
  }

  switch (format) {
    case 'compact': {
      const abs = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      if (abs >= 1_000_000_000) {
        return `${sign}${trimZero(abs / 1_000_000_000)}B`;
      }
      if (abs >= 1_000_000) {
        return `${sign}${trimZero(abs / 1_000_000)}M`;
      }
      if (abs >= 1_000) {
        return `${sign}${trimZero(abs / 1_000)}K`;
      }
      return `${sign}${trimZero(abs)}`;
    }
    case 'percentage': {
      return `${trimZero(n)}%`;
    }
    case 'currency': {
      const sign = n < 0 ? '-' : '';
      const abs = Math.abs(n);
      const rounded = Math.round(abs * 100) / 100;
      const isInt = Number.isInteger(rounded);
      const fixed = isInt ? String(rounded) : rounded.toFixed(2);
      const [intPart, decPart] = fixed.split('.');
      return `${sign}$${withThousands(intPart)}${decPart ? `.${decPart}` : ''}`;
    }
    default: {
      const isInt = Number.isInteger(n);
      const sign = n < 0 ? '-' : '';
      const abs = Math.abs(n);
      if (isInt) {
        return `${sign}${withThousands(String(abs))}`;
      }
      const rounded = Math.round(abs * 10) / 10;
      const [intPart, decPart] = String(rounded).split('.');
      return `${sign}${withThousands(intPart)}${decPart ? `.${decPart}` : ''}`;
    }
  }
}

/** Format a value to at most 1 decimal place, dropping a trailing .0 */
function trimZero(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** A normalized series point. */
export interface SeriesPoint {
  label: string;
  value: number;
}

function isNumericVal(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== '' && Number.isFinite(Number(s));
}

/**
 * Map widget rows to a {label, value} series.
 *
 * The AI's aggregate rows carry the real column names: the measure is the
 * `value` column and the category is the `groupBy` column (e.g. rows like
 * `{ value: 955, current_status: "4" }` with groupBy "current_status"). We must
 * NOT guess by "first numeric column" — the group key can itself be numeric
 * (a status code), which would swap label/value. Resolution order:
 *   - value column: config.yAxis, else a literal `value` column, else the
 *     first numeric column that isn't the label, else the second column
 *   - label column: config.xAxis, else the aggregate `groupBy` column, else
 *     the column that isn't the value column, else the first column
 */
export function toSeries(
  data: WidgetData | null,
  config?: { xAxis?: string; yAxis?: string },
  groupBy?: string,
): SeriesPoint[] {
  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    return [];
  }
  const rows = data.rows.filter(
    (r): r is Record<string, unknown> => !!r && typeof r === 'object',
  );
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  if (keys.length === 0) return [];

  // Resolve the value (measure) column first.
  let valueKey: string | undefined =
    config?.yAxis && keys.includes(config.yAxis) ? config.yAxis : undefined;
  if (!valueKey && keys.includes('value')) valueKey = 'value';

  // Resolve the label (category) column.
  let labelKey: string | undefined =
    config?.xAxis && keys.includes(config.xAxis) ? config.xAxis : undefined;
  if (!labelKey && groupBy && keys.includes(groupBy)) labelKey = groupBy;
  if (!labelKey) labelKey = keys.find((k) => k !== valueKey) ?? keys[0];

  // If value still unresolved, pick a numeric column that isn't the label.
  if (!valueKey) valueKey = keys.find((k) => k !== labelKey && isNumericVal(rows[0][k]));
  if (!valueKey) valueKey = keys.find((k) => k !== labelKey);
  if (!valueKey) valueKey = keys[0];

  const out: SeriesPoint[] = [];
  for (const row of rows) {
    const rawLabel = row[labelKey];
    if (rawLabel === undefined || rawLabel === null) continue;
    const num = Number(row[valueKey]);
    out.push({
      label: String(rawLabel),
      value: Number.isFinite(num) ? num : 0,
    });
  }
  return out;
}

/**
 * Round a maximum value up to a "nice" axis bound so gridlines land on
 * readable numbers. Always returns a strictly positive value.
 */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(max));
  const magnitude = Math.pow(10, exponent);
  const fraction = max / magnitude;

  let niceFraction: number;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 2.5) {
    niceFraction = 2.5;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * magnitude;
}
