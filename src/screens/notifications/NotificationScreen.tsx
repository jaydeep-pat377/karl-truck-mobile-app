/**
 * Notification Screen
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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

export const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get theme-specific colors
  const themeColors = isDark ? colors.dark : colors.light;

  const handleGoBack = () => {
    navigation.navigate('Home');
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Notifications are pushed, so refresh just provides visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <Card
      padding="md"
      style={[
        styles.notificationCard,
        !item.isRead && { borderLeftWidth: 3, borderLeftColor: colors.primary.main },
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
            size={iconSizes.md}
            color={item.isRead ? themeColors.text.secondary : colors.primary.main}
          />
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      {/* Header */}
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
          style={[styles.headerButton, { backgroundColor: themeColors.surface }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : (
            <Icon name="refresh" size={ms(22)} color={themeColors.text.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Mark All Read */}
      {notifications.length > 0 && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text variant="bodySmall" style={{ color: colors.primary.main }}>
              {t('notifications.markAllRead')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyViewWithPreset
            preset="notifications"
            subtitle={t('notifications.noNotifications')}
          />
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
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
