import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader, AlertModal } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';
import { useTicketDetails, useAlert } from '../../hooks';
import { ApiTicketStatus } from '../../types/ticket';

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;

// Design constants
const GRID = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24 };

// Gradient colors for light/dark theme (green for both themes)
const HEADER_GRADIENT_LIGHT = [colors.primary.dark, colors.primary.main, colors.primary.light];
const HEADER_GRADIENT_DARK = [colors.primary.dark, colors.primary.main, colors.primary.light];

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  progressStep: number;
}

// Header badge colors - designed to be visible on green gradient header
interface HeaderBadgeColors {
  bgColor: string;
  textColor: string;
  iconColor: string;
}

const getHeaderBadgeColors = (status: ApiTicketStatus, isDark: boolean): HeaderBadgeColors => {
  // Colors designed to be visible on green gradient header - using centralized theme colors
  const statusColors: Record<ApiTicketStatus, HeaderBadgeColors> = {
    pending: {
      bgColor: colors.ticketBadge.pending.bg,
      textColor: colors.ticketBadge.pending.text,
      iconColor: colors.ticketBadge.pending.icon,
    },
    ticketed: {
      bgColor: colors.ticketBadge.ticketed.bg,
      textColor: colors.ticketBadge.ticketed.text,
      iconColor: colors.ticketBadge.ticketed.icon,
    },
    loading: {
      bgColor: colors.ticketBadge.loading.bg,
      textColor: colors.ticketBadge.loading.text,
      iconColor: colors.ticketBadge.loading.icon,
    },
    loaded: {
      bgColor: colors.ticketBadge.loaded.bg,
      textColor: colors.ticketBadge.loaded.text,
      iconColor: colors.ticketBadge.loaded.icon,
    },
    to_job: {
      bgColor: colors.ticketBadge.toJob.bg,
      textColor: colors.ticketBadge.toJob.text,
      iconColor: colors.ticketBadge.toJob.icon,
    },
    at_job: {
      bgColor: colors.ticketBadge.atJob.bg,
      textColor: colors.ticketBadge.atJob.text,
      iconColor: colors.ticketBadge.atJob.icon,
    },
    pouring: {
      bgColor: colors.ticketBadge.pouring.bg,
      textColor: colors.ticketBadge.pouring.text,
      iconColor: colors.ticketBadge.pouring.icon,
    },
    washing: {
      bgColor: colors.ticketBadge.washing.bg,
      textColor: colors.ticketBadge.washing.text,
      iconColor: colors.ticketBadge.washing.icon,
    },
    to_plant: {
      bgColor: colors.ticketBadge.toPlant.bg,
      textColor: colors.ticketBadge.toPlant.text,
      iconColor: colors.ticketBadge.toPlant.icon,
    },
    at_plant: {
      bgColor: colors.ticketBadge.atPlant.bg,
      textColor: colors.ticketBadge.atPlant.text,
      iconColor: colors.ticketBadge.atPlant.icon,
    },
    cancelled: {
      bgColor: colors.ticketBadge.cancelled.bg,
      textColor: colors.ticketBadge.cancelled.text,
      iconColor: colors.ticketBadge.cancelled.icon,
    },
  };

  return statusColors[status] || statusColors.pending;
};

// Status config matching API statuses - matching OrderTrackingScreen colors
const STATUS_CONFIG_LIGHT: Record<ApiTicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    color: '#9E9E9E',
    bgColor: '#9E9E9E15',
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    color: '#9E9E9E',
    bgColor: '#9E9E9E15',
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'truck-loading',
    color: '#8BC34A',
    bgColor: '#8BC34A15',
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    color: '#2E7D32',
    bgColor: '#2E7D3215',
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    color: '#2E7D32',
    bgColor: '#2E7D3215',
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    color: '#64B5F6',
    bgColor: '#64B5F615',
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    color: '#1565C0',
    bgColor: '#1565C015',
    progressStep: 6,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    color: '#C62828',
    bgColor: '#C6282815',
    progressStep: 7,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    color: '#EC407A',
    bgColor: '#EC407A15',
    progressStep: 8,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'factory',
    color: '#EC407A',
    bgColor: '#EC407A15',
    progressStep: 9,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    color: '#EF4444',
    bgColor: '#EF444415',
    progressStep: -1,
  },
};

