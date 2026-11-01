'use client'

import { createContext } from '../../core'
import type { PdfViewerResult } from './use-pdf-viewer'
import type { PdfViewerHighlightsResult } from './use-pdf-viewer-highlights'
import type { PdfViewerMagnifierResult } from './use-pdf-viewer-magnifier'

type PdfViewerContextValue = PdfViewerResult

/**
 * Context tuple for the PDF viewer: `[PdfViewerContext, usePdfViewerContext]`.
 * Carries the full {@link PdfViewerResult} from {@link usePdfViewer} to every
 * sub-component (toolbar, thumbnails, viewport). `usePdfViewerContext` throws
 * outside a `<PdfViewer>`.
 *
 * @internal
 */
export const [PdfViewerContext, usePdfViewerContext] =
	createContext<PdfViewerContextValue>('PdfViewer')

/**
 * Context tuple for the highlight overlay:
 * `[PdfViewerHighlightsContext, usePdfViewerHighlightsContext]`.
 *
 * Deliberately separate from {@link PdfViewerContext}, and provided around the
 * viewport alone. Activation is the main interaction of the overlay, and the
 * toolbar and the thumbnail rail do not use it.
 *
 * The main context is plain React context with no selector. Putting the active
 * region in there would therefore re-render both on every click, and the rail
 * renders a tile for each page. Sitting outside this provider, they cannot.
 *
 * @internal
 */
export const [PdfViewerHighlightsContext, usePdfViewerHighlightsContext] =
	createContext<PdfViewerHighlightsResult>('PdfViewerHighlights')

/**
 * Context tuple for the hover loupe:
 * `[PdfViewerMagnifierContext, usePdfViewerMagnifierContext]`.
 *
 * Separate from {@link PdfViewerContext}, and provided around the viewport alone, for the
 * reason {@link PdfViewerHighlightsContext} is. The tracked pointer changes at pointer rate
 * while the lens is open. In the main context that re-rendered `PdfViewer` itself, 60-120
 * times a second. With it went the toolbar's floating stacks, the thumbnail rail's
 * node-per-page, and the highlight provider's scan of every highlight in the document. Sitting
 * outside this provider, none of them can.
 *
 * @internal
 */
export const [PdfViewerMagnifierContext, usePdfViewerMagnifierContext] =
	createContext<PdfViewerMagnifierResult>('PdfViewerMagnifier')
