import { describe, expect, onTestFinished } from 'vitest'
import { Select, SelectOption } from '../../components/select'
import { listen } from '../../modules/events/engine/events-recorder'
import { EventStore } from '../../modules/events/engine/events-store'
import { MASK_ATTRIBUTE } from '../../modules/events/engine/events-target'
import { fireEvent, renderUI, screen } from '../helpers'
import { createStorage } from '../helpers/event-storage'
import { it } from '../helpers/fake-clock'

/** The key lines of a store, oldest first. */
function keyLines(store: EventStore): string[] {
	return store.entries.filter(({ text }) => text.startsWith('keydown')).map(({ text }) => text)
}

// The unit suite mocks `@floating-ui/react`, so the panel renders in place.
// The browser case `events-mask-select.test.tsx` in `browser/floating-ui`
// holds the panel in a real portal.
describe('the events mask on a Select', () => {
	it.each([
		['in a masked form', true],
		['outside a mask', false],
	])('masks the typeahead keys of the trigger, the panel, and an option %s', (_, masked) => {
		const store = new EventStore(createStorage())

		onTestFinished(listen(store))

		renderUI(
			<form {...(masked ? { [MASK_ATTRIBUTE]: '' } : {})}>
				<Select aria-label="Fruit">
					<SelectOption value="apple">Apple</SelectOption>
					<SelectOption value="vanilla">Vanilla</SelectOption>
				</Select>
			</form>,
		)

		const trigger = screen.getByRole('combobox', { name: 'Fruit' })

		fireEvent.keyDown(trigger, { key: 'v', code: 'KeyV' })

		fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' })

		const [option] = screen.getAllByRole('option')

		if (!option) throw new Error('no option')

		fireEvent.keyDown(option, { key: 'a', code: 'KeyA' })

		fireEvent.keyDown(screen.getByRole('listbox'), { key: 'a', code: 'KeyA' })

		const lines = keyLines(store)

		expect(lines).toHaveLength(4)

		expect(lines.filter((line) => line.startsWith('keydown *** '))).toHaveLength(masked ? 3 : 0)

		expect(lines.some((line) => line.startsWith('keydown ArrowDown '))).toBe(true)
	})
})
