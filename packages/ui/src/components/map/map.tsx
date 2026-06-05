'use client'

import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MapContext } from './context'
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
	/**
	 * Accessible name for the map region. When set, an interactive map is
	 * exposed as `role="application"` and a static map as `role="img"`; without
	 * it the container stays an unlabeled presentational div.
	 */
	label?: string
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
	label,
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

	// aria-label only attaches to a role that supports it; pair them so an
	// unlabeled map stays a plain presentational div.
	const regionProps = label
		? { role: interactive ? 'application' : 'img', 'aria-label': label }
		: {}

	return (
		<div
			ref={containerRef}
			data-slot="map"
			data-ready={ready || undefined}
			{...regionProps}
			className={cn(k.base, className)}
		>
			<MapContext value={contextValue}>{ready ? children : null}</MapContext>
		</div>
	)
}

export { MapView as Map }
