'use client'

import {
	type SyntheticEvent,
	useCallback,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { FormActions, FormStateValue, FormStore } from '../../primitives/form/context'
import { hasIssues } from '../../primitives/form/form-issues'
import { dirtyFields as deriveDirtyFields } from './engine/form-dirty'
import { formReducer } from './engine/form-reducer'
import { normalizeErrors } from './engine/form-validate'
import type {
	FormAction,
	FormState,
	FormSubmitHandler,
	SubmitOutcome,
	ValidateOn,
	Validators,
} from './engine/types'
import { useFormStore } from './use-form-store'
import { useFormSubmission } from './use-form-submission'
import { useFormSync } from './use-form-sync'

/** Options for {@link useFormReducer}. @internal */
type FormReducerOptions<T extends Record<string, unknown>> = {
	defaultValues: T
	/**
	 * Controlled re-sync source. Reference change → `values` replaced and the
	 * dirty baseline shifts; `touched`, `errors`, and `submitting` stay put.
	 * Passing `undefined` re-syncs to `defaultValues` under the same contract.
	 * Pass a stable reference; a new derived object each render loops the sync.
	 */
	values?: T
	validate?: Validators<T>
	validateOn: ValidateOn
	onSubmit?: FormSubmitHandler<T>
	onSettled?: (outcome: SubmitOutcome<T>) => void
	onInvalidSubmit?: (errors: Partial<Record<keyof T, string[]>>) => void
	onReset?: () => void
}

/** State, store, actions, and form-element handlers returned by {@link useFormReducer}. @internal */
type FormReducerResult = {
	formState: FormStateValue
	store: FormStore
	actions: FormActions
	handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
	handleReset: (event: SyntheticEvent<HTMLFormElement>) => void
	/** How many times the form has reset. */
	resets: number
	/** How many submit attempts have failed. */
	failures: number
}

/**
 * Drives the state of `Form` through the form reducer of the engine. It
 * derives `dirty` and `valid`, gives the value, touched, and error setters and
 * `reset`, and builds the submit and reset handlers. {@link useFormSubmission}
 * runs the submit, and {@link useFormSync} syncs the controlled `values` prop
 * during render.
 *
 * @returns The {@link FormReducerResult} consumed by the `Form` provider.
 * @internal
 */
export function useFormReducer<T extends Record<string, unknown>>({
	defaultValues,
	values: controlledValues,
	validate,
	validateOn,
	onSubmit,
	onSettled,
	onInvalidSubmit,
	onReset,
}: FormReducerOptions<T>): FormReducerResult {
	const initialValues = controlledValues ?? defaultValues

	const [state, dispatch] = useReducer(
		formReducer as (state: FormState<T>, action: FormAction<T>) => FormState<T>,
		undefined,
		(): FormState<T> => ({
			values: { ...initialValues },
			defaults: initialValues,
			errors: {},
			touched: {},
			external: {},
		}),
	)

	useFormSync(controlledValues, defaultValues, dispatch)

	const [submitting, setSubmitting] = useState(false)

	// Counts resets for the controls that keep state about their typed text. A
	// reset that leaves a value as it was does not change the field slice.
	const [resets, setResets] = useState(0)

	// A ref, not an effect event: the reducer runs the validators during render,
	// and an effect event throws when render calls it. Synced before paint, and
	// only the dispatching handlers read it.
	const validateRef = useRef(validate)

	useLayoutEffect(() => {
		validateRef.current = validate
	}, [validate])

	// A stable event, so `reset` and `actions` keep one identity when the
	// consumer gives a new `onReset` on each render.
	const reportReset = useStableEvent(() => onReset?.())

	const { values, defaults, errors, touched } = state

	const dirtyFields = useMemo(() => deriveDirtyFields(values, defaults), [values, defaults])

	const dirty = useMemo(() => Object.values(dirtyFields).some(Boolean), [dirtyFields])

	// Derived from the live `errors` map, which includes server / external errors
	// from `setErrors` or an `onSubmit` `{ fieldErrors }` return. The reducer
	// keeps `errors` current per `validateOn`; this reads it directly rather
	// than re-running validators.
	const valid = useMemo(() => !Object.values(errors).some(hasIssues), [errors])

	const formState = useMemo<FormStateValue>(
		() => ({
			values,
			errors,
			touchedFields: touched,
			dirtyFields,
			dirty,
			valid,
			submitting,
		}),
		[values, errors, touched, dirtyFields, dirty, valid, submitting],
	)

	// Made before the callbacks, so that `getValue` and `handleSubmit` read the
	// committed values from it.
	const store = useFormStore(formState)

	const getValue = useCallback((name: string) => store.getState().values[name], [store])

	const setValue = useCallback(
		(name: string, value: unknown) => {
			dispatch({ type: 'set-value', name, value, validate: validateRef.current, validateOn })
		},
		[validateOn],
	)

	const setTouched = useCallback(
		(name: string) => {
			dispatch({ type: 'set-touched', name, validate: validateRef.current, validateOn })
		},
		[validateOn],
	)

	const setErrors = useCallback((fieldErrors: Record<string, string | string[] | undefined>) => {
		dispatch({ type: 'set-errors-external', errors: normalizeErrors(fieldErrors) })
	}, [])

	// Resets the store only, and leaves an in-flight submit live.
	const resetForm = useCallback(
		(nextDefaults?: Record<string, unknown>) => {
			// No `nextDefaults` resets to the defaults the reducer holds.
			dispatch({ type: 'reset', defaults: nextDefaults as T | undefined })

			setResets((count) => count + 1)

			reportReset()
		},
		[reportReset],
	)

	const { handleSubmit, supersede, failures } = useFormSubmission({
		store,
		dispatch,
		validateRef,
		validateOn,
		setSubmitting,
		setErrors,
		resetForm,
		onSubmit,
		onSettled,
		onInvalidSubmit,
	})

	// The outside reset: the actions and the reset button. It supersedes any
	// in-flight submit. Typed wider than `T`; `FormActions.reset` carries no `T`
	// at the context level. `FormHelpers<T>` re-narrows at the consumer via
	// contravariance.
	const reset = useCallback(
		(nextDefaults?: Record<string, unknown>) => {
			supersede()

			resetForm(nextDefaults)
		},
		[supersede, resetForm],
	)

	const handleReset = useCallback(
		(event: SyntheticEvent<HTMLFormElement>) => {
			event.preventDefault()

			reset()
		},
		[reset],
	)

	const actions = useMemo<FormActions>(
		() => ({ getValue, setValue, setErrors, setTouched, reset }),
		[getValue, setValue, setErrors, setTouched, reset],
	)

	return { formState, store, actions, handleSubmit, handleReset, resets, failures }
}
