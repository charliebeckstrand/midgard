import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * The `outline` variant of the grid. The grid passes `outline` to `<Table>`,
 * which draws the cell rules in `border-collapse: separate` mode (see
 * `kata/table`). Each rule is on its cell, so the rules of a sticky header and
 * of a frozen column move with those cells. The real-browser case
 * `geometry/table-outline-rules` shows that each cell edge has one rule.
 */
describe('Grid outline', () => {
	type Row = { id: number; name: string; email: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
	]

	const rows: Row[] = [{ id: 1, name: 'Ada', email: 'ada@example.com' }]

	const getKey = (row: Row) => row.id

	it('draws the Table outline in separate-border mode, one rule on each cell edge', () => {
		renderUI(<Grid outline columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		for (const name of [
			'border-separate',
			'border-spacing-0',
			'[&>*>tr>:is(td,th)]:border-e',
			'[&>*>tr>:is(td,th)]:border-b',
			'[&>:nth-child(1_of_thead,tbody,tfoot)>tr:first-child>*]:border-t',
			'[&>*>tr>*:first-child]:border-s',
		]) {
			expect(table).toHaveClass(name)
		}
	})

	// The weights are those of the Card outline: `true` is the default weight.
	it.each([
		['the default weight for `true`', true, 'border-zinc-950/10'],
		['the subtle weight', 'subtle', 'border-zinc-950/5'],
		['the strong weight', 'strong', 'border-zinc-950/15'],
	] as const)('colors the rules in %s', (_, outline, color) => {
		renderUI(<Grid outline={outline} columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		expect(table).toHaveClass(`[&>*>tr>:is(td,th)]:${color}`)

		expect(table).toHaveClass('border-separate')
	})

	it('omits the outline borders on a plain grid', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		const table = screen.getByRole('table')

		expect(table).not.toHaveClass('border-separate')

		expect(table).not.toHaveClass('[&>*>tr>:is(td,th)]:border-e')
	})

	// Outlined + bare `striped` reads as `'odd'`, not `<Table>`'s even default. An
	// explicit parity wins, and with no outline `striped` keeps the even default.
	it.each([
		['defaults a bare `striped` to odd parity when outlined', true, true, 'odd', 'even'],
		['defaults a bare `striped` to odd parity under a named weight', 'subtle', true, 'odd', 'even'],
		['lets an explicit striped parity override the outline default', true, 'even', 'even', 'odd'],
		['keeps the even default for a bare `striped` on a plain grid', false, true, 'even', 'odd'],
	] as const)('%s', (_, outline, striped, on, off) => {
		renderUI(
			<Grid outline={outline} striped={striped} columns={columns} rows={rows} getKey={getKey} />,
		)

		const table = screen.getByRole('table')

		expect(table).toHaveClass(`[&>tbody>tr:nth-child(${on})]:bg-zinc-950/2.5`)

		expect(table).not.toHaveClass(`[&>tbody>tr:nth-child(${off})]:bg-zinc-950/2.5`)
	})
})
