'use client'

import { Fragment, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { rangeKeys } from '../../utilities'
import { useMapPlat, useMapZoomScale } from './context'
import { clusterAnchor, clusterSpan } from './engine/map-cluster/geo'
import { clusterGap, clusterPoints, groupsByMember } from './engine/map-cluster/group'
import { clusterRadius } from './engine/map-cluster/radius'
import { POINT_HIT_RADIUS } from './engine/map-constants'
import { pointPop } from './engine/map-motion'
import type { MapStopRow } from './engine/map-overlay/entry'
import type { LngLat } from './engine/types'
import { MapDot, MapDotCount } from './map-dot'
import { MapDotHalo } from './map-halo'
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
	 * Draw dots the frame puts too close together to tell apart as one summary
	 * dot, whose size grades with how many stops it holds and whose label carries
	 * the count. A number sets the clear space, in device pixels, two marks keep
	 * between their edges before they merge — edge to edge, so the one number
	 * holds however wide a summary grows, and `0` lets marks touch but never
	 * overlap. A negative gap would ask for the overlap this exists to remove, so
	 * it reads as `0`.
	 *
	 * Grouping reads the drawn frame, not the data, so it answers the scale the
	 * map is at: a national frame summarises a metro round to one mark, and the
	 * same round separates into its own dots as the frame narrows to the state.
	 * A summary is one mark to everything downstream — one tooltip, one keyboard
	 * stop, one table row, one pick — so the picture, the readout, and the cursor
	 * can never disagree about what is on the map.
	 *
	 * `false` draws every dot, however they stack.
	 * @defaultValue true
	 */
	cluster?: boolean | number
	/**
	 * The trailing readout a summary dot carries, from the stops it holds and how
	 * far they spread — the diameter, in metres, of the circle about the group
	 * that holds every one of them. The module formats no distances of its own, so
	 * a caller that wants the spread in the readout states the units it works in:
	 * `` (count, span) => `${count} stops · ${miles(span)} across` ``.
	 * @defaultValue the count alone
	 */
	clusterDetail?: (count: number, span: number) => string
	/**
	 * Fires when a click lands on a dot, with the group's `id` and the dot's index
	 * in {@link points} — so a click keys straight back into the caller's own row.
	 * A summary dot reports the first of the stops it holds, so a pick always
	 * names a real point.
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
 * Dots the frame draws on top of one another summarise into a single graded
 * mark carrying their count, and separate back into themselves as the frame
 * widens on them — see {@link MapPointsProps.cluster}.
 *
 * Each dot keeps its own readout and its own pick. Hovering one raises the
 * tooltip with that dot's name and detail, falling back to the group's; the
 * keyboard cursor walks the dots one at a time, and `onClick` reports which was
 * picked. An invisible hit circle per dot keeps each aimable. The plat's
 * `selectedOverlay` haloes the dot holding the picked point — the summary it
 * merged into where the frame draws one.
 *
 * @remarks Renders only inside {@link MapPlat}. Prefer this to a `MapPoint` per
 * position past a handful: `MapPoint` registers its own legend entry, so two
 * hundred of them cost two hundred state commits, two hundred re-sorts, and two
 * hundred legend rows against an eight-slot palette. This costs one of each.
 *
 * A dot whose position the projection has no image for is omitted — the US
 * composite drops points outside its insets — and the rest keep their readouts,
 * so the index a click reports always names the caller's own point. Under the
 * plat's `animate` the dots pop in staggered, so the set reveals in sequence.
 */
export function MapPoints({
	points,
	cluster = true,
	clusterDetail,
	onClick,
	onContextMenu,
	...shared
}: MapPointsProps) {
	// The projector, read here rather than off the registration below: the stops
	// and the readouts this mark registers are the summarised ones, and a summary
	// is a fact about the projected frame — so the grouping has to resolve before
	// the mark registers, not after.
	const { project } = useMapPlat()

	// What one device pixel spans in the drawn frame. The merge distance is a
	// pixel distance, so a zoom that spreads the dots on screen has to loosen the
	// reach they are measured against — otherwise the summaries a national frame
	// drew would stay merged however far the view closed on them.
	const unitsPerPixel = useMapZoomScale()

	const gap = clusterGap(cluster)

	const positions = useMemo(() => points.map((point) => point.at), [points])

	const groups = useMemo(
		() => clusterPoints(positions, project, gap, unitsPerPixel),
		[positions, project, gap, unitsPerPixel],
	)

	// A lone dot reads out as itself, so an ungrouped set reads exactly as the
	// points the caller passed. A summary reads as the mark, since it stands for
	// the whole group and no one of its stops names it.
	const rows = useMemo<MapStopRow[]>(
		() =>
			groups.map(({ members }) => {
				const count = members.length

				const first = members[0]

				const lone = first === undefined ? undefined : points[first]

				// Numbered by the caller's own index, never the group's: a click on this
				// dot reports that index, and a readout counting in another space would
				// name a row the caller cannot find — and would renumber itself as the
				// frame regrouped around it.
				if (count === 1 && first !== undefined && lone !== undefined) {
					return { label: lone.label ?? `${shared.label} ${first + 1}`, detail: lone.detail }
				}

				return {
					label: shared.label,
					// The spread costs a spherical pass per group, so only a caller that
					// reads it pays for it.
					detail:
						clusterDetail === undefined
							? String(count)
							: clusterDetail(count, clusterSpan(members, positions)),
				}
			}),
		[groups, points, positions, shared.label, clusterDetail],
	)

	// Which drawn dot each point landed in, built on the first read and held from
	// there: the pick reads it on every render a pointed-mark crossing costs, and
	// only a regrouping can change the answer — but a map with no pick never reads
	// it at all, and must not pay a lookup per dot to draw one.
	const stopOf = useMemo(() => {
		let held: ReadonlyMap<number, number> | null = null

		return (index: number) => {
			if (held === null) held = groupsByMember(groups)

			return held.get(index) ?? null
		}
	}, [groups])

	// The caller counts in points; everything inside this mark counts in drawn
	// groups. A summary hands back the first stop it holds, so a pick names a row
	// the caller owns rather than a grouping it never asked for.
	const report = (handler: ((id: string, index: number) => void) | undefined) => {
		if (handler === undefined) return undefined

		return (id: string, group: number) => {
			const first = groups[group]?.members[0]

			if (first !== undefined) handler(id, first)
		}
	}

	const { slot, hidden, animate, dim, selected, onPointerLeave, hit } = useMapOverlay({
		...shared,
		kind: 'point',
		swatch: 'dot',
		// A thunk, so the O(N) build — and the spherical centroid behind every
		// summary's anchor — lands on the one keypress that reads it.
		stops: () => groups.map((group) => clusterAnchor(group.members, positions)),
		stopRows: rows,
		// The inverse of `report` above: a pick names the caller's own point, and
		// this reads back which drawn dot holds it — so the halo and the picked row
		// answer the grouping the frame currently draws, not the one the pick was
		// made against.
		stopOf,
		onClick: report(onClick),
		onContextMenu: report(onContextMenu),
	})

	// The picked dot itself, off that same grouping: a pick that merged into a
	// summary haloes the summary, and separates onto its own dot as the frame
	// widens around it.
	const picked = selected === null ? null : groups[selected]

	// Held across re-renders: rebuilding them would allocate one string per dot
	// every time, which is the cost this mark exists to remove.
	const keys = useMemo(() => rangeKeys(groups.length, 'dot'), [groups.length])

	if (slot === undefined || hidden) return null

	const paint = cn(k.series[slot].stroke)

	const countInk = cn('text-xs font-semibold tabular-nums', k.series[slot].onFill)

	return (
		<>
			{picked?.at != null && (
				<MapDotHalo
					slot="map-points-selected"
					at={picked.at}
					radius={clusterRadius(picked.members.length)}
				/>
			)}

			<g data-slot="map-points" className={dim} onPointerLeave={onPointerLeave}>
				{groups.map((group, index) => {
					const position = group.at

					if (position === null) return null

					const count = group.members.length

					const radius = clusterRadius(count)

					// One timing for the pair: the count fades in with the dot it sits in.
					const pop = pointPop(index)

					return (
						// A Fragment, not a group: the wrapper would carry nothing — the dim
						// class and the pointer-leave sit on the outer group — and two hundred
						// dead containers is what this mark exists to avoid. Keyed on the
						// module's own row keys, since the index is also the dot's identity to
						// the cursor and to `onClick`.
						<Fragment key={keys[index]}>
							<MapDot
								slot={count === 1 ? 'map-points-dot' : 'map-points-cluster'}
								at={position}
								radius={radius}
								className={paint}
								animate={animate}
								transition={pop}
							/>

							{count > 1 && (
								<MapDotCount
									at={position}
									count={count}
									className={countInk}
									scale={unitsPerPixel}
									animate={animate}
									transition={pop}
								/>
							)}

							<circle
								data-slot="map-points-hit"
								cx={position.x}
								cy={position.y}
								// A finger target is a pixel measure, so the radius converts
								// through the zoom: left in frame units it would grow with the
								// scale and answer for ground the dot is nowhere near.
								r={POINT_HIT_RADIUS * unitsPerPixel}
								fill="transparent"
								{...hit(index)}
							/>
						</Fragment>
					)
				})}
			</g>
		</>
	)
}
