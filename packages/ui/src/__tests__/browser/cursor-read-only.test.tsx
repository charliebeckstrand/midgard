import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { ColorPicker } from '../../components/color'
import { Combobox, ComboboxOption } from '../../components/combobox'
import { Control } from '../../components/control'
import { DatePicker } from '../../components/date-picker'
import { Field, Label } from '../../components/fieldset'
import { Input } from '../../components/input'
import { Listbox, ListboxOption } from '../../components/listbox'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { RangeSlider, Slider } from '../../components/slider'
import { Switch, SwitchChoice, SwitchField } from '../../components/switch'
import { present, renderUI } from '../helpers'

/**
 * The cursor over a read-only control.
 *
 * A read-only control keeps the focus, but a press does not change it. Thus no part of it shows
 * the pointer: the box, the hidden input over the box, the label, and the affix of a picker
 * show the default cursor. A control that is also disabled shows `not-allowed`, and an
 * editable control keeps the pointer.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */

const choice = [
	{ value: 'day', label: 'Day' },
	{ value: 'night', label: 'Night' },
] as const

const controls: [string, ReactNode][] = [
	[
		'Checkbox in a field',
		<CheckboxField key="checkbox">
			<Checkbox />
			<Label>Subscribe</Label>
		</CheckboxField>,
	],
	[
		'Radio in a group',
		<RadioGroup key="radio-group" aria-label="Plan">
			<RadioField>
				<Radio name="plan" value="starter" />
				<Label>Starter</Label>
			</RadioField>
		</RadioGroup>,
	],
	['Radio alone', <Radio key="radio" name="plan" value="starter" aria-label="Starter" />],
	[
		'Switch in a field',
		<SwitchField key="switch">
			<Switch />
			<Label>Notify</Label>
		</SwitchField>,
	],
	['SwitchChoice', <SwitchChoice key="switch-choice" aria-label="Theme" options={choice} />],
	['Slider', <Slider key="slider" aria-label="Volume" />],
	['RangeSlider', <RangeSlider key="range" aria-label="Price" />],
	[
		'Listbox',
		<Listbox key="listbox" aria-label="Fruit">
			<ListboxOption value="apple">Apple</ListboxOption>
		</Listbox>,
	],
	[
		'Combobox',
		<Combobox key="combobox" aria-label="Fruit">
			<ComboboxOption value="apple">Apple</ComboboxOption>
		</Combobox>,
	],
	['DatePicker', <DatePicker key="date" aria-label="Due date" />],
	['ColorPicker', <ColorPicker key="color" aria-label="Accent" />],
	[
		'Input in a field',
		<Field key="input">
			<Label>Name</Label>
			<Input />
		</Field>,
	],
]

/** The parts of the tree that show the pointer, by tag and slot. */
function pointers(node: ReactNode, state: { readOnly?: boolean; disabled?: boolean }) {
	const { container } = renderUI(<Control {...state}>{node}</Control>)

	return [...container.querySelectorAll('*')]
		.filter((element) => getComputedStyle(element).cursor === 'pointer')
		.map((element) => {
			const slot = element.getAttribute('data-slot')

			return slot ? `${element.localName}[${slot}]` : element.localName
		})
}

function readCursor(container: HTMLElement, selector: string) {
	return getComputedStyle(present(container.querySelector(selector), selector)).cursor
}

describe('the cursor over a read-only control (real browser)', () => {
	it.each(controls)('%s shows no pointer', (_, node) => {
		expect(pointers(node, { readOnly: true })).toEqual([])
	})

	/** A rule that removed the pointer from every control would pass the case above. */
	it('keeps the pointer on an editable control', () => {
		const { container } = renderUI(
			<>
				<CheckboxField>
					<Checkbox />
					<Label>Subscribe</Label>
				</CheckboxField>
				<Listbox aria-label="Fruit">
					<ListboxOption value="apple">Apple</ListboxOption>
				</Listbox>
			</>,
		)

		expect(readCursor(container, '[data-slot=checkbox]')).toBe('pointer')

		expect(readCursor(container, '[data-slot=label]')).toBe('pointer')

		expect(readCursor(container, '[data-slot=suffix]')).toBe('pointer')
	})

	/** The read-only rule has the weight of one class, so the disabled rules replace it. */
	it('shows not-allowed on a control that is also disabled', () => {
		const { container } = renderUI(
			<Control readOnly disabled>
				<CheckboxField>
					<Checkbox />
					<Label>Subscribe</Label>
				</CheckboxField>
				<Listbox aria-label="Fruit">
					<ListboxOption value="apple">Apple</ListboxOption>
				</Listbox>
				<SwitchChoice aria-label="Theme" options={choice} />
			</Control>,
		)

		expect(readCursor(container, 'label[data-slot=control]')).toBe('not-allowed')

		expect(readCursor(container, '[data-slot=checkbox]')).toBe('not-allowed')

		expect(readCursor(container, '[data-slot=label]')).toBe('not-allowed')

		expect(readCursor(container, '[data-slot=suffix]')).toBe('not-allowed')

		expect(readCursor(container, '[data-slot=switch-choice-label]')).toBe('not-allowed')
	})
})
