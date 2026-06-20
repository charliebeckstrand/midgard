import { describe, expect, it } from 'vitest'
import { ariaAttr } from '../../core/aria-attr'

describe('ariaAttr', () => {
	it('returns true when the flag is set', () => {
		expect(ariaAttr(true)).toBe(true)
	})

	it('returns undefined when the flag is false', () => {
		expect(ariaAttr(false)).toBeUndefined()
	})

	it('returns undefined when the flag is undefined', () => {
		expect(ariaAttr(undefined)).toBeUndefined()
	})
})
