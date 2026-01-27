import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  TextInput,
  RefreshControl,
  Modal,
  Animated,
  PanResponder,
  ActivityIndicator,
  InteractionManager,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, TruckLoader, EmptyViewWithPreset } from '../../components/common';
import { colors } from '../../theme/colors';
import { spacing, ms, iconSizes } from '../../utils/responsive';
import { useTrucks, useDirections } from '../../hooks';
import { Truck, TruckStatus } from '../../types/truck';

// Initialize Mapbox with access token
Mapbox.setAccessToken('MAPBOX_TOKEN_REMOVED');

const { height, width } = Dimensions.get('window');
const isSmallScreen = width < 375;

// Bottom sheet height constants
const BOTTOM_SHEET_MIN_HEIGHT = height * 0.12;
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.65;

// Mapbox style URLs
const MAP_STYLES = {
  light: Mapbox.StyleURL.Street,
  dark: Mapbox.StyleURL.Dark,
};

type StatusFilter = TruckStatus | 'all';

interface FilterOption {
  label: string;
  value: StatusFilter;
  color: string;
}

// Helper to get today's date range (default)
const getDateRange = (): { dateFrom: string; dateTo: string } => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
  return { dateFrom: formatDate(today), dateTo: formatDate(today) };
};

const statusFilterOptions: FilterOption[] = [
  { label: 'All', value: 'all', color: colors.grey[50] },
  { label: 'Delivered', value: 'delivered', color: colors.success.main },
  { label: 'Pouring', value: 'pouring', color: colors.info.main },
  { label: 'At Job', value: 'on_job', color: colors.warning.main },
  { label: 'At Plant', value: 'at_plant', color: colors.grey[60] },
  { label: 'Loaded', value: 'loaded', color: colors.secondary.main },
  { label: 'To Job', value: 'to_job', color: colors.primary.main },
];

const STATUS_COLORS: Record<string, string> = {
  delivered: colors.success.main,
  pouring: colors.info.main,
  on_job: colors.warning.main,
  at_plant: colors.grey[60],
  loaded: colors.secondary.main,
  to_job: colors.primary.main,
  idle: colors.grey[50],
};

const TableHeader: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const themeColors = isDark ? colors.dark : colors.light;
  return (
    <View style={[styles.tableHeader, { borderBottomColor: themeColors.border }]}>
      <View style={styles.truckCell}>
        <Text variant="caption" style={[styles.headerText, { color: themeColors.text.secondary }]}>
          Truck
        </Text>
      </View>
      <View style={styles.ticketCell}>
        <Text variant="caption" style={[styles.headerText, { color: themeColors.text.secondary }]}>
          Ticket
        </Text>
      </View>
      <View style={styles.coordCell}>
        <Text variant="caption" style={[styles.headerText, { color: themeColors.text.secondary }]}>
          LAT
        </Text>
      </View>
      <View style={styles.coordCell}>
        <Text variant="caption" style={[styles.headerText, { color: themeColors.text.secondary }]}>
          LONG
        </Text>
      </View>
      <View style={styles.updateCell}>
        <Text variant="caption" style={[styles.headerText, { color: themeColors.text.secondary }]}>
          Update
        </Text>
      </View>
    </View>
  );
};

type MapTrackingRouteProp = RouteProp<RootStackParamList, 'MapTracking'>;

