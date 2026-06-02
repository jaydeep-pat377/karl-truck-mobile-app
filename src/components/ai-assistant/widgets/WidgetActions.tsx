/**
 * Per-widget action row: Info (query/rows), Download (CSV), and Verify
 * (re-aggregate + ground-truth count + anomaly check) — mirrors the web
 * dashboard widget controls.
 */
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon, BottomSheet } from '../../common';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { colors } from '../../../theme/colors';
import { aiAssistantService } from '../../../api/services/aiAssistantService';
import { shareWidgetCsv } from './widgetExport';
import { DataTableWidget } from './DataTableWidget';
import { formatValue } from './chartUtils';
import type { Widget, VerifyResult, VerifyStatus } from '../../../types/ai-assistant';

interface AggregateConfig {
  groupBy?: string;
  method: 'count' | 'count_distinct' | 'sum' | 'avg';
  valueColumn?: string;
  dateFormat?: 'date' | 'month' | 'year';
  sort?: string;
  topN?: number;
}
interface QueryConfig {
  table: string;
  filters?: { column: string; operator: string; value?: unknown }[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

const STATUS_META: Record<
  VerifyStatus,
  { icon: string; label: string; color: (t: any) => string }
> = {
  idle: { icon: 'shield-check-outline', label: 'Verify', color: (t) => t.colors.textSecondary },
  loading: { icon: 'progress-clock', label: 'Verifying…', color: (t) => t.colors.textSecondary },
  verified: { icon: 'check-decagram', label: 'Verified', color: () => colors.success.main },
  diverges: { icon: 'alert-outline', label: 'Diverges', color: () => colors.warning.main },
  anomaly: { icon: 'flash', label: 'Anomaly', color: () => colors.eta.main },
  error: { icon: 'alert-circle-outline', label: 'Failed', color: () => colors.error.main },
};

const OP_LABEL: Record<string, string> = {
  eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
  in: 'in', not_in: 'not in', like: 'like', ilike: 'ilike', is: 'is', is_not: 'is not',
};

export function WidgetActions({ widget }: { widget: Widget }) {
  const theme = useAppTheme();
  const [infoOpen, setInfoOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = (widget as unknown as { query?: QueryConfig }).query;
  const aggregate = (widget as unknown as { aggregate?: AggregateConfig }).aggregate;
  const rows = widget.data?.rows;
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const canVerify = !!aggregate && !!query;
  const showInfo = !!query || hasRows;

  if (!showInfo && !hasRows && !canVerify) return null;

  const runVerify = async () => {
    if (!query || !aggregate) return;
    setStatus('loading');
    setError(null);
    setVerifyOpen(true);
    try {
      const data = await aiAssistantService.verifyWidget({
        table: query.table,
        filters: query.filters,
        groupBy: aggregate.groupBy,
        method: aggregate.method,
        valueColumn: aggregate.valueColumn,
        dateFormat: aggregate.dateFormat,
        sort: aggregate.sort,
        topN: aggregate.topN,
      });
      setResult(data);
      setStatus(data.isAnomaly ? 'anomaly' : data.diverges ? 'diverges' : 'verified');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ?? 'verify failed');
    }
  };

  const meta = STATUS_META[status];
  const verifyColor = meta.color(theme);

  return (
    <View style={styles.row}>
      {showInfo && (
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setInfoOpen(true)}
          hitSlop={styles.hit}
          accessibilityLabel="Widget info"
        >
          <Icon name="information-outline" size={ms(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      {hasRows && (
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => shareWidgetCsv(widget)}
          hitSlop={styles.hit}
          accessibilityLabel="Download CSV"
        >
          <Icon name="tray-arrow-down" size={ms(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      {canVerify && (
        <TouchableOpacity
          style={[styles.verifyChip, { borderColor: verifyColor + '55' }]}
          onPress={() => (status === 'idle' || status === 'error' ? runVerify() : setVerifyOpen(true))}
          hitSlop={styles.hit}
        >
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={verifyColor} />
          ) : (
            <Icon name={meta.icon} size={ms(13)} color={verifyColor} />
          )}
          <Text variant="captionSmall" style={[styles.verifyLabel, { color: verifyColor }]}>
            {meta.label}
          </Text>
        </TouchableOpacity>
      )}

      {/* Info sheet */}
      <BottomSheet
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={widget.title || 'Widget details'}
        headerIcon="database-outline"
        height="full"
      >
        {!!query?.table && (
          <Section label="DATA SOURCE">
            <Text variant="bodySmall" color="primary" style={styles.mono}>
              {query.table}
            </Text>
          </Section>
        )}
        {!!query?.filters?.length && (
          <Section label={`FILTERS (${query.filters.length})`}>
            {query.filters.map((f, i) => (
              <Text key={i} variant="caption" color="secondary" style={styles.mono}>
                {f.column} {OP_LABEL[f.operator] ?? f.operator} {fmtVal(f.value)}
              </Text>
            ))}
          </Section>
        )}
        {!!aggregate && (
          <Section label="AGGREGATION">
            <Text variant="caption" color="secondary">
              {aggregate.method}
              {aggregate.valueColumn ? ` (${aggregate.valueColumn})` : ''}
              {aggregate.groupBy ? ` · grouped by ${aggregate.groupBy}` : ''}
              {aggregate.dateFormat ? ` · per ${aggregate.dateFormat}` : ''}
              {aggregate.topN ? ` · top ${aggregate.topN}` : ''}
            </Text>
          </Section>
        )}
        {hasRows && (
          <Section label={`DATA (${rows!.length} rows)`}>
            <DataTableWidget widget={widget} maxHeight={ms(320)} />
          </Section>
        )}
      </BottomSheet>

      {/* Verify sheet */}
      <BottomSheet
        visible={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="Verification"
        headerIcon={meta.icon}
        headerIconColor={verifyColor}
      >
        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary.main} />
            <Text variant="caption" color="hint" style={styles.loadingText}>
              Comparing the aggregated total against an independent COUNT(*)…
            </Text>
          </View>
        )}
        {status === 'error' && (
          <View>
            <Text variant="body" style={{ color: colors.error.main }}>
              Verification failed
            </Text>
            <Text variant="caption" color="hint" style={styles.gap}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runVerify}>
              <Icon name="refresh" size={ms(15)} color={theme.colors.primary.main} />
              <Text variant="caption" color="primary" style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {result && status !== 'loading' && status !== 'error' && (
          <View>
            <Stat label="Status" value={meta.label} color={verifyColor} />
            <Stat label="Aggregated total" value={formatValue(result.aggregatedTotal)} />
            <Stat label="Ground-truth count" value={formatValue(result.groundTruthCount)} />
            <Stat label="Buckets" value={String(result.bucketCount)} />
            {aggregate?.method === 'count' && (
              <Stat label="Divergence" value={`${(result.divergenceRatio * 100).toFixed(2)}%`} />
            )}
            {result.zScore !== null && (
              <>
                <Stat label="z-score (30d)" value={result.zScore.toFixed(2)} />
                <Stat label="Baseline mean" value={formatValue(result.baselineMean ?? 0)} />
              </>
            )}
            <Text variant="caption" color="hint" style={styles.verifyNote}>
              {status === 'anomaly'
                ? 'This value is more than 2σ from the 30-day average — worth a closer look.'
                : status === 'diverges'
                ? 'Aggregated total disagrees with COUNT(*) — possible top-N truncation or NULL group keys.'
                : 'Numbers match Postgres exactly and sit inside the historical baseline.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runVerify}>
              <Icon name="refresh" size={ms(15)} color={theme.colors.primary.main} />
              <Text variant="caption" color="primary" style={styles.retryText}>Re-run verify</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return `[${v.join(', ')}]`;
  if (typeof v === 'string') return `"${v}"`;
  return String(v);
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.section, { borderColor: theme.colors.border }]}>
      <Text variant="captionSmall" color="hint" style={styles.sectionLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text variant="caption" color="secondary">{label}</Text>
      <Text variant="caption" style={[styles.statValue, color ? { color } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: ms(2) },
  iconBtn: { padding: ms(4) },
  hit: { top: 8, bottom: 8, left: 8, right: 8 },
  verifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(12),
    paddingHorizontal: ms(6),
    paddingVertical: ms(3),
    marginLeft: ms(2),
    gap: ms(3),
  },
  verifyLabel: { fontWeight: '600' },
  section: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: ms(10),
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: { letterSpacing: 0.5, marginBottom: spacing.xs },
  mono: { fontFamily: 'monospace' as any },
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  loadingText: { marginTop: spacing.sm, textAlign: 'center' },
  gap: { marginTop: spacing.xs },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: ms(5),
  },
  statValue: { fontWeight: '600', fontFamily: 'monospace' as any },
  verifyNote: { marginTop: spacing.sm },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  retryText: { marginLeft: spacing.xs, fontWeight: '600' },
});

export default WidgetActions;
