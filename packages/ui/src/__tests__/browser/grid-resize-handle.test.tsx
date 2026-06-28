import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Grid, type GridColumn } from '../../modules/grid'
import type { GridEditableColumn } from '../../modules/grid/grid-editable-types'
import { renderUI, waitFor } from '../helpers'

/**
 * Resize-handle geometry against a real layout engine. The handle is anchored
 * inside its column's trailing edge — it must not overhang the boundary, or the
 * next sticky header's opaque cell clips the grip to a sliver (the grip then
 * reads narrower across the header than down the body), and on the trailing
 * column the overhang pushes past the table to inflate the horizontal scroll
 * (nudging a right-pinned column at the scroll end). Both only resolve in a
 * browser, where the table has real geometry.
 */
describe('grid resize handle geometry (real browser)', () => {
	type Employee = { id: number; name: string; role: string; status: 'active' | 'inactive' }

	const employees: Employee[] = Array.from({ length: 6 }, (_, i) => ({
		id: i + 1,
		name: `Wade Cooper ${i}`,
		role: 'Developer',
		status: i % 2 === 0 ? 'active' : 'inactive',
	}))

	const columns: GridColumn<Employee>[] = [
		{ id: 'name', title: 'Name', cell: (r) => r.name, width: '220px', pinned: 'left' },
		{ id: 'role', title: 'Role', cell: (r) => r.role, width: '220px' },
		{
			id: 'status',
			title: 'Status',
			cell: (r) => <Badge color={r.status === 'active' ? 'green' : 'zinc'}>{r.status}</Badge>,
			width: '220px',
			pinned: 'right',
		},
	]

	function setup() {
		const { container } = renderUI(
			<div style={{ width: '420px' }}>
				<Grid
					resizable
					stickyHeader
					maxHeight="200px"
					columns={columns}
					rows={employees}
					getKey={(r) => r.id}
				/>
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		return { container, table }
	}

	it('keeps the grip within its own column (clear of the next sticky header)', async () => {
		const { container, table } = setup()

		await waitFor(() => expect(table.style.width).not.toBe(''))

		const roleHeader = container.querySelector<HTMLElement>(
			'th[data-grid-col="role"]',
		) as HTMLElement

		const grip = container
			.querySelector<HTMLElement>('[role="separator"][aria-label="Resize Role"]')
			?.querySelector('span[aria-hidden="true"]') as HTMLElement

		// The grip's trailing edge stops at the column boundary — it does not spill
		// past it into the neighbour, whose opaque sticky header would clip it.
		expect(grip.getBoundingClientRect().right).toBeLessThanOrEqual(
			roleHeader.getBoundingClientRect().right + 0.5,
		)
	})

	it('runs the resize handle to the table bottom, not past it', async () => {
		// A bordered grid with no height cap should not scroll. The handle is
		// anchored at its header cell's top — one top-border inside the table — and
		// spans to the table's bottom; driving its height from the table's full
		// height ran it that border past the bottom, and the scroll container's
		// `overflow-x-auto` (which makes the y-axis scrollable too) then showed a
		// spurious vertical scrollbar on an un-scrolled grid.
		const { container } = renderUI(
			<div style={{ width: '900px' }}>
				<Grid resizable outline columns={columns} rows={employees} getKey={(r) => r.id} />
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() => expect(table.style.width).not.toBe(''))

		const scroll = container.querySelector<HTMLElement>('[data-slot="table"]') as HTMLElement

		// No phantom vertical scroll: the handle ends on the table bottom.
		expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight)
	})

	it('does not overhang the table edge, so a right-pinned column holds at the scroll end', async () => {
		const { container, table } = setup()

		await waitFor(() => expect(table.style.width).not.toBe(''))

		// The scroll container that the wide table overflows.
		let scroll = table.parentElement as HTMLElement

		while (scroll && scroll !== container && scroll.scrollWidth <= scroll.clientWidth + 1) {
			scroll = scroll.parentElement as HTMLElement
		}

		// No phantom width past the table: the trailing handle sits at the table's
		// edge, so the scrollable extent is the table width (not table + overhang).
		expect(scroll.scrollWidth).toBeLessThanOrEqual(Math.ceil(table.getBoundingClientRect().width))

		const statusHandle = container.querySelector<HTMLElement>(
			'[role="separator"][aria-label="Resize Status"]',
		) as HTMLElement

		expect(statusHandle.getBoundingClientRect().right).toBeLessThanOrEqual(
			table.getBoundingClientRect().right + 0.5,
		)

		// And the right-pinned header does not shift when scrolled to the end.
		const statusHeader = container.querySelector<HTMLElement>(
			'th[data-grid-col="status"]',
		) as HTMLElement

		const before = statusHeader.getBoundingClientRect().left

		scroll.scrollLeft = scroll.scrollWidth

		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))

		expect(statusHeader.getBoundingClientRect().left).toBeCloseTo(before, 0)
	})
})

/**
 * Grip alignment follows where the cell content ends. A truncating grid clips its
 * values one cell-padding inside the trailing edge, so the grip centres in the
 * handle to meet that point; a non-truncating grid (the editable surface, whose
 * cells host edge-to-edge editors) has no truncation point, so the grip flushes to
 * the column border instead. The two only diverge in a real browser, where the
 * handle has measured geometry.
 */
describe('grid resize grip alignment by truncation (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const rows: Row[] = [
		{ id: 1, name: 'Alice', role: 'Developer' },
		{ id: 2, name: 'Bob', role: 'Manager' },
	]

	const readOnlyColumns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (r) => r.name, width: '200px' },
		{ id: 'role', title: 'Role', cell: (r) => r.role },
	]

	const editableColumns: GridEditableColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', width: '200px' },
		{ id: 'role', title: 'Role', field: 'role' },
	]

	// Distance from the 'name' column's trailing border to its grip's right edge:
	// ~one cell-padding when centred, a hairline when flush to the border.
	function gripInset(container: HTMLElement): number {
		const header = container.querySelector<HTMLElement>('th[data-grid-col="name"]') as HTMLElement

		const grip = container
			.querySelector<HTMLElement>('[role="separator"][aria-label="Resize Name"]')
			?.querySelector('span[aria-hidden="true"]') as HTMLElement

		return header.getBoundingClientRect().right - grip.getBoundingClientRect().right
	}

	it('centres the grip at the truncation point in a truncating grid', async () => {
		const { container } = renderUI(
			<div style={{ width: '900px' }}>
				<Grid resizable outline columns={readOnlyColumns} rows={rows} getKey={(r) => r.id} />
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() => expect(table.style.width).not.toBe(''))

		// Centred in the handle, so it sits a cell-padding inside the border (where
		// the value clips), well clear of the boundary.
		expect(gripInset(container)).toBeGreaterThan(3)
	})

	it('flushes the grip to the border in a non-truncating (editable) grid', async () => {
		const { container } = renderUI(
			<div style={{ width: '900px' }}>
				<Grid
					editable
					outline
					columns={editableColumns}
					rows={rows}
					getKey={(r) => r.id}
					onValueChange={() => {}}
				/>
			</div>,
		)

		const table = container.querySelector('table') as HTMLElement

		await waitFor(() => expect(table.style.width).not.toBe(''))

		// The editable cells fill to the edge, so the grip lands on the column border
		// — within a hairline of it, not a cell-padding inside.
		expect(gripInset(container)).toBeLessThanOrEqual(2)
	})
})
