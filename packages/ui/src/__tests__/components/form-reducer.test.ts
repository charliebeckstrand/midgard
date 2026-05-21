import { describe, expect, it } from 'vitest'
import {
	type FormState,
	formReducer,
	runValidators,
	type Validators,
	valuesEqual,
} from '../../components/form/form-reducer'

type Values = { name: string; age: number }

function initialState(): FormState<Values> {
	return { values: { name: '', age: 0 }, errors: {}, touched: {} }
}

const validators: Validators<Values> = {
	name: (value) => (value.length === 0 ? 'required' : undefined),
	age: (value) => (value < 18 ? 'too young' : undefined),
}

describe('runValidators', () => {
	it('returns empty when validate is undefined', () => {
		expect(runValidators(undefined, { name: '', age: 0 }, {}, 'change')).toEqual({})
	})

	it('runs every validator when validateOn is "change"', () => {
		const errors = runValidators(validators, { name: '', age: 10 }, {}, 'change')

		expect(errors).toEqual({ name: ['required'], age: ['too young'] })
	})

	it('skips untouched fields when validateOn is "touched"', () => {
		const errors = runValidators(validators, { name: '', age: 10 }, { name: true }, 'touched')

		expect(errors).toEqual({ name: ['required'] })
	})

	it('skips every field when validateOn is "submit" and no fields are forced', () => {
		expect(runValidators(validators, { name: '', age: 10 }, {}, 'submit')).toEqual({})
	})

	it('forces validation for the listed fields regardless of validateOn', () => {
		const errors = runValidators(validators, { name: '', age: 10 }, {}, 'submit', ['age'])

		expect(errors).toEqual({ age: ['too young'] })
	})

	it('records undefined for fields that pass validation', () => {
		const errors = runValidators(validators, { name: 'ok', age: 30 }, {}, 'change')

		expect(errors).toEqual({ name: undefined, age: undefined })
	})

	it('normalizes a string validator return into a single-element array', () => {
		const errors = runValidators({ name: () => 'required' }, { name: '', age: 0 }, {}, 'change')

		expect(errors).toEqual({ name: ['required'] })
	})

	it('keeps an array validator return as-is and collects every issue', () => {
		const errors = runValidators(
			{ name: () => ['too short', 'no digits'] },
			{ name: '', age: 0 },
			{},
			'change',
		)

		expect(errors).toEqual({ name: ['too short', 'no digits'] })
	})

	it('normalizes an empty-array validator return to undefined', () => {
		const errors = runValidators({ name: () => [] }, { name: '', age: 0 }, {}, 'change')

		expect(errors).toEqual({ name: undefined })
	})

	it('skips fields without a registered validator', () => {
		const errors = runValidators({ name: validators.name }, { name: 'ok', age: 0 }, {}, 'change', [
			'name',
			'age',
		])

		expect(errors).toEqual({ name: undefined })
	})
})

