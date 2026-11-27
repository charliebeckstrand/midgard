import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, screen, waitFor } from '../../helpers'

/**
 * Holds the focused element inside `grid`, with no other element over it, at
 * its center and near each corner (WCAG 2.4.11, Focus Not Obscured). The
 * sticky header and the pinned columns are the other elements that can cover
 * it. The check reads the top element at
 * each point. The target, a part of it, or an element that holds it is clear.
 */
const expectFocusUncovered = vi.defineHelper((grid: HTMLElement) => {
	const focused = document.activeElement

	expect(grid.contains(focused)).toBe(true)

	if (!(focused instanceof HTMLElement)) throw new Error('no focused element')

	const box = focused.getBoundingClientRect()

	const insetX = Math.min(2, box.width / 4)

	const insetY = Math.min(2, box.height / 4)

	const points = [
		[box.left + box.width / 2, box.top + box.height / 2],
		[box.left + insetX, box.top + insetY],
		[box.right - insetX, box.top + insetY],
		[box.left + insetX, box.bottom - insetY],
		[box.right - insetX, box.bottom - insetY],
	] as const

	const covered = points.flatMap(([x, y]) => {
		const top = document.elementFromPoint(x, y)

		// A box of the target's own wrapper, such as the slot of a field, does not cover it.
		const clear = top !== null && (focused.contains(top) || top.contains(focused))

		return clear ? [] : [`${x},${y} under ${describeElement(top)}`]
	})

	expect(covered, `the points of ${describeElement(focused)} that another element covers`).toEqual(
		[],
	)
})

/** A short name of `element` for a failure message. */
function describeElement(element: Element | null): string {
	if (!element) return 'nothing'

	const cell = element.closest('td, th')

	const name = element.getAttribute('aria-label') ?? element.textContent?.slice(0, 24)

	const slot = element.getAttribute('data-slot')

	const tag = `${element.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}`

	return `${tag} "${name}" in ${cell?.getAttribute('data-grid-col') ?? 'no cell'}`
}

/** Presses each key in turn, and holds the focus clear after each one. */
async function press(grid: HTMLElement, keys: string[]) {
	for (const key of keys) {
		await userEvent.keyboard(key)

		await waitFor(() => expectFocusUncovered(grid))
	}
}

/**
 * Content that the Tab key reaches in a grid with no keyboard cursor takes
 * native focus. The browser scrolls a focus target into view only when it is
 * outside the scroller, so a target inside it but under the sticky header or a
 * pinned column stays hidden. The grid must move it clear, as it does for the
 * cursor (`grid-cursor-obscured.test.tsx`).
 */
describe('grid focus not obscured by sticky chrome (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const rows: Row[] = Array.from({ length: 30 }, (_, index) => ({
		id: index + 1,
		name: `Name ${index + 1}`,
		role: index % 2 === 0 ? 'Admin' : 'User',
	}))

	it('keeps each expander clear of the sticky header of a windowed master-detail grid', async () => {
		const columns: GridColumn<Row>[] = [
			{ id: 'expand', expander: true },
			{ id: 'name', title: 'Name', field: 'name' },
			{ id: 'role', title: 'Role', field: 'role' },
		]

		renderUI(
			<div style={{ width: '360px' }}>
				<Grid
					header={{ position: 'sticky' }}
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					expandable={{ render: (row) => <p>{row.name}</p> }}
					virtualize
					maxHeight="200px"
				/>
			</div>,
		)

		const grid = screen.getByRole('table')

		const first = await waitFor(() =>
			present(
				grid.querySelector<HTMLElement>('[aria-label="Details for row 1"]'),
				'the first expander',
			),
		)

		first.focus()

		await press(grid, Array(10).fill('{Tab}'))

		const scroll = present(
			grid.closest<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		expect(scroll.scrollTop).toBeGreaterThan(0)

		// Each step back lands on an expander inside the scroller. The browser
		// does not scroll it, so the grid must move it out from under the head.
		await press(grid, Array(10).fill('{Shift>}{Tab}{/Shift}'))
	})

	it('keeps a link in a body cell clear of the sticky header', async () => {
		const columns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				cell: (row) => <a href={`#row-${row.id}`}>{row.name}</a>,
			},
			{ id: 'role', title: 'Role', field: 'role' },
		]

		renderUI(
			<div style={{ width: '360px' }}>
				<Grid
					header={{ position: 'sticky' }}
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					maxHeight="200px"
				/>
			</div>,
		)

		const grid = screen.getByRole('table')

		screen.getByRole('link', { name: 'Name 1' }).focus()

		await press(grid, Array(10).fill('{Tab}'))

		await press(grid, Array(10).fill('{Shift>}{Tab}{/Shift}'))
	})

	// Row roving moves real focus from row to row, so the same rule holds for it.
	it('keeps each roving row clear of the sticky header', async () => {
		type GroupedRow = Row & { group?: { key: string; count: number } }

		const columns: GridColumn<GroupedRow>[] = [
			{ id: 'name', title: 'Name', field: 'name' },
			{ id: 'role', title: 'Role', field: 'role' },
		]

		const grouped: GroupedRow[] = [
			{ id: 0, name: 'All', role: '', group: { key: 'all', count: rows.length } },
			...rows,
		]

		renderUI(
			<div style={{ width: '360px' }}>
				<Grid
					header={{ position: 'sticky' }}
					columns={columns}
					rows={grouped}
					getKey={(row) => row.id}
					onRowClick={() => {}}
					groupBy={{
						manual: true,
						value: 'role',
						groupRow: (row) =>
							row.group ? { key: row.group.key, value: row.name, count: row.group.count } : null,
						expanded: new Set(['all']),
					}}
					maxHeight="200px"
				/>
			</div>,
		)

		const grid = screen.getByRole('treegrid')

		present(grid.querySelector<HTMLElement>('tr[data-group-row]'), 'the group header row').focus()

		await press(grid, Array(10).fill('{ArrowDown}'))

		await press(grid, Array(10).fill('{ArrowUp}'))
	})
})

/**
 * The header controls of a column that does not stick pass under a pinned
 * column as the grid scrolls sideways. Tab and Shift+Tab across them must leave
 * each one clear of the pinned columns, on each side and in each direction.
 */
describe('grid header controls clear of pinned columns (real browser)', () => {
	type Row = { id: number }

	const DATA = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']

	const columns: GridColumn<Row>[] = [
		{ id: 'start', title: 'Start', width: 150, pinned: 'left', cell: (row) => `S${row.id}` },
		...DATA.map((id) => ({
			id,
			title: id,
			width: 140,
			sortable: true,
			cell: (row: Row) => `${id}-${row.id}`,
		})),
		{ id: 'end', title: 'End', width: 150, pinned: 'right', cell: (row) => `E${row.id}` },
	]

	const rows: Row[] = Array.from({ length: 5 }, (_, index) => ({ id: index + 1 }))

	for (const dir of ['ltr', 'rtl'] as const) {
		const where = dir === 'rtl' ? ' in a right-to-left grid' : ''

		it(`keeps each sort and resize control clear of the pinned columns${where}`, async () => {
			renderUI(
				<div dir={dir} style={{ width: '520px' }}>
					<Grid resizable columns={columns} rows={rows} getKey={(row) => row.id} />
				</div>,
			)

			const grid = screen.getByRole('table')

			screen.getByRole('button', { name: /c1/ }).focus()

			// Forward across the controls of each data column, then back.
			await press(grid, Array(10).fill('{Tab}'))

			await press(grid, Array(10).fill('{Shift>}{Tab}{/Shift}'))
		})
	}
})
