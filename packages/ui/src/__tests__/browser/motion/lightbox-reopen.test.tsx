import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { frame, present, renderUI, screen } from '../../helpers'
import { fieldPhotos, Gallery, holdTweens, liveCount, viewerTweens } from '../helpers/lightbox'
import { waitForNoTween } from '../helpers/motion-frame'

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

const photos = fieldPhotos(['teal', 'tomato', 'gold', 'navy', 'plum'])

const thumbnail = (index: number) => screen.getByRole('button', { name: photos[index]?.alt ?? '' })

const slot = (offset: number) =>
	present(document.querySelector<HTMLElement>(`[data-offset="${offset}"]`), `slot ${offset}`)

const photoIn = (element: HTMLElement) =>
	present(element.querySelector<HTMLElement>('img'), 'photo of the slot')

/** Opens the viewer on the photo at `index`, and waits for the photo to land. */
async function open(index: number) {
	await userEvent.click(thumbnail(index))

	await expect.poll(() => document.querySelector('[data-slot="lightbox"]')).not.toBeNull()

	await waitForNoTween(viewerTweens)
}

/**
 * Holds the tweens of `element` and of its descendants at `progress` of their
 * length, in the frame that starts them ({@link holdTweens}).
 */
function hold(element: HTMLElement, progress: number, during?: () => Promise<unknown>) {
	return holdTweens(() => element.getAnimations({ subtree: true }), progress, { during })
}

/**
 * Closes the viewer with Escape, and holds the return halfway. The return runs
 * on wall-clock time. Thus, without the hold, a slow round trip of the key can
 * let the return land before the reopen, and the reopen then mounts a new
 * viewer. The sampler starts before the key, so it holds the return in its
 * first frame. The reopen stops the held tweens.
 */
async function startReturn() {
	await hold(slot(0), 0.5, () => userEvent.keyboard('{Escape}'))
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
		await waitForNoTween(viewerTweens)
	})

	it('leaves no frame of the return on the slot of the photo that went back', async () => {
		renderUI(<Gallery photos={photos} />)

		await open(0)

		await startReturn()

		// The click reaches the thumbnail while the overlay is inert.
		thumbnail(1).click()

		await waitForNoTween(viewerTweens)

		expect(liveCount()).toBe('2 of 5')

		const before = slot(-1)

		expect(getComputedStyle(before).transform).toBe('none')

		expect(getComputedStyle(photoIn(before)).transform).toBe('none')

		expect(getComputedStyle(photoIn(before)).opacity).toBe('1')
	})

	it('leaves no fade of the return on the photo that went back, under reduced motion', async () => {
		renderUI(<Gallery photos={photos} reduced />)

		await open(0)

		await startReturn()

		thumbnail(1).click()

		await waitForNoTween(viewerTweens)

		expect(getComputedStyle(photoIn(slot(-1))).opacity).toBe('1')
	})

	it('counts the photo in the center after a step and a reopen', async () => {
		renderUI(<Gallery photos={photos} />)

		await open(0)

		await userEvent.click(screen.getByRole('button', { name: 'Next photo' }))

		await waitForNoTween(viewerTweens)

		expect(liveCount()).toBe('2 of 5')

		await startReturn()

		thumbnail(0).click()

		await expect.poll(liveCount).toBe('1 of 5')

		// The first photo hides its previous button, so the role query does not find it.
		expect(document.querySelector('button[aria-label="Previous photo"]')).toBeDisabled()
	})

	it('raises the same photo from where it paints, not from its thumbnail', async () => {
		renderUI(<Gallery photos={photos} />)

		await open(0)

		const center = slot(0)

		// The photo is a quarter of the way back, and is not at its thumbnail yet.
		await hold(center, 0.25, () => userEvent.keyboard('{Escape}'))

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
			renderUI(<Gallery photos={photos} reduced={reduced} />)

			await open(0)

			const back = await hold(slot(0), 0.5, () => userEvent.keyboard('{Escape}'))

			await reopenAtLanding(back, 1)

			await waitForNoTween(viewerTweens)

			expect(liveCount()).toBe('2 of 5')

			const before = slot(-1)

			expect(getComputedStyle(before).transform).toBe('none')

			expect(getComputedStyle(photoIn(before)).transform).toBe('none')

			expect(getComputedStyle(photoIn(before)).opacity).toBe('1')
		},
	)

	it('opens again at rest after a close of a zoomed photo, and steps on the arrow keys', async () => {
		renderUI(<Gallery photos={photos} />)

		await open(0)

		const stage = present(
			document.querySelector<HTMLElement>('[data-slot="lightbox-stage"]'),
			'the stage',
		)

		// The keys go to the viewer. The focus manager is not real in this project.
		const focusViewer = () => screen.getByRole('button', { name: 'Next photo' }).focus()

		focusViewer()

		await userEvent.keyboard('+')

		await waitForNoTween(viewerTweens)

		expect(stage).toHaveAttribute('data-zoomed')

		await startReturn()

		thumbnail(0).click()

		await waitForNoTween(viewerTweens)

		// The reopen keeps the viewer that went back, so this is not a new mount.
		expect(document.querySelector('[data-slot="lightbox-stage"]')).toBe(stage)

		expect(stage).not.toHaveAttribute('data-zoomed')

		focusViewer()

		await userEvent.keyboard('{ArrowRight}')

		await expect.poll(liveCount).toBe('2 of 5')
	})

	// A close during a step stops the slide where it paints. A reopen then
	// slides the track back to rest, so the photo in the center is centered,
	// and no neighbor shows at the edge.
	it('puts the track at rest after a close during a step and a reopen', async () => {
		renderUI(<Gallery photos={photos} />)

		await open(0)

		const track = present(slot(0).parentElement, 'the track')

		await hold(track, 0.5, () =>
			userEvent.click(screen.getByRole('button', { name: 'Next photo' })),
		)

		// The hold of the return keeps a slow round trip of the key from letting
		// the return land before the reopen, which would mount a new track.
		const tweens = await hold(slot(0), 0.5, () => userEvent.keyboard('{Escape}'))

		thumbnail(0).click()

		for (const tween of tweens) tween.play()

		await waitForNoTween(viewerTweens)

		expect(liveCount()).toBe('1 of 5')

		expect(getComputedStyle(track).transform).toBe('none')

		expect(getComputedStyle(slot(0)).transform).toBe('none')
	})
})
