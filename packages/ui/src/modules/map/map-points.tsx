'use client'

import {
	Fragment,
	type MouseEvent,
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
import { cn } from '../../core/cn'
import { useIntl } from '../../primitives/intl/use-intl'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import { getOrCompute } from '../../utilities/get-or-compute'
import { rangeKeys } from '../../utilities/range-keys'
import { clickPress } from '../chart/engine/chart-press'
import type { ChartPress } from '../chart/engine/types'
import { useMapPlat, useMapPointed, useMapZoomScale } from './context'
import { type MapDotMark, markTargets } from './engine/map-cluster/crowd'
import { clusterAnchor, clusterSpan } from './engine/map-cluster/geo'
import { type MapGround, type MapGroundDot, setGrounds } from './engine/map-cluster/ground'
import { clusterGap, groupsByMember } from './engine/map-cluster/group'
import type { MapClusterRadius } from './engine/map-cluster/radius'
import {
	groupSets,
	type MapClusterInput,
	type MapPointGrouping,
	type MapSetCluster,
	type MapSharedCluster,
} from './engine/map-cluster/sets'
import { clusterTree, type MapClusterNode } from './engine/map-cluster/tree'
import {
	MAP_FIT_INSET,
	MAP_PREPAINT_NARROWEST,
	POINT_RADIUS,
	POINT_SWATCH,
} from './engine/map-constants'
import { dotReach } from './engine/map-geometry/mark'
import { type MapHoverTarget, mapMarkDimmed } from './engine/map-hover/target'
import { POINT_REVEAL_SETTLE, pointPop } from './engine/map-motion'
import type { MapEntryDot, MapStopRow } from './engine/map-overlay/entry'
import { stopName } from './engine/map-overlay/readout'
import { pickedStop } from './engine/map-overlay/selection'
import { pixelScale } from './engine/map-projection/frame'
import type {
	LngLat,
	MapOverlaySelection,
	MapPoint2D,
	MapPointShape,
	MapProjector,
} from './engine/types'
import { dotClip, dotHitProps, MapDot, MapDotClip, MapDotCount, MapDotRing } from './map-dot'
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
	/** The ground each dot's target keeps against its neighbors, or `null` where none crowds it. */
	grounds: (MapGround | null)[]
	/** The prefix of each dot's clip id, which the dot's index completes. */
	clips: string
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
 * crossing that changes the dim of the set therefore re-renders that wrapper,
 * and this holds its render. It is `MapRegionsBase`'s treatment, for the same
 * reason and at a similar count. Two hundred dots each rebuild a `MapDot`, an
 * optional count, a hit circle, and two prop objects.
 *
 * The dim changes only the class of the wrapper, so the dots draw the output
 * that they already had. Without the memo the whole set rebuilt to produce it.
 *
 * @internal
 */
const MapPointsDots = memo(function MapPointsDots({
	groups,
	keys,
	radii,
	targets,
	grounds,
	clips,
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

				const ground = grounds[index] ?? null

				const clip = ground === null ? undefined : `${clips}-${index}`

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
								clip,
							})}
						/>

						{clip !== undefined && ground !== null && dotClip(clip, ground)}
					</Fragment>
				)
			})}
		</>
	)
})

/**
 * The shape of a group: the one shape that all its dots share, else the
 * mark's.
 *
 * @internal
 */
function groupShape(
	points: readonly MapPointDatum[],
	members: readonly number[],
	shape: MapPointShape,
): MapPointShape {
	const [first, ...rest] = members.map((member) => points[member]?.shape ?? shape)

	return first !== undefined && rest.every((held) => held === first) ? first : shape
}

/**
 * The stroke class of a group. A lone dot wears its own color where it carries
 * one. A summary wears the mark's class, because it stands for several stops,
 * and the color of one of them would name it wrongly.
 *
 * @internal
 */
function groupPaint(
	points: readonly MapPointDatum[],
	members: readonly number[],
	mark: string,
): string {
	const own = members.length === 1 ? points[members[0] ?? -1]?.color : undefined

	return own === undefined ? mark : cn(...k.series[own].stroke)
}

/** A group that a {@link MapPointsPrepaint} draws, with the widths of the frame where it holds. @internal */
type MapPrepaintGroup = {
	node: MapClusterNode
	/** The narrowest frame width where the group holds, in device pixels, included. `0` for every narrower width. */
	from: number
	/** The widest frame width where the group holds, in device pixels, not included. */
	to: number
}

