import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'

/**
 * A `Lightbox` whose thumbnail has the size of the photo at rest. The raise
 * then moves the slot and does not scale the photo, so each step of the tween
 * of the photo is the same. Motion ends such a tween at once. The photo must
 * keep its size in each frame of the raise, and must not land before its slot.
 *
 * Rides the real browser, with real Motion, because jsdom lays nothing out
 * and runs no tween.
 */

const photo: LightboxPhoto = {
	src: `data:image/svg+xml;utf8,${encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="teal"/></svg>',
	)}`,
	alt: 'teal field',
	width: 200,
	height: 100,
}

/** Whether no tween runs in the viewer. */
const still = () =>
	(document.querySelector('[data-slot="lightbox"]')?.getAnimations({ subtree: true }) ?? [])
		.length === 0

describe('Lightbox raised from a thumbnail of its size (real browser)', () => {
	it('keeps the size of the photo in each frame of the raise', async () => {
		renderUI(
			<Lightbox photos={[photo]}>
				<LightboxTrigger className="h-[100px] w-[200px]" />
			</Lightbox>,
		)

		await userEvent.click(screen.getByRole('button', { name: photo.alt }))

		const sizes: string[] = []

		await sampleMotionFrames(
			() => {
				const image = document.querySelector('[data-slot="lightbox-photo"]')

				if (!image) return false

				const { width, height } = image.getBoundingClientRect()

				sizes.push(`${Math.round(width)}x${Math.round(height)}`)

				return sizes.length > 1 && still()
			},
			(landed) => landed,
		)

		expect(new Set(sizes)).toEqual(new Set(['200x100']))
	})
})
