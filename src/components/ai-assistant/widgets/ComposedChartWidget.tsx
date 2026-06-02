import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { colors } from '../../../theme/colors';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, niceMax, formatValue, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const MAX = 12;
const truncate = (l: string, m: number) => (l.length <= m ? l : `${l.slice(0, Math.max(1, m - 1))}…`);

export function ComposedChartWidget({ widget, width }: { widget: Widget; width: number }) {
  const theme = useAppTheme();
  let series: SeriesPoint[] = toSeries(
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
  series = series.slice(0, MAX);
  const fmt = widget.config?.valueFormat;
  const W = Math.max(width, ms(160));
  const H = HEIGHT;
  const padLeft = ms(8), padRight = ms(8), padTop = ms(20), padBottom = ms(34);
  const plotW = W - padLeft - padRight, plotH = H - padTop - padBottom, baselineY = padTop + plotH;
  const maxVal = niceMax(Math.max(0, ...series.map((s) => s.value)));
  const n = series.length;
  const slot = plotW / n;
  const barW = Math.min(slot * 0.5, ms(34));
  const fontSize = ms(9);
  const cxFor = (i: number) => padLeft + slot * i + slot / 2;
  const yFor = (v: number) => baselineY - (maxVal > 0 ? v / maxVal : 0) * plotH;
  const linePath = series.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${cxFor(i).toFixed(2)} ${yFor(pt.value).toFixed(2)}`).join(' ');
  const showEvery = n <= 8;

  return (
    <View>
      <Svg width={W} height={H}>
        <Line x1={padLeft} y1={baselineY} x2={padLeft + plotW} y2={baselineY} stroke={theme.colors.border} strokeWidth={1} />
        {series.map((pt, i) => {
          const cx = cxFor(i);
          const y = yFor(pt.value);
          return (
            <React.Fragment key={i}>
              <Rect x={cx - barW / 2} y={y} width={barW} height={baselineY - y} rx={ms(3)} fill={paletteColor(i)} fillOpacity={0.55} />
              {(showEvery || i % Math.ceil(n / 8) === 0) && (
                <SvgText x={cx} y={baselineY + ms(14)} fontSize={fontSize} fill={theme.colors.textSecondary} textAnchor="middle">
                  {truncate(pt.label, 8)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
        <Path d={linePath} stroke={colors.secondary.main} strokeWidth={2} fill="none" />
        {series.map((pt, i) => (
          <React.Fragment key={`d${i}`}>
            <Circle cx={cxFor(i)} cy={yFor(pt.value)} r={ms(2.5)} fill={colors.secondary.main} />
            <SvgText x={cxFor(i)} y={yFor(pt.value) - ms(5)} fontSize={fontSize} fill={theme.colors.textSecondary} textAnchor="middle">
              {formatValue(pt.value, fmt)}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { height: HEIGHT, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
});

export default ComposedChartWidget;
