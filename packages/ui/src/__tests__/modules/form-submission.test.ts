// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	extractFieldErrors,
	hasFieldIssues,
	invalidFields,
	settleSubmit,
	toError,
	validateSubmit,
} from '../../modules/form/engine/form-submission'
import type { Validators } from '../../modules/form/engine/types'

type Values = { name: string; age: number }

const validators: Validators<Values> = {
	name: (value) => (value ? undefined : 'Enter a name.'),
	age: (value) => (value >= 18 ? undefined : ['Too young.', 'Ask a parent.']),
}

describe('validateSubmit', () => {
	it('runs each validator', () => {
		const { errors, refused } = validateSubmit(validators, { name: '', age: 20 })

		expect(errors).toEqual({ name: ['Enter a name.'], age: undefined })

		expect(refused).toBe(true)
	})

	it('does not refuse a submit with no issue', () => {
		const result = validateSubmit(validators, { name: 'Jane', age: 30 })

		expect(result.refused).toBe(false)
	})

	it('does not refuse a form with no validators', () => {
		const result = validateSubmit(undefined, { name: '', age: 0 })

		expect(result).toEqual({ touched: { name: true, age: true }, errors: {}, refused: false })
	})
})

describe('invalidFields', () => {
	it('keeps only the fields with an issue', () => {
		expect(invalidFields({ name: ['Enter a name.'], age: undefined, email: [] })).toEqual({
			name: ['Enter a name.'],
		})
	})
})

describe('extractFieldErrors', () => {
	it('reads the fieldErrors of a result', () => {
		expect(extractFieldErrors({ fieldErrors: { name: 'Taken.' } })).toEqual({ name: 'Taken.' })
	})

	it.each([
		['undefined', undefined],
		['null', null],
		['a string', 'done'],
		['an object with no fieldErrors', { ok: true }],
		['a null fieldErrors', { fieldErrors: null }],
		['a string fieldErrors', { fieldErrors: 'Taken.' }],
	])('gives undefined for %s', (_label, raw) => {
		expect(extractFieldErrors(raw)).toBeUndefined()
	})
})

describe('hasFieldIssues', () => {
	it('counts an empty string as an issue', () => {
		expect(hasFieldIssues({ name: '' })).toBe(true)
	})

	it('counts no issue for entries that clear their field', () => {
		expect(hasFieldIssues({ name: undefined, age: [] })).toBe(false)
	})
})

describe('toError', () => {
	it('keeps an Error', () => {
		const error = new Error('Busy.')

		expect(toError(error)).toBe(error)
	})

	it('wraps another thrown value', () => {
		expect(toError('Busy.')).toEqual(new Error('Busy.'))
	})
})

describe('settleSubmit', () => {
	it('runs done after a submit that resolves', async () => {
		const calls: string[] = []

		await settleSubmit(
			async () => {
				calls.push('submit')
			},
			() => calls.push('done'),
		)

		expect(calls).toEqual(['submit', 'done'])
	})

	it('runs done after a submit that throws, and passes the throw on', async () => {
		const calls: string[] = []

		await expect(
			settleSubmit(
				() => Promise.reject(new Error('Busy.')),
				() => calls.push('done'),
			),
		).rejects.toThrow('Busy.')

		expect(calls).toEqual(['done'])
	})
})
