import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  RefreshControl,
  Animated,
  Pressable,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TopGradientBackground, TruckLoader, Icon, AlertModal } from '../../components/common';
import YellowTruck from '../../assets/svgs/yellowTruck.svg';
import Isolation_Mode from '../../assets/svgs/Isolation_Mode.svg';
import { Order } from '../../types';
import { colors } from '../../theme/colors';
import { getStatusColor, getStatusLabel } from '../../utils/statusUtils';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';
import { useOrderDetails, useAlert } from '../../hooks';

type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GRID = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

const SHADOWS = {
  sm: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

const getMockOrder = (orderId: string): Order => ({
  id: orderId,
  orderCode: '269-10120',
  customerName: 'Dagmar Construction Inc',
  customerPhone: '+1 (555) 123-4567',
  projectName: 'Downtown Plaza Foundation',
  deliveryAddress: 'ISSUE EXCAVATOR DR. GREYWA, FL(A), 5-02 G-MA',
  deliveryCity: 'Charlotte',
  deliveryState: 'NC',
  deliveryZip: '28202',
  pickupAddress: 'Ready Mix Plant - 456 Industrial Ave',
  latitude: 35.2271,
  longitude: -80.8431,
  scheduledDate: '2025-11-07',
  scheduledTime: '08:00',
  status: 'IN_PROCESS',
  productType: '3CCC608',
  productMix: '+406 BR | 256.00 CY',
  quantity: 256,
  unit: 'CY',
  deliveredQuantity: 27,
  remainingQuantity: 18,
  totalLoads: 6,
  completedLoads: 3,
  progress: 60,
  distance: '12.5 mi',
  estimatedFinishTime: '04:30PM',
  specialInstructions: 'Enter through the north gate.',
  assignedTruckId: 'T-101',
  assignedDriverName: 'John Driver',
  eta: '15 min',
  hasAlert: false,
  createdAt: '2024-01-16T08:00:00Z',
  updatedAt: '2024-01-17T10:30:00Z',
});

const mockJobData = {
  elapsedTime: '12:08',
  deliveredVolume: 11.77,
  pouredVolume: 9.42,
  orderedVolume: 11.75,
  remainingVolume: 2.33,
  estimatedFinish: '04:30PM',
  temperature: 28,
  siteName: 'Dagmar Construction Inc',
  plantName: 'Greenwood',
  plantCode: '303',
  plantPhone: '+621-0262 987 323',
  plantAddress1: '456 Industrial Ave',
  plantAddress2: 'Charlotte, NC 28202',
  truckCount: 3,
  avgSpacing: '45 min',
  status: 'In Progress',
  statusPills: [
    { label: 'Loading', value: 186, unit: 'CY', active: false, icon: 'truck-loading' },
    { label: 'To Job', value: 148, unit: 'CY', active: false, icon: 'truck-fast' },
    { label: 'At Job', value: 112, unit: 'CY', active: true, icon: 'map-marker' },
    { label: 'Pouring', value: 64, unit: 'CY', active: false, icon: 'water' },
  ],
  pourSpeedData: [
    { time: '08:00', delivered: 10, poured: 5, ordered: 8 },
    { time: '08:30', delivered: 24, poured: 12, ordered: 7 },
    { time: '09:00', delivered: 20, poured: 26, ordered: 16 },
    { time: '09:30', delivered: 22, poured: 30, ordered: 10 },
    { time: '10:00', delivered: 15, poured: 10, ordered: 28 },
  ],
  pourSpeedRaw: {
    ordered: [] as Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>,
    delivered: [] as Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>,
    poured: [] as Array<{ time: string; time_display: string; rate: number; cumulative_qty?: number }>,
    scheduleRate: 30,
    yMax: 50,
    hasData: false,
  },
  trucksOnJobData: [
    { time: '07:00', trucks: 1, spacing: 2, load: 3 },
    { time: '07:30', trucks: 1, spacing: 2, load: 3 },
    { time: '08:00', trucks: 2, spacing: 3, load: 4 },
    { time: '08:30', trucks: 3, spacing: 3, load: 5 },
    { time: '09:00', trucks: 3, spacing: 4, load: 5 },
    { time: '09:30', trucks: 2, spacing: 3, load: 4 },
    { time: '10:00', trucks: 2, spacing: 3, load: 4 },
  ],
  trucksOnJobRaw: {
    timePoints: [] as Array<{ time: string; time_display: string; waiting: number; pouring: number; washout: number; total: number }>,
    averages: { avg_waiting_minutes: 0, avg_pouring_minutes: 0, avg_washout_minutes: 0 },
    hasData: false,
  },
  products: [
    { productId: '1', itemCode: '552B301 (4000 PSI BLD NBS)', isMix: true, orderedQty: 10.50, slump: '4.00 IN', qr: '4000' },
    { productId: '2', itemCode: '668B301 (4000 PSI BLD NBS)', isMix: false, orderedQty: 10.50, slump: '4.00 IN', qr: '4000' },
  ],
};

interface AnimatedPressProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  activeOpacity?: number;
  disabled?: boolean;
}

const AnimatedPress: React.FC<AnimatedPressProps> = ({
  children,
  onPress,
  style,
  activeOpacity = 0.95,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: pressed ? activeOpacity : 1 }]}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

interface CircularProgressProps {
  time: string;
  label: string;
  progress: number;
  size?: number;
  isDark: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  time,
  label,
  progress,
  size = ms(120),
  isDark,
}) => {
  const strokeWidth = ms(8);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;
  const center = size / 2;
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.circularProgressContainer}>
      <View style={[
        styles.circularProgressOuter,
        {
          backgroundColor: themeColors.card,
          ...SHADOWS.lg,
          shadowColor: colors.primary.main,
          shadowOpacity: isDark ? 0.2 : 0.12,
        }
      ]}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary.main} />
              <Stop offset="50%" stopColor={colors.primary.light} />
              <Stop offset="100%" stopColor={colors.secondary.main} />
            </SvgGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? colors.grey[60] + '20' : colors.grey[10]}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View style={styles.circularProgressInner}>
          <Text style={[styles.progressTime, { color: themeColors.text.primary }]}>{time}</Text>
          <Text style={[styles.progressLabel, { color: themeColors.text.hint }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
};

interface QuickStatProps {
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
  isDark: boolean;
  highlight?: boolean;
}

const QuickStat: React.FC<QuickStatProps> = ({
  icon,
  label,
  value,
  unit,
  color,
  isDark,
  highlight = false,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[
      styles.quickStatCard,
      {
        backgroundColor: highlight
          ? (isDark ? color + '15' : color + '08')
          : themeColors.card,
        borderColor: highlight ? color + '30' : 'transparent',
        borderWidth: highlight ? 1 : 0,
      }
    ]}>
      <View style={[styles.quickStatIcon, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.quickStatLabel, { color: themeColors.text.hint }]}>{label}</Text>
      <View style={styles.quickStatValueRow}>
        <Text style={[styles.quickStatValue, { color: highlight ? color : themeColors.text.primary }]}>
          {value}
        </Text>
        <Text style={[styles.quickStatUnit, { color: themeColors.text.secondary }]}>{unit}</Text>
      </View>
    </View>
  );
};

interface StatusPipelineProps {
  statuses: Array<{
    label: string;
    value: number;
    unit: string;
    active: boolean;
    icon: string;
  }>;
  isDark: boolean;
}

