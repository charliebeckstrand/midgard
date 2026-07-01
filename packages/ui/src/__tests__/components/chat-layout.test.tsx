import { describe, expect, it, vi } from 'vitest'
import type { ChatContent, ChatConversation } from '../../modules/chat'
import { ChatLayout } from '../../modules/chat'
import { bySlot, noop, renderUI, screen, userEvent } from '../helpers'

const messages: ChatContent[] = [{ id: '1', role: 'user', content: 'Hi there' }]

const conversations: ChatConversation[] = [
	{ id: 'a', title: 'Project kickoff', preview: 'Let me help you plan' },
	{ id: 'b', title: 'Bug investigation', preview: 'I found the root cause' },
]

describe('ChatLayout', () => {
	it('renders the transcript above the prompt', () => {
		const { container } = renderUI(<ChatLayout messages={messages} onSend={noop} />)

		expect(screen.getByText('Hi there')).toBeInTheDocument()

		expect(bySlot(container, 'chat-messages')).toBeInTheDocument()

		expect(bySlot(container, 'chat-prompt')).toBeInTheDocument()
	})

	it('hides the transcript in draft mode', () => {
		const { container } = renderUI(<ChatLayout messages={messages} isDraft onSend={noop} />)

		expect(screen.queryByText('Hi there')).not.toBeInTheDocument()

		expect(bySlot(container, 'chat-prompt')).toBeInTheDocument()
	})

	it('sends the trimmed draft on Enter and clears the prompt', async () => {
		const onSend = vi.fn()

		renderUI(<ChatLayout messages={messages} onSend={onSend} />)

		const prompt = screen.getByRole('textbox')

		await userEvent.type(prompt, '  hello  ')

		await userEvent.keyboard('{Enter}')

		expect(onSend).toHaveBeenCalledWith('hello')

		expect(prompt).toHaveValue('')
	})

	it('builds a conversation rail from `conversations`', () => {
		renderUI(<ChatLayout messages={messages} onSend={noop} conversations={conversations} />)

		expect(screen.getByText('Project kickoff')).toBeInTheDocument()

		expect(screen.getByText('Bug investigation')).toBeInTheDocument()
	})

	it('marks the current conversation', () => {
		renderUI(
			<ChatLayout
				messages={messages}
				onSend={noop}
				conversations={conversations}
				currentConversationId="b"
				onConversationSelect={noop}
			/>,
		)

		expect(screen.getByRole('button', { name: /Bug investigation/ })).toHaveAttribute(
			'aria-current',
			'true',
		)
	})

	it('selects a conversation when its row is clicked', async () => {
		const onConversationSelect = vi.fn()

		renderUI(
			<ChatLayout
				messages={messages}
				onSend={noop}
				conversations={conversations}
				onConversationSelect={onConversationSelect}
			/>,
		)

		await userEvent.click(screen.getByRole('button', { name: /Project kickoff/ }))

		expect(onConversationSelect).toHaveBeenCalledWith('a')
	})

	it('confirms before removing a conversation, only with a handler', async () => {
		const { rerender } = renderUI(
			<ChatLayout messages={messages} onSend={noop} conversations={conversations} />,
		)

		expect(screen.queryByRole('button', { name: 'Remove conversation' })).not.toBeInTheDocument()

		const onConversationRemove = vi.fn()

		rerender(
			<ChatLayout
				messages={messages}
				onSend={noop}
				conversations={conversations}
				onConversationRemove={onConversationRemove}
			/>,
		)

		await userEvent.click(
			screen.getAllByRole('button', { name: 'Remove conversation' })[0] as HTMLElement,
		)

		// The remove is gated by a confirmation naming the conversation; the first click only opens it.
		expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Remove Project kickoff?')

		expect(onConversationRemove).not.toHaveBeenCalled()

		await userEvent.click(screen.getByRole('button', { name: 'Remove' }))

		expect(onConversationRemove).toHaveBeenCalledWith('a')
	})

	it('creates a conversation from the title + button, only with a handler', async () => {
		const { rerender } = renderUI(
			<ChatLayout messages={messages} onSend={noop} conversations={conversations} />,
		)

		expect(screen.queryByRole('button', { name: 'New conversation' })).not.toBeInTheDocument()

		const onConversationCreate = vi.fn()

		rerender(
			<ChatLayout
				messages={messages}
				onSend={noop}
				conversations={conversations}
				onConversationCreate={onConversationCreate}
			/>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'New conversation' }))

		expect(onConversationCreate).toHaveBeenCalledOnce()
	})

	it('opens the conversation rail in a sheet from the header menu button', async () => {
		renderUI(
			<ChatLayout
				messages={messages}
				onSend={noop}
				header={<h2>Active chat</h2>}
				conversations={conversations}
			/>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole('button', { name: 'Open conversations' }))

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Conversations')

		// The rail now renders both inline and inside the open sheet.
		expect(screen.getAllByText('Bug investigation')).toHaveLength(2)

		// The sheet carries a Close control in its footer.
		expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
	})

	it('omits the menu button without conversations', () => {
		renderUI(<ChatLayout messages={messages} onSend={noop} header={<h2>Active chat</h2>} />)

		expect(screen.queryByRole('button', { name: 'Open conversations' })).not.toBeInTheDocument()
	})
})
