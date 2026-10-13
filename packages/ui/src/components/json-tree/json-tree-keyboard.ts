import type { KeyboardEvent } from 'react'
import { treeMoveForKey } from '../tree/tree-keyboard'
import type { FlatNode } from './json-tree-utilities'

/**
 * The focus move that a horizontal arrow makes from the JsonTree row `item`, see
 * {@link treeMoveForKey}. A branch row that does not collapse has `data-fixed` and
 * no `aria-expanded`, and its branch is always open. On that row, `ArrowRight`
 * moves to the first child and `ArrowLeft` moves to the parent.
 *
 * @internal
 */
export function jsonTreeMoveForKey(
	event: KeyboardEvent<HTMLElement>,
	item: HTMLElement,
): 'child' | 'parent' | null {
	if (item.hasAttribute('data-fixed')) {
		return treeMoveForKey(event, true) ?? treeMoveForKey(event, false)
	}

	return treeMoveForKey(event, item.getAttribute('aria-expanded') === 'true')
}

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
