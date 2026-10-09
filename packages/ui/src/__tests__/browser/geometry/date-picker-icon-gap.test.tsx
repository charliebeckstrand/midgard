import { describe, expect, it } from 'vitest'
import { DatePicker } from '../../../components/date-picker'
import { Listbox, ListboxOption } from '../../../components/listbox'
import { densitySteps } from '../../../core/density'
import { present, renderUI } from '../../helpers'

/**
 * The gap between the value and the calendar icon of a content-sized
 * DatePicker trigger (V07). The icon is inside the trigger button, not in a
 * suffix slot, so the gap of the button sets the space. The space must be the
 * same as the space between the value and the chevron of a Listbox at each
 * size. Before the fix, the gap was 3 px at `sm`, and the Listbox space was 9 px.
 */

const VALUE = '1/15/2026'

/** The inline end of the text in `element`, not the end of its box. */
function textEnd(element: Element): number {
	const range = document.createRange()

	range.selectNodeContents(element)

	return range.getBoundingClientRect().right
}

function iconStart(root: Element): number {
	return present(root.querySelector('svg'), 'svg').getBoundingClientRect().left
}

describe('DatePicker trigger icon gap', () => {
	it.each(densitySteps)('matches the Listbox chevron gap at %s', (size) => {
		const { container } = renderUI(
			<div className="flex flex-col items-start">
				<DatePicker size={size} defaultValue={new Date(2026, 0, 15)} />
				<Listbox size={size} defaultValue="a" aria-label="Listbox">
					<ListboxOption value="a">{VALUE}</ListboxOption>
				</Listbox>
			</div>,
		)

		const trigger = present(
			container.querySelector('[data-slot=datepicker-button]'),
			'[data-slot=datepicker-button]',
		)

		const listbox = present(container.querySelector('[data-slot=listbox]'), '[data-slot=listbox]')

		const listboxValue = present(
			listbox.querySelector('[data-slot=listbox-button] > span'),
			'[data-slot=listbox-button] > span',
		)

		const pickerGap = iconStart(trigger) - textEnd(present(trigger.querySelector('span'), 'span'))

		const listboxGap = iconStart(listbox) - textEnd(listboxValue)

		expect(pickerGap).toBe(listboxGap)
	})
})
