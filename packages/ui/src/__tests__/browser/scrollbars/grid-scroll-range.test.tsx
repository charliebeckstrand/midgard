import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, screen, waitFor } from '../../helpers'

/**
 * The grid scroller reaches its whole horizontal range in each direction, with
 * the stable scrollbar gutter kept. The start column and the end column each
 * come fully into view.
 *
 * The case runs with real scrollbars (the `scrollbars` instance of
 * `vitest.browser.config.ts`). With hidden scrollbars, a stable gutter still
 * reserves 15 px, but the range is computed as if the scrollbar had no width.
 * The range is then 15 px short: at the end in a left-to-right scroller, and
 * at the start in a right-to-left one. A user with visible scrollbars never
 * sees that clip.
 */
describe('grid horizontal scroll range (real browser, real scrollbars)', () => {
	type Row = { id: number }

	const columns: GridColumn<Row>[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((id) => ({
		id,
		title: id,
		width: 100,
		cell: (row: Row) => `${id}-${row.id}`,
	}))

	const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))

	function renderGrid(dir: 'ltr' | 'rtl') {
		renderUI(
			<div dir={dir} style={{ width: '420px' }}>
				<Grid
					header={{ position: 'sticky' }}
					maxHeight="240px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
				/>
			</div>,
		)

		const table = screen.getByRole('table')

		const scroll = present(
			table.closest<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		const cell = (id: string) =>
			present(table.querySelector<HTMLElement>(`tbody td[data-grid-col="${id}"]`), `a ${id} cell`)

		/** Whether the cell is fully inside the client box of the scroller. */
		const inView = (id: string) => {
			const box = cell(id).getBoundingClientRect()

			const left = scroll.getBoundingClientRect().left + scroll.clientLeft

			return box.left >= left - 1 && box.right <= left + scroll.clientWidth + 1
		}

		return { scroll, inView }
	}

	for (const dir of ['ltr', 'rtl'] as const) {
		it(`reaches the whole range with the stable gutter kept (${dir})`, async () => {
			const { scroll, inView } = renderGrid(dir)

			expect(getComputedStyle(scroll).scrollbarGutter).toBe('stable')

			const span = scroll.scrollWidth - scroll.clientWidth

			expect(span).toBeGreaterThan(0)

			// The start of the range is 0 in each direction. The end is negative in a
			// right-to-left scroller.
			const end = dir === 'ltr' ? span : -span

			scroll.scrollLeft = end * 10

			await waitFor(() => expect(scroll.scrollLeft).toBe(end))

			expect(inView('c6')).toBe(true)

			scroll.scrollLeft = -end * 10

			await waitFor(() => expect(scroll.scrollLeft).toBe(0))

			expect(inView('c1')).toBe(true)
		})
	}
})
