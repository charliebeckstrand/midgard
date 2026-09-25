import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { LoadingDots, LoadingSpinner } from '../../components/loading'
import { present, renderUI } from '../helpers'

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
const SPINNER_PX = { xs: 12, sm: 16, md: 20, lg: 24 } as const
const DOT_PX = { xs: 4, sm: 6, md: 8, lg: 10 } as const

describe('a loading indicator in a Button affix (real browser)', () => {
	for (const size of ['xs', 'sm', 'md', 'lg'] as const) {
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

			expect(spinner.getBoundingClientRect().width).toBe(SPINNER_PX[size])
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
