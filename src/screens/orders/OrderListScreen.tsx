import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  Switch,
  Platform,
  Modal,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
<<<<<<< Updated upstream
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
=======
import { RootStackParamList, MainTabParamList, OrdersStackParamList, OrderTabFilter } from '../../navigation/types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card } from '../../components/common';
import { OrderCard } from '../../components/orders';
import { Order } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms, iconSizes, wp, hp } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

const dateFilters = [
<<<<<<< Updated upstream
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'calendar', label: '', isIcon: true },
=======
  { id: 'today', i18nKey: 'dateFilter.today' },
  { id: 'yesterday', i18nKey: 'dateFilter.yesterday' },
  { id: 'tomorrow', i18nKey: 'dateFilter.tomorrow' },
  { id: 'nextWeek', i18nKey: 'dateFilter.nextWeek' },
  { id: 'lastWeek', i18nKey: 'dateFilter.lastWeek' },
  { id: 'calendar', i18nKey: '', isIcon: true },
>>>>>>> Stashed changes
] as const;

type DateFilterId = typeof dateFilters[number]['id'] | null;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

<<<<<<< Updated upstream
const statusFilters = [
  { id: 'all', label: 'All', icon: 'format-list-bulleted' },
  { id: 'PRE_POUR', label: 'Pre-Pour', icon: 'clock-outline' },
  { id: 'IN_PROCESS', label: 'In Process', icon: 'progress-clock' },
  { id: 'COMPLETED', label: 'Completed', icon: 'check-circle-outline' },
  { id: 'DELAYED', label: 'Delayed', icon: 'alert-circle-outline' },
  { id: 'CANCELLED', label: 'Cancelled', icon: 'close-circle-outline' },
=======
const statusFilterDefs = [
  { id: 'all', i18nKey: 'orderFilters.statusAll', icon: 'format-list-bulleted' },
  { id: 'Normal', i18nKey: 'orderFilters.statusNormal', icon: 'checkbox-marked-circle-outline' },
  { id: 'In Progress', i18nKey: 'orderFilters.statusInProgress', icon: 'progress-clock' },
  { id: 'Completed', i18nKey: 'orderFilters.statusCompleted', icon: 'check-circle-outline' },
  { id: 'Will Call', i18nKey: 'orderFilters.statusWillCall', icon: 'phone-outline' },
  { id: 'Canceled', i18nKey: 'orderFilters.statusCanceled', icon: 'close-circle-outline' },
>>>>>>> Stashed changes
] as const;

type StatusFilterId = typeof statusFilterDefs[number]['id'];

<<<<<<< Updated upstream
const sortOptions = [
  { id: 'date_asc', label: 'Date (Oldest First)', icon: 'sort-calendar-ascending' },
  { id: 'date_desc', label: 'Date (Newest First)', icon: 'sort-calendar-descending' },
  { id: 'progress_asc', label: 'Progress (Low to High)', icon: 'sort-ascending' },
  { id: 'progress_desc', label: 'Progress (High to Low)', icon: 'sort-descending' },
  { id: 'distance', label: 'Distance (Nearest)', icon: 'map-marker-distance' },
  { id: 'quantity', label: 'Quantity (Highest)', icon: 'cube-outline' },
=======
const sortOptionDefs = [
  { id: 'date_asc', i18nKey: 'orderFilters.sortDateOldest', icon: 'sort-calendar-ascending' },
  { id: 'date_desc', i18nKey: 'orderFilters.sortDateNewest', icon: 'sort-calendar-descending' },
  { id: 'order_qty_high', i18nKey: 'orderFilters.sortOrderQtyHigh', icon: 'sort-descending' },
  { id: 'order_qty_low', i18nKey: 'orderFilters.sortOrderQtyLow', icon: 'sort-ascending' },
  { id: 'deliver_qty_high', i18nKey: 'orderFilters.sortDeliverQtyHigh', icon: 'sort-descending' },
  { id: 'deliver_qty_low', i18nKey: 'orderFilters.sortDeliverQtyLow', icon: 'sort-ascending' },
>>>>>>> Stashed changes
] as const;

type SortOptionId = typeof sortOptionDefs[number]['id'];

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

const getDateString = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const mockOrders: Order[] = [
  {
    id: '1',
    orderCode: 'ORD-2024-001',
    customerName: 'ABC Construction Co.',
    projectName: 'Downtown Plaza Foundation',
    deliveryAddress: '123 Main Street, Charlotte, NC 28202',
    deliveryCity: 'Charlotte',
    latitude: 35.2271,
    longitude: -80.8431,
    scheduledDate: getDateString(0),
    scheduledTime: '09:00 AM',
    status: 'DELAYED',
    productType: 'Concrete Mix 3000',
    quantity: 45,
    unit: 'CY',
    deliveredQuantity: 12,
    remainingQuantity: 33,
    totalLoads: 6,
    completedLoads: 2,
    progress: 27,
    distance: '12.5 mi',
    estimatedFinishTime: '2:30 PM',
    hasAlert: true,
    alertMessage: 'Truck delayed due to traffic',
    weather: {
      condition: 'sunny',
      temperature: 28,
      temperatureUnit: 'C',
    },
    createdAt: '2026-01-16T08:00:00Z',
    updatedAt: '2026-01-17T09:30:00Z',
  },
  {
    id: '2',
    orderCode: 'ORD-2024-002',
    customerName: 'XYZ Builders Inc.',
    projectName: 'Riverside Commercial Center',
    deliveryAddress: '456 Oak Avenue, Charlotte, NC 28205',
    deliveryCity: 'Charlotte',
    latitude: 35.2371,
    longitude: -80.8131,
    scheduledDate: getDateString(0),
    scheduledTime: '10:30 AM',
    status: 'IN_PROCESS',
    productType: 'Concrete Mix 4000',
    quantity: 60,
    unit: 'CY',
    deliveredQuantity: 35,
    remainingQuantity: 25,
    totalLoads: 8,
    completedLoads: 5,
    progress: 58,
    distance: '8.2 mi',
    estimatedFinishTime: '4:00 PM',
    hasAlert: false,
    weather: {
      condition: 'partly_cloudy',
      temperature: 24,
      temperatureUnit: 'C',
    },
    createdAt: '2026-01-16T10:00:00Z',
    updatedAt: '2026-01-17T11:00:00Z',
  },
  {
    id: '3',
    orderCode: 'ORD-2024-003',
    customerName: 'Metro Development Group',
    projectName: 'Greenfield Residential Phase 2',
    deliveryAddress: '789 Pine Road, Charlotte, NC 28210',
    deliveryCity: 'Charlotte',
    latitude: 35.1871,
    longitude: -80.8531,
    scheduledDate: getDateString(0),
    scheduledTime: '01:00 PM',
    status: 'COMPLETED',
    productType: 'Concrete Mix 3500',
    quantity: 30,
    unit: 'CY',
    deliveredQuantity: 30,
    remainingQuantity: 0,
    totalLoads: 4,
    completedLoads: 4,
    progress: 100,
    distance: '15.8 mi',
    estimatedFinishTime: '3:00 PM',
    hasAlert: false,
    weather: {
      condition: 'cloudy',
      temperature: 22,
      temperatureUnit: 'C',
    },
    createdAt: '2026-01-16T12:00:00Z',
    updatedAt: '2026-01-17T15:00:00Z',
  },
  {
    id: '4',
    orderCode: 'ORD-2024-004',
    customerName: 'Premier Contractors LLC',
    projectName: 'Industrial Park Warehouse',
    deliveryAddress: '321 Industrial Blvd, Charlotte, NC 28214',
    deliveryCity: 'Charlotte',
    latitude: 35.2571,
    longitude: -80.9231,
    scheduledDate: getDateString(-1),
    scheduledTime: '02:30 PM',
    status: 'PRE_POUR',
    productType: 'Concrete Mix 5000',
    quantity: 80,
    unit: 'CY',
    deliveredQuantity: 0,
    remainingQuantity: 80,
    totalLoads: 10,
    completedLoads: 0,
    progress: 0,
    distance: '22.3 mi',
    estimatedFinishTime: '6:30 PM',
    hasAlert: false,
    weather: {
      condition: 'rain',
      temperature: 18,
      temperatureUnit: 'C',
    },
    createdAt: '2026-01-16T14:00:00Z',
    updatedAt: '2026-01-17T08:00:00Z',
  },
  {
    id: '5',
    orderCode: 'ORD-2024-005',
    customerName: 'Sunrise Development',
    projectName: 'Lakefront Condominiums',
    deliveryAddress: '555 Lakeside Drive, Charlotte, NC 28216',
    deliveryCity: 'Charlotte',
    latitude: 35.2971,
    longitude: -80.8731,
    scheduledDate: getDateString(-3),
    scheduledTime: '08:00 AM',
    status: 'IN_PROCESS',
    productType: 'Concrete Mix 4500',
    quantity: 55,
    unit: 'CY',
    deliveredQuantity: 45,
    remainingQuantity: 10,
    totalLoads: 7,
    completedLoads: 6,
    progress: 82,
    distance: '18.1 mi',
    estimatedFinishTime: '11:30 AM',
    hasAlert: true,
    alertMessage: 'Last load en route',
    weather: {
      condition: 'sunny',
      temperature: 30,
      temperatureUnit: 'C',
    },
    createdAt: '2026-01-16T07:00:00Z',
    updatedAt: '2026-01-17T10:30:00Z',
  },
];

const OrderCardSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const bgColor = isDark ? colors.dark.card : colors.light.card;
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

const EmptyState: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const textColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;

  return (
    <View style={styles.emptyState}>
      <Icon name="clipboard-text-outline" size={ms(64)} color={textColor} />
      <Text variant="h3" color="secondary" style={styles.emptyTitle}>
        No Orders Found
      </Text>
      <Text variant="body" color="secondary" style={styles.emptySubtitle}>
        There are no orders matching your search criteria.
      </Text>
    </View>
  );
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  isDark: boolean;
}

<<<<<<< Updated upstream
=======
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
  const { t } = useTranslation();
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

    if (isToday) return `${t('orders.list.today')}, ${weekday} - ${monthDay}, ${year}`;
    if (isTomorrow) return `${t('orders.list.tomorrow')}, ${weekday} - ${monthDay}, ${year}`;
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
                  {t('orders.list.selectDate')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.text.secondary }]}>
                  {t('orders.list.pickDateToFilter')}
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
                {t('orders.list.selectedDate')}
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
                {t('orders.list.applyDate')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

>>>>>>> Stashed changes
const statusColorMap: Record<string, string> = {
  all: colors.primary.main,
  PRE_POUR: colors.warning.main,
  IN_PROCESS: colors.info.main,
  COMPLETED: colors.success.main,
  DELAYED: colors.error.main,
  CANCELLED: colors.grey[50],
};

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  isDark,
}) => {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const themeColors = isDark ? colors.dark : colors.light;

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
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.6],
              }),
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
                  {t('orders.list.filterAndSort')}
                </Text>
