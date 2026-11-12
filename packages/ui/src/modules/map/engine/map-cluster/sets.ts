/**
 * The point sets of one plat, grouped in one pass. Each `MapPoints` that
 * clusters puts its dots in this pass, so two sets never draw over one another.
 * A summary that holds the dots of two sets is a shared summary. The first of
 * its sets in the ledger draws it, and each set keeps the part that holds its own
 * dots. That part is a table row and a pick of that set, as a summary of one set
 * is. The keyboard cursor stands on the summary once, at the stop of the set that
 * draws it.
 *
 * Frame arithmetic and a listener set, React-free, like the rest of the engine.
 */

import { createEmitter } from '../../../../utilities/emitter'
import { once } from '../../../../utilities/once'
import { sameElements } from '../../../../utilities/same-elements'
import { groupLegendId } from '../map-legend/items'
import type { MapOverlayEntry } from '../map-overlay/entry'
import type { LngLat, MapProjector } from '../types'
import { type MapDotMark, neighborRoom } from './crowd'
import { clusterAnchor } from './geo'
import { clusterPoints } from './group'
import type { MapClusterRadius } from './radius'
import type { MapPointCluster } from './tree'

/**
 * What a set of dots puts in the pass: its positions, and the gap it asks for in
 * device pixels. `null` turns the grouping of the set off, so a set with `null`
 * draws alone and never goes in a shared pass.
 *
 * @internal
 */
export type MapClusterInput = {
	positions: readonly LngLat[]
	gap: number | null
}

/**
 * The part of a shared summary that holds the dots of one set.
 *
 * @internal
 */
export type MapSharedPart = {
	/** The id of the set. */
	id: string
	/** The legend id that the emphasis of the set answers to: its group's, else its own. */
	legend: string
	/** The index of the part in the groups of its set, which is its stop. */
	stop: number
	/** The dots of the set that the part holds, as indices into the positions of the set. */
	members: number[]
	/** Whether the set answers a pick. */
	pickable: boolean
	/** Whether the set answers a right-click. */
	menuable: boolean
}

/**
 * A summary that holds the dots of more than one set.
 *
 * @internal
 */
export type MapSharedCluster = {
	/** One part for each set, in the order of the ledger. The first part draws the summary. */
	parts: MapSharedPart[]
	/** How many dots the summary holds, over all its parts. */
	count: number
	/**
	 * Where the keyboard cursor stands on the summary, in lon/lat: the center of
	 * all its dots.
	 */
	anchor: () => LngLat
}

/**
 * One drawn group of a set, with the summary it shares, if any.
 *
 * @internal
 */
export type MapSetCluster = MapPointCluster & {
	/** The index of the mark that this group draws as, in {@link MapPointGrouping.marks}. */
	mark: number
	/** The summary that this group is a part of, where the summary holds the dots of more than one set. */
	shared?: MapSharedCluster
}

/**
 * The groups of every set in one pass.
 *
 * @internal
 */
export type MapPointGrouping = {
	/** The groups of each set, by its id, with the input they come from. */
	sets: ReadonlyMap<string, { input: MapClusterInput; groups: MapSetCluster[] }>
	/** Every drawn mark of the pass, once each. A shared summary is one mark. */
	marks: readonly MapDotMark[]
	/**
	 * How much reach the nearest drawn mark leaves each mark, index for index
	 * with {@link marks}: `neighborRoom` over every set at once. Computed on the
	 * first read, because only a pointer target reads it.
	 */
	room: () => readonly number[]
}

/** One set as the pass reads it: its id, its input, and what the ledger knows about it. @internal */
export type MapClusterSet = {
	id: string
	input: MapClusterInput
	legend?: string
	pickable?: boolean
	menuable?: boolean
}

/**
 * Groups the dots of every set in one pass, and gives each set its own groups.
 *
 * The pass is `clusterPoints` over the dots of all the sets, with the gap of
 * each dot from its set. A group that holds the dots of one set is an ordinary
 * group of that set. A group that holds the dots of more than one set is a
 * shared summary. Each of its sets gets the part that holds its own dots.
 *
 * The groups of each set are in the order of their first dots, as the groups
 * of one set alone are. One set alone therefore groups as `clusterPoints` groups
 * it.
 *
 * @param sets - The sets, in the order of the ledger.
 * @param project - The live projection.
 * @param getRadius - The radius of a group of each count, in device pixels.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns The groups of each set, and every drawn mark.
 * @internal
 */
