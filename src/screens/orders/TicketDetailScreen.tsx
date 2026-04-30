import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
<<<<<<< Updated upstream
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
=======
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import { RootStackParamList, TicketDetailScreenParams } from '../../navigation/types';

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;
type TicketStatus = TicketDetailScreenParams['status'];

// Design constants
const GRID = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24 };

// Gradient colors
const HEADER_GRADIENT = ['#1565C0', '#1976D2', '#2196F3'];

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  progressStep: number;
}

const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  at_plant: {
    label: 'At Plant',
    icon: 'factory',
    color: '#FF9800',
    bgColor: '#FFF3E0',
    progressStep: 0,
  },
  in_transit: {
    label: 'In Transit',
    icon: 'truck-fast',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    progressStep: 1,
  },
  at_site: {
    label: 'At Site',
    icon: 'map-marker-check',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    progressStep: 2,
  },
  pouring: {
    label: 'Pouring',
    icon: 'water',
    color: '#00BCD4',
    bgColor: '#E0F7FA',
    progressStep: 3,
  },
  completed: {
    label: 'Completed',
    icon: 'check-circle',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    progressStep: 4,
  },
  returning: {
    label: 'Returning',
    icon: 'truck-delivery',
    color: '#607D8B',
    bgColor: '#ECEFF1',
    progressStep: 4,
  },
};

const TIMELINE_STEPS = [
  { key: 'at_plant', label: 'At Plant', icon: 'factory', time: '07:30 AM' },
  { key: 'in_transit', label: 'In Transit', icon: 'truck-fast', time: '07:45 AM' },
  { key: 'at_site', label: 'At Site', icon: 'map-marker-check', time: '08:15 AM' },
  { key: 'pouring', label: 'Pouring', icon: 'water', time: '08:20 AM' },
  { key: 'completed', label: 'Completed', icon: 'check-circle', time: '08:45 AM' },
];

// Section Card Component
interface SectionCardProps {
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  isDark: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, icon, iconColor, children, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBox, { backgroundColor: `${iconColor}15` }]}>
          <Icon name={icon} size={ms(18)} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

// Detail Row Component
interface DetailRowProps {
  label: string;
  value?: string;
  icon?: string;
  iconColor?: string;
  isDark: boolean;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, icon, iconColor, isDark, isLast }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  if (!value) return null;

  return (
    <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
      {icon && (
        <Icon
          name={icon}
          size={ms(16)}
          color={iconColor || themeColors.text.hint}
          style={styles.detailIcon}
        />
      )}
      <Text style={[styles.detailLabel, { color: themeColors.text.hint }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: themeColors.text.primary }]}>{value}</Text>
    </View>
  );
};

// Vertical Timeline Component
interface VerticalTimelineProps {
  currentStep: number;
  isDark: boolean;
}

<<<<<<< Updated upstream
const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ currentStep, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
=======
const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ timestamps, durations, currentStatus, isDark }) => {
  const { t } = useTranslation();
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

      return value.replace(/\b1 minutes\b/g, `1 ${t('tickets.detail.minute')}`);
    }

    if (value < 60) {
      return `${value} ${value !== 1 ? t('tickets.detail.minutes') : t('tickets.detail.minute')}`;
    }
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    if (mins > 0) {
      return `${hours} ${hours !== 1 ? t('tickets.detail.hours') : t('tickets.detail.hour')} ${mins} ${mins !== 1 ? t('tickets.detail.minutes') : t('tickets.detail.minute')}`;
    }
    return `${hours} ${hours !== 1 ? t('tickets.detail.hours') : t('tickets.detail.hour')}`;
  };

  const statusOrder = TIMELINE_STEPS.map(s => s.key);
  const currentIndex = statusOrder.indexOf(currentStatus);


  const getNextStepDuration = (index: number): string | number | null => {
    if (index >= TIMELINE_STEPS.length - 1) return null;
    const nextStep = TIMELINE_STEPS[index + 1];
    return getDurationForStep(nextStep.key);
  };
