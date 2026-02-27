import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';

interface DelayDetailsItem {
  loadOrder: number;
  ticket: string;
  truck: string;
  plannedOnJob: string;
  actualOnJob: string;
  producerDelay: number;
  beginPour: string;
  endPour: string;
  scheduledEndPour: string;
  spacing: number;
  waitingToPour: number;
  pourMinOver: number;
  contractorDelay: number;
  plusLoad: number;
}

interface DelayDetailsTableProps {
  isDark?: boolean;
  onTicketPress?: (ticketCode: string) => void;
}

// Static mock data
const MOCK_DATA: DelayDetailsItem[] = [
  { loadOrder: 1, ticket: '23383391', truck: '205430', plannedOnJob: '04:00:00', actualOnJob: '03:45:26', producerDelay: 0, beginPour: '03:54:38', endPour: '04:08:12', scheduledEndPour: '04:10:00', spacing: 10, waitingToPour: 0, pourMinOver: 4, contractorDelay: 4, plusLoad: 0 },
  { loadOrder: 2, ticket: '23383393', truck: '205259', plannedOnJob: '04:10:00', actualOnJob: '03:54:07', producerDelay: 0, beginPour: '04:08:48', endPour: '04:17:26', scheduledEndPour: '04:20:00', spacing: 10, waitingToPour: 0, pourMinOver: -1, contractorDelay: -1, plusLoad: 0 },
  { loadOrder: 3, ticket: '23383394', truck: '205434', plannedOnJob: '04:20:00', actualOnJob: '04:05:33', producerDelay: 0, beginPour: '04:17:10', endPour: '04:34:52', scheduledEndPour: '04:30:00', spacing: 10, waitingToPour: 0, pourMinOver: 8, contractorDelay: 8, plusLoad: 0 },
  { loadOrder: 4, ticket: '23383395', truck: '205425', plannedOnJob: '04:30:00', actualOnJob: '04:18:38', producerDelay: 0, beginPour: '04:25:26', endPour: '04:34:32', scheduledEndPour: '04:40:00', spacing: 10, waitingToPour: 0, pourMinOver: -1, contractorDelay: -1, plusLoad: 0 },
  { loadOrder: 5, ticket: '23383396', truck: '205377', plannedOnJob: '04:40:00', actualOnJob: '04:30:37', producerDelay: 0, beginPour: '04:46:39', endPour: '04:46:42', scheduledEndPour: '04:50:00', spacing: 10, waitingToPour: 7, pourMinOver: -10, contractorDelay: -3, plusLoad: 0 },
  { loadOrder: 6, ticket: '23383397', truck: '205176', plannedOnJob: '04:50:00', actualOnJob: '04:35:04', producerDelay: 0, beginPour: '04:47:42', endPour: '05:02:52', scheduledEndPour: '05:00:00', spacing: 10, waitingToPour: 0, pourMinOver: 5, contractorDelay: 5, plusLoad: 0 },
  { loadOrder: 7, ticket: '23383398', truck: '205336', plannedOnJob: '05:00:00', actualOnJob: '04:45:07', producerDelay: 0, beginPour: '04:58:01', endPour: '05:06:43', scheduledEndPour: '05:10:00', spacing: 10, waitingToPour: 0, pourMinOver: -1, contractorDelay: -1, plusLoad: 0 },
  { loadOrder: 8, ticket: '23383399', truck: '205430', plannedOnJob: '05:10:00', actualOnJob: '04:53:27', producerDelay: 0, beginPour: '05:06:53', endPour: '05:17:16', scheduledEndPour: '05:20:00', spacing: 10, waitingToPour: 0, pourMinOver: 0, contractorDelay: 0, plusLoad: 0 },
  { loadOrder: 9, ticket: '23383400', truck: '205259', plannedOnJob: '05:20:00', actualOnJob: '05:02:37', producerDelay: 0, beginPour: '05:17:16', endPour: '05:25:07', scheduledEndPour: '05:30:00', spacing: 10, waitingToPour: 0, pourMinOver: -2, contractorDelay: -2, plusLoad: 0 },
  { loadOrder: 10, ticket: '23383401', truck: '205434', plannedOnJob: '05:30:00', actualOnJob: '05:11:20', producerDelay: 0, beginPour: '05:25:24', endPour: '05:37:13', scheduledEndPour: '05:40:00', spacing: 10, waitingToPour: 0, pourMinOver: 2, contractorDelay: 2, plusLoad: 0 },
  { loadOrder: 11, ticket: '23383402', truck: '205425', plannedOnJob: '05:40:00', actualOnJob: '05:26:02', producerDelay: 0, beginPour: '05:37:14', endPour: '05:51:31', scheduledEndPour: '05:50:00', spacing: 10, waitingToPour: 0, pourMinOver: 4, contractorDelay: 4, plusLoad: 0 },
];

