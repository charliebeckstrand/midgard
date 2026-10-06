import { useState } from 'react'

/**
 * Returns a function that gives an error to the nearest error boundary. The
 * error throws in the next render, so it also comes from an event handler or
 * a promise, which the boundary does not catch.
 *
 * A load that the reader asks for, such as the load of a panel module, uses it
 * when the load fails. The boundary then offers a reload. A load that fails in
 * a tab that stayed open across a deploy does not succeed again in that page,
 * because the deploy removes the old chunk and the browser keeps the failure
 * of a module for the life of the document. Only a reload gets the new chunks.
 */
export function useFail(): (error: unknown) => void {
	const [failure, setFailure] = useState<{ error: unknown }>()

	if (failure) throw failure.error

	return (error) => setFailure({ error })
}
