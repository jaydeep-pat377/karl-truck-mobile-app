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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing, fontSizes, iconSizes } from '../../utils/responsive';
import { useResponsive } from '../../hooks/useResponsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

interface KPIData {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
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

const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { isTablet } = useResponsive();
  const [refreshing, setRefreshing] = React.useState(false);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text variant="h3" color="white">JS</Text>
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text variant="caption" color="secondary">Welcome back,</Text>
            <Text variant="h3">John Smith</Text>
          </View>
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
        }>
        {renderWeatherCard()}

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

        <View style={{ height: TAB_BAR_HEIGHT }} />
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
