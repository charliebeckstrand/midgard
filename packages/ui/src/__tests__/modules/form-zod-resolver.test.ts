// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { runValidators } from '../../modules/form/engine/form-validate'
import {
	type ZodIssue,
	type ZodLike,
	zodResolver,
} from '../../modules/form/engine/form-zod-resolver'

type Values = { name: string; age: number; passwordConfirm: string }

const defaults: Values = { name: '', age: 0, passwordConfirm: '' }

function makeSchema(issues: ZodIssue[]): ZodLike {
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
		const validators = zodResolver(makeSchema([]), defaults)

		expect(Object.keys(validators).sort()).toEqual(['age', 'name', 'passwordConfirm'])
	})

	it('collects every issue per field in schema order', () => {
		const validators = zodResolver(
			makeSchema([
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
			makeSchema([
				{ path: ['name'], message: 'too short' },
				{ path: ['name'], message: 'too short' },
				{ path: ['name'], message: 'no digits' },
			]),
			defaults,
		)

		expect(validators.name?.('', defaults)).toEqual(['too short', 'no digits'])
	})

	it('returns undefined for fields without an issue', () => {
		const validators = zodResolver(makeSchema([{ path: ['name'], message: 'required' }]), defaults)

		expect(validators.age?.(30, defaults)).toBeUndefined()

		expect(validators.passwordConfirm?.('', defaults)).toBeUndefined()
	})

	it('routes cross-field refinement issues to the path the schema specifies', () => {
		const validators = zodResolver(
			makeSchema([{ path: ['passwordConfirm'], message: 'must match' }]),
			defaults,
		)

		expect(validators.passwordConfirm?.('', defaults)).toEqual(['must match'])

		expect(validators.name?.('', defaults)).toBeUndefined()
	})

	it('drops form-level issues (empty path) silently', () => {
		const validators = zodResolver(makeSchema([{ path: [], message: 'global' }]), defaults)

		expect(validators.name?.('', defaults)).toBeUndefined()

		expect(validators.age?.(0, defaults)).toBeUndefined()
	})

	it('parses once per values identity and caches across fields', () => {
		const schema = makeSchema([
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
		const schema = makeSchema([])

		const validators = zodResolver(schema, defaults)

		validators.name?.('', { ...defaults, name: 'a' })

		validators.name?.('', { ...defaults, name: 'b' })

		expect(schema.safeParse).toHaveBeenCalledTimes(2)
	})

	it('plugs into runValidators end-to-end with one parse per pass', () => {
		const schema = makeSchema([
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

	it('coerces non-string path segments to string keys', () => {
		const validators = zodResolver(
			makeSchema([{ path: ['age', 0], message: 'too young' }]),
			defaults,
		)

		expect(validators.age?.(0, defaults)).toEqual(['too young'])
	})
})
