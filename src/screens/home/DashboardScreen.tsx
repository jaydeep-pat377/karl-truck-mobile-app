import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
<<<<<<< Updated upstream
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
=======
import { Text, Icon, LanguageSelector } from '../../components/common';
import {
  DateFilterChips,
  ProductionSummaryCard,
  QuickLaunchCard,
  AdvertisementCard,
} from '../../components/dashboard';
import type { DateFilter, QuickLaunchAction, Advertisement, RegionData, CompanyData, PlantData } from '../../components/dashboard';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing, fontSizes, iconSizes } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

<<<<<<< Updated upstream
interface KPIData {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}
=======
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
        <Line x1={0} y1={0} x2={0} y2={4} stroke={color} strokeWidth={1.5} strokeOpacity={0.35} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
  </Svg>
));

const FALLBACK_SEGMENT_COLOR = '#6b7280';

const PROGRESS_STATUSES = [
  { key: 'loading', colorKey: 'loading', label: 'Loading', i18nKey: 'dashboard.deliveryStatus.loading' },
  { key: 'to_job', colorKey: 'to_job', label: 'To Job', i18nKey: 'dashboard.deliveryStatus.toJob' },
  { key: 'at_job', colorKey: 'at_job', label: 'At Job', i18nKey: 'dashboard.deliveryStatus.atJob' },
  { key: 'pouring', colorKey: 'pouring', label: 'Pouring', i18nKey: 'dashboard.deliveryStatus.pouring' },
  { key: 'at_plant', colorKey: 'poured', label: 'Poured', i18nKey: 'dashboard.deliveryStatus.poured' },
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
  if (percent >= 90) return '#458B00';
  if (percent >= 60) return '#F7BB00';
  return '#C43926';
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
    case 'CANCELED': return 'dashboard.orderStatusLabel.canceled';
    case 'COMPLETED': return 'dashboard.orderStatusLabel.completed';
    case 'IN_PROCESS': return 'dashboard.orderStatusLabel.inProcess';
    case 'PRE_POUR': {
      const cs = order.currentStatus ?? 0;
      switch (cs) {
        case 0: return 'dashboard.orderStatusLabel.prePourNormal';
        case 1: return 'dashboard.orderStatusLabel.prePourWillCall';
        case 2: return 'dashboard.orderStatusLabel.prePourWeatherPermitting';
        case 3: return 'dashboard.orderStatusLabel.prePourHold';
        case 5: return 'dashboard.orderStatusLabel.prePourWaitList';
        default: return 'dashboard.orderStatusLabel.normal';
      }
    }
    default: return 'dashboard.orderStatusLabel.normal';
  }
};
>>>>>>> Stashed changes

interface ActiveDelivery {
  id: string;
  truckNumber: string;
  driverName: string;
  customerName: string;
  status: 'ENRT' | 'ONSIT' | 'LOADING';
  eta: string;
  progress: number;
}

<<<<<<< Updated upstream
interface QuickAction {
  id: string;
  label: string;
  icon: string;
  screen: string;
  color: string;
}

interface Alert {
  id: string;
  type: 'weather' | 'order' | 'delivery' | 'system';
  title: string;
  message: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
}

const mockWeather = {
  location: 'Charlotte, NC',
  temperature: 28,
  condition: 'partlyCloudy' as const,
  humidity: 55,
  windSpeed: 30,
  precipitation: 0,
  feelsLike: 24,
};

const mockKPIs: KPIData[] = [
  { id: '1', label: 'In Process', value: 5, icon: 'truck-fast', color: colors.status.inProcess, trend: 'up', trendValue: '+2' },
  { id: '2', label: 'Pre-Pour', value: 3, icon: 'clock-outline', color: colors.status.prePour, trend: 'neutral' },
  { id: '3', label: 'Completed', value: 12, icon: 'check-circle', color: colors.status.completed, trend: 'up', trendValue: '+4' },
  { id: '4', label: 'On Hold', value: 2, icon: 'pause-circle', color: colors.status.onHold, trend: 'down', trendValue: '-1' },
];

