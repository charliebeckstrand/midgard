'use client'

import { useState } from 'react'

/**
 * Gives a function that sends an error to the nearest error boundary.
 *
 * An error boundary catches only an error that throws during a render. An error
 * from an event handler or from a promise does not get to it. The function
 * keeps the error in state, and the hook throws it in the next render, so the
 * boundary catches it.
 *
 * Call the hook before the hooks that follow it in the component. The throw
 * ends that render, so the order of the hooks does not change.
 *
 * @returns A function that sends its error to the nearest error boundary.
 * @internal
 */
export function useFail(): (error: unknown) => void {
	const [failure, setFailure] = useState<{ error: unknown }>()

	if (failure) throw failure.error

	return (error) => setFailure({ error })
}
