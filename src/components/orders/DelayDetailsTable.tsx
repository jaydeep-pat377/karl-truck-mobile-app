import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, spacing } from '../../utils/responsive';

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

const getDelayColor = (value: number): string => {
  if (value > 0) return colors.error.main;
  if (value < 0) return colors.success.main;
  return colors.grey[60];
};

const getDelayBgColor = (value: number, isDark: boolean): string => {
  if (value > 0) return isDark ? colors.error.main + '20' : colors.error.main + '10';
  if (value < 0) return isDark ? colors.success.main + '20' : colors.success.main + '10';
  return isDark ? colors.grey[80] : colors.grey[10];
};

const formatTime = (time: string): string => {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
};

export const DelayDetailsTable: React.FC<DelayDetailsTableProps> = ({
  isDark = false,
  onTicketPress,
}) => {
  const [showAll, setShowAll] = useState(false);

  const themeColors = {
    card: isDark ? colors.dark.card : colors.common.white,
    cardElevated: isDark ? colors.dark.cardElevated : colors.grey[5],
    text: isDark ? colors.common.white : colors.grey[90],
    textSecondary: isDark ? colors.grey[40] : colors.grey[60],
    textHint: isDark ? colors.grey[50] : colors.grey[50],
    border: isDark ? colors.grey[70] : colors.grey[15],
  };

  const displayData = showAll ? MOCK_DATA : MOCK_DATA.slice(0, 1);

  const renderCard = ({ item, index }: { item: DelayDetailsItem; index: number }) => {
    const hasDelay = item.contractorDelay > 0 || item.producerDelay > 0;
    const isEarly = item.contractorDelay < 0;

    return (
      <View style={[
        styles.card,
        {
          backgroundColor: themeColors.cardElevated,
          borderLeftColor: hasDelay ? colors.error.main : isEarly ? colors.success.main : colors.primary.main,
        }
      ]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.loadBadge, { backgroundColor: colors.primary.main + '15' }]}>
              <Text style={[styles.loadBadgeText, { color: colors.primary.main }]}>
                Load {item.loadOrder}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onTicketPress?.(item.ticket)}
              activeOpacity={0.7}
            >
              <Text style={[styles.ticketText, { color: colors.info.main }]}>
                #{item.ticket}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardHeaderRight}>
            <Icon name="truck-outline" size={ms(14)} color={themeColors.textSecondary} />
            <Text style={[styles.truckText, { color: themeColors.text }]}>
              {item.truck}
            </Text>
          </View>
        </View>

        {/* Time Details */}
        <View style={[styles.timeSection, { borderColor: themeColors.border }]}>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>Planned</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.plannedOnJob)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>Actual</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.actualOnJob)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>Begin Pour</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.beginPour)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>End Pour</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.endPour)}</Text>
            </View>
          </View>
        </View>

        {/* Delay Metrics */}
        <View style={styles.metricsSection}>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.producerDelay, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Producer</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.producerDelay) }]}>
              {item.producerDelay > 0 ? '+' : ''}{item.producerDelay} min
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.contractorDelay, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Contractor</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.contractorDelay) }]}>
              {item.contractorDelay > 0 ? '+' : ''}{item.contractorDelay} min
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.waitingToPour, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Waiting</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.waitingToPour) }]}>
              {item.waitingToPour} min
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: isDark ? colors.grey[80] : colors.grey[10] }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Spacing</Text>
            <Text style={[styles.metricValue, { color: themeColors.text }]}>
              {item.spacing} min
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icon name="clock-alert-outline" size={ms(20)} color={colors.primary.main} />
          <Text style={[styles.title, { color: themeColors.text }]}>Delay Details</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.primary.main + '15' }]}>
          <Text style={[styles.countText, { color: colors.primary.main }]}>
            {MOCK_DATA.length}
          </Text>
        </View>
      </View>

      {/* Cards */}
      <View style={styles.cardsContainer}>
        {displayData.map((item, index) => (
          <React.Fragment key={item.loadOrder}>
            {renderCard({ item, index })}
          </React.Fragment>
        ))}
      </View>

      {/* See More Button */}
      {MOCK_DATA.length > 1 && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => setShowAll(!showAll)}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeMoreText, { color: colors.primary.main }]}>
            {showAll ? 'See Less' : `See More (${MOCK_DATA.length - 1} more)`}
          </Text>
          <Icon
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={ms(16)}
            color={colors.primary.main}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(16),
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: ms(16),
    fontFamily: fontFamily.semiBold,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: ms(20),
  },
  countText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  cardsContainer: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: ms(12),
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: ms(6),
  },
  loadBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
  },
  ticketText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  truckText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
  },
  timeSection: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginBottom: spacing.xs / 2,
  },
  timeValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  metricsSection: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: ms(8),
  },
  metricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(9),
    marginBottom: spacing.xs / 2,
  },
  metricValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  seeMoreText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
});

export default DelayDetailsTable;
