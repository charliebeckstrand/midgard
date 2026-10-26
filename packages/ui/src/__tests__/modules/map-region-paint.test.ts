// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { emphasisOutline } from '../../modules/map/engine/map-region/paint'

describe('emphasisOutline', () => {
	it('gives a light fill the dark outline and a dark fill the white one, in both modes', () => {
		expect(emphasisOutline('#fffbeb')).toBe('stroke-zinc-900')

		expect(emphasisOutline('rgb(245 197 66)')).toBe('stroke-zinc-900')

		expect(emphasisOutline('#451a03')).toBe('stroke-white')

		expect(emphasisOutline('oklch(0.3 0.1 50)')).toBe('stroke-white')
	})

	it('gives a class fill the selection ink of the mode', () => {
		expect(emphasisOutline(undefined)).toBe('stroke-zinc-900 dark:stroke-white')
	})

	it('gives a stop it cannot measure the selection ink of the mode', () => {
		// A stop passes through verbatim, so a CSS color name reaches the outline.
		expect(emphasisOutline('steelblue')).toBe('stroke-zinc-900 dark:stroke-white')
	})
})
