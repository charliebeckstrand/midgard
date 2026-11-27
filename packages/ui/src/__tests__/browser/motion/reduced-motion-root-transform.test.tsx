import { describe, expect, it } from 'vitest'
import { ReducedMotion } from '../../../primitives/reduced-motion'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'

/** The x translation of the box, as the browser computes it. */
function readX() {
	const { transform } = getComputedStyle(screen.getByTestId('box'))

	return new DOMMatrixReadOnly(transform === 'none' ? undefined : transform).m41
}

/**
 * Real-Motion check of a `ReducedMotion` root with no Motion setting, for a
 * reader who does not ask for reduced motion. The root sets
 * `reducedMotion: 'user'`, so a transform travels to its target.
 * `reduced-motion/reduced-motion-root-transform.test.tsx` holds the check for a
 * reader who asks for reduced motion.
 */
describe('ReducedMotion root under full motion (real Motion)', () => {
	it('moves a transform over its transition', async () => {
		renderUI(
			<ReducedMotion>
				<m.div
					data-testid="box"
					initial={{ x: 0 }}
					animate={{ x: 100 }}
					transition={{ duration: 0.5 }}
				/>
			</ReducedMotion>,
		)

		const travel = await sampleMotionFrames(readX, (x) => x > 0 && x < 100)

		expect(travel).toBeGreaterThan(0)
	})
})
