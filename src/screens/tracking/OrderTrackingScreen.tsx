
import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  RefreshControl,
  Platform,
  Linking,
  Animated,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader } from '../../components/common';
import { CementMixerPin } from '../../components/map/CementMixerPin';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { useOrderTracking, useDirections } from '../../hooks';
import { TrackingTicket } from '../../types/orderTracking';
import { MAPBOX_ACCESS_TOKEN } from '@env';

interface TruckMarkerProps {
  ticket: TrackingTicket;
  isSelected: boolean;
  onPress: () => void;
  statusColor?: string;
}

const TruckMarkerContent: React.FC<TruckMarkerProps> = React.memo(({ ticket, isSelected, onPress, statusColor }) => {
  const markerColor = statusColor || FALLBACK_STATUS_COLOR;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSelected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSelected, pulseAnim]);

  return (
    <TouchableOpacity
      style={truckMarkerStyles.wrap}
      onPress={onPress}
      activeOpacity={0.8}>

      {isSelected && (
        <Animated.View
          style={[
            truckMarkerStyles.outerGlow,
            { transform: [{ scale: pulseAnim }] }
          ]}
        />
      )}

      {isSelected && <View style={truckMarkerStyles.selectedRing} />}

      {isSelected && <View style={truckMarkerStyles.pointerArrow} />}

      <CementMixerPin
        color={markerColor}
        size={isSelected ? ms(48) : ms(42)}
      />
      <View style={[
        truckMarkerStyles.loadBadge,
        { backgroundColor: markerColor },
        isSelected && truckMarkerStyles.loadBadgeSelected
      ]}>
        <Text style={[
          truckMarkerStyles.loadText,
          isSelected && truckMarkerStyles.loadTextSelected
        ]}>
          {ticket.load}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.ticket.ticket_id === nextProps.ticket.ticket_id &&
    prevProps.ticket.status === nextProps.ticket.status &&
    prevProps.statusColor === nextProps.statusColor;
});

const truckMarkerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
    backgroundColor: `${colors.primary.main}15`,
    borderWidth: 1,
    borderColor: `${colors.primary.main}30`,
  },
  selectedRing: {
    position: 'absolute',
    width: ms(58),
    height: ms(58),
    borderRadius: ms(29),
    backgroundColor: `${colors.primary.main}25`,
    borderWidth: 3,
    borderColor: colors.primary.main,

    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  pointerArrow: {
    position: 'absolute',
    top: ms(-12),
    width: 0,
    height: 0,
    borderLeftWidth: ms(8),
    borderRightWidth: ms(8),
    borderBottomWidth: ms(10),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary.main,
  },
  loadBadge: {
    marginTop: ms(4),
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(10),
    minWidth: ms(22),
    alignItems: 'center',
  },
  loadBadgeSelected: {
    marginTop: ms(6),
    paddingHorizontal: ms(12),
    paddingVertical: ms(4),
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: colors.common.white,

    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loadText: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
  },
  loadTextSelected: {
    fontSize: ms(13),
    fontFamily: fontFamily.bold,
  },
});

if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
} else {
  console.error('[Mapbox] Access token is missing! Map tiles will not load.');
}

const MAP_STYLES = {
  light: Mapbox.StyleURL.Street,
  dark: Mapbox.StyleURL.Dark,
  satellite: Mapbox.StyleURL.SatelliteStreet,
};

const STATUS_ICONS: Record<string, { icon: string; label: string }> = {
  pending: { icon: 'clock-outline', label: 'Pending' },
  ticketed: { icon: 'ticket-outline', label: 'Ticketed' },
  loading: { icon: 'package-variant', label: 'Loading' },
  loaded: { icon: 'package-variant-closed', label: 'Loaded' },
  to_job: { icon: 'truck-fast', label: 'To Job' },
  at_job: { icon: 'map-marker-check', label: 'At Job' },
  pouring: { icon: 'water', label: 'Pouring' },
  begin_pour: { icon: 'water', label: 'Begin Pour' },
  begin_pouring: { icon: 'water', label: 'Begin Pour' },
  poured: { icon: 'water-check', label: 'Poured' },
  washing: { icon: 'water-pump', label: 'Washing' },
  to_plant: { icon: 'arrow-u-left-top', label: 'To Plant' },
  at_plant: { icon: 'home-circle', label: 'At Plant' },
  cancelled: { icon: 'close-circle', label: 'Cancelled' },
  voided: { icon: 'close-circle', label: 'Voided' },
};

// Fallback color when API doesn't provide a color for a status
const FALLBACK_STATUS_COLOR = '#6b7280';
const CANCELLED_COLOR = '#ef4444';

/** Build status config using only dynamic API colors from database */
function buildStatusConfig(
  apiColors?: Record<string, string | undefined> | null
): Record<string, { color: string; icon: string; label: string }> {
  const config: Record<string, { color: string; icon: string; label: string }> = {};
  for (const [key, meta] of Object.entries(STATUS_ICONS)) {
    const isCancelled = key === 'cancelled' || key === 'voided';
    config[key] = {
      color: isCancelled ? CANCELLED_COLOR : (apiColors?.[key] || FALLBACK_STATUS_COLOR),
      icon: meta.icon,
      label: meta.label,
    };
  }
  return config;
}

