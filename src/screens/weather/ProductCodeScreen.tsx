import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { Text, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs, responsive } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProductCodeRouteProp = RouteProp<RootStackParamList, 'ProductCode'>;

const GRID = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

// Weather theme colors for header gradient
const WEATHER_COLORS = colors.weatherTheme;

// Accent color for light mode content
const ACCENT_BLUE = '#3949ab';

const mockData = {
  status: 'Firm',
  onJobTime: '06:00',
  rate: '10.50',
  date: '11/07/25',
  schedules: [
    {
      id: '1',
      scheduleNumber: 'Schedule 1',
      orderId: 'Order-45',
      date: '13 Apr, 2025',
      time: '11:30PM',
      customerCheck: 'Customer Check-AEM Machine',
      status: 'Delayed',
      statusColor: '#EF5350',
      spacing: '5 Min',
      pourRate: '120.00 CY/HR',
      location: 'Greenwood 303',
      productCode: 'SCCA60 (OOOT CLASS) | 4.00 IN | 290.00 CY',
    },
    {
      id: '2',
      scheduleNumber: 'Schedule 2',
      orderId: 'Order-45',
      date: '13 Apr, 2025',
      time: '11:30PM',
      customerCheck: 'Customer Check-AEM Machine',
      status: 'In Progress',
      statusColor: '#66BB6A',
      spacing: '5 Min',
      pourRate: '120.00 CY/HR',
      location: 'Greenwood 303',
      productCode: 'SCCA60 (OOOT CLASS) | 4.00 IN | 290.00 CY',
    },
  ],
  orderCodes: [
    {
      id: '1',
      code: '5528301 (4000 PSI BLD NB3)',
      slump: '4.00 IN',
      quantity: '10.50 CY',
      type: 'Concrete',
      typeColor: '#66BB6A',
    },
    {
      id: '2',
      code: '6988301 (4000 PSI BLD NB3)',
      slump: '4.00 IN',
      quantity: '10.50 CY',
      type: 'Associated Product',
      typeColor: '#42A5F5',
    },
  ],
};

// Schedule Card Component - Light Mode
interface ScheduleCardProps {
  schedule: (typeof mockData.schedules)[0];
  onPress: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, onPress }) => (
  <TouchableOpacity style={styles.scheduleCard} onPress={onPress} activeOpacity={0.7}>
    {/* Blue accent border */}
    <View style={styles.cardAccent} />

    <View style={styles.scheduleContent}>
      {/* Schedule Header */}
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleNumber}>{schedule.scheduleNumber}</Text>
        <View style={styles.scheduleDot} />
        <Text style={styles.scheduleOrderId}>{schedule.orderId}</Text>
        <View style={styles.scheduleDot} />
        <Text style={styles.scheduleDate}>
          {schedule.date} | {schedule.time}
        </Text>
      </View>

      {/* Customer Check Title */}
      <View style={styles.customerCheckRow}>
        <Text style={styles.customerCheckTitle}>{schedule.customerCheck}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: schedule.statusColor + '20' },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: schedule.statusColor }]}
          />
          <Text style={[styles.statusText, { color: schedule.statusColor }]}>
            {schedule.status}
          </Text>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <Icon name="timer-outline" size={ms(13)} color={colors.light.text.hint} />
        <Text style={styles.detailText}>Spacing: {schedule.spacing}</Text>
        <Text style={styles.detailDivider}>|</Text>
        <Text style={styles.detailText}>Pour Rate: {schedule.pourRate}</Text>
      </View>

      {/* Location Row */}
      <View style={styles.detailsRow}>
        <Icon name="map-marker-outline" size={ms(13)} color={colors.light.text.hint} />
        <Text style={styles.detailText}>{schedule.location}</Text>
      </View>

      {/* Product Code Row */}
      <View style={styles.productCodeRow}>
        <Icon name="cube-outline" size={ms(13)} color={ACCENT_BLUE} />
        <Text style={styles.productCodeText}>{schedule.productCode}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// Barcode Component - Vertical lines barcode
