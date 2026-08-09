import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import type { ChatToolPart } from '../../modules/chat/engine/chat-content/types'
import { bySlot, present, renderUI, screen, userEvent } from '../helpers'

function tool(overrides: Partial<ChatToolPart> = {}): ChatToolPart {
	return {
		kind: 'tool',
		id: 't1',
		name: 'Filter shipments',
		status: 'done',
		summary: 'status is late and lane is north',
		...overrides,
	}
}

/** A bubble holding one step. */
function renderTool(part: ChatToolPart) {
	return renderUI(<ChatMessage>{[part]}</ChatMessage>)
}

describe('ChatTool', () => {
	it('names what ran and the line saying what it did', () => {
		const { container } = renderTool(tool())

		expect(bySlot(container, 'chat-tool-name')).toHaveTextContent('Filter shipments')

		expect(bySlot(container, 'chat-tool-summary')).toHaveTextContent(
			'status is late and lane is north',
		)
	})

	it('draws no summary line for a step that carries none', () => {
		const { container } = renderTool(tool({ summary: undefined }))

		expect(bySlot(container, 'chat-tool-summary')).not.toBeInTheDocument()
	})

	it('stamps the status, so a caller can style or find one', () => {
		const { container } = renderTool(tool({ status: 'failed' }))

		expect(bySlot(container, 'chat-tool')).toHaveAttribute('data-status', 'failed')
	})

	it.each([
		['running', 'Running'],
		['done', 'Done'],
		['failed', 'Failed'],
	] as const)('names the %s state for a reader, because colour alone does not', (status, label) => {
		// The dot encodes the state in hue; a reader who cannot see hue gets the
		// word through its accessible name (WCAG 1.4.1).
		renderTool(tool({ status }))

		expect(screen.getByRole('img', { name: label })).toBeInTheDocument()
	})

	describe('a step with a detail', () => {
		const withDetail = tool({ detail: 'Matched **12** of 240 rows.' })

		it('opens onto its detail', async () => {
			const user = userEvent.setup()

			const { container } = renderTool(withDetail)

			await user.click(screen.getByRole('button', { name: /Filter shipments/ }))

			expect(bySlot(container, 'chat-tool-detail')).toHaveTextContent('Matched 12 of 240 rows.')
		})

		it('starts closed, because the reader wants the answer before the working', () => {
			const { container } = renderTool(withDetail)

			expect(bySlot(container, 'chat-tool-detail')).not.toBeInTheDocument()

			expect(present(screen.getByRole('button'), 'trigger')).toHaveAttribute(
				'aria-expanded',
				'false',
			)
		})

		it('lexes the detail only once the step is opened', async () => {
			// `mount="lazy"`: a step nobody opens costs no Markdown lex, which is what
			// keeps a reply of ten steps from paying for ten bodies nobody read.
			const user = userEvent.setup()

			const { container } = renderTool(withDetail)

			expect(bySlot(container, 'markdown')).not.toBeInTheDocument()

			await user.click(screen.getByRole('button'))

			expect(bySlot(container, 'markdown')).toBeInTheDocument()
		})
	})

	it('draws a step with no detail as a line rather than a disclosure', () => {
		// A control that opens onto nothing lies about having something to show.
		renderTool(tool())

		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})

	it('draws a step beside the prose of the same reply', () => {
		const { container } = renderTool(tool())

		renderUI(
			<ChatMessage>
				{[{ kind: 'text', id: 'x', text: 'Twelve stops are late.' }, tool({ id: 't2' })]}
			</ChatMessage>,
		)

		expect(bySlot(container, 'chat-tool')).toBeInTheDocument()

		expect(screen.getByText('Twelve stops are late.')).toBeInTheDocument()
	})
})
