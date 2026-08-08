import type { QueryGroup, QueryNode } from './types'

/** Returns true when the group (or any nested group) contains at least one rule. */
export function hasRules(group: QueryGroup): boolean {
	return group.children.some((child) => (child.type === 'rule' ? true : hasRules(child)))
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

		if (nextChild !== undefined) {
			const nextChildren = children.slice()

			nextChildren[i] = nextChild

			return { ...tree, children: nextChildren }
		}
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

		if (mapped !== child) {
			const nextChildren = children.slice()

			nextChildren[i] = mapped

			return { ...tree, children: nextChildren }
		}
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
		if (child.id === id) {
			const nextChildren = children.slice()

			nextChildren.splice(i, 1)

			return { ...tree, children: nextChildren }
		}

		if (child.type === 'group') {
			const mapped = removeChild(child, id)

			if (mapped !== child) {
				const nextChildren = children.slice()

				nextChildren[i] = mapped

				return { ...tree, children: nextChildren }
			}
		}
	}

	return tree
}
