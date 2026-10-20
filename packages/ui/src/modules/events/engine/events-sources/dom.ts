// The parts that the sources share: the listeners, the performance observer,
// and the ids of the batches.

// The ids of the batches. An id starts with the time origin of the page load,
// so the ids of two page loads in a kept store are not the same.
let lastBatch = 0

/** A new batch id. */
export function nextBatch(): string {
	return `${Math.round(performance.timeOrigin)}.${++lastBatch}`
}

/** The time with no new event that ends a scroll or a burst, in milliseconds. */
export const QUIET = 150

/**
 * The batches of the bursts of a source. A line takes the batch of its key
 * while the lines of that key come less than {@link QUIET} apart.
 */
export function bursts(): { batchOf: (key: string) => string; stop: () => void } {
	const open = new Map<string, { id: string; timer: ReturnType<typeof setTimeout> }>()

	return {
		batchOf(key) {
			const burst = open.get(key)

			clearTimeout(burst?.timer)

			const id = burst?.id ?? nextBatch()

			open.set(key, { id, timer: setTimeout(() => open.delete(key), QUIET) })

			return id
		},
		stop() {
			for (const { timer } of open.values()) clearTimeout(timer)

			open.clear()
		},
	}
}

/** Adds a passive capture listener for each type, and returns a function that removes them. */
export function addListeners(
	target: EventTarget | null | undefined,
	types: readonly string[],
	listener: (event: Event) => void,
): () => void {
	const options = { capture: true, passive: true }

	for (const type of types) target?.addEventListener(type, listener, options)

	return () => {
		for (const type of types) target?.removeEventListener(type, listener, options)
	}
}

/** One function that calls each of `stops`. */
export function all(stops: readonly (() => void)[]): () => void {
	return () => {
		for (const stop of stops) stop()
	}
}

// The entry types that an observer took from the buffer of the page. A store
// that starts again on the same page takes the new entries only, so it does
// not write the old entries twice.
const replayed = new Set<string>()

/**
 * Observes the performance entries of each type that the browser supports, and
 * returns a function that stops. An entry arrives late, but with its own time,
 * so the store puts its line in its place.
 */
export function observe(
	types: readonly string[],
	callback: (entry: PerformanceEntry) => void,
): () => void {
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) callback(entry)
	})

	for (const type of types) {
		if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue

		observer.observe({ type, buffered: !replayed.has(type) })

		replayed.add(type)
	}

	return () => observer.disconnect()
}
