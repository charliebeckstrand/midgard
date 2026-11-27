import { describe, expect, it } from 'vitest'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'

/** The x translation and the opacity of the box, as the browser computes them. */
function readBox() {
	const style = getComputedStyle(screen.getByTestId('box'))

	return {
		x: new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform).m41,
		opacity: Number.parseFloat(style.opacity),
	}
}

/**
 * Real-Motion check of a `ReducedMotion` root with no Motion setting, for a
 * reader who asks for reduced motion. The root sets `reducedMotion: 'user'`,
 * and Motion reads the platform setting itself: it skips a transform and keeps
 * a fade. `motion/reduced-motion-root-transform.test.tsx` holds the travel for
 * full motion.
 *
 * Motion reads `(prefers-reduced-motion)` one time for each page, and keeps the
 * value. A `matchMedia` stub in a case cannot change it, so only a page that
 * asks for reduced motion shows this path.
 */
describe('ReducedMotion root under reduced motion (real Motion)', () => {
	it('puts a transform at its target while the fade still plays', async () => {
		renderUI(
			<ReducedMotion>
				<m.div
					data-testid="box"
					initial={{ x: 0, opacity: 0 }}
					animate={{ x: 100, opacity: 1 }}
					transition={{ duration: 0.5 }}
				/>
			</ReducedMotion>,
		)

		const fading = await sampleMotionFrames(readBox, ({ opacity }) => opacity > 0 && opacity < 1)

		expect(fading.x).toBe(100)
	})
})
