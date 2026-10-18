import { defineMessages, type IntlShape, type MessageSet } from 'ui/primitives/intl'

/** The values of each validation message, by key. @internal */
type Values = {
	required: Record<never, never>
	email: Record<never, never>
	minLength: { min: number }
	passwordMismatch: Record<never, never>
}

/**
 * The messages of the field validators, in the language of the reader. A form
 * gives {@link matches} the `passwordMismatch` message, because the message
 * names the field that the value must match.
 *
 * @internal
 */
export const validationMessages: MessageSet<Values> = defineMessages<Values>({
	required: {
		id: 'shared.validation.required',
		defaultMessage: 'This field is required',
		description: 'The error of a form field that the reader left empty.',
	},
	email: {
		id: 'shared.validation.email',
		defaultMessage: 'Please enter a valid email address',
		description: 'The error of an email field that does not hold an email address.',
	},
	minLength: {
		id: 'shared.validation.minLength',
		defaultMessage:
			'{min, plural, one {Must be at least # character} other {Must be at least # characters}}',
		description: 'The error of a field that is too short. The min is the shortest length.',
	},
	passwordMismatch: {
		id: 'shared.validation.passwordMismatch',
		defaultMessage: 'Must match password',
		description: 'The error of the field that repeats the password, when the two differ.',
	},
})

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
 * @param intl - Formats the default message in the language of the reader.
 * @param message - Error message on failure. Defaults to `'This field is required'`, in the language of the reader.
 */
export const required =
	(intl: IntlShape, message?: string): Validator =>
	(value) =>
		value.trim() ? null : (message ?? intl.formatMessage(validationMessages.required))

/**
 * Validator factory: fails when the value isn't a plausible email address.
 *
 * @internal
 * @param intl - Formats the default message in the language of the reader.
 * @param message - Error message on failure. Defaults to `'Please enter a valid email address'`, in the language of the reader.
 */
export const email =
	(intl: IntlShape, message?: string): Validator =>
	(value) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
			? null
			: (message ?? intl.formatMessage(validationMessages.email))

/**
 * Validator factory: fails when the value is shorter than `min` characters.
 *
 * @internal
 * @param intl - Formats the default message in the language of the reader.
 * @param min - Minimum length, inclusive.
 * @param message - Error message on failure. Defaults to `` `Must be at least ${min} characters` ``, in the language of the reader.
 */
export const minLength =
	(intl: IntlShape, min: number, message?: string): Validator =>
	(value) =>
		value.length >= min
			? null
			: (message ?? intl.formatMessage(validationMessages.minLength, { min }))

/**
 * Validator factory: fails when the value differs from another field's value.
 *
 * @internal
 * @param field - Name of the sibling field to compare against (such as `password`).
 * @param message - Error message on failure, such as the formatted `passwordMismatch` of {@link validationMessages}.
 */
export const matches =
	(field: string, message: string): Validator =>
	(value, values) =>
		value === values[field] ? null : message

/**
 * Composes validators into one, returning the first error or `undefined`.
 *
 * @internal
 * @remarks
 * Adapts the {@link Validator} contract (`string | null`) to the form library's
 * field-validator shape (`string | undefined`).
 * @param validators - Validators run in order; evaluation stops at the first failure.
 * @returns A validator that yields the first error message, or `undefined` when all pass.
 */
export function chain<T extends Record<string, unknown>>(...validators: Validator[]) {
	return (value: string, values: T): string | undefined => {
		for (const validator of validators) {
			const error = validator(value, values as Record<string, string>)

			if (error) return error
		}

		return undefined
	}
}
