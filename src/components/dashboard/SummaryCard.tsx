import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common';
import { CircularProgress } from './CircularProgress';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';
import { useTranslation } from 'react-i18next';

export interface SummaryCardData {
  id: string;
  name: string;
  deliveredQty: number;
  totalQty: number;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  entityType: 'company' | 'region' | 'plant';
  entityId?: string;
}

interface SummaryCardProps {
  data: SummaryCardData;
  onPress?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ data, onPress }) => {
  const { t } = useTranslation();
  const progress = data.totalQty > 0 ? (data.deliveredQty / data.totalQty) * 100 : 0;

  const formatQty = (qty: number) => {
    return qty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.chartContainer}>
        <CircularProgress
          size={48}
          progress={progress}
          progressColor={colors.secondary.light}
          backgroundColor={colors.info.background}
          strokeColor={colors.secondary.main}
          strokeWidth={2}
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {data.name}
        </Text>

        <Text style={styles.quantityText} numberOfLines={1}>
          <Text style={styles.deliveredQty}>{formatQty(data.deliveredQty)}</Text>
          <Text style={styles.ofText}> {t('summary.of')} </Text>
          <Text style={styles.totalQty}>{formatQty(data.totalQty)} {t('units.cy')}</Text>
        </Text>

        <Text style={styles.statsText} numberOfLines={1}>
          {t('summary.statsLine', { tot: data.totalOrders, act: data.activeOrders, cancelled: data.cancelledOrders })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary.main,
    borderRadius: ms(6),
    paddingVertical: ms(8),
    paddingHorizontal: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    width: ms(175),
    height: ms(75),
  },
  chartContainer: {
    marginRight: ms(10),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: ms(12),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    textTransform: 'uppercase',
    marginBottom: ms(2),
  },
  quantityText: {
    marginBottom: ms(2),
  },
  deliveredQty: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
  },
  ofText: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    color: colors.semiTransparent.white85,
  },
  totalQty: {
    fontSize: ms(10),
    fontFamily: fontFamily.semiBold,
    color: colors.common.white,
  },
  statsText: {
    fontSize: ms(8),
    fontFamily: fontFamily.medium,
    color: colors.semiTransparent.white85,
  },
});

export default SummaryCard;
