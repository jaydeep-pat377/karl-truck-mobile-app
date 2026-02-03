import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TruckLoader, ListFooterLoader, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { RootStackParamList } from '../../navigation/types';
import { useTicketsByOrder } from '../../hooks';
import { ApiTicketStatus, TicketByOrderItem } from '../../types/ticket';

type TicketScreenRouteProp = RouteProp<RootStackParamList, 'Ticket'>;

// Use API status type - redefining for backward compatibility with UI components
type TicketStatus = ApiTicketStatus;

interface DeliveryTicket {
  id: string;
  ticketNumber: string;
  truckId: string;
  truckName: string;
  loadQuantity: number;
  totalOrderQuantity: number;
  unit: string;
  status: TicketStatus;
  statusDisplay: string;
  scheduledTime: string;
  product: string;
  load: string;
  loadQty: string;
  runQtyOrdQty: string;
}

interface StatusConfig {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  iconBg: string;
  progressStep: number;
}

// Light mode status colors - using common theme colors
const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    bgColor: colors.grey[10],
    textColor: colors.grey[60],
    iconBg: colors.grey[10],
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    bgColor: colors.info.light,
    textColor: colors.info.main,
    iconBg: colors.info.light,
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'truck-loading',
    bgColor: colors.warning.light,
    textColor: colors.warning.dark,
    iconBg: colors.warning.light,
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    bgColor: colors.info.light,
    textColor: colors.info.dark,
    iconBg: colors.info.light,
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    bgColor: colors.ticket.status.inTransit.bg,
    textColor: colors.ticket.status.inTransit.text,
    iconBg: colors.ticket.status.inTransit.iconBg,
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    bgColor: colors.ticket.status.atSite.bg,
    textColor: colors.ticket.status.atSite.text,
    iconBg: colors.ticket.status.atSite.iconBg,
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    bgColor: colors.ticket.status.pouring.bg,
    textColor: colors.ticket.status.pouring.text,
    iconBg: colors.ticket.status.pouring.iconBg,
    progressStep: 6,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    bgColor: colors.info.light,
    textColor: colors.info.main,
    iconBg: colors.info.light,
    progressStep: 7,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    bgColor: colors.ticket.status.returning.bg,
    textColor: colors.ticket.status.returning.text,
    iconBg: colors.ticket.status.returning.iconBg,
    progressStep: 8,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'factory',
    bgColor: colors.ticket.status.atPlant.bg,
    textColor: colors.ticket.status.atPlant.text,
    iconBg: colors.ticket.status.atPlant.iconBg,
    progressStep: 9,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    bgColor: colors.error.background,
    textColor: colors.error.dark,
    iconBg: colors.error.background,
    progressStep: -1,
  },
};

// Dark mode status colors - using common theme colors
const STATUS_CONFIG_DARK: Record<TicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    bgColor: colors.grey[60] + '30',
    textColor: colors.grey[25],
    iconBg: colors.grey[60] + '30',
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    bgColor: colors.info.main + '30',
    textColor: colors.info.light,
    iconBg: colors.info.main + '30',
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'truck-loading',
    bgColor: colors.warning.main + '30',
    textColor: colors.warning.light,
    iconBg: colors.warning.main + '30',
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    bgColor: colors.info.main + '30',
    textColor: colors.info.light,
    iconBg: colors.info.main + '30',
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    bgColor: colors.ticket.statusDark.inTransit.bg,
    textColor: colors.ticket.statusDark.inTransit.text,
    iconBg: colors.ticket.statusDark.inTransit.iconBg,
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    bgColor: colors.ticket.statusDark.atSite.bg,
    textColor: colors.ticket.statusDark.atSite.text,
    iconBg: colors.ticket.statusDark.atSite.iconBg,
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    bgColor: colors.ticket.statusDark.pouring.bg,
    textColor: colors.ticket.statusDark.pouring.text,
    iconBg: colors.ticket.statusDark.pouring.iconBg,
    progressStep: 6,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    bgColor: colors.info.main + '30',
    textColor: colors.info.light,
    iconBg: colors.info.main + '30',
    progressStep: 7,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    bgColor: colors.ticket.statusDark.returning.bg,
    textColor: colors.ticket.statusDark.returning.text,
    iconBg: colors.ticket.statusDark.returning.iconBg,
    progressStep: 8,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'factory',
    bgColor: colors.ticket.statusDark.atPlant.bg,
    textColor: colors.ticket.statusDark.atPlant.text,
    iconBg: colors.ticket.statusDark.atPlant.iconBg,
    progressStep: 9,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    bgColor: colors.error.dark + '20',
    textColor: colors.error.light,
    iconBg: colors.error.dark + '20',
    progressStep: -1,
  },
};

