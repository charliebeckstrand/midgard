import type { KeyboardEvent } from 'react'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { ITEM_SELECTOR } from './tree-constants'

/**
 * The focus move that a horizontal arrow makes from a tree row (WAI-ARIA APG tree).
 * `ArrowRight` on an open branch moves to its first child. `ArrowLeft` on a closed
 * branch or a leaf moves to its parent. The open and the close of a branch are the
 * job of the branch row, see {@link branchToggleKey}.
 *
 * The arrows follow the reading order, so they swap in a right-to-left layout.
 *
 * @internal
 */
export function treeMoveForKey(
	event: KeyboardEvent<HTMLElement>,
	expanded: boolean,
): 'child' | 'parent' | null {
	const key = logicalArrowKey(event.key, event.target)

	if (key === 'ArrowRight' && expanded) return 'child'

	if (key === 'ArrowLeft' && !expanded) return 'parent'

	return null
}

/**
 * Whether a key press on a branch row opens or closes it: `ArrowRight` opens a
 * closed branch and `ArrowLeft` closes an open one. The arrows follow the
 * reading order, so they swap in a right-to-left layout.
 *
 * @internal
 */
export function branchToggleKey(event: KeyboardEvent<HTMLElement>, open: boolean): boolean {
	const key = logicalArrowKey(event.key, event.currentTarget)

	return open ? key === 'ArrowLeft' : key === 'ArrowRight'
}

/**
 * The mounted treeitem that {@link treeMoveForKey} reaches from `item`, read from the
 * DOM order and `aria-level`. The first child is the next treeitem when it is one
 * level deeper. The parent is the nearest earlier treeitem one level up.
 *
 * @returns Null when the move has no target: an empty branch, or the root.
 * @internal
 */
export function treeMoveTarget(
	container: HTMLElement,
	item: HTMLElement,
	move: 'child' | 'parent',
): HTMLElement | null {
	const items = [...container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)]

	const index = items.indexOf(item)

	const level = Number(item.getAttribute('aria-level'))

	if (index === -1 || !level) return null

	if (move === 'child') {
		const next = items[index + 1]

		return next && Number(next.getAttribute('aria-level')) === level + 1 ? next : null
	}

	for (let i = index - 1; i >= 0; i--) {
		const candidate = items[i]

		if (candidate && Number(candidate.getAttribute('aria-level')) === level - 1) return candidate
	}

	return null
}
