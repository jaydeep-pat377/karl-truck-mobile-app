import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Card } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

export interface InfoMessage {
  id: string;
  type: 'alert' | 'notice' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp?: string;
  isRead?: boolean;
}

export interface WeatherInfo {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  condition?: string;
  location?: string;
}

export interface TodayStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}

interface InformationSectionProps {
  messages: InfoMessage[];
  weather?: WeatherInfo | null;
  todayStats?: TodayStats | null;
  onMessagePress?: (message: InfoMessage) => void;
  onSeeAllPress?: () => void;
  onWeatherPress?: () => void;
  onStatsPress?: () => void;
  maxVisible?: number;
}

const getWeatherIcon = (condition?: string) => {
  const cond = condition?.toLowerCase() || '';
  if (cond.includes('sun') || cond.includes('clear')) return 'weather-sunny';
  if (cond.includes('cloud') && cond.includes('sun')) return 'weather-partly-cloudy';
  if (cond.includes('cloud')) return 'weather-cloudy';
  if (cond.includes('rain')) return 'weather-rainy';
  if (cond.includes('storm') || cond.includes('thunder')) return 'weather-lightning';
  if (cond.includes('snow')) return 'weather-snowy';
  return 'weather-partly-cloudy';
};

const getIconForType = (type: InfoMessage['type']) => {
  switch (type) {
    case 'alert':
      return { name: 'alert-circle', color: colors.error.main };
    case 'warning':
      return { name: 'alert', color: colors.warning.main };
    case 'notice':
      return { name: 'information', color: colors.info.main };
    case 'info':
    default:
      return { name: 'information-outline', color: colors.primary.main };
  }
};

export const InformationSection: React.FC<InformationSectionProps> = ({
  messages,
  weather,
  todayStats,
  onMessagePress,
  onSeeAllPress,
  onWeatherPress,
  onStatsPress,
  maxVisible = 2,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const visibleMessages = messages.slice(0, maxVisible);
  const hasStats = todayStats && todayStats.total > 0;
  const hasMessages = messages.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={[styles.infoCard, { backgroundColor: isDark ? colors.dark.card : colors.common.white }]}
          onPress={onWeatherPress}
          activeOpacity={0.7}
          disabled={!onWeatherPress}
        >
          <View style={[styles.infoCardIcon, { backgroundColor: `${colors.info.main}15` }]}>
            <Icon name={getWeatherIcon(weather?.condition)} size={ms(24)} color={colors.info.main} />
          </View>
          <Text style={[styles.infoCardTitle, { color: themeColors.text.primary }]} numberOfLines={1}>
            {weather?.location || 'Weather'}
          </Text>
          <View style={styles.weatherStats}>
            <Text style={[styles.weatherMainStat, { color: themeColors.text.primary }]}>
              {weather?.temperature !== undefined ? `${Math.round(weather.temperature)}°F` : '--°F'}
            </Text>
          </View>
          <View style={styles.weatherSubStats}>
            <View style={styles.weatherSubStat}>
              <Icon name="water-percent" size={ms(10)} color={themeColors.text.hint} />
              <Text style={[styles.weatherSubStatText, { color: themeColors.text.secondary }]}>
                {weather?.humidity !== undefined ? `${weather.humidity}%` : '--%'}
              </Text>
            </View>
            <View style={styles.weatherSubStat}>
              <Icon name="weather-windy" size={ms(10)} color={themeColors.text.hint} />
              <Text style={[styles.weatherSubStatText, { color: themeColors.text.secondary }]}>
                {weather?.windSpeed !== undefined ? `${weather.windSpeed}mph` : '--mph'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {hasStats && (
          <TouchableOpacity
            style={[styles.infoCard, styles.statsCard, { backgroundColor: isDark ? colors.dark.card : colors.common.white }]}
            onPress={onStatsPress}
            activeOpacity={0.7}
            disabled={!onStatsPress}
          >
            <View style={[styles.infoCardIcon, { backgroundColor: `${colors.primary.main}15` }]}>
              <Icon name="chart-box-outline" size={ms(24)} color={colors.primary.main} />
            </View>
            <Text style={[styles.infoCardTitle, { color: themeColors.text.primary }]}>Today's Orders</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.dashboard.statGreen }]}>
                  {todayStats?.completed ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.dashboard.statYellow }]}>
                  {todayStats?.inProgress ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Active</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.dashboard.statBlue }]}>
                  {todayStats?.pending ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.dashboard.statRed }]}>
                  {todayStats?.cancelled ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Cancel</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

      </View>

      {/* Alerts Section */}
      {hasMessages && (
        <Card variant="default" padding="none" style={styles.alertsCard}>
          <View style={styles.alertsHeader}>
            <View style={styles.alertsHeaderLeft}>
              <Icon name="bell-outline" size={ms(16)} color={colors.warning.main} />
              <Text style={[styles.alertsTitle, { color: themeColors.text.primary }]}>
                Alerts & Notices
              </Text>
            </View>
            {messages.length > maxVisible && onSeeAllPress && (
              <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { color: colors.primary.main }]}>
                  See All ({messages.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {visibleMessages.map((message, index) => {
            const iconConfig = getIconForType(message.type);
            return (
              <TouchableOpacity
                key={message.id}
                style={[
                  styles.alertItem,
                  !message.isRead && { backgroundColor: `${colors.primary.main}05` },
                  index < visibleMessages.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? colors.semiTransparent.white08 : colors.semiTransparent.black06,
                  },
                ]}
                onPress={() => onMessagePress?.(message)}
                activeOpacity={0.7}
              >
                <View style={[styles.alertIcon, { backgroundColor: `${iconConfig.color}12` }]}>
                  <Icon name={iconConfig.name} size={ms(14)} color={iconConfig.color} />
                </View>
                <View style={styles.alertContent}>
                  <Text
                    style={[styles.alertTitle, { color: themeColors.text.primary }]}
                    numberOfLines={1}
                  >
                    {message.title}
                  </Text>
                  <Text
                    style={[styles.alertMessage, { color: themeColors.text.secondary }]}
                    numberOfLines={1}
                  >
                    {message.message}
                  </Text>
                </View>
                {message.timestamp && (
                  <Text style={[styles.alertTime, { color: themeColors.text.hint }]}>
                    {message.timestamp}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: ms(10),
  },
  card: {
    marginHorizontal: spacing.lg,
  },
  // Top Row
  topRow: {
    flexDirection: 'row',
    gap: ms(10),
  },
  infoCard: {
    flex: 1,
    borderRadius: ms(12),
    padding: ms(12),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  statsCard: {
    flex: 1.2,
  },
  infoCardIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  infoCardTitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(4),
  },
  // Weather specific
  weatherStats: {
    alignItems: 'center',
  },
  weatherMainStat: {
    fontSize: ms(22),
    fontFamily: fontFamily.bold,
  },
  weatherSubStats: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(4),
  },
  weatherSubStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(2),
  },
  weatherSubStatText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  // Stats specific
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: ms(4),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: ms(16),
    fontFamily: fontFamily.bold,
  },
  statLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    marginTop: ms(1),
  },
  // Alerts Section
  alertsCard: {
    borderRadius: ms(12),
    overflow: 'hidden',
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.semiTransparent.black06,
  },
  alertsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  alertsTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  seeAllText: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    gap: ms(10),
  },
  alertIcon: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(1),
  },
  alertMessage: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  alertTime: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    marginTop: spacing.sm,
  },
});

export default InformationSection;
