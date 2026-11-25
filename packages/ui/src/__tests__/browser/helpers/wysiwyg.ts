import { expect } from 'vitest'
import { userEvent } from 'vitest/browser'
import { screen, waitFor } from '../../helpers'

/**
 * Loads the editor of a Wysiwyg through a press of its field, and gives the
 * editable element of the editor when it has the focus.
 *
 * @remarks The markup before the load is editable too, and it shows the
 * formatting, so the wait is for the class of the editor. The editor puts its
 * own element in place of that markup, so the query runs again until it finds
 * that element.
 *
 * @param name - The accessible name of the field, for a page with more than one.
 */
export async function editable(name?: string): Promise<HTMLElement> {
	const field = () => screen.getByRole('textbox', name === undefined ? {} : { name })

	await userEvent.click(field())

	await waitFor(() => expect(field()).toHaveClass('ProseMirror'))

	const element = field()

	await waitFor(() => expect(element).toHaveFocus())

	return element
}
