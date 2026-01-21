import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Card } from '../../components/common';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing, ms, iconSizes } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';

export const MapTrackingScreen: React.FC = () => {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>

      <View style={styles.header}>
        <Text variant="h2">{t('navigation.map')}</Text>
      </View>

      {/* Map Placeholder */}
      <View style={[styles.mapPlaceholder, { backgroundColor: themeColors.surface }]}>
        <Icon name="map" size={ms(80)} color={themeColors.text.secondary} />
        <Text variant="body" color="secondary" style={styles.placeholderText}>
          Map integration coming soon
        </Text>
        <Text variant="caption" color="hint" align="center" style={styles.placeholderSubtext}>
          Real-time truck tracking and route visualization will be displayed here
        </Text>
      </View>

      {/* Bottom Info Card */}
      <Card padding="md" style={styles.infoCard}>
        <View style={styles.truckInfo}>
          <View style={styles.truckHeader}>
            <Icon name="truck" size={iconSizes.lg} color={colors.primary.main} />
            <Text variant="h4" style={styles.truckTitle}>
              Truck #T-101
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.status.enRoute }]}>
            <Text variant="captionSmall" color="white">
              EN ROUTE
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Icon name="account" size={iconSizes.sm} color={themeColors.text.secondary} />
          <Text variant="bodySmall" color="secondary" style={styles.detailText}>
            Driver: John Smith
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="clock-outline" size={iconSizes.sm} color={themeColors.text.secondary} />
          <Text variant="bodySmall" color="secondary" style={styles.detailText}>
            ETA: 15 minutes
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="map-marker" size={iconSizes.sm} color={themeColors.text.secondary} />
          <Text variant="bodySmall" color="secondary" style={styles.detailText}>
            123 Main St, Charlotte, NC
          </Text>
        </View>
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg + 20,
  },
  mapPlaceholder: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderText: {
    marginTop: spacing.lg,
  },
  placeholderSubtext: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xxl,
  },
  infoCard: {
    margin: spacing.lg,
    marginTop: 0,
    marginBottom: TAB_BAR_HEIGHT,
  },
  truckInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  truckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckTitle: {
    marginLeft: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: ms(4),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    marginLeft: spacing.xs,
  },
});

export default MapTrackingScreen;
