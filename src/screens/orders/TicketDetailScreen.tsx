import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  RefreshControl,
  Modal,
  Platform,
  Text as AppText,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader, AlertModal } from '../../components/common';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import { WeatherIcon } from '../../utils/weatherIcon';
import { RootStackParamList } from '../../navigation/types';
import { useTicketDetails, useAlert } from '../../hooks';
import { ApiTicketStatus, VerifiJson, FreshWeatherData } from '../../types/ticket';
import { ticketService } from '../../api/services/ticketService';

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;

const GRID = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24 };

const HEADER_GRADIENT_LIGHT = ['#FFFFFF', '#F8F8F8', '#F0F0F0'];
const HEADER_GRADIENT_DARK = ['#3A3A3A', '#2A2A2A', '#1E1E1E'];

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

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  progressStep: number;
}

interface HeaderBadgeColors {
  bgColor: string;
  textColor: string;
  iconColor: string;
}

const getHeaderBadgeColors = (status: ApiTicketStatus, isDark: boolean): HeaderBadgeColors => {
  const opacity = isDark ? '20' : '15';

  const statusColorMap: Record<ApiTicketStatus, string> = {
    pending: colors.trackingStatus.pending,
    ticketed: colors.trackingStatus.ticketed,
    loading: colors.trackingStatus.loading,
    loaded: colors.trackingStatus.loaded,
    to_job: colors.trackingStatus.toJob,
    at_job: colors.trackingStatus.atJob,
    pouring: colors.trackingStatus.pouring,
    poured: colors.trackingStatus.poured,
    washing: colors.trackingStatus.washing,
    to_plant: colors.trackingStatus.toPlant,
    at_plant: colors.trackingStatus.atPlant,
    cancelled: colors.trackingStatus.cancelled,
    voided: colors.trackingStatus.voided,
  };

  const color = statusColorMap[status] || statusColorMap.pending;

  return {
    bgColor: `${color}${opacity}`,
    textColor: color,
    iconColor: color,
  };
};

const STATUS_CONFIG_LIGHT: Record<ApiTicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    color: colors.trackingStatus.pending,
    bgColor: `${colors.trackingStatus.pending}15`,
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    color: colors.trackingStatus.ticketed,
    bgColor: `${colors.trackingStatus.ticketed}15`,
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'dump-truck',
    color: colors.trackingStatus.loading,
    bgColor: `${colors.trackingStatus.loading}15`,
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    color: colors.trackingStatus.loaded,
    bgColor: `${colors.trackingStatus.loaded}15`,
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    color: colors.trackingStatus.toJob,
    bgColor: `${colors.trackingStatus.toJob}15`,
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    color: colors.trackingStatus.atJob,
    bgColor: `${colors.trackingStatus.atJob}15`,
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    color: colors.trackingStatus.pouring,
    bgColor: `${colors.trackingStatus.pouring}15`,
    progressStep: 6,
  },
  poured: {
    label: 'POURED',
    icon: 'water-check',
    color: colors.trackingStatus.poured,
    bgColor: `${colors.trackingStatus.poured}15`,
    progressStep: 7,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    color: colors.trackingStatus.washing,
    bgColor: `${colors.trackingStatus.washing}15`,
    progressStep: 8,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    color: colors.trackingStatus.toPlant,
    bgColor: `${colors.trackingStatus.toPlant}15`,
    progressStep: 9,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'domain',
    color: colors.trackingStatus.atPlant,
    bgColor: `${colors.trackingStatus.atPlant}15`,
    progressStep: 10,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    color: colors.trackingStatus.cancelled,
    bgColor: `${colors.trackingStatus.cancelled}15`,
    progressStep: -1,
  },
  voided: {
    label: 'VOIDED',
    icon: 'close-circle',
    color: colors.trackingStatus.voided,
    bgColor: `${colors.trackingStatus.voided}15`,
    progressStep: -1,
  },
};

const STATUS_CONFIG_DARK: Record<ApiTicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    color: colors.trackingStatus.pending,
    bgColor: `${colors.trackingStatus.pending}20`,
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    color: colors.trackingStatus.ticketed,
    bgColor: `${colors.trackingStatus.ticketed}20`,
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'dump-truck',
    color: colors.trackingStatus.loading,
    bgColor: `${colors.trackingStatus.loading}20`,
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    color: colors.trackingStatus.loaded,
    bgColor: `${colors.trackingStatus.loaded}20`,
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    color: colors.trackingStatus.toJob,
    bgColor: `${colors.trackingStatus.toJob}20`,
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    color: colors.trackingStatus.atJob,
    bgColor: `${colors.trackingStatus.atJob}20`,
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    color: colors.trackingStatus.pouring,
    bgColor: `${colors.trackingStatus.pouring}20`,
    progressStep: 6,
  },
  poured: {
    label: 'POURED',
    icon: 'water-check',
    color: colors.trackingStatus.poured,
    bgColor: `${colors.trackingStatus.poured}20`,
    progressStep: 7,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    color: colors.trackingStatus.washing,
    bgColor: `${colors.trackingStatus.washing}20`,
    progressStep: 8,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    color: colors.trackingStatus.toPlant,
    bgColor: `${colors.trackingStatus.toPlant}20`,
    progressStep: 9,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'domain',
    color: colors.trackingStatus.atPlant,
    bgColor: `${colors.trackingStatus.atPlant}20`,
    progressStep: 10,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    color: colors.trackingStatus.cancelled,
    bgColor: `${colors.trackingStatus.cancelled}20`,
    progressStep: -1,
  },
  voided: {
    label: 'VOIDED',
    icon: 'close-circle',
    color: colors.trackingStatus.voided,
    bgColor: `${colors.trackingStatus.voided}20`,
    progressStep: -1,
  },
};

const TIMELINE_STEPS = [
  { key: 'ticketed', label: 'Ticketed', icon: 'ticket-outline' },
  { key: 'loading', label: 'Loading', icon: 'truck-loading' },
  { key: 'loaded', label: 'Loaded', icon: 'truck-check' },
  { key: 'to_job', label: 'To Job', icon: 'truck-fast' },
  { key: 'at_job', label: 'At Job', icon: 'map-marker-check' },
  { key: 'pouring', label: 'Pouring', icon: 'water' },
  { key: 'washing', label: 'Washing', icon: 'water-pump' },
  { key: 'to_plant', label: 'To Plant', icon: 'truck-delivery' },
  { key: 'at_plant', label: 'At Plant', icon: 'domain' },
];

interface SectionCardProps {
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  isDark: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, iconColor, children, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const titleColor = isDark ? colors.common.white : colors.grey[80];

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
      ]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, { backgroundColor: `${iconColor}15` }]}>
          <Icon name={icon} size={ms(18)} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value?: string | null;
  icon?: string;
  iconColor?: string;
  isDark: boolean;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon, iconColor, isDark, isLast }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const borderColor = isDark ? colors.semiTransparent.white08 : colors.grey[10];
  const labelColor = isDark ? colors.grey[40] : colors.grey[60];
  const valueColor = isDark ? colors.common.white : colors.grey[85];

  if (!value) return null;

  return (
    <View style={[styles.detailRow, !isLast && [styles.detailRowBorder, { borderBottomColor: borderColor }]]}>
      {icon && (
        <Icon
          name={icon}
          size={ms(16)}
          color={iconColor || themeColors.text.hint}
          style={styles.detailIcon}
        />
      )}
      <Text
        style={[styles.detailLabel, { color: labelColor }]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.detailValue, { color: valueColor }]}
        numberOfLines={2}
        ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
};

interface VerticalTimelineProps {
  timestamps: {
    ticketed?: string | null;
    loading?: string | null;
    loaded?: string | null;
    toJob?: string | null;
    atJob?: string | null;
    pouring?: string | null;
    washing?: string | null;
    toPlant?: string | null;
    atPlant?: string | null;
  };
  durations: {
    loading?: string | number | null;
    loaded?: string | number | null;
    toJob?: string | number | null;
    atJob?: string | number | null;
    pouring?: string | number | null;
    washing?: string | number | null;
    toPlant?: string | number | null;
    atPlant?: string | number | null;
  };
  currentStatus: ApiTicketStatus;
  isDark: boolean;
}

