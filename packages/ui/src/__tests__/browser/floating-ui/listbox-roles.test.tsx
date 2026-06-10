import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Listbox } from '../../../components/listbox'
import { ListboxOption } from '../../../components/listbox/listbox-option'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Listbox ARIA roles (real floating engine). Verifies `role: null` on
 * `useFloatingUI` keeps floating-ui's `useRole` from stamping a `combobox`
 * role on the reference wrapper and a popup role on the positioning wrapper,
 * which would nest duplicates inside the Listbox's hand-rolled
 * `role="combobox"` trigger and `role="listbox"` panel. jsdom mocks `useRole`
 * away, so only the real engine exercises this path.
 */
describe('Listbox ARIA roles (real browser)', () => {
	it('exposes exactly one combobox and one listbox when open', async () => {
		renderUI(
			<Listbox aria-label="pick">
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		await waitFor(() => expect(screen.getAllByRole('listbox')).toHaveLength(1))

		// The trigger is the only combobox; the positioning wrapper does not shadow it.
		expect(screen.getAllByRole('combobox')).toHaveLength(1)

		expect(trigger.tagName).toBe('BUTTON')

		// `aria-controls` resolves to that single listbox panel.
		const listbox = screen.getByRole('listbox')

		expect(trigger.getAttribute('aria-controls')).toBe(listbox.id)

		expect(listbox.id).toBeTruthy()
	})
})
