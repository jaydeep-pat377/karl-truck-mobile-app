import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface CalendarPickerModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
  isDark: boolean;
  title?: string;
  minDate?: string;
  maxDate?: string;
}

const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  visible,
  selectedDate,
  onSelect,
  onClose,
  isDark,
  title = 'Select Date',
  minDate,
  maxDate,
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate || '');
  const modalBg = isDark ? colors.dark.surface : colors.light.surface;
  const textColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const borderColor = isDark ? colors.dark.border : colors.light.border;
  const calendarBg = isDark ? colors.dark.surface : colors.light.surface;
  const dayTextColor = isDark ? '#FFFFFF' : '#2d4150';
  const disabledColor = isDark ? 'rgba(255,255,255,0.2)' : '#d9e1e8';
  const monthTextColor = isDark ? '#FFFFFF' : '#2d4150';

  const handleDayPress = useCallback((day: DateData) => {
    setCurrentDate(day.dateString);
  }, []);

  const handleConfirm = useCallback(() => {
    if (currentDate) {
      onSelect(currentDate);
    }
    onClose();
  }, [currentDate, onSelect, onClose]);

  // Reset currentDate when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentDate(selectedDate || '');
    }
  }, [visible, selectedDate]);

  const markedDates = currentDate
    ? {
        [currentDate]: {
          selected: true,
          selectedColor: colors.primary.main,
          selectedTextColor: '#FFFFFF',
        },
      }
    : {};

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.container, { backgroundColor: modalBg }]}>
          {/* Header */}
          <View style={[modalStyles.header, { borderBottomColor: borderColor }]}>
            <Text variant="h3" style={{ flex: 1, color: textColor }}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={ms(24)} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <Calendar
            current={currentDate || undefined}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            minDate={minDate}
            maxDate={maxDate}
            enableSwipeMonths
            theme={{
              backgroundColor: calendarBg,
              calendarBackground: calendarBg,
              textSectionTitleColor: isDark ? 'rgba(255,255,255,0.5)' : '#b6c1cd',
              selectedDayBackgroundColor: colors.primary.main,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.primary.main,
              todayBackgroundColor: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)',
              dayTextColor,
              textDisabledColor: disabledColor,
              monthTextColor,
              arrowColor: colors.primary.main,
              textDayFontSize: ms(14),
              textMonthFontSize: ms(16),
              textDayHeaderFontSize: ms(12),
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
            }}
            style={modalStyles.calendar}
          />

          {/* Selected Date Display + Confirm */}
          <View style={[modalStyles.footer, { borderTopColor: borderColor }]}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                Selected
              </Text>
              <Text variant="bodyLarge" style={{ color: textColor, fontWeight: '600', marginTop: ms(2) }}>
                {currentDate
                  ? `${currentDate.split('-')[1]}/${currentDate.split('-')[2]}/${currentDate.split('-')[0]}`
                  : 'None'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                modalStyles.confirmBtn,
                { backgroundColor: currentDate ? colors.primary.main : disabledColor },
              ]}
              onPress={handleConfirm}
              disabled={!currentDate}
              activeOpacity={0.7}
            >
              <Text variant="buttonSmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    paddingBottom: ms(30),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
  },
  calendar: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  confirmBtn: {
    paddingHorizontal: ms(24),
    paddingVertical: ms(12),
    borderRadius: ms(10),
  },
});

export default CalendarPickerModal;
