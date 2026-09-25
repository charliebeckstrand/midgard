import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import type { useGridTruncation } from '../../modules/grid/use-grid-truncation'
import { fireEvent, renderUI, screen } from '../helpers'

// Counts the renders of the truncating body cells. A body cell passes a settle
// subscription, and a header title passes none.
const cellRenders = vi.hoisted(() => ({ count: 0 }))

vi.mock('../../modules/grid/use-grid-truncation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/grid/use-grid-truncation')>()

	return {
		...actual,
		useGridTruncation: ((...args: Parameters<typeof actual.useGridTruncation>) => {
			if (args[0]) cellRenders.count++

			return actual.useGridTruncation(...args)
		}) as typeof useGridTruncation,
	}
})

/**
 * A drag-resize holds the truncation tooltips closed, and measures again when it
 * settles. The body cells read the drag state from the settle store when they
 * measure, so the start and the end of a drag render no body cell again.
 */
describe('Grid column drag-resize', () => {
	type Row = { id: number; city: string; name: string }

	const rows: Row[] = Array.from({ length: 50 }, (_, id) => ({
		id,
		city: `City ${id}`,
		name: `Name ${id}`,
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'city', title: 'City', cell: (row) => row.city },
		{ id: 'name', title: 'Name', cell: (row) => row.name },
	]

	it('renders no truncating body cell again across a drag', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} resizable truncate />)

		expect(cellRenders.count).toBeGreaterThan(0)

		cellRenders.count = 0

		fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize City' }), {
			button: 0,
			clientX: 100,
		})

		fireEvent.mouseMove(document, { clientX: 130 })

		fireEvent.mouseUp(document, { clientX: 130 })

		expect(cellRenders.count).toBe(0)
	})
})
