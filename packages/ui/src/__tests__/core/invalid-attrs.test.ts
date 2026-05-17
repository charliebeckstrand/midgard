import { describe, expect, it } from 'vitest'
import { invalidAttrs } from '../../core/invalid-attrs'

describe('invalidAttrs', () => {
	it('returns the attribute pair when invalid is true', () => {
		expect(invalidAttrs(true)).toEqual({ 'data-invalid': '', 'aria-invalid': true })
	})

	it('returns undefined when invalid is false', () => {
		expect(invalidAttrs(false)).toBeUndefined()
	})

	it('returns undefined when invalid is undefined', () => {
		expect(invalidAttrs(undefined)).toBeUndefined()
	})

	it('returns the same INVALID reference on repeated truthy calls', () => {
		expect(invalidAttrs(true)).toBe(invalidAttrs(true))
	})
})
