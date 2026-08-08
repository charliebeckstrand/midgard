import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { bySlot, renderUI, screen } from '../helpers'

// The rendered pulse class, motion-safe gated per the package's animation
// policy (WCAG 2.3.3). Spelled out rather than imported from the kata, so the
// assertion states the class the reader gets.
const PULSE = 'motion-safe:animate-pulse'

describe('ChatMessage', () => {
	it('renders children inside the bubble slot', () => {
		const { container } = renderUI(<ChatMessage>Hello</ChatMessage>)

		expect(screen.getByText('Hello')).toBeInTheDocument()

		expect(bySlot(container, 'chat-message-bubble')).toBeInTheDocument()
	})

	it('defaults to a settled assistant message: no timestamp, no pulse, no progress cursor', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-role', 'assistant')

		expect(bySlot(container, 'chat-message-timestamp')).not.toBeInTheDocument()

		expect(bySlot(container, 'markdown')).not.toHaveClass(PULSE)

		expect(bySlot(container, 'chat-message-bubble')).not.toHaveClass('cursor-progress')
	})

	it('reflects the role prop on data-role', () => {
		const { container } = renderUI(<ChatMessage role="user">content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-role', 'user')
	})

	it('renders the timestamp slot when provided', () => {
		const { container } = renderUI(<ChatMessage timestamp="11:12 AM">content</ChatMessage>)

		const timestamp = bySlot(container, 'chat-message-timestamp')

		expect(timestamp).toBeInTheDocument()

		expect(timestamp).toHaveTextContent('11:12 AM')
	})

	it('pulses the content and shows the progress cursor while streaming', () => {
		const { container } = renderUI(<ChatMessage streaming>content</ChatMessage>)

		const markdown = bySlot(container, 'markdown')

		// The pulse is motion-safe gated, so a reduced-motion reader keeps the
		// cursor as the signal. The cursor rides the bubble, not the whole
		// message, so an actions-rail control keeps its own.
		expect(markdown).toHaveClass(PULSE)

		expect(markdown).toHaveTextContent('content')

		expect(bySlot(container, 'chat-message-bubble')).toHaveClass('cursor-progress')
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

	it('renders streaming content as Markdown, pulsing while it arrives', () => {
		const { container } = renderUI(<ChatMessage streaming>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).toHaveClass(PULSE)

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it.each([
		'user',
		'assistant',
		'system',
	] as const)('injects no color override onto Markdown for the %s bubble — the prose inherits the bubble foreground', (role) => {
		const { container } = renderUI(<ChatMessage role={role}>content</ChatMessage>)

		// Markdown is color-agnostic and the bubble sets its own foreground, so
		// ChatMessage must not pour any `text-*` color (nor a per-element
		// override) onto the markdown wrapper — the bubble's color cascades in.
		const markdown = bySlot(container, 'markdown')

		expect(markdown?.className ?? '').not.toMatch(/text-(?:inherit|zinc|white|black)/)
		expect(markdown?.className ?? '').not.toMatch(/\[&_/)
	})
})
