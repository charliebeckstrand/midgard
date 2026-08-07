/**
 * What both routing clients hand `fetch`: the travel profile they share, and
 * the abort signal that combines a caller's own with an optional timeout.
 */

/** The travel profile a routing request asks for. @internal */
export type Profile = 'driving' | 'walking' | 'cycling'

/**
 * The signal to hand `fetch`: the caller's, a fresh timeout, or both combined
 * through {@link AbortSignal.any}. `AbortSignal.timeout(undefined)` throws, so a
 * timeout signal is built only when `timeoutMs` is given; a fired timeout
 * rejects the fetch, which the callers turn into a `null` result.
 *
 * @internal
 */
export function requestSignal(
	signal: AbortSignal | undefined,
	timeoutMs: number | undefined,
): AbortSignal | undefined {
	if (timeoutMs === undefined) return signal

	const timeout = AbortSignal.timeout(timeoutMs)

	return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}
