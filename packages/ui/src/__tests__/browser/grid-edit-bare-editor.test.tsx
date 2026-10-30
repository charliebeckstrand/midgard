import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cdp, userEvent } from 'vitest/browser'
import { Badge } from '../../components/badge'
import { Grid, type GridColumn } from '../../modules/grid'
import { getSlot, present, renderUI, waitFor } from '../helpers'

/**
 * A data cell edits on the `bare` surface: the editor draws no frame, its text
 * starts where the display text starts, and the row keeps its height as it
 * opens. The cell draws the hairline of an open cell and the ring of the
 * editor that has focus. Real browser, because the boxes need a layout engine
 * and the rings need real paint.
 */
describe('grid bare editor (real browser)', () => {
	type Row = { id: number; name: string; email: string; active: boolean }

	const rows: Row[] = [
		{ id: 1, name: 'Wade Cooper', email: 'wade@example.com', active: true },
		{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com', active: false },
	]

	// The Active column shows a badge, which is taller than a line of text, so
	// the badge sets the height of the row at rest.
	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
		{
			id: 'active',
			title: 'Active',
			field: 'active',
			cell: (row) => <Badge>{row.active ? 'Active' : 'Inactive'}</Badge>,
		},
	]

	const getCell = (container: HTMLElement, column: string, row = 0) =>
		present<HTMLElement>(
			container.querySelectorAll(`td[data-grid-col="${column}"]`)[row],
			`td[data-grid-col="${column}"]`,
		)

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
					getCell(container, 'email').querySelector('[data-grid-content]'),
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
						getCell(container, 'email').querySelector('input'),
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
				const cell = getCell(container, 'email')

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

		const frame = await waitFor(() => getSlot(getCell(container, 'email'), 'control-frame'))

		expect(getComputedStyle(frame).boxShadow).toBe('none')

		expect(getComputedStyle(frame).backgroundColor).toBe('rgba(0, 0, 0, 0)')

		const email = getCell(container, 'email')

		const name = getCell(container, 'name')

		// No cell has the cursor or focus yet, so each open cell shows its hairline.
		expect(getComputedStyle(email).boxShadow).toMatch(/0px 0px 0px 1px inset/)

		await userEvent.click(present(email.querySelector('input'), 'the email editor'))

		expect(getComputedStyle(email).boxShadow).toMatch(/0px 0px 0px 2px inset/)

		expect(getComputedStyle(name).boxShadow).toMatch(/0px 0px 0px 1px inset/)

		// A closed row draws no ring.
		expect(getComputedStyle(getCell(container, 'email', 1)).boxShadow).toBe('none')
	})

	describe('under forced colors', () => {
		// The instance shares one page across its files, and the emulation is page
		// state. Thus `afterAll` gives the feature back to the browser.
		beforeAll(() =>
			cdp().send('Emulation.setEmulatedMedia', {
				features: [{ name: 'forced-colors', value: 'active' }],
			}),
		)

		afterAll(() =>
			cdp().send('Emulation.setEmulatedMedia', {
				features: [{ name: 'forced-colors', value: '' }],
			}),
		)

		it('outlines an open cell, and the cell with focus in 2px', async () => {
			expect(matchMedia('(forced-colors: active)').matches).toBe(true)

			const { container } = renderUI(
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ rows: new Set([1]), onCommit: () => {} }}
				/>,
			)

			const email = await waitFor(() => {
				const cell = getCell(container, 'email')

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
