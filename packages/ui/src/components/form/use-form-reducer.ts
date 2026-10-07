'use client'

import {
	type SyntheticEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { flushSync } from 'react-dom'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { FormActions, FormStateValue, FormStore } from './context'
import {
	type Errors,
	type FormAction,
	type FormState,
	formReducer,
	hasIssues,
	normalizeIssues,
	runValidators,
	type Touched,
	type ValidateOn,
	type Validators,
	valuesEqual,
} from './form-reducer'
import { useFormStore } from './use-form-store'

/**
 * Optional shape returned from `onSubmit` to surface server-side validation
 * issues without round-tripping through `helpers.setErrors`.
 */
export type SubmitResult<T> = {
	fieldErrors?: Partial<Record<keyof T, string | string[] | undefined>>
}

/**
 * Terminal outcome of one submit attempt, delivered to `onSettled`. Client
 * validation failures and `{ fieldErrors }` returns are mid-flow and do not
 * fire `onSettled`.
 */
export type SubmitOutcome<T> = { ok: true; values: T } | { ok: false; error: Error }

/** Second argument to a {@link FormSubmitHandler}: imperatively set field errors (e.g. from a server response) or reset the form, optionally to new defaults. */
export type FormHelpers<T> = {
	setErrors: (errors: Partial<Record<keyof T, string | string[]>>) => void
	reset: (nextDefaults?: T) => void
}

/**
 * Return nothing (or `Promise<void>`) for success. Optionally return a
 * `SubmitResult<T>`, sync or async, to surface server-side validation
 * issues without going through `helpers.setErrors`. Throw or reject to
 * trigger `onSettled({ ok: false, error })`. Annotate the return as
 * `satisfies SubmitResult<T>` for autocomplete on the shape.
 */
export type FormSubmitHandler<T> = (values: T, helpers: FormHelpers<T>) => unknown

/** Narrows the loosely-typed handler return to a `fieldErrors` shape, if present. @internal */
function extractFieldErrors(
	raw: unknown,
): Record<string, string | string[] | undefined> | undefined {
	if (raw === null || typeof raw !== 'object') return undefined

	if (!('fieldErrors' in raw)) return undefined

	const fieldErrors = (raw as { fieldErrors?: unknown }).fieldErrors

	if (fieldErrors === null || typeof fieldErrors !== 'object') return undefined

	return fieldErrors as Record<string, string | string[] | undefined>
}

/**
 * Runs `submit`, then `done` whether `submit` resolves or throws. Kept outside
 * the hook: the React Compiler does not support a `finally` block.
 *
 * @internal
 */
async function settleSubmit(submit: () => Promise<void>, done: () => void): Promise<void> {
	try {
		await submit()
	} finally {
		done()
	}
}

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
}

