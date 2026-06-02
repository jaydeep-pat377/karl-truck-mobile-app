import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, niceMax, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(240);
const MAX_AXES = 8;
const truncate = (l: string, m: number) => (l.length <= m ? l : `${l.slice(0, Math.max(1, m - 1))}…`);

export function RadarChartWidget({ widget, width }: { widget: Widget; width: number }) {
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
  series = [...series].sort((a, b) => b.value - a.value).slice(0, MAX_AXES);
  const W = Math.max(width, ms(160));
  const H = HEIGHT;
  const cx = W / 2;
  const cy = H / 2;
  const r = H / 2 - ms(30);
  const max = niceMax(Math.max(0, ...series.map((s) => s.value)));
  const n = series.length;
  const fill = paletteColor(0);

  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pos = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(ang(i)),
    y: cy + radius * Math.sin(ang(i)),
  });
  const polyStr = (radiusFn: (i: number) => number) =>
    series.map((_, i) => { const p = pos(i, radiusFn(i)); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');

  const fontSize = ms(8);

  return (
    <View>
      <Svg width={W} height={H}>
        {[1 / 3, 2 / 3, 1].map((k, gi) => (
          <Polygon key={gi} points={polyStr(() => r * k)} fill="none" stroke={theme.colors.border} strokeWidth={0.5} />
        ))}
        {series.map((_, i) => {
          const p = pos(i, r);
          return <Line key={`s${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.colors.border} strokeWidth={0.5} />;
        })}
        <Polygon
          points={polyStr((i) => r * (max > 0 ? series[i].value / max : 0))}
          fill={fill}
          fillOpacity={0.25}
          stroke={fill}
          strokeWidth={2}
        />
        {series.map((s, i) => {
          const dp = pos(i, r * (max > 0 ? s.value / max : 0));
          const lp = pos(i, r + ms(12));
          return (
            <React.Fragment key={`p${i}`}>
              <Circle cx={dp.x} cy={dp.y} r={ms(2.5)} fill={fill} />
              <SvgText
                x={lp.x}
                y={lp.y + fontSize / 3}
                fontSize={fontSize}
                fill={theme.colors.textSecondary}
                textAnchor={lp.x > cx + 2 ? 'start' : lp.x < cx - 2 ? 'end' : 'middle'}
              >
                {truncate(s.label, 8)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { height: HEIGHT, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
});

export default RadarChartWidget;
