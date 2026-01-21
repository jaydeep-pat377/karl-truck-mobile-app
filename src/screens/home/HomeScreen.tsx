import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card } from '../../components/common';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ms, spacing, fontSizes, iconSizes } from '../../utils/responsive';
import { colors } from '../../theme/colors';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

export const HomeScreen: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
            <Text variant="h3" color="white">JS</Text>
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text variant="caption" color="secondary">
              Welcome back,
            </Text>
            <Text variant="h3">John Smith</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.notificationBtn, { backgroundColor: themeColors.card }]}
          activeOpacity={0.7}>
          <Icon
            name="bell-outline"
            size={iconSizes.lg}
            color={themeColors.text.primary}
          />
          <View
            style={[
              styles.notificationBadge,
              { backgroundColor: colors.error.main },
            ]}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Card
          variant="elevated"
          padding="none"
          style={[
            styles.weatherCard,
            { backgroundColor: colors.weather.gradientStart },
          ]}>
          <View style={styles.weatherTop}>
            <View style={styles.weatherLeft}>
              <View style={styles.locationRow}>
                <Icon name="map-marker" size={iconSizes.sm} color={colors.overlay.light} />
                <Text variant="bodySmall" style={styles.locationText}>
                  Charlotte, NC
                </Text>
              </View>
              <View style={styles.temperatureRow}>
                <Text style={styles.temperatureValue}>28°</Text>
                <Text style={styles.temperatureUnit}>F</Text>
              </View>
              <Text variant="body" style={styles.conditionText}>
                Partly Cloudy
              </Text>
            </View>
            <View style={styles.weatherRight}>
              <Icon
                name="weather-partly-cloudy"
                size={ms(72)}
                color={colors.common.white}
              />
            </View>
          </View>

          <View style={styles.weatherDivider} />

          <View style={styles.weatherBottom}>
            <View style={styles.weatherDetailItem}>
              <View style={styles.detailIconBg}>
                <Icon name="water-percent" size={iconSizes.md} color={colors.common.white} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailValue}>55%</Text>
                <Text style={styles.detailLabel}>Humidity</Text>
              </View>
            </View>

            <View style={styles.weatherDetailItem}>
              <View style={styles.detailIconBg}>
                <Icon name="weather-windy" size={iconSizes.md} color={colors.common.white} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailValue}>30 mph</Text>
                <Text style={styles.detailLabel}>Wind</Text>
              </View>
            </View>

            <View style={styles.weatherDetailItem}>
              <View style={styles.detailIconBg}>
                <Icon name="water" size={iconSizes.md} color={colors.common.white} />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailValue}>0%</Text>
                <Text style={styles.detailLabel}>Rain</Text>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">{t('orders.title')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('common.seeAll')}
            </Text>
          </View>

          <View style={styles.orderSummary}>
            <Card style={styles.summaryCard} padding="md">
              <Text variant="h2" style={{ color: colors.status.inProcess }}>
                5
              </Text>
              <Text variant="caption" color="secondary">
                {t('orders.inProcess')}
              </Text>
            </Card>

            <Card style={styles.summaryCard} padding="md">
              <Text variant="h2" style={{ color: colors.status.prePour }}>
                3
              </Text>
              <Text variant="caption" color="secondary">
                {t('orders.prePour')}
              </Text>
            </Card>

            <Card style={styles.summaryCard} padding="md">
              <Text variant="h2" style={{ color: colors.status.completed }}>
                12
              </Text>
              <Text variant="caption" color="secondary">
                {t('orders.completed')}
              </Text>
            </Card>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">{t('orders.trucksOnJob')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('common.viewMore')}
            </Text>
          </View>

          <Card padding="md">
            <View style={styles.truckItem}>
              <View style={styles.truckInfo}>
                <Icon
                  name="truck"
                  size={24}
                  color={colors.primary.main}
                  style={styles.truckIcon}
                />
                <View>
                  <Text variant="body">Truck #T-101</Text>
                  <Text variant="caption" color="secondary">
                    En Route • ETA 15 min
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.truckStatus,
                  { backgroundColor: colors.status.enRoute },
                ]}>
                <Text variant="captionSmall" color="white">
                  ENRT
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
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
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  notificationBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: ms(2),
    right: ms(2),
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
  },
  badgeText: {
    color: colors.common.white,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT,
  },
  weatherCard: {
    marginBottom: spacing.xl,
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  weatherLeft: {
    flex: 1,
  },
  weatherRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginBottom: spacing.xs,
  },
  locationText: {
    color: colors.overlay.light,
  },
  temperatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  temperatureValue: {
    fontSize: ms(56),
    fontWeight: '700',
    color: colors.common.white,
    lineHeight: ms(62),
  },
  temperatureUnit: {
    fontSize: ms(20),
    fontWeight: '600',
    color: colors.overlay.light,
    marginTop: ms(8),
  },
  conditionText: {
    color: colors.common.white,
    marginTop: spacing.xs,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: colors.overlay.light,
    marginHorizontal: spacing.lg,
  },
  weatherBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailIconBg: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay.light,
  },
  detailTextContainer: {
    alignItems: 'flex-start',
  },
  detailValue: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.common.white,
  },
  detailLabel: {
    fontSize: fontSizes.xs,
    color: colors.overlay.light,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  truckItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  truckInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckIcon: {
    marginRight: spacing.md,
  },
  truckStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: ms(4),
  },
});

export default HomeScreen;
