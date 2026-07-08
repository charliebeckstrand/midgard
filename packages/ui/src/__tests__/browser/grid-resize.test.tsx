import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, waitFor } from '../helpers'

/**
 * Column resizing against a real layout engine: the handle's header height, the
 * always-visible grip, and its trailing-edge alignment only resolve in a browser
 * (jsdom paints no layout, so its `getBoundingClientRect` is empty and computed
 * `opacity`/colour never settle). Here the grid renders with real geometry, so the
 * header-anchored handle can be measured and a pointer drag begun on it.
 */
describe('grid column resizing (real browser)', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', minWidth: 80 },
		{ id: 'age', title: 'Age', cell: (row) => row.age, width: '120px' },
	]

	const rows: Row[] = Array.from({ length: 6 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		age: 20 + i,
	}))

	const getKey = (row: Row) => row.id

	// A fixed-width frame so auto-fit settles the data columns at a known size
	// instead of stretching them to the viewport.
	function setup(extra?: { onValueChange?: (sizing: Record<string, number>) => void }) {
		const { container } = renderUI(
			<div style={{ width: '400px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnSizing={extra?.onValueChange ? { onValueChange: extra.onValueChange } : undefined}
				/>
			</div>,
		)

		const separator = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Name"]',
		)

		if (!separator) throw new Error('resize handle not found')

		return { container, separator }
	}

	const nameHeader = (root: HTMLElement) =>
		root.querySelector<HTMLElement>('th[data-grid-col="name"]') as HTMLElement

	it('confines the resize handle to the header, not down the column', async () => {
		const { container, separator } = setup()

		const table = container.querySelector('table') as HTMLElement

		// The handle tracks the header cell's height — the affordance lives in the
		// header — within a hairline cell border.
		await waitFor(() => {
			const handleHeight = separator.getBoundingClientRect().height

			const headerHeight = nameHeader(container).getBoundingClientRect().height

			expect(Math.abs(handleHeight - headerHeight)).toBeLessThanOrEqual(2)
		})

		// And it stops well short of the full column: six rows make the table several
		// times the header's height, so the edge is not grabbable down every row.
		const tableHeight = table.getBoundingClientRect().height

		expect(separator.getBoundingClientRect().height).toBeLessThan(tableHeight / 2)
	})

	it('shows a short grip at rest, centred in the header trailing edge', async () => {
		const { container, separator } = setup()

		const grip = separator.querySelector<HTMLElement>('span[aria-hidden="true"]') as HTMLElement

		// Always visible — no hover needed; the edge reads as resizable at rest, the
		// whole point of the change versus the old hidden-until-hover grip.
		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))

		// A short bar (`h-4` ≈ 16px), not the full header height.
		const gripRect = grip.getBoundingClientRect()

		const headerRect = nameHeader(container).getBoundingClientRect()

		expect(gripRect.height).toBeCloseTo(16, 0)

		expect(gripRect.height).toBeLessThan(headerRect.height)

		// Centred in the grab zone (`justify-center`), so it sits a cell-padding inside
		// the trailing edge — not flush against the border.
		expect(headerRect.right - gripRect.right).toBeGreaterThan(3)
	})

	it('resizes the column from a drag that begins on the header handle', async () => {
		const onValueChange = vi.fn()

		const { container, separator } = setup({ onValueChange })

		const startWidth = nameHeader(container).getBoundingClientRect().width

		const rect = separator.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		fireEvent.mouseDown(separator, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 70, clientY: y })

		fireEvent.mouseUp(document, { clientX: startX + 70, clientY: y })

		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(startWidth + 40),
		)

		expect(onValueChange).toHaveBeenCalled()
	})

	it('accents the dragged column grip while a resize is in flight', async () => {
		const { container, separator } = setup()

		const wrapper = container.querySelector('[data-slot="grid"]') as HTMLElement

		const ageHandle = container.querySelector(
			'[role="separator"][aria-label="Resize Age"]',
		) as HTMLElement

		const nameGrip = separator.querySelector('span[aria-hidden="true"]') as HTMLElement

		const ageGrip = ageHandle.querySelector('span[aria-hidden="true"]') as HTMLElement

		const rect = separator.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		// Hold the drag open — mousedown plus a move, but no mouseup yet.
		fireEvent.mouseDown(separator, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 40, clientY: y })

		await waitFor(() => expect(wrapper.hasAttribute('data-resizing')).toBe(true))

		// Both grips stay visible (always-on); the dragged column's reads accent (its
		// own `data-resizing`) while the idle column keeps its muted rest colour.
		expect(getComputedStyle(nameGrip).opacity).toBe('1')

		expect(getComputedStyle(ageGrip).opacity).toBe('1')

		expect(getComputedStyle(nameGrip).backgroundColor).not.toBe(
			getComputedStyle(ageGrip).backgroundColor,
		)

		fireEvent.mouseUp(document, { clientX: startX + 40, clientY: y })

		await waitFor(() => expect(wrapper.hasAttribute('data-resizing')).toBe(false))
	})
})

