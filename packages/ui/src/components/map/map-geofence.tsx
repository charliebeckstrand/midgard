'use client'

import { useEffect, useId, useRef } from 'react'
import { useMapContext } from './context'
import type { GeofenceShape, LngLat } from './types'

export type MapGeofenceProps = {
	shape: GeofenceShape
	/** Fill color. Defaults to translucent blue. */
	color?: string
	/** Fill opacity (0–1). Defaults to 0.15. */
	fillOpacity?: number
	/** Stroke color. Defaults to `color`. */
	strokeColor?: string
	/** Stroke width. Defaults to 2. */
	strokeWidth?: number
}

export function MapGeofence({
	shape,
	color = '#2563eb',
	fillOpacity = 0.15,
	strokeColor,
	strokeWidth = 2,
}: MapGeofenceProps) {
	const { getMap, onReady } = useMapContext()

	const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '-')

	const sourceId = `map-geofence-src-${reactId}`

	const fillId = `map-geofence-fill-${reactId}`

	const lineId = `map-geofence-line-${reactId}`

	// The mount effect reads initial props via a ref so it can safely run once.
	const mountPropsRef = useRef({ shape, color, fillOpacity, strokeColor, strokeWidth })

	mountPropsRef.current = { shape, color, fillOpacity, strokeColor, strokeWidth }

	useEffect(() => {
		const cleanup = onReady((map) => {
			const init = mountPropsRef.current

			map.addSource(sourceId, { type: 'geojson', data: toPolygon(init.shape) })

			map.addLayer({
				id: fillId,
				type: 'fill',
				source: sourceId,
				paint: {
					'fill-color': init.color,
					'fill-opacity': init.fillOpacity,
				},
			})

			map.addLayer({
				id: lineId,
				type: 'line',
				source: sourceId,
				paint: {
					'line-color': init.strokeColor ?? init.color,
					'line-width': init.strokeWidth,
				},
			})
		})

		return () => {
			cleanup?.()

			const map = getMap()

			if (!map) return

			try {
				if (map.getLayer(lineId)) map.removeLayer(lineId)

				if (map.getLayer(fillId)) map.removeLayer(fillId)

				if (map.getSource(sourceId)) map.removeSource(sourceId)
			} catch {
				// Map may already be torn down.
			}
		}
	}, [onReady, getMap, sourceId, fillId, lineId])

	// Sync shape/paint when props change.
	useEffect(() => {
		const map = getMap()

		if (!map) return

		const source = map.getSource(sourceId) as
			| { setData: (d: ReturnType<typeof toPolygon>) => void }
			| undefined

		source?.setData(toPolygon(shape))

		if (map.getLayer(fillId)) {
			map.setPaintProperty(fillId, 'fill-color', color)
			map.setPaintProperty(fillId, 'fill-opacity', fillOpacity)
		}

		if (map.getLayer(lineId)) {
			map.setPaintProperty(lineId, 'line-color', strokeColor ?? color)
			map.setPaintProperty(lineId, 'line-width', strokeWidth)
		}
	}, [shape, color, fillOpacity, strokeColor, strokeWidth, fillId, lineId, sourceId, getMap])

	return null
}

function toPolygon(shape: GeofenceShape) {
	const coords =
		shape.kind === 'circle' ? circlePolygon(shape.center, shape.radiusMeters) : shape.coordinates

	const closed =
		coords.length > 0 &&
		coords[0][0] === coords[coords.length - 1][0] &&
		coords[0][1] === coords[coords.length - 1][1]
			? coords
			: [...coords, coords[0]]

	return {
		type: 'Feature' as const,
		geometry: { type: 'Polygon' as const, coordinates: [closed] },
		properties: {},
	}
}

const EARTH_RADIUS_M = 6371000

function circlePolygon(center: LngLat, radiusMeters: number, steps = 64): LngLat[] {
	const [lng, lat] = center

	const latRad = (lat * Math.PI) / 180

	const out: LngLat[] = []

	for (let i = 0; i < steps; i++) {
		const angle = (i / steps) * Math.PI * 2

		const dx = (radiusMeters * Math.cos(angle)) / (EARTH_RADIUS_M * Math.cos(latRad))

		const dy = (radiusMeters * Math.sin(angle)) / EARTH_RADIUS_M

		out.push([lng + (dx * 180) / Math.PI, lat + (dy * 180) / Math.PI])
	}

	return out
}
