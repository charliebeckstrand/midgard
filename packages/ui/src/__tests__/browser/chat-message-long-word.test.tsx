import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { getSlot, renderUI } from '../helpers'

const url = `https://example.com/${'a'.repeat(200)}`

/**
 * A bubble with a word that is wider than its line, such as a long URL, stays
 * inside a narrow host.
 *
 * The bubble broke such a word with `overflow-wrap: break-word`. That value
 * does not change the min-content width, so the word still set the minimum
 * width of the message. In a flex or grid host the message is an item with
 * `min-width: auto`, so it grew to the full word (about 1700px). With
 * `overflow-wrap: anywhere` the word can break at each character, and the
 * minimum width is one character.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('a chat bubble with a long word (real browser)', () => {
	for (const sender of ['user', 'assistant'] as const) {
		for (const host of ['block', 'flex', 'grid'] as const) {
			it(`stays inside a narrow ${host} host (${sender})`, () => {
				const { container } = renderUI(
					<div style={{ width: 240, display: host }}>
						<ChatMessage sender={sender}>{url}</ChatMessage>
					</div>,
				)

				const bubble = getSlot(container, 'chat-message-bubble')

				expect(bubble.getBoundingClientRect().width).toBeLessThanOrEqual(240)
			})
		}
	}
})