/** A length in pixels for a container query, to a thousandth of a pixel. @internal */
function px(value: number): string {
	return `${Math.round(value * 1000) / 1000}px`
}

/**
 * The container query that holds where the frame of the plot is at least
 * `from` and less than `to` pixels wide. The frame meets the plot box less the
 * inset, so its width is the smaller of the width of that box and its height
 * times the aspect of the frame.
 *
 * @internal
 */
function frameQuery(from: number, to: number, aspect: number): string {
	const inset = MAP_FIT_INSET * 2

	const wide = `(width >= ${px(from + inset)}) and (height >= ${px(from / aspect + inset)})`

	const narrow = `((width < ${px(to + inset)}) or (height < ${px(to / aspect + inset)}))`

	if (to === Number.POSITIVE_INFINITY) return wide

	return from === 0 ? narrow : `${wide} and ${narrow}`
}

/**
 * The groups of a set for every width of the frame, from the merge tree of the
 * set. A group that holds at the narrowest frame holds at every narrower frame
 * too. With the grouping off, each dot holds at every width.
 *
 * @param width - The width of the canonical frame, in frame units.
 * @internal
 */
function prepaintGroups(
	positions: readonly LngLat[],
	project: MapProjector,
	gap: number | null,
	getRadius: MapClusterRadius,
	width: number,
): MapPrepaintGroup[] {
	if (gap === null) {
		return positions.flatMap((position, index): MapPrepaintGroup[] => {
			const at = project(position)

			if (at === null) return []

			const node = { members: [index], at, from: 0, to: Number.POSITIVE_INFINITY }

			return [{ node, from: 0, to: Number.POSITIVE_INFINITY }]
		})
	}

	const tree = clusterTree(
		positions,
		project,
		() => gap,
		gap,
		getRadius,
		width / MAP_PREPAINT_NARROWEST,
	)

	return tree.nodes.flatMap((node): MapPrepaintGroup[] => {
		if (node.at === null || !(node.from < node.to)) return []

		const from = node.to === Number.POSITIVE_INFINITY ? 0 : width / node.to

		const to = node.from === 0 ? Number.POSITIVE_INFINITY : width / node.from

		return [{ node, from, to }]
	})
}

/**
 * The props of the wrapper of one group of a {@link MapPointsPrepaint}: its
 * name for the rules, and the point that its scale keeps in place.
 *
 * @internal
 */
function bandProps(name: string, at: MapPoint2D) {
	return { 'data-map-band': name, style: { transformOrigin: `${at.x}px ${at.y}px` } }
}

/** Props for {@link MapPointsPrepaint}. @internal */
type MapPointsPrepaintProps = {
	groups: MapPrepaintGroup[]
	/** The prefix of the names that tie each group to its rule. */
	scope: string
	/** The width of the canonical frame, in frame units. */
	width: number
	/** The width over the height of the canonical frame. */
	aspect: number
	points: readonly MapPointDatum[]
	/** The radius of a group of each count, in device pixels. */
	radius: (count: number) => number
	/** The shape of the mark. */
	shape: MapPointShape
	/** The color of the mark: its own, because the ledger has not given one yet. */
	slot: MapSeriesColor
	/** The point that the standing pick names, or `null`. */
	picked: number | null
}

/**
 * The dots of a {@link MapPoints} before the box of the plot is measured: on
 * the server, and in the hydration render.
 *
 * The groups depend on the width of the frame in pixels, which no render knows
 * yet. The set therefore draws the groups of every width, from its merge tree
 * (`clusterTree`). Each group holds over one range of widths. A container query
 * on the plot shows each group in its range alone, so the first paint draws the
 * groups that the measured frame draws. Each group draws at the scale of one
 * pixel ({@link pixelScale}) around its own point, so the shapes, the strokes,
 * and the counts are at their size in pixels too.
 *
 * Nothing here answers the pointer. The box is measured in the layout effects
 * of the hydration, and the dots of the measured frame take over in that
 * commit.
 *
 * The rules come from the frame arithmetic of the server and of the browser
 * alike, but the last digit of a projection can differ between two engines. The
 * text of the rules therefore does not have to match at hydration. The rules
 * round each width to a thousandth of a pixel.
 *
 * @internal
 */
