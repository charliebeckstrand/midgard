import { describe, expect, it, vi } from 'vitest'
import { ChatListItem } from '../../modules/chat'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('ChatListItem', () => {
	it('renders the title and preview', () => {
		renderUI(<ChatListItem title="Project kickoff" preview="Let me help you plan" />)

		expect(screen.getByText('Project kickoff')).toBeInTheDocument()

		expect(screen.getByText('Let me help you plan')).toBeInTheDocument()
	})

	it('renders a select button that calls onSelect', async () => {
		const onSelect = vi.fn()

		renderUI(<ChatListItem title="Bug investigation" onSelect={onSelect} />)

		await userEvent.click(screen.getByRole('button', { name: 'Bug investigation' }))

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('renders a static, non-interactive title when onSelect is omitted', () => {
		const { container } = renderUI(<ChatListItem title="Read only" />)

		expect(screen.queryByRole('button')).not.toBeInTheDocument()

		expect(bySlot(container, 'chat-list-item-select')?.tagName).toBe('SPAN')
	})

	it('marks the current conversation with aria-current and data-current', () => {
		const { container } = renderUI(<ChatListItem title="Active" current onSelect={vi.fn()} />)

		expect(bySlot(container, 'chat-list-item')).toHaveAttribute('data-current')

		expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-current', 'true')
	})

	it('renders timestamp and actions as siblings of the select button', () => {
		const { container } = renderUI(
			<ChatListItem
				title="With affixes"
				timestamp="2h"
				onSelect={vi.fn()}
				actions={<button type="button">Delete</button>}
			/>,
		)

		expect(bySlot(container, 'chat-list-item-timestamp')).toHaveTextContent('2h')

		const actions = bySlot(container, 'chat-list-item-actions')

		expect(actions).toBeInTheDocument()

		// The delete control is a sibling of the select button, never nested inside it.
		const select = bySlot(container, 'chat-list-item-select')

		expect(select?.contains(screen.getByRole('button', { name: 'Delete' }))).toBe(false)
	})
})
