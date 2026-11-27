import { describe, expect, it } from 'vitest'
import { ProgressBar, ProgressGauge } from '../../../components/progress'
import { renderUI } from '../../helpers'
import { nextPaint } from '../../helpers/frames'
import { barFill, gaugeFill } from '../helpers/progress'

/**
 * Real-Motion check of the progress fills for a reader who asks for reduced
 * motion. `motion/progress-mount.test.tsx` holds the check for full motion.
 *
 * The bar animates `width` and the gauge animates `strokeDashoffset`. Neither
 * is a transform, so the reduced-motion config of Motion does not skip them.
 * Before the fix, both swept up from zero on mount.
 */
describe('Progress fills under reduced motion (real Motion)', () => {
	it('paints the bar fill at its value on the first frame', async () => {
		const { container } = renderUI(
			<div style={{ width: 200 }}>
				<ProgressBar aria-label="Upload" value={70} />
			</div>,
		)

		await nextPaint()

		expect(barFill(container).getBoundingClientRect().width).toBeCloseTo(140, 0)
	})

	it('paints the gauge ring at its value on the first frame', async () => {
		const { container } = renderUI(<ProgressGauge aria-label="Upload" value={70} />)

		await nextPaint()

		const ring = gaugeFill(container)

		const circumference = Number(ring.getAttribute('stroke-dasharray'))

		expect(Number.parseFloat(getComputedStyle(ring).strokeDashoffset)).toBeCloseTo(
			circumference * 0.3,
			1,
		)
	})
})
