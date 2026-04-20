import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../components/chat-message'
import { bySlot, renderUI, screen } from '../helpers'

describe('ChatMessage', () => {
	it('renders with data-slot="chat-message"', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children inside the bubble slot', () => {
		const { container } = renderUI(<ChatMessage>Hello</ChatMessage>)

		expect(screen.getByText('Hello')).toBeInTheDocument()

		expect(bySlot(container, 'chat-message-bubble')).toBeInTheDocument()
	})

	it('applies custom className to the root', () => {
		const { container } = renderUI(<ChatMessage className="custom">content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el?.className).toContain('custom')
	})

	it('defaults type to assistant when unspecified', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-type', 'assistant')
	})

	it('reflects the type prop on data-type', () => {
		const { container } = renderUI(<ChatMessage type="user">content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-type', 'user')
	})

	it('renders the timestamp slot when provided', () => {
		const { container } = renderUI(<ChatMessage timestamp="11:12 AM">content</ChatMessage>)

		const timestamp = bySlot(container, 'chat-message-timestamp')

		expect(timestamp).toBeInTheDocument()

		expect(timestamp).toHaveTextContent('11:12 AM')
	})

	it('omits the timestamp slot when not provided', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		expect(bySlot(container, 'chat-message-timestamp')).not.toBeInTheDocument()
	})

	it('renders a cursor slot when streaming', () => {
		const { container } = renderUI(<ChatMessage streaming>content</ChatMessage>)

		expect(bySlot(container, 'chat-message-cursor')).toBeInTheDocument()
	})

	it('omits the cursor slot when not streaming', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		expect(bySlot(container, 'chat-message-cursor')).not.toBeInTheDocument()
	})

	it('renders the actions slot when provided', () => {
		const { container } = renderUI(
			<ChatMessage actions={<button type="button">Copy</button>}>content</ChatMessage>,
		)

		const actions = bySlot(container, 'chat-message-actions')

		expect(actions).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
	})
})
