
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, Icon, EmptyViewWithPreset } from '../../components/common';
import { useTranslation } from 'react-i18next';
import { AppNotification } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, ms, iconSizes } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { MainTabParamList } from '../../navigation/types';

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

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'delivered':
    case 'read':
      return colors.success.main;
    case 'pending':
      return colors.warning.main;
    case 'failed':
      return colors.error.main;
    case 'sent':
      return colors.primary.main;
    default:
      return colors.grey[50];
  }
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { notifications, markAsRead, markAllAsRead, fetchNotifications, loadMoreNotifications, isLoading, isLoadingMore, pagination } = useNotificationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const themeColors = isDark ? colors.dark : colors.light;

  // Get tenant_id from user metadata
  const tenantId = user?.metadata?.tenant?.tenant_id ?? 1;

  // Fetch notifications on mount
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id, tenantId);
    }
  }, [user?.id, tenantId, fetchNotifications]);

  const handleGoBack = () => {
    navigation.navigate('Home');
  };

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;

    setIsRefreshing(true);
    try {
      await fetchNotifications(user.id, tenantId);
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, tenantId, fetchNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!user?.id || isLoadingMore) return;
    loadMoreNotifications(user.id, tenantId);
  }, [user?.id, tenantId, isLoadingMore, loadMoreNotifications]);

  const hasMorePages = pagination ? pagination.page < pagination.totalPages : false;

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const status = (item.data as Record<string, unknown>)?.status as string || '';

    return (
      <Card
        style={[
          styles.notificationCard,
          !item.isRead && { borderLeftWidth: 4, borderLeftColor: colors.primary.main },
        ]}
        onPress={() => { markAsRead(item.id); }}
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
              size={ms(16)}
              color={item.isRead ? themeColors.text.secondary : colors.primary.main}
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text variant="bodySmall" style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              {status && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                  <Text style={styles.statusText}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {item.body}
            </Text>
            <Text style={styles.timeText}>
              {formatTimeAgo(item.createdAt)}
              {item.priority === 'high' && ' • High Priority'}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text variant="h2">{t('notifications.title')}</Text>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black04 }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : (
            <Icon name="refresh" size={ms(18)} color={colors.primary.main} />
          )}
        </TouchableOpacity>
      </View>
      {notifications.length > 0 && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text variant="bodySmall" style={{ color: colors.primary.main }}>
              {t('notifications.markAllRead')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyViewWithPreset
              preset="notifications"
              subtitle={t('notifications.noNotifications')}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary.main} />
              </View>
            ) : hasMorePages ? (
              <TouchableOpacity style={styles.loadMoreContainer} onPress={handleLoadMore}>
                <Text variant="bodySmall" style={{ color: colors.primary.main }}>
                  Load More
                </Text>
              </TouchableOpacity>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
        />
      )}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT,
    flexGrow: 1,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationCard: {
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  separator: {
    height: 4,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    marginRight: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: ms(6),
  },
  statusText: {
    fontSize: ms(11),
    fontWeight: '600',
  },
  timeText: {
    fontSize: ms(10),
    color: colors.grey[50],
    marginTop: 2,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationScreen;
