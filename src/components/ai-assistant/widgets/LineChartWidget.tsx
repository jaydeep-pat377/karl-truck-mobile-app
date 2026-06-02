import React, { useState } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Line, Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { colors } from '../../../theme/colors';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, niceMax, formatValue, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const GRID_LINES = 4;

function truncate(label: string, max: number): string {
  if (label.length <= max) {
    return label;
  }
  return `${label.slice(0, Math.max(1, max - 1))}…`;
}

export function LineChartWidget({ widget, width }: { widget: Widget; width: number }) {
  const theme = useAppTheme();
  const isArea = widget.type === 'area-chart';
  const [active, setActive] = useState<number | null>(null);

  const series: SeriesPoint[] = toSeries(
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

  const valueFormat = widget.config?.valueFormat;
  const labelColor = theme.colors.textSecondary;
  const gridColor = theme.colors.border;
  const lineColor = colors.secondary.main;

  const W = Math.max(width, ms(160));
  const H = HEIGHT;

  const padLeft = ms(40);
  const padRight = ms(12);
  const padTop = ms(14);
  const padBottom = ms(28);
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const maxVal = niceMax(Math.max(0, ...series.map((s) => s.value)));
  const n = series.length;

  const xFor = (i: number): number => {
    if (n === 1) {
      return padLeft + plotW / 2;
    }
    return padLeft + (plotW * i) / (n - 1);
  };
  const yFor = (v: number): number => {
    const ratio = maxVal > 0 ? v / maxVal : 0;
    return padTop + plotH - ratio * plotH;
  };

  // Map a touch x-position to the nearest data point index.
  const handleTouch = (evt: GestureResponderEvent) => {
    const lx = evt.nativeEvent.locationX;
    if (n <= 1) {
      setActive(0);
      return;
    }
    const step = plotW / (n - 1);
    let idx = Math.round((lx - padLeft) / step);
    idx = Math.max(0, Math.min(n - 1, idx));
    setActive(idx);
  };

  // Build the line path.
  const linePath = series
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(2)} ${yFor(pt.value).toFixed(2)}`)
    .join(' ');

  // Build the area path (close down to baseline).
  const baselineY = padTop + plotH;
  const areaPath =
    n > 0
      ? `${linePath} L ${xFor(n - 1).toFixed(2)} ${baselineY.toFixed(2)} L ${xFor(0).toFixed(2)} ${baselineY.toFixed(2)} Z`
      : '';

  // X-axis labels: first, middle, last (avoid crowding).
  const labelIndices = new Set<number>();
  labelIndices.add(0);
  labelIndices.add(n - 1);
  if (n > 2) {
    labelIndices.add(Math.floor((n - 1) / 2));
  }

  const fontSize = ms(9);

  // Tooltip geometry for the active point.
  const tooltip = (() => {
    if (active === null || active < 0 || active >= n) return null;
    const pt = series[active];
    const x = xFor(active);
    const y = yFor(pt.value);
    const valStr = `value : ${formatValue(pt.value, valueFormat)}`;
    const labelStr = truncate(pt.label, 18);
    const charW = fontSize * 0.62;
    const tw = Math.max(labelStr.length, valStr.length) * charW + ms(14);
    const th = ms(32);
    let tx = x - tw / 2;
    tx = Math.max(padLeft, Math.min(tx, padLeft + plotW - tw));
    let ty = y - th - ms(10);
    if (ty < padTop) ty = y + ms(10);
    return { pt, x, y, valStr, labelStr, tw, th, tx, ty };
  })();

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={() => setActive(null)}
      onResponderTerminate={() => setActive(null)}
    >
      <Svg width={W} height={H}>
        {/* horizontal gridlines + y labels */}
        {Array.from({ length: GRID_LINES }).map((_, g) => {
          const t = g / (GRID_LINES - 1);
          const y = padTop + plotH - t * plotH;
          const v = maxVal * t;
          return (
            <React.Fragment key={`g-${g}`}>
              <Line x1={padLeft} y1={y} x2={padLeft + plotW} y2={y} stroke={gridColor} strokeWidth={0.5} />
              <SvgText x={padLeft - ms(6)} y={y + fontSize / 3} fontSize={fontSize} fill={labelColor} textAnchor="end">
                {formatValue(v, valueFormat)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* area fill */}
        {isArea && n > 1 && <Path d={areaPath} fill={lineColor} fillOpacity={0.15} stroke="none" />}

        {/* line */}
        {n > 1 && <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" />}

        {/* points */}
        {series.map((pt, i) => (
          <Circle key={`p-${i}`} cx={xFor(i)} cy={yFor(pt.value)} r={ms(2.5)} fill={lineColor} />
        ))}

        {/* x labels */}
        {series.map((pt, i) =>
          labelIndices.has(i) ? (
            <SvgText
              key={`x-${i}`}
              x={xFor(i)}
              y={baselineY + ms(16)}
              fontSize={fontSize}
              fill={labelColor}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            >
              {truncate(pt.label, 10)}
            </SvgText>
          ) : null,
        )}

        {/* touch crosshair + tooltip */}
        {tooltip && (
          <>
            <Line
              x1={tooltip.x}
              y1={padTop}
              x2={tooltip.x}
              y2={baselineY}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <Circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={ms(4.5)}
              fill={lineColor}
              stroke={theme.colors.card}
              strokeWidth={1.5}
            />
            <Rect
              x={tooltip.tx}
              y={tooltip.ty}
              width={tooltip.tw}
              height={tooltip.th}
              rx={ms(5)}
              fill={theme.colors.cardElevated}
              stroke={gridColor}
              strokeWidth={0.5}
            />
            <SvgText
              x={tooltip.tx + tooltip.tw / 2}
              y={tooltip.ty + ms(13)}
              fontSize={fontSize}
              fill={theme.colors.textSecondary}
              textAnchor="middle"
            >
              {tooltip.labelStr}
            </SvgText>
            <SvgText
              x={tooltip.tx + tooltip.tw / 2}
              y={tooltip.ty + ms(26)}
              fontSize={fontSize}
              fontWeight="bold"
              fill={lineColor}
              textAnchor="middle"
            >
              {tooltip.valStr}
            </SvgText>
          </>
        )}
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

export default LineChartWidget;
