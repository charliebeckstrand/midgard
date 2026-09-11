'use client'

import { createContext } from '../../core'
import type { PdfViewerMagnifierResult } from './use-pdf-viewer-magnifier'

/**
 * Context tuple for the hover loupe:
 * `[PdfViewerMagnifierContext, usePdfViewerMagnifierContext]`.
 *
 * Separate from {@link PdfViewerContext}, and provided around the viewport alone, for the
 * reason {@link PdfViewerHighlightsContext} is: the tracked pointer changes at pointer rate
 * while the lens is open. In the main context that re-rendered `PdfViewer` itself — and with
 * it the toolbar's floating stacks, the thumbnail rail's node-per-page, and the highlight
 * provider's scan of every highlight in the document — 60-120 times a second. Sitting
 * outside this provider, none of them can.
 *
 * @internal
 */
export const [PdfViewerMagnifierContext, usePdfViewerMagnifierContext] =
	createContext<PdfViewerMagnifierResult>('PdfViewerMagnifier')
