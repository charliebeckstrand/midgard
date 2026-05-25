'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'

export type FormStateValue = {
	values: Record<string, unknown>
	errors: Record<string, string[] | undefined>
	touched: Record<string, boolean>
	dirty: Record<string, boolean>
	isDirty: boolean
	isValid: boolean
	submitting: boolean
}

export type FormActions = {
	getValue: (name: string) => unknown
	setValue: (name: string, value: unknown) => void
	setErrors: (errors: Record<string, string | string[] | undefined>) => void
	setTouched: (name: string) => void
	reset: (nextDefaults?: Record<string, unknown>) => void
}

/** Combined shape for consumers that need both state and actions. */
export type FormContextValue = FormStateValue & FormActions

const [FormStateContext, useFormState] = createContext<FormStateValue | undefined>('FormState', {
	default: undefined,
})

const [FormActionsContext, useFormActions] = createContext<FormActions | undefined>('FormActions', {
	default: undefined,
})

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
		<FormActionsContext value={actions}>
			<FormStateContext value={state}>{children}</FormStateContext>
		</FormActionsContext>
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
	errors: string[] | undefined
	touched: boolean
	dirty: boolean
}

/** Returns form-bound state for a named field, or undefined if not inside a Form or name is absent. */
export function useFormField(name: string | undefined): FormFieldState | undefined {
	const context = useFormContext()

	if (!name || !context) return undefined

	return {
		value: context.getValue(name),
		setValue: (v) => context.setValue(name, v),
		setTouched: () => context.setTouched(name),
		errors: context.errors[name],
		touched: context.touched[name] ?? false,
		dirty: context.dirty[name] ?? false,
	}
}

export type FormStatus = {
	submitting: boolean
	dirty: boolean
	valid: boolean
}

/** Returns form-level status, or undefined outside a Form. */
export function useFormStatus(): FormStatus | undefined {
	const context = useFormContext()

	if (!context) return undefined

	return {
		submitting: context.submitting,
		dirty: context.isDirty,
		valid: context.isValid,
	}
}
