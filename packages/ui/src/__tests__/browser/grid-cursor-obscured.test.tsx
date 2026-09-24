import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridColumnGroup } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../helpers'

/**
 * The navigable cursor keeps its active cell clear of the grid's sticky header
 * and pinned columns when it scrolls into view (WCAG 2.4.11, Focus Not
 * Obscured): the cell carries a `scroll-margin` sized to that sticky chrome, so
 * `scrollIntoView` leaves room for it. Only a real browser resolves sticky
 * layout (jsdom paints none), so the measurement is asserted here.
 */
describe('grid cursor focus not obscured (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		role: i % 2 === 0 ? 'Admin' : 'User',
	}))

	const getKey = (row: Row) => row.id

	it('gives the active cell a scroll-margin matching the sticky header', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="160px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const header = grid.querySelector<HTMLElement>('th[data-grid-col="role"]')

		if (!header) throw new Error('header cell not found')

		// Seat the cursor; the active cell appears with its scroll-margin applied.
		grid.focus()

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

		const active = present(grid.querySelector('[data-active]'), '[data-active]')

		// The top margin clears the sticky header's full height, so a scroll never
		// tucks the active cell beneath it.
		expect(getComputedStyle(header).position).toBe('sticky')

		expect(Number.parseFloat(active.style.scrollMarginTop)).toBeCloseTo(
			header.getBoundingClientRect().height,
			0,
		)

		// The margin must also take effect. Step the cursor past the bottom edge,
		// then back past the top edge. Each active cell stays in full view, below
		// the sticky header and above the bottom edge of the scroller.
		const scroll = present(
			grid.closest<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		const expectClear = () => {
			const cell = present(grid.querySelector('[data-active]'), '[data-active]')

			const box = cell.getBoundingClientRect()

			expect(box.top).toBeGreaterThanOrEqual(header.getBoundingClientRect().bottom - 1)

			expect(box.bottom).toBeLessThanOrEqual(
				scroll.getBoundingClientRect().top + scroll.clientHeight + 1,
			)
		}

		/** Presses each key in turn, and checks the active cell after each one. */
		const press = async (keys: string[]) => {
			for (const key of keys) {
				fireEvent.keyDown(grid, { key })

				await waitFor(expectClear)
			}
		}

		await press(Array(8).fill('ArrowDown'))

		expect(scroll.scrollTop).toBeGreaterThan(0)

		// A step up can land on a cell that is inside the scroller but under the
		// sticky header. Chromium's nearest scroll moves nothing for such a cell.
		await press(Array(8).fill('ArrowUp'))

		// The same holds on the column that does not stick. The steps above ran on
		// the pinned column, which sticks on two axes.
		await press(['ArrowRight', ...Array(4).fill('ArrowDown')])

		await press(Array(8).fill('ArrowUp'))
	})

	it('gives a cell behind a pinned column a matching side scroll-margin', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="160px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const pinnedHeader = grid.querySelector<HTMLElement>('th[data-grid-col="name"]')

		if (!pinnedHeader) throw new Error('pinned header cell not found')

		grid.focus()

		// Move onto the non-pinned column so a horizontal scroll could tuck it
		// behind the left-pinned one.
		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

		const active = present(grid.querySelector('[data-active]'), '[data-active]')

		expect(Number.parseFloat(active.style.scrollMarginLeft)).toBeCloseTo(
			pinnedHeader.getBoundingClientRect().width,
			0,
		)
	})

	it('keeps the pinned side inset under a column-group band', async () => {
		// A group band never covers a pinned column. The band row puts a sticky
		// filler over it, so the first header row still gives the pinned width.
		const groups: GridColumnGroup[] = [
			{ id: 'who', title: 'Who', columns: ['name'] },
			{ id: 'work', title: 'Work', columns: ['role'] },
		]

		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="200px"
					columns={columns}
					columnGroups={groups}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const pinnedHeader = present(
			grid.querySelector<HTMLElement>('th[data-grid-col="name"]'),
			'th[data-grid-col="name"]',
		)

		grid.focus()

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

		const active = present(grid.querySelector('[data-active]'), '[data-active]')

		expect(Number.parseFloat(active.style.scrollMarginLeft)).toBeCloseTo(
			pinnedHeader.getBoundingClientRect().width,
			0,
		)
	})

	it('keeps the active cell below both sticky header rows of a grid with column groups', async () => {
		const groups: GridColumnGroup[] = [{ id: 'work', title: 'Work', columns: ['role'] }]

		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="200px"
					columns={columns}
					columnGroups={groups}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const scroll = present(
			grid.closest<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		const head = present(grid.querySelector<HTMLElement>('thead'), 'thead')

		// The band and the column row stack, so the sticky chrome is the full head.
		const cover = head.getBoundingClientRect().height

		grid.focus()

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

		const active = present(grid.querySelector('[data-active]'), '[data-active]')

		expect(Number.parseFloat(active.style.scrollMarginTop)).toBeCloseTo(cover, 0)

		const top = scroll.getBoundingClientRect().top + scroll.clientTop

		/** Presses each key in turn, and holds the active cell below the full head. */
		const press = async (keys: string[]) => {
			for (const key of keys) {
				fireEvent.keyDown(grid, { key })

				await waitFor(() => {
					const cell = present(grid.querySelector('[data-active]'), '[data-active]')

					expect(cell.getBoundingClientRect().top).toBeGreaterThanOrEqual(top + cover - 1)
				})
			}
		}

		await press(Array(10).fill('ArrowDown'))

		expect(scroll.scrollTop).toBeGreaterThan(0)

		// Each step up past the top edge lands below the column row, not under it.
		await press(Array(10).fill('ArrowUp'))
	})
})

