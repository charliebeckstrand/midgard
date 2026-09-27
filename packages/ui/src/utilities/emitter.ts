/** A set of listeners with no payload, and the call that notifies them. */
export type Emitter = {
	/** Adds `listener`, and returns the call that removes it. */
	subscribe: (listener: () => void) => () => void
	/** Calls each listener once. */
	emit: () => void
}

/**
 * A new, empty {@link Emitter}.
 *
 * @remarks `emit` calls a copy of the listener set. A listener that subscribes
 * or unsubscribes during the call changes the next `emit`, not this one.
 */
export function createEmitter(): Emitter {
	const listeners = new Set<() => void>()

	return {
		subscribe: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
		emit: () => {
			for (const listener of [...listeners]) listener()
		},
	}
}
