import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { statusMeta } from '../_data/status-config';
import type { StatusCategory, SubStatusCode } from '../_data/types';

interface StatusPillProps {
  category: StatusCategory;
  sub: SubStatusCode | null;
  withDot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ category, sub, withDot, style }: StatusPillProps) {
  const meta = statusMeta(category, sub);

  let glyph: React.ReactNode = null;
  if (category === 'COMPLETED') {
    glyph = <Icon name="check" size={10} color={meta.pillColor} />;
  } else if (category === 'CANCELED') {
    glyph = <Icon name="close" size={10} color={meta.pillColor} />;
  } else if (category === 'PRE_POUR' && sub === 1) {
    glyph = <Icon name="phone-outline" size={9} color={meta.pillColor} />;
  } else if (category === 'PRE_POUR' && sub === 2) {
    glyph = <Icon name="weather-pouring" size={9} color={meta.pillColor} />;
  } else if (category === 'PRE_POUR' && sub === 3) {
    glyph = <Icon name="pause" size={9} color={meta.pillColor} />;
  } else if (withDot || category === 'IN_PROCESS') {
    glyph = <View style={[styles.dot, { backgroundColor: meta.dot }]} />;
  }

  return (
    <View style={[styles.pill, { backgroundColor: meta.pillBg }, style]}>
      {glyph}
      <Text style={[styles.pillText, { color: meta.pillColor }]}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.11,
    lineHeight: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
