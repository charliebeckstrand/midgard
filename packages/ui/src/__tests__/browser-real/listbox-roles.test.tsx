import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Listbox } from '../../components/listbox'
import { ListboxOption } from '../../components/listbox/listbox-option'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * Listbox ARIA roles (real floating engine). floating-ui's `useRole` stamps a
 * popup role on the positioning wrapper and a `combobox` role on the reference
 * wrapper; the Listbox already hand-rolls `role="combobox"` on its trigger and
 * `role="listbox"` on its panel, so left on it would nest a duplicate widget
 * inside each (ARIA-AUDIT pattern A / headline #1). jsdom mocks `useRole` away
 * so the duplication is invisible there — this guards the single-widget tree
 * against the live engine. `role: null` on `useFloatingUI` is the fix.
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

		// The trigger is the only combobox — the positioning wrapper no longer
		// shadows it.
		expect(screen.getAllByRole('combobox')).toHaveLength(1)
		expect(trigger.tagName).toBe('BUTTON')

		// And its `aria-controls` resolves to that single listbox panel.
		const listbox = screen.getByRole('listbox')
		expect(trigger.getAttribute('aria-controls')).toBe(listbox.id)
		expect(listbox.id).toBeTruthy()
	})
})
