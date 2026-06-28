import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, waitFor } from '../helpers'

/**
 * Column resizing against a real layout engine: the handle's full-column height
 * and the hover-revealed grip only resolve in a browser (jsdom paints no layout,
 * so its `offsetHeight` is 0 and computed `opacity` never settles). Here the grid
 * renders with real geometry, so the trailing-edge handle can be measured against
 * the table and a pointer drag can begin down in the body region of that edge.
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

	it('extends the handle down the full column height, not just the header', async () => {
		const { container, separator } = setup()

		const table = container.querySelector('table') as HTMLElement

		// The handle starts at the header height and grows to the table height once
		// the measured `--grid-resize-height` lands.
		await waitFor(() => {
			const handleHeight = separator.getBoundingClientRect().height

			const tableHeight = table.getBoundingClientRect().height

			expect(handleHeight).toBeCloseTo(tableHeight, 0)
		})

		// And it is decisively taller than the header cell alone — so the right edge
		// is grabbable down every row, not only across the header.
		const headerHeight = nameHeader(container).getBoundingClientRect().height

		expect(separator.getBoundingClientRect().height).toBeGreaterThan(headerHeight * 2)
	})

	it('keeps the grip hidden until the edge or header is hovered', async () => {
		const { container, separator } = setup()

		const grip = separator.querySelector<HTMLElement>('span[aria-hidden="true"]') as HTMLElement

		// Resting: the grip is hidden, so the edge stays clean until pointed at —
		// the whole point of the change, versus a permanently-visible handle.
		expect(getComputedStyle(grip).opacity).toBe('0')

		// The grip reveals on the CSS `:hover` of the edge strip (and the header
		// cell), so the pointer must really move — `vitest/browser`'s userEvent
		// drives the Playwright mouse, unlike the synthetic
		// `@testing-library/user-event` hover, which never sets `:hover`.
		await userEvent.hover(separator)

		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))

		// Hovering anywhere on the header cell reveals it too, for discoverability.
		await userEvent.unhover(separator)

		await userEvent.hover(nameHeader(container))

		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))
	})

	it('resizes the column when the drag begins in the body region of the edge', async () => {
		const onValueChange = vi.fn()

		const { container, separator } = setup({ onValueChange })

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() =>
			expect(separator.getBoundingClientRect().height).toBeCloseTo(
				table.getBoundingClientRect().height,
				0,
			),
		)

		const startWidth = nameHeader(container).getBoundingClientRect().width

		const rect = separator.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		// Begin the drag near the bottom of the handle — down in the rows, not the
		// header — to prove the whole right side initiates a resize.
		const bodyY = rect.bottom - 16

		fireEvent.mouseDown(separator, { clientX: startX, clientY: bodyY })

		fireEvent.mouseMove(document, { clientX: startX + 70, clientY: bodyY })

		fireEvent.mouseUp(document, { clientX: startX + 70, clientY: bodyY })

		await waitFor(() =>
			expect(nameHeader(container).getBoundingClientRect().width).toBeGreaterThan(startWidth + 40),
		)

		expect(onValueChange).toHaveBeenCalled()
	})

	it('stands the other columns down while a drag-resize is in flight', async () => {
		const { container, separator } = setup()

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() =>
			expect(separator.getBoundingClientRect().height).toBeCloseTo(
				table.getBoundingClientRect().height,
				0,
			),
		)

		const wrapper = container.querySelector('[data-slot="grid"]') as HTMLElement

		const ageHeader = container.querySelector('th[data-grid-col="age"]') as HTMLElement

		const ageHandle = container.querySelector(
			'[role="separator"][aria-label="Resize Age"]',
		) as HTMLElement

		const nameGrip = separator.querySelector('span[aria-hidden="true"]') as HTMLElement

		const ageGrip = ageHandle.querySelector('span[aria-hidden="true"]') as HTMLElement

		const rect = separator.getBoundingClientRect()

		const startX = rect.left + rect.width / 2

		const bodyY = rect.bottom - 16

		// Hold the drag open — mousedown plus a move, but no mouseup yet.
		fireEvent.mouseDown(separator, { clientX: startX, clientY: bodyY })

		fireEvent.mouseMove(document, { clientX: startX + 40, clientY: bodyY })

		// The grid flags the in-flight resize and every resizable header drops its
		// pointer events, so a pointer sweeping the full-height strips can't light
		// another column's grip…
		await waitFor(() => expect(wrapper.hasAttribute('data-resizing')).toBe(true))

		expect(getComputedStyle(ageHeader).pointerEvents).toBe('none')

		// …only the dragged column's grip stays visible (via its own data-resizing;
		// waitFor lets its reveal transition settle).
		await waitFor(() => expect(getComputedStyle(nameGrip).opacity).toBe('1'))

		expect(getComputedStyle(ageGrip).opacity).toBe('0')

		// Releasing the drag clears the flag and restores header interaction.
		fireEvent.mouseUp(document, { clientX: startX + 40, clientY: bodyY })

		await waitFor(() => expect(wrapper.hasAttribute('data-resizing')).toBe(false))

		expect(getComputedStyle(ageHeader).pointerEvents).not.toBe('none')
	})
})

/**
 * Resize and reorder together. A reordering grid shifts every header and body
 * cell on a `translateX` CSS variable, so each cell becomes a stacking context.
 * The resize handle is absolutely positioned inside its header and overflows the
 * full column height; the header's own shift transform would trap its `z-10`
 * inside the header's (z-auto) stacking context, leaving the later-painted body
 * cells over the handle's body-region overflow — so a pointer down in the rows
 * hit the cell, not the handle, and only the header stretch resized. The header
 * must clear the reordering body cells so the handle stays grabbable down the
 * whole column, matching a resizable-only grid. Real geometry, so the browser.
 */
describe('grid resize handle stays grabbable over the body with reorder active (real browser)', () => {
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

	it('keeps the resize handle topmost down in the rows, not just the header', async () => {
		const { container, separator } = setup()

		const table = container.querySelector('table') as HTMLElement

		// Wait for the handle to grow from the header height to the full column.
		await waitFor(() =>
			expect(separator.getBoundingClientRect().height).toBeCloseTo(
				table.getBoundingClientRect().height,
				0,
			),
		)

		const rect = separator.getBoundingClientRect()

		const x = rect.left + rect.width / 2

		// A point a row deep — below the header, where a reordering body cell sits.
		const bodyY = nameHeader(container).getBoundingClientRect().bottom + 8

		// The handle (or its grip child) must be the element the pointer lands on,
		// so a drag-resize can begin down the rows; a reordering body cell here means
		// the handle's overflow is painted under the shifted cells.
		expect(separator.contains(document.elementFromPoint(x, bodyY))).toBe(true)
	})

	it('reveals the grip when the body stretch of the edge is hovered', async () => {
		const { container, separator } = setup()

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() =>
			expect(separator.getBoundingClientRect().height).toBeCloseTo(
				table.getBoundingClientRect().height,
				0,
			),
		)

		const grip = separator.querySelector<HTMLElement>('span[aria-hidden="true"]') as HTMLElement

		expect(getComputedStyle(grip).opacity).toBe('0')

		// `userEvent.hover` drives the real pointer to the handle's centre, which —
		// the handle spanning the whole column — lands down in the rows. The grip
		// only reveals if that body-region point reaches the handle.
		await userEvent.hover(separator)

		await waitFor(() => expect(getComputedStyle(grip).opacity).toBe('1'))
	})
})
