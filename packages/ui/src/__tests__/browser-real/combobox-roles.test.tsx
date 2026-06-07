import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Combobox ARIA roles (real floating engine). Like Listbox, the Combobox
 * hand-rolls `role="combobox"` on its input and `role="listbox"` on the panel's
 * inner list, so floating-ui's `useRole` would nest a duplicate widget inside
 * each via the positioning/reference wrappers (ARIA-AUDIT pattern A). jsdom
 * mocks `useRole` away, so this guards the single-widget tree against the live
 * engine. `role: null` on `useFloatingUI` is the fix.
 */
describe('Combobox ARIA roles (real browser)', () => {
	it('exposes exactly one combobox and one listbox when open', async () => {
		renderUI(
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				<ComboboxOption value="apple">
					<ComboboxLabel>Apple</ComboboxLabel>
				</ComboboxOption>
				<ComboboxOption value="apricot">
					<ComboboxLabel>Apricot</ComboboxLabel>
				</ComboboxOption>
			</Combobox>,
		)

		const input = screen.getByRole('combobox')
		await userEvent.click(input)
		await waitFor(() => expect(screen.getAllByRole('listbox')).toHaveLength(1))

		// The input is the only combobox — the SelectTrigger wrapper no longer
		// shadows it.
		expect(screen.getAllByRole('combobox')).toHaveLength(1)
		expect(input.tagName).toBe('INPUT')

		// And its `aria-controls` resolves to that single listbox.
		const listbox = screen.getByRole('listbox')
		expect(input.getAttribute('aria-controls')).toBe(listbox.id)
		expect(listbox.id).toBeTruthy()
	})
})
