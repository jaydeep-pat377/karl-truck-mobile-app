/**
 * OrderTrackingScreen
 * Production-ready order tracking with live map and ticket timeline
 * Modern, polished UI with clear visual hierarchy
 */

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
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader } from '../../components/common';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms } from '../../utils/responsive';
import { useOrderTracking, useDirections } from '../../hooks';
import { TrackingTicket } from '../../types/orderTracking';
import { truckImagesByStatus } from '../../assets/images';

// Truck Marker Component - Separate component to force re-renders
interface TruckMarkerProps {
  ticket: TrackingTicket;
  isSelected: boolean;
  onPress: () => void;
}

const TruckMarkerContent: React.FC<TruckMarkerProps> = React.memo(({ ticket, isSelected, onPress }) => {
  const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.ticketed;
  const truckImage = truckImagesByStatus[ticket.status] || truckImagesByStatus.ticketed;

  return (
    <TouchableOpacity
      style={truckMarkerStyles.wrap}
      onPress={onPress}
      activeOpacity={0.8}>
      {/* Selected indicator ring */}
      {isSelected && <View style={truckMarkerStyles.selectedRing} />}

      <Image
        source={truckImage}
        style={[
          truckMarkerStyles.truckImage,
          isSelected && truckMarkerStyles.truckImageSelected
        ]}
        resizeMode="contain"
      />

      {/* Load badge */}
      <View style={[
        truckMarkerStyles.loadBadge,
        { backgroundColor: config.color },
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
  // Custom comparison - re-render when selection changes
  return prevProps.isSelected === nextProps.isSelected &&
    prevProps.ticket.ticket_id === nextProps.ticket.ticket_id &&
    prevProps.ticket.status === nextProps.ticket.status;
});

// Truck marker styles
const truckMarkerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRing: {
    position: 'absolute',
    width: ms(75),
    height: ms(75),
    borderRadius: ms(40),
    backgroundColor: `${colors.primary.main}20`,
    borderWidth: 3,
    borderColor: colors.primary.main,
  },
  truckImage: {
    width: ms(60),
    height: ms(60),
  },
  truckImageSelected: {
    width: ms(65),
    height: ms(65),
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
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderWidth: 2,
    borderColor: colors.common.white,
  },
  loadText: {
    fontSize: ms(10),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
  },
  loadTextSelected: {
    fontSize: ms(12),
  },
});

// Initialize Mapbox
Mapbox.setAccessToken('MAPBOX_TOKEN_REMOVED');

const MAP_STYLES = {
  light: Mapbox.StyleURL.Street,
  dark: Mapbox.StyleURL.Dark,
};

// Status configuration with colors and icons (matching the legend)
const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  ticketed: { color: '#9E9E9E', icon: 'ticket-outline', label: 'Ticketed' },
  loading: { color: '#8BC34A', icon: 'package-variant', label: 'Loading' },
  loaded: { color: '#2E7D32', icon: 'package-variant-closed', label: 'Loaded' },
  to_job: { color: '#2E7D32', icon: 'truck-fast', label: 'To Job' },
  at_job: { color: '#64B5F6', icon: 'map-marker-check', label: 'At Job' },
  pouring: { color: '#1565C0', icon: 'water', label: 'Begin Pour' },
  begin_pour: { color: '#1565C0', icon: 'water', label: 'Begin Pour' },
  begin_pouring: { color: '#1565C0', icon: 'water', label: 'Begin Pour' },
  washing: { color: '#C62828', icon: 'water-pump', label: 'Washing' },
  to_plant: { color: '#EC407A', icon: 'arrow-u-left-top', label: 'Returning' },
  at_plant: { color: '#EC407A', icon: 'home-circle', label: 'At Plant' },
  cancelled: { color: '#EF4444', icon: 'close-circle', label: 'Cancelled' },
};

type OrderTrackingRouteProp = RouteProp<RootStackParamList, 'Tracking'>;

