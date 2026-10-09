/** One photo of a {@link Lightbox}. */
export type LightboxPhoto = {
	/** The URL of the photo at full size, which the viewer shows. */
	src: string
	/** The text alternative of the photo. The thumbnail and the viewer both use it. */
	alt: string
	/**
	 * The width of the photo, in px. With `height`, it gives the aspect ratio, so
	 * the viewer knows the box of the photo before the photo loads.
	 */
	width: number
	/** The height of the photo, in px. */
	height: number
	/**
	 * The URL of a smaller copy of the photo for the thumbnail. The viewer
	 * paints it under the full photo until the full photo loads.
	 *
	 * @defaultValue `src`
	 */
	thumbnail?: string
}
