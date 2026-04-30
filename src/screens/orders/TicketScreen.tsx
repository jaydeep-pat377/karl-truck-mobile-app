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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
<<<<<<< Updated upstream
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
=======
import Svg, { Defs, Pattern, Line as SvgLine, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { spacing, ms } from '../../utils/responsive';
import { TAB_BAR_HEIGHT } from '../../components/navigation';
import { RootStackParamList } from '../../navigation/types';

type TicketScreenRouteProp = RouteProp<RootStackParamList, 'Ticket'>;

type TicketStatus = 'at_plant' | 'in_transit' | 'at_site' | 'pouring' | 'completed' | 'returning';

interface DeliveryTicket {
  id: string;
  ticketNumber: string;
  truckId: string;
  truckName: string;
  loadQuantity: number;
  totalOrderQuantity: number;
  unit: string;
  status: TicketStatus;
  scheduledTime: string;
  actualTime?: string;
  driverName?: string;
  driverPhone?: string;
  // Product/Mix Information
  productCode?: string;
  productName?: string;
  mixDesign?: string;
  slump?: string;
  // Delivery Location
  deliveryAddress?: string;
  deliveryCity?: string;
  // Customer Information
  customerName?: string;
  customerPhone?: string;
  customerCompany?: string;
  // Additional Details
  specialInstructions?: string;
  plantName?: string;
  estimatedArrival?: string;
  distance?: string;
}

interface StatusConfig {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  iconBg: string;
  progressStep: number;
}

// Light mode status colors - using common theme colors
const STATUS_CONFIG: Record<TicketStatus, StatusConfig> = {
  at_plant: {
    label: 'AT PLANT',
    icon: 'factory',
    bgColor: colors.ticket.status.atPlant.bg,
    textColor: colors.ticket.status.atPlant.text,
    iconBg: colors.ticket.status.atPlant.iconBg,
    progressStep: 0,
  },
  in_transit: {
    label: 'IN TRANSIT',
    icon: 'truck-fast',
    bgColor: colors.ticket.status.inTransit.bg,
    textColor: colors.ticket.status.inTransit.text,
    iconBg: colors.ticket.status.inTransit.iconBg,
    progressStep: 1,
  },
  at_site: {
    label: 'AT SITE',
    icon: 'map-marker-check',
    bgColor: colors.ticket.status.atSite.bg,
    textColor: colors.ticket.status.atSite.text,
    iconBg: colors.ticket.status.atSite.iconBg,
    progressStep: 2,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    bgColor: colors.ticket.status.pouring.bg,
    textColor: colors.ticket.status.pouring.text,
    iconBg: colors.ticket.status.pouring.iconBg,
    progressStep: 3,
  },
  completed: {
    label: 'COMPLETED',
    icon: 'check-circle',
    bgColor: colors.ticket.status.completed.bg,
    textColor: colors.ticket.status.completed.text,
    iconBg: colors.ticket.status.completed.iconBg,
    progressStep: 4,
  },
  returning: {
    label: 'RETURNING',
    icon: 'truck-delivery',
    bgColor: colors.ticket.status.returning.bg,
    textColor: colors.ticket.status.returning.text,
    iconBg: colors.ticket.status.returning.iconBg,
    progressStep: 4,
  },
};

// Dark mode status colors - using common theme colors
const STATUS_CONFIG_DARK: Record<TicketStatus, StatusConfig> = {
  at_plant: {
    label: 'AT PLANT',
    icon: 'factory',
    bgColor: colors.ticket.statusDark.atPlant.bg,
    textColor: colors.ticket.statusDark.atPlant.text,
    iconBg: colors.ticket.statusDark.atPlant.iconBg,
    progressStep: 0,
  },
  in_transit: {
    label: 'IN TRANSIT',
    icon: 'truck-fast',
    bgColor: colors.ticket.statusDark.inTransit.bg,
    textColor: colors.ticket.statusDark.inTransit.text,
    iconBg: colors.ticket.statusDark.inTransit.iconBg,
    progressStep: 1,
  },
  at_site: {
    label: 'AT SITE',
    icon: 'map-marker-check',
    bgColor: colors.ticket.statusDark.atSite.bg,
    textColor: colors.ticket.statusDark.atSite.text,
    iconBg: colors.ticket.statusDark.atSite.iconBg,
    progressStep: 2,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    bgColor: colors.ticket.statusDark.pouring.bg,
    textColor: colors.ticket.statusDark.pouring.text,
    iconBg: colors.ticket.statusDark.pouring.iconBg,
    progressStep: 3,
  },
  completed: {
    label: 'COMPLETED',
    icon: 'check-circle',
    bgColor: colors.ticket.statusDark.completed.bg,
    textColor: colors.ticket.statusDark.completed.text,
    iconBg: colors.ticket.statusDark.completed.iconBg,
    progressStep: 4,
  },
  returning: {
    label: 'RETURNING',
    icon: 'truck-delivery',
    bgColor: colors.ticket.statusDark.returning.bg,
    textColor: colors.ticket.statusDark.returning.text,
    iconBg: colors.ticket.statusDark.returning.iconBg,
    progressStep: 4,
  },
};

const generateMockTickets = (_orderId: string, _orderCode: string): DeliveryTicket[] => [
  {
    id: 'TKT-001',
    ticketNumber: '45613567',
    truckId: 'T-0512',
    truckName: 'Truck 0512-MILLWOOD',
    loadQuantity: 3.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'at_plant',
    scheduledTime: '07:45 AM',
    driverName: 'John Smith',
    driverPhone: '+1 (555) 123-4567',
    productCode: 'SCCA60',
    productName: '4000 PSI Concrete',
    mixDesign: '4000 PSI BLD NB3',
    slump: '4.00 IN',
    deliveryAddress: '2 School Street',
    deliveryCity: 'Ripley, OK 74062',
    customerName: 'ABC Construction',
    customerPhone: '+1 (555) 987-6543',
    customerCompany: 'ABC Construction Co.',
    specialInstructions: 'Enter through back gate. Contact foreman on arrival.',
    plantName: 'Millwood Plant',
    estimatedArrival: '08:15 AM',
    distance: '12.5 mi',
  },
  {
    id: 'TKT-002',
    ticketNumber: '45613568',
    truckId: 'T-0512',
    truckName: 'Truck 0512-MILLWOOD',
    loadQuantity: 3.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'pouring',
    scheduledTime: '07:45 AM',
    driverName: 'John Smith',
    driverPhone: '+1 (555) 123-4567',
    productCode: 'SCCA60',
    productName: '4000 PSI Concrete',
    mixDesign: '4000 PSI BLD NB3',
    slump: '4.00 IN',
    deliveryAddress: '2 School Street',
    deliveryCity: 'Ripley, OK 74062',
    customerName: 'ABC Construction',
    customerPhone: '+1 (555) 987-6543',
    customerCompany: 'ABC Construction Co.',
    plantName: 'Millwood Plant',
    estimatedArrival: '08:15 AM',
    distance: '12.5 mi',
  },
  {
    id: 'TKT-003',
    ticketNumber: '45613569',
    truckId: 'T-0512',
    truckName: 'Truck 0512-MILLWOOD',
    loadQuantity: 3.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'in_transit',
    scheduledTime: '07:45 AM',
    driverName: 'Mike Johnson',
    driverPhone: '+1 (555) 234-5678',
    productCode: 'SCCA60',
    productName: '4000 PSI Concrete',
    mixDesign: '4000 PSI BLD NB3',
    slump: '4.00 IN',
    deliveryAddress: '2 School Street',
    deliveryCity: 'Ripley, OK 74062',
    customerName: 'XYZ Builders',
    customerPhone: '+1 (555) 876-5432',
    customerCompany: 'XYZ Builders Inc.',
    specialInstructions: 'Pump truck on site. Coordinate with pump operator.',
    plantName: 'Millwood Plant',
    estimatedArrival: '08:30 AM',
    distance: '8.3 mi',
  },
  {
    id: 'TKT-004',
    ticketNumber: '45613570',
    truckId: 'T-0512',
    truckName: 'Truck 0512-MILLWOOD',
    loadQuantity: 3.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'at_site',
    scheduledTime: '07:45 AM',
    driverName: 'Robert Davis',
    driverPhone: '+1 (555) 345-6789',
    productCode: 'SCCA45',
    productName: '3500 PSI Concrete',
    mixDesign: '3500 PSI STD',
    slump: '5.00 IN',
    deliveryAddress: '456 Oak Avenue',
    deliveryCity: 'Cushing, OK 74023',
    customerName: 'Metro Development',
    customerPhone: '+1 (555) 765-4321',
    customerCompany: 'Metro Development LLC',
    plantName: 'Central Plant',
    estimatedArrival: '08:00 AM',
    distance: '15.2 mi',
  },
  {
    id: 'TKT-005',
    ticketNumber: '45613571',
    truckId: 'T-0512',
    truckName: 'Truck 0512-MILLWOOD',
    loadQuantity: 3.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'completed',
    scheduledTime: '07:45 AM',
    driverName: 'James Wilson',
    driverPhone: '+1 (555) 456-7890',
    productCode: 'SCCA60',
    productName: '4000 PSI Concrete',
    mixDesign: '4000 PSI BLD NB3',
    slump: '4.00 IN',
    deliveryAddress: '789 Main Street',
    deliveryCity: 'Stillwater, OK 74074',
    customerName: 'Premier Concrete',
    customerPhone: '+1 (555) 654-3210',
    customerCompany: 'Premier Concrete Services',
    plantName: 'Millwood Plant',
    distance: '20.1 mi',
  },
  {
    id: 'TKT-006',
    ticketNumber: '45613572',
    truckId: 'T-0512',
    truckName: 'Truck 0512-MILLWOOD',
    loadQuantity: 3.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'in_transit',
    scheduledTime: '08:15 AM',
    driverName: 'Chris Brown',
    driverPhone: '+1 (555) 567-8901',
    productCode: 'SCCA50',
    productName: '3000 PSI Concrete',
    mixDesign: '3000 PSI PUMP',
    slump: '6.00 IN',
    deliveryAddress: '321 Industrial Blvd',
    deliveryCity: 'Perry, OK 73077',
    customerName: 'Industrial Partners',
    customerPhone: '+1 (555) 543-2109',
    customerCompany: 'Industrial Partners Corp.',
    specialInstructions: 'Call 30 minutes before arrival.',
    plantName: 'Millwood Plant',
    estimatedArrival: '09:00 AM',
    distance: '18.7 mi',
  },
  {
    id: 'TKT-007',
    ticketNumber: '45613573',
    truckId: 'T-0718',
    truckName: 'Truck 0718-CENTRAL',
    loadQuantity: 4.50,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'at_site',
    scheduledTime: '08:30 AM',
    driverName: 'David Lee',
    driverPhone: '+1 (555) 678-9012',
    productCode: 'SCCA70',
    productName: '5000 PSI Concrete',
    mixDesign: '5000 PSI HIGH STR',
    slump: '3.50 IN',
    deliveryAddress: '555 Commerce Drive',
    deliveryCity: 'Guthrie, OK 73044',
    customerName: 'Skyline Construction',
    customerPhone: '+1 (555) 432-1098',
    customerCompany: 'Skyline Construction Group',
    specialInstructions: 'High-strength mix for foundation. Vibrate thoroughly.',
    plantName: 'Central Plant',
    estimatedArrival: '09:15 AM',
    distance: '25.3 mi',
  },
  {
    id: 'TKT-008',
    ticketNumber: '45613574',
    truckId: 'T-0923',
    truckName: 'Truck 0923-RIVERSIDE',
    loadQuantity: 5.00,
    totalOrderQuantity: 300,
    unit: 'CY',
    status: 'completed',
    scheduledTime: '06:30 AM',
    driverName: 'Tom Garcia',
    driverPhone: '+1 (555) 789-0123',
    productCode: 'SCCA60',
    productName: '4000 PSI Concrete',
    mixDesign: '4000 PSI BLD NB3',
    slump: '4.00 IN',
    deliveryAddress: '999 River Road',
    deliveryCity: 'Edmond, OK 73034',
    customerName: 'Riverside Developers',
    customerPhone: '+1 (555) 321-0987',
    customerCompany: 'Riverside Developers LLC',
    plantName: 'Riverside Plant',
    distance: '30.0 mi',
  },
];

interface StatusBadgeProps {
  status: StatusConfig;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <View style={styles.statusBadgeContainer}>
      <View style={[styles.statusIconContainer, { backgroundColor: status.iconBg }]}>
        <Icon name={status.icon} size={ms(14)} color={status.textColor} />
      </View>
      <View style={[styles.statusTextBadge, { backgroundColor: status.bgColor }]}>
        <Text style={[styles.statusText, { color: status.textColor }]}>
          {status.label}
        </Text>
      </View>
    </View>
  );
};