interface StatusBadgeProps {
  status: StatusConfig;
  displayLabel?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, displayLabel }) => {
  const label = displayLabel || status.label;

  return (
    <View style={styles.statusBadgeContainer}>
      <View style={[styles.statusIconContainer, { backgroundColor: status.iconBg }]}>
        <Icon name={status.icon} size={ms(14)} color={status.textColor} />
      </View>
      <View style={[styles.statusTextBadge, { backgroundColor: status.bgColor }]}>
        <Text style={[styles.statusText, { color: status.textColor }]}>
          {label}
        </Text>
      </View>
    </View>
  );
};

interface TruckVisualProps {
  isDark: boolean;
}

const TruckVisual: React.FC<TruckVisualProps> = ({ isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const iconColor = isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main;

  return (
    <View
      style={[
        styles.truckVisualContainer,
        {
          backgroundColor: themeColors.card,
          shadowColor: isDark ? colors.common.shadow : colors.primary.main,
        },
      ]}>
      <View style={[styles.truckAccentLine, { backgroundColor: iconColor }]} />
      <Icon name="truck-delivery" size={ms(24)} color={iconColor} />
    </View>
  );
};

interface TicketItemProps {
  ticket: DeliveryTicket;
  onPress: () => void;
  isDark: boolean;
}

const TicketItem: React.FC<TicketItemProps> = ({ ticket, onPress, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const statusConfigMap = isDark ? STATUS_CONFIG_DARK : STATUS_CONFIG;
  const status = statusConfigMap[ticket.status] || statusConfigMap.pending;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ticketItem,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
        pressed && styles.ticketItemPressed,
      ]}>
      <TruckVisual isDark={isDark} />

      <View style={styles.ticketContent}>
        <View style={styles.ticketTopRow}>
          <Text
            style={[styles.truckName, { color: themeColors.text.secondary }]}
            numberOfLines={1}>
            {ticket.truckName}
          </Text>
          <View style={styles.timeContainer}>
            <Icon
              name="clock-outline"
              size={ms(11)}
              color={isDark ? colors.ticket.ui.dark.timeText : colors.ticket.ui.light.timeText}
            />
            <Text
              style={[
                styles.timeText,
                { color: isDark ? colors.ticket.ui.dark.timeText : colors.ticket.ui.light.timeText },
              ]}>
              {ticket.scheduledTime}
            </Text>
          </View>
        </View>

        <View style={styles.ticketMainRow}>
          <Text style={[styles.ticketNumber, { color: themeColors.text.primary }]}>
            {ticket.ticketNumber}
          </Text>
          <Text style={[styles.ticketSeparator, { color: themeColors.text.primary }]}>:</Text>
          <Text style={[styles.ticketQuantityInline, { color: themeColors.text.primary }]}>
            {ticket.loadQty}
          </Text>
        </View>

        <View style={styles.ticketBottomRow}>
          <Text style={[styles.totalText, { color: themeColors.text.hint }]}>
            {ticket.runQtyOrdQty}
          </Text>
          <StatusBadge status={status}
            displayLabel={ticket.statusDisplay} />
        </View>
      </View>

      <View style={styles.chevronContainer}>
        <Icon
          name="chevron-right"
          size={ms(22)}
          color={isDark ? colors.ticket.ui.dark.chevron : colors.ticket.ui.light.chevron}
        />
      </View>
    </Pressable>
  );
};

interface OrderHeaderProps {
  orderDate: string;
  deliveryAddress: string;
  totalTickets: number;
  totalDeliveredQty: number;
  orderedQty: number;
  progressDisplay: string;
  isDark: boolean;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  orderDate,
  deliveryAddress,
  totalTickets,
  totalDeliveredQty,
  orderedQty,
  progressDisplay,
  isDark,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const ticketUi = isDark ? colors.ticket.ui.dark : colors.ticket.ui.light;
  const accentColor = isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main;
  const accentColorLight = isDark ? colors.ticket.ui.dark.accentBlueLight : colors.primary.main;

