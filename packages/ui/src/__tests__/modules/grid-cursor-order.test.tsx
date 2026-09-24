import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, fireEvent, renderUI, screen } from '../helpers'

/**
 * The navigable cursor over a body that renders more than data rows. A group
 * header, a group total, and a detail panel are one stop each. A data row keeps
 * a stop for each data column.
 */
type Sale = { id: number; region: string; units: number }

const sales: Sale[] = [
	{ id: 1, region: 'West', units: 10 },
	{ id: 2, region: 'West', units: 30 },
	{ id: 3, region: 'East', units: 20 },
]

const columns: GridColumn<Sale>[] = [
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{
		id: 'units',
		title: 'Units',
		cell: (row) => `${row.units} units`,
		value: (row) => row.units,
		aggFunc: 'sum',
	},
]

const getKey = (row: Sale) => row.id

/** The cell that `aria-activedescendant` names, or `null` when the cursor is unseated. */
function activeCell(grid: HTMLElement): HTMLElement | null {
	const id = grid.getAttribute('aria-activedescendant')

	return id ? document.getElementById(id) : null
}

function press(grid: HTMLElement, key: string) {
	fireEvent.keyDown(grid, { key })
}

describe('Grid cursor over grouped rows', () => {
	function renderGrouped(props: { groupTotalRow?: boolean; onRowClick?: () => void } = {}) {
		renderUI(
			<Grid
				columns={columns}
				rows={sales}
				getKey={getKey}
				groupBy={{ value: 'region' }}
				navigable
				{...props}
			/>,
		)

		return screen.getByRole('treegrid')
	}

	it('makes a grouped grid a treegrid with a level on each row', () => {
		const grid = renderGrouped({ groupTotalRow: true })

		expect(grid).toHaveAccessibleName('Data grid')

		const header = grid.querySelector('tr[data-group-row]')

		expect(header).toHaveAttribute('aria-level', '1')

		expect(header).toHaveAttribute('aria-expanded', 'true')

		expect(grid.querySelector('tr[data-total-row="group"]')).toHaveAttribute('aria-level', '2')

		const leaf = screen.getAllByText(/^West$/)[0]?.closest('tr')

		expect(leaf).toHaveAttribute('aria-level', '2')
	})

	it('marks a closed group as not expanded', () => {
		const grid = renderGrouped()

		act(() => grid.focus())

		press(grid, 'Enter')

		expect(grid.querySelector('tr[data-group-row]')).toHaveAttribute('aria-expanded', 'false')
	})

	it('seats the cursor on a group header that is pressed', () => {
		const grid = renderGrouped()

		// The cell of the second header, pressed off its toggle button.
		const cell = grid.querySelectorAll('tr[data-group-row]')[1]?.querySelector('td')

		fireEvent.mouseDown(cell as HTMLElement)

		expect(grid).toHaveFocus()

		expect(activeCell(grid)).toBe(cell)
	})

	it('seats on the first group header when the grid takes focus', () => {
		const grid = renderGrouped()

		act(() => grid.focus())

		const cell = activeCell(grid)

		expect(cell?.closest('tr')).toHaveAttribute('data-group-row')

		expect(cell).toHaveAttribute('role', 'gridcell')

		expect(cell).toHaveAttribute('data-active')
	})

	it('steps from a header into its leaves and back, keeping the column', () => {
		const grid = renderGrouped()

		act(() => grid.focus())

		const header = activeCell(grid)

		// ArrowRight on an open group steps to its first leaf.
		press(grid, 'ArrowRight')

		expect(activeCell(grid)).toHaveTextContent(/^West$/)

		press(grid, 'ArrowRight')

		expect(activeCell(grid)).toHaveTextContent('units')

		press(grid, 'ArrowUp')

		expect(activeCell(grid)).toBe(header)

		// The header remembers the column the cursor came from.
		press(grid, 'ArrowDown')

		expect(activeCell(grid)).toHaveTextContent('units')
	})

	it('closes and opens a group on Enter, and skips the leaves of a closed group', () => {
		const grid = renderGrouped()

		act(() => grid.focus())

		const header = activeCell(grid)?.closest('tr')

		press(grid, 'Enter')

		expect(header).not.toHaveAttribute('data-expanded')

		// The next row of the order is the next group header.
		press(grid, 'ArrowDown')

		const next = activeCell(grid)?.closest('tr')

		expect(next).toHaveAttribute('data-group-row')

		expect(next).not.toBe(header)

		press(grid, 'ArrowUp')

		press(grid, 'ArrowRight')

		expect(header).toHaveAttribute('data-expanded')

		// ArrowLeft closes it again.
		press(grid, 'ArrowLeft')

		expect(header).not.toHaveAttribute('data-expanded')
	})

	it('moves the cursor to its header when the group of its leaf closes', () => {
		const grid = renderGrouped()

		act(() => grid.focus())

		const header = activeCell(grid)

		press(grid, 'ArrowDown')

		expect(activeCell(grid)).toHaveTextContent(/^West$/)

		fireEvent.click(screen.getAllByRole('button', { name: /^Collapse group/ })[0] as HTMLElement)

		expect(activeCell(grid)).toBe(header)
	})

	it('stops once on each group total', () => {
		const grid = renderGrouped({ groupTotalRow: true })

		act(() => grid.focus())

		// The first group's header, its two leaves, then its total.
		press(grid, 'ArrowDown')

		press(grid, 'ArrowDown')

		press(grid, 'ArrowDown')

		const total = activeCell(grid)

		expect(total?.closest('tr')).toHaveAttribute('data-total-row', 'group')

		// A total has one stop, so ArrowRight holds the cursor.
		press(grid, 'ArrowRight')

		expect(activeCell(grid)).toBe(total)
	})

	it('activates a leaf, and not a header, on Enter', () => {
		const onRowClick = vi.fn()

		const grid = renderGrouped({ onRowClick })

		act(() => grid.focus())

		// Enter on a header toggles its group, twice here, and activates nothing.
		press(grid, 'Enter')

		press(grid, 'Enter')

		expect(onRowClick).not.toHaveBeenCalled()

		press(grid, 'ArrowDown')

		press(grid, 'Enter')

		expect(onRowClick).toHaveBeenCalledTimes(1)

		expect(onRowClick.mock.calls[0]?.[0]).toMatchObject({ region: 'West' })
	})

	it('keeps a plain grouped table free of tree attributes', () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={sales} getKey={getKey} groupBy={{ value: 'region' }} />,
		)

		expect(container.querySelector('[aria-level]')).toBeNull()

		expect(container.querySelector('tr[aria-expanded]')).toBeNull()
	})

	it("applies a column's cell props to the cells of a leaf", () => {
		const [region, units] = columns as [GridColumn<Sale>, GridColumn<Sale>]

		const { container } = renderUI(
			<Grid
				columns={[{ ...region, cellProps: (row) => ({ title: `Sale ${row.id}` }) }, units]}
				rows={sales}
				getKey={getKey}
				groupBy={{ value: 'region' }}
			/>,
		)

		expect(container.querySelectorAll('td[title^="Sale "]')).toHaveLength(sales.length)
	})
})

