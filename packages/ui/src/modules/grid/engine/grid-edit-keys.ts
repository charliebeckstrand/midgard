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
 * The element that a key press acts from: its target, or `null` for a target
 * that is not an element. A Tab in the open panel of a listbox closes the panel
 * and puts focus back on the trigger before the press reaches the table (see
 * `Listbox`). That press acts from the trigger. A Tab in the panel that a
 * choice editor opens on entry thus commits and moves, as a Tab on the closed
 * trigger does. The trigger can still read as expanded here, because the close
 * has not rendered yet, so only a portal counts against the focus.
 *
 * @internal
 */
export function pressOrigin(event: ReactKeyboardEvent<HTMLTableElement>): Element | null {
	const { target } = event

	if (!(target instanceof Element)) return null

	if (event.key !== 'Tab' || closestFloatingPortal(target) === null) return target

	const focused = target.ownerDocument.activeElement

	const back =
		focused !== null &&
		event.currentTarget.contains(focused) &&
		closestFloatingPortal(focused) === null

	return back ? focused : target
}

/**
 * Whether a key press belongs to a floating surface inside the grid rather than
 * to the session. A press already consumed (`defaultPrevented`) qualifies, and
 * so does a press from focus in a surface (see {@link inFloatingSurface}). The
 * surface's own document-level key layer runs after the table's handler, so the
 * session stands down and lets that layer take the press. A press that the
 * surface gave back to the editor acts from the editor (see
 * {@link pressOrigin}).
 *
 * @internal
 */
export function claimedBySurface(event: ReactKeyboardEvent<HTMLTableElement>): boolean {
	const origin = pressOrigin(event)

	if (event.defaultPrevented || origin === null) return true

	return origin === event.target && inFloatingSurface(origin)
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
	const target = pressOrigin(event) ?? (event.target as Element)

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
