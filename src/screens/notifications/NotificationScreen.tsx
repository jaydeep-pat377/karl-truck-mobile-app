/**
 * Notification Screen
 */

import React from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card } from '../../components/common';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppNotification } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, ms, iconSizes } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

// Mock notifications
const mockNotifications: AppNotification[] = [
  {
    id: '1',
    type: 'delivery_update',
    title: 'Truck En Route',
    body: 'Truck #T-101 is on the way to your site',
    priority: 'high',
    isRead: false,
    createdAt: '2026-01-16T08:30:00Z',
  },
  {
    id: '2',
    type: 'order_update',
    title: 'Order Confirmed',
    body: 'Order #12345 confirmed for Jan 16, 9:00 AM',
    priority: 'medium',
    isRead: false,
    createdAt: '2026-01-16T08:00:00Z',
  },
  {
    id: '3',
    type: 'weather_alert',
    title: 'Weather Advisory',
    body: 'Rain expected this afternoon - delivery may be affected',
    priority: 'medium',
    isRead: true,
    createdAt: '2026-01-15T18:00:00Z',
  },
  {
    id: '4',
    type: 'order_update',
    title: 'Delivery Complete',
    body: 'Order #12340 has been delivered successfully',
    priority: 'low',
    isRead: true,
    createdAt: '2026-01-15T14:30:00Z',
  },
];

const getNotificationIcon = (type: AppNotification['type']): string => {
  switch (type) {
    case 'order_update':
      return 'clipboard-text-outline';
    case 'delivery_update':
      return 'truck-delivery-outline';
    case 'weather_alert':
      return 'weather-cloudy-alert';
    case 'dispatch_alert':
      return 'truck-fast-outline';
    case 'eta_update':
      return 'clock-alert-outline';
    default:
      return 'bell-outline';
  }
};

<<<<<<< Updated upstream
=======
const formatTimeAgo = (dateString: string, t: (key: string, options?: any) => string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('notifications.justNow');
  if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

>>>>>>> Stashed changes
export const NotificationScreen: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // Get theme-specific colors
  const themeColors = isDark ? colors.dark : colors.light;

<<<<<<< Updated upstream
  const renderNotification = ({ item }: { item: AppNotification }) => (
    <Card
      padding="md"
      style={[
        styles.notificationCard,
        !item.isRead && { borderLeftWidth: 3, borderLeftColor: colors.primary.main },
      ]}
      onPress={() => { }}
    >
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: item.isRead
                ? themeColors.surface
                : colors.primary.main + '20',
            },
          ]}
        >
          <Icon
            name={getNotificationIcon(item.type)}
            size={iconSizes.md}
            color={item.isRead ? themeColors.text.secondary : colors.primary.main}
          />
=======

  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
  } = useSupabaseNotifications({
    userId: user?.id || null,
    tenantId,
    enabled: !!user?.id,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGoBack = () => {
    navigation.navigate('Home');
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const renderNotification = ({ item }: { item: Notification }) => {
    const isRead = item.status === 'read' || item.status === 'delivered';
    const isNew = item.isNew === true;

    return (
      <Card
        style={[
          styles.notificationCard,
          !isRead && { borderLeftWidth: 4, borderLeftColor: colors.primary.main },
          isNew && styles.newNotificationCard,
        ]}
        onPress={() => markAsRead(item.id)}
      >
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isNew
                  ? colors.success.main + '30'
                  : isRead
                    ? themeColors.surface
                    : colors.primary.main + '20',
              },
            ]}
          >
            <Icon
              name={getNotificationIcon(item.event_code)}
              size={ms(16)}
              color={isNew ? colors.success.main : isRead ? themeColors.text.secondary : colors.primary.main}
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                variant="bodySmall"
                style={[styles.title, !isRead && styles.unreadTitle]}
                numberOfLines={1}
              >
                {item.subject}
              </Text>
              {isNew ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{t('notifications.newBadge')}</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {t(`notifications.statuses.${item.status}`, { defaultValue: item.status.charAt(0).toUpperCase() + item.status.slice(1) })}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="caption" color="secondary" numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.timeText}>
              {isNew ? t('notifications.justArrived') : formatTimeAgo(item.created_at, t)}
              {item.priority >= 8 && ` ${t('notifications.highPrioritySuffix')}`}
            </Text>
          </View>
>>>>>>> Stashed changes
        </View>
        <View style={styles.textContainer}>
          <Text variant="body" style={!item.isRead && styles.unreadTitle}>
            {item.title}
          </Text>
          <Text variant="bodySmall" color="secondary" style={styles.body}>
            {item.body}
          </Text>
          <Text variant="caption" color="hint" style={styles.time}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="h2">{t('notifications.title')}</Text>
        <TouchableOpacity>
          <Text variant="bodySmall" style={{ color: colors.primary.main }}>
            {t('notifications.markAllRead')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      <FlatList
        data={mockNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="bell-off-outline" size={ms(64)} color={themeColors.text.secondary} />
            <Text variant="body" color="secondary" style={styles.emptyText}>
              {t('notifications.noNotifications')}
            </Text>
          </View>
        }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg + 10,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT,
  },
  notificationCard: {
    marginBottom: 0,
  },
  separator: {
    height: spacing.xs,
  },
  notificationContent: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  body: {
    marginTop: spacing.xs,
  },
  time: {
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    marginTop: spacing.lg,
  },
});

export default NotificationScreen;
