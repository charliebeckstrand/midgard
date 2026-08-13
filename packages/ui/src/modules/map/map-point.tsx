'use client'

import { useId, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { markTargets } from './engine/map-cluster/crowd'
import { ownGround } from './engine/map-cluster/ground'
import { POINT_HIT_RADIUS, POINT_RADIUS } from './engine/map-constants'
import { pointPop } from './engine/map-motion'
import type { LngLat } from './engine/types'
import { dotHitProps, MapDot, MapDotClip } from './map-dot'
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
 * Where another mark's dot stands close enough that the two targets would overlap, the circle is
 * clipped to the ground nearer to this dot than to that one — so it keeps its whole finger-sized reach
 * outward and the contested middle divides once, evenly, along the line midway between them. Before
 * this, both kept the whole circle and the overlap answered for whichever drew last, taking the other
 * dot's tooltip with it.
 *
 * That circle is a finger-sized target, and for a mouse it narrows to what the
 * ground under it can spare. Two things can want that ground. A {@link MapGeofence}
 * the map is drawing takes half the room that zone holds, so the zone keeps a band
 * of its own face pointable and a zone wide enough to spare the whole target gives
 * the whole target; toggle the zone off in the legend and the point has its ground
 * to itself again. And a region layer that answers clicks takes it down to the
 * radius the dot paints at, because the dot is the topmost thing at its own pixels
 * — a full target over a clickable shape puts a 44px hole in it, and a dot near the
 * middle of a small region can make that region unpickable altogether.
 *
 * Both narrowings are for a MOUSE only. A coarse pointer keeps the whole 44px
 * target (WCAG 2.5.5): a finger cannot aim at 11px, and the shapes it is competing
 * with are large enough to reach somewhere else.
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
		neighbours,
		hit,
	} = useMapOverlay({
		...shared,
		kind: 'point',
		swatch: 'dot',
		stops: () => [at],
	})

	// Sanitised, because `useId` spells its output with characters a fragment reference cannot carry.
	const clipId = `${useId().replace(/[^\w-]/g, '')}-hit`

	const [lng, lat] = at

	/*
	 * Keyed on the ordinates rather than on `at`, and memoised rather than called inline, because
	 * `projectPoint` hands back a fresh `{ x, y }` per call — so an unmemoised position is a new
	 * identity every render and the `ground` memo below, whose first dep it is, would never hold.
	 * `LngLat` is a tuple, so an inline `at={[15, 5]}` is a fresh array every render too.
	 */
	const position = useMemo(() => project([lng, lat]), [project, lng, lat])

	/*
	 * The ground this dot keeps, once every other mark's dots are accounted for. `null` — no neighbour
	 * close enough to want any — is the answer for almost every dot, and draws no clip at all.
	 *
	 * Memoised, and above the early return so the hook order cannot depend on visibility. This mark
	 * re-renders on every pointer crossing of every mark on the map (`useMapOverlay` subscribes to the
	 * pointed mark to resolve `dim`), and none of these three inputs moves when a pointer crosses —
	 * the same reason `MapPoints` memoises its own `targets`. Unmemoised it re-pooled every other
	 * mark's dots and re-ran the bisector clips per crossing, and handed `MapDotClip` a fresh ring
	 * that defeated its own memo in turn.
	 */
	const ground = useMemo(
		() =>
			position === null
				? null
				: ownGround(position, neighbours(), POINT_HIT_RADIUS * unitsPerPixel),
		[position, neighbours, unitsPerPixel],
	)

	if (slot === undefined || hidden || position === null) return null

	const clip = ground === null ? undefined : clipId

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
						clip,
					})}
				/>

				{ground !== null && <MapDotClip id={clipId} ground={ground} />}
			</g>
		</>
	)
}
