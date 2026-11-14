import 'maplibre-gl/dist/maplibre-gl.css';

import { Map as WebMap, getVersion, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useImperativeHandle, useRef } from 'react';

import { MAP_STYLE_URL, STREET_ZOOM, TUNISIA } from './geo';
import type { MapViewProps } from './MapView.types';

/**
 * The library draws tiles in a background worker, loaded from a file of its own.
 * The app's bundler does not serve that file, so it is fetched once from the
 * package's public copy, at the exact version installed, and handed over.
 */
let workerReady: Promise<void> | null = null;
function prepareWorker(): Promise<void> {
  workerReady ??= fetch(`https://unpkg.com/maplibre-gl@${getVersion()}/dist/maplibre-gl-worker.mjs`)
    .then((response) => {
      if (!response.ok) throw new Error(`Map worker: ${response.status}`);
      return response.blob();
    })
    .then((blob) => setWorkerUrl(URL.createObjectURL(new Blob([blob], { type: 'text/javascript' }))));
  return workerReady;
}

/**
 * The map in a browser, for the development preview. It behaves like the
 * phone's map in MapView.tsx: north up, flat, kept inside Tunisia.
 */
export function MapView({ initialCenter, interactive = true, onCenterChange, ref }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<WebMap | null>(null);
  // Kept in a ref so the map, created once, always calls the latest handler.
  const report = useRef(onCenterChange);
  useEffect(() => {
    report.current = onCenterChange;
  });

  useEffect(() => {
    let cancelled = false;
    let created: WebMap | null = null;
    prepareWorker().then(
      () => {
        if (cancelled || !container.current) return;
        const built = new WebMap({
          container: container.current,
          style: MAP_STYLE_URL,
          center: [initialCenter.longitude, initialCenter.latitude],
          zoom: STREET_ZOOM,
          minZoom: 5,
          maxBounds: [TUNISIA.west, TUNISIA.south, TUNISIA.east, TUNISIA.north],
          interactive,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          // The credit stays, folded to a small button so it does not cover a small map.
          attributionControl: { compact: true },
        });
        built.on('moveend', () => {
          const { lat, lng } = built.getCenter();
          report.current?.({ latitude: lat, longitude: lng });
        });
        created = built;
        map.current = built;
      },
      // Without its worker the map cannot draw. The grey box stays, and the page around it still works.
      () => {},
    );
    return () => {
      cancelled = true;
      created?.remove();
      map.current = null;
    };
    // The map is created once; its position afterwards belongs to the person and to moveTo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    moveTo: (point) =>
      map.current?.easeTo({ center: [point.longitude, point.latitude], zoom: STREET_ZOOM, duration: 400 }),
  }));

  return <div ref={container} style={{ width: '100%', height: '100%' }} />;
}