export const MapTrackingScreen: React.FC = () => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<MapTrackingRouteProp>();
  const themeColors = isDark ? colors.dark : colors.light;
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Get params from navigation (from TicketDetailScreen)
  const {
    latitude: paramLatitude,
    longitude: paramLongitude,
    truckCode: paramTruckCode,
    ticketCode: paramTicketCode,
    driverName: paramDriverName,
    destination: paramDestination,
    orderCode: paramOrderCode,
    customerName: paramCustomerName,
    // Plant location
    plantLatitude: paramPlantLatitude,
    plantLongitude: paramPlantLongitude,
    plantName: paramPlantName,
    // Job location
    jobLatitude: paramJobLatitude,
    jobLongitude: paramJobLongitude,
  } = route.params || {};

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempStatus, setTempStatus] = useState<StatusFilter>('all');

  // Toggle for showing directions (route line between plant and job)
  const [showDirections, setShowDirections] = useState(false);

  // Calculate date range (always today)
  const dateRange = useMemo(() => getDateRange(), []);

  // Fetch trucks from API
  const {
    trucks: allTrucks,
    isLoading,
    isRefetching,
    refetch,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrucks({
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  // Filter trucks by status (client-side since API doesn't support status filter)
  const trucks = useMemo(() => {
    if (selectedStatus === 'all') return allTrucks;
    return allTrucks.filter((truck) => truck.status === selectedStatus);
  }, [allTrucks, selectedStatus]);

  // Bottom sheet draggable state
  const bottomSheetHeight = useRef(new Animated.Value(BOTTOM_SHEET_MAX_HEIGHT)).current;
  const currentHeight = useRef(BOTTOM_SHEET_MAX_HEIGHT);

  // Filter animation
  const filterModalAnim = useRef(new Animated.Value(0)).current;

  // PanResponder for draggable bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        const clampedHeight = Math.max(
          BOTTOM_SHEET_MIN_HEIGHT,
          Math.min(BOTTOM_SHEET_MAX_HEIGHT, newHeight)
        );
        bottomSheetHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        let snapHeight: number;

        if (gestureState.vy < -0.5) {
          snapHeight = BOTTOM_SHEET_MAX_HEIGHT;
        } else if (gestureState.vy > 0.5) {
          snapHeight = BOTTOM_SHEET_MIN_HEIGHT;
        } else {
          const midPoint = (BOTTOM_SHEET_MIN_HEIGHT + BOTTOM_SHEET_MAX_HEIGHT) / 2;
          snapHeight = newHeight > midPoint ? BOTTOM_SHEET_MAX_HEIGHT : BOTTOM_SHEET_MIN_HEIGHT;
        }

        currentHeight.current = snapHeight;
        Animated.spring(bottomSheetHeight, {
          toValue: snapHeight,
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }).start();
      },
    })
  ).current;

  // Filter trucks based on search (status is already filtered via API)
  const filteredTrucks = useMemo(() => {
    if (!searchQuery) return trucks;

    return trucks.filter((truck) => {
      const matchesSearch =
        truck.truckCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (truck.ticketCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (truck.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      return matchesSearch;
    });
  }, [trucks, searchQuery]);

  // Calculate map center - prioritize params from navigation
  const getMapCenter = useMemo((): [number, number] => {
    // If coordinates are passed from TicketDetailScreen, use them
    if (paramLatitude && paramLongitude) {
      return [parseFloat(paramLongitude), parseFloat(paramLatitude)];
    }

    if (filteredTrucks.length === 0) return [-98.6698, 35.5306];

    const lats = filteredTrucks.map((item) => item.latitude);
    const longs = filteredTrucks.map((item) => item.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLong = Math.min(...longs);
    const maxLong = Math.max(...longs);

    return [(minLong + maxLong) / 2, (minLat + maxLat) / 2];
  }, [filteredTrucks, paramLatitude, paramLongitude]);

  // Center camera on passed coordinates when screen loads
  useEffect(() => {
    if (paramLatitude && paramLongitude && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [parseFloat(paramLongitude), parseFloat(paramLatitude)],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  }, [paramLatitude, paramLongitude]);

  // Ensure bottom sheet is visible when screen comes into focus (especially from TicketDetailScreen)
  useFocusEffect(
    useCallback(() => {
      // Wait for navigation transition to complete before expanding bottom sheet
      const interactionPromise = InteractionManager.runAfterInteractions(() => {
        // Expand bottom sheet to max height
        currentHeight.current = BOTTOM_SHEET_MAX_HEIGHT;
        Animated.spring(bottomSheetHeight, {
          toValue: BOTTOM_SHEET_MAX_HEIGHT,
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }).start();
      });

      return () => {
        interactionPromise.cancel();
      };
    }, [bottomSheetHeight])
  );

  // Highlighted truck from navigation params (from TicketDetailScreen)
  const highlightedTruck = useMemo(() => {
    if (!paramLatitude || !paramLongitude) return null;

    const lat = parseFloat(paramLatitude);
    const lng = parseFloat(paramLongitude);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
      truckCode: paramTruckCode || 'Unknown',
      ticketCode: paramTicketCode,
      driverName: paramDriverName,
      destination: paramDestination,
      orderCode: paramOrderCode,
      customerName: paramCustomerName,
    };
  }, [paramLatitude, paramLongitude, paramTruckCode, paramTicketCode, paramDriverName, paramDestination, paramOrderCode, paramCustomerName]);

  // Plant location from navigation params (plant_location from API)
  const plantLocation = useMemo(() => {
    if (!paramPlantLatitude || !paramPlantLongitude) return null;

    const lat = parseFloat(paramPlantLatitude);
    const lng = parseFloat(paramPlantLongitude);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
      plantName: paramPlantName,
    };
  }, [paramPlantLatitude, paramPlantLongitude, paramPlantName]);

  // Job location from navigation params (order_location from API)
  const jobLocation = useMemo(() => {
    if (!paramJobLatitude || !paramJobLongitude) return null;

    const lat = parseFloat(paramJobLatitude);
    const lng = parseFloat(paramJobLongitude);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
      destination: paramDestination,
      customerName: paramCustomerName,
    };
  }, [paramJobLatitude, paramJobLongitude, paramDestination, paramCustomerName]);

  // Fetch real route directions between plant (truck) and job locations
  const {
    routeGeoJSON,
    distanceFormatted,
    durationFormatted,
    isLoading: isRouteLoading,
    isError: isRouteError,
    errorMessage: routeErrorMessage,
  } = useDirections({
    origin: plantLocation ? { latitude: plantLocation.latitude, longitude: plantLocation.longitude } : null,
    destination: jobLocation ? { latitude: jobLocation.latitude, longitude: jobLocation.longitude } : null,
    options: {
      profile: 'driving-traffic', // Use real-time traffic data
      overview: 'full', // Get full route geometry
    },
    enabled: !!plantLocation && !!jobLocation,
  });

  // Calculate bounds to fit both markers
  const routeBounds = useMemo(() => {
    if (!plantLocation || !jobLocation) return null;

    const padding = 0.01; // Add some padding around markers
    const minLng = Math.min(plantLocation.longitude, jobLocation.longitude) - padding;
    const maxLng = Math.max(plantLocation.longitude, jobLocation.longitude) + padding;
    const minLat = Math.min(plantLocation.latitude, jobLocation.latitude) - padding;
    const maxLat = Math.max(plantLocation.latitude, jobLocation.latitude) + padding;

    return {
      ne: [maxLng, maxLat] as [number, number], // Northeast
      sw: [minLng, minLat] as [number, number], // Southwest
    };
  }, [plantLocation, jobLocation]);

  // Fit camera to show both markers when they exist
  useEffect(() => {
    if (routeBounds && cameraRef.current) {
      // Delay slightly to ensure map is ready
      const timer = setTimeout(() => {
        cameraRef.current?.fitBounds(
          routeBounds.ne,
          routeBounds.sw,
          [80, 80, 200, 80], // Padding: [top, right, bottom, left] - more bottom padding for bottom sheet
          1000 // Animation duration
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [routeBounds]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  const renderListFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text variant="caption" style={[styles.loadingText, { color: themeColors.text.secondary }]}>
          Loading...
        </Text>
      </View>
    );
  }, [isFetchingNextPage, themeColors.text.secondary]);

  const openFilterModal = useCallback(() => {
    setTempStatus(selectedStatus);
    setShowFilterModal(true);
    Animated.spring(filterModalAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [filterModalAnim, selectedStatus]);

  const closeFilterModal = useCallback(() => {
    setShowFilterModal(false);
    filterModalAnim.setValue(0);
  }, [filterModalAnim]);

  const applyFilters = useCallback(() => {
    setSelectedStatus(tempStatus);
    closeFilterModal();
  }, [tempStatus, closeFilterModal]);

  const clearAllFilters = useCallback(() => {
    setTempStatus('all');
  }, []);

  const handleMapPress = useCallback(() => {
    if (currentHeight.current >= BOTTOM_SHEET_MAX_HEIGHT * 0.9) {
      currentHeight.current = BOTTOM_SHEET_MIN_HEIGHT;
      Animated.spring(bottomSheetHeight, {
        toValue: BOTTOM_SHEET_MIN_HEIGHT,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [bottomSheetHeight]);

  const hasActiveFilters = selectedStatus !== 'all';

  // Function to open Google Maps with directions
  const openGoogleMapsDirections = useCallback(() => {
    if (!plantLocation || !jobLocation) return;

    const origin = `${plantLocation.latitude},${plantLocation.longitude}`;
    const destination = `${jobLocation.latitude},${jobLocation.longitude}`;

    // Different URL schemes for iOS and Android
    const googleMapsUrl = Platform.select({
      ios: `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
      android: `google.navigation:q=${destination}&origin=${origin}`,
    });

    // Fallback to web URL if Google Maps app is not installed
    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    if (googleMapsUrl) {
      Linking.canOpenURL(googleMapsUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(googleMapsUrl);
          } else {
            // Fallback to web Google Maps
            Linking.openURL(webUrl);
          }
        })
        .catch(() => {
          Linking.openURL(webUrl);
        });
    } else {
      Linking.openURL(webUrl);
    }
  }, [plantLocation, jobLocation]);

  // Handle directions toggle - show directions in-app directly
  const handleDirectionsToggle = useCallback(() => {
    setShowDirections(!showDirections);
  }, [showDirections]);

  const renderTruckItem = useCallback(
    ({ item, index }: { item: Truck; index: number }) => (
      <TouchableOpacity
        style={[
          styles.tableRow,
          index % 2 === 0 && { backgroundColor: isDark ? colors.dark.surface : colors.grey[5] },
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.truckCell}>
          <View style={styles.truckIconContainer}>
            <View
              style={[
                styles.truckIconBg,
                { backgroundColor: isDark ? colors.dark.card : colors.grey[10] },
              ]}
            >
              <Icon name="truck" size={ms(18)} color={STATUS_COLORS[item.status]} />
              <View
                style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS[item.status] }]}
              />
            </View>
            <Text
              variant="captionSmall"
              style={[styles.truckNumber, { color: themeColors.text.primary }]}
            >
              {item.truckCode}
            </Text>
          </View>
        </View>
        <View style={styles.ticketCell}>
          <Text variant="caption" style={{ color: themeColors.text.primary }}>
            {item.ticketCode || '-'}
          </Text>
        </View>
        <View style={styles.coordCell}>
          <Text variant="caption" style={{ color: themeColors.text.primary }}>
            {item.latitude?.toFixed(4) || '-'}
          </Text>
        </View>
        <View style={styles.coordCell}>
          <Text variant="caption" style={{ color: themeColors.text.primary }}>
            {item.longitude?.toFixed(4) || '-'}
          </Text>
        </View>
        <View style={styles.updateCell}>
          <Text variant="caption" style={{ color: themeColors.text.secondary }}>
            {item.timestampDisplay || '-'}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [isDark, themeColors]
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
      />

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={isDark ? MAP_STYLES.dark : MAP_STYLES.light}
          logoEnabled={false}
          attributionEnabled={false}
          onPress={handleMapPress}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: getMapCenter,
              zoomLevel: 10,
            }}
          />

          {/* Route Line between Plant and Job locations (real directions) - only show when toggle is ON */}
          {showDirections && routeGeoJSON && (
            <Mapbox.ShapeSource id="routeLine" shape={routeGeoJSON}>
              {/* Route outline (darker/wider for visibility) */}
              <Mapbox.LineLayer
                id="routeLineOutline"
                style={{
                  lineColor: colors.primary.dark,
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Main route line */}
              <Mapbox.LineLayer
                id="routeLineLayer"
                style={{
                  lineColor: colors.primary.main,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {/* Truck Markers */}
          {filteredTrucks.map((truck) => (
            <Mapbox.MarkerView
              key={truck.id}
              coordinate={[truck.longitude, truck.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <TouchableOpacity style={styles.markerContainer}>
                <View style={[styles.marker, { backgroundColor: STATUS_COLORS[truck.status] }]}>
                  <Icon name="truck" size={ms(14)} color={colors.common.white} />
                </View>
                <View style={[styles.markerArrow, { borderTopColor: STATUS_COLORS[truck.status] }]} />
                <View style={[styles.markerLabel, { backgroundColor: themeColors.card }]}>
                  <Text variant="captionSmall" style={{ color: themeColors.text.primary }}>
                    {truck.truckCode}
                  </Text>
                </View>
              </TouchableOpacity>
            </Mapbox.MarkerView>
          ))}

          {/* Highlighted Truck Marker (from TicketDetailScreen navigation) */}
          {highlightedTruck && (
            <Mapbox.MarkerView
              key="highlighted-truck"
              coordinate={[highlightedTruck.longitude, highlightedTruck.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <TouchableOpacity style={styles.markerContainer}>
                {/* Pulse animation ring */}
                <View style={styles.highlightedMarkerPulse} />
                {/* Main marker */}
                <View style={styles.highlightedMarker}>
                  <Icon name="truck-delivery" size={ms(20)} color={colors.common.white} />
                </View>
                <View style={styles.highlightedMarkerArrow} />
                {/* Info label */}
                <View style={[styles.highlightedMarkerLabel, { backgroundColor: themeColors.card }]}>
                  <Text variant="captionSmall" style={[styles.highlightedMarkerText, { color: colors.primary.main }]}>
                    {highlightedTruck.truckCode}
                  </Text>
                  {highlightedTruck.driverName && (
                    <Text variant="captionSmall" style={{ color: themeColors.text.secondary }}>
                      {highlightedTruck.driverName}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </Mapbox.MarkerView>
          )}

          {/* Plant Location Marker (plant_location from API) - Blue truck icon */}
          {plantLocation && (
            <Mapbox.MarkerView
              key="plant-location"
              coordinate={[plantLocation.longitude, plantLocation.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerContainer}>
                {/* Main marker - Blue circle with truck */}
                <View style={styles.plantMarker}>
                  <Icon name="truck" size={ms(18)} color={colors.common.white} />
                </View>
                <View style={styles.plantMarkerArrow} />
                {/* Dark label showing plant name */}
                <View style={styles.plantMarkerLabel}>
                  <Text variant="captionSmall" style={styles.plantMarkerText} numberOfLines={1}>
                    {plantLocation.plantName || 'Plant Location'}
                  </Text>
                </View>
              </View>
            </Mapbox.MarkerView>
          )}

          {/* Job Site Marker (order_location from API) - Red pin icon */}
          {jobLocation && (
            <Mapbox.MarkerView
              key="job-location"
              coordinate={[jobLocation.longitude, jobLocation.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerContainer}>
                {/* Main marker - Red/coral circle with pin */}
                <View style={styles.jobSiteMarker}>
                  <View style={styles.jobSiteMarkerInner}>
                    <Icon name="map-marker" size={ms(16)} color={colors.error.main} />
                  </View>
                </View>
                <View style={styles.jobSiteMarkerArrow} />
                {/* Dark label showing "Job Site" */}
                <View style={styles.jobSiteMarkerLabel}>
                  <Text variant="captionSmall" style={styles.jobSiteMarkerText}>
                    Job Site
                  </Text>
                </View>
              </View>
            </Mapbox.MarkerView>
          )}
        </Mapbox.MapView>

        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.card }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={ms(24)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <View style={[styles.headerTitle, { backgroundColor: themeColors.card }]}>
            <Icon name="map-marker-radius" size={iconSizes.md} color={colors.primary.main} />
            <Text variant="h4" style={{ marginLeft: spacing.xs }}>
              Live Tracking
            </Text>
            <View style={styles.truckCountBadge}>
              <Text variant="caption" style={{ color: colors.primary.main }}>
                {filteredTrucks.length}
              </Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Directions Toggle - only show when coming from Ticket Details (has plant and job locations) */}
        {plantLocation && jobLocation && (
          <View style={[styles.directionsToggleContainer, { backgroundColor: themeColors.card }]}>
            <Icon name="directions" size={ms(18)} color={showDirections ? colors.primary.main : themeColors.text.secondary} />
            <Text variant="bodySmall" style={{ marginLeft: spacing.xs, color: themeColors.text.primary }}>
              Show Directions
            </Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: showDirections ? colors.primary.main : colors.grey[25] }
              ]}
              onPress={handleDirectionsToggle}
              activeOpacity={0.8}
            >
              <View style={[
                styles.toggleKnob,
                {
                  backgroundColor: colors.common.white,
                  transform: [{ translateX: showDirections ? ms(16) : ms(2) }]
                }
              ]} />
            </TouchableOpacity>
            {/* Google Maps button - show when directions are ON */}
            {showDirections && (
              <TouchableOpacity
                style={styles.googleMapsButton}
                onPress={openGoogleMapsDirections}
                activeOpacity={0.7}
              >
                <Icon name="google-maps" size={ms(18)} color={colors.common.white} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.mapControlButton, { backgroundColor: themeColors.card }]}
            onPress={() => {
              cameraRef.current?.setCamera({
                centerCoordinate: getMapCenter,
                zoomLevel: 10,
                animationDuration: 500,
              });
            }}
          >
            <Icon name="crosshairs-gps" size={ms(18)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapControlButton, { backgroundColor: themeColors.card }]}
            onPress={() => cameraRef.current?.zoomTo(12, 300)}
          >
            <Icon name="plus" size={ms(18)} color={themeColors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapControlButton, { backgroundColor: themeColors.card }]}
            onPress={() => cameraRef.current?.zoomTo(8, 300)}
          >
            <Icon name="minus" size={ms(18)} color={themeColors.text.primary} />
          </TouchableOpacity>
          {/* Fit to Route Button */}
          {routeBounds && (
            <TouchableOpacity
              style={[styles.mapControlButton, { backgroundColor: themeColors.card }]}
              onPress={() => {
                cameraRef.current?.fitBounds(
                  routeBounds.ne,
                  routeBounds.sw,
                  [80, 80, 200, 80],
                  1000
                );
              }}
            >
              <Icon name="fit-to-screen" size={ms(18)} color={themeColors.text.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Route Info Card - shows distance and ETA */}
        {(distanceFormatted || durationFormatted || isRouteLoading) && (
          <View style={[styles.routeInfoCard, { backgroundColor: themeColors.card }]}>
            {isRouteLoading ? (
              <View style={styles.routeInfoLoading}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text variant="caption" style={{ color: themeColors.text.secondary, marginLeft: spacing.xs }}>
                  Calculating route...
                </Text>
              </View>
            ) : (
              <View style={styles.routeInfoContent}>
                <View style={styles.routeInfoItem}>
                  <Icon name="map-marker-distance" size={ms(16)} color={colors.primary.main} />
                  <Text variant="bodySmall" style={[styles.routeInfoText, { color: themeColors.text.primary }]}>
                    {distanceFormatted || '--'}
                  </Text>
                </View>
                <View style={styles.routeInfoDivider} />
                <View style={styles.routeInfoItem}>
                  <Icon name="clock-outline" size={ms(16)} color={colors.info.main} />
                  <Text variant="bodySmall" style={[styles.routeInfoText, { color: themeColors.text.primary }]}>
                    {durationFormatted || '--'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Route Error Message */}
        {isRouteError && routeErrorMessage && (
          <View style={[styles.routeErrorCard, { backgroundColor: colors.error.light }]}>
            <Icon name="alert-circle-outline" size={ms(16)} color={colors.error.main} />
            <Text variant="caption" style={{ color: colors.error.main, marginLeft: spacing.xs, flex: 1 }}>
              {routeErrorMessage}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: bottomSheetHeight,
            backgroundColor: themeColors.card,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer} {...panResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
          <Icon name="drag-horizontal" size={ms(18)} color={themeColors.text.hint} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View
            style={[styles.searchInputContainer, { backgroundColor: themeColors.background }]}
          >
            <Icon name="magnify" size={ms(18)} color={themeColors.text.hint} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.text.primary }]}
              placeholder="Search truck, ticket..."
              placeholderTextColor={themeColors.text.hint}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={ms(18)} color={themeColors.text.hint} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: themeColors.background }]}
            onPress={openFilterModal}
          >
            <Icon name="tune-variant" size={ms(20)} color={themeColors.text.primary} />
            {hasActiveFilters && <View style={styles.filterButtonBadge} />}
          </TouchableOpacity>
        </View>

        {/* Results Summary */}
        <View style={styles.resultsSummary}>
          <Text variant="bodySmall" style={{ fontWeight: '600', color: themeColors.text.primary }}>
            {filteredTrucks.length} trucks found
          </Text>
        </View>

        {/* Table */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <TruckLoader size={80} message="Loading..." />
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            <TableHeader isDark={isDark} />
            <FlatList
              data={filteredTrucks}
              renderItem={renderTruckItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.tableContent}
              contentContainerStyle={[
                styles.tableContentContainer,
                { paddingBottom: insets.bottom + spacing.xl + spacing.lg },
              ]}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary.main}
                  colors={[colors.primary.main, colors.secondary.main]}
                  progressBackgroundColor={isDark ? themeColors.cardElevated : colors.common.white}
                />
              }
              ListEmptyComponent={
                !isLoading ? (
                  <EmptyViewWithPreset
                    preset="trucks"
                    compact
                  />
                ) : null
              }
              ListFooterComponent={renderListFooter}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
            />
          </View>
        )}
      </Animated.View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeFilterModal}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop - tap to close */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeFilterModal}
          />

          {/* Modal Content - positioned at bottom */}
          <View style={[styles.filterModalContent, { backgroundColor: themeColors.card }]}>
            {/* Handle */}
            <View style={[styles.modalHandle, { backgroundColor: themeColors.border }]} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text variant="h4">Filters</Text>
              <View style={styles.modalHeaderRight}>
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text variant="bodySmall" style={{ color: colors.primary.main }}>
                    Clear All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: themeColors.background }]}
                  onPress={closeFilterModal}
                >
                  <Icon name="close" size={ms(18)} color={themeColors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: spacing.sm }}>
                Status
              </Text>
              <View style={styles.filterOptionsGrid}>
                {statusFilterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      { backgroundColor: themeColors.background },
                      tempStatus === option.value && styles.filterOptionActive,
                    ]}
                    onPress={() => setTempStatus(option.value)}
                  >
                    <View style={[styles.optionDot, { backgroundColor: option.color }]} />
                    <Text
                      variant="caption"
                      style={[
                        { color: themeColors.text.secondary },
                        tempStatus === option.value && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text variant="body" style={{ color: colors.common.white, fontWeight: '600' }}>
                Apply Filters
              </Text>
            </TouchableOpacity>

            {/* Safe Area Spacer - fills bottom safe area with same background */}
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
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.common.white,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  markerLabel: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
    marginTop: ms(2),
  },
  // Highlighted truck marker styles (from TicketDetailScreen)
  highlightedMarkerPulse: {
    position: 'absolute',
    top: -ms(8),
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: colors.primary.main + '30',
    borderWidth: 2,
    borderColor: colors.primary.main + '50',
  },
  highlightedMarker: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    borderWidth: 3,
    borderColor: colors.common.white,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  highlightedMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary.main,
    marginTop: -2,
  },
  highlightedMarkerLabel: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(8),
    marginTop: ms(4),
    borderWidth: 1,
    borderColor: colors.primary.main + '30',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  highlightedMarkerText: {
    fontWeight: '700',
  },
  // Plant location marker styles (blue truck icon)
  plantMarker: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.info.main,
    borderWidth: 3,
    borderColor: colors.common.white,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  plantMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.info.main,
    marginTop: -2,
  },
  plantMarkerLabel: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(6),
    marginTop: ms(4),
    backgroundColor: colors.grey[80],
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    maxWidth: ms(160),
  },
  plantMarkerText: {
    fontWeight: '600',
    color: colors.common.white,
    fontSize: ms(11),
  },
  // Job site marker styles (red pin icon)
  jobSiteMarker: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.mapMarker.jobSite,
    borderWidth: 3,
    borderColor: colors.common.white,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  jobSiteMarkerInner: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.common.white,
  },
  jobSiteMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.mapMarker.jobSite,
    marginTop: -2,
  },
  jobSiteMarkerLabel: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(6),
    marginTop: ms(4),
    backgroundColor: colors.grey[80],
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
  },
  jobSiteMarkerText: {
    fontWeight: '600',
    color: colors.common.white,
    fontSize: ms(11),
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  directionsToggleContainer: {
    position: 'absolute',
    top: ms(100),
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(12),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    width: ms(36),
    height: ms(20),
    borderRadius: ms(10),
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: ms(16),
    height: ms(16),
    borderRadius: ms(8),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  googleMapsButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    backgroundColor: colors.success.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(12),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  truckCountBadge: {
    marginLeft: 'auto',
    backgroundColor: `${colors.primary.main}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: ms(8),
  },
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    top: height * 0.15,
    gap: spacing.xs,
  },
  mapControlButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Route Info Card Styles
  routeInfoCard: {
    position: 'absolute',
    left: spacing.md,
    top: height * 0.15,
    borderRadius: ms(12),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    minWidth: ms(140),
  },
  routeInfoLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeInfoText: {
    fontWeight: '600',
  },
  routeInfoDivider: {
    width: 1,
    height: ms(16),
    backgroundColor: colors.grey[25],
    marginHorizontal: spacing.sm,
  },
  routeErrorCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: height * 0.15,
    borderRadius: ms(8),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingHorizontal: spacing.md,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: ms(12),
    paddingHorizontal: spacing.sm,
    height: ms(44),
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: ms(14),
    paddingVertical: 0,
  },
  filterButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonBadge: {
    position: 'absolute',
    top: ms(8),
    right: ms(8),
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.primary.main,
  },
  resultsSummary: {
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  tableWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  tableContent: {
    flex: 1,
    width: '100%',
  },
  tableContentContainer: {
    alignItems: 'center',
    flexGrow: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  truckCell: {
    width: ms(60),
    alignItems: 'center',
  },
  ticketCell: {
    width: ms(70),
    alignItems: 'center',
  },
  coordCell: {
    flex: 1,
    alignItems: 'center',
  },
  updateCell: {
    width: ms(60),
    alignItems: 'center',
  },
  truckIconContainer: {
    alignItems: 'center',
  },
  truckIconBg: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(8),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusIndicator: {
    position: 'absolute',
    top: ms(2),
    right: ms(2),
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    borderWidth: 1,
    borderColor: colors.common.white,
  },
  truckNumber: {
    marginTop: ms(2),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  listFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.medium,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  filterModalContent: {
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalHandle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modalCloseButton: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(20),
    gap: spacing.xs,
  },
  filterOptionActive: {
    backgroundColor: `${colors.primary.main}20`,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  filterOptionTextActive: {
    color: colors.primary.dark,
  },
  optionDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  applyButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: ms(25),
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});

export default MapTrackingScreen;
