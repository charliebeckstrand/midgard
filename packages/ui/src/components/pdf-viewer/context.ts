'use client'

import { createContext } from '../../core'
import type { PdfViewerResult } from './use-pdf-viewer'

type PdfViewerContextValue = PdfViewerResult

export const [PdfViewerContext, usePdfViewerContext] =
	createContext<PdfViewerContextValue>('PdfViewer')
