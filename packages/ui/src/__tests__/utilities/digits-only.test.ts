import { describe, expect, it } from 'vitest'
import { digitsOnly } from '../../utilities/digits-only'

describe('digitsOnly', () => {
	it('removes every non-digit character', () => {
		expect(digitsOnly('+1 (555) 123-4567')).toBe('15551234567')
	})

	it('leaves an all-digit string unchanged, preserving leading zeros', () => {
		expect(digitsOnly('0042')).toBe('0042')
	})

	it('returns an empty string when there are no digits', () => {
		expect(digitsOnly('abc-?!')).toBe('')
	})

	it('returns an empty string for empty input', () => {
		expect(digitsOnly('')).toBe('')
	})

	// `\d` is ASCII-only, so non-Latin digit glyphs count as non-digits.
	it('strips non-ASCII digit glyphs', () => {
		expect(digitsOnly('4٤2')).toBe('42')
	})
})
