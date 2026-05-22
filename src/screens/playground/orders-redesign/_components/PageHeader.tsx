import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PG, PG_FONT } from '../_data/theme';

const DATE_CHIPS = ['Today', 'Yesterday', 'Tomorrow', 'Next 7 days'];

export function PageHeader({ crumb }: { crumb?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>TUESDAY · MAY 19, 2026 · 04:28 CDT</Text>
      <Text style={styles.title}>
        Orders {crumb ? <Text style={styles.titleMuted}>/ {crumb}</Text> : null}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}>
        {DATE_CHIPS.map((c, i) => (
          <View key={c} style={[styles.chip, i === 0 && styles.chipActive]}>
            <Text
              style={[styles.chipText, i === 0 && styles.chipTextActive]}>
              {c}
            </Text>
          </View>
        ))}
        <TouchableOpacity style={styles.chip} activeOpacity={0.7}>
          <Icon name="filter-variant" size={13} color={PG.ink2} />
          <Text style={styles.chipText}> Filters · 2</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    color: PG.ink3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: PG_FONT.serif,
    fontSize: 36,
    color: PG.ink,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  titleMuted: {
    color: PG.ink3,
  },
  chipsScroll: {
    marginTop: 14,
    marginHorizontal: -16,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PG.line,
    backgroundColor: PG.surface,
  },
  chipActive: {
    backgroundColor: PG.ink,
    borderColor: PG.ink,
  },
  chipText: {
    fontSize: 12,
    color: PG.ink2,
  },
  chipTextActive: {
    color: PG.surface,
    fontWeight: '500',
  },
});
