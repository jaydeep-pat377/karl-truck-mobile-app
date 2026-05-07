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
import { useTranslation } from 'react-i18next';
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
import { useRealtimeOrders } from '../../hooks/useRealtimeOrders';
import { notificationService } from '../../services/notificationService';
import { announcementService, Announcement as ApiAnnouncement } from '../../api/services';
import { updateWidgetData } from '../../modules/TodayOverviewWidget';
import { fontFamily } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { DeliveryProgress } from '../../types/order';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { WorkspaceSwitcher } from '../../components/workspace';

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

const SegmentStripes: React.FC<{ color: string; patternId: string }> = React.memo(({ color, patternId }) => (
  <Svg style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern
        id={patternId}
        patternUnits="userSpaceOnUse"
        width={4}
        height={4}
        patternTransform="rotate(45)"
      >
        <Line x1={0} y1={0} x2={0} y2={4} stroke={color} strokeWidth={1.5} strokeOpacity={0.55} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
  </Svg>
));

const FALLBACK_SEGMENT_COLOR = colors.fallback.segmentColor;

const PROGRESS_STATUSES = [
  { key: 'loading', colorKey: 'loading', label: 'Loading' },
  { key: 'to_job', colorKey: 'to_job', label: 'To Job' },
  { key: 'at_job', colorKey: 'at_job', label: 'At Job' },
  { key: 'pouring', colorKey: 'pouring', label: 'Pouring' },
  { key: 'at_plant', colorKey: 'poured', label: 'Poured' },
];

// Exact same logic as web SegmentedProgressBar (order-card.tsx lines 227-277)
const computeCumulativeFills = (
  segments: any[],
  totalLoads: number,
  totalTickets: number,
): { fills: number[]; atPlantQty: number } => {
  // Get ticket counts per status from segments
  const ticketCountByStatus: Record<string, number> = {};
  let hasTicketCounts = false;
  for (const { key } of PROGRESS_STATUSES) {
    const seg = (segments || []).find((s: any) => s.status === key);
    const tc = seg?.ticketCount ?? 0;
    ticketCountByStatus[key] = tc;
    if (tc > 0) hasTicketCounts = true;
  }

  let fills: number[];

  if (hasTicketCounts) {
    // Cumulative: for status at index i, count = sum of ticketCounts at index >= i
    const cumulativeByStatus: Record<string, number> = {};
    for (let i = 0; i < PROGRESS_STATUSES.length; i++) {
      let sum = 0;
      for (let j = i; j < PROGRESS_STATUSES.length; j++) {
        sum += ticketCountByStatus[PROGRESS_STATUSES[j].key];
      }
      cumulativeByStatus[PROGRESS_STATUSES[i].key] = sum;
    }

    // Total = totalLoads from Product Schedule, fallback to totalTickets, then cumulative
    const total = (totalLoads || 0) > 0 ? totalLoads : (totalTickets > 0 ? totalTickets : (cumulativeByStatus['loading'] || 0));

    fills = PROGRESS_STATUSES.map(({ key }) => {
      const cumulative = cumulativeByStatus[key];
      return total > 0 ? Math.round((cumulative / total) * 100) : 0;
    });
  } else {
    // Fallback: use segment percentage to compute cumulative fills
    const percentByStatus: Record<string, number> = {};
    for (const { key } of PROGRESS_STATUSES) {
      const seg = (segments || []).find((s: any) => s.status === key);
      percentByStatus[key] = seg?.percentage ?? 0;
    }

    fills = PROGRESS_STATUSES.map((_status, i) => {
      let sum = 0;
      for (let j = i; j < PROGRESS_STATUSES.length; j++) {
        sum += percentByStatus[PROGRESS_STATUSES[j].key];
      }
      return Math.min(Math.round(sum), 100);
    });
  }

  // Get at_plant qty for "% Completed" text
  const atPlantSeg = (segments || []).find((s: any) => s.status === 'at_plant');
  const atPlantQty = atPlantSeg?.qty ?? 0;

  return { fills, atPlantQty };
};

