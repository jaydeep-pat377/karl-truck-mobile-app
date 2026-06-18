import React, { useState, useCallback, useMemo } from 'react';
import { useTimezoneStore } from '../../store/timezoneStore';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Platform,
  Text as RNText,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, ScreenContainer, ScreenHeader, TruckLoader } from '../../components/common';
import { EmptyView } from '../../components/common/EmptyView';
import { colors } from '../../theme/colors';
import { getVolumeUnit } from '../../utils/units';
import { fontFamily } from '../../theme/typography';
import { spacing, ms, vs } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useOrderRequests, useOrderRequestFormData } from '../../hooks/useOrderRequests';
import {
  OrderEntity,
  OrderRequestStatusFilter,
  ORDER_STATUS_LABELS,
} from '../../types/orderRequest';
import { OrderRequestsStackParamList } from '../../navigation/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: colors.orderRequest.status.pending,
  submitted: colors.orderRequest.status.submitted,
  approved: colors.orderRequest.status.approved,
  rejected: colors.orderRequest.status.rejected,
  canceled: colors.orderRequest.status.canceled,
};

const ORDER_TYPE_COLORS: Record<string, string> = {
  with_project: colors.orderRequest.orderType.withProject,
  without_project_with_product: colors.orderRequest.orderType.withoutProjectWithProduct,
  without_project: colors.orderRequest.orderType.withoutProject,
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  with_project: 'Project',
  without_project_with_product: 'W/O Project + Product',
  without_project: 'W/O Project',
};

const ORDER_TYPE_ICONS: Record<string, string> = {
  with_project: 'lock',
  without_project_with_product: 'factory',
  without_project: 'clipboard-text-outline',
};

const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  submitted: 1,
  approved: 2,
  rejected: 3,
  canceled: 4,
};

const withOpacity = (rgbColor: string, opacity: number): string =>
  rgbColor.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);

const STATUS_DISPLAY_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Accepted',
  rejected: 'Rejected',
  canceled: 'Canceled',
};

const FILTER_TABS: {
  key: OrderRequestStatusFilter;
  label: string;
  color: string;
}[] = [
  { key: 'all', label: 'All', color: colors.orderRequest.filterTab.allColor },
  { key: 'pending', label: 'Pending', color: STATUS_COLORS.pending },
  { key: 'submitted', label: 'Submitted', color: STATUS_COLORS.submitted },
  { key: 'approved', label: 'Accepted', color: STATUS_COLORS.approved },
  { key: 'rejected', label: 'Rejected', color: STATUS_COLORS.rejected },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getOrderCode = (order: OrderEntity): string =>
  `OE-${order.id.slice(0, 6).toUpperCase()}`;

const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  try {
    // If already formatted with AM/PM (e.g. "12:40 PM PDT"), strip any
    // trailing TZ abbreviation so the chip is hidden everywhere except the
    // dashboard subtitle.
    if (/AM|PM/i.test(timeStr)) {
      // Strip trailing TZ abbreviation (e.g. "03:37 PM PDT" → "03:37 PM")
      // but keep AM/PM itself
      return timeStr.replace(/\s+(?!AM|PM)[A-Z]{2,5}$/i, '');
    }
    // Handle "HH:mm" or "HH:mm:ss" 24-hour format
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    // dateStr is "YYYY-MM-DD" — parse parts directly to avoid UTC timezone shift
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  } catch {
    return dateStr;
  }
};

