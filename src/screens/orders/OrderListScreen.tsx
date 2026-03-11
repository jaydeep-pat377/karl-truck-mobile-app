import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Modal,
  Animated,
  Pressable,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList, OrdersStackParamList, OrderTabFilter } from '../../navigation/types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, ListFooterLoader, TruckLoader, Icon } from '../../components/common';
import { OrderCard } from '../../components/orders';
import { OrderStatusTabs } from '../../components/dashboard';
import type { OrderStatusFilter, OrderStatusCount } from '../../components/dashboard';
import { Order, ApiOrder, OrdersQueryParams, WeatherCondition, TicketTrackingStatus } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms, iconSizes, wp, hp } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useOrders, useChatRooms, useGlobalAlert } from '../../hooks';
import { orderService } from '../../api/services/orderService';
import { getProgressBarColor } from '../../utils/statusUtils';

const dateFilters = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'nextWeek', label: 'Next Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'calendar', label: '', isIcon: true },
] as const;

type DateFilterId = typeof dateFilters[number]['id'] | null;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const statusFilters = [
  { id: 'all', label: 'All', icon: 'format-list-bulleted' },
  { id: 'Normal', label: 'Normal', icon: 'checkbox-marked-circle-outline' },
  { id: 'In Progress', label: 'In Progress', icon: 'progress-clock' },
  { id: 'Completed', label: 'Completed', icon: 'check-circle-outline' },
  { id: 'Will Call', label: 'Will Call', icon: 'phone-outline' },
  { id: 'Weather Permitting', label: 'Weather Permitting', icon: 'weather-partly-cloudy' },
  { id: 'Hold Delivery', label: 'Hold', icon: 'pause-circle-outline' },
  { id: 'Wait List', label: 'Wait List', icon: 'clock-outline' },
  { id: 'Canceled', label: 'Canceled', icon: 'close-circle-outline' },
] as const;

type StatusFilterId = typeof statusFilters[number]['id'];

const sortOptions = [
  { id: 'date_asc', label: 'Date (Oldest First)', icon: 'sort-calendar-ascending' },
  { id: 'date_desc', label: 'Date (Newest First)', icon: 'sort-calendar-descending' },
  { id: 'order_qty_high', label: 'Order Qty (High to Low)', icon: 'sort-descending' },
  { id: 'order_qty_low', label: 'Order Qty (Low to High)', icon: 'sort-ascending' },
  { id: 'deliver_qty_high', label: 'Deliver Qty (High to Low)', icon: 'sort-descending' },
  { id: 'deliver_qty_low', label: 'Deliver Qty (Low to High)', icon: 'sort-ascending' },
] as const;

type SortOptionId = typeof sortOptions[number]['id'];

const productTypes = [
  { id: 'all', label: 'All Products' },
  { id: 'mix_3000', label: 'Concrete Mix 3000' },
  { id: 'mix_3500', label: 'Concrete Mix 3500' },
  { id: 'mix_4000', label: 'Concrete Mix 4000' },
  { id: 'mix_4500', label: 'Concrete Mix 4500' },
  { id: 'mix_5000', label: 'Concrete Mix 5000' },
] as const;

type ProductTypeId = typeof productTypes[number]['id'];

interface FilterState {
  statuses: StatusFilterId[];
  sortBy: SortOptionId;
  productType: ProductTypeId;
  hasAlertOnly: boolean;
}

const defaultFilterState: FilterState = {
  statuses: ['all'],
  sortBy: 'date_desc',
  productType: 'all',
  hasAlertOnly: false,
};

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
      description: apiOrder.weather_data.weather_description,
      humidity: apiOrder.weather_data.humidity,
      windSpeed: apiOrder.weather_data.wind_speed_mph,
      evaporationRate: apiOrder.weather_data.evaporation_rate,
    } : undefined,
    canChat: apiOrder.can_chat,
    canTicketed: apiOrder.can_ticketed,
    isFavorite: apiOrder.is_favourite ?? false,
    product_description: apiOrder.product_description || '',
    recentTicketStatus: apiOrder.recent_ticket?.status as TicketTrackingStatus | undefined,
    deliveryProgress: apiOrder.delivery_progress,
    createdAt: apiOrder.order_date,
    updatedAt: apiOrder.order_date,
  };
};

const getApiDateFilter = (filter: DateFilterId, selectedDate: Date): OrdersQueryParams['date_filter'] => {
  switch (filter) {
    case 'today':
      return 'today';
    case 'yesterday':
      return 'yesterday';
    case 'tomorrow':
      return 'tomorrow';
    case 'nextWeek':
      return 'next_week';
    case 'lastWeek':
      return 'last_week';
    case 'calendar':
      return 'custom';
    default:
      return 'today';
  }
};

const OrderCardSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const shimmerColor = isDark ? colors.dark.cardElevated : colors.grey[5];

  return (
    <Card padding="md" style={styles.skeletonCard}>
      <View style={[styles.skeletonBadge, { backgroundColor: shimmerColor }]} />
      <View style={[styles.skeletonLine, { width: '60%', backgroundColor: shimmerColor }]} />
      <View style={[styles.skeletonLine, { width: '80%', backgroundColor: shimmerColor }]} />
      <View style={[styles.skeletonLine, { width: '40%', backgroundColor: shimmerColor }]} />
      <View style={[styles.skeletonProgress, { backgroundColor: shimmerColor }]} />
    </Card>
  );
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  isDark: boolean;
}

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  isDark: boolean;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onDateSelect,
  isDark,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const themeColors = isDark ? colors.dark : colors.light;

  const [tempDate, setTempDate] = useState<Date>(selectedDate);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
  };

  React.useEffect(() => {
    if (visible) {
      setTempDate(selectedDate);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, selectedDate, scaleAnim, opacityAnim, backdropAnim]);

  const handleConfirm = () => {
    onDateSelect(tempDate);
    onClose();
  };

  const handleCancel = () => {
    setTempDate(selectedDate);
    onClose();
  };

  const formatDisplayDate = (date: Date): string => {
    const isToday = isSameDay(date, today);
    const isTomorrow = isSameDay(date, tomorrow);

    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const year = date.getFullYear();

    if (isToday) return `Today, ${weekday} - ${monthDay}, ${year}`;
    if (isTomorrow) return `Tomorrow, ${weekday} - ${monthDay}, ${year}`;
    return `${weekday} - ${monthDay}, ${year}`;
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleCancel} statusBarTranslucent>
      <View style={styles.centeredModalContainer}>

        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              opacity: backdropAnim,
            },
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        </Animated.View>

        <Animated.View
          style={[
            styles.centeredDatePickerContent,
            {
              backgroundColor: themeColors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}>
          <View style={[styles.datePickerModalHeader, { borderBottomColor: 'transparent' }]}>
            <View style={styles.modalTitleRow}>
              <View style={[styles.modalIconContainer, { backgroundColor: colors.primary.main }]}>
                <Icon name="calendar-month" size={ms(20)} color={colors.common.white} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                  Select Date
                </Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.text.secondary }]}>
                  Pick a date to filter orders
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDark ? colors.grey[60] + '30' : colors.grey[5] }]}
              onPress={handleCancel}
              activeOpacity={0.7}>
              <Icon name="close" size={ms(20)} color={isDark ? colors.grey[40] : colors.grey[60]} />
            </TouchableOpacity>
          </View>

          <View style={[
            styles.selectedDateDisplay,
            {
              backgroundColor: isDark ? colors.primary.main + '15' : colors.primary.main + '10',
              borderColor: colors.primary.main + '30',
            }
          ]}>
            <View style={styles.selectedDateIconWrapper}>
              <Icon name="calendar-check" size={ms(20)} color={colors.primary.main} />
            </View>
            <View style={styles.selectedDateTextWrapper}>
              <Text style={[styles.selectedDateLabel, { color: themeColors.text.secondary }]}>
                Selected Date
              </Text>
              <Text style={[styles.selectedDateText, { color: themeColors.text.primary }]}>
                {formatDisplayDate(tempDate)}
              </Text>
            </View>
          </View>

          <View style={[
            styles.datePickerWrapper,
            { backgroundColor: isDark ? colors.grey[60] + '10' : colors.grey[3] }
          ]}>
            <Calendar
              current={tempDate.toISOString().split('T')[0]}
              onDayPress={(day) => {
                setTempDate(new Date(day.dateString));
              }}
              markedDates={{
                [today.toISOString().split('T')[0]]: {
                  marked: !isSameDay(tempDate, today),
                  dotColor: colors.primary.main,
                },
                [tempDate.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: colors.primary.main,
                  selectedTextColor: colors.common.white,
                },
              }}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: themeColors.text.secondary,
                selectedDayBackgroundColor: colors.primary.main,
                selectedDayTextColor: colors.common.white,
                todayTextColor: colors.primary.main,
                todayBackgroundColor: colors.primary.main + '15',
                dayTextColor: themeColors.text.primary,
                textDisabledColor: isDark ? colors.grey[60] : colors.grey[25],
                arrowColor: colors.primary.main,
                monthTextColor: themeColors.text.primary,
                textDayFontFamily: fontFamily.medium,
                textMonthFontFamily: fontFamily.bold,
                textDayHeaderFontFamily: fontFamily.semiBold,
                textDayFontSize: ms(15),
                textMonthFontSize: ms(17),
                textDayHeaderFontSize: ms(12),
              }}
              style={styles.calendar}
              enableSwipeMonths={true}
            />
          </View>

          <View style={[
            styles.datePickerModalActions,
            {
              borderTopColor: isDark ? colors.grey[60] + '30' : colors.grey[10],
              backgroundColor: themeColors.surface,
            }
          ]}>
            <TouchableOpacity
              style={[styles.applyButton, { flex: 1 }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <View style={styles.applyButtonIconWrapper}>
                <Icon name="calendar-check" size={ms(20)} color={colors.common.white} />
              </View>
              <Text style={styles.applyButtonText} numberOfLines={1}>
                Apply Date
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const statusColorMap: Record<string, string> = {
  all: colors.primary.main,
  'Normal': colors.success.main,
  'In Progress': colors.success.main,
  'Completed': colors.success.main,
  'Will Call': colors.warning.main,
  'Weather Permitting': colors.info.main,
  'Hold Delivery': colors.error.main,
  'Wait List': colors.grey[50],
  'Canceled': colors.error.main,
};

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  isDark,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const themeColors = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, filters, slideAnim, backdropAnim, scaleAnim]);

  const handleStatusToggle = (statusId: StatusFilterId) => {
    setLocalFilters(prev => {
      if (statusId === 'all') {
        return { ...prev, statuses: ['all'] };
      }

      let newStatuses = prev.statuses.filter(s => s !== 'all');

      if (newStatuses.includes(statusId)) {
        newStatuses = newStatuses.filter(s => s !== statusId);
      } else {
        newStatuses.push(statusId);
      }
      if (newStatuses.length === 0) {
        newStatuses = ['all'];
      }

      return { ...prev, statuses: newStatuses };
    });
  };

  const handleSortChange = (sortId: SortOptionId) => {
    setLocalFilters(prev => ({ ...prev, sortBy: sortId }));
  };

  const handleProductTypeChange = (productId: ProductTypeId) => {
    setLocalFilters(prev => ({ ...prev, productType: productId }));
  };

  const handleAlertToggle = () => {
    setLocalFilters(prev => ({ ...prev, hasAlertOnly: !prev.hasAlertOnly }));
  };

  const handleReset = () => {
    setLocalFilters(defaultFilterState);
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (!localFilters.statuses.includes('all')) count += localFilters.statuses.length;
    if (localFilters.sortBy !== 'date_desc') count += 1;
    if (localFilters.productType !== 'all') count += 1;
    if (localFilters.hasAlertOnly) count += 1;
    return count;
  };

  if (!visible) return null;

  const activeCount = getActiveFilterCount();

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              opacity: backdropAnim,
            },
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: themeColors.surface,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}>
          <View style={styles.modalHandleContainer}>
            <View style={[styles.modalHandle, { backgroundColor: isDark ? colors.grey[60] : colors.grey[25] }]} />
          </View>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? colors.grey[60] + '30' : colors.grey[10] }]}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconContainer}>
                <Icon name="tune-vertical" size={ms(20)} color={colors.common.white} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                  Filter & Sort
                </Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.text.secondary }]}>
                  Customize your order list
                </Text>
              </View>
            </View>
            <View style={styles.modalHeaderRight}>
              {activeCount > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{activeCount}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDark ? colors.grey[60] + '30' : colors.grey[5] }]}
                onPress={onClose}
                activeOpacity={0.7}>
                <Icon name="close" size={ms(20)} color={isDark ? colors.grey[40] : colors.grey[60]} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.info.main + '15' }]}>
                  <Icon name="list-status" size={ms(16)} color={colors.info.main} />
                </View>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  Order Status
                </Text>
              </View>
              <View style={styles.filterChipsContainer}>
                {statusFilters.map((status) => {
                  const isActive = localFilters.statuses.includes(status.id);
                  const statusColor = statusColorMap[status.id] || colors.primary.main;
                  return (
                    <TouchableOpacity
                      key={status.id}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: isActive ? statusColor : isDark ? colors.grey[60] + '20' : colors.grey[5],
                          borderColor: isActive ? statusColor : isDark ? colors.grey[60] + '40' : colors.grey[15],
                        },
                      ]}
                      onPress={() => handleStatusToggle(status.id)}
                      activeOpacity={0.7}
                    >
                      <Icon
                        name={status.icon}
                        size={ms(14)}
                        color={isActive ? colors.common.white : statusColor}
                      />
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: isActive ? colors.common.white : themeColors.text.primary,
                            fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
                          },
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.secondary.main + '15' }]}>
                  <Icon name="sort" size={ms(16)} color={colors.secondary.main} />
                </View>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  Sort By
                </Text>
              </View>
              <View style={[
                styles.sortOptionsContainer,
                {
                  backgroundColor: isDark ? colors.grey[60] + '15' : colors.grey[3],
                  borderColor: isDark ? colors.grey[60] + '30' : colors.grey[10],
                }
              ]}>
                {sortOptions.map((option, index) => {
                  const isActive = localFilters.sortBy === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.sortOption,
                        index < sortOptions.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: isDark ? colors.grey[60] + '20' : colors.grey[10],
                        },
                      ]}
                      onPress={() => handleSortChange(option.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[
                          styles.sortIconContainer,
                          { backgroundColor: isActive ? colors.primary.main + '15' : 'transparent' }
                        ]}>
                          <Icon
                            name={option.icon}
                            size={ms(18)}
                            color={isActive ? colors.primary.main : (isDark ? colors.grey[40] : colors.grey[60])}
                          />
                        </View>
                        <Text
                          style={[
                            styles.sortOptionText,
                            {
                              color: isActive ? colors.primary.main : themeColors.text.primary,
                              fontFamily: isActive ? fontFamily.semiBold : fontFamily.regular,
                            },
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>
                      <View style={[
                        styles.radioButton,
                        {
                          borderColor: isActive ? colors.primary.main : themeColors.border,
                          backgroundColor: isActive ? colors.primary.main : 'transparent',
                        }
                      ]}>
                        {isActive && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ height: spacing.lg }} />
          </ScrollView>

          <View style={[
            styles.modalActions,
            {
              borderTopColor: isDark ? colors.grey[60] + '30' : colors.grey[10],
              backgroundColor: themeColors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.md),
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.resetButton,
                {
                  borderColor: isDark ? colors.grey[60] + '40' : colors.grey[25],
                  backgroundColor: isDark ? colors.grey[60] + '15' : colors.grey[5],
                }
              ]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Icon name="restore" size={ms(18)} color={isDark ? colors.grey[40] : colors.grey[60]} />
              <Text style={[styles.resetButtonText, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                Reset All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Icon name="check-circle" size={ms(18)} color={colors.common.white} />
              <Text style={styles.applyButtonText}>
                Apply {activeCount > 0 ? `(${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const OrderListScreen: React.FC = () => {
  const navigation = useNavigation<CompositeNavigationProp<
    NativeStackNavigationProp<OrdersStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >>();
  const route = useRoute<RouteProp<OrdersStackParamList, 'OrderList'>>();
  const { isDark } = useTheme();
  const { getOrCreateRoom } = useChatRooms();
  const { showAlert } = useGlobalAlert();


  const [parentTabParams, setParentTabParams] = useState<typeof route.params | undefined>(undefined);


  useFocusEffect(
    useCallback(() => {
      const parentRoute = navigation.getParent()?.getState()?.routes?.find(r => r.name === 'Orders');
      const parentParams = parentRoute?.params as typeof route.params | undefined;
      if (parentParams?._timestamp && parentParams._timestamp !== parentTabParams?._timestamp) {
        setParentTabParams(parentParams);
      }
    }, [navigation, parentTabParams?._timestamp])
  );


  const effectiveParams = { ...parentTabParams, ...route.params };

  const statusFilterFromRoute = effectiveParams?.statusFilter;
  const filterTimestamp = effectiveParams?._timestamp;
  const companyNameFromRoute = effectiveParams?.company_name;
  const regionNameFromRoute = effectiveParams?.region_name;
  const plantCodeFromRoute = effectiveParams?.plant_code;
  const plantNameFromRoute = effectiveParams?.plant_name;
  const dateFilterFromRoute = effectiveParams?.date_filter;
  const selectedDateFromRoute = effectiveParams?.selected_date;
  const isFavouriteFromRoute = effectiveParams?.is_favourite;
  const tabFromRoute = effectiveParams?.tab;

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DateFilterId>('today');
  const [debouncedFilter, setDebouncedFilter] = useState<DateFilterId>('today');
    const [showDatePicker, setShowDatePicker] = useState(false);
  const [chatLoadingOrderId, setChatLoadingOrderId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [debouncedDate, setDebouncedDate] = useState<Date>(new Date());

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilterState);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});


  const [dashboardFilter, setDashboardFilter] = useState<{
    company_name?: string;
    region_name?: string;
    plant_code?: string;
    plant_name?: string;
  }>({});


  const [isFavouriteFilter, setIsFavouriteFilter] = useState<boolean>(false);


  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isDateFilterLoading, setIsDateFilterLoading] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(activeFilter);
      setDebouncedDate(selectedDate);
    }, 300);

    return () => clearTimeout(timer);
  }, [activeFilter, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      if (statusFilterFromRoute) {
        const statusMap: Record<string, StatusFilterId> = {
          'Will Call': 'Will Call',
          'Hold Delivery': 'Hold Delivery',
          'Canceled': 'Canceled',
          'Normal': 'Normal',
          'In Progress': 'In Progress',
          'Completed': 'Completed',
        };
        const mappedStatus = statusMap[statusFilterFromRoute];
        if (mappedStatus) {
          setAppliedFilters(prev => ({
            ...prev,
            statuses: [mappedStatus],
          }));
        }
      }
    }, [statusFilterFromRoute, filterTimestamp])
  );


  useEffect(() => {
    if (filterTimestamp) {

      if (companyNameFromRoute || regionNameFromRoute || plantCodeFromRoute) {
        setDashboardFilter({
          company_name: companyNameFromRoute,
          region_name: regionNameFromRoute,
          plant_code: plantCodeFromRoute,
          plant_name: plantNameFromRoute,
        });
      }


      if (isFavouriteFromRoute !== undefined) {
        setIsFavouriteFilter(isFavouriteFromRoute);
      }


      if (tabFromRoute) {
        setOrderStatusFilter(tabFromRoute);
      }


      if (dateFilterFromRoute) {
        setActiveFilter(dateFilterFromRoute);
        setDebouncedFilter(dateFilterFromRoute);


        if (dateFilterFromRoute === 'calendar' && selectedDateFromRoute) {
          const date = new Date(selectedDateFromRoute);
          setSelectedDate(date);
          setDebouncedDate(date);
        }
      }
    }
  }, [filterTimestamp, companyNameFromRoute, regionNameFromRoute, plantCodeFromRoute, plantNameFromRoute, dateFilterFromRoute, selectedDateFromRoute, isFavouriteFromRoute, tabFromRoute]);

  const filterBarAnim = useRef(new Animated.Value(0)).current;
  const dateFilterScrollRef = useRef<ScrollView>(null);
  const filterChipPositions = useRef<Record<string, { x: number; width: number }>>({});

  const themeColors = isDark ? colors.dark : colors.light;

  const getSortParams = (sortBy: SortOptionId): { sort_by: OrdersQueryParams['sort_by']; sort_order: OrdersQueryParams['sort_order'] } => {
    switch (sortBy) {
      case 'date_asc':
        return { sort_by: 'order_date', sort_order: 'asc' };
      case 'date_desc':
        return { sort_by: 'order_date', sort_order: 'desc' };
      case 'order_qty_high':
        return { sort_by: 'ordered_qty', sort_order: 'desc' };
      case 'order_qty_low':
        return { sort_by: 'ordered_qty', sort_order: 'asc' };
      case 'deliver_qty_high':
        return { sort_by: 'delivered_qty', sort_order: 'desc' };
      case 'deliver_qty_low':
        return { sort_by: 'delivered_qty', sort_order: 'asc' };
      default:
        return { sort_by: 'order_date', sort_order: 'desc' };
    }
  };

  const getApiStatus = (statuses: StatusFilterId[]): string | undefined => {
    if (statuses.includes('all') || statuses.length === 0) {
      return undefined;
    }

    return statuses
      .filter(s => s !== 'all')
      .join(',');
  };

  const queryParams = useMemo((): Omit<OrdersQueryParams, 'page'> => {
    const params: Omit<OrdersQueryParams, 'page'> = {
      date_filter: getApiDateFilter(debouncedFilter, debouncedDate),
      limit: 10,
    };

    if (debouncedFilter === 'calendar') {
      const dateStr = debouncedDate.toISOString().split('T')[0];
      params.start_date = dateStr;
      params.end_date = dateStr;
    }

    if (appliedSearchQuery.trim()) {
      params.search = appliedSearchQuery.trim();
    }

    const apiStatus = getApiStatus(appliedFilters.statuses);
    if (apiStatus) {
      params.status = apiStatus;
    }

    const sortParams = getSortParams(appliedFilters.sortBy);
    params.sort_by = sortParams.sort_by;
    params.sort_order = sortParams.sort_order;


    if (dashboardFilter.company_name) {
      params.company_name = dashboardFilter.company_name;
    }
    if (dashboardFilter.region_name) {
      params.region_name = dashboardFilter.region_name;
    }
    if (dashboardFilter.plant_code) {
      params.plant_code = dashboardFilter.plant_code;
    }
    if (dashboardFilter.plant_name) {
      params.plant_name = dashboardFilter.plant_name;
    }


    if (isFavouriteFilter) {
      params.is_favourite = true;
    }


    if (orderStatusFilter !== 'all') {
      params.tab = orderStatusFilter as 'saved' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'requested';
    }

    return params;
  }, [debouncedFilter, debouncedDate, appliedSearchQuery, appliedFilters.statuses, appliedFilters.sortBy, dashboardFilter, isFavouriteFilter, orderStatusFilter]);

  const {
    orders: apiOrders,
    pagination,
    statusCounts,
    tabCounts,
    isLoading,
    isFilterLoading,
    isRefetching,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrders(queryParams);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!appliedFilters.statuses.includes('all')) count += appliedFilters.statuses.length;
    if (appliedFilters.sortBy !== 'date_desc') count += 1;
    if (appliedFilters.productType !== 'all') count += 1;
    if (appliedFilters.hasAlertOnly) count += 1;
    return count;
  }, [appliedFilters]);



  const orderStatusCounts: OrderStatusCount = useMemo(() => {
    const allCount = (tabCounts?.scheduled || 0) +
                     (tabCounts?.active || 0) +
                     (tabCounts?.completed || 0) +
                     (tabCounts?.cancelled || 0);
    return {
      all: allCount,
      saved: tabCounts?.saved || 0,
      scheduled: tabCounts?.scheduled || 0,
      active: tabCounts?.active || 0,
      completed: tabCounts?.completed || 0,
      cancelled: tabCounts?.cancelled || 0,
      requested: tabCounts?.requested || 0,
    };
  }, [tabCounts]);

  React.useEffect(() => {
    Animated.spring(filterBarAnim, {
      toValue: activeFilterCount > 0 ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  }, [activeFilterCount, filterBarAnim]);

  const wasRefetchingRef = useRef(false);

  useEffect(() => {
    if (wasRefetchingRef.current && !isRefetching) {
      setFavoriteOverrides({});
    }
    wasRefetchingRef.current = isRefetching;
  }, [isRefetching]);


  useEffect(() => {
    if ((isTabLoading || isDateFilterLoading) && !isFetching && !isLoading) {
      const timer = setTimeout(() => {
        setIsTabLoading(false);
        setIsDateFilterLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isTabLoading, isDateFilterLoading, isFetching, isLoading]);

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
    let orders = mappedOrders;




    if (appliedFilters.productType !== 'all') {
      const productMap: Record<string, string> = {
        mix_3000: 'Concrete Mix 3000',
        mix_3500: 'Concrete Mix 3500',
        mix_4000: 'Concrete Mix 4000',
        mix_4500: 'Concrete Mix 4500',
        mix_5000: 'Concrete Mix 5000',
      };
      orders = orders.filter((order) =>
        order.productType.includes(productMap[appliedFilters.productType])
      );
    }

    if (appliedFilters.hasAlertOnly) {
      orders = orders.filter((order) => order.hasAlert);
    }

    return orders;
  }, [mappedOrders, appliedFilters.productType, appliedFilters.hasAlertOnly]);

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    setAppliedSearchQuery(searchQuery.trim());
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setAppliedSearchQuery('');
    refetch();
  }, [refetch]);

  const handleDateSelect = useCallback((date: Date) => {
    setIsDateFilterLoading(true);
    setSelectedDate(date);
    setActiveFilter('calendar');

    setOrderStatusFilter('all');
  }, []);

  const handleCalendarPress = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveFilter('today');
    setSelectedDate(new Date());
  }, []);

  const handleOpenFilterModal = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  const handleCloseFilterModal = useCallback(() => {
    setShowFilterModal(false);
  }, []);

  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setAppliedFilters(newFilters);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setAppliedFilters(defaultFilterState);
  }, []);

  const handleOrderStatusChange = useCallback((status: OrderStatusFilter) => {
    if (status === orderStatusFilter) return;

    setIsTabLoading(true);
    setOrderStatusFilter(status);

  }, [orderStatusFilter]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {

    if (hasNextPage === true && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const handleOrderPress = useCallback((order: Order) => {
  }, []);

  const renderEmpty = useCallback(() => {
    if (isLoading || isFilterLoading) return null;

    const hasActiveFilter = activeFilterCount > 0 || statusFilterFromRoute;
    const emptyMessage = hasActiveFilter
      ? 'No orders match the selected filter. Try adjusting your filters.'
      : 'There are no orders available at this time.';

    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.semiTransparent.green10 : colors.semiTransparent.green08 }]}>
          <Icon name={hasActiveFilter ? 'filter-off-outline' : 'clipboard-text-outline'} size={ms(40)} color={colors.primary.main} />
        </View>
        <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
          {hasActiveFilter ? 'No Matching Orders' : 'No Orders Found'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.text.secondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, isFilterLoading, isDark, themeColors, activeFilterCount, statusFilterFromRoute]);

  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const scrollToFilter = useCallback((filterId: string) => {
    const position = filterChipPositions.current[filterId];
    if (position && dateFilterScrollRef.current) {

      const screenWidth = Dimensions.get('window').width;
      const scrollX = Math.max(0, position.x - (screenWidth / 2) + (position.width / 2));
      dateFilterScrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, []);

  const handleFilterPress = useCallback((id: DateFilterId) => {
    if (id === activeFilter) return;

    setIsDateFilterLoading(true);
    setActiveFilter(id);

    setOrderStatusFilter('all');
    if (id) {
      scrollToFilter(id);
    }
  }, [scrollToFilter, activeFilter]);

  const renderDateFilter = useCallback(
    ({ id, label, isIcon }: { id: DateFilterId; label: string; isIcon?: boolean }) => {
      const isActive = activeFilter === id;

      return (
        <TouchableOpacity
          key={id}
          onLayout={(event) => {
            if (id) {
              const { x, width } = event.nativeEvent.layout;
              filterChipPositions.current[id] = { x, width };
            }
          }}
          style={[
            styles.filterPill,
            isIcon && styles.filterPillIcon,
            {
              backgroundColor: isActive ? colors.primary.main : (isDark ? themeColors.surface : colors.common.white),
              borderColor: isActive ? colors.primary.main : (isDark ? themeColors.border : colors.grey[25]),
            },
            isIcon && !isActive && {
              backgroundColor: isDark ? themeColors.surface : colors.grey[5],
            },
          ]}
          onPress={() => (isIcon ? handleCalendarPress() : handleFilterPress(id))}
          activeOpacity={0.7}>
          {isIcon ? (
            <View style={styles.calendarFilterContent}>
              <View
                style={[
                  styles.calendarIconWrapper,
                  {
                    backgroundColor: isActive
                      ? colors.semiTransparent.white20
                      : (isDark ? colors.grey[60] + '30' : colors.grey[15]),
                  },
                ]}>
                <Icon
                  name="calendar-month"
                  size={ms(16)}
                  color={isActive ? colors.common.white : (isDark ? colors.grey[25] : colors.grey[60])}
                />
              </View>
              {isActive && (
                <Text
                  style={{
                    color: colors.common.white,
                    marginLeft: spacing.xs,
                    fontFamily: fontFamily.semiBold,
                    fontSize: ms(12),
                  }}>
                  {formatSelectedDate(selectedDate)}
                </Text>
              )}
            </View>
          ) : (
            <Text
              style={{
                color: isActive ? colors.common.white : (isDark ? themeColors.text.primary : colors.common.black),
                fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
                fontSize: ms(12),
              }}>
              {label}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [activeFilter, themeColors, handleCalendarPress, handleFilterPress, selectedDate, isDark, formatSelectedDate]
  );

  const handleOrderDetails = useCallback((order: Order) => {
    const progressColor = getProgressBarColor(order.status, order.progress || 0);
    navigation.navigate('OrderDetailInTab', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
      status: order.status,
      progressColor: progressColor,
      sourceTab: 'Orders',
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
    } catch (error) {
      console.error('Failed to open chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open chat';
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

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.ordersFoundRow}>
          {isFilterLoading ? (
            <View style={styles.filterLoadingRow}>
              <Text variant="caption" color="secondary">Updating...</Text>
            </View>
          ) : (
            <Text variant="caption" color="secondary">
              {filteredOrders.length} out of {pagination?.total ?? filteredOrders.length} orders displaying
            </Text>
          )}
          {activeFilter === 'calendar' &&
            <TouchableOpacity
              style={styles.downloadIcon}
              onPress={handleClearFilter}
              activeOpacity={0.7}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          }
        </View>
      </View>
    ),
    [filteredOrders.length, pagination?.total, activeFilter, handleClearFilter, isFilterLoading]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => {

            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home' as never);
            }
          }}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={iconSizes.lg} color={themeColors.text.primary} />
        </TouchableOpacity>

        <Text variant="h2">{isFavouriteFilter ? 'Saved Orders' : 'Orders'}</Text>

        <View style={styles.headerActions}>
          {!isLoading && (
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={handleOpenFilterModal}
              activeOpacity={0.7}>
              <Icon name="filter-variant" size={iconSizes.lg} color={themeColors.text.primary} />
              {activeFilterCount > 0 && (
                <View style={[styles.filterBadge, { borderColor: themeColors.background }]}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 }]}
            onPress={handleRefresh}
            activeOpacity={0.7}>
            <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
          </TouchableOpacity>
        </View>
      </View>

      {!isLoading && !isTabLoading && !isDateFilterLoading && (
        <>
          <View style={styles.filtersContainer}>
            <ScrollView
              ref={dateFilterScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScroll}>
              {dateFilters.map(renderDateFilter)}
            </ScrollView>
          </View>


          {(dashboardFilter.company_name || dashboardFilter.region_name || dashboardFilter.plant_code) && (
            <View style={styles.dashboardFilterContainer}>
              <View style={[styles.dashboardFilterChip, { backgroundColor: colors.primary.main + '15' }]}>
                <Icon
                  name={dashboardFilter.company_name ? 'domain' : dashboardFilter.region_name ? 'map-marker-radius' : 'factory'}
                  size={ms(14)}
                  color={colors.primary.main}
                />
                <Text style={[styles.dashboardFilterText, { color: colors.primary.main }]} numberOfLines={1}>
                  {dashboardFilter.company_name
                    ? `${dashboardFilter.company_name} (Company)`
                    : dashboardFilter.region_name
                    ? `${dashboardFilter.region_name} (Region)`
                    : `${dashboardFilter.plant_name || dashboardFilter.plant_code} (Plant)`}
                </Text>
                <TouchableOpacity
                  onPress={() => {

                    setDashboardFilter({});
                    navigation.setParams({
                      company_name: undefined,
                      region_name: undefined,
                      plant_code: undefined,
                      plant_name: undefined,
                      _timestamp: Date.now()
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Icon name="close-circle" size={ms(16)} color={colors.primary.main} />
                </TouchableOpacity>
              </View>
            </View>
          )}


          {isFavouriteFilter && (
            <View style={styles.dashboardFilterContainer}>
              <View style={[styles.dashboardFilterChip, { backgroundColor: colors.warning.main + '15' }]}>
                <Icon
                  name="star"
                  size={ms(14)}
                  color={colors.warning.main}
                />
                <Text style={[styles.dashboardFilterText, { color: colors.warning.main }]} numberOfLines={1}>
                  Saved Orders
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsFavouriteFilter(false);
                    navigation.setParams({
                      is_favourite: undefined,
                      _timestamp: Date.now()
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Icon name="close-circle" size={ms(16)} color={colors.warning.main} />
                </TouchableOpacity>
              </View>
            </View>
          )}

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
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7} style={styles.searchClearBtn}>
                  <Icon name="close-circle" size={iconSizes.md} color={themeColors.text.secondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSearch}
                activeOpacity={0.7}
                style={[styles.searchIconBtn, { backgroundColor: colors.primary.main }]}
              >
                <Icon name="magnify" size={iconSizes.md} color={colors.common.white} />
              </TouchableOpacity>
            </View>
          </View>

          <OrderStatusTabs
            selectedStatus={orderStatusFilter}
            onStatusChange={handleOrderStatusChange}
            counts={orderStatusCounts}
          />
        </>
      )}

      <Animated.View
        style={[
          styles.activeFiltersBar,
          { backgroundColor: themeColors.surface },
          {
            opacity: filterBarAnim,
            transform: [
              {
                translateY: filterBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
              {
                scale: filterBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
          activeFilterCount === 0 && styles.hiddenFilterBar,
        ]}
        pointerEvents={activeFilterCount > 0 ? 'auto' : 'none'}>
        <View style={styles.activeFiltersInfo}>
          <Icon name="filter-check" size={ms(16)} color={colors.primary.main} />
          <Text style={[styles.activeFiltersText, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearFiltersBtn}
          onPress={handleClearAllFilters}
          activeOpacity={0.7}>
          <Icon name="close-circle" size={ms(14)} color={colors.error.main} />
          <Text style={styles.clearFiltersText}>Clear All</Text>
        </TouchableOpacity>
      </Animated.View>

      {isLoading || isTabLoading || isDateFilterLoading ? (
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader
            size={120}
            message={isTabLoading || isDateFilterLoading ? "Filtering orders..." : "Loading orders..."}
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      ) : (
        <>

          <View style={styles.staticListHeader}>
            <View style={styles.ordersFoundRow}>
              {isFilterLoading ? (
                <View style={styles.filterLoadingRow}>
                  <Text variant="caption" color="secondary">Updating...</Text>
                </View>
              ) : (
                <Text variant="caption" color="secondary">
                  {filteredOrders.length} out of {pagination?.total ?? filteredOrders.length} orders displaying
                </Text>
              )}
              {activeFilter === 'calendar' &&
                <TouchableOpacity
                  style={styles.downloadIcon}
                  onPress={handleClearFilter}
                  activeOpacity={0.7}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              }
            </View>
          </View>

          <FlatList
            data={filteredOrders}
            renderItem={renderOrderCard}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              filteredOrders.length > 0 ? (
                <ListFooterLoader
                  isLoading={isFetchingNextPage}
                  hasMore={hasNextPage === true}
                  totalItems={pagination?.total}
                  loadingText="Loading more orders..."
                  endMessageText={pagination?.total ? `Showing all ${pagination.total} orders` : undefined}
                  noMoreText="No more orders"
                />
              ) : null
            }
            contentContainerStyle={[
              styles.listContent,
              filteredOrders.length === 0 && styles.emptyListContent,
              { paddingBottom: TAB_BAR_HEIGHT + spacing.xl + keyboardHeight },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ItemSeparatorComponent={ItemSeparator}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={3}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={100}
            getItemLayout={(_, index) => ({
              length: 180,
              offset: 180 * index,
              index,
            })}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main, colors.secondary.main]}
              progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
            />
          }
        />
        </>
      )}

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        isDark={isDark}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={handleCloseFilterModal}
        filters={appliedFilters}
        onApply={handleApplyFilters}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: ms(120),
    height: ms(40),
  },
  headerActions: {
    flexDirection: 'row',
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
  filtersContainer: {
    paddingVertical: spacing.sm,
  },
  filtersScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  dashboardFilterContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  dashboardFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: ms(20),
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  dashboardFilterText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    maxWidth: ms(200),
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: ms(18),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillIcon: {
    paddingHorizontal: spacing.sm,
  },
  calendarFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconWrapper: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  staticListHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ordersFoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadIcon: {
    padding: spacing.xs,
  },
  clearText: {
    fontSize: ms(13),
    color: colors.error.main
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: ms(60),
    paddingHorizontal: ms(20),
  },
  emptyIcon: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(12),
  },
  emptyTitle: {
    fontSize: ms(15),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(4),
  },
  emptySubtitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  skeletonBadge: {
    width: ms(80),
    height: ms(24),
    borderRadius: ms(4),
  },
  skeletonLine: {
    height: ms(16),
    borderRadius: ms(4),
  },
  skeletonProgress: {
    width: '100%',
    height: ms(8),
    borderRadius: ms(4),
    marginTop: spacing.sm,
  },
  centeredModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  centeredDatePickerContent: {
    width: '100%',
    maxWidth: ms(340),
    borderRadius: ms(20),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },
  datePickerModalContent: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  quickDatesContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  quickDateButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: ms(12),
    borderWidth: 1,
    gap: ms(2),
  },
  quickDateLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    marginTop: ms(2),
  },
  quickDateValue: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: ms(14),
    borderWidth: 1,
    gap: spacing.md,
  },
  selectedDateIconWrapper: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: colors.accent.indigoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateTextWrapper: {
    flex: 1,
  },
  selectedDateLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginBottom: ms(2),
  },
  selectedDateText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(15),
  },
  datePickerWrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: ms(16),
    overflow: 'hidden',
    paddingTop: spacing.md,
  },
  datePickerInline: {
    height: ms(340),
  },
  calendar: {
    borderRadius: ms(16),
    paddingHorizontal: spacing.xs,
  },
  datePickerModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },

  dateRangeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  dateRangeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: ms(12),
    gap: spacing.xs,
  },
  dateRangeIconWrapper: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRangeTextWrapper: {
    flex: 1,
  },
  dateRangeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginBottom: ms(2),
  },
  dateRangeValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  dateRangeArrow: {
    paddingHorizontal: spacing.xs,
  },
  daysCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: ms(20),
    gap: spacing.xs,
  },
  daysCountText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  clearDateButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: colors.primary.main + '30',
  },
  hiddenFilterBar: {
    height: 0,
    marginBottom: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  activeFiltersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeFiltersText: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: ms(8),
    backgroundColor: colors.error.main + '10',
  },
  clearFiltersText: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
    color: colors.error.main,
  },
  filterBadge: {
    position: 'absolute',
    top: ms(0),
    right: ms(0),
    minWidth: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(5),
    borderWidth: 2,
  },
  filterBadgeText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    lineHeight: ms(13),
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.medium,
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  modalHandle: {
    width: ms(32),
    height: ms(4),
    borderRadius: ms(2),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalIconContainer: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(10),
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  modalSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(1),
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  closeButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountBadge: {
    minWidth: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(6),
  },
  filterCountText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
  },
  modalScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  modalScrollContent: {
    paddingBottom: spacing.xs,
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionIconContainer: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: ms(5),
    borderRadius: ms(16),
    borderWidth: 1,
    gap: ms(3),
  },
  chipCheckContainer: {
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: colors.semiTransparent.white30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipStatusDot: {
    width: ms(5),
    height: ms(5),
    borderRadius: ms(2.5),
  },
  filterChipText: {
    fontSize: ms(11),
  },
  sortOptionsContainer: {
    borderRadius: ms(12),
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: ms(10),
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sortIconContainer: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortOptionText: {
    fontSize: ms(13),
    flex: 1,
  },
  radioButton: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.common.white,
  },
  productTypeScroll: {
    gap: ms(6),
    paddingRight: spacing.md,
  },
  productTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: ms(14),
    borderWidth: 1,
    minHeight: ms(28),
  },
  productTypeText: {
    fontSize: ms(11),
    lineHeight: ms(14),
  },
  alertToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: ms(12),
    borderWidth: 1.5,
  },
  alertToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  alertIconContainer: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertToggleTextContainer: {
    flex: 1,
  },
  alertToggleTitle: {
    fontSize: ms(13),
  },
  alertToggleSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginTop: ms(1),
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(11),
    borderRadius: ms(12),
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  resetButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ms(48),
    paddingVertical: ms(12),
    paddingHorizontal: spacing.md,
    borderRadius: ms(12),
    backgroundColor: colors.primary.main,
    gap: spacing.sm,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  applyButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
    color: colors.common.white,
    flexShrink: 1,
  },
  applyButtonIconWrapper: {
    width: ms(24),
    height: ms(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OrderListScreen;
