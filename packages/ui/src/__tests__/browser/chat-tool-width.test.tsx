import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatMessage, type ChatToolPart } from '../../modules/chat'
import { getSlot, present, renderUI } from '../helpers'

const step: ChatToolPart = {
	kind: 'tool',
	id: 'step',
	label: 'Count late stops',
	status: 'done',
	summary: 'Seven days',
	detail:
		'Late stops rose from **4** to **14** across the week. Most of the rise sits on the north routes, and the south routes held.',
}

const prose = {
	kind: 'text',
	id: 'prose',
	text: 'Late stops rose from 4 to 14 across the week. Most of the rise sits on the north routes.',
} as const

/** The rendered width of an element, in pixels. */
function width(element: Element) {
	return element.getBoundingClientRect().width
}

/**
 * A step fits its head, as an accordion in a host that fits its content does.
 * It does not stretch to the width of the bubble, and it keeps one width while
 * its detail opens.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('the width of a chat step (real browser)', () => {
	it('fits its head and not the bubble', () => {
		const { container } = renderUI(
			<div style={{ width: 800 }}>
				<ChatMessage>{[step, prose]}</ChatMessage>
			</div>,
		)

		const tool = getSlot(container, 'chat-tool')

		expect(width(tool)).toBeLessThan(width(getSlot(container, 'chat-message-bubble')) / 2)
	})

	it('keeps one width while its detail opens', async () => {
		const { container } = renderUI(
			<div style={{ width: 800 }}>
				<ChatMessage>{[step, prose]}</ChatMessage>
			</div>,
		)

		const tool = getSlot(container, 'chat-tool')

		const closed = width(tool)

		await userEvent.click(present(tool.querySelector('button'), 'the head of the step'))

		await expect.poll(() => container.querySelector('[data-slot="chat-tool-detail"]')).toBeTruthy()

		expect(width(tool)).toBe(closed)
	})

	it('wraps at the width of a narrow bubble', () => {
		const { container } = renderUI(
			<div style={{ width: 160 }}>
				<ChatMessage>{[{ ...step, summary: 'Seven days, north and south routes' }]}</ChatMessage>
			</div>,
		)

		const tool = getSlot(container, 'chat-tool')

		expect(tool.scrollWidth).toBeLessThanOrEqual(tool.clientWidth)

		expect(width(tool)).toBeLessThanOrEqual(width(getSlot(container, 'chat-message-bubble')))
	})
})
