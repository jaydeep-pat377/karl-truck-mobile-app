import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, spacing } from '../../utils/responsive';
import { DelayDetailItem } from '../../types/ticket';

interface DelayDetailsTableProps {
  isDark?: boolean;
  data?: DelayDetailItem[];
  onTicketPress?: (ticketCode: string) => void;
}

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

// Format ISO timestamp or time string to HH:MM format
const formatTime = (time: string | null | undefined): string => {
  if (!time) return '--:--';

  // Check if it's an ISO timestamp
  if (time.includes('T')) {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Handle HH:MM:SS format
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
};

export const DelayDetailsTable: React.FC<DelayDetailsTableProps> = ({
  isDark = false,
  data = [],
  onTicketPress,
}) => {
  const [showAll, setShowAll] = useState(false);

  const themeColors = {
    card: isDark ? colors.dark.card : colors.common.white,
    cardElevated: isDark ? colors.dark.cardElevated : colors.grey[5],
    text: isDark ? colors.common.white : colors.grey[100],
    textSecondary: isDark ? colors.grey[40] : colors.grey[60],
    textHint: isDark ? colors.grey[50] : colors.grey[50],
    border: isDark ? colors.grey[70] : colors.grey[15],
  };

  // Don't render if no data
  if (!data || data.length === 0) {
    return null;
  }

  const displayData = showAll ? data : data.slice(0, 1);

  const renderCard = ({ item, index }: { item: DelayDetailItem; index: number }) => {
    const hasDelay = item.contractor_delay > 0 || item.producer_delay > 0;
    const isEarly = item.contractor_delay < 0;

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
                Load {item.load_order}
              </Text>
            </View>
            {item.ticket && (
              <TouchableOpacity
                onPress={() => onTicketPress?.(item.ticket!)}
                activeOpacity={0.7}
              >
                <Text style={[styles.ticketText, { color: colors.info.main }]}>
                  #{item.ticket}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.cardHeaderRight}>
            <Icon name="truck-outline" size={ms(14)} color={themeColors.textSecondary} />
            <Text style={[styles.truckText, { color: themeColors.text }]}>
              {item.truck || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Time Details */}
        <View style={[styles.timeSection, { borderColor: themeColors.border }]}>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>Planned</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.planned_on_job)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>Actual</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.actual_on_job)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>Begin Pour</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.begin_pour)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>End Pour</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.end_pour)}</Text>
            </View>
          </View>
        </View>

        {/* Delay Metrics */}
        <View style={styles.metricsSection}>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.producer_delay, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Producer</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.producer_delay) }]}>
              {item.producer_delay > 0 ? '+' : ''}{item.producer_delay} min
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.contractor_delay, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Contractor</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.contractor_delay) }]}>
              {item.contractor_delay > 0 ? '+' : ''}{item.contractor_delay} min
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.waiting_to_pour, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Waiting</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.waiting_to_pour) }]}>
              {item.waiting_to_pour} min
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
            {data.length}
          </Text>
        </View>
      </View>

      {/* Cards */}
      <View style={styles.cardsContainer}>
        {displayData.map((item, index) => (
          <React.Fragment key={`${item.load_order}-${item.ticket || index}`}>
            {renderCard({ item, index })}
          </React.Fragment>
        ))}
      </View>

      {/* See More Button */}
      {data.length > 1 && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => setShowAll(!showAll)}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeMoreText, { color: colors.primary.main }]}>
            {showAll ? 'See Less' : `See More (${data.length - 1} more)`}
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
