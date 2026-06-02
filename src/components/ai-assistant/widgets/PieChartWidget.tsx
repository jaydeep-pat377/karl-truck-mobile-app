import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, formatValue, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const MAX_SLICES = 8;

interface Slice {
  label: string;
  value: number;
  color: string;
  percent: number;
}

/** Cartesian point on a circle for a given angle (degrees, 0 at top). */
function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Build an SVG donut-segment path between two angles. */
function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const startOuter = pointOnCircle(cx, cy, rOuter, startAngle);
  const endOuter = pointOnCircle(cx, cy, rOuter, endAngle);
  const startInner = pointOnCircle(cx, cy, rInner, endAngle);
  const endInner = pointOnCircle(cx, cy, rInner, startAngle);

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function buildSlices(series: SeriesPoint[]): Slice[] {
  // Only positive values contribute to a pie.
  const positive = series.filter((s) => s.value > 0);
  const total = positive.reduce((acc, s) => acc + s.value, 0);
  if (total <= 0) {
    return [];
  }

  const sorted = [...positive].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);

  const slices: Slice[] = top.map((s, i) => ({
    label: s.label,
    value: s.value,
    color: paletteColor(i),
    percent: (s.value / total) * 100,
  }));

  if (rest.length > 0) {
    const otherVal = rest.reduce((acc, s) => acc + s.value, 0);
    slices.push({
      label: 'Other',
      value: otherVal,
      color: paletteColor(MAX_SLICES),
      percent: (otherVal / total) * 100,
    });
  }
  return slices;
}

export function PieChartWidget({ widget, width }: { widget: Widget; width: number }) {
  const theme = useAppTheme();
  const series = toSeries(
    widget.data,
    widget.config,
    (widget as unknown as { aggregate?: { groupBy?: string } }).aggregate?.groupBy,
  );
  const slices = buildSlices(series);

  if (slices.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text variant="bodySmall" color="hint">
          No data
        </Text>
      </View>
    );
  }

  const valueFormat = widget.config?.valueFormat;
  const W = Math.max(width, ms(160));

  // Lay out chart on the left, legend on the right when wide enough,
  // otherwise stack the legend below.
  const sideBySide = W >= ms(300);
  const chartSize = Math.min(HEIGHT, sideBySide ? W * 0.5 : W);
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const rOuter = chartSize / 2 - ms(6);
  const rInner = rOuter * 0.58;

  let cursor = 0;
  const paths = slices.map((s, i) => {
    const sweep = (s.percent / 100) * 360;
    const start = cursor;
    let end = cursor + sweep;
    // Avoid a full 360 that collapses the arc.
    if (end - start >= 359.999) {
      end = start + 359.999;
    }
    cursor = end;
    return <Path key={i} d={arcPath(cx, cy, rOuter, rInner, start, end)} fill={s.color} />;
  });

  const legend = (
    <View style={[styles.legend, sideBySide ? styles.legendSide : styles.legendBelow]}>
      {slices.map((s, i) => {
        // Hide cryptic numeric category codes (e.g. status code "4"); keep
        // meaningful text labels (plant names, etc.) — matches the web, which
        // shows the count for each colored slice.
        const labelIsCode = s.label.trim() !== '' && !Number.isNaN(Number(s.label));
        return (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            {!labelIsCode && (
              <Text variant="captionSmall" color="primary" numberOfLines={1} style={styles.legendLabel}>
                {s.label}
              </Text>
            )}
            <Text variant="captionSmall" color="secondary" style={styles.legendValue}>
              {formatValue(s.value, valueFormat)} ({s.percent.toFixed(0)}%)
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={sideBySide ? styles.rowWrap : styles.colWrap}>
      <Svg width={chartSize} height={chartSize}>
        {paths}
        {/* subtle inner hole matching the card */}
        <Circle cx={cx} cy={cy} r={rInner} fill={theme.colors.card} />
      </Svg>
      {legend}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colWrap: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  legend: {
    flexShrink: 1,
  },
  legendSide: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  legendBelow: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  swatch: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(2),
    marginRight: spacing.xs,
  },
  legendLabel: {
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  legendValue: {
    marginLeft: spacing.xs,
  },
  emptyWrap: {
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
});

export default PieChartWidget;
