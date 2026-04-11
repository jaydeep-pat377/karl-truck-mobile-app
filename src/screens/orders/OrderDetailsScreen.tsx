import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText, Pattern, Line, Rect } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TopGradientBackground, TruckLoader, Icon, AlertModal } from '../../components/common';
import YellowTruck from '../../assets/svgs/yellowTruck.svg';
import Isolation_Mode from '../../assets/svgs/Isolation_Mode.svg';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { Order, OrderCreatedItem } from '../../types';
import { colors } from '../../theme/colors';
import { getStatusColor, getStatusLabel } from '../../utils/statusUtils';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { WeatherIcon } from '../../utils/weatherIcon';
import { RootStackParamList, OrdersStackParamList } from '../../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { useOrderDetails, useAlert } from '../../hooks';
import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../api/services/orderService';
import { chatService } from '../../api/services/chatService';
import { useChatStore } from '../../store/chatStore';
import { PerformanceCharts } from '../../components/charts';
import { ScheduledLoadsBottomSheet, DelayDetailsTable } from '../../components/orders';

type OrderDetailsRouteProp = RouteProp<OrdersStackParamList, 'OrderDetailInTab'>;

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

const getEvaporationBgColor = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined) return colors.grey[40];
  if (rate < 0.10) return colors.success.main;
  if (rate < 0.20) return colors.warning.main;
  if (rate < 0.30) return colors.unloadingRate.light;
  if (rate < 0.40) return colors.unloadingRate.medium;
  return colors.unloadingRate.dark;
};

const getEvaporationText = (rate: number | null | undefined): string => {
  if (rate === null || rate === undefined) return '';
  if (rate < 0.10) return 'Low';
  if (rate < 0.20) return 'Moderate';
  if (rate < 0.30) return 'High';
  if (rate < 0.40) return 'Very High';
  return 'Severe';
};

const formatQty = (num: number): string => {
  if (num === null || num === undefined) return '0';

  return parseFloat(num.toFixed(2)).toString();
};

const getSegmentColor = (status: string): string => {
  const statusColorMap: Record<string, string> = {
    pending: colors.trackingStatus.pending,
    ticketed: colors.trackingStatus.ticketed,
    loading: colors.trackingStatus.loading,
    loaded: colors.trackingStatus.loaded,
    to_job: colors.trackingStatus.toJob,
    at_job: colors.trackingStatus.atJob,
    on_job: colors.trackingStatus.atJob,
    pouring: colors.trackingStatus.pouring,
    poured: colors.trackingStatus.poured,
    washing: colors.trackingStatus.washing,
    to_plant: colors.trackingStatus.toPlant,
    at_plant: colors.trackingStatus.atPlant,
    cancelled: colors.trackingStatus.cancelled,
    voided: colors.trackingStatus.voided,
    remaining: colors.trackingStatus.remaining,
  };

  return statusColorMap[status.toLowerCase()] || colors.grey[40];
};

const getStatusDisplayLabel = (status: string | undefined): string => {
  if (!status) return '';
  const labelMap: Record<string, string> = {
    pending: 'Pending',
    ticketed: 'Ticketed',
    loading: 'Loading',
    loaded: 'Loaded',
    to_job: 'To Job',
    at_job: 'At Job',
    on_job: 'On Job',
    pouring: 'Pouring',
    poured: 'Poured',
    washing: 'Washing',
    to_plant: 'To Plant',
    at_plant: 'At Plant',
    cancelled: 'Cancelled',
    voided: 'Voided',
    remaining: 'Remaining',
  };
  return labelMap[status.toLowerCase()] || status;
};

const ALLOWED_PROGRESS_STATUSES = ['loading', 'to_job', 'at_job', 'pouring', 'remaining'];

const FALLBACK_SEGMENT_COLOR = '#6b7280';

// Same 5-segment progress bar as OrderCard / web
const PROGRESS_STATUSES = [
  { key: 'loading', colorKey: 'loading', label: 'Loading' },
  { key: 'to_job', colorKey: 'to_job', label: 'To Job' },
  { key: 'at_job', colorKey: 'at_job', label: 'At Job' },
  { key: 'pouring', colorKey: 'pouring', label: 'Pouring' },
  { key: 'at_plant', colorKey: 'poured', label: 'Poured' },
];

const SegmentStripes: React.FC<{ color: string; patternId: string }> = React.memo(({ color, patternId }) => (
  <Svg style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id={patternId} patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)">
        <Line x1={0} y1={0} x2={0} y2={4} stroke={color} strokeWidth={1.5} strokeOpacity={0.35} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
  </Svg>
));

const computeCumulativeFills = (
  segments: any[],
  totalLoads: number | null | undefined,
  totalTickets: number,
): { fills: number[]; atPlantQty: number } => {
  const ticketCountByStatus: Record<string, number> = {};
  let hasTicketCounts = false;
  for (const { key } of PROGRESS_STATUSES) {
    const seg = (segments || []).find((s: any) => s.status === key);
    const tc = seg?.ticketCount ?? 0;
    ticketCountByStatus[key] = tc;
    if (tc > 0) hasTicketCounts = true;
  }

  let fills: number[];

  if (hasTicketCounts) {
    const cumulativeByStatus: Record<string, number> = {};
    for (let i = 0; i < PROGRESS_STATUSES.length; i++) {
      let sum = 0;
      for (let j = i; j < PROGRESS_STATUSES.length; j++) {
        sum += ticketCountByStatus[PROGRESS_STATUSES[j].key];
      }
      cumulativeByStatus[PROGRESS_STATUSES[i].key] = sum;
    }
    const total = totalLoads ?? totalTickets ?? cumulativeByStatus['loading'] ?? 0;
    fills = PROGRESS_STATUSES.map(({ key }) => {
      const cumulative = cumulativeByStatus[key];
      return total > 0 ? Math.round((cumulative / total) * 100) : 0;
    });
  } else {
    const percentByStatus: Record<string, number> = {};
    for (const { key } of PROGRESS_STATUSES) {
      const seg = (segments || []).find((s: any) => s.status === key);
      percentByStatus[key] = seg?.percentage ?? 0;
    }
    fills = PROGRESS_STATUSES.map((_status, i) => {
      let sum = 0;
      for (let j = i; j < PROGRESS_STATUSES.length; j++) {
        sum += percentByStatus[PROGRESS_STATUSES[j].key];
      }
      return Math.min(Math.round(sum), 100);
    });
  }

  const atPlantSeg = (segments || []).find((s: any) => s.status === 'at_plant');
  const atPlantQty = atPlantSeg?.qty ?? 0;
  return { fills, atPlantQty };
};

