import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Pressable, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

export type DateFilter = 'today' | 'yesterday' | 'tomorrow' | 'next_week' | 'last_week' | 'calendar';

interface DateRange {
  start_date: string;
  end_date: string;
  filter: string;
}

interface DateFilterChipsProps {
  selectedFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  showDatePicker?: boolean;
  onCalendarPress?: () => void;
  onCloseDatePicker?: () => void;
  dateRange?: DateRange | null;
}

const formatDateFromString = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateShortFromString = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatSelectedDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const DateFilterChips: React.FC<DateFilterChipsProps> = ({
  selectedFilter,
  onFilterChange,
  selectedDate,
  onDateSelect,
  showDatePicker = false,
  onCalendarPress,
  onCloseDatePicker,
  dateRange,
}) => {
  const { t } = useTranslation();
  const filterOptions: { key: DateFilter; label: string }[] = [
    { key: 'today', label: t('dateFilters.today') },
    { key: 'yesterday', label: t('dateFilters.yesterday') },
    { key: 'tomorrow', label: t('dateFilters.tomorrow') },
    { key: 'next_week', label: t('dateFilters.nextWeek') },
    { key: 'last_week', label: t('dateFilters.lastWeek') },
  ];
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const chipPositions = useRef<Record<string, { x: number; width: number }>>({});

  const [tempDate, setTempDate] = React.useState<Date>(selectedDate || new Date());

  const isCalendarSelected = selectedFilter === 'calendar';

  const scrollToFilter = useCallback((filterId: string) => {
    const position = chipPositions.current[filterId];
    if (position && scrollViewRef.current) {
      const screenWidth = Dimensions.get('window').width;
      const scrollX = Math.max(0, position.x - (screenWidth / 2) + (position.width / 2));
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, []);

  const handleFilterPress = useCallback((filter: DateFilter) => {
    onFilterChange(filter);
    scrollToFilter(filter);
  }, [onFilterChange, scrollToFilter]);

  React.useEffect(() => {
    if (showDatePicker) {
      setTempDate(selectedDate || new Date());
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDatePicker, selectedDate, scaleAnim, opacityAnim, backdropAnim]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);


  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return formatDateString(date1) === formatDateString(date2);
  };

  const handleConfirm = () => {
    onDateSelect?.(tempDate);


    if (isSameDay(tempDate, today)) {
      onFilterChange('today');
    } else if (isSameDay(tempDate, yesterday)) {
      onFilterChange('yesterday');
    } else if (isSameDay(tempDate, tomorrow)) {
      onFilterChange('tomorrow');
    } else {
      onFilterChange('calendar');
    }
    onCloseDatePicker?.();
  };

  const handleCancel = () => {
    setTempDate(selectedDate || new Date());
    onCloseDatePicker?.();
  };

  const formatDisplayDate = (date: Date): string => {
    const isToday = isSameDay(date, today);
    const isTomorrow = isSameDay(date, tomorrow);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const year = date.getFullYear();

    if (isToday) return `${t('dateFilters.today')}, ${weekday} - ${monthDay}, ${year}`;
    if (isTomorrow) return `${t('dateFilters.tomorrow')}, ${weekday} - ${monthDay}, ${year}`;
    return `${weekday} - ${monthDay}, ${year}`;
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >

        <TouchableOpacity
          onLayout={(event) => {
            const { x, width } = event.nativeEvent.layout;
            chipPositions.current['calendar'] = { x, width };
          }}
          style={[
            styles.chip,
            styles.calendarChip,
            {
              backgroundColor: isCalendarSelected
                ? colors.primary.main
                : isDark
                  ? colors.dark.surface
                  : colors.common.white,
              borderColor: isCalendarSelected
                ? colors.primary.main
                : isDark
                  ? colors.dark.border
                  : colors.grey[25],
            },
          ]}
          onPress={() => {
            onCalendarPress?.();
            scrollToFilter('calendar');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.calendarChipContent}>
            <View
              style={[
                styles.calendarIconWrapper,
                {
                  backgroundColor: isCalendarSelected
                    ? colors.semiTransparent.white20
                    : isDark
                      ? colors.grey[60] + '30'
                      : colors.grey[15],
                },
              ]}
            >
              <Icon
                name="calendar-month"
                size={ms(16)}
                color={isCalendarSelected ? colors.common.white : isDark ? colors.grey[25] : colors.grey[60]}
              />
            </View>
            {isCalendarSelected && selectedDate && (
              <Text style={styles.calendarDateText}>
                {formatSelectedDateShort(selectedDate)}
              </Text>
            )}
          </View>
        </TouchableOpacity>


        {filterOptions.map((option) => {
          const isSelected = selectedFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                chipPositions.current[option.key] = { x, width };
              }}
              style={[
                styles.chip,
                styles.chipMargin,
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
              onPress={() => handleFilterPress(option.key)}
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
      {dateRange?.start_date && (
        <View style={styles.dateRow}>
          <View style={styles.dateRowLeft}>
            <Icon name="calendar" size={ms(14)} color={themeColors.text.secondary} />
            <Text style={[styles.dateText, { color: themeColors.text.primary }]}>
              {dateRange.start_date === dateRange.end_date
                ? formatDateFromString(dateRange.start_date)
                : `${formatDateShortFromString(dateRange.start_date)} - ${formatDateShortFromString(dateRange.end_date)}`}
            </Text>
          </View>
        </View>
      )}


      {showDatePicker && (
        <Modal transparent visible={showDatePicker} animationType="none" onRequestClose={handleCancel} statusBarTranslucent>
          <View style={styles.centeredModalContainer}>
            <Animated.View
              style={[
                styles.modalBackdrop,
                { opacity: backdropAnim },
              ]}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
            </Animated.View>

            <Animated.View
              style={[
                styles.datePickerContent,
                {
                  backgroundColor: themeColors.surface,
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              <View style={styles.datePickerHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalIconContainer, { backgroundColor: colors.primary.main }]}>
                    <Icon name="calendar-month" size={ms(20)} color={colors.common.white} />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                      {t('dateFilters.selectDate')}
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: themeColors.text.secondary }]}>
                      {t('dateFilters.pickDateDashboard')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: isDark ? colors.grey[60] + '30' : colors.grey[5] }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={ms(20)} color={isDark ? colors.grey[40] : colors.grey[60]} />
                </TouchableOpacity>
              </View>

              <View style={[styles.selectedDateDisplay, { backgroundColor: isDark ? colors.grey[70] : colors.grey[5] }]}>
                <Text style={[styles.selectedDateText, { color: themeColors.text.primary }]}>
                  {formatDisplayDate(tempDate)}
                </Text>
              </View>

              <Calendar
                current={formatDateString(tempDate)}
                onDayPress={(day: { dateString: string }) => {
                  const [year, month, dayNum] = day.dateString.split('-').map(Number);
                  setTempDate(new Date(year, month - 1, dayNum));
                }}
                markedDates={{
                  [formatDateString(tempDate)]: {
                    selected: true,
                    selectedColor: colors.primary.main,
                  },
                  [formatDateString(today)]: {
                    marked: true,
                    dotColor: colors.primary.main,
                  },
                }}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: themeColors.text.secondary,
                  selectedDayBackgroundColor: colors.primary.main,
                  selectedDayTextColor: colors.common.white,
                  todayTextColor: colors.primary.main,
                  dayTextColor: themeColors.text.primary,
                  textDisabledColor: themeColors.text.hint,
                  arrowColor: colors.primary.main,
                  monthTextColor: themeColors.text.primary,
                  textMonthFontFamily: fontFamily.semiBold,
                  textDayFontFamily: fontFamily.medium,
                  textDayHeaderFontFamily: fontFamily.medium,
                  textMonthFontSize: ms(16),
                  textDayFontSize: ms(14),
                  textDayHeaderFontSize: ms(12),
                }}
                style={styles.calendar}
              />

              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, { borderColor: isDark ? colors.grey[60] : colors.grey[25] }]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelButtonText, { color: themeColors.text.primary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton, { backgroundColor: colors.primary.main }]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
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
  },
  dateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  dateText: {
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
  },

  calendarChip: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
  },
  calendarChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconWrapper: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDateText: {
    color: colors.common.white,
    marginLeft: spacing.xs,
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },

  centeredModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.semiTransparent.black50,
  },
  datePickerContent: {
    width: '90%',
    maxWidth: ms(400),
    borderRadius: ms(16),
    overflow: 'hidden',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: ms(16),
    borderBottomWidth: 0,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(12),
  },
  modalIconContainer: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: ms(16),
    fontFamily: fontFamily.bold,
  },
  modalSubtitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    marginTop: ms(2),
  },
  closeButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateDisplay: {
    marginHorizontal: ms(16),
    paddingVertical: ms(12),
    paddingHorizontal: ms(16),
    borderRadius: ms(10),
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  calendar: {
    marginHorizontal: ms(8),
    marginVertical: ms(8),
  },
  datePickerActions: {
    flexDirection: 'row',
    padding: ms(16),
    gap: ms(12),
  },
  actionButton: {
    flex: 1,
    paddingVertical: ms(12),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  confirmButton: {},
  confirmButtonText: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
    color: colors.common.white,
  },
});

export default DateFilterChips;
