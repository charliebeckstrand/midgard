import { hasIssues } from '../../../primitives/form/form-issues'
import { normalizeIssues, runValidators } from './form-validate'
import type { Errors, Touched, Validators } from './types'

/**
 * The verdict of the client validation of one submit: each field marked
 * touched, the issues of each validator, and whether an issue refuses the
 * submit.
 *
 * @internal
 */
export type SubmitValidation = {
	touched: Touched
	errors: Errors
	refused: boolean
}

/**
 * Validates every field for a submit, whatever the `validateOn` of the form
 * is. Each key of `values` counts as touched, so that each field shows its
 * issue.
 *
 * @internal
 */
export function validateSubmit<T extends Record<string, unknown>>(
	validators: Validators<T> | undefined,
	values: T,
): SubmitValidation {
	const touched: Touched = {}

	for (const key in values) touched[key] = true

	// The `'change'` mode runs each validator.
	const errors = runValidators(validators, values, touched, 'change')

	return { touched, errors, refused: Object.values(errors).some(hasIssues) }
}

/**
 * Gives the fields of `errors` that have an issue. It is the payload of
 * `onInvalidSubmit`, so each field in it carries at least one issue.
 *
 * @internal
 */
export function invalidFields(errors: Errors): Record<string, string[]> {
	const result: Record<string, string[]> = {}

	for (const key in errors) {
		const issues = errors[key]

		if (issues && hasIssues(issues)) result[key] = issues
	}

	return result
}

/**
 * Reads the `fieldErrors` of a submit handler return. The return of a handler
 * is `unknown`, so each step checks the shape.
 *
 * @returns The `fieldErrors` record, or `undefined` when the return has none.
 * @internal
 */
export function extractFieldErrors(
	raw: unknown,
): Record<string, string | string[] | undefined> | undefined {
	if (raw === null || typeof raw !== 'object') return undefined

	if (!('fieldErrors' in raw)) return undefined

	const fieldErrors = (raw as { fieldErrors?: unknown }).fieldErrors

	if (fieldErrors === null || typeof fieldErrors !== 'object') return undefined

	return fieldErrors as Record<string, string | string[] | undefined>
}

/**
 * True when an entry of `fieldErrors` holds an issue. An entry of `''` is an
 * issue. An entry of `undefined` or `[]` clears its field and is no issue.
 *
 * @internal
 */
export function hasFieldIssues(
	fieldErrors: Record<string, string | string[] | undefined>,
): boolean {
	return Object.values(fieldErrors).some((entry) => hasIssues(normalizeIssues(entry)))
}

/**
 * Gives an `Error` for a value that a submit handler threw. A thrown `Error`
 * stays as it is.
 *
 * @internal
 */
export function toError(thrown: unknown): Error {
	return thrown instanceof Error ? thrown : new Error(String(thrown))
}

/**
 * Runs `submit`, then `done` whether `submit` resolves or throws. Kept outside
 * the hook: the React Compiler does not support a `finally` block.
 *
 * @internal
 */
export async function settleSubmit(submit: () => Promise<void>, done: () => void): Promise<void> {
	try {
		await submit()
	} finally {
		done()
	}
}
