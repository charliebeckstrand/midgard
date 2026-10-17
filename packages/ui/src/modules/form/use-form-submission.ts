'use client'

import {
	type Dispatch,
	type RefObject,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { flushSync } from 'react-dom'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { FormStore } from '../../primitives/form/context'
import {
	extractFieldErrors,
	hasFieldIssues,
	invalidFields,
	settleSubmit,
	toError,
	validateSubmit,
} from './engine/form-submission'
import type {
	Errors,
	FormAction,
	FormHelpers,
	FormSubmitHandler,
	SubmitOutcome,
	ValidateOn,
	Validators,
} from './engine/types'

/** Options for {@link useFormSubmission}. @internal */
type FormSubmissionOptions<T extends Record<string, unknown>> = {
	store: FormStore
	dispatch: Dispatch<FormAction<T>>
	/** The newest validators. Only the handlers read it. */
	validateRef: RefObject<Validators<T> | undefined>
	validateOn: ValidateOn
	setSubmitting: (submitting: boolean) => void
	setErrors: (errors: Record<string, string | string[] | undefined>) => void
	/** Resets the store only, and leaves an in-flight submit live. */
	resetForm: (nextDefaults?: Record<string, unknown>) => void
	onSubmit?: FormSubmitHandler<T>
	onSettled?: (outcome: SubmitOutcome<T>) => void
	onInvalidSubmit?: (errors: Partial<Record<keyof T, string[]>>) => void
}

/** The submit handler, the supersede action, and the failure count of {@link useFormSubmission}. @internal */
type FormSubmissionResult = {
	handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
	/** Discards the in-flight submit, and clears `submitting`. */
	supersede: () => void
	/** How many submit attempts have failed: a refused submit, or a handler that returns a field issue. */
	failures: number
}

/**
 * Drives the submit of a form. A submit validates every field, runs
 * `onSubmit`, and routes a `{ fieldErrors }` return back into the error map or
 * settles through `onSettled`. A monotonic token discards a superseded
 * in-flight submit.
 *
 * @remarks An outside reset and an unmount each supersede the current submit.
 * A superseded handler writes no errors and clears no state. The buttons stay
 * enabled while a submit runs, so a submit that starts during another one is
 * ignored.
 * @internal
 */
export function useFormSubmission<T extends Record<string, unknown>>({
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
}: FormSubmissionOptions<T>): FormSubmissionResult {
	const [failures, setFailures] = useState(0)

	const fail = useCallback(() => setFailures((count) => count + 1), [])

	const reportSettled = useStableEvent((outcome: SubmitOutcome<T>) => onSettled?.(outcome))

	// The payload is built only when a callback reads it.
	const reportInvalid = useStableEvent((errors: Errors) => {
		if (!onInvalidSubmit) return

		onInvalidSubmit(invalidFields(errors) as Partial<Record<keyof T, string[]>>)
	})

	// Monotonic token identifying the current submit. An outside reset, unmount,
	// and newer submits bump it; an in-flight handler compares against it to
	// detect supersession before writing errors or clearing state.
	const tokenRef = useRef(0)

	useEffect(() => () => void tokenRef.current++, [])

	// The token of the submit in flight, or `null`. A ref, not the store: a
	// second submit event can come before the commit that publishes `submitting`.
	const inFlightRef = useRef<number | null>(null)

	const supersede = useCallback(() => {
		tokenRef.current++

		inFlightRef.current = null

		setSubmitting(false)
	}, [setSubmitting])

	const handleSubmit = useCallback(
		async (event: SyntheticEvent<HTMLFormElement>) => {
			event.preventDefault()

			// The buttons stay enabled while a submit runs, so a second click or an
			// Enter in a field can start a submit here. The first submit continues.
			if (inFlightRef.current !== null) return

			const submitValues = store.getState().values as T

			const { touched, errors, refused } = validateSubmit(
				validateRef.current,
				submitValues,
				validateOn,
			)

			// A refused submit returns here and never reaches `onSubmit`, so no other
			// callback fires. Without this report the caller cannot tell a refused
			// submit from a submit that never happened.
			//
			// The refusal flushes, so the report lands after the commit that marks
			// the fields. The documented use is to scroll to the first error, and on
			// the first refused submit nothing carries `aria-invalid` until this
			// dispatch paints. Only the refusal pays the synchronous render.
			if (refused) {
				flushSync(() => {
					dispatch({ type: 'submit-validate', touched, errors })

					fail()
				})

				reportInvalid(errors)

				return
			}

			dispatch({ type: 'submit-validate', touched, errors })

			if (!onSubmit) return

			const token = ++tokenRef.current

			inFlightRef.current = token

			setSubmitting(true)

			// A reset from the handler of the current attempt resets the store and
			// keeps the attempt live. A handler that a newer submit or an outside
			// reset superseded resets in full, as an outside reset does.
			const helpers: FormHelpers<T> = {
				setErrors,
				reset: (nextDefaults) => {
					if (tokenRef.current !== token) supersede()

					resetForm(nextDefaults)
				},
			}

			// Superseded by a reset, unmount, or newer submit; discard the result.
			const applyOutcome = (raw: unknown) => {
				if (tokenRef.current !== token) return

				const fieldErrors = extractFieldErrors(raw)

				// Apply the returned entries. This also clears each field whose entry
				// has no issue. An entry with an issue keeps the attempt mid-flow, and
				// `onSettled` does not fire. `''` normalizes to `['']`, an issue.
				if (fieldErrors) {
					setErrors(fieldErrors)

					if (hasFieldIssues(fieldErrors)) {
						fail()

						return
					}
				}

				// The outcome carries the values that `onSubmit` got, not the values
				// after a reset or a write while the handler waited.
				reportSettled({ ok: true, values: submitValues })
			}

			const applyError = (error: unknown) => {
				if (tokenRef.current !== token) return

				reportSettled({ ok: false, error: toError(error) })
			}

			await settleSubmit(
				async () => {
					let raw: unknown

					try {
						raw = await onSubmit(submitValues, helpers)
					} catch (error) {
						applyError(error)

						return
					}

					// Outside the `try`, so a throw from `onSettled` does not report the
					// attempt again as a failure.
					applyOutcome(raw)
				},
				() => {
					// Clear `submitting` only for the un-superseded submit.
					if (tokenRef.current !== token) return

					inFlightRef.current = null

					setSubmitting(false)
				},
			)
		},
		[
			store,
			dispatch,
			validateRef,
			validateOn,
			onSubmit,
			setErrors,
			setSubmitting,
			resetForm,
			supersede,
			fail,
			reportInvalid,
			reportSettled,
		],
	)

	return { handleSubmit, supersede, failures }
}
