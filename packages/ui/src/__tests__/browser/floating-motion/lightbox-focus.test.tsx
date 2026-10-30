import { describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { present, renderUI, screen, waitFor } from '../../helpers'
import { fieldPhotos, Gallery, liveCount, viewerTweens } from '../helpers/lightbox'
import { waitForNoTween } from '../helpers/motion-frame'
import { pause } from '../helpers/wall-clock'

/**
 * When the viewer closes, the photo lands in the thumbnail of the photo on the
 * stage, and the focus goes to that thumbnail, not to the thumbnail that
 * opened the viewer. The focus moves when the photo lands. The focus manager
 * of the overlay then unmounts, and it does not move the focus back to the
 * thumbnail that opened the viewer.
 *
 * A mouse press on the stage, such as a drag of the photo, keeps the focus in
 * the viewer, so the arrow keys still step after it.
 *
 * The real engine and real Motion are necessary. The photo lands at the end of
 * the exit of the overlay, and the instant Motion mock removes the overlay in
 * the commit that closes it, so no exit occurs.
 */

const photos = fieldPhotos(['teal', 'tomato', 'gold', 'navy'])

const thumbnail = (index: number) => screen.getByRole('button', { name: photos[index]?.alt ?? '' })

const viewer = () => document.querySelector('[data-slot="lightbox"]')

describe('Lightbox focus (real engine, real Motion)', () => {
	it.for([
		{ reduced: false, name: 'the flight' },
		{ reduced: true, name: 'the fade' },
	])(
		'moves the focus to the thumbnail that the photo lands in, after $name',
		async ({ reduced }) => {
			renderUI(<Gallery photos={photos} reduced={reduced} />)

			await userEvent.click(thumbnail(0))

			await waitFor(() => expect(viewer()).toContainElement(document.activeElement as HTMLElement))

			await waitForNoTween(viewerTweens)

			await userEvent.keyboard('{ArrowRight}')

			await expect.poll(liveCount).toBe('2 of 4')

			await waitForNoTween(viewerTweens)

			await userEvent.keyboard('{ArrowRight}')

			await expect.poll(liveCount).toBe('3 of 4')

			await waitForNoTween(viewerTweens)

			await userEvent.keyboard('{Escape}')

			// The overlay unmounts after the photo lands, so its focus manager is gone.
			await expect.poll(viewer).toBeNull()

			expect(document.activeElement).toBe(thumbnail(2))
		},
	)

	it('keeps the focus in the viewer after a mouse drag on the stage', async () => {
		renderUI(<Gallery photos={photos} />)

		await userEvent.click(thumbnail(0))

		await waitFor(() => expect(viewer()).toContainElement(document.activeElement as HTMLElement))

		await waitForNoTween(viewerTweens)

		const stage = present(
			document.querySelector<HTMLElement>('[data-slot="lightbox-stage"]'),
			'stage',
		)

		const box = stage.getBoundingClientRect()

		const at = (dx: number) => ({ position: { x: box.width / 2 + dx, y: box.height / 2 } })

		// The mouse drags the photo a short way to the side, holds still, and lets go.
		await commands.pressPointer('[data-offset="0"] img')

		await userEvent.hover(stage, at(-20))

		await userEvent.hover(stage, at(-30))

		await pause(300)

		await commands.releasePointer()

		await waitForNoTween(viewerTweens)

		expect(liveCount()).toBe('1 of 4')

		expect(viewer()).toContainElement(document.activeElement as HTMLElement)

		// The arrow keys still step.
		await userEvent.keyboard('{ArrowRight}')

		await expect.poll(liveCount).toBe('2 of 4')
	})
})
