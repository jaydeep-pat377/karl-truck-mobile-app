import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
<<<<<<< Updated upstream
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
=======
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, StatusBadge, WeatherBadge } from '../common';
import { Order } from '../../types';
import { colors, statusColorMap } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
<<<<<<< Updated upstream
import { spacing, ms, iconSizes } from '../../utils/responsive';
=======
import { ms, breakpoint } from '../../utils/responsive';
import { WeatherIcon } from '../../utils/weatherIcon';
import { getStatusColor } from '../../utils/statusUtils';
import { TicketTrackingStatus } from '../../types';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';

// Responsive sizes for header elements based on screen size
const headerSizes = {
  orderCodeFont: breakpoint(9, 11, 12),
  dateTimeFont: breakpoint(8, 10, 11),
  weatherTempFont: breakpoint(8, 10, 11),
  evapBadgeFont: breakpoint(7, 8, 9),
  evapBadgePadding: breakpoint(4, 8, 10),
  weatherIcon: breakpoint(10, 12, 14),
  starIcon: breakpoint(14, 16, 18),
  headerGap: breakpoint(2, 4, 6),
};

const getTicketStatusColor = (status: TicketTrackingStatus | undefined): string | undefined => {
  if (!status) return undefined;

  const statusColorMap: Record<string, string> = {
    pending: colors.trackingStatus.pending,
    ticketed: colors.trackingStatus.ticketed,
    loading: colors.trackingStatus.loading,
    loaded: colors.trackingStatus.loaded,
    to_job: colors.trackingStatus.toJob,
    at_job: colors.trackingStatus.atJob,
    pouring: colors.trackingStatus.pouring,
    poured: colors.trackingStatus.poured,
    washing: colors.trackingStatus.washing,
    to_plant: colors.trackingStatus.toPlant,
    at_plant: colors.trackingStatus.atPlant,
    cancelled: colors.trackingStatus.cancelled,
    voided: colors.trackingStatus.voided,
  };

  return statusColorMap[status];
};

const getSegmentColor = (status: string): string => {
  const statusColorMap: Record<string, string> = {
    pending: colors.trackingStatus.pending,
    ticketed: colors.trackingStatus.ticketed,
    loading: colors.trackingStatus.loading,
    loaded: colors.trackingStatus.loaded,
    to_job: colors.trackingStatus.toJob,
    at_job: colors.trackingStatus.atJob,
    on_job: colors.trackingStatus.atJob,
    pouring: colors.trackingStatus.pouring,
    poured: colors.trackingStatus.poured,
    washing: colors.trackingStatus.washing,
    to_plant: colors.trackingStatus.toPlant,
    at_plant: colors.trackingStatus.atPlant,
    cancelled: colors.trackingStatus.cancelled,
    voided: colors.trackingStatus.voided,
    remaining: colors.trackingStatus.remaining,
  };

  return statusColorMap[status.toLowerCase()] || colors.trackingStatus.remaining;
};

const getStatusDisplayLabel = (status: string | undefined): string => {
  if (!status) return '';
  const labelMap: Record<string, string> = {
    pending: 'Pending',
    ticketed: 'Ticketed',
    loading: 'Loading',
    loaded: 'Loaded',
    to_job: 'To Job',
    at_job: 'At Job',
    on_job: 'On Job',
    pouring: 'Pouring',
    poured: 'Poured',
    washing: 'Washing',
    to_plant: 'To Plant',
    at_plant: 'At Plant',
    cancelled: 'Cancelled',
    voided: 'Voided',
  };
  return labelMap[status.toLowerCase()] || status;
};

const SegmentStripes: React.FC<{ color: string; patternId: string }> = React.memo(({ color, patternId }) => (
  <Svg style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern
        id={patternId}
        patternUnits="userSpaceOnUse"
        width={4}
        height={4}
        patternTransform="rotate(45)"
      >
        <Line x1={0} y1={0} x2={0} y2={4} stroke={color} strokeWidth={1.5} strokeOpacity={0.35} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
  </Svg>
));

const FALLBACK_SEGMENT_COLOR = '#6b7280';

