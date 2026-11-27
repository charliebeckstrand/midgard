import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { getSlot, renderUI } from '../helpers'
import { animationNames } from './helpers/animation-names'

/**
 * A streaming reply shows loading dots after its content, and the content
 * stays steady. The reader reads the reply while it streams, for many seconds,
 * so the text keeps its full contrast (WCAG 1.4.3). A pulse or a dim on the
 * text would lower it below 4.5:1 on the assistant fill.
 *
 * Rides the real browser because the claim is about the CSS animations and
 * the layout: jsdom runs no CSS animation and has no layout.
 */
describe('the streaming look of a chat reply (real browser)', () => {
	it('keeps the prose steady at full opacity, with the dots below it', () => {
		const { container } = renderUI(
			<div style={{ width: 480 }}>
				<ChatMessage streaming>Late stops rose 4% this month.</ChatMessage>
			</div>,
		)

		const prose = getSlot(container, 'markdown')

		expect(animationNames(prose)).toEqual([])

		expect(getComputedStyle(prose).opacity).toBe('1')

		const dots = getSlot(container, 'loading-dots').getBoundingClientRect()

		expect(dots.top).toBeGreaterThanOrEqual(prose.getBoundingClientRect().bottom)

		expect(dots.left).toBeCloseTo(prose.getBoundingClientRect().left, 0)
	})
})
