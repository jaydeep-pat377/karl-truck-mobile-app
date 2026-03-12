import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, BottomSheet } from '../common';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { ms, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

export interface ScheduledLoadItem {
  load_number: number;
  load_status?: string;
  load_status_code?: string;
  scheduled_time?: string;
  actual_time?: string | null;
  scheduled_qty?: string;
  actual_qty?: string | null;
  variance?: string | null;
  truck_code?: string | null;
  scheduled_on_job_time?: string;
  scheduled_fin_pour_time?: string;
  scheduled_at_plant_time?: string;
  ticket_code?: string | null;
  actual_on_job_time?: string | null;
  actual_unload_time?: string | null;
  actual_wash_time?: string | null;
  actual_at_plant_time?: string | null;
}

const LOAD_STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: colors.grey[50], icon: 'clock-outline', label: 'Pending' },
  ticketed: { color: colors.trackingStatus.ticketed, icon: 'ticket-outline', label: 'Ticketed' },
  loading: { color: colors.trackingStatus.loading, icon: 'package-variant', label: 'Loading' },
  loaded: { color: colors.trackingStatus.loaded, icon: 'package-variant-closed', label: 'Loaded' },
  to_job: { color: colors.trackingStatus.toJob, icon: 'truck-fast', label: 'To Job' },
  at_job: { color: colors.trackingStatus.atJob, icon: 'map-marker-check', label: 'At Job' },
  pouring: { color: colors.trackingStatus.pouring, icon: 'water', label: 'Pouring' },
  begin_pour: { color: colors.trackingStatus.pouring, icon: 'water', label: 'Begin Pour' },
  poured: { color: colors.trackingStatus.poured, icon: 'water-check', label: 'Poured' },
  washing: { color: colors.trackingStatus.washing, icon: 'water-pump', label: 'Washing' },
  to_plant: { color: colors.trackingStatus.toPlant, icon: 'arrow-u-left-top', label: 'To Plant' },
  at_plant: { color: colors.trackingStatus.atPlant, icon: 'home-circle', label: 'At Plant' },
  cancelled: { color: colors.error.main, icon: 'close-circle', label: 'Cancelled' },
  voided: { color: colors.error.main, icon: 'close-circle', label: 'Voided' },
};

interface ScheduledLoadsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  loads: ScheduledLoadItem[];
  totalLoads?: number;
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

const GRID = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

