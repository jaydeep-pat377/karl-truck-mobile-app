/**
 * TodayOrdersScreen
 * Shows only in-progress orders for today
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader, EmptyViewWithPreset } from '../../components/common';
import { OrderCard } from '../../components/orders';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms } from '../../utils/responsive';
import { useOrders } from '../../hooks';
import { ApiOrder, Order } from '../../types/order';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Map API order to UI Order type
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
    } : undefined,
    createdAt: apiOrder.order_date,
    updatedAt: apiOrder.order_date,
  };
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
    'hold': 'HOLD',
  };
  return statusMap[status.toLowerCase()] || 'NORMAL';
};

const mapWeatherCondition = (condition: string): string => {
  const conditionLower = condition?.toLowerCase() || '';
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return 'rainy';
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) return 'stormy';
  if (conditionLower.includes('snow')) return 'snowy';
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) return 'fog';
  if (conditionLower.includes('cloud') && conditionLower.includes('partly')) return 'partly_cloudy';
  if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) return 'cloudy';
  return 'sunny';
};

export const TodayOrdersScreen: React.FC = () => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const themeColors = isDark ? colors.dark : colors.light;

  // Fetch only today's in-progress orders
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
    status: 'in progress',
    limit: 20,
    sort_by: 'order_date',
    sort_order: 'desc',
  });

  // Map API orders to UI Order type
  const orders = useMemo(() => {
    return apiOrders.map(mapApiOrderToOrder);
  }, [apiOrders]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const handleOrderPress = useCallback((order: Order) => {
    navigation.navigate('OrderDetail', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
      status: order.status,
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
    navigation.navigate('TicketsByOrder', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
    });
  }, [navigation]);

  const renderOrderCard = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        showDetails={true}
        onPress={() => handleOrderPress(item)}
        onOrderDetails={() => handleOrderDetails(item)}
        onTicket={() => handleTicket(item)}
      />
    ),
    [handleOrderPress, handleOrderDetails, handleTicket]
  );

  const renderListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text variant="caption" style={{ color: themeColors.text.secondary, marginLeft: spacing.sm }}>
          Loading more...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, themeColors.text.secondary]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTitleRow}>
        <View style={styles.headerIconContainer}>
          <Icon name="clock-fast" size={ms(24)} color={colors.primary.main} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text variant="h3" style={[styles.headerTitle, { color: themeColors.text.primary }]}>
            In Progress Today
          </Text>
          <Text variant="caption" style={{ color: themeColors.text.secondary }}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} in progress
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyComponent = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Icon name="clipboard-check-outline" size={ms(64)} color={themeColors.text.hint} />
        <Text variant="h4" style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
          No Orders In Progress
        </Text>
        <Text variant="body" style={[styles.emptySubtitle, { color: themeColors.text.secondary }]}>
          There are no in-progress orders for today.
        </Text>
      </View>
    );
  };

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
        <StatusBar
          backgroundColor="transparent"
          barStyle={isDark ? 'light-content' : 'dark-content'}
          translucent
        />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={ms(48)} color={colors.error.main} />
          <Text variant="body" style={[styles.errorText, { color: themeColors.text.primary }]}>
            {error || 'Failed to load orders'}
          </Text>
          <Text
            variant="bodySmall"
            style={[styles.retryText, { color: colors.primary.main }]}
            onPress={handleRefresh}
          >
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <StatusBar
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <TruckLoader size={100} message="Loading orders..." />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl },
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: colors.primary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    marginBottom: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  separator: {
    height: spacing.sm,
  },
  listFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryText: {
    marginTop: spacing.md,
    fontFamily: fontFamily.semiBold,
  },
});

export default TodayOrdersScreen;
