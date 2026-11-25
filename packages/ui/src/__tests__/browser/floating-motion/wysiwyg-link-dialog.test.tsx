import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { renderUI, screen, waitFor } from '../../helpers'

/** A field with a toolbar. */
function Notes({ initial }: { initial: string }) {
	return (
		<Wysiwyg aria-label="Notes" defaultValue={initial}>
			<WysiwygToolbar />
		</Wysiwyg>
	)
}

/** Loads the editor through a press of the field, and gives its editable element. */
async function editable(): Promise<HTMLElement> {
	await userEvent.click(screen.getByRole('textbox'))

	await waitFor(() => expect(screen.getByRole('textbox')).toHaveClass('ProseMirror'))

	const field = screen.getByRole('textbox')

	await waitFor(() => expect(field).toHaveFocus())

	return field
}

/** Selects the last two characters of the field, and opens the link dialog on them. */
async function openOnLastWord(): Promise<HTMLElement> {
	const field = await editable()

	await userEvent.keyboard('{End}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}')

	await userEvent.click(screen.getByRole('button', { name: 'Link' }))

	await waitFor(() => expect(screen.getByRole('textbox', { name: 'URL' })).toHaveFocus())

	return field
}

/** The panel of the link dialog, which stays in the DOM for its exit animation. */
const panel = () => document.querySelector('[data-slot=dialog]')

/**
 * The link dialog of a Wysiwyg, and the focus and the held selection as it
 * closes. The real Motion is necessary: the instant Motion mock removes the
 * panel in the commit that closes it, so no exit occurs.
 */
describe('Wysiwyg link dialog (real Motion)', () => {
	it('lets the selection go at the close, and marks nothing during the exit', async () => {
		renderUI(<Notes initial="Ship it" />)

		const field = await openOnLastWord()

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toHaveTextContent('it')

		await userEvent.keyboard('https://a.dev{Enter}')

		expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveTextContent('Ship it')

		// The panel is still in its exit animation.
		expect(panel()).not.toBeNull()

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()

		await new Promise(requestAnimationFrame)

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() => expect(field).toHaveFocus())

		expect(field.querySelector('a')).toHaveAttribute('href', 'https://a.dev')

		expect(window.getSelection()?.toString()).toBe('it')

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()
	})

	it('gives the focus back to the field on Apply with no URL', async () => {
		renderUI(<Notes initial="Ship it" />)

		const field = await openOnLastWord()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() => expect(field).toHaveFocus())

		// The field draws its selection again after the focus.
		await waitFor(() => expect(window.getSelection()?.toString()).toBe('it'))
	})

	it('opens from the link shortcut, and Escape gives the focus back to the field', async () => {
		renderUI(<Notes initial="Ship it" />)

		const field = await editable()

		await userEvent.keyboard('{End}{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}')

		await userEvent.keyboard('{ControlOrMeta>}k{/ControlOrMeta}')

		await waitFor(() => expect(screen.getByRole('textbox', { name: 'URL' })).toHaveFocus())

		expect(screen.getAllByRole('dialog', { name: 'Link' })).toHaveLength(1)

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() => expect(field).toHaveFocus())

		await waitFor(() => expect(window.getSelection()?.toString()).toBe('it'))

		expect(field.querySelector('[data-slot=wysiwyg-held]')).toBeNull()

		// The reader goes on typing at the selection.
		await userEvent.keyboard('us')

		expect(field).toHaveTextContent('Ship us')
	})

	it('gives the focus back to the button after a key on it, and to the field after Remove link', async () => {
		renderUI(<Notes initial="Read [the docs](https://a.dev)" />)

		const field = await editable()

		await userEvent.keyboard('{End}{ArrowLeft}')

		const link = screen.getByRole('button', { name: 'Link' })

		link.focus()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(screen.getByRole('textbox', { name: 'URL' })).toHaveFocus())

		expect(screen.getByRole('textbox', { name: 'URL' })).toHaveValue('https://a.dev')

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() => expect(link).toHaveFocus())

		await userEvent.keyboard('{Enter}')

		await userEvent.click(await screen.findByRole('button', { name: 'Remove link' }))

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() => expect(field).toHaveFocus())

		expect(field.querySelector('a')).toBeNull()

		expect(field).toHaveTextContent('Read the docs')
	})
})
