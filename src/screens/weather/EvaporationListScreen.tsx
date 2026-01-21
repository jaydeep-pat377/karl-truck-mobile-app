import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { Text } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type EvaporationListRouteProp = RouteProp<RootStackParamList, 'EvaporationList'>;

const GRID = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

const WEATHER_COLORS = colors.weatherTheme;

const mockEvaporationDetails = {
  status: 'Shrinking Cracking',
  evaporationRate: '0.15 mm/day',
  concreteTemp: '55°F',
  orderNo: '553439',
  currentTicketNo: 'TKT-2025-0892',
  productDetails: {
    mixDesign: '3CCC608',
    slump: '4 inches',
    airContent: '5.5%',
    waterCementRatio: '0.45',
    aggregateSize: '3/4 inch',
    admixtures: 'Water Reducer, Retarder',
    curingMethod: 'Wet Curing',
    estimatedSetTime: '4-6 hours',
  },
  references: {
    aci305: 'ACI 305R - Hot Weather Concreting',
    aci308: 'ACI 308R - Curing Concrete',
    astmC94: 'ASTM C94 - Ready-Mixed Concrete',
    description: 'Evaporation rate calculations are based on ACI 305R guidelines. When the evaporation rate exceeds 0.25 kg/m²/hr, precautions should be taken to prevent plastic shrinkage cracking.',
  },
};

interface StatusTableRowProps {
  label: string;
  value: string;
  isLast?: boolean;
  valueColor?: string;
}

const StatusTableRow: React.FC<StatusTableRowProps> = ({
  label,
  value,
  isLast = false,
  valueColor,
}) => (
  <View style={[
    styles.tableRow,
    !isLast && styles.tableRowBorder,
  ]}>
    <Text style={styles.tableLabel}>{label}</Text>
    <Text style={[styles.tableValue, valueColor ? { color: valueColor } : null]}>
      {value}
    </Text>
  </View>
);

interface StatusTableCardProps {
  title: string;
  icon: string;
  data: Array<{ label: string; value: string; valueColor?: string }>;
}

const StatusTableCard: React.FC<StatusTableCardProps> = ({
  title,
  icon,
  data,
}) => {
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusCardHeader}>
        <View style={styles.statusCardIconContainer}>
          <Icon name={icon} size={ms(18)} color={colors.secondary.main} />
        </View>
        <Text style={styles.statusCardTitle}>{title}</Text>
      </View>

      <View style={styles.tableContainer}>
        {data.map((item, index) => (
          <StatusTableRow
            key={item.label}
            label={item.label}
            value={item.value}
            valueColor={item.valueColor}
            isLast={index === data.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setIsExpanded(!isExpanded);
  }, [isExpanded, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.expandableCard}>
      <TouchableOpacity
        style={styles.expandableHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}>
        <View style={styles.expandableHeaderLeft}>
          <View style={styles.expandableIconContainer}>
            <Icon name={icon} size={ms(18)} color={colors.secondary.main} />
          </View>
          <View style={styles.expandableTitleContainer}>
            <Text style={styles.expandableTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.expandableSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Icon name="chevron-down" size={ms(22)} color={WEATHER_COLORS.text.hint} />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandableContent}>
          {children}
        </View>
      )}
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, isLast = false }) => (
  <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const LoadingState: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.secondary.main} />
    <Text style={styles.loadingText}>
      Loading evaporation details...
    </Text>
  </View>
);

