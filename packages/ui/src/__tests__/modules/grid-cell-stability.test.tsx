import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

/**
 * The flat and the grouped body both call each column's `cell(row)` inline, so a
 * cell's content is plain elements under the grid's own cell. A fresh `columns`
 * array (consumers often pass one inline) therefore reconciles the content in
 * place instead of remounting it, which would drop editor focus and selection.
 * This guards that stability for the read-only grid; the editable commit path is
 * covered by grid-editing.
 */
describe('Grid cell stability across column-array changes', () => {
	type Row = { id: number; name: string }

	const rows: Row[] = [{ id: 1, name: 'Alice' }]

	const getKey = (row: Row) => row.id

	it.each([
		['flat', undefined],
		['grouped', { value: 'name' }],
	])('reconciles a %s cell in place when the columns array identity changes', (_, groupBy) => {
		function Harness() {
			const [, setTick] = useState(0)

			// A fresh columns array on every render, as a consumer that builds it
			// inline passes.
			const columns: GridColumn<Row>[] = [
				{ id: 'name', title: 'Name', cell: (row) => <span data-testid="inner">{row.name}</span> },
			]

			return (
				<>
					<button type="button" onClick={() => setTick((tick) => tick + 1)}>
						Rerender
					</button>

					<Grid columns={columns} rows={rows} getKey={getKey} groupBy={groupBy} />
				</>
			)
		}

		const { container } = renderUI(<Harness />)

		const before = container.querySelector('[data-testid="inner"]')

		expect(before).not.toBeNull()

		fireEvent.click(screen.getByRole('button', { name: 'Rerender' }))

		// Same DOM node: the content reconciled rather than remounting.
		expect(container.querySelector('[data-testid="inner"]')).toBe(before)
	})
})
