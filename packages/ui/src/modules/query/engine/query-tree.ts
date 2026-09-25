import type { QueryCombinator, QueryGroup, QueryNode } from './types'

/** Returns true when the group (or any nested group) contains at least one rule. */
export function hasRules(group: QueryGroup): boolean {
	return group.children.some((child) => child.type === 'rule' || hasRules(child))
}

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
 */
export function moveChild(tree: QueryGroup, id: string, toIndex: number): QueryGroup {
	const { children } = tree

	const from = children.findIndex((child) => child.id === id)

	if (from !== -1) {
		const to = Math.min(Math.max(toIndex, 0), children.length - 1)

		if (to === from) return tree

		const node = children[from] as QueryNode

		const moved = children.toSpliced(from, 1).toSpliced(to, 0, node)

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
