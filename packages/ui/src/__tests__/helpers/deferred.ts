/** A promise, and the two functions that settle it. */
export type Deferred<T> = {
	/** The promise the subject awaits. */
	promise: Promise<T>
	/** Fulfills {@link Deferred.promise} with `value`. */
	resolve: (value: T) => void
	/** Rejects {@link Deferred.promise} with `reason`. */
	reject: (reason: unknown) => void
}

/**
 * A promise that the case settles by hand.
 *
 * @remarks
 * A case that asserts the pending state of an async seam holds the answer
 * back, asserts, and then settles it. Written by hand, that needs a `let` for
 * the resolver and a placeholder or an optional call for the time before the
 * promise exists. Here both functions exist from the start.
 *
 * The `lib` stops at ES2023, so `Promise.withResolvers` has no types here.
 *
 * A seam that the subject calls more than once gets the same promise each
 * time. Where each call needs its own answer, make one `deferred` for each
 * call.
 *
 * @returns The promise and its two settle functions.
 *
 * @example
 * ```typescript
 * const rows = deferred<Row[]>()
 *
 * renderUI(<Grid exportRows={() => rows.promise} … />)
 *
 * rows.resolve(allRows)
 * ```
 */
export function deferred<T = void>(): Deferred<T> {
	let resolve!: (value: T) => void

	let reject!: (reason: unknown) => void

	const promise = new Promise<T>((fulfil, fail) => {
		resolve = fulfil

		reject = fail
	})

	return { promise, resolve, reject }
}
