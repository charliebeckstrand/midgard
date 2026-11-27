import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid } from '../../../modules/grid'
import { present, renderUI, waitFor } from '../../helpers'
import { gridCell } from '../../helpers/grid-cells'
import { eachAuthorScheme } from '../helpers/forced-colors'
import { columns, rows } from '../helpers/grid-bare-editor'

/**
 * A data cell that edits on the `bare` surface, under forced colors. The
 * hairline of an open cell and the ring of the editor with focus are
 * box-shadows, which forced colors remove, so the cell draws an outline in
 * their place. The fine half is `../grid-edit-bare-editor.test.tsx`.
 */
describe('grid bare editor under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('outlines an open cell, and the cell with focus in 2px', async () => {
			const { container } = renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ rows: new Set([1]), onCommit: () => {} }}
				/>,
			)

			const email = await waitFor(() => {
				const cell = gridCell(container, 'email')

				present(cell.querySelector('input'), 'the email editor')

				return cell
			})

			expect(getComputedStyle(email).outlineStyle).toBe('solid')

			expect(getComputedStyle(email).outlineWidth).toBe('1px')

			await userEvent.click(present(email.querySelector('input'), 'the email editor'))

			expect(getComputedStyle(email).outlineWidth).toBe('2px')
		})
	})
})
