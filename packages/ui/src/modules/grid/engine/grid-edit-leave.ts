/**
 * The leave rules of an edit session: what a focus move out of an editor, or
 * out of the grid, means to a `commitOn` policy.
 */

import type { CommitOn } from '../use-grid-editing-warnings'
import { isInGrid } from './grid-editing-utilities'

/**
 * Whether `node`, an element in the DOM of the table `grid`, is inside what a
 * `commitOn` policy watches. `'leaveGrid'` watches the grid, by the
 * nearest-grid rule. `'leaveEditor'` watches the editors, which `inEditors`
 * names.
 *
 * @internal
 */
function inWatched(args: {
	commitOn: CommitOn
	grid: HTMLElement
	node: Element
	inEditors: (node: Element) => boolean
}): boolean {
	const { commitOn, grid, node, inEditors } = args

	return commitOn === 'leaveGrid' ? isInGrid(node, grid) : inEditors(node)
}

/**
 * What a focus move out of `from` into `next` means to a `commitOn` policy,
 * for the table `grid`: `'stay'`, `'leave'`, or `'ask'`.
 *
 * - A move that does not start inside what the policy watches stays. A
 *   `from` outside the table's DOM reached the table through the React tree.
 *   It is in a surface that the grid renders, so it counts as inside.
 * - A window blur stays. It names no `next` element while the document has
 *   no focus. Any other move with no `next` element goes to the page body,
 *   and leaves.
 * - A `next` in the table's DOM reads by {@link inWatched}.
 * - A `next` outside the table's DOM is `'ask'`. Only the React tree can tell
 *   a surface that the grid renders from an unrelated element, so the focus
 *   event that follows decides.
 *
 * @internal
 */
export function readLeave(args: {
	commitOn: CommitOn
	grid: HTMLElement
	from: Element
	next: Element | null
	inEditors: (node: Element) => boolean
}): 'stay' | 'leave' | 'ask' {
	const { grid, from, next } = args

	if (grid.contains(from) && !inWatched({ ...args, node: from })) return 'stay'

	if (next === null) return document.hasFocus() ? 'leave' : 'stay'

	if (!grid.contains(next)) return 'ask'

	return inWatched({ ...args, node: next }) ? 'stay' : 'leave'
}

/**
 * A focus move out of the table's DOM that waits for its focus event. The
 * table's `onFocus` marks it `owned` when the event reaches the table through
 * the React tree. @internal
 */
export type PendingLeave = { next: Element; rowKey: string | number; owned: boolean }
