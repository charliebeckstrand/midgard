import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { getSlot, present, renderUI, screen, waitFor } from '../helpers'

/** Presses the space between the toolbar and the text, near its start. */
async function pressGap(container: HTMLElement) {
	await userEvent.click(getSlot(container, 'wysiwyg'), { position: { x: 12, y: 1 } })
}

/**
 * In a framed Wysiwyg, a press in the space between the toolbar and the text
 * puts the caret in the field, as a press on the text does. The space is a
 * margin of the field, so the host gets the press and not the field.
 *
 * Rides the real browser because jsdom lays nothing out and has no selection.
 */
describe('Wysiwyg toolbar gap press (real browser)', () => {
	it('loads the editor and moves the focus to the field before the first load', async () => {
		const { container } = renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="First">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		await pressGap(container)

		await waitFor(() =>
			expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true'),
		)

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())
	})

	it('puts the caret in the first row of text', async () => {
		const { container } = renderUI(
			<Wysiwyg aria-label="Notes" defaultValue={'First\n\nSecond'}>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		await userEvent.click(screen.getByRole('textbox'))

		const field = screen.getByRole('textbox')

		await waitFor(() => expect(field).toHaveAttribute('contenteditable', 'true'))

		await userEvent.keyboard('{Control>}{End}{/Control}')

		await pressGap(container)

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())

		const first = present(screen.getByRole('textbox').querySelector('p'), 'the first paragraph')

		expect(first.contains(getSelection()?.anchorNode ?? null)).toBe(true)
	})

	it('does not move the focus while the field is disabled', async () => {
		const { container } = renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="First" disabled>
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		await pressGap(container)

		expect(screen.getByRole('textbox')).not.toHaveFocus()
	})
})
