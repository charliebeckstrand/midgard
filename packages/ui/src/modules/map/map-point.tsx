'use client'

import { motion } from 'motion/react'
import { type PointerEvent, useEffect, useId } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { useMapHoverSet, useMapPlat } from './context'
import {
	POINT_HIT_RADIUS,
	POINT_POP,
	POINT_RADIUS,
	POINT_STAGGER,
	POINT_STAGGER_MAX,
} from './map-constants'
import type { LngLat } from './types'

/** Props for {@link MapPoint}. */
export type MapPointProps = {
	/** Legend and tooltip name; one entry per point. */
	label: string
	/** The point's geographic position. */
	at: LngLat
	/** Named mark colour override; defaults to the next slot after the region categories. */
	color?: MapSeriesColor
	/** A trailing readout in the legend and tooltip — a count, a status. */
	detail?: string
}

/**
 * A solid circle marker at one coordinate — a warehouse, a stop, a geocoded
 * address — filled in its slot colour and registered in the plat's legend as
 * its own toggleable, focusable entry. Hovering raises the tooltip with the
 * point's name and detail; an invisible hit circle keeps the dot aimable.
 *
 * @remarks Renders only inside {@link MapPlat}, and renders nothing when the
 * projection has no image for its position (the US composite drops points
 * outside its insets). Under the plat's `animate` the dot pops in, staggered
 * by its registration order so a cluster of points reveals in sequence.
 */
export function MapPoint({ label, at, color, detail }: MapPointProps) {
	const id = useId()

	const { project, register, colors, order, hidden, emphasis, animate } = useMapPlat()

	const set = useMapHoverSet()

	useEffect(
		() => register({ id, label, kind: 'point', swatch: 'dot', color, detail }),
		[register, id, label, color, detail],
	)

	const slot = colors.get(id)

	const position = project(at)

	if (slot === undefined || hidden.has(id) || position === null) return null

	const track = (event: PointerEvent<SVGCircleElement>) => {
		set({ kind: 'entry', id }, { x: event.clientX, y: event.clientY })
	}

	const dot = (
		<circle
			data-slot="map-point"
			cx={position.x}
			cy={position.y}
			r={POINT_RADIUS}
			className={cn(k.series[slot].fill)}
		/>
	)

	return (
		<g
			className={cn(k.group(emphasis !== null && emphasis !== id))}
			onPointerLeave={() => set(null, null)}
		>
			{animate ? (
				<motion.g
					initial={{ opacity: 0, scale: 0 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{
						...POINT_POP,
						delay: Math.min((order.get(id) ?? 0) * POINT_STAGGER, POINT_STAGGER_MAX),
					}}
					style={{ transformOrigin: `${position.x}px ${position.y}px` }}
				>
					{dot}
				</motion.g>
			) : (
				dot
			)}

			<circle
				data-slot="map-point-hit"
				data-entry-id={id}
				cx={position.x}
				cy={position.y}
				r={POINT_HIT_RADIUS}
				fill="transparent"
				onPointerEnter={track}
				onPointerMove={track}
			/>
		</g>
	)
}
