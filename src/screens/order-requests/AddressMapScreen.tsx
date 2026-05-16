import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, ScreenContainer, ScreenHeader } from '../../components/common';
import { colors } from '../../theme/colors';
import { ms } from '../../utils/responsive';
import { fontFamily } from '../../theme/typography';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import { OrderRequestsStackParamList } from '../../navigation/types';

if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

type ScreenRouteProp = RouteProp<OrderRequestsStackParamList, 'AddressMap'>;

const MAP_STYLES = {
  light: Mapbox.StyleURL.Street,
  dark: Mapbox.StyleURL.Dark,
  satellite: Mapbox.StyleURL.SatelliteStreet,
};

export const AddressMapScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const { address } = route.params;
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const cameraRef = useRef<Mapbox.Camera>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    const geocode = async () => {
      try {
        const encoded = encodeURIComponent(address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCoordinates([lng, lat]);
        } else {
          setError('Address not found on map');
        }
      } catch {
        setError('Failed to load map location');
      } finally {
        setIsLoading(false);
      }
    };
    geocode();
  }, [address]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 1, 20);
    setZoomLevel(newZoom);
    cameraRef.current?.setCamera({ zoomLevel: newZoom, animationDuration: 300 });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 1, 1);
    setZoomLevel(newZoom);
    cameraRef.current?.setCamera({ zoomLevel: newZoom, animationDuration: 300 });
  };

  const getMapStyle = () => {
    if (isSatellite) return MAP_STYLES.satellite;
    return isDark ? MAP_STYLES.dark : MAP_STYLES.light;
  };

  return (
    <ScreenContainer edges={[]}>
      <ScreenHeader title="Job Location" showBackButton />

      {/* Address bar */}
      <View style={[styles.addressBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <Icon name="map-marker" size={ms(18)} color={colors.primary.main} />
        <Text variant="bodySmall" style={[styles.addressText, { color: themeColors.text.primary }]} numberOfLines={2}>
          {address}
        </Text>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text variant="bodySmall" color="secondary" style={{ marginTop: ms(12) }}>
              Loading map...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Icon name="map-marker-off" size={ms(48)} color={themeColors.text.disabled} />
            <Text variant="body" color="secondary" style={{ marginTop: ms(12) }}>
              {error}
            </Text>
          </View>
        ) : coordinates ? (
          <>
            <Mapbox.MapView
              style={styles.map}
              styleURL={getMapStyle()}
              attributionEnabled={false}
              logoEnabled={false}
              scaleBarEnabled={false}
            >
              <Mapbox.Camera
                ref={cameraRef}
                centerCoordinate={coordinates}
                zoomLevel={zoomLevel}
                animationMode="flyTo"
                animationDuration={1000}
              />
              <Mapbox.PointAnnotation id="address-pin" coordinate={coordinates}>
                <View style={styles.pinContainer}>
                  <View style={styles.pin}>
                    <Icon name="map-marker" size={ms(24)} color={colors.common.white} />
                  </View>
                  <View style={styles.pinShadow} />
                </View>
              </Mapbox.PointAnnotation>
            </Mapbox.MapView>

            {/* Map controls */}
            <View style={styles.controlsContainer}>
              {/* Satellite toggle */}
              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  {
                    backgroundColor: isSatellite ? colors.primary.main : colors.common.white,
                  },
                ]}
                onPress={() => setIsSatellite(!isSatellite)}
                activeOpacity={0.7}
              >
                <Icon
                  name="satellite-variant"
                  size={ms(20)}
                  color={isSatellite ? colors.common.white : colors.grey[70]}
                />
              </TouchableOpacity>

              {/* Zoom controls */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.common.white }]}
                  onPress={handleZoomIn}
                  activeOpacity={0.7}
                >
                  <Icon name="plus" size={ms(22)} color={colors.grey[70]} />
                </TouchableOpacity>
                <View style={styles.zoomDivider} />
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.common.white }]}
                  onPress={handleZoomOut}
                  activeOpacity={0.7}
                >
                  <Icon name="minus" size={ms(22)} color={colors.grey[70]} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    marginHorizontal: ms(16),
    marginTop: ms(8),
    marginBottom: ms(8),
    borderRadius: ms(12),
    borderWidth: 1,
    gap: ms(10),
  },
  addressText: {
    flex: 1,
    fontFamily: fontFamily.medium,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: ms(16),
    marginBottom: ms(16),
    borderRadius: ms(16),
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinContainer: {
    alignItems: 'center',
  },
  pin: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinShadow: {
    width: ms(12),
    height: ms(6),
    borderRadius: ms(6),
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: ms(2),
  },
  controlsContainer: {
    position: 'absolute',
    right: ms(12),
    top: ms(12),
    gap: ms(10),
    alignItems: 'center',
  },
  controlBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  zoomControls: {
    borderRadius: ms(10),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: colors.grey[15],
  },
});

export default AddressMapScreen;
