import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, StatusBadge, Icon } from '../common';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, breakpoint } from '../../utils/responsive';
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

const PROGRESS_STATUSES = [
  { key: 'loading', label: 'Loading', color: '#FF9800' },
  { key: 'to_job', label: 'To Job', color: '#8BC34A' },
  { key: 'at_job', label: 'At Job', color: '#4CAF50' },
  { key: 'pouring', label: 'Pouring', color: '#009688' },
  { key: 'at_plant', label: 'Poured', color: '#1565C0' },
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
    const tc = seg?.ticket_count ?? seg?.ticketCount ?? 0;
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

interface OrderCardProps {
  order: any;
  showDetails?: boolean;
  progressBarColors?: Record<string, string> | null;
  onPress?: () => void;
  onOrderDetails?: () => void;
  onTicket?: () => void;
  onWeatherPress?: () => void;
  onMap?: () => void;
  onChat?: () => void;
  onFavoritePress?: () => void;
  orderDetailsDisabled?: boolean;
  ticketDisabled?: boolean;
  mapDisabled?: boolean;
  chatDisabled?: boolean;
  isLoading?: boolean;
  isWeatherLoading?: boolean;
  isMapLoading?: boolean;
  isChatLoading?: boolean;
  isFavorite?: boolean;
  showOrderDetailsButton?: boolean;
  showTicketButton?: boolean;
  showMapButton?: boolean;
  showChatButton?: boolean;
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

export const OrderCard: React.FC<OrderCardProps> = React.memo(({
  order,
  showDetails = true,
  progressBarColors,
  onPress,
  onOrderDetails,
  onTicket,
  onWeatherPress,
  onMap,
  onChat,
  onFavoritePress,
  orderDetailsDisabled = false,
  ticketDisabled = false,
  mapDisabled = false,
  chatDisabled = false,
  isLoading = false,
  isWeatherLoading = false,
  isMapLoading = false,
  isChatLoading = false,
  isFavorite = false,
  showOrderDetailsButton = true,
  showTicketButton = true,
  showMapButton = true,
  showChatButton = true,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const progress = order.progress || 0;

  const statusColor = getStatusColor(order.status, progress);


  const { fills: progressFills, atPlantQty } = computeCumulativeFills(
    order.deliveryProgress?.segments || [],
    order.totalLoads ?? 0,
    order.ticketsCount ?? order.completedLoads ?? 0,
  );
  const orderedQty = order.quantity ?? order.ordered_qty ?? 0;
  const completionPercent = orderedQty > 0 ? ((atPlantQty / orderedQty) * 100).toFixed(2) : '0.00';
  // Web uses delivered_percentage (not at_plant%) for the completion color thresholds
  const deliveredPercent = order.deliveryProgress?.overall_percentage ?? progress ?? 0;

  // Card color (status badge, bottom border, shadow) driven by delivery % tier
  const cardTierColor = getCompletionColor(deliveredPercent);

  // Use progress_bar_colors from API (system-level config), fall back to static defaults
  const segmentColors = PROGRESS_STATUSES.map(status => {
    return progressBarColors?.[status.key] || status.color;
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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
    if (rate < 0.10) return 'Low';
    if (rate < 0.20) return 'Moderate';
    if (rate < 0.30) return 'High';
    if (rate < 0.40) return 'Very High';
    return 'Severe';
  };


  const getWeatherIcon = (iconCode: string | null | undefined): string => {
    if (!iconCode) return '🌡️';

    const iconMap: Record<string, string> = {
      '01d': '☀️',
      '01n': '🌙',
      '02d': '🌤️',
      '02n': '☁️',
      '03d': '⛅',
      '03n': '☁️',
      '04d': '☁️',
      '04n': '☁️',
      '09d': '🌧️',
      '09n': '🌧️',
      '10d': '🌧️',
      '10n': '🌧️',
      '11d': '⛈️',
      '11n': '⛈️',
      '13d': '🌨️',
      '13n': '🌨️',
      '50d': '🌫️',
      '50n': '🌫️',
    };

    return iconMap[iconCode] || '🌡️';
  };

  return (
    <Card
      padding="none"
      style={[
        styles.card,
        {
          shadowColor: cardTierColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          borderBottomWidth: 3,
          borderBottomColor: cardTierColor,

          ...(Platform.OS === 'android' && {
            elevation: 4,
          }),
        },
      ]}>
      <View style={styles.cardInnerContainer}>
        <View style={styles.cardTouchable}>
        <View style={styles.cardContent}>
          <View style={[styles.headerRow, { gap: ms(headerSizes.headerGap) }]}>
            <View style={styles.statusBadgeContainer}>
              <StatusBadge
                status={order.status}
                size="xsmall"
                customColor={cardTierColor}
              />
            </View>
            <Text
              variant="captionSmall"
              color="secondary"
              numberOfLines={1}
              style={[styles.orderId, { color: isDark ? themeColors.text.hint : colors.grey[80], fontSize: ms(headerSizes.orderCodeFont) }]}>
              {order.orderCode}
            </Text>
            <Text
              variant="captionSmall"
              numberOfLines={1}
              style={[styles.dateTime, { color: isDark ? themeColors.text.hint : colors.grey[80], fontSize: ms(headerSizes.dateTimeFont) }]}>
              {formatDate(order.scheduledDate)} {order.scheduledTime}
            </Text>
            {weatherData && weatherData.temperature !== null && (
              <TouchableOpacity
                style={styles.headerWeatherRow}
                onPress={onWeatherPress}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.weatherEmoji}>
                  {getWeatherIcon(weatherData?.iconCode)}
                </Text>
                <Text
                  variant="captionSmall"
                  style={[styles.headerWeatherTemp, { color: isDark ? themeColors.text.hint : colors.grey[60], fontSize: ms(headerSizes.weatherTempFont) }]}>
                  {Math.round(weatherData?.temperature ?? 0)}°F
                </Text>
                {evaporationRateValue !== null && (
                  <View style={[styles.headerEvapBadge, { backgroundColor: getEvaporationBgColor(evaporationRateValue), paddingHorizontal: ms(headerSizes.evapBadgePadding) }]}>
                    <Text style={[styles.headerEvapText, { fontSize: ms(headerSizes.evapBadgeFont) }]}>
                      {getEvaporationText(evaporationRateValue)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onFavoritePress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={isFavorite ? 'star' : 'star-outline'}
                size={ms(headerSizes.starIcon)}
                color={isFavorite ? colors.warning.main : (isDark ? colors.grey[50] : colors.grey[40])}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.titleRow}>
            <Text variant="bodySmall"
              numberOfLines={1} style={styles.projectName}>
              {order.customerName}{order.projectName ? ` | ${order.projectName}` : ''}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Icon
              name="map-marker-outline"
              size={ms(12)}
              color={themeColors.text.secondary}
            />
            <Text
              variant="captionSmall"
              numberOfLines={1}
              style={[styles.locationText, { color: themeColors.text.secondary }]}>
              {order.deliveryAddress}
            </Text>
          </View>

          <View style={styles.productRow}>
            <Icon
              name="package-variant"
              size={ms(12)}
              color={isDark ? themeColors.text.hint : colors.grey[50]}
            />
            <Text
              variant="captionSmall"
              numberOfLines={1}
              style={[styles.productText, { color: isDark ? themeColors.text.hint : colors.grey[60] }]}>
              {order.productType || ''}{order.product_description ? ` | ${order.product_description}` : ''}
            </Text>
          </View>

          {showDetails && (
            <>
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
                                {status.label}
                              </Text>
                            </View>
                          );
                        })
                      ) : (
                        <>
                          <Text style={[styles.tooltipText, { color: themeColors.text.primary }]}>
                            {PROGRESS_STATUSES.find(s => s.key === tooltipKey)?.label}: {order.completedLoads || 0}/{order.totalLoads || 0} Loads
                          </Text>
                          <Text style={[styles.tooltipTextSub, { color: themeColors.text.secondary }]}>
                            Remaining: {Math.max(0, (order.totalLoads || 0) - (order.completedLoads || 0))}/{order.totalLoads || 0}
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                </Modal>

                <View style={styles.completionRow}>
                  <Text style={[styles.completionText, { color: getCompletionColor(deliveredPercent) }]}>
                    {completionPercent}% Completed
                  </Text>
                </View>

                <View style={styles.loadsCountRow}>
                  <ConcreteTruck width={ms(14)} height={ms(10)} color={themeColors.text.secondary} />
                  <Text style={[styles.loadsCountText, { color: themeColors.text.secondary }]}>
                    {order.completedLoads || 0}/{order.totalLoads || 0} Loads
                  </Text>
                </View>
              </View>

              {order.distance && (
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Icon
                      name="map-marker-distance"
                      size={ms(12)}
                      color={themeColors.text.hint}
                    />
                    <Text variant="captionSmall" color="hint">
                      {order.distance}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {(showOrderDetailsButton || (showTicketButton && order.canTicketed) || showMapButton || (showChatButton && order.canChat)) && (() => {
        const showDetails = showOrderDetailsButton;
        const showTicket = showTicketButton && order.canTicketed;
        const showMap = showMapButton;
        const showChat = showChatButton && order.canChat;
        const dividerStyle = [styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }];

        return (
          <View style={[styles.actionRow, { backgroundColor: isDark ? colors.dark.cardElevated : colors.grey[5] }]}>
            {showDetails && (
              <ActionButton
                icon="clipboard-text-outline"
                label="Details"
                onPress={onOrderDetails}
                disabled={orderDetailsDisabled}
                isLoading={isLoading}
              />
            )}
            {showDetails && (showTicket || showMap || showChat) && (
              <View style={dividerStyle} />
            )}
            {showTicket && (
              <ActionButton
                icon="ticket-outline"
                label="Ticket"
                onPress={onTicket}
                disabled={ticketDisabled}
              />
            )}
            {showTicket && (showMap || showChat) && (
              <View style={dividerStyle} />
            )}
            {showMap && (
              <ActionButton
                icon="map-marker-radius-outline"
                label="Map"
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
                label="Chat"
                onPress={onChat}
                disabled={chatDisabled}
                isLoading={isChatLoading}
              />
            )}
          </View>
        );
      })()}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: ms(10),

    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',

    marginBottom: Platform.OS === 'ios' ? 4 : 2,
  },
  cardInnerContainer: {
    borderRadius: ms(10),
    overflow: 'hidden',
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
    marginBottom: ms(4),
  },
  statusBadgeContainer: {
    flexShrink: 0,
    flexGrow: 0,
  },
  favoriteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: ms(2),
  },
  orderId: {
    fontFamily: fontFamily.semiBold,
    flexShrink: 0,
  },
  dateTime: {
    fontFamily: fontFamily.medium,
    flexShrink: 1,
    flex: 1,
  },
  headerWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(2),
    flexShrink: 0,
  },
  weatherEmoji: {
    fontSize: ms(14),
  },
  headerWeatherTemp: {
    fontFamily: fontFamily.medium,
  },
  headerEvapBadge: {
    borderRadius: ms(10),
  },
  headerEvapText: {
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    lineHeight: ms(13),
  },
  titleRow: {
    marginBottom: ms(4),
  },
  projectName: {
    fontSize: ms(10),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  locationText: {
    flex: 1,
    fontSize: ms(11),
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(4),
    gap: ms(4),
  },
  productText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
    flex: 1,
  },
  loadsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
    marginLeft: ms(6),
    flexShrink: 0,
  },
  loadsText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  cyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: ms(6),
    flexShrink: 0,
  },
  cyText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },
  cyLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
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
  segmentedProgressContainer: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: ms(2),
    overflow: 'hidden',
  },
  progressBarSegment: {
    height: '100%',
  },
  segmentedProgressSection: {
    marginBottom: ms(4),
    marginTop: ms(6),
  },
  progressBarMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  segmentBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(6),
    flexGrow: 1,
    flexShrink: 1,
  },
  segmentBarWrapper: {
    flex: 1,
    height: '100%',
  },
  segmentTrack: {
    flex: 1,
    height: '100%',
    borderRadius: ms(2),
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  segmentFillOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: ms(2),
  },
  segmentDivider: {
    width: ms(1),
    height: ms(10),
    opacity: 0.3,
  },
  segmentDividerDotted: {
    width: 0,
    height: ms(12),
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  cyValueText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
    flexShrink: 0,
    flexGrow: 0,
  },
  completionRow: {
    alignItems: 'flex-end',
    marginTop: ms(2),
  },
  completionText: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
  },
  loadsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginTop: ms(2),
  },
  loadsCountText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  tooltipBackdrop: {
    flex: 1,
  },
  tooltipContainer: {
    position: 'absolute',
    left: ms(12),
    borderRadius: ms(6),
    paddingVertical: ms(4),
    paddingHorizontal: ms(8),
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(1.5),
  },
  tooltipDot: {
    width: ms(5),
    height: ms(5),
    borderRadius: ms(2.5),
    marginRight: ms(5),
  },
  tooltipLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  tooltipText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  tooltipTextSub: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    marginTop: ms(1),
  },
  segmentedScrollContent: {
    paddingRight: ms(10),
  },
  segmentedProgressInner: {
  },
  segmentLabelsRow: {
    flexDirection: 'row',
    marginBottom: ms(2),
  },
  segmentLabelContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: ms(2),
  },
  segmentLabelText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  segmentValuesRow: {
    flexDirection: 'row',
    marginTop: ms(2),
  },
  segmentValueContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: ms(2),
  },
  segmentValueText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  segmentLabelsInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: ms(4),
    gap: ms(8),
  },
  segmentLabelInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  segmentLabelDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  segmentLabelInlineText: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
  },
  segmentValuesInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: ms(4),
  },
  segmentValueInlineText: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginBottom: ms(4),
  },
  statusLabelDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  statusLabelText: {
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
  },
  progressPercent: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    minWidth: ms(28),
    textAlign: 'right',
  },
  loadsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: ms(4),
    marginBottom: ms(6),
  },
  weatherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: ms(6),
    gap: ms(4),
  },
  weatherDescText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    maxWidth: ms(70),
  },
  weatherDot: {
    width: ms(2),
    height: ms(2),
    borderRadius: ms(1),
  },
  evapRateBadge: {
    paddingHorizontal: ms(8),
    borderRadius: ms(10),
  },
  evapRateText: {
    fontSize: ms(8),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    lineHeight: ms(13),
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
