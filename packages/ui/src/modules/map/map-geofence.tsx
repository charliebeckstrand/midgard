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
	 *
	 * Hold the array itself steady across renders — a module constant, a `useMemo`,
	 * a query result. The projected path is memoised on this reference, so a ring
	 * built inline re-projects on every pointer crossing of the map, which a long
	 * boundary pays for in full.
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
 * Hovering anywhere in the zone raises the tooltip with its name and detail and
 * isolates the zone — every other mark recedes, as under its legend entry's
 * focus. With `onClick` set, the zone answers a click and the keyboard cursor
 * picks it with Enter or Space; the plat's `selectedOverlay` haloes the outline
 * for as long as it names this mark.
 *
 * @remarks Renders only inside {@link MapPlat}, and draws nothing where the
 * projection keeps fewer than three of its points — the US composite drops
 * points outside its insets.
 *
 * The whole face is the target, plus a 24px band around the boundary (WCAG
 * 2.5.8's minimum) so the edge stays aimable where the fill ends. Marks the zone encloses keep their own hits
 * as long as they are drawn after it — the topmost shape at a point wins — so
 * order the children with the zone first, which also keeps the wash behind the
 * marks rather than over them. A region under the zone does not: the zone is
 * what the pointer is on there, so a clickable map's regions answer outside its
 * zones and the zones answer within them.
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

		if (lon === undefined || lat === undefined) return []

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
	// `project` identity holds until the measured refit, a circle's `ring` holds on
	// the primitives above, and a `boundary` is the caller's own stable ref.
	const d = useMemo(() => ringPath(ring, project), [ring, project])

	if (slot === undefined || hidden || d === '') return null

	const paint = k.series[slot]

	const wash = {
		'data-slot': 'map-geofence-wash',
		d,
		stroke: 'none',
		fillOpacity: GEOFENCE_FILL_OPACITY,
		// Off the pointer, as every other drawn shape in the module is
		// (`MapDotCount`, the halo, the lit region copies): the hit shape below is
		// this mark's sole target, so the hover resolve can never read one zone twice.
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

				{/* The whole zone answers the pointer — its face, and a 24px band around
				    the boundary so the edge stays aimable where the fill ends. `all` rather
				    than the painted default, so the transparent fill counts as a target.
				    Marks inside the zone still take their own hits: they draw after it,
				    and the topmost shape at a point wins. */}
				<path
					data-slot="map-geofence-hit"
					d={d}
					fill="transparent"
					stroke="transparent"
					strokeWidth={ROUTE_HIT_WIDTH}
					// The band is a finger's width in device pixels, so it rides the same
					// non-scaling stroke the boundary does: a zoom widens the ground the
					// zone covers, never the target around its edge.
					vectorEffect="non-scaling-stroke"
					pointerEvents="all"
					{...hit()}
				/>
			</g>
		</>
	)
}
