'use client'

import type { PdfViewerPage } from './types'

/**
 * How many documents' rasterized pages stay resident.
 *
 * Small on purpose. An entry holds one PNG blob per page at up to 2× device scale, so a long
 * document is megabytes and the bound has to be a real one rather than a reassurance.
 *
 * Four rather than one, because a reader moves between documents as well as parking one: a cap
 * of one would evict the scan they are coming back to the moment they glance at the next. Four
 * covers that shuttle and still bounds the resident set at a handful of documents.
 * @internal
 */
const MAX_DOCUMENTS = 4

/** What a viewer observes for one `src`: the pages rasterized so far, a download/print URL, and load progress. @internal */
export type PdfDocumentSnapshot = {
	pages: PdfViewerPage[]
	/** Same-origin blob URL for the fetched PDF, or `null` before the fetch resolves. */
	documentUrl: string | null
	loading: boolean
	error: Error | null
}

/**
 * The snapshot for a `src` nothing is resident for.
 *
 * @remarks One frozen instance, returned by every miss. {@link getDocumentSnapshot} feeds
 * `useSyncExternalStore`, which compares snapshots with `Object.is` and re-renders forever if a
 * miss allocates a fresh one — so the shared identity is a correctness requirement rather than
 * a saving.
 * @internal
 */
const EMPTY: PdfDocumentSnapshot = Object.freeze({
	// The array is frozen too, not just the record around it: this is a process-wide singleton
	// handed to every miss, and one consumer pushing into it would corrupt all of them.
	pages: Object.freeze([]) as unknown as PdfViewerPage[],
	documentUrl: null,
	loading: false,
	error: null,
})

/**
 * The empty snapshot, for a caller that needs one without consulting the map — the server
 * render, where there is no canvas to rasterize onto and so never anything resident.
 *
 * @remarks The same frozen instance {@link getDocumentSnapshot} returns on a miss, so a
 * `useSyncExternalStore` server snapshot is `Object.is`-equal to the client's first miss and
 * hydration sees no change.
 * @internal
 */
export const EMPTY_DOCUMENT_SNAPSHOT = EMPTY

/**
 * One resident document: what viewers read, who is watching it, and whether a load is running.
 *
 * @remarks `listeners` doubles as the holder count. Every mounted viewer subscribes for as long
 * as it is showing this `src`, so a non-empty set means "someone is looking at this" — which is
 * exactly what eviction has to respect, and why there is no separate reference count beside it.
 * @internal
 */
type Held = {
	snapshot: PdfDocumentSnapshot
	listeners: Set<() => void>
	/** True while a rasterization is running, so a second viewer joins it instead of starting one. */
	loading: boolean
}

/**
 * Resident documents, keyed by `src`.
 *
 * A module map rather than component state, because outliving the component is the whole
 * point: a panel that parks by *closing* — `Overlay` gates its portal on `open` — unmounts
 * its children, the viewer included. Everything the viewer held in state or in an effect's
 * closure goes with them, which means reopening re-fetches and re-rasterizes a document the
 * reader was looking at a moment earlier, with the scan visibly rebuilding from its skeleton.
 *
 * `'use client'` is what keeps that honest: without it this would be one mutable map per
 * *server* process, shared across requests and tenants. Blob URLs make that worse than a stale
 * read — they are handles into one document's memory and mean nothing in another.
 *
 * @remarks Insertion order is the LRU order: {@link touch} re-inserts on every subscribe, so
 * the least recently used unheld key is always the first the iterator yields.
 * @internal
 */
const documents = new Map<string, Held>()

/**
 * Frees the blob URLs a snapshot owns.
 *
 * @remarks A finished snapshot owns no pdf.js resources: the rasterizer destroys the loading
 * task as soon as the last page renders, so by the time anything is cached the document and its
 * worker channel are already gone and blob URLs are all that is left to release. Safe on a
 * partial snapshot too, which is what a failed load leaves behind.
 * @internal
 */
function revoke(snapshot: PdfDocumentSnapshot) {
	if (snapshot.documentUrl) URL.revokeObjectURL(snapshot.documentUrl)

	for (const page of snapshot.pages) URL.revokeObjectURL(page.src)
}

/**
 * Drops least-recently-used documents until at most {@link MAX_DOCUMENTS} remain.
 *
 * @remarks Skips anything a viewer is watching, and anything mid-load. A watched entry's blob
 * URLs are live `<img>` sources, and revoking one blanks the page a reader is looking at — so
 * the holders outrank the cap, and a run with every entry held frees nothing. That cannot grow
 * without bound in practice: a viewer subscribes only while mounted, and the app mounts one
 * scan at a time.
 * @internal
 */
function evict() {
	if (documents.size <= MAX_DOCUMENTS) return

	for (const [src, held] of documents) {
		if (documents.size <= MAX_DOCUMENTS) return

		if (held.loading || held.listeners.size > 0) continue

		documents.delete(src)

		revoke(held.snapshot)
	}
}

/**
 * Marks `src` most recently used.
 *
 * @remarks Delete-then-set, which is how a `Map` re-orders: insertion order is the only order
 * it has, and re-setting an existing key keeps its original position.
 * @internal
 */
function touch(src: string) {
	const held = documents.get(src)

	if (!held) return

	documents.delete(src)

	documents.set(src, held)
}

/** The record for `src`, created empty if this is the first interest in it. @internal */
function heldFor(src: string): Held {
	const existing = documents.get(src)

	if (existing) return existing

	const held: Held = { snapshot: EMPTY, listeners: new Set(), loading: false }

	documents.set(src, held)

	return held
}

