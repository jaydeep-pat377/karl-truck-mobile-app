
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Keyboard,
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
import { orderService } from '../../api/services/orderService';
import { ApiOrder, WeatherCondition } from '../../types/order';
import { Order } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { getProgressBarColor } from '../../utils/statusUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

const mapApiOrderToOrder = (apiOrder: ApiOrder): Order => {
  const progress = apiOrder.ordered_qty > 0
    ? Math.round((apiOrder.delivered_qty / apiOrder.ordered_qty) * 100)
    : 0;

  const productCode = apiOrder.product_codes || 'N/A';
  const totalLoads = apiOrder.total_loads || 0;
  const completedLoads = apiOrder.active_tickets || 0;

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
    jobLatitude: apiOrder.order_location?.latitude,
    jobLongitude: apiOrder.order_location?.longitude,
    plantDetails: apiOrder.plant_details ? {
      code: apiOrder.plant_details.code,
      name: apiOrder.plant_details.description,
      shortName: apiOrder.plant_details.short_description,
      address: `${apiOrder.plant_details.address1}, ${apiOrder.plant_details.address2}`,
      phone: apiOrder.plant_details.phone,
      latitude: apiOrder.plant_details.latitude,
      longitude: apiOrder.plant_details.longitude,
    } : undefined,
    weather: apiOrder.weather_data ? {
      condition: mapWeatherCondition(apiOrder.weather_data.weather_condition),
      temperature: apiOrder.weather_data.temperature_fahrenheit,
      temperatureUnit: 'F',
      description: 'Partly cloudy',
      humidity: apiOrder.weather_data.humidity,
      windSpeed: apiOrder.weather_data.wind_speed_mph,
      evaporationRate: apiOrder.weather_data.evaporation_rate,
    } : undefined,
    canChat: apiOrder.can_chat,
    canTicketed: apiOrder.can_ticketed,
    isFavorite: apiOrder.is_favourite ?? false,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(keyboardShowEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
    pagination,
  } = useOrders({
    date_filter: 'today',
    limit: 10,
    status: 'In Progress',
    sort_by: 'order_date',
    sort_order: 'desc',
  });

  const wasRefetchingRef = useRef(false);

  useEffect(() => {
    if (wasRefetchingRef.current && !isRefetching) {

      setFavoriteOverrides({});
    }
    wasRefetchingRef.current = isRefetching;
  }, [isRefetching]);

  const mappedOrders = useMemo(() => {
    return apiOrders.map(order => {
      const mapped = mapApiOrderToOrder(order);

      if (favoriteOverrides[mapped.id] !== undefined) {
        return { ...mapped, isFavorite: favoriteOverrides[mapped.id] };
      }
      return mapped;
    });
  }, [apiOrders, favoriteOverrides]);

  const filteredOrders = useMemo(() => {
    if (!activeSearchQuery.trim()) return mappedOrders;

    const query = activeSearchQuery.toLowerCase().trim();
    return mappedOrders.filter((order) => {
      return (
        order.orderCode.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.deliveryAddress.toLowerCase().includes(query) ||
        order.projectName?.toLowerCase().includes(query) ||
        order.productType?.toLowerCase().includes(query)
      );
    });
  }, [mappedOrders, activeSearchQuery]);

  const handleSearch = useCallback(() => {
    setActiveSearchQuery(searchQuery.trim());
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveSearchQuery('');
    refetch();
  }, [refetch]);

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

  const fmtQty = (qty: number) => qty % 1 === 0 ? qty.toString() : qty.toFixed(1);

  const handleOrderPress = useCallback((order: Order) => {
    navigation.navigate('Tracking', {
      orderId: order.id,
    });
  }, [navigation]);

  const handleOrderDetails = useCallback((order: Order) => {
    const progressColor = getProgressBarColor(order.status, order.progress || 0);
    navigation.navigate('OrderDetail', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
      status: order.status,
      progressColor: progressColor,
      sourceTab: 'Today',
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

  const handleMap = useCallback((order: Order) => {
    navigation.navigate('Tracking', {
      orderId: order.id,
    });
  }, [navigation]);

  const handleToggleFavorite = useCallback((orderId: string) => {

    const hasOverride = favoriteOverrides[orderId] !== undefined;
    const apiOrder = apiOrders.find(o => o.order_id === orderId);
    const currentFavorite = hasOverride ? favoriteOverrides[orderId] : (apiOrder?.is_favourite ?? false);
    const newFavorite = !currentFavorite;

    setFavoriteOverrides(prev => ({ ...prev, [orderId]: newFavorite }));

    orderService.toggleFavourite(orderId)
      .catch((error) => {
        console.error('Failed to toggle favorite:', error);

        setFavoriteOverrides(prev => ({ ...prev, [orderId]: currentFavorite }));
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Failed to update favorite status',
        });
      });
  }, [apiOrders, favoriteOverrides, showAlert]);

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
        orderDate: order.scheduledDate,
        customerName: order.customerName,
        projectName: order.projectName,
        deliveryAddress: order.deliveryAddress,
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
        onMap={() => handleMap(item)}
        onChat={() => handleChat(item)}
        onFavoritePress={() => handleToggleFavorite(item.id)}
        isChatLoading={chatLoadingOrderId === item.id}
        isFavorite={item.isFavorite}
      />
    ),
    [handleOrderPress, handleOrderDetails, handleTicket, handleWeatherPress, handleMap, handleChat, handleToggleFavorite, chatLoadingOrderId]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>

      {apiOrders.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.cardElevated : themeColors.card }]}>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.secondary.main }]}>
                {fmtQty(summaryStats.totalOrdered)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.secondary.main }]}>Ordered</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.success.main }]}>
                {fmtQty(summaryStats.totalDelivered)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.success.main }]}>Delivered</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.warning.main }]}>
                {fmtQty(summaryStats.totalRemaining)}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.warning.main }]}>Left</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.primary.main }]}>
                {summaryStats.avgProgress}%
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.primary.main }]}>Progress</Text>
            </View>
          </View>

          <View style={[styles.summaryProgressBar, { backgroundColor: isDark ? colors.semiTransparent.green15 : colors.semiTransparent.green10 }]}>
            <View style={[styles.summaryProgressFill, { width: `${summaryStats.avgProgress}%`, backgroundColor: colors.primary.main }]} />
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.semiTransparent.green10 : colors.semiTransparent.green08 }]}>
          <Icon name="clipboard-check-outline" size={ms(40)} color={colors.primary.main} />
        </View>
        <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>No Active Orders</Text>
        <Text style={[styles.emptySub, { color: themeColors.text.secondary }]}>No in-progress orders for today.</Text>
      </View>
    );
  };

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'bottom']}>
        <StatusBar backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <Text variant="h2">Today's In Progress</Text>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 }]}
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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>

        <Text variant="h2">Today's In Progress</Text>

        <TouchableOpacity
          style={[styles.headerIcon, { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {!isLoading && (
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}>
            <TextInput
              style={[styles.searchInput, { color: themeColors.text.primary }]}
              placeholder="Search by Order Code, Customer, Address..."
              placeholderTextColor={themeColors.text.hint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={handleClearSearch}
                activeOpacity={0.7}
                style={styles.searchClearBtn}
              >
                <Icon name="close-circle" size={ms(18)} color={themeColors.text.secondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.searchIconBtn, { backgroundColor: colors.primary.main }]}
              onPress={handleSearch}
            >
              <Icon name="magnify" size={ms(18)} color={colors.common.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={[styles.loadingWrap, { backgroundColor: themeColors.background }]}>
          <TruckLoader size={120} message="Loading orders..." color={isDark ? 'light' : 'dark'} />
        </View>
      ) : (
        <>
          <View style={styles.staticOrdersCountRow}>
            <Text style={[styles.ordersCountText, { color: themeColors.text.secondary }]}>
              {filteredOrders.length} out of {pagination?.total ?? filteredOrders.length} orders displaying
            </Text>
          </View>
          <FlatList
          data={filteredOrders}
          extraData={filteredOrders}
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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + ms(100) + keyboardHeight }
          ]}
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: ms(12),
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: ms(13),
    fontFamily: fontFamily.regular,
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
  },
  searchClearBtn: {
    padding: ms(4),
  },
  searchIconBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ms(4),
  },

  headerContainer: {
    paddingBottom: spacing.sm,
  },

  summaryCard: {
    borderRadius: ms(10),
    padding: ms(10),
    marginBottom: spacing.sm,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary.main,
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

  ordersCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staticOrdersCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  ordersCountText: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },

  listContent: { paddingHorizontal: spacing.lg },
  separator: { height: spacing.sm },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: ms(60), paddingHorizontal: ms(20) },
  emptyIcon: { width: ms(70), height: ms(70), borderRadius: ms(35), justifyContent: 'center', alignItems: 'center', marginBottom: ms(12) },
  emptyTitle: { fontSize: ms(15), fontFamily: fontFamily.semiBold, marginBottom: ms(4) },
  emptySub: { fontSize: ms(12), fontFamily: fontFamily.regular, textAlign: 'center' },

  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: ms(20) },
  errorTxt: { fontSize: ms(13), fontFamily: fontFamily.regular, textAlign: 'center', marginTop: ms(10) },
  retryTxt: { fontSize: ms(12), fontFamily: fontFamily.semiBold, marginTop: ms(10) },
});

export default TodayOrdersScreen;
