import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { getSlot, renderUI, screen, waitFor, within } from '../helpers'
import { editable } from './helpers/wysiwyg'

/**
 * The heading rail swaps in for the toolbar row. The swap keeps the size of
 * the toolbar, also where the row wraps to two lines, so the field does not
 * move. A press on Heading and on a level keeps the focus in the field, so the
 * virtual keyboard stays open.
 *
 * Rides the real browser because jsdom lays nothing out, and its press does
 * not move the focus as a browser does. It also runs in WebKit, the engine of
 * iOS Safari.
 */
describe('Wysiwyg heading rail (real browser)', () => {
	it.for([320, 800])(
		'keeps the size of the toolbar and the focus in the field at %i px',
		async (width) => {
			const { container } = renderUI(
				<div style={{ width }}>
					<Wysiwyg aria-label="Notes" defaultValue="Title">
						<WysiwygToolbar />
					</Wysiwyg>
				</div>,
			)

			const field = await editable()

			const row = getSlot(container, 'wysiwyg-toolbar')

			const before = row.getBoundingClientRect().height

			await userEvent.click(screen.getByRole('button', { name: 'Heading' }))

			const rail = screen.getByRole('toolbar', { name: 'Heading' })

			await waitFor(() => expect(rail).not.toHaveAttribute('data-hidden'))

			expect(row.getBoundingClientRect().height).toBe(before)

			expect(field).toHaveFocus()

			await userEvent.click(within(rail).getByRole('radio', { name: 'Heading 1' }))

			await waitFor(() => expect(field.querySelector('h1')).toHaveTextContent('Title'))

			expect(rail).toHaveAttribute('data-hidden')

			expect(row.getBoundingClientRect().height).toBe(before)

			expect(field).toHaveFocus()
		},
	)
})
