import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { parseMatrix } from '../../../components/lightbox/lightbox-utilities'
import { renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'

/**
 * The corners of a `Lightbox` photo in the flight. The photo leaves its
 * thumbnail with the radius of the thumbnail, and the radius goes to square
 * corners as the photo rises. The return plays it backward, so the photo lands
 * with the radius of the thumbnail. In each frame, the radius is the radius of
 * the frame that the transform paints, and the corners are round on the screen
 * while the slot scales by a different amount on each axis.
 *
 * Rides the real browser, with real Motion, because jsdom lays nothing out
 * and runs no tween.
 */

const photo: LightboxPhoto = {
	src: `data:image/svg+xml;utf8,${encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="teal"/></svg>',
	)}`,
	alt: 'teal field',
	width: 300,
	height: 200,
}

/** The radius of the thumbnail, in CSS px. */
const RADIUS = 12

/**
 * The transforms move straight between samples of the curve, and the radius
 * follows the curve itself. Thus the radius and the size of the clip can be a
 * small part of a pixel apart in a frame.
 */
const SAMPLED_CURVE = 0.25

/** The radius and the width of the clip on the screen, in one frame. */
type Corner = { radius: number; radiusY: number; width: number }

const slot = () => document.querySelector<HTMLElement>('[data-offset="0"]')

/** Whether no tween runs in the viewer. */
const still = () =>
	(document.querySelector('[data-slot="lightbox"]')?.getAnimations({ subtree: true }) ?? [])
		.length === 0

/** The corner of the clip in this frame, or `undefined` when the slot has no transform. */
function readCorner(): Corner | undefined {
	const element = slot()

	if (!element) return undefined

	const style = getComputedStyle(element)

	const [scaleX = 1, , , scaleY = 1] = parseMatrix(style.transform)

	if (style.transform === 'none') return undefined

	const [x = 0, y = x] = style.borderTopLeftRadius.split(' ').map(Number.parseFloat)

	return {
		radius: x * scaleX,
		radiusY: y * scaleY,
		width: element.getBoundingClientRect().width,
	}
}

/** Reads the corner in each frame of a flight that `during` starts, until it lands. */
async function sampleFlight(during: () => Promise<unknown>) {
	const corners: Corner[] = []

	await sampleMotionFrames(
		() => {
			const corner = readCorner()

			if (corner) corners.push(corner)

			return corners.length > 0 && still()
		},
		(landed) => landed,
		{ during },
	)

	return corners
}

/** Checks that each frame has the radius of its place between the thumbnail and the stage. */
function expectRadiusOfEachFrame(corners: Corner[], thumbnail: number, stage: number) {
	for (const { radius, radiusY, width } of corners) {
		expect(radiusY).toBeNear(radius, SAMPLED_CURVE)

		const progress = (width - thumbnail) / (stage - thumbnail)

		expect(radius).toBeNear(RADIUS * (1 - progress), SAMPLED_CURVE)
	}
}

describe('Lightbox corners in the flight (real browser)', () => {
	beforeAll(() => page.viewport(800, 600))

	it('rounds the photo as its thumbnail at the ends of the flight, and square at rest', async () => {
		renderUI(
			<Lightbox photos={[photo]}>
				<LightboxTrigger className="size-24 rounded-[12px]" />
			</Lightbox>,
		)

		const trigger = screen.getByRole('button', { name: photo.alt })

		const thumbnail = trigger.getBoundingClientRect().width

		const raise = await sampleFlight(() => userEvent.click(trigger))

		const element = slot()

		expect(element && getComputedStyle(element).borderTopLeftRadius).toBe('0px')

		const stage = document
			.querySelector('[data-slot="lightbox-photo"]')
			?.getBoundingClientRect().width

		expect(raise.length).toBeGreaterThan(2)

		expect(raise[0]?.radius).toBeNear(RADIUS, SAMPLED_CURVE)

		expectRadiusOfEachFrame(raise, thumbnail, stage ?? 0)

		const lower = await sampleFlight(() => userEvent.keyboard('{Escape}'))

		expect(lower.length).toBeGreaterThan(2)

		expect(lower.at(-1)?.radius).toBeNear(RADIUS, SAMPLED_CURVE)

		expectRadiusOfEachFrame(lower, thumbnail, stage ?? 0)
	})
})
