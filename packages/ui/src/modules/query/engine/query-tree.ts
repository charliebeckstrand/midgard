import { clamp } from '../../../utilities/clamp'
import { moveItem } from '../../../utilities/move-item'
import type { QueryCombinator, QueryGroup, QueryNode } from './types'

/**
 * Applies a transform to the node matching `id`, walking recursively.
 *
 * Returns the same `tree` reference when `id` is not found, keeping
 * unrelated subtrees referentially equal for memoized descendants.
 */
export function mapNode(
	tree: QueryGroup,
	id: string,
	fn: (node: QueryNode) => QueryNode,
): QueryGroup {
	if (tree.id === id) return fn(tree) as QueryGroup

	const { children } = tree

	for (const [i, child] of children.entries()) {
		let nextChild: QueryNode | undefined

		if (child.id === id) {
			nextChild = fn(child)
		} else if (child.type === 'group') {
			const mapped = mapNode(child, id, fn)

			if (mapped !== child) nextChild = mapped
		}

		if (nextChild !== undefined) return { ...tree, children: children.with(i, nextChild) }
	}

	return tree
}

/**
 * Returns a new tree with `node` appended to the group identified by
 * `parentId`. Returns the same `tree` reference when `parentId` is not found,
 * keeping unrelated subtrees referentially equal for memoized descendants.
 */
export function addChild(tree: QueryGroup, parentId: string, node: QueryNode): QueryGroup {
	if (tree.id === parentId) return { ...tree, children: [...tree.children, node] }

	const { children } = tree

	for (const [i, child] of children.entries()) {
		if (child.type !== 'group') continue

		const mapped = addChild(child, parentId, node)

		if (mapped !== child) return { ...tree, children: children.with(i, mapped) }
	}

	return tree
}

/**
 * Returns a new tree with the node identified by `id` removed, searching
 * recursively. Returns the same `tree` reference when `id` is not found,
 * keeping unrelated subtrees referentially equal for memoized descendants.
 */
export function removeChild(tree: QueryGroup, id: string): QueryGroup {
	const { children } = tree

	for (const [i, child] of children.entries()) {
		if (child.id === id) return { ...tree, children: children.toSpliced(i, 1) }

		if (child.type === 'group') {
			const mapped = removeChild(child, id)

			if (mapped !== child) return { ...tree, children: children.with(i, mapped) }
		}
	}

	return tree
}

/**
 * Gives `node` the combinator `combinator`, or the same `node` when it already
 * has it. An `undefined` combinator drops the key. @internal
 */
function withCombinator(node: QueryNode, combinator: QueryCombinator | undefined): QueryNode {
	if (node.combinator === combinator) return node

	if (combinator !== undefined) return { ...node, combinator }

	const { combinator: _, ...rest } = node

	return rest
}

/**
 * Returns a new tree with the node identified by `id` moved to `toIndex` among
 * the children of its own group. `toIndex` clamps to the group. Returns the same
 * `tree` reference when `id` is not found or the move changes nothing.
 *
 * @remarks Each combinator stays in its position, and only the nodes move. So
 * the AND/OR between two positions does not change, and a hidden combinator on
 * the first child never becomes live. A node that moves takes the combinator of
 * its new position.
 *
 * @param tree - The query tree, usually the root group.
 * @param id - The node to move.
 * @param toIndex - The position of the node in its group after the move.
 *
 * @internal
 */
export function moveChild(tree: QueryGroup, id: string, toIndex: number): QueryGroup {
	const { children } = tree

	const from = children.findIndex((child) => child.id === id)

	if (from !== -1) {
		const to = clamp(toIndex, 0, children.length - 1)

		if (to === from) return tree

		const moved = moveItem(children, from, to)

		// The combinators keep their positions, so each node takes the combinator
		// of the position it now holds.
		return {
			...tree,
			children: moved.map((child, index) => withCombinator(child, children[index]?.combinator)),
		}
	}

	for (const [i, child] of children.entries()) {
		if (child.type !== 'group') continue

		const mapped = moveChild(child, id, toIndex)

		if (mapped !== child) return { ...tree, children: children.with(i, mapped) }
	}

	return tree
}

