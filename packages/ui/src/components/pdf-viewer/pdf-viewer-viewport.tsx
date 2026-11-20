'use client'

import { useComposedRefs } from 'motion/react'
import { useA11yLiveRegion } from '../../hooks/a11y/use-a11y-live-region'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { usePdfViewerContext, usePdfViewerMagnifierContext } from './context'
import { hasRaster } from './pdf-viewer-document-cache'
import { PdfViewerHighlights } from './pdf-viewer-highlights'
import { PdfViewerMagnifier } from './pdf-viewer-magnifier'
import { pageLabel, pdfViewerMessages } from './pdf-viewer-messages'
import { PdfViewerPageImage } from './pdf-viewer-page-image'
import { PdfViewerSearchHits } from './pdf-viewer-search-hits'

/**
 * Renders the page surface inside the viewport. That is the active
 * page image, an error message, a loading placeholder, or an empty state. A
 * page shows as soon as its raster lands: an image, or a bitmap on a canvas
 * ({@link PdfViewerPageImage}). A page that has not rendered yet shows the
 * loading placeholder in the frame of the page. The
 * highlight overlay sits over the image, sharing its frame and its transform.
 *
 * @remarks CSS sizes the page, so the server paints it at its final size. The pane is a
 * size container that takes its aspect ratio from the page, and it does not scroll. The
 * scroll box fills it. The frame of the page reads the container units of the pane, so a
 * scrollbar of the scroll box does not change the fit. The page image and the layers over it
 * read the container units of the frame.
 *
 * A visually hidden live region announces "Page X of Y" on
 * navigation. While the page overflows the viewport, the viewport is a tab
 * stop, so a keyboard user can scroll it. Errors render in a `role="alert"`; loading shows an
 * `aria-label`'d placeholder.
 * @internal
 */
export function PdfViewerViewport() {
	const {
		viewportRef,
		frameRef,
		scale,
		activePage,
		safePage,
		total,
		loading,
		pending,
		error,
		visible,
		fit,
		onImageLoad,
	} = usePdfViewerContext()

	const { setReference, referenceProps } = usePdfViewerMagnifierContext()

	const { aspectRatio, naturalWidth, frame, page } = scale

	const intl = useIntl()

	const pageStatus = useA11yLiveRegion({ srOnly: true })

	// A zoomed page overflows the viewport. It is then a tab stop and a region
	// with the name "Page". The name is static, because the status text above
	// changes on each page.
	const scrollRegionRef = useScrollRegion({
		label: intl.formatMessage(pdfViewerMessages.pageRegion),
	})

	const composedViewportRef = useComposedRefs(viewportRef, scrollRegionRef)

	const composedFrameRef = useComposedRefs(setReference, frameRef)

	const { viewport } = k({ fit })

	/*
	 * The frame is there from the first paint of a page that is on the way: while the document
	 * loads, and while the page renders. It holds the loading placeholder until the raster
	 * lands. Thus the frame gives the cache the width of the page before the first raster lands,
	 * and the sharp raster comes before the neighbors. `pending` covers the render before the
	 * load starts, on the server and on a cold `src`. Without it, that render shows the empty
	 * state for one frame. A failed load shows its message, unless a page has its raster.
	 *
	 * Only a frame needs the pane to be a size container that the scroll box fills. A message
	 * sits in the pane, and the pane grows to its height. A size container cannot.
	 */
	const framed = hasRaster(activePage) || (!error && (loading || pending || !!activePage))

	return (
		<div
			data-slot="pdf-viewer-pane"
			className={k({ framed }).viewport.pane}
			// The flex basis sets the width in a box with a width of its own. `naturalWidth` is the
			// width in a box that sizes to its content. A pane with a frame is a size container, so
			// its content cannot give it one.
			style={{ aspectRatio, width: naturalWidth }}
		>
			{/* Live region announces "Page X of Y" on page navigation. */}
			{total > 0 && (
				<div data-slot="pdf-viewer-page-status" {...pageStatus}>
					{intl.formatMessage(pdfViewerMessages.pageOfTotal, { page: safePage, total })}
				</div>
			)}
			{framed ? (
				<div ref={composedViewportRef} data-slot="pdf-viewer-viewport" className={viewport.base}>
					<div
						// The frame, not the image: it is the box the loupe's own copy is sized from,
						// and it does not move under rotation the way the image inside it does.
						ref={composedFrameRef}
						{...referenceProps}
						data-slot="pdf-viewer-page-frame"
						className={k().viewport.page.frame}
						style={frame}
					>
						{hasRaster(activePage) && activePage ? (
							<>
								<PdfViewerPageImage
									key={activePage.id ?? safePage}
									page={activePage}
									alt={pageLabel(intl, activePage, safePage)}
									className={k().viewport.page.base}
									style={{ ...page, visibility: visible ? 'visible' : 'hidden' }}
									onLoad={onImageLoad}
								/>
								<PdfViewerHighlights />
								<PdfViewerSearchHits />
								<PdfViewerMagnifier />
							</>
						) : (
							<output
								aria-label={intl.formatMessage(pdfViewerMessages.loading)}
								className={k().viewport.page.placeholder}
							/>
						)}
					</div>
				</div>
			) : error ? (
				<div role="alert" className={k().viewport.page.empty}>
					{intl.formatMessage(pdfViewerMessages.loadFailed, { message: error.message })}
				</div>
			) : (
				<div className={k().viewport.page.empty}>
					{intl.formatMessage(pdfViewerMessages.noPages)}
				</div>
			)}
		</div>
	)
}