describe('Grid cursor over master-detail rows', () => {
	const detailColumns: GridColumn<Sale>[] = [{ id: 'expand', expander: true }, ...columns]

	function renderDetail() {
		renderUI(
			<Grid
				columns={detailColumns}
				rows={sales}
				getKey={getKey}
				navigable
				expandable={{
					defaultValue: new Set([1]),
					render: (row) => <button type="button">Edit {row.id}</button>,
				}}
			/>,
		)

		return screen.getByRole('grid')
	}

	it('keeps the navigable cursor while expandable', () => {
		const grid = renderDetail()

		expect(grid.tagName).toBe('TABLE')
	})

	it('walks an open panel as one stop between its row and the next', () => {
		const grid = renderDetail()

		act(() => grid.focus())

		expect(activeCell(grid)).toHaveTextContent('West')

		press(grid, 'ArrowDown')

		const panel = activeCell(grid)

		expect(panel?.closest('tr')).toHaveAttribute('data-detail-row', '1')

		expect(panel).toHaveAttribute('data-active')

		press(grid, 'ArrowDown')

		expect(activeCell(grid)?.closest('tr')).toHaveAttribute('data-grid-row')

		expect(activeCell(grid)).toHaveTextContent('West')

		// The closed panel of row 2 is not a stop.
		press(grid, 'ArrowDown')

		expect(activeCell(grid)).toHaveTextContent('East')
	})

	it('moves focus into a panel on Enter and back to the grid on Escape', () => {
		const grid = renderDetail()

		act(() => grid.focus())

		press(grid, 'ArrowDown')

		press(grid, 'Enter')

		const edit = screen.getByRole('button', { name: 'Edit 1' })

		expect(edit).toHaveFocus()

		fireEvent.keyDown(edit, { key: 'Escape' })

		expect(grid).toHaveFocus()

		expect(activeCell(grid)?.closest('tr')).toHaveAttribute('data-detail-row', '1')
	})
})
