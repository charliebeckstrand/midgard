import { afterEach, describe, expect, it } from 'vitest'
import { ProgressBar } from '../../components/progress'
import { ROOT_REDUCED_MOTION_CLASS } from '../../core/motion/root'
import { bySlot, renderUI } from '../helpers'
import { frames, nextPaint } from '../helpers/frames'

/**
 * Real-browser check of the indeterminate ProgressBar. A CSS animation of
 * `ui/tailwind.css` runs the sweep, behind `motion-safe:`.
 *
 * An earlier fill named a keyframe that no stylesheet defined, so the
 * indeterminate bar was a static block at the start of the track.
 */
describe('Indeterminate ProgressBar (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove(ROOT_REDUCED_MOTION_CLASS)
	})

	function readFill(container: HTMLElement) {
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

		const fill = readFill(container)

		const start = fill.getBoundingClientRect().left

		await expect.poll(() => fill.getBoundingClientRect().left).not.toBe(start)
	})

	// The browser of the suite asks for no reduction, so the Motion setting of
	// the root reduces motion here.
	it('holds the fill still under reduced motion', async () => {
		document.documentElement.classList.add(ROOT_REDUCED_MOTION_CLASS)

		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<ProgressBar aria-label="Loading" />
			</div>,
		)

		await nextPaint()

		const fill = readFill(container)

		const start = fill.getBoundingClientRect().left

		await frames()

		await frames()

		expect(fill.getBoundingClientRect().left).toBe(start)
	})
})
