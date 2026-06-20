import { describe, expect, it } from 'vitest'
import { dataAttr } from '../../core/data-attr'

describe('dataAttr', () => {
	it('returns an empty string when the flag is set', () => {
		expect(dataAttr(true)).toBe('')
	})

	it('returns undefined when the flag is false', () => {
		expect(dataAttr(false)).toBeUndefined()
	})

	it('returns undefined when the flag is undefined', () => {
		expect(dataAttr(undefined)).toBeUndefined()
	})
})
