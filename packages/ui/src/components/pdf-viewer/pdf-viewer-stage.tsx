'use client'

import type { Ref, SyntheticEvent } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import type { PdfViewerPage } from './types'
import type { UsePageScaleResult } from './use-pdf-viewer-page-scale'

export type PdfViewerStageProps = {
	ref?: Ref<HTMLDivElement>
	scale: UsePageScaleResult
	activePage: PdfViewerPage | undefined
	safePage: number
	rotation: number
	isLoading: boolean
	error: Error | null
	/** False until the viewport has been measured and a page size is known, so the page image stays hidden during the first paint. */
	visible: boolean
	onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
}

/**
 * Renders the page surface inside the measured viewport — either the active
 * page image, an error message, a loading placeholder, or an empty state.
 * The viewport's aspect ratio is driven by the `scale` input so the container
 * reserves space before the image paints.
 */
export function PdfViewerStage({
	ref,
	scale,
	activePage,
	safePage,
	rotation,
	isLoading,
	error,
	visible,
	onImageLoad,
}: PdfViewerStageProps) {
	const { aspectRatio, frameW, frameH, imageW, imageH } = scale

	return (
		<div
			ref={ref}
			data-slot="pdf-viewer-viewport"
			className={cn(k.viewport)}
			style={{ aspectRatio }}
		>
			{activePage && !isLoading ? (
				<div
					data-slot="pdf-viewer-page-frame"
					className={cn(k.pageFrame)}
					style={{ width: frameW, height: frameH }}
				>
					<img
						key={activePage.id ?? safePage}
						src={activePage.src}
						alt={activePage.label ?? `Page ${safePage}`}
						className={cn(k.page)}
						style={{
							width: imageW,
							height: imageH,
							transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
							visibility: visible ? 'visible' : 'hidden',
						}}
						onLoad={onImageLoad}
					/>
				</div>
			) : error ? (
				<div className={cn(k.pageEmpty)}>Failed to load PDF: {error.message}</div>
			) : isLoading ? (
				<output
					data-slot="pdf-viewer-page-frame"
					aria-label="Loading PDF"
					className={cn(k.pagePlaceholder)}
				/>
			) : (
				<div className={cn(k.pageEmpty)}>No pages to display</div>
			)}
		</div>
	)
}
