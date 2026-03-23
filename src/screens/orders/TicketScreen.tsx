import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Keyboard,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, TruckLoader, ListFooterLoader, Icon } from '../../components/common';
import ConcreteTruck from '../../assets/svgs/concreteTruck.svg';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { RootStackParamList } from '../../navigation/types';
import { useTicketsByOrder, useRealtimeTickets } from '../../hooks';
import { ApiTicketStatus, TicketByOrderItem } from '../../types/ticket';
import { DeliveryProgress, DeliveryProgressSegment } from '../../types/order';

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

type TicketScreenRouteProp = RouteProp<RootStackParamList, 'Ticket'>;

type TicketStatus = ApiTicketStatus;

interface TicketLocation {
  latitude: string;
  longitude: string;
}

interface DeliveryTicket {
  id: string;
  ticketNumber: string;
  truckId: string;
  truckName: string;
  loadQuantity: number;
  totalOrderQuantity: number;
  unit: string;
  status: TicketStatus;
  statusDisplay: string;
  scheduledTime: string;
  product: string;
  load: string;
  loadQty: string;
  runQtyOrdQty: string;
  truckLocation?: TicketLocation | null;
  plantLocation?: TicketLocation | null;
  orderLocation?: TicketLocation | null;
}

interface StatusConfig {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  iconBg: string;
  progressStep: number;
}

const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    bgColor: `${colors.trackingStatus.pending}15`,
    textColor: colors.trackingStatus.pending,
    iconBg: `${colors.trackingStatus.pending}15`,
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    bgColor: `${colors.trackingStatus.ticketed}15`,
    textColor: colors.trackingStatus.ticketed,
    iconBg: `${colors.trackingStatus.ticketed}15`,
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'dump-truck',
    bgColor: `${colors.trackingStatus.loading}15`,
    textColor: colors.trackingStatus.loading,
    iconBg: `${colors.trackingStatus.loading}15`,
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    bgColor: `${colors.trackingStatus.loaded}15`,
    textColor: colors.trackingStatus.loaded,
    iconBg: `${colors.trackingStatus.loaded}15`,
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    bgColor: `${colors.trackingStatus.toJob}15`,
    textColor: colors.trackingStatus.toJob,
    iconBg: `${colors.trackingStatus.toJob}15`,
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    bgColor: `${colors.trackingStatus.atJob}15`,
    textColor: colors.trackingStatus.atJob,
    iconBg: `${colors.trackingStatus.atJob}15`,
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    bgColor: `${colors.trackingStatus.pouring}15`,
    textColor: colors.trackingStatus.pouring,
    iconBg: `${colors.trackingStatus.pouring}15`,
    progressStep: 6,
  },
  poured: {
    label: 'POURED',
    icon: 'water-check',
    bgColor: `${colors.trackingStatus.poured}15`,
    textColor: colors.trackingStatus.poured,
    iconBg: `${colors.trackingStatus.poured}15`,
    progressStep: 7,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    bgColor: `${colors.trackingStatus.washing}15`,
    textColor: colors.trackingStatus.washing,
    iconBg: `${colors.trackingStatus.washing}15`,
    progressStep: 8,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    bgColor: `${colors.trackingStatus.toPlant}15`,
    textColor: colors.trackingStatus.toPlant,
    iconBg: `${colors.trackingStatus.toPlant}15`,
    progressStep: 9,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'domain',
    bgColor: `${colors.trackingStatus.atPlant}15`,
    textColor: colors.trackingStatus.atPlant,
    iconBg: `${colors.trackingStatus.atPlant}15`,
    progressStep: 10,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    bgColor: `${colors.trackingStatus.cancelled}15`,
    textColor: colors.trackingStatus.cancelled,
    iconBg: `${colors.trackingStatus.cancelled}15`,
    progressStep: -1,
  },
  voided: {
    label: 'VOIDED',
    icon: 'close-circle',
    bgColor: `${colors.trackingStatus.voided}15`,
    textColor: colors.trackingStatus.voided,
    iconBg: `${colors.trackingStatus.voided}15`,
    progressStep: -1,
  },
};

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

const getWeatherIcon = (iconCode: string | null | undefined): string => {
  if (!iconCode) return '🌡️';

  const iconMap: Record<string, string> = {
    '01d': '☀️',
    '01n': '🌙',
    '02d': '🌤️',
    '02n': '☁️',
    '03d': '⛅',
    '03n': '☁️',
    '04d': '☁️',
    '04n': '☁️',
    '09d': '🌧️',
    '09n': '🌧️',
    '10d': '🌧️',
    '10n': '🌧️',
    '11d': '⛈️',
    '11n': '⛈️',
    '13d': '🌨️',
    '13n': '🌨️',
    '50d': '🌫️',
    '50n': '🌫️',
  };

  return iconMap[iconCode] || '🌡️';
};

