'use client'

import { cn } from '../../core'
import { useA11yLiveRegion } from '../../hooks'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerContext } from './context'
import { PdfViewerHighlights } from './pdf-viewer-highlights'
import { PdfViewerMagnifier } from './pdf-viewer-magnifier'
import { usePdfViewerMagnifierContext } from './pdf-viewer-magnifier-context'

/**
 * Renders the page surface inside the measured viewport: either the active
 * page image — with the highlight overlay over it, sharing its frame and its
 * transform — or an error message, a loading placeholder, or an empty state.
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
		loading,
		error,
		visible,
		fit,
		onImageLoad,
	} = usePdfViewerContext()

	const magnifier = usePdfViewerMagnifierContext()

	const { aspectRatio, frameWidth, frameHeight, imageWidth, imageHeight, transform } = scale

	const pageStatus = useA11yLiveRegion({ srOnly: true })

	return (
		<div
			ref={viewportRef}
			// The scroller, which is what makes it the panner: a zoomed page overflows this box,
			// and moving it is the one gesture the loupe cannot feel through the pointer.
			{...magnifier.viewportProps}
			data-slot="pdf-viewer-viewport"
			className={cn(k.viewport.base, fit === 'width' && k.viewport.scrolls)}
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
					// The frame, not the image: it is the box the loupe's own copy is sized from,
					// and it does not move under rotation the way the image inside it does.
					ref={magnifier.setReference}
					{...magnifier.referenceProps}
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
							transform,
							visibility: visible ? 'visible' : 'hidden',
						}}
						onLoad={onImageLoad}
					/>
					<PdfViewerHighlights />
					<PdfViewerMagnifier />
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
