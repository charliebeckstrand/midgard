import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Grid, type GridColumn } from '../../modules/grid'
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
