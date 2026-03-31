import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { useRealtimeDailyIntelligence } from '../../hooks/useRealtimeDailyIntelligence';
import { DailyIntelligenceData, DailyIntelligenceScope } from '../../types/dailyIntelligence';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms } from '../../utils/responsive';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyStatsPanelProps {
  reportDate?: string;
  scope?: DailyIntelligenceScope;
  plantCode?: string | null;
  regionName?: string | null;
  onKpiFilter?: (orderCodes: string[], kpiLabel: string) => void;
  onKpiFilterClear?: () => void;
}

interface KpiCardConfig {
  key: string;
  label: string;
  icon: string;
  getValue: (data: DailyIntelligenceData) => string | number;
  getSubLabel: (data: DailyIntelligenceData) => string;
  getHighlightColor: (data: DailyIntelligenceData) => string | null;
  isClickable: boolean;
  getOrderCodes: (data: DailyIntelligenceData) => string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractOrderCodes = (
  details: Array<{ order_code?: string; order_codes?: string[]; [key: string]: any }> | null,
): string[] => {
  if (!details || !Array.isArray(details)) return [];
  const codes = new Set<string>();
  for (const item of details) {
    if (item.order_code) codes.add(item.order_code);
    if (item.order_codes && Array.isArray(item.order_codes)) {
      for (const code of item.order_codes) codes.add(code);
    }
  }
  return Array.from(codes);
};

// ---------------------------------------------------------------------------
// KPI card definitions
// ---------------------------------------------------------------------------

const kpiCards: KpiCardConfig[] = [
  {
    key: 'late_orders',
    label: 'Late Orders',
    icon: 'clock-alert-outline',
    getValue: (d) => d.late_orders_total,
    getSubLabel: (d) => `${d.late_not_started} not started`,
    getHighlightColor: (d) => (d.late_orders_total > 0 ? colors.error.main : null),
    isClickable: true,
    getOrderCodes: (d) => extractOrderCodes(d.late_orders_details),
  },
  {
    key: 'trucks_waiting',
    label: 'Trucks Waiting',
    icon: 'truck-alert-outline',
    getValue: (d) => d.stuck_at_job_total,
    getSubLabel: () => 'idle > 30min',
    getHighlightColor: (d) => (d.stuck_at_job_total > 0 ? colors.warning.main : null),
    isClickable: true,
    getOrderCodes: (d) => extractOrderCodes(d.stuck_at_job_details),
  },
  {
    key: 'slow_plants',
    label: 'Slow Plants',
    icon: 'factory',
    getValue: (d) => d.slow_plants_total,
    getSubLabel: () => 'below avg output',
    getHighlightColor: (d) => (d.slow_plants_total > 0 ? colors.info.main : null),
    isClickable: true,
    getOrderCodes: (d) => extractOrderCodes(d.slow_plants_details),
  },
  {
    key: 'congested_sites',
    label: 'Congested Sites',
    icon: 'alert-octagon-outline',
    getValue: (d) => d.congested_sites_total,
    getSubLabel: (d) => `${d.congested_sites_total} sites`,
    getHighlightColor: (d) => (d.congested_sites_total > 0 ? colors.error.main : null),
    isClickable: true,
    getOrderCodes: (d) => extractOrderCodes(d.congested_sites_details),
  },
  {
    key: 'avg_round_trip',
    label: 'Avg Round Trip',
    icon: 'clock-outline',
    getValue: (d) => d.avg_round_trip_display || '--',
    getSubLabel: (d) => `${d.round_trip_sample_count} trips`,
    getHighlightColor: () => null,
    isClickable: false,
    getOrderCodes: () => [],
  },
  {
    key: 'weather_risk',
    label: 'Weather Risk',
    icon: 'weather-lightning-rainy',
    getValue: (d) => d.weather_risk_total,
    getSubLabel: (d) => {
      const parts: string[] = [];
      if (d.weather_risk_severe > 0) parts.push(`${d.weather_risk_severe} sev`);
      if (d.weather_risk_very_high > 0) parts.push(`${d.weather_risk_very_high} v.high`);
      if (d.weather_risk_high > 0) parts.push(`${d.weather_risk_high} high`);
      if (d.weather_risk_moderate > 0) parts.push(`${d.weather_risk_moderate} mod`);
      return parts.length > 0 ? parts.join(', ') : 'no risks';
    },
    getHighlightColor: (d) => {
      if (d.weather_risk_severe > 0) return colors.error.main;
      if (d.weather_risk_total > 0) return colors.warning.main;
      return null;
    },
    isClickable: true,
    getOrderCodes: (d) => extractOrderCodes(d.weather_risk_details),
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KPICardProps {
  config: KpiCardConfig;
  data: DailyIntelligenceData;
  isDark: boolean;
  isActive: boolean;
  onPress?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ config, data, isDark, isActive, onPress }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const value = config.getValue(data);
  const subLabel = config.getSubLabel(data);
  const highlightColor = config.getHighlightColor(data);
  const hasValue = typeof value === 'number' ? value > 0 : value !== '--';

  const cardBg = useMemo(() => {
    if (isActive) return (isDark ? colors.info.dark : colors.info.main) + '15';
    return isDark ? colors.dark.card : colors.common.white;
  }, [isActive, isDark]);

  const borderColor = useMemo(() => {
    if (isActive) return colors.info.main;
    if (highlightColor && hasValue) return highlightColor + '50';
    return isDark ? colors.dark.border : colors.grey[10];
  }, [isActive, isDark, highlightColor, hasValue]);

  const iconBg = useMemo(() => {
    if (highlightColor && hasValue) return highlightColor + (isDark ? '25' : '12');
    return isDark ? colors.grey[60] + '25' : colors.grey[5];
  }, [isDark, highlightColor, hasValue]);

  const iconColor = useMemo(() => {
    if (highlightColor && hasValue) return highlightColor;
    return isDark ? colors.grey[40] : colors.grey[50];
  }, [isDark, highlightColor, hasValue]);

  const content = (
    <View
      style={[
        styles.kpiCard,
        { backgroundColor: cardBg, borderColor },
        isActive && { borderWidth: 1.5 },
      ]}>
      <View style={styles.kpiCardInner}>
        <View style={[styles.kpiIconCircle, { backgroundColor: iconBg }]}>
          <Icon name={config.icon} size={ms(16)} color={iconColor} />
        </View>
        <View style={styles.kpiContent}>
          <Text
            style={[
              styles.kpiValue,
              { color: highlightColor && hasValue ? highlightColor : themeColors.text.primary },
            ]}
            numberOfLines={1}>
            {value}
          </Text>
          <Text style={[styles.kpiLabel, { color: themeColors.text.secondary }]} numberOfLines={1}>
            {config.label}
          </Text>
          <Text style={[styles.kpiSubLabel, { color: themeColors.text.hint }]} numberOfLines={1}>
            {subLabel}
          </Text>
        </View>
      </View>
    </View>
  );

  if (config.isClickable && onPress) {
    return (
      <TouchableOpacity
        style={styles.kpiCardWrapper}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${config.label}: ${value}`}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.kpiCardWrapper}>{content}</View>;
};

interface StatusPillProps {
  label: string;
  count: number;
  color: string;
  isDark: boolean;
}

const StatusPill: React.FC<StatusPillProps> = ({ label, count, color, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  return (
    <View style={styles.statusPill}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusPillText, { color: themeColors.text.secondary }]}>{label}:</Text>
      <Text style={[styles.statusPillCount, { color: themeColors.text.primary }]}>{count}</Text>
    </View>
  );
};

const DailyStatsPanelSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const shimmerColor = isDark ? colors.dark.cardElevated : colors.grey[5];
  return (
    <View style={styles.container}>
      <View style={[styles.skeletonBlock, { width: ms(140), height: ms(14), backgroundColor: shimmerColor, marginHorizontal: spacing.md, marginBottom: spacing.sm }]} />
      <View style={styles.cardsContainer}>
        {[0, 1, 2].map((rowIdx) => (
          <View key={rowIdx} style={styles.cardsRow}>
            <View style={[styles.kpiCardWrapper, { backgroundColor: shimmerColor, borderRadius: ms(10), height: ms(80), opacity: 0.5 }]} />
            <View style={[styles.kpiCardWrapper, { backgroundColor: shimmerColor, borderRadius: ms(10), height: ms(80), opacity: 0.5 }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const DailyStatsPanel: React.FC<DailyStatsPanelProps> = ({
  reportDate,
  scope = 'company',
  plantCode = null,
  regionName = null,
  onKpiFilter,
  onKpiFilterClear,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useRealtimeDailyIntelligence({
    reportDate,
    scope,
    plantCode,
    regionName,
    enabled: true,
  });

  const handleKpiPress = useCallback(
    (key: string, label: string, orderCodes: string[]) => {
      if (activeKpi === key) {
        setActiveKpi(null);
        onKpiFilterClear?.();
      } else {
        setActiveKpi(key);
        onKpiFilter?.(orderCodes, label);
      }
    },
    [activeKpi, onKpiFilter, onKpiFilterClear],
  );

  if (isLoading) {
    return <DailyStatsPanelSkeleton isDark={isDark} />;
  }

  if (!data) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.dark.surface : colors.grey[3] }]}>
      {/* Header — always visible */}
      <TouchableOpacity
        style={[styles.headerRow, !expanded && styles.headerRowCollapsed]}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
            DAILY INTELLIGENCE
          </Text>
          <View style={styles.liveIndicator}>
            <Text style={[styles.liveText, { color: themeColors.text.secondary }]}>Live</Text>
            <View style={styles.liveDot} />
          </View>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={ms(20)}
          color={themeColors.text.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <>
          {/* 2-column rows */}
          <View style={styles.cardsContainer}>
            {[0, 1, 2].map((rowIdx) => (
              <View key={rowIdx} style={styles.cardsRow}>
                {kpiCards.slice(rowIdx * 2, rowIdx * 2 + 2).map((config) => (
                  <KPICard
                    key={config.key}
                    config={config}
                    data={data}
                    isDark={isDark}
                    isActive={activeKpi === config.key}
                    onPress={
                      config.isClickable
                        ? () => handleKpiPress(config.key, config.label, config.getOrderCodes(data))
                        : undefined
                    }
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Status — 2x2 grid with label on top */}
          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: themeColors.text.secondary }]}>Status:</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusGridItem}>
                <StatusPill label="Pre-Pour" count={data.status_pre_pour} color={colors.status.prePour} isDark={isDark} />
              </View>
              <View style={styles.statusGridItem}>
                <StatusPill label="In Process" count={data.status_in_process} color={colors.status.inProcess} isDark={isDark} />
              </View>
              <View style={styles.statusGridItem}>
                <StatusPill label="Completed" count={data.status_completed} color={colors.status.completed} isDark={isDark} />
              </View>
              <View style={styles.statusGridItem}>
                <StatusPill label="Cancelled" count={data.status_canceled} color={colors.status.cancelled} isDark={isDark} />
              </View>
            </View>
          </View>

          {/* Top Products */}
          {data.top_products && data.top_products.length > 0 && (
            <View style={styles.topProductsRow}>
              <Text style={[styles.topProductsLabel, { color: themeColors.text.secondary }]}>Top Products:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topProductsScroll}>
                {data.top_products.map((product, index) => (
                  <View
                    key={`${product.item_code}-${index}`}
                    style={[styles.productChip, { backgroundColor: isDark ? colors.dark.card : colors.common.white }]}>
                    <Text style={[styles.productChipText, { color: themeColors.text.primary }]}>
                      {product.item_code}({product.count})
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: ms(12),
    marginBottom: spacing.xs,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerRowCollapsed: {
    marginBottom: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
    letterSpacing: 0.8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  liveDot: {
    width: ms(7),
    height: ms(7),
    borderRadius: ms(4),
    backgroundColor: colors.success.main,
  },
  liveText: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },

  // 2-column rows
  cardsContainer: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiCardWrapper: {
    flex: 1,
  },
  kpiCard: {
    borderRadius: ms(10),
    borderWidth: 1,
    padding: ms(10),
    height: ms(90),
    justifyContent: 'center',
  },
  kpiCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ms(8),
  },
  kpiIconCircle: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ms(2),
  },
  kpiContent: {
    flex: 1,
  },
  kpiValue: {
    fontSize: ms(20),
    fontFamily: fontFamily.bold,
    lineHeight: ms(24),
  },
  kpiLabel: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
    lineHeight: ms(16),
  },
  kpiSubLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    lineHeight: ms(14),
    marginTop: ms(1),
  },

  // Status 2x2 grid
  statusContainer: {
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  statusLabel: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
    marginBottom: spacing.xs,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusGridItem: {
    width: '46%',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(3),
  },
  statusDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  statusPillText: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  statusPillCount: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },

  // Top products
  topProductsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  topProductsLabel: {
    fontSize: ms(12),
    fontFamily: fontFamily.semiBold,
    marginRight: spacing.xs,
  },
  topProductsScroll: {
    gap: ms(4),
  },
  productChip: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(6),
  },
  productChipText: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
  },

  // Skeleton
  skeletonBlock: {
    borderRadius: ms(8),
  },
});

export default DailyStatsPanel;
