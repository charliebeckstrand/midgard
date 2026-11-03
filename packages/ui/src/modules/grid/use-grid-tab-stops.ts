'use client'

import { type RefObject, useEffect } from 'react'
import {
	closestFloatingPortal,
	referenceOpenedWithin,
} from '../../utilities/floating-portal-registry'
import { entryScope, GRID_CELL_ATTR, pinControls, unpinControls } from './engine/grid-cell-controls'

/**
 * The part of `table` that focus on `target` opens to Tab (see
 * {@link entryScope}), or `null` for none. It is `undefined` for focus in a
 * floating surface that a control of the grid opened, such as the panel of a
 * listbox, because the surface gives focus back to that control. The open part
 * then stays as it is.
 */
function scopeFor(target: EventTarget | null, table: HTMLTableElement): Element | null | undefined {
	if (target instanceof Element && table.contains(target)) {
		return target === table ? null : entryScope(target, table)
	}

	const portal = closestFloatingPortal(target)

	return portal && referenceOpenedWithin(table, portal) ? undefined : null
}

/**
 * Keeps a grid with a keyboard cursor one tab stop: its `<table>`. The
 * controls in the cells of the cursor leave the tab order (see
 * {@link pinControls}), so Tab and Shift+Tab leave the grid in one press. The
 * cursor reaches each cell, and Enter or F2 moves focus to the controls of the
 * active cell (see `useGridNavigation`).
 *
 * The cell that holds focus keeps its controls in the tab order, so Tab moves
 * through them, and from the last one out of the grid. Focus in a floating
 * surface that a control of the grid opened, such as the panel of a listbox,
 * keeps that cell open to Tab, because the surface gives focus back to it.
 * Any other move of focus out of the grid closes the cell.
 *
 * The walk runs again when the cells or their controls change, as rows mount
 * or a control swaps for another.
 *
 * @internal
 */
export function useGridTabStops(
	tableRef: RefObject<HTMLTableElement | null>,
	enabled: boolean,
): void {
	useEffect(() => {
		const table = tableRef.current

		if (!enabled || !table) return

		// The part of the grid that is open to Tab: the cell that holds focus, or
		// the row of the new-row slot. `null` while the grid's own tab stop, or
		// nothing in the grid, holds focus.
		let entered: Element | null = null

		const normalize = () => pinControls(table, entered)

		const follow = (target: EventTarget | null) => {
			const next = scopeFor(target, table)

			if (next === undefined || next === entered) return

			entered = next

			normalize()
		}

		const onFocusIn = (event: FocusEvent) => follow(event.target)

		// Focus that goes to no element, as a press on the page does, closes the
		// cell. A switch of the window keeps it, so focus comes back to the same
		// control.
		const onFocusOut = (event: FocusEvent) => {
			if (event.relatedTarget === null && document.hasFocus()) follow(null)
		}

		document.addEventListener('focusin', onFocusIn)

		table.addEventListener('focusout', onFocusOut)

		const observer = new MutationObserver(normalize)

		observer.observe(table, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['tabindex', 'href', GRID_CELL_ATTR],
		})

		follow(document.activeElement)

		normalize()

		return () => {
			observer.disconnect()

			document.removeEventListener('focusin', onFocusIn)

			table.removeEventListener('focusout', onFocusOut)

			unpinControls(table)
		}
	}, [tableRef, enabled])
}
