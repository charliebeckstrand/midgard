'use client'

import { type ReactNode, useState } from 'react'
import { ErrorAlert } from './error-alert'

/** The message of a request that throws, for example on a network failure. */
export const unexpectedError = 'An unexpected error occurred. Please try again later.'

/**
 * Error state of an auth page that is not about one field.
 *
 * @internal
 * @returns The alert to render, or `null` without an error, and the setter.
 * An empty message clears the error. When the user dismisses the alert, the
 * hook clears the error, so that the next error shows the alert again.
 */
export function useServerError(): [alert: ReactNode, setError: (message: string) => void] {
	const [error, setError] = useState('')

	const alert = error ? <ErrorAlert onDismiss={() => setError('')}>{error}</ErrorAlert> : null

	return [alert, setError]
}