const getFilterCount = (
  counts: { total: number; pending: number; submitted: number; approved: number; rejected: number },
  key: OrderRequestStatusFilter,
): number => {
  switch (key) {
    case 'all':
      return counts.total;
    case 'pending':
      return counts.pending;
    case 'submitted':
      return counts.submitted;
    case 'approved':
      return counts.approved;
    case 'rejected':
      return counts.rejected;
    default:
      return 0;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type NavigationProp = NativeStackNavigationProp<OrderRequestsStackParamList>;

export const OrderRequestListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const { timezone } = useTimezoneStore();
  // Web has no role checks on the list page — list and create button are always visible

  const [activeFilter, setActiveFilter] = useState<OrderRequestStatusFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pass filter & search to the hook for server-side pagination
  const {
    orders,
    counts,
    isLoading,
    refetch,
    isRefetching,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrderRequests({
    status: activeFilter !== 'all' ? activeFilter : undefined,
    search: debouncedSearch || undefined,
  });

  // Prefetch form data so CreateOrderRequest screen loads instantly
  useOrderRequestFormData();

  // Show TruckLoader when switching tabs/search (fetching fresh data, not paginating)
  const isFilterLoading = isFetching && !isFetchingNextPage && !isLoading;

  // Already filtered/paginated server-side, just sort by status priority
  const filteredOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99),
    );
  }, [orders]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCardPress = useCallback(
    (order: OrderEntity) => {
      // Navigate to OrderRequestDetail if it exists in RootStackParamList,
      // otherwise this is a stub that can be wired up later.
      navigation.navigate('OrderRequestDetail', { orderRequestId: order.id });
    },
    [navigation],
  );

  const handleCreatePress = useCallback(() => {
    navigation.navigate('CreateOrderRequest', {});
  }, [navigation]);

  // -----------------------------------------------------------------------
  // Renderers
  // -----------------------------------------------------------------------

  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterTabsContainer}
      style={styles.filterTabsScroll}
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        const count = getFilterCount(counts, tab.key);
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              {
                backgroundColor: isActive
                  ? tab.color
                  : isDark
                    ? colors.orderRequest.filterTab.dark.inactiveBg
                    : colors.orderRequest.filterTab.light.inactiveBg,
                borderColor: tab.color,
              },
            ]}
            onPress={() => setActiveFilter(tab.key)}
            activeOpacity={0.7}
          >
            <RNText
              style={[
                styles.filterTabLabel,
                {
                  color: isActive
                    ? colors.common.white
                    : tab.color,
                },
              ]}
            >
              {t(`orderRequestList.tabs.${tab.key}`, { defaultValue: tab.label })}
            </RNText>
            <View
              style={[
                styles.filterTabBadge,
                {
                  backgroundColor: isActive
                    ? colors.orderRequest.filterTab.activeBadgeBg
                    : isDark
                      ? colors.orderRequest.filterTab.dark.inactiveBadgeBg
                      : colors.orderRequest.filterTab.light.inactiveBadgeBg,
                },
              ]}
            >
              <RNText
                style={[
                  styles.filterTabBadgeText,
                  {
                    color: isActive
                      ? colors.common.white
                      : tab.color,
                  },
                ]}
              >
                {count}
              </RNText>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const handleSearchSubmit = useCallback(() => {
    setDebouncedSearch(searchText.trim());
  }, [searchText]);

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder={t('orderRequestList.searchPlaceholder')}
          placeholderTextColor={themeColors.text.hint}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setDebouncedSearch('');
            }}
            style={styles.searchClearBtn}
          >
            <Icon
              name="close-circle"
              size={ms(18)}
              color={themeColors.text.hint}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSearchSubmit}
          activeOpacity={0.7}
          style={[styles.searchIconBtn, { backgroundColor: colors.primary.main }]}
        >
          <Icon name="magnify" size={ms(18)} color={colors.common.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOrderCard = useCallback(
    ({ item }: { item: OrderEntity }) => {
      const orderTypeColor =
        ORDER_TYPE_COLORS[item.order_type] ?? ORDER_TYPE_COLORS.without_project;
      const orderTypeLabel = item.order_type
        ? t(`orderRequestList.orderTypes.${item.order_type}`, { defaultValue: ORDER_TYPE_LABELS[item.order_type] ?? t('scanDetails.unknown') })
        : t('scanDetails.unknown');
      const orderTypeIcon =
        ORDER_TYPE_ICONS[item.order_type] ?? 'clipboard-list';
      const statusColor =
        STATUS_COLORS[item.status] ?? colors.orderRequest.status.fallback;
      const statusLabel = t(`orderRequest.statusDisplay.${item.status}`, {
        defaultValue: STATUS_DISPLAY_LABELS[item.status] ?? item.status.charAt(0).toUpperCase() + item.status.slice(1),
      });
      const orderStatusLabel =
        item.order_status != null
          ? ORDER_STATUS_LABELS[item.order_status] ?? ''
          : '';
      const displayName =
        item.job_name || item.job_address || t('orderRequestList.untitled');

      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: isDark ? colors.dark.card : colors.light.card,
              borderColor: isDark
                ? colors.orderRequest.card.dark.border
                : colors.orderRequest.card.light.border,
            },
          ]}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.7}
        >
          {/* Left accent strip */}
          <View
            style={[styles.cardAccent, { backgroundColor: orderTypeColor }]}
          >
            <Icon
              name={orderTypeIcon}
              size={ms(24)}
              color={colors.common.white}
            />
          </View>

          {/* Status badge – pinned top-right of entire card */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: withOpacity(statusColor, 0.1) },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
            />
            <Text
              variant="captionSmall"
              style={[styles.statusText, { color: statusColor }]}
            >
              {statusLabel}
            </Text>
          </View>

          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Company name */}
            <Text
              variant="captionSmall"
              style={[
                styles.companyName,
                {
                  color: isDark
                    ? colors.dark.text.hint
                    : colors.light.text.hint,
                },
              ]}
              numberOfLines={1}
            >
              {(item.company_name ?? '').toUpperCase()}
            </Text>

            {/* Job name / address */}
            <Text
              variant="bodySmall"
              style={[
                styles.jobName,
                {
                  color: isDark
                    ? colors.dark.text.primary
                    : colors.light.text.primary,
                },
              ]}
              numberOfLines={2}
            >
              {displayName}
            </Text>

            {/* Order type label */}
            <Text
              variant="captionSmall"
              style={[
                styles.orderTypeLabel,
                { color: orderTypeColor },
              ]}
            >
              {orderTypeLabel}
            </Text>

            {/* Meta row */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text
                  variant="captionSmall"
                  style={{
                    color: isDark
                      ? colors.dark.text.secondary
                      : colors.light.text.secondary,
                    fontSize: ms(11),
                  }}
                  numberOfLines={1}
                >
                  {getOrderCode(item)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Icon
                  name="calendar"
                  size={ms(12)}
                  color={
                    isDark ? colors.dark.text.disabled : colors.light.text.disabled
                  }
                />
                <Text
                  variant="captionSmall"
                  style={{
                    color: isDark
                      ? colors.dark.text.secondary
                      : colors.light.text.secondary,
                    marginLeft: ms(2),
                  }}
                  numberOfLines={1}
                >
                  {formatDate(item.on_job_date)}
                  {item.on_job_time ? `, ${formatTime(item.on_job_time)}` : ''}
                </Text>
              </View>
              {item.quantity != null && (
                <View style={styles.metaItem}>
                  <Icon
                    name="cube-outline"
                    size={ms(12)}
                    color={
                      isDark
                        ? colors.dark.text.disabled
                        : colors.light.text.disabled
                    }
                  />
                  <Text
                    variant="captionSmall"
                    style={{
                      color: isDark
                        ? colors.dark.text.secondary
                        : colors.light.text.secondary,
                      marginLeft: ms(2),
                    }}
                    numberOfLines={1}
                  >
                    {Number(item.quantity).toFixed(2)} {getVolumeUnit()}
                  </Text>
                </View>
              )}
            </View>

            {/* Order status label */}
            {orderStatusLabel !== '' && (
              <View style={styles.orderStatusRow}>
                <View
                  style={[
                    styles.orderStatusPill,
                    {
                      backgroundColor: isDark
                        ? colors.orderRequest.card.dark.pillBg
                        : colors.orderRequest.card.light.pillBg,
                    },
                  ]}
                >
                  <Text
                    variant="captionSmall"
                    style={{
                      color: isDark
                        ? colors.dark.text.secondary
                        : colors.light.text.secondary,
                      fontFamily: fontFamily.medium,
                    }}
                  >
                    {orderStatusLabel}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Chevron */}
          <View style={styles.cardChevron}>
            <Icon
              name="chevron-right"
              size={ms(20)}
              color={isDark ? colors.dark.text.disabled : colors.light.text.disabled}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [isDark, handleCardPress],
  );

  const renderEmpty = () => {
    if (isLoading || isFilterLoading) {
      return (
        <View style={styles.loadingContainer}>
          <TruckLoader size={100} color="dark" message={t('common.loading')} fontSize={ms(14)} />
        </View>
      );
    }
    return (
      <EmptyView
        icon="clipboard-text-outline"
        title={t('orderRequestList.empty')}
        subtitle={
          searchText
            ? t('orderRequestList.emptySearch')
            : t('orderRequestList.emptyMessage')
        }
      />
    );
  };


  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <ScreenContainer edges={[]} usePlainView={false}>
      {/* Header */}
      <ScreenHeader
        title={t('orderRequestList.title')}
        showBackButton
        showRefreshButton
        onRefresh={handleRefresh}
        isRefreshing={isManualRefreshing}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <TruckLoader size={100} color="dark" message={t('common.loading')} fontSize={ms(14)} />
        </View>
      ) : (
        <>
          {/* Create button & subtitle */}
          <View style={styles.headerInfoSection}>
            <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor: colors.primary.main,
                    ...Platform.select({
                      ios: {
                        shadowColor: colors.primary.dark,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                      },
                      android: {
                        elevation: 4,
                      },
                    }),
                  },
                ]}
                onPress={handleCreatePress}
                activeOpacity={0.8}
              >
                <View style={styles.createButtonIconCircle}>
                  <Icon name="plus" size={ms(20)} color={colors.primary.main} />
                </View>
                <View style={styles.createButtonContent}>
                  <Text variant="body" style={styles.createButtonTitle}>
                    {t('orderRequestList.createNew')}
                  </Text>
                  <Text variant="captionSmall" style={styles.createButtonSubtitle}>
                    {t('orderRequestList.tapToSubmit')}
                  </Text>
                </View>
              </TouchableOpacity>

            {/* Subtitle row */}
            <View style={styles.subtitleRow}>
              <View style={styles.subtitleLeft}>
                <Icon
                  name="clipboard-text-outline"
                  size={ms(14)}
                  color={colors.primary.main}
                />
                <Text
                  variant="caption"
                  style={{
                    color: isDark
                      ? colors.dark.text.secondary
                      : colors.light.text.secondary,
                    marginLeft: ms(6),
                  }}
                >
                  {t('orderRequestList.overview')}
                </Text>
              </View>
              <View
                style={[
                  styles.totalBadge,
                  {
                    backgroundColor: isDark
                      ? colors.semiTransparent.white10
                      : colors.semiTransparent.black06,
                  },
                ]}
              >
                <Text
                  variant="captionSmall"
                  style={{
                    color: isDark
                      ? colors.dark.text.secondary
                      : colors.light.text.secondary,
                    fontFamily: fontFamily.semiBold,
                  }}
                >
                  {counts.total} {t('common.total')}
                </Text>
              </View>
            </View>
          </View>

          {/* Fixed tabs & search */}
          {renderFilterTabs()}
          {renderSearchBar()}

          {/* List */}
          <FlatList
        data={isFilterLoading ? [] : filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + ms(30) },
          filteredOrders.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={OrderRequestSeparator}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
        </>
      )}
    </ScreenContainer>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const OrderRequestSeparator = () => <View style={{ height: ms(10) }} />;

