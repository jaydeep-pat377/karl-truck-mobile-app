

const MAPBOX_ACCESS_TOKEN = 'MAPBOX_TOKEN_REMOVED';

const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox';

export type RouteProfile = 'driving-traffic' | 'driving' | 'walking' | 'cycling';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    instruction: string;
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

export interface Route {
  distance: number;
  duration: number;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
  weight: number;
  weight_name: string;
}

export interface DirectionsResponse {
  code: string;
  routes: Route[];
  waypoints: {
    name: string;
    location: [number, number];
    distance: number;
  }[];
  uuid: string;
}

export type DirectionsErrorCode =
  | 'INVALID_COORDINATES'
  | 'NO_ROUTE_FOUND'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED';

export class DirectionsError extends Error {
  code: DirectionsErrorCode;

  constructor(code: DirectionsErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'DirectionsError';
  }
}

export interface DirectionsOptions {
  profile?: RouteProfile;
  alternatives?: boolean;
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  overview?: 'full' | 'simplified' | 'false';
  steps?: boolean;
  annotations?: ('distance' | 'duration' | 'speed')[];
}

export interface DirectionsResult {
  route: Route;
  coordinates: [number, number][];
  totalDistance: number;
  totalDuration: number;
  distanceFormatted: string;
  durationFormatted: string;
  summary: string;
}

const validateCoordinate = (coord: Coordinate, name: string): void => {
  if (!coord) {
    throw new DirectionsError('INVALID_COORDINATES', `${name} coordinate is missing`);
  }
  if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
    throw new DirectionsError('INVALID_COORDINATES', `${name} coordinate values must be numbers`);
  }
  if (coord.latitude < -90 || coord.latitude > 90) {
    throw new DirectionsError('INVALID_COORDINATES', `${name} latitude must be between -90 and 90`);
  }
  if (coord.longitude < -180 || coord.longitude > 180) {
    throw new DirectionsError('INVALID_COORDINATES', `${name} longitude must be between -180 and 180`);
  }
  if (isNaN(coord.latitude) || isNaN(coord.longitude)) {
    throw new DirectionsError('INVALID_COORDINATES', `${name} coordinate contains NaN values`);
  }
};

const formatDistance = (meters: number): string => {
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
};

export const getDirections = async (
  origin: Coordinate,
  destination: Coordinate,
  options: DirectionsOptions = {}
): Promise<DirectionsResult> => {

  validateCoordinate(origin, 'Origin');
  validateCoordinate(destination, 'Destination');


  if (
    Math.abs(origin.latitude - destination.latitude) < 0.0001 &&
    Math.abs(origin.longitude - destination.longitude) < 0.0001
  ) {
    throw new DirectionsError('INVALID_COORDINATES', 'Origin and destination are too close together');
  }


  const {
    profile = 'driving-traffic',
    alternatives = false,
    geometries = 'geojson',
    overview = 'full',
    steps = false,
    annotations = [],
  } = options;


  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;


  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    geometries,
    overview,
    alternatives: alternatives.toString(),
    steps: steps.toString(),
  });

  if (annotations.length > 0) {
    params.append('annotations', annotations.join(','));
  }

  const url = `${MAPBOX_DIRECTIONS_API}/${profile}/${coordinates}?${params.toString()}`;

  try {
    const response = await fetch(url);


    if (response.status === 429) {
      throw new DirectionsError('RATE_LIMITED', 'Too many requests. Please try again later.');
    }


    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Directions API] HTTP Error:', response.status, errorText);
      throw new DirectionsError('API_ERROR', `API returned status ${response.status}`);
    }

    const data: DirectionsResponse = await response.json();


    if (data.code !== 'Ok') {
      if (data.code === 'NoRoute') {
        throw new DirectionsError('NO_ROUTE_FOUND', 'No route found between the specified locations');
      }
      if (data.code === 'NoSegment') {
        throw new DirectionsError('NO_ROUTE_FOUND', 'Could not find a road near one of the locations');
      }
      throw new DirectionsError('API_ERROR', `API error: ${data.code}`);
    }


    if (!data.routes || data.routes.length === 0) {
      throw new DirectionsError('NO_ROUTE_FOUND', 'No routes returned from API');
    }


    const route = data.routes[0];


    const routeCoordinates = route.geometry.coordinates;


    const summary = route.legs.map(leg => leg.summary).filter(Boolean).join(' → ') || 'Route';

    return {
      route,
      coordinates: routeCoordinates,
      totalDistance: route.distance,
      totalDuration: route.duration,
      distanceFormatted: formatDistance(route.distance),
      durationFormatted: formatDuration(route.duration),
      summary,
    };
  } catch (error) {

    if (error instanceof DirectionsError) {
      throw error;
    }


    if (error instanceof TypeError && error.message.includes('Network')) {
      throw new DirectionsError('NETWORK_ERROR', 'Network error. Please check your internet connection.');
    }


    console.error('[Directions API] Unexpected error:', error);
    throw new DirectionsError('API_ERROR', 'Failed to fetch directions');
  }
};

export const getDirectionsWithRetry = async (
  origin: Coordinate,
  destination: Coordinate,
  options: DirectionsOptions = {},
  maxRetries: number = 2
): Promise<DirectionsResult> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await getDirections(origin, destination, options);
    } catch (error) {
      lastError = error as Error;


      if (error instanceof DirectionsError) {
        if (
          error.code === 'INVALID_COORDINATES' ||
          error.code === 'NO_ROUTE_FOUND'
        ) {
          throw error;
        }
      }


      if (attempt < maxRetries) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
};

export default {
  getDirections,
  getDirectionsWithRetry,
};