export const OrderTrackingScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<OrderTrackingRouteProp>();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const themeColors = isDark ? colors.dark : colors.light;
  const cameraRef = useRef<Mapbox.Camera>(null);

  const { orderId } = route.params;
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Responsive bottom sheet heights
  const SHEET_MIN_HEIGHT = useMemo(() => screenHeight * 0.38, [screenHeight]);
  const SHEET_MAX_HEIGHT = useMemo(() => screenHeight * 0.78, [screenHeight]);

  // Bottom sheet animation
  const sheetHeight = useRef(new Animated.Value(screenHeight * 0.38)).current;
  const lastGestureY = useRef(0);

  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Store current height value
        sheetHeight.stopAnimation((value) => {
          lastGestureY.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new height (drag up = increase height, drag down = decrease height)
        const newHeight = lastGestureY.current - gestureState.dy;
        // Clamp between min and max
        const clampedHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, newHeight));
        sheetHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = lastGestureY.current - gestureState.dy;
        const velocity = gestureState.vy;

        // Determine snap point based on velocity and position
        let snapTo: number;
        if (velocity < -0.5) {
          // Fast swipe up -> expand
          snapTo = SHEET_MAX_HEIGHT;
        } else if (velocity > 0.5) {
          // Fast swipe down -> collapse
          snapTo = SHEET_MIN_HEIGHT;
        } else {
          // Slow drag -> snap to nearest
          const midPoint = (SHEET_MIN_HEIGHT + SHEET_MAX_HEIGHT) / 2;
          snapTo = currentHeight > midPoint ? SHEET_MAX_HEIGHT : SHEET_MIN_HEIGHT;
        }

        setIsSheetExpanded(snapTo === SHEET_MAX_HEIGHT);

        Animated.spring(sheetHeight, {
          toValue: snapTo,
          useNativeDriver: false,
          tension: 100,
          friction: 12,
        }).start();
      },
    })
  ).current;

  // Toggle sheet expansion
  const toggleSheet = useCallback(() => {
    const toValue = isSheetExpanded ? SHEET_MIN_HEIGHT : SHEET_MAX_HEIGHT;
    setIsSheetExpanded(!isSheetExpanded);

    Animated.spring(sheetHeight, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 12,
    }).start();
  }, [isSheetExpanded, sheetHeight, SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT]);

  // Update sheet height when screen dimensions change (e.g., orientation change)
  useEffect(() => {
    const newValue = isSheetExpanded ? SHEET_MAX_HEIGHT : SHEET_MIN_HEIGHT;
    sheetHeight.setValue(newValue);
  }, [screenHeight, SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT]);

  // Calculate map height based on sheet height
  const mapHeight = sheetHeight.interpolate({
    inputRange: [SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT],
    outputRange: [screenHeight - SHEET_MIN_HEIGHT, screenHeight - SHEET_MAX_HEIGHT],
    extrapolate: 'clamp',
  });

  // Fetch tracking data with pagination
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

  // Selected ticket - only return ticket when explicitly selected (not by default)
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find(t => t.ticket_id === selectedTicketId) || null;
  }, [selectedTicketId, tickets]);

  // Locations - check for valid lat/lng values (not null/undefined)
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

  // Directions - disabled, not showing route line
  const { distanceFormatted, durationFormatted } = useDirections({
    origin: selectedTruckLocation,
    destination: jobLocation,
    options: { profile: 'driving-traffic', overview: 'full' },
    enabled: false, // Disabled - no route line needed
  });

  // Map bounds - includes plant, job, and all trucks
  const mapBounds = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];
    if (plantLocation) points.push({ lat: plantLocation.latitude, lng: plantLocation.longitude });
    if (jobLocation) points.push({ lat: jobLocation.latitude, lng: jobLocation.longitude });
    // Add all truck locations
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

  // Fit bounds on load
  useEffect(() => {
    if (mapBounds && cameraRef.current) {
      const timer = setTimeout(() => {
        cameraRef.current?.fitBounds(mapBounds.ne, mapBounds.sw, [50, 50, 80, 50], 1000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapBounds]);

  // Handlers
  const handleTicketPress = useCallback((ticket: TrackingTicket) => {
    setSelectedTicketId(ticket.ticket_id);

    // Fit camera to show all three locations: plant, job, and truck
    if (cameraRef.current) {
      const points: Array<{ lat: number; lng: number }> = [];

      // Add plant location
      if (trackingData?.plant?.latitude && trackingData?.plant?.longitude) {
        points.push({ lat: trackingData.plant.latitude, lng: trackingData.plant.longitude });
      }

      // Add job/order location
      if (trackingData?.order_location?.latitude && trackingData?.order_location?.longitude) {
        points.push({ lat: trackingData.order_location.latitude, lng: trackingData.order_location.longitude });
      }

      // Add truck location
      if (ticket.truck?.latitude && ticket.truck?.longitude) {
        points.push({ lat: ticket.truck.latitude, lng: ticket.truck.longitude });
      }

      if (points.length > 1) {
        // Calculate bounds to fit all locations with extra padding
        const padding = 0.02;
        const lats = points.map(p => p.lat);
        const lngs = points.map(p => p.lng);
        const ne: [number, number] = [Math.max(...lngs) + padding, Math.max(...lats) + padding];
        const sw: [number, number] = [Math.min(...lngs) - padding, Math.min(...lats) - padding];

        // Increased edge insets to account for header and bottom sheet
        cameraRef.current.fitBounds(ne, sw, [120, 50, 100, 50], 800);
      } else if (ticket.truck?.latitude && ticket.truck?.longitude) {
        // Fallback: center on truck if only one point
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

  // Get progress color
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return colors.success.main;
    if (percent >= 50) return '#F59E0B';
    return colors.info.main;
  };

  // Render enhanced ticket card
  const renderTicketCard = useCallback((ticket: TrackingTicket, index: number) => {
    const isSelected = selectedTicketId === ticket.ticket_id;
    const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.ticketed;

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
        {/* Left: Load indicator with status color */}
        <View style={styles.ticketLeft}>
          <View style={[styles.loadIndicator, { backgroundColor: config.color }]}>
            <Text style={styles.loadNum}>{ticket.load}</Text>
          </View>
        </View>

        {/* Center: Ticket info */}
        <View style={styles.ticketCenter}>
          {/* Row 1: Ticket code + Status */}
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
                  {ticket.status_display || config.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Row 2: Driver + Truck */}
          <View style={styles.ticketRow2}>
            <View style={styles.infoChip}>
              <Icon name="account-circle" size={ms(10)} color={themeColors.text.hint} />
              <Text style={[styles.infoText, { color: themeColors.text.secondary }]} numberOfLines={1}>
                {ticket.driver?.name}
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

          {/* Row 3: Quantity + ETA */}
          <View style={styles.ticketRow3}>
            <View style={styles.qtyChip}>
              <Icon name="package-variant-closed" size={ms(11)} color={colors.primary.main} />
              <Text style={styles.qtyText} numberOfLines={1}>
                {fmtQty(ticket.load_qty)}
              </Text>
              <Text style={styles.qtyUnit}>CY</Text>
            </View>
            {ticket.timestamps?.eta_at_job && (
              <View style={styles.etaChip}>
                <Icon name="clock-fast" size={ms(9)} color={colors.info.main} />
                <Text style={styles.etaText} numberOfLines={1}>
                  ETA {ticket.timestamps.eta_at_job}
                </Text>
              </View>
            )}
            {ticket.timestamps?.pouring && (
              <View style={styles.timeChip}>
                <Icon name="water" size={ms(9)} color={colors.success.main} />
                <Text style={styles.timeText} numberOfLines={1}>
                  {ticket.timestamps.pouring}
                </Text>
              </View>
            )}
          </View>
        </View>

      </TouchableOpacity>
    );
  }, [themeColors, isDark, selectedTicketId, handleTicketPress]);

  // Loading state
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

  // Error state
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
  const progressColor = getProgressColor(progressPercent);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />

      {/* === MAP SECTION === */}
      <Animated.View style={[styles.mapWrap, { height: mapHeight }]}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={isDark ? MAP_STYLES.dark : MAP_STYLES.light}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: jobLocation ? [jobLocation.longitude, jobLocation.latitude] : [-96.9, 35.4],
              zoomLevel: 11,
            }}
          />

          {/* All Truck Markers - Rendered first so plant/job appear on top */}
          {tickets.map(ticket => {
            if (!ticket.truck?.latitude || !ticket.truck?.longitude) return null;
            const isSelected = selectedTicketId === ticket.ticket_id;
            return (
              <Mapbox.MarkerView
                key={`truck-${ticket.ticket_id}`}
                coordinate={[ticket.truck.longitude, ticket.truck.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
                allowOverlap={true}
              >
                <TruckMarkerContent
                  ticket={ticket}
                  isSelected={isSelected}
                  onPress={() => handleTicketPress(ticket)}
                />
              </Mapbox.MarkerView>
            );
          })}

          {/* Plant Marker - Always visible */}
          {plantLocation && (
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
                  <Icon name="factory" size={ms(18)} color={colors.common.white} />
                </View>
                <View style={styles.plantArrow} />
              </View>
            </Mapbox.MarkerView>
          )}

          {/* Job Marker - Always visible */}
          {jobLocation && (
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
                  <Icon name="map-marker" size={ms(22)} color={colors.common.white} />
                </View>
                <View style={styles.jobArrow} />
              </View>
            </Mapbox.MarkerView>
          )}
        </Mapbox.MapView>

        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerTop}>
              <Text style={styles.orderCode}>#{trackingData?.order_code}</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.customerName} numberOfLines={1}>
              {trackingData?.customer_name}
            </Text>
          </View>
        </SafeAreaView>

        {/* Status Legend */}
        <View style={styles.statusLegend}>
          <Text style={styles.legendTitle}>Status Legend</Text>
          {[
            { key: 'loading', color: '#8BC34A', label: 'Loading' },
            { key: 'to_job', color: '#2E7D32', label: 'To Job' },
            { key: 'at_job', color: '#64B5F6', label: 'At Job' },
            { key: 'pouring', color: '#1565C0', label: 'Begin Pour' },
            { key: 'washing', color: '#C62828', label: 'Washing' },
            { key: 'to_plant', color: '#EC407A', label: 'Returning' },
          ].map((status) => (
            <View key={status.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: status.color }]} />
              <Text style={styles.legendLabel}>{status.label}</Text>
            </View>
          ))}
        </View>

        {/* Map Controls */}
        <View style={[styles.mapControls, { top: insets.top + ms(70) }]}>
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: themeColors.card }]} onPress={handleFitAll}>
            <Icon name="fit-to-screen-outline" size={ms(18)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: themeColors.card }]} onPress={handleOpenMaps}>
            <Icon name="directions" size={ms(18)} color={colors.primary.main} />
          </TouchableOpacity>
        </View>

      </Animated.View>

      {/* === BOTTOM SHEET === */}
      <Animated.View style={[styles.sheet, { height: sheetHeight, backgroundColor: themeColors.background }]}>
        {/* Drag Handle */}
        <View {...panResponder.panHandlers}>
          <TouchableOpacity
            style={styles.handleWrap}
            onPress={toggleSheet}
            activeOpacity={0.8}
          >
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }]} />
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

        {/* Progress Section */}
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
            <View style={[styles.percentBadge, { backgroundColor: `${progressColor}15` }]}>
              <Text style={[styles.percentText, { color: progressColor }]}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%`, backgroundColor: progressColor }]} />
          </View>
        </View>

        {/* Tickets Section */}
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
            data={tickets}
            renderItem={({ item, index }) => renderTicketCard(item, index)}
            keyExtractor={(item) => item.ticket_id}
            style={styles.ticketsList}
            contentContainerStyle={{ paddingBottom: insets.bottom + ms(16), flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
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

  // Map
  mapWrap: { overflow: 'hidden' },
  map: { flex: 1 },

  // Header
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: ms(12), gap: ms(10) },
  backBtn: { width: ms(42), height: ms(42), borderRadius: ms(21), backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: ms(12), paddingHorizontal: ms(14), paddingVertical: ms(10) },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderCode: { fontSize: ms(16), fontFamily: fontFamily.bold, color: colors.common.white },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: ms(4), backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: ms(8), paddingVertical: ms(3), borderRadius: ms(6) },
  liveDot: { width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: '#10B981' },
  liveText: { fontSize: ms(9), fontFamily: fontFamily.bold, color: '#10B981', letterSpacing: 0.5 },
  customerName: { fontSize: ms(12), fontFamily: fontFamily.regular, color: 'rgba(255,255,255,0.85)', marginTop: ms(2) },

  // Status Legend
  statusLegend: {
    position: 'absolute',
    top: ms(100),
    right: ms(12),
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: ms(12),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  legendTitle: {
    fontSize: ms(12),
    fontFamily: fontFamily.bold,
    color: colors.common.white,
    marginBottom: ms(8),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ms(6),
  },
  legendDot: {
    width: ms(11),
    height: ms(11),
    borderRadius: ms(2),
    marginRight: ms(8),
  },
  legendLabel: {
    fontSize: ms(11),
    fontFamily: fontFamily.medium,
    color: colors.common.white,
  },

  // Map controls
  mapControls: { position: 'absolute', right: ms(12), gap: ms(8) },
  mapBtn: { width: ms(40), height: ms(40), borderRadius: ms(20), justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },

  // Route pill
  routePill: { position: 'absolute', left: ms(12), bottom: ms(16), flexDirection: 'row', alignItems: 'center', gap: ms(6), paddingHorizontal: ms(12), paddingVertical: ms(8), borderRadius: ms(20), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  routeText: { fontSize: ms(12), fontFamily: fontFamily.semiBold },
  routeDivider: { width: 1, height: ms(12), backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: ms(4) },

  // Markers
  markerWrap: { alignItems: 'center' },
  markerLabelContainer: { marginBottom: ms(4) },
  markerLabel: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ms(8), paddingVertical: ms(4), borderRadius: ms(6), maxWidth: ms(180), shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  markerLabelText: { fontSize: ms(11), fontFamily: fontFamily.semiBold, color: colors.common.white, textAlign: 'center' },
  plantMarker: { width: ms(40), height: ms(40), borderRadius: ms(20), backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.common.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  plantArrow: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#3B82F6', marginTop: -3 },
  jobMarker: { width: ms(40), height: ms(40), borderRadius: ms(20), backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.common.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  jobArrow: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#EF4444', marginTop: -3 },
  jobSiteLabel: { backgroundColor: '#EF4444', paddingHorizontal: ms(8), paddingVertical: ms(3), borderRadius: ms(4), marginTop: ms(4), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  jobSiteLabelText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.common.white },
  // Bottom sheet
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20), shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  handleWrap: { alignItems: 'center', paddingTop: ms(8), paddingBottom: ms(4) },
  handle: { width: ms(36), height: ms(4), borderRadius: ms(2) },
  handleIndicator: { marginTop: ms(2) },

  // Progress card - Compact
  progressCard: { marginHorizontal: ms(12), borderRadius: ms(10), paddingHorizontal: ms(10), paddingVertical: ms(8), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
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

  // Tickets
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

  // Ticket card - Compact
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
  qtyChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.primary.main}12`, paddingHorizontal: ms(8), paddingVertical: ms(3), borderRadius: ms(6), flexShrink: 0 },
  qtyText: { fontSize: ms(13), fontFamily: fontFamily.bold, color: colors.primary.main },
  qtyUnit: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.primary.main, marginLeft: ms(1) },
  etaChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.info.main}12`, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(4), flexShrink: 0 },
  etaText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.info.main },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: ms(3), backgroundColor: `${colors.success.main}12`, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(4), flexShrink: 0 },
  timeText: { fontSize: ms(10), fontFamily: fontFamily.semiBold, color: colors.success.main },
});

export default OrderTrackingScreen;
