import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid } from '../../modules/grid'
import { getSlot, present, renderUI, waitFor } from '../helpers'
import { gridCell } from '../helpers/grid-cells'
import { columns, rows } from './helpers/grid-bare-editor'

/**
 * A data cell edits on the `bare` surface: the editor draws no frame, its text
 * starts where the display text starts, and the row keeps its height as it
 * opens. The cell draws the hairline of an open cell and the ring of the
 * editor that has focus. Real browser, because the boxes need a layout engine
 * and the rings need real paint. The forced half is
 * `forced/grid-edit-bare-editor.test.tsx`.
 */
describe('grid bare editor (real browser)', () => {
	const firstRow = (container: HTMLElement) =>
		present<HTMLElement>(container.querySelector('tbody tr'), 'the first row')

	for (const dir of ['ltr', 'rtl'] as const) {
		for (const condensed of [false, true]) {
			it(`keeps the height of an open row and the place of its text (${dir}${condensed ? ', condensed' : ''})`, async () => {
				const { container, rerender } = renderUI(
					<div dir={dir}>
						<Grid
							columns={columns}
							rows={rows}
							getKey={(row) => row.id}
							condensed={condensed}
							editable={{ rows: new Set(), onCommit: () => {} }}
						/>
					</div>,
				)

				const height = firstRow(container).getBoundingClientRect().height

				const text = present<HTMLElement>(
					gridCell(container, 'email').querySelector('[data-grid-content]'),
					'the display content',
				)

				const range = document.createRange()

				range.selectNodeContents(text)

				const textBox = range.getBoundingClientRect()

				rerender(
					<div dir={dir}>
						<Grid
							columns={columns}
							rows={rows}
							getKey={(row) => row.id}
							condensed={condensed}
							editable={{ rows: new Set([1]), onCommit: () => {} }}
						/>
					</div>,
				)

				const input = await waitFor(() =>
					present<HTMLInputElement>(
						gridCell(container, 'email').querySelector('input'),
						'the email editor',
					),
				)

				expect(firstRow(container).getBoundingClientRect().height).toBeCloseTo(height, 0)

				// The editor has no padding, so its text box is its content box, and
				// the text starts at the start edge of the display text.
				const inputBox = input.getBoundingClientRect()

				const style = getComputedStyle(input)

				expect(style.paddingInlineStart).toBe('0px')

				if (dir === 'ltr') expect(inputBox.left).toBeCloseTo(textBox.left, 0)
				else expect(inputBox.right).toBeCloseTo(textBox.right, 0)

				// The editor takes the content width of the cell.
				const cell = gridCell(container, 'email')

				const cellStyle = getComputedStyle(cell)

				const content =
					cell.getBoundingClientRect().width -
					Number.parseFloat(cellStyle.paddingInlineStart) -
					Number.parseFloat(cellStyle.paddingInlineEnd)

				expect(inputBox.width).toBeCloseTo(content, 0)
			})
		}
	}

	it('draws no frame on the editor, a hairline on an open cell, and a ring on the cell with focus', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ rows: new Set([1]), onCommit: () => {} }}
			/>,
		)

		const frame = await waitFor(() => getSlot(gridCell(container, 'email'), 'control-frame'))

		expect(getComputedStyle(frame).boxShadow).toBe('none')

		expect(getComputedStyle(frame).backgroundColor).toBe('rgba(0, 0, 0, 0)')

		const email = gridCell(container, 'email')

		const name = gridCell(container, 'name')

		// No cell has the cursor or focus yet, so each open cell shows its hairline.
		expect(getComputedStyle(email).boxShadow).toMatch(/0px 0px 0px 1px inset/)

		await userEvent.click(present(email.querySelector('input'), 'the email editor'))

		expect(getComputedStyle(email).boxShadow).toMatch(/0px 0px 0px 2px inset/)

		expect(getComputedStyle(name).boxShadow).toMatch(/0px 0px 0px 1px inset/)

		// A closed row draws no ring.
		expect(getComputedStyle(gridCell(container, 'email', 1)).boxShadow).toBe('none')
	})
})
