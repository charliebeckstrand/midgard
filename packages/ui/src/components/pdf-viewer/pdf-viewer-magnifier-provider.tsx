'use client'

import type { ReactNode } from 'react'
import { PdfViewerMagnifierContext } from './pdf-viewer-magnifier-context'
import { type ResolvedMagnifier, usePdfViewerMagnifier } from './use-pdf-viewer-magnifier'

/** Props for {@link PdfViewerMagnifierProvider}: the resolved settings, plus the subtree it scopes. @internal */
type PdfViewerMagnifierProviderProps = {
	/** Resolved settings, or `null` when the loupe is off or the consumer never asked for one. */
	settings: ResolvedMagnifier | null
	children: ReactNode
}

/**
 * Owns the loupe's state and scopes it to the viewport.
 *
 * @remarks A component rather than a call inside `PdfViewer` because the tracked pointer
 * lives here. A move re-renders this provider and its two context consumers: the viewport
 * frame that carries the reference props, and the lens itself. It does not re-render
 * `PdfViewer`, and therefore neither the toolbar nor the thumbnail rail. The `children`
 * element keeps its identity across a move, so the highlight provider nested inside it is
 * skipped too. Its scan of every highlight in the document stays off the pointer path.
 * @internal
 */
export function PdfViewerMagnifierProvider({
	settings,
	children,
}: PdfViewerMagnifierProviderProps) {
	const magnifier = usePdfViewerMagnifier(settings)

	return <PdfViewerMagnifierContext value={magnifier}>{children}</PdfViewerMagnifierContext>
}