function MapPointsPrepaint({
	groups,
	scope,
	width,
	aspect,
	points,
	radius,
	shape,
	slot,
	picked,
}: MapPointsPrepaintProps) {
	const band = (index: number) => `${scope}-${index}`

	const mark = cn(...k.series[slot].stroke)

	const countInk = cn(...k.series[slot].label)

	const shows = groups
		.map(({ from, to }, index) => {
			if (from === 0 && to === Number.POSITIVE_INFINITY) return ''

			const select = `[data-map-band="${band(index)}"]`

			return `${select}{display:none}@container map-plot ${frameQuery(from, to, aspect)}{${select}{display:inline}}`
		})
		.join('')

	const rules = `[data-map-band^="${scope}-"]{${pixelScale(width, aspect)}}${shows}`

	return (
		<g data-slot="map-points">
			<style suppressHydrationWarning>{rules}</style>

			{/* The halos first, so each draws under every dot, as the measured frame draws it. */}
			{picked !== null &&
				groups.map(({ node }, index) =>
					node.at !== null && node.members.includes(picked) ? (
						<g key={band(index)} {...bandProps(band(index), node.at)}>
							<MapDotHalo
								slot="map-points-selected"
								at={node.at}
								radius={radius(node.members.length)}
								shape={groupShape(points, node.members, shape)}
								scale={1}
							/>
						</g>
					) : null,
				)}

			{groups.map(({ node }, index) => {
				const count = node.members.length

				return node.at === null ? null : (
					<g key={band(index)} {...bandProps(band(index), node.at)}>
						<MapDot
							slot={count === 1 ? 'map-points-dot' : 'map-points-cluster'}
							at={node.at}
							radius={radius(count)}
							shape={groupShape(points, node.members, shape)}
							scale={1}
							className={groupPaint(points, node.members, mark)}
						/>

						{count > 1 && (
							<MapDotCount
								at={node.at}
								count={count}
								className={countInk}
								scale={1}
								animate={false}
								transition={k.motion.instant}
							/>
						)}
					</g>
				)
			})}
		</g>
	)
}

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
 * set. Under the reveal's timing, each of them waits out the stagger of its
 * index before it pops. After the reveal, a dot that a regroup adds draws at
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
	/** The ground the target keeps against its neighbors, or `null` where none crowds it. */
	ground: MapGround | null
	/** The id of the clip that bounds the target to that ground. */
	clipId: string
	pops: boolean
	unitsPerPixel: number
	/** The hit plumbing of the set that draws the summary. */
	hit: MapOverlay['hit']
	onPointerLeave: () => void
}

/**
 * One shared summary: a summary that holds the dots of more than one set. The
 * first of its sets draws it, as a disc in the surface color with the count on
 * it. A ring around it splits into the colors of its sets ({@link MapDotRing}). It is a
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
	ground,
	clipId,
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
		onClick: picks
			? (event: MouseEvent<SVGElement>) => report(named, 'activate', clickPress(event))
			: undefined,
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
				className={cn(...k.shared.count)}
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
					clip: ground === null ? undefined : clipId,
				})}
			/>

			{ground !== null && <MapDotClip id={clipId} ground={ground} />}
		</g>
	)
}

/** The groups of a set with no grouping yet. @internal */
const NO_GROUPS: MapSetCluster[] = []

/** The target mark of a group that the set draws no dot for. @internal */
const NOT_DRAWN: MapDotMark = { at: null, radius: POINT_RADIUS }

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
 * @param press - The press that picked the dot (see {@link ChartPress}).
 */
export type MapPointsPick = (
	id: string,
	index: number,
	merged: readonly number[],
	press: ChartPress,
) => void

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

/**
 * Gives the group of set `id` that the standing pick haloes, or `null`: the dot
 * that holds the pick. A pick of any part of a shared summary haloes the summary
 * from the set that draws it. A halo draws behind its mark, and a set that draws
 * after the summary would cover it.
 *
 * @internal
 */
