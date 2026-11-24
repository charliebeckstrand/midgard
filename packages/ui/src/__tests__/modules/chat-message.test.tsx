import { describe, expect, it, vi } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { NO_HOVER_QUERY } from '../../utilities/media-query'
import {
	bySlot,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	stubClipboard,
	stubMatchMedia,
} from '../helpers'

// The streaming look the bubble projects onto its Markdown child, and the
// standing dim that replaces the pulse under `prefers-reduced-motion`.
// A touch screen: the context menu over the bubble opens only on a device
// with no hover. jsdom matches no query, so it is a device that hovers.
function stubTouch() {
	stubMatchMedia((query) => query === NO_HOVER_QUERY)
}

const PULSE = '[&>[data-slot=markdown]]:motion-safe:animate-pulse'
const PULSE_REDUCED = '[&>[data-slot=markdown]]:motion-reduce:opacity-60'

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

	it('ends a failed reply with a line that says so, after its content', () => {
		const { container } = renderUI(<ChatMessage failed>Late stops rose</ChatMessage>)

		const bubble = bySlot(container, 'chat-message-bubble')

		const failure = bySlot(container, 'chat-message-failure')

		expect(failure).toHaveTextContent('The reply failed.')

		expect(bubble?.lastElementChild).toBe(failure)

		// The gap of a part sits above it, because the reply landed content first.
		expect(failure?.className).toContain('mt-3')

		expect(screen.getByText('Late stops rose')).toBeInTheDocument()
	})

	it.each([
		['no part', []],
		['only an empty part', [{ id: 'a', kind: 'text' as const, text: '' }]],
	])('shows only the failure line for a failed reply with %s', (_name, parts) => {
		const { container } = renderUI(<ChatMessage failed>{parts}</ChatMessage>)

		expect(bySlot(container, 'chat-message-failure')?.className).not.toContain('mt-3')
	})

	it('draws no failure line for a settled reply', () => {
		const { container } = renderUI(<ChatMessage>Late stops rose</ChatMessage>)

		expect(bySlot(container, 'chat-message-failure')).toBeNull()
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

	it('shows loading dots in place of an empty streaming reply, and the content once it lands', () => {
		const { container, rerender } = renderUI(<ChatMessage streaming>{''}</ChatMessage>)

		// The transcript announces the wait, so the dots add no live region.
		expect(bySlot(container, 'loading-dots')).toHaveAttribute('aria-hidden', 'true')

		expect(screen.queryByRole('status')).not.toBeInTheDocument()

		expect(bySlot(container, 'markdown')).not.toBeInTheDocument()

		rerender(<ChatMessage streaming>Tuesday</ChatMessage>)

		expect(bySlot(container, 'loading-dots')).not.toBeInTheDocument()

		expect(bySlot(container, 'markdown')).toHaveTextContent('Tuesday')
	})

	it('shows no loading dots in an empty reply that is settled or failed', () => {
		const { container, rerender } = renderUI(<ChatMessage>{[]}</ChatMessage>)

		expect(bySlot(container, 'loading-dots')).not.toBeInTheDocument()

		rerender(
			<ChatMessage streaming failed>
				{''}
			</ChatMessage>,
		)

		expect(bySlot(container, 'loading-dots')).not.toBeInTheDocument()

		expect(bySlot(container, 'chat-message-failure')).toBeInTheDocument()
	})

	it('rings the bubble and marks the message while the composer edits it', () => {
		const { container, rerender } = renderUI(<ChatMessage sender="user">Question</ChatMessage>)

		expect(bySlot(container, 'chat-message-bubble')).not.toHaveClass('outline-offset-2')

		expect(bySlot(container, 'chat-message')).not.toHaveAttribute('data-editing')

		rerender(
			<ChatMessage sender="user" editing>
				Question
			</ChatMessage>,
		)

		const bubble = bySlot(container, 'chat-message-bubble')

		// A ring and not a dim, so the text of the bubble keeps its contrast.
		expect(bubble).toHaveClass('outline-2', 'outline-offset-2')

		expect(bySlot(container, 'chat-message')).toHaveAttribute('data-editing')
	})

	it.each([
		['user', 'end-2'],
		['assistant', 'start-2'],
	] as const)('floats the menu button over the outer top corner of a %s bubble', (sender, side) => {
		const { container } = renderUI(<ChatMessage sender={sender}>content</ChatMessage>)

		const toolbar = getSlot(container, 'chat-message-toolbar')

		expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Copy' }))

		expect(toolbar).toHaveClass('absolute', 'opacity-0', side)

		// The message is the containing block and the group that shows the toolbar.
		expect(bySlot(container, 'chat-message')).toHaveClass('relative', 'group/chat-message')

		// No rule turns the toolbar into a row below the bubble.
		expect(toolbar.className).not.toContain('static')

		// A hover on the bubble shows it, and a hover on the rest of the row does not.
		expect(toolbar).toHaveClass(
			'[@media(hover:hover)]:group-has-[[data-slot=chat-message-bubble]:hover]/chat-message:opacity-100',
		)

		expect(toolbar.className).not.toContain('group-hover/chat-message')
	})

	it('keeps room for the toolbar above the bubble', () => {
		const ROOM = 'pt-6'

		const menu = renderUI(<ChatMessage>content</ChatMessage>)

		expect(getSlot(menu.container, 'chat-message')).toHaveClass(ROOM)

		menu.unmount()

		// A message with no menu has no toolbar, so it keeps no room.
		const bare = renderUI(<ChatMessage contextMenu={false}>content</ChatMessage>)

		expect(getSlot(bare.container, 'chat-message')).not.toHaveClass(ROOM)
	})

	it('keeps the hidden toolbar button in the Tab order', () => {
		renderUI(<ChatMessage>content</ChatMessage>)

		const button = screen.getByRole('button', { name: 'Copy' })

		button.focus()

		expect(button).toHaveFocus()
	})

	it('opens a menu with Copy over the bubble on a touch screen', () => {
		const writeText = vi.fn(() => Promise.resolve())

		stubClipboard({ writeText })

		stubTouch()

		const { container } = renderUI(<ChatMessage>Some **bold** text</ChatMessage>)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		fireEvent.contextMenu(getSlot(container, 'chat-message-bubble'))

		expect(screen.getByRole('menu', { name: 'Message actions' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))

		// The Copy item writes the plain-text projection of the content.
		expect(writeText).toHaveBeenCalledWith('Some **bold** text')
	})

	it('adds the items of the caller after Copy', () => {
		const onAction = vi.fn()

		stubTouch()

		const { container } = renderUI(
			<ChatMessage contextMenu={{ items: [{ key: 'edit', label: 'Edit', onAction }] }}>
				content
			</ChatMessage>,
		)

		fireEvent.contextMenu(getSlot(container, 'chat-message-bubble'))

		const rows = screen.getAllByRole('menuitem').map((item) => item.textContent)

		expect(rows).toEqual(['Copy', 'Edit'])

		fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

		expect(onAction).toHaveBeenCalledOnce()
	})

	it('opens the same menu from the menu button in the toolbar', () => {
		const { container } = renderUI(
			<ChatMessage contextMenu={{ items: [{ key: 'edit', label: 'Edit' }] }}>content</ChatMessage>,
		)

		const button = screen.getByRole('button', { name: 'Message actions' })

		expect(getSlot(container, 'chat-message-toolbar')).toContainElement(button)

		fireEvent.click(button)

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
			'Copy',
			'Edit',
		])
	})

	it('shows the one action of a menu as its own button, with no ellipsis', () => {
		const writeText = vi.fn(() => Promise.resolve())

		stubClipboard({ writeText })

		renderUI(<ChatMessage>Some text</ChatMessage>)

		expect(screen.queryByRole('button', { name: 'Message actions' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

		expect(writeText).toHaveBeenCalledWith('Some text')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('keeps the ellipsis for a lone item with no icon', () => {
		renderUI(
			<ChatMessage contextMenu={{ defaultItems: false, items: [{ key: 'edit', label: 'Edit' }] }}>
				content
			</ChatMessage>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Message actions' }))

		expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
	})

	it('turns Copy off while the message has no text', () => {
		stubTouch()

		const { container } = renderUI(<ChatMessage streaming>{''}</ChatMessage>)

		fireEvent.contextMenu(getSlot(container, 'chat-message-bubble'))

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveAttribute('aria-disabled', 'true')
	})

	it('keeps the native menu of the bubble on a device that hovers', () => {
		const { container } = renderUI(
			<ChatMessage contextMenu={{ items: [{ key: 'edit', label: 'Edit' }] }}>content</ChatMessage>,
		)

		// fireEvent returns false when a handler cancels the event.
		expect(fireEvent.contextMenu(getSlot(container, 'chat-message-bubble'))).toBe(true)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		// The menu button in the toolbar is the way to the actions.
		expect(screen.getByRole('button', { name: 'Message actions' })).toBeInTheDocument()
	})

	it.each([
		['false', false],
		['a menu with no item', { defaultItems: false }],
	] as const)('keeps the native menu and shows no menu button for %s', (_, contextMenu) => {
		stubTouch()

		const { container } = renderUI(<ChatMessage contextMenu={contextMenu}>content</ChatMessage>)

		// fireEvent returns false when a handler cancels the event.
		expect(fireEvent.contextMenu(getSlot(container, 'chat-message-bubble'))).toBe(true)

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()

		expect(screen.queryByRole('button')).not.toBeInTheDocument()

		expect(bySlot(container, 'chat-message-toolbar')).not.toBeInTheDocument()
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

describe('ChatMessage branches', () => {
	const branch = { index: 1, ids: ['r1', 'r2', 'r3'] }

	it('shows no switcher for a message with one branch', () => {
		const { container } = renderUI(
			<ChatMessage branch={{ index: 0, ids: ['r1'] }}>Late stops rose</ChatMessage>,
		)

		expect(bySlot(container, 'chat-message-branch')).not.toBeInTheDocument()
	})

	it('shows the position between a previous and a next button, in a named group', () => {
		renderUI(<ChatMessage branch={branch}>Late stops rose</ChatMessage>)

		const group = screen.getByRole('group', { name: 'Versions' })

		expect(group).toHaveTextContent('2 of 3')

		expect(screen.getByRole('button', { name: 'Previous version' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Next version' })).toBeInTheDocument()
	})

	it('gives the id of the branch on each side', () => {
		const onBranchChange = vi.fn()

		renderUI(
			<ChatMessage branch={branch} onBranchChange={onBranchChange}>
				Late stops rose
			</ChatMessage>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Previous version' }))

		fireEvent.click(screen.getByRole('button', { name: 'Next version' }))

		expect(onBranchChange.mock.calls).toEqual([['r1'], ['r3']])
	})

	it('turns off the button at each end, and keeps it in the focus order', () => {
		const onBranchChange = vi.fn()

		renderUI(
			<ChatMessage branch={{ index: 0, ids: ['r1', 'r2'] }} onBranchChange={onBranchChange}>
				Late stops rose
			</ChatMessage>,
		)

		const previous = screen.getByRole('button', { name: 'Previous version' })

		// Not `disabled`: a press that reaches an end keeps the focus on its button.
		expect(previous).toHaveAttribute('aria-disabled', 'true')

		expect(previous).toBeEnabled()

		previous.focus()

		fireEvent.click(previous)

		expect(onBranchChange).not.toHaveBeenCalled()

		expect(previous).toHaveFocus()

		expect(screen.getByRole('button', { name: 'Next version' })).not.toHaveAttribute(
			'aria-disabled',
		)
	})

	it('turns off both buttons without onBranchChange', () => {
		renderUI(<ChatMessage branch={branch}>Late stops rose</ChatMessage>)

		expect(screen.getByRole('button', { name: 'Previous version' })).toHaveAttribute(
			'aria-disabled',
			'true',
		)

		expect(screen.getByRole('button', { name: 'Next version' })).toHaveAttribute(
			'aria-disabled',
			'true',
		)
	})
})
