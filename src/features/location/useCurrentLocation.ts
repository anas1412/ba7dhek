import * as Location from 'expo-location';
import { useState } from 'react';

import { inTunisia, type Point } from './geo';

export type LocationProblem = 'denied' | 'failed' | 'outsideTunisia';

/**
 * Reads the phone's position once, when asked. The app never tracks movement
 * and never asks for background location.
 */
export function useCurrentLocation() {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<LocationProblem | null>(null);

  /** Resolves to the position, or to null with `problem` saying why not. */
  async function locate(): Promise<Point | null> {
    setBusy(true);
    setProblem(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setProblem('denied');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      if (!inTunisia(point)) {
        setProblem('outsideTunisia');
        return null;
      }
      return point;
    } catch {
      setProblem('failed');
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { busy, problem, locate, clearProblem: () => setProblem(null) };
}
