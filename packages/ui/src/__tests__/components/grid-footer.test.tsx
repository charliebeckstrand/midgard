import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, renderUI } from '../helpers'

/**
 * The Grid's opt-in `footer` summary bar: a row-count total, a selected-row
 * count, and a custom content slot — each rendered only when enabled, and the bar
 * itself absent when no setting yields output.
 */
describe('Grid footer', () => {
	type Row = { id: number; name: string; role: string }

	const rows: Row[] = [
		{ id: 1, name: 'Ada', role: 'Developer' },
		{ id: 2, name: 'Bo', role: 'Designer' },
		{ id: 3, name: 'Cy', role: 'Developer' },
	]

	const getKey = (row: Row) => row.id

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (r) => r.name, value: (r) => r.name },
		{ id: 'role', title: 'Role', cell: (r) => r.role, value: (r) => r.role },
	]

	const selectColumns: GridColumn<Row>[] = [{ id: 'select', selectable: true }, ...columns]

	it('renders no footer bar without a footer prop', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(bySlot(container, 'grid-footer')).toBeNull()
	})

	it('shows the row total, pluralized', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} footer={{ rowTotal: true }} />,
		)

		expect(bySlot(container, 'grid-footer')?.textContent).toContain('3 rows')
	})

	it('shows a singular row and "No rows" for an empty set', () => {
		const one = renderUI(
			<Grid
				columns={columns}
				rows={[rows[0] as Row]}
				getKey={getKey}
				footer={{ rowTotal: true }}
			/>,
		)

		expect(bySlot(one.container, 'grid-footer')?.textContent).toContain('1 row')

		const none = renderUI(
			<Grid columns={columns} rows={[]} getKey={getKey} footer={{ rowTotal: true }} />,
		)

		expect(bySlot(none.container, 'grid-footer')?.textContent).toContain('No rows')
	})

	it('reads "N of M rows" while a client search narrows the set', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				search={{ defaultValue: 'Ada' }}
				footer={{ rowTotal: true }}
			/>,
		)

		expect(bySlot(container, 'grid-footer')?.textContent).toContain('1 of 3 rows visible')
	})

	it('shows the selected count, nested against the visible extent, only while active', () => {
		const empty = renderUI(
			<Grid columns={selectColumns} rows={rows} getKey={getKey} footer={{ selectedTotal: true }} />,
		)

		// selectedTotal alone with nothing selected yields no output — no bar.
		expect(bySlot(empty.container, 'grid-footer')).toBeNull()

		const selected = renderUI(
			<Grid
				columns={selectColumns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set([1, 2]) }}
				footer={{ selectedTotal: true }}
			/>,
		)

		expect(bySlot(selected.container, 'grid-footer')?.textContent).toContain('2 of 3 rows selected')
	})

	it('replaces the row total with the selected count while a selection is active', () => {
		const idle = renderUI(
			<Grid
				columns={selectColumns}
				rows={rows}
				getKey={getKey}
				footer={{ rowTotal: true, selectedTotal: true }}
			/>,
		)

		// No selection: the leading slot shows the row total.
		expect(bySlot(idle.container, 'grid-footer')?.textContent).toContain('3 rows')

		const selected = renderUI(
			<Grid
				columns={selectColumns}
				rows={rows}
				getKey={getKey}
				selection={{ defaultValue: new Set([1]) }}
				footer={{ rowTotal: true, selectedTotal: true }}
			/>,
		)

		// A selection takes the slot in place — the row total is gone, not stacked.
		const text = bySlot(selected.container, 'grid-footer')?.textContent
		expect(text).toContain('1 of 3 rows selected')
		expect(text).not.toContain('3 rows visible')
	})

	it('renders the custom content slot with live counts', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				footer={{ content: ({ rows: count }) => <span>{count} total</span> }}
			/>,
		)

		expect(bySlot(container, 'grid-footer')?.textContent).toContain('3 total')
	})
})
