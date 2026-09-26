'use client'

import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { clamp } from '../../utilities'
import {
	EMPTY_DOCUMENT_SNAPSHOT,
	ensureDocumentLoad,
	focusPage,
	getDocumentSnapshot,
	type PdfDocumentSnapshot,
	type PdfLoadReport,
	type PdfPageRaster,
	type PdfRenderJob,
	showThumbnails,
	subscribeDocument,
} from './pdf-viewer-document-cache'
import type { PdfViewerPage } from './types'

/**
 * Loads pdf.js from its legacy build.
 *
 * @remarks The modern build calls new built-ins with no fallback: `Promise.try` on each message
 * to the worker, and `Map.prototype.getOrInsertComputed`, `Math.sumPrecise` and the
 * `Uint8Array` base64 methods. MDN's compatibility data puts its floor at Chrome 147, Firefox
 * 144 and Safari 26.2, far above the floor in `.browserslistrc`. The legacy build carries a
 * polyfill for each one. It costs about 58 KB more in this chunk and 50 KB more in the worker,
 * and both load only when a PDF opens. Its polyfills go on the globals, and only where a
 * built-in is missing.
 * @internal
 */
function loadPdfjs() {
	return import('pdfjs-dist/legacy/build/pdf.mjs')
}

/**
 * The one worker every load shares, or `null` where this environment has none.
 *
 * @remarks Held here, and handed to `getDocument` as `worker`, rather than published on
 * pdf.js's `GlobalWorkerOptions.workerPort`. Both give one thread per page instead of one per
 * load, but a global port is one pdf.js caches and half-tears-down. `loadingTask.destroy()`
 * marks the *cached* worker pending-destroy, and any `getDocument` before that round-trip
 * completes throws. That window is reachable whenever two loads overlap: one document
 * finishing while another is still opening, which two viewers on different scans do. A
 * caller-supplied worker closes it, because pdf.js never destroys one it did not create.
 * @internal
 */
let sharedWorker: import('pdfjs-dist').PDFWorker | null = null

/**
 * Resolves the worker to hand `getDocument`, creating it on first use.
 *
 * @returns The shared worker, or `null` when this environment cannot run one — in which case
 * `getDocument` is left to pdf.js's own resolution. In practice that is Node and jsdom, where
 * pdf.js pre-sets `workerSrc` itself; a browser always has `Worker`.
 * @remarks `new Worker(new URL(…, import.meta.url))` rather than a bundler-specific import.
 * Both Vite and webpack recognize that exact form and emit the worker as an asset, which a
 * `?url` query does not. Webpack resolves an `import()` specifier statically whether or not
 * the call is reachable. A Vite-only query therefore breaks the build of any app that merely
 * renders this component.
 *
 * A caller that has set `workerSrc` or `workerPort` itself keeps that choice; this defers to
 * it and creates nothing.
 * @internal
 */
async function resolveWorker(): Promise<import('pdfjs-dist').PDFWorker | null> {
	const pdfjs = await loadPdfjs()

	if (pdfjs.GlobalWorkerOptions.workerSrc || pdfjs.GlobalWorkerOptions.workerPort) return null

	if (sharedWorker) return sharedWorker

	// The repo's spelling for an absent global, and narrower than a try/catch — which would
	// also swallow a CSP `worker-src` refusal and silently downgrade every consumer to
	// main-thread rasterization.
	if (typeof Worker === 'undefined') return null

	const port = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url), {
		type: 'module',
	})

	// `PDFWorker.create`, not `new PDFWorker`: the generated types declare the constructor's
	// `port` as `null | undefined` while the static's `PDFWorkerParameters.port` is correctly
	// `Worker | undefined`. Same object either way — `create` returns the instance cached
	// against this port.
	sharedWorker = pdfjs.PDFWorker.create({ port })

	return sharedWorker
}

