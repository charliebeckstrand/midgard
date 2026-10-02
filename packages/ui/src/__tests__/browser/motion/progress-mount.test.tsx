import { describe, expect, it } from 'vitest'
import { ProgressBar, ProgressGauge } from '../../../components/progress'
import { bySlot, renderUI } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of the progress fills on mount. The other suites mock
 * `motion/react`, and the mock animates nothing.
 *
 * Before the fix, both fills swept up from zero on each mount, so each tab
 * switch that brought a fill back played the sweep again.
 */
describe('Progress fills on mount (real Motion)', () => {
	it('paints the bar fill at its value on the first frame', async () => {
		const { container } = renderUI(
			<div style={{ width: 200 }}>
				<ProgressBar aria-label="Upload" value={70} />
			</div>,
		)

		await nextPaint()

		const fill = bySlot(container, 'progress-bar')?.firstElementChild

		if (!fill) throw new Error('expected the fill')

		expect(fill.getBoundingClientRect().width).toBeCloseTo(140, 0)
	})

	it('paints the gauge ring at its value on the first frame', async () => {
		const { container } = renderUI(<ProgressGauge aria-label="Upload" value={70} />)

		await nextPaint()

		const ring = bySlot(container, 'progress-gauge')?.querySelectorAll('circle')[1]

		if (!ring) throw new Error('expected the fill ring')

		const circumference = Number(ring.getAttribute('stroke-dasharray'))

		expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBeCloseTo(
			circumference * 0.3,
			1,
		)
	})
})
