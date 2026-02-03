/**
 * TodayOrdersScreen
 * Production-ready order card UI with clear visual hierarchy
 * Designed for scannability, efficiency, and modern aesthetics
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader } from '../../components/common';
import { OrderCard } from '../../components/orders';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, spacing } from '../../utils/responsive';
import { useOrders, useChatRooms, useGlobalAlert } from '../../hooks';
import { ApiOrder, WeatherCondition } from '../../types/order';
import { Order } from '../../types';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Map weather condition string to WeatherCondition type
const mapWeatherCondition = (condition: string | undefined): WeatherCondition => {
  if (!condition) return 'sunny';
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('rain')) return 'rain';
  if (conditionLower.includes('storm') || conditionLower.includes('thunder')) return 'storm';
  if (conditionLower.includes('snow')) return 'snow';
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) return 'fog';
  if (conditionLower.includes('cloud') && conditionLower.includes('partly')) return 'partly_cloudy';
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) return 'cloudy';
  return 'sunny';
};

// Map API status to Order status
const mapOrderStatus = (status: string): Order['status'] => {
  const statusMap: Record<string, Order['status']> = {
    'normal': 'NORMAL',
    'in progress': 'IN_PROCESS',
    'completed': 'COMPLETED',
    'will call': 'WILL_CALL',
    'weather permitting': 'WEATHER_PERMITTING',
    'hold delivery': 'HOLD',
    'wait list': 'WAIT_LIST',
    'delayed': 'DELAYED',
    'canceled': 'CANCELLED',
    'cancelled': 'CANCELLED',
    'in_process': 'IN_PROCESS',
    'will_call': 'WILL_CALL',
    'weather_permitting': 'WEATHER_PERMITTING',
    'hold_delivery': 'HOLD',
    'wait_list': 'WAIT_LIST',
    'pending': 'PRE_POUR',
    'pre_pour': 'PRE_POUR',
    'pre-pour': 'PRE_POUR',
    'hold': 'HOLD',
    'on hold': 'HOLD',
    'on_hold': 'HOLD',
    'waitlist': 'WAIT_LIST',
    'willcall': 'WILL_CALL',
    'inprogress': 'IN_PROCESS',
  };
  return statusMap[status.toLowerCase()] || 'NORMAL';
};

// Map ApiOrder to Order type for OrderCard
const mapApiOrderToOrder = (apiOrder: ApiOrder): Order => {
  const progress = apiOrder.ordered_qty > 0
    ? Math.round((apiOrder.delivered_qty / apiOrder.ordered_qty) * 100)
    : 0;

  const productCode = apiOrder.product_codes || 'N/A';
  const estimatedLoadsPerTruck = 10;
  const totalLoads = Math.ceil(apiOrder.ordered_qty / estimatedLoadsPerTruck) || 1;
  const completedLoads = apiOrder.tickets_count || 0;

  return {
    id: apiOrder.order_id,
    orderCode: apiOrder.order_code,
    customerName: apiOrder.customer_name,
    projectName: apiOrder.project_name || '',
    deliveryAddress: apiOrder.delivery_address,
    scheduledDate: apiOrder.order_date,
    scheduledTime: apiOrder.start_time,
    status: mapOrderStatus(apiOrder.status),
    productType: productCode,
    quantity: apiOrder.ordered_qty,
    unit: 'CY',
    deliveredQuantity: apiOrder.delivered_qty,
    remainingQuantity: apiOrder.remaining_qty,
    totalLoads,
    completedLoads,
    progress,
    estimatedFinishTime: apiOrder.estimated_finish_time,
    hasAlert: apiOrder.has_notes,
    weather: apiOrder.weather_data ? {
      condition: mapWeatherCondition(apiOrder.weather_data.weather_condition),
      temperature: apiOrder.weather_data.temperature_fahrenheit,
      temperatureUnit: 'F',
      description: apiOrder.weather_data.weather_description,
      humidity: apiOrder.weather_data.humidity,
      windSpeed: apiOrder.weather_data.wind_speed,
      evaporationRate: apiOrder.weather_data.evaporation_rate,
    } : undefined,
    canChat: apiOrder.can_chat,
    product_description: apiOrder.product_description || '',
    createdAt: apiOrder.order_date,
    updatedAt: apiOrder.order_date,
  };
};

export const TodayOrdersScreen: React.FC = () => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const themeColors = isDark ? colors.dark : colors.light;
  const { getOrCreateRoom } = useChatRooms();
  const { showAlert } = useGlobalAlert();

  const [chatLoadingOrderId, setChatLoadingOrderId] = useState<string | null>(null);
  const [favoriteOrderIds, setFavoriteOrderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const {
    orders: apiOrders,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrders({
    date_filter: 'today',
    limit: 10,
    status: 'In Progress',
    sort_by: 'order_date',
    sort_order: 'desc',
  });

  // Map API orders to Order type for OrderCard
  const mappedOrders = useMemo(() => {
    return apiOrders.map(mapApiOrderToOrder);
  }, [apiOrders]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return mappedOrders;

    const query = searchQuery.toLowerCase().trim();
    return mappedOrders.filter((order) => {
      return (
        order.orderCode.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.deliveryAddress.toLowerCase().includes(query) ||
        order.projectName?.toLowerCase().includes(query) ||
        order.productType?.toLowerCase().includes(query)
      );
    });
  }, [mappedOrders, searchQuery]);

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

  // Format quantity with smart decimal display
  const fmtQty = (qty: number) => qty % 1 === 0 ? qty.toString() : qty.toFixed(1);

  const handleOrderPress = useCallback((order: Order) => {
    navigation.navigate('Tracking', {
      orderId: order.id,
    });
  }, [navigation]);

  const handleOrderDetails = useCallback((order: Order) => {
    navigation.navigate('OrderDetail', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
      status: order.status,
    });
  }, [navigation]);

  const handleTicket = useCallback((order: Order) => {
    navigation.navigate('Ticket', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
    });
  }, [navigation]);

  const handleWeatherPress = useCallback((order: Order) => {
    navigation.navigate('Weather', {
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
      orderStatus: order.status,
      startTime: order.scheduledTime,
    });
  }, [navigation]);

  const handleToggleFavorite = useCallback((orderId: string) => {
    setFavoriteOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const handleChat = useCallback(async (order: Order) => {
    setChatLoadingOrderId(order.id);
    try {
      const orderId = parseInt(order.id, 10);
      if (isNaN(orderId)) {
        throw new Error('Invalid order ID');
      }

      const room = await getOrCreateRoom(orderId);

      navigation.navigate('ChatRoom', {
        roomId: room.id,
        roomName: `Order #${order.orderCode}`,
        chatId: room.id ? Number(room.id) : orderId,
        orderId: orderId,
      });
    } catch (err) {
      console.error('Failed to open chat:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to open chat';
      showAlert({
        type: 'error',
        title: 'Chat Error',
        message: errorMessage,
        duration: 4000,
      });
    } finally {
      setChatLoadingOrderId(null);
    }
  }, [getOrCreateRoom, navigation, showAlert]);

  const renderOrderCard = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        showDetails={true}
        onPress={() => handleOrderPress(item)}
        onOrderDetails={() => handleOrderDetails(item)}
        onTicket={() => handleTicket(item)}
        onWeatherPress={() => handleWeatherPress(item)}
        onChat={() => handleChat(item)}
        onFavoritePress={() => handleToggleFavorite(item.id)}
        isChatLoading={chatLoadingOrderId === item.id}
        isFavorite={favoriteOrderIds.has(item.id)}
      />
    ),
    [handleOrderPress, handleOrderDetails, handleTicket, handleWeatherPress, handleChat, handleToggleFavorite, chatLoadingOrderId, favoriteOrderIds]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Summary Stats Card */}
      {apiOrders.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : themeColors.card }]}>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: themeColors.text.primary }]}>
                {fmtQty(summaryStats.totalOrdered)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: themeColors.text.hint }]}>Ordered</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.success.main }]}>
                {fmtQty(summaryStats.totalDelivered)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: themeColors.text.hint }]}>Delivered</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.warning.main }]}>
                {fmtQty(summaryStats.totalRemaining)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: themeColors.text.hint }]}>Left</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.primary.main }]}>
                {summaryStats.avgProgress}%
              </Text>
              <Text style={[styles.summaryStatLabel, { color: themeColors.text.hint }]}>Progress</Text>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={[styles.summaryProgressBar, { backgroundColor: isDark ? 'rgba(107,177,48,0.15)' : 'rgba(107,177,48,0.1)' }]}>
            <View style={[styles.summaryProgressFill, { width: `${summaryStats.avgProgress}%`, backgroundColor: colors.primary.main }]} />
          </View>
        </View>
      )}

      {/* Orders Count */}
      <View style={styles.ordersCountRow}>
        <Text style={[styles.ordersCountText, { color: themeColors.text.secondary }]}>
          {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
          {searchQuery.trim() && ` (filtered from ${apiOrders.length})`}
        </Text>
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <Text variant="h2">Today's Orders</Text>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
          </TouchableOpacity>
        </View>
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

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>

        <Text variant="h2">Today's Orders</Text>

        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[
        styles.searchContainer,
        {
          backgroundColor: isDark ? themeColors.card : colors.common.white,
          borderBottomColor: isDark ? themeColors.border : colors.grey[10],
        }
      ]}>
        <View style={[
          styles.searchInputWrapper,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.grey[5],
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.grey[15],
          }
        ]}>
          <Icon name="magnify" size={ms(20)} color={colors.primary.main} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text.primary }]}
            placeholder="Search orders..."
            placeholderTextColor={themeColors.text.hint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClearButton}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Icon name="close-circle" size={ms(20)} color={themeColors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.loadingWrap, { backgroundColor: themeColors.background }]}>
          <TruckLoader size={80} message="Loading..." color={isDark ? 'light' : 'dark'} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            filteredOrders.length > 0 && isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary.main} />
              </View>
            ) : null
          }
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
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header Bar (like OrderListScreen)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    paddingHorizontal: ms(14),
    height: ms(44),
    gap: ms(10),
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: ms(15),
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
    height: '100%',
  },
  searchClearButton: {
    padding: ms(4),
  },

  // Header Container (FlatList header)
  headerContainer: {
    paddingBottom: spacing.sm,
  },

  // Summary Card - Compact Stats
  summaryCard: {
    borderRadius: ms(10),
    padding: ms(10),
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: ms(16),
    fontFamily: fontFamily.bold,
  },
  summaryStatLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: ms(2),
  },
  summaryStatDivider: {
    width: 1,
    height: ms(28),
    opacity: 0.2,
  },
  summaryProgressBar: {
    height: ms(3),
    borderRadius: ms(1.5),
    marginTop: ms(10),
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    borderRadius: ms(1.5),
  },

  // Orders Count
  ordersCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ordersCountText: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },

  // List
  listContent: { paddingHorizontal: spacing.lg },
  separator: { height: spacing.sm },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