/** State returned by {@link usePdfViewerDocument}: the rasterized pages, a download/print URL, and load progress. @internal */
type PdfDocumentResult = PdfDocumentSnapshot & {
	/**
	 * True while a `src` has no load yet: the snapshot is still the frozen empty one.
	 *
	 * @remarks The load starts in an effect, so the first render of a cold `src` reads the empty
	 * snapshot. The server render reads it too. Without this flag, that render reads as a
	 * settled document with no pages. `loading` keeps its meaning: a run is in flight.
	 *
	 * Identity is the exact test. Every publish makes a new snapshot, so a settled load never
	 * matches, even one that rasterized no pages.
	 */
	pending: boolean
}

/**
 * The width of a thumbnail in CSS pixels: the rail, less its padding.
 *
 * @remarks The raster is this width times the device pixel ratio, up to 2x. So a thumbnail is
 * sharp on a dense screen and costs no more than the rail can show.
 * @internal
 */
const THUMBNAIL_WIDTH = 192

/**
 * Renders one parsed page onto a canvas of its own, and keeps the result.
 *
 * @returns A job that gives the raster, or `null` for a page with no 2D context or an encode
 * that fails. The rest of the document still renders. A full raster is an `ImageBitmap`, which
 * costs no encode. A thumbnail is a PNG blob URL: it is small, and the rail shows it in an
 * `<img>`.
 * @remarks The canvas lives for one render. Its backing store is freed when the render ends,
 * and the page frees its operator list. So a document keeps no canvas and no operator list
 * between renders, only the images that the cache holds.
 * @internal
 */
function renderPage(page: PDFPageProxy, raster: PdfPageRaster, scale: number): PdfRenderJob {
	const points = page.getViewport({ scale: 1 })

	const density = clamp(window.devicePixelRatio || 1, 1, 2)

	const viewport = page.getViewport({
		scale: raster === 'full' ? scale : Math.min(scale, (THUMBNAIL_WIDTH * density) / points.width),
	})

	const canvas = document.createElement('canvas')

	canvas.width = viewport.width
	canvas.height = viewport.height

	const context = canvas.getContext('2d')

	if (!context) return { promise: Promise.resolve(null), cancel: () => {} }

	const task = page.render({ canvas, canvasContext: context, viewport })

	const promise = (async () => {
		try {
			await task.promise

			if (raster === 'full') return await createImageBitmap(canvas)

			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

			return blob ? URL.createObjectURL(blob) : null
		} finally {
			canvas.width = 0
			canvas.height = 0

			page.cleanup()
		}
	})()

	return { promise, cancel: () => task.cancel() }
}

/**
 * Reads the size of each page of `doc` and publishes one slot for each, before any page renders.
 *
 * @returns The parsed pages, in order, for the render loop to reuse.
 * @remarks A parse, not a render: 50 pages take about 6 ms (the PDF viewer bench). Each slot
 * carries the size of its page at `scale` and in points. The viewport, the page count and the
 * highlight geometry are therefore whole when the document opens.
 * @internal
 */
async function openSlots(
	doc: PDFDocumentProxy,
	scale: number,
	report: PdfLoadReport,
): Promise<PDFPageProxy[]> {
	const parsed: PDFPageProxy[] = []

	const slots: PdfViewerPage[] = []

	for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
		const page = await doc.getPage(pageNum)

		const viewport = page.getViewport({ scale })

		parsed.push(page)

		slots.push({
			id: pageNum,
			src: '',
			label: `Page ${pageNum}`,
			width: viewport.width,
			height: viewport.height,
			pointWidth: viewport.width / scale,
			pointHeight: viewport.height / scale,
		})
	}

	report.open(slots)

	return parsed
}

/**
 * Fetches the PDF at `src`, publishes a slot for each page, and gives the cache the renderer of
 * its pages.
 *
 * @remarks Runs to the open or throws; it is not cancellable, because the cache owns its
 * lifetime rather than any one component — see {@link ensureDocumentLoad}. The pages render
 * after it, when the viewers ask for them (`focusPage`).
 *
 * A load that opens keeps its pdf.js document open, and hands the cache the release. The
 * document then lives as long as its cache entry, so a render needs no new parse. A load that
 * throws destroys the document itself, because a failed entry holds nothing to render.
 * @internal
 */
