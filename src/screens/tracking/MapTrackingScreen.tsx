import React, { useRef, useMemo, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Image,
  Switch,
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
import { truckImagesByStatus } from '../../assets/images';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MAPBOX_ACCESS_TOKEN } from '@env';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { height } = Dimensions.get('window');

const MAP_STYLES = {
  light: Mapbox.StyleURL.Street,
  dark: Mapbox.StyleURL.Dark,
};

const getDateRange = (): { dateFrom: string; dateTo: string } => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
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
  const [showRoute, setShowRoute] = useState(false);

  const {
    latitude: paramLatitude,
    longitude: paramLongitude,
    truckCode: paramTruckCode,
    ticketCode: paramTicketCode,
    driverName: paramDriverName,
    destination: paramDestination,
    orderCode: paramOrderCode,
    customerName: paramCustomerName,

    plantLatitude: paramPlantLatitude,
    plantLongitude: paramPlantLongitude,
    plantName: paramPlantName,

    jobLatitude: paramJobLatitude,
    jobLongitude: paramJobLongitude,
  } = route.params || {};

  const dateRange = useMemo(() => getDateRange(), []);

  const { trucks } = useTrucks({
    pageSize: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const getMapCenter = useMemo((): [number, number] => {

    if (paramLatitude && paramLongitude) {
      return [parseFloat(paramLongitude), parseFloat(paramLatitude)];
    }

    if (paramJobLatitude && paramJobLongitude) {
      return [parseFloat(paramJobLongitude), parseFloat(paramJobLatitude)];
    }

    if (paramPlantLatitude && paramPlantLongitude) {
      return [parseFloat(paramPlantLongitude), parseFloat(paramPlantLatitude)];
    }

    if (trucks.length === 0) return [-98.6698, 35.5306];

    const lats = trucks.map((item) => item.latitude);
    const longs = trucks.map((item) => item.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLong = Math.min(...longs);
    const maxLong = Math.max(...longs);

    return [(minLong + maxLong) / 2, (minLat + maxLat) / 2];
  }, [trucks, paramLatitude, paramLongitude, paramJobLatitude, paramJobLongitude, paramPlantLatitude, paramPlantLongitude]);

  useEffect(() => {
    if (cameraRef.current) {

      if (paramLatitude && paramLongitude) {
        cameraRef.current.setCamera({
          centerCoordinate: [parseFloat(paramLongitude), parseFloat(paramLatitude)],
          zoomLevel: 14,
          animationDuration: 1000,
        });
      }

      else if (paramJobLatitude && paramJobLongitude) {
        cameraRef.current.setCamera({
          centerCoordinate: [parseFloat(paramJobLongitude), parseFloat(paramJobLatitude)],
          zoomLevel: 12,
          animationDuration: 1000,
        });
      }
    }
  }, [paramLatitude, paramLongitude, paramJobLatitude, paramJobLongitude]);

  const highlightedTruck = useMemo(() => {
    if (!paramLatitude || !paramLongitude) return null;

    const lat = parseFloat(paramLatitude);
    const lng = parseFloat(paramLongitude);

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

  const plantLocation = useMemo(() => {
    if (!paramPlantLatitude || !paramPlantLongitude) return null;

    const lat = parseFloat(paramPlantLatitude);
    const lng = parseFloat(paramPlantLongitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
      plantName: paramPlantName,
    };
  }, [paramPlantLatitude, paramPlantLongitude, paramPlantName]);

  const jobLocation = useMemo(() => {
    if (!paramJobLatitude || !paramJobLongitude) return null;

    const lat = parseFloat(paramJobLatitude);
    const lng = parseFloat(paramJobLongitude);

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
      profile: 'driving-traffic',
      overview: 'full',
    },
    enabled: showRoute && !!plantLocation && !!jobLocation,
  });

  const fallbackRouteGeoJSON = useMemo(() => {
    if (!plantLocation || !jobLocation) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [plantLocation.longitude, plantLocation.latitude],
          [jobLocation.longitude, jobLocation.latitude],
        ],
      },
    };
  }, [plantLocation, jobLocation]);

  const displayRouteGeoJSON = routeGeoJSON || fallbackRouteGeoJSON;

  const routeBounds = useMemo(() => {
    if (!plantLocation || !jobLocation) return null;

    const padding = 0.01;
    const minLng = Math.min(plantLocation.longitude, jobLocation.longitude) - padding;
    const maxLng = Math.max(plantLocation.longitude, jobLocation.longitude) + padding;
    const minLat = Math.min(plantLocation.latitude, jobLocation.latitude) - padding;
    const maxLat = Math.max(plantLocation.latitude, jobLocation.latitude) + padding;

    return {
      ne: [maxLng, maxLat] as [number, number],
      sw: [minLng, minLat] as [number, number],
    };
  }, [plantLocation, jobLocation]);

  useEffect(() => {
    if (routeBounds && cameraRef.current) {

      const timer = setTimeout(() => {
        cameraRef.current?.fitBounds(
          routeBounds.ne,
          routeBounds.sw,
          [80, 80, 200, 80],
          1000
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
          {showRoute && displayRouteGeoJSON && (
            <Mapbox.ShapeSource id="routeLine" shape={displayRouteGeoJSON}>
              <Mapbox.LineLayer
                id="routeLineOutline"
                style={{
                  lineColor: colors.primary.dark,
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
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
          {trucks.map((truck) => {
            const truckImage = truckImagesByStatus[truck.status] || truckImagesByStatus.ticketed;
            return (
              <Mapbox.MarkerView
                key={truck.id}
                coordinate={[truck.longitude, truck.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Image
                  source={truckImage}
                  style={{ width: ms(70), height: ms(40) }}
                  resizeMode="contain"
                />
              </Mapbox.MarkerView>
            );
          })}
          {highlightedTruck && (
            <Mapbox.MarkerView
              key="highlighted-truck"
              coordinate={[highlightedTruck.longitude, highlightedTruck.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <TouchableOpacity style={styles.markerContainer}>
                <View style={styles.highlightedMarkerPulse} />
                <View style={styles.highlightedMarker}>
                  <Icon name="truck-delivery" size={ms(20)} color={colors.common.white} />
                </View>
                <View style={styles.highlightedMarkerArrow} />
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
          {plantLocation && (
            <Mapbox.MarkerView
              key="plant-location"
              coordinate={[plantLocation.longitude, plantLocation.latitude]}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.markerContainer}>
                <View style={styles.plantMarker}>
                  <Icon name="truck" size={ms(18)} color={colors.common.white} />
                </View>
                <View style={styles.plantMarkerArrow} />
                <View style={styles.plantMarkerLabel}>
                  <Text variant="captionSmall" style={styles.plantMarkerText} numberOfLines={1}>
                    {plantLocation.plantName || 'Plant Location'}
                  </Text>
                </View>
              </View>
            </Mapbox.MarkerView>
          )}
          {jobLocation && (
            <Mapbox.MarkerView
              key="job-location"
              coordinate={[jobLocation.longitude, jobLocation.latitude]}
              anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.markerContainer}>
                <View style={styles.jobSiteMarker}>
                  <Ionicons name="location-outline"
                   size={ms(22)}
                   color={colors.common.white} />
                </View>
                <View style={styles.jobSiteMarkerArrow} />
                <View style={styles.jobSiteMarkerLabel}>
                  <Text variant="captionSmall" style={styles.jobSiteMarkerText}>
                    Job Site
                  </Text>
                </View>
              </View>
            </Mapbox.MarkerView>
          )}
        </Mapbox.MapView>
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
        <View style={[styles.routeToggleContainer, { backgroundColor: themeColors.card }]}>
          <Icon
            name="directions"
            size={ms(16)}
            color={showRoute ? colors.primary.main : themeColors.text.hint}
          />
          <Text style={[
            styles.routeToggleText,
            { color: showRoute ? colors.primary.main : themeColors.text.hint }
          ]}>
            Route
          </Text>
          <Switch
            value={showRoute}
            onValueChange={setShowRoute}
            trackColor={{ false: colors.grey[40], true: colors.primary.light }}
            thumbColor={showRoute ? colors.primary.main : colors.grey[50]}
            ios_backgroundColor={colors.grey[40]}
          />
        </View>
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

  jobSiteMarker: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.trackingStatus.cancelled,
    borderWidth: 3,
    borderColor: colors.common.white,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  jobSiteMarkerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.trackingStatus.cancelled,
    marginTop: -3,
  },
  jobSiteMarkerLabel: {
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(4),
    marginTop: ms(4),
    backgroundColor: colors.semiTransparent.darkGray90,
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    alignItems: 'center',
  },
  jobSiteMarkerText: {
    fontWeight: '600',
    color: colors.common.white,
    fontSize: ms(10),
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
  routeToggleContainer: {
    position: 'absolute',
    left: spacing.md,
    top: height * 0.14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
    borderRadius: ms(20),
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    gap: ms(6),
    marginBottom: ms(12),
  },
  routeToggleText: {
    fontSize: ms(12),
    fontWeight: '600',
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
