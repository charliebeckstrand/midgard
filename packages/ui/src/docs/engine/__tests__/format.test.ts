// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { humanize, valueLabel } from '../components/format'

describe('humanize', () => {
	it.each([
		['variant', 'Variant'],
		['dismissOnBackdrop', 'Dismiss on backdrop'],
		['aria-label', 'Aria label'],
		['snake_case', 'Snake case'],
		['onValueChange', 'On value change'],
	])('writes %s as %s', (identifier, label) => {
		expect(humanize(identifier)).toBe(label)
	})
})

describe('valueLabel', () => {
	it('names a size token', () => {
		expect(valueLabel('xs')).toBe('Extra small')

		expect(valueLabel('xl')).toBe('Extra large')
	})

	it('reads a boolean as On or Off', () => {
		expect(valueLabel(true)).toBe('On')

		expect(valueLabel(false)).toBe('Off')
	})

	it('writes an identifier as words, and a number as it is', () => {
		expect(valueLabel('separated')).toBe('Separated')

		expect(valueLabel('bottomStart')).toBe('Bottom start')

		expect(valueLabel(2)).toBe('2')
	})
})
