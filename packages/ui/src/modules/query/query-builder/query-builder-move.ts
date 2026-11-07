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
	carry: (id: string, groupId: string) => void
	/**
	 * Gives the node that a keyboard move carries into the group, or `null`, and
	 * ends the carry into that group.
	 */
	take: (groupId: string) => string | null
}

/**
 * Makes the {@link QueryMove} state of one builder.
 *
 * @param getRoot - Gives the newest query tree.
 * @internal
 */
export function createQueryMove(getRoot: () => QueryGroup): QueryMove {
	let drop: QueryDrop | null = null

	let carried: { id: string; groupId: string } | null = null

	const listeners = new Set<() => void>()

	return {
		getRoot,
		getDrop: () => drop,
		setDrop: (next) => {
			if (next?.groupId === drop?.groupId && next?.index === drop?.index) return

			drop = next

			for (const listener of listeners) listener()
		},
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
		carry: (id, groupId) => {
			carried = { id, groupId }
		},
		take: (groupId) => {
			if (carried?.groupId !== groupId) return null

			const { id } = carried

			carried = null

			return id
		},
	}
}

/** The group element that holds `element`, past `element` itself. @internal */
const findGroup = (element: Element) =>
	element.parentElement?.closest<HTMLElement>('[data-slot="query-group"]') ?? null

/**
 * The drop of a node that a pointer drags at the height `y`, in the coordinates
 * of the viewport. The group is the innermost group whose rows hold `y`, out of
 * the subtree of the node. The index counts the children of that group whose
 * middle is above `y`. It is `null` when that group holds the node, or when no
 * group holds `y`.
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

	let target: HTMLElement | null = null

	// A nested group comes after the group around it in the order of the
	// document, so the last group that holds `y` is the innermost one.
	for (const group of [root, ...root.querySelectorAll<HTMLElement>('[data-slot="query-group"]')]) {
		if (item.contains(group)) continue

		const box = group.getBoundingClientRect()

		if (y >= box.top && y <= box.bottom) target = group
	}

	const groupId = target?.dataset.groupId

	if (target === null || groupId === undefined || target === findGroup(item)) return null

	let index = 0

	for (const child of target.querySelectorAll<HTMLElement>('[data-slot="query-sortable"]')) {
		if (findGroup(child) !== target) continue

		const box = child.getBoundingClientRect()

		if (box.top + box.height / 2 < y) index += 1
	}

	return { groupId, index }
}

/**
 * The group and the index that a keyboard move takes a node to across the
 * nesting of the tree. `in` moves the node into the group just before it, as
 * its last node, or else into the group just after it, as its first node.
 * `out` moves the node out of its group, to the place after that group in the
 * group around it. It is `null` when no such group is there.
 *
 * @internal
 */
export function findCarry(
	root: QueryGroup,
	id: string,
	way: 'in' | 'out',
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

	if (before?.type === 'group') return { group: before, index: before.children.length }

	const after = parent.children[index + 1]

	return after?.type === 'group' ? { group: after, index: 0 } : null
}