/**
 * Drives {@link Form}'s state via {@link formReducer}: derives `dirty`/`valid`,
 * exposes value/touched/error setters and `reset`, and builds the submit and
 * reset handlers. Submits validate every field, run `onSubmit`, and route a
 * `{ fieldErrors }` return back into the error map or settle through
 * `onSettled`. A monotonic token discards superseded in-flight submits. Syncs
 * the controlled `values` prop before paint and re-anchors the dirty baseline.
 *
 * @returns The {@link FormReducerResult} consumed by the `Form` provider.
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
		}),
	)

	const [submitting, setSubmitting] = useState(false)

	// Counts resets for the controls that keep state about their typed text. A
	// reset that leaves a value as it was does not change the field slice.
	const [resets, setResets] = useState(0)

	// Mount-time snapshot of `defaultValues`; restores the original baseline
	// when `controlledValues` transitions to `undefined`. The reducer's
	// `defaults` shift on each sync and cannot serve this role.
	const initialDefaultsRef = useRef(defaultValues)

	// A ref, not an effect event: the reducer runs the validators during render,
	// and an effect event throws when render calls it. Synced before paint, and
	// only the dispatching handlers read it.
	const validateRef = useRef(validate)

	useLayoutEffect(() => {
		validateRef.current = validate
	}, [validate])

	const reportSettled = useStableEvent((outcome: SubmitOutcome<T>) => onSettled?.(outcome))

	// A stable event, so `reset` and `actions` keep one identity when the
	// consumer gives a new `onReset` on each render.
	const reportReset = useStableEvent(() => onReset?.())

	// The payload is built only when a callback reads it.
	const reportInvalid = useStableEvent((errors: Errors) => {
		if (!onInvalidSubmit) return

		onInvalidSubmit(
			Object.fromEntries(
				Object.entries(errors).filter(([, issues]) => hasIssues(issues)),
			) as Partial<Record<keyof T, string[]>>,
		)
	})

	// Monotonic token identifying the current submit. Reset, unmount, and newer
	// submits bump it; an in-flight handler compares against it to detect
	// supersession before writing errors or clearing state.
	const submitTokenRef = useRef(0)

	useEffect(() => () => void submitTokenRef.current++, [])

	const { values, defaults, errors, touched } = state

	// Mirrors the committed values; `getValue` reads the latest state without
	// changing actions object identity across re-renders. Synced before paint.
	const valuesRef = useRef(values)

	useLayoutEffect(() => {
		valuesRef.current = values
	}, [values])

	const dirtyFields = useMemo(() => {
		const d: Record<string, boolean> = {}

		for (const key in values) {
			d[key] = !valuesEqual(values[key], defaults[key])
		}

		return d
	}, [values, defaults])

	const dirty = useMemo(() => Object.values(dirtyFields).some(Boolean), [dirtyFields])

	// Derived from the live `errors` map, which includes server / external errors
	// from `setErrors` or an `onSubmit` `{ fieldErrors }` return. The reducer
	// keeps `errors` current per `validateOn`; this reads it directly rather
	// than re-running validators.
	const valid = useMemo(() => !Object.values(errors).some(hasIssues), [errors])

	const getValue = useCallback((name: string) => valuesRef.current[name as keyof T], [])

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

	const setErrorsExternal = useCallback((errs: Record<string, string | string[] | undefined>) => {
		const normalized: Errors = {}

		for (const key in errs) normalized[key] = normalizeIssues(errs[key])

		dispatch({ type: 'set-errors-external', errors: normalized })
	}, [])

	const reset = useCallback(
		// Typed wider than `T`; `FormActions.reset` carries no `T` at the context
		// level. `FormHelpers<T>` re-narrows at the consumer via contravariance.
		(nextDefaults?: Record<string, unknown>) => {
			// Supersede any in-flight submit and clear `submitting` state.
			submitTokenRef.current++

			setSubmitting(false)

			// No `nextDefaults` resets to the defaults the reducer holds.
			dispatch({ type: 'reset', defaults: nextDefaults as T | undefined })

			setResets((count) => count + 1)

			reportReset()
		},
		[reportReset],
	)

	// Tracks the controlled `values` prop. Reference change → replace `values`
	// and shift the dirty baseline; `touched`/`errors`/`submitting` persist.
	// Transitioning to `undefined` re-syncs to the mount-time `defaultValues`.
	// Use `reset(nextDefaults)` to also clear touched and errors.
	const lastSyncedValuesRef = useRef(controlledValues)

	// Runs before paint (layout effect, not a passive side effect); a
	// controlled-value change lands before the next frame renders.
	useLayoutEffect(() => {
		if (controlledValues === lastSyncedValuesRef.current) return

		const next = controlledValues ?? initialDefaultsRef.current

		lastSyncedValuesRef.current = controlledValues

		dispatch({ type: 'sync-values', values: next })
	}, [controlledValues])

	const handleSubmit = useCallback(
		async (event: SyntheticEvent<HTMLFormElement>) => {
			event.preventDefault()

			const current = valuesRef.current

			const allTouched: Touched = {}

			for (const key in current) allTouched[key] = true

			const v = validateRef.current

			const submitErrors = v
				? runValidators(v, current, allTouched, validateOn, Object.keys(v))
				: {}

			const refused = Object.values(submitErrors).some(hasIssues)

			// Flushed on the refused path so the report lands after the commit that
			// marks the fields. The documented use is to scroll to the first error,
			// and on the FIRST refused submit nothing carries `aria-invalid` until
			// this dispatch paints — so a consumer querying for one inside the
			// callback would find nothing, on exactly the attempt that needed it.
			// Only the refusal pays the synchronous render.
			if (refused)
				flushSync(() =>
					dispatch({ type: 'submit-validate', touched: allTouched, errors: submitErrors }),
				)
			else dispatch({ type: 'submit-validate', touched: allTouched, errors: submitErrors })

			// A refused submit returns here and never reaches `onSubmit`, so no
			// other callback fires. Without this report the caller cannot tell a
			// refused submit from a submit that never happened. The scan short-
			// circuits and the payload is built only on the path that needs it, so a
			// valid submit walks no further than the first clean field.
			if (refused) {
				reportInvalid(submitErrors)

				return
			}

			if (!onSubmit) return

			const token = ++submitTokenRef.current

			setSubmitting(true)

			// Superseded by a reset, unmount, or newer submit; discard the result.
			const applyOutcome = (raw: unknown) => {
				if (submitTokenRef.current !== token) return

				const fieldErrors = extractFieldErrors(raw)

				// Field errors: mid-flow, not a terminal outcome; does not fire `onSettled`.
				if (fieldErrors) setErrorsExternal(fieldErrors)
				else reportSettled({ ok: true, values: valuesRef.current })
			}

			const applyError = (err: unknown) => {
				if (submitTokenRef.current !== token) return

				reportSettled({
					ok: false,
					error: err instanceof Error ? err : new Error(String(err)),
				})
			}

			await settleSubmit(
				async () => {
					try {
						applyOutcome(await onSubmit(valuesRef.current, { setErrors: setErrorsExternal, reset }))
					} catch (err) {
						applyError(err)
					}
				},
				() => {
					// Clear `submitting` only for the un-superseded submit.
					if (submitTokenRef.current === token) setSubmitting(false)
				},
			)
		},
		[onSubmit, setErrorsExternal, reset, validateOn, reportInvalid, reportSettled],
	)

	const handleReset = useCallback(
		(event: SyntheticEvent<HTMLFormElement>) => {
			event.preventDefault()

			reset()
		},
		[reset],
	)

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

	const actions = useMemo<FormActions>(
		() => ({
			getValue,
			setValue,
			setErrors: setErrorsExternal,
			setTouched,
			reset,
		}),
		[getValue, setValue, setErrorsExternal, setTouched, reset],
	)

	const store = useFormStore(formState)

	return { formState, store, actions, handleSubmit, handleReset, resets }
}
