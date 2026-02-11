import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text, Icon } from '../../components/common';
import {
  DateFilterChips,
  ProductionSummaryCard,
  QuickLaunchCard,
  InformationSection,
} from '../../components/dashboard';
import type { DateFilter, QuickLaunchAction, InfoMessage } from '../../components/dashboard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing, fontSizes, iconSizes } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useDashboard } from '../../hooks/useDashboard';
import { notificationService } from '../../services/notificationService';
import { updateWidgetData } from '../../modules/TodayOverviewWidget';
import { getProgressBarColor } from '../../utils/statusUtils';
import { fontFamily } from '../../theme/typography';

interface ActiveDelivery {
  id: string;
  orderCode: string;
  customerName: string;
  deliveryAddress: string;
  productCodes: string;
  startTime: string;
  orderedQty: number;
  deliveredQty: number;
  remainingQty: number;
  progressPercent: number;
  status: string;
}

const defaultQuickLaunchActions: QuickLaunchAction[] = [
  {
    id: 'invite_customer',
    title: 'CUSTOMER',
    subtitle: 'EASY',
    icon: 'account-group',
    permission: 'invite_customer',
  },
  {
    id: 'order_concrete',
    title: 'ORDER CONCRETE',
    subtitle: 'Click Here',
    icon: 'clipboard-list',
    permission: 'order_concrete',
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'file-document-outline',
    permission: 'view_reports',
  },
];

const DashboardScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { isTablet } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const {
    notifications,
    weather,
    todayOverview,
    activeDeliveries,
    recentAlerts,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDashboard({ dateFilter, deliveriesLimit: 10 });

  useEffect(() => {
    const initNotifications = async () => {
      try {
        const deviceToken = await notificationService.getToken();
        console.log('Device Token:', deviceToken);
      } catch (error) {
        console.log('Error fetching device token:', error);
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && todayOverview) {
      const totalOrders = todayOverview.total_orders ?? 0;
      const normal = todayOverview.normal ?? 0;
      const willCall = todayOverview.will_call ?? 0;
      const hold = todayOverview.hold_delivery ?? 0;
      const cancelled = todayOverview.cancelled ?? 0;
      const inProgress = todayOverview.in_progress ?? 0;
      const completed = todayOverview.completed ?? 0;
      const progress = totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;

      updateWidgetData(totalOrders, normal, willCall, hold, cancelled, inProgress, completed, progress)
        .catch((error) => console.log('Failed to update widget:', error));
    }
  }, [todayOverview]);

  const themeColors = isDark ? colors.dark : colors.light;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDateFilterChange = useCallback((filter: DateFilter) => {
    setDateFilter(filter);
  }, []);




  const infoMessages: InfoMessage[] = useMemo(() => {
    if (!recentAlerts || recentAlerts.length === 0) {
      return [];
    }
    return recentAlerts.map((alert) => ({
      id: alert.id,
      type: alert.type as InfoMessage['type'],
      title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1),
      message: alert.message,
      timestamp: new Date(alert.timestamp).toLocaleTimeString(),
      isRead: false,
    }));
  }, [recentAlerts]);


  const quickLaunchActions = useMemo(() => {
    return defaultQuickLaunchActions;
  }, []);

  const handleQuickLaunchPress = useCallback((_action: QuickLaunchAction) => {
  }, []);

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    switch (normalizedStatus) {
      case 'in_progress':
        return colors.primary.main;
      case 'completed':
        return colors.status.completed;
      case 'enrt':
      case 'en_route':
        return colors.status.enRoute;
      case 'onsit':
      case 'on_site':
        return colors.status.onSite;
      case 'loading':
        return colors.warning.main;
      case 'cancelled':
      case 'canceled':
        return colors.error.main;
      case 'hold':
      case 'hold_delivery':
        return colors.status.onHold;
      default:
        return colors.primary.main;
    }
  };

  const styles = useMemo(
    () => createStyles(themeColors, isTablet, isDark, screenWidth),
    [isDark, isTablet, themeColors, screenWidth]
  );

  const renderDeliveryCard = ({ item, onPress }: { item: ActiveDelivery; onPress?: () => void }) => {
    const statusColor = getStatusColor(item.status);
    const progressPercent = Math.min(item.progressPercent, 100);
    const progressColor = getProgressBarColor(item.status, progressPercent);

    const formatQty = (qty: number) => (qty % 1 === 0 ? qty.toString() : qty.toFixed(1));

    return (
      <TouchableOpacity
        style={[styles.deliveryCardWrapper]}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={[styles.deliveryCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.deliveryHeader}>
            <View style={styles.deliveryHeaderLeft}>
              <Text style={[styles.deliveryOrderCode, { color: themeColors.text.primary }]} numberOfLines={1}>
                #{item.orderCode}
              </Text>
              <View
                style={[
                  styles.deliveryTimeBadge,
                  { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black05 },
                ]}
              >
                <Icon name="clock-outline" size={ms(9)} color={themeColors.text.hint} />
                <Text style={[styles.deliveryTime, { color: themeColors.text.hint }]}>{item.startTime}</Text>
              </View>
            </View>
            <View style={[styles.deliveryStatusBadge, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.deliveryStatusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.deliveryStatusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.deliveryInfoSection}>
            <Text style={[styles.deliveryCustomerName, { color: themeColors.text.primary }]} numberOfLines={1}>
              {item.customerName}
            </Text>
            <View style={styles.deliveryAddressRow}>
              <Icon name="map-marker" size={ms(10)} color={themeColors.text.hint} />
              <Text style={[styles.deliveryAddress, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {item.deliveryAddress}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.deliveryStatsRow,
              { backgroundColor: isDark ? colors.semiTransparent.white03 : colors.semiTransparent.black02 },
            ]}
          >
            <View style={styles.deliveryStatItem}>
              <Text style={[styles.deliveryStatValue, { color: themeColors.text.primary }]}>
                {formatQty(item.orderedQty)}
              </Text>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Order</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statGreen }]}>
                {formatQty(item.deliveredQty)}
              </Text>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Done</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statYellow }]}>
                {formatQty(item.remainingQty)}
              </Text>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Left</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <Text style={[styles.deliveryStatValue, { color: progressColor }]}>{progressPercent}%</Text>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Progress</Text>
            </View>
          </View>

          <View
            style={[
              styles.deliveryProgressTrack,
              { backgroundColor: isDark ? colors.semiTransparent.white06 : colors.semiTransparent.black04 },
            ]}
          >
            <View style={[styles.deliveryProgressFill, { width: `${progressPercent}%`, backgroundColor: progressColor }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({
    title,
    actionLabel,
    onAction,
  }: {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <View style={styles.sectionHeader}>
      <Text variant="h4" numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text variant="bodySmall" style={{ color: colors.primary.main }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const DashboardSkeleton = () => {
    const shimmerColor = isDark ? colors.dark.cardElevated : colors.grey[10];
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={[]}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text variant="h2" style={{ color: themeColors.text.primary }}>
            Overview
          </Text>
          <View style={{ width: ms(40), height: ms(40), backgroundColor: shimmerColor, borderRadius: ms(20) }} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: ms(8) }}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{ width: ms(80), height: ms(36), backgroundColor: shimmerColor, borderRadius: ms(18) }}
              />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ backgroundColor: shimmerColor, borderRadius: ms(12), height: ms(120), width: '100%' }} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ width: ms(100), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: ms(8) }}>
            <View style={{ flex: 1, height: ms(80), backgroundColor: shimmerColor, borderRadius: ms(12) }} />
            <View style={{ flex: 1, height: ms(80), backgroundColor: shimmerColor, borderRadius: ms(12) }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ width: ms(100), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: ms(8) }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{ flex: 1, height: ms(70), backgroundColor: shimmerColor, borderRadius: ms(12) }}
              />
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <View style={{ width: ms(120), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4) }} />
            <View style={{ width: ms(60), height: ms(16), backgroundColor: shimmerColor, borderRadius: ms(4) }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{ width: ms(260), height: ms(160), backgroundColor: shimmerColor, borderRadius: ms(12), marginRight: ms(12) }}
              />
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <SafeAreaView
        style={[styles.container, styles.loaderContainer, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
        edges={[]}
      >
        <Icon name="alert-circle-outline" size={48} color={colors.error.main} />
        <Text variant="h4" style={{ marginTop: spacing.md, color: colors.error.main }}>
          Failed to load dashboard
        </Text>
        <Text variant="body" color="secondary" style={{ marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl }}>
          {error || 'Please check your connection and try again'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.primary.main, borderRadius: ms(8) }}
          onPress={() => refetch()}
        >
          <Text variant="body" color="white">
            Retry
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text variant="h2" style={{ color: themeColors.text.primary }}>
          Overview
        </Text>
        <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell-outline" size={iconSizes.lg} color={themeColors.text.primary} />
          {(notifications?.unread_count ?? 0) > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: colors.error.main }]}>
              <Text style={styles.notificationBadgeText}>{notifications?.unread_count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <DateFilterChips selectedFilter={dateFilter} onFilterChange={handleDateFilterChange} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }
      >
        <View style={styles.summarySection}>
          <ProductionSummaryCard
            totalOrders={todayOverview?.total_orders ?? 0}
            activeOrders={todayOverview?.in_progress ?? 0}
            cancelledOrders={todayOverview?.cancelled ?? 0}
            deliveredQty={activeDeliveries?.orders?.reduce((sum, order) => sum + (order.delivered_qty || 0), 0) ?? 0}
            totalQty={activeDeliveries?.orders?.reduce((sum, order) => sum + (order.ordered_qty || 0), 0) ?? 0}
          />
        </View>

        <SectionHeader title="Information" />
        <InformationSection
          messages={infoMessages}
          weather={weather ? {
            temperature: weather.avg_temperature_fahrenheit ?? weather.temperature,
            humidity: weather.avg_humidity_percent ?? weather.humidity,
            windSpeed: weather.avg_wind_speed_mph ?? weather.windSpeed,
            condition: weather.condition,
            location: weather.location,
          } : null}
          todayStats={todayOverview ? {
            total: todayOverview.total_orders ?? 0,
            completed: todayOverview.completed ?? 0,
            inProgress: todayOverview.in_progress ?? 0,
            pending: todayOverview.normal ?? 0,
            cancelled: todayOverview.cancelled ?? 0,
          } : null}
          onMessagePress={() => navigation.navigate('Notifications')}
          onSeeAllPress={() => navigation.navigate('Notifications')}
          onStatsPress={() => navigation.navigate('Map')}
          maxVisible={2}
        />

        {quickLaunchActions.length > 0 && (
          <>
            <SectionHeader title="Quick Launch" />
            <View style={styles.quickLaunchContainer}>
              {quickLaunchActions.map((action) => (
                <QuickLaunchCard
                  key={action.id}
                  action={action}
                  onPress={() => handleQuickLaunchPress(action)}
                />
              ))}
            </View>
          </>
        )}

        <SectionHeader title="Active Deliveries" actionLabel="View All" onAction={() => navigation.navigate('Map')} />
        {activeDeliveries?.orders && activeDeliveries.orders.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deliveryList}
            decelerationRate="fast"
            onScrollEndDrag={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isNearEnd = layoutMeasurement.width + contentOffset.x >= contentSize.width - 150;
              if (isNearEnd && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isNearEnd = layoutMeasurement.width + contentOffset.x >= contentSize.width - 150;
              if (isNearEnd && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            scrollEventThrottle={16}
          >
            {activeDeliveries.orders.map((order, index) => {
              const deliveryItem: ActiveDelivery = {
                id: order.order_id,
                orderCode: order.order_code,
                customerName: order.customer_name,
                deliveryAddress: order.delivery_address || 'N/A',
                productCodes: order.product_codes || 'N/A',
                startTime: order.start_time || 'N/A',
                orderedQty: order.ordered_qty || 0,
                deliveredQty: order.delivered_qty || 0,
                remainingQty: order.remaining_qty || 0,
                progressPercent: order.progress_percent || 0,
                status: order.status || 'Normal',
              };
              return (
                <View key={order.order_id} style={index === activeDeliveries.orders.length - 1 ? { marginRight: spacing.sm } : undefined}>
                  {renderDeliveryCard({
                    item: deliveryItem,
                    onPress: () =>
                      navigation.navigate('OrderDetail', {
                        orderId: order.order_id,
                        orderCode: order.order_code,
                        orderDate: new Date().toISOString().split('T')[0],
                        status: order.status,
                      }),
                  })}
                </View>
              );
            })}

            {(isFetchingNextPage || hasNextPage) && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: themeColors.card }]}
                onPress={() => {
                  if (!isFetchingNextPage && hasNextPage) {
                    fetchNextPage();
                  }
                }}
                activeOpacity={0.7}
                disabled={isFetchingNextPage || !hasNextPage}
              >
                {isFetchingNextPage ? (
                  <ActivityIndicator size="small" color={colors.primary.main} />
                ) : (
                  <>
                    <Icon name="chevron-right" size={ms(20)} color={colors.primary.main} />
                    <Text variant="caption" style={{ color: colors.primary.main }}>
                      More
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyDeliveryCard}>
            <View style={[styles.emptyDeliveryContent, { backgroundColor: themeColors.card }]}>
              <View
                style={[
                  styles.emptyDeliveryIconBg,
                  { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 },
                ]}
              >
                <Icon name="truck-check-outline" size={ms(32)} color={themeColors.text.hint} />
              </View>
              <Text variant="body" color="secondary" style={styles.emptyDeliveryTitle}>
                No Active Deliveries
              </Text>
              <Text variant="caption" color="hint" style={styles.emptyDeliverySubtitle}>
                Active orders will appear here
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: TAB_BAR_HEIGHT + spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (
  _themeColors: typeof colors.dark | typeof colors.light,
  _isTablet: boolean,
  isDark: boolean,
  screenWidth: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loaderContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    notificationButton: {
      position: 'relative',
      padding: spacing.xs,
    },
    notificationBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      minWidth: ms(18),
      height: ms(18),
      borderRadius: ms(9),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: ms(4),
    },
    notificationBadgeText: {
      color: colors.common.white,
      fontSize: fontSizes.xs,
      fontWeight: '700',
      lineHeight: ms(18),
      textAlign: 'center',
      includeFontPadding: false,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    summarySection: {
      marginTop: spacing.md,
    },

    quickLaunchContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      gap: ms(8),
    },

    deliveryList: {
      paddingHorizontal: spacing.lg,
      paddingVertical: ms(4),
    },
    deliveryCardWrapper: {
      width: screenWidth * 0.8,
      maxWidth: ms(320),
      marginRight: ms(12),
    },
    deliveryCard: {
      borderRadius: ms(12),
      overflow: 'hidden',
      shadowColor: isDark ? colors.common.black : colors.grey[80],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    deliveryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: ms(12),
      paddingTop: ms(10),
      paddingBottom: ms(6),
    },
    deliveryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: ms(8),
    },
    deliveryOrderCode: {
      fontSize: ms(14),
      fontFamily: fontFamily.bold,
    },
    deliveryTimeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: ms(6),
      paddingVertical: ms(3),
      borderRadius: ms(4),
      gap: ms(3),
    },
    deliveryTime: {
      fontSize: ms(10),
      fontFamily: fontFamily.medium,
    },
    deliveryStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: ms(8),
      paddingVertical: ms(4),
      borderRadius: ms(6),
    },
    deliveryStatusDot: {
      width: ms(6),
      height: ms(6),
      borderRadius: ms(3),
      marginRight: ms(5),
    },
    deliveryStatusText: {
      fontSize: ms(10),
      fontFamily: fontFamily.semiBold,
      textTransform: 'capitalize',
    },
    deliveryInfoSection: {
      paddingHorizontal: ms(12),
      paddingBottom: ms(8),
    },
    deliveryCustomerName: {
      fontSize: ms(13),
      fontFamily: fontFamily.semiBold,
      marginBottom: ms(3),
    },
    deliveryAddressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ms(4),
    },
    deliveryAddress: {
      fontSize: ms(11),
      fontFamily: fontFamily.regular,
      flex: 1,
    },
    deliveryStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginHorizontal: ms(12),
      paddingVertical: ms(8),
      borderRadius: ms(8),
      marginBottom: ms(8),
    },
    deliveryStatItem: {
      flex: 1,
      alignItems: 'center',
    },
    deliveryStatValue: {
      fontSize: ms(15),
      fontFamily: fontFamily.bold,
    },
    deliveryStatLabel: {
      fontSize: ms(9),
      fontFamily: fontFamily.medium,
      marginTop: ms(2),
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    deliveryStatDivider: {
      width: 1,
      height: ms(24),
      opacity: 0.2,
    },
    deliveryProgressTrack: {
      height: ms(4),
      marginHorizontal: ms(12),
      marginBottom: ms(10),
      borderRadius: ms(2),
      overflow: 'hidden',
    },
    deliveryProgressFill: {
      height: '100%',
      borderRadius: ms(2),
    },
    loadMoreButton: {
      width: ms(60),
      height: '100%',
      minHeight: ms(120),
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: ms(12),
      marginRight: spacing.sm,
      shadowColor: isDark ? colors.common.black : colors.grey[80],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    emptyDeliveryCard: {
      marginHorizontal: spacing.lg,
    },
    emptyDeliveryContent: {
      borderRadius: ms(16),
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black06,
      borderStyle: 'dashed',
    },
    emptyDeliveryIconBg: {
      width: ms(64),
      height: ms(64),
      borderRadius: ms(32),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    emptyDeliveryTitle: {
      fontFamily: fontFamily.semiBold,
      marginBottom: spacing.xs,
    },
    emptyDeliverySubtitle: {
      textAlign: 'center',
    },
  });

export default DashboardScreen;
