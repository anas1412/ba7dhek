import { Camera, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useImperativeHandle, useRef } from 'react';

import { MAP_STYLE_URL, STREET_ZOOM, TUNISIA } from './geo';
import type { MapViewProps } from './MapView.types';

/**
 * The map on a phone, drawn by MapLibre. North stays up and the view stays
 * flat: turning or tilting a map is a way to get lost while placing a pin.
 * The browser has its own version in MapView.web.tsx.
 */
export function MapView({ initialCenter, interactive = true, onCenterChange, ref }: MapViewProps) {
  const camera = useRef<CameraRef>(null);

  useImperativeHandle(ref, () => ({
    moveTo: (point) =>
      camera.current?.easeTo({ center: [point.longitude, point.latitude], zoom: STREET_ZOOM, duration: 400 }),
  }));

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={MAP_STYLE_URL}
      dragPan={interactive}
      touchZoom={interactive}
      doubleTapZoom={interactive}
      doubleTapHoldZoom={interactive}
      touchRotate={false}
      touchPitch={false}
      compass={false}
      logo={false}
      // The map data is OpenStreetMap's, and its licence asks for this credit to stay visible.
      attribution
      onRegionDidChange={(event) => {
        const [longitude, latitude] = event.nativeEvent.center;
        onCenterChange?.({ latitude, longitude });
      }}>
      <Camera
        ref={camera}
        initialViewState={{ center: [initialCenter.longitude, initialCenter.latitude], zoom: STREET_ZOOM }}
        minZoom={5}
        maxBounds={[TUNISIA.west, TUNISIA.south, TUNISIA.east, TUNISIA.north]}
      />
    </Map>
  );
}
