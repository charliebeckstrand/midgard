import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { renderUI, screen, waitFor } from '../helpers'

/** A field that shows its Markdown value. */
function Notes({ initial = '', onEnter }: { initial?: string; onEnter?: () => void }) {
	const [value, setValue] = useState(initial)

	return (
		<>
			<Wysiwyg
				aria-label="Notes"
				value={value}
				onValueChange={setValue}
				onEnter={onEnter}
				rows={1}
				className="max-h-24"
			>
				<WysiwygToolbar />
			</Wysiwyg>
			<output data-testid="value">{value}</output>
		</>
	)
}

/** Loads the editor through a press of the field, and gives its editable element. */
async function editable(): Promise<HTMLElement> {
	await userEvent.click(screen.getByRole('textbox'))

	await waitFor(() =>
		expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true'),
	)

	const field = screen.getByRole('textbox')

	await waitFor(() => expect(field).toHaveFocus())

	return field
}

const value = () => screen.getByTestId('value').textContent

/**
 * The editing of a Wysiwyg in a real browser: the live Markdown shortcuts, the
 * toolbar that keeps the selection, undo, and the growth to a `max-height`.
 * jsdom has no selection and no layout, so these ride the browser.
 */
describe('Wysiwyg (real browser)', () => {
	it('turns the Markdown shortcuts into formatting as the reader types', async () => {
		renderUI(<Notes />)

		const field = await editable()

		await userEvent.keyboard('A **bold** and *em* word{Enter}- one{Enter}two')

		expect(field.querySelector('strong')).toHaveTextContent('bold')

		expect(field.querySelector('em')).toHaveTextContent('em')

		expect(field.querySelectorAll('li')).toHaveLength(2)

		expect(value()).toBe('A **bold** and *em* word\n\n- one\n- two')
	})

	it('starts a new block on Shift+Enter when Enter sends, so the shortcuts work', async () => {
		const onEnter = vi.fn()

		renderUI(<Notes onEnter={onEnter} />)

		const field = await editable()

		await userEvent.keyboard('Steps{Shift>}{Enter}{/Shift}- one{Shift>}{Enter}{/Shift}two{Enter}')

		expect(field.querySelectorAll('li')).toHaveLength(2)

		expect(value()).toBe('Steps\n\n- one\n- two')

		expect(onEnter).toHaveBeenCalledTimes(1)
	})

	it('keeps the controlled value when the parent refuses an edit', async () => {
		function Limited() {
			const [value, setValue] = useState('Hello')

			// The parent takes at most five characters.
			return (
				<Wysiwyg
					aria-label="Notes"
					value={value}
					onValueChange={(next) => setValue(next.slice(0, 5))}
				/>
			)
		}

		renderUI(<Limited />)

		const field = await editable()

		await userEvent.keyboard('{End} world')

		expect(field).toHaveTextContent(/^Hello$/)
	})

	it('formats the selection from the toolbar and keeps the focus in the field', async () => {
		renderUI(<Notes initial="Ship it" />)

		const field = await editable()

		await userEvent.keyboard('{Control>}a{/Control}')

		const bold = screen.getByRole('button', { name: 'Bold' })

		await userEvent.click(bold)

		expect(field).toHaveFocus()

		expect(bold).toHaveAttribute('aria-pressed', 'true')

		expect(value()).toBe('**Ship it**')

		await userEvent.keyboard('{Control>}z{/Control}')

		expect(value()).toBe('Ship it')
	})

	it('grows with its content up to the max height, and then scrolls', async () => {
		renderUI(<Notes />)

		const field = await editable()

		const empty = field.getBoundingClientRect().height

		await userEvent.keyboard('One{Enter}Two{Enter}Three{Enter}Four')

		const grown = field.getBoundingClientRect().height

		expect(grown).toBeGreaterThan(empty)

		await userEvent.keyboard('{Enter}Five{Enter}Six{Enter}Seven{Enter}Eight{Enter}Nine')

		// `max-h-24` is 96 px.
		expect(field.getBoundingClientRect().height).toBeLessThanOrEqual(96)

		expect(field.scrollHeight).toBeGreaterThan(field.clientHeight)
	})
})
