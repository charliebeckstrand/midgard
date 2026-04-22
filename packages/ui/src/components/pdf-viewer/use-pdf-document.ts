'use client'

import { useEffect, useState } from 'react'
import type { PdfViewerPage } from './component'

let workerConfigured = false

async function configureWorker() {
	if (workerConfigured) return

	const [pdfjs, workerUrlModule] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
	])

	pdfjs.GlobalWorkerOptions.workerSrc = workerUrlModule.default

	workerConfigured = true
}

export type UsePdfDocumentResult = {
	pages: PdfViewerPage[]
	/** Same-origin blob URL for the fetched PDF. Use this for download / print iframes. */
	documentUrl: string | null
	isLoading: boolean
	error: Error | null
}

export function usePdfDocument(src: string | undefined): UsePdfDocumentResult {
	const [pages, setPages] = useState<PdfViewerPage[]>([])

	const [documentUrl, setDocumentUrl] = useState<string | null>(null)

	const [isLoading, setIsLoading] = useState(false)

	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		if (!src) {
			setPages([])
			setDocumentUrl(null)
			setIsLoading(false)
			setError(null)

			return
		}

		let cancelled = false

		const createdUrls: string[] = []
		let docBlobUrl: string | null = null

		setPages([])
		setDocumentUrl(null)
		setIsLoading(true)
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
				const doc = await pdfjs.getDocument({ data: buffer.slice(0) }).promise

				if (cancelled) {
					doc.destroy()

					return
				}

				const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2)

				const next: PdfViewerPage[] = []

				for (let i = 1; i <= doc.numPages; i++) {
					const page = await doc.getPage(i)

					if (cancelled) return

					const viewport = page.getViewport({ scale })

					const canvas = document.createElement('canvas')

					canvas.width = viewport.width
					canvas.height = viewport.height

					const ctx = canvas.getContext('2d')

					if (!ctx) continue

					await page.render({ canvas, canvasContext: ctx, viewport }).promise

					if (cancelled) return

					const blob = await new Promise<Blob | null>((resolve) =>
						canvas.toBlob(resolve, 'image/png'),
					)

					if (!blob || cancelled) return

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

				if (!cancelled) setIsLoading(false)
			} catch (err) {
				if (cancelled) return

				setError(err instanceof Error ? err : new Error(String(err)))

				setIsLoading(false)
			}
		})()

		return () => {
			cancelled = true

			for (const url of createdUrls) URL.revokeObjectURL(url)

			if (docBlobUrl) URL.revokeObjectURL(docBlobUrl)
		}
	}, [src])

	return { pages, documentUrl, isLoading, error }
}
