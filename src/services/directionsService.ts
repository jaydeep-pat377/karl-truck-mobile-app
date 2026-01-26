/**
 * Mapbox Directions Service
 * Fetches the shortest route between two coordinates using Mapbox Directions API
 */

// Mapbox access token (same as used in MapTrackingScreen)
const MAPBOX_ACCESS_TOKEN = 'MAPBOX_TOKEN_REMOVED';

// API Base URL
const MAPBOX_DIRECTIONS_API = 'https://api.mapbox.com/directions/v5/mapbox';

// Route profile types
export type RouteProfile = 'driving-traffic' | 'driving' | 'walking' | 'cycling';

// Coordinate type
export interface Coordinate {
  latitude: number;
  longitude: number;
}

// Route step from API
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

// Route leg from API
export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

// Route from API
export interface Route {
  distance: number; // Total distance in meters
  duration: number; // Total duration in seconds
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // Array of [longitude, latitude]
  };
  legs: RouteLeg[];
  weight: number;
  weight_name: string;
}

// API Response
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

// Error types
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

// Request options
export interface DirectionsOptions {
  profile?: RouteProfile;
  alternatives?: boolean; // Return alternative routes
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  overview?: 'full' | 'simplified' | 'false';
  steps?: boolean; // Include turn-by-turn instructions
  annotations?: ('distance' | 'duration' | 'speed')[];
}

// Formatted route result
export interface DirectionsResult {
  route: Route;
  coordinates: [number, number][]; // Decoded route coordinates for polyline
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  distanceFormatted: string; // e.g., "5.2 mi"
  durationFormatted: string; // e.g., "12 min"
  summary: string; // Route summary (main roads)
}

/**
 * Validates coordinates
 */
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

/**
 * Formats distance in meters to human-readable format
 */
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

/**
 * Formats duration in seconds to human-readable format
 */
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

/**
 * Fetches directions between two coordinates
 */
export const getDirections = async (
  origin: Coordinate,
  destination: Coordinate,
  options: DirectionsOptions = {}
): Promise<DirectionsResult> => {
  // Validate coordinates
  validateCoordinate(origin, 'Origin');
  validateCoordinate(destination, 'Destination');

  // Check if origin and destination are the same
  if (
    Math.abs(origin.latitude - destination.latitude) < 0.0001 &&
    Math.abs(origin.longitude - destination.longitude) < 0.0001
  ) {
    throw new DirectionsError('INVALID_COORDINATES', 'Origin and destination are too close together');
  }

  // Build request URL
  const {
    profile = 'driving-traffic',
    alternatives = false,
    geometries = 'geojson',
    overview = 'full',
    steps = false,
    annotations = [],
  } = options;

  // Format coordinates: longitude,latitude;longitude,latitude
  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

  // Build query parameters
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

    // Handle rate limiting
    if (response.status === 429) {
      throw new DirectionsError('RATE_LIMITED', 'Too many requests. Please try again later.');
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Directions API] HTTP Error:', response.status, errorText);
      throw new DirectionsError('API_ERROR', `API returned status ${response.status}`);
    }

    const data: DirectionsResponse = await response.json();

    // Check API response code
    if (data.code !== 'Ok') {
      if (data.code === 'NoRoute') {
        throw new DirectionsError('NO_ROUTE_FOUND', 'No route found between the specified locations');
      }
      if (data.code === 'NoSegment') {
        throw new DirectionsError('NO_ROUTE_FOUND', 'Could not find a road near one of the locations');
      }
      throw new DirectionsError('API_ERROR', `API error: ${data.code}`);
    }

    // Check if routes exist
    if (!data.routes || data.routes.length === 0) {
      throw new DirectionsError('NO_ROUTE_FOUND', 'No routes returned from API');
    }

    // Get the first (shortest) route
    const route = data.routes[0];

    // Extract coordinates from geometry
    const routeCoordinates = route.geometry.coordinates;

    // Build summary from legs
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
    // Re-throw DirectionsError as-is
    if (error instanceof DirectionsError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network')) {
      throw new DirectionsError('NETWORK_ERROR', 'Network error. Please check your internet connection.');
    }

    // Handle other errors
    console.error('[Directions API] Unexpected error:', error);
    throw new DirectionsError('API_ERROR', 'Failed to fetch directions');
  }
};

/**
 * Fetches directions with retry logic
 */
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

      // Don't retry for certain error types
      if (error instanceof DirectionsError) {
        if (
          error.code === 'INVALID_COORDINATES' ||
          error.code === 'NO_ROUTE_FOUND'
        ) {
          throw error;
        }
      }

      // Wait before retry (exponential backoff)
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