const STATUS_CONFIG_DARK: Record<ApiTicketStatus, StatusConfig> = {
  pending: {
    label: 'PENDING',
    icon: 'clock-outline',
    color: '#9E9E9E',
    bgColor: '#9E9E9E20',
    progressStep: 0,
  },
  ticketed: {
    label: 'TICKETED',
    icon: 'ticket-outline',
    color: '#9E9E9E',
    bgColor: '#9E9E9E20',
    progressStep: 1,
  },
  loading: {
    label: 'LOADING',
    icon: 'truck-loading',
    color: '#8BC34A',
    bgColor: '#8BC34A20',
    progressStep: 2,
  },
  loaded: {
    label: 'LOADED',
    icon: 'truck-check',
    color: '#2E7D32',
    bgColor: '#2E7D3220',
    progressStep: 3,
  },
  to_job: {
    label: 'TO JOB',
    icon: 'truck-fast',
    color: '#2E7D32',
    bgColor: '#2E7D3220',
    progressStep: 4,
  },
  at_job: {
    label: 'AT JOB',
    icon: 'map-marker-check',
    color: '#64B5F6',
    bgColor: '#64B5F620',
    progressStep: 5,
  },
  pouring: {
    label: 'POURING',
    icon: 'water',
    color: '#1565C0',
    bgColor: '#1565C020',
    progressStep: 6,
  },
  washing: {
    label: 'WASHING',
    icon: 'water-pump',
    color: '#C62828',
    bgColor: '#C6282820',
    progressStep: 7,
  },
  to_plant: {
    label: 'TO PLANT',
    icon: 'truck-delivery',
    color: '#EC407A',
    bgColor: '#EC407A20',
    progressStep: 8,
  },
  at_plant: {
    label: 'AT PLANT',
    icon: 'factory',
    color: '#EC407A',
    bgColor: '#EC407A20',
    progressStep: 9,
  },
  cancelled: {
    label: 'CANCELLED',
    icon: 'close-circle',
    color: '#EF4444',
    bgColor: '#EF444420',
    progressStep: -1,
  },
};

