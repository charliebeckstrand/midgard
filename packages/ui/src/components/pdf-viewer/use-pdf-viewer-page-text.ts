'use client'

import { useEffect, useMemo, useState } from 'react'
import { canReadPageText, readPageText } from './pdf-viewer-document-cache'
import type { PdfViewerTextItem } from './types'

/** Inputs to {@link usePdfViewerPageText}. @internal */
type PdfViewerPageTextOptions = {
	/** The OCR text of the consumer, if any. */
	data: readonly PdfViewerTextItem[] | undefined
	/** The `src` that the viewer loads, or `undefined` when the consumer gives `pages`. */
	src: string | undefined
	/** The 1-based page that the viewer shows, or `0` with no page. */
	page: number
	/** Whether the `src` document is still loading. Its text can be read once it opens. */
	loading: boolean
}

/**
 * The text of the page that the viewer shows, for assistive technology.
 *
 * @returns The text of the page, or `null` when the viewer has no text for it.
 * @remarks The page is an image, so its name ("Page 3") is all that a screen reader gets from
 * it. The text is the text alternative of the content of the page (WCAG 1.1.1). It comes from
 * the OCR `data` of the consumer when `data` has a run on the page, in the order of `data`.
 * Else it comes from the text that pdf.js reads off a `src` document. A scan with no OCR data
 * has no text.
 * @internal
 */
export function usePdfViewerPageText({
	data,
	src,
	page,
	loading,
}: PdfViewerPageTextOptions): string | null {
	const fromData = useMemo(() => dataText(data, page), [data, page])

	const [read, setRead] = useState<{ src: string; page: number; text: string | null } | null>(null)

	const readable = fromData === null && !!src && !loading && page > 0

	useEffect(() => {
		// A document that cannot read its text, such as a load that failed, asks nothing.
		if (!readable || !canReadPageText(src) || !src) return

		let current = true

		readPageText(src, page - 1).then((text) => {
			if (current) setRead({ src, page, text })
		})

		return () => {
			current = false
		}
	}, [readable, src, page])

	if (fromData !== null) return fromData

	// A read of another page or document is stale until the read of this one lands.
	if (!readable || read?.src !== src || read.page !== page) return null

	return read.text || null
}

/**
 * The text of `page` from the OCR `data`: its runs in the order of `data`, joined by a
 * space. `null` when no run is on the page.
 * @internal
 */
function dataText(data: readonly PdfViewerTextItem[] | undefined, page: number): string | null {
	if (!data?.length) return null

	const runs = data.filter((item) => item.page === page).map((item) => item.text.trim())

	const text = runs.filter(Boolean).join(' ')

	return text === '' ? null : text
}
