import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, niceMax, formatValue, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const MAX_BARS = 12;

/** Truncate a label for axis display. */
function truncate(label: string, max: number): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, Math.max(1, max - 1))}…`;
}

export function BarChartWidget({ widget, width }: { widget: Widget; width: number }) {
  const theme = useAppTheme();
  const horizontal = widget.type === 'horizontal-bar-chart';

  let series: SeriesPoint[] = toSeries(
    widget.data,
    widget.config,
    (widget as unknown as { aggregate?: { groupBy?: string } }).aggregate?.groupBy,
  );
  if (series.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text variant="bodySmall" color="hint">
          No data
        </Text>
      </View>
    );
  }
  series = series.slice(0, MAX_BARS);

  const valueFormat = widget.config?.valueFormat;
  const labelColor = theme.colors.textSecondary;
  const axisColor = theme.colors.border;

  const W = Math.max(width, ms(160));
  const H = HEIGHT;

  const maxVal = niceMax(Math.max(0, ...series.map((s) => s.value)));

  if (horizontal) {
    return renderHorizontal(series, W, H, maxVal, valueFormat, labelColor, axisColor);
  }
  return renderVertical(series, W, H, maxVal, valueFormat, labelColor, axisColor);
}

function renderVertical(
  series: SeriesPoint[],
  W: number,
  H: number,
  maxVal: number,
  valueFormat: string | undefined,
  labelColor: string,
  axisColor: string,
) {
  const padLeft = ms(8);
  const padRight = ms(8);
  const padTop = ms(20);
  const padBottom = ms(34);
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;
  const baselineY = padTop + plotH;

  const n = series.length;
  const slot = plotW / n;
  const barW = Math.min(slot * 0.62, ms(40));
  const fontSize = ms(9);
  const showEveryLabel = n <= 8;

  return (
    <View>
      <Svg width={W} height={H}>
        {/* baseline */}
        <Line x1={padLeft} y1={baselineY} x2={padLeft + plotW} y2={baselineY} stroke={axisColor} strokeWidth={1} />
        {series.map((pt, i) => {
          const ratio = maxVal > 0 ? pt.value / maxVal : 0;
          const barH = Math.max(0, ratio * plotH);
          const cx = padLeft + slot * i + slot / 2;
          const x = cx - barW / 2;
          const y = baselineY - barH;
          const showLabel = showEveryLabel || i % Math.ceil(n / 8) === 0;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={ms(3)}
                fill={paletteColor(i)}
              />
              {/* value label above bar */}
              <SvgText
                x={cx}
                y={y - ms(4)}
                fontSize={fontSize}
                fill={labelColor}
                textAnchor="middle"
              >
                {formatValue(pt.value, valueFormat)}
              </SvgText>
              {/* category label under baseline */}
              {showLabel && (
                <SvgText
                  x={cx}
                  y={baselineY + ms(14)}
                  fontSize={fontSize}
                  fill={labelColor}
                  textAnchor="middle"
                >
                  {truncate(pt.label, 8)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function renderHorizontal(
  series: SeriesPoint[],
  W: number,
  H: number,
  maxVal: number,
  valueFormat: string | undefined,
  labelColor: string,
  axisColor: string,
) {
  const padTop = ms(8);
  const padBottom = ms(8);
  const labelW = Math.min(ms(90), W * 0.32);
  const valueW = ms(46);
  const padLeft = labelW + ms(6);
  const padRight = valueW;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const n = series.length;
  const slot = plotH / n;
  const barH = Math.min(slot * 0.6, ms(26));
  const fontSize = ms(9);

  return (
    <View>
      <Svg width={W} height={H}>
        {/* baseline (vertical axis) */}
        <Line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + plotH} stroke={axisColor} strokeWidth={1} />
        {series.map((pt, i) => {
          const ratio = maxVal > 0 ? pt.value / maxVal : 0;
          const barLen = Math.max(0, ratio * plotW);
          const cy = padTop + slot * i + slot / 2;
          const y = cy - barH / 2;
          return (
            <React.Fragment key={i}>
              {/* left category label */}
              <SvgText
                x={padLeft - ms(6)}
                y={cy + fontSize / 3}
                fontSize={fontSize}
                fill={labelColor}
                textAnchor="end"
              >
                {truncate(pt.label, 12)}
              </SvgText>
              <Rect
                x={padLeft}
                y={y}
                width={barLen}
                height={barH}
                rx={ms(3)}
                fill={paletteColor(i)}
              />
              {/* value label at end of bar */}
              <SvgText
                x={padLeft + barLen + ms(4)}
                y={cy + fontSize / 3}
                fontSize={fontSize}
                fill={labelColor}
                textAnchor="start"
              >
                {formatValue(pt.value, valueFormat)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
});

export default BarChartWidget;