export const EvaporationListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EvaporationListRouteProp>();
  const insets = useSafeAreaInsets();
  const { locationName, date, currentEvaporation } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const details = mockEvaporationDetails;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const handleMenu = useCallback(() => {
  }, []);

  const statusData = [
    { label: 'Status', value: details.status, valueColor: colors.warning.main },
    { label: 'Evaporation Rate', value: currentEvaporation?.value ? `${currentEvaporation.value} mm/day` : details.evaporationRate },
    { label: 'Concrete Temp', value: details.concreteTemp },
    { label: 'Order No', value: details.orderNo },
    { label: 'Current Ticket No', value: details.currentTicketNo },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />

      <LinearGradient
        colors={['#0A1628', '#0F1E32', '#162844', '#1E3A5F'] as any}
        locations={[0, 0.3, 0.6, 1] as any}
        style={styles.gradientBackground}
      />

      <View style={[styles.header, { paddingTop: insets.top + GRID.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={colors.common.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Evaporation Details</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleRefresh}
              activeOpacity={0.7}>
              <Icon name="refresh" size={20} color={colors.common.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleMenu}
              activeOpacity={0.7}>
              <Icon name="dots-vertical" size={20} color={colors.common.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerSubtitleRow}>
          <Icon name="map-marker" size={14} color={colors.common.white + 'AA'} />
          <Text style={styles.headerSubtitle}>{locationName}</Text>
          <View style={styles.headerDot} />
          <Text style={styles.headerSubtitle}>{date}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.common.white}
            colors={[colors.common.white]}
          />
        }>
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <StatusTableCard
              title="Status of Weather"
              icon="weather-partly-cloudy"
              data={statusData}
            />

            <ExpandableCard
              title="Details"
              subtitle="You can check all the product details with weather updates."
              icon="clipboard-text-outline"
              defaultExpanded={false}>
              <DetailRow label="Mix Design" value={details.productDetails.mixDesign} />
              <DetailRow label="Slump" value={details.productDetails.slump} />
              <DetailRow label="Air Content" value={details.productDetails.airContent} />
              <DetailRow label="Water/Cement Ratio" value={details.productDetails.waterCementRatio} />
              <DetailRow label="Aggregate Size" value={details.productDetails.aggregateSize} />
              <DetailRow label="Admixtures" value={details.productDetails.admixtures} />
              <DetailRow label="Curing Method" value={details.productDetails.curingMethod} />
              <DetailRow label="Est. Set Time" value={details.productDetails.estimatedSetTime} isLast />
            </ExpandableCard>

            <ExpandableCard
              title="References"
              subtitle="Industry standards and guidelines for evaporation control."
              icon="book-open-variant"
              defaultExpanded={false}>
              <View style={styles.referenceItem}>
                <View style={styles.referenceBullet} />
                <Text style={styles.referenceText}>{details.references.aci305}</Text>
              </View>
              <View style={styles.referenceItem}>
                <View style={styles.referenceBullet} />
                <Text style={styles.referenceText}>{details.references.aci308}</Text>
              </View>
              <View style={styles.referenceItem}>
                <View style={styles.referenceBullet} />
                <Text style={styles.referenceText}>{details.references.astmC94}</Text>
              </View>
              <View style={styles.referenceDescription}>
                <Text style={styles.referenceDescText}>
                  {details.references.description}
                </Text>
              </View>
            </ExpandableCard>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WEATHER_COLORS.background,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
    color: colors.common.white,
  },
  headerActions: {
    flexDirection: 'row',
    gap: GRID.sm,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GRID.sm,
    gap: GRID.xs,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: colors.common.white + 'AA',
  },
  headerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.common.white + '60',
    marginHorizontal: GRID.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID.md,
    paddingBottom: GRID.xl,
  },
  statusCard: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.cardBorder,
    gap: GRID.sm,
  },
  statusCardIconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    backgroundColor: colors.secondary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: WEATHER_COLORS.text.primary,
  },
  tableContainer: {
    paddingHorizontal: GRID.md,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: GRID.sm + GRID.xs,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.cardBorder + '60',
  },
  tableLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(13),
    color: WEATHER_COLORS.text.secondary,
    flex: 1,
  },
  tableValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    color: WEATHER_COLORS.text.primary,
    textAlign: 'right',
    flex: 1,
  },
  expandableCard: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: GRID.sm,
  },
  expandableIconContainer: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    backgroundColor: colors.secondary.main + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandableTitleContainer: {
    flex: 1,
    paddingRight: GRID.sm,
  },
  expandableTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: WEATHER_COLORS.text.primary,
  },
  expandableSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: WEATHER_COLORS.text.hint,
    marginTop: GRID.xs,
    lineHeight: ms(16),
  },
  expandableContent: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
    borderTopWidth: 1,
    borderTopColor: WEATHER_COLORS.cardBorder + '60',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: GRID.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WEATHER_COLORS.cardBorder + '40',
  },
  detailLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.secondary,
  },
  detailValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.primary,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
    gap: GRID.sm,
  },
  referenceBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary.main,
  },
  referenceText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.primary,
  },
  referenceDescription: {
    marginTop: GRID.sm,
    padding: GRID.sm,
    backgroundColor: WEATHER_COLORS.cardBorder + '30',
    borderRadius: RADIUS.md,
  },
  referenceDescText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: WEATHER_COLORS.text.secondary,
    lineHeight: ms(17),
  },
  levelCard: {
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
    padding: GRID.md,
    marginBottom: GRID.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
    marginBottom: GRID.md,
  },
  levelTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: WEATHER_COLORS.text.primary,
  },
  levelProgressContainer: {
    position: 'relative',
    height: vs(20),
    justifyContent: 'center',
    marginBottom: GRID.sm,
  },
  levelProgressBar: {
    height: vs(6),
    borderRadius: vs(3),
  },
  levelIndicator: {
    position: 'absolute',
    top: vs(3),
    marginLeft: ms(-7),
  },
  levelIndicatorDot: {
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: colors.common.white,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  levelLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
  },
  levelLabelText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    color: WEATHER_COLORS.text.hint,
  },
  levelStatusRow: {
    paddingTop: GRID.sm,
    borderTopWidth: 1,
    borderTopColor: WEATHER_COLORS.cardBorder + '60',
  },
  levelStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    gap: GRID.xs,
    marginBottom: GRID.sm,
  },
  levelStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  levelDescription: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: WEATHER_COLORS.text.secondary,
    lineHeight: ms(18),
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: GRID.sm,
    marginTop: GRID.sm,
  },
  actionButton: {
    flex: 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.md,
    gap: GRID.sm,
  },
  actionButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.md,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.secondary.main + '15',
    borderWidth: 1,
    borderColor: colors.secondary.main + '30',
    gap: GRID.sm,
  },
  actionButtonSecondaryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.secondary.main,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.xl * 2,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    color: WEATHER_COLORS.text.secondary,
    marginTop: GRID.md,
  },
});

export default EvaporationListScreen;
