import { afterEach, describe, expect, it } from 'vitest'

/**
 * The root element has the color scheme of the theme: `light`, and `dark` while
 * the root has the `dark` class. The browser draws the scrollbars, the autofill
 * fill, and the parts of a native control in that scheme.
 *
 * No style set the scheme, so the browser drew these parts light in dark mode.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no
 * stylesheet.
 */
describe('the color scheme of the root (real browser)', () => {
	const root = document.documentElement

	afterEach(() => {
		root.classList.remove('dark')
	})

	it('is light without the dark class', () => {
		expect(getComputedStyle(root).colorScheme).toBe('light')
	})

	it('is dark with the dark class', () => {
		root.classList.add('dark')

		expect(getComputedStyle(root).colorScheme).toBe('dark')
	})
})
