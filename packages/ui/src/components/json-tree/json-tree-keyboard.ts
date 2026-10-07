import type { FlatNode } from './json-tree-utilities'

/**
 * The flat index that {@link treeMoveForKey} reaches from the row at `index` of a
 * windowed tree. A flat walk keeps rows outside the window, so the target can be
 * one that is not mounted.
 *
 * @returns Null when the move has no target: an empty branch, or the root.
 * @internal
 */
export function flatTreeMoveTarget(
	nodes: readonly FlatNode[],
	index: number,
	move: 'child' | 'parent',
): number | null {
	const node = nodes[index]

	if (!node) return null

	if (move === 'child') {
		const next = nodes[index + 1]

		return next && next.type !== 'branch-close' && next.depth === node.depth + 1 ? index + 1 : null
	}

	for (let i = index - 1; i >= 0; i--) {
		const candidate = nodes[i]

		if (candidate?.type === 'branch-open' && candidate.depth === node.depth - 1) return i
	}

	return null
}
