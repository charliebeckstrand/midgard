'use client'

import { cn } from '../../core'
import { useA11yLiveRegion } from '../../hooks'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerContext } from './context'

/**
 * Renders the page surface inside the measured viewport: either the active
 * page image, an error message, a loading placeholder, or an empty state.
 * The `scale` input drives the viewport's aspect ratio; the container
 * reserves space before the image paints.
 *
 * @remarks A visually hidden live region announces "Page X of Y" on
 * navigation. Errors render in a `role="alert"`; loading shows an
 * `aria-label`'d placeholder.
 * @internal
 */
export function PdfViewerViewport() {
	const {
		viewportRef,
		scale,
		activePage,
		safePage,
		total,
		rotation,
		loading,
		error,
		visible,
		onImageLoad,
	} = usePdfViewerContext()

	const { aspectRatio, frameWidth, frameHeight, imageWidth, imageHeight } = scale

	const pageStatus = useA11yLiveRegion({ srOnly: true })

	return (
		<div
			ref={viewportRef}
			data-slot="pdf-viewer-viewport"
			className={cn(k.viewport.base)}
			style={{ aspectRatio }}
		>
			{/* Live region announces "Page X of Y" on page navigation. */}
			{total > 0 && (
				<div data-slot="pdf-viewer-page-status" {...pageStatus}>
					Page {safePage} of {total}
				</div>
			)}
			{activePage && !loading ? (
				<div
					data-slot="pdf-viewer-page-frame"
					className={cn(k.viewport.page.frame)}
					style={{ width: frameWidth, height: frameHeight }}
				>
					<img
						key={activePage.id ?? safePage}
						src={activePage.src}
						alt={activePage.label ?? `Page ${safePage}`}
						className={cn(k.viewport.page.base)}
						style={{
							width: imageWidth,
							height: imageHeight,
							transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
							visibility: visible ? 'visible' : 'hidden',
						}}
						onLoad={onImageLoad}
					/>
				</div>
			) : error ? (
				<div role="alert" className={cn(k.viewport.page.empty)}>
					Failed to load PDF: {error.message}
				</div>
			) : loading ? (
				<output
					data-slot="pdf-viewer-page-frame"
					aria-label="Loading PDF"
					className={cn(k.viewport.page.placeholder)}
				/>
			) : (
				<div className={cn(k.viewport.page.empty)}>No pages to display</div>
			)}
		</div>
	)
}
