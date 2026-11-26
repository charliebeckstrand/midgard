import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI, screen } from '../helpers'

type Row = {
	id: number | string
	name: string
	role: string
	group?: { key: string; count: number }
}

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
]

const rows: Row[] = [
	{ id: 'g:all', name: 'All', role: '', group: { key: 'all', count: 2 } },
	{ id: 1, name: 'Alice', role: 'Admin' },
	{ id: 2, name: 'Bob', role: 'User' },
]

const groupRow = (row: Row) =>
	row.group ? { key: row.group.key, value: row.name, count: row.group.count } : null

/** A manual grouping that roves rows, with its expansion in state. */
function Owner() {
	const [expanded, setExpanded] = useState<Set<string | number>>(() => new Set(['all']))

	return (
		<>
			<button type="button">Before</button>
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				onRowClick={() => {}}
				groupBy={{ manual: true, value: 'role', groupRow, expanded, onExpandedChange: setExpanded }}
			/>
		</>
	)
}

/**
 * The group header of a roving manual grouping, with real keys (real
 * browser). Tab enters the body at the header, and the arrows reach it.
 */
describe('grid roving group header (real browser)', () => {
	it('enters at the header with Tab, and toggles and steps with the arrows', async () => {
		renderUI(<Owner />)

		const header = present(
			document.querySelector<HTMLElement>('tr[data-group-row]'),
			'the group header row',
		)

		await userEvent.click(screen.getByRole('button', { name: 'Before' }))

		// Tab passes the sort buttons of the column headers, and enters the body
		// at its one stop.
		for (let press = 0; press < 5 && !document.activeElement?.closest('tbody'); press++) {
			await userEvent.tab()
		}

		expect(header).toHaveFocus()

		await userEvent.keyboard('{ArrowLeft}')

		expect(header).toBeCollapsed()

		await userEvent.keyboard('{ArrowRight}')

		expect(header).toBeExpanded()

		await userEvent.keyboard('{ArrowRight}')

		expect(screen.getByText('Alice').closest('tr')).toHaveFocus()

		await userEvent.keyboard('{ArrowUp}')

		expect(header).toHaveFocus()

		// Tab leaves the grid: the disclosure button is not a stop of its own.
		await userEvent.tab()

		expect(header.contains(document.activeElement)).toBe(false)
	})
})
