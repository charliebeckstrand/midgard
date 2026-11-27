import { describe, expect, vi } from 'vitest'
import { ChatMessage } from '../../modules/chat'
import { NO_HOVER_QUERY } from '../../utilities/media-query'
import {
	act,
	bySlot,
	fireEvent,
	getSlot,
	renderUI,
	screen,
	stubClipboard,
	stubMatchMedia,
	within,
} from '../helpers'
import { it } from '../helpers/fake-clock'

// A touch screen: the context menu over the bubble opens only on a device
// with no hover. jsdom matches no query, so it is a device that hovers.
function stubTouch() {
	stubMatchMedia((query) => query === NO_HOVER_QUERY)
}

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

		expect(bySlot(container, 'loading-dots')).not.toBeInTheDocument()
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

	it('shows an "(edited)" label below an edited bubble, and none by default', () => {
		const { container, rerender } = renderUI(<ChatMessage sender="user">Late stops</ChatMessage>)

		expect(bySlot(container, 'chat-message-edited')).toBeNull()

		expect(bySlot(container, 'chat-message-footer')).toBeNull()

		rerender(
			<ChatMessage sender="user" edited>
				Late stops
			</ChatMessage>,
		)

		const label = bySlot(container, 'chat-message-edited')

		expect(label).toHaveTextContent('(edited)')

		// The label is out of the bubble, in the row below it, so a screen reader
		// reads it after the message.
		expect(bySlot(container, 'chat-message-bubble')).not.toContainElement(label)

		expect(bySlot(container, 'chat-message-footer')?.firstElementChild).toBe(label)
	})

	it('puts the "(edited)" label before the branch switcher, in one row', () => {
		const { container } = renderUI(
			<ChatMessage sender="user" edited branch={{ index: 1, ids: ['u1', 'u2'] }}>
				Late stops
			</ChatMessage>,
		)

		const footer = bySlot(container, 'chat-message-footer')

		expect(footer?.children).toHaveLength(2)

		expect(footer?.firstElementChild).toBe(bySlot(container, 'chat-message-edited'))

		expect(footer?.lastElementChild).toBe(bySlot(container, 'chat-message-branch'))
	})

	it('renders the timestamp slot when provided', () => {
		const { container } = renderUI(<ChatMessage timestamp="11:12 AM">content</ChatMessage>)

		const timestamp = bySlot(container, 'chat-message-timestamp')

		expect(timestamp).toBeInTheDocument()

		expect(timestamp).toHaveTextContent('11:12 AM')
	})

	it('shows the progress cursor and the dots after the content while streaming, and renders the content as Markdown', () => {
		const { container } = renderUI(<ChatMessage streaming>Some **bold** text</ChatMessage>)

		const bubble = getSlot(container, 'chat-message-bubble')

		expect(bubble).toHaveClass('cursor-progress')

		// The content keeps its full contrast: no pulse and no dim.
		expect(bubble.className).not.toMatch(/animate-|opacity-/)

		expect(bubble.lastElementChild).toBe(bySlot(container, 'loading-dots'))

		expect(bySlot(container, 'markdown')).toHaveTextContent('Some bold text')

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it('shows only loading dots in an empty streaming reply, and the content before them once it lands', () => {
		const { container, rerender } = renderUI(<ChatMessage streaming>{''}</ChatMessage>)

		// The transcript announces the wait, so the dots add no live region.
		expect(bySlot(container, 'loading-dots')).toHaveAttribute('aria-hidden', 'true')

		expect(screen.queryByRole('status')).not.toBeInTheDocument()

		expect(bySlot(container, 'markdown')).not.toBeInTheDocument()

		rerender(<ChatMessage streaming>Tuesday</ChatMessage>)

		expect(bySlot(container, 'markdown')).toHaveTextContent('Tuesday')

		expect(bySlot(container, 'markdown')?.nextElementSibling).toBe(
			bySlot(container, 'loading-dots'),
		)

		rerender(<ChatMessage>Tuesday</ChatMessage>)

		expect(bySlot(container, 'loading-dots')).not.toBeInTheDocument()
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
		// A system line has no side, so the toolbar takes its start corner, and
		// not the center over its text.
		['system', 'start-0'],
	] as const)('floats the menu button over the outer top corner of a %s bubble', (sender, side) => {
		const { container } = renderUI(<ChatMessage sender={sender}>content</ChatMessage>)

		const toolbar = getSlot(container, 'chat-message-toolbar')

		expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Copy' }))

		expect(toolbar).toHaveClass('absolute', 'opacity-0', side)

		// The frame of the bubble is the containing block, so the toolbar follows
		// the bubble. The message is the group that shows the toolbar.
		expect(bySlot(container, 'chat-message-frame')).toHaveClass('relative')

		expect(bySlot(container, 'chat-message-frame')).toContainElement(toolbar)

		expect(bySlot(container, 'chat-message')).toHaveClass('group/chat-message')

		expect(toolbar.className).not.toContain('mx-auto')

		// No rule turns the toolbar into a row below the bubble.
		expect(toolbar.className).not.toContain('static')

		// A hover on the bubble shows it, and a hover on the rest of the row does not.
		expect(toolbar).toHaveClass(
			'group-has-[[data-slot=chat-message-bubble]:hover]/chat-message:opacity-100',
		)

		expect(toolbar.className).not.toContain('group-hover/chat-message')
	})

	it('has no toolbar on a device with no hover', () => {
		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		// A long press opens the menu there. The toolbar is out of the layout, so
		// no hover, focus, or open state that it holds can show it.
		expect(getSlot(container, 'chat-message-toolbar')).toHaveClass('[@media(hover:none)]:hidden')

		// On a device that hovers, the toolbar holds the keyboard path, and Tab
		// does not stop on the bubble.
		expect(getSlot(container, 'chat-message-bubble')).toHaveAttribute('tabindex', '-1')
	})

	it('makes the bubble the tab stop of the menu on a device with no hover', () => {
		stubTouch()

		const { container } = renderUI(<ChatMessage>content</ChatMessage>)

		const bubble = getSlot(container, 'chat-message-bubble')

		// The toolbar is hidden there, so a keyboard opens the menu from the bubble.
		expect(bubble).toHaveAttribute('tabindex', '0')

		bubble.focus()

		fireEvent.keyDown(bubble, { key: 'F10', shiftKey: true })

		fireEvent.contextMenu(bubble)

		expect(screen.getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument()
	})

	it('keeps room for the toolbar above the bubble on a device that hovers', () => {
		// A device with no hover never shows the toolbar on a touch, so the room
		// is under the hover condition of the toolbar.
		const ROOM = '[@media(hover:hover)]:pt-6'

		const menu = renderUI(<ChatMessage>content</ChatMessage>)

		expect(getSlot(menu.container, 'chat-message')).toHaveClass(ROOM)

		menu.unmount()

		// A message with no menu has no toolbar, so it keeps no room.
		const bare = renderUI(<ChatMessage contextMenu={false}>content</ChatMessage>)

		expect(getSlot(bare.container, 'chat-message')).not.toHaveClass(ROOM)
	})

	it('keeps the hidden toolbar button in the Tab order, and names it in a tooltip', async ({
		clock,
	}) => {
		renderUI(<ChatMessage>content</ChatMessage>)

		await clock.user.tab()

		expect(screen.getByRole('button', { name: 'Copy' })).toHaveFocus()

		// A keyboard focus opens the tooltip of the icon button.
		await clock.advance(0)

		expect(screen.getByRole('tooltip')).toHaveTextContent('Copy')
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

	it('opens the rest of the menu from the ellipsis in the toolbar', () => {
		const { container } = renderUI(
			<ChatMessage contextMenu={{ items: [{ key: 'edit', label: 'Edit' }] }}>content</ChatMessage>,
		)

		// Copy has an icon, so it is a button of the toolbar. Edit has none, so it
		// stays in the menu.
		const toolbar = screen.getByRole('toolbar', { name: 'Message actions' })

		expect(getSlot(container, 'chat-message-toolbar')).toContainElement(toolbar)

		expect(
			within(toolbar)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label')),
		).toEqual(['Copy', 'More actions'])

		fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Edit'])
	})

	it('shows up to three items with an icon as buttons, with no ellipsis', () => {
		const onEdit = vi.fn()

		renderUI(
			<ChatMessage
				contextMenu={{
					items: [
						{ key: 'edit', label: 'Edit', icon: <svg />, onAction: onEdit },
						{ key: 'retry', label: 'Retry', icon: <svg /> },
					],
				}}
			>
				content
			</ChatMessage>,
		)

		const toolbar = screen.getByRole('toolbar', { name: 'Message actions' })

		expect(
			within(toolbar)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label') ?? button.textContent),
		).toEqual(['Copy', 'Edit', 'Retry'])

		expect(screen.queryByRole('button', { name: /actions/ })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

		expect(onEdit).toHaveBeenCalledOnce()
	})

	it('shows the first three items as buttons and the rest in the ellipsis menu', () => {
		const icon = <svg />

		renderUI(
			<ChatMessage
				contextMenu={{
					items: [
						{ key: 'edit', label: 'Edit', icon },
						{ key: 'retry', label: 'Retry', icon },
						{ key: 'share', label: 'Share', icon },
						{ separator: true },
						{ key: 'delete', label: 'Delete', icon },
					],
				}}
			>
				content
			</ChatMessage>,
		)

		const toolbar = screen.getByRole('toolbar', { name: 'Message actions' })

		expect(
			within(toolbar)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label') ?? button.textContent),
		).toEqual(['Copy', 'Edit', 'Retry', 'More actions'])

		fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

		// The separator between Copy and the items of the caller goes with the
		// buttons. The menu keeps the separator of the caller.
		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
			'Share',
			'Delete',
		])

		expect(screen.getAllByRole('separator')).toHaveLength(1)
	})

	it('stops the buttons at the first item with no icon, so the order holds', () => {
		renderUI(
			<ChatMessage
				contextMenu={{
					items: [
						{ key: 'edit', label: 'Edit' },
						{ key: 'retry', label: 'Retry', icon: <svg /> },
					],
				}}
			>
				content
			</ChatMessage>,
		)

		expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
			'Edit',
			'Retry',
		])
	})

	it('is one Tab stop, and the arrow keys move between its buttons', async ({ clock }) => {
		renderUI(
			<ChatMessage contextMenu={{ items: [{ key: 'retry', label: 'Retry', icon: <svg /> }] }}>
				content
			</ChatMessage>,
		)

		const copy = screen.getByRole('button', { name: 'Copy' })

		const retry = screen.getByRole('button', { name: 'Retry' })

		expect([copy.tabIndex, retry.tabIndex]).toEqual([0, -1])

		await clock.user.tab()

		expect(copy).toHaveFocus()

		await clock.user.keyboard('{ArrowRight}')

		expect(retry).toHaveFocus()

		expect([copy.tabIndex, retry.tabIndex]).toEqual([-1, 0])
	})

	it('shows Copy alone as a copy button, which shows a check after the copy', async ({ clock }) => {
		const writeText = vi.fn(() => Promise.resolve())

		stubClipboard({ writeText })

		const { container } = renderUI(<ChatMessage>Some text</ChatMessage>)

		expect(screen.queryByRole('button', { name: /actions/ })).not.toBeInTheDocument()

		const button = screen.getByRole('button', { name: 'Copy' })

		// A press of Enter on a keyboard focus. The focus opens the tooltip of the
		// button, as a hover does in a browser.
		await clock.user.tab()

		expect(button).toHaveFocus()

		await clock.user.keyboard('{Enter}')

		// The clipboard write resolves.
		await clock.advance(0)

		expect(writeText).toHaveBeenCalledWith('Some text')

		// The copied state names the button "Copied", draws the check, and holds
		// the toolbar open. The button keeps the focus while it shows the result.
		expect(button).toHaveAccessibleName('Copied')

		expect(button).toHaveAttribute('data-copied')

		expect(getSlot(container, 'chat-message-toolbar')).toHaveClass('has-data-copied:opacity-100')

		expect(button).toHaveFocus()

		// The tooltip names the action, so it stays "Copy". The check confirms the copy.
		expect(screen.getByRole('tooltip')).toHaveTextContent('Copy')

		expect(screen.getByRole('tooltip')).not.toHaveTextContent('Copied')

		// When the check goes, the focus goes to the bubble.
		await clock.advance(1999)

		expect(button).toHaveFocus()

		await clock.advance(1)

		expect(button).not.toHaveAttribute('data-copied')

		expect(getSlot(container, 'chat-message-bubble')).toHaveFocus()

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})

	it('keeps the focus where the reader moved it during the check', async ({ clock }) => {
		stubClipboard({ writeText: vi.fn(() => Promise.resolve()) })

		renderUI(
			<>
				<ChatMessage>Some text</ChatMessage>
				<input aria-label="Elsewhere" />
			</>,
		)

		await clock.user.click(screen.getByRole('button', { name: 'Copy' }))

		const elsewhere = screen.getByRole('textbox', { name: 'Elsewhere' })

		// The blur closes the tooltip of the Copy button.
		act(() => elsewhere.focus())

		await clock.advance(2000)

		expect(elsewhere).toHaveFocus()
	})

	it('moves the focus to the bubble at once when the copy fails', async ({ clock }) => {
		stubClipboard({ writeText: vi.fn(() => Promise.reject(new Error('denied'))) })

		const { container } = renderUI(<ChatMessage>Some text</ChatMessage>)

		const button = screen.getByRole('button', { name: 'Copy' })

		await clock.user.click(button)

		expect(button).not.toHaveAttribute('data-copied')

		expect(getSlot(container, 'chat-message-bubble')).toHaveFocus()
	})

	it('shows a lone item of the caller with an icon as its own button', () => {
		const onAction = vi.fn()

		renderUI(
			<ChatMessage
				contextMenu={{
					defaultItems: false,
					items: [{ key: 'retry', label: 'Retry', icon: <svg />, onAction }],
				}}
			>
				content
			</ChatMessage>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

		expect(onAction).toHaveBeenCalledOnce()

		expect(screen.queryByRole('button', { name: /actions/ })).not.toBeInTheDocument()
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

		// The toolbar is the way to the actions.
		expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
	})

	it('opens the menu on a right-click on a device that hovers, with trigger contextmenu', () => {
		const { container } = renderUI(
			<ChatMessage trigger="contextmenu" contextMenu={{ items: [{ key: 'edit', label: 'Edit' }] }}>
				content
			</ChatMessage>,
		)

		// The menu opens over the bubble, and the message has no toolbar and no room for it.
		expect(bySlot(container, 'chat-message-toolbar')).not.toBeInTheDocument()

		expect(getSlot(container, 'chat-message')).not.toHaveClass('pt-6')

		const bubble = getSlot(container, 'chat-message-bubble')

		// The bubble is the tab stop that a keyboard opens the menu from.
		expect(bubble).toHaveAttribute('tabindex', '0')

		fireEvent.contextMenu(bubble)

		expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
			'Copy',
			'Edit',
		])
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

		// With no menu, Tab does not stop on the bubble.
		expect(getSlot(container, 'chat-message-bubble')).toHaveAttribute('tabindex', '-1')
	})

	it('renders settled content as Markdown', () => {
		const { container } = renderUI(<ChatMessage>Some **bold** text</ChatMessage>)

		expect(bySlot(container, 'markdown')).toBeInTheDocument()

		expect(container.querySelector('strong')?.textContent).toBe('bold')
	})

	it.each(['user', 'assistant', 'system'] as const)(
		'injects no color override onto Markdown for the %s bubble, so the prose inherits the bubble foreground',
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
