/**
 * The key rules of an edit session: which key presses belong to the session,
 * and the move that each asks of it from an open editor.
 */

import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { closestFloatingPortal } from '../../../utilities/floating-portal-registry'
import { hasBrowserModifier } from '../../../utilities/modifier-keys'
import { NATIVE_ENTER, tabStaysInCell } from './grid-editing-utilities'

/**
 * `node` when its nearest `<table>` is `table`, else `null`. A detail panel can
 * hold a nested grid. The row index or the column id of a row or a cell of
 * that grid can match one of this grid, so the session must not read it.
 * `inGrid` does not tell the two apart when the nested grid has no
 * `role="grid"`.
 *
 * @internal
 */
export function ownNode(node: Element | null, table: HTMLTableElement | null): Element | null {
	return node?.closest('table') === table ? node : null
}

/**
 * Whether `node` is in a floating surface that an editor opened. That is a
 * portaled panel, such as an open listbox's options or the date picker's
 * calendar. It is also an open disclosure's own trigger or input
 * (`aria-expanded="true"`), such as a combobox with its panel open. Only the
 * key surface reads this rule, because a key reaches the table only from its
 * own React tree. The commit on leave must not read it for the element that
 * takes focus: an unrelated surface on the page matches it too. @internal
 */
function inFloatingSurface(node: Element): boolean {
	return closestFloatingPortal(node) !== null || node.closest('[aria-expanded="true"]') !== null
}

/**
 * Whether a key press belongs to a floating surface inside the grid rather than
 * to the session. A press already consumed (`defaultPrevented`) qualifies, and
 * so does a press from focus in a surface (see {@link inFloatingSurface}). The
 * surface's own document-level key layer runs after the table's handler, so the
 * session stands down and lets that layer take the press.
 *
 * @internal
 */
export function claimedBySurface(event: ReactKeyboardEvent<HTMLTableElement>): boolean {
	if (event.defaultPrevented || !(event.target instanceof Element)) return true

	return inFloatingSurface(event.target)
}

/** Where a move key takes the session from an open editor. @internal */
export type SessionMove = 'down' | 'next' | 'previous' | 'here'

/**
 * The move a key press asks of the session from an open editor, or `null` when
 * the press is not the session's. The tab stop's own keys are the cursor's,
 * which enter a cell. A key with Ctrl, Cmd, or Alt is the editor's shortcut.
 * Enter on an element that acts on it natively stays with that element. Tab
 * that has a next control in the same cell stays with the browser (see
 * {@link tabStaysInCell}).
 *
 * @internal
 */
export function editorMove(event: ReactKeyboardEvent<HTMLTableElement>): SessionMove | null {
	const target = event.target as Element

	if (target === event.currentTarget || hasBrowserModifier(event)) return null

	// Tab moves between the controls of one cell first. Only Tab past the last
	// control, or Shift+Tab past the first, commits and moves.
	if (event.key === 'Tab') {
		if (tabStaysInCell(target, event.shiftKey)) return null

		return event.shiftKey ? 'previous' : 'next'
	}

	if (event.key === 'F2') return 'here'

	if (event.key === 'Enter' && !target.closest(NATIVE_ENTER)) return 'down'

	return null
}
