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
import { getStatusColor, getProgressBarColor } from '../../utils/statusUtils';

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

  // Status color for label and shadow (In Process/Completed = always green)
  const statusColor = getStatusColor(order.status, progress);

  // Progress bar color (In Process/Completed = performance-based)
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

  return (
    <Card
      padding="none"
      style={[
        styles.card,
        {
          // iOS colored shadow at bottom
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 6,

          // Android: Use border to simulate colored shadow since elevation is always gray
          ...(Platform.OS === 'android' && {
            elevation: 3,
            borderBottomWidth: 3,
            borderBottomColor: statusColor,
          }),
        },
      ]}>
      <View style={styles.cardInnerContainer}>
        <View style={styles.cardTouchable}>
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
      </View>

      {(showOrderDetailsButton || (showTicketButton && order.canTicketed) || (showChatButton && order.canChat)) && (
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
          {showOrderDetailsButton && showTicketButton && order.canTicketed && (
            <View style={[styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }]} />
          )}
          {showTicketButton && order.canTicketed && (
            <ActionButton
              icon="ticket-outline"
              label="Ticket"
              onPress={onTicket}
              disabled={ticketDisabled}
            />
          )}
          {showChatButton && order.canChat && (
            <>
              {(showOrderDetailsButton || (showTicketButton && order.canTicketed)) && (
                <View style={[styles.actionDivider, { backgroundColor: isDark ? colors.dark.border : colors.grey[25] }]} />
              )}
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
    // Allow shadow to be visible on iOS, but clip content on Android for proper border radius
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
    // Ensure bottom margin for shadow visibility
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