const STATUS_CONFIG_DARK: Record<TicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    bgColor: `${colors.trackingStatus.pending}20`,
    textColor: colors.trackingStatus.pending,
    iconBg: `${colors.trackingStatus.pending}20`,
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    bgColor: `${colors.trackingStatus.ticketed}20`,
    textColor: colors.trackingStatus.ticketed,
    iconBg: `${colors.trackingStatus.ticketed}20`,
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'dump-truck',
    bgColor: `${colors.trackingStatus.loading}20`,
    textColor: colors.trackingStatus.loading,
    iconBg: `${colors.trackingStatus.loading}20`,
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    bgColor: `${colors.trackingStatus.loaded}20`,
    textColor: colors.trackingStatus.loaded,
    iconBg: `${colors.trackingStatus.loaded}20`,
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    bgColor: `${colors.trackingStatus.toJob}20`,
    textColor: colors.trackingStatus.toJob,
    iconBg: `${colors.trackingStatus.toJob}20`,
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    bgColor: `${colors.trackingStatus.atJob}20`,
    textColor: colors.trackingStatus.atJob,
    iconBg: `${colors.trackingStatus.atJob}20`,
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    bgColor: `${colors.trackingStatus.pouring}20`,
    textColor: colors.trackingStatus.pouring,
    iconBg: `${colors.trackingStatus.pouring}20`,
    progressStep: 6,
  },
  poured: {
    label: 'POURED',
    icon: 'water-check',
    bgColor: `${colors.trackingStatus.poured}20`,
    textColor: colors.trackingStatus.poured,
    iconBg: `${colors.trackingStatus.poured}20`,
    progressStep: 7,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    bgColor: `${colors.trackingStatus.washing}20`,
    textColor: colors.trackingStatus.washing,
    iconBg: `${colors.trackingStatus.washing}20`,
    progressStep: 8,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    bgColor: `${colors.trackingStatus.toPlant}20`,
    textColor: colors.trackingStatus.toPlant,
    iconBg: `${colors.trackingStatus.toPlant}20`,
    progressStep: 9,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'domain',
    bgColor: `${colors.trackingStatus.atPlant}20`,
    textColor: colors.trackingStatus.atPlant,
    iconBg: `${colors.trackingStatus.atPlant}20`,
    progressStep: 10,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    bgColor: `${colors.trackingStatus.cancelled}20`,
    textColor: colors.trackingStatus.cancelled,
    iconBg: `${colors.trackingStatus.cancelled}20`,
    progressStep: -1,
  },
  voided: {
    label: 'VOIDED',
    icon: 'close-circle',
    bgColor: `${colors.trackingStatus.voided}20`,
    textColor: colors.trackingStatus.voided,
    iconBg: `${colors.trackingStatus.voided}20`,
    progressStep: -1,
  },
};

