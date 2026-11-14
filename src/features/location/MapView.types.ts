import type { Ref } from 'react';

import type { Point } from './geo';

export type MapViewHandle = {
  /** Moves the map so this point is at its centre. */
  moveTo: (point: Point) => void;
};

export type MapViewProps = {
  /** Where the map opens. Later changes are made through `moveTo`, not this prop. */
  initialCenter: Point;
  /** False for a map that is only looked at: it cannot be dragged or zoomed. */
  interactive?: boolean;
  /** Called each time the map comes to rest, with the point at its centre. */
  onCenterChange?: (point: Point) => void;
  ref?: Ref<MapViewHandle>;
};
