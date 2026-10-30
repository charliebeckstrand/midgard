import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { sampleMotionFrames } from './motion-frame'

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

/**
 * Holds the tweens that `read` gives at `progress` of their length, in the
 * frame that starts them, and gives them. A tween runs on wall-clock time, so
 * a long frame moves it on before a measure. A held tween stays at its frame.
 * `play()` on each tween lets it go on.
 *
 * `during` sends the event that starts the tweens. The sampler starts before
 * it, and the hold occurs in the frame that finds the tweens. Thus a slow
 * round trip of the event cannot let a tween run on, or land, before the hold.
 * The sampler gives the tweens only after the event resolves (see
 * {@link sampleMotionFrames}), so a hold after the sampler is too late.
 *
 * @param read - Gives the tweens to hold.
 * @param progress - The part of the length at which each tween holds, from 0 to 1.
 * @param options - `during` sends the event that starts the tweens. `exclude`
 * lists tweens from before the event, such as a held tween, that are not the
 * new tweens.
 * @returns The held tweens.
 */
export function holdTweens(
	read: () => readonly Animation[],
	progress: number,
	{
		during,
		exclude = [],
	}: { during?: () => Promise<unknown>; exclude?: readonly Animation[] } = {},
): Promise<Animation[]> {
	return sampleMotionFrames(
		() => read().filter((tween) => !exclude.includes(tween)),
		(found) => {
			if (found.length === 0) return false

			for (const tween of found) {
				tween.pause()

				tween.currentTime = progress * Number(tween.effect?.getComputedTiming().duration)
			}

			return true
		},
		{ during },
	)
}
