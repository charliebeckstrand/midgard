import type { RenderResult } from '@testing-library/react'
import { type Mock, vi } from 'vitest'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { renderUI } from './render-ui'
import { allBySlot } from './slot-queries'

/**
 * The fixtures of the suites of the grid-owned edit session: the
 * `grid-editing*.test.tsx` files in `modules/`.
 *
 * Not re-exported from `helpers/index.ts`. Only the edit suites use this
 * module, and most test files load that barrel.
 */

export type SessionRow = { id: number; name: string; count: number; done: boolean }

export const sessionRows: SessionRow[] = [
	{ id: 1, name: 'Alice', count: 2, done: false },
	{ id: 2, name: 'Bob', count: 5, done: true },
]

export const sessionColumns: GridColumn<SessionRow>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
]

/** The text and number editors mounted in the grid; the fixtures mount no other. */
export function editorsIn(container: HTMLElement) {
	return [
		...allBySlot(container, 'grid-edit-input'),
		...allBySlot(container, 'grid-edit-number-input'),
	]
}

/** The render of {@link renderSessionGrid}, with its spies and a cell query. */
type SessionGrid = RenderResult & {
	onCommit: Mock
	onRowsChange: Mock
	/** The cell of column `col` in the row at `rowIndex` of the body. */
	cell: (col: string, rowIndex?: number) => HTMLElement
}

/**
 * Renders a grid over the spies the grid-owned suites assert on. `editable`
 * takes the scope under test and any per-case binding, and spreads last, so a
 * case can hand back the session by passing `session: 'manual'`. `cols` takes
 * the column shape a case needs. `rows` stays uncontrolled unless a case binds
 * it, so `onRowsChange` here reports the grid's own writes.
 */
export function renderSessionGrid({
	editable,
	cols = sessionColumns,
	rows = sessionRows,
}: {
	editable?: Partial<GridEditableConfig>
	cols?: GridColumn<SessionRow>[]
	rows?: SessionRow[]
} = {}): SessionGrid {
	const onCommit = vi.fn()

	const onRowsChange = vi.fn()

	const view = renderUI(
		<Grid
			columns={cols}
			rows={rows}
			getKey={(row) => row.id}
			editable={{ session: 'managed', onRowsChange, onCommit, ...editable }}
		/>,
	)

	return {
		...view,
		onCommit,
		onRowsChange,
		cell: (col: string, rowIndex = 0) =>
			view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
				rowIndex
			] as HTMLElement,
	}
}
