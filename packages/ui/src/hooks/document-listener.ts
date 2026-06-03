'use client'

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
 * Handlers fire in subscription order and every subscriber still receives the
 * event — this is deduplication, not top-most-only routing, so the existing
 * "all open overlays react" behavior is preserved. Returns an unsubscribe fn.
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
			// Snapshot so a handler that unsubscribes mid-dispatch doesn't skip others.
			for (const h of [...reg.handlers]) h(event)
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
