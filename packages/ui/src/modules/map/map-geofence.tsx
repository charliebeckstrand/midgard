'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import {
	GEOFENCE_FILL_OPACITY,
	GEOFENCE_STROKE_WIDTH,
	ROUTE_HIT_WIDTH,
} from './engine/map-constants'
import { circleRing } from './engine/map-geofence'
import { ringAnchor, ringPath } from './engine/map-geometry/mark'
import { GEOFENCE_WASH, ROUTE_DRAW } from './engine/map-motion'
import type { LngLat } from './engine/types'
import { MapHalo } from './map-halo'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** A geofence around one centre, at a fixed distance across the ground. @internal */
type MapGeofenceCircle = {
	/** The circle's centre. */
	at: LngLat
	/**
	 * The circle's radius, as a distance across the ground in metres — a service
	 * radius, a depot's catchment, a delivery zone.
	 *
	 * A ground distance, not a frame one: the zone covers the same ground however
	 * far out the map sits, where every other mark in this module holds its size in
	 * device pixels. A radius at or below zero draws nothing.
	 */
	radius: number
	boundary?: undefined
}

/** A geofence along a ring of its own — a drawn zone, a district, a service area. @internal */
type MapGeofencePolygon = {
	/**
	 * The zone's outline, as one closed ring of lon/lat. A GeoJSON ring repeats
	 * its first position at the end; either form draws, since the path closes
	 * itself. One outer ring only — a zone with a hole in it is two marks.
	 *
	 * Each edge draws straight in the frame, so a ring wider than a hemisphere —
	 * one that would need the sphere's own resampling — is outside what this
	 * draws. A zone over a metro, a state, or a country reads exactly.
	 */
	boundary: LngLat[]
	at?: undefined
	radius?: undefined
}

/**
 * Props for {@link MapGeofence}. The two geometries are mutually exclusive: a
 * circle takes its centre and its radius, a polygon takes its own ring.
 */
export type MapGeofenceProps = MapOverlayProps & (MapGeofenceCircle | MapGeofencePolygon)

/**
 * A zone drawn over the geography — a delivery area, a service radius, a
 * restricted district — as a washed area under its own boundary, registered in
 * the plat's legend as its own toggleable, focusable entry. Give it a centre and
 * a ground radius for a circle, or a ring of coordinates for any other shape.
 * Hovering the boundary raises the tooltip with the zone's name and detail and
 * isolates the zone — every other mark recedes, as under its legend entry's
 * focus. With `onClick` set, the boundary answers a click and the keyboard
 * cursor picks the zone with Enter or Space; the plat's `selectedOverlay` haloes
 * the outline for as long as it names this mark.
 *
 * @remarks Renders only inside {@link MapPlat}, and draws nothing where the
 * projection keeps fewer than three of its points — the US composite drops
 * points outside its insets. Draw it before the marks it encloses, so those
 * marks sit over the wash rather than under it.
 *
 * The boundary alone answers the pointer. A zone whose interior took the hits
 * would swallow every mark inside it — the marks the zone exists to enclose —
 * and pointing a stop within it would isolate the zone instead of the stop, so
 * the fence is aimable at its edge the way a {@link MapRoute} is along its line.
 *
 * The boundary rides device pixels (a non-scaling stroke), so a resize scales
 * the geography under it without thickening the outline. Under the plat's
 * `animate` the outline draws itself in (`pathLength` 0 → 1) and the wash then
 * settles inside it, so the shape reads before the colour does.
 */
export function MapGeofence({ at, radius, boundary, ...shared }: MapGeofenceProps) {
	// Held on the centre's own numbers rather than on its identity: an inline
	// `at={[lon, lat]}` is a fresh array every render, and this memo feeds the
	// projection memo below — keyed on the array it would hold on neither, and a
	// circle would rebuild its whole ring on every pointer move across the map.
	const [lon, lat] = at ?? []

	const ring = useMemo(() => {
		if (boundary !== undefined) return boundary

		if (lon === undefined || lat === undefined || radius === undefined) return []

		return circleRing([lon, lat], radius)
	}, [boundary, lon, lat, radius])

	const { slot, hidden, project, animate, dim, selected, onPointerLeave, hit } = useMapOverlay({
		...shared,
		kind: 'geofence',
		swatch: 'rect',
		// A circle knows its own centre, so it never pays a centroid pass to find
		// one; a drawn ring resolves its middle from the vertices.
		stops: () => (at === undefined ? ringAnchor(ring) : [at]),
	})

	// Memoised so a hover-driven re-render (the plat's pointer state churns the
	// hover context) doesn't re-project and re-stringify the whole ring;
	// `project` identity holds until the measured refit.
	const d = useMemo(() => ringPath(ring, project), [ring, project])

	if (slot === undefined || hidden || d === '') return null

	const paint = k.series[slot]

	const wash = {
		'data-slot': 'map-geofence-wash',
		d,
		stroke: 'none',
		fillOpacity: GEOFENCE_FILL_OPACITY,
		// The one drawn shape in the module with an area, and so the one that would
		// answer the pointer where it is painted. Off it, as every other drawn shape
		// is (`MapDot`, the halo, the lit region copies): the hit stroke below is the
		// mark's sole target, and the regions the zone covers keep their own hover
		// and their own clicks.
		pointerEvents: 'none' as const,
		className: cn(paint.fill),
	}

	const edge = {
		'data-slot': 'map-geofence',
		d,
		fill: 'none',
		strokeWidth: GEOFENCE_STROKE_WIDTH,
		strokeLinejoin: 'round' as const,
		// Width in device pixels, as the region borders: a resize whose refit
		// lands late scales the geometry but must not thicken the outline.
		vectorEffect: 'non-scaling-stroke' as const,
		className: cn(paint.stroke),
	}

	return (
		<>
			{selected !== null && (
				<MapHalo slot="map-geofence-selected" d={d} width={GEOFENCE_STROKE_WIDTH} />
			)}

			<g className={dim} onPointerLeave={onPointerLeave}>
				{animate ? (
					<motion.path
						{...wash}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={GEOFENCE_WASH}
					/>
				) : (
					<path {...wash} />
				)}

				{animate ? (
					<motion.path
						{...edge}
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={ROUTE_DRAW}
					/>
				) : (
					<path {...edge} />
				)}

				<path
					data-slot="map-geofence-hit"
					d={d}
					fill="none"
					stroke="transparent"
					strokeWidth={ROUTE_HIT_WIDTH}
					pointerEvents="stroke"
					{...hit()}
				/>
			</g>
		</>
	)
}
