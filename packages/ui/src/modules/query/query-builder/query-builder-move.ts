import { createEmitter } from '../../../utilities/emitter'
import { findParent } from '../engine/query-tree'
import type { QueryGroup } from '../engine/types'

/** The place that a pointer drag drops a node at in another group: the group and the index among its children. @internal */
export type QueryDrop = { groupId: string; index: number }

/**
 * The state that the groups of a builder share for a move from one group into
 * another. It keeps its identity for the life of the builder.
 *
 * @internal
 */
export type QueryMove = {
	/** The newest query tree. Call it from a handler or an effect, not from a render. */
	getRoot: () => QueryGroup
	/** The drop of the live pointer drag, or `null` while the drag is over the group of its node. */
	getDrop: () => QueryDrop | null
	/** Sets the drop, and tells each listener when it changes. */
	setDrop: (drop: QueryDrop | null) => void
	/** Adds a listener for the drop, and returns the function that removes it. */
	subscribe: (listener: () => void) => () => void
	/**
	 * Marks the node that a keyboard move carries into the group. The group that
	 * then holds it lifts it and focuses its grip, so the next arrow key moves it
	 * on.
	 */
	carry: (id: string, groupId: string, lift?: boolean) => void
	/**
	 * Gives the node that a keyboard move carries into the group, and whether the
	 * group lifts it, or `null`. It ends the carry into that group. A return on
	 * Escape focuses the node and does not lift it.
	 */
	take: (groupId: string) => { id: string; lift: boolean } | null
	/**
	 * The place of the node at the start of its keyboard lift, or `null`. A carry
	 * keeps it, so Escape puts the node back across groups too.
	 */
	getOrigin: (id: string) => QueryDrop | null
	/** Sets the place of a node at the start of its keyboard lift, or clears it with `null`. */
	setOrigin: (origin: (QueryDrop & { id: string }) | null) => void
}

/**
 * Makes the {@link QueryMove} state of one builder.
 *
 * @param getRoot - Gives the newest query tree.
 * @internal
 */
export function createQueryMove(getRoot: () => QueryGroup): QueryMove {
	let drop: QueryDrop | null = null

	let carried: { id: string; groupId: string; lift: boolean } | null = null

	let origin: (QueryDrop & { id: string }) | null = null

	const changes = createEmitter()

	return {
		getRoot,
		getDrop: () => drop,
		setDrop: (next) => {
			if (next?.groupId === drop?.groupId && next?.index === drop?.index) return

			drop = next

			changes.emit()
		},
		subscribe: changes.subscribe,
		carry: (id, groupId, lift = true) => {
			carried = { id, groupId, lift }
		},
		take: (groupId) => {
			if (carried?.groupId !== groupId) return null

			const { id, lift } = carried

			carried = null

			return { id, lift }
		},
		getOrigin: (id) =>
			origin?.id === id ? { groupId: origin.groupId, index: origin.index } : null,
		setOrigin: (next) => {
			origin = next
		},
	}
}

/** The group element that holds `element`, past `element` itself. @internal */
const findGroup = (element: Element) =>
	element.parentElement?.closest<HTMLElement>('[data-slot="query-group"]') ?? null

/**
 * The innermost group whose rows hold the height `y`, out of the subtree of
 * `item`, or `null` when no group holds `y`.
 *
 * @internal
 */
function findTarget(root: HTMLElement, item: HTMLElement, y: number): HTMLElement | null {
	let target: HTMLElement | null = null

	// A nested group comes after the group around it in the order of the
	// document, so the last group that holds `y` is the innermost one.
	for (const group of [root, ...root.querySelectorAll<HTMLElement>('[data-slot="query-group"]')]) {
		if (item.contains(group)) continue

		const box = group.getBoundingClientRect()

		if (y >= box.top && y <= box.bottom) target = group
	}

	return target
}

/**
 * The count of the children of `group` whose middle is above the height `y`.
 *
 * @internal
 */
function dropIndex(group: HTMLElement, y: number): number {
	let index = 0

	for (const child of group.querySelectorAll<HTMLElement>('[data-slot="query-sortable"]')) {
		if (findGroup(child) !== group) continue

		const box = child.getBoundingClientRect()

		if (box.top + box.height / 2 < y) index += 1
	}

	return index
}

/**
 * The drop of a node that a pointer drags at the height `y`, in the coordinates
 * of the viewport. The group is the target of {@link findTarget}, and the index
 * is the {@link dropIndex} in that group. It is `null` when that group holds the
 * node, or when no group holds `y`.
 *
 * @remarks Only the height decides. The node moves on the y axis only, and a
 * nested group starts past the grip of the node, so a pointer that drags
 * straight down stays at the side of a nested group, not over it. The rows of a
 * group include its actions, so a drop over them puts the node last.
 *
 * @param item - The `Reorder.Item` of the node that the pointer drags.
 * @param y - The height of the pointer.
 * @internal
 */
export function findDrop(item: HTMLElement, y: number): QueryDrop | null {
	// The root group holds each group of the builder. The builder element takes
	// the props of the consumer, so the search starts at the root group, which
	// the builder writes itself.
	let root = findGroup(item)

	for (let outer = root; outer !== null; outer = findGroup(outer)) root = outer

	if (root === null) return null

	const target = findTarget(root, item, y)

	const groupId = target?.dataset.groupId

	if (target === null || groupId === undefined || target === findGroup(item)) return null

	return { groupId, index: dropIndex(target, y) }
}

/** A move of a node across the nesting of the tree. See {@link findCarry}. @internal */
export type QueryCarryWay = 'in' | 'above' | 'below' | 'out'

/**
 * The group and the index that a move takes a node to across the nesting of
 * the tree. `above` moves the node into the group just before it, as its last
 * node, and `below` into the group just after it, as its first node. `in`, the
 * move of the keyboard, is `above`, or else `below`. `out` moves the node out
 * of its group, to the place after that group in the group around it. It is
 * `null` when no such group is there.
 *
 * @internal
 */
export function findCarry(
	root: QueryGroup,
	id: string,
	way: QueryCarryWay,
): { group: QueryGroup; index: number } | null {
	const parent = findParent(root, id)

	if (parent === undefined) return null

	if (way === 'out') {
		const outer = findParent(root, parent.id)

		if (outer === undefined) return null

		return { group: outer, index: outer.children.indexOf(parent) + 1 }
	}

	const index = parent.children.findIndex((child) => child.id === id)

	const before = parent.children[index - 1]

	const above = before?.type === 'group' ? { group: before, index: before.children.length } : null

	const after = parent.children[index + 1]

	const below = after?.type === 'group' ? { group: after, index: 0 } : null

	if (way === 'above') return above

	if (way === 'below') return below

	return above ?? below
}
