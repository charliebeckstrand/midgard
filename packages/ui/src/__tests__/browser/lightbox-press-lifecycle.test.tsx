import { afterEach, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { Lightbox, type LightboxPhoto, LightboxTrigger } from '../../components/lightbox'
import { frames, present, renderUI, screen } from '../helpers'

/**
 * The life of a press on the stage of a `Lightbox`. A press ends when its pointer has no button
 * down, when the stage loses the capture of its pointer, and on a cancel for its own pointer. A
 * step first ends the live press, and the restore of a swipe to close that did not close.
 *
 * Rides the real browser because the track reads the real layout, Motion runs real tweens, and
 * the first case needs a release that the browser sends to a control, not to the stage.
 */

function photo(alt: string, fill: string): LightboxPhoto {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${fill}"/></svg>`

	return {
		src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
		alt,
		width: 1200,
		height: 900,
	}
}

const photos = [
	photo('Teal field', 'teal'),
	photo('Red barn', 'firebrick'),
	photo('Gold dune', 'gold'),
]

function stage() {
	return present(document.querySelector<HTMLElement>('[data-slot="lightbox-stage"]'), 'stage')
}

function track() {
	return present(stage().firstElementChild, 'track') as HTMLElement
}

/** The photo in the center slot. */
function center() {
	return present(document.querySelector<HTMLImageElement>('[data-offset="0"] img'), 'photo')
}

/** The alt of each photo that a transform moves from its rest. */
function photosOffRest() {
	return [...document.querySelectorAll<HTMLImageElement>('[data-slot="lightbox-photo"]')]
		.filter((photo) => !['', 'none'].includes(photo.style.transform))
		.map((photo) => photo.alt)
}

/** The opacity that a swipe to close paints on the layer of the controls. */
function controlsOpacity() {
	const layer = present(document.querySelector('[data-slot="lightbox-controls"]'), 'controls')

	return Number(getComputedStyle(present(layer.parentElement, 'controls layer')).opacity)
}

/** Waits until no tween runs on the page: the flight, a slide, or a restore. */
async function settle() {
	await expect.poll(() => document.getAnimations().length).toBe(0)

	await frames()
}

/** Opens the viewer at the first photo, and waits for the photo to land. */
async function open() {
	renderUI(
		<Lightbox photos={photos}>
			{photos.map((photo, index) => (
				<LightboxTrigger key={photo.alt} index={index} className="size-16" />
			))}
		</Lightbox>,
	)

	await userEvent.click(screen.getByRole('button', { name: 'Teal field' }))

	await expect.poll(() => document.querySelector('[data-slot="lightbox-stage"]')).not.toBeNull()

	await settle()
}

/**
 * Sends a pointer event to the stage at `(dx, dy)` from its center. Each event carries its own
 * time, in ms, so the speed of a move does not depend on the speed of the runner.
 */
function fire(
	type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
	dx: number,
	dy: number,
	timeStamp: number,
	{ pointerId = 1, pointerType = 'touch' }: { pointerId?: number; pointerType?: string } = {},
) {
	const box = stage().getBoundingClientRect()

	const event = new PointerEvent(type, {
		bubbles: true,
		cancelable: true,
		pointerId,
		pointerType,
		isPrimary: pointerId === 1,
		button: 0,
		buttons: type === 'pointerdown' || type === 'pointermove' ? 1 : 0,
		clientX: box.left + box.width / 2 + dx,
		clientY: box.top + box.height / 2 + dy,
	})

	Object.defineProperty(event, 'timeStamp', { value: timeStamp })

	stage().dispatchEvent(event)
}

function arrowRight() {
	present(document.querySelector('[data-slot="lightbox"]'), 'viewer').dispatchEvent(
		new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
	)
}

describe('Lightbox press lifecycle (real browser)', () => {
	afterEach(() => commands.releasePointer())

	it('ends a press that the stage did not see lift, such as a release over the step pill', async () => {
		await open()

		const rest = { photo: center().style.transform, track: track().style.transform }

		await commands.pressPointer('[data-slot="lightbox-stage"]')

		// The release goes to the Next button, which is not in the stage.
		await commands.releasePointer('[aria-label="Next photo"]')

		// The mouse comes back over the stage, 100px left of the press, with no button held.
		const box = stage().getBoundingClientRect()

		await userEvent.hover(stage(), { position: { x: box.width / 2 - 100, y: box.height / 2 } })

		await frames()

		expect(stage()).not.toHaveAttribute('data-raised')

		expect(center().style.transform).toBe(rest.photo)

		expect(track().style.transform).toBe(rest.track)

		expect(document.querySelector('style[data-drag-cursor]')).toBeNull()
	})

	it('ends a swipe when the stage loses the capture of its pointer', async () => {
		await open()

		const box = stage().getBoundingClientRect()

		const at = (dx: number) => ({ position: { x: box.width / 2 + dx, y: box.height / 2 } })

		await commands.pressPointer('[data-slot="lightbox-stage"]')

		await userEvent.hover(stage(), at(-50))

		// The capture that the swipe sets takes effect at the next move.
		await userEvent.hover(stage(), at(-60))

		// The swipe holds the track.
		expect(track().style.transform).toMatch(/^translateX\(-/)

		stage().releasePointerCapture(1)

		// The button is still down, but the stage no longer holds the pointer.
		await userEvent.hover(stage(), at(-120))

		await settle()

		// The track slid back to rest.
		expect(['', 'none']).toContain(track().style.transform)
	})

	it('keeps a swipe through a cancel from a finger that it ignores', async () => {
		await open()

		fire('pointerdown', 0, 0, 0)

		fire('pointermove', -60, 0, 500)

		// A second finger during a swipe is not part of the press.
		fire('pointerdown', 40, 40, 600, { pointerId: 7 })

		fire('pointercancel', 40, 40, 700, { pointerId: 7 })

		fire('pointermove', -120, 0, 1000)

		expect(track().style.transform).toBe('translateX(-120px)')

		fire('pointerup', -120, 0, 1500)

		await settle()
	})

	it('ends a swipe along the line when an arrow key steps', async () => {
		await open()

		fire('pointerdown', 0, 0, 0, { pointerType: 'mouse' })

		fire('pointermove', -60, 0, 500, { pointerType: 'mouse' })

		arrowRight()

		// The step ended the press, so the mouse no longer moves the track.
		fire('pointermove', -160, 0, 1000, { pointerType: 'mouse' })

		fire('pointerup', -160, 0, 1500, { pointerType: 'mouse' })

		await settle()

		expect(center()).toHaveAttribute('alt', 'Red barn')

		expect(screen.getByText('2 / 3')).toBeVisible()

		expect(track().style.transform).toBe('none')
	})

	it('ends a swipe to close when an arrow key steps', async () => {
		await open()

		fire('pointerdown', 0, 0, 0)

		fire('pointermove', 0, 60, 500)

		arrowRight()

		fire('pointerup', 0, 60, 1000)

		await settle()

		expect(center()).toHaveAttribute('alt', 'Red barn')

		expect(screen.getByText('2 / 3')).toBeVisible()

		expect(photosOffRest()).toEqual([])

		expect(stage()).not.toHaveAttribute('data-raised')

		expect(controlsOpacity()).toBe(1)
	})

	it('steps during the restore of a swipe to close that did not close', async () => {
		await open()

		fire('pointerdown', 0, 0, 0)

		fire('pointermove', 0, 40, 500)

		// Too short and too slow to close, so the photo starts back to rest.
		fire('pointerup', 0, 40, 1000)

		arrowRight()

		await settle()

		expect(center()).toHaveAttribute('alt', 'Red barn')

		expect(screen.getByText('2 / 3')).toBeVisible()

		expect(photosOffRest()).toEqual([])

		expect(stage()).not.toHaveAttribute('data-raised')

		expect(controlsOpacity()).toBe(1)
	})
})
