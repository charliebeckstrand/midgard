import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridColumnGroup } from '../../modules/grid'
import { fireEvent, renderUI } from '../helpers'

/**
 * The column-group band row the Grid draws above its column headers: the band
 * spans its members, keeps grouped columns contiguous, and — when collapsible —
 * folds to its first member behind an expand toggle.
 */
describe('Grid column groups', () => {
	type Row = { id: number; first: string; last: string; email: string }

	const rows: Row[] = [
		{ id: 1, first: 'Ada', last: 'Byron', email: 'ada@example.com' },
		{ id: 2, first: 'Bo', last: 'Diddley', email: 'bo@example.com' },
	]

	const getKey = (row: Row) => row.id

	const columns: GridColumn<Row>[] = [
		{ id: 'first', title: 'First', cell: (r) => r.first },
		{ id: 'last', title: 'Last', cell: (r) => r.last },
		{ id: 'email', title: 'Email', cell: (r) => r.email },
	]

	const groups: GridColumnGroup[] = [{ id: 'name', title: 'Name', columns: ['first', 'last'] }]

	const bandCell = (root: HTMLElement) =>
		root.querySelector<HTMLTableCellElement>('thead th[scope="colgroup"]')

	it('renders a band spanning its member columns', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} groups={groups} />,
		)

		const band = bandCell(container)

		expect(band).not.toBeNull()

		expect(band?.textContent).toContain('Name')

		expect(band?.colSpan).toBe(2)
	})

	it('renders no band row when no group is configured', () => {
		const { container } = renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(bandCell(container)).toBeNull()
	})

	it('underlines a colored group’s band in its color, and leaves an uncolored band plain', () => {
		const colored: GridColumnGroup[] = [
			{ id: 'name', title: 'Name', color: 'blue', columns: ['first', 'last'] },
		]

		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} groups={colored} />,
		)

		const band = bandCell(container)

		expect(band?.className).toContain('border-blue-600')

		expect(band?.className).toContain('border-b-2')
	})

	it('draws no band underline for a colorless group', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} groups={groups} />,
		)

		expect(bandCell(container)?.className ?? '').not.toContain('border-b-2')
	})

	it('keeps grouped columns contiguous despite declaration order', () => {
		const split: GridColumn<Row>[] = [
			{ id: 'first', title: 'First', cell: (r) => r.first },
			{ id: 'email', title: 'Email', cell: (r) => r.email },
			{ id: 'last', title: 'Last', cell: (r) => r.last },
		]

		const { container } = renderUI(
			<Grid columns={split} rows={rows} getKey={getKey} groups={groups} />,
		)

		const headers = Array.from(
			container.querySelectorAll<HTMLElement>('thead th[data-grid-col]'),
		).map((th) => th.getAttribute('data-grid-col'))

		expect(headers).toEqual(['first', 'last', 'email'])
	})

	it('collapses a collapsible group to its anchor and expands again', () => {
		const collapsible: GridColumnGroup[] = [
			{ id: 'name', title: 'Name', columns: ['first', 'last'], collapsible: true },
		]

		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={getKey} groups={collapsible} />,
		)

		const dataColHeaders = () =>
			Array.from(container.querySelectorAll<HTMLElement>('thead th[data-grid-col]')).map((th) =>
				th.getAttribute('data-grid-col'),
			)

		expect(dataColHeaders()).toEqual(['first', 'last', 'email'])

		const toggle = container.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')

		expect(toggle).not.toBeNull()

		fireEvent.click(toggle as HTMLButtonElement)

		// Collapsed: the second member hides, the anchor stays.
		expect(dataColHeaders()).toEqual(['first', 'email'])

		const expand = container.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')

		fireEvent.click(expand as HTMLButtonElement)

		expect(dataColHeaders()).toEqual(['first', 'last', 'email'])
	})
})
