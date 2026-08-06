'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { PIN_RADIUS, POINT_HIT_RADIUS, ROUTE_HIT_WIDTH, ROUTE_STROKE_WIDTH } from './map-constants'
import { MapDot } from './map-dot'
import { linePath } from './map-geometry'
import { MARKER_DRAW, MARKER_END_POP, POINT_POP } from './map-motion'
import { lineAnchor } from './map-route'
import type { LngLat } from './types'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** Props for {@link MapMarker}. */
export type MapMarkerProps = MapOverlayProps & {
	/** The journey's origin pin. */
	start: LngLat
	/** The journey's destination pin. */
	end: LngLat
	/**
	 * The connecting geometry — a {@link fetchOsrmRoute} /
	 * {@link fetchValhallaRoute} result's `path`. A straight line when omitted or
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
 * keyboard cursor picks the marker with Enter or Space.
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
	const points = path && path.length > 0 ? path : [start, end]

	const { slot, hidden, project, animate, dim, onPointerLeave, hit } = useMapOverlay({
		...shared,
		kind: 'marker',
		swatch: 'line',
		anchor: lineAnchor(points),
	})

	// Memoised so a hover-driven re-render (the plat's pointer state churns the
	// hover context) doesn't re-project and re-stringify the whole connector;
	// `project` identity holds until the measured refit, and `path` / `start` /
	// `end` are the caller's stable refs.
	const d = useMemo(() => linePath(points, project), [points, project])

	const from = project(start)

	const to = project(end)

	if (slot === undefined || hidden || (d === '' && from === null && to === null)) return null

	const paint = k.series[slot]

	const connector = d !== '' && {
		'data-slot': 'map-marker-path',
		d,
		fill: 'none',
		strokeWidth: ROUTE_STROKE_WIDTH,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		// Width in device pixels, as the region borders: a resize whose refit
		// lands late scales the geometry but must not thicken the line with it.
		vectorEffect: 'non-scaling-stroke' as const,
		className: cn(paint.stroke),
	}

	return (
		<g data-slot="map-marker" className={dim} onPointerLeave={onPointerLeave}>
			{connector &&
				(animate ? (
					<motion.path
						{...connector}
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={MARKER_DRAW}
					/>
				) : (
					<path {...connector} />
				))}

			{from && (
				<MapDot
					slot="map-marker-start"
					at={from}
					radius={PIN_RADIUS}
					className={cn(paint.stroke)}
					animate={animate}
					transition={POINT_POP}
				/>
			)}

			{to && (
				<MapDot
					slot="map-marker-end"
					at={to}
					radius={PIN_RADIUS}
					className={cn(paint.stroke)}
					animate={animate}
					transition={MARKER_END_POP}
				/>
			)}

			{d !== '' && (
				<path
					data-slot="map-marker-hit"
					d={d}
					fill="none"
					stroke="transparent"
					strokeWidth={ROUTE_HIT_WIDTH}
					pointerEvents="stroke"
					{...hit}
				/>
			)}

			{from && (
				<circle
					data-slot="map-marker-start-hit"
					cx={from.x}
					cy={from.y}
					r={POINT_HIT_RADIUS}
					fill="transparent"
					{...hit}
				/>
			)}

			{to && (
				<circle
					data-slot="map-marker-end-hit"
					cx={to.x}
					cy={to.y}
					r={POINT_HIT_RADIUS}
					fill="transparent"
					{...hit}
				/>
			)}
		</g>
	)
}
