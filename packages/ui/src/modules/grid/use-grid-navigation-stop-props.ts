'use client'

import type { ComponentProps, MouseEvent } from 'react'
import { useGridNavContext } from './context'
import { GRID_CELL_PROPS } from './engine/grid-cell-controls'
import { GRID_ROLE } from './engine/grid-constants'
import { fromInteractiveContent } from './engine/grid-row/cell'

/**
 * The props of the one cell of a one-stop row: a group header, a group total,
 * or a detail panel. They are the element id that `aria-activedescendant`
 * names, the `gridcell` role, and a press that seats the cursor on the row.
 * A press on focusable content in the cell stands down, as on a data cell.
 * The header's toggle and a control in a panel are such content, and so is a
 * grid nested in a panel, which seats its own cursor. The props are empty
 * while the cursor is off.
 *
 * @internal
 */
export function useGridNavigationStopProps(key: string): ComponentProps<'td'> {
	const store = useGridNavContext()

	if (!store.enabled) return NO_STOP_PROPS

	return {
		id: store.stopId(key),
		role: 'gridcell',
		...GRID_CELL_PROPS,
		onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => {
			const target = event.target instanceof Node ? event.target : null

			if (!target || !event.currentTarget.contains(target) || fromInteractiveContent(target)) return

			const grid = event.currentTarget.closest<HTMLElement>(GRID_ROLE)

			const element = target instanceof Element ? target : target.parentElement

			if (element?.closest(GRID_ROLE) !== grid) return

			// As on a data cell, the pressed cell is in view, so the focus does not scroll.
			grid?.focus({ preventScroll: true })

			store.seatStop(key)
		},
	}
}

/** The props of a one-stop cell while the cursor is off: none. @internal */
const NO_STOP_PROPS: ComponentProps<'td'> = {}
