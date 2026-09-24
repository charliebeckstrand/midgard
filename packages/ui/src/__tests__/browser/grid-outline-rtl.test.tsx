import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI } from '../helpers'

/**
 * The `outline` borders of a grid in each direction. Each cell draws the rule
 * at its inline end, and the first cell of each row also draws the one at its
 * inline start. The outer edges then close, and no inner line doubles. Only a
 * real browser resolves the logical sides to physical widths.
 */
describe('grid outline borders (real browser)', () => {
	type Row = { id: number; a: string; b: string; c: string }

	const columns: GridColumn<Row>[] = (['a', 'b', 'c'] as const).map((id) => ({
		id,
		title: id,
		cell: (row: Row) => row[id],
	}))

	const rows: Row[] = [{ id: 1, a: 'a1', b: 'b1', c: 'c1' }]

	for (const dir of ['ltr', 'rtl'] as const) {
		it(`closes each outer edge and doubles no inner line (${dir})`, () => {
			const { container } = renderUI(
				<div dir={dir} style={{ width: 400 }}>
					<Grid outline resizable={false} columns={columns} rows={rows} getKey={(row) => row.id} />
				</div>,
			)

			const cells = Array.from(
				present(container.querySelector('tbody tr'), 'a body row').children,
			) as HTMLElement[]

			const widths = cells.map((cell) => {
				const style = getComputedStyle(cell)

				return { left: style.borderLeftWidth, right: style.borderRightWidth }
			})

			// The inline start is on the left in LTR and on the right in RTL.
			const start = dir === 'ltr' ? 'left' : 'right'

			const end = dir === 'ltr' ? 'right' : 'left'

			expect(widths.map((width) => width[end])).toEqual(['1px', '1px', '1px'])

			expect(widths.map((width) => width[start])).toEqual(['1px', '0px', '0px'])
		})
	}
})
