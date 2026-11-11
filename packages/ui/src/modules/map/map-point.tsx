'use client'

import { useCallback, useId, useMemo } from 'react'
import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/map'
import { markTargets } from './engine/map-cluster/crowd'
import { ownGround } from './engine/map-cluster/ground'
import { POINT_RADIUS, POINT_SWATCH } from './engine/map-constants'
import { dotReach } from './engine/map-geometry/mark'
import { pointPop } from './engine/map-motion'
import type { MapEntryDot } from './engine/map-overlay/entry'
import type { LngLat, MapPointShape } from './engine/types'
import { dotHitProps, MapDot, MapDotClip } from './map-dot'
import { MapDotHalo } from './map-halo'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** Props for {@link MapPoint}. */
export type MapPointProps = MapOverlayProps & {
	/** The point's geographic position. */
	at: LngLat
	/**
	 * The shape of the dot, its halo, and its legend swatch. A square sets one
	 * kind of point apart from another on the same map.
	 * @defaultValue 'circle'
	 */
	shape?: MapPointShape
}

/**
 * A solid circle or square dot at one coordinate, such as a warehouse, a stop,
 * or a geocoded address. It fills in its slot color, and the plat's legend
 * registers it as its own toggleable, focusable entry. A hover raises the
 * tooltip with the point's name and detail. It also isolates the dot: every
 * other mark recedes, as under the focus of its legend entry.
 *
 * An invisible hit circle keeps the dot aimable. With `onClick` set, the hit
 * circle answers a click, and the keyboard cursor picks the point with Enter or
 * Space. The plat's `selectedOverlay` haloes the dot while it names this mark.
 *
 * The dot of another mark can stand so close that the two targets overlap. The
 * hit circle then clips to the ground nearer to this dot than to that one. Thus
 * each target keeps its whole reach outward, and the line midway between the
 * dots divides the contested middle evenly. Where midway falls inside the face of
 * a wider summary, the line moves to the edge of that face, so each dot keeps
 * what it paints. Without the clip, the dot that draws last takes the whole
 * overlap and the tooltip of the other dot.
 *
 * For a mouse, the hit circle narrows to what the ground under it can spare.
 * Two things can want that ground. A {@link MapGeofence} that the map draws
 * takes half the room of its zone, so the zone keeps a band of its own face
 * pointable. A zone wide enough to spare the whole target gives the whole
 * target, and a zone toggled off in the legend gives the ground back.
 *
 * A region layer that answers the pointer takes a share of its own room on the
 * same terms. The dot is the topmost thing at its own pixels, so a full target
 * over such a shape puts a 44px hole in it. A dot near the middle of a small
 * region can make that region unpickable. A region answers the pointer when a
 * readout, a preload, or a right-click menu reads it, not only on a click. A
 * region with room to spare gives the whole target back.
 *
 * Both narrowings are for a mouse only, on a device with no coarse pointer. A
 * device with a touchscreen keeps the whole 44px target (WCAG 2.5.5) for each
 * pointer, because CSS cannot tell which pointer a press comes from. A finger
 * cannot aim at 11px, and the shapes that compete with it are large enough to
 * reach elsewhere.
 *
 * @remarks Renders only inside {@link MapPlat}, and renders nothing when the
 * projection has no image for its position (the US composite drops points
 * outside its insets). The dot is sized in device pixels, so a zoom widens the
 * ground under it and never the dot. Under the plat's `animate` the dot pops
 * in, staggered by its registration order so a cluster of points reveals in
 * sequence.
 */
export function MapPoint({ at, shape = 'circle', ...shared }: MapPointProps) {
	const [lng, lat] = at

	// Keyed on the ordinates rather than on `at`, for the reason `position` below states. A new
	// identity tells the plat's pool that the point moved.
	const stops = useCallback((): LngLat[] => [[lng, lat]], [lng, lat])

	// What the shape paints out to, so the floor of a square's target covers its corners, and a
	// neighbor's cut stops clear of them.
	const reach = dotReach(POINT_RADIUS, shape)

	const dots = useCallback(
		(): MapEntryDot[] => [{ at: [lng, lat], radius: reach }],
		[lng, lat, reach],
	)

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
		neighbors,
		hit,
	} = useMapOverlay({
		...shared,
		kind: 'point',
		swatch: POINT_SWATCH[shape],
		stops,
		dots,
	})

	const clipId = `${useId()}-hit`

	/*
	 * Keyed on the ordinates rather than on `at`, and memoized rather than called inline, because
	 * `projectPoint` hands back a fresh `{ x, y }` per call. An unmemoized position is therefore a
	 * new identity every render, and the `ground` memo below, whose first dep it is, would never hold.
	 * `LngLat` is a tuple, so an inline `at={[15, 5]}` is a fresh array every render too.
	 */
	const position = useMemo(() => project([lng, lat]), [project, lng, lat])

	/*
	 * The ground this dot keeps, once every other mark's dots are accounted for. `null` (no neighbor
	 * close enough to want any) is the answer for almost every dot, and draws no clip at all.
	 *
	 * Memoized, and above the early return so the hook order cannot depend on visibility. This mark
	 * re-renders each time its dim changes, which a crossing onto or off any mark does (`useMapOverlay`
	 * reads `dim` from the pointed store). None of these three inputs moves when a pointer crosses, the
	 * same reason `MapPoints` memoizes its own `targets`. Unmemoized it re-pooled every other mark's
	 * dots and re-ran the bisector clips per crossing. It also handed `MapDotClip` a fresh ring that
	 * defeated its own memo in turn.
	 */
	const ground = useMemo(
		() =>
			position === null
				? null
				: ownGround({ at: position, radius: reach }, neighbors(), unitsPerPixel),
		[position, reach, neighbors, unitsPerPixel],
	)

	/*
	 * The shared rule, through the one dot this mark draws: memoized beside `ground` and for the
	 * same reason. A lone dot has no neighbor of its own, so a zone or the region layer under it is
	 * what can answer. The rule stays in one place, so a third claim reaches this mark without it
	 * being edited.
	 *
	 * It sat below the guard while `spare` was a boolean read and a short loop over the zone ledger.
	 * The region half made it two projection inverts and a grid walk per call, which is more than a
	 * toggled-off mark saves by skipping it. `ground` above already pays that trade the other
	 * way round.
	 */
	const target = useMemo(
		() =>
			position === null
				? undefined
				: markTargets([{ at: position, radius: reach }], unitsPerPixel, spare)[0],
		[position, reach, unitsPerPixel, spare],
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
					shape={shape}
					scale={unitsPerPixel}
				/>
			)}

			<g className={dim} onPointerLeave={onPointerLeave}>
				<MapDot
					slot="map-point"
					at={position}
					radius={POINT_RADIUS}
					shape={shape}
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
						target,
						clip,
					})}
				/>

				{ground !== null && <MapDotClip id={clipId} ground={ground} />}
			</g>
		</>
	)
}