const mockDeliveries: ActiveDelivery[] = [
  { id: '1', truckNumber: 'T-101', driverName: 'John Smith', customerName: 'ABC Construction', status: 'ENRT', eta: '15 min', progress: 65 },
  { id: '2', truckNumber: 'T-102', driverName: 'Mike Johnson', customerName: 'XYZ Builders', status: 'LOADING', eta: '35 min', progress: 20 },
  { id: '3', truckNumber: 'T-103', driverName: 'Sarah Davis', customerName: 'Metro Dev', status: 'ONSIT', eta: 'On Site', progress: 100 },
];

const mockQuickActions: QuickAction[] = [
  { id: '1', label: 'New Order', icon: 'plus-circle', screen: 'NewOrder', color: colors.primary.main },
  { id: '2', label: 'Track Trucks', icon: 'map-marker-radius', screen: 'MapTracking', color: colors.status.enRoute },
  { id: '3', label: 'Schedule', icon: 'calendar-clock', screen: 'Appointments', color: colors.status.prePour },
  { id: '4', label: 'Reports', icon: 'chart-bar', screen: 'Reports', color: colors.status.completed },
];

const mockAlerts: Alert[] = [
  { id: '1', type: 'weather', title: 'Weather Advisory', message: 'Rain expected at 3 PM - 4 orders may be affected', time: '10 min ago', priority: 'high', isRead: false },
  { id: '2', type: 'delivery', title: 'Truck T-101 En Route', message: 'ETA to ABC Construction: 15 minutes', time: '25 min ago', priority: 'medium', isRead: false },
  { id: '3', type: 'order', title: 'Order #12345 Updated', message: 'Quantity changed from 10 CY to 12 CY', time: '1 hr ago', priority: 'low', isRead: true },
];

const weatherIcons: Record<string, string> = {
  sunny: 'weather-sunny',
  cloudy: 'weather-cloudy',
  partlyCloudy: 'weather-partly-cloudy',
  rainy: 'weather-rainy',
  stormy: 'weather-lightning-rainy',
  snowy: 'weather-snowy',
  foggy: 'weather-fog',
  windy: 'weather-windy',
};

interface OverviewProgressBarProps {
  completed: number;
  inProcess: number;
  prePour: number;
  onHold: number;
  isDark: boolean;
  themeColors: typeof colors.dark | typeof colors.light;
}