const getCompletionColor = (percent: number): string => {
  if (percent >= 90) return '#458B00';
  if (percent >= 60) return '#F7BB00';
  return '#C43926';
};

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
  displayDate: '07 Nov 2025',
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
    { productId: '1', itemCode: '552B301', description: '4000 PSI BLD NBS', isMix: true, orderedQty: 10.50, deliveredQty: 10.50, remainingQty: 0, slump: '4.00 IN', qr: '4000' },
    { productId: '2', itemCode: '668B301', description: '4000 PSI BLD NBS', isMix: false, orderedQty: 10.50, deliveredQty: 5.25, remainingQty: 5.25, slump: '4.00 IN', qr: '4000' },
  ],
  displayDate: '07 Nov 2025',
  estimatedFinishTime: '04:30PM',
  scheduleRate: 8,
  avgWaitingMinutes: 15,
  avgPouringMinutes: 45,
  avgWashoutMinutes: 10,
  scheduleDetails: [] as Array<any>,
  scheduledLoads: [] as Array<any>,
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
  unit?: string;
  unitValue?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  time,
  label,
  progress,
  size = ms(120),
  isDark,
  unit,
  unitValue,
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
          {(unitValue || unit) && (
            <Text style={[styles.progressUnit, { color: themeColors.text.hint }]}>
              {unitValue && <Text style={{ fontFamily: fontFamily.bold }}>{unitValue} </Text>}
              {unit}
            </Text>
          )}
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
  segmentColors?: Array<string | null>;
}

const STATUS_PIPELINE_KEYS = ['loading', 'to_job', 'at_job', 'pouring'];

const StatusPipeline: React.FC<StatusPipelineProps> = ({ statuses, isDark, segmentColors }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const activeIndex = statuses.findIndex(s => s.active);

  const fallbackColors = [
    colors.trackingStatus.loading,
    colors.trackingStatus.toJob,
    colors.trackingStatus.atJob,
    colors.trackingStatus.pouring,
  ];

  const getIndicatorColor = (index: number) => {
    return segmentColors?.[index] || fallbackColors[index] || colors.grey[40];
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
            Delivery Status
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
          {completionPercent}% Completed
        </Text>
      </View>
    </View>
  );
};

interface ProductScheduleCardProps {
  scheduleDate: string;
  scheduleTime: string;
  displayDate?: string;
  estimatedFinish?: string;
  productType: string;
  productMix: string;
  plantName: string;
  plantCode: string;
  plantPhone: string;
  statusText: string;
  statusColor: string;
  isDark: boolean;
  onCallPress: () => void;

  scheduleRate?: number;
  deliveredQty?: number;
  pouredQty?: number;
  avgWaitingMinutes?: number;
  avgPouringMinutes?: number;
  avgWashoutMinutes?: number;
}

