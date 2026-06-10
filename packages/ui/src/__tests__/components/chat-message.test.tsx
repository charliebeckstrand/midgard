import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../components/chat-message'
import { bySlot, renderUI, screen } from '../helpers'

describe('ChatMessage', () => {
	it('renders children inside the bubble slot', () => {
		const { container } = renderUI(<ChatMessage>Hello</ChatMessage>)

		expect(screen.getByText('Hello')).toBeInTheDocument()

		expect(bySlot(container, 'chat-message-bubble')).toBeInTheDocument()
	})

	it('defaults to an assistant message with no timestamp or cursor slots', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-type', 'assistant')

		expect(bySlot(container, 'chat-message-timestamp')).not.toBeInTheDocument()

		expect(bySlot(container, 'chat-message-cursor')).not.toBeInTheDocument()
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

	it('renders a cursor slot when streaming', () => {
		const { container } = renderUI(<ChatMessage streaming>content</ChatMessage>)

		expect(bySlot(container, 'chat-message-cursor')).toBeInTheDocument()
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
