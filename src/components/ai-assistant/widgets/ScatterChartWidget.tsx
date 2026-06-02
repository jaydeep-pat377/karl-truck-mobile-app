import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, niceMax, formatValue, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const truncate = (l: string, m: number) => (l.length <= m ? l : `${l.slice(0, Math.max(1, m - 1))}…`);

export function ScatterChartWidget({ widget, width }: { widget: Widget; width: number }) {
  const theme = useAppTheme();
  const series: SeriesPoint[] = toSeries(
    widget.data,
    widget.config,
    (widget as unknown as { aggregate?: { groupBy?: string } }).aggregate?.groupBy,
  );
  if (series.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text variant="bodySmall" color="hint">No data</Text>
      </View>
    );
  }
  const fmt = widget.config?.valueFormat;
  const W = Math.max(width, ms(160));
  const H = HEIGHT;
  const padLeft = ms(40), padRight = ms(12), padTop = ms(14), padBottom = ms(28);
  const plotW = W - padLeft - padRight, plotH = H - padTop - padBottom, baselineY = padTop + plotH;
  const maxVal = niceMax(Math.max(0, ...series.map((s) => s.value)));
  const n = series.length;
  const xFor = (i: number) => (n === 1 ? padLeft + plotW / 2 : padLeft + (plotW * i) / (n - 1));
  const yFor = (v: number) => padTop + plotH - (maxVal > 0 ? v / maxVal : 0) * plotH;
  const fontSize = ms(9);
  const labelIdx = new Set<number>([0, n - 1]);
  if (n > 2) labelIdx.add(Math.floor((n - 1) / 2));

  return (
    <View>
      <Svg width={W} height={H}>
        {Array.from({ length: 4 }).map((_, g) => {
          const t = g / 3;
          const y = padTop + plotH - t * plotH;
          return (
            <React.Fragment key={g}>
              <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={theme.colors.border} strokeWidth={0.5} />
              <SvgText x={padLeft - ms(6)} y={y + fontSize / 3} fontSize={fontSize} fill={theme.colors.textSecondary} textAnchor="end">
                {formatValue(maxVal * t, fmt)}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Line x1={padLeft} y1={baselineY} x2={padLeft + plotW} y2={baselineY} stroke={theme.colors.border} strokeWidth={1} />
        {series.map((pt, i) => (
          <Circle key={i} cx={xFor(i)} cy={yFor(pt.value)} r={ms(4)} fill={paletteColor(i)} fillOpacity={0.85} />
        ))}
        {series.map((pt, i) =>
          labelIdx.has(i) ? (
            <SvgText key={`x${i}`} x={xFor(i)} y={baselineY + ms(16)} fontSize={fontSize} fill={theme.colors.textSecondary} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {truncate(pt.label, 10)}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { height: HEIGHT, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
});

export default ScatterChartWidget;
