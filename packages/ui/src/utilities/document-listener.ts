type Registry = {
	handlers: Set<(event: Event) => void>
	listener: ((event: Event) => void) | null
}

const registries = new Map<string, Registry>()

/**
 * Subscribe to a document-level event through a single shared listener per
 * event type. N open overlays share one `document` listener instead of each
 * registering its own; the listener attaches on the first subscriber and
 * detaches on the last.
 *
 * Handlers fire in subscription order and every subscriber receives the
 * event: deduplication, not top-most-only routing. Returns an unsubscribe fn.
 *
 * Each `handler` must be a distinct function reference (callers pass a fresh
 * closure per effect run); the same reference subscribed twice dedupes in
 * the handler set and detaches early on the first unsubscribe.
 */
export function subscribeDocumentEvent<K extends keyof DocumentEventMap>(
	type: K,
	handler: (event: DocumentEventMap[K]) => void,
): () => void {
	let registry = registries.get(type)

	if (registry === undefined) {
		registry = { handlers: new Set(), listener: null }

		registries.set(type, registry)
	}

	const reg = registry

	const wrapped = handler as (event: Event) => void

	reg.handlers.add(wrapped)

	if (reg.listener === null) {
		reg.listener = (event) => {
			// Dispatch over a snapshot; a mid-dispatch unsubscribe skips no handler.
			for (const h of [...reg.handlers]) {
				try {
					h(event)
				} catch (error) {
					// Match native addEventListener semantics: a throw in one listener
					// does not stop the others. The microtask rethrow surfaces it to
					// the global error handler out of band.
					queueMicrotask(() => {
						throw error
					})
				}
			}
		}

		document.addEventListener(type, reg.listener)
	}

	return () => {
		reg.handlers.delete(wrapped)

		if (reg.handlers.size === 0 && reg.listener !== null) {
			document.removeEventListener(type, reg.listener)

			reg.listener = null
		}
	}
}
