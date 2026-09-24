import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridColumnGroup } from '../../modules/grid'
import { stickyHeadInset } from '../../modules/grid/use-grid-navigation-columns'
import { fireEvent, frames, getSlot, present, renderUI, waitFor } from '../helpers'

/**
 * The two sticky header rows of a grid with column groups, in a real browser.
 * The group band sticks at the top edge, and the column row sticks at the
 * bottom edge of the band. Neither row covers the other while the body
 * scrolls. Only a real browser resolves sticky layout, so the geometry is
 * asserted here.
 */
describe('grid sticky header rows with column groups (real browser)', () => {
	type Row = { id: number; name: string; a: string; b: string; c: string; status: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'a', title: 'A', field: 'a', cell: (row) => row.a },
		{ id: 'b', title: 'B', field: 'b', cell: (row) => row.b },
		{ id: 'c', title: 'C', field: 'c', cell: (row) => row.c },
		{ id: 'status', title: 'Status', field: 'status', cell: (row) => row.status, pinned: 'right' },
	]

	// The widths sum past the viewport, so the grid scrolls on both axes.
	const sizing = { value: { name: 160, a: 200, b: 200, c: 200, status: 140 } }

	const groups: GridColumnGroup[] = [{ id: 'mid', title: 'Middle', columns: ['a', 'b'] }]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		a: `A${i}`,
		b: `B${i}`,
		c: `C${i}`,
		status: 'active',
	}))

	function renderGrid({ virtualize = false }: { virtualize?: boolean } = {}) {
		const view = renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					resizable
					header={{ position: 'sticky' }}
					maxHeight="240px"
					virtualize={virtualize ? { estimateSize: 40 } : undefined}
					columns={columns}
					columnSizing={sizing}
					columnGroups={groups}
					rows={rows}
					getKey={(row) => row.id}
				/>
			</div>,
		)

		const scroll = getSlot(view.container, 'grid-scroll')

		const table = present<HTMLTableElement>(scroll.querySelector('table'), 'table')

		const head = present<HTMLTableSectionElement>(table.tHead, 'thead')

		/** The header cells of the band row (`0`) or the column row (`1`). */
		const cells = (row: 0 | 1) =>
			Array.from(present<HTMLTableRowElement>(head.rows.item(row), `header row ${row}`).cells)

		const scrollTo = async (left: number, top: number) => {
			scroll.scrollLeft = left

			scroll.scrollTop = top

			fireEvent.scroll(scroll)

			await frames()
		}

		return { ...view, scroll, table, head, cells, scrollTo }
	}

	/** The lowest bottom edge of the cells in a row. */
	const bottom = (row: HTMLElement[]) =>
		Math.max(...row.map((cell) => cell.getBoundingClientRect().bottom))

	for (const virtualize of [false, true]) {
		const label = virtualize ? 'in a virtualized body' : 'in a plain body'

		it(`sticks the column row at the bottom of the band, ${label}`, async () => {
			const { scroll, cells, scrollTo } = renderGrid({ virtualize })

			await waitFor(() => expect(cells(1).length).toBe(columns.length))

			await scrollTo(0, 1_500)

			const top = scroll.getBoundingClientRect().top + scroll.clientTop

			await waitFor(() => {
				const band = cells(0)

				const bandBottom = bottom(band)

				// The band sticks at the top edge.
				for (const cell of band) expect(cell.getBoundingClientRect().top).toBeCloseTo(top, 0)

				// The column row sticks at the bottom edge of the band, so no cell of
				// one row covers a cell of the other.
				for (const cell of cells(1))
					expect(cell.getBoundingClientRect().top).toBeCloseTo(bandBottom, 0)
			})
		})
	}

	it('keeps the pinned header cell of each row pinned to its edge', async () => {
		const { scroll, cells, scrollTo } = renderGrid()

		await waitFor(() => expect(cells(1).length).toBe(columns.length))

		const pinnedIn = (row: 0 | 1) => {
			const all = cells(row)

			return { left: present(all[0], 'left cell'), right: present(all.at(-1), 'right cell') }
		}

		const before = [pinnedIn(0), pinnedIn(1)].map(({ left, right }) => ({
			left: left.getBoundingClientRect().left,
			right: right.getBoundingClientRect().right,
		}))

		await scrollTo(300, 1_500)

		await waitFor(() => expect(scroll.scrollLeft).toBeGreaterThan(0))

		const bandBottom = bottom(cells(0))

		for (const row of [0, 1] as const) {
			const { left, right } = pinnedIn(row)

			const edges = before[row]

			if (!edges) throw new Error(`expected the edges of header row ${row}`)

			expect(getComputedStyle(left).position).toBe('sticky')

			expect(left.getBoundingClientRect().left).toBeCloseTo(edges.left, 0)

			expect(right.getBoundingClientRect().right).toBeCloseTo(edges.right, 0)

			// Each pinned cell also keeps the top offset of its row.
			const top = row === 0 ? scroll.getBoundingClientRect().top + scroll.clientTop : bandBottom

			expect(left.getBoundingClientRect().top).toBeCloseTo(top, 0)

			expect(right.getBoundingClientRect().top).toBeCloseTo(top, 0)
		}
	})

	it('reports the full head height as the sticky head inset', async () => {
		const { scroll, table, head, cells, scrollTo } = renderGrid()

		await waitFor(() => expect(cells(1).length).toBe(columns.length))

		expect(stickyHeadInset(table)).toBeCloseTo(head.getBoundingClientRect().height, 0)

		// Once scrolled, the inset still reaches the bottom of the column row.
		await scrollTo(0, 1_500)

		const top = scroll.getBoundingClientRect().top + scroll.clientTop

		await waitFor(() => expect(stickyHeadInset(table)).toBeCloseTo(bottom(cells(1)) - top, 0))
	})
})
