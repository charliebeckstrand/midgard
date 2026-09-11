'use client'

import { createContext } from '../../core'
import type { PdfViewerHighlightsResult } from './use-pdf-viewer-highlights'

/**
 * Context tuple for the highlight overlay:
 * `[PdfViewerHighlightsContext, usePdfViewerHighlightsContext]`.
 *
 * Deliberately separate from {@link PdfViewerContext}, and provided around the viewport
 * alone. Activation is the review screen's primary interaction; the toolbar and the
 * thumbnail rail care about none of it, and the main context is plain React context with no
 * selector, so putting the active region in there would re-render both on every click — the
 * rail renders five nodes per page. Sitting outside this provider, they cannot.
 *
 * @internal
 */
export const [PdfViewerHighlightsContext, usePdfViewerHighlightsContext] =
	createContext<PdfViewerHighlightsResult>('PdfViewerHighlights')