const SHADOWS = {
  sm: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const ScheduledLoadsBottomSheet: React.FC<ScheduledLoadsBottomSheetProps> = ({
  visible,
  onClose,
  loads,
  totalLoads,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const completedLoads = loads.filter(l => !!l.actual_time).length;
  const displayTotal = totalLoads || loads.length;
  const subtitle = `${completedLoads} of ${displayTotal} completed`;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && onLoadMore) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  const renderLoadCard = useCallback(({ item: load, index }: { item: ScheduledLoadItem; index: number }) => {
    const isCompleted = !!load.actual_time;

    return (
      <View
        style={[
          styles.loadCard,
          { backgroundColor: isDark ? themeColors.cardElevated : colors.common.white }
        ]}
      >
        <View style={styles.loadCardHeader}>
          <View style={styles.headerLeftGroup}>
            <View style={[
              styles.loadBadge,
              {
                backgroundColor: isCompleted ? colors.success.main + '15' : colors.primary.main + '15',
                borderWidth: 1,
                borderColor: isCompleted ? colors.success.main : colors.primary.main
              }
            ]}>
              <Text style={[styles.loadBadgeText, { color: isCompleted ? colors.success.main : colors.primary.main }]}>#{load.load_number}</Text>
            </View>
            <Text style={[styles.loadCardQtyText, { color: themeColors.text.primary }]} numberOfLines={1}>
              {load.scheduled_qty}
            </Text>

            {load.load_status && (
              <View style={[styles.loadStatusTag, {
                backgroundColor: isDark
                  ? (LOAD_STATUS_CONFIG[load.load_status_code || '']?.color || colors.grey[50]) + '20'
                  : (LOAD_STATUS_CONFIG[load.load_status_code || '']?.color || colors.grey[50]) + '15'
              }]}>
                <Icon
                  name={LOAD_STATUS_CONFIG[load.load_status_code || '']?.icon || 'circle-outline'}
                  size={ms(10)}
                  color={LOAD_STATUS_CONFIG[load.load_status_code || '']?.color || colors.grey[50]}
                />
                <Text
                  style={[styles.loadStatusText, { color: LOAD_STATUS_CONFIG[load.load_status_code || '']?.color || colors.grey[50] }]}
                >
                  {load.load_status}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRightGroup}>
            {load.ticket_code && (
              <View style={[styles.loadTicketTag, { backgroundColor: isDark ? colors.secondary.main + '20' : colors.secondary.main + '12' }]}>
                <Icon name="ticket-outline" size={ms(10)} color={colors.secondary.main} />
                <Text style={[styles.loadTicketText, { color: colors.secondary.main }]}>{load.ticket_code}</Text>
              </View>
            )}

            {load.truck_code && (
              <View style={[styles.loadTruckTag, { backgroundColor: isDark ? colors.info.main + '20' : colors.info.main + '12' }]}>
                <ConcreteTruck width={ms(16)} height={ms(12)} color={colors.info.main} />
                <Text style={[styles.loadTruckText, { color: colors.info.main }]}>{load.truck_code}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.loadTimeRow, {
          borderTopColor: isDark ? themeColors.border : colors.grey[10],
          backgroundColor: isDark ? colors.semiTransparent.white03 : colors.common.transparent
        }]}>
          <View style={styles.loadTimeBlock}>
            <Text style={[styles.loadTimeBlockLabel, { color: isDark ? colors.grey[40] : themeColors.text.hint }]}>Scheduled</Text>
            <Text style={[styles.loadTimeBlockValue, { color: themeColors.text.primary }]}>
              {load.scheduled_time || '--:--'}
            </Text>
          </View>

          <View style={styles.loadTimeArrow}>
            <Icon name="arrow-right" size={ms(14)} color={isDark ? colors.grey[40] : themeColors.text.hint} />
          </View>

          <View style={styles.loadTimeBlock}>
            <Text style={[styles.loadTimeBlockLabel, { color: isDark ? colors.grey[40] : themeColors.text.hint }]}>At Job</Text>
            <Text style={[styles.loadTimeBlockValue, { color: themeColors.text.primary }]}>
              {load.actual_on_job_time || load.scheduled_on_job_time || '--:--'}
            </Text>
          </View>

          <View style={styles.loadTimeArrow}>
            <Icon name="arrow-right" size={ms(14)} color={isDark ? colors.grey[40] : themeColors.text.hint} />
          </View>

          <View style={styles.loadTimeBlock}>
            <Text style={[styles.loadTimeBlockLabel, { color: isDark ? colors.grey[40] : themeColors.text.hint }]}>Unload</Text>
            <Text style={[styles.loadTimeBlockValue, { color: themeColors.text.primary }]}>
              {load.actual_unload_time || load.scheduled_fin_pour_time || '--:--'}
            </Text>
          </View>
        </View>

        {(load.actual_wash_time || load.actual_at_plant_time) && (
          <View style={[styles.loadInfoRow, { borderTopColor: isDark ? themeColors.border : colors.grey[10] }]}>
            {load.actual_wash_time && (
              <View style={styles.loadInfoItem}>
                <Text style={[styles.loadInfoLabel, { color: isDark ? colors.grey[40] : colors.grey[50] }]}>Wash</Text>
                <View style={[styles.loadInfoTag, {
                  backgroundColor: isDark ? colors.grey[70] : colors.grey[8],
                  borderWidth: 1,
                  borderColor: isDark ? colors.grey[50] : colors.grey[15]
                }]}>
                  <Icon name="car-wash" size={ms(12)} color={isDark ? colors.grey[25] : colors.grey[60]} />
                  <Text style={[styles.loadInfoTagText, { color: isDark ? colors.grey[15] : colors.grey[70] }]}>{load.actual_wash_time}</Text>
                </View>
              </View>
            )}
            {load.actual_at_plant_time && (
              <View style={styles.loadInfoItem}>
                <Text style={[styles.loadInfoLabel, { color: isDark ? colors.grey[40] : colors.grey[50] }]}>Return</Text>
                <View style={[styles.loadInfoTag, {
                  backgroundColor: isDark ? colors.grey[70] : colors.grey[8],
                  borderWidth: 1,
                  borderColor: isDark ? colors.grey[50] : colors.grey[15]
                }]}>
                  <Icon name="keyboard-return" size={ms(12)} color={isDark ? colors.grey[25] : colors.grey[60]} />
                  <Text style={[styles.loadInfoTagText, { color: isDark ? colors.grey[15] : colors.grey[70] }]}>{load.actual_at_plant_time}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [isDark, themeColors]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text style={[styles.footerLoaderText, { color: themeColors.text.secondary }]}>
          Loading more...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, themeColors]);

  const renderHeader = useCallback(() => (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5] }]}>
        <Text style={[styles.summaryValue, { color: themeColors.text.primary }]}>{displayTotal}</Text>
        <Text style={[styles.summaryLabel, { color: isDark ? colors.grey[25] : themeColors.text.secondary }]}>Total</Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5] }]}>
        <Text style={[styles.summaryValue, { color: themeColors.text.primary }]}>{completedLoads}</Text>
        <Text style={[styles.summaryLabel, { color: isDark ? colors.grey[25] : themeColors.text.secondary }]}>Completed</Text>
      </View>
      <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5] }]}>
        <Text style={[styles.summaryValue, { color: themeColors.text.primary }]}>{displayTotal - completedLoads}</Text>
        <Text style={[styles.summaryLabel, { color: isDark ? colors.grey[25] : themeColors.text.secondary }]}>Pending</Text>
      </View>
    </View>
  ), [isDark, themeColors, displayTotal, completedLoads]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
            Loading scheduled loads...
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Icon name="calendar-blank-outline" size={ms(48)} color={themeColors.text.hint} />
        <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
          No scheduled loads available
        </Text>
      </View>
    );
  }, [isLoading, themeColors]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Scheduled Loads"
      subtitle={subtitle}
      headerIcon="format-list-numbered"
      headerIconColor={colors.secondary.main}
      height="full"
      disableScroll
    >
      <View style={styles.container}>
        <FlatList
          data={loads}
          renderItem={renderLoadCard}
          keyExtractor={(item, index) => `${item.load_number}-${index}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: GRID.xs,
    paddingBottom: GRID.lg,
    flexGrow: 1,
  },
  itemSeparator: {
    height: GRID.xs + 2,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.md,
    gap: GRID.sm,
  },
  footerLoaderText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
  },
  summaryRow: {
    flexDirection: 'row',
    gap: GRID.sm,
    marginBottom: GRID.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: GRID.sm,
    borderRadius: RADIUS.md,
  },
  summaryValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(22),
    marginBottom: 1,
  },
  summaryLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  loadsList: {
    gap: GRID.xs + 2,
    paddingBottom: GRID.lg,
  },
  loadCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm,
    gap: GRID.xs,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: GRID.xs,
    flex: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
  },
  loadBadge: {
    paddingHorizontal: GRID.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  loadBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(11),
    color: colors.common.white,
  },
  loadCardQtyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    flexShrink: 1,
  },
  loadStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 3,
    flexShrink: 0,
  },
  loadStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    flexShrink: 0,
  },
  loadTruckTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  loadTruckText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(9),
  },
  loadTicketTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  loadTicketText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(9),
    flexShrink: 1,
  },
  loadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: GRID.xs + 2,
    paddingHorizontal: GRID.sm,
    borderTopWidth: 1,
  },
  loadTimeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  loadTimeBlockLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  loadTimeBlockValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  loadTimeArrow: {
    paddingHorizontal: 2,
  },
  loadInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.sm,
    borderTopWidth: 1,
  },
  loadInfoItem: {
    alignItems: 'center',
    gap: GRID.xs - 1,
    flex: 1,
  },
  loadInfoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  loadInfoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.xs - 1,
    paddingHorizontal: GRID.sm - 2,
    borderRadius: RADIUS.sm,
    gap: GRID.xs - 1,
  },
  loadInfoTagText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
    color: colors.common.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.lg * 2,
  },
  emptyText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    marginTop: GRID.md,
  },
});

export default ScheduledLoadsBottomSheet;
