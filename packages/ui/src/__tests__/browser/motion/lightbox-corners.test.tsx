import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { Lightbox, LightboxTrigger } from '../../../components/lightbox'
import { parseMatrix } from '../../../components/lightbox/lightbox-utilities'
import { present, renderUI, screen } from '../../helpers'
import { fieldPhoto, viewerTweens } from '../helpers/lightbox'
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

const photo = fieldPhoto('teal', { width: 300, height: 200 })

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

/** The corner of the clip in this frame, or `undefined` when the slot has no transform. */
function readCorner(): Corner | undefined {
	const element = slot()

	if (!element) return undefined

	const style = getComputedStyle(element)

	if (style.transform === 'none') return undefined

	const [scaleX = 1, , , scaleY = 1] = parseMatrix(style.transform)

	const [x = 0, y = x] = style.borderTopLeftRadius.split(' ').map(Number.parseFloat)

	return {
		radius: x * scaleX,
		radiusY: y * scaleY,
		width: element.getBoundingClientRect().width,
	}
}

/**
 * Reads the corner that the raise paints at its start, before Motion starts the
 * tween.
 *
 * The raise can paint its start after the step where {@link sampleFlight} reads
 * in a frame. The browser then paints the start in that frame, and the sampler
 * does not read it. Motion starts the tween at the time of the raise, so the
 * first frame that the sampler reads is already a part of a frame into the
 * flight. Thus a style observer reads the start, in the task of the raise.
 * The observer disconnects when the case finishes, also when the start does
 * not come.
 */
function readStart(): Promise<Corner> {
	return new Promise((resolve) => {
		const observer = new MutationObserver(() => {
			const corner = readCorner()

			if (!corner) return

			observer.disconnect()

			resolve(corner)
		})

		observer.observe(document.body, { subtree: true, attributeFilter: ['style'] })

		onTestFinished(() => observer.disconnect())
	})
}

/** Reads the corner in each frame of a flight that `during` starts, until it lands. */
async function sampleFlight(during: () => Promise<unknown>) {
	const corners: Corner[] = []

	await sampleMotionFrames(
		() => {
			const corner = readCorner()

			if (corner) corners.push(corner)

			return corners.length > 0 && viewerTweens().length === 0
		},
		(landed) => landed,
		{ during },
	)

	return corners
}

/** Checks that each frame has the radius of its place between the thumbnail and the stage. */
const expectRadiusOfEachFrame = vi.defineHelper(
	(corners: Corner[], thumbnail: number, stage: number) => {
		for (const { radius, radiusY, width } of corners) {
			expect(radiusY).toBeNear(radius, SAMPLED_CURVE)

			const progress = (width - thumbnail) / (stage - thumbnail)

			expect(radius).toBeNear(RADIUS * (1 - progress), SAMPLED_CURVE)
		}
	},
)

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

		const start = readStart()

		const raise = await sampleFlight(() => userEvent.click(trigger))

		// The photo at rest has square corners, and the slot keeps no radius.
		expect(present(slot(), 'the slot').style.borderRadius).toBe('')

		const stage = present(
			document.querySelector('[data-slot="lightbox-photo"]'),
			'the photo',
		).getBoundingClientRect().width

		expect(raise.length).toBeGreaterThan(2)

		const first = await start

		expect(first.radius).toBeNear(RADIUS, SAMPLED_CURVE)

		expectRadiusOfEachFrame([first, ...raise], thumbnail, stage)

		const lower = await sampleFlight(() => userEvent.keyboard('{Escape}'))

		expect(lower.length).toBeGreaterThan(2)

		expect(lower.at(-1)?.radius).toBeNear(RADIUS, SAMPLED_CURVE)

		expectRadiusOfEachFrame(lower, thumbnail, stage)
	})
})
