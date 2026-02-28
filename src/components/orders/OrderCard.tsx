import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, StatusBadge, WeatherEvaporationPill, Icon } from '../common';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, isSmallDevice, spacing } from '../../utils/responsive';
import { getStatusColor, getProgressBarColor } from '../../utils/statusUtils';

interface OrderCardProps {
  order: any;
  showDetails?: boolean;
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


  const progressBarColor = getProgressBarColor(order.status, progress);

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

  // Get weather data from either format
  const getWeatherData = () => {
    const weatherData = order.weather_data || order.weather;
    if (!weatherData) return null;

    return {
      description: weatherData.weather_description || weatherData.description || '',
      temperature: weatherData.temperature_fahrenheit ?? weatherData.temperature ?? null,
      windSpeed: weatherData.wind_speed_mph ?? weatherData.windSpeed ?? null,
      humidity: weatherData.humidity ?? null,
      condition: weatherData.weather_condition || weatherData.condition || '',
    };
  };

  const weatherData = getWeatherData();

  // Get evaporation rate background color
  const getEvaporationBgColor = (rate: number | null) => {
    if (rate === null || rate === undefined) return colors.grey[40];
    if (rate < 0.10) return colors.success.main; // green
    if (rate < 0.20) return colors.warning.main; // yellow
    if (rate < 0.30) return '#FF6B6B'; // light red
    if (rate < 0.40) return '#E53935'; // medium red
    return '#B71C1C'; // dark red
  };

  // Get evaporation rate text label
  const getEvaporationText = (rate: number | null) => {
    if (rate === null || rate === undefined) return '';
    if (rate < 0.10) return 'Low';
    if (rate < 0.20) return 'Moderate';
    if (rate < 0.30) return 'High';
    if (rate < 0.40) return 'Very High';
    return 'Severe';
  };

  // Get weather icon name based on condition
  const getWeatherIconName = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('cloud')) return 'weather-cloudy';
    if (conditionLower.includes('rain')) return 'weather-rainy';
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) return 'weather-sunny';
    if (conditionLower.includes('storm') || conditionLower.includes('thunder')) return 'weather-lightning';
    if (conditionLower.includes('snow')) return 'weather-snowy';
    if (conditionLower.includes('fog') || conditionLower.includes('mist')) return 'weather-fog';
    return 'weather-partly-cloudy';
  };

  return (
    <Card
      padding="none"
      style={[
        styles.card,
        {
          shadowColor: progressBarColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          borderBottomWidth: 3,
          borderBottomColor: progressBarColor,

          ...(Platform.OS === 'android' && {
            elevation: 4,
          }),
        },
      ]}>
      <View style={styles.cardInnerContainer}>
        <View style={styles.cardTouchable}>
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.statusBadgeContainer}>
              <StatusBadge
                status={order.status}
                size="xsmall"
                customColor={progressBarColor}
              />
            </View>
            <Text
              variant="captionSmall"
              color="secondary"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.orderId, { color: isDark ? themeColors.text.hint : colors.grey[80] }]}>
              {order.orderCode}
            </Text>
            <Text
              variant="captionSmall"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.dateTime, { color: isDark ? themeColors.text.hint : colors.grey[80] }]}>
              {formatDate(order.scheduledDate)} • {order.scheduledTime}
            </Text>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={onFavoritePress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name={isFavorite ? 'star' : 'star-outline'}
                size={ms(18)}
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
            <View style={styles.cyContainer}>
              <Text style={[styles.cyText, { color: themeColors.text.primary }]}>
                {(order.quantity ?? order.ordered_qty ?? 0).toFixed(2)}
              </Text>
              <Text style={[styles.cyLabel, { color: themeColors.text.primary }]}>
                {' CY'}
              </Text>
            </View>
          </View>

          {showDetails && (
            <>
              <View style={styles.progressRow}>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.progress.trackDark : colors.progress.trackLight }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: progressBarColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  variant="captionSmall"
                  style={[styles.progressPercent, { color: progressBarColor }]}>
                  {progress}%
                </Text>
              </View>

              <View style={styles.loadsRow}>
                <ConcreteTruck width={ms(16)} height={ms(12)} color={themeColors.text.secondary} />
                <Text variant="captionSmall" color="secondary">
                  {order.completedLoads || 0}/{order.totalLoads || 0}
                </Text>
              </View>

              {/* Weather Info Row */}
              {weatherData && (
                <View style={styles.weatherInfoRow}>
                  <Icon
                    name="weather-partly-cloudy"
                    size={ms(14)}
                    color={colors.info.main}
                  />
                  <Text
                    variant="captionSmall"
                    numberOfLines={1}
                    style={[styles.weatherDescText, { color: themeColors.text.secondary }]}>
                    Partly cloudy
                  </Text>
                  {weatherData.temperature !== null && (
                    <>
                      <View style={[styles.weatherDot, { backgroundColor: themeColors.text.hint }]} />
                      <Text variant="captionSmall" style={{ color: themeColors.text.secondary }}>
                        {weatherData.temperature}°F
                      </Text>
                    </>
                  )}
                  {weatherData.windSpeed !== null && (
                    <>
                      <View style={[styles.weatherDot, { backgroundColor: themeColors.text.hint }]} />
                      <Text variant="captionSmall" style={{ color: themeColors.text.secondary }}>
                        {weatherData.windSpeed} mph wind
                      </Text>
                    </>
                  )}
                  {weatherData.humidity !== null && (
                    <>
                      <View style={[styles.weatherDot, { backgroundColor: themeColors.text.hint }]} />
                      <Text variant="captionSmall" style={{ color: themeColors.text.secondary }}>
                        {weatherData.humidity}% RH
                      </Text>
                    </>
                  )}
                  {evaporationRateValue !== null && (
                    <TouchableOpacity
                      onPress={onWeatherPress}
                      activeOpacity={0.7}
                      style={[
                        styles.evapRateBadge,
                        { backgroundColor: getEvaporationBgColor(evaporationRateValue) }
                      ]}>
                      <Text style={styles.evapRateText}>
                        {getEvaporationText(evaporationRateValue)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

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
    gap: ms(6),
  },
  statusBadgeContainer: {
    flexShrink: 0,
    flexGrow: 0,
  },
  favoriteButton: {
    marginLeft: 'auto',
    paddingLeft: ms(4),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  orderId: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    flexShrink: 1,
  },
  dateTime: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    flexShrink: 1,
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
  cyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: ms(8),
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
