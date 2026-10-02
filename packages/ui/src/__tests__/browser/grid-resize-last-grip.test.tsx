import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI } from '../helpers'

/**
 * The resize grip on the trailing edge of a header reads as a divider between
 * two columns. After the last column there is no column on the other side, so
 * the grip must not show at rest. The handle stays: hover, keyboard focus, and
 * a drag show the grip, and the last column can still resize. The test reads
 * the computed opacity, so it uses real CSS in the browser suite.
 */
describe('grid resize grip on the last column (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	function setup() {
		const { container } = renderUI(
			<div style={{ width: '600px' }}>
				<Grid resizable columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const separator = (label: string) =>
			present(
				container.querySelector<HTMLElement>(`[role="separator"][aria-label="Resize ${label}"]`),
				`${label} separator`,
			)

		const opacity = (handle: HTMLElement) =>
			getComputedStyle(present(handle.firstElementChild, 'grip')).opacity

		return { separator, opacity }
	}

	it('hides the grip after the last column at rest and keeps it between columns', () => {
		const { separator, opacity } = setup()

		expect(opacity(separator('Name'))).toBe('1')
		expect(opacity(separator('Role'))).toBe('0')
	})

	it('shows the last grip on hover and on keyboard focus', async () => {
		const { separator, opacity } = setup()

		const role = separator('Role')

		await userEvent.hover(role)

		expect(opacity(role)).toBe('1')

		await userEvent.unhover(role)

		expect(opacity(role)).toBe('0')

		// Tab from the first separator to the last, so the focus carries the
		// keyboard modality of `:focus-visible`. The header controls between the
		// two separators set the number of steps, so the loop has a limit.
		separator('Name').focus()

		for (let step = 0; step < 10 && document.activeElement !== role; step++) {
			await userEvent.tab()
		}

		expect(role.matches(':focus-visible')).toBe(true)
		expect(opacity(role)).toBe('1')
	})
})
