import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { getSlot, renderUI } from '../helpers'

/**
 * The lowest opacity of a keyframe of each CSS animation that runs on
 * `element`. A keyframe with no opacity does not count.
 */
function lowestOpacity(element: Element): number {
	const values = element
		.getAnimations()
		.flatMap((animation) => (animation.effect as KeyframeEffect).getKeyframes())
		.map((keyframe) => keyframe.opacity)
		.filter((opacity) => opacity !== undefined)
		.map(Number)

	expect(values.length).toBeGreaterThan(0)

	return Math.min(...values)
}

/**
 * A streaming reply pulses its prose. The reader reads the reply while it
 * streams, for many seconds, so the text keeps 4.5:1 (WCAG 1.4.3) at the
 * lowest point of the pulse. On the assistant fill, 60% gives 5.1:1, and 50%
 * gives only 3.6:1. The standing dim of the reduced-motion reader is 60% for
 * the same reason, so the pulse and the dim share one floor.
 *
 * Rides the real browser because the claim is about the keyframes that the
 * CSS gives: jsdom runs no CSS animation.
 */
describe('the pulse of a streaming chat reply (real browser)', () => {
	it('keeps the prose at 60% opacity or more', () => {
		const { container } = renderUI(
			<ChatMessage streaming>Late stops rose 4% this month.</ChatMessage>,
		)

		expect(lowestOpacity(getSlot(container, 'markdown'))).toBeGreaterThanOrEqual(0.6)
	})
})