/**
 * The group that holds the node identified by `id`, or `undefined` when the
 * node is the root or is not in the tree.
 *
 * @internal
 */
export function findParent(tree: QueryGroup, id: string): QueryGroup | undefined {
	for (const child of tree.children) {
		if (child.id === id) return tree

		if (child.type !== 'group') continue

		const parent = findParent(child, id)

		if (parent) return parent
	}

	return undefined
}

/**
 * The node identified by `id`: `node` itself or a node in its subtree, or
 * `undefined`.
 *
 * @internal
 */
export function findNode(node: QueryNode, id: string): QueryNode | undefined {
	if (node.id === id) return node

	if (node.type !== 'group') return undefined

	for (const child of node.children) {
		const found = findNode(child, id)

		if (found) return found
	}

	return undefined
}

/**
 * Returns `group` with `node` at `index` among its children. The node takes
 * the combinator of the place that it enters: the combinator of the node that
 * it displaces, or at the end, the combinator of the node before it. A first
 * node that the move displaces had a hidden combinator, so it takes the
 * combinator of the node after it. With no such node, the combinator is AND.
 * @internal
 */
function insertChild(group: QueryGroup, node: QueryNode, index: number): QueryGroup {
	const { children } = group

	const at = clamp(index, 0, children.length)

	// A combinator that can show: the first child of a group hides its own.
	const live = (position: number) =>
		position > 0 ? (children[position]?.combinator ?? 'and') : 'and'

	const displaced = children[at]

	const joined =
		displaced !== undefined
			? withCombinator(node, displaced.combinator)
			: withCombinator(node, live(at - 1))

	if (at > 0 || displaced === undefined)
		return { ...group, children: children.toSpliced(at, 0, joined) }

	// The node takes the first place, so the node that held it now shows a
	// combinator.
	return {
		...group,
		children: [joined, withCombinator(displaced, live(1)), ...children.slice(1)],
	}
}

/**
 * Returns a new tree with the node identified by `id` moved into the group
 * identified by `groupId`, at `toIndex` among its children. `toIndex` counts
 * the children of the group before the move and clamps to the group. A move
 * inside the group of the node is {@link moveChild}. Returns the same `tree`
 * reference when a node is not found or when the group is the node or is in
 * its subtree.
 *
 * @remarks The node takes the combinator of the place that it enters, and each
 * other node keeps its combinator. So the move changes how the moved node
 * joins its siblings, and it does not change how the other nodes join theirs.
 * In the group that the node leaves, the next node keeps its combinator, as
 * {@link removeChild} leaves it. In the group that the node enters, the node
 * takes the combinator of the node that it displaces, or at the end, of the
 * node before it. A node that the move displaces from the first place had a
 * hidden combinator, so it takes the combinator of the node after it. With no
 * such node, the combinator is AND.
 *
 * @param tree - The query tree, usually the root group.
 * @param id - The node to move.
 * @param groupId - The group that the node moves into.
 * @param toIndex - The position of the node in the group after the move.
 *
 * @internal
 */
export function moveChildInto(
	tree: QueryGroup,
	id: string,
	groupId: string,
	toIndex: number,
): QueryGroup {
	const parent = findParent(tree, id)

	if (parent === undefined) return tree

	if (parent.id === groupId) return moveChild(tree, id, toIndex)

	const node = parent.children.find((child) => child.id === id)

	const target = findNode(tree, groupId)

	if (node === undefined || target?.type !== 'group' || findNode(node, groupId)) return tree

	return mapNode(removeChild(tree, id), groupId, (group) =>
		insertChild(group as QueryGroup, node, toIndex),
	)
}
