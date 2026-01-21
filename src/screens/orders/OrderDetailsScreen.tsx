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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText } from 'react-native-svg';
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

// ============================================
// Product & Schedule Card Component
// ============================================
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
  const themeColors = isDark ? colors.dark : colors.light;

  const formatDateOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  return (
    <View style={[styles.productScheduleCard, { backgroundColor: themeColors.card }]}>
      {/* Header with Title and Status */}
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

      {/* Schedule & Product Info Grid */}
      <View style={styles.psInfoGrid}>
        {/* Schedule */}
        <View style={[styles.psInfoItem, { backgroundColor: isDark ? colors.grey[60] + '10' : colors.grey[3] }]}>
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

        {/* Product */}
        <View style={[styles.psInfoItem, { backgroundColor: isDark ? colors.grey[60] + '10' : colors.grey[3] }]}>
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

  const handleShare = useCallback(async () => {
    setMenuVisible(false);
    try {
      await Share.share({
        message: `Order Details\n\nOrder: ${order.orderCode}\nCustomer: ${order.customerName}\nStatus: ${order.status}\nProduct: ${order.productType}\nQuantity: ${order.quantity} ${order.unit}\nDelivery: ${order.deliveryAddress}`,
        title: `Order ${order.orderCode}`,
      });
    } catch (error) {
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
  }, [navigation, order]);

  const menuItems = [
    { id: '1', icon: 'share-variant', label: 'Share Order', onPress: handleShare },
    { id: '2', icon: 'crosshairs-gps', label: 'Track Order', onPress: handleTrackOrder },
    { id: '3', icon: 'file-document-outline', label: 'Download Invoice', onPress: handleDownloadInvoice },
    { id: '4', icon: 'history', label: 'Order History', onPress: handleViewOrderHistory },
    { id: '5', icon: 'headset', label: 'Contact Support', onPress: handleContactSupport },
  ];

  const formatScheduleDate = (dateStr: string, timeStr: string) => {
    const date = new Date(dateStr);
    return `${timeStr} • ${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  // Chart data with more points for smoother curves
  const pourSpeedChartData = useMemo(() => jobData.pourSpeedData, [jobData.pourSpeedData]);
  const trucksChartData = useMemo(() => jobData.trucksOnJobData, [jobData.trucksOnJobData]);

  const bottomTabs = [
    { icon: 'package-variant', label: 'Materials' },
    { icon: 'briefcase-outline', label: 'Jobs' },
    { icon: 'ticket-outline', label: 'Tickets' },
    { icon: 'crosshairs-gps', label: 'Track' },
    { icon: 'chat-outline', label: 'Chats' },
  ];

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
                <Text style={[styles.estimatedTime, { color: themeColors.text.primary }]}>
                  {jobData.estimatedFinish}
                </Text>
                <Icon name="information-outline" size={14} color={themeColors.text.hint} />
              </View>
            </View>
          </AnimatedPress>

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
            isDark={isDark}
            onCallPress={() => handleCall(jobData.plantPhone)}
          />

          <SmartChart
            title="Pour Speed (CY/HR)"
            data={pourSpeedChartData}
            series={[
              { key: 'delivered', color: colors.primary.main, label: 'Delivered' },
              { key: 'poured', color: colors.success.main, label: 'Poured' },
              { key: 'ordered', color: colors.warning.main, label: 'Ordered' },
            ]}
            tooltipInfo={{ ordered: '18.5 CY/HR', spacing: '60 min' }}
            isDark={isDark}
            showPickPoint={true}
            pickPointIndex={3}
          />

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
