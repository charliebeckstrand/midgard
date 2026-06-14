'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { PdfViewerContext } from './context'
import { PdfViewerThumbnails } from './pdf-viewer-thumbnails'
import { PdfViewerToolbar } from './pdf-viewer-toolbar'
import { PdfViewerViewport } from './pdf-viewer-viewport'
import type { PdfViewerPage } from './types'
import { usePdfViewer } from './use-pdf-viewer'

/** Props for {@link PdfViewer}: the document source (`pages` or `src`), controlled page state, and zoom/rotation defaults. */
export type PdfViewerProps = {
	/**
	 * Pre-rendered page images, in order. When provided, drives what's rendered.
	 * When omitted, pages are rendered from `src` via pdf.js.
	 */
	pages?: PdfViewerPage[]
	/**
	 * Source URL for the PDF document. Drives the viewport when `pages` is
	 * omitted, and always powers the download and print toolbar actions.
	 */
	src?: string
	/** Filename used for the download attribute. Only meaningful with `src`. */
	filename?: string
	/** Controlled current page (1-based). */
	page?: number
	/** Initial page in uncontrolled mode (1-based). */
	defaultPage?: number
	onPageChange?: (page: number) => void
	/**
	 * Initial zoom scale.
	 * @defaultValue 1
	 */
	defaultZoom?: number
	/** Discrete zoom levels, ascending. Zoom in/out steps through this list. */
	zoomLevels?: number[]
	/** Initial rotation in degrees. Snaps to multiples of 90. */
	defaultRotation?: number
	className?: string
	'aria-label'?: string
}

/** PDF document viewer: renders pages from `pages` or via pdf.js from `src`, with toolbar controls for zoom, rotation, download, and print. */
export function PdfViewer({
	pages,
	src,
	filename,
	page,
	defaultPage,
	onPageChange,
	defaultZoom,
	zoomLevels,
	defaultRotation,
	className,
	'aria-label': ariaLabel = 'PDF viewer',
}: PdfViewerProps) {
	const context = usePdfViewer({
		pages,
		src,
		filename,
		page,
		defaultPage,
		onPageChange,
		defaultZoom,
		zoomLevels,
		defaultRotation,
	})

	return (
		<PdfViewerContext value={context}>
			<section
				ref={context.rootRef}
				data-slot="pdf-viewer"
				aria-label={ariaLabel}
				className={cn(k.base, className)}
			>
				<PdfViewerToolbar />
				<div className={cn(k.body)}>
					<PdfViewerThumbnails />
					<PdfViewerViewport />
				</div>
			</section>
		</PdfViewerContext>
	)
}
