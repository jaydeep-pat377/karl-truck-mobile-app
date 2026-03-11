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
  AdvertisementCard,
} from '../../components/dashboard';
import type { DateFilter, QuickLaunchAction, Advertisement, RegionData, CompanyData, PlantData } from '../../components/dashboard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing, fontSizes, iconSizes } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useDashboard } from '../../hooks/useDashboard';
import { notificationService } from '../../services/notificationService';
import { announcementService, Announcement as ApiAnnouncement } from '../../api/services';
import { updateWidgetData } from '../../modules/TodayOverviewWidget';
import { fontFamily } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { DeliveryProgress } from '../../types/order';

const getSegmentColor = (status: string): string => {
  const statusColorMap: Record<string, string> = {
    pending: colors.trackingStatus.pending,
    ticketed: colors.trackingStatus.ticketed,
    loading: colors.trackingStatus.loading,
    loaded: colors.trackingStatus.loaded,
    to_job: colors.trackingStatus.toJob,
    at_job: colors.trackingStatus.atJob,
    on_job: colors.trackingStatus.atJob,
    pouring: colors.trackingStatus.pouring,
    poured: colors.trackingStatus.poured,
    washing: colors.trackingStatus.washing,
    to_plant: colors.trackingStatus.toPlant,
    at_plant: colors.trackingStatus.atPlant,
    cancelled: colors.trackingStatus.cancelled,
    voided: colors.trackingStatus.voided,
    remaining: colors.trackingStatus.remaining,
  };

  return statusColorMap[status.toLowerCase()] || colors.grey[40];
};

const getStatusDisplayLabel = (status: string | undefined): string => {
  if (!status) return '';
  const labelMap: Record<string, string> = {
    pending: 'Pending',
    ticketed: 'Ticketed',
    loading: 'Loading',
    loaded: 'Loaded',
    to_job: 'To Job',
    at_job: 'At Job',
    on_job: 'On Job',
    pouring: 'Pouring',
    poured: 'Poured',
    washing: 'Washing',
    to_plant: 'To Plant',
    at_plant: 'At Plant',
    cancelled: 'Cancelled',
    voided: 'Voided',
    remaining: 'Remaining',
  };
  return labelMap[status.toLowerCase()] || status;
};

const ALLOWED_PROGRESS_STATUSES = ['loading', 'to_job', 'at_job', 'pouring', 'remaining'];

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
  statusDisplay?: string;
  orderStatus: string;
  deliveryProgress?: DeliveryProgress;
  recentTicketStatus?: string;
}

