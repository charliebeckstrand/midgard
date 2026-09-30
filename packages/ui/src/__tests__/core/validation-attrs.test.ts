// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validationAttrs } from '../../core/validation-attrs'

const SEVERITIES = ['error', 'warning', 'success'] as const

describe('validationAttrs', () => {
	it.each([
		['error', { 'data-invalid': '', 'aria-invalid': true }],
		['warning', { 'data-warning': '' }],
		['success', { 'data-valid': '' }],
	] as const)('returns the attributes for %s', (severity, expected) => {
		expect(validationAttrs(severity)).toEqual(expected)
	})

	it('returns undefined when there is no severity', () => {
		expect(validationAttrs(undefined)).toBeUndefined()
	})

	it.each(SEVERITIES)('returns one frozen reference for %s on repeated calls', (severity) => {
		expect(validationAttrs(severity)).toBe(validationAttrs(severity))

		expect(Object.isFrozen(validationAttrs(severity))).toBe(true)
	})
})
