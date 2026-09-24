import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI, screen, waitFor } from '../helpers'

/**
 * A right-to-left grid scroller must show the whole start column. In Chromium,
 * `scrollbar-gutter: stable` on a right-to-left scroller shifts the scroll
 * range by the gutter width. The scroller then cannot reach `scrollLeft` 0, and
 * it clips the start edge of the content by that width. A plain `overflow:
 * auto` element with the same gutter shows the same clip, so the cause is not
 * in the grid. Only a real browser lays out the gutter, so the measurement is
 * asserted here.
 */
describe('grid start column in a right-to-left scroller (real browser)', () => {
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

		const start = present(
			table.querySelector<HTMLElement>('tbody td[data-grid-col="c1"]'),
			'a c1 cell',
		)

		return { scroll, start }
	}

	it('shows the whole start column at the start of the scroll range', async () => {
		const { scroll, start } = renderGrid('rtl')

		// A positive value clamps to the start of a right-to-left scroll range.
		scroll.scrollLeft = scroll.scrollWidth

		const frame = scroll.getBoundingClientRect()

		const clientRight = frame.left + scroll.clientLeft + scroll.clientWidth

		await waitFor(() =>
			expect(start.getBoundingClientRect().right).toBeLessThanOrEqual(clientRight + 1),
		)

		expect(scroll.scrollLeft).toBe(0)
	})

	it('reaches the whole end column at the end of the scroll range', async () => {
		const { scroll } = renderGrid('rtl')

		scroll.scrollLeft = -scroll.scrollWidth

		await waitFor(() => expect(scroll.scrollLeft).toBe(-(scroll.scrollWidth - scroll.clientWidth)))
	})

	it('keeps the stable scrollbar gutter in a left-to-right grid', () => {
		const { scroll } = renderGrid('ltr')

		expect(getComputedStyle(scroll).scrollbarGutter).toBe('stable')
	})
})