describe('formReducer', () => {
	describe('set-value', () => {
		it('updates the named field without touching others', () => {
			const next = formReducer(initialState(), {
				type: 'set-value',
				name: 'name',
				value: 'Ada',
				validate: undefined,
				validateOn: 'change',
			})

			expect(next.values).toEqual({ name: 'Ada', age: 0 })
		})

		it('does not validate when validateOn is "submit"', () => {
			const prior: FormState<Values> = {
				values: { name: '', age: 0 },
				errors: { name: ['stale'] },
				touched: {},
			}

			const next = formReducer(prior, {
				type: 'set-value',
				name: 'name',
				value: '',
				validate: validators,
				validateOn: 'submit',
			})

			expect(next.errors).toBe(prior.errors)
			expect(next.touched).toBe(prior.touched)
		})

		it('merges new errors when validateOn is "change"', () => {
			const next = formReducer(initialState(), {
				type: 'set-value',
				name: 'name',
				value: '',
				validate: validators,
				validateOn: 'change',
			})

			expect(next.errors).toEqual({ name: ['required'], age: ['too young'] })
		})

		it('keeps the same errors reference when no validator produces a new error', () => {
			const prior = initialState()

			const next = formReducer(prior, {
				type: 'set-value',
				name: 'name',
				value: 'Ada',
				validate: undefined,
				validateOn: 'change',
			})

			expect(next.errors).toBe(prior.errors)
		})
	})

	describe('set-touched', () => {
		it('is a no-op when the field is already touched', () => {
			const prior: FormState<Values> = {
				values: { name: '', age: 0 },
				errors: {},
				touched: { name: true },
			}

			const next = formReducer(prior, {
				type: 'set-touched',
				name: 'name',
				validate: validators,
				validateOn: 'touched',
			})

			expect(next).toBe(prior)
		})

		it('marks the field touched and validates only that field', () => {
			const next = formReducer(initialState(), {
				type: 'set-touched',
				name: 'name',
				validate: validators,
				validateOn: 'touched',
			})

			expect(next.touched).toEqual({ name: true })
			expect(next.errors).toEqual({ name: ['required'] })
		})

		it('does not validate other fields when one field is touched', () => {
			const next = formReducer(initialState(), {
				type: 'set-touched',
				name: 'name',
				validate: validators,
				validateOn: 'touched',
			})

			expect(next.errors).not.toHaveProperty('age')
		})
	})

	describe('set-errors-external', () => {
		it('merges external errors into existing errors', () => {
			const prior: FormState<Values> = {
				values: { name: '', age: 0 },
				errors: { age: ['prev'] },
				touched: {},
			}

			const next = formReducer(prior, {
				type: 'set-errors-external',
				errors: { name: ['server says no'] },
			})

			expect(next.errors).toEqual({ age: ['prev'], name: ['server says no'] })
		})

		it('marks fields with non-empty errors as touched', () => {
			const next = formReducer(initialState(), {
				type: 'set-errors-external',
				errors: { name: ['bad'], age: undefined },
			})

			expect(next.touched).toEqual({ name: true })
		})

		it('does not mark fields touched when the issue list is empty', () => {
			const next = formReducer(initialState(), {
				type: 'set-errors-external',
				errors: { name: [] },
			})

			expect(next.touched).toEqual({})
		})
	})

	describe('reset', () => {
		it('returns a clean state with the provided defaults', () => {
			const prior: FormState<Values> = {
				values: { name: 'dirty', age: 99 },
				errors: { name: ['oops'] },
				touched: { name: true, age: true },
			}

			const next = formReducer(prior, {
				type: 'reset',
				defaults: { name: 'fresh', age: 21 },
			})

			expect(next).toEqual({
				values: { name: 'fresh', age: 21 },
				errors: {},
				touched: {},
			})
		})
	})

	describe('sync-values', () => {
		it('replaces values without touching errors or touched', () => {
			const prior: FormState<Values> = {
				values: { name: 'Ada', age: 30 },
				errors: { age: ['too young'] },
				touched: { name: true },
			}

			const next = formReducer(prior, {
				type: 'sync-values',
				values: { name: 'Grace', age: 45 },
			})

			expect(next.values).toEqual({ name: 'Grace', age: 45 })
			expect(next.errors).toBe(prior.errors)
			expect(next.touched).toBe(prior.touched)
		})

		it('is a no-op when the values reference is unchanged', () => {
			const sharedValues = { name: 'Ada', age: 30 }
			const prior: FormState<Values> = {
				values: sharedValues,
				errors: {},
				touched: {},
			}

			const next = formReducer(prior, { type: 'sync-values', values: sharedValues })

			expect(next).toBe(prior)
		})
	})

	describe('submit-validate', () => {
		it('replaces errors and touched while preserving values', () => {
			const prior: FormState<Values> = {
				values: { name: 'Ada', age: 30 },
				errors: { name: ['stale'] },
				touched: {},
			}

			const next = formReducer(prior, {
				type: 'submit-validate',
				errors: { age: ['too young'] },
				touched: { name: true, age: true },
			})

			expect(next.values).toBe(prior.values)
			expect(next.errors).toEqual({ age: ['too young'] })
			expect(next.touched).toEqual({ name: true, age: true })
		})
	})
})

describe('valuesEqual', () => {
	it('treats reference-equal values as equal', () => {
		const o = { a: 1 }

		expect(valuesEqual(o, o)).toBe(true)
	})

	it('handles primitives via Object.is', () => {
		expect(valuesEqual(1, 1)).toBe(true)
		expect(valuesEqual('a', 'a')).toBe(true)
		expect(valuesEqual(Number.NaN, Number.NaN)).toBe(true)
		expect(valuesEqual(0, -0)).toBe(false)
		expect(valuesEqual(null, undefined)).toBe(false)
	})

	it('compares Date by timestamp', () => {
		expect(valuesEqual(new Date(2026, 0, 1), new Date(2026, 0, 1))).toBe(true)
		expect(valuesEqual(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(false)
	})

	it('compares arrays structurally', () => {
		expect(valuesEqual([], [])).toBe(true)
		expect(valuesEqual(['a', 'b'], ['a', 'b'])).toBe(true)
		expect(valuesEqual(['a', 'b'], ['a', 'c'])).toBe(false)
		expect(valuesEqual([1], [1, 2])).toBe(false)
	})

	it('compares plain objects structurally', () => {
		expect(valuesEqual({}, {})).toBe(true)
		expect(valuesEqual({ a: 1 }, { a: 1 })).toBe(true)
		expect(valuesEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
		expect(valuesEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
		expect(valuesEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
	})

	it('recurses into nested arrays and objects', () => {
		expect(
			valuesEqual({ tags: ['a', 'b'], meta: { x: 1 } }, { tags: ['a', 'b'], meta: { x: 1 } }),
		).toBe(true)
		expect(
			valuesEqual({ tags: ['a', 'b'], meta: { x: 1 } }, { tags: ['a', 'b'], meta: { x: 2 } }),
		).toBe(false)
	})

	it('falls back to reference equality for non-plain objects', () => {
		const f1 = new File([], 'a.txt')
		const f2 = new File([], 'a.txt')

		expect(valuesEqual(f1, f1)).toBe(true)
		expect(valuesEqual(f1, f2)).toBe(false)
	})
})
