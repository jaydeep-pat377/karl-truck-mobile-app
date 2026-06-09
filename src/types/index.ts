

export * from './order';
export * from './user';
export * from './weather';
export * from './notification';
export * from './ticket';

// Disambiguate names exported by more than one module above. An explicit
// re-export overrides the `export *` ambiguity (TS2308). Both resolve to the
// ./order definitions, which is what existing barrel consumers were already
// using (./weather and ./ticket re-declare the same names with different shapes
// and should be imported directly from those modules when needed).
export type { WeatherCondition } from './order';
export type { PlantDetails } from './order';
