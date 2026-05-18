'use client'

import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MapProvider } from './context'
import { type MapPreset, mapPresets } from './map-styles'
import type { LngLat } from './types'
import { useMapInstance } from './use-map-instance'

export type MapCamera = {
	center?: LngLat
	zoom?: number
	bearing?: number
	pitch?: number
}

export type MapProps = {
	/** Initial camera position. Defaults to `{ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 }`. */
	camera?: MapCamera
	/** Preset visual style. Takes precedence over `style` when provided. */
	preset?: MapPreset
	style?: string | StyleSpecification
	interactive?: boolean
	className?: string
	children?: ReactNode
	onLoad?: (map: MapLibreMap) => void
}

/** MapLibre-backed interactive map — provides the map instance to descendants (markers, routes, geofences) via context. */
function MapView({
	camera,
	preset,
	style,
	interactive = true,
	className,
	children,
	onLoad,
}: MapProps) {
	const resolvedStyle = preset ? mapPresets[preset] : (style ?? mapPresets.demo)

	const { containerRef, contextValue, ready } = useMapInstance({
		center: camera?.center ?? [0, 0],
		zoom: camera?.zoom ?? 2,
		bearing: camera?.bearing ?? 0,
		pitch: camera?.pitch ?? 0,
		style: resolvedStyle,
		interactive,
		onLoad,
	})

	return (
		<div
			ref={containerRef}
			data-slot="map"
			data-ready={ready || undefined}
			className={cn(k.base, className)}
		>
			<MapProvider value={contextValue}>{ready ? children : null}</MapProvider>
		</div>
	)
}

export { MapView as Map }
