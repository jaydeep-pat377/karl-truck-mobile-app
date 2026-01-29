import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Image,
  Modal,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text, Card, StatusBadge, TruckLoader, Icon } from '../../components/common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing, fontSizes, iconSizes } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useDashboard } from '../../hooks/useDashboard';
import { notificationService } from '../../services/notificationService';
import { updateWidgetData } from '../../modules/TodayOverviewWidget';

interface KPIData {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  statusFilter?: string;
}

interface ActiveDelivery {
  id: string;
  truckNumber: string;
  driverName: string;
  customerName: string;
  status: 'ENRT' | 'ONSIT' | 'LOADING';
  eta: string;
  progress: number;
}

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

const allQuickActions: QuickAction[] = [
  {
    id: '1',
    label: 'Track Trucks',
    icon: 'map-marker-radius',
    screen: 'Map',
    color: colors.status.enRoute,
  },
  {
    id: '2',
    label: 'Orders',
    icon: 'clipboard-list',
    screen: 'Orders',
    color: colors.primary.main,
  },
  {
    id: '4',
    label: 'Settings',
    icon: 'cog-outline',
    screen: 'Settings',
    color: colors.grey[50],
  },
  {
    id: '5',
    label: 'Profile',
    icon: 'account-circle-outline',
    screen: 'EditProfile',
    color: colors.info.main,
  },
  {
    id: '6',
    label: 'Map View',
    icon: 'map-outline',
    screen: 'MapTracking',
    color: colors.secondary.main,
  },
  {
    id: '7',
    label: 'Active Orders',
    icon: 'truck-delivery',
    screen: 'Orders',
    color: colors.dashboard.inProgress,
  },
  {
    id: '8',
    label: 'Change Password',
    icon: 'lock-outline',
    screen: 'ChangePassword',
    color: colors.error.main,
  },
];

const defaultEnabledActionIds = ['1', '2', '4'];
const QUICK_ACTIONS_STORAGE_KEY = '@quick_actions_enabled';

interface OverviewProgressBarProps {
  willCall: number;
  holdDelivery: number;
  cancelled: number;
  normal: number;
  completed: number;
  inProgress: number;
  totalOrders: number;
  isDark: boolean;
  themeColors: typeof colors.dark | typeof colors.light;
}

