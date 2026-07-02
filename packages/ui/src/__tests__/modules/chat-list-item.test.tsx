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

	it('gives the select control a pointer cursor', () => {
		const { container } = renderUI(<ChatListItem title="Bug investigation" onSelect={vi.fn()} />)

		expect(bySlot(container, 'chat-list-item-select')).toHaveClass('cursor-pointer')
	})

	it('stretches the select hit area across the row chrome', () => {
		const { container } = renderUI(<ChatListItem title="Bug investigation" onSelect={vi.fn()} />)

		// A pointer-capturing `::after` overlays the whole row so clicking the
		// padding or gap still selects.
		expect(bySlot(container, 'chat-list-item-select')).toHaveClass(
			'after:absolute',
			'after:inset-0',
		)
	})

	it('keeps action controls above the select overlay', () => {
		const { container } = renderUI(
			<ChatListItem
				title="With actions"
				onSelect={vi.fn()}
				actions={<button type="button">Delete</button>}
			/>,
		)

		expect(bySlot(container, 'chat-list-item-actions')).toHaveClass('relative', 'z-10')
	})

	it('leaves the static title without a select overlay', () => {
		const { container } = renderUI(<ChatListItem title="Read only" />)

		expect(bySlot(container, 'chat-list-item-select')).not.toHaveClass('after:absolute')
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

	it('mounts an active indicator for the current conversation only', () => {
		const { container } = renderUI(<ChatListItem title="Active" current onSelect={vi.fn()} />)

		expect(bySlot(container, 'active-indicator')).toBeInTheDocument()
	})

	it('omits the active indicator when not current', () => {
		const { container } = renderUI(<ChatListItem title="Inactive" onSelect={vi.fn()} />)

		expect(bySlot(container, 'active-indicator')).not.toBeInTheDocument()
	})

	it('re-draws the focus ring on the active indicator of the current row', () => {
		const { container } = renderUI(<ChatListItem title="Active" current onSelect={vi.fn()} />)

		// The row's own ring paints beneath the indicator's opaque fill, so the
		// focused current row re-draws the ring on the indicator.
		expect(bySlot(container, 'active-indicator')?.className).toContain(
			'group-has-[[data-slot=chat-list-item-select]:focus-visible]:ring-2',
		)
	})

	it('keeps actions as a sibling of the select button', () => {
		const { container } = renderUI(
			<ChatListItem
				title="With actions"
				onSelect={vi.fn()}
				actions={<button type="button">Delete</button>}
			/>,
		)

		const actions = bySlot(container, 'chat-list-item-actions')

		expect(actions).toBeInTheDocument()

		// The delete control is a sibling of the select button, never nested inside it.
		const select = bySlot(container, 'chat-list-item-select')

		expect(select?.contains(screen.getByRole('button', { name: 'Delete' }))).toBe(false)
	})

	it('renders a remove button that calls onRemove', async () => {
		const onRemove = vi.fn()

		renderUI(<ChatListItem title="Bug investigation" remove onRemove={onRemove} />)

		await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

		expect(onRemove).toHaveBeenCalledOnce()
	})

	it('omits the remove button when remove is not set', () => {
		renderUI(<ChatListItem title="Bug investigation" />)

		expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
	})

	it('renders the remove button after actions', () => {
		const { container } = renderUI(
			<ChatListItem
				title="With actions"
				actions={<button type="button">Pin</button>}
				remove
				onRemove={vi.fn()}
			/>,
		)

		const buttons = bySlot(container, 'chat-list-item-actions')?.querySelectorAll('button')

		expect(buttons?.[0]).toHaveTextContent('Pin')

		expect(buttons?.[1]).toHaveAccessibleName('Remove')
	})
})
