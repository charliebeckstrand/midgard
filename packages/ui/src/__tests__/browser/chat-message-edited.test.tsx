import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { getSlot, renderUI } from '../helpers'

const branch = { index: 1, ids: ['u1', 'u2'] }

/**
 * The "(edited)" label of a message sits below the bubble, at the start of the
 * bubble. The branch switcher stays on the side of the speaker, in the same
 * row. The frame around the bubble holds the width cap of the bubble, so a
 * message with no label keeps the width that it had before the frame.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('the "(edited)" label of a chat message (real browser)', () => {
	it('sits below the bubble at its start, with the switcher at its end, in one row', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<ChatMessage sender="user" edited branch={branch}>
					How are late stops trending this month?
				</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble').getBoundingClientRect()

		const label = getSlot(container, 'chat-message-edited').getBoundingClientRect()

		const switcher = getSlot(container, 'chat-message-branch').getBoundingClientRect()

		expect(label.left).toBeCloseTo(bubble.left, 0)

		expect(label.top).toBeGreaterThanOrEqual(bubble.bottom)

		expect(switcher.right).toBeCloseTo(bubble.right, 0)

		expect(switcher.top + switcher.height / 2).toBeCloseTo(label.top + label.height / 2, 0)
	})

	it('keeps the bubble on the side of the speaker when the row is wider than the bubble', () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<ChatMessage sender="user" edited branch={branch}>
					Hi
				</ChatMessage>
			</div>,
		)

		const message = getSlot(container, 'chat-message').getBoundingClientRect()

		const bubble = getSlot(container, 'chat-message-bubble').getBoundingClientRect()

		const label = getSlot(container, 'chat-message-edited').getBoundingClientRect()

		expect(bubble.right).toBeCloseTo(message.right, 0)

		expect(label.left).toBeLessThan(bubble.left)
	})

	for (const sender of ['user', 'assistant'] as const) {
		it(`keeps the width cap of the bubble at 85% of the message (${sender})`, () => {
			const { container } = renderUI(
				<div style={{ width: 600 }}>
					<ChatMessage sender={sender} edited>
						{'Late stops rose across the week. '.repeat(8)}
					</ChatMessage>
				</div>,
			)

			const bubble = getSlot(container, 'chat-message-bubble').getBoundingClientRect()

			expect(bubble.width).toBeCloseTo(600 * 0.85, 0)
		})
	}
})