export function groupSets(
	sets: readonly MapClusterSet[],
	project: MapProjector,
	getRadius: MapClusterRadius,
	unitsPerPixel: number,
): MapPointGrouping {
	const positions: LngLat[] = []

	const gaps: number[] = []

	const owners: number[] = []

	const locals: number[] = []

	for (const [owner, set] of sets.entries()) {
		for (const [local, position] of set.input.positions.entries()) {
			positions.push(position)

			gaps.push(set.input.gap ?? 0)

			owners.push(owner)

			locals.push(local)
		}
	}

	const off = sets.some((set) => set.input.gap === null)

	const joint = clusterPoints(positions, project, off ? null : gaps, getRadius, unitsPerPixel)

	const groups = sets.map((): MapSetCluster[] => [])

	const marks: MapDotMark[] = []

	for (const group of joint) {
		const mark = marks.length

		marks.push({ at: group.at, radius: getRadius(group.members.length) })

		const parts = splitMembers(group.members, owners, locals)

		if (parts.length === 1) {
			const [only] = parts

			if (only !== undefined)
				groups[only.owner]?.push({ members: only.members, at: group.at, mark })

			continue
		}

		const shared: MapSharedCluster = {
			parts: parts.map(({ owner, members }) => {
				const set = sets[owner] as MapClusterSet

				return {
					id: set.id,
					legend: set.legend ?? set.id,
					stop: 0,
					members,
					pickable: set.pickable ?? false,
					menuable: set.menuable ?? false,
				}
			}),
			count: group.members.length,
			anchor: once(() => clusterAnchor(group.members, positions)),
		}

		for (const { owner, members } of parts) {
			groups[owner]?.push({ members, at: group.at, mark, shared })
		}
	}

	return {
		sets: new Map(
			sets.map((set, owner) => [
				set.id,
				{ input: set.input, groups: ordered(groups[owner] ?? [], set.id) },
			]),
		),
		marks,
		room: once(() => neighborRoom(marks, unitsPerPixel)),
	}
}

/**
 * The dots of one joint group, split by the set that owns each one. The joint
 * indices are ascending, and the sets are laid out in order. Thus the parts come
 * out in the order of the sets, and the indices of each part are ascending.
 *
 * @internal
 */
function splitMembers(
	members: readonly number[],
	owners: readonly number[],
	locals: readonly number[],
): { owner: number; members: number[] }[] {
	const parts: { owner: number; members: number[] }[] = []

	for (const member of members) {
		const owner = owners[member] as number

		const last = parts.at(-1)

		if (last?.owner === owner) last.members.push(locals[member] as number)
		else parts.push({ owner, members: [locals[member] as number] })
	}

	return parts
}

/**
 * The groups of one set in the order of their first dots, with each shared part
 * told its own stop.
 *
 * @internal
 */
function ordered(groups: MapSetCluster[], id: string): MapSetCluster[] {
	groups.sort((a, b) => (a.members[0] ?? 0) - (b.members[0] ?? 0))

	for (const [stop, group] of groups.entries()) {
		const part = group.shared?.parts.find((candidate) => candidate.id === id)

		if (part !== undefined) part.stop = stop
	}

	return groups
}

/**
 * The shared pass of a plat, as a store that a set reads through
 * `useSyncExternalStore`.
 *
 * @remarks
 * The plat makes a new store each time what the pass reads of its ledger
 * ({@link sameClusterEntries}), its toggles, or its fit change. A set whose dots
 * move changes none of these, because its dots sit behind a stable getter. The set therefore calls {@link MapClusterStore.restake}
 * when its dots change, as it does for the dot pool (`pool.ts`).
 *
 * @internal
 */
export type MapClusterStore = {
	/**
	 * The snapshot: the grouping at a zoom scale. The identity of this function
	 * changes each time the sets change, so a reader can hold its result in a memo.
	 * It holds the grouping of the last scale that it was asked for, because every
	 * set asks for the same scale. A new scale that puts each dot in the same group
	 * gives the same `sets` and the same `marks`, with a new `room`.
	 */
	grouping: () => (unitsPerPixel: number) => MapPointGrouping
	/** Calls `listener` each time the sets change, and returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
	/** Gathers the input of the set that `id` names again, after its dots changed. */
	restake: (id: string) => void
	/** The radius of a group of each count, in device pixels, that the pass reads. */
	getRadius: MapClusterRadius
}