interface StatusBadgeProps {
  status: StatusConfig;
  displayLabel?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, displayLabel }) => {

  const label = displayLabel?.toUpperCase() || status.label || '';

  return (
    <View style={styles.statusBadgeContainer}>
      <View style={[styles.statusIconContainer, { backgroundColor: status.iconBg }]}>
        <Icon name={status.icon} size={ms(14)} color={status.textColor} />
      </View>
      <View style={[styles.statusTextBadge, { backgroundColor: status.bgColor }]}>
        <Text style={[styles.statusText, { color: status.textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

interface TruckVisualProps {
  isDark: boolean;
}

const TruckVisual: React.FC<TruckVisualProps> = ({ isDark }) => {
  const iconColor = isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main;

  const containerBgColor = isDark
    ? `${colors.ticket.ui.dark.accentBlue}15`
    : `${colors.primary.main}12`;

  return (
    <View
      style={[
        styles.truckVisualContainer,
        {
          backgroundColor: containerBgColor,
          shadowColor: isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main,
          borderWidth: 1,
          borderColor: isDark
            ? `${colors.ticket.ui.dark.accentBlue}25`
            : `${colors.primary.main}20`,
        },
      ]}>
      <View style={[styles.truckAccentLine, { backgroundColor: iconColor }]} />
      <ConcreteTruck width={ms(28)} height={ms(20)} color={iconColor} />
    </View>
  );
};

interface TicketItemProps {
  ticket: DeliveryTicket;
  onPress: () => void;
  onMapPress: () => void;
  isDark: boolean;
  isMapDisabled?: boolean;
}

const TicketItem: React.FC<TicketItemProps> = ({ ticket, onPress, onMapPress, isDark, isMapDisabled = false }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const statusConfigMap = isDark ? STATUS_CONFIG_DARK : STATUS_CONFIG;
  const status = statusConfigMap[ticket.status] || statusConfigMap.pending;

  return (
    <View
      style={[
        styles.ticketItem,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
      ]}>
      <View style={styles.ticketPressableContent}>
        <TruckVisual isDark={isDark} />

        <View style={styles.ticketContent}>
          <View style={styles.ticketTopRow}>
            <Text
              style={[styles.truckName, { color: themeColors.text.secondary }]}
              numberOfLines={1}>
              {ticket.truckName}
            </Text>
            {ticket.load ? (
              <View style={[styles.loadBadge, { backgroundColor: isDark ? colors.ticket.ui.dark.badgeBg : colors.primary.main + '12' }]}>
                <Text style={[styles.loadText, { color: isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main }]}>
                  Load: {ticket.load}
                </Text>
              </View>
            ) : null}
            <View style={styles.timeContainer}>
              <Icon
                name="clock-outline"
                size={ms(11)}
                color={isDark ? colors.ticket.ui.dark.timeText : colors.ticket.ui.light.timeText}
              />
              <Text
                style={[
                  styles.timeText,
                  { color: isDark ? colors.ticket.ui.dark.timeText : colors.ticket.ui.light.timeText },
                ]}>
                {ticket.scheduledTime}
              </Text>
            </View>
          </View>

          <View style={styles.ticketMainRow}>
            <Text style={[styles.ticketNumber, { color: themeColors.text.primary }]}>
              {ticket.ticketNumber}
            </Text>
            <Text style={[styles.ticketSeparator, { color: themeColors.text.primary }]}>:</Text>
            <Text style={[styles.ticketQuantityInline, { color: themeColors.text.primary }]}>
              {ticket.loadQty}
            </Text>
          </View>

          <View style={styles.ticketBottomRow}>
            <Text
              style={[styles.totalText, { color: themeColors.text.hint }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {ticket.runQtyOrdQty}
            </Text>
            <StatusBadge status={status}
              displayLabel={ticket.statusDisplay} />
          </View>
        </View>
      </View>

      <View style={styles.ticketActionsContainer}>
        <TouchableOpacity
          style={[
            styles.mapIconButton,
            {
              backgroundColor: isMapDisabled
                ? (isDark ? colors.grey[70] : colors.grey[20])
                : (isDark ? colors.grey[60] : colors.grey[15])
            },
            isMapDisabled && styles.mapIconButtonDisabled,
          ]}
          onPress={onMapPress}
          activeOpacity={0.7}
          disabled={isMapDisabled}
        >
          <Icon
            name="map-marker-radius-outline"
            size={ms(18)}
            color={isMapDisabled ? (isDark ? colors.grey[50] : colors.grey[40]) : (isDark ? colors.common.white : colors.common.black)}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chevronContainer}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Icon
            name="chevron-right"
            size={ms(22)}
            color={isDark ? colors.ticket.ui.dark.chevron : colors.ticket.ui.light.chevron}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface WeatherData {
  temperature_fahrenheit?: number;
  humidity?: number;
  wind_speed_mph?: number;
  evaporation_rate?: number;
  weather_condition?: string;
  weather_description?: string;
  weather_icon?: string;
}

interface OrderHeaderProps {
  orderDate: string;
  orderCode: string;
  deliveryAddress: string;
  customerName?: string;
  projectName?: string | null;
  totalTickets: number;
  totalLoads: number;
  totalDeliveredQty: number;
  orderedQty: number;
  progressDisplay: string;
  isDark: boolean;
  weatherData?: WeatherData | null;
  onWeatherPress?: () => void;
  lastTicketStatusColor?: string;
  deliveryProgress?: DeliveryProgress | null;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  orderDate,
  orderCode,
  deliveryAddress,
  customerName,
  projectName,
  totalTickets,
  totalLoads,
  totalDeliveredQty,
  orderedQty,
  progressDisplay,
  isDark,
  weatherData,
  onWeatherPress,
  lastTicketStatusColor,
  deliveryProgress,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const ticketUi = isDark ? colors.ticket.ui.dark : colors.ticket.ui.light;
  const accentColor = isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main;
  const accentColorLight = isDark ? colors.ticket.ui.dark.accentBlueLight : colors.primary.main;
  const progressBarColor = lastTicketStatusColor || accentColor;

  const progressData = useMemo(() => {
    const rawPercentage = orderedQty > 0 ? (totalDeliveredQty / orderedQty) * 100 : 0;
    const percentage = Math.min(rawPercentage, 100);
    return {
      totalDelivered: totalDeliveredQty,
      totalOrdered: orderedQty,
      percentage,
      displayPercentage: Math.round(rawPercentage),
      ticketCount: totalTickets,
    };
  }, [totalDeliveredQty, orderedQty, totalTickets]);


  const [isProgressExpanded, setIsProgressExpanded] = React.useState(false);
  const progressAnimatedHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnimatedHeight, {
      toValue: isProgressExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isProgressExpanded, progressAnimatedHeight]);

  const toggleProgressExpand = () => {
    setIsProgressExpanded(!isProgressExpanded);
  };


  const progressLegendMaxHeight = deliveryProgress?.segments
    ? deliveryProgress.segments.length * 24 + ms(6) + ms(8)
    : 0;

  return (
    <View
      style={[
        styles.orderHeader,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
      ]}>
      <View style={styles.orderTopSection}>
        <View
          style={[
            styles.orderIconBox,
            {
              backgroundColor: themeColors.card,
              shadowColor: isDark ? colors.common.black : colors.primary.main,
            },
          ]}>
          <View style={[styles.orderIconAccent, { backgroundColor: accentColor }]} />
          <Icon name="clipboard-text-outline" size={ms(22)} color={accentColor} />
        </View>

        <View style={styles.orderDetails}>
          <Text style={[styles.orderDate, { color: themeColors.text.primary }]}>
            ORDER - {orderDate}
          </Text>
          {customerName && (
            <Text style={[styles.customerName, { color: themeColors.text.primary }]} numberOfLines={1}>
              {customerName}
            </Text>
          )}
          {projectName && (
            <Text style={[styles.projectName, { color: themeColors.text.secondary }]} numberOfLines={1}>
              {projectName}
            </Text>
          )}
          <View style={styles.addressRow}>
            <Icon name="map-marker-outline" size={ms(14)} color={themeColors.text.hint} />
            <Text
              style={[styles.orderAddress, { color: themeColors.text.secondary }]}
              numberOfLines={1}>
              {deliveryAddress}
            </Text>
          </View>
          <View style={styles.loadsRow}>
            <ConcreteTruck width={ms(18)} height={ms(12)} color={colors.success.main} />
            <Text style={[styles.loadsLabel, { color: themeColors.text.hint }]}>
              Total Tickets:
            </Text>
            <Text style={[styles.loadsValue, { color: colors.success.main }]}>
              {totalTickets}
            </Text>
          </View>
          <View style={styles.loadsRow}>
            <Icon name="clipboard-text-outline" size={ms(14)} color={isDark ? colors.common.white : colors.common.black} />
            <Text style={[styles.loadsLabel, { color: themeColors.text.hint }]}>
              Order:
            </Text>
            <Text style={[styles.loadsValue, { color: isDark ? colors.common.white : colors.common.black }]}>
              {orderCode}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.ticketCountBadge,
            { backgroundColor: isDark ? colors.ticket.ui.dark.badgeBg : colors.primary.main + '12' },
          ]}
        >
          <Text style={[styles.ticketCountNumber, { color: accentColorLight }]}>
            {progressData.ticketCount}
          </Text>
          <Text style={[styles.ticketCountLabel, { color: accentColorLight }]}>
            Tickets
          </Text>
        </View>
      </View>


      {weatherData && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onWeatherPress}
          style={styles.headerWeatherRow}>
          <Text style={styles.weatherEmoji}>
            {getWeatherIcon(weatherData.weather_icon)}
          </Text>
          <Text
            style={[styles.headerWeatherDescText, { color: themeColors.text.secondary }]}
            numberOfLines={1}>
            {weatherData.weather_description || 'Partly cloudy'}
          </Text>
          {weatherData.temperature_fahrenheit !== null && weatherData.temperature_fahrenheit !== undefined && (
            <>
              <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
              <Text style={[styles.headerWeatherInfoText, { color: themeColors.text.secondary }]}>
                {weatherData.temperature_fahrenheit}°F
              </Text>
            </>
          )}
          {weatherData.wind_speed_mph !== null && weatherData.wind_speed_mph !== undefined && (
            <>
              <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
              <Text style={[styles.headerWeatherInfoText, { color: themeColors.text.secondary }]}>
                {weatherData.wind_speed_mph} mph wind
              </Text>
            </>
          )}
          {weatherData.humidity !== null && weatherData.humidity !== undefined && (
            <>
              <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
              <Text style={[styles.headerWeatherInfoText, { color: themeColors.text.secondary }]}>
                {weatherData.humidity}% RH
              </Text>
            </>
          )}
          {weatherData.evaporation_rate !== null && weatherData.evaporation_rate !== undefined && (
            <View
              style={[
                styles.headerEvapRateBadge,
                { backgroundColor: getEvaporationBgColor(weatherData.evaporation_rate) }
              ]}>
              <Text style={styles.headerEvapRateText}>
                {getEvaporationText(weatherData.evaporation_rate)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={[styles.orderDivider, { backgroundColor: themeColors.border }]} />

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: themeColors.text.secondary }]}>
            Delivery Status
          </Text>
        </View>

        {deliveryProgress?.segments && deliveryProgress.segments.length > 0 ? (
          <View style={styles.segmentedProgressSection}>

            <View style={styles.segmentLabelsRow}>
              {deliveryProgress.segments
                .filter((segment) => (segment.percentage > 0 || segment.status === 'remaining') && ALLOWED_PROGRESS_STATUSES.includes(segment.status?.toLowerCase()))
                .map((segment, index) => (
                  <View
                    key={`label-${segment.status}-${index}`}
                    style={[styles.segmentLabelContainer, { flex: segment.percentage || 1 }]}
                  >
                    <Text
                      style={[styles.segmentLabelText, { color: themeColors.text.secondary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {getStatusDisplayLabel(segment.status)}
                    </Text>
                  </View>
                ))}
            </View>


            <View style={[styles.progressBarContainer, { backgroundColor: isDark ? colors.dark.surface : colors.grey[10] }]}>
              <View style={styles.progressSegmentsContainer}>
                {deliveryProgress.segments
                  .filter((segment) => (segment.percentage > 0 || segment.status === 'remaining') && ALLOWED_PROGRESS_STATUSES.includes(segment.status?.toLowerCase()))
                  .map((segment, index, filteredArr) => (
                    <View
                      key={`bar-${segment.status}-${index}`}
                      style={[
                        styles.progressBarSegment,
                        {
                          flex: segment.percentage || 1,
                          backgroundColor: getSegmentColor(segment.status),
                          borderRightWidth: index < filteredArr.length - 1 ? 1 : 0,
                          borderRightColor: themeColors.card,
                        },
                      ]}
                    />
                  ))}
              </View>
            </View>


            <View style={styles.segmentValuesRow}>
              {deliveryProgress.segments
                .filter((segment) => (segment.percentage > 0 || segment.status === 'remaining') && ALLOWED_PROGRESS_STATUSES.includes(segment.status?.toLowerCase()))
                .map((segment, index) => (
                  <View
                    key={`value-${segment.status}-${index}`}
                    style={[styles.segmentValueContainer, { flex: segment.percentage || 1 }]}
                  >
                    <Text
                      style={[styles.segmentValueText, { color: themeColors.text.hint }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {segment.qty !== undefined ? `${segment.qty} CY` : ''}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.progressBarContainer, { backgroundColor: isDark ? colors.dark.surface : colors.grey[10] }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressData.percentage}%`,
                    backgroundColor: progressBarColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: themeColors.text.hint }]}>
              {progressDisplay || `${(progressData.totalDelivered ?? 0).toFixed(1)} of ${progressData.totalOrdered ?? 0} CY delivered`}
            </Text>
          </>
        )}

      </View>
    </View>
  );
};

interface EmptyStateProps {
  hasFilter: boolean;
  hasSearch: boolean;
  isDark: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasFilter, hasSearch, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const gradientColors = isDark
    ? colors.ticket.emptyGradient.dark
    : colors.ticket.emptyGradient.light;
  const iconColor = isDark ? colors.common.white : colors.ticket.ui.light.emptyIcon;

  const hasAnyFilter = hasFilter || hasSearch;

  return (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={gradientColors}
        style={styles.emptyIconContainer}
      >
        <Icon name={hasSearch ? 'magnify' : 'ticket-outline'} size={ms(48)} color={iconColor} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: themeColors.text.primary }]}>
        {hasSearch ? 'No Results Found' : hasFilter ? 'No Matching Tickets' : 'No Tickets Yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.text.secondary }]}>
        {hasSearch
          ? 'Try different search terms or clear your search.'
          : hasAnyFilter
            ? 'Try adjusting your filters to see more tickets.'
            : 'Delivery tickets will appear here once loads are scheduled.'}
      </Text>
    </View>
  );
};

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSearch: () => void;
  onFilterPress: () => void;
  isDark: boolean;
  activeFiltersCount: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onSearch,
  onFilterPress,
  isDark,
  activeFiltersCount,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.searchContainer}>
      <View
        style={[
          styles.searchInputWrapper,
          {
            backgroundColor: themeColors.card,
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : colors.grey[10],
          },
        ]}>
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder="Search Tickets, Trucks, Drivers..."
          placeholderTextColor={isDark ? themeColors.text.hint : colors.grey[40]}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          autoCapitalize="sentences"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Icon name="close-circle" size={ms(18)} color={themeColors.text.hint} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onSearch}
          style={[styles.searchIconBtn, { backgroundColor: colors.primary.main }]}
        >
          <Icon name="magnify" size={ms(20)} color={colors.common.white} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: activeFiltersCount > 0 ? colors.primary.main : themeColors.card,
            borderWidth: activeFiltersCount > 0 || isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : colors.grey[10],
          },
        ]}
        onPress={onFilterPress}
        activeOpacity={0.7}>
        <Icon
          name="filter-variant"
          size={ms(20)}
          color={activeFiltersCount > 0 ? colors.common.white : themeColors.text.primary}
        />
        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

interface FilterOptions {
  statuses: TicketStatus[];
  sortBy: 'time';
  sortOrder: 'asc' | 'desc';
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
  isDark: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  isDark,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, filters, slideAnim]);

  const toggleStatus = (status: TicketStatus) => {
    setLocalFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status],
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      statuses: [],
      sortBy: 'time',
      sortOrder: 'desc',
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  const statusOptions: { id: TicketStatus; label: string; color: string }[] = [
    { id: 'pending', label: 'Pending', color: colors.trackingStatus.pending },
    { id: 'ticketed', label: 'Ticketed', color: colors.trackingStatus.ticketed },
    { id: 'loading', label: 'Loading', color: colors.trackingStatus.loading },
    { id: 'loaded', label: 'Loaded', color: colors.trackingStatus.loaded },
    { id: 'to_job', label: 'To Job', color: colors.trackingStatus.toJob },
    { id: 'at_job', label: 'At Job', color: colors.trackingStatus.atJob },
    { id: 'pouring', label: 'Pouring', color: colors.trackingStatus.pouring },
    { id: 'washing', label: 'Washing', color: colors.trackingStatus.washing },
    { id: 'to_plant', label: 'To Plant', color: colors.trackingStatus.toPlant },
    { id: 'at_plant', label: 'At Plant', color: colors.trackingStatus.atPlant },
    { id: 'cancelled', label: 'Voided', color: colors.trackingStatus.cancelled },
  ];

  const sortOptions: { id: 'time'; label: string; icon: string }[] = [
    { id: 'time', label: 'Scheduled Time', icon: 'clock-outline' },
  ];

  const activeFiltersCount =
    localFilters.statuses.length +
    (localFilters.sortBy !== 'time' || localFilters.sortOrder !== 'desc' ? 1 : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: themeColors.card,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}>
          <Pressable onPress={() => Keyboard.dismiss()}>

            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                Filter Tickets
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Icon name="close" size={ms(24)} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}>

              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  Status
                </Text>
                <View style={styles.filterChipsGrid}>
                  {statusOptions.map(status => {
                    const isSelected = localFilters.statuses.includes(status.id);
                    return (
                      <TouchableOpacity
                        key={status.id}
                        style={[
                          styles.filterChipOption,
                          {
                            backgroundColor: isSelected
                              ? `${status.color}20`
                              : isDark
                                ? colors.ticket.ui.dark.filterBg
                                : colors.ticket.ui.light.filterBg,
                            borderColor: isSelected ? status.color : 'transparent',
                          },
                        ]}
                        onPress={() => toggleStatus(status.id)}>
                        <RNText
                          style={[
                            styles.filterChipOptionText,
                            { color: isSelected ? status.color : themeColors.text.secondary },
                          ]}>
                          {status.label}
                        </RNText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  Sort By
                </Text>
                <View style={styles.sortOptionsContainer}>
                  {sortOptions.map(option => {
                    const isSelected = localFilters.sortBy === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.sortOption,
                          {
                            backgroundColor: isSelected
                              ? colors.primary.main
                              : isDark
                                ? colors.ticket.ui.dark.filterBg
                                : colors.ticket.ui.light.filterBg,
                          },
                        ]}
                        onPress={() =>
                          setLocalFilters(prev => ({ ...prev, sortBy: option.id }))
                        }>
                        <Icon
                          name={option.icon}
                          size={ms(18)}
                          color={isSelected ? colors.common.white : themeColors.text.secondary}
                        />
                        <Text
                          style={[
                            styles.sortOptionText,
                            {
                              color: isSelected
                                ? colors.common.white
                                : themeColors.text.secondary,
                            },
                          ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.sortOrderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderBtn,
                      {
                        backgroundColor:
                          localFilters.sortOrder === 'asc'
                            ? colors.primary.main
                            : isDark
                              ? colors.ticket.ui.dark.filterBg
                              : colors.ticket.ui.light.filterBg,
                      },
                    ]}
                    onPress={() =>
                      setLocalFilters(prev => ({ ...prev, sortOrder: 'asc' }))
                    }>
                    <Icon
                      name="sort-ascending"
                      size={ms(18)}
                      color={
                        localFilters.sortOrder === 'asc'
                          ? colors.common.white
                          : themeColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.sortOrderText,
                        {
                          color:
                            localFilters.sortOrder === 'asc'
                              ? colors.common.white
                              : themeColors.text.secondary,
                        },
                      ]}>
                      Ascending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderBtn,
                      {
                        backgroundColor:
                          localFilters.sortOrder === 'desc'
                            ? colors.primary.main
                            : isDark
                              ? colors.ticket.ui.dark.filterBg
                              : colors.ticket.ui.light.filterBg,
                      },
                    ]}
                    onPress={() =>
                      setLocalFilters(prev => ({ ...prev, sortOrder: 'desc' }))
                    }>
                    <Icon
                      name="sort-descending"
                      size={ms(18)}
                      color={
                        localFilters.sortOrder === 'desc'
                          ? colors.common.white
                          : themeColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.sortOrderText,
                        {
                          color:
                            localFilters.sortOrder === 'desc'
                              ? colors.common.white
                              : themeColors.text.secondary,
                        },
                      ]}>
                      Descending
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: ms(120) }} />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <TouchableOpacity
                style={[
                  styles.modalResetBtn,
                  {
                    backgroundColor: isDark ? colors.modal.dark.cancelBg : colors.modal.light.cancelBg,
                    borderColor: isDark ? colors.modal.dark.cancelBorder : colors.modal.light.cancelBorder,
                  },
                ]}
                onPress={handleReset}>
                <Icon
                  name="refresh"
                  size={ms(18)}
                  color={isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText}
                />
                <Text
                  style={[
                    styles.modalResetText,
                    { color: isDark ? colors.modal.dark.cancelText : colors.modal.light.cancelText },
                  ]}>
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApplyBtn, { backgroundColor: colors.primary.main }]}
                onPress={handleApply}>
                <Text style={styles.modalApplyText}>
                  Apply{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const DEFAULT_FILTERS: FilterOptions = {
  statuses: [],
  sortBy: 'time',
  sortOrder: 'desc',
};

export const TicketScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<TicketScreenRouteProp>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const { orderId, orderCode, orderDate } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

  const ITEMS_PER_PAGE = 10;
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);

  const {
    order,
    tickets: apiTickets,
    customerName,
    projectName,
    weatherData,
    orderedQty,
    totalDeliveredQty,
    progressDisplay,
    totalTickets,
    activeTickets,
    cancelledTickets,
    totalLoads,
    isLoading,
    isRefetching,
    refetch,
    deliveryProgress,
  } = useTicketsByOrder({
    orderId,
    sort_order: advancedFilters.sortOrder,
  });

  // Supabase Realtime: auto-refetch tickets when changes detected
  useRealtimeTickets({
    orderCode,
    enabled: !!orderCode,
    onUpdate: refetch,
  });

  const displayDate = order?.order_date
    ? new Date(order.order_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Order';
  const deliveryAddress = order?.delivery_address || 'Loading...';

  const getDisplayStatus = useCallback((status: string, statusDisplay: string): string => {
    const lowerStatus = status?.toLowerCase() || '';
    const lowerDisplay = statusDisplay?.toLowerCase() || '';

    if (lowerStatus.includes('cancel') || lowerDisplay.includes('cancel')) {
      return 'Voided';
    }
    return statusDisplay || status || '';
  }, []);

  const getTimestampForStatus = useCallback((status: string, timestamps: TicketByOrderItem['timestamps']): string => {
    if (!timestamps) return '';


    const statusTimestampMap: Record<string, string | null | undefined> = {
      pending: timestamps.ticketed,
      ticketed: timestamps.ticketed,
      loading: timestamps.loading,
      loaded: timestamps.loaded,
      to_job: timestamps.to_job,
      at_job: timestamps.at_job,
      pouring: timestamps.pouring,
      washing: timestamps.washing,
      to_plant: timestamps.to_plant,
      at_plant: timestamps.at_plant,
      cancelled: timestamps.ticketed,
    };

    return statusTimestampMap[status] || timestamps.eta_at_job || timestamps.ticketed || '';
  }, []);

  const allTickets = useMemo(
    () => (apiTickets || []).map((ticket: TicketByOrderItem): DeliveryTicket => {

      const truckCode = typeof ticket.truck === 'string'
        ? ticket.truck
        : ticket.truck?.truck_code || '';


      const truckLocation = typeof ticket.truck === 'object' && ticket.truck
        ? { latitude: ticket.truck.latitude, longitude: ticket.truck.longitude }
        : null;

      return {
        id: ticket.ticket_code || '',
        ticketNumber: ticket.ticket_code || '',
        truckId: truckCode,
        truckName: `Truck ${truckCode || 'N/A'}`,
        loadQuantity: ticket.running_qty ?? 0,
        totalOrderQuantity: ticket.ordered_qty ?? 0,
        unit: 'CY',
        status: ticket.status || 'ticketed',
        statusDisplay: getDisplayStatus(ticket.status, ticket.status_display),
        scheduledTime: getTimestampForStatus(ticket.status, ticket.timestamps),
        product: ticket.product || '',
        load: ticket.load || '',
        loadQty: ticket.load_qty || '',
        runQtyOrdQty: ticket.run_qty_ord_qty || '',
        truckLocation,
        plantLocation: ticket.plant_location || null,
        orderLocation: ticket.order_location || null,
      };
    }),
    [apiTickets, getDisplayStatus, getTimestampForStatus]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.statuses.length > 0) count += advancedFilters.statuses.length;
    if (advancedFilters.sortBy !== 'time' || advancedFilters.sortOrder !== 'desc') count += 1;
    return count;
  }, [advancedFilters]);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

    if (appliedSearchQuery.trim()) {
      const query = appliedSearchQuery.toLowerCase().trim();
      tickets = tickets.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.truckId.toLowerCase().includes(query) ||
        ticket.product.toLowerCase().includes(query) ||
        ticket.load.includes(query)
      );
    }

    if (advancedFilters.statuses.length > 0) {
      tickets = tickets.filter(ticket => advancedFilters.statuses.includes(ticket.status));
    }

    return tickets;
  }, [allTickets, advancedFilters.statuses, appliedSearchQuery]);

  const getStatusColor = useCallback((status: TicketStatus): string => {
    const statusColorMap: Record<string, string> = {
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
    return statusColorMap[status] || colors.trackingStatus.pending;
  }, []);

  const lastTicketStatusColor = useMemo(() => {
    if (allTickets.length === 0) return undefined;
    const firstTicket = allTickets[0];
    return getStatusColor(firstTicket.status);
  }, [allTickets, getStatusColor]);

  React.useEffect(() => {
    setDisplayedCount(ITEMS_PER_PAGE);
  }, [appliedSearchQuery, advancedFilters]);

  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(0, displayedCount);
  }, [filteredTickets, displayedCount]);

  const hasNextPage = displayedCount < filteredTickets.length;
  const isFetchingNextPage = false;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage) {
      setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [hasNextPage]);

  const handleTicketPress = useCallback((ticket: DeliveryTicket) => {
    const statusColor = getStatusColor(ticket.status);
    navigation.navigate('TicketDetail', {
      orderCode: orderCode,
      orderDate: orderDate,
      ticketCode: ticket.ticketNumber,
      status: ticket.status,
      statusDisplay: ticket.statusDisplay,
      weatherData: weatherData,
      statusColor: statusColor,
    });
  }, [navigation, orderCode, orderDate, weatherData, getStatusColor]);

  const handleMapPress = useCallback((ticket: DeliveryTicket) => {
    navigation.navigate('Tracking', {
      orderId: orderId,
      ticketCode: ticket.ticketNumber,
    });
  }, [navigation, orderId]);

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    setAppliedSearchQuery(searchQuery.trim());
  }, [searchQuery]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setAppliedSearchQuery('');
  }, []);

  const handleFilterPress = useCallback(() => {
    setFilterModalVisible(true);
  }, []);

  const handleFilterApply = useCallback((filters: FilterOptions) => {
    setAdvancedFilters(filters);
  }, []);

  const handleFilterReset = useCallback(() => {
    setAdvancedFilters(DEFAULT_FILTERS);
  }, []);

  const handleWeatherPress = useCallback(() => {
    navigation.navigate('Weather', {
      orderCode: orderCode,
      orderDate: orderDate,
    });
  }, [navigation, orderCode, orderDate]);

  const renderHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <OrderHeader
        orderDate={displayDate}
        orderCode={orderCode}
        deliveryAddress={deliveryAddress}
        customerName={customerName}
        projectName={projectName}
        totalTickets={totalTickets}
        totalLoads={totalLoads}
        totalDeliveredQty={totalDeliveredQty}
        orderedQty={orderedQty}
        progressDisplay={progressDisplay}
        isDark={isDark}
        weatherData={weatherData}
        onWeatherPress={handleWeatherPress}
        lastTicketStatusColor={lastTicketStatusColor}
        deliveryProgress={deliveryProgress}
      />
      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeaderText, { color: themeColors.text.secondary }]}>
          {activeTickets} ticket{activeTickets !== 1 ? 's' : ''}{cancelledTickets > 0 ? ` | ${cancelledTickets} voided` : ''}
        </Text>
      </View>
    </View>
  ), [
    displayDate,
    deliveryAddress,
    totalTickets,
    activeTickets,
    cancelledTickets,
    totalLoads,
    customerName,
    projectName,
    totalDeliveredQty,
    orderedQty,
    progressDisplay,
    isDark,
    themeColors,
    weatherData,
    lastTicketStatusColor,
    deliveryProgress,
  ]);

  const renderTicket = useCallback(
    ({ item }: { item: DeliveryTicket }) => {
      const isAtPlant = item.status === 'at_plant';
      const isCancelled = item.status === 'cancelled' || item.status?.toLowerCase().includes('cancel');
      const isMapDisabled = isAtPlant || isCancelled;

      return (
        <TicketItem
          ticket={item}
          onPress={() => handleTicketPress(item)}
          onMapPress={() => handleMapPress(item)}
          isDark={isDark}
          isMapDisabled={isMapDisabled}
        />
      );
    },
    [isDark, handleTicketPress, handleMapPress]
  );

  const keyExtractor = useCallback((item: DeliveryTicket) => item.id, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.surface }]}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={ms(20)} color={themeColors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
            Delivery Tickets
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.surface }]}
          onPress={() => refetch()}
          activeOpacity={0.7}
          disabled={isRefetching}>
          <Icon
            name="refresh"
            size={ms(20)}
            color={isRefetching ? themeColors.text.hint : themeColors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {!isLoading && (
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={handleSearchClear}
          onSearch={handleSearch}
          onFilterPress={handleFilterPress}
          isDark={isDark}
          activeFiltersCount={activeFiltersCount}
        />
      )}

      {isLoading ? (
        <View style={styles.loaderContainer} pointerEvents="box-none">
          <TruckLoader
            size={120}
            message="Loading tickets..."
            color={isDark ? 'light' : 'dark'}
          />
        </View>
      ) : (
        <FlatList
          style={styles.flatList}
          data={paginatedTickets}
          renderItem={renderTicket}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              hasFilter={activeFiltersCount > 0}
              hasSearch={appliedSearchQuery.trim().length > 0}
              isDark={isDark}
            />
          }
          ListFooterComponent={
            <ListFooterLoader
              isLoading={isFetchingNextPage}
              hasMore={hasNextPage}
              totalItems={filteredTickets.length}
              loadingText="Loading more tickets..."
              endMessageText={filteredTickets.length > 0 ? `Showing all ${filteredTickets.length} tickets` : undefined}
              noMoreText="No more tickets"
            />
          }
          contentContainerStyle={
            filteredTickets.length === 0
              ? styles.listContentEmpty
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main, colors.secondary.main]}
              progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
            />
          }
        />
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={advancedFilters}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTruckContainer: {
    width: ms(40),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(17),
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(2),
  },
  headerCustomerName: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(2),
    maxWidth: '100%',
    paddingHorizontal: ms(10),
  },
  orderHeader: {
    borderRadius: ms(14),
    paddingHorizontal: ms(10),
    paddingTop: ms(4),
    paddingBottom: ms(0),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderTopSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orderIconBox: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(11),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(12),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  orderIconAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ms(3),
    borderTopLeftRadius: ms(11),
    borderTopRightRadius: ms(11),
  },
  orderDetails: {
    flex: 1,
  },
  orderDate: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
    marginBottom: ms(3),
  },
  customerName: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(12),
    marginBottom: ms(2),
  },
  projectName: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginBottom: ms(3),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  orderAddress: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
    flex: 1,
  },
  loadsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginTop: ms(2),
  },
  loadsLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  loadsValue: {
    fontFamily: fontFamily.bold,
    fontSize: ms(12),
  },
  ticketCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(10),
  },
  ticketCountNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  ticketCountLabel: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
    marginTop: ms(1),
  },
  orderDivider: {
    height: 1,
    marginVertical: ms(12),
  },
  headerWeatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: ms(12),
    gap: ms(4),
  },
  weatherEmoji: {
    fontSize: ms(14),
  },
  headerWeatherDescText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    maxWidth: ms(80),
  },
  headerWeatherDot: {
    width: ms(2),
    height: ms(2),
    borderRadius: ms(1),
  },
  headerWeatherInfoText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(10),
  },
  headerEvapRateBadge: {
    paddingHorizontal: ms(8),
    borderRadius: ms(10),
    marginLeft: ms(4),
  },
  headerEvapRateText: {
    fontSize: ms(8),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    lineHeight: ms(13),
  },
  progressSection: {
    marginBottom: ms(8),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  progressTitle: {
    fontFamily: fontFamily.medium,
    fontSize: ms(11),
  },
  progressPercentage: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(13),
  },
  progressBarContainer: {
    height: ms(6),
    borderRadius: ms(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: ms(3),
  },
  progressSegmentsContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  progressBarSegment: {
    height: '100%',
  },
  segmentedProgressSection: {
    marginBottom: ms(6),
    marginTop: ms(4),
  },
  segmentLabelsRow: {
    flexDirection: 'row',
    marginBottom: ms(2),
  },
  segmentLabelContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: ms(2),
  },
  segmentLabelText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  segmentValuesRow: {
    flexDirection: 'row',
    marginTop: ms(2),
  },
  segmentValueContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: ms(2),
  },
  segmentValueText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  progressLegendContainer: {
    overflow: 'hidden',
  },
  progressLegend: {
    flexDirection: 'column',
    marginTop: ms(6),
    marginBottom: ms(8),
    gap: ms(4),
  },
  progressLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  progressLegendDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  progressLegendText: {
    fontSize: ms(10),
    fontFamily: fontFamily.medium,
  },
  progressLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(5),
  },

  flatList: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
  },

  listContentEmpty: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
  },
  listHeader: {
    marginBottom: ms(4),
  },
  listHeaderRow: {
    marginTop: ms(8),
  },
  listHeaderText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  listFooterText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(12),
  },
  separator: {
    height: ms(4),
  },
  ticketItem: {
    flexDirection: 'row',
    borderRadius: ms(12),
    padding: ms(8),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  ticketPressableContent: {
    flex: 1,
    flexDirection: 'row',
  },
  ticketItemPressed: {
    opacity: 0.95,
  },
  ticketActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    paddingLeft: ms(4),
  },
  mapIconButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIconButtonDisabled: {
    opacity: 0.5,
  },
  truckVisualContainer: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: ms(10),
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  truckAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ms(3),
    borderTopLeftRadius: ms(12),
    borderTopRightRadius: ms(12),
  },
  ticketContent: {
    flex: 1,
    justifyContent: 'center',
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ms(1),
  },
  truckName: {
    fontFamily: fontFamily.medium,
    fontSize: ms(12),
    flex: 1,
    marginRight: spacing.xs,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    flexShrink: 0,
  },
  statusIconContainer: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextBadge: {
    paddingVertical: ms(4),
    paddingHorizontal: ms(8),
    borderRadius: ms(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(9),
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  ticketMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: ms(1),
  },
  ticketNumber: {
    fontFamily: fontFamily.bold,
    fontSize: ms(16),
  },
  ticketSeparator: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
    marginHorizontal: ms(5),
  },
  ticketQuantityInline: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(16),
  },
  ticketBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ms(1),
    gap: ms(4),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  timeText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
  },
  loadBadge: {
    paddingHorizontal: ms(8),
    paddingVertical: ms(3),
    borderRadius: ms(6),
    marginRight: ms(8),
  },
  loadText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(10),
  },
  totalText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    flex: 1,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: ms(6),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    marginTop: spacing.xl,
  },
  emptyIconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: ms(20),
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: ms(8),
    gap: ms(10),
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(48),
    borderRadius: ms(12),
    paddingLeft: ms(16),
    paddingRight: ms(6),
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    padding: 0,
    paddingVertical: ms(10),
  },
  clearButton: {
    padding: ms(4),
  },
  searchIconBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ms(8),
  },
  filterButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: ms(2),
    right: ms(2),
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(4),
  },
  filterBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: ms(10),
    color: colors.common.white,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: ms(12),
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    maxHeight: '85%',
    paddingTop: ms(8),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: ms(12),
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(18),
  },
  modalCloseBtn: {
    padding: ms(4),
  },
  modalScroll: {
    paddingHorizontal: spacing.lg,
  },
  filterSection: {
    marginTop: ms(14),
  },
  filterSectionLast: {
    marginTop: ms(14),
    marginBottom: ms(24),
  },
  filterSectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    marginBottom: ms(8),
  },
  filterChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
    alignItems: 'flex-start',
  },
  filterChipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(18),
    borderWidth: 1.5,
  },
  filterChipOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(8),
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(10),
  },
  sortOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  sortOrderContainer: {
    flexDirection: 'row',
    gap: ms(8),
    marginTop: ms(8),
  },
  sortOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(5),
    paddingVertical: ms(10),
    borderRadius: ms(10),
  },
  sortOrderText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ms(12),
    paddingHorizontal: spacing.lg,
    paddingVertical: ms(16),
    paddingBottom: ms(32),
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalResetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ms(6),
    paddingVertical: ms(14),
    borderRadius: ms(12),
    borderWidth: 1,
  },
  modalResetText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
  },
  modalApplyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(14),
    borderRadius: ms(12),
  },
  modalApplyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
});

export default TicketScreen;
