// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { humanize } from '../kit/humanize.ts'

describe('humanize', () => {
	it('gives an identifier or a file name as words in sentence case', () => {
		expect(humanize('groupTotalRow')).toBe('Group total row')

		expect(humanize('with-icon')).toBe('With icon')
	})

	it('keeps the capitals of an acronym and of a proper noun', () => {
		expect(humanize('compound-api')).toBe('Compound API')

		expect(humanize('ltr')).toBe('LTR')

		expect(humanize('equal-earth')).toBe('Equal Earth')

		expect(humanize('albers-usa')).toBe('Albers USA')
	})

	it('keeps a code word in lowercase, also at the start of the label', () => {
		expect(humanize('dvh')).toBe('dvh')

		expect(humanize('alertdialog')).toBe('alertdialog')
	})

	it('reads a value that is not an identifier as written', () => {
		expect(humanize('MM/DD/YYYY')).toBe('MM/DD/YYYY')

		expect(humanize('YYYY-MM-DD')).toBe('YYYY-MM-DD')

		expect(humanize('16/9')).toBe('16/9')

		expect(humanize('USD')).toBe('USD')
	})
})
