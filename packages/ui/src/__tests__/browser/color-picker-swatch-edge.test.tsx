import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { ColorPicker } from '../../components/color'
import { bySlot, present, renderUI } from '../helpers'

/**
 * The swatch of the ColorPicker trigger paints its edge above its color.
 *
 * The inset ring was on the outer span, and the color was a child that filled the whole box. An
 * inset shadow paints under the children of its element, so an opaque color hid the ring. A white
 * swatch then had no edge on a white control, and a black swatch had no edge in dark mode.
 *
 * The file runs in the real browser, because the claim is a painted color and jsdom paints
 * nothing. Each case reads the pixels of a screenshot of the swatch.
 */
describe('the edge of the ColorPicker trigger swatch (real browser)', () => {
	// The default viewport is taller than the page of the headless browser, so Vitest scales the
	// frame down. A scaled screenshot mixes the 1px edge with the pixels around the swatch. At
	// this height the scale is 1, and the first column of the screenshot is the edge.
	beforeAll(() => page.viewport(414, 640))

	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	/** The red channel of the swatch at the middle of its start edge and at its center. */
	async function edgeAndCenter(color: string, dark: boolean) {
		if (dark) document.documentElement.classList.add('dark')

		const { container } = renderUI(<ColorPicker defaultValue={color} />)

		const swatch = present(bySlot(container, 'color-picker-swatch'), 'trigger swatch')

		const image = new Image()

		image.src = `data:image/png;base64,${await page.screenshot({ element: swatch, save: false })}`

		await image.decode()

		const canvas = document.createElement('canvas')

		canvas.width = image.width

		canvas.height = image.height

		const context = canvas.getContext('2d')

		if (!context) throw new Error('expected a 2D context')

		context.drawImage(image, 0, 0)

		const middle = Math.floor(image.height / 2)

		const red = (x: number) => context.getImageData(x, middle, 1, 1).data[0] ?? Number.NaN

		return { edge: red(0), center: red(Math.floor(image.width / 2)) }
	}

	it.each([
		['#ffffff', false],
		['#000000', true],
	])('gives a %s swatch an edge (dark: %s)', async (color, dark) => {
		const { edge, center } = await edgeAndCenter(color, dark)

		expect(Math.abs(edge - center)).toBeGreaterThan(10)
	})
})
