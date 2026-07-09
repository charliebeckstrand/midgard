import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * The `outline` variant's cell borders. The grid draws them from its `<table>` in
 * `border-collapse: separate` mode (see `kata/grid` `outline`), not by forwarding
 * `outline` to `<Table>` — collapse-mode borders weld to the table grid and scroll
 * out from under the sticky header and frozen columns, opening a seam above the
 * header and shifting a frozen column's leading rule. Separate borders ride the
 * cell, so the sticky/frozen frame holds; these assert the projection is applied
 * (the frozen behaviour itself is a browser-suite concern).
 */
describe('Grid outline', () => {
	type Row = { id: number; name: string; email: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
	]

	const rows: Row[] = [{ id: 1, name: 'Ada', email: 'ada@example.com' }]

	const getKey = (row: Row) => row.id

	it('draws the outline in separate-border mode so the rules ride their cells', () => {
		renderUI(<Grid outline columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		// Separate, flush cells — the model that keeps sticky/frozen borders stable.
		expect(table).toHaveClass('border-separate')

		expect(table).toHaveClass('border-spacing-0')
	})

	it('projects a right/bottom rule per cell plus a top/left outer frame', () => {
		renderUI(<Grid outline columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		// Interior gridlines + the right/bottom outer edges, on every cell.
		expect(table).toHaveClass('[&>*>tr>td]:border-r')

		expect(table).toHaveClass('[&>*>tr>td]:border-b')

		expect(table).toHaveClass('[&>*>tr>th]:border-r')

		expect(table).toHaveClass('[&>*>tr>th]:border-b')

		// Top edge on the first header row (rides the sticky header); left edge on each
		// row's first cell (rides a frozen leading column). Together they close the two
		// edges the right/bottom scheme leaves open, without doubling any interior line.
		expect(table).toHaveClass('[&>thead>tr:first-child>th]:border-t')

		expect(table).toHaveClass('[&>*>tr>*:first-child]:border-l')
	})

	it('does not forward the collapse-mode Table outline projection', () => {
		renderUI(<Grid outline columns={columns} rows={rows} getKey={getKey} />)

		// The grid owns its outline; the base `<Table outline>` all-sides border
		// projection (`[&>*>tr>td]:border`) would double the separate-mode rules.
		expect(screen.getByRole('table')).not.toHaveClass('[&>*>tr>td]:border')
	})

	it('omits the outline borders on a plain grid', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		expect(table).not.toHaveClass('border-separate')

		expect(table).not.toHaveClass('[&>*>tr>td]:border-r')
	})

	it('defaults a bare `striped` to odd parity when outlined', () => {
		renderUI(<Grid outline striped columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		// Outlined + bare `striped` reads as `'odd'`, not `<Table>`'s even default.
		expect(table).toHaveClass('[&>tbody>tr:nth-child(odd)]:bg-zinc-950/2.5')

		expect(table).not.toHaveClass('[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5')
	})

	it('lets an explicit striped parity override the outline default', () => {
		renderUI(<Grid outline striped="even" columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		expect(table).toHaveClass('[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5')

		expect(table).not.toHaveClass('[&>tbody>tr:nth-child(odd)]:bg-zinc-950/2.5')
	})

	it('keeps the even default for a bare `striped` on a plain grid', () => {
		renderUI(<Grid striped columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		// No outline: `striped` keeps `<Table>`'s historical even-row default.
		expect(table).toHaveClass('[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5')

		expect(table).not.toHaveClass('[&>tbody>tr:nth-child(odd)]:bg-zinc-950/2.5')
	})
})
