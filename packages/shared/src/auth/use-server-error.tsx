'use client'

import { type ReactNode, useState } from 'react'
import { ErrorAlert } from './error-alert'

/**
 * Error state of an auth page that is not about one field, where `FormError`
 * cannot show the error. A page with a `Form` returns `{ formError }` from
 * `onSubmit`, or calls `setFormError` of the form actions, and shows the error
 * with `FormError`.
 *
 * @internal
 * @remarks
 * Two pages keep this hook. The email check has no form. The second step keeps
 * one alert for its passkey check and its code form, and the alert is outside
 * the form. The code form remounts when the user changes the type of code, and
 * the remount clears the error state of the form.
 *
 * @returns The alert to render, or `null` without an error, and the setter.
 * An empty message clears the error. When the user dismisses the alert, the
 * hook clears the error, so that the next error shows the alert again.
 */
export function useServerError(): [alert: ReactNode, setError: (message: string) => void] {
	const [error, setError] = useState('')

	const alert = error ? <ErrorAlert onDismiss={() => setError('')}>{error}</ErrorAlert> : null

	return [alert, setError]
}
