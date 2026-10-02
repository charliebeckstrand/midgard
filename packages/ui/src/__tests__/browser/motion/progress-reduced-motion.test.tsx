import { describe, expect, it } from 'vitest'
import { ProgressBar, ProgressGauge } from '../../../components/progress'
import { REDUCED_MOTION_QUERY } from '../../../utilities/media-query'
import { bySlot, renderUI, stubMatchMedia } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of the progress fills for a reader who asks for reduced
 * motion. The other suites mock `motion/react`, and the mock animates nothing.
 *
 * The bar animates `width` and the gauge animates `strokeDashoffset`. Neither
 * is a transform, so the reduced-motion config of motion does not skip them.
 * Before the fix, both swept up from zero on mount.
 */
describe('Progress fills under reduced motion (real Motion)', () => {
	it('paints the bar fill at its value on the first frame', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

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
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

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