function haloGroup(
	grouping: MapPointGrouping,
	id: string,
	selection: MapOverlaySelection | null,
): number | null {
	if (selection === null) return null

	const groups = grouping.sets.get(selection.id)?.groups ?? NO_GROUPS

	const stop = pickedStop(selection, selection.id, (index) => stopIndex(groups, index))

	const shared = stop === null ? undefined : groups[stop]?.shared

	if (shared === undefined) return selection.id === id ? stop : null

	return leads(shared, id) ? (shared.parts[0]?.stop ?? null) : null
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
	 * two gaps. A set that the legend toggles off leaves the pass.
	 *
	 * A summary that holds the dots of more than one set is a shared summary. It
	 * draws as a disc in the surface color, with the count on it. A ring around
	 * it splits into the colors of its sets, each arc as long as its share. Each
	 * set keeps its part of the summary as a table row and a pick of that set. The
	 * part reads out as that set reads a summary of its own.
	 *
	 * The pointer and the keyboard reach the summary as one mark, so the tooltip
	 * and the announcement read every part. A pick of the summary, from any
	 * input, reports each part to the `onClick` of its own set.
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
	/** Fires when a right-click lands on a dot, with the `id`, `index`, and `merged` that {@link onClick} reports. */
	onContextMenu?: (id: string, index: number, merged: readonly number[]) => void
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
 * Two dots can stand close enough that their targets overlap, in this set or
 * in another mark. Each target then clips to the ground nearer to its own dot,
 * along the line midway between the two. Where midway falls inside the face of
 * a summary, the line moves to the edge of that face. Each dot therefore keeps
 * the whole of what it paints and its reach outward, for a finger and a mouse
 * alike, whichever dot draws last.
 *
 * @remarks Renders only inside {@link MapPlat}. Prefer this to a `MapPoint` per
 * position past a handful. `MapPoint` registers its own legend entry. The
 * registrations of one mount land in one commit. Two hundred of them still cost
 * two hundred sorts of the ledger, and two hundred legend rows against an
 * eight-slot palette. This costs one of each.
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
	const { project, clusters, selectedOverlay, unmeasured } = useMapPlat()

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

	// Before the box is measured, the groups of every width (see `MapPointsPrepaint`).
	// The set groups alone here, as it does before it registers: no render before
	// the measurement can know the other sets of the plat. Only a mark with its own
	// color outside a group knows its color before it registers.
	const prepaint = useMemo(() => {
		if (unmeasured === null || overlay.color === undefined || overlay.group !== undefined) {
			return null
		}

		const { width, height } = unmeasured

		return {
			groups: prepaintGroups(positions, project, gap, clusters.getRadius, width),
			width,
			aspect: width / height,
			slot: overlay.color,
		}
	}, [unmeasured, overlay.color, overlay.group, gap, positions, project, clusters.getRadius])

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
	const { marks } = grouping

	const radii = useMemo(
		() => groups.map((group) => marks[group.mark]?.radius ?? POINT_RADIUS),
		[groups, marks],
	)

	// Each group's own shape: a lone dot's own, the one that a summary's members
	// share, else the mark's. The readout keys its swatch to it. Held for the same
	// reason as `paints` below.
	const ownShapes = useMemo(
		() => groups.map(({ members }) => groupShape(points, members, shape)),
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
	const report = <A extends unknown[]>(
		handler:
			| ((id: string, index: number, merged: readonly number[], ...rest: A) => void)
			| undefined,
	) => {
		if (handler === undefined) return undefined

		return (id: string, group: number, ...rest: A) => {
			const members = groups[group]?.members

			const first = members?.[0]

			if (members !== undefined && first !== undefined) handler(id, first, members, ...rest)
		}
	}

	// A thunk, so the O(N) build (and the spherical centroid behind every
	// summary's anchor) lands on the one keypress that reads it. Held on the
	// grouping, because a new identity tells the keyboard cursor that the stops
	// moved. A shared summary is one stop, the stop of the set that draws it. The
	// parts of the other sets stand at `null`, and the plat reads every part from
	// that stop.
	const stops = useCallback(
		() =>
			groups.map((group) => {
				if (group.shared === undefined) return clusterAnchor(group.members, positions)

				return leads(group.shared, id) ? group.shared.anchor() : null
			}),
		[groups, positions, id],
	)

	// The dots this mark draws, index for index with its groups, each at what its
	// shape paints out to. A group stands at `null` where the set draws no dot for
	// it: the projection drops the group, or another set draws the shared summary
	// that holds it. The pool and the grounds below read this one list, so each
	// neighbor cuts against the place where the set draws the dot.
	const drawn = useMemo(
		() =>
			groups.map((group, index): MapGroundDot | null => {
				if (group.at === null) return null

				if (group.shared !== undefined && !leads(group.shared, id)) return null

				return { at: group.at, radius: dotReach(radii[index] ?? POINT_RADIUS, shapes[index]) }
			}),
		[groups, id, radii, shapes],
	)

	// The drawn dots, for the plat's dot pool. A summary draws at the mean of the
	// frame positions of its members, which is not the image of a position that
	// it holds. The set therefore stakes each dot at the frame position where it
	// draws the dot. Held on the drawn dots, because a new identity tells the pool
	// that the dots moved.
	const dots = useCallback(
		() =>
			drawn.flatMap((dot): MapEntryDot[] =>
				dot === null ? [] : [{ drawn: dot.at, radius: dot.radius }],
			),
		[drawn],
	)

	const { slot, hidden, spare, animate, dim, onPointerLeave, neighbors, hit } = useMapOverlay({
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
		onStopClick: report(onClick),
		onContextMenu: report(onContextMenu),
	})

	// The picked dot itself, off that same grouping: a pick that merged into a
	// summary haloes the summary, and separates onto its own dot as the frame
	// widens around it.
	const haloed = haloGroup(grouping, id, selectedOverlay)

	const picked = haloed === null ? null : groups[haloed]

	// How far each dot's target reaches: the whole of it where the dot stands
	// clear, and less where something else wants the same ground.
	// `map-cluster/crowd.ts` holds the list of claimants. The neighbors are the
	// marks of the shared pass, so a dot gives way to the dots of the other sets
	// as well as to its own. A group that the set draws no dot for asks nothing,
	// so a shared summary that another set draws costs no zone lookup here.
	//
	// Memoized on the drawn dots and the plat's zone resolver, so the dot layer
	// holds through a render that moves neither. The crowding half reads the drawn
	// frame, so it answers the zoom on the beat the grouping does: the pair a zoom
	// has just parted sits ~15px apart, well inside a 44px target, and stays
	// precise until the view carries them clear of one another.
	const targets = useMemo(() => {
		const room = grouping.room()

		return markTargets(
			drawn.map((dot) => dot ?? NOT_DRAWN),
			unitsPerPixel,
			spare,
			groups.map((group) => room[group.mark] ?? Number.POSITIVE_INFINITY),
		)
	}, [drawn, groups, grouping, spare, unitsPerPixel])

	// The ground each dot's target keeps where a neighbor stands close enough to
	// want some of it: the dots of this set, and the dots of every other mark on
	// the plat. A finger target reaches 22px each way, so without the clip a dot
	// between two summaries lost the gap on each side, and the edge of its own
	// face, to the summary that drew later. `null` for almost every dot, which
	// draws no clip.
	//
	// The dots that another set draws stand at `null` in `drawn`: that set divides
	// their ground, and the pool hands them in as its own.
	//
	// Memoized beside `targets`, and for the same reason: a pointer crossing moves
	// none of these inputs.
	const grounds = useMemo(
		() => setGrounds(drawn, neighbors(), unitsPerPixel),
		[drawn, neighbors, unitsPerPixel],
	)

	const clips = `${useId()}-hit`

	const scope = useId()

	// Held across re-renders: rebuilding them would allocate one string per dot
	// every time, which is the cost this mark exists to remove.
	const keys = useMemo(() => rangeKeys(groups.length, 'dot'), [groups.length])

	// Each drawn group's stroke class (`groupPaint`).
	//
	// Held rather than rebuilt: this is a prop of the memoized dot layer, and that
	// memo exists to hold the dots through a render for the dim or the emphasis.
	// A fresh array per render would defeat it, which is what `map-points-render`
	// pins.
	const paints = useMemo(() => {
		const mark = slot === undefined ? '' : cn(...k.series[slot].stroke)

		return groups.map(({ members }) => groupPaint(points, members, mark))
	}, [groups, points, slot])

	if (hidden) return null

	if (prepaint !== null) {
		return (
			<MapPointsPrepaint
				{...prepaint}
				scope={scope}
				points={points}
				radius={clusters.getRadius}
				shape={shape}
				picked={selectedOverlay?.id === id ? (selectedOverlay.index ?? 0) : null}
			/>
		)
	}

	if (slot === undefined) return null

	const countInk = cn(...k.series[slot].label)

	return (
		<>
			{picked?.at != null && (
				<MapDotHalo
					slot="map-points-selected"
					at={picked.at}
					radius={(haloed === null ? undefined : radii[haloed]) ?? POINT_RADIUS}
					shape={haloed === null ? shape : (shapes[haloed] ?? shape)}
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
								grounds={grounds}
								clips={clips}
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
									ground={grounds[index] ?? null}
									clipId={`${clips}-${index}`}
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
