import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { renderUI, screen, waitFor } from '../../helpers'
import { editable } from '../helpers/wysiwyg'

/** Loads the editor through a press of the field, and selects the last word. */
async function selectLastWord(): Promise<HTMLElement> {
	renderUI(
		<Wysiwyg aria-label="Notes" defaultValue="Ship it">
			<WysiwygToolbar />
		</Wysiwyg>,
	)

	const field = await editable()

	await userEvent.keyboard('{End}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}')

	return field
}

/**
 * The focus when Escape closes the link dialog of a Wysiwyg. The focus goes
 * back to where it was as the dialog opened (WCAG 2.4.3). The dialog portals
 * and its focus manager runs, so these ride the real floating engine.
 */
describe('Wysiwyg link dialog focus (real floating-ui)', () => {
	it.for([
		['the link shortcut', () => userEvent.keyboard('{Control>}k{/Control}')],
		// A press on a toolbar button keeps the focus in the field.
		[
			'a press of the link button',
			() => userEvent.click(screen.getByRole('button', { name: 'Link' })),
		],
	] as const)('gives the focus and the selection back to the field after %s', async ([, open]) => {
		const field = await selectLastWord()

		await open()

		const url = await screen.findByRole('textbox', { name: 'URL' })

		await waitFor(() => expect(url).toHaveFocus())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		expect(field).toHaveFocus()

		expect(window.getSelection()?.toString()).toBe('it')
	})

	it('keeps the focus in the dialog on an Escape that cancels an input method candidate', async () => {
		await selectLastWord()

		await userEvent.keyboard('{Control>}k{/Control}')

		const url = await screen.findByRole('textbox', { name: 'URL' })

		await waitFor(() => expect(url).toHaveFocus())

		// The input method composes, so its Escape cancels the candidate, and the
		// dialog stays open.
		url.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))

		url.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }),
		)

		expect(url).toHaveFocus()

		expect(screen.getByRole('dialog', { name: 'Link' })).toBeVisible()
	})

	it('gives the focus back to the link button after a key on it', async () => {
		await selectLastWord()

		// Into the toolbar, and along it to Link.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		const link = screen.getByRole('button', { name: 'Link' })

		while (document.activeElement !== link) await userEvent.keyboard('{ArrowRight}')

		await userEvent.keyboard('{Enter}')

		const url = await screen.findByRole('textbox', { name: 'URL' })

		await waitFor(() => expect(url).toHaveFocus())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(link).toHaveFocus())
	})
})
