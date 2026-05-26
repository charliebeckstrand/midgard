'use client'

import { createContext } from '../../core'
import type { UsePdfViewerResult } from './use-pdf-viewer'

type PdfViewerContextValue = UsePdfViewerResult

export const [PdfViewerContext, usePdfViewerContext] =
	createContext<PdfViewerContextValue>('PdfViewer')