/**
 * A new {@link MapClusterStore} over the entries of a ledger.
 *
 * The first read gathers every set that clusters and that the legend shows. A
 * restake before the first read does nothing, because no reader holds a gather
 * yet.
 *
 * @param entries - The ledger.
 * @param hidden - The ids that the legend has toggled off.
 * @param project - The live projection.
 * @param getRadius - The radius of a group of each count, in device pixels.
 * @returns The store.
 * @internal
 */
export function createClusterStore(
	entries: readonly MapOverlayEntry[],
	hidden: ReadonlySet<string>,
	project: MapProjector,
	getRadius: MapClusterRadius,
): MapClusterStore {
	const changed = createEmitter()

	let held: MapClusterSet[] | null = null

	const gathered = () => {
		if (held === null) held = entries.flatMap((entry) => entrySet(entry, hidden) ?? [])

		return held
	}

	const bind = () => {
		let last: { unitsPerPixel: number; grouping: MapPointGrouping } | null = null

		return (unitsPerPixel: number) => {
			if (last?.unitsPerPixel !== unitsPerPixel) {
				const next = groupSets(gathered(), project, getRadius, unitsPerPixel)

				// A zoom that moves no dot to another group keeps the sets and the marks
				// of the last scale, so each reader keeps what it derived from them. The
				// room is the one part that reads the scale, so it is always the new one.
				const grouping =
					last !== null && sameMembership(last.grouping, next)
						? { sets: last.grouping.sets, marks: last.grouping.marks, room: next.room }
						: next

				last = { unitsPerPixel, grouping }
			}

			return last.grouping
		}
	}

	let grouping = bind()

	return {
		grouping: () => grouping,
		subscribe: changed.subscribe,
		restake: (id) => {
			if (held === null) return

			const entry = entries.find((candidate) => candidate.id === id)

			const next = entry === undefined ? undefined : entrySet(entry, hidden)

			if (next?.input === held.find((set) => set.id === id)?.input) return

			// The next read gathers every set again, in the order of the ledger, so the
			// set that draws a shared summary does not change when its dots move.
			held = null

			grouping = bind()

			changed.emit()
		},
		getRadius,
	}
}

/**
 * Whether two groupings of the same sets put each dot in the same group. The
 * marks of the two then have the same radius and the same order, because each
 * mark is a function of its members. The position of a mark is the mean of its
 * members, so the two positions are equal to the precision of that sum.
 *
 * @internal
 */
function sameMembership(prev: MapPointGrouping, next: MapPointGrouping): boolean {
	if (prev.marks.length !== next.marks.length) return false

	for (const [id, { groups }] of prev.sets) {
		const others = next.sets.get(id)?.groups

		if (others?.length !== groups.length) return false

		const same = groups.every((group, index) => {
			const other = others[index]

			return other?.mark === group.mark && sameElements(other.members, group.members)
		})

		if (!same) return false
	}

	return true
}

/**
 * The set that one entry puts in the pass, or `undefined` where it puts none.
 * An entry that the legend hides puts none, and so do an entry with no
 * `clusterAt` and a set with its grouping off.
 *
 * @internal
 */
function entrySet(entry: MapOverlayEntry, hidden: ReadonlySet<string>): MapClusterSet | undefined {
	if (hidden.has(entry.id) || entry.clusterAt === undefined) return undefined

	const input = entry.clusterAt()

	if (input.gap === null) return undefined

	return {
		id: entry.id,
		input,
		legend: entry.group === undefined ? entry.id : groupLegendId(entry.group),
		pickable: entry.activate !== undefined,
		menuable: entry.menu !== undefined,
	}
}

/**
 * Whether two ledgers put the same sets in the pass, so the plat can keep its
 * store. The pass reads the id, the input getter, the group, and whether a set
 * answers a pick and a right-click of each entry that clusters. A change of the
 * stop rows of a set, which a regroup makes, is not one of these.
 *
 * @internal
 */
export function sameClusterEntries(
	prev: readonly MapOverlayEntry[],
	next: readonly MapOverlayEntry[],
): boolean {
	const before = prev.filter((entry) => entry.clusterAt !== undefined)

	const after = next.filter((entry) => entry.clusterAt !== undefined)

	return (
		before.length === after.length &&
		before.every((entry, index) => {
			const other = after[index]

			return (
				other !== undefined &&
				entry.id === other.id &&
				entry.clusterAt === other.clusterAt &&
				entry.group === other.group &&
				entry.activate === other.activate &&
				entry.menu === other.menu
			)
		})
	)
}
