import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView } from 'react-native';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, spacing } from '../../utils/responsive';
import { DelayDetailItem } from '../../types/ticket';

const CALCULATION_INFO = [
  {
    label: 'Producer Delay',
    description: 'Actual Arrived - Scheduled On Job (minutes). Positive = late, 0 = on time.',
  },
  {
    label: 'Contractor Delay',
    description: 'Waiting to Pour + Pour Minutes Over. Waiting = Begin Pour - MAX(Scheduled, Arrived). Pour Over = (End Pour - Begin Pour) - Spacing.',
  },
  {
    label: 'Waiting to Pour',
    description: 'Begin Pour - MAX(Scheduled On Job, Actual Arrived) (minutes)',
  },
  {
    label: 'Pour Out',
    description: 'End Pour - Begin Pour (minutes). Time taken to pour out the concrete load. Shows "--" if pour is not yet complete.',
  },
  {
    label: 'Pour Performance',
    description: 'Actual Pour Duration - Scheduled Spacing (minutes). Negative = faster than scheduled, Positive = slower than scheduled.',
  },
  {
    label: 'Pour Duration',
    description: 'End Pour - Begin Pour (minutes)',
  },
  {
    label: 'Pour Min Over',
    description: 'Actual Pour Duration - Scheduled Spacing (minutes). Negative = faster than scheduled.',
  },
  {
    label: 'Spacing',
    description: 'Scheduled spacing between loads (Load Qty / Delivery Rate)',
  },
];

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

