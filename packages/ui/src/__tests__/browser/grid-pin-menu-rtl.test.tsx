import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, present, renderUI, stickyInset, waitFor } from '../helpers'

/**
 * The header menu of a right-to-left grid names the physical edge of each pin
 * target. "Pin right" pins the column to the inline start, which is the right
 * edge, and its arrow points right.
 */
describe('grid pin menu in a right-to-left grid (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Admin' }]

	/** Opens the header menu of `id` and returns its Pin submenu items by label. */
	function openPinItems(container: HTMLElement, id: string) {
		fireEvent.contextMenu(
			present(
				container.querySelector<HTMLElement>(`th[data-grid-col="${id}"]`),
				`the ${id} header`,
			),
		)

		const pin = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
			(item) => item.textContent?.trim() === 'Pin',
		)

		if (pin) fireEvent.click(pin)

		const item = (label: string) =>
			present(
				Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
					(element) => element.textContent?.trim() === label,
				),
				`the ${label} item`,
			)

		return item
	}

	it('pins to the right edge from "Pin right", with a right arrow', async () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 500 }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const item = openPinItems(container, 'role')

		const pinRight = item('Pin right')

		expect(pinRight.querySelector('svg.lucide-arrow-right-to-line')).not.toBeNull()

		fireEvent.click(pinRight)

		// The inline start of a right-to-left grid is its right edge.
		await waitFor(() =>
			expect(
				stickyInset(
					present(
						container.querySelector<HTMLElement>('th[data-grid-col="role"]'),
						'the role header',
					),
					'start',
				),
			).toBe('0px'),
		)
	})
})
