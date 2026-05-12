export type PdfViewerPage = {
	/** Stable key. Falls back to the array index when omitted. */
	id?: string | number
	/** Image source for the rendered page. */
	src: string
	/** Optional smaller image for the thumbnail sidebar. Falls back to `src`. */
	thumbnail?: string
	/** Optional accessible label for the page. Falls back to `Page N`. */
	label?: string
	/** Intrinsic width in pixels. Used to size the viewport before the image loads. */
	width?: number
	/** Intrinsic height in pixels. Used to size the viewport before the image loads. */
	height?: number
}