  const progressData = useMemo(() => {
    const rawPercentage = orderedQty > 0 ? (totalDeliveredQty / orderedQty) * 100 : 0;
    const percentage = Math.min(rawPercentage, 100); // Cap at 100%
    return {
      totalDelivered: totalDeliveredQty,
      totalOrdered: orderedQty,
      percentage,
      displayPercentage: Math.round(rawPercentage), // Show actual percentage in text
      ticketCount: totalTickets,
    };
  }, [totalDeliveredQty, orderedQty, totalTickets]);

  return (
    <View
      style={[
        styles.orderHeader,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
      ]}>
      <View style={styles.orderTopSection}>
        <View
          style={[
            styles.orderIconBox,
            {
              backgroundColor: themeColors.card,
              shadowColor: isDark ? colors.common.black : colors.primary.main,
            },
          ]}>
          <View style={[styles.orderIconAccent, { backgroundColor: accentColor }]} />
          <Icon name="clipboard-text-outline" size={ms(22)} color={accentColor} />
        </View>

        <View style={styles.orderDetails}>
          <Text style={[styles.orderDate, { color: themeColors.text.primary }]}>
            ORDER - {orderDate}
          </Text>
          <View style={styles.addressRow}>
            <Icon name="map-marker-outline" size={ms(14)} color={themeColors.text.hint} />
            <Text
              style={[styles.orderAddress, { color: themeColors.text.secondary }]}
              numberOfLines={1}>
              {deliveryAddress}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.ticketCountBadge,
            { backgroundColor: isDark ? colors.ticket.ui.dark.badgeBg : colors.primary.main + '12' },
          ]}
        >
          <Text style={[styles.ticketCountNumber, { color: accentColorLight }]}>
            {progressData.ticketCount}
          </Text>
          <Text style={[styles.ticketCountLabel, { color: accentColorLight }]}>
            Loads
          </Text>
        </View>
      </View>

      <View style={[styles.orderDivider, { backgroundColor: themeColors.border }]} />

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: themeColors.text.secondary }]}>
            Delivery Progress
          </Text>
          <Text style={[styles.progressPercentage, { color: accentColor }]}>
            {progressData.displayPercentage >= 100 ? '100%' : `${progressData.displayPercentage}%`}
          </Text>
        </View>
        <View style={[styles.progressBarContainer, { backgroundColor: ticketUi.progressBg }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressData.percentage}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>

        <Text style={[styles.progressLabel, { color: themeColors.text.hint }]}>
          {progressDisplay || `${(progressData.totalDelivered ?? 0).toFixed(1)} of ${progressData.totalOrdered ?? 0} CY delivered`}
        </Text>
      </View>
    </View>
  );
};

interface EmptyStateProps {
  hasFilter: boolean;
  hasSearch: boolean;
  isDark: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasFilter, hasSearch, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const gradientColors = isDark
    ? colors.ticket.emptyGradient.dark
    : colors.ticket.emptyGradient.light;
  const iconColor = isDark ? colors.common.white : colors.ticket.ui.light.emptyIcon;

  const hasAnyFilter = hasFilter || hasSearch;

  return (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={gradientColors}
        style={styles.emptyIconContainer}
      >
        <Icon name={hasSearch ? 'magnify' : 'ticket-outline'} size={ms(48)} color={iconColor} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
        {hasSearch ? 'No Results Found' : hasFilter ? 'No Matching Tickets' : 'No Tickets Yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.text.secondary }]}>
        {hasSearch
          ? 'Try different search terms or clear your search.'
          : hasAnyFilter
            ? 'Try adjusting your filters to see more tickets.'
            : 'Delivery tickets will appear here once loads are scheduled.'}
      </Text>
    </View>
  );
};

// ============================================================================
// SEARCH BAR COMPONENT
// ============================================================================

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSearch: () => void;
  onFilterPress: () => void;
  isDark: boolean;
  activeFiltersCount: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onSearch,
  onFilterPress,
  isDark,
  activeFiltersCount,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.searchContainer}>
      <View
        style={[
          styles.searchInputWrapper,
          {
            backgroundColor: themeColors.card,
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : colors.grey[10],
          },
        ]}>
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder="Search tickets, trucks, drivers..."
          placeholderTextColor={isDark ? themeColors.text.hint : colors.grey[40]}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Icon name="close-circle" size={ms(18)} color={themeColors.text.hint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onSearch}
          style={[styles.searchIconBtn, { backgroundColor: colors.primary.main }]}
        >
          <Icon name="magnify" size={ms(20)} color={colors.common.white} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: activeFiltersCount > 0 ? colors.primary.main : themeColors.card,
            borderWidth: activeFiltersCount > 0 || isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : colors.grey[10],
          },
        ]}
        onPress={onFilterPress}
        activeOpacity={0.7}>
        <Icon
          name="filter-variant"
          size={ms(20)}
          color={activeFiltersCount > 0 ? colors.common.white : themeColors.text.primary}
        />
        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// FILTER MODAL COMPONENT
