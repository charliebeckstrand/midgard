'use client'

import {
	Fragment,
	memo,
	type ReactNode,
	startTransition,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react'
import { cn } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { getOrCompute, rangeKeys } from '../../utilities'
import { useMapPlat, useMapPointed, useMapZoomScale } from './context'
import { markTargets } from './engine/map-cluster/crowd'
import { clusterAnchor, clusterSpan } from './engine/map-cluster/geo'
import { clusterGap, groupsByMember } from './engine/map-cluster/group'
import {
	groupSets,
	type MapClusterInput,
	type MapSetCluster,
	type MapSharedCluster,
} from './engine/map-cluster/sets'
import { POINT_RADIUS } from './engine/map-constants'
import { type MapHoverTarget, mapMarkDimmed } from './engine/map-hover/target'
import { POINT_REVEAL_SETTLE, pointPop } from './engine/map-motion'
import type { MapStopRow } from './engine/map-overlay/entry'
import { stopName } from './engine/map-overlay/readout'
import { type LngLat, type MapPoint2D, type MapPointShape, POINT_SWATCH } from './engine/types'
import { dotHitProps, MapDot, MapDotCount, MapDotRing } from './map-dot'
import { MapDotHalo } from './map-halo'
import { type MapOverlay, type MapOverlayProps, useMapOverlay } from './use-map-overlay'

/** One dot of a {@link MapPoints}. */
export type MapPointDatum = {
	/** The dot's geographic position. */
	at: LngLat
	/**
	 * This dot's tooltip and table name. Omitted, the dot is numbered within its
	 * group (`Stops 3`), since a reader has no position to tell two unnamed dots
	 * apart by.
	 */
	label?: string
	/**
	 * This dot's trailing readout, independent of {@link label}. It never falls
	 * back to the group's `detail`. That describes the set, so a dot with no count
	 * of its own would misreport itself as the whole round.
	 */
	detail?: string
	/**
	 * This dot's own color, where the stops divide into kinds the reader is meant
	 * to tell apart: a place's category, a stop's status. Omitted, the dot takes
	 * the mark's slot color, which is the whole of an undivided set.
	 *
	 * A summary dot keeps the mark's color whatever its members carry. It stands
	 * for several stops at once, so any one of their colors would name it wrongly.
	 * That is what lets a set both cluster and stay legible. The merges read as
	 * merges, and the dots that did not merge say what they are.
	 *
	 * The mark still registers ONE legend entry in its own slot, because it is one
	 * mark. A reader who needs the kinds named wants a key beside the map: a
	 * filter listing them, or a legend of its own. These colors are what that key
	 * points at. The swatch of the dot's tooltip takes the dot's color.
	 */
	color?: MapSeriesColor
	/**
	 * This dot's own shape, where the stops divide into kinds of a different
	 * level, such as a trip beside the places it passes. Omitted, the dot takes
	 * the mark's {@link MapPointsProps.shape}.
	 *
	 * A summary takes the shape that all of its members share. A summary of
	 * mixed shapes takes the mark's shape, so the caller sets the mark's shape to
	 * the one that a mixed summary must show. The swatch of a tooltip takes the
	 * shape of the dot under the pointer.
	 */
	shape?: MapPointShape
}

/** Props for {@link MapPointsDots}: everything the drawn dots read, none of the emphasis. @internal */
type MapPointsDotsProps = {
	groups: MapSetCluster[]
	/** One stable React key per drawn group. */
	keys: string[]
	/** Each drawn group's radius, in device pixels. */
	radii: number[]
	/** What each dot's fine-pointer target can reach, in device pixels. */
	targets: number[]
	/** Each drawn group's own stroke class, where a lone dot carries a color of its own. */
	paints: string[]
	/** The ink a summary's count is written in. */
	countInk: string
	/** The shape of each drawn group. */
	shapes: MapPointShape[]
	/** Whether the dots pop in: the reveal of the mark still runs (see {@link MapPointsReveal}). */
	pops: boolean
	/** Frame units per device pixel, which the hit radii and the counts divide by. */
	unitsPerPixel: number
	/** The mark's hit plumbing, per drawn group. */
	hit: MapOverlay['hit']
}

/**
 * The drawn dots. Deliberately blind to the pointed mark and to the legend
 * emphasis. The recede class and the pointer-leave sit on the wrapper above. A
 * pointer crossing anywhere on the map therefore re-renders that wrapper, and
 * this holds its render. It is `MapRegionsBase`'s treatment, for the same reason
 * and at a similar count. Two hundred dots each rebuild a `MapDot`, an optional
 * count, a hit circle, and two prop objects.
 *
 * The crossing that matters most is the one that does not concern this mark at
 * all. The pointed-mark context republishes on every discrete crossing, region
 * to region included, and `dim` does not change on those. Without the memo the
 * whole set rebuilt to produce the output it already had.
 *
 * @internal
 */
const MapPointsDots = memo(function MapPointsDots({
	groups,
	keys,
	radii,
	targets,
	paints,
	countInk,
	shapes,
	pops,
	unitsPerPixel,
	hit,
}: MapPointsDotsProps) {
	return (
		<>
			{groups.map((group, index) => {
				const position = group.at

				// A shared summary draws outside this layer (`MapPointsShared`), because
				// it answers the emphasis of each of its sets, not of this set alone.
				if (position === null || group.shared !== undefined) return null

				const count = group.members.length

				// `?? POINT_RADIUS` for the indexed read alone: `radii` is built from the
				// same `groups` this maps.
				const radius = radii[index] ?? POINT_RADIUS

				// One timing for the pair: the count fades in with the dot it sits in.
				const pop = pointPop(index)

				return (
					// A Fragment, not a group: the wrapper would carry nothing (the dim
					// class and the pointer-leave sit on the outer group) and two hundred
					// dead containers is what this mark exists to avoid. Keyed on the
					// module's own row keys, since the index is also the dot's identity to
					// the cursor and to `onClick`.
					<Fragment key={keys[index]}>
						<MapDot
							slot={count === 1 ? 'map-points-dot' : 'map-points-cluster'}
							at={position}
							radius={radius}
							shape={shapes[index]}
							scale={unitsPerPixel}
							// `?? ''` for the indexed read alone: `paints` is built from the same
							// `groups` this maps, so every rendered index has one.
							className={paints[index] ?? ''}
							animate={pops}
							transition={pop}
						/>

						{count > 1 && (
							<MapDotCount
								at={position}
								count={count}
								className={countInk}
								scale={unitsPerPixel}
								animate={pops}
								transition={pop}
							/>
						)}

						<circle
							{...dotHitProps({
								slot: 'map-points-hit',
								at: position,
								hit: hit(index),
								scale: unitsPerPixel,
								target: targets[index],
							})}
						/>
					</Fragment>
				)
			})}
		</>
	)
})

/** Props for {@link MapPointsReveal}. @internal */
type MapPointsRevealProps = {
	animate: boolean
	/** Whether the mark draws a dot now. */
	drawn: boolean
	/** Draws the layers of the mark, told whether the dots pop in. */
	children: (pops: boolean) => ReactNode
}

/**
 * Holds the mount reveal of a {@link MapPoints}. The pop and its stagger belong
 * to the reveal alone. A zoom that splits a summary adds dots at the end of the
 * set, and under the reveal's timing each one waited out the stagger of its
 * index before it popped. After the reveal, a dot that a regroup adds draws at
 * once, as a dot that a regroup resizes already does (`MapDot`).
 *
 * The clock runs from the first commit that draws a dot, since a set can mount
 * empty and fill later. A one-way flag: a hidden mark unmounts this component,
 * so a toggle that shows the mark again reveals it again. A component of its own,
 * so that the dots and the shared summaries of the mark read one clock.
 *
 * @internal
 */
function MapPointsReveal({ animate, drawn, children }: MapPointsRevealProps) {
	const [revealing, setRevealing] = useState(animate)

	useEffect(() => {
		if (!animate || !drawn) return

		const timer = setTimeout(
			() => startTransition(() => setRevealing(false)),
			POINT_REVEAL_SETTLE * 1000,
		)

		return () => clearTimeout(timer)
	}, [animate, drawn])

	return children(animate && revealing)
}

/** Whether every set of a shared summary reads dimmed, so the summary dims. @internal */
function sharedDimmed(
	summary: MapSharedCluster,
	pointed: MapHoverTarget | null,
	emphasis: string | null,
): boolean {
	return summary.parts.every((part) =>
		mapMarkDimmed(pointed, { kind: 'entry', id: part.id, stop: 0 }, emphasis, part.legend),
	)
}

/** Props for {@link MapPointsShared}. @internal */
type MapPointsSharedProps = {
	summary: MapSharedCluster
	/** The index of the summary in the groups of the set that draws it, which is its stop. */
	index: number
	/** Where the summary draws, in frame units. */
	at: MapPoint2D
	/** The radius of the summary, in device pixels. */
	radius: number
	/** What a fine pointer's target can reach, in device pixels (see `dotHitProps`). */
	target: number | undefined
	pops: boolean
	unitsPerPixel: number
	/** The hit plumbing of the set that draws the summary. */
	hit: MapOverlay['hit']
	onPointerLeave: () => void
}

/**
 * One shared summary: a summary that holds the dots of more than one set. The
 * first of its sets draws it, as a disc in the surface color with the count on
 * it and a ring split into the colors of its sets ({@link MapDotRing}). It is a
 * circle whatever the shapes of its dots, because the ring is its key.
 *
 * It sits in a group of its own, which dims only where every one of its sets
 * dims. Pointing a set, or its legend row, therefore keeps the summary that holds
 * its dots lit.
 *
 * The pointer reaches it through one hit circle, the circle of the set that
 * draws it, so the readout shows each part (`MapTooltip`). A click picks each
 * part through the pick of its own set, and a right-click reports each part the
 * same way. The keyboard reaches it as one stop, which reads and picks every
 * part.
 *
 * @internal
 */
function MapPointsShared({
	summary,
	index,
	at,
	radius,
	target,
	pops,
	unitsPerPixel,
	hit,
	onPointerLeave,
}: MapPointsSharedProps) {
	const { colors, report } = useMapPlat()

	const dimmed = useMapPointed((pointed, emphasis) => sharedDimmed(summary, pointed, emphasis))

	const arcs = summary.parts.map((part) => {
		const color = colors.get(part.id)

		return {
			id: part.id,
			count: part.members.length,
			paint: color === undefined ? '' : cn(...k.series[color].stroke),
		}
	})

	const picks = summary.parts.some((part) => part.pickable)

	const menus = summary.parts.some((part) => part.menuable)

	// The plat reports a click to every part, as it reports a keyboard or touch
	// pick (`map-plat.tsx`), so each input picks the whole summary.
	const own = hit(index)

	const named = { kind: 'entry', id: own['data-entry-id'], stop: index } as const

	const reach = {
		...own,
		className: picks ? k.clickable : undefined,
		onClick: picks ? () => report(named, 'activate') : undefined,
		onContextMenu: menus ? () => report(named, 'menu') : undefined,
	}

	// One timing for the set: the ring and the count fade in with the disc.
	const pop = pointPop(index)

	return (
		<g
			data-slot="map-points-shared"
			className={cn(...k.group(dimmed))}
			onPointerLeave={onPointerLeave}
		>
			<MapDot
				slot="map-points-cluster"
				at={at}
				radius={radius}
				scale={unitsPerPixel}
				className={cn(...k.shared.disc)}
				animate={pops}
				transition={pop}
			/>

			<MapDotRing
				at={at}
				radius={radius}
				arcs={arcs}
				scale={unitsPerPixel}
				animate={pops}
				transition={pop}
			/>

			<MapDotCount
				at={at}
				count={summary.count}
				className={cn('text-xs font-semibold tabular-nums', ...k.shared.count)}
				scale={unitsPerPixel}
				animate={pops}
				transition={pop}
			/>

			<circle
				{...dotHitProps({
					slot: 'map-points-hit',
					at,
					hit: reach,
					scale: unitsPerPixel,
					target,
				})}
			/>
		</g>
	)
}

/** The groups of a set with no grouping yet. @internal */
const NO_GROUPS: MapSetCluster[] = []

/** Whether a set draws a shared summary: the first of its sets does. @internal */
function leads(summary: MapSharedCluster, id: string): boolean {
	return summary.parts[0]?.id === id
}

/**
 * What a pick on a dot reports: the mark's `id`, the picked point's index in
 * {@link MapPointsProps.points}, and every index the dot stands for.
 *
 * `index` is the first of `merged`, so a caller that wants the one point it
 * named can read it and stop. `merged` is what a summary is: the reader pointed
 * at one dot, and these are the stops under it, in the order they were given. A
 * dot the frame did not merge reports a `merged` of one.
 *
 * @param id - The mark's own `id`.
 * @param index - The picked point's index; always `merged[0]`.
 * @param merged - Every index this dot draws for.
 */
export type MapPointsPick = (id: string, index: number, merged: readonly number[]) => void

/**
 * The drawn dot of each point, per grouping. The map is built on the first read
 * and held while the grouping lives. The cache is outside the component,
 * because the React Compiler rejects a closure that writes a render value.
 */
const stopsByGrouping = new WeakMap<readonly MapSetCluster[], ReadonlyMap<number, number>>()

/** Gives the drawn dot that point `index` landed in, or `null`. @internal */
function stopIndex(groups: readonly MapSetCluster[], index: number): number | null {
	return getOrCompute(stopsByGrouping, groups, groupsByMember).get(index) ?? null
}

/** Props for {@link MapPoints}. */
export type MapPointsProps = Omit<MapOverlayProps, 'onClick' | 'onContextMenu'> & {
	/** The dots, in the order they draw and the order the cursor walks them. */
	points: MapPointDatum[]
	/**
	 * Draws the dots that the frame puts too close together to tell apart as one
	 * summary dot. Its size grades with how many stops it holds, and its label
	 * carries the count. A number sets the clear space, in device pixels, two marks
	 * keep between their edges before they merge. It is measured edge to edge, so
	 * the one number holds however wide a summary grows. `0` lets marks touch but
	 * never overlap. A negative gap would ask for the overlap this exists to remove,
	 * so it reads as `0`.
	 *
	 * Grouping reads the drawn frame, not the data, so it answers the scale the
	 * map is at. A national frame summarizes a metro round to one mark. The same
	 * round separates into its own dots as the frame narrows to the state. A
	 * summary is one mark to everything downstream: one tooltip, one keyboard
	 * stop, one table row, one pick. The picture, the readout, and the cursor can
	 * therefore never disagree about what is on the map.
	 *
	 * Every set on the plat that clusters groups in one pass, so two sets never
	 * draw over one another. A pair of marks of two sets keeps the larger of their
	 * two gaps. A summary that holds the dots of more than one set is a shared
	 * summary. It draws as a disc in the surface color, with the count on it and a
	 * ring split into the colors of its sets, each arc as long as its share. Each
	 * set keeps the part of the summary that holds its own dots as a table row and
	 * a pick of that set, read out as that set reads a summary of its own. The
	 * pointer and the keyboard reach the summary as one mark, so the tooltip and
	 * the announcement read every part. A pick of the summary, from any input,
	 * reports each part to the `onClick` of its own set. A set that the legend toggles off leaves the pass.
	 *
	 * `false` draws every dot, however they stack, and leaves the set out of the
	 * shared pass.
	 * @defaultValue true
	 */
	cluster?: boolean | number
	/**
	 * The shape of the dots, the summaries, the halo, and the legend swatch. A
	 * `square` set beside a `circle` set lets the two read as different kinds of
	 * stop by shape as well as by color. A point's own
	 * {@link MapPointDatum.shape} overrides it for that point, and for a summary
	 * whose members all share it. A shared summary (see {@link cluster}) is a
	 * circle whatever its shapes, because its ring is its key. Its readout keys
	 * each part to the shape of that part.
	 * @defaultValue 'circle'
	 */
	shape?: MapPointShape
	/**
	 * The trailing readout a summary dot carries, from the stops it holds, how far
	 * they spread, and what they are called. The spread is the diameter, in meters,
	 * of the circle about the group that holds every one of them. The module
	 * formats no distances of its own. A caller that wants it in the readout
	 * therefore states the units it works in:
	 * `` (count, span) => `${count} stops · ${miles(span)} across` ``.
	 *
	 * `labels` is the merged stops' own names, in draw order. A summary is ONE mark
	 * downstream, one tooltip and one row. Without them a reader who sees a `3` has
	 * no way to learn which three it stands for. A caller naming small sets
	 * outright wants `` (_count, _span, labels) => labels.join(', ') ``; one
	 * summarizing hundreds wants the count. Each entry is that stop's own `label`,
	 * or its position in the set where it has none. That is the same fallback a
	 * lone dot's tooltip takes, so a stop reads identically merged or not.
	 * @defaultValue The count alone, in the number format of the reader's locale, as
	 * the summary dot draws it.
	 */
	clusterDetail?: (count: number, span: number, labels: string[]) => string
	/**
	 * Fires when a click lands on a dot; see {@link MapPointsPick} for what it
	 * reports.
	 *
	 * When it is set, every dot carries a pointer cursor. The keyboard cursor picks
	 * the dot it stands on with Enter or Space.
	 */
	onClick?: MapPointsPick
	/** Fires when a right-click lands on a dot, with the same arguments {@link onClick} reports. */
	onContextMenu?: MapPointsPick
}

/**
 * A set of dots under one legend entry, filled in one slot color and toggled as
 * one. That is a fleet's stops, a chain's branches, or a survey's sites. The
 * group is the mark. It registers once, draws one legend row, and takes the
 * emphasis whole. Hovering any dot therefore isolates the set, rather than
 * the dot.
 *
 * Dots the frame draws on top of one another summarize into a single graded
 * mark carrying their count. They separate back into themselves as the frame
 * widens on them (see {@link MapPointsProps.cluster}). The dots of two sets on
 * one place summarize into one shared summary, which keeps the part of each set.
 *
 * Each dot keeps its own readout and its own pick. Hovering one raises the
 * tooltip with that dot's name and detail. The detail never falls back to the
 * group's (see {@link MapPointDatum.detail}). The keyboard cursor walks the dots
 * one at a time, and `onClick` reports which was picked. An invisible hit
 * circle per dot keeps each aimable. The plat's `selectedOverlay` haloes the
 * dot holding the picked point: the summary it merged into where the frame
 * draws one.
 *
 * Those circles are finger-sized targets. For a mouse a dot narrows to what the
 * ground around it can spare:
 *
 * - The gap to a neighbor that close.
 * - The share a drawn {@link MapGeofence} under it leaves.
 * - The share a region layer under it takes.
 *
 * The dots a zoom has just parted therefore stay separately aimable, and a zone
 * under a dot keeps a band of its own face. The narrowing never goes past the
 * dot it draws, and a dot standing clear of all three keeps the full target.
 *
 * @remarks Renders only inside {@link MapPlat}. Prefer this to a `MapPoint` per
 * position past a handful. `MapPoint` registers its own legend entry. Two
 * hundred of them therefore cost two hundred state commits, two hundred
 * re-sorts, and two hundred legend rows against an eight-slot palette. This
 * costs one of each.
 *
 * A dot whose position the projection has no image for is omitted, and the rest
 * keep their readouts. The US composite drops points outside its insets. The
 * index a click reports therefore always names the caller's own point. Under the
 * plat's `animate` the dots pop in staggered, so the set reveals in sequence.
 * After the reveal, a dot that a regroup adds, such as one that a zoom splits
 * from a summary, draws at once.
 */
export function MapPoints({
	points,
	cluster = true,
	shape = 'circle',
	clusterDetail,
	onClick,
	onContextMenu,
	...overlay
}: MapPointsProps) {
	// The projector, read here rather than off the registration below: the stops
	// and the readouts this mark registers are the summarized ones, and a summary
	// is a fact about the projected frame, so the grouping has to resolve before
	// the mark registers, not after.
	const { project, clusters } = useMapPlat()

	const intl = useIntl()

	// What one device pixel spans in the drawn frame. Read here rather than off
	// `useMapOverlay` below for the same reason `project` is: the grouping decides
	// what this mark registers, so it has to resolve before the registration does.
	// The merge distance is a pixel distance, so a zoom that spreads the dots on
	// screen has to loosen the reach they are measured against; otherwise the
	// summaries a national frame drew would stay merged however far the view
	// closed on them.
	const unitsPerPixel = useMapZoomScale()

	// The mark's id, settled here rather than in `useMapOverlay` for the same
	// reason: the shared pass keys each set by its id.
	const generated = useId()

	const id = overlay.id ?? generated

	const gap = clusterGap(cluster)

	const positions = useMemo(() => points.map((point) => point.at), [points])

	// What this set puts in the shared pass. Held, because a new identity restakes
	// the set in the pass, and every set on the plat groups again.
	const input = useMemo<MapClusterInput>(() => ({ positions, gap }), [positions, gap])

	const pass = useSyncExternalStore(clusters.subscribe, clusters.grouping, clusters.grouping)

	// The groups of this set come from the shared pass of the plat, so the sets
	// group as one and never draw over one another. The set groups alone instead
	// where the pass does not hold the dots this render draws: before the mark
	// registers, with its grouping off, and on the render of a move, before the
	// set restakes its new dots in the pass. A move restakes in a layout effect,
	// so the reader never sees that render.
	const grouping = useMemo(() => {
		const shared = pass(unitsPerPixel)

		if (shared.sets.get(id)?.input === input) return shared

		return groupSets([{ id, input }], project, clusters.getRadius, unitsPerPixel)
	}, [pass, unitsPerPixel, id, input, project, clusters.getRadius])

	const groups = grouping.sets.get(id)?.groups ?? NO_GROUPS

	// Each drawn group's radius, read by the dots, their targets, and the halo: a
	// shared summary's is the radius of every dot that it holds.
	const radii = useMemo(
		() => groups.map((group) => grouping.marks[group.mark]?.radius ?? POINT_RADIUS),
		[groups, grouping],
	)

	// Each group's own shape: a lone dot's own, the one that a summary's members
	// share, else the mark's. The readout keys its swatch to it. Held for the same
	// reason as `paints` below.
	const ownShapes = useMemo(
		() =>
			groups.map(({ members }) => {
				const [first, ...rest] = members.map((member) => points[member]?.shape ?? shape)

				return first !== undefined && rest.every((held) => held === first) ? first : shape
			}),
		[groups, points, shape],
	)

	// Each group's drawn shape: its own, but a circle for a shared summary, whose
	// ring is its key.
	const shapes = useMemo(
		() =>
			groups.map(
				(group, index): MapPointShape =>
					group.shared === undefined ? (ownShapes[index] ?? shape) : 'circle',
			),
		[groups, ownShapes, shape],
	)

	// What one group of this set reads out, from its own dots alone.
	const groupRow = useCallback(
		(members: readonly number[], own: MapPointShape): MapStopRow => {
			const count = members.length

			const first = members[0]

			const lone = first === undefined ? undefined : points[first]

			const swatch = own === shape ? undefined : POINT_SWATCH[own]

			// Numbered by the caller's own index, never the group's: a click on this
			// dot reports that index, and a readout counting in another space would
			// name a row the caller cannot find, and would renumber itself as the
			// frame regrouped around it.
			if (count === 1 && first !== undefined && lone !== undefined) {
				return {
					label: lone.label ?? stopName(overlay.label, first, intl.formatNumber),
					detail: lone.detail,
					swatch,
					color: lone.color,
				}
			}

			// The spread costs a spherical pass per group, so only a caller that
			// reads it pays for it.
			if (clusterDetail === undefined) {
				return { label: overlay.label, swatch, detail: intl.formatNumber(count) }
			}

			const span = clusterSpan(members, positions)

			// Resolved through the same fallback a lone dot's own readout takes, so a stop
			// is named identically whether or not it ended up merged.
			const labels = members.map(
				(member) => points[member]?.label ?? stopName(overlay.label, member, intl.formatNumber),
			)

			return { label: overlay.label, swatch, detail: clusterDetail(count, span, labels) }
		},
		[points, positions, shape, overlay.label, clusterDetail, intl],
	)

	// A lone dot reads out as itself, so an ungrouped set reads exactly as the
	// points the caller passed. A summary reads as the mark, since it stands for
	// the whole group and no one of its stops names it. A row keys its swatch to
	// its own dot where the dot does not take the shape or the color of the mark,
	// so the tooltip shows the dot under the pointer. A part of a shared summary
	// reads as its own dots do, and names every part of the summary, so the
	// tooltip shows them all.
	const rows = useMemo<MapStopRow[]>(
		() =>
			groups.map(({ members, shared: summary }, index) => {
				const row = groupRow(members, ownShapes[index] ?? shape)

				return summary === undefined ? row : { ...row, parts: summary.parts }
			}),
		[groups, ownShapes, shape, groupRow],
	)

	// Which drawn dot each point landed in, built on the first read and held from
	// there: the pick reads it on every render a pointed-mark crossing costs, and
	// only a regrouping can change the answer, but a map with no pick never reads
	// it at all, and must not pay a lookup per dot to draw one.
	const getStop = useMemo(() => (index: number) => stopIndex(groups, index), [groups])

	// The inverse: the point a drawn dot reports, its first. The cursor and the
	// readout hold this point, so a zoom that regroups the dots does not move them
	// to the dot that takes the old index. Held on the grouping, as `getStop` is.
	const getIndex = useMemo(() => (stop: number) => groups[stop]?.members[0], [groups])

	// The caller counts in points; everything inside this mark counts in drawn
	// groups. A summary hands back the first stop it holds, so a pick names a row
	// the caller owns rather than a grouping it never asked for, and the whole
	// group beside it, because a summary is one dot to the reader and every stop
	// under it is what they just pointed at. A part of a shared summary hands back
	// the stops of this set alone.
	const report = (handler: MapPointsPick | undefined) => {
		if (handler === undefined) return undefined

		return (id: string, group: number) => {
			const members = groups[group]?.members

			const first = members?.[0]

			if (members !== undefined && first !== undefined) handler(id, first, members)
		}
	}

	// A thunk, so the O(N) build (and the spherical centroid behind every
	// summary's anchor) lands on the one keypress that reads it. Held on the
	// grouping, because a new identity tells the plat's pool that the dots moved.
	// A shared summary is one stop, the stop of the set that draws it. The parts of
	// the other sets stand at `null`, and the plat reads every part from that stop.
	const stops = useCallback(
		() =>
			groups.map((group) => {
				if (group.shared === undefined) return clusterAnchor(group.members, positions)

				return leads(group.shared, id) ? group.shared.anchor() : null
			}),
		[groups, positions, id],
	)

	// The dots this mark draws, for the plat's dot pool: every group but the shared
	// summaries that another set draws.
	const dots = useCallback(
		() =>
			groups.flatMap((group) => {
				if (group.shared === undefined) return [clusterAnchor(group.members, positions)]

				return leads(group.shared, id) ? [group.shared.anchor()] : []
			}),
		[groups, positions, id],
	)

	const { slot, hidden, spare, animate, dim, selected, onPointerLeave, hit } = useMapOverlay({
		...overlay,
		id,
		kind: 'point',
		swatch: POINT_SWATCH[shape],
		stops,
		dots,
		cluster: gap === null ? undefined : input,
		stopRows: rows,
		// The inverse of `report` above: a pick names the caller's own point, and
		// this reads back which drawn dot holds it, so the halo and the picked row
		// answer the grouping the frame currently draws, not the one the pick was
		// made against.
		getStop,
		getIndex,
		onClick: report(onClick),
		onContextMenu: report(onContextMenu),
	})

	// The picked dot itself, off that same grouping: a pick that merged into a
	// summary haloes the summary, and separates onto its own dot as the frame
	// widens around it.
	const picked = selected === null ? null : groups[selected]

	// How far each dot's target reaches: the whole of it where the dot stands
	// clear, and less where something else wants the same ground.
	// `map-cluster/crowd.ts` holds the list of claimants. The neighbors are the
	// marks of the shared pass, so a dot gives way to the dots of the other sets
	// as well as to its own.
	//
	// Memoized on the grouping and the plat's zone resolver, neither of which a
	// pointer crossing moves, where this mark re-renders on every crossing of
	// every mark on the map. The crowding half reads the drawn frame, so it answers
	// the zoom on the beat the grouping does: the pair a zoom has just parted sits
	// ~15px apart, well inside a 44px target, and stays precise until the view
	// carries them clear of one another.
	const targets = useMemo(() => {
		const room = grouping.room()

		return markTargets(
			groups.map((group, index) => ({ at: group.at, radius: radii[index] ?? POINT_RADIUS })),
			unitsPerPixel,
			spare,
			groups.map((group) => room[group.mark] ?? Number.POSITIVE_INFINITY),
		)
	}, [groups, grouping, radii, spare, unitsPerPixel])

	// Held across re-renders: rebuilding them would allocate one string per dot
	// every time, which is the cost this mark exists to remove.
	const keys = useMemo(() => rangeKeys(groups.length, 'dot'), [groups.length])

	// Each drawn group's stroke class. A lone dot wears its own color where it
	// carries one; a summary wears the mark's, because it stands for several stops
	// and any one of theirs would name it wrongly.
	//
	// Held rather than rebuilt: this is a prop of the memoized dot layer, and that
	// memo exists to hold the dots through every pointer crossing elsewhere on the
	// map. A fresh array per render would defeat it, which is what
	// `map-points-render` pins.
	const paints = useMemo(() => {
		const mark = slot === undefined ? '' : cn(...k.series[slot].stroke)

		return groups.map(({ members }) => {
			if (members.length !== 1) return mark

			const first = members[0]

			const own = first === undefined ? undefined : points[first]?.color

			return own === undefined ? mark : cn(...k.series[own].stroke)
		})
	}, [groups, points, slot])

	if (slot === undefined || hidden) return null

	const countInk = cn('text-xs font-semibold tabular-nums', ...k.series[slot].label)

	return (
		<>
			{picked?.at != null && (
				<MapDotHalo
					slot="map-points-selected"
					at={picked.at}
					radius={(selected === null ? undefined : radii[selected]) ?? POINT_RADIUS}
					shape={selected === null ? shape : (shapes[selected] ?? shape)}
					scale={unitsPerPixel}
				/>
			)}

			<MapPointsReveal animate={animate} drawn={groups.length > 0}>
				{(pops) => (
					<>
						<g data-slot="map-points" className={dim} onPointerLeave={onPointerLeave}>
							<MapPointsDots
								groups={groups}
								keys={keys}
								radii={radii}
								targets={targets}
								paints={paints}
								countInk={countInk}
								shapes={shapes}
								pops={pops}
								unitsPerPixel={unitsPerPixel}
								hit={hit}
							/>
						</g>

						{groups.map((group, index) =>
							group.shared !== undefined && group.at !== null && leads(group.shared, id) ? (
								<MapPointsShared
									key={keys[index]}
									summary={group.shared}
									index={index}
									at={group.at}
									radius={radii[index] ?? POINT_RADIUS}
									target={targets[index]}
									pops={pops}
									unitsPerPixel={unitsPerPixel}
									hit={hit}
									onPointerLeave={onPointerLeave}
								/>
							) : null,
						)}
					</>
				)}
			</MapPointsReveal>
		</>
	)
}
