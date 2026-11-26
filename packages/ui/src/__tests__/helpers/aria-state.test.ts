import { describe, expect, it } from 'vitest'
import { attach } from './attach'

function button(expanded?: string) {
	const element = attach(document.createElement('button'))

	if (expanded !== undefined) element.setAttribute('aria-expanded', expanded)

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
})
