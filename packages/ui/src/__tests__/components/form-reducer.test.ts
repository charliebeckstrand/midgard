// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type Errors,
	type FormState,
	formReducer,
	runValidators,
	type Touched,
	type ValidateOn,
	type Validators,
	valuesEqual,
} from '../../components/form/form-reducer'

type Values = { name: string; age: number }

function initialState(): FormState<Values> {
	return {
		values: { name: '', age: 0 },
		defaults: { name: '', age: 0 },
		errors: {},
		touched: {},
		external: {},
	}
}

const validators: Validators<Values> = {
	name: (value) => (value.length === 0 ? 'required' : undefined),
	age: (value) => (value < 18 ? 'too young' : undefined),
}

describe('runValidators', () => {
	it.each<
		[
			string,
			Validators<Values> | undefined,
			Values,
			Touched,
			ValidateOn,
			string[] | undefined,
			Errors,
		]
	>([
		[
			'returns empty when validate is undefined',
			undefined,
			{ name: '', age: 0 },
			{},
			'change',
			undefined,
			{},
		],
		[
			'runs every validator when validateOn is "change"',
			validators,
			{ name: '', age: 10 },
			{},
			'change',
			undefined,
			{ name: ['required'], age: ['too young'] },
		],
		[
			'skips untouched fields when validateOn is "touched"',
			validators,
			{ name: '', age: 10 },
			{ name: true },
			'touched',
			undefined,
			{ name: ['required'] },
		],
		[
			'skips every field when validateOn is "submit" and no fields are forced',
			validators,
			{ name: '', age: 10 },
			{},
			'submit',
			undefined,
			{},
		],
		[
			'forces validation for the listed fields regardless of validateOn',
			validators,
			{ name: '', age: 10 },
			{},
			'submit',
			['age'],
			{ age: ['too young'] },
		],
		[
			'records undefined for fields that pass validation',
			validators,
			{ name: 'ok', age: 30 },
			{},
			'change',
			undefined,
			{ name: undefined, age: undefined },
		],
		[
			'normalizes a string validator return into a single-element array',
			{ name: () => 'required' },
			{ name: '', age: 0 },
			{},
			'change',
			undefined,
			{ name: ['required'] },
		],
		[
			'keeps an array validator return as-is and collects every issue',
			{ name: () => ['too short', 'no digits'] },
			{ name: '', age: 0 },
			{},
			'change',
			undefined,
			{ name: ['too short', 'no digits'] },
		],
		[
			'normalizes an empty-array validator return to undefined',
			{ name: () => [] },
			{ name: '', age: 0 },
			{},
			'change',
			undefined,
			{ name: undefined },
		],
		[
			'skips fields without a registered validator',
			{ name: validators.name },
			{ name: 'ok', age: 0 },
			{},
			'change',
			['name', 'age'],
			{ name: undefined },
		],
	])('%s', (_name, validate, values, touched, validateOn, fields, expected) => {
		expect(runValidators(validate, values, touched, validateOn, fields)).toEqual(expected)
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
				defaults: { name: '', age: 0 },
				errors: { name: ['stale'] },
				touched: {},
				external: {},
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

		it('validates only the changed field when validateOn is "change"', () => {
			const next = formReducer(initialState(), {
				type: 'set-value',
				name: 'name',
				value: '',
				validate: validators,
				validateOn: 'change',
			})

			// toStrictEqual also fails on an undefined `age` key, so the untouched field did not validate.
			expect(next.errors).toStrictEqual({ name: ['required'] })
		})

		it.each<[string, Pick<FormState<Values>, 'errors' | 'touched'>]>([
			['is touched', { errors: {}, touched: { age: true } }],
			['has a result already', { errors: { age: undefined }, touched: {} }],
		])('also validates another field that %s when validateOn is "change"', (_name, prior) => {
			const next = formReducer(
				{ ...initialState(), ...prior },
				{
					type: 'set-value',
					name: 'name',
					value: '',
					validate: validators,
					validateOn: 'change',
				},
			)

			expect(next.errors).toEqual({ name: ['required'], age: ['too young'] })
		})

		it('updates a cross-field result when the other field changes', () => {
			type Passwords = { password: string; confirm: string }

			const match: Validators<Passwords> = {
				confirm: (value, values) => (value === values.password ? undefined : 'mismatch'),
			}

			const prior: FormState<Passwords> = {
				values: { password: 'abc', confirm: 'abd' },
				defaults: { password: '', confirm: '' },
				errors: { confirm: ['mismatch'] },
				touched: { password: true },
				external: {},
			}

			const next = formReducer(prior, {
				type: 'set-value',
				name: 'password',
				value: 'abd',
				validate: match,
				validateOn: 'change',
			})

			expect(next.errors).toEqual({ confirm: undefined })
		})

		describe('with a server issue on name', () => {
			function serverState(): FormState<Values> {
				return {
					values: { name: 'Ada', age: 30 },
					defaults: { name: '', age: 0 },
					errors: { name: ['taken'] },
					touched: { name: true, age: true },
					external: { name: true },
				}
			}

			it.each<ValidateOn>(['touched', 'change'])(
				'keeps the issue when a sibling changes and validateOn is "%s"',
				(validateOn) => {
					const prior = serverState()

					const next = formReducer(prior, {
						type: 'set-value',
						name: 'age',
						value: 10,
						validate: validators,
						validateOn,
					})

					expect(next.errors).toEqual({ name: ['taken'], age: ['too young'] })

					expect(next.external).toBe(prior.external)
				},
			)

			it.each<ValidateOn>(['touched', 'change'])(
				'lands the result of name when name changes and validateOn is "%s"',
				(validateOn) => {
					const next = formReducer(serverState(), {
						type: 'set-value',
						name: 'name',
						value: 'Grace',
						validate: validators,
						validateOn,
					})

					expect(next.errors).toEqual({ name: undefined })

					expect(next.external).toEqual({})
				},
			)

			it('drops name from external but keeps the issue when validateOn is "submit"', () => {
				const prior = serverState()

				const next = formReducer(prior, {
					type: 'set-value',
					name: 'name',
					value: 'Grace',
					validate: validators,
					validateOn: 'submit',
				})

				expect(next.errors).toBe(prior.errors)

				expect(next.external).toEqual({})
			})
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
				defaults: { name: '', age: 0 },
				errors: {},
				touched: { name: true },
				external: {},
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

			// toStrictEqual also fails on an undefined `age` key, so no other field validated.
			expect(next.errors).toStrictEqual({ name: ['required'] })
		})

		it('marks the field touched but does not validate when validateOn is "submit"', () => {
			const prior: FormState<Values> = {
				values: { name: '', age: 0 },
				defaults: { name: '', age: 0 },
				errors: { name: ['stale'] },
				touched: {},
				external: {},
			}

			const next = formReducer(prior, {
				type: 'set-touched',
				name: 'name',
				validate: validators,
				validateOn: 'submit',
			})

			expect(next.touched).toEqual({ name: true })

			expect(next.errors).toBe(prior.errors)
		})
	})

	describe('set-errors-external', () => {
		it('merges external errors into existing errors', () => {
			const prior: FormState<Values> = {
				values: { name: '', age: 0 },
				defaults: { name: '', age: 0 },
				errors: { age: ['prev'] },
				touched: {},
				external: {},
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

		it('records each key with an issue as external and drops each key without one', () => {
			const prior: FormState<Values> = {
				...initialState(),
				errors: { age: ['taken'] },
				touched: { age: true },
				external: { age: true },
			}

			const next = formReducer(prior, {
				type: 'set-errors-external',
				errors: { name: ['x'], age: undefined },
			})

			expect(next.external).toEqual({ name: true })
		})
	})

	describe('reset', () => {
		it('returns a clean state with the provided defaults', () => {
			const prior: FormState<Values> = {
				values: { name: 'dirty', age: 99 },
				defaults: { name: '', age: 0 },
				errors: { name: ['oops'] },
				touched: { name: true, age: true },
				external: { name: true },
			}

			const next = formReducer(prior, {
				type: 'reset',
				defaults: { name: 'fresh', age: 21 },
			})

			expect(next).toEqual({
				values: { name: 'fresh', age: 21 },
				defaults: { name: 'fresh', age: 21 },
				errors: {},
				touched: {},
				external: {},
			})
		})

		it('resets to the held defaults when none are given', () => {
			const defaults = { name: 'Ada', age: 30 }

			const prior: FormState<Values> = {
				values: { name: 'dirty', age: 99 },
				defaults,
				errors: { name: ['oops'] },
				touched: { name: true },
				external: {},
			}

			const next = formReducer(prior, { type: 'reset' })

			expect(next.values).toEqual(defaults)

			expect(next.values).not.toBe(defaults)

			expect(next.defaults).toBe(defaults)
		})
	})

	describe('sync-values', () => {
		it('replaces values without touching errors or touched', () => {
			const prior: FormState<Values> = {
				values: { name: 'Ada', age: 30 },
				defaults: { name: '', age: 0 },
				errors: { age: ['too young'] },
				touched: { name: true },
				external: { age: true },
			}

			const next = formReducer(prior, {
				type: 'sync-values',
				values: { name: 'Grace', age: 45 },
			})

			expect(next.values).toEqual({ name: 'Grace', age: 45 })

			expect(next.defaults).toBe(next.values)

			expect(next.errors).toBe(prior.errors)

			expect(next.touched).toBe(prior.touched)

			expect(next.external).toBe(prior.external)
		})

		it('is a no-op when the values reference is unchanged', () => {
			const sharedValues = { name: 'Ada', age: 30 }

			const prior: FormState<Values> = {
				values: sharedValues,
				defaults: sharedValues,
				errors: {},
				touched: {},
				external: {},
			}

			const next = formReducer(prior, { type: 'sync-values', values: sharedValues })

			expect(next).toBe(prior)
		})
	})

	describe('submit-validate', () => {
		it('replaces errors and touched while preserving values', () => {
			const prior: FormState<Values> = {
				values: { name: 'Ada', age: 30 },
				defaults: { name: '', age: 0 },
				errors: { name: ['stale'] },
				touched: {},
				external: { name: true },
			}

			const next = formReducer(prior, {
				type: 'submit-validate',
				errors: { age: ['too young'] },
				touched: { name: true, age: true },
			})

			expect(next.values).toBe(prior.values)

			expect(next.errors).toEqual({ age: ['too young'] })

			expect(next.touched).toEqual({ name: true, age: true })

			// The submit result replaces each external issue.
			expect(next.external).toEqual({})
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
