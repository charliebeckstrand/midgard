'use client'

import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { clamp } from '../../utilities'
import {
	EMPTY_DOCUMENT_SNAPSHOT,
	ensureDocumentLoad,
	getDocumentSnapshot,
	type PdfDocumentSnapshot,
	type PdfLoadReport,
	subscribeDocument,
} from './pdf-viewer-document-cache'

/**
 * The one worker every load shares, or `null` where this environment has none.
 *
 * @remarks Held here, and handed to `getDocument` as `worker`, rather than published on
 * pdf.js's `GlobalWorkerOptions.workerPort`. Both give one thread per page instead of one per
 * load, but a global port is one pdf.js caches and half-tears-down: `loadingTask.destroy()`
 * marks the *cached* worker pending-destroy, and any `getDocument` before that round-trip
 * completes throws. That window is reachable whenever two loads overlap — one document
 * finishing while another is still opening, which two viewers on different scans do — and a
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
 * @remarks `new Worker(new URL(…, import.meta.url))` rather than a bundler-specific import:
 * both Vite and webpack recognise that exact form and emit the worker as an asset, which a
 * `?url` query does not — webpack resolves an `import()` specifier statically whether or not
 * the call is reachable, so a Vite-only query breaks the build of any app that merely renders
 * this component.
 *
 * A caller that has set `workerSrc` or `workerPort` itself keeps that choice; this defers to
 * it and creates nothing.
 * @internal
 */