const StatusPipeline: React.FC<StatusPipelineProps> = ({ statuses, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const activeIndex = statuses.findIndex(s => s.active);

  const indicatorColors = [
    colors.success.main,
    colors.warning.main,
    colors.success.main,
    colors.info.main,
  ];

  const getIndicatorColor = (index: number) => {
    return indicatorColors[index] || colors.grey[40];
  };

  const getProgress = (status: { value: number; unit: string }) => {
    const totalMatch = status.unit.match(/\/(\d+)/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 1;
    if (total === 0) return 0;
    return Math.round((status.value / total) * 100);
  };

  const separatorColor = isDark ? colors.grey[50] : colors.grey[15];

  return (
    <View style={[styles.pipelineContainer, { backgroundColor: themeColors.card }]}>
      <View style={styles.pipelineRow}>
        {statuses.map((status, index) => {
          const isActive = status.active;
          const isLast = index === statuses.length - 1;
          const indicatorColor = getIndicatorColor(index);
          const progress = getProgress(status);

          return (
            <View
              key={index}
              style={[
                styles.pipelineItem,
                !isLast && {
                  borderRightWidth: 1,
                  borderRightColor: separatorColor,
                },
              ]}>
              <Text
                style={[
                  styles.pipelineLabel,
                  {
                    color: themeColors.text.primary,
                    fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
                  },
                ]}>
                {status.label}
              </Text>

              <View style={[styles.pipelineIndicator, { backgroundColor: isDark ? themeColors.surface : colors.grey[10] }]}>
                <View
                  style={[
                    styles.pipelineIndicatorFill,
                    {
                      backgroundColor: indicatorColor,
                      width: `${progress}%`,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.pipelineValue, { color: themeColors.text.primary }]}>
                {status.value}{status.unit}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface ProductScheduleCardProps {
  scheduleDate: string;
  scheduleTime: string;
  productType: string;
  productMix: string;
  plantName: string;
  plantCode: string;
  plantPhone: string;
  statusText: string;
  statusColor: string;
  isDark: boolean;
  onCallPress: () => void;
}

const ProductScheduleCard: React.FC<ProductScheduleCardProps> = ({
  scheduleDate,
  scheduleTime,
  productType,
  productMix,
  statusText,
  statusColor,
  isDark,
  onCallPress,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  const formatDateOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  return (
    <View style={[styles.productScheduleCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.psCardHeader}>
        <View style={styles.psCardTitleRow}>
          <View style={[styles.psCardIconContainer, { backgroundColor: colors.primary.main }]}>
            <Icon name="clipboard-text-outline" size={16} color={colors.common.white} />
          </View>
          <Text style={[styles.psCardTitle, { color: themeColors.text.primary }]}>
            Product & Schedule
          </Text>
        </View>
        <View style={[styles.psStatusBadge, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.psStatusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.psStatusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.psInfoGrid}>
        <View style={[styles.psInfoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
          <View style={styles.psInfoItemHeader}>
            <Icon name="calendar-clock" size={14} color={colors.primary.main} />
            <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>Schedule</Text>
          </View>
          <Text style={[styles.psInfoItemValue, { color: themeColors.text.primary }]}>
            {scheduleTime}
          </Text>
          <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.secondary }]}>
            {formatDateOnly(scheduleDate)}
          </Text>
        </View>

        <View style={[styles.psInfoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
          <View style={styles.psInfoItemHeader}>
            <Icon name="cube-outline" size={14} color={colors.secondary.main} />
            <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>Product</Text>
          </View>
          <Text style={[styles.psInfoItemValue, { color: themeColors.text.primary }]} numberOfLines={1}>
            {productType}
          </Text>
          <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.secondary }]} numberOfLines={1}>
            {productMix}
          </Text>
        </View>
      </View>

    </View>
  );
};
interface ContactDetailsCardProps {
  plantName: string;
  plantCode: string;
  plantAddress1: string;
  plantAddress2: string;
  plantPhone: string;
  isDark: boolean;
  onCallPress: () => void;
}

const ContactDetailsCard: React.FC<ContactDetailsCardProps> = ({
  plantName,
  plantCode,
  plantAddress1,
  plantAddress2,
  plantPhone,
  isDark,
  onCallPress,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const fullAddress = [plantAddress1, plantAddress2].filter(Boolean).join(', ');

  return (
    <View style={[styles.contactDetailsCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.cdCardHeader}>
        <View style={styles.cdCardTitleRow}>
          <View style={[styles.cdCardIconContainer, { backgroundColor: colors.info.main }]}>
            <Icon name="office-building" size={16} color={colors.common.white} />
          </View>
          <Text style={[styles.cdCardTitle, { color: themeColors.text.primary }]}>
            Contact Details
          </Text>
        </View>
      </View>

      <View style={styles.cdInfoContainer}>
        <View style={styles.cdInfoRow}>
          <View style={[styles.cdInfoIcon, { backgroundColor: colors.primary.main + '12' }]}>
            <Icon name="domain" size={16} color={colors.primary.main} />
          </View>
          <View style={styles.cdInfoContent}>
            <Text style={[styles.cdInfoLabel, { color: themeColors.text.hint }]}>Plant Name</Text>
            <Text style={[styles.cdInfoValue, { color: themeColors.text.primary }]} numberOfLines={1}>
              {plantName}
            </Text>
            {plantCode ? (
              <Text style={[styles.cdInfoSubValue, { color: themeColors.text.secondary }]}>
                Code: {plantCode}
              </Text>
            ) : null}
          </View>
        </View>

        {fullAddress ? (
          <View style={styles.cdInfoRow}>
            <View style={[styles.cdInfoIcon, { backgroundColor: colors.secondary.main + '12' }]}>
              <Icon name="map-marker-outline" size={16} color={colors.secondary.main} />
            </View>
            <View style={styles.cdInfoContent}>
              <Text style={[styles.cdInfoLabel, { color: themeColors.text.hint }]}>Address</Text>
              <Text style={[styles.cdInfoValue, { color: themeColors.text.primary }]} numberOfLines={2}>
                {fullAddress}
              </Text>
            </View>
          </View>
        ) : null}

        {plantPhone ? (
          <View style={styles.cdInfoRow}>
            <View style={[styles.cdInfoIcon, { backgroundColor: colors.success.main + '12' }]}>
              <Icon name="phone-outline" size={16} color={colors.success.main} />
            </View>
            <View style={styles.cdInfoContent}>
              <Text style={[styles.cdInfoLabel, { color: themeColors.text.hint }]}>Phone</Text>
              <Text style={[styles.cdInfoValue, { color: themeColors.text.primary }]}>
                {plantPhone}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.cdCallButton, { backgroundColor: colors.success.main + '12' }]}
              onPress={onCallPress}
              activeOpacity={0.7}>
              <Icon name="phone" size={18} color={colors.success.main} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

interface ProductCardItem {
  productId: string;
  itemCode: string;
  isMix: boolean;
  orderedQty: number;
  slump?: string;
  qr?: string;
}

interface OrderCodeDetailsCardProps {
  products: ProductCardItem[];
  isDark: boolean;
  onProductPress: (product: ProductCardItem) => void;
}

const BarcodeImage: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  const generateBarcode = () => {
    const bars = [];
    const pattern = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1];
    for (let i = 0; i < pattern.length; i++) {
      bars.push(
        <View
          key={i}
          style={{
            backgroundColor: pattern[i] === 1 ? themeColors.text.primary : 'transparent',
            width: 2.5,
            height: '100%',
          }}
        />
      );
    }
    return bars;
  };

  return (
    <View style={styles.ocBarcodeWrapper}>
      {generateBarcode()}
    </View>
  );
};

const OrderCodeDetailsCard: React.FC<OrderCodeDetailsCardProps> = ({
  products,
  isDark,
  onProductPress,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <View style={styles.orderCodeSection}>
      <Text style={[styles.ocSectionTitle, { color: themeColors.text.primary }]}>
        Order Code Details
      </Text>

      {products.map((product, index) => (
        <View
          key={product.productId || index}
          style={[
            styles.ocProductCard,
            {
              backgroundColor: themeColors.card,
              borderColor: isDark ? themeColors.border : colors.grey[15],
            },
          ]}>
          <View style={styles.ocMainRow}>
            <View style={styles.ocLeftSection}>
              <BarcodeImage isDark={isDark} />
              <Text style={[styles.ocItemCode, { color: themeColors.text.primary }]} numberOfLines={1}>
                {product.itemCode}
              </Text>
            </View>

            <View style={styles.ocRightSection}>
              <View
                style={[
                  styles.ocProductBadge,
                  {
                    backgroundColor: product.isMix
                      ? colors.success.main + '15'
                      : colors.info.main + '15',
                    borderColor: product.isMix
                      ? colors.success.main
                      : colors.info.main,
                  },
                ]}>
                <Text
                  style={[
                    styles.ocProductBadgeText,
                    { color: product.isMix ? colors.success.main : colors.info.main },
                  ]}>
                  {product.isMix ? 'Concrete' : 'Associated Product'}
                </Text>
              </View>

              <Text style={[styles.ocProductQty, { color: themeColors.text.primary }]}>
                {product.orderedQty.toFixed(2)} CY
              </Text>

              {product.slump && (
                <Text style={[styles.ocProductSlump, { color: themeColors.text.secondary }]}>
                  SLUMP: {product.slump}
                </Text>
              )}

              {product.qr && (
                <Text style={[styles.ocProductSlump, { color: themeColors.text.secondary }]}>
                  QR: {product.qr}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.ocDetailsLink,
              {
                backgroundColor: isDark ? themeColors.cardElevated : colors.common.white,
                borderTopColor: isDark ? themeColors.border : colors.grey[10],
              },
            ]}
            onPress={() => onProductPress(product)}
            activeOpacity={0.7}>
            <Text style={[styles.ocDetailsLinkText, { color: themeColors.text.primary }]}>
              Click here to check details
            </Text>
            <Icon name="arrow-right" size={16} color={themeColors.text.secondary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

interface InfoRowProps {
  icon: string;
  iconColor: string;
  text: string;
  subtext?: string;
  isDark: boolean;
  onPress?: () => void;
  actionIcon?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  icon,
  iconColor,
  text,
  subtext,
  isDark,
  onPress,
  actionIcon,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  const content = (
    <View style={styles.infoRowContainer}>
      <View style={[styles.infoRowIcon, { backgroundColor: iconColor + '12' }]}>
        <Icon name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.infoRowContent}>
        <Text style={[styles.infoRowText, { color: themeColors.text.primary }]} numberOfLines={1}>
          {text}
        </Text>
        {subtext && (
          <Text style={[styles.infoRowSubtext, { color: themeColors.text.hint }]}>{subtext}</Text>
        )}
      </View>
      {actionIcon && (
        <View style={[styles.infoRowAction, { backgroundColor: iconColor + '12' }]}>
          <Icon name={actionIcon} size={18} color={iconColor} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

interface SmartChartProps {
  title: string;
  data: Array<{ time: string;[key: string]: number | string }>;
  series: Array<{ key: string; color: string; label: string }>;
  tooltipInfo?: Record<string, string>;
  isDark: boolean;
  height?: number;
  showPickPoint?: boolean;
  pickPointIndex?: number;
}

const SmartChart: React.FC<SmartChartProps> = ({
  title,
  data,
  series,
  tooltipInfo,
  isDark,
  height = ms(140),
  showPickPoint = false,
  pickPointIndex = 3,
}) => {
  const [filter, setFilter] = useState('All');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(showPickPoint);
  const themeColors = isDark ? colors.dark : colors.light;

  const chartWidth = SCREEN_WIDTH - GRID.md * 4;
  const padding = { top: 8, right: 16, bottom: 24, left: 40 };
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
  const maxValue = Math.max(...allValues, 1);

  const yAxisSteps = 4;
  const yAxisValues = Array.from({ length: yAxisSteps + 1 }, (_, i) =>
    Math.round((maxValue / yAxisSteps) * (yAxisSteps - i))
  );

  const filterOptions = ['All', ...series.map(s => s.label)];

  const getX = (index: number) => {
    return padding.left + (index / (data.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  const createSmoothPath = (seriesKey: string) => {
    const points = data.map((d, i) => ({
      x: getX(i),
      y: getY(Number(d[seriesKey]) || 0),
    }));

    if (points.length < 2) return '';

    const extendedPoints = [
      { x: points[0].x - (points[1].x - points[0].x), y: points[0].y - (points[1].y - points[0].y) },
      ...points,
      {
        x: points[points.length - 1].x + (points[points.length - 1].x - points[points.length - 2].x),
        y: points[points.length - 1].y + (points[points.length - 1].y - points[points.length - 2].y)
      },
    ];

    let path = `M ${points[0].x} ${points[0].y}`;
    const tension = 0.5;

    for (let i = 1; i < extendedPoints.length - 2; i++) {
      const p0 = extendedPoints[i - 1];
      const p1 = extendedPoints[i];
      const p2 = extendedPoints[i + 1];
      const p3 = extendedPoints[i + 2];

      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  const createAreaPath = (seriesKey: string) => {
    const linePath = createSmoothPath(seriesKey);
    const lastPoint = data.length - 1;
    return `${linePath} L ${getX(lastPoint)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;
  };

  const handleFilterSelect = (option: string) => {
    setFilter(option);
    setShowDropdown(false);
  };

  const visibleSeries = filter === 'All'
    ? series
    : series.filter(s => s.label === filter);

  const getPickPointPosition = () => {
    if (!showPickPoint || visibleSeries.length === 0) return null;
    const pointData = data[pickPointIndex];
    if (!pointData) return null;

    const primarySeries = visibleSeries[0];
    const x = getX(pickPointIndex);
    const y = getY(Number(pointData[primarySeries.key]) || 0);

    return { x, y, data: pointData };
  };

  const pickPoint = getPickPointPosition();

  const handleChartPress = () => {
    if (showPickPoint) {
      setShowTooltip(!showTooltip);
    }
  };

  const formatTooltipDate = () => {
    const today = new Date();
    return `${today.getDate()} ${today.toLocaleString('en-US', { month: 'short' })} ${today.getFullYear()}`;
  };

  return (
    <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: themeColors.text.primary }]}>{title}</Text>
        <View style={styles.chartFilterWrapper}>
          <TouchableOpacity
            style={[styles.chartFilterBtn, { backgroundColor: isDark ? themeColors.surface : colors.grey[5] }]}
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.7}>
            <Text style={[styles.chartFilterText, { color: themeColors.text.primary }]}>{filter}</Text>
            <Icon name={showDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={themeColors.text.hint} />
          </TouchableOpacity>

          {showDropdown && (
            <View style={[
              styles.chartDropdown,
              {
                backgroundColor: isDark ? themeColors.cardElevated : colors.common.white,
                borderColor: isDark ? themeColors.border : colors.grey[10],
              }
            ]}>
              {filterOptions.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.chartDropdownItem,
                    filter === option && { backgroundColor: colors.primary.main + '10' },
                    idx < filterOptions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? themeColors.border : colors.grey[10],
                    }
                  ]}
                  onPress={() => handleFilterSelect(option)}
                  activeOpacity={0.7}>
                  <Text style={[
                    styles.chartDropdownText,
                    {
                      color: filter === option ? colors.primary.main : themeColors.text.primary,
                      fontFamily: filter === option ? fontFamily.semiBold : fontFamily.medium,
                    }
                  ]}>
                    {option}
                  </Text>
                  {filter === option && (
                    <Icon name="check" size={16} color={colors.primary.main} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <Pressable onPress={handleChartPress} style={styles.chartSvgContainer}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            {series.map((s, idx) => (
              <SvgGradient key={`grad-${idx}`} id={`areaGrad-${s.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </SvgGradient>
            ))}
          </Defs>

          {yAxisValues.map((value, i) => {
            const y = padding.top + (i / yAxisSteps) * chartHeight;
            return (
              <G key={`grid-${i}`}>
                <Path
                  d={`M ${padding.left} ${y} L ${chartWidth - padding.right} ${y}`}
                  stroke={isDark ? colors.grey[60] + '20' : colors.grey[15]}
                  strokeWidth={1}
                  strokeDasharray={showPickPoint ? '4,4' : '0'}
                />
                <SvgText
                  x={padding.left - 6}
                  y={y + 4}
                  fontSize={ms(9)}
                  fill={isDark ? colors.grey[40] : colors.grey[50]}
                  textAnchor="end"
                  fontFamily={fontFamily.medium}>
                  {value}
                </SvgText>
              </G>
            );
          })}

          {visibleSeries.map((s, idx) => (
            <G key={`series-${idx}`}>
              <Path d={createAreaPath(s.key)} fill={`url(#areaGrad-${s.key})`} />
              <Path
                d={createSmoothPath(s.key)}
                stroke={s.color}
                strokeWidth={2.5}
                fill="transparent"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          ))}

          {showPickPoint && pickPoint && (
            <G>
              <Circle
                cx={pickPoint.x}
                cy={pickPoint.y}
                r={8}
                fill={colors.common.white}
                stroke={colors.primary.main}
                strokeWidth={3}
              />
              <Circle
                cx={pickPoint.x}
                cy={pickPoint.y}
                r={3}
                fill={colors.primary.main}
              />
            </G>
          )}
        </Svg>

        {showPickPoint && pickPoint && showTooltip && (
          <View
            style={[
              styles.pickPointTooltip,
              {
                backgroundColor: isDark ? themeColors.cardElevated : colors.common.white,
                left: Math.min(Math.max(pickPoint.x - 50, GRID.sm), chartWidth - 110),
                top: pickPoint.y - 52,
                ...SHADOWS.sm,
              }
            ]}>
            <View style={styles.tooltipDateRow}>
              <Icon name="calendar" size={8} color={colors.primary.main} />
              <Text style={[styles.tooltipDateText, { color: themeColors.text.primary }]}>
                {formatTooltipDate()} • {pickPoint.data.time}
              </Text>
            </View>

            <View style={styles.tooltipDataRow}>
              <Text style={[styles.tooltipDataLabel, { color: themeColors.text.hint }]}>
                Ordered
              </Text>
              <Text style={[styles.tooltipDataValue, { color: themeColors.text.primary }]}>
                {tooltipInfo?.ordered || '18.5 CY/HR'}
              </Text>
            </View>

            <View style={styles.tooltipDataRow}>
              <Text style={[styles.tooltipDataLabel, { color: themeColors.text.hint }]}>
                Spacing
              </Text>
              <Text style={[styles.tooltipDataValue, { color: themeColors.text.primary }]}>
                {tooltipInfo?.spacing || '45 min'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.chartXLabels}>
          {(() => {
            // Show max 5 labels evenly distributed
            const maxLabels = 5;
            const totalPoints = data.length;

            if (totalPoints <= maxLabels) {
              // Show all labels if 5 or fewer
              return data.map((d, i) => (
                <Text
                  key={i}
                  style={[
                    styles.chartXLabel,
                    {
                      color: themeColors.text.hint,
                      fontFamily: fontFamily.medium,
                    }
                  ]}
                >
                  {d.time}
                </Text>
              ));
            }

            // Calculate which indices to show (evenly spaced)
            const labelsToShow: { index: number; time: string }[] = [];
            const step = (totalPoints - 1) / (maxLabels - 1);
            for (let i = 0; i < maxLabels; i++) {
              const idx = Math.round(step * i);
              labelsToShow.push({ index: idx, time: data[idx]?.time || '' });
            }

            return labelsToShow.map((item, i) => (
              <Text
                key={i}
                style={[
                  styles.chartXLabel,
                  {
                    color: themeColors.text.hint,
                    fontFamily: fontFamily.medium,
                  }
                ]}
              >
                {item.time}
              </Text>
            ));
          })()}
        </View>
      </Pressable>
    </View>
  );
};

// Time-based chart for Pour Speed with separate series data
interface TimeSeriesData {
  time: string;
  time_display: string;
  rate: number;
  cumulative_qty?: number;
}

interface TimeBasedChartProps {
  orderedData: TimeSeriesData[];
  deliveredData: TimeSeriesData[];
  pouredData: TimeSeriesData[];
  scheduleRate: number;
  yMax: number;
  scheduledQty: number;
  isDark: boolean;
  height?: number;
}

const TimeBasedChart: React.FC<TimeBasedChartProps> = ({
  orderedData,
  deliveredData,
  pouredData,
  scheduleRate,
  yMax,
  scheduledQty,
  isDark,
  height = ms(180),
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; time: string; label: string; value: number; color: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const themeColors = isDark ? colors.dark : colors.light;

  const containerWidth = SCREEN_WIDTH - GRID.md * 4;
  const yAxisWidth = 40;
  const padding = { top: 16, right: 20, bottom: 32, left: 10 };
  const chartHeight = height - padding.top - padding.bottom;

  // Parse time from ISO string to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.getHours() * 60 + date.getMinutes();
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get min/max time across all series (in minutes from midnight)
  const allTimes = [
    ...orderedData.map(d => parseTimeToMinutes(d.time)),
    ...deliveredData.map(d => parseTimeToMinutes(d.time)),
    ...pouredData.map(d => parseTimeToMinutes(d.time)),
  ];
  const dataMinTime = Math.min(...allTimes);
  const dataMaxTime = Math.max(...allTimes);
  // Add 15 min padding on each side
  const minTime = Math.floor(dataMinTime / 15) * 15 - 15;
  const maxTime = Math.ceil(dataMaxTime / 15) * 15 + 15;
  const timeRange = maxTime - minTime || 1;

  // Calculate chart width: 50px per 15 minutes, minimum is container width
  const timeLabelsCount = Math.ceil(timeRange / 15);
  const minChartWidth = containerWidth - yAxisWidth;
  const calculatedWidth = timeLabelsCount * 50;
  const chartWidth = Math.max(calculatedWidth, minChartWidth);
  const needsScroll = chartWidth > minChartWidth;

  // Y-axis: 0, 25, 50 style
  const maxValue = Math.max(yMax, 50);
  const yAxisSteps = 2;
  const yAxisValues = [50, 25, 0];

  // Series config with colors
  const seriesConfig = [
    { key: 'ordered', color: colors.chart.ordered, label: 'Ordered', data: orderedData, marker: 'circle' },
    { key: 'poured', color: colors.chart.poured, label: 'Poured', data: pouredData, marker: 'diamond' },
    { key: 'delivered', color: isDark ? colors.chart.delivered.dark : colors.chart.delivered.light, label: 'Delivered', data: deliveredData, marker: 'square' },
  ];

  const getX = (time: number) => {
    const normalized = (time - minTime) / timeRange;
    return padding.left + normalized * (chartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  // Create straight line path (not curved)
  const createLinePath = (seriesData: TimeSeriesData[]) => {
    if (seriesData.length < 1) return '';

    const points = seriesData.map(d => ({
      x: getX(parseTimeToMinutes(d.time)),
      y: getY(d.rate),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const toggleFilter = (key: string) => {
    setActiveFilter(activeFilter === key ? null : key);
  };

  const visibleSeries = activeFilter
    ? seriesConfig.filter(s => s.key === activeFilter)
    : seriesConfig;

  // Generate X-axis time labels
  const generateXAxisLabels = () => {
    const labels: { time: number; display: string }[] = [];
    // Start from minTime, end at maxTime (already rounded to 15 min intervals with padding)
    for (let m = minTime; m <= maxTime; m += 15) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      if (hours >= 0 && hours < 24) {
        labels.push({
          time: m,
          display: `${hours}:${mins.toString().padStart(2, '0')}`,
        });
      }
    }

    // Show max 10 labels for better readability
    const maxLabels = 10;
    if (labels.length <= maxLabels) return labels;

    const step = Math.ceil(labels.length / maxLabels);
    return labels.filter((_, i) => i % step === 0);
  };

  const xAxisLabels = generateXAxisLabels();

  // Calculate spacing (difference between first two ordered times in minutes)
  const spacing = orderedData.length >= 2
    ? Math.round(parseTimeToMinutes(orderedData[1].time) - parseTimeToMinutes(orderedData[0].time)) || 20
    : 20;

  const hideTooltip = () => setTooltip(null);

  // Render marker based on type
  const renderMarker = (type: string, x: number, y: number, color: string, size: number = 6) => {
    switch (type) {
      case 'circle':
        return (
          <G>
            <Circle cx={x} cy={y} r={size} fill={themeColors.card} stroke={color} strokeWidth={2} />
          </G>
        );
      case 'diamond':
        const d = size;
        return (
          <Path
            d={`M ${x} ${y - d} L ${x + d} ${y} L ${x} ${y + d} L ${x - d} ${y} Z`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
        );
      case 'square':
        const s = size - 1;
        return (
          <Path
            d={`M ${x - s} ${y - s} L ${x + s} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
        );
      default:
        return <Circle cx={x} cy={y} r={size} fill={color} />;
    }
  };

  return (
    <Pressable onPress={hideTooltip}>
      <View style={[styles.pourSpeedCard, { backgroundColor: themeColors.card }]}>
        {/* Header */}
        <View style={styles.pourSpeedHeader}>
          <Text style={[styles.pourSpeedTitle, { color: themeColors.text.primary }]}>Pour Speed</Text>
          <Text style={[styles.pourSpeedSubtitle, { color: themeColors.text.hint }]}>
            {spacing} min spacing  •  {scheduleRate.toFixed(2)} yards/hour  •  {scheduledQty.toFixed(2)} CY scheduled
          </Text>
        </View>

        {/* Chart */}
        <View style={styles.pourSpeedChartContainer}>
          {/* Fixed Y-axis */}
          <View style={[styles.pourSpeedYAxis, { width: yAxisWidth }]}>
            <Text style={[styles.pourSpeedYAxisText, { color: themeColors.text.hint }]}>CY/HR</Text>
            <Svg width={yAxisWidth} height={height}>
              {yAxisValues.map((value, i) => {
                const y = getY(value);
                return (
                  <SvgText
                    key={`y-label-${i}`}
                    x={yAxisWidth - 5}
                    y={y + 4}
                    fontSize={ms(10)}
                    fill={themeColors.text.hint}
                    textAnchor="end"
                    fontFamily={fontFamily.medium}>
                    {value}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          {/* Scrollable Chart Area */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={needsScroll}
            scrollEnabled={needsScroll}
            style={styles.pourSpeedScrollView}
            contentContainerStyle={{ width: chartWidth }}
            onScrollBeginDrag={hideTooltip}
          >
            <View style={{ position: 'relative' }}>
              <Svg width={chartWidth} height={height}>
                {/* Grid lines */}
                {yAxisValues.map((value, i) => {
                  const y = getY(value);
                  return (
                    <Path
                      key={`grid-${i}`}
                      d={`M ${padding.left} ${y} L ${chartWidth - padding.right} ${y}`}
                      stroke={isDark ? colors.grey[60] + '30' : colors.grey[15]}
                      strokeWidth={1}
                    />
                  );
                })}

                {/* X-axis labels */}
                {xAxisLabels.map((label, i) => {
                  const x = getX(label.time);
                  if (x < padding.left - 10 || x > chartWidth - padding.right + 10) return null;
                  return (
                    <SvgText
                      key={`x-label-${i}`}
                      x={x}
                      y={height - 8}
                      fontSize={ms(9)}
                      fill={themeColors.text.hint}
                      textAnchor="middle"
                      fontFamily={fontFamily.medium}>
                      {label.display}
                    </SvgText>
                  );
                })}

                {/* Lines */}
                {visibleSeries.map((s) => (
                  <Path
                    key={`line-${s.key}`}
                    d={createLinePath(s.data)}
                    stroke={s.color}
                    strokeWidth={2}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Data point markers with touch areas */}
                {visibleSeries.map((s) =>
                  s.data.map((d, i) => {
                    const x = getX(parseTimeToMinutes(d.time));
                    const y = getY(d.rate);
                    return (
                      <G
                        key={`marker-${s.key}-${i}`}
                        onPress={() => {
                          setTooltip({
                            x,
                            y,
                            time: d.time_display,
                            label: s.label,
                            value: d.rate,
                            color: s.color,
                          });
                        }}
                      >
                        {/* Invisible touch area */}
                        <Circle cx={x} cy={y} r={15} fill="transparent" />
                        {/* Visible marker */}
                        {renderMarker(s.marker, x, y, s.color, 5)}
                      </G>
                    );
                  })
                )}
              </Svg>

              {/* Tooltip */}
              {tooltip && (
                <View
                  style={[
                    styles.pourSpeedTooltip,
                    {
                      backgroundColor: colors.chart.background.dark,
                      left: Math.min(Math.max(tooltip.x - 55, 8), chartWidth - 120),
                      top: Math.max(tooltip.y - 55, 5),
                      ...SHADOWS.lg,
                    }
                  ]}>
                  <Text style={[styles.pourSpeedTooltipTime, { color: colors.chart.tooltip.text }]}>
                    {tooltip.time}
                  </Text>
                  <View style={styles.pourSpeedTooltipRow}>
                    <View style={[styles.pourSpeedTooltipDot, { backgroundColor: tooltip.color }]} />
                    <Text style={[styles.pourSpeedTooltipLabel, { color: colors.chart.tooltip.text }]}>
                      {tooltip.label}
                    </Text>
                    <Text style={[styles.pourSpeedTooltipValue, { color: colors.chart.tooltip.text }]}>
                      {tooltip.value.toFixed(2)} CY/HR
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Legend - Pill style buttons */}
        <View style={styles.pourSpeedLegend}>
          {seriesConfig.map((s) => {
            const isActive = activeFilter === null || activeFilter === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.pourSpeedLegendPill,
                  {
                    backgroundColor: isActive
                      ? (isDark ? themeColors.surface : colors.grey[5])
                      : 'transparent',
                    borderColor: isDark ? themeColors.border : colors.grey[15],
                    opacity: isActive ? 1 : 0.5,
                  }
                ]}
                onPress={() => toggleFilter(s.key)}
                activeOpacity={0.7}>
                <View style={[
                  styles.pourSpeedLegendMarker,
                  s.marker === 'circle' && {
                    borderRadius: 6,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: s.color,
                  },
                  s.marker === 'diamond' && {
                    transform: [{ rotate: '45deg' }],
                    backgroundColor: s.color,
                    borderRadius: 1,
                  },
                  s.marker === 'square' && {
                    backgroundColor: s.color,
                    borderRadius: 1,
                  },
                ]} />
                <Text style={[
                  styles.pourSpeedLegendText,
                  { color: isActive ? themeColors.text.primary : themeColors.text.hint }
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

// Trucks on Job Chart Component
interface TrucksTimePoint {
  time: string;
  time_display: string;
  waiting: number;
  pouring: number;
  washout: number;
  total: number;
}

interface TrucksAverages {
  avg_waiting_minutes: number;
  avg_pouring_minutes: number;
  avg_washout_minutes: number;
}

interface TrucksOnJobChartProps {
  timePoints: TrucksTimePoint[];
  averages: TrucksAverages;
  isDark: boolean;
  height?: number;
}

const TrucksOnJobChart: React.FC<TrucksOnJobChartProps> = ({
  timePoints,
  averages,
  isDark,
  height = ms(180),
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; time: string; label: string; value: number; color: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const themeColors = isDark ? colors.dark : colors.light;

  const containerWidth = SCREEN_WIDTH - GRID.md * 4;
  const yAxisWidth = 35;
  const padding = { top: 16, right: 20, bottom: 32, left: 10 };
  const chartHeight = height - padding.top - padding.bottom;

  // Parse time from ISO string to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.getHours() * 60 + date.getMinutes();
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get min/max time
  const allTimes = timePoints.map(d => parseTimeToMinutes(d.time));
  const dataMinTime = Math.min(...allTimes);
  const dataMaxTime = Math.max(...allTimes);
  const minTime = Math.floor(dataMinTime / 15) * 15 - 15;
  const maxTime = Math.ceil(dataMaxTime / 15) * 15 + 15;
  const timeRange = maxTime - minTime || 1;

  // Calculate chart width
  const timeLabelsCount = Math.ceil(timeRange / 15);
  const minChartWidth = containerWidth - yAxisWidth;
  const calculatedWidth = timeLabelsCount * 50;
  const chartWidth = Math.max(calculatedWidth, minChartWidth);
  const needsScroll = chartWidth > minChartWidth;

  // Y-axis max based on total trucks
  const maxTotal = Math.max(...timePoints.map(d => d.total), 1);
  const maxValue = Math.ceil(maxTotal / 2) * 2 + 2; // Round up to even number + buffer
  const yAxisValues = Array.from({ length: maxValue + 1 }, (_, i) => maxValue - i);

  // Series config
  const seriesConfig = [
    { key: 'waiting', color: colors.chart.waiting, label: 'Waiting', marker: 'circle' },
    { key: 'pouring', color: colors.chart.pouring, label: 'Pouring', marker: 'diamond' },
    { key: 'washout', color: colors.chart.washout, label: 'Washout', marker: 'square' },
  ];

  const getX = (time: number) => {
    const normalized = (time - minTime) / timeRange;
    return padding.left + normalized * (chartWidth - padding.left - padding.right);
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maxValue) * chartHeight;
  };

  // Create line path for a series
  const createLinePath = (key: string) => {
    if (timePoints.length < 1) return '';

    const points = timePoints.map(d => ({
      x: getX(parseTimeToMinutes(d.time)),
      y: getY(d[key as keyof TrucksTimePoint] as number),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  const toggleFilter = (key: string) => {
    setActiveFilter(activeFilter === key ? null : key);
  };

  const visibleSeries = activeFilter
    ? seriesConfig.filter(s => s.key === activeFilter)
    : seriesConfig;

  const hideTooltip = () => setTooltip(null);

  // Generate X-axis labels
  const generateXAxisLabels = () => {
    const labels: { time: number; display: string }[] = [];
    for (let m = minTime; m <= maxTime; m += 15) {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      if (hours >= 0 && hours < 24) {
        labels.push({
          time: m,
          display: `${hours}:${mins.toString().padStart(2, '0')}`,
        });
      }
    }
    const maxLabels = 10;
    if (labels.length <= maxLabels) return labels;
    const step = Math.ceil(labels.length / maxLabels);
    return labels.filter((_, i) => i % step === 0);
  };

  const xAxisLabels = generateXAxisLabels();

  // Render marker
  const renderMarker = (type: string, x: number, y: number, color: string, size: number = 5) => {
    switch (type) {
      case 'circle':
        return <Circle cx={x} cy={y} r={size} fill={themeColors.card} stroke={color} strokeWidth={2} />;
      case 'diamond':
        const d = size;
        return <Path d={`M ${x} ${y - d} L ${x + d} ${y} L ${x} ${y + d} L ${x - d} ${y} Z`} fill={color} />;
      case 'square':
        const s = size - 1;
        return <Path d={`M ${x - s} ${y - s} L ${x + s} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`} fill={color} />;
      default:
        return <Circle cx={x} cy={y} r={size} fill={color} />;
    }
  };

  return (
    <Pressable onPress={hideTooltip}>
      <View style={[styles.pourSpeedCard, { backgroundColor: themeColors.card }]}>
        {/* Header */}
        <View style={styles.pourSpeedHeader}>
          <Text style={[styles.pourSpeedTitle, { color: themeColors.text.primary }]}>Trucks on the Job</Text>
          <Text style={[styles.pourSpeedSubtitle, { color: themeColors.text.hint }]}>
            Avg Wait: {averages.avg_waiting_minutes.toFixed(1)} min  •  Avg Pour: {averages.avg_pouring_minutes.toFixed(1)} min  •  Avg Washout: {averages.avg_washout_minutes.toFixed(1)} min
          </Text>
        </View>

        {/* Chart */}
        <View style={styles.pourSpeedChartContainer}>
          {/* Fixed Y-axis */}
          <View style={[styles.pourSpeedYAxis, { width: yAxisWidth }]}>
            <Text style={[styles.pourSpeedYAxisText, { color: themeColors.text.hint }]}>Trucks</Text>
            <Svg width={yAxisWidth} height={height}>
              {yAxisValues.filter((_, i) => i % 2 === 0 || maxValue <= 4).map((value, i) => {
                const y = getY(value);
                return (
                  <SvgText
                    key={`y-label-${i}`}
                    x={yAxisWidth - 5}
                    y={y + 4}
                    fontSize={ms(10)}
                    fill={themeColors.text.hint}
                    textAnchor="end"
                    fontFamily={fontFamily.medium}>
                    {value}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          {/* Scrollable Chart Area */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={needsScroll}
            scrollEnabled={needsScroll}
            style={styles.pourSpeedScrollView}
            contentContainerStyle={{ width: chartWidth }}
            onScrollBeginDrag={hideTooltip}
          >
            <View style={{ position: 'relative' }}>
              <Svg width={chartWidth} height={height}>
                {/* Grid lines */}
                {yAxisValues.filter((_, i) => i % 2 === 0 || maxValue <= 4).map((value, i) => {
                  const y = getY(value);
                  return (
                    <Path
                      key={`grid-${i}`}
                      d={`M ${padding.left} ${y} L ${chartWidth - padding.right} ${y}`}
                      stroke={isDark ? colors.grey[60] + '30' : colors.grey[15]}
                      strokeWidth={1}
                    />
                  );
                })}

                {/* X-axis labels */}
                {xAxisLabels.map((label, i) => {
                  const x = getX(label.time);
                  if (x < padding.left - 10 || x > chartWidth - padding.right + 10) return null;
                  return (
                    <SvgText
                      key={`x-label-${i}`}
                      x={x}
                      y={height - 8}
                      fontSize={ms(9)}
                      fill={themeColors.text.hint}
                      textAnchor="middle"
                      fontFamily={fontFamily.medium}>
                      {label.display}
                    </SvgText>
                  );
                })}

                {/* Lines */}
                {visibleSeries.map((s) => (
                  <Path
                    key={`line-${s.key}`}
                    d={createLinePath(s.key)}
                    stroke={s.color}
                    strokeWidth={2}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Data point markers */}
                {visibleSeries.map((s) =>
                  timePoints.map((d, i) => {
                    const x = getX(parseTimeToMinutes(d.time));
                    const value = d[s.key as keyof TrucksTimePoint] as number;
                    const y = getY(value);
                    return (
                      <G
                        key={`marker-${s.key}-${i}`}
                        onPress={() => {
                          setTooltip({
                            x,
                            y,
                            time: d.time_display,
                            label: s.label,
                            value,
                            color: s.color,
                          });
                        }}
                      >
                        <Circle cx={x} cy={y} r={15} fill="transparent" />
                        {renderMarker(s.marker, x, y, s.color, 5)}
                      </G>
                    );
                  })
                )}
              </Svg>

              {/* Tooltip */}
              {tooltip && (
                <View
                  style={[
                    styles.pourSpeedTooltip,
                    {
                      backgroundColor: colors.chart.background.dark,
                      left: Math.min(Math.max(tooltip.x - 55, 8), chartWidth - 120),
                      top: Math.max(tooltip.y - 55, 5),
                      ...SHADOWS.lg,
                    }
                  ]}>
                  <Text style={[styles.pourSpeedTooltipTime, { color: colors.chart.tooltip.text }]}>
                    {tooltip.time}
                  </Text>
                  <View style={styles.pourSpeedTooltipRow}>
                    <View style={[styles.pourSpeedTooltipDot, { backgroundColor: tooltip.color }]} />
                    <Text style={[styles.pourSpeedTooltipLabel, { color: colors.chart.tooltip.text }]}>
                      {tooltip.label}
                    </Text>
                    <Text style={[styles.pourSpeedTooltipValue, { color: colors.chart.tooltip.text }]}>
                      {tooltip.value} trucks
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Legend */}
        <View style={styles.pourSpeedLegend}>
          {seriesConfig.map((s) => {
            const isActive = activeFilter === null || activeFilter === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.pourSpeedLegendPill,
                  {
                    backgroundColor: isActive
                      ? (isDark ? themeColors.surface : colors.grey[5])
                      : 'transparent',
                    borderColor: isDark ? themeColors.border : colors.grey[15],
                    opacity: isActive ? 1 : 0.5,
                  }
                ]}
                onPress={() => toggleFilter(s.key)}
                activeOpacity={0.7}>
                <View style={[
                  styles.pourSpeedLegendMarker,
                  s.marker === 'circle' && {
                    borderRadius: 6,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: s.color,
                  },
                  s.marker === 'diamond' && {
                    transform: [{ rotate: '45deg' }],
                    backgroundColor: s.color,
                    borderRadius: 1,
                  },
                  s.marker === 'square' && {
                    backgroundColor: s.color,
                    borderRadius: 1,
                  },
                ]} />
                <Text style={[
                  styles.pourSpeedLegendText,
                  { color: isActive ? themeColors.text.primary : themeColors.text.hint }
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

interface BottomTabProps {
  tabs: Array<{ icon: string; label: string }>;
  activeTab: string;
  onTabPress: (tab: string) => void;
  isDark: boolean;
}

const BottomTabBar: React.FC<BottomTabProps> = ({ tabs, activeTab, onTabPress, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[
      styles.bottomTabBar,
      {
        backgroundColor: themeColors.card,
        borderTopColor: isDark ? themeColors.border : colors.grey[10],
      }
    ]}>
      <SafeAreaView edges={['bottom']} style={styles.bottomTabBarInner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.bottomTabItem}
              onPress={() => onTabPress(tab.label)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.bottomTabIconBg,
                isActive && { backgroundColor: colors.primary.main + '15' }
              ]}>
                <Icon
                  name={isActive ? tab.icon.replace('-outline', '') : tab.icon}
                  size={22}
                  color={isActive ? colors.primary.main : themeColors.text.hint}
                />
              </View>
              <Text style={[
                styles.bottomTabLabel,
                {
                  color: isActive ? colors.primary.main : themeColors.text.hint,
                  fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
                }
              ]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.bottomTabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </View>
  );
};

export const OrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OrderDetailsRouteProp>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, hideAlert, showError, showInfo } = useAlert();

  const { orderId, orderCode, orderDate, status: passedStatus } = route.params;

  const {
    orderDetails,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useOrderDetails({ order_code: orderCode, order_date: orderDate });

  const order = useMemo((): Order => {
    if (!orderDetails) {
      return getMockOrder(orderId);
    }

    const progress = (orderDetails.ordered_qty ?? 0) > 0
      ? Math.round(((orderDetails.delivered_qty ?? 0) / (orderDetails.ordered_qty ?? 1)) * 100)
      : 0;

    return {
      id: orderDetails.order_id,
      orderCode: orderDetails.order_code,
      customerName: orderDetails.customer_name,
      deliveryAddress: orderDetails.delivery_address,
      scheduledDate: orderDetails.order_date,
      scheduledTime: orderDetails.start_time,
      status: orderDetails.status as Order['status'],
      productType: orderDetails.products?.[0]?.item_code || 'N/A',
      productMix: orderDetails.products?.length > 0
        ? `${orderDetails.products[0].item_code} | ${(orderDetails.products[0].ordered_qty ?? 0).toFixed(2)} CY`
        : '',
      quantity: orderDetails.ordered_qty,
      unit: 'CY',
      deliveredQuantity: orderDetails.delivered_qty,
      remainingQuantity: orderDetails.remaining_qty,
      totalLoads: orderDetails.tickets?.length || 0,
      completedLoads: orderDetails.tickets?.length || 0,
      progress,
      estimatedFinishTime: orderDetails.estimated_finish_time,
      hasAlert: orderDetails.has_notes,
      createdAt: orderDetails.order_date,
      updatedAt: orderDetails.order_date,
      latitude: orderDetails.weather_data?.latitude,
      longitude: orderDetails.weather_data?.longitude,
    };
  }, [orderDetails, orderId]);

  const jobData = useMemo(() => {
    if (!orderDetails) {
      return mockJobData;
    }

    const progress = (orderDetails.ordered_qty ?? 0) > 0
      ? Math.round(((orderDetails.delivered_qty ?? 0) / (orderDetails.ordered_qty ?? 1)) * 100)
      : 0;

    return {
      elapsedTime: `${progress}%`,
      deliveredVolume: orderDetails.delivered_qty ?? 0,
      pouredVolume: orderDetails.delivered_qty ?? 0,
      orderedVolume: orderDetails.ordered_qty ?? 0,
      remainingVolume: orderDetails.remaining_qty ?? 0,
      estimatedFinish: orderDetails.estimated_finish_time || 'N/A',
      temperature: orderDetails.weather_data?.temperature_fahrenheit || 0,
      siteName: orderDetails.customer_name,
      plantName: orderDetails.plant_details?.description || orderDetails.products?.[0]?.plant_code || 'N/A',
      plantCode: orderDetails.plant_details?.code || orderDetails.products?.[0]?.plant_code || '',
      plantPhone: orderDetails.plant_details?.phone || '',
      plantAddress1: orderDetails.plant_details?.address1 || '',
      plantAddress2: orderDetails.plant_details?.address2 || '',
      truckCount: new Set(orderDetails.tickets?.map(t => t.truck_code) || []).size,
      status: orderDetails.status || 'Pending',
      statusPills: (() => {
        const truckStatus = orderDetails.truck_status_count;
        const total = truckStatus?.total || 1;
        const loadingCount = truckStatus?.loading ?? 0;
        const toJobCount = truckStatus?.to_job ?? 0;
        const atJobCount = truckStatus?.at_job ?? 0;
        const pouringCount = truckStatus?.pouring ?? 0;

        const counts = [
          { status: 'loading', count: loadingCount },
          { status: 'to_job', count: toJobCount },
          { status: 'at_job', count: atJobCount },
          { status: 'pouring', count: pouringCount },
        ];
        const activeStatus = counts.find(c => c.count > 0)?.status || '';

        return [
          { label: 'Loading', value: loadingCount, unit: `/${total}`, active: activeStatus === 'loading', icon: 'truck-loading' },
          { label: 'To Job', value: toJobCount, unit: `/${total}`, active: activeStatus === 'to_job', icon: 'truck-fast' },
          { label: 'At Job', value: atJobCount, unit: `/${total}`, active: activeStatus === 'at_job', icon: 'map-marker' },
          { label: 'Pouring', value: pouringCount, unit: `/${total}`, active: activeStatus === 'pouring', icon: 'water' },
        ];
      })(),
      // Pour Speed raw data from API for TimeBasedChart
      pourSpeedRaw: {
        ordered: orderDetails.graphs?.pour_speed?.ordered || [],
        delivered: orderDetails.graphs?.pour_speed?.delivered || [],
        poured: orderDetails.graphs?.pour_speed?.poured || [],
        scheduleRate: orderDetails.graphs?.pour_speed?.schedule_rate || 30,
        yMax: orderDetails.graphs?.pour_speed?.y_max || 50,
        hasData: !!(orderDetails.graphs?.pour_speed?.delivered?.length),
      },
      // Legacy pourSpeedData for fallback (mock data)
      pourSpeedData: mockJobData.pourSpeedData,

      // Trucks on Job raw data from API
      trucksOnJobRaw: {
        timePoints: orderDetails.graphs?.trucks_on_job?.time_points || [],
        averages: orderDetails.graphs?.trucks_on_job?.averages || {
          avg_waiting_minutes: 0,
          avg_pouring_minutes: 0,
          avg_washout_minutes: 0,
        },
        hasData: !!(orderDetails.graphs?.trucks_on_job?.time_points?.length),
      },
      // Legacy trucksOnJobData for fallback (mock data)
      trucksOnJobData: mockJobData.trucksOnJobData,
      avgSpacing: '45 min',
      products: orderDetails.products?.map(p => ({
        productId: p.product_id || p.order_product_id,
        itemCode: p.item_code,
        isMix: p.is_mix ?? true,
        orderedQty: p.ordered_qty ?? 0,
        slump: '4.00 IN',
        qr: '4000',
      })) || [],
    };
  }, [orderDetails]);

  const [activeTab, setActiveTab] = useState('Jobs');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Get status color based on passed status or order status
  // Uses same color mapping as OrderListScreen for consistency
  // Use centralized utility for consistent color across all screens
  const statusColor = useMemo(() => {
    const status = passedStatus || order.status;
    const progress = order.progress || 0;
    const color = getStatusColor(status, progress);

    // Debug logging to trace status color calculation
    console.log('🎨 OrderDetails Status Debug:', {
      passedStatus,
      orderStatus: order.status,
      usedStatus: status,
      progress,
      resultColor: color,
    });

    return color;
  }, [passedStatus, order.status, order.progress]);

  const handleMenuToggle = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite(prev => !prev);
  }, []);

  const handleTicketPress = useCallback(() => {
    navigation.navigate('Ticket', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
    });
  }, [navigation, order]);

  const handleChatPress = useCallback(() => {
    navigation.navigate('ChatRoom', {
      roomId: order.id,
      roomName: `Order #${order.orderCode}`,
      chatId: parseInt(order.id, 10),
      orderId: parseInt(order.id, 10),
    });
  }, [navigation, order]);

  const handleMapPress = useCallback(() => {
    navigation.navigate('Tracking', {
      orderId: order.id,
    });
  }, [navigation, order]);

  const handleShare = useCallback(async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: `Order Details\n\nOrder: ${order.orderCode}\nCustomer: ${order.customerName}\nStatus: ${order.status}\nProduct: ${order.productType}\nQuantity: ${order.quantity} ${order.unit}\nDelivery: ${order.deliveryAddress}`,
        title: `Order ${order.orderCode}`,
      });
    } catch (error) {
      showError('Error', 'Failed to share order details');
    }
  }, [order, showError]);

  const handleViewOrderHistory = useCallback(() => {
    setMenuVisible(false);
    showInfo('Order History', 'Order history feature coming soon');
  }, [showInfo]);

  const handleDownloadInvoice = useCallback(() => {
    setMenuVisible(false);
    showInfo('Download Invoice', 'Invoice download feature coming soon');
  }, [showInfo]);

  const handleTrackOrder = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Tracking', { orderId: order.id });
  }, [navigation, order.id]);

  const handleWeatherPress = useCallback(() => {
    navigation.navigate('Weather', {
      orderCode: orderCode,
      orderDate: orderDate,
      orderStatus: order.status,
      startTime: order.scheduledTime,
    });
  }, [navigation, orderCode, orderDate, order.status, order.scheduledTime]);

  const handleProductPress = useCallback((product: ProductCardItem) => {
    showInfo('Product Details', `Product: ${product.itemCode}\nQuantity: ${product.orderedQty.toFixed(2)} CY`);
  }, [showInfo]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: 'Share Order', onPress: handleShare },
    { id: '2', icon: 'crosshairs-gps', label: 'Track Order', onPress: handleTrackOrder },
    { id: '3', icon: 'file-document-outline', label: 'Download Invoice', onPress: handleDownloadInvoice },
    { id: '4', icon: 'history', label: 'Order History', onPress: handleViewOrderHistory },
  ];

  const formatScheduleDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return `${timeStr} • ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  const pourSpeedChartData = useMemo(() => jobData.pourSpeedData, [jobData.pourSpeedData]);
  const trucksChartData = useMemo(() => jobData.trucksOnJobData, [jobData.trucksOnJobData]);

  const bottomTabs = [
    { icon: 'package-variant', label: 'Materials' },
    { icon: 'briefcase-outline', label: 'Jobs' },
    { icon: 'ticket-outline', label: 'Tickets' },
    { icon: 'crosshairs-gps', label: 'Track' },
    { icon: 'chat-outline', label: 'Chats' },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <TopGradientBackground
          height="100%"
          showWaves={true}
          waveOpacity={0.12}
          absolute={true}
        />
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerSafeArea}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
                <Icon name="arrow-left" size={22} color={isDark ? colors.common.white : colors.grey[80]} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader
            size={120}
            message="Loading order details..."
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <TopGradientBackground
          height="52%"
          showWaves={true}
          waveOpacity={0.12}
          absolute={true}
        />
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerSafeArea}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
                <Icon name="arrow-left" size={22} color={isDark ? colors.common.white : colors.grey[80]} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error.main} />
          <Text style={[styles.errorText, { color: themeColors.text.primary }]}>
            {error || 'Failed to load order details'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={20} color={colors.common.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TopGradientBackground
        height="52%"
        showWaves={true}
        waveOpacity={0.12}
        absolute={true}
      />

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
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerSafeArea}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
                <Icon name="arrow-left" size={22} color={isDark ? colors.common.white : colors.grey[80]} />
              </TouchableOpacity>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={handleToggleFavorite}>
                  <Icon
                    name={isFavorite ? 'star' : 'star-outline'}
                    size={18}
                    color={isFavorite ? colors.warning.main : (isDark ? colors.common.white : colors.grey[80])}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
                  <Icon name="refresh" size={18} color={isDark ? colors.common.white : colors.grey[80]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={handleMenuToggle}>
                  <Icon name="dots-vertical" size={18} color={isDark ? colors.common.white : colors.grey[80]} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.headerSiteName, { color: isDark ? colors.common.white : colors.grey[80] }]}>{jobData.siteName}</Text>

            <View style={styles.headerChipsRow}>
              <View style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '15' }]}>
                <Icon name="file-document-outline" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
                <Text style={[styles.headerChipText, { color: isDark ? colors.common.white : colors.grey[80] }]}>Order: {order.orderCode}</Text>
              </View>

              <TouchableOpacity
                style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '15' }]}
                onPress={handleWeatherPress}
                activeOpacity={0.7}>
                <Icon name="weather-partly-cloudy" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
                <Text style={[styles.headerChipText, { color: isDark ? colors.common.white : colors.grey[80] }]}>{jobData.temperature}°C</Text>
              </TouchableOpacity>

              <View style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '15' }]}>
                <Icon name="truck" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
                <Text style={[styles.headerChipText, { color: isDark ? colors.common.white : colors.grey[80] }]}>{jobData.truckCount} Trucks</Text>
              </View>
            </View>

            <View style={styles.headerAddressRow}>
              <Icon name="map-marker-outline" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
              <Text style={[styles.headerAddress, { color: isDark ? colors.common.white : colors.grey[80] }]} numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.contentContainer}>
          <AnimatedPress>
            <View style={[styles.metricsCard, { backgroundColor: themeColors.card }, SHADOWS.md]}>

              <View style={styles.headerStatusContainer}>
                <View style={[styles.headerStatusBadge, { backgroundColor: statusColor + '20' }]}>
                  <View style={[styles.headerStatusPulse, { backgroundColor: statusColor }]} />
                  <Text style={[styles.headerStatusText, { color: statusColor }]}>{getStatusLabel(order.status)}</Text>
                </View>
              </View>

              <View style={styles.metricsMainRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: themeColors.text.primary }]}>
                    {jobData.deliveredVolume.toFixed(2)}
                    <Text style={[styles.metricUnit, { color: themeColors.text.secondary }]}>cy</Text>
                  </Text>
                  <Text style={[styles.metricLabel, { color: themeColors.text.hint }]}>Delivered</Text>
                </View>

                <CircularProgress
                  time={jobData.elapsedTime}
                  label="Poured"
                  progress={order.progress ?? 0}
                  isDark={isDark}
                />

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: themeColors.text.primary }]}>
                    {jobData.orderedVolume.toFixed(2)}
                    <Text style={[styles.metricUnit, { color: themeColors.text.secondary }]}>cy</Text>
                  </Text>
                  <Text style={[styles.metricLabel, { color: themeColors.text.hint }]}>Ordered</Text>
                </View>
              </View>

              <View style={[styles.estimatedRow, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
                <Icon name="clock-fast" size={16} color={colors.secondary.main} />
                <Text style={[styles.estimatedText, { color: themeColors.text.secondary }]}>
                  Estimated Finish:
                </Text>
                <Text style={[styles.estimatedTime, { color: themeColors.text.primary }]}>
                  {jobData.estimatedFinish}
                </Text>
                <Icon name="information-outline" size={14} color={themeColors.text.hint} />
              </View>
            </View>
          </AnimatedPress>

          <StatusPipeline statuses={jobData.statusPills} isDark={isDark} />

          {/* Quick Actions Menu */}
          <View style={[styles.quickActionsCard, { backgroundColor: themeColors.card }, SHADOWS.sm]}>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={handleTicketPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.primary.main + '15' }]}>
                <Icon name="ticket-outline" size={20} color={colors.primary.main} />
              </View>
              <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>Tickets</Text>
            </TouchableOpacity>

            <View style={[styles.quickActionDivider, { backgroundColor: themeColors.border }]} />

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={handleChatPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary.main + '15' }]}>
                <Icon name="chat-outline" size={20} color={colors.secondary.main} />
              </View>
              <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>Chat</Text>
            </TouchableOpacity>

            <View style={[styles.quickActionDivider, { backgroundColor: themeColors.border }]} />

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={handleMapPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.success.main + '15' }]}>
                <Icon name="map-marker-outline" size={20} color={colors.success.main} />
              </View>
              <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>Map</Text>
            </TouchableOpacity>
          </View>

          <ProductScheduleCard
            scheduleDate={order.scheduledDate}
            scheduleTime={order.scheduledTime}
            productType={order.productType}
            productMix={order.productMix || ''}
            plantName={jobData.plantName}
            plantCode={jobData.plantCode}
            plantPhone={jobData.plantPhone}
            statusText={getStatusLabel(order.status)}
            statusColor={statusColor}
            isDark={isDark}
            onCallPress={() => handleCall(jobData.plantPhone)}
          />

          <ContactDetailsCard
            plantName={jobData.plantName}
            plantCode={jobData.plantCode}
            plantAddress1={jobData.plantAddress1}
            plantAddress2={jobData.plantAddress2}
            plantPhone={jobData.plantPhone}
            isDark={isDark}
            onCallPress={() => handleCall(jobData.plantPhone)}
          />

          {jobData.pourSpeedRaw.hasData ? (
            <TimeBasedChart
              orderedData={jobData.pourSpeedRaw.ordered}
              deliveredData={jobData.pourSpeedRaw.delivered}
              pouredData={jobData.pourSpeedRaw.poured}
              scheduleRate={jobData.pourSpeedRaw.scheduleRate}
              yMax={jobData.pourSpeedRaw.yMax}
              scheduledQty={jobData.orderedVolume}
              isDark={isDark}
            />
          ) : (
            <SmartChart
              title="Pour Speed (CY/HR)"
              data={pourSpeedChartData}
              series={[
                { key: 'delivered', color: colors.secondary.main, label: 'Delivered' },
                { key: 'poured', color: colors.success.main, label: 'Poured' },
                { key: 'ordered', color: colors.warning.main, label: 'Ordered' },
              ]}
              tooltipInfo={{ ordered: '18.5 CY/HR', spacing: '60 min' }}
              isDark={isDark}
              showPickPoint={true}
              pickPointIndex={3}
            />
          )}

          {jobData.trucksOnJobRaw.hasData ? (
            <TrucksOnJobChart
              timePoints={jobData.trucksOnJobRaw.timePoints}
              averages={jobData.trucksOnJobRaw.averages}
              isDark={isDark}
            />
          ) : (
            <SmartChart
              title="Trucks on the Job"
              data={trucksChartData}
              series={[
                { key: 'trucks', color: colors.primary.main, label: 'Trucks' },
                { key: 'spacing', color: colors.secondary.main, label: 'Spacing' },
                { key: 'load', color: colors.success.main, label: 'Load' },
              ]}
              tooltipInfo={{ ordered: '13:52/HR', spacing: jobData.avgSpacing }}
              isDark={isDark}
              showPickPoint={true}
              pickPointIndex={3}
            />
          )}

          <OrderCodeDetailsCard
            products={jobData.products}
            isDark={isDark}
            onProductPress={handleProductPress}
          />

          <View style={[styles.truckBackgroundContainer, { backgroundColor: isDark ? colors.cardBg.dark : colors.cardBg.infoBg }]}>
            <View style={styles.cityBackgroundWrapper}>
              <Isolation_Mode
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMax slice"
              />
            </View>
            <View style={styles.truckOverlay}>
              <YellowTruck width={150} height={(150 * 86) / 157} />
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={handleMenuToggle}>
        <View style={styles.menuModalWrapper}>
          <Pressable style={styles.menuBackdrop} onPress={handleMenuToggle} />

          <View style={styles.menuBottomSheet}>
            <SafeAreaView edges={['bottom']} style={styles.menuSafeArea}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.menuContainer}>
                  <View style={[styles.menuContent, { backgroundColor: themeColors.card }]}>
                    <View style={styles.menuHandle}>
                      <View style={[styles.menuHandleBar, { backgroundColor: isDark ? themeColors.border : colors.grey[25] }]} />
                    </View>

                    <View style={[styles.menuHeader, { borderBottomColor: isDark ? themeColors.border : colors.grey[10] }]}>
                      <Text style={[styles.menuTitle, { color: themeColors.text.primary }]}>
                        Order Options
                      </Text>
                      <TouchableOpacity
                        onPress={handleMenuToggle}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={20} color={themeColors.text.hint} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      bounces={false}
                      showsVerticalScrollIndicator={false}
                      style={styles.menuScrollView}>
                      {menuItems.map((item, index) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.menuItem,
                            index < menuItems.length - 1 && {
                              borderBottomWidth: 1,
                              borderBottomColor: isDark ? themeColors.border : colors.grey[10],
                            },
                          ]}
                          onPress={item.onPress}
                          activeOpacity={0.7}>
                          <View style={[styles.menuItemIcon, { backgroundColor: colors.primary.main + '10' }]}>
                            <Icon name={item.icon} size={18} color={colors.primary.main} />
                          </View>
                          <Text style={[styles.menuItemLabel, { color: themeColors.text.primary }]}>
                            {item.label}
                          </Text>
                          <Icon name="chevron-right" size={18} color={themeColors.text.hint} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: GRID.lg,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(16),
    textAlign: 'center',
    marginTop: GRID.md,
    marginBottom: GRID.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.sm,
    borderRadius: RADIUS.md,
    gap: GRID.sm,
  },
  retryButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
  header: {
    paddingBottom: GRID.lg,
    backgroundColor: 'transparent',
  },
  headerSafeArea: {
    paddingHorizontal: GRID.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: GRID.sm,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: GRID.sm,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: colors.common.white + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStatusContainer: {
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  headerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.common.white,
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.sm,
    borderRadius: RADIUS.full,
    gap: GRID.sm,
  },
  headerStatusPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success.main,
  },
  headerStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.primary.main,
  },
  headerSiteName: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
    textAlign: 'center',
    marginTop: GRID.sm,
  },
  headerChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: GRID.sm,
    marginTop: GRID.md,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm + 2,
    paddingVertical: GRID.xs + 1,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  headerChipText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    color: colors.common.white,
  },
  headerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GRID.sm,
    gap: 4,
  },
  headerAddress: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    marginTop: ms(5),
    color: colors.common.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  truckBackgroundContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginHorizontal: -GRID.md,
  },
  cityBackgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  truckOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 70,
  },
  contentContainer: {
    padding: GRID.md,
  },
  metricsCard: {
    borderRadius: RADIUS.xxl,
    padding: GRID.lg,
    marginBottom: GRID.md,
  },
  quickActionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: RADIUS.lg,
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.sm,
    marginBottom: GRID.md,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.xs,
  },
  quickActionIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: GRID.xs,
  },
  quickActionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  quickActionDivider: {
    width: 1,
    height: ms(32),
  },
  metricsMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(20),
    textAlign: 'center',
  },
  metricUnit: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
    marginTop: 2,
    textAlign: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressOuter: {
    borderRadius: RADIUS.full,
    padding: GRID.xs,
  },
  circularProgressInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTime: {
    fontFamily: fontFamily.bold,
    fontSize: ms(24),
  },
  progressLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginTop: 2,
  },
  progressBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: GRID.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  progressBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(10),
    color: colors.common.white,
  },
  estimatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: GRID.lg,
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.md,
    borderRadius: RADIUS.md,
    gap: GRID.sm,
  },
  estimatedText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    flex: 1,
  },
  estimatedTime: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: GRID.md,
    marginBottom: GRID.md,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    alignItems: 'center',
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  quickStatLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginBottom: 2,
  },
  quickStatValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quickStatValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(18),
  },
  quickStatUnit: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
    marginLeft: 2,
  },
  pipelineContainer: {
    borderRadius: RADIUS.xl,
    paddingVertical: GRID.md,
    paddingHorizontal: GRID.sm,
    marginBottom: GRID.md,
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pipelineItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
  },
  pipelineLabel: {
    fontSize: ms(11),
    marginBottom: GRID.sm,
    textAlign: 'center',
  },
  pipelineIndicator: {
    width: '100%',
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  pipelineIndicatorFill: {
    height: '100%',
    borderRadius: ms(3),
  },
  pipelineValue: {
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
    marginTop: GRID.sm,
    textAlign: 'center',
  },
  pipelineSeparator: {
    width: 1,
    height: ms(45),
  },
  productScheduleCard: {
    borderRadius: RADIUS.xl,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  psCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  psCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  psCardIconContainer: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  psCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
  },
  psStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  psStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  psStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
  },
  psInfoGrid: {
    flexDirection: 'row',
    paddingHorizontal: GRID.md,
    gap: GRID.sm,
  },
  psInfoItem: {
    flex: 1,
    padding: GRID.sm,
    borderRadius: RADIUS.md,
    marginBottom: GRID.sm,
  },
  psInfoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: GRID.xs,
  },
  psInfoItemLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  psInfoItemValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  psInfoItemSubValue: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: 2,
  },
  psPlantContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: GRID.md,
    marginHorizontal: GRID.md,
    paddingTop: GRID.md,
    paddingBottom: GRID.md,
    borderTopWidth: 1,
    gap: GRID.sm,
  },
  psPlantIconContainer: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  psPlantContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GRID.md,
  },
  psPlantNameRow: {
    flex: 1,
    flexDirection: 'column',
  },
  psPlantLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginBottom: GRID.xs,
  },
  psPlantName: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  psPlantPhone: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: GRID.xs,
  },
  psCallButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetailsCard: {
    borderRadius: RADIUS.xl,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  cdCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  cdCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  cdCardIconContainer: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cdCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
  },
  cdInfoContainer: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  cdInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
    gap: GRID.sm,
  },
  cdInfoIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cdInfoContent: {
    flex: 1,
  },
  cdInfoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginBottom: 2,
  },
  cdInfoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  cdInfoSubValue: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: 2,
  },
  cdCallButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCodeSection: {
  },
  ocSectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
    textAlign: 'center',
    marginBottom: GRID.lg,
  },
  ocProductCard: {
    borderRadius: RADIUS.lg,
    marginBottom: GRID.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  ocMainRow: {
    flexDirection: 'row',
    paddingTop: GRID.md,
    paddingBottom: GRID.sm,
    paddingHorizontal: GRID.md,
    alignItems: 'flex-start',
  },
  ocLeftSection: {
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  ocBarcodeWrapper: {
    flexDirection: 'row',
    height: ms(65),
    paddingHorizontal: GRID.xs,
    alignItems: 'center',
  },
  ocItemCode: {
    fontFamily: fontFamily.bold,
    fontSize: ms(8),
    textAlign: 'center',
    marginTop: GRID.xs,
    maxWidth: ms(130),
  },
  ocRightSection: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingLeft: GRID.xs,
  },
  ocProductBadge: {
    paddingHorizontal: GRID.sm + 2,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: GRID.sm,
  },
  ocProductBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  ocProductQty: {
    fontFamily: fontFamily.bold,
    fontSize: ms(18),
    marginBottom: 2,
  },
  ocProductSlump: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    color: colors.grey[50],
  },
  ocDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.sm + 2,
    gap: GRID.sm,
    borderTopWidth: 1,
  },
  ocDetailsLinkText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(13),
  },
  expandableSection: {
    borderRadius: RADIUS.xl,
    marginBottom: GRID.md,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
    gap: GRID.md,
  },
  expandableIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandableTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    flex: 1,
  },
  expandableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  expandableBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  expandableBadgeText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  expandableContent: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  infoRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
    gap: GRID.md,
  },
  infoRowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRowContent: {
    flex: 1,
  },
  infoRowText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  infoRowSubtext: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: 2,
  },
  infoRowAction: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: GRID.sm,
  },
  sectionSubLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginBottom: GRID.xs,
    marginLeft: 52,
  },
  chartCard: {
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    marginBottom: GRID.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  chartTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
  },
  chartFilterWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  chartFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm + 2,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  chartFilterText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  chartDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: GRID.xs,
    minWidth: 120,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.md,
    zIndex: 100,
  },
  chartDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.xs,
  },
  chartDropdownText: {
    fontSize: ms(11),
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID.sm,
    marginBottom: GRID.sm,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
    paddingVertical: 2,
    gap: 4,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  chartInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: GRID.md,
    marginBottom: GRID.sm,
  },
  chartDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartDateText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  chartAdditionalText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
  },
  chartSvgContainer: {
    position: 'relative',
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    marginTop: -15,
  },
  chartXLabel: {
    fontSize: ms(9),
  },
  scheduleRateInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: GRID.sm,
    borderTopWidth: 1,
    marginTop: GRID.xs,
  },
  scheduleRateLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  scheduleRateValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
  },
  // Pour Speed Chart Styles
  pourSpeedCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
  },
  pourSpeedHeader: {
    marginBottom: GRID.sm,
  },
  pourSpeedTitle: {
    fontSize: ms(16),
    fontFamily: fontFamily.semiBold,
    marginBottom: 2,
  },
  pourSpeedSubtitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  pourSpeedChartContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  pourSpeedYAxis: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  pourSpeedScrollView: {
    flex: 1,
  },
  pourSpeedYAxisText: {
    fontSize: ms(8),
    fontFamily: fontFamily.medium,
    textAlign: 'right',
    marginBottom: GRID.xs,
    paddingRight: 2,
  },
  pourSpeedTooltip: {
    position: 'absolute',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs + 2,
    borderRadius: RADIUS.xs,
    minWidth: 110,
    zIndex: 100,
  },
  pourSpeedTooltipTime: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
    marginBottom: 3,
  },
  pourSpeedTooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pourSpeedTooltipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pourSpeedTooltipLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.regular,
  },
  pourSpeedTooltipValue: {
    fontSize: ms(11),
    fontFamily: fontFamily.semiBold,
  },
  pourSpeedLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: GRID.sm,
    marginTop: GRID.sm,
  },
  pourSpeedLegendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  pourSpeedLegendMarker: {
    width: 10,
    height: 10,
  },
  pourSpeedLegendText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  pickPointTooltip: {
    position: 'absolute',
    minWidth: ms(100),
    padding: GRID.xs,
    borderRadius: RADIUS.xs,
    zIndex: 100,
  },
  tooltipDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[10] + '30',
  },
  tooltipDateText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(7),
  },
  tooltipDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  tooltipDataLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(7),
  },
  tooltipDataValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(7),
  },
  chartTooltip: {
    position: 'absolute',
    padding: GRID.sm,
    borderRadius: RADIUS.md,
    minWidth: 140,
    ...SHADOWS.md,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: GRID.xs,
    paddingBottom: GRID.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[10] + '50',
  },
  chartTooltipTime: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
  },
  tooltipInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  tooltipInfoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  tooltipInfoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    marginLeft: GRID.sm,
  },
  chartTooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  chartTooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chartTooltipValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    ...SHADOWS.lg,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomTabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: GRID.sm,
  },
  bottomTabItem: {
    alignItems: 'center',
    paddingVertical: GRID.xs,
    minWidth: 64,
    position: 'relative',
  },
  bottomTabIconBg: {
    width: 44,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  bottomTabLabel: {
    fontSize: ms(10),
  },
  bottomTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary.main,
  },
  menuModalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.modal,
  },
  menuBottomSheet: {
    width: '100%',
    maxHeight: '80%',
  },
  menuSafeArea: {
    width: '100%',
  },
  menuContainer: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.sm,
  },
  menuContent: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  menuHandle: {
    alignItems: 'center',
    paddingVertical: GRID.sm,
  },
  menuHandleBar: {
    width: ms(36),
    height: ms(4),
    borderRadius: RADIUS.full,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.md,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
  },
  menuScrollView: {
    maxHeight: SCREEN_WIDTH,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.md,
    gap: GRID.md,
  },
  menuItemIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
  },
});

export default OrderDetailsScreen;
