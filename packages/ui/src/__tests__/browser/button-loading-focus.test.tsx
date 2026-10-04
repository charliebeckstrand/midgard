import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../components/button'
import { renderUI, screen } from '../helpers'

/**
 * A button keeps the keyboard focus when it starts to load.
 *
 * A loading button was natively `disabled`, and a browser moves the focus of a control that
 * becomes disabled to the body. A keyboard user who pressed Enter on Save lost their place. A
 * loading button now stays enabled and cancels its activation instead.
 *
 * Rides the real browser because jsdom keeps the focus on a disabled button.
 */
describe('a button that starts to load (real browser)', () => {
	it('keeps the focus of the keyboard user who pressed it', async () => {
		function Saver() {
			const [loading, setLoading] = useState(false)

			return (
				<Button type="button" loading={loading} onClick={() => setLoading(true)}>
					Save
				</Button>
			)
		}

		renderUI(<Saver />)

		const button = screen.getByRole('button', { name: 'Save' })

		button.focus()

		await userEvent.keyboard('{Enter}')

		expect(button).toHaveAttribute('aria-busy', 'true')

		expect(button).toHaveFocus()
	})
})
