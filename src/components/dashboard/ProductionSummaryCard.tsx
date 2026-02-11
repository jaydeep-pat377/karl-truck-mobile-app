import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

interface ProductionSummaryProps {
  title?: string;
  subtitle?: string;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  deliveredQty: number;
  totalQty: number;
  onPress?: () => void;
}

export const ProductionSummaryCard: React.FC<ProductionSummaryProps> = ({
  title = 'Ready Mix Producer',
  subtitle,
  totalOrders,
  activeOrders,
  cancelledOrders,
  deliveredQty,
  totalQty,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const progress = totalQty > 0 ? (deliveredQty / totalQty) * 100 : 0;
  const progressPercent = Math.round(progress);

  const today = new Date();
  const dateString = subtitle || `Daily orders and production tracking — ${today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`;

  const formatQty = (qty: number) => {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="clipboard-text-outline" size={ms(18)} color={themeColors.text.primary} />
          <Text style={[styles.title, { color: themeColors.text.primary }]}>{title}</Text>
        </View>
        <Text style={[styles.subtitle, { color: themeColors.text.secondary }]}>{dateString}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.dashboard.statBlue + '15' }]}>
            <Icon name="package-variant" size={ms(16)} color={colors.dashboard.statBlue} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: themeColors.text.secondary }]}>Total Orders</Text>
            <Text style={[styles.statValue, { color: themeColors.text.primary }]}>{totalOrders}</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.dashboard.statGreen + '15' }]}>
            <Icon name="progress-check" size={ms(16)} color={colors.dashboard.statGreen} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: themeColors.text.secondary }]}>Active</Text>
            <Text style={[styles.statValue, { color: themeColors.text.primary }]}>{activeOrders}</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.dashboard.statRed + '15' }]}>
            <Icon name="close-circle-outline" size={ms(16)} color={colors.dashboard.statRed} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statLabel, { color: themeColors.text.secondary }]}>Cancelled</Text>
            <Text style={[styles.statValue, { color: themeColors.text.primary }]}>{cancelledOrders}</Text>
          </View>
        </View>
      </View>

      <View style={styles.productionSection}>
        <View style={styles.productionHeader}>
          <Text style={[styles.productionTitle, { color: themeColors.text.primary }]}>Production & Delivery</Text>
          <Text style={[styles.productionQty, { color: themeColors.text.secondary }]}>
            {formatQty(deliveredQty)} / {formatQty(totalQty)} CYD
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.semiTransparent.white10 : colors.grey[10] }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: colors.dashboard.statGreen,
              },
            ]}
          />
        </View>

        <View style={styles.progressFooter}>
          <View style={styles.deliveredRow}>
            <View style={[styles.deliveredDot, { backgroundColor: colors.dashboard.statGreen }]} />
            <Text style={[styles.deliveredText, { color: themeColors.text.secondary }]}>
              Delivered: {formatQty(deliveredQty)} CYD
            </Text>
          </View>
          <Text style={[styles.percentText, { color: themeColors.text.primary }]}>{progressPercent}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(12),
    padding: ms(16),
    marginHorizontal: spacing.lg,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: ms(16),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
    marginBottom: ms(4),
  },
  title: {
    fontSize: ms(16),
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: ms(20),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  statIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    gap: ms(2),
  },
  statLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  statValue: {
    fontSize: ms(18),
    fontFamily: fontFamily.bold,
  },
  productionSection: {
    borderTopWidth: 1,
    borderTopColor: colors.semiTransparent.black06,
    paddingTop: ms(16),
  },
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(10),
  },
  productionTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  productionQty: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },
  progressTrack: {
    height: ms(5),
    borderRadius: ms(5),
    overflow: 'hidden',
    marginBottom: ms(8),
  },
  progressFill: {
    height: '100%',
    borderRadius: ms(5),
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  deliveredDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  deliveredText: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },
  percentText: {
    fontSize: ms(14),
    fontFamily: fontFamily.bold,
  },
});

export default ProductionSummaryCard;
