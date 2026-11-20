'use client'

import type { ReactNode } from 'react'
import { PdfViewerSearchContext } from './context'
import { type PdfViewerSearchInput, usePdfViewerSearch } from './use-pdf-viewer-search'

/** Props for {@link PdfViewerSearchProvider}: the hook's own options, plus the subtree it scopes. @internal */
type PdfViewerSearchProviderProps = PdfViewerSearchInput & { children: ReactNode }

/**
 * Owns the state of the search and scopes it to the toolbar and the viewport.
 *
 * @remarks A component rather than a call inside `PdfViewer`, because the query lives here. A
 * key that the reader types renders this provider and its two consumers again: the toolbar
 * control and the layer of matches. The `children` keep their identity, so React skips the
 * rest of the toolbar, the thumbnail rail, and the page.
 * @internal
 */
export function PdfViewerSearchProvider({ children, ...options }: PdfViewerSearchProviderProps) {
	const search = usePdfViewerSearch(options)

	return <PdfViewerSearchContext value={search}>{children}</PdfViewerSearchContext>
}
