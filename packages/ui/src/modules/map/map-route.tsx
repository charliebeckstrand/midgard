'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { ROUTE_HIT_WIDTH, ROUTE_STROKE_WIDTH } from './map-constants'
import { lineAnchor, linePath } from './map-geometry'
import { ROUTE_DRAW } from './map-motion'
import type { LngLat } from './types'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** Props for {@link MapRoute}. */
export type MapRouteProps = MapOverlayProps & {
	/**
	 * Waypoints in travel order, drawn as straight segments. Optional when a
	 * `path` is supplied — a routed leg already carries its geometry.
	 */
	stops?: LngLat[]
	/**
	 * Street-following geometry that hugs the road instead of cutting straight
	 * between waypoints — a {@link fetchOsrmRoute} / {@link fetchValhallaRoute}
	 * result's `path`. Wins over `stops` when both are given and it has geometry;
	 * an empty `path` (a totals-only routed leg) falls back to `stops`.
	 */
	path?: LngLat[]
}

/**
 * A route drawn over the geography: a round-joined polyline through its
 * stops (or along a street-following `path`), registered in the plat's
 * legend as its own toggleable, focusable entry. Hovering the line raises
 * the tooltip with the route's name and detail and isolates the route —
 * every other mark recedes, as under its legend entry's focus; a wide
 * invisible hit stroke keeps the thin line aimable. With `onClick` set, that
 * stroke answers a click and the keyboard cursor picks the route with Enter
 * or Space.
 *
 * @remarks Renders only inside {@link MapPlat}. The line's width rides
 * device pixels (a non-scaling stroke), so a resize scales the geography
 * under it without thickening the line. Under the plat's `animate` the route
 * draws itself in (`pathLength` 0 → 1), the same self-drawing reveal as the
 * chart module's lines.
 */
export function MapRoute({ stops, path, ...shared }: MapRouteProps) {
	// The drawn geometry: a routed `path` with coordinates wins; an empty one — a
	// `false`-overview leg carries totals but no line — falls back to the stops.
	const points = path && path.length > 0 ? path : (stops ?? [])

	const { slot, hidden, project, animate, dim, onPointerLeave, hit } = useMapOverlay({
		...shared,
		kind: 'route',
		swatch: 'line',
		stops: () => lineAnchor(points),
	})

	// Memoised so a hover-driven re-render (the plat's pointer state churns the
	// hover context) doesn't re-project and re-stringify the whole polyline;
	// `project` identity holds until the measured refit, and `path` / `stops`
	// are the caller's stable refs.
	const d = useMemo(() => linePath(points, project), [points, project])

	if (slot === undefined || hidden || d === '') return null

	const paint = k.series[slot]

	const shape = {
		'data-slot': 'map-route',
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
		<g className={dim} onPointerLeave={onPointerLeave}>
			{animate ? (
				<motion.path
					{...shape}
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={ROUTE_DRAW}
				/>
			) : (
				<path {...shape} />
			)}

			<path
				data-slot="map-route-hit"
				d={d}
				fill="none"
				stroke="transparent"
				strokeWidth={ROUTE_HIT_WIDTH}
				pointerEvents="stroke"
				{...hit()}
			/>
		</g>
	)
}
