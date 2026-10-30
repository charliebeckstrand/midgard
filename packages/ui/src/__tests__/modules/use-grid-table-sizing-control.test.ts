import { renderHook } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { GridColumn, GridColumnSizingState } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

type Row = { id: number; a: string }

const columns: GridColumn<Row>[] = [{ id: 'a', title: 'A', cell: (row) => row.a }]

const rows: Row[] = [{ id: 1, a: 'a' }]

const getKey = (row: Row) => row.id

// A binding on `useControllable` stays controlled after its first value, and a
// later `undefined` reads as an empty value. The sizing state follows that
// rule, so the column sizing must follow it too. Otherwise the grid renders the
// automatic layout, and its writes go to a state that stores nothing. The
// first value names no width, so the grid does not mount in manual mode.
it('keeps the column sizing controlled after the binding clears its value', () => {
	const { result, rerender } = renderHook(
		({ value }: { value: GridColumnSizingState | undefined }) =>
			useGridTable<Row>({
				rows,
				columns,
				getKey,
				resizable: true,
				columnSizing: { value, onValueChange: () => {} },
			}),
		{ initialProps: { value: {} as GridColumnSizingState | undefined } },
	)

	expect(result.current.resize?.fit).toBeNull()

	rerender({ value: undefined })

	expect(result.current.resize?.fit).toBeNull()
})
