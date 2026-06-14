'use client'

import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MapContext } from './context'
import { type MapPreset, mapPresets } from './map-styles'
import type { LngLat } from './types'
import { useMapInstance } from './use-map-instance'

/** Camera position for a {@link Map}: center, zoom, bearing, and pitch. */
export type MapCamera = {
	center?: LngLat
	zoom?: number
	bearing?: number
	pitch?: number
}

/** Props for {@link Map}: initial `camera`, visual `preset` or `style`, interactivity, and accessible name. */
export type MapProps = {
	/**
	 * Initial camera position.
	 * @defaultValue `{ center: [0, 0], zoom: 2, bearing: 0, pitch: 0 }`
	 */
	camera?: MapCamera
	/** Preset visual style. Takes precedence over `style` when provided. */
	preset?: MapPreset
	style?: string | StyleSpecification
	interactive?: boolean
	/**
	 * Accessible name for the map region. When set, an interactive map is
	 * exposed as `role="application"` and a static map as a labelled
	 * `role="group"` (not `role="img"`, which hides interactive children);
	 * without it the container stays an unlabeled presentational div.
	 */
	label?: string
	className?: string
	children?: ReactNode
	onLoad?: (map: MapLibreMap) => void
}

/**
 * MapLibre-backed interactive map: provides the map instance to descendants (markers, routes, geofences) via context.
 *
 * @remarks
 * MapLibre is loaded lazily on the client; `children` mount only once the map
 * fires `load` (`data-ready`), so descendants can assume a live instance.
 * `aria-label` attaches only with a supporting role (`application` when
 * interactive, `group` otherwise); without it the container stays a plain
 * presentational div.
 * @see {@link MapMarker}
 * @see {@link MapRoute}
 */
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

	// Resolve `center` from its primitive lng/lat components; the reference
	// stays stable across renders.
	const lng = camera?.center?.[0] ?? 0
	const lat = camera?.center?.[1] ?? 0

	const center = useMemo<LngLat>(() => [lng, lat], [lng, lat])

	const { containerRef, contextValue, ready } = useMapInstance({
		center,
		zoom: camera?.zoom ?? 2,
		bearing: camera?.bearing ?? 0,
		pitch: camera?.pitch ?? 0,
		style: resolvedStyle,
		interactive,
		onLoad,
	})

	// aria-label only attaches to a role that supports it; pair them. An
	// unlabeled map stays a plain presentational div.
	const regionProps = label
		? { role: interactive ? 'application' : 'group', 'aria-label': label }
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
