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
import type { FormActions, FormStateValue, FormStore } from './context'
import {
	type Errors,
	type FormAction,
	type FormState,
	formReducer,
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
 * validation failures and `{ fieldErrors }` returns are mid-flow (the user
 * will fix and retry) and do not fire `onSettled`.
 */
export type SubmitOutcome<T> = { ok: true; values: T } | { ok: false; error: Error }

export type FormHelpers<T> = {
	setErrors: (errors: Partial<Record<keyof T, string | string[]>>) => void
	reset: (nextDefaults?: T) => void
}

/**
 * Return nothing (or `Promise<void>`) for success; optionally return a
 * `SubmitResult<T>` — sync or async — to surface server-side validation
 * issues without going through `helpers.setErrors`. Throw or reject to
 * trigger `onSettled({ ok: false, error })`. Annotate the return as
 * `satisfies SubmitResult<T>` for autocomplete on the shape.
 */
export type FormSubmitHandler<T> = (values: T, helpers: FormHelpers<T>) => unknown

/** Narrows the loosely-typed handler return to a `fieldErrors` shape, if present. */
function extractFieldErrors(
	raw: unknown,
): Record<string, string | string[] | undefined> | undefined {
	if (raw === null || typeof raw !== 'object') return undefined

	if (!('fieldErrors' in raw)) return undefined

	const fieldErrors = (raw as { fieldErrors?: unknown }).fieldErrors

	if (fieldErrors === null || typeof fieldErrors !== 'object') return undefined

	return fieldErrors as Record<string, string | string[] | undefined>
}

type UseFormReducerOptions<T extends Record<string, unknown>> = {
	defaultValues: T
	/**
	 * Controlled re-sync source. Reference change → `values` replaced and the
	 * dirty baseline shifts; `touched`, `errors`, and `submitting` stay put.
	 * Passing `undefined` re-syncs to `defaultValues` under the same contract,
	 * so consumers can toggle between an external source and the baseline.
	 * Pass a stable reference — memoize derived objects to avoid sync loops.
	 */
	values?: T
	validate?: Validators<T>
	validateOn: ValidateOn
	onSubmit?: FormSubmitHandler<T>
	onSettled?: (outcome: SubmitOutcome<T>) => void
	onReset?: () => void
}

type UseFormReducerResult = {
	formState: FormStateValue
	store: FormStore
	actions: FormActions
	handleSubmit: (e: SyntheticEvent<HTMLFormElement>) => Promise<void>
	handleReset: (e: SyntheticEvent<HTMLFormElement>) => void
}

export function useFormReducer<T extends Record<string, unknown>>({
	defaultValues,
	values: controlledValues,
	validate,
	validateOn,
	onSubmit,
	onSettled,
	onReset,
}: UseFormReducerOptions<T>): UseFormReducerResult {
	const initialValues = controlledValues ?? defaultValues

	const [state, dispatch] = useReducer(
		formReducer as (state: FormState<T>, action: FormAction<T>) => FormState<T>,
		undefined,
		(): FormState<T> => ({ values: { ...initialValues }, errors: {}, touched: {} }),
	)

	const [submitting, setSubmitting] = useState(false)

	const defaultsRef = useRef(initialValues)

	// Mount-time snapshot of `defaultValues` for falling back when `controlledValues`
	// transitions to `undefined`. `defaultsRef` shifts each time we sync, so we can't
	// reuse it to restore the original baseline.
	const initialDefaultsRef = useRef(defaultValues)

	const validateRef = useRef(validate)

	validateRef.current = validate

	const onSettledRef = useRef(onSettled)

	onSettledRef.current = onSettled

	// Monotonic token identifying the current submit. A reset, an unmount, or a
	// newer submit bumps it, so an in-flight handler that resolves afterward can
	// tell it has been superseded and must not write stale errors / toggles back
	// onto a cleared or torn-down form.
	const submitTokenRef = useRef(0)

	useEffect(() => () => void submitTokenRef.current++, [])

	const { values, errors, touched } = state

	// Mirror current values so getValue stays stable across re-renders;
	// consumers rely on actions object identity (see useFormActions tests).
	const valuesRef = useRef(values)

	valuesRef.current = values

	const dirtyFields = useMemo(() => {
		const d: Record<string, boolean> = {}

		for (const key in values) {
			d[key] = !valuesEqual(values[key], defaultsRef.current[key])
		}

		return d
	}, [values])

	const dirty = useMemo(() => Object.values(dirtyFields).some(Boolean), [dirtyFields])

	// Derived from the live `errors` map so it reflects exactly what the user
	// sees — including server / external errors set via `setErrors` or an
	// `onSubmit` `{ fieldErrors }` return, which a fresh validator pass over
	// `values` can't know about. The reducer keeps `errors` current per
	// `validateOn`, so re-running every validator here would both double the
	// work each keystroke and disagree with the displayed errors.
	const valid = useMemo(
		() => !Object.values(errors).some((issues) => issues !== undefined && issues.length > 0),
		[errors],
	)

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
		// Typed wider than `T` so it satisfies `FormActions.reset` (no `T` at the
		// context level); `FormHelpers<T>` re-narrows at the consumer via contravariance.
		(nextDefaults?: Record<string, unknown>) => {
			if (nextDefaults !== undefined) defaultsRef.current = nextDefaults as T

			// Supersede any in-flight submit and clear its pending state so a slow
			// handler resolving after the reset can't repopulate errors or leave
			// the form stuck in `submitting`.
			submitTokenRef.current++

			setSubmitting(false)

			dispatch({ type: 'reset', defaults: { ...defaultsRef.current } })

			onReset?.()
		},
		[onReset],
	)

	// Watch the controlled `values` prop. Reference change → replace `values`
	// and shift the dirty baseline; `touched`/`errors`/`submitting` stay put
	// so users mid-typing don't lose progress. Transitioning to `undefined`
	// re-syncs to the mount-time `defaultValues` under the same contract.
	// Use `reset(nextDefaults)` to also clear touched and errors.
	const lastSyncedValuesRef = useRef(controlledValues)

	// Synchronous DOM-correction sync (not an async side effect): run before paint
	// so a controlled-value change doesn't flash the stale values for one frame.
	useLayoutEffect(() => {
		if (controlledValues === lastSyncedValuesRef.current) return

		const next = controlledValues ?? initialDefaultsRef.current

		defaultsRef.current = next
		lastSyncedValuesRef.current = controlledValues

		dispatch({ type: 'sync-values', values: next })
	}, [controlledValues])

	const handleSubmit = useCallback(
		async (e: SyntheticEvent<HTMLFormElement>) => {
			e.preventDefault()

			const current = valuesRef.current

			const allTouched: Touched = {}

			for (const key in current) allTouched[key] = true

			const v = validateRef.current

			const submitErrors = v
				? runValidators(v, current, allTouched, validateOn, Object.keys(v))
				: {}

			dispatch({ type: 'submit-validate', touched: allTouched, errors: submitErrors })

			if (Object.values(submitErrors).some((issues) => issues !== undefined && issues.length > 0))
				return

			if (!onSubmit) return

			const token = ++submitTokenRef.current

			setSubmitting(true)

			try {
				const raw = await onSubmit(valuesRef.current, {
					setErrors: setErrorsExternal,
					reset,
				})

				// A reset, unmount, or newer submit ran while we awaited — its
				// outcome owns the form now; dropping ours avoids stale writes.
				if (submitTokenRef.current !== token) return

				const fieldErrors = extractFieldErrors(raw)

				if (fieldErrors) {
					// Mid-flow: the user will fix and retry, not a terminal outcome.
					setErrorsExternal(fieldErrors)
				} else {
					onSettledRef.current?.({ ok: true, values: valuesRef.current })
				}
			} catch (err) {
				if (submitTokenRef.current !== token) return

				onSettledRef.current?.({
					ok: false,
					error: err instanceof Error ? err : new Error(String(err)),
				})
			} finally {
				// Only the latest, un-superseded submit owns the submitting flag;
				// a reset already cleared it and a newer submit set its own.
				if (submitTokenRef.current === token) setSubmitting(false)
			}
		},
		[onSubmit, setErrorsExternal, reset, validateOn],
	)

	const handleReset = useCallback(
		(e: SyntheticEvent<HTMLFormElement>) => {
			e.preventDefault()

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

	return { formState, store, actions, handleSubmit, handleReset }
}