const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ timestamps, durations, currentStatus, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const completedColor = isDark ? colors.primary.light : colors.primary.main;
  const activeColor = isDark ? colors.secondary.light : colors.secondary.main;
  const completedTextColor = isDark ? colors.common.white : colors.grey[80];
  const pendingTextColor = isDark ? colors.grey[40] : colors.grey[50];
  const timeTextColor = isDark ? colors.grey[40] : colors.grey[60];
  const durationColor = isDark ? colors.grey[50] : colors.grey[50];

  const getTimeForStep = (key: string): string | null => {
    const timeMap: Record<string, string | null | undefined> = {
      ticketed: timestamps.ticketed,
      loading: timestamps.loading,
      loaded: timestamps.loaded,
      to_job: timestamps.toJob,
      at_job: timestamps.atJob,
      pouring: timestamps.pouring,
      washing: timestamps.washing,
      to_plant: timestamps.toPlant,
      at_plant: timestamps.atPlant,
    };
    return timeMap[key] || null;
  };

  const getDurationForStep = (key: string): string | number | null => {
    const durationMap: Record<string, string | number | null | undefined> = {
      loading: durations.loading,
      loaded: durations.loaded,
      to_job: durations.toJob,
      at_job: durations.atJob,
      pouring: durations.pouring,
      washing: durations.washing,
      to_plant: durations.toPlant,
      at_plant: durations.atPlant,
    };
    const value = durationMap[key];

    if (value === null || value === undefined || value === '--') {
      return null;
    }
    return value;
  };

  const formatDuration = (value: string | number): string => {

    if (typeof value === 'string') {

      return value.replace(/\b1 minutes\b/g, '1 minute');
    }

    if (value < 60) {
      return `${value} minute${value !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (mins > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const statusOrder = TIMELINE_STEPS.map(s => s.key);
  const currentIndex = statusOrder.indexOf(currentStatus);


  const getNextStepDuration = (index: number): string | number | null => {
    if (index >= TIMELINE_STEPS.length - 1) return null;
    const nextStep = TIMELINE_STEPS[index + 1];
    return getDurationForStep(nextStep.key);
  };

  return (
    <View>
      {TIMELINE_STEPS.map((step, index) => {
        const stepTime = getTimeForStep(step.key);
        const isCompleted = stepTime !== null;
        const isActive = step.key === currentStatus;
        const stepColor = isCompleted ? completedColor : themeColors.border;
        const nextDuration = getNextStepDuration(index);

        return (
          <View key={step.key} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.timelineIcon,
                  {
                    backgroundColor: isCompleted ? stepColor : themeColors.surface,
                    borderColor: stepColor,
                  },
                  isActive && [styles.timelineIconActive, { shadowColor: completedColor }],
                ]}>
                <Icon
                  name={isCompleted ? 'check' : step.icon}
                  size={ms(14)}
                  color={isCompleted ? colors.common.white : themeColors.text.hint}
                />
              </View>
              {index < TIMELINE_STEPS.length - 1 && (
                <View
                  style={[
                    styles.timelineVerticalLine,
                    { backgroundColor: index < currentIndex ? completedColor : themeColors.border },
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text
                  style={[
                    styles.timelineStepLabel,
                    { color: isCompleted ? completedTextColor : pendingTextColor },
                    isActive && { fontFamily: fontFamily.semiBold, color: activeColor },
                  ]}>
                  {step.label}
                </Text>
                {stepTime && (
                  <Text style={[styles.timelineTime, { color: timeTextColor }]}>
                    {stepTime}
                  </Text>
                )}
              </View>
              {isActive && (
                <View style={styles.activeIndicator}>
                  <View style={[styles.activeDot, { backgroundColor: activeColor }]} />
                  <Text style={[styles.activeText, { color: activeColor }]}>Current Status</Text>
                </View>
              )}
              {nextDuration !== null && isCompleted && (
                <View style={styles.durationRow}>
                  <Text style={[styles.durationText, { color: durationColor }]}>
                    -- {formatDuration(nextDuration)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  isDark: boolean;
  disabled?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, color, onPress, isDark, disabled }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const labelColor = isDark ? colors.common.white : colors.grey[60];
  const disabledColor = isDark ? colors.grey[60] : colors.grey[40];

  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
      <View style={[styles.quickActionIcon, { backgroundColor: disabled ? `${disabledColor}15` : `${color}15` }]}>
        <Icon name={icon} size={ms(20)} color={disabled ? disabledColor : color} />
      </View>
      <Text
        style={[styles.quickActionLabel, { color: disabled ? disabledColor : labelColor }]}
        numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface DeliveryMetricsCardProps {
  spacingMinutes: string | null;
  waitingMinutes: string | null;
  pourMinutes: string | null;
  performanceMinutes: string | null;
  idleMinutes: string | null;
  isDark: boolean;
}

const DeliveryMetricsCard: React.FC<DeliveryMetricsCardProps> = ({
  spacingMinutes,
  waitingMinutes,
  pourMinutes,
  performanceMinutes,
  idleMinutes,
  isDark,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  const parseMinutes = (value: string | null): string => {
    if (!value || value === '--') return '--';
    const match = value.match(/(-?\d+)/);
    return match ? `${match[1]} min` : value;
  };

  const getNumericValue = (value: string | null): number | null => {
    if (!value || value === '--') return null;
    const match = value.match(/(-?\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const getIdleColor = (): string => {
    const idleValue = getNumericValue(idleMinutes);
    const spacingValue = getNumericValue(spacingMinutes);

    if (idleValue === null) {
      return isDark ? colors.grey[40] : colors.grey[60];
    }


    if (spacingValue !== null && idleValue === spacingValue) {
      return isDark ? colors.common.white : colors.grey[85];
    }


    if (idleValue > 0) {
      return isDark ? colors.success.light : colors.success.main;
    }


    if (idleValue < 0) {
      return isDark ? colors.error.light : colors.error.main;
    }


    return isDark ? colors.common.white : colors.grey[85];
  };

  const metrics = [
    {
      icon: 'clock-fast',
      value: parseMinutes(spacingMinutes),
      label: 'Spacing',
      color: isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light,
    },
    {
      icon: 'timer-sand',
      value: parseMinutes(waitingMinutes),
      label: 'Waiting',
      color: isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light,
    },
    {
      icon: 'speedometer',
      value: parseMinutes(performanceMinutes),
      label: 'Performance',
      color: isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light,
    },
    {
      icon: 'water',
      value: parseMinutes(pourMinutes),
      label: 'Pour Out',
      color: isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light,
    },
    {
      icon: 'timer-off',
      value: parseMinutes(idleMinutes),
      label: 'Idle',
      color: isDark ? colors.grey[40] : colors.grey[60],
      valueColor: getIdleColor(),
    },
  ];

  const hasAnyMetrics = spacingMinutes || waitingMinutes || pourMinutes || performanceMinutes || idleMinutes;

  if (!hasAnyMetrics) return null;

  const titleColor = isDark ? colors.common.white : colors.grey[80];
  const iconColor = isDark ? colors.primary.light : colors.primary.main;

  return (
    <View
      style={[
        styles.deliveryMetricsCard,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
      ]}>
      <View style={styles.deliveryMetricsHeader}>
        <View style={[styles.deliveryMetricsIconBox, { backgroundColor: `${iconColor}15` }]}>
          <Icon name="chart-timeline-variant" size={ms(18)} color={iconColor} />
        </View>
        <Text style={[styles.deliveryMetricsTitle, { color: titleColor }]}>Delivery Metrics</Text>
      </View>

      <View style={styles.deliveryMetricsRow}>
        {metrics.slice(0, 2).map((metric) => (
          <View
            key={metric.label}
            style={[
              styles.deliveryMetricCard,
              { backgroundColor: isDark ? themeColors.surface : colors.grey[5] }
            ]}
          >
            <View style={[styles.deliveryMetricCardIcon, { backgroundColor: `${metric.color}15` }]}>
              <Icon name={metric.icon} size={ms(16)} color={metric.color} />
            </View>
            <View style={styles.deliveryMetricCardContent}>
              <Text style={[styles.deliveryMetricCardValue, { color: metric.valueColor || (isDark ? colors.common.white : colors.grey[85]) }]}>
                {metric.value}
              </Text>
              <Text
                style={[styles.deliveryMetricCardLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {metric.label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.deliveryMetricsRow}>
        {metrics.slice(2, 4).map((metric) => (
          <View
            key={metric.label}
            style={[
              styles.deliveryMetricCard,
              { backgroundColor: isDark ? themeColors.surface : colors.grey[5] }
            ]}
          >
            <View style={[styles.deliveryMetricCardIcon, { backgroundColor: `${metric.color}15` }]}>
              <Icon name={metric.icon} size={ms(16)} color={metric.color} />
            </View>
            <View style={styles.deliveryMetricCardContent}>
              <Text style={[styles.deliveryMetricCardValue, { color: metric.valueColor || (isDark ? colors.common.white : colors.grey[85]) }]}>
                {metric.value}
              </Text>
              <Text
                style={[styles.deliveryMetricCardLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {metric.label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.deliveryMetricsRowCenter}>
        {metrics.slice(4).map((metric) => (
          <View
            key={metric.label}
            style={[
              styles.deliveryMetricCardCenter,
              { backgroundColor: isDark ? themeColors.surface : colors.grey[5] }
            ]}
          >
            <View style={[styles.deliveryMetricCardIcon, { backgroundColor: `${metric.color}15` }]}>
              <Icon name={metric.icon} size={ms(16)} color={metric.color} />
            </View>
            <View style={styles.deliveryMetricCardContent}>
              <Text style={[styles.deliveryMetricCardValue, { color: metric.valueColor || (isDark ? colors.common.white : colors.grey[85]) }]}>
                {metric.value}
              </Text>
              <Text
                style={[styles.deliveryMetricCardLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {metric.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

interface VerifiDataCardProps {
  verifiJson: VerifiJson;
  isDark: boolean;
}

interface VerifiSectionData {
  key: string;
  title: string;
  icon: string;
  color: string;
}

const VerifiDataCard: React.FC<VerifiDataCardProps> = ({ verifiJson, isDark }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const themeColors = isDark ? colors.dark : colors.light;
  const titleColor = isDark ? colors.common.white : colors.grey[80];
  const labelColor = isDark ? colors.grey[40] : colors.grey[60];
  const valueColor = isDark ? colors.common.white : colors.grey[85];
  const cardBgColor = isDark ? themeColors.surface : colors.grey[5];
  const borderColor = isDark ? colors.semiTransparent.white08 : colors.grey[10];
  const accentColor = isDark ? colors.primary.light : colors.primary.main;

  const sections: VerifiSectionData[] = [
    { key: 'timing', title: 'Timing Events', icon: 'clock-outline', color: isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light },
    { key: 'slump', title: 'Slump & Age', icon: 'waves', color: isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light },
    { key: 'temp', title: 'Temperature', icon: 'thermometer', color: isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light },
    { key: 'mix', title: 'Mix & Water', icon: 'beaker-outline', color: isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light },
    { key: 'revs', title: 'Drum Revolutions', icon: 'rotate-3d-variant', color: isDark ? colors.success.light : colors.success.main },
  ];

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const formatSlump = (slump: { slump: string; slumpUnits: string } | null | undefined): string => {
    if (!slump) return '--';
    return `${slump.slump} ${slump.slumpUnits === 'IN' ? 'in' : slump.slumpUnits}`;
  };

  const formatTemperature = (temp: { temperatureUnitsType: string; temperatureUnitsValue: string } | null | undefined): string => {
    if (!temp) return '--';
    return `${temp.temperatureUnitsValue}°${temp.temperatureUnitsType}`;
  };

  const formatVolume = (vol: { volumeUnits: string; volumeValue: string } | null | undefined): string => {
    if (!vol) return '--';
    let units = vol.volumeUnits;
    if (units === 'GAL_YD_3') units = 'gal/yd³';
    else if (units === 'GAL') units = 'gal';
    else if (units === 'OZ_YD_3') units = 'oz/yd³';
    else if (units === 'OZ') units = 'oz';
    return `${vol.volumeValue} ${units}`;
  };

  const formatAge = (age: { age: string; ageUnits: string } | null | undefined): string => {
    if (!age) return '--';
    return `${age.age} ${age.ageUnits}`;
  };

  const formatLoadSize = (load: { loadSize: string; loadSizeUnits: string } | null | undefined): string => {
    if (!load) return '--';
    const units = load.loadSizeUnits === 'Y_3' ? 'yd³' : load.loadSizeUnits;
    return `${load.loadSize} ${units}`;
  };

  const DataRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <View style={styles.vfDataRow}>
      <Text style={[styles.vfDataLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.vfDataValue, { color: highlight ? accentColor : valueColor }]}>{value}</Text>
    </View>
  );

  const MetricCard = ({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) => (
    <View style={[styles.vfMetricCard, { backgroundColor: cardBgColor }]}>
      <View style={[styles.vfMetricIcon, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={ms(18)} color={color} />
      </View>
      <Text style={[styles.vfMetricValue, { color: valueColor }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.vfMetricLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );

  const CollapsibleSection = ({ section, children }: { section: VerifiSectionData; children: React.ReactNode }) => {
    const isExpanded = expandedSections.has(section.key);
    return (
      <View style={[styles.vfCollapsible, { borderColor }]}>
        <TouchableOpacity
          style={styles.vfCollapsibleHeader}
          onPress={() => toggleSection(section.key)}
          activeOpacity={0.7}>
          <View style={[styles.vfCollapsibleIcon, { backgroundColor: `${section.color}15` }]}>
            <Icon name={section.icon} size={ms(16)} color={section.color} />
          </View>
          <Text style={[styles.vfCollapsibleTitle, { color: titleColor }]}>{section.title}</Text>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={ms(20)}
            color={labelColor}
          />
        </TouchableOpacity>
        {isExpanded && <View style={styles.vfCollapsibleContent}>{children}</View>}
      </View>
    );
  };

  const StageIndicator = ({ label, value, color, isLast }: { label: string; value: string; color: string; isLast?: boolean }) => (
    <View style={styles.vfStageItem}>
      <View style={[styles.vfStageDot, { backgroundColor: color }]} />
      <View style={styles.vfStageContent}>
        <Text style={[styles.vfStageLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.vfStageValue, { color: valueColor }]}>{value}</Text>
      </View>
      {!isLast && <View style={[styles.vfStageLine, { backgroundColor: borderColor }]} />}
    </View>
  );

  return (
    <View style={styles.vfContainer}>
      {/* Main Header Card */}
      <View style={[styles.vfMainCard, { backgroundColor: themeColors.card, borderColor }]}>
        <View style={styles.vfHeader}>
          <View style={[styles.vfHeaderIcon, { backgroundColor: `${accentColor}15` }]}>
            <Icon name="chart-bar" size={ms(20)} color={accentColor} />
          </View>
          <View style={styles.vfHeaderText}>
            <Text style={[styles.vfHeaderTitle, { color: titleColor }]}>Verifi Data</Text>
            <Text style={[styles.vfHeaderSubtitle, { color: labelColor }]}>
              {verifiJson.ticketNumber || 'Ticket'} • {verifiJson.ticketDate || ''}
            </Text>
          </View>
          {verifiJson.truckMode && (
            <View style={[styles.vfModeBadge, { backgroundColor: `${accentColor}15` }]}>
              <Text style={[styles.vfModeText, { color: accentColor }]}>{verifiJson.truckMode}</Text>
            </View>
          )}
        </View>

        {/* Summary Metrics Grid */}
        <View style={styles.vfMetricsGrid}>
          <MetricCard
            icon="package-variant"
            value={formatLoadSize(verifiJson.loadSize)}
            label="Load Size"
            color={isDark ? colors.success.light : colors.success.main}
          />
          <MetricCard
            icon="beaker"
            value={verifiJson.mixCodeName || '--'}
            label="Mix Code"
            color={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light}
          />
          <MetricCard
            icon="timer-outline"
            value={verifiJson.startToEndTotalMinutes || '--'}
            label="Duration"
            color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light}
          />
          <MetricCard
            icon="thermometer"
            value={formatTemperature(verifiJson.temperatureAtDischarge)}
            label="Temp @Discharge"
            color={isDark ? colors.error.light : colors.error.main}
          />
        </View>

        {/* Quick Info */}
        <View style={[styles.vfQuickInfo, { backgroundColor: cardBgColor }]}>
          <View style={styles.vfQuickInfoItem}>
            <Icon name="truck" size={ms(16)} color={labelColor} />
            <Text style={[styles.vfQuickInfoValue, { color: valueColor }]} numberOfLines={1}>{verifiJson.truckName || '--'}</Text>
          </View>
          <View style={styles.vfQuickInfoItem}>
            <Icon name="map-marker" size={ms(16)} color={labelColor} />
            <Text style={[styles.vfQuickInfoValue, { color: valueColor }]} numberOfLines={2}>{verifiJson.locationName || '--'}</Text>
          </View>
        </View>
      </View>

      {/* Collapsible Sections */}
      <CollapsibleSection section={sections[0]}>
        <View style={styles.vfTimelineContainer}>
          <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Plant</Text>
          <StageIndicator label="Ticket Received" value={verifiJson.ticketReceived || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
          <StageIndicator label="Loading" value={verifiJson.loading || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
          <StageIndicator label="Loaded" value={verifiJson.loaded || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
          <StageIndicator label="Leave Plant" value={verifiJson.leavePlant || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} isLast />
        </View>
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <View style={styles.vfTimelineContainer}>
          <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Job Site</Text>
          <StageIndicator label="Arrive Site" value={verifiJson.arriveSite || verifiJson.calculatedArriveSite || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
          <StageIndicator label="Begin Pour" value={verifiJson.beginPour || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
          <StageIndicator label="End Pour" value={verifiJson.endPour || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
          <StageIndicator label="Leave Site" value={verifiJson.leaveSite || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} isLast />
        </View>
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <View style={styles.vfTimelineContainer}>
          <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Return</Text>
          <StageIndicator label="Return Plant" value={verifiJson.returnPlant || '--'} color={isDark ? colors.success.light : colors.success.main} isLast />
        </View>
      </CollapsibleSection>

      <CollapsibleSection section={sections[1]}>
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Slump Readings</Text>
        <DataRow label="Target (From Ticket)" value={formatSlump(verifiJson.slumpFromTicket)} highlight />
        <DataRow label="At Leave Plant" value={formatSlump(verifiJson.slumpAtLeavePlant)} />
        <DataRow label="At Arrival" value={formatSlump(verifiJson.slumpAtArrival)} />
        <DataRow label="At Discharge" value={formatSlump(verifiJson.slumpAtDischarge)} />
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Concrete Age</Text>
        <DataRow label="At Leave Plant" value={formatAge(verifiJson.ageAtLeavePlantMinutes)} />
        <DataRow label="At Discharge" value={formatAge(verifiJson.ageAtDischargeMinutes)} />
      </CollapsibleSection>

      <CollapsibleSection section={sections[2]}>
        <View style={styles.vfTempFlow}>
          <View style={[styles.vfTempCard, { backgroundColor: cardBgColor }]}>
            <Icon name="factory" size={ms(22)} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
            <Text style={[styles.vfTempCardValue, { color: valueColor }]}>{formatTemperature(verifiJson.temperatureAtLeavePlant)}</Text>
            <Text style={[styles.vfTempCardLabel, { color: labelColor }]}>Leave Plant</Text>
          </View>
          <Icon name="chevron-right" size={ms(24)} color={borderColor} />
          <View style={[styles.vfTempCard, { backgroundColor: cardBgColor }]}>
            <Icon name="map-marker-radius" size={ms(22)} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
            <Text style={[styles.vfTempCardValue, { color: valueColor }]}>{formatTemperature(verifiJson.temperatureAtArrival)}</Text>
            <Text style={[styles.vfTempCardLabel, { color: labelColor }]}>Arrival</Text>
          </View>
          <Icon name="chevron-right" size={ms(24)} color={borderColor} />
          <View style={[styles.vfTempCard, { backgroundColor: cardBgColor }]}>
            <Icon name="water" size={ms(22)} color={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light} />
            <Text style={[styles.vfTempCardValue, { color: valueColor }]}>{formatTemperature(verifiJson.temperatureAtDischarge)}</Text>
            <Text style={[styles.vfTempCardLabel, { color: labelColor }]}>Discharge</Text>
          </View>
        </View>
      </CollapsibleSection>

      <CollapsibleSection section={sections[3]}>
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Mix Information</Text>
        <DataRow label="Mix Code" value={verifiJson.mixCodeName || '--'} highlight />
        <DataRow label="Instruction" value={verifiJson.instructionName || '--'} />
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Water Additions</Text>
        <DataRow label="Total Water" value={formatVolume(verifiJson.verifiWaterTotal)} />
        <DataRow label="At Leave Plant" value={formatVolume(verifiJson.verifiWaterAtLeavePlant)} />
        <DataRow label="At Arrival" value={formatVolume(verifiJson.verifiWaterAtArrival)} />
        <DataRow label="At Discharge" value={formatVolume(verifiJson.verifiWaterAtDischarge)} />
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Admix Volumes</Text>
        <DataRow label="Total" value={formatVolume(verifiJson.admixTotal)} />
        <DataRow label="At Discharge" value={formatVolume(verifiJson.admixAtDischarge)} />
      </CollapsibleSection>

      <CollapsibleSection section={sections[4]}>
        <View style={styles.vfRevsContainer}>
          <View style={[styles.vfRevsCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.vfRevsCircle, { borderColor: isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light }]}>
              <Text style={[styles.vfRevsNumber, { color: valueColor }]}>{verifiJson.totalRevsAtLeavePlant || '0'}</Text>
            </View>
            <Text style={[styles.vfRevsLabel, { color: labelColor }]}>Leave Plant</Text>
          </View>
          <View style={[styles.vfRevsCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.vfRevsCircle, { borderColor: isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light }]}>
              <Text style={[styles.vfRevsNumber, { color: valueColor }]}>{verifiJson.totalRevsAtArrival || '0'}</Text>
            </View>
            <Text style={[styles.vfRevsLabel, { color: labelColor }]}>Arrival</Text>
          </View>
          <View style={[styles.vfRevsCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.vfRevsCircle, { borderColor: isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light }]}>
              <Text style={[styles.vfRevsNumber, { color: valueColor }]}>{verifiJson.totalRevsAtDischarge || '0'}</Text>
            </View>
            <Text style={[styles.vfRevsLabel, { color: labelColor }]}>Discharge</Text>
          </View>
        </View>
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>Since Loaded</Text>
        <DataRow label="At Leave Plant" value={verifiJson.totalRevsSinceLoadedAtLeavePlant || '--'} />
        <DataRow label="At Arrival" value={verifiJson.totalRevsSinceLoadedAtArrival || '--'} />
        <DataRow label="At Discharge" value={verifiJson.totalRevsSinceLoadedAtDischarge || '--'} />
      </CollapsibleSection>
    </View>
  );
};

export const TicketDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TicketDetailRouteProp>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, showWarning, hideAlert } = useAlert();

  const [showDirectionsMenu, setShowDirectionsMenu] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  // ETA feature temporarily disabled
  // const [etaLoading, setEtaLoading] = useState(false);
  // const [etaResult, setEtaResult] = useState<any>(null);
  // const [etaExpanded, setEtaExpanded] = useState(false);
  // const [etaError, setEtaError] = useState<string | null>(null);
  // const [etaCooldown, setEtaCooldown] = useState(0);
  // const [etaLastCalculated, setEtaLastCalculated] = useState(0);
  // const etaCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  //
  // const ONE_MINUTE_MS = 60 * 1000;
  //
  // const startEtaCooldown = useCallback(() => {
  //   if (etaCooldownRef.current) clearInterval(etaCooldownRef.current);
  //   setEtaLastCalculated(Date.now());
  //   setEtaCooldown(60);
  //   etaCooldownRef.current = setInterval(() => {
  //     setEtaCooldown(prev => {
  //       if (prev <= 1) {
  //         if (etaCooldownRef.current) clearInterval(etaCooldownRef.current);
  //         etaCooldownRef.current = null;
  //         return 0;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);
  // }, []);
  //
  // const isEtaCooldownActive = useCallback(() => {
  //   if (etaCooldown > 0) return true;
  //   const timeSince = Date.now() - etaLastCalculated;
  //   if (timeSince < ONE_MINUTE_MS) {
  //     const remaining = Math.ceil((ONE_MINUTE_MS - timeSince) / 1000);
  //     setEtaCooldown(remaining);
  //     if (etaCooldownRef.current) clearInterval(etaCooldownRef.current);
  //     etaCooldownRef.current = setInterval(() => {
  //       setEtaCooldown(prev => {
  //         if (prev <= 1) {
  //           if (etaCooldownRef.current) clearInterval(etaCooldownRef.current);
  //           etaCooldownRef.current = null;
  //           return 0;
  //         }
  //         return prev - 1;
  //       });
  //     }, 1000);
  //     return true;
  //   }
  //   return false;
  // }, [etaCooldown, etaLastCalculated]);

  const { orderCode, orderDate, ticketCode, status: passedStatus, statusDisplay: passedStatusDisplay, statusColor: passedStatusColor, statusColors: apiStatusColors } = route.params;

  const {
    ticket,
    ticketCode: apiTicketCode,
    orderCode: apiOrderCode,
    orderId,
    loadNumber,
    customerName,
    deliveryAddress,
    projectName,
    plantCode,
    plantName,
    plantAddress,
    plantPhone,
    runningQty,
    orderedQty,
    loadQty,
    driverName,
    driverCode,
    driverPhone,
    truckCode,
    truckDescription,
    truckLatitude,
    truckLongitude,
    plantLocationLatitude,
    plantLocationLongitude,
    orderLocationLatitude,
    orderLocationLongitude,
    statusCode,
    statusDisplay,
    etaAtJob,
    removeReasonCode,
    timestamps,
    durations,
    products,
    deliveryMetrics,
    weatherData,
    freshWeather,
    verifiJson,
    // etaData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useTicketDetails({
    order_code: orderCode,
    order_date: orderDate,
    ticket_code: ticketCode,
  });

  const statusConfigMap = useMemo(() => {
    const baseConfig = isDark ? STATUS_CONFIG_DARK : STATUS_CONFIG_LIGHT;
    if (!apiStatusColors) return baseConfig;
    const opacity = isDark ? '20' : '15';
    const merged = { ...baseConfig };
    for (const key of Object.keys(baseConfig) as ApiTicketStatus[]) {
      const isCancelled = key === 'cancelled' || key === 'voided';
      if (!isCancelled && apiStatusColors[key]) {
        const c = apiStatusColors[key];
        merged[key] = { ...baseConfig[key], color: c, bgColor: `${c}${opacity}` };
      }
    }
    return merged;
  }, [isDark, apiStatusColors]);


  const formatEtaTime = (etaString: string | null | undefined): string => {
    if (!etaString) return '';
    try {
      const date = new Date(etaString);
      if (isNaN(date.getTime())) return etaString;
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return etaString;
    }
  };

  const formattedEta = formatEtaTime(etaAtJob);

  const currentStatus = statusCode || passedStatus || 'pending';
  const currentStatusDisplayText = statusDisplay || passedStatusDisplay;
  const statusInfo = statusConfigMap[currentStatus] || statusConfigMap.pending;
  const isAtPlant = currentStatus === 'at_plant';
  const isCancelled = currentStatus === 'cancelled' || currentStatus?.toLowerCase().includes('cancel');


  const resolvedStatusColor = passedStatusColor || statusConfigMap[currentStatus]?.color || getHeaderBadgeColors(currentStatus, isDark).textColor;
  const currentStatusColor = resolvedStatusColor;
  const headerBadgeColors = {
    bgColor: `${resolvedStatusColor}${isDark ? '20' : '15'}`,
    textColor: resolvedStatusColor,
    iconColor: resolvedStatusColor,
  };

  const percentage = useMemo(() => {
    if (!orderedQty || orderedQty === 0) return 0;
    return Math.min((runningQty / orderedQty) * 100, 100);
  }, [runningQty, orderedQty]);

  const headerGradient = isDark ? HEADER_GRADIENT_DARK : HEADER_GRADIENT_LIGHT;
  const accentColor = isDark ? colors.primary.light : colors.primary.main;

  const productInfo = useMemo(() => {
    if (!products || products.length === 0) return null;
    const product = products[0];
    return {
      code: product.item_code,
      name: product.description,
      isMix: product.is_mix,
    };
  }, [products]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCallDriver = useCallback(() => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    } else {
      showWarning('Phone Not Available', 'Driver phone number is not available for this ticket.');
    }
  }, [driverPhone, showWarning]);

  const handleTrackTruck = useCallback(() => {
    if (orderId) {
      navigation.navigate('Tracking', {
        orderId: orderId,
        ticketCode: apiTicketCode || undefined,
      });
    } else {
      showWarning(
        'Order Unavailable',
        'Order information is not available at the moment. Please try again later.'
      );
    }
  }, [orderId, apiTicketCode, navigation, showWarning]);

  const handleGetDirections = useCallback(() => {
    if (truckLatitude && truckLongitude) {
      setShowDirectionsMenu(true);
    } else {
      showWarning(
        'Location Unavailable',
        'Truck location coordinates are not available at the moment. The truck may not have GPS data or the location service is temporarily unavailable. Please try again later.'
      );
    }
  }, [truckLatitude, truckLongitude, showWarning]);

  const handleShowQRCode = useCallback(() => {
    setShowQRCodeModal(true);
  }, []);

  const closeQRCodeModal = useCallback(() => {
    setShowQRCodeModal(false);
  }, []);

  const closeDirectionsMenu = useCallback(() => {
    setShowDirectionsMenu(false);
  }, []);

  const handleOpenInAppMap = useCallback(() => {
    closeDirectionsMenu();
    setTimeout(() => {
      if (orderId) {
        navigation.navigate('Tracking', {
          orderId: orderId,
          ticketCode: apiTicketCode || undefined,
        });
      }
    }, 300);
  }, [closeDirectionsMenu, navigation, orderId, apiTicketCode]);

  const handleOpenInGoogleMaps = useCallback(() => {
    closeDirectionsMenu();
    if (truckLatitude && truckLongitude) {

      const hasJobLocation = orderLocationLatitude && orderLocationLongitude;

      let url: string | undefined;
      let webFallbackUrl: string;

      if (hasJobLocation) {

        url = Platform.select({
          ios: `comgooglemaps://?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&directionsmode=driving`,
          android: `google.navigation:q=${orderLocationLatitude},${orderLocationLongitude}&mode=d`,
        });
        webFallbackUrl = `https://maps.google.com/?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&directionsmode=driving`;
      } else {

        url = Platform.select({
          ios: `comgooglemaps://?q=${truckLatitude},${truckLongitude}`,
          android: `geo:${truckLatitude},${truckLongitude}?q=${truckLatitude},${truckLongitude}`,
        });
        webFallbackUrl = `https://maps.google.com/?q=${truckLatitude},${truckLongitude}`;
      }

      Linking.canOpenURL(url || '').then((supported) => {
        if (supported) {
          Linking.openURL(url || '');
        } else {

          Linking.openURL(webFallbackUrl);
        }
      });
    }
  }, [closeDirectionsMenu, truckLatitude, truckLongitude, orderLocationLatitude, orderLocationLongitude]);

  const handleOpenInAppleMaps = useCallback(() => {
    closeDirectionsMenu();
    if (truckLatitude && truckLongitude) {

      const hasJobLocation = orderLocationLatitude && orderLocationLongitude;

      let url: string;
      let webFallbackUrl: string;

      if (hasJobLocation) {

        url = `maps://maps.apple.com/?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&dirflg=d`;
        webFallbackUrl = `https://maps.apple.com/?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&dirflg=d`;
      } else {

        url = `maps://maps.apple.com/?ll=${truckLatitude},${truckLongitude}&q=Truck%20Location`;
        webFallbackUrl = `https://maps.apple.com/?ll=${truckLatitude},${truckLongitude}`;
      }

      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {

          Linking.openURL(webFallbackUrl);
        }
      });
    }
  }, [closeDirectionsMenu, truckLatitude, truckLongitude, orderLocationLatitude, orderLocationLongitude]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={headerGradient[0]} />
        <View style={[styles.headerContainer, styles.headerContainerLoading, { paddingTop: insets.top }]}>
          <LinearGradient colors={headerGradient} style={StyleSheet.absoluteFill} />
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleSection}>
              <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Ticket</Text>
            </View>
            <View style={styles.headerBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader size={120} message="Loading ticket details..." color={isDark ? 'light' : 'dark'} />
        </View>
      </View>
    );
  }

  if (error || !ticket) {
    const isNoData = !error && !ticket;
    const iconName = isNoData ? 'ticket-outline' : 'alert-circle-outline';
    const iconColor = isNoData
      ? (isDark ? colors.grey[40] : colors.grey[50])
      : (isDark ? colors.error.light : colors.error.main);
    const title = isNoData ? 'No Ticket Data' : 'Something Went Wrong';
    const message = isNoData
      ? 'The ticket information is not available at the moment. Please try again later.'
      : (error || 'Failed to load ticket details');

    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={headerGradient[0]} />
        <View style={[styles.headerContainer, styles.headerContainerLoading, { paddingTop: insets.top }]}>
          <LinearGradient colors={headerGradient} style={StyleSheet.absoluteFill} />
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleSection}>
              <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Ticket</Text>
            </View>
            <View style={styles.headerBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.emptyStateContainer}>
          <View
            style={[
              styles.emptyStateIconContainer,
              {
                backgroundColor: isNoData
                  ? (isDark ? colors.semiTransparent.white08 : colors.grey[5])
                  : (isDark ? colors.ticket.statusDark.completed.bg : colors.error.background),
              },
            ]}>
            <Icon name={iconName} size={ms(48)} color={iconColor} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: isDark ? colors.common.white : colors.grey[85] }]}>
            {title}
          </Text>
          <Text style={[styles.emptyStateMessage, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
            {message}
          </Text>
          <View style={styles.emptyStateActions}>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.primary.main }]}
              onPress={() => refetch()}
              activeOpacity={0.8}>
              <Icon name="refresh" size={ms(18)} color={colors.common.white} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.goBackBtn,
                {
                  backgroundColor: isDark ? colors.semiTransparent.white10 : colors.grey[5],
                  borderWidth: isDark ? 0 : 1,
                  borderColor: colors.grey[10],
                },
              ]}
              onPress={handleBack}
              activeOpacity={0.8}>
              <Icon name="arrow-left" size={ms(18)} color={isDark ? colors.common.white : colors.grey[60]} />
              <Text style={[styles.goBackBtnText, { color: isDark ? colors.common.white : colors.grey[60] }]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={headerGradient[0]} />


      <View style={[styles.staticHeaderBar, { paddingTop: insets.top, backgroundColor: headerGradient[0] }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-left" size={ms(22)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleSection}>
            <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Ticket</Text>
          </View>
          <View style={styles.headerIconRight}>
            <ConcreteTruck width={ms(40)} height={ms(40)} color={themeColors.text.primary} />
          </View>
        </View>
      </View>


      <View style={[
        styles.headerCard,
        { backgroundColor: themeColors.card }
      ]}>

        <View style={styles.headerCardTopRow}>
          <View style={styles.headerCardOrderInfo}>
            {apiOrderCode && (
              <Text style={[styles.headerCardOrderCode, { color: themeColors.text.secondary }]}>
                Order {apiOrderCode}
              </Text>
            )}
            {(customerName || projectName) && (
              <Text style={[styles.headerCardSubInfo, { color: themeColors.text.tertiary }]} numberOfLines={1}>
                {customerName}{customerName && projectName ? ' • ' : ''}{projectName}
              </Text>
            )}
          </View>
        </View>


        <View style={styles.headerCardMainRow}>
          <Text
            style={[styles.headerCardTicketNumber, { color: themeColors.text.primary }]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {apiTicketCode || '---'}
          </Text>
          <View style={[styles.headerCardStatusBadge, { backgroundColor: headerBadgeColors.bgColor }]}>
            <Icon name={statusInfo.icon} size={ms(9)} color={headerBadgeColors.iconColor} />
            <AppText
              numberOfLines={1}
              style={[styles.headerCardStatusText, { color: headerBadgeColors.textColor }]}>
              {statusInfo.label}
            </AppText>
          </View>
        </View>


        {(isCancelled && removeReasonCode) || (isAtPlant && timestamps.atPlant) ? (
          <View style={styles.headerCardInfoRow}>
            {isCancelled && removeReasonCode && (
              <Text style={[styles.headerCardInfoText, { color: themeColors.text.secondary }]}>
                Code: {removeReasonCode}
              </Text>
            )}
            {isAtPlant && timestamps.atPlant && (
              <Text style={[styles.headerCardInfoText, { color: themeColors.text.secondary }]}>
                {timestamps.atPlant}
              </Text>
            )}
          </View>
        ) : null}


        {timestamps.toJob && !timestamps.atJob && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={weatherLoading}
            onPress={async () => {
              const FIVE_MINUTES_MS = 5 * 60 * 1000;
              const tId = ticket?.ticket_id;

              // Check if cached fresh_weather is still valid (< 5 min)
              if (freshWeather?.fetched_at) {
                const age = Date.now() - new Date(freshWeather.fetched_at).getTime();
                if (age < FIVE_MINUTES_MS) {
                  navigation.navigate('Weather', {
                    orderCode: apiOrderCode || orderCode,
                    orderDate: orderDate,
                    orderStatus: currentStatus,
                    startTime: timestamps?.ticketed || undefined,
                    ticketCode: apiTicketCode || ticketCode,
                    freshWeather: freshWeather,
                  });
                  return;
                }
              }

              // Cache stale or missing — fetch fresh from API
              if (tId) {
                setWeatherLoading(true);
                try {
                  const res = await ticketService.fetchTicketWeather(String(tId));
                  const fresh = res.success ? res.data?.weather_data : null;
                  navigation.navigate('Weather', {
                    orderCode: apiOrderCode || orderCode,
                    orderDate: orderDate,
                    orderStatus: currentStatus,
                    startTime: timestamps?.ticketed || undefined,
                    ticketCode: apiTicketCode || ticketCode,
                    freshWeather: fresh || null,
                  });
                } catch (err) {
                  // Fallback to whatever we have
                  navigation.navigate('Weather', {
                    orderCode: apiOrderCode || orderCode,
                    orderDate: orderDate,
                    orderStatus: currentStatus,
                    startTime: timestamps?.ticketed || undefined,
                    ticketCode: apiTicketCode || ticketCode,
                    freshWeather: freshWeather || null,
                  });
                } finally {
                  setWeatherLoading(false);
                }
              }
            }}
            style={styles.headerCardWeatherRow}>
            {weatherData ? (
              <>
                <WeatherIcon icon={weatherData.weather_icon} size={22} />
                <Text
                  style={[styles.headerCardWeatherDescText, { color: themeColors.text.secondary }]}
                  numberOfLines={1}>
                  {weatherData.weather_description || 'Partly cloudy'}
                </Text>
                {weatherData.temperature_fahrenheit != null && (
                  <>
                    <View style={[styles.headerCardWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerCardWeatherInfoText, { color: themeColors.text.secondary }]}>
                      {Math.round(weatherData.temperature_fahrenheit)}°F
                    </Text>
                  </>
                )}
                {(weatherData.wind_speed_mph ?? weatherData.wind_speed) != null && (
                  <>
                    <View style={[styles.headerCardWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerCardWeatherInfoText, { color: themeColors.text.secondary }]}>
                      {weatherData.wind_speed_mph ?? weatherData.wind_speed} mph
                    </Text>
                  </>
                )}
                {weatherData.humidity != null && (
                  <>
                    <View style={[styles.headerCardWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerCardWeatherInfoText, { color: themeColors.text.secondary }]}>
                      {weatherData.humidity}% RH
                    </Text>
                  </>
                )}
                {(() => {
                  const concreteEvapLevel = freshWeather?.concrete_evaporation_level;
                  if (concreteEvapLevel) {
                    const concreteEvapColors: Record<string, string> = {
                      Low: colors.success.main,
                      Moderate: colors.warning.main,
                      High: '#F97316',
                      Critical: '#DC2626',
                    };
                    return (
                      <View
                        style={[
                          styles.headerCardEvapRateBadge,
                          { backgroundColor: concreteEvapColors[concreteEvapLevel] || colors.grey[40] },
                        ]}>
                        <Text style={styles.headerCardEvapRateText}>
                          {concreteEvapLevel}
                        </Text>
                      </View>
                    );
                  }
                  if (weatherData.evaporation_rate != null) {
                    return (
                      <View
                        style={[
                          styles.headerCardEvapRateBadge,
                          { backgroundColor: getEvaporationBgColor(weatherData.evaporation_rate) },
                        ]}>
                        <Text style={styles.headerCardEvapRateText}>
                          {getEvaporationText(weatherData.evaporation_rate)}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </>
            ) : (
              <>
                <Icon name="weather-cloudy" size={ms(16)} color={themeColors.text.hint} />
                <Text style={[styles.headerCardWeatherDescText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                  {weatherLoading ? 'Fetching...' : 'Evaporate'}
                </Text>
                {weatherLoading && <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />}
              </>
            )}
          </TouchableOpacity>
        )}

        {/* ETA feature temporarily disabled */}
        {/* {currentStatus === 'to_job' && (() => {
          const eta = etaResult || etaData;
          const hasEta = !!eta;
          const etaAge = eta?.calculatedAt ? Math.floor((Date.now() - new Date(eta.calculatedAt).getTime()) / 60000) : 0;
          const isStale = etaAge > 30;
          const etaArrival = eta?.arrivalTime ? new Date(eta.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--';
          const etaCalcTime = eta?.calculatedAt ? new Date(eta.calculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const orangeColor = '#F97316';

          const handleEtaCalc = async (force = false) => {
            if (isEtaCooldownActive()) return;
            const tId = ticket?.ticket_id;
            if (!tId) return;
            setEtaLoading(true);
            setEtaError(null);
            try {
              const res = await ticketService.calculateTicketETA(String(tId), force);
              if (res.success && res.data) {
                setEtaResult(res.data);
                setEtaExpanded(true);
                startEtaCooldown();
              } else {
                setEtaError((res as any)?.message || 'Failed to calculate ETA');
                setEtaExpanded(true);
              }
            } catch (err: any) {
              setEtaError(err?.response?.data?.message || err?.message || 'Failed to calculate ETA');
              setEtaExpanded(true);
            } finally {
              setEtaLoading(false);
            }
          };

          return (
            <View style={styles.etaSection} pointerEvents={etaLoading ? 'none' : 'auto'}>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={etaLoading}
                onPress={() => hasEta ? setEtaExpanded(prev => !prev) : handleEtaCalc()}
                style={[styles.etaHeader, { backgroundColor: isDark ? 'rgba(249,115,22,0.06)' : 'rgba(249,115,22,0.04)' }]}>
                <Icon name="navigation-variant" size={ms(13)} color={orangeColor} />
                <Text style={[styles.etaHeaderTitle, { color: isDark ? '#FED7AA' : '#7C2D12' }]}>ETA</Text>
                {hasEta && (
                  <Text style={[styles.etaHeaderPreview, { color: orangeColor }]}>{eta.durationFormatted} · {eta.distanceMiles} mi</Text>
                )}
                {isStale && hasEta && (
                  <View style={styles.etaStaleBadge}>
                    <Text style={styles.etaStaleText}>{etaAge}m ago</Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                {etaLoading ? (
                  <ActivityIndicator size="small" color={orangeColor} />
                ) : hasEta ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={etaCooldown > 0}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleEtaCalc(true)}>
                    {etaCooldown > 0 ? (
                      <Text style={[styles.etaCooldownText, { color: themeColors.text.hint }]}>{`${Math.floor(etaCooldown / 60).toString().padStart(2, '0')}:${(etaCooldown % 60).toString().padStart(2, '0')}`}</Text>
                    ) : (
                      <Icon name="refresh" size={ms(16)} color={orangeColor} />
                    )}
                  </TouchableOpacity>
                ) : null}
                <Icon name={etaExpanded ? 'chevron-up' : 'chevron-down'} size={ms(18)} color={themeColors.text.hint} />
              </TouchableOpacity>

              {!hasEta && etaError && etaExpanded && (
                <View style={[styles.etaExpandedRow, { paddingVertical: ms(6) }]}>
                  <Icon name="alert-circle-outline" size={ms(12)} color={colors.error.main} />
                  <Text style={[styles.etaInfoLabel, { color: themeColors.text.secondary, flex: 1 }]}>{etaError}</Text>
                </View>
              )}

              {hasEta && etaExpanded && (
                <View style={styles.etaExpandedWrap}>
                  <View style={styles.etaExpandedRow}>
                    <View style={styles.etaStat}>
                      <Icon name="clock-check-outline" size={ms(12)} color={orangeColor} />
                      <Text style={[styles.etaStatValue, { color: orangeColor }]}>{etaArrival}</Text>
                      <Text style={[styles.etaStatLabel, { color: themeColors.text.hint }]}>arrival</Text>
                    </View>
                    <View style={[styles.etaDivider, { backgroundColor: themeColors.text.hint + '30' }]} />
                    <View style={styles.etaStat}>
                      <Icon name="clock-fast" size={ms(12)} color={themeColors.text.secondary} />
                      <Text style={[styles.etaStatValue, { color: themeColors.text.primary }]}>{eta.durationFormatted}</Text>
                      <Text style={[styles.etaStatLabel, { color: themeColors.text.hint }]}>travel</Text>
                    </View>
                    <View style={[styles.etaDivider, { backgroundColor: themeColors.text.hint + '30' }]} />
                    <View style={styles.etaStat}>
                      <Icon name="map-marker-distance" size={ms(12)} color={themeColors.text.secondary} />
                      <Text style={[styles.etaStatValue, { color: themeColors.text.primary }]}>{eta.distanceMiles} mi</Text>
                      <Text style={[styles.etaStatLabel, { color: themeColors.text.hint }]}>{eta.distanceKm} km</Text>
                    </View>
                  </View>
                  <View style={styles.etaExpandedFooter}>
                    <Icon name="truck" size={ms(10)} color={themeColors.text.hint} />
                    <Text style={[styles.etaFooterText, { color: themeColors.text.hint }]}>Concrete Mixer · AWS Location Services</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()} */}
      </View>


      <View style={[styles.quickActionsRow, styles.quickActionsFixed, { backgroundColor: themeColors.background }]}>
        <QuickAction
          icon="map-marker-radius"
          label="Track"
          color={accentColor}
          onPress={handleTrackTruck}
          isDark={isDark}
          disabled={isAtPlant || isCancelled}
        />
        <QuickAction
          icon="qrcode"
          label="QR Code"
          color={isDark ? colors.success.light : colors.success.main}
          onPress={handleShowQRCode}
          isDark={isDark}
        />
        <QuickAction
          icon="refresh"
          label="Refresh"
          color={isDark ? colors.secondary.light : colors.secondary.main}
          onPress={() => refetch()}
          isDark={isDark}
        />
      </View>


      <ScrollView
        style={styles.fullScreenScrollView}
        contentContainerStyle={[
          styles.scrollContentWrapper,
          { paddingBottom: Math.max(vs(20), insets.bottom + GRID.md) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={themeColors.text.primary}
            colors={[colors.primary.main, colors.secondary.light]}
            progressBackgroundColor={themeColors.card}
          />
        }>
        <View
            style={[
              styles.progressCard,
              {
                backgroundColor: themeColors.card,
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : colors.grey[10],
              },
            ]}>
            <View style={styles.progressCardHeader}>
              <View style={styles.progressTitleRow}>
                <Icon name="package-variant" size={ms(18)} color={accentColor} />
                <Text style={[styles.progressCardTitle, { color: isDark ? colors.common.white : colors.grey[80] }]}>
                  Load Details
                </Text>
              </View>
              <View style={[styles.progressBadge, { backgroundColor: `${currentStatusColor}20` }]}>
                <Text style={[styles.progressBadgeText, { color: currentStatusColor }]}>{percentage.toFixed(1)}%</Text>
              </View>
            </View>

            <View style={styles.loadStatsRow}>
              <View style={styles.loadStatItem}>
                <Text style={[styles.loadStatValue, { color: accentColor }]}>
                  {runningQty.toFixed(2)}
                </Text>
                <Text style={[styles.loadStatLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  Running (CY)
                </Text>
              </View>
              <View style={[styles.loadStatDivider, { backgroundColor: isDark ? themeColors.border : colors.grey[15] }]} />
              <View style={styles.loadStatItem}>
                <Text style={[styles.loadStatValue, { color: isDark ? colors.common.white : colors.grey[85] }]}>
                  {orderedQty}
                </Text>
                <Text style={[styles.loadStatLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  Ordered (CY)
                </Text>
              </View>
              <View style={[styles.loadStatDivider, { backgroundColor: isDark ? themeColors.border : colors.grey[15] }]} />
              <View style={styles.loadStatItem}>
                <Text style={[styles.loadStatValue, { color: isDark ? colors.success.light : colors.success.main }]}>
                  {Math.max(orderedQty - runningQty, 0).toFixed(2)}
                </Text>
                <Text style={[styles.loadStatLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  Remaining (CY)
                </Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: `${currentStatusColor}20` }]}>
                <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: currentStatusColor }]} />
              </View>
            </View>

            <View style={[styles.loadInfoRow, { borderTopColor: isDark ? themeColors.border : colors.grey[15] }]}>
              <View style={[styles.loadInfoItem, { flex: 1 }]}>
                <Text style={[styles.loadInfoLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  Load
                </Text>
                <Text style={[styles.loadInfoValue, { color: isDark ? colors.common.white : colors.grey[85] }]}>
                  {loadNumber || '-'}
                </Text>
              </View>
              <View style={[styles.loadInfoItem, { flex: 1 }]}>
                <Text style={[styles.loadInfoLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  Amount
                </Text>
                <Text
                  style={[styles.loadInfoValue, { color: isDark ? colors.common.white : colors.grey[85] }]}
                  numberOfLines={1}>
                  {loadQty != null ? `${loadQty} CY` : '-'}
                </Text>
              </View>
            </View>
          </View>

          {productInfo && (
            <SectionCard
              title="Product Information"
              icon="beaker-outline"
              iconColor={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light}
              isDark={isDark}>
              <DetailRow label="Item Code" value={productInfo.code} isDark={isDark} />
              <DetailRow label="Description" value={productInfo.name} isDark={isDark} />
              <DetailRow label="Type" value={productInfo.isMix ? 'Mix Design' : 'Product'} isDark={isDark} isLast={!loadQty} />
              {loadQty !== undefined && loadQty !== null && (
                <DetailRow label="Load Amount" value={`${loadQty} CY`} isDark={isDark} isLast />
              )}
            </SectionCard>
          )}

          <SectionCard
            title="Delivery Location"
            icon="map-marker"
            iconColor={isDark ? colors.error.light : colors.error.main}
            isDark={isDark}>
            <DetailRow label="Address" value={deliveryAddress} isDark={isDark} />
            <DetailRow label="Customer" value={customerName} isDark={isDark} isLast />

            <View
              style={[
                styles.mapPreview,
                {
                  backgroundColor: isDark ? themeColors.surface : colors.grey[5],
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? 'transparent' : colors.grey[10],
                },
              ]}>
              <Icon name="domain" size={ms(32)} color={isDark ? colors.grey[40] : colors.grey[50]} />
              {projectName ? (
                <Text style={[styles.mapPreviewText, { color: isDark ? colors.grey[40] : colors.grey[50] }]} numberOfLines={2}>
                  {projectName}
                </Text>
              ) : null}
            </View>
          </SectionCard>

          <SectionCard
            title="Truck & Driver"
            icon="truck"
            iconColor={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light}
            isDark={isDark}>
            <DetailRow label="Truck Code" value={truckCode} isDark={isDark} />
            <DetailRow label="Description" value={truckDescription} isDark={isDark} />
            <DetailRow label="Driver Code" value={driverCode} isDark={isDark} />
            <DetailRow label="Driver Phone" value={driverPhone} isDark={isDark} isLast />
          </SectionCard>

          <SectionCard
            title="Plant Information"
            icon="domain"
            iconColor={isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light}
            isDark={isDark}>
            <DetailRow label="Plant" value={plantName} isDark={isDark} />
            <DetailRow label="Code" value={plantCode} isDark={isDark} />
            <DetailRow label="Address" value={plantAddress} isDark={isDark} />
            <DetailRow label="Phone" value={plantPhone} isDark={isDark} isLast />
          </SectionCard>

          <DeliveryMetricsCard
            spacingMinutes={deliveryMetrics?.spacing_minutes || null}
            waitingMinutes={deliveryMetrics?.waiting_minutes || null}
            pourMinutes={deliveryMetrics?.pour_minutes || null}
            performanceMinutes={deliveryMetrics?.performance_minutes || null}
            idleMinutes={deliveryMetrics?.idle_minutes || null}
            isDark={isDark}
          />

          {verifiJson && (
            <VerifiDataCard verifiJson={verifiJson} isDark={isDark} />
          )}

          <SectionCard
            title="Delivery Timeline"
            icon="timeline-clock"
            iconColor={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light}
            isDark={isDark}>
            <VerticalTimeline
              timestamps={timestamps}
              durations={durations}
              currentStatus={currentStatus}
              isDark={isDark}
            />
          </SectionCard>
      </ScrollView>

      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />

      <Modal
        visible={showDirectionsMenu}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeDirectionsMenu}
      >
        <View style={styles.directionsModalContainer}>

          <TouchableOpacity
            style={styles.directionsModalBackdrop}
            activeOpacity={1}
            onPress={closeDirectionsMenu}
          />

          <View style={[styles.directionsMenuContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.directionsMenuHandle}>
              <View style={[styles.directionsMenuHandleBar, { backgroundColor: themeColors.border }]} />
            </View>

            <Text style={[styles.directionsMenuTitle, { color: themeColors.text.primary }]}>
              Open Location In
            </Text>

            <View style={styles.directionsMenuOptions}>
              <TouchableOpacity
                style={[styles.directionsMenuItem, { backgroundColor: isDark ? colors.grey[60] + '20' : colors.grey[5] }]}
                onPress={handleOpenInAppMap}
                activeOpacity={0.7}
              >
                <View style={[styles.directionsMenuIconBox, { backgroundColor: colors.primary.main + '20' }]}>
                  <Icon name="map-marker-radius" size={ms(24)} color={colors.primary.main} />
                </View>
                <View style={styles.directionsMenuItemText}>
                  <Text style={[styles.directionsMenuItemTitle, { color: themeColors.text.primary }]}>
                    Track in App
                  </Text>
                  <Text style={[styles.directionsMenuItemSubtitle, { color: themeColors.text.secondary }]}>
                    View truck location in the app
                  </Text>
                </View>
                <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.directionsMenuItem, { backgroundColor: isDark ? colors.grey[60] + '20' : colors.grey[5] }]}
                onPress={handleOpenInGoogleMaps}
                activeOpacity={0.7}
              >
                <View style={[styles.directionsMenuIconBox, { backgroundColor: colors.brands.googleMaps + '20' }]}>
                  <Icon name="google-maps" size={ms(24)} color={colors.brands.googleMaps} />
                </View>
                <View style={styles.directionsMenuItemText}>
                  <Text style={[styles.directionsMenuItemTitle, { color: themeColors.text.primary }]}>
                    Google Maps
                  </Text>
                  <Text style={[styles.directionsMenuItemSubtitle, { color: themeColors.text.secondary }]}>
                    {orderLocationLatitude && orderLocationLongitude
                      ? 'Get directions to job site'
                      : 'View truck location'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.directionsMenuItem, { backgroundColor: isDark ? colors.grey[60] + '20' : colors.grey[5] }]}
                  onPress={handleOpenInAppleMaps}
                  activeOpacity={0.7}
                >
                  <View style={[styles.directionsMenuIconBox, { backgroundColor: colors.brands.appleMaps + '20' }]}>
                    <Icon name="apple" size={ms(24)} color={isDark ? colors.common.white : colors.brands.appleMaps} />
                  </View>
                  <View style={styles.directionsMenuItemText}>
                    <Text style={[styles.directionsMenuItemTitle, { color: themeColors.text.primary }]}>
                      Apple Maps
                    </Text>
                    <Text style={[styles.directionsMenuItemSubtitle, { color: themeColors.text.secondary }]}>
                      {orderLocationLatitude && orderLocationLongitude
                        ? 'Get directions to job site'
                        : 'View truck location'}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.directionsMenuCancelBtn, { borderTopColor: themeColors.border }]}
              onPress={closeDirectionsMenu}
              activeOpacity={0.7}
            >
              <Text style={[styles.directionsMenuCancelText, { color: colors.error.main }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <View style={{ height: insets.bottom }} />
          </View>
        </View>
      </Modal>


      <Modal
        visible={showQRCodeModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeQRCodeModal}
      >
        <View style={styles.qrModalContainer}>
          <TouchableOpacity
            style={styles.qrModalBackdrop}
            activeOpacity={1}
            onPress={closeQRCodeModal}
          />
          <View style={[styles.qrModalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, { color: themeColors.text.primary }]}>
                Ticket QR Code
              </Text>
              <TouchableOpacity
                style={[styles.qrModalCloseBtn, { backgroundColor: isDark ? colors.grey[60] + '20' : colors.grey[10] }]}
                onPress={closeQRCodeModal}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={ms(20)} color={themeColors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.qrCodeWrapper, { backgroundColor: colors.common.white }]}>
              <QRCode
                value={apiTicketCode || ticketCode || 'N/A'}
                size={Math.min(Dimensions.get('window').width * 0.45, ms(160))}
                backgroundColor={colors.common.white}
                color={colors.grey[85]}
              />
            </View>

            <View style={styles.qrTicketInfo}>
              <Text style={[styles.qrTicketLabel, { color: themeColors.text.secondary }]}>
                Ticket Number
              </Text>
              <Text style={[styles.qrTicketCode, { color: themeColors.text.primary }]}>
                {apiTicketCode || ticketCode || '---'}
              </Text>
            </View>

                      </View>
        </View>
      </Modal>
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
    padding: GRID.xl,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(16),
    textAlign: 'center',
    marginTop: GRID.md,
    marginBottom: GRID.lg,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: GRID.xl,
  },
  emptyStateIconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GRID.lg,
  },
  emptyStateTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
    textAlign: 'center',
    marginBottom: GRID.sm,
  },
  emptyStateMessage: {
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    textAlign: 'center',
    lineHeight: ms(20),
    marginBottom: GRID.xl,
    paddingHorizontal: GRID.md,
  },
  emptyStateActions: {
    flexDirection: 'row',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
    marginRight: GRID.sm,
  },
  retryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
    marginLeft: GRID.sm,
  },
  goBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
  },
  goBackBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    marginLeft: GRID.sm,
  },
  staticHeaderBar: {
    zIndex: 10,
  },
  headerContainer: {
    paddingBottom: GRID.lg,
  },
  headerContainerLoading: {
    paddingBottom: GRID.md,
  },

  headerCard: {
    marginHorizontal: GRID.md,
    marginTop: GRID.sm,
    marginBottom: GRID.xs,
    paddingHorizontal: GRID.md,
    paddingVertical: GRID.sm + 2,
    borderRadius: RADIUS.lg,
  },
  headerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: GRID.xs,
  },
  headerCardOrderInfo: {
    flex: 1,
    marginRight: GRID.sm,
  },
  headerCardOrderCode: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  headerCardSubInfo: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginTop: ms(1),
  },
  headerCardEtaBadge: {
    paddingHorizontal: GRID.sm,
    paddingVertical: GRID.xs,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  headerCardEtaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerCardEtaValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(13),
    marginTop: ms(-1),
  },
  headerCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCardTicketNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(22),
    flex: 1,
  },
  headerCardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(3),
    paddingHorizontal: ms(7),
    borderRadius: ms(9),
    marginLeft: GRID.sm,
  },
  headerCardStatusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(9),
    marginLeft: ms(3),
  },
  headerCardInfoRow: {
    marginTop: GRID.xs,
  },
  headerCardInfoText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
  },
  headerCardWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(8),
    paddingTop: ms(8),
    gap: ms(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.semiTransparent.black08,
  },
  weatherEmoji: {
    fontSize: ms(14),
  },
  headerCardWeatherDescText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    maxWidth: ms(80),
  },
  headerCardWeatherDot: {
    width: ms(2),
    height: ms(2),
    borderRadius: ms(1),
  },
  headerCardWeatherInfoText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  headerCardEvapRateBadge: {
    paddingHorizontal: ms(8),
    borderRadius: ms(10),
    marginLeft: ms(4),
  },
  headerCardEvapRateText: {
    fontSize: ms(8),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    lineHeight: ms(13),
  },
  // ETA styles temporarily disabled
  // etaSection: {
  //   marginTop: ms(6),
  //   borderRadius: ms(10),
  //   overflow: 'hidden',
  //   borderWidth: 1,
  //   borderColor: 'rgba(249,115,22,0.15)',
  // },
  // etaHeader: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   paddingVertical: ms(7),
  //   paddingHorizontal: ms(8),
  //   gap: ms(8),
  // },
  // etaHeaderTitle: {
  //   fontFamily: fontFamily.semiBold,
  //   fontSize: ms(13),
  // },
  // etaHeaderPreview: {
  //   fontFamily: fontFamily.semiBold,
  //   fontSize: ms(12),
  // },
  // etaStaleBadge: {
  //   backgroundColor: 'rgba(217,119,6,0.15)',
  //   paddingHorizontal: ms(4),
  //   paddingVertical: ms(1),
  //   borderRadius: ms(6),
  // },
  // etaStaleText: {
  //   fontFamily: fontFamily.medium,
  //   fontSize: ms(8),
  //   color: '#D97706',
  // },
  // etaCooldownText: {
  //   fontFamily: fontFamily.medium,
  //   fontSize: ms(10),
  // },
  // etaInfoLabel: {
  //   fontFamily: fontFamily.regular,
  //   fontSize: ms(11),
  // },
  // etaExpandedWrap: {
  //   paddingHorizontal: ms(8),
  //   paddingBottom: ms(6),
  // },
  // etaExpandedRow: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   paddingVertical: ms(5),
  //   gap: ms(4),
  // },
  // etaStat: {
  //   flex: 1,
  //   alignItems: 'center',
  //   gap: ms(1),
  // },
  // etaStatValue: {
  //   fontFamily: fontFamily.semiBold,
  //   fontSize: ms(14),
  // },
  // etaStatLabel: {
  //   fontFamily: fontFamily.regular,
  //   fontSize: ms(11),
  // },
  // etaDivider: {
  //   width: 1,
  //   height: ms(24),
  // },
  // etaExpandedFooter: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: ms(3),
  //   paddingTop: ms(3),
  //   borderTopWidth: StyleSheet.hairlineWidth,
  //   borderTopColor: 'rgba(249,115,22,0.15)',
  // },
  // etaFooterText: {
  //   fontFamily: fontFamily.regular,
  //   fontSize: ms(10),
  // },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    paddingTop: GRID.sm,
    marginBottom: GRID.sm,
    minHeight: ms(44),
  },
  headerBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    backgroundColor: colors.headerOverlay.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnPlaceholder: {
    width: ms(40),
    height: ms(40),
  },
  headerIconRight: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleInline: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(17),
    color: colors.common.white,
    marginLeft: GRID.sm,
    ...Platform.select({
      ios: { lineHeight: ms(22) },
      android: {},
    }),
  },
  headerBarRight: {
    flex: 1,
  },
  headerSubtitleSection: {
    alignItems: 'center',
    paddingHorizontal: GRID.md,
    marginTop: GRID.xs,
  },
  headerTitleSection: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: GRID.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(17),
    color: colors.common.white,
    ...Platform.select({
      ios: { lineHeight: ms(22) },
      android: {},
    }),
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: colors.headerOverlay.text,
    marginTop: ms(2),
    ...Platform.select({
      ios: { lineHeight: ms(14) },
      android: {},
    }),
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(2),
  },
  headerSubtitleWithIcon: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: colors.headerOverlay.text,
    marginLeft: ms(4),
    ...Platform.select({
      ios: { lineHeight: ms(14) },
      android: {},
    }),
  },

  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.lg,
    paddingTop: GRID.sm,
    paddingBottom: GRID.md,
    minHeight: ms(100),
  },
  heroLeft: {
    flex: 1,
    marginRight: GRID.md,
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: GRID.xs,
  },
  ticketNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.xs,
  },
  ticketLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    color: colors.headerOverlay.text,
    letterSpacing: 1,
    marginLeft: GRID.xs,
    ...Platform.select({
      ios: { lineHeight: ms(12) },
      android: {},
    }),
  },
  ticketNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(28),
    color: colors.common.white,
    marginBottom: GRID.sm,
    ...Platform.select({
      ios: { lineHeight: ms(34) },
      android: {},
    }),
  },
  statusBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: ms(5),
    paddingHorizontal: ms(12),
    borderRadius: ms(16),
  },
  statusBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    marginLeft: ms(6),
    ...Platform.select({
      ios: { lineHeight: ms(16) },
      android: {},
    }),
  },
  voidedReasonRow: {
    marginTop: GRID.xs,
  },
  voidedReasonText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
    color: colors.headerOverlay.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: GRID.xs + 2,
    paddingLeft: GRID.sm,
    paddingRight: GRID.md,
    borderRadius: RADIUS.xl,
    maxWidth: '100%',
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
    marginLeft: GRID.xs,
  },
  etaBadge: {
    backgroundColor: colors.headerOverlay.bgHover,
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  etaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    color: colors.headerOverlay.text,
  },
  etaValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
    color: colors.common.white,
  },
  truckIconContainer: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    backgroundColor: colors.headerOverlay.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenScrollView: {
    flex: 1,
  },
  fullScreenScrollContent: {
    flexGrow: 1,
  },
  scrollContentWrapper: {
    padding: GRID.md,
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID.md,
    flexGrow: 1,
  },
  customerProjectCard: {
    borderRadius: RADIUS.md,
    padding: GRID.md,
    marginBottom: GRID.md,
    gap: GRID.sm,
  },
  customerProjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
  },
  customerProjectText: {
    fontSize: ms(14),
    fontFamily: fontFamily.medium,
    flex: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: GRID.md,
    ...Platform.select({
      ios: {},
      android: { gap: GRID.sm },
    }),
  },
  quickActionsFixed: {
    paddingHorizontal: GRID.md,
    paddingTop: GRID.sm,
    marginBottom: GRID.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: GRID.md,
    paddingHorizontal: GRID.xs,
    borderRadius: RADIUS.md,
    marginHorizontal: Platform.OS === 'ios' ? GRID.xs / 2 : 0,
    minHeight: ms(80),
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickActionIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GRID.xs,
  },
  quickActionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    textAlign: 'center',
    ...Platform.select({
      ios: { lineHeight: ms(14) },
      android: {},
    }),
  },
  progressCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    marginLeft: GRID.sm,
  },
  progressBadge: {
    paddingVertical: GRID.xs - 2,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.xl,
  },
  progressBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
  },
  loadStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  loadStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  loadStatValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(20),
  },
  loadStatLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginTop: ms(2),
  },
  loadStatDivider: {
    width: 1,
    height: ms(30),
  },
  progressBarContainer: {
    marginTop: GRID.xs,
  },
  progressBarBg: {
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: ms(3),
  },
  loadInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: GRID.md,
    paddingTop: GRID.md,
    borderTopWidth: 1,
  },
  loadInfoItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ms(80),
  },
  loadInfoLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
    marginBottom: vs(2),
    textAlign: 'center',
  },
  loadInfoValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  sectionIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: GRID.sm,
    minHeight: ms(36),
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailIcon: {
    marginRight: GRID.sm,
    marginTop: Platform.OS === 'ios' ? ms(2) : 0,
  },
  detailLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    flexShrink: 0,
    marginRight: GRID.sm,
    ...Platform.select({
      ios: { lineHeight: ms(18) },
      android: {},
    }),
  },
  detailValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    textAlign: 'right',
    flex: 1,
    ...Platform.select({
      ios: { lineHeight: ms(18) },
      android: {},
    }),
  },
  mapPreview: {
    height: ms(80),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: GRID.md,
    paddingHorizontal: GRID.md,
  },
  mapPreviewText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
    marginTop: GRID.xs,
    textAlign: 'center',
    paddingHorizontal: GRID.sm,
  },
  callCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: GRID.md,
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.md,
    borderRadius: RADIUS.md,
    minHeight: ms(44),
  },
  callCustomerText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    marginLeft: GRID.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: ms(48),
  },
  timelineLeft: {
    width: ms(36),
    alignItems: 'center',
  },
  timelineIcon: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineIconActive: {
    transform: [{ scale: 1.1 }],
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  timelineVerticalLine: {
    width: ms(2),
    flex: 1,
    marginVertical: ms(2),
  },
  durationRow: {
    paddingBottom: ms(4),
  },
  durationText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  timelineContent: {
    flex: 1,
    paddingLeft: GRID.sm,
    paddingBottom: GRID.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStepLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    ...Platform.select({
      ios: { lineHeight: ms(16) },
      android: {},
    }),
  },
  timelineTime: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    ...Platform.select({
      ios: { lineHeight: ms(14) },
      android: {},
    }),
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: GRID.xs,
  },
  activeDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    marginRight: GRID.xs,
  },
  activeText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
  },
  actionSection: {
    marginTop: GRID.sm,
    marginBottom: GRID.md,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryBtnContainer: {
    minHeight: ms(52),
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  primaryBtnContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.lg,
    paddingHorizontal: GRID.md,
    minHeight: ms(52),
  },
  primaryBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.lg,
    paddingHorizontal: GRID.md,
    minHeight: ms(52),
  },
  primaryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: colors.common.white,
    marginLeft: GRID.sm,
    ...Platform.select({
      ios: { lineHeight: ms(20) },
      android: {},
    }),
  },
  secondaryBtnsRow: {
    flexDirection: 'row',
    ...Platform.select({
      ios: {},
      android: { gap: GRID.md },
    }),
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: GRID.md,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.md,
    marginHorizontal: Platform.OS === 'ios' ? GRID.xs / 2 : 0,
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  secondaryBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  directionsModalContainer: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  directionsModalBackdrop: {
    flex: 1,
  },
  directionsMenuContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  directionsMenuHandle: {
    alignItems: 'center',
    paddingTop: GRID.sm,
    paddingBottom: GRID.xs,
  },
  directionsMenuHandleBar: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
  },
  directionsMenuTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
    textAlign: 'center',
    marginBottom: GRID.md,
  },
  directionsMenuOptions: {
    paddingHorizontal: GRID.md,
  },
  directionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
    borderRadius: RADIUS.md,
    marginBottom: GRID.sm,
  },
  directionsMenuIconBox: {
    width: ms(48),
    height: ms(48),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.md,
  },
  directionsMenuItemText: {
    flex: 1,
  },
  directionsMenuItemTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    marginBottom: ms(2),
  },
  directionsMenuItemSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  directionsMenuCancelBtn: {
    marginTop: GRID.md,
    marginHorizontal: GRID.md,
    paddingTop: GRID.md,
    borderTopWidth: 1,
    alignItems: 'center',
    paddingVertical: GRID.md,
  },
  directionsMenuCancelText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
  },
  deliveryMetricsCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  deliveryMetricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  deliveryMetricsIconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  deliveryMetricsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
  },
  deliveryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: GRID.sm,
    marginBottom: GRID.sm,
  },
  deliveryMetricsRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deliveryMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.sm + 2,
    borderRadius: RADIUS.md,
  },
  deliveryMetricCardCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
    paddingHorizontal: GRID.md,
    borderRadius: RADIUS.md,
    minWidth: '48%',
  },
  deliveryMetricCardIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  deliveryMetricCardContent: {
    flex: 1,
  },
  deliveryMetricCardValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(13),
  },
  deliveryMetricCardLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    marginTop: ms(2),
  },
  deliveryMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deliveryMetricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: GRID.xs,
  },
  deliveryMetricIconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GRID.xs,
  },
  deliveryMetricValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
    marginBottom: ms(2),
  },
  deliveryMetricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    textAlign: 'center',
  },
  qrModalContainer: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  qrModalContent: {
    borderRadius: RADIUS.xl,
    padding: GRID.md,
    marginHorizontal: GRID.xl,
    maxWidth: ms(280),
    width: '85%',
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: GRID.md,
    paddingLeft: GRID.xs,
  },
  qrModalTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
  },
  qrModalCloseBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeWrapper: {
    alignSelf: 'center',
    padding: GRID.md,
    borderRadius: RADIUS.md,
    marginBottom: GRID.md,
  },
  qrTicketInfo: {
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  qrTicketLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    marginBottom: GRID.xs,
  },
  qrTicketCode: {
    fontFamily: fontFamily.bold,
    fontSize: ms(20),
    letterSpacing: 1,
  },
  // Verifi Modern Card-Based Styles
  vfContainer: {
    marginBottom: GRID.md,
  },
  vfMainCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.sm,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  vfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: GRID.md,
  },
  vfHeaderIcon: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  vfHeaderText: {
    flex: 1,
  },
  vfHeaderTitle: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  vfHeaderSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(2),
  },
  vfModeBadge: {
    paddingHorizontal: GRID.sm,
    paddingVertical: ms(4),
    borderRadius: RADIUS.sm,
  },
  vfModeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
  },
  vfMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID.sm,
    marginBottom: GRID.md,
  },
  vfMetricCard: {
    width: '47%',
    padding: GRID.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  vfMetricIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: GRID.xs,
  },
  vfMetricValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
    textAlign: 'center',
    marginBottom: ms(2),
  },
  vfMetricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    textAlign: 'center',
  },
  vfQuickInfo: {
    borderRadius: RADIUS.md,
    padding: GRID.sm,
    gap: GRID.xs,
  },
  vfQuickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.sm,
    paddingVertical: GRID.xs,
  },
  vfQuickInfoValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    flex: 1,
  },
  vfCollapsible: {
    borderRadius: RADIUS.lg,
    marginBottom: GRID.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vfCollapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
  },
  vfCollapsibleIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GRID.sm,
  },
  vfCollapsibleTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    flex: 1,
  },
  vfCollapsibleContent: {
    paddingHorizontal: GRID.md,
    paddingBottom: GRID.md,
  },
  vfDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: GRID.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.semiTransparent.black08,
  },
  vfDataLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    flex: 1,
  },
  vfDataValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    textAlign: 'right',
  },
  vfSubsectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    marginBottom: GRID.xs,
    marginTop: GRID.sm,
  },
  vfDivider: {
    height: 1,
    marginVertical: GRID.sm,
  },
  vfTimelineContainer: {
    paddingLeft: GRID.xs,
  },
  vfStageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    paddingBottom: GRID.sm,
  },
  vfStageDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    marginTop: ms(4),
    marginRight: GRID.sm,
  },
  vfStageContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vfStageLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  vfStageValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
  },
  vfStageLine: {
    position: 'absolute',
    left: ms(4),
    top: ms(16),
    width: 2,
    height: '100%',
  },
  vfTempFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: GRID.sm,
  },
  vfTempCard: {
    flex: 1,
    alignItems: 'center',
    padding: GRID.sm,
    borderRadius: RADIUS.md,
  },
  vfTempCardValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
    marginTop: GRID.xs,
  },
  vfTempCardLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginTop: ms(2),
  },
  vfRevsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: GRID.sm,
  },
  vfRevsCard: {
    alignItems: 'center',
    padding: GRID.sm,
    borderRadius: RADIUS.md,
  },
  vfRevsCircle: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vfRevsNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(14),
  },
  vfRevsLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
    marginTop: GRID.xs,
  },
  });

export default TicketDetailScreen;
