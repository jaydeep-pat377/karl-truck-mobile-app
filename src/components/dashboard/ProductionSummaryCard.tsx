import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Icon } from '../common';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { ms, spacing, wp, isSmallDevice, isTablet } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';
import Svg, { Circle, Path } from 'react-native-svg';

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
}


const RegionCircularProgress: React.FC<{ progress: number; size?: number; isDark?: boolean }> = ({ progress, size = 55, isDark = false }) => {
  const regionColors = isDark ? colors.regionCard.dark : colors.regionCard.light;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 2;

  // Calculate pie slice path
  const percentage = Math.min(Math.max(progress, 0), 100);
  const angle = (percentage / 100) * 360;
  const startAngle = -90; // Start from top
  const endAngle = startAngle + angle;

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArcFlag = angle > 180 ? 1 : 0;

  // Pie slice path: move to center, line to start, arc to end, close
  const piePath = percentage > 0 && percentage < 100
    ? `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
    : '';

  return (
    <View style={regionStyles.circleContainer}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={regionColors.progressBg}
        />
        {/* Pie slice for progress */}
        {percentage >= 100 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={regionColors.progressColor}
          />
        ) : percentage > 0 ? (
          <Path
            d={piePath}
            fill={regionColors.progressColor}
          />
        ) : null}
      </Svg>
    </View>
  );
};

const regionStyles = StyleSheet.create({
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

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
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // Responsive values
  const isSmall = isSmallDevice();
  const isTab = isTablet();
  const regionCardWidth = isTab ? wp(35) : isSmall ? wp(78) : wp(72);
  const circleSize = isTab ? ms(50) : isSmall ? ms(36) : ms(40);

  const progress = totalQty > 0 ? (deliveredQty / totalQty) * 100 : 0;
  const progressPercent = Math.round(progress);

  const formatQty = (qty: number) => {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(2);
  };

  const renderCompanyItem = ({ item }: { item: CompanyData }) => {
    const companyProgress = item.totalQty > 0 ? (item.deliveredQty / item.totalQty) * 100 : 0;
    const regionColors = isDark ? colors.regionCard.dark : colors.regionCard.light;

    return (
      <View style={[styles.regionCard, { backgroundColor: regionColors.background, minWidth: regionCardWidth }]}>
        {/* Left side - Circle */}
        <View style={styles.regionLeftSection}>
          <RegionCircularProgress progress={companyProgress} size={circleSize} isDark={isDark} />
        </View>

        {/* Right side - Content */}
        <View style={styles.regionRightSection}>
          {/* Top row - Title + Badge */}
          <View style={styles.regionTopRow}>
            <Text style={[styles.regionName, { color: regionColors.titleColor, maxWidth: regionCardWidth * 0.5 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={[styles.regionBadge, { backgroundColor: colors.dashboard.statBlue }]}
              onPress={() => onCompanyPress?.(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.regionBadgeText}>COMPANY</Text>
            </TouchableOpacity>
          </View>

          {/* Middle row - Qty */}
          <Text style={styles.regionQtyRow}>
            <Text style={[styles.regionQtyValue, { color: regionColors.qtyColor }]}>{formatQty(item.deliveredQty)}</Text>
            <Text style={[styles.regionQtyOf, { color: regionColors.ofTextColor }]}> OF </Text>
            <Text style={[styles.regionQtyValue, { color: regionColors.qtyColor }]}>{formatQty(item.totalQty)} CY</Text>
          </Text>

          {/* Bottom row - Stats */}
          <Text style={[styles.regionStatsRow, { color: regionColors.statsColor }]}>
            Total: {item.totalOrders}, Active: {item.activeOrders}, Cancelled: {item.cancelledOrders}
          </Text>
        </View>
      </View>
    );
  };

  const renderRegionItem = ({ item }: { item: RegionData }) => {
    const regionProgress = item.totalQty > 0 ? (item.deliveredQty / item.totalQty) * 100 : 0;
    const regionColors = isDark ? colors.regionCard.dark : colors.regionCard.light;

    return (
      <View style={[styles.regionCard, { backgroundColor: regionColors.background, minWidth: regionCardWidth }]}>
        {/* Left side - Circle */}
        <View style={styles.regionLeftSection}>
          <RegionCircularProgress progress={regionProgress} size={circleSize} isDark={isDark} />
        </View>

        {/* Right side - Content */}
        <View style={styles.regionRightSection}>
          {/* Top row - Title + Badge */}
          <View style={styles.regionTopRow}>
            <Text style={[styles.regionName, { color: regionColors.titleColor, maxWidth: regionCardWidth * 0.5 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={[styles.regionBadge, { backgroundColor: regionColors.badgeColor }]}
              onPress={() => onRegionPress?.(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.regionBadgeText}>REGION</Text>
            </TouchableOpacity>
          </View>

          {/* Middle row - Qty */}
          <Text style={styles.regionQtyRow}>
            <Text style={[styles.regionQtyValue, { color: regionColors.qtyColor }]}>{formatQty(item.deliveredQty)}</Text>
            <Text style={[styles.regionQtyOf, { color: regionColors.ofTextColor }]}> OF </Text>
            <Text style={[styles.regionQtyValue, { color: regionColors.qtyColor }]}>{formatQty(item.totalQty)} CY</Text>
          </Text>

          {/* Bottom row - Stats */}
          <Text style={[styles.regionStatsRow, { color: regionColors.statsColor }]}>
            Total: {item.totalOrders}, Active: {item.activeOrders}, Cancelled: {item.cancelledOrders}
          </Text>
        </View>
      </View>
    );
  };

  const renderPlantItem = ({ item }: { item: PlantData }) => {
    const plantProgress = item.totalQty > 0 ? (item.deliveredQty / item.totalQty) * 100 : 0;
    const regionColors = isDark ? colors.regionCard.dark : colors.regionCard.light;

    return (
      <View style={[styles.regionCard, { backgroundColor: regionColors.background, minWidth: regionCardWidth }]}>
        {/* Left side - Circle */}
        <View style={styles.regionLeftSection}>
          <RegionCircularProgress progress={plantProgress} size={circleSize} isDark={isDark} />
        </View>

        {/* Right side - Content */}
        <View style={styles.regionRightSection}>
          {/* Top row - Title + Badge */}
          <View style={styles.regionTopRow}>
            <Text style={[styles.regionName, { color: regionColors.titleColor, maxWidth: regionCardWidth * 0.5 }]} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={[styles.regionBadge, { backgroundColor: colors.dashboard.statGreen }]}
              onPress={() => onPlantPress?.(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.regionBadgeText}>PLANT</Text>
            </TouchableOpacity>
          </View>

          {/* Middle row - Qty */}
          <Text style={styles.regionQtyRow}>
            <Text style={[styles.regionQtyValue, { color: regionColors.qtyColor }]}>{formatQty(item.deliveredQty)}</Text>
            <Text style={[styles.regionQtyOf, { color: regionColors.ofTextColor }]}> OF </Text>
            <Text style={[styles.regionQtyValue, { color: regionColors.qtyColor }]}>{formatQty(item.totalQty)} CY</Text>
          </Text>

          {/* Bottom row - Stats */}
          <Text style={[styles.regionStatsRow, { color: regionColors.statsColor }]}>
            Total: {item.totalOrders}, Active: {item.activeOrders}, Cancelled: {item.cancelledOrders}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.regionsOnlyContainer}>
      {/* Temporarily commented out - Header
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="clipboard-text-outline" size={ms(18)} color={themeColors.text.primary} />
            <Text style={[styles.title, { color: themeColors.text.primary }]}>{title}</Text>
          </View>
        </View>
      </View>
      */}

      {/* Temporarily commented out - Stats Row
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
      */}

      {companies.length > 0 && (
        <View>
          <Text style={[styles.sectionLabel, { color: themeColors.text.primary }]}>Company Summary</Text>
          <FlatList
            data={companies}
            renderItem={renderCompanyItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionsList}
            style={styles.regionsListOnly}
          />
        </View>
      )}

      {regions.length > 0 && (
        <View style={companies.length > 0 ? styles.listMarginTop : undefined}>
          <Text style={[styles.sectionLabel, { color: themeColors.text.primary }]}>Region Summary</Text>
          <FlatList
            data={regions}
            renderItem={renderRegionItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionsList}
            style={styles.regionsListOnly}
          />
        </View>
      )}

      {plants.length > 0 && (
        <View style={(companies.length > 0 || regions.length > 0) ? styles.listMarginTop : undefined}>
          <Text style={[styles.sectionLabel, { color: themeColors.text.primary }]}>Plant Summary</Text>
          <FlatList
            data={plants}
            renderItem={renderPlantItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.regionsList}
            style={styles.regionsListOnly}
          />
        </View>
      )}

      {/* Temporarily commented out - Production Section
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
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  regionsOnlyContainer: {
    marginHorizontal: spacing.lg,
  },
  regionsListOnly: {
    marginHorizontal: 0,
    overflow: 'visible',
  },
  listMarginTop: {
    marginTop: ms(12),
  },
  sectionLabel: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
    marginBottom: ms(8),
    paddingHorizontal: ms(4),
  },
  container: {
    borderRadius: ms(10),
    padding: ms(8),
    marginHorizontal: spacing.lg,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: ms(4),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
  },
  title: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(8),
  },
  statIcon: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },
  statValue: {
    fontSize: ms(17),
    fontFamily: fontFamily.bold,
  },
  productionSection: {
    paddingTop: ms(6),
  },
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  productionTitle: {
    fontSize: ms(14),
    fontFamily: fontFamily.semiBold,
  },
  productionQty: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  progressTrack: {
    height: ms(4),
    borderRadius: ms(4),
    overflow: 'hidden',
    marginBottom: ms(6),
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
    fontSize: ms(12),
    fontFamily: fontFamily.regular,
  },
  percentText: {
    fontSize: ms(12),
    fontFamily: fontFamily.bold,
  },
  regionsContainer: {
    marginHorizontal: -ms(8),
    marginBottom: ms(6),
  },
  regionsList: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(6),
    gap: ms(10),
  },
  regionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    borderRadius: ms(12),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  regionLeftSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10),
  },
  regionRightSection: {
    flex: 1,
  },
  regionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  regionName: {
    fontSize: ms(14),
    fontFamily: fontFamily.bold,
    flex: 1,
    marginRight: ms(6),
  },
  regionBadge: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(12),
  },
  regionBadgeText: {
    color: colors.common.white,
    fontSize: ms(8),
    fontFamily: fontFamily.bold,
    letterSpacing: 0.2,
  },
  regionQtyRow: {
    marginBottom: ms(2),
  },
  regionQtyValue: {
    fontSize: ms(12),
    fontFamily: fontFamily.bold,
  },
  regionQtyOf: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  regionStatsRow: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },
});

export default ProductionSummaryCard;
