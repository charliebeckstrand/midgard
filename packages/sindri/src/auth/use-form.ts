'use client'

import { useState } from 'react'

import { type FormConfig, validate } from './use-form-validation'

type FormState<T extends string> = {
	values: Record<T, string>
	errors: Partial<Record<T, string>>
	touched: Partial<Record<T, boolean>>
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
