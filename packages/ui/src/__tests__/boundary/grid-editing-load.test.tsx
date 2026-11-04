import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'

// The editing layer of the grid is in a chunk of its own, and only an editable
// grid loads it. The `unit` project loads the chunk before each file (see
// `setup/grid-modules.ts`), so this suite needs a cold module registry. It sits
// in `boundary/`, which the `integration` project runs on forks.
//
// The mock gives the real module, counts each load of it, and holds the load
// until the case releases it.

const loads = vi.hoisted(() => {
	let release = () => {}

	const gate = new Promise<void>((resolve) => {
		release = resolve
	})

	return { count: 0, gate, release: () => release() }
})

vi.mock('../../modules/grid/grid-data-editable', async (importOriginal) => {
	loads.count++

	await loads.gate

	return importOriginal()
})

type Row = { id: number; name: string }

const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', field: 'name' }]

const rows: Row[] = [{ id: 1, name: 'Ada' }]

describe('the editing layer of the grid', () => {
	it('loads only for an editable grid, which renders read-only until the layer is there', async () => {
		const { unmount } = render(<Grid columns={columns} rows={rows} getKey={(row) => row.id} />)

		await new Promise((resolve) => setTimeout(resolve, 0))

		// A grid with no `editable` does not load the layer.
		expect(loads.count).toBe(0)

		unmount()

		// The render suspends, so it goes in an awaited `act`. React retries the
		// render of a suspended grid only from the queue that such an `act` drains.
		await act(async () => {
			render(
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', onCommit: vi.fn() }}
				/>,
			)
		})

		// Until the layer is loaded, the grid renders read-only in its place: no
		// cursor, so no `grid` role.
		expect(screen.getByRole('table')).toBeTruthy()

		expect(screen.queryByRole('grid')).toBeNull()

		// Then the editable grid mounts, with the cursor of an editable grid.
		loads.release()

		expect(await screen.findByRole('grid', {}, { timeout: 4_000 })).toBeTruthy()

		expect(loads.count).toBe(1)
	})
})
