'use client'

import { createContext, useContext } from 'react'

export type FormContextValue = {
	values: Record<string, unknown>
	getValue: (name: string) => unknown
	setValue: (name: string, value: unknown) => void
	errors: Record<string, string | undefined>
	setErrors: (errors: Record<string, string | undefined>) => void
	touched: Record<string, boolean>
	setTouched: (name: string) => void
	dirty: Record<string, boolean>
	isDirty: boolean
	isValid: boolean
	submitting: boolean
	reset: () => void
}

const FormContext = createContext<FormContextValue | undefined>(undefined)

export const FormProvider = FormContext.Provider

/** Returns the nearest Form context, or undefined outside a Form. */
export function useFormContext(): FormContextValue | undefined {
	return useContext(FormContext)
}

export type FormFieldState = {
	value: unknown
	setValue: (value: unknown) => void
	setTouched: () => void
	error: string | undefined
	touched: boolean
	dirty: boolean
}

/** Returns form-bound state for a named field, or undefined if not inside a Form or name is absent. */
export function useFormField(name: string | undefined): FormFieldState | undefined {
	const ctx = useFormContext()

	if (!name || !ctx) return undefined

	return {
		value: ctx.getValue(name),
		setValue: (v) => ctx.setValue(name, v),
		setTouched: () => ctx.setTouched(name),
		error: ctx.errors[name],
		touched: ctx.touched[name] ?? false,
		dirty: ctx.dirty[name] ?? false,
	}
}

export type FormStatus = {
	submitting: boolean
	isDirty: boolean
	isValid: boolean
}

/** Returns form-level status, or undefined outside a Form. */
export function useFormStatus(): FormStatus | undefined {
	const ctx = useFormContext()

	if (!ctx) return undefined

	return {
		submitting: ctx.submitting,
		isDirty: ctx.isDirty,
		isValid: ctx.isValid,
	}
}

// ---------------------------------------------------------------------------
// Binding hooks — thin wrappers that return props ready to spread onto
// native elements. Each control type extracts values differently, so we
// provide one hook per shape rather than a single polymorphic hook.
// ---------------------------------------------------------------------------

export type FormTextBinding<E extends HTMLElement = HTMLElement> = {
	value: string
	onChange: (e: React.ChangeEvent<E>) => void
	onBlur: (e: React.FocusEvent<E>) => void
	invalid: boolean
}

/** Binding for string-value controls (Input, Textarea). */
export function useFormText<E extends HTMLElement = HTMLElement>(
	name: string | undefined,
	handlers?: {
		onChange?: (e: React.ChangeEvent<E>) => void
		onBlur?: (e: React.FocusEvent<E>) => void
	},
): FormTextBinding<E> | undefined {
	const field = useFormField(name)

	if (!field) return undefined

	return {
		value: (field.value as string) ?? '',
		onChange: (e) => {
			field.setValue((e.target as unknown as HTMLInputElement).value)
			handlers?.onChange?.(e)
		},
		onBlur: (e) => {
			field.setTouched()
			handlers?.onBlur?.(e)
		},
		invalid: field.error !== undefined,
	}
}

export type FormToggleBinding = {
	checked: boolean
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	invalid: boolean
}

/** Binding for boolean-value controls (Checkbox, Switch). */
export function useFormToggle(
	name: string | undefined,
	handlers?: { onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void },
): FormToggleBinding | undefined {
	const field = useFormField(name)

	if (!field) return undefined

	return {
		checked: (field.value as boolean) ?? false,
		onChange: (e) => {
			field.setValue(e.target.checked)
			field.setTouched()
			handlers?.onChange?.(e)
		},
		invalid: field.error !== undefined,
	}
}
