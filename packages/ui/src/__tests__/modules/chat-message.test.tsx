import { describe, expect, it } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { bySlot, renderUI, screen } from '../helpers'

// The streaming look the bubble projects onto its Markdown child, and the
// standing dim that replaces the pulse under `prefers-reduced-motion`.
const PULSE = '[&>[data-slot=markdown]]:motion-safe:animate-pulse'
const PULSE_REDUCED = '[&>[data-slot=markdown]]:motion-reduce:opacity-50'

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

		expect(bySlot(container, 'chat-message-bubble')).not.toHaveClass(
			'cursor-progress',
			PULSE,
			PULSE_REDUCED,
		)
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

	it('carries the whole streaming look on the bubble: cursor, pulse, reduced-motion dim', () => {
		const { container } = renderUI(<ChatMessage streaming>content</ChatMessage>)

		expect(bySlot(container, 'chat-message-bubble')).toHaveClass(
			'cursor-progress',
			PULSE,
			PULSE_REDUCED,
		)

		expect(bySlot(container, 'markdown')).toHaveTextContent('content')
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

		expect(bySlot(container, 'chat-message-bubble')).toHaveClass(PULSE)

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
