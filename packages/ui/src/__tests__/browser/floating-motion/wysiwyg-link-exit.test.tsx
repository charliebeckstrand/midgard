import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { renderUI, screen, waitFor } from '../../helpers'

/** Loads the editor through a press of the field, and gives its editable element. */
async function editable(): Promise<HTMLElement> {
	await userEvent.click(screen.getByRole('textbox'))

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

	const field = screen.getByRole('textbox')

	await waitFor(() => expect(field).toHaveFocus())

	return field
}

/** Selects the last word of "Ship it", and opens the link popover on it. */
async function openOnLastWord(): Promise<HTMLElement> {
	const field = await editable()

	await userEvent.keyboard('{End}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}')

	await userEvent.click(screen.getByRole('button', { name: 'Link' }))

	await waitFor(() => expect(screen.getByRole('textbox', { name: 'URL' })).toHaveFocus())

	return field
}

/**
 * The link popover of a Wysiwyg as it closes. The panel stays in the DOM for
 * its exit animation, so the form in it is mounted after the close. The real
 * Motion is necessary: the instant Motion mock removes the panel in the
 * commit that closes it, so no exit occurs.
 */
describe('Wysiwyg link popover exit (real Motion)', () => {
	it('lets the selection go at the close, and marks nothing during the exit', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Ship it">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const field = await openOnLastWord()

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toHaveTextContent('it')

		await userEvent.keyboard('https://a.dev{Enter}')

		await waitFor(() => expect(field).toHaveFocus())

		// The panel is still in its exit animation.
		expect(document.querySelector('[data-slot=popover-content]')).not.toBeNull()

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()

		// A frame later, the panel still exits, and the field marks nothing.
		await new Promise(requestAnimationFrame)

		expect(document.querySelector('[data-slot=popover-content]')).not.toBeNull()

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()

		await waitFor(() => expect(document.querySelector('[data-slot=popover-content]')).toBeNull())

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()
	})

	it('gives the focus back to the field on Apply with no URL', async () => {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue="Ship it">
				<WysiwygToolbar />
			</Wysiwyg>,
		)

		const field = await openOnLastWord()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(document.querySelector('[data-slot=popover-content]')).toBeNull())

		expect(field).toHaveFocus()

		expect(window.getSelection()?.toString()).toBe('it')
	})
})