const defaultQuickLaunchActions: QuickLaunchAction[] = [
  {
    id: 'invite_customer',
    title: 'CUSTOMER INVITE',
    icon: 'account-group',
    permission: 'invite_customer',
  },
  {
    id: 'order_concrete',
    title: 'SAVED ORDERS',
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
  const user = useAuthStore((state) => state.user);

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [apiAnnouncements, setApiAnnouncements] = useState<ApiAnnouncement[]>([]);


  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  const customDateParams = dateFilter === 'calendar' ? {
    startDate: formatDateForApi(selectedDate),
    endDate: formatDateForApi(selectedDate),
  } : {};

  const {
    notifications,
    todayOverview,
    marketSummary,
    activeDeliveries,
    dateRange,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDashboard({
    dateFilter,
    ...customDateParams,
    deliveriesLimit: 10,
  });


  const companies: CompanyData[] = useMemo(() => {
    if (!marketSummary?.companies) return [];
    return marketSummary.companies.map((company) => ({
      id: company.id,
      code: company.code,
      name: company.name,
      deliveredQty: company.usedCY,
      totalQty: company.totalCY,
      totalOrders: company.totalOrders,
      activeOrders: company.activeOrders,
      cancelledOrders: company.cancelledOrders,
    }));
  }, [marketSummary?.companies]);


  const regions: RegionData[] = useMemo(() => {
    if (!marketSummary?.regions) return [];
    return marketSummary.regions.map((region) => ({
      id: region.id,
      name: region.name,
      deliveredQty: region.usedCY,
      totalQty: region.totalCY,
      totalOrders: region.totalOrders,
      activeOrders: region.activeOrders,
      cancelledOrders: region.cancelledOrders,
    }));
  }, [marketSummary?.regions]);


  const plants: PlantData[] = useMemo(() => {
    if (!marketSummary?.plants) return [];
    return marketSummary.plants.map((plant) => ({
      id: plant.id,
      code: plant.code,
      name: plant.name,
      regionName: plant.regionName,
      deliveredQty: plant.usedCY,
      totalQty: plant.totalCY,
      totalOrders: plant.totalOrders,
      activeOrders: plant.activeOrders,
      cancelledOrders: plant.cancelledOrders,
      weather: plant.weather ? {
        temperature: plant.weather.temperature_fahrenheit,
        humidity: plant.weather.humidity,
        windSpeed: plant.weather.wind_speed_mph,
        condition: plant.weather.condition,
        icon: plant.weather.icon,
      } : null,
    }));
  }, [marketSummary?.plants]);

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
    const fetchAnnouncements = async () => {
      try {
        console.log('[Announcements] Fetching announcements...');
        const response = await announcementService.getAnnouncements({ page: 1, limit: 10 });
        console.log('[Announcements] API Response:', JSON.stringify(response, null, 2));
        if (response.success && response.data?.announcements) {
          console.log('[Announcements] Found', response.data.announcements.length, 'announcements');
          setApiAnnouncements(response.data.announcements);
        }
      } catch (error) {
        console.log('[Announcements] Error fetching:', error);
      }
    };
    fetchAnnouncements();
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


  useEffect(() => {
    if (isFilterChanging && !isLoading && !isRefetching) {
      setIsFilterChanging(false);
    }
  }, [isFilterChanging, isLoading, isRefetching]);

  const themeColors = isDark ? colors.dark : colors.light;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDateFilterChange = useCallback((filter: DateFilter) => {
    if (filter !== dateFilter) {
      setIsFilterChanging(true);
    }
    setDateFilter(filter);
  }, [dateFilter]);

  const handleCalendarPress = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleCloseDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);


  const generateGradientFromColor = (hexColor: string, isDarkMode: boolean): string[] => {

    if (isDarkMode) {
      return [hexColor, hexColor + 'DD', hexColor + 'BB'];
    }
    return [hexColor + '30', hexColor + '20', hexColor + '10'];
  };


  const getIllustrationType = (tileType: string, hasImage: boolean): 'delivery' | 'weather' | 'promo' | 'custom' => {

    if (hasImage) return 'custom';

    const type = tileType?.toLowerCase() || '';
    if (type.includes('delivery') || type.includes('truck')) return 'delivery';
    if (type.includes('weather')) return 'weather';
    return 'delivery';
  };

  const advertisements: Advertisement[] = useMemo(() => {

    return apiAnnouncements.map((announcement) => {
      const hasImage = !!announcement.icon_or_percent;
      return {
        id: String(announcement.id),
        badge: announcement.tagline || announcement.campaign || 'Announcement',
        headline: announcement.title || announcement.name,
        subheadline: announcement.subtitle,
        description: announcement.message_details_code || announcement.subtitle || '',
        ctaText: 'Learn More',
        illustrationType: getIllustrationType(announcement.tile_type, hasImage),
        image: hasImage ? { uri: announcement.icon_or_percent } : undefined,
        gradientColors: announcement.color ? generateGradientFromColor(announcement.color, isDark) : undefined,
        accentColor: announcement.color || undefined,
        onAction: announcement.url ? () => {

          const rawTitle = announcement.title || announcement.name || 'Announcement';
          const capitalizedTitle = rawTitle
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          navigation.navigate('WebView', {
            url: announcement.url,
            title: capitalizedTitle,
          });
        } : undefined,
      };
    });
  }, [navigation, apiAnnouncements, isDark]);

  const quickLaunchActions = useMemo(() => {
    return defaultQuickLaunchActions;
  }, []);

  const handleQuickLaunchPress = useCallback((action: QuickLaunchAction) => {
    if (action.id === 'order_concrete') {

      const orderListDateFilter = dateFilter === 'next_week' ? 'nextWeek'
        : dateFilter === 'last_week' ? 'lastWeek'
        : dateFilter;

      navigation.navigate('Main', {
        screen: 'Orders',
        params: {
          tab: 'saved',
          date_filter: orderListDateFilter,
          selected_date: dateFilter === 'calendar' ? formatDateForApi(selectedDate) : undefined,
          _timestamp: Date.now(),
        },
      });
    }
  }, [navigation, dateFilter, selectedDate]);

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    switch (normalizedStatus) {

      case 'pending':
        return colors.trackingStatus.pending;
      case 'ticketed':
        return colors.trackingStatus.ticketed;
      case 'loading':
        return colors.trackingStatus.loading;
      case 'loaded':
        return colors.trackingStatus.loaded;
      case 'to_job':
        return colors.trackingStatus.toJob;
      case 'at_job':
        return colors.trackingStatus.atJob;
      case 'pouring':
        return colors.trackingStatus.pouring;
      case 'poured':
        return colors.trackingStatus.poured;
      case 'washing':
        return colors.trackingStatus.washing;
      case 'to_plant':
        return colors.trackingStatus.toPlant;
      case 'at_plant':
        return colors.trackingStatus.atPlant;

      case 'in_progress':
        return colors.primary.main;
      case 'completed':
        return colors.status.completed;
      case 'cancelled':
      case 'canceled':
      case 'voided':
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
    const progressPercent = Math.min(item.progressPercent, 100);

    const progressColor = item.recentTicketStatus
      ? getSegmentColor(item.recentTicketStatus)
      : colors.grey[40];


    const formatQty = (qty: number | null | undefined): string => {
      if (qty === null || qty === undefined) return '0';
      return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
    };

    return (
      <TouchableOpacity
        style={[styles.deliveryCardWrapper]}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={[
          styles.deliveryCard,
          {
            backgroundColor: themeColors.card,
            shadowColor: progressColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 4,
            borderBottomWidth: 3,
            borderBottomColor: progressColor,
          }
        ]}>
          <View style={styles.deliveryHeader}>
            <View style={styles.deliveryHeaderLeft}>
              <Text style={[styles.deliveryOrderCode, { color: themeColors.text.primary }]} numberOfLines={1}>
                {item.orderCode}
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
            <View style={[styles.deliveryStatusBadge, { backgroundColor: `${progressColor}15` }]}>
              <View style={[styles.deliveryStatusDot, { backgroundColor: progressColor }]} />
              <Text style={[styles.deliveryStatusText, { color: progressColor }]}>{item.orderStatus}</Text>
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
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: themeColors.text.primary }]}>
                  {formatQty(item.orderedQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: themeColors.text.primary }]}> CY</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Ordered</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statGreen }]}>
                  {formatQty(item.deliveredQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: colors.dashboard.statGreen }]}> CY</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Poured</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statYellow }]}>
                  {formatQty(item.remainingQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: colors.dashboard.statYellow }]}> CY</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Remaining</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <Text style={[styles.deliveryStatValue, { color: progressColor }]}>
                {progressPercent}%
              </Text>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>Progress</Text>
            </View>
          </View>

          {item.deliveryProgress?.segments && item.deliveryProgress.segments.length > 0 ? (
            <View style={styles.deliveryProgressSection}>

              <View style={styles.deliveryProgressLabelsRow}>
                {item.deliveryProgress.segments
                  .filter((segment) => (segment.percentage > 0 || segment.status === 'remaining') && ALLOWED_PROGRESS_STATUSES.includes(segment.status?.toLowerCase()))
                  .map((segment, index) => (
                    <View
                      key={`label-${segment.status}-${index}`}
                      style={[styles.deliveryProgressLabelContainer, { flex: segment.percentage || 1 }]}
                    >
                      <Text
                        style={[styles.deliveryProgressLabelText, { color: themeColors.text.secondary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {getStatusDisplayLabel(segment.status)}
                      </Text>
                    </View>
                  ))}
              </View>


              <View
                style={[
                  styles.deliveryProgressTrack,
                  { backgroundColor: isDark ? colors.semiTransparent.white06 : colors.semiTransparent.black04 },
                ]}
              >
                <View style={styles.deliveryProgressSegments}>
                  {item.deliveryProgress.segments
                    .filter((segment) => (segment.percentage > 0 || segment.status === 'remaining') && ALLOWED_PROGRESS_STATUSES.includes(segment.status?.toLowerCase()))
                    .map((segment, index, arr) => (
                      <View
                        key={`${segment.status}-${index}`}
                        style={[
                          styles.deliveryProgressSegment,
                          {
                            flex: segment.percentage || 1,
                            backgroundColor: getSegmentColor(segment.status),
                            borderRightWidth: index < arr.length - 1 ? 1 : 0,
                            borderRightColor: themeColors.card,
                          },
                        ]}
                      />
                    ))}
                </View>
              </View>


              <View style={styles.deliveryProgressValuesRow}>
                {item.deliveryProgress.segments
                  .filter((segment) => (segment.percentage > 0 || segment.status === 'remaining') && ALLOWED_PROGRESS_STATUSES.includes(segment.status?.toLowerCase()))
                  .map((segment, index) => (
                    <View
                      key={`value-${segment.status}-${index}`}
                      style={[styles.deliveryProgressValueContainer, { flex: segment.percentage || 1 }]}
                    >
                      <Text
                        style={[styles.deliveryProgressValueText, { color: themeColors.text.hint }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {segment.qty !== undefined ? `${segment.qty} CY` : ''}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          ) : (
            <View style={styles.deliveryProgressSection}>
              <View
                style={[
                  styles.deliveryProgressTrack,
                  { backgroundColor: isDark ? colors.semiTransparent.white06 : colors.semiTransparent.black04 },
                ]}
              >
                <View style={[styles.deliveryProgressFill, { width: `${progressPercent}%`, backgroundColor: progressColor }]} />
              </View>
            </View>
          )}
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
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['bottom']}>
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

  if (isLoading || isFilterChanging) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <SafeAreaView
        style={[styles.container, styles.loaderContainer, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
        edges={['bottom']}
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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text variant="h2" style={{ color: themeColors.text.primary }}>
          Overview
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 }]}
            onPress={onRefresh}
            activeOpacity={0.7}>
            <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
            <Icon name="bell-outline" size={iconSizes.lg} color={themeColors.text.primary} />
            {(notifications?.unread_count ?? 0) > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error.main }]}>
                <Text style={styles.notificationBadgeText}>{notifications?.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <DateFilterChips
        selectedFilter={dateFilter}
        onFilterChange={handleDateFilterChange}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        showDatePicker={showDatePicker}
        onCalendarPress={handleCalendarPress}
        onCloseDatePicker={handleCloseDatePicker}
        dateRange={dateRange}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }
      >
        <View style={styles.summarySection}>
          <ProductionSummaryCard
            title={marketSummary?.companies?.[0]?.name || user?.company || 'Tenant Company Name'}
            totalOrders={todayOverview?.total_orders ?? 0}
            activeOrders={(todayOverview?.in_progress ?? 0) + (todayOverview?.normal ?? 0) + (todayOverview?.will_call ?? 0) + (todayOverview?.hold_delivery ?? 0)}
            cancelledOrders={todayOverview?.cancelled ?? 0}
            deliveredQty={marketSummary?.companies?.[0]?.usedCY ?? activeDeliveries?.orders?.reduce((sum, order) => sum + (order.delivered_qty || 0), 0) ?? 0}
            totalQty={marketSummary?.companies?.[0]?.totalCY ?? activeDeliveries?.orders?.reduce((sum, order) => sum + (order.ordered_qty || 0), 0) ?? 0}
            companies={companies}
            regions={regions}
            plants={plants}
            onCompanyPress={(company) => {

              const orderListDateFilter = dateFilter === 'next_week' ? 'nextWeek'
                : dateFilter === 'last_week' ? 'lastWeek'
                : dateFilter;
              navigation.navigate('Orders', {
                company_name: company.name,
                date_filter: orderListDateFilter,
                selected_date: dateFilter === 'calendar' ? formatDateForApi(selectedDate) : undefined,
                _timestamp: Date.now(),
              });
            }}
            onRegionPress={(region) => {
              const orderListDateFilter = dateFilter === 'next_week' ? 'nextWeek'
                : dateFilter === 'last_week' ? 'lastWeek'
                : dateFilter;
              navigation.navigate('Orders', {
                region_name: region.name,
                date_filter: orderListDateFilter,
                selected_date: dateFilter === 'calendar' ? formatDateForApi(selectedDate) : undefined,
                _timestamp: Date.now(),
              });
            }}
            onPlantPress={(plant) => {
              const orderListDateFilter = dateFilter === 'next_week' ? 'nextWeek'
                : dateFilter === 'last_week' ? 'lastWeek'
                : dateFilter;
              navigation.navigate('Orders', {
                plant_code: plant.code,
                plant_name: plant.name,
                date_filter: orderListDateFilter,
                selected_date: dateFilter === 'calendar' ? formatDateForApi(selectedDate) : undefined,
                _timestamp: Date.now(),
              });
            }}
          />
        </View>

        {advertisements.length > 0 && (
          <AdvertisementCard
            advertisements={advertisements}
            onActionPress={(ad) => ad.onAction?.()}
          />
        )}

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

        {dateFilter === 'today' && (
          <View style={{ marginTop: spacing.md }}>
            <SectionHeader title="Active Deliveries" actionLabel="View All" onAction={() => navigation.navigate('Orders', { date_filter: 'today', _timestamp: Date.now() })} />
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
                    status: order.recent_ticket?.status || order.status || 'Normal',
                    statusDisplay: order.recent_ticket?.status_display || order.status || 'Normal',
                    orderStatus: order.status || 'Normal',
                    deliveryProgress: order.delivery_progress,
                    recentTicketStatus: order.recent_ticket?.status,
                  };
                  return (
                    <View key={order.order_id} style={index === activeDeliveries.orders.length - 1 ? { marginRight: spacing.sm } : undefined}>
                      {renderDeliveryCard({
                        item: deliveryItem,
                        onPress: () => {
                          const statusBasedColor = getStatusColor(order.status);


                          navigation.navigate('Orders', {
                            screen: 'OrderDetailInTab',
                            params: {
                              orderId: order.order_id,
                              orderCode: order.order_code,
                              orderDate: new Date().toISOString().split('T')[0],
                              status: order.status,
                              progressColor: statusBasedColor,
                              sourceTab: 'Home',
                            },
                          });
                        },
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ms(8),
    },
    headerActionBtn: {
      width: ms(36),
      height: ms(36),
      borderRadius: ms(18),
      justifyContent: 'center',
      alignItems: 'center',
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
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },

    summarySection: {
      marginTop: 0,
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
      width: screenWidth * 0.92,
      maxWidth: ms(400),
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
      justifyContent: 'space-between',
      marginHorizontal: ms(8),
      paddingVertical: ms(8),
      paddingHorizontal: ms(4),
      borderRadius: ms(8),
      marginBottom: ms(8),
    },
    deliveryStatItem: {
      flex: 1,
      alignItems: 'center',
      minWidth: ms(50),
    },
    deliveryStatValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    deliveryStatValue: {
      fontSize: ms(12),
      fontFamily: fontFamily.bold,
      textAlign: 'center',
    },
    deliveryStatUnit: {
      fontSize: ms(9),
      fontFamily: fontFamily.medium,
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
      borderRadius: ms(2),
      overflow: 'hidden',
    },
    deliveryProgressFill: {
      height: '100%',
      borderRadius: ms(2),
    },
    deliveryProgressSegments: {
      flexDirection: 'row',
      height: '100%',
    },
    deliveryProgressSegment: {
      height: '100%',
    },
    deliveryProgressSection: {
      marginHorizontal: ms(12),
      marginBottom: ms(10),
    },
    deliveryProgressLabelsRow: {
      flexDirection: 'row',
      marginBottom: ms(2),
    },
    deliveryProgressLabelContainer: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: ms(2),
    },
    deliveryProgressLabelText: {
      fontSize: ms(9),
      fontFamily: fontFamily.medium,
      textAlign: 'center',
    },
    deliveryProgressValuesRow: {
      flexDirection: 'row',
      marginTop: ms(2),
    },
    deliveryProgressValueContainer: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: ms(2),
    },
    deliveryProgressValueText: {
      fontSize: ms(9),
      fontFamily: fontFamily.medium,
      textAlign: 'center',
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