>>>>>>> Stashed changes

  return (
    <View style={styles.verticalTimeline}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = index <= currentStep;
        const isActive = index === currentStep;
        const stepColor = isCompleted ? '#4CAF50' : themeColors.border;

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
                  isActive && styles.timelineIconActive,
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
                    { backgroundColor: index < currentStep ? '#4CAF50' : themeColors.border },
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text
                  style={[
                    styles.timelineStepLabel,
                    { color: isCompleted ? themeColors.text.primary : themeColors.text.hint },
                    isActive && { fontFamily: fontFamily.semiBold, color: '#1976D2' },
                  ]}>
                  {step.label}
                </Text>
                {isCompleted && (
                  <Text style={[styles.timelineTime, { color: themeColors.text.hint }]}>
                    {step.time}
                  </Text>
                )}
              </View>
              {isActive && (
                <View style={styles.activeIndicator}>
<<<<<<< Updated upstream
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Current Status</Text>
=======
                  <View style={[styles.activeDot, { backgroundColor: activeColor }]} />
                  <Text style={[styles.activeText, { color: activeColor }]}>{t('tickets.detail.currentStatus')}</Text>
                </View>
              )}
              {nextDuration !== null && isCompleted && (
                <View style={styles.durationRow}>
                  <Text style={[styles.durationText, { color: durationColor }]}>
                    -- {formatDuration(nextDuration)}
                  </Text>
>>>>>>> Stashed changes
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Quick Action Button Component
interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  isDark: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, color, onPress, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: themeColors.card }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={ms(20)} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: themeColors.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
};

<<<<<<< Updated upstream
export const TicketDetailScreen: React.FC = () => {
  const navigation = useNavigation();
=======
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
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;

  const parseMinutes = (value: string | null): string => {
    if (!value || value === '--') return '--';
    const match = value.match(/(-?\d+)/);
    return match ? `${match[1]} ${t('tickets.detail.min')}` : value;
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
      label: t('tickets.detail.spacing'),
      color: isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light,
    },
    {
      icon: 'timer-sand',
      value: parseMinutes(waitingMinutes),
      label: t('tickets.detail.waiting'),
      color: isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light,
    },
    {
      icon: 'speedometer',
      value: parseMinutes(performanceMinutes),
      label: t('tickets.detail.performance'),
      color: isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light,
    },
    {
      icon: 'water',
      value: parseMinutes(pourMinutes),
      label: t('tickets.detail.pourOut'),
      color: isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light,
    },
    {
      icon: 'timer-off',
      value: parseMinutes(idleMinutes),
      label: t('tickets.detail.idle'),
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
        <Text style={[styles.deliveryMetricsTitle, { color: titleColor }]}>{t('tickets.detail.deliveryMetrics')}</Text>
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
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const themeColors = isDark ? colors.dark : colors.light;
  const titleColor = isDark ? colors.common.white : colors.grey[80];
  const labelColor = isDark ? colors.grey[40] : colors.grey[60];
  const valueColor = isDark ? colors.common.white : colors.grey[85];
  const cardBgColor = isDark ? themeColors.surface : colors.grey[5];
  const borderColor = isDark ? colors.semiTransparent.white08 : colors.grey[10];
  const accentColor = isDark ? colors.primary.light : colors.primary.main;

  const sections: VerifiSectionData[] = [
    { key: 'timing', title: t('tickets.detail.timingEvents'), icon: 'clock-outline', color: isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light },
    { key: 'slump', title: t('tickets.detail.slumpAndAge'), icon: 'waves', color: isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light },
    { key: 'temp', title: t('tickets.detail.temperature'), icon: 'thermometer', color: isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light },
    { key: 'mix', title: t('tickets.detail.mixAndWater'), icon: 'beaker-outline', color: isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light },
    { key: 'revs', title: t('tickets.detail.drumRevolutions'), icon: 'rotate-3d-variant', color: isDark ? colors.success.light : colors.success.main },
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
            <Text style={[styles.vfHeaderTitle, { color: titleColor }]}>{t('tickets.detail.verifiData')}</Text>
            <Text style={[styles.vfHeaderSubtitle, { color: labelColor }]}>
              {verifiJson.ticketNumber || t('tickets.detail.ticketLabel')} • {verifiJson.ticketDate || ''}
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
            label={t('tickets.detail.loadSize')}
            color={isDark ? colors.success.light : colors.success.main}
          />
          <MetricCard
            icon="beaker"
            value={verifiJson.mixCodeName || '--'}
            label={t('tickets.detail.mixCode')}
            color={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light}
          />
          <MetricCard
            icon="timer-outline"
            value={verifiJson.startToEndTotalMinutes || '--'}
            label={t('tickets.detail.duration')}
            color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light}
          />
          <MetricCard
            icon="thermometer"
            value={formatTemperature(verifiJson.temperatureAtDischarge)}
            label={t('tickets.detail.tempAtDischarge')}
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
          <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.plant')}</Text>
          <StageIndicator label={t('tickets.detail.ticketReceived')} value={verifiJson.ticketReceived || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
          <StageIndicator label={t('tickets.detail.loading')} value={verifiJson.loading || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
          <StageIndicator label={t('tickets.detail.loaded')} value={verifiJson.loaded || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
          <StageIndicator label={t('tickets.detail.leavePlant')} value={verifiJson.leavePlant || '--'} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} isLast />
        </View>
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <View style={styles.vfTimelineContainer}>
          <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.jobSite')}</Text>
          <StageIndicator label={t('tickets.detail.arriveSite')} value={verifiJson.arriveSite || verifiJson.calculatedArriveSite || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
          <StageIndicator label={t('tickets.detail.beginPour')} value={verifiJson.beginPour || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
          <StageIndicator label={t('tickets.detail.endPour')} value={verifiJson.endPour || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
          <StageIndicator label={t('tickets.detail.leaveSite')} value={verifiJson.leaveSite || '--'} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} isLast />
        </View>
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <View style={styles.vfTimelineContainer}>
          <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.return')}</Text>
          <StageIndicator label={t('tickets.detail.returnPlant')} value={verifiJson.returnPlant || '--'} color={isDark ? colors.success.light : colors.success.main} isLast />
        </View>
      </CollapsibleSection>

      <CollapsibleSection section={sections[1]}>
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.slumpReadings')}</Text>
        <DataRow label={t('tickets.detail.targetFromTicket')} value={formatSlump(verifiJson.slumpFromTicket)} highlight />
        <DataRow label={t('tickets.detail.atLeavePlant')} value={formatSlump(verifiJson.slumpAtLeavePlant)} />
        <DataRow label={t('tickets.detail.atArrival')} value={formatSlump(verifiJson.slumpAtArrival)} />
        <DataRow label={t('tickets.detail.atDischarge')} value={formatSlump(verifiJson.slumpAtDischarge)} />
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.concreteAge')}</Text>
        <DataRow label={t('tickets.detail.atLeavePlant')} value={formatAge(verifiJson.ageAtLeavePlantMinutes)} />
        <DataRow label={t('tickets.detail.atDischarge')} value={formatAge(verifiJson.ageAtDischargeMinutes)} />
      </CollapsibleSection>

      <CollapsibleSection section={sections[2]}>
        <View style={styles.vfTempFlow}>
          <View style={[styles.vfTempCard, { backgroundColor: cardBgColor }]}>
            <Icon name="factory" size={ms(22)} color={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light} />
            <Text style={[styles.vfTempCardValue, { color: valueColor }]}>{formatTemperature(verifiJson.temperatureAtLeavePlant)}</Text>
            <Text style={[styles.vfTempCardLabel, { color: labelColor }]}>{t('tickets.detail.leavePlant')}</Text>
          </View>
          <Icon name="chevron-right" size={ms(24)} color={borderColor} />
          <View style={[styles.vfTempCard, { backgroundColor: cardBgColor }]}>
            <Icon name="map-marker-radius" size={ms(22)} color={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light} />
            <Text style={[styles.vfTempCardValue, { color: valueColor }]}>{formatTemperature(verifiJson.temperatureAtArrival)}</Text>
            <Text style={[styles.vfTempCardLabel, { color: labelColor }]}>{t('tickets.detail.arrival')}</Text>
          </View>
          <Icon name="chevron-right" size={ms(24)} color={borderColor} />
          <View style={[styles.vfTempCard, { backgroundColor: cardBgColor }]}>
            <Icon name="water" size={ms(22)} color={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light} />
            <Text style={[styles.vfTempCardValue, { color: valueColor }]}>{formatTemperature(verifiJson.temperatureAtDischarge)}</Text>
            <Text style={[styles.vfTempCardLabel, { color: labelColor }]}>{t('tickets.detail.discharge')}</Text>
          </View>
        </View>
      </CollapsibleSection>

      <CollapsibleSection section={sections[3]}>
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.mixInformation')}</Text>
        <DataRow label={t('tickets.detail.mixCode')} value={verifiJson.mixCodeName || '--'} highlight />
        <DataRow label={t('tickets.detail.instruction')} value={verifiJson.instructionName || '--'} />
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.waterAdditions')}</Text>
        <DataRow label={t('tickets.detail.totalWater')} value={formatVolume(verifiJson.verifiWaterTotal)} />
        <DataRow label={t('tickets.detail.atLeavePlant')} value={formatVolume(verifiJson.verifiWaterAtLeavePlant)} />
        <DataRow label={t('tickets.detail.atArrival')} value={formatVolume(verifiJson.verifiWaterAtArrival)} />
        <DataRow label={t('tickets.detail.atDischarge')} value={formatVolume(verifiJson.verifiWaterAtDischarge)} />
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.admixVolumes')}</Text>
        <DataRow label={t('tickets.detail.total')} value={formatVolume(verifiJson.admixTotal)} />
        <DataRow label={t('tickets.detail.atDischarge')} value={formatVolume(verifiJson.admixAtDischarge)} />
      </CollapsibleSection>

      <CollapsibleSection section={sections[4]}>
        <View style={styles.vfRevsContainer}>
          <View style={[styles.vfRevsCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.vfRevsCircle, { borderColor: isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light }]}>
              <Text style={[styles.vfRevsNumber, { color: valueColor }]}>{verifiJson.totalRevsAtLeavePlant || '0'}</Text>
            </View>
            <Text style={[styles.vfRevsLabel, { color: labelColor }]}>{t('tickets.detail.leavePlant')}</Text>
          </View>
          <View style={[styles.vfRevsCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.vfRevsCircle, { borderColor: isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light }]}>
              <Text style={[styles.vfRevsNumber, { color: valueColor }]}>{verifiJson.totalRevsAtArrival || '0'}</Text>
            </View>
            <Text style={[styles.vfRevsLabel, { color: labelColor }]}>{t('tickets.detail.arrival')}</Text>
          </View>
          <View style={[styles.vfRevsCard, { backgroundColor: cardBgColor }]}>
            <View style={[styles.vfRevsCircle, { borderColor: isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light }]}>
              <Text style={[styles.vfRevsNumber, { color: valueColor }]}>{verifiJson.totalRevsAtDischarge || '0'}</Text>
            </View>
            <Text style={[styles.vfRevsLabel, { color: labelColor }]}>{t('tickets.detail.discharge')}</Text>
          </View>
        </View>
        <View style={[styles.vfDivider, { backgroundColor: borderColor }]} />
        <Text style={[styles.vfSubsectionTitle, { color: titleColor }]}>{t('tickets.detail.sinceLoaded')}</Text>
        <DataRow label={t('tickets.detail.atLeavePlant')} value={verifiJson.totalRevsSinceLoadedAtLeavePlant || '--'} />
        <DataRow label={t('tickets.detail.atArrival')} value={verifiJson.totalRevsSinceLoadedAtArrival || '--'} />
        <DataRow label={t('tickets.detail.atDischarge')} value={verifiJson.totalRevsSinceLoadedAtDischarge || '--'} />
      </CollapsibleSection>
    </View>
  );
};

export const TicketDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
>>>>>>> Stashed changes
  const route = useRoute<TicketDetailRouteProp>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? colors.dark : colors.light;

  const {
    ticketNumber,
    truckName,
    loadQuantity,
    totalOrderQuantity,
    unit,
    status,
    scheduledTime,
    driverName,
    driverPhone,
    orderCode,
    // Product/Mix Information
    productCode,
    productName,
    mixDesign,
    slump,
    // Delivery Location
    deliveryAddress,
    deliveryCity,
    // Customer Information
    customerName,
    customerPhone,
    customerCompany,
    // Additional Details
    specialInstructions,
    plantName,
    estimatedArrival,
    distance,
  } = route.params;

  const statusInfo = STATUS_CONFIG[status];
  const percentage = (loadQuantity / totalOrderQuantity) * 100;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCallDriver = useCallback(() => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
<<<<<<< Updated upstream
    }
  }, [driverPhone]);

  const handleCallCustomer = useCallback(() => {
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    }
  }, [customerPhone]);

  const handleTrackTruck = useCallback(() => {
    console.log('Track truck pressed');
  }, []);

  const handleGetDirections = useCallback(() => {
    if (deliveryAddress && deliveryCity) {
      const address = encodeURIComponent(`${deliveryAddress}, ${deliveryCity}`);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  }, [deliveryAddress, deliveryCity]);
=======
    } else {
      showWarning(t('tickets.detail.phoneNotAvailableTitle'), t('tickets.detail.phoneNotAvailableMessage'));
    }
  }, [driverPhone, showWarning, t]);

  const handleTrackTruck = useCallback(() => {
    if (orderId) {
      navigation.navigate('Tracking', {
        orderId: orderId,
        ticketCode: apiTicketCode || undefined,
      });
    } else {
      showWarning(
        t('tickets.detail.orderUnavailableTitle'),
        t('tickets.detail.orderUnavailableMessage')
      );
    }
  }, [orderId, apiTicketCode, navigation, showWarning, t]);

  const handleGetDirections = useCallback(() => {
    if (truckLatitude && truckLongitude) {
      setShowDirectionsMenu(true);
    } else {
      showWarning(
        t('tickets.detail.locationUnavailableTitle'),
        t('tickets.detail.locationUnavailableMessage')
      );
    }
  }, [truckLatitude, truckLongitude, showWarning, t]);