const ProductScheduleCard: React.FC<ProductScheduleCardProps> = ({
  scheduleDate,
  scheduleTime,
  displayDate,
  estimatedFinish,
  productType,
  productMix,
  statusText,
  statusColor,
  isDark,
  onCallPress,
  scheduleRate,
  deliveredQty,
  pouredQty,
  avgWaitingMinutes,
  avgPouringMinutes,
  avgWashoutMinutes,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  const formattedDate = displayDate || formatDateOnly(scheduleDate);

  const scheduleDisplay = estimatedFinish
    ? `${scheduleTime || 'N/A'} - ${estimatedFinish}`
    : scheduleTime || 'N/A';

  const hasAverages = (avgWaitingMinutes ?? 0) > 0 || (avgPouringMinutes ?? 0) > 0 || (avgWashoutMinutes ?? 0) > 0;

  const hasPourData = (deliveredQty ?? 0) > 0 || (pouredQty ?? 0) > 0;

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
          <Text style={[styles.psInfoItemValue, { color: themeColors.text.primary }]} numberOfLines={1}>
            {scheduleDisplay}
          </Text>
          <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.secondary }]}>
            {formattedDate}
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

      {hasPourData && (
        <View style={[styles.psInfoGrid, { marginTop: GRID.xs }]}>
          <View style={[styles.psInfoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
            <View style={styles.psInfoItemHeader}>
              <Icon name="truck-delivery" size={14} color={colors.success.main} />
              <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>Delivered</Text>
            </View>
            <Text style={[styles.psInfoItemValue, { color: colors.success.main }]}>
              {(deliveredQty ?? 0).toFixed(1)} CY
            </Text>
            {scheduleRate ? (
              <Text style={[styles.psInfoItemSubValue, { color: themeColors.text.hint }]}>
                Rate: {scheduleRate} CY/hr
              </Text>
            ) : null}
          </View>

          <View style={[styles.psInfoItem, { backgroundColor: isDark ? themeColors.surface : colors.grey[3] }]}>
            <View style={styles.psInfoItemHeader}>
              <Icon name="water" size={14} color={colors.info.main} />
              <Text style={[styles.psInfoItemLabel, { color: themeColors.text.hint }]}>Poured</Text>
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
            <Text style={[styles.psAverageLabel, { color: themeColors.text.hint }]}>Wait</Text>
            <Text style={[styles.psAverageValue, { color: themeColors.text.primary }]}>
              {(avgWaitingMinutes ?? 0).toFixed(0)}m
            </Text>
          </View>
          <View style={[styles.psAverageDivider, { backgroundColor: themeColors.border }]} />
          <View style={styles.psAverageItem}>
            <Icon name="water" size={12} color={colors.success.main} />
            <Text style={[styles.psAverageLabel, { color: themeColors.text.hint }]}>Pour</Text>
            <Text style={[styles.psAverageValue, { color: themeColors.text.primary }]}>
              {(avgPouringMinutes ?? 0).toFixed(0)}m
            </Text>
          </View>
          <View style={[styles.psAverageDivider, { backgroundColor: themeColors.border }]} />
          <View style={styles.psAverageItem}>
            <Icon name="shower" size={12} color={colors.info.main} />
            <Text style={[styles.psAverageLabel, { color: themeColors.text.hint }]}>Wash</Text>
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
  const themeColors = isDark ? colors.dark : colors.light;

  if (!products || products.length === 0) {
    return null;
  }

  const product = products[0];
  const schedule = scheduleDetails?.[0];

  return (
    <View style={styles.skuSection}>
      <Text style={[styles.skuSectionTitle, { color: themeColors.text.primary }]}>
        Product & Schedule
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
                {product.description || 'Concrete Mix'}
              </Text>
            </View>
          </View>
          <View style={[
            styles.skuTypeBadge,
            { backgroundColor: product.isMix ? colors.success.main : colors.info.main }
          ]}>
            <Icon name={product.isMix ? 'water' : 'package-variant'} size={ms(12)} color={colors.common.white} />
            <Text style={styles.skuTypeBadgeText}>
              {product.isMix ? 'Mix' : 'Product'}
            </Text>
          </View>
        </View>


        {schedule && (
          <View style={[styles.skuScheduleSection, { borderTopColor: isDark ? themeColors.border : colors.grey[10] }]}>
            <Text style={[styles.skuScheduleTitle, { color: themeColors.text.primary }]}>
              Schedule Information
            </Text>


            {schedule.start_time && (
              <View style={styles.skuScheduleRow}>
                <View style={[styles.skuScheduleItemWide, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                  <Icon name="clock-start" size={ms(18)} color={colors.primary.main} />
                  <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                    {schedule.start_time}
                  </Text>
                  <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Start Time</Text>
                </View>
              </View>
            )}


            <View style={styles.skuScheduleRow}>
              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="layers-triple" size={ms(18)} color={colors.secondary.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.number_of_loads ?? '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Loads</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="weight" size={ms(18)} color={colors.success.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.load_qty ? `${schedule.load_qty}` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Load CY</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="speedometer" size={ms(18)} color={colors.primary.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.delivery_rate_per_hour ?? '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>CY/Hr</Text>
              </View>
            </View>


            <View style={styles.skuScheduleRow}>
              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="clock-outline" size={ms(18)} color={colors.info.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.truck_space ? `${schedule.truck_space}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Spacing</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="map-marker-distance" size={ms(18)} color={colors.error.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.distance ? `${schedule.distance}` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Miles</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="truck-fast" size={ms(18)} color={colors.success.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.time_to_job ? `${schedule.time_to_job}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>To Job</Text>
              </View>
            </View>


            <View style={styles.skuScheduleRow}>
              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="download" size={ms(18)} color={colors.secondary.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.unload_time ? `${schedule.unload_time}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Unload</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="water" size={ms(18)} color={colors.info.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.job_wash_time ? `${schedule.job_wash_time}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>Wash</Text>
              </View>

              <View style={[styles.skuScheduleItem, { backgroundColor: isDark ? themeColors.cardElevated : colors.grey[3] }]}>
                <Icon name="truck-delivery" size={ms(18)} color={colors.warning.main} />
                <Text style={[styles.skuScheduleItemValue, { color: themeColors.text.primary }]}>
                  {schedule.time_to_plant ? `${schedule.time_to_plant}m` : '-'}
                </Text>
                <Text style={[styles.skuScheduleItemLabel, { color: themeColors.text.secondary }]}>To Plant</Text>
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
                    Scheduled Loads
                  </Text>
                  <Text style={[styles.skuLoadsSubtitle, { color: themeColors.text.secondary }]}>
                    {scheduledLoads.filter(l => !!l.actual_time).length} of {scheduledLoads.length} completed
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

            const maxLabels = 5;
            const totalPoints = data.length;

            if (totalPoints <= maxLabels) {

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

export const OrderDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<OrderDetailsRouteProp>();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, hideAlert, showError, showInfo } = useAlert();
  const [showLoadsSheet, setShowLoadsSheet] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Scroll-to-performance (deep link support)
  // When the screen is opened via a deep link with tab=performance, we scroll
  // the ScrollView to the PerformanceCharts section. We need two Y offsets:
  //   - contentContainerY: the Y of <View style={styles.contentContainer}> within the ScrollView
  //   - performanceY: the Y of <PerformanceCharts> wrapper within contentContainer
  // Total scroll target = contentContainerY + performanceY - 20 (small buffer).
  const scrollViewRef = useRef<any>(null);
  const contentContainerOffsetY = useRef(0);
  const performanceOffsetYInContent = useRef(0);
  const hasScrolledToPerformance = useRef(false);

  const maybeScrollToPerformance = useCallback(() => {
    if (
      route.params?.initialSection === 'performance' &&
      !hasScrolledToPerformance.current &&
      scrollViewRef.current &&
      contentContainerOffsetY.current > 0 &&
      performanceOffsetYInContent.current > 0
    ) {
      hasScrolledToPerformance.current = true;
      const targetY = Math.max(
        0,
        contentContainerOffsetY.current + performanceOffsetYInContent.current - 20,
      );
      // Defer slightly so that the layout is fully settled (charts often
      // mount after an async data load).
      setTimeout(() => {
        scrollViewRef.current?.scrollTo?.({ y: targetY, animated: true });
      }, 150);
    }
  }, [route.params]);


  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const { orderId, orderCode, orderDate, status: passedStatus, progressColor } = route.params;
  const { unreadCounts, markRoomAsRead } = useChatStore();
  const [apiUnreadCount, setApiUnreadCount] = useState(0);

  useEffect(() => {
    if (orderId) {
      chatService.getUnreadCounts([orderId]).then(result => {
        const count = result.counts?.[orderId] || 0;
        setApiUnreadCount(count);
      });
    }
  }, [orderId]);

  const chatUnreadCount = (apiUnreadCount + (unreadCounts[orderId] || 0));

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


    const progress = orderDetails.poured_percentage ?? (
      (orderDetails.ordered_qty ?? 0) > 0
        ? Math.round(((orderDetails.delivered_qty ?? 0) / (orderDetails.ordered_qty ?? 1)) * 100)
        : 0
    );

    return {
      id: orderDetails.order_id,
      orderCode: orderDetails.order_code,
      customerName: orderDetails.customer_name,
      projectName: orderDetails.project_name,
      deliveryAddress: orderDetails.delivery_address,
      scheduledDate: orderDetails.order_date,
      scheduledTime: orderDetails.start_time,
      status: orderDetails.status as Order['status'],
      productType: orderDetails.products?.[0]?.item_code || 'N/A',
      productMix: orderDetails.products?.length > 0
        ? `${formatQty(orderDetails.ticket_delivered_qty ?? orderDetails.delivered_qty ?? 0)}/${formatQty(orderDetails.ordered_qty ?? 0)} CY`
        : '',
      quantity: orderDetails.ordered_qty,
      unit: 'CY',
      deliveredQuantity: orderDetails.ticket_delivered_qty ?? orderDetails.delivered_qty,
      remainingQuantity: orderDetails.remaining_qty,
      totalLoads: orderDetails.tickets?.length || 0,
      completedLoads: orderDetails.tickets?.length || 0,
      progress,
      estimatedFinishTime: orderDetails.estimated_finish_time,
      displayDate: orderDetails.display_date,
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


    const pouredPercentage = orderDetails.poured_percentage ?? (
      (orderDetails.ordered_qty ?? 0) > 0
        ? Math.round(((orderDetails.delivered_qty ?? 0) / (orderDetails.ordered_qty ?? 1)) * 100)
        : 0
    );

    return {
      elapsedTime: `${pouredPercentage}%`,
      deliveredVolume: orderDetails.ticket_delivered_qty ?? orderDetails.delivered_qty ?? 0,
      pouredVolume: orderDetails.ticket_poured_qty ?? orderDetails.delivered_qty ?? 0,
      orderedVolume: orderDetails.ordered_qty ?? 0,
      remainingVolume: orderDetails.remaining_qty ?? 0,
      estimatedFinish: orderDetails.estimated_finish_time || 'N/A',
      hasWeatherData: !!orderDetails.weather_data,
      temperature: orderDetails.weather_data?.temperature_fahrenheit ?? null,
      windSpeed: orderDetails.weather_data?.wind_speed_mph || null,
      humidity: orderDetails.weather_data?.humidity || null,
      weatherDescription: orderDetails.weather_data?.weather_description || 'Partly cloudy',
      weatherIcon: orderDetails.weather_data?.weather_icon || null,
      evaporationRate: orderDetails.weather_data?.evaporation_rate ?? (orderDetails as any).weather?.evaporationRate ?? null,
      siteName: orderDetails.customer_name,
      plantName: orderDetails.plant_details?.description || orderDetails.products?.[0]?.plant_code || 'N/A',
      plantCode: orderDetails.plant_details?.code || orderDetails.products?.[0]?.plant_code || '',
      plantPhone: orderDetails.plant_details?.phone || '',
      plantAddress1: orderDetails.plant_details?.address1 || '',
      plantAddress2: orderDetails.plant_details?.address2 || '',
      truckCount: orderDetails.truck_count ?? 0,
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

      pourSpeedRaw: {
        ordered: orderDetails.graphs?.pour_speed?.ordered || [],
        delivered: orderDetails.graphs?.pour_speed?.delivered || [],
        poured: orderDetails.graphs?.pour_speed?.poured || [],
        scheduleRate: orderDetails.graphs?.pour_speed?.schedule_rate || 30,
        yMax: orderDetails.graphs?.pour_speed?.y_max || 50,
        hasData: !!(
          orderDetails.graphs?.pour_speed?.ordered?.length ||
          orderDetails.graphs?.pour_speed?.delivered?.length ||
          orderDetails.graphs?.pour_speed?.poured?.length
        ),
      },

      pourSpeedData: mockJobData.pourSpeedData,

      trucksOnJobRaw: {
        timePoints: orderDetails.graphs?.trucks_on_job?.time_points || [],
        averages: orderDetails.graphs?.trucks_on_job?.averages || {
          avg_waiting_minutes: 0,
          avg_pouring_minutes: 0,
          avg_washout_minutes: 0,
        },
        hasData: !!(orderDetails.graphs?.trucks_on_job?.time_points?.length),
      },

      trucksOnJobData: mockJobData.trucksOnJobData,
      avgSpacing: '45 min',
      products: orderDetails.products?.map(p => ({
        productId: p.product_id || p.order_product_id,
        itemCode: p.item_code || '',
        description: p.description || '',
        isMix: p.is_mix ?? true,
        orderedQty: p.ordered_qty ?? 0,
        deliveredQty: p.delivered_qty ?? 0,
        remainingQty: (p.ordered_qty ?? 0) - (p.delivered_qty ?? 0),
        slump: p.slump || '',
        qr: p.qr || '',
      })) || [],

      displayDate: orderDetails.display_date || '',
      estimatedFinishTime: orderDetails.estimated_finish_time || '',
      scheduledTime: orderDetails.start_time || '',
      scheduleRate: orderDetails.graphs?.pour_speed?.schedule_rate || 0,
      avgWaitingMinutes: orderDetails.graphs?.trucks_on_job?.averages?.avg_waiting_minutes || 0,
      avgPouringMinutes: orderDetails.graphs?.trucks_on_job?.averages?.avg_pouring_minutes || 0,
      avgWashoutMinutes: orderDetails.graphs?.trucks_on_job?.averages?.avg_washout_minutes || 0,


      scheduleDetails: (orderDetails as any).product_schedule_details?.map((s: any) => ({
        schedule_id: s.schedule_id,
        item_code: s.item_code,
        description: s.description,
        is_mix: s.is_mix,
        slump: s.slump,
        plant_code: s.plant_code,
        plant_description: s.plant_description,
        schedule_qty: s.schedule_qty,
        schedule_delv_qty: s.schedule_delv_qty,
        number_of_loads: s.number_of_loads,
        trucks_required: s.trucks_required,
        load_qty: s.load_qty,
        truck_space: s.truck_space,
        delivery_rate_per_hour: s.delivery_rate_per_hour,
        unload_time: s.unload_time,
        unload_rate_per_hour: s.unload_rate_per_hour,
        distance: s.distance,
        time_to_job: s.time_to_job,
        time_to_plant: s.time_to_plant,
        job_wash_time: s.job_wash_time,
        truck_type_name: s.truck_type_name,
        start_time: s.start_time,
        associated_products: s.associated_products?.map((ap: any) => ({
          order_product_id: ap.order_product_id,
          product_id: ap.product_id,
          item_code: ap.item_code,
          description: ap.description,
          is_mix: ap.is_mix,
          ordered_qty: ap.ordered_qty,
          delivered_qty: ap.delivered_qty,
          order_qty_unit: ap.order_qty_unit,
        })) || [],
      })) || [],


      scheduledLoads: (orderDetails as any).scheduled_loads?.items?.map((l: any) => ({
        load_number: l.load_number,
        scheduled_time: l.scheduled_time,
        actual_time: l.actual_time,
        scheduled_qty: l.scheduled_qty,
        actual_qty: l.actual_qty,
        scheduled_qty_raw: l.scheduled_qty_raw,
        actual_qty_raw: l.actual_qty_raw,
        load_qty: l.load_qty,
        variance: l.variance,
        truck_code: l.truck_code,
        scheduled_on_job_time: l.scheduled_on_job_time,
        scheduled_fin_pour_time: l.scheduled_fin_pour_time,
        scheduled_at_plant_time: l.scheduled_at_plant_time,
        ticket_code: l.ticket_code,
        ticket_id: l.ticket_id,
        ticket_remove_reason_code: l.ticket_remove_reason_code,
        actual_on_job_time: l.actual_on_job_time,
        actual_unload_time: l.actual_unload_time,
        actual_begin_pour_time: l.actual_begin_pour_time,
        actual_end_pour_time: l.actual_end_pour_time,
        actual_wash_time: l.actual_wash_time,
        actual_at_plant_time: l.actual_at_plant_time,
        actual_to_plant_time: l.actual_to_plant_time,
      })) || [],
    };
  }, [orderDetails]);

  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { user, appPermissions, fetchAppPermissions } = useAuthStore();
  const canOrderRequest = appPermissions.includes('order_request');
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  useEffect(() => {
    if (orderDetails?.is_favourite !== undefined) {
      setIsFavorite(orderDetails.is_favourite);
    }
  }, [orderDetails?.is_favourite]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppPermissions();
    refetch().finally(() => setRefreshing(false));
  }, [refetch, fetchAppPermissions]);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const statusColor = useMemo(() => {

    if (progressColor) {
      return progressColor;
    }

    const status = passedStatus || order.status;
    const progress = order.progress || 0;
    const color = getStatusColor(status, progress);
    return color;
  }, [progressColor, passedStatus, order.status, order.progress]);

  const handleMenuToggle = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

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
        showError('Error', 'Failed to update favorite status');
      });
  }, [order.id, isFavorite, showError, queryClient]);

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

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Order Details\n\nOrder: ${order.orderCode}\nCustomer: ${order.customerName}\nStatus: ${order.status}\nProduct: ${order.productType}\nQuantity: ${order.quantity} ${order.unit}\nDelivery: ${order.deliveryAddress}`,
        title: `Order ${order.orderCode}`,
      });
    } catch (error) {
      showError('Error', 'Failed to share order details');
    }
  }, [order, showError]);

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
  ];

  const formatScheduleDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return `${timeStr} • ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  const pourSpeedChartData = useMemo(() => jobData.pourSpeedData, [jobData.pourSpeedData]);
  const trucksChartData = useMemo(() => jobData.trucksOnJobData, [jobData.trucksOnJobData]);

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

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            styles.fixedHeaderBackground,
            {
              opacity: headerBackgroundOpacity
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['#3A3A3A', '#2A2A2A', '#1E1E1E'] : ['#FFFFFF', '#F8F8F8', '#F0F0F0']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack} activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={themeColors.text.primary} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={handleToggleFavorite}>
              <Icon
                name={isFavorite ? 'star' : 'star-outline'}
                size={18}
                color={isFavorite ? colors.warning.main : themeColors.text.primary}
              />
            </TouchableOpacity>
            {canOrderRequest && (
              <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={handleOrderRequest}>
                <Icon name="file-plus-outline" size={18} color={themeColors.text.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={() => refetch()}>
              <Icon name="refresh" size={18} color={themeColors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7} onPress={handleShare}>
              <Icon name="share-variant" size={18} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + ms(56) }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.common.white}
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerSafeArea}>
            <Text style={[styles.headerSiteName, { color: isDark ? colors.common.white : colors.grey[80] }]}>{jobData.siteName}</Text>

            {order.projectName && (
              <View style={styles.headerProjectRow}>
                <Icon name="office-building" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
                <Text style={[styles.headerProjectName, { color: isDark ? colors.common.white : colors.grey[80] }]} numberOfLines={1}>
                  {order.projectName}
                </Text>
              </View>
            )}

            <View style={styles.headerChipsRow}>
              <View style={[styles.headerChip, { backgroundColor: isDark ? colors.common.white + '20' : colors.common.black + '15' }]}>
                <Icon name="file-document-outline" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
                <Text style={[styles.headerChipText, { color: isDark ? colors.common.white : colors.grey[80] }]}>{order.orderCode}{order.displayDate ? ` | ${order.displayDate}` : ''}{order.scheduledTime ? ` | ${order.scheduledTime}` : ''}</Text>
              </View>
            </View>

            <View style={styles.headerAddressRow}>
              <Icon name="map-marker-outline" size={12} color={isDark ? colors.common.white : colors.grey[80]} />
              <Text style={[styles.headerAddress, { color: isDark ? colors.common.white : colors.grey[80] }]} numberOfLines={1}>
                {order.deliveryAddress}
              </Text>
            </View>


            {jobData.hasWeatherData && (
              <TouchableOpacity
                style={styles.headerWeatherRow}
                onPress={handleWeatherPress}
                activeOpacity={0.7}>
                <WeatherIcon icon={jobData.weatherIcon} size={22} />
                <Text
                  numberOfLines={1}
                  style={[styles.headerWeatherText, { color: themeColors.text.secondary }]}>
                  {jobData.weatherDescription}
                </Text>
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
                      {jobData.windSpeed} mph wind
                    </Text>
                  </>
                )}
                {jobData.humidity !== null && (
                  <>
                    <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerWeatherText, { color: themeColors.text.secondary }]}>
                      {jobData.humidity}% RH
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
              </View>
            </View>

            <View style={styles.metricsMainRow}>
              <View style={styles.metricItem}>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: themeColors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatQty(jobData.deliveredVolume)}
                  </Text>
                  <Text style={[styles.metricUnit, { color: themeColors.text.secondary }]}>CY</Text>
                </View>
                <Text style={[styles.metricLabel, { color: themeColors.text.hint }]}>Delivered</Text>
              </View>

              <CircularProgress
                time={`${Math.round(order.progress ?? 0)}%`}
                label="Poured"
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

          <StatusPipeline
            statuses={jobData.statusPills}
            isDark={isDark}
            segmentColors={STATUS_PIPELINE_KEYS.map(key => {
              const seg = (orderDetails?.delivery_progress?.segments || []).find((s: any) => s.status === key);
              return seg?.color || null;
            })}
          />

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
                  <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>Tickets</Text>
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
                  <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>Chat</Text>
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
              <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>Map</Text>
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
                  Product & Schedule Details
                </Text>
                {jobData.scheduleDetails && jobData.scheduleDetails.length > 0 ? (
                  <View style={styles.productScheduleInfo}>
                    {jobData.scheduleDetails.map((schedule, index) => (
                      <View key={schedule.schedule_id || index} style={index > 0 ? styles.productScheduleItem : undefined}>
                        <View style={styles.productScheduleRow}>
                          <Text style={[styles.productScheduleLabel, { color: themeColors.text.secondary }]}>
                            Start Time
                          </Text>
                          <Text style={[styles.productScheduleValue, { color: themeColors.text.primary }]}>
                            {jobData.scheduledTime || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.productScheduleRow}>
                          <Text style={[styles.productScheduleLabel, { color: themeColors.text.secondary }]}>
                            Product
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
                                  {apIndex === 0 ? 'Associated' : ''}
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
                    View product & schedule information
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
            isDark={isDark}
            data={orderDetails?.delay_details}
            onTicketPress={(ticketCode) => { }}
          />
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
                      Order Activity
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
                          Order Created
                        </Text>
                      </View>
                      <Text style={[styles.orderCreatedTime, { color: themeColors.text.hint }]}>
                        {orderCreatedItem.created}
                      </Text>
                    </View>

                    <View style={styles.orderCreatedDetails}>
                      <View style={styles.orderCreatedRow}>
                        <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>Status</Text>
                        <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.order_status}</Text>
                      </View>
                      <View style={styles.orderCreatedRow}>
                        <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>Plant</Text>
                        <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.plant}</Text>
                      </View>
                      <View style={styles.orderCreatedRow}>
                        <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>Delivery</Text>
                        <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.delivery_address}</Text>
                      </View>
                      {orderCreatedItem.purchase_order && (
                        <View style={styles.orderCreatedRow}>
                          <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>PO#</Text>
                          <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.purchase_order === 'n/a' ? '-' : orderCreatedItem.purchase_order}</Text>
                        </View>
                      )}
                      {orderCreatedItem.instructions && (
                        <View style={styles.orderCreatedRow}>
                          <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>Instructions</Text>
                          <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]}>{orderCreatedItem.instructions === 'n/a' ? '-' : orderCreatedItem.instructions}</Text>
                        </View>
                      )}
                      {orderCreatedItem.ordered_by && (
                        <View style={styles.orderCreatedRow}>
                          <Text style={[styles.orderCreatedLabel, { color: themeColors.text.hint }]}>Ordered By</Text>
                          <Text style={[styles.orderCreatedValue, { color: themeColors.text.primary }]} numberOfLines={2}>{orderCreatedItem.ordered_by === 'n/a' ? '-' : orderCreatedItem.ordered_by}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}


                {(showAllUpdates || updateItems.length === 0) && orderCreatedItem && orderCreatedItem.products && orderCreatedItem.products.length > 0 && (
                  <View style={[styles.orderCreatedProducts, { borderTopColor: isDark ? themeColors.border : colors.grey[15] }]}>
                    <Text style={[styles.orderCreatedProductsTitle, { color: themeColors.text.secondary }]}>
                      Products ({orderCreatedItem.products.length})
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
                              Slump: {product.slump}"
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
                      {showAllUpdates ? 'See Less' : 'See More'}
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

        </View>
      </Animated.ScrollView>

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

      <ScheduledLoadsBottomSheet
        visible={showLoadsSheet}
        onClose={() => setShowLoadsSheet(false)}
        loads={jobData.scheduledLoads}
        totalLoads={jobData.scheduleDetails?.[0]?.number_of_loads}
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
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.sm,
  },
  fixedHeaderBackground: {
    ...StyleSheet.absoluteFillObject,
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
  headerProjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.xs,
    marginTop: GRID.xs,
  },
  headerProjectName: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    color: colors.common.white,
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
    justifyContent: 'center',
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.xs + 2,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  headerChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
    color: colors.common.white,
    textAlign: 'center',
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
  headerWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GRID.xs,
    marginBottom: -GRID.lg,
    gap: ms(4),
    flexWrap: 'wrap',
  },
  weatherEmoji: {
    fontSize: ms(16),
  },
  headerWeatherText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  headerWeatherDot: {
    width: ms(3),
    height: ms(3),
    borderRadius: ms(1.5),
  },
  headerEvapBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(10),
    marginLeft: ms(4),
  },
  headerEvapText: {
    fontSize: ms(8),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    lineHeight: ms(13),
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
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: ms(2),
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
    textAlign: 'center',
  },
  progressLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginTop: 2,
    textAlign: 'center',
  },
  progressUnit: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    textAlign: 'center',
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
  // Delivery Status Bar Styles
  deliveryProgressCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
  },
  deliveryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  deliveryProgressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
  },
  deliveryProgressTitle: {
    fontSize: ms(13),
    fontFamily: fontFamily.semiBold,
  },
  deliveryProgressPercent: {
    fontSize: ms(14),
    fontFamily: fontFamily.bold,
  },
  deliveryProgressBarBg: {
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  deliveryProgressSegments: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  deliveryProgressSegment: {
    height: '100%',
  },
  deliveryProgressLabelsRow: {
    flexDirection: 'row',
    marginBottom: ms(4),
  },
  deliveryProgressLabelContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: ms(2),
  },
  deliveryProgressLabelText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  deliveryProgressValuesRow: {
    flexDirection: 'row',
    marginTop: ms(4),
  },
  deliveryProgressValueContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: ms(2),
  },
  deliveryProgressValueText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  deliveryProgressLegendContainer: {
    overflow: 'hidden',
  },
  deliveryProgressLegend: {
    flexDirection: 'column',
    marginTop: GRID.sm,
    gap: GRID.xs,
  },
  deliveryProgressLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
  },
  deliveryProgressLegendDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  deliveryProgressLegendText: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
  },
  // Segmented progress bar (same as OrderCard)
  deliveryProgressSegmentedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  deliverySegmentBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(6),
    flexGrow: 1,
    flexShrink: 1,
  },
  deliverySegmentBarWrapper: {
    flex: 1,
    height: '100%',
  },
  deliverySegmentTrack: {
    flex: 1,
    height: '100%',
    borderRadius: ms(2),
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  deliverySegmentFillOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: ms(2),
  },
  deliverySegmentDividerDotted: {
    width: 0,
    height: ms(12),
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.4,
  },
  deliveryCyValueText: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
    flexShrink: 0,
    flexGrow: 0,
  },
  deliveryCompletionRow: {
    alignItems: 'flex-end',
    marginTop: ms(2),
  },
  deliveryCompletionText: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
  },
  deliveryLoadsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginTop: ms(2),
  },
  deliveryLoadsCountText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  deliveryTooltipBackdrop: {
    flex: 1,
  },
  deliveryTooltipContainer: {
    position: 'absolute',
    left: ms(12),
    borderRadius: ms(6),
    paddingVertical: ms(4),
    paddingHorizontal: ms(8),
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  deliveryTooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(1.5),
  },
  deliveryTooltipDot: {
    width: ms(7),
    height: ms(7),
    borderRadius: ms(3.5),
    marginRight: ms(6),
  },
  deliveryTooltipLabel: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
  },
  deliveryTooltipText: {
    fontSize: ms(12),
    fontFamily: fontFamily.medium,
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
  psAveragesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.md,
  },
  psAverageItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  psAverageLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
  },
  psAverageValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  psAverageDivider: {
    width: 1,
    height: ms(28),
    marginHorizontal: GRID.xs,
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
  // Product SKU Details Styles
  skuSection: {
    marginTop: GRID.lg,
  },
  skuSectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
    textAlign: 'center',
    marginBottom: GRID.md,
  },
  skuMainCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  skuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  skuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: GRID.sm,
  },
  skuIconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skuHeaderText: {
    flex: 1,
  },
  skuItemCode: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  skuDescription: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    marginTop: 2,
  },
  skuTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  skuTypeBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
    color: colors.common.white,
  },
  skuQuantitySection: {
    padding: GRID.md,
  },
  skuQuantityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  skuQuantityLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
  },
  skuQuantityPercent: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
  },
  skuProgressBar: {
    height: ms(8),
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: GRID.md,
  },
  skuProgressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  skuQuantityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skuStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  skuStatDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    marginBottom: 4,
  },
  skuStatLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginBottom: 2,
  },
  skuStatValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(12),
  },
  skuScheduleSection: {
    padding: GRID.md,
    borderTopWidth: 1,
  },
  skuScheduleTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
    marginBottom: GRID.sm,
  },
  skuScheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GRID.sm,
    gap: GRID.sm,
  },
  skuScheduleItem: {
    flex: 1,
    paddingVertical: GRID.sm + 2,
    paddingHorizontal: GRID.xs,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuScheduleItemWide: {
    flex: 1,
    paddingVertical: GRID.sm + 2,
    paddingHorizontal: GRID.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuScheduleItemLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    marginTop: 4,
    textAlign: 'center',
  },
  skuScheduleItemValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(15),
    marginTop: 4,
  },
  skuAdditionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID.xs,
    marginTop: GRID.md,
  },
  skuInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  skuInfoChipText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  skuLoadsSection: {
    borderTopWidth: 1,
  },
  skuLoadsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  skuLoadsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: GRID.md,
  },
  skuLoadsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
    flex: 1,
  },
  skuLoadsButtonText: {
    flex: 1,
  },
  skuLoadsSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: 2,
  },
  skuLoadsButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
  },
  skuLoadsIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skuLoadsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  skuLoadsBadge: {
    minWidth: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  skuLoadsBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(11),
    color: colors.common.white,
  },
  skuLoadsList: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
    gap: GRID.sm,
  },
  skuLoadCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  skuLoadCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.sm + 2,
    gap: GRID.sm,
  },
  skuLoadBadge: {
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.sm,
  },
  skuLoadBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(12),
    color: colors.common.white,
  },
  skuLoadCardQty: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  skuLoadCardQtyText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(15),
  },
  skuLoadStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 3,
  },
  skuLoadStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
  },
  skuLoadTruckTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  skuLoadTruckText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  skuLoadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.sm + 2,
    borderTopWidth: 1,
  },
  skuLoadTimeBlock: {
    alignItems: 'center',
    flex: 1,
  },
  skuLoadTimeBlockLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  skuLoadTimeBlockValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(13),
  },
  skuLoadTimeArrow: {
    paddingHorizontal: 2,
  },
  skuLoadFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: GRID.xs + 2,
    paddingHorizontal: GRID.sm + 2,
    borderTopWidth: 1,
    gap: GRID.md,
  },
  skuLoadFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skuLoadFooterText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
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
  // Product Details Card Styles
  productDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    marginBottom: GRID.md,
    ...SHADOWS.sm,
  },
  productDetailsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: GRID.md,
  },
  productDetailsIconBox: {
    width: ms(44),
    height: ms(44),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetailsTextContent: {
    flex: 1,
  },
  productDetailsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    marginBottom: 2,
  },
  productDetailsSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  productScheduleInfo: {
    marginTop: 4,
  },
  productScheduleItem: {
    marginTop: 8,
  },
  productScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  productScheduleLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    width: ms(70),
  },
  productScheduleValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    flex: 1,
  },
  associatedProductsContainer: {
    marginTop: 2,
  },
  // Order Created Section Styles
  orderCreatedSection: {
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    marginBottom: GRID.md,
    ...SHADOWS.sm,
  },
  orderCreatedInCard: {
    marginTop: GRID.xs,
    paddingTop: GRID.xs,
    marginBottom: GRID.md,
  },
  orderCreatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
  },
  orderCreatedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  orderCreatedIconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCreatedTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
  },
  orderCreatedTime: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
  },
  orderCreatedDetails: {
    gap: GRID.sm,
  },
  orderCreatedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orderCreatedLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    width: ms(80),
  },
  orderCreatedValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    flex: 1,
  },
  orderCreatedProducts: {
    marginTop: GRID.md,
    paddingTop: GRID.md,
    borderTopWidth: 1,
    gap: GRID.md,
  },
  orderCreatedProductsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
    marginBottom: GRID.xs,
  },
  orderCreatedProductItem: {
    padding: GRID.sm,
    borderRadius: RADIUS.md,
    gap: GRID.xs,
  },
  orderCreatedProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
  },
  orderCreatedProductCode: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    flex: 1,
  },
  orderCreatedProductQty: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  orderCreatedProductDesc: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    flex: 1,
  },
  orderCreatedProductSlump: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
  },
  // Order Updates Section Styles
  orderUpdatesSection: {
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    marginBottom: GRID.md,
    ...SHADOWS.sm,
  },
  orderUpdatesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.xs,
  },
  orderUpdatesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  orderUpdatesSectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
  },
  orderUpdatesCountBadge: {
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs / 2,
    borderRadius: RADIUS.full,
  },
  orderUpdatesCountText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  orderUpdatesTimeline: {
    gap: GRID.sm,
  },
  orderUpdateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: GRID.sm,
    borderRadius: RADIUS.md,
    gap: GRID.sm,
  },
  orderUpdateIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderUpdateContent: {
    flex: 1,
  },
  orderUpdateMessage: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    lineHeight: ms(18),
  },
  orderUpdateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: GRID.xs,
    gap: GRID.xs,
  },
  orderUpdateTime: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    flex: 1,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.sm,
    marginTop: GRID.xs,
    gap: GRID.xs,
  },
  seeMoreText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  chatUnreadBadge: {
    position: 'absolute',
    top: -ms(2),
    right: -ms(4),
    minWidth: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(2),
  },
  chatUnreadBadgeText: {
    color: '#FFFFFF',
    fontSize: ms(8),
    lineHeight: ms(14),
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default OrderDetailsScreen;