const styles = StyleSheet.create({
  // Header
  headerInfoSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: ms(8),
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    paddingVertical: ms(7),
    paddingHorizontal: ms(12),
    gap: ms(10),
  },
  createButtonIconCircle: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: colors.common.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonContent: {
    flex: 1,
  },
  createButtonTitle: {
    color: colors.common.white,
    fontFamily: fontFamily.semiBold,
  },
  createButtonSubtitle: {
    color: colors.semiTransparent.white70,
    marginTop: ms(1),
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: ms(10),
  },
  subtitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalBadge: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(3),
    borderRadius: ms(12),
  },

  // Filter tabs
  filterTabsScroll: {
    flexGrow: 0,
    overflow: 'visible',
  },
  filterTabsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: ms(4),
    paddingBottom: ms(20),
    gap: ms(6),
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(14),
    height: ms(36),
    borderRadius: ms(18),
    borderWidth: 1,
    gap: ms(6),
  },
  filterTabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    textAlignVertical: 'center',
  },
  filterTabBadge: {
    minWidth: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(5),
  },
  filterTabBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
    textAlignVertical: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: ms(10),
    paddingBottom: ms(10),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: ms(8),
    paddingRight: ms(3),
    paddingVertical: ms(2),
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
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // Card
  card: {
    flexDirection: 'row',
    borderRadius: ms(12),
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.common.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardAccent: {
    width: ms(52),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(6),
  },
  cardContent: {
    flex: 1,
    paddingVertical: ms(12),
    paddingHorizontal: ms(12),
  },
  companyName: {
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
    marginRight: ms(45),
    marginBottom: ms(4),
  },
  statusBadge: {
    position: 'absolute',
    top: ms(8),
    right: ms(8),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(10),
    gap: ms(4),
    zIndex: 2,
  },
  statusDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
  },
  jobName: {
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(4),
  },
  orderTypeLabel: {
    fontFamily: fontFamily.medium,
    marginBottom: ms(8),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: ms(12),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderStatusRow: {
    marginTop: ms(8),
  },
  orderStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: ms(10),
    paddingVertical: ms(3),
    borderRadius: ms(6),
  },
  cardChevron: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: ms(4),
    paddingLeft: ms(2),
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: vs(120),
  },
});

export default OrderRequestListScreen;
