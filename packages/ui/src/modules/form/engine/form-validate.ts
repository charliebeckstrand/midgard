import type { Errors, Touched, ValidateOn, Validator, Validators } from './types'

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
 * @param fields - Restricts to (and forces) these field keys; omit to consider every validator.
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
