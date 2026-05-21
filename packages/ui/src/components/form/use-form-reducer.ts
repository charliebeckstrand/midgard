'use client'

import { type SyntheticEvent, useCallback, useMemo, useReducer, useRef, useState } from 'react'
import type { FormActions, FormStateValue } from './context'
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
	reset: () => void
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

export type UseFormReducerOptions<T extends Record<string, unknown>> = {
	defaultValues: T
	validate?: Validators<T>
	validateOn: ValidateOn
	onSubmit?: FormSubmitHandler<T>
	onSettled?: (outcome: SubmitOutcome<T>) => void
	onReset?: () => void
}

export type UseFormReducerResult = {
	formState: FormStateValue
	actions: FormActions
	handleSubmit: (e: SyntheticEvent<HTMLFormElement>) => Promise<void>
	handleReset: (e: SyntheticEvent<HTMLFormElement>) => void
}

export function useFormReducer<T extends Record<string, unknown>>({
	defaultValues,
	validate,
	validateOn,
	onSubmit,
	onSettled,
	onReset,
}: UseFormReducerOptions<T>): UseFormReducerResult {
	const [state, dispatch] = useReducer(
		formReducer as (state: FormState<T>, action: FormAction<T>) => FormState<T>,
		undefined,
		(): FormState<T> => ({ values: { ...defaultValues }, errors: {}, touched: {} }),
	)

	const [submitting, setSubmitting] = useState(false)

	const defaultsRef = useRef(defaultValues)

	const validateRef = useRef(validate)

	validateRef.current = validate

	const onSettledRef = useRef(onSettled)

	onSettledRef.current = onSettled

	const { values, errors, touched } = state

	// Mirror current values so getValue stays stable across re-renders;
	// consumers rely on actions object identity (see useFormActions tests).
	const valuesRef = useRef(values)

	valuesRef.current = values

	const dirty = useMemo(() => {
		const d: Record<string, boolean> = {}

		for (const key in values) {
			d[key] = !valuesEqual(values[key], defaultsRef.current[key])
		}

		return d
	}, [values])

	const isDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty])

	const isValid = useMemo(() => {
		const v = validateRef.current

		if (!v) return true

		const errs = runValidators(v, values, {}, validateOn, Object.keys(v))

		return !Object.values(errs).some((issues) => issues !== undefined && issues.length > 0)
	}, [values, validateOn])

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

	const reset = useCallback(() => {
		dispatch({ type: 'reset', defaults: { ...defaultsRef.current } })

		onReset?.()
	}, [onReset])

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

			setSubmitting(true)

			try {
				const raw = await onSubmit(valuesRef.current, {
					setErrors: setErrorsExternal,
					reset,
				})

				const fieldErrors = extractFieldErrors(raw)

				if (fieldErrors) {
					// Mid-flow: the user will fix and retry, not a terminal outcome.
					setErrorsExternal(fieldErrors)
				} else {
					onSettledRef.current?.({ ok: true, values: valuesRef.current })
				}
			} catch (err) {
				onSettledRef.current?.({
					ok: false,
					error: err instanceof Error ? err : new Error(String(err)),
				})
			} finally {
				setSubmitting(false)
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
			touched,
			dirty,
			isDirty,
			isValid,
			submitting,
		}),
		[values, errors, touched, dirty, isDirty, isValid, submitting],
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

	return { formState, actions, handleSubmit, handleReset }
}