/**
 * Resize and reorder together. A reordering grid shifts every header on a
 * `translateX` CSS variable, so each header is a transformed stacking context —
 * and the containing block for its absolutely-positioned resize handle. The
 * handle must still anchor to its header and stay the topmost element at the
 * trailing edge so a drag-resize can begin on it. Real geometry, so the browser.
 */
describe('grid resize handle with reorder active (real browser)', () => {
	type Row = { id: number; name: string; age: number }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', minWidth: 80 },
		{ id: 'age', title: 'Age', cell: (row) => row.age, width: '120px' },
	]

	const rows: Row[] = Array.from({ length: 6 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		age: 20 + i,
	}))

	function setup() {
		const { container } = renderUI(
			<div style={{ width: '400px' }}>
				<Grid reorder resizable columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const separator = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Name"]',
		)

		if (!separator) throw new Error('resize handle not found')

		return { container, separator }
	}

	const nameHeader = (root: HTMLElement) =>
		root.querySelector<HTMLElement>('th[data-grid-col="name"]') as HTMLElement

	it('keeps the resize handle topmost on the header trailing edge', async () => {
		const { separator } = setup()

		const rect = separator.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		// The handle (or its grip child) is the element under the pointer at the
		// header's trailing edge, so a drag-resize begins on it even though the reorder
		// shift transform makes the header its own stacking context.
		expect(separator.contains(document.elementFromPoint(x, y))).toBe(true)
	})

	it('resizes from the header handle with reorder active', async () => {
		const { container, separator } = setup()

		const startWidth = nameHeader(container).getBoundingClientRect().width

		const rect = separator.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		fireEvent.mouseDown(separator, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 60, clientY: y })

		fireEvent.mouseUp(document, { clientX: startX + 60, clientY: y })

		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(startWidth + 30),
		)
	})
})

/**
 * A resize is confined to the dragged column. The auto-sizer fills the frame with
 * width-less columns on mount, but once the user takes width control the layout
 * holds: resizing one column must not reflow the others (the space it frees or
 * takes is the table's, not its neighbours'). Real geometry, so the browser.
 */
describe('grid column resize holds the other columns (real browser)', () => {
	type Row = { id: number; a: string; b: string; c: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (row) => row.a },
		{ id: 'b', title: 'B', cell: (row) => row.b },
		{ id: 'c', title: 'C', cell: (row) => row.c },
	]

	const makeRows = (count: number): Row[] =>
		Array.from({ length: count }, (_, i) => ({ id: i + 1, a: 'a', b: 'b', c: 'c' }))

	const header = (root: HTMLElement, id: string) =>
		root.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`) as HTMLElement

	function setup() {
		const view = (
			<div style={{ width: '600px' }}>
				<Grid resizable columns={columns} rows={makeRows(4)} getKey={(row) => row.id} />
			</div>
		)

		const { container, rerender } = renderUI(view)

		const handle = container.querySelector<HTMLElement>('[role="separator"][aria-label="Resize A"]')

		if (!handle) throw new Error('resize handle not found')

		return { container, handle, rerender }
	}

	it('widens only the dragged column, leaving its neighbours where they are', async () => {
		const { container, handle, rerender } = setup()

		// The three width-less columns fill the 600px frame before any manual resize.
		await waitFor(() =>
			expect(header(container, 'a').getBoundingClientRect().width).toBeGreaterThan(150),
		)

		const startA = header(container, 'a').getBoundingClientRect().width

		const startB = header(container, 'b').getBoundingClientRect().width

		const startC = header(container, 'c').getBoundingClientRect().width

		const rect = handle.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const y = rect.top + rect.height / 2

		fireEvent.mouseDown(handle, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 80, clientY: y })

		fireEvent.mouseUp(document, { clientX: startX + 80, clientY: y })

		// The dragged column widened…
		await waitFor(() =>
			expect(header(container, 'a').getBoundingClientRect().width).toBeGreaterThan(startA + 40),
		)

		// …and the others held — no redistribution into the space the drag consumed.
		expect(
			Math.abs(header(container, 'b').getBoundingClientRect().width - startB),
		).toBeLessThanOrEqual(1)

		expect(
			Math.abs(header(container, 'c').getBoundingClientRect().width - startC),
		).toBeLessThanOrEqual(1)

		// The hold survives a later auto-fit trigger: a rows change re-runs the
		// autosizer, which must not re-fit a grid the user has taken control of.
		rerender(
			<div style={{ width: '600px' }}>
				<Grid resizable columns={columns} rows={makeRows(8)} getKey={(row) => row.id} />
			</div>,
		)

		await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(4))

		expect(
			Math.abs(header(container, 'b').getBoundingClientRect().width - startB),
		).toBeLessThanOrEqual(1)

		expect(
			Math.abs(header(container, 'c').getBoundingClientRect().width - startC),
		).toBeLessThanOrEqual(1)
	})
})
