import { describe, expect, it } from 'vitest'
import { Sparkline } from '../../../components/sparkline'
import { REDUCED_MOTION_QUERY } from '../../../utilities/media-query'
import { present, renderUI, stubMatchMedia } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of the animated Sparkline bars for a reader who asks for
 * reduced motion. The other suites mock `motion/react`, and the mock animates
 * nothing.
 *
 * A bar grows by its `height`, and `height` is no transform. The
 * reduced-motion config of motion does not skip it, so the bar must skip its
 * `initial` state itself.
 */
describe('animated Sparkline bars under reduced motion (real Motion)', () => {
	it('paints each bar at its full height on the first frame', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		const { container } = renderUI(
			<Sparkline
				data={[1, 4, 2, 8, 5]}
				shape="bar"
				width={96}
				height={32}
				aria-label="Trend"
				animate
			/>,
		)

		await nextPaint()

		const bars = [...container.querySelectorAll('rect')]

		// The count is live, so the check below can fail.
		expect(bars).toHaveLength(5)

		const box = present(container.querySelector('svg'), 'svg').getBoundingClientRect()

		const tallest = present(bars[3], 'the tallest bar').getBoundingClientRect()

		// The tallest bar spans the inner box: the box height of 32, less an inset
		// of 1.75 on each side. It stands on the bottom of that box.
		expect(tallest.height).toBeCloseTo(28.5, 0)

		expect(tallest.bottom - box.top).toBeCloseTo(30.25, 0)
	})
	it('keeps the grow for a reader who does not ask for reduced motion', async () => {
		stubMatchMedia(() => false)

		const { container } = renderUI(
			<Sparkline
				data={[1, 4, 2, 8, 5]}
				shape="bar"
				width={96}
				height={32}
				aria-label="Trend"
				animate
			/>,
		)

		await nextPaint()

		const tallest = present(container.querySelectorAll('rect')[3], 'the tallest bar')

		expect(tallest.getBoundingClientRect().height).toBeLessThan(28)
	})
})
