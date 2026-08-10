'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { fineMarks } from './engine/map-cluster/crowd'
import { PIN_RADIUS, ROUTE_STROKE_WIDTH } from './engine/map-constants'
import { lineAnchor, linePath } from './engine/map-geometry/mark'
import { MARKER_DRAW, MARKER_END_POP, POINT_POP } from './engine/map-motion'
import type { LngLat } from './engine/types'
import { dotHitProps, MapDot } from './map-dot'
import { MapDotHalo, MapHalo } from './map-halo'
import { lineHitProps, MapLine } from './map-line'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** Props for {@link MapMarker}. */
export type MapMarkerProps = MapOverlayProps & {
	/** The journey's origin pin. */
	start: LngLat
	/** The journey's destination pin. */
	end: LngLat
	/**
	 * The connecting geometry — a {@link fetchOsrmRoute} /
	 * {@link fetchValhallaRoute} answer's `route.path`. A straight line when omitted or
	 * empty (a totals-only routed leg).
	 */
	path?: LngLat[]
}

/**
 * An origin and a destination pin with the route connecting them — the map's
 * origin → destination mark, registered in the plat's legend as one
 * toggleable, focusable entry. Both pins are solid dots in the marker's slot
 * colour; hovering any part raises the tooltip with the marker's name and
 * detail and isolates the pair — every other mark recedes, as under its
 * legend entry's focus. With `onClick` set, every part answers a click and the
 * keyboard cursor picks the marker with Enter or Space; the plat's
 * `selectedOverlay` haloes both pins and the leg between them for as long as it
 * names this mark.
 *
 * @remarks Renders only inside {@link MapPlat}. Pins and connector ride
 * device pixels (non-scaling strokes), so a resize scales the geography under
 * them without changing their size. Under the plat's `animate` the journey
 * plays in travel order — the origin pin pops, the connector draws itself in
 * from it, then the destination pin pops as the line lands — so direction
 * reads from the reveal. A pin whose position the projection drops is
 * omitted; the connector still draws through the surviving geometry.
 */
export function MapMarker({ start, end, path, ...shared }: MapMarkerProps) {
	// Memoised on the caller's own refs: the straight start→end fallback is a
	// fresh array on every render, and this feeds the projection memo below as a
	// dependency — built inline, that memo would never hold, and a marker with no
	// routed path would re-project and re-stringify on every pointed-mark
	// crossing.
	const points = useMemo(() => (path && path.length > 0 ? path : [start, end]), [path, start, end])

	const {
		slot,
		hidden,
		project,
		covered,
		unitsPerPixel,
		animate,
		dim,
		selected,
		onPointerLeave,
		hit,
	} = useMapOverlay({
		...shared,
		kind: 'marker',
		swatch: 'line',
		stops: () => lineAnchor(points),
	})

	// Memoised so a hover-driven re-render (the plat's pointer state churns the
	// hover context) doesn't re-project and re-stringify the whole connector;
	// `project` identity holds until the measured refit, and `path` / `start` /
	// `end` are the caller's stable refs.
	const d = useMemo(() => linePath(points, project), [points, project])

	const from = project(start)

	const to = project(end)

	if (slot === undefined || hidden || (d === '' && from === null && to === null)) return null

	// The shared rule, over the pair at once: the pins are each other's
	// neighbours, so a short leg is this mark's own crowding case — a target on one
	// end covering the other would take that pin's readout with it. Resolved below
	// the guard, so a marker the legend has toggled off pays nothing on the pointer
	// crossings that still re-render it.
	const [fineStart = false, fineEnd = false] = fineMarks(
		[
			{ at: from, radius: PIN_RADIUS },
			{ at: to, radius: PIN_RADIUS },
		],
		unitsPerPixel,
		covered,
	)

	const paint = k.series[slot]

	// Joined once: the three shapes below all draw in it.
	const stroke = cn(...paint.stroke)

	return (
		<>
			{/* One pick, three shapes: a marker is its pair of pins and the leg
			    between them, so the halo marks all of what the mark draws rather
			    than the one anchor its stop sits at. */}
			{selected !== null && (
				<>
					{d !== '' && <MapHalo slot="map-marker-selected" d={d} width={ROUTE_STROKE_WIDTH} />}

					{from && <MapDotHalo slot="map-marker-start-selected" at={from} radius={PIN_RADIUS} />}

					{to && <MapDotHalo slot="map-marker-end-selected" at={to} radius={PIN_RADIUS} />}
				</>
			)}

			<g data-slot="map-marker" className={dim} onPointerLeave={onPointerLeave}>
				{d !== '' && (
					<MapLine
						slot="map-marker-path"
						d={d}
						className={stroke}
						animate={animate}
						transition={MARKER_DRAW}
					/>
				)}

				{from && (
					<MapDot
						slot="map-marker-start"
						at={from}
						radius={PIN_RADIUS}
						className={stroke}
						animate={animate}
						transition={POINT_POP}
					/>
				)}

				{to && (
					<MapDot
						slot="map-marker-end"
						at={to}
						radius={PIN_RADIUS}
						className={stroke}
						animate={animate}
						transition={MARKER_END_POP}
					/>
				)}

				{d !== '' && <path {...lineHitProps({ slot: 'map-marker-hit', d, hit: hit() })} />}

				{from && (
					<circle
						{...dotHitProps({
							slot: 'map-marker-start-hit',
							at: from,
							hit: hit(),
							scale: unitsPerPixel,
							radius: PIN_RADIUS,
							fine: fineStart,
						})}
					/>
				)}

				{to && (
					<circle
						{...dotHitProps({
							slot: 'map-marker-end-hit',
							at: to,
							hit: hit(),
							scale: unitsPerPixel,
							radius: PIN_RADIUS,
							fine: fineEnd,
						})}
					/>
				)}
			</g>
		</>
	)
}
