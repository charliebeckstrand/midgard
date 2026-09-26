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
	PdfViewerMagnifierState,
	PdfViewerPage,
} from './types'
import { usePdfViewer } from './use-pdf-viewer'

/** Props for {@link PdfViewer}: the document source (`pages` or `src`), controlled page state, and zoom defaults. */
export type PdfViewerProps = {
	/**
	 * Pre-rendered page images, in order. When provided, drives what's rendered.
	 * When omitted, pages are rendered from `src` via pdf.js.
	 *
	 * @remarks Identity need not be stable. The viewer compares the `id` and `src` of each
	 * page, and a new array with the same entries keeps the rotations of the reader. To
	 * show a different document at the same page URLs, remount the viewer with a new `key`.
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
	 * Fires once the document at `src` opens, with its page count. The pages
	 * render after it, the active page first.
	 *
	 * The viewer owns the whole fetch-and-rasterize lifecycle and reported neither
	 * end of it, so a consumer had to re-fetch `src` to learn what happened. Use
	 * this callback to reveal chrome beside the viewer, or to record the count.
	 * A viewer given `pages` directly loads nothing and fires neither callback. A
	 * cached document fires on the first render, because it is already ready.
	 */
	onLoad?: (pageCount: number) => void
	/**
	 * Fires when the document at `src` fails to open, with the reason. A page
	 * that fails to render after the open shows the failure in the viewer, and
	 * does not fire this.
	 *
	 * A 404, a refused range request, and a file pdf.js cannot parse all land here.
	 * Without it the viewer shows its own failure state and the consumer cannot
	 * tell a broken document from one that is still on the way. Exactly one of
	 * `onLoad` and `onError` fires for each `src`.
	 */
	onError?: (error: Error) => void
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
	 * `'page'` fits the whole page. The viewport takes its height from the page's own
	 * aspect ratio, so the viewer sizes itself and never scrolls vertically at rest.
	 *
	 * `'width'` fits the page width and lets the page overflow — which is what a narrow panel
	 * needs to be readable at all. **The consumer owns the height then**: the viewer stops
	 * reserving space from the page ratio and instead fills its host's box. Give it one
	 * with a resolved height: a fixed height, or a flex/grid track that resolves one. Or
	 * set the height on the viewer directly through `className`.
	 * @defaultValue 'page'
	 */
	fit?: PdfViewerFit
	/**
	 * Regions to draw over the pages — extracted-field boxes on a scan, search hits, any
	 * "look here" mark the consumer owns. Only the active page's are rendered.
	 *
	 * @remarks Identity need not be stable. The viewer filters by page and converts at the
	 * point of use, rather than memoizing a derived array. An inline build every render
	 * therefore costs nothing but the on-screen boxes.
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
	 * pressable. That is right when a list beside the viewer is already the navigable
	 * surface.
	 */
	onActiveHighlightChange?: (id: string | null) => void
	/**
	 * Fires on every press of a region, the already-active one included.
	 *
	 * @remarks Distinct from {@link onActiveHighlightChange}, which reports *selection*:
	 * re-pressing the active region changes nothing to select, so that callback stays silent.
	 * Use this one when a press must do something every time. It can reveal the region's
	 * row in a list beside the viewer, or put the caret in the field it was read from.
	 *
	 * A keyboard activation arrives as a native click, so `Enter` on a region reports here too.
	 */
	onHighlightPress?: (id: string) => void
	/**
	 * Show a magnifying lens beside the cursor while it rests over the page.
	 *
	 * @remarks For a viewer opened on the whole page, where the ink is legible enough to
	 * navigate by but not to read. An invoice scan or a plan sheet is one. A reader can then
	 * check one figure without zooming the page and losing their place in it. `true` takes
	 * the defaults; pass {@link PdfViewerMagnifierOptions} to set the power, the lens size
	 * or the dwell.
	 *
	 * The toolbar then carries one of two controls, and
	 * {@link PdfViewerMagnifierOptions.mode} says which. `'simple'` is a switch, which is all
	 * a viewer needs where the consumer already knows the page it opens on. `'config'` opens
	 * a dialog and hands the three settings to the reader. That is what a viewer wants when
	 * it opens on documents it cannot predict. A lens that suits an invoice scan is the
	 * wrong lens for a plan sheet.
	 *
	 * The lens is never interactive. It cannot take a press meant for a highlighted region
	 * underneath it. On touch, a finger that rests on the page for the dwell (300ms at the
	 * least) opens the lens above the finger. The finger then moves the lens, and a lift
	 * closes it. The browser's long-press menu stays as it is: when it opens, the lens closes.
	 * @defaultValue false
	 */
	magnifier?: boolean | PdfViewerMagnifierOptions
	/**
	 * Fires when the reader shows or hides the highlight overlay from the toolbar. Starts
	 * **shown**, so a consumer mirroring this seeds its own state `true`.
	 *
	 * @remarks What the overlay is doing is not only the viewer's business. A list beside it
	 * routinely marks which of its rows can be located on the page. That mark is a promise
	 * the hidden overlay cannot keep. Not a controlled binding — these two switches are the
	 * reader's, and nothing outside can turn them back on under them.
	 */
	onHighlightsVisibleChange?: (visible: boolean) => void
	/**
	 * Fires when the reader changes the magnifier — off or on from the toolbar, and in
	 * `'config'` mode any of the three settings in the dialog. Present only when
	 * {@link PdfViewerProps.magnifier} offered a loupe; starts **on**, for the same reason.
	 *
	 * @remarks Reports the whole of what the reader owns, not the one field that moved. A
	 * consumer that keeps the preference across sessions stores what arrives, and hands it
	 * straight back through {@link PdfViewerProps.magnifier}.
	 */
	onMagnifierChange?: (state: PdfViewerMagnifierState) => void
	className?: string
	'aria-label'?: string
}

/**
 * PDF document viewer: renders pages from `pages` or via pdf.js from `src`. Toolbar
 * controls cover zoom, rotation, download, and print, and an optional overlay draws
 * highlighted regions over the page.
 */
export function PdfViewer({
	pages,
	src,
	filename,
	page,
	defaultPage,
	onPageChange,
	onLoad,
	onError,
	defaultZoom,
	zoomLevels,
	fit,
	highlights,
	highlightUnit,
	activeHighlightId,
	onHighlightPress,
	magnifier,
	onHighlightsVisibleChange,
	onMagnifierChange,
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
		onLoad,
		onError,
		defaultZoom,
		zoomLevels,
		fit,
		hasHighlights: !!highlights?.length,
		magnifier,
		onHighlightsVisibleChange,
		onMagnifierChange,
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
							// What the overlay needs from the document beneath it, handed down rather
							// than read back out of `PdfViewerContext` — the same way the loupe takes
							// its settings. The overlay's own state stays inside the provider.
							activePage={context.activePage}
							safePage={context.safePage}
							goToPage={context.goToPage}
						>
							<PdfViewerViewport />
						</PdfViewerHighlightsProvider>
					</PdfViewerMagnifierProvider>
				</div>
			</section>
		</PdfViewerContext>
	)
}
