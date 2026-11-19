import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Swatch } from '../../../components/swatch'
import { allBySlot, renderUI } from '../../helpers'

/**
 * A vertical line swatch takes the width of a horizontal one, so the labels
 * after a column of mixed swatches start at one edge. The margin box of each
 * vertical variant must therefore match the width of the horizontal line at
 * each size.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no
 * stylesheet.
 */
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

const VARIANTS = ['solid', 'soft', 'outline', 'dashed'] as const

/** The width of the margin box of an element. */
function marginWidth(el: Element): number {
	const style = getComputedStyle(el)

	return (
		el.getBoundingClientRect().width +
		Number.parseFloat(style.marginLeft) +
		Number.parseFloat(style.marginRight)
	)
}

describe('swatch orientation (real browser)', () => {
	beforeAll(() => page.viewport(480, 320))

	for (const size of SIZES) {
		it(`gives each vertical line the width of a horizontal line at ${size}`, () => {
			const { container } = renderUI(
				<div>
					<Swatch shape="line" size={size} />

					{VARIANTS.map((variant) => (
						<Swatch
							key={variant}
							shape="line"
							variant={variant}
							orientation="vertical"
							size={size}
						/>
					))}
				</div>,
			)

			const [horizontal, ...vertical] = allBySlot(container, 'swatch')

			const width = (horizontal as Element).getBoundingClientRect().width

			expect(width).toBeGreaterThan(0)

			for (const swatch of vertical) {
				expect(marginWidth(swatch)).toBe(width)

				// The line is as long as a horizontal line is wide.
				expect(swatch.getBoundingClientRect().height).toBe(width)
			}
		})
	}
})
