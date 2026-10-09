import { getOrCompute } from './get-or-compute'

type Entry<S, E> = {
	source: S
	handlers: Set<(event: E) => void>
	detach: (() => void) | null
}

/** How a {@link createListenerRegistry} registry reaches the native listener for a key. */
export type ListenerRegistryOptions<S, E> = {
	/** Makes the source of a key, such as a `MediaQueryList`, for its first subscriber. */
	source: (key: string) => S
	/** Adds `listener` to `source` for `key`, and returns the call that removes it. */
	attach: (source: S, key: string, listener: (event: E) => void) => () => void
	/**
	 * Whether the entry of a key stays in the registry after its last subscriber
	 * leaves. Keep it when the keys are a small bounded set and the source holds
	 * nothing live. Drop it when the keys have no bound or the source holds a
	 * live object.
	 *
	 * @defaultValue false
	 */
	keep?: boolean
}

/** A set of handlers for each key behind one shared native listener. */
export type ListenerRegistry<S, E> = {
	/** Adds `handler` for `key`, and returns the call that removes it. */
	subscribe: (key: string, handler: (event: E) => void) => () => void
	/** The source of `key` while the registry holds its entry. */
	source: (key: string) => S | undefined
}

/**
 * A new, empty {@link ListenerRegistry}. Many subscribers of one key share one
 * native listener. The listener attaches for the first subscriber and detaches
 * when the last subscriber leaves.
 *
 * @remarks
 * Handlers run in subscription order, and each handler gets each event. The
 * dispatch runs over a copy of the handler set, so an unsubscribe during a
 * dispatch skips no other handler. A handler that throws does not stop the
 * others: a microtask throws the error again, so that the global error handler
 * gets it, as with a native listener.
 *
 * Each `handler` must be a different function reference. The set keeps one
 * copy of a reference that subscribes twice, so its first unsubscribe removes
 * it.
 *
 * @internal
 */
export function createListenerRegistry<S, E>({
	source,
	attach,
	keep = false,
}: ListenerRegistryOptions<S, E>): ListenerRegistry<S, E> {
	const entries = new Map<string, Entry<S, E>>()

	return {
		subscribe: (key, handler) => {
			const entry = getOrCompute(
				entries,
				key,
				(): Entry<S, E> => ({ source: source(key), handlers: new Set(), detach: null }),
			)

			entry.handlers.add(handler)

			if (entry.detach === null) {
				entry.detach = attach(entry.source, key, (event) => {
					for (const h of [...entry.handlers]) {
						try {
							h(event)
						} catch (error) {
							queueMicrotask(() => {
								throw error
							})
						}
					}
				})
			}

			return () => {
				entry.handlers.delete(handler)

				if (entry.handlers.size === 0 && entry.detach !== null) {
					entry.detach()

					entry.detach = null

					if (!keep) entries.delete(key)
				}
			}
		},
		source: (key) => entries.get(key)?.source,
	}
}
