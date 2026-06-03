'use client'

import { type ReactNode, useCallback, useRef, useSyncExternalStore } from 'react'
import { createContext } from '../../core'

export type FormStateValue = {
	values: Record<string, unknown>
	errors: Record<string, string[] | undefined>
	touchedFields: Record<string, boolean>
	dirtyFields: Record<string, boolean>
	dirty: boolean
	valid: boolean
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

/**
 * External-store interface over the reducer's `formState`. Lets fields
 * subscribe to a single slice instead of the whole state. Built in
 * `useFormStore`; provided through `FormStoreContext`.
 */
export type FormStore = {
	subscribe: (listener: () => void) => () => void
	getState: () => FormStateValue
	getServerState: () => FormStateValue
}

const [FormStoreContext, useFormStoreContext] = createContext<FormStore | undefined>('FormStore', {
	default: undefined,
})

const [FormActionsContext, useFormActions] = createContext<FormActions | undefined>('FormActions', {
	default: undefined,
})

export { useFormActions }

const noopSubscribe = () => () => {}

/** Internal — the component-level provider wires the store and actions. */
export function FormProvider({
	store,
	actions,
	children,
}: {
	store: FormStore
	actions: FormActions
	children: ReactNode
}) {
	return (
		<FormActionsContext value={actions}>
			<FormStoreContext value={store}>{children}</FormStoreContext>
		</FormActionsContext>
	)
}

/**
 * Whole form state. Re-renders on ANY state change — prefer `useFormField`
 * (per-field) or `useFormStatus` (form-level booleans) for slices.
 */
export function useFormState(): FormStateValue | undefined {
	const store = useFormStoreContext()

	return useSyncExternalStore(
		store?.subscribe ?? noopSubscribe,
		() => store?.getState(),
		() => store?.getServerState(),
	)
}

function errorsEqual(a: string[] | undefined, b: string[] | undefined): boolean {
	if (a === b) return true

	if (a === undefined || b === undefined) return false

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

type FieldSlice = {
	value: unknown
	errors: string[] | undefined
	touched: boolean
	dirty: boolean
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
	const store = useFormStoreContext()
	const actions = useFormActions()

	// Cache the last slice so an unchanged field keeps a stable snapshot even
	// when an unrelated field's keystroke rebuilds its error array (validateOn
	// 'change' re-runs every validator) — compared by content, not identity.
	const cacheRef = useRef<FieldSlice | null>(null)

	const select = useCallback(
		(state: FormStateValue | undefined): FieldSlice | null => {
			if (!name || !state) return null

			const next: FieldSlice = {
				value: state.values[name],
				errors: state.errors[name],
				touched: state.touchedFields[name] ?? false,
				dirty: state.dirtyFields[name] ?? false,
			}

			const prev = cacheRef.current

			if (
				prev &&
				prev.value === next.value &&
				prev.touched === next.touched &&
				prev.dirty === next.dirty &&
				errorsEqual(prev.errors, next.errors)
			) {
				return prev
			}

			cacheRef.current = next

			return next
		},
		[name],
	)

	const slice = useSyncExternalStore(
		store?.subscribe ?? noopSubscribe,
		() => select(store?.getState()),
		() => select(store?.getServerState()),
	)

	const setValue = useCallback(
		(value: unknown) => {
			if (name) actions?.setValue(name, value)
		},
		[actions, name],
	)

	const setTouched = useCallback(() => {
		if (name) actions?.setTouched(name)
	}, [actions, name])

	if (!name || !slice || !actions) return undefined

	return {
		value: slice.value,
		errors: slice.errors,
		touched: slice.touched,
		dirty: slice.dirty,
		setValue,
		setTouched,
	}
}

export type FormStatus = {
	submitting: boolean
	dirty: boolean
	valid: boolean
}

/** Returns form-level status, or undefined outside a Form. Re-renders only when a status flag flips. */
export function useFormStatus(): FormStatus | undefined {
	const store = useFormStoreContext()

	const cacheRef = useRef<FormStatus | null>(null)

	const select = useCallback((state: FormStateValue | undefined): FormStatus | null => {
		if (!state) return null

		const next: FormStatus = {
			submitting: state.submitting,
			dirty: state.dirty,
			valid: state.valid,
		}

		const prev = cacheRef.current

		if (
			prev &&
			prev.submitting === next.submitting &&
			prev.dirty === next.dirty &&
			prev.valid === next.valid
		) {
			return prev
		}

		cacheRef.current = next

		return next
	}, [])

	const slice = useSyncExternalStore(
		store?.subscribe ?? noopSubscribe,
		() => select(store?.getState()),
		() => select(store?.getServerState()),
	)

	return slice ?? undefined
}

/** Returns combined state + actions. Re-renders on any state change — prefer `useFormActions`/`useFormField`/`useFormStatus`. */
export function useFormContext(): FormContextValue | undefined {
	const state = useFormState()
	const actions = useFormActions()

	if (!state || !actions) return undefined

	return { ...state, ...actions }
}