const COLUMNS = [
  { key: 'loadOrder', label: 'Load Order', width: 80 },
  { key: 'ticket', label: 'Ticket', width: 90 },
  { key: 'truck', label: 'Truck', width: 70 },
  { key: 'plannedOnJob', label: 'Planned On Job', width: 110 },
  { key: 'actualOnJob', label: 'Actual On Job', width: 110 },
  { key: 'producerDelay', label: 'Producer Delay', width: 110 },
  { key: 'beginPour', label: 'Begin Pour', width: 90 },
  { key: 'endPour', label: 'End Pour', width: 90 },
  { key: 'scheduledEndPour', label: 'Scheduled End Pour', width: 130 },
  { key: 'spacing', label: 'Spacing', width: 70 },
  { key: 'waitingToPour', label: 'Waiting To Pour', width: 120 },
  { key: 'pourMinOver', label: 'Pour Min Over', width: 110 },
  { key: 'contractorDelay', label: 'Contractor Delay', width: 120 },
  { key: 'plusLoad', label: 'Plus Load', width: 80 },
];

const getValueColor = (value: number): string => {
  if (value > 0) return colors.error.main;
  if (value < 0) return colors.success.main;
  return colors.grey[60];
};

export const DelayDetailsTable: React.FC<DelayDetailsTableProps> = ({
  isDark = false,
  onTicketPress,
}) => {
  const themeColors = {
    card: isDark ? colors.dark.card : colors.common.white,
    text: isDark ? colors.common.white : colors.grey[90],
    textSecondary: isDark ? colors.grey[40] : colors.grey[60],
    border: isDark ? colors.grey[80] : colors.grey[20],
    headerBg: isDark ? colors.dark.cardElevated : colors.grey[10],
    rowBg: isDark ? colors.dark.card : colors.common.white,
    rowAltBg: isDark ? colors.dark.cardElevated : colors.grey[5],
  };

  const renderCell = (item: DelayDetailsItem, columnKey: string, index: number) => {
    const value = item[columnKey as keyof DelayDetailsItem];

    if (columnKey === 'ticket') {
      return (
        <TouchableOpacity
          onPress={() => onTicketPress?.(String(value))}
          activeOpacity={0.7}
        >
          <Text style={[styles.cellText, styles.ticketText]}>
            {value}
          </Text>
        </TouchableOpacity>
      );
    }

    if (['pourMinOver', 'contractorDelay', 'plusLoad'].includes(columnKey)) {
      const numValue = Number(value);
      return (
        <Text style={[styles.cellText, { color: getValueColor(numValue) }]}>
          {numValue}
        </Text>
      );
    }

    return (
      <Text style={[styles.cellText, { color: themeColors.text }]}>
        {value}
      </Text>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Delay Details</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          {/* Header Row */}
          <View style={[styles.headerRow, { backgroundColor: themeColors.headerBg }]}>
            {COLUMNS.map((column, index) => (
              <View
                key={column.key}
                style={[
                  styles.headerCell,
                  index === 0 && styles.headerCellFirst,
                  index === COLUMNS.length - 1 && styles.headerCellLast,
                  { width: column.width, borderColor: themeColors.border }
                ]}
              >
                <Text style={[styles.headerText, { color: themeColors.textSecondary }]}>
                  {column.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {MOCK_DATA.map((item, rowIndex) => {
            const isLastRow = rowIndex === MOCK_DATA.length - 1;
            return (
              <View
                key={item.loadOrder}
                style={[
                  styles.dataRow,
                  {
                    backgroundColor: rowIndex % 2 === 0 ? themeColors.rowBg : themeColors.rowAltBg,
                    borderColor: themeColors.border,
                  }
                ]}
              >
                {COLUMNS.map((column, colIndex) => (
                  <View
                    key={column.key}
                    style={[
                      styles.dataCell,
                      colIndex === 0 && !isLastRow && styles.dataCellFirst,
                      colIndex === 0 && isLastRow && styles.dataCellFirstLastRow,
                      colIndex === COLUMNS.length - 1 && isLastRow && styles.dataCellLastLastRow,
                      { width: column.width, borderColor: themeColors.border }
                    ]}
                  >
                    {renderCell(item, column.key, rowIndex)}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: ms(16),
    fontFamily: fontFamily.semiBold,
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderTopWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCellFirst: {
    borderLeftWidth: 1,
    borderTopLeftRadius: 8,
  },
  headerCellLast: {
    borderTopRightRadius: 8,
  },
  headerText: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  dataCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataCellFirst: {
    borderLeftWidth: 1,
  },
  dataCellFirstLastRow: {
    borderLeftWidth: 1,
    borderBottomLeftRadius: 8,
  },
  dataCellLastLastRow: {
    borderBottomRightRadius: 8,
  },
  cellText: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  ticketText: {
    color: colors.info.main,
    fontFamily: fontFamily.medium,
  },
});

export default DelayDetailsTable;
