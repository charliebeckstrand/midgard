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
function scopeFor(
	target: EventTarget | null,
	table: HTMLTableElement,
	unit: string,
): Element | null | undefined {
	if (target instanceof Element && table.contains(target)) {
		return target === table ? null : entryScope(target, table, unit)
	}

	const portal = closestFloatingPortal(target)

	return portal && referenceOpenedWithin(table, portal) ? undefined : null
}

/**
 * Keeps a grid one tab stop. The controls in each part of the grid that
 * `unit` selects leave the tab order (see {@link pinControls}), so Tab and
 * Shift+Tab leave the grid in one press. The part is a cell of the keyboard
 * cursor (`GRID_CELL`), whose tab stop is the `<table>`. The cursor
 * reaches each cell, and Enter or F2 moves focus to the controls of the active
 * cell (see `useGridNavigation`). Else the part is a data row of a roving grid
 * (`GRID_ROW`), whose tab stop is the roved row or cell (see
 * `useGridRoving`). `null` turns the walk off.
 *
 * The part that holds focus keeps its controls in the tab order, so Tab moves
 * through them, and from the last one out of the grid. Focus in a floating
 * surface that a control of the grid opened, such as the panel of a listbox,
 * keeps that part open to Tab, because the surface gives focus back to it.
 * Any other move of focus out of the grid closes the part.
 *
 * The walk runs again when the parts or their controls change, as rows mount
 * or a control swaps for another.
 *
 * @internal
 */
export function useGridTabStops(
	tableRef: RefObject<HTMLTableElement | null>,
	unit: string | null,
): void {
	useEffect(() => {
		const table = tableRef.current

		if (unit === null || !table) return

		// The part of the grid that is open to Tab: the cell that holds focus, or
		// the row of the new-row slot. `null` while the grid's own tab stop, or
		// nothing in the grid, holds focus.
		let entered: Element | null = null

		// The walk writes only the attributes that differ, and it drops the records
		// of its own writes, so they start no second walk.
		const normalize = (watcher: MutationObserver) => {
			pinControls(table, entered, unit)

			watcher.takeRecords()
		}

		const observer = new MutationObserver((_records, self) => normalize(self))

		const follow = (target: EventTarget | null) => {
			const next = scopeFor(target, table, unit)

			if (next === undefined || next === entered) return

			entered = next

			normalize(observer)
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

		observer.observe(table, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ['tabindex', 'href', GRID_CELL_ATTR],
		})

		follow(document.activeElement)

		normalize(observer)

		return () => {
			observer.disconnect()

			document.removeEventListener('focusin', onFocusIn)

			table.removeEventListener('focusout', onFocusOut)

			unpinControls(table, unit)
		}
	}, [tableRef, unit])
}
