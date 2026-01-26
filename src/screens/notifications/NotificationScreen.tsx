/**
 * Notification Screen
 */

import React from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card, Icon, EmptyViewWithPreset } from '../../components/common';
import { useTranslation } from 'react-i18next';
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

export const NotificationScreen: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // Get theme-specific colors
  const themeColors = isDark ? colors.dark : colors.light;

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