const OverviewProgressBar: React.FC<OverviewProgressBarProps> = ({
  willCall,
  holdDelivery,
  cancelled,
  normal,
  completed,
  inProgress,
  totalOrders,
  isDark,
  themeColors,
}) => {
  const total = totalOrders || (willCall + holdDelivery + cancelled + normal + completed + inProgress);
  const willCallPercent = total > 0 ? (willCall / total) * 100 : 0;
  const holdDeliveryPercent = total > 0 ? (holdDelivery / total) * 100 : 0;
  const cancelledPercent = total > 0 ? (cancelled / total) * 100 : 0;
  const normalPercent = total > 0 ? (normal / total) * 100 : 0;
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;

  const willCallAnim = useRef(new Animated.Value(0)).current;
  const holdDeliveryAnim = useRef(new Animated.Value(0)).current;
  const cancelledAnim = useRef(new Animated.Value(0)).current;
  const normalAnim = useRef(new Animated.Value(0)).current;
  const completedAnim = useRef(new Animated.Value(0)).current;
  const inProgressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    willCallAnim.setValue(0);
    holdDeliveryAnim.setValue(0);
    cancelledAnim.setValue(0);
    normalAnim.setValue(0);
    completedAnim.setValue(0);
    inProgressAnim.setValue(0);
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
      Animated.stagger(60, [
        Animated.timing(willCallAnim, {
          toValue: willCallPercent,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(holdDeliveryAnim, {
          toValue: holdDeliveryPercent,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(cancelledAnim, {
          toValue: cancelledPercent,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(normalAnim, {
          toValue: normalPercent,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(completedAnim, {
          toValue: completedPercent,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(inProgressAnim, {
          toValue: inProgressPercent,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [willCall, holdDelivery, cancelled, normal, completed, inProgress, willCallPercent, holdDeliveryPercent, cancelledPercent, normalPercent, completedPercent, inProgressPercent, willCallAnim, holdDeliveryAnim, cancelledAnim, normalAnim, completedAnim, inProgressAnim, fadeAnim, scaleAnim]);

  const segments = [
    { label: 'Will Call', value: willCall, percent: willCallPercent, anim: willCallAnim, color: colors.dashboard.willCall, icon: 'phone-ring' },
    { label: 'Hold Delivery', value: holdDelivery, percent: holdDeliveryPercent, anim: holdDeliveryAnim, color: colors.status.onHold, icon: 'pause-circle' },
    { label: 'Cancelled', value: cancelled, percent: cancelledPercent, anim: cancelledAnim, color: colors.error.main, icon: 'close-circle' },
    { label: 'Normal', value: normal, percent: normalPercent, anim: normalAnim, color: colors.status.prePour, icon: 'checkbox-marked-circle' },
    { label: 'Completed', value: completed, percent: completedPercent, anim: completedAnim, color: colors.status.completed, icon: 'check-circle' },
    { label: 'In Progress', value: inProgress, percent: inProgressPercent, anim: inProgressAnim, color: colors.dashboard.inProgress, icon: 'truck-fast' },
  ].filter(s => s.value > 0);

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
            Today's Overview
          </Text>
        </View>
        <View style={[progressStyles.completionBadge, { backgroundColor: `${colors.status.completed}15` }]}>
          <Text style={[progressStyles.completionText, { color: colors.status.completed }]}>
            {total} Orders
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
          {completed} completed • <Text style={{ color: colors.dashboard.inProgress }}>{inProgress} in progress</Text>
        </Text>
        <Text variant="caption" style={{ color: colors.dashboard.willCall }}>
          {willCall} will call
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

const DashboardScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { isTablet } = useResponsive();
  const { width: screenWidth } = useWindowDimensions();

  const [enabledActionIds, setEnabledActionIds] = useState<string[]>(defaultEnabledActionIds);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [tempEnabledIds, setTempEnabledIds] = useState<string[]>([]);

  useEffect(() => {
    const loadSavedActions = async () => {
      try {
        const saved = await AsyncStorage.getItem(QUICK_ACTIONS_STORAGE_KEY);
        if (saved) {
          setEnabledActionIds(JSON.parse(saved));
        }
      } catch (error) {
        console.log('Error loading quick actions:', error);
      }
    };
    loadSavedActions();
  }, []);

  const saveQuickActions = useCallback(async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(ids));
      setEnabledActionIds(ids);
    } catch (error) {
      console.log('Error saving quick actions:', error);
    }
  }, []);

  const enabledQuickActions = useMemo(() => {
    return allQuickActions.filter(action => enabledActionIds.includes(action.id));
  }, [enabledActionIds]);

  const {
    user,
    notifications,
    weather,
    todayOverview,
    activeDeliveries,
    recentAlerts,
    isLoading,
    isError,
    error,
    isRefetching,
    isFetching,
    refetch,
  } = useDashboard();

  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('=== iOS NOTIFICATION DEBUG ===');
        console.log('Platform:', Platform.OS);
        const deviceToken = await notificationService.getToken();
        console.log('=== DEVICE TOKEN ===');
        console.log(deviceToken);
        console.log('=== END TOKEN ===');
      } catch (error) {
        console.log('Error fetching device token:', error);
      }
    };
    initNotifications();
  }, []);

  // Update Android widget when todayOverview data changes
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
        .then(() => console.log('Widget updated successfully'))
        .catch((error) => console.log('Failed to update widget:', error));
    }
  }, [todayOverview]);

  const themeColors = isDark ? colors.dark : colors.light;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOpenQuickActionsModal = useCallback(() => {
    setTempEnabledIds([...enabledActionIds]);
    setShowQuickActionsModal(true);
  }, [enabledActionIds]);

  const handleCloseQuickActionsModal = useCallback(() => {
    setShowQuickActionsModal(false);
  }, []);

  const handleToggleAction = useCallback((actionId: string) => {
    setTempEnabledIds(prev => {
      if (prev.includes(actionId)) {
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== actionId);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, actionId];
      }
    });
  }, []);

  const handleSaveQuickActions = useCallback(() => {
    saveQuickActions(tempEnabledIds);
    setShowQuickActionsModal(false);
  }, [tempEnabledIds, saveQuickActions]);

  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const kpiData: KPIData[] = useMemo(() => [
    { id: '1', label: 'Normal', value: todayOverview?.normal ?? 0, icon: 'checkbox-marked-circle', color: colors.status.prePour, statusFilter: 'Normal' },
    { id: '2', label: 'Will Call', value: todayOverview?.will_call ?? 0, icon: 'phone-ring', color: colors.dashboard.willCall, statusFilter: 'Will Call' },
    { id: '3', label: 'Hold Delivery', value: todayOverview?.hold_delivery ?? 0, icon: 'pause-circle', color: colors.status.onHold, statusFilter: 'Hold Delivery' },
    { id: '4', label: 'Cancelled', value: todayOverview?.cancelled ?? 0, icon: 'close-circle', color: colors.error.main, statusFilter: 'Canceled' },
    { id: '5', label: 'In Progress', value: todayOverview?.in_progress ?? 0, icon: 'truck-fast', color: colors.dashboard.inProgress, statusFilter: 'In Progress' },
    { id: '6', label: 'Completed', value: todayOverview?.completed ?? 0, icon: 'check-circle', color: colors.status.completed, statusFilter: 'Completed' },
  ], [todayOverview]);

  const getWeatherIconName = (condition?: string) => {
    if (!condition) return 'weather-partly-cloudy';
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('sunny') || lowerCondition.includes('clear')) return 'weather-sunny';
    if (lowerCondition.includes('cloud')) return 'weather-cloudy';
    if (lowerCondition.includes('rain')) return 'weather-rainy';
    if (lowerCondition.includes('snow')) return 'weather-snowy';
    if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) return 'weather-lightning-rainy';
    return 'weather-partly-cloudy';
  };

  const styles = useMemo(() => createStyles(themeColors, isTablet, isDark, screenWidth), [isDark, isTablet, themeColors, screenWidth]);

  const priorityColors: Record<string, string> = {
    high: colors.error.main,
    medium: colors.warning.main,
    low: themeColors.text.secondary,
  };

  const renderWeatherCard = () => (
    <Card variant="elevated" padding="md" style={[styles.weatherCard, styles.weatherCardShadow]}>
      <View style={styles.weatherHeader}>
        <View>
          <Text variant="caption" color="secondary">{weather?.location || 'Location N/A'}</Text>
          <View style={styles.weatherMain}>
            <Text style={styles.temperatureText}>{weather?.avg_temperature_fahrenheit ?? weather?.temperature ?? '--'}°</Text>
            <Icon
              name={getWeatherIconName(weather?.condition)}
              size={iconSizes.xxl}
              color={colors.warning.main}
            />
          </View>
          <Text variant="bodySmall" color="secondary">
            {weather?.condition || 'Weather unavailable'}
          </Text>
        </View>
        <View style={styles.weatherDetails}>
          <View style={styles.weatherDetailItem}>
            <Icon name="water-percent" size={iconSizes.sm} color={colors.info.main} />
            <Text variant="caption" color="secondary">{weather?.avg_humidity_percent ?? weather?.humidity ?? '--'}%</Text>
          </View>
          <View style={styles.weatherDetailItem}>
            <Icon name="weather-windy" size={iconSizes.sm} color={themeColors.text.secondary} />
            <Text variant="caption" color="secondary">{weather?.avg_wind_speed_mph ?? weather?.windSpeed ?? '--'} mph</Text>
          </View>
          <View style={styles.weatherDetailItem}>
            <Icon name="water" size={iconSizes.sm} color={colors.primary.main} />
            <Text variant="caption" color="secondary">{weather?.avg_precipitation_percent ?? 0}%</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderKPICard = ({ item }: { item: KPIData }) => (
    <TouchableOpacity
      style={[styles.kpiCard, { backgroundColor: themeColors.card }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Orders', { statusFilter: item.statusFilter })}>
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

  const quickActionLayout = useMemo(() => {
    const horizontalPadding = spacing.lg * 2;
    const gapBetweenItems = spacing.sm;
    const numberOfItems = 3;
    const totalGaps = gapBetweenItems * (numberOfItems - 1);
    const availableWidth = screenWidth - horizontalPadding - totalGaps;
    const itemWidth = Math.floor(availableWidth / numberOfItems);
    const itemHeight = isTablet ? ms(130) : screenWidth < 375 ? ms(95) : ms(110);
    const iconContainerSize = isTablet ? ms(56) : screenWidth < 375 ? ms(40) : ms(48);

    return {
      itemWidth,
      itemHeight,
      iconContainerSize,
      iconSize: isTablet ? iconSizes.xl : screenWidth < 375 ? iconSizes.md : iconSizes.lg,
    };
  }, [screenWidth, isTablet]);

  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[
        styles.quickActionItem,
        {
          backgroundColor: themeColors.card,
          width: quickActionLayout.itemWidth,
          minHeight: quickActionLayout.itemHeight,
        },
      ]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(item.screen)}>
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor: `${item.color}20`,
            width: quickActionLayout.iconContainerSize,
            height: quickActionLayout.iconContainerSize,
            borderRadius: quickActionLayout.iconContainerSize / 2,
          },
        ]}>
        <Icon name={item.icon} size={quickActionLayout.iconSize} color={item.color} />
      </View>
      <Text
        variant={screenWidth < 375 ? 'captionSmall' : 'caption'}
        color="secondary"
        style={styles.quickActionLabel}
        numberOfLines={2}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

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
          {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary.main }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, actionLabel, onAction, showScrollHint }: { title: string; actionLabel?: string; onAction?: () => void; showScrollHint?: boolean }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text variant="h4">{title}</Text>
        {showScrollHint && (
          <View style={[styles.scrollHintContainer, { backgroundColor: colors.primary.main + '20' }]}>
            <Text variant="caption" style={{ color: colors.primary.main, marginRight: ms(4), fontWeight: '500' }}>
              Swipe
            </Text>
            <Icon name="chevron-right" size={ms(16)} color={colors.primary.main} />
          </View>
        )}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text variant="bodySmall" style={{ color: colors.primary.main }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const DashboardSkeleton = () => {
    const shimmerColor = isDark ? colors.dark.cardElevated : colors.grey[10];
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: shimmerColor }]} />
            <View style={styles.welcomeTextContainer}>
              <View style={{ width: ms(80), height: ms(12), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: ms(4) }} />
              <View style={{ width: ms(120), height: ms(18), backgroundColor: shimmerColor, borderRadius: ms(4) }} />
            </View>
          </View>
          <View style={{ width: ms(40), height: ms(40), backgroundColor: shimmerColor, borderRadius: ms(20) }} />
        </View>

        {/* KPI cards skeleton */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <View style={{ width: ms(140), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: spacing.sm }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ width: ms(110), height: ms(120), backgroundColor: shimmerColor, borderRadius: ms(12), marginRight: spacing.sm }} />
            ))}
          </ScrollView>
        </View>

        {/* Quick actions skeleton */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ width: ms(120), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: spacing.sm }} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, height: ms(100), backgroundColor: shimmerColor, borderRadius: ms(12) }} />
            ))}
          </View>
        </View>

        {/* Deliveries skeleton */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ width: ms(150), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: spacing.sm }} />
          <View style={{ height: ms(140), backgroundColor: shimmerColor, borderRadius: ms(12) }} />
        </View>

        {/* Recent Alerts skeleton */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <View style={{ width: ms(120), height: ms(20), backgroundColor: shimmerColor, borderRadius: ms(4), marginBottom: spacing.sm }} />
          <View style={{ backgroundColor: shimmerColor, borderRadius: ms(12), padding: spacing.md }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
                <View style={{ width: ms(40), height: ms(40), backgroundColor: isDark ? colors.grey[80] : colors.grey[15], borderRadius: ms(20), marginRight: spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <View style={{ width: '60%', height: ms(14), backgroundColor: isDark ? colors.grey[80] : colors.grey[15], borderRadius: ms(4), marginBottom: ms(6) }} />
                  <View style={{ width: '80%', height: ms(12), backgroundColor: isDark ? colors.grey[80] : colors.grey[15], borderRadius: ms(4) }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, styles.loaderContainer, { backgroundColor: themeColors.background }]} edges={['top']}>
        <Icon name="alert-circle-outline" size={48} color={colors.error.main} />
        <Text variant="h4" style={{ marginTop: spacing.md, color: colors.error.main }}>
          Failed to load dashboard
        </Text>
        <Text variant="body" color="secondary" style={{ marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl }}>
          {error || 'Please check your connection and try again'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.primary.main, borderRadius: ms(8) }}
          onPress={() => refetch()}>
          <Text variant="body" color="white">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Settings')}>
            {user?.avatarUrl && user.avatarUrl !== 'https://example.com/avatar.jpg' ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text variant="h3" color="white">{getUserInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.welcomeTextContainer}>
            <Text variant="caption" color="secondary">Welcome back,</Text>
            <Text variant="h3">{user?.fullName || 'User'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell-outline" size={iconSizes.lg} color={themeColors.text.primary} />
          {(notifications?.unread_count ?? 0) > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: colors.error.main }]}>
              <Text style={styles.notificationBadgeText}>{notifications?.unread_count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
        }>
        {/* {renderWeatherCard()} */}

        <SectionHeader title="Today's Overview" actionLabel={`Total: ${todayOverview?.total_orders ?? 0}`} onAction={() => navigation.navigate('Orders')} showScrollHint />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiList}>
          {kpiData.map((item, index) => (
            <View key={item.id} style={{ flexDirection: 'row' }}>
              {renderKPICard({ item })}
              {index < kpiData.length - 1 && <View style={{ width: spacing.sm }} />}
            </View>
          ))}
        </ScrollView>

        <OverviewProgressBar
          willCall={todayOverview?.will_call ?? 0}
          holdDelivery={todayOverview?.hold_delivery ?? 0}
          cancelled={todayOverview?.cancelled ?? 0}
          normal={todayOverview?.normal ?? 0}
          completed={todayOverview?.completed ?? 0}
          inProgress={todayOverview?.in_progress ?? 0}
          totalOrders={todayOverview?.total_orders ?? 0}
          isDark={isDark}
          themeColors={themeColors}
        />

        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActionsGrid}>
          {enabledQuickActions.map((action) => (
            <React.Fragment key={action.id}>
              {renderQuickAction({ item: action })}
            </React.Fragment>
          ))}
        </View>

        <SectionHeader
          title="Active Deliveries"
          actionLabel={`${activeDeliveries?.count ?? 0} Active`}
          onAction={() => navigation.navigate('MapTracking')}
        />
        {activeDeliveries?.orders && activeDeliveries.orders.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deliveryList}>
            {activeDeliveries.orders.map((order, index) => {
              const deliveryItem: ActiveDelivery = {
                id: order.order_id,
                truckNumber: order.order_code,
                driverName: order.customer_name,
                customerName: order.delivery_address || 'N/A',
                status: order.status?.toUpperCase().substring(0, 5) as 'ENRT' | 'ONSIT' | 'LOADING',
                eta: order.start_time || 'N/A',
                progress: order.progress_percent || 0,
              };
              return (
                <View key={order.order_id} style={{ flexDirection: 'row' }}>
                  {renderDeliveryCard({ item: deliveryItem })}
                  {index < activeDeliveries.orders.length - 1 && <View style={{ width: spacing.sm }} />}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Card variant="default" padding="md" style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Icon name="truck-outline" size={32} color={themeColors.text.hint} />
              <Text variant="body" color="secondary" style={styles.emptyText}>
                No active deliveries
              </Text>
            </View>
          </Card>
        )}
        <SectionHeader
          title="Recent Alerts"
          actionLabel="See All"
          onAction={() => navigation.navigate('Notifications')}
        />
        {recentAlerts && recentAlerts.length > 0 ? (
          <Card variant="default" padding="none" style={styles.alertsCard}>
            {recentAlerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                {renderAlertItem({
                  item: {
                    id: alert.id,
                    type: alert.type as 'weather' | 'order' | 'delivery' | 'system',
                    title: alert.type.charAt(0).toUpperCase() + alert.type.slice(1),
                    message: alert.message,
                    time: new Date(alert.timestamp).toLocaleTimeString(),
                    priority: 'medium' as const,
                    isRead: false,
                  },
                })}
                {index < recentAlerts.length - 1 && <View style={[styles.alertDivider, { backgroundColor: themeColors.border }]} />}
              </React.Fragment>
            ))}
          </Card>
        ) : (
          <Card variant="default" padding="md" style={styles.alertsCard}>
            <View style={styles.emptyState}>
              <Icon name="bell-off-outline" size={32} color={themeColors.text.hint} />
              <Text variant="body" color="secondary" style={styles.emptyText}>
                No recent alerts
              </Text>
            </View>
          </Card>
        )}

        <View style={{ height: TAB_BAR_HEIGHT }} />
      </ScrollView>

      {/* Quick Actions Edit Modal */}
      <Modal
        visible={showQuickActionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseQuickActionsModal}>
        <Pressable style={styles.modalOverlay} onPress={handleCloseQuickActionsModal}>
          <Pressable style={[styles.modalContainer, { backgroundColor: themeColors.card }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text variant="h4">Edit Quick Actions</Text>
              <TouchableOpacity onPress={handleCloseQuickActionsModal} activeOpacity={0.7}>
                <Icon name="close" size={iconSizes.lg} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text variant="caption" color="secondary" style={styles.modalSubtitle}>
              Select up to 3 quick actions to display on your dashboard
            </Text>

            <View style={styles.actionsListContainer}>
              {allQuickActions.map((action) => {
                const isEnabled = tempEnabledIds.includes(action.id);
                const isDisabled = !isEnabled && tempEnabledIds.length >= 3;

                return (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.actionListItem,
                      {
                        backgroundColor: isEnabled ? `${action.color}15` : 'transparent',
                        borderColor: isEnabled ? action.color : themeColors.border,
                        opacity: isDisabled ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleToggleAction(action.id)}
                    disabled={isDisabled}
                    activeOpacity={0.7}>
                    <View style={[styles.actionListIcon, { backgroundColor: `${action.color}20` }]}>
                      <Icon name={action.icon} size={iconSizes.md} color={action.color} />
                    </View>
                    <Text variant="body" style={styles.actionListLabel}>{action.label}</Text>
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: isEnabled ? colors.primary.main : 'transparent',
                        borderColor: isEnabled ? colors.primary.main : themeColors.border,
                      },
                    ]}>
                      {isEnabled && <Icon name="check" size={ms(14)} color={colors.common.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: themeColors.border }]}
                onPress={handleCloseQuickActionsModal}
                activeOpacity={0.7}>
                <Text variant="body" color="secondary">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: colors.primary.main }]}
                onPress={handleSaveQuickActions}
                activeOpacity={0.7}>
                <Text variant="body" style={{ color: colors.common.white }}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (themeColors: typeof colors.dark | typeof colors.light, isTablet: boolean, isDark: boolean, screenWidth: number) =>
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
    avatarImage: {
      width: ms(48),
      height: ms(48),
      borderRadius: ms(24),
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
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    scrollHintContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary.main + '10',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: ms(12),
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
      flexWrap: 'nowrap',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      justifyContent: 'space-between',
      alignItems: 'stretch',
      gap: spacing.sm,
    },
    quickActionItem: {
      borderRadius: ms(12),
      paddingVertical: isTablet ? spacing.lg : spacing.md,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: isDark ? colors.common.black : colors.grey[100],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    quickActionIcon: {
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    quickActionLabel: {
      textAlign: 'center',
      paddingHorizontal: spacing.xs,
    },
    deliveryList: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    deliveryCard: {
      width: screenWidth - (spacing.lg * 2),
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
    emptyCard: {
      marginHorizontal: spacing.lg,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
    },
    emptyText: {
      marginTop: spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay.medium,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContainer: {
      width: '100%',
      maxWidth: ms(400),
      borderRadius: ms(16),
      padding: spacing.lg,
      shadowColor: colors.common.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      marginBottom: spacing.sm,
    },
    modalSubtitle: {
      marginBottom: spacing.md,
    },
    actionsListContainer: {
      gap: spacing.sm,
    },
    actionListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: ms(12),
      borderWidth: 1.5,
      gap: spacing.sm,
    },
    actionListIcon: {
      width: ms(40),
      height: ms(40),
      borderRadius: ms(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionListLabel: {
      flex: 1,
      fontWeight: '500',
    },
    checkbox: {
      width: ms(24),
      height: ms(24),
      borderRadius: ms(6),
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    modalButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: ms(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonCancel: {
      borderWidth: 1,
    },
    modalButtonSave: {
      shadowColor: colors.primary.main,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
  });

export default DashboardScreen;
