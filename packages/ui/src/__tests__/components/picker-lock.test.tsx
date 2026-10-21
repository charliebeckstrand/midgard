import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ColorPicker } from '../../components/color'
import { ControlLockContext } from '../../components/control/context'
import { DatePicker } from '../../components/date-picker'
import { Listbox, ListboxOption } from '../../components/listbox'
import { fireEvent, getSlot, renderUI } from '../helpers'

/**
 * A picker trigger is a plain button. A locked scope, such as a `Form` while a
 * submit runs, reaches it through the field: the field is read-only, and a
 * read-only trigger does not open.
 */
describe('a picker in a locked scope', () => {
	const cases: [string, string, ReactElement][] = [
		[
			'Listbox',
			'listbox-button',
			<Listbox key="listbox" aria-label="Fruit">
				<ListboxOption value="apple">Apple</ListboxOption>
			</Listbox>,
		],
		['DatePicker', 'datepicker-button', <DatePicker key="date" aria-label="Due date" />],
		['ColorPicker', 'color-picker-button', <ColorPicker key="color" aria-label="Color" />],
	]

	it.each(cases)('makes the %s trigger read-only, and keeps it shut', (_, slot, picker) => {
		const { container } = renderUI(<ControlLockContext value>{picker}</ControlLockContext>)

		const trigger = getSlot<HTMLButtonElement>(container, slot)

		expect(trigger).toHaveAttribute('data-readonly')

		// Read-only stays focusable and in the tab order.
		expect(trigger).not.toBeDisabled()

		fireEvent.click(trigger)

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})
})