const BarcodeImage: React.FC = () => {
  // Generate barcode pattern with varying widths
  const bars = [];
  const pattern = [2, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1];

  for (let i = 0; i < pattern.length; i++) {
    bars.push(
      <View
        key={i}
        style={{
          width: pattern[i],
          height: '100%',
          backgroundColor: i % 2 === 0 ? '#000' : 'transparent',
        }}
      />
    );
  }

  return (
    <View style={styles.barcodeContainer}>
      <View style={styles.barcodeInner}>
        {bars}
      </View>
      <Text style={styles.barcodeNumber}>5528301</Text>
    </View>
  );
};

// Order Code Card Component - Matching Image Layout
interface OrderCodeCardProps {
  orderCode: (typeof mockData.orderCodes)[0];
  onPress: () => void;
  showTruck?: boolean;
}

const OrderCodeCard: React.FC<OrderCodeCardProps> = ({ orderCode, onPress, showTruck }) => (
  <View style={styles.orderCodeCard}>
    {/* Main Content Area */}
    <View style={styles.orderCodeContent}>
      {/* Left - Barcode Section */}
      <View style={styles.barcodeSection}>
        <BarcodeImage />
      </View>

      {/* Right - Info Section */}
      <View style={styles.orderCodeInfo}>
        <View style={[styles.typeBadge, { backgroundColor: orderCode.typeColor }]}>
          <Text style={styles.typeBadgeText}>{orderCode.type}</Text>
        </View>
        <Text style={styles.quantityValue}>{orderCode.quantity}</Text>
        <Text style={styles.slumpText}>SLUMP: {orderCode.slump}</Text>
      </View>

      {/* Truck Image - positioned in content area */}
      {showTruck && (
        <View style={styles.truckImageContainer}>
          <Icon name="truck-delivery" size={ms(60)} color="#90CAF9" />
        </View>
      )}
    </View>

    {/* Code Text */}
    <Text style={styles.codeText}>{orderCode.code}</Text>

    {/* Check Details Button */}
    <TouchableOpacity style={styles.checkDetailsBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.checkDetailsText}>Click here to check details</Text>
      <Icon name="chevron-right" size={ms(16)} color={colors.light.text.hint} />
    </TouchableOpacity>
  </View>
);