async function resolveWorker(): Promise<import('pdfjs-dist').PDFWorker | null> {
	const pdfjs = await import('pdfjs-dist')

	if (pdfjs.GlobalWorkerOptions.workerSrc || pdfjs.GlobalWorkerOptions.workerPort) return null

	if (sharedWorker) return sharedWorker

	// The repo's spelling for an absent global, and narrower than a try/catch — which would
	// also swallow a CSP `worker-src` refusal and silently downgrade every consumer to
	// main-thread rasterization.
	if (typeof Worker === 'undefined') return null

	const port = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), {
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
type PdfDocumentResult = PdfDocumentSnapshot

/** The pdf.js handles one rasterization holds, so the `finally` can free them from one place. @internal */
type PdfRasterController = {
	doc: PDFDocumentProxy | null
	renderTask: RenderTask | null
}

/**
 * Cancels the in-flight render task and destroys the document, nulling what it
 * frees so a double call is harmless.
 *
 * @remarks Idempotent.
 * @internal
 */
function releasePdf(controller: PdfRasterController) {
	controller.renderTask?.cancel()
	controller.renderTask = null

	// Destroy through the loading task: pdf.js 6 removed `PDFDocumentProxy.destroy`,
	// which was an alias for this. It aborts the network requests and the worker.
	controller.doc?.loadingTask.destroy()
	controller.doc = null
}

/**
 * Rasterizes one already-parsed page to a blob URL and reports it.
 *
 * @remarks Each URL is reported in the same step that creates it, which is what keeps a failed
 * load from leaking: everything allocated is in the cache's snapshot by the time anything can
 * throw, and the cache is what revokes it.
 *
 * A page with no 2D context, or one `toBlob` refuses (oversized or tainted canvas), is skipped
 * rather than treated as a failure — the rest of the document still renders.
 *
 * The canvas belongs to the caller and is resized per page rather than allocated per page: at
 * up to 2× device scale a US-Letter backing store is tens of megabytes, and a fresh one per
 * page hands the whole document's worth to the collector over a long load.
 * @internal
 */
async function appendRenderedPage(
	controller: PdfRasterController,
	page: PDFPageProxy,
	pageNum: number,
	scale: number,
	report: PdfLoadReport,
	canvas: HTMLCanvasElement,
): Promise<void> {
	const viewport = page.getViewport({ scale })

	canvas.width = viewport.width
	canvas.height = viewport.height

	const context = canvas.getContext('2d')

	if (!context) return

	controller.renderTask = page.render({ canvas, canvasContext: context, viewport })

	await controller.renderTask.promise

	controller.renderTask = null

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

	if (!blob) return

	report.page({
		id: pageNum,
		src: URL.createObjectURL(blob),
		label: `Page ${pageNum}`,
		width: viewport.width,
		height: viewport.height,
		// getViewport multiplies the page's own user-space size by `scale`, so dividing it
		// back out recovers the printed size in points exactly. A highlight specified in a
		// physical unit divides by this.
		pointWidth: viewport.width / scale,
		pointHeight: viewport.height / scale,
	})
}

/**
 * Fetches the PDF at `src` and rasterizes every page in order, reporting each as it lands.
 *
 * @remarks Runs to completion or throws; it is not cancellable, because the cache owns its
 * lifetime rather than any one component — see {@link ensureDocumentLoad}. The pdf.js document
 * is destroyed in the `finally` either way, so the worker channel never outlives the load.
 * @internal
 */
async function rasterizeDocument(src: string, report: PdfLoadReport): Promise<void> {
	const controller: PdfRasterController = { doc: null, renderTask: null }

	try {
		// Independent: the worker chunk and the document itself. Serialising them costs a
		// round trip on the first open of a session.
		const [worker, response] = await Promise.all([resolveWorker(), fetch(src)])

		const pdfjs = await import('pdfjs-dist')

		if (!response.ok) throw new Error(`Failed to fetch PDF (${response.status})`)

		const buffer = await response.arrayBuffer()

		report.documentUrl(URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' })))

		// pdf.js takes ownership of the buffer; hand over a copy
		const doc = await pdfjs.getDocument({ data: buffer.slice(0), worker: worker ?? undefined })
			.promise

		controller.doc = doc

		const scale = clamp(window.devicePixelRatio || 1, 1.5, 2)

		// One canvas for the whole document — see `appendRenderedPage`.
		const canvas = document.createElement('canvas')

		/*
		 * The next page's parse, started before this one renders.
		 *
		 * `getPage` is worker-side while `render` and `toBlob` hold the main thread, so awaiting
		 * them in turn left the worker idle for the whole of each page's render and PNG encode.
		 * Queuing the next parse first overlaps the two. Rendering itself stays strictly serial:
		 * there is one `controller.renderTask` slot, and its cancel semantics depend on that.
		 *
		 * The no-op catch marks the prefetch handled. Without it, a parse that rejects while the
		 * loop is already unwinding from an earlier failure would surface as an unhandled
		 * rejection; the loop's own `await` still sees the rejection and throws it.
		 */
		let pending: Promise<PDFPageProxy> | null = doc.getPage(1)

		pending.catch(() => {})

		for (let i = 1; i <= doc.numPages; i++) {
			if (!pending) break

			const page = await pending

			pending = i < doc.numPages ? doc.getPage(i + 1) : null

			pending?.catch(() => {})

			await appendRenderedPage(controller, page, i, scale, report, canvas)
		}

		// Frees the backing store rather than waiting for the element to be collected.
		canvas.width = 0
		canvas.height = 0
	} finally {
		releasePdf(controller)
	}
}

/**
 * Loads a PDF from `src` and rasterizes its pages to blob-URL images for the viewer.
 *
 * @returns `{ pages, documentUrl, loading, error }`: the rendered pages, a same-origin blob URL
 * for the source document (download / print), plus load progress and failure state.
 * @remarks **The pages outlive this hook.** They live in a bounded module cache keyed on `src`
 * (`pdf-viewer-document-cache.ts`), so a viewer that unmounts and comes back on the same
 * document re-reads the pages it already had instead of re-fetching and re-rasterizing them.
 * That is what parking a panel by closing it does — `Overlay` gates its portal on `open`, so the
 * panel's children unmount — and before the cache, reopening rebuilt the whole scan from its
 * skeleton.
 *
 * Read through `useSyncExternalStore` rather than mirrored into state, so a cache hit is visible
 * *during the first render* and paints no intervening skeleton frame. Unmounting drops this
 * viewer's subscription, which is also what makes the document evictable; it does not cancel a
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

	return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
