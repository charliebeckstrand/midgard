import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { frames, present, renderUI, screen } from '../../helpers'

/**
 * A `Lightbox` that opens again while its photo goes back to its thumbnail.
 * The overlay is inert during the return, so a click on a thumbnail opens the
 * viewer again. The reopen stops the return: no slot keeps a frame of it, the
 * count shows the photo in the center, and the same photo rises from where it
 * paints.
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

		await startReturn()

		const center = slot(0)

		const painted = center.getBoundingClientRect()

		const home = thumbnail(0).getBoundingClientRect()

		// The photo is on its way back, and is not at its thumbnail yet.
		expect(painted.width).toBeGreaterThan(home.width * 1.5)

		thumbnail(0).click()

		await frames()

		// The raise turns the photo around where it is, so it does not shrink to the thumbnail.
		expect(center.getBoundingClientRect().width).toBeGreaterThanOrEqual(painted.width - 1)
	})
})
