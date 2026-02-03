/**
 * TodayOrdersScreen
 * Production-ready order card UI with clear visual hierarchy
 * Designed for scannability, efficiency, and modern aesthetics
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { useOrders } from '../../hooks';
import { ApiOrder } from '../../types/order';
import { RootStackParamList } from '../../navigation/types';
import { getStatusColor, getStatusLabel } from '../../utils/statusUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Weather icon mapping
const getWeatherIcon = (condition: string): string => {
  const iconMap: Record<string, string> = {
    Clear: 'weather-sunny',
    Clouds: 'weather-cloudy',
    Rain: 'weather-rainy',
    Drizzle: 'weather-rainy',
    Thunderstorm: 'weather-lightning',
    Snow: 'weather-snowy',
    Mist: 'weather-fog',
    Fog: 'weather-fog',
    Haze: 'weather-hazy',
  };
  return iconMap[condition] || 'weather-partly-cloudy';
};

// Evaporation level color coding
const getEvapColor = (level: string): string => {
  const colorMap: Record<string, string> = {
    Low: colors.success.main,
    Medium: colors.warning.main,
    High: colors.error.main,
  };
  return colorMap[level] || colors.grey[50];
};

// Progress color based on completion percentage
const getProgressColor = (progress: number): string => {
  if (progress >= 80) return colors.success.main;
  if (progress >= 50) return colors.warning.main;
  if (progress >= 25) return colors.info.main;
  return colors.grey[50];
};

export const TodayOrdersScreen: React.FC = () => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const themeColors = isDark ? colors.dark : colors.light;

  const {
    orders: apiOrders,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useOrders({
    date_filter: 'today',
    limit: 10,
    status: 'In Progress',
    sort_by: 'order_date',
    sort_order: 'desc',
  });

  const summaryStats = useMemo(() => {
    const totalOrdered = apiOrders.reduce((sum, o) => sum + (o.ordered_qty || 0), 0);
    const totalDelivered = apiOrders.reduce((sum, o) => sum + (o.delivered_qty || 0), 0);
    const totalRemaining = apiOrders.reduce((sum, o) => sum + (o.remaining_qty || 0), 0);
    const avgProgress = apiOrders.length > 0
      ? Math.round(apiOrders.reduce((sum, o) => sum + (o.ordered_qty > 0 ? (o.delivered_qty / o.ordered_qty) * 100 : 0), 0) / apiOrders.length)
      : 0;
    return { totalOrdered, totalDelivered, totalRemaining, avgProgress };
  }, [apiOrders]);

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const handleOrderPress = useCallback((order: ApiOrder) => {
    navigation.navigate('Tracking', {
      orderId: order.order_id,
    });
  }, [navigation]);

  // Format quantity with smart decimal display
  const fmtQty = (qty: number) => qty % 1 === 0 ? qty.toString() : qty.toFixed(1);

  /**
   * Order Card - Production-Ready Design
   *
   * Visual Hierarchy (top to bottom):
   * 1. Primary: Order ID + Status (immediate identification)
   * 2. Secondary: Customer + Project (who)
   * 3. Tertiary: Address (where)
   * 4. Supporting: Product + Progress (what + how much)
   * 5. Contextual: Weather (environmental data)
   */
  const renderOrderCard = useCallback(({ item }: { item: ApiOrder }) => {
    const progress = item.ordered_qty > 0 ? Math.round((item.delivered_qty / item.ordered_qty) * 100) : 0;
    const statusColor = getStatusColor(item.status, progress);
    const progressColor = getProgressColor(progress);
    const statusLabel = getStatusLabel(item.status);
    const weather = item.weather_data;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleOrderPress(item)}
        style={[styles.card, { backgroundColor: themeColors.card }]}
      >
        {/* === TOP SECTION: Order Identity === */}
        <View style={styles.cardTop}>
          {/* Left: Status indicator + Order ID */}
          <View style={styles.orderIdentity}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <View>
              <Text style={[styles.orderCode, { color: themeColors.text.primary }]}>
                {item.order_code}
              </Text>
              <View style={styles.timeBadge}>
                <Icon name="clock-outline" size={ms(11)} color={themeColors.text.hint} />
                <Text style={[styles.timeText, { color: themeColors.text.hint }]}>
                  {item.start_time}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* === DIVIDER === */}
        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} />

        {/* === MIDDLE SECTION: Details === */}
        <View style={styles.cardMiddle}>
          {/* Customer & Project */}
          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary.main}12` }]}>
              <Icon name="domain" size={ms(12)} color={colors.primary.main} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.customerName, { color: themeColors.text.primary }]} numberOfLines={1}>
                {item.customer_name}
              </Text>
              {item.project_name ? (
                <Text style={[styles.projectName, { color: themeColors.text.secondary }]} numberOfLines={1}>
                  {item.project_name}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Address */}
          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.info.main}12` }]}>
              <Icon name="map-marker" size={ms(12)} color={colors.info.main} />
            </View>
            <Text style={[styles.addressText, { color: themeColors.text.secondary }]} numberOfLines={2}>
              {item.delivery_address}
            </Text>
          </View>

          {/* Product Info */}
          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.secondary.main}12` }]}>
              <Icon name="package-variant" size={ms(12)} color={colors.secondary.main} />
            </View>
            <View style={styles.productInfo}>
              <View style={[styles.productCodeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.productCodeText, { color: themeColors.text.primary }]}>
                  {item.product_codes || 'N/A'}
                </Text>
              </View>
              <Text style={[styles.productDesc, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {item.product_description || 'No description'}
              </Text>
            </View>
            <View style={styles.ticketBadge}>
              <Icon name="ticket-confirmation-outline" size={ms(11)} color={colors.primary.main} />
              <Text style={[styles.ticketCount, { color: colors.primary.main }]}>
                {item.tickets_count}
              </Text>
            </View>
          </View>
        </View>

        {/* === PROGRESS SECTION === */}
        <View style={[styles.progressSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)' }]}>
          {/* Quantity Stats */}
          <View style={styles.quantityRow}>
            <View style={styles.qtyItem}>
              <Text style={[styles.qtyLabel, { color: themeColors.text.hint }]}>Ordered</Text>
              <Text style={[styles.qtyValue, { color: themeColors.text.primary }]}>{fmtQty(item.ordered_qty)}</Text>
            </View>
            <View style={[styles.qtyDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.qtyItem}>
              <Text style={[styles.qtyLabel, { color: themeColors.text.hint }]}>Delivered</Text>
              <Text style={[styles.qtyValue, { color: colors.success.main }]}>{fmtQty(item.delivered_qty)}</Text>
            </View>
            <View style={[styles.qtyDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.qtyItem}>
              <Text style={[styles.qtyLabel, { color: themeColors.text.hint }]}>Remaining</Text>
              <Text style={[styles.qtyValue, { color: colors.warning.main }]}>{item.remaining_display}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: progressColor
                  }
                ]}
              />
            </View>
            <View style={[styles.progressBadge, { backgroundColor: `${progressColor}15` }]}>
              <Text style={[styles.progressText, { color: progressColor }]}>{progress}%</Text>
            </View>
          </View>
        </View>

        {/* === WEATHER FOOTER (if available) === */}
        {weather && (
          <View style={[styles.weatherFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={styles.weatherLeft}>
              <Icon name={getWeatherIcon(weather.weather_condition)} size={ms(16)} color={colors.info.main} />
              <Text style={[styles.weatherTemp, { color: themeColors.text.primary }]}>
                {weather.temperature_fahrenheit}°F
              </Text>
              <Text style={[styles.weatherDesc, { color: themeColors.text.secondary }]}>
                {weather.weather_description}
              </Text>
            </View>
            <View style={styles.weatherRight}>
              <View style={styles.weatherStat}>
                <Icon name="water-percent" size={ms(11)} color={themeColors.text.hint} />
                <Text style={[styles.weatherStatText, { color: themeColors.text.hint }]}>{weather.humidity}%</Text>
              </View>
              <View style={styles.weatherStat}>
                <Icon name="weather-windy" size={ms(11)} color={themeColors.text.hint} />
                <Text style={[styles.weatherStatText, { color: themeColors.text.hint }]}>{weather.wind_speed_mph}mph</Text>
              </View>
              <View style={[styles.evapBadge, { backgroundColor: `${getEvapColor(weather.evaporation_level)}15` }]}>
                <Text style={[styles.evapText, { color: getEvapColor(weather.evaporation_level) }]}>
                  {weather.evaporation_level}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={ms(16)} color={themeColors.text.hint} />
          </View>
        )}

        {/* === FOOTER WITHOUT WEATHER === */}
        {!weather && (
          <View style={[styles.simpleFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.viewDetailsText, { color: colors.primary.main }]}>View Details</Text>
            <Icon name="chevron-right" size={ms(16)} color={colors.primary.main} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [themeColors, isDark, handleOrderPress]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(18)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Today's Orders</Text>
          <Text style={[styles.headerSub, { color: themeColors.text.hint }]}>
            {apiOrders.length} {apiOrders.length === 1 ? 'order' : 'orders'} in progress
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {apiOrders.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="clipboard-list-outline" size={ms(14)} color={colors.primary.main} />
              <Text style={[styles.summaryVal, { color: themeColors.text.primary }]}>{fmtQty(summaryStats.totalOrdered)}</Text>
              <Text style={[styles.summaryLbl, { color: themeColors.text.hint }]}>Ordered</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryItem}>
              <Icon name="truck-check-outline" size={ms(14)} color={colors.primary.main} />
              <Text style={[styles.summaryVal, { color: colors.primary.main }]}>{fmtQty(summaryStats.totalDelivered)}</Text>
              <Text style={[styles.summaryLbl, { color: themeColors.text.hint }]}>Delivered</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryItem}>
              <Icon name="package-variant" size={ms(14)} color={colors.warning.main} />
              <Text style={[styles.summaryVal, { color: colors.warning.main }]}>{fmtQty(summaryStats.totalRemaining)}</Text>
              <Text style={[styles.summaryLbl, { color: themeColors.text.hint }]}>Remaining</Text>
            </View>
          </View>
          <View style={styles.summaryProgress}>
            <Text style={[styles.summaryProgressLbl, { color: themeColors.text.secondary }]}>Progress</Text>
            <View style={[styles.summaryProgressTrack, { backgroundColor: isDark ? 'rgba(107,177,48,0.15)' : 'rgba(107,177,48,0.1)' }]}>
              <View style={[styles.summaryProgressFill, { width: `${summaryStats.avgProgress}%`, backgroundColor: colors.primary.main }]} />
            </View>
            <Text style={[styles.summaryProgressPct, { color: colors.primary.main }]}>{summaryStats.avgProgress}%</Text>
          </View>
        </View>
      )}

      <View style={styles.listHeader}>
        <Icon name="format-list-bulleted" size={ms(14)} color={colors.primary.main} />
        <Text style={[styles.listHeaderTxt, { color: themeColors.text.secondary }]}>Active Orders</Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(107,177,48,0.1)' : 'rgba(107,177,48,0.08)' }]}>
          <Icon name="clipboard-check-outline" size={ms(40)} color={colors.primary.main} />
        </View>
        <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>No Active Orders</Text>
        <Text style={[styles.emptySub, { color: themeColors.text.secondary }]}>No in-progress orders for today.</Text>
      </View>
    );
  };

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <StatusBar backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
        {renderHeader()}
        <View style={styles.errorWrap}>
          <Icon name="alert-circle-outline" size={ms(40)} color={colors.error.main} />
          <Text style={[styles.errorTxt, { color: themeColors.text.primary }]}>{error || 'Failed to load orders'}</Text>
          <Text style={[styles.retryTxt, { color: colors.primary.main }]} onPress={handleRefresh}>Tap to retry</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <StatusBar backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

      {isLoading ? (
        <View style={[styles.loadingWrap, { backgroundColor: themeColors.background }]}>
          <TruckLoader size={80} message="Loading..." color={isDark ? 'light' : 'dark'} />
        </View>
      ) : (
        <FlatList
          data={apiOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.order_id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + ms(60) }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main]}
              progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerContainer: { paddingHorizontal: ms(12), paddingTop: ms(8), paddingBottom: ms(10) },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: ms(10) },
  backBtn: { width: ms(32), height: ms(32), borderRadius: ms(8), justifyContent: 'center', alignItems: 'center', marginRight: ms(10) },
  refreshBtn: { width: ms(32), height: ms(32), borderRadius: ms(8), justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: ms(17), fontFamily: fontFamily.bold },
  headerSub: { fontSize: ms(11), fontFamily: fontFamily.regular, marginTop: ms(1) },

  // Summary Card
  summaryCard: { borderRadius: ms(10), padding: ms(10), marginBottom: ms(10), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { flex: 1, alignItems: 'center', gap: ms(2) },
  summaryVal: { fontSize: ms(14), fontFamily: fontFamily.bold },
  summaryLbl: { fontSize: ms(8), fontFamily: fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryDivider: { width: 1, height: ms(24), opacity: 0.2 },
  summaryProgress: { flexDirection: 'row', alignItems: 'center', marginTop: ms(8), paddingTop: ms(8), borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)', gap: ms(8) },
  summaryProgressLbl: { fontSize: ms(10), fontFamily: fontFamily.medium },
  summaryProgressTrack: { flex: 1, height: ms(5), borderRadius: ms(2.5), overflow: 'hidden' },
  summaryProgressFill: { height: '100%', borderRadius: ms(2.5) },
  summaryProgressPct: { fontSize: ms(11), fontFamily: fontFamily.bold, minWidth: ms(28) },

  // List Header
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: ms(5) },
  listHeaderTxt: { fontSize: ms(11), fontFamily: fontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },

  // List
  listContent: { paddingHorizontal: ms(12) },
  separator: { height: ms(10) },

  // ========================================
  // REDESIGNED CARD - Production Ready
  // ========================================
  card: {
    borderRadius: ms(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // === TOP SECTION ===
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ms(14),
    paddingTop: ms(14),
    paddingBottom: ms(10),
  },
  orderIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
  },
  statusIndicator: {
    width: ms(4),
    height: ms(36),
    borderRadius: ms(2),
  },
  orderCode: {
    fontSize: ms(16),
    fontFamily: fontFamily.bold,
    letterSpacing: -0.3,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginTop: ms(2),
  },
  timeText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  statusBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: ms(6),
  },
  statusText: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // === DIVIDER ===
  divider: {
    height: 1,
    marginHorizontal: ms(14),
  },

  // === MIDDLE SECTION ===
  cardMiddle: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    gap: ms(10),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(10),
  },
  iconCircle: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  customerName: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
    lineHeight: ms(18),
  },
  projectName: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    marginTop: ms(1),
  },
  addressText: {
    flex: 1,
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    lineHeight: ms(17),
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  productCodeBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(4),
  },
  productCodeText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },
  productDesc: {
    flex: 1,
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
  },
  ticketCount: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },

  // === PROGRESS SECTION ===
  progressSection: {
    marginHorizontal: ms(14),
    marginBottom: ms(12),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: ms(10),
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: ms(10),
  },
  qtyItem: {
    alignItems: 'center',
    flex: 1,
  },
  qtyLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: ms(2),
  },
  qtyValue: {
    fontSize: ms(15),
    fontFamily: fontFamily.bold,
  },
  qtyDivider: {
    width: 1,
    height: ms(28),
    opacity: 0.2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
  },
  progressTrack: {
    flex: 1,
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: ms(3),
  },
  progressBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(4),
    minWidth: ms(44),
    alignItems: 'center',
  },
  progressText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },

  // === WEATHER FOOTER ===
  weatherFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderTopWidth: 1,
    gap: ms(8),
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    flex: 1,
  },
  weatherTemp: {
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
  },
  weatherDesc: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    textTransform: 'capitalize',
  },
  weatherRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  weatherStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
  },
  weatherStatText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  evapBadge: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
  },
  evapText: {
    fontSize: ms(9),
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
  },

  // === SIMPLE FOOTER (no weather) ===
  simpleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderTopWidth: 1,
    gap: ms(4),
  },
  viewDetailsText: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
  },

  // ===== EMPTY =====
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: ms(60), paddingHorizontal: ms(20) },
  emptyIcon: { width: ms(70), height: ms(70), borderRadius: ms(35), justifyContent: 'center', alignItems: 'center', marginBottom: ms(12) },
  emptyTitle: { fontSize: ms(15), fontFamily: fontFamily.semiBold, marginBottom: ms(4) },
  emptySub: { fontSize: ms(12), fontFamily: fontFamily.regular, textAlign: 'center' },

  // ===== ERROR =====
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: ms(20) },
  errorTxt: { fontSize: ms(13), fontFamily: fontFamily.regular, textAlign: 'center', marginTop: ms(10) },
  retryTxt: { fontSize: ms(12), fontFamily: fontFamily.semiBold, marginTop: ms(10) },
});

export default TodayOrdersScreen;
