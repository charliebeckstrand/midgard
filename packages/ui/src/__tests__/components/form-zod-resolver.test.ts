import { describe, expect, it, vi } from 'vitest'
import { runValidators } from '../../components/form/form-reducer'
import { type ZodIssue, type ZodLike, zodResolver } from '../../components/form/form-zod-resolver'

type Values = { name: string; age: number; passwordConfirm: string }

const defaults: Values = { name: '', age: 0, passwordConfirm: '' }

function fakeSchema(issues: ZodIssue[]): ZodLike {
	return {
		safeParse: vi.fn(() =>
			issues.length === 0
				? ({ success: true } as const)
				: ({ success: false, error: { issues } } as const),
		),
	}
}

describe('zodResolver', () => {
	it('returns a Validators map keyed by every defaultValues field', () => {
		const validators = zodResolver(fakeSchema([]), defaults)

		expect(Object.keys(validators).sort()).toEqual(['age', 'name', 'passwordConfirm'])
	})

	it('collects every issue per field in schema order', () => {
		const validators = zodResolver(
			fakeSchema([
				{ path: ['name'], message: 'required' },
				{ path: ['name'], message: 'too short' },
				{ path: ['age'], message: 'too young' },
			]),
			defaults,
		)

		expect(validators.name?.('', defaults)).toEqual(['required', 'too short'])

		expect(validators.age?.(0, defaults)).toEqual(['too young'])
	})

	it('deduplicates identical messages on the same field', () => {
		const validators = zodResolver(
			fakeSchema([
				{ path: ['name'], message: 'too short' },
				{ path: ['name'], message: 'too short' },
				{ path: ['name'], message: 'no digits' },
			]),
			defaults,
		)

		expect(validators.name?.('', defaults)).toEqual(['too short', 'no digits'])
	})

	it('returns undefined for fields without an issue', () => {
		const validators = zodResolver(fakeSchema([{ path: ['name'], message: 'required' }]), defaults)

		expect(validators.age?.(30, defaults)).toBeUndefined()

		expect(validators.passwordConfirm?.('', defaults)).toBeUndefined()
	})

	it('routes cross-field refinement issues to the path the schema specifies', () => {
		const validators = zodResolver(
			fakeSchema([{ path: ['passwordConfirm'], message: 'must match' }]),
			defaults,
		)

		expect(validators.passwordConfirm?.('', defaults)).toEqual(['must match'])

		expect(validators.name?.('', defaults)).toBeUndefined()
	})

	it('drops form-level issues (empty path) silently', () => {
		const validators = zodResolver(fakeSchema([{ path: [], message: 'global' }]), defaults)

		expect(validators.name?.('', defaults)).toBeUndefined()

		expect(validators.age?.(0, defaults)).toBeUndefined()
	})

	it('parses once per values identity and caches across fields', () => {
		const schema = fakeSchema([
			{ path: ['name'], message: 'required' },
			{ path: ['age'], message: 'too young' },
		])

		const validators = zodResolver(schema, defaults)

		const values: Values = { ...defaults }

		validators.name?.('', values)

		validators.age?.(0, values)

		validators.passwordConfirm?.('', values)

		expect(schema.safeParse).toHaveBeenCalledTimes(1)
	})

	it('re-parses when the values reference changes', () => {
		const schema = fakeSchema([])

		const validators = zodResolver(schema, defaults)

		validators.name?.('', { ...defaults, name: 'a' })

		validators.name?.('', { ...defaults, name: 'b' })

		expect(schema.safeParse).toHaveBeenCalledTimes(2)
	})

	it('plugs into runValidators end-to-end with one parse per pass', () => {
		const schema = fakeSchema([
			{ path: ['name'], message: 'required' },
			{ path: ['age'], message: 'too young' },
		])

		const validators = zodResolver(schema, defaults)

		const errors = runValidators(validators, defaults, {}, 'change')

		expect(errors).toEqual({
			name: ['required'],
			age: ['too young'],
			passwordConfirm: undefined,
		})

		expect(schema.safeParse).toHaveBeenCalledTimes(1)
	})

	it('honors validateOn="touched" by only running validators for touched fields', () => {
		const schema = fakeSchema([
			{ path: ['name'], message: 'required' },
			{ path: ['age'], message: 'too young' },
		])

		const validators = zodResolver(schema, defaults)

		const errors = runValidators(validators, defaults, { name: true }, 'touched')

		expect(errors).toEqual({ name: ['required'] })
	})

	it('coerces non-string path segments to string keys', () => {
		const validators = zodResolver(
			fakeSchema([{ path: ['age', 0], message: 'too young' }]),
			defaults,
		)

		expect(validators.age?.(0, defaults)).toEqual(['too young'])
	})
})
