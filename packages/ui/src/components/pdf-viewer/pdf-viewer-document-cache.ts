'use client'

import { clamp } from '../../utilities'
import type { PdfViewerPage, PdfViewerSlot } from './types'

/**
 * How many documents' rasterized pages stay resident.
 *
 * Small on purpose. An entry holds one PNG blob per page at up to 2× device scale. A long
 * document is therefore megabytes, and the bound has to be a real one rather than a reassurance.
 *
 * Four rather than one, because a reader moves between documents as well as parking one. A cap
 * of one would evict the scan they are coming back to, the moment they glance at the next. Four
 * covers that shuttle and still bounds the resident set at a handful of documents.
 * @internal
 */
const MAX_DOCUMENTS = 4

/**
 * How many full rasters of one document stay resident.
 *
 * @remarks A reader can go back through this many pages with no render. The pages that a
 * viewer shows, and their neighbors, stay whatever the bound, so the bound applies to the
 * pages that the reader has left. At 1.5x a page is about 200 KiB as PNG and 4.2 MiB decoded.
 * @internal
 */
const MAX_RASTERS = 8

/**
 * How many bytes of full-raster bitmaps all the documents hold together.
 *
 * @remarks A bitmap is always decoded: a US-Letter page is 7.4 MiB at 2x, where its PNG was
 * about 270 KiB. With {@link MAX_RASTERS} alone, 4 documents hold up to about 236 MiB on a 2x
 * screen. A phone browser can stop a page that holds that much. The pages that a viewer wants stay whatever
 * the budget. The other bitmaps go, those of the least recently used document first.
 * @internal
 */
const BITMAP_BUDGET = 48 * 1024 * 1024