async function rasterizeDocument(src: string, report: PdfLoadReport): Promise<void> {
	let opened: PDFDocumentProxy | null = null

	try {
		// Independent: the worker chunk and the document itself. Serializing them costs a
		// round trip on the first open of a session.
		const [worker, response] = await Promise.all([resolveWorker(), fetch(src)])

		const pdfjs = await loadPdfjs()

		if (!response.ok) throw new Error(`Failed to fetch PDF (${response.status})`)

		const buffer = await response.arrayBuffer()

		report.documentUrl(URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' })))

		// pdf.js takes ownership of the buffer; hand over a copy
		const doc = await pdfjs.getDocument({ data: buffer.slice(0), worker: worker ?? undefined })
			.promise

		opened = doc

		const scale = clamp(window.devicePixelRatio || 1, 1.5, 2)

		const parsed = await openSlots(doc, scale, report)

		report.retain(() => doc.loadingTask.destroy())

		// The entry owns the document from here, and the `finally` must not destroy it.
		opened = null

		report.serve((index, raster) => {
			const page = parsed[index]

			if (!page) return { promise: Promise.resolve(null), cancel: () => {} }

			return renderPage(page, raster, scale)
		})
	} finally {
		// Destroy through the loading task: pdf.js 6 removed `PDFDocumentProxy.destroy`,
		// which was an alias for this. It aborts the network requests and the worker.
		opened?.loadingTask.destroy()
	}
}

/**
 * Loads a PDF from `src`, and renders the pages that the viewers ask for to blob-URL images.
 *
 * @returns `{ pages, documentUrl, loading, error, pending }`. `pages` has a slot for each page,
 * with its image once it renders. `documentUrl` is a same-origin blob URL of the source
 * document, for download and print. `loading` and `error` give the progress and the failure.
 * `pending` marks a `src` whose load has not started yet.
 * @remarks **The pages outlive this hook.** They live in a bounded module cache keyed on `src`
 * (`pdf-viewer-document-cache.ts`). A viewer that unmounts and comes back on the same
 * document re-reads the pages it already had, instead of re-fetching and re-rasterizing them.
 * That is what parking a panel by closing it does. `Overlay` gates its portal on `open`, so
 * the panel's children unmount. Before the cache, a reopen rebuilt the whole scan from its
 * skeleton.
 *
 * Read through `useSyncExternalStore` rather than mirrored into state. A cache hit is
 * therefore visible *during the first render*, and paints no intervening skeleton frame.
 * Unmounting drops this viewer's subscription, which is also what makes the document
 * evictable; it does not cancel a
 * load or revoke anything.
 * @internal
 */
export function usePdfViewerDocument(src: string | undefined): PdfDocumentResult {
	const subscribe = useCallback((listener: () => void) => subscribeDocument(src, listener), [src])

	const snapshot = useCallback(() => getDocumentSnapshot(src), [src])

	// Nothing is rasterized on the server — there is no canvas to rasterize onto — so the
	// server snapshot is the empty one every miss returns.
	const serverSnapshot = useCallback(() => EMPTY_DOCUMENT_SNAPSHOT, [])

	useEffect(() => {
		if (!src) return

		ensureDocumentLoad(src, (report) => rasterizeDocument(src, report))
	}, [src])

	const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot)

	return { ...current, pending: !!src && current === EMPTY_DOCUMENT_SNAPSHOT }
}

/**
 * Asks the cache to render the page at the 1-based `page` of `src`, for as long as this viewer
 * shows it.
 *
 * @returns The function that names the thumbnails the rail shows, as 0-based indices, or
 * `null` with no `src`.
 * @remarks The queue renders this page first, then its neighbors, then the thumbnails that the
 * rail shows. A page past the last page counts as the last page, so a viewer can ask before the
 * document opens.
 * @internal
 */
export function usePdfViewerDocumentFocus(
	src: string | undefined,
	page: number,
): ((indices: number[]) => void) | null {
	// One token for each mounted viewer, so two viewers on one document each keep a page.
	const [token] = useState(() => ({}))

	useEffect(() => focusPage(src, token, Math.max(page - 1, 0)), [src, token, page])

	const show = useCallback((indices: number[]) => showThumbnails(src, token, indices), [src, token])

	return src ? show : null
}
