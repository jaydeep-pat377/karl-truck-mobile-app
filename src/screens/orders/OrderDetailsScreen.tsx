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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
<<<<<<< Updated upstream
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText } from 'react-native-svg';
=======
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText, Pattern, Line, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TopGradientBackground } from '../../components/common';
import { Order } from '../../types';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';

type OrderDetailsRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Design System Constants (8pt Grid)
// ============================================
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

// ============================================
// Mock Data (Preserved)
// ============================================
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
  ticketedVolume: 11.77,
  pouredVolume: 9.42,
  orderedVolume: 11.75,
  remainingVolume: 2.33,
  estimatedFinish: '04:30PM',
  temperature: 28,
  siteName: 'Dagmar Construction Inc',
  plantName: 'Greenwood',
  plantCode: '303',
  plantPhone: '+621-0262 987 323',
  truckCount: 3,
  avgSpacing: '45 min',
  statusPills: [
    { label: 'Loaded', value: 186, unit: 'CY', active: false, icon: 'truck-loading' },
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
  trucksOnJobData: [
    { time: '07:00', trucks: 1, spacing: 2, load: 3 },
    { time: '07:30', trucks: 1, spacing: 2, load: 3 },
    { time: '08:00', trucks: 2, spacing: 3, load: 4 },
    { time: '08:30', trucks: 3, spacing: 3, load: 5 },
    { time: '09:00', trucks: 3, spacing: 4, load: 5 },
    { time: '09:30', trucks: 2, spacing: 3, load: 4 },
    { time: '10:00', trucks: 2, spacing: 3, load: 4 },
  ],
};

// ============================================
// Animated Press Button Component
// ============================================
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
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? colors.grey[60] + '20' : colors.grey[10]}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress arc */}
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

// ============================================
// Quick Stat Card Component
// ============================================
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

