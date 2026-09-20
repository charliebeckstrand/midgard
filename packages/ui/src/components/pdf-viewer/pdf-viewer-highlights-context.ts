'use client'

import { createContext } from '../../core'
import type { PdfViewerHighlightsResult } from './use-pdf-viewer-highlights'

/**
 * Context tuple for the highlight overlay:
 * `[PdfViewerHighlightsContext, usePdfViewerHighlightsContext]`.
 *
 * Deliberately separate from {@link PdfViewerContext}, and provided around the
 * viewport alone. Activation is the review screen's primary interaction, and
 * the toolbar and the thumbnail rail care about none of it.
 *
 * The main context is plain React context with no selector. Putting the active
 * region in there would therefore re-render both on every click, and the rail
 * renders five nodes per page. Sitting outside this provider, they cannot.
 *
 * @internal
 */
export const [PdfViewerHighlightsContext, usePdfViewerHighlightsContext] =
	createContext<PdfViewerHighlightsResult>('PdfViewerHighlights')
