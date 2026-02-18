import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TopGradientBackground, TruckLoader, Icon } from '../../components/common';
import { ScheduledLoadsBottomSheet } from '../../components/orders';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, spacing } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';
import { useOrderDetails, useAlert } from '../../hooks';
import { getStatusLabel } from '../../utils/statusUtils';

type OrderProductDetailsRouteProp = RouteProp<RootStackParamList, 'OrderProductDetails'>;

const GRID = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
} as const;

interface ProductCardItem {
  productId: string;
  itemCode: string;
  description?: string;
  isMix: boolean;
  orderedQty: number;
  deliveredQty: number;
  remainingQty: number;
  slump?: string;
  qr?: string;
}

interface ScheduleDetailItem {
  schedule_id?: string;
  item_code?: string;
  description?: string;
  is_mix?: boolean;
  slump?: string;
  plant_code?: string;
  plant_description?: string;
  schedule_qty?: number;
  schedule_delv_qty?: number;
  number_of_loads?: number;
  trucks_required?: number;
  load_qty?: number;
  truck_space?: number;
  delivery_rate_per_hour?: number;
  unload_time?: number;
  unload_rate_per_hour?: number;
  distance?: number;
  time_to_job?: number;
  time_to_plant?: number;
  job_wash_time?: number;
  truck_type_name?: string;
  start_time?: string;
}

interface ScheduledLoadItem {
  load_number: number;
  scheduled_time?: string;
  actual_time?: string | null;
  scheduled_qty?: string;
  actual_qty?: string | null;
  variance?: string | null;
  truck_code?: string | null;
  scheduled_on_job_time?: string;
  scheduled_fin_pour_time?: string;
  scheduled_at_plant_time?: string;
  ticket_code?: string | null;
  actual_on_job_time?: string | null;
  actual_unload_time?: string | null;
  actual_wash_time?: string | null;
  actual_at_plant_time?: string | null;
}

