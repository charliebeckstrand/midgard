/**
 * Wraps `compute` so it runs at most once, every later call returning the
 * first result. The lazy seam the charts hang deferred work on. A chart body
 * describes an expensive derivation (a ten-thousand-cell readout) as a thunk.
 * Whichever consumer needs it first — a hover's tooltip, the deferred data
 * table — pays for it off the mount-critical render. The rest read the cache.
 */
export function once<T>(compute: () => T): () => T {
	let computed = false

	let value: T

	return () => {
		if (!computed) {
			value = compute()

			computed = true
		}

		return value
	}
}
