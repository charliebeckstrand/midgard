import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../../components/lightbox'
import { present, renderUI } from '../../helpers'
import { sampleMotionFrames, waitForNoTween } from '../helpers/motion-frame'

/**
 * A `Lightbox` with `thumbnails`, and a press on a thumbnail that is not next to
 * the photo in the center. The photo of the thumbnail takes the slot next to
 * the center, on its side of the line, so the slide is one step long and
 * passes no photo between them. A press during that slide lands the far photo
 * where it paints, and the photo that the slide left stays next to it.
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

const slot = (offset: number) => document.querySelector<HTMLElement>(`[data-offset="${offset}"]`)

const photoAt = (offset: number) =>
	present<HTMLImageElement>(slot(offset)?.querySelector('img'), `photo of slot ${offset}`)

const track = () => present(slot(0)?.parentElement, 'track')

/** The photos on the track, in the order of the slots. */
const onTrack = () =>
	[-1, 0, 1].flatMap((offset) => {
		const alt = slot(offset)?.querySelector('img')?.alt

		return alt ? [alt] : []
	})

/** The thumbnail in the row of the viewer of the photo at `index`. */
const thumbnail = (index: number) =>
	present(
		document.querySelectorAll<HTMLElement>('[data-slot="lightbox-controls"] button:has(img)')[
			index
		],
		`thumbnail ${index}`,
	)

/**
 * The tweens on the stage: the raise and the slides. The row of thumbnails is
 * a rail, and the fades of its edges are scroll-driven animations that never
 * end, so the wait reads only the stage.
 */
const stageTweens = () =>
	document.querySelector('[data-slot="lightbox-stage"]')?.getAnimations({ subtree: true }) ?? []

/** The travel of the track, in px. */
const travel = () => new DOMMatrix(getComputedStyle(track()).transform).m41

/**
 * Presses the thumbnail of the photo at `index`, and holds the slide of the
 * track at `progress` of its length, in the frame that starts it. A held
 * slide from before the press is not the new slide. See
 * `lightbox-reopen.test.tsx` for why the sampler starts before the press.
 */
async function pressAndHold(index: number, progress: number, before: readonly Animation[] = []) {
	return sampleMotionFrames(
		() =>
			track()
				.getAnimations()
				.filter((tween) => !before.includes(tween)),
		(found) => {
			if (found.length === 0) return false

			for (const tween of found) {
				tween.pause()

				tween.currentTime = progress * Number(tween.effect?.getComputedTiming().duration)
			}

			return true
		},
		{ during: () => userEvent.click(thumbnail(index)) },
	)
}

/** Opens the viewer on the photo at `index`, and waits for the photo to land. */
async function open(index: number) {
	renderUI(
		<Lightbox photos={photos} thumbnails>
			<div className="flex flex-wrap gap-2">
				{photos.map((photo, place) => (
					<LightboxTrigger key={photo.alt} index={place} className="size-16" />
				))}
			</div>
		</Lightbox>,
	)

	await userEvent.click(
		present(document.querySelectorAll('[data-slot="lightbox-trigger"]')[index], 'trigger'),
	)

	await expect.poll(() => slot(0)).not.toBeNull()

	await waitForNoTween(stageTweens)
}

describe('Lightbox press on a far thumbnail (real browser)', () => {
	afterEach(async () => {
		await waitForNoTween(stageTweens)
	})

	it('slides the far photo in from the slot after the center, one step long', async () => {
		await open(0)

		const step = slot(0)?.offsetWidth ?? 0

		const tweens = await pressAndHold(3, 0.5)

		// Halfway, the far photo holds the slot after the center, and no photo
		// between them is on the track.
		expect(onTrack()).toEqual(['teal field', 'navy field'])

		const navy = photoAt(1)

		expect(travel()).toBeLessThan(0)

		expect(travel()).toBeGreaterThan(-step - 32)

		for (const tween of tweens) tween.play()

		await waitForNoTween(stageTweens)

		expect(photoAt(0)).toBe(navy)

		expect(travel()).toBe(0)

		// At rest, the photos next to it are its neighbors.
		expect(onTrack()).toEqual(['gold field', 'navy field', 'plum field'])
	})

	it('slides the far photo in from the slot before the center', async () => {
		await open(4)

		const tweens = await pressAndHold(1, 0.5)

		expect(onTrack()).toEqual(['tomato field', 'plum field'])

		expect(travel()).toBeGreaterThan(0)

		for (const tween of tweens) tween.play()

		await waitForNoTween(stageTweens)

		expect(photoAt(0).alt).toBe('tomato field')

		expect(onTrack()).toEqual(['teal field', 'tomato field', 'gold field'])
	})

	it('keeps the photo that the slide left next to the far photo when a press stops the slide', async () => {
		await open(0)

		const held = await pressAndHold(3, 0.5)

		const teal = photoAt(0)

		const left = teal.getBoundingClientRect().left

		const back = await pressAndHold(0, 0, held)

		// The press lands the far photo where the slide painted, so nothing jumps,
		// and the slide back goes to the photo that it left.
		expect(photoAt(-1)).toBe(teal)

		expect(photoAt(0).alt).toBe('navy field')

		expect(teal.getBoundingClientRect().left).toBeCloseTo(left, 0)

		for (const tween of back) tween.play()

		await waitForNoTween(stageTweens)

		expect(photoAt(0)).toBe(teal)

		expect(onTrack()).toEqual(['teal field', 'tomato field'])
	})
})
