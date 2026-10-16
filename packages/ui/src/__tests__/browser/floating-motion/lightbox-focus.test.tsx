import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { renderUI, screen, waitFor } from '../../helpers'
import { waitForNoTween } from '../helpers/motion-frame'

/**
 * When the viewer closes, the photo lands in the thumbnail of the photo on the
 * stage, and the focus goes to that thumbnail, not to the thumbnail that
 * opened the viewer. The focus moves when the photo lands. The focus manager
 * of the overlay then unmounts, and it does not move the focus back to the
 * thumbnail that opened the viewer.
 *
 * The real engine and real Motion are necessary. The photo lands at the end of
 * the exit of the overlay, and the instant Motion mock removes the overlay in
 * the commit that closes it, so no exit occurs.
 */

const colors = ['teal', 'tomato', 'gold', 'navy']

const photos: LightboxPhoto[] = colors.map((color) => ({
	src: `data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="${color}"/></svg>`,
	)}`,
	alt: `${color} field`,
	width: 1500,
	height: 1000,
}))

function Gallery({ reduced }: { reduced: boolean }) {
	return (
		<ReducedMotionContext value={reduced}>
			<Lightbox photos={photos}>
				<div className="flex flex-wrap gap-2">
					{photos.map((photo, index) => (
						<LightboxTrigger key={photo.alt} index={index} className="size-16" />
					))}
				</div>
			</Lightbox>
		</ReducedMotionContext>
	)
}

const thumbnail = (index: number) => screen.getByRole('button', { name: photos[index]?.alt ?? '' })

const viewer = () => document.querySelector('[data-slot="lightbox"]')

// The live region reads "{alt}, {n} / {count}".
const count = () => document.querySelector('[aria-live="polite"]')?.textContent?.split(', ').at(-1)

/** The tweens that run in the viewer: the raise, the return, or a slide. */
const viewerTweens = () => viewer()?.getAnimations({ subtree: true }) ?? []

describe('Lightbox focus return (real engine, real Motion)', () => {
	it.for([
		{ reduced: false, name: 'the flight' },
		{ reduced: true, name: 'the fade' },
	])(
		'moves the focus to the thumbnail that the photo lands in, after $name',
		async ({ reduced }) => {
			renderUI(<Gallery reduced={reduced} />)

			await userEvent.click(thumbnail(0))

			await waitFor(() => expect(viewer()).toContainElement(document.activeElement as HTMLElement))

			await waitForNoTween(viewerTweens)

			await userEvent.keyboard('{ArrowRight}')

			await expect.poll(count).toBe('2 / 4')

			await waitForNoTween(viewerTweens)

			await userEvent.keyboard('{ArrowRight}')

			await expect.poll(count).toBe('3 / 4')

			await waitForNoTween(viewerTweens)

			await userEvent.keyboard('{Escape}')

			// The overlay unmounts after the photo lands, so its focus manager is gone.
			await expect.poll(viewer).toBeNull()

			expect(document.activeElement).toBe(thumbnail(2))
		},
	)
})