type OrderTrackingRouteProp = RouteProp<RootStackParamList, 'Tracking'>;

export const OrderTrackingScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<OrderTrackingRouteProp>();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const themeColors = isDark ? colors.dark : colors.light;
  const cameraRef = useRef<Mapbox.Camera>(null);
  const flatListRef = useRef<FlatList<TrackingTicket>>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const { orderId, ticketCode } = route.params;
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  const [isSatelliteView, setIsSatelliteView] = useState(false);

  // Reset map ready state when style changes to ensure markers re-render
  useEffect(() => {
    setIsMapReady(false);
  }, [isSatelliteView, isDark]);

  const SHEET_MIN_HEIGHT = useMemo(() => screenHeight * 0.38 + insets.bottom, [screenHeight, insets.bottom]);
  const SHEET_MAX_HEIGHT = useMemo(() => screenHeight * 0.78 + insets.bottom, [screenHeight, insets.bottom]);

  const sheetHeight = useRef(new Animated.Value(screenHeight * 0.38)).current;
  const lastGestureY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {

        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {

        sheetHeight.stopAnimation((value) => {
          lastGestureY.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {

        const newHeight = lastGestureY.current - gestureState.dy;

        const clampedHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, newHeight));
        sheetHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = lastGestureY.current - gestureState.dy;
        const velocity = gestureState.vy;

        let snapTo: number;
        if (velocity < -0.5) {

          snapTo = SHEET_MAX_HEIGHT;
        } else if (velocity > 0.5) {

          snapTo = SHEET_MIN_HEIGHT;
        } else {

          const midPoint = (SHEET_MIN_HEIGHT + SHEET_MAX_HEIGHT) / 2;
          snapTo = currentHeight > midPoint ? SHEET_MAX_HEIGHT : SHEET_MIN_HEIGHT;
        }

        setIsSheetExpanded(snapTo === SHEET_MAX_HEIGHT);
        if (snapTo === SHEET_MAX_HEIGHT) setIsLegendExpanded(false);

        Animated.spring(sheetHeight, {
          toValue: snapTo,
          useNativeDriver: false,
          tension: 100,
          friction: 12,
        }).start();
      },
    })
  ).current;

  const toggleSheet = useCallback(() => {
    const toValue = isSheetExpanded ? SHEET_MIN_HEIGHT : SHEET_MAX_HEIGHT;
    setIsSheetExpanded(!isSheetExpanded);
    if (!isSheetExpanded) setIsLegendExpanded(false);

    Animated.spring(sheetHeight, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 12,
    }).start();
  }, [isSheetExpanded, sheetHeight, SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT]);

  useEffect(() => {
    const newValue = isSheetExpanded ? SHEET_MAX_HEIGHT : SHEET_MIN_HEIGHT;
    sheetHeight.setValue(newValue);
  }, [screenHeight, SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT]);

  const mapHeight = sheetHeight.interpolate({
    inputRange: [SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT],
    outputRange: [screenHeight - SHEET_MIN_HEIGHT, screenHeight - SHEET_MAX_HEIGHT],
    extrapolate: 'clamp',
  });

  const {
    trackingData,
    tickets,
    pagination,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrderTracking(orderId, {
    limit: 10,
    refetchInterval: 30000,
  });

  // Build dynamic status config from API colors (same source as web frontend)
  const statusConfig = useMemo(
    () => buildStatusConfig(trackingData?.status_colors as Record<string, string | undefined> ?? null),
    [trackingData?.status_colors]
  );

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find(t => t.ticket_id === selectedTicketId) || null;
  }, [selectedTicketId, tickets]);



  useEffect(() => {
    if (ticketCode && tickets.length > 0 && !hasAutoSelected && isMapReady) {
      const ticketIndex = tickets.findIndex(t => t.ticket_code === ticketCode);
      if (ticketIndex !== -1) {
        const matchingTicket = tickets[ticketIndex];
        setSelectedTicketId(matchingTicket.ticket_id);
        setHasAutoSelected(true);


        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: ticketIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }, 300);


        if (cameraRef.current && matchingTicket.truck?.latitude && matchingTicket.truck?.longitude) {
          setTimeout(() => {
            cameraRef.current?.setCamera({
              centerCoordinate: [matchingTicket.truck!.longitude, matchingTicket.truck!.latitude],
              zoomLevel: 14,
              animationDuration: 1000,
            });
          }, 500);
        }
      }
    }
  }, [ticketCode, tickets, hasAutoSelected, isMapReady]);

  const plantLocation = useMemo(() => {
    if (!trackingData?.plant?.latitude || !trackingData?.plant?.longitude) return null;
    return {
      latitude: trackingData.plant.latitude,
      longitude: trackingData.plant.longitude,
      name: trackingData.plant.description,
    };
  }, [trackingData]);

  const jobLocation = useMemo(() => {
    if (!trackingData?.order_location?.latitude || !trackingData?.order_location?.longitude) return null;
    return {
      latitude: trackingData.order_location.latitude,
      longitude: trackingData.order_location.longitude,
      name: trackingData.customer_name,
    };
  }, [trackingData]);

  const selectedTruckLocation = useMemo(() => {
    if (!selectedTicket?.truck?.latitude || !selectedTicket?.truck?.longitude) return null;
    return {
      latitude: selectedTicket.truck.latitude,
      longitude: selectedTicket.truck.longitude,
    };
  }, [selectedTicket]);

  const { distanceFormatted, durationFormatted } = useDirections({
    origin: selectedTruckLocation,
    destination: jobLocation,
    options: { profile: 'driving-traffic', overview: 'full' },
    enabled: false,
  });

  const mapBounds = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];
    if (plantLocation) points.push({ lat: plantLocation.latitude, lng: plantLocation.longitude });
    if (jobLocation) points.push({ lat: jobLocation.latitude, lng: jobLocation.longitude });

    tickets.forEach(ticket => {
      if (ticket.truck?.latitude && ticket.truck?.longitude) {
        points.push({ lat: ticket.truck.latitude, lng: ticket.truck.longitude });
      }
    });
    if (points.length === 0) return null;
    const padding = 0.02;
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    return {
      ne: [Math.max(...lngs) + padding, Math.max(...lats) + padding] as [number, number],
      sw: [Math.min(...lngs) - padding, Math.min(...lats) - padding] as [number, number],
    };
  }, [plantLocation, jobLocation, tickets]);

  useEffect(() => {
    if (mapBounds && cameraRef.current && isMapReady) {
      const timer = setTimeout(() => {
        cameraRef.current?.fitBounds(mapBounds.ne, mapBounds.sw, [50, 50, 80, 50], 1000);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mapBounds, isMapReady]);

  const handleTicketPress = useCallback((ticket: TrackingTicket) => {
    setSelectedTicketId(ticket.ticket_id);

    if (cameraRef.current) {
      const points: Array<{ lat: number; lng: number }> = [];

      if (trackingData?.plant?.latitude && trackingData?.plant?.longitude) {
        points.push({ lat: trackingData.plant.latitude, lng: trackingData.plant.longitude });
      }

      if (trackingData?.order_location?.latitude && trackingData?.order_location?.longitude) {
        points.push({ lat: trackingData.order_location.latitude, lng: trackingData.order_location.longitude });
      }

      if (ticket.truck?.latitude && ticket.truck?.longitude) {
        points.push({ lat: ticket.truck.latitude, lng: ticket.truck.longitude });
      }

      if (points.length > 1) {

        const padding = 0.02;
        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);
        const ne: [number, number] = [Math.max(...lngs) + padding, Math.max(...lats) + padding];
        const sw: [number, number] = [Math.min(...lngs) - padding, Math.min(...lats) - padding];

        cameraRef.current.fitBounds(ne, sw, [120, 50, 100, 50], 800);
      } else if (ticket.truck?.latitude && ticket.truck?.longitude) {

        cameraRef.current.setCamera({
          centerCoordinate: [ticket.truck.longitude, ticket.truck.latitude],
          zoomLevel: 13,
          animationDuration: 800,
        });
      }
    }
  }, [trackingData]);

  const handleFitAll = useCallback(() => {
    if (mapBounds && cameraRef.current) {
      cameraRef.current.fitBounds(mapBounds.ne, mapBounds.sw, [50, 50, 80, 50], 800);
    }
  }, [mapBounds]);

  const handleOpenMaps = useCallback(() => {
    if (!jobLocation) return;
    const url = Platform.select({
      ios: `maps:?daddr=${jobLocation.latitude},${jobLocation.longitude}`,
      android: `google.navigation:q=${jobLocation.latitude},${jobLocation.longitude}`,
    });
    if (url) Linking.openURL(url);
  }, [jobLocation]);

  const fmtQty = (qty: number) => (qty % 1 === 0 ? qty.toString() : qty.toFixed(1));


  const firstTicketStatusColor = useMemo(() => {
    if (tickets.length === 0) return colors.primary.main;
    const firstTicket = tickets[0];
    const config = statusConfig[firstTicket.status] || statusConfig.ticketed;
    return config.color;
  }, [tickets, statusConfig]);

  const renderTicketCard = useCallback((ticket: TrackingTicket) => {
    const isSelected = selectedTicketId === ticket.ticket_id;
    const config = statusConfig[ticket.status] || statusConfig.ticketed;

    return (
      <TouchableOpacity
        key={ticket.ticket_id}
        style={[
          styles.ticketCard,
          { backgroundColor: themeColors.card },
          isSelected && styles.ticketCardSelected,
        ]}
        activeOpacity={0.8}
        onPress={() => handleTicketPress(ticket)}
      >

        <View style={styles.ticketLeft}>
          <View style={[styles.loadIndicator, { backgroundColor: config.color }]}>
            <Text style={styles.loadNum}>{ticket.load}</Text>
          </View>
        </View>

        <View style={styles.ticketCenter}>

          <View style={styles.ticketRow1}>
            <Text style={[styles.ticketCode, { color: themeColors.text.primary }]} numberOfLines={1}>
              #{ticket.ticket_code}
            </Text>
            <View style={styles.statusTimeContainer}>
              {ticket.timestamps?.[ticket.status as keyof typeof ticket.timestamps] && (
                <>
                  <Icon name="clock-outline" size={ms(9)} color={themeColors.text.hint} />
                  <Text style={[styles.statusTime, { color: themeColors.text.hint }]}>
                    {ticket.timestamps[ticket.status as keyof typeof ticket.timestamps]}
                  </Text>
                </>
              )}
              <View style={[styles.statusChip, { backgroundColor: `${config.color}15` }]}>
                <Icon name={config.icon} size={ms(9)} color={config.color} />
                <Text style={[styles.statusChipText, { color: config.color }]} numberOfLines={1}>
                  {ticket.status?.toLowerCase().includes('cancel') || ticket.status_display?.toLowerCase().includes('cancel') ? 'Voided' : (ticket.status_display || config.label)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.ticketRow2}>
            <View style={styles.infoChip}>
              <Icon name="account-circle" size={ms(10)} color={themeColors.text.hint} />
              <Text style={[styles.infoText, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {ticket.driver?.code || 'N/A'}
              </Text>
            </View>
            <View style={[styles.infoDot, { backgroundColor: themeColors.text.hint }]} />
            <View style={styles.infoChip}>
              <Icon name="truck" size={ms(10)} color={themeColors.text.hint} />
              <Text style={[styles.infoText, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {ticket.truck?.code || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.ticketRow3}>
            {ticket.product?.item_code && (
              <View style={[styles.productChip, { backgroundColor: isDark ? `${colors.common.white}15` : `${colors.common.black}10` }]}>
                <Icon name="cube-outline" size={ms(10)} color={isDark ? colors.common.white : colors.common.black} />
                <Text style={[styles.productText, { color: isDark ? colors.common.white : colors.common.black }]} numberOfLines={1}>
                  {ticket.product.item_code}
                </Text>
              </View>
            )}
            <View style={[styles.qtyChip, { backgroundColor: isDark ? `${colors.common.white}15` : `${colors.common.black}10` }]}>
              <Icon name="package-variant-closed" size={ms(11)} color={isDark ? colors.common.white : colors.common.black} />
              <Text style={[styles.qtyText, { color: isDark ? colors.common.white : colors.common.black }]} numberOfLines={1}>
                {fmtQty(ticket.load_qty)}
              </Text>
              <Text style={[styles.qtyUnit, { color: isDark ? colors.common.white : colors.common.black }]}>CY</Text>
            </View>
            {ticket.timestamps?.eta_at_job && ['loading', 'loaded', 'to_job'].includes(ticket.status) && (
              <View style={[styles.etaChip, { backgroundColor: isDark ? `${colors.common.white}15` : `${colors.common.black}10` }]}>
                <Icon name="clock-fast" size={ms(9)} color={isDark ? colors.common.white : colors.common.black} />
                <Text style={[styles.etaText, { color: isDark ? colors.common.white : colors.common.black }]} numberOfLines={1}>
                  ETA {ticket.timestamps.eta_at_job}
                </Text>
              </View>
            )}
            {ticket.timestamps?.pouring && (
              <View style={[styles.timeChip, { backgroundColor: isDark ? `${colors.common.white}15` : `${colors.common.black}10` }]}>
                <Icon name="water" size={ms(9)} color={isDark ? colors.common.white : colors.common.black} />
                <Text style={[styles.timeText, { color: isDark ? colors.common.white : colors.common.black }]} numberOfLines={1}>
                  {ticket.timestamps.pouring}
                </Text>
              </View>
            )}
          </View>
        </View>

      </TouchableOpacity>
    );
  }, [themeColors, isDark, selectedTicketId, handleTicketPress, statusConfig]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
        <View style={styles.loadingWrap}>
          <TruckLoader size={80} message="Loading tracking..." color={isDark ? 'light' : 'dark'} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
        <View style={styles.errorWrap}>
          <View style={[styles.errorIcon, { backgroundColor: `${colors.error.main}15` }]}>
            <Icon name="alert-circle-outline" size={ms(40)} color={colors.error.main} />
          </View>
          <Text style={[styles.errorTitle, { color: themeColors.text.primary }]}>
            Unable to Load Tracking
          </Text>
          <Text style={[styles.errorMsg, { color: themeColors.text.secondary }]}>
            {error || 'Please check your connection and try again'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Icon name="refresh" size={ms(16)} color={colors.common.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = trackingData?.progress_percent || 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />

      <Animated.View style={[styles.mapWrap, { height: mapHeight }]}>
        <Mapbox.MapView
          key={`map-${isSatelliteView ? 'satellite' : 'normal'}-${isDark ? 'dark' : 'light'}`}
          style={styles.map}
          styleURL={isSatelliteView ? MAP_STYLES.satellite : (isDark ? MAP_STYLES.dark : MAP_STYLES.light)}
          logoEnabled={false}
          attributionEnabled={false}
          onDidFinishLoadingMap={() => {
            setIsMapReady(true);

            if (cameraRef.current && mapBounds) {
              setTimeout(() => {
                cameraRef.current?.fitBounds(mapBounds.ne, mapBounds.sw, [50, 50, 80, 50], 500);
              }, 100);
            }
          }}
          onMapIdle={() => {
            console.log('[Mapbox] Map idle - tiles loaded');
          }}>
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: jobLocation ? [jobLocation.longitude, jobLocation.latitude] : [-96.9, 35.4],
              zoomLevel: 11,
            }}
          />


          {isMapReady && plantLocation && (
            <Mapbox.MarkerView coordinate={[plantLocation.longitude, plantLocation.latitude]} anchor={{ x: 0.5, y: 1 }} allowOverlap={true}>
              <View style={styles.markerWrap}>
                <View style={styles.markerLabelContainer}>
                  <View style={[styles.markerLabel, { backgroundColor: colors.warning.main }]}>
                    <Icon name="factory" size={ms(12)} color={colors.common.white} style={{ marginRight: ms(4) }} />
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      {trackingData?.plant?.description || 'Plant'}
                    </Text>
                  </View>
                </View>
                <View style={styles.plantMarker}>
                  <Icon name="factory" size={ms(33)} color={colors.common.white} />
                </View>
                <View style={styles.plantArrow} />
              </View>
            </Mapbox.MarkerView>
          )}


          {isMapReady && tickets.map(ticket => {

            if (!ticket.truck?.latitude || !ticket.truck?.longitude || ticket.status === 'at_plant') return null;
            const isSelected = selectedTicketId === ticket.ticket_id;
            return (
              <Mapbox.MarkerView
                key={`truck-${ticket.ticket_id}`}
                coordinate={[ticket.truck.longitude, ticket.truck.latitude]}
                anchor={{ x: 0.5, y: 1 }}
                allowOverlap={true}
              >
                <TruckMarkerContent
                  ticket={ticket}
                  isSelected={isSelected}
                  onPress={() => handleTicketPress(ticket)}
                  statusColor={statusConfig[ticket.status]?.color}
                />
              </Mapbox.MarkerView>
            );
          })}

          {isMapReady && jobLocation && (
            <Mapbox.MarkerView coordinate={[jobLocation.longitude, jobLocation.latitude]} anchor={{ x: 0.5, y: 1 }} allowOverlap={true}>
              <View style={styles.markerWrap}>
                <View style={styles.markerLabelContainer}>
                  <View style={[styles.markerLabel, { backgroundColor: colors.error.main }]}>
                    <Icon name="map-marker" size={ms(12)} color={colors.common.white} style={{ marginRight: ms(4) }} />
                    <Text style={styles.markerLabelText} numberOfLines={1}>
                      Job Site
                    </Text>
                  </View>
                </View>
                <View style={styles.jobMarker}>
                  <Icon name="map-marker" size={ms(37)} color={colors.common.white} />
                </View>
                <View style={styles.jobArrow} />
              </View>
            </Mapbox.MarkerView>
          )}
        </Mapbox.MapView>

        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={[styles.mapControls, { top: insets.top + ms(70) }]}>
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: isSatelliteView ? colors.primary.main : themeColors.card }]}
            onPress={() => setIsSatelliteView(!isSatelliteView)}
          >
            <Icon name="satellite-variant" size={ms(18)} color={isSatelliteView ? colors.common.white : themeColors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: themeColors.card }]} onPress={handleFitAll}>
            <Icon name="fit-to-screen-outline" size={ms(18)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: themeColors.card }]} onPress={handleOpenMaps}>
            <Icon name="directions" size={ms(18)} color={colors.primary.main} />
          </TouchableOpacity>
        </View>

        {!isMapReady && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.mapLoadingText}>Loading map...</Text>
          </View>
        )}

        {isMapReady && (() => {
          const legendItems = [
            ['ticketed', 'Ticketed',  'loading',  'Loading'],
            ['to_job',   'To Job',    'at_job',   'At Job'],
            ['pouring',  'Pour',      'washing',  'Wash'],
            ['to_plant', 'To Plant',  'at_plant', 'At Plant'],
          ];
          return (
            <Pressable
              onPress={() => setIsLegendExpanded(!isLegendExpanded)}
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                zIndex: 20,
                elevation: 20,
                backgroundColor: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.95)',
                borderRadius: 8,
                paddingHorizontal: ms(10),
                paddingVertical: ms(6),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: ms(4) }}>
                <Icon name="information-outline" size={ms(12)} color={themeColors.text.primary} />
                <Text style={{ fontSize: ms(10), fontFamily: fontFamily.bold, color: themeColors.text.primary }}>Status</Text>
                <Icon name={isLegendExpanded ? 'chevron-up' : 'chevron-down'} size={ms(12)} color={themeColors.text.primary} />
              </View>
              {isLegendExpanded && legendItems.map((row, i) => (
                <Text key={`r${i}`} style={{ marginTop: i === 0 ? ms(4) : ms(2), lineHeight: ms(14) }}>
                  <Text style={{ color: statusConfig[row[0]]?.color || FALLBACK_STATUS_COLOR, fontSize: ms(15) }}>{'\u25A0 '}</Text>
                  <Text style={{ fontSize: ms(10), fontFamily: fontFamily.medium, color: themeColors.text.secondary }}>{row[1]}    </Text>
                  <Text style={{ color: statusConfig[row[2]]?.color || FALLBACK_STATUS_COLOR, fontSize: ms(15) }}>{'\u25A0 '}</Text>
                  <Text style={{ fontSize: ms(10), fontFamily: fontFamily.medium, color: themeColors.text.secondary }}>{row[3]}</Text>
                </Text>
              ))}
            </Pressable>
          );
        })()}

      </Animated.View>

      <Animated.View style={[styles.sheet, { height: sheetHeight, backgroundColor: themeColors.background, paddingBottom: insets.bottom }]}>

        <View {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.handleWrap}
            onPress={toggleSheet}
            activeOpacity={0.8}
          >
            <View style={[styles.handle, { backgroundColor: isDark ? colors.semiTransparent.white30 : colors.semiTransparent.black15 }]} />
            <Animated.View
              style={[
                styles.handleIndicator,
                {
                  transform: [{
                    rotate: sheetHeight.interpolate({
                      inputRange: [SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT],
                      outputRange: ['0deg', '180deg'],
                    })
                  }]
                }
              ]}
            >
              <Icon name="chevron-up" size={ms(18)} color={themeColors.text.hint} />
            </Animated.View>
          </TouchableOpacity>
        </View>


        <View style={[styles.orderInfoCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.orderInfoHeader}>
            <Text style={[styles.orderInfoCode, { color: themeColors.text.primary }]}>
              #{trackingData?.order_code}
            </Text>
            <View style={styles.liveBadgeSmall}>
              <View style={styles.liveDotSmall} />
              <Text style={styles.liveTextSmall}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.orderInfoCustomer, { color: themeColors.text.primary }]} numberOfLines={1}>
            {trackingData?.customer_name}
          </Text>
          <View style={styles.orderInfoDetails}>
            {trackingData?.order_date && (
              <View style={styles.orderInfoRow}>
                <Icon name="calendar" size={ms(12)} color={themeColors.text.hint} />
                <Text style={[styles.orderInfoText, { color: themeColors.text.secondary }]}>
                  {trackingData.order_date}
                </Text>
              </View>
            )}
            {trackingData?.project_name && (
              <View style={styles.orderInfoRow}>
                <Icon name="clipboard-text-outline" size={ms(12)} color={themeColors.text.hint} />
                <Text style={[styles.orderInfoText, { color: themeColors.text.secondary }]} numberOfLines={1}>
                  {trackingData.project_name}
                </Text>
              </View>
            )}
            {trackingData?.delivery_address && (
              <View style={styles.orderInfoRow}>
                <Icon name="map-marker" size={ms(12)} color={themeColors.text.hint} />
                <Text style={[styles.orderInfoText, { color: themeColors.text.secondary }]} numberOfLines={1}>
                  {trackingData.delivery_address}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.progressTop}>
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Ordered</Text>
                <Text style={[styles.statValue, { color: themeColors.text.primary }]}>
                  {fmtQty(trackingData?.ordered_qty || 0)}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
              <View style={styles.progressStat}>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Delivered</Text>
                <Text style={[styles.statValue, { color: colors.success.main }]}>
                  {fmtQty(trackingData?.delivered_qty || 0)}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />
              <View style={styles.progressStat}>
                <Text style={[styles.statLabel, { color: themeColors.text.hint }]}>Remaining</Text>
                <Text style={[styles.statValue, { color: colors.warning.main }]}>
                  {trackingData?.remaining_display || '0'}
                </Text>
              </View>
            </View>
            <View style={[styles.percentBadge, { backgroundColor: `${firstTicketStatusColor}20` }]}>
              <Text style={[styles.percentText, { color: firstTicketStatusColor }]}>{progressPercent}%</Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: `${firstTicketStatusColor}20` }]}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%`, backgroundColor: firstTicketStatusColor }]} />
          </View>
        </View>

        <View style={styles.ticketsSection}>
          <View style={styles.ticketsHeader}>
            <View style={styles.ticketsHeaderLeft}>
              <Icon name="truck-cargo-container" size={ms(18)} color={colors.primary.main} />
              <Text style={[styles.ticketsTitle, { color: themeColors.text.primary }]}>
                Active Loads
              </Text>
            </View>
            <View style={[styles.ticketCount, { backgroundColor: `${colors.primary.main}15` }]}>
              <Text style={[styles.ticketCountText, { color: colors.primary.main }]}>
                {pagination?.total ?? tickets.length}
              </Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={tickets}
            renderItem={({ item }) => renderTicketCard(item)}
            keyExtractor={(item) => item.ticket_id}
            style={styles.ticketsList}
            contentContainerStyle={{ paddingBottom: ms(16), flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5,
                });
              }, 500);
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary.main}
                colors={[colors.primary.main]}
              />
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="truck-outline" size={ms(36)} color={themeColors.text.hint} />
                <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
                  No active loads yet
                </Text>
              </View>
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary.main} />
                  <Text style={[styles.footerLoaderText, { color: themeColors.text.secondary }]}>
                    Loading more...
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: ms(32) },
  errorIcon: { width: ms(72), height: ms(72), borderRadius: ms(36), justifyContent: 'center', alignItems: 'center', marginBottom: ms(16) },
  errorTitle: { fontSize: ms(17), fontFamily: fontFamily.bold, marginBottom: ms(6) },
  errorMsg: { fontSize: ms(13), fontFamily: fontFamily.regular, textAlign: 'center', marginBottom: ms(20) },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: ms(6), backgroundColor: colors.primary.main, paddingHorizontal: ms(20), paddingVertical: ms(10), borderRadius: ms(10) },
  retryText: { color: colors.common.white, fontSize: ms(14), fontFamily: fontFamily.semiBold },

  mapWrap: { overflow: 'hidden' },
  map: { flex: 1 },
  mapLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.semiTransparent.white90, justifyContent: 'center', alignItems: 'center' },
  mapLoadingText: { marginTop: ms(10), fontSize: ms(14), fontFamily: fontFamily.medium, color: colors.grey[50] },

  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: ms(12), gap: ms(10) },
  backBtn: { width: ms(42), height: ms(42), borderRadius: ms(21), backgroundColor: colors.semiTransparent.black40, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, backgroundColor: colors.semiTransparent.black40, borderRadius: ms(12), paddingHorizontal: ms(14), paddingVertical: ms(10) },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderCode: { fontSize: ms(16), fontFamily: fontFamily.bold, color: colors.common.white },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: ms(4), backgroundColor: colors.semiTransparent.teal20, paddingHorizontal: ms(8), paddingVertical: ms(3), borderRadius: ms(6) },
  liveDot: { width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: colors.trackingStatus.live },
  liveText: { fontSize: ms(9), fontFamily: fontFamily.bold, color: colors.trackingStatus.live, letterSpacing: 0.5 },
  customerName: { fontSize: ms(12), fontFamily: fontFamily.regular, color: colors.semiTransparent.white85, marginTop: ms(2) },

  statusLegend: {
    position: 'absolute',
    bottom: '40%',
    left: ms(8),
    zIndex: 20,
    backgroundColor: colors.semiTransparent.darkGray90,
    borderRadius: ms(8),
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 20,
  },
  statusLegendCollapsed: {
    right: 'auto' as any,
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    minWidth: ms(90),
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  legendTitle: {
    fontSize: ms(11),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
  },
  legendContent: {
    marginTop: ms(4),
    gap: ms(3),
    width: ms(180),
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: ms(85),
  },
  legendDot: {
    width: ms(7),
    height: ms(7),
    borderRadius: ms(2),
    marginRight: ms(4),
  },
  legendLabel: {
    fontSize: ms(9),
    fontFamily: fontFamily.medium,
    color: colors.common.white,
  },

  mapControls: { position: 'absolute', right: ms(12), gap: ms(8) },
  mapBtn: { width: ms(40), height: ms(40), borderRadius: ms(20), justifyContent: 'center', alignItems: 'center', shadowColor: colors.common.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },

  routePill: { position: 'absolute', left: ms(12), bottom: ms(16), flexDirection: 'row', alignItems: 'center', gap: ms(6), paddingHorizontal: ms(12), paddingVertical: ms(8), borderRadius: ms(20), shadowColor: colors.common.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  routeText: { fontSize: ms(12), fontFamily: fontFamily.semiBold },
  routeDivider: { width: 1, height: ms(12), backgroundColor: colors.semiTransparent.black10, marginHorizontal: ms(4) },

  markerWrap: { alignItems: 'center' },
  markerLabelContainer: { marginBottom: ms(4) },
  markerLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ms(8), paddingVertical: ms(4), borderRadius: ms(6), maxWidth: ms(180), shadowColor: colors.common.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  markerLabelText: { fontSize: ms(11), fontFamily: fontFamily.semiBold, color: colors.common.white, textAlign: 'center' },
  plantMarker: { width: ms(55), height: ms(55), borderRadius: ms(28), backgroundColor: colors.mapMarker.plant, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.common.white, shadowColor: colors.common.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  plantArrow: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.mapMarker.plant, marginTop: -3 },
  jobMarker: { width: ms(55), height: ms(55), borderRadius: ms(28), backgroundColor: colors.mapMarker.jobSite, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.common.white, shadowColor: colors.common.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  jobArrow: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.mapMarker.jobSite, marginTop: -3 },
  jobSiteLabel: { backgroundColor: colors.mapMarker.jobSite, paddingHorizontal: ms(8), paddingVertical: ms(3), borderRadius: ms(4), marginTop: ms(4), shadowColor: colors.common.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  jobSiteLabelText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.common.white },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20), shadowColor: colors.common.black, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  handleWrap: { alignItems: 'center', paddingTop: ms(8), paddingBottom: ms(4) },
  handle: { width: ms(36), height: ms(4), borderRadius: ms(2) },
  handleIndicator: { marginTop: ms(2) },

  orderInfoCard: { marginHorizontal: ms(12), borderRadius: ms(8), paddingHorizontal: ms(10), paddingVertical: ms(6), marginBottom: ms(6), shadowColor: colors.common.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  orderInfoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ms(2) },
  orderInfoCode: { fontSize: ms(14), fontFamily: fontFamily.bold },
  liveBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: colors.semiTransparent.teal20, paddingHorizontal: ms(5), paddingVertical: ms(1), borderRadius: ms(3) },
  liveDotSmall: { width: ms(4), height: ms(4), borderRadius: ms(2), backgroundColor: colors.trackingStatus.live },
  liveTextSmall: { fontSize: ms(7), fontFamily: fontFamily.bold, color: colors.trackingStatus.live, letterSpacing: 0.4 },
  orderInfoCustomer: { fontSize: ms(12), fontFamily: fontFamily.semiBold, marginBottom: ms(3) },
  orderInfoDetails: { gap: ms(2) },
  orderInfoRow: { flexDirection: 'row', alignItems: 'center', gap: ms(4) },
  orderInfoText: { fontSize: ms(10), fontFamily: fontFamily.regular, flex: 1 },

  progressCard: { marginHorizontal: ms(12), borderRadius: ms(10), paddingHorizontal: ms(10), paddingVertical: ms(8), shadowColor: colors.common.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: ms(6) },
  progressStats: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressStat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: ms(8), fontFamily: fontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: ms(14), fontFamily: fontFamily.bold, marginTop: ms(1) },
  statDivider: { width: 1, height: ms(22), opacity: 0.15 },
  percentBadge: { paddingHorizontal: ms(8), paddingVertical: ms(4), borderRadius: ms(6) },
  percentText: { fontSize: ms(13), fontFamily: fontFamily.bold },
  progressTrack: { height: ms(4), borderRadius: ms(2), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: ms(2) },

  ticketsSection: { flex: 1, paddingTop: ms(8) },
  ticketsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ms(14), marginBottom: ms(6) },
  ticketsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: ms(6) },
  ticketsTitle: { fontSize: ms(13), fontFamily: fontFamily.semiBold },
  ticketCount: { paddingHorizontal: ms(8), paddingVertical: ms(2), borderRadius: ms(6) },
  ticketCountText: { fontSize: ms(11), fontFamily: fontFamily.bold },
  ticketsList: { flex: 1, paddingHorizontal: ms(12) },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: ms(40) },
  emptyText: { fontSize: ms(13), fontFamily: fontFamily.regular, marginTop: ms(10) },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: ms(16), gap: ms(8) },
  footerLoaderText: { fontSize: ms(12), fontFamily: fontFamily.medium },

  ticketCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: ms(4), paddingHorizontal: ms(8), borderRadius: ms(8), marginBottom: ms(8) },
  ticketCardSelected: { borderWidth: 1, borderColor: colors.primary.main },
  ticketLeft: { alignItems: 'center', marginRight: ms(8), flexShrink: 0 },
  loadIndicator: { width: ms(28), height: ms(28), borderRadius: ms(14), justifyContent: 'center', alignItems: 'center' },
  loadNum: { fontSize: ms(13), fontFamily: fontFamily.bold, color: colors.common.white },
  ticketCenter: { flex: 1 },
  ticketRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ms(6) },
  ticketCode: { fontSize: ms(13), fontFamily: fontFamily.bold, flex: 1 },
  statusTimeContainer: { flexDirection: 'row', alignItems: 'center', gap: ms(4) },
  statusTime: { fontSize: ms(10), fontFamily: fontFamily.medium },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), paddingHorizontal: ms(6), paddingVertical: ms(1), borderRadius: ms(4) },
  statusChipText: { fontSize: ms(10), fontFamily: fontFamily.semiBold },
  ticketRow2: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: ms(2), flexShrink: 1, minWidth: 0 },
  infoText: { fontSize: ms(11), fontFamily: fontFamily.regular, flexShrink: 1 },
  infoDot: { width: ms(2), height: ms(2), borderRadius: ms(1), marginHorizontal: ms(4), flexShrink: 0 },
  ticketRow3: { flexDirection: 'row', alignItems: 'center', gap: ms(8), flexWrap: 'wrap' },
  productChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.secondary.main}12`, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(4), flexShrink: 0 },
  productText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.secondary.main },
  qtyChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.primary.main}12`, paddingHorizontal: ms(8), paddingVertical: ms(3), borderRadius: ms(6), flexShrink: 0 },
  qtyText: { fontSize: ms(13), fontFamily: fontFamily.bold, color: colors.primary.main },
  qtyUnit: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.primary.main, marginLeft: ms(1) },
  etaChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.info.main}12`, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(4), flexShrink: 0 },
  etaText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.info.main },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.success.main}12`, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(4), flexShrink: 0 },
  timeText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.success.main },
});

export default OrderTrackingScreen;