// ============================================================================

interface FilterOptions {
  statuses: TicketStatus[];
  sortBy: 'time';
  sortOrder: 'asc' | 'desc';
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
  isDark: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  isDark,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, filters, slideAnim]);

  const toggleStatus = (status: TicketStatus) => {
    setLocalFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status],
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      statuses: [],
      sortBy: 'time',
      sortOrder: 'asc',
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  const statusOptions: { id: TicketStatus; label: string; color: string }[] = [
    { id: 'pending', label: 'Pending', color: colors.grey[60] },
    { id: 'ticketed', label: 'Ticketed', color: colors.info.main },
    { id: 'loading', label: 'Loading', color: colors.warning.dark },
    { id: 'loaded', label: 'Loaded', color: colors.info.dark },
    { id: 'to_job', label: 'To Job', color: colors.ticket.status.inTransit.text },
    { id: 'at_job', label: 'At Job', color: colors.ticket.status.atSite.text },
    { id: 'pouring', label: 'Pouring', color: colors.ticket.status.pouring.text },
    { id: 'washing', label: 'Washing', color: colors.info.main },
    { id: 'to_plant', label: 'To Plant', color: colors.ticket.status.returning.text },
    { id: 'at_plant', label: 'At Plant', color: colors.ticket.status.atPlant.text },
    { id: 'cancelled', label: 'Cancelled', color: colors.error.main },
  ];

  const sortOptions: { id: 'time'; label: string; icon: string }[] = [
    { id: 'time', label: 'Scheduled Time', icon: 'clock-outline' },
  ];

  const activeFiltersCount =
    localFilters.statuses.length +
    (localFilters.sortBy !== 'time' || localFilters.sortOrder !== 'asc' ? 1 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: themeColors.card,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}>
          <Pressable onPress={() => Keyboard.dismiss()}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                Filter Tickets
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Icon name="close" size={ms(24)} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  Status
                </Text>
                <View style={styles.filterChipsGrid}>
                  {statusOptions.map(status => {
                    const isSelected = localFilters.statuses.includes(status.id);
                    return (
                      <TouchableOpacity
                        key={status.id}
                        style={[
                          styles.filterChipOption,
                          {
                            backgroundColor: isSelected
                              ? `${status.color}20`
                              : isDark
                                ? colors.ticket.ui.dark.filterBg
                                : colors.ticket.ui.light.filterBg,
                            borderColor: isSelected ? status.color : 'transparent',
                          },
                        ]}
                        onPress={() => toggleStatus(status.id)}>
                        {isSelected && (
                          <Icon name="check" size={ms(14)} color={status.color} />
                        )}
                        <Text
                          style={[
                            styles.filterChipOptionText,
                            { color: isSelected ? status.color : themeColors.text.secondary },
                          ]}>
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  Sort By
                </Text>
                <View style={styles.sortOptionsContainer}>
                  {sortOptions.map(option => {
                    const isSelected = localFilters.sortBy === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.sortOption,
                          {
                            backgroundColor: isSelected
                              ? colors.primary.main
                              : isDark
                                ? colors.ticket.ui.dark.filterBg
                                : colors.ticket.ui.light.filterBg,
                          },
                        ]}
                        onPress={() =>
                          setLocalFilters(prev => ({ ...prev, sortBy: option.id }))
                        }>
                        <Icon
                          name={option.icon}
                          size={ms(18)}
                          color={isSelected ? colors.common.white : themeColors.text.secondary}
                        />
                        <Text
                          style={[
                            styles.sortOptionText,
                            {
                              color: isSelected
                                ? colors.common.white
                                : themeColors.text.secondary,
                            },
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Sort Order */}
                <View style={styles.sortOrderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderBtn,
                      {
                        backgroundColor:
                          localFilters.sortOrder === 'asc'
                            ? colors.primary.main
                            : isDark
                              ? colors.ticket.ui.dark.filterBg
                              : colors.ticket.ui.light.filterBg,
                      },
                    ]}
                    onPress={() =>
                      setLocalFilters(prev => ({ ...prev, sortOrder: 'asc' }))
                    }>
                    <Icon
                      name="sort-ascending"
                      size={ms(18)}
                      color={
                        localFilters.sortOrder === 'asc'
                          ? colors.common.white
                          : themeColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.sortOrderText,
                        {
                          color:
                            localFilters.sortOrder === 'asc'
                              ? colors.common.white
                              : themeColors.text.secondary,
                        },
                      ]}>
                      Ascending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderBtn,
                      {
                        backgroundColor:
                          localFilters.sortOrder === 'desc'
                            ? colors.primary.main
                            : isDark
                              ? colors.ticket.ui.dark.filterBg
                              : colors.ticket.ui.light.filterBg,
                      },
                    ]}
                    onPress={() =>
                      setLocalFilters(prev => ({ ...prev, sortOrder: 'desc' }))
                    }>
                    <Icon
                      name="sort-descending"
                      size={ms(18)}
                      color={
                        localFilters.sortOrder === 'desc'
                          ? colors.common.white
                          : themeColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.sortOrderText,
                        {
                          color:
                            localFilters.sortOrder === 'desc'
                              ? colors.common.white
                              : themeColors.text.secondary,
                        },
                      ]}>
                      Descending
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: ms(120) }} />
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <TouchableOpacity
                style={[
                  styles.modalResetBtn,
                  {
                    backgroundColor: isDark ? colors.modal.dark.cancelBg : colors.modal.light.cancelBg,
                    borderColor: isDark ? colors.modal.dark.cancelBorder : colors.modal.light.cancelBorder,
                  },
                ]}
                onPress={handleReset}>
                <Icon
                  name="refresh"
                  size={ms(18)}
                  color={isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText}
                />
                <Text
                  style={[
                    styles.modalResetText,
                    { color: isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText },
                  ]}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApplyBtn, { backgroundColor: colors.primary.main }]}
                onPress={handleApply}>
                <Text style={styles.modalApplyText}>
                  Apply{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const DEFAULT_FILTERS: FilterOptions = {
  statuses: [],
  sortBy: 'time',
  sortOrder: 'asc',
};

export const TicketScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<TicketScreenRouteProp>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const { orderId, orderCode, orderDate } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);

  // Use the tickets by order hook
  const {
    order,
    tickets: apiTickets,
    orderedQty,
    totalDeliveredQty,
    progressDisplay,
    totalTickets,
    isLoading,
    isRefetching,
    refetch,
  } = useTicketsByOrder({
    orderId,
    sort_order: advancedFilters.sortOrder,
  });

  // Get order info from order data
  const displayDate = order?.order_date
    ? new Date(order.order_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Order';
  const deliveryAddress = order?.delivery_address || 'Loading...';

  // Map API tickets to UI format
  const allTickets = useMemo(
    () => (apiTickets || []).map((ticket: TicketByOrderItem): DeliveryTicket => ({
      id: ticket.ticket_code || '',
      ticketNumber: ticket.ticket_code || '',
      truckId: ticket.truck || '',
      truckName: `Truck ${ticket.truck || 'N/A'}`,
      loadQuantity: ticket.running_qty ?? 0,
      totalOrderQuantity: ticket.ordered_qty ?? 0,
      unit: 'CY',
      status: ticket.status || 'ticketed',
      statusDisplay: ticket.status_display || '',
      scheduledTime: ticket.timestamps?.eta_at_job || ticket.timestamps?.ticketed || '',
      product: ticket.product || '',
      load: ticket.load || '',
      loadQty: ticket.load_qty || '',
      runQtyOrdQty: ticket.run_qty_ord_qty || '',
    })),
    [apiTickets]
  );

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.statuses.length > 0) count += advancedFilters.statuses.length;
    if (advancedFilters.sortBy !== 'time' || advancedFilters.sortOrder !== 'asc') count += 1;
    return count;
  }, [advancedFilters]);

  // Tickets are now filtered by API, just apply any client-side filters if needed
  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

    // Apply search filter (only when search button is clicked)
    if (appliedSearchQuery.trim()) {
      const query = appliedSearchQuery.toLowerCase().trim();
      tickets = tickets.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.truckId.toLowerCase().includes(query) ||
        ticket.product.toLowerCase().includes(query) ||
        ticket.load.includes(query)
      );
    }

    // Apply status filter
    if (advancedFilters.statuses.length > 0) {
      tickets = tickets.filter(ticket => advancedFilters.statuses.includes(ticket.status));
    }

    return tickets;
  }, [allTickets, advancedFilters.statuses, appliedSearchQuery]);

  // Reset displayed count when filters change
  React.useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [appliedSearchQuery, advancedFilters]);

  // Paginated tickets for display
  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(0, displayedCount);
  }, [filteredTickets, displayedCount]);

  // Pagination helpers
  const hasNextPage = displayedCount < filteredTickets.length;
  const isFetchingNextPage = false; // Client-side pagination, no fetching

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage) {
      setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [hasNextPage]);

  const handleTicketPress = useCallback((ticket: DeliveryTicket) => {
    navigation.navigate('TicketDetail', {
      orderCode: orderCode,
      orderDate: orderDate,
      ticketCode: ticket.ticketNumber,
      status: ticket.status,
      statusDisplay: ticket.statusDisplay,
    });
  }, [navigation, orderCode, orderDate]);

  const handleSearch = useCallback(() => {
    setAppliedSearchQuery(searchQuery.trim());
  }, [searchQuery]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setAppliedSearchQuery('');
  }, []);

  const handleFilterPress = useCallback(() => {
    setFilterModalVisible(true);
  }, []);

  const handleFilterApply = useCallback((filters: FilterOptions) => {
    setAdvancedFilters(filters);
  }, []);

  const handleFilterReset = useCallback(() => {
    setAdvancedFilters(DEFAULT_FILTERS);
  }, []);

  const renderHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <OrderHeader
        orderDate={displayDate}
        deliveryAddress={deliveryAddress}
        totalTickets={totalTickets}
        totalDeliveredQty={totalDeliveredQty}
        orderedQty={orderedQty}
        progressDisplay={progressDisplay}
        isDark={isDark}
      />
      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeaderText, { color: themeColors.text.secondary }]}>
          {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  ), [
    displayDate,
    deliveryAddress,
    totalTickets,
    totalDeliveredQty,
    orderedQty,
    progressDisplay,
    isDark,
    themeColors,
    filteredTickets.length,
  ]);

  const renderTicket = useCallback(
    ({ item }: { item: DeliveryTicket }) => (
      <TicketItem
        ticket={item}
        onPress={() => handleTicketPress(item)}
        isDark={isDark}
      />
    ),
    [isDark, handleTicketPress]
  );

  const keyExtractor = useCallback((item: DeliveryTicket) => item.id, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.surface }]}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={ms(20)} color={themeColors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
            Delivery Tickets
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.text.hint }]}>
            Order #{orderCode}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={handleRefresh}
          activeOpacity={0.7}>
          <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {!isLoading && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={handleSearchClear}
          onSearch={handleSearch}
          onFilterPress={handleFilterPress}
          isDark={isDark}
          activeFiltersCount={activeFiltersCount}
        />
      )}

      {isLoading ? (
        <View style={styles.loaderContainer} pointerEvents="box-none">
          <TruckLoader
            size={120}
            message="Loading tickets..."
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      ) : (
        <FlatList
          style={styles.flatList}
          data={paginatedTickets}
          renderItem={renderTicket}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              hasFilter={activeFiltersCount > 0}
              hasSearch={appliedSearchQuery.trim().length > 0}
              isDark={isDark}
            />
          }
          ListFooterComponent={
            <ListFooterLoader
              isLoading={isFetchingNextPage}
              hasMore={hasNextPage}
              totalItems={filteredTickets.length}
              loadingText="Loading more tickets..."
              endMessageText={filteredTickets.length > 0 ? `Showing all ${filteredTickets.length} tickets` : undefined}
              noMoreText="No more tickets"
            />
          }
          contentContainerStyle={
            filteredTickets.length === 0
              ? styles.listContentEmpty
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
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
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={advancedFilters}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(17),
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(2),
  },
  orderHeader: {
    borderRadius: ms(14),
    padding: ms(14),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconBox: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(11),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  orderIconAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ms(3),
    borderTopLeftRadius: ms(11),
    borderTopRightRadius: ms(11),
  },
  orderDetails: {
    flex: 1,
  },
  orderDate: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
    marginBottom: ms(3),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  orderAddress: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    flex: 1,
  },
  ticketCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(10),
  },
  ticketCountNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  ticketCountLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    marginTop: ms(1),
  },
  orderDivider: {
    height: 1,
    marginVertical: ms(12),
  },
  progressSection: {},
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  progressTitle: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  progressPercentage: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  progressBarContainer: {
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: ms(3),
  },
  progressLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(5),
  },
  // FlatList takes remaining space
  flatList: {
    flex: 1,
  },
  // Content styles - no flexGrow to prevent centering
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
  },
  // Only for empty state - enables vertical centering
  listContentEmpty: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
  },
  listHeader: {
    marginBottom: ms(4),
  },
  listHeaderRow: {
    marginTop: ms(8),
  },
  listHeaderText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  listFooterText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  separator: {
    height: ms(4),
  },
  ticketItem: {
    flexDirection: 'row',
    borderRadius: ms(12),
    padding: ms(8),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  ticketItemPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  truckVisualContainer: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(10),
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  truckAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ms(3),
    borderTopLeftRadius: ms(12),
    borderTopRightRadius: ms(12),
  },
  ticketContent: {
    flex: 1,
    justifyContent: 'center',
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ms(1),
  },
  truckName: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    flex: 1,
    marginRight: spacing.xs,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    flexShrink: 0,
  },
  statusIconContainer: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextBadge: {
    paddingVertical: ms(4),
    paddingHorizontal: ms(8),
    borderRadius: ms(6),
    minWidth: ms(60),
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(9),
    letterSpacing: 0.3,
  },
  ticketMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: ms(1),
  },
  ticketNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  ticketSeparator: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
    marginHorizontal: ms(5),
  },
  ticketQuantityInline: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
  },
  ticketBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(1),
    gap: ms(8),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  timeText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
  },
  totalText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    flexShrink: 1,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: ms(6),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    marginTop: spacing.xl,
  },
  emptyIconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: ms(20),
  },
  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: ms(8),
    gap: ms(10),
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(48),
    borderRadius: ms(12),
    paddingLeft: ms(16),
    paddingRight: ms(6),
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    padding: 0,
    paddingVertical: ms(10),
  },
  clearButton: {
    padding: ms(4),
  },
  searchIconBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ms(8),
  },
  filterButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: ms(2),
    right: ms(2),
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
  },
  filterBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(10),
    color: colors.common.white,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: ms(12),
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    maxHeight: '85%',
    paddingTop: ms(8),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: ms(12),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
  },
  modalCloseBtn: {
    padding: ms(4),
  },
  modalScroll: {
    paddingHorizontal: spacing.lg,
  },
  filterSection: {
    marginTop: ms(14),
  },
  filterSectionLast: {
    marginTop: ms(14),
    marginBottom: ms(24),
  },
  filterSectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    marginBottom: ms(8),
  },
  filterChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
  },
  filterChipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(18),
    borderWidth: 1.5,
  },
  filterChipOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(10),
  },
  sortOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  sortOrderContainer: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(8),
  },
  sortOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(5),
    paddingVertical: ms(10),
    borderRadius: ms(10),
  },
  sortOrderText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    paddingHorizontal: spacing.lg,
    paddingVertical: ms(16),
    paddingBottom: ms(32),
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
    paddingVertical: ms(14),
    borderRadius: ms(12),
    borderWidth: 1,
  },
  modalResetText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
  },
  modalApplyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(14),
    borderRadius: ms(12),
  },
  modalApplyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
});

export default TicketScreen;