// Timeline steps matching API status flow
const TIMELINE_STEPS = [
  { key: 'ticketed', label: 'Ticketed', icon: 'ticket-outline' },
  { key: 'loading', label: 'Loading', icon: 'truck-loading' },
  { key: 'loaded', label: 'Loaded', icon: 'truck-check' },
  { key: 'to_job', label: 'To Job', icon: 'truck-fast' },
  { key: 'at_job', label: 'At Job', icon: 'map-marker-check' },
  { key: 'pouring', label: 'Pouring', icon: 'water' },
  { key: 'washing', label: 'Washing', icon: 'water-pump' },
  { key: 'to_plant', label: 'To Plant', icon: 'truck-delivery' },
  { key: 'at_plant', label: 'At Plant', icon: 'factory' },
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

// Detail Row Component
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
      <Text style={[styles.detailLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
};

// Vertical Timeline Component
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
  currentStatus: ApiTicketStatus;
  isDark: boolean;
}

const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ timestamps, currentStatus, isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  const completedColor = isDark ? colors.primary.light : colors.primary.main;
  const activeColor = isDark ? colors.secondary.light : colors.secondary.main;
  const completedTextColor = isDark ? colors.common.white : colors.grey[80];
  const pendingTextColor = isDark ? colors.grey[40] : colors.grey[50];
  const timeTextColor = isDark ? colors.grey[40] : colors.grey[60];

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

  const statusOrder = TIMELINE_STEPS.map(s => s.key);
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <View style={styles.verticalTimeline}>
      {TIMELINE_STEPS.map((step, index) => {
        const stepTime = getTimeForStep(step.key);
        const isCompleted = stepTime !== null;
        const isActive = step.key === currentStatus;
        const stepColor = isCompleted ? completedColor : themeColors.border;

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
  const labelColor = isDark ? colors.common.white : colors.grey[60];

  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        {
          backgroundColor: themeColors.card,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.grey[10],
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={ms(20)} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export const TicketDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TicketDetailRouteProp>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themeColors = isDark ? colors.dark : colors.light;
  const { alertState, showWarning, hideAlert } = useAlert();

  // Bottom sheet state for directions menu
  const [showDirectionsMenu, setShowDirectionsMenu] = useState(false);

  const { orderCode, orderDate, ticketCode, status: passedStatus, statusDisplay: passedStatusDisplay } = route.params;

  // Fetch ticket details from API
  const {
    ticket,
    ticketCode: apiTicketCode,
    orderCode: apiOrderCode,
    customerName,
    deliveryAddress,
    plantName,
    plantAddress,
    runningQty,
    orderedQty,
    driverName,
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
    timestamps,
    products,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useTicketDetails({
    order_code: orderCode,
    order_date: orderDate,
    ticket_code: ticketCode,
  });

  const statusConfigMap = isDark ? STATUS_CONFIG_DARK : STATUS_CONFIG_LIGHT;
  // Use API status as primary, fall back to passed status from TicketScreen
  const currentStatus = statusCode || passedStatus || 'pending';
  const currentStatusDisplayText = statusDisplay || passedStatusDisplay;
  const statusInfo = statusConfigMap[currentStatus] || statusConfigMap.pending;
  // Get header badge colors that are visible on green gradient
  const headerBadgeColors = getHeaderBadgeColors(currentStatus, isDark);

  const percentage = useMemo(() => {
    if (!orderedQty || orderedQty === 0) return 0;
    return Math.min((runningQty / orderedQty) * 100, 100);
  }, [runningQty, orderedQty]);

  const headerGradient = isDark ? HEADER_GRADIENT_DARK : HEADER_GRADIENT_LIGHT;
  const accentColor = isDark ? colors.primary.light : colors.primary.main;

  // Product info from API
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
    if (truckLatitude && truckLongitude) {
      navigation.navigate('MapTracking', {
        latitude: truckLatitude,
        longitude: truckLongitude,
        truckCode: truckCode || undefined,
        ticketCode: apiTicketCode || undefined,
        driverName: driverName || undefined,
        destination: deliveryAddress || undefined,
        orderCode: apiOrderCode || undefined,
        customerName: customerName || undefined,
        // Plant location
        plantLatitude: plantLocationLatitude || undefined,
        plantLongitude: plantLocationLongitude || undefined,
        plantName: plantName || undefined,
        // Job location (order_location)
        jobLatitude: orderLocationLatitude || undefined,
        jobLongitude: orderLocationLongitude || undefined,
      });
    } else {
      showWarning(
        'Location Unavailable',
        'Truck location coordinates are not available at the moment. The truck may not have GPS data or the location service is temporarily unavailable. Please try again later.'
      );
    }
  }, [truckLatitude, truckLongitude, truckCode, apiTicketCode, driverName, deliveryAddress, apiOrderCode, customerName, plantLocationLatitude, plantLocationLongitude, plantName, orderLocationLatitude, orderLocationLongitude, navigation, showWarning]);

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

  const closeDirectionsMenu = useCallback(() => {
    setShowDirectionsMenu(false);
  }, []);

  const handleOpenInAppMap = useCallback(() => {
    closeDirectionsMenu();
    setTimeout(() => {
      navigation.navigate('MapTracking', {
        latitude: truckLatitude || undefined,
        longitude: truckLongitude || undefined,
        truckCode: truckCode || undefined,
        ticketCode: apiTicketCode || undefined,
        driverName: driverName || undefined,
        destination: deliveryAddress || undefined,
        orderCode: apiOrderCode || undefined,
        customerName: customerName || undefined,
        // Plant location
        plantLatitude: plantLocationLatitude || undefined,
        plantLongitude: plantLocationLongitude || undefined,
        plantName: plantName || undefined,
        // Job location (order_location)
        jobLatitude: orderLocationLatitude || undefined,
        jobLongitude: orderLocationLongitude || undefined,
      });
    }, 300);
  }, [closeDirectionsMenu, navigation, truckLatitude, truckLongitude, truckCode, apiTicketCode, driverName, deliveryAddress, apiOrderCode, customerName, plantLocationLatitude, plantLocationLongitude, plantName, orderLocationLatitude, orderLocationLongitude]);

  const handleOpenInGoogleMaps = useCallback(() => {
    closeDirectionsMenu();
    if (truckLatitude && truckLongitude) {
      // If job location is available, show directions from truck to job site
      // Otherwise, just show truck location as a marker
      const hasJobLocation = orderLocationLatitude && orderLocationLongitude;

      let url: string | undefined;
      let webFallbackUrl: string;

      if (hasJobLocation) {
        // Directions mode: from truck to job site
        url = Platform.select({
          ios: `comgooglemaps://?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&directionsmode=driving`,
          android: `google.navigation:q=${orderLocationLatitude},${orderLocationLongitude}&mode=d`,
        });
        webFallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=${truckLatitude},${truckLongitude}&destination=${orderLocationLatitude},${orderLocationLongitude}&travelmode=driving`;
      } else {
        // No job location - just show truck marker
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
          // Fallback to web Google Maps
          Linking.openURL(webFallbackUrl);
        }
      });
    }
  }, [closeDirectionsMenu, truckLatitude, truckLongitude, orderLocationLatitude, orderLocationLongitude]);

  const handleOpenInAppleMaps = useCallback(() => {
    closeDirectionsMenu();
    if (truckLatitude && truckLongitude) {
      // If job location is available, show directions from truck to job site
      // Otherwise, just show truck location as a marker
      const hasJobLocation = orderLocationLatitude && orderLocationLongitude;

      let url: string;
      let webFallbackUrl: string;

      if (hasJobLocation) {
        // Directions mode: from truck to job site (dirflg=d for driving)
        url = `maps://maps.apple.com/?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&dirflg=d`;
        webFallbackUrl = `https://maps.apple.com/?saddr=${truckLatitude},${truckLongitude}&daddr=${orderLocationLatitude},${orderLocationLongitude}&dirflg=d`;
      } else {
        // No job location - just show truck marker
        url = `maps://maps.apple.com/?ll=${truckLatitude},${truckLongitude}&q=Truck%20Location`;
        webFallbackUrl = `https://maps.apple.com/?ll=${truckLatitude},${truckLongitude}`;
      }

      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to web
          Linking.openURL(webFallbackUrl);
        }
      });
    }
  }, [closeDirectionsMenu, truckLatitude, truckLongitude, orderLocationLatitude, orderLocationLongitude]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={headerGradient[0]} />
        <LinearGradient colors={headerGradient} style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleSection}>
              <Text style={styles.headerTitle}>Ticket Details</Text>
            </View>
            <View style={styles.headerBtn} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer} pointerEvents="box-none">
          <TruckLoader size={120} message="Loading ticket details..." color={isDark ? 'light' : 'dark'} />
        </View>
      </View>
    );
  }

  // Error state or No Data state
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
        <StatusBar barStyle="light-content" backgroundColor={headerGradient[0]} />
        <LinearGradient colors={headerGradient} style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleBack} activeOpacity={0.7}>
              <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleSection}>
              <Text style={styles.headerTitle}>Ticket Details</Text>
            </View>
            <View style={styles.headerBtn} />
          </View>
        </LinearGradient>
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
      <StatusBar barStyle="light-content" backgroundColor={headerGradient[0]} />

      <LinearGradient
        colors={headerGradient}
        style={[styles.header, { paddingTop: insets.top }]}>

        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleSection}>
            <Text style={styles.headerTitle}>Ticket Details</Text>
            {apiOrderCode && (
              <Text style={styles.headerSubtitle}>Order #{apiOrderCode}</Text>
            )}
          </View>
          <View style={{ width: ms(40) }} />
        </View>

        <View style={styles.heroSection}>
          <View style={styles.heroLeft}>
            <View style={styles.ticketNumberRow}>
              <Icon name="ticket-confirmation" size={ms(16)} color={colors.headerOverlay.textBright} />
              <Text style={styles.ticketLabel}>TICKET</Text>
            </View>
            <Text style={styles.ticketNumber}>{apiTicketCode}</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor: headerBadgeColors.bgColor,
                paddingVertical: ms(5),
                paddingHorizontal: ms(12),
                borderRadius: ms(16),
              }}>
              <Icon name={statusInfo.icon} size={ms(14)} color={headerBadgeColors.iconColor} />
              <AppText
                style={{
                  fontFamily: fontFamily.semiBold,
                  fontSize: ms(12),
                  color: headerBadgeColors.textColor,
                  marginLeft: ms(6),
                }}>
                {statusInfo.label}
              </AppText>
            </View>
          </View>
          <View style={styles.heroRight}>

            {etaAtJob && currentStatus !== 'at_plant' && (
              <View style={styles.etaBadge}>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{etaAtJob}</Text>
              </View>
            )}
            <View style={styles.truckIconContainer}>
              <Icon name="truck-delivery" size={ms(44)} color={colors.headerOverlay.textBrightest} />
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary.main}
            colors={[colors.primary.main, colors.secondary.main]}
            progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
          />
        }>

        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="map-marker-radius"
            label="Track"
            color={accentColor}
            onPress={handleTrackTruck}
            isDark={isDark}
          />
          <QuickAction
            icon="directions"
            label="Directions"
            color={isDark ? colors.success.light : colors.success.main}
            onPress={handleGetDirections}
            isDark={isDark}
          />
          <QuickAction
            icon="phone"
            label="Call Driver"
            color={isDark ? colors.warning.light : colors.warning.main}
            onPress={handleCallDriver}
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
            <View style={[styles.progressBadge, { backgroundColor: isDark ? accentColor + '25' : colors.primary.main + '18' }]}>
              <Text style={[styles.progressBadgeText, { color: isDark ? accentColor : colors.primary.dark }]}>{percentage.toFixed(1)}%</Text>
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
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? themeColors.surface : colors.grey[10] }]}>
              <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: accentColor }]} />
            </View>
          </View>
        </View>

        {/* Product/Mix Information */}
        {productInfo && (
          <SectionCard
            title="Product Information"
            icon="beaker-outline"
            iconColor={isDark ? colors.infoIcons.cyan.dark : colors.infoIcons.cyan.light}
            isDark={isDark}>
            <DetailRow label="Item Code" value={productInfo.code} isDark={isDark} />
            <DetailRow label="Description" value={productInfo.name} isDark={isDark} />
            <DetailRow label="Type" value={productInfo.isMix ? 'Mix Design' : 'Product'} isDark={isDark} isLast />
          </SectionCard>
        )}

        {/* Delivery Location */}
        <SectionCard
          title="Delivery Location"
          icon="map-marker"
          iconColor={isDark ? colors.error.light : colors.error.main}
          isDark={isDark}>
          <DetailRow label="Address" value={deliveryAddress} isDark={isDark} />
          <DetailRow label="Customer" value={customerName} isDark={isDark} isLast />

          {/* Map Preview Placeholder */}
          <TouchableOpacity
            style={[
              styles.mapPreview,
              {
                backgroundColor: isDark ? themeColors.surface : colors.grey[5],
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : colors.grey[10],
              },
            ]}
            onPress={handleGetDirections}
            activeOpacity={0.8}>
            <Icon name="map" size={ms(32)} color={isDark ? colors.grey[40] : colors.grey[50]} />
            <Text style={[styles.mapPreviewText, { color: isDark ? colors.grey[40] : colors.grey[50] }]}>
              Tap to open in Maps
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Truck & Driver Information */}
        <SectionCard
          title="Truck & Driver"
          icon="truck"
          iconColor={isDark ? colors.infoIcons.orange.dark : colors.infoIcons.orange.light}
          isDark={isDark}>
          <DetailRow label="Truck Code" value={truckCode} isDark={isDark} />
          <DetailRow label="Description" value={truckDescription} isDark={isDark} />
          <DetailRow label="Driver" value={driverName} isDark={isDark} />
          <DetailRow label="Driver Phone" value={driverPhone} isDark={isDark} isLast />

          {driverPhone && (
            <TouchableOpacity
              style={[
                styles.callCustomerBtn,
                {
                  backgroundColor: isDark ? colors.action.call.bgDark : colors.action.call.bgLight,
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? colors.common.transparent : colors.action.call.borderLight,
                },
              ]}
              onPress={handleCallDriver}
              activeOpacity={0.8}>
              <Icon name="phone" size={ms(18)} color={isDark ? colors.action.call.light : colors.action.call.dark} />
              <Text style={[styles.callCustomerText, { color: isDark ? colors.action.call.light : colors.action.call.dark }]}>
                Call Driver
              </Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Plant Information */}
        <SectionCard
          title="Plant Information"
          icon="factory"
          iconColor={isDark ? colors.infoIcons.purple.dark : colors.infoIcons.purple.light}
          isDark={isDark}>
          <DetailRow label="Plant" value={plantName} isDark={isDark} />
          <DetailRow label="Address" value={plantAddress} isDark={isDark} isLast />
        </SectionCard>

        {/* Delivery Timeline */}
        <SectionCard
          title="Delivery Timeline"
          icon="timeline-clock"
          iconColor={isDark ? colors.infoIcons.blue.dark : colors.infoIcons.blue.light}
          isDark={isDark}>
          <VerticalTimeline
            timestamps={timestamps}
            currentStatus={currentStatus}
            isDark={isDark}
          />
        </SectionCard>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleTrackTruck}
            activeOpacity={0.8}>
            <LinearGradient
              colors={headerGradient}
              style={styles.primaryBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Icon name="map-marker-radius" size={ms(20)} color={colors.common.white} />
              <Text style={styles.primaryBtnText}>Track Truck on Map</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />

      {/* Directions Bottom Sheet Menu */}
      <Modal
        visible={showDirectionsMenu}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeDirectionsMenu}
      >
        <View style={styles.directionsModalContainer}>
          {/* Backdrop - tap to close */}
          <TouchableOpacity
            style={styles.directionsModalBackdrop}
            activeOpacity={1}
            onPress={closeDirectionsMenu}
          />

          {/* Modal Content */}
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

            {/* Safe Area Spacer */}
            <View style={{ height: insets.bottom }} />
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
  // Empty State / No Data UI
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
    gap: GRID.md,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    backgroundColor: colors.primary.main,
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
  goBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GRID.sm,
    paddingHorizontal: GRID.lg,
    paddingVertical: GRID.md,
    borderRadius: RADIUS.md,
  },
  goBackBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(14),
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
    backgroundColor: colors.headerOverlay.bg,
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
    color: colors.headerOverlay.text,
    marginTop: ms(2),
  },
  // Hero Section
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID.lg,
  },
  heroLeft: {
    flex: 1,
    marginRight: GRID.sm,
    minWidth: 0,
  },
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
    color: colors.headerOverlay.text,
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
    borderRadius: RADIUS.md,
  },
  callCustomerText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(13),
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
    marginRight: GRID.xs,
  },
  activeText: {
    fontFamily: fontFamily.medium,
    fontSize: ms(9),
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
  // Directions Menu Styles
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
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
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
    gap: GRID.sm,
  },
  directionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: GRID.md,
    borderRadius: RADIUS.md,
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
});

export default TicketDetailScreen;
