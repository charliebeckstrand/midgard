// React's `use()` returns at once only for a promise that carries its result in
// `status` and `value`. It suspends on any other promise, also a settled one.
export type TrackedPromise<T> = Promise<T> & {
	status?: 'pending' | 'fulfilled' | 'rejected'
	value?: T
	reason?: unknown
}

/**
 * Returns the cached promise under `id`, or starts one with `start` and caches
 * it. The promise carries its result for `use()`. A rejection stays cached, so
 * that a render that retries reads the same rejection and does not start the
 * load again.
 */
export function tracked<T>(
	cache: Map<string, TrackedPromise<T>>,
	id: string,
	start: () => Promise<T>,
): TrackedPromise<T> {
	const cached = cache.get(id)

	if (cached) return cached

	const promise = start() as TrackedPromise<T>

	promise.status = 'pending'

	promise.then(
		(value) => {
			promise.status = 'fulfilled'
			promise.value = value
		},
		(reason) => {
			promise.status = 'rejected'
			promise.reason = reason
		},
	)

	cache.set(id, promise)

	return promise
}
