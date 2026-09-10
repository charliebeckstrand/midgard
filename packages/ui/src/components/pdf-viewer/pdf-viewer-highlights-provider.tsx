'use client'

import type { ReactNode } from 'react'
import { PdfViewerHighlightsContext } from './pdf-viewer-highlights-context'
import {
	type PdfViewerHighlightsOptions,
	usePdfViewerHighlights,
} from './use-pdf-viewer-highlights'

/** Props for {@link PdfViewerHighlightsProvider}: the hook's own options, plus the subtree it scopes. @internal */
type PdfViewerHighlightsProviderProps = PdfViewerHighlightsOptions & { children: ReactNode }

/**
 * Owns the overlay's state and scopes it to the viewport.
 *
 * @remarks A component rather than a call inside `PdfViewer` for one reason: the active
 * region lives here, so activating one re-renders this provider and the layer that reads
 * its context — not `PdfViewer`, and therefore not the toolbar or the thumbnail rail. The
 * `children` element it receives keeps its identity across an activation, so React skips
 * the viewport subtree too; only the layer, a context consumer, re-renders. Measured at 20
 * pages × 40 regions, an uncontrolled activation renders the gate and the layer and
 * nothing else.
 *
 * That holds for selection the viewer owns. A consumer whose `onActiveHighlightChange`
 * stores the id above `&lt;PdfViewer&gt;` re-renders the whole viewer from its own state change,
 * as any lifted state would — the scoping cannot prevent that, and is not meant to.
 * @internal
 */
export function PdfViewerHighlightsProvider({
	children,
	...options
}: PdfViewerHighlightsProviderProps) {
	const highlights = usePdfViewerHighlights(options)

	return <PdfViewerHighlightsContext value={highlights}>{children}</PdfViewerHighlightsContext>
}
