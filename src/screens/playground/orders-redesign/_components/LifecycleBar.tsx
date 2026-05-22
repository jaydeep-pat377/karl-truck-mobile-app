import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PG, STAGE_COLOR } from '../_data/theme';
import type { LifecycleSegment } from '../_data/types';

interface LifecycleBarProps {
  lifecycle: LifecycleSegment[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function LifecycleBar({
  lifecycle,
  height = 6,
  style,
}: LifecycleBarProps) {
  if (lifecycle.length === 0) {
    return (
      <View
        style={[
          styles.bar,
          { height, backgroundColor: PG.line, overflow: 'hidden' },
          style,
        ]}>
        {/* faux diagonal hatch via repeating stripes */}
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: -2,
              left: i * 6 - 6,
              width: 1,
              height: height + 4,
              backgroundColor: PG.lineStrong,
              transform: [{ rotate: '45deg' }],
              opacity: 0.6,
            }}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.bar, { height }, style]}>
      {lifecycle.map((seg, i) => {
        const isFuture = seg.state === 'future';
        const isCurrent = seg.state === 'current';
        const color = STAGE_COLOR[seg.key] ?? PG.line;
        return (
          <View
            key={seg.key + i}
            style={{
              flex: seg.weight,
              height: '100%',
              backgroundColor: color,
              opacity: isFuture ? 0.2 : 1,
            }}>
            {isCurrent ? (
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  top: -3,
                  width: 4,
                  height: height + 6,
                  borderRadius: 2,
                  backgroundColor: PG.ink,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: PG.line,
    width: '100%',
  },
});