const PROGRESS_STATUSES = [
  { key: 'loading', colorKey: 'loading', label: 'Loading', i18nKey: 'orderCard.status.loading' },
  { key: 'to_job', colorKey: 'to_job', label: 'To Job', i18nKey: 'orderCard.status.toJob' },
  { key: 'at_job', colorKey: 'at_job', label: 'At Job', i18nKey: 'orderCard.status.atJob' },
  { key: 'pouring', colorKey: 'pouring', label: 'Pouring', i18nKey: 'orderCard.status.pouring' },
  { key: 'at_plant', colorKey: 'poured', label: 'Poured', i18nKey: 'orderCard.status.poured' },
];

// Exact same logic as web SegmentedProgressBar (order-card.tsx lines 227-277)
const computeCumulativeFills = (
  segments: any[],
  totalLoads: number,
  totalTickets: number,
): { fills: number[]; atPlantQty: number } => {
  // Get ticket counts per status from segments
  const ticketCountByStatus: Record<string, number> = {};
  let hasTicketCounts = false;
  for (const { key } of PROGRESS_STATUSES) {
    const seg = (segments || []).find((s: any) => s.status === key);
    const tc = seg?.ticketCount ?? 0;
    ticketCountByStatus[key] = tc;
    if (tc > 0) hasTicketCounts = true;
  }

  let fills: number[];

  if (hasTicketCounts) {
    // Cumulative: for status at index i, count = sum of ticketCounts at index >= i
    const cumulativeByStatus: Record<string, number> = {};
    for (let i = 0; i < PROGRESS_STATUSES.length; i++) {
      let sum = 0;
      for (let j = i; j < PROGRESS_STATUSES.length; j++) {
        sum += ticketCountByStatus[PROGRESS_STATUSES[j].key];
      }
      cumulativeByStatus[PROGRESS_STATUSES[i].key] = sum;
    }

    // Total = totalLoads from Product Schedule, fallback to totalTickets, then cumulative
    const total = totalLoads ?? totalTickets ?? cumulativeByStatus['loading'] ?? 0;

    fills = PROGRESS_STATUSES.map(({ key }) => {
      const cumulative = cumulativeByStatus[key];
      return total > 0 ? Math.round((cumulative / total) * 100) : 0;
    });
  } else {
    // Fallback: use segment percentage to compute cumulative fills
    const percentByStatus: Record<string, number> = {};
    for (const { key } of PROGRESS_STATUSES) {
      const seg = (segments || []).find((s: any) => s.status === key);
      percentByStatus[key] = seg?.percentage ?? 0;
    }

    fills = PROGRESS_STATUSES.map((_status, i) => {
      let sum = 0;
      for (let j = i; j < PROGRESS_STATUSES.length; j++) {
        sum += percentByStatus[PROGRESS_STATUSES[j].key];
      }
      return Math.min(Math.round(sum), 100);
    });
  }

  // Get at_plant qty for "% Completed" text
  const atPlantSeg = (segments || []).find((s: any) => s.status === 'at_plant');
  const atPlantQty = atPlantSeg?.qty ?? 0;

  return { fills, atPlantQty };
};

const getCompletionColor = (percent: number): string => {
  if (percent >= 90) return '#458B00';
  if (percent >= 60) return '#F7BB00';
  return '#C43926';
};

// Same logic as web's getOrderStatusCategory (orderStatusValidation.ts)
type OrderStatusCategory = 'PRE_POUR' | 'IN_PROCESS' | 'COMPLETED' | 'CANCELED';

const getOrderStatusCategory = (order: {
  isRemoved?: boolean;
  currentStatus?: number;
  deliveredQuantity?: number;
  quantity?: number;
  isLastLoadCompleted?: boolean;
}): OrderStatusCategory => {
  if (order.isRemoved === true) return 'CANCELED';

  const ticketedQty = order.deliveredQuantity ?? 0; // delivered_qty = delv_qty = web's ticketed_qty
  if (ticketedQty > 0) {
    const lastLoadCompleted = order.isLastLoadCompleted ?? false;
    const orderedQty = order.quantity ?? 0;
    const gap = orderedQty - ticketedQty;
    const roundedGap = Math.round(gap * 100) / 100;
    if (lastLoadCompleted && roundedGap <= 0.02) return 'COMPLETED';
    return 'IN_PROCESS';
  }

  if (order.currentStatus === 4) return 'COMPLETED';
  return 'PRE_POUR';
};