/**
 * Replaces `src`'s snapshot and tells its subscribers.
 *
 * @remarks A new object every time, because that identity is the only signal
 * `useSyncExternalStore` reads. A caller adding pages rebuilds the array for the same reason —
 * a mutated array would be `Object.is`-equal to the one React already rendered.
 * @internal
 */
function publish(src: string, next: Partial<PdfDocumentSnapshot>) {
	const held = documents.get(src)

	if (!held) return

	held.snapshot = { ...held.snapshot, ...next }

	for (const listener of held.listeners) listener()
}

/**
 * The cached state for `src`, or the shared empty snapshot.
 *
 * @remarks Synchronous and pure, so a remounting viewer reads its pages *during render* and
 * paints them on its first frame. An effect-based read would paint one frame of the loading
 * skeleton first, which is the flicker this cache exists to remove — so the synchronousness is
 * the point rather than an optimization.
 * @internal
 */
export function getDocumentSnapshot(src: string | undefined): PdfDocumentSnapshot {
	if (!src) return EMPTY

	return documents.get(src)?.snapshot ?? EMPTY
}

/**
 * Subscribes to `src`'s snapshot changes for as long as a viewer is showing it.
 *
 * @returns The unsubscribe function `useSyncExternalStore` expects.
 * @remarks Registering interest also creates the record and marks it most recently used, so a
 * listener added before the load starts has somewhere to live and a document being looked at
 * cannot be the next one evicted. Such a record holds nothing until a load fills it, and is
 * evictable the moment its last listener goes.
 * @internal
 */
export function subscribeDocument(src: string | undefined, listener: () => void): () => void {
	if (!src) return () => {}

	const held = heldFor(src)

	held.listeners.add(listener)

	touch(src)

	return () => {
		held.listeners.delete(listener)

		evict()
	}
}

/**
 * How a rasterizer reports progress back into the cache as it works.
 *
 * @remarks Page-at-a-time rather than one array at the end, so a long document reveals itself
 * as it renders instead of showing nothing until the last page lands — which is what the hook
 * did with `setPages` before the pages outlived it.
 * @internal
 */
export type PdfLoadReport = {
	documentUrl: (url: string) => void
	page: (page: PdfViewerPage) => void
}

/** Rasterizes a document, reporting each page as it lands. @internal */
export type PdfLoadRun = (report: PdfLoadReport) => Promise<void>

/**
 * Starts a rasterization for `src` unless one is running or a finished document is already
 * resident.
 *
 * @remarks The guard is what makes a park cheap and a duplicate viewer free: a maximize finds
 * the pages already there and runs nothing, and a second viewer on the same `src` joins the
 * first one's load instead of fetching the file twice.
 *
 * A load is **not** cancelled when the viewer that started it unmounts. Parking
 * mid-rasterization therefore keeps rasterizing, and the maximize finds a finished document
 * where cancelling meant starting over — the window `resolveWorker` already documents as
 * reachable. The cost is CPU spent on a document nobody is watching for as long as the park
 * lasts, which is the right trade for a scan the reader is on their way back to.
 *
 * A failure is reported to current subscribers but not remembered: the record keeps its error
 * for them to render, and the next mount retries. So a transient network failure is recovered
 * by parking and maximizing rather than cached as a permanent one.
 * @internal
 */
export function ensureDocumentLoad(src: string | undefined, run: PdfLoadRun) {
	if (!src) return

	const held = heldFor(src)

	if (held.loading) return

	/*
	 * A finished document, which is the whole point of the cache: nothing is loading, no error
	 * stands, and pages are present, so this is a complete rasterization to reuse.
	 *
	 * Pages-present rather than a `done` flag, so the one case they disagree on — a document
	 * that rasterized zero pages and threw nothing, which is every page skipped for want of a
	 * 2D context or a `toBlob` refusal — is retried by the next mount rather than cached as an
	 * empty document forever. That is also what the hook did before the cache existed.
	 */
	if (held.snapshot.pages.length > 0 && !held.snapshot.error) return

	// A previous attempt's partial pages, which this run is about to replace. Revoked rather
	// than left to the evictor: nothing will hold them again, and appending to them would show
	// the failed attempt's pages twice.
	revoke(held.snapshot)

	held.loading = true

	publish(src, { pages: [], documentUrl: null, loading: true, error: null })

	const pages: PdfViewerPage[] = []

	const settle = (next: Partial<PdfDocumentSnapshot>) => {
		const current = documents.get(src)

		if (current) current.loading = false

		publish(src, { loading: false, ...next })

		evict()
	}

	run({
		documentUrl: (url) => publish(src, { documentUrl: url }),
		page: (page) => {
			pages.push(page)

			publish(src, { pages: [...pages] })
		},
	}).then(
		() => settle({}),
		(reason: unknown) =>
			settle({ error: reason instanceof Error ? reason : new Error(String(reason)) }),
	)
}

/**
 * Empties the cache, revoking every resident document's blob URLs regardless of who holds them.
 *
 * @remarks For tests, which need each case to start from a known map — module state outlives a
 * `renderHook`, so without this one test's resident document is the next one's surprise cache
 * hit. Not part of any runtime path: it ignores holders and would blank a live viewer.
 * @internal
 */
export function resetDocumentCache() {
	for (const [, held] of documents) revoke(held.snapshot)

	documents.clear()
}

/**
 * Which documents are resident, in LRU order, with each one's holder and page count.
 *
 * @remarks For tests asserting the bound and the holder rule, which are the two properties that
 * keep this from being a leak and are both invisible from a snapshot alone.
 * @internal
 */
export function documentCacheState(): { src: string; holders: number; pages: number }[] {
	return [...documents].map(([src, held]) => ({
		src,
		holders: held.listeners.size,
		pages: held.snapshot.pages.length,
	}))
}
