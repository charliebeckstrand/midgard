import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { SearchInput } from '../../components/search-input'
import { renderUI, screen } from '../helpers'

/**
 * When the clear button of an input goes away while it has the focus, the
 * focus goes to the input and not to `<body>` (WCAG 2.4.3).
 *
 * Rides the real browser because the claim is about the focus that a browser
 * moves when it removes the focused element.
 */
describe('the focus after the clear button goes away (real browser)', () => {
	it('moves to the input when loading swaps out the focused clear button', async () => {
		const { rerender } = renderUI(<SearchInput aria-label="Search" defaultValue="query" />)

		const input = screen.getByRole('searchbox')

		input.focus()

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Clear search' }))

		rerender(<SearchInput aria-label="Search" defaultValue="query" loading />)

		expect(document.activeElement).toBe(input)
	})
})
