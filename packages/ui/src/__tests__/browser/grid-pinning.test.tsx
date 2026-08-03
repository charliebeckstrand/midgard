import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, waitFor } from '../helpers'

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
					header={{ position: 'sticky' }}
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
})

/**
 * A stack of frozen columns must sit flush — every one against the next, with no
 * gap for the scrolling columns to show through. The offsets sum the frozen
 * columns' widths, and only a resizable grid's fixed-layout `<colgroup>` makes
 * the engine's column sizes those widths; a non-resizable grid lays out `auto`
 * and sizes each column to its content, so its offsets are measured from the
 * rendered header. Only a real layout engine can tell the two apart.
 */
describe('stacked frozen columns under auto layout (real browser)', () => {
	type Row = { id: number; name: string; code: string; a: string; b: string; c: string; d: string }

	const rows: Row[] = Array.from({ length: 4 }, (_, i) => ({
		id: i + 1,
		name: `A much wider name ${i + 1}`,
		code: `C-${i + 1}`,
		a: `A${i}`,
		b: `B${i}`,
		c: `C${i}`,
		d: `D${i}`,
	}))

	// Two frozen columns per edge, one pinned and one locked, behind the selection
	// column the left edge always leads with — so the group spans every kind of
	// freeze the engine stacks.
	const columns: GridColumn<Row>[] = [
		{ id: 'select', selectable: true },
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'code', title: 'Code', cell: (row) => row.code, locked: 'left' },
		{ id: 'a', title: 'A', cell: (row) => row.a },
		{ id: 'b', title: 'B', cell: (row) => row.b },
		{ id: 'c', title: 'C', cell: (row) => row.c, pinned: 'right' },
		{ id: 'd', title: 'D', cell: (row) => row.d, locked: 'right' },
	]

	const getKey = (row: Row) => row.id

	const cell = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`td[data-grid-col="${id}"]`)

	// The grid is forced narrower than its columns so it scrolls sideways.
	async function setup(resizable: boolean) {
		const { container } = renderUI(
			<div style={{ width: '420px' }}>
				<Grid
					resizable={resizable}
					maxHeight="240px"
					columns={columns}
					rows={rows}
					getKey={getKey}
					selection={{ defaultValue: new Set<number>() }}
				/>
			</div>,
		)

		await waitFor(() => expect(cell(container, 'name')).not.toBeNull())

		return container
	}

	// Each frozen column's left edge lands on its neighbour's right edge.
	async function expectFlush(container: HTMLElement) {
		const edges = (id: string) => (cell(container, id) as HTMLElement).getBoundingClientRect()

		// The selection column leads the left edge; it carries no `data-grid-col`.
		const select = (container.querySelector('tbody td') as HTMLElement).getBoundingClientRect()

		await waitFor(() => expect(edges('name').left).toBeCloseTo(select.right, 0))

		expect(edges('code').left).toBeCloseTo(edges('name').right, 0)

		expect(edges('d').left).toBeCloseTo(edges('c').right, 0)
	}

	it('stacks the frozen columns flush in a non-resizable grid', async () => {
		await expectFlush(await setup(false))
	})

	it('stacks the frozen columns flush in a resizable grid', async () => {
		await expectFlush(await setup(true))
	})

	it('holds the stack flush once the body scrolls', async () => {
		const container = await setup(false)

		await expectFlush(container)

		const scroller = container.querySelector<HTMLElement>('[data-slot="table"]')

		if (!scroller) throw new Error('scroll container not found')

		scroller.scrollLeft = 150

		scroller.dispatchEvent(new Event('scroll'))

		await expectFlush(container)
	})
})

/**
 * The frozen group's chrome tracks the live layout, not the layout its cells last
 * rendered under. Rows, cells, and headers all hold on `memo`, so a change none
 * of their own props carries — a column joining the group, a width moving under a
 * drag — reaches them only through the pinning controls' identity. Both cases
 * need a real engine: the boundary rule is a painted `::after`, and the sticky
 * offsets take effect only once the body scrolls.
 */
