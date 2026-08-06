'use client'

import { Fragment, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { rangeKeys } from '../../utilities'
import { POINT_HIT_RADIUS, POINT_RADIUS } from './map-constants'
import { MapDot } from './map-dot'
import { pointPop } from './map-motion'
import type { LngLat } from './types'
import { type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** One dot of a {@link MapPoints}. */
export type MapPointDatum = {
	/** The dot's geographic position. */
	at: LngLat
	/**
	 * This dot's tooltip and table name. Omitted, the dot is numbered within its
	 * group — `Stops 3` — since a reader has no position to tell two unnamed dots
	 * apart by.
	 */
	label?: string
	/**
	 * This dot's trailing readout, independent of {@link label}. It never falls
	 * back to the group's `detail`: that describes the set, so a dot with no count
	 * of its own would misreport itself as the whole round.
	 */
	detail?: string
}

/** Props for {@link MapPoints}. */
export type MapPointsProps = Omit<MapOverlayProps, 'onClick' | 'onContextMenu'> & {
	/** The dots, in the order they draw and the order the cursor walks them. */
	points: MapPointDatum[]
	/**
	 * Fires when a click lands on a dot, with the group's `id` and the dot's index
	 * in {@link points} — so a click keys straight back into the caller's own row.
	 *
	 * Set, every dot carries a pointer cursor, and the keyboard cursor picks the
	 * dot it stands on with Enter or Space.
	 */
	onClick?: (id: string, index: number) => void
	/** Fires on a right-click, with the same pair {@link onClick} reports. */
	onContextMenu?: (id: string, index: number) => void
}

/**
 * A set of dots under one legend entry — a fleet's stops, a chain's branches,
 * a survey's sites — filled in one slot colour and toggled as one. The group is
 * the mark: it registers once, draws one legend row, and takes the emphasis
 * whole, so hovering any dot isolates the set rather than the dot.
 *
 * Each dot keeps its own readout and its own pick. Hovering one raises the
 * tooltip with that dot's name and detail, falling back to the group's; the
 * keyboard cursor walks the dots one at a time, and `onClick` reports which was
 * picked. An invisible hit circle per dot keeps each aimable.
 *
 * @remarks Renders only inside {@link MapPlat}. Prefer this to a `MapPoint` per
 * position past a handful: `MapPoint` registers its own legend entry, so two
 * hundred of them cost two hundred state commits, two hundred re-sorts, and two
 * hundred legend rows against an eight-slot palette. This costs one of each.
 *
 * A dot whose position the projection has no image for is omitted — the US
 * composite drops points outside its insets — and the rest keep their indices,
 * so the index a click reports always names the caller's own point. Under the
 * plat's `animate` the dots pop in staggered, so the set reveals in sequence.
 */
export function MapPoints({ points, ...shared }: MapPointsProps) {
	const { slot, hidden, project, animate, dim, onPointerLeave, hit } = useMapOverlay({
		...shared,
		kind: 'point',
		swatch: 'dot',
		// A thunk, so the O(N) build lands on the one keypress that reads it.
		stops: () => points.map((point) => point.at),
		stopRows: points,
	})

	// Held across re-renders: rebuilding them would allocate one string per dot
	// every time, which is the cost this mark exists to remove.
	const keys = useMemo(() => rangeKeys(points.length, 'dot'), [points.length])

	if (slot === undefined || hidden) return null

	const paint = cn(k.series[slot].stroke)

	return (
		<g data-slot="map-points" className={dim} onPointerLeave={onPointerLeave}>
			{points.map((point, index) => {
				const position = project(point.at)

				if (position === null) return null

				return (
					// A Fragment, not a group: the wrapper would carry nothing — the dim
					// class and the pointer-leave sit on the outer group — and two hundred
					// dead containers is what this mark exists to avoid. Keyed on the
					// module's own row keys, since the index is also the dot's identity to
					// the cursor and to `onClick`.
					<Fragment key={keys[index]}>
						<MapDot
							slot="map-points-dot"
							at={position}
							radius={POINT_RADIUS}
							className={paint}
							animate={animate}
							transition={pointPop(index)}
						/>

						<circle
							data-slot="map-points-hit"
							cx={position.x}
							cy={position.y}
							r={POINT_HIT_RADIUS}
							fill="transparent"
							{...hit(index)}
						/>
					</Fragment>
				)
			})}
		</g>
	)
}
