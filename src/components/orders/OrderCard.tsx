import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
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
              <Text
                variant="captionSmall"
                color="secondary"
                style={[styles.orderId, { color: isDark ? themeColors.text.hint : colors.grey[80] }]}>
                {order.productType && order.productType}
              </Text>
              <Text
                variant="captionSmall"
                style={[styles.dateTime, { color: isDark ? themeColors.text.hint : colors.grey[80] }]}>
                {formatDate(order.scheduledDate)} • {order.scheduledTime}
              </Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <Text variant="bodySmall" numberOfLines={1} style={styles.projectName}>
              #{order.orderCode}
            </Text>
            <Text variant="captionSmall" color="secondary" numberOfLines={1}>
              {order.customerName}
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

                <View style={styles.metricItem}>
                  <Icon
                    name="cube-outline"
                    size={ms(12)}
                    color={themeColors.text.secondary}
                  />
                  <Text variant="captionSmall" color="secondary">
                    {order.quantity ?? 0} {order.unit}
                  </Text>
                </View>

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
    fontSize: 13,
  },
  dateTime: {
    marginLeft: ms(2),
    fontSize: 12,
    fontFamily: fontFamily.medium,
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
