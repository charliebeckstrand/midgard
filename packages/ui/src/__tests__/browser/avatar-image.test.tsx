import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Avatar } from '../../components/avatar'
import { attach, present, renderUI } from '../helpers'

/** A 1×1 PNG. */
const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

/**
 * The image of an avatar is a background layer over the initials.
 *
 * The image was an `<img>`. When the image failed to load, Chromium drew its broken-image icon
 * over the initials. A failed background paints nothing, so the initials show.
 *
 * Rides the real browser because the claims are computed ones: jsdom loads no image and no
 * stylesheet.
 */
describe('the image of an avatar (real browser)', () => {
	it('draws no broken image over the initials when the image fails to load', async () => {
		const { container } = renderUI(
			<Avatar src="/no-such-avatar.png" initials="JD" alt="Jane Doe" />,
		)

		const images = Array.from(container.querySelectorAll('img'))

		await vi.waitFor(() => {
			for (const image of images) expect(image.complete).toBe(true)
		})

		expect(images.filter((image) => image.naturalWidth === 0)).toEqual([])

		expect(present(container.querySelector('svg text'), 'initials')).toHaveTextContent('JD')
	})

	it('paints a loaded image, and asks the browser to print it', () => {
		const { container } = renderUI(<Avatar src={PIXEL} initials="JD" />)

		const style = getComputedStyle(
			present(container.querySelector('[data-slot="avatar-image"]'), 'image layer'),
		)

		expect(style.backgroundImage).toContain('data:image/png')

		expect(style.printColorAdjust).toBe('exact')
	})

	it('reads a src with a quote as one URL in server markup, and adds no declaration', () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = renderToString(
			<Avatar src={'/a.png"); color: rgb(255, 0, 0); --x: url("'} initials="JD" />,
		)

		const avatar = present(container.querySelector('[data-slot="avatar"]'), 'avatar')

		const layer = present(container.querySelector('[data-slot="avatar-image"]'), 'image layer')

		expect(getComputedStyle(layer).color).toBe(getComputedStyle(avatar).color)

		expect(getComputedStyle(layer).backgroundImage).not.toBe('none')
	})
})