/**
 * A cell that the cursor moves onto after a horizontal scroll can sit under a
 * pinned column. The cell is then inside the scroller, so the nearest scroll
 * of Chromium moves nothing. The active cell must end clear of the pinned
 * column and inside the scroller.
 */
describe('grid cursor clear of a pinned column after a horizontal scroll (real browser)', () => {
	type Row = { id: number }

	const DATA = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']

	const pin = (side: 'left' | 'right'): GridColumn<Row> => ({
		id: 'pin',
		title: 'Pinned',
		width: 150,
		pinned: side,
		cell: (row) => `P${row.id}`,
	})

	/** Six data columns of 100 pixels, and one pinned column of 150 pixels on `side`. */
	const pinnedColumns = (side: 'left' | 'right'): GridColumn<Row>[] => [
		...(side === 'left' ? [pin('left')] : []),
		...DATA.map((id) => ({ id, title: id, width: 100, cell: (row: Row) => `${id}-${row.id}` })),
		...(side === 'right' ? [pin('right')] : []),
	]

	const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))

	function renderGrid(side: 'left' | 'right', dir: 'ltr' | 'rtl') {
		renderUI(
			<div dir={dir} style={{ width: '420px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="240px"
					columns={pinnedColumns(side)}
					rows={rows}
					getKey={(row) => row.id}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const scroll = present(
			grid.closest<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		const active = () => present(grid.querySelector<HTMLElement>('[data-active]'), '[data-active]')

		/** Presses `key`, and waits until the active cell is in the column `id`. */
		const press = async (key: string, id: string) => {
			fireEvent.keyDown(grid, { key })

			await waitFor(() => expect(active().dataset.gridCol).toBe(id))
		}

		/** Holds the active cell inside the scroller, with no other element over it. */
		const expectUncovered = () => {
			const cell = active()

			const box = cell.getBoundingClientRect()

			const frame = scroll.getBoundingClientRect()

			expect(box.left).toBeGreaterThanOrEqual(frame.left + scroll.clientLeft - 1)

			expect(box.right).toBeLessThanOrEqual(frame.left + scroll.clientLeft + scroll.clientWidth + 1)

			const y = box.top + box.height / 2

			for (const x of [box.left + 2, box.left + box.width / 2, box.right - 2]) {
				expect(cell.contains(document.elementFromPoint(x, y))).toBe(true)
			}
		}

		return { grid, scroll, active, press, expectUncovered }
	}

	const ltrCases = [
		// The cursor comes from the side away from the pinned column.
		{ side: 'left', from: 'c4', target: 'c3', key: 'ArrowLeft' },
		{ side: 'right', from: 'c3', target: 'c4', key: 'ArrowRight' },
	] as const

	for (const { side, from, target, key } of ltrCases) {
		it(`moves a cell out from under a ${side}-pinned column`, async () => {
			const { grid, scroll, press, expectUncovered } = renderGrid(side, 'ltr')

			const cellOf = (id: string) =>
				present(grid.querySelector<HTMLElement>(`tbody td[data-grid-col="${id}"]`), `a ${id} cell`)

			const pinned = present(
				grid.querySelector<HTMLElement>('th[data-grid-col="pin"]'),
				'the pinned head',
			)

			grid.focus()

			fireEvent.keyDown(grid, { key: 'ArrowDown' })

			await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

			for (const id of side === 'left' ? ['c1', 'c2', 'c3', 'c4'] : ['c2', 'c3']) {
				await press('ArrowRight', id)
			}

			expect(grid.querySelector('[data-active]')).toHaveAttribute('data-grid-col', from)

			// Scroll the target to the middle of the pinned column, so that it is
			// under it in full.
			const box = pinned.getBoundingClientRect()

			const cell = cellOf(target).getBoundingClientRect()

			scroll.scrollLeft += cell.left - (box.left + (box.width - cell.width) / 2)

			await waitFor(() => {
				const under = cellOf(target).getBoundingClientRect()

				expect(under.left).toBeGreaterThanOrEqual(pinned.getBoundingClientRect().left - 1)

				expect(under.right).toBeLessThanOrEqual(pinned.getBoundingClientRect().right + 1)
			})

			await press(key, target)

			await waitFor(() => {
				const moved = cellOf(target).getBoundingClientRect()

				const cover = pinned.getBoundingClientRect()

				if (side === 'left') expect(moved.left).toBeGreaterThanOrEqual(cover.right - 1)
				else expect(moved.right).toBeLessThanOrEqual(cover.left + 1)
			})

			expectUncovered()
		})
	}

	// A pinned column takes a physical `left` or `right` offset. In a
	// right-to-left grid it does not stick, so it scrolls with the content. The
	// walk holds each active cell off the pinned column and uncovered at its
	// centre. The start column of a right-to-left grid is clipped, so the walk
	// does not hold the whole cell inside the scroller.
	for (const side of ['left', 'right'] as const) {
		it(`keeps each active cell off a ${side}-pinned column in a right-to-left grid`, async () => {
			const { grid, scroll, active, press } = renderGrid(side, 'rtl')

			const pinned = present(
				grid.querySelector<HTMLElement>('th[data-grid-col="pin"]'),
				'the pinned head',
			)

			const expectOffPin = () => {
				const cell = active()

				if (cell.dataset.gridCol === 'pin') return

				const box = cell.getBoundingClientRect()

				const cover = pinned.getBoundingClientRect()

				expect(box.right <= cover.left + 1 || box.left >= cover.right - 1).toBe(true)

				const x = box.left + box.width / 2

				expect(cell.contains(document.elementFromPoint(x, box.top + box.height / 2))).toBe(true)
			}

			grid.focus()

			fireEvent.keyDown(grid, { key: 'ArrowDown' })

			await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

			const order = side === 'left' ? ['pin', ...DATA] : [...DATA, 'pin']

			for (const id of order.slice(1)) {
				await press('ArrowRight', id)

				await waitFor(expectOffPin)
			}

			expect(scroll.scrollLeft).toBeLessThan(0)

			for (const id of order.slice(0, -1).reverse()) {
				await press('ArrowLeft', id)

				await waitFor(expectOffPin)
			}
		})
	}
})
