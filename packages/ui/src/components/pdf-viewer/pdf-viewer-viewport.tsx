'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerContext } from './context'

/**
 * Renders the page surface inside the measured viewport — either the active
 * page image, an error message, a loading placeholder, or an empty state.
 * The viewport's aspect ratio is driven by the `scale` input so the container
 * reserves space before the image paints.
 */
export function PdfViewerViewport() {
	const {
		viewportRef,
		scale,
		activePage,
		safePage,
		rotation,
		isLoading,
		error,
		visible,
		onImageLoad,
	} = usePdfViewerContext()

	const { aspectRatio, frameW, frameH, imageW, imageH } = scale

	return (
		<div
			ref={viewportRef}
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
