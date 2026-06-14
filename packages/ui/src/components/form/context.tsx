'use client'

import { type ReactNode, useCallback, useRef, useSyncExternalStore } from 'react'
import { createContext } from '../../core'

/** Snapshot of a form's reactive state: field values, per-field errors/touched/dirty maps, and the derived `dirty`/`valid`/`submitting` flags. */
export type FormStateValue = {
	values: Record<string, unknown>
	errors: Record<string, string[] | undefined>
	touchedFields: Record<string, boolean>
	dirtyFields: Record<string, boolean>
	dirty: boolean
	valid: boolean
	submitting: boolean
}

/** Imperative form mutators. Stable across renders, so reading them never forces a re-render. */
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
 * {@link useFormStore}; provided through `FormStoreContext`.
 *
 * @internal
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

/**
 * Returns the enclosing form's {@link FormActions} (imperative mutators), or
 * undefined outside a `Form`. The actions object is referentially stable, so
 * subscribing to it never triggers a re-render — the preferred way to mutate a
 * form without reading its state.
 *
 * @see {@link useFormField} for per-field value/error subscription.
 * @see {@link useFormContext} for state and actions together.
 */
export { useFormActions }

const noopSubscribe = () => () => {}

/**
 * Wires the form store and actions into context for descendant field hooks.
 *
 * @internal
 */
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
 * Subscribes to the entire form state via the external store.
 *
 * @returns The current {@link FormStateValue}, or undefined outside a `Form`.
 * @remarks Re-renders on ANY state change. Prefer {@link useFormField}
 * (per-field) or {@link useFormStatus} (form-level booleans) to subscribe to a
 * narrower slice. SSR-safe: server and initial-client snapshots match.
 */
export function useFormState(): FormStateValue | undefined {
	const store = useFormStoreContext()

	return useSyncExternalStore(
		store?.subscribe ?? noopSubscribe,
		() => store?.getState(),
		() => store?.getServerState(),
	)
}

/** Shallow element-wise equality for two issue lists; gates the {@link useFormField} slice cache. @internal */
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

/** One field's slice of form state plus its bound `setValue`/`setTouched` mutators. */
export type FormFieldState = {
	value: unknown
	setValue: (value: unknown) => void
	setTouched: () => void
	errors: string[] | undefined
	touched: boolean
	dirty: boolean
}

/**
 * Subscribes to a single named field's slice (value, errors, touched, dirty)
 * and returns it alongside bound mutators.
 *
 * @param name - Field key to track; pass undefined to opt out (returns undefined).
 * @returns The field's {@link FormFieldState}, or undefined when `name` is
 * absent or there is no enclosing `Form`.
 * @remarks Re-renders only when this field's slice changes by content — the
 * snapshot is cached and returned by reference when unchanged, so typing in one
 * field does not re-render its siblings. Used by the binding hooks
 * ({@link useFormText}, {@link useFormToggle}, {@link useFormValue}).
 */
export function useFormField(name: string | undefined): FormFieldState | undefined {
	const store = useFormStoreContext()
	const actions = useFormActions()

	// Caches the last slice by content; an unchanged field returns a stable
	// reference across snapshots.
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

/** The three form-level booleans: whether a submit is in flight, whether any field diverges from its baseline, and whether the error map is empty. */
export type FormStatus = {
	submitting: boolean
	dirty: boolean
	valid: boolean
}

/**
 * Subscribes to the form's derived `submitting`/`dirty`/`valid` flags without
 * pulling in field-level state.
 *
 * @returns The current {@link FormStatus}, or undefined outside a `Form`.
 * @remarks Re-renders only when one of the three flags flips — the snapshot is
 * cached and returned by reference while they hold, so per-keystroke value
 * changes do not re-render status consumers (submit buttons, dirty guards).
 * SSR-safe.
 * @see {@link useFormField} for per-field subscription.
 * @see {@link useFormActions} for the imperative mutators.
 */
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

/**
 * Returns the enclosing form's full state merged with its actions.
 *
 * @returns A {@link FormContextValue} (state + mutators), or undefined outside
 * a `Form`.
 * @remarks Re-renders on ANY state change since it composes {@link useFormState}.
 * Prefer the narrower {@link useFormActions} (no re-render),
 * {@link useFormField} (per-field), or {@link useFormStatus} (form-level flags)
 * unless a consumer genuinely needs everything.
 */
export function useFormContext(): FormContextValue | undefined {
	const state = useFormState()
	const actions = useFormActions()

	if (!state || !actions) return undefined

	return { ...state, ...actions }
}
