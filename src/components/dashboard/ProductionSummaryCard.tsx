import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - (spacing.lg * 2); // Full screen width minus margins

export type SummaryTabType = 'company' | 'region' | 'plant';

export interface RegionData {
  id: string;
  name: string;
  deliveredQty: number;
  totalQty: number;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
}

export interface CompanyData {
  id: string;
  code: string;
  name: string;
  deliveredQty: number;
  totalQty: number;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
}

export interface PlantWeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
}

export interface PlantData {
  id: string;
  code: string;
  name: string;
  regionName: string | null;
  deliveredQty: number;
  totalQty: number;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  weather: PlantWeatherData | null;
}

interface ProductionSummaryProps {
  title?: string;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  deliveredQty: number;
  totalQty: number;
  companies?: CompanyData[];
  regions?: RegionData[];
  plants?: PlantData[];
  onCompanyPress?: (company: CompanyData) => void;
  onRegionPress?: (region: RegionData) => void;
  onPlantPress?: (plant: PlantData) => void;
  onPress?: () => void;
  onTabChange?: (tab: SummaryTabType, itemCount: number) => void;
}


export const ProductionSummaryCard: React.FC<ProductionSummaryProps> = ({
  title = 'Ready Mix Producer',
  totalOrders,
  activeOrders,
  cancelledOrders,
  deliveredQty,
  totalQty,
  companies = [],
  regions = [],
  plants = [],
  onCompanyPress,
  onRegionPress,
  onPlantPress,
  onTabChange,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // Determine default tab based on available data
  const getDefaultTab = (): SummaryTabType => {
    if (companies.length > 0) return 'company';
    if (regions.length > 0) return 'region';
    if (plants.length > 0) return 'plant';
    return 'company';
  };

  const [selectedTab, setSelectedTab] = useState<SummaryTabType>(getDefaultTab());

  const tabs: { key: SummaryTabType; label: string; count: number }[] = [
    { key: 'company', label: 'Company', count: companies.length },
    { key: 'region', label: 'Region', count: regions.length },
    { key: 'plant', label: 'Plant', count: plants.length },
  ];

  const handleTabPress = (tab: SummaryTabType) => {
    setSelectedTab(tab);
    const count = tab === 'company' ? companies.length : tab === 'region' ? regions.length : plants.length;
    onTabChange?.(tab, count);
  };

  const formatQty = (qty: number) => {
    return qty.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Render a summary card item (Company/Region/Plant) matching top card design
  const renderSummaryListItem = (
    item: CompanyData | RegionData | PlantData,
    type: 'company' | 'region' | 'plant',
    onPress?: () => void
  ) => {
    const itemProgress = item.totalQty > 0 ? (item.deliveredQty / item.totalQty) * 100 : 0;
    const itemProgressPercent = Math.round(itemProgress);

    const getIcon = () => {
      switch (type) {
        case 'company': return 'domain';
        case 'region': return 'map-marker-radius';
        case 'plant': return 'factory';
      }
    };

    const getBadgeColor = () => {
      switch (type) {
        case 'company': return '#8B5CF6'; // Purple
        case 'region': return '#F97316'; // Orange
        case 'plant': return '#3B82F6'; // Blue
      }
    };

    return (
      <TouchableOpacity
        key={`${type}-${item.id}`}
        style={[styles.listItemCard, { backgroundColor: themeColors.card }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Header - matching top card */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name={getIcon()} size={ms(18)} color={themeColors.text.primary} />
            <Text style={[styles.title, { color: themeColors.text.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <View style={[styles.typeLabel, { backgroundColor: getBadgeColor() }]}>
            <Text style={styles.typeLabelText}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </View>
        </View>

        {/* Stats Row - matching top card */}
        <View style={[styles.statsRow, { backgroundColor: isDark ? colors.dark.surface : colors.grey[3] }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.dashboard.statBlue + '15' }]}>
              <Icon name="package-variant" size={ms(16)} color={colors.dashboard.statBlue} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { color: themeColors.text.secondary }]} numberOfLines={1}>Total</Text>
              <Text style={[styles.statValue, { color: themeColors.text.primary }]} numberOfLines={1}>{item.totalOrders}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.dashboard.statGreen + '15' }]}>
              <Icon name="check-circle" size={ms(16)} color={colors.dashboard.statGreen} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { color: themeColors.text.secondary }]} numberOfLines={1}>Active</Text>
              <Text style={[styles.statValue, { color: themeColors.text.primary }]} numberOfLines={1}>{item.activeOrders}</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.dashboard.statRed + '15' }]}>
              <Icon name="close-circle" size={ms(16)} color={colors.dashboard.statRed} />
            </View>
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { color: themeColors.text.secondary }]} numberOfLines={1}>Cancelled</Text>
              <Text style={[styles.statValue, { color: themeColors.text.primary }]} numberOfLines={1}>{item.cancelledOrders}</Text>
            </View>
          </View>
        </View>

        {/* Production & Delivery - matching top card */}
        <View style={styles.productionSection}>
          <View style={styles.productionHeader}>
            <Text style={[styles.productionTitle, { color: themeColors.text.primary }]}>Production & Delivery</Text>
            <Text style={[styles.productionQty, { color: themeColors.text.secondary }]} numberOfLines={1}>
              {formatQty(item.deliveredQty)} OF {formatQty(item.totalQty)} CY
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.semiTransparent.white10 : colors.grey[10] }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(itemProgress, 100)}%`,
                  backgroundColor: colors.dashboard.statGreen,
                },
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <View style={styles.deliveredRow}>
              <View style={[styles.deliveredDot, { backgroundColor: colors.dashboard.statGreen }]} />
              <Text style={[styles.deliveredText, { color: themeColors.text.secondary }]}>
                Delivered: {formatQty(item.deliveredQty)} CY
              </Text>
            </View>
            <Text style={[styles.percentText, { color: themeColors.text.primary }]}>{itemProgressPercent}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.regionsOnlyContainer}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isSelected = selectedTab === tab.key;
          const hasItems = tab.count > 0;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isSelected && styles.tabSelected,
                {
                  backgroundColor: isSelected
                    ? colors.primary.main
                    : isDark
                      ? colors.dark.surface
                      : colors.common.white,
                  borderColor: isSelected
                    ? colors.primary.main
                    : isDark
                      ? colors.dark.border
                      : colors.grey[25],
                  opacity: hasItems ? 1 : 0.5,
                },
              ]}
              onPress={() => hasItems && handleTabPress(tab.key)}
              activeOpacity={0.7}
              disabled={!hasItems}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isSelected ? colors.common.white : themeColors.text.primary },
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[
                  styles.tabBadge,
                  { backgroundColor: isSelected ? colors.semiTransparent.white20 : colors.primary.main + '20' }
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    { color: isSelected ? colors.common.white : colors.primary.main }
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizontal Scroll Cards */}
      {(companies.length > 0 || regions.length > 0 || plants.length > 0) && (
        <ScrollView
          key={selectedTab}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryListContent}
          style={styles.summaryList}
        >
          {selectedTab === 'company' && companies.map((company) =>
            renderSummaryListItem(company, 'company', () => onCompanyPress?.(company))
          )}
          {selectedTab === 'region' && regions.map((region) =>
            renderSummaryListItem(region, 'region', () => onRegionPress?.(region))
          )}
          {selectedTab === 'plant' && plants.map((plant) =>
            renderSummaryListItem(plant, 'plant', () => onPlantPress?.(plant))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  regionsOnlyContainer: {
    marginHorizontal: spacing.lg,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: ms(8),
    marginBottom: ms(8),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(3),
    paddingHorizontal: ms(12),
    borderRadius: ms(10),
    borderWidth: 1,
    gap: ms(6),
  },
  tabSelected: {
    borderWidth: 0,
  },
  tabText: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  tabBadge: {
    paddingHorizontal: ms(5),
    paddingVertical: ms(1),
    borderRadius: ms(8),
    minWidth: ms(16),
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: ms(9),
    fontFamily: fontFamily.bold,
  },
  summaryList: {
    marginHorizontal: -spacing.lg,
  },
  summaryListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: ms(8),
    gap: ms(10),
  },
  listItemCard: {
    width: CARD_WIDTH,
    borderRadius: ms(10),
    paddingTop: ms(12),
    paddingHorizontal: ms(12),
    paddingBottom: ms(8),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    flex: 1,
  },
  typeLabel: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(2),
    borderRadius: ms(22),
    marginLeft: ms(8),
  },
  typeLabelText: {
    color: colors.common.white,
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
  },
  title: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ms(10),
    paddingHorizontal: ms(8),
    marginBottom: ms(8),
    borderRadius: ms(8),
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    paddingRight: ms(4),
  },
  statIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  statLabel: {
    fontSize: ms(10),
    fontFamily: fontFamily.regular,
    lineHeight: ms(12),
  },
  statValue: {
    fontSize: ms(15),
    fontFamily: fontFamily.bold,
    lineHeight: ms(18),
  },
  productionSection: {
    paddingTop: 0,
  },
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  productionTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
    flexShrink: 1,
  },
  productionQty: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
    flexShrink: 0,
  },
  progressTrack: {
    height: ms(4),
    borderRadius: ms(4),
    overflow: 'hidden',
    marginBottom: ms(4),
  },
  progressFill: {
    height: '100%',
    borderRadius: ms(4),
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  deliveredDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
  },
  deliveredText: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  percentText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
  },
});

export default ProductionSummaryCard;