>>>>>>> Stashed changes

  const handleViewTicket = useCallback(() => {
    console.log('View ticket document');
  }, []);

<<<<<<< Updated upstream
=======
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
              <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>{t('tickets.detail.title')}</Text>
            </View>
            <View style={styles.headerBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader size={120} message={t('tickets.detail.loadingTicketDetails')} color={isDark ? 'light' : 'dark'} />
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
    const title = isNoData ? t('tickets.detail.noTicketData') : t('tickets.detail.somethingWentWrong');
    const message = isNoData
      ? t('tickets.detail.ticketInfoUnavailable')
      : (error || t('tickets.detail.failedToLoadDetails'));

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
              <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>{t('tickets.detail.title')}</Text>
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
              <Text style={styles.retryBtnText}>{t('tickets.detail.tryAgain')}</Text>
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
                {t('tickets.detail.goBack')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

>>>>>>> Stashed changes
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GRADIENT[0]} />

      {/* Gradient Header */}
      <LinearGradient
        colors={HEADER_GRADIENT}
        style={[styles.header, { paddingTop: insets.top }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleSection}>
<<<<<<< Updated upstream
            <Text style={styles.headerTitle}>Ticket Details</Text>
            {orderCode && (
              <Text style={styles.headerSubtitle}>Order #{orderCode}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={handleViewTicket} activeOpacity={0.7}>
            <Icon name="file-document-outline" size={ms(20)} color={colors.common.white} />
=======
            <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>{t('tickets.detail.title')}</Text>
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
                {t('tickets.detail.orderLabel', { code: apiOrderCode })}
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
                {t('tickets.detail.codeLabel', { code: removeReasonCode })}
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
                  {weatherData.weather_description || t('tickets.detail.partlyCloudy')}
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
                      {t('tickets.detail.mph', { value: weatherData.wind_speed_mph ?? weatherData.wind_speed })}
                    </Text>
                  </>
                )}
                {weatherData.humidity != null && (
                  <>
                    <View style={[styles.headerCardWeatherDot, { backgroundColor: themeColors.text.hint }]} />
                    <Text style={[styles.headerCardWeatherInfoText, { color: themeColors.text.secondary }]}>
                      {t('tickets.detail.humidityRh', { value: weatherData.humidity })}
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
                  {weatherLoading ? t('tickets.detail.fetching') : t('tickets.detail.evaporate')}
                </Text>
                {weatherLoading && <ActivityIndicator size="small" color={isDark ? '#60A5FA' : '#2563EB'} />}
              </>
            )}
>>>>>>> Stashed changes
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <View style={styles.ticketNumberRow}>
              <Icon name="ticket-confirmation" size={ms(16)} color="rgba(255,255,255,0.8)" />
              <Text style={styles.ticketLabel}>TICKET</Text>
            </View>
<<<<<<< Updated upstream
            <Text style={styles.ticketNumber}>{ticketNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Icon name={statusInfo.icon} size={ms(14)} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <View style={styles.heroRight}>
            {/* ETA Badge */}
            {estimatedArrival && status !== 'completed' && (
              <View style={styles.etaBadge}>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{estimatedArrival}</Text>
              </View>
            )}
            <View style={styles.truckIconContainer}>
              <Icon name="truck-delivery" size={ms(44)} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="map-marker-radius"
            label="Track"
            color="#1976D2"
            onPress={handleTrackTruck}
            isDark={isDark}
          />
          <QuickAction
            icon="directions"
            label="Directions"
            color="#4CAF50"
            onPress={handleGetDirections}
            isDark={isDark}
=======
          );
        })()} */}
      </View>


      <View style={[styles.quickActionsRow, styles.quickActionsFixed, { backgroundColor: themeColors.background }]}>
        <QuickAction
          icon="map-marker-radius"
          label={t('tickets.detail.track')}
          color={accentColor}
          onPress={handleTrackTruck}
          isDark={isDark}
          disabled={isAtPlant || isCancelled}
        />
        <QuickAction
          icon="qrcode"
          label={t('tickets.detail.qrCode')}
          color={isDark ? colors.success.light : colors.success.main}
          onPress={handleShowQRCode}
          isDark={isDark}
        />
        <QuickAction
          icon="refresh"
          label={t('tickets.detail.refresh')}
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
                  {t('tickets.detail.loadDetails')}
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
                  {t('tickets.detail.runningCy')}
                </Text>
              </View>
              <View style={[styles.loadStatDivider, { backgroundColor: isDark ? themeColors.border : colors.grey[15] }]} />
              <View style={styles.loadStatItem}>
                <Text style={[styles.loadStatValue, { color: isDark ? colors.common.white : colors.grey[85] }]}>
                  {orderedQty}
                </Text>
                <Text style={[styles.loadStatLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  {t('tickets.detail.orderedCy')}
                </Text>
              </View>
              <View style={[styles.loadStatDivider, { backgroundColor: isDark ? themeColors.border : colors.grey[15] }]} />
              <View style={styles.loadStatItem}>
                <Text style={[styles.loadStatValue, { color: isDark ? colors.success.light : colors.success.main }]}>
                  {Math.max(orderedQty - runningQty, 0).toFixed(2)}
                </Text>
                <Text style={[styles.loadStatLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  {t('tickets.detail.remainingCy')}
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
                  {t('tickets.detail.load')}
                </Text>
                <Text style={[styles.loadInfoValue, { color: isDark ? colors.common.white : colors.grey[85] }]}>
                  {loadNumber || '-'}
                </Text>
              </View>
              <View style={[styles.loadInfoItem, { flex: 1 }]}>
                <Text style={[styles.loadInfoLabel, { color: isDark ? colors.grey[40] : colors.grey[60] }]}>
                  {t('tickets.detail.amount')}
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
              title={t('tickets.detail.productInformation')}
              icon="beaker-outline"
              iconColor={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light}
              isDark={isDark}>
              <DetailRow label={t('tickets.detail.itemCode')} value={productInfo.code} isDark={isDark} />
              <DetailRow label={t('tickets.detail.description')} value={productInfo.name} isDark={isDark} />
              <DetailRow label={t('tickets.detail.type')} value={productInfo.isMix ? t('tickets.detail.mixDesign') : t('tickets.detail.product')} isDark={isDark} isLast={!loadQty} />
              {loadQty !== undefined && loadQty !== null && (
                <DetailRow label={t('tickets.detail.loadAmount')} value={`${loadQty} CY`} isDark={isDark} isLast />
              )}
            </SectionCard>
          )}

          <SectionCard
            title={t('tickets.detail.deliveryLocation')}
            icon="map-marker"
            iconColor={isDark ? colors.error.light : colors.error.main}
            isDark={isDark}>
            <DetailRow label={t('tickets.detail.address')} value={deliveryAddress} isDark={isDark} />
            <DetailRow label={t('tickets.detail.customer')} value={customerName} isDark={isDark} isLast />

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
            title={t('tickets.detail.truckAndDriver')}
            icon="truck"
            iconColor={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light}
            isDark={isDark}>
            <DetailRow label={t('tickets.detail.truckCode')} value={truckCode} isDark={isDark} />
            <DetailRow label={t('tickets.detail.description')} value={truckDescription} isDark={isDark} />
            <DetailRow label={t('tickets.detail.driverCode')} value={driverCode} isDark={isDark} />
            <DetailRow label={t('tickets.detail.driverPhone')} value={driverPhone} isDark={isDark} isLast />
          </SectionCard>

          <SectionCard
            title={t('tickets.detail.plantInformation')}
            icon="domain"
            iconColor={isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light}
            isDark={isDark}>
            <DetailRow label={t('tickets.detail.plant')} value={plantName} isDark={isDark} />
            <DetailRow label={t('tickets.detail.code')} value={plantCode} isDark={isDark} />
            <DetailRow label={t('tickets.detail.address')} value={plantAddress} isDark={isDark} />
            <DetailRow label={t('tickets.detail.phone')} value={plantPhone} isDark={isDark} isLast />
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
            title={t('tickets.detail.deliveryTimeline')}
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
>>>>>>> Stashed changes
          />
          <QuickAction
            icon="phone"
            label="Call Driver"
            color="#FF9800"
            onPress={handleCallDriver}
            isDark={isDark}
          />
          <QuickAction
            icon="account-box"
            label="Customer"
            color="#9C27B0"
            onPress={handleCallCustomer}
            isDark={isDark}
          />
        </View>

<<<<<<< Updated upstream
        {/* Load Progress Card */}
        <View style={[styles.progressCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.progressCardHeader}>
            <View style={styles.progressTitleRow}>
              <Icon name="package-variant" size={ms(18)} color="#1976D2" />
              <Text style={[styles.progressCardTitle, { color: themeColors.text.primary }]}>
                Load Details
=======
          <View style={[styles.directionsMenuContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.directionsMenuHandle}>
              <View style={[styles.directionsMenuHandleBar, { backgroundColor: themeColors.border }]} />
            </View>

            <Text style={[styles.directionsMenuTitle, { color: themeColors.text.primary }]}>
              {t('tickets.detail.openLocationIn')}
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
                    {t('tickets.detail.trackInApp')}
                  </Text>
                  <Text style={[styles.directionsMenuItemSubtitle, { color: themeColors.text.secondary }]}>
                    {t('tickets.detail.viewTruckInApp')}
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
                    {t('tickets.detail.googleMaps')}
                  </Text>
                  <Text style={[styles.directionsMenuItemSubtitle, { color: themeColors.text.secondary }]}>
                    {orderLocationLatitude && orderLocationLongitude
                      ? t('tickets.detail.getDirectionsToJobSite')
                      : t('tickets.detail.viewTruckLocation')}
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
                      {t('tickets.detail.appleMaps')}
                    </Text>
                    <Text style={[styles.directionsMenuItemSubtitle, { color: themeColors.text.secondary }]}>
                      {orderLocationLatitude && orderLocationLongitude
                        ? t('tickets.detail.getDirectionsToJobSite')
                        : t('tickets.detail.viewTruckLocation')}
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
                {t('common.cancel')}
>>>>>>> Stashed changes
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>{percentage.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={styles.loadStatsRow}>
            <View style={styles.loadStatItem}>
              <Text style={[styles.loadStatValue, { color: '#1976D2' }]}>
                {loadQuantity.toFixed(2)}
              </Text>
              <Text style={[styles.loadStatLabel, { color: themeColors.text.hint }]}>
                This Load ({unit})
              </Text>
            </View>
            <View style={[styles.loadStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.loadStatItem}>
              <Text style={[styles.loadStatValue, { color: themeColors.text.primary }]}>
                {totalOrderQuantity}
              </Text>
              <Text style={[styles.loadStatLabel, { color: themeColors.text.hint }]}>
                Total Order ({unit})
              </Text>
            </View>
            <View style={[styles.loadStatDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.loadStatItem}>
              <Text style={[styles.loadStatValue, { color: '#4CAF50' }]}>
                {(totalOrderQuantity - loadQuantity).toFixed(2)}
              </Text>
              <Text style={[styles.loadStatLabel, { color: themeColors.text.hint }]}>
                Remaining ({unit})
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: themeColors.border }]}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
          </View>
        </View>

        {/* Product/Mix Information */}
        <SectionCard
          title="Product Information"
          icon="beaker-outline"
          iconColor="#00BCD4"
          isDark={isDark}>
          <DetailRow label="Product Code" value={productCode} isDark={isDark} />
          <DetailRow label="Product Name" value={productName} isDark={isDark} />
          <DetailRow label="Mix Design" value={mixDesign} isDark={isDark} />
          <DetailRow label="Slump" value={slump} isDark={isDark} isLast />
        </SectionCard>

        {/* Delivery Location */}
        <SectionCard
          title="Delivery Location"
          icon="map-marker"
          iconColor="#E91E63"
          isDark={isDark}>
          <DetailRow label="Address" value={deliveryAddress} isDark={isDark} />
          <DetailRow label="City" value={deliveryCity} isDark={isDark} />
          <DetailRow label="Distance" value={distance} isDark={isDark} isLast />

          {/* Map Preview Placeholder */}
          <TouchableOpacity
<<<<<<< Updated upstream
            style={[styles.mapPreview, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}
            onPress={handleGetDirections}
            activeOpacity={0.8}>
            <Icon name="map" size={ms(32)} color={themeColors.text.hint} />
            <Text style={[styles.mapPreviewText, { color: themeColors.text.hint }]}>
              Tap to open in Maps
            </Text>
          </TouchableOpacity>
        </SectionCard>
=======
            style={styles.qrModalBackdrop}
            activeOpacity={1}
            onPress={closeQRCodeModal}
          />
          <View style={[styles.qrModalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, { color: themeColors.text.primary }]}>
                {t('tickets.detail.ticketQrCode')}
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
>>>>>>> Stashed changes

        {/* Customer Information */}
        <SectionCard
          title="Customer Information"
          icon="account-group"
          iconColor="#673AB7"
          isDark={isDark}>
          <DetailRow label="Company" value={customerCompany} isDark={isDark} />
          <DetailRow label="Contact" value={customerName} isDark={isDark} />
          <DetailRow label="Phone" value={customerPhone} isDark={isDark} isLast />

<<<<<<< Updated upstream
          {customerPhone && (
            <TouchableOpacity
              style={styles.callCustomerBtn}
              onPress={handleCallCustomer}
              activeOpacity={0.8}>
              <Icon name="phone" size={ms(18)} color="#673AB7" />
              <Text style={styles.callCustomerText}>Call Customer</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Truck & Driver Information */}
        <SectionCard
          title="Truck & Driver"
          icon="truck"
          iconColor="#FF5722"
          isDark={isDark}>
          <DetailRow label="Truck" value={truckName} isDark={isDark} />
          <DetailRow label="Plant" value={plantName} isDark={isDark} />
          <DetailRow label="Driver" value={driverName} isDark={isDark} />
          <DetailRow label="Driver Phone" value={driverPhone} isDark={isDark} />
          <DetailRow label="Scheduled" value={scheduledTime} isDark={isDark} />
          {estimatedArrival && (
            <DetailRow label="ETA" value={estimatedArrival} isDark={isDark} isLast />
          )}
        </SectionCard>

        {/* Special Instructions */}
        {specialInstructions && (
          <SectionCard
            title="Special Instructions"
            icon="alert-circle-outline"
            iconColor="#FF9800"
            isDark={isDark}>
            <View style={styles.instructionsBox}>
              <Text style={[styles.instructionsText, { color: themeColors.text.primary }]}>
                {specialInstructions}
=======
            <View style={styles.qrTicketInfo}>
              <Text style={[styles.qrTicketLabel, { color: themeColors.text.secondary }]}>
                {t('tickets.detail.ticketNumber')}
              </Text>
              <Text style={[styles.qrTicketCode, { color: themeColors.text.primary }]}>
                {apiTicketCode || ticketCode || '---'}
>>>>>>> Stashed changes
              </Text>
            </View>
          </SectionCard>
        )}

        {/* Delivery Timeline */}
        <SectionCard
          title="Delivery Timeline"
          icon="timeline-clock"
          iconColor="#1976D2"
          isDark={isDark}>
          <VerticalTimeline currentStep={statusInfo.progressStep} isDark={isDark} />
        </SectionCard>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleTrackTruck}
            activeOpacity={0.8}>
            <LinearGradient
              colors={HEADER_GRADIENT}
              style={styles.primaryBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Icon name="map-marker-radius" size={ms(20)} color={colors.common.white} />
              <Text style={styles.primaryBtnText}>Track Truck on Map</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryBtnsRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: themeColors.card }]}
              onPress={handleViewTicket}
              activeOpacity={0.8}>
              <Icon name="file-document" size={ms(18)} color="#1976D2" />
              <Text style={[styles.secondaryBtnText, { color: themeColors.text.primary }]}>
                View Ticket
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: themeColors.card }]}
              activeOpacity={0.8}>
              <Icon name="alert-circle" size={ms(18)} color="#FF9800" />
              <Text style={[styles.secondaryBtnText, { color: themeColors.text.primary }]}>
                Report Issue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    paddingBottom: GRID.lg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.md,
    paddingTop: GRID.sm,
    marginBottom: GRID.sm,
  },
  headerBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleSection: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(17),
    color: colors.common.white,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    color: 'rgba(255,255,255,0.7)',
    marginTop: ms(2),
  },
  // Hero Section
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.lg,
  },
  heroLeft: {},
  heroRight: {
    alignItems: 'center',
  },
  ticketNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID.xs,
    marginBottom: GRID.xs,
  },
  ticketLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  ticketNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(28),
    color: colors.common.white,
    marginBottom: GRID.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.xl,
    gap: GRID.xs,
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
  },
  etaBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: GRID.xs,
    paddingHorizontal: GRID.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: GRID.sm,
  },
  etaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: GRID.md,
    paddingBottom: vs(40),
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    marginBottom: GRID.md,
    gap: GRID.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  },
  // Progress Card
  progressCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    gap: GRID.sm,
  },
  progressCardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
  },
  progressBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: GRID.xs - 2,
    paddingHorizontal: GRID.sm,
    borderRadius: RADIUS.xl,
  },
  progressBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(11),
    color: '#1976D2',
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
    backgroundColor: '#1976D2',
    borderRadius: ms(3),
  },
  // Section Card
  sectionCard: {
    borderRadius: RADIUS.lg,
    padding: GRID.md,
    marginBottom: GRID.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  // Detail Row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: GRID.sm,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailIcon: {
    marginRight: GRID.sm,
  },
  detailLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    flex: 1,
  },
  detailValue: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    textAlign: 'right',
    maxWidth: '60%',
  },
  // Map Preview
  mapPreview: {
    height: ms(80),
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: GRID.md,
  },
  mapPreviewText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
    marginTop: GRID.xs,
  },
  // Call Customer Button
  callCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    marginTop: GRID.md,
    paddingVertical: GRID.sm,
    backgroundColor: '#673AB715',
    borderRadius: RADIUS.md,
  },
  callCustomerText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
    color: '#673AB7',
  },
  // Instructions
  instructionsBox: {
    backgroundColor: '#FFF3E0',
    padding: GRID.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  instructionsText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(13),
    lineHeight: ms(20),
  },
  // Vertical Timeline
  verticalTimeline: {},
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
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineVerticalLine: {
    width: ms(2),
    flex: 1,
    marginVertical: ms(2),
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
  },
  timelineTime: {
    fontFamily: fontFamily.regular,
    fontSize: ms(10),
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
    backgroundColor: '#1976D2',
    marginRight: GRID.xs,
  },
  activeText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    color: '#1976D2',
  },
  // Action Buttons
  actionSection: {
    marginTop: GRID.sm,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: GRID.md,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    paddingVertical: GRID.lg,
  },
  primaryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(15),
    color: colors.common.white,
  },
  secondaryBtnsRow: {
    flexDirection: 'row',
    gap: GRID.md,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
});

export default TicketDetailScreen;
