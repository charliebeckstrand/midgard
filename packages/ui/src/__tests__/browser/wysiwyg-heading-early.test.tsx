import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { present, renderUI, screen, waitFor, within } from '../helpers'
import { holdEditorLoad, load } from './helpers/wysiwyg-early-input'

/**
 * The heading level before the editor loads. A press on Heading starts the
 * load, and the rail opens at once. The rail then shows the level of the block
 * of the caret, or of the first block when the caret is not in the field, as
 * the editor does when it comes. Before, the rail showed no level until the
 * editor came, and then the level.
 *
 * Rides the real browser because the static field of jsdom has no selection
 * as a browser gives it.
 */
describe('Wysiwyg heading level before the load (real browser)', () => {
	holdEditorLoad()

	function renderField(defaultValue: string) {
		renderUI(
			<Wysiwyg aria-label="Notes" defaultValue={defaultValue}>
				<WysiwygToolbar />
			</Wysiwyg>,
		)
	}

	/** The level that the open rail shows as pressed. */
	function pressedLevel(): string | null {
		const rail = screen.getByRole('toolbar', { name: 'Heading' })

		const pressed = within(rail)
			.getAllByRole('button')
			.filter((button) => button.getAttribute('aria-pressed') === 'true')

		return pressed.map((button) => button.getAttribute('aria-label')).join() || null
	}

	it('shows the level of the first block when the caret is not in the field', async () => {
		renderField('# Title\n\nBody')

		const heading = screen.getByRole('button', { name: 'Heading' })

		expect(heading.querySelector('svg')).toHaveClass('lucide-heading-1')

		await userEvent.click(heading)

		expect(screen.getByRole('textbox')).not.toHaveClass('ProseMirror')

		expect(pressedLevel()).toBe('Heading 1')

		await load()

		expect(pressedLevel()).toBe('Heading 1')
	})

	it('shows the level of the block of the caret', async () => {
		renderField('Title\n\n## Sub')

		const field = screen.getByRole('textbox')

		field.focus()

		const h2 = present(field.querySelector('h2'), 'the heading')

		window.getSelection()?.collapse(h2.firstChild ?? h2, 1)

		await userEvent.click(screen.getByRole('button', { name: 'Heading' }))

		expect(field).not.toHaveClass('ProseMirror')

		expect(pressedLevel()).toBe('Heading 2')

		await load()

		await waitFor(() => expect(pressedLevel()).toBe('Heading 2'))
	})

	it('shows Text for a paragraph', async () => {
		renderField('Body')

		await userEvent.click(screen.getByRole('button', { name: 'Heading' }))

		expect(pressedLevel()).toBe('Text')
	})
})
