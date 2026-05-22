import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PG, PG_FONT } from '../_data/theme';
import { STATUS_FILTER_COUNTS } from '../_data/status-config';

const STATUSES: Array<{ label: string; color: string; count: number }> = [
  { label: 'Pre-Pour', color: PG.pre, count: STATUS_FILTER_COUNTS.prePour },
  { label: 'In-Process', color: PG.proc, count: STATUS_FILTER_COUNTS.inProcess },
  { label: 'Completed', color: PG.done, count: STATUS_FILTER_COUNTS.completed },
  { label: 'Canceled', color: PG.cancel, count: STATUS_FILTER_COUNTS.canceled },
];

export function StatusFilterRow() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>STATUS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        <View style={[styles.chip, styles.chipActive]}>
          <Text style={styles.chipTextActive}>All </Text>
          <Text style={[styles.mono, styles.chipCountActive]}>
            {STATUS_FILTER_COUNTS.all}
          </Text>
        </View>
        {STATUSES.map(s => (
          <View key={s.label} style={styles.chip}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.chipText}> {s.label} </Text>
            <Text style={[styles.mono, styles.chipCount]}>{s.count}</Text>
          </View>
        ))}
        <View style={styles.chip}>
          <View style={[styles.dot, { backgroundColor: PG.bad }]} />
          <Text style={styles.chipText}> Needs attention </Text>
          <Text style={[styles.mono, { color: PG.bad }]}>
            {STATUS_FILTER_COUNTS.attention}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  label: {
    fontSize: 11,
    color: PG.ink3,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
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
    fontSize: 12,
    color: PG.surface,
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipCount: {
    fontSize: 12,
    color: PG.ink3,
  },
  chipCountActive: {
    fontSize: 12,
    color: PG.surface,
    opacity: 0.7,
  },
  mono: {
    fontFamily: PG_FONT.mono,
  },
});
