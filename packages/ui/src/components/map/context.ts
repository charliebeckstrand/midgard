'use client'

import type { Map as MapLibreMap } from 'maplibre-gl'
import { createContext } from '../../core'

/**
 * Bridge between a {@link Map} and its descendants: `getMap` returns the live
 * MapLibre instance (or null before load), `onReady` registers a callback that
 * runs immediately if the map is ready or on the next `load`, returning an
 * unsubscribe.
 *
 * @internal
 */
export type MapContextValue = {
	getMap: () => MapLibreMap | null
	onReady: (cb: (map: MapLibreMap) => void) => () => void
}

/** @internal Map-instance context consumed by markers, routes, and geofences. */
export const [MapContext, useMapContext] = createContext<MapContextValue>('Map')