interface TruckVisualProps {
  isDark: boolean;
}

const TruckVisual: React.FC<TruckVisualProps> = ({ isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const iconColor = isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main;

  return (
    <View
      style={[
        styles.truckVisualContainer,
        {
          backgroundColor: themeColors.card,
          shadowColor: isDark ? '#000' : colors.primary.main,
        },
      ]}>
      <View style={[styles.truckAccentLine, { backgroundColor: iconColor }]} />
      <Icon name="truck-delivery" size={ms(24)} color={iconColor} />
    </View>
  );
};

interface TicketItemProps {
  ticket: DeliveryTicket;
  onPress: () => void;
  isDark: boolean;
}

<<<<<<< Updated upstream
const TicketItem: React.FC<TicketItemProps> = ({ ticket, onPress, isDark }) => {
=======
const TicketItem: React.FC<TicketItemProps> = ({ ticket, onPress, onMapPress, isDark, isMapDisabled = false, statusConfig }) => {
  const { t } = useTranslation();
>>>>>>> Stashed changes
  const themeColors = isDark ? colors.dark : colors.light;
  const statusConfigMap = isDark ? STATUS_CONFIG_DARK : STATUS_CONFIG;
  const status = statusConfigMap[ticket.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ticketItem,
        { backgroundColor: themeColors.card },
        pressed && styles.ticketItemPressed,
      ]}>
      <TruckVisual isDark={isDark} />

      <View style={styles.ticketContent}>
        <View style={styles.ticketTopRow}>
          <Text
            style={[styles.truckName, { color: themeColors.text.secondary }]}
            numberOfLines={1}>
            {ticket.truckName}
          </Text>
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
<<<<<<< Updated upstream
=======
            {ticket.load ? (
              <View style={[styles.loadBadge, { backgroundColor: isDark ? colors.ticket.ui.dark.badgeBg : colors.primary.main + '12' }]}>
                <Text style={[styles.loadText, { color: isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main }]}>
                  {t('tickets.list.loadLabel', { load: ticket.load })}
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
>>>>>>> Stashed changes
          </View>
        </View>

        <View style={styles.ticketMainRow}>
          <Text style={[styles.ticketNumber, { color: themeColors.text.primary }]}>
            {ticket.ticketNumber}
          </Text>
          <Text style={[styles.ticketSeparator, { color: themeColors.text.primary }]}>:</Text>
          <Text style={[styles.ticketQuantityInline, { color: themeColors.text.primary }]}>
            {ticket.loadQuantity.toFixed(2)}{ticket.unit}
          </Text>
        </View>

        <View style={styles.ticketBottomRow}>
          <Text style={[styles.totalText, { color: themeColors.text.hint }]}>
            {ticket.loadQuantity.toFixed(2)} OF {ticket.totalOrderQuantity} {ticket.unit}
          </Text>
          <StatusBadge status={status} />
        </View>
      </View>

      <View style={styles.chevronContainer}>
        <Icon
          name="chevron-right"
          size={ms(22)}
          color={isDark ? colors.ticket.ui.dark.chevron : colors.ticket.ui.light.chevron}
        />
      </View>
    </Pressable>
  );
};

interface OrderHeaderProps {
  orderDate: string;
  deliveryAddress: string;
  tickets: DeliveryTicket[];
  isDark: boolean;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  orderDate,
  deliveryAddress,
  tickets,
  isDark,
}) => {
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const ticketUi = isDark ? colors.ticket.ui.dark : colors.ticket.ui.light;
  const accentColor = isDark ? colors.ticket.ui.dark.accentBlue : colors.primary.main;
  const accentColorLight = isDark ? colors.ticket.ui.dark.accentBlueLight : colors.primary.main;

  const progressData = useMemo(() => {
    const totalDelivered = tickets
      .filter(t => t.status === 'completed' || t.status === 'returning')
      .reduce((sum, t) => sum + t.loadQuantity, 0);
    const totalOrdered = tickets[0]?.totalOrderQuantity || 0;
    const percentage = totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;
    const ticketCount = tickets.length;

    return { totalDelivered, totalOrdered, percentage, ticketCount };
  }, [tickets]);

  return (
    <View style={[styles.orderHeader, { backgroundColor: themeColors.card }]}>
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
            {t('tickets.list.orderHeaderDate', { date: orderDate })}
          </Text>
          <View style={styles.addressRow}>
            <Icon name="map-marker-outline" size={ms(14)} color={themeColors.text.hint} />
            <Text
              style={[styles.orderAddress, { color: themeColors.text.secondary }]}
              numberOfLines={1}>
              {deliveryAddress}
            </Text>
          </View>
<<<<<<< Updated upstream
=======
          <View style={styles.loadsRow}>
            <ConcreteTruck width={ms(18)} height={ms(12)} color={colors.success.main} />
            <Text style={[styles.loadsLabel, { color: themeColors.text.hint }]}>
              {t('tickets.list.totalTickets')}
            </Text>
            <Text style={[styles.loadsValue, { color: colors.success.main }]}>
              {totalTickets}
            </Text>
          </View>
          <View style={styles.loadsRow}>
            <Icon name="clipboard-text-outline" size={ms(14)} color={isDark ? colors.common.white : colors.common.black} />
            <Text style={[styles.loadsLabel, { color: themeColors.text.hint }]}>
              {t('tickets.list.orderLabel')}
            </Text>
            <Text style={[styles.loadsValue, { color: isDark ? colors.common.white : colors.common.black }]}>
              {orderCode}
            </Text>
          </View>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            Loads
=======
            {t('tickets.list.tickets')}
>>>>>>> Stashed changes
          </Text>
        </View>
      </View>

<<<<<<< Updated upstream
=======

      {weatherData && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onWeatherPress}
          style={styles.headerWeatherRow}>
          <WeatherIcon icon={weatherData.weather_icon} size={22} />
          <Text
            style={[styles.headerWeatherDescText, { color: themeColors.text.secondary }]}
            numberOfLines={1}>
            {weatherData.weather_description || t('tickets.list.partlyCloudy')}
          </Text>
          {weatherData.temperature_fahrenheit !== null && weatherData.temperature_fahrenheit !== undefined && (
            <>
              <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
              <Text style={[styles.headerWeatherInfoText, { color: themeColors.text.secondary }]}>
                {Math.round(weatherData.temperature_fahrenheit)}°F
              </Text>
            </>
          )}
          {weatherData.wind_speed_mph !== null && weatherData.wind_speed_mph !== undefined && (
            <>
              <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
              <Text style={[styles.headerWeatherInfoText, { color: themeColors.text.secondary }]}>
                {t('tickets.list.mphWind', { value: weatherData.wind_speed_mph })}
              </Text>
            </>
          )}
          {weatherData.humidity !== null && weatherData.humidity !== undefined && (
            <>
              <View style={[styles.headerWeatherDot, { backgroundColor: themeColors.text.hint }]} />
              <Text style={[styles.headerWeatherInfoText, { color: themeColors.text.secondary }]}>
                {t('tickets.list.humidityRh', { value: weatherData.humidity })}
              </Text>
            </>
          )}
          {(() => {
            const concreteEvapLevel = weatherData.concrete_evaporation_level;
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
                    styles.headerEvapRateBadge,
                    { backgroundColor: concreteEvapColors[concreteEvapLevel] || colors.grey[40] },
                  ]}>
                  <Text style={styles.headerEvapRateText}>
                    {concreteEvapLevel}
                  </Text>
                </View>
              );
            }
            if (weatherData.evaporation_rate !== null && weatherData.evaporation_rate !== undefined) {
              return (
                <View
                  style={[
                    styles.headerEvapRateBadge,
                    { backgroundColor: getEvaporationBgColor(weatherData.evaporation_rate) },
                  ]}>
                  <Text style={styles.headerEvapRateText}>
                    {getEvaporationText(weatherData.evaporation_rate)}
                  </Text>
                </View>
              );
            }
            return null;
          })()}
        </TouchableOpacity>
      )}

