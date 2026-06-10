import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Combobox ARIA roles (real floating engine). Verifies `role: null` on
 * `useFloatingUI` keeps floating-ui's `useRole` from nesting duplicate widgets
 * inside the Combobox's hand-rolled `role="combobox"` input and `role="listbox"`
 * panel via the positioning/reference wrappers. jsdom mocks `useRole` away, so
 * only the real engine exercises this path.
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

		// The input is the only combobox; the SelectTrigger wrapper does not shadow it.
		expect(screen.getAllByRole('combobox')).toHaveLength(1)

		expect(input.tagName).toBe('INPUT')

		// `aria-controls` resolves to that single listbox.
		const listbox = screen.getByRole('listbox')

		expect(input.getAttribute('aria-controls')).toBe(listbox.id)

		expect(listbox.id).toBeTruthy()
	})
})
