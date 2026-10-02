import { describe, expect, it } from 'vitest'
import { ProgressGauge } from '../../../components/progress'
import { bySlot, renderUI, waitFor } from '../../helpers'
import { nextPaint } from '../../helpers/frames'

function fillOf(container: HTMLElement) {
	const ring = bySlot(container, 'progress-gauge')?.querySelectorAll('circle')[1]

	if (!ring) throw new Error('expected the fill ring')

	return ring
}

/**
 * Real-Motion check of the gauge fill at 0%. The other suites mock
 * `motion/react`, and the mock gives the fill no opacity.
 *
 * At 0% the dash has no length, but the round cap of the dash painted a dot,
 * so an empty gauge showed a small arc.
 */
describe('ProgressGauge at 0% (real Motion)', () => {
	it('paints no fill at 0% on the first frame', async () => {
		const { container } = renderUI(<ProgressGauge aria-label="Upload" value={0} />)

		await nextPaint()

		expect(getComputedStyle(fillOf(container)).opacity).toBe('0')
	})

	it('paints the fill at full opacity above 0%', async () => {
		const { container } = renderUI(<ProgressGauge aria-label="Upload" value={5} />)

		await nextPaint()

		expect(getComputedStyle(fillOf(container)).opacity).toBe('1')
	})

	it('removes the fill when the value goes down to 0%', async () => {
		const { container, rerender } = renderUI(<ProgressGauge aria-label="Upload" value={40} />)

		await nextPaint()

		rerender(<ProgressGauge aria-label="Upload" value={0} />)

		await waitFor(() => expect(getComputedStyle(fillOf(container)).opacity).toBe('0'), {
			timeout: 3000,
		})
	})
})
