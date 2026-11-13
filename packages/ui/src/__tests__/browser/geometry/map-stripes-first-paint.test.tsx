import { describe, expect, it } from 'vitest'
import { STRIPE_TILE } from '../../../modules/map/engine/map-constants'
import { attach, frames, getSlot, present } from '../../helpers'
import { hydrate, serverMarkup } from '../../helpers/hydrate'
import { categoricalPlat } from '../../helpers/map-plat'

/** A plat that measures its own box, with one striped category. */
const striped = categoricalPlat({
	categories: [{ value: 'West', color: 'blue', stripes: 'red' }],
	width: undefined,
})

/** The rounding of a scale that the browser computes from `cq` lengths. */
const SCALE_SLACK = 0.001

/** How far from one pixel for each unit the canonical frame draws at each width of the test, at least. */
const OFF_SCALE = 0.05

/** The px that one unit spans under `element`, from its screen matrix. */
function unitPixels(element: Element): number {
	return (element as SVGGraphicsElement).getScreenCTM()?.a ?? 0
}

/** The scale of the transform attribute of `pattern`, which turns its tile 45 degrees first. */
function patternScale(pattern: Element): number {
	const { a, b } = (pattern as SVGPatternElement).patternTransform.baseVal.consolidate()
		?.matrix ?? {
		a: 0,
		b: 0,
	}

	return Math.hypot(a, b)
}

/**
 * A stripe band is half a tile wide in pixels, in the two states of a frame:
 * the server paint, which draws the canonical frame before any measurement,
 * and the measured fit. The canonical frame scales to meet a box that no render
 * knows. A tile in frame units then draws narrower or wider than its width in
 * pixels, and jumps to its width at hydration.
 *
 * Before the measurement, a rule scales the group of the outer pattern by its
 * computed `transform`. Only a layout engine resolves the `cq` units of the
 * rule, so only here can a test read the scale.
 */
describe('map stripes first paint (real browser)', () => {
	it.each([320, 390, 640, 1600])(
		'draws the tile at its width in pixels, before and after hydration, at %i px',
		async (width) => {
			const container = attach(serverMarkup(striped))

			container.style.width = `${width}px`

			const regions = getSlot(container, 'map-regions')

			const group = present(container.querySelector('[data-map-stripes]'), 'the stripes group')

			const scale = new DOMMatrix(getComputedStyle(group).transform).a

			// The canonical frame draws at another scale than one pixel for each unit at
			// every width here, so a tile in frame units alone would draw at another width.
			expect(unitPixels(regions)).not.toBeNear(1, OFF_SCALE)

			expect(scale * unitPixels(regions)).toBeNear(1, SCALE_SLACK)

			const { consoleError, onRecoverableError } = hydrate(container, striped)

			await frames()

			expect(consoleError).not.toHaveBeenCalled()

			expect(onRecoverableError).not.toHaveBeenCalled()

			// The measured frame fills the tile pattern itself, and the outer one is gone.
			expect(container.querySelector('[data-map-stripes]')).toBeNull()

			const tile = present(container.querySelector('pattern'), 'the tile pattern')

			expect(Number(tile.getAttribute('width'))).toBe(STRIPE_TILE)

			expect(patternScale(tile) * unitPixels(getSlot(container, 'map-regions'))).toBeNear(
				1,
				SCALE_SLACK,
			)
		},
	)
})
