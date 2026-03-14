'use client'

import { useState } from 'react'

type Validator = (value: string, values: Record<string, string>) => string | null

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

type FieldConfig = {
	validators?: Validator[]
}

type FormConfig<T extends string> = Record<T, FieldConfig>

type FormState<T extends string> = {
	values: Record<T, string>
	errors: Partial<Record<T, string>>
	touched: Partial<Record<T, boolean>>
}

function validate<T extends string>(
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

export function useForm<T extends string>(config: FormConfig<T>) {
	const fields = Object.keys(config) as T[]

	const initialValues = Object.fromEntries(fields.map((f) => [f, ''])) as Record<T, string>

	const [state, setState] = useState<FormState<T>>({
		values: initialValues,
		errors: {},
		touched: {},
	})

	function setValue(field: T, value: string) {
		setState((prev) => {
			const next = { ...prev, values: { ...prev.values, [field]: value } }

			if (prev.touched[field]) {
				next.errors = {
					...prev.errors,
					[field]: validate(fields, next.values, config)[field] ?? undefined,
				}
			}

			return next
		})
	}

	function touch(field: T) {
		setState((prev) => {
			const errors = validate(fields, prev.values, config)

			return {
				...prev,
				touched: { ...prev.touched, [field]: true },
				errors: { ...prev.errors, [field]: errors[field] ?? undefined },
			}
		})
	}

	function register(field: T) {
		return {
			value: state.values[field],
			onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(field, e.target.value),
			onBlur: () => touch(field),
		}
	}

	function submit(handler: (values: Record<T, string>) => void | Promise<void>) {
		return async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()

			const errors = validate(fields, state.values, config)

			const allTouched = Object.fromEntries(fields.map((f) => [f, true])) as Partial<
				Record<T, boolean>
			>

			setState((prev) => ({ ...prev, errors, touched: allTouched }))

			if (Object.keys(errors).length > 0) return

			await handler(state.values)
		}
	}

	const isValid = Object.keys(validate(fields, state.values, config)).length === 0

	return {
		values: state.values,
		errors: state.errors,
		register,
		submit,
		isValid,
	}
}
