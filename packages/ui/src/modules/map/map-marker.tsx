'use client'

import { motion } from 'motion/react'
import { type PointerEvent, type ReactNode, useEffect, useId } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHover, useMapPlat } from './context'
import {
	PIN_RADIUS,
	PIN_STROKE_WIDTH,
	POINT_POP,
	ROUTE_DRAW,
	ROUTE_HIT_WIDTH,
	ROUTE_STROKE_WIDTH,
} from './map-constants'
import { linePath, type MapPoint2D } from './map-geometry'
import type { LngLat } from './types'

/** Props for {@link MapMarker}. */
export type MapMarkerProps = {
	/** Legend and tooltip name; one entry per marker pair. */
	label: string
	/** The journey's origin — the hollow pin. */
	start: LngLat
	/** The journey's destination — the filled pin. */
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
 * A start and end pin with the route connecting them — the map's origin →
 * destination mark, registered in the plat's legend as one toggleable,
 * focusable entry. The start pin is hollow, the end pin filled, so the
 * journey's direction reads without labels; hovering any part raises the
 * tooltip with the marker's name and detail.
 *
 * @remarks Renders only inside {@link MapPlat}. Under the plat's `animate`
 * the connector draws itself in and the pins pop once it lands. A pin whose
 * position the projection drops is omitted; the connector still draws
 * through the surviving geometry.
 */
export function MapMarker({ label, start, end, path, color, detail }: MapMarkerProps) {
	const id = useId()

	const { project, register, paints, hidden, emphasis, animate } = useMapPlat()

	const { set } = useMapHover()

	useEffect(
		() => register({ id, label, kind: 'marker', swatch: 'line', color, detail }),
		[register, id, label, color, detail],
	)

	const paint = paints.get(id)

	const d = linePath(path ?? [start, end], project)

	const from = project(start)

	const to = project(end)

	if (paint === undefined || hidden.has(id) || (d === '' && from === null && to === null)) {
		return null
	}

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
						transition={ROUTE_DRAW}
					/>
				) : (
					<path {...connector} />
				))}

			{from && (
				<MarkerPin slot="map-marker-start" at={from} animate={animate}>
					<circle
						cx={from.x}
						cy={from.y}
						r={PIN_RADIUS}
						strokeWidth={PIN_STROKE_WIDTH}
						className={cn(k.pinHollow, paint.stroke)}
					/>
				</MarkerPin>
			)}

			{to && (
				<MarkerPin slot="map-marker-end" at={to} animate={animate}>
					<circle
						cx={to.x}
						cy={to.y}
						r={PIN_RADIUS}
						strokeWidth={PIN_STROKE_WIDTH}
						className={cn(paint.fill, k.pointRing)}
					/>
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

/** One pin, popping in past the connector draw under `animate`. @internal */
function MarkerPin({
	slot,
	at,
	animate,
	children,
}: {
	slot: string
	at: MapPoint2D
	animate: boolean
	children: ReactNode
}) {
	if (!animate) return <g data-slot={slot}>{children}</g>

	return (
		<motion.g
			data-slot={slot}
			initial={{ opacity: 0, scale: 0 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={POINT_POP}
			style={{ transformOrigin: `${at.x}px ${at.y}px` }}
		>
			{children}
		</motion.g>
	)
}
