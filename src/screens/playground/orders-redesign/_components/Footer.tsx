import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PG, PG_FONT } from '../_data/theme';

export function Footer({ shown = 8 }: { shown?: number }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.left} numberOfLines={2}>
        Showing {shown} of 207 active orders · refreshed 04:28:14 CDT
      </Text>
      <Text style={[styles.right, styles.mono]}>Truckast · Orders redesign</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: PG.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  left: {
    fontSize: 11,
    color: PG.ink4,
    flexShrink: 1,
  },
  right: {
    fontSize: 11,
    color: PG.ink4,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
});