describe('frozen chrome tracks live pin and size changes (real browser)', () => {
	type Row = { id: number; name: string; email: string; a: string; b: string; c: string }

	const rows: Row[] = Array.from({ length: 4 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		email: `person${i + 1}@example.com`,
		a: `A${i}`,
		b: `B${i}`,
		c: `C${i}`,
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'email', title: 'Email', cell: (row) => row.email },
		{ id: 'a', title: 'A', cell: (row) => row.a },
		{ id: 'b', title: 'B', cell: (row) => row.b },
		{ id: 'c', title: 'C', cell: (row) => row.c },
	]

	const getKey = (row: Row) => row.id

	const cell = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`td[data-grid-col="${id}"]`) as HTMLElement

	const head = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`) as HTMLElement

	// The boundary rule is drawn as an `::after` overlay, so "carries the rule"
	// reads off the painted pseudo-element rather than the class list.
	const hasBoundaryRule = (element: HTMLElement) =>
		getComputedStyle(element, '::after').content !== 'none'

	// Seeded widths overflow the 420px frame, so the grid scrolls sideways and the
	// frozen columns actually stick; `defaultValue` leaves a drag free to move them.
	const sizing = { defaultValue: { name: 160, email: 220, a: 200, b: 200, c: 200 } }

	function setup(pinning: Record<string, 'left' | 'right' | 'none'>) {
		const view = (value: Record<string, 'left' | 'right' | 'none'>) => (
			<div style={{ width: '420px' }}>
				<Grid
					resizable
					header={{ position: 'sticky' }}
					maxHeight="240px"
					columns={columns}
					columnSizing={sizing}
					pinning={{ value, onValueChange: () => {} }}
					rows={rows}
					getKey={getKey}
				/>
			</div>
		)

		const { container, rerender } = renderUI(view(pinning))

		return {
			container,
			repin: (next: Record<string, 'left' | 'right' | 'none'>) => rerender(view(next)),
		}
	}

	it('moves the boundary rule onto a column that joins the frozen group', async () => {
		const { container, repin } = setup({})

		await waitFor(() => expect(cell(container, 'name')).not.toBeNull())

		// One frozen column: it is the group's scroll-facing boundary and carries the rule.
		await waitFor(() => expect(hasBoundaryRule(cell(container, 'name'))).toBe(true))

		repin({ email: 'left' })

		// Email joins the group behind Name, so the boundary — and the single rule —
		// moves to it. Name keeps only the sticky surface.
		await waitFor(() => expect(hasBoundaryRule(cell(container, 'email'))).toBe(true))

		expect(hasBoundaryRule(cell(container, 'name'))).toBe(false)

		expect(hasBoundaryRule(head(container, 'email'))).toBe(true)

		expect(hasBoundaryRule(head(container, 'name'))).toBe(false)
	})

	it('holds the stack flush through a drag-resize, not only once it settles', async () => {
		const { container } = setup({ email: 'left' })

		await waitFor(() => expect(cell(container, 'email')).not.toBeNull())

		const scroller = container.querySelector<HTMLElement>('.overflow-auto')

		if (!scroller) throw new Error('scroll container not found')

		// Scroll the body so the frozen columns leave the flow and hold at their
		// sticky offsets — the only state in which a stale offset shows.
		scroller.scrollLeft = 240

		scroller.dispatchEvent(new Event('scroll'))

		expect(scroller.scrollLeft).toBeGreaterThan(0)

		await waitFor(() =>
			expect(cell(container, 'email').getBoundingClientRect().left).toBeCloseTo(
				cell(container, 'name').getBoundingClientRect().right,
				0,
			),
		)

		const handle = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Name"]',
		)

		if (!handle) throw new Error('resize handle not found')

		const rect = handle.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		// Hold the drag open: mousedown and a move, with no mouseup to settle it.
		fireEvent.mouseDown(handle, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 90, clientY: y })

		await waitFor(() =>
			expect(cell(container, 'name').getBoundingClientRect().width).toBeGreaterThan(200),
		)

		// Mid-drag, the column behind the widened one has moved with it.
		expect(cell(container, 'email').getBoundingClientRect().left).toBeCloseTo(
			cell(container, 'name').getBoundingClientRect().right,
			0,
		)

		expect(head(container, 'email').getBoundingClientRect().left).toBeCloseTo(
			head(container, 'name').getBoundingClientRect().right,
			0,
		)

		fireEvent.mouseUp(document, { clientX: startX + 90, clientY: y })
	})
})
