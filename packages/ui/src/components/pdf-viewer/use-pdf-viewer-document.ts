'use client'

import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useState } from 'react'
import { clamp } from '../../utilities'
import type { PdfViewerPage } from './types'

async function configureWorker() {
	const pdfjs = await import('pdfjs-dist')

	// Skip the worker URL import once workerSrc is set; a pre-configured
	// workerSrc (runtime or test) bypasses the Vite-specific `?url` import,
	// which does not resolve outside a Vite build.
	if (pdfjs.GlobalWorkerOptions.workerSrc) return

	const workerUrlModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')

	pdfjs.GlobalWorkerOptions.workerSrc = workerUrlModule.default
}

type PdfDocumentResult = {
	pages: PdfViewerPage[]
	/** Same-origin blob URL for the fetched PDF. Use this for download / print iframes. */
	documentUrl: string | null
	loading: boolean
	error: Error | null
}

// Mutable state shared between the async load and the effect cleanup. Cleanup
// flips `cancelled` and frees whatever the load has allocated so far.
type PdfLoadController = {
	cancelled: boolean
	createdUrls: string[]
	docBlobUrl: string | null
	doc: PDFDocumentProxy | null
	renderTask: RenderTask | null
}

type PdfLoadHandlers = {
	setPages: (pages: PdfViewerPage[]) => void
	setDocumentUrl: (url: string | null) => void
	setLoading: (loading: boolean) => void
	setError: (error: Error | null) => void
}

// Idempotent: cancels the in-flight render task and destroys the document,
// nulling what it frees so the async path and cleanup can both call it.
function releasePdf(controller: PdfLoadController) {
	controller.renderTask?.cancel()
	controller.renderTask = null

	controller.doc?.destroy()
	controller.doc = null
}

// Rasterize one page to a blob URL and append it. Returns 'cancelled' when the
// load was torn down mid-flight so the caller can release and bail.
async function appendRenderedPage(
	controller: PdfLoadController,
	pageNum: number,
	scale: number,
	pages: PdfViewerPage[],
	handlers: PdfLoadHandlers,
): Promise<'ok' | 'cancelled'> {
	const doc = controller.doc

	if (!doc) return 'cancelled'

	const page = await doc.getPage(pageNum)

	if (controller.cancelled) return 'cancelled'

	const viewport = page.getViewport({ scale })

	const canvas = document.createElement('canvas')

	canvas.width = viewport.width
	canvas.height = viewport.height

	const context = canvas.getContext('2d')

	// No 2D context (skip this page); keep loading the rest.
	if (!context) return 'ok'

	controller.renderTask = page.render({ canvas, canvasContext: context, viewport })

	await controller.renderTask.promise

	controller.renderTask = null

	if (controller.cancelled) return 'cancelled'

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

	if (!blob || controller.cancelled) return 'cancelled'

	const url = URL.createObjectURL(blob)

	controller.createdUrls.push(url)

	pages.push({
		id: pageNum,
		src: url,
		label: `Page ${pageNum}`,
		width: viewport.width,
		height: viewport.height,
	})

	handlers.setPages([...pages])

	return 'ok'
}

async function loadPdfDocument(
	src: string,
	controller: PdfLoadController,
	handlers: PdfLoadHandlers,
) {
	try {
		await configureWorker()

		const pdfjs = await import('pdfjs-dist')

		if (controller.cancelled) return

		const response = await fetch(src)

		if (!response.ok) throw new Error(`Failed to fetch PDF (${response.status})`)

		const buffer = await response.arrayBuffer()

		if (controller.cancelled) return

		controller.docBlobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))

		handlers.setDocumentUrl(controller.docBlobUrl)

		// pdf.js takes ownership of the buffer; hand over a copy
		const doc = await pdfjs.getDocument({ data: buffer.slice(0) }).promise

		controller.doc = doc

		// `doc` is assigned after `getDocument` resolves; release here if cleanup
		// already ran.
		if (controller.cancelled) {
			releasePdf(controller)

			return
		}

		const scale = clamp(window.devicePixelRatio || 1, 1.5, 2)

		const pages: PdfViewerPage[] = []

		for (let i = 1; i <= doc.numPages; i++) {
			const status = await appendRenderedPage(controller, i, scale, pages, handlers)

			if (status === 'cancelled') {
				releasePdf(controller)

				return
			}
		}

		// Pages are fully rasterized; free the document eagerly.
		releasePdf(controller)

		if (!controller.cancelled) handlers.setLoading(false)
	} catch (err) {
		releasePdf(controller)

		if (controller.cancelled) return

		handlers.setError(err instanceof Error ? err : new Error(String(err)))

		handlers.setLoading(false)
	}
}

export function usePdfViewerDocument(src: string | undefined): PdfDocumentResult {
	const [pages, setPages] = useState<PdfViewerPage[]>([])

	const [documentUrl, setDocumentUrl] = useState<string | null>(null)

	const [loading, setLoading] = useState(false)

	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		if (!src) {
			setPages([])
			setDocumentUrl(null)
			setLoading(false)
			setError(null)

			return
		}

		const controller: PdfLoadController = {
			cancelled: false,
			createdUrls: [],
			docBlobUrl: null,
			doc: null,
			renderTask: null,
		}

		setPages([])
		setDocumentUrl(null)
		setLoading(true)
		setError(null)

		void loadPdfDocument(src, controller, { setPages, setDocumentUrl, setLoading, setError })

		return () => {
			controller.cancelled = true

			releasePdf(controller)

			for (const url of controller.createdUrls) URL.revokeObjectURL(url)

			if (controller.docBlobUrl) URL.revokeObjectURL(controller.docBlobUrl)
		}
	}, [src])

	return { pages, documentUrl, loading, error }
}