// ============================================
// Enhanced Status Pipeline Component
// ============================================
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

  // Fixed indicator colors: green, orange, green, blue
  const indicatorColors = [
    colors.success.main,   // Loaded - green
    colors.warning.main,   // To Job - orange
    colors.success.main,   // At Job - green
    colors.info.main,      // Pouring - blue
  ];

  // Get indicator color by index
  const getIndicatorColor = (index: number) => {
    return indicatorColors[index] || colors.grey[40];
  };

  // Progress percentage for each status
  const progressValues = [75, 60, 45, 25]; // Loaded, To Job, At Job, Pouring

  const getProgress = (index: number) => {
    return progressValues[index] || 20;
  };

  const separatorColor = isDark ? colors.grey[50] : colors.grey[15];

  return (
    <View style={[styles.pipelineContainer, { backgroundColor: themeColors.card }]}>
      <View style={styles.pipelineRow}>
        {statuses.map((status, index) => {
          const isActive = status.active;
          const isLast = index === statuses.length - 1;
          const indicatorColor = getIndicatorColor(index);
          const progress = getProgress(index);

          return (
            <View
              key={index}
              style={[
                styles.pipelineItem,
                !isLast && {
                  borderRightWidth: 1,
                  borderRightColor: separatorColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.pipelineLabel,
                  {
                    color: themeColors.text.primary,
                    fontFamily: isActive ? fontFamily.semiBold : fontFamily.medium,
                  },
                ]}
              >
                {status.label}
              </Text>

              {/* Progress bar with track and fill */}
              <View style={[styles.pipelineIndicator, { backgroundColor: isDark ? colors.grey[60] + '30' : colors.grey[10] }]}>
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

<<<<<<< Updated upstream
// ============================================
// Product & Schedule Card Component
// ============================================
=======
interface DeliveryProgressSegment {
  status: string;
  status_display: string;
  qty: number;
  percentage: number;
  label: string;
  color: string;
}

interface DeliveryProgressBarProps {
  segments: DeliveryProgressSegment[];
  overallPercentage: number;
  orderedQty: number;
  deliveredQty: number;
  totalLoads?: number | null;
  ticketsCount?: number;
  completedLoads?: number;
  isDark: boolean;
}

const DeliveryProgressBar: React.FC<DeliveryProgressBarProps> = ({
  segments,
  overallPercentage,
  orderedQty,
  deliveredQty,
  totalLoads,
  ticketsCount,
  completedLoads,
  isDark,
}) => {
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  if (!segments || segments.length === 0) {
    return null;
  }

  const { fills: progressFills, atPlantQty } = computeCumulativeFills(
    segments,
    totalLoads,
    ticketsCount ?? 0,
  );
  const completionPercent = orderedQty > 0 ? ((atPlantQty / orderedQty) * 100).toFixed(2) : '0.00';
  const deliveredPercent = orderedQty > 0 ? Math.round((deliveredQty / orderedQty) * 100) : 0;

  const segmentColors = PROGRESS_STATUSES.map(status => {
    const apiSeg = segments.find((s: any) => s.status === status.key);
    return apiSeg?.color || FALLBACK_SEGMENT_COLOR;
  });

  // Tooltip state
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [tooltipY, setTooltipY] = useState(0);
  const progressBarRef = useRef<View>(null);

  const showTooltip = (key: string) => {
    if (tooltipKey === key) {
      setTooltipKey(null);
      return;
    }
    progressBarRef.current?.measureInWindow((_x, y, _w, h) => {
      setTooltipY(y + h + ms(4));
      setTooltipKey(key);
    });
  };

  const handleInfoPress = () => showTooltip('all');
  const handleSegmentPress = (key: string) => showTooltip(key);

  // Build per-status qty map for tooltip
  const segmentQtyMap: Record<string, number> = {};
  for (const { key } of PROGRESS_STATUSES) {
    const seg = (segments || []).find((s: any) => s.status === key);
    segmentQtyMap[key] = seg?.qty ?? 0;
  }

  return (
    <View style={[styles.deliveryProgressCard, { backgroundColor: themeColors.card }, SHADOWS.sm]}>
      <View style={styles.deliveryProgressHeader}>
        <View style={styles.deliveryProgressTitleRow}>
          <Icon name="chart-timeline-variant" size={16} color={colors.primary.main} />
          <Text style={[styles.deliveryProgressTitle, { color: themeColors.text.primary }]}>
            {t('orders.detail.deliveryStatus')}
          </Text>
        </View>
      </View>

      <View ref={progressBarRef} style={styles.deliveryProgressSegmentedRow}>
        <Pressable onPress={handleInfoPress} hitSlop={8}>
          <Icon
            name="information-outline"
            size={ms(14)}
            color={themeColors.text.hint}
          />
        </Pressable>
        <View style={styles.deliverySegmentBarsRow}>
          {PROGRESS_STATUSES.map((status, index) => (
            <React.Fragment key={`bar-${status.key}`}>
              <Pressable
                style={styles.deliverySegmentBarWrapper}
                onPress={() => handleSegmentPress(status.key)}
              >
                <View style={styles.deliverySegmentTrack}>
                  <SegmentStripes color={segmentColors[index]} patternId={`detail-stripe-${status.key}`} />
                  <View
                    style={[
                      styles.deliverySegmentFillOverlay,
                      {
                        width: `${progressFills[index]}%`,
                        backgroundColor: segmentColors[index],
                      },
                    ]}
                  />
                </View>
              </Pressable>
              {index < PROGRESS_STATUSES.length - 1 && (
                <View style={[styles.deliverySegmentDividerDotted, { borderColor: themeColors.text.hint }]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.deliveryCyValueText, { color: themeColors.text.primary }]}
        >
          {orderedQty.toFixed(2)} CY
        </Text>
      </View>

      <Modal
        visible={tooltipKey !== null}
        transparent
        animationType="none"
        onRequestClose={() => setTooltipKey(null)}
      >
        <Pressable style={styles.deliveryTooltipBackdrop} onPress={() => setTooltipKey(null)}>
          <View
            style={[
              styles.deliveryTooltipContainer,
              {
                top: tooltipY,
                backgroundColor: isDark ? colors.dark.cardElevated : colors.common.white,
                borderColor: isDark ? colors.dark.border : colors.grey[15],
              },
            ]}
          >
            {tooltipKey === 'all' ? (
              PROGRESS_STATUSES.map((status) => {
                const colorIdx = PROGRESS_STATUSES.findIndex(s => s.key === status.key);
                return (
                  <View key={status.key} style={styles.deliveryTooltipRow}>
                    <View style={[styles.deliveryTooltipDot, { backgroundColor: segmentColors[colorIdx] }]} />
                    <Text style={[styles.deliveryTooltipLabel, { color: themeColors.text.primary }]}>
                      {status.label}
                    </Text>
                  </View>
                );
              })
            ) : (
              <>
                <Text style={[styles.deliveryTooltipText, { color: themeColors.text.primary }]}>
                  {PROGRESS_STATUSES.find(s => s.key === tooltipKey)?.label}: {segmentQtyMap[tooltipKey || '']?.toFixed(2) ?? '0.00'} CY
                </Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <View style={styles.deliveryCompletionRow}>
        <Text style={[styles.deliveryCompletionText, { color: getCompletionColor(deliveredPercent) }]}>
          {completionPercent}% {t('orders.detail.completed')}
        </Text>
      </View>
    </View>
  );
};

>>>>>>> Stashed changes
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
  plantName,
  plantCode,
  plantPhone,
  statusText,
  statusColor,
  isDark,
  onCallPress,
}) => {
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  const formatDateOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

<<<<<<< Updated upstream
=======
  const formattedDate = displayDate || formatDateOnly(scheduleDate);

  const scheduleDisplay = estimatedFinish
    ? `${scheduleTime || t('common.notAvailable')} - ${estimatedFinish}`
    : scheduleTime || t('common.notAvailable');

  const hasAverages = (avgWaitingMinutes ?? 0) > 0 || (avgPouringMinutes ?? 0) > 0 || (avgWashoutMinutes ?? 0) > 0;

  const hasPourData = (deliveredQty ?? 0) > 0 || (pouredQty ?? 0) > 0;

>>>>>>> Stashed changes
  return (
    <View style={[styles.productScheduleCard, { backgroundColor: themeColors.card }]}>
      {/* Header with Title and Status */}
      <View style={styles.psCardHeader}>
        <View style={styles.psCardTitleRow}>
          <View style={[styles.psCardIconContainer, { backgroundColor: colors.primary.main }]}>
            <Icon name="clipboard-text-outline" size={16} color={colors.common.white} />
          </View>
          <Text style={[styles.psCardTitle, { color: themeColors.text.primary }]}>
            {t('orders.detail.productSchedule')}
          </Text>
        </View>
        <View style={[styles.psStatusBadge, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.psStatusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.psStatusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      {/* Schedule & Product Info Grid */}
      <View style={styles.psInfoGrid}>
        {/* Schedule */}
        <View style={[styles.psInfoItem, { backgroundColor: isDark ? colors.grey[60] + '10' : colors.grey[3] }]}>
          <View style={styles.psInfoItemHeader}>
            <Icon name="calendar-clock" size={14} color={colors.primary.main} />
            <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>{t('orders.detail.schedule')}</Text>
          </View>
          <Text style={[styles.psInfoItemValue, { color: themeColors.text.primary }]}>
            {scheduleTime}
          </Text>
          <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.secondary }]}>
            {formatDateOnly(scheduleDate)}
          </Text>
        </View>

        {/* Product */}
        <View style={[styles.psInfoItem, { backgroundColor: isDark ? colors.grey[60] + '10' : colors.grey[3] }]}>
          <View style={styles.psInfoItemHeader}>
            <Icon name="cube-outline" size={14} color={colors.secondary.main} />
            <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>{t('orders.detail.product')}</Text>
          </View>
          <Text style={[styles.psInfoItemValue, { color: themeColors.text.primary }]} numberOfLines={1}>
            {productType}
          </Text>
          <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.secondary }]} numberOfLines={1}>
            {productMix}
          </Text>
        </View>
      </View>

<<<<<<< Updated upstream
      <View style={[styles.psPlantContainer, { borderTopColor: themeColors.border }]}>
        {/* Factory Icon - Self aligned to top */}
        <View style={[styles.psPlantIconContainer, { backgroundColor: colors.info.main + '15' }]}>
          <Icon name="factory" size={18} color={colors.info.main} />
        </View>

        {/* Plant Details + Phone Icon Row */}
        <View style={styles.psPlantContentRow}>
          {/* Plant Name Row (psPlantNameRow) */}
          <View style={styles.psPlantNameRow}>
            <Text style={[styles.psPlantLabel, { color: themeColors.text.hint }]}>
              Production Plant
            </Text>
            <Text
              style={[styles.psPlantName, { color: themeColors.text.primary }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {plantName}-{plantCode}
            </Text>
            <Text style={[styles.psPlantPhone, { color: themeColors.text.secondary }]}>
              {plantPhone}
=======
      {hasPourData && (
        <View style={[styles.psInfoGrid, { marginTop: GRID.xs }]}>
          <View style={[styles.psInfoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
            <View style={styles.psInfoItemHeader}>
              <Icon name="truck-delivery" size={14} color={colors.success.main} />
              <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>{t('orders.detail.delivered')}</Text>
            </View>
            <Text style={[styles.psInfoItemValue, { color: colors.success.main }]}>
              {(deliveredQty ?? 0).toFixed(1)} CY
            </Text>
            {scheduleRate ? (
              <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.hint }]}>
                {t('orders.detail.rateCyHr', { value: scheduleRate })}
              </Text>
            ) : null}
          </View>

          <View style={[styles.psInfoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
            <View style={styles.psInfoItemHeader}>
              <Icon name="water" size={14} color={colors.info.main} />
              <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>{t('orders.detail.poured')}</Text>
            </View>
            <Text style={[styles.psInfoItemValue, { color: colors.info.main }]}>
              {(pouredQty ?? 0).toFixed(1)} CY
            </Text>
          </View>
        </View>
      )}

      {hasAverages && (
        <View style={[styles.psAveragesRow, { backgroundColor: isDark ? themeColors.surface : colors.grey[3], marginTop: GRID.xs, marginHorizontal: GRID.md, marginBottom: GRID.sm }]}>
          <View style={styles.psAverageItem}>
            <Icon name="clock-outline" size={12} color={colors.warning.main} />
            <Text style={[styles.psAverageLabel, { color: themeColors.text.hint }]}>{t('orders.detail.wait')}</Text>
            <Text style={[styles.psAverageValue, { color: themeColors.text.primary }]}>
              {(avgWaitingMinutes ?? 0).toFixed(0)}m
            </Text>
          </View>
          <View style={[styles.psAverageDivider, { backgroundColor: themeColors.border }]} />
          <View style={styles.psAverageItem}>
            <Icon name="water" size={12} color={colors.success.main} />
            <Text style={[styles.psAverageLabel, { color: themeColors.text.hint }]}>{t('orders.detail.pour')}</Text>
            <Text style={[styles.psAverageValue, { color: themeColors.text.primary }]}>
              {(avgPouringMinutes ?? 0).toFixed(0)}m
            </Text>
          </View>
          <View style={[styles.psAverageDivider, { backgroundColor: themeColors.border }]} />
          <View style={styles.psAverageItem}>
            <Icon name="shower" size={12} color={colors.info.main} />
            <Text style={[styles.psAverageLabel, { color: themeColors.text.hint }]}>{t('orders.detail.wash')}</Text>
            <Text style={[styles.psAverageValue, { color: themeColors.text.primary }]}>
              {(avgWashoutMinutes ?? 0).toFixed(0)}m
            </Text>
          </View>
        </View>
      )}

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
  const { t } = useTranslation();
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
            {t('orders.detail.contactDetails')}
          </Text>
        </View>
      </View>

      <View style={styles.cdInfoContainer}>
        <View style={styles.cdInfoRow}>
          <View style={[styles.cdInfoIcon, { backgroundColor: colors.primary.main + '12' }]}>
            <Icon name="domain" size={16} color={colors.primary.main} />
          </View>
          <View style={styles.cdInfoContent}>
            <Text style={[styles.cdInfoLabel, { color: themeColors.text.hint }]}>{t('orders.detail.plantName')}</Text>
            <Text style={[styles.cdInfoValue, { color: themeColors.text.primary }]} numberOfLines={1}>
              {plantName}
            </Text>
            {plantCode ? (
              <Text style={[styles.cdInfoSubValue, { color: themeColors.text.secondary }]}>
                {t('orders.detail.codeLabel', { code: plantCode })}
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
              <Text style={[styles.cdInfoLabel, { color: themeColors.text.hint }]}>{t('orders.detail.address')}</Text>
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
              <Text style={[styles.cdInfoLabel, { color: themeColors.text.hint }]}>{t('orders.detail.phone')}</Text>
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
  description?: string;
  isMix: boolean;
  orderedQty: number;
  deliveredQty: number;
  remainingQty: number;
  slump?: string;
  qr?: string;
}

interface ScheduleDetailItem {
  schedule_id?: string;
  item_code?: string;
  description?: string;
  is_mix?: boolean;
  slump?: string;
  plant_code?: string;
  plant_description?: string;
  schedule_qty?: number;
  schedule_delv_qty?: number;
  number_of_loads?: number;
  trucks_required?: number;
  load_qty?: number;
  truck_space?: number;
  delivery_rate_per_hour?: number;
  unload_time?: number;
  unload_rate_per_hour?: number;
  distance?: number;
  time_to_job?: number;
  time_to_plant?: number;
  job_wash_time?: number;
  truck_type_name?: string;
  start_time?: string;
}

interface ScheduledLoadItem {
  load_number: number;
  scheduled_time?: string;
  actual_time?: string | null;
  scheduled_qty?: string;
  actual_qty?: string | null;
  variance?: string | null;
  truck_code?: string | null;
  scheduled_on_job_time?: string;
  scheduled_fin_pour_time?: string;
  scheduled_at_plant_time?: string;
  ticket_code?: string | null;
  actual_on_job_time?: string | null;
  actual_unload_time?: string | null;
  actual_wash_time?: string | null;
  actual_at_plant_time?: string | null;
}

interface ProductSKUDetailsCardProps {
  products: ProductCardItem[];
  scheduleDetails?: ScheduleDetailItem[];
  scheduledLoads?: ScheduledLoadItem[];
  isDark: boolean;
  onOpenLoads?: () => void;
}

const ProductSKUDetailsCard: React.FC<ProductSKUDetailsCardProps> = ({
  products,
  scheduleDetails,
  scheduledLoads,
  isDark,
  onOpenLoads,
}) => {
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  if (!products || products.length === 0) {
    return null;
  }

  const product = products[0];
  const schedule = scheduleDetails?.[0];

  return (
    <View style={styles.skuSection}>
      <Text style={[styles.skuSectionTitle, { color: themeColors.text.primary }]}>
        {t('orders.detail.productSchedule')}
      </Text>


      <View style={[
        styles.skuMainCard,
        {
          backgroundColor: themeColors.card,
          borderColor: isDark ? themeColors.border : colors.grey[10],
        }
      ]}>

        <View style={[styles.skuHeader, { backgroundColor: isDark ? colors.primary.main + '20' : colors.primary.main + '08' }]}>
          <View style={styles.skuHeaderLeft}>
            <View style={[styles.skuIconBox, { backgroundColor: colors.primary.main }]}>
              <Icon name="cube-outline" size={ms(20)} color={colors.common.white} />
            </View>
            <View style={styles.skuHeaderText}>
              <Text style={[styles.skuItemCode, { color: themeColors.text.primary }]}>
                {product.itemCode}
              </Text>
              <Text style={[styles.skuDescription, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {product.description || t('orders.detail.concreteMix')}
              </Text>
            </View>
          </View>
          <View style={[
            styles.skuTypeBadge,
            { backgroundColor: product.isMix ? colors.success.main : colors.info.main }
          ]}>
            <Icon name={product.isMix ? 'water' : 'package-variant'} size={ms(12)} color={colors.common.white} />
            <Text style={styles.skuTypeBadgeText}>
              {product.isMix ? t('orders.detail.mix') : t('orders.detail.productType')}
>>>>>>> Stashed changes
            </Text>
          </View>

          {/* Phone Icon - Center aligned with psPlantNameRow */}
          <TouchableOpacity
            style={[styles.psCallButton, { backgroundColor: colors.success.main }]}
            onPress={onCallPress}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Icon name="phone" size={20} color={colors.common.white} />
          </TouchableOpacity>
        </View>
<<<<<<< Updated upstream
=======


        {schedule && (
          <View style={[styles.skuScheduleSection, { borderTopColor: isDark ? themeColors.border : colors.grey[10] }]}>
            <Text style={[styles.skuScheduleTitle, { color: themeColors.text.primary }]}>
              {t('orders.detail.scheduleInformation')}
            </Text>


            {schedule.start_time && (
              <View style={styles.skuScheduleRow}>
                <View style={[styles.skuScheduleItemWide, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                  <Icon name="clock-start" size={ms(18)} color={colors.primary.main} />
                  <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                    {schedule.start_time}
                  </Text>
                  <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.startTime')}</Text>
                </View>
              </View>
            )}


            <View style={styles.skuScheduleRow}>
              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="layers-triple" size={ms(18)} color={colors.secondary.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.number_of_loads ?? '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.loads')}</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="weight" size={ms(18)} color={colors.success.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.load_qty ? `${schedule.load_qty}` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.loadCy')}</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="speedometer" size={ms(18)} color={colors.primary.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.delivery_rate_per_hour ?? '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.cyHr')}</Text>
              </View>
            </View>


            <View style={styles.skuScheduleRow}>
              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="clock-outline" size={ms(18)} color={colors.info.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.truck_space ? `${schedule.truck_space}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.spacing')}</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="map-marker-distance" size={ms(18)} color={colors.error.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.distance ? `${schedule.distance}` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.miles')}</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="truck-fast" size={ms(18)} color={colors.success.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.time_to_job ? `${schedule.time_to_job}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.toJob')}</Text>
              </View>
            </View>


            <View style={styles.skuScheduleRow}>
              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="download" size={ms(18)} color={colors.secondary.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.unload_time ? `${schedule.unload_time}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.unload')}</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="water" size={ms(18)} color={colors.info.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.job_wash_time ? `${schedule.job_wash_time}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.wash')}</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="truck-delivery" size={ms(18)} color={colors.warning.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.time_to_plant ? `${schedule.time_to_plant}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>{t('orders.detail.toPlant')}</Text>
              </View>
            </View>


            <View style={styles.skuAdditionalInfo}>

              {schedule.plant_description && (
                <View style={[styles.skuInfoChip, { backgroundColor: isDark ? themeColors.surface : colors.grey[5] }]}>
                  <Icon name="factory" size={ms(14)} color={isDark ? colors.grey[40] : themeColors.text.secondary} />
                  <Text style={[styles.skuInfoChipText, { color: themeColors.text.primary }]}>
                    {schedule.plant_description}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}


        {scheduledLoads && scheduledLoads.length > 0 && onOpenLoads && (
          <View style={[styles.skuLoadsSection, { borderTopColor: isDark ? themeColors.border : colors.grey[10] }]}>
            <TouchableOpacity
              style={styles.skuLoadsButton}
              onPress={onOpenLoads}
              activeOpacity={0.7}
            >
              <View style={styles.skuLoadsHeaderLeft}>
                <View style={[styles.skuLoadsIconBox, { backgroundColor: isDark ? colors.secondary.main + '25' : colors.secondary.main + '15' }]}>
                  <Icon name="format-list-numbered" size={ms(18)} color={colors.secondary.main} />
                </View>
                <View style={styles.skuLoadsButtonText}>
                  <Text style={[styles.skuLoadsTitle, { color: themeColors.text.primary }]}>
                    {t('orders.detail.scheduledLoads')}
                  </Text>
                  <Text style={[styles.skuLoadsSubtitle, { color: themeColors.text.secondary }]}>
                    {t('orders.detail.loadsCompleted', { completed: scheduledLoads.filter(l => !!l.actual_time).length, total: scheduledLoads.length })}
                  </Text>
                </View>
              </View>
              <View style={styles.skuLoadsButtonRight}>
                <View style={[styles.skuLoadsBadge, { backgroundColor: colors.secondary.main }]}>
                  <Text style={styles.skuLoadsBadgeText}>{scheduledLoads.length}</Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={ms(20)}
                  color={themeColors.text.secondary}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}
>>>>>>> Stashed changes
      </View>
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

// ============================================
// Enhanced Chart Component with Dropdown Menu
// ============================================
interface SmartChartProps {
  title: string;
  data: Array<{ time: string;[key: string]: number | string }>;
  series: Array<{ key: string; color: string; label: string }>;
  tooltipInfo?: { ordered?: string; spacing?: string };
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

  // Y-axis labels (5 steps from 0 to max)
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

  // Create smooth curved path using Catmull-Rom spline converted to Bezier
  const createSmoothPath = (seriesKey: string) => {
    const points = data.map((d, i) => ({
      x: getX(i),
      y: getY(Number(d[seriesKey]) || 0),
    }));

    if (points.length < 2) return '';

    // For smooth Catmull-Rom spline, we need to handle endpoints
    const extendedPoints = [
      { x: points[0].x - (points[1].x - points[0].x), y: points[0].y - (points[1].y - points[0].y) },
      ...points,
      { x: points[points.length - 1].x + (points[points.length - 1].x - points[points.length - 2].x),
        y: points[points.length - 1].y + (points[points.length - 1].y - points[points.length - 2].y) },
    ];

    let path = `M ${points[0].x} ${points[0].y}`;

    // Catmull-Rom to Bezier conversion
    const tension = 0.5; // 0 = sharp, 1 = very smooth

    for (let i = 1; i < extendedPoints.length - 2; i++) {
      const p0 = extendedPoints[i - 1];
      const p1 = extendedPoints[i];
      const p2 = extendedPoints[i + 1];
      const p3 = extendedPoints[i + 2];

      // Calculate control points
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

  // Get pick point position (use first visible series for Y position)
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

  // Format tooltip date
  const formatTooltipDate = () => {
    const today = new Date();
    return `${today.getDate()} ${today.toLocaleString('en-US', { month: 'short' })} ${today.getFullYear()}`;
  };

  return (
    <View style={[styles.chartCard, { backgroundColor: themeColors.card }]}>
      {/* Header with Dropdown */}
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: themeColors.text.primary }]}>{title}</Text>
        <View style={styles.chartFilterWrapper}>
          <TouchableOpacity
            style={[styles.chartFilterBtn, { backgroundColor: isDark ? colors.grey[60] + '15' : colors.grey[5] }]}
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chartFilterText, { color: themeColors.text.primary }]}>{filter}</Text>
            <Icon name={showDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={themeColors.text.hint} />
          </TouchableOpacity>

          {/* Dropdown Menu */}
          {showDropdown && (
            <View style={[
              styles.chartDropdown,
              {
                backgroundColor: isDark ? colors.grey[80] : colors.common.white,
                borderColor: isDark ? colors.grey[60] : colors.grey[10],
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
                      borderBottomColor: isDark ? colors.grey[60] + '30' : colors.grey[10],
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

      {/* Chart SVG */}
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

          {/* Dotted Grid lines and Y-axis labels */}
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
                  fontFamily={fontFamily.medium}
                >
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* Areas and lines */}
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

          {/* Single Pick Point */}
          {showPickPoint && pickPoint && (
            <G>
              {/* Outer circle (border) */}
              <Circle
                cx={pickPoint.x}
                cy={pickPoint.y}
                r={8}
                fill={colors.common.white}
                stroke={colors.primary.main}
                strokeWidth={3}
              />
              {/* Inner dot */}
              <Circle
                cx={pickPoint.x}
                cy={pickPoint.y}
                r={3}
                fill={colors.primary.main}
              />
            </G>
          )}
        </Svg>

        {/* Tooltip for Pick Point - positioned above pick point */}
        {showPickPoint && pickPoint && showTooltip && (
          <View
            style={[
              styles.pickPointTooltip,
              {
                backgroundColor: isDark ? colors.grey[80] : colors.common.white,
                left: Math.min(Math.max(pickPoint.x - 50, GRID.sm), chartWidth - 110),
                top: pickPoint.y - 52,
                ...SHADOWS.sm,
              }
            ]}
          >
            {/* Date & Time Row */}
            <View style={styles.tooltipDateRow}>
              <Icon name="calendar" size={8} color={colors.primary.main} />
              <Text style={[styles.tooltipDateText, { color: themeColors.text.primary }]}>
                {formatTooltipDate()} • {pickPoint.data.time}
              </Text>
            </View>

            {/* Ordered Value */}
            <View style={styles.tooltipDataRow}>
              <Text style={[styles.tooltipDataLabel, { color: themeColors.text.hint }]}>
                Ordered
              </Text>
              <Text style={[styles.tooltipDataValue, { color: themeColors.text.primary }]}>
                {tooltipInfo?.ordered || '18.5 CY/HR'}
              </Text>
            </View>

            {/* Spacing Value */}
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

        {/* X-axis labels */}
        <View style={styles.chartXLabels}>
          {data.map((d, i) => (
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
          ))}
        </View>
      </Pressable>
    </View>
  );
};

// ============================================
// Enhanced Bottom Tab Component
// ============================================
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
        borderTopColor: isDark ? colors.grey[60] + '20' : colors.grey[10],
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

// ============================================
// Main Screen Component
// ============================================
export const OrderDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<OrderDetailsRouteProp>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const { orderId } = route.params;
  const order = getMockOrder(orderId);
  const jobData = mockJobData;

  const [activeTab, setActiveTab] = useState('Jobs');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMenuToggle = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

<<<<<<< Updated upstream
=======
  const handleToggleFavorite = useCallback(() => {
    const previousValue = isFavorite;

    setIsFavorite(prev => !prev);

    orderService.toggleFavourite(order.id)
      .then(() => {

        queryClient.invalidateQueries({ queryKey: ['orders'] });
      })
      .catch((error) => {
        console.error('Failed to toggle favorite:', error);

        setIsFavorite(previousValue);
        showError(t('common.error'), t('errors.failedToUpdateFavorite'));
      });
  }, [order.id, isFavorite, showError, queryClient, t]);

  const handleTicketPress = useCallback(() => {
    navigation.navigate('Ticket', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
    });
  }, [navigation, order]);

  const handleProductDetailsPress = useCallback(() => {
    navigation.navigate('OrderProductDetails', {
      orderId: order.id,
      orderCode: order.orderCode,
      orderDate: order.scheduledDate,
      status: order.status,
      progressColor: statusColor,
    });
  }, [navigation, order, statusColor]);

  const handleChatPress = useCallback(() => {
    markRoomAsRead(order.id);
    setApiUnreadCount(0);
    const parsedId = parseInt(order.id, 10);
    if (!isNaN(parsedId)) chatService.markAsRead(parsedId);
    navigation.navigate('ChatRoom', {
      roomId: order.id,
      roomName: `Order #${order.orderCode}`,
      chatId: parseInt(order.id, 10),
      orderId: parseInt(order.id, 10),
      orderDate: order.scheduledDate,
      customerName: order.customerName,
      projectName: order.projectName,
      deliveryAddress: order.deliveryAddress,
    });
  }, [navigation, order]);

  const handleMapPress = useCallback(() => {
    navigation.navigate('Tracking', {
      orderId: order.id,
    });
  }, [navigation, order]);

>>>>>>> Stashed changes
  const handleShare = useCallback(async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: t('orders.detail.shareMessage', { orderCode: order.orderCode, customerName: order.customerName, status: order.status, productType: order.productType, quantity: order.quantity, unit: order.unit, deliveryAddress: order.deliveryAddress }),
        title: t('orders.detail.shareTitle', { orderCode: order.orderCode }),
      });
    } catch (error) {
<<<<<<< Updated upstream
      Alert.alert('Error', 'Failed to share order details');
    }
  }, [order]);

  const handleViewOrderHistory = useCallback(() => {
    setMenuVisible(false);
    Alert.alert('Order History', 'Order history feature coming soon');
  }, []);

  const handleContactSupport = useCallback(() => {
    setMenuVisible(false);
    Alert.alert(
      'Contact Support',
      'How would you like to contact support?',
      [
        { text: 'Call', onPress: () => handleCall('+1-800-SUPPORT') },
        { text: 'Email', onPress: () => Linking.openURL('mailto:support@example.com') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handleCall]);

  const handleDownloadInvoice = useCallback(() => {
    setMenuVisible(false);
    Alert.alert('Download Invoice', 'Invoice download feature coming soon');
  }, []);
=======
      showError(t('common.error'), t('orders.detail.failedToShare'));
    }
  }, [order, showError, t]);

  // Matches web: passes full order data for form prefill
  const handleOrderRequest = useCallback(() => {
    if (!orderDetails) return;
    (navigation as any).navigate('OrderRequests', {
      screen: 'CreateOrderRequest',
      params: {
        prefillOrder: {
          order_id: orderDetails.order_id,
          order_code: orderDetails.order_code,
          customer_name: orderDetails.customer_name,
          project_name: orderDetails.project_name,
          order_date: orderDetails.order_date,
          start_time: orderDetails.start_time,
          job_address: orderDetails.delivery_addr1 || orderDetails.delivery_address,
          job_city: orderDetails.delivery_addr2 || '',
          job_state: orderDetails.delivery_addr3 || '',
          plant_code: orderDetails.plant_details?.code,
          plant_name: orderDetails.plant_details?.description,
          item_code: orderDetails.products?.[0]?.item_code,
          quantity: orderDetails.ordered_qty,
          special_instructions: orderDetails.has_notes ? orderDetails.notes?.[0]?.note_text : undefined,
          zone_name: (orderDetails as any).zone_name,
        },
      },
    });
  }, [navigation, orderDetails]);

  const handleViewOrderHistory = useCallback(() => {
    setMenuVisible(false);
    showInfo(t('orders.detail.orderHistory'), t('orders.detail.orderHistoryComingSoon'));
  }, [showInfo, t]);

  const handleDownloadInvoice = useCallback(() => {
    setMenuVisible(false);
    showInfo(t('orders.detail.downloadInvoice'), t('orders.detail.invoiceDownloadComingSoon'));
  }, [showInfo, t]);
>>>>>>> Stashed changes

  const handleTrackOrder = useCallback(() => {
    setMenuVisible(false);
    navigation.navigate('Tracking', { orderId: order.id });
  }, [navigation, order.id]);

  const handleWeatherPress = useCallback(() => {
    navigation.navigate('Weather', {
      locationName: order.deliveryAddress,
      latitude: order.latitude,
      longitude: order.longitude,
      orderId: order.id,
    });
<<<<<<< Updated upstream
  }, [navigation, order]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: 'Share Order', onPress: handleShare },
    { id: '2', icon: 'crosshairs-gps', label: 'Track Order', onPress: handleTrackOrder },
    { id: '3', icon: 'file-document-outline', label: 'Download Invoice', onPress: handleDownloadInvoice },
    { id: '4', icon: 'history', label: 'Order History', onPress: handleViewOrderHistory },
    { id: '5', icon: 'headset', label: 'Contact Support', onPress: handleContactSupport },
=======
  }, [navigation, orderCode, orderDate, order.status, order.scheduledTime]);

  const handleProductPress = useCallback((product: ProductCardItem) => {
    showInfo(t('orders.detail.productDetailsTitle'), t('orders.detail.productInfoMessage', { code: product.itemCode, qty: product.orderedQty.toFixed(2) }));
  }, [showInfo, t]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: t('orders.detail.shareOrder'), onPress: handleShare },
    { id: '2', icon: 'crosshairs-gps', label: t('orders.detail.trackOrder'), onPress: handleTrackOrder },
>>>>>>> Stashed changes
  ];

  const formatScheduleDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return `${timeStr} • ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  // Chart data with more points for smoother curves
  const pourSpeedChartData = useMemo(() => jobData.pourSpeedData, [jobData.pourSpeedData]);
  const trucksChartData = useMemo(() => jobData.trucksOnJobData, [jobData.trucksOnJobData]);

<<<<<<< Updated upstream
  const bottomTabs = [
    { icon: 'package-variant', label: 'Materials' },
    { icon: 'briefcase-outline', label: 'Jobs' },
    { icon: 'ticket-outline', label: 'Tickets' },
    { icon: 'crosshairs-gps', label: 'Track' },
    { icon: 'chat-outline', label: 'Chats' },
  ];
=======
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
            message={t('orders.detail.loadingOrderDetails')}
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
            {error || t('orders.detail.failedToLoadDetails')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={20} color={colors.common.white} />
            <Text style={styles.retryButtonText}>{t('orders.detail.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
>>>>>>> Stashed changes

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
            colors={[colors.common.white]}
          />
        }>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerSafeArea}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
                <Icon name="arrow-left" size={22} color={colors.common.white} />
              </TouchableOpacity>

              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
                  <Icon name="refresh" size={18} color={colors.common.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={handleMenuToggle}>
                  <Icon name="dots-vertical" size={18} color={colors.common.white} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.headerStatusContainer}>
              <View style={styles.headerStatusBadge}>
                <View style={styles.headerStatusPulse} />
                <Text style={styles.headerStatusText}>In Process</Text>
              </View>
            </View>

            <Text style={styles.headerSiteName}>{jobData.siteName}</Text>

            <View style={styles.headerChipsRow}>
              <View style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '25' }]}>
                <Icon name="file-document-outline" size={12} color={colors.common.white} />
                <Text style={styles.headerChipText}>Order: {order.orderCode}</Text>
              </View>

              <TouchableOpacity
                style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '25' }]}
                onPress={handleWeatherPress}
                activeOpacity={0.7}
              >
                <Icon name="weather-partly-cloudy" size={12} color={colors.common.white} />
                <Text style={styles.headerChipText}>{jobData.temperature}°C</Text>
              </TouchableOpacity>

              <View style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '25' }]}>
                <Icon name="truck" size={12} color={colors.common.white} />
                <Text style={styles.headerChipText}>{jobData.truckCount} Trucks</Text>
              </View>
            </View>

            <View style={styles.headerAddressRow}>
              <Icon name="map-marker-outline" size={12} color={colors.common.white + '80'} />
              <Text style={styles.headerAddress} numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.contentContainer}>
          <AnimatedPress>
            <View style={[styles.metricsCard, { backgroundColor: themeColors.card }, SHADOWS.md]}>
              <View style={styles.metricsMainRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: themeColors.text.primary }]}>
                    {jobData.ticketedVolume.toFixed(2)}
                    <Text style={[styles.metricUnit, { color: themeColors.text.secondary }]}>cy</Text>
                  </Text>
                  <Text style={[styles.metricLabel, { color: themeColors.text.hint }]}>Ticketed</Text>
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

              <View style={[styles.estimatedRow, { backgroundColor: isDark ? colors.grey[60] + '10' : colors.grey[3] }]}>
                <Icon name="clock-fast" size={16} color={colors.secondary.main} />
                <Text style={[styles.estimatedText, { color: themeColors.text.secondary }]}>
                  Estimated Finish:
                </Text>
<<<<<<< Updated upstream
                <Text style={[styles.estimatedTime, { color: themeColors.text.primary }]}>
                  {jobData.estimatedFinish}
                </Text>
                <Icon name="information-outline" size={14} color={themeColors.text.hint} />
=======
                {jobData.temperature !== null && (
                  <>
                    <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerWeatherText, { color: themeColors.text.secondary }]}>
                      {Math.round(jobData.temperature)}°F
                    </Text>
                  </>
                )}
                {jobData.windSpeed !== null && (
                  <>
                    <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerWeatherText, { color: themeColors.text.secondary }]}>
                      {t('orders.detail.mphWind', { value: jobData.windSpeed })}
                    </Text>
                  </>
                )}
                {jobData.humidity !== null && (
                  <>
                    <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerWeatherText, { color: themeColors.text.secondary }]}>
                      {t('orders.detail.humidityRh', { value: jobData.humidity })}
                    </Text>
                  </>
                )}
                {jobData.evaporationRate !== null && jobData.evaporationRate !== undefined && (
                  <TouchableOpacity
                    onPress={handleWeatherPress}
                    activeOpacity={0.7}
                    style={[styles.headerEvapBadge, { backgroundColor: getEvaporationBgColor(jobData.evaporationRate) }]}>
                    <Text style={styles.headerEvapText}>
                      {getEvaporationText(jobData.evaporationRate)}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View
          style={styles.contentContainer}
          onLayout={(e) => {
            contentContainerOffsetY.current = e.nativeEvent.layout.y;
            maybeScrollToPerformance();
          }}>
          <View style={[styles.metricsCard, { backgroundColor: themeColors.card }, SHADOWS.md]}>

            <View style={styles.headerStatusContainer}>
              <View style={[styles.headerStatusBadge, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.headerStatusPulse, { backgroundColor: statusColor }]} />
                <Text style={[styles.headerStatusText, { color: statusColor }]}>{getStatusLabel(order.status)}</Text>
>>>>>>> Stashed changes
              </View>
            </View>
          </AnimatedPress>

<<<<<<< Updated upstream
          <StatusPipeline statuses={jobData.statusPills} isDark={isDark} />

          <ProductScheduleCard
            scheduleDate={order.scheduledDate}
            scheduleTime={order.scheduledTime}
            productType={order.productType}
            productMix={order.productMix || ''}
            plantName={jobData.plantName}
            plantCode={jobData.plantCode}
            plantPhone={jobData.plantPhone}
            statusText="In Progress"
            statusColor={colors.warning.main}
=======
            <View style={styles.metricsMainRow}>
              <View style={styles.metricItem}>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: themeColors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatQty(jobData.deliveredVolume)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: themeColors.text.secondary }]}>CY</Text>
                </View>
                <Text style={[styles.metricLabel, { color: themeColors.text.hint }]}>{t('orders.detail.delivered')}</Text>
              </View>

              <CircularProgress
                time={`${Math.round(order.progress ?? 0)}%`}
                label={t('orders.detail.poured')}
                progress={order.progress ?? 0}
                isDark={isDark}
                unitValue={formatQty(jobData.pouredVolume)}
                unit="CY"
              />

              <View style={styles.metricItem}>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: themeColors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatQty(jobData.orderedVolume)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: themeColors.text.secondary }]}>CY</Text>
                </View>
                <Text style={[styles.metricLabel, { color: themeColors.text.hint }]}>{t('orders.detail.ordered')}</Text>
              </View>
            </View>

            <View style={[styles.estimatedRow, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
              <Icon name="clock-fast" size={16} color={colors.secondary.main} />
              <Text style={[styles.estimatedText, { color: themeColors.text.secondary }]}>
                {t('orders.detail.estimatedFinish')}
              </Text>
              <Text style={[styles.estimatedTime, { color: themeColors.text.primary }]}>
                {jobData.estimatedFinish}
              </Text>
              <Icon name="information-outline" size={14} color={themeColors.text.hint} />
            </View>
          </View>

          <StatusPipeline
            statuses={jobData.statusPills}
>>>>>>> Stashed changes
            isDark={isDark}
            onCallPress={() => handleCall(jobData.plantPhone)}
          />

<<<<<<< Updated upstream
          <SmartChart
            title="Pour Speed (CY/HR)"
            data={pourSpeedChartData}
            series={[
              { key: 'delivered', color: colors.primary.main, label: 'Delivered' },
              { key: 'poured', color: colors.success.main, label: 'Poured' },
              { key: 'ordered', color: colors.warning.main, label: 'Ordered' },
            ]}
            tooltipInfo={{ ordered: '18.5 CY/HR', spacing: '60 min' }}
=======
          {orderDetails?.delivery_progress?.segments && orderDetails.delivery_progress.segments.length > 0 && (
            <DeliveryProgressBar
              segments={orderDetails.delivery_progress.segments}
              overallPercentage={orderDetails.delivery_progress.overall_percentage ?? 0}
              orderedQty={orderDetails.ordered_qty ?? 0}
              deliveredQty={orderDetails.delivered_qty ?? 0}
              totalLoads={jobData.scheduleDetails?.[0]?.number_of_loads ?? orderDetails.tickets?.length ?? 0}
              ticketsCount={orderDetails.tickets_count ?? orderDetails.tickets?.length ?? 0}
              completedLoads={orderDetails.tickets?.length ?? 0}
              isDark={isDark}
            />
          )}

          <View style={[styles.quickActionsCard, { backgroundColor: themeColors.card }, SHADOWS.sm]}>
            {orderDetails?.can_ticketed && (
              <>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={handleTicketPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.primary.main + '15' }]}>
                    <Icon name="ticket-outline" size={20} color={colors.primary.main} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>{t('orders.detail.tickets')}</Text>
                </TouchableOpacity>
                <View style={[styles.quickActionDivider, { backgroundColor: themeColors.border }]} />
              </>
            )}

            {orderDetails?.can_chat && (
              <>
                <TouchableOpacity
                  style={styles.quickActionItem}
                  onPress={handleChatPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary.main + '15' }]}>
                    <Icon name="chat-outline" size={20} color={colors.secondary.main} />
                    {chatUnreadCount > 0 && (
                      <View style={styles.chatUnreadBadge}>
                        <Text style={styles.chatUnreadBadgeText}>
                          {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>{t('orders.detail.chat')}</Text>
                </TouchableOpacity>
                <View style={[styles.quickActionDivider, { backgroundColor: themeColors.border }]} />
              </>
            )}

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={handleMapPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.success.main + '15' }]}>
                <Icon name="map-marker-outline" size={20} color={colors.success.main} />
              </View>
              <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>{t('orders.detail.map')}</Text>
            </TouchableOpacity>
          </View>


          <TouchableOpacity
            style={[styles.productDetailsCard, { backgroundColor: themeColors.card }]}
            onPress={handleProductDetailsPress}
            activeOpacity={0.7}
          >
            <View style={styles.productDetailsCardContent}>
              <View style={[styles.productDetailsIconBox, { backgroundColor: colors.primary.main }]}>
                <Icon name="clipboard-text-outline" size={ms(22)} color={colors.common.white} />
              </View>
              <View style={styles.productDetailsTextContent}>
                <Text style={[styles.productDetailsTitle, { color: themeColors.text.primary }]}>
                  {t('orders.detail.productScheduleDetails')}
                </Text>
                {jobData.scheduleDetails && jobData.scheduleDetails.length > 0 ? (
                  <View style={styles.productScheduleInfo}>
                    {jobData.scheduleDetails.map((schedule, index) => (
                      <View key={schedule.schedule_id || index} style={index > 0 ? styles.productScheduleItem : undefined}>
                        <View style={styles.productScheduleRow}>
                          <Text style={[styles.productScheduleLabel, { color: themeColors.text.secondary }]}>
                            {t('orders.detail.startTime')}
                          </Text>
                          <Text style={[styles.productScheduleValue, { color: themeColors.text.primary }]}>
                            {jobData.scheduledTime || t('common.notAvailable')}
                          </Text>
                        </View>
                        <View style={styles.productScheduleRow}>
                          <Text style={[styles.productScheduleLabel, { color: themeColors.text.secondary }]}>
                            {t('orders.detail.product')}
                          </Text>
                          <Text style={[styles.productScheduleValue, { color: themeColors.text.primary }]} numberOfLines={1}>
                            {schedule.item_code} {schedule.schedule_qty} CY
                          </Text>
                        </View>
                        {schedule.associated_products && schedule.associated_products.length > 0 && (
                          <View style={styles.associatedProductsContainer}>
                            {schedule.associated_products.map((ap: any, apIndex: number) => (
                              <View key={ap.order_product_id || apIndex} style={styles.productScheduleRow}>
                                <Text style={[styles.productScheduleLabel, { color: themeColors.text.hint }]}>
                                  {apIndex === 0 ? t('orders.detail.associated') : ''}
                                </Text>
                                <Text style={[styles.productScheduleValue, { color: themeColors.text.secondary }]} numberOfLines={1}>
                                  {ap.item_code} {ap.ordered_qty} {ap.order_qty_unit || 'ea'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.productDetailsSubtitle, { color: themeColors.text.secondary }]}>
                    {t('orders.detail.viewProductScheduleInfo')}
                  </Text>
                )}
              </View>
            </View>
            <Icon name="chevron-right" size={ms(24)} color={themeColors.text.hint} />
          </TouchableOpacity>

          <View
            onLayout={(e) => {
              performanceOffsetYInContent.current = e.nativeEvent.layout.y;
              maybeScrollToPerformance();
            }}>
            <PerformanceCharts
              graphData={orderDetails?.graphs}
              scheduledLoads={jobData.scheduledLoads || []}
              scheduledQty={jobData.orderedVolume}
              truckSpace={jobData.avgSpacing ? parseInt(jobData.avgSpacing) : 0}
              isDark={isDark}
              useHighchartsWebView={true}
              // Forward order identifiers so ODPChartWebView can fetch raw
              // ticket + schedule rows DIRECTLY from Supabase, guaranteeing
              // byte-identical input to the web's HourlyODPChart reducer.
              orderCode={orderCode}
              orderDate={orderDate}
              orderId={orderDetails?.order_id}
            />
          </View>

          <DelayDetailsTable
>>>>>>> Stashed changes
            isDark={isDark}
            showPickPoint={true}
            pickPointIndex={3}
          />
<<<<<<< Updated upstream
=======
          {orderDetails?.realtime_order_updates && orderDetails.realtime_order_updates.items.length > 0 && (() => {
            const orderCreatedItem = orderDetails.realtime_order_updates.items.find(
              (item): item is OrderCreatedItem => item.change_type === 'order_created'
            );
            const updateItems = orderDetails.realtime_order_updates.items.filter(item => item.change_type !== 'order_created');

            return (
              <View style={[styles.orderUpdatesSection, { backgroundColor: themeColors.card }]}>

                <View style={styles.orderUpdatesSectionHeader}>
                  <View style={styles.orderUpdatesTitleRow}>
                    <Icon name="history" size={ms(20)} color={colors.primary.main} />
                    <Text style={[styles.orderUpdatesSectionTitle, { color: themeColors.text.primary }]}>
                      {t('orders.detail.orderActivity')}
                    </Text>
                  </View>
                  <View style={[styles.orderUpdatesCountBadge, { backgroundColor: colors.primary.main + '15' }]}>
                    <Text style={[styles.orderUpdatesCountText, { color: colors.primary.main }]}>
                      {updateItems.length}
                    </Text>
                  </View>
                </View>


                {updateItems.length > 0 && (
                  <View style={styles.orderUpdatesTimeline}>
                    {(showAllUpdates ? updateItems : updateItems.slice(0, 1)).map((update) => (
                      <View key={update.id} style={[
                        styles.orderUpdateItem,
                        { backgroundColor: isDark ? colors.dark.cardElevated : colors.grey[5] }
                      ]}>
                        <View style={[styles.orderUpdateIconBox, { backgroundColor: colors.info.main + '15' }]}>
                          <Icon name="information-outline" size={ms(18)} color={colors.info.main} />
                        </View>
                        <View style={styles.orderUpdateContent}>
                          <Text style={[styles.orderUpdateMessage, { color: themeColors.text.primary }]}>
                            {update.change_message}
                          </Text>
                          <View style={styles.orderUpdateMeta}>
                            <Icon name="clock-outline" size={ms(12)} color={themeColors.text.hint} />
                            <Text style={[styles.orderUpdateTime, { color: themeColors.text.hint }]}>
                              {update.changed_at}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}


                {(showAllUpdates || updateItems.length === 0) && orderCreatedItem && (
                  <View style={styles.orderCreatedInCard}>
                    <View style={styles.orderCreatedHeader}>
                      <View style={styles.orderCreatedTitleRow}>
                        <View style={[styles.orderCreatedIconBox, { backgroundColor: colors.success.main + '15' }]}>
                          <Icon name="clipboard-plus-outline" size={ms(18)} color={colors.success.main} />
                        </View>
                        <Text style={[styles.orderCreatedTitle, { color: themeColors.text.primary }]}>
                          {t('orders.detail.orderCreated')}
                        </Text>
                      </View>
                      <Text style={[styles.orderCreatedTime, { color: themeColors.text.hint }]}>
                        {orderCreatedItem.created}
                      </Text>
                    </View>

                    <View style={styles.orderCreatedDetails}>
                      <View style={styles.orderCreatedRow}>
                        <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>{t('orders.detail.status')}</Text>
                        <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.order_status}</Text>
                      </View>
                      <View style={styles.orderCreatedRow}>
                        <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>{t('orders.detail.plant')}</Text>
                        <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.plant}</Text>
                      </View>
                      <View style={styles.orderCreatedRow}>
                        <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>{t('orders.detail.delivery')}</Text>
                        <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.delivery_address}</Text>
                      </View>
                      {orderCreatedItem.purchase_order && (
                        <View style={styles.orderCreatedRow}>
                          <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>{t('orders.detail.poNumber')}</Text>
                          <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.purchase_order === 'n/a' ? '-' : orderCreatedItem.purchase_order}</Text>
                        </View>
                      )}
                      {orderCreatedItem.instructions && (
                        <View style={styles.orderCreatedRow}>
                          <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>{t('orders.detail.instructions')}</Text>
                          <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.instructions === 'n/a' ? '-' : orderCreatedItem.instructions}</Text>
                        </View>
                      )}
                      {orderCreatedItem.ordered_by && (
                        <View style={styles.orderCreatedRow}>
                          <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>{t('orders.detail.orderedBy')}</Text>
                          <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]} numberOfLines={2}>{orderCreatedItem.ordered_by === 'n/a' ? '-' : orderCreatedItem.ordered_by}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}


                {(showAllUpdates || updateItems.length === 0) && orderCreatedItem && orderCreatedItem.products && orderCreatedItem.products.length > 0 && (
                  <View style={[styles.orderCreatedProducts, { borderTopColor: isDark ? themeColors.border : colors.grey[15] }]}>
                    <Text style={[styles.orderCreatedProductsTitle, { color: themeColors.text.secondary }]}>
                      {t('orders.detail.productsCount', { count: orderCreatedItem.products.length })}
                    </Text>
                    {orderCreatedItem.products.map((product, index) => (
                      <View key={index} style={[styles.orderCreatedProductItem, { backgroundColor: isDark ? colors.dark.cardElevated : colors.grey[5] }]}>
                        <View style={styles.orderCreatedProductRow}>
                          <Icon name="cube-outline" size={ms(14)} color={colors.primary.main} />
                          <Text style={[styles.orderCreatedProductCode, { color: themeColors.text.primary }]}>
                            {product.item_code}
                          </Text>
                        </View>
                        <View style={styles.orderCreatedProductRow}>
                          <Icon name="text-box-outline" size={ms(14)} color={themeColors.text.secondary} />
                          <Text style={[styles.orderCreatedProductDesc, { color: themeColors.text.secondary }]} numberOfLines={2}>
                            {product.description}
                          </Text>
                        </View>
                        <View style={styles.orderCreatedProductRow}>
                          <Icon name="scale" size={ms(14)} color={colors.primary.main} />
                          <Text style={[styles.orderCreatedProductQty, { color: colors.primary.main }]}>
                            {product.quantity}
                          </Text>
                        </View>
                        {product.slump && (
                          <View style={styles.orderCreatedProductRow}>
                            <Icon name="water" size={ms(14)} color={themeColors.text.hint} />
                            <Text style={[styles.orderCreatedProductSlump, { color: themeColors.text.hint }]}>
                              {t('orders.detail.slumpLabel', { value: product.slump })}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* See More / See Less Button - At the end */}
                {(updateItems.length > 1 || (updateItems.length > 0 && orderCreatedItem)) && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => setShowAllUpdates(!showAllUpdates)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.seeMoreText, { color: colors.primary.main }]}>
                      {showAllUpdates ? t('orders.detail.seeLess') : t('orders.detail.seeMore')}
                    </Text>
                    <Icon
                      name={showAllUpdates ? 'chevron-up' : 'chevron-down'}
                      size={ms(16)}
                      color={colors.primary.main}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          {/* Bottom spacing for tab bar */}
          <View style={{ height: ms(100) }} />
>>>>>>> Stashed changes

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
        </View>
      </ScrollView>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
<<<<<<< Updated upstream
        onRequestClose={handleMenuToggle}
      >
        <Pressable style={styles.menuOverlay} onPress={handleMenuToggle}>
          <View style={styles.menuContainer}>
            <View style={[styles.menuContent, { backgroundColor: themeColors.card }]}>
              <View style={styles.menuHeader}>
                <Text style={[styles.menuTitle, { color: themeColors.text.primary }]}>
                  Order Options
                </Text>
                <TouchableOpacity onPress={handleMenuToggle} activeOpacity={0.7}>
                  <Icon name="close" size={20} color={themeColors.text.hint} />
                </TouchableOpacity>
              </View>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? colors.grey[60] + '20' : colors.grey[10],
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: colors.primary.main + '10' }]}>
                    <Icon name={item.icon} size={18} color={colors.primary.main} />
=======
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
                        {t('orders.detail.orderOptions')}
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
>>>>>>> Stashed changes
                  </View>
                  <Text style={[styles.menuItemLabel, { color: themeColors.text.primary }]}>
                    {item.label}
                  </Text>
                  <Icon name="chevron-right" size={18} color={themeColors.text.hint} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: GRID.md,
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
    fontSize: ms(10),
    color: colors.common.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: GRID.md,
  },
  metricsCard: {
    borderRadius: RADIUS.xxl,
    padding: GRID.lg,
    marginBottom: GRID.md,
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
  // ====== PRODUCT & SCHEDULE CARD ======
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
  // Row containing psPlantNameRow + Phone Icon
  psPlantContentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', // Vertically centers phone icon with psPlantNameRow
    justifyContent: 'space-between',
    gap: GRID.md,
  },
  // Plant name container - phone icon aligns to center of this entire view
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
  // Phone call button - min 44x44 touch area via hitSlop
  psCallButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Pick Point Tooltip Styles
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

  // ====== BOTTOM TAB BAR ======
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
  // ====== MENU MODAL STYLES ======
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.modal,
    justifyContent: 'flex-end',
  },
  menuContainer: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.xl,
  },
  menuContent: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey[10],
  },
  menuTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
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
