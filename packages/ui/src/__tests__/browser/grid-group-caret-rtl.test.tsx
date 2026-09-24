import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn, type GridColumnGroup } from '../../modules/grid'
import { present, renderUI, screen } from '../helpers'

/**
 * The fold caret of a collapsible column group. An open group points the caret
 * to its inline end, where its columns show. A folded group points it to the
 * inline start. In a right-to-left grid the inline end is on the left, so the
 * caret mirrors. Only a real browser resolves the `rtl:` variant.
 */
describe('grid column-group caret (real browser)', () => {
	type Row = { id: number; a: string; b: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (row) => row.a },
		{ id: 'b', title: 'B', cell: (row) => row.b },
	]

	const groups: GridColumnGroup[] = [
		{ id: 'work', title: 'Work', columns: ['a', 'b'], collapsible: true },
	]

	const rows: Row[] = [{ id: 1, a: 'a1', b: 'b1' }]

	for (const dir of ['ltr', 'rtl'] as const) {
		it(`mirrors the caret only in a right-to-left grid (${dir})`, () => {
			renderUI(
				<div dir={dir}>
					<Grid columns={columns} columnGroups={groups} rows={rows} getKey={(row) => row.id} />
				</div>,
			)

			const toggle = screen.getByRole('button', { name: /Collapse/ })

			const caret = present(toggle.querySelector('svg'), 'the caret')

			// Tailwind mirrors through the `scale` property, not `transform`.
			const { scale } = getComputedStyle(caret)

			if (dir === 'rtl') expect(scale).toBe('-1 1')
			else expect(scale).toBe('none')
		})
	}
})
