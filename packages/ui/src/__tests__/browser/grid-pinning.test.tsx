import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Column pinning against a real layout engine: sticky positioning only resolves
 * in a browser (jsdom paints no layout, so it can only assert the classes and
 * offset styles). Here the grid overflows a narrow viewport and scrolls
 * horizontally; a frozen column must hold its on-screen position while the
 * scrolling columns slide beneath it.
 */
describe('grid column pinning (real browser)', () => {
	type Row = {
		id: number
		name: string
		a: string
		b: string
		c: string
		d: string
		status: string
	}

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'a', title: 'A', cell: (row) => row.a },
		{ id: 'b', title: 'B', cell: (row) => row.b },
		{ id: 'c', title: 'C', cell: (row) => row.c },
		{ id: 'd', title: 'D', cell: (row) => row.d },
		{ id: 'status', title: 'Status', cell: (row) => row.status, pinned: 'right' },
	]

	// Controlled widths sum to 1100px and stand auto-fit down (which would
	// otherwise shrink the columns to fit the viewport and remove the overflow).
	const sizing = { value: { name: 160, a: 200, b: 200, c: 200, d: 200, status: 140 } }

	const rows: Row[] = Array.from({ length: 4 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		a: `A${i}`,
		b: `B${i}`,
		c: `C${i}`,
		d: `D${i}`,
		status: 'active',
	}))

	const getKey = (row: Row) => row.id

	// The grid is forced narrower than its 1100px of columns so it scrolls sideways.
	function setup() {
		const { container } = renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					resizable
					stickyHeader
					maxHeight="240px"
					columns={columns}
					columnSizing={sizing}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const scroller = container.querySelector<HTMLElement>('.overflow-auto')

		if (!scroller) throw new Error('scroll container not found')

		return { container, scroller }
	}

	const cell = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`td[data-grid-col="${id}"]`)

	it('holds a left-pinned column in place while the body scrolls right', async () => {
		const { container, scroller } = setup()

		await waitFor(() => expect(cell(container, 'name')).not.toBeNull())

		const pinned = cell(container, 'name') as HTMLElement

		const center = cell(container, 'b') as HTMLElement

		expect(getComputedStyle(pinned).position).toBe('sticky')

		const pinnedLeft = pinned.getBoundingClientRect().left

		const centerLeft = center.getBoundingClientRect().left

		scroller.scrollLeft = 300

		scroller.dispatchEvent(new Event('scroll'))

		// A scrolling column slides left with the content...
		await waitFor(() =>
			expect((cell(container, 'b') as HTMLElement).getBoundingClientRect().left).toBeLessThan(
				centerLeft - 100,
			),
		)

		// ...while the frozen column stays put at the left edge.
		expect((cell(container, 'name') as HTMLElement).getBoundingClientRect().left).toBeCloseTo(
			pinnedLeft,
			0,
		)
	})

	it('holds a right-pinned column at the right edge while the body scrolls', async () => {
		const { container, scroller } = setup()

		await waitFor(() => expect(cell(container, 'status')).not.toBeNull())

		const pinned = cell(container, 'status') as HTMLElement

		const center = cell(container, 'a') as HTMLElement

		expect(getComputedStyle(pinned).position).toBe('sticky')

		const pinnedRight = pinned.getBoundingClientRect().right

		const centerLeft = center.getBoundingClientRect().left

		scroller.scrollLeft = 300

		scroller.dispatchEvent(new Event('scroll'))

		await waitFor(() =>
			expect((cell(container, 'a') as HTMLElement).getBoundingClientRect().left).toBeLessThan(
				centerLeft - 100,
			),
		)

		// The right-pinned column keeps its right edge through the scroll.
		expect((cell(container, 'status') as HTMLElement).getBoundingClientRect().right).toBeCloseTo(
			pinnedRight,
			0,
		)
	})

	it('keeps the selection column frozen leftmost, ahead of a pinned column, while the body scrolls', async () => {
		// The selection column is defined *after* the left-pinned column, yet it must
		// still freeze ahead of it: perpetually leftmost, with the pinned column
		// stacked to its right.
		const selectColumns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
			{ id: 'select', selectable: true },
			{ id: 'a', title: 'A', cell: (row) => row.a },
			{ id: 'b', title: 'B', cell: (row) => row.b },
			{ id: 'c', title: 'C', cell: (row) => row.c },
			{ id: 'd', title: 'D', cell: (row) => row.d },
		]

		const { container } = renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					resizable
					stickyHeader
					maxHeight="240px"
					columns={selectColumns}
					columnSizing={{ value: { name: 160, a: 200, b: 200, c: 200, d: 200 } }}
					rows={rows}
					getKey={getKey}
					selection={{ value: new Set() }}
				/>
			</div>,
		)

		const scroller = container.querySelector<HTMLElement>('.overflow-auto')

		if (!scroller) throw new Error('scroll container not found')

		await waitFor(() => expect(screen.queryByLabelText('Select row 1')).not.toBeNull())

		// The selection cell carries no `data-grid-col`; reach it through its checkbox.
		const selectCell = () => screen.getByLabelText('Select row 1').closest('td') as HTMLElement

		expect(getComputedStyle(selectCell()).position).toBe('sticky')

		const selectLeft = selectCell().getBoundingClientRect().left

		const nameLeft = (cell(container, 'name') as HTMLElement).getBoundingClientRect().left

		// The checkboxes lead the frozen group; the pinned data column sits to their right.
		expect(nameLeft).toBeGreaterThan(selectLeft)

		const centerLeft = (cell(container, 'c') as HTMLElement).getBoundingClientRect().left

		scroller.scrollLeft = 300

		scroller.dispatchEvent(new Event('scroll'))

		// A scrolling column slides under the frozen group...
		await waitFor(() =>
			expect((cell(container, 'c') as HTMLElement).getBoundingClientRect().left).toBeLessThan(
				centerLeft - 100,
			),
		)

		// ...while the selection column and the column pinned to its right both hold.
		expect(selectCell().getBoundingClientRect().left).toBeCloseTo(selectLeft, 0)

		expect((cell(container, 'name') as HTMLElement).getBoundingClientRect().left).toBeCloseTo(
			nameLeft,
			0,
		)
	})
})
