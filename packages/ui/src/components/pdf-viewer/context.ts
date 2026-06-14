'use client'

import { createContext } from '../../core'
import type { PdfViewerResult } from './use-pdf-viewer'

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
