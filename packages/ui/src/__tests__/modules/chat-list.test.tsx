import { describe, expect, it, vi } from 'vitest'
import { ChatList, ChatListItem } from '../../modules/chat'
import { allBySlot, bySlot, fireEvent, present, renderUI, screen } from '../helpers'

function renderList() {
	return renderUI(
		<ChatList aria-label="Conversations">
			<ChatListItem
				title="One"
				current
				onSelect={vi.fn()}
				actions={
					<button type="button" aria-label="Delete One">
						x
					</button>
				}
			/>
			<ChatListItem
				title="Two"
				onSelect={vi.fn()}
				actions={
					<button type="button" aria-label="Delete Two">
						x
					</button>
				}
			/>
			<ChatListItem title="Three" onSelect={vi.fn()} />
		</ChatList>,
	)
}

describe('ChatList', () => {
	it('renders a labelled list with its items as list items', () => {
		const { container } = renderList()

		const list = bySlot(container, 'chat-list')

		expect(list?.tagName).toBe('UL')

		expect(list).toHaveAttribute('aria-label', 'Conversations')

		for (const item of allBySlot(container, 'chat-list-item')) {
			expect(item.tagName).toBe('LI')
		}
	})

	it('is a single Tab stop seated on the current conversation', () => {
		const { container } = renderList()

		const items = allBySlot(container, 'chat-list-item-select')

		expect(items.map((el) => (el as HTMLButtonElement).tabIndex)).toEqual([0, -1, -1])
	})

	it('keeps row actions out of the Tab order', () => {
		renderList()

		expect(screen.getByRole('button', { name: 'Delete One' }).tabIndex).toBe(-1)
	})

	it('roves between items with Up/Down arrows', () => {
		const { container } = renderList()

		const list = present(bySlot(container, 'chat-list'), 'chat list')

		const items = allBySlot(container, 'chat-list-item-select')

		present(items[0], 'first item').focus()

		fireEvent.keyDown(list, { key: 'ArrowDown' })

		expect(items[1]).toHaveFocus()

		fireEvent.keyDown(list, { key: 'ArrowUp' })

		expect(items[0]).toHaveFocus()
	})

	it('roves into a row action with Right and back to the item with Left', () => {
		const { container } = renderList()

		const list = present(bySlot(container, 'chat-list'), 'chat list')

		const items = allBySlot(container, 'chat-list-item-select')

		present(items[0], 'first item').focus()

		fireEvent.keyDown(list, { key: 'ArrowRight' })

		expect(screen.getByRole('button', { name: 'Delete One' })).toHaveFocus()

		fireEvent.keyDown(list, { key: 'ArrowLeft' })

		expect(items[0]).toHaveFocus()
	})

	it('carries the resting stop back to the item when an action takes focus', () => {
		const { container } = renderList()

		const action = screen.getByRole('button', { name: 'Delete One' })

		action.focus()

		// Tab re-enters on the item, never the action.
		expect(allBySlot(container, 'chat-list-item-select')[0]).toHaveProperty('tabIndex', 0)
	})

	it('chains a consumer onKeyDown without losing roving', () => {
		const onKeyDown = vi.fn()

		const { container } = renderUI(
			<ChatList aria-label="Conversations" onKeyDown={onKeyDown}>
				<ChatListItem title="One" current onSelect={vi.fn()} />
				<ChatListItem title="Two" onSelect={vi.fn()} />
			</ChatList>,
		)

		const list = present(bySlot(container, 'chat-list'), 'chat list')

		const items = allBySlot(container, 'chat-list-item-select')

		present(items[0], 'first item').focus()

		fireEvent.keyDown(list, { key: 'ArrowDown' })

		expect(items[1]).toHaveFocus()

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	it('renders a standalone ChatListItem as a div, not a list item', () => {
		const { container } = renderUI(<ChatListItem title="Solo" onSelect={vi.fn()} />)

		expect(bySlot(container, 'chat-list-item')?.tagName).toBe('DIV')
	})
})
