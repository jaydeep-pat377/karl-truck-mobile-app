import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

export type DateFilter = 'today' | 'yesterday' | 'next_week' | 'last_week';

interface DateFilterChipsProps {
  selectedFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getSelectedDateText = (filter: DateFilter): string => {
  const today = new Date();

  switch (filter) {
    case 'today':
      return formatDate(today);
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return formatDate(yesterday);
    }
    case 'next_week': {
      const dayOfWeek = today.getDay();
      const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + daysUntilNextMonday);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      return `${formatDateShort(nextMonday)} - ${formatDateShort(nextSunday)}`;
    }
    case 'last_week': {
      const dayOfWeek = today.getDay();
      const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek + 6;
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - daysToLastMonday);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return `${formatDateShort(lastMonday)} - ${formatDateShort(lastSunday)}`;
    }
    default:
      return '';
  }
};

const filterOptions: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'next_week', label: 'Next Week' },
  { key: 'last_week', label: 'Last Week' },
];

export const DateFilterChips: React.FC<DateFilterChipsProps> = ({
  selectedFilter,
  onFilterChange,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {filterOptions.map((option, index) => {
          const isSelected = selectedFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.chip,
                index > 0 && styles.chipMargin,
                {
                  backgroundColor: isSelected
                    ? colors.primary.main
                    : isDark
                      ? colors.dark.surface
                      : colors.common.white,
                  borderColor: isSelected
                    ? colors.primary.main
                    : isDark
                      ? colors.dark.border
                      : colors.grey[25],
                },
              ]}
              onPress={() => onFilterChange(option.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected
                      ? colors.common.white
                      : themeColors.text.primary,
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.dateRow}>
        <Icon name="calendar" size={ms(14)} color={themeColors.text.secondary} />
        <Text style={[styles.dateText, { color: themeColors.text.primary }]}>
          {getSelectedDateText(selectedFilter)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(8),
    borderRadius: ms(18),
    borderWidth: 1,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  chipMargin: {
    marginLeft: ms(8),
  },
  chipText: {
    fontSize: ms(13),
    fontFamily: fontFamily.medium,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    gap: ms(6),
  },
  dateText: {
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
  },
});

export default DateFilterChips;
