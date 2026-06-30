import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { bySlot, renderUI, screen } from '../helpers'

describe('ChatMessage', () => {
	it('renders children inside the bubble slot', () => {
		const { container } = renderUI(<ChatMessage>Hello</ChatMessage>)

		expect(screen.getByText('Hello')).toBeInTheDocument()

		expect(bySlot(container, 'chat-message-bubble')).toBeInTheDocument()
	})

	it('defaults to an assistant message with no timestamp or shiny-text slots', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-type', 'assistant')

		expect(bySlot(container, 'chat-message-timestamp')).not.toBeInTheDocument()

		expect(bySlot(container, 'shiny-text')).not.toBeInTheDocument()
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

	it('wraps content in ShinyText when streaming', () => {
		const { container } = renderUI(<ChatMessage streaming>content</ChatMessage>)

		const shiny = bySlot(container, 'shiny-text')

		expect(shiny).toBeInTheDocument()

		expect(shiny).toHaveTextContent('content')
	})

	it('renders the actions slot when provided', () => {
		const { container } = renderUI(
			<ChatMessage actions={<button type="button">Copy</button>}>content</ChatMessage>,
		)

		const actions = bySlot(container, 'chat-message-actions')

		expect(actions).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
	})

	it('renders settled content as Markdown', () => {
		const { container } = renderUI(<ChatMessage>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).toBeInTheDocument()

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it('keeps streaming content as raw text, not parsed Markdown', () => {
		const { container } = renderUI(<ChatMessage streaming>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).not.toBeInTheDocument()

		expect(container.querySelector('strong')).not.toBeInTheDocument()

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Some **bold** text')
	})

	it.each([
		'user',
		'assistant',
		'system',
	] as const)("overrides Markdown's prose colors to inherit the %s bubble's own foreground", (type) => {
		const { container } = renderUI(<ChatMessage type={type}>content</ChatMessage>)

		expect(bySlot(container, 'markdown')).toHaveClass('text-inherit')
	})
})
