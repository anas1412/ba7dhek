export type Point = { latitude: number; longitude: number };

// The same rough box the backend uses to keep points inside Tunisia.
export const TUNISIA = { west: 7.4, south: 30.1, east: 11.7, north: 37.7 };

export function inTunisia(point: Point): boolean {
  return (
    point.latitude >= TUNISIA.south &&
    point.latitude <= TUNISIA.north &&
    point.longitude >= TUNISIA.west &&
    point.longitude <= TUNISIA.east
  );
}

/** Central Hammamet, the pilot city: where a map opens when no point has been set yet. */
export const HAMMAMET: Point = { latitude: 36.4, longitude: 10.6167 };

/** The map drawing: OpenFreeMap's "liberty" style, built on OpenStreetMap data. No key, no account. */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Close enough to tell one building from the next. */
export const STREET_ZOOM = 15.5;
