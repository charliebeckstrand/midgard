'use client'

import {
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { createContext } from '../../core'
import { noopSubscribe, sameElements } from '../../utilities'
import { createFormFieldTargets, type FormFieldTargets } from './form-field-targets'

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

const [FormResetContext, useFormResetContext] = createContext<number>('FormReset', { default: 0 })

/**
 * Returns how many times the enclosing form has reset: by a reset button, or by
 * `reset` from the actions or the submit helpers.
 *
 * @returns The reset count, or `0` outside a `Form`.
 * @remarks A reset that leaves a field's value as it was does not change the
 * field slice. A control that keeps its own state about the typed text (a
 * partial entry, a typed verdict) reads this count to drop that state.
 * @internal
 */
export function useFormResets(): number {
	return useFormResetContext()
}

const [FormFailureContext, useFormFailureContext] = createContext<number>('FormFailure', {
	default: 0,
})

/**
 * Returns how many submit attempts of the enclosing form have failed. A
 * refused submit fails, and so does a handler that returns a field issue.
 *
 * @returns The failure count, or `0` outside a `Form`.
 * @remarks The count goes up for each failure, and a reset does not set it back.
 * A part that answers a failure, such as `FormErrorSummary`, compares the count
 * with the count that it saw last.
 * @internal
 */
export function useFormFailures(): number {
	return useFormFailureContext()
}

const [FormFieldTargetsContext, useFormFieldTargetsContext] = createContext<
	FormFieldTargets | undefined
>('FormFieldTargets', { default: undefined })

/**
 * Wires the form store and actions into context for descendant field hooks.
 * It also holds the registry of the control ids of the fields.
 *
 * @internal
 */
export function FormProvider({
	store,
	actions,
	resets,
	failures = 0,
	children,
}: {
	store: FormStore
	actions: FormActions
	resets: number
	/** How many submit attempts have failed. A provider with no submit leaves it at `0`. */
	failures?: number
	children: ReactNode
}) {
	const [targets] = useState(createFormFieldTargets)

	return (
		<FormActionsContext value={actions}>
			<FormStoreContext value={store}>
				<FormResetContext value={resets}>
					<FormFailureContext value={failures}>
						<FormFieldTargetsContext value={targets}>{children}</FormFieldTargetsContext>
					</FormFailureContext>
				</FormResetContext>
			</FormStoreContext>
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
 * @remarks Re-renders only when this field's slice changes by content. The
 * snapshot is cached and returned by reference when unchanged, so typing in one
 * field does not re-render its siblings. Used by the binding hooks
 * (`useInputValue`, {@link useFormToggle}, {@link useFormValue}).
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
				sameElements(prev.errors, next.errors)
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
 * @remarks Re-renders only when one of the three flags flips. The snapshot is
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

// The error map of no form. One object, so the snapshot keeps its identity.
const NO_ERRORS: FormStateValue['errors'] = {}

/**
 * Subscribes to the error map of the enclosing form.
 *
 * @returns The error map, or an empty map outside a `Form`.
 * @remarks A keystroke that runs no validator keeps the map, so the caller does
 * not render again. A validation run gives a new map.
 * @internal
 */
export function useFormErrors(): FormStateValue['errors'] {
	const store = useFormStoreContext()

	return useSyncExternalStore(
		store?.subscribe ?? noopSubscribe,
		() => store?.getState().errors ?? NO_ERRORS,
		() => store?.getServerState().errors ?? NO_ERRORS,
	)
}

/**
 * Registers the control id of a field with the enclosing form, so that a
 * `FormErrorSummary` can move the focus to the control.
 *
 * @param name - The field name. Pass `undefined` to register nothing.
 * @param id - The id of the control. Pass `undefined` to register nothing.
 * @remarks A form-bound `Message` calls it with the id of its control. The
 * registration ends when the caller unmounts or when an argument changes.
 * @internal
 */
export function useFormFieldTarget(name: string | undefined, id: string | undefined): void {
	const targets = useFormFieldTargetsContext()

	useLayoutEffect(() => {
		if (!targets || !name || !id) return

		return targets.register(name, id)
	}, [targets, name, id])
}

// The registry of no form. One object, so the snapshot keeps its identity.
const NO_TARGETS: Readonly<Record<string, string>> = {}

/**
 * Subscribes to the control ids that the fields of the enclosing form registered.
 *
 * @returns The control id of each registered field, by field name.
 * @internal
 */
export function useFormFieldTargets(): Readonly<Record<string, string>> {
	const targets = useFormFieldTargetsContext()

	return useSyncExternalStore(
		targets?.subscribe ?? noopSubscribe,
		() => targets?.getSnapshot() ?? NO_TARGETS,
		() => NO_TARGETS,
	)
}
