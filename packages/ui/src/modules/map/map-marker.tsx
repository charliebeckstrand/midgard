'use client'

import { motion } from 'motion/react'
import { type PointerEvent, useEffect, useId, useMemo } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHoverSet, useMapPlat } from './context'
import {
	MARKER_DRAW,
	MARKER_END_POP,
	PIN_POP,
	PIN_RADIUS,
	POINT_HIT_RADIUS,
	ROUTE_HIT_WIDTH,
	ROUTE_STROKE_WIDTH,
} from './map-constants'
import { MapDot } from './map-dot'
import { linePath } from './map-geometry'
import type { LngLat } from './types'

/** Props for {@link MapMarker}. */
export type MapMarkerProps = {
	/** Legend and tooltip name; one entry per marker pair. */
	label: string
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
	/** Named mark colour override; defaults to the next slot after the region categories. */
	color?: MapSeriesColor
	/** A trailing readout in the legend and tooltip — `'312 mi'`, `'4 h 50 m'`. */
	detail?: string
}

/**
 * An origin and a destination pin with the route connecting them — the map's
 * origin → destination mark, registered in the plat's legend as one
 * toggleable, focusable entry. Both pins are solid dots in the marker's slot
 * colour; hovering any part raises the tooltip with the marker's name and
 * detail.
 *
 * @remarks Renders only inside {@link MapPlat}. Pins and connector ride
 * device pixels (non-scaling strokes), so a resize scales the geography under
 * them without changing their size. Under the plat's `animate` the journey
 * plays in travel order — the origin pin pops, the connector draws itself in
 * from it, then the destination pin pops as the line lands — so direction
 * reads from the reveal. A pin whose position the projection drops is
 * omitted; the connector still draws through the surviving geometry.
 */
export function MapMarker({ label, start, end, path, color, detail }: MapMarkerProps) {
	const id = useId()

	const { project, register, colors, hidden, emphasis, animate } = useMapPlat()

	const set = useMapHoverSet()

	useEffect(
		() => register({ id, label, kind: 'marker', swatch: 'line', color, detail }),
		[register, id, label, color, detail],
	)

	const slot = colors.get(id)

	// Memoised so a hover-driven re-render (the plat's pointer state churns the
	// hover context) doesn't re-project and re-stringify the whole connector;
	// `project` identity holds until the measured refit, and `path` / `start` /
	// `end` are the caller's stable refs. A routed `path` with geometry wins; an
	// empty one — a `false`-overview leg carries totals but no line — falls back
	// to the straight start→end connector.
	const d = useMemo(
		() => linePath(path && path.length > 0 ? path : [start, end], project),
		[path, start, end, project],
	)

	const from = project(start)

	const to = project(end)

	if (slot === undefined || hidden.has(id) || (d === '' && from === null && to === null)) {
		return null
	}

	const paint = k.series[slot]

	const track = (event: PointerEvent<SVGElement>) => {
		set({ kind: 'entry', id }, { x: event.clientX, y: event.clientY })
	}

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
		<g
			data-slot="map-marker"
			className={cn(k.group(emphasis !== null && emphasis !== id))}
			onPointerLeave={() => set(null, null)}
		>
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
					transition={PIN_POP}
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
					data-entry-id={id}
					d={d}
					fill="none"
					stroke="transparent"
					strokeWidth={ROUTE_HIT_WIDTH}
					pointerEvents="stroke"
					onPointerEnter={track}
					onPointerMove={track}
				/>
			)}

			{from && (
				<circle
					data-slot="map-marker-start-hit"
					data-entry-id={id}
					cx={from.x}
					cy={from.y}
					r={POINT_HIT_RADIUS}
					fill="transparent"
					onPointerEnter={track}
					onPointerMove={track}
				/>
			)}

			{to && (
				<circle
					data-slot="map-marker-end-hit"
					data-entry-id={id}
					cx={to.x}
					cy={to.y}
					r={POINT_HIT_RADIUS}
					fill="transparent"
					onPointerEnter={track}
					onPointerMove={track}
				/>
			)}
		</g>
	)
}