// Same label mapping as web's getCardStatus
const getStatusLabelKey = (order: any): string => {
  const category = getOrderStatusCategory(order);
  switch (category) {
    case 'CANCELED': return 'orderCard.status.canceled';
    case 'COMPLETED': return 'orderCard.status.completed';
    case 'IN_PROCESS': return 'orderCard.status.inProcess';
    case 'PRE_POUR': {
      const cs = order.currentStatus ?? 0;
      switch (cs) {
        case 0: return 'orderCard.status.prePourNormal';
        case 1: return 'orderCard.status.prePourWillCall';
        case 2: return 'orderCard.status.prePourWeatherPermitting';
        case 3: return 'orderCard.status.prePourHold';
        case 5: return 'orderCard.status.prePourWaitList';
        default: return 'orderCard.status.normal';
      }
    }
    default: return 'orderCard.status.normal';
  }
};
>>>>>>> Stashed changes

interface OrderCardProps {
  order: Order;
  showDetails?: boolean;
  onPress?: () => void;
  onOrderDetails?: () => void;
  onTicket?: () => void;
  onWeatherPress?: () => void;
  orderDetailsDisabled?: boolean;
  ticketDisabled?: boolean;
  isLoading?: boolean;
  isWeatherLoading?: boolean;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onPress,
  disabled = false,
  isLoading = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && !disabled && !isLoading && styles.actionButtonPressed,
        (disabled || isLoading) && styles.actionButtonDisabled,
      ]}>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary.main} />
      ) : (
        <>
          <Icon
            name={icon}
            size={ms(14)}
            color={disabled ? themeColors.text.disabled : colors.primary.main}
          />
          <Text
            variant="captionSmall"
            style={[
              styles.actionButtonText,
              { color: disabled ? themeColors.text.disabled : themeColors.text.secondary },
            ]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  showDetails = true,
  onPress,
  onOrderDetails,
  onTicket,
  onWeatherPress,
  orderDetailsDisabled = false,
  ticketDisabled = false,
  isLoading = false,
  isWeatherLoading = false,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  const statusColor = statusColorMap[order.status] || colors.secondary.main;
  const progress = order.progress || 0;

<<<<<<< Updated upstream
=======
  const statusColor = getStatusColor(order.status, progress);


  const { fills: progressFills, atPlantQty } = computeCumulativeFills(
    order.deliveryProgress?.segments || [],
    order.totalLoads ?? 0,
    order.ticketsCount ?? order.completedLoads ?? 0,
  );
  const orderedQty = order.quantity ?? order.ordered_qty ?? 0;
  const completionPercent = orderedQty > 0 ? ((atPlantQty / orderedQty) * 100).toFixed(2) : '0.00';
  // Web uses delv_qty / ordered_qty (= order.progress) for the completion color thresholds.
  // delivery_progress.overall_percentage is a different (lower) value that only counts
  // at_job+ statuses, so we must NOT use it here — it would show red when web shows green.
  const deliveredPercent = progress;

  // Card color (status badge, bottom border, shadow) driven by delivery % tier
  const cardTierColor = getCompletionColor(deliveredPercent);

  // Status label — same logic as web's getCardStatus → getOrderStatusCategory
  const statusLabel = t(getStatusLabelKey(order));

  // Use progress_bar_colors from API (system-level config), fall back to static defaults
  const segmentColors = PROGRESS_STATUSES.map(status => {
    return progressBarColors?.[status.colorKey] || FALLBACK_SEGMENT_COLOR;
  });

  // Tooltip state
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [tooltipY, setTooltipY] = useState(0);
  const progressBarRef = useRef<View>(null);

  const showTooltip = (key: string) => {
    if (tooltipKey === key) {
      setTooltipKey(null);
      return;
    }
    progressBarRef.current?.measureInWindow((_x, y, _w, h) => {
      setTooltipY(y + h + ms(4));
      setTooltipKey(key);
    });
  };

  const handleInfoPress = () => showTooltip('all');
  const handleSegmentPress = (key: string) => showTooltip(key);

  // Build per-status qty map for tooltip
  const segmentQtyMap: Record<string, number> = {};
  for (const { key } of PROGRESS_STATUSES) {
    const seg = (order.deliveryProgress?.segments || []).find((s: any) => s.status === key);
    segmentQtyMap[key] = seg?.qty ?? 0;
  }
  const totalSegmentQty = Object.values(segmentQtyMap).reduce((sum, q) => sum + q, 0);
  const remainingQty = Math.max(0, orderedQty - totalSegmentQty);

>>>>>>> Stashed changes
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

<<<<<<< Updated upstream
=======
  const getEvaporationRate = () => {
    if (order.weather?.evaporationRate !== undefined && order.weather?.evaporationRate !== null) {
      return order.weather.evaporationRate;
    }

    if ((order as any).weather_data?.evaporation_rate !== undefined && (order as any).weather_data?.evaporation_rate !== null) {
      return (order as any).weather_data.evaporation_rate;
    }
    return null;
  };

  const evaporationRateValue = getEvaporationRate();


  const getWeatherData = () => {
    const weatherData = order.weather_data || order.weather;
    if (!weatherData) return null;

    return {
      description: weatherData.weather_description || weatherData.description || 'Partly cloudy',
      temperature: weatherData.temperature_fahrenheit ?? weatherData.temperature ?? null,
      windSpeed: weatherData.wind_speed_mph ?? weatherData.windSpeed ?? null,
      humidity: weatherData.humidity ?? null,
      condition: weatherData.weather_condition || weatherData.condition || '',
      iconCode: weatherData.weather_icon || weatherData.iconCode || null,
    };
  };

  const weatherData = getWeatherData();


  const getEvaporationBgColor = (rate: number | null) => {
    if (rate === null || rate === undefined) return colors.grey[40];
    if (rate < 0.10) return colors.success.main;
    if (rate < 0.20) return colors.warning.main;
    if (rate < 0.30) return colors.unloadingRate.light;
    if (rate < 0.40) return colors.unloadingRate.medium;
    return colors.unloadingRate.dark;
  };


  const getEvaporationText = (rate: number | null) => {
    if (rate === null || rate === undefined) return '';
    if (rate < 0.10) return t('orderCard.weatherRisk.low');
    if (rate < 0.20) return t('orderCard.weatherRisk.moderate');
    if (rate < 0.30) return t('orderCard.weatherRisk.high');
    if (rate < 0.40) return t('orderCard.weatherRisk.veryHigh');
    return t('orderCard.weatherRisk.severe');
  };


  // Weather icon logic moved to shared WeatherIcon component

>>>>>>> Stashed changes
  return (
    <Card padding="none" style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={isLoading}
        style={styles.cardTouchable}>
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <StatusBadge status={order.status} size="small" />
              <Text variant="captionSmall" color="secondary" style={styles.orderId}>
                #{order.orderCode}
              </Text>
              <Text variant="captionSmall" color="hint" style={styles.dateTime}>
                {formatDate(order.scheduledDate)} • {order.scheduledTime}
              </Text>
            </View>
            {order.hasAlert && (
              <Icon
                name="alert-circle"
                size={ms(14)}
                color={colors.warning.main}
              />
            )}
          </View>

          <View style={styles.titleRow}>
            <Text variant="bodySmall" numberOfLines={1} style={styles.projectName}>
              {order.projectName || order.productType}
            </Text>
            <Text variant="captionSmall" color="secondary" numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Icon
              name="map-marker-outline"
              size={ms(12)}
              color={themeColors.text.hint}
            />
            <Text
              variant="captionSmall"
              color="hint"
              numberOfLines={1}
              style={styles.locationText}>
              {order.deliveryAddress}
            </Text>
            {(order.weather || isWeatherLoading) && (
              <WeatherBadge
                weather={order.weather}
                onPress={onWeatherPress}
                isLoading={isWeatherLoading}
                size="small"
              />
            )}
          </View>

          {showDetails && (
            <>
<<<<<<< Updated upstream
              <View style={styles.progressRow}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.progress.trackDark : colors.progress.trackLight }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
=======
              <View style={styles.segmentedProgressSection}>
                <View ref={progressBarRef} style={styles.progressBarMainRow}>
                  <Pressable onPress={handleInfoPress} hitSlop={8}>
                    <Icon
                      name="information-outline"
                      size={ms(14)}
                      color={themeColors.text.hint}
                    />
                  </Pressable>
                  <View style={styles.segmentBarsRow}>
                    {PROGRESS_STATUSES.map((status, index) => (
                      <React.Fragment key={`bar-${status.key}`}>
                        <Pressable
                          style={styles.segmentBarWrapper}
                          onPress={() => handleSegmentPress(status.key)}
                        >
                          <View style={styles.segmentTrack}>
                            <SegmentStripes color={segmentColors[index]} patternId={`stripe-${status.key}`} />
                            <View
                              style={[
                                styles.segmentFillOverlay,
                                {
                                  width: `${progressFills[index]}%`,
                                  backgroundColor: segmentColors[index],
                                },
                              ]}
                            />
                          </View>
                        </Pressable>
                        {index < PROGRESS_STATUSES.length - 1 && (
                          <View style={[styles.segmentDividerDotted, { borderColor: themeColors.text.hint }]} />
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.cyValueText, { color: themeColors.text.primary }]}
                  >
                    {orderedQty.toFixed(2)} CY
                  </Text>
                </View>

                <Modal
                  visible={tooltipKey !== null}
                  transparent
                  animationType="none"
                  onRequestClose={() => setTooltipKey(null)}
                >
                  <Pressable style={styles.tooltipBackdrop} onPress={() => setTooltipKey(null)}>
                    <View
                      style={[
                        styles.tooltipContainer,
                        {
                          top: tooltipY,
                          backgroundColor: isDark ? colors.dark.cardElevated : colors.common.white,
                          borderColor: isDark ? colors.dark.border : colors.grey[15],
                        },
                      ]}
                    >
                      {tooltipKey === 'all' ? (
                        PROGRESS_STATUSES.map((status) => {
                          const colorIdx = PROGRESS_STATUSES.findIndex(s => s.key === status.key);
                          return (
                            <View key={status.key} style={styles.tooltipRow}>
                              <View style={[styles.tooltipDot, { backgroundColor: segmentColors[colorIdx] }]} />
                              <Text style={[styles.tooltipLabel, { color: themeColors.text.primary }]}>
                                {t(status.i18nKey)}
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <>
                          <Text style={[styles.tooltipText, { color: themeColors.text.primary }]}>
                            {t(PROGRESS_STATUSES.find(s => s.key === tooltipKey)?.i18nKey || '')}: {order.completedLoads || 0}/{order.totalLoads || 0} {t('orderCard.loads')}
                          </Text>
                          <Text style={[styles.tooltipTextSub, { color: themeColors.text.secondary }]}>
                            {t('orderCard.remaining')}: {Math.max(0, (order.totalLoads || 0) - (order.completedLoads || 0))}/{order.totalLoads || 0}
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                </Modal>

                <View style={styles.completionRow}>
                  <Text style={[styles.completionText, { color: getCompletionColor(deliveredPercent) }]}>
                    {t('orderCard.percentCompleted', { percent: completionPercent })}
                  </Text>
                </View>

                <View style={styles.loadsCountRow}>
                  <ConcreteTruck width={ms(14)} height={ms(10)} color={themeColors.text.secondary} />
                  <Text style={[styles.loadsCountText, { color: themeColors.text.secondary }]}>
                    {t('orderCard.loadsRatio', { completed: order.completedLoads || 0, total: order.totalLoads || 0 })}
                  </Text>
>>>>>>> Stashed changes
                </View>
                <Text
                  variant="captionSmall"
                  style={[styles.progressPercent, { color: statusColor }]}>
                  {progress}%
                </Text>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Icon
                    name="truck-outline"
                    size={ms(12)}
                    color={themeColors.text.secondary}
                  />
                  <Text variant="captionSmall" color="secondary">
                    {order.completedLoads || 0}/{order.totalLoads || 0}
                  </Text>
                </View>

                <View style={[styles.metricDot, { backgroundColor: themeColors.text.hint }]} />

                {order.estimatedFinishTime && (
                  <>
                    <View style={styles.metricItem}>
                      <Icon
                        name="clock-outline"
                        size={ms(12)}
                        color={themeColors.text.secondary}
                      />
                      <Text variant="captionSmall" color="secondary">
                        {order.estimatedFinishTime}
                      </Text>
                    </View>
                    <View style={[styles.metricDot, { backgroundColor: themeColors.text.hint }]} />
                  </>
                )}

                {order.remainingQuantity !== undefined && order.remainingQuantity > 0 && (
                  <View style={styles.metricItem}>
                    <Icon
                      name="cube-outline"
                      size={ms(12)}
                      color={themeColors.text.secondary}
                    />
                    <Text variant="captionSmall" color="secondary">
                      {order.remainingQuantity} {order.unit}
                    </Text>
                  </View>
                )}

                {order.distance && (
                  <View style={styles.metricItemRight}>
                    <Icon
                      name="map-marker-distance"
                      size={ms(12)}
                      color={themeColors.text.hint}
                    />
                    <Text variant="captionSmall" color="hint">
                      {order.distance}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>

<<<<<<< Updated upstream
      <View style={[styles.actionRow, { backgroundColor: isDark ? colors.dark.cardElevated : colors.grey[5] }]}>
        <ActionButton
          icon="clipboard-text-outline"
          label="Order Details"
          onPress={onOrderDetails}
          disabled={orderDetailsDisabled}
          isLoading={isLoading}
        />
        <View style={[styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }]} />
        <ActionButton
          icon="ticket-outline"
          label="Ticket"
          onPress={onTicket}
          disabled={ticketDisabled}
        />
=======
      {(showOrderDetailsButton || (showTicketButton && order.canTicketed) || showMapButton || (showChatButton && order.canChat) || (showOrderRequestButton && onOrderRequest)) && (() => {
        const showDetails = showOrderDetailsButton;
        const showTicket = showTicketButton && order.canTicketed;
        const showRequest = showOrderRequestButton && !!onOrderRequest;
        const showMap = showMapButton;
        const showChat = showChatButton && order.canChat;
        const dividerStyle = [styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }];

        return (
          <View style={[styles.actionRow, { backgroundColor: isDark ? colors.dark.cardElevated : colors.grey[5] }]}>
            {showDetails && (
              <ActionButton
                icon="clipboard-text-outline"
                label={t('orderCard.details')}
                onPress={onOrderDetails}
                disabled={orderDetailsDisabled}
                isLoading={isLoading}
              />
            )}
            {showDetails && (showTicket || showRequest || showMap || showChat) && (
              <View style={dividerStyle} />
            )}
            {showTicket && (
              <ActionButton
                icon="ticket-outline"
                label={t('orderCard.ticket')}
                onPress={onTicket}
                disabled={ticketDisabled}
              />
            )}
            {showTicket && (showRequest || showMap || showChat) && (
              <View style={dividerStyle} />
            )}
            {showRequest && (
              <ActionButton
                icon="file-plus-outline"
                label={t('orderCard.request')}
                onPress={onOrderRequest}
              />
            )}
            {showRequest && (showMap || showChat) && (
              <View style={dividerStyle} />
            )}
            {showMap && (
              <ActionButton
                icon="map-marker-radius-outline"
                label={t('orderCard.map')}
                onPress={onMap}
                disabled={mapDisabled}
                isLoading={isMapLoading}
              />
            )}
            {showMap && showChat && (
              <View style={dividerStyle} />
            )}
            {showChat && (
              <ActionButton
                icon="chat-outline"
                label={t('orderCard.chat')}
                onPress={onChat}
                disabled={chatDisabled}
                isLoading={isChatLoading}
                badgeCount={chatUnreadCount}
              />
            )}
          </View>
        );
      })()}
>>>>>>> Stashed changes
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: ms(10),
  },
  cardTouchable: {
    minHeight: ms(44),
  },
  cardContent: {
    paddingHorizontal: ms(12),
    paddingTop: ms(8),
    paddingBottom: ms(8),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ms(2),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: ms(5),
  },
  orderId: {
    fontFamily: fontFamily.medium,
  },
  dateTime: {
    marginLeft: ms(2),
  },
  titleRow: {
    marginBottom: ms(4),
  },
  projectName: {
    fontFamily: fontFamily.semiBold,
    lineHeight: ms(18),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  locationText: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(6),
    gap: ms(8),
  },
  progressBarBg: {
    flex: 1,
    height: ms(4),
    borderRadius: ms(2),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: ms(2),
  },
  progressPercent: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    minWidth: ms(28),
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
  },
  metricItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
    marginLeft: 'auto',
  },
  metricDot: {
    width: ms(3),
    height: ms(3),
    borderRadius: ms(1.5),
    marginHorizontal: ms(6),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(40),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ms(40),
    gap: ms(4),
  },
  actionButtonPressed: {
    backgroundColor: colors.primary.main + '15',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  actionDivider: {
    width: 1,
    height: ms(16),
  },
});

export default OrderCard;
