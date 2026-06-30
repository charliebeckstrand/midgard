import { describe, expect, it, vi } from 'vitest'
import type { ChatContent } from '../../modules/chat'
import { ChatLayout } from '../../modules/chat'
import { bySlot, noop, renderUI, screen, userEvent } from '../helpers'

const messages: ChatContent[] = [{ id: '1', role: 'user', content: 'Hi there' }]

describe('ChatLayout', () => {
	it('renders the transcript above the composer', () => {
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

	it('sends the trimmed draft on Enter and clears the composer', async () => {
		const onSend = vi.fn()

		renderUI(<ChatLayout messages={messages} onSend={onSend} />)

		const composer = screen.getByRole('textbox')

		await userEvent.type(composer, '  hello  ')

		await userEvent.keyboard('{Enter}')

		expect(onSend).toHaveBeenCalledWith('hello')

		expect(composer).toHaveValue('')
	})

	it('renders a sidebar slot beside the surface', () => {
		renderUI(<ChatLayout messages={messages} onSend={noop} sidebar={<nav>Conversations</nav>} />)

		expect(screen.getByText('Conversations')).toBeInTheDocument()
	})

	it('opens the sidebar in a sheet from the header menu button', async () => {
		renderUI(
			<ChatLayout
				messages={messages}
				onSend={noop}
				header={<h2>Project kickoff</h2>}
				sidebar={<nav>Chat history</nav>}
			/>,
		)

		// The inline (desktop) rail is always mounted; the mobile sheet is not.
		expect(screen.getByText('Chat history')).toBeInTheDocument()

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole('button', { name: 'Open conversations' }))

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Conversations')

		// The rail now renders both inline and inside the open sheet.
		expect(screen.getAllByText('Chat history')).toHaveLength(2)
	})

	it('omits the menu button when there is no sidebar', () => {
		renderUI(<ChatLayout messages={messages} onSend={noop} header={<h2>Project kickoff</h2>} />)

		expect(screen.queryByRole('button', { name: 'Open conversations' })).not.toBeInTheDocument()
	})
})
