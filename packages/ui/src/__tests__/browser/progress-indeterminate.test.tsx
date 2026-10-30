import { describe, expect, it } from 'vitest'
import { ProgressBar } from '../../components/progress'
import { ROOT_REDUCED_MOTION_CLASS } from '../../core/motion/root'
import { bySlot, renderUI } from '../helpers'
import { frames, nextPaint } from '../helpers/frames'
import { holdRootClass } from './helpers/root-state'

/**
 * Real-browser check of the indeterminate ProgressBar. A CSS animation of
 * `ui/tailwind.css` runs the sweep, behind `motion-safe:`.
 * `progress-sweep-rtl.test.tsx` checks that the sweep moves.
 */
describe('Indeterminate ProgressBar (real browser)', () => {
	function readFill(container: HTMLElement) {
		const fill = bySlot(container, 'progress-bar')?.firstElementChild

		if (!fill) throw new Error('expected the fill')

		return fill
	}

	// The browser of the suite asks for no reduction, so the Motion setting of
	// the root reduces motion here.
	it('holds the fill still under reduced motion', async () => {
		holdRootClass(ROOT_REDUCED_MOTION_CLASS)

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
