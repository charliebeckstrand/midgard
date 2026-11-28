import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'

/** The size of a photo, in px. */
type PhotoSize = { width: number; height: number }

/**
 * A field of one color, as an SVG data URL, with the alt text `{color} field`.
 *
 * @param color - The color of the field.
 * @param size - The size of the photo, in px.
 */
export function fieldPhoto(
	color: string,
	{ width, height }: PhotoSize = { width: 1500, height: 1000 },
): LightboxPhoto {
	return {
		src: `data:image/svg+xml;utf8,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${color}"/></svg>`,
		)}`,
		alt: `${color} field`,
		width,
		height,
	}
}

/** One {@link fieldPhoto} for each color, in order. */
export function fieldPhotos(colors: readonly string[], size?: PhotoSize): LightboxPhoto[] {
	return colors.map((color) => fieldPhoto(color, size))
}

/**
 * A `Lightbox` over a row of one 64 px trigger for each photo.
 *
 * @param props - `reduced` sets the Motion setting of the app. `thumbnails`
 * shows the row of thumbnails in the viewer.
 */
export function Gallery({
	photos,
	reduced = false,
	thumbnails,
}: {
	photos: LightboxPhoto[]
	reduced?: boolean
	thumbnails?: boolean
}) {
	return (
		<ReducedMotionContext value={reduced}>
			<Lightbox photos={photos} thumbnails={thumbnails}>
				<div className="flex flex-wrap gap-2">
					{photos.map((photo, index) => (
						<LightboxTrigger key={photo.alt} index={index} className="size-16" />
					))}
				</div>
			</Lightbox>
		</ReducedMotionContext>
	)
}

/** The tweens that run in the viewer: the raise, the return, or a slide. */
export const viewerTweens = (): Animation[] =>
	document.querySelector('[data-slot="lightbox"]')?.getAnimations({ subtree: true }) ?? []

/**
 * The place of the photo on view, such as "2 of 4". The live region reads
 * "{alt}, {position} of {total}", and this is the part after the alt text.
 */
export const liveCount = () =>
	document.querySelector('[aria-live="polite"]')?.textContent?.split(', ').at(-1)
