/**
 * Field validator: returns an error message, or `null` when the value passes.
 *
 * @internal
 * @remarks Receives the field value and the full form values (for cross-field rules).
 */
export type Validator = (value: string, values: Record<string, string>) => string | null

/**
 * Validator factory: fails on an empty (whitespace-only) value.
 *
 * @internal
 * @param message - Error message on failure. Defaults to `'This field is required'`.
 */
export const required =
	(message = 'This field is required'): Validator =>
	(value) =>
		value.trim() ? null : message

/**
 * Validator factory: fails when the value isn't a plausible email address.
 *
 * @internal
 * @param message - Error message on failure. Defaults to `'Please enter a valid email address'`.
 */
export const email =
	(message = 'Please enter a valid email address'): Validator =>
	(value) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message

/**
 * Validator factory: fails when the value is shorter than `n` characters.
 *
 * @internal
 * @param n - Minimum length, inclusive.
 * @param message - Error message on failure. Defaults to `` `Must be at least ${n} characters` ``.
 */
export const minLength =
	(n: number, message?: string): Validator =>
	(value) =>
		value.length >= n ? null : (message ?? `Must be at least ${n} characters`)

/**
 * Validator factory: fails when the value differs from another field's value.
 *
 * @internal
 * @param field - Name of the sibling field to compare against (e.g. `password`).
 * @param label - Human label for `field`, used in the `Must match ${label}` message.
 */
export const matches =
	(field: string, label: string): Validator =>
	(value, values) =>
		value === values[field] ? null : `Must match ${label}`

/**
 * Composes validators into one, returning the first error or `undefined`.
 *
 * @internal
 * @remarks
 * Adapts the {@link Validator} contract (`string | null`) to the form library's
 * field-validator shape (`string | undefined`).
 * @param fns - Validators run in order; evaluation stops at the first failure.
 * @returns A validator that yields the first error message, or `undefined` when all pass.
 */
export function chain<T extends Record<string, unknown>>(...fns: Validator[]) {
	return (value: string, values: T): string | undefined => {
		for (const fn of fns) {
			const err = fn(value, values as Record<string, string>)

			if (err) return err
		}

		return undefined
	}
}
