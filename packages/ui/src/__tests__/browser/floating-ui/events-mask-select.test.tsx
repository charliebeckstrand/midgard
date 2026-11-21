import { describe, expect, it, onTestFinished } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Select, SelectOption } from '../../../components/select'
import { listen } from '../../../modules/events/engine/events-recorder'
import { EventStore } from '../../../modules/events/engine/events-store'
import { MASK_ATTRIBUTE } from '../../../modules/events/engine/events-target'
import { renderUI, screen, waitFor } from '../../helpers'
import { createStorage } from '../../helpers/event-storage'

/**
 * The events mask on a Select, with the real floating engine. The panel
 * renders in a portal outside the masked form. The trigger names the panel in
 * `aria-controls` while it is open, so the mask reaches the panel through it.
 */
describe('the events mask on a Select (real browser)', () => {
	it('masks the typeahead keys of the trigger and of the panel in its portal', async () => {
		const store = new EventStore(createStorage())

		onTestFinished(listen(store))

		renderUI(
			<form {...{ [MASK_ATTRIBUTE]: '' }}>
				<Select aria-label="Fruit">
					<SelectOption value="apple">Apple</SelectOption>
					<SelectOption value="vanilla">Vanilla</SelectOption>
				</Select>
			</form>,
		)

		const trigger = screen.getByRole('combobox', { name: 'Fruit' })

		trigger.focus()

		await userEvent.keyboard('v')

		const panel = await waitFor(() => screen.getByRole('listbox'))

		expect(trigger.closest('form')?.contains(panel)).toBe(false)

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('a')

		// The panel also forwards a key to itself for the typeahead, and a key
		// that a handler cancels writes a second line.
		const keys = store.entries
			.map(({ text }) => text)
			.filter((text) => text.startsWith('keydown') && text !== 'keydown cancelled')

		expect(keys).toContain('keydown *** button[listbox-button]')

		expect(keys).toContain('keydown *** div[listbox-option]')

		for (const key of keys) expect(key).toMatch(/^keydown \*\*\* /)
	})
})
