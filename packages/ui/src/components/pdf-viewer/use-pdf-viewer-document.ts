'use client'

import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useState } from 'react'
import { clamp } from '../../utilities'
import type { PdfViewerPage } from './types'

async function configureWorker() {
	const pdfjs = await import('pdfjs-dist')

	// Skip the worker URL import once workerSrc is set — this also lets the
	// runtime (or a test) pre-configure workerSrc and bypass the Vite-specific
	// `?url` import, which is not reliably resolvable outside a Vite build.
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

		let cancelled = false

		const createdUrls: string[] = []
		let docBlobUrl: string | null = null

		// Held in the effect scope so cleanup can tear down the pdf.js lifecycle:
		// an in-flight render task must be cancelled and the document destroyed,
		// or both leak worker-side memory. `releasePdf` is idempotent (it nulls
		// what it frees) so the async path and the cleanup can both call it.
		let doc: PDFDocumentProxy | null = null
		let renderTask: RenderTask | null = null

		const releasePdf = () => {
			renderTask?.cancel()
			renderTask = null

			doc?.destroy()
			doc = null
		}

		setPages([])
		setDocumentUrl(null)
		setLoading(true)
		setError(null)

		;(async () => {
			try {
				await configureWorker()

				const pdfjs = await import('pdfjs-dist')

				if (cancelled) return

				const response = await fetch(src)

				if (!response.ok) throw new Error(`Failed to fetch PDF (${response.status})`)

				const buffer = await response.arrayBuffer()

				if (cancelled) return

				docBlobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))

				setDocumentUrl(docBlobUrl)

				// pdf.js takes ownership of the buffer, so hand over a copy
				doc = await pdfjs.getDocument({ data: buffer.slice(0) }).promise

				// Cleanup may have run while getDocument was in flight — `doc` is
				// only assigned now, so the cleanup's `releasePdf` saw null. Release here.
				if (cancelled) {
					releasePdf()

					return
				}

				const scale = clamp(window.devicePixelRatio || 1, 1.5, 2)

				const next: PdfViewerPage[] = []

				for (let i = 1; i <= doc.numPages; i++) {
					const page = await doc.getPage(i)

					if (cancelled) {
						releasePdf()

						return
					}

					const viewport = page.getViewport({ scale })

					const canvas = document.createElement('canvas')

					canvas.width = viewport.width
					canvas.height = viewport.height

					const context = canvas.getContext('2d')

					if (!context) continue

					renderTask = page.render({ canvas, canvasContext: context, viewport })

					await renderTask.promise

					renderTask = null

					if (cancelled) {
						releasePdf()

						return
					}

					const blob = await new Promise<Blob | null>((resolve) =>
						canvas.toBlob(resolve, 'image/png'),
					)

					if (!blob || cancelled) {
						releasePdf()

						return
					}

					const url = URL.createObjectURL(blob)

					createdUrls.push(url)

					next.push({
						id: i,
						src: url,
						label: `Page ${i}`,
						width: viewport.width,
						height: viewport.height,
					})

					setPages([...next])
				}

				// Pages are rasterized to PNG blobs now; the document is no longer
				// needed, so free it eagerly rather than waiting for unmount.
				releasePdf()

				if (!cancelled) setLoading(false)
			} catch (err) {
				releasePdf()

				if (cancelled) return

				setError(err instanceof Error ? err : new Error(String(err)))

				setLoading(false)
			}
		})()

		return () => {
			cancelled = true

			releasePdf()

			for (const url of createdUrls) URL.revokeObjectURL(url)

			if (docBlobUrl) URL.revokeObjectURL(docBlobUrl)
		}
	}, [src])

	return { pages, documentUrl, loading, error }
}
