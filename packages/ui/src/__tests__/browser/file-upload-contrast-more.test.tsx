import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cdp, userEvent } from 'vitest/browser'
import { FileUploadDrop } from '../../components/file-upload'
import { contrastRatio, type Srgb, WCAG_NON_TEXT } from '../../utilities/contrast'
import { frames, present, renderUI } from '../helpers'
import { holdRootClass } from './helpers/root-state'

/** The page surface of each mode, as the `sen` contrast guard measures it. */
const surface = { light: 'white', dark: 'var(--color-zinc-900)' } as const

/**
 * A computed color, drawn over a surface. The canvas flattens each color form
 * that the browser computes (`oklch()` with an alpha, for a Tailwind color) to
 * sRGB.
 */
function over(color: string, base: string): Srgb {
	const context = document.createElement('canvas').getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	// A canvas fill takes no `var()`, so a theme token resolves on the root first.
	const paint = (fill: string) => {
		const token = /^var\((--[\w-]+)\)$/.exec(fill)?.[1]

		context.fillStyle = token
			? getComputedStyle(document.documentElement).getPropertyValue(token)
			: fill
		context.fillRect(0, 0, 1, 1)
	}

	paint(base)
	paint(color)

	const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data

	return [r / 255, g / 255, b / 255]
}

/**
 * When the user asks for more contrast, the dashed edge of a FileUpload dropzone
 * has a 3:1 contrast on the page, and a hover does not lower it. A hover color
 * with no `contrast-more:` step outranks the step of the resting edge, so the
 * hover made the edge lighter than at rest.
 */
describe('FileUpload dropzone under prefers-contrast: more (real browser)', () => {
	const contrast = (value: string) =>
		cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'prefers-contrast', value }],
		})

	beforeAll(() => contrast('more'))

	afterAll(() => contrast(''))

	it.each(['light', 'dark'] as const)(
		'keeps the edge at 3:1 at rest and on hover in %s',
		async (mode) => {
			if (mode === 'dark') holdRootClass('dark')

			const { container } = renderUI(<FileUploadDrop />)

			await frames()

			const zone = present(
				container.querySelector<HTMLElement>('[data-slot="file-upload"]'),
				'dropzone',
			)

			const page = over(surface[mode], 'white')

			const edge = () =>
				contrastRatio(over(getComputedStyle(zone).borderTopColor, surface[mode]), page)

			const rest = edge()

			await userEvent.hover(zone)
			await frames()

			const hover = edge()

			expect(rest).toBeGreaterThanOrEqual(WCAG_NON_TEXT)
			expect(hover).toBeGreaterThanOrEqual(rest)
		},
	)
})
