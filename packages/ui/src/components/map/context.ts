'use client'

import type { Map as MapLibreMap } from 'maplibre-gl'
import { createContext } from '../../core'

type MapContextValue = {
	getMap: () => MapLibreMap | null
	onReady: (cb: (map: MapLibreMap) => void) => () => void
}

export const [MapProvider, useMapContext] = createContext<MapContextValue>('Map')
