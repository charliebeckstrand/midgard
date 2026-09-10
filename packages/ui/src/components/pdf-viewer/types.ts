import type { Dispatch, SetStateAction } from 'react'
import type { Color } from '../../core/recipe'

/** A pre-rendered page supplied to {@link PdfViewer}: its image source plus optional thumbnail, label, and intrinsic size. */
export type PdfViewerPage = {
	/** Stable key. Falls back to the array index when omitted. */
	id?: string | number
	/** Image source for the rendered page. */
	src: string
	/** Optional smaller image for the thumbnail sidebar. Falls back to `src`. */
	thumbnail?: string
	/** Optional accessible label for the page. Falls back to `Page N`. */
	label?: string
	/** Intrinsic width in pixels. Sizes the viewport before the image loads. */
	width?: number
	/** Intrinsic height in pixels. Sizes the viewport before the image loads. */
	height?: number
	/**
	 * Intrinsic page width in PDF user-space units (points, 1/72"), as printed —
	 * distinct from {@link PdfViewerPage.width}, which is the rasterized image's pixels.
	 *
	 * @remarks Set by the `src` rasterizer from the page's own dimensions, independently of
	 * the image it produces. Supply it on pre-rendered pages to enable
	 * `highlightUnit: 'inch'`; a page carrying neither this nor
	 * {@link PdfViewerPage.pointHeight} renders none of its inch-specified highlights.
	 */
	pointWidth?: number
	/** Intrinsic page height in points. See {@link PdfViewerPage.pointWidth}. */
	pointHeight?: number
}

/** Zoom state passed to {@link PdfViewerZoomControls}: the current scale, its setter, and the discrete levels to step through. @internal */
export type PdfViewerZoom = {
	value: number
	setValue: Dispatch<SetStateAction<number>>
	/** Discrete zoom levels; in/out steps to the next level above/below `value`. */
	levels: number[]
}

/**
 * A highlighted region of the document — one box over the page, in the unit named by
 * `highlightUnit`.
 *
 * @remarks Geometry is a plain axis-aligned box because that is all any of the three
 * things a region does needs: paint the fill, take the press, and be scrolled to. A
 * producer holding a quadrilateral (Document Intelligence emits one) reduces it to its
 * bounding box, which needs nothing the viewer knows — unlike the unit conversion, which
 * needs the page's own extent and therefore happens here. If a skewed outline is ever
 * wanted, it widens this one field rather than joining it.
 */
export type PdfViewerHighlight = {
	/** Stable identity. The active-highlight binding and the React key both use it. */
	id: string
	/** 1-based page the region sits on. */
	page: number
	/** Axis-aligned bounding box, origin top-left, in the unit named by `highlightUnit`. */
	rect: PdfViewerHighlightRect
	/**
	 * Accessible name, and what the announcement speaks on activation.
	 *
	 * @remarks Required: a region is a control whenever `onActiveHighlightChange` is set,
	 * and a control must have a name (WCAG 4.1.2). It is also the region's whole meaning —
	 * {@link PdfViewerHighlight.color} is decoration and never carries it.
	 */
	label: string
	/**
	 * Decorative paint, from the shared five-colour palette.
	 * @defaultValue `'amber'`
	 */
	color?: Color
}

/** One region's box: fractions of the page, inches, or whatever `highlightUnit` names. Origin top-left. */
export type PdfViewerHighlightRect = { x: number; y: number; width: number; height: number }

/**
 * Unit for a {@link PdfViewerHighlight}'s `rect`.
 *
 * `'fraction'` is `[0, 1]` of the page — the canonical form, and the only one well-defined
 * for both a rasterized page and a caller's pre-rendered image, and invariant under zoom,
 * rotation and re-rasterization. `'inch'` is converted against the page's own
 * {@link PdfViewerPage.pointWidth}/{@link PdfViewerPage.pointHeight}. For points, pass
 * `pt / 72`.
 */
export type PdfViewerHighlightUnit = 'fraction' | 'inch'

/**
 * How a page is scaled into the viewport before `zoom` multiplies it.
 *
 * `'page'` fits the whole page and lets the viewer size itself from the page's aspect ratio.
 * `'width'` fits the page width, lets it overflow, and fills the height its container gives
 * it — so the container has to give it one.
 */
export type PdfViewerFit = 'page' | 'width'

/**
 * Hover-loupe settings for {@link PdfViewerProps.magnifier}.
 *
 * @remarks Boolean-or-object, the same shape `Button`'s `loading` takes: `magnifier` on its
 * own is the common case, and an object is there for the page that needs a different power or
 * a longer dwell.
 */
export type PdfViewerMagnifierOptions = {
	/**
	 * How much the loupe magnifies what is under the cursor.
	 * @defaultValue 2.5
	 */
	zoom?: number
	/**
	 * The loupe's diameter, in pixels.
	 * @defaultValue 180
	 */
	size?: number
	/**
	 * How long the pointer must rest before the loupe appears, in milliseconds.
	 *
	 * @remarks A dwell rather than an immediate open: the pointer crosses the page on its way
	 * to the toolbar and the thumbnails constantly, and a loupe that answered every one of
	 * those would be a strobe. Once open it tracks with no delay at all.
	 * @defaultValue 300
	 */
	delay?: number
}
