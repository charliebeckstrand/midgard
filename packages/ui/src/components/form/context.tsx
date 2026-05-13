'use client'

import type { ChangeEvent, FocusEvent, ReactNode } from 'react'
import { createContext } from '../../core'

export type FormStateValue = {
	values: Record<string, unknown>
	errors: Record<string, string | undefined>
	touched: Record<string, boolean>
	dirty: Record<string, boolean>
	isDirty: boolean
	isValid: boolean
	submitting: boolean
}

export type FormActions = {
	getValue: (name: string) => unknown
	setValue: (name: string, value: unknown) => void
	setErrors: (errors: Record<string, string | undefined>) => void
	setTouched: (name: string) => void
	reset: () => void
}

/** Combined shape for consumers that need both state and actions. */
export type FormContextValue = FormStateValue & FormActions

const [FormStateProvider, useFormState] = createContext<FormStateValue | undefined>('FormState', {
	default: undefined,
})

const [FormActionsProvider, useFormActions] = createContext<FormActions | undefined>(
	'FormActions',
	{ default: undefined },
)

export { useFormActions, useFormState }

/** Internal — the component-level provider wires both contexts. */
export function FormProvider({
	state,
	actions,
	children,
}: {
	state: FormStateValue
	actions: FormActions
	children: ReactNode
}) {
	return (
		<FormActionsProvider value={actions}>
			<FormStateProvider value={state}>{children}</FormStateProvider>
		</FormActionsProvider>
	)
}

/** Returns combined state + actions. Re-renders on any state change — prefer `useFormActions` if you only need actions. */
export function useFormContext(): FormContextValue | undefined {
	const state = useFormState()
	const actions = useFormActions()

	if (!state || !actions) return undefined

	return { ...state, ...actions }
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

export type FormTextBinding<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement> = {
	value: string
	onChange: (e: ChangeEvent<E>) => void
	onBlur: (e: FocusEvent<E>) => void
	invalid: boolean
}

/** Binding for string-value controls (Input, Textarea). */
export function useFormText<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>(
	name: string | undefined,
	handlers?: {
		onChange?: (e: ChangeEvent<E>) => void
		onBlur?: (e: FocusEvent<E>) => void
	},
): FormTextBinding<E> | undefined {
	const field = useFormField(name)

	if (!field) return undefined

	return {
		value: typeof field.value === 'string' ? field.value : '',
		onChange: (e) => {
			field.setValue(e.target.value)
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
	onChange: (e: ChangeEvent<HTMLInputElement>) => void
	invalid: boolean
}

/** Binding for boolean-value controls (Checkbox, Switch). */
export function useFormToggle(
	name: string | undefined,
	handlers?: { onChange?: (e: ChangeEvent<HTMLInputElement>) => void },
): FormToggleBinding | undefined {
	const field = useFormField(name)

	if (!field) return undefined

	return {
		checked: typeof field.value === 'boolean' ? field.value : false,
		onChange: (e) => {
			field.setValue(e.target.checked)
			field.setTouched()
			handlers?.onChange?.(e)
		},
		invalid: field.error !== undefined,
	}
}
