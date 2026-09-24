import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, screen, waitFor } from '../../helpers'

/**
 * A pinned column of a right-to-left grid holds its inline edge through a
 * horizontal scroll. The case measures the pinned cell against the scroller at
 * each end of the scroll range. With hidden scrollbars, a stable gutter makes
 * that range 15 px short, so the case runs with real scrollbars (the
 * `scrollbars` instance of `vitest.browser.config.ts`).
 */
describe('grid pinned column in a right-to-left grid (real browser, real scrollbars)', () => {
	type Row = { id: number }

	const DATA = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']

	/** Six data columns of 100 pixels, and one pinned column of 150 pixels on `side`. */
	const pinnedColumns = (side: 'left' | 'right'): GridColumn<Row>[] => {
		const pin: GridColumn<Row> = {
			id: 'pin',
			title: 'Pinned',
			width: 150,
			pinned: side,
			cell: (row) => `P${row.id}`,
		}

		const data = DATA.map((id) => ({
			id,
			title: id,
			width: 100,
			cell: (row: Row) => `${id}-${row.id}`,
		}))

		return side === 'left' ? [pin, ...data] : [...data, pin]
	}

	const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))

	function renderGrid(side: 'left' | 'right') {
		renderUI(
			<div dir="rtl" style={{ width: '420px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="240px"
					columns={pinnedColumns(side)}
					rows={rows}
					getKey={(row) => row.id}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const scroll = present(
			grid.closest<HTMLElement>('[data-slot="grid-scroll"]'),
			'[data-slot="grid-scroll"]',
		)

		return { grid, scroll }
	}

	// In a right-to-left grid, `'left'` and `'right'` name the inline start and
	// end. A left pin therefore sticks to the physical right edge, and a right
	// pin to the physical left edge.
	for (const side of ['left', 'right'] as const) {
		it(`holds a ${side}-pinned column at its inline edge in a right-to-left grid`, async () => {
			const { grid, scroll } = renderGrid(side)

			const pinned = present(
				grid.querySelector<HTMLElement>('tbody td[data-grid-col="pin"]'),
				'a pinned cell',
			)

			const frame = () => scroll.getBoundingClientRect()

			/** The gap between the pinned cell and its inline edge of the scroller. */
			const gap = () =>
				side === 'left'
					? frame().left +
						scroll.clientLeft +
						scroll.clientWidth -
						pinned.getBoundingClientRect().right
					: pinned.getBoundingClientRect().left - (frame().left + scroll.clientLeft)

			// A left pin starts at its edge. A right pin gets there at the far end.
			scroll.scrollLeft = side === 'left' ? 0 : -scroll.scrollWidth

			await waitFor(() => expect(Math.abs(gap())).toBeLessThanOrEqual(1))

			// Scroll the content across. The pinned cell must not move with it.
			const before = scroll.scrollLeft

			scroll.scrollLeft = side === 'left' ? -scroll.scrollWidth : 0

			await waitFor(() => expect(scroll.scrollLeft).not.toBe(before))

			expect(Math.abs(gap())).toBeLessThanOrEqual(1)

			// The boundary rule and the edge shadow face the scrolled columns. For a
			// left pin, they are on the physical left side of the cell.
			const rule = getComputedStyle(pinned, '::after')

			const shadow = getComputedStyle(pinned).boxShadow

			if (side === 'left') {
				expect(rule.left).toBe('0px')

				expect(shadow).toContain(' -1px 0px 3px')
			} else {
				expect(rule.right).toBe('0px')

				expect(shadow).toContain(' 1px 0px 3px')
			}
		})
	}
})
