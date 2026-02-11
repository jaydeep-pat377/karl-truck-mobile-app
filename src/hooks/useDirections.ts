

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

  route: DirectionsResult | null;
  coordinates: [number, number][] | null;
  routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null;


  distance: number | null;
  duration: number | null;
  distanceFormatted: string | null;
  durationFormatted: string | null;
  summary: string | null;


  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;


  error: DirectionsError | null;
  errorCode: DirectionsErrorCode | null;
  errorMessage: string | null;


  refetch: () => void;
}

const isValidCoordinate = (coord: Coordinate | null): coord is Coordinate => {
  if (!coord) return false;
  if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') return false;
  if (isNaN(coord.latitude) || isNaN(coord.longitude)) return false;
  if (coord.latitude < -90 || coord.latitude > 90) return false;
  if (coord.longitude < -180 || coord.longitude > 180) return false;
  return true;
};

export const useDirections = ({
  origin,
  destination,
  options = {},
  enabled = true,
}: UseDirectionsParams): UseDirectionsReturn => {

  const hasValidOrigin = isValidCoordinate(origin);
  const hasValidDestination = isValidCoordinate(destination);
  const canFetch = enabled && hasValidOrigin && hasValidDestination;


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


  const query = useQuery<DirectionsResult, DirectionsError>({
    queryKey,
    queryFn: () => getDirectionsWithRetry(origin!, destination!, options),
    enabled: canFetch,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });


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

    route: query.data || null,
    coordinates: query.data?.coordinates || null,
    routeGeoJSON,


    distance: query.data?.totalDistance || null,
    duration: query.data?.totalDuration || null,
    distanceFormatted: query.data?.distanceFormatted || null,
    durationFormatted: query.data?.durationFormatted || null,
    summary: query.data?.summary || null,


    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,


    error: query.error || null,
    errorCode: errorInfo.code,
    errorMessage: errorInfo.message,


    refetch: query.refetch,
  };
};

export default useDirections;
