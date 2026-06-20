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

export function chain<T extends Record<string, unknown>>(...fns: Validator[]) {
	return (value: string, values: T): string | undefined => {
		for (const fn of fns) {
			const err = fn(value, values as Record<string, string>)

			if (err) return err
		}

		return undefined
	}
}
