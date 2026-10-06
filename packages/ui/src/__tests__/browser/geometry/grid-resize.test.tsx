import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, present, renderUI, waitFor } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'
import { HALF_PIXEL, PIXEL } from '../../helpers/geometry/tolerance'
import { settledRect } from '../helpers/sample'

// The handle and the header cell can differ by a hairline cell border, up to this much.
const HANDLE_HEIGHT_SLACK = 2

// The auto-fit around a seeded width can move it by less than this.
const SEEDED_WIDTH_SLACK = 5

/** Opens the header menu's Auto-size parent, which holds both fits. */
const openAutoSizeMenu = () => {
	const parent = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
		(el) => el.textContent?.trim() === 'Auto-size',
	)

	if (!parent) throw new Error('no Auto-size menu')

	fireEvent.click(parent)
}

/**
 * Column resizing against a real layout engine: the handle's header height, the
 * always-visible grip, and its trailing-edge alignment only resolve in a browser
 * (jsdom paints no layout, so its `getBoundingClientRect` is empty and computed
 * `opacity`/color never settle). Here the grid renders with real geometry, so the
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
		present(root.querySelector('th[data-grid-col="name"]'), 'th[data-grid-col="name"]')

	it('confines the resize handle to the header, not down the column', async () => {
		const { container, separator } = setup()

		const table = present(container.querySelector('table'), 'table')

		// The handle tracks the header cell's height — the affordance lives in the
		// header — within a hairline cell border.
		await waitFor(() => {
			const handleHeight = separator.getBoundingClientRect().height

			const headerHeight = nameHeader(container).getBoundingClientRect().height

			expect(handleHeight).toBeNear(headerHeight, HANDLE_HEIGHT_SLACK)
		})

		// And it stops well short of the full column: six rows make the table several
		// times the header's height, so the edge is not grabbable down every row.
		const tableHeight = table.getBoundingClientRect().height

		expect(separator.getBoundingClientRect().height).toBeLessThan(tableHeight / 2)
	})

	it('shows a short grip at rest, centered in the header trailing edge', async () => {
		const { container, separator } = setup()

		const grip = present(
			separator.querySelector('span[aria-hidden="true"]'),
			'span[aria-hidden="true"]',
		)

		// Always visible — no hover needed; the edge reads as resizable at rest, the
		// whole point of the change versus the old hidden-until-hover grip.
		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))

		// A short bar (`h-4` ≈ 16px), not the full header height.
		const gripRect = grip.getBoundingClientRect()

		const headerRect = nameHeader(container).getBoundingClientRect()

		expect(gripRect.height).toBeNear(16, HALF_PIXEL)

		expect(gripRect.height).toBeLessThan(headerRect.height)

		// Centered in the grab zone (`justify-center`), so it sits a cell-padding inside
		// the trailing edge — not flush against the border.
		expect(headerRect.right - gripRect.right).toBeGreaterThan(3)
	})

	it('resizes the column from a drag that begins on the header handle', async () => {
		const onValueChange = vi.fn()

		const { container, separator } = setup({ onValueChange })

		const startWidth = nameHeader(container).getBoundingClientRect().width

		const { x: startX, y } = centerOf(separator)

		fireEvent.mouseDown(separator, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 70, clientY: y })

		fireEvent.mouseUp(document, { clientX: startX + 70, clientY: y })

		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(startWidth + 40),
		)

		expect(onValueChange).toHaveBeenCalled()
	})

	it('does not fire onValueChange for the content auto-fit (no user resize)', async () => {
		const onValueChange = vi.fn()

		const { container } = setup({ onValueChange })

		// Let the initial fit settle (and any ResizeObserver ticks flush).
		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(0),
		)

		await settledRect(nameHeader(container))

		// The autosizer sized the columns, but that fit is not a user preference.
		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('"Auto-size all columns" emits the fitted widths (a deliberate choice persists)', async () => {
		const onValueChange = vi.fn()

		const { container } = setup({ onValueChange })

		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(0),
		)

		expect(onValueChange).not.toHaveBeenCalled()

		fireEvent.contextMenu(nameHeader(container))

		openAutoSizeMenu()

		const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
			el.textContent?.includes('Auto-size all columns'),
		)

		if (!item) throw new Error('no Auto-size all columns item')

		fireEvent.click(item)

		// The user-invoked fit flows to the consumer, unlike the automatic one.
		await waitFor(() => expect(onValueChange).toHaveBeenCalled())
	})

	it('holds a seeded (restored) width instead of re-fitting it', async () => {
		const { container } = renderUI(
			<div style={{ width: '400px' }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={getKey}
					columnSizing={{ defaultValue: { name: 320 } }}
				/>
			</div>,
		)

		// The seeded width is held as a manual width, so the auto-fit fills the
		// remaining columns around it rather than measuring the Name column back
		// down to its content.
		await waitFor(() =>
			expect(
				container.querySelector<HTMLElement>('th[data-grid-col="name"]')?.getBoundingClientRect()
					.width,
			).toBeNear(320, SEEDED_WIDTH_SLACK),
		)
	})

	it('accents the dragged column grip while a resize is in flight', async () => {
		const { container, separator } = setup()

		const wrapper = present(container.querySelector('[data-slot="grid"]'), '[data-slot="grid"]')

		const ageHandle = present(
			container.querySelector('[role="separator"][aria-label="Resize Age"]'),
			'[role="separator"][aria-label="Resize Age"]',
		)

		const nameGrip = present(
			separator.querySelector('span[aria-hidden="true"]'),
			'span[aria-hidden="true"]',
		)

		const ageGrip = present(
			ageHandle.querySelector('span[aria-hidden="true"]'),
			'span[aria-hidden="true"]',
		)

		const { x: startX, y } = centerOf(separator)

		// Hold the drag open — mousedown plus a move, but no mouseup yet.
		fireEvent.mouseDown(separator, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 40, clientY: y })

		await waitFor(() => expect(wrapper.hasAttribute('data-resizing')).toBe(true))

		// Both grips stay visible (always-on); the dragged column's reads accent (its
		// own `data-resizing`) while the idle column keeps its muted rest color.
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
		present(root.querySelector('th[data-grid-col="name"]'), 'th[data-grid-col="name"]')

	it('keeps the resize handle topmost on the header trailing edge', async () => {
		const { separator } = setup()

		const { x, y } = centerOf(separator)

		// The handle (or its grip child) is the element under the pointer at the
		// header's trailing edge, so a drag-resize begins on it even though the reorder
		// shift transform makes the header its own stacking context.
		expect(separator.contains(document.elementFromPoint(x, y))).toBe(true)
	})

	it('resizes from the header handle with reorder active', async () => {
		const { container, separator } = setup()

		const startWidth = nameHeader(container).getBoundingClientRect().width

		const { x: startX, y } = centerOf(separator)

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
 * takes is the table's, not its neighbors'). Real geometry, so the browser.
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
		present(root.querySelector(`th[data-grid-col="${id}"]`), `th[data-grid-col="${id}"]`)

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

	it('widens only the dragged column, leaving its neighbors where they are', async () => {
		const { container, handle, rerender } = setup()

		// The three width-less columns fill the 600px frame before any manual resize.
		await waitFor(() =>
			expect(header(container, 'a').getBoundingClientRect().width).toBeGreaterThan(150),
		)

		const startA = header(container, 'a').getBoundingClientRect().width

		const startB = header(container, 'b').getBoundingClientRect().width

		const startC = header(container, 'c').getBoundingClientRect().width

		const { x: startX, y } = centerOf(handle)

		fireEvent.mouseDown(handle, { clientX: startX, clientY: y })

		fireEvent.mouseMove(document, { clientX: startX + 80, clientY: y })

		fireEvent.mouseUp(document, { clientX: startX + 80, clientY: y })

		// The dragged column widened…
		await waitFor(() =>
			expect(header(container, 'a').getBoundingClientRect().width).toBeGreaterThan(startA + 40),
		)

		// …and the others held — no redistribution into the space the drag consumed.
		expect(header(container, 'b').getBoundingClientRect().width).toBeNear(startB, PIXEL)

		expect(header(container, 'c').getBoundingClientRect().width).toBeNear(startC, PIXEL)

		// The hold survives a later auto-fit trigger: a rows change re-runs the
		// autosizer, which must not re-fit a grid the user has taken control of.
		rerender(
			<div style={{ width: '600px' }}>
				<Grid resizable columns={columns} rows={makeRows(8)} getKey={(row) => row.id} />
			</div>,
		)

		await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(4))

		expect(header(container, 'b').getBoundingClientRect().width).toBeNear(startB, PIXEL)

		expect(header(container, 'c').getBoundingClientRect().width).toBeNear(startC, PIXEL)
	})
})
