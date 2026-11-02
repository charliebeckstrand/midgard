import type { ReactElement } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { loadGridReorderKit } from '../../../modules/grid/grid-region'
import { attach, present, waitFor } from '../../helpers'
import { HALF_PIXEL, PIXEL } from '../../helpers/geometry/tolerance'
import { hydrate, serverMarkup } from '../../helpers/hydrate'
import { resizeHandle } from '../helpers/resize-handle'

// The server render has no dnd context. With the module loaded, the table
// mounts again inside that context after the hydration (see `GridReorderHost`).
beforeAll(() => loadGridReorderKit())

/**
 * The observers of the header cells after the table mounts again. A grid that
 * takes a reorder mounts its table one more time after the hydration, so the
 * header cells of the first mount leave the document. The observers must watch
 * the header cells that the grid shows.
 */
describe('Grid header observers after the table mounts again (real browser)', () => {
	type Row = { id: number; name: string; code: string; note: string }

	const rows: Row[] = [
		{ id: 1, name: 'Ann', code: 'A1', note: 'One' },
		{ id: 2, name: 'Bo', code: 'B2', note: 'Two' },
	]

	const header = (root: HTMLElement, id: string) =>
		present(
			root.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`),
			`th[data-grid-col="${id}"]`,
		)

	/**
	 * Hydrates `grid` over its server markup, and gives the header cell of `id`
	 * in that markup.
	 */
	function hydrateGrid(grid: ReactElement, id: string) {
		const container = attach(serverMarkup(grid))

		const before = header(container, id)

		hydrate(container, grid)

		return { container, before }
	}

	/** Makes the header cell of `id` wider with content that React does not own. */
	function widen(root: HTMLElement, id: string) {
		const wide = document.createElement('span')

		wide.style.display = 'inline-block'

		wide.style.width = '240px'

		header(root, id).append(wide)
	}

	it('moves the next frozen column when a frozen header widens', async () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'code', title: 'Code', cell: (row) => row.code, pinned: 'left' },
			{ id: 'note', title: 'Note', cell: (row) => row.note },
		]

		const { container, before } = hydrateGrid(
			<div style={{ width: '480px' }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} reorder />
			</div>,
			'name',
		)

		// The table mounted again, so the header cell of the first mount left.
		await waitFor(() => expect(header(container, 'name')).not.toBe(before))

		expect(before.isConnected).toBe(false)

		widen(container, 'name')

		await waitFor(() =>
			expect(Number.parseFloat(getComputedStyle(header(container, 'code')).left)).toBeNear(
				header(container, 'name').getBoundingClientRect().width,
				HALF_PIXEL,
			),
		)
	})

	it('copies the width of a widened header to its separator', async () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name },
			{ id: 'code', title: 'Code', cell: (row) => row.code },
		]

		const { container, before } = hydrateGrid(
			<div style={{ width: '480px' }}>
				<Grid resizable columns={columns} rows={rows} getKey={(row) => row.id} reorder />
			</div>,
			'name',
		)

		await waitFor(() => expect(header(container, 'name')).not.toBe(before))

		widen(container, 'name')

		await waitFor(() =>
			expect(Number(resizeHandle(container, 'Name').getAttribute('aria-valuenow'))).toBeNear(
				header(container, 'name').getBoundingClientRect().width,
				PIXEL,
			),
		)
	})
})