const OverviewProgressBar: React.FC<OverviewProgressBarProps> = ({
  completed,
  inProcess,
  prePour,
  onHold,
  isDark,
  themeColors,
}) => {
  const total = completed + inProcess + prePour + onHold;
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProcessPercent = total > 0 ? (inProcess / total) * 100 : 0;
  const prePourPercent = total > 0 ? (prePour / total) * 100 : 0;
  const onHoldPercent = total > 0 ? (onHold / total) * 100 : 0;

  const completedAnim = useRef(new Animated.Value(0)).current;
  const inProcessAnim = useRef(new Animated.Value(0)).current;
  const prePourAnim = useRef(new Animated.Value(0)).current;
  const onHoldAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    completedAnim.setValue(0);
    inProcessAnim.setValue(0);
    prePourAnim.setValue(0);
    onHoldAnim.setValue(0);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(80, [
        Animated.timing(completedAnim, {
          toValue: completedPercent,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(inProcessAnim, {
          toValue: inProcessPercent,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(prePourAnim, {
          toValue: prePourPercent,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(onHoldAnim, {
          toValue: onHoldPercent,
          duration: 600,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [completed, inProcess, prePour, onHold, completedPercent, inProcessPercent, prePourPercent, onHoldPercent, completedAnim, inProcessAnim, prePourAnim, onHoldAnim, fadeAnim, scaleAnim]);

  const segments = [
    { label: 'Completed', value: completed, percent: completedPercent, anim: completedAnim, color: colors.status.completed, icon: 'check-circle' },
    { label: 'In Process', value: inProcess, percent: inProcessPercent, anim: inProcessAnim, color: colors.status.inProcess, icon: 'truck-fast' },
    { label: 'Pre-Pour', value: prePour, percent: prePourPercent, anim: prePourAnim, color: colors.status.prePour, icon: 'clock-outline' },
    { label: 'On Hold', value: onHold, percent: onHoldPercent, anim: onHoldAnim, color: colors.status.onHold, icon: 'pause-circle' },
  ];

  return (
    <Animated.View
      style={[
        progressStyles.container,
        {
          backgroundColor: themeColors.card,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}>
      <View style={progressStyles.header}>
        <View style={progressStyles.headerLeft}>
          <View style={[progressStyles.headerIcon, { backgroundColor: `${colors.primary.main}15` }]}>
            <Icon name="chart-timeline-variant" size={ms(16)} color={colors.primary.main} />
          </View>
          <Text variant="bodySmall" style={{ fontWeight: '600', color: themeColors.text.primary }}>
            Today's Progress
          </Text>
        </View>
        <View style={[progressStyles.completionBadge, { backgroundColor: `${colors.status.completed}15` }]}>
          <Text style={[progressStyles.completionText, { color: colors.status.completed }]}>
            {Math.round(completedPercent)}%
          </Text>
        </View>
      </View>

      <View style={[progressStyles.progressBarTrack, { backgroundColor: isDark ? colors.progress.trackDark : colors.progress.trackLight }]}>
        {segments.map((segment, index) => (
          <Animated.View
            key={segment.label}
            style={[
              progressStyles.progressBarSegment,
              {
                backgroundColor: segment.color,
                width: segment.anim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                flex: segment.percent > 0 ? undefined : 0,
                marginLeft: index > 0 && segment.percent > 0 ? 2 : 0,
                borderTopLeftRadius: index === 0 ? ms(3) : 0,
                borderBottomLeftRadius: index === 0 ? ms(3) : 0,
              },
            ]}
          />
        ))}
      </View>

      <View style={progressStyles.statsSummary}>
        <Text variant="caption" color="secondary">
          {completed} of {total} orders completed
        </Text>
        <Text variant="caption" style={{ color: colors.status.inProcess }}>
          {inProcess} active
        </Text>
      </View>
    </Animated.View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: ms(14),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  headerIcon: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(12),
  },
  completionText: {
    fontSize: ms(12),
    fontWeight: '700',
  },
  progressBarTrack: {
    height: ms(7),
    borderRadius: ms(3),
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarSegment: {
    height: '100%',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: ms(8),
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: ms(6),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: ms(6),
    gap: ms(8),
  },
  legendIconBg: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    marginBottom: ms(1),
  },
  legendValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: ms(6),
  },
  legendValue: {
    fontSize: ms(15),
    fontWeight: '700',
  },
  legendPercent: {
    fontSize: ms(11),
    fontWeight: '600',
  },
});

=======
>>>>>>> Stashed changes
const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isTablet } = useResponsive();
<<<<<<< Updated upstream
  const [refreshing, setRefreshing] = React.useState(false);
=======
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

  const headerTitle = useMemo(() => {
    const current = workspaces.find((w) => w.id === currentWorkspaceId);
    if (current) return current.name;
    const tenantName = user?.metadata?.tenant?.tenant_name;
    if (tenantName) return tenantName;
    return t('dashboard.tenantCompanyName');
  }, [workspaces, currentWorkspaceId, user, t]);

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
>>>>>>> Stashed changes

  const themeColors = isDark ? colors.dark : colors.light;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const styles = useMemo(() => createStyles(themeColors, isTablet, isDark), [isDark, isTablet, themeColors]);

  const priorityColors: Record<string, string> = {
    high: colors.error.main,
    medium: colors.warning.main,
    low: themeColors.text.secondary,
  };

<<<<<<< Updated upstream
  const renderWeatherCard = () => (
    <Card variant="elevated" padding="md" style={[styles.weatherCard, styles.weatherCardShadow]}>
      <View style={styles.weatherHeader}>
        <View>
          <Text variant="caption" color="secondary">{mockWeather.location}</Text>
          <View style={styles.weatherMain}>
            <Text style={styles.temperatureText}>{mockWeather.temperature}°</Text>
            <Icon
              name={weatherIcons[mockWeather.condition]}
              size={iconSizes.xxl}
              color={colors.warning.main}
            />
          </View>
          <Text variant="bodySmall" color="secondary">Feels like {mockWeather.feelsLike}°</Text>
        </View>
        <View style={styles.weatherDetails}>
          <View style={styles.weatherDetailItem}>
            <Icon name="water-percent" size={iconSizes.sm} color={colors.info.main} />
            <Text variant="caption" color="secondary">{mockWeather.humidity}%</Text>
          </View>
          <View style={styles.weatherDetailItem}>
            <Icon name="weather-windy" size={iconSizes.sm} color={themeColors.text.secondary} />
            <Text variant="caption" color="secondary">{mockWeather.windSpeed} mph</Text>
          </View>
          <View style={styles.weatherDetailItem}>
            <Icon name="water" size={iconSizes.sm} color={colors.primary.main} />
            <Text variant="caption" color="secondary">{mockWeather.precipitation}%</Text>
          </View>
        </View>
      </View>
    </Card>
=======

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
        ctaText: t('common.learnMore'),
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
  }, [navigation, apiAnnouncements, isDark, t]);

  const quickLaunchActions = useMemo<QuickLaunchAction[]>(() => {
    return [
      {
        id: 'invite_customer',
        title: t('dashboard.quickActions.customerInvite'),
        icon: 'account-group',
        permission: 'invite_customer',
      },
      {
        id: 'order_concrete',
        title: t('dashboard.quickActions.savedOrders'),
        icon: 'clipboard-list',
        permission: 'order_concrete',
      },
      {
        id: 'reports',
        title: t('dashboard.quickActions.reports'),
        icon: 'file-document-outline',
        permission: 'view_reports',
      },
    ];
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
>>>>>>> Stashed changes
  );

  const renderKPICard = ({ item }: { item: KPIData }) => (
    <TouchableOpacity
      style={[styles.kpiCard, { backgroundColor: themeColors.card }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Orders', { filter: item.label.toLowerCase().replace(' ', '_') })}>
      <View style={[styles.kpiIconContainer, { backgroundColor: `${item.color}20` }]}>
        <Icon name={item.icon} size={iconSizes.lg} color={item.color} />
      </View>
      <Text style={styles.kpiValue}>{item.value}</Text>
      <Text variant="caption" color="secondary" style={styles.kpiLabel}>{item.label}</Text>
      {item.trend && item.trendValue && (
        <View style={styles.trendContainer}>
          <Icon
            name={item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'minus'}
            size={iconSizes.xs}
            color={item.trend === 'up' ? colors.success.main : item.trend === 'down' ? colors.error.main : themeColors.text.secondary}
          />
          <Text
            variant="captionSmall"
            style={{ color: item.trend === 'up' ? colors.success.main : item.trend === 'down' ? colors.error.main : themeColors.text.secondary }}>
            {item.trendValue}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

<<<<<<< Updated upstream
  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[styles.quickActionItem, { backgroundColor: themeColors.card }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(item.screen)}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${item.color}20` }]}>
        <Icon name={item.icon} size={iconSizes.lg} color={item.color} />
      </View>
      <Text variant="caption" color="secondary" style={styles.quickActionLabel}>{item.label}</Text>
    </TouchableOpacity>
  );
=======
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
>>>>>>> Stashed changes

  const renderDeliveryCard = ({ item }: { item: ActiveDelivery }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('MapTracking', { truckId: item.id })}>
      <Card variant="default" padding="md" style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryTruckInfo}>
            <Icon name="truck" size={iconSizes.md} color={colors.primary.main} />
            <Text variant="body" style={styles.truckNumber}>{item.truckNumber}</Text>
            <StatusBadge status={item.status} size="small" />
          </View>
          <Text variant="bodySmall" color="secondary">{item.eta}</Text>
        </View>
        <View style={styles.deliveryDetails}>
          <View style={styles.deliveryDetailRow}>
            <Icon name="account" size={iconSizes.sm} color={themeColors.text.secondary} />
            <Text variant="bodySmall" color="secondary">{item.driverName}</Text>
          </View>
          <View style={styles.deliveryDetailRow}>
            <Icon name="domain" size={iconSizes.sm} color={themeColors.text.secondary} />
            <Text variant="bodySmall" color="secondary">{item.customerName}</Text>
          </View>
        </View>
        <View style={[styles.progressBarContainer, { backgroundColor: themeColors.border }]}>
          <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: colors.primary.main }]} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderAlertItem = ({ item }: { item: Alert }) => {
    const alertIcons: Record<string, string> = {
      weather: 'weather-cloudy-alert',
      order: 'clipboard-text-outline',
      delivery: 'truck-delivery-outline',
      system: 'information-outline',
    };

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Notifications')}>
        <View style={[styles.alertItem, !item.isRead && { backgroundColor: `${colors.primary.main}08` }]}>
          <View style={[styles.alertIconContainer, { backgroundColor: `${priorityColors[item.priority]}20` }]}>
            <Icon name={alertIcons[item.type]} size={iconSizes.md} color={priorityColors[item.priority]} />
          </View>
          <View style={styles.alertContent}>
            <View style={styles.alertHeader}>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>{item.title}</Text>
              <Text variant="captionSmall" color="hint">{item.time}</Text>
            </View>
            <Text variant="caption" color="secondary" numberOfLines={1}>{item.message}</Text>
          </View>
<<<<<<< Updated upstream
          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary.main }]} />}
=======

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
                <Text style={[styles.deliveryStatUnit, { color: themeColors.text.primary }]}> {t('units.cy')}</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>{t('dashboard.ordered')}</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statGreen }]}>
                  {formatQty(item.deliveredQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: colors.dashboard.statGreen }]}> {t('units.cy')}</Text>
              </View>
              <Text style={[styles.deliveryStatLabel, { color: themeColors.text.hint }]}>{t('dashboard.poured')}</Text>
            </View>
            <View style={[styles.deliveryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.deliveryStatItem}>
              <View style={styles.deliveryStatValueRow}>
                <Text style={[styles.deliveryStatValue, { color: colors.dashboard.statYellow }]}>
                  {formatQty(item.remainingQty)}
                </Text>
                <Text style={[styles.deliveryStatUnit, { color: colors.dashboard.statYellow }]}> {t('units.cy')}</Text>
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
                      <View style={styles.deliverySegmentTrack}>
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
                {orderedQty.toFixed(2)} {t('units.cy')}
              </Text>
            </View>

            <View style={styles.deliveryCompletionRow}>
              <Text style={[styles.deliveryCompletionText, { color: getCompletionColor(deliveredPercent) }]}>
                {t('dashboard.percentCompleted', { percent: completionPercent })}
              </Text>
            </View>

{/* Loads count removed */}
          </View>
>>>>>>> Stashed changes
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text variant="h4">{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text variant="bodySmall" style={{ color: colors.primary.main }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
<<<<<<< Updated upstream
          <View style={styles.avatar}>
            <Text variant="h3" color="white">JS</Text>
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text variant="caption" color="secondary">Welcome back,</Text>
            <Text variant="h3">John Smith</Text>
          </View>
=======
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
          <LanguageSelector size={ms(36)} />
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
            <Icon name="bell-outline" size={iconSizes.lg} color={themeColors.text.primary} />
            {(notifications?.unread_count ?? 0) > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.error.main }]}>
                <Text style={styles.notificationBadgeText}>{notifications?.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
>>>>>>> Stashed changes
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell-outline" size={iconSizes.lg} color={themeColors.text.primary} />
          <View style={[styles.notificationBadge, { backgroundColor: colors.error.main }]}>
            <Text style={styles.notificationBadgeText}>2</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
<<<<<<< Updated upstream
        }>
        {renderWeatherCard()}
=======
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
            showRegion={showRegion}
            onCompanyPress={(company) => {
>>>>>>> Stashed changes

        <SectionHeader title="Today's Overview" actionLabel="View All" onAction={() => navigation.navigate('Orders')} />
        <FlatList
          data={mockKPIs}
          renderItem={renderKPICard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiList}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        />

        <OverviewProgressBar
          completed={mockKPIs.find(k => k.label === 'Completed')?.value || 0}
          inProcess={mockKPIs.find(k => k.label === 'In Process')?.value || 0}
          prePour={mockKPIs.find(k => k.label === 'Pre-Pour')?.value || 0}
          onHold={mockKPIs.find(k => k.label === 'On Hold')?.value || 0}
          isDark={isDark}
          themeColors={themeColors}
        />

        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          {mockQuickActions.map((action) => (
            <View key={action.id} style={styles.quickActionWrapper}>
              {renderQuickAction({ item: action })}
            </View>
          ))}
        </View>

        <SectionHeader
          title="Active Deliveries"
          actionLabel={`${mockDeliveries.length} Active`}
          onAction={() => navigation.navigate('MapTracking')}
        />
        <FlatList
          data={mockDeliveries}
          renderItem={renderDeliveryCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deliveryList}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        />
        <SectionHeader
          title="Recent Alerts"
          actionLabel="See All"
          onAction={() => navigation.navigate('Notifications')}
        />
        <Card variant="default" padding="none" style={styles.alertsCard}>
          {mockAlerts.map((alert, index) => (
            <React.Fragment key={alert.id}>
              {renderAlertItem({ item: alert })}
              {index < mockAlerts.length - 1 && <View style={[styles.alertDivider, { backgroundColor: themeColors.border }]} />}
            </React.Fragment>
          ))}
        </Card>

<<<<<<< Updated upstream
        <View style={{ height: TAB_BAR_HEIGHT }} />
=======
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
            <SectionHeader title={t('dashboard.activeDeliveries')} actionLabel={t('dashboard.viewAll')} onAction={() => navigation.navigate('Orders', { date_filter: 'today', _timestamp: Date.now() })} />
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
                          {t('dashboard.more')}
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
                    {t('dashboard.noActiveDeliveries')}
                  </Text>
                  <Text variant="caption" color="hint" style={styles.emptyDeliverySubtitle}>
                    {t('dashboard.activeOrdersWillAppearHere')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: TAB_BAR_HEIGHT + spacing.lg }} />
>>>>>>> Stashed changes
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: typeof colors.dark | typeof colors.light, isTablet: boolean, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: ms(48),
      height: ms(48),
      borderRadius: ms(24),
      backgroundColor: colors.primary.main,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    welcomeTextContainer: {
      flex: 1,
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
    weatherCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
      backgroundColor: themeColors.card,
    },
    weatherCardShadow: {
      shadowColor: isDark ? colors.common.black : colors.grey[100],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    weatherHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    weatherMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    temperatureText: {
      fontSize: ms(56),
      fontWeight: '700',
      color: themeColors.text.primary,
      lineHeight: ms(62),
    },
    weatherDetails: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    weatherDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    kpiList: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    kpiCard: {
      width: isTablet ? ms(140) : ms(110),
      padding: spacing.md,
      borderRadius: ms(12),
      alignItems: 'center',
      shadowColor: isDark ? colors.common.black : colors.grey[100],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    kpiIconContainer: {
      width: ms(44),
      height: ms(44),
      borderRadius: ms(22),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    kpiValue: {
      fontSize: fontSizes.h2,
      fontWeight: '700',
      color: themeColors.text.primary,
      paddingVertical: ms(2)
    },
    kpiLabel: {
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    trendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: ms(2),
      marginTop: spacing.xs,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      justifyContent: 'space-between',
    },
    quickActionWrapper: {
      width: isTablet ? '23%' : '47%',
      marginBottom: spacing.md,
    },
    quickActionItem: {
      borderRadius: ms(12),
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: isDark ? colors.common.black : colors.grey[100],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    quickActionIcon: {
      width: ms(48),
      height: ms(48),
      borderRadius: ms(24),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    quickActionLabel: {
      textAlign: 'center',
    },
    deliveryList: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    deliveryCard: {
      width: isTablet ? ms(280) : ms(260),
      backgroundColor: themeColors.card,
      shadowColor: isDark ? colors.common.black : colors.grey[100],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    deliveryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    deliveryTruckInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    truckNumber: {
      fontWeight: '600',
    },
    deliveryDetails: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    deliveryDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    progressBarContainer: {
      height: ms(4),
      borderRadius: ms(2),
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: ms(2),
    },
    alertsCard: {
      marginHorizontal: spacing.lg,
    },
    alertItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.sm,
    },
    alertIconContainer: {
      width: ms(40),
      height: ms(40),
      borderRadius: ms(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertContent: {
      flex: 1,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: ms(2),
    },
    alertDivider: {
      height: 1,
      marginLeft: ms(56),
    },
    unreadDot: {
      width: ms(8),
      height: ms(8),
      borderRadius: ms(4),
    },
  });

export default DashboardScreen;