>>>>>>> Stashed changes
      <View style={[styles.orderDivider, { backgroundColor: themeColors.border }]} />

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: themeColors.text.secondary }]}>
<<<<<<< Updated upstream
            Delivery Progress
          </Text>
          <Text style={[styles.progressPercentage, { color: accentColor }]}>
            {progressData.percentage.toFixed(0)}%
          </Text>
        </View>
        <View style={[styles.progressBarContainer, { backgroundColor: ticketUi.progressBg }]}>
=======
            {t('tickets.list.deliveryStatus')}
          </Text>
        </View>

        {deliveryProgress?.segments && deliveryProgress.segments.length > 0 ? (
          <TicketDeliveryProgressBar
            segments={deliveryProgress.segments}
            orderedQty={orderedQty}
            totalDeliveredQty={totalDeliveredQty}
            totalLoads={totalLoads}
            totalTickets={totalTickets}
            isDark={isDark}
          />
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
              {progressDisplay || t('tickets.list.cyDelivered', { delivered: (progressData.totalDelivered ?? 0).toFixed(1), ordered: progressData.totalOrdered ?? 0 })}
            </Text>
          </>
        )}

      </View>
    </View>
  );
};

interface TicketDeliveryProgressBarProps {
  segments: DeliveryProgressSegment[];
  orderedQty: number;
  totalDeliveredQty: number;
  totalLoads: number;
  totalTickets: number;
  isDark: boolean;
}

