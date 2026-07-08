import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridReorder } from '../../modules/grid/use-grid-reorder'
import { useGridRowReorder } from '../../modules/grid/use-grid-row-reorder'

/**
 * The reorder lifecycle callbacks (`onReorderStart` / `onReorderEnd`) map the
 * dragged sortable item back to its grid domain id — a column id for the header
 * reorder, a row key for the row reorder — before handing it to the consumer.
 * The drag mechanics themselves ride `useSortableList` (covered by its own
 * tests); here we pin that id-mapping layer, driving the drag through the
 * `dndContextProps` handlers the same way.
 */
describe('Grid column reorder lifecycle', () => {
	type Row = { name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'age', title: 'Age', cell: (row) => row.age },
	]

	it('forwards the dragged column id to onReorderStart and onReorderEnd', () => {
		const onReorderStart = vi.fn()

		const onReorderEnd = vi.fn()

		const { result } = renderHook(() =>
			useGridReorder<Row>({
				reorder: true,
				visibleColumns: columns,
				reorderColumns: vi.fn(),
				onReorderStart,
				onReorderEnd,
			}),
		)

		act(() => {
			result.current.dndContextProps.onDragStart({ active: { id: 'name' } } as DragStartEvent)
		})

		act(() => {
			result.current.dndContextProps.onDragEnd({
				active: { id: 'name' },
				over: { id: 'age' },
			} as DragEndEvent)
		})

		expect(onReorderStart).toHaveBeenCalledOnce()

		expect(onReorderStart).toHaveBeenCalledWith('name')

		expect(onReorderEnd).toHaveBeenCalledOnce()

		expect(onReorderEnd).toHaveBeenCalledWith('name')
	})
})

describe('Grid row reorder lifecycle', () => {
	type Row = { name: string; age: number }

	const rows: Row[] = [
		{ name: 'Alice', age: 30 },
		{ name: 'Bob', age: 25 },
		{ name: 'Carol', age: 40 },
	]

	const rowKeys = rows.map((row) => row.name)

	it('forwards the dragged row key to onReorderStart and onReorderEnd', () => {
		const onReorderStart = vi.fn()

		const onReorderEnd = vi.fn()

		const { result } = renderHook(() =>
			useGridRowReorder<Row>({
				rowReorder: { onReorder: vi.fn(), onReorderStart, onReorderEnd },
				enabled: true,
				rows,
				rowKeys,
			}),
		)

		act(() => {
			result.current.dndContextProps.onDragStart({ active: { id: 'Bob' } } as DragStartEvent)
		})

		// A cancel (Escape) still concludes the drag, so onReorderEnd fires.
		act(() => {
			result.current.dndContextProps.onDragCancel()
		})

		expect(onReorderStart).toHaveBeenCalledOnce()

		expect(onReorderStart).toHaveBeenCalledWith('Bob')

		expect(onReorderEnd).toHaveBeenCalledOnce()

		expect(onReorderEnd).toHaveBeenCalledWith('Bob')
	})
})
