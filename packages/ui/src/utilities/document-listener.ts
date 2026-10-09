import { createListenerRegistry } from './listener-registry'

// The registry keeps an empty entry: event-type names are a small bounded set,
// and the source is the document, which holds nothing live.
const registry = createListenerRegistry<Document, Event>({
	source: () => document,
	attach: (doc, type, listener) => {
		doc.addEventListener(type, listener)

		return () => doc.removeEventListener(type, listener)
	},
	keep: true,
})

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
 * closure per effect run). The same reference subscribed twice dedupes in
 * the handler set and detaches early on the first unsubscribe.
 */
export function subscribeDocumentEvent<K extends keyof DocumentEventMap>(
	type: K,
	handler: (event: DocumentEventMap[K]) => void,
): () => void {
	return registry.subscribe(type, handler as (event: Event) => void)
}
