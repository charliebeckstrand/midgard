import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen, userEvent, waitFor } from '../helpers'

/**
 * Pagination keeps focus on a page change (WCAG 2.4.3 / 2.4.7). Activating the
 * control at an extent disables it, dropping browser focus to the body; the footer
 * restores focus to the current-page marker. Real browser — disabling the focused
 * element and the focus transition need a layout/focus engine.
 */
describe('grid pagination focus (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	const getKey = (row: Row) => row.id

	it('moves focus to the current page when Next disables at the last page', async () => {
		const user = userEvent.setup()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
			/>,
		)

		// 12 rows / 5 per page = 3 pages. Advance to the last, where Next disables.
		await user.click(screen.getByRole('button', { name: 'Next page' }))

		await user.click(screen.getByRole('button', { name: 'Next page' }))

		// `aria-current` alone reports null on a miss and names neither where focus
		// went nor whether the marker the restore targets was there to take it —
		// and the restore ends in an optional chain, so a missing marker is a
		// silent no-op. This case fails intermittently, so the failure states
		// both.
		await waitFor(() => {
			expect(focusReport()).toEqual({ current: 'page', text: '3', marker: 'present' })
		})
	})

	/**
	 * Where focus sits and whether the current-page marker exists, as one value.
	 * `nav.querySelector('[aria-current="page"]')?.focus()` in `GridPagination` is
	 * the restore, and a run that reads `marker: 'absent'` says the restore had no
	 * target rather than that it aimed wrong.
	 */
	function focusReport() {
		const active = document.activeElement

		return {
			current: active?.getAttribute('aria-current') ?? `none (${describeActive(active)})`,
			text: active?.textContent?.trim() ?? '',
			marker: document.querySelector('[aria-current="page"]') ? 'present' : 'absent',
		}
	}

	/** Names the focused node the way a reader can find it again. */
	function describeActive(active: Element | null) {
		if (!active) return 'nothing'

		const label = active.getAttribute('aria-label') ?? active.textContent?.trim()

		return `${active.tagName.toLowerCase()}${label ? ` "${label}"` : ''}${
			active instanceof HTMLButtonElement && active.disabled ? ' [disabled]' : ''
		}`
	}

	it('keeps focus on Next while it stays enabled mid-range', async () => {
		const user = userEvent.setup()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				pagination={{ defaultValue: { pageIndex: 0, pageSize: 5 } }}
			/>,
		)

		// Page 1 -> 2: Next is still enabled, so focus stays on it rather than jumping.
		await user.click(screen.getByRole('button', { name: 'Next page' }))

		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next page' })),
		)
	})
})
