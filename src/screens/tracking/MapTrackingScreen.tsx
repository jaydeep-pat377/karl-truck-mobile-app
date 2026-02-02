import React, { useRef, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { spacing, ms, iconSizes } from '../../utils/responsive';
import { useTrucks, useDirections } from '../../hooks';

// Initialize Mapbox with access token
Mapbox.setAccessToken('MAPBOX_TOKEN_REMOVED');

const { height } = Dimensions.get('window');

// Mapbox style URLs
const MAP_STYLES = {
  light: Mapbox.StyleURL.Street,
  dark: Mapbox.StyleURL.Dark,
};

// Helper to get today's date range (default)
const getDateRange = (): { dateFrom: string; dateTo: string } => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
  return { dateFrom: formatDate(today), dateTo: formatDate(today) };
};

const STATUS_COLORS: Record<string, string> = {
  delivered: colors.success.main,
  pouring: colors.info.main,
  on_job: colors.warning.main,
  at_plant: colors.grey[60],
  loaded: colors.secondary.main,
  to_job: colors.primary.main,
  idle: colors.grey[50],
};

type MapTrackingRouteProp = RouteProp<RootStackParamList, 'MapTracking'>;

export const MapTrackingScreen: React.FC = () => {
  const { isDark } = useTheme();
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

  // Calculate date range (always today)
  const dateRange = useMemo(() => getDateRange(), []);

  // Fetch trucks from API
  const { trucks } = useTrucks({
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  // Calculate map center - prioritize params from navigation
  const getMapCenter = useMemo((): [number, number] => {
    // If coordinates are passed from TicketDetailScreen, use them
    if (paramLatitude && paramLongitude) {
      return [parseFloat(paramLongitude), parseFloat(paramLatitude)];
    }

    if (trucks.length === 0) return [-98.6698, 35.5306];

    const lats = trucks.map((item) => item.latitude);
    const longs = trucks.map((item) => item.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLong = Math.min(...longs);
    const maxLong = Math.max(...longs);

    return [(minLong + maxLong) / 2, (minLat + maxLat) / 2];
  }, [trucks, paramLatitude, paramLongitude]);

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
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: getMapCenter,
              zoomLevel: 10,
            }}
          />

          {/* Route Line between Plant and Job locations (real directions) */}
          {routeGeoJSON && (
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
          {trucks.map((truck) => (
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
                {trucks.length}
              </Text>
            </View>
          </View>
        </SafeAreaView>

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
});

export default MapTrackingScreen;
