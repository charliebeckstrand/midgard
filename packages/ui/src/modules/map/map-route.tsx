'use client'

import { motion } from 'motion/react'
import { type PointerEvent, useEffect, useId } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHover, useMapPlat } from './context'
import { ROUTE_DRAW, ROUTE_HIT_WIDTH, ROUTE_STROKE_WIDTH } from './map-constants'
import { linePath } from './map-geometry'
import type { LngLat } from './types'

/** Props for {@link MapRoute}. */
export type MapRouteProps = {
	/** Legend and tooltip name; one entry per route. */
	label: string
	/**
	 * Waypoints in travel order, drawn as straight segments. Optional when a
	 * `path` is supplied — a routed leg already carries its geometry.
	 */
	stops?: LngLat[]
	/**
	 * Street-following geometry that hugs the road instead of cutting straight
	 * between waypoints — a {@link fetchOsrmRoute} / {@link fetchValhallaRoute}
	 * result's `path`. Wins over `stops` when both are given.
	 */
	path?: LngLat[]
	/** Named mark colour override; defaults to the next slot after the region categories. */
	color?: MapSeriesColor
	/** A trailing readout in the legend and tooltip — `'312 mi'`, `'4 h 50 m'`. */
	detail?: string
}

/**
 * A route drawn over the geography: a round-joined polyline through its
 * stops (or along a street-following `path`), registered in the plat's
 * legend as its own toggleable, focusable entry. Hovering the line raises
 * the tooltip with the route's name and detail; a wide invisible hit stroke
 * keeps the thin line aimable.
 *
 * @remarks Renders only inside {@link MapPlat}. Under the plat's `animate`
 * the route draws itself in (`pathLength` 0 → 1), the same self-drawing
 * reveal as the chart module's lines.
 */
export function MapRoute({ label, stops, path, color, detail }: MapRouteProps) {
	const id = useId()

	const { project, register, colors, hidden, emphasis, animate } = useMapPlat()

	const { set } = useMapHover()

	useEffect(
		() => register({ id, label, kind: 'route', swatch: 'line', color, detail }),
		[register, id, label, color, detail],
	)

	const slot = colors.get(id)

	const d = linePath(path ?? stops ?? [], project)

	if (slot === undefined || hidden.has(id) || d === '') return null

	const paint = k.series[slot]

	const track = (event: PointerEvent<SVGPathElement>) => {
		set({ kind: 'entry', id }, { x: event.clientX, y: event.clientY })
	}

	const shared = {
		'data-slot': 'map-route',
		d,
		fill: 'none',
		strokeWidth: ROUTE_STROKE_WIDTH,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		className: cn(paint.stroke),
	}

	return (
		<g
			className={cn(k.group(emphasis !== null && emphasis !== id))}
			onPointerLeave={() => set(null, null)}
		>
			{animate ? (
				<motion.path
					{...shared}
					initial={{ pathLength: 0 }}
					animate={{ pathLength: 1 }}
					transition={ROUTE_DRAW}
				/>
			) : (
				<path {...shared} />
			)}

			<path
				data-slot="map-route-hit"
				d={d}
				fill="none"
				stroke="transparent"
				strokeWidth={ROUTE_HIT_WIDTH}
				pointerEvents="stroke"
				onPointerEnter={track}
				onPointerMove={track}
			/>
		</g>
	)
}
