'use client'

import { motion } from 'motion/react'
import { type PointerEvent, type ReactNode, useEffect, useId } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHover, useMapPlat } from './context'
import {
	MARKER_DRAW,
	MARKER_END_POP,
	PIN_POP,
	PIN_RADIUS,
	ROUTE_HIT_WIDTH,
	ROUTE_STROKE_WIDTH,
} from './map-constants'
import { linePath, type MapPoint2D } from './map-geometry'
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
	 * {@link fetchValhallaRoute} result's `path`. A straight line when
	 * omitted.
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
 * @remarks Renders only inside {@link MapPlat}. Under the plat's `animate`
 * the journey plays in travel order — the origin pin pops, the connector
 * draws itself in from it, then the destination pin pops as the line lands —
 * so direction reads from the reveal. A pin whose position the projection
 * drops is omitted; the connector still draws through the surviving geometry.
 */
export function MapMarker({ label, start, end, path, color, detail }: MapMarkerProps) {
	const id = useId()

	const { project, register, colors, hidden, emphasis, animate } = useMapPlat()

	const { set } = useMapHover()

	useEffect(
		() => register({ id, label, kind: 'marker', swatch: 'line', color, detail }),
		[register, id, label, color, detail],
	)

	const slot = colors.get(id)

	const d = linePath(path ?? [start, end], project)

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
				<MarkerPin slot="map-marker-start" at={from} animate={animate} transition={PIN_POP}>
					<circle cx={from.x} cy={from.y} r={PIN_RADIUS} className={cn(paint.fill)} />
				</MarkerPin>
			)}

			{to && (
				<MarkerPin slot="map-marker-end" at={to} animate={animate} transition={MARKER_END_POP}>
					<circle cx={to.x} cy={to.y} r={PIN_RADIUS} className={cn(paint.fill)} />
				</MarkerPin>
			)}

			{d !== '' && (
				<path
					data-slot="map-marker-hit"
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
					cx={from.x}
					cy={from.y}
					r={ROUTE_HIT_WIDTH}
					fill="transparent"
					onPointerEnter={track}
					onPointerMove={track}
				/>
			)}

			{to && (
				<circle
					data-slot="map-marker-end-hit"
					cx={to.x}
					cy={to.y}
					r={ROUTE_HIT_WIDTH}
					fill="transparent"
					onPointerEnter={track}
					onPointerMove={track}
				/>
			)}
		</g>
	)
}

/** One pin, popping in on its own beat of the travel-order reveal. @internal */
function MarkerPin({
	slot,
	at,
	animate,
	transition,
	children,
}: {
	slot: string
	at: MapPoint2D
	animate: boolean
	transition: { duration: number; delay?: number }
	children: ReactNode
}) {
	if (!animate) return <g data-slot={slot}>{children}</g>

	return (
		<motion.g
			data-slot={slot}
			initial={{ opacity: 0, scale: 0 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={transition}
			style={{ transformOrigin: `${at.x}px ${at.y}px` }}
		>
			{children}
		</motion.g>
	)
}
