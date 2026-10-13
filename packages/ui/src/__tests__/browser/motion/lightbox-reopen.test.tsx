import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { frame, frames, present, renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'

/**
 * A `Lightbox` that opens again while its photo goes back to its thumbnail.
 * The overlay is inert during the return, so a click on a thumbnail opens the
 * viewer again. The reopen stops the return: no slot keeps a frame of it, the
 * count shows the photo in the center, and the same photo rises from where it
 * paints. A reopen in the frame in which the return lands stops the return
 * too, before Motion writes the last frame of the return.
 *
 * Rides the real browser, with real Motion, because jsdom lays nothing out
 * and runs no tween.
 */

const colors = ['teal', 'tomato', 'gold', 'navy', 'plum']

const photos: LightboxPhoto[] = colors.map((color) => ({
	src: `data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="${color}"/></svg>`,
	)}`,
	alt: `${color} field`,
	width: 1500,
	height: 1000,
}))

function Gallery() {
	return (
		<Lightbox photos={photos}>
			<div className="flex flex-wrap gap-2">
				{photos.map((photo, index) => (
					<LightboxTrigger key={photo.alt} index={index} className="size-16" />
				))}
			</div>
		</Lightbox>
	)
}

const thumbnail = (index: number) => screen.getByRole('button', { name: photos[index]?.alt ?? '' })

const slot = (offset: number) =>
	present(document.querySelector<HTMLElement>(`[data-offset="${offset}"]`), `slot ${offset}`)

const photoIn = (element: HTMLElement) =>
	present(element.querySelector<HTMLElement>('img'), 'photo of the slot')

/** Whether no tween runs in the viewer: the raise, the return, or a slide. */
const still = () =>
	(document.querySelector('[data-slot="lightbox"]')?.getAnimations({ subtree: true }) ?? [])
		.length === 0

const count = () => document.querySelector('[aria-live="polite"]')?.textContent

/** Opens the viewer on the photo at `index`, and waits for the photo to land. */
async function open(index: number) {
	await userEvent.click(thumbnail(index))

	await expect.poll(() => document.querySelector('[data-slot="lightbox"]')).not.toBeNull()

	await expect.poll(still).toBe(true)
}

/** Closes the viewer with Escape, and waits two frames into the return. */
async function startReturn() {
	await userEvent.keyboard('{Escape}')

	await frames()
}

/**
 * Holds the tweens of `element` and of its descendants at `progress` of their
 * length, in the frame that starts them, and gives them. A tween runs on
 * wall-clock time, so a long frame moves it on before a measure. A held tween
 * stays at its frame. `play()` on each tween lets it go on.
 */
async function hold(element: HTMLElement, progress: number) {
	const tweens = await sampleMotionFrames(
		() => element.getAnimations({ subtree: true }),
		(found) => found.length > 0,
	)

	for (const tween of tweens) {
		tween.pause()

		tween.currentTime = progress * Number(tween.effect?.getComputedTiming().duration)
	}

	return tweens
}

/**
 * Lands the held tweens of the return, and opens the viewer on the photo at
 * `index` in a frame callback, before Motion writes the last frame of the
 * return. The tweens report the landing before the next frame callbacks run.
 * Motion then asks for a frame callback to write the last frame, and that
 * callback comes after the reopen. The first frame lets the frame loop of
 * `hold` stop, so that Motion asks for no frame callback before the landing.
 */
async function reopenAtLanding(tweens: readonly Animation[], index: number) {
	await frame()

	const landing = frame()

	for (const tween of tweens) tween.finish()

	await landing

	thumbnail(index).click()
}

describe('Lightbox reopened during the return (real browser)', () => {
	afterEach(async () => {
		await expect.poll(still).toBe(true)
	})

	it('leaves no frame of the return on the slot of the photo that went back', async () => {
		renderUI(<Gallery />)

		await open(0)

		await startReturn()

		// The click reaches the thumbnail while the overlay is inert.
		thumbnail(1).click()

		await expect.poll(still).toBe(true)

		expect(count()).toBe('2 / 5')

		const before = slot(-1)

		expect(getComputedStyle(before).transform).toBe('none')

		expect(getComputedStyle(photoIn(before)).transform).toBe('none')

		expect(getComputedStyle(photoIn(before)).opacity).toBe('1')
	})

	it('leaves no fade of the return on the photo that went back, under reduced motion', async () => {
		renderUI(
			<ReducedMotionContext value={true}>
				<Gallery />
			</ReducedMotionContext>,
		)

		await open(0)

		await startReturn()

		thumbnail(1).click()

		await expect.poll(still).toBe(true)

		expect(getComputedStyle(photoIn(slot(-1))).opacity).toBe('1')
	})

	it('counts the photo in the center after a step and a reopen', async () => {
		renderUI(<Gallery />)

		await open(0)

		await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))

		await expect.poll(still).toBe(true)

		expect(count()).toBe('2 / 5')

		await startReturn()

		thumbnail(0).click()

		await expect.poll(count).toBe('1 / 5')

		// The first photo hides its previous button, so the role query does not find it.
		expect(document.querySelector('button[aria-label="Previous photo"]')).toBeDisabled()
	})

	it('raises the same photo from where it paints, not from its thumbnail', async () => {
		renderUI(<Gallery />)

		await open(0)

		await userEvent.keyboard('{Escape}')

		const center = slot(0)

		// The photo is a quarter of the way back, and is not at its thumbnail yet.
		await hold(center, 0.25)

		const painted = center.getBoundingClientRect()

		const home = thumbnail(0).getBoundingClientRect()

		expect(painted.width).toBeGreaterThan(home.width * 1.5)

		thumbnail(0).click()

		// The first frame of the raise.
		const raise = await hold(center, 0)

		try {
			// The raise turns the photo around where it is, so it does not shrink to the thumbnail.
			expect(center.getBoundingClientRect().width).toBeGreaterThanOrEqual(painted.width - 1)
		} finally {
			for (const tween of raise) tween.play()
		}
	})

	it.for([
		{ reduced: false, name: 'the flight' },
		{ reduced: true, name: 'the fade' },
	])(
		'puts the photo that went back at rest after a reopen as $name of the return lands',
		async ({ reduced }) => {
			renderUI(
				<ReducedMotionContext value={reduced}>
					<Gallery />
				</ReducedMotionContext>,
			)

			await open(0)

			await userEvent.keyboard('{Escape}')

			await reopenAtLanding(await hold(slot(0), 0.5), 1)

			await expect.poll(still).toBe(true)

			expect(count()).toBe('2 / 5')

			const before = slot(-1)

			expect(getComputedStyle(before).transform).toBe('none')

			expect(getComputedStyle(photoIn(before)).transform).toBe('none')

			expect(getComputedStyle(photoIn(before)).opacity).toBe('1')
		},
	)
})
