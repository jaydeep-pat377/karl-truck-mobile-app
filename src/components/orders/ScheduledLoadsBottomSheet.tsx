import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, BottomSheet } from '../common';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { ms, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';

export interface ScheduledLoadItem {
  load_number: number;
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

interface ScheduledLoadsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  loads: ScheduledLoadItem[];
  totalLoads?: number;
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
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const completedLoads = loads.filter(l => !!l.actual_time).length;
  const subtitle = totalLoads
    ? `${completedLoads} of ${totalLoads} completed`
    : `${loads.length} loads`;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Scheduled Loads"
      subtitle={subtitle}
      headerIcon="format-list-numbered"
      headerIconColor={colors.secondary.main}
      height="full"
    >
      <View style={styles.container}>
        {/* Summary Stats */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5] }]}>
            <Text style={[styles.summaryValue, { color: themeColors.text.primary }]}>{loads.length}</Text>
            <Text style={[styles.summaryLabel, { color: isDark ? colors.grey[25] : themeColors.text.secondary }]}>Total</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5] }]}>
            <Text style={[styles.summaryValue, { color: themeColors.text.primary }]}>{completedLoads}</Text>
            <Text style={[styles.summaryLabel, { color: isDark ? colors.grey[25] : themeColors.text.secondary }]}>Completed</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[5] }]}>
            <Text style={[styles.summaryValue, { color: themeColors.text.primary }]}>{loads.length - completedLoads}</Text>
            <Text style={[styles.summaryLabel, { color: isDark ? colors.grey[25] : themeColors.text.secondary }]}>Pending</Text>
          </View>
        </View>

        {/* Loads List */}
        <View style={styles.loadsList}>
          {loads.map((load, index) => {
            const isCompleted = !!load.actual_time;

            return (
              <View
                key={load.load_number || index}
                style={[
                  styles.loadCard,
                  { backgroundColor: isDark ? themeColors.cardElevated : colors.common.white }
                ]}
              >
                {/* Card Header - Single Line */}
                <View style={styles.loadCardHeader}>
                  {/* Load Number */}
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

                  {/* Quantity */}
                  <Text style={[styles.loadCardQtyText, { color: themeColors.text.primary }]} numberOfLines={1}>
                    {load.scheduled_qty}
                  </Text>

                  {/* Spacer to push right items */}
                  <View style={styles.headerSpacer} />

                  {/* Status */}
                  {isCompleted && (
                    <View style={[styles.loadStatusTag, { backgroundColor: isDark ? colors.success.main + '20' : colors.success.main + '15' }]}>
                      <Icon name="check-circle" size={ms(10)} color={colors.success.main} />
                      <Text style={[styles.loadStatusText, { color: colors.success.main }]}>Done</Text>
                    </View>
                  )}

                  {/* Ticket */}
                  {load.ticket_code && (
                    <View style={[styles.loadTicketTag, { backgroundColor: isDark ? colors.secondary.main + '20' : colors.secondary.main + '12' }]}>
                      <Icon name="ticket-outline" size={ms(10)} color={colors.secondary.main} />
                      <Text style={[styles.loadTicketText, { color: colors.secondary.main }]} numberOfLines={1}>{load.ticket_code}</Text>
                    </View>
                  )}

                  {/* Truck */}
                  {load.truck_code && (
                    <View style={[styles.loadTruckTag, { backgroundColor: isDark ? colors.info.main + '20' : colors.info.main + '12' }]}>
                      <ConcreteTruck width={ms(16)} height={ms(12)} color={colors.info.main} />
                      <Text style={[styles.loadTruckText, { color: colors.info.main }]} numberOfLines={1}>{load.truck_code}</Text>
                    </View>
                  )}
                </View>

                {/* Time Row */}
                <View style={[styles.loadTimeRow, {
                  borderTopColor: isDark ? themeColors.border : colors.grey[10],
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'transparent'
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

                {/* Wash & Return Info */}
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
          })}
        </View>

        {loads.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="calendar-blank-outline" size={ms(48)} color={themeColors.text.hint} />
            <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
              No scheduled loads available
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm,
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
  headerSpacer: {
    flex: 1,
  },
  loadCardQtyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    flexShrink: 1,
  },
  loadStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  loadStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(9),
  },
  loadTruckTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 2,
    maxWidth: ms(70),
  },
  loadTruckText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    flexShrink: 1,
  },
  loadTicketTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 2,
    maxWidth: ms(80),
  },
  loadTicketText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
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
