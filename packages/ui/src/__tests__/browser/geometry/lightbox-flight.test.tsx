import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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

/** The clip and the top edge, in viewport px, that the photo paints in the first frame of its raise. */
type FirstFrame = { clipPath: string; top: number }

/**
 * Reads the first frame of the raise when Motion starts its transform tween,
 * the first tween of the raise. At that time, no tween paints the photo, and
 * the inline style is the first frame. At the end of the raise, Motion writes
 * the last frame inline, and a loaded runner can get to that end before the
 * test reads the photo. A pause does not hold the raise, because Motion sets
 * the start time of each tween, and that starts the tween again.
 */
function watchRaise(): FirstFrame[] {
	const native = Element.prototype.animate

	const frames: FirstFrame[] = []

	vi.spyOn(Element.prototype, 'animate').mockImplementation(function (
		this: Element,
		...args: Parameters<Element['animate']>
	) {
		const [keyframes] = args

		if (this instanceof HTMLImageElement && keyframes && 'transform' in keyframes) {
			const { clipPath, transform } = this.style

			const scale = Number(transform.match(NUMBER)?.[2] ?? 1)

			const inset = Number(clipPath.match(NUMBER)?.[0] ?? 0)

			frames.push({ clipPath, top: this.getBoundingClientRect().top + inset * scale })
		}

		return native.apply(this, args)
	})

	return frames
}

describe('Lightbox flight from a hidden thumbnail (real browser)', () => {
	beforeAll(() => page.viewport(390, 664))

	afterEach(() => vi.restoreAllMocks())

	it('starts at the part of the thumbnail below the scroll padding of its scroller', async ({
		signal,
	}) => {
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

		signal.throwIfAborted()

		const raise = watchRaise()

		await userEvent.click(trigger, { position: { x: 48, y: 80 } })

		await expect.poll(() => raise.length).toBe(1)

		const [first] = raise

		expect(first?.clipPath).toMatch(/ round 0px 0px [\d.]+px [\d.]+px\)$/)

		expect(first?.top).toBeNear(top + 40, HALF_PIXEL)
	})
})
