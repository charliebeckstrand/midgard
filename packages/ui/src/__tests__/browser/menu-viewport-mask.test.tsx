import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/menu'
import { present, renderUI } from '../helpers'

/**
 * Menu viewport fade (real pixels). The viewport draws its edge fades with the
 * Tailwind edge-mask utilities. This test compares them with the reference
 * gradient: one linear gradient with a 1.5rem fade at each overflowing edge.
 * The screenshots must agree pixel for pixel, and the viewport must have no
 * mask when no edge overflows.
 */
const REFERENCE = cn(
	'mask-[linear-gradient(to_bottom,transparent,black_var(--fade-above,0px),black_calc(100%-var(--fade-below,0px)),transparent)]',
	'data-overflow-above:[--fade-above:1.5rem]',
	'data-overflow-below:[--fade-below:1.5rem]',
)

async function decode(png: string) {
	const image = new Image()

	image.src = `data:image/png;base64,${png}`

	await image.decode()

	const canvas = document.createElement('canvas')

	canvas.width = image.width
	canvas.height = image.height

	const context = canvas.getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	context.drawImage(image, 0, 0)

	return { data: context.getImageData(0, 0, image.width, image.height).data, width: image.width }
}

async function shot(className: string, above: boolean, below: boolean) {
	const { container, unmount } = renderUI(
		<div
			className={className}
			data-overflow-above={above ? '' : undefined}
			data-overflow-below={below ? '' : undefined}
			style={{ width: 120, height: 120, background: 'black' }}
		/>,
	)

	const el = present(container.firstElementChild as HTMLElement | null, 'box')

	const mask = getComputedStyle(el).maskImage

	const png = await page.screenshot({ element: el, save: false })

	unmount()

	return { png, mask }
}

describe('Menu viewport mask (real browser)', () => {
	for (const [above, below] of [
		[true, false],
		[false, true],
		[true, true],
	] as const) {
		it(`paints the reference fade (above ${above}, below ${below})`, async () => {
			const reference = await decode((await shot(REFERENCE, above, below)).png)

			const viewport = await decode((await shot(k.viewport(), above, below)).png)

			expect(viewport.data.length).toBe(reference.data.length)

			// The box ends on a fractional device pixel, and the reference gradient
			// closes with a zero-length stop at an edge that does not overflow. Both
			// antialias the outermost pixel row and column, so the comparison skips
			// them.
			const height = reference.data.length / 4 / reference.width

			const mismatches: string[] = []

			for (let y = 1; y < height - 1; y++) {
				for (let x = 1; x < reference.width - 1; x++) {
					const i = (y * reference.width + x) * 4

					const [a, b] = [reference.data[i] ?? 0, viewport.data[i] ?? 0]

					if (Math.abs(a - b) > 2) mismatches.push(`${x},${y}:${a}/${b}`)
				}
			}

			expect(mismatches.slice(0, 30)).toEqual([])
		})
	}

	it('applies no mask when no edge overflows', async () => {
		expect((await shot(k.viewport(), false, false)).mask).toBe('none')
	})
})
