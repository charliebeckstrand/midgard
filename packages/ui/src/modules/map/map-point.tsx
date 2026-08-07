'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { POINT_HIT_RADIUS, POINT_RADIUS } from './engine/map-constants'
import { pointPop } from './engine/map-motion'
import type { LngLat } from './engine/types'
import { MapDot } from './map-dot'
import { MapDotHalo } from './map-halo'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** Props for {@link MapPoint}. */
export type MapPointProps = MapOverlayProps & {
	/** The point's geographic position. */
	at: LngLat
}

/**
 * A solid circle marker at one coordinate — a warehouse, a stop, a geocoded
 * address — filled in its slot colour and registered in the plat's legend as
 * its own toggleable, focusable entry. Hovering raises the tooltip with the
 * point's name and detail and isolates the dot — every other mark recedes,
 * as under its legend entry's focus; an invisible hit circle keeps the dot
 * aimable. With `onClick` set, that circle answers a click and the keyboard
 * cursor picks the point with Enter or Space; the plat's `selectedOverlay`
 * haloes the dot for as long as it names this mark.
 *
 * @remarks Renders only inside {@link MapPlat}, and renders nothing when the
 * projection has no image for its position (the US composite drops points
 * outside its insets). The dot rides device pixels (a non-scaling stroke),
 * so a resize scales the geography under it without changing its size. Under
 * the plat's `animate` the dot pops in, staggered by its registration order
 * so a cluster of points reveals in sequence.
 */
export function MapPoint({ at, ...shared }: MapPointProps) {
	const { slot, hidden, project, animate, order, dim, selected, onPointerLeave, hit } =
		useMapOverlay({
			...shared,
			kind: 'point',
			swatch: 'dot',
			stops: () => [at],
		})

	const position = project(at)

	if (slot === undefined || hidden || position === null) return null

	return (
		<>
			{selected !== null && (
				<MapDotHalo slot="map-point-selected" at={position} radius={POINT_RADIUS} />
			)}

			<g className={dim} onPointerLeave={onPointerLeave}>
				<MapDot
					slot="map-point"
					at={position}
					radius={POINT_RADIUS}
					className={cn(k.series[slot].stroke)}
					animate={animate}
					transition={pointPop(order)}
				/>

				<circle
					data-slot="map-point-hit"
					cx={position.x}
					cy={position.y}
					r={POINT_HIT_RADIUS}
					fill="transparent"
					{...hit()}
				/>
			</g>
		</>
	)
}
