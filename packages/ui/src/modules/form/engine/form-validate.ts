import type { Errors, Touched, ValidateOn, Validator, Validators } from './types'

/**
 * The key of the rule of the whole form on a {@link Validators} map. A symbol,
 * so the field loops, which read the string keys, never see it, and no field
 * name can take it. {@link zodResolver} sets it for the issues of a schema
 * with no field (`path: []`).
 *
 * @internal
 */
export const FORM_RULE: unique symbol = Symbol('formRule')

/** A validators map that can carry the rule of the whole form under {@link FORM_RULE}. @internal */
export type WithFormRule<T> = Validators<T> & {
	[FORM_RULE]?: (values: T) => string | undefined
}

/**
 * The issue of the whole form from the rule under {@link FORM_RULE}, or `null`
 * when the map has no rule or the rule passes.
 *
 * @internal
 */
export function runFormRule<T>(validate: Validators<T> | undefined, values: T): string | null {
	const rule = (validate as WithFormRule<T> | undefined)?.[FORM_RULE]

	return rule?.(values) ?? null
}

/**
 * Normalizes a validator return to a non-empty issue array or `undefined`.
 *
 * @internal
 */
export function normalizeIssues(out: string | string[] | undefined): string[] | undefined {
	if (out === undefined) return undefined

	if (typeof out === 'string') return [out]

	return out.length > 0 ? out : undefined
}

/**
 * Normalizes each entry of a loose error map, such as the argument of
 * `setErrors` or the `fieldErrors` of a submit result.
 *
 * @internal
 */
export function normalizeErrors(errors: Record<string, string | string[] | undefined>): Errors {
	const normalized: Errors = {}

	for (const key in errors) normalized[key] = normalizeIssues(errors[key])

	return normalized
}

/**
 * Runs the applicable field validators and returns their normalized issues.
 * Runs a field when `fields` forces it, when `validateOn` is `'change'`, or when
 * `'touched'` and the field is touched.
 *
 * @param fields - The field keys to run, each of them even when its trigger has not come. Leave it out to consider each validator.
 * @internal
 */
export function runValidators<T extends Record<string, unknown>>(
	validate: Validators<T> | undefined,
	values: T,
	touched: Touched,
	validateOn: ValidateOn,
	fields?: string[],
): Errors {
	if (!validate) return {}

	const forced = fields !== undefined

	const keys = fields ?? Object.keys(validate)

	const result: Errors = {}

	for (const key of keys) {
		const fn = validate[key as keyof T] as Validator<T, keyof T> | undefined

		if (!fn) continue

		if (forced || validateOn === 'change' || (validateOn === 'touched' && touched[key])) {
			const out = fn(values[key as keyof T], values)

			result[key] = normalizeIssues(out)
		}
	}

	return result
}
