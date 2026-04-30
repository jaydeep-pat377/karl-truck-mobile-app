import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, Icon, EmptyViewWithPreset } from '../../components/common';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { useAuthStore } from '../../store/authStore';
import { MainTabParamList } from '../../navigation/types';
import { useSupabaseNotifications, Notification } from '../../hooks/useSupabaseNotifications';

const getNotificationIcon = (eventCode: string): string => {
  const code = eventCode?.toUpperCase() || '';
  if (code.includes('ORDER')) return 'clipboard-text-outline';
  if (code.includes('DELIVERY') || code.includes('TRUCK')) return 'truck-delivery-outline';
  if (code.includes('WEATHER') || code.includes('ALERT')) return 'weather-cloudy-alert';
  if (code.includes('DISPATCH')) return 'truck-fast-outline';
  if (code.includes('ETA')) return 'clock-alert-outline';
  return 'bell-outline';
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

  const themeColors = isDark ? colors.dark : colors.light;
  const tenantId = user?.metadata?.tenant?.tenant_id ?? 1;


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
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="caption" color="secondary" numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.timeText}>
              {isNew ? t('notifications.justArrived') : formatTimeAgo(item.created_at)}
              {item.priority >= 8 && ` • ${t('notifications.highPriority')}`}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text variant="h2">{t('notifications.title')}</Text>
        </View>
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

      {error && (
        <View style={styles.errorContainer}>
          <Text style={{ color: colors.error.main }}>{error}</Text>
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
          keyExtractor={(item) => item.id?.toString() || item.queue_uuid}
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  errorContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  newNotificationCard: {
    backgroundColor: colors.success.main + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.success.main,
  },
  newBadge: {
    backgroundColor: colors.success.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ms(6),
  },
  newBadgeText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: colors.common.white,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NotificationScreen;
