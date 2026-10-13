import type { KeyboardEvent } from 'react'
import { crossAxisDelta, nextIndexForKey } from '../../utilities/keyboard-navigation'
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

/**
 * The flat index that a key reaches when focus is parked on the container of a windowed
 * tree. Focus parks there when the focused row scrolls out of the window, and `stored`
 * is the flat index of that row. A vertical arrow, Home and End move from the stored row
 * over the `focusable` rows. A horizontal arrow returns to the stored row.
 *
 * @returns Null for a key that does not navigate, or for a tree with no focusable row.
 * @internal
 */
export function parkedTarget(
	key: string,
	stored: number,
	focusable: readonly number[],
): number | null {
	// Both horizontal arrows return to the stored row, so the reading direction has no effect.
	if (crossAxisDelta(key, 'vertical') !== null) return stored

	const next = nextIndexForKey(key, focusable.indexOf(stored), focusable.length, {
		orientation: 'vertical',
	})

	return next === null ? null : (focusable[next] ?? null)
}