// Main Screen Component
export const ProductCodeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProductCodeRouteProp>();
  const insets = useSafeAreaInsets();

  // Get params from navigation
  const {
    orderStatus = 'Pending',
    onJobTime = '--:--',
    orderDate = '--/--/--',
    rate = '0.00',
  } = route.params || {};

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSchedulePress = useCallback((scheduleId: string) => {
    console.log('Schedule pressed:', scheduleId);
  }, []);

  const handleOrderCodePress = useCallback((codeId: string) => {
    console.log('Order code pressed:', codeId);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={WEATHER_COLORS.background} />

      {/* Header with Weather Gradient - from WeatherScreen */}
      <LinearGradient
        colors={[...WEATHER_COLORS.gradient.colors]}
        locations={[...WEATHER_COLORS.gradient.locations]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        {/* Title Bar */}
        <View style={styles.titleBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Icon name="chevron-left" size={ms(24)} color={colors.common.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={styles.backButton} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>{orderStatus}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>On Job</Text>
            <Text style={styles.statValueLarge}>{onJobTime}</Text>
            <Text style={styles.statSubtext}>{orderDate}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rate</Text>
            <Text style={styles.statValueLarge}>{rate}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content - Light Mode */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Schedule Cards */}
        {mockData.schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onPress={() => handleSchedulePress(schedule.id)}
          />
        ))}

        {/* Order Code Details Section */}
        <View style={styles.orderCodeSection}>
          <Text style={styles.sectionTitle}>Order Code Details</Text>

          {mockData.orderCodes.map((orderCode, index) => (
            <OrderCodeCard
              key={orderCode.id}
              orderCode={orderCode}
              onPress={() => handleOrderCodePress(orderCode.id)}
              showTruck={index === mockData.orderCodes.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container - Light background
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },

  // Header - Weather gradient (dark)
  header: {
    paddingHorizontal: GRID.lg,
    paddingBottom: GRID.lg,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
    paddingTop: GRID.sm,
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(16), ms(18)),
    color: colors.common.white,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WEATHER_COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    paddingVertical: GRID.md,
    paddingHorizontal: GRID.sm,
    borderWidth: 1,
    borderColor: WEATHER_COLORS.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: ms(40),
    backgroundColor: WEATHER_COLORS.cardBorder,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(10), ms(12)),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: GRID.xs,
  },
  statValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(16), ms(18)),
    color: colors.common.white,
  },
  statValueLarge: {
    fontFamily: fontFamily.bold,
    fontSize: responsive(ms(20), ms(24)),
    color: colors.common.white,
  },
  statSubtext: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(9), ms(11)),
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // ScrollView - Light Mode content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID.md,
    paddingBottom: vs(30),
  },

  // Schedule Card - Light Mode
  scheduleCard: {
    backgroundColor: colors.light.surface,
    borderRadius: RADIUS.md,
    marginBottom: GRID.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    backgroundColor: ACCENT_BLUE,
  },
  scheduleContent: {
    flex: 1,
    padding: GRID.md,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: GRID.xs,
  },
  scheduleNumber: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(11), ms(13)),
    color: ACCENT_BLUE,
  },
  scheduleDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.light.text.hint,
    marginHorizontal: GRID.xs + 2,
  },
  scheduleOrderId: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(10), ms(12)),
    color: colors.light.text.secondary,
  },
  scheduleDate: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(10), ms(12)),
    color: colors.light.text.secondary,
  },
  customerCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.xs,
  },
  customerCheckTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(12), ms(14)),
    color: colors.light.text.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs - 1,
    borderRadius: RADIUS.full,
  },
  statusDot: {
    width: ms(5),
    height: ms(5),
    borderRadius: ms(2.5),
    marginRight: GRID.xs,
  },
  statusText: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(9), ms(11)),
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.xs - 1,
  },
  detailText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(10), ms(12)),
    color: colors.light.text.secondary,
    marginLeft: GRID.xs,
  },
  detailDivider: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(10), ms(12)),
    color: colors.light.text.hint,
    marginHorizontal: GRID.xs,
  },
  productCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_BLUE + '12',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.sm,
    marginTop: GRID.xs,
  },
  productCodeText: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(10), ms(12)),
    color: ACCENT_BLUE,
    marginLeft: GRID.xs,
    flex: 1,
  },

  // Order Code Section - Light Mode
  orderCodeSection: {
    marginTop: GRID.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(14), ms(16)),
    color: colors.light.text.primary,
    marginBottom: GRID.sm,
  },

  // Order Code Card - Matching Image Layout
  orderCodeCard: {
    backgroundColor: colors.light.surface,
    borderRadius: RADIUS.lg,
    marginBottom: GRID.md,
    padding: GRID.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  orderCodeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: GRID.sm,
  },
  // Barcode Section
  barcodeSection: {
    marginRight: GRID.md,
  },
  barcodeContainer: {
    width: ms(80),
    height: ms(60),
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: RADIUS.sm,
    padding: GRID.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ms(35),
    width: '100%',
  },
  barcodeNumber: {
    fontFamily: fontFamily.medium,
    fontSize: ms(8),
    color: '#333',
    marginTop: GRID.xs - 2,
    letterSpacing: 1,
  },
  // Order Code Info
  orderCodeInfo: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: GRID.sm + 2,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    marginBottom: GRID.xs,
  },
  typeBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: responsive(ms(10), ms(11)),
    color: colors.common.white,
  },
  quantityValue: {
    fontFamily: fontFamily.bold,
    fontSize: responsive(ms(20), ms(24)),
    color: colors.light.text.primary,
    lineHeight: responsive(ms(24), ms(28)),
  },
  slumpText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(11), ms(13)),
    color: colors.light.text.secondary,
    marginTop: GRID.xs - 2,
  },
  // Truck Image Container
  truckImageContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    opacity: 0.4,
  },
  codeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: responsive(ms(12), ms(14)),
    color: colors.light.text.primary,
    marginBottom: GRID.sm,
    marginTop: GRID.xs,
  },
  // Check Details Button
  checkDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: GRID.sm,
    paddingBottom: GRID.xs,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  checkDetailsText: {
    fontFamily: fontFamily.regular,
    fontSize: responsive(ms(12), ms(14)),
    color: colors.light.text.hint,
    marginRight: GRID.xs,
  },
});

export default ProductCodeScreen;
