import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

/**
 * The consolidated `preferences` snapshot seeds every column dimension's initial
 * state in one prop — order, hidden, sizing, pins — equivalent to setting each
 * binding's `defaultValue`, and applied at first render so it lands server-side
 * (no post-mount reflow). An explicit per-binding value/defaultValue wins over
 * the snapshot for that dimension.
 */
describe('Grid preferences', () => {
	type Row = { id: number; name: string; role: string; team: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
		{ id: 'team', title: 'Team', cell: (row) => row.team, value: (row) => row.team },
	]

	const rows: Row[] = [{ id: 1, name: 'Ada', role: 'Dev', team: 'Core' }]

	const getKey = (row: Row) => row.id

	const headerOrder = () =>
		screen
			.getAllByRole('columnheader')
			.map((th) => th.getAttribute('data-grid-col'))
			.filter(Boolean)

	it('applies the order from preferences', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				preferences={{ order: ['team', 'name', 'role'] }}
			/>,
		)

		expect(headerOrder()).toEqual(['team', 'name', 'role'])
	})

	it('hides columns listed in preferences', () => {
		renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} preferences={{ hidden: ['role'] }} />,
		)

		expect(headerOrder()).toEqual(['name', 'team'])
	})

	it('seeds column widths from preferences into the colgroup', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				resizable
				preferences={{ columnSizing: { name: 240 } }}
			/>,
		)

		// The fixed-layout <colgroup> renders the seeded width (autosize doesn't run
		// in jsdom, so this is the pure engine seed — SSR would paint the same).
		const cols = container.querySelectorAll('colgroup col')
		const nameCol = Array.from(cols).find((c) => (c as HTMLElement).style.width === '240px')

		expect(nameCol).toBeDefined()
	})

	it('pins a column from preferences', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				preferences={{ pinning: { team: 'left' } }}
			/>,
		)

		expect(container.querySelector('th[data-grid-col="team"]')?.className).toContain('sticky')
	})

	it('an explicit binding wins over the preference for that dimension', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				preferences={{ order: ['team', 'name', 'role'] }}
				columnOrder={{ defaultValue: ['role', 'team', 'name'] }}
			/>,
		)

		expect(headerOrder()).toEqual(['role', 'team', 'name'])
	})

	it('ignores an empty order so the declaration order stands', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} preferences={{ order: [] }} />)

		expect(headerOrder()).toEqual(['name', 'role', 'team'])
	})
})
