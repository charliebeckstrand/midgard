'use client'

import { createContext, useContext } from 'react'

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

const FormStateContext = createContext<FormStateValue | undefined>(undefined)

const FormActionsContext = createContext<FormActions | undefined>(undefined)

/** Internal — the component-level provider wires both contexts. */
export function FormProvider({
	state,
	actions,
	children,
}: {
	state: FormStateValue
	actions: FormActions
	children: React.ReactNode
}) {
	return (
		<FormActionsContext.Provider value={actions}>
			<FormStateContext.Provider value={state}>{children}</FormStateContext.Provider>
		</FormActionsContext.Provider>
	)
}

/** Returns combined state + actions. Re-renders on any state change — prefer `useFormActions` if you only need actions. */
export function useFormContext(): FormContextValue | undefined {
	const state = useContext(FormStateContext)
	const actions = useContext(FormActionsContext)

	if (!state || !actions) return undefined

	return { ...state, ...actions }
}

/** Form actions. Stable reference — consumers skip re-renders on field changes. */
export function useFormActions(): FormActions | undefined {
	return useContext(FormActionsContext)
}

/** Form state. Re-renders on every field change. */
export function useFormState(): FormStateValue | undefined {
	return useContext(FormStateContext)
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
