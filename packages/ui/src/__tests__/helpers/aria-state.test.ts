import { describe, expect, it } from 'vitest'
import { attach } from './attach'

function button(expanded?: string, attribute = 'aria-expanded') {
	const element = attach(document.createElement('button'))

	if (expanded !== undefined) element.setAttribute(attribute, expanded)

	return element
}

function checkbox(checked: boolean) {
	const element = attach(document.createElement('input'))

	element.type = 'checkbox'

	element.checked = checked

	return element
}

describe('ARIA state matchers', () => {
	it('reads each of the three states of aria-expanded', () => {
		expect(button('true')).toBeExpanded()

		expect(button('false')).toBeCollapsed()

		expect(() => expect(button()).toBeCollapsed()).toThrow('it is absent')

		expect(() => expect(button('false')).toBeExpanded()).toThrow('it is "false"')
	})

	it('refuses not, so an absent attribute cannot pass as closed', () => {
		expect(() => expect(button()).not.toBeExpanded()).toThrow('three states')

		expect(() => expect(button()).not.toBeCollapsed()).toThrow('three states')
	})

	it('reads aria-pressed as a toggle that is off, and refuses an absent value', () => {
		expect(button('false', 'aria-pressed')).toBeUnpressed()

		expect(() => expect(button()).toBeUnpressed()).toThrow('it is absent')

		expect(() => expect(button('true', 'aria-pressed')).toBeUnpressed()).toThrow('it is "true"')

		expect(() => expect(button('false', 'aria-pressed')).not.toBeUnpressed()).toThrow(
			'three states',
		)
	})

	it('reads a native checkbox from checked, and an ARIA one from aria-checked', () => {
		expect(checkbox(false)).toBeUnchecked()

		expect(() => expect(checkbox(true)).toBeUnchecked()).toThrow('it is checked')

		expect(button('false', 'aria-checked')).toBeUnchecked()

		expect(() => expect(button()).toBeUnchecked()).toThrow('it is absent')

		expect(() => expect(checkbox(false)).not.toBeUnchecked()).toThrow('use toBeChecked')
	})
})
