'use client'

import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { MapProvider } from './context'
import { MAP_PRESETS, type MapPreset } from './map-styles'
import type { LngLat } from './types'
import { useMapInstance } from './use-map-instance'

export type MapProps = {
	center?: LngLat
	zoom?: number
	bearing?: number
	pitch?: number
	/** Preset visual style. Takes precedence over `style` when provided. */
	preset?: MapPreset
	style?: string | StyleSpecification
	interactive?: boolean
	className?: string
	children?: ReactNode
	onLoad?: (map: MapLibreMap) => void
}

function MapView({
	center = [0, 0],
	zoom = 2,
	bearing = 0,
	pitch = 0,
	preset,
	style,
	interactive = true,
	className,
	children,
	onLoad,
}: MapProps) {
	const resolvedStyle = preset ? MAP_PRESETS[preset] : (style ?? MAP_PRESETS.demo)

	const { containerRef, contextValue, ready } = useMapInstance({
		center,
		zoom,
		bearing,
		pitch,
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
