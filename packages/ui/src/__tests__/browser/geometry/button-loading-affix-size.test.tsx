import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { densitySteps } from '../../../core/density'
import { iconSize } from '../../../core/density/geometry'
import { present, renderUI } from '../../helpers'

/**
 * A loading indicator in a Button affix takes the size of the Button.
 *
 * `LoadingSpinner` and `LoadingDots` are static and read no context. When a consumer passes one
 * as `prefix` or `suffix`, the indicator keeps its own `md` default unless the button recipe
 * projects a size onto it. The spinner must match the `shaku.icon` row of the Button size, and
 * the dots must match the dots `size` step of the same key.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
const DOT_PX = { xs: 4, sm: 6, md: 8, lg: 10, xl: 12 } as const

describe('a loading indicator in a Button affix (real browser)', () => {
	for (const size of densitySteps) {
		it(`sizes a prefix spinner to the ${size} icon row`, () => {
			const { container } = renderUI(
				<Button size={size} prefix={<LoadingSpinner />}>
					Loading
				</Button>,
			)

			const spinner = present(
				container.querySelector('[data-slot="loading-spinner"]'),
				'loading spinner',
			)

			expect(spinner.getBoundingClientRect().width).toBe(iconSize(size))
		})

		it(`sizes prefix dots to the ${size} dots step`, () => {
			const { container } = renderUI(
				<Button size={size} prefix={<LoadingDots />}>
					Loading
				</Button>,
			)

			const dot = present(container.querySelector('[data-slot="loading-dot"]'), 'loading dot')

			expect(dot.getBoundingClientRect().width).toBe(DOT_PX[size])
		})
	}
})
