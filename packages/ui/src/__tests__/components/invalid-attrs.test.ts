import { describe, expect, it } from 'vitest'
import { invalidAttrs } from '../../components/control/invalid-attrs'

describe('invalidAttrs', () => {
	it('returns the attribute pair when invalid is true', () => {
		expect(invalidAttrs(true)).toEqual({ 'data-invalid': '', 'aria-invalid': true })
	})

	it('returns an empty object when invalid is false', () => {
		expect(invalidAttrs(false)).toEqual({})
	})

	it('returns an empty object when invalid is undefined', () => {
		expect(invalidAttrs(undefined)).toEqual({})
	})

	it('returns the same INVALID reference on repeated truthy calls', () => {
		expect(invalidAttrs(true)).toBe(invalidAttrs(true))
	})

	it('returns the same NONE reference on repeated falsy calls', () => {
		expect(invalidAttrs(false)).toBe(invalidAttrs(undefined))
	})
})