const getCompletionColor = (percent: number): string => {
  if (percent >= 90) return colors.primary.main;
  if (percent >= 60) return colors.warning.main;
  return colors.error.main;
};

// Same logic as web's getOrderStatusCategory (orderStatusValidation.ts)
type OrderStatusCategory = 'PRE_POUR' | 'IN_PROCESS' | 'COMPLETED' | 'CANCELED';

const getOrderStatusCategory = (order: {
  isRemoved?: boolean;
  currentStatus?: number;
  deliveredQty?: number;
  orderedQty?: number;
  isLastLoadCompleted?: boolean;
}): OrderStatusCategory => {
  if (order.isRemoved === true) return 'CANCELED';
  const ticketedQty = order.deliveredQty ?? 0;
  if (ticketedQty > 0) {
    const lastLoadCompleted = order.isLastLoadCompleted ?? false;
    const orderedQty = order.orderedQty ?? 0;
    const gap = orderedQty - ticketedQty;
    const roundedGap = Math.round(gap * 100) / 100;
    if (lastLoadCompleted && roundedGap <= 0.02) return 'COMPLETED';
    return 'IN_PROCESS';
  }
  if (order.currentStatus === 4) return 'COMPLETED';
  return 'PRE_POUR';
};

const getStatusLabelKey = (order: any): string => {
  const category = getOrderStatusCategory(order);
  switch (category) {
    case 'CANCELED': return 'orders.status.canceled';
    case 'COMPLETED': return 'orders.status.completed';
    case 'IN_PROCESS': return 'orders.status.inProcess';
    case 'PRE_POUR': {
      const cs = order.currentStatus ?? 0;
      switch (cs) {
        case 0: return 'orders.status.prePourNormal';
        case 1: return 'orders.status.prePourWillCall';
        case 2: return 'orders.status.prePourWeatherPermitting';
        case 3: return 'orders.status.prePourHold';
        case 5: return 'orders.status.prePourWaitList';
        default: return 'orders.status.normal';
      }
    }
    default: return 'orders.status.normal';
  }
};

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
  isRemoved?: boolean;
  currentStatus?: number;
  isLastLoadCompleted?: boolean;
  deliveryProgress?: DeliveryProgress;
  recentTicketStatus?: string;
  totalLoads?: number;
  ticketCount?: number;
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
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isTablet } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const showRegion = useAuthStore((state) => state.showRegion);

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

  // Real-time: refetch dashboard when orders table changes
  useRealtimeOrders({
    enabled: true,
    onUpdate: refetch,
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
    if (!showRegion) return [];
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
  }, [showRegion, marketSummary?.regions]);


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
      } catch (error) {
        console.log('Error fetching device token:', error);
      }
    };
    initNotifications();
  }, []);

  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const currentWorkspace = useMemo(
    () => workspaces.find((w) => w.id === currentWorkspaceId) ?? null,
    [workspaces, currentWorkspaceId],
  );

  const headerTitle = useMemo(() => {
    if (currentWorkspace) return currentWorkspace.name;
    const tenantName = user?.metadata?.tenant?.tenant_name;
    if (tenantName) return tenantName;
    return t('dashboard.overview');
  }, [currentWorkspace, user, t]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await announcementService.getAnnouncements({ page: 1, limit: 10 });
        if (response.success && response.data?.announcements) {
          setApiAnnouncements(response.data.announcements);
        }
      } catch (error) {
        console.log('[Announcements] Error fetching:', error);
      }
    };
    fetchAnnouncements();
  }, [currentWorkspaceId]);

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
      const isImageUrl = !!announcement.icon_or_percent && /^https?:\/\//i.test(announcement.icon_or_percent);
      return {
        id: String(announcement.id),
        badge: announcement.tagline || announcement.campaign || t('dashboard.announcement'),
        headline: announcement.title || announcement.name,
        subheadline: announcement.subtitle,
        description: announcement.message_details_code || announcement.subtitle || '',
        ctaText: t('dashboard.learnMore'),
        illustrationType: getIllustrationType(announcement.tile_type, isImageUrl),
        image: isImageUrl ? { uri: announcement.icon_or_percent } : undefined,
        gradientColors: announcement.color ? generateGradientFromColor(announcement.color, isDark) : undefined,
        accentColor: announcement.color || undefined,
        onAction: announcement.url ? () => {

          const rawTitle = announcement.title || announcement.name || t('dashboard.announcement');
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
    return defaultQuickLaunchActions.map((action) => {
      const titleMap: Record<string, string> = {
        invite_customer: t('dashboard.customerInvite'),
        order_concrete: t('dashboard.savedOrders'),
        reports: t('dashboard.reports'),
      };
      return {
        ...action,
        title: titleMap[action.id] ?? action.title,
      };
    });
  }, [t]);

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

    const { fills: progressFills, atPlantQty } = computeCumulativeFills(
      item.deliveryProgress?.segments || [],
      item.totalLoads ?? 0,
      item.ticketCount ?? 0,
    );
    const orderedQty = item.orderedQty || 0;
    const completionPercent = orderedQty > 0 ? ((atPlantQty / orderedQty) * 100).toFixed(2) : '0.00';
    // Use progressPercent (delv_qty / ordered_qty) to match web's tier color logic
    const deliveredPercent = progressPercent;
    // Tier color for badge, border, shadow — same as OrderCard
    const cardTierColor = getCompletionColor(deliveredPercent);
    // Status label — same as web's getCardStatus → getOrderStatusCategory
    const statusLabel = t(getStatusLabelKey(item));

    const segmentColors = PROGRESS_STATUSES.map(status => {
      const apiSeg = (item.deliveryProgress?.segments || []).find(
        (s) => s.status === status.key
      );
      return apiSeg?.color || FALLBACK_SEGMENT_COLOR;
    });

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
            shadowColor: cardTierColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 4,
            borderBottomWidth: 3,
            borderBottomColor: cardTierColor,
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
            <View style={[styles.deliveryStatusBadge, { backgroundColor: `${cardTierColor}15` }]}>
              <View style={[styles.deliveryStatusDot, { backgroundColor: cardTierColor }]} />
              <Text style={[styles.deliveryStatusText, { color: cardTierColor }]}>{statusLabel}</Text>
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
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>{t('dashboard.ordered')}</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statGreen }]}>
                  {formatQty(item.deliveredQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: colors.dashboard.statGreen }]}> CY</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>{t('dashboard.poured')}</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statYellow }]}>
                  {formatQty(item.remainingQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: colors.dashboard.statYellow }]}> CY</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>{t('dashboard.remaining')}</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <Text style={[styles.deliveryStatValue, { color: cardTierColor }]}>
                {progressPercent}%
              </Text>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>{t('dashboard.progress')}</Text>
            </View>
          </View>

          <View style={styles.deliveryProgressSection}>
            <View style={styles.deliveryProgressBarMainRow}>
              <Icon name="information-outline" size={ms(12)} color={themeColors.text.hint} />
              <View style={styles.deliverySegmentBarsRow}>
                {PROGRESS_STATUSES.map((status, index) => (
                  <React.Fragment key={`bar-${status.key}`}>
                    <View style={styles.deliverySegmentBarWrapper}>
                      <View style={[styles.deliverySegmentTrack, { backgroundColor: segmentColors[index] + '40' }]}>
                        <SegmentStripes color={segmentColors[index]} patternId={`dash-stripe-${status.key}`} />
                        <View
                          style={[
                            styles.deliverySegmentFillOverlay,
                            {
                              width: `${progressFills[index]}%`,
                              backgroundColor: segmentColors[index],
                            },
                          ]}
                        />
                      </View>
                    </View>
                    {index < PROGRESS_STATUSES.length - 1 && (
                      <View style={[styles.deliverySegmentDivider, { borderColor: themeColors.text.hint }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.deliveryCyValueText, { color: themeColors.text.primary }]}
              >
                {orderedQty.toFixed(2)} CY
              </Text>
            </View>

            <View style={styles.deliveryCompletionRow}>
              <Text style={[styles.deliveryCompletionText, { color: getCompletionColor(deliveredPercent) }]}>
                {completionPercent}% Completed
              </Text>
            </View>

{/* Loads count removed */}
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
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text variant="h3" style={{ color: themeColors.text.primary }} numberOfLines={1}>
            {headerTitle}
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
          {t('dashboard.failedToLoad')}
        </Text>
        <Text variant="body" color="secondary" style={{ marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl }}>
          {error || t('dashboard.checkConnection')}
        </Text>
        <TouchableOpacity
          style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.primary.main, borderRadius: ms(8) }}
          onPress={() => refetch()}
        >
          <Text variant="body" color="white">
            {t('common.retry')}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <WorkspaceSwitcher />
          <Text
            variant="h3"
            style={{ color: themeColors.text.primary, marginLeft: ms(10), marginRight: ms(8), flexShrink: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {headerTitle}
          </Text>
        </View>
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
            title={marketSummary?.companies?.[0]?.name || user?.company || t('dashboard.tenantCompanyName')}
            totalOrders={todayOverview?.total_orders ?? 0}
            activeOrders={(todayOverview?.in_progress ?? 0) + (todayOverview?.normal ?? 0) + (todayOverview?.will_call ?? 0) + (todayOverview?.hold_delivery ?? 0)}
            cancelledOrders={todayOverview?.cancelled ?? 0}
            deliveredQty={marketSummary?.companies?.[0]?.usedCY ?? activeDeliveries?.orders?.reduce((sum, order) => sum + (order.delivered_qty || 0), 0) ?? 0}
            totalQty={marketSummary?.companies?.[0]?.totalCY ?? activeDeliveries?.orders?.reduce((sum, order) => sum + (order.ordered_qty || 0), 0) ?? 0}
            companies={companies}
            regions={regions}
            plants={plants}
            workspaceImageUrl={currentWorkspace?.imageUrl}
            showRegion={showRegion}
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
            <SectionHeader title={t('dashboard.quickLaunch')} />
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
            <SectionHeader title={t('dashboard.activeDeliveries')} actionLabel={t('common.seeAll')} onAction={() => navigation.navigate('Orders', { date_filter: 'today', _timestamp: Date.now() })} />
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
                    isRemoved: order.is_removed,
                    currentStatus: order.current_status,
                    isLastLoadCompleted: order.is_last_load_completed,
                    deliveryProgress: order.delivery_progress,
                    recentTicketStatus: order.recent_ticket?.status,
                    totalLoads: order.total_loads || 0,
                    ticketCount: order.active_tickets || order.tickets_count || 0,
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
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
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
    deliveryProgressSection: {
      marginHorizontal: ms(12),
      marginBottom: ms(10),
    },
    deliveryProgressBarMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ms(4),
    },
    deliverySegmentBarsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: ms(6),
      flexGrow: 1,
      flexShrink: 1,
    },
    deliverySegmentBarWrapper: {
      flex: 1,
      height: '100%',
    },
    deliverySegmentTrack: {
      flex: 1,
      height: '100%',
      borderRadius: ms(2),
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    deliverySegmentFillOverlay: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: ms(2),
      zIndex: 1,
    },
    deliverySegmentDivider: {
      width: 0,
      height: ms(8),
      borderLeftWidth: 1,
      borderStyle: 'dashed',
      opacity: 0.4,
    },
    deliveryCyValueText: {
      fontSize: ms(10),
      fontFamily: fontFamily.bold,
      flexShrink: 0,
    },
    deliveryCompletionRow: {
      alignItems: 'flex-end',
      marginTop: ms(2),
    },
    deliveryCompletionText: {
      fontSize: ms(9),
      fontFamily: fontFamily.bold,
    },
    deliveryLoadsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ms(4),
      marginTop: ms(2),
    },
    deliveryLoadsText: {
      fontSize: ms(9),
      fontFamily: fontFamily.medium,
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
