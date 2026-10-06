// The caught errors of the Event log: each error that an error boundary
// catches. React gives a caught error to `console.error` only, not to
// `window`, so the client entry gives `onCaughtError` to `hydrateRoot`. While
// no listener is set, the error goes to the console only, so the log adds no
// cost while it is off.

/** Receives each caught error and the component stack of the component that throws it. */
type Listener = (error: unknown, componentStack: string | undefined) => void

let listener: Listener | undefined

/** Sets the listener of the caught errors, and returns a function that removes it. */
export function listenCaughtErrors(next: Listener): () => void {
	listener = next

	return () => {
		if (listener === next) listener = undefined
	}
}

/**
 * The `onCaughtError` of the root. It gives the error to the listener, then
 * writes the error to the console, as the production default of React does.
 */
export function onCaughtError(error: unknown, info: { componentStack?: string }): void {
	listener?.(error, info.componentStack)

	console.error(error)
}