// Format ISO timestamp or time string to HH:MM format with rounding at 30 seconds
const formatTime = (time: string | null | undefined): string => {
  if (!time) return '--:--';

  let hours: number;
  let minutes: number;
  let seconds: number;

  // Check if it's an ISO timestamp (e.g., "2026-03-04T16:29:55.000Z")
  if (time.includes('T')) {
    const timePart = time.split('T')[1];
    if (timePart) {
      const timeOnly = timePart.split('.')[0]; // Remove milliseconds
      const parts = timeOnly.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      seconds = parseInt(parts[2] || '0', 10);
    } else {
      return '--:--';
    }
  } else {
    // Handle HH:MM:SS format
    const parts = time.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseInt(parts[2] || '0', 10);
  }

  // Round up if seconds >= 30
  if (seconds >= 30) {
    minutes += 1;
    if (minutes >= 60) {
      minutes = 0;
      hours += 1;
      if (hours >= 24) {
        hours = 0;
      }
    }
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const DelayDetailsTable: React.FC<DelayDetailsTableProps> = ({
  isDark = false,
  data = [],
  onTicketPress,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

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
        {/* Ticket Row - Top of Card */}
        {item.ticket && (
          <TouchableOpacity
            style={[styles.ticketTopRow, { backgroundColor: colors.info.main + '15' }]}
            onPress={() => onTicketPress?.(item.ticket!)}
            activeOpacity={0.7}
          >
            <Icon name="ticket-outline" size={ms(14)} color={colors.info.main} />
            <Text style={[styles.ticketTopLabel, { color: colors.info.main }]}>Ticket</Text>
            <Text style={[styles.ticketTopValue, { color: colors.info.main }]}>#{item.ticket}</Text>
          </TouchableOpacity>
        )}

        {/* Card Header */}
        <View style={styles.cardInfoRow}>
          <View style={[styles.infoBadge, { backgroundColor: colors.primary.main + '15' }]}>
            <Text style={[styles.infoLabel, { color: colors.primary.main }]}>Load</Text>
            <Text style={[styles.infoValue, { color: colors.primary.main }]}>{item.load_order}</Text>
          </View>
          {item.load_qty && (
            <View style={[styles.infoBadge, { backgroundColor: isDark ? colors.grey[60] : colors.grey[10] }]}>
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Qty</Text>
              <Text style={[styles.infoValue, { color: themeColors.text }]}>{item.load_qty} CY</Text>
            </View>
          )}
          <View style={[styles.infoBadge, { backgroundColor: isDark ? colors.grey[60] : colors.grey[10] }]}>
            <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Spacing</Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>{item.spacing} min</Text>
          </View>
          <View style={[styles.infoBadge, { backgroundColor: isDark ? colors.grey[60] : colors.grey[10] }]}>
            <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>Pour Duration</Text>
            <Text style={[styles.infoValue, { color: themeColors.text }]}>{item.pour_duration !== null ? `${item.pour_duration} min` : '--'}</Text>
          </View>
        </View>

        {/* Time Details */}
        <View style={[styles.timeSection, { borderColor: themeColors.border }]}>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>{"Scheduled\nTime"}</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.planned_on_job)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>{"Arrived\nTime"}</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.actual_on_job)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>{"Begin\nPour"}</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.begin_pour)}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: themeColors.textHint }]}>{"End\nPour"}</Text>
              <Text style={[styles.timeValue, { color: themeColors.text }]}>{formatTime(item.end_pour)}</Text>
            </View>
          </View>
        </View>

        {/* Delay Metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricItemSmall, { backgroundColor: getDelayBgColor(item.producer_delay, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{"Producer\nDelay"}</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.producer_delay) }]}>
              {item.producer_delay > 0 ? '+' : ''}{item.producer_delay}
            </Text>
          </View>
          <View style={[styles.metricItemSmall, { backgroundColor: getDelayBgColor(item.contractor_delay, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{"Contractor\nDelay"}</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.contractor_delay) }]}>
              {item.contractor_delay > 0 ? '+' : ''}{item.contractor_delay}
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: getDelayBgColor(item.waiting_to_pour, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>Waiting</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.waiting_to_pour) }]}>
              {item.waiting_to_pour}
            </Text>
          </View>
          <View style={[styles.metricItem, { backgroundColor: item.pour_out_minutes !== null && item.pour_out_minutes !== undefined ? getDelayBgColor(item.pour_out_minutes, isDark) : (isDark ? colors.grey[80] : colors.grey[10]) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{"Pour\nOut"}</Text>
            <Text style={[styles.metricValue, { color: item.pour_out_minutes !== null && item.pour_out_minutes !== undefined ? getDelayColor(item.pour_out_minutes) : themeColors.textHint }]}>
              {item.pour_out_minutes !== null && item.pour_out_minutes !== undefined ? item.pour_out_minutes : '--'}
            </Text>
          </View>
          <View style={[styles.metricItemLarge, { backgroundColor: getDelayBgColor(item.pour_min_over, isDark) }]}>
            <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]}>{"Pour\nPerf"}</Text>
            <Text style={[styles.metricValue, { color: getDelayColor(item.pour_min_over) }]}>
              {item.pour_min_over > 0 ? '+' : ''}{item.pour_min_over}
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
          <Text style={[styles.title, { color: themeColors.text }]}>Order Performance</Text>
          <TouchableOpacity
            style={styles.infoIconButton}
            onPress={() => setShowInfoModal(true)}
            activeOpacity={0.7}
          >
            <Icon name="information-outline" size={ms(14)} color={colors.info.main} />
          </TouchableOpacity>
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.primary.main + '15' }]}>
          <Text style={[styles.countText, { color: colors.primary.main }]}>
            {data.length}
          </Text>
        </View>
      </View>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Calculation Details</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Icon name="close" size={ms(22)} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {CALCULATION_INFO.map((item, index) => (
                <View key={index} style={[styles.infoItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.modalInfoLabel, { color: colors.primary.main }]}>{item.label}</Text>
                  <Text style={[styles.infoDescription, { color: themeColors.textSecondary }]}>{item.description}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
  infoIconButton: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: colors.info.main + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: ms(6),
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  ticketTopLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  ticketTopValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 3,
  },
  infoBadge: {
    flex: 1,
    flexShrink: 1,
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
    borderRadius: ms(4),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  infoLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginBottom: 1,
    textAlign: 'center',
  },
  infoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    textAlign: 'center',
  },
  timeSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
  },
  timeValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    borderRadius: ms(6),
  },
  metricItemSmall: {
    flex: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    borderRadius: ms(6),
  },
  metricItemLarge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    borderRadius: ms(6),
  },
  metricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(9),
    textAlign: 'center',
    lineHeight: ms(12),
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(12),
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: ms(16),
    padding: spacing.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[25],
  },
  modalTitle: {
    fontSize: ms(16),
    fontFamily: fontFamily.bold,
  },
  modalBody: {
    maxHeight: ms(400),
  },
  infoItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalInfoLabel: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.xs,
  },
  infoDescription: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    lineHeight: ms(18),
  },
});

export default DelayDetailsTable;
