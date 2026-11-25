import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../../modules/wysiwyg'
import { present, renderUI, screen, waitFor } from '../../helpers'

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

		expect(window.getSelection()?.toString()).toBe('it')
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

		expect(window.getSelection()?.toString()).toBe('it')

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

	it('opens one dialog for each link button, and the shortcut opens the last one that mounted', async () => {
		function Two({ second }: { second: boolean }) {
			return (
				<Wysiwyg aria-label="Notes" defaultValue="Ship it">
					{second && <WysiwygToolbar aria-label="Second" />}
					<WysiwygToolbar aria-label="First" />
				</Wysiwyg>
			)
		}

		const { rerender } = renderUI(<Two second={false} />)

		// The second toolbar mounts last, above the first. The load of the editor
		// after it does not change the order of the mounts.
		rerender(<Two second />)

		const field = await editable()

		const [second, first] = screen.getAllByRole('button', { name: 'Link' })

		await userEvent.click(present(first, 'the first link button'))

		await waitFor(() => expect(screen.getByRole('textbox', { name: 'Text' })).toHaveFocus())

		expect(screen.getAllByRole('dialog', { name: 'Link' })).toHaveLength(1)

		expect(first).toHaveAttribute('aria-expanded', 'true')

		expect(second).toHaveAttribute('aria-expanded', 'false')

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() => expect(field).toHaveFocus())

		await userEvent.keyboard('{ControlOrMeta>}k{/ControlOrMeta}')

		await waitFor(() => expect(screen.getByRole('textbox', { name: 'Text' })).toHaveFocus())

		expect(screen.getAllByRole('dialog', { name: 'Link' })).toHaveLength(1)

		expect(second).toHaveAttribute('aria-expanded', 'true')

		expect(first).toHaveAttribute('aria-expanded', 'false')
	})
})
