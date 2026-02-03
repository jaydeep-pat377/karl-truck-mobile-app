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
import { Text, Card, StatusBadge, WeatherBadge, Icon } from '../common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { getStatusColor } from '../../utils/statusUtils';

interface OrderCardProps {
  order: any;
  showDetails?: boolean;
  onPress?: () => void;
  onOrderDetails?: () => void;
  onTicket?: () => void;
  onWeatherPress?: () => void;
  onChat?: () => void;
  onFavoritePress?: () => void;
  orderDetailsDisabled?: boolean;
  ticketDisabled?: boolean;
  chatDisabled?: boolean;
  isLoading?: boolean;
  isWeatherLoading?: boolean;
  isChatLoading?: boolean;
  isFavorite?: boolean;
  showOrderDetailsButton?: boolean;
  showTicketButton?: boolean;
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

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  showDetails = true,
  onPress,
  onOrderDetails,
  onTicket,
  onWeatherPress,
  onChat,
  onFavoritePress,
  orderDetailsDisabled = false,
  ticketDisabled = false,
  chatDisabled = false,
  isLoading = false,
  isWeatherLoading = false,
  isChatLoading = false,
  isFavorite = false,
  showOrderDetailsButton = true,
  showTicketButton = true,
  showChatButton = true,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const progress = order.progress || 0;

  // Use centralized utility for consistent color across all screens
  const statusColor = getStatusColor(order.status, progress);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get evaporation rate - check both weather and weather_data (for backwards compatibility)
  const getEvaporationRate = () => {
    // Try weather.evaporationRate first (mapped data)
    if (order.weather?.evaporationRate !== undefined && order.weather?.evaporationRate !== null) {
      return order.weather.evaporationRate;
    }
    // Try weather_data.evaporation_rate (raw API data)
    if ((order as any).weather_data?.evaporation_rate !== undefined && (order as any).weather_data?.evaporation_rate !== null) {
      return (order as any).weather_data.evaporation_rate;
    }
    return null;
  };

  const evaporationRateValue = getEvaporationRate();

  return (
    <Card
      padding="none"
      style={[
        styles.card,
        {
          // iOS shadow - bottom only
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
          // Android shadow
          ...(Platform.OS === 'android' && {
            elevation: 4,
            borderBottomWidth: 2,
            borderBottomColor: statusColor + '60',
          }),
        },
      ]}>
      {/* Inner container for content clipping (rounded corners) */}
      <View style={styles.cardInnerContainer}>
        <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={isLoading}
        style={styles.cardTouchable}>
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <StatusBadge status={order.status} size="small" />
              <Text
                variant="captionSmall"
                color="secondary"
                style={[styles.orderId, { color: isDark ? themeColors.text.hint : colors.grey[80] }]}>
                #{order.orderCode}
              </Text>
              <Text
                variant="captionSmall"
                style={[styles.dateTime, { color: isDark ? themeColors.text.hint : colors.grey[80] }]}>
                {formatDate(order.scheduledDate)} • {order.scheduledTime}
              </Text>
              {evaporationRateValue !== null && (
                <View style={styles.evaporationBadge}>
                  <Text
                    variant="captionSmall"
                    style={styles.evaporationText}>
                    ER: {evaporationRateValue}
                  </Text>
                </View>
              )}
            </View>
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

            {(order.weather || isWeatherLoading) && (
              <WeatherBadge
                weather={order.weather}
                onPress={onWeatherPress}
                isLoading={isWeatherLoading}
                size="small"
              />
            )}
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
              style={[styles.productText, styles.productTextFlex, { color: isDark ? themeColors.text.hint : colors.grey[60] }]}>
              {order.productType} | {order.product_description} • {order.quantity ?? 0} CY
            </Text>
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
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
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
                      <Text
                        style={styles.ESTTitle}
                        variant="captionSmall"
                        color="secondary">
                        {`EST ${order.estimatedFinishTime}`}
                      </Text>
                    </View>
                  </>
                )}

                {order.distance && (
                  <>
                    <View style={[styles.metricDot, { backgroundColor: themeColors.text.hint }]} />
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
                  </>
                )}

                {/* Favorite Star Button */}
                <TouchableOpacity
                  style={styles.favoriteButtonBottom}
                  onPress={onFavoritePress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon
                    name={isFavorite ? 'star' : 'star-outline'}
                    size={ms(20)}
                    color={isFavorite ? colors.warning.main : (isDark ? colors.grey[50] : colors.grey[40])}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {(showOrderDetailsButton || showTicketButton || (showChatButton && order.canChat)) && (
        <View style={[styles.actionRow, { backgroundColor: isDark ? colors.dark.cardElevated : colors.grey[5] }]}>
          {showOrderDetailsButton && (
            <ActionButton
              icon="clipboard-text-outline"
              label="Order Details"
              onPress={onOrderDetails}
              disabled={orderDetailsDisabled}
              isLoading={isLoading}
            />
          )}
          {showOrderDetailsButton && showTicketButton && (
            <View style={[styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }]} />
          )}
          {showTicketButton && (
            <ActionButton
              icon="ticket-outline"
              label="Ticket"
              onPress={onTicket}
              disabled={ticketDisabled}
            />
          )}
          {showChatButton && order.canChat && (
            <>
              <View style={[styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }]} />
              <ActionButton
                icon="chat-outline"
                label="Chat"
                onPress={onChat}
                disabled={chatDisabled}
                isLoading={isChatLoading}
              />
            </>
          )}
        </View>
      )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: ms(10),
    // Note: overflow must be 'visible' for iOS shadows to render
    // Content clipping is handled by cardInnerContainer
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
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
  favoriteButtonBottom: {
    marginLeft: 'auto',
    paddingLeft: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
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
    flexWrap: 'wrap',
  },
  orderId: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  dateTime: {
    marginLeft: ms(2),
    fontSize: 12,
    fontFamily: fontFamily.medium,
  },
  evaporationBadge: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
  },
  evaporationText: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
  },
  ESTTitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
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
    justifyContent: 'flex-start',
    gap: ms(4),
    marginTop: ms(4),
  },
  productText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  productTextFlex: {
    flex: 1,
    flexShrink: 1,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
    flexShrink: 0,
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
