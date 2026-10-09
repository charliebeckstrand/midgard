/** One photo of a {@link Lightbox}. */
export type LightboxPhoto = {
	/** The URL of the photo at full size, which the viewer shows. */
	src: string
	/** The text alternative of the photo. The thumbnail and the viewer both use it. */
	alt: string
	/**
	 * The width of the photo, in px. With `height`, it gives the aspect ratio, so
	 * the viewer knows the box of the photo before the photo loads. Without
	 * them, the root reads the size of the thumbnail when it loads, and the
	 * thumbnail is disabled until then. Give both when `thumbnail` is a smaller
	 * copy, because the viewer shows the photo no larger than its size.
	 */
	width?: number
	/** The height of the photo, in px. */
	height?: number
	/**
	 * The URL of a smaller copy of the photo for the thumbnail. The viewer
	 * paints it under the full photo until the full photo loads.
	 *
	 * @defaultValue `src`
	 */
	thumbnail?: string
}

/** How the thumbnail of a photo loaded: its natural size, or `'failed'`. @internal */
export type LightboxLoad = { width: number; height: number } | 'failed'

/**
 * A photo that the viewer can show: one with a size, whose thumbnail did not
 * fail. `index` is its place in the `photos` of the root. @internal
 */
export type LightboxViewPhoto = LightboxPhoto & { width: number; height: number; index: number }
