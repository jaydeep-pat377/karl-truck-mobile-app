/**
 * useDirections Hook
 * Fetches and manages route directions between two coordinates
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getDirectionsWithRetry,
  Coordinate,
  DirectionsOptions,
  DirectionsResult,
  DirectionsError,
  DirectionsErrorCode,
} from '../services/directionsService';

export interface UseDirectionsParams {
  origin: Coordinate | null;
  destination: Coordinate | null;
  options?: DirectionsOptions;
  enabled?: boolean;
}

export interface UseDirectionsReturn {
  // Route data
  route: DirectionsResult | null;
  coordinates: [number, number][] | null;
  routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null;

  // Route info
  distance: number | null;
  duration: number | null;
  distanceFormatted: string | null;
  durationFormatted: string | null;
  summary: string | null;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;

  // Error handling
  error: DirectionsError | null;
  errorCode: DirectionsErrorCode | null;
  errorMessage: string | null;

  // Actions
  refetch: () => void;
}

/**
 * Validates if a coordinate is valid
 */
const isValidCoordinate = (coord: Coordinate | null): coord is Coordinate => {
  if (!coord) return false;
  if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') return false;
  if (isNaN(coord.latitude) || isNaN(coord.longitude)) return false;
  if (coord.latitude < -90 || coord.latitude > 90) return false;
  if (coord.longitude < -180 || coord.longitude > 180) return false;
  return true;
};

/**
 * Hook to fetch route directions between two coordinates
 */
export const useDirections = ({
  origin,
  destination,
  options = {},
  enabled = true,
}: UseDirectionsParams): UseDirectionsReturn => {
  // Validate coordinates
  const hasValidOrigin = isValidCoordinate(origin);
  const hasValidDestination = isValidCoordinate(destination);
  const canFetch = enabled && hasValidOrigin && hasValidDestination;

  // Create stable query key
  const queryKey = useMemo(
    () => [
      'directions',
      origin?.latitude,
      origin?.longitude,
      destination?.latitude,
      destination?.longitude,
      options.profile || 'driving-traffic',
    ],
    [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, options.profile]
  );

  // Fetch directions
  const query = useQuery<DirectionsResult, DirectionsError>({
    queryKey,
    queryFn: () => getDirectionsWithRetry(origin!, destination!, options),
    enabled: canFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes - routes don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: false, // We handle retries in the service
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Build GeoJSON for the route line
  const routeGeoJSON = useMemo(() => {
    if (!query.data?.coordinates || query.data.coordinates.length < 2) {
      return null;
    }

    return {
      type: 'Feature' as const,
      properties: {
        distance: query.data.totalDistance,
        duration: query.data.totalDuration,
        summary: query.data.summary,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: query.data.coordinates,
      },
    };
  }, [query.data]);

  // Extract error info
  const errorInfo = useMemo(() => {
    if (!query.error) {
      return { code: null, message: null };
    }

    if (query.error instanceof DirectionsError) {
      return {
        code: query.error.code,
        message: query.error.message,
      };
    }

    return {
      code: 'API_ERROR' as DirectionsErrorCode,
      message: 'Failed to fetch directions',
    };
  }, [query.error]);

  return {
    // Route data
    route: query.data || null,
    coordinates: query.data?.coordinates || null,
    routeGeoJSON,

    // Route info
    distance: query.data?.totalDistance || null,
    duration: query.data?.totalDuration || null,
    distanceFormatted: query.data?.distanceFormatted || null,
    durationFormatted: query.data?.durationFormatted || null,
    summary: query.data?.summary || null,

    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,

    // Error handling
    error: query.error || null,
    errorCode: errorInfo.code,
    errorMessage: errorInfo.message,

    // Actions
    refetch: query.refetch,
  };
};

export default useDirections;
