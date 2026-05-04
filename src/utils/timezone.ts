/**
 * Timezone utilities for the mobile app.
 * Mirrors the web frontend's date-time-format.ts using Intl.DateTimeFormat.
 */

export interface TimezoneInfo {
  id: number;
  iana_code: string;
  display_name: string;
  abbreviation: string;
  utc_offset: string;
  dst_offset: string | null;
  current_abbreviation?: string;
  current_utc_offset?: string;
  current_time?: string;
  current_datetime?: string;
}

/**
 * CDT default — only used as initial state before login response arrives.
 * After login, the timezone always comes from the API (user preference or tenant default).
 * This is never shown to the user if login succeeds.
 */
export const CDT_INITIAL: TimezoneInfo = {
  id: 2,
  iana_code: 'America/Chicago',
  display_name: 'Central Time',
  abbreviation: 'CT',
  utc_offset: '-06:00',
  dst_offset: '-05:00',
};

/**
 * Get the current timezone abbreviation (handles DST automatically).
 * E.g. returns "CST" in winter, "CDT" in summer for America/Chicago.
 */
export function getTzAbbreviation(ianaCode: string, date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaCode,
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch {
    return '';
  }
}

/**
 * Format a date string or Date object into the user's timezone.
 * @param dateInput - ISO string, Date object, or date string
 * @param ianaCode - IANA timezone code (e.g. "America/Chicago")
 * @param format - Output format
 */
export function formatDateInTz(
  dateInput: string | Date | null | undefined,
  ianaCode: string,
  format: 'short' | 'medium' | 'long' = 'medium',
): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return String(dateInput);

    const options: Intl.DateTimeFormatOptions = { timeZone: ianaCode };

    switch (format) {
      case 'short':
        options.month = '2-digit';
        options.day = '2-digit';
        options.year = 'numeric';
        break;
      case 'medium':
        options.day = '2-digit';
        options.month = 'short';
        options.year = 'numeric';
        break;
      case 'long':
        options.weekday = 'short';
        options.day = '2-digit';
        options.month = 'short';
        options.year = 'numeric';
        break;
    }

    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Format a time string or Date object into the user's timezone.
 * @param timeInput - ISO string, Date object, or time string
 * @param ianaCode - IANA timezone code
 * @param show24h - Use 24-hour format
 * @param showTzAbbr - Append timezone abbreviation
 */
export function formatTimeInTz(
  timeInput: string | Date | null | undefined,
  ianaCode: string,
  show24h: boolean = false,
  showTzAbbr: boolean = true,
): string {
  if (!timeInput) return '';
  try {
    const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
    if (isNaN(date.getTime())) return String(timeInput);

    const options: Intl.DateTimeFormatOptions = {
      timeZone: ianaCode,
      hour: '2-digit',
      minute: '2-digit',
      hour12: !show24h,
    };

    let formatted = new Intl.DateTimeFormat('en-US', options).format(date);

    if (showTzAbbr) {
      const abbr = getTzAbbreviation(ianaCode, date);
      if (abbr) formatted += ` ${abbr}`;
    }

    return formatted;
  } catch {
    return String(timeInput);
  }
}

/**
 * Format a full datetime in the user's timezone.
 */
export function formatDateTimeInTz(
  dateInput: string | Date | null | undefined,
  ianaCode: string,
  showTzAbbr: boolean = true,
): string {
  if (!dateInput) return '';
  const datePart = formatDateInTz(dateInput, ianaCode, 'medium');
  const timePart = formatTimeInTz(dateInput, ianaCode, false, showTzAbbr);
  return `${datePart} ${timePart}`.trim();
}
