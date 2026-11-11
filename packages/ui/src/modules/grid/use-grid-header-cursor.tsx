'use client'

import { type ComponentProps, type MouseEvent, type ReactNode, useMemo } from 'react'
import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/grid'
import { useGridNavContext } from './context'
import { GRID_CELL_PROPS } from './engine/grid-cell-controls'
import { focusGridOnPress, GridNavigationCell } from './grid-navigation-cell'
import { HEADER_ROW_INDEX } from './use-grid-navigation'

/**
 * The cursor parts of one header cell: the `<th>` props, and the marker that
 * the cell renders after its content. @internal
 */
export type GridHeaderCursor = {
	/** The cell id, the cursor's marker attribute, its ring, and a press that seats the cursor. */
	props: Pick<ComponentProps<'th'>, 'id' | 'className' | 'onMouseDown'>
	/** The active-cell marker (see {@link GridNavigationCell}). */
	marker: ReactNode
}

/**
 * The cursor parts of the header cell of the column at `col`, the column's
 * index in the cursor, or `null` while the grid has no cursor. The header row
 * is the first row of the cursor (see `HEADER_ROW_INDEX`).
 *
 * A press on the cell seats the cursor there, as a press on a body cell does
 * (see `focusGridOnPress`). The value keeps its identity while the column
 * keeps its place, so a memoized header holds.
 *
 * @internal
 */
export function useGridHeaderCursor(col: number): GridHeaderCursor | null {
	const store = useGridNavContext()

	return useMemo(() => {
		if (!store.enabled) return null

		return {
			props: {
				...GRID_CELL_PROPS,
				id: store.cellId(HEADER_ROW_INDEX, col),
				className: cn(k.nav.cell),
				onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => {
					if (focusGridOnPress(event)) store.seatHeader(col)
				},
			},
			marker: <GridNavigationCell row={HEADER_ROW_INDEX} col={col} fills={false} />,
		}
	}, [store, col])
}
