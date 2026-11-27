import { describe, expect, it } from 'vitest'
import { Sparkline } from '../../../components/sparkline'
import { present, renderUI } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of the grow of the animated Sparkline bars. The other
 * suites mock `motion/react`, and the mock animates nothing.
 * `reduced-motion/sparkline-bar-grow.test.tsx` holds the check for a reader who
 * asks for reduced motion.
 */
describe('animated Sparkline bars (real Motion)', () => {
	it('grows each bar from the zero line', async () => {
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
