import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * The body renders each cell through `flexRender`, whose element type is the
 * column's `cell` renderer. The engine builds stable per-id renderers so that
 * type holds across renders — a fresh `columns` array (consumers often pass one
 * inline) reconciles the cell's content in place instead of remounting it, which
 * would drop editor focus and selection. This guards that stability for the
 * read-only grid; the editable commit path is covered by grid-editable.
 */
describe('Grid cell stability across column-array changes', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it('reconciles a cell in place when the columns array identity changes', () => {
		function Harness() {
			const [, setTick] = useState(0)

			// A fresh columns array on every render — would churn the columnDefs and,
			// without stable per-id renderers, remount each cell's content.
			const columns: GridColumn<Row>[] = [
				{ id: 'name', title: 'Name', cell: (row) => <span data-testid="inner">{row.name}</span> },
			]

			return (
				<>
					<button type="button" onClick={() => setTick((tick) => tick + 1)}>
						Rerender
					</button>

					<Grid columns={columns} rows={rows} getKey={getKey} />
				</>
			)
		}

		const { container } = renderUI(<Harness />)

		const before = container.querySelector('[data-testid="inner"]')

		expect(before).not.toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'Rerender' }))

		// Same DOM node: the flexRendered content reconciled rather than remounting.
		expect(container.querySelector('[data-testid="inner"]')).toBe(before)
	})
})
