import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { frames, present, renderUI, screen } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The first frame of the raise of a `Lightbox` photo, from a thumbnail that the
 * page hides in part. The photo paints only the part of the thumbnail that the
 * reader sees, so the hidden part does not show over a sticky bar for a frame.
 *
 * Rides the real browser because jsdom lays nothing out.
 */

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="teal"/></svg>`

const photos: LightboxPhoto[] = [
	{
		src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
		alt: 'Teal field',
		width: 1500,
		height: 1000,
	},
]

const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g

/** The top edge, in viewport px, that the photo paints in the first frame of its raise. */
function paintedTop(photo: HTMLElement): number {
	// The raise runs in the browser. Its first keyframe is the inline frame.
	for (const animation of photo.getAnimations()) {
		animation.pause()

		animation.currentTime = 0
	}

	const scale = Number(photo.style.transform.match(NUMBER)?.[2] ?? 1)

	const inset = Number(photo.style.clipPath.match(NUMBER)?.[0] ?? 0)

	return photo.getBoundingClientRect().top + inset * scale
}

describe('Lightbox flight from a hidden thumbnail (real browser)', () => {
	beforeAll(() => page.viewport(390, 664))

	it('starts at the part of the thumbnail below the scroll padding of its scroller', async () => {
		const { container } = renderUI(
			<div className="h-[300px] overflow-auto scroll-pt-[40px]">
				<div className="h-[200px]" />
				<Lightbox photos={photos}>
					<LightboxTrigger index={0} className="size-24" />
				</Lightbox>
				<div className="h-[600px]" />
			</div>,
		)

		const box = present(container.firstElementChild, 'box') as HTMLElement

		const trigger = screen.getByRole('button', { name: 'Teal field' })

		// The thumbnail starts 20px under the bar that the padding names.
		box.scrollTo(0, 180)

		await frames()

		const top = box.getBoundingClientRect().top

		expect(trigger.getBoundingClientRect().top).toBeNear(top + 20, HALF_PIXEL)

		await userEvent.click(trigger, { position: { x: 48, y: 80 } })

		const photo = present(
			document.querySelector<HTMLImageElement>('[data-offset="0"] img'),
			'photo',
		)

		expect(photo.style.clipPath).toMatch(/ round 0px 0px [\d.]+px [\d.]+px\)$/)

		expect(paintedTop(photo)).toBeNear(top + 40, HALF_PIXEL)
	})
})
