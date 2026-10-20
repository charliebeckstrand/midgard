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
 * over the `isFocusable` rows. A horizontal arrow returns to the stored row.
 *
 * @returns Null for a key that does not navigate, or for a tree with no isFocusable row.
 * @internal
 */
export function parkedTarget(
	key: string,
	stored: number,
	isFocusable: readonly number[],
): number | null {
	// Both horizontal arrows return to the stored row, so the reading direction has no effect.
	if (crossAxisDelta(key, 'vertical') !== null) return stored

	const next = nextIndexForKey(key, isFocusable.indexOf(stored), isFocusable.length, {
		orientation: 'vertical',
	})

	return next === null ? null : (isFocusable[next] ?? null)
}

/**
 * The flat index of the Tab stop of a windowed tree. `indexes` are the flat indices of the
 * rendered rows, in order. When the window does not start at the top row, its first `overscan`
 * rows are above the viewport. The stop is the first row in the viewport, or after it, that is
 * not a closing bracket. Thus Tab does not move focus to a row above the viewport. When no such
 * row is rendered, the stop is the first rendered row that is not a closing bracket.
 *
 * @returns Undefined when no rendered row takes focus.
 * @internal
 */
export function windowTabStop(
	indexes: readonly number[],
	nodes: readonly FlatNode[],
	overscan: number,
): number | undefined {
	const isFocusable = (index: number) => {
		const node = nodes[index]

		return node !== undefined && node.type !== 'branch-close'
	}

	const first = indexes[0]

	if (first === undefined) return undefined

	// The window adds `overscan` rows above the first row in view, but none above the top row.
	const inView = first === 0 ? 0 : first + overscan

	return indexes.find((index) => index >= inView && isFocusable(index)) ?? indexes.find(isFocusable)
}
