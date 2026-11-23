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
import type { FormFieldTargets } from '../../primitives/form/form-field-targets'
import {
	extractFieldErrors,
	extractFormError,
	hasFieldIssues,
	invalidFields,
	settleSubmit,
	toError,
	validateSubmit,
} from './engine/form-submission'
import type { Errors, FormAction, FormHelpers, SubmitOutcome, Validators } from './engine/types'
import type { FormProps } from './form'
import { focusFirstControl } from './form-focus'

/** Options for {@link useFormSubmission}. @internal */
type FormSubmissionOptions<T extends Record<string, unknown>> = Pick<
	FormProps<T>,
	'onSubmit' | 'onSettled' | 'onInvalidSubmit'
> & {
	store: FormStore
	dispatch: Dispatch<FormAction<T>>
	/** The newest validators. Only the handlers read it. */
	validateRef: RefObject<Validators<T> | undefined>
	setSubmitting: (submitting: boolean) => void
	setErrors: (errors: Record<string, string | string[] | undefined>) => void
	/** Sets the issue of the whole form, or clears it with `null`. */
	setFormError: (formError: string | null) => void
	/** Counts a write of an issue of the whole form that does not go through `setFormError`. */
	countFormError: () => void
	/** Resets the store only, and leaves an in-flight submit live. */
	resetForm: (nextDefaults?: Record<string, unknown>) => void
	/** The control ids of the fields. A refused submit focuses the first invalid control by them. */
	targets?: FormFieldTargets
}

/** The submit handler, the supersede action, and the failure count of {@link useFormSubmission}. @internal */
type FormSubmissionResult = {
	handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
	/** Discards the in-flight submit, and clears `submitting`. */
	supersede: () => void
	/** How many submit attempts have failed: a refused submit, or a handler that returns or sets a field issue or an issue of the whole form. */
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
	setSubmitting,
	setErrors,
	setFormError,
	countFormError,
	resetForm,
	onSubmit,
	onSettled,
	onInvalidSubmit,
	targets,
}: FormSubmissionOptions<T>): FormSubmissionResult {
	const [failures, setFailures] = useState(0)

	const fail = useCallback(() => setFailures((count) => count + 1), [])

	const reportSettled = useStableEvent((outcome: SubmitOutcome<T>) => onSettled?.(outcome))

	// The payload is built only when a callback reads it.
	const reportInvalid = useStableEvent((errors: Errors, formError: string | null) => {
		if (!onInvalidSubmit) return

		onInvalidSubmit(invalidFields(errors) as Partial<Record<keyof T, string[]>>, formError)
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

			// Read before the handler runs: React clears `currentTarget` after the
			// event, and a returned issue moves the focus after an `await`.
			const doc = event.currentTarget.ownerDocument

			// The focus goes to the first invalid control, so the reader does not stay
			// on the submit button. A mounted summary takes the focus itself, and an
			// `onInvalidSubmit` that moves the focus runs after this and wins.
			const focusInvalid = (errors: Errors) => {
				if (!targets || targets.hasSummary()) return

				focusFirstControl(doc, Object.keys(invalidFields(errors)), targets.getSnapshot())
			}

			const { touched, errors, formError, refused } = validateSubmit(
				validateRef.current,
				submitValues,
			)

			// A refused submit returns here and never reaches `onSubmit`, so no other
			// callback fires. Without this report the caller cannot tell a refused
			// submit from a submit that never happened.
			//
			// The refusal flushes, so the focus move and the report come after the
			// commit that marks the fields. On the first refused submit, nothing
			// carries `aria-invalid` until this dispatch commits, and the focus must
			// land on a control that already shows its error. Only the refusal pays
			// the synchronous render.
			if (refused) {
				flushSync(() => {
					dispatch({ type: 'submit-validate', touched, errors, formError })

					if (formError !== null) countFormError()

					fail()
				})

				focusInvalid(errors)

				reportInvalid(errors, formError)

				return
			}

			// The submit clears the issue of the whole form of the last attempt.
			dispatch({ type: 'submit-validate', touched, errors, formError })

			// With no handler, the passed validation is the terminal outcome.
			if (!onSubmit) {
				reportSettled({ ok: true, values: submitValues })

				return
			}

			const token = ++tokenRef.current

			inFlightRef.current = token

			setSubmitting(true)

			// A reset from the handler of the current attempt resets the store and
			// keeps the attempt live. A handler that a newer submit or an outside
			// reset superseded resets in full, as an outside reset does, and writes
			// no errors.
			//
			// The issues that the helpers of this attempt left, kept as the store keeps
			// them: a field write merges by field, the issue of the whole form takes
			// the last write, and a reset clears both. An issue that stays when the
			// handler settles fails the attempt, as a returned issue does.
			let helperFieldErrors: Record<string, string | string[] | undefined> = {}

			let helperFormError = false

			const helpers: FormHelpers<T> = {
				setErrors: (fieldErrors) => {
					if (tokenRef.current !== token) return

					setErrors(fieldErrors)

					helperFieldErrors = { ...helperFieldErrors, ...fieldErrors }
				},
				setFormError: (message) => {
					if (tokenRef.current !== token) return

					setFormError(message)

					helperFormError = message !== null
				},
				reset: (nextDefaults) => {
					if (tokenRef.current !== token) supersede()

					helperFieldErrors = {}

					helperFormError = false

					resetForm(nextDefaults)
				},
			}

			// Superseded by a reset, unmount, or newer submit; discard the result.
			const applyOutcome = (raw: unknown) => {
				if (tokenRef.current !== token) return

				const fieldErrors = extractFieldErrors(raw)

				const formError = extractFormError(raw)

				// Apply the returned entries. This also clears each field whose entry
				// has no issue. An entry with an issue, an issue of the whole form, or a
				// helper issue that stays keeps the attempt mid-flow, and `onSettled`
				// does not fire. `''` normalizes to `['']`, an issue.
				const failed =
					helperFormError ||
					formError !== null ||
					hasFieldIssues({ ...helperFieldErrors, ...fieldErrors })

				if (failed) {
					// The write flushes with the end of the lock, so the focus lands on a
					// control that already shows its error and is not read-only, as on a
					// refused submit. The later `done` call then changes nothing.
					flushSync(() => {
						if (fieldErrors) setErrors(fieldErrors)

						if (formError !== null) setFormError(formError)

						fail()

						inFlightRef.current = null

						setSubmitting(false)
					})

					focusInvalid(store.getState().errors)

					return
				}

				if (fieldErrors) setErrors(fieldErrors)

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
			onSubmit,
			setErrors,
			setFormError,
			countFormError,
			setSubmitting,
			resetForm,
			supersede,
			fail,
			reportInvalid,
			reportSettled,
			targets,
		],
	)

	return { handleSubmit, supersede, failures }
}