const TicketDeliveryProgressBar: React.FC<TicketDeliveryProgressBarProps> = ({
  segments,
  orderedQty,
  totalDeliveredQty,
  totalLoads,
  totalTickets,
  isDark,
}) => {
  const themeColors = isDark ? colors.dark : colors.light;

  const { fills: progressFills, atPlantQty } = computeCumulativeFills(
    segments,
    totalLoads,
    totalTickets,
  );
  const completionPercent = orderedQty > 0 ? ((atPlantQty / orderedQty) * 100).toFixed(2) : '0.00';
  const deliveredPercent = orderedQty > 0 ? Math.round((totalDeliveredQty / orderedQty) * 100) : 0;

  const segmentColors = PROGRESS_STATUSES.map(status => {
    const apiSeg = segments.find((s: any) => s.status === status.key);
    return apiSeg?.color || FALLBACK_COLOR;
  });

  // Tooltip state
  const [tooltipKey, setTooltipKey] = React.useState<string | null>(null);
  const [tooltipY, setTooltipY] = React.useState(0);
  const progressBarRef = React.useRef<View>(null);

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
    <View style={styles.ticketProgressSection}>
      <View ref={progressBarRef} style={styles.ticketProgressMainRow}>
        <Pressable onPress={handleInfoPress} hitSlop={8}>
          <Icon
            name="information-outline"
            size={ms(14)}
            color={themeColors.text.hint}
          />
        </Pressable>
        <View style={styles.ticketSegmentBarsRow}>
          {PROGRESS_STATUSES.map((status, index) => (
            <React.Fragment key={`bar-${status.key}`}>
              <Pressable
                style={styles.ticketSegmentBarWrapper}
                onPress={() => handleSegmentPress(status.key)}
              >
                <View style={styles.ticketSegmentTrack}>
                  <SegmentStripes color={segmentColors[index]} patternId={`ticket-stripe-${status.key}`} />
                  <View
                    style={[
                      styles.ticketSegmentFillOverlay,
                      {
                        width: `${progressFills[index]}%`,
                        backgroundColor: segmentColors[index],
                      },
                    ]}
                  />
                </View>
              </Pressable>
              {index < PROGRESS_STATUSES.length - 1 && (
                <View style={[styles.ticketSegmentDividerDotted, { borderColor: themeColors.text.hint }]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.ticketCyValueText, { color: themeColors.text.primary }]}
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
        <Pressable style={styles.ticketTooltipBackdrop} onPress={() => setTooltipKey(null)}>
>>>>>>> Stashed changes
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressData.percentage}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>

<<<<<<< Updated upstream
        <Text style={[styles.progressLabel, { color: themeColors.text.hint }]}>
          {progressData.totalDelivered.toFixed(1)} of {progressData.totalOrdered} CY delivered
=======
      <View style={styles.ticketCompletionRow}>
        <Text style={[styles.ticketCompletionText, { color: getCompletionColor(deliveredPercent) }]}>
          {completionPercent}% {t('tickets.list.completed')}
        </Text>
      </View>

      <View style={styles.ticketLoadsCountRow}>
        <ConcreteTruck width={ms(14)} height={ms(10)} color={themeColors.text.secondary} />
        <Text style={[styles.ticketLoadsCountText, { color: themeColors.text.secondary }]}>
          {t('tickets.list.loadsCount', { active: totalTickets, total: totalLoads })}
>>>>>>> Stashed changes
        </Text>
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
  const { t } = useTranslation();
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
        {hasSearch ? t('tickets.list.noResultsFound') : hasFilter ? t('tickets.list.noMatchingTickets') : t('tickets.list.noTicketsYet')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.text.secondary }]}>
        {hasSearch
          ? t('tickets.list.tryDifferentSearch')
          : hasAnyFilter
            ? t('tickets.list.tryAdjustingFilters')
            : t('tickets.list.ticketsWillAppear')}
      </Text>
    </View>
  );
};