<<<<<<< Updated upstream
                <Text style={[styles.modalSubtitle, { color: themeColors.text.hint }]}>
                  Customize your order list
=======
                <Text style={[styles.modalSubtitle, { color: themeColors.text.secondary }]}>
                  {t('orders.list.customizeOrderList')}
>>>>>>> Stashed changes
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
                <Icon name="close" size={ms(20)} color={themeColors.text.secondary} />
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
                  {t('orders.list.orderStatus')}
                </Text>
              </View>
              <View style={styles.filterChipsContainer}>
                {statusFilterDefs.map((status) => {
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
                      {isActive && (
                        <View style={styles.chipCheckContainer}>
                          <Icon name="check" size={ms(12)} color={colors.common.white} />
                        </View>
                      )}
                      {!isActive && (
                        <View style={[styles.chipStatusDot, { backgroundColor: statusColor }]} />
                      )}
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: isActive ? colors.common.white : themeColors.text.primary,
                            fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
                          },
                        ]}
                      >
                        {t(status.i18nKey)}
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
                  {t('orders.list.sortBy')}
                </Text>
              </View>
              <View style={[
                styles.sortOptionsContainer,
                {
                  backgroundColor: isDark ? colors.grey[60] + '15' : colors.grey[3],
                  borderColor: isDark ? colors.grey[60] + '30' : colors.grey[10],
                }
              ]}>
                {sortOptionDefs.map((option, index) => {
                  const isActive = localFilters.sortBy === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.sortOption,
                        index < sortOptionDefs.length - 1 && {
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
                            color={isActive ? colors.primary.main : themeColors.text.hint}
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
                          {t(option.i18nKey)}
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
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.resetButton,
                {
                  borderColor: isDark ? colors.grey[60] + '40' : colors.grey[20],
                  backgroundColor: isDark ? colors.grey[60] + '15' : colors.grey[3],
                }
              ]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
<<<<<<< Updated upstream
              <Icon name="restore" size={ms(18)} color={themeColors.text.secondary} />
              <Text style={[styles.resetButtonText, { color: themeColors.text.secondary }]}>
                Reset All
=======
              <Icon name="restore" size={ms(18)} color={isDark ? colors.grey[40] : colors.grey[60]} />
              <Text style={[styles.resetButtonText, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                {t('orders.list.resetAll')}
>>>>>>> Stashed changes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Icon name="check-circle" size={ms(18)} color={colors.common.white} />
              <Text style={styles.applyButtonText}>
                {t('orders.list.apply')} {activeCount > 0 ? `(${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const OrderListScreen: React.FC = () => {
<<<<<<< Updated upstream
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
=======
  const { t } = useTranslation();
  const navigation = useNavigation<CompositeNavigationProp<
    NativeStackNavigationProp<OrdersStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >>();
  const route = useRoute<RouteProp<OrdersStackParamList, 'OrderList'>>();
>>>>>>> Stashed changes
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DateFilterId>('today');
  const [showMoreDetails, setShowMoreDetails] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilterState);

  const filterBarAnim = useRef(new Animated.Value(0)).current;

  const themeColors = isDark ? colors.dark : colors.light;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!appliedFilters.statuses.includes('all')) count += appliedFilters.statuses.length;
    if (appliedFilters.sortBy !== 'date_desc') count += 1;
    if (appliedFilters.productType !== 'all') count += 1;
    if (appliedFilters.hasAlertOnly) count += 1;
    return count;
  }, [appliedFilters]);

  React.useEffect(() => {
    Animated.spring(filterBarAnim, {
      toValue: activeFilterCount > 0 ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
  }, [activeFilterCount, filterBarAnim]);

  const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getFilterDateRange = useCallback((filter: DateFilterId): { start: Date; end: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        return { start: today, end: today };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: yesterday };
      }
      case 'lastWeek': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: today };
      }
      case 'calendar':
        return { start: selectedDate, end: selectedDate };
      default:
        return null;
    }
  }, [selectedDate]);

  const filteredOrders = useMemo(() => {
    let orders = mockOrders;

    const dateRange = getFilterDateRange(activeFilter);
    if (dateRange) {
      orders = orders.filter((order) => {
        const orderDate = new Date(order.scheduledDate);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(
        (order) =>
          order.orderCode.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query) ||
          order.projectName?.toLowerCase().includes(query) ||
          order.deliveryAddress.toLowerCase().includes(query)
      );
    }

    if (!appliedFilters.statuses.includes('all')) {
      orders = orders.filter((order) =>
        appliedFilters.statuses.includes(order.status as StatusFilterId)
      );
    }

    if (appliedFilters.productType !== 'all') {
      const productMap: Record<string, string> = {
        mix_3000: 'Concrete Mix 3000',
        mix_3500: 'Concrete Mix 3500',
        mix_4000: 'Concrete Mix 4000',
        mix_4500: 'Concrete Mix 4500',
        mix_5000: 'Concrete Mix 5000',
      };
      orders = orders.filter((order) =>
        order.productType === productMap[appliedFilters.productType]
      );
    }

    if (appliedFilters.hasAlertOnly) {
      orders = orders.filter((order) => order.hasAlert);
    }

    orders = [...orders].sort((a, b) => {
      switch (appliedFilters.sortBy) {
        case 'date_asc':
          return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        case 'date_desc':
          return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
        case 'progress_asc':
          return (a.progress || 0) - (b.progress || 0);
        case 'progress_desc':
          return (b.progress || 0) - (a.progress || 0);
        case 'distance':
          return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
        case 'quantity':
          return (b.quantity || 0) - (a.quantity || 0);
        default:
          return 0;
      }
    });

    return orders;
  }, [searchQuery, activeFilter, getFilterDateRange, appliedFilters]);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
      if (event.type === 'set' && date) {
        setSelectedDate(date);
        setActiveFilter('calendar');
        if (Platform.OS === 'ios') {
          setShowDatePicker(false);
        }
      } else if (event.type === 'dismissed') {
        setShowDatePicker(false);
      }
    },
    []
  );

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

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  }, []);

<<<<<<< Updated upstream
  const handleOrderPress = useCallback((order: Order) => {
    console.log('Navigate to order details:', order.id);
  }, []);
=======
  const renderEmpty = useCallback(() => {
    if (isLoading || isFilterLoading) return null;

    const hasActiveFilter = activeFilterCount > 0 || statusFilterFromRoute;
    const emptyMessage = hasActiveFilter
      ? t('orders.list.noMatchingMessage')
      : t('orders.list.noOrdersMessage');

    return (
      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.semiTransparent.green10 : colors.semiTransparent.green08 }]}>
          <Icon name={hasActiveFilter ? 'filter-off-outline' : 'clipboard-text-outline'} size={ms(40)} color={colors.primary.main} />
        </View>
        <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
          {hasActiveFilter ? t('orders.list.noMatchingOrders') : t('orders.list.noOrdersFound')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: themeColors.text.secondary }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, isFilterLoading, isDark, themeColors, activeFilterCount, statusFilterFromRoute, t]);
>>>>>>> Stashed changes

  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderDateFilter = useCallback(
<<<<<<< Updated upstream
    ({ id, label, isIcon }: typeof dateFilters[number]) => {
=======
    ({ id, i18nKey, isIcon }: { id: DateFilterId; i18nKey: string; isIcon?: boolean }) => {
>>>>>>> Stashed changes
      const isActive = activeFilter === id;
      const label = i18nKey ? t(i18nKey) : '';

      return (
        <TouchableOpacity
          key={id}
          style={[
            styles.filterPill,
            isIcon && styles.filterPillIcon,
            {
              backgroundColor: isActive ? colors.primary.main : themeColors.surface,
              borderColor: isActive ? colors.primary.main : themeColors.border,
            },
          ]}
          onPress={() => (isIcon ? handleCalendarPress() : setActiveFilter(id))}
          activeOpacity={0.7}>
          {isIcon ? (
            <View style={styles.calendarFilterContent}>
              <Icon
                name="calendar"
                size={iconSizes.sm}
                color={isActive ? colors.common.white : themeColors.text.secondary}
              />
              {isActive && (
                <Text
                  variant="captionSmall"
                  style={{
                    color: colors.common.white,
                    marginLeft: spacing.xs,
                    fontFamily: fontFamily.medium,
                  }}>
                  {formatSelectedDate(selectedDate)}
                </Text>
              )}
            </View>
          ) : (
            <Text
              variant="buttonSmall"
              style={{
                color: isActive ? colors.common.white : themeColors.text.secondary,
                fontFamily: fontFamily.medium,
              }}>
              {label}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
<<<<<<< Updated upstream
    [activeFilter, themeColors, handleCalendarPress, selectedDate]
=======
    [activeFilter, themeColors, handleCalendarPress, handleFilterPress, selectedDate, isDark, formatSelectedDate, t]
>>>>>>> Stashed changes
  );

  const handleOrderDetails = useCallback((order: Order) => {
    navigation.navigate('OrderDetail', { orderId: order.id });
  }, [navigation]);

  const handleTicket = useCallback((order: Order) => {
    navigation.navigate('Ticket', {
      orderId: order.id,
      orderCode: order.orderCode,
    });
  }, [navigation]);

  const handleWeatherPress = useCallback((order: Order) => {
    navigation.navigate('Weather', {
      locationName: order.deliveryAddress,
      latitude: order.latitude,
      longitude: order.longitude,
      orderId: order.id,
    });
  }, [navigation]);

<<<<<<< Updated upstream
=======
  // Matches web: passes order data for form prefill
  // Web maps delivery_addr1 → jobAddress, delivery_addr2 → jobCity, delivery_addr3 → jobState
  const handleOrderRequest = useCallback((order: Order) => {
    // Parse combined delivery address into parts (addr1, city, state)
    const addrParts = (order.deliveryAddress || '').split(',').map(s => s.trim());
    const addr1 = addrParts[0] || '';
    const city = addrParts.length > 1 ? addrParts[addrParts.length - 2] || '' : '';
    const state = addrParts.length > 2 ? addrParts[addrParts.length - 1] || '' : '';

    (navigation as any).navigate('OrderRequests', {
      screen: 'CreateOrderRequest',
      params: {
        prefillOrder: {
          order_id: order.id,
          order_code: order.orderCode,
          customer_name: order.customerName,
          project_name: order.projectName,
          order_date: order.scheduledDate,
          start_time: order.scheduledTime,
          job_address: addr1,
          job_city: city,
          job_state: state,
          plant_code: order.plantDetails?.code,
          plant_name: order.plantDetails?.name,
          item_code: order.productType,
          quantity: order.quantity,
          special_instructions: order.specialInstructions,
        },
      },
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
          title: t('common.error'),
          message: t('errors.failedToUpdateFavorite'),
        });
      });
  }, [apiOrders, favoriteOverrides, showAlert, t]);

  const handleChat = useCallback(async (order: Order) => {
    setChatLoadingOrderId(order.id);
    markRoomAsRead(order.id);
    setApiUnreadCounts(prev => ({ ...prev, [order.id]: 0 }));
    const parsedId = parseInt(order.id, 10);
    if (!isNaN(parsedId)) chatService.markAsRead(parsedId);
    try {
      const orderId = parsedId;
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
      const errorMessage = error instanceof Error ? error.message : t('errors.failedToOpenChat');
      showAlert({
        type: 'error',
        title: t('errors.chatError'),
        message: errorMessage,
        duration: 4000,
      });
    } finally {
      setChatLoadingOrderId(null);
    }
  }, [getOrCreateRoom, markRoomAsRead, navigation, showAlert, t]);

>>>>>>> Stashed changes
  const renderOrderCard = useCallback(
    ({ item }: { item: Order }) => (
      <OrderCard
        order={item}
        showDetails={showMoreDetails}
        onPress={() => handleOrderPress(item)}
        onOrderDetails={() => handleOrderDetails(item)}
        onTicket={() => handleTicket(item)}
        onWeatherPress={() => handleWeatherPress(item)}
      />
    ),
    [showMoreDetails, handleOrderPress, handleOrderDetails, handleTicket, handleWeatherPress]
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.detailsToggle}>
          <Text variant="body" color="secondary">
            More Details
          </Text>
          <Switch
            value={showMoreDetails}
            onValueChange={setShowMoreDetails}
            trackColor={{
              false: themeColors.border,
              true: colors.primary.light,
            }}
            thumbColor={showMoreDetails ? colors.primary.main : colors.grey[25]}
          />
        </View>
        <View style={styles.ordersFoundRow}>
<<<<<<< Updated upstream
          <Text variant="caption" color="secondary">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
          </Text>
=======
          {isFilterLoading ? (
            <View style={styles.filterLoadingRow}>
              <Text variant="caption" color="secondary">{t('orders.list.updating')}</Text>
            </View>
          ) : (
            <Text variant="caption" color="secondary">
              {t('orders.list.ordersDisplaying', { count: filteredOrders.length, total: pagination?.total ?? filteredOrders.length })}
            </Text>
          )}
>>>>>>> Stashed changes
          {activeFilter === 'calendar' &&
            <TouchableOpacity
              style={styles.downloadIcon}
              onPress={handleClearFilter}
              activeOpacity={0.7}>
              <Text style={styles.clearText}>{t('orders.list.clear')}</Text>
            </TouchableOpacity>
          }
        </View>
      </View>
    ),
<<<<<<< Updated upstream
    [showMoreDetails, filteredOrders.length, themeColors, activeFilter, handleClearFilter]
=======
    [filteredOrders.length, pagination?.total, activeFilter, handleClearFilter, isFilterLoading, t]
>>>>>>> Stashed changes
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={iconSizes.lg} color={themeColors.text.primary} />
        </TouchableOpacity>

<<<<<<< Updated upstream
=======
        <Text variant="h2">{isFavouriteFilter ? t('orders.list.savedOrders') : t('orders.list.title')}</Text>

>>>>>>> Stashed changes
        <View style={styles.headerActions}>
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
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={handleRefresh}
            activeOpacity={0.7}>
            <Icon name="refresh" size={iconSizes.lg} color={themeColors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
          ]}>
          <Icon name="magnify" size={iconSizes.md} color={themeColors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text.primary }]}
            placeholder="Search here..."
            placeholderTextColor={themeColors.text.hint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Icon name="close-circle" size={iconSizes.md} color={themeColors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

<<<<<<< Updated upstream
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}>
          {dateFilters.map(renderDateFilter)}
        </ScrollView>
      </View>
=======
          <View style={styles.filtersContainer}>
            <ScrollView
              ref={dateFilterScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScroll}>
              {dateFilters.map(renderDateFilter)}
            </ScrollView>
          </View>


          {(dashboardFilter.company_name || (showRegion && dashboardFilter.region_name) || dashboardFilter.plant_code) && (
            <View style={styles.dashboardFilterContainer}>
              <View style={[styles.dashboardFilterChip, { backgroundColor: colors.primary.main + '15' }]}>
                <Icon
                  name={dashboardFilter.company_name ? 'domain' : (showRegion && dashboardFilter.region_name) ? 'map-marker-radius' : 'factory'}
                  size={ms(14)}
                  color={colors.primary.main}
                />
                <Text style={[styles.dashboardFilterText, { color: colors.primary.main }]} numberOfLines={1}>
                  {dashboardFilter.company_name
                    ? t('orders.list.companyChip', { name: dashboardFilter.company_name })
                    : (showRegion && dashboardFilter.region_name)
                    ? t('orders.list.regionChip', { name: dashboardFilter.region_name })
                    : t('orders.list.plantChip', { name: dashboardFilter.plant_name || dashboardFilter.plant_code })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setDashboardFilter({});
                    // Reset state so new navigation is detected
                    setParentTabParams(undefined);
                    lastAppliedTimestamp.current = undefined;
                    // Clear params at all parent levels
                    let parent = navigation.getParent();
                    while (parent) {
                      parent.setParams?.({
                        company_name: undefined,
                        region_name: undefined,
                        plant_code: undefined,
                        plant_name: undefined,
                        _timestamp: undefined,
                      });
                      parent = parent.getParent?.();
                    }
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
                  {t('orders.list.savedOrders')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsFavouriteFilter(false);
                    // Reset state so new navigation is detected
                    setParentTabParams(undefined);
                    lastAppliedTimestamp.current = undefined;
                    // Clear params at all parent levels
                    let parent = navigation.getParent();
                    while (parent) {
                      parent.setParams?.({
                        is_favourite: undefined,
                        _timestamp: undefined,
                      });
                      parent = parent.getParent?.();
                    }
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
                placeholder={t('orders.list.searchPlaceholder')}
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
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
          <Text style={[styles.activeFiltersText, { color: themeColors.text.secondary }]}>
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
=======
          <Text style={[styles.activeFiltersText, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
            {t('orders.list.filtersApplied', { count: activeFilterCount })}
>>>>>>> Stashed changes
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearFiltersBtn}
          onPress={handleClearAllFilters}
          activeOpacity={0.7}>
          <Icon name="close-circle" size={ms(14)} color={colors.error.main} />
          <Text style={styles.clearFiltersText}>{t('orders.list.clearAll')}</Text>
        </TouchableOpacity>
      </Animated.View>

<<<<<<< Updated upstream
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <OrderCardSkeleton isDark={isDark} />
          <OrderCardSkeleton isDark={isDark} />
          <OrderCardSkeleton isDark={isDark} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={<EmptyState isDark={isDark} />}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
=======
      {isLoading || isTabLoading || isDateFilterLoading ? (
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader
            size={120}
            message={isTabLoading || isDateFilterLoading ? t('orders.list.filteringOrders') : t('orders.list.loadingOrders')}
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      ) : (
        <>

          <View style={styles.staticListHeader}>
            <View style={styles.ordersFoundRow}>
              {isFilterLoading ? (
                <View style={styles.filterLoadingRow}>
                  <Text variant="caption" color="secondary">{t('orders.list.updating')}</Text>
                </View>
              ) : (
                <Text variant="caption" color="secondary">
                  {t('orders.list.ordersDisplaying', { count: filteredOrders.length, total: pagination?.total ?? filteredOrders.length })}
                </Text>
              )}
              {activeFilter === 'calendar' &&
                <TouchableOpacity
                  style={styles.downloadIcon}
                  onPress={handleClearFilter}
                  activeOpacity={0.7}>
                  <Text style={styles.clearText}>{t('orders.list.clear')}</Text>
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
                  loadingText={t('orders.list.loadingMoreOrders')}
                  endMessageText={pagination?.total ? t('orders.list.showingAllOrders', { total: pagination.total }) : undefined}
                  noMoreText={t('orders.list.noMoreOrders')}
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
>>>>>>> Stashed changes
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main]}
            />
          }
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <View style={[styles.datePickerOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]}>
          <View style={[styles.datePickerContainer, { backgroundColor: themeColors.surface }]}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text variant="body" style={{ color: colors.primary.main }}>Cancel</Text>
              </TouchableOpacity>
              <Text variant="h4" color="primary">Select Date</Text>
              <TouchableOpacity onPress={() => {
                setActiveFilter('calendar');
                setShowDatePicker(false);
              }}>
                <Text variant="body" style={{ color: colors.primary.main, fontFamily: fontFamily.bold }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                if (date) setSelectedDate(date);
              }}
              themeVariant={isDark ? 'dark' : 'light'}
              accentColor={colors.primary.main}
              textColor={themeColors.text.primary}
              style={styles.datePicker}
            />
          </View>
        </View>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

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
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(12),
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: ms(14),
    fontFamily: fontFamily.regular,
    paddingVertical: spacing.xs,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: ms(20),
    borderWidth: 1,
  },
  filterPillIcon: {
    paddingHorizontal: spacing.md,
  },
  calendarFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(10),
  },
  emptyTitle: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    paddingBottom: spacing.xl,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[5],
  },
  datePicker: {
    height: ms(200),
  },
  activeFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.common.black,
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.82,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
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
    backgroundColor: 'rgba(255,255,255,0.3)',
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
    paddingVertical: ms(11),
    borderRadius: ms(12),
    backgroundColor: colors.primary.main,
    gap: spacing.xs,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  applyButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(13),
    color: colors.common.white,
  },
});

export default OrderListScreen;
