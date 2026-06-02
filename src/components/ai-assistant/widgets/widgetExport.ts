/** Export a widget's rows as a CSV file and open the native share sheet. */
import { Platform } from 'react-native';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { Widget } from '../../../types/ai-assistant';

function csvFromRows(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => escape(r[c])).join(','));
  return lines.join('\n');
}

function safeName(title?: string): string {
  return (
    (title || 'widget')
      .replace(/[^a-z0-9-_ ]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase() || 'widget'
  );
}

export async function shareWidgetCsv(widget: Widget): Promise<void> {
  const rows = widget.data?.rows;
  if (!rows || rows.length === 0) return;
  const csv = csvFromRows(rows as Record<string, unknown>[]);
  const name = safeName(widget.title);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}.csv`;
  await ReactNativeBlobUtil.fs.writeFile(path, csv, 'utf8');
  const url = Platform.OS === 'android' ? `file://${path}` : path;
  try {
    await Share.open({
      url,
      type: 'text/csv',
      filename: `${name}.csv`,
      failOnCancel: false,
    });
  } catch {
    /* user dismissed the share sheet */
  }
}
