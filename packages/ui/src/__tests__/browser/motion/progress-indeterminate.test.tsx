import { describe, expect, it } from 'vitest'
import { ProgressBar } from '../../../components/progress'
import { REDUCED_MOTION_QUERY } from '../../../utilities/media-query'
import { bySlot, renderUI, stubMatchMedia } from '../../helpers'
import { frames, nextPaint } from '../../helpers/frames'

/**
 * Real-Motion check of the indeterminate ProgressBar. The other suites mock
 * `motion/react`, and the mock animates nothing.
 *
 * Before the fix, the fill named a keyframe that no stylesheet defined, so the
 * indeterminate bar was a static block at the start of the track.
 */
describe('Indeterminate ProgressBar (real Motion)', () => {
	function fillOf(container: HTMLElement) {
		const fill = bySlot(container, 'progress-bar')?.firstElementChild

		if (!fill) throw new Error('expected the fill')

		return fill
	}

	it('sweeps the fill along the track', async () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<ProgressBar aria-label="Loading" />
			</div>,
		)

		await nextPaint()

		const fill = fillOf(container)

		const start = fill.getBoundingClientRect().left

		await expect.poll(() => fill.getBoundingClientRect().left).not.toBe(start)
	})

	it('holds the fill still under reduced motion', async () => {
		stubMatchMedia((query) => query === REDUCED_MOTION_QUERY)

		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<ProgressBar aria-label="Loading" />
			</div>,
		)

		await nextPaint()

		const fill = fillOf(container)

		const start = fill.getBoundingClientRect().left

		await frames()

		await frames()

		expect(fill.getBoundingClientRect().left).toBe(start)
	})
})
