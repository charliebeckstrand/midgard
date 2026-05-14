'use client'

export type Validator = (value: string, values: Record<string, string>) => string | null

export const required =
	(message = 'This field is required'): Validator =>
	(value) =>
		value.trim() ? null : message

export const email =
	(message = 'Please enter a valid email address'): Validator =>
	(value) =>
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message

export const minLength =
	(n: number, message?: string): Validator =>
	(value) =>
		value.length >= n ? null : (message ?? `Must be at least ${n} characters`)

export const matches =
	(field: string, label: string): Validator =>
	(value, values) =>
		value === values[field] ? null : `Must match ${label}`

export type FieldConfig = {
	validators?: Validator[]
}

export type FormConfig<T extends string> = Record<T, FieldConfig>

export function validate<T extends string>(
	fields: T[],
	values: Record<T, string>,
	config: FormConfig<T>,
): Partial<Record<T, string>> {
	const errors: Partial<Record<T, string>> = {}

	for (const field of fields) {
		const validators = config[field].validators ?? []

		for (const validator of validators) {
			const error = validator(values[field], values as Record<string, string>)

			if (error) {
				errors[field] = error

				break
			}
		}
	}

	return errors
}
