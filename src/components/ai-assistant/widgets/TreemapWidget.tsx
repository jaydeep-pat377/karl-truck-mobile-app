import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { Widget } from '../../../types/ai-assistant';
import { useAppTheme } from '../../../contexts/ThemeContext';
import { ms, spacing } from '../../../utils/responsive';
import { Text } from '../../../components/common';
import { toSeries, formatValue, paletteColor, SeriesPoint } from './chartUtils';

const HEIGHT = ms(220);
const MAX = 10;

interface Rectangle extends SeriesPoint {
  x: number;
  y: number;
  w: number;
  h: number;
  idx: number;
}

/** Recursive slice-and-dice treemap layout. */
function layout(
  items: Array<SeriesPoint & { idx: number }>,
  x: number,
  y: number,
  w: number,
  h: number,
  horizontal: boolean,
  out: Rectangle[],
): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h });
    return;
  }
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  let acc = 0;
  let split = 1;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].value;
    if (acc >= total / 2) {
      split = i + 1;
      break;
    }
  }
  const a = items.slice(0, split);
  const b = items.slice(split);
  const aSum = a.reduce((s, it) => s + it.value, 0);
  const frac = aSum / total;
  if (horizontal) {
    const aw = w * frac;
    layout(a, x, y, aw, h, !horizontal, out);
    layout(b, x + aw, y, w - aw, h, !horizontal, out);
  } else {
    const ah = h * frac;
    layout(a, x, y, w, ah, !horizontal, out);
    layout(b, x, y + ah, w, h - ah, !horizontal, out);
  }
}

export function TreemapWidget({ widget, width }: { widget: Widget; width: number }) {
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
  const H = HEIGHT;
  const items = [...positive]
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX)
    .map((s, idx) => ({ ...s, idx }));

  const rects: Rectangle[] = [];
  layout(items, 0, 0, W, H, true, rects);
  const fontSize = ms(9);

  return (
    <View>
      <Svg width={W} height={H}>
        {rects.map((r) => {
          const big = r.w > ms(48) && r.h > ms(26);
          return (
            <React.Fragment key={r.idx}>
              <Rect
                x={r.x + 1}
                y={r.y + 1}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                rx={ms(3)}
                fill={paletteColor(r.idx)}
                fillOpacity={0.85}
              />
              {big && (
                <>
                  <SvgText x={r.x + ms(6)} y={r.y + ms(14)} fontSize={fontSize} fill="#FFFFFF">
                    {r.label.length > Math.floor(r.w / ms(7)) ? `${r.label.slice(0, Math.floor(r.w / ms(7)))}…` : r.label}
                  </SvgText>
                  <SvgText x={r.x + ms(6)} y={r.y + ms(26)} fontSize={fontSize} fontWeight="bold" fill="#FFFFFF">
                    {formatValue(r.value, fmt)}
                  </SvgText>
                </>
              )}
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

export default TreemapWidget;
