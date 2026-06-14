import type { Dispatch, SetStateAction } from 'react'

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
}

/** Zoom state passed to {@link PdfViewerZoomControls}: the current scale, its setter, and the discrete levels to step through. @internal */
export type PdfViewerZoom = {
	value: number
	setValue: Dispatch<SetStateAction<number>>
	/** Discrete zoom levels; in/out steps to the next level above/below `value`. */
	levels: number[]
}
