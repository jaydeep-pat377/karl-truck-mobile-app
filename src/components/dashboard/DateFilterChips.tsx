import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

export type DateFilter = 'today' | 'yesterday' | 'next_week' | 'last_week';

interface DateFilterChipsProps {
  selectedFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

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
});

export default DateFilterChips;
