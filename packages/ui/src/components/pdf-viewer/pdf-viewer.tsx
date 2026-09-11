'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { PdfViewerContext } from './context'
import { PdfViewerHighlightsProvider } from './pdf-viewer-highlights-provider'
import { PdfViewerMagnifierProvider } from './pdf-viewer-magnifier-provider'
import { PdfViewerThumbnails } from './pdf-viewer-thumbnails'
import { PdfViewerToolbar } from './pdf-viewer-toolbar'
import { PdfViewerViewport } from './pdf-viewer-viewport'
import type {
	PdfViewerFit,
	PdfViewerHighlight,
	PdfViewerHighlightUnit,
	PdfViewerMagnifierOptions,
	PdfViewerPage,
} from './types'
import { usePdfViewer } from './use-pdf-viewer'

/** Props for {@link PdfViewer}: the document source (`pages` or `src`), controlled page state, and zoom defaults. */
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
	/**
	 * How a page is scaled into the viewport before `zoom` multiplies it.
	 *
	 * `'page'` fits the whole page: the viewport takes its height from the page's own aspect
	 * ratio, so the viewer sizes itself and never scrolls vertically at rest.
	 *
	 * `'width'` fits the page width and lets the page overflow — which is what a narrow panel
	 * needs to be readable at all. **The consumer owns the height then**: the viewer stops
	 * reserving space from the page ratio and instead fills its host's box, so give it one
	 * with a resolved height (a fixed height, or a flex/grid track that resolves one) — or
	 * set the height on the viewer directly through `className`.
	 * @defaultValue 'page'
	 */
	fit?: PdfViewerFit
	/**
	 * Regions to draw over the pages — extracted-field boxes on a scan, search hits, any
	 * "look here" mark the consumer owns. Only the active page's are rendered.
	 *
	 * @remarks Identity need not be stable: the viewer filters by page and converts at the
	 * point of use rather than memoizing a derived array, so building this inline every
	 * render costs nothing but the on-screen boxes.
	 */
	highlights?: readonly PdfViewerHighlight[]
	/**
	 * Unit for every highlight's `rect`.
	 * @defaultValue 'fraction'
	 */
	highlightUnit?: PdfViewerHighlightUnit
	/** Controlled active region id; `null` for none. Setting it navigates to that region's page and brings it into view. */
	activeHighlightId?: string | null
	/** Initial active region id in uncontrolled mode. */
	defaultActiveHighlightId?: string
	/**
	 * Fires when the active region changes from inside the viewer — a press or
	 * `Enter`/`Space` on a region, or `Escape` clearing it. Not fired for a change the
	 * consumer drove through `activeHighlightId`.
	 *
	 * @remarks Its presence is also what makes regions interactive. Without it they are
	 * decoration: painted, revealed when `activeHighlightId` points at them, and never
	 * pressable — which is right when a list beside the viewer is already the navigable
	 * surface.
	 */
	onActiveHighlightChange?: (id: string | null) => void
	/**
	 * Fires on every press of a region, the already-active one included.
	 *
	 * @remarks Distinct from {@link onActiveHighlightChange}, which reports *selection*:
	 * re-pressing the active region changes nothing to select, so that callback stays silent.
	 * Use this one when a press should do something every time — reveal the region's row in a
	 * list beside the viewer, put the caret in the field it was read from.
	 *
	 * A keyboard activation arrives as a native click, so `Enter` on a region reports here too.
	 */
	onHighlightPress?: (id: string) => void
	/**
	 * Show a magnifying lens beside the cursor while it rests over the page.
	 *
	 * @remarks For a viewer opened on the whole page, where the ink is legible enough to
	 * navigate by but not to read — an invoice scan, a plan sheet — so a reader can check one
	 * figure without zooming the page and losing their place in it. `true` takes the defaults;
	 * pass {@link PdfViewerMagnifierOptions} to change the power, the lens size, or the dwell.
	 *
	 * Mouse only, and never interactive: it cannot take a press meant for a highlighted region
	 * underneath it, and it does not appear for touch, where the finger already covers what
	 * the lens would show.
	 * @defaultValue false
	 */
	magnifier?: boolean | PdfViewerMagnifierOptions
	/**
	 * Fires when the reader shows or hides the highlight overlay from the toolbar. Starts
	 * **shown**, so a consumer mirroring this seeds its own state `true`.
	 *
	 * @remarks What the overlay is doing is not only the viewer's business: a list beside it
	 * routinely marks which of its rows can be located on the page, and that mark is a promise
	 * the hidden overlay cannot keep. Not a controlled binding — these two switches are the
	 * reader's, and nothing outside should be able to turn them back on under them.
	 */
	onHighlightsVisibleChange?: (visible: boolean) => void
	/**
	 * Fires when the reader turns the magnifier off or on from the toolbar. Present only when
	 * {@link PdfViewerProps.magnifier} offered one; starts **on**, for the same reason.
	 */
	onMagnifierEnabledChange?: (enabled: boolean) => void
	className?: string
	'aria-label'?: string
}

/**
 * PDF document viewer: renders pages from `pages` or via pdf.js from `src`, with toolbar
 * controls for zoom, rotation, download, and print, and an optional overlay of highlighted
 * regions over the page.
 */
export function PdfViewer({
	pages,
	src,
	filename,
	page,
	defaultPage,
	onPageChange,
	defaultZoom,
	zoomLevels,
	fit,
	highlights,
	highlightUnit,
	activeHighlightId,
	onHighlightPress,
	magnifier,
	onHighlightsVisibleChange,
	onMagnifierEnabledChange,
	defaultActiveHighlightId,
	onActiveHighlightChange,
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
		fit,
		hasHighlights: !!highlights?.length,
		magnifier,
		onHighlightsVisibleChange,
		onMagnifierEnabledChange,
	})

	return (
		<PdfViewerContext value={context}>
			<section
				ref={context.rootRef}
				data-slot="pdf-viewer"
				aria-label={ariaLabel}
				className={cn(k.base, context.fit === 'width' && k.fill, className)}
			>
				<PdfViewerToolbar />
				<div className={cn(k.body)}>
					<PdfViewerThumbnails />
					<PdfViewerMagnifierProvider settings={context.magnifierSettings}>
						<PdfViewerHighlightsProvider
							highlights={highlights}
							highlightUnit={highlightUnit}
							activeHighlightId={activeHighlightId}
							onHighlightPress={onHighlightPress}
							defaultActiveHighlightId={defaultActiveHighlightId}
							onActiveHighlightChange={onActiveHighlightChange}
						>
							<PdfViewerViewport />
						</PdfViewerHighlightsProvider>
					</PdfViewerMagnifierProvider>
				</div>
			</section>
		</PdfViewerContext>
	)
}