export const OrderProductDetailsScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<OrderProductDetailsRouteProp>();
  const { showAlert } = useAlert();
  const themeColors = isDark ? colors.dark : colors.light;

  const { orderId, orderCode, orderDate, status, progressColor } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [showLoadsSheet, setShowLoadsSheet] = useState(false);

  const {
    orderDetails,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrderDetails({ order_code: orderCode, order_date: orderDate });

  const statusColor = progressColor || colors.primary.main;

  const jobData = useMemo(() => {
    if (!orderDetails) {
      return {
        products: [] as ProductCardItem[],
        scheduleDetails: [] as ScheduleDetailItem[],
        scheduledLoads: [] as ScheduledLoadItem[],
        scheduleTime: '',
        estimatedFinishTime: '',
        displayDate: '',
        productType: '',
        productMix: '',
        plantName: '',
        plantCode: '',
        plantPhone: '',
        plantAddress1: '',
        plantAddress2: '',
        scheduleRate: 0,
        deliveredVolume: 0,
        scheduledDelvQty: 0,
        pouredPercent: 0,
        numberOfLoads: 0,
        totalLoads: 0,
        avgWaitingMinutes: 0,
        avgPouringMinutes: 0,
        avgWashoutMinutes: 0,
      };
    }

    const products: ProductCardItem[] = (orderDetails.products || []).map((p: any) => ({
      productId: p.product_id || '',
      itemCode: p.item_code || '',
      description: p.description || '',
      isMix: p.is_mix || false,
      orderedQty: p.ordered_qty || 0,
      deliveredQty: p.delivered_qty || 0,
      remainingQty: p.remaining_qty || 0,
      slump: p.slump || '',
      qr: p.qr || '',
    }));

    const scheduleDetails: ScheduleDetailItem[] = (orderDetails as any).product_schedule_details?.map((s: any) => ({
      schedule_id: s.schedule_id,
      item_code: s.item_code,
      description: s.description,
      is_mix: s.is_mix,
      slump: s.slump,
      plant_code: s.plant_code,
      plant_description: s.plant_description,
      schedule_qty: s.schedule_qty,
      schedule_delv_qty: s.schedule_delv_qty,
      number_of_loads: s.number_of_loads,
      trucks_required: s.trucks_required,
      load_qty: s.load_qty,
      truck_space: s.truck_space,
      delivery_rate_per_hour: s.delivery_rate_per_hour,
      unload_time: s.unload_time,
      unload_rate_per_hour: s.unload_rate_per_hour,
      distance: s.distance,
      time_to_job: s.time_to_job,
      time_to_plant: s.time_to_plant,
      job_wash_time: s.job_wash_time,
      truck_type_name: s.truck_type_name,
      start_time: s.start_time,
    })) || [];
    const scheduledLoads: ScheduledLoadItem[] = (orderDetails as any).scheduled_loads?.items?.map((l: any) => ({
      load_number: l.load_number,
      ticket_code: l.ticket_code,
      qty: l.qty,
      status: l.status,
      truck_code: l.truck_code,
      scheduled_time: l.scheduled_time,
      actual_time: l.actual_time,
    })) || [];

    return {
      products,
      scheduleDetails,
      scheduledLoads,
      scheduleTime: orderDetails.start_time || '',
      estimatedFinishTime: orderDetails.estimated_finish_time || '',
      displayDate: orderDetails.order_date || '',
      productType: orderDetails.products?.[0]?.item_code || '',
      productMix: orderDetails.products?.[0]?.description || '',
      plantName: orderDetails.plant_details?.description || orderDetails.products?.[0]?.plant_code || 'N/A',
      plantCode: orderDetails.plant_details?.code || orderDetails.products?.[0]?.plant_code || '',
      plantPhone: orderDetails.plant_details?.phone || '',
      plantAddress1: orderDetails.plant_details?.address1 || '',
      plantAddress2: orderDetails.plant_details?.address2 || '',
      scheduleRate: orderDetails.graphs?.pour_speed?.schedule_rate || 0,
      deliveredVolume: orderDetails.delivered_qty || 0,
      scheduledDelvQty: (orderDetails as any).product_schedule_details?.[0]?.schedule_delv_qty || 0,
      pouredPercent: orderDetails.ordered_qty
        ? Math.round(((orderDetails.delivered_qty ?? 0) / orderDetails.ordered_qty) * 100)
        : 0,
      numberOfLoads: orderDetails.tickets_count || (orderDetails as any).scheduled_loads?.count || 0,
      totalLoads: (orderDetails as any).product_schedule_details?.[0]?.number_of_loads || orderDetails.tickets_count || 0,
      avgWaitingMinutes: orderDetails.graphs?.trucks_on_job?.averages?.avg_waiting_minutes || 0,
      avgPouringMinutes: orderDetails.graphs?.trucks_on_job?.averages?.avg_pouring_minutes || 0,
      avgWashoutMinutes: orderDetails.graphs?.trucks_on_job?.averages?.avg_washout_minutes || 0,
    };
  }, [orderDetails]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const handleCall = useCallback((phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  }, []);

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <TopGradientBackground
          height="100%"
          showWaves={true}
          waveOpacity={0.12}
          absolute={true}
          customColors={isDark
            ? colors.gradients.dark.orderDetails
            : colors.gradients.light.orderDetails
          }
        />
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="arrow-left" size={22} color={isDark ? colors.common.white : colors.grey[80]} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? colors.common.white : colors.grey[80] }]}>
              Product & Schedule Details
            </Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <TruckLoader
            size={120}
            message="Loading product details..."
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <TopGradientBackground
          height="100%"
          showWaves={true}
          waveOpacity={0.12}
          absolute={true}
          customColors={isDark
            ? colors.gradients.dark.orderDetails
            : colors.gradients.light.orderDetails
          }
        />
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="arrow-left" size={22} color={isDark ? colors.common.white : colors.grey[80]} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? colors.common.white : colors.grey[80] }]}>
              Product & Schedule Details
            </Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color={colors.error.main} />
          <Text style={[styles.errorText, { color: themeColors.text.primary }]}>
            {error || 'Failed to load product details'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary.main }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const product = jobData.products[0];
  const schedule = jobData.scheduleDetails[0];
  const statusText = getStatusLabel(status || 'NORMAL');

  const scheduleDisplay = jobData.estimatedFinishTime
    ? `${jobData.scheduleTime || 'N/A'} - ${jobData.estimatedFinishTime}`
    : jobData.scheduleTime || 'N/A';

  const formattedDate = formatDateOnly(jobData.displayDate);

  const hasAverages = (jobData.avgWaitingMinutes ?? 0) > 0 || (jobData.avgPouringMinutes ?? 0) > 0 || (jobData.avgWashoutMinutes ?? 0) > 0;
  const hasPourData = (jobData.scheduledDelvQty ?? 0) > 0 || (jobData.totalLoads ?? 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TopGradientBackground
        height="100%"
        showWaves={true}
        waveOpacity={0.12}
        absolute={true}
        customColors={isDark
          ? colors.gradients.dark.orderDetails
          : colors.gradients.light.orderDetails
        }
      />

      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={isDark ? colors.common.white : colors.grey[80]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDark ? colors.common.white : colors.grey[80] }]}>
            Product & Schedule Details
          </Text>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => refetch()} activeOpacity={0.7}>
            <Icon name="refresh" size={18} color={isDark ? colors.common.white : colors.grey[80]} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: isDark ? colors.common.white : colors.grey[80] }]}>
          Order #{orderCode}
        </Text>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.common.white}
            colors={[colors.primary.main]}
          />
        }
      >
        {/* Product Schedule Card */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconContainer, { backgroundColor: colors.primary.main }]}>
                <Icon name="clipboard-text-outline" size={16} color={colors.common.white} />
              </View>
              <Text style={[styles.cardTitle, { color: themeColors.text.primary }]}>
                Order Overview
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={[styles.infoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
              <View style={styles.infoItemHeader}>
                <Icon name="clock-start" size={14} color={colors.primary.main} />
                <Text style={[styles.infoItemLabel, { color: themeColors.text.hint }]}>Start Time</Text>
              </View>
              <Text style={[styles.infoItemValue, { color: themeColors.text.primary }]} numberOfLines={1}>
                {jobData.scheduleTime || 'N/A'}
              </Text>
              <Text style={[styles.infoItemSubValue, { color: themeColors.text.secondary }]}>
                {formattedDate}
              </Text>
            </View>

            <View style={[styles.infoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
              <View style={styles.infoItemHeader}>
                <Icon name="cube-outline" size={14} color={colors.secondary.main} />
                <Text style={[styles.infoItemLabel, { color: themeColors.text.hint }]}>Product</Text>
              </View>
              <Text style={[styles.infoItemValue, { color: themeColors.text.primary }]} numberOfLines={1}>
                {jobData.productType}
              </Text>
              <Text style={[styles.infoItemSubValue, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {jobData.productMix}
              </Text>
            </View>
          </View>

          {hasPourData && (
            <View style={[styles.infoGrid, { marginTop: GRID.xs }]}>
              <View style={[styles.infoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
                <View style={styles.infoItemHeader}>
                  <Icon name="truck-delivery" size={14} color={colors.success.main} />
                  <Text style={[styles.infoItemLabel, { color: themeColors.text.hint }]}>Delivered Qty</Text>
                </View>
                <Text style={[styles.infoItemValue, { color: colors.success.main }]}>
                  {(jobData.scheduledDelvQty ?? 0).toFixed(1)} CY
                </Text>
                <Text style={[styles.infoItemSubValue, { color: themeColors.text.secondary }]}>
                  Poured {jobData.pouredPercent}%
                </Text>
              </View>

              <View style={[styles.infoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
                <View style={styles.infoItemHeader}>
                  <Icon name="truck-delivery" size={14} color={colors.info.main} />
                  <Text style={[styles.infoItemLabel, { color: themeColors.text.hint }]}>Loads</Text>
                </View>
                <Text style={[styles.infoItemValue, { color: colors.info.main }]}>
                  {jobData.numberOfLoads}/{jobData.totalLoads}
                </Text>
              </View>
            </View>
          )}

          {hasAverages && (
            <View style={[styles.averagesRow, { backgroundColor: isDark ? themeColors.surface : colors.grey[3], marginTop: GRID.xs, marginHorizontal: GRID.md }]}>
              <View style={styles.averageItem}>
                <Icon name="clock-outline" size={12} color={colors.warning.main} />
                <Text style={[styles.averageLabel, { color: themeColors.text.hint }]}>Wait</Text>
                <Text style={[styles.averageValue, { color: themeColors.text.primary }]}>
                  {(jobData.avgWaitingMinutes ?? 0).toFixed(0)}m
                </Text>
              </View>
              <View style={[styles.averageDivider, { backgroundColor: themeColors.border }]} />
              <View style={styles.averageItem}>
                <Icon name="water" size={12} color={colors.success.main} />
                <Text style={[styles.averageLabel, { color: themeColors.text.hint }]}>Pour</Text>
                <Text style={[styles.averageValue, { color: themeColors.text.primary }]}>
                  {(jobData.avgPouringMinutes ?? 0).toFixed(0)}m
                </Text>
              </View>
              <View style={[styles.averageDivider, { backgroundColor: themeColors.border }]} />
              <View style={styles.averageItem}>
                <Icon name="shower" size={12} color={colors.info.main} />
                <Text style={[styles.averageLabel, { color: themeColors.text.hint }]}>Wash</Text>
                <Text style={[styles.averageValue, { color: themeColors.text.primary }]}>
                  {(jobData.avgWashoutMinutes ?? 0).toFixed(0)}m
                </Text>
              </View>
            </View>
          )}

          {/* Bottom spacer for proper padding */}
          <View style={{ height: GRID.md }} />
        </View>

        {/* Contact Details Card */}
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconContainer, { backgroundColor: colors.info.main }]}>
                <Icon name="office-building" size={16} color={colors.common.white} />
              </View>
              <Text style={[styles.cardTitle, { color: themeColors.text.primary }]}>
                Contact Details
              </Text>
            </View>
          </View>

          <View style={styles.contactInfoContainer}>
            <View style={styles.contactInfoRow}>
              <View style={[styles.contactInfoIcon, { backgroundColor: colors.primary.main + '12' }]}>
                <Icon name="domain" size={16} color={colors.primary.main} />
              </View>
              <View style={styles.contactInfoContent}>
                <Text style={[styles.contactInfoLabel, { color: themeColors.text.hint }]}>Plant Name</Text>
                <Text style={[styles.contactInfoValue, { color: themeColors.text.primary }]} numberOfLines={1}>
                  {jobData.plantName}
                </Text>
                {jobData.plantCode ? (
                  <Text style={[styles.contactInfoSubValue, { color: themeColors.text.secondary }]}>
                    Code: {jobData.plantCode}
                  </Text>
                ) : null}
              </View>
            </View>

            {(jobData.plantAddress1 || jobData.plantAddress2) && (
              <View style={styles.contactInfoRow}>
                <View style={[styles.contactInfoIcon, { backgroundColor: colors.secondary.main + '12' }]}>
                  <Icon name="map-marker-outline" size={16} color={colors.secondary.main} />
                </View>
                <View style={styles.contactInfoContent}>
                  <Text style={[styles.contactInfoLabel, { color: themeColors.text.hint }]}>Address</Text>
                  <Text style={[styles.contactInfoValue, { color: themeColors.text.primary }]} numberOfLines={2}>
                    {[jobData.plantAddress1, jobData.plantAddress2].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {jobData.plantPhone && (
              <View style={styles.contactInfoRow}>
                <View style={[styles.contactInfoIcon, { backgroundColor: colors.success.main + '12' }]}>
                  <Icon name="phone-outline" size={16} color={colors.success.main} />
                </View>
                <View style={styles.contactInfoContent}>
                  <Text style={[styles.contactInfoLabel, { color: themeColors.text.hint }]}>Phone</Text>
                  <Text style={[styles.contactInfoValue, { color: themeColors.text.primary }]}>
                    {jobData.plantPhone}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.callButton, { backgroundColor: colors.success.main + '12' }]}
                  onPress={() => handleCall(jobData.plantPhone)}
                  activeOpacity={0.7}>
                  <Icon name="phone" size={18} color={colors.success.main} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Product SKU Details Card */}
        {product && (
          <View style={styles.skuSection}>
            <Text style={[styles.skuSectionTitle, { color: themeColors.text.primary }]}>
              SKU Details
            </Text>

            <View style={[
              styles.skuMainCard,
              {
                backgroundColor: themeColors.card,
                borderColor: isDark ? themeColors.border : colors.grey[10],
              }
            ]}>
              {/* Header with Mix Badge */}
              <View style={[styles.skuHeader, { backgroundColor: isDark ? colors.primary.main + '20' : colors.primary.main + '08', justifyContent: 'flex-start' }]}>
                <View style={[
                  styles.skuTypeBadge,
                  { backgroundColor: product.isMix ? colors.success.main : colors.info.main }
                ]}>
                  <Icon name={product.isMix ? 'water' : 'package-variant'} size={ms(12)} color={colors.common.white} />
                  <Text style={styles.skuTypeBadgeText}>
                    {product.isMix ? 'Mix' : 'Product'}
                  </Text>
                </View>
              </View>

              {/* Schedule Details Grid */}
              {schedule && (
                <View style={[styles.skuScheduleSection, { borderTopColor: isDark ? themeColors.border : colors.grey[10] }]}>
                  <Text style={[styles.skuScheduleTitle, { color: themeColors.text.primary }]}>
                    Schedule Information
                  </Text>

                  {/* Row 1 - Loads & Quantity */}
                  <View style={styles.skuScheduleRow}>
                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="layers-triple" size={ms(18)} color={colors.secondary.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.number_of_loads ?? '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Loads</Text>
                    </View>

                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="weight" size={ms(18)} color={colors.success.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.load_qty ? `${schedule.load_qty}` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Load CY</Text>
                    </View>

                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="speedometer" size={ms(18)} color={colors.primary.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.delivery_rate_per_hour ?? '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>CY/Hr</Text>
                    </View>
                  </View>

                  {/* Row 2 - Spacing & Distance */}
                  <View style={styles.skuScheduleRow}>
                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="clock-outline" size={ms(18)} color={colors.info.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.truck_space ? `${schedule.truck_space}m` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Spacing</Text>
                    </View>

                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="map-marker-distance" size={ms(18)} color={colors.error.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.distance ? `${schedule.distance}` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Miles</Text>
                    </View>

                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="truck-fast" size={ms(18)} color={colors.success.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.time_to_job ? `${schedule.time_to_job}m` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>To Job</Text>
                    </View>
                  </View>

                  {/* Row 3 - Travel & Times */}
                  <View style={styles.skuScheduleRow}>
                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="download" size={ms(18)} color={colors.secondary.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.unload_time ? `${schedule.unload_time}m` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Unload</Text>
                    </View>

                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="water" size={ms(18)} color={colors.info.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.job_wash_time ? `${schedule.job_wash_time}m` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Wash</Text>
                    </View>

                    <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                      <Icon name="truck-delivery" size={ms(18)} color={colors.warning.main} />
                      <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                        {schedule.time_to_plant ? `${schedule.time_to_plant}m` : '-'}
                      </Text>
                      <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>To Plant</Text>
                    </View>
                  </View>

                  {/* Additional Info Row */}
                  {schedule.plant_description && (
                    <View style={styles.skuAdditionalInfo}>
                      <View style={[styles.skuInfoChip, { backgroundColor: isDark ? themeColors.surface : colors.grey[5] }]}>
                        <Icon name="factory" size={ms(14)} color={isDark ? colors.grey[40] : themeColors.text.secondary} />
                        <Text style={[styles.skuInfoChipText, { color: themeColors.text.primary }]}>
                          {schedule.plant_description}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Scheduled Loads Button */}
              {jobData.scheduledLoads && jobData.scheduledLoads.length > 0 && (
                <View style={[styles.skuLoadsSection, { borderTopColor: isDark ? themeColors.border : colors.grey[10] }]}>
                  <TouchableOpacity
                    style={styles.skuLoadsButton}
                    onPress={() => setShowLoadsSheet(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.skuLoadsHeaderLeft}>
                      <View style={[styles.skuLoadsIconBox, { backgroundColor: isDark ? colors.secondary.main + '25' : colors.secondary.main + '15' }]}>
                        <Icon name="format-list-numbered" size={ms(18)} color={colors.secondary.main} />
                      </View>
                      <View style={styles.skuLoadsButtonText}>
                        <Text style={[styles.skuLoadsTitle, { color: themeColors.text.primary }]}>
                          Scheduled Loads
                        </Text>
                        <Text style={[styles.skuLoadsSubtitle, { color: themeColors.text.secondary }]}>
                          {jobData.scheduledLoads.filter(l => !!l.actual_time).length} of {jobData.scheduledLoads.length} completed
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.skuLoadsCountBadge, { backgroundColor: colors.secondary.main }]}>
                      <Text style={styles.skuLoadsCountText}>{jobData.scheduledLoads.length}</Text>
                    </View>
                    <Icon name="chevron-right" size={ms(22)} color={themeColors.text.hint} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <ScheduledLoadsBottomSheet
        visible={showLoadsSheet}
        onClose={() => setShowLoadsSheet(false)}
        loads={jobData.scheduledLoads}
        totalLoads={jobData.scheduleDetails?.[0]?.number_of_loads}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(18),
    fontFamily: fontFamily.bold,
  },
  headerSubtitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  headerPlaceholder: {
    width: 40,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: ms(14),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: ms(8),
  },
  retryButtonText: {
    color: colors.common.white,
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    borderRadius: ms(12),
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: GRID.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  cardIconContainer: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: ms(12),
    gap: GRID.xs,
  },
  statusDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  statusText: {
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: GRID.md,
    gap: GRID.sm,
  },
  infoItem: {
    flex: 1,
    padding: GRID.sm,
    borderRadius: ms(8),
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
    marginBottom: GRID.xs,
  },
  infoItemLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
  },
  infoItemValue: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  infoItemSubValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  averagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: GRID.sm,
    borderRadius: ms(8),
  },
  averageItem: {
    alignItems: 'center',
    gap: 2,
  },
  averageLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
  },
  averageValue: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
  },
  averageDivider: {
    width: 1,
    height: ms(24),
  },
  contactInfoContainer: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  contactInfoIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  contactInfoContent: {
    flex: 1,
  },
  contactInfoLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  contactInfoValue: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  contactInfoSubValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  callButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  skuSection: {
    marginBottom: spacing.md,
  },
  skuSectionTitle: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.sm,
  },
  skuMainCard: {
    borderRadius: ms(12),
    borderWidth: 1,
    overflow: 'hidden',
  },
  skuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  skuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: GRID.sm,
  },
  skuIconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  skuHeaderText: {
    flex: 1,
  },
  skuItemCode: {
    fontSize: ms(15),
    fontFamily: fontFamily.bold,
  },
  skuDescription: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  skuTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(12),
    gap: ms(4),
  },
  skuTypeBadgeText: {
    color: colors.common.white,
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
  },
  skuScheduleSection: {
    padding: GRID.md,
    borderTopWidth: 1,
  },
  skuScheduleTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
    marginBottom: GRID.sm,
  },
  skuScheduleRow: {
    flexDirection: 'row',
    gap: GRID.sm,
    marginBottom: GRID.sm,
  },
  skuScheduleItem: {
    flex: 1,
    alignItems: 'center',
    padding: GRID.sm,
    borderRadius: ms(8),
    gap: ms(4),
  },
  skuScheduleItemWide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: GRID.sm,
    borderRadius: ms(8),
    gap: ms(8),
  },
  skuScheduleItemLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
  },
  skuScheduleItemValue: {
    fontSize: ms(14),
    fontFamily: fontFamily.bold,
  },
  skuAdditionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID.sm,
    marginTop: GRID.xs,
  },
  skuInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(16),
    gap: ms(6),
  },
  skuInfoChipText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  skuLoadsSection: {
    borderTopWidth: 1,
  },
  skuLoadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
  },
  skuLoadsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: GRID.sm,
  },
  skuLoadsIconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  skuLoadsButtonText: {
    flex: 1,
  },
  skuLoadsTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  skuLoadsSubtitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  skuLoadsCountBadge: {
    minWidth: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.xs,
  },
  skuLoadsCountText: {
    color: colors.common.white,
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },
  bottomSpacer: {
    height: ms(100),
  },
});

export default OrderProductDetailsScreen;
