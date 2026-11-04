import { describe, expect, it, vi } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { LocaleProvider } from '../../providers/locale'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

		expect(el).toHaveAttribute('data-sender', 'assistant')

		expect(bySlot(container, 'chat-message-timestamp')).not.toBeInTheDocument()

		const bubble = bySlot(container, 'chat-message-bubble')

		expect(bubble).not.toHaveClass('cursor-progress')

		expect(bubble).not.toHaveClass(PULSE)

		expect(bubble).not.toHaveClass(PULSE_REDUCED)
	})

	it('reflects the sender prop on data-sender', () => {
		const { container } = renderUI(<ChatMessage sender="user">content</ChatMessage>)

		const el = bySlot(container, 'chat-message')

		expect(el).toHaveAttribute('data-sender', 'user')
	})

	it('renders the timestamp slot when provided', () => {
		const { container } = renderUI(<ChatMessage timestamp="11:12 AM">content</ChatMessage>)

		const timestamp = bySlot(container, 'chat-message-timestamp')

		expect(timestamp).toBeInTheDocument()

		expect(timestamp).toHaveTextContent('11:12 AM')
	})

	it('carries the whole streaming look on the bubble, and renders the content as Markdown', () => {
		const { container } = renderUI(<ChatMessage streaming>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'chat-message-bubble')).toHaveClass(
			'cursor-progress',
			PULSE,
			PULSE_REDUCED,
		)

		expect(bySlot(container, 'markdown')).toHaveTextContent('Some bold text')

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it('renders the actions slot when provided', () => {
		const { container } = renderUI(
			<ChatMessage actions={<button type="button">Copy</button>}>content</ChatMessage>,
		)

		const actions = bySlot(container, 'chat-message-actions')

		expect(actions).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
	})

	it('shows the actions as a rail below the bubble by default', () => {
		const { container } = renderUI(
			<ChatMessage actions={<button type="button">Copy</button>}>content</ChatMessage>,
		)

		const actions = bySlot(container, 'chat-message-actions')

		expect(actions).toHaveClass('mt-1')

		expect(actions?.className).not.toContain('absolute')
	})

	it.each([
		['user', 'end-2'],
		['assistant', 'start-2'],
	] as const)('floats hover actions over the outer top corner of a %s bubble', (sender, side) => {
		const { container } = renderUI(
			<ChatMessage sender={sender} hoverActions actions={<button type="button">Copy</button>}>
				content
			</ChatMessage>,
		)

		const actions = bySlot(container, 'chat-message-actions')

		expect(actions).toHaveClass('absolute', 'opacity-0', side)

		// The message is the containing block and the group that shows the toolbar.
		expect(bySlot(container, 'chat-message')).toHaveClass('relative', 'group/chat-message')

		// A device with no hover shows the toolbar as a plain row below the bubble.
		expect(actions).toHaveClass(
			'[@media(hover:none)]:static',
			'[@media(hover:none)]:opacity-100',
			'[@media(hover:none)]:bg-transparent',
			'[@media(hover:none)]:ring-0',
		)
	})

	it('keeps hidden hover actions in the Tab order', () => {
		renderUI(
			<ChatMessage hoverActions actions={<button type="button">Copy</button>}>
				content
			</ChatMessage>,
		)

		const copy = screen.getByRole('button', { name: 'Copy' })

		copy.focus()

		expect(copy).toHaveFocus()
	})

	it('opens the context menu on a right-click on the bubble', () => {
		const onAction = vi.fn()

		const { container } = renderUI(
			<ChatMessage contextMenu={[{ key: 'copy', label: 'Copy', onAction }]}>content</ChatMessage>,
		)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		const bubble = bySlot(container, 'chat-message-bubble')

		if (!bubble) throw new Error('no bubble')

		fireEvent.contextMenu(bubble)

		expect(screen.getByRole('menu', { name: 'Message actions' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))

		expect(onAction).toHaveBeenCalledOnce()
	})

	it('keeps the native menu of a bubble with no context menu', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const bubble = bySlot(container, 'chat-message-bubble')

		if (!bubble) throw new Error('no bubble')

		// fireEvent returns false when a handler cancels the event.
		expect(fireEvent.contextMenu(bubble)).toBe(true)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('renders settled content as Markdown', () => {
		const { container } = renderUI(<ChatMessage>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).toBeInTheDocument()

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it.each(['user', 'assistant', 'system'] as const)(
		'injects no color override onto Markdown for the %s bubble — the prose inherits the bubble foreground',
		(sender) => {
			const { container } = renderUI(<ChatMessage sender={sender}>content</ChatMessage>)

			// Markdown is color-agnostic and the bubble sets its own foreground, so
			// ChatMessage must not pour any `text-*` color (nor a per-element
			// override) onto the markdown wrapper: the bubble's color cascades in.
			const markdown = bySlot(container, 'markdown')

			expect(markdown?.className ?? '').not.toMatch(/text-(?:inherit|zinc|white|black)/)
			expect(markdown?.className ?? '').not.toMatch(/\[&_/)
		},
	)

	// The app does not write a message, so its headings sit one level under the
	// page outline: a message must not add an `<h1>` to the page.
	it('renders a `#` heading in a string message as an h2', () => {
		renderUI(<ChatMessage>{'# Summary'}</ChatMessage>)

		expect(screen.getByRole('heading', { name: 'Summary' }).tagName).toBe('H2')

		expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
	})

	it('renders a `#` heading in a text part as an h2', () => {
		renderUI(<ChatMessage>{[{ kind: 'text', id: 'p1', text: '# Summary' }]}</ChatMessage>)

		expect(screen.getByRole('heading', { name: 'Summary' }).tagName).toBe('H2')
	})
})

describe('ChatMessage in a locale', () => {
	it('names the author in the language of the locale', () => {
		const { container } = renderUI(
			<LocaleProvider locale="es-ES">
				<ChatMessage sender="user">Hola</ChatMessage>
				<ChatMessage sender="assistant">¿Qué tal?</ChatMessage>
			</LocaleProvider>,
		)

		const authors = container.querySelectorAll('[data-slot="chat-message-author"]')

		expect([...authors].map((author) => author.textContent)).toEqual([
			'Dijiste: ',
			'El asistente dijo: ',
		])
	})
})
