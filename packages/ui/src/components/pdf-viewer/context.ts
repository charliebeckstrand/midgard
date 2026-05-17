'use client'

import { createContext } from '../../core'
import type { UsePdfViewerResult } from './use-pdf-viewer'

export type PdfViewerContextValue = UsePdfViewerResult

export const [PdfViewerProvider, usePdfViewerContext] =
	createContext<PdfViewerContextValue>('PdfViewer')