/** What a viewer observes for one `src`: a slot for each page, with its image once it renders, a download/print URL, and load progress. @internal */
export type PdfDocumentSnapshot = {
	pages: PdfViewerSlot[]
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
 * miss allocates a fresh one. The shared identity is therefore a correctness requirement rather
 * than a saving.
 * @internal
 */
const EMPTY: PdfDocumentSnapshot = Object.freeze({
	// The array is frozen too, not just the record around it: this is a process-wide singleton
	// handed to every miss, and one consumer pushing into it would corrupt all of them.
	pages: Object.freeze([]) as unknown as PdfViewerSlot[],
	documentUrl: null,
	loading: false,
	error: null,
})

/**
 * The empty snapshot, for a caller that needs one without consulting the map. That is the
 * server render, where there is no canvas to rasterize onto and so never anything resident.
 *
 * @remarks The same frozen instance {@link getDocumentSnapshot} returns on a miss. A
 * `useSyncExternalStore` server snapshot is therefore `Object.is`-equal to the client's first
 * miss, and hydration sees no change.
 * @internal
 */
export const EMPTY_DOCUMENT_SNAPSHOT = EMPTY

/** The two rasters of a page: the image that the viewport shows, and the small one for the rail. @internal */
export type PdfPageRaster = 'full' | 'thumbnail'

/**
 * One render of one page.
 *
 * @remarks `promise` gives the raster, or `null` when the page cannot render (no 2D context,
 * or an encode that fails). A full raster is an `ImageBitmap`, or a blob URL. A thumbnail is a
 * blob URL. `cancel` stops the render. The promise then rejects, and the queue
 * ignores that rejection.
 * @internal
 */
export type PdfRenderJob = {
	promise: Promise<PdfRasterResult>
	cancel: () => void
}

/** What a render gives: a blob URL, a bitmap, or `null` for a page that cannot render. @internal */
export type PdfRasterResult = string | ImageBitmap | null

/** Renders the page at a 0-based index. The load gives one to the cache when the document opens. @internal */
export type PdfPageRenderer = (index: number, raster: PdfPageRaster) => PdfRenderJob

/** The render in flight for an entry. @internal */
type RunningJob = {
	index: number
	raster: PdfPageRaster
	job: PdfRenderJob
	/** True when the queue canceled the job, so that its rejection is not a failure. */
	canceled: boolean
}

/**
 * One resident document: what viewers read, who is watching it, and whether a load is running.
 *
 * @remarks `listeners` doubles as the holder count. Every mounted viewer subscribes for as long
 * as it is showing this `src`. A non-empty set therefore means "someone is looking at this".
 * That is exactly what eviction has to respect, and why there is no separate reference count
 * beside it.
 * @internal
 */
type Held = {
	snapshot: PdfDocumentSnapshot
	listeners: Set<() => void>
	/** True while a rasterization is running, so a second viewer joins it instead of starting one. */
	loading: boolean
	/**
	 * Frees what the load keeps open for the life of the entry: the parsed pdf.js document.
	 *
	 * @remarks The entry calls it when it leaves the cache, which is the rule that frees its blob
	 * URLs too. A later render of any page then needs no new fetch and no new parse.
	 */
	release: (() => void) | null
	/** Renders one page on request, from the document that the load keeps open. */
	renderer: PdfPageRenderer | null
	/**
	 * The page that each viewer shows, as a 0-based index, keyed by a token of the viewer.
	 *
	 * @remarks Insertion order is the order of focus: {@link focusPage} re-inserts, so the
	 * last entry is the viewer that moved last, and the queue serves it first.
	 */
	focus: Map<object, number>
	/** The pages that have a full raster from the queue, the least recently rendered first. */
	rasters: number[]
	/** The rasters that the renderer could not make, as `index:raster`, so the queue does not ask again. */
	skipped: Set<string>
	job: RunningJob | null
}

/**
 * Resident documents, keyed by `src`.
 *
 * A module map rather than component state, because outliving the component is the whole
 * point. A panel that parks by *closing* — `Overlay` gates its portal on `open` — unmounts
 * its children, the viewer included. Everything the viewer held in state or in an effect's
 * closure goes with them. Reopening therefore re-fetches and re-rasterizes a document the
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
 * Frees the blob URLs and the bitmaps a snapshot owns.
 *
 * @remarks A snapshot owns blob URLs and bitmaps only. The pdf.js document that a load keeps open belongs
 * to the entry, and {@link free} releases it. Safe on a partial snapshot too, which is what a
 * failed load leaves behind.
 * @internal
 */
function revoke(snapshot: PdfDocumentSnapshot) {
	if (snapshot.documentUrl) URL.revokeObjectURL(snapshot.documentUrl)

	// A page that has not rendered yet has an empty `src`, and owns no URL.
	for (const page of snapshot.pages) {
		if (page.src) URL.revokeObjectURL(page.src)

		if (page.thumbnail) URL.revokeObjectURL(page.thumbnail)

		page.bitmap?.close()
	}
}

/**
 * Frees the entry's blob URLs and the document that its load keeps open.
 *
 * @remarks Idempotent: the release runs once, and a second call finds it gone.
 * @internal
 */
function free(held: Held) {
	// Stop the queue before the release destroys the document that it renders from.
	held.renderer = null

	if (held.job) {
		held.job.canceled = true

		held.job.job.cancel()
	}

	held.job = null

	held.rasters = []

	held.skipped.clear()

	revoke(held.snapshot)

	held.release?.()

	held.release = null
}

/**
 * Drops least-recently-used documents until at most {@link MAX_DOCUMENTS} remain.
 *
 * @remarks Skips anything a viewer is watching, and anything mid-load. A watched entry's blob
 * URLs are live `<img>` sources, and revoking one blanks the page a reader is looking at. The
 * holders therefore outrank the cap, and a run with every entry held frees nothing. A viewer
 * subscribes only while it is mounted. Thus the held set is only as large as the number of
 * viewers that a consumer mounts.
 * @internal
 */
function evict() {
	if (documents.size <= MAX_DOCUMENTS) return

	for (const [src, held] of documents) {
		if (documents.size <= MAX_DOCUMENTS) return

		if (held.loading || held.listeners.size > 0) continue

		documents.delete(src)

		free(held)
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

	const held: Held = {
		snapshot: EMPTY,
		listeners: new Set(),
		loading: false,
		release: null,
		renderer: null,
		focus: new Map(),
		rasters: [],
		skipped: new Set(),
		job: null,
	}

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
 * skeleton first, which is the flicker this cache exists to remove. The synchronousness is
 * therefore the point rather than an optimization.
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
 * @remarks Registering interest also creates the record and marks it most recently used. A
 * listener added before the load starts therefore has somewhere to live, and a document being
 * looked at cannot be the next one evicted. Such a record holds nothing until a load fills it,
 * and is evictable the moment its last listener goes.
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
 * as it renders. The old behavior showed nothing until the last page landed, which is what the
 * hook did with `setPages` before the pages outlived it.
 * @internal
 */
export type PdfLoadReport = {
	documentUrl: (url: string) => void
	/**
	 * Publishes one slot for each page of the document, before any page renders.
	 *
	 * @remarks A slot carries the page's size and label, and an empty `src`. The page count,
	 * the page navigation, and the highlight geometry read the slots, so they are whole when
	 * the document opens.
	 */
	open: (slots: PdfViewerPage[]) => void
	/**
	 * Publishes one rendered page.
	 *
	 * @param index - The 0-based position of the page. Omitted, the page goes after the pages
	 * that this load reported before it.
	 */
	page: (page: PdfViewerPage, index?: number) => void
	/** Gives the entry what to free when it leaves the cache. See `Held.release`. */
	retain: (release: () => void) => void
	/**
	 * Gives the entry the renderer of its pages. From then on, the queue renders the pages
	 * that the viewers ask for.
	 */
	serve: (renderer: PdfPageRenderer) => void
}

/** Rasterizes a document, reporting each page as it lands. @internal */
export type PdfLoadRun = (report: PdfLoadReport) => Promise<void>

/**
 * Opens the document at `src` unless a load is running or an open document is already
 * resident.
 *
 * @remarks The guard is what makes a park cheap and a duplicate viewer free. A maximize finds
 * the pages already there and runs nothing. A second viewer on the same `src` joins the first
 * one's load, instead of fetching the file twice.
 *
 * A load is **not** canceled when the viewer that started it unmounts. Parking mid-open
 * therefore keeps opening, and the maximize finds an open document where canceling meant
 * starting over. The doc on `sharedWorker` shows that this window is reachable. The pages are
 * another matter: the queue renders only for a viewer that shows the document, so a parked
 * document costs no render ({@link focusPage}).
 *
 * A failure is reported to current subscribers but not remembered: the record keeps its error
 * for them to render, and the next mount retries. So a transient network failure is recovered
 * by parking and maximizing rather than cached as a permanent one.
 *
 * A failure that left partial pages is the exception while another viewer holds them. Those
 * pages are live `<img>` sources, so a retry does not revoke them. That error recovers only
 * when its last holder unmounts. The evictor keeps the same holder rule.
 * @internal
 */
export function ensureDocumentLoad(src: string | undefined, run: PdfLoadRun) {
	if (!src) return

	const held = heldFor(src)

	if (held.loading) return

	/*
	 * A finished document, which is the whole point of the cache. Nothing is loading, no error
	 * stands, and pages are present, so this is a complete rasterization to reuse.
	 *
	 * Pages-present rather than a `done` flag. The one case they disagree on is a document that
	 * opened with no page and threw nothing. The next mount retries it, rather than caching an
	 * empty document forever. A page that a render skipped (no 2D context, or a `toBlob`
	 * refusal) keeps its slot with no image, and the document stays resident.
	 *
	 * A failed attempt's partial pages stay too while a viewer holds them. A retry would revoke
	 * the blob URLs that viewer renders, and blank its page. The hook runs this before it
	 * subscribes, so the listeners here are the other viewers only.
	 */
	const resident = held.snapshot

	if (resident.pages.length > 0 && (!resident.error || held.listeners.size > 0)) return

	// A previous attempt's partial pages, which this run is about to replace. Freed rather
	// than left to the evictor: no viewer holds them, and appending to them would show the
	// failed attempt's pages twice.
	free(held)

	held.loading = true

	publish(src, { pages: [], documentUrl: null, loading: true, error: null })

	let pages: PdfViewerPage[] = []

	let reported = 0

	const settle = (next: Partial<PdfDocumentSnapshot>) => {
		const current = documents.get(src)

		if (current) current.loading = false

		publish(src, { loading: false, ...next })

		evict()
	}

	run({
		documentUrl: (url) => publish(src, { documentUrl: url }),
		open: (slots) => {
			pages = [...slots]

			publish(src, { pages: [...pages] })
		},
		page: (page, index = reported) => {
			reported += 1

			pages[index] = page

			publish(src, { pages: [...pages] })
		},
		retain: (release) => {
			const current = documents.get(src)

			// An entry that left the cache while its load ran has nobody to free this later.
			if (current === held) held.release = release
			else release()
		},
		serve: (renderer) => {
			if (documents.get(src) !== held) return

			held.renderer = renderer

			pump(src, held)
		},
	}).then(
		() => settle({}),
		(reason: unknown) =>
			settle({ error: reason instanceof Error ? reason : new Error(String(reason)) }),
	)
}

/**
 * The pages that the viewers of `held` want as full rasters, the most wanted first.
 *
 * @remarks The page that each viewer shows comes first, the viewer that moved last before
 * the others. The page after each one follows, then the page before it. A focus past the
 * last page counts as the last page, because the viewer asks before it knows the count.
 * @internal
 */
function wantedPages(held: Held): number[] {
	const count = held.snapshot.pages.length

	if (count === 0) return []

	const shown = [...held.focus.values()].reverse().map((index) => clamp(index, 0, count - 1))

	const wanted = new Set(shown)

	for (const index of shown) {
		if (index + 1 < count) wanted.add(index + 1)

		if (index > 0) wanted.add(index - 1)
	}

	return [...wanted]
}

/**
 * The next render that the queue owes, or `null` when it owes nothing.
 *
 * @remarks The full rasters of the wanted pages come first. Then the thumbnails of the rail
 * follow in page order. The queue does nothing while no viewer shows the document.
 * @internal
 */
function nextJob(held: Held, wanted: number[]): { index: number; raster: PdfPageRaster } | null {
	if (held.focus.size === 0 || held.snapshot.error) return null

	const { pages } = held.snapshot

	for (const index of wanted) {
		if (!hasRaster(pages[index]) && !held.skipped.has(`${index}:full`)) {
			return { index, raster: 'full' }
		}
	}

	for (const [index, page] of pages.entries()) {
		if (!page.thumbnail && !held.skipped.has(`${index}:thumbnail`)) {
			return { index, raster: 'thumbnail' }
		}
	}

	return null
}

/** Whether a slot has its full raster, as a blob URL or as a bitmap. @internal */
export function hasRaster(page: PdfViewerSlot | undefined): boolean {
	return !!(page?.src || page?.bitmap)
}

/** The bytes that the bitmap of a slot holds. @internal */
function bitmapBytes(page: PdfViewerSlot | undefined): number {
	return page?.bitmap ? page.bitmap.width * page.bitmap.height * 4 : 0
}

/**
 * Drops the full raster of the page at `index`, and frees its URL or its bitmap.
 *
 * @returns The pages with the slot emptied: a copy when `pages` is the published array.
 * @internal
 */
function dropRaster(held: Held, pages: PdfViewerSlot[], index: number): PdfViewerSlot[] {
	const page = pages[index]

	held.rasters = held.rasters.filter((resident) => resident !== index)

	if (!page) return pages

	if (page.src) URL.revokeObjectURL(page.src)

	page.bitmap?.close()

	const next = pages === held.snapshot.pages ? [...pages] : pages

	next[index] = { ...page, src: '', bitmap: undefined }

	return next
}

/**
 * Drops the oldest full rasters until at most {@link MAX_RASTERS} remain.
 *
 * @remarks A page that a viewer wants keeps its raster. The page then renders again when a
 * reader comes back to it.
 * @returns The pages with the dropped rasters removed.
 * @internal
 */
function boundRasters(held: Held, pages: PdfViewerSlot[], wanted: number[]): PdfViewerSlot[] {
	let next = pages

	for (const index of [...held.rasters]) {
		if (held.rasters.length <= MAX_RASTERS) break

		if (!wanted.includes(index)) next = dropRaster(held, next, index)
	}

	return next
}

/**
 * Drops the oldest bitmaps of all the documents until they fit {@link BITMAP_BUDGET}.
 *
 * @remarks The least recently used document gives up its bitmaps first. Within a document, the
 * least recently rendered page goes first. A page that a viewer wants keeps its bitmap.
 * @internal
 */
function trimBitmaps() {
	let total = 0

	for (const held of documents.values()) {
		for (const page of held.snapshot.pages) total += bitmapBytes(page)
	}

	for (const [src, held] of documents) {
		if (total <= BITMAP_BUDGET) return

		total -= trimDocument(src, held, total - BITMAP_BUDGET)
	}
}

/**
 * Drops the oldest bitmaps of one document that no viewer wants, until `excess` bytes are free.
 *
 * @returns The bytes that it freed.
 * @internal
 */
function trimDocument(src: string, held: Held, excess: number): number {
	const wanted = wantedPages(held)

	let pages = held.snapshot.pages

	let freed = 0

	for (const index of [...held.rasters]) {
		if (freed >= excess) break

		const bytes = bitmapBytes(pages[index])

		if (bytes === 0 || wanted.includes(index)) continue

		pages = dropRaster(held, pages, index)

		freed += bytes
	}

	if (pages !== held.snapshot.pages) publish(src, { pages })

	return freed
}

/**
 * Puts the result of a finished render into the snapshot of `src`.
 *
 * @remarks A URL that lands after a free (an eviction, a reset, or a retry) has no owner, so it
 * is revoked here. A render that failed, and was not canceled, is a failure of the document.
 * @internal
 */
function land(src: string, held: Held, running: RunningJob, result: PdfRasterResult | Error) {
	// A free clears the job, so a render that it stopped is no longer the job of the entry.
	const current = documents.get(src) === held && held.job === running && held.renderer !== null

	if (held.job === running) held.job = null

	if (!current) {
		if (!(result instanceof Error)) discard(result)

		return
	}

	const { index, raster } = running

	if (result instanceof Error) {
		if (running.canceled) return pump(src, held)

		return publish(src, { error: result })
	}

	if (result === null) {
		held.skipped.add(`${index}:${raster}`)

		return pump(src, held)
	}

	const page = held.snapshot.pages[index]

	// A thumbnail must be a URL, because the rail shows it in an `<img>`. Anything else counts
	// as a page that cannot render, so the queue does not ask for it again.
	if (!page || (raster === 'thumbnail' && typeof result !== 'string')) {
		discard(result)

		held.skipped.add(`${index}:${raster}`)

		return pump(src, held)
	}

	const pages = place(held, index, raster, result)

	// The next job starts before the publish, so a subscriber that reads the state sees the
	// queue busy until its last render lands.
	held.snapshot = { ...held.snapshot, pages }

	pump(src, held)

	publish(src, {})

	if (raster === 'full') trimBitmaps()
}

/**
 * The pages of `held` with the raster of a finished render in its slot.
 *
 * @remarks A full raster joins the resident set, and the set then keeps its bound.
 * @internal
 */
function place(
	held: Held,
	index: number,
	raster: PdfPageRaster,
	result: string | ImageBitmap,
): PdfViewerSlot[] {
	const pages = [...held.snapshot.pages]

	const page = pages[index]

	if (!page) return pages

	if (raster === 'thumbnail') {
		pages[index] = { ...page, thumbnail: result as string }

		return pages
	}

	pages[index] = typeof result === 'string' ? { ...page, src: result } : { ...page, bitmap: result }

	held.rasters = [...held.rasters.filter((resident) => resident !== index), index]

	return boundRasters(held, pages, wantedPages(held))
}

/** Frees a raster that has no slot to go into. @internal */
function discard(result: PdfRasterResult) {
	if (typeof result === 'string') URL.revokeObjectURL(result)
	else result?.close()
}

/**
 * Starts the next render that `held` owes, and cancels a full render that nobody wants now.
 *
 * @remarks One render at a time. A canceled render frees the queue when its promise rejects,
 * and the queue then starts the page that the reader moved to.
 * @internal
 */
function pump(src: string, held: Held) {
	const { renderer } = held

	if (!renderer) return

	const wanted = wantedPages(held)

	if (held.job) {
		const { job } = held

		if (job.raster === 'full' && !job.canceled && !wanted.includes(job.index)) {
			job.canceled = true

			job.job.cancel()
		}

		return
	}

	const next = nextJob(held, wanted)

	if (!next) return

	const running: RunningJob = { ...next, job: renderer(next.index, next.raster), canceled: false }

	held.job = running

	running.job.promise.then(
		(url) => land(src, held, running, url),
		(reason: unknown) =>
			land(src, held, running, reason instanceof Error ? reason : new Error(String(reason))),
	)
}

/**
 * Shows the page at the 0-based `index` of `src` in the viewer that `token` names.
 *
 * @returns The function that removes the focus of the viewer.
 * @remarks The queue renders the page that each viewer shows, and its neighbors, before the
 * other pages. A focus that moves cancels a render that nobody wants now.
 * @internal
 */
export function focusPage(src: string | undefined, token: object, index: number): () => void {
	if (!src) return () => {}

	const held = heldFor(src)

	held.focus.delete(token)

	held.focus.set(token, index)

	pump(src, held)

	return () => {
		held.focus.delete(token)

		if (documents.get(src) === held) pump(src, held)
	}
}

/**
 * Empties the cache, revoking every resident document's blob URLs regardless of who holds them.
 *
 * @remarks For tests, which need each case to start from a known map. Module state outlives a
 * `renderHook`, so without this one test's resident document is the next one's surprise cache
 * hit. Not part of any runtime path: it ignores holders and would blank a live viewer.
 * @internal
 */
export function resetDocumentCache() {
	for (const [, held] of documents) free(held)

	documents.clear()
}

/**
 * Which documents are resident, in LRU order, with each one's holder and page count.
 *
 * @remarks For tests asserting the bound and the holder rule. Those are the two properties that
 * keep this from being a leak, and both are invisible from a snapshot alone.
 * @internal
 */
export function documentCacheState(): {
	src: string
	holders: number
	pages: number
	rasters: number
	bitmapBytes: number
	thumbnails: number
	rendering: boolean
}[] {
	return [...documents].map(([src, held]) => ({
		src,
		holders: held.listeners.size,
		pages: held.snapshot.pages.length,
		rasters: held.snapshot.pages.filter(hasRaster).length,
		bitmapBytes: held.snapshot.pages.reduce((sum, page) => sum + bitmapBytes(page), 0),
		thumbnails: held.snapshot.pages.filter((page) => page.thumbnail).length,
		rendering: held.job !== null,
	}))
}