// ============================================================================
// SEARCH BAR COMPONENT
// ============================================================================

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onFilterPress: () => void;
  isDark: boolean;
  activeFiltersCount: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onFilterPress,
  isDark,
  activeFiltersCount,
}) => {
  const { t } = useTranslation();
  const themeColors = isDark ? colors.dark : colors.light;
  const ticketUi = isDark ? colors.ticket.ui.dark : colors.ticket.ui.light;

  return (
    <View style={styles.searchContainer}>
      <View style={[styles.searchInputWrapper, { backgroundColor: themeColors.card }]}>
        <Icon
          name="magnify"
          size={ms(20)}
          color={themeColors.text.hint}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
<<<<<<< Updated upstream
          placeholder="Search tickets, trucks, drivers..."
          placeholderTextColor={themeColors.text.hint}
=======
          placeholder={t('tickets.list.searchPlaceholder')}
          placeholderTextColor={isDark ? themeColors.text.hint : colors.grey[40]}
>>>>>>> Stashed changes
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Icon name="close-circle" size={ms(18)} color={themeColors.text.hint} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.filterButton,
          {
            backgroundColor: activeFiltersCount > 0 ? colors.primary.main : themeColors.card,
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

// ============================================================================
// FILTER MODAL COMPONENT
// ============================================================================

interface FilterOptions {
  statuses: TicketStatus[];
  sortBy: 'time' | 'ticket' | 'quantity';
  sortOrder: 'asc' | 'desc';
  trucks: string[];
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
  isDark: boolean;
  availableTrucks: string[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  isDark,
  availableTrucks,
}) => {
  const { t } = useTranslation();
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

  const toggleTruck = (truck: string) => {
    setLocalFilters(prev => ({
      ...prev,
      trucks: prev.trucks.includes(truck)
        ? prev.trucks.filter(t => t !== truck)
        : [...prev.trucks, truck],
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
      sortOrder: 'asc',
      trucks: [],
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  const statusOptions: { id: TicketStatus; label: string; color: string }[] = [
<<<<<<< Updated upstream
    { id: 'at_plant', label: 'At Plant', color: colors.ticket.status.atPlant.text },
    { id: 'in_transit', label: 'In Transit', color: colors.ticket.status.inTransit.text },
    { id: 'at_site', label: 'At Site', color: colors.ticket.status.atSite.text },
    { id: 'pouring', label: 'Pouring', color: colors.ticket.status.pouring.text },
    { id: 'completed', label: 'Completed', color: colors.ticket.status.completed.text },
    { id: 'returning', label: 'Returning', color: colors.ticket.status.returning.text },
  ];

  const sortOptions: { id: 'time' | 'ticket' | 'quantity'; label: string; icon: string }[] = [
    { id: 'time', label: 'Scheduled Time', icon: 'clock-outline' },
    { id: 'ticket', label: 'Ticket Number', icon: 'ticket-outline' },
    { id: 'quantity', label: 'Load Quantity', icon: 'weight' },
=======
    { id: 'pending', label: t('tickets.list.statusPending'), color: statusConfig.pending.textColor },
    { id: 'ticketed', label: t('tickets.list.statusTicketed'), color: statusConfig.ticketed.textColor },
    { id: 'loading', label: t('tickets.list.statusLoading'), color: statusConfig.loading.textColor },
    { id: 'loaded', label: t('tickets.list.statusLoaded'), color: statusConfig.loaded.textColor },
    { id: 'to_job', label: t('tickets.list.statusToJob'), color: statusConfig.to_job.textColor },
    { id: 'at_job', label: t('tickets.list.statusAtJob'), color: statusConfig.at_job.textColor },
    { id: 'pouring', label: t('tickets.list.statusPouring'), color: statusConfig.pouring.textColor },
    { id: 'washing', label: t('tickets.list.statusWashing'), color: statusConfig.washing.textColor },
    { id: 'to_plant', label: t('tickets.list.statusToPlant'), color: statusConfig.to_plant.textColor },
    { id: 'at_plant', label: t('tickets.list.statusAtPlant'), color: statusConfig.at_plant.textColor },
    { id: 'cancelled', label: t('tickets.list.voided'), color: statusConfig.cancelled.textColor },
  ];

  const sortOptions: { id: 'time'; label: string; icon: string }[] = [
    { id: 'time', label: t('tickets.list.scheduledTime'), icon: 'clock-outline' },
>>>>>>> Stashed changes
  ];

  const activeFiltersCount =
    localFilters.statuses.length +
    localFilters.trucks.length +
    (localFilters.sortBy !== 'time' || localFilters.sortOrder !== 'asc' ? 1 : 0);

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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>
                {t('tickets.list.filterTickets')}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Icon name="close" size={ms(24)} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  {t('tickets.list.status')}
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
                                ? 'rgba(255,255,255,0.08)'
                                : '#F5F5F5',
                            borderColor: isSelected ? status.color : 'transparent',
                          },
                        ]}
                        onPress={() => toggleStatus(status.id)}>
                        {isSelected && (
                          <Icon name="check" size={ms(14)} color={status.color} />
                        )}
                        <Text
                          style={[
                            styles.filterChipOptionText,
                            { color: isSelected ? status.color : themeColors.text.secondary },
                          ]}>
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                  {t('tickets.list.sortBy')}
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
                                ? 'rgba(255,255,255,0.08)'
                                : '#F5F5F5',
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

                {/* Sort Order */}
                <View style={styles.sortOrderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderBtn,
                      {
                        backgroundColor:
                          localFilters.sortOrder === 'asc'
                            ? colors.primary.main
                            : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#F5F5F5',
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
                      {t('tickets.list.ascending')}
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
                              ? 'rgba(255,255,255,0.08)'
                              : '#F5F5F5',
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
                      {t('tickets.list.descending')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Truck Filter */}
              {availableTrucks.length > 0 && (
                <View style={styles.filterSectionLast}>
                  <Text style={[styles.filterSectionTitle, { color: themeColors.text.primary }]}>
                    Trucks
                  </Text>
                  <View style={styles.filterChipsGrid}>
                    {availableTrucks.map(truck => {
                      const isSelected = localFilters.trucks.includes(truck);
                      return (
                        <TouchableOpacity
                          key={truck}
                          style={[
                            styles.filterChipOption,
                            {
                              backgroundColor: isSelected
                                ? `${colors.primary.main}20`
                                : isDark
                                  ? 'rgba(255,255,255,0.08)'
                                  : '#F5F5F5',
                              borderColor: isSelected ? colors.primary.main : 'transparent',
                            },
                          ]}
                          onPress={() => toggleTruck(truck)}>
                          {isSelected && (
                            <Icon name="check" size={ms(14)} color={colors.primary.main} />
                          )}
                          <Text
                            style={[
                              styles.filterChipOptionText,
                              {
                                color: isSelected
                                  ? colors.primary.main
                                  : themeColors.text.secondary,
                              },
                            ]}>
                            {truck}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={{ height: ms(80) }} />
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <TouchableOpacity
                style={[styles.modalResetBtn, { borderColor: themeColors.border }]}
                onPress={handleReset}>
<<<<<<< Updated upstream
                <Icon name="refresh" size={ms(18)} color={themeColors.text.secondary} />
                <Text style={[styles.modalResetText, { color: themeColors.text.secondary }]}>
                  Reset
=======
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
                  {t('tickets.list.reset')}
>>>>>>> Stashed changes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApplyBtn, { backgroundColor: colors.primary.main }]}
                onPress={handleApply}>
                <Text style={styles.modalApplyText}>
                  {t('tickets.list.apply')}{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
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
  sortOrder: 'asc',
  trucks: [],
};

export const TicketScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<TicketScreenRouteProp>();
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const { orderId, orderCode } = route.params;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterOptions>(DEFAULT_FILTERS);

<<<<<<< Updated upstream
  const allTickets = useMemo(
    () => generateMockTickets(orderId, orderCode),
    [orderId, orderCode]
=======
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
    statusColors: apiStatusColors,
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
    : t('tickets.list.order');
  const deliveryAddress = order?.delivery_address || t('common.loading');

  const getDisplayStatus = useCallback((status: string, statusDisplay: string): string => {
    const lowerStatus = status?.toLowerCase() || '';
    const lowerDisplay = statusDisplay?.toLowerCase() || '';

    if (lowerStatus.includes('cancel') || lowerDisplay.includes('cancel')) {
      return t('tickets.list.voided');
    }
    return statusDisplay || status || '';
  }, [t]);

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
        truckName: t('tickets.list.truckPrefix', { code: truckCode || t('common.notAvailable') }),
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
>>>>>>> Stashed changes
  );

  // Get unique truck names for filter modal
  const availableTrucks = useMemo(() => {
    const trucks = new Set(allTickets.map(t => t.truckId));
    return Array.from(trucks);
  }, [allTickets]);

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.statuses.length > 0) count += advancedFilters.statuses.length;
    if (advancedFilters.trucks.length > 0) count += advancedFilters.trucks.length;
    if (advancedFilters.sortBy !== 'time' || advancedFilters.sortOrder !== 'asc') count += 1;
    return count;
  }, [advancedFilters]);

  const filteredTickets = useMemo(() => {
    let tickets = allTickets;

    // Apply status filter from modal
    if (advancedFilters.statuses.length > 0) {
      tickets = tickets.filter(ticket => advancedFilters.statuses.includes(ticket.status));
    }

    // Apply truck filter
    if (advancedFilters.trucks.length > 0) {
      tickets = tickets.filter(ticket => advancedFilters.trucks.includes(ticket.truckId));
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      tickets = tickets.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.truckName.toLowerCase().includes(query) ||
        ticket.truckId.toLowerCase().includes(query) ||
        (ticket.driverName && ticket.driverName.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    tickets = [...tickets].sort((a, b) => {
      let comparison = 0;
      switch (advancedFilters.sortBy) {
        case 'time':
          comparison = a.scheduledTime.localeCompare(b.scheduledTime);
          break;
        case 'ticket':
          comparison = a.ticketNumber.localeCompare(b.ticketNumber);
          break;
        case 'quantity':
          comparison = a.loadQuantity - b.loadQuantity;
          break;
      }
      return advancedFilters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return tickets;
  }, [allTickets, advancedFilters, searchQuery]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  }, []);

  const handleTicketPress = useCallback((ticket: DeliveryTicket) => {
    navigation.navigate('TicketDetail', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      truckId: ticket.truckId,
      truckName: ticket.truckName,
      loadQuantity: ticket.loadQuantity,
      totalOrderQuantity: ticket.totalOrderQuantity,
      unit: ticket.unit,
      status: ticket.status,
      scheduledTime: ticket.scheduledTime,
      actualTime: ticket.actualTime,
      driverName: ticket.driverName,
      driverPhone: ticket.driverPhone,
      orderCode: orderCode,
      // Product/Mix Information
      productCode: ticket.productCode,
      productName: ticket.productName,
      mixDesign: ticket.mixDesign,
      slump: ticket.slump,
      // Delivery Location
      deliveryAddress: ticket.deliveryAddress,
      deliveryCity: ticket.deliveryCity,
      // Customer Information
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      customerCompany: ticket.customerCompany,
      // Additional Details
      specialInstructions: ticket.specialInstructions,
      plantName: ticket.plantName,
      estimatedArrival: ticket.estimatedArrival,
      distance: ticket.distance,
    });
  }, [navigation, orderCode]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
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

  const renderHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <OrderHeader
        orderDate="11 Nov 2025"
        deliveryAddress="2 SCHOOL STREET, RIPLEY"
        tickets={allTickets}
        isDark={isDark}
      />
      <View style={styles.listHeaderRow}>
        <Text style={[styles.listHeaderText, { color: themeColors.text.secondary }]}>
<<<<<<< Updated upstream
          {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
=======
          {t('tickets.list.ticketsCount', { count: activeTickets })}{cancelledTickets > 0 ? t('tickets.list.voidedSuffix', { count: cancelledTickets }) : ''}
>>>>>>> Stashed changes
        </Text>
      </View>
    </View>
  ), [allTickets, filteredTickets.length, isDark, themeColors]);

  const renderTicket = useCallback(
    ({ item }: { item: DeliveryTicket }) => (
      <TicketItem
        ticket={item}
        onPress={() => handleTicketPress(item)}
        isDark={isDark}
      />
    ),
    [isDark, handleTicketPress]
  );

  const keyExtractor = useCallback((item: DeliveryTicket) => item.id, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.surface }]}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={ms(20)} color={themeColors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
            {t('tickets.list.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.text.hint }]}>
            Order #{orderCode}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.surface }]}
          onPress={handleRefresh}
          activeOpacity={0.7}>
          <Icon name="refresh" size={ms(20)} color={themeColors.text.primary} />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={handleSearchClear}
        onFilterPress={handleFilterPress}
        isDark={isDark}
        activeFiltersCount={activeFiltersCount}
      />

<<<<<<< Updated upstream
      <FlatList
        style={styles.flatList}
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            hasFilter={activeFiltersCount > 0}
            hasSearch={searchQuery.trim().length > 0}
            isDark={isDark}
          />
        }
        contentContainerStyle={
          filteredTickets.length === 0
            ? styles.listContentEmpty
            : styles.listContent
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.main}
            colors={[colors.primary.main]}
          />
        }
      />
=======
      {isLoading ? (
        <View style={styles.loaderContainer} pointerEvents="box-none">
          <TruckLoader
            size={120}
            message={t('tickets.list.loadingTickets')}
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
              loadingText={t('tickets.list.loadingMoreTickets')}
              endMessageText={filteredTickets.length > 0 ? t('tickets.list.showingAllTickets', { count: filteredTickets.length }) : undefined}
              noMoreText={t('tickets.list.noMoreTickets')}
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
>>>>>>> Stashed changes

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={advancedFilters}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        isDark={isDark}
        availableTrucks={availableTrucks}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
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
  orderHeader: {
    borderRadius: ms(14),
    padding: ms(14),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  progressSection: {},
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
  progressLabel: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
    marginTop: ms(5),
  },
  // FlatList takes remaining space
  flatList: {
    flex: 1,
  },
  // Content styles - no flexGrow to prevent centering
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.xl,
  },
  // Only for empty state - enables vertical centering
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
  },
  ticketItemPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
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
  },
  statusIconContainer: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextBadge: {
    width: ms(70),
    paddingVertical: ms(4),
    borderRadius: ms(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(8),
    letterSpacing: 0.2,
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
  totalText: {
    fontFamily: fontFamily.regular,
    fontSize: ms(11),
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
  // Search Bar Styles
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
    height: ms(44),
    borderRadius: ms(12),
    paddingHorizontal: ms(12),
  },
  searchIcon: {
    marginRight: ms(8),
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: ms(14),
    padding: 0,
  },
  clearButton: {
    padding: ms(4),
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
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
