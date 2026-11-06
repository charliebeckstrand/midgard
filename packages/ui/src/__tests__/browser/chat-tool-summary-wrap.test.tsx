import { describe, expect, it } from 'vitest'
import { ChatMessage, type ChatToolPart } from '../../modules/chat'
import { getSlot, renderUI } from '../helpers'

const step: ChatToolPart = {
	kind: 'tool',
	id: 'step',
	label: 'Filter shipments',
	status: 'done',
	summary: 'Status is Late AND Lane is North',
}

/** Renders one step in a message that is `width` pixels wide. */
function renderStep(width: number, part: ChatToolPart) {
	const { container } = renderUI(
		<div style={{ width }}>
			<ChatMessage>{[part]}</ChatMessage>
		</div>,
	)

	return {
		label: getSlot(container, 'chat-tool-label'),
		summary: getSlot(container, 'chat-tool-summary'),
	}
}

/**
 * The summary of a step shows in full. It says what the step did, such as the
 * filter that it applied, so a reader must be able to read all of it.
 *
 * The summary truncated to one line. A bubble on a phone is about 290px wide,
 * so the head kept only the first words of the summary. Now the head wraps: a
 * summary that does not fit beside the label goes to a line of its own.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('the summary of a chat step (real browser)', () => {
	for (const detail of [undefined, 'Matched **12** of 240 shipments.']) {
		const kind = detail === undefined ? 'a plain line' : 'a disclosure'

		it(`shows in full in a narrow message (${kind})`, () => {
			const { label, summary } = renderStep(240, { ...step, detail })

			expect(summary.scrollWidth).toBeLessThanOrEqual(summary.clientWidth)

			expect(summary.getBoundingClientRect().top).toBeGreaterThan(label.getBoundingClientRect().top)
		})

		it(`stays beside the label in a wide message (${kind})`, () => {
			const { label, summary } = renderStep(800, { ...step, detail })

			expect(summary.getBoundingClientRect().top).toBeCloseTo(label.getBoundingClientRect().top, 0)
		})
	}
})
