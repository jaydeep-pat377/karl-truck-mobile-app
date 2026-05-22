import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PG, PG_FONT } from '../_data/theme';

type DirKey = 'B' | 'C' | 'D' | 'E';

const DIRS: Array<{ key: DirKey; route: string; label: string; subtitle: string }> = [
  { key: 'B', route: 'OrdersRedesign', label: 'B', subtitle: 'Cards' },
  { key: 'C', route: 'OrdersRedesignC', label: 'C', subtitle: 'List' },
  { key: 'D', route: 'OrdersRedesignD', label: 'D', subtitle: 'Timeline' },
  { key: 'E', route: 'OrdersRedesignE', label: 'E', subtitle: 'Focus' },
];

export function DirectionSwitcher() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const active = route.name;

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>PLAYGROUND</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {DIRS.map(d => {
          const isActive = d.route === active;
          return (
            <TouchableOpacity
              key={d.key}
              activeOpacity={0.7}
              onPress={() => {
                if (!isActive) {
                  navigation.replace(d.route);
                }
              }}
              style={[styles.chip, isActive && styles.chipActive]}>
              <Text
                style={[
                  styles.chipLabel,
                  isActive && styles.chipLabelActive,
                ]}>
                {d.label}
              </Text>
              <Text
                style={[
                  styles.chipSubtitle,
                  isActive && styles.chipSubtitleActive,
                ]}>
                {d.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: PG.surface2,
    borderBottomWidth: 1,
    borderBottomColor: PG.line,
  },
  eyebrow: {
    fontSize: 9,
    color: PG.ink4,
    letterSpacing: 1.4,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  row: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PG.line,
    backgroundColor: PG.surface,
  },
  chipActive: {
    backgroundColor: PG.ink,
    borderColor: PG.ink,
  },
  chipLabel: {
    fontFamily: PG_FONT.serif,
    fontSize: 14,
    color: PG.ink,
    lineHeight: 16,
  },
  chipLabelActive: {
    color: PG.surface,
  },
  chipSubtitle: {
    fontSize: 10,
    color: PG.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipSubtitleActive: {
    color: PG.surface,
    opacity: 0.8,
  },
});
