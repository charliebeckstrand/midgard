'use client'

import type { GridDataProps } from './grid-data-types'
import { useGridDataRender } from './use-grid-data-render'
import { useGridDataSetup } from './use-grid-data-setup'
import { useGridEditCursor } from './use-grid-edit-cursor'

/**
 * An editable grid: the phases of {@link GridData} with the editing cursor
 * ({@link useGridEditCursor}). It is the entry of the chunk of the editing
 * layer, so only an editable grid loads the editors, the new-row slot, and the
 * row form.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function GridDataEditable<T>(props: GridDataProps<T>) {
	const setup = useGridDataSetup<T>(props)

	const cursor = useGridEditCursor<T>(setup.cursorInput)

	return useGridDataRender<T>(props, setup, cursor)
}
