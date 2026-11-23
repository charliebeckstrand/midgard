import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatMessage, type ChatToolPart } from '../../modules/chat'
import { getSlot, renderUI } from '../helpers'

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

/** The width of the content box of an element, in pixels: its width less its padding. */
function contentWidth(element: Element) {
	const style = getComputedStyle(element)

	return (
		element.clientWidth -
		Number.parseFloat(style.paddingLeft) -
		Number.parseFloat(style.paddingRight)
	)
}

/**
 * A closed step fits its head, and not the width of the bubble. An open step
 * fills the bubble, so its detail has room for a code block or a table. The
 * bubble keeps its width while the step opens.
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

	it('fills the bubble while open, and the bubble keeps its width', async () => {
		const { container } = renderUI(
			<div style={{ width: 800 }}>
				<ChatMessage>{[step, prose]}</ChatMessage>
			</div>,
		)

		const tool = getSlot(container, 'chat-tool')

		const bubble = getSlot(container, 'chat-message-bubble')

		const closed = width(tool)

		const before = width(bubble)

		await userEvent.click(getSlot(container, 'collapse-trigger'))

		await expect.poll(() => width(tool)).toBeCloseTo(contentWidth(bubble), 0)

		expect(width(tool)).toBeGreaterThan(closed)

		expect(width(bubble)).toBe(before)
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
