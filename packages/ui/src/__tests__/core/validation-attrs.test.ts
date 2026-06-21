import { describe, expect, it } from 'vitest'
import { validationAttrs } from '../../core/validation-attrs'

describe('validationAttrs', () => {
	it('returns the invalid pair for error', () => {
		expect(validationAttrs('error')).toEqual({ 'data-invalid': '', 'aria-invalid': true })
	})

	it('returns data-warning for warning', () => {
		expect(validationAttrs('warning')).toEqual({ 'data-warning': '' })
	})

	it('returns data-valid for success', () => {
		expect(validationAttrs('success')).toEqual({ 'data-valid': '' })
	})

	it('returns undefined when there is no severity', () => {
		expect(validationAttrs(undefined)).toBeUndefined()
	})

	it('returns the same reference on repeated calls', () => {
		expect(validationAttrs('warning')).toBe(validationAttrs('warning'))

		expect(validationAttrs('success')).toBe(validationAttrs('success'))

		expect(validationAttrs('error')).toBe(validationAttrs('error'))
	})
})
