import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, formatValue, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const MAX_RINGS = 6;
const SWEEP = 270; // degrees a full-value ring spans

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const so = pointOnCircle(cx, cy, rOuter, startAngle);
  const eo = pointOnCircle(cx, cy, rOuter, endAngle);
  const si = pointOnCircle(cx, cy, rInner, endAngle);
  const ei = pointOnCircle(cx, cy, rInner, startAngle);
  return [
    `M ${so.x.toFixed(2)} ${so.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${eo.x.toFixed(2)} ${eo.y.toFixed(2)}`,
    `L ${si.x.toFixed(2)} ${si.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ei.x.toFixed(2)} ${ei.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function RadialBarChartWidget({ widget, width }: { widget: Widget; width: number }) {
  const theme = useAppTheme();
  const series: SeriesPoint[] = toSeries(
    widget.data,
    widget.config,
    (widget as unknown as { aggregate?: { groupBy?: string } }).aggregate?.groupBy,
  );
  const positive = series.filter((s) => s.value > 0);
  if (positive.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text variant="bodySmall" color="hint">No data</Text>
      </View>
    );
  }
  const fmt = widget.config?.valueFormat;
  const W = Math.max(width, ms(160));
  const rings = [...positive].sort((a, b) => b.value - a.value).slice(0, MAX_RINGS);
  const max = Math.max(...rings.map((r) => r.value), 1);

  const chart = Math.min(HEIGHT, W * 0.6);
  const cx = chart / 2;
  const cy = chart / 2;
  const outerR = chart / 2 - ms(6);
  const ringW = (outerR * 0.7) / rings.length;
  const gap = ms(3);

  return (
    <View style={styles.row}>
      <Svg width={chart} height={chart}>
        {rings.map((r, i) => {
          const rOuter = outerR - i * (ringW + gap);
          const rInner = rOuter - ringW;
          const valEnd = SWEEP * (max > 0 ? r.value / max : 0);
          return (
            <React.Fragment key={i}>
              <Path d={arcPath(cx, cy, rOuter, rInner, 0, SWEEP)} fill={theme.colors.border} fillOpacity={0.4} />
              {valEnd > 0.5 && <Path d={arcPath(cx, cy, rOuter, rInner, 0, valEnd)} fill={paletteColor(i)} />}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        {rings.map((r, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: paletteColor(i) }]} />
            <Text variant="captionSmall" color="primary" numberOfLines={1} style={styles.legendLabel}>
              {r.label}
            </Text>
            <Text variant="captionSmall" color="secondary">{formatValue(r.value, fmt)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, paddingLeft: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  swatch: { width: ms(10), height: ms(10), borderRadius: ms(2), marginRight: spacing.xs },
  legendLabel: { flex: 1, marginRight: spacing.xs },
  emptyWrap: { height: HEIGHT, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
});

export default RadialBarChartWidget;
