'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { markTargets } from './engine/map-cluster/crowd'
import { POINT_RADIUS } from './engine/map-constants'
import { pointPop } from './engine/map-motion'
import type { LngLat } from './engine/types'
import { dotHitProps, MapDot } from './map-dot'
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
 * That circle is a finger-sized target, and for a mouse it narrows to what the
 * ground under it can spare while the point stands on a {@link MapGeofence} the
 * map is drawing — half the room that zone holds, so the zone keeps a band of its
 * own face pointable and a zone wide enough to spare the whole target gives the
 * whole target. Toggle the zone off in the legend and the point has its ground to
 * itself again, so the target goes back to the full size.
 *
 * @remarks Renders only inside {@link MapPlat}, and renders nothing when the
 * projection has no image for its position (the US composite drops points
 * outside its insets). The dot is sized in device pixels, so a zoom widens the
 * ground under it and never the dot. Under the plat's `animate` the dot pops
 * in, staggered by its registration order so a cluster of points reveals in
 * sequence.
 */
export function MapPoint({ at, ...shared }: MapPointProps) {
	const {
		slot,
		hidden,
		project,
		spare,
		unitsPerPixel,
		animate,
		order,
		dim,
		selected,
		onPointerLeave,
		hit,
	} = useMapOverlay({
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
				<MapDotHalo
					slot="map-point-selected"
					at={position}
					radius={POINT_RADIUS}
					scale={unitsPerPixel}
				/>
			)}

			<g className={dim} onPointerLeave={onPointerLeave}>
				<MapDot
					slot="map-point"
					at={position}
					radius={POINT_RADIUS}
					scale={unitsPerPixel}
					className={cn(...k.series[slot].stroke)}
					animate={animate}
					transition={pointPop(order)}
				/>

				<circle
					{...dotHitProps({
						slot: 'map-point-hit',
						at: position,
						hit: hit(),
						scale: unitsPerPixel,
						// The shared rule, through the one dot this mark draws. A lone dot has
						// no neighbour of its own, so a zone under it is what can answer — but
						// the rule stays in one place, and a third claim on the ground would
						// reach this mark without it being edited.
						target: markTargets([{ at: position, radius: POINT_RADIUS }], unitsPerPixel, spare)[0],
					})}
				/>
			</g>
		</>
	)
}
