'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { useMapPlat, useMapZoomScale } from './context'
import {
	GEOFENCE_FILL_OPACITY,
	GEOFENCE_STROKE_WIDTH,
	POINT_HIT_RADIUS,
	ZONE_SPARE_FRACTION,
} from './engine/map-constants'
import { circleRing } from './engine/map-geofence'
import {
	areaAnchor,
	areaReach,
	type MapAreaRing,
	projectArea,
	ringsPath,
} from './engine/map-geometry/mark'
import { GEOFENCE_WASH, ROUTE_DRAW } from './engine/map-motion'
import type { LngLat, MapPoint2D, MapPolygons } from './engine/types'
import { MapHalo } from './map-halo'
import { lineHitProps, MapLine } from './map-line'
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
	area?: undefined
}

/** A geofence along a ring of its own — a drawn zone, a district, a service area. @internal */
type MapGeofencePolygon = {
	/**
	 * The zone's outline, as one closed ring of lon/lat. A GeoJSON ring repeats
	 * its first position at the end; either form draws, since the path closes
	 * itself. One outer ring only — pass `area` for a zone with a hole in it, or
	 * one that falls in separate parts.
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
	area?: undefined
}

/** A geofence over a territory of several parts, each able to enclose a hole. @internal */
type MapGeofenceArea = {
	/**
	 * The zone's rings, nested polygon → ring → position, with each polygon's
	 * outer ring first and its holes after. GeoJSON `MultiPolygon` coordinates
	 * exactly, so a dissolved territory passes straight through.
	 *
	 * This is `boundary`'s form for a zone that {@link MapGeofencePolygon} cannot
	 * state: a coverage area in two separate parts, or one wrapped around ground
	 * it does not cover. A hole reads as a hole whichever way its ring winds,
	 * because the mark fills under the even-odd rule — so a merged topology's own
	 * output needs no rewinding.
	 *
	 * Hold the array steady across renders, for the reason `boundary` names.
	 */
	area: MapPolygons
	at?: undefined
	radius?: undefined
	boundary?: undefined
}

/**
 * How much reach a dot at a frame position may take from this zone: the zone's
 * share of its own inscribed room where the dot competes for it, and the whole
 * finger target where it does not.
 *
 * One budget for the whole zone rather than a measure per dot, so every mark on
 * one zone points alike — which is the thing a reader sees, and the thing four
 * corners of one corridor did not do while the rule asked whether each was
 * inside. The reach is a device-pixel figure and the rings are frame units, so
 * the zone's own measure divides by the zoom scale on the way out.
 *
 * The competition test is the ring boxes grown by a whole target, so a dot just
 * outside a small zone is budgeted too — its target would blanket that zone as
 * surely as one standing in the middle of it. Being generous there costs a dot
 * nothing it can see: a zone with room to spare hands back the whole target
 * anyway.
 *
 * @internal
 */
function zoneSpare(rings: readonly MapAreaRing[], at: MapPoint2D, unitsPerPixel: number): number {
	const reach = POINT_HIT_RADIUS * unitsPerPixel

	const near = rings.some(
		({ box }) =>
			at.x >= box.left - reach &&
			at.x <= box.right + reach &&
			at.y >= box.top - reach &&
			at.y <= box.bottom + reach,
	)

	if (!near) return POINT_HIT_RADIUS

	return Math.min(POINT_HIT_RADIUS, (areaReach(rings) / unitsPerPixel) * ZONE_SPARE_FRACTION)
}

/**
 * Props for {@link MapGeofence}. The three geometries are mutually exclusive: a
 * circle takes its centre and its radius, a polygon takes its own ring, and an
 * area takes the nested rings of a territory in several parts.
 */
export type MapGeofenceProps = MapOverlayProps &
	(MapGeofenceCircle | MapGeofencePolygon | MapGeofenceArea)

/**
 * A zone drawn over the geography — a delivery area, a service radius, a
 * restricted district — as a washed area under its own boundary, registered in
 * the plat's legend as its own toggleable, focusable entry. Give it a centre and
 * a ground radius for a circle, a ring of coordinates for a drawn outline, or
 * `area` for a territory of several parts — a ZIP-code coverage area, a sales
 * region — where any part can enclose ground it leaves out.
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
 * A dot on the zone gives back the ground the zone needs to answer for itself: a
 * {@link MapPoint}, a {@link MapPoints} dot, or a {@link MapMarker} pin on a
 * drawn zone takes half the room the zone holds for a mouse, so a depot never
 * claims the middle of its own catchment and a zone drawn small around a mark
 * still answers under it. A share of the zone's own room rather than a yes-or-no,
 * so every mark on one zone points alike however the ring runs through them, and
 * a zone wide enough to spare the whole target spares it. Toggling the zone off
 * in the legend hands the pixels back too — the dot is alone on its ground again,
 * and takes the full target.
 *
 * The boundary rides device pixels (a non-scaling stroke), so a resize scales
 * the geography under it without thickening the outline. Under the plat's
 * `animate` the outline draws itself in (`pathLength` 0 → 1) and the wash then
 * settles inside it, so the shape reads before the colour does.
 */
export function MapGeofence({ at, radius, boundary, area, ...shared }: MapGeofenceProps) {
	// Held on the centre's own numbers rather than on its identity: an inline
	// `at={[lon, lat]}` is a fresh array every render, and this memo feeds the
	// projection memo below — keyed on the array it would hold on neither, and a
	// circle would rebuild its whole ring on every pointer move across the map.
	const [lon, lat] = at ?? []

	// The three geometries meet here, in the widest one's shape. Everything below
	// this line draws a territory of rings, so a circle and a lone boundary reach
	// the path, the anchor, the wash, and the hit as the one-polygon, one-ring
	// cases they are — and the mark holds one of each rather than three.
	const polygons = useMemo(() => {
		if (area !== undefined) return area

		if (boundary !== undefined) return [[boundary]]

		if (lon === undefined || lat === undefined) return []

		return [[circleRing([lon, lat], radius)]]
	}, [area, boundary, lon, lat, radius])

	// The projector, read here rather than off the registration below: the ground
	// this zone holds is a fact about the projected frame, and the mark registers
	// that ground — so the rings have to resolve before the registration does.
	const { project } = useMapPlat()

	// Read here rather than off the registration below, for the same reason the
	// projector is: the budget this zone publishes is a device-pixel figure over a
	// frame measure, so it needs the scale before it registers.
	const unitsPerPixel = useMapZoomScale()

	// Memoised so a hover-driven re-render (the plat's pointer state churns the
	// hover context) doesn't re-project the whole territory; `project` identity
	// holds until the measured refit, a circle's rings hold on the primitives
	// above, and a `boundary` or an `area` is the caller's own stable ref.
	const rings = useMemo(() => projectArea(polygons, project), [polygons, project])

	// Held on the rings rather than strung beside them: the wash, the boundary,
	// the hit stroke, and the halo all trace this one string, and the ground the
	// zone answers for is the points it was strung from — so the shape a reader
	// sees and the shape a dot yields to can never diverge.
	const d = useMemo(() => ringsPath(rings), [rings])

	const { slot, hidden, animate, dim, selected, onPointerLeave, hit } = useMapOverlay({
		...shared,
		kind: 'geofence',
		swatch: 'rect',
		// A circle knows its own centre, so it never pays a centroid pass to find
		// one; drawn rings resolve their middle from the vertices.
		stops: () => (at === undefined ? areaAnchor(polygons) : [at]),
		// A dot standing on this zone takes a share of the room the zone has, so the
		// zone stays pointable under it — and takes the whole finger target back the
		// moment the legend puts this zone away. A share rather than a yes-or-no,
		// because a zone drawn through its own marks puts them on its boundary,
		// where inside-or-out has no answer and a ray cast reads the winding.
		spare: (position) => zoneSpare(rings, position, unitsPerPixel),
	})

	if (slot === undefined || hidden || d === '') return null

	const paint = k.series[slot]

	const wash = {
		'data-slot': 'map-geofence-wash',
		d,
		stroke: 'none',
		// See `ringsPath` for why even-odd; a single-ring zone fills the same under
		// both rules, so the circle and the lone boundary are unaffected.
		fillRule: 'evenodd' as const,
		fillOpacity: GEOFENCE_FILL_OPACITY,
		// Off the pointer, as every other drawn shape in the module is
		// (`MapDotCount`, the halo, the lit region copies): the hit shape below is
		// this mark's sole target, so the hover resolve can never read one zone twice.
		pointerEvents: 'none' as const,
		className: cn(...paint.fill),
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

				{/* The boundary is a stroked line like a route's, drawn at the zone's own
				    width: same non-scaling stroke, same round join, same self-drawing
				    reveal on the same timing. Its round linecap never renders here —
				    `ringsPath` closes every ring with a `Z`, so the path has no ends. */}
				<MapLine
					slot="map-geofence"
					d={d}
					width={GEOFENCE_STROKE_WIDTH}
					className={cn(...paint.stroke)}
					animate={animate}
					transition={ROUTE_DRAW}
				/>

				{/* The whole zone answers the pointer — its face, and the shared band
				    around the boundary so the edge stays aimable where the fill ends.
				    Marks inside the zone still take their own hits: they draw after it,
				    and the topmost shape at a point wins. */}
				<path {...lineHitProps({ slot: 'map-geofence-hit', d, hit: hit(), face: true })} />
			</g>
		</>
	)
}
